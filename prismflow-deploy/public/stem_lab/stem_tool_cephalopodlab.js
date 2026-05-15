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
      notes: 'The only living cephalopod with an external shell. Uses the chambered shell for buoyancy by pumping gas in/out. Pinhole eyes (no lens) means very poor vision compared to other cephalopods — they hunt mostly by smell. Mostly scavenger. Despite the dramatic difference, evolutionary studies show nautilids share ancestor with octopus + squid ~500M years ago.' }
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
      requires: 'large body + prey weaker than you' }
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
          { id: 'field', label: 'Species Field Guide', icon: '📖' },
          { id: 'hunt', label: 'Hunter Sim', icon: '🎯' },
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
                  '4 sections')),
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
      // SECTION 4 — RESOURCES (stub for v0.2)
      // ═══════════════════════════════════════════════════════
      function renderResources() {
        return h('div', null,
          panelHeader('📚 Resources & Glossary',
            'Sources, glossary, conservation context, and deeper science for everything in Cephalopod Lab. Phase 2 (next ship) will expand this section with full chromatophore biology, jet propulsion physics, and the 9-brains anatomy explorer.'),

          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '🚧 v0.2 will add'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#e2e8f0', fontSize: 12, lineHeight: 1.8 } },
              h('li', null, 'Standalone Camouflage Lab — chromatophore + iridophore + leucophore mechanics with interactive layer sliders'),
              h('li', null, 'Body Plan & 9 Brains — anatomy explorer with hover-to-learn body regions + the distributed-intelligence neural map'),
              h('li', null, 'Jet Propulsion physics — mantle dynamics + thrust calculations + escape vs sustained-swim comparison'),
              h('li', null, 'Intelligence research — Otto vs Inky vs documented escape artists + the consciousness question'),
              h('li', null, 'Conservation deep-dive — cephalopod fisheries + climate-change winners + the nautilus shell trade'))),

          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '📜 Sources'),
            h('div', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.7 } },
              h('p', { style: { margin: '0 0 12px 0' } }, 'Cephalopod Lab content is anchored in peer-reviewed marine biology + behavioral science. Key sources:'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 } },
                [
                  { name: 'Hanlon & Messenger, "Cephalopod Behaviour" (Cambridge, 2018)', topic: 'The standard reference for cephalopod behavior, camouflage, signaling, learning, mating' },
                  { name: 'Godfrey-Smith, "Other Minds" (FSG, 2016)', topic: 'Accessible introduction to cephalopod cognition + the philosophy of mind in distributed-neural animals' },
                  { name: 'Roper, Sweeney & Nauen, FAO Cephalopod Catalog', topic: 'Taxonomy, distribution, size data across cephalopod species' },
                  { name: 'Finn, Tregenza & Norman (2009) "Defensive tool use" Current Biology', topic: 'The coconut octopus tool-use paper that changed invertebrate cognition science' },
                  { name: 'Norman & Finn (2001) on Thaumoctopus mimicus', topic: 'Discovery + description of the mimic octopus' },
                  { name: 'Hanlon (2007) on cephalopod camouflage', topic: 'The 3-pattern model of cephalopod skin display (uniform / mottled / disruptive)' },
                  { name: 'CephResearch.org + TONMO.com', topic: 'Active research community resources, current papers, public engagement' }
                ].map(function(s, i) {
                  return h('div', { key: i,
                    style: { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.3)',
                      borderLeft: '3px solid #a78bfa', padding: '10px 12px', borderRadius: 8 } },
                    h('div', { style: { fontSize: 12, fontWeight: 700, color: '#c7d2fe', marginBottom: 4 } }, s.name),
                    h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } }, s.topic));
                })))),

          // Field notes unlocked
          (d.huntFieldNotesUnlocked || []).length > 0 ? h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '📔 Field notes you\'ve unlocked'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              (d.huntFieldNotesUnlocked || []).map(function(noteId, i) {
                var note = FIELD_NOTES.find(function(n) { return n.id === noteId; });
                if (!note) return null;
                return h('div', { key: i,
                  style: { background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)',
                    borderLeft: '3px solid #a78bfa', padding: '10px 14px', borderRadius: 8 } },
                  h('div', { style: { fontSize: 12, color: '#e9d5ff', lineHeight: 1.65, fontStyle: 'italic' } },
                    '"' + note.text + '"'));
              }))) : null
        );
      }

      // ─── Section dispatch ───
      var content;
      if (section === 'field') content = renderFieldGuide();
      else if (section === 'hunt') content = renderHuntSim();
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
