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
          { id: 'anatomy', label: 'Body Plan', icon: '🧠' },
          { id: 'time', label: 'Through Time', icon: '🕰️' },
          { id: 'jet', label: 'Jet Propulsion', icon: '🚀' },
          { id: 'intel', label: 'Intelligence', icon: '💡' },
          { id: 'methods', label: 'Research Methods', icon: '🔬' },
          { id: 'compcog', label: 'Comparative Cognition', icon: '🧩' },
          { id: 'conservation', label: 'Conservation & Welfare', icon: '🌍' },
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
                  '14 sections')),
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
      // SECTION 3 — HUNTER SIM (the headliner)
      // ═══════════════════════════════════════════════════════
      function renderHuntSim() {
        var phase = d.huntPhase || 'lobby';
        if (phase === 'plan') return renderHuntPlan();
        if (phase === 'approach') return renderHuntApproach();
        if (phase === 'strike') return renderHuntStrike();
        if (phase === 'result') return renderHuntResult();
        return renderHuntLobby();
      }

      // Hunt: choose species
      function renderHuntLobby() {
        return h('div', null,
          panelHeader('🎯 Hunter Simulator',
            'Play a cephalopod hunter. Pick a species, choose a habitat + prey, plan your tactic, run the camouflage minigame, time your strike. The judge checks whether your tactic was species-appropriate.'),

          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, 'Stats so far'),
            h('div', { style: { display: 'flex', gap: 24, flexWrap: 'wrap' } },
              h('div', null,
                h('div', { style: { fontSize: 28, fontWeight: 900, color: '#86efac', fontFamily: 'ui-monospace, Menlo, monospace' } }, (d.huntsSuccessful || 0)),
                h('div', { style: { fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Successful hunts')),
              h('div', null,
                h('div', { style: { fontSize: 28, fontWeight: 900, color: '#fb923c', fontFamily: 'ui-monospace, Menlo, monospace' } }, (d.huntsAttempted || 0)),
                h('div', { style: { fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Attempts')),
              h('div', null,
                h('div', { style: { fontSize: 28, fontWeight: 900, color: '#a78bfa', fontFamily: 'ui-monospace, Menlo, monospace' } }, (d.huntFieldNotesUnlocked || []).length),
                h('div', { style: { fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Field notes unlocked')))),

          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, 'Choose your species'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 } },
              SPECIES.map(function(s) {
                var groupColor = s.group === 'octopus' ? '#a78bfa' : s.group === 'squid' ? '#38bdf8' : s.group === 'cuttlefish' ? '#fbbf24' : '#86efac';
                return h('button', { key: s.id,
                  onClick: function() { setCL({ huntSpeciesId: s.id, huntPhase: 'plan', huntHabitatId: null, huntPreyId: null, huntTacticId: null }); awardXP(2); clAnnounce('Selected ' + s.name); },
                  style: { padding: '14px 16px', textAlign: 'left',
                    background: 'rgba(15,23,42,0.6)', color: '#fde68a',
                    border: '1px solid rgba(100,116,139,0.3)', borderLeft: '4px solid ' + groupColor,
                    borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 28, lineHeight: 1 } }, s.emoji),
                    h('div', { style: { flex: 1 } },
                      h('div', { style: { fontSize: 14, fontWeight: 800, color: '#c7d2fe' } }, s.name),
                      h('div', { style: { fontSize: 10, fontStyle: 'italic', color: '#94a3b8', marginTop: 2 } }, s.scientific))),
                  h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } }, s.weird));
              })))
        );
      }

      // Hunt: plan habitat + prey + tactic
      function renderHuntPlan() {
        var sp = SPECIES.find(function(x) { return x.id === d.huntSpeciesId; });
        if (!sp) { setCL({ huntPhase: 'lobby' }); return null; }
        var canProceed = !!(d.huntHabitatId && d.huntPreyId && d.huntTacticId);
        return h('div', null,
          panelHeader('🎯 Plan the hunt — ' + sp.emoji + ' ' + sp.name,
            'Pick a habitat (where you hunt) + prey (what you\'re after) + tactic (how you\'ll do it). The judge will assess whether your choices fit your species.'),

          // Habitat picker
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '🏠 Habitat'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8 } },
              HABITATS.map(function(hab) {
                var active = d.huntHabitatId === hab.id;
                var natural = sp.habitat.indexOf(hab.id) !== -1;
                return h('button', { key: hab.id,
                  onClick: function() { setCL({ huntHabitatId: hab.id }); awardXP(1); },
                  'aria-pressed': active ? 'true' : 'false',
                  title: hab.description,
                  style: { padding: '8px 10px', textAlign: 'left',
                    background: active ? 'rgba(99,102,241,0.3)' : 'rgba(15,23,42,0.5)',
                    color: active ? '#c7d2fe' : '#cbd5e1',
                    border: '1px solid ' + (active ? 'rgba(167,139,250,0.6)' : 'rgba(100,116,139,0.3)'),
                    borderLeft: '3px solid ' + hab.color,
                    borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6 } },
                  h('span', { 'aria-hidden': 'true' }, hab.emoji),
                  h('span', null, hab.name),
                  natural ? h('span', { style: { fontSize: 9, color: '#86efac', marginLeft: 'auto' } }, '✓ natural') : null);
              }))),

          // Prey picker
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '🍽️ Prey'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 } },
              PREY.map(function(p) {
                var active = d.huntPreyId === p.id;
                var natural = sp.prey.indexOf(p.id) !== -1;
                return h('button', { key: p.id,
                  onClick: function() { setCL({ huntPreyId: p.id }); awardXP(1); },
                  'aria-pressed': active ? 'true' : 'false',
                  title: p.description,
                  style: { padding: '8px 10px', textAlign: 'left',
                    background: active ? 'rgba(99,102,241,0.3)' : 'rgba(15,23,42,0.5)',
                    color: active ? '#c7d2fe' : '#cbd5e1',
                    border: '1px solid ' + (active ? 'rgba(167,139,250,0.6)' : 'rgba(100,116,139,0.3)'),
                    borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 16 } }, p.emoji),
                  h('span', null, p.name),
                  natural ? h('span', { style: { fontSize: 9, color: '#86efac', marginLeft: 'auto' } }, '✓') : null);
              }))),

          // Tactic picker
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '⚔️ Tactic'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 } },
              TACTICS.map(function(t) {
                var active = d.huntTacticId === t.id;
                var natural = sp.tactics.indexOf(t.id) !== -1;
                return h('button', { key: t.id,
                  onClick: function() { setCL({ huntTacticId: t.id }); awardXP(1); },
                  'aria-pressed': active ? 'true' : 'false',
                  title: t.description,
                  style: { padding: '8px 10px', textAlign: 'left',
                    background: active ? 'rgba(99,102,241,0.3)' : 'rgba(15,23,42,0.5)',
                    color: active ? '#c7d2fe' : '#cbd5e1',
                    border: '1px solid ' + (active ? 'rgba(167,139,250,0.6)' : 'rgba(100,116,139,0.3)'),
                    borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6 } },
                  h('span', { 'aria-hidden': 'true' }, t.emoji),
                  h('span', null, t.name),
                  natural ? h('span', { style: { fontSize: 9, color: '#86efac', marginLeft: 'auto' } }, '✓') : null);
              }))),

          // Action buttons
          h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' } },
            h('button', { onClick: function() { if (canProceed) setCL({ huntPhase: 'approach' }); },
              disabled: !canProceed,
              style: { padding: '12px 26px',
                background: canProceed ? '#a78bfa' : 'rgba(100,116,139,0.3)',
                color: canProceed ? '#1c1410' : '#94a3b8',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800,
                cursor: canProceed ? 'pointer' : 'not-allowed' } },
              '→ Approach phase'),
            h('button', { onClick: function() { setCL({ huntPhase: 'lobby' }); },
              style: { padding: '12px 18px', background: 'transparent', color: '#cbd5e1',
                border: '1px solid rgba(100,116,139,0.5)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' } },
              '← Different species'))
        );
      }

      // Hunt: approach (camouflage minigame)
      function renderHuntApproach() {
        var sp = SPECIES.find(function(x) { return x.id === d.huntSpeciesId; });
        var hab = HABITATS.find(function(x) { return x.id === d.huntHabitatId; });
        if (!sp || !hab) { setCL({ huntPhase: 'lobby' }); return null; }
        var target = hab.substrate;
        var col = d.huntCamouflageColor || 128;
        var pat = d.huntCamouflagePattern || 50;
        var tex = d.huntCamouflageTexture || 50;
        // Compute match score
        // Color: distance from target red (using the substrate red channel as the target)
        var colorMatch = 100 - Math.abs(col - target.red) / 2.55;
        var targetPattern = target.pattern === 'mottled' ? 70 : target.pattern === 'striped' ? 85 : 20;
        var patternMatch = 100 - Math.abs(pat - targetPattern);
        var targetTexture = target.texture === 'rough' || target.texture === 'bumpy' ? 80 : target.texture === 'leafy' ? 65 : 20;
        var textureMatch = 100 - Math.abs(tex - targetTexture);
        var overall = Math.round((colorMatch + patternMatch + textureMatch) / 3);
        // Cap with camouflage rank — high-cam species can hit 100, low-cam species cap out lower
        var maxPossible = Math.min(100, 40 + sp.camouflageRank * 6);
        overall = Math.min(overall, maxPossible);
        var verdict = overall >= 85 ? { color: '#86efac', label: 'Indistinguishable from the substrate.' } :
                      overall >= 70 ? { color: '#fbbf24', label: 'Close — prey might pass within range.' } :
                      overall >= 50 ? { color: '#fb923c', label: 'Visible to a wary predator. Risky.' } :
                                       { color: '#fca5a5', label: 'You stand out. Prey will see you coming.' };
        return h('div', null,
          panelHeader('🎯 Approach: match your skin to the substrate',
            sp.name + ' in ' + hab.name + '. Adjust color, pattern, and texture sliders. The closer you match, the better your strike succeeds. Camouflage rank cap: ' + sp.camouflageRank + '/10.'),

          // Side-by-side substrate + cephalopod
          h('div', { style: cardStyle() },
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 16 } },
              h('div', null,
                h('div', { style: { fontSize: 10, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } }, '🏠 Target substrate'),
                renderSubstratePatch(target.red, target.green, target.blue, target.texture, target.pattern),
                h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 6, fontFamily: 'ui-monospace, Menlo, monospace' } },
                  'RGB(' + target.red + ',' + target.green + ',' + target.blue + ') · ' + target.texture + ' · ' + target.pattern)),
              h('div', null,
                h('div', { style: { fontSize: 10, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } }, '🐙 Your skin'),
                renderSubstratePatch(col,
                  Math.round(target.green + (col - target.red) * 0.6),
                  Math.round(target.blue + (col - target.red) * 0.4),
                  tex >= 70 ? 'rough' : tex >= 50 ? 'bumpy' : tex >= 30 ? 'leafy' : 'smooth',
                  pat >= 70 ? 'mottled' : pat >= 50 ? 'striped' : 'solid'),
                h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 6, fontFamily: 'ui-monospace, Menlo, monospace' } },
                  'Match: ' + overall + ' / ' + maxPossible))),

            // Sliders
            ['Color brightness (0=dark → 255=light)', 'Pattern (0=solid → 100=mottled)', 'Texture (0=smooth → 100=rough)'].map(function(lbl, i) {
              var val = [col, pat, tex][i];
              var max = [255, 100, 100][i];
              var key = ['huntCamouflageColor', 'huntCamouflagePattern', 'huntCamouflageTexture'][i];
              return h('div', { key: i, style: { marginBottom: 12 } },
                h('label', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: 700 } },
                  h('span', null, lbl),
                  h('span', { style: { fontFamily: 'ui-monospace, Menlo, monospace', color: '#fde68a' } }, val)),
                h('input', { type: 'range', min: 0, max: max, step: 1, value: val,
                  onChange: function(e) { var patch = {}; patch[key] = parseInt(e.target.value, 10); setCL(patch); },
                  'aria-label': lbl,
                  style: { width: '100%', accentColor: '#a78bfa' } }));
            }),

            // Verdict
            h('div', { style: { background: verdict.color + '15', border: '1px solid ' + verdict.color + '55',
              borderLeft: '4px solid ' + verdict.color, padding: '12px 14px', borderRadius: 10, marginTop: 8 } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: verdict.color, marginBottom: 4 } },
                'Camouflage: ' + overall + '%'),
              h('div', { style: { fontSize: 12, color: '#e2e8f0' } }, verdict.label))),

          // Action
          h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' } },
            h('button', { onClick: function() { setCL({ huntPhase: 'strike', huntStrikeTime: 0 }); },
              style: { padding: '12px 26px', background: '#a78bfa', color: '#1c1410',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer' } },
              '→ Strike phase'),
            h('button', { onClick: function() { setCL({ huntPhase: 'plan' }); },
              style: { padding: '12px 18px', background: 'transparent', color: '#cbd5e1',
                border: '1px solid rgba(100,116,139,0.5)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' } },
              '← Replan'))
        );
      }

      function renderSubstratePatch(r, g, b, texture, pattern) {
        // Render a small SVG patch showing the color, texture, and pattern
        var hexFill = '#' + [r, g, b].map(function(v) {
          var hex = Math.max(0, Math.min(255, Math.round(v))).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        }).join('');
        var texGrain = null;
        if (texture === 'rough' || texture === 'bumpy') {
          texGrain = h('g', null,
            h('circle', { cx: 30, cy: 28, r: 3, fill: 'rgba(0,0,0,0.18)' }),
            h('circle', { cx: 65, cy: 45, r: 4, fill: 'rgba(0,0,0,0.16)' }),
            h('circle', { cx: 100, cy: 32, r: 3, fill: 'rgba(0,0,0,0.2)' }),
            h('circle', { cx: 50, cy: 80, r: 2.5, fill: 'rgba(0,0,0,0.18)' }),
            h('circle', { cx: 95, cy: 75, r: 3, fill: 'rgba(0,0,0,0.16)' }));
        } else if (texture === 'leafy') {
          texGrain = h('g', null,
            h('ellipse', { cx: 30, cy: 40, rx: 12, ry: 4, fill: 'rgba(0,0,0,0.15)', transform: 'rotate(30 30 40)' }),
            h('ellipse', { cx: 80, cy: 60, rx: 14, ry: 4, fill: 'rgba(0,0,0,0.15)', transform: 'rotate(-20 80 60)' }));
        }
        var patternOverlay = null;
        if (pattern === 'mottled') {
          patternOverlay = h('g', null,
            h('circle', { cx: 40, cy: 40, r: 12, fill: 'rgba(0,0,0,0.13)' }),
            h('circle', { cx: 80, cy: 70, r: 10, fill: 'rgba(0,0,0,0.13)' }),
            h('circle', { cx: 110, cy: 50, r: 9, fill: 'rgba(0,0,0,0.13)' }));
        } else if (pattern === 'striped') {
          patternOverlay = h('g', null,
            h('rect', { x: 0, y: 30, width: 140, height: 6, fill: 'rgba(0,0,0,0.15)' }),
            h('rect', { x: 0, y: 60, width: 140, height: 6, fill: 'rgba(0,0,0,0.15)' }),
            h('rect', { x: 0, y: 90, width: 140, height: 6, fill: 'rgba(0,0,0,0.15)' }));
        }
        return h('svg', { width: 140, height: 110, viewBox: '0 0 140 110', 'aria-hidden': 'true',
          style: { borderRadius: 8, border: '1px solid rgba(100,116,139,0.3)' } },
          h('rect', { x: 0, y: 0, width: 140, height: 110, fill: hexFill }),
          texGrain,
          patternOverlay);
      }

      // Hunt: strike (timing minigame)
      function renderHuntStrike() {
        // Timing bar: target zone in middle (40-60). Click button to capture position.
        // Position is computed from elapsed sim time at this render.
        var capturedAt = d.huntStrikeTime || 0;
        var now = Date.now();
        // We use the render timestamp modulo to get a sweep position 0-100
        var sweepMs = 2000; // 2s sweep
        var position = capturedAt > 0 ? capturedAt : (Math.floor(now / 30) % 100); // ~30ms tick visual
        var inZone = capturedAt > 0 && capturedAt >= 40 && capturedAt <= 60;
        return h('div', null,
          panelHeader('🎯 Strike: time it right',
            'Click when the marker hits the green zone. Too early = missed strike (prey escapes). Too late = prey saw you coming.'),

          h('div', { style: cardStyle() },
            // Timing bar visualization
            h('div', { style: { position: 'relative', height: 60, background: 'rgba(15,23,42,0.7)', borderRadius: 8, marginBottom: 16, overflow: 'hidden', border: '1px solid rgba(100,116,139,0.3)' } },
              // Target zone (green)
              h('div', { style: { position: 'absolute', top: 0, bottom: 0, left: '40%', width: '20%', background: 'rgba(34,197,94,0.25)', borderLeft: '2px solid #22c55e', borderRight: '2px solid #22c55e' } }),
              // Marker
              capturedAt === 0 ? h('div', { style: { position: 'absolute', top: 4, bottom: 4, left: position + '%', width: 4, background: '#fb923c', borderRadius: 2, transition: 'none' } }) :
              h('div', { style: { position: 'absolute', top: 4, bottom: 4, left: capturedAt + '%', width: 4, background: inZone ? '#22c55e' : '#dc2626', borderRadius: 2 } }),
              // Labels
              h('div', { style: { position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', fontSize: 11, fontWeight: 800, color: '#86efac' } }, 'STRIKE ZONE'),
              h('div', { style: { position: 'absolute', top: 4, left: 6, fontSize: 9, color: '#94a3b8', fontFamily: 'ui-monospace, Menlo, monospace' } }, 'too early'),
              h('div', { style: { position: 'absolute', top: 4, right: 6, fontSize: 9, color: '#94a3b8', fontFamily: 'ui-monospace, Menlo, monospace' } }, 'too late')),

            // Capture button or result
            capturedAt === 0 ? h('button', {
              onClick: function() {
                var p = Math.floor(Date.now() / 30) % 100;
                setCL({ huntStrikeTime: p });
                awardXP(2);
              },
              style: { width: '100%', padding: '16px', background: '#dc2626', color: 'white',
                border: 'none', borderRadius: 10, fontSize: 18, fontWeight: 900, cursor: 'pointer',
                animation: 'pulse 0.8s infinite alternate' } },
              '🎯 STRIKE NOW') :
              h('div', null,
                h('div', { style: { textAlign: 'center', padding: 16, background: inZone ? 'rgba(34,197,94,0.15)' : 'rgba(220,38,38,0.15)',
                  border: '1px solid ' + (inZone ? 'rgba(34,197,94,0.4)' : 'rgba(220,38,38,0.4)'), borderRadius: 10, marginBottom: 12 } },
                  h('div', { style: { fontSize: 16, fontWeight: 800, color: inZone ? '#86efac' : '#fca5a5', marginBottom: 4 } },
                    inZone ? '✓ Clean strike (' + capturedAt + ')' : '✗ Mistimed (' + capturedAt + ')'),
                  h('div', { style: { fontSize: 11, color: '#e2e8f0', lineHeight: 1.55 } },
                    inZone ? 'Caught the prey at exactly the right window.' :
                    capturedAt < 40 ? 'Released too early — prey wasn\'t in arm-reach yet.' :
                    'Released too late — prey saw the motion and bolted.')),
                h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' } },
                  h('button', { onClick: function() { runHuntJudge(inZone); },
                    style: { padding: '12px 26px', background: '#a78bfa', color: '#1c1410',
                      border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer' } },
                    '→ See result'))))
        );
      }

      function runHuntJudge(strikeSuccess) {
        var sp = SPECIES.find(function(x) { return x.id === d.huntSpeciesId; });
        var hab = HABITATS.find(function(x) { return x.id === d.huntHabitatId; });
        var pr = PREY.find(function(x) { return x.id === d.huntPreyId; });
        var tac = TACTICS.find(function(x) { return x.id === d.huntTacticId; });
        if (!sp || !hab || !pr || !tac) { setCL({ huntPhase: 'lobby' }); return; }
        // Camouflage match
        var target = hab.substrate;
        var col = d.huntCamouflageColor || 128;
        var pat = d.huntCamouflagePattern || 50;
        var tex = d.huntCamouflageTexture || 50;
        var colorMatch = 100 - Math.abs(col - target.red) / 2.55;
        var targetPattern = target.pattern === 'mottled' ? 70 : target.pattern === 'striped' ? 85 : 20;
        var patternMatch = 100 - Math.abs(pat - targetPattern);
        var targetTexture = target.texture === 'rough' || target.texture === 'bumpy' ? 80 : target.texture === 'leafy' ? 65 : 20;
        var textureMatch = 100 - Math.abs(tex - targetTexture);
        var camo = Math.min(100, Math.round((colorMatch + patternMatch + textureMatch) / 3), 40 + sp.camouflageRank * 6);
        // Judge logic
        var notes = [];
        var caught = false;
        // 1. Habitat appropriateness
        var habitatOK = sp.habitat.indexOf(hab.id) !== -1;
        if (habitatOK) notes.push({ neg: false, label: '✓ Natural habitat', detail: sp.name + ' is comfortable in ' + hab.name + '.' });
        else notes.push({ neg: true, label: '⚠️ Off-habitat', detail: sp.name + ' rarely or never lives in ' + hab.name + '. Real-world: instinct + camouflage are tuned for their natural substrate.' });
        // 2. Prey appropriateness
        var preyOK = sp.prey.indexOf(pr.id) !== -1;
        if (preyOK) notes.push({ neg: false, label: '✓ Realistic prey', detail: pr.name + ' is on ' + sp.name + '\'s natural diet.' });
        else if (pr.difficulty >= 8) notes.push({ neg: true, label: '⚠️ Wrong prey', detail: pr.name + ' is far above ' + sp.name + '\'s typical prey class. Real cephalopods don\'t pick fights they\'ll lose.' });
        else notes.push({ neg: true, label: '⚠️ Atypical prey', detail: pr.name + ' isn\'t a regular item for ' + sp.name + '. Possible but uncommon.' });
        // 3. Tactic appropriateness
        var tacticOK = sp.tactics.indexOf(tac.id) !== -1;
        if (tacticOK) notes.push({ neg: false, label: '✓ Species-appropriate tactic', detail: tac.name + ' fits ' + sp.name + '\'s adaptations.' });
        else notes.push({ neg: true, label: '⚠️ Tactic mismatch', detail: tac.name + ' isn\'t typical for ' + sp.name + '. ' + (tac.requires || '') });
        // 4. Camouflage score
        if (camo >= 80) notes.push({ neg: false, label: '✓ Excellent camouflage', detail: 'Match score ' + camo + '% — prey wouldn\'t see you.' });
        else if (camo >= 60) notes.push({ neg: false, label: '~ Adequate camouflage', detail: 'Match ' + camo + '%. Worked, barely.' });
        else notes.push({ neg: true, label: '⚠️ Visible to prey', detail: 'Camouflage was only ' + camo + '%. Prey almost certainly saw you.' });
        // 5. Strike timing
        if (strikeSuccess) notes.push({ neg: false, label: '✓ Strike timing', detail: 'Clean release at the right moment.' });
        else notes.push({ neg: true, label: '⚠️ Strike mistimed', detail: 'Released early or late.' });
        // Overall catch determination
        var difficulty = pr.difficulty + (habitatOK ? 0 : 3) + (preyOK ? 0 : 3) + (tacticOK ? 0 : 3);
        var skillScore = (camo / 100 * 50) + (strikeSuccess ? 35 : 0) + (sp.intelligence * 1.5);
        caught = skillScore > difficulty * 7;
        // Calorie balance
        var caloriesGained = caught ? pr.calories : 0;
        var caloriesSpent = 30 + (tac.id === 'jet-strike' ? 40 : tac.id === 'group-hunt' ? 25 : 10);
        var netCal = caloriesGained - caloriesSpent;
        // Field note unlock
        var newFieldNote = null;
        var prevNotes = d.huntFieldNotesUnlocked || [];
        var availableNotes = FIELD_NOTES.filter(function(n) { return prevNotes.indexOf(n.id) === -1; });
        if (availableNotes.length > 0) {
          newFieldNote = availableNotes[Math.floor(Math.random() * availableNotes.length)];
        }
        // Save result
        setCL(function(prior) {
          var newUnlocked = (prior.huntFieldNotesUnlocked || []).slice();
          if (newFieldNote && newUnlocked.indexOf(newFieldNote.id) === -1) newUnlocked.push(newFieldNote.id);
          return {
            huntPhase: 'result',
            huntResult: {
              caught: caught, camo: camo, strikeSuccess: strikeSuccess,
              calsGained: caloriesGained, calsSpent: caloriesSpent, netCal: netCal,
              notes: notes, newFieldNote: newFieldNote,
              speciesName: sp.name, preyName: pr.name, tacticName: tac.name, habitatName: hab.name
            },
            huntsAttempted: (prior.huntsAttempted || 0) + 1,
            huntsSuccessful: (prior.huntsSuccessful || 0) + (caught ? 1 : 0),
            huntFieldNotesUnlocked: newUnlocked
          };
        });
        if (caught) awardXP(8);
      }

      function renderHuntResult() {
        var r = d.huntResult;
        if (!r) { setCL({ huntPhase: 'lobby' }); return null; }
        var caught = r.caught;
        return h('div', null,
          panelHeader('🎯 Hunt result',
            (caught ? '✓ Caught the ' + r.preyName + '.' : '✗ ' + r.preyName + ' got away.') +
            ' ' + r.speciesName + ' in ' + r.habitatName + ' with ' + r.tacticName + '.'),

          // Hero result
          h('div', { style: Object.assign({}, cardStyle(), { textAlign: 'center', padding: 32,
            background: caught ? 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(15,23,42,0.6))'
                               : 'linear-gradient(135deg, rgba(220,38,38,0.18), rgba(15,23,42,0.6))',
            borderLeft: '4px solid ' + (caught ? '#22c55e' : '#dc2626')
          }) },
            h('div', { 'aria-hidden': 'true', style: { fontSize: 64, lineHeight: 1, marginBottom: 8 } },
              caught ? '🏆' : '💨'),
            h('div', { style: { fontSize: 24, fontWeight: 900, color: caught ? '#86efac' : '#fca5a5', letterSpacing: '-0.01em', marginBottom: 8 } },
              caught ? 'Successful hunt' : 'Hunt failed'),
            h('div', { style: { fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' } },
              caught
                ? 'You caught the ' + r.preyName + '. Net calories: +' + r.netCal + '. Reproduction edges closer.'
                : 'The ' + r.preyName + ' escaped. Net calories: ' + r.netCal + '. Energy spent without reward.')),

          // Caloric balance
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '⚡ Energy balance'),
            h('div', { style: { display: 'flex', gap: 14, flexWrap: 'wrap' } },
              h('div', null,
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Gained'),
                h('div', { style: { fontSize: 24, fontWeight: 900, color: '#86efac', fontFamily: 'ui-monospace, Menlo, monospace' } }, '+' + r.calsGained),
                h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'kcal')),
              h('div', null,
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Spent'),
                h('div', { style: { fontSize: 24, fontWeight: 900, color: '#fca5a5', fontFamily: 'ui-monospace, Menlo, monospace' } }, '−' + r.calsSpent),
                h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'kcal (hunt + camo + strike)')),
              h('div', null,
                h('div', { style: { fontSize: 11, fontWeight: 800, color: r.netCal >= 0 ? '#86efac' : '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Net'),
                h('div', { style: { fontSize: 24, fontWeight: 900, color: r.netCal >= 0 ? '#86efac' : '#fca5a5', fontFamily: 'ui-monospace, Menlo, monospace' } },
                  (r.netCal >= 0 ? '+' : '') + r.netCal),
                h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'kcal'))) ),

          // Judge notes
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

          // Field note unlock
          r.newFieldNote ? h('div', { style: { background: 'linear-gradient(135deg, rgba(167,139,250,0.18), rgba(56,189,248,0.12))',
            border: '2px solid rgba(167,139,250,0.5)', borderRadius: 12, padding: '14px 18px', marginBottom: 16 } },
            h('div', { style: { fontSize: 11, fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 } },
              '📔 Field note unlocked'),
            h('div', { style: { fontSize: 13, color: '#e9d5ff', lineHeight: 1.7, fontStyle: 'italic' } },
              '"' + r.newFieldNote.text + '"')) : null,

          // Actions
          h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' } },
            h('button', { onClick: function() { setCL({ huntPhase: 'lobby', huntResult: null, huntStrikeTime: 0, huntCamouflageColor: 128, huntCamouflagePattern: 50, huntCamouflageTexture: 50 }); awardXP(3); },
              style: { padding: '12px 24px', background: '#a78bfa', color: '#1c1410',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer' } },
              '🔁 Hunt again'),
            h('button', { onClick: function() { setSection('field'); awardXP(2); },
              style: { padding: '12px 24px', background: 'transparent', color: '#c7d2fe',
                border: '1px solid rgba(167,139,250,0.4)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' } },
              '📖 Browse field guide'))
        );
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
                    border: '1px solid rgba(100,116,139,0.3)', borderLeft: '4px solid ' + groupColor,
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
                    border: '1px solid rgba(100,116,139,0.3)', borderLeft: '4px solid ' + groupColor,
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
      // SECTION 5 — BODY PLAN & 9 BRAINS
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
      // SECTION 9 — RESOURCES (expanded with full glossary)
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
      else if (section === 'anatomy') content = renderBodyPlan();
      else if (section === 'time') content = renderThroughTime();
      else if (section === 'jet') content = renderJetLab();
      else if (section === 'intel') content = renderIntelLab();
      else if (section === 'methods') content = renderResearchMethods();
      else if (section === 'compcog') content = renderComparativeCognition();
      else if (section === 'conservation') content = renderConservation();
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
