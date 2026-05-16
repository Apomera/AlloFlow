// ═══════════════════════════════════════════════════════════════
// stem_tool_cephalopodlab.js — Cephalopod Lab
// Marine biology + behavioral science tool covering octopuses,
// squid, cuttlefish, and nautilus. Headline feature: Hunter Sim,
// a strategy minigame where you play a cephalopod hunter — pick
// species + habitat + prey + tactic, run a camouflage minigame,
// time the strike, and get judged on species-appropriate behavior.
//
// Sources: Roper et al. FAO cephalopod catalog; "Other Minds" by
// Peter Godfrey-Smith; Hanlon & Messenger "Cephalopod Behaviour"
// (Cambridge); Sasaki + Pickford on dumbo octopus distribution;
// Norman + Finn on mimic octopus (Thaumoctopus mimicus); Mather
// & Anderson on octopus personality + intelligence; Levin lab
// papers on chromatophore mechanics; Doubilet/NatGeo field
// documentation; CephResearch.org conservation status.
//
// Phase 1 v0.1: Hub + Species Field Guide + Hunter Sim +
// Resources stub. Phase 2 will add Camouflage Lab, Body Plan +
// Jet Propulsion physics, Intelligence Lab.
//
// Registered tool ID: "cephalopodLab"
// Category: science (marine biology + behavioral biology)
// ═══════════════════════════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('cephalopodLab'))) {

(function() {
  'use strict';

  // ─── Live region for state announcements ───
  (function() {
    if (document.getElementById('allo-live-cl')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-cl';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();
  function clAnnounce(msg) {
    var lr = document.getElementById('allo-live-cl');
    if (lr) { lr.textContent = ''; setTimeout(function() { lr.textContent = msg; }, 30); }
  }

  // ───────────────────────────────────────────────────────────
  // SPECIES DATA — 10 cephalopod species with biology + behavior
  // ───────────────────────────────────────────────────────────
  // Each species has:
  //   id, name, scientific, emoji, group ('octopus' | 'squid' | 'cuttlefish' | 'nautilus')
  //   intelligence (1-10), camouflageRank (1-10), jetSpeed (1-10), size, lifespan
  //   habitat (array), prey (array), tactics (array of best-suited)
  //   weird (one striking fact), conservation (IUCN status or proxy)
  //   notes (paragraph)
  var SPECIES = [
    { id: 'commonOcto', name: 'Common Octopus', scientific: 'Octopus vulgaris', emoji: '🐙', group: 'octopus',
      intelligence: 9, camouflageRank: 9, jetSpeed: 5,
      size: '60-100 cm arm-tip to arm-tip', lifespan: '1-2 years',
      habitat: ['reef', 'rocky', 'sandy'], prey: ['crab', 'clam', 'fish'],
      tactics: ['ambush', 'stalk', 'web'],
      weird: 'Opens jar lids in lab experiments. Recognizes individual human caretakers.',
      conservation: 'Least Concern (IUCN)',
      notes: 'The "default" octopus of European + Atlantic waters. Master generalist — comfortable in reef, rocky shore, and sandy bottom. Famously solves novel puzzles in lab settings. Hectocotylus mating + semelparous death cycle.' },
    { id: 'mimicOcto', name: 'Mimic Octopus', scientific: 'Thaumoctopus mimicus', emoji: '🐙', group: 'octopus',
      intelligence: 9, camouflageRank: 10, jetSpeed: 4,
      size: '~60 cm', lifespan: '~9 months',
      habitat: ['sandy', 'estuary'], prey: ['crab', 'fish', 'worm'],
      tactics: ['mimicry', 'ambush'],
      weird: 'Impersonates at least 15 different species (lionfish, sea snake, flounder) by changing color, shape, AND behavior.',
      conservation: 'Not formally assessed; range-restricted to Indo-Pacific estuaries',
      notes: 'Discovered 1998 off Sulawesi. The only confirmed animal that actively impersonates other species in real time. Shape-shifts arm posture + color to look like venomous lionfish (poking out of a hole), banded sea krait (waving 6 arms hidden, 2 striped arms out), or a flounder (flattens + swims along bottom).' },
    { id: 'giantPac', name: 'Giant Pacific Octopus', scientific: 'Enteroctopus dofleini', emoji: '🐙', group: 'octopus',
      intelligence: 9, camouflageRank: 8, jetSpeed: 6,
      size: '3-5 m arm-tip span, up to 50 kg', lifespan: '3-5 years',
      habitat: ['rocky', 'cold-deep'], prey: ['crab', 'fish', 'shark', 'small mammal'],
      tactics: ['ambush', 'stalk', 'grapple'],
      weird: 'Largest octopus species. Documented attacking + eating a small reef shark in aquarium footage.',
      conservation: 'Least Concern; targeted fishery in Pacific Northwest',
      notes: 'Pacific Northwest cold-water giant. Long-lived for an octopus (3-5 years vs the typical 1-2). Cognitive testing shows they recognize ~30 human faces individually + treat researchers differently based on past interactions.' },
    { id: 'blueRing', name: 'Blue-Ringed Octopus', scientific: 'Hapalochlaena lunulata', emoji: '🐙', group: 'octopus',
      intelligence: 7, camouflageRank: 6, jetSpeed: 4,
      size: '~12 cm', lifespan: '~1 year',
      habitat: ['reef', 'tidepool'], prey: ['crab', 'shrimp', 'small fish'],
      tactics: ['ambush', 'venom-strike'],
      weird: 'Carries enough tetrodotoxin to kill 26 adult humans. Blue rings flash as warning only when threatened.',
      conservation: 'Not formally assessed; Indo-Pacific tidepools',
      notes: 'Tiny but lethal. The blue iridophore rings are aposematic — warning coloration that triggers only when alarmed. Otherwise the animal is drab-camouflaged. Tetrodotoxin produced by symbiotic bacteria in its salivary glands. There is no antivenom.' },
    { id: 'coconut', name: 'Coconut Octopus', scientific: 'Amphioctopus marginatus', emoji: '🥥', group: 'octopus',
      intelligence: 9, camouflageRank: 7, jetSpeed: 5,
      size: '~15 cm', lifespan: '~1 year',
      habitat: ['sandy', 'estuary'], prey: ['crab', 'shrimp', 'small fish'],
      tactics: ['tool-use', 'ambush'],
      weird: 'Carries coconut/clam shell halves around the seafloor + assembles them as a portable shelter — tool use in an invertebrate.',
      conservation: 'Not formally assessed',
      notes: 'The 2009 Indonesia paper documenting this changed our understanding of invertebrate cognition. The coconut octopus collects discarded shells, walks them across open sand on stilt-like arms (called "stilt-walking"), and assembles a hideout when needed. Tool use was previously thought to require vertebrate-level intelligence.' },
    { id: 'dumbo', name: 'Dumbo Octopus', scientific: 'Grimpoteuthis spp.', emoji: '🐙', group: 'octopus',
      intelligence: 5, camouflageRank: 3, jetSpeed: 3,
      size: '20-30 cm', lifespan: '3-5 years',
      habitat: ['deep'], prey: ['copepod', 'isopod', 'worm'],
      tactics: ['filter-feed', 'pounce'],
      weird: 'Lives 1,000-7,000 m deep — deepest of any octopus. The "ears" are fins used to glide rather than swim.',
      conservation: 'Data Deficient (rarely encountered)',
      notes: 'Named for the Disney elephant due to ear-like fins. Doesn\'t produce ink — at those depths there\'s nothing to escape from visually. Slow-living + slow-metabolizing — opposite of shallow-water octopuses. Found in the Mariana Trench area.' },
    { id: 'cuttlefish', name: 'Common Cuttlefish', scientific: 'Sepia officinalis', emoji: '🦑', group: 'cuttlefish',
      intelligence: 8, camouflageRank: 10, jetSpeed: 4,
      size: '~30 cm body', lifespan: '~2 years',
      habitat: ['reef', 'sandy', 'estuary'], prey: ['shrimp', 'crab', 'fish'],
      tactics: ['hypnotic-display', 'ambush', 'stalk'],
      weird: 'Pulses waves of color across its body to mesmerize prey (the "passing cloud" display) before striking.',
      conservation: 'Least Concern; cephalopod fisheries expanding globally',
      notes: 'Internal "cuttlebone" — buoyancy organ unique to cuttlefish. Famously color-blind despite producing the most varied skin display in the animal kingdom (they detect polarized light + use it to assess camouflage match). Trained to choose deferred-gratification rewards in 2021 Cambridge experiments.' },
    { id: 'humboldt', name: 'Humboldt Squid', scientific: 'Dosidicus gigas', emoji: '🦑', group: 'squid',
      intelligence: 6, camouflageRank: 7, jetSpeed: 10,
      size: '1-2 m mantle', lifespan: '~1 year',
      habitat: ['open-ocean'], prey: ['fish', 'shrimp', 'squid'],
      tactics: ['jet-strike', 'group-hunt'],
      weird: 'Hunts in coordinated packs of 1,200+. Flashes red/white skin signals between pack members.',
      conservation: 'Least Concern; range expanding northward with warming Pacific',
      notes: 'Aggressive, fast, group-living. Sometimes called "diablo rojo" (red devil) for the red-flashing skin display during attack. Packs surround schools of fish + coordinate strikes. The single-year lifespan + rapid reproductive rate means populations can explode quickly when conditions favor them.' },
    { id: 'vampireSquid', name: 'Vampire Squid', scientific: 'Vampyroteuthis infernalis', emoji: '🦑', group: 'squid',
      intelligence: 5, camouflageRank: 6, jetSpeed: 5,
      size: '~30 cm', lifespan: '8+ years (long for cephalopods)',
      habitat: ['deep'], prey: ['marine-snow', 'particles'],
      tactics: ['filter-feed', 'inversion-display'],
      weird: 'Despite its name, eats "marine snow" — falling organic particles. Inverts its arms over its head as a defensive cloak.',
      conservation: 'Not assessed; deep-sea oxygen minimum zone',
      notes: 'A living fossil — only species in its order, lineage diverged 165M years ago. Lives in the ocean\'s oxygen minimum zone (low O2 environment) and metabolizes very slowly. Bioluminescent photophores on arm tips serve as decoys + signals.' },
    { id: 'nautilus', name: 'Chambered Nautilus', scientific: 'Nautilus pompilius', emoji: '🐚', group: 'nautilus',
      intelligence: 3, camouflageRank: 2, jetSpeed: 4,
      size: '~20 cm shell', lifespan: '20+ years',
      habitat: ['deep-reef'], prey: ['carrion', 'molting crustacean', 'shrimp'],
      tactics: ['scavenge', 'slow-stalk'],
      weird: '"Living fossil" — body plan essentially unchanged for 500 million years. Has 90 tentacles (no suckers, sticky pads instead).',
      conservation: 'Threatened (CITES Appendix II); shell trade is the main pressure',
      notes: 'The only living cephalopod with an external shell. Uses the chambered shell for buoyancy by pumping gas in/out. Pinhole eyes (no lens) means very poor vision compared to other cephalopods — they hunt mostly by smell. Mostly scavenger. Despite the dramatic difference, evolutionary studies show nautilids share ancestor with octopus + squid ~500M years ago.' },
    { id: 'giantSquid', name: 'Giant Squid', scientific: 'Architeuthis dux', emoji: '🦑', group: 'squid',
      intelligence: 6, camouflageRank: 5, jetSpeed: 7,
      size: '12-13 m mantle-to-tentacle (largest reliable measurements)', lifespan: '~5 years',
      habitat: ['deep'], prey: ['fish', 'squid'],
      tactics: ['ambush', 'jet-strike'],
      weird: 'The original sea-monster myth. Never filmed alive until 2004 (still photographs) + 2012 (video). Tentacle suckers leave perfect circular scars on sperm whale skin.',
      conservation: 'Least Concern; no targeted fishery (rarely caught alive)',
      notes: 'Lives at 400-1200m depth in the mesopelagic zone. The eye is the largest in the animal kingdom (~25-30 cm diameter) — likely adapted to detect the bioluminescent halos of approaching sperm whales (the giant squid\'s main predator). Most specimens come from beachings or sperm whale stomach contents. Edmund Kean Ohio State + Tsunemi Kubodera (Japan) led the breakthrough live filming.' },
    { id: 'colossal', name: 'Colossal Squid', scientific: 'Mesonychoteuthis hamiltoni', emoji: '🦑', group: 'squid',
      intelligence: 5, camouflageRank: 4, jetSpeed: 6,
      size: '~10 m total, up to 500 kg — heaviest invertebrate ever', lifespan: '~2-5 years',
      habitat: ['deep'], prey: ['toothfish', 'fish', 'other squid'],
      tactics: ['ambush', 'venom-strike'],
      weird: 'Tentacles have rotating ARMORED HOOKS as well as suckers. Built differently from giant squid — shorter + heavier + more aggressive predator.',
      conservation: 'Least Concern; limited bycatch from Antarctic toothfish fishery',
      notes: 'Lives in the Antarctic Southern Ocean, 1000-2000m deep. Heavier than the giant squid by mass even though shorter. The hooked tentacles are a key adaptation: they grip prey + struggling competitors. Most known from sperm whale stomach contents + Antarctic toothfish (Patagonian toothfish) bycatch. New Zealand\'s Te Papa museum has the world\'s only intact adult specimen preserved.' },
    { id: 'firefly', name: 'Firefly Squid', scientific: 'Watasenia scintillans', emoji: '✨', group: 'squid',
      intelligence: 5, camouflageRank: 6, jetSpeed: 6,
      size: '~7 cm mantle', lifespan: '~1 year',
      habitat: ['deep', 'reef'], prey: ['copepod', 'small fish'],
      tactics: ['ambush', 'group-hunt'],
      weird: 'Has ~1000 light-producing organs (photophores) covering its body. Can flash patterns of blue light for communication, prey-luring, and counter-illumination camouflage.',
      conservation: 'Least Concern; targeted seasonal fishery in Toyama Bay, Japan',
      notes: 'Every spring (March-May), millions migrate to Toyama Bay shallow waters to spawn. Their synchronized bioluminescent display turns the sea blue at night — a major tourist + scientific attraction. The photophores are arranged in distinct patterns: ventral ones for counter-illumination (hiding from below), arm-tip clusters for prey luring, body patterns for communication.' },
    { id: 'bobtail', name: 'Hawaiian Bobtail Squid', scientific: 'Euprymna scolopes', emoji: '🦑', group: 'cuttlefish',
      intelligence: 6, camouflageRank: 8, jetSpeed: 5,
      size: '~3 cm mantle', lifespan: '~3 months',
      habitat: ['reef', 'sandy'], prey: ['shrimp', 'small fish'],
      tactics: ['ambush', 'counter-illumination'],
      weird: 'Hosts a SYMBIOTIC bacterial culture (Vibrio fischeri) in a special light organ. The bacteria produce light that matches moonlight, hiding the squid\'s shadow from below.',
      conservation: 'Least Concern; major laboratory model organism',
      notes: 'The classic symbiosis research model. Each squid hatches sterile, then recruits Vibrio fischeri from seawater into a specialized light organ within hours. The bacteria produce light at moonlight-equivalent brightness; the squid uses this to erase its silhouette against the moonlit surface (counter-illumination). Every dawn, the squid expels 95% of the bacterial population, then the remaining 5% repopulate during the day. This is one of the cleanest models of beneficial symbiosis in animals — Margaret McFall-Ngai\'s lab at U Hawaii has built decades of foundational work here.' },
    { id: 'dayOcto', name: 'Day Octopus', scientific: 'Octopus cyanea', emoji: '🐙', group: 'octopus',
      intelligence: 8, camouflageRank: 10, jetSpeed: 5,
      size: '~60 cm arm-span', lifespan: '~1 year',
      habitat: ['reef'], prey: ['crab', 'fish', 'shrimp'],
      tactics: ['ambush', 'cooperative-hunt', 'stalk'],
      weird: 'Hunts COOPERATIVELY with reef fish (especially grouper + goatfish). The octopus flushes prey from crevices; the fish ambush escapees. First documented interspecies coordinated hunting in invertebrates.',
      conservation: 'Least Concern; targeted artisanal fishery in Indo-Pacific',
      notes: 'Tropical Indo-Pacific reef specialist. Unlike most octopuses (nocturnal), this species hunts during the day — hence the name. The 2020 paper by Sampaio et al. in Ecology documented cooperative hunting with up to 8 fish species partnering with single octopuses. Reef fish wait for the octopus to enter a crevice + drive prey out; when the prey emerges, the fish catch it. Both species benefit. The octopus also punches partners that don\'t pull their weight — first documented inter-species punishment in fish-octopus cooperation.' }
  ];

  // ───────────────────────────────────────────────────────────
  // HABITAT + PREY + TACTIC DEFINITIONS for Hunter Sim
  // ───────────────────────────────────────────────────────────
  var HABITATS = [
    { id: 'reef', name: 'Coral Reef', emoji: '🪸', color: '#fb923c',
      description: 'Warm, colorful, complex 3D environment. Crevices for ambush, abundant prey, but lots of predators (sharks, eels) and other competing hunters.',
      substrate: { red: 220, green: 140, blue: 80, texture: 'bumpy', pattern: 'mottled' } },
    { id: 'rocky', name: 'Rocky Shore', emoji: '🪨', color: '#94a3b8',
      description: 'Cold, dim, kelp + boulders. Hiding places everywhere; prey is mostly crustaceans and small fish.',
      substrate: { red: 120, green: 110, blue: 100, texture: 'rough', pattern: 'mottled' } },
    { id: 'sandy', name: 'Sandy Bottom', emoji: '🏖️', color: '#fcd34d',
      description: 'Open, exposed, few hiding places. Specialists like coconut octopus + mimic octopus thrive here using tools or impersonation.',
      substrate: { red: 240, green: 210, blue: 160, texture: 'smooth', pattern: 'solid' } },
    { id: 'kelp', name: 'Kelp Forest', emoji: '🌿', color: '#16a34a',
      description: 'Cool-temperate forest of giant kelp. Vertical structure + green-dappled light. Home of the giant Pacific octopus.',
      substrate: { red: 60, green: 120, blue: 80, texture: 'leafy', pattern: 'striped' } },
    { id: 'deep', name: 'Deep Sea (>1000m)', emoji: '🌊', color: '#1e293b',
      description: 'Cold, dark, sparse. Different rules: bioluminescence + filter-feeding dominate. Dumbo + vampire squid live here.',
      substrate: { red: 30, green: 35, blue: 50, texture: 'smooth', pattern: 'solid' } },
    { id: 'open-ocean', name: 'Open Ocean', emoji: '🌊', color: '#0ea5e9',
      description: 'Pelagic — no bottom. No hiding places. Speed + group coordination win. Humboldt squid territory.',
      substrate: { red: 30, green: 100, blue: 180, texture: 'smooth', pattern: 'solid' } },
    { id: 'tidepool', name: 'Tidepool', emoji: '💧', color: '#06b6d4',
      description: 'Shallow, light, small. Small octopuses (blue-ringed) hunt here. Tide cycles dictate hunt windows.',
      substrate: { red: 100, green: 130, blue: 140, texture: 'rough', pattern: 'mottled' } },
    { id: 'estuary', name: 'Estuary / Muck', emoji: '🪨', color: '#a16207',
      description: 'Brackish, muddy, low-visibility. Mimic + coconut octopus territory — prey lives in soft substrate.',
      substrate: { red: 110, green: 90, blue: 70, texture: 'smooth', pattern: 'mottled' } },
    { id: 'deep-reef', name: 'Deep Reef (200-600m)', emoji: '🪸', color: '#475569',
      description: 'Mesophotic zone — beyond recreational diving depth. Where nautilus live + slowly scavenge.',
      substrate: { red: 60, green: 70, blue: 90, texture: 'rough', pattern: 'mottled' } },
    { id: 'cold-deep', name: 'Cold Deep (Pacific Northwest)', emoji: '❄️', color: '#0c4a6e',
      description: 'Cold + dark but not abyssal — 50-200m. Boulder fields + invertebrate-rich. Giant Pacific\'s home.',
      substrate: { red: 50, green: 70, blue: 85, texture: 'rough', pattern: 'mottled' } }
  ];

  var PREY = [
    { id: 'crab', name: 'Crab', emoji: '🦀', difficulty: 3, calories: 80,
      description: 'Hard-shelled but slow. Most cephalopods\' bread + butter prey.',
      defenseTactics: ['shelled', 'pinchers'],
      tipsByCephalopod: { octopus: 'Use suckers to pry it from its hideout, then beak through the shell joint.', cuttlefish: 'Hypnotize, then dart-strike. Tentacles grab faster than crab can spin.', squid: 'Squid don\'t usually pursue crabs — open-water hunters.', nautilus: 'Nautilus eats molting crabs only — soft shell window.' } },
    { id: 'fish', name: 'Small Fish', emoji: '🐟', difficulty: 6, calories: 100,
      description: 'Fast + agile. Requires precision strike or coordinated tactic.',
      defenseTactics: ['fast', 'schooling'],
      tipsByCephalopod: { octopus: 'Ambush from cover — chase = lose.', cuttlefish: 'Mesmerize via passing-cloud display, strike when fish stops to look.', squid: 'Pack-coordinate the strike; one squid herds, others ambush.', nautilus: 'Rarely catches healthy fish.' } },
    { id: 'clam', name: 'Clam / Mussel', emoji: '🦪', difficulty: 2, calories: 60,
      description: 'Slowest possible prey — but armored. Requires drilling or prying.',
      defenseTactics: ['shelled', 'glued'],
      tipsByCephalopod: { octopus: 'Drill through the shell with radula tooth — takes ~30 min but reliable.', cuttlefish: 'Cuttlefish don\'t usually take bivalves.', squid: 'Not squid prey.', nautilus: 'Scavenges dead clams from sea floor.' } },
    { id: 'shrimp', name: 'Shrimp', emoji: '🦐', difficulty: 4, calories: 50,
      description: 'Fast bursters with tail-flick escape. Many small cephalopods\' staple.',
      defenseTactics: ['fast', 'shelled'],
      tipsByCephalopod: { octopus: 'Quick pounce + web-cast to close escape distance.', cuttlefish: 'Tentacle dart-strike is faster than the tail-flick.', squid: 'Easy prey for jet-strike specialists.', nautilus: 'Nautilus too slow.' } },
    { id: 'octopus', name: 'Small Octopus', emoji: '🐙', difficulty: 8, calories: 150,
      description: 'Cannibalism is normal in octopuses. But the prey can also fight back hard.',
      defenseTactics: ['camouflage', 'venom', 'intelligence', 'jet'],
      tipsByCephalopod: { octopus: 'Only attempt if you\'re clearly larger — common octopus eating mimic octopus, for example.', cuttlefish: 'Cuttlefish vs octopus = high-risk fight.', squid: 'Humboldt squid pack-hunt smaller octopuses.', nautilus: 'No way — nautilus is the slowest.' } },
    { id: 'squid', name: 'Squid', emoji: '🦑', difficulty: 9, calories: 130,
      description: 'Fast jet-propulsion + ink defense. Very hard to catch.',
      defenseTactics: ['fast', 'ink', 'jet'],
      tipsByCephalopod: { octopus: 'Almost never. Octopus is too slow for healthy squid.', cuttlefish: 'Rarely. Squid are usually faster than cuttlefish.', squid: 'Squid eat smaller squid — Humboldt squid eat each other in pack settings.', nautilus: 'No.' } },
    { id: 'shark', name: 'Small Shark', emoji: '🦈', difficulty: 10, calories: 300,
      description: 'Apex prey reversal — most cephalopods are shark food, not the other way around.',
      defenseTactics: ['speed', 'teeth', 'predator'],
      tipsByCephalopod: { octopus: 'Only giant Pacific octopus has ever been documented doing this. Even then, rare + opportunistic.', cuttlefish: 'No.', squid: 'No realistic scenario.', nautilus: 'No.' } },
    { id: 'carrion', name: 'Carrion / Marine Snow', emoji: '🥚', difficulty: 1, calories: 20,
      description: 'Already-dead organic matter. No defense, but low caloric value.',
      defenseTactics: [],
      tipsByCephalopod: { octopus: 'Suboptimal — octopuses prefer live prey but will scavenge if hungry.', cuttlefish: 'Cuttlefish rarely scavenge.', squid: 'Vampire squid filter marine snow — primary diet.', nautilus: 'Nautilus\'s main food source. Smells across long distances.' } },
    { id: 'worm', name: 'Polychaete Worm', emoji: '🪱', difficulty: 5, calories: 40,
      description: 'Sandy-substrate prey. Burrows fast. Requires patience or digging.',
      defenseTactics: ['burrowing'],
      tipsByCephalopod: { octopus: 'Mimic + coconut octopus dig + flush from sand.', cuttlefish: 'Detected via vibration; tentacle strike.', squid: 'Squid don\'t hunt benthic worms.', nautilus: 'Rare.' } }
  ];

  var TACTICS = [
    { id: 'ambush', name: 'Ambush', emoji: '🎭',
      description: 'Hide motionless, strike when prey passes within arm-reach. Default octopus tactic.',
      bestFor: ['octopus', 'cuttlefish'],
      requires: 'good camouflage + patient + good cover' },
    { id: 'stalk', name: 'Stalk', emoji: '👣',
      description: 'Slowly close distance using camouflage + matching texture to substrate. Strike at the last moment.',
      bestFor: ['octopus', 'cuttlefish'],
      requires: 'excellent camouflage + slow gait' },
    { id: 'web', name: 'Web Cast', emoji: '🕸️',
      description: 'Spread arms + skin webbing wide, drop over prey from above, trap with parachute-like cast.',
      bestFor: ['octopus'],
      requires: 'high position + soft-bodied prey' },
    { id: 'jet-strike', name: 'Jet Strike', emoji: '🚀',
      description: 'Use mantle jet propulsion for an explosive forward attack. Squid specialty.',
      bestFor: ['squid'],
      requires: 'open water + healthy prey + speed advantage' },
    { id: 'mimicry', name: 'Mimicry', emoji: '🎭',
      description: 'Impersonate a different (usually venomous or unpalatable) species to approach prey without alarming it.',
      bestFor: ['octopus'],
      requires: 'mimic octopus specifically' },
    { id: 'hypnotic-display', name: 'Hypnotic Display', emoji: '🌈',
      description: '"Passing cloud" — pulse waves of color across the body to mesmerize prey before strike.',
      bestFor: ['cuttlefish'],
      requires: 'cuttlefish + visually-attentive prey' },
    { id: 'tool-use', name: 'Tool Use (Shell Shelter)', emoji: '🥥',
      description: 'Use a carried shell to hide between hunts; ambush from the shelter.',
      bestFor: ['octopus'],
      requires: 'coconut octopus + sandy substrate' },
    { id: 'venom-strike', name: 'Venom Strike', emoji: '☠️',
      description: 'Inject tetrodotoxin via beak. Paralyzes prey almost instantly.',
      bestFor: ['octopus'],
      requires: 'blue-ringed octopus specifically' },
    { id: 'group-hunt', name: 'Group Coordination', emoji: '👥',
      description: 'Pack-hunt with skin-flash signaling between members to surround + strike together.',
      bestFor: ['squid'],
      requires: 'Humboldt squid + open water + schooling prey' },
    { id: 'filter-feed', name: 'Filter / Drift', emoji: '🌫️',
      description: 'Drift slowly with arms extended, capture passing marine snow or planktonic prey.',
      bestFor: ['squid', 'octopus'],
      requires: 'deep-sea environment + low-calorie prey OK' },
    { id: 'scavenge', name: 'Scavenge', emoji: '🦴',
      description: 'Follow scent of dead/dying prey, slowly approach + consume. Nautilus default.',
      bestFor: ['nautilus'],
      requires: 'available carrion' },
    { id: 'grapple', name: 'Grapple', emoji: '💪',
      description: 'Strong-arm overpowers prey directly. Giant Pacific specialty.',
      bestFor: ['octopus'],
      requires: 'large body + prey weaker than you' },
    { id: 'counter-illumination', name: 'Counter-Illumination', emoji: '💡',
      description: 'Generate light underneath to match downwelling moonlight/sunlight, erasing your shadow from below.',
      bestFor: ['squid', 'cuttlefish'],
      requires: 'photophores or symbiotic light organ' },
    { id: 'cooperative-hunt', name: 'Cooperative Hunt', emoji: '🤝',
      description: 'Hunt alongside another species. Day octopuses partner with reef fish to flush + ambush prey.',
      bestFor: ['octopus'],
      requires: 'reef environment + cooperating partner species' }
  ];

  // ───────────────────────────────────────────────────────────
  // FIELD NOTES — unlock-as-you-hunt biology trivia
  // Generic notes pulled when no specific species+tactic combo
  // matches; species-specific ones override.
  // ───────────────────────────────────────────────────────────
  var FIELD_NOTES = [
    { id: 'fn-chromatophore', text: 'Cephalopod skin has 3 layers of color-changing cells. Chromatophores (pigment sacs squeezed by muscles for color), iridophores (stacked plates for iridescence + polarized light), leucophores (white reflectors). Each square mm of skin has ~200 of these.' },
    { id: 'fn-9brains', text: 'Octopuses have 9 "brains": one central brain + one ganglion per arm. About 2/3 of all octopus neurons live in the ARMS, not the head. Each arm can solve simple problems independently.' },
    { id: 'fn-bluedlood', text: 'Cephalopod blood is BLUE. They use copper-based hemocyanin instead of iron-based hemoglobin — more efficient at oxygen transport in cold water. Three hearts: two pump blood through gills, one pumps it to the body.' },
    { id: 'fn-colorblind', text: 'Most cephalopods are color-blind. They produce the most varied skin displays in the animal kingdom while seeing only black + white. Theory: they detect color via skin opsins (light-sensitive proteins distributed across the body).' },
    { id: 'fn-shortlife', text: 'Most octopuses live 1-2 years. They mate once, lay eggs, brood them obsessively without eating, and die — semelparous reproduction. The optic gland triggers programmed death after egg-brooding.' },
    { id: 'fn-evolution', text: 'Cephalopods diverged from their molluscan cousins (clams + snails) about 500 million years ago. They share a common ancestor with everything from oysters to garden snails — but evolved radically different.' },
    { id: 'fn-jetpower', text: 'Jet propulsion: water is pulled into the mantle cavity, then expelled through the siphon at up to 25 m/s in Humboldt squid. It\'s inefficient at slow speeds — that\'s why most octopuses crawl instead of jet.' },
    { id: 'fn-ink', text: 'Ink is melanin (same pigment as human hair) + mucus + amino acids. The mucus makes it stick together as a "pseudomorph" — a fake decoy octopus-shaped blob. The amino acids also temporarily disable predator smell.' },
    { id: 'fn-toolmaker', text: 'The coconut octopus carries shell halves across the seafloor on stilt-walking arms + assembles them as a portable shelter. This was the first documented case of tool use in an invertebrate (Finn et al. 2009).' },
    { id: 'fn-tetrodotoxin', text: 'Blue-ringed octopus venom (tetrodotoxin) is the same toxin found in pufferfish. It blocks sodium channels in nerves. There is no antivenom. Symptomatic treatment + ventilator support is the only protocol.' },
    { id: 'fn-rare', text: 'Octopuses don\'t form lasting social bonds (with rare exceptions). They are solitary predators that compete intensely. A common ending for an octopus is being eaten by another octopus.' },
    { id: 'fn-cuttlebone', text: 'Cuttlefish have an internal "cuttlebone" — a gas-filled rigid float that can be adjusted for buoyancy. The cuttlebones you see at pet stores (for parakeets) are the dead-cuttlefish version.' }
  ];

  // ───────────────────────────────────────────────────────────
  // GLOSSARY — 42 technical terms across cephalopod biology
  // ───────────────────────────────────────────────────────────
  var GLOSSARY = [
    { term: 'Ammoniacal flotation', defn: 'Nautilus uses ammonium chloride solution + gas in its shell chambers for neutral buoyancy. Adjusting the gas/liquid ratio lets it rise + sink without active swimming.', tag: 'anatomy' },
    { term: 'Aposematic', defn: 'Warning coloration. The blue-ringed octopus\'s blue iridophore rings only flash when threatened — they\'re aposematic signals advertising the tetrodotoxin venom.', tag: 'behavior' },
    { term: 'Beak', defn: 'The only hard structure in an octopus body — a parrot-style chitin beak. Octopuses can squeeze through any hole bigger than their beak.', tag: 'anatomy' },
    { term: 'Bivalve', defn: 'Two-shelled mollusks (clams, oysters, mussels). Common cephalopod prey — octopuses use the radula to drill through the shell.', tag: 'biology' },
    { term: 'Branchial heart', defn: 'One of two "gill hearts" in cephalopods, pumping deoxygenated blood through the gills. Cephalopods have 2 branchial + 1 systemic = 3 hearts total.', tag: 'anatomy' },
    { term: 'Cephalopod', defn: 'Class of marine mollusks. Includes octopus, squid, cuttlefish, nautilus. Greek for "head-foot" — the foot evolved into the arms attached directly to the head.', tag: 'biology' },
    { term: 'Chitin', defn: 'Structural carbohydrate. Cephalopod beaks are pure chitin (same material as insect exoskeletons + crustacean shells).', tag: 'anatomy' },
    { term: 'Chromatophore', defn: 'Pigment sac (red/yellow/black) surrounded by radial muscles. Muscles contract → sac expands → color shows. ~200 per square mm. Fastest color-change layer (~70ms).', tag: 'camouflage' },
    { term: 'CITES Appendix II', defn: 'International trade regulation level. Nautilus has been listed since 2017 to control the shell trade. Trade is allowed with permits + quotas.', tag: 'conservation' },
    { term: 'Coleoid', defn: 'Subclass of soft-bodied cephalopods (octopus, squid, cuttlefish). Contrast with nautiloids (shelled). All modern cephalopods except nautilus are coleoids.', tag: 'biology' },
    { term: 'Cuttlebone', defn: 'Internal calcareous "shell" of cuttlefish. Gas-filled chambers can be adjusted for buoyancy. Sold in pet stores as a parakeet calcium supplement.', tag: 'anatomy' },
    { term: 'Deimatic display', defn: 'Sudden high-contrast pattern (often with eyespots) to startle predators. NOT camouflage — the opposite. Buys ~0.5s for escape.', tag: 'camouflage' },
    { term: 'Disruptive coloration', defn: 'Bold patterns (stripes, geometric shapes) that BREAK the body outline. Predator brain sees stripes, not octopus.', tag: 'camouflage' },
    { term: 'Ganglion', defn: 'Cluster of neurons. Each octopus arm has its own ganglion holding ~40 million neurons. Total arm-ganglion neurons = ~2/3 of all octopus neurons.', tag: 'anatomy' },
    { term: 'Hectocotylus', defn: 'Modified mating arm in male cephalopods. Some species detach it entirely during mating — early naturalists thought detached hectocotyli were parasitic worms.', tag: 'reproduction' },
    { term: 'Hemocyanin', defn: 'Copper-based oxygen carrier in cephalopod blood (analog of iron-based hemoglobin in vertebrates). Gives the blood its BLUE color. More efficient in cold/low-oxygen water.', tag: 'anatomy' },
    { term: 'Iridophore', defn: 'Cell with stacked reflectin protein plates. Produces structural color via thin-film interference. Slower than chromatophores (seconds-minutes) but produces polarized light cephalopods CAN see.', tag: 'camouflage' },
    { term: 'Leucophore', defn: 'Passive white reflector cell. Bounces ambient light back at whatever color the environment provides. No nerve control needed — adapts automatically.', tag: 'camouflage' },
    { term: 'Mantle', defn: 'Muscular body cavity. Houses gills + hearts + organs AND drives jet propulsion. Contracts to expel water through the siphon.', tag: 'anatomy' },
    { term: 'Marine snow', defn: 'Falling organic particles in the deep ocean — bits of dead plankton, fecal pellets, mucus. Vampire squid filter-feeds on it.', tag: 'biology' },
    { term: 'Melanin', defn: 'Black pigment in cephalopod ink. Same compound as in human hair + skin. Combined with mucus in ink to form a sticky decoy.', tag: 'biology' },
    { term: 'Mesopelagic', defn: 'Ocean twilight zone, ~200-1000m depth. Some light penetrates but not enough for photosynthesis. Vampire squid + many squid species live here.', tag: 'biology' },
    { term: 'Mimicry', defn: 'Imitating another species. Mimic octopus (Thaumoctopus mimicus) impersonates 15+ species including lionfish, sea snake, flounder.', tag: 'behavior' },
    { term: 'Mollusk', defn: 'Phylum including cephalopods + gastropods (snails) + bivalves (clams). Cephalopods diverged from snail/clam relatives ~500 million years ago.', tag: 'biology' },
    { term: 'Nautiloid', defn: 'Cephalopods with external shells. Only one genus survives today (Nautilus). Hundreds of nautiloid species lived during the Paleozoic + Mesozoic.', tag: 'biology' },
    { term: 'Optic gland', defn: 'Endocrine gland behind the eyes. Produces steroid hormones that trigger post-reproductive senescence — programmed death after egg-brooding.', tag: 'reproduction' },
    { term: 'Oxygen minimum zone', defn: 'Mid-ocean layer with very low dissolved oxygen. Vampire squid is one of few animals that lives full-time in oxygen minimum zones.', tag: 'biology' },
    { term: 'Papillae', defn: 'Skin projections that cephalopods can raise or flatten for texture mimicry. Combined with chromatophore color changes, allows true 3D camouflage matching to substrate.', tag: 'camouflage' },
    { term: 'Photophore', defn: 'Light-producing organ. Many deep-sea cephalopods are bioluminescent. Vampire squid has photophores on its arm tips.', tag: 'anatomy' },
    { term: 'Polychaete', defn: 'Class of segmented marine worms. Common prey for mimic octopus + coconut octopus (they\'re burrowing prey on sandy substrates).', tag: 'biology' },
    { term: 'Pseudomorph', defn: '"False shape" — the ink + mucus decoy a fleeing octopus leaves behind. Holds octopus-like shape briefly so the predator attacks the decoy.', tag: 'behavior' },
    { term: 'Radula', defn: 'Rasping tongue-like organ with rows of chitin teeth. Used to drill through bivalve shells. Inherited from snail ancestors.', tag: 'anatomy' },
    { term: 'Reflectin', defn: 'Protein in iridophore cells. Stacked layers create thin-film interference for structural color. The same protein family is being researched for adaptive camouflage materials.', tag: 'camouflage' },
    { term: 'Semelparous', defn: 'Reproducing once, then dying. Most cephalopods are semelparous — they mate, brood eggs, and die in a programmed sequence triggered by the optic gland.', tag: 'reproduction' },
    { term: 'Senescence', defn: 'Biological aging. In octopuses, senescence is triggered (not gradual) — the optic gland releases hormones that cause the death cascade after reproduction.', tag: 'reproduction' },
    { term: 'Siphon', defn: 'Muscular funnel attached to the mantle. Steerable jet nozzle for propulsion. Also used to expel ink + waste + (in Otto\'s case) to short out aquarium lights.', tag: 'anatomy' },
    { term: 'Spermatophore', defn: 'Sperm package transferred during mating. In some species, the hectocotylus deposits spermatophores directly into the female\'s mantle cavity.', tag: 'reproduction' },
    { term: 'Systemic heart', defn: 'Main heart pumping oxygenated blood to the body. STOPS BEATING during sustained jet swimming — one reason octopuses prefer crawling for distance.', tag: 'anatomy' },
    { term: 'Tetrodotoxin', defn: 'Sodium channel-blocking neurotoxin. Found in blue-ringed octopus + pufferfish + a few other animals. Produced by symbiotic bacteria. No antivenom.', tag: 'behavior' },
    { term: 'Thaumoctopus', defn: 'Genus containing only the mimic octopus (Thaumoctopus mimicus). Named for the discoverer\'s amazement — "thaumastos" is Greek for "wonderful, marvelous".', tag: 'biology' },
    { term: 'Vampyromorpha', defn: 'Order containing only the vampire squid (Vampyroteuthis infernalis). Lineage diverged ~165 million years ago — a true living-fossil order.', tag: 'biology' },
    { term: 'Wok hei', defn: 'Wait, that\'s Kitchen Lab. Skip this entry.', tag: 'biology' }
  ].filter(function(g) { return g.term !== 'Wok hei'; });

  // ───────────────────────────────────────────────────────────
  // STATE
  // ───────────────────────────────────────────────────────────
  function defaultState() {
    return {
      activeSection: 'hub',
      // Field Guide
      fieldGuideSpeciesId: 'commonOcto',
      // Hunter Sim
      huntPhase: 'lobby',   // 'lobby' | 'plan' | 'approach' | 'strike' | 'result'
      huntSpeciesId: null,
      huntHabitatId: null,
      huntPreyId: null,
      huntTacticId: null,
      huntCamouflageColor: 128,    // 0-255 slider
      huntCamouflagePattern: 50,   // 0-100 slider (solid → mottled)
      huntCamouflageTexture: 50,   // 0-100 slider (smooth → rough)
      huntStrikeTime: 0,           // when strike was attempted (0-100)
      huntResult: null,            // { caught, calories, scoreNotes }
      huntFieldNotesUnlocked: [],  // IDs from FIELD_NOTES
      huntsAttempted: 0,
      huntsSuccessful: 0,
      // Camouflage Lab state
      camoScene: 'sand',                   // 'sand' | 'reef' | 'kelp' | 'rock' | 'disruptive-target'
      camoChromatophore: 50,               // 0-100 (red/yellow/black pigment intensity)
      camoIridophore: 30,                  // 0-100 (structural iridescence intensity)
      camoLeucophore: 30,                  // 0-100 (white reflector intensity)
      camoPattern: 'uniform',              // 'uniform' | 'mottled' | 'disruptive' | 'deimatic'
      // Body Plan state
      anatomyRegion: 'central-brain',      // currently highlighted region id
      // Through Time state
      timeView: 'timeline',                // 'timeline' | 'fossils' | 'extinctions' | 'body-evolution'
      timeEraId: 'ordovician',
      timeFossilId: 'cameroceras',
      // Jet Propulsion Lab state
      jetSpeciesId: 'humboldt',            // species for jet comparison
      jetMantleVolume: 300,                // mL
      jetContractionKPa: 60,               // kPa
      jetSiphonDiameter: 18,               // mm
      // Intelligence Lab state
      intelSelectedCase: 'otto',
      // Research Methods Lab state
      methodsSelected: 'ymaze',
      // Comparative Cognition Lab state
      compView: 'matrix',                  // 'matrix' | 'animal' | 'dimension' | 'interpretation'
      compAnimal: 'cephalopod',
      compDimension: 'tooluse',
      // Cephalopods in Culture state
      cultureView: 'myth',                 // 'myth' | 'art' | 'food' | 'modern'
      // Field Day Guide state
      fieldDayView: 'where',               // 'where' | 'signs' | 'ethics' | 'document'
      fieldDayRegion: 'pnw',
      // Bioluminescence Lab state
      bioluxView: 'overview',              // 'overview' | 'photophores' | 'symbiosis' | 'counter'
      bioluxDepthFactor: 50,               // surface light reaching this depth (0-100)
      bioluxBellyIntensity: 50,            // ventral photophore output (0-100)
      bioluxPhotophoreId: 'simple',
      bioluxSymbiosisHour: 0,              // 0-24 hour cycle for Vibrio fischeri demo
      // Day in the Life (Hard Mode) state — integrated hunter/hunted day
      dayActive: false,
      daySpeciesId: null,
      dayEncountersDone: 0,
      dayCalories: 100,
      dayHealth: 100,
      dayArmsLost: 0,
      dayCurrentEncounter: null,
      dayLog: [],
      dayEnded: null,                      // null | 'survived' | 'caught' | 'starved' | 'killed'
      dayBests: {},                        // { speciesId: { bestEncountersSurvived, daysSurvived } }
      dayTotalDaysPlayed: 0,
      // Evasion Sim state
      evasionPhase: 'lobby',               // 'lobby' | 'plan' | 'execute' | 'result'
      evasionSpeciesId: null,
      evasionPredatorId: null,
      evasionTacticId: null,
      evasionReactionMs: 0,                // reaction-time minigame result
      evasionResult: null,
      evasionEncountersAttempted: 0,
      evasionEscapes: 0,
      // Conservation & Welfare state
      conservationSection: 'overview',     // 'overview' | 'fisheries' | 'farming' | 'shell-trade' | 'welfare'
      // Resources state
      glossaryFilter: '',
      resourcesSub: 'glossary',            // 'glossary' | 'sources' | 'citizen' | 'fieldnotes'
      lastUpdated: null
    };
  }
  function todayISO() {
    var dt = new Date(); var m = String(dt.getMonth() + 1).padStart(2, '0'); var dd = String(dt.getDate()).padStart(2, '0');
    return dt.getFullYear() + '-' + m + '-' + dd;
  }

  window.StemLab.registerTool('cephalopodLab', {
    icon: '🐙',
    label: 'Cephalopod Lab',
    desc: 'The intelligence + behavior + camouflage biology of octopuses, squid, cuttlefish, and nautilus. Headline: Hunter Sim — play a cephalopod hunter, pick species + habitat + prey + tactic, run the camouflage minigame, time the strike, learn the real biology behind each species\' adaptations.',
    color: 'indigo',
    category: 'science',
    questHooks: [
      { id: 'open_field_guide', label: 'Open the Species Field Guide', icon: '📖',
        check: function(d) { return !!(d && d.clViewedField); },
        progress: function(d) { return (d && d.clViewedField) ? 'opened' : 'not yet'; } },
      { id: 'first_hunt', label: 'Attempt a hunt', icon: '🎯',
        check: function(d) { return (d && (d.huntsAttempted || 0) > 0); },
        progress: function(d) { return (d && d.huntsAttempted) ? d.huntsAttempted + ' attempt' + (d.huntsAttempted === 1 ? '' : 's') : 'not yet'; } },
      { id: 'first_catch', label: 'Catch your first prey', icon: '🏆',
        check: function(d) { return (d && (d.huntsSuccessful || 0) > 0); },
        progress: function(d) { return (d && d.huntsSuccessful) ? d.huntsSuccessful + ' catch' + (d.huntsSuccessful === 1 ? '' : 'es') : 'not yet'; } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var awardXP = function(n) { if (ctx.awardXP) ctx.awardXP('cephalopodLab', n); };

      var d = labToolData.cephalopodLab || defaultState();
      function setCL(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.cephalopodLab) || defaultState();
          var nextPatch = typeof patch === 'function' ? patch(prior) : patch;
          var next = Object.assign({}, prior, nextPatch);
          next.lastUpdated = todayISO();
          return Object.assign({}, prev, { cephalopodLab: next });
        });
      }
      var section = d.activeSection || 'hub';
      function setSection(s) {
        var patch = { activeSection: s };
        patch['clViewed' + s.charAt(0).toUpperCase() + s.slice(1)] = true;
        setCL(patch);
      }

      // ─── Atmospheric backdrop ───
      // Deep-ocean indigo + faint scale-pattern grain
      var clGrainSvg = (function() {
        var svg =
          '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220">' +
            '<filter id="g">' +
              '<feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="11"/>' +
              '<feColorMatrix values="0 0 0 0 0.3   0 0 0 0 0.4   0 0 0 0 0.7   0 0 0 0.06 0"/>' +
            '</filter>' +
            '<rect width="100%" height="100%" filter="url(#g)"/>' +
          '</svg>';
        return 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")';
      })();
      var rootStyle = {
        background:
          'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,102,241,0.22), transparent 70%), ' +
          clGrainSvg + ', ' +
          'linear-gradient(180deg, #0c1432 0%, #1e1b4b 50%, #0a0a1f 100%)',
        backgroundRepeat: 'no-repeat, repeat, no-repeat',
        backgroundAttachment: 'fixed, scroll, fixed',
        minHeight: '100vh',
        color: '#f1f5f9'
      };

      // ─── Reusable shells ───
      function cardStyle() { return { background: 'rgba(15,23,42,0.6)', borderRadius: 12, padding: '16px 18px', border: '1px solid rgba(99,102,241,0.25)', marginBottom: 16 }; }
      function subheaderStyle() { return { fontSize: 14, fontWeight: 800, color: '#c7d2fe', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }; }
      function panelHeader(title, subtitle) {
        return h('div', { style: { marginBottom: 18 } },
          h('div', { style: { fontSize: 22, fontWeight: 800, color: '#c7d2fe', letterSpacing: '-0.01em', marginBottom: 4 } }, title),
          subtitle ? h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55, maxWidth: 720 } }, subtitle) : null);
      }

      // ─── Hero header (matches Kitchen Lab / Printing Press pattern) ───
      function renderHeader() {
        var TABS = [
          { id: 'hub', label: 'Hub', icon: '🐙' },
          { id: 'field', label: 'Field Guide', icon: '📖' },
          { id: 'hunt', label: 'Hunter Sim', icon: '🎯' },
          { id: 'evasion', label: 'Evasion Sim', icon: '🛡️' },
          { id: 'day', label: 'Day in the Life', icon: '🌅' },
          { id: 'camo', label: 'Camouflage', icon: '🎨' },
          { id: 'biolux', label: 'Bioluminescence', icon: '✨' },
          { id: 'anatomy', label: 'Body Plan', icon: '🧠' },
          { id: 'time', label: 'Through Time', icon: '🕰️' },
          { id: 'jet', label: 'Jet Propulsion', icon: '🚀' },
          { id: 'intel', label: 'Intelligence', icon: '💡' },
          { id: 'methods', label: 'Research Methods', icon: '🔬' },
          { id: 'compcog', label: 'Comparative Cognition', icon: '🧩' },
          { id: 'conservation', label: 'Conservation & Welfare', icon: '🌍' },
          { id: 'culture', label: 'Cephalopods in Culture', icon: '🎭' },
          { id: 'fieldday', label: 'Field Day Guide', icon: '🤿' },
          { id: 'resources', label: 'Resources', icon: '📚' }
        ];
        return h('div', { style: { padding: '24px 20px 12px', borderBottom: '1px solid rgba(99,102,241,0.18)' } },
          h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' } },
            h('div', { 'aria-hidden': 'true',
              style: { width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(99,102,241,0.22)', border: '2px solid rgba(167,139,250,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.3)' } }, '🐙'),
            h('div', { style: { flex: 1, minWidth: 240 } },
              h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' } },
                h('div', { style: { fontSize: 22, fontWeight: 800, color: '#c7d2fe', letterSpacing: '-0.01em' } }, 'Cephalopod Lab'),
                h('div', { style: { fontSize: 10, fontWeight: 700, color: '#a78bfa', background: 'rgba(167,139,250,0.12)',
                    border: '1px solid rgba(167,139,250,0.3)', padding: '2px 8px', borderRadius: 9999, fontFamily: 'ui-monospace, Menlo, monospace' } },
                  '17 sections')),
              h('div', { style: { fontSize: 12, color: '#cbd5e1', marginTop: 4, lineHeight: 1.5 } },
                'The biology of intelligent invertebrates. Octopuses + squid + cuttlefish + nautilus — chromatophore camouflage, distributed neural intelligence, hunting strategy, 500M-year evolution.'))));
      }
      function renderTabs() {
        var TABS = [
          { id: 'hub', label: 'Hub', icon: '🐙' },
          { id: 'field', label: 'Field Guide', icon: '📖' },
          { id: 'hunt', label: 'Hunter Sim', icon: '🎯' },
          { id: 'resources', label: 'Resources', icon: '📚' }
        ];
        return h('div', { role: 'tablist', 'aria-label': 'Cephalopod Lab sections',
          style: { display: 'flex', flexWrap: 'wrap', gap: 0, padding: '0 16px', borderBottom: '1px solid rgba(99,102,241,0.25)', position: 'relative', zIndex: 1 } },
          TABS.map(function(t) {
            var active = section === t.id;
            return h('button', { key: t.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
              onClick: function() { setSection(t.id); awardXP(2); },
              style: {
                padding: '10px 16px',
                background: active ? 'rgba(15,23,42,0.95)' : 'transparent',
                color: active ? '#c7d2fe' : '#94a3b8',
                border: active ? '1px solid rgba(167,139,250,0.4)' : '1px solid transparent',
                borderBottom: active ? '2px solid #a78bfa' : '2px solid transparent',
                borderRadius: '8px 8px 0 0', marginBottom: -1,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'color 0.15s'
              }
            }, h('span', { 'aria-hidden': 'true' }, t.icon), t.label);
          }));
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 1 — HUB
      // ═══════════════════════════════════════════════════════
      function renderHub() {
        return h('div', null,
          panelHeader('🐙 Welcome to Cephalopod Lab',
            'Octopuses, squid, cuttlefish, and nautilus — the smartest invertebrates on Earth, with bodies and behaviors that look more alien than animal. They\'ve been evolving separately from vertebrates for 500 million years and built intelligence from a completely different starting point.'),

          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '🧠 What makes cephalopods remarkable'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 } },
              [
                { icon: '🧠', title: '9 brains, 3 hearts, blue blood',
                  body: 'Octopuses have a central brain + 8 arm ganglia. 2/3 of all their neurons live in the arms. Blood is copper-based (hemocyanin) — blue, not red.' },
                { icon: '🎨', title: 'Skin that sees',
                  body: 'Chromatophores + iridophores + leucophores let them change color in milliseconds. They\'re mostly color-blind themselves, possibly seeing color via skin-distributed opsins.' },
                { icon: '🎭', title: 'Mimicry + tool use',
                  body: 'Mimic octopus impersonates 15+ species. Coconut octopus carries shells as portable homes. Both are unprecedented in invertebrates.' },
                { icon: '⏳', title: 'Live fast, die young',
                  body: 'Most octopuses live 1-2 years. They mate once, brood eggs without eating, then die. Semelparous reproduction is the cephalopod default.' },
                { icon: '🌊', title: 'Climate winners',
                  body: 'Cephalopod populations are RISING globally as fish stocks decline. Short lifespan + rapid reproduction + ecological flexibility makes them well-suited to the changing ocean.' },
                { icon: '🦴', title: '500 million years',
                  body: 'Cephalopods diverged from their snail/clam cousins ~500M years ago. Nautilus is essentially unchanged for 500M years — a true living fossil.' }
              ].map(function(c, i) {
                return h('div', { key: i,
                  style: { background: 'rgba(15,23,42,0.5)', borderLeft: '3px solid #a78bfa', padding: '12px 14px', borderRadius: 8 } },
                  h('div', { style: { fontSize: 20, marginBottom: 4 } }, c.icon),
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c7d2fe', marginBottom: 6 } }, c.title),
                  h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.55 } }, c.body));
              }))),

          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '🎯 What you can do here'),
            h('ul', { style: { color: '#e2e8f0', fontSize: 13, lineHeight: 1.8, margin: 0, padding: '0 0 0 20px' } },
              h('li', null, h('b', { style: { color: '#c7d2fe' } }, 'Field Guide: '), 'Compare 10 species across intelligence + camouflage + hunting style. Each has a "weird thing" — the trait that makes biologists stop everything.'),
              h('li', null, h('b', { style: { color: '#c7d2fe' } }, 'Hunter Sim: '), 'Play a cephalopod hunter. Pick species, habitat, prey, tactic. Match your skin to the substrate. Time the strike. Get judged on whether your tactic was species-appropriate.'),
              h('li', null, h('b', { style: { color: '#c7d2fe' } }, 'Resources: '), 'Glossary, sources, conservation status, the science behind chromatophore biology.'))),

          h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 20 } },
            h('button', { onClick: function() { setSection('field'); awardXP(3); },
              style: { padding: '12px 24px', background: '#6366f1', color: 'white',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer' } },
              '📖 Browse the field guide'),
            h('button', { onClick: function() { setSection('hunt'); awardXP(3); },
              style: { padding: '12px 24px', background: '#a78bfa', color: '#1c1410',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer' } },
              '🎯 Start hunting'))
        );
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 2 — FIELD GUIDE
      // ═══════════════════════════════════════════════════════
      function renderFieldGuide() {
        var selectedId = d.fieldGuideSpeciesId || 'commonOcto';
        var selected = SPECIES.find(function(s) { return s.id === selectedId; }) || SPECIES[0];
        return h('div', null,
          panelHeader('📖 Species Field Guide',
            'Ten cephalopod species. Click any to see its biology, hunting style, and the trait biologists find most striking.'),

          // Species grid (compact)
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, 'Pick a species'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 } },
              SPECIES.map(function(s) {
                var active = s.id === selectedId;
                var groupColor = s.group === 'octopus' ? '#a78bfa' : s.group === 'squid' ? '#38bdf8' : s.group === 'cuttlefish' ? '#fbbf24' : '#86efac';
                return h('button', { key: s.id,
                  onClick: function() { setCL({ fieldGuideSpeciesId: s.id }); awardXP(1); clAnnounce('Selected ' + s.name); },
                  'aria-pressed': active ? 'true' : 'false',
                  style: {
                    padding: '10px 12px', textAlign: 'left',
                    background: active ? 'rgba(99,102,241,0.25)' : 'rgba(15,23,42,0.5)',
                    color: active ? '#c7d2fe' : '#cbd5e1',
                    border: '1px solid ' + (active ? 'rgba(167,139,250,0.6)' : 'rgba(100,116,139,0.3)'),
                    borderLeft: '3px solid ' + groupColor,
                    borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer'
                  } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 } },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 16 } }, s.emoji),
                    h('span', { style: { fontWeight: 800, fontSize: 12, color: active ? '#fde68a' : '#e2e8f0' } }, s.name)),
                  h('div', { style: { fontSize: 9, fontStyle: 'italic', color: '#94a3b8' } }, s.scientific));
              }))),

          // Selected species detail
          h('div', { style: cardStyle() },
            h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12, flexWrap: 'wrap' } },
              h('span', { 'aria-hidden': 'true', style: { fontSize: 40, lineHeight: 1 } }, selected.emoji),
              h('div', { style: { flex: 1, minWidth: 240 } },
                h('div', { style: { fontSize: 20, fontWeight: 900, color: '#c7d2fe', letterSpacing: '-0.01em' } }, selected.name),
                h('div', { style: { fontSize: 12, color: '#a78bfa', fontStyle: 'italic', marginTop: 2 } }, selected.scientific),
                h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 4 } },
                  h('b', null, 'Group: '), selected.group, ' • ',
                  h('b', null, 'Size: '), selected.size, ' • ',
                  h('b', null, 'Lifespan: '), selected.lifespan))),
            // Stat bars
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 14 } },
              [
                { lbl: '🧠 Intelligence', val: selected.intelligence, max: 10, color: '#a78bfa' },
                { lbl: '🎨 Camouflage', val: selected.camouflageRank, max: 10, color: '#fbbf24' },
                { lbl: '🚀 Jet Speed', val: selected.jetSpeed, max: 10, color: '#38bdf8' }
              ].map(function(stat, i) {
                return h('div', { key: i, style: { background: 'rgba(15,23,42,0.5)', padding: '10px 12px', borderRadius: 8 } },
                  h('div', { style: { fontSize: 11, fontWeight: 700, color: '#cbd5e1', marginBottom: 6, display: 'flex', justifyContent: 'space-between' } },
                    h('span', null, stat.lbl),
                    h('span', { style: { fontFamily: 'ui-monospace, Menlo, monospace', color: stat.color } }, stat.val + ' / ' + stat.max)),
                  h('div', { style: { height: 8, background: 'rgba(100,116,139,0.2)', borderRadius: 4, overflow: 'hidden' } },
                    h('div', { style: { height: '100%', width: (stat.val / stat.max * 100) + '%', background: stat.color } })));
              })),
            // Habitat + prey + tactics
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 } },
              [
                { lbl: '🏠 Habitat', val: selected.habitat.map(function(hid) { var ha = HABITATS.find(function(x) { return x.id === hid; }); return ha ? ha.name : hid; }).join(' · '), color: '#86efac' },
                { lbl: '🍽️ Prey', val: selected.prey.map(function(pid) { var pr = PREY.find(function(x) { return x.id === pid; }); return pr ? pr.name : pid; }).join(' · '), color: '#fbbf24' },
                { lbl: '⚔️ Best tactics', val: selected.tactics.map(function(tid) { var ta = TACTICS.find(function(x) { return x.id === tid; }); return ta ? ta.name : tid; }).join(' · '), color: '#fb923c' }
              ].map(function(b, i) {
                return h('div', { key: i, style: { background: 'rgba(15,23,42,0.5)', borderLeft: '3px solid ' + b.color, padding: '10px 12px', borderRadius: 8 } },
                  h('div', { style: { fontSize: 10, fontWeight: 800, color: b.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }, b.lbl),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.55 } }, b.val));
              })),
            // The weird thing
            h('div', { style: { background: 'rgba(167,139,250,0.1)', borderLeft: '4px solid #a78bfa', padding: '12px 14px', borderRadius: 8, marginBottom: 12 } },
              h('div', { style: { fontSize: 10, fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } },
                '🤯 The thing biologists love about this one'),
              h('div', { style: { fontSize: 13, color: '#e9d5ff', lineHeight: 1.6, fontStyle: 'italic' } }, '"' + selected.weird + '"')),
            // Notes paragraph
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.7, marginBottom: 10 } }, selected.notes),
            // Conservation
            h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } },
              h('b', { style: { color: '#cbd5e1' } }, 'Conservation: '), selected.conservation))
        );
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 3 — HUNTER SIM (3D Three.js underwater game)
      // ═══════════════════════════════════════════════════════
      // Real-time 3D simulation: you play a common Pacific octopus on
      // a reef. Crawl, jet, hunt crabs, evade a moray eel that ambushes
      // from a reef hole, ink-defense when cornered. The species info
      // lives in the Field Guide tab — this section is about feeling
      // the real-time hunting + escape biology in your hands.

      // ─── Playable species for the 3D sim ───
      // Three octopuses with genuinely distinct play feel. The Species Field
      // Guide tab has 10 species with biology depth; THIS list is the subset
      // playable as a 3D hunter, with sim-relevant mechanical params.
      var SIM_SPECIES = [
        { id: 'commonOcto', name: 'Common Octopus', scientific: 'Octopus vulgaris', emoji: '🐙',
          tagline: 'The generalist', accent: '#a78bfa',
          description: 'Balanced stats, strong continuous camouflage, no special trick. Best for learning the sim.',
          bodyColor: 0xc26d5e, armColor: 0xa84e3e,
          maxHealth: 100, maxHunger: 100,
          camoQualityMul: 1.0,    // multiplier on camoEff in predator detection
          jetSpeedMul: 1.0,
          specialAbility: null
        },
        { id: 'blueRinged', name: 'Blue-Ringed Octopus', scientific: 'Hapalochlaena lunulata', emoji: '💍',
          tagline: 'Tiny, deadly bite', accent: '#22d3ee',
          description: 'Half the size — weaker stats + weaker camo — but a venomous bite drives off attacking predators in one hit. Aposematic rings flash when threatened.',
          bodyColor: 0xd4a857, armColor: 0xb38c3e,
          maxHealth: 65, maxHunger: 70,
          camoQualityMul: 0.55,
          jetSpeedMul: 1.1,       // smaller = slightly faster
          specialAbility: 'venomousBite'
        },
        { id: 'mimicOcto', name: 'Mimic Octopus', scientific: 'Thaumoctopus mimicus', emoji: '🎭',
          tagline: 'Hold M to impersonate', accent: '#fbbf24',
          description: 'Mid-size, decent camo. Hold M to extend arms into a lionfish-spiky shape — grouper and shark detection range halves. Costs stamina while held.',
          bodyColor: 0xdfc193, armColor: 0xb89968,
          maxHealth: 75, maxHunger: 80,
          camoQualityMul: 0.75,
          jetSpeedMul: 1.0,
          specialAbility: 'mimicry'
        }
      ];

      // ─── Three.js loader (lazy CDN) ───
      function ensureThreeJSCL(onReady, onError) {
        if (window.THREE) { onReady(); return; }
        var s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        s.async = true;
        s.onload = function() { onReady(); };
        s.onerror = function() { console.error('[CephalopodLab] Three.js failed to load'); if (onError) onError(); };
        document.head.appendChild(s);
      }

      function renderHuntSim() {
        var threeLoaded = !!window.THREE || (d._threeLoaded === true);
        var threeError = !!d._threeError;
        var active = !!d.hunt3DActive;

        return h('div', null,
          panelHeader('🎯 Hunter Sim — 3D Underwater',
            'Play a common Pacific octopus on a reef. Hunt crabs, evade a moray eel, use ink to escape. WASD to crawl, Space to jet (drains stamina), click to grab nearby prey, I for ink defense.'),

          // Run stats card
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, 'Run stats'),
            h('div', { style: { display: 'flex', gap: 24, flexWrap: 'wrap' } },
              h('div', null,
                h('div', { style: { fontSize: 28, fontWeight: 900, color: '#86efac', fontFamily: 'ui-monospace, Menlo, monospace' } }, (d.huntsSuccessful || 0)),
                h('div', { style: { fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Crabs caught')),
              h('div', null,
                h('div', { style: { fontSize: 28, fontWeight: 900, color: '#fb923c', fontFamily: 'ui-monospace, Menlo, monospace' } }, (d.huntsAttempted || 0)),
                h('div', { style: { fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Dives'),
              ),
              h('div', null,
                h('div', { style: { fontSize: 28, fontWeight: 900, color: '#a78bfa', fontFamily: 'ui-monospace, Menlo, monospace' } }, (d.huntBestRun || 0)),
                h('div', { style: { fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Best run')))),

          // Controls card
          !active ? h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, 'Controls'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 14 } },
              [
                { k: 'W A S D', d: 'Crawl — slow, stealthy, oxygen-cheap', color: '#86efac' },
                { k: 'SPACE', d: 'Jet propulsion — burst speed, drains stamina', color: '#60a5fa' },
                { k: 'CLICK', d: 'Pounce nearest crab or fish in range', color: '#fbbf24' },
                { k: 'HOLD E', d: 'Drill open a clam (1.8s, big calorie payoff)', color: '#fb923c' },
                { k: 'I', d: 'Ink defense — 3 charges, 8s cooldown between', color: '#a78bfa' },
                { k: 'G', d: 'Grab / drop a coconut — drop = temp shelter', color: '#a07840' },
                { k: '(passive)', d: 'Camouflage — settle on a substrate to blend', color: '#22d3ee' }
              ].map(function(c, i) {
                return h('div', { key: i, style: { background: 'rgba(15,23,42,0.5)', padding: 10, borderRadius: 8, borderLeft: '3px solid ' + c.color } },
                  h('div', { style: { fontSize: 13, fontWeight: 900, color: c.color, fontFamily: 'ui-monospace, Menlo, monospace', marginBottom: 4 } }, c.k),
                  h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.4 } }, c.d));
              }))) : null,

          // Real biology note
          !active ? h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, 'What you\'re feeling — all integrated, no minigames'),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.7 } },
              h('p', { style: { margin: '0 0 8px' } },
                h('b', { style: { color: '#22d3ee' } }, 'Camouflage is passive.'),
                ' Your skin continuously lerps toward whatever substrate you\'re resting on — sand, rock, coral, sea grass. The longer you stay still, the better the match. Predator detection radius shrinks with your camo effectiveness. There\'s no "press F to blend" — it just happens.'),
              h('p', { style: { margin: '0 0 8px' } },
                h('b', { style: { color: '#86efac' } }, 'Hunger creates rhythm.'),
                ' Hunger drains slowly. Eating refills it: crab +22, fish +32 (jet-pounce them), clam +50 (hold E to drill). Starvation eats your health.'),
              h('p', { style: { margin: '0 0 8px' } },
                h('b', { style: { color: '#22c55e' } }, 'Dens are your safety net.'),
                ' Four rock arches around the reef. Inside one, predators give up the chase and your health regens. You\'ll see a green ring light up when you\'re close.'),
              h('p', { style: { margin: '0 0 8px' } },
                h('b', { style: { color: '#fbbf24' } }, 'Two predators with different rhythms.'),
                ' The moray eel ambushes from a fixed hole (marked by a torus ring) and is more aggressive at night. The grouper roams the open water during the day with a longer detection range but slower charge — and sleeps at night.'),
              h('p', { style: { margin: '0 0 8px' } },
                h('b', { style: { color: '#a78bfa' } }, 'Ink is finite and panicked.'),
                ' 3 charges per dive, 8 seconds between releases. Drop a black cloud that breaks every predator\'s visual lock for ~3 seconds. Real octopus biology: ink is a chemical resource carried in the ink sac (~3-5 doses), with refractory time between releases — not an infinite-use spell.'),
              h('p', { style: { margin: '0 0 8px' } },
                h('b', { style: { color: '#a07840' } }, 'Coconuts are tools.'),
                ' Press G near a coconut half to pick it up — it travels with you and adds +30% camouflage (the shell partially obscures your body). Press G again to drop it where you stand; the dropped coconut becomes a temporary shelter that acts like a den for ~90 seconds. Documented in Finn et al. 2009 — coconut octopuses (Amphioctopus marginatus) genuinely carry shells across open sand for portable shelter, the clearest example of tool use in an invertebrate.'),
              h('p', { style: { margin: 0 } },
                h('b', { style: { color: '#22c55e' } }, 'The ocean is endless.'),
                ' Reef rocks, coral, sea grass, crabs, clams, fish, and bubbles all stream toward you as you wander. Fog obscures the horizon. Dens spawn ahead of you when you go off-map. You can never explore everything — just go.'))) : null,

          // Three.js loader (only visible until loaded)
          !active && !threeLoaded && !threeError ? h('div', { style: { textAlign: 'center', marginBottom: 16 } },
            h('button', {
              onClick: function() {
                setCL({ _threeLoading: true });
                ensureThreeJSCL(
                  function() { setCL({ _threeLoaded: true, _threeLoading: false }); clAnnounce('3D engine ready'); },
                  function() { setCL({ _threeError: true, _threeLoading: false }); }
                );
              },
              disabled: !!d._threeLoading,
              style: { padding: '14px 28px', background: '#a78bfa', color: '#1c1410',
                border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer',
                opacity: d._threeLoading ? 0.6 : 1 } },
              d._threeLoading ? '⏳ Loading 3D engine…' : '▶ Load 3D engine')) : null,

          // Species picker (3 cards) — appears once Three.js is loaded
          !active && threeLoaded ? h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, 'Pick your octopus + dive'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 } },
              SIM_SPECIES.map(function(sp) {
                return h('button', { key: sp.id,
                  onClick: function() {
                    setCL({
                      hunt3DActive: true,
                      huntSpeciesId: sp.id,
                      huntsAttempted: (d.huntsAttempted || 0) + 1
                    });
                    awardXP(3);
                    clAnnounce('Diving as ' + sp.name);
                  },
                  style: { textAlign: 'left', cursor: 'pointer',
                    padding: '14px 16px',
                    background: 'linear-gradient(135deg, rgba(15,23,42,0.85), rgba(15,23,42,0.55))',
                    color: '#e2e8f0',
                    borderTop: '1px solid rgba(100,116,139,0.35)',
                    borderRight: '1px solid rgba(100,116,139,0.35)',
                    borderBottom: '1px solid rgba(100,116,139,0.35)',
                    borderLeft: '4px solid ' + sp.accent,
                    borderRadius: 10 } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 28, lineHeight: 1 } }, sp.emoji),
                    h('div', { style: { flex: 1 } },
                      h('div', { style: { fontSize: 14, fontWeight: 900, color: sp.accent } }, sp.name),
                      h('div', { style: { fontSize: 10, fontStyle: 'italic', color: '#94a3b8', marginTop: 2 } }, sp.scientific))),
                  h('div', { style: { fontSize: 11, fontWeight: 800, color: '#fde68a', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' } }, sp.tagline),
                  h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.55, marginBottom: 8 } }, sp.description),
                  h('div', { style: { display: 'flex', gap: 8, fontSize: 10, color: '#94a3b8', flexWrap: 'wrap' } },
                    h('span', null, '❤️ ' + sp.maxHealth),
                    h('span', null, '🍽 ' + sp.maxHunger),
                    h('span', null, '🎨 ' + (sp.camoQualityMul * 100).toFixed(0) + '%'),
                    sp.specialAbility === 'venomousBite' ? h('span', { style: { color: '#22d3ee' } }, '💀 venom bite') : null,
                    sp.specialAbility === 'mimicry' ? h('span', { style: { color: '#fbbf24' } }, '🎭 mimicry (hold M)') : null
                  ));
              }))) : null,

          // Error state
          !active && threeError ? h('div', { style: { textAlign: 'center', marginBottom: 16 } },
            h('div', { style: { color: '#fca5a5', fontSize: 12, padding: '12px 18px', background: 'rgba(220,38,38,0.15)', borderRadius: 8, border: '1px solid rgba(220,38,38,0.3)', display: 'inline-block' } },
              '⚠ Couldn\'t load Three.js. Check your network and try again.')) : null,

          // 3D canvas
          active && threeLoaded ? h('div', null,
            h('div', { style: { position: 'relative', width: '100%', maxWidth: 960, margin: '0 auto', aspectRatio: '16 / 10', background: '#0a4a6b', borderRadius: 12, overflow: 'hidden' } },
              h('canvas', {
                tabIndex: 0,
                role: 'application',
                'aria-label': '3D octopus hunt simulator. WASD to crawl, A and D rotate. Space jets. Click hunts. I uses ink defense.',
                style: { width: '100%', height: '100%', display: 'block', cursor: 'crosshair', outline: 'none' },
                ref: function(canvasEl) {
                  if (!canvasEl) return;
                  if (canvasEl._clInit) return;
                  if (canvasEl._clCleanup) { try { canvasEl._clCleanup(); } catch(e) {} canvasEl._clCleanup = null; }
                  canvasEl._clInit = true;
                  initHuntSim3D(canvasEl);
                }
              })),
            h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' } },
              h('button', { onClick: function() { setCL({ hunt3DActive: false }); clAnnounce('Surfaced. Ready to dive again.'); },
                style: { padding: '10px 20px', background: 'transparent', color: '#c7d2fe',
                  border: '1px solid rgba(167,139,250,0.4)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' } },
                '◀ End run + surface')),
            h('div', { style: { textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 8, fontStyle: 'italic' } },
              'Tip: click the canvas first so keyboard input is captured.')
          ) : null
        );
      }

      // ─── 3D underwater octopus simulation ───
      // Builds a Three.js scene with seafloor + reef + sea grass, a player
      // octopus with WASD/jet/ink controls, simple crab AI prey, and a
      // moray eel predator with ambush AI. Mounted on the host canvasEl
      // via a callback ref. Lifecycle managed via canvasEl._clCleanup.
      function initHuntSim3D(canvasEl) {
        var THREE = window.THREE;
        if (!THREE) return;
        // Resolve selected species (defaults to common octopus).
        var speciesId = d.huntSpeciesId || 'commonOcto';
        var species = SIM_SPECIES.find(function(s) { return s.id === speciesId; }) || SIM_SPECIES[0];
        var W = canvasEl.clientWidth || 800;
        var H = canvasEl.clientHeight || 500;

        var scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0e3d5c);
        scene.fog = new THREE.Fog(0x0a4a6b, 18, 70);

        var camera = new THREE.PerspectiveCamera(70, W / H, 0.1, 200);

        var renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(W, H);

        // ─── Lighting (downwelling sunlight + cool ambient) ───
        var ambient = new THREE.AmbientLight(0x3a5876, 0.6);
        scene.add(ambient);
        var sun = new THREE.DirectionalLight(0xb8e6f0, 0.85);
        sun.position.set(20, 40, 10);
        scene.add(sun);

        // ─── Sandy seafloor with displacement ───
        // Floor follows the player each frame, so a 200×200 plane combined
        // with fog at ~70u gives the visual impression of an endless ocean.
        var floorGeo = new THREE.PlaneGeometry(200, 200, 80, 80);
        var floorPos = floorGeo.attributes.position.array;
        for (var fi = 0; fi < floorPos.length; fi += 3) {
          var fx = floorPos[fi], fy = floorPos[fi + 1];
          var hh = 0;
          hh += Math.sin(fx * 0.12) * Math.cos(fy * 0.10) * 0.6;
          hh += Math.sin(fx * 0.31 + 0.5) * Math.cos(fy * 0.27) * 0.25;
          hh += Math.sin(fx * 0.55) * Math.cos(fy * 0.6) * 0.1;
          floorPos[fi + 2] = hh;
        }
        floorGeo.computeVertexNormals();
        // Sand texture (procedural canvas)
        var sandCv = document.createElement('canvas');
        sandCv.width = 256; sandCv.height = 256;
        var sandCx = sandCv.getContext('2d');
        sandCx.fillStyle = '#c9a06a';
        sandCx.fillRect(0, 0, 256, 256);
        for (var sg = 0; sg < 1200; sg++) {
          var sr = 180 + Math.random() * 40, gg = 140 + Math.random() * 40, sb = 90 + Math.random() * 40;
          sandCx.fillStyle = 'rgba(' + sr.toFixed(0) + ',' + gg.toFixed(0) + ',' + sb.toFixed(0) + ',0.7)';
          sandCx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2.5, 1 + Math.random() * 2.5);
        }
        var sandTex = new THREE.CanvasTexture(sandCv);
        sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping;
        sandTex.repeat.set(14, 14);
        var floor = new THREE.Mesh(floorGeo,
          new THREE.MeshStandardMaterial({ map: sandTex, roughness: 0.97, metalness: 0.02 }));
        floor.rotation.x = -Math.PI / 2;
        scene.add(floor);

        // ─── Reef rocks (scattered, irregular) ───
        var rocks = [];
        for (var ri = 0; ri < 45; ri++) {
          var rx = (Math.random() - 0.5) * 110;
          var rz = (Math.random() - 0.5) * 110;
          if (Math.abs(rx) < 6 && Math.abs(rz) < 6) continue; // keep center clear
          var rs = 0.6 + Math.random() * 1.4;
          var rockGeo = new THREE.SphereGeometry(rs, 8, 6);
          var rPos = rockGeo.attributes.position.array;
          for (var rj = 0; rj < rPos.length; rj += 3) {
            rPos[rj] += (Math.random() - 0.5) * 0.25;
            rPos[rj + 1] += (Math.random() - 0.5) * 0.25;
            rPos[rj + 2] += (Math.random() - 0.5) * 0.25;
          }
          rockGeo.computeVertexNormals();
          var rockTint = 0x504030 + Math.floor(Math.random() * 0x080808);
          var rockMesh = new THREE.Mesh(rockGeo, new THREE.MeshStandardMaterial({ color: rockTint, roughness: 0.93 }));
          rockMesh.position.set(rx, rs * 0.35, rz);
          // Tag for the camouflage substrate-detector. Octopus skin will lerp
          // toward this color when stationary on/near this rock.
          rockMesh.userData.substrate = 'rock';
          rockMesh.userData.substrateRadius = rs * 1.2;
          scene.add(rockMesh);
          rocks.push(rockMesh);
        }

        // ─── Coral (cylinders, warm colors) ───
        var coralColors = [0xc94e6d, 0xff6b35, 0xd4af37, 0x8e5572, 0xb8345c];
        var corals = [];
        for (var ci = 0; ci < 18; ci++) {
          var cx = (Math.random() - 0.5) * 90;
          var cz = (Math.random() - 0.5) * 90;
          if (Math.abs(cx) < 8 && Math.abs(cz) < 8) continue;
          var ch = 1 + Math.random() * 1.5;
          var coralHex = coralColors[Math.floor(Math.random() * coralColors.length)];
          var coralGeo = new THREE.CylinderGeometry(0.15, 0.32, ch, 8);
          var coral = new THREE.Mesh(coralGeo,
            new THREE.MeshStandardMaterial({ color: coralHex, roughness: 0.7 }));
          coral.position.set(cx, ch / 2, cz);
          coral.rotation.y = Math.random() * Math.PI;
          coral.rotation.z = (Math.random() - 0.5) * 0.3;
          // Tag for camouflage. Coral lets the octopus turn warm hues.
          coral.userData.substrate = 'coral';
          coral.userData.coralHex = coralHex;
          coral.userData.substrateRadius = 1.1;
          scene.add(coral);
          corals.push(coral);
        }

        // ─── Sea grass (planes that sway) — tagged for camouflage ───
        var grass = [];
        var grassClusters = [];  // for substrate detection (cluster of N nearby grass blades)
        for (var gi = 0; gi < 80; gi++) {
          var gx = (Math.random() - 0.5) * 120;
          var gz = (Math.random() - 0.5) * 120;
          var gH = 0.6 + Math.random() * 1.3;
          var grassGeo = new THREE.PlaneGeometry(0.35, gH);
          var grassMat = new THREE.MeshBasicMaterial({ color: 0x2a8c4a, side: THREE.DoubleSide, transparent: true, opacity: 0.78 });
          var gmesh = new THREE.Mesh(grassGeo, grassMat);
          gmesh.position.set(gx, gH / 2 + 0.05, gz);
          gmesh.rotation.y = Math.random() * Math.PI;
          gmesh.userData.substrate = 'grass';
          gmesh.userData.substrateRadius = 0.6;
          scene.add(gmesh);
          grass.push({ mesh: gmesh, phase: Math.random() * Math.PI * 2 });
        }

        // ─── Caustic light overlay (animated bright spots) ───
        var causticsGeo = new THREE.PlaneGeometry(140, 140, 1, 1);
        var causticsTex = (function() {
          var cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
          var cx = cv.getContext('2d');
          cx.fillStyle = 'rgba(0,0,0,0)';
          cx.fillRect(0, 0, 256, 256);
          for (var cci = 0; cci < 30; cci++) {
            var grd = cx.createRadialGradient(Math.random() * 256, Math.random() * 256, 4, Math.random() * 256, Math.random() * 256, 20 + Math.random() * 20);
            grd.addColorStop(0, 'rgba(220,250,255,0.18)');
            grd.addColorStop(1, 'rgba(220,250,255,0)');
            cx.fillStyle = grd; cx.fillRect(0, 0, 256, 256);
          }
          var t = new THREE.CanvasTexture(cv);
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          return t;
        })();
        causticsTex.repeat.set(4, 4);
        var causticsMat = new THREE.MeshBasicMaterial({ map: causticsTex, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending });
        var caustics = new THREE.Mesh(causticsGeo, causticsMat);
        caustics.rotation.x = -Math.PI / 2;
        caustics.position.y = 0.05;
        scene.add(caustics);

        // ─── Octopus mesh (body + 8 arms) ───
        // Size scales with species (blue-ringed + mimic are smaller).
        var bodyScale = species.id === 'blueRinged' ? 0.7 : species.id === 'mimicOcto' ? 0.85 : 1.0;
        var octopus = new THREE.Group();
        var mantleGeo = new THREE.SphereGeometry(0.55 * bodyScale, 14, 10);
        mantleGeo.scale(1, 1.3, 1);
        // Cache the resting vertex positions so the papillae animation
        // (substrate-texture matching) has a base to displace from.
        var mantleBasePositions = new Float32Array(mantleGeo.attributes.position.array);
        var mantleMat = new THREE.MeshStandardMaterial({ color: species.bodyColor, roughness: 0.5, metalness: 0.05 });
        var mantle = new THREE.Mesh(mantleGeo, mantleMat);
        mantle.position.y = 0.2;
        octopus.add(mantle);

        // ─── Blue-ringed warning rings (visible only when threatened) ───
        var warningRings = [];
        if (species.specialAbility === 'venomousBite') {
          for (var wri = 0; wri < 8; wri++) {
            var ringAngle = (wri / 8) * Math.PI * 2;
            var ringGeo = new THREE.TorusGeometry(0.07, 0.025, 4, 12);
            var ringMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0 });
            var ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.set(
              Math.cos(ringAngle) * 0.32 * bodyScale,
              0.15 + Math.sin(ringAngle * 1.7) * 0.18,
              Math.sin(ringAngle) * 0.32 * bodyScale + 0.08
            );
            ring.rotation.x = Math.PI / 2;
            ring.rotation.z = ringAngle;
            octopus.add(ring);
            warningRings.push(ring);
          }
        }
        // Eyes
        for (var ei = 0; ei < 2; ei++) {
          var eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.13 * bodyScale, 8, 6),
            new THREE.MeshStandardMaterial({ color: 0xfff8e8, roughness: 0.3 }));
          eyeWhite.position.set(ei === 0 ? -0.28 * bodyScale : 0.28 * bodyScale, 0.35 * bodyScale, 0.42 * bodyScale);
          octopus.add(eyeWhite);
          var pupil = new THREE.Mesh(new THREE.SphereGeometry(0.07 * bodyScale, 6, 5),
            new THREE.MeshBasicMaterial({ color: 0x141414 }));
          pupil.position.set(ei === 0 ? -0.28 * bodyScale : 0.28 * bodyScale, 0.35 * bodyScale, 0.5 * bodyScale);
          octopus.add(pupil);
        }
        // 8 arms
        var arms = [];
        for (var ai = 0; ai < 8; ai++) {
          var armAngle = (ai / 8) * Math.PI * 2;
          var armGeo = new THREE.CylinderGeometry(0.09 * bodyScale, 0.04 * bodyScale, 1.0 * bodyScale, 6);
          var armMat = new THREE.MeshStandardMaterial({ color: species.armColor, roughness: 0.55 });
          var arm = new THREE.Mesh(armGeo, armMat);
          arm.position.set(Math.cos(armAngle) * 0.42, -0.15, Math.sin(armAngle) * 0.42);
          arm.rotation.z = Math.cos(armAngle) * 0.4;
          arm.rotation.x = Math.sin(armAngle) * 0.4 + Math.PI / 2 - 0.2;
          octopus.add(arm);
          arms.push({
            mesh: arm,
            baseRotX: arm.rotation.x,
            baseRotZ: arm.rotation.z,
            basePosX: arm.position.x,
            basePosZ: arm.position.z,
            angle: armAngle,
            phase: ai * (Math.PI / 4),
            compressTarget: 1.0,   // 1 = relaxed, 0.55 = squeezing through a gap
            compressCurrent: 1.0,
          });
        }
        octopus.position.set(0, 0.6, 0);
        scene.add(octopus);

        // ─── Mimic-octopus impersonation visual (spike-tendril overlay) ───
        // Only created for the mimic; spike cones extending outward from the
        // mantle, fade in while M is held. Visually halos the body like a
        // venomous lionfish — predators read it as toxic + back off.
        var mimicSpikes = [];
        if (species.specialAbility === 'mimicry') {
          for (var msi = 0; msi < 14; msi++) {
            var spikeAngle = (msi / 14) * Math.PI * 2;
            var spikeGeo = new THREE.ConeGeometry(0.05, 0.7, 5);
            var spikeMat = new THREE.MeshStandardMaterial({ color: 0xc9302c, roughness: 0.5, transparent: true, opacity: 0 });
            var spike = new THREE.Mesh(spikeGeo, spikeMat);
            spike.position.set(
              Math.cos(spikeAngle) * 0.55 * bodyScale,
              0.4 + Math.sin(msi * 0.7) * 0.15,
              Math.sin(spikeAngle) * 0.55 * bodyScale
            );
            spike.lookAt(spike.position.x * 2, spike.position.y * 2, spike.position.z * 2);
            octopus.add(spike);
            mimicSpikes.push(spike);
          }
        }

        // ─── Crab prey ───
        var crabs = [];
        function spawnCrab() {
          var crab = new THREE.Group();
          var crabBodyGeo = new THREE.SphereGeometry(0.28, 8, 6);
          crabBodyGeo.scale(1.1, 0.45, 0.85);
          var crabBody = new THREE.Mesh(crabBodyGeo,
            new THREE.MeshStandardMaterial({ color: 0xa54a30, roughness: 0.7 }));
          crab.add(crabBody);
          // Eyes
          for (var cei = 0; cei < 2; cei++) {
            var ceye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5),
              new THREE.MeshBasicMaterial({ color: 0x141414 }));
            ceye.position.set(cei === 0 ? -0.12 : 0.12, 0.13, 0.18);
            crab.add(ceye);
          }
          // 6 legs
          for (var li = 0; li < 6; li++) {
            var legSide = li % 2 === 0 ? -1 : 1;
            var legRow = ((li / 2) | 0) - 1;
            var legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.32, 4);
            var leg = new THREE.Mesh(legGeo,
              new THREE.MeshStandardMaterial({ color: 0x8a3520, roughness: 0.7 }));
            leg.position.set(legSide * 0.28, -0.05, legRow * 0.16);
            leg.rotation.z = legSide * 0.9;
            crab.add(leg);
          }
          // 2 claws (front)
          for (var clw = 0; clw < 2; clw++) {
            var clawSide = clw === 0 ? -1 : 1;
            var clawGeo = new THREE.SphereGeometry(0.11, 6, 5);
            clawGeo.scale(1.4, 0.7, 0.7);
            var claw = new THREE.Mesh(clawGeo,
              new THREE.MeshStandardMaterial({ color: 0xc25a3e, roughness: 0.7 }));
            claw.position.set(clawSide * 0.32, 0, 0.22);
            crab.add(claw);
          }
          // Spawn near the player (40-80u away) so respawns stream content
          // into view rather than into faraway corners they may never see.
          var spawnRefX = (typeof octopus !== 'undefined') ? octopus.position.x : 0;
          var spawnRefZ = (typeof octopus !== 'undefined') ? octopus.position.z : 0;
          var spawnAng = Math.random() * Math.PI * 2;
          var spawnRad = 40 + Math.random() * 40;
          crab.position.set(
            spawnRefX + Math.sin(spawnAng) * spawnRad,
            0.18,
            spawnRefZ + Math.cos(spawnAng) * spawnRad
          );
          crab.userData = {
            wanderAngle: Math.random() * Math.PI * 2,
            wanderTimer: 0,
            speed: 0.6 + Math.random() * 0.4,
            alive: true,
            legPhase: 0,
          };
          scene.add(crab);
          crabs.push(crab);
          return crab;
        }
        for (var cb = 0; cb < 10; cb++) spawnCrab();

        // ─── Moray eel (ambush predator) ───
        var moray = new THREE.Group();
        var morayBody = new THREE.Mesh(
          new THREE.CylinderGeometry(0.32, 0.15, 3, 8),
          new THREE.MeshStandardMaterial({ color: 0x3a5028, roughness: 0.7 })
        );
        morayBody.rotation.x = Math.PI / 2;
        moray.add(morayBody);
        var morayHead = new THREE.Mesh(
          new THREE.SphereGeometry(0.4, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0x4a6038, roughness: 0.65 })
        );
        morayHead.position.z = 1.55;
        morayHead.scale.z = 1.3;
        moray.add(morayHead);
        // Eyes
        for (var mei = 0; mei < 2; mei++) {
          var meye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5),
            new THREE.MeshBasicMaterial({ color: 0xffd400 }));
          meye.position.set(mei === 0 ? -0.18 : 0.18, 0.15, 1.7);
          moray.add(meye);
        }
        // Pick a moray home near a rock
        var morayHome = { x: 14, z: 11 };
        moray.position.set(morayHome.x, 0.25, morayHome.z);
        moray.userData = {
          homeX: morayHome.x, homeZ: morayHome.z,
          state: 'idle',       // idle | attacking | returning | cooldown
          stateTimer: 0,
          aggroRange: 7,
          speed: 4.5,
          cooldownUntil: 0,
        };
        scene.add(moray);
        // Marker rock at moray's home (visual cue)
        var dornGeo = new THREE.TorusGeometry(1.2, 0.3, 8, 16);
        var dornMat = new THREE.MeshStandardMaterial({ color: 0x4a3a28, roughness: 0.9 });
        var dornRing = new THREE.Mesh(dornGeo, dornMat);
        dornRing.position.set(morayHome.x, 0.15, morayHome.z);
        dornRing.rotation.x = Math.PI / 2;
        scene.add(dornRing);

        // ─── Grouper (roaming predator, day-active) ───
        // Unlike moray (fixed-hole ambush), grouper patrols open water.
        // Longer detection radius but slower charge; pauses at night when
        // it tucks into a far reef edge.
        var grouper = new THREE.Group();
        var gBodyGeo = new THREE.SphereGeometry(0.9, 12, 8);
        gBodyGeo.scale(1.6, 0.85, 0.85);
        var gBody = new THREE.Mesh(gBodyGeo,
          new THREE.MeshStandardMaterial({ color: 0x6b6244, roughness: 0.55 }));
        grouper.add(gBody);
        // Tail
        var gTail = new THREE.Mesh(
          new THREE.ConeGeometry(0.5, 0.7, 6),
          new THREE.MeshStandardMaterial({ color: 0x554a32, roughness: 0.6 })
        );
        gTail.position.x = -1.5;
        gTail.rotation.z = -Math.PI / 2;
        grouper.add(gTail);
        // Eyes
        for (var gei = 0; gei < 2; gei++) {
          var geye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5),
            new THREE.MeshBasicMaterial({ color: 0xffd400 }));
          geye.position.set(0.9, 0.25 * (gei === 0 ? 1 : -1), 0.35);
          grouper.add(geye);
        }
        grouper.position.set(-25, 1.8, -20);
        grouper.userData = {
          state: 'patrol',
          patrolAngle: 0,
          patrolTimer: 0,
          stateTimer: 0,
          aggroRange: 10,
          speed: 3.2,
          cooldownUntil: 0,
        };
        scene.add(grouper);

        // ─── Coconuts (carriable shells — real coconut-octopus tool use) ───
        // 10 coconut halves on the seafloor. Press G near one (within 1.6u)
        // to pick it up; it attaches to one of the octopus's arms and travels
        // with you. While carrying: camoEff +0.30 capped to 1 (shell partly
        // obscures the body), movement speed −10%. Press G again to drop —
        // the dropped coconut becomes a static "rest spot" that acts like a
        // mini-den (predators give up within 1.5u). Real biology: Amphioctopus
        // marginatus (Finn et al. 2009) carries coconut halves to assemble
        // portable shelters when crossing open sand.
        var COCONUT_PICKUP_RANGE = 1.6;
        var COCONUT_DEN_RADIUS = 1.5;
        var COCONUT_LIFE_MS = 90000;  // dropped coconut "ages out" after 90s
        var coconuts = [];
        function makeCoconutMesh() {
          var g = new THREE.Group();
          // Two halves stuck together with a slight gap
          var halfMat = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.9 });
          var insideMat = new THREE.MeshStandardMaterial({ color: 0xeed2a4, roughness: 0.7 });
          var topGeo = new THREE.SphereGeometry(0.32, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2);
          var top = new THREE.Mesh(topGeo, halfMat);
          top.position.y = 0.05;
          g.add(top);
          var bottomGeo = new THREE.SphereGeometry(0.32, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2);
          var bottom = new THREE.Mesh(bottomGeo, halfMat);
          bottom.rotation.x = Math.PI;
          bottom.position.y = -0.05;
          g.add(bottom);
          // Inside texture peek
          var insideGeo = new THREE.SphereGeometry(0.27, 8, 6);
          var inside = new THREE.Mesh(insideGeo, insideMat);
          g.add(inside);
          // Fibrous texture lines
          for (var fi = 0; fi < 6; fi++) {
            var lineGeo = new THREE.TorusGeometry(0.31, 0.018, 4, 12, Math.PI * 1.8);
            var line = new THREE.Mesh(lineGeo, new THREE.MeshStandardMaterial({ color: 0x3a2010 }));
            line.rotation.y = (fi / 6) * Math.PI * 2;
            line.rotation.x = Math.PI / 2;
            g.add(line);
          }
          return g;
        }
        function spawnCoconut(x, z) {
          var c = makeCoconutMesh();
          c.position.set(x, 0.32, z);
          c.userData = {
            state: 'free',         // free | carried | dropped
            createdAt: 0,           // 0 means original; set to now() when dropped
            wobble: Math.random() * Math.PI * 2,
          };
          scene.add(c);
          coconuts.push(c);
          return c;
        }
        for (var coc = 0; coc < 10; coc++) {
          var ccx, ccz;
          do {
            ccx = (Math.random() - 0.5) * 110;
            ccz = (Math.random() - 0.5) * 110;
          } while (Math.abs(ccx) < 8 && Math.abs(ccz) < 8);
          spawnCoconut(ccx, ccz);
        }
        var carriedCoconut = null;
        var gKeyDownPrev = false;   // edge-triggered G key

        // ─── Reef shark (rare, edge-spawned, electroreception-resistant) ───
        // Unlike the moray (visual ambush) and grouper (visual roam), the
        // shark hunts by electroreception + chemosense. Camouflage barely
        // helps (30% reduction vs 70% for the other two), and ink masks
        // chemo-detection but doesn't fully block — half effect duration.
        // Spawns once every ~70-90s during a run, comes from a random map
        // edge, makes 2-3 attack attempts, then leaves.
        var shark = null;
        var SHARK_SPAWN_INTERVAL_MS_MIN = 70000;
        var SHARK_SPAWN_INTERVAL_MS_MAX = 95000;
        var nextSharkSpawnAt = Date.now() + SHARK_SPAWN_INTERVAL_MS_MIN + Math.random() * (SHARK_SPAWN_INTERVAL_MS_MAX - SHARK_SPAWN_INTERVAL_MS_MIN);
        function spawnShark() {
          if (shark) return;
          var sg = new THREE.Group();
          var sBodyGeo = new THREE.SphereGeometry(0.8, 12, 8);
          sBodyGeo.scale(2.4, 0.7, 0.85);
          var sBody = new THREE.Mesh(sBodyGeo,
            new THREE.MeshStandardMaterial({ color: 0x6a7480, roughness: 0.55 }));
          sg.add(sBody);
          // Dorsal fin
          var dorsalGeo = new THREE.ConeGeometry(0.25, 0.65, 4);
          dorsalGeo.scale(1, 1, 0.6);
          var dorsal = new THREE.Mesh(dorsalGeo,
            new THREE.MeshStandardMaterial({ color: 0x4a525e, roughness: 0.6 }));
          dorsal.position.set(-0.2, 0.6, 0);
          sg.add(dorsal);
          // Caudal fin (vertical tail)
          var tailGeo = new THREE.ConeGeometry(0.45, 0.8, 4);
          tailGeo.scale(0.5, 1, 1);
          var stail = new THREE.Mesh(tailGeo,
            new THREE.MeshStandardMaterial({ color: 0x4a525e, roughness: 0.6 }));
          stail.position.set(-2.2, 0, 0);
          stail.rotation.z = Math.PI / 2;
          sg.add(stail);
          // Eyes
          for (var sei = 0; sei < 2; sei++) {
            var seye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5),
              new THREE.MeshBasicMaterial({ color: 0x080808 }));
            seye.position.set(1.5, 0.18 * (sei === 0 ? 1 : -1), 0.4);
            sg.add(seye);
          }
          // Pale underbelly stripe (visual differentiation)
          var bellyGeo = new THREE.SphereGeometry(0.78, 12, 8);
          bellyGeo.scale(2.35, 0.35, 0.85);
          var belly = new THREE.Mesh(bellyGeo,
            new THREE.MeshStandardMaterial({ color: 0xcdd5dc, roughness: 0.5 }));
          belly.position.y = -0.35;
          sg.add(belly);
          // Edge-spawn: pick a random map edge and aim toward center
          var edgeSide = Math.floor(Math.random() * 4);
          var sx, sz;
          if (edgeSide === 0) { sx = -60; sz = (Math.random() - 0.5) * 60; }
          else if (edgeSide === 1) { sx = 60; sz = (Math.random() - 0.5) * 60; }
          else if (edgeSide === 2) { sx = (Math.random() - 0.5) * 60; sz = -60; }
          else { sx = (Math.random() - 0.5) * 60; sz = 60; }
          sg.position.set(sx, 3.2, sz);
          sg.userData = {
            state: 'arriving',          // arriving | hunting | charging | leaving
            stateTimer: 0,
            attacksRemaining: 2 + Math.floor(Math.random() * 2),
            aggroRange: 13,
            speed: 5.5,
            cooldownUntil: 0,
            spawnedAt: Date.now(),
          };
          scene.add(sg);
          shark = sg;
          clAnnounce('Reef shark approaching');
        }

        // ─── Dens (4 rock arches scattered as safe-hide points) ───
        // Inside a den (within DEN_RADIUS): health regens, both predators
        // lose interest and break attack. Dens are visible reef landmarks
        // so the player learns where to retreat to.
        var DEN_RADIUS = 2.0;
        var DEN_POSITIONS = [
          { x: -28, z: 5 },
          { x: 32, z: -18 },
          { x: 8, z: -35 },
          { x: -20, z: -28 },
        ];
        var dens = [];
        DEN_POSITIONS.forEach(function(pos) {
          var den = new THREE.Group();
          // Arch: two pillars + a lintel
          var pmat = new THREE.MeshStandardMaterial({ color: 0x3d342a, roughness: 0.9 });
          var p1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.4, 0.7), pmat);
          p1.position.set(-0.9, 0.7, 0);
          den.add(p1);
          var p2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.4, 0.7), pmat);
          p2.position.set(0.9, 0.7, 0);
          den.add(p2);
          var lintel = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.4, 0.7), pmat);
          lintel.position.set(0, 1.6, 0);
          den.add(lintel);
          // Interior shadow patch (so the den looks like a hideable cavity)
          var shadow = new THREE.Mesh(
            new THREE.PlaneGeometry(2.0, 1.5),
            new THREE.MeshBasicMaterial({ color: 0x080608, transparent: true, opacity: 0.85 })
          );
          shadow.position.set(0, 0.75, 0.01);
          den.add(shadow);
          // Den-glow ring (subtle indicator on the ground when octopus is nearby)
          var denGlow = new THREE.Mesh(
            new THREE.RingGeometry(DEN_RADIUS - 0.3, DEN_RADIUS, 24),
            new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0, side: THREE.DoubleSide })
          );
          denGlow.position.set(0, 0.06, 0);
          denGlow.rotation.x = -Math.PI / 2;
          den.add(denGlow);
          den.position.set(pos.x, 0, pos.z);
          den.rotation.y = Math.random() * Math.PI;
          scene.add(den);
          dens.push({ group: den, x: pos.x, z: pos.z, glow: denGlow });
        });

        // ─── Clams (half-buried, drill mechanic) ───
        // Hold E within DRILL_RANGE for DRILL_DURATION seconds to drill open.
        // Cancellable: if octopus moves away or takes damage, drill resets.
        // Pays out big calorie reward (large hunger refill + score boost).
        var DRILL_RANGE = 1.2;
        var DRILL_DURATION = 1.8;   // seconds
        var clams = [];
        var CLAM_POSITIONS = [
          { x: -10, z: 8 }, { x: 18, z: -5 }, { x: -22, z: -10 },
          { x: 6, z: 22 }, { x: -5, z: -18 }, { x: 35, z: 15 },
          { x: 12, z: 28 }, { x: -38, z: 18 }
        ];
        CLAM_POSITIONS.forEach(function(pos) {
          var clam = new THREE.Group();
          // Lower shell (half-buried)
          var lowerGeo = new THREE.SphereGeometry(0.4, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
          var clamMat = new THREE.MeshStandardMaterial({ color: 0xe6dcc6, roughness: 0.5 });
          var lower = new THREE.Mesh(lowerGeo, clamMat);
          lower.rotation.x = Math.PI;
          lower.position.y = 0;
          clam.add(lower);
          // Upper shell (slightly open at top)
          var upperGeo = new THREE.SphereGeometry(0.4, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
          var upper = new THREE.Mesh(upperGeo, clamMat);
          upper.position.y = 0.05;
          clam.add(upper);
          // Ridges (small lines)
          for (var crg = 0; crg < 3; crg++) {
            var ridgeGeo = new THREE.TorusGeometry(0.3 - crg * 0.08, 0.02, 4, 12, Math.PI);
            var ridge = new THREE.Mesh(ridgeGeo, new THREE.MeshStandardMaterial({ color: 0xc4b89c }));
            ridge.position.y = 0.02 + crg * 0.06;
            ridge.rotation.x = Math.PI / 2;
            clam.add(ridge);
          }
          clam.position.set(pos.x, 0.1, pos.z);
          clam.userData = {
            alive: true,
            drillProgress: 0,
          };
          scene.add(clam);
          clams.push(clam);
        });

        // ─── Fish schools (2 schools of 8 silversides) ───
        // Each school has a moving center; fish target school center +
        // small random offset (flocking-lite). Catchable via jet-pounce
        // within FISH_CATCH_RANGE. Schools regenerate from far edge.
        var FISH_CATCH_RANGE = 2.2;
        var fishSchools = [];
        function spawnSchool() {
          var school = {
            center: new THREE.Vector3(
              (Math.random() - 0.5) * 100,
              4 + Math.random() * 2,   // mid-water
              (Math.random() - 0.5) * 100
            ),
            heading: Math.random() * Math.PI * 2,
            fish: [],
            wanderTimer: 0,
          };
          for (var fi = 0; fi < 8; fi++) {
            var fishGeo = new THREE.ConeGeometry(0.08, 0.32, 5);
            var fishMat = new THREE.MeshStandardMaterial({ color: 0xc8d8e8, roughness: 0.3, metalness: 0.4 });
            var fishMesh = new THREE.Mesh(fishGeo, fishMat);
            fishMesh.rotation.z = -Math.PI / 2;  // point forward
            var fish = new THREE.Group();
            fish.add(fishMesh);
            fish.userData = {
              offset: new THREE.Vector3(
                (Math.random() - 0.5) * 2.5,
                (Math.random() - 0.5) * 1.2,
                (Math.random() - 0.5) * 2.5
              ),
              alive: true,
            };
            fish.position.copy(school.center).add(fish.userData.offset);
            scene.add(fish);
            school.fish.push(fish);
          }
          fishSchools.push(school);
        }
        spawnSchool();
        spawnSchool();

        // ─── Bubble particles (rising from seafloor) ───
        var BUBBLE_COUNT = 50;
        var bubbleGeo = new THREE.BufferGeometry();
        var bubblePositions = new Float32Array(BUBBLE_COUNT * 3);
        var bubbleVelocities = new Float32Array(BUBBLE_COUNT);
        for (var bb = 0; bb < BUBBLE_COUNT; bb++) {
          bubblePositions[bb * 3] = (Math.random() - 0.5) * 100;
          bubblePositions[bb * 3 + 1] = Math.random() * 10;
          bubblePositions[bb * 3 + 2] = (Math.random() - 0.5) * 100;
          bubbleVelocities[bb] = 0.3 + Math.random() * 0.4;
        }
        bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bubblePositions, 3));
        var bubbleMat = new THREE.PointsMaterial({
          color: 0xddeefa, size: 0.18, transparent: true, opacity: 0.65,
          sizeAttenuation: true,
        });
        var bubbles = new THREE.Points(bubbleGeo, bubbleMat);
        scene.add(bubbles);

        // ─── Surface light rays (vertical god-rays from above) ───
        var lightRays = [];
        for (var lr = 0; lr < 6; lr++) {
          var rayGeo = new THREE.PlaneGeometry(1 + Math.random() * 1.5, 16);
          var rayMat = new THREE.MeshBasicMaterial({
            color: 0xbfe6ff, transparent: true, opacity: 0.08,
            blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
          });
          var ray = new THREE.Mesh(rayGeo, rayMat);
          ray.position.set(
            (Math.random() - 0.5) * 80,
            8,
            (Math.random() - 0.5) * 80
          );
          ray.rotation.y = Math.random() * Math.PI;
          scene.add(ray);
          lightRays.push({ mesh: ray, basePhase: Math.random() * Math.PI * 2 });
        }

        // ─── Substrate detection helper ───
        // Reference RGB for each substrate kind. Used by the camouflage
        // system to decide what color the octopus skin lerps toward.
        var SUBSTRATE_COLORS = {
          sand:        { r: 0.79, g: 0.63, b: 0.42 },
          rock:        { r: 0.31, g: 0.25, b: 0.19 },
          grass:       { r: 0.16, g: 0.55, b: 0.29 },
          'coral_red':    { r: 0.79, g: 0.30, b: 0.43 },
          'coral_orange': { r: 1.00, g: 0.42, b: 0.21 },
          'coral_yellow': { r: 0.83, g: 0.69, b: 0.22 },
          'coral_pink':   { r: 0.72, g: 0.27, b: 0.51 },
          'coral_purple': { r: 0.56, g: 0.33, b: 0.45 },
        };
        // Pre-compute coral hex → reference color name mapping
        var CORAL_HEX_TO_NAME = {
          0xc94e6d: 'coral_pink',
          0xff6b35: 'coral_orange',
          0xd4af37: 'coral_yellow',
          0x8e5572: 'coral_purple',
          0xb8345c: 'coral_red',
        };
        // Iterate nearby substrate-tagged meshes; pick the closest hit. Falls
        // back to sand when nothing is in range. Returns { substrate, color }.
        function detectSubstrate(pos) {
          var nearest = null;
          var nearestD = 1e9;
          // Walk rocks + corals + grass arrays for efficiency
          for (var i = 0; i < rocks.length; i++) {
            var dx = rocks[i].position.x - pos.x;
            var dz = rocks[i].position.z - pos.z;
            var d2 = dx * dx + dz * dz;
            var rad = rocks[i].userData.substrateRadius || 1;
            if (d2 < rad * rad && d2 < nearestD) { nearestD = d2; nearest = rocks[i]; }
          }
          for (var j = 0; j < corals.length; j++) {
            var ddx = corals[j].position.x - pos.x;
            var ddz = corals[j].position.z - pos.z;
            var dd2 = ddx * ddx + ddz * ddz;
            var rrad = corals[j].userData.substrateRadius || 1;
            if (dd2 < rrad * rrad && dd2 < nearestD) { nearestD = dd2; nearest = corals[j]; }
          }
          // Grass: clusters of grass within 1.5u count as a grass substrate
          var grassCount = 0;
          for (var k = 0; k < grass.length; k++) {
            var gdx = grass[k].mesh.position.x - pos.x;
            var gdz = grass[k].mesh.position.z - pos.z;
            if (gdx * gdx + gdz * gdz < 1.5 * 1.5) grassCount++;
            if (grassCount >= 3) break;
          }
          if (grassCount >= 3 && (!nearest || nearestD > 1)) {
            return { substrate: 'grass', color: SUBSTRATE_COLORS.grass };
          }
          if (!nearest) return { substrate: 'sand', color: SUBSTRATE_COLORS.sand };
          if (nearest.userData.substrate === 'coral') {
            var key = CORAL_HEX_TO_NAME[nearest.userData.coralHex] || 'coral_red';
            return { substrate: key, color: SUBSTRATE_COLORS[key] };
          }
          return { substrate: nearest.userData.substrate, color: SUBSTRATE_COLORS[nearest.userData.substrate] || SUBSTRATE_COLORS.sand };
        }

        // ─── Input state ───
        var keys = {};
        var clickRequested = false;
        var inkRequested = false;
        function onKeyDown(e) {
          keys[e.code] = true;
          if (['Space','KeyW','KeyA','KeyS','KeyD','KeyE','KeyI','KeyM','KeyG'].indexOf(e.code) !== -1) e.preventDefault();
          if (e.code === 'KeyI') inkRequested = true;
          if (e.code === 'KeyE') clickRequested = true;
        }
        function onKeyUp(e) { keys[e.code] = false; }
        function onClick() { clickRequested = true; }
        canvasEl.addEventListener('keydown', onKeyDown);
        canvasEl.addEventListener('keyup', onKeyUp);
        canvasEl.addEventListener('mousedown', function() { canvasEl.focus(); });
        canvasEl.addEventListener('click', onClick);
        canvasEl.focus();

        // ─── HUD overlay (DOM, positioned over canvas) ───
        var hud = document.createElement('div');
        hud.style.cssText = 'position:absolute;top:10px;left:10px;color:#fff;font-family:ui-monospace,Menlo,monospace;font-size:12px;background:rgba(10,20,40,0.78);padding:10px 14px;border-radius:8px;pointer-events:none;line-height:1.6;min-width:200px;';
        canvasEl.parentElement.appendChild(hud);

        var tutorial = document.createElement('div');
        tutorial.style.cssText = 'position:absolute;bottom:14px;left:50%;transform:translateX(-50%);color:#fff;font-family:ui-monospace,Menlo,monospace;font-size:12px;background:rgba(10,20,40,0.78);padding:8px 16px;border-radius:8px;pointer-events:none;text-align:center;max-width:90%;';
        tutorial.textContent = 'WASD crawl · SPACE jet · CLICK pounce · HOLD E drill clam · I ink (3 charges) · G grab/drop coconut · stay still to camouflage';
        canvasEl.parentElement.appendChild(tutorial);
        setTimeout(function() { if (tutorial.parentElement) tutorial.parentElement.removeChild(tutorial); }, 12000);

        var damageFlash = document.createElement('div');
        damageFlash.style.cssText = 'position:absolute;inset:0;background:radial-gradient(circle at center, rgba(220,38,38,0) 30%, rgba(220,38,38,0.6) 100%);opacity:0;pointer-events:none;transition:opacity 0.2s;';
        canvasEl.parentElement.appendChild(damageFlash);

        // End-of-run stats overlay (hidden until gameOver flips true)
        var statsOverlay = document.createElement('div');
        statsOverlay.style.cssText = 'position:absolute;inset:0;background:rgba(5,12,24,0.92);display:none;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:Inter,system-ui,sans-serif;padding:24px;text-align:center;backdrop-filter:blur(4px);';
        canvasEl.parentElement.appendChild(statsOverlay);
        function renderStatsOverlay() {
          var rs = gameState.runStats;
          var elapsedSec = Math.floor((Date.now() - gameState.startTime) / 1000);
          var maxStillSec = (rs.maxStationaryMs / 1000).toFixed(1);
          var maxCamoPct = (rs.maxCamoEff * 100).toFixed(0);
          var maxSqueezeSec = (rs.longestSqueezeMs / 1000).toFixed(1);
          var mimicSec = (rs.mimicTimeMs / 1000).toFixed(1);
          // Compute a verdict tier
          var tier = 'Forager';
          var tierColor = '#94a3b8';
          if (gameState.score >= 25) { tier = 'Apex Cephalopod'; tierColor = '#a78bfa'; }
          else if (gameState.score >= 15) { tier = 'Reef Master'; tierColor = '#22d3ee'; }
          else if (gameState.score >= 8) { tier = 'Capable Hunter'; tierColor = '#86efac'; }
          else if (gameState.score >= 3) { tier = 'Surviving'; tierColor = '#fbbf24'; }
          // Build the stats cards
          function statCard(label, value, color) {
            return '<div style="background:rgba(15,23,42,0.7);padding:10px 14px;border-radius:8px;border-left:3px solid ' + (color || '#a78bfa') + ';min-width:120px"><div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px">' + label + '</div><div style="font-size:20px;font-weight:900;font-family:ui-monospace,Menlo,monospace;color:' + (color || '#fff') + '">' + value + '</div></div>';
          }
          var speciesEmoji = species.emoji;
          statsOverlay.innerHTML =
            '<div style="font-size:42px;line-height:1;margin-bottom:6px">💀</div>' +
            '<div style="font-size:22px;font-weight:900;color:#fca5a5;margin-bottom:2px">End of dive</div>' +
            '<div style="font-size:11px;color:#94a3b8;margin-bottom:14px">' + speciesEmoji + ' ' + species.name + ' · ' + elapsedSec + 's survived</div>' +
            '<div style="font-size:13px;font-weight:800;color:' + tierColor + ';letter-spacing:0.05em;text-transform:uppercase;margin-bottom:14px;padding:6px 14px;background:rgba(15,23,42,0.7);border-radius:20px">' + tier + '</div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(120px, 1fr));gap:8px;width:100%;max-width:560px;margin-bottom:10px">' +
              statCard('Crabs', rs.crabs, '#86efac') +
              statCard('Fish', rs.fish, '#60a5fa') +
              statCard('Clams', rs.clams, '#fbbf24') +
              statCard('Score', gameState.score, '#a78bfa') +
            '</div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:8px;width:100%;max-width:560px;margin-bottom:14px">' +
              statCard('Max camo', maxCamoPct + '%', '#22d3ee') +
              statCard('Longest still', maxStillSec + 's', '#22d3ee') +
              statCard('Longest squeeze', maxSqueezeSec + 's', '#fbbf24') +
              statCard('Dens used', rs.densVisited, '#22c55e') +
              statCard('Ink uses', rs.inkUsed, '#a78bfa') +
              statCard('Bites taken', rs.bites, '#fca5a5') +
              (species.specialAbility === 'venomousBite' ? statCard('Venom bites', rs.venomBitesDelivered, '#22d3ee') : '') +
              (species.specialAbility === 'mimicry' ? statCard('Mimic time', mimicSec + 's', '#fbbf24') : '') +
            '</div>' +
            '<div style="font-size:11px;color:#94a3b8;font-style:italic;max-width:520px;line-height:1.5">Click "End run + surface" below to return to the species picker for another dive.</div>';
          statsOverlay.style.display = 'flex';
        }

        // ─── Game state ───
        // Initial mantle RGB matches species bodyColor so the camo lerp
        // starts from the species's resting tint, not the default rust.
        var initRGB = new THREE.Color(species.bodyColor);
        var gameState = {
          species: species,
          health: species.maxHealth, maxHealth: species.maxHealth,
          stamina: 100, maxStamina: 100,
          hunger: species.maxHunger, maxHunger: species.maxHunger,
          score: 0,
          startTime: Date.now(),
          facingAngle: 0,
          inkCloudsActive: [],
          isInked: false,
          inkUntil: 0,
          // Finite ink reserve — real octopuses carry 3-5 ink doses + need
          // refractory time between releases. We model both: 3 charges per
          // run + 8s cooldown after each release.
          inkReserves: 3,
          inkMaxReserves: 3,
          inkCooldownUntil: 0,
          inkCooldownMs: 8000,
          gameOver: false,
          tookHitAt: 0,
          // Camouflage state — current skin RGB lerps toward substrate target.
          // camoEff is 0..1 effectiveness (used to scale predator detection).
          camoCurrent: { r: initRGB.r, g: initRGB.g, b: initRGB.b },
          camoEff: 0,
          stationaryTime: 0,
          currentSubstrate: 'sand',
          // Drill mechanic on clams (hold E within 1.2u to consume).
          drillingClam: null,
          drillProgress: 0,
          // Den state — inside DEN_RADIUS of any den
          inDen: false,
          nearestDenIdx: -1,
          previousInDen: false,    // for per-run stats den-entry counter
          // Day/night cycle: 0..1 along a ~3-minute period. 0.0 = noon,
          // 0.5 = midnight. Cycle is paused if needed for testing.
          dayTime: 0.0,
          dayPeriodMs: 180000,
          lastInputAt: Date.now(),
          // Species-ability state
          warningRingOpacity: 0,        // blue-ringed aposematic flash
          venomBiteCooldown: 0,         // ms remaining
          isMimicking: false,           // mimic-octopus M-hold
          mimicSpikeOpacity: 0,
          // Squeeze detection (between rocks)
          isSqueezing: false,
          // Per-run scoring breakdown (shown on death)
          runStats: {
            crabs: 0, fish: 0, clams: 0,
            densVisited: 0,
            inkUsed: 0,
            bites: 0,
            venomBitesDelivered: 0,
            mimicTimeMs: 0,
            maxCamoEff: 0,
            maxStationaryMs: 0,
            longestSqueezeMs: 0,
            currentSqueezeStart: 0,
          },
        };

        var clock = new THREE.Clock();
        var animId;
        var lastTime = performance.now();

        function loop() {
          var dt = Math.min(0.05, clock.getDelta());
          var now = Date.now();

          if (!gameState.gameOver) {
            // ─── Input → movement ───
            var moveFwd = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
            var turn = (keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0);
            var isJetting = !!keys.Space && gameState.stamina > 0 && moveFwd > 0;
            var isMoving = moveFwd !== 0 || turn !== 0;
            if (isMoving) gameState.lastInputAt = now;

            gameState.facingAngle += turn * 2.0 * dt;

            // Carrying a coconut imposes a 10% speed penalty (real biology:
            // coconut octopuses 'stilt-walk' awkwardly when carrying shells).
            var carryPenalty = carriedCoconut ? 0.9 : 1.0;
            var moveSpeed = (isJetting ? 8.5 : 2.6) * species.jetSpeedMul * carryPenalty;
            var moveDir = new THREE.Vector3(Math.sin(gameState.facingAngle), 0, Math.cos(gameState.facingAngle));
            octopus.position.x += moveDir.x * moveFwd * moveSpeed * dt;
            octopus.position.z += moveDir.z * moveFwd * moveSpeed * dt;
            // No hard map clamp — world is procedurally recycled around the
            // player below, so wandering forever is supported. (Tracking
            // furthest distance from origin for fun stats.)
            octopus.position.y = 0.55 + (isJetting ? 0.15 : 0) + Math.sin(now * 0.004) * 0.05;
            octopus.rotation.y = gameState.facingAngle;

            // Stamina drain (jet) / regen (idle)
            if (isJetting) {
              gameState.stamina = Math.max(0, gameState.stamina - 45 * dt);
            } else {
              gameState.stamina = Math.min(gameState.maxStamina, gameState.stamina + 18 * dt);
            }

            // ─── Day/night cycle ─────────────────────────────────
            // Advance dayTime; 0 = noon, 0.5 = midnight, 1.0 = noon again.
            // Lighting and fog tint shift smoothly across the cycle. Sun
            // intensity also flexes so the seafloor really does darken at
            // night, and the fog far-distance shrinks to feel constrained.
            gameState.dayTime = ((gameState.dayTime + dt * 1000 / gameState.dayPeriodMs) % 1);
            var dayPhase = Math.cos(gameState.dayTime * Math.PI * 2); // 1=noon, -1=midnight
            var dayMix = (dayPhase + 1) / 2;                            // 0 night, 1 day
            // Mix between day (0a4a6b) and night (030d1a) fog/bg
            var bgR = 0x03 / 255 + (0x0e - 0x03) / 255 * dayMix;
            var bgG = 0x0d / 255 + (0x3d - 0x0d) / 255 * dayMix;
            var bgB = 0x1a / 255 + (0x5c - 0x1a) / 255 * dayMix;
            scene.background.setRGB(bgR, bgG, bgB);
            scene.fog.color.setRGB(bgR + 0.05, bgG + 0.07, bgB + 0.09);
            scene.fog.far = 35 + dayMix * 35;
            sun.intensity = 0.25 + dayMix * 0.7;
            ambient.intensity = 0.35 + dayMix * 0.35;

            // ─── Hunger drain + starvation damage ────────────────
            // Hunger drains slowly while alive; auto-damage kicks in once
            // it hits zero. Eating crabs/clams/fish refills it in their
            // respective hunt blocks below.
            gameState.hunger = Math.max(0, gameState.hunger - 1.6 * dt);
            if (gameState.hunger <= 0) {
              gameState.health = Math.max(0, gameState.health - 5 * dt);
            }

            // ─── Camouflage system (continuous, integrated) ──────
            // Sample substrate under the octopus + smoothly lerp the mantle
            // color toward that substrate's reference color. Camo effective-
            // ness scales with how close the match is and how long we've
            // been stationary. Movement (especially jetting) sets the
            // stationaryTime back, so you genuinely have to settle in.
            var substrateBelow = detectSubstrate(octopus.position);
            gameState.currentSubstrate = substrateBelow.substrate;
            var target = substrateBelow.color;
            // Color lerp speed: faster lerp when stationary, slower while moving
            var colorLerpRate = isMoving ? 0.5 * dt : 1.4 * dt;
            if (isJetting) colorLerpRate = 0.15 * dt;
            gameState.camoCurrent.r += (target.r - gameState.camoCurrent.r) * colorLerpRate;
            gameState.camoCurrent.g += (target.g - gameState.camoCurrent.g) * colorLerpRate;
            gameState.camoCurrent.b += (target.b - gameState.camoCurrent.b) * colorLerpRate;
            mantleMat.color.setRGB(gameState.camoCurrent.r, gameState.camoCurrent.g, gameState.camoCurrent.b);
            // Arms slightly darker than mantle for natural shading
            arms.forEach(function(arm) {
              arm.mesh.material.color.setRGB(
                gameState.camoCurrent.r * 0.78,
                gameState.camoCurrent.g * 0.78,
                gameState.camoCurrent.b * 0.78
              );
            });
            // Compute camo effectiveness: color match × stationary time bonus
            var dR = gameState.camoCurrent.r - target.r;
            var dG = gameState.camoCurrent.g - target.g;
            var dB = gameState.camoCurrent.b - target.b;
            var colorDelta = Math.sqrt(dR * dR + dG * dG + dB * dB);
            var matchScore = Math.max(0, 1 - colorDelta * 2.5);
            gameState.stationaryTime = isMoving ? 0 : Math.min(3, gameState.stationaryTime + dt);
            var stillnessBonus = Math.min(1, gameState.stationaryTime / 2.0);
            gameState.camoEff = matchScore * stillnessBonus * species.camoQualityMul;
            // Carrying a coconut adds a flat +30% camo (shell partly obscures
            // the body; predators have a harder time visually parsing the
            // octopus shape). Capped at 1.0.
            if (carriedCoconut) gameState.camoEff = Math.min(1, gameState.camoEff + 0.30);
            // Update run-stats max-camo
            if (gameState.camoEff > gameState.runStats.maxCamoEff) gameState.runStats.maxCamoEff = gameState.camoEff;
            if (gameState.stationaryTime * 1000 > gameState.runStats.maxStationaryMs) gameState.runStats.maxStationaryMs = gameState.stationaryTime * 1000;

            // ─── Papillae texture (mantle vertex displacement) ──
            // Real octopuses have skin bumps (papillae) that pop up to match
            // textured substrates. As camoEff climbs, we displace mantle
            // vertices outward by a noise function — the body actually
            // ripples to mimic rock or coral. Subtle but very alive.
            (function() {
              var papillaeStrength = gameState.camoEff * 0.18;
              if (papillaeStrength < 0.005) {
                // Snap back to base when no camo
                mantleGeo.attributes.position.array.set(mantleBasePositions);
                mantleGeo.attributes.position.needsUpdate = true;
                mantleGeo.computeVertexNormals();
                return;
              }
              var posArr = mantleGeo.attributes.position.array;
              var nowPhase = now * 0.002;
              for (var pvi = 0; pvi < posArr.length; pvi += 3) {
                var bx = mantleBasePositions[pvi];
                var by = mantleBasePositions[pvi + 1];
                var bz = mantleBasePositions[pvi + 2];
                var len = Math.sqrt(bx * bx + by * by + bz * bz);
                if (len < 0.001) continue;
                var bumpPhase = bx * 7.3 + by * 9.1 + bz * 8.7;
                var bump = Math.sin(bumpPhase + nowPhase) * papillaeStrength;
                posArr[pvi] = bx + (bx / len) * bump;
                posArr[pvi + 1] = by + (by / len) * bump;
                posArr[pvi + 2] = bz + (bz / len) * bump;
              }
              mantleGeo.attributes.position.needsUpdate = true;
              mantleGeo.computeVertexNormals();
            })();

            // ─── Squeeze-through-gap detection ───────────────────
            // If the octopus is pinched between 2+ rocks within 2.5u, lerp
            // arm scale.x down so the arms appear to fold inward — the real
            // anatomical capability that lets octopuses squeeze through gaps
            // smaller than their mantle. Updates runStats.longestSqueezeMs.
            (function() {
              var rocksNear = 0;
              for (var rni = 0; rni < rocks.length && rocksNear < 2; rni++) {
                var rdx2 = rocks[rni].position.x - octopus.position.x;
                var rdz2 = rocks[rni].position.z - octopus.position.z;
                if (rdx2 * rdx2 + rdz2 * rdz2 < 2.5 * 2.5) rocksNear++;
              }
              var wasSqueezing = gameState.isSqueezing;
              gameState.isSqueezing = rocksNear >= 2;
              if (gameState.isSqueezing && !wasSqueezing) {
                gameState.runStats.currentSqueezeStart = now;
              } else if (!gameState.isSqueezing && wasSqueezing) {
                var sqDur = now - gameState.runStats.currentSqueezeStart;
                if (sqDur > gameState.runStats.longestSqueezeMs) gameState.runStats.longestSqueezeMs = sqDur;
              }
              var compressTarget = gameState.isSqueezing ? 0.55 : 1.0;
              arms.forEach(function(arm) {
                arm.compressTarget = compressTarget;
                arm.compressCurrent += (arm.compressTarget - arm.compressCurrent) * 4 * dt;
                arm.mesh.scale.x = arm.compressCurrent;
                arm.mesh.scale.z = arm.compressCurrent;
                // Also tuck arms inward radially when squeezing
                var tuck = 1 - (1 - arm.compressCurrent) * 0.4;
                arm.mesh.position.x = arm.basePosX * tuck;
                arm.mesh.position.z = arm.basePosZ * tuck;
              });
            })();

            // ─── Coconut tool use (G to grab/drop) ───────────────
            // Edge-triggered G (only fires once per press). Carry one
            // coconut at a time. Carried coconut follows the octopus on
            // arm 0. Drop creates a static "rest spot" that acts like a
            // mini-den (predators give up within COCONUT_DEN_RADIUS).
            // Aged-out coconuts disappear after COCONUT_LIFE_MS.
            var gKeyNow = !!keys.KeyG;
            if (gKeyNow && !gKeyDownPrev) {
              if (carriedCoconut) {
                // Drop: leave coconut at current position, mark as dropped
                octopus.remove(carriedCoconut);
                scene.add(carriedCoconut);
                carriedCoconut.position.set(octopus.position.x, 0.32, octopus.position.z);
                carriedCoconut.rotation.set(0, 0, 0);
                carriedCoconut.userData.state = 'dropped';
                carriedCoconut.userData.createdAt = now;
                clAnnounce('Coconut placed — temporary den');
                carriedCoconut = null;
              } else {
                // Pickup: nearest free coconut within range
                var bestC = null, bestCd = COCONUT_PICKUP_RANGE;
                for (var coi = 0; coi < coconuts.length; coi++) {
                  if (coconuts[coi].userData.state !== 'free') continue;
                  var cdx = coconuts[coi].position.x - octopus.position.x;
                  var cdz = coconuts[coi].position.z - octopus.position.z;
                  var cd = Math.sqrt(cdx * cdx + cdz * cdz);
                  if (cd < bestCd) { bestC = coconuts[coi]; bestCd = cd; }
                }
                if (bestC) {
                  scene.remove(bestC);
                  // Attach to arm 0 (front-right)
                  octopus.add(bestC);
                  // Position relative to octopus body — slightly in front + below
                  bestC.position.set(0.0, -0.1, 0.6);
                  bestC.userData.state = 'carried';
                  carriedCoconut = bestC;
                  clAnnounce('Coconut picked up');
                }
              }
            }
            gKeyDownPrev = gKeyNow;
            // While carrying: gentle wobble + camo boost; speed already
            // handled by checking carriedCoconut for the move-speed mod.
            if (carriedCoconut) {
              carriedCoconut.userData.wobble += dt * 2;
              carriedCoconut.rotation.z = Math.sin(carriedCoconut.userData.wobble) * 0.12;
            }
            // Age dropped coconuts; remove when expired
            for (var ai2 = coconuts.length - 1; ai2 >= 0; ai2--) {
              var coc2 = coconuts[ai2];
              if (coc2.userData.state === 'dropped' && now - coc2.userData.createdAt > COCONUT_LIFE_MS) {
                scene.remove(coc2);
                coc2.traverse(function(o) {
                  if (o.geometry) o.geometry.dispose();
                  if (o.material) { if (Array.isArray(o.material)) o.material.forEach(function(m){m.dispose();}); else o.material.dispose(); }
                });
                coconuts.splice(ai2, 1);
              }
            }
            // Check if octopus is near a dropped coconut → acts as mini-den
            var nearDroppedCoconut = false;
            for (var coc3i = 0; coc3i < coconuts.length; coc3i++) {
              if (coconuts[coc3i].userData.state !== 'dropped') continue;
              var ccdx = coconuts[coc3i].position.x - octopus.position.x;
              var ccdz = coconuts[coc3i].position.z - octopus.position.z;
              if (ccdx * ccdx + ccdz * ccdz < COCONUT_DEN_RADIUS * COCONUT_DEN_RADIUS) {
                nearDroppedCoconut = true;
                break;
              }
            }
            // Dropped coconuts count as dens for the predator-block logic too
            if (nearDroppedCoconut && !gameState.inDen) {
              gameState.inDen = true;  // treat as a den temporarily this frame
              gameState.health = Math.min(gameState.maxHealth, gameState.health + 8 * dt);
            }

            // ─── Mimic-octopus impersonation (hold M) ───────────
            // Costs stamina while held. Visually fades in red spike-tendrils
            // that halo the body like a venomous lionfish. Grouper + shark
            // detection range halves while active.
            if (species.specialAbility === 'mimicry') {
              var holdMimic = !!keys.KeyM && gameState.stamina > 0;
              gameState.isMimicking = holdMimic;
              if (holdMimic) {
                gameState.stamina = Math.max(0, gameState.stamina - 28 * dt);
                gameState.mimicSpikeOpacity = Math.min(0.95, gameState.mimicSpikeOpacity + 4 * dt);
                gameState.runStats.mimicTimeMs += dt * 1000;
              } else {
                gameState.mimicSpikeOpacity = Math.max(0, gameState.mimicSpikeOpacity - 3 * dt);
              }
              mimicSpikes.forEach(function(s) { s.material.opacity = gameState.mimicSpikeOpacity; });
            }

            // ─── Blue-ringed warning rings + auto venom-bite ────
            // Rings fade in any time a predator is attacking within 4u.
            // When predator within 1.5u, deliver one venom-bite that drives
            // it off (35 dmg + immediate return-to-home + long cooldown).
            // Pure-reflex defense — pedagogically accurate for blue-ringed.
            if (species.specialAbility === 'venomousBite') {
              var threatNear = false;
              var threatRef = null;
              [moray, grouper, shark].forEach(function(p) {
                if (!p || !p.userData) return;
                if (p.userData.state !== 'attacking' && p.userData.state !== 'charging') return;
                var pdx = p.position.x - octopus.position.x;
                var pdz = p.position.z - octopus.position.z;
                var pd = Math.sqrt(pdx * pdx + pdz * pdz);
                if (pd < 4) {
                  threatNear = true;
                  if (pd < 1.5 && !threatRef) threatRef = p;
                }
              });
              gameState.warningRingOpacity += ((threatNear ? 0.85 : 0) - gameState.warningRingOpacity) * 6 * dt;
              warningRings.forEach(function(r) {
                r.material.opacity = gameState.warningRingOpacity;
              });
              if (threatRef && gameState.venomBiteCooldown <= 0) {
                // Set the right "give-up" state per predator (their state
                // machines aren't shared). All respect cooldownUntil.
                if (threatRef === shark) {
                  threatRef.userData.state = 'leaving';
                } else if (threatRef === grouper) {
                  threatRef.userData.state = 'patrol';
                } else {
                  threatRef.userData.state = 'returning';  // moray
                }
                threatRef.userData.stateTimer = 0;
                threatRef.userData.cooldownUntil = now + 8000;
                gameState.venomBiteCooldown = 6000;
                gameState.runStats.venomBitesDelivered++;
                clAnnounce('Venom bite drove off ' + (threatRef === moray ? 'the moray' : threatRef === grouper ? 'the grouper' : 'the shark'));
              }
              if (gameState.venomBiteCooldown > 0) gameState.venomBiteCooldown = Math.max(0, gameState.venomBiteCooldown - dt * 1000);
            }

            // ─── Reef shark spawn timer + AI ────────────────────
            // Spawns periodically during a run; arrives from a map edge,
            // makes attempts, then leaves. Camo helps only 30% (vs 70% for
            // other predators) because sharks use electroreception in
            // addition to vision. Ink half-blocks (vs full-block for others).
            if (!shark && now > nextSharkSpawnAt && !gameState.gameOver) {
              spawnShark();
              nextSharkSpawnAt = now + SHARK_SPAWN_INTERVAL_MS_MIN + Math.random() * (SHARK_SPAWN_INTERVAL_MS_MAX - SHARK_SPAWN_INTERVAL_MS_MIN);
            }
            if (shark) {
              var sk = shark.userData;
              var sdx = octopus.position.x - shark.position.x;
              var sdz = octopus.position.z - shark.position.z;
              var skDist = Math.sqrt(sdx * sdx + sdz * sdz);
              // Camo helps 30% (vs 70%); ink half-blocks
              var skCamo = 1 - 0.3 * gameState.camoEff;
              var skInkBlock = gameState.isInked ? 0.5 : 1.0;
              // Mimic further halves shark's perceived range
              var skMimicBlock = gameState.isMimicking ? 0.5 : 1.0;
              var skEffectiveRange = sk.aggroRange * skCamo * skInkBlock * skMimicBlock;
              if (sk.state === 'arriving') {
                // Cruise toward center until close enough to hunt
                shark.position.x += (-shark.position.x * 0.02);
                shark.position.z += (-shark.position.z * 0.02);
                shark.rotation.y = Math.atan2(-shark.position.x, -shark.position.z);
                shark.position.y = 3 + Math.sin(now * 0.0015) * 0.3;
                if (Math.abs(shark.position.x) < 40 && Math.abs(shark.position.z) < 40) {
                  sk.state = 'hunting';
                }
              } else if (sk.state === 'hunting') {
                // Patrol slowly until lock-on
                shark.position.x += Math.sin(now * 0.0008) * 0.5 * dt + sdx / Math.max(skDist, 0.1) * 1.2 * dt;
                shark.position.z += Math.cos(now * 0.0008) * 0.5 * dt + sdz / Math.max(skDist, 0.1) * 1.2 * dt;
                shark.position.y = 3 + Math.sin(now * 0.0015) * 0.3;
                shark.lookAt(octopus.position.x, shark.position.y, octopus.position.z);
                if (skDist < skEffectiveRange && !gameState.inDen && now > sk.cooldownUntil) {
                  sk.state = 'charging';
                  sk.stateTimer = 0;
                  clAnnounce('Shark charging');
                }
              } else if (sk.state === 'charging') {
                sk.stateTimer += dt;
                shark.position.x += (sdx / Math.max(skDist, 0.1)) * sk.speed * dt;
                shark.position.z += (sdz / Math.max(skDist, 0.1)) * sk.speed * dt;
                shark.position.y += (octopus.position.y + 1.5 - shark.position.y) * 2 * dt;
                shark.lookAt(octopus.position.x, shark.position.y, octopus.position.z);
                if (skDist < 1.8 && now - gameState.tookHitAt > 800) {
                  gameState.health = Math.max(0, gameState.health - 45);
                  gameState.tookHitAt = now;
                  damageFlash.style.opacity = '1';
                  setTimeout(function() { damageFlash.style.opacity = '0'; }, 220);
                  gameState.runStats.bites++;
                  sk.attacksRemaining--;
                  sk.state = sk.attacksRemaining > 0 ? 'hunting' : 'leaving';
                  sk.cooldownUntil = now + 4000;
                }
                if (gameState.inDen || sk.stateTimer > 4) {
                  sk.state = 'hunting';
                  sk.cooldownUntil = now + 4000;
                }
              } else if (sk.state === 'leaving') {
                // Cruise out to the same edge it came from
                var awayX = shark.position.x > 0 ? 1 : -1;
                shark.position.x += awayX * 3 * dt;
                shark.position.y = 4 + Math.sin(now * 0.001) * 0.3;
                shark.lookAt(shark.position.x + awayX * 10, shark.position.y, shark.position.z);
                if (Math.abs(shark.position.x) > 65) {
                  scene.remove(shark);
                  shark.traverse(function(o) {
                    if (o.geometry) o.geometry.dispose();
                    if (o.material) { if (Array.isArray(o.material)) o.material.forEach(function(m){m.dispose();}); else o.material.dispose(); }
                  });
                  shark = null;
                }
              }
            }

            // ─── Arm wiggle ───
            arms.forEach(function(arm) {
              var s = Math.sin(now * 0.005 + arm.phase);
              arm.mesh.rotation.x = arm.baseRotX + s * 0.18;
              arm.mesh.rotation.z = arm.baseRotZ + Math.cos(now * 0.004 + arm.phase) * 0.1;
            });

            // ─── Sea grass swaying ───
            grass.forEach(function(g) {
              g.mesh.rotation.z = Math.sin(now * 0.001 + g.phase) * 0.18;
            });

            // ─── Floor + caustics follow the player ───
            // Snap-tile the seafloor to track the octopus: floor.position is
            // updated each frame so the player is always near the center of
            // the plane. Caustics layer also rides along + adds a slow drift
            // for the shimmer effect. Combined with fog far ≈ 70, the visible
            // ocean wraps endlessly even though geometrically the floor is
            // a finite plane.
            floor.position.x = octopus.position.x;
            floor.position.z = octopus.position.z;
            // Slide the sand texture so it doesn't appear to teleport along
            // with the plane — the world should feel like it's moving past
            // the octopus, not the floor jumping under you.
            sandTex.offset.x = -octopus.position.x * 0.07;
            sandTex.offset.y = -octopus.position.z * 0.07;
            caustics.position.x = octopus.position.x + Math.sin(now * 0.0003) * 4;
            caustics.position.z = octopus.position.z + Math.cos(now * 0.00025) * 4;
            caustics.material.opacity = (0.4 + Math.sin(now * 0.001) * 0.15) * dayMix;

            // ─── Endless-ocean object recycling ──────────────────
            // Throttled to every 400ms (cheap enough on a per-frame budget
            // for hundreds of objects, but we don't need to be jitter-perfect).
            // For each tracked world object, if it's >RECYCLE_DIST from the
            // octopus, teleport it to a position SPAWN_RING_MIN..SPAWN_RING_MAX
            // units from the octopus in a random direction. The octopus can
            // wander forever and content keeps streaming in.
            if (!gameState._recycleNextAt || now > gameState._recycleNextAt) {
              gameState._recycleNextAt = now + 400;
              var RECYCLE_DIST = 120;
              var SPAWN_RING_MIN = 55;
              var SPAWN_RING_MAX = 95;
              function recyclePos(near) {
                var ang = Math.random() * Math.PI * 2;
                var rad = SPAWN_RING_MIN + Math.random() * (SPAWN_RING_MAX - SPAWN_RING_MIN);
                return { x: near.x + Math.sin(ang) * rad, z: near.z + Math.cos(ang) * rad };
              }
              // Rocks
              for (var rri = 0; rri < rocks.length; rri++) {
                var rrx = rocks[rri].position.x - octopus.position.x;
                var rrz = rocks[rri].position.z - octopus.position.z;
                if (rrx * rrx + rrz * rrz > RECYCLE_DIST * RECYCLE_DIST) {
                  var np = recyclePos(octopus.position);
                  rocks[rri].position.x = np.x;
                  rocks[rri].position.z = np.z;
                }
              }
              // Corals
              for (var crri = 0; crri < corals.length; crri++) {
                var crx = corals[crri].position.x - octopus.position.x;
                var crz = corals[crri].position.z - octopus.position.z;
                if (crx * crx + crz * crz > RECYCLE_DIST * RECYCLE_DIST) {
                  var nc = recyclePos(octopus.position);
                  corals[crri].position.x = nc.x;
                  corals[crri].position.z = nc.z;
                }
              }
              // Grass
              for (var gri = 0; gri < grass.length; gri++) {
                var grx = grass[gri].mesh.position.x - octopus.position.x;
                var grz = grass[gri].mesh.position.z - octopus.position.z;
                if (grx * grx + grz * grz > RECYCLE_DIST * RECYCLE_DIST) {
                  var ng = recyclePos(octopus.position);
                  grass[gri].mesh.position.x = ng.x;
                  grass[gri].mesh.position.z = ng.z;
                  grass[gri].mesh.rotation.y = Math.random() * Math.PI;
                }
              }
              // Crabs (alive ones that wandered far)
              for (var crci = 0; crci < crabs.length; crci++) {
                if (!crabs[crci].userData.alive) continue;
                var ccrx = crabs[crci].position.x - octopus.position.x;
                var ccrz = crabs[crci].position.z - octopus.position.z;
                if (ccrx * ccrx + ccrz * ccrz > RECYCLE_DIST * RECYCLE_DIST) {
                  var ncc = recyclePos(octopus.position);
                  crabs[crci].position.x = ncc.x;
                  crabs[crci].position.z = ncc.z;
                  crabs[crci].userData.wanderAngle = Math.random() * Math.PI * 2;
                }
              }
              // Clams (only "alive" clams get recycled — drilled ones stay gone
              // until a respawn timer adds new ones). If we have <4 alive clams,
              // spawn a new one ahead of the player.
              for (var cli = 0; cli < clams.length; cli++) {
                if (!clams[cli].userData.alive) continue;
                var cldx = clams[cli].position.x - octopus.position.x;
                var cldz = clams[cli].position.z - octopus.position.z;
                if (cldx * cldx + cldz * cldz > RECYCLE_DIST * RECYCLE_DIST) {
                  var ncm = recyclePos(octopus.position);
                  clams[cli].position.x = ncm.x;
                  clams[cli].position.z = ncm.z;
                }
              }
              // Free coconuts (not carried/dropped) — recycle so player can
              // always find one to pick up.
              for (var cci2 = 0; cci2 < coconuts.length; cci2++) {
                if (coconuts[cci2].userData.state !== 'free') continue;
                var cco2dx = coconuts[cci2].position.x - octopus.position.x;
                var cco2dz = coconuts[cci2].position.z - octopus.position.z;
                if (cco2dx * cco2dx + cco2dz * cco2dz > RECYCLE_DIST * RECYCLE_DIST) {
                  var nco = recyclePos(octopus.position);
                  coconuts[cci2].position.x = nco.x;
                  coconuts[cci2].position.z = nco.z;
                }
              }
              // Bubble particles — recycle on the seafloor near the player
              for (var bri = 0; bri < BUBBLE_COUNT; bri++) {
                var brx = bubblePositions[bri * 3] - octopus.position.x;
                var brz = bubblePositions[bri * 3 + 2] - octopus.position.z;
                if (brx * brx + brz * brz > RECYCLE_DIST * RECYCLE_DIST) {
                  var nb = recyclePos(octopus.position);
                  bubblePositions[bri * 3] = nb.x;
                  bubblePositions[bri * 3 + 1] = Math.random() * 2;
                  bubblePositions[bri * 3 + 2] = nb.z;
                  bubbles.geometry.attributes.position.needsUpdate = true;
                }
              }
              // Light rays — keep them roughly above the player
              lightRays.forEach(function(r) {
                var lrx = r.mesh.position.x - octopus.position.x;
                var lrz = r.mesh.position.z - octopus.position.z;
                if (lrx * lrx + lrz * lrz > RECYCLE_DIST * RECYCLE_DIST) {
                  var nlr = recyclePos(octopus.position);
                  r.mesh.position.x = nlr.x;
                  r.mesh.position.z = nlr.z;
                }
              });
              // Dens: when the octopus has wandered far from origin and
              // there's no den within 80u, spawn a new den nearby (cap at 12)
              var nearestDenD = Infinity;
              dens.forEach(function(d2) {
                var ddx = d2.x - octopus.position.x;
                var ddz = d2.z - octopus.position.z;
                var dd = Math.sqrt(ddx * ddx + ddz * ddz);
                if (dd < nearestDenD) nearestDenD = dd;
              });
              if (nearestDenD > 80 && dens.length < 12) {
                var ndp = recyclePos(octopus.position);
                var newDen = new THREE.Group();
                var pmat2 = new THREE.MeshStandardMaterial({ color: 0x3d342a, roughness: 0.9 });
                var np1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.4, 0.7), pmat2);
                np1.position.set(-0.9, 0.7, 0); newDen.add(np1);
                var np2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.4, 0.7), pmat2);
                np2.position.set(0.9, 0.7, 0); newDen.add(np2);
                var nlintel = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.4, 0.7), pmat2);
                nlintel.position.set(0, 1.6, 0); newDen.add(nlintel);
                var nshadow = new THREE.Mesh(
                  new THREE.PlaneGeometry(2.0, 1.5),
                  new THREE.MeshBasicMaterial({ color: 0x080608, transparent: true, opacity: 0.85 })
                );
                nshadow.position.set(0, 0.75, 0.01); newDen.add(nshadow);
                var nglow = new THREE.Mesh(
                  new THREE.RingGeometry(DEN_RADIUS - 0.3, DEN_RADIUS, 24),
                  new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0, side: THREE.DoubleSide })
                );
                nglow.position.set(0, 0.06, 0);
                nglow.rotation.x = -Math.PI / 2;
                newDen.add(nglow);
                newDen.position.set(ndp.x, 0, ndp.z);
                newDen.rotation.y = Math.random() * Math.PI;
                scene.add(newDen);
                dens.push({ group: newDen, x: ndp.x, z: ndp.z, glow: nglow });
              }
            }

            // ─── Crab AI ───
            crabs.forEach(function(crab) {
              if (!crab.userData.alive) return;
              crab.userData.wanderTimer -= dt;
              if (crab.userData.wanderTimer <= 0) {
                crab.userData.wanderAngle += (Math.random() - 0.5) * Math.PI * 0.6;
                crab.userData.wanderTimer = 1 + Math.random() * 2.5;
              }
              var dx = crab.position.x - octopus.position.x;
              var dz = crab.position.z - octopus.position.z;
              var cd = Math.sqrt(dx * dx + dz * dz);
              var cs = crab.userData.speed;
              if (cd < 5 && !gameState.isInked) {
                crab.userData.wanderAngle = Math.atan2(dx, dz);
                cs = crab.userData.speed * 2.0;
              }
              crab.position.x += Math.sin(crab.userData.wanderAngle) * cs * dt;
              crab.position.z += Math.cos(crab.userData.wanderAngle) * cs * dt;
              crab.rotation.y = crab.userData.wanderAngle;
              // Leg wiggle
              crab.userData.legPhase += dt * 8;
              crab.children.forEach(function(child, idx) {
                if (idx >= 3 && idx <= 8) {
                  child.position.y = -0.05 + Math.sin(crab.userData.legPhase + idx) * 0.04;
                }
              });
            });

            // ─── Den check (regen + predator block) ──────────────
            // If octopus is inside DEN_RADIUS of any den, health regens
            // and both predators give up active attacks (return-to-home).
            // Visual: the den's ring lights up green.
            gameState.inDen = false;
            gameState.nearestDenIdx = -1;
            for (var di = 0; di < dens.length; di++) {
              var ddx = dens[di].x - octopus.position.x;
              var ddz = dens[di].z - octopus.position.z;
              var dDist = Math.sqrt(ddx * ddx + ddz * ddz);
              if (dDist < DEN_RADIUS) {
                gameState.inDen = true;
                gameState.nearestDenIdx = di;
              }
              // Glow opacity: lights up when octopus is near (within 1.5x radius)
              var glowT = Math.max(0, Math.min(1, (DEN_RADIUS * 1.6 - dDist) / DEN_RADIUS));
              dens[di].glow.material.opacity = glowT * 0.55;
            }
            if (gameState.inDen) {
              gameState.health = Math.min(gameState.maxHealth, gameState.health + 12 * dt);
            }
            if (gameState.inDen && !gameState.previousInDen) {
              gameState.runStats.densVisited++;
            }
            gameState.previousInDen = gameState.inDen;

            // ─── Fish school AI (flocking-lite) ──────────────────
            // Each school's center drifts; individual fish target
            // (center + offset) with gentle steering. Catchable via
            // jet-pounce within FISH_CATCH_RANGE. School regenerates
            // from far edge when wholly consumed.
            fishSchools.forEach(function(school) {
              school.wanderTimer -= dt;
              if (school.wanderTimer <= 0) {
                school.heading += (Math.random() - 0.5) * 0.8;
                school.wanderTimer = 3 + Math.random() * 4;
              }
              school.center.x += Math.sin(school.heading) * 1.5 * dt;
              school.center.z += Math.cos(school.heading) * 1.5 * dt;
              // Bounce off map edges
              if (school.center.x > 60 || school.center.x < -60) school.heading += Math.PI;
              if (school.center.z > 60 || school.center.z < -60) school.heading += Math.PI;
              school.fish.forEach(function(fish) {
                if (!fish.userData.alive) return;
                var tgt = school.center.clone().add(fish.userData.offset);
                fish.position.x += (tgt.x - fish.position.x) * 1.5 * dt;
                fish.position.y += (tgt.y - fish.position.y) * 1.5 * dt;
                fish.position.z += (tgt.z - fish.position.z) * 1.5 * dt;
                // Face direction of travel
                fish.rotation.y = school.heading;
              });
            });
            // Respawn empty schools
            for (var fsi = fishSchools.length - 1; fsi >= 0; fsi--) {
              var alive = fishSchools[fsi].fish.filter(function(f) { return f.userData.alive; }).length;
              if (alive === 0) {
                fishSchools.splice(fsi, 1);
                setTimeout(function() { if (!gameState.gameOver) spawnSchool(); }, 6000);
              }
            }

            // ─── Grouper AI (roaming predator, day-active) ───────
            var gr = grouper.userData;
            var nightFactor = 1 - dayMix;  // 0 day, 1 night
            // At night, grouper retreats to a fixed corner + becomes passive
            if (nightFactor > 0.6 && gr.state !== 'sleeping') {
              gr.state = 'sleeping';
            }
            if (nightFactor < 0.3 && gr.state === 'sleeping') {
              gr.state = 'patrol';
            }
            if (gr.state === 'sleeping') {
              // Drift toward a far corner; very slow
              var corner = new THREE.Vector3(-55, 1.5, -50);
              grouper.position.x += (corner.x - grouper.position.x) * 0.3 * dt;
              grouper.position.z += (corner.z - grouper.position.z) * 0.3 * dt;
            } else if (gr.state === 'patrol') {
              gr.patrolTimer -= dt;
              if (gr.patrolTimer <= 0) {
                gr.patrolAngle += (Math.random() - 0.5) * 1.2;
                gr.patrolTimer = 4 + Math.random() * 4;
              }
              grouper.position.x += Math.sin(gr.patrolAngle) * 1.6 * dt;
              grouper.position.z += Math.cos(gr.patrolAngle) * 1.6 * dt;
              grouper.position.y = 1.8 + Math.sin(now * 0.0015) * 0.2;
              if (grouper.position.x > 55 || grouper.position.x < -55) gr.patrolAngle += Math.PI;
              if (grouper.position.z > 55 || grouper.position.z < -55) gr.patrolAngle += Math.PI;
              grouper.rotation.y = gr.patrolAngle + Math.PI / 2;
              // Detection: aggro range scales with camouflage. Mimic
              // impersonation halves perceived range (lionfish-spike halo).
              var grDx = octopus.position.x - grouper.position.x;
              var grDz = octopus.position.z - grouper.position.z;
              var grDist = Math.sqrt(grDx * grDx + grDz * grDz);
              var grEffectiveRange = gr.aggroRange * (1 - 0.7 * gameState.camoEff) * (gameState.isMimicking ? 0.5 : 1);
              if (grDist < grEffectiveRange && !gameState.isInked && !gameState.inDen && now > gr.cooldownUntil) {
                gr.state = 'attacking';
                gr.stateTimer = 0;
              }
            } else if (gr.state === 'attacking') {
              gr.stateTimer += dt;
              var chx2 = octopus.position.x - grouper.position.x;
              var chz2 = octopus.position.z - grouper.position.z;
              var chDist2 = Math.sqrt(chx2 * chx2 + chz2 * chz2);
              if (chDist2 > 0.1) {
                grouper.position.x += (chx2 / chDist2) * gr.speed * dt;
                grouper.position.z += (chz2 / chDist2) * gr.speed * dt;
                grouper.lookAt(octopus.position.x, grouper.position.y, octopus.position.z);
              }
              if (chDist2 < 1.5 && now - gameState.tookHitAt > 800) {
                gameState.health = Math.max(0, gameState.health - 35);
                gameState.tookHitAt = now;
                gameState.runStats.bites++;
                damageFlash.style.opacity = '1';
                setTimeout(function() { damageFlash.style.opacity = '0'; }, 180);
                gr.state = 'patrol';
                gr.cooldownUntil = now + 5000;
              }
              if (gameState.isInked || gameState.inDen || gr.stateTimer > 5) {
                gr.state = 'patrol';
                gr.cooldownUntil = now + 4000;
              }
            }

            // ─── Clam drill mechanic (hold E within 1.2u) ────────
            // Re-uses E (which also fires clickRequested for crabs). If
            // E is held + a clam is in range + no crab nearby, drill.
            // Movement or damage cancels.
            var heldE = !!keys.KeyE;
            var nearestClam = null;
            var nearestClamD = DRILL_RANGE;
            for (var clci = 0; clci < clams.length; clci++) {
              if (!clams[clci].userData.alive) continue;
              var cldx = clams[clci].position.x - octopus.position.x;
              var cldz = clams[clci].position.z - octopus.position.z;
              var cld = Math.sqrt(cldx * cldx + cldz * cldz);
              if (cld < nearestClamD) { nearestClam = clams[clci]; nearestClamD = cld; }
            }
            if (heldE && nearestClam && !isMoving) {
              gameState.drillingClam = nearestClam;
              gameState.drillProgress = Math.min(1, gameState.drillProgress + dt / DRILL_DURATION);
              nearestClam.children[1].rotation.x = -gameState.drillProgress * Math.PI / 6;
              if (gameState.drillProgress >= 1) {
                nearestClam.userData.alive = false;
                scene.remove(nearestClam);
                nearestClam.traverse(function(o) {
                  if (o.geometry) o.geometry.dispose();
                  if (o.material) { if (Array.isArray(o.material)) o.material.forEach(function(m){m.dispose();}); else o.material.dispose(); }
                });
                clams = clams.filter(function(c) { return c !== nearestClam; });
                gameState.score += 3;
                gameState.hunger = Math.min(gameState.maxHunger, gameState.hunger + 50);
                gameState.runStats.clams++;
                gameState.drillingClam = null;
                gameState.drillProgress = 0;
                try {
                  setCL({
                    huntsSuccessful: (d.huntsSuccessful || 0) + 1,
                    huntBestRun: Math.max(d.huntBestRun || 0, gameState.score),
                  });
                } catch(_) {}
                clAnnounce('Clam cracked — +3 score, hunger refilled');
              }
            } else {
              // Cancel drill if user lets go or moves
              if (gameState.drillProgress > 0) {
                gameState.drillProgress = Math.max(0, gameState.drillProgress - dt * 0.8);
                if (gameState.drillingClam) {
                  gameState.drillingClam.children[1].rotation.x = -gameState.drillProgress * Math.PI / 6;
                }
                if (gameState.drillProgress <= 0) gameState.drillingClam = null;
              }
            }

            // ─── Bubble particle animation ───────────────────────
            var bpAttr = bubbles.geometry.attributes.position;
            for (var bpi = 0; bpi < BUBBLE_COUNT; bpi++) {
              bpAttr.array[bpi * 3 + 1] += bubbleVelocities[bpi] * dt;
              if (bpAttr.array[bpi * 3 + 1] > 12) {
                // Reset to seafloor at random new x/z
                bpAttr.array[bpi * 3] = (Math.random() - 0.5) * 100;
                bpAttr.array[bpi * 3 + 1] = 0.1;
                bpAttr.array[bpi * 3 + 2] = (Math.random() - 0.5) * 100;
              }
            }
            bpAttr.needsUpdate = true;
            // Bubbles dim at night
            bubbleMat.opacity = 0.25 + dayMix * 0.4;

            // ─── Light ray shimmer ───────────────────────────────
            lightRays.forEach(function(r) {
              r.mesh.material.opacity = (0.04 + Math.sin(now * 0.0008 + r.basePhase) * 0.04) * dayMix;
              r.mesh.rotation.y += dt * 0.05;
            });

            // ─── Eye glance toward nearest threat ────────────────
            // Find nearest active predator. Tilt the octopus's eye-bearing
            // forward vector slightly toward it — a small but lively detail.
            var threat = null, threatD = 12;
            if (moray.userData.state === 'attacking') {
              var mTdx = moray.position.x - octopus.position.x;
              var mTdz = moray.position.z - octopus.position.z;
              var mTd = Math.sqrt(mTdx * mTdx + mTdz * mTdz);
              if (mTd < threatD) { threat = moray; threatD = mTd; }
            }
            if (grouper.userData.state === 'attacking') {
              var gTdx = grouper.position.x - octopus.position.x;
              var gTdz = grouper.position.z - octopus.position.z;
              var gTd = Math.sqrt(gTdx * gTdx + gTdz * gTdz);
              if (gTd < threatD) { threat = grouper; threatD = gTd; }
            }
            if (shark && shark.userData.state === 'charging') {
              var sTdx = shark.position.x - octopus.position.x;
              var sTdz = shark.position.z - octopus.position.z;
              var sTd = Math.sqrt(sTdx * sTdx + sTdz * sTdz);
              if (sTd < threatD) { threat = shark; threatD = sTd; }
            }
            if (threat) {
              // Subtle mantle tilt toward threat (max ±0.18 rad)
              var threatAngle = Math.atan2(threat.position.x - octopus.position.x, threat.position.z - octopus.position.z);
              var angleDelta = threatAngle - gameState.facingAngle;
              while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
              while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
              mantle.rotation.y = Math.max(-0.25, Math.min(0.25, angleDelta * 0.4));
            } else {
              mantle.rotation.y *= 0.9;  // relax back to forward
            }

            // ─── Hunt: click or E ───
            // Pounces nearest valid prey in range. Priority: crab (substrate)
            // > fish (mid-water, requires you to be close). Clams use the
            // hold-E drill mechanic above instead. Each catch refills hunger
            // proportional to the prey's size.
            if (clickRequested) {
              clickRequested = false;
              var nearest = null, nearestDist = 2.6, prey = null;
              crabs.forEach(function(crab) {
                if (!crab.userData.alive) return;
                var dx = crab.position.x - octopus.position.x;
                var dz = crab.position.z - octopus.position.z;
                var d2 = Math.sqrt(dx * dx + dz * dz);
                if (d2 < nearestDist) { nearest = crab; nearestDist = d2; prey = 'crab'; }
              });
              // Fish: only catchable if octopus is mid-water enough (within
              // 3y of fish elevation), and within FISH_CATCH_RANGE
              fishSchools.forEach(function(school) {
                school.fish.forEach(function(fish) {
                  if (!fish.userData.alive) return;
                  var dx = fish.position.x - octopus.position.x;
                  var dy = fish.position.y - octopus.position.y;
                  var dz = fish.position.z - octopus.position.z;
                  var d3 = Math.sqrt(dx * dx + dy * dy + dz * dz);
                  if (d3 < FISH_CATCH_RANGE && d3 < nearestDist) {
                    nearest = fish; nearestDist = d3; prey = 'fish';
                  }
                });
              });
              if (nearest && prey === 'crab') {
                nearest.userData.alive = false;
                scene.remove(nearest);
                nearest.traverse(function(o) {
                  if (o.geometry) o.geometry.dispose();
                  if (o.material) { if (Array.isArray(o.material)) o.material.forEach(function(m){m.dispose();}); else o.material.dispose(); }
                });
                crabs = crabs.filter(function(c) { return c !== nearest; });
                gameState.score += 1;
                gameState.hunger = Math.min(gameState.maxHunger, gameState.hunger + 22);
                gameState.runStats.crabs++;
                try {
                  setCL({
                    huntsSuccessful: (d.huntsSuccessful || 0) + 1,
                    huntBestRun: Math.max(d.huntBestRun || 0, gameState.score),
                  });
                } catch(_) {}
                clAnnounce('Caught a crab — ' + gameState.score + ' total');
                setTimeout(function() { if (!gameState.gameOver) spawnCrab(); }, 4500);
              } else if (nearest && prey === 'fish') {
                nearest.userData.alive = false;
                scene.remove(nearest);
                nearest.traverse(function(o) {
                  if (o.geometry) o.geometry.dispose();
                  if (o.material) { if (Array.isArray(o.material)) o.material.forEach(function(m){m.dispose();}); else o.material.dispose(); }
                });
                gameState.score += 2;
                gameState.hunger = Math.min(gameState.maxHunger, gameState.hunger + 32);
                gameState.runStats.fish++;
                try {
                  setCL({
                    huntsSuccessful: (d.huntsSuccessful || 0) + 1,
                    huntBestRun: Math.max(d.huntBestRun || 0, gameState.score),
                  });
                } catch(_) {}
                clAnnounce('Pounced a fish — ' + gameState.score + ' total');
              }
            }

            // ─── Ink defense ───
            if (inkRequested && !gameState.isInked && gameState.inkReserves > 0 && now > gameState.inkCooldownUntil) {
              inkRequested = false;
              gameState.isInked = true;
              gameState.inkUntil = now + 3200;
              gameState.inkReserves--;
              gameState.inkCooldownUntil = now + gameState.inkCooldownMs;
              gameState.runStats.inkUsed++;
              var inkGeo = new THREE.SphereGeometry(2.6, 16, 12);
              var inkMat = new THREE.MeshBasicMaterial({ color: 0x080812, transparent: true, opacity: 0.72 });
              var inkCloud = new THREE.Mesh(inkGeo, inkMat);
              inkCloud.position.set(octopus.position.x, 1.2, octopus.position.z);
              scene.add(inkCloud);
              gameState.inkCloudsActive.push({ mesh: inkCloud, expiresAt: now + 3200 });
              clAnnounce('Ink released — ' + gameState.inkReserves + ' ink left');
            } else {
              if (inkRequested) {
                // Tried to ink but blocked (no reserves, or cooldown, or already inked)
                if (gameState.inkReserves <= 0) clAnnounce('Out of ink');
                else if (now <= gameState.inkCooldownUntil) {
                  var remCd = Math.ceil((gameState.inkCooldownUntil - now) / 1000);
                  clAnnounce('Ink recharging — ' + remCd + 's');
                }
              }
              inkRequested = false;
            }
            if (gameState.isInked && now > gameState.inkUntil) gameState.isInked = false;
            gameState.inkCloudsActive = gameState.inkCloudsActive.filter(function(ink) {
              var t = (ink.expiresAt - now) / 3200;
              if (t <= 0) {
                scene.remove(ink.mesh);
                ink.mesh.geometry.dispose();
                ink.mesh.material.dispose();
                return false;
              }
              ink.mesh.material.opacity = t * 0.72;
              ink.mesh.scale.setScalar(1 + (1 - t) * 0.7);
              return true;
            });

            // ─── Moray eel AI ───
            var me = moray.userData;
            var mdx = octopus.position.x - me.homeX;
            var mdz = octopus.position.z - me.homeZ;
            var mDistHome = Math.sqrt(mdx * mdx + mdz * mdz);

            if (me.state === 'idle') {
              moray.position.set(me.homeX, 0.25 + Math.sin(now * 0.002) * 0.05, me.homeZ);
              moray.lookAt(octopus.position.x, 0.25, octopus.position.z);
              // Eel is more aggressive at night (longer effective range).
              // Camouflage shrinks effective range; den blocks aggression.
              var nightBoost = 1 + nightFactor * 0.5;
              var morayEffectiveRange = me.aggroRange * nightBoost * (1 - 0.7 * gameState.camoEff);
              if (mDistHome < morayEffectiveRange && !gameState.isInked && !gameState.inDen && now > me.cooldownUntil) {
                me.state = 'attacking';
                me.stateTimer = 0;
                clAnnounce('Moray eel attacking');
              }
            } else if (me.state === 'attacking') {
              // Den escape: if octopus reaches a den, eel breaks attack
              if (gameState.inDen) {
                me.state = 'returning';
                me.stateTimer = 0;
                me.cooldownUntil = now + 3000;
              }
              me.stateTimer += dt;
              var chx = octopus.position.x - moray.position.x;
              var chz = octopus.position.z - moray.position.z;
              var chDist = Math.sqrt(chx * chx + chz * chz);
              if (chDist > 0.1) {
                moray.position.x += (chx / chDist) * me.speed * dt;
                moray.position.z += (chz / chDist) * me.speed * dt;
                moray.lookAt(octopus.position.x, 0.25, octopus.position.z);
              }
              if (chDist < 1.2 && now - gameState.tookHitAt > 800) {
                gameState.health = Math.max(0, gameState.health - 30);
                gameState.tookHitAt = now;
                gameState.runStats.bites++;
                damageFlash.style.opacity = '1';
                setTimeout(function() { damageFlash.style.opacity = '0'; }, 180);
                me.state = 'returning';
                me.stateTimer = 0;
                me.cooldownUntil = now + 4000;
                clAnnounce('Bitten by moray');
              }
              if (gameState.isInked || me.stateTimer > 4.5) {
                me.state = 'returning';
                me.stateTimer = 0;
                me.cooldownUntil = now + 3500;
              }
            } else if (me.state === 'returning') {
              var rdx = me.homeX - moray.position.x;
              var rdz = me.homeZ - moray.position.z;
              var rDist = Math.sqrt(rdx * rdx + rdz * rdz);
              if (rDist > 0.2) {
                moray.position.x += (rdx / rDist) * me.speed * 0.6 * dt;
                moray.position.z += (rdz / rDist) * me.speed * 0.6 * dt;
                moray.lookAt(me.homeX, 0.25, me.homeZ);
              } else {
                me.state = 'idle';
              }
            }

            // ─── Camera (third-person follow) ───
            var camOff = new THREE.Vector3(
              -Math.sin(gameState.facingAngle) * 5.5,
              3.5,
              -Math.cos(gameState.facingAngle) * 5.5
            );
            var camTarget = new THREE.Vector3().copy(octopus.position).add(camOff);
            camera.position.lerp(camTarget, 0.12);
            camera.lookAt(octopus.position.x, octopus.position.y + 0.6, octopus.position.z);

            if (gameState.health <= 0) {
              gameState.gameOver = true;
              renderStatsOverlay();
              clAnnounce('Game over — health depleted');
            }
          }

          // ─── HUD update ───
          var elapsed = Math.floor((now - gameState.startTime) / 1000);
          var hp = gameState.health / gameState.maxHealth * 100;
          var sp = gameState.stamina / gameState.maxStamina * 100;
          var hg = gameState.hunger / gameState.maxHunger * 100;
          var camo = gameState.camoEff * 100;
          var hpColor = hp > 60 ? '#86efac' : hp > 30 ? '#fbbf24' : '#fca5a5';
          var hgColor = hg > 50 ? '#fbbf24' : hg > 20 ? '#fb923c' : '#fca5a5';
          var camoColor = camo > 70 ? '#a78bfa' : camo > 35 ? '#cbd5e1' : '#94a3b8';
          var barBg = 'rgba(255,255,255,0.18)';
          // Day/night phase emoji + label
          var phaseEmoji, phaseLabel;
          if (dayMix > 0.7) { phaseEmoji = '☀️'; phaseLabel = 'Day'; }
          else if (dayMix > 0.3) { phaseEmoji = '🌅'; phaseLabel = (gameState.dayTime > 0.5 ? 'Dawn' : 'Dusk'); }
          else { phaseEmoji = '🌙'; phaseLabel = 'Night'; }
          // Substrate icon for camo readout
          var subIcon = '';
          if (gameState.currentSubstrate === 'sand') subIcon = '🏖';
          else if (gameState.currentSubstrate === 'rock') subIcon = '🪨';
          else if (gameState.currentSubstrate === 'grass') subIcon = '🌿';
          else if (gameState.currentSubstrate.indexOf('coral_') === 0) subIcon = '🪸';
          function bar(val, color) {
            return '<span style="display:inline-block;width:78px;height:8px;background:' + barBg + ';border-radius:4px;overflow:hidden;vertical-align:middle"><span style="display:block;width:' + val.toFixed(0) + '%;height:100%;background:' + color + '"></span></span>';
          }
          hud.innerHTML =
            '<div style="font-weight:bold;border-bottom:1px solid rgba(180,140,40,0.4);padding-bottom:4px;margin-bottom:6px;display:flex;justify-content:space-between">🐙 Pacific Octopus<span style="font-weight:400;font-size:11px;color:#cbd5e1">' + phaseEmoji + ' ' + phaseLabel + '</span></div>' +
            '<div style="display:flex;align-items:center;gap:6px">HEALTH&nbsp;' + bar(hp, hpColor) + '<span style="color:' + hpColor + ';min-width:30px;text-align:right">' + gameState.health.toFixed(0) + '</span></div>' +
            '<div style="display:flex;align-items:center;gap:6px">STAMINA ' + bar(sp, '#60a5fa') + '<span style="color:#60a5fa;min-width:30px;text-align:right">' + gameState.stamina.toFixed(0) + '</span></div>' +
            '<div style="display:flex;align-items:center;gap:6px">HUNGER&nbsp; ' + bar(hg, hgColor) + '<span style="color:' + hgColor + ';min-width:30px;text-align:right">' + gameState.hunger.toFixed(0) + '</span></div>' +
            '<div style="display:flex;align-items:center;gap:6px;border-top:1px solid rgba(255,255,255,0.1);margin-top:4px;padding-top:4px">CAMO&nbsp;&nbsp;&nbsp;' + bar(camo, camoColor) + '<span style="color:' + camoColor + ';min-width:30px;text-align:right">' + camo.toFixed(0) + '%</span></div>' +
            '<div style="font-size:10px;color:#94a3b8;margin-left:54px;margin-top:-2px">' + subIcon + ' on ' + gameState.currentSubstrate.replace('_', ' ') + (gameState.stationaryTime > 0.5 ? ' · still' : ' · moving') + '</div>' +
            '<div style="border-top:1px solid rgba(255,255,255,0.1);margin-top:4px;padding-top:4px;display:flex;justify-content:space-between"><span>SCORE <span style="color:#86efac;font-weight:bold">' + gameState.score + '</span></span><span>TIME <span style="color:#fff">' + elapsed + 's</span></span></div>' +
            // INK row: shows reserves (3 dots) + cooldown timer if on cd
            (function() {
              var dots = '';
              for (var idi = 0; idi < gameState.inkMaxReserves; idi++) {
                dots += (idi < gameState.inkReserves)
                  ? '<span style="display:inline-block;width:9px;height:9px;background:#a78bfa;border-radius:50%;margin-right:2px"></span>'
                  : '<span style="display:inline-block;width:9px;height:9px;background:rgba(255,255,255,0.18);border-radius:50%;margin-right:2px"></span>';
              }
              var cdLine = '';
              if (gameState.inkReserves > 0 && now < gameState.inkCooldownUntil) {
                var remCd = Math.ceil((gameState.inkCooldownUntil - now) / 1000);
                cdLine = '<span style="color:#fbbf24;font-size:10px;margin-left:6px">recharging ' + remCd + 's</span>';
              } else if (gameState.inkReserves === 0) {
                cdLine = '<span style="color:#fca5a5;font-size:10px;margin-left:6px">depleted</span>';
              }
              return '<div style="display:flex;align-items:center;gap:6px;border-top:1px solid rgba(255,255,255,0.1);margin-top:4px;padding-top:4px">INK&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + dots + cdLine + '</div>';
            })() +
            (gameState.inDen ? '<div style="color:#22c55e;font-weight:bold;margin-top:5px;font-size:11px">🏠 IN DEN — safe, regenerating</div>' : '') +
            (carriedCoconut ? '<div style="color:#a07840;font-weight:bold;margin-top:5px;font-size:11px">🥥 CARRYING coconut — +30% camo, drop with G</div>' : '') +
            (gameState.isInked ? '<div style="color:#a78bfa;font-weight:bold;margin-top:5px;font-size:11px">⚫ INKED — predators can\'t see you</div>' : '') +
            (gameState.drillProgress > 0 && gameState.drillProgress < 1 ? '<div style="color:#fbbf24;font-weight:bold;margin-top:5px;font-size:11px">🔧 Drilling clam ' + (gameState.drillProgress * 100).toFixed(0) + '%</div>' : '') +
            (gameState.hunger <= 0 ? '<div style="color:#fca5a5;font-weight:bold;margin-top:5px;font-size:11px">⚠ STARVING — eat soon</div>' : '') +
            (gameState.gameOver ? '<div style="color:#fca5a5;font-weight:bold;font-size:11px;margin-top:8px;text-align:center">💀 End-of-dive stats →</div>' : '') +
            (gameState.isSqueezing ? '<div style="color:#fbbf24;font-weight:bold;margin-top:5px;font-size:11px">🪨 SQUEEZING — arms tucked</div>' : '') +
            (gameState.isMimicking ? '<div style="color:#fbbf24;font-weight:bold;margin-top:5px;font-size:11px">🎭 MIMICKING lionfish — predators wary</div>' : '');

          renderer.render(scene, camera);
          animId = requestAnimationFrame(loop);
        }
        loop();

        // ─── Resize ───
        function onResize() {
          var nW = canvasEl.clientWidth || 800;
          var nH = canvasEl.clientHeight || 500;
          camera.aspect = nW / nH;
          camera.updateProjectionMatrix();
          renderer.setSize(nW, nH);
        }
        window.addEventListener('resize', onResize);

        // ─── Cleanup ───
        canvasEl._clCleanup = function() {
          cancelAnimationFrame(animId);
          canvasEl.removeEventListener('keydown', onKeyDown);
          canvasEl.removeEventListener('keyup', onKeyUp);
          canvasEl.removeEventListener('click', onClick);
          window.removeEventListener('resize', onResize);
          if (hud.parentElement) hud.parentElement.removeChild(hud);
          if (tutorial.parentElement) tutorial.parentElement.removeChild(tutorial);
          if (damageFlash.parentElement) damageFlash.parentElement.removeChild(damageFlash);
          if (statsOverlay.parentElement) statsOverlay.parentElement.removeChild(statsOverlay);
          scene.traverse(function(obj) {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
              if (Array.isArray(obj.material)) obj.material.forEach(function(m) { m.dispose(); });
              else obj.material.dispose();
            }
          });
          renderer.dispose();
          canvasEl._clInit = false;
        };
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 4 — EVASION SIM (the prey perspective)
      // ═══════════════════════════════════════════════════════
      // Predators of cephalopods, with the sensory modality they
      // use to detect prey — different tactics work against
      // different sensory profiles.
      var PREDATORS = [
        { id: 'reef-shark', name: 'Reef Shark', emoji: '🦈',
          sensory: ['visual', 'electroreception', 'chemosense'],
          size: 'medium-large', habitat: ['reef', 'open-ocean'],
          threatens: ['commonOcto', 'dayOcto', 'cuttlefish', 'humboldt', 'firefly', 'bobtail', 'mimicOcto'],
          beats: ['camouflage-fail'],
          weakAgainst: ['ink-flee', 'jet-escape', 'mimicry'],
          description: 'Visual hunters with electroreceptors (Lorenzini ampullae) that detect bioelectric fields of prey. Ink masks visual + chemical trail; sudden jet breaks tracking.' },
        { id: 'large-shark', name: 'Large Shark', emoji: '🦈',
          sensory: ['visual', 'electroreception', 'chemosense'],
          size: 'large', habitat: ['open-ocean', 'deep'],
          threatens: ['humboldt', 'giantPac', 'giantSquid', 'colossal'],
          beats: ['camouflage-fail', 'slow-escape'],
          weakAgainst: ['depth-change', 'jet-escape', 'deimatic'],
          description: 'Apex pelagic predators. Giant Pacific octopuses, Humboldt squid, even giant + colossal squid are documented prey. Hard to ink-evade in open water.' },
        { id: 'moray-eel', name: 'Moray Eel', emoji: '🐍',
          sensory: ['chemosense', 'tactile', 'ambush'],
          size: 'medium', habitat: ['reef', 'rocky'],
          threatens: ['commonOcto', 'blueRing', 'coconut', 'dayOcto', 'mimicOcto', 'bobtail'],
          beats: ['hideout', 'slow-escape'],
          weakAgainst: ['ink-flee', 'autotomy', 'jet-escape'],
          description: 'Ambush hunters lurking in crevices. They smell prey + strike from cover. Hiding in coral doesn\'t help — that\'s WHERE the eel is. Octopus must abandon shelter + flee.' },
        { id: 'dolphin', name: 'Bottlenose Dolphin', emoji: '🐬',
          sensory: ['echolocation', 'visual', 'cooperation'],
          size: 'large', habitat: ['open-ocean', 'reef'],
          threatens: ['cuttlefish', 'commonOcto', 'humboldt', 'firefly'],
          beats: ['camouflage-fail', 'ink-flee'],
          weakAgainst: ['jet-escape', 'depth-change', 'autotomy'],
          description: 'Active echolocators — sound-based hunters. Ink doesn\'t hide you from sonar. Pod-hunting + intelligence makes evasion hard. Best response: depth change or rapid jet.' },
        { id: 'sperm-whale', name: 'Sperm Whale', emoji: '🐋',
          sensory: ['echolocation', 'depth-dive'],
          size: 'massive', habitat: ['deep', 'open-ocean'],
          threatens: ['giantSquid', 'colossal', 'humboldt'],
          beats: ['camouflage-fail', 'slow-escape', 'ink-flee'],
          weakAgainst: ['depth-change', 'jet-escape'],
          description: 'The apex predator of giant + colossal squid. Sonar penetrates ink + dark water. Sucker scars on sperm whale skin are battle marks. Most cephalopod-vs-whale fights end with the whale.' },
        { id: 'sea-otter', name: 'Sea Otter', emoji: '🦦',
          sensory: ['visual', 'tactile', 'tool-use'],
          size: 'medium', habitat: ['kelp', 'rocky'],
          threatens: ['giantPac', 'commonOcto'],
          beats: ['hideout', 'slow-escape'],
          weakAgainst: ['ink-flee', 'jet-escape', 'autotomy'],
          description: 'Pacific Northwest specialist. Will pry octopuses out of dens with their hands + dive repeatedly. Persistent + intelligent — hideouts don\'t save you for long.' },
        { id: 'lingcod', name: 'Lingcod', emoji: '🐟',
          sensory: ['visual', 'ambush'],
          size: 'medium', habitat: ['rocky', 'kelp', 'cold-deep'],
          threatens: ['giantPac', 'commonOcto'],
          beats: ['camouflage-fail', 'slow-escape'],
          weakAgainst: ['ink-flee', 'jet-escape', 'hideout'],
          description: 'Pacific Northwest ambush predator with huge mouth. Octopuses are routine prey. Lingcod with octopus arms hanging out of their mouths are a common dive photo.' },
        { id: 'larger-cephalopod', name: 'Larger Cephalopod', emoji: '🐙',
          sensory: ['visual', 'tactile', 'intelligent'],
          size: 'varies', habitat: ['reef', 'kelp', 'sandy', 'open-ocean'],
          threatens: ['commonOcto', 'mimicOcto', 'blueRing', 'coconut', 'bobtail', 'firefly', 'dayOcto'],
          beats: ['camouflage-fail', 'autotomy', 'hideout'],
          weakAgainst: ['venom-strike', 'mimicry'],
          description: 'Cephalopod cannibalism is the norm. Larger common octopus eats smaller common octopus. Humboldt squid pack-hunt smaller squid. Same camouflage tricks don\'t work — your predator is using them too.' },
        { id: 'pinniped', name: 'Seal / Sea Lion', emoji: '🦭',
          sensory: ['visual', 'whisker-tactile', 'fast'],
          size: 'large', habitat: ['kelp', 'rocky', 'open-ocean'],
          threatens: ['giantPac', 'commonOcto', 'humboldt', 'cuttlefish'],
          beats: ['slow-escape'],
          weakAgainst: ['ink-flee', 'depth-change', 'autotomy', 'jet-escape'],
          description: 'Vibrissae (whiskers) detect water disturbance from prey movement — sensing modality octopuses don\'t typically defend against. Fast + agile in 3D water column.' }
      ];

      // Evasion tactics, each with a sensory-vulnerability profile
      var EVASION_TACTICS = [
        { id: 'ink-flee', name: 'Ink + Flee', emoji: '🌫️',
          worksAgainst: ['visual', 'chemosense', 'electroreception'],
          failsAgainst: ['echolocation', 'tactile'],
          species: ['commonOcto', 'mimicOcto', 'giantPac', 'coconut', 'cuttlefish', 'humboldt', 'dayOcto', 'firefly'],
          description: 'Eject a melanin + mucus pseudomorph (decoy) + jet sideways. Disrupts visual tracking; the mucus also temporarily disables predator smell. Classic + iconic.',
          cost: 'High energy + ink-sac depletion (slow refill, ~30+ min).' },
        { id: 'jet-escape', name: 'Jet Escape', emoji: '🚀',
          worksAgainst: ['visual', 'tactile', 'slow-pursuit'],
          failsAgainst: ['echolocation', 'high-speed-pursuit'],
          species: ['commonOcto', 'humboldt', 'cuttlefish', 'giantSquid', 'colossal', 'firefly'],
          description: 'Explosive mantle contraction + siphon-jet for instant linear acceleration. Best at evading pursuit predators or sudden attacks.',
          cost: 'Systemic heart stops during sustained jet; can\'t maintain for long. Inefficient compared to crawling.' },
        { id: 'camouflage-freeze', name: 'Camouflage + Freeze', emoji: '🎭',
          worksAgainst: ['visual', 'distant-search'],
          failsAgainst: ['echolocation', 'chemosense', 'electroreception', 'tactile'],
          species: ['commonOcto', 'mimicOcto', 'cuttlefish', 'coconut', 'dayOcto', 'bobtail', 'giantPac'],
          description: 'Best response to a predator that hasn\'t spotted you yet — match the substrate + stop moving. If you\'re already detected, this fails.',
          cost: 'Low energy but slow start time. Useless if the predator\'s sensory system isn\'t visual.' },
        { id: 'deimatic', name: 'Deimatic Display', emoji: '👀',
          worksAgainst: ['visual', 'startle-reflex'],
          failsAgainst: ['echolocation', 'persistent-predator'],
          species: ['commonOcto', 'cuttlefish', 'humboldt', 'mimicOcto', 'blueRing'],
          description: 'Sudden high-contrast display + eyespots + posture extension. Triggers predator startle reflex — buys ~0.5 seconds for the next escape move. Used by cuttlefish + Humboldt squid + others.',
          cost: 'Energy to power the rapid skin display. Effective for ~1 attempt before predator habituates.' },
        { id: 'autotomy', name: 'Arm Autotomy', emoji: '✂️',
          worksAgainst: ['visual', 'tactile', 'grappling'],
          failsAgainst: ['echolocation', 'pursuit'],
          species: ['commonOcto', 'mimicOcto', 'giantPac', 'coconut', 'dayOcto'],
          description: 'Sacrifice an arm — it detaches + reacts independently for ~1 hour, distracting the predator. Octopus regrows it in weeks. The cost is real (~12% of total mass + significant neuron loss) but better than dying.',
          cost: 'Loss of one arm + temporary cognitive reduction during regrowth (~2-3 months to fully restore).' },
        { id: 'depth-change', name: 'Depth Change', emoji: '⬇️',
          worksAgainst: ['echolocation', 'visual', 'surface-predator'],
          failsAgainst: ['deep-diver'],
          species: ['humboldt', 'giantSquid', 'colossal', 'firefly'],
          description: 'Rapidly descend (or ascend in some cases) to break predator pursuit. Especially squid — they can dive 100+ meters quickly. Effective against surface-bound dolphins + birds.',
          cost: 'Pressure adjustment + energy. Effective against most predators except sperm whales (which dive deeper).' },
        { id: 'mimicry', name: 'Mimicry Defense', emoji: '🎭',
          worksAgainst: ['visual', 'fish-predator'],
          failsAgainst: ['echolocation', 'unfooled-predator'],
          species: ['mimicOcto'],
          description: 'Impersonate a venomous/unpalatable species (sea snake, lionfish, flatfish). The predator backs off thinking you\'re dangerous. Mimic octopus specialty.',
          cost: 'Slow to adopt + commits you to the impersonation. Doesn\'t work if the predator has never seen the impersonated species.' },
        { id: 'hideout', name: 'Hideout / Den', emoji: '🕳️',
          worksAgainst: ['visual'],
          failsAgainst: ['echolocation', 'chemosense', 'tactile', 'tool-user'],
          species: ['commonOcto', 'giantPac', 'coconut', 'dayOcto', 'mimicOcto', 'bobtail'],
          description: 'Retreat into a crevice, shell, or constructed shelter (coconut octopus). Best against visual predators that can\'t reach into small spaces.',
          cost: 'Useless if predator can smell, sonar, or physically extract you. Sea otters + morays defeat hideouts.' },
        { id: 'venom-strike', name: 'Counter-Strike (Venom)', emoji: '☠️',
          worksAgainst: ['visual', 'tactile', 'contact-required'],
          failsAgainst: ['echolocation', 'eat-from-distance'],
          species: ['blueRing'],
          description: 'Blue-ringed octopus specialty: signal aposematic warning rings + deliver tetrodotoxin if attacked. Most predators learn to avoid blue-ringed individuals after one encounter — or don\'t survive to learn.',
          cost: 'Only works for venomous species. Blue rings only flash when threatened — aposematic signal.' },
        { id: 'counter-illum-evasion', name: 'Counter-Illumination', emoji: '💡',
          worksAgainst: ['visual', 'silhouette-detection'],
          failsAgainst: ['echolocation', 'side-view-predator'],
          species: ['firefly', 'bobtail'],
          description: 'Match downwelling light from above with ventral photophores or symbiotic bacterial light organ. Erases your silhouette to predators looking up from below.',
          cost: 'Requires photophore array or symbiotic bacterial culture. Specific to bioluminescent species.' }
      ];

      function renderEvasionSim() {
        var phase = d.evasionPhase || 'lobby';
        if (phase === 'plan') return renderEvasionPlan();
        if (phase === 'execute') return renderEvasionExecute();
        if (phase === 'result') return renderEvasionResult();
        return renderEvasionLobby();
      }

      function renderEvasionLobby() {
        return h('div', null,
          panelHeader('🛡️ Evasion Sim',
            'The other side of the food web. Even apex cephalopods get hunted — giant Pacific octopuses by sea otters + sharks, giant squid by sperm whales, blue-ringed octopuses by morays. Pick a species, see who threatens it, choose your evasion tactic, and survive (or don\'t).'),

          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '📊 Your survival record'),
            h('div', { style: { display: 'flex', gap: 24, flexWrap: 'wrap' } },
              h('div', null,
                h('div', { style: { fontSize: 28, fontWeight: 900, color: '#86efac', fontFamily: 'ui-monospace, Menlo, monospace' } }, (d.evasionEscapes || 0)),
                h('div', { style: { fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Escapes')),
              h('div', null,
                h('div', { style: { fontSize: 28, fontWeight: 900, color: '#fca5a5', fontFamily: 'ui-monospace, Menlo, monospace' } }, (d.evasionEncountersAttempted || 0)),
                h('div', { style: { fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Predator encounters')))),

          // Food web context callout
          h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid #fb923c' }) },
            h('div', { style: subheaderStyle() }, '🌐 Every cephalopod is somewhere in a food web'),
            h('div', { style: { color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              h('p', { style: { margin: '0 0 10px 0' } },
                'There\'s no "apex cephalopod" — even the largest face predators. Giant Pacific octopuses are eaten by harbor seals, sea otters, lingcod, and sometimes by other (larger) giant Pacific octopuses. Giant squid + colossal squid are sperm whale prey — and the whale carries the scars to prove it.'),
              h('p', { style: { margin: 0 } },
                'Some species turn the tables. A 50kg giant Pacific octopus is documented eating small reef sharks (search "Octopus eats shark" — Bob Anderson 1992 footage). But the next year, a larger shark might eat THAT octopus. Predator/prey labels are size-relative + life-stage-relative.'))),

          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '🐙 Pick a species to play (you\'re the cephalopod escaping)'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 } },
              SPECIES.map(function(s) {
                var groupColor = s.group === 'octopus' ? '#a78bfa' : s.group === 'squid' ? '#38bdf8' : s.group === 'cuttlefish' ? '#fbbf24' : '#86efac';
                var predatorList = PREDATORS.filter(function(p) { return p.threatens.indexOf(s.id) !== -1; });
                if (predatorList.length === 0) return null; // skip species with no listed predators
                return h('button', { key: s.id,
                  onClick: function() { setCL({ evasionSpeciesId: s.id, evasionPhase: 'plan', evasionPredatorId: null, evasionTacticId: null, evasionReactionMs: 0 }); awardXP(2); clAnnounce('Selected ' + s.name); },
                  style: { padding: '12px 14px', textAlign: 'left',
                    background: 'rgba(15,23,42,0.6)', color: '#fde68a',
                    borderTop: '1px solid rgba(100,116,139,0.3)', borderRight: '1px solid rgba(100,116,139,0.3)', borderBottom: '1px solid rgba(100,116,139,0.3)', borderLeft: '4px solid ' + groupColor,
                    borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 24, lineHeight: 1 } }, s.emoji),
                    h('div', null,
                      h('div', { style: { fontSize: 14, fontWeight: 800, color: '#c7d2fe' } }, s.name),
                      h('div', { style: { fontSize: 10, fontStyle: 'italic', color: '#94a3b8', marginTop: 2 } }, s.scientific))),
                  h('div', { style: { fontSize: 10, color: '#fb923c', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 4 } },
                    'Threatened by ' + predatorList.length + ' predator' + (predatorList.length === 1 ? '' : 's')),
                  h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } },
                    predatorList.slice(0, 3).map(function(p) { return p.name; }).join(', ') + (predatorList.length > 3 ? ', + others' : '')));
              })))
        );
      }

      function renderEvasionPlan() {
        var sp = SPECIES.find(function(x) { return x.id === d.evasionSpeciesId; });
        if (!sp) { setCL({ evasionPhase: 'lobby' }); return null; }
        var threats = PREDATORS.filter(function(p) { return p.threatens.indexOf(sp.id) !== -1; });
        var availableTactics = EVASION_TACTICS.filter(function(t) { return t.species.indexOf(sp.id) !== -1; });
        var canProceed = !!(d.evasionPredatorId && d.evasionTacticId);
        return h('div', null,
          panelHeader('🛡️ Plan your escape — ' + sp.emoji + ' ' + sp.name,
            'Pick which predator you\'re escaping + which tactic you\'ll use. The judge will check whether your tactic\'s sensory profile matches the predator\'s sensory modality.'),

          // Predator picker (filtered to species' actual threats)
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '🦈 Which predator?'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 } },
              threats.map(function(p) {
                var active = d.evasionPredatorId === p.id;
                return h('button', { key: p.id,
                  onClick: function() { setCL({ evasionPredatorId: p.id }); awardXP(1); },
                  'aria-pressed': active ? 'true' : 'false',
                  style: { padding: '10px 12px', textAlign: 'left',
                    background: active ? 'rgba(220,38,38,0.18)' : 'rgba(15,23,42,0.5)',
                    color: active ? '#fde68a' : '#cbd5e1',
                    border: '1px solid ' + (active ? 'rgba(252,165,165,0.5)' : 'rgba(100,116,139,0.3)'),
                    borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, p.emoji),
                    h('div', { style: { fontWeight: 800, fontSize: 12, color: active ? '#fde68a' : '#e2e8f0' } }, p.name)),
                  h('div', { style: { fontSize: 10, color: '#fb923c', marginBottom: 4 } },
                    'Senses: ' + p.sensory.join(' · ')),
                  h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } }, p.description));
              }))),

          // Tactic picker (filtered to what species can do)
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '⚔️ Which evasion tactic?'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 } },
              availableTactics.map(function(t) {
                var active = d.evasionTacticId === t.id;
                return h('button', { key: t.id,
                  onClick: function() { setCL({ evasionTacticId: t.id }); awardXP(1); },
                  'aria-pressed': active ? 'true' : 'false',
                  style: { padding: '10px 12px', textAlign: 'left',
                    background: active ? 'rgba(34,197,94,0.18)' : 'rgba(15,23,42,0.5)',
                    color: active ? '#fde68a' : '#cbd5e1',
                    border: '1px solid ' + (active ? 'rgba(134,239,172,0.5)' : 'rgba(100,116,139,0.3)'),
                    borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, t.emoji),
                    h('div', { style: { fontWeight: 800, fontSize: 12, color: active ? '#fde68a' : '#e2e8f0' } }, t.name)),
                  h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, t.description),
                  h('div', { style: { fontSize: 10, color: '#fca5a5', fontStyle: 'italic' } },
                    '⚠️ Cost: ' + t.cost));
              }))),

          h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' } },
            h('button', { onClick: function() { if (canProceed) setCL({ evasionPhase: 'execute', evasionReactionMs: 0 }); },
              disabled: !canProceed,
              style: { padding: '12px 26px',
                background: canProceed ? '#a78bfa' : 'rgba(100,116,139,0.3)',
                color: canProceed ? '#1c1410' : '#94a3b8',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800,
                cursor: canProceed ? 'pointer' : 'not-allowed' } },
              '→ Execute escape'),
            h('button', { onClick: function() { setCL({ evasionPhase: 'lobby' }); },
              style: { padding: '12px 18px', background: 'transparent', color: '#cbd5e1',
                border: '1px solid rgba(100,116,139,0.5)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' } },
              '← Pick different species'))
        );
      }

      function renderEvasionExecute() {
        // Reaction-time minigame: press the button as fast as possible after the "GO" prompt.
        // Faster reaction = better escape outcome.
        var hasReacted = (d.evasionReactionMs || 0) > 0;
        return h('div', null,
          panelHeader('🛡️ Execute — reaction time matters',
            'The predator is striking. Click the GO button below as fast as you can. Faster reaction = better escape. Real cephalopods react in 25-150 milliseconds depending on species.'),

          h('div', { style: Object.assign({}, cardStyle(), { textAlign: 'center', padding: 40 }) },
            hasReacted ?
              h('div', null,
                h('div', { style: { fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 } }, 'Your reaction time'),
                h('div', { style: { fontSize: 48, fontWeight: 900, color: '#fde68a', fontFamily: 'ui-monospace, Menlo, monospace', lineHeight: 1, marginBottom: 8 } },
                  d.evasionReactionMs + ' ms'),
                h('div', { style: { fontSize: 13, color: '#cbd5e1', marginBottom: 20 } },
                  d.evasionReactionMs < 200 ? 'Lightning fast — cephalopod-grade reflexes.' :
                  d.evasionReactionMs < 400 ? 'Quick. Above-average human reaction.' :
                  d.evasionReactionMs < 700 ? 'Average reaction time.' :
                  'Slow. Predator probably already had you.'),
                h('button', { onClick: function() { runEvasionJudge(d.evasionReactionMs); },
                  style: { padding: '12px 26px', background: '#a78bfa', color: '#1c1410',
                    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer' } },
                  '→ See result'))
              :
              h('div', null,
                h('div', { style: { fontSize: 64, marginBottom: 16 } }, '🚨'),
                h('div', { style: { fontSize: 14, color: '#fca5a5', marginBottom: 18, lineHeight: 1.6 } },
                  'The predator strikes. Click as fast as you can when ready.'),
                h('button', {
                  onClick: function() {
                    // Start reaction-time clock. We'll show a "GO!" after random delay.
                    var delayMs = 800 + Math.random() * 1500;
                    var startedAt = Date.now() + delayMs;
                    setCL({ _evasionGoAt: startedAt });
                    setTimeout(function() {
                      var rxStart = Date.now();
                      function captureClick() {
                        var rt = Date.now() - rxStart;
                        setCL({ evasionReactionMs: rt });
                        document.removeEventListener('click', captureClick);
                      }
                      document.addEventListener('click', captureClick);
                      // Show GO via state
                      setCL({ _evasionShowGo: true });
                    }, delayMs);
                  },
                  style: { width: 200, padding: '24px', background: d._evasionShowGo ? '#22c55e' : '#dc2626',
                    color: 'white', border: 'none', borderRadius: 12, fontSize: 24, fontWeight: 900, cursor: 'pointer',
                    boxShadow: '0 6px 18px rgba(220,38,38,0.4)' } },
                  d._evasionShowGo ? '✓ CLICK NOW!' : '⏳ Wait for GO...')))
        );
      }

      function runEvasionJudge(reactionMs) {
        var sp = SPECIES.find(function(x) { return x.id === d.evasionSpeciesId; });
        var pred = PREDATORS.find(function(p) { return p.id === d.evasionPredatorId; });
        var tac = EVASION_TACTICS.find(function(t) { return t.id === d.evasionTacticId; });
        if (!sp || !pred || !tac) { setCL({ evasionPhase: 'lobby' }); return; }
        // Sensory match check: tactic works against predator's sensory modalities?
        var matched = pred.sensory.filter(function(s) { return tac.worksAgainst.indexOf(s) !== -1; }).length;
        var conflict = pred.sensory.filter(function(s) { return tac.failsAgainst.indexOf(s) !== -1; }).length;
        var tacticEffectiveness = matched - conflict;
        // Reaction-time score
        var reactionScore = reactionMs < 200 ? 30 : reactionMs < 400 ? 20 : reactionMs < 700 ? 10 : 0;
        // Final outcome
        var totalScore = tacticEffectiveness * 25 + reactionScore + (sp.intelligence * 1.2);
        var escaped = totalScore > 30;
        // Possible "escaped but lost an arm" intermediate outcome
        var costlyEscape = escaped && tac.id === 'autotomy';
        var notes = [];
        // Sensory analysis
        if (matched > 0 && conflict === 0) {
          notes.push({ neg: false, label: '✓ Sensory match', detail: tac.name + ' targets ' + pred.name + '\'s primary senses (' + pred.sensory.join(' + ') + '). The defense was well-matched.' });
        } else if (conflict > 0 && matched === 0) {
          notes.push({ neg: true, label: '⚠️ Wrong tactic for this predator', detail: tac.name + ' doesn\'t fool ' + pred.name + '\'s senses (' + pred.sensory.join(' + ') + '). Real cephalopods would have died here.' });
        } else {
          notes.push({ neg: matched <= conflict, label: matched > conflict ? '✓ Tactic partly effective' : '~ Tactic mixed', detail: 'Some sensory match, some failure mode. Outcome was uncertain.' });
        }
        // Reaction-time analysis
        notes.push({ neg: reactionScore < 10,
          label: reactionScore >= 20 ? '✓ Fast reaction' : reactionScore >= 10 ? '~ Adequate reaction' : '⚠️ Slow reaction',
          detail: 'Reaction ' + reactionMs + 'ms — ' + (reactionMs < 200 ? 'cephalopod-grade reflexes (real octopus is ~70-150ms).' : 'a real cephalopod would have moved faster.') });
        // Species-tactic appropriateness
        if (tac.species.indexOf(sp.id) === -1) {
          notes.push({ neg: true, label: '⚠️ Tactic not available for this species', detail: 'Real ' + sp.name + ' doesn\'t use ' + tac.name + '. Picked anyway?' });
        }
        // Cost callout for autotomy
        if (costlyEscape) {
          notes.push({ neg: false, label: '⚠️ Autotomy cost', detail: 'You sacrificed an arm to escape. The arm reacts independently for ~1 hour. Regrowth takes 2-3 months. Costly but you\'re alive.' });
        }
        setCL(function(prior) {
          return {
            evasionPhase: 'result',
            evasionResult: { escaped: escaped, costlyEscape: costlyEscape, notes: notes,
              speciesName: sp.name, predatorName: pred.name, tacticName: tac.name,
              reactionMs: reactionMs },
            evasionEncountersAttempted: (prior.evasionEncountersAttempted || 0) + 1,
            evasionEscapes: (prior.evasionEscapes || 0) + (escaped ? 1 : 0),
            _evasionShowGo: false
          };
        });
        if (escaped) awardXP(8);
      }

      function renderEvasionResult() {
        var r = d.evasionResult;
        if (!r) { setCL({ evasionPhase: 'lobby' }); return null; }
        var escaped = r.escaped;
        var costly = r.costlyEscape;
        return h('div', null,
          panelHeader('🛡️ Encounter result',
            r.speciesName + ' vs ' + r.predatorName + ' — ' + r.tacticName +
            (escaped ? (costly ? ' — escaped at a cost.' : ' — escaped.') : ' — caught.')),

          h('div', { style: Object.assign({}, cardStyle(), { textAlign: 'center', padding: 36,
            background: escaped ? 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(15,23,42,0.6))'
                                : 'linear-gradient(135deg, rgba(220,38,38,0.18), rgba(15,23,42,0.6))',
            borderLeft: '4px solid ' + (escaped ? '#22c55e' : '#dc2626')
          }) },
            h('div', { 'aria-hidden': 'true', style: { fontSize: 72, lineHeight: 1, marginBottom: 8 } },
              escaped ? (costly ? '🦑' : '🌫️') : '💀'),
            h('div', { style: { fontSize: 24, fontWeight: 900, color: escaped ? '#86efac' : '#fca5a5', letterSpacing: '-0.01em', marginBottom: 8 } },
              escaped ? (costly ? 'Survived (but lost an arm)' : 'Survived') : 'Predation event'),
            h('div', { style: { fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' } },
              escaped ?
                (costly ? 'You escaped, but autotomy is a real cost — 2-3 months of regrowth + temporary cognitive reduction.'
                       : 'You escaped cleanly. In the real ocean, ~80% of cephalopod predator encounters end with the cephalopod escaping (most predators miss).') :
                'You were caught. In the wild, this is the most common cause of cephalopod death — far more than the programmed-senescence cycle. Most cephalopods don\'t live to die of old age.')),

          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '📋 Judge\'s notes'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              r.notes.map(function(n, i) {
                return h('div', { key: i,
                  style: { background: n.neg ? 'rgba(220,38,38,0.08)' : 'rgba(34,197,94,0.08)',
                    border: '1px solid ' + (n.neg ? 'rgba(220,38,38,0.3)' : 'rgba(34,197,94,0.3)'),
                    borderLeft: '4px solid ' + (n.neg ? '#dc2626' : '#22c55e'),
                    padding: '10px 14px', borderRadius: 8 } },
                  h('div', { style: { fontSize: 12, fontWeight: 700, color: n.neg ? '#fca5a5' : '#86efac', marginBottom: 4 } }, n.label),
                  h('div', { style: { fontSize: 11, color: '#e2e8f0', lineHeight: 1.55 } }, n.detail));
              }))),

          h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' } },
            h('button', { onClick: function() { setCL({ evasionPhase: 'lobby', evasionResult: null, evasionReactionMs: 0 }); awardXP(2); },
              style: { padding: '12px 24px', background: '#a78bfa', color: '#1c1410',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer' } },
              '🔁 Try another encounter'),
            h('button', { onClick: function() { setSection('hunt'); awardXP(1); },
              style: { padding: '12px 24px', background: 'transparent', color: '#c7d2fe',
                border: '1px solid rgba(167,139,250,0.4)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' } },
              '🎯 Switch to Hunter Sim'))
        );
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 5 — DAY IN THE LIFE (Hard Mode — hunter AND hunted)
      // ═══════════════════════════════════════════════════════
      // Procedurally-generated 10-encounter day. Mixes hunting +
      // predator threats + environmental events + social moments —
      // recovers the integrated lived reality the Hunter/Evasion
      // bifurcation loses.
      var ENCOUNTER_TEMPLATES = [
        // ─── HUNTING OPPORTUNITIES ───
        { type: 'hunt', title: 'A small crab forages in a crevice', emoji: '🦀',
          species: ['commonOcto', 'mimicOcto', 'giantPac', 'coconut', 'cuttlefish', 'dayOcto', 'blueRing'],
          detail: 'You spot a juvenile rock crab probing among the stones. Hunger is real — your stomach is already 60% empty.',
          options: [
            { id: 'ambush', label: '🎭 Ambush — slow stalk + strike', calorieDelta: 60, healthDelta: 0, armDelta: 0, msg: 'Caught the crab. Beak through the shell joint. +60 calories.', failChance: 0.15, failMsg: 'Misjudged the strike — crab darted into a deeper crevice. -5 calories (effort).' },
            { id: 'jet', label: '🚀 Jet pounce', calorieDelta: 50, healthDelta: 0, armDelta: 0, msg: 'Caught it via jet propulsion. +50 calories.', failChance: 0.35, failMsg: 'Crab heard the water surge + escaped. -10 calories from the burst.' },
            { id: 'ignore', label: '😐 Move on — not hungry enough', calorieDelta: 0, healthDelta: 0, armDelta: 0, msg: 'Saved the energy. No gain, no loss.', failChance: 0 } ] },
        { type: 'hunt', title: 'A school of fish swims overhead', emoji: '🐟',
          species: ['humboldt', 'cuttlefish', 'giantSquid', 'firefly'],
          detail: 'A school of silversides passes through your zone. Fast, but tightly packed — a coordinated strike could land you a meal.',
          options: [
            { id: 'jet', label: '🚀 Jet-strike from below', calorieDelta: 80, healthDelta: 0, armDelta: 0, msg: 'Caught a fish on the strike. +80 calories.', failChance: 0.4, failMsg: 'School fragmented before you reached them. -15 calories from the chase.' },
            { id: 'hypnotic', label: '🌈 Hypnotic display (cuttlefish only)', calorieDelta: 100, healthDelta: 0, armDelta: 0, msg: 'Passing-cloud display mesmerized one fish long enough to grab. +100 calories.', failChance: 0.5, failMsg: 'Display didn\'t hold the fish\'s attention — they\'re wary today. -10 calories.' },
            { id: 'ignore', label: '😐 Let them pass', calorieDelta: 0, healthDelta: 0, armDelta: 0, msg: 'Saved the energy for a more reliable opportunity.', failChance: 0 } ] },
        { type: 'hunt', title: 'A clam half-buried in the sand', emoji: '🦪',
          species: ['commonOcto', 'giantPac', 'mimicOcto', 'coconut'],
          detail: 'The clam is barely visible — just a slight ridge in the substrate. Slow + reliable food source if you commit to drilling.',
          options: [
            { id: 'drill', label: '🦷 Drill the shell (radula work, slow)', calorieDelta: 45, healthDelta: -3, armDelta: 0, msg: 'Spent 30 minutes drilling but got the clam. +45 cal, but tiring (-3 health).', failChance: 0.05 },
            { id: 'ignore', label: '😐 Not worth the effort right now', calorieDelta: 0, healthDelta: 0, armDelta: 0, msg: 'Moved on. Will reconsider if hungrier later.', failChance: 0 } ] },
        { type: 'hunt', title: 'Marine snow drifts past', emoji: '❄️',
          species: ['vampireSquid', 'dumbo'],
          detail: 'A steady drift of organic particles — your normal food source. Filter feeding is what you\'re built for.',
          options: [
            { id: 'filter', label: '🌫️ Spread arms + filter', calorieDelta: 20, healthDelta: 0, armDelta: 0, msg: 'Caught a handful of marine snow. Low-cal but reliable. +20.', failChance: 0.05 } ] },
        { type: 'hunt', title: 'Smaller octopus hatchlings drift past', emoji: '🐙',
          species: ['commonOcto', 'giantPac', 'humboldt'],
          detail: 'A clutch of paralarvae from another octopus — easy protein, but they\'re your own kind. Cephalopod cannibalism is normal in the wild.',
          options: [
            { id: 'eat', label: '🍽️ Cannibalize — it\'s normal here', calorieDelta: 70, healthDelta: 0, armDelta: 0, msg: 'Caught + ate several paralarvae. Cephalopods don\'t form sentimental bonds. +70 cal.', failChance: 0.1 },
            { id: 'ignore', label: '😐 Let them pass', calorieDelta: 0, healthDelta: -2, armDelta: 0, msg: 'Moved on, getting hungrier (-2 health).', failChance: 0 } ] },
        { type: 'hunt', title: 'Cooperative hunt opportunity — a grouper signals interest', emoji: '🤝',
          species: ['dayOcto'],
          detail: 'A peacock grouper hovers nearby, fixing you with a meaningful stare. In your species, this is the recognized invitation to cooperative hunt — you flush prey from crevices, the fish ambushes escapees, both eat.',
          options: [
            { id: 'cooperate', label: '🤝 Accept the cooperation', calorieDelta: 70, healthDelta: 0, armDelta: 0, msg: 'Flushed shrimp from coral; grouper caught half + you got half. +70 cal. The fish nuzzles in thanks (or accountability).', failChance: 0.15 },
            { id: 'solo', label: '🐙 Hunt alone instead', calorieDelta: 35, healthDelta: 0, armDelta: 0, msg: 'Solo run — less efficient but no shared prey. +35 cal.', failChance: 0.3 } ] },

        // ─── PREDATOR ENCOUNTERS ───
        { type: 'predator', title: 'A reef shark patrols nearby', emoji: '🦈',
          species: ['commonOcto', 'mimicOcto', 'dayOcto', 'cuttlefish', 'humboldt', 'firefly', 'bobtail', 'coconut'],
          detail: 'Visual + electroreception sensors hunting. It hasn\'t spotted you yet, but it\'s close — within 5 meters.',
          options: [
            { id: 'freeze', label: '🎭 Camouflage + freeze', calorieDelta: -3, healthDelta: 0, armDelta: 0, msg: 'Held still + matched substrate. Shark passed without noticing. -3 cal (the chromatophore burst).', failChance: 0.2, failMsg: 'Shark spotted you mid-color-change. Bit your mantle (-25 health).', failHealthDelta: -25 },
            { id: 'ink', label: '🌫️ Ink + flee', calorieDelta: -10, healthDelta: 0, armDelta: 0, msg: 'Discharged ink + jet-fled. Lost the shark. -10 cal but alive.', failChance: 0.1, failMsg: 'Shark followed your trail anyway. -20 health from a grazing bite.', failHealthDelta: -20 },
            { id: 'mimic', label: '🎭 Mimicry (mimic octopus only — pose as sea snake)', calorieDelta: -5, healthDelta: 0, armDelta: 0, msg: 'Shifted into sea-snake pose. Shark veered away (sea snakes are venomous). -5 cal.', failChance: 0.1 } ] },
        { type: 'predator', title: 'A moray eel emerges from a crevice', emoji: '🐍',
          species: ['commonOcto', 'mimicOcto', 'coconut', 'dayOcto', 'blueRing', 'bobtail'],
          detail: 'It saw you. You\'re in arm-reach of its strike radius. Chemosense + tactile hunter — camouflage is useless now.',
          options: [
            { id: 'autotomy', label: '✂️ Autotomy — sacrifice an arm', calorieDelta: -5, healthDelta: -10, armDelta: -1, msg: 'Detached an arm — it wriggles, distracting the eel. You escaped. Arm will regrow in 2-3 months. -1 arm.', failChance: 0.1, failMsg: 'Eel ignored the arm + struck you (-30 health).', failHealthDelta: -30 },
            { id: 'jet', label: '🚀 Jet escape', calorieDelta: -8, healthDelta: 0, armDelta: 0, msg: 'Explosive jet — eel struck where you USED to be. -8 cal.', failChance: 0.3, failMsg: 'Eel anticipated the jet direction. Bit through your mantle (-35 health).', failHealthDelta: -35 },
            { id: 'venom', label: '☠️ Venom counter-strike (blue-ringed only)', calorieDelta: -2, healthDelta: 0, armDelta: 0, msg: 'Flashed warning rings + bit. Eel paralyzed within seconds. You\'re alive. -2 cal.', failChance: 0.05 } ] },
        { type: 'predator', title: 'A sea otter dives down through the kelp', emoji: '🦦',
          species: ['giantPac', 'commonOcto'],
          detail: 'Otters are persistent + intelligent. It already knows there\'s octopus in this area. It will dive repeatedly + use its hands to pry open hiding spots.',
          options: [
            { id: 'ink-jet', label: '🌫️ Ink + jet away', calorieDelta: -12, healthDelta: 0, armDelta: 0, msg: 'Inked the water + jetted to a different reef section. Otter lost the trail. -12 cal.', failChance: 0.25, failMsg: 'Otter chased through the ink + caught a tentacle (-15 health, lost an arm).', failHealthDelta: -15, failArmDelta: -1 },
            { id: 'hideout', label: '🕳️ Crawl into a deep crevice', calorieDelta: -3, healthDelta: 0, armDelta: 0, msg: 'Wedged into a narrow crevice — otter can\'t reach. Wait 20 minutes + emerge. -3 cal.', failChance: 0.45, failMsg: 'Otter pried with its hands + extracted you (-40 health).', failHealthDelta: -40 } ] },
        { type: 'predator', title: 'Dolphin pod overhead — echolocation pinging closer', emoji: '🐬',
          species: ['humboldt', 'cuttlefish', 'commonOcto', 'firefly'],
          detail: 'Active sonar means ink is useless. Camouflage is useless. They know exactly where you are.',
          options: [
            { id: 'depth', label: '⬇️ Dive deep — break their depth limit', calorieDelta: -15, healthDelta: 0, armDelta: 0, msg: 'Sprinted down 200m. Dolphins can\'t follow — they need to surface for air. -15 cal.', failChance: 0.15, failMsg: 'A young dolphin matched the dive. Caught you (-30 health).', failHealthDelta: -30 },
            { id: 'jet-side', label: '🚀 Jet sideways at speed', calorieDelta: -18, healthDelta: 0, armDelta: 0, msg: 'Fast lateral jet broke the pod\'s formation. Got away. -18 cal.', failChance: 0.4, failMsg: 'Pod coordinated; another dolphin intercepted (-25 health).', failHealthDelta: -25 } ] },
        { type: 'predator', title: 'A sperm whale\'s sonar pings the deep', emoji: '🐋',
          species: ['giantSquid', 'colossal', 'humboldt'],
          detail: 'Sperm whales dive to 2000m to hunt giant + colossal squid. Their sonar penetrates the dark + the depth + the ink. This is the apex threat your species faces.',
          options: [
            { id: 'depth-deeper', label: '⬇️ Descend even deeper', calorieDelta: -20, healthDelta: 0, armDelta: 0, msg: 'Pushed below 2500m. Whale gave up + surfaced. -20 cal.', failChance: 0.25, failMsg: 'Whale stayed with you. Crushing bite (-50 health).', failHealthDelta: -50 },
            { id: 'tentacle-fight', label: '🦑 Fight back — wrap the whale', calorieDelta: -25, healthDelta: -20, armDelta: 0, msg: 'Wrapped the whale\'s head with hooked tentacles. It surfaced + tried to scrape you off. You escaped at the cost of injury (-20 health).', failChance: 0.6, failMsg: 'Whale shook you off + bit you in half (-100 health = lethal).', failHealthDelta: -100 } ] },
        { type: 'predator', title: 'A larger octopus claims this territory', emoji: '🐙',
          species: ['commonOcto', 'mimicOcto', 'coconut', 'blueRing', 'bobtail', 'dayOcto'],
          detail: 'A larger member of your species — or a larger species entirely. Cephalopod cannibalism is normal. The bigger animal usually wins.',
          options: [
            { id: 'retreat', label: '🏃 Back away slowly', calorieDelta: -5, healthDelta: 0, armDelta: 0, msg: 'Avoided confrontation. Found a different territory. -5 cal.', failChance: 0.1 },
            { id: 'venom', label: '☠️ Venom strike (blue-ringed only)', calorieDelta: -3, healthDelta: 0, armDelta: 0, msg: 'Flashed rings + bit. Larger octopus is paralyzed + dying. Territory taken. -3 cal.', failChance: 0.1 },
            { id: 'fight', label: '⚔️ Fight for territory', calorieDelta: -15, healthDelta: -25, armDelta: 0, msg: 'Won the fight but bloodied. -25 health.', failChance: 0.55, failMsg: 'Lost the fight + an arm (-40 health, -1 arm).', failHealthDelta: -40, failArmDelta: -1 } ] },

        // ─── ENVIRONMENTAL ───
        { type: 'environment', title: 'Low tide — water is receding', emoji: '🌅',
          species: ['commonOcto', 'mimicOcto', 'coconut', 'blueRing', 'dayOcto'],
          detail: 'Low tide leaves you exposed. Birds + crabs can reach you. Need to find shelter or move with the water.',
          options: [
            { id: 'shelter', label: '🕳️ Wedge into a deep crevice', calorieDelta: -4, healthDelta: 0, armDelta: 0, msg: 'Found a safe pocket. Wait it out. -4 cal.', failChance: 0.05 },
            { id: 'migrate', label: '🌊 Move with the receding water', calorieDelta: -10, healthDelta: 0, armDelta: 0, msg: 'Followed deeper water. -10 cal (effort).', failChance: 0.1 } ] },
        { type: 'environment', title: 'A storm churns the water', emoji: '⛈️',
          species: ['commonOcto', 'mimicOcto', 'coconut', 'cuttlefish', 'dayOcto', 'blueRing', 'bobtail', 'firefly'],
          detail: 'Storm surge + sediment fills the water. Visibility near zero. Predators can\'t hunt — but neither can you. Rest mode.',
          options: [
            { id: 'rest', label: '😴 Den up + rest', calorieDelta: -2, healthDelta: 5, armDelta: 0, msg: 'Sheltered in den. Slight recovery (+5 health). -2 cal.', failChance: 0.05 } ] },
        { type: 'environment', title: 'A current pushes you off-course', emoji: '🌊',
          species: ['commonOcto', 'humboldt', 'giantSquid', 'cuttlefish', 'mimicOcto'],
          detail: 'Strong current — you can either fight it (expensive) or drift with it (uncertain destination).',
          options: [
            { id: 'fight', label: '🚀 Jet against the current', calorieDelta: -18, healthDelta: 0, armDelta: 0, msg: 'Held your position. -18 cal but kept your territory.', failChance: 0.1 },
            { id: 'drift', label: '🌊 Drift with it', calorieDelta: -3, healthDelta: 0, armDelta: 0, msg: 'Landed in a new area — might be opportunity, might be danger. -3 cal.', failChance: 0.2, failMsg: 'Drifted into a more dangerous neighborhood (-10 health).', failHealthDelta: -10 } ] },
        { type: 'environment', title: 'You find an empty den with good cover', emoji: '🕳️',
          species: ['commonOcto', 'mimicOcto', 'coconut', 'blueRing', 'dayOcto', 'giantPac'],
          detail: 'An abandoned crevice with the right size for your body. Could be a safe rest spot. Smells okay (no predator scent).',
          options: [
            { id: 'rest', label: '😴 Den up + rest', calorieDelta: -1, healthDelta: 8, armDelta: 0, msg: 'Resting in safety. +8 health, -1 cal.', failChance: 0.03 },
            { id: 'skip', label: '🐙 Keep exploring', calorieDelta: 0, healthDelta: 0, armDelta: 0, msg: 'Moved on, looking for opportunity.', failChance: 0 } ] },

        // ─── SOCIAL ───
        { type: 'social', title: 'A potential mate signals nearby', emoji: '💕',
          species: ['commonOcto', 'mimicOcto', 'cuttlefish', 'dayOcto', 'giantPac'],
          detail: 'A receptive female (or male, depending on your sex) displays mating colors. In your species, mating triggers the optic gland senescence cascade — you\'ll die within weeks. But the genes get passed on.',
          options: [
            { id: 'mate', label: '💕 Mate — accept the death sentence', calorieDelta: -20, healthDelta: -10, armDelta: 0, msg: 'Successfully mated. Optic gland will trigger senescence in 2-4 weeks. -20 cal + injury (-10 health) from coupling.', failChance: 0.15, failMsg: 'Rejected by the partner (or eaten — sexual cannibalism happens). -25 health.', failHealthDelta: -25 },
            { id: 'pass', label: '🐙 Pass — not ready', calorieDelta: 0, healthDelta: 0, armDelta: 0, msg: 'Moved on. Will have more chances if you live long enough.', failChance: 0 } ] },
        { type: 'social', title: 'A juvenile of your species watches from a distance', emoji: '🐙',
          species: ['commonOcto', 'mimicOcto', 'dayOcto'],
          detail: 'A smaller, younger cephalopod. Could be food (cannibalism is normal) or could be your own offspring (low probability — most octopuses don\'t know their parents). Hard to tell.',
          options: [
            { id: 'eat', label: '🍽️ Eat — instinct says yes', calorieDelta: 50, healthDelta: 0, armDelta: 0, msg: 'Caught + consumed it. +50 cal. No sentimental attachment to conspecifics.', failChance: 0.2, failMsg: 'It escaped into a crevice. -8 cal effort.' },
            { id: 'ignore', label: '😐 Leave it alone', calorieDelta: 0, healthDelta: 0, armDelta: 0, msg: 'Moved on. The juvenile continues its own day.', failChance: 0 } ] }
      ];

      function getApplicableEncounters(speciesId) {
        return ENCOUNTER_TEMPLATES.filter(function(t) { return t.species.indexOf(speciesId) !== -1; });
      }

      function generateEncounter(speciesId) {
        var pool = getApplicableEncounters(speciesId);
        if (pool.length === 0) return null;
        // Bias slightly toward hunting (50%) vs predator (30%) vs environment (15%) vs social (5%)
        var huntings = pool.filter(function(t) { return t.type === 'hunt'; });
        var predators = pool.filter(function(t) { return t.type === 'predator'; });
        var environments = pool.filter(function(t) { return t.type === 'environment'; });
        var socials = pool.filter(function(t) { return t.type === 'social'; });
        var r = Math.random();
        var chosen;
        if (r < 0.5 && huntings.length > 0) chosen = huntings[Math.floor(Math.random() * huntings.length)];
        else if (r < 0.8 && predators.length > 0) chosen = predators[Math.floor(Math.random() * predators.length)];
        else if (r < 0.95 && environments.length > 0) chosen = environments[Math.floor(Math.random() * environments.length)];
        else if (socials.length > 0) chosen = socials[Math.floor(Math.random() * socials.length)];
        else chosen = pool[Math.floor(Math.random() * pool.length)];
        return chosen;
      }

      function startDay(speciesId) {
        var enc = generateEncounter(speciesId);
        setCL({
          dayActive: true,
          daySpeciesId: speciesId,
          dayEncountersDone: 0,
          dayCalories: 100,
          dayHealth: 100,
          dayArmsLost: 0,
          dayCurrentEncounter: enc,
          dayLog: [],
          dayEnded: null
        });
        clAnnounce('Day started as ' + speciesId);
        awardXP(3);
      }

      function chooseDayOption(optionId) {
        var current = d.dayCurrentEncounter;
        if (!current) return;
        var option = current.options.find(function(o) { return o.id === optionId; });
        if (!option) return;
        // Resolve: random check vs failChance
        var failed = Math.random() < (option.failChance || 0);
        var calDelta = failed && option.failMsg ? (option.calorieDelta || 0) : option.calorieDelta;
        var healthDelta = failed && option.failHealthDelta != null ? option.failHealthDelta : option.healthDelta;
        var armDelta = failed && option.failArmDelta != null ? option.failArmDelta : option.armDelta;
        var msg = failed && option.failMsg ? option.failMsg : option.msg;
        setCL(function(prior) {
          var newCal = (prior.dayCalories || 100) + (calDelta || 0);
          var newHealth = (prior.dayHealth || 100) + (healthDelta || 0);
          var newArms = (prior.dayArmsLost || 0) - (armDelta || 0); // armDelta is negative when lost
          var newDone = (prior.dayEncountersDone || 0) + 1;
          // Slight passive calorie drain per encounter
          newCal -= 5;
          // Check end conditions
          var ended = null;
          if (newHealth <= 0) ended = 'killed';
          else if (newCal <= 0) ended = 'starved';
          else if (newArms >= 4) ended = 'killed'; // lost too many arms
          else if (newDone >= 10) ended = 'survived';
          // Generate next encounter if not ended
          var nextEnc = ended ? null : generateEncounter(prior.daySpeciesId);
          var newLog = (prior.dayLog || []).slice();
          newLog.push({
            type: current.type, title: current.title, emoji: current.emoji,
            choice: option.label, outcome: msg, failed: failed,
            calDelta: calDelta, healthDelta: healthDelta, armDelta: armDelta
          });
          if (newLog.length > 12) newLog = newLog.slice(-12);
          // Update bests if ended successfully
          var newBests = Object.assign({}, prior.dayBests || {});
          if (ended) {
            var prev = newBests[prior.daySpeciesId] || { bestEncountersSurvived: 0, daysSurvived: 0 };
            newBests[prior.daySpeciesId] = {
              bestEncountersSurvived: Math.max(prev.bestEncountersSurvived, newDone),
              daysSurvived: prev.daysSurvived + (ended === 'survived' ? 1 : 0)
            };
          }
          return {
            dayCalories: Math.max(0, Math.min(200, newCal)),
            dayHealth: Math.max(0, Math.min(100, newHealth)),
            dayArmsLost: newArms,
            dayEncountersDone: newDone,
            dayCurrentEncounter: nextEnc,
            dayLog: newLog,
            dayEnded: ended,
            dayBests: newBests,
            dayTotalDaysPlayed: ended ? (prior.dayTotalDaysPlayed || 0) + 1 : (prior.dayTotalDaysPlayed || 0)
          };
        });
        awardXP(failed ? 1 : 2);
      }

      function renderDayInLife() {
        if (!d.dayActive) return renderDayLobby();
        if (d.dayEnded) return renderDayEnded();
        return renderDayActive();
      }

      function renderDayLobby() {
        // Filter to species with realistic predator/prey integration (those with both hunt + predator templates)
        var REALISTIC = SPECIES.filter(function(s) {
          var apps = getApplicableEncounters(s.id);
          var hasHunt = apps.some(function(t) { return t.type === 'hunt'; });
          var hasPredator = apps.some(function(t) { return t.type === 'predator'; });
          return hasHunt && hasPredator;
        });
        var bests = d.dayBests || {};
        return h('div', null,
          panelHeader('🌅 Day in the Life — Hard Mode',
            'The integrated reality. Pick a species, live one day, face 10 random encounters mixing hunting opportunities, predator threats, environmental events, and social moments. Hunger, injury, and arm loss all carry through. Die if calories OR health hit zero. Survive all 10 = success.'),

          h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid #fb923c' }) },
            h('div', { style: subheaderStyle() }, '🎯 Why this mode exists'),
            h('div', { style: { color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'The Hunter Sim and Evasion Sim are pedagogically useful but artificial — in reality, a common octopus might hunt 3 crabs, evade a moray eel, lose an arm to a lingcod, and find a den before nightfall. ALL IN ONE DAY. This mode recovers the integrated lived rhythm. Some species (vampire squid, dumbo, nautilus) don\'t face significant predator pressure in reality + are excluded from this mode — but every species shown here lives the genuine double life.')),

          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '📊 Your survival record'),
            h('div', { style: { display: 'flex', gap: 24, flexWrap: 'wrap' } },
              h('div', null,
                h('div', { style: { fontSize: 28, fontWeight: 900, color: '#86efac', fontFamily: 'ui-monospace, Menlo, monospace' } }, Object.values(bests).reduce(function(a, b) { return a + (b.daysSurvived || 0); }, 0)),
                h('div', { style: { fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Days fully survived')),
              h('div', null,
                h('div', { style: { fontSize: 28, fontWeight: 900, color: '#fca5a5', fontFamily: 'ui-monospace, Menlo, monospace' } }, d.dayTotalDaysPlayed || 0),
                h('div', { style: { fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Total days attempted'))),
            Object.keys(bests).length > 0 ?
              h('div', { style: { marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(100,116,139,0.2)' } },
                h('div', { style: { fontSize: 10, fontWeight: 800, color: '#fb923c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 } },
                  'Personal bests by species'),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
                  Object.keys(bests).map(function(sid) {
                    var sp = SPECIES.find(function(x) { return x.id === sid; });
                    if (!sp) return null;
                    var b = bests[sid];
                    return h('div', { key: sid,
                      style: { background: 'rgba(15,23,42,0.6)', padding: '6px 12px', borderRadius: 8,
                        border: '1px solid rgba(167,139,250,0.3)', fontSize: 11 } },
                      h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, sp.emoji),
                      h('span', { style: { color: '#fde68a', fontWeight: 700 } }, sp.name),
                      h('span', { style: { color: '#86efac', fontFamily: 'ui-monospace, Menlo, monospace', marginLeft: 8 } },
                        b.bestEncountersSurvived + '/10 best'));
                  }))) : null),

          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '🐙 Pick your species'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 } },
              REALISTIC.map(function(s) {
                var groupColor = s.group === 'octopus' ? '#a78bfa' : s.group === 'squid' ? '#38bdf8' : s.group === 'cuttlefish' ? '#fbbf24' : '#86efac';
                var b = bests[s.id];
                return h('button', { key: s.id,
                  onClick: function() { startDay(s.id); },
                  style: { padding: '12px 14px', textAlign: 'left',
                    background: 'rgba(15,23,42,0.6)', color: '#fde68a',
                    borderTop: '1px solid rgba(100,116,139,0.3)', borderRight: '1px solid rgba(100,116,139,0.3)', borderBottom: '1px solid rgba(100,116,139,0.3)', borderLeft: '4px solid ' + groupColor,
                    borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 24, lineHeight: 1 } }, s.emoji),
                    h('div', null,
                      h('div', { style: { fontSize: 14, fontWeight: 800, color: '#c7d2fe' } }, s.name),
                      h('div', { style: { fontSize: 10, fontStyle: 'italic', color: '#94a3b8', marginTop: 2 } },
                        'Intelligence: ' + s.intelligence + '/10 · Camo: ' + s.camouflageRank + '/10'))),
                  b ? h('div', { style: { fontSize: 10, color: '#86efac', fontFamily: 'ui-monospace, Menlo, monospace' } },
                    'Best: ' + b.bestEncountersSurvived + '/10 · Days survived: ' + b.daysSurvived) : null);
              })))
        );
      }

      function renderDayActive() {
        var sp = SPECIES.find(function(x) { return x.id === d.daySpeciesId; });
        var enc = d.dayCurrentEncounter;
        if (!sp || !enc) { setCL({ dayActive: false, dayEnded: null }); return null; }
        var cal = d.dayCalories || 0;
        var hp = d.dayHealth || 0;
        var arms = d.dayArmsLost || 0;
        var done = d.dayEncountersDone || 0;
        // Filter options to species applicability (some options say "X only")
        var availOptions = enc.options.filter(function(o) {
          // Filter out species-specific options that don't apply
          if (o.id === 'mimic' && sp.id !== 'mimicOcto') return false;
          if (o.id === 'venom' && sp.id !== 'blueRing') return false;
          if (o.id === 'hypnotic' && sp.id !== 'cuttlefish') return false;
          if (o.id === 'filter' && !(sp.id === 'vampireSquid' || sp.id === 'dumbo')) return false;
          if (o.id === 'cooperate' && sp.id !== 'dayOcto') return false;
          return true;
        });
        return h('div', null,
          panelHeader(sp.emoji + ' ' + sp.name + ' — encounter ' + (done + 1) + ' of 10',
            'You\'re mid-day. Stats below show your current state. Survive all 10 encounters to complete the day.'),

          // HUD
          h('div', { style: cardStyle() },
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 } },
              [
                { lbl: '🍽️ Calories', val: cal, max: 200, color: cal > 50 ? '#86efac' : cal > 25 ? '#fbbf24' : '#fca5a5' },
                { lbl: '❤️ Health', val: hp, max: 100, color: hp > 60 ? '#86efac' : hp > 30 ? '#fbbf24' : '#fca5a5' },
                { lbl: '🦑 Arms lost', val: arms, max: 4, color: arms === 0 ? '#86efac' : arms < 3 ? '#fbbf24' : '#fca5a5', isLoss: true },
                { lbl: '⏳ Progress', val: done, max: 10, color: '#a78bfa' }
              ].map(function(stat, i) {
                var pct = stat.isLoss ? ((stat.max - stat.val) / stat.max * 100) : (stat.val / stat.max * 100);
                return h('div', { key: i, style: { background: 'rgba(15,23,42,0.6)', padding: '10px 12px', borderRadius: 8 } },
                  h('div', { style: { fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }, stat.lbl),
                  h('div', { style: { fontSize: 18, fontWeight: 900, color: stat.color, fontFamily: 'ui-monospace, Menlo, monospace', marginBottom: 4 } },
                    stat.val + ' / ' + stat.max),
                  h('div', { style: { height: 4, background: 'rgba(100,116,139,0.3)', borderRadius: 2 } },
                    h('div', { style: { height: '100%', width: pct + '%', background: stat.color, borderRadius: 2 } })));
              }))),

          // Current encounter
          h('div', { style: Object.assign({}, cardStyle(), {
            borderLeft: '4px solid ' +
              (enc.type === 'hunt' ? '#fbbf24' : enc.type === 'predator' ? '#fca5a5' : enc.type === 'environment' ? '#38bdf8' : '#f472b6')
          }) },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 } },
              h('span', { 'aria-hidden': 'true', style: { fontSize: 36, lineHeight: 1 } }, enc.emoji),
              h('div', null,
                h('div', { style: { fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' } },
                  enc.type === 'hunt' ? 'Hunting Opportunity' : enc.type === 'predator' ? '⚠️ Predator Encounter' : enc.type === 'environment' ? 'Environmental' : 'Social'),
                h('div', { style: { fontSize: 16, fontWeight: 800, color: '#fde68a', marginTop: 2 } }, enc.title))),
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 14 } }, enc.detail),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              availOptions.map(function(opt) {
                return h('button', { key: opt.id,
                  onClick: function() { chooseDayOption(opt.id); },
                  style: { padding: '12px 16px', textAlign: 'left',
                    background: 'rgba(15,23,42,0.6)', color: '#fde68a',
                    border: '1px solid rgba(167,139,250,0.3)',
                    borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    transition: 'background 0.15s' } },
                  opt.label);
              }))),

          // Recent log
          (d.dayLog && d.dayLog.length > 0) ? h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '📜 Day so far'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' } },
              d.dayLog.slice().reverse().map(function(entry, i) {
                return h('div', { key: i,
                  style: { background: 'rgba(15,23,42,0.5)', padding: '8px 12px', borderRadius: 6,
                    borderLeft: '3px solid ' + (entry.failed ? '#fca5a5' : '#86efac'), fontSize: 11 } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 } },
                    h('span', { 'aria-hidden': 'true' }, entry.emoji),
                    h('span', { style: { fontWeight: 700, color: '#fde68a' } }, entry.title)),
                  h('div', { style: { color: '#cbd5e1', lineHeight: 1.5 } }, entry.outcome));
              }))) : null,

          h('div', { style: { display: 'flex', justifyContent: 'center', marginTop: 8 } },
            h('button', { onClick: function() { if (confirm('Abandon this day? Your progress will be lost.')) setCL({ dayActive: false, dayEnded: null }); },
              style: { padding: '8px 16px', background: 'transparent', color: '#fca5a5',
                border: '1px solid rgba(220,38,38,0.4)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' } },
              '✕ Abandon day'))
        );
      }

      function renderDayEnded() {
        var sp = SPECIES.find(function(x) { return x.id === d.daySpeciesId; });
        var ended = d.dayEnded;
        var done = d.dayEncountersDone || 0;
        var survived = ended === 'survived';
        var heroEmoji = survived ? '🏆' : ended === 'starved' ? '💀' : ended === 'killed' ? '☠️' : '💀';
        var heroColor = survived ? '#86efac' : '#fca5a5';
        var heroLabel = survived ? 'Survived the day' :
                        ended === 'starved' ? 'Starved' :
                        ended === 'killed' ? 'Killed' : 'Died';
        var heroDetail = survived ?
          'You made it through 10 encounters. In the real ocean, this is roughly one day in your life — most cephalopods live ~365-700 days like this before the optic gland triggers their post-reproductive death cascade.' :
          ended === 'starved' ? 'Calories hit zero. Most cephalopod deaths in the wild are predation, but starvation is the second most common — especially during recovery from injury or environmental stress.' :
          'Predation event. This is how most cephalopods die. The senescence cycle is what kills survivors; predation is what kills everyone else.';
        return h('div', null,
          panelHeader(sp.emoji + ' ' + sp.name + ' — day ended',
            'Encounter ' + done + ' of 10 was your last. Below: the final state + the day\'s full log.'),

          h('div', { style: Object.assign({}, cardStyle(), { textAlign: 'center', padding: 40,
            background: survived ? 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(15,23,42,0.6))'
                                 : 'linear-gradient(135deg, rgba(220,38,38,0.18), rgba(15,23,42,0.6))',
            borderLeft: '4px solid ' + (survived ? '#22c55e' : '#dc2626') }) },
            h('div', { 'aria-hidden': 'true', style: { fontSize: 80, lineHeight: 1, marginBottom: 8 } }, heroEmoji),
            h('div', { style: { fontSize: 28, fontWeight: 900, color: heroColor, letterSpacing: '-0.01em', marginBottom: 8 } }, heroLabel),
            h('div', { style: { fontSize: 13, color: '#cbd5e1', lineHeight: 1.7, maxWidth: 540, marginLeft: 'auto', marginRight: 'auto' } }, heroDetail)),

          // Final stats
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '📊 Final state'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 } },
              [
                { lbl: 'Encounters faced', val: done + ' / 10', color: '#a78bfa' },
                { lbl: 'Final calories', val: d.dayCalories || 0, color: '#fbbf24' },
                { lbl: 'Final health', val: d.dayHealth || 0, color: '#fca5a5' },
                { lbl: 'Arms lost', val: d.dayArmsLost || 0, color: '#fb923c' }
              ].map(function(stat, i) {
                return h('div', { key: i, style: { background: 'rgba(15,23,42,0.5)', padding: '10px 12px', borderRadius: 8, borderLeft: '3px solid ' + stat.color } },
                  h('div', { style: { fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }, stat.lbl),
                  h('div', { style: { fontSize: 22, fontWeight: 900, color: stat.color, fontFamily: 'ui-monospace, Menlo, monospace' } }, stat.val));
              }))),

          // Full day log
          (d.dayLog && d.dayLog.length > 0) ? h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '📜 The full day'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              d.dayLog.map(function(entry, i) {
                return h('div', { key: i,
                  style: { background: 'rgba(15,23,42,0.5)', padding: '8px 12px', borderRadius: 6,
                    borderLeft: '3px solid ' + (entry.failed ? '#fca5a5' : '#86efac'), fontSize: 11 } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 } },
                    h('span', { 'aria-hidden': 'true' }, entry.emoji),
                    h('span', { style: { fontWeight: 700, color: '#fde68a' } }, '#' + (i + 1) + ' — ' + entry.title)),
                  h('div', { style: { color: '#cbd5e1', lineHeight: 1.5, marginBottom: 2 } }, entry.outcome),
                  h('div', { style: { fontSize: 10, color: '#94a3b8', fontFamily: 'ui-monospace, Menlo, monospace' } },
                    'Chose: ' + entry.choice));
              }))) : null,

          h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' } },
            h('button', { onClick: function() { startDay(d.daySpeciesId); },
              style: { padding: '12px 26px', background: '#a78bfa', color: '#1c1410',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer' } },
              '🔁 Another day as ' + sp.name),
            h('button', { onClick: function() { setCL({ dayActive: false, dayEnded: null }); },
              style: { padding: '12px 24px', background: 'transparent', color: '#c7d2fe',
                border: '1px solid rgba(167,139,250,0.4)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' } },
              '🐙 Pick a different species'))
        );
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 6 — CAMOUFLAGE LAB (chromatophore biology deep dive)
      // ═══════════════════════════════════════════════════════
      function renderCamouflageLab() {
        var scene = d.camoScene || 'sand';
        var chro = d.camoChromatophore != null ? d.camoChromatophore : 50;
        var irid = d.camoIridophore != null ? d.camoIridophore : 30;
        var leuc = d.camoLeucophore != null ? d.camoLeucophore : 30;
        var pattern = d.camoPattern || 'uniform';
        // Scene definitions — target appearance for each
        var SCENES = {
          sand: { name: 'Sandy bottom', emoji: '🏖️', target: { chro: 30, irid: 10, leuc: 70, pattern: 'uniform' }, bg: '#e6c884', desc: 'Light, smooth, uniform. Pale base + minimal pattern. Leucophores do the heavy lifting.' },
          reef: { name: 'Coral reef', emoji: '🪸', target: { chro: 70, irid: 40, leuc: 30, pattern: 'mottled' }, bg: '#c97a48', desc: 'Warm, vibrant, complex. Chromatophores dominate; iridophores add subtle blue/green flashes.' },
          kelp: { name: 'Kelp forest', emoji: '🌿', target: { chro: 55, irid: 60, leuc: 20, pattern: 'disruptive' }, bg: '#3d7a3d', desc: 'Dappled green light, vertical stripes of shadow. Iridophores reflect ambient green; disruptive pattern breaks outline.' },
          rock: { name: 'Rocky substrate', emoji: '🪨', target: { chro: 60, irid: 25, leuc: 40, pattern: 'mottled' }, bg: '#6b6258', desc: 'Cool grays + browns, irregular pattern. Moderate everything — the chameleon of cephalopod scenes.' }
        };
        var current = SCENES[scene] || SCENES.sand;
        var target = current.target;
        // Compute match (how close our skin is to the target)
        var chroDiff = Math.abs(chro - target.chro);
        var iridDiff = Math.abs(irid - target.irid);
        var leucDiff = Math.abs(leuc - target.leuc);
        var avgDiff = (chroDiff + iridDiff + leucDiff) / 3;
        var patternMatch = pattern === target.pattern;
        var matchScore = Math.round(Math.max(0, 100 - avgDiff * 1.4) * (patternMatch ? 1 : 0.6));
        var verdict = matchScore >= 85 ? { color: '#86efac', label: 'Invisible — exceptional match.' } :
                      matchScore >= 70 ? { color: '#fbbf24', label: 'Close. A predator might miss you.' } :
                      matchScore >= 50 ? { color: '#fb923c', label: 'Visible silhouette — risky.' } :
                                         { color: '#fca5a5', label: 'Stands out. Try the target settings.' };
        // Render a skin patch composing the 3 layers
        function renderSkinPatch(c, i, l, pat, sceneBg) {
          // chromatophore = base color saturation
          // iridophore = blue/green sheen on top
          // leucophore = white wash brightening
          var baseR = 60 + (c / 100) * 140;
          var baseG = 40 + (c / 100) * 80;
          var baseB = 20 + (c / 100) * 50;
          // Leucophore lightens everything
          baseR += (l / 100) * 100;
          baseG += (l / 100) * 100;
          baseB += (l / 100) * 100;
          baseR = Math.min(255, baseR); baseG = Math.min(255, baseG); baseB = Math.min(255, baseB);
          var hex = '#' + [baseR, baseG, baseB].map(function(v) { var x = Math.round(v).toString(16); return x.length === 1 ? '0' + x : x; }).join('');
          // Iridophore overlay color
          var iridAlpha = (i / 100) * 0.4;
          var patElements = null;
          if (pat === 'mottled') {
            patElements = h('g', null,
              h('circle', { cx: 40, cy: 50, r: 15, fill: 'rgba(0,0,0,0.18)' }),
              h('circle', { cx: 100, cy: 70, r: 12, fill: 'rgba(0,0,0,0.18)' }),
              h('circle', { cx: 160, cy: 45, r: 14, fill: 'rgba(0,0,0,0.18)' }),
              h('circle', { cx: 130, cy: 95, r: 10, fill: 'rgba(0,0,0,0.18)' }));
          } else if (pat === 'disruptive') {
            patElements = h('g', null,
              h('rect', { x: 30, y: 0, width: 24, height: 130, fill: 'rgba(0,0,0,0.25)' }),
              h('rect', { x: 90, y: 0, width: 30, height: 130, fill: 'rgba(0,0,0,0.25)' }),
              h('rect', { x: 150, y: 0, width: 22, height: 130, fill: 'rgba(0,0,0,0.25)' }));
          } else if (pat === 'deimatic') {
            // Two large dramatic "eye spots" — startle display
            patElements = h('g', null,
              h('circle', { cx: 60, cy: 60, r: 18, fill: 'rgba(255,255,255,0.85)' }),
              h('circle', { cx: 60, cy: 60, r: 10, fill: '#1c1410' }),
              h('circle', { cx: 140, cy: 60, r: 18, fill: 'rgba(255,255,255,0.85)' }),
              h('circle', { cx: 140, cy: 60, r: 10, fill: '#1c1410' }));
          }
          return h('svg', { width: 200, height: 130, viewBox: '0 0 200 130', 'aria-hidden': 'true',
            style: { borderRadius: 10, border: '1px solid rgba(100,116,139,0.3)' } },
            h('rect', { x: 0, y: 0, width: 200, height: 130, fill: hex }),
            patElements,
            iridAlpha > 0 ? h('rect', { x: 0, y: 0, width: 200, height: 130,
              fill: 'url(#iridGradient' + Math.round(i) + ')', opacity: iridAlpha }) : null,
            h('defs', null,
              h('linearGradient', { id: 'iridGradient' + Math.round(i), x1: 0, y1: 0, x2: 1, y2: 1 },
                h('stop', { offset: '0%', stopColor: '#0ea5e9' }),
                h('stop', { offset: '50%', stopColor: '#a78bfa' }),
                h('stop', { offset: '100%', stopColor: '#10b981' })))
          );
        }
        return h('div', null,
          panelHeader('🎨 Camouflage Lab',
            'Cephalopod skin is the most sophisticated color-changing system in the animal kingdom. Three layers stacked: chromatophores (pigment sacs), iridophores (structural color reflectors), leucophores (white reflectors). They\'re mostly color-BLIND. Theory: they may sense color via skin opsins distributed across the body.'),

          // Educational primer on the 3 layers
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '🔬 The three skin layers'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 } },
              [
                { name: 'Chromatophore', emoji: '🔴', color: '#dc2626',
                  function: 'Pigment sac (red/yellow/black) surrounded by radial muscles. Muscles contract → sac expands → color shows. ~200 per square mm of skin.',
                  speed: 'Fastest layer — visible color change in ~70 ms.' },
                { name: 'Iridophore', emoji: '🌈', color: '#a78bfa',
                  function: 'Stacked protein plates (reflectin) that produce structural color via thin-film interference. Wavelength changes based on plate spacing.',
                  speed: 'Slower — seconds to minutes. Also produces polarized light cephalopods CAN see.' },
                { name: 'Leucophore', emoji: '⚪', color: '#f3f4f6',
                  function: 'Passive white reflector. Bounces ambient light back at whatever color the environment provides. Adapts color without needing nerves.',
                  speed: 'Passive — no active control. Reflects environment.' }
              ].map(function(layer, i) {
                return h('div', { key: i,
                  style: { background: 'rgba(15,23,42,0.5)', borderLeft: '3px solid ' + layer.color, padding: '12px 14px', borderRadius: 8 } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                    h('span', { style: { fontSize: 22 }, 'aria-hidden': 'true' }, layer.emoji),
                    h('div', { style: { fontSize: 13, fontWeight: 800, color: layer.color } }, layer.name)),
                  h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.55, marginBottom: 4 } }, layer.function),
                  h('div', { style: { fontSize: 10, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' } },
                    h('b', null, '⏱️ '), layer.speed));
              }))),

          // Scene + target picker
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '🏞️ Match the scene'),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 } },
              Object.keys(SCENES).map(function(sid) {
                var s = SCENES[sid];
                var active = scene === sid;
                return h('button', { key: sid,
                  onClick: function() { setCL({ camoScene: sid }); awardXP(1); },
                  'aria-pressed': active ? 'true' : 'false',
                  style: { padding: '10px 14px',
                    background: active ? 'rgba(99,102,241,0.3)' : 'rgba(15,23,42,0.5)',
                    color: active ? '#c7d2fe' : '#cbd5e1',
                    border: '1px solid ' + (active ? 'rgba(167,139,250,0.6)' : 'rgba(100,116,139,0.3)'),
                    borderLeft: '3px solid ' + s.bg,
                    borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6 } },
                  h('span', { 'aria-hidden': 'true' }, s.emoji), s.name);
              })),

            // Side-by-side: target vs your skin
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 14 } },
              h('div', null,
                h('div', { style: { fontSize: 10, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } }, '🎯 Target — ' + current.name),
                renderSkinPatch(target.chro, target.irid, target.leuc, target.pattern, current.bg),
                h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 6, fontFamily: 'ui-monospace, Menlo, monospace' } },
                  'C:' + target.chro + ' I:' + target.irid + ' L:' + target.leuc + ' · ' + target.pattern),
                h('div', { style: { fontSize: 10, color: '#cbd5e1', marginTop: 6, lineHeight: 1.55, fontStyle: 'italic' } }, current.desc)),
              h('div', null,
                h('div', { style: { fontSize: 10, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } }, '🐙 Your skin'),
                renderSkinPatch(chro, irid, leuc, pattern, current.bg),
                h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 6, fontFamily: 'ui-monospace, Menlo, monospace' } },
                  'C:' + chro + ' I:' + irid + ' L:' + leuc + ' · ' + pattern),
                h('div', { style: { fontSize: 10, color: verdict.color, marginTop: 6, fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 800 } },
                  'Match score: ' + matchScore + '%'))),

            // Layer sliders
            ['Chromatophore (pigment) — 0=relaxed → 100=fully expanded',
             'Iridophore (iridescence) — 0=off → 100=maximum reflection',
             'Leucophore (white) — 0=off → 100=full reflection'].map(function(lbl, idx) {
              var val = [chro, irid, leuc][idx];
              var key = ['camoChromatophore', 'camoIridophore', 'camoLeucophore'][idx];
              var sliderColor = ['#dc2626', '#a78bfa', '#f3f4f6'][idx];
              return h('div', { key: idx, style: { marginBottom: 10 } },
                h('label', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: 700 } },
                  h('span', null, lbl),
                  h('span', { style: { fontFamily: 'ui-monospace, Menlo, monospace', color: sliderColor } }, val + ' / 100')),
                h('input', { type: 'range', min: 0, max: 100, step: 1, value: val,
                  onChange: function(e) { var p = {}; p[key] = parseInt(e.target.value, 10); setCL(p); },
                  'aria-label': lbl,
                  style: { width: '100%', accentColor: sliderColor } }));
            }),

            // Pattern picker
            h('div', { style: { marginBottom: 12 } },
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6, fontWeight: 700 } }, 'Pattern type'),
              h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                ['uniform', 'mottled', 'disruptive', 'deimatic'].map(function(p) {
                  var active = pattern === p;
                  var labels = { uniform: 'Uniform', mottled: 'Mottled', disruptive: 'Disruptive (stripes)', deimatic: 'Deimatic (startle)' };
                  return h('button', { key: p,
                    onClick: function() { setCL({ camoPattern: p }); },
                    'aria-pressed': active ? 'true' : 'false',
                    style: { padding: '6px 12px',
                      background: active ? 'rgba(167,139,250,0.3)' : 'rgba(15,23,42,0.5)',
                      color: active ? '#c7d2fe' : '#cbd5e1',
                      border: '1px solid ' + (active ? 'rgba(167,139,250,0.6)' : 'rgba(100,116,139,0.3)'),
                      borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' } },
                    labels[p]);
                }))),

            // Verdict
            h('div', { style: { background: verdict.color + '15', border: '1px solid ' + verdict.color + '55',
              borderLeft: '4px solid ' + verdict.color, padding: '10px 14px', borderRadius: 8 } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: verdict.color, marginBottom: 3 } },
                matchScore + '% match'),
              h('div', { style: { fontSize: 11, color: '#e2e8f0', lineHeight: 1.55 } }, verdict.label),
              !patternMatch ? h('div', { style: { fontSize: 11, color: '#fb923c', marginTop: 6, lineHeight: 1.55 } },
                '💡 Pattern mismatch — target wants "' + target.pattern + '", you\'re showing "' + pattern + '". Pattern matters as much as color.') : null)),

          // Pattern reference card
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '📐 The 4 standard cephalopod display patterns (Hanlon, 2007)'),
            h('div', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.55, marginBottom: 14 } },
              'Roger Hanlon\'s 2007 paper classified all cephalopod skin displays into ~12 categories that collapse into 3 broad camouflage strategies + 1 startle category. Each works in different scenes.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 } },
              [
                { name: 'Uniform', emoji: '🟫', use: 'Open sand or smooth substrate. Blank canvas.', science: 'Single dominant color, no pattern. Easiest computationally but most visible against complex backgrounds.' },
                { name: 'Mottled', emoji: '🟤', use: 'Coral, rock, mixed-texture substrate.', science: 'Light + dark patches at scale matching substrate features. The default for most octopuses on most surfaces.' },
                { name: 'Disruptive', emoji: '⬛', use: 'Kelp, branching coral, vertical-structure habitats.', science: 'Bold stripes or geometric shapes that BREAK the body outline. Predator brain sees stripes, not octopus.' },
                { name: 'Deimatic (startle)', emoji: '👀', use: 'Last-resort escape. NOT camouflage — opposite.', science: 'Sudden high-contrast flash + false eyespots. Triggers predator startle reflex, buys 0.5s for escape.' }
              ].map(function(p, i) {
                return h('div', { key: i,
                  style: { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.3)',
                    borderLeft: '3px solid #a78bfa', padding: '10px 12px', borderRadius: 8 } },
                  h('div', { style: { fontSize: 12, fontWeight: 800, color: '#c7d2fe', marginBottom: 4 } },
                    p.emoji + ' ' + p.name),
                  h('div', { style: { fontSize: 11, color: '#fde68a', marginBottom: 4 } },
                    h('b', null, 'Use: '), p.use),
                  h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } }, p.science));
              })))
        );
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 7 — BIOLUMINESCENCE LAB
      // ═══════════════════════════════════════════════════════
      function renderBioluminescence() {
        var view = d.bioluxView || 'overview';
        var SUBS = [
          { id: 'overview', label: 'Chemistry', icon: '⚗️' },
          { id: 'photophores', label: 'Photophore Types', icon: '💡' },
          { id: 'symbiosis', label: 'Bacterial Symbiosis', icon: '🦠' },
          { id: 'counter', label: 'Counter-Illumination Sim', icon: '🌗' }
        ];
        var PHOTOPHORES = [
          { id: 'simple', name: 'Simple Diffuse', emoji: '⚪', color: '#cbd5e1',
            description: 'A sac of bioluminescent tissue (or bacteria) with no optical structures. Glows in all directions equally. Cheapest photophore design.',
            location: 'Often on body or arms in deep-sea species',
            example: 'Common in vampire squid + many deep-sea octopuses' },
          { id: 'lensed', name: 'Lensed', emoji: '🔦', color: '#fbbf24',
            description: 'Includes a transparent lens that focuses the light into a directed beam. Like a tiny flashlight built into the body. More expensive to grow but allows directional signaling.',
            location: 'Lateral body surface, arm tips',
            example: 'Firefly squid lateral organs for communication' },
          { id: 'mirrored', name: 'Mirrored Reflector', emoji: '🪞', color: '#a78bfa',
            description: 'Internal layer of guanine crystals (the same structural-color material as iridophores) acts as a mirror, concentrating light output in a specific direction.',
            location: 'Ventral surface (down-facing)',
            example: 'Many mesopelagic squid for counter-illumination' },
          { id: 'filtered', name: 'Color-Filtered', emoji: '🎨', color: '#0ea5e9',
            description: 'A pigmented filter layer over the photophore tunes the wavelength. Lets the animal produce a specific blue or green that matches downwelling sunlight wavelengths at depth.',
            location: 'Ventral (counter-illumination duty)',
            example: 'Firefly squid produce blue (peak ~470 nm) matching ocean light' },
          { id: 'symbiotic', name: 'Bacterial (Symbiotic)', emoji: '🦠', color: '#86efac',
            description: 'A chamber full of bioluminescent bacteria (typically Vibrio fischeri or Vibrio harveyi). The host provides nutrients + safe shelter; the bacteria provide light. The animal can control output via oxygen flow.',
            location: 'Specialized light organ near gills',
            example: 'Hawaiian bobtail squid (Euprymna scolopes) — the classic symbiosis model' },
          { id: 'ink', name: 'Bioluminescent Ink', emoji: '🌫️', color: '#1c1410',
            description: 'Some deep-sea cephalopods discharge bioluminescent material as a decoy — instead of (or in addition to) the dark ink of shallow species. The glow distracts the predator while the animal escapes.',
            location: 'Ink sac, ejected via siphon',
            example: 'Several deep-sea octopuses (Octopoteuthis) + some squid' }
        ];
        var depth = d.bioluxDepthFactor != null ? d.bioluxDepthFactor : 50;
        var belly = d.bioluxBellyIntensity != null ? d.bioluxBellyIntensity : 50;
        var matchScore = 100 - Math.abs(depth - belly);
        var matchVerdict = matchScore >= 90 ? { color: '#86efac', label: 'Silhouette erased — predator sees nothing.' } :
                           matchScore >= 70 ? { color: '#fbbf24', label: 'Close, faint silhouette visible.' } :
                           matchScore >= 40 ? { color: '#fb923c', label: 'Mismatch — predator sees you clearly.' } :
                                              { color: '#fca5a5', label: 'You\'re a beacon. Easy target.' };
        var hour = d.bioluxSymbiosisHour || 0;
        var phase = hour < 6 ? { name: 'Dawn — Expulsion + Reset', color: '#fbbf24', detail: 'Just before sunrise, the squid expels ~95% of its Vibrio fischeri bacterial population through the siphon, leaving only ~5% to repopulate. This daily flush is hypothesized to prevent bacterial overgrowth.' } :
                    hour < 12 ? { name: 'Day — Hidden + Repopulating', color: '#38bdf8', detail: 'During daylight hours, the squid hides buried in the sand. The remaining 5% of bacteria multiply rapidly back to full density in the warm, nutrient-rich light organ.' } :
                    hour < 18 ? { name: 'Late Day — Population Maxing', color: '#a78bfa', detail: 'By late afternoon, the bacterial population has fully recovered to ~10^9 cells in the light organ. The squid is ready to emerge for nighttime feeding.' } :
                    hour < 22 ? { name: 'Night — Counter-Illumination Active', color: '#86efac', detail: 'The squid emerges to hunt. Bacterial bioluminescence pours from the ventral light organ at ~moonlight brightness — matching downwelling moonlight to erase its silhouette from predators below.' } :
                                { name: 'Pre-Dawn — Returning to Substrate', color: '#fb923c', detail: 'The squid returns to its sandy hideout as light begins to creep across the eastern sky. The cycle prepares to reset at dawn.' };
        return h('div', null,
          panelHeader('✨ Bioluminescence Lab',
            'Cephalopods produce their own light. About 90% of deep-sea cephalopods are bioluminescent — vampire squid + firefly squid + glowing octopuses + the Hawaiian bobtail with its symbiotic bacterial partner. This module covers the chemistry, the photophore types, the bacterial symbiosis model, and an interactive counter-illumination simulator.'),

          h('div', { role: 'tablist', 'aria-label': 'Bioluminescence sub-sections',
            style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 } },
            SUBS.map(function(s) {
              var active = view === s.id;
              return h('button', { key: s.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
                onClick: function() { setCL({ bioluxView: s.id }); awardXP(1); },
                style: { padding: '8px 12px',
                  background: active ? 'rgba(99,102,241,0.3)' : 'rgba(15,23,42,0.5)',
                  color: active ? '#c7d2fe' : '#cbd5e1',
                  border: '1px solid ' + (active ? 'rgba(167,139,250,0.6)' : 'rgba(100,116,139,0.3)'),
                  borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6 } },
                h('span', { 'aria-hidden': 'true' }, s.icon), s.label);
            })),

          view === 'overview' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '⚗️ The reaction'),
              h('div', { style: { color: '#cbd5e1', fontSize: 13, lineHeight: 1.7, marginBottom: 14 } },
                h('p', { style: { margin: '0 0 12px 0' } },
                  'Bioluminescence is enzyme catalysis. A small molecule called ',
                  h('b', { style: { color: '#fbbf24' } }, 'luciferin'),
                  ' is oxidized by an enzyme called ',
                  h('b', { style: { color: '#fbbf24' } }, 'luciferase'),
                  ', and the energy released comes out as visible light:'),
                h('div', { style: { padding: '14px 16px', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)',
                  borderRadius: 8, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13, textAlign: 'center', color: '#e9d5ff', marginBottom: 12 } },
                  'luciferin  +  O₂  →  oxyluciferin  +  CO₂  +  ',
                  h('span', { style: { color: '#fbbf24', fontWeight: 800 } }, '✨ photon ✨')),
                h('p', { style: { margin: '0 0 12px 0' } },
                  'The key marine luciferin is ',
                  h('b', { style: { color: '#86efac' } }, 'coelenterazine'),
                  ' — used by jellyfish + comb jellies + most bioluminescent cephalopods. Coelenterazine is small enough to diffuse across cell membranes, which is why it shows up in such different lineages independently.'))),

            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '🔬 Why it\'s "cold light"'),
              h('div', { style: { color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
                h('p', { style: { margin: '0 0 10px 0' } },
                  'Quantum yield is the fraction of reaction energy that becomes light. For an incandescent bulb, ~5% of the energy is light and ~95% is heat. For bioluminescence, ',
                  h('b', { style: { color: '#fbbf24' } }, 'quantum yield can reach ~90%'),
                  ' — almost all the energy becomes photons. This is why fireflies + bioluminescent organisms don\'t feel warm to the touch.'),
                h('p', { style: { margin: 0 } },
                  'It\'s also why bioluminescence works in cold deep water (which would freeze a tropical glowworm). The reaction temperature is the surrounding water temperature; no thermoregulation required.'))),

            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '⚖️ Bioluminescence vs other "glowing" phenomena'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 } },
                [
                  { name: 'Bioluminescence', color: '#fbbf24',
                    detail: 'Animal generates light via chemical reaction (luciferin + O₂ → light). Doesn\'t need outside light source.' },
                  { name: 'Fluorescence', color: '#a78bfa',
                    detail: 'Animal absorbs short-wavelength light + re-emits longer-wavelength light. Needs an external light source. Many corals + some fish do this — different from bioluminescence.' },
                  { name: 'Phosphorescence', color: '#86efac',
                    detail: 'Animal absorbs light + slowly releases it over seconds-to-minutes (glow-in-the-dark toys). Almost no animals do this naturally — it\'s mostly a synthetic effect.' },
                  { name: 'Structural color', color: '#0ea5e9',
                    detail: 'Light interference in nanostructures produces color without pigment. Iridophores in cephalopods + butterfly wings. Doesn\'t generate light, just reorganizes it.' }
                ].map(function(b, i) {
                  return h('div', { key: i,
                    style: { background: 'rgba(15,23,42,0.5)', borderLeft: '3px solid ' + b.color, padding: '10px 12px', borderRadius: 8 } },
                    h('div', { style: { fontSize: 12, fontWeight: 800, color: b.color, marginBottom: 4 } }, b.name),
                    h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.55 } }, b.detail));
                })))
          ) : null,

          view === 'photophores' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '💡 Photophore architectures'),
              h('div', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.6, marginBottom: 14 } },
                'A photophore is the structural unit that produces or houses bioluminescence. Different designs serve different functions — direction, color, intensity control.'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 } },
                PHOTOPHORES.map(function(p) {
                  var active = p.id === (d.bioluxPhotophoreId || 'simple');
                  return h('button', { key: p.id,
                    onClick: function() { setCL({ bioluxPhotophoreId: p.id }); awardXP(1); },
                    'aria-pressed': active ? 'true' : 'false',
                    style: { padding: '10px 12px', textAlign: 'left',
                      background: active ? 'rgba(99,102,241,0.3)' : 'rgba(15,23,42,0.5)',
                      color: active ? '#c7d2fe' : '#cbd5e1',
                      border: '1px solid ' + (active ? 'rgba(167,139,250,0.6)' : 'rgba(100,116,139,0.3)'),
                      borderLeft: '3px solid ' + p.color,
                      borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                      h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, p.emoji),
                      h('div', { style: { fontWeight: 800, fontSize: 12, color: active ? '#fde68a' : '#e2e8f0' } }, p.name)));
                }))),
            (function() {
              var sel = PHOTOPHORES.find(function(p) { return p.id === (d.bioluxPhotophoreId || 'simple'); }) || PHOTOPHORES[0];
              return h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid ' + sel.color }) },
                h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 32 } }, sel.emoji),
                  h('div', { style: { flex: 1 } },
                    h('div', { style: { fontSize: 18, fontWeight: 900, color: sel.color, letterSpacing: '-0.01em' } }, sel.name))),
                h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 12 } }, sel.description),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 } },
                  [
                    { lbl: '📍 Typical location', val: sel.location, color: '#fbbf24' },
                    { lbl: '🔬 Example species', val: sel.example, color: '#86efac' }
                  ].map(function(b, i) {
                    return h('div', { key: i,
                      style: { background: 'rgba(15,23,42,0.5)', borderLeft: '3px solid ' + b.color, padding: '10px 12px', borderRadius: 8 } },
                      h('div', { style: { fontSize: 10, fontWeight: 800, color: b.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }, b.lbl),
                      h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.55 } }, b.val));
                  })));
            })(),
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '🎯 What bioluminescence is FOR'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 } },
                [
                  { fn: 'Counter-illumination', emoji: '🌗', detail: 'Match downwelling sunlight/moonlight with ventral photophores. Erases silhouette from predators below.' },
                  { fn: 'Communication / mating', emoji: '💕', detail: 'Synchronized displays attract mates. Firefly squid spring spawn turns Toyama Bay blue.' },
                  { fn: 'Prey luring', emoji: '🎣', detail: 'Bright spots on arm tips attract small prey close enough to grab. Vampire squid uses this.' },
                  { fn: 'Predator decoy', emoji: '🌫️', detail: 'Bioluminescent ink ejected as a glowing decoy while the animal flees in the dark.' },
                  { fn: 'Schooling coordination', emoji: '👥', detail: 'Humboldt squid + firefly squid coordinate pack movements via skin-flash signals.' },
                  { fn: 'Startle response', emoji: '⚡', detail: 'Sudden bright burst when threatened — overwhelms predator visual system briefly.' }
                ].map(function(fn, i) {
                  return h('div', { key: i,
                    style: { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.3)',
                      borderLeft: '3px solid #fbbf24', padding: '10px 12px', borderRadius: 8 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                      h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, fn.emoji),
                      h('div', { style: { fontSize: 12, fontWeight: 800, color: '#fbbf24' } }, fn.fn)),
                    h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.55 } }, fn.detail));
                })))
          ) : null,

          view === 'symbiosis' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '🦠 Vibrio fischeri + Hawaiian Bobtail Squid'),
              h('div', { style: { color: '#cbd5e1', fontSize: 13, lineHeight: 1.7, marginBottom: 14 } },
                h('p', { style: { margin: '0 0 10px 0' } },
                  'The Hawaiian bobtail squid (',
                  h('em', { style: { color: '#fde68a' } }, 'Euprymna scolopes'),
                  ') is the model organism for studying beneficial host-microbe symbiosis. Every hatchling is born sterile. Within 12-24 hours of hatching, it has recruited a precisely controlled population of ',
                  h('em', { style: { color: '#86efac' } }, 'Vibrio fischeri'),
                  ' bacteria from seawater into a specialized light organ.'),
                h('p', { style: { margin: '0 0 10px 0' } },
                  'The bacteria are everywhere in seawater, but the squid only recruits Vibrio fischeri specifically — via a series of mucus + chemical signals that filter out everything else. Once the bacteria establish in the light organ\'s crypts, they multiply to ~10⁹ cells.'),
                h('p', { style: { margin: 0 } },
                  'In return: the squid provides nutrients (amino acids) + safe shelter. The bacteria provide light at moonlight brightness — used by the squid for counter-illumination during night feeding.'))),

            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '🕐 The 24-hour cycle'),
              h('div', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.6, marginBottom: 12 } },
                'Drag the slider to advance through one full day. The bacterial population cycles dramatically — expelled at dawn, repopulated by dusk.'),
              h('label', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 6, fontWeight: 700 } },
                h('span', null, 'Time of day'),
                h('span', { style: { color: phase.color, fontFamily: 'ui-monospace, Menlo, monospace' } },
                  String(Math.floor(hour)).padStart(2, '0') + ':00')),
              h('input', { type: 'range', min: 0, max: 23, step: 1, value: hour,
                onChange: function(e) { setCL({ bioluxSymbiosisHour: parseInt(e.target.value, 10) }); },
                'aria-label': 'Time of day in hours',
                style: { width: '100%', accentColor: phase.color, marginBottom: 12 } }),
              h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#64748b', fontFamily: 'ui-monospace, Menlo, monospace', marginBottom: 14 } },
                h('span', null, '🌅 dawn'),
                h('span', null, 'midday'),
                h('span', null, '🌇 dusk'),
                h('span', null, 'midnight')),
              h('div', { style: { background: phase.color + '15', border: '1px solid ' + phase.color + '55',
                borderLeft: '4px solid ' + phase.color, padding: '12px 14px', borderRadius: 10 } },
                h('div', { style: { fontSize: 13, fontWeight: 800, color: phase.color, marginBottom: 6 } }, phase.name),
                h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.7 } }, phase.detail))),

            h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid #a78bfa' }) },
              h('div', { style: subheaderStyle() }, '🔬 Why this symbiosis is foundational research'),
              h('div', { style: { color: '#e9d5ff', fontSize: 13, lineHeight: 1.75 } },
                h('p', { style: { margin: '0 0 12px 0' } },
                  'Margaret McFall-Ngai\'s lab at University of Hawaiʻi has built decades of foundational microbiome science around this one symbiosis. The questions it answered:'),
                h('ul', { style: { margin: 0, paddingLeft: 20, color: '#cbd5e1', fontSize: 12, lineHeight: 1.75 } },
                  h('li', null, 'How does an animal recruit ONE specific microbial species from millions in its environment?'),
                  h('li', null, 'How does the immune system learn to TOLERATE beneficial microbes while rejecting harmful ones?'),
                  h('li', null, 'How do host genes co-evolve with microbial partners?'),
                  h('li', null, 'What molecular signals do bacteria use to establish residency in tissues?')),
                h('p', { style: { margin: '12px 0 0 0', fontStyle: 'italic' } },
                  'These same questions apply to the human gut microbiome, plant-rhizobia nitrogen-fixing symbiosis, coral-algae bleaching dynamics, and probiotics research. The bobtail squid + Vibrio fischeri system is small enough to fully control + complex enough to be informative.')))
          ) : null,

          view === 'counter' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '🌗 Counter-Illumination Simulator'),
              h('div', { style: { color: '#cbd5e1', fontSize: 13, lineHeight: 1.7, marginBottom: 14 } },
                h('p', { style: { margin: '0 0 10px 0' } },
                  'A predator looking up sees a dark silhouette against the lit water above. Counter-illumination defeats this by glowing on the underside to match the brightness of the downwelling light. Mismatch = silhouette visible.'),
                h('p', { style: { margin: 0 } },
                  'Adjust the surface brightness (depends on time + depth) and your ventral photophore intensity. The match score reflects what a predator below would see.'))),

            h('div', { style: cardStyle() },
              h('div', { style: { background: '#0a0f1e', borderRadius: 12, padding: 16, position: 'relative', overflow: 'hidden' } },
                h('svg', { width: '100%', height: 280, viewBox: '0 0 400 280', 'aria-label': 'Counter-illumination simulation', style: { display: 'block' } },
                  h('defs', null,
                    h('linearGradient', { id: 'surfaceLight', x1: 0, y1: 0, x2: 0, y2: 1 },
                      h('stop', { offset: '0%', stopColor: 'rgba(135,206,235,' + (depth / 100 * 0.7) + ')' }),
                      h('stop', { offset: '100%', stopColor: 'rgba(15,23,42,0.95)' }))),
                  h('rect', { x: 0, y: 0, width: 400, height: 280, fill: 'url(#surfaceLight)' }),
                  depth > 20 ? h('g', { opacity: depth / 100 },
                    h('line', { x1: 100, y1: 0, x2: 80, y2: 90, stroke: 'rgba(200,220,255,0.25)', strokeWidth: 1 }),
                    h('line', { x1: 200, y1: 0, x2: 200, y2: 90, stroke: 'rgba(200,220,255,0.3)', strokeWidth: 1 }),
                    h('line', { x1: 300, y1: 0, x2: 320, y2: 90, stroke: 'rgba(200,220,255,0.25)', strokeWidth: 1 })) : null,
                  h('ellipse', { cx: 200, cy: 130, rx: 40, ry: 22, fill: '#1c1410', stroke: 'rgba(100,116,139,0.4)', strokeWidth: 1 }),
                  h('circle', { cx: 200, cy: 113, r: 14, fill: '#1c1410' }),
                  h('path', { d: 'M 175 145 Q 170 165 180 185 M 190 150 Q 188 175 195 195 M 200 150 Q 200 180 200 200 M 210 150 Q 212 175 205 195 M 225 145 Q 230 165 220 185', stroke: '#1c1410', strokeWidth: 3, fill: 'none', strokeLinecap: 'round' }),
                  belly > 0 ? h('ellipse', { cx: 200, cy: 148, rx: 38, ry: 8,
                    fill: 'rgba(180,210,255,' + (belly / 100 * 0.8) + ')', opacity: 0.85 }) : null,
                  belly > 0 ? h('ellipse', { cx: 200, cy: 152, rx: 30, ry: 5,
                    fill: 'rgba(220,235,255,' + (belly / 100 * 0.6) + ')' }) : null,
                  h('g', { transform: 'translate(200, 240)' },
                    h('path', { d: 'M -30 -10 Q 0 -25 30 -10 L 35 0 L 0 8 L -35 0 Z', fill: 'rgba(80,80,90,0.85)', stroke: 'rgba(140,140,160,0.4)', strokeWidth: 1 }),
                    h('circle', { cx: -10, cy: -8, r: 3, fill: '#fbbf24' }),
                    h('circle', { cx: 10, cy: -8, r: 3, fill: '#fbbf24' }),
                    h('text', { x: 0, y: 24, textAnchor: 'middle', fontSize: 9, fill: '#94a3b8', fontFamily: 'ui-monospace, Menlo, monospace' },
                      'predator looking up')),
                  h('rect', { x: 12, y: 12, width: 130, height: 50, rx: 6, fill: 'rgba(0,0,0,0.7)' }),
                  h('text', { x: 18, y: 28, fontSize: 10, fontWeight: 800, fill: matchVerdict.color, fontFamily: 'ui-monospace, Menlo, monospace' },
                    'Match: ' + matchScore + '%'),
                  h('text', { x: 18, y: 46, fontSize: 9, fill: '#cbd5e1', fontFamily: 'system-ui' }, matchVerdict.label.length > 28 ? matchVerdict.label.substring(0, 28) + '…' : matchVerdict.label))),

              h('div', { style: { marginTop: 14 } },
                h('label', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: 700 } },
                  h('span', null, '☀️ Downwelling light (depends on time + depth)'),
                  h('span', { style: { fontFamily: 'ui-monospace, Menlo, monospace', color: '#fbbf24' } }, depth + ' / 100')),
                h('input', { type: 'range', min: 0, max: 100, step: 1, value: depth,
                  onChange: function(e) { setCL({ bioluxDepthFactor: parseInt(e.target.value, 10) }); },
                  'aria-label': 'Downwelling light intensity',
                  style: { width: '100%', accentColor: '#fbbf24' } })),
              h('div', { style: { marginTop: 10 } },
                h('label', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: 700 } },
                  h('span', null, '💡 Ventral photophore intensity'),
                  h('span', { style: { fontFamily: 'ui-monospace, Menlo, monospace', color: '#86efac' } }, belly + ' / 100')),
                h('input', { type: 'range', min: 0, max: 100, step: 1, value: belly,
                  onChange: function(e) { setCL({ bioluxBellyIntensity: parseInt(e.target.value, 10) }); },
                  'aria-label': 'Ventral photophore intensity',
                  style: { width: '100%', accentColor: '#86efac' } })),
              h('div', { style: { marginTop: 14, padding: '10px 14px',
                background: matchVerdict.color + '15', border: '1px solid ' + matchVerdict.color + '55',
                borderLeft: '4px solid ' + matchVerdict.color, borderRadius: 8 } },
                h('div', { style: { fontSize: 13, fontWeight: 800, color: matchVerdict.color, marginBottom: 4 } },
                  matchScore + '% — ' + matchVerdict.label),
                h('div', { style: { fontSize: 11, color: '#e2e8f0', lineHeight: 1.55 } },
                  matchScore >= 85 ?
                    'In nature, real cephalopods (firefly squid, Hawaiian bobtail) actively tune their photophores in real time to track changing surface conditions.' :
                  matchScore >= 60 ?
                    'Adequate but not perfect. Real photophore systems are far more precise than this slider lets you be.' :
                    'Mismatch this large means the predator definitely sees you. In the wild, bioluminescent species would have already adjusted.'))),

            h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid #a78bfa' }) },
              h('div', { style: subheaderStyle() }, '🧠 How real cephalopods control this'),
              h('div', { style: { color: '#e9d5ff', fontSize: 13, lineHeight: 1.7 } },
                h('p', { style: { margin: '0 0 10px 0' } },
                  'Real photophores aren\'t a single slider — they\'re hundreds of independently-controllable units. A firefly squid has ~1000 photophores. Each can be modulated separately.'),
                h('p', { style: { margin: '0 0 10px 0' } },
                  'In the Hawaiian bobtail squid, output is controlled by varying ',
                  h('b', null, 'oxygen flow'),
                  ' to the bacterial population — more O₂ = more bioluminescence (Vibrio fischeri uses oxygen as the oxidizer in the luciferin reaction). The squid sends regulated O₂ pulses to dial brightness up + down throughout the night.'),
                h('p', { style: { margin: 0 } },
                  'Some species also have photoreceptors NEXT TO their photophores. They detect their own output + adjust it. This closed-loop control is what makes real counter-illumination so precise.')))
          ) : null
        );
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 8 — BODY PLAN & 9 BRAINS
      // ═══════════════════════════════════════════════════════
      function renderBodyPlan() {
        var ANATOMY = [
          { id: 'central-brain', name: 'Central Brain', emoji: '🧠', cx: 200, cy: 100, r: 14,
            color: '#a78bfa',
            short: 'Donut-shaped, ~170M neurons. Esophagus passes THROUGH the middle.',
            detail: 'The octopus central brain is a ring of nervous tissue surrounding the esophagus. Food literally passes through the middle of the brain on its way to the stomach. Total: ~170 million neurons (compared to a dog at ~530M or human at ~86 billion). About 1/3 of all octopus neurons are here — the other 2/3 are in the arms.' },
          { id: 'arm-ganglion', name: 'Arm Ganglia (×8)', emoji: '🦑', cx: 200, cy: 200, r: 14,
            color: '#86efac',
            short: '~40M neurons per arm. Each arm solves simple problems autonomously.',
            detail: 'Every octopus arm has its own ganglion (cluster of neurons) running its length. These 8 ganglia hold ~2/3 of all octopus neurons (40M per arm × 8 = 320M). Each arm can: locate prey by touch + taste, decide whether to reach for it, grab + manipulate it — all without central-brain involvement. The central brain receives a summary, not a direct sensory feed.' },
          { id: 'eye', name: 'Eyes', emoji: '👁️', cx: 175, cy: 95, r: 8,
            color: '#fbbf24',
            short: 'Camera-style eye, like ours — but evolved separately. Color-blind but polarization-sensitive.',
            detail: 'Cephalopod eyes are camera-style with a lens + retina, structurally similar to vertebrate eyes but evolved INDEPENDENTLY (convergent evolution). Key differences: their photoreceptors point TOWARD the light (vs ours pointing away → blind spot in humans). Most cephalopods are color-blind despite producing the most varied skin displays in nature. Theory: they detect polarized light (we can\'t) + may have skin-distributed color sensors (opsins in the skin itself).' },
          { id: 'mantle', name: 'Mantle', emoji: '🫁', cx: 200, cy: 65, r: 22,
            color: '#fb923c',
            short: 'The "body" sac. Pumps water for jet propulsion + houses internal organs.',
            detail: 'The mantle is the muscular body cavity that holds the gills, hearts, digestive organs, and reproductive organs. It also drives JET PROPULSION — water is drawn in around the head and expelled through the siphon at high pressure. Mantle contraction = jet thrust. The pattern is: relax (water in), contract (water out, jet pulse).' },
          { id: 'siphon', name: 'Siphon (Funnel)', emoji: '💨', cx: 215, cy: 80, r: 8,
            color: '#38bdf8',
            short: 'Steerable jet nozzle. Direction = direction the octopus goes.',
            detail: 'The siphon is the muscular tube that water exits during jet propulsion. It\'s STEERABLE — the octopus can point it forward, backward, up, down. Jet through siphon = thrust in opposite direction. Squid use this for explosive escape (up to 25 m/s in Humboldt squid). Octopuses use it gently for steering + as a secondary swim mode (primary mode is arm-crawling).' },
          { id: 'beak', name: 'Beak', emoji: '⚙️', cx: 200, cy: 130, r: 8,
            color: '#fca5a5',
            short: 'Chitin beak — the only hard part in the body. Octopuses can squeeze through any hole bigger than their beak.',
            detail: 'The beak is parrot-style — two interlocking pieces of chitin. It\'s the ONLY rigid part of an octopus body. This is why octopuses can squeeze through holes that look impossibly small — anywhere their beak fits, they fit. The beak delivers venomous bite (the saliva contains tetrodotoxin in blue-ringed octopuses; less potent neurotoxins in others). Behind the beak: a radula (file-like tongue) used for drilling shells.' },
          { id: 'gills', name: 'Gills (×2)', emoji: '🌊', cx: 235, cy: 65, r: 8,
            color: '#0ea5e9',
            short: 'Two gills in the mantle. Two systemic hearts pump blood through them.',
            detail: 'Two feathery gills sit inside the mantle cavity. Each has a BRANCHIAL HEART pumping deoxygenated blood through it. Water flowing in/out of the mantle (for breathing + jet propulsion) ventilates the gills automatically. Cephalopod gills extract oxygen efficiently in cold + low-oxygen water — better than most fish.' },
          { id: 'hearts', name: 'Three Hearts', emoji: '❤️', cx: 195, cy: 75, r: 8,
            color: '#dc2626',
            short: 'Two branchial hearts pump through gills; one systemic heart pumps to body.',
            detail: 'Cephalopods have THREE hearts: (1) Two branchial hearts (one per gill) push deoxygenated blood through the gills for oxygenation. (2) One systemic heart receives the now-oxygenated blood and pumps it to the rest of the body. The systemic heart STOPS during jet-propulsion swimming — blood circulation pauses during sustained jet swims, which is partly why octopuses prefer crawling for long distances.' },
          { id: 'hectocotylus', name: 'Hectocotylus', emoji: '💕', cx: 175, cy: 220, r: 10,
            color: '#f472b6',
            short: 'Modified mating arm. Detaches + lives independently inside female after mating in some species.',
            detail: 'In male octopuses, one arm (usually the third right arm) is modified for mating — it\'s called the hectocotylus. Some species: the male hands sperm packets across with this arm. Other species (Argonauta, paper nautilus): the entire hectocotylus DETACHES and crawls into the female on its own. The female then carries it around until she\'s ready to use the sperm. Early naturalists thought these detached arms were parasitic worms.' }
        ];
        var highlightedId = d.anatomyRegion || 'central-brain';
        var highlighted = ANATOMY.find(function(a) { return a.id === highlightedId; }) || ANATOMY[0];
        return h('div', null,
          panelHeader('🧠 Body Plan & 9 Brains',
            'Cephalopod anatomy is built around principles that look like a different evolutionary path entirely — distributed intelligence, multiple hearts, blue copper blood, a beak that\'s the only hard thing in the body, and a "mantle" that\'s both lung and engine. Click any labeled region.'),

          h('div', { style: cardStyle() },
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 } },
              // Anatomical diagram
              h('div', null,
                h('div', { style: { fontSize: 10, fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 } },
                  '🔍 Click a region'),
                h('svg', { width: '100%', height: 320, viewBox: '60 30 280 260', 'aria-label': 'Octopus anatomy diagram',
                  style: { background: 'rgba(15,23,42,0.5)', borderRadius: 12, border: '1px solid rgba(100,116,139,0.3)' } },
                  // Mantle (large oval, top)
                  h('ellipse', { cx: 200, cy: 65, rx: 50, ry: 38, fill: 'rgba(251,146,60,0.15)', stroke: '#fb923c', strokeWidth: 1.5 }),
                  // Head + eyes
                  h('ellipse', { cx: 200, cy: 110, rx: 32, ry: 22, fill: 'rgba(167,139,250,0.15)', stroke: '#a78bfa', strokeWidth: 1.5 }),
                  h('circle', { cx: 175, cy: 105, r: 6, fill: '#fbbf24', stroke: '#ca8a04', strokeWidth: 1 }),
                  h('circle', { cx: 175, cy: 105, r: 3, fill: '#1c1410' }),
                  h('circle', { cx: 225, cy: 105, r: 6, fill: '#fbbf24', stroke: '#ca8a04', strokeWidth: 1 }),
                  h('circle', { cx: 225, cy: 105, r: 3, fill: '#1c1410' }),
                  // Arms (8 spreading)
                  [-50, -32, -14, 4, 22, 40, 58, 76].map(function(deg, i) {
                    var rad = deg * Math.PI / 180;
                    var endX = 200 + Math.sin(rad) * 90;
                    var endY = 200 + Math.cos(rad) * 90;
                    var ctrlX = 200 + Math.sin(rad) * 50;
                    var ctrlY = 175 + Math.cos(rad) * 30;
                    return h('path', { key: i,
                      d: 'M 200 145 Q ' + ctrlX + ' ' + ctrlY + ' ' + endX + ' ' + endY,
                      fill: 'none', stroke: '#a78bfa', strokeWidth: 5, strokeLinecap: 'round', opacity: 0.6 });
                  }),
                  // Click targets (invisible larger circles for usability)
                  ANATOMY.map(function(a) {
                    var isHighlighted = a.id === highlightedId;
                    return h('g', { key: a.id, style: { cursor: 'pointer' },
                      onClick: function() { setCL({ anatomyRegion: a.id }); awardXP(1); clAnnounce('Selected ' + a.name); } },
                      h('circle', { cx: a.cx, cy: a.cy, r: a.r + 8, fill: 'transparent' }),
                      h('circle', { cx: a.cx, cy: a.cy, r: a.r,
                        fill: isHighlighted ? a.color : 'rgba(15,23,42,0.7)',
                        stroke: a.color, strokeWidth: 2.5,
                        opacity: isHighlighted ? 1 : 0.8 }),
                      h('text', { x: a.cx, y: a.cy + 4, textAnchor: 'middle', fontSize: 13, pointerEvents: 'none' },
                        a.emoji));
                  })
                )),

              // Detail panel
              h('div', null,
                h('div', { style: { fontSize: 10, fontWeight: 800, color: highlighted.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 } },
                  '📋 Region detail'),
                h('div', { style: { background: 'rgba(15,23,42,0.5)', borderLeft: '4px solid ' + highlighted.color, padding: '14px 16px', borderRadius: 10 } },
                  h('div', { style: { fontSize: 16, fontWeight: 800, color: '#c7d2fe', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 } },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, highlighted.emoji),
                    h('span', null, highlighted.name)),
                  h('div', { style: { fontSize: 12, color: '#fde68a', lineHeight: 1.55, marginBottom: 10, fontStyle: 'italic' } },
                    '"' + highlighted.short + '"'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.7 } }, highlighted.detail))))),

          // Region quick-pick list
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '📌 All regions'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 6 } },
              ANATOMY.map(function(a) {
                var active = a.id === highlightedId;
                return h('button', { key: a.id,
                  onClick: function() { setCL({ anatomyRegion: a.id }); awardXP(1); },
                  'aria-pressed': active ? 'true' : 'false',
                  style: { padding: '8px 10px', textAlign: 'left',
                    background: active ? 'rgba(99,102,241,0.3)' : 'rgba(15,23,42,0.5)',
                    color: active ? '#c7d2fe' : '#cbd5e1',
                    border: '1px solid ' + (active ? 'rgba(167,139,250,0.6)' : 'rgba(100,116,139,0.3)'),
                    borderLeft: '3px solid ' + a.color,
                    borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6 } },
                  h('span', { 'aria-hidden': 'true' }, a.emoji), a.name);
              }))),

          // The Distributed Intelligence panel
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '🧠 Distributed intelligence: octopus vs vertebrate'),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 } },
              h('div', { style: { background: 'rgba(15,23,42,0.5)', borderLeft: '3px solid #fbbf24', padding: '12px 14px', borderRadius: 8 } },
                h('div', { style: { fontSize: 12, fontWeight: 800, color: '#fbbf24', marginBottom: 6 } }, '🧑 Vertebrate (us)'),
                h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 } },
                  'Brain is centralized in the skull. Spinal cord carries signals to + from peripheral body. Limbs follow commands; they don\'t generate behavior independently. Vertebrate body plan: brain decides, body obeys.')),
              h('div', { style: { background: 'rgba(15,23,42,0.5)', borderLeft: '3px solid #86efac', padding: '12px 14px', borderRadius: 8 } },
                h('div', { style: { fontSize: 12, fontWeight: 800, color: '#86efac', marginBottom: 6 } }, '🐙 Cephalopod'),
                h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 } },
                  'Brain is distributed: ~1/3 in head, ~2/3 in 8 arm ganglia. Each arm has working memory + sensory autonomy + can decide-act locally. Central brain takes summaries + handles big picture. Cephalopod body plan: parallel processing, embodied cognition.'))),
            h('div', { style: { marginTop: 12, padding: '12px 14px', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 8 } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } },
                '🤯 Why this matters'),
              h('div', { style: { fontSize: 12, color: '#e9d5ff', lineHeight: 1.7 } },
                'A cut-off octopus arm can REACT — it will pull away from a noxious stimulus or grab a passing object for up to ~1 hour after separation. The arm contains everything it needs: sensors, motor control, basic decision-making. This is one of the most direct demonstrations of embodied/distributed cognition in any animal. It also raises deep questions: if 2/3 of "octopus mind" is in the arms, what does it FEEL LIKE to be an octopus making a decision?')))
        );
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 6 — CEPHALOPOD THROUGH TIME (fossils + evolution)
      // ═══════════════════════════════════════════════════════
      function renderThroughTime() {
        var view = d.timeView || 'timeline';
        // Era data — 500M-year cephalopod history in 8 chunks
        var ERAS = [
          { id: 'cambrian', name: 'Cambrian', startMya: 538, endMya: 485, color: '#92400e',
            headline: 'First cephalopods appear',
            event: 'Around 530 MYA, the first cephalopod emerges: ',
            highlight: 'Plectronoceras',
            after: ', a small cone-shelled animal in shallow Chinese seas. Cephalopods diverge from snail/clam ancestors.',
            keyFossils: ['plectronoceras'],
            ecosystem: 'Trilobites, brachiopods, primitive jawless fish. Cephalopods are still small + rare.' },
          { id: 'ordovician', name: 'Ordovician', startMya: 485, endMya: 444, color: '#b45309',
            headline: 'Cephalopods become apex predators',
            event: 'Endoceratoid cephalopods take over as the top marine predators. ',
            highlight: 'Cameroceras',
            after: ' grows to 6-9m long — a straight-shelled monster with tentacles. For ~40 million years, cephalopods were the largest predators on Earth.',
            keyFossils: ['cameroceras', 'orthoceras'],
            ecosystem: 'Diverse marine life. Cephalopods + sea scorpions (eurypterids) rule open water. End-Ordovician extinction (~444 MYA) is the SECOND-largest mass extinction in history — climate-driven, knocks out ~85% of species.' },
          { id: 'silurian-devonian', name: 'Silurian-Devonian', startMya: 444, endMya: 359, color: '#a16207',
            headline: 'Nautiloid diversification + first ammonoids',
            event: 'Nautiloids diversify into hundreds of forms — straight, curved, tightly coiled. Around 419 MYA in the Devonian, the first ',
            highlight: 'ammonoids',
            after: ' appear: coiled cephalopods with more complex internal chambers. Fish develop jaws and start competing with cephalopods for the apex slot.',
            keyFossils: ['orthoceras'],
            ecosystem: 'Devonian = "Age of Fishes." Cephalopods lose ground to fish but ammonoids carve out a new niche. Late Devonian extinction (~372 MYA) is gradual + lasts ~25 million years.' },
          { id: 'carb-permian', name: 'Carboniferous-Permian', startMya: 359, endMya: 252, color: '#854d0e',
            headline: 'Goniatites + first octopus',
            event: 'Goniatites — ammonoids with characteristically zigzag sutures — dominate. Around 300 MYA, ',
            highlight: 'Pohlsepia',
            after: ' (the earliest known octopus) appears in what is now Illinois — a soft-bodied cephalopod fossilized in a remarkable concretion. Most ancestors of modern coleoids are tracing back here.',
            keyFossils: ['goniatite', 'pohlsepia'],
            ecosystem: 'Pangaea forms. Coal swamps everywhere. End-Permian extinction (~252 MYA) is THE big one — 95% of marine species gone. Cephalopods barely scrape through.' },
          { id: 'triassic', name: 'Triassic', startMya: 252, endMya: 201, color: '#7c2d12',
            headline: 'Recovery + Coleoid divergence',
            event: 'Surviving cephalopods rebuild. The coleoid lineage (soft-bodied: octopus + squid + cuttlefish) clearly diverges from nautiloids by mid-Triassic. ',
            highlight: 'Belemnites',
            after: ' (squid-like cephalopods with internal rocket-shaped guards) appear and rapidly diversify.',
            keyFossils: ['belemnite'],
            ecosystem: 'Pangaea starts to break apart. Dinosaurs appear on land. Ichthyosaurs + plesiosaurs in the sea — major cephalopod predators. End-Triassic extinction (~201 MYA) clears more competition.' },
          { id: 'jurassic', name: 'Jurassic', startMya: 201, endMya: 145, color: '#9a3412',
            headline: 'The Cephalopod Golden Age',
            event: 'Ammonites explode in diversity. Hundreds of genera, thousands of species. Shell shapes range from tight spirals to heteromorphs (unrolled). Vampire squid lineage (',
            highlight: 'Vampyromorpha',
            after: ') diverges around 165 MYA. Belemnite diversity peaks. Ichthyosaurs hunt cephalopods at scale — fossil ichthyosaurs are sometimes found with hundreds of belemnite hooklets in their stomachs.',
            keyFossils: ['vampyronassa', 'belemnite'],
            ecosystem: 'Warm shallow seas everywhere. Marine reptiles dominate ocean apex roles. Cephalopod abundance is so high that ammonite + belemnite fossils form whole limestone beds.' },
          { id: 'cretaceous', name: 'Cretaceous', startMya: 145, endMya: 66, color: '#ea580c',
            headline: 'Peak diversity, then mass extinction',
            event: 'Ammonites reach their peak. ',
            highlight: 'Parapuzosia',
            after: ' grows to 2.5m+ diameter — the largest ammonite known. Then the end-Cretaceous extinction (~66 MYA, asteroid + Deccan Traps volcanism). ALL ammonites die. ALL belemnites die. Only nautiloids + coleoids survive.',
            keyFossils: ['parapuzosia', 'belemnite'],
            ecosystem: 'Late Cretaceous oceans full of mosasaurs, sharks. Ammonites are still abundant until the very moment of the asteroid. Then they\'re gone — the extinction is geologically instant for them.' },
          { id: 'cenozoic', name: 'Cenozoic (modern)', startMya: 66, endMya: 0, color: '#fb923c',
            headline: 'Modern cephalopods diversify',
            event: 'With ammonites + belemnites gone, surviving coleoids (octopus, squid, cuttlefish ancestors) radiate. Modern groups appear: ',
            highlight: 'all modern octopus + squid + cuttlefish genera',
            after: ' trace back to within this era. Nautilus (the only remaining shelled cephalopod) survives nearly unchanged from Devonian forms.',
            keyFossils: ['nautilus-modern'],
            ecosystem: 'Mammals take over land. In the sea, bony fish + sharks + whales dominate apex roles. Cephalopods now occupy mid-trophic positions — but populations have been RISING for the last few decades as fish stocks decline.' }
        ];

        // Fossil specimen data
        var FOSSILS = [
          { id: 'plectronoceras', name: 'Plectronoceras', era: 'Cambrian', age: '~530 MYA', emoji: '🐚',
            size: '~2 cm shell', diet: 'Small invertebrates',
            description: 'The first known cephalopod. A small cone-shaped shell from Cambrian China. The animal had tentacles + a primitive siphuncle (the tube that runs through nautilus chambers regulating buoyancy). Cephalopod blueprint already established at 2 cm.',
            why: 'This 2cm animal is the great-great-grandparent of everything from giant squid to mimic octopus. The siphuncle + chambered shell + tentacles all appear together.' },
          { id: 'cameroceras', name: 'Cameroceras', era: 'Ordovician', age: '470-445 MYA', emoji: '🦴',
            size: '6-9m shell', diet: 'Fish, trilobites, other cephalopods',
            description: 'A straight-shelled (orthoconic) cephalopod. The largest reached 6-9 meters — for context, that\'s bigger than a great white shark. Cameroceras was the apex predator of Ordovician seas for ~40 million years.',
            why: 'Direct evidence cephalopods occupied the absolute top of marine food chains long before fish or marine reptiles. The straight shell isn\'t inefficient at scale — it just doesn\'t look like a familiar predator.' },
          { id: 'orthoceras', name: 'Orthoceras', era: 'Ordovician-Devonian', age: '~488-372 MYA', emoji: '🪨',
            size: '10-50 cm shell', diet: 'Smaller invertebrates + fish',
            description: 'Smaller relative of Cameroceras. Extremely abundant — Orthoceras shells form whole layers in Ordovician + Silurian limestone deposits. Often sold as polished display fossils today.',
            why: 'If you\'ve seen a polished black-and-cream "fossil pendant" with concentric chambers, it was probably Orthoceras. They\'re the most accessible ancient cephalopod fossil for students.' },
          { id: 'goniatite', name: 'Goniatites', era: 'Devonian-Permian', age: '~419-252 MYA', emoji: '🐌',
            size: '3-15 cm shell', diet: 'Plankton + small prey',
            description: 'Early ammonoids with simple, ZIGZAG suture patterns where the shell chambers meet the outer wall. Sutures are the key to identifying + dating ammonoids — they evolve in predictable ways across millions of years.',
            why: 'Sutures are like geological barcodes. Goniatites have simple sutures; later ammonites have wildly elaborate ones. Paleontologists use suture complexity to identify which era a shell came from.' },
          { id: 'pohlsepia', name: 'Pohlsepia', era: 'Carboniferous', age: '~296 MYA', emoji: '🐙',
            size: '~6 cm body', diet: 'Small invertebrates',
            description: 'The earliest known octopus — a soft-bodied coleoid preserved in a remarkable concretion from Illinois\'s Mazon Creek fossil bed. The body, arms, and even possible chromatophores are visible. Soft-bodied animals almost never fossilize.',
            why: 'Octopuses are essentially un-fossilizable — no shell, no bones, no hard parts except a tiny beak. Pohlsepia exists only because Mazon Creek concretions preserve soft tissue. There may be no other octopus fossil for another 100 million years.' },
          { id: 'belemnite', name: 'Belemnites', era: 'Triassic-Cretaceous', age: '~252-66 MYA', emoji: '🚀',
            size: '5-50 cm guard', diet: 'Fish + small cephalopods',
            description: 'Squid-like cephalopods with an internal "guard" — a rocket-shaped piece of calcite that fossilizes well. They had 10 arms (vs squid\'s 10 = 8 + 2 tentacles) and hooklets instead of suckers. Extremely abundant in Jurassic/Cretaceous oceans.',
            why: 'Belemnite guards are some of the most common Mesozoic fossils. They\'re also extinct — wiped out at the end-Cretaceous extinction along with ammonites. Modern squid evolved from a sister lineage that survived.' },
          { id: 'vampyronassa', name: 'Vampyronassa', era: 'Jurassic', age: '~165 MYA', emoji: '🦑',
            size: '~10 cm body', diet: 'Small prey + scavenge',
            description: 'The earliest known relative of the modern vampire squid. Exceptional soft-tissue preservation in the La Voulte-sur-Rhône Lagerstätte (France) preserved 8 arms with hooked attachments + eye details.',
            why: 'Vampire squid is essentially a "living fossil" — the Vampyromorpha order has existed continuously since the Jurassic. Vampyronassa shows the body plan was already established 165 million years ago.' },
          { id: 'parapuzosia', name: 'Parapuzosia', era: 'Late Cretaceous', age: '~80 MYA', emoji: '🐚',
            size: 'Up to 2.5m diameter', diet: 'Plankton-feeder (probable)',
            description: 'The largest ammonite ever found. A 2.55-meter diameter specimen was discovered in Germany in 1895. For comparison, that\'s bigger than a car tire — and it\'s ALL animal, not shell-with-some-animal.',
            why: 'Ammonites went out at peak size. Some of the biggest ones lived in the last few million years before the K-Pg extinction. Then the asteroid + Deccan eruptions ended them entirely.' },
          { id: 'nautilus-modern', name: 'Nautilus pompilius', era: 'Devonian to today', age: 'Lineage ~400 MYA', emoji: '🐚',
            size: '~20 cm shell', diet: 'Carrion + scavenge',
            description: 'The chambered nautilus. Body plan essentially unchanged for ~400 million years. The current nautilus species (Nautilus pompilius) is morphologically nearly identical to Devonian relatives. A true living fossil.',
            why: 'Cephalopods that look UNCHANGED for 400 million years tell us body plans can be evolutionarily stable when the niche is. Nautilus occupies deep reef + carrion-scavenging — a niche so consistent that the body solving it didn\'t need to change.' }
        ];

        // Mass extinction events
        var EXTINCTIONS = [
          { id: 'end-ordovician', name: 'End-Ordovician', mya: 444, color: '#0ea5e9',
            cause: 'Glaciation + sea-level drop',
            lost: '~85% of marine species, including most nautiloid lineages',
            cephalopodImpact: 'Endoceratoid giants take heavy losses. Cephalopod apex era ends. Some lineages survive in deeper or warmer refugia.',
            recovery: 'Survivors diversify in the Silurian. The cephalopod story continues but no more Cameroceras-scale giants.' },
          { id: 'late-devonian', name: 'Late Devonian', mya: 372, color: '#a16207',
            cause: 'Multiple pulses over ~25 million years; oxygen + temperature + sea level',
            lost: 'Massive losses in reef ecosystems; trilobites + brachiopods collapse',
            cephalopodImpact: 'Ammonoids that just appeared go through their first major test. Many lineages disappear. Goniatites survive + diversify later.',
            recovery: 'Goniatite-style ammonoids become the dominant cephalopod form for the next 100 million years.' },
          { id: 'end-permian', name: 'End-Permian (THE Big One)', mya: 252, color: '#dc2626',
            cause: 'Siberian Traps volcanism → CO2 spike → ocean acidification + anoxia',
            lost: '~95% of marine species. The greatest extinction in Earth history.',
            cephalopodImpact: 'Cephalopods barely survive. Only a handful of ammonoid lineages + nautiloids + a few coleoid stem-groups make it through. Goniatites go extinct.',
            recovery: 'Triassic ammonoids (ceratitids) explode from very few survivors. Coleoid lineage clarifies into modern stem-groups.' },
          { id: 'end-triassic', name: 'End-Triassic', mya: 201, color: '#fb923c',
            cause: 'CAMP (Central Atlantic Magmatic Province) volcanism, possibly methane release',
            lost: '~50% of marine species. Most ceratitid ammonoids die.',
            cephalopodImpact: 'Opens the door for new ammonite lineages (true ammonites with elaborate sutures) to dominate. Belemnites continue diversifying.',
            recovery: 'Jurassic ammonite + belemnite golden age begins. Body plans get more elaborate.' },
          { id: 'end-cretaceous', name: 'End-Cretaceous (K-Pg)', mya: 66, color: '#0c1432',
            cause: 'Chicxulub asteroid impact + Deccan Traps volcanism',
            lost: 'All non-avian dinosaurs, all ammonites, all belemnites, ~75% of all species',
            cephalopodImpact: 'COMPLETE extinction of ammonites + belemnites — two groups that ruled the oceans for 200+ million years. Only nautiloids + coleoids (octopus/squid/cuttlefish ancestors) survive.',
            recovery: 'The world goes from ammonite-dominated to octopus + squid + cuttlefish dominated. Modern cephalopod diversification begins.' }
        ];

        var era = ERAS.find(function(e) { return e.id === (d.timeEraId || 'ordovician'); }) || ERAS[1];
        var fossil = FOSSILS.find(function(f) { return f.id === (d.timeFossilId || 'cameroceras'); }) || FOSSILS[1];

        // Sub-view picker
        var SUBS = [
          { id: 'timeline', label: 'Timeline', icon: '⏳' },
          { id: 'fossils', label: 'Key Fossils', icon: '🦴' },
          { id: 'extinctions', label: 'Mass Extinctions', icon: '☄️' },
          { id: 'body-evolution', label: 'Body Plan Evolution', icon: '🐚' }
        ];

        return h('div', null,
          panelHeader('🕰️ Cephalopod Through Time',
            'Half a billion years of cephalopod evolution. From the first 2cm Cambrian shell, through giant Ordovician predators, ammonite explosions, mass extinctions, and the surviving lineages that became modern octopus + squid + cuttlefish + nautilus. The oldest continuous animal lineage with intelligence-grade nervous systems on Earth.'),

          // Sub-tab strip
          h('div', { role: 'tablist', 'aria-label': 'Through Time sub-sections',
            style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 } },
            SUBS.map(function(s) {
              var active = view === s.id;
              return h('button', { key: s.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
                onClick: function() { setCL({ timeView: s.id }); awardXP(1); },
                style: { padding: '8px 12px',
                  background: active ? 'rgba(99,102,241,0.3)' : 'rgba(15,23,42,0.5)',
                  color: active ? '#c7d2fe' : '#cbd5e1',
                  border: '1px solid ' + (active ? 'rgba(167,139,250,0.6)' : 'rgba(100,116,139,0.3)'),
                  borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6 } },
                h('span', { 'aria-hidden': 'true' }, s.icon), s.label);
            })),

          // ─── TIMELINE ───
          view === 'timeline' ? h('div', null,
            // Visual timeline bar
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '⏳ 500 million years of cephalopod history'),
              h('div', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.65, marginBottom: 12 } },
                'Click an era to explore. Width of each band is proportional to its duration in millions of years.'),
              h('svg', { width: '100%', height: 110, viewBox: '0 0 1000 110',
                preserveAspectRatio: 'none',
                style: { borderRadius: 8, background: 'rgba(15,23,42,0.7)' } },
                // Era bands — width proportional to (start - end) / 538 total
                (function() {
                  var totalSpan = 538;
                  var x = 0;
                  return ERAS.map(function(eraB, i) {
                    var w = ((eraB.startMya - eraB.endMya) / totalSpan) * 1000;
                    var rect = h('g', { key: eraB.id, style: { cursor: 'pointer' },
                      onClick: function() { setCL({ timeEraId: eraB.id }); awardXP(1); } },
                      h('rect', { x: x, y: 12, width: w, height: 60,
                        fill: eraB.color, opacity: eraB.id === d.timeEraId ? 0.95 : 0.6,
                        stroke: eraB.id === d.timeEraId ? '#fde68a' : 'rgba(255,255,255,0.1)',
                        strokeWidth: eraB.id === d.timeEraId ? 2 : 0.5 }),
                      h('text', { x: x + w / 2, y: 47, textAnchor: 'middle',
                        fontSize: w > 80 ? 11 : 9, fontWeight: 800,
                        fill: 'rgba(255,255,255,0.95)', pointerEvents: 'none' },
                        eraB.name.length > 14 && w < 90 ? eraB.name.substring(0, 8) + '...' : eraB.name),
                      h('text', { x: x + w / 2, y: 85, textAnchor: 'middle', fontSize: 9, fill: '#cbd5e1', pointerEvents: 'none' },
                        eraB.startMya + '–' + eraB.endMya + ' MYA'));
                    x += w;
                    return rect;
                  });
                })()
              )),

            // Selected era detail
            h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid ' + era.color }) },
              h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10, flexWrap: 'wrap' } },
                h('div', { style: { fontSize: 20, fontWeight: 900, color: era.color, letterSpacing: '-0.01em' } }, era.name),
                h('div', { style: { fontSize: 12, color: '#fb923c', fontFamily: 'ui-monospace, Menlo, monospace', background: 'rgba(251,146,60,0.1)', padding: '3px 8px', borderRadius: 6 } },
                  era.startMya + '–' + era.endMya + ' million years ago')),
              h('div', { style: { fontSize: 16, fontWeight: 700, color: '#fde68a', marginBottom: 12 } },
                era.headline),
              h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 14 } },
                era.event,
                h('em', { style: { color: '#a78bfa', fontWeight: 700 } }, era.highlight),
                era.after),
              h('div', { style: { padding: '12px 14px', background: 'rgba(15,23,42,0.5)', borderLeft: '3px solid #86efac', borderRadius: 6 } },
                h('div', { style: { fontSize: 10, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } },
                  '🌍 Ecosystem context'),
                h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.65 } }, era.ecosystem))),

            // Quick era jump
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '📋 All eras'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 } },
                ERAS.map(function(eraE) {
                  var active = eraE.id === d.timeEraId;
                  return h('button', { key: eraE.id,
                    onClick: function() { setCL({ timeEraId: eraE.id }); awardXP(1); },
                    'aria-pressed': active ? 'true' : 'false',
                    style: { padding: '8px 10px', textAlign: 'left',
                      background: active ? 'rgba(99,102,241,0.3)' : 'rgba(15,23,42,0.5)',
                      color: active ? '#c7d2fe' : '#cbd5e1',
                      border: '1px solid ' + (active ? 'rgba(167,139,250,0.6)' : 'rgba(100,116,139,0.3)'),
                      borderLeft: '3px solid ' + eraE.color,
                      borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' } },
                    h('div', { style: { fontWeight: 800, color: active ? '#fde68a' : '#e2e8f0' } }, eraE.name),
                    h('div', { style: { fontSize: 9, color: '#94a3b8', fontFamily: 'ui-monospace, Menlo, monospace', marginTop: 2 } },
                      eraE.startMya + '–' + eraE.endMya + ' MYA'));
                })))
          ) : null,

          // ─── FOSSILS ───
          view === 'fossils' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '🦴 Key fossil specimens'),
              h('div', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.6, marginBottom: 14 } },
                'Nine fossils that anchor the cephalopod story. Click each for details.'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 } },
                FOSSILS.map(function(f) {
                  var active = f.id === d.timeFossilId;
                  return h('button', { key: f.id,
                    onClick: function() { setCL({ timeFossilId: f.id }); awardXP(1); },
                    'aria-pressed': active ? 'true' : 'false',
                    style: { padding: '10px 12px', textAlign: 'left',
                      background: active ? 'rgba(99,102,241,0.3)' : 'rgba(15,23,42,0.5)',
                      color: active ? '#c7d2fe' : '#cbd5e1',
                      border: '1px solid ' + (active ? 'rgba(167,139,250,0.6)' : 'rgba(100,116,139,0.3)'),
                      borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 } },
                      h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, f.emoji),
                      h('div', { style: { fontWeight: 800, fontSize: 12, color: active ? '#fde68a' : '#e2e8f0' } }, f.name)),
                    h('div', { style: { fontSize: 9, color: '#94a3b8', fontFamily: 'ui-monospace, Menlo, monospace' } },
                      f.age));
                }))),

            h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid #a78bfa' }) },
              h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 36, lineHeight: 1 } }, fossil.emoji),
                h('div', { style: { flex: 1, minWidth: 240 } },
                  h('div', { style: { fontSize: 20, fontWeight: 900, color: '#c7d2fe' } }, fossil.name),
                  h('div', { style: { fontSize: 11, color: '#a78bfa', marginTop: 2 } }, fossil.era + ' · ' + fossil.age),
                  h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 4 } },
                    h('b', null, 'Size: '), fossil.size, ' · ',
                    h('b', null, 'Diet: '), fossil.diet))),
              h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 14 } }, fossil.description),
              h('div', { style: { padding: '12px 14px', background: 'rgba(167,139,250,0.1)', borderLeft: '3px solid #a78bfa', borderRadius: 6 } },
                h('div', { style: { fontSize: 10, fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } },
                  '🎯 Why this fossil matters'),
                h('div', { style: { fontSize: 12, color: '#e9d5ff', lineHeight: 1.7, fontStyle: 'italic' } }, fossil.why)))
          ) : null,

          // ─── EXTINCTIONS ───
          view === 'extinctions' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '☄️ The 5 mass extinctions cephalopods lived through'),
              h('div', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.65, marginBottom: 14 } },
                'Cephalopods are one of the only animal groups to survive ALL FIVE major mass extinctions in Earth history. Each one reshaped which lineages dominated next. The end-Cretaceous (K-Pg) is the one that killed ammonites + belemnites and left us with the modern cephalopod world.'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                EXTINCTIONS.map(function(ext) {
                  return h('div', { key: ext.id,
                    style: { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.3)',
                      borderLeft: '4px solid ' + ext.color, padding: '14px 16px', borderRadius: 10 } },
                    h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' } },
                      h('div', { style: { fontSize: 16, fontWeight: 900, color: ext.color } }, ext.name),
                      h('div', { style: { fontSize: 11, color: '#94a3b8', fontFamily: 'ui-monospace, Menlo, monospace' } },
                        '~' + ext.mya + ' MYA')),
                    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 } },
                      h('div', null,
                        h('div', { style: { fontSize: 9, fontWeight: 800, color: '#fb923c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, '🔥 Cause'),
                        ext.cause),
                      h('div', null,
                        h('div', { style: { fontSize: 9, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, '💀 What was lost'),
                        ext.lost),
                      h('div', null,
                        h('div', { style: { fontSize: 9, fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, '🐙 Cephalopod impact'),
                        ext.cephalopodImpact),
                      h('div', null,
                        h('div', { style: { fontSize: 9, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, '🌱 Recovery'),
                        ext.recovery)));
                })))
          ) : null,

          // ─── BODY-PLAN EVOLUTION ───
          view === 'body-evolution' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '🐚 How the cephalopod body plan evolved'),
              h('div', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.65, marginBottom: 14 } },
                'The cephalopod body plan went through several radical reorganizations. Each represents a different solution to the same problem: how to be a fast, sensing, predatory mollusk in different ocean conditions.'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
                [
                  { stage: '1', name: 'Straight external shell (orthoconic)',
                    era: 'Cambrian-Ordovician', icon: '📏', color: '#92400e',
                    description: 'The original cephalopod form. Shell is a long cone — animal lives at the open end, gas + ammonia in the chambers behind for buoyancy.',
                    why: 'Simple geometry. Works at small + medium scale. Cameroceras pushed this body plan to 6-9m before structural limits stopped it.',
                    examples: 'Plectronoceras, Cameroceras, Orthoceras' },
                  { stage: '2', name: 'Coiled external shell (planispiral)',
                    era: 'Ordovician-Devonian onward', icon: '🐌', color: '#b45309',
                    description: 'Shell coils in a flat plane. More compact + maneuverable than a long straight shell. Internal chambers + siphuncle still control buoyancy.',
                    why: 'A coiled shell offers more surface area for muscle attachment in less length. Predator gape (max mouth opening) limits prey size, but mobility goes up.',
                    examples: 'Goniatites, ammonites, nautilus' },
                  { stage: '3', name: 'Internal cone shell (belemnite guard)',
                    era: 'Triassic-Cretaceous', icon: '🚀', color: '#854d0e',
                    description: 'Shell pulled INSIDE the body. The hard part becomes a rocket-shaped guard near the tail. Body is now muscular + streamlined.',
                    why: 'Internalizing the shell lets the body flex + jet-propel like a modern squid. Speed becomes a viable strategy. The guard still serves as a buoyancy + structural anchor.',
                    examples: 'Belemnites (all extinct, but lineage led to modern squid + cuttlefish)' },
                  { stage: '4', name: 'Internal flat shell (cuttlebone)',
                    era: 'Cretaceous-onward', icon: '🦪', color: '#7c2d12',
                    description: 'Cuttlefish form: internal shell becomes a flat porous calcium structure (the cuttlebone) for buoyancy control.',
                    why: 'Active buoyancy without sacrificing body flexibility. Cuttlefish can hover, swim with fin undulation, AND jet — combining advantages of multiple prior forms.',
                    examples: 'Modern cuttlefish (Sepia)' },
                  { stage: '5', name: 'No shell at all',
                    era: 'Carboniferous (Pohlsepia) onward', icon: '🐙', color: '#9a3412',
                    description: 'Shell completely lost. Body is pure muscle + skin. The only hard part remaining is the chitin beak.',
                    why: 'Removing the shell lets the body squeeze through any hole bigger than the beak. Trade-off: no built-in protection, must rely on camouflage + cognition + venom.',
                    examples: 'Octopuses (Pohlsepia is the earliest known)' },
                  { stage: '6', name: 'External shell preserved unchanged',
                    era: 'Devonian to today', icon: '🐚', color: '#fb923c',
                    description: 'Nautilus pathway — keeps the ancestral coiled shell + most of the ancestral body plan + the ancestral pace of life. 90 tentacles with sticky pads instead of suckers.',
                    why: 'Sometimes the original solution stays optimal for an unchanging niche. Deep reef + carrion scavenging requires armor + slow pace — the 400-million-year-old design still works.',
                    examples: 'Nautilus pompilius (the only living example)' }
                ].map(function(stage, i) {
                  return h('div', { key: i,
                    style: { display: 'flex', gap: 14, padding: '12px 14px',
                      background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.3)',
                      borderLeft: '4px solid ' + stage.color, borderRadius: 10 } },
                    h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 60, flexShrink: 0 } },
                      h('div', { style: { fontSize: 32, lineHeight: 1 } }, stage.icon),
                      h('div', { style: { fontSize: 14, fontWeight: 900, color: stage.color, fontFamily: 'ui-monospace, Menlo, monospace' } }, stage.stage)),
                    h('div', { style: { flex: 1 } },
                      h('div', { style: { fontSize: 14, fontWeight: 800, color: '#fde68a', marginBottom: 3 } }, stage.name),
                      h('div', { style: { fontSize: 10, color: '#94a3b8', fontFamily: 'ui-monospace, Menlo, monospace', marginBottom: 8 } }, stage.era),
                      h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 6 } }, stage.description),
                      h('div', { style: { fontSize: 11, color: '#e9d5ff', lineHeight: 1.55, fontStyle: 'italic', marginBottom: 6 } },
                        h('b', { style: { color: '#a78bfa' } }, 'Why this works: '), stage.why),
                      h('div', { style: { fontSize: 10, color: '#86efac', lineHeight: 1.5 } },
                        h('b', null, 'Examples: '), stage.examples)));
                }))),
            h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid #a78bfa' }) },
              h('div', { style: subheaderStyle() }, '🌳 The big picture'),
              h('div', { style: { color: '#e9d5ff', fontSize: 13, lineHeight: 1.75 } },
                h('p', { style: { margin: '0 0 12px 0' } },
                  'Six body plans, one phylogeny. All modern cephalopods trace back to the same ~530-million-year-old Cambrian ancestor. The differences between a 6-meter Ordovician sea-monster and a 12-centimeter blue-ringed octopus are differences in evolutionary pressure, not in fundamental architecture.'),
                h('p', { style: { margin: 0, padding: '12px 14px', background: 'rgba(167,139,250,0.1)', borderLeft: '3px solid #a78bfa', borderRadius: 6, fontStyle: 'italic' } },
                  'The cephalopod story is the longest continuous run of intelligence-grade nervous systems on Earth. Half a billion years of evolution iterating on the same problem: how to be a smart, sensing, predatory mollusk. Modern octopuses are the latest output of that process. Each new species is the current draft, not the final.')))
          ) : null
        );
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 7 — JET PROPULSION LAB
      // ═══════════════════════════════════════════════════════
      function renderJetLab() {
        // Species reference data for jet propulsion
        var JET_SPECIES = {
          humboldt: { name: 'Humboldt Squid', emoji: '🦑', emojiTail: '🦑',
            mantleVolume: 400, contractionKPa: 80, siphonDiameter: 22,
            massKg: 6, topSpeed: 25,
            notes: 'Top sprint speed of any cephalopod. Pack-hunts at speed. Mantle is essentially all muscle.' },
          giantPac: { name: 'Giant Pacific Octopus', emoji: '🐙',
            mantleVolume: 800, contractionKPa: 45, siphonDiameter: 28,
            massKg: 25, topSpeed: 4,
            notes: 'Big mantle BUT massive body to push around. Uses jet mostly to steer while crawling, not for travel.' },
          commonOcto: { name: 'Common Octopus', emoji: '🐙',
            mantleVolume: 200, contractionKPa: 50, siphonDiameter: 15,
            massKg: 3, topSpeed: 6,
            notes: 'Default octopus jet — strong enough for emergency escape, but inefficient for sustained swimming.' },
          cuttle: { name: 'Common Cuttlefish', emoji: '🦑',
            mantleVolume: 300, contractionKPa: 35, siphonDiameter: 18,
            massKg: 2, topSpeed: 5,
            notes: 'Uses fin undulation for normal swimming; jet reserved for escape. Cuttlebone gives neutral buoyancy so jet doesn\'t fight gravity.' },
          nautilus: { name: 'Chambered Nautilus', emoji: '🐚',
            mantleVolume: 250, contractionKPa: 30, siphonDiameter: 14,
            massKg: 1.5, topSpeed: 3,
            notes: 'Slowest jet. Uses buoyancy chambers in shell more than active swimming. The "slow-motion" cephalopod.' }
        };
        var speciesId = d.jetSpeciesId || 'humboldt';
        var sp = JET_SPECIES[speciesId];
        var vol = d.jetMantleVolume != null ? d.jetMantleVolume : sp.mantleVolume;
        var kpa = d.jetContractionKPa != null ? d.jetContractionKPa : sp.contractionKPa;
        var dia = d.jetSiphonDiameter != null ? d.jetSiphonDiameter : sp.siphonDiameter;
        // Physics calculations
        var rho = 1025; // seawater density kg/m³
        var pressureP = kpa * 1000; // Pa
        // Bernoulli: v_jet = sqrt(2P/ρ)
        var vJet = Math.sqrt(2 * pressureP / rho); // m/s
        // Siphon cross-sectional area
        var area = Math.PI * Math.pow((dia / 2) / 1000, 2); // m²
        // Mass expelled per unit time (assuming continuous flow during contraction)
        var massFlow = rho * area * vJet; // kg/s
        // Thrust (steady-state): F = ρ * A * v²
        var thrustN = rho * area * Math.pow(vJet, 2); // Newtons
        // Acceleration: a = F / m_body
        var accel = thrustN / sp.massKg; // m/s²
        // Energy per pulse (V/1000 m³ of water expelled at vJet velocity)
        var pulseMass = rho * (vol / 1000) / 1000; // kg, fix m³ conversion: vol mL = vol/1e6 m³ → kg = rho * vol/1e6
        pulseMass = rho * (vol / 1e6);
        var pulseEnergy = 0.5 * pulseMass * Math.pow(vJet, 2); // Joules (kinetic energy imparted to water)
        // Verdict — how this compares to species' real-world performance
        var ratio = vJet / Math.max(1, sp.topSpeed);
        var verdict = ratio > 1.4 ? { color: '#fca5a5', label: 'Above realistic top speed', note: 'These settings would exceed ' + sp.name + '\'s documented top speed. Cephalopod muscle limits + body drag cap real performance well below the theoretical Bernoulli velocity.' } :
                      ratio > 0.8 ? { color: '#86efac', label: 'Realistic peak performance', note: 'These settings approach ' + sp.name + '\'s documented top sprint speed (' + sp.topSpeed + ' m/s).' } :
                      ratio > 0.4 ? { color: '#fbbf24', label: 'Sustained-swim range', note: 'Typical of relaxed cruising speeds. Most cephalopod swimming happens here.' } :
                                    { color: '#cbd5e1', label: 'Hovering / fine maneuver', note: 'Gentle steering jet. Octopuses spend most of their time at speeds in this range.' };
        return h('div', null,
          panelHeader('🚀 Jet Propulsion Lab',
            'Cephalopod jet propulsion uses Newton\'s 3rd law directly: water gets pushed out, cephalopod gets pushed forward. Mantle = reservoir, siphon = nozzle. The physics is computable — set the variables and see what comes out.'),

          // Science primer
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '⚗️ The physics'),
            h('div', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.7, marginBottom: 14 } },
              'Bernoulli\'s principle gives the exit velocity of water from the siphon: ',
              h('code', { style: { background: 'rgba(167,139,250,0.15)', color: '#e9d5ff', padding: '2px 6px', borderRadius: 4, fontFamily: 'ui-monospace, Menlo, monospace' } },
                'v_jet = √(2·P/ρ)'),
              ' where P is mantle pressure and ρ is seawater density (1025 kg/m³). Thrust scales with siphon area and jet velocity squared: ',
              h('code', { style: { background: 'rgba(167,139,250,0.15)', color: '#e9d5ff', padding: '2px 6px', borderRadius: 4, fontFamily: 'ui-monospace, Menlo, monospace' } },
                'F = ρ·A·v²'),
              '. Bigger siphon = more area = more thrust, but at the cost of slower jet velocity (Bernoulli is independent of A; thrust IS).')),

          // Species selector
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '🦑 Pick a species'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
              Object.keys(JET_SPECIES).map(function(sid) {
                var jsp = JET_SPECIES[sid];
                var active = speciesId === sid;
                return h('button', { key: sid,
                  onClick: function() {
                    setCL({ jetSpeciesId: sid, jetMantleVolume: jsp.mantleVolume, jetContractionKPa: jsp.contractionKPa, jetSiphonDiameter: jsp.siphonDiameter });
                    awardXP(1);
                  },
                  'aria-pressed': active ? 'true' : 'false',
                  style: { padding: '10px 14px',
                    background: active ? 'rgba(99,102,241,0.3)' : 'rgba(15,23,42,0.5)',
                    color: active ? '#c7d2fe' : '#cbd5e1',
                    border: '1px solid ' + (active ? 'rgba(167,139,250,0.6)' : 'rgba(100,116,139,0.3)'),
                    borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6 } },
                  h('span', { 'aria-hidden': 'true' }, jsp.emoji), jsp.name);
              }))),

          // Variable inputs
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '🔧 Tune the variables'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 14 } },
              [
                { label: 'Mantle volume (mL)', key: 'jetMantleVolume', val: vol, min: 50, max: 1500, step: 25, color: '#fb923c',
                  hint: 'How much water the mantle holds. Bigger = more thrust per pulse, but slower refill.' },
                { label: 'Contraction pressure (kPa)', key: 'jetContractionKPa', val: kpa, min: 10, max: 150, step: 5, color: '#dc2626',
                  hint: 'How hard the mantle muscles squeeze. Real cephalopods produce 20-100 kPa (humans cough ~10 kPa).' },
                { label: 'Siphon diameter (mm)', key: 'jetSiphonDiameter', val: dia, min: 5, max: 50, step: 1, color: '#38bdf8',
                  hint: 'Nozzle size. Bigger = more thrust but slower jet velocity. Tradeoff is real.' }
              ].map(function(slider, i) {
                return h('div', { key: i, style: { background: 'rgba(15,23,42,0.5)', padding: '10px 12px', borderRadius: 8, borderLeft: '3px solid ' + slider.color } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: 700 } },
                    h('span', null, slider.label),
                    h('span', { style: { fontFamily: 'ui-monospace, Menlo, monospace', color: slider.color } }, slider.val)),
                  h('input', { type: 'range', min: slider.min, max: slider.max, step: slider.step, value: slider.val,
                    onChange: function(e) { var p = {}; p[slider.key] = parseFloat(e.target.value); setCL(p); },
                    'aria-label': slider.label,
                    style: { width: '100%', accentColor: slider.color } }),
                  h('div', { style: { fontSize: 10, color: '#cbd5e1', marginTop: 4, lineHeight: 1.45, fontStyle: 'italic' } }, slider.hint));
              }))),

          // Results panel — physics outputs
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '📊 Computed outputs'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 14 } },
              [
                { label: 'Jet velocity', val: vJet.toFixed(1), unit: 'm/s', color: '#fb923c', formula: 'v = √(2P/ρ)' },
                { label: 'Thrust force', val: thrustN.toFixed(1), unit: 'N', color: '#dc2626', formula: 'F = ρAv²' },
                { label: 'Body acceleration', val: accel.toFixed(2), unit: 'm/s²', color: '#a78bfa', formula: 'a = F / m_body' },
                { label: 'Energy per pulse', val: pulseEnergy.toFixed(2), unit: 'J', color: '#fbbf24', formula: '½ρV·v²' }
              ].map(function(stat, i) {
                return h('div', { key: i,
                  style: { background: 'rgba(15,23,42,0.6)', border: '1px solid ' + stat.color + '40',
                    borderLeft: '3px solid ' + stat.color, padding: '10px 12px', borderRadius: 8 } },
                  h('div', { style: { fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, stat.label),
                  h('div', { style: { fontSize: 22, fontWeight: 900, color: stat.color, fontFamily: 'ui-monospace, Menlo, monospace' } }, stat.val),
                  h('div', { style: { fontSize: 10, color: '#cbd5e1', fontFamily: 'ui-monospace, Menlo, monospace' } }, stat.unit),
                  h('div', { style: { fontSize: 9, color: '#64748b', marginTop: 3, fontFamily: 'ui-monospace, Menlo, monospace' } }, stat.formula));
              })),
            // Verdict
            h('div', { style: { background: verdict.color + '15', border: '1px solid ' + verdict.color + '55',
              borderLeft: '4px solid ' + verdict.color, padding: '10px 14px', borderRadius: 8 } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: verdict.color, marginBottom: 4 } },
                'Reality check: ' + verdict.label),
              h('div', { style: { fontSize: 11, color: '#e2e8f0', lineHeight: 1.55 } }, verdict.note),
              h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 6, fontFamily: 'ui-monospace, Menlo, monospace' } },
                'Documented top speed for ' + sp.name + ': ' + sp.topSpeed + ' m/s'))),

          // The systemic-heart-stops biology callout
          h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid #dc2626' }) },
            h('div', { style: subheaderStyle() }, '❤️ The strange biology of jet swimming'),
            h('div', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.7 } },
              h('p', { style: { margin: '0 0 10px 0' } },
                'Cephalopods have ',
                h('b', { style: { color: '#dc2626' } }, 'three hearts'),
                ' — two branchial hearts (one per gill) and one systemic heart that pumps blood to the body. Here\'s the weird part: ',
                h('b', { style: { color: '#fde68a' } }, 'the systemic heart STOPS BEATING during sustained jet swimming'),
                '. Blood circulation pauses.'),
              h('p', { style: { margin: '0 0 10px 0' } },
                'Why? Jet swimming generates enormous internal pressure during each mantle contraction — high enough to interrupt the systemic heart\'s pumping cycle. The cephalopod is essentially holding its circulatory breath while it sprints.'),
              h('p', { style: { margin: 0 } },
                'This is part of why octopuses prefer ',
                h('b', null, 'crawling'),
                ' (using their arms on the substrate) for any distance over a few body-lengths — their circulatory system can\'t sustain a long jet swim. Squid, with more streamlined bodies + denser muscle, manage longer jet phases but still pay the cost. Humboldt squid pack-hunts feature short sprint pulses interspersed with recovery glides.')))
        );
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 7 — INTELLIGENCE LAB
      // ═══════════════════════════════════════════════════════
      function renderIntelLab() {
        var CASES = {
          otto: { name: 'Otto', species: 'Common Octopus', where: 'Sea Star Aquarium, Coburg, Germany',
            emoji: '💡', color: '#fbbf24',
            story: 'In 2008, Otto repeatedly short-circuited the aquarium\'s lights by climbing to the rim of his tank, aiming his siphon at the bright overhead lamp, and shooting water at it. He did it deliberately, repeatedly, only when the aquarium was closed at night. Researchers eventually realized he was bothered by the lights AND figured out he could turn them off with water.',
            takeaway: 'Cause-and-effect reasoning + tool-like use of a body part (the siphon) for a non-locomotor purpose. The lights weren\'t food. He was choosing comfort.' },
          inky: { name: 'Inky', species: 'Common Octopus', where: 'National Aquarium of New Zealand',
            emoji: '🌊', color: '#38bdf8',
            story: 'In April 2016, Inky squeezed out of his tank during the night, crawled 3 meters across the floor, found a 15-cm-diameter drainpipe leading to the ocean, and escaped to sea. Aquarium staff found a slime trail and a small tank-mate (Blotchy) who hadn\'t left.',
            takeaway: 'Spatial reasoning + sequential planning under time pressure + the body-knows-where-the-beak-goes physical intelligence. Inky knew the geography of the room.' },
          heidi: { name: 'Heidi', species: 'Common Octopus', where: 'Alaska Pacific University, PBS documentary',
            emoji: '🌈', color: '#a78bfa',
            story: 'During a 2019 documentary, biologist David Scheel filmed Heidi sleeping. Her skin cycled through complex color changes — pale, mottled, dark, with patterns associated in waking life with hunting and camouflage. Many biologists interpret this as evidence she was DREAMING.',
            takeaway: 'Active brain processing during sleep that produces meaningful skin patterns. If chromatophores follow inner state, and skin changes during sleep, then the inner state of dreaming is being expressed externally. Direct view of a non-human dream-state.' },
          coconut: { name: 'Coconut Octopus tool use', species: 'Amphioctopus marginatus', where: 'Indonesia (Finn et al. 2009 paper)',
            emoji: '🥥', color: '#fb923c',
            story: 'Finn, Tregenza & Norman documented coconut octopuses collecting discarded coconut shell halves, "stilt-walking" them across open seafloor on rigid arms (looking awkward, like the shell was bothering them), then later assembling pairs of shells as a hideout when needed.',
            takeaway: 'The first confirmed tool use in an invertebrate. The shells are useless during transport — only valuable for future shelter. That\'s the technical definition of tool use: planning for future utility, not immediate.' },
          mirror: { name: 'Mirror self-recognition', species: 'Various', where: 'Aquariums + labs worldwide',
            emoji: '🪞', color: '#86efac',
            story: 'The mirror test (Gallup, 1970) checks if an animal recognizes its reflection as itself by marking the body somewhere only visible in the mirror — then watching whether the animal touches the mark. Octopuses have mixed results. Some studies show interest in mirrors without classic self-recognition; others find they ignore reflections entirely (suggesting they may not pass the test, OR may be using a different cognitive framework where self-recognition isn\'t their priority).',
            takeaway: 'Maybe cephalopod consciousness doesn\'t work through the same self/other categories we use. Distributed intelligence in arm ganglia might have a completely different mental architecture — no central "I" to recognize.' },
          opticgland: { name: 'Optic Gland + Programmed Death', species: 'Common Octopus', where: 'Wang Lab, U Chicago (2018, 2022)',
            emoji: '⏳', color: '#fca5a5',
            story: 'In 2018, Wang et al. identified the cholesterol-producing optic gland as the trigger of post-reproductive senescence in octopuses. After mating, the gland releases steroid hormones that cause the octopus to stop eating, self-mutilate, and die within weeks. Removing the gland in lab octopuses extended life dramatically — but the now-zombie octopuses also stopped brooding their eggs.',
            takeaway: 'Octopus death isn\'t accidental — it\'s programmed. The same gland that triggers reproduction also triggers death. This is one of the cleanest examples of programmed senescence ("planned obsolescence") known in any animal.' },
          consciousness: { name: 'The consciousness question', species: 'All cephalopods', where: 'Philosophy + neuroscience literature',
            emoji: '🤔', color: '#c7d2fe',
            story: 'The Cambridge Declaration on Consciousness (2012, signed at FCMConference) named cephalopods as one of the non-mammalian animals showing evidence of consciousness-correlated brain substrates. The UK recognized octopuses as sentient beings in 2021 (Animal Welfare (Sentience) Act, expanded after the LSE 2021 review by Birch et al.). In 2024, several countries are debating whether octopus farming should be banned outright on welfare grounds.',
            takeaway: 'Cephalopods may experience subjective states. Their nervous system architecture is so different from ours that "what it is like" to be an octopus might be fundamentally alien — but the experiential dimension is increasingly hard to deny. This has direct implications for fisheries, aquaculture, and lab research ethics.' }
        };
        var caseId = d.intelSelectedCase || 'otto';
        var c = CASES[caseId];
        return h('div', null,
          panelHeader('💡 Intelligence Lab',
            'Seven case studies that built our current understanding of cephalopod cognition. Each is a documented research finding or famous individual that changed how biologists think about non-human minds.'),

          // Case picker
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '📚 Pick a case study'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 } },
              Object.keys(CASES).map(function(cid) {
                var c2 = CASES[cid];
                var active = caseId === cid;
                return h('button', { key: cid,
                  onClick: function() { setCL({ intelSelectedCase: cid }); awardXP(1); clAnnounce('Selected ' + c2.name); },
                  'aria-pressed': active ? 'true' : 'false',
                  style: { padding: '10px 12px', textAlign: 'left',
                    background: active ? 'rgba(99,102,241,0.3)' : 'rgba(15,23,42,0.5)',
                    color: active ? '#c7d2fe' : '#cbd5e1',
                    border: '1px solid ' + (active ? 'rgba(167,139,250,0.6)' : 'rgba(100,116,139,0.3)'),
                    borderLeft: '3px solid ' + c2.color,
                    borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 16 } }, c2.emoji),
                    h('div', { style: { fontWeight: 800, fontSize: 12, color: active ? '#fde68a' : '#e2e8f0' } }, c2.name)));
              }))),

          // Selected case detail
          h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid ' + c.color }) },
            h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
              h('span', { 'aria-hidden': 'true', style: { fontSize: 36, lineHeight: 1 } }, c.emoji),
              h('div', { style: { flex: 1, minWidth: 220 } },
                h('div', { style: { fontSize: 20, fontWeight: 900, color: c.color, letterSpacing: '-0.01em' } }, c.name),
                h('div', { style: { fontSize: 11, color: '#a78bfa', marginTop: 2 } }, c.species + ' · ' + c.where))),
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.75, marginBottom: 14 } }, c.story),
            h('div', { style: { background: c.color + '15', borderLeft: '3px solid ' + c.color,
              padding: '12px 14px', borderRadius: 6 } },
              h('div', { style: { fontSize: 10, fontWeight: 800, color: c.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } },
                '🎯 The takeaway'),
              h('div', { style: { fontSize: 12, color: '#fde68a', lineHeight: 1.7, fontStyle: 'italic' } }, c.takeaway))),

          // The big question panel
          h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid #a78bfa' }) },
            h('div', { style: subheaderStyle() }, '🤔 The hard question'),
            h('div', { style: { color: '#e9d5ff', fontSize: 13, lineHeight: 1.75 } },
              h('p', { style: { margin: '0 0 12px 0' } },
                'Octopuses last shared a common ancestor with vertebrates about ',
                h('b', null, '600 million years ago'),
                ' — at the level of a flatworm-like marine animal with no real brain. Everything cephalopods have built since (camera eyes, problem-solving cognition, possibly subjective experience) evolved ',
                h('b', null, 'completely independently'),
                ' from the path that led to mammals.'),
              h('p', { style: { margin: '0 0 12px 0' } },
                'If consciousness exists in octopuses, it isn\'t consciousness like ours derived from a shared ancestor. It would be a ',
                h('b', { style: { color: '#fde68a' } }, 'second, independent evolutionary instance of consciousness on Earth'),
                '. That has implications for how we study minds, treat animals, and even how we look for life elsewhere.'),
              h('p', { style: { margin: 0, padding: '12px 14px', background: 'rgba(167,139,250,0.1)', borderRadius: 8, fontStyle: 'italic' } },
                '"The octopus is the closest thing to an intelligent alien we may ever meet." — Peter Godfrey-Smith, ',
                h('em', null, 'Other Minds'),
                ' (2016)')))
        );
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 8 — RESEARCH METHODS LAB
      // ═══════════════════════════════════════════════════════
      // How cephalopods are actually studied. Methodology section
      // that complements Intelligence Lab's case-studies.
      function renderResearchMethods() {
        var METHODS = [
          { id: 'ymaze', name: 'Y-Maze Learning', icon: '🔀', color: '#a78bfa',
            era: 'Boyle + Wells, 1960s onward',
            setup: 'Octopus enters a Y-shaped tank. One arm leads to food, the other to a mild shock or nothing. Researchers measure how many trials it takes to learn which arm to choose.',
            findings: 'Octopuses learn associative tasks in 5-20 trials, comparable to rats. They retain the learning for weeks. They also generalize — once trained, they apply the rule to slight variations (different arm color, different visual cue).',
            limits: 'Y-maze is a vertebrate-designed paradigm. Octopuses solve it but it doesn\'t reveal what they\'re uniquely good at (which is probably distributed-sensory tasks more than centralized rule-following).',
            why: 'The foundational test that demonstrated cephalopods can learn. Before Boyle + Wells\'s work, cognitive scientists weren\'t sure invertebrates could form lasting associations.' },
          { id: 'mirror', name: 'Mirror Self-Recognition', icon: '🪞', color: '#86efac',
            era: 'Gallup 1970 (general); cephalopod tests 1990s-2020s',
            setup: 'Mark the animal\'s body somewhere visible only via mirror (a colored dot). Watch whether the animal touches its own mark (suggesting recognition) or treats the mirror image as another animal.',
            findings: 'Cephalopods show MIXED results. Some studies find octopuses ignore mirrors (no recognition). Other studies find investigative behavior but no mark-touching. Cuttlefish 2024 work suggests they may discriminate self from non-self via different criteria.',
            limits: 'The mirror test was built around primates\' visual self-recognition. Cephalopods may have distributed self-models that don\'t map to a "look at the marked body part" response. Negative results don\'t mean no self-awareness — they mean this specific test doesn\'t reveal it.',
            why: 'Forces the question: what would self-awareness LOOK LIKE in an animal with 8 arms that each have their own ganglion? The mirror test assumes one self, one mark, one motor response. Maybe cephalopods need a different test.' },
          { id: 'tooluse', name: 'Tool Use Documentation', icon: '🥥', color: '#fb923c',
            era: 'Finn, Tregenza & Norman 2009 paper onward',
            setup: 'Underwater video observation over thousands of hours. Researchers scuba-dive in Indonesian coastal waters, follow individual coconut octopuses, document discarded-shell-carrying behavior + later shelter assembly.',
            findings: 'Coconut octopuses (Amphioctopus marginatus) regularly collect + transport halved coconut shells across open sand — a behavior with no immediate benefit (they look awkward + slow while doing it) — then assemble paired shells as shelter when needed. First confirmed invertebrate tool use.',
            limits: 'Field observation can\'t test cognitive intent. Maybe the octopus likes the texture of the shell + benefits from shelter as a side effect — but the SEPARATION between transport (cost) + assembly (later benefit) is the technical definition of tool use, regardless of subjective experience.',
            why: 'Changed our understanding of invertebrate cognition. Tool use was previously thought to require vertebrate-level (specifically primate or corvid-level) brains. Cephalopods broke that assumption.' },
          { id: 'retention', name: 'Long-Term Memory Tasks', icon: '📅', color: '#fbbf24',
            era: 'Hochner + Glanzman + Sumbre labs, 2000s onward',
            setup: 'Train octopus on a task (e.g., distinguish shapes for food). Wait 1 week, 4 weeks, 6 months. Test retention without re-training.',
            findings: 'Octopuses retain learned discriminations for at least 4-6 weeks. Some studies show retention up to several months. This is significant given their short lifespan (1-2 years) — the memory window is a large fraction of their life.',
            limits: 'Retention testing requires keeping the same individual alive + healthy in captivity for weeks/months. Octopus welfare in long captivity is genuinely difficult — most lab octopuses show signs of stress + reduced learning over time.',
            why: 'Demonstrates that cephalopod learning isn\'t just transient conditioning. They form what researchers consider real memory traces, consistent with the architecture of their vertical lobe (a central-brain structure analogous in some ways to vertebrate hippocampus).' },
          { id: 'pain', name: 'Pain + Nociception Research', icon: '⚠️', color: '#fca5a5',
            era: 'Crook, Walters 2011 onward; Birch et al. 2021 LSE review',
            setup: 'Multiple paradigms: (1) measure behavioral responses to noxious stimuli, (2) test for sensitization (does prior noxious stimulus increase response to later mild stimulus?), (3) check whether anesthetics block nociceptive responses, (4) look for self-protective behaviors after injury.',
            findings: 'Cephalopods show ALL classic indicators of pain perception: location-specific protective responses, sensitization after injury, anesthetic-blockable nociception, behavioral changes that persist beyond the injury moment. The 2021 LSE review concluded "very strong evidence" of pain perception across cephalopods + decapod crustaceans.',
            limits: 'You can\'t directly measure subjective suffering — we infer from behavioral + neurophysiological proxies. Strict philosophers note this is the same evidence we use for fish + other animals where pain is now widely accepted.',
            why: 'Direct basis for the UK 2021 Animal Welfare (Sentience) Act amendment recognizing cephalopods + decapods as sentient. Has practical impact: governs research ethics review, aquaculture welfare standards, slaughter methods.' },
          { id: 'personality', name: 'Personality Studies', icon: '🎭', color: '#38bdf8',
            era: 'Mather + Anderson 1993 onward',
            setup: 'Repeated behavioral observations of individual cephalopods. Score each on dimensions: bold vs shy, exploratory vs cautious, active vs passive, reactivity to novel objects. Test whether scores are consistent across time + situations.',
            findings: 'Cephalopods show CONSISTENT individual personality differences across years (within their short lifespan). "Bold" octopuses are bold across tasks. "Shy" individuals are shy across tasks. This is the same definition + statistical structure used for vertebrate personality research.',
            limits: 'Sample sizes are usually small (octopuses are individual + housed individually). Cross-species comparison is hard because each species has different baseline behaviors. The dimensions used may be vertebrate-biased.',
            why: 'Suggests cephalopod minds aren\'t just "octopus does octopus things" — different individuals have different cognitive styles. Has implications for aquaculture (some individuals would suffer more from confinement) + research (effects of single-subject studies on dimension-defining experiments).' },
          { id: 'physiology', name: 'Arm Ganglion Electrophysiology', icon: '⚡', color: '#0ea5e9',
            era: 'Sumbre lab + Hochner lab, 2000s onward',
            setup: 'Surgically isolate octopus arm ganglion in physiological saline. Stimulate sensory inputs (tactile, chemical) with controlled probes. Record motor neuron outputs + reflexes. Compare to intact-animal behavior.',
            findings: 'Isolated arms perform location-specific responses to noxious stimuli, withdraw from threatening contact, can grasp + manipulate small objects. The ganglion contains complete circuits for simple decision-making — touch, evaluate, respond. Central brain isn\'t required for arm-level intelligence.',
            limits: 'Arms separated from the body don\'t have full behavioral repertoire — they can\'t learn new tasks in isolation, just execute the pre-existing circuits. The full distributed cognition emerges from arm-ganglion + central-brain interaction.',
            why: 'Direct neurophysiological evidence for the "9 brains" interpretation. The 2/3 of neurons in the arms aren\'t passive sensory — they\'re computing. This reframes what "an octopus thinks" means at the level of brain anatomy.' },
          { id: 'genome', name: 'Genome Sequencing', icon: '🧬', color: '#a16207',
            era: 'Albertin et al. 2015 (octopus); cuttlefish + squid 2017-2022',
            setup: 'Extract DNA from cephalopod tissue. Sequence using next-generation methods. Annotate genes. Compare to other animal genomes.',
            findings: 'The octopus genome has ~33,000 genes (more than humans). Massive expansion in protocadherin family (cell-cell signaling, especially in nervous tissue). Hundreds of genes are UNIQUE to cephalopods. RNA editing — modifying RNA after transcription — is unusually heavy in cephalopod neurons (10-fold higher than humans), suggesting a different mode of cognitive flexibility.',
            limits: 'Reading a genome doesn\'t tell you what an animal\'s mind is like. The unique genes have to be functionally tested individually, which takes decades. Many functions are still inferred from sequence similarity rather than direct experiment.',
            why: 'Confirms that cephalopod intelligence evolved via different genetic mechanisms than vertebrate intelligence. The RNA editing finding in particular suggests cephalopods use a fundamentally different strategy for nervous-system adaptability — editing protein behavior on the fly rather than purely via gene expression.' }
        ];
        var sel = METHODS.find(function(m) { return m.id === (d.methodsSelected || 'ymaze'); }) || METHODS[0];
        return h('div', null,
          panelHeader('🔬 Research Methods Lab',
            'How we actually study cephalopods. Every claim in the Intelligence Lab + Conservation Lab is grounded in one or more of these methodological approaches. Each method has strengths + blind spots — the science is built from triangulating across multiple approaches.'),

          // Method picker
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '🛠️ Methodologies'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 } },
              METHODS.map(function(m) {
                var active = m.id === (d.methodsSelected || 'ymaze');
                return h('button', { key: m.id,
                  onClick: function() { setCL({ methodsSelected: m.id }); awardXP(1); clAnnounce('Selected ' + m.name); },
                  'aria-pressed': active ? 'true' : 'false',
                  style: { padding: '10px 12px', textAlign: 'left',
                    background: active ? 'rgba(99,102,241,0.3)' : 'rgba(15,23,42,0.5)',
                    color: active ? '#c7d2fe' : '#cbd5e1',
                    border: '1px solid ' + (active ? 'rgba(167,139,250,0.6)' : 'rgba(100,116,139,0.3)'),
                    borderLeft: '3px solid ' + m.color,
                    borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 16 } }, m.icon),
                  h('div', null,
                    h('div', { style: { fontWeight: 800, fontSize: 12, color: active ? '#fde68a' : '#e2e8f0' } }, m.name)));
              }))),

          // Selected method detail
          h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid ' + sel.color }) },
            h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10, flexWrap: 'wrap' } },
              h('span', { 'aria-hidden': 'true', style: { fontSize: 30, lineHeight: 1 } }, sel.icon),
              h('div', { style: { flex: 1, minWidth: 240 } },
                h('div', { style: { fontSize: 20, fontWeight: 900, color: sel.color, letterSpacing: '-0.01em' } }, sel.name),
                h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 2, fontStyle: 'italic' } }, sel.era))),

            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 14 } },
              [
                { lbl: '🧪 The setup', val: sel.setup, color: '#86efac' },
                { lbl: '📊 What they\'ve found', val: sel.findings, color: '#fbbf24' },
                { lbl: '⚠️ Limitations', val: sel.limits, color: '#fca5a5' },
                { lbl: '💡 Why this matters', val: sel.why, color: '#a78bfa' }
              ].map(function(box, i) {
                return h('div', { key: i,
                  style: { background: 'rgba(15,23,42,0.5)', borderLeft: '3px solid ' + box.color, padding: '10px 12px', borderRadius: 8 } },
                  h('div', { style: { fontSize: 10, fontWeight: 800, color: box.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } }, box.lbl),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.7 } }, box.val));
              }))),

          // Methodological framing
          h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid #a78bfa' }) },
            h('div', { style: subheaderStyle() }, '🌐 The methodological landscape'),
            h('div', { style: { color: '#e9d5ff', fontSize: 13, lineHeight: 1.75 } },
              h('p', { style: { margin: '0 0 12px 0' } },
                'Cephalopod research sits at an intersection of vertebrate-derived methods (Y-mazes, mirror tests, retention tasks) and methods that had to be DESIGNED FROM SCRATCH for cephalopods (arm-ganglion electrophysiology, RNA editing analysis, distributed-cognition behavioral assays).'),
              h('p', { style: { margin: '0 0 12px 0' } },
                'The vertebrate-derived methods work, but their results are often mixed — because they\'re measuring traits that may not be cephalopod-native. The mirror test\'s ambiguity is a feature: it tells us cephalopods don\'t self-recognize the way primates do, but doesn\'t tell us whether they self-recognize a different way.'),
              h('p', { style: { margin: 0, padding: '12px 14px', background: 'rgba(167,139,250,0.1)', borderLeft: '3px solid #a78bfa', borderRadius: 6, fontStyle: 'italic' } },
                'The biggest open question in the field: what would a TRULY cephalopod-native research methodology look like? One that\'s built around 8-armed embodied cognition rather than around centralized-brain assumptions?')))
        );
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 9 — COMPARATIVE COGNITION LAB
      // ═══════════════════════════════════════════════════════
      // Cephalopod intelligence in context — compared to bees,
      // corvids, chimps, dolphins. Shows convergent evolution +
      // distinct cognitive architectures.
      function renderComparativeCognition() {
        var view = d.compView || 'matrix';
        // 5 species across 4 phyla / 2 kingdoms — convergent
        // intelligence at different points on the tree of life.
        var ANIMALS = [
          { id: 'cephalopod', name: 'Common Octopus', emoji: '🐙', phylum: 'Mollusca', taxon: 'Invertebrate',
            color: '#a78bfa',
            divergenceMya: 600, lifespan: '1-2 years',
            neurons: '~500 million (170M brain + ~320M in 8 arm ganglia)',
            brainArch: 'Distributed — 2/3 of neurons in arm ganglia. Central brain donut-shaped around esophagus.',
            social: 'Solitary (mostly). Brief mating contact + lifelong avoidance otherwise.',
            signature: 'Distributed cognition. Each arm has working memory + sensory autonomy + can decide-act locally.',
            crossRef: 'See: Hunter Sim, Camouflage Lab, Body Plan & 9 Brains, Intelligence Lab' },
          { id: 'bee', name: 'Honey Bee', emoji: '🐝', phylum: 'Arthropoda', taxon: 'Invertebrate',
            color: '#fbbf24',
            divergenceMya: 600, lifespan: '6 weeks (worker) / 1-3 years (queen)',
            neurons: '~960,000 (tiny brain, ~1mm³)',
            brainArch: 'Centralized — mushroom bodies (analogous to vertebrate cortex) dominate. No arm-style distribution.',
            social: 'Eusocial — 20-80k bees per colony, division of labor by age + caste.',
            signature: 'Swarm intelligence. Individual bee is simple; colony emerges as a learning, deciding, memorizing super-organism.',
            crossRef: 'See AlloFlow\'s BeeLab tool for full bee cognition + waggle dance + colony decision-making.' },
          { id: 'corvid', name: 'Raven / Crow', emoji: '🦜', phylum: 'Chordata', taxon: 'Vertebrate (bird)',
            color: '#86efac',
            divergenceMya: 320, lifespan: '15-25 years (raven)',
            neurons: '~1.5 billion (~2x more densely packed than mammalian brain)',
            brainArch: 'Centralized vertebrate brain. Nidopallium caudolaterale serves as a cortex-equivalent for executive function.',
            social: 'Social — pairs, family groups, larger flocks. Politically complex.',
            signature: 'Tool use + planning + theory of mind. Caches food + plans for future hunger + remembers individual humans for years.',
            crossRef: 'See AlloFlow\'s BirdLab tool for full bird intelligence + cache memory + observational learning.' },
          { id: 'chimp', name: 'Chimpanzee', emoji: '🦍', phylum: 'Chordata', taxon: 'Vertebrate (mammal/primate)',
            color: '#fb923c',
            divergenceMya: 6, lifespan: '40-50 years (wild)',
            neurons: '~28 billion',
            brainArch: 'Centralized primate brain with massive prefrontal cortex.',
            social: 'Highly social — fission-fusion communities of 20-150, complex political alliances.',
            signature: 'Cultural learning. Different chimp groups have different tool-using traditions taught across generations.',
            crossRef: 'Classic comparative-cognition reference. Common ancestor with humans only 6M years ago.' },
          { id: 'dolphin', name: 'Bottlenose Dolphin', emoji: '🐬', phylum: 'Chordata', taxon: 'Vertebrate (mammal/cetacean)',
            color: '#0ea5e9',
            divergenceMya: 95, lifespan: '40-60 years',
            neurons: '~37 billion',
            brainArch: 'Centralized mammalian brain, second-largest brain-to-body ratio after humans. Unique unihemispheric sleep.',
            social: 'Pod-living with strong individual bonds. Use signature whistles as personal names.',
            signature: 'Vocal learning + cooperative hunting + cross-species cooperation with humans + tool use (sponge-bearing).',
            crossRef: 'Marine mammal cognition — closest non-cephalopod parallel for marine intelligence.' }
        ];
        // 6 cognitive dimensions, rated 0-3 stars per animal
        var DIMENSIONS = [
          { id: 'problemsolve', name: 'Problem Solving', emoji: '🧩',
            description: 'Novel-task problem solving without prior training. Jar-opening, multi-step puzzles, mechanical reasoning.',
            ratings: { cephalopod: 3, bee: 1, corvid: 3, chimp: 3, dolphin: 2 },
            notes: {
              cephalopod: 'Documented jar-opening, puzzle-box solving, escape engineering (Inky, Otto, etc.).',
              bee: 'Solves limited mechanical puzzles in lab (e.g., string-pulling for nectar) but mostly within evolved foraging context.',
              corvid: 'Famous mechanical reasoning — water-displacement, multi-tool sequences, mirror-trickery.',
              chimp: 'Classical problem-solving research (Köhler 1925 onward). Stacks crates for fruit, uses sticks for termites.',
              dolphin: 'Solves cooperative + novel tasks in captivity. Less mechanical aptitude than corvids/octopuses (fewer manipulating digits).'
            } },
          { id: 'tooluse', name: 'Tool Use', emoji: '🥥',
            description: 'Manipulation of objects as tools for delayed benefit. Coconut shells, stick probes, sponges.',
            ratings: { cephalopod: 2, bee: 0, corvid: 3, chimp: 3, dolphin: 2 },
            notes: {
              cephalopod: 'Coconut octopus tool use (Finn 2009). Limited but established.',
              bee: 'No real tool use documented. Builds combs as habitat but not as external tools.',
              corvid: 'Tool-USING + tool-MAKING. Some New Caledonian crows shape sticks into specific tool forms (hook tools).',
              chimp: 'Cultural tool use — termite fishing, nut-cracking with stones, leaf-folding for water. Taught across generations.',
              dolphin: 'Some populations use marine sponges to protect rostrum while foraging on rough sea floor (sponger dolphins).'
            } },
          { id: 'memory', name: 'Memory + Learning', emoji: '📅',
            description: 'Retention time for learned associations. Long-term recall across days/months/years.',
            ratings: { cephalopod: 2, bee: 2, corvid: 3, chimp: 3, dolphin: 3 },
            notes: {
              cephalopod: '4-6 week retention demonstrated in lab. Major fraction of their 1-2 year life.',
              bee: 'Several days for individual associations. Colony-level memory persists across worker generations via comb structure + queen pheromone.',
              corvid: 'Years-long memory. Ravens remember individual humans for 5+ years (those who threatened them stay flagged).',
              chimp: 'Decades. Recall human caretakers from infancy. Reportedly 30+ year retention in some lab cases.',
              dolphin: 'Recognize tank-mates after 20+ years separation (Bruck 2013 study).'
            } },
          { id: 'social', name: 'Social Cognition', emoji: '👥',
            description: 'Reading + responding to other minds. Theory of mind, deception, alliance formation.',
            ratings: { cephalopod: 1, bee: 2, corvid: 3, chimp: 3, dolphin: 3 },
            notes: {
              cephalopod: 'Limited — octopuses are mostly solitary. Some discrimination of individual humans documented.',
              bee: 'Colony-level social. Individual bees recognize colony members via pheromone + dance variation.',
              corvid: 'Sophisticated. Deceive other corvids about food caches when watched. Some evidence of theory-of-mind.',
              chimp: 'Classic theory-of-mind research. Tactical deception, political alliances, knowing-others-know-X.',
              dolphin: 'Coalition politics, individual recognition (signature whistles), cross-species cooperation with humans.'
            } },
          { id: 'sensory', name: 'Sensory Intelligence', emoji: '👁️',
            description: 'Processing complex sensory information into meaningful representations.',
            ratings: { cephalopod: 3, bee: 3, corvid: 2, chimp: 2, dolphin: 3 },
            notes: {
              cephalopod: 'Camera eyes + chromatophore-based skin sensing + polarized-light perception + chemical sensing via suckers. Multi-modal expert.',
              bee: 'Color (incl. UV), polarized light, magnetic fields, dance-decoding. Olfactory pheromone networks.',
              corvid: 'Standard vertebrate vision + spatial mapping. Less multi-modal complexity than the others.',
              chimp: 'Standard primate sensory; no unusual capabilities beyond mammalian baseline.',
              dolphin: 'Active echolocation — builds 3D sound-maps of environment. Can detect tumors in humans via sonar.'
            } },
          { id: 'selfaware', name: 'Self-Awareness', emoji: '🪞',
            description: 'Mirror self-recognition, sense of body ownership, distinguishing self from other.',
            ratings: { cephalopod: 1, bee: 0, corvid: 2, chimp: 3, dolphin: 3 },
            notes: {
              cephalopod: 'Mixed mirror-test results. Maybe not via this paradigm — distributed cognition might have a different self-model architecture.',
              bee: 'No evidence. Acts more as colony component than discrete self.',
              corvid: 'Magpies pass mirror tests; ravens may. Mixed across species.',
              chimp: 'Reliably passes mirror tests. Self-recognition is established.',
              dolphin: 'Passes mirror tests reliably. Studies show self-investigation behavior in front of mirrors.'
            } }
        ];
        var SUBS = [
          { id: 'matrix', label: 'Comparison Matrix', icon: '📊' },
          { id: 'animal', label: 'Animal Profiles', icon: '🐙' },
          { id: 'dimension', label: 'Cognitive Dimensions', icon: '🧩' },
          { id: 'interpretation', label: 'What This Means', icon: '💡' }
        ];
        var stars = function(n) {
          var out = '';
          for (var i = 0; i < 3; i++) out += i < n ? '★' : '☆';
          return out;
        };
        return h('div', null,
          panelHeader('🧩 Comparative Cognition Lab',
            'Cephalopod intelligence in context. Compared across five animals from different evolutionary lineages — bees (invertebrate, 600M years apart), octopus (invertebrate, 600M years), corvids (vertebrate bird, 320M), dolphins (marine mammal, 95M), chimps (primate, 6M). All five evolved sophisticated cognition. The architectures are different. The capabilities overlap.'),

          // Sub-tab strip
          h('div', { role: 'tablist', 'aria-label': 'Comparative sub-sections',
            style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 } },
            SUBS.map(function(s) {
              var active = view === s.id;
              return h('button', { key: s.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
                onClick: function() { setCL({ compView: s.id }); awardXP(1); },
                style: { padding: '8px 12px',
                  background: active ? 'rgba(99,102,241,0.3)' : 'rgba(15,23,42,0.5)',
                  color: active ? '#c7d2fe' : '#cbd5e1',
                  border: '1px solid ' + (active ? 'rgba(167,139,250,0.6)' : 'rgba(100,116,139,0.3)'),
                  borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6 } },
                h('span', { 'aria-hidden': 'true' }, s.icon), s.label);
            })),

          // ─── MATRIX VIEW ───
          view === 'matrix' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '📊 The big comparison'),
              h('div', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.6, marginBottom: 14 } },
                'Six cognitive dimensions × five animals. Stars: ☆ minimal, ★ documented, ★★ strong, ★★★ exceptional. Click any cell for the specific evidence.'),
              // The matrix table
              h('div', { style: { overflowX: 'auto' } },
                h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12, color: '#e2e8f0' } },
                  h('thead', null,
                    h('tr', null,
                      h('th', { style: { padding: '10px 8px', textAlign: 'left', color: '#94a3b8', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', borderBottom: '1px solid rgba(100,116,139,0.3)' } }, 'Ability'),
                      ANIMALS.map(function(a) {
                        return h('th', { key: a.id, style: { padding: '10px 8px', textAlign: 'center',
                          color: a.color, fontSize: 11, fontWeight: 800, borderBottom: '1px solid rgba(100,116,139,0.3)' } },
                          h('div', { 'aria-hidden': 'true', style: { fontSize: 22, marginBottom: 3 } }, a.emoji),
                          a.name);
                      }))),
                  h('tbody', null,
                    DIMENSIONS.map(function(dim, i) {
                      return h('tr', { key: dim.id, style: { borderBottom: '1px solid rgba(100,116,139,0.15)' } },
                        h('td', { style: { padding: '12px 8px', fontWeight: 700, verticalAlign: 'top' } },
                          h('div', { style: { fontSize: 13, color: '#fde68a', marginBottom: 2 } },
                            h('span', { 'aria-hidden': 'true', style: { marginRight: 4 } }, dim.emoji),
                            dim.name),
                          h('div', { style: { fontSize: 10, color: '#94a3b8', lineHeight: 1.4 } }, dim.description)),
                        ANIMALS.map(function(a) {
                          var rating = dim.ratings[a.id];
                          var starColor = rating === 3 ? '#fbbf24' : rating === 2 ? '#86efac' : rating === 1 ? '#94a3b8' : '#475569';
                          return h('td', { key: a.id,
                            title: dim.notes[a.id],
                            style: { padding: '12px 8px', textAlign: 'center', verticalAlign: 'top', cursor: 'help' } },
                            h('div', { style: { fontSize: 14, color: starColor, letterSpacing: '0.05em', fontFamily: 'ui-monospace, Menlo, monospace' } },
                              stars(rating)),
                            h('div', { style: { fontSize: 10, color: '#cbd5e1', marginTop: 4, lineHeight: 1.45, fontStyle: 'italic' } },
                              dim.notes[a.id]));
                        }));
                    }))))),
            h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginTop: 8, textAlign: 'center' } },
              'Ratings reflect documented evidence in peer-reviewed research. Absence of stars = absence of evidence, not always absence of ability.')
          ) : null,

          // ─── ANIMAL PROFILES ───
          view === 'animal' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '🐙 Pick an animal'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 } },
                ANIMALS.map(function(a) {
                  var active = a.id === (d.compAnimal || 'cephalopod');
                  return h('button', { key: a.id,
                    onClick: function() { setCL({ compAnimal: a.id }); awardXP(1); },
                    'aria-pressed': active ? 'true' : 'false',
                    style: { padding: '10px 12px', textAlign: 'left',
                      background: active ? 'rgba(99,102,241,0.3)' : 'rgba(15,23,42,0.5)',
                      color: active ? '#c7d2fe' : '#cbd5e1',
                      border: '1px solid ' + (active ? 'rgba(167,139,250,0.6)' : 'rgba(100,116,139,0.3)'),
                      borderLeft: '3px solid ' + a.color,
                      borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6 } },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 20 } }, a.emoji),
                    h('div', null,
                      h('div', { style: { fontWeight: 800, fontSize: 12, color: active ? '#fde68a' : '#e2e8f0' } }, a.name),
                      h('div', { style: { fontSize: 9, color: '#94a3b8', marginTop: 2, fontFamily: 'ui-monospace, Menlo, monospace' } }, a.taxon)));
                }))),
            // Selected animal detail
            (function() {
              var sel = ANIMALS.find(function(a) { return a.id === (d.compAnimal || 'cephalopod'); }) || ANIMALS[0];
              return h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid ' + sel.color }) },
                h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14, flexWrap: 'wrap' } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 40, lineHeight: 1 } }, sel.emoji),
                  h('div', { style: { flex: 1, minWidth: 240 } },
                    h('div', { style: { fontSize: 20, fontWeight: 900, color: sel.color, letterSpacing: '-0.01em' } }, sel.name),
                    h('div', { style: { fontSize: 11, color: '#a78bfa', marginTop: 2 } }, sel.phylum + ' · ' + sel.taxon))),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 14 } },
                  [
                    { lbl: '🌳 Divergence from us', val: '~' + sel.divergenceMya + ' million years ago', color: '#fbbf24' },
                    { lbl: '⏳ Lifespan', val: sel.lifespan, color: '#86efac' },
                    { lbl: '🧠 Neuron count', val: sel.neurons, color: '#a78bfa' },
                    { lbl: '🏛️ Brain architecture', val: sel.brainArch, color: '#38bdf8' },
                    { lbl: '👥 Social structure', val: sel.social, color: '#fb923c' }
                  ].map(function(b, i) {
                    return h('div', { key: i,
                      style: { background: 'rgba(15,23,42,0.5)', borderLeft: '3px solid ' + b.color, padding: '10px 12px', borderRadius: 8 } },
                      h('div', { style: { fontSize: 10, fontWeight: 800, color: b.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }, b.lbl),
                      h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, b.val));
                  })),
                h('div', { style: { padding: '12px 14px', background: sel.color + '15', borderLeft: '3px solid ' + sel.color, borderRadius: 6, marginBottom: 10 } },
                  h('div', { style: { fontSize: 10, fontWeight: 800, color: sel.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } },
                    '✨ Cognitive signature'),
                  h('div', { style: { fontSize: 13, color: '#fde68a', lineHeight: 1.7, fontStyle: 'italic' } }, sel.signature)),
                h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' } },
                  sel.crossRef));
            })()
          ) : null,

          // ─── DIMENSION VIEW ───
          view === 'dimension' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '🧩 Pick a cognitive dimension'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 } },
                DIMENSIONS.map(function(dim) {
                  var active = dim.id === (d.compDimension || 'tooluse');
                  return h('button', { key: dim.id,
                    onClick: function() { setCL({ compDimension: dim.id }); awardXP(1); },
                    'aria-pressed': active ? 'true' : 'false',
                    style: { padding: '10px 12px', textAlign: 'left',
                      background: active ? 'rgba(99,102,241,0.3)' : 'rgba(15,23,42,0.5)',
                      color: active ? '#c7d2fe' : '#cbd5e1',
                      border: '1px solid ' + (active ? 'rgba(167,139,250,0.6)' : 'rgba(100,116,139,0.3)'),
                      borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' } },
                    h('span', { 'aria-hidden': 'true', style: { marginRight: 6, fontSize: 16 } }, dim.emoji),
                    dim.name);
                }))),
            // Selected dimension drill-down
            (function() {
              var sel = DIMENSIONS.find(function(dim) { return dim.id === (d.compDimension || 'tooluse'); }) || DIMENSIONS[0];
              // Sort animals by rating descending
              var sorted = ANIMALS.slice().sort(function(a, b) {
                return (sel.ratings[b.id] || 0) - (sel.ratings[a.id] || 0);
              });
              return h('div', { style: cardStyle() },
                h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 28, lineHeight: 1 } }, sel.emoji),
                  h('div', { style: { fontSize: 18, fontWeight: 900, color: '#c7d2fe', letterSpacing: '-0.01em' } }, sel.name)),
                h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.65, marginBottom: 14, fontStyle: 'italic' } },
                  sel.description),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                  sorted.map(function(a) {
                    var r = sel.ratings[a.id];
                    var ratingColor = r === 3 ? '#fbbf24' : r === 2 ? '#86efac' : r === 1 ? '#94a3b8' : '#475569';
                    return h('div', { key: a.id,
                      style: { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.3)',
                        borderLeft: '3px solid ' + a.color, padding: '10px 14px', borderRadius: 8 } },
                      h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4, flexWrap: 'wrap' } },
                        h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, a.emoji),
                        h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fde68a', flex: 1 } }, a.name),
                        h('div', { style: { fontSize: 14, color: ratingColor, fontFamily: 'ui-monospace, Menlo, monospace', letterSpacing: '0.05em' } }, stars(r))),
                      h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.55 } }, sel.notes[a.id]));
                  })));
            })()
          ) : null,

          // ─── INTERPRETATION VIEW ───
          view === 'interpretation' ? h('div', null,
            h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid #a78bfa' }) },
              h('div', { style: subheaderStyle() }, '💡 What these comparisons mean'),
              h('div', { style: { color: '#e9d5ff', fontSize: 13, lineHeight: 1.8 } },
                h('p', { style: { margin: '0 0 14px 0' } },
                  h('b', { style: { color: '#fbbf24' } }, '1. Intelligence isn\'t one thing.'),
                  ' Octopuses, bees, corvids, chimps, and dolphins are all "intelligent" — but they\'re intelligent in different shapes. Bees excel at colony coordination + sensory range; octopuses at multi-modal manipulation + camouflage; corvids at planning + theory of mind; chimps at cultural transmission; dolphins at acoustic + social cognition. ',
                  h('b', null, 'There\'s no scalar "smartness" axis.'),
                  ' Each lineage solved cognition in its own way.'),
                h('p', { style: { margin: '0 0 14px 0' } },
                  h('b', { style: { color: '#fbbf24' } }, '2. Convergence runs deep.'),
                  ' Octopuses and corvids both solve novel puzzles + use tools. Their last common ancestor was a worm-like animal ~600 million years ago. Tool use evolved independently AT LEAST TWICE on the cognitive tree of life (probably more — chimps + corvids + dolphins + octopuses each got there via different routes). ',
                  h('b', null, 'Sophisticated cognition isn\'t a fluke of vertebrate evolution.')),
                h('p', { style: { margin: '0 0 14px 0' } },
                  h('b', { style: { color: '#fbbf24' } }, '3. Architecture matters more than count.'),
                  ' A honey bee has ~960,000 neurons; a human has ~86 billion. The bee makes complex foraging decisions; the human writes symphonies. The ratio of capability to neuron count varies wildly — depending on how the neurons are ',
                  h('em', null, 'organized'),
                  ', what they\'re ',
                  h('em', null, 'optimized for'),
                  ', and how they ',
                  h('em', null, 'connect'),
                  '. Bigger isn\'t simply better. Distributed isn\'t simply worse.'),
                h('p', { style: { margin: '0 0 14px 0' } },
                  h('b', { style: { color: '#fbbf24' } }, '4. Our tests are biased.'),
                  ' Most cognitive tests were designed for primates first, then adapted to other animals. Mirror tests, Y-mazes, tool-shaping puzzles — these all assume a centralized brain making centralized decisions. Cephalopod cognition keeps PARTIALLY passing tests it was never designed for. The honest interpretation: we don\'t yet have good tests for distributed-arm cognition or swarm intelligence. ',
                  h('b', null, 'The animal isn\'t failing the test — the test is failing the animal.')),
                h('p', { style: { margin: 0, padding: '14px 16px', background: 'rgba(167,139,250,0.1)', borderLeft: '3px solid #a78bfa', borderRadius: 6, fontStyle: 'italic' } },
                  '"If we\'re ever to detect intelligence in alien life, we\'ll need cognitive tests that don\'t assume a brain at all — or, more precisely, that don\'t assume our brain. The five animals in this comparison are five different working solutions to the cognition problem. The cephalopod solution is the most alien of the five, and it\'s right here in our oceans." — paraphrased from Peter Godfrey-Smith\'s ',
                  h('em', null, 'Other Minds'),
                  ', 2016.')))
          ) : null
        );
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 10 — CONSERVATION & WELFARE
      // ═══════════════════════════════════════════════════════
      function renderConservation() {
        var sub = d.conservationSection || 'overview';
        var SUBS = [
          { id: 'overview', label: 'Overview', icon: '🌍' },
          { id: 'fisheries', label: 'Fisheries', icon: '🎣' },
          { id: 'farming', label: 'Aquaculture Debate', icon: '🏭' },
          { id: 'shell-trade', label: 'Nautilus Shell Trade', icon: '🐚' },
          { id: 'welfare', label: 'Sentience + Welfare', icon: '⚖️' }
        ];
        return h('div', null,
          panelHeader('🌍 Conservation & Welfare',
            'The fast-changing political + ethical landscape around cephalopods. Populations are RISING globally even as fish populations decline (climate-change winners). UK recognized cephalopods as sentient in 2021. Octopus farming is being debated. This is the section about the future.'),

          // Sub-tab strip
          h('div', { role: 'tablist', 'aria-label': 'Conservation sub-sections',
            style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 } },
            SUBS.map(function(s) {
              var active = sub === s.id;
              return h('button', { key: s.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
                onClick: function() { setCL({ conservationSection: s.id }); awardXP(1); },
                style: { padding: '8px 12px',
                  background: active ? 'rgba(99,102,241,0.3)' : 'rgba(15,23,42,0.5)',
                  color: active ? '#c7d2fe' : '#cbd5e1',
                  border: '1px solid ' + (active ? 'rgba(167,139,250,0.6)' : 'rgba(100,116,139,0.3)'),
                  borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6 } },
                h('span', { 'aria-hidden': 'true' }, s.icon), s.label);
            })),

          // ─── OVERVIEW ───
          sub === 'overview' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '📈 The big picture'),
              h('div', { style: { color: '#cbd5e1', fontSize: 13, lineHeight: 1.75 } },
                h('p', { style: { margin: '0 0 12px 0' } },
                  'Most marine populations are declining. ',
                  h('b', { style: { color: '#86efac' } }, 'Cephalopods are not'),
                  ' — global cephalopod biomass has been climbing for decades. A 2016 paper (Doubleday et al., ',
                  h('em', null, 'Current Biology'),
                  ') analyzed 50+ years of fishery + ecosystem data across 35 species and found a consistent upward trend.'),
                h('p', { style: { margin: '0 0 12px 0' } },
                  'Why? Several theories: (1) ',
                  h('b', { style: { color: '#fde68a' } }, 'short lifespan + rapid reproduction'),
                  ' lets cephalopods respond quickly to changing conditions; (2) ',
                  h('b', { style: { color: '#fde68a' } }, 'release from fish competition + predation'),
                  ' (their main competitors are being fished out); (3) ',
                  h('b', { style: { color: '#fde68a' } }, 'warming oceans favor cephalopod metabolism'),
                  ' — they grow faster in warmer water; (4) ',
                  h('b', { style: { color: '#fde68a' } }, 'dietary flexibility'),
                  ' — most cephalopods are opportunistic carnivores that can switch prey easily.'),
                h('p', { style: { margin: 0 } },
                  'The flip side: targeted fisheries are expanding to match the population increase. Global cephalopod catch is now ',
                  h('b', null, '~4 million tons/year'),
                  ' — nearly all of it consumed by humans. Within that, squid dominate (~3M tons), then octopus + cuttlefish. China, Japan, South Korea, Peru, and several Mediterranean fisheries are the largest players.'))),

            // Conservation status by species
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '📋 IUCN status by species'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 } },
                SPECIES.map(function(sp) {
                  var status = sp.conservation || 'Not assessed';
                  var statusColor = /Threatened|Endangered|CITES/.test(status) ? '#fca5a5' :
                                    /Concern/.test(status) ? '#86efac' :
                                    /Data Deficient|Not assessed/.test(status) ? '#94a3b8' : '#fbbf24';
                  return h('div', { key: sp.id,
                    style: { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.3)',
                      borderLeft: '3px solid ' + statusColor, padding: '10px 12px', borderRadius: 8 } },
                    h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' } },
                      h('span', { 'aria-hidden': 'true' }, sp.emoji),
                      h('div', { style: { fontSize: 13, fontWeight: 700, color: '#fde68a', flex: 1 } }, sp.name)),
                    h('div', { style: { fontSize: 11, color: statusColor, fontWeight: 600 } }, status));
                })))) : null,

          // ─── FISHERIES ───
          sub === 'fisheries' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '🎣 The global cephalopod fishery'),
              h('div', { style: { color: '#cbd5e1', fontSize: 13, lineHeight: 1.75, marginBottom: 14 } },
                h('p', { style: { margin: '0 0 12px 0' } },
                  '~4 million tons of cephalopods are caught globally each year. Squid dominate the catch (~3M tons), followed by octopus (~400k tons) and cuttlefish (~300k tons). The fishery has tripled in the last 60 years.'),
                h('p', { style: { margin: 0 } },
                  'Major fisheries include:')),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 } },
                [
                  { name: 'Humboldt squid', region: 'Eastern Pacific (Peru, Mexico, Chile)', tons: '~700k/year', notes: 'Range expanding northward with warming Pacific. Currently the most sustainable major cephalopod fishery.' },
                  { name: 'Japanese flying squid', region: 'Northwest Pacific (Japan, S. Korea)', tons: '~500k/year', notes: 'Population fluctuates with Pacific Decadal Oscillation; under increasing pressure from East Asian demand.' },
                  { name: 'Argentine shortfin squid', region: 'Southwest Atlantic (Argentina, Falklands)', tons: '~300k/year', notes: 'Highly variable year-to-year; collapse in 2015 followed by recovery.' },
                  { name: 'Common octopus', region: 'Mediterranean + NW Africa', tons: '~80k/year', notes: 'Traditional artisanal fishery in Spain, Portugal, Morocco. Some pots-and-jars methods unchanged for centuries.' },
                  { name: 'Giant Pacific octopus', region: 'Pacific Northwest (Alaska, BC, WA)', tons: '~3k/year', notes: 'Small fishery; mostly bycatch in crab traps. Recreational diving + spearfishing also pressure.' },
                  { name: 'Cuttlefish (various)', region: 'Mediterranean, Atlantic, English Channel', tons: '~300k/year', notes: 'European demand growing as cod fisheries decline. UK + French Channel fisheries are seasonal.' }
                ].map(function(f, i) {
                  return h('div', { key: i,
                    style: { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.3)',
                      borderLeft: '3px solid #fb923c', padding: '10px 12px', borderRadius: 8 } },
                    h('div', { style: { fontSize: 12, fontWeight: 800, color: '#fde68a', marginBottom: 4 } }, f.name),
                    h('div', { style: { fontSize: 10, color: '#fb923c', fontFamily: 'ui-monospace, Menlo, monospace', marginBottom: 4 } },
                      f.region + ' · ' + f.tons),
                    h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } }, f.notes));
                })))) : null,

          // ─── FARMING ───
          sub === 'farming' ? h('div', null,
            h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid #fbbf24' }) },
              h('div', { style: subheaderStyle() }, '🏭 The octopus farming debate'),
              h('div', { style: { color: '#cbd5e1', fontSize: 13, lineHeight: 1.75 } },
                h('p', { style: { margin: '0 0 12px 0' } },
                  'In 2021, Spanish multinational ',
                  h('b', { style: { color: '#fde68a' } }, 'Nueva Pescanova'),
                  ' announced plans to open the world\'s first commercial octopus farm in the Canary Islands. The proposed facility would raise ~1 million common octopuses (',
                  h('em', null, 'Octopus vulgaris'),
                  ') per year for the European seafood market.'),
                h('p', { style: { margin: '0 0 12px 0' } },
                  'The announcement triggered international scientific + ethical pushback. ',
                  h('b', null, 'The 2021 London School of Economics review'),
                  ' (Birch, Burn, Schnell et al., commissioned by the UK government) concluded that "high-welfare octopus farming is impossible" because octopuses are:'),
                h('ul', { style: { margin: '0 0 12px 0', paddingLeft: 20, color: '#e2e8f0', lineHeight: 1.7 } },
                  h('li', null, '*Solitary by nature* — high-density confinement causes chronic stress, fighting, cannibalism'),
                  h('li', null, '*Carnivorous + protein-demanding* — requires ~3kg of wild-caught fish per 1kg of octopus produced (net food deficit)'),
                  h('li', null, '*Sentient* (per UK 2021 recognition) — capable of suffering, with no humane large-scale slaughter method established'),
                  h('li', null, '*Behaviorally complex* — denial of cognitive enrichment causes documented self-mutilation in lab + captive settings')),
                h('p', { style: { margin: 0 } },
                  'As of 2024, the Canary Islands proposal is on hold pending regulatory review. Washington state (2024) and California (pending) have introduced legislation to ban octopus aquaculture preemptively. The EU Animal Welfare Platform has labeled it "high-risk" pending further assessment.')))) : null,

          // ─── SHELL TRADE ───
          sub === 'shell-trade' ? h('div', null,
            h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid #fca5a5' }) },
              h('div', { style: subheaderStyle() }, '🐚 The nautilus shell trade'),
              h('div', { style: { color: '#cbd5e1', fontSize: 13, lineHeight: 1.75 } },
                h('p', { style: { margin: '0 0 12px 0' } },
                  'The chambered nautilus is the only living cephalopod with an external shell. The shell\'s logarithmic spiral has been featured on jewelry, decor, and curio collections for over a century. The pressure is real:'),
                h('ul', { style: { margin: '0 0 12px 0', paddingLeft: 20, color: '#e2e8f0', lineHeight: 1.75 } },
                  h('li', null, 'Filipino + Indonesian fisheries harvest ~100,000+ nautilus per year for the shell trade'),
                  h('li', null, 'Nautilus is ',
                    h('b', { style: { color: '#fca5a5' } }, 'CITES Appendix II'),
                    ' (regulated international trade) as of 2017 — but enforcement is uneven'),
                  h('li', null, 'They reproduce extremely slowly — ~10-12 eggs per year per female, after a 15+ year maturation'),
                  h('li', null, 'Populations in heavily-fished areas have dropped 80%+ in 20 years (IUCN data)'),
                  h('li', null, 'Adding to the problem: nautilus is a deep-water (200-600m) animal — fishing pressure also disturbs deep-reef ecosystems')),
                h('p', { style: { margin: '0 0 12px 0' } },
                  'The species has survived 500 million years of evolution essentially unchanged. It may not survive the past 30 years of shell collecting.'),
                h('p', { style: { margin: 0, padding: '12px 14px', background: 'rgba(252,165,165,0.1)', borderLeft: '3px solid #fca5a5', borderRadius: 6, fontStyle: 'italic' } },
                  'For students: if you see a polished nautilus shell at a tourist market or jewelry store, ask whether it came from a wild-caught animal or is a replica. Many nautilus shells in trade are illegal under CITES.')))) : null,

          // ─── WELFARE ───
          sub === 'welfare' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '⚖️ Sentience + Welfare timeline'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                [
                  { year: '2012', title: 'Cambridge Declaration on Consciousness', detail: 'Signed at the Francis Crick Memorial Conference. Names octopuses + other cephalopods alongside mammals + birds as showing evidence of consciousness-correlated brain substrates.', color: '#a78bfa' },
                  { year: '2010', title: 'EU Directive 2010/63', detail: 'EU law on lab animals adds CEPHALOPODS as the first invertebrates given protections equivalent to vertebrates — they require the same review + welfare standards for research use.', color: '#fbbf24' },
                  { year: '2021 May', title: 'UK LSE review (Birch et al.)', detail: 'Commissioned by UK government. 300-page review concludes "very strong evidence" that octopuses, squid, cuttlefish, and decapod crustaceans are sentient. Recommends animal-welfare protections.', color: '#86efac' },
                  { year: '2021 Nov', title: 'UK Animal Welfare (Sentience) Act', detail: 'Formally amended to include cephalopods + decapods as sentient beings. Their welfare must be considered in government policy. First national law of its kind.', color: '#22c55e' },
                  { year: '2022', title: 'Wang Lab "programmed death" paper', detail: 'U Chicago + Stanford collaboration identifies cholesterol-producing optic gland as trigger of post-reproductive senescence. Adds biological depth to the ethics of farming (they\'re going to die soon anyway — does that matter?).', color: '#fb923c' },
                  { year: '2024', title: 'Washington State preemptive ban', detail: 'WA becomes first US state to ban octopus aquaculture preemptively. California legislation pending. Hawaii + Oregon considering similar measures.', color: '#0ea5e9' }
                ].map(function(ev, i) {
                  return h('div', { key: i,
                    style: { display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 14px',
                      background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.3)',
                      borderLeft: '3px solid ' + ev.color, borderRadius: 8 } },
                    h('div', { style: { minWidth: 60, fontSize: 16, fontWeight: 900, color: ev.color, fontFamily: 'ui-monospace, Menlo, monospace' } }, ev.year),
                    h('div', { style: { flex: 1 } },
                      h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fde68a', marginBottom: 4 } }, ev.title),
                      h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, ev.detail)));
                }))),
            h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid #a78bfa' }) },
              h('div', { style: subheaderStyle() }, '🧭 The practical question'),
              h('div', { style: { color: '#e9d5ff', fontSize: 13, lineHeight: 1.75 } },
                h('p', { style: { margin: '0 0 12px 0' } },
                  'If cephalopods are sentient and have a "second evolutionary instance of consciousness" — what does that mean for:'),
                h('ul', { style: { margin: '0 0 12px 0', paddingLeft: 20, color: '#cbd5e1', lineHeight: 1.8 } },
                  h('li', null, 'Wild capture for food + research? Currently unregulated for invertebrates in most countries.'),
                  h('li', null, 'Aquaculture? Welfare standards for animals with distributed nervous systems aren\'t established.'),
                  h('li', null, 'Public aquariums? Many octopuses self-mutilate in confinement. Most aquariums now rotate cephalopod displays every 6-12 months.'),
                  h('li', null, 'Scientific research? EU + UK already require ethics review for cephalopod experiments. US doesn\'t (NIH still treats them as invertebrates).'),
                  h('li', null, 'Eating them? You might reach different conclusions about a cephalopod meal vs a fish meal vs a chicken meal. The ethics aren\'t obvious.')),
                h('p', { style: { margin: 0, fontStyle: 'italic' } },
                  'There aren\'t clean answers. The questions are genuinely open. That\'s what makes them worth thinking about.')))) : null
        );
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 15 — CEPHALOPODS IN CULTURE (humanities perspective)
      // ═══════════════════════════════════════════════════════
      function renderCulture() {
        var view = d.cultureView || 'myth';
        var SUBS = [
          { id: 'myth', label: 'Myth + Legend', icon: '🐉' },
          { id: 'art', label: 'Art + Imagery', icon: '🎨' },
          { id: 'food', label: 'Food Traditions', icon: '🍱' },
          { id: 'modern', label: 'Modern Cultural Impact', icon: '🎬' }
        ];
        var MYTHS = [
          { name: 'The Kraken', culture: 'Norse + Scandinavian (12th-18th century)', emoji: '🐙', color: '#0ea5e9',
            story: 'Sea monster of Norwegian + Icelandic seafaring lore. Described as a massive cephalopod-like creature large enough to wrap its arms around full-sized ships and drag them under. Sailors\' tales of the Kraken predate scientific knowledge of giant squid by centuries.',
            realBasis: 'Giant squid (Architeuthis dux) + colossal squid (Mesonychoteuthis). The 12-13m giant squid was once thought to be myth; first photographed alive in 2004 by Tsunemi Kubodera in Japan. The Kraken was real all along — just smaller than imagined.' },
          { name: 'Akkorokamui', culture: 'Ainu (northern Japan + Hokkaido)', emoji: '🦑', color: '#dc2626',
            story: 'A massive red octopus deity from the Ainu people\'s mythology, said to inhabit Uchiura Bay. Akkorokamui can grow up to 110 meters long. The deity has both protective and threatening aspects — fishermen pray to it for safety, but it can also drag boats under.',
            realBasis: 'Northern Pacific squid + Pacific giant octopus (Enteroctopus dofleini, which lives in Hokkaido waters). The red coloration matches Humboldt squid bioluminescent flashes during pack hunts. Still venerated at Hokkaido shrines today.' },
          { name: 'He\'e (Hawaiian octopus)', culture: 'Native Hawaiian', emoji: '🌺', color: '#fb923c',
            story: 'In Hawaiian creation mythology (Kumulipo chant), the octopus is the sole survivor of a previous universe. Each universe before ours was wiped out — except the octopus, who emerged from the wreckage to seed the current world. The octopus is treated as ancient, otherworldly, almost an alien intelligence preserved through cosmic resets.',
            realBasis: 'Day octopus (Octopus cyanea) was a major food + cultural species. The creation-mythology framing may be the most sophisticated traditional view of octopus cognition — recognizing their fundamental "otherness" 500 years before modern neuroscience.' },
          { name: 'Yacumama', culture: 'Amazonian (Peru, Brazil)', emoji: '🌊', color: '#86efac',
            story: '"Mother of Water" — sometimes depicted as a serpent, sometimes as a giant cephalopod-like creature dwelling in the Amazon basin\'s deep waters. Said to swallow anything that crosses its path. The name and form vary by tribe and region.',
            realBasis: 'Likely amalgamation of large freshwater fish (arapaima, electric eels, dolphins). No cephalopods live in the Amazon basin — but the imagery cross-pollinated with coastal squid + octopus mythology brought inland.' },
          { name: 'Lusca', culture: 'Caribbean (Bahamas)', emoji: '🦈', color: '#0c4a6e',
            story: 'Half-octopus, half-shark sea monster living in the blue-hole sinkholes of the Bahamas. Said to drag swimmers down into the underwater caves. Local divers + fishermen still tell stories.',
            realBasis: 'Real Caribbean reef octopus + nurse sharks coexist in the same blue holes. Possible composite myth from witnessing octopus + shark in the same dive site. The blue holes themselves are spectacular karst geological features.' },
          { name: 'Octopus in Greek antiquity', culture: 'Ancient Greek (8th century BCE onward)', emoji: '🏺', color: '#a78bfa',
            story: 'Aristotle (350 BCE) wrote in "History of Animals" detailed descriptions of octopus mating, color change, and intelligence — recognizing them as exceptional invertebrates. Greek pottery from Minoan Crete (Phaistos, 1500 BCE) features intricate octopus designs as protective + decorative motifs.',
            realBasis: 'Common octopus (Octopus vulgaris) was abundant in Aegean waters. Aristotle\'s observations were so accurate that some weren\'t verified by modern science until 20th century. The Minoan octopus imagery may have honored their economic importance + cognitive sophistication.' },
          { name: 'Te Wheke-a-Muturangi', culture: 'Māori (New Zealand)', emoji: '🌀', color: '#10b981',
            story: 'A great octopus in Polynesian voyage mythology. Kupe, the legendary navigator credited with discovering New Zealand, pursued Te Wheke-a-Muturangi across the Pacific. The chase ended with Kupe killing the octopus in Cook Strait — and thereby establishing Māori claim to the islands.',
            realBasis: 'Pacific octopus species were navigational landmarks + food sources for Polynesian voyagers. The story is partly a charter myth (justifying Māori settlement) + partly a recognition of octopus presence as a sign of approaching land.' },
          { name: 'Ammonite reverence', culture: 'Multiple (medieval Europe, ancient Greece, Hindu)', emoji: '🌀', color: '#fbbf24',
            story: 'Ammonite fossils were considered "snake stones" in medieval England — coiled stones thought to be petrified snakes. In Hindu tradition, they\'re "shaligrams" — sacred stones representing Vishnu. Greek + Egyptian cultures used them as protective amulets.',
            realBasis: 'These are real ammonite fossils — extinct cephalopod shells from the Mesozoic era (200-66 million years ago). The pre-scientific cultures correctly recognized them as animal remains, just got the animal wrong (snake vs cephalopod).' }
        ];
        var ART = [
          { name: '"The Dream of the Fisherman\'s Wife"', creator: 'Katsushika Hokusai', period: '1814 (Edo period Japan)', emoji: '🎨', color: '#dc2626',
            description: 'Woodblock print depicting a woman in erotic encounter with two octopuses. Notorious for its explicit content + remarkable for its sympathetic, almost reverent portrayal of the octopuses as participatory partners rather than monsters. Influenced 20th-century Japanese tentacle imagery + modern erotica.',
            significance: 'One of the earliest works to depict cephalopods as conscious, intentional actors rather than mindless monsters. The accompanying calligraphy gives voice to both the woman + the octopus, suggesting mutual desire.' },
          { name: 'Minoan Octopus Vase (Phaistos)', creator: 'Anonymous Minoan craftspeople', period: '~1500 BCE (Bronze Age Crete)', emoji: '🏺', color: '#fbbf24',
            description: 'A series of pottery vessels featuring detailed, anatomically-aware octopus paintings. The octopus is rendered with all 8 arms, suckers visible, with movement and presence. Considered some of the most sophisticated marine art of the ancient world.',
            significance: 'Demonstrates pre-Aristotelian biological observation — the Minoans were close + careful watchers of octopus anatomy long before written natural history. The motif spread across the Aegean as part of "marine style" pottery.' },
          { name: 'Octopus paintings, Aristotle\'s "Historia Animalium"', creator: 'Aristotle (text); illuminators of medieval copies', period: 'Written ~350 BCE; illuminated copies 12th-15th century', emoji: '📜', color: '#a78bfa',
            description: 'Aristotle\'s observations are textual, but the imagery in surviving manuscript copies includes hand-painted octopus figures. The text describes mating (correctly identifying the hectocotylus arm), color change, and intelligence — accurate descriptions that wouldn\'t be confirmed scientifically until the 19th century.',
            significance: 'The first written zoology that takes cephalopods seriously. Aristotle\'s observations stayed influential for 2000+ years.' },
          { name: '"Twenty Thousand Leagues Under the Sea"', creator: 'Jules Verne', period: '1869 novel', emoji: '📚', color: '#0ea5e9',
            description: 'Iconic scene where Captain Nemo\'s submarine Nautilus is attacked by a giant squid. Verne\'s description was based on then-recent giant squid specimens washed up on Newfoundland beaches. The novel both reflected + amplified Victorian fascination with the deep ocean as a mysterious frontier.',
            significance: 'The Verne giant squid attack became the cultural archetype that all subsequent sea-monster-attacks-submarine scenes reference. Without Verne, no Pirates of the Caribbean Kraken, no Finding Nemo cameo squids, no SpongeBob "Sea Bear" parodies.' },
          { name: '"My Octopus Teacher"', creator: 'Pippa Ehrlich, James Reed; subject: Craig Foster', period: '2020 Netflix documentary', emoji: '🎬', color: '#86efac',
            description: 'A South African filmmaker forms a year-long bond with a common octopus (Octopus vulgaris) in a kelp forest near Cape Town. The film documents the octopus\'s daily hunting, escape from a pajama shark attack (with arm loss + regrowth), eventual death after egg-brooding. Won 2021 Academy Award for Best Documentary Feature.',
            significance: 'Brought cephalopod cognition + sentience into mainstream conversation in a way no scientific paper could. Triggered the wave of public + policy interest that contributed to the UK Sentience Act passage in 2021.' },
          { name: 'Hokusai\'s "Great Wave" octopus echo', creator: 'Various contemporary artists', period: '2010s-2020s', emoji: '🌊', color: '#0c4a6e',
            description: 'A recurring motif in contemporary marine + environmental art: replacing the iconic foam of Hokusai\'s Great Wave with octopus arms or tentacles. Used in climate-change activism + ocean-conservation messaging to evoke both Hokusai\'s grandeur + cephalopod sentience.',
            significance: 'Modern art often visualizes cephalopods as climate-change witnesses — the species best positioned to inherit the warming, fishery-depleted ocean. The imagery is both elegiac + hopeful.' }
        ];
        var FOODS = [
          { dish: 'Pulpo a la Gallega', region: 'Galicia, Spain', emoji: '🐙', color: '#dc2626',
            description: 'Boiled octopus sliced into thin rounds, served on wooden plates with smoked paprika, olive oil, sea salt, and boiled potatoes. The "pulpeiras" (octopus cooks) of Galicia are traditionally women who have inherited the technique across generations.',
            ethics: 'Octopus is killed by being thrown into boiling water alive — a practice increasingly questioned under sentience frameworks. Some Galician restaurants now use ice-bath stunning before cooking.' },
          { dish: 'Tako (sushi + sashimi)', region: 'Japan', emoji: '🍣', color: '#fbbf24',
            description: 'Octopus is one of the foundational sushi proteins. Typically common octopus (madako) is boiled, sliced thin, and served either as nigiri (over rice) or sashimi. Texture is firm and slightly chewy. Toyama Bay\'s spring firefly squid (hotaruika) is a related seasonal delicacy.',
            ethics: 'Standard practice involves killing the octopus by spike to the brain (ikejime) — considered more humane than boiling alive. Increasingly adopted across global sushi practice.' },
          { dish: 'Sannakji', region: 'South Korea', emoji: '🐙', color: '#fca5a5',
            description: 'Live octopus eaten while still moving on the plate. The octopus is chopped immediately before serving — the arms continue to react to stimuli via arm-ganglion autonomy for up to an hour. Sannakji is considered a delicacy and a test of culinary nerve.',
            ethics: 'The most welfare-controversial cephalopod dish. Multiple deaths have occurred from suckers attaching to the eater\'s throat. Many cephalopod biologists + welfare advocates argue strongly against this practice given evidence of cephalopod pain perception.' },
          { dish: 'Calamari (fried squid rings)', region: 'Mediterranean + global', emoji: '🦑', color: '#86efac',
            description: 'Squid mantle sliced into rings, battered, deep-fried. Italian, Greek, and Spanish coastal cuisines all have versions. Global staple of seafood restaurants.',
            ethics: 'Squid have shorter lifespans (~1 year) and are typically caught + killed quickly, reducing welfare concerns relative to octopus. Sustainability varies by fishery; Argentine + Humboldt squid are generally considered well-managed.' },
          { dish: 'Tako-yaki', region: 'Osaka, Japan', emoji: '🥢', color: '#a78bfa',
            description: 'Battered octopus balls cooked on a special griddle, topped with takoyaki sauce + bonito flakes + green onion + mayonnaise. A street food staple of Osaka + most Japanese festivals. Created in 1935 by Tomekichi Endo.',
            ethics: 'Octopus pieces are small + pre-prepared. Welfare considerations focus on the upstream catch + processing.' },
          { dish: 'Cooking shows + the octopus farming debate', region: 'Global, ongoing', emoji: '🏭', color: '#fb923c',
            description: 'As octopus appears more in haute cuisine + reality cooking shows (Top Chef, MasterChef regularly feature octopus dishes), public awareness of cephalopod intelligence has created new tension. Some celebrity chefs (Dan Barber, Alice Waters) have publicly committed to not serving octopus.',
            ethics: 'The Nueva Pescanova proposed industrial octopus farm in the Canary Islands (announced 2021) became a global ethics flashpoint. Many argue: if we accept cephalopods are sentient, can we farm them? Washington State + California legislation pending preemptive bans.' }
        ];
        var MODERN = [
          { name: '"Other Minds: The Octopus, the Sea, and the Deep Origins of Consciousness"', creator: 'Peter Godfrey-Smith', year: '2016', emoji: '📚', color: '#a78bfa',
            description: 'Philosopher + scuba diver Peter Godfrey-Smith\'s accessible exploration of cephalopod consciousness + the philosophy of mind. Centered on the underwater "Octopolis" site in Australia where multiple octopuses coexist + interact — challenging the "solitary" framing.',
            impact: 'The single most influential book on cephalopod consciousness for general readers. Bridged academic philosophy of mind with field observation. Cited in the UK 2021 LSE sentience review that led to the Sentience Act.' },
          { name: '"My Octopus Teacher"', creator: 'Netflix; dir. Pippa Ehrlich + James Reed', year: '2020', emoji: '🎬', color: '#86efac',
            description: 'Won the 2021 Academy Award for Best Documentary Feature. The relationship between Craig Foster + a wild common octopus in a Cape Town kelp forest became a global emotional touchstone for cephalopod awareness.',
            impact: 'Drove a measurable spike in: public interest in octopus cognition, cephalopod search trends, citizen science enrollment (iNaturalist), and political pressure for sentience protections. Considered a contributing factor to the 2021 UK Sentience Act amendment.' },
          { name: 'Otto, Inky, Heidi, and the Octopus Celebrities', creator: 'Various aquaria + research labs', year: '2008-present', emoji: '🐙', color: '#fbbf24',
            description: 'Individual octopuses have become cultural figures with names + biographies. Otto (Sea Star Aquarium, Germany) short-circuited lights with water jets. Inky (NZ National Aquarium) escaped through a drain to the ocean. Heidi (Alaska Pacific University) was filmed apparently dreaming. Each made international news.',
            impact: 'Public connects with named individuals more than abstract species. The celebrity-octopus framing was instrumental in shifting cephalopod policy from "interesting invertebrate" to "sentient being deserving protection."' },
          { name: 'The Cambridge Declaration on Consciousness', creator: 'International scientists at Francis Crick Memorial Conference', year: '2012', emoji: '📜', color: '#dc2626',
            description: 'A formal scientific declaration signed at Cambridge, naming cephalopods alongside mammals + birds as showing evidence of consciousness-correlated brain substrates. Foundational moment in invertebrate cognition advocacy.',
            impact: 'Cited in every subsequent legal + policy document on cephalopod sentience. Direct line from the Declaration to the UK Animal Welfare (Sentience) Act 2021. Changed the default scientific position from "probably not sentient" to "probably sentient."' },
          { name: 'Pop culture cephalopod-aliens', creator: 'Hollywood + video games', year: '2010s-2020s', emoji: '🛸', color: '#0ea5e9',
            description: 'Cephalopod-inspired aliens are now a recurring science-fiction trope. The Heptapods of "Arrival" (2016) use radial language reminiscent of octopus distributed intelligence. "Soma" video game features deep-sea AI in cephalopod-like bodies. The aliens in "Annihilation" reference cephalopod chromatophore biology.',
            impact: 'Reflects the cultural recognition that cephalopods are the closest thing to genuine "alien intelligence" we have. Pop culture is doing what cephalopod science only recently named: treating these animals as a foreign mode of mind rather than a primitive mode.' },
          { name: 'The welfare movement + ongoing policy', creator: 'Activists, scientists, legislators (2010-2025)', year: 'Ongoing', emoji: '⚖️', color: '#86efac',
            description: 'EU Directive 2010/63 first gave cephalopods invertebrate-equivalent research protections. UK Sentience Act 2021 formalized sentience recognition. Washington State 2024 preemptive octopus aquaculture ban. California + Hawaii proposed similar bans. The Nueva Pescanova farm proposal remains a focal point.',
            impact: 'Cephalopods are now central to the broader animal-welfare conversation. As industrial aquaculture + climate change reshape the ocean, decisions about cephalopod treatment will set precedent for marine invertebrate welfare more broadly. The conversation is genuinely open.' }
        ];
        return h('div', null,
          panelHeader('🎭 Cephalopods in Culture',
            'For thousands of years, humans have related to cephalopods through myth, art, food, and (recently) ethics. The biological perspective is only one of many. From Norse sailors\' Kraken to Ainu deities to Aristotle\'s observations to "My Octopus Teacher," the cultural history is rich + ongoing.'),

          h('div', { role: 'tablist', 'aria-label': 'Culture sub-sections',
            style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 } },
            SUBS.map(function(s) {
              var active = view === s.id;
              return h('button', { key: s.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
                onClick: function() { setCL({ cultureView: s.id }); awardXP(1); },
                style: { padding: '8px 12px',
                  background: active ? 'rgba(99,102,241,0.3)' : 'rgba(15,23,42,0.5)',
                  color: active ? '#c7d2fe' : '#cbd5e1',
                  border: '1px solid ' + (active ? 'rgba(167,139,250,0.6)' : 'rgba(100,116,139,0.3)'),
                  borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6 } },
                h('span', { 'aria-hidden': 'true' }, s.icon), s.label);
            })),

          view === 'myth' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '🐉 Pre-scientific cephalopod mythology'),
              h('div', { style: { color: '#cbd5e1', fontSize: 13, lineHeight: 1.7, marginBottom: 14 } },
                'Before science gave us "Octopus vulgaris" + "Architeuthis dux," cultures around the world built mythologies to explain the alien intelligences in their waters. Many of these myths got the biology surprisingly right + the size dramatically wrong.'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
                MYTHS.map(function(m) {
                  return h('div', { key: m.name,
                    style: { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.3)',
                      borderLeft: '4px solid ' + m.color, padding: '14px 16px', borderRadius: 10 } },
                    h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' } },
                      h('span', { 'aria-hidden': 'true', style: { fontSize: 24, lineHeight: 1 } }, m.emoji),
                      h('div', { style: { flex: 1, minWidth: 200 } },
                        h('div', { style: { fontSize: 16, fontWeight: 800, color: m.color } }, m.name),
                        h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginTop: 2 } }, m.culture))),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 8 } }, m.story),
                    h('div', { style: { padding: '8px 12px', background: 'rgba(167,139,250,0.1)', borderLeft: '3px solid #a78bfa', borderRadius: 6 } },
                      h('div', { style: { fontSize: 10, fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }, '🔬 The real biology behind it'),
                      h('div', { style: { fontSize: 11, color: '#e9d5ff', lineHeight: 1.6 } }, m.realBasis)));
                })))
          ) : null,

          view === 'art' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '🎨 Cephalopods in art + literature'),
              h('div', { style: { color: '#cbd5e1', fontSize: 13, lineHeight: 1.7, marginBottom: 14 } },
                'Visual + literary representations of cephalopods span 3500 years — from Bronze Age Minoan pottery to 2020 Netflix documentary. The way each era depicts these animals reflects what that era believed about minds + monsters + the ocean.'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
                ART.map(function(a) {
                  return h('div', { key: a.name,
                    style: { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.3)',
                      borderLeft: '4px solid ' + a.color, padding: '14px 16px', borderRadius: 10 } },
                    h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' } },
                      h('span', { 'aria-hidden': 'true', style: { fontSize: 26, lineHeight: 1 } }, a.emoji),
                      h('div', { style: { flex: 1, minWidth: 220 } },
                        h('div', { style: { fontSize: 15, fontWeight: 800, color: a.color } }, a.name),
                        h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 2 } },
                          h('span', { style: { color: '#fde68a' } }, a.creator),
                          ' · ',
                          h('span', { style: { fontStyle: 'italic' } }, a.period)))),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 8 } }, a.description),
                    h('div', { style: { padding: '8px 12px', background: 'rgba(251,191,36,0.1)', borderLeft: '3px solid #fbbf24', borderRadius: 6 } },
                      h('div', { style: { fontSize: 10, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }, '✨ Why this matters'),
                      h('div', { style: { fontSize: 11, color: '#fde68a', lineHeight: 1.6, fontStyle: 'italic' } }, a.significance)));
                })))
          ) : null,

          view === 'food' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '🍱 Cephalopods as food'),
              h('div', { style: { color: '#cbd5e1', fontSize: 13, lineHeight: 1.7, marginBottom: 14 } },
                'Cephalopods are food in most coastal cultures. The dishes are old + varied; the ethics are recent + evolving. As public awareness of cephalopod sentience has grown, traditional preparation practices are being re-examined.'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
                FOODS.map(function(f) {
                  return h('div', { key: f.dish,
                    style: { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.3)',
                      borderLeft: '4px solid ' + f.color, padding: '14px 16px', borderRadius: 10 } },
                    h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' } },
                      h('span', { 'aria-hidden': 'true', style: { fontSize: 24, lineHeight: 1 } }, f.emoji),
                      h('div', { style: { flex: 1, minWidth: 200 } },
                        h('div', { style: { fontSize: 16, fontWeight: 800, color: f.color } }, f.dish),
                        h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginTop: 2 } }, f.region))),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 8 } }, f.description),
                    h('div', { style: { padding: '8px 12px', background: 'rgba(252,165,165,0.08)', borderLeft: '3px solid #fca5a5', borderRadius: 6 } },
                      h('div', { style: { fontSize: 10, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }, '⚖️ Welfare consideration'),
                      h('div', { style: { fontSize: 11, color: '#fecaca', lineHeight: 1.6 } }, f.ethics)));
                }))),

            h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid #a78bfa' }) },
              h('div', { style: subheaderStyle() }, '🧭 The eating question'),
              h('div', { style: { color: '#e9d5ff', fontSize: 13, lineHeight: 1.75 } },
                h('p', { style: { margin: '0 0 12px 0' } },
                  'Most cultures don\'t question eating cephalopods — they\'re part of generations of cuisine. But the recent recognition of cephalopod sentience (UK 2021, EU 2010, multiple scientific declarations) has surfaced a question many find newly difficult:'),
                h('p', { style: { margin: '0 0 12px 0', padding: '12px 14px', background: 'rgba(167,139,250,0.1)', borderRadius: 8, fontStyle: 'italic', textAlign: 'center', fontSize: 14 } },
                  'If we accept that cephalopods are sentient — meaning capable of suffering — does that change our eating practices?'),
                h('p', { style: { margin: 0 } },
                  'There aren\'t clean answers. Some people who eat fish + chicken decline octopus specifically. Some celebrity chefs (Dan Barber, Alice Waters) have stopped serving octopus. Some traditional cuisines argue this is colonial moralizing against ancient food practices. The ethics are genuinely contested + the conversation is genuinely open. This module doesn\'t take a position. The question is worth holding rather than resolving.')))
          ) : null,

          view === 'modern' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '🎬 Modern cephalopod consciousness'),
              h('div', { style: { color: '#cbd5e1', fontSize: 13, lineHeight: 1.7, marginBottom: 14 } },
                'In the last 15 years, cephalopods have moved from "obscure invertebrates" to "central figures in the philosophy of mind + the animal-welfare movement." A few books, a few films, a few legal documents, and a handful of celebrity individual octopuses changed how mainstream culture thinks about non-human minds.'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
                MODERN.map(function(m) {
                  return h('div', { key: m.name,
                    style: { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.3)',
                      borderLeft: '4px solid ' + m.color, padding: '14px 16px', borderRadius: 10 } },
                    h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' } },
                      h('span', { 'aria-hidden': 'true', style: { fontSize: 26, lineHeight: 1 } }, m.emoji),
                      h('div', { style: { flex: 1, minWidth: 220 } },
                        h('div', { style: { fontSize: 15, fontWeight: 800, color: m.color } }, m.name),
                        h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 2 } },
                          h('span', { style: { color: '#fde68a' } }, m.creator),
                          ' · ',
                          h('span', { style: { fontStyle: 'italic' } }, m.year)))),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 8 } }, m.description),
                    h('div', { style: { padding: '8px 12px', background: 'rgba(134,239,172,0.08)', borderLeft: '3px solid #86efac', borderRadius: 6 } },
                      h('div', { style: { fontSize: 10, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }, '🌊 Cultural impact'),
                      h('div', { style: { fontSize: 11, color: '#dcfce7', lineHeight: 1.6 } }, m.impact)));
                }))),

            h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid #a78bfa' }) },
              h('div', { style: subheaderStyle() }, '💡 The arc from "tentacle monster" to "second consciousness"'),
              h('div', { style: { color: '#e9d5ff', fontSize: 13, lineHeight: 1.75 } },
                h('p', { style: { margin: '0 0 12px 0' } },
                  'A century ago, popular culture treated cephalopods primarily as monsters — the Kraken, the deep-sea horror, Verne\'s giant squid attacking the Nautilus. Tentacles were a sign of alien menace.'),
                h('p', { style: { margin: '0 0 12px 0' } },
                  'Today, popular culture treats them as candidates for a SECOND INDEPENDENT INSTANCE of consciousness on Earth. Books, films, and laws all converge on the idea that octopuses + their relatives might have inner experiences as rich as our own — built from a completely different evolutionary architecture.'),
                h('p', { style: { margin: 0, padding: '12px 14px', background: 'rgba(167,139,250,0.1)', borderLeft: '3px solid #a78bfa', borderRadius: 6, fontStyle: 'italic' } },
                  'The shift from monster to mind is one of the largest cultural reframings in recent biology. It happened fast — in roughly 50 years — driven by a small number of researchers + filmmakers + writers + activists. The cephalopods themselves didn\'t change. Our way of seeing them did.')))
          ) : null
        );
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 16 — FIELD DAY GUIDE (practical observation handbook)
      // ═══════════════════════════════════════════════════════
      function renderFieldDay() {
        var view = d.fieldDayView || 'where';
        var SUBS = [
          { id: 'where', label: 'Where + When', icon: '📍' },
          { id: 'signs', label: 'Signs + ID', icon: '🔎' },
          { id: 'ethics', label: 'Ethics + Safety', icon: '🛡️' },
          { id: 'document', label: 'Document + Share', icon: '📷' }
        ];
        // Regional field guides
        var REGIONS = [
          { id: 'pnw', name: 'Pacific Northwest', emoji: '🌲', color: '#86efac',
            range: 'Alaska to N. California',
            commonSpecies: 'Giant Pacific octopus (Enteroctopus dofleini), market squid (Doryteuthis opalescens), Pacific red octopus (Octopus rubescens)',
            bestHabitats: 'Tidepools at low tide, rocky reefs 30-100ft, kelp forests, marina pilings + docks',
            bestTimes: 'LOW spring tides (best -1ft+ tides); dawn or dusk; March-October for diving (water 50-55°F)',
            specialNote: 'Giant Pacific octopus dens often visible from boats at low tide — look for piles of crab + clam shells outside crevices (middens). Cold water requires drysuit for sustained diving.',
            access: 'Many state parks have tidepool zones (Salt Creek WA, Cape Perpetua OR). REEF surveys + Seattle Aquarium runs citizen science programs.' },
          { id: 'med', name: 'Mediterranean', emoji: '🏖️', color: '#0ea5e9',
            range: 'Spain + Italy + Greece + Tunisia + Morocco',
            commonSpecies: 'Common octopus (Octopus vulgaris), common cuttlefish (Sepia officinalis), bobtail squid, occasionally paper nautilus (Argonauta argo)',
            bestHabitats: 'Rocky shores + seagrass meadows + sandy bottoms 5-50ft, ports + harbors',
            bestTimes: 'Year-round but best May-October (water 64-78°F); golden hour dives',
            specialNote: 'Common octopus is THE classic Mediterranean cephalopod — fishermen + tourists encounter them often. Best for early-career snorkel/dive students because they\'re relatively forgiving of human presence + abundant.',
            access: 'Heavy diving infrastructure. Costa Brava + Cinque Terre + Greek islands all have accessible cephalopod habitats.' },
          { id: 'caribbean', name: 'Caribbean + Tropical Atlantic', emoji: '🌴', color: '#fb923c',
            range: 'Florida Keys + Bahamas + Belize + Caribbean islands',
            commonSpecies: 'Caribbean reef octopus (Octopus briareus), Atlantic pygmy octopus, Caribbean reef squid (Sepioteuthis sepioidea), occasionally common octopus',
            bestHabitats: 'Coral reefs 15-60ft, seagrass beds, mangrove edges, sand patches between coral heads',
            bestTimes: 'Night dives (Caribbean reef octopus is nocturnal); year-round (water 75-85°F)',
            specialNote: 'Caribbean reef octopus is small + intensely night-active — daytime dives won\'t find them but a night dive with a red-filtered light shows them in their hunting prime. Caribbean reef squid hover in formation + are wonderful to photograph.',
            access: 'Mature dive tourism infrastructure. Night dives are standard offering.' },
          { id: 'indopacific', name: 'Indo-Pacific', emoji: '🌺', color: '#a78bfa',
            range: 'Indonesia + Philippines + Australia + Japan + Pacific islands',
            commonSpecies: 'HIGHEST cephalopod diversity on Earth. Mimic octopus, coconut octopus, day octopus, blue-ringed (DANGEROUS), Hawaiian bobtail, flamboyant cuttlefish, big-fin reef squid, many others',
            bestHabitats: 'Coral reefs, sandy slopes ("muck diving" — black-sand sites with rich critter life), tidepools, lagoons',
            bestTimes: 'Indonesia: April-November; Philippines: November-May; year-round in most of the region (water 78-86°F)',
            specialNote: 'Critical safety note: small octopuses in Indo-Pacific tidepools may be blue-ringed (Hapalochlaena spp.) — DO NOT TOUCH ANY OCTOPUS. Tetrodotoxin venom is potentially lethal + has no antivenom. Identify visually only.',
            access: 'Major dive destinations (Bali, Anilao Philippines, Lembeh Strait). Many resorts offer "critter dives" specifically for cephalopod-rich muck sites.' },
          { id: 'antarctic', name: 'Antarctic + Sub-Antarctic', emoji: '❄️', color: '#cbd5e1',
            range: 'Southern Ocean below ~50°S',
            commonSpecies: 'Colossal squid (Mesonychoteuthis hamiltoni — known from sperm whale stomachs + fishery bycatch), Antarctic neosquid, Pareledone octopus',
            bestHabitats: 'Deep water (200m+) — not directly accessible to most students. Beachings + fishery bycatch are the only realistic encounter routes.',
            bestTimes: 'Antarctic summer (December-February) for research vessel access',
            specialNote: 'Direct observation requires research vessel access. Most students engage via aquarium specimens (Te Papa, NZ has the only intact adult colossal squid) + sperm whale stomach content studies.',
            access: 'Realistic only for research-track students with institutional partnerships. Inclusion here for completeness.' }
        ];
        var sel = REGIONS.find(function(r) { return r.id === (d.fieldDayRegion || 'pnw'); }) || REGIONS[0];
        return h('div', null,
          panelHeader('🤿 Field Day Guide',
            'Now go look. Cephalopods are remarkably observable in the wild — once you know where to look, when to look, and what to look for. This guide covers regional habitats, identification signs, ethical observation, and how to contribute your observations to real research.'),

          h('div', { role: 'tablist', 'aria-label': 'Field guide sub-sections',
            style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 } },
            SUBS.map(function(s) {
              var active = view === s.id;
              return h('button', { key: s.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
                onClick: function() { setCL({ fieldDayView: s.id }); awardXP(1); },
                style: { padding: '8px 12px',
                  background: active ? 'rgba(99,102,241,0.3)' : 'rgba(15,23,42,0.5)',
                  color: active ? '#c7d2fe' : '#cbd5e1',
                  border: '1px solid ' + (active ? 'rgba(167,139,250,0.6)' : 'rgba(100,116,139,0.3)'),
                  borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6 } },
                h('span', { 'aria-hidden': 'true' }, s.icon), s.label);
            })),

          // ─── WHERE + WHEN ───
          view === 'where' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '🌎 Pick your region'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 } },
                REGIONS.map(function(r) {
                  var active = r.id === (d.fieldDayRegion || 'pnw');
                  return h('button', { key: r.id,
                    onClick: function() { setCL({ fieldDayRegion: r.id }); awardXP(1); },
                    'aria-pressed': active ? 'true' : 'false',
                    style: { padding: '10px 12px', textAlign: 'left',
                      background: active ? 'rgba(99,102,241,0.3)' : 'rgba(15,23,42,0.5)',
                      color: active ? '#c7d2fe' : '#cbd5e1',
                      border: '1px solid ' + (active ? 'rgba(167,139,250,0.6)' : 'rgba(100,116,139,0.3)'),
                      borderLeft: '3px solid ' + r.color,
                      borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 } },
                      h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, r.emoji),
                      h('div', { style: { fontWeight: 800, fontSize: 12, color: active ? '#fde68a' : '#e2e8f0' } }, r.name)),
                    h('div', { style: { fontSize: 9, color: '#94a3b8' } }, r.range));
                }))),

            h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid ' + sel.color }) },
              h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 } },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 36 } }, sel.emoji),
                h('div', { style: { flex: 1 } },
                  h('div', { style: { fontSize: 20, fontWeight: 900, color: sel.color, letterSpacing: '-0.01em' } }, sel.name),
                  h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 2 } }, sel.range))),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, marginBottom: 12 } },
                [
                  { lbl: '🐙 Common species you might see', val: sel.commonSpecies, color: '#fbbf24' },
                  { lbl: '🏠 Best habitats', val: sel.bestHabitats, color: '#86efac' },
                  { lbl: '⏰ Best times + conditions', val: sel.bestTimes, color: '#38bdf8' },
                  { lbl: '🚪 Access + infrastructure', val: sel.access, color: '#a78bfa' }
                ].map(function(b, i) {
                  return h('div', { key: i,
                    style: { background: 'rgba(15,23,42,0.5)', borderLeft: '3px solid ' + b.color, padding: '10px 12px', borderRadius: 8 } },
                    h('div', { style: { fontSize: 10, fontWeight: 800, color: b.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }, b.lbl),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, b.val));
                })),
              h('div', { style: { padding: '12px 14px', background: 'rgba(167,139,250,0.1)', borderLeft: '3px solid #a78bfa', borderRadius: 8 } },
                h('div', { style: { fontSize: 10, fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } }, '💡 Special note'),
                h('div', { style: { fontSize: 12, color: '#e9d5ff', lineHeight: 1.7 } }, sel.specialNote))),

            // General timing tips
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '⏳ Timing for any region'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 } },
                [
                  { lbl: '🌊 Tides', detail: 'Spring tides (around new + full moon) give the lowest low tides — best for tidepool exploration. Check NOAA Tides + Currents or your regional equivalent. Aim for 1-2 hours before extreme low.' },
                  { lbl: '🌅 Time of day', detail: 'Dawn + dusk (crepuscular hours) are when many cephalopods become active. Octopus species vary: common octopus is nocturnal in much of its range; Caribbean reef octopus is strictly nocturnal; day octopus (Octopus cyanea) hunts at midday.' },
                  { lbl: '🌙 Moon phase', detail: 'Full moon nights = brighter night dives = different behavior. New moon = darker = more nocturnal activity. Bioluminescent species (firefly squid) are most visible on dark moonless nights.' },
                  { lbl: '🌡️ Water temperature', detail: 'Cephalopods are cold-blooded — temperature drives metabolism + activity. Stable warm season = peak activity. Sudden cold snaps = animals retreat to dens for days.' }
                ].map(function(b, i) {
                  return h('div', { key: i,
                    style: { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.3)',
                      borderLeft: '3px solid #fbbf24', padding: '10px 12px', borderRadius: 8 } },
                    h('div', { style: { fontSize: 12, fontWeight: 800, color: '#fbbf24', marginBottom: 4 } }, b.lbl),
                    h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 } }, b.detail));
                })))
          ) : null,

          // ─── SIGNS + ID ───
          view === 'signs' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '🔎 Signs a cephalopod is nearby'),
              h('div', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.65, marginBottom: 14 } },
                'Cephalopods are masters at not being seen. But they leave clues. Learn to read these and your sighting rate will go up dramatically.'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 } },
                [
                  { sign: 'Octopus midden', emoji: '🦀', detail: 'Pile of empty shells (crab, clam, snail) outside a crevice. The most reliable octopus-den indicator. Octopuses are tidy eaters — they discard shells in a "trash heap" near their entry. Look at the bottom of rocky walls.' },
                  { sign: 'Eye glint', emoji: '👁️', detail: 'A flat, horizontal pupil peeking from a crack. Octopus eyes are unmistakable once you\'ve seen one — slit pupil, lens visible. Often the ONLY visible part.' },
                  { sign: 'Color shift', emoji: '🎨', detail: 'A patch of "substrate" that\'s slightly the wrong color or moves slightly. If you stare at one spot for 30 seconds and the patterns rearrange themselves — you\'re looking at an octopus.' },
                  { sign: 'Sucker marks', emoji: '⭕', detail: 'Circular discoloration patches on rocks or piers — left by recent contact. Sucker scars on prey shells or fish skin also indicate recent cephalopod activity.' },
                  { sign: 'Ink cloud (post-encounter)', emoji: '🌫️', detail: 'A drifting dark cloud in the water column means an octopus or squid just escaped from something. Look in the direction OPPOSITE the cloud\'s drift.' },
                  { sign: 'Tracks in sand', emoji: '〰️', detail: 'Multiple parallel lines + drag marks in sand = octopus walked here (using stilt-walking or arm-crawling). Coconut octopuses leave shell-drag furrows too.' },
                  { sign: 'Cuttlefish at rest', emoji: '🦑', detail: 'Cuttlefish often hover stationary just above the substrate, matching color. Watch for the distinctive flat oval body shape + visible W-shaped pupils — different from octopus.' },
                  { sign: 'Squid schools', emoji: '👥', detail: 'Mid-water above reefs or sand flats. Caribbean reef squid hold formation 1-3m above the substrate. Big-fin reef squid form synchronized formations. Look up, not just down.' }
                ].map(function(s, i) {
                  return h('div', { key: i,
                    style: { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.3)',
                      borderLeft: '3px solid #86efac', padding: '12px 14px', borderRadius: 8 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                      h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, s.emoji),
                      h('div', { style: { fontSize: 13, fontWeight: 800, color: '#86efac' } }, s.sign)),
                    h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.65 } }, s.detail));
                }))),

            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '🪲 Common mistakes (these AREN\'T cephalopods)'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 } },
                [
                  { mistake: 'Sea slug / nudibranch', why: 'Often colorful + crawls on substrate. Has feather-like external gills + no tentacles. Mollusk relative but no chambered body.' },
                  { mistake: 'Anemone', why: 'Stays in one spot, tentacles wave gently. Can\'t move quickly or change shape dramatically.' },
                  { mistake: 'Brittle star', why: 'Five thin arms radiating from a central disk. Arms are RIGID + segmented. Octopus arms are completely flexible.' },
                  { mistake: 'Eel', why: 'Long body, fins, scales (if visible). Watch from a distance — moray eels emerge from crevices to investigate divers.' },
                  { mistake: 'Cuttlefish bone on beach', why: 'White, oval, calcified internal cuttlefish shell. NOT the live animal — these wash up after the cuttlefish dies. Take a photo + report a beached cuttlefish event.' },
                  { mistake: 'Spider crab leg', why: 'A single leg jutting from a crack with horizontal joints. Octopus arm has no joints.' }
                ].map(function(m, i) {
                  return h('div', { key: i,
                    style: { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.3)',
                      borderLeft: '3px solid #fca5a5', padding: '10px 12px', borderRadius: 8 } },
                    h('div', { style: { fontSize: 12, fontWeight: 800, color: '#fca5a5', marginBottom: 4 } }, m.mistake),
                    h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } }, m.why));
                })))
          ) : null,

          // ─── ETHICS + SAFETY ───
          view === 'ethics' ? h('div', null,
            h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid #fbbf24' }) },
              h('div', { style: subheaderStyle() }, '🛡️ Observation ethics — the Hippocratic version'),
              h('div', { style: { color: '#cbd5e1', fontSize: 13, lineHeight: 1.75 } },
                h('p', { style: { margin: '0 0 12px 0' } },
                  'Cephalopods are sentient (UK + EU formally recognize this in law). Your presence stresses them. Stress raises metabolic load, raises predation risk, can disrupt feeding cycles. The goal: be a non-event from the animal\'s perspective.'),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, marginBottom: 12 } },
                  [
                    { rule: '🚫 Don\'t touch', detail: 'Human skin oils + bacteria can disrupt cephalopod chemosense + chromatophore function. Touching is also stressful even when you\'re gentle. Photograph. Don\'t handle.' },
                    { rule: '🚫 Don\'t move objects', detail: 'Don\'t lift rocks, move shells, or extract animals from dens. You\'re destroying camouflage architecture they\'ve carefully constructed. Look without disturbing.' },
                    { rule: '📏 Keep distance', detail: 'Maintain ~2-3 meters where possible. Octopuses + cuttlefish read body language; close approach reads as predatory. If they signal stress (rapid color shifts, white arms raised) — back off.' },
                    { rule: '⏱️ Limit observation time', detail: '5-10 minutes maximum per encounter. Even non-touching observation has stress cost. Leave + return if you want more time, ideally from a different angle.' },
                    { rule: '🚫 Don\'t feed', detail: 'Habituates animals to humans, distorts their hunting behavior, attracts them to dangerous areas. The cuteness is real but the cost is real.' },
                    { rule: '🚫 Don\'t chase', detail: 'Pursuing a fleeing animal causes physiological stress that lasts hours. If they\'re leaving, let them go.' }
                  ].map(function(r, i) {
                    return h('div', { key: i,
                      style: { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.3)',
                        borderLeft: '3px solid #fbbf24', padding: '10px 12px', borderRadius: 8 } },
                      h('div', { style: { fontSize: 12, fontWeight: 800, color: '#fbbf24', marginBottom: 4 } }, r.rule),
                      h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 } }, r.detail));
                  })),
                h('p', { style: { margin: 0, padding: '12px 14px', background: 'rgba(251,191,36,0.1)', borderLeft: '3px solid #fbbf24', borderRadius: 6, fontStyle: 'italic' } },
                  'The right principle: leave the animal in a state where it doesn\'t know you were there. You can take photos + memories. Take nothing physical.'))),

            h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid #dc2626' }) },
              h('div', { style: subheaderStyle() }, '⚠️ Safety — protect yourself'),
              h('div', { style: { color: '#fecaca', fontSize: 13, lineHeight: 1.75 } },
                h('p', { style: { margin: '0 0 12px 0' } },
                  'Tidepools + reefs are not zero-risk environments. Most cephalopods are harmless, but a few are dangerous + share habitat with other hazards.'),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 } },
                  [
                    { risk: '☠️ Blue-ringed octopus (Indo-Pacific)', detail: 'Small (~12 cm), drab + brown until threatened. Then iridescent blue rings flash. Carries enough tetrodotoxin to kill 26 adult humans. NO ANTIVENOM. Symptomatic treatment + ventilator only. If you\'re in Indo-Pacific tidepools, do not touch ANY small octopus.' },
                    { risk: '🐠 Other tidepool dangers', detail: 'Sea urchins (sharp spines), stonefish + scorpionfish (venomous + camouflaged), cone snails (lethal harpoon), fire coral (severe burn). Always wear water shoes. Don\'t put hands in holes you can\'t see into.' },
                    { risk: '🌊 Tide cycles', detail: 'Returning tide rises faster than you might think. Always know the cycle. Don\'t get stuck on a rock + isolated by incoming water.' },
                    { risk: '🤿 Solo diving', detail: 'Don\'t. Even shallow snorkeling, dive with a buddy. Cephalopod focus is exactly the kind of distracted attention that gets you in trouble.' },
                    { risk: '❄️ Hypothermia (cold-water regions)', detail: 'Pacific Northwest + North Atlantic water is 50-55°F year-round. Without a drysuit you can\'t safely dive long. Tidepooling in shorts is fine, but going in is not.' },
                    { risk: '☀️ Sun + dehydration (tropical regions)', detail: 'Tidepooling under tropical sun is intense. UV-protective clothing, electrolytes, frequent shade breaks. Coral cuts in saltwater heat = infection risk.' }
                  ].map(function(r, i) {
                    return h('div', { key: i,
                      style: { background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)',
                        borderLeft: '3px solid #dc2626', padding: '10px 12px', borderRadius: 8 } },
                      h('div', { style: { fontSize: 12, fontWeight: 800, color: '#fca5a5', marginBottom: 4 } }, r.risk),
                      h('div', { style: { fontSize: 11, color: '#fecaca', lineHeight: 1.6 } }, r.detail));
                  }))))
          ) : null,

          // ─── DOCUMENT + SHARE ───
          view === 'document' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '📷 What to record + how'),
              h('div', { style: { color: '#cbd5e1', fontSize: 13, lineHeight: 1.7, marginBottom: 14 } },
                h('p', { style: { margin: '0 0 10px 0' } },
                  'Every cephalopod observation is potentially data. Researchers track range shifts, behavioral changes, new species. A clear photo + accurate metadata = a citizen-science contribution.')),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 } },
                [
                  { what: '📅 Date + time', why: 'Including time of day (precise to within ~30 min). Helps establish behavioral patterns + correlate with tide + moon cycles.' },
                  { what: '📍 Location', why: 'GPS coordinates if possible. At minimum: named site + nearest landmark. iNaturalist autotags location if you allow it.' },
                  { what: '🌊 Depth + water temp', why: 'Depth from depth gauge or estimation (intertidal, 5m, 10m, etc.). Water temp from dive computer. Both correlate with species ID.' },
                  { what: '🐙 Species (best guess)', why: 'Use this tool\'s Field Guide for comparison. Note ID confidence ("definitely Octopus vulgaris" vs "Octopus sp. — small, brownish"). iNaturalist community will help refine.' },
                  { what: '🎬 Behavior', why: 'What was the animal doing? Hunting / resting in den / fleeing / mating / signaling / dead. Behavior data is rarely captured + most valuable to researchers.' },
                  { what: '📸 Photos', why: 'Multiple angles. Macro for ID. Wide shot for habitat context. Include something for scale (gloved finger, ruler, dive slate).' }
                ].map(function(d, i) {
                  return h('div', { key: i,
                    style: { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.3)',
                      borderLeft: '3px solid #38bdf8', padding: '10px 12px', borderRadius: 8 } },
                    h('div', { style: { fontSize: 12, fontWeight: 800, color: '#38bdf8', marginBottom: 4 } }, d.what),
                    h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 } }, d.why));
                }))),

            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '📸 Photo + video tips'),
              h('div', { style: { color: '#cbd5e1', fontSize: 13, lineHeight: 1.75 } },
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 } },
                  [
                    { tip: '🚫 No flash at close range', detail: 'Direct flash on cephalopod eyes is stressful + may temporarily blind them. Use ambient light at distance; flash only at distance + diffused if needed.' },
                    { tip: '📱 Macro mode for ID details', detail: 'Suckers, arm tip texture, body pattern, eye shape — these are diagnostic features. Get close (without touching!) + use macro.' },
                    { tip: '🌅 Continuous shooting', detail: 'Color changes happen in milliseconds. Burst-mode capture lets you record skin display sequences that single shots miss.' },
                    { tip: '🎬 Short video clips', detail: '5-15 second clips show behavior + motion. Most identification + behavioral analysis is impossible from a single still.' },
                    { tip: '🎯 Include the eye', detail: 'A clear shot of the eye is the single most useful ID frame. Pupil shape + eye position differ between octopus / cuttlefish / squid.' },
                    { tip: '📐 Scale reference', detail: 'Glove, hand, or dive slate visible somewhere = scale. Hard to ID size from photos otherwise. NEVER use your hand right next to the animal.' }
                  ].map(function(t, i) {
                    return h('div', { key: i,
                      style: { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.3)',
                        borderLeft: '3px solid #a78bfa', padding: '10px 12px', borderRadius: 8 } },
                      h('div', { style: { fontSize: 12, fontWeight: 800, color: '#a78bfa', marginBottom: 4 } }, t.tip),
                      h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 } }, t.detail));
                  })))),

            h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid #86efac' }) },
              h('div', { style: subheaderStyle() }, '🌐 Where to share your observations'),
              h('div', { style: { color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
                h('p', { style: { margin: '0 0 12px 0' } },
                  'Three tiers of citizen-science contribution, depending on your level of involvement:'),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                  [
                    { level: 'Tier 1 — General public', platform: 'iNaturalist', detail: 'Free app, photo + location uploads, community-verified IDs. Goes into the Global Biodiversity Information Facility (GBIF). Most accessible for first-time contributors.' },
                    { level: 'Tier 2 — Engaged amateur', platform: 'CephResearch.org + TONMO', detail: 'Researcher-curated communities. Direct contact with cephalopod biologists. Good for unusual sightings or behavior you want a specialist to evaluate.' },
                    { level: 'Tier 3 — Research-affiliated', platform: 'Local university / aquarium partnerships', detail: 'If your sightings are in a research zone (Monterey Bay, Lembeh Strait, Maine coast), local institutions may want direct collaboration. Aquariums often partner on observation programs.' }
                  ].map(function(t, i) {
                    return h('div', { key: i,
                      style: { background: 'rgba(15,23,42,0.5)', borderLeft: '3px solid #86efac', padding: '10px 12px', borderRadius: 8 } },
                      h('div', { style: { fontSize: 11, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 } }, t.level),
                      h('div', { style: { fontSize: 13, fontWeight: 700, color: '#fde68a', marginBottom: 4 } }, t.platform),
                      h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 } }, t.detail));
                  })),
                h('p', { style: { margin: '12px 0 0 0', padding: '12px 14px', background: 'rgba(134,239,172,0.08)', borderLeft: '3px solid #86efac', borderRadius: 6, fontStyle: 'italic' } },
                  'Your observation matters. New cephalopod species are still being discovered. Range shifts due to climate change are documented largely by amateur observation. Behavior records for most species are sparse. You can contribute to real science with a phone + a snorkel.')))
          ) : null
        );
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 16 — RESOURCES (expanded with full glossary)
      // ═══════════════════════════════════════════════════════
      function renderResources() {
        var sub = d.resourcesSub || 'glossary';
        var filter = (d.glossaryFilter || '').toLowerCase().trim();
        var SUBS = [
          { id: 'glossary', label: 'Glossary', icon: '📖', count: GLOSSARY.length },
          { id: 'sources', label: 'Sources', icon: '📜' },
          { id: 'citizen', label: 'Citizen Science', icon: '🔬' },
          { id: 'fieldnotes', label: 'Field Notes', icon: '📔', count: (d.huntFieldNotesUnlocked || []).length }
        ];
        return h('div', null,
          panelHeader('📚 Resources',
            'Glossary, source bibliography, citizen science participation, and your unlocked field notes from the Hunter Sim.'),

          // Sub-tab strip
          h('div', { role: 'tablist', 'aria-label': 'Resources sub-sections',
            style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 } },
            SUBS.map(function(s) {
              var active = sub === s.id;
              return h('button', { key: s.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
                onClick: function() { setCL({ resourcesSub: s.id }); awardXP(1); },
                style: { padding: '8px 12px',
                  background: active ? 'rgba(99,102,241,0.3)' : 'rgba(15,23,42,0.5)',
                  color: active ? '#c7d2fe' : '#cbd5e1',
                  border: '1px solid ' + (active ? 'rgba(167,139,250,0.6)' : 'rgba(100,116,139,0.3)'),
                  borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6 } },
                h('span', { 'aria-hidden': 'true' }, s.icon),
                s.label,
                s.count != null ? h('span', { style: { fontSize: 10, color: active ? '#a78bfa' : '#64748b', fontFamily: 'ui-monospace, Menlo, monospace' } }, ' (' + s.count + ')') : null);
            })),

          // ─── GLOSSARY ───
          sub === 'glossary' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '📖 Cephalopod glossary'),
              h('div', { style: { marginBottom: 14 } },
                h('input', { type: 'search', value: d.glossaryFilter || '',
                  onChange: function(e) { setCL({ glossaryFilter: e.target.value }); },
                  placeholder: 'Search terms... (e.g., "hectocotylus", "iridophore", "semelparous")',
                  'aria-label': 'Filter glossary terms',
                  style: { width: '100%', padding: '10px 14px',
                    background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(100,116,139,0.4)',
                    borderRadius: 8, color: '#f1f5f9', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' } })),
              (function() {
                var matches = GLOSSARY.filter(function(g) {
                  if (!filter) return true;
                  return g.term.toLowerCase().includes(filter) || g.defn.toLowerCase().includes(filter);
                }).sort(function(a, b) { return a.term.localeCompare(b.term); });
                if (matches.length === 0) {
                  return h('div', { style: { color: '#94a3b8', fontSize: 12, padding: '16px 0', textAlign: 'center', fontStyle: 'italic' } },
                    'No matches for "' + filter + '". Try a partial word.');
                }
                return h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 } },
                  matches.map(function(g, i) {
                    var tagColor = g.tag === 'anatomy' ? '#fb923c' :
                                   g.tag === 'camouflage' ? '#a78bfa' :
                                   g.tag === 'behavior' ? '#86efac' :
                                   g.tag === 'reproduction' ? '#f472b6' :
                                   g.tag === 'conservation' ? '#fca5a5' : '#38bdf8';
                    return h('div', { key: i,
                      style: { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.3)',
                        borderLeft: '3px solid ' + tagColor, padding: '10px 12px', borderRadius: 8 } },
                      h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' } },
                        h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fde68a' } }, g.term),
                        h('span', { style: { fontSize: 9, fontWeight: 700, color: tagColor, background: tagColor + '15', padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.05em' } }, g.tag)),
                      h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.55 } }, g.defn));
                  }));
              })())) : null,

          // ─── SOURCES ───
          sub === 'sources' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '📜 Sources + bibliography'),
              h('div', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.7, marginBottom: 14 } },
                h('p', { style: { margin: '0 0 12px 0' } }, 'Cephalopod Lab content is anchored in peer-reviewed marine biology + behavioral science. Primary sources:')),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 } },
                [
                  { name: 'Hanlon & Messenger, "Cephalopod Behaviour" (Cambridge, 2018)', topic: 'Standard reference for cephalopod behavior, camouflage, signaling, learning, mating', tag: 'book' },
                  { name: 'Godfrey-Smith, "Other Minds" (FSG, 2016)', topic: 'Accessible introduction to cephalopod cognition + philosophy of mind in distributed-neural animals', tag: 'book' },
                  { name: 'Roper, Sweeney & Nauen, FAO Cephalopod Catalog (1984)', topic: 'Taxonomy, distribution, size data across cephalopod species', tag: 'reference' },
                  { name: 'Finn, Tregenza & Norman (2009) Current Biology', topic: '"Defensive tool use in a coconut-carrying octopus" — the paper that changed invertebrate cognition science', tag: 'paper' },
                  { name: 'Norman & Finn (2001) Bull. Mar. Sci.', topic: 'Discovery + description of the mimic octopus (Thaumoctopus mimicus)', tag: 'paper' },
                  { name: 'Hanlon (2007) Current Biology', topic: '"Cephalopod dynamic camouflage" — the 3-pattern model (uniform / mottled / disruptive)', tag: 'paper' },
                  { name: 'Wang & Ragsdale (2018, 2022)', topic: 'Optic gland + cholesterol pathway papers on programmed cephalopod senescence', tag: 'paper' },
                  { name: 'Doubleday et al. (2016) Current Biology', topic: 'Cephalopod populations rising globally — the climate-change-winner paper', tag: 'paper' },
                  { name: 'Birch, Burn, Schnell et al. (2021) LSE review', topic: '"Review of the evidence of sentience in cephalopod molluscs and decapod crustaceans" — basis for UK 2021 Sentience Act amendment', tag: 'report' },
                  { name: 'Cambridge Declaration on Consciousness (2012)', topic: 'Signed at the Francis Crick Memorial Conference. First broad scientific consensus naming cephalopods alongside mammals + birds', tag: 'declaration' },
                  { name: 'Roger Hanlon\'s Marine Biological Laboratory website', topic: 'Open-access cephalopod camouflage research, photos, video', tag: 'web' },
                  { name: 'CephResearch.org', topic: 'Active research community resources, papers, public engagement', tag: 'web' }
                ].map(function(s, i) {
                  var tagColor = s.tag === 'paper' ? '#a78bfa' : s.tag === 'book' ? '#fbbf24' : s.tag === 'report' ? '#fca5a5' : '#38bdf8';
                  return h('div', { key: i,
                    style: { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.3)',
                      borderLeft: '3px solid ' + tagColor, padding: '10px 12px', borderRadius: 8 } },
                    h('div', { style: { fontSize: 12, fontWeight: 700, color: '#c7d2fe', marginBottom: 4 } }, s.name),
                    h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, s.topic),
                    h('div', { style: { fontSize: 9, fontWeight: 700, color: tagColor, textTransform: 'uppercase', letterSpacing: '0.06em' } }, s.tag));
                })))) : null,

          // ─── CITIZEN SCIENCE ───
          sub === 'citizen' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, '🔬 Be a cephalopod scientist'),
              h('div', { style: { color: '#cbd5e1', fontSize: 13, lineHeight: 1.75, marginBottom: 16 } },
                h('p', { style: { margin: '0 0 12px 0' } },
                  'Cephalopod biology is one of the few scientific fields where amateur observations regularly contribute to peer-reviewed papers. New species are still being discovered. Behavior is poorly documented for most species. ',
                  h('b', { style: { color: '#fde68a' } }, 'If you see a cephalopod doing something interesting, report it.'))),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 } },
                [
                  { name: 'iNaturalist Cephalopod Project', what: 'Photo + location reports of cephalopod sightings worldwide. Used by researchers to track range expansion, behavior, and discover undocumented species.', how: 'Free app, free account. Photo + GPS = data.' },
                  { name: 'NOAA Marine Wildlife Reports', what: 'For US waters. Report unusual cephalopod sightings, especially Humboldt squid in northern Pacific (range expansion data is sparse).', how: 'noaa.gov/marine-life' },
                  { name: 'CephResearch.org sightings log', what: 'Researcher-curated database of cephalopod observations. Strong on behavioral oddities.', how: 'Email submissions with photo + location' },
                  { name: 'TONMO.com community', what: 'The Octopus News Magazine Online. Long-running cephalopod enthusiast + amateur scientist community. Many published researchers participate.', how: 'Forum + sightings + Q&A' },
                  { name: 'Australian Museum CephRecord', what: 'Particularly for Indo-Pacific species. Mimic octopus, blue-ringed, cuttlefish observations.', how: 'australian.museum (specific submission page)' },
                  { name: 'iSeahorse.org (broader marine focus)', what: 'Not cephalopod-specific but includes octopus + cuttlefish observations from snorkelers + divers.', how: 'Mobile app, photo-based' }
                ].map(function(c, i) {
                  return h('div', { key: i,
                    style: { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.3)',
                      borderLeft: '3px solid #86efac', padding: '12px 14px', borderRadius: 8 } },
                    h('div', { style: { fontSize: 13, fontWeight: 800, color: '#86efac', marginBottom: 6 } }, c.name),
                    h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.55, marginBottom: 6 } }, c.what),
                    h('div', { style: { fontSize: 11, color: '#fde68a', fontStyle: 'italic' } },
                      h('b', null, '🔗 How: '), c.how));
                })),
              h('div', { style: { marginTop: 14, padding: '12px 14px', background: 'rgba(134,239,172,0.08)', borderLeft: '3px solid #86efac', borderRadius: 8 } },
                h('div', { style: { fontSize: 10, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } },
                  '💡 Pro tip for students'),
                h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.65 } },
                  'If you live near tidepools, a snorkel + a phone in a waterproof case is enough to start. Cephalopods are notoriously hard to find — most sightings come from patient observation, not lucky encounters. The Pacific Northwest has Giant Pacific octopuses; the Mediterranean has common octopuses; the Indo-Pacific has the highest cephalopod diversity on Earth.')))) : null,

          // ─── FIELD NOTES ───
          sub === 'fieldnotes' ? h('div', null,
            (d.huntFieldNotesUnlocked || []).length > 0 ?
              h('div', { style: cardStyle() },
                h('div', { style: subheaderStyle() }, '📔 Field notes you\'ve unlocked'),
                h('div', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.55, marginBottom: 14 } },
                  'Real biology trivia unlocked through Hunter Sim attempts. Each note maps to documented research.'),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                  (d.huntFieldNotesUnlocked || []).map(function(noteId, i) {
                    var note = FIELD_NOTES.find(function(n) { return n.id === noteId; });
                    if (!note) return null;
                    return h('div', { key: i,
                      style: { background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)',
                        borderLeft: '3px solid #a78bfa', padding: '12px 14px', borderRadius: 8 } },
                      h('div', { style: { fontSize: 12, color: '#e9d5ff', lineHeight: 1.7, fontStyle: 'italic' } },
                        '"' + note.text + '"'));
                  })),
                h('div', { style: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 14, fontStyle: 'italic' } },
                  (d.huntFieldNotesUnlocked || []).length + ' of ' + FIELD_NOTES.length + ' unlocked. Keep hunting to discover more.')) :
              h('div', { style: cardStyle() },
                h('div', { style: { color: '#94a3b8', fontSize: 13, padding: '24px', textAlign: 'center', fontStyle: 'italic', lineHeight: 1.7 } },
                  'You haven\'t unlocked any field notes yet. Head to the ',
                  h('b', { style: { color: '#c7d2fe' } }, 'Hunter Sim'),
                  ' tab and attempt a hunt — every attempt unlocks a real biology fact.'))
          ) : null
        );
      }

      // ─── Section dispatch ───
      var content;
      if (section === 'field') content = renderFieldGuide();
      else if (section === 'hunt') content = renderHuntSim();
      else if (section === 'evasion') content = renderEvasionSim();
      else if (section === 'day') content = renderDayInLife();
      else if (section === 'camo') content = renderCamouflageLab();
      else if (section === 'biolux') content = renderBioluminescence();
      else if (section === 'anatomy') content = renderBodyPlan();
      else if (section === 'time') content = renderThroughTime();
      else if (section === 'jet') content = renderJetLab();
      else if (section === 'intel') content = renderIntelLab();
      else if (section === 'methods') content = renderResearchMethods();
      else if (section === 'compcog') content = renderComparativeCognition();
      else if (section === 'conservation') content = renderConservation();
      else if (section === 'culture') content = renderCulture();
      else if (section === 'fieldday') content = renderFieldDay();
      else if (section === 'resources') content = renderResources();
      else content = renderHub();

      return h('div', { style: rootStyle, role: 'region', 'aria-label': 'Cephalopod Lab' },
        renderHeader(),
        renderTabs(),
        h('div', { style: { padding: 20 } }, content)
      );
    }
  });
})();
}
