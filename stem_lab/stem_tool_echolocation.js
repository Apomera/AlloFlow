// ═══════════════════════════════════════════
// stem_tool_echolocation.js — Bat Echolocation & Sound Physics Lab
// See the world through sound: sonar vision, wave physics, Doppler effect,
// bat biology, and acoustic ecology. Canvas-based interactive simulations.
// ═══════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
window.StemLab = window.StemLab || {
  _registry: {},
  _order: [],
  registerTool: function(id, config) {
    config.id = id;
    config.ready = config.ready !== false;
    this._registry[id] = config;
    if (this._order.indexOf(id) === -1) this._order.push(id);
    console.log('[StemLab] Registered tool: ' + id);
  },
  getRegisteredTools: function() {
    var self = this;
    return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
  },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) {
    var tool = this._registry[id];
    if (!tool || !tool.render) return null;
    try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; }
  }
};
// ═══ End Guard ═══

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('echolocation'))) {

(function() {
  'use strict';

  // ── MODULE-SCOPED CONSTANTS ──

  var SPEED_OF_SOUND_AIR = 343;   // m/s
  var SPEED_OF_SOUND_WATER = 1480;
  var SPEED_OF_SOUND_STEEL = 5960;
  var NUM_RAYS = 120;
  var RAY_STEP = (Math.PI * 2) / NUM_RAYS;
  var SONAR_DECAY = 0.97;
  var PULSE_SPEED = 5; // px per frame

  // ── CAVE SCENE TEMPLATES ──
  var SCENE_CAVE = {
    name: 'Cave Exploration',
    desc: 'Navigate a cave system and find all the exits.',
    bg: '#0a0a1a',
    objects: [
      { type: 'wall', id: 'w1', segments: [{x:0,y:0},{x:0,y:500},{x:60,y:500},{x:50,y:400},{x:30,y:300},{x:20,y:150},{x:40,y:50},{x:0,y:0}], material: 'rock', reflectivity: 0.9 },
      { type: 'wall', id: 'w2', segments: [{x:800,y:0},{x:800,y:500},{x:740,y:500},{x:750,y:380},{x:770,y:250},{x:760,y:120},{x:780,y:30},{x:800,y:0}], material: 'rock', reflectivity: 0.9 },
      { type: 'wall', id: 'w3', segments: [{x:0,y:0},{x:200,y:10},{x:350,y:30},{x:500,y:15},{x:650,y:25},{x:800,y:0}], material: 'rock', reflectivity: 0.9 },
      { type: 'wall', id: 'w4', segments: [{x:0,y:500},{x:150,y:490},{x:300,y:500},{x:500,y:485},{x:700,y:495},{x:800,y:500}], material: 'rock', reflectivity: 0.9 },
      { type: 'stalactite', id: 's1', x: 200, y: 30, width: 14, height: 75, material: 'rock', reflectivity: 0.85 },
      { type: 'stalactite', id: 's2', x: 420, y: 25, width: 10, height: 60, material: 'rock', reflectivity: 0.85 },
      { type: 'stalactite', id: 's3', x: 600, y: 20, width: 16, height: 85, material: 'rock', reflectivity: 0.85 },
      { type: 'stalagmite', id: 'g1', x: 250, y: 430, width: 18, height: 70, material: 'rock', reflectivity: 0.85 },
      { type: 'stalagmite', id: 'g2', x: 500, y: 440, width: 22, height: 60, material: 'rock', reflectivity: 0.85 },
      { type: 'stalagmite', id: 'g3', x: 680, y: 435, width: 15, height: 65, material: 'rock', reflectivity: 0.85 },
      { type: 'moth', id: 'm1', x: 350, y: 200, radius: 8, material: 'soft', reflectivity: 0.3, moving: true },
      { type: 'moth', id: 'm2', x: 550, y: 150, radius: 7, material: 'soft', reflectivity: 0.3, moving: true },
      { type: 'moth', id: 'm3', x: 450, y: 350, radius: 9, material: 'soft', reflectivity: 0.3, moving: true },
      { type: 'moth', id: 'm4', x: 650, y: 280, radius: 6, material: 'soft', reflectivity: 0.3, moving: true },
      { type: 'water', id: 'p1', x: 100, y: 460, width: 180, height: 30, material: 'water', reflectivity: 0.4 },
      { type: 'water', id: 'p2', x: 500, y: 465, width: 120, height: 25, material: 'water', reflectivity: 0.4 },
      { type: 'rock', id: 'r1', x: 320, y: 300, width: 35, height: 30, material: 'rock', reflectivity: 0.88 },
      { type: 'rock', id: 'r2', x: 580, y: 380, width: 28, height: 25, material: 'rock', reflectivity: 0.88 },
      { type: 'rock', id: 'r3', x: 150, y: 250, width: 25, height: 22, material: 'rock', reflectivity: 0.88 },
      { type: 'stalactite', id: 's4', x: 380, y: 15, width: 12, height: 50, material: 'rock', reflectivity: 0.85 },
      { type: 'stalagmite', id: 'g4', x: 400, y: 445, width: 16, height: 55, material: 'rock', reflectivity: 0.85 },
      { type: 'moth', id: 'm5', x: 200, y: 280, radius: 7, material: 'soft', reflectivity: 0.3, moving: true },
      { type: 'moth', id: 'm6', x: 700, y: 180, radius: 8, material: 'soft', reflectivity: 0.3, moving: true },
      { type: 'moth', id: 'm7', x: 500, y: 100, radius: 6, material: 'soft', reflectivity: 0.3, moving: true },
      { type: 'moth', id: 'm8', x: 300, y: 380, radius: 9, material: 'soft', reflectivity: 0.3, moving: true },
      { type: 'exit', id: 'e1', x: 780, y: 230, width: 20, height: 50, material: 'air', reflectivity: 0.05 },
      { type: 'exit', id: 'e2', x: 380, y: 0, width: 40, height: 15, material: 'air', reflectivity: 0.05 }
    ]
  };

  var SCENE_FOREST = {
    name: 'Night Forest',
    desc: 'Open environment with trees, insects, and water.',
    bg: '#050d14',
    objects: [
      { type: 'tree', id: 't1', x: 120, y: 200, width: 40, height: 180, material: 'wood', reflectivity: 0.6 },
      { type: 'tree', id: 't2', x: 300, y: 150, width: 50, height: 200, material: 'wood', reflectivity: 0.6 },
      { type: 'tree', id: 't3', x: 520, y: 180, width: 35, height: 170, material: 'wood', reflectivity: 0.6 },
      { type: 'tree', id: 't4', x: 680, y: 220, width: 45, height: 190, material: 'wood', reflectivity: 0.6 },
      { type: 'moth', id: 'fm1', x: 200, y: 120, radius: 7, material: 'soft', reflectivity: 0.3, moving: true },
      { type: 'moth', id: 'fm2', x: 400, y: 180, radius: 8, material: 'soft', reflectivity: 0.3, moving: true },
      { type: 'moth', id: 'fm3', x: 600, y: 100, radius: 6, material: 'soft', reflectivity: 0.3, moving: true },
      { type: 'moth', id: 'fm4', x: 350, y: 300, radius: 9, material: 'soft', reflectivity: 0.3, moving: true },
      { type: 'moth', id: 'fm5', x: 550, y: 350, radius: 7, material: 'soft', reflectivity: 0.3, moving: true },
      { type: 'water', id: 'fw1', x: 50, y: 420, width: 300, height: 80, material: 'water', reflectivity: 0.4 },
      { type: 'wall', id: 'fg', segments: [{x:0,y:500},{x:800,y:500}], material: 'earth', reflectivity: 0.5 },
      { type: 'wall', id: 'fsky', segments: [{x:0,y:0},{x:800,y:0}], material: 'air', reflectivity: 0.02 }
    ]
  };

  var SCENE_URBAN = {
    name: 'Urban Night',
    desc: 'Buildings, streetlights, and moths around lights.',
    bg: '#0a0a12',
    objects: [
      { type: 'building', id: 'b1', x: 50, y: 200, width: 80, height: 300, material: 'concrete', reflectivity: 0.92 },
      { type: 'building', id: 'b2', x: 250, y: 150, width: 100, height: 350, material: 'concrete', reflectivity: 0.92 },
      { type: 'building', id: 'b3', x: 500, y: 180, width: 70, height: 320, material: 'concrete', reflectivity: 0.92 },
      { type: 'building', id: 'b4', x: 680, y: 250, width: 90, height: 250, material: 'concrete', reflectivity: 0.92 },
      { type: 'light', id: 'l1', x: 180, y: 320, radius: 60, material: 'light', reflectivity: 0.1 },
      { type: 'light', id: 'l2', x: 430, y: 340, radius: 55, material: 'light', reflectivity: 0.1 },
      { type: 'light', id: 'l3', x: 630, y: 310, radius: 50, material: 'light', reflectivity: 0.1 },
      { type: 'moth', id: 'um1', x: 185, y: 310, radius: 7, material: 'soft', reflectivity: 0.3, moving: true },
      { type: 'moth', id: 'um2', x: 435, y: 330, radius: 8, material: 'soft', reflectivity: 0.3, moving: true },
      { type: 'moth', id: 'um3', x: 635, y: 300, radius: 6, material: 'soft', reflectivity: 0.3, moving: true },
      { type: 'moth', id: 'um4', x: 350, y: 150, radius: 7, material: 'soft', reflectivity: 0.3, moving: true },
      { type: 'wall', id: 'ug', segments: [{x:0,y:500},{x:800,y:500}], material: 'concrete', reflectivity: 0.9 }
    ]
  };

  // ── TROPICAL SCENE (for frugivore) ──
  var SCENE_TROPICAL = {
    name: 'Tropical Canopy',
    desc: 'A lush fruit-filled tropical forest at night.',
    bg: '#050f08',
    objects: [
      // Large trees with spreading canopies
      { type: 'tree', id: 'tt1', x: 100, y: 150, width: 60, height: 250, material: 'wood', reflectivity: 0.6 },
      { type: 'tree', id: 'tt2', x: 350, y: 120, width: 70, height: 280, material: 'wood', reflectivity: 0.6 },
      { type: 'tree', id: 'tt3', x: 600, y: 160, width: 55, height: 240, material: 'wood', reflectivity: 0.6 },
      // Fruit hanging from trees
      { type: 'fruit', id: 'f1', x: 130, y: 180, radius: 10, material: 'organic', reflectivity: 0.45, fruitType: 'mango', color: '#fbbf24' },
      { type: 'fruit', id: 'f2', x: 80, y: 220, radius: 8, material: 'organic', reflectivity: 0.45, fruitType: 'fig', color: '#7c3aed' },
      { type: 'fruit', id: 'f3', x: 380, y: 160, radius: 12, material: 'organic', reflectivity: 0.45, fruitType: 'banana', color: '#facc15' },
      { type: 'fruit', id: 'f4', x: 320, y: 200, radius: 9, material: 'organic', reflectivity: 0.45, fruitType: 'papaya', color: '#fb923c' },
      { type: 'fruit', id: 'f5', x: 630, y: 190, radius: 11, material: 'organic', reflectivity: 0.45, fruitType: 'guava', color: '#86efac' },
      { type: 'fruit', id: 'f6', x: 570, y: 230, radius: 8, material: 'organic', reflectivity: 0.45, fruitType: 'fig', color: '#7c3aed' },
      { type: 'fruit', id: 'f7', x: 450, y: 300, radius: 10, material: 'organic', reflectivity: 0.45, fruitType: 'mango', color: '#fbbf24' },
      { type: 'fruit', id: 'f8', x: 200, y: 350, radius: 9, material: 'organic', reflectivity: 0.45, fruitType: 'papaya', color: '#fb923c' },
      // Water source
      { type: 'water', id: 'tw1', x: 250, y: 450, width: 200, height: 50, material: 'water', reflectivity: 0.4 },
      // Vines (thin horizontal obstacles)
      { type: 'vine', id: 'v1', x: 150, y: 280, width: 120, height: 5, material: 'organic', reflectivity: 0.3 },
      { type: 'vine', id: 'v2', x: 450, y: 250, width: 100, height: 5, material: 'organic', reflectivity: 0.3 },
      // Ground
      { type: 'wall', id: 'tg', segments: [{x:0,y:500},{x:800,y:500}], material: 'earth', reflectivity: 0.5 }
    ]
  };

  var SCENES = [SCENE_CAVE, SCENE_FOREST, SCENE_URBAN, SCENE_TROPICAL];

  // ── PLAYABLE BAT SPECIES ──
  var PLAYABLE_SPECIES = [
    { id: 'insectivore', name: 'Little Brown Bat', emoji: '\uD83E\uDD87',
      subtitle: 'Insect Hunter',
      desc: 'A tiny insectivorous bat that uses rapid-fire echolocation to hunt moths and mosquitoes in the dark. Your sonar is powerful and precise.',
      diet: 'insects',
      sonarType: 'Frequency-modulated sweeps (40-80 kHz)',
      sonarRange: 250,
      sonarWidth: Math.PI * 0.8,
      pulseRate: 'fast',
      pulseCooldown: 8,
      speed: 4,
      energyDrain: 0.15,
      size: 8,
      color: '#92400e',
      preyType: 'moth',
      preyLabel: 'Moths',
      preyEmoji: '\uD83E\uDD8B',
      catchRadius: 20,
      catchVerb: 'caught',
      huntingTip: 'Use rapid pulses to track moths. They move erratically \u2014 predict their path! Listen for the "buzz phase" when you get close.',
      scienceFact: 'Little brown bats use frequency-modulated (FM) sweeps \u2014 each pulse sweeps from high to low frequency in milliseconds. This gives them incredibly detailed spatial information, like switching from a blurry photo to a high-res scan.' },
    { id: 'frugivore', name: 'Egyptian Fruit Bat', emoji: '\uD83E\uDD87',
      subtitle: 'Fruit Forager',
      desc: 'A larger fruit bat that uses tongue-click echolocation and excellent night vision. Your sonar is weaker but you can see ripe fruit glowing faintly.',
      diet: 'fruit',
      sonarType: 'Tongue clicks (low intensity)',
      sonarRange: 150,
      sonarWidth: Math.PI * 1.2,
      pulseRate: 'slow',
      pulseCooldown: 20,
      speed: 3,
      energyDrain: 0.08,
      size: 14,
      color: '#78350f',
      preyType: 'fruit',
      preyLabel: 'Fruits',
      preyEmoji: '\uD83C\uDF4C',
      catchRadius: 25,
      catchVerb: 'collected',
      huntingTip: 'Fruit doesn\'t run away, but you need to find it! Look for the faint warm glow of ripe fruit. Your wider sonar beam covers more area but has less range.',
      scienceFact: 'Egyptian fruit bats are unique among fruit bats \u2014 most fruit bats don\'t echolocate at all! They use tongue clicks instead of laryngeal calls, producing lower-intensity pulses. They also have excellent night vision, unlike most echolocating bats.' }
  ];

  // ── FRUIT TYPES ──
  var FRUIT_TYPES = {
    mango:  { emoji: '\uD83E\uDD6D', color: '#fbbf24', name: 'Mango' },
    fig:    { emoji: '\uD83C\uDF52', color: '#7c3aed', name: 'Fig' },
    banana: { emoji: '\uD83C\uDF4C', color: '#facc15', name: 'Banana' },
    papaya: { emoji: '\uD83C\uDF51', color: '#fb923c', name: 'Papaya' },
    guava:  { emoji: '\uD83C\uDF4F', color: '#86efac', name: 'Guava' }
  };

  // ── MOTH TYPES (for insectivore) ──
  var MOTH_TYPES = {
    regular:  { label: 'Moth', emoji: '\uD83E\uDD8B', color: 'rgba(200,180,160,0.8)', speed: 1, evasionChance: 0.4, energyValue: 15, size: 1 },
    tiger:    { label: 'Tiger Moth', emoji: '\uD83E\uDD8B', color: 'rgba(255,160,60,0.85)', speed: 0.8, evasionChance: 0.3, energyValue: 15, size: 1, jams: true },
    luna:     { label: 'Luna Moth', emoji: '\uD83E\uDD8B', color: 'rgba(140,230,180,0.85)', speed: 0.6, evasionChance: 0.2, energyValue: 25, size: 1.5 },
    mosquito: { label: 'Mosquito Swarm', emoji: '\uD83E\uDD9F', color: 'rgba(180,180,200,0.6)', speed: 1.2, evasionChance: 0.15, energyValue: 10, size: 0.5, swarm: true }
  };

  // ── BAT FLIGHT PHYSICS CONSTANTS ──
  var GRAVITY = 0.08;
  var FLAP_IMPULSE = -1.8;
  var MAX_FALL_SPEED = 3;
  var AIR_FRICTION = 0.98;
  var PERCH_REGEN = 0.5;
  var ENERGY_MAX = 100;
  var ENERGY_CATCH_BONUS = 15;

  // ── BAT ANATOMY DATA ──
  var BAT_ANATOMY = [
    { id: 'wing', label: 'Wing Membrane (Patagium)', color: '#8b5cf6',
      hitBox: { x: 80, y: 140, w: 200, h: 70 },
      what: 'Bat wings are actually modified hands! The membrane stretches between four elongated finger bones, like a living glider.',
      funFact: 'Bats are the ONLY mammals capable of true powered flight. Flying squirrels just glide!',
      physics: 'The thin membrane allows precise control of wing shape, letting bats maneuver better than any bird.' },
    { id: 'ear', label: 'Ears & Tragus', color: '#ec4899',
      hitBox: { x: 310, y: 50, w: 60, h: 60 },
      what: 'Bat ears are enormous relative to body size. The tragus (small inner ear flap) helps pinpoint echo direction with incredible accuracy.',
      funFact: 'Some bats can detect the flutter of a moth\'s wings from 20 feet away using just the difference in echo timing between their two ears!',
      physics: 'Bats use interaural time difference (ITD) \u2014 the microsecond delay between sound reaching the left vs right ear tells the brain exactly where the echo came from.' },
    { id: 'nose', label: 'Nose Leaf', color: '#f59e0b',
      hitBox: { x: 350, y: 115, w: 40, h: 35 },
      what: 'Many bat species have elaborate nose structures that act like a satellite dish, focusing their sonar beam in a specific direction.',
      funFact: 'Horseshoe bats have such precise sonar focus that they can detect a wire thinner than a human hair!',
      physics: 'The nose leaf works like a parabolic reflector \u2014 it concentrates sound energy into a narrow beam, increasing range and resolution.' },
    { id: 'thumb', label: 'Thumb Claw', color: '#10b981',
      hitBox: { x: 70, y: 125, w: 30, h: 30 },
      what: 'The small claw at the top of each wing is actually a thumb! Bats use it to climb, groom, and hold food.',
      funFact: 'When a bat lands on a cave ceiling, it uses its thumb claws to grip, then flips upside down to hang by its feet.',
      physics: 'Hanging upside down is energy-free for bats \u2014 their tendons lock automatically, so they don\'t need to flex muscles to grip.' },
    { id: 'tail', label: 'Tail Membrane (Uropatagium)', color: '#06b6d4',
      hitBox: { x: 150, y: 200, w: 100, h: 40 },
      what: 'The membrane between the legs and tail acts like a scoop net for catching insects mid-flight.',
      funFact: 'Some bats curl their tail membrane into a basket shape to trap insects, then reach down and eat them while still flying!',
      physics: 'The tail membrane also acts as an airbrake and rudder, helping with hovering and tight turns.' },
    { id: 'mouth', label: 'Larynx & Vocal Muscles', color: '#ef4444',
      hitBox: { x: 340, y: 130, w: 45, h: 30 },
      what: 'Bats produce echolocation calls using incredibly fast contractions of their laryngeal muscles \u2014 up to 200 pulses per second during the "buzz phase" of an attack.',
      funFact: 'Bat laryngeal muscles are the fastest-contracting muscles in any mammal. During the final approach on prey, they fire 200 times per second!',
      physics: 'The "buzz phase": as a bat closes in on prey, it increases pulse rate from ~10/sec to 200/sec, giving it a rapid-fire stream of position updates \u2014 like switching from a photograph to a video.' }
  ];

  // ── BAT SPECIES DATA ──
  var BAT_SPECIES = [
    { name: 'Little Brown Bat', emoji: '\uD83E\uDD87', region: 'North America (Maine!)',
      size: '3-4 inches', diet: 'Insects (mosquitoes, moths)',
      echolocation: '40-80 kHz frequency-modulated sweeps',
      habitat: 'Caves, attics, barns, under bridges',
      funFact: 'A single little brown bat can eat 1,000 mosquitoes in one hour!',
      conservation: 'Severely impacted by white-nose syndrome \u2014 populations dropped 90% in some areas.' },
    { name: 'Big Brown Bat', emoji: '\uD83E\uDD87', region: 'North America (common in Maine)',
      size: '4-5 inches', diet: 'Beetles, wasps, flies',
      echolocation: '25-50 kHz, powerful low-frequency calls',
      habitat: 'Buildings, tree hollows, cliff crevices',
      funFact: 'Big brown bats are tough \u2014 they can survive temperatures as low as 23\u00B0F during winter hibernation!',
      conservation: 'More resistant to white-nose syndrome than other species, but still declining.' },
    { name: 'Mexican Free-tailed Bat', emoji: '\uD83E\uDD87', region: 'Southern US, Central/South America',
      size: '3.5 inches', diet: 'Moths, beetles, flying insects',
      echolocation: '25-45 kHz',
      habitat: 'Caves (millions in single colonies!), bridges, buildings',
      funFact: 'Bracken Cave in Texas houses 15-20 MILLION Mexican free-tailed bats \u2014 the largest bat colony on Earth. They eat 200 TONS of insects per night!',
      conservation: 'Relatively stable, but dependent on key cave sites.' },
    { name: 'Greater Horseshoe Bat', emoji: '\uD83E\uDD87', region: 'Europe, Asia, North Africa',
      size: '2.5-3 inches', diet: 'Large beetles, moths',
      echolocation: '80-83 kHz constant-frequency calls (through the nose!)',
      habitat: 'Caves, old buildings, mines',
      funFact: 'Horseshoe bats emit sonar through their elaborate nose leaf instead of their mouth, giving them a highly focused beam!',
      conservation: 'Endangered in many European countries due to habitat loss.' },
    { name: 'Common Pipistrelle', emoji: '\uD83E\uDD87', region: 'Europe, Asia',
      size: '1.5 inches (smallest European bat!)', diet: 'Tiny flies, midges',
      echolocation: '45-76 kHz',
      habitat: 'Cracks in buildings, tree bark, bat boxes',
      funFact: 'Despite weighing less than a nickel, pipistrelles can eat 3,000 tiny insects in a single night!',
      conservation: 'Common but affected by light pollution disrupting feeding patterns.' },
    { name: 'Vampire Bat', emoji: '\uD83E\uDD87', region: 'Central and South America',
      size: '3.5 inches', diet: 'Blood (from cattle/birds, NOT humans)',
      echolocation: 'Low-intensity, plus heat-sensing nose pits!',
      habitat: 'Caves, tree hollows, abandoned buildings',
      funFact: 'Vampire bats have heat sensors in their nose that can detect blood vessels under skin from inches away. They also share blood meals with hungry roostmates \u2014 one of few animals that practice reciprocal altruism!',
      conservation: 'Stable, but often persecuted due to fear and misconceptions.' },
    { name: 'Egyptian Fruit Bat', emoji: '\uD83E\uDD87', region: 'Africa, Middle East, South Asia',
      size: '6 inches', diet: 'Fruit, nectar, pollen',
      echolocation: 'Click-based tongue echolocation (unique among fruit bats!)',
      habitat: 'Caves, ruins, large trees',
      funFact: 'Unlike most fruit bats, Egyptian fruit bats DO echolocate \u2014 but using tongue clicks instead of laryngeal calls, making them acoustic "outliers"!',
      conservation: 'Important seed dispersers and pollinators.' },
    { name: 'Hoary Bat', emoji: '\uD83E\uDD87', region: 'North America (occasionally seen in Maine)',
      size: '5-6 inches (largest bat in Maine!)', diet: 'Large moths, beetles, dragonflies',
      echolocation: '20-35 kHz (low frequency = long range)',
      habitat: 'Solitary tree-roosters, migrate long distances',
      funFact: 'Hoary bats are solitary and migrate thousands of miles \u2014 they\'ve been found as far away as Iceland and Hawaii!',
      conservation: 'Major threat from wind turbines during migration \u2014 barotrauma (lung damage from pressure changes near spinning blades).' }
  ];

  // ── SOUNDSCAPE ANIMALS ──
  var SOUNDSCAPE_ANIMALS = [
    { id: 'cricket', name: 'Cricket', emoji: '\uD83E\uDD97', freq: '4,000-8,000 Hz', range: 'high', color: '#4ade80',
      desc: 'Male crickets chirp by rubbing their wings together (stridulation). Count chirps in 14 seconds and add 40 to estimate temperature in \u00B0F!',
      beepFreq: 4000, beepDur: 0.08 },
    { id: 'frog', name: 'Tree Frog', emoji: '\uD83D\uDC38', freq: '500-3,000 Hz', range: 'mid', color: '#22d3ee',
      desc: 'Male frogs call to attract mates. Each species has a unique call frequency so females find the right species even in a noisy chorus.',
      beepFreq: 1200, beepDur: 0.3 },
    { id: 'owl', name: 'Great Horned Owl', emoji: '\uD83E\uDD89', freq: '200-800 Hz', range: 'low', color: '#a78bfa',
      desc: 'Owls hoot at low frequencies that travel far through forests. Their asymmetric ears let them pinpoint prey by sound alone in total darkness.',
      beepFreq: 400, beepDur: 0.5 },
    { id: 'bat', name: 'Echolocating Bat', emoji: '\uD83E\uDD87', freq: '20,000-200,000 Hz', range: 'ultrasonic', color: '#f472b6',
      desc: 'Bat calls are ultrasonic \u2014 above human hearing. Shown here scaled down. In reality you would hear nothing!',
      beepFreq: 8000, beepDur: 0.02 },
    { id: 'whale', name: 'Blue Whale', emoji: '\uD83D\uDC33', freq: '10-40 Hz', range: 'infrasonic', color: '#3b82f6',
      desc: 'Whale songs can travel thousands of miles underwater. At 188 decibels, blue whale calls are the loudest sound made by any animal.',
      beepFreq: 80, beepDur: 1.0 },
    { id: 'dolphin', name: 'Bottlenose Dolphin', emoji: '\uD83D\uDC2C', freq: '20,000-150,000 Hz', range: 'ultrasonic', color: '#06b6d4',
      desc: 'Dolphins evolved echolocation independently from bats \u2014 convergent evolution! They use clicks focused through the melon (forehead) and receive echoes through their jaw.',
      beepFreq: 6000, beepDur: 0.03 }
  ];

  // ── WALL MATERIALS FOR TAB 2 ──
  var WALL_MATERIALS = [
    { id: 'concrete', label: 'Concrete', reflection: 0.95, color: '#94a3b8' },
    { id: 'wood', label: 'Wood', reflection: 0.60, color: '#d97706' },
    { id: 'carpet', label: 'Carpet', reflection: 0.15, color: '#7c3aed' },
    { id: 'foam', label: 'Acoustic Foam', reflection: 0.05, color: '#374151' }
  ];

  // ── DRAWING HELPERS (module-scoped) ──

  function drawBat(c, x, y, size, flapPhase, facing, isDark) {
    c.save();
    c.translate(x, y);
    c.scale(facing, 1);
    var wa = Math.sin(flapPhase) * 0.5;
    // Body (furry oval)
    c.fillStyle = isDark ? '#6b7280' : '#374151';
    c.beginPath();
    c.ellipse(0, 0, size * 0.6, size * 0.35, 0, 0, Math.PI * 2);
    c.fill();
    // Head
    c.beginPath();
    c.arc(size * 0.5, -size * 0.05, size * 0.2, 0, Math.PI * 2);
    c.fill();
    // Ears (triangles)
    c.beginPath();
    c.moveTo(size * 0.35, -size * 0.2);
    c.lineTo(size * 0.3, -size * 0.55);
    c.lineTo(size * 0.5, -size * 0.2);
    c.fill();
    c.beginPath();
    c.moveTo(size * 0.55, -size * 0.2);
    c.lineTo(size * 0.6, -size * 0.55);
    c.lineTo(size * 0.7, -size * 0.15);
    c.fill();
    // Eyes
    c.fillStyle = '#fbbf24';
    c.beginPath();
    c.arc(size * 0.55, -size * 0.08, size * 0.04, 0, Math.PI * 2);
    c.fill();
    // Wing membranes
    c.fillStyle = isDark ? 'rgba(100,116,139,0.6)' : 'rgba(55,65,81,0.5)';
    c.strokeStyle = isDark ? '#475569' : '#1f2937';
    c.lineWidth = 1;
    // Left wing
    c.save();
    c.rotate(-wa);
    c.beginPath();
    c.moveTo(-size * 0.1, 0);
    c.quadraticCurveTo(-size * 0.4, -size * 1.3, -size * 1.6, -size * 0.2);
    c.lineTo(-size * 1.4, size * 0.1);
    c.quadraticCurveTo(-size * 0.6, size * 0.15, -size * 0.1, 0);
    c.fill();
    c.stroke();
    // Finger struts
    c.beginPath();
    c.moveTo(-size * 0.15, -size * 0.05);
    c.lineTo(-size * 1.2, -size * 0.35);
    c.moveTo(-size * 0.2, 0);
    c.lineTo(-size * 1.5, -size * 0.1);
    c.moveTo(-size * 0.15, size * 0.05);
    c.lineTo(-size * 1.3, size * 0.05);
    c.stroke();
    c.restore();
    // Right wing (mirrored)
    c.save();
    c.rotate(wa);
    c.beginPath();
    c.moveTo(-size * 0.1, 0);
    c.quadraticCurveTo(-size * 0.4, size * 1.3, -size * 1.6, size * 0.2);
    c.lineTo(-size * 1.4, -size * 0.1);
    c.quadraticCurveTo(-size * 0.6, -size * 0.15, -size * 0.1, 0);
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(-size * 0.15, size * 0.05);
    c.lineTo(-size * 1.2, size * 0.35);
    c.moveTo(-size * 0.2, 0);
    c.lineTo(-size * 1.5, size * 0.1);
    c.moveTo(-size * 0.15, -size * 0.05);
    c.lineTo(-size * 1.3, -size * 0.05);
    c.stroke();
    c.restore();
    c.restore();
  }

  function drawSonarPulse(c, cx, cy, radius, maxRadius, isDark) {
    var alpha = Math.max(0, 1 - radius / maxRadius) * 0.6;
    c.beginPath();
    c.arc(cx, cy, radius, 0, Math.PI * 2);
    c.strokeStyle = isDark ? 'rgba(165,180,252,' + alpha + ')' : 'rgba(99,102,241,' + alpha + ')';
    c.lineWidth = 2;
    c.stroke();
  }

  function drawMoth(c, x, y, radius, phase) {
    c.save();
    c.translate(x, y);
    var wingAngle = Math.sin(phase * 8) * 0.4;
    c.fillStyle = 'rgba(200,180,160,0.8)';
    // Body
    c.beginPath();
    c.ellipse(0, 0, radius * 0.3, radius * 0.7, 0, 0, Math.PI * 2);
    c.fill();
    // Left wing
    c.save();
    c.rotate(-wingAngle);
    c.beginPath();
    c.ellipse(-radius * 0.5, 0, radius * 0.8, radius * 0.4, -0.3, 0, Math.PI * 2);
    c.fill();
    c.restore();
    // Right wing
    c.save();
    c.rotate(wingAngle);
    c.beginPath();
    c.ellipse(radius * 0.5, 0, radius * 0.8, radius * 0.4, 0.3, 0, Math.PI * 2);
    c.fill();
    c.restore();
    c.restore();
  }

  function drawFruit(c, x, y, radius, fruitType, glowAlpha) {
    c.save();
    c.translate(x, y);
    var ft = FRUIT_TYPES[fruitType] || FRUIT_TYPES.mango;
    // Warm glow for frugivore night vision
    if (glowAlpha > 0) {
      var grad = c.createRadialGradient(0, 0, 0, 0, 0, radius * 3);
      grad.addColorStop(0, 'rgba(255,200,80,' + (glowAlpha * 0.25) + ')');
      grad.addColorStop(1, 'rgba(255,200,80,0)');
      c.fillStyle = grad;
      c.beginPath();
      c.arc(0, 0, radius * 3, 0, Math.PI * 2);
      c.fill();
    }
    // Fruit body
    c.fillStyle = ft.color;
    c.beginPath();
    c.arc(0, 0, radius, 0, Math.PI * 2);
    c.fill();
    // Highlight
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.beginPath();
    c.arc(-radius * 0.25, -radius * 0.25, radius * 0.35, 0, Math.PI * 2);
    c.fill();
    // Stem
    c.strokeStyle = '#4a3728';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(0, -radius);
    c.lineTo(2, -radius - 5);
    c.stroke();
    c.restore();
  }

  function drawSpiderWeb(c, x, y, width, height, alpha) {
    c.save();
    c.globalAlpha = alpha;
    c.strokeStyle = 'rgba(200,200,220,0.4)';
    c.lineWidth = 0.5;
    // Horizontal thread
    c.beginPath();
    c.moveTo(x, y + height / 2);
    c.lineTo(x + width, y + height / 2);
    c.stroke();
    // Droop lines
    var segs = 5;
    for (var i = 0; i <= segs; i++) {
      var px = x + (width / segs) * i;
      var sag = Math.sin((i / segs) * Math.PI) * height * 0.4;
      c.beginPath();
      c.moveTo(px, y + height / 2);
      c.lineTo(px, y + height / 2 + sag);
      c.stroke();
    }
    // Cross threads
    c.beginPath();
    for (var j = 0; j <= segs; j++) {
      var cx1 = x + (width / segs) * j;
      var s1 = Math.sin((j / segs) * Math.PI) * height * 0.4;
      if (j === 0) c.moveTo(cx1, y + height / 2 + s1);
      else c.lineTo(cx1, y + height / 2 + s1);
    }
    c.stroke();
    c.restore();
  }

  // ── INTERSECTION HELPERS ──
  function pointInRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }

  function circleRectIntersect(cx, cy, r, rx, ry, rw, rh) {
    var closestX = Math.max(rx, Math.min(cx, rx + rw));
    var closestY = Math.max(ry, Math.min(cy, ry + rh));
    var dx = cx - closestX;
    var dy = cy - closestY;
    return (dx * dx + dy * dy) <= (r * r);
  }

  function circleCircleIntersect(x1, y1, r1, x2, y2, r2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    return (dx * dx + dy * dy) <= ((r1 + r2) * (r1 + r2));
  }

  function lineSegIntersectCircle(ax, ay, bx, by, cx, cy, r) {
    var dx = bx - ax;
    var dy = by - ay;
    var fx = ax - cx;
    var fy = ay - cy;
    var a = dx * dx + dy * dy;
    var b = 2 * (fx * dx + fy * dy);
    var cc = fx * fx + fy * fy - r * r;
    var disc = b * b - 4 * a * cc;
    if (disc < 0) return -1;
    disc = Math.sqrt(disc);
    var t1 = (-b - disc) / (2 * a);
    if (t1 >= 0 && t1 <= 1) return t1;
    var t2 = (-b + disc) / (2 * a);
    if (t2 >= 0 && t2 <= 1) return t2;
    return -1;
  }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // ── FREQUENCY TO COLOR ──
  function freqToColor(freq) {
    if (freq < 200) return '#ef4444';
    if (freq < 2000) return '#f97316';
    if (freq < 5000) return '#eab308';
    if (freq < 10000) return '#22c55e';
    if (freq < 18000) return '#6366f1';
    return '#a855f7'; // ultrasonic
  }


  // ═════════════════════════════════════════
  // REGISTER TOOL
  // ═════════════════════════════════════════
  window.StemLab.registerTool('echolocation', {
    icon: '\uD83E\uDD87',
    label: 'Echolocation Lab',
    desc: 'See the world through sound \u2014 bat sonar vision, sound wave physics, Doppler effect & acoustic ecology',
    color: 'indigo',
    category: 'science',
    questHooks: [
      { id: 'sonar_scan', label: 'Map a cave using echolocation', icon: '\uD83E\uDD87', check: function(d) { return d.caveMapped; }, progress: function(d) { return d.caveMapped ? '\u2713' : '\u2014'; } },
      { id: 'catch_moths', label: 'Catch 10 moths using sonar', icon: '\uD83E\uDD8B', check: function(d) { return (d.mothsCaught || 0) >= 10; }, progress: function(d) { return (d.mothsCaught || 0) + '/10'; } },
      { id: 'doppler_master', label: 'Identify 5 Doppler shifts correctly', icon: '\uD83C\uDF0A', check: function(d) { return (d.dopplerCorrect || 0) >= 5; }, progress: function(d) { return (d.dopplerCorrect || 0) + '/5'; } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var useState = React.useState;
      var useEffect = React.useEffect;
      var useRef = React.useRef;
      var useCallback = React.useCallback;
      var d = (ctx.toolData && ctx.toolData['echolocation']) || {};
      var upd = function(key, val) { ctx.update('echolocation', key, val); };
      var updMulti = function(obj) { ctx.updateMulti('echolocation', obj); };
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;
      var t = ctx.t;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var awardXP = ctx.awardXP;
      var celebrate = ctx.celebrate;
      var beep = ctx.beep;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var isDark = ctx.isDark;
      var isContrast = ctx.isContrast;
      var gradeLevel = ctx.gradeLevel;
      var setStemLabTool = ctx.setStemLabTool;
      var theme = ctx.theme;

      // ── State ──
      var tab = d.tab || 'sonar';
      var TABS = [
        { id: 'sonar', label: 'Sonar Vision', icon: '\uD83E\uDD87' },
        { id: 'waves', label: 'Sound Waves', icon: '\uD83C\uDF0A' },
        { id: 'doppler', label: 'Doppler Effect', icon: '\uD83D\uDEA8' },
        { id: 'biology', label: 'Bat Biology', icon: '\uD83E\uDDA0' },
        { id: 'ecology', label: 'Acoustic Ecology', icon: '\uD83C\uDF33' }
      ];

      // ── WCAG: Live region for SR announcements ──
      var liveRef = useRef(null);
      useEffect(function() {
        if (liveRef.current) return;
        var region = document.createElement('div');
        region.id = 'echolocation-a11y-live';
        region.setAttribute('aria-live', 'polite');
        region.setAttribute('aria-atomic', 'true');
        region.setAttribute('role', 'status');
        region.className = 'sr-only';
        region.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
        document.body.appendChild(region);
        liveRef.current = region;
        return function() { if (region.parentNode) region.parentNode.removeChild(region); };
      }, []);

      var srAnnounce = function(msg) {
        if (typeof announceToSR === 'function') { announceToSR(msg); return; }
        if (liveRef.current) { liveRef.current.textContent = ''; setTimeout(function() { liveRef.current.textContent = msg; }, 50); }
      };

      // ── Reduced motion ──
      var reducedMotion = useRef(false);
      useEffect(function() {
        var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
        reducedMotion.current = mq && mq.matches;
        if (mq && mq.addEventListener) {
          var handler = function(e) { reducedMotion.current = e.matches; };
          mq.addEventListener('change', handler);
          return function() { mq.removeEventListener('change', handler); };
        }
      }, []);

      // ═════════════════════════════════════════
      // TAB 1: SONAR VISION SIMULATOR
      // ═════════════════════════════════════════
      // ── Species selection state ──
      var selectedPlayableSpecies = d.playableSpecies || null; // 'insectivore' | 'frugivore' | null
      var currentSpeciesData = selectedPlayableSpecies ? PLAYABLE_SPECIES.find(function(s) { return s.id === selectedPlayableSpecies; }) : null;

      var sonarCanvasRef = useRef(null);
      var sonarBufferRef = useRef(null);
      var sonarAnimRef = useRef(null);
      var sonarKeysRef = useRef({});
      var sonarStateRef = useRef({
        batX: 100, batY: 250, batVx: 0, batVy: 0, facing: 1,
        flapPhase: 0, pulses: [], time: 0,
        discoveredIds: {}, discoveredCount: 0, totalObjects: 0,
        pulseCount: 0, nearestDist: 999, scene: 0,
        mothsCaught: 0, fruitCollected: 0, clarity: 0,
        energy: ENERGY_MAX, perching: false, pulseCooldownTimer: 0,
        mothEvasionMsg: '', mothEvasionTimer: 0, sonarJammed: false, sonarJamTimer: 0,
        drips: [], hiddenChamberFound: false
      });

      var sceneIdx = d.sonarScene || 0;
      var customObjects = d.customObjects || [];

      function getActiveScene() {
        if (sceneIdx === 4) {
          return { name: 'Custom', desc: 'Place your own objects and explore.', bg: '#0a0a1a', objects: customObjects };
        }
        var base = SCENES[sceneIdx] || SCENES[0];
        // Enrich cave scene with extra objects
        if (sceneIdx === 0 && !base._enriched) {
          base._enriched = true;
          // Spider webs
          base.objects.push({ type: 'web', id: 'web1', x: 150, y: 100, width: 80, height: 30, material: 'silk', reflectivity: 0.1 });
          base.objects.push({ type: 'web', id: 'web2', x: 500, y: 120, width: 60, height: 25, material: 'silk', reflectivity: 0.1 });
          // Bat colony on ceiling
          base.objects.push({ type: 'colony', id: 'col1', x: 280, y: 15, width: 100, height: 30, material: 'soft', reflectivity: 0.35 });
          // Hidden chamber entrance (narrow passage)
          base.objects.push({ type: 'passage', id: 'pass1', x: 740, y: 380, width: 15, height: 50, material: 'air', reflectivity: 0.05 });
          // Rare golden moth in hidden chamber area
          base.objects.push({ type: 'moth', id: 'mgold', x: 770, y: 400, radius: 10, material: 'soft', reflectivity: 0.5, moving: true, mothType: 'luna' });
        }
        // Assign moth types to existing moths if not set
        if (base.objects) {
          base.objects.forEach(function(obj) {
            if (obj.type === 'moth' && !obj.mothType) {
              var roll = Math.random();
              if (roll < 0.1) obj.mothType = 'tiger';
              else if (roll < 0.2) obj.mothType = 'luna';
              else if (roll < 0.25) obj.mothType = 'mosquito';
              else obj.mothType = 'regular';
            }
          });
        }
        return base;
      }

      // ── Species Selection Screen ──
      function renderSpeciesSelection() {
        return h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center' },
            h('div', { className: 'text-2xl mb-1' }, '\uD83E\uDD87'),
            h('div', { className: 'text-lg font-black ' + (isDark ? 'text-indigo-200' : 'text-indigo-800') }, 'Choose Your Bat Species'),
            h('p', { className: 'text-xs mt-1 ' + (isDark ? 'text-slate-400' : 'text-slate-600') },
              'Each species has unique echolocation abilities and hunting strategies. Your choice changes how the sonar simulator works.')
          ),
          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-4', role: 'radiogroup', 'aria-label': 'Select bat species' },
            PLAYABLE_SPECIES.map(function(sp) {
              var isSelected = selectedPlayableSpecies === sp.id;
              // Stat bar helper
              function statBar(label, value, max, barColor) {
                var pct = Math.round((value / max) * 100);
                return h('div', { className: 'mb-1' },
                  h('div', { className: 'flex justify-between text-[9px] ' + (isDark ? 'text-slate-400' : 'text-slate-500') },
                    h('span', null, label),
                    h('span', null, Math.round(value))),
                  h('div', { className: 'h-1.5 rounded-full overflow-hidden ' + (isDark ? 'bg-slate-700' : 'bg-slate-200') },
                    h('div', { style: { width: pct + '%', background: barColor }, className: 'h-full rounded-full transition-all' }))
                );
              }
              return h('div', {
                key: sp.id,
                role: 'radio',
                'aria-checked': isSelected ? 'true' : 'false',
                'aria-label': sp.name + ', ' + sp.subtitle + '. ' + sp.desc,
                tabIndex: 0,
                onClick: function() { upd('playableSpecies', sp.id); },
                onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); upd('playableSpecies', sp.id); } },
                className: 'rounded-xl p-4 cursor-pointer transition-all border-2 ' +
                  (isSelected
                    ? (isDark ? 'bg-indigo-900/60 border-indigo-400 ring-2 ring-indigo-400/40 shadow-lg shadow-indigo-500/20' : 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-300 shadow-lg')
                    : (isDark ? 'bg-slate-800/60 border-slate-700 hover:border-indigo-600 hover:bg-slate-800' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'))
              },
                h('div', { className: 'text-center mb-3' },
                  h('div', { className: 'text-3xl mb-1' }, sp.emoji),
                  h('div', { className: 'text-sm font-black ' + (isDark ? 'text-indigo-200' : 'text-indigo-800') }, sp.name),
                  h('div', { className: 'text-[10px] font-bold ' + (isDark ? 'text-indigo-400' : 'text-indigo-600') }, sp.subtitle)),
                h('p', { className: 'text-[10px] mb-3 ' + (isDark ? 'text-slate-300' : 'text-slate-600') }, sp.desc),
                // Stats visualization
                h('div', { className: 'space-y-0.5 mb-3' },
                  statBar('Sonar Range', sp.sonarRange, 300, '#6366f1'),
                  statBar('Beam Width', (sp.sonarWidth / Math.PI) * 100, 150, '#8b5cf6'),
                  statBar('Pulse Speed', (25 - sp.pulseCooldown), 20, '#06b6d4'),
                  statBar('Flight Speed', sp.speed, 5, '#10b981'),
                  statBar('Energy Efficiency', (1 - sp.energyDrain) * 100, 100, '#f59e0b')
                ),
                h('div', { className: 'text-[9px] ' + (isDark ? 'text-slate-500' : 'text-slate-400') },
                  h('div', null, '\uD83C\uDF1F Prey: ' + sp.preyEmoji + ' ' + sp.preyLabel),
                  h('div', null, '\uD83D\uDD0A Sonar: ' + sp.sonarType)),
                // Select button
                h('button', {
                  'aria-label': 'Select ' + sp.name,
                  onClick: function(e) { e.stopPropagation(); upd('playableSpecies', sp.id); },
                  className: 'w-full mt-3 px-4 py-2 rounded-lg text-xs font-bold transition-all ' +
                    (isSelected ? 'bg-indigo-600 text-white shadow-md' : (isDark ? 'bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'))
                }, isSelected ? '\u2713 Selected' : 'Select ' + sp.name)
              );
            })
          ),
          // Science comparison
          selectedPlayableSpecies ? h('div', { className: 'rounded-xl p-3 ' + (isDark ? 'bg-indigo-900/20 border border-indigo-800/30' : 'bg-indigo-50 border border-indigo-200') },
            h('div', { className: 'text-xs font-bold mb-1 ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, '\uD83E\uDDEC Science Note'),
            h('p', { className: 'text-[10px] ' + (isDark ? 'text-indigo-200' : 'text-indigo-800') },
              currentSpeciesData ? currentSpeciesData.scienceFact : ''),
            h('div', { className: 'mt-2 text-[10px] italic ' + (isDark ? 'text-indigo-400' : 'text-indigo-600') },
              currentSpeciesData ? currentSpeciesData.huntingTip : '')
          ) : null,
          // Start playing button (visible once species selected)
          selectedPlayableSpecies ? h('div', { className: 'text-center' },
            h('div', { className: 'text-[10px] mb-2 ' + (isDark ? 'text-slate-400' : 'text-slate-500') },
              'Species selected! The sonar simulator below is now configured for your bat.'),
            h('div', { className: 'text-[9px] ' + (isDark ? 'text-slate-500' : 'text-slate-400') },
              'You can change species anytime using the toggle in the game HUD.')
          ) : null
        );
      }

      function renderSonarTab() {
        var sonarCanvasEl = h('canvas', {
          ref: sonarCanvasRef,
          width: 800,
          height: 500,
          role: 'img',
          'aria-label': 'Sonar vision simulator. Use arrow keys or WASD to move the bat. Press Space to emit a sonar pulse. Objects illuminate briefly when hit by sound waves.',
          tabIndex: 0,
          onKeyDown: function(e) {
            if (e.key === ' ' || e.key === 'Spacebar') {
              e.preventDefault();
              emitSonarPulse();
            }
          },
          style: { width: '100%', maxWidth: '800px', height: 'auto', borderRadius: '12px', display: 'block', border: '2px solid ' + (isDark ? '#312e81' : '#4338ca'), cursor: 'crosshair', background: '#0a0a1a' }
        });

        // Show species selection if not yet chosen
        if (!selectedPlayableSpecies) {
          return h('div', { className: 'space-y-3' }, renderSpeciesSelection());
        }

        var speciesData = currentSpeciesData || PLAYABLE_SPECIES[0];
        var isFrugivore = speciesData.diet === 'fruit';
        var sceneNames = isFrugivore
          ? ['Tropical Canopy', 'Night Forest', 'Urban Night', 'Custom']
          : ['Cave Exploration', 'Night Forest', 'Urban Night', 'Custom'];
        var sceneIndices = isFrugivore ? [3, 1, 2, 4] : [0, 1, 2, 4];

        return h('div', { className: 'space-y-3' },
          // Species toggle + energy bar
          h('div', { className: 'flex flex-wrap gap-2 items-center justify-between' },
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'text-xs font-bold ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') },
                speciesData.emoji + ' ' + speciesData.name + ' (' + speciesData.subtitle + ')'),
              h('button', {
                'aria-label': 'Change bat species',
                onClick: function() { upd('playableSpecies', null); },
                className: 'px-2 py-0.5 rounded text-[9px] font-bold ' + (isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-600 hover:bg-slate-300')
              }, 'Change Species')
            ),
            // Energy bar
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'text-[9px] font-bold ' + (isDark ? 'text-amber-400' : 'text-amber-600') }, '\u26A1 Energy'),
              h('div', { className: 'w-24 h-3 rounded-full overflow-hidden ' + (isDark ? 'bg-slate-700' : 'bg-slate-200'), 'aria-label': 'Energy: ' + Math.round(sonarStateRef.current.energy) + '%' },
                h('div', {
                  style: { width: Math.round(sonarStateRef.current.energy) + '%', background: sonarStateRef.current.energy > 30 ? '#f59e0b' : '#ef4444', transition: 'width 0.2s' },
                  className: 'h-full rounded-full'
                })),
              h('span', { className: 'text-[9px] font-mono ' + (isDark ? 'text-amber-300' : 'text-amber-700') }, Math.round(sonarStateRef.current.energy) + '%')
            )
          ),
          // Scene selector
          h('div', { className: 'flex flex-wrap gap-2 items-center' },
            h('span', { className: 'text-xs font-bold ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, 'Scene:'),
            sceneNames.map(function(name, i) {
              var realIdx = sceneIndices[i];
              var active = sceneIdx === realIdx;
              return h('button', {
                key: i,
                'aria-label': name + ' scene' + (active ? ', selected' : ''),
                'aria-pressed': active ? 'true' : 'false',
                onClick: function() {
                  upd('sonarScene', realIdx);
                  resetSonarState(realIdx);
                },
                className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (active
                  ? 'bg-indigo-600 text-white shadow-md'
                  : (isDark ? 'bg-indigo-900/40 text-indigo-300 hover:bg-indigo-800/50' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'))
              }, name);
            }),
            // Custom scene: add object button
            sceneIdx === 4 ? h('button', {
              'aria-label': 'Add object to custom scene',
              onClick: function() { addCustomObject(); },
              className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500'
            }, '+ Add Object') : null
          ),
          // Controls hint
          h('div', { className: 'flex flex-wrap gap-4 text-[10px] ' + (isDark ? 'text-indigo-400' : 'text-indigo-600') },
            h('span', null, '\u2B05\uFE0F\u27A1\uFE0F A/D: Steer'),
            h('span', null, '\u2B06\uFE0F W: Flap wings (thrust up)'),
            h('span', null, '\u2B07\uFE0F S: Dive'),
            h('span', null, 'SPACE: Emit sonar pulse'),
            h('span', null, 'Touch ceiling/wall: Perch & rest'),
            h('button', {
              'aria-label': 'Emit sonar pulse',
              onClick: function() { emitSonarPulse(); },
              className: 'px-3 py-1 rounded-lg font-bold bg-indigo-600 text-white hover:bg-indigo-500'
            }, '\uD83E\uDD87 Emit Pulse')
          ),
          // Canvas
          sonarCanvasEl,
          // HUD readouts
          h('div', { className: 'grid grid-cols-2 sm:grid-cols-5 gap-2' },
            renderHudStat('Pulses', sonarStateRef.current.pulseCount, '\uD83D\uDD0A'),
            renderHudStat('Discovered', sonarStateRef.current.discoveredCount + '/' + sonarStateRef.current.totalObjects, '\uD83D\uDCCD'),
            renderHudStat('Clarity', Math.round(sonarStateRef.current.clarity) + '%', '\uD83C\uDFAF'),
            renderHudStat('Nearest', sonarStateRef.current.nearestDist < 900 ? Math.round(sonarStateRef.current.nearestDist) + 'px' : '\u2014', '\uD83D\uDCCF'),
            renderHudStat('Frequency', '45 kHz', '\uD83C\uDFB5')
          ),
          // Prey caught readout
          h('div', { className: 'text-xs ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') },
            isFrugivore
              ? ('\uD83C\uDF4C Fruit collected: ' + (d.fruitCollected || 0) + '/10')
              : ('\uD83E\uDD8B Moths caught: ' + (d.mothsCaught || 0) + '/10'),
            (d.caveMapped ? ' | \uD83D\uDDFA\uFE0F Cave mapped!' : ''),
            sonarStateRef.current.perching ? ' | \uD83E\uDD87 Perching (resting)' : '',
            sonarStateRef.current.energy <= 0 ? ' | \u26A0\uFE0F No energy! Gliding only.' : ''),
          // Moth evasion tooltip
          sonarStateRef.current.mothEvasionTimer > 0 ? h('div', {
            className: 'text-[10px] p-2 rounded-lg animate-pulse ' + (isDark ? 'bg-amber-900/40 text-amber-200 border border-amber-700/40' : 'bg-amber-50 text-amber-800 border border-amber-200'),
            role: 'alert'
          }, sonarStateRef.current.mothEvasionMsg) : null,
          // Sonar jammed warning
          sonarStateRef.current.sonarJamTimer > 0 ? h('div', {
            className: 'text-[10px] p-2 rounded-lg animate-pulse ' + (isDark ? 'bg-red-900/40 text-red-200 border border-red-700/40' : 'bg-red-50 text-red-800 border border-red-200'),
            role: 'alert'
          }, '\uD83D\uDD07 Tiger moth jamming your sonar! These moths produce ultrasonic clicks that interfere with bat echolocation \u2014 a real anti-predator defense!') : null,

          // How to Play / Educational Info Panel
          h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-indigo-900/20 border border-indigo-800/30' : 'bg-indigo-50 border border-indigo-200') },
            h('div', { className: 'text-xs font-bold mb-2 ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, '\uD83D\uDCA1 How Sonar Vision Works'),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] ' + (isDark ? 'text-slate-400' : 'text-slate-600') },
              h('div', null,
                h('div', { className: 'font-bold mb-1 ' + (isDark ? 'text-indigo-200' : 'text-indigo-800') }, 'What you\'re seeing:'),
                h('p', null, 'This simulator shows what a bat "sees" through sound. The world is almost completely dark \u2014 objects only become visible for a brief moment when hit by a sonar pulse.'),
                h('p', { className: 'mt-1' }, 'Brighter echoes = closer objects or harder materials. Faint flickering echoes = soft-bodied insects (moths). The glow fades over 1-2 seconds, simulating how the bat\'s "mental image" decays between pulses.')),
              h('div', null,
                h('div', { className: 'font-bold mb-1 ' + (isDark ? 'text-indigo-200' : 'text-indigo-800') }, 'Tips for each scene:'),
                h('ul', { className: 'list-disc pl-4 space-y-1' },
                  h('li', null, h('strong', null, 'Cave: '), 'Use rapid pulses near walls to build up a detailed image. Find the exit (barely visible \u2014 it\'s open air with almost no echo). Watch for hidden passages!'),
                  h('li', null, h('strong', null, 'Forest: '), 'Trees give strong woody echoes. Water pools reflect dimly. Moths flit erratically \u2014 they\'re hard to track!'),
                  h('li', null, h('strong', null, 'Urban: '), 'Buildings give rock-hard echoes. Streetlights create confusing bright spots. Moths cluster around lights.'),
                  h('li', null, h('strong', null, 'Tropical: '), 'Fruit glows faintly in night vision. Trees are large obstacles. Watch for vines!'),
                  h('li', null, h('strong', null, 'Custom: '), 'Place your own objects and try to identify them by echo alone.'),
                  h('li', null, h('strong', null, 'Flight tips: '), 'Press W to flap \u2014 gravity pulls you down! Perch on surfaces to rest and recharge energy. Catching prey restores +15 energy.')))
            ),
            h('div', { className: 'mt-2 text-[9px] italic ' + (isDark ? 'text-indigo-400' : 'text-indigo-600') },
              'Fun fact: Real bats process all this information in milliseconds using a brain the size of a peanut. They can catch 10-14 insects per minute in total darkness!')
          ),

          // Species Comparison Table
          h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-indigo-900/20 border border-indigo-800/30' : 'bg-indigo-50 border border-indigo-200') },
            h('div', { className: 'text-xs font-bold mb-2 ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, '\uD83E\uDD87 Species Comparison \u2014 Insectivore vs Frugivore'),
            h('div', { className: 'overflow-x-auto' },
              h('table', { className: 'w-full text-[10px] ' + (isDark ? 'text-slate-300' : 'text-slate-600'), role: 'table', 'aria-label': 'Species comparison table' },
                h('thead', null,
                  h('tr', { className: isDark ? 'bg-slate-700/50' : 'bg-slate-100' },
                    ['Feature', 'Little Brown Bat', 'Egyptian Fruit Bat'].map(function(hdr) {
                      return h('th', { key: hdr, className: 'px-2 py-1.5 text-left font-bold ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, hdr);
                    })
                  )
                ),
                h('tbody', null,
                  [
                    { feat: 'Sonar Range', ins: 'Long (250px)', fru: 'Short (150px)' },
                    { feat: 'Beam Width', ins: 'Narrow (focused)', fru: 'Wide (broad)' },
                    { feat: 'Pulse Rate', ins: 'Fast (8 frame cooldown)', fru: 'Slow (20 frame cooldown)' },
                    { feat: 'Speed', ins: 'Fast (4 px/frame)', fru: 'Slower (3 px/frame)' },
                    { feat: 'Prey', ins: 'Moths (moving, erratic)', fru: 'Fruit (stationary, glowing)' },
                    { feat: 'Catch Difficulty', ins: 'Hard (moths evade)', fru: 'Medium (must find hidden fruit)' },
                    { feat: 'Energy Drain', ins: 'Higher (active hunting)', fru: 'Lower (efficient glider)' },
                    { feat: 'Night Vision', ins: 'None (pure sonar)', fru: 'Partial (fruit glows faintly)' },
                    { feat: 'Sonar Type', ins: 'FM sweeps (laryngeal)', fru: 'Tongue clicks' }
                  ].map(function(row, ri) {
                    return h('tr', { key: ri, className: ri % 2 === 0 ? (isDark ? 'bg-slate-800/30' : 'bg-slate-50/50') : '' },
                      h('td', { className: 'px-2 py-1 font-bold' }, row.feat),
                      h('td', { className: 'px-2 py-1' }, row.ins),
                      h('td', { className: 'px-2 py-1' }, row.fru)
                    );
                  })
                )
              )
            ),
            h('div', { className: 'mt-2 text-[9px] italic ' + (isDark ? 'text-indigo-400' : 'text-indigo-600') },
              'Both strategies are real! Insectivorous bats evolved high-powered laryngeal echolocation for active hunting. Most fruit bats rely on vision and smell, but Egyptian fruit bats are the exception \u2014 they developed tongue-click echolocation independently.')
          ),

          // Game Mechanics Panel
          h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-slate-800/40 border border-slate-700/30' : 'bg-white border border-slate-200') },
            h('div', { className: 'text-xs font-bold mb-2 ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, '\uD83C\uDFAE Flight & Energy Mechanics'),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] ' + (isDark ? 'text-slate-400' : 'text-slate-600') },
              h('div', null,
                h('div', { className: 'font-bold mb-1 ' + (isDark ? 'text-indigo-200' : 'text-indigo-800') }, '\uD83E\uDD87 Flight Physics'),
                h('ul', { className: 'list-disc pl-4 space-y-0.5' },
                  h('li', null, 'Gravity pulls the bat downward constantly'),
                  h('li', null, 'Press W/Up to flap wings (upward thrust impulse)'),
                  h('li', null, 'Momentum builds gradually \u2014 no instant stops'),
                  h('li', null, 'Air friction slows you down over time'),
                  h('li', null, 'Terminal velocity limits fall speed'))),
              h('div', null,
                h('div', { className: 'font-bold mb-1 ' + (isDark ? 'text-indigo-200' : 'text-indigo-800') }, '\u26A1 Energy System'),
                h('ul', { className: 'list-disc pl-4 space-y-0.5' },
                  h('li', null, 'Energy starts at 100% and drains while flying'),
                  h('li', null, 'Catching prey/fruit restores +15 energy'),
                  h('li', null, 'Perching on surfaces regenerates energy slowly'),
                  h('li', null, 'At 0% energy, you can only glide downward'),
                  h('li', null, 'Frugivores drain energy slower (efficient gliders)'))),
              h('div', null,
                h('div', { className: 'font-bold mb-1 ' + (isDark ? 'text-indigo-200' : 'text-indigo-800') }, '\uD83E\uDD8B Moth Behavior'),
                h('ul', { className: 'list-disc pl-4 space-y-0.5' },
                  h('li', null, 'Moths move erratically (sinusoidal + random)'),
                  h('li', null, '40% chance to evade when sonar hits them'),
                  h('li', null, 'Tiger moths JAM your sonar with ultrasonic clicks!'),
                  h('li', null, 'Luna moths are bigger, slower, worth more energy'),
                  h('li', null, 'Mosquito swarms are tiny and fast'))),
              h('div', null,
                h('div', { className: 'font-bold mb-1 ' + (isDark ? 'text-indigo-200' : 'text-indigo-800') }, '\uD83D\uDDFA\uFE0F Cave Secrets'),
                h('ul', { className: 'list-disc pl-4 space-y-0.5' },
                  h('li', null, 'Stalactites drip water \u2014 watch for ripples'),
                  h('li', null, 'A bat colony hangs on the ceiling'),
                  h('li', null, 'Find the hidden passage to a secret chamber'),
                  h('li', null, 'Spider webs are nearly invisible to sonar'),
                  h('li', null, 'A rare Luna Moth hides in the hidden chamber')))
            )
          ),

          // Material echo guide
          h('div', { className: 'rounded-xl p-3 ' + (isDark ? 'bg-slate-800/40 border border-slate-700/30' : 'bg-white border border-slate-200') },
            h('div', { className: 'text-xs font-bold mb-2 ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, '\uD83E\uDDF1 Echo Materials Guide'),
            h('div', { className: 'flex flex-wrap gap-3' },
              [
                { material: 'Rock/Concrete', reflectivity: '85-95%', color: '#a5b4fc', desc: 'Bright, sharp echoes' },
                { material: 'Wood/Tree', reflectivity: '50-70%', color: '#b48c64', desc: 'Moderate, diffuse echoes' },
                { material: 'Water', reflectivity: '30-40%', color: '#60a5fa', desc: 'Dim, rippling echoes' },
                { material: 'Moth/Insect', reflectivity: '20-30%', color: '#fbbf24', desc: 'Faint flickering echoes' },
                { material: 'Fruit/Organic', reflectivity: '40-50%', color: '#fbbf24', desc: 'Moderate soft echoes, warm glow for fruit bats' },
                { material: 'Spider Web', reflectivity: '5-10%', color: '#94a3b8', desc: 'Nearly invisible! Very faint thin lines' },
                { material: 'Open Air', reflectivity: '1-5%', color: '#334155', desc: 'Almost invisible (no echo)' }
              ].map(function(m, mi) {
                return h('div', { key: mi, className: 'flex items-center gap-2' },
                  h('div', { style: { width: '12px', height: '12px', borderRadius: '50%', background: m.color }, 'aria-hidden': 'true' }),
                  h('div', null,
                    h('div', { className: 'text-[10px] font-bold ' + (isDark ? 'text-slate-300' : 'text-slate-700') }, m.material + ' (' + m.reflectivity + ')'),
                    h('div', { className: 'text-[9px] ' + (isDark ? 'text-slate-500' : 'text-slate-500') }, m.desc))
                );
              })
            )
          )
        );
      }

      function renderHudStat(label, value, icon) {
        return h('div', { className: 'rounded-lg p-2 text-center ' + (isDark ? 'bg-indigo-900/40 border border-indigo-800/50' : 'bg-indigo-50 border border-indigo-200') },
          h('div', { className: 'text-lg' }, icon),
          h('div', { className: 'text-sm font-black ' + (isDark ? 'text-indigo-200' : 'text-indigo-800') }, value),
          h('div', { className: 'text-[9px] ' + (isDark ? 'text-indigo-400' : 'text-slate-600') }, label)
        );
      }

      function resetSonarState(idx) {
        var scene = idx === 4 ? { objects: customObjects } : (SCENES[idx] || SCENES[0]);
        var totalObj = 0;
        scene.objects.forEach(function(o) {
          if (o.type !== 'wall') totalObj++;
        });
        sonarStateRef.current = {
          batX: 100, batY: 250, batVx: 0, batVy: 0, facing: 1,
          flapPhase: 0, pulses: [], time: 0,
          discoveredIds: {}, discoveredCount: 0, totalObjects: totalObj,
          pulseCount: 0, nearestDist: 999, scene: idx,
          mothsCaught: d.mothsCaught || 0, fruitCollected: d.fruitCollected || 0, clarity: 0,
          energy: ENERGY_MAX, perching: false, pulseCooldownTimer: 0,
          mothEvasionMsg: '', mothEvasionTimer: 0, sonarJammed: false, sonarJamTimer: 0,
          drips: [], hiddenChamberFound: false
        };
        // Clear sonar buffer
        if (sonarBufferRef.current) {
          var bCtx = sonarBufferRef.current.getContext('2d');
          bCtx.clearRect(0, 0, 800, 500);
        }
      }

      function emitSonarPulse() {
        var st = sonarStateRef.current;
        var sp = currentSpeciesData || PLAYABLE_SPECIES[0];
        // Enforce cooldown
        if (st.pulseCooldownTimer > 0) return;
        st.pulseCooldownTimer = sp.pulseCooldown;
        var maxR = sp.sonarRange ? sp.sonarRange * 1.6 : 400;
        st.pulses.push({ x: st.batX, y: st.batY, radius: 5, maxRadius: maxR, width: sp.sonarWidth || Math.PI * 2 });
        st.pulseCount++;
        // Audio chirp — frugivore uses tongue click
        if (typeof beep === 'function') {
          try {
            if (sp.diet === 'fruit') { beep(800, 0.02, 0.1); }
            else { beep(2000, 0.03, 0.15); }
          } catch(e) {}
        }
        srAnnounce('Sonar pulse emitted');
      }

      function addCustomObject() {
        var types = ['rock', 'moth', 'stalactite', 'stalagmite', 'water'];
        var tp = types[Math.floor(Math.random() * types.length)];
        var newObj = {
          type: tp, id: 'custom_' + Date.now(),
          x: 100 + Math.random() * 600, y: 80 + Math.random() * 340,
          width: 20 + Math.random() * 30, height: 20 + Math.random() * 40,
          radius: tp === 'moth' ? 7 + Math.random() * 5 : undefined,
          material: tp === 'moth' ? 'soft' : tp === 'water' ? 'water' : 'rock',
          reflectivity: tp === 'moth' ? 0.3 : tp === 'water' ? 0.4 : 0.85,
          moving: tp === 'moth'
        };
        var updated = (d.customObjects || []).concat([newObj]);
        updMulti({ customObjects: updated });
        resetSonarState(4);
        if (addToast) addToast('\uD83C\uDFA8 Added ' + tp + ' to custom scene!', 'info');
      }

      // ── Sonar canvas animation loop ──
      useEffect(function() {
        if (tab !== 'sonar') return;
        if (!selectedPlayableSpecies) return;
        var canvas = sonarCanvasRef.current;
        if (!canvas) return;
        var gfx = canvas.getContext('2d');
        var sp = currentSpeciesData || PLAYABLE_SPECIES[0];
        var isFrug = sp.diet === 'fruit';

        // Create offscreen sonar buffer
        if (!sonarBufferRef.current) {
          sonarBufferRef.current = document.createElement('canvas');
          sonarBufferRef.current.width = 800;
          sonarBufferRef.current.height = 500;
        }
        var bufCtx = sonarBufferRef.current.getContext('2d');

        var scene = getActiveScene();
        var st = sonarStateRef.current;
        st.totalObjects = 0;
        scene.objects.forEach(function(o) { if (o.type !== 'wall') st.totalObjects++; });

        // Initialize drips for stalactites
        if (st.drips.length === 0) {
          scene.objects.forEach(function(obj) {
            if (obj.type === 'stalactite') {
              st.drips.push({ x: obj.x + obj.width / 2, y: obj.y + obj.height, vy: 0, active: false, timer: 2 + Math.random() * 5, ripple: 0 });
            }
          });
        }

        // Key listeners
        var onKey = function(e) {
          sonarKeysRef.current[e.key.toLowerCase()] = e.type === 'keydown';
          if (e.type === 'keydown' && (e.key === ' ' || e.key === 'Spacebar')) {
            e.preventDefault();
            emitSonarPulse();
          }
        };
        window.addEventListener('keydown', onKey);
        window.addEventListener('keyup', onKey);

        var running = true;
        var lastTime = performance.now();

        function objectBounds(obj) {
          if (obj.type === 'moth' || obj.type === 'light' || obj.type === 'fruit') {
            return { cx: obj.x, cy: obj.y, r: obj.radius || 8 };
          }
          if (obj.type === 'wall' && obj.segments) return null;
          return { x: obj.x || 0, y: obj.y || 0, w: obj.width || 30, h: obj.height || 30 };
        }

        function moveMoth(obj, dt) {
          if (!obj.moving) return;
          var mtype = MOTH_TYPES[obj.mothType] || MOTH_TYPES.regular;
          var spdMul = mtype.speed || 1;
          if (!obj._vx) {
            obj._vx = (Math.random() - 0.5) * 60 * spdMul;
            obj._vy = (Math.random() - 0.5) * 60 * spdMul;
            obj._timer = Math.random() * 3;
            obj._sinPhase = Math.random() * Math.PI * 2;
          }
          obj._timer -= dt;
          obj._sinPhase += dt * 3;
          // Erratic sinusoidal + random perturbation
          if (obj._timer <= 0) {
            obj._vx = (Math.random() - 0.5) * 80 * spdMul;
            obj._vy = (Math.random() - 0.5) * 80 * spdMul;
            obj._timer = 0.8 + Math.random() * 2.5;
          }
          // Sinusoidal wobble
          var wobbleX = Math.sin(obj._sinPhase) * 15 * spdMul;
          var wobbleY = Math.cos(obj._sinPhase * 0.7) * 10 * spdMul;
          obj.x = clamp(obj.x + (obj._vx + wobbleX) * dt, 40, 760);
          obj.y = clamp(obj.y + (obj._vy + wobbleY) * dt, 40, 460);
        }

        function mothEvade(obj) {
          // Sonar evasion: moth heard the pulse
          var mtype = MOTH_TYPES[obj.mothType] || MOTH_TYPES.regular;
          if (Math.random() < (mtype.evasionChance || 0.4)) {
            // Sudden direction change
            obj._vx = (Math.random() - 0.5) * 200;
            obj._vy = Math.abs(obj._vy) > 0 ? -obj._vy * 2 : (Math.random() - 0.5) * 200;
            obj._timer = 0.3;
            st.mothEvasionMsg = 'That moth heard your sonar! Many moths have evolved tympanic organs that detect bat echolocation, triggering evasive dives.';
            st.mothEvasionTimer = 180; // frames
            return true;
          }
          // Tiger moth jamming
          if (mtype.jams && Math.random() < 0.5) {
            st.sonarJammed = true;
            st.sonarJamTimer = 60;
            return true;
          }
          return false;
        }

        function checkPulseHits(pulse) {
          var hits = [];
          scene.objects.forEach(function(obj) {
            if (obj.type === 'wall' && obj.segments) {
              for (var i = 0; i < obj.segments.length - 1; i++) {
                var sa = obj.segments[i];
                var sb = obj.segments[i + 1];
                var t = lineSegIntersectCircle(sa.x, sa.y, sb.x, sb.y, pulse.x, pulse.y, pulse.radius);
                if (t >= 0) {
                  var hx = sa.x + (sb.x - sa.x) * t;
                  var hy = sa.y + (sb.y - sa.y) * t;
                  hits.push({ x: hx, y: hy, reflectivity: obj.reflectivity, id: obj.id, material: obj.material });
                }
              }
              return;
            }
            var bounds = objectBounds(obj);
            if (!bounds) return;
            var hit = false;
            if (bounds.r !== undefined) {
              hit = circleCircleIntersect(pulse.x, pulse.y, pulse.radius, bounds.cx, bounds.cy, bounds.r);
            } else {
              hit = circleRectIntersect(pulse.x, pulse.y, pulse.radius, bounds.x, bounds.y, bounds.w, bounds.h);
            }
            if (hit) {
              var cx2 = bounds.cx !== undefined ? bounds.cx : bounds.x + bounds.w / 2;
              var cy2 = bounds.cy !== undefined ? bounds.cy : bounds.y + bounds.h / 2;
              hits.push({ x: cx2, y: cy2, reflectivity: obj.reflectivity, id: obj.id, type: obj.type, material: obj.material, obj: obj });
            }
          });
          return hits;
        }

        // Check if bat is touching a surface (for perching)
        function checkPerch(bx, by) {
          if (by <= 35) return true; // ceiling
          if (bx <= 35 || bx >= 765) return true; // walls
          // Check stalactites / buildings
          var perched = false;
          scene.objects.forEach(function(obj) {
            if (perched) return;
            if (obj.type === 'wall' && obj.segments) return;
            var b = objectBounds(obj);
            if (!b) return;
            if (b.r !== undefined) return;
            if (circleRectIntersect(bx, by, 12, b.x, b.y, b.w, b.h)) {
              perched = true;
            }
          });
          return perched;
        }

        function animate(now) {
          if (!running) return;
          var dt = Math.min((now - lastTime) / 1000, 0.05);
          lastTime = now;
          st.time += dt;

          var keys = sonarKeysRef.current;

          // ── BAT FLIGHT PHYSICS ──
          var isFlapping = keys['arrowup'] || keys['w'];
          var isDiving = keys['arrowdown'] || keys['s'];
          var goLeft = keys['arrowleft'] || keys['a'];
          var goRight = keys['arrowright'] || keys['d'];

          // Check perching
          var onSurface = checkPerch(st.batX, st.batY);
          if (onSurface && !isFlapping && !isDiving && !goLeft && !goRight && Math.abs(st.batVx) < 0.5 && Math.abs(st.batVy) < 0.5) {
            st.perching = true;
            st.batVx = 0;
            st.batVy = 0;
            // Regenerate energy while perching
            st.energy = Math.min(ENERGY_MAX, st.energy + PERCH_REGEN);
          } else {
            st.perching = false;
          }

          if (!st.perching) {
            // Gravity
            st.batVy += GRAVITY;
            if (st.batVy > MAX_FALL_SPEED) st.batVy = MAX_FALL_SPEED;

            // Horizontal movement
            var hAccel = sp.speed * 60;
            if (goLeft) { st.batVx -= hAccel * dt; st.facing = -1; }
            if (goRight) { st.batVx += hAccel * dt; st.facing = 1; }

            // Flap thrust (only if energy > 0)
            if (isFlapping && st.energy > 0) {
              st.batVy += FLAP_IMPULSE * dt * 60;
              st.energy -= sp.energyDrain;
              st.flapPhase += dt * 20; // fast wing flap
            } else if (isDiving) {
              st.batVy += 2 * dt * 60;
              st.flapPhase += dt * 2; // wings folded
            } else {
              st.flapPhase += dt * 4; // gentle glide
            }

            // Energy drain from flight
            if (Math.abs(st.batVx) > 1 || Math.abs(st.batVy) > 1) {
              st.energy -= sp.energyDrain * 0.3;
            }
            st.energy = Math.max(0, st.energy);

            // Air friction
            st.batVx *= AIR_FRICTION;
            st.batVy *= AIR_FRICTION;

            // If no energy, can only glide down
            if (st.energy <= 0) {
              if (st.batVy < 0) st.batVy *= 0.5; // can't flap up
            }

            st.batX = clamp(st.batX + st.batVx * dt, 30, 770);
            st.batY = clamp(st.batY + st.batVy * dt, 30, 470);
          }

          // Pulse cooldown timer
          if (st.pulseCooldownTimer > 0) st.pulseCooldownTimer--;
          // Moth evasion message timer
          if (st.mothEvasionTimer > 0) st.mothEvasionTimer--;
          // Sonar jam timer
          if (st.sonarJamTimer > 0) st.sonarJamTimer--;
          if (st.sonarJamTimer <= 0) st.sonarJammed = false;

          // Move moths (with improved AI)
          scene.objects.forEach(function(obj) {
            if (obj.type === 'moth' && obj.moving) moveMoth(obj, dt);
          });

          // Update stalactite drips
          st.drips.forEach(function(drip) {
            if (!drip.active) {
              drip.timer -= dt;
              if (drip.timer <= 0) {
                drip.active = true;
                drip.vy = 0;
                drip.currentY = drip.y;
              }
            } else {
              drip.vy += 2;
              drip.currentY += drip.vy * dt;
              if (drip.currentY > 480) {
                drip.active = false;
                drip.timer = 3 + Math.random() * 6;
                drip.ripple = 8;
                drip.rippleX = drip.x;
                drip.rippleY = 480;
              }
            }
            if (drip.ripple > 0) drip.ripple -= dt * 8;
          });

          // Update pulses & check hits
          var nearestDist = 999;
          for (var pi = st.pulses.length - 1; pi >= 0; pi--) {
            var pulse = st.pulses[pi];
            pulse.radius += PULSE_SPEED;
            if (pulse.radius >= pulse.maxRadius) {
              st.pulses.splice(pi, 1);
              continue;
            }
            // If sonar is jammed, add static noise instead of clean echoes
            if (st.sonarJammed) {
              for (var jj = 0; jj < 3; jj++) {
                var jx = st.batX + (Math.random() - 0.5) * pulse.radius * 2;
                var jy = st.batY + (Math.random() - 0.5) * pulse.radius * 2;
                bufCtx.fillStyle = 'rgba(255,100,100,' + (Math.random() * 0.3) + ')';
                bufCtx.beginPath();
                bufCtx.arc(jx, jy, 2 + Math.random() * 3, 0, Math.PI * 2);
                bufCtx.fill();
              }
            }
            var hits = checkPulseHits(pulse);
            hits.forEach(function(hit) {
              var dist = Math.sqrt((hit.x - st.batX) * (hit.x - st.batX) + (hit.y - st.batY) * (hit.y - st.batY));
              if (dist < nearestDist) nearestDist = dist;
              var brightness = Math.min(1, hit.reflectivity / (1 + dist * dist / 40000));
              if (st.sonarJammed) brightness *= 0.3;

              // Draw echo on sonar buffer
              var echoColor;
              if (hit.material === 'rock' || hit.material === 'concrete' || hit.material === 'earth') {
                echoColor = 'rgba(165,180,252,' + brightness + ')';
              } else if (hit.material === 'water') {
                echoColor = 'rgba(96,165,250,' + (brightness * 0.6) + ')';
              } else if (hit.material === 'soft') {
                echoColor = 'rgba(251,191,36,' + (brightness * 0.5) + ')';
              } else if (hit.material === 'wood') {
                echoColor = 'rgba(180,140,100,' + (brightness * 0.7) + ')';
              } else if (hit.material === 'light') {
                echoColor = 'rgba(255,255,200,' + (brightness * 0.3) + ')';
              } else if (hit.material === 'organic') {
                echoColor = 'rgba(200,180,120,' + (brightness * 0.5) + ')';
              } else if (hit.material === 'silk') {
                echoColor = 'rgba(200,200,220,' + (brightness * 0.15) + ')';
              } else {
                echoColor = 'rgba(200,200,200,' + (brightness * 0.2) + ')';
              }

              bufCtx.fillStyle = echoColor;
              // Draw at the hit point based on type
              if (hit.obj && hit.obj.type === 'moth') {
                bufCtx.beginPath();
                bufCtx.arc(hit.x, hit.y, hit.obj.radius + 2, 0, Math.PI * 2);
                bufCtx.fill();
                // Moth evasion
                mothEvade(hit.obj);
              } else if (hit.obj && hit.obj.type === 'fruit') {
                bufCtx.beginPath();
                bufCtx.arc(hit.x, hit.y, hit.obj.radius + 2, 0, Math.PI * 2);
                bufCtx.fill();
              } else if (hit.obj && (hit.obj.type === 'building' || hit.obj.type === 'rock' || hit.obj.type === 'tree')) {
                bufCtx.fillRect(hit.obj.x, hit.obj.y, hit.obj.width, hit.obj.height);
              } else if (hit.obj && (hit.obj.type === 'stalactite' || hit.obj.type === 'stalagmite')) {
                bufCtx.beginPath();
                if (hit.obj.type === 'stalactite') {
                  bufCtx.moveTo(hit.obj.x, hit.obj.y);
                  bufCtx.lineTo(hit.obj.x + hit.obj.width, hit.obj.y);
                  bufCtx.lineTo(hit.obj.x + hit.obj.width / 2, hit.obj.y + hit.obj.height);
                } else {
                  bufCtx.moveTo(hit.obj.x, hit.obj.y + hit.obj.height);
                  bufCtx.lineTo(hit.obj.x + hit.obj.width, hit.obj.y + hit.obj.height);
                  bufCtx.lineTo(hit.obj.x + hit.obj.width / 2, hit.obj.y);
                }
                bufCtx.fill();
              } else if (hit.obj && hit.obj.type === 'water') {
                bufCtx.fillRect(hit.obj.x, hit.obj.y, hit.obj.width, hit.obj.height);
              } else if (hit.obj && hit.obj.type === 'web') {
                // Very faint web echo
                drawSpiderWeb(bufCtx, hit.obj.x, hit.obj.y, hit.obj.width, hit.obj.height, brightness * 0.3);
              } else if (hit.obj && hit.obj.type === 'colony') {
                // Bat colony cluster
                bufCtx.fillStyle = 'rgba(251,191,36,' + (brightness * 0.4) + ')';
                for (var bc = 0; bc < 8; bc++) {
                  var bcx = hit.obj.x + Math.random() * hit.obj.width;
                  var bcy = hit.obj.y + Math.random() * hit.obj.height;
                  bufCtx.beginPath();
                  bufCtx.arc(bcx, bcy, 3, 0, Math.PI * 2);
                  bufCtx.fill();
                }
              } else if (hit.obj && hit.obj.type === 'vine') {
                bufCtx.fillRect(hit.obj.x, hit.obj.y, hit.obj.width, hit.obj.height);
              } else {
                bufCtx.beginPath();
                bufCtx.arc(hit.x, hit.y, 5, 0, Math.PI * 2);
                bufCtx.fill();
              }

              // Track discoveries
              if (hit.id && !st.discoveredIds[hit.id]) {
                st.discoveredIds[hit.id] = true;
                st.discoveredCount++;
                var typeLabel = hit.type || 'unknown';
                if (hit.type === 'colony') typeLabel = 'bat colony';
                if (hit.type === 'passage') typeLabel = 'hidden passage';
                if (hit.type === 'web') typeLabel = 'spider web';
                srAnnounce('Object discovered: ' + typeLabel + ' at distance ' + Math.round(dist) + ' pixels');
                if (typeof beep === 'function') {
                  try { beep(1200, 0.05, 0.1); } catch(e) {}
                }
                // Hidden chamber discovery
                if (hit.type === 'passage' && !st.hiddenChamberFound) {
                  st.hiddenChamberFound = true;
                  if (addToast) addToast('\uD83D\uDD73\uFE0F Hidden passage discovered! A narrow gap leads to a secret chamber...', 'success');
                  if (typeof awardXP === 'function') awardXP(15);
                }
              }

              // Prey catching
              var catchR = sp.catchRadius || 20;
              if (hit.type === 'moth' && !isFrug && dist < catchR) {
                var mtype = MOTH_TYPES[hit.obj.mothType] || MOTH_TYPES.regular;
                st.mothsCaught++;
                st.energy = Math.min(ENERGY_MAX, st.energy + (mtype.energyValue || ENERGY_CATCH_BONUS));
                var mObj = hit.obj;
                mObj.x = 100 + Math.random() * 600;
                mObj.y = 80 + Math.random() * 340;
                var newCount = (d.mothsCaught || 0) + 1;
                upd('mothsCaught', newCount);
                var mtLabel = mtype.label || 'Moth';
                if (addToast) addToast('\uD83E\uDD8B ' + mtLabel + ' ' + sp.catchVerb + '! (' + newCount + '/10) +' + (mtype.energyValue || 15) + ' energy', 'success');
                if (typeof awardXP === 'function') awardXP(5);
                if (newCount >= 10 && typeof celebrate === 'function') celebrate();
                srAnnounce(mtLabel + ' caught! Total: ' + newCount);
              }
              if (hit.type === 'fruit' && isFrug && dist < catchR) {
                st.fruitCollected++;
                st.energy = Math.min(ENERGY_MAX, st.energy + ENERGY_CATCH_BONUS);
                var fObj = hit.obj;
                var ftName = (FRUIT_TYPES[fObj.fruitType] || FRUIT_TYPES.mango).name;
                fObj.x = 100 + Math.random() * 600;
                fObj.y = 80 + Math.random() * 340;
                var newFCount = (d.fruitCollected || 0) + 1;
                upd('fruitCollected', newFCount);
                if (addToast) addToast('\uD83C\uDF4C ' + ftName + ' ' + sp.catchVerb + '! (' + newFCount + '/10) +15 energy', 'success');
                if (typeof awardXP === 'function') awardXP(5);
                if (newFCount >= 10 && typeof celebrate === 'function') celebrate();
                srAnnounce(ftName + ' collected! Total: ' + newFCount);
              }
            });
          }
          st.nearestDist = nearestDist;

          // Clarity score
          if (st.totalObjects > 0) {
            st.clarity = (st.discoveredCount / st.totalObjects) * 100;
          }

          // Cave mapped check
          if (sceneIdx === 0 && st.clarity >= 80 && !d.caveMapped) {
            upd('caveMapped', true);
            if (addToast) addToast('\uD83D\uDDFA\uFE0F Cave mapped! Quest complete!', 'success');
            if (typeof celebrate === 'function') celebrate();
            if (typeof awardXP === 'function') awardXP(25);
            srAnnounce('Cave mapped! Quest complete!');
          }

          // Fade sonar buffer
          bufCtx.fillStyle = 'rgba(0,0,0,0.03)';
          bufCtx.fillRect(0, 0, 800, 500);

          // ── RENDER ──
          gfx.fillStyle = scene.bg || '#0a0a1a';
          gfx.fillRect(0, 0, 800, 500);

          // Draw streetlights glow in urban scene
          scene.objects.forEach(function(obj) {
            if (obj.type === 'light') {
              var grad = gfx.createRadialGradient(obj.x, obj.y, 0, obj.x, obj.y, obj.radius);
              grad.addColorStop(0, 'rgba(255,200,100,0.15)');
              grad.addColorStop(1, 'rgba(255,200,100,0)');
              gfx.fillStyle = grad;
              gfx.beginPath();
              gfx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
              gfx.fill();
            }
          });

          // Draw fruit glow for frugivore (night vision)
          if (isFrug) {
            scene.objects.forEach(function(obj) {
              if (obj.type === 'fruit') {
                drawFruit(gfx, obj.x, obj.y, obj.radius, obj.fruitType, 0.6);
              }
            });
          }

          // Draw stalactite drips
          st.drips.forEach(function(drip) {
            if (drip.active) {
              gfx.fillStyle = 'rgba(100,160,255,0.5)';
              gfx.beginPath();
              gfx.arc(drip.x, drip.currentY, 2, 0, Math.PI * 2);
              gfx.fill();
            }
            if (drip.ripple > 0) {
              var ripAlpha = drip.ripple / 8;
              gfx.strokeStyle = 'rgba(100,160,255,' + (ripAlpha * 0.4) + ')';
              gfx.lineWidth = 1;
              gfx.beginPath();
              gfx.arc(drip.rippleX, drip.rippleY, (8 - drip.ripple) * 3, 0, Math.PI * 2);
              gfx.stroke();
            }
          });

          // Draw sonar buffer (the persistent echo image)
          gfx.drawImage(sonarBufferRef.current, 0, 0);

          // Draw active pulses
          st.pulses.forEach(function(p) {
            drawSonarPulse(gfx, p.x, p.y, p.radius, p.maxRadius, true);
          });

          // Draw bat with species-appropriate size and color
          var batSize = sp.size ? sp.size * 2 : 18;
          drawBat(gfx, st.batX, st.batY, batSize, st.flapPhase, st.facing, true);

          // Perching indicator
          if (st.perching) {
            gfx.fillStyle = 'rgba(250,204,21,0.4)';
            gfx.font = '8px system-ui';
            gfx.textAlign = 'center';
            gfx.fillText('Perching... \u26A1+' + PERCH_REGEN + '/frame', st.batX, st.batY + batSize + 10);
          }

          // Bat glow effect
          var batGrad = gfx.createRadialGradient(st.batX, st.batY, 0, st.batX, st.batY, 25);
          batGrad.addColorStop(0, 'rgba(165,180,252,0.15)');
          batGrad.addColorStop(1, 'rgba(165,180,252,0)');
          gfx.fillStyle = batGrad;
          gfx.beginPath();
          gfx.arc(st.batX, st.batY, 25, 0, Math.PI * 2);
          gfx.fill();

          // Energy bar on canvas HUD
          gfx.fillStyle = 'rgba(0,0,0,0.5)';
          gfx.fillRect(10, 10, 104, 12);
          var eColor = st.energy > 30 ? '#f59e0b' : '#ef4444';
          gfx.fillStyle = eColor;
          gfx.fillRect(12, 12, st.energy, 8);
          gfx.fillStyle = 'rgba(255,255,255,0.7)';
          gfx.font = '8px system-ui';
          gfx.textAlign = 'left';
          gfx.fillText('\u26A1 ' + Math.round(st.energy) + '%', 14, 19);

          // Species label
          gfx.fillStyle = 'rgba(255,255,255,0.4)';
          gfx.font = '8px system-ui';
          gfx.textAlign = 'right';
          gfx.fillText(sp.emoji + ' ' + sp.name, 790, 19);

          sonarAnimRef.current = requestAnimationFrame(animate);
        }

        sonarAnimRef.current = requestAnimationFrame(animate);

        return function() {
          running = false;
          if (sonarAnimRef.current) cancelAnimationFrame(sonarAnimRef.current);
          window.removeEventListener('keydown', onKey);
          window.removeEventListener('keyup', onKey);
        };
      }, [tab, sceneIdx, selectedPlayableSpecies]);


      // ═════════════════════════════════════════
      // TAB 2: SOUND WAVE PHYSICS
      // ═════════════════════════════════════════
      var waveCanvasRef = useRef(null);
      var waveAnimRef = useRef(null);
      var distCalcCanvasRef = useRef(null);
      var distCalcAnimRef = useRef(null);
      var reflCanvasRef = useRef(null);
      var reflAnimRef = useRef(null);
      var invSqCanvasRef = useRef(null);

      var waveFreq = typeof d.waveFreq === 'number' ? d.waveFreq : 440;
      var waveAmp = typeof d.waveAmp === 'number' ? d.waveAmp : 0.7;
      var waveMedium = d.waveMedium || 'air';
      var wallMaterial = d.wallMaterial || 'concrete';
      var distCalcDist = typeof d.distCalcDist === 'number' ? d.distCalcDist : 50;
      var distCalcMedium = d.distCalcMedium || 'air';
      var distPulseActive = d.distPulseActive || false;
      var distPulseProgress = typeof d.distPulseProgress === 'number' ? d.distPulseProgress : 0;

      function getSpeedOfSound(medium) {
        if (medium === 'water') return SPEED_OF_SOUND_WATER;
        if (medium === 'steel') return SPEED_OF_SOUND_STEEL;
        return SPEED_OF_SOUND_AIR;
      }

      function renderWavesTab() {
        var speedOfSound = getSpeedOfSound(waveMedium);
        var wavelength = speedOfSound / Math.max(1, waveFreq);
        var period = 1 / Math.max(1, waveFreq);
        var isAudible = waveFreq >= 20 && waveFreq <= 18000;
        var isBatRange = waveFreq >= 20000 && waveFreq <= 200000;

        return h('div', { className: 'space-y-4' },
          // Wave Visualizer
          h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-white border border-slate-200') },
            h('div', { className: 'flex items-center gap-2 mb-3' },
              h('span', { className: 'text-xl' }, '\uD83C\uDF0A'),
              h('span', { className: 'text-sm font-bold ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, 'Wave Visualizer')),
            h('canvas', {
              ref: waveCanvasRef,
              width: 700,
              height: 180,
              role: 'img',
              'aria-label': 'Sound wave visualization showing a sine wave at ' + waveFreq + ' hertz with wavelength ' + wavelength.toFixed(3) + ' meters',
              tabIndex: 0,
              onKeyDown: function(e) {
                if (e.key === 'ArrowRight') { e.preventDefault(); upd('waveFreq', Math.min(200000, waveFreq + 100)); }
                if (e.key === 'ArrowLeft') { e.preventDefault(); upd('waveFreq', Math.max(20, waveFreq - 100)); }
              },
              style: { width: '100%', height: 'auto', borderRadius: '8px', display: 'block', background: isDark ? '#0f172a' : '#f8fafc' }
            }),
            // Controls
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3' },
              // Frequency slider
              h('div', null,
                h('label', { className: 'text-[10px] font-bold ' + (isDark ? 'text-indigo-300' : 'text-slate-600') }, 'Frequency: ' + waveFreq.toLocaleString() + ' Hz' +
                  (isBatRange ? ' \uD83E\uDD87 Bat range!' : isAudible ? ' \uD83D\uDC42 Audible' : waveFreq < 20 ? ' \uD83D\uDC33 Infrasonic' : ' Beyond ultrasonic')),
                h('input', {
                  type: 'range', min: 20, max: 200000, value: waveFreq, step: 10,
                  'aria-label': 'Frequency slider, ' + waveFreq + ' hertz',
                  onChange: function(e) { upd('waveFreq', parseInt(e.target.value)); },
                  className: 'w-full accent-indigo-500'
                }),
                h('div', { className: 'flex justify-between text-[8px] ' + (isDark ? 'text-slate-500' : 'text-slate-400') },
                  h('span', null, '20 Hz'),
                  h('span', { className: 'text-green-500' }, '\u2190 Audible \u2192'),
                  h('span', { className: 'text-purple-500' }, '\u2190 Bat range \u2192'),
                  h('span', null, '200 kHz'))
              ),
              // Amplitude slider
              h('div', null,
                h('label', { className: 'text-[10px] font-bold ' + (isDark ? 'text-indigo-300' : 'text-slate-600') }, 'Amplitude: ' + (waveAmp * 100).toFixed(0) + '%'),
                h('input', {
                  type: 'range', min: 0, max: 100, value: Math.round(waveAmp * 100), step: 1,
                  'aria-label': 'Amplitude slider, ' + Math.round(waveAmp * 100) + ' percent',
                  onChange: function(e) { upd('waveAmp', parseInt(e.target.value) / 100); },
                  className: 'w-full accent-indigo-500'
                })
              )
            ),
            // Play tone button
            isAudible ? h('button', {
              'aria-label': 'Play tone at ' + waveFreq + ' hertz',
              onClick: function() {
                if (typeof beep === 'function') {
                  try { beep(Math.min(waveFreq, 18000), 0.5, waveAmp * 0.3); } catch(e) {}
                }
              },
              className: 'mt-2 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500'
            }, '\uD83D\uDD0A Play Tone (' + waveFreq + ' Hz)') : h('div', { className: 'mt-2 text-[10px] italic ' + (isDark ? 'text-slate-500' : 'text-slate-400') },
              waveFreq < 20 ? '\uD83D\uDC33 This frequency is infrasonic \u2014 too low for human hearing (below 20 Hz)' :
              '\uD83E\uDD87 This frequency is ultrasonic \u2014 above human hearing! Bats can hear this, but we cannot.'),
            // Properties readout
            h('div', { className: 'grid grid-cols-3 gap-2 mt-3' },
              h('div', { className: 'text-center p-2 rounded-lg ' + (isDark ? 'bg-slate-700/50' : 'bg-slate-100') },
                h('div', { className: 'text-xs font-black ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, wavelength < 1 ? (wavelength * 100).toFixed(1) + ' cm' : wavelength.toFixed(2) + ' m'),
                h('div', { className: 'text-[9px] ' + (isDark ? 'text-slate-400' : 'text-slate-600') }, 'Wavelength')),
              h('div', { className: 'text-center p-2 rounded-lg ' + (isDark ? 'bg-slate-700/50' : 'bg-slate-100') },
                h('div', { className: 'text-xs font-black ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, period < 0.001 ? (period * 1000000).toFixed(1) + ' \u00B5s' : (period * 1000).toFixed(2) + ' ms'),
                h('div', { className: 'text-[9px] ' + (isDark ? 'text-slate-400' : 'text-slate-600') }, 'Period')),
              h('div', { className: 'text-center p-2 rounded-lg ' + (isDark ? 'bg-slate-700/50' : 'bg-slate-100') },
                h('div', { className: 'text-xs font-black ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, speedOfSound + ' m/s'),
                h('div', { className: 'text-[9px] ' + (isDark ? 'text-slate-400' : 'text-slate-600') }, 'Speed (' + waveMedium + ')'))
            )
          ),

          // Speed of Sound Calculator
          h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-white border border-slate-200') },
            h('div', { className: 'flex items-center gap-2 mb-3' },
              h('span', { className: 'text-xl' }, '\uD83D\uDCCF'),
              h('span', { className: 'text-sm font-bold ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, 'Speed of Sound Calculator')),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3' },
              // Distance
              h('div', null,
                h('label', { className: 'text-[10px] font-bold ' + (isDark ? 'text-indigo-300' : 'text-slate-600') }, 'Distance to object: ' + distCalcDist + ' m'),
                h('input', {
                  type: 'range', min: 1, max: 200, value: distCalcDist, step: 1,
                  'aria-label': 'Distance to object, ' + distCalcDist + ' meters',
                  onChange: function(e) { upd('distCalcDist', parseInt(e.target.value)); },
                  className: 'w-full accent-indigo-500'
                })),
              // Medium
              h('div', null,
                h('label', { className: 'text-[10px] font-bold ' + (isDark ? 'text-indigo-300' : 'text-slate-600') }, 'Medium'),
                h('div', { className: 'flex gap-1 mt-1' },
                  ['air', 'water', 'steel'].map(function(m) {
                    return h('button', {
                      key: m, 'aria-label': m + ' medium' + (distCalcMedium === m ? ', selected' : ''),
                      'aria-pressed': distCalcMedium === m ? 'true' : 'false',
                      onClick: function() { upd('distCalcMedium', m); },
                      className: 'px-2 py-1 rounded text-[10px] font-bold ' + (distCalcMedium === m
                        ? 'bg-indigo-600 text-white'
                        : (isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'))
                    }, m.charAt(0).toUpperCase() + m.slice(1));
                  })
                )),
              // Emit button
              h('div', { className: 'flex items-end' },
                h('button', {
                  'aria-label': 'Emit pulse to calculate round trip time',
                  onClick: function() { updMulti({ distPulseActive: true, distPulseProgress: 0 }); },
                  className: 'px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500'
                }, '\uD83D\uDD0A Emit Pulse'))
            ),
            // Calculation display
            (function() {
              var spd = getSpeedOfSound(distCalcMedium);
              var roundTrip = (distCalcDist * 2) / spd;
              return h('div', { className: 'p-3 rounded-lg ' + (isDark ? 'bg-indigo-900/30 border border-indigo-800/40' : 'bg-indigo-50 border border-indigo-200') },
                h('div', { className: 'text-xs font-mono text-center ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') },
                  'distance = (speed \u00D7 time) / 2'),
                h('div', { className: 'text-xs font-mono text-center mt-1 ' + (isDark ? 'text-indigo-200' : 'text-indigo-800') },
                  distCalcDist + ' m = (' + spd + ' m/s \u00D7 ' + (roundTrip * 1000).toFixed(2) + ' ms) / 2'),
                h('div', { className: 'text-center mt-2 text-[10px] ' + (isDark ? 'text-slate-400' : 'text-slate-600') },
                  'Round-trip time: ' + (roundTrip * 1000).toFixed(2) + ' ms' +
                  ' | Speed in ' + distCalcMedium + ': ' + spd + ' m/s')
              );
            })()
          ),

          // Reflection vs Absorption
          h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-white border border-slate-200') },
            h('div', { className: 'flex items-center gap-2 mb-3' },
              h('span', { className: 'text-xl' }, '\uD83E\uDDF1'),
              h('span', { className: 'text-sm font-bold ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, 'Reflection vs Absorption')),
            h('div', { className: 'flex gap-2 mb-3 flex-wrap' },
              WALL_MATERIALS.map(function(mat) {
                var active = wallMaterial === mat.id;
                return h('button', {
                  key: mat.id, 'aria-label': mat.label + ', ' + Math.round(mat.reflection * 100) + ' percent reflection' + (active ? ', selected' : ''),
                  'aria-pressed': active ? 'true' : 'false',
                  onClick: function() { upd('wallMaterial', mat.id); },
                  className: 'px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ' + (active
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                    : (isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'))
                }, mat.label + ' (' + Math.round(mat.reflection * 100) + '%)');
              })
            ),
            h('canvas', {
              ref: reflCanvasRef,
              width: 700,
              height: 150,
              role: 'img',
              'aria-label': 'Sound reflection visualization showing incident and reflected waves off ' + wallMaterial + ' wall',
              tabIndex: 0,
              onKeyDown: function(e) {
                if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  var idx = WALL_MATERIALS.findIndex(function(m) { return m.id === wallMaterial; });
                  upd('wallMaterial', WALL_MATERIALS[(idx + 1) % WALL_MATERIALS.length].id);
                }
              },
              style: { width: '100%', height: 'auto', borderRadius: '8px', display: 'block', background: isDark ? '#0f172a' : '#f8fafc' }
            }),
            (function() {
              var mat = WALL_MATERIALS.find(function(m) { return m.id === wallMaterial; }) || WALL_MATERIALS[0];
              var absorbed = Math.round((1 - mat.reflection) * 100);
              return h('div', { className: 'mt-2 text-[10px] ' + (isDark ? 'text-slate-400' : 'text-slate-600') },
                '\uD83D\uDD0A ' + Math.round(mat.reflection * 100) + '% reflected, ' + absorbed + '% absorbed. ' +
                (wallMaterial === 'foam' ? 'This is why recording studios use acoustic foam \u2014 and why bats prefer caves (strong echoes from rock)!' :
                 wallMaterial === 'concrete' ? 'Hard surfaces like concrete create strong, sharp echoes \u2014 perfect for echolocation.' :
                 wallMaterial === 'carpet' ? 'Soft surfaces absorb most sound energy. Bats would have a hard time "seeing" carpet!' :
                 'Wood reflects moderate amounts of sound. Trees in forests create complex echo patterns for bats.')
              );
            })()
          ),

          // Inverse Square Law
          h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-white border border-slate-200') },
            h('div', { className: 'flex items-center gap-2 mb-3' },
              h('span', { className: 'text-xl' }, '\uD83D\uDCC9'),
              h('span', { className: 'text-sm font-bold ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, 'Inverse Square Law')),
            h('canvas', {
              ref: invSqCanvasRef,
              width: 700,
              height: 160,
              role: 'img',
              'aria-label': 'Inverse square law visualization showing sound intensity decreasing with distance. Intensity equals 1 over distance squared.',
              tabIndex: 0,
              onKeyDown: function() {},
              style: { width: '100%', height: 'auto', borderRadius: '8px', display: 'block', background: isDark ? '#0f172a' : '#f8fafc' }
            }),
            h('div', { className: 'mt-2 p-3 rounded-lg ' + (isDark ? 'bg-indigo-900/30 border border-indigo-800/40' : 'bg-indigo-50 border border-indigo-200') },
              h('div', { className: 'text-xs font-mono text-center ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') },
                'Intensity \u221D 1 / r\u00B2'),
              h('div', { className: 'text-[10px] text-center mt-1 ' + (isDark ? 'text-slate-400' : 'text-slate-600') },
                'This is why bats must fly close to objects \u2014 the echo gets 4x weaker when distance doubles!')
            )
          ),

          // How Echolocation Works Step-by-Step
          h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-white border border-slate-200') },
            h('div', { className: 'flex items-center gap-2 mb-3' },
              h('span', { className: 'text-xl' }, '\uD83E\uDD87'),
              h('span', { className: 'text-sm font-bold ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, 'How Echolocation Works \u2014 Step by Step')),
            h('div', { className: 'space-y-2' },
              [
                { step: 1, title: 'Emit', desc: 'The bat contracts its laryngeal muscles to produce an ultrasonic pulse (20-200 kHz). Some species call through their mouth; others through elaborate nose structures that focus the beam. Each pulse lasts only 1-5 milliseconds.', icon: '\uD83D\uDD0A' },
                { step: 2, title: 'Propagate', desc: 'The sound wave travels outward at 343 m/s (in air). At 50 kHz, the wavelength is only 6.9 mm \u2014 small enough to reflect off tiny insects. Higher frequencies give better resolution but shorter range.', icon: '\u27A1\uFE0F' },
                { step: 3, title: 'Reflect', desc: 'When the pulse hits an object, some energy bounces back as an echo. Hard surfaces (rock, chitin) reflect strongly. Soft surfaces (fur, carpet) absorb most energy. The object\'s shape affects the echo pattern.', icon: '\u21A9\uFE0F' },
                { step: 4, title: 'Receive', desc: 'The bat\'s oversized ears collect the faint echo. The tragus (inner ear flap) helps determine vertical direction. The time delay between the two ears (interaural time difference) provides horizontal direction.', icon: '\uD83D\uDC42' },
                { step: 5, title: 'Process', desc: 'The bat\'s auditory cortex extracts information from the echo in milliseconds: distance (from delay), size (from echo strength), shape (from echo pattern), texture (from frequency content), and speed (from Doppler shift).', icon: '\uD83E\uDDE0' },
                { step: 6, title: 'Update', desc: 'The bat adjusts its next pulse based on what it learned. Approaching prey? Increase pulse rate (buzz phase: up to 200/sec). Open space? Lower rate to conserve energy. This adaptive behavior is called "acoustic gaze control."', icon: '\uD83D\uDD04' }
              ].map(function(s) {
                return h('div', { key: s.step, className: 'flex gap-3 p-2 rounded-lg ' + (isDark ? 'bg-slate-700/30' : 'bg-slate-50') },
                  h('div', { className: 'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black bg-indigo-600 text-white' }, s.step),
                  h('div', null,
                    h('div', { className: 'text-xs font-bold ' + (isDark ? 'text-indigo-200' : 'text-indigo-800') }, s.icon + ' ' + s.title),
                    h('p', { className: 'text-[10px] ' + (isDark ? 'text-slate-400' : 'text-slate-600') }, s.desc))
                );
              })
            )
          ),

          // Key Formulas Reference Card
          h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-white border border-slate-200') },
            h('div', { className: 'flex items-center gap-2 mb-3' },
              h('span', { className: 'text-xl' }, '\uD83D\uDCD0'),
              h('span', { className: 'text-sm font-bold ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, 'Key Formulas \u2014 Sound Physics Reference')),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
              [
                { name: 'Wave Speed', formula: 'v = f \u00D7 \u03BB', desc: 'Speed = frequency times wavelength. In air at 20\u00B0C, v = 343 m/s.' },
                { name: 'Echolocation Distance', formula: 'd = (v \u00D7 t) / 2', desc: 'Distance to object = speed of sound times round-trip time, divided by 2 (sound travels there AND back).' },
                { name: 'Doppler Shift', formula: 'f\' = f(v \u00B1 v_r) / (v \u00B1 v_s)', desc: 'Observed frequency changes when source or receiver moves. Approaching = higher pitch, receding = lower pitch.' },
                { name: 'Inverse Square Law', formula: 'I \u221D 1/r\u00B2', desc: 'Sound intensity decreases with the square of distance. Double the distance = quarter the intensity.' },
                { name: 'Wavelength', formula: '\u03BB = v / f', desc: 'Wavelength determines resolution. A 50 kHz bat call in air has \u03BB = 6.9 mm \u2014 perfect for detecting insects.' },
                { name: 'Interaural Time Diff', formula: '\u0394t = d \u00D7 sin\u03B8 / v', desc: 'Time difference between ears. For a bat with 2 cm ear spacing, max \u0394t \u2248 58 microseconds.' }
              ].map(function(f, fi) {
                return h('div', { key: fi, className: 'p-3 rounded-lg ' + (isDark ? 'bg-indigo-900/20 border border-indigo-800/30' : 'bg-indigo-50 border border-indigo-200') },
                  h('div', { className: 'text-[10px] font-bold ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, f.name),
                  h('div', { className: 'text-sm font-mono font-black my-1 ' + (isDark ? 'text-indigo-200' : 'text-indigo-800') }, f.formula),
                  h('p', { className: 'text-[9px] ' + (isDark ? 'text-slate-400' : 'text-slate-600') }, f.desc));
              })
            )
          ),

          // Sound Technology Applications
          h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-white border border-slate-200') },
            h('div', { className: 'flex items-center gap-2 mb-3' },
              h('span', { className: 'text-xl' }, '\uD83D\uDEE0\uFE0F'),
              h('span', { className: 'text-sm font-bold ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, 'Sound in the Real World \u2014 Technology Inspired by Nature')),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
              [
                { icon: '\uD83D\uDEA2', title: 'Naval SONAR', desc: 'Submarines use active sonar (emit a "ping" and listen for echoes) exactly like bats. Passive sonar just listens for engine noise. SONAR stands for Sound Navigation And Ranging.', year: '1910s' },
                { icon: '\uD83C\uDFE5', title: 'Medical Ultrasound', desc: 'Ultrasound imaging sends 1-20 MHz pulses into the body and builds images from echoes. The same physics as echolocation, just at higher frequencies and through tissue instead of air.', year: '1950s' },
                { icon: '\uD83D\uDE97', title: 'Parking Sensors', desc: 'Cars use ultrasonic sensors (40 kHz) to detect obstacles \u2014 a direct application of bat echolocation principles. The "beeping" speeds up as you get closer, mimicking a bat\'s buzz phase!', year: '1990s' },
                { icon: '\uD83E\uDD16', title: 'Autonomous Robots', desc: 'Robot vacuum cleaners and drones use ultrasonic rangefinders to navigate. Engineers study bat flight algorithms to improve autonomous navigation in cluttered environments.', year: '2000s' },
                { icon: '\uD83C\uDFD7\uFE0F', title: 'Non-Destructive Testing', desc: 'Engineers send ultrasonic pulses through metal bridges, airplane wings, and pipelines to detect internal cracks. The echo pattern reveals hidden flaws before catastrophic failure.', year: '1940s' },
                { icon: '\uD83D\uDC69\u200D\uD83E\uDDAF', title: 'Assistive Technology', desc: 'Ultrasonic canes and wearable devices help blind individuals navigate by converting sonar echoes into vibrations or audio tones \u2014 giving humans a form of echolocation.', year: '2010s' }
              ].map(function(app, ai) {
                return h('div', { key: ai, className: 'p-3 rounded-lg ' + (isDark ? 'bg-slate-700/40 border border-slate-600/30' : 'bg-slate-50 border border-slate-200') },
                  h('div', { className: 'flex items-center justify-between mb-1' },
                    h('div', { className: 'flex items-center gap-2' },
                      h('span', { className: 'text-lg' }, app.icon),
                      h('span', { className: 'text-xs font-bold ' + (isDark ? 'text-indigo-200' : 'text-indigo-800') }, app.title)),
                    h('span', { className: 'text-[8px] px-2 py-0.5 rounded-full ' + (isDark ? 'bg-indigo-900/50 text-indigo-400' : 'bg-indigo-100 text-indigo-600') }, app.year)),
                  h('p', { className: 'text-[10px] ' + (isDark ? 'text-slate-400' : 'text-slate-600') }, app.desc));
              })
            ),
            h('div', { className: 'mt-2 text-[10px] italic text-center ' + (isDark ? 'text-indigo-400' : 'text-indigo-600') },
              'Nature invented sonar 52 million years before humans. Nearly every sonar technology we\'ve built was inspired by \u2014 or directly copied from \u2014 biological echolocation.')
          ),

          // Human Echolocation
          h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-purple-900/20 border border-purple-800/30' : 'bg-purple-50 border border-purple-200') },
            h('div', { className: 'flex items-center gap-2 mb-2' },
              h('span', { className: 'text-xl' }, '\uD83D\uDC64'),
              h('span', { className: 'text-sm font-bold ' + (isDark ? 'text-purple-300' : 'text-purple-800') }, 'Human Echolocation \u2014 Yes, People Can Do This!')),
            h('p', { className: 'text-[10px] ' + (isDark ? 'text-purple-200' : 'text-purple-700') },
              'Some blind individuals have learned to echolocate by making tongue clicks and listening to the echoes. Daniel Kish, known as "the real-life Batman," can ride a bicycle through traffic using only tongue-click echolocation. Brain scans show that human echolocators process echo information in the VISUAL cortex \u2014 their brains literally "see" with sound, repurposing the visual processing centers.'),
            h('div', { className: 'mt-2 text-[10px] ' + (isDark ? 'text-purple-300' : 'text-purple-600') },
              'Research shows that anyone can learn basic echolocation with practice. The key is producing consistent clicks and learning to interpret the subtle differences in echo timing, loudness, and frequency that indicate object size, distance, and material.')
          )
        );
      }

      // Wave visualizer animation
      useEffect(function() {
        if (tab !== 'waves') return;
        var canvas = waveCanvasRef.current;
        if (!canvas) return;
        var gfx = canvas.getContext('2d');
        var running = true;
        var phase = 0;

        function animate() {
          if (!running) return;
          phase += 0.05;
          var W = canvas.width;
          var H = canvas.height;
          gfx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
          gfx.fillRect(0, 0, W, H);

          // Grid lines
          gfx.strokeStyle = isDark ? 'rgba(148,163,184,0.1)' : 'rgba(148,163,184,0.2)';
          gfx.lineWidth = 1;
          for (var gy = 0; gy <= H; gy += 30) {
            gfx.beginPath(); gfx.moveTo(0, gy); gfx.lineTo(W, gy); gfx.stroke();
          }

          // Frequency range markers
          var midY = H / 2;
          gfx.strokeStyle = isDark ? 'rgba(74,222,128,0.3)' : 'rgba(34,197,94,0.3)';
          gfx.setLineDash([4, 4]);
          gfx.beginPath(); gfx.moveTo(0, midY - 2); gfx.lineTo(W, midY - 2); gfx.stroke();
          gfx.setLineDash([]);

          // Draw wave
          var color = freqToColor(waveFreq);
          gfx.strokeStyle = color;
          gfx.lineWidth = 2.5;
          gfx.beginPath();
          var freqScale = Math.min(waveFreq / 500, 20);
          for (var x = 0; x < W; x++) {
            var y = midY + Math.sin((x / W) * freqScale * Math.PI * 2 + phase) * (H * 0.35 * waveAmp);
            if (x === 0) gfx.moveTo(x, y);
            else gfx.lineTo(x, y);
          }
          gfx.stroke();

          // Ultrasonic dashed overlay
          if (waveFreq > 18000) {
            gfx.strokeStyle = 'rgba(168,85,247,0.4)';
            gfx.setLineDash([3, 5]);
            gfx.lineWidth = 1;
            gfx.beginPath();
            for (var x2 = 0; x2 < W; x2++) {
              var y2 = midY + Math.sin((x2 / W) * freqScale * Math.PI * 2 + phase) * (H * 0.35 * waveAmp);
              if (x2 === 0) gfx.moveTo(x2, y2);
              else gfx.lineTo(x2, y2);
            }
            gfx.stroke();
            gfx.setLineDash([]);
            gfx.fillStyle = 'rgba(168,85,247,0.6)';
            gfx.font = '10px system-ui';
            gfx.textAlign = 'center';
            gfx.fillText('Beyond human hearing', W / 2, H - 10);
          }

          // Labels
          gfx.fillStyle = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
          gfx.font = '9px system-ui';
          gfx.textAlign = 'left';
          gfx.fillText(waveFreq.toLocaleString() + ' Hz', 8, 14);
          gfx.textAlign = 'right';
          gfx.fillText('Amplitude: ' + Math.round(waveAmp * 100) + '%', W - 8, 14);

          waveAnimRef.current = requestAnimationFrame(animate);
        }

        waveAnimRef.current = requestAnimationFrame(animate);
        return function() { running = false; if (waveAnimRef.current) cancelAnimationFrame(waveAnimRef.current); };
      }, [tab, waveFreq, waveAmp, isDark]);

      // Reflection canvas
      useEffect(function() {
        if (tab !== 'waves') return;
        var canvas = reflCanvasRef.current;
        if (!canvas) return;
        var gfx = canvas.getContext('2d');
        var running = true;
        var phase = 0;

        var mat = WALL_MATERIALS.find(function(m) { return m.id === wallMaterial; }) || WALL_MATERIALS[0];

        function animate() {
          if (!running) return;
          phase += 0.04;
          var W = canvas.width;
          var H = canvas.height;
          gfx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
          gfx.fillRect(0, 0, W, H);

          var wallX = W * 0.75;
          var midY = H / 2;

          // Wall
          gfx.fillStyle = mat.color;
          gfx.fillRect(wallX, 0, W - wallX, H);
          gfx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
          gfx.font = 'bold 10px system-ui';
          gfx.textAlign = 'center';
          gfx.save();
          gfx.translate(wallX + (W - wallX) / 2, midY);
          gfx.rotate(-Math.PI / 2);
          gfx.fillText(mat.label, 0, 4);
          gfx.restore();

          // Sound source
          gfx.fillStyle = '#6366f1';
          gfx.beginPath();
          gfx.arc(40, midY, 10, 0, Math.PI * 2);
          gfx.fill();
          gfx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
          gfx.font = '9px system-ui';
          gfx.textAlign = 'center';
          gfx.fillText('Source', 40, midY + 22);

          // Incident wave (moving right)
          gfx.strokeStyle = '#6366f1';
          gfx.lineWidth = 2;
          gfx.beginPath();
          for (var x = 60; x < wallX; x++) {
            var y = midY + Math.sin((x - 60) * 0.04 - phase * 3) * 25;
            if (x === 60) gfx.moveTo(x, y);
            else gfx.lineTo(x, y);
          }
          gfx.stroke();

          // Reflected wave (moving left, reduced amplitude)
          var refAmp = 25 * mat.reflection;
          if (refAmp > 1) {
            gfx.strokeStyle = '#f97316';
            gfx.lineWidth = 2;
            gfx.beginPath();
            for (var rx = wallX - 5; rx > 60; rx--) {
              var ry = midY + Math.sin((wallX - rx) * 0.04 - phase * 3) * refAmp;
              if (rx === wallX - 5) gfx.moveTo(rx, ry);
              else gfx.lineTo(rx, ry);
            }
            gfx.stroke();
          }

          // Labels
          gfx.fillStyle = '#6366f1';
          gfx.font = '9px system-ui';
          gfx.textAlign = 'center';
          gfx.fillText('Incident wave (100%)', (60 + wallX) / 2, 15);
          gfx.fillStyle = '#f97316';
          gfx.fillText('Reflected (' + Math.round(mat.reflection * 100) + '%)', (60 + wallX) / 2, H - 8);

          reflAnimRef.current = requestAnimationFrame(animate);
        }

        reflAnimRef.current = requestAnimationFrame(animate);
        return function() { running = false; if (reflAnimRef.current) cancelAnimationFrame(reflAnimRef.current); };
      }, [tab, wallMaterial, isDark]);

      // Inverse square law canvas (static)
      useEffect(function() {
        if (tab !== 'waves') return;
        var canvas = invSqCanvasRef.current;
        if (!canvas) return;
        var gfx = canvas.getContext('2d');
        var W = canvas.width;
        var H = canvas.height;

        gfx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
        gfx.fillRect(0, 0, W, H);

        // Source
        gfx.fillStyle = '#6366f1';
        gfx.beginPath();
        gfx.arc(50, H / 2, 12, 0, Math.PI * 2);
        gfx.fill();
        gfx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
        gfx.font = '9px system-ui';
        gfx.textAlign = 'center';
        gfx.fillText('Sound', 50, H / 2 + 24);

        // Expanding circles
        var distances = [1, 2, 3, 4, 5];
        distances.forEach(function(d2) {
          var r = d2 * 50;
          var cx = 50;
          var intensity = 1 / (d2 * d2);
          var alpha = Math.max(0.05, intensity * 0.8);
          gfx.strokeStyle = 'rgba(99,102,241,' + alpha + ')';
          gfx.lineWidth = Math.max(1, intensity * 4);
          gfx.beginPath();
          gfx.arc(cx, H / 2, r, -0.8, 0.8);
          gfx.stroke();

          // Intensity label
          gfx.fillStyle = isDark ? 'rgba(165,180,252,' + Math.max(0.3, alpha) + ')' : 'rgba(99,102,241,' + Math.max(0.3, alpha) + ')';
          gfx.font = '9px system-ui';
          gfx.textAlign = 'center';
          gfx.fillText(Math.round(intensity * 100) + '%', cx + r, 12);
          gfx.fillText(d2 + 'x', cx + r, H - 8);
        });

        // Graph on right side
        var graphX = W * 0.55;
        var graphW = W * 0.4;
        var graphH = H * 0.7;
        var graphY = (H - graphH) / 2;

        gfx.strokeStyle = isDark ? 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.5)';
        gfx.lineWidth = 1;
        gfx.strokeRect(graphX, graphY, graphW, graphH);

        // Curve
        gfx.strokeStyle = '#f97316';
        gfx.lineWidth = 2;
        gfx.beginPath();
        for (var gx = 0; gx < graphW; gx++) {
          var dist = 0.5 + (gx / graphW) * 5;
          var val = 1 / (dist * dist);
          var py = graphY + graphH - val * graphH;
          if (gx === 0) gfx.moveTo(graphX + gx, py);
          else gfx.lineTo(graphX + gx, py);
        }
        gfx.stroke();

        // Axis labels
        gfx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        gfx.font = '8px system-ui';
        gfx.textAlign = 'center';
        gfx.fillText('Distance \u2192', graphX + graphW / 2, graphY + graphH + 14);
        gfx.save();
        gfx.translate(graphX - 12, graphY + graphH / 2);
        gfx.rotate(-Math.PI / 2);
        gfx.fillText('Intensity \u2192', 0, 0);
        gfx.restore();
        gfx.fillText('I = 1/r\u00B2', graphX + graphW / 2, graphY - 6);
      }, [tab, isDark]);


      // ═════════════════════════════════════════
      // TAB 3: DOPPLER EFFECT LAB
      // ═════════════════════════════════════════
      var dopplerCanvasRef = useRef(null);
      var dopplerAnimRef = useRef(null);
      var dopplerStateRef = useRef({
        time: 0, waves: [], emitTimer: 0
      });

      var mothSpeed = typeof d.mothSpeed === 'number' ? d.mothSpeed : 0;
      var dopplerFreq = typeof d.dopplerFreq === 'number' ? d.dopplerFreq : 40000;
      var dopplerCorrect = d.dopplerCorrect || 0;
      var dopplerQuizActive = d.dopplerQuizActive || false;
      var dopplerQuizDir = d.dopplerQuizDir || null;
      var dopplerQuizAnswer = d.dopplerQuizAnswer || null;
      var dopplerQuizFeedback = d.dopplerQuizFeedback || '';
      var dopplerQuizTotal = d.dopplerQuizTotal || 0;

      function renderDopplerTab() {
        var shiftedFreq = dopplerFreq;
        if (mothSpeed !== 0) {
          // Doppler formula: f' = f * (v + vr) / (v + vs) simplified for 1D
          var v = 343; // speed of sound
          shiftedFreq = Math.round(dopplerFreq * (v / (v + mothSpeed * 10)));
        }
        var freqDiff = shiftedFreq - dopplerFreq;

        return h('div', { className: 'space-y-4' },
          // Doppler Simulator
          h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-white border border-slate-200') },
            h('div', { className: 'flex items-center gap-2 mb-3' },
              h('span', { className: 'text-xl' }, '\uD83D\uDEA8'),
              h('span', { className: 'text-sm font-bold ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, 'Doppler Effect Simulator')),
            h('canvas', {
              ref: dopplerCanvasRef,
              width: 700,
              height: 280,
              role: 'img',
              'aria-label': 'Doppler effect visualization. A bat emits sound waves toward a moth. The moth is ' +
                (mothSpeed === 0 ? 'stationary' : mothSpeed < 0 ? 'moving toward the bat' : 'moving away from the bat') +
                '. Received frequency: ' + shiftedFreq + ' hertz.',
              tabIndex: 0,
              onKeyDown: function(e) {
                if (e.key === 'ArrowRight') { e.preventDefault(); upd('mothSpeed', Math.min(10, mothSpeed + 1)); }
                if (e.key === 'ArrowLeft') { e.preventDefault(); upd('mothSpeed', Math.max(-10, mothSpeed - 1)); }
              },
              style: { width: '100%', height: 'auto', borderRadius: '8px', display: 'block', background: '#0a0a1a' }
            }),
            // Controls
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3' },
              h('div', null,
                h('label', { className: 'text-[10px] font-bold ' + (isDark ? 'text-indigo-300' : 'text-slate-600') },
                  'Moth speed: ' + mothSpeed + (mothSpeed < 0 ? ' (toward bat)' : mothSpeed > 0 ? ' (away from bat)' : ' (stationary)')),
                h('input', {
                  type: 'range', min: -10, max: 10, value: mothSpeed, step: 1,
                  'aria-label': 'Moth speed slider',
                  onChange: function(e) { upd('mothSpeed', parseInt(e.target.value)); },
                  className: 'w-full accent-indigo-500'
                })),
              h('div', null,
                h('label', { className: 'text-[10px] font-bold ' + (isDark ? 'text-indigo-300' : 'text-slate-600') },
                  'Emitted frequency: ' + (dopplerFreq / 1000).toFixed(0) + ' kHz'),
                h('input', {
                  type: 'range', min: 20000, max: 100000, value: dopplerFreq, step: 1000,
                  'aria-label': 'Emitted frequency slider',
                  onChange: function(e) { upd('dopplerFreq', parseInt(e.target.value)); },
                  className: 'w-full accent-indigo-500'
                }))
            ),
            // Frequency readout
            h('div', { className: 'grid grid-cols-3 gap-2 mt-3' },
              h('div', { className: 'text-center p-2 rounded-lg ' + (isDark ? 'bg-slate-700/50' : 'bg-slate-100') },
                h('div', { className: 'text-xs font-black text-indigo-400' }, (dopplerFreq / 1000).toFixed(1) + ' kHz'),
                h('div', { className: 'text-[9px] ' + (isDark ? 'text-slate-400' : 'text-slate-600') }, 'Emitted')),
              h('div', { className: 'text-center p-2 rounded-lg ' + (isDark ? 'bg-slate-700/50' : 'bg-slate-100') },
                h('div', { className: 'text-xs font-black ' + (freqDiff > 0 ? 'text-blue-400' : freqDiff < 0 ? 'text-red-400' : 'text-slate-400') }, (shiftedFreq / 1000).toFixed(1) + ' kHz'),
                h('div', { className: 'text-[9px] ' + (isDark ? 'text-slate-400' : 'text-slate-600') }, 'Received')),
              h('div', { className: 'text-center p-2 rounded-lg ' + (isDark ? 'bg-slate-700/50' : 'bg-slate-100') },
                h('div', { className: 'text-xs font-black ' + (freqDiff > 0 ? 'text-blue-400' : freqDiff < 0 ? 'text-red-400' : 'text-slate-400') },
                  (freqDiff >= 0 ? '+' : '') + (freqDiff / 1000).toFixed(1) + ' kHz'),
                h('div', { className: 'text-[9px] ' + (isDark ? 'text-slate-400' : 'text-slate-600') }, 'Shift'))
            ),
            // Hear It button (scaled to audible)
            h('button', {
              'aria-label': 'Play Doppler shifted tone at audible frequency',
              onClick: function() {
                if (typeof beep === 'function') {
                  var audible = Math.max(200, Math.min(4000, shiftedFreq / 10));
                  try { beep(audible, 0.4, 0.2); } catch(e) {}
                }
              },
              className: 'mt-2 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500'
            }, '\uD83D\uDD0A Hear It (scaled to audible)')
          ),

          // Doppler Quiz Challenge
          h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-white border border-slate-200') },
            h('div', { className: 'flex items-center justify-between mb-3' },
              h('div', { className: 'flex items-center gap-2' },
                h('span', { className: 'text-xl' }, '\uD83C\uDFAF'),
                h('span', { className: 'text-sm font-bold ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, 'Doppler Challenge')),
              h('span', { className: 'text-xs font-bold ' + (isDark ? 'text-indigo-400' : 'text-indigo-600') },
                'Score: ' + dopplerCorrect + '/5 ' + (dopplerCorrect >= 5 ? '\u2713 Quest complete!' : ''))
            ),
            !dopplerQuizActive ? h('button', {
              'aria-label': 'Start Doppler challenge quiz',
              onClick: function() {
                var dirs = ['toward', 'away', 'sideways'];
                var dir = dirs[Math.floor(Math.random() * dirs.length)];
                updMulti({ dopplerQuizActive: true, dopplerQuizDir: dir, dopplerQuizAnswer: null, dopplerQuizFeedback: '' });
              },
              className: 'px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500'
            }, '\uD83E\uDD87 New Challenge') : h('div', { className: 'space-y-3' },
              h('p', { className: 'text-xs ' + (isDark ? 'text-slate-300' : 'text-slate-600') },
                'A moth is moving. Based on the wave pattern, which direction is it going?'),
              h('div', { className: 'text-center text-sm mb-2 ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') },
                dopplerQuizDir === 'toward' ? '\uD83C\uDF0A Waves are COMPRESSED (bunched together)' :
                dopplerQuizDir === 'away' ? '\uD83C\uDF0A Waves are STRETCHED (spread apart)' :
                '\uD83C\uDF0A Waves look NORMAL (no compression or stretching)'),
              h('div', { className: 'flex gap-2 justify-center' },
                ['toward', 'away', 'sideways'].map(function(dir) {
                  var isAnswer = dopplerQuizAnswer === dir;
                  var isCorrect = dir === dopplerQuizDir;
                  var showResult = dopplerQuizAnswer !== null;
                  return h('button', {
                    key: dir,
                    'aria-label': 'Guess: moth moving ' + dir + (showResult ? (isCorrect ? ', correct answer' : '') : ''),
                    disabled: showResult,
                    onClick: function() {
                      var correct = dir === dopplerQuizDir;
                      var newCorrectCount = dopplerCorrect;
                      var newTotal = dopplerQuizTotal + 1;
                      if (correct) {
                        newCorrectCount++;
                        if (typeof awardXP === 'function') awardXP(10);
                        if (newCorrectCount >= 5 && typeof celebrate === 'function') celebrate();
                      }
                      updMulti({
                        dopplerQuizAnswer: dir,
                        dopplerQuizFeedback: correct ? 'Correct! ' + (dopplerQuizDir === 'toward' ? 'Approaching objects compress the echo \u2014 higher frequency.' : dopplerQuizDir === 'away' ? 'Receding objects stretch the echo \u2014 lower frequency.' : 'Perpendicular motion doesn\'t change the frequency significantly.') : 'Not quite. The correct answer was: ' + dopplerQuizDir + '.',
                        dopplerCorrect: newCorrectCount,
                        dopplerQuizTotal: newTotal
                      });
                      srAnnounce(correct ? 'Correct!' : 'Incorrect. The answer was ' + dopplerQuizDir);
                    },
                    className: 'px-4 py-2 rounded-lg text-xs font-bold transition-all ' +
                      (showResult
                        ? (isCorrect ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : isAnswer ? 'bg-red-600 text-white' : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-400'))
                        : 'bg-indigo-600 text-white hover:bg-indigo-500')
                  }, dir === 'toward' ? '\u2B05\uFE0F Toward' : dir === 'away' ? '\u27A1\uFE0F Away' : '\u2195\uFE0F Sideways');
                })
              ),
              dopplerQuizFeedback ? h('div', { className: 'text-xs p-2 rounded-lg ' + (dopplerQuizAnswer === dopplerQuizDir ? (isDark ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-50 text-emerald-700') : (isDark ? 'bg-red-900/40 text-red-300' : 'bg-red-50 text-red-700')) },
                dopplerQuizFeedback) : null,
              dopplerQuizAnswer ? h('button', {
                'aria-label': 'Try another Doppler challenge',
                onClick: function() {
                  var dirs = ['toward', 'away', 'sideways'];
                  var dir = dirs[Math.floor(Math.random() * dirs.length)];
                  updMulti({ dopplerQuizDir: dir, dopplerQuizAnswer: null, dopplerQuizFeedback: '' });
                },
                className: 'px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500'
              }, 'Next Challenge \u2192') : null
            )
          ),

          // Real-world examples
          h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-white border border-slate-200') },
            h('div', { className: 'text-sm font-bold mb-3 ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, '\uD83C\uDF0D Real-World Doppler'),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
              [
                { icon: '\uD83D\uDE91', title: 'Ambulance Siren', desc: 'The classic example: the siren sounds higher-pitched as it approaches and lower as it moves away. The sound waves literally compress and stretch.' },
                { icon: '\uD83C\uDF29\uFE0F', title: 'Doppler Weather Radar', desc: 'Radar stations send microwave pulses at clouds. The frequency shift of the reflected signal tells meteorologists the speed and direction of wind and precipitation.' },
                { icon: '\uD83E\uDD87', title: 'Bat Hunting: Buzz Phase', desc: 'As a bat closes in on prey, it increases pulse rate from ~10/sec to 200/sec. The Doppler shift of each echo tells the bat exactly how fast the moth is moving.' },
                { icon: '\uD83C\uDFE5', title: 'Medical Ultrasound', desc: 'Doctors use Doppler ultrasound to measure blood flow velocity. The frequency shift of echoes from moving blood cells reveals the speed and direction of blood flow.' }
              ].map(function(ex, i) {
                return h('div', { key: i, className: 'p-3 rounded-lg ' + (isDark ? 'bg-slate-700/40 border border-slate-600/30' : 'bg-slate-50 border border-slate-200') },
                  h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', { className: 'text-lg' }, ex.icon),
                    h('span', { className: 'text-xs font-bold ' + (isDark ? 'text-indigo-200' : 'text-indigo-800') }, ex.title)),
                  h('p', { className: 'text-[10px] ' + (isDark ? 'text-slate-400' : 'text-slate-600') }, ex.desc));
              })
            )
          ),

          // Bat Hunting Strategies
          h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-white border border-slate-200') },
            h('div', { className: 'flex items-center gap-2 mb-3' },
              h('span', { className: 'text-xl' }, '\uD83C\uDFAF'),
              h('span', { className: 'text-sm font-bold ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, 'Bat Hunting Strategy \u2014 The Three Phases')),
            h('p', { className: 'text-[10px] mb-3 ' + (isDark ? 'text-slate-400' : 'text-slate-600') },
              'A bat\'s echolocation strategy changes dramatically during a hunt. Scientists divide the attack into three phases based on pulse rate:'),
            h('div', { className: 'space-y-2' },
              [
                { phase: 'Search Phase', rate: '5-10 pulses/sec', desc: 'The bat cruises through its territory, emitting slow, long-range pulses. Each call is wide-beam to scan a large area. Calls are long (10-20 ms) and spaced far apart to avoid overlap between outgoing pulse and returning echo. The bat is listening for any hint of prey.', color: isDark ? 'bg-sky-900/40 border-sky-700/40' : 'bg-sky-50 border-sky-200', textColor: isDark ? 'text-sky-300' : 'text-sky-700' },
                { phase: 'Approach Phase', rate: '20-50 pulses/sec', desc: 'Prey detected! The bat narrows its sonar beam toward the target and increases pulse rate. Calls get shorter (5-10 ms) and higher frequency for better resolution. The bat is now tracking the moth\'s evasive maneuvers, adjusting its flight path with each echo.', color: isDark ? 'bg-amber-900/40 border-amber-700/40' : 'bg-amber-50 border-amber-200', textColor: isDark ? 'text-amber-300' : 'text-amber-700' },
                { phase: 'Terminal Buzz', rate: '100-200 pulses/sec', desc: 'The final attack! Pulse rate skyrockets to 200/sec \u2014 the fastest muscle contractions in any mammal. Calls are now ultra-short (0.5-1 ms). The bat gets a near-continuous stream of position updates, like switching from photographs to live video. Catch rate: ~40-50% of attempts succeed.', color: isDark ? 'bg-red-900/40 border-red-700/40' : 'bg-red-50 border-red-200', textColor: isDark ? 'text-red-300' : 'text-red-700' }
              ].map(function(p, pi) {
                return h('div', { key: pi, className: 'p-3 rounded-lg border ' + p.color },
                  h('div', { className: 'flex items-center justify-between mb-1' },
                    h('span', { className: 'text-xs font-bold ' + p.textColor }, p.phase),
                    h('span', { className: 'text-[10px] font-mono ' + p.textColor }, p.rate)),
                  h('p', { className: 'text-[10px] ' + (isDark ? 'text-slate-400' : 'text-slate-600') }, p.desc)
                );
              })
            ),
            h('div', { className: 'mt-3 text-[10px] italic ' + (isDark ? 'text-indigo-400' : 'text-indigo-600') },
              'Moth counter-strategies: Some moths have ears that detect bat sonar and trigger evasive dives. Others (tiger moths) emit their own ultrasonic clicks that "jam" bat sonar \u2014 acoustic warfare in the night sky!')
          ),

          // Moth Types & Anti-Predator Adaptations
          h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-amber-900/20 border border-amber-800/30' : 'bg-amber-50 border border-amber-200') },
            h('div', { className: 'flex items-center gap-2 mb-3' },
              h('span', { className: 'text-xl' }, '\uD83E\uDD8B'),
              h('span', { className: 'text-sm font-bold ' + (isDark ? 'text-amber-300' : 'text-amber-800') }, 'Moth Types & Anti-Predator Adaptations')),
            h('p', { className: 'text-[10px] mb-3 ' + (isDark ? 'text-amber-200' : 'text-amber-700') },
              'The evolutionary arms race between bats and moths has produced remarkable adaptations on both sides. In the simulator, you encounter four moth types, each based on real species:'),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
              [
                { type: 'Regular Moth', emoji: '\uD83E\uDD8B', color: isDark ? 'bg-slate-700/40' : 'bg-white',
                  desc: 'Standard moths with basic flight patterns. Some have evolved tympanic organs (ears) on their thorax that detect bat ultrasound, triggering evasive dives and loops.',
                  stat: '40% evasion chance | Normal speed | +15 energy' },
                { type: 'Tiger Moth', emoji: '\uD83E\uDD8B', color: isDark ? 'bg-orange-900/30' : 'bg-orange-50',
                  desc: 'Tiger moths produce their own ultrasonic clicks that JAM bat sonar! They emit rapid trains of clicks that interfere with the bat\'s ability to process echoes \u2014 like a biological radar jammer. Some species also use these clicks to warn bats that they taste bad (aposematism).',
                  stat: '30% evasion + 50% sonar jamming | Slower | +15 energy' },
                { type: 'Luna Moth', emoji: '\uD83E\uDD8B', color: isDark ? 'bg-emerald-900/30' : 'bg-emerald-50',
                  desc: 'Luna moths are large, beautiful moths with long tail streamers. Research shows these tails confuse bat sonar by creating echo signatures that misdirect the bat\'s attack \u2014 the bat strikes the tail instead of the body. They are worth more energy when caught.',
                  stat: '20% evasion | Slow & large | +25 energy' },
                { type: 'Mosquito Swarm', emoji: '\uD83E\uDD9F', color: isDark ? 'bg-slate-700/40' : 'bg-slate-100',
                  desc: 'Tiny, fast-moving targets that cluster together. While individual mosquitoes are hard to echolocate due to their small size, bats use a rapid-fire "buzz phase" approach to track them. Little brown bats can catch 1,000 mosquitoes per hour!',
                  stat: '15% evasion | Fast & tiny | +10 energy' }
              ].map(function(m, mi) {
                return h('div', { key: mi, className: 'p-3 rounded-lg border ' + m.color + ' ' + (isDark ? 'border-slate-600/30' : 'border-slate-200') },
                  h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', { className: 'text-lg' }, m.emoji),
                    h('span', { className: 'text-xs font-bold ' + (isDark ? 'text-slate-200' : 'text-slate-800') }, m.type)),
                  h('p', { className: 'text-[10px] ' + (isDark ? 'text-slate-400' : 'text-slate-600') }, m.desc),
                  h('div', { className: 'mt-1 text-[9px] font-mono ' + (isDark ? 'text-indigo-400' : 'text-indigo-600') }, m.stat)
                );
              })
            ),
            h('div', { className: 'mt-3 p-2 rounded-lg ' + (isDark ? 'bg-amber-900/30' : 'bg-amber-100') },
              h('div', { className: 'text-[10px] font-bold ' + (isDark ? 'text-amber-300' : 'text-amber-700') }, '\uD83E\uDDEC Evolutionary Arms Race'),
              h('p', { className: 'text-[9px] ' + (isDark ? 'text-amber-200' : 'text-amber-800') },
                'This bat-moth conflict has been raging for 65+ million years. As bats evolved better sonar, moths evolved ears. As moths evolved ears, some bats evolved "stealth" echolocation (quieter calls). As some bats went quiet, tiger moths evolved sonar jamming. The arms race continues! This is a textbook example of co-evolution driven by predator-prey dynamics.')
            )
          ),

          // Fruit Foraging Biology (for frugivore context)
          h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-emerald-900/20 border border-emerald-800/30' : 'bg-emerald-50 border border-emerald-200') },
            h('div', { className: 'flex items-center gap-2 mb-3' },
              h('span', { className: 'text-xl' }, '\uD83C\uDF4C'),
              h('span', { className: 'text-sm font-bold ' + (isDark ? 'text-emerald-300' : 'text-emerald-800') }, 'Fruit Bat Foraging \u2014 A Different Strategy')),
            h('p', { className: 'text-[10px] mb-3 ' + (isDark ? 'text-emerald-200' : 'text-emerald-700') },
              'While insectivorous bats are aerial hunters, fruit bats use a completely different foraging strategy. In the simulator\'s frugivore mode, you experience how Egyptian fruit bats navigate:'),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
              h('div', { className: 'p-3 rounded-lg ' + (isDark ? 'bg-emerald-900/30' : 'bg-emerald-100') },
                h('div', { className: 'text-[10px] font-bold mb-1 ' + (isDark ? 'text-emerald-200' : 'text-emerald-800') }, '\uD83D\uDC41\uFE0F Night Vision'),
                h('p', { className: 'text-[9px] ' + (isDark ? 'text-emerald-300' : 'text-emerald-700') },
                  'Fruit bats have large eyes with a high density of rod cells, giving them excellent low-light vision. In the simulator, ripe fruit glows faintly even without sonar pulses \u2014 simulating this visual advantage.')),
              h('div', { className: 'p-3 rounded-lg ' + (isDark ? 'bg-emerald-900/30' : 'bg-emerald-100') },
                h('div', { className: 'text-[10px] font-bold mb-1 ' + (isDark ? 'text-emerald-200' : 'text-emerald-800') }, '\uD83D\uDC43 Smell'),
                h('p', { className: 'text-[9px] ' + (isDark ? 'text-emerald-300' : 'text-emerald-700') },
                  'In reality, fruit bats locate ripe fruit primarily through smell. Ripe mangoes, figs, and guavas emit strong volatile compounds that bats can detect from hundreds of meters away.')),
              h('div', { className: 'p-3 rounded-lg ' + (isDark ? 'bg-emerald-900/30' : 'bg-emerald-100') },
                h('div', { className: 'text-[10px] font-bold mb-1 ' + (isDark ? 'text-emerald-200' : 'text-emerald-800') }, '\uD83D\uDD0A Tongue Clicks'),
                h('p', { className: 'text-[9px] ' + (isDark ? 'text-emerald-300' : 'text-emerald-700') },
                  'Egyptian fruit bats produce echolocation clicks with their tongue, not their larynx. These clicks are lower intensity and broader beam than insectivore sonar \u2014 good for obstacle avoidance but not precise enough for catching insects.')),
              h('div', { className: 'p-3 rounded-lg ' + (isDark ? 'bg-emerald-900/30' : 'bg-emerald-100') },
                h('div', { className: 'text-[10px] font-bold mb-1 ' + (isDark ? 'text-emerald-200' : 'text-emerald-800') }, '\uD83C\uDF31 Seed Dispersal'),
                h('p', { className: 'text-[9px] ' + (isDark ? 'text-emerald-300' : 'text-emerald-700') },
                  'Fruit bats are critical for tropical ecosystems. They eat fruit and deposit seeds far from the parent tree. A single fruit bat can disperse thousands of seeds per night, making them essential for forest regeneration.'))
            ),
            h('div', { className: 'mt-2 text-[9px] italic ' + (isDark ? 'text-emerald-400' : 'text-emerald-600') },
              'Over 500 plant species depend on bat pollination or seed dispersal, including mangoes, bananas, agave (tequila!), and durian. Without fruit bats, many tropical foods would not exist.')
          ),

          // Doppler Math Explainer
          h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-white border border-slate-200') },
            h('div', { className: 'flex items-center gap-2 mb-3' },
              h('span', { className: 'text-xl' }, '\uD83D\uDCDD'),
              h('span', { className: 'text-sm font-bold ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, 'The Math Behind the Doppler Effect')),
            h('div', { className: 'space-y-3' },
              h('div', { className: 'p-3 rounded-lg text-center ' + (isDark ? 'bg-indigo-900/30' : 'bg-indigo-50') },
                h('div', { className: 'text-sm font-mono font-bold ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') },
                  'f\' = f \u00D7 (v + v_receiver) / (v + v_source)'),
                h('div', { className: 'text-[9px] mt-1 ' + (isDark ? 'text-indigo-400' : 'text-indigo-600') },
                  'f = emitted frequency, v = speed of sound (343 m/s), v_r = receiver velocity, v_s = source velocity')),
              h('div', { className: 'text-[10px] ' + (isDark ? 'text-slate-400' : 'text-slate-600') },
                h('strong', null, 'For a bat hunting a moth: '), 'The bat is both the source (emitting) and receiver (listening to echoes). If the moth is flying toward the bat at 5 m/s:'),
              h('div', { className: 'p-2 rounded font-mono text-[10px] ' + (isDark ? 'bg-slate-700/40 text-indigo-300' : 'bg-slate-100 text-indigo-700') },
                'Outgoing: f\' = 50,000 \u00D7 (343 + 5) / 343 = 50,729 Hz',
                h('br'),
                'Reflected: f\'\' = 50,729 \u00D7 (343) / (343 - 5) = 51,479 Hz',
                h('br'),
                'Total Doppler shift: +1,479 Hz (+2.96%)'),
              h('p', { className: 'text-[10px] ' + (isDark ? 'text-slate-400' : 'text-slate-600') },
                'The bat detects this +1,479 Hz shift and knows the moth is approaching. The larger the shift, the faster the moth is moving. Sideways motion produces no Doppler shift \u2014 only the radial component matters.')
            )
          )
        );
      }

      // Doppler canvas animation
      useEffect(function() {
        if (tab !== 'doppler') return;
        var canvas = dopplerCanvasRef.current;
        if (!canvas) return;
        var gfx = canvas.getContext('2d');
        var running = true;
        var dSt = dopplerStateRef.current;
        dSt.waves = [];
        dSt.emitTimer = 0;

        var batX = 100;
        var batY = 140;
        var mothBaseX = 550;
        var mothY = 140;
        var flapPhase = 0;
        var mothPhase = 0;

        function animate(now) {
          if (!running) return;
          flapPhase += 0.12;
          mothPhase += 0.08;
          dSt.time += 1 / 60;
          dSt.emitTimer += 1 / 60;

          var W = canvas.width;
          var H = canvas.height;

          // Moth position
          var mothX = mothBaseX + Math.sin(dSt.time * 0.5) * mothSpeed * 15;

          // Emit waves periodically from bat
          if (dSt.emitTimer > 0.15) {
            dSt.emitTimer = 0;
            dSt.waves.push({ x: batX + 30, y: batY, r: 0, type: 'emit' });
          }

          // Check for reflections
          for (var wi = dSt.waves.length - 1; wi >= 0; wi--) {
            var w = dSt.waves[wi];
            w.r += 2.5;
            if (w.r > 500) {
              dSt.waves.splice(wi, 1);
              continue;
            }
            // Emit wave hitting moth -> create reflected wave
            if (w.type === 'emit' && !w.reflected) {
              var distToMoth = Math.sqrt((w.x - mothX) * (w.x - mothX) + (w.y - mothY) * (w.y - mothY));
              if (w.r >= distToMoth - 10) {
                w.reflected = true;
                dSt.waves.push({ x: mothX, y: mothY, r: 0, type: 'reflect' });
              }
            }
          }

          // Render
          gfx.fillStyle = '#0a0a1a';
          gfx.fillRect(0, 0, W, H);

          // Grid
          gfx.strokeStyle = 'rgba(99,102,241,0.06)';
          gfx.lineWidth = 1;
          for (var gridY = 0; gridY < H; gridY += 40) {
            gfx.beginPath(); gfx.moveTo(0, gridY); gfx.lineTo(W, gridY); gfx.stroke();
          }

          // Draw waves
          dSt.waves.forEach(function(w) {
            var alpha = Math.max(0, 1 - w.r / 400) * 0.5;
            if (w.type === 'emit') {
              gfx.strokeStyle = 'rgba(99,102,241,' + alpha + ')';
            } else {
              // Reflected waves: color shift based on Doppler
              if (mothSpeed < 0) gfx.strokeStyle = 'rgba(96,165,250,' + alpha + ')'; // blue shift
              else if (mothSpeed > 0) gfx.strokeStyle = 'rgba(239,68,68,' + alpha + ')'; // red shift
              else gfx.strokeStyle = 'rgba(249,115,22,' + alpha + ')'; // neutral
            }
            gfx.lineWidth = 1.5;
            gfx.beginPath();
            gfx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
            gfx.stroke();
          });

          // Draw bat
          drawBat(gfx, batX, batY, 16, flapPhase, 1, true);
          gfx.fillStyle = '#a5b4fc';
          gfx.font = 'bold 9px system-ui';
          gfx.textAlign = 'center';
          gfx.fillText('BAT', batX, batY + 30);

          // Draw moth
          drawMoth(gfx, mothX, mothY, 10, mothPhase);
          gfx.fillStyle = '#fbbf24';
          gfx.font = 'bold 9px system-ui';
          gfx.textAlign = 'center';
          gfx.fillText('MOTH', mothX, mothY + 25);

          // Direction arrow
          if (mothSpeed !== 0) {
            gfx.strokeStyle = mothSpeed < 0 ? '#60a5fa' : '#ef4444';
            gfx.lineWidth = 2;
            gfx.beginPath();
            var arrowDir = mothSpeed < 0 ? -1 : 1;
            gfx.moveTo(mothX - 15 * arrowDir, mothY - 25);
            gfx.lineTo(mothX + 20 * arrowDir, mothY - 25);
            gfx.lineTo(mothX + 15 * arrowDir, mothY - 30);
            gfx.moveTo(mothX + 20 * arrowDir, mothY - 25);
            gfx.lineTo(mothX + 15 * arrowDir, mothY - 20);
            gfx.stroke();
          }

          // Frequency info overlay
          gfx.fillStyle = 'rgba(0,0,0,0.6)';
          gfx.fillRect(10, H - 60, 200, 50);
          gfx.fillStyle = '#a5b4fc';
          gfx.font = '10px system-ui';
          gfx.textAlign = 'left';
          gfx.fillText('Emitted: ' + (dopplerFreq / 1000).toFixed(0) + ' kHz', 18, H - 42);
          var shFreq = dopplerFreq;
          if (mothSpeed !== 0) shFreq = Math.round(dopplerFreq * (343 / (343 + mothSpeed * 10)));
          gfx.fillStyle = mothSpeed < 0 ? '#60a5fa' : mothSpeed > 0 ? '#ef4444' : '#f97316';
          gfx.fillText('Received: ' + (shFreq / 1000).toFixed(1) + ' kHz', 18, H - 25);

          // Legend
          gfx.fillStyle = 'rgba(255,255,255,0.3)';
          gfx.font = '8px system-ui';
          gfx.textAlign = 'right';
          gfx.fillText(mothSpeed < 0 ? 'Blue-shifted: higher frequency (compressed)' : mothSpeed > 0 ? 'Red-shifted: lower frequency (stretched)' : 'No Doppler shift (stationary)', W - 10, H - 10);

          dopplerAnimRef.current = requestAnimationFrame(animate);
        }

        dopplerAnimRef.current = requestAnimationFrame(animate);
        return function() { running = false; if (dopplerAnimRef.current) cancelAnimationFrame(dopplerAnimRef.current); };
      }, [tab, mothSpeed, dopplerFreq]);


      // ═════════════════════════════════════════
      // TAB 4: BAT BIOLOGY & HABITAT
      // ═════════════════════════════════════════
      var selectedAnatomyPart = d.selectedAnatomyPart || null;
      var selectedSpecies = typeof d.selectedSpecies === 'number' ? d.selectedSpecies : null;
      var bioSection = d.bioSection || 'anatomy'; // 'anatomy' | 'species' | 'conservation'
      var anatomyCanvasRef = useRef(null);

      function renderBiologyTab() {
        return h('div', { className: 'space-y-4' },
          // Sub-tabs
          h('div', { className: 'flex gap-2', role: 'tablist', 'aria-label': 'Biology sections' },
            [
              { id: 'anatomy', label: 'Anatomy', icon: '\uD83E\uDDA0' },
              { id: 'species', label: 'Species Gallery', icon: '\uD83E\uDD87' },
              { id: 'conservation', label: 'Conservation', icon: '\uD83C\uDF0D' }
            ].map(function(s, si) {
              var active = bioSection === s.id;
              return h('button', {
                key: s.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
                tabIndex: active ? 0 : -1,
                'aria-label': s.label + ' section',
                onClick: function() { upd('bioSection', s.id); },
                onKeyDown: function(e) {
                  var sections = ['anatomy', 'species', 'conservation'];
                  if (e.key === 'ArrowRight') { e.preventDefault(); upd('bioSection', sections[(si + 1) % 3]); }
                  if (e.key === 'ArrowLeft') { e.preventDefault(); upd('bioSection', sections[(si + 2) % 3]); }
                },
                className: 'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' +
                  (active ? 'bg-indigo-600 text-white shadow-md' : (isDark ? 'bg-indigo-900/40 text-indigo-300 hover:bg-indigo-800/50' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'))
              }, h('span', { 'aria-hidden': 'true' }, s.icon), ' ', s.label);
            })
          ),

          // ANATOMY SECTION
          bioSection === 'anatomy' && h('div', { className: 'space-y-3' },
            h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-white border border-slate-200') },
              h('div', { className: 'text-sm font-bold mb-3 ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, '\uD83E\uDDA0 Bat Anatomy \u2014 Click a part to learn more'),
              h('canvas', {
                ref: anatomyCanvasRef,
                width: 500,
                height: 300,
                role: 'img',
                'aria-label': 'Interactive bat anatomy diagram. Click or use keyboard to select wing, ear, nose, thumb claw, tail membrane, or larynx.',
                tabIndex: 0,
                onClick: function(e) {
                  var rect = e.target.getBoundingClientRect();
                  var scaleX = 500 / rect.width;
                  var scaleY = 300 / rect.height;
                  var mx = (e.clientX - rect.left) * scaleX;
                  var my = (e.clientY - rect.top) * scaleY;
                  var found = null;
                  BAT_ANATOMY.forEach(function(part) {
                    if (pointInRect(mx, my, part.hitBox.x, part.hitBox.y, part.hitBox.w, part.hitBox.h)) {
                      found = part.id;
                    }
                  });
                  upd('selectedAnatomyPart', found);
                  if (found) srAnnounce('Selected: ' + (BAT_ANATOMY.find(function(p) { return p.id === found; }) || {}).label);
                },
                onKeyDown: function(e) {
                  var ids = BAT_ANATOMY.map(function(p) { return p.id; });
                  var curIdx = selectedAnatomyPart ? ids.indexOf(selectedAnatomyPart) : -1;
                  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    var nextIdx = (curIdx + 1) % ids.length;
                    upd('selectedAnatomyPart', ids[nextIdx]);
                    srAnnounce('Selected: ' + BAT_ANATOMY[nextIdx].label);
                  }
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    var prevIdx = (curIdx - 1 + ids.length) % ids.length;
                    upd('selectedAnatomyPart', ids[prevIdx]);
                    srAnnounce('Selected: ' + BAT_ANATOMY[prevIdx].label);
                  }
                },
                style: { width: '100%', maxWidth: '500px', height: 'auto', borderRadius: '8px', display: 'block', background: isDark ? '#0f172a' : '#f1f5f9', cursor: 'pointer' }
              }),
              // Part details
              selectedAnatomyPart && (function() {
                var part = BAT_ANATOMY.find(function(p) { return p.id === selectedAnatomyPart; });
                if (!part) return null;
                return h('div', { className: 'mt-3 p-3 rounded-lg border-l-4', style: { borderLeftColor: part.color, background: isDark ? 'rgba(30,41,59,0.6)' : 'rgba(241,245,249,0.8)' } },
                  h('div', { className: 'text-xs font-bold mb-1', style: { color: part.color } }, part.label),
                  h('p', { className: 'text-[10px] mb-2 ' + (isDark ? 'text-slate-300' : 'text-slate-600') }, part.what),
                  h('div', { className: 'p-2 rounded ' + (isDark ? 'bg-indigo-900/30' : 'bg-indigo-50') },
                    h('div', { className: 'text-[9px] font-bold ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, '\uD83E\uDD13 Fun Fact'),
                    h('p', { className: 'text-[10px] ' + (isDark ? 'text-indigo-200' : 'text-indigo-800') }, part.funFact)),
                  h('div', { className: 'p-2 rounded mt-1 ' + (isDark ? 'bg-slate-700/40' : 'bg-slate-100') },
                    h('div', { className: 'text-[9px] font-bold ' + (isDark ? 'text-cyan-300' : 'text-cyan-700') }, '\u2699\uFE0F Physics'),
                    h('p', { className: 'text-[10px] ' + (isDark ? 'text-slate-300' : 'text-slate-600') }, part.physics))
                );
              })(),
              !selectedAnatomyPart && h('div', { className: 'mt-2 text-[10px] italic text-center ' + (isDark ? 'text-slate-500' : 'text-slate-400') },
                'Click or tap a part of the bat to explore it. Use arrow keys for keyboard navigation.')
            ),

            // Bat vs Bird Flight Comparison
            h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-white border border-slate-200') },
              h('div', { className: 'text-sm font-bold mb-3 ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, '\uD83E\uDD87 vs \uD83D\uDC26 Bat Wings vs Bird Wings'),
              h('p', { className: 'text-[10px] mb-3 ' + (isDark ? 'text-slate-400' : 'text-slate-600') },
                'Both bats and birds fly, but their wings evolved completely independently. The differences reveal how evolution solves the same problem in different ways:'),
              h('div', { className: 'grid grid-cols-2 gap-3' },
                h('div', { className: 'p-3 rounded-lg ' + (isDark ? 'bg-indigo-900/30 border border-indigo-800/30' : 'bg-indigo-50 border border-indigo-200') },
                  h('div', { className: 'text-center mb-2' },
                    h('span', { className: 'text-2xl' }, '\uD83E\uDD87'),
                    h('div', { className: 'text-xs font-bold ' + (isDark ? 'text-indigo-200' : 'text-indigo-800') }, 'Bat Wing')),
                  h('div', { className: 'space-y-1 text-[9px] ' + (isDark ? 'text-slate-400' : 'text-slate-600') },
                    h('p', null, '\u2022 Membrane stretched between elongated FINGER bones'),
                    h('p', null, '\u2022 Can change wing shape dramatically (high maneuverability)'),
                    h('p', null, '\u2022 Thinner, more flexible \u2014 generates less lift per area'),
                    h('p', null, '\u2022 Cannot fold flat \u2014 bats must hang upside down to rest'),
                    h('p', null, '\u2022 Excellent for slow, agile flight and hovering'),
                    h('p', null, '\u2022 Wing loading: 5-15 N/m\u00B2 (very light)'),
                    h('p', null, '\u2022 Can make tighter turns than any bird'))),
                h('div', { className: 'p-3 rounded-lg ' + (isDark ? 'bg-amber-900/30 border border-amber-800/30' : 'bg-amber-50 border border-amber-200') },
                  h('div', { className: 'text-center mb-2' },
                    h('span', { className: 'text-2xl' }, '\uD83D\uDC26'),
                    h('div', { className: 'text-xs font-bold ' + (isDark ? 'text-amber-200' : 'text-amber-800') }, 'Bird Wing')),
                  h('div', { className: 'space-y-1 text-[9px] ' + (isDark ? 'text-slate-400' : 'text-slate-600') },
                    h('p', null, '\u2022 Feathers attached to fused ARM bones'),
                    h('p', null, '\u2022 More rigid shape \u2014 better for sustained flight'),
                    h('p', null, '\u2022 Thicker airfoil \u2014 generates more lift per area'),
                    h('p', null, '\u2022 Can fold flat against body \u2014 birds can perch and walk'),
                    h('p', null, '\u2022 Excellent for fast, efficient long-distance flight'),
                    h('p', null, '\u2022 Wing loading: 10-200 N/m\u00B2 (varies by species)'),
                    h('p', null, '\u2022 Better at soaring and gliding')))
              ),
              h('div', { className: 'mt-2 text-[10px] text-center ' + (isDark ? 'text-indigo-400' : 'text-indigo-600') },
                'Key insight: Bat wings are essentially hands with webbing. Each "finger" can be controlled independently, giving bats unparalleled maneuverability \u2014 essential for catching insects in mid-air using echolocation.')
            ),

            // Bat Senses Beyond Sonar
            h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-white border border-slate-200') },
              h('div', { className: 'text-sm font-bold mb-3 ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, '\uD83D\uDC40 Beyond Echolocation \u2014 Bat Superpowers'),
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
                [
                  { icon: '\uD83D\uDC41\uFE0F', title: 'Vision', desc: 'Despite the myth, all bats can see. Fruit bats have large eyes with excellent night vision. Even echolocating bats use vision for long-range navigation \u2014 they use landmarks and the sunset glow to orient during migration.' },
                  { icon: '\uD83E\uDDED', title: 'Magnetic Sense', desc: 'Some bat species can detect Earth\'s magnetic field and use it as an internal compass. Scientists discovered this by putting tiny magnets on bats\' heads \u2014 the bats became disoriented!' },
                  { icon: '\uD83C\uDF21\uFE0F', title: 'Heat Detection', desc: 'Vampire bats have infrared-sensing pits on their nose that detect blood vessels under skin from inches away. This is convergent evolution with pit vipers!' },
                  { icon: '\uD83D\uDC43', title: 'Smell', desc: 'Fruit bats locate ripe fruit using an acute sense of smell. Some flower-visiting bats can smell the difference between flowers that still have nectar and those already depleted by other bats.' }
                ].map(function(sense, si) {
                  return h('div', { key: si, className: 'p-3 rounded-lg ' + (isDark ? 'bg-slate-700/40 border border-slate-600/30' : 'bg-slate-50 border border-slate-200') },
                    h('div', { className: 'flex items-center gap-2 mb-1' },
                      h('span', { className: 'text-lg' }, sense.icon),
                      h('span', { className: 'text-xs font-bold ' + (isDark ? 'text-indigo-200' : 'text-indigo-800') }, sense.title)),
                    h('p', { className: 'text-[10px] ' + (isDark ? 'text-slate-400' : 'text-slate-600') }, sense.desc));
                })
              )
            )
          ),

          // SPECIES GALLERY
          bioSection === 'species' && h('div', { className: 'space-y-3' },
            h('div', { className: 'text-sm font-bold ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, '\uD83E\uDD87 Bat Species Gallery'),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
              BAT_SPECIES.map(function(sp, si) {
                var expanded = selectedSpecies === si;
                return h('div', {
                  key: si,
                  className: 'rounded-lg p-3 cursor-pointer transition-all ' +
                    (expanded
                      ? (isDark ? 'bg-indigo-900/50 border-2 border-indigo-500 ring-2 ring-indigo-400/30' : 'bg-indigo-50 border-2 border-indigo-400')
                      : (isDark ? 'bg-slate-800/60 border border-slate-700/50 hover:border-indigo-600' : 'bg-white border border-slate-200 hover:border-indigo-300')),
                  role: 'button',
                  tabIndex: 0,
                  'aria-label': sp.name + (expanded ? ', expanded' : ', click to expand'),
                  'aria-expanded': expanded ? 'true' : 'false',
                  onClick: function() { upd('selectedSpecies', expanded ? null : si); },
                  onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); upd('selectedSpecies', expanded ? null : si); } }
                },
                  h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', { className: 'text-2xl' }, sp.emoji),
                    h('div', null,
                      h('div', { className: 'text-xs font-bold ' + (isDark ? 'text-indigo-200' : 'text-indigo-800') }, sp.name),
                      h('div', { className: 'text-[9px] ' + (isDark ? 'text-slate-400' : 'text-slate-500') }, sp.region))),
                  expanded && h('div', { className: 'space-y-1 mt-2' },
                    h('div', { className: 'text-[10px] ' + (isDark ? 'text-slate-300' : 'text-slate-600') },
                      h('strong', null, 'Size: '), sp.size, ' | ',
                      h('strong', null, 'Diet: '), sp.diet),
                    h('div', { className: 'text-[10px] ' + (isDark ? 'text-slate-300' : 'text-slate-600') },
                      h('strong', null, 'Echolocation: '), sp.echolocation),
                    h('div', { className: 'text-[10px] ' + (isDark ? 'text-slate-300' : 'text-slate-600') },
                      h('strong', null, 'Habitat: '), sp.habitat),
                    h('div', { className: 'p-2 rounded mt-1 ' + (isDark ? 'bg-indigo-900/30' : 'bg-indigo-50') },
                      h('div', { className: 'text-[9px] font-bold ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, '\uD83E\uDD13 Fun Fact'),
                      h('p', { className: 'text-[10px] ' + (isDark ? 'text-indigo-200' : 'text-indigo-800') }, sp.funFact)),
                    h('div', { className: 'p-2 rounded mt-1 ' + (isDark ? 'bg-amber-900/30' : 'bg-amber-50') },
                      h('div', { className: 'text-[9px] font-bold ' + (isDark ? 'text-amber-300' : 'text-amber-700') }, '\u26A0\uFE0F Conservation'),
                      h('p', { className: 'text-[10px] ' + (isDark ? 'text-amber-200' : 'text-amber-800') }, sp.conservation))
                  )
                );
              })
            )
          ),

          // CONSERVATION SECTION
          bioSection === 'conservation' && h('div', { className: 'space-y-3' },
            // White-nose syndrome
            h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-red-900/30 border border-red-800/40' : 'bg-red-50 border border-red-200') },
              h('div', { className: 'flex items-center gap-2 mb-2' },
                h('span', { className: 'text-xl' }, '\uD83E\uDDA0'),
                h('span', { className: 'text-sm font-bold ' + (isDark ? 'text-red-300' : 'text-red-800') }, 'White-Nose Syndrome')),
              h('p', { className: 'text-[10px] ' + (isDark ? 'text-red-200' : 'text-red-700') },
                'White-nose syndrome (WNS) is caused by the fungus Pseudogymnoascus destructans. It grows on the skin of hibernating bats, irritating them and causing them to wake up repeatedly during winter. Each arousal burns precious fat reserves. By spring, infected bats have starved to death.'),
              h('div', { className: 'mt-2 grid grid-cols-3 gap-2 text-center' },
                h('div', { className: 'p-2 rounded ' + (isDark ? 'bg-red-900/40' : 'bg-red-100') },
                  h('div', { className: 'text-lg font-black ' + (isDark ? 'text-red-300' : 'text-red-700') }, '2006'),
                  h('div', { className: 'text-[9px] ' + (isDark ? 'text-red-400' : 'text-red-600') }, 'First detected in NY')),
                h('div', { className: 'p-2 rounded ' + (isDark ? 'bg-red-900/40' : 'bg-red-100') },
                  h('div', { className: 'text-lg font-black ' + (isDark ? 'text-red-300' : 'text-red-700') }, '90%'),
                  h('div', { className: 'text-[9px] ' + (isDark ? 'text-red-400' : 'text-red-600') }, 'Population decline in some species')),
                h('div', { className: 'p-2 rounded ' + (isDark ? 'bg-red-900/40' : 'bg-red-100') },
                  h('div', { className: 'text-lg font-black ' + (isDark ? 'text-red-300' : 'text-red-700') }, '37+'),
                  h('div', { className: 'text-[9px] ' + (isDark ? 'text-red-400' : 'text-red-600') }, 'US states affected'))
              )
            ),
            // Wind turbines
            h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-amber-900/30 border border-amber-800/40' : 'bg-amber-50 border border-amber-200') },
              h('div', { className: 'flex items-center gap-2 mb-2' },
                h('span', { className: 'text-xl' }, '\uD83C\uDF2C\uFE0F'),
                h('span', { className: 'text-sm font-bold ' + (isDark ? 'text-amber-300' : 'text-amber-800') }, 'Wind Turbine Barotrauma')),
              h('p', { className: 'text-[10px] ' + (isDark ? 'text-amber-200' : 'text-amber-700') },
                'Bats are killed by wind turbines not just from blade strikes, but from barotrauma \u2014 the rapid pressure drop near spinning blades causes their lungs to expand and blood vessels to burst. Migratory species like the hoary bat are most at risk. Solutions include curtailing turbines during peak migration and low-wind nights when bats are most active.')
            ),
            // What you can do
            h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-emerald-900/30 border border-emerald-800/40' : 'bg-emerald-50 border border-emerald-200') },
              h('div', { className: 'flex items-center gap-2 mb-2' },
                h('span', { className: 'text-xl' }, '\u2764\uFE0F'),
                h('span', { className: 'text-sm font-bold ' + (isDark ? 'text-emerald-300' : 'text-emerald-800') }, 'What YOU Can Do')),
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
                [
                  { icon: '\uD83C\uDFE0', title: 'Build a bat box', desc: 'Provide roosting habitat. Place bat houses 10-15 feet high on a south-facing wall.' },
                  { icon: '\uD83C\uDF19', title: 'Reduce light pollution', desc: 'Turn off unnecessary outdoor lights. Light pollution disrupts bat foraging and insect availability.' },
                  { icon: '\uD83D\uDEAB', title: 'Avoid disturbing caves', desc: 'Never enter caves where bats hibernate. Human visits during winter can be fatal to hibernating bats.' },
                  { icon: '\uD83D\uDCB0', title: 'Support conservation', desc: 'Donate to Bat Conservation International (BCI) or your state wildlife agency\'s bat programs.' }
                ].map(function(item, i) {
                  return h('div', { key: i, className: 'p-2 rounded-lg ' + (isDark ? 'bg-emerald-900/30' : 'bg-emerald-100') },
                    h('div', { className: 'flex items-center gap-1 mb-1' },
                      h('span', null, item.icon),
                      h('span', { className: 'text-[10px] font-bold ' + (isDark ? 'text-emerald-200' : 'text-emerald-800') }, item.title)),
                    h('p', { className: 'text-[9px] ' + (isDark ? 'text-emerald-300' : 'text-emerald-700') }, item.desc));
                })
              )
            ),
            // Habitat loss
            h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-white border border-slate-200') },
              h('div', { className: 'flex items-center gap-2 mb-2' },
                h('span', { className: 'text-xl' }, '\uD83C\uDFD7\uFE0F'),
                h('span', { className: 'text-sm font-bold ' + (isDark ? 'text-slate-300' : 'text-slate-800') }, 'Habitat Loss')),
              h('p', { className: 'text-[10px] ' + (isDark ? 'text-slate-400' : 'text-slate-600') },
                'Deforestation, cave commercialization, building demolition, and land development destroy bat roosting sites. Many bat species need specific conditions: caves with stable temperatures for hibernation, dead trees with loose bark for summer roosting, and dark areas near water for foraging. When we remove these, bats have nowhere to go.'),
              h('div', { className: 'grid grid-cols-3 gap-2 mt-2 text-center' },
                h('div', { className: 'p-2 rounded ' + (isDark ? 'bg-slate-700/40' : 'bg-slate-100') },
                  h('div', { className: 'text-lg font-black ' + (isDark ? 'text-slate-300' : 'text-slate-700') }, '1,400+'),
                  h('div', { className: 'text-[9px] ' + (isDark ? 'text-slate-500' : 'text-slate-500') }, 'bat species worldwide')),
                h('div', { className: 'p-2 rounded ' + (isDark ? 'bg-slate-700/40' : 'bg-slate-100') },
                  h('div', { className: 'text-lg font-black ' + (isDark ? 'text-amber-300' : 'text-amber-700') }, '~25%'),
                  h('div', { className: 'text-[9px] ' + (isDark ? 'text-slate-500' : 'text-slate-500') }, 'threatened or endangered')),
                h('div', { className: 'p-2 rounded ' + (isDark ? 'bg-slate-700/40' : 'bg-slate-100') },
                  h('div', { className: 'text-lg font-black ' + (isDark ? 'text-emerald-300' : 'text-emerald-700') }, '$23B'),
                  h('div', { className: 'text-[9px] ' + (isDark ? 'text-slate-500' : 'text-slate-500') }, 'annual value of pest control'))
              )
            ),
            // Bat myths busted
            h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-purple-900/30 border border-purple-800/40' : 'bg-purple-50 border border-purple-200') },
              h('div', { className: 'flex items-center gap-2 mb-2' },
                h('span', { className: 'text-xl' }, '\u274C'),
                h('span', { className: 'text-sm font-bold ' + (isDark ? 'text-purple-300' : 'text-purple-800') }, 'Bat Myths \u2014 Busted!')),
              h('div', { className: 'space-y-2' },
                [
                  { myth: 'Bats are blind', truth: 'All bats can see! Many fruit bats have excellent vision. Echolocating bats use BOTH vision and sonar. The phrase "blind as a bat" is completely wrong.' },
                  { myth: 'Bats get tangled in your hair', truth: 'Bats have incredibly precise sonar and maneuverability. They can detect a single human hair. They have zero interest in your head \u2014 they\'re swooping after the mosquitoes near you!' },
                  { myth: 'All bats carry rabies', truth: 'Less than 0.5% of bats carry rabies. You\'re more likely to get rabies from a dog or raccoon. Still, never touch a bat on the ground \u2014 a grounded bat may be sick.' },
                  { myth: 'Bats are flying mice', truth: 'Bats are NOT rodents. They\'re in their own order (Chiroptera). Genetically, bats are more closely related to dogs and horses than to mice!' },
                  { myth: 'Vampire bats suck blood from humans', truth: 'Vampire bats lap (not suck) small amounts of blood from cattle and birds using anticoagulant saliva. They rarely bite humans, and the amount taken is tiny \u2014 about a tablespoon.' }
                ].map(function(item, i) {
                  return h('div', { key: i, className: 'p-2 rounded-lg ' + (isDark ? 'bg-purple-900/30' : 'bg-purple-100') },
                    h('div', { className: 'text-[10px] font-bold ' + (isDark ? 'text-red-400' : 'text-red-600') }, '\u274C Myth: "' + item.myth + '"'),
                    h('div', { className: 'text-[10px] ' + (isDark ? 'text-emerald-300' : 'text-emerald-700') }, '\u2705 Truth: ' + item.truth));
                })
              )
            ),
            // Ecosystem services
            h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-indigo-900/30 border border-indigo-800/40' : 'bg-indigo-50 border border-indigo-200') },
              h('div', { className: 'flex items-center gap-2 mb-2' },
                h('span', { className: 'text-xl' }, '\uD83C\uDF0D'),
                h('span', { className: 'text-sm font-bold ' + (isDark ? 'text-indigo-300' : 'text-indigo-800') }, 'Why Bats Matter \u2014 Ecosystem Services')),
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
                [
                  { icon: '\uD83E\uDD9F', title: 'Pest Control', desc: 'A single colony of 150 big brown bats eats enough cucumber beetles to prevent 33 million rootworm larvae per summer. US bats save farmers $23 billion annually in avoided pesticide costs.' },
                  { icon: '\uD83C\uDF3A', title: 'Pollination', desc: 'Over 500 plant species depend on bat pollination, including agave (tequila!), bananas, mangoes, and durian. Without bats, many tropical ecosystems would collapse.' },
                  { icon: '\uD83C\uDF31', title: 'Seed Dispersal', desc: 'Fruit bats spread seeds across tropical forests, regenerating cleared land. A single fruit bat can disperse thousands of seeds per night, making them critical for reforestation.' },
                  { icon: '\uD83E\uDDEA', title: 'Medical Research', desc: 'Bat saliva anticoagulants inspired stroke medications. Bat immune systems fight viruses without getting sick, teaching us about disease resistance. Bat sonar inspires technology for blind navigation devices.' }
                ].map(function(item, i) {
                  return h('div', { key: i, className: 'p-2 rounded-lg ' + (isDark ? 'bg-indigo-900/30' : 'bg-indigo-100') },
                    h('div', { className: 'flex items-center gap-1 mb-1' },
                      h('span', null, item.icon),
                      h('span', { className: 'text-[10px] font-bold ' + (isDark ? 'text-indigo-200' : 'text-indigo-800') }, item.title)),
                    h('p', { className: 'text-[9px] ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, item.desc));
                })
              )
            ),
            // Maine specific
            h('div', { className: 'rounded-xl p-3 ' + (isDark ? 'bg-indigo-900/30 border border-indigo-800/40' : 'bg-indigo-50 border border-indigo-200') },
              h('div', { className: 'text-xs font-bold ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, '\uD83C\uDDFA\uD83C\uDDF8 Maine Bat Facts'),
              h('p', { className: 'text-[10px] mt-1 ' + (isDark ? 'text-indigo-200' : 'text-indigo-800') },
                'Maine has 8 bat species. The little brown bat, once our most common species, has declined 90% due to white-nose syndrome. Big brown bats and hoary bats can still be spotted in Maine. If you see a bat flying at dusk, count yourself lucky \u2014 and know that single bat might eat 1,000 mosquitoes tonight!'),
              h('div', { className: 'mt-2 text-[10px] ' + (isDark ? 'text-indigo-200' : 'text-indigo-800') },
                h('strong', null, 'Maine\'s 8 bat species: '),
                'Little brown bat, Big brown bat, Northern long-eared bat (endangered), Eastern small-footed bat, Tri-colored bat, Silver-haired bat, Hoary bat, Red bat. The cave-hibernating species (first 4) are most affected by white-nose syndrome.')
            ),

            // Bat Box Project
            h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-emerald-900/20 border border-emerald-800/30' : 'bg-emerald-50 border border-emerald-200') },
              h('div', { className: 'flex items-center gap-2 mb-2' },
                h('span', { className: 'text-xl' }, '\uD83D\uDD28'),
                h('span', { className: 'text-sm font-bold ' + (isDark ? 'text-emerald-300' : 'text-emerald-800') }, 'STEM Project: Build a Bat Box!')),
              h('p', { className: 'text-[10px] mb-2 ' + (isDark ? 'text-emerald-200' : 'text-emerald-700') },
                'Help local bat populations by building a roosting box. This is a great hands-on project that combines woodworking, biology, and environmental science.'),
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
                [
                  { step: 'Materials', detail: 'Untreated plywood or cedar (never pressure-treated \u2014 toxic to bats), wood screws, exterior caulk, dark exterior paint or stain' },
                  { step: 'Size', detail: 'At least 24" tall x 14" wide x 3.5" deep. Internal chambers with 3/4" spacing. Rough or grooved interior surfaces so bats can grip.' },
                  { step: 'Placement', detail: 'Mount 10-15 feet high on a south-facing wall or pole. Full sun exposure is critical \u2014 bats need warmth. Near water is ideal.' },
                  { step: 'Timeline', detail: 'Install by early spring (March-April in Maine). Bats may take 1-2 years to discover and colonize a new box. Be patient!' }
                ].map(function(item, i) {
                  return h('div', { key: i, className: 'p-2 rounded-lg ' + (isDark ? 'bg-emerald-900/30' : 'bg-emerald-100') },
                    h('div', { className: 'text-[10px] font-bold ' + (isDark ? 'text-emerald-200' : 'text-emerald-800') }, item.step),
                    h('p', { className: 'text-[9px] ' + (isDark ? 'text-emerald-300' : 'text-emerald-700') }, item.detail));
                })
              ),
              h('div', { className: 'mt-2 text-[9px] italic ' + (isDark ? 'text-emerald-400' : 'text-emerald-600') },
                'A single bat box can house 50-200 bats. Those bats will eat millions of insects each summer, naturally reducing mosquitoes and crop pests in your area. Science + engineering + conservation = win!')
            )
          )
        );
      }

      // Anatomy canvas drawing
      useEffect(function() {
        if (tab !== 'biology' || bioSection !== 'anatomy') return;
        var canvas = anatomyCanvasRef.current;
        if (!canvas) return;
        var gfx = canvas.getContext('2d');
        var W = canvas.width;
        var H = canvas.height;

        gfx.fillStyle = isDark ? '#0f172a' : '#f1f5f9';
        gfx.fillRect(0, 0, W, H);

        // Draw large bat (centered)
        var batCX = 220;
        var batCY = 150;
        drawBat(gfx, batCX, batCY, 60, 0.3, 1, isDark);

        // Labels with leader lines
        BAT_ANATOMY.forEach(function(part) {
          var hb = part.hitBox;
          var cx = hb.x + hb.w / 2;
          var cy = hb.y + hb.h / 2;

          // Highlight selected
          if (selectedAnatomyPart === part.id) {
            gfx.strokeStyle = part.color;
            gfx.lineWidth = 2;
            gfx.setLineDash([4, 3]);
            gfx.strokeRect(hb.x, hb.y, hb.w, hb.h);
            gfx.setLineDash([]);
            gfx.fillStyle = part.color + '20';
            gfx.fillRect(hb.x, hb.y, hb.w, hb.h);
          }

          // Leader line
          var labelX, labelY;
          if (part.id === 'wing') { labelX = 40; labelY = 80; }
          else if (part.id === 'ear') { labelX = 380; labelY = 30; }
          else if (part.id === 'nose') { labelX = 430; labelY = 80; }
          else if (part.id === 'thumb') { labelX = 20; labelY = 130; }
          else if (part.id === 'tail') { labelX = 100; labelY = 260; }
          else if (part.id === 'mouth') { labelX = 420; labelY = 160; }
          else { labelX = cx + 60; labelY = cy; }

          gfx.strokeStyle = part.color;
          gfx.lineWidth = 1;
          gfx.beginPath();
          gfx.moveTo(cx, cy);
          gfx.lineTo(labelX, labelY);
          gfx.stroke();

          // Dot at part
          gfx.fillStyle = part.color;
          gfx.beginPath();
          gfx.arc(cx, cy, 4, 0, Math.PI * 2);
          gfx.fill();

          // Label text
          gfx.fillStyle = part.color;
          gfx.font = 'bold 9px system-ui';
          gfx.textAlign = labelX < cx ? 'right' : 'left';
          var lines = part.label.split('(');
          gfx.fillText(lines[0].trim(), labelX + (labelX < cx ? -4 : 4), labelY - 2);
          if (lines[1]) {
            gfx.font = '8px system-ui';
            gfx.fillStyle = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
            gfx.fillText('(' + lines[1], labelX + (labelX < cx ? -4 : 4), labelY + 10);
          }
        });
      }, [tab, bioSection, selectedAnatomyPart, isDark]);


      // ═════════════════════════════════════════
      // TAB 5: ACOUSTIC ECOLOGY
      // ═════════════════════════════════════════
      var soundscapeCanvasRef = useRef(null);
      var soundscapeAnimRef = useRef(null);
      var activeSounds = d.activeSounds || { cricket: true, frog: true, owl: true, bat: true, whale: false, dolphin: false };
      var noiseLevel = typeof d.noiseLevel === 'number' ? d.noiseLevel : 0;
      var ecoSection = d.ecoSection || 'soundscape'; // 'soundscape' | 'bioacoustics' | 'soundmap'
      var soundmapPrompt = d.soundmapPrompt || '';
      var soundmapResult = d.soundmapResult || '';
      var soundmapLoading = d.soundmapLoading || false;

      function renderEcologyTab() {
        return h('div', { className: 'space-y-4' },
          // Sub-tabs
          h('div', { className: 'flex gap-2', role: 'tablist', 'aria-label': 'Ecology sections' },
            [
              { id: 'soundscape', label: 'Soundscape', icon: '\uD83C\uDF33' },
              { id: 'bioacoustics', label: 'Bioacoustics', icon: '\uD83D\uDD0A' },
              { id: 'soundmap', label: 'Sound Map', icon: '\uD83D\uDDFA\uFE0F' }
            ].map(function(s, si) {
              var active = ecoSection === s.id;
              return h('button', {
                key: s.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
                tabIndex: active ? 0 : -1,
                'aria-label': s.label + ' section',
                onClick: function() { upd('ecoSection', s.id); },
                onKeyDown: function(e) {
                  var sections = ['soundscape', 'bioacoustics', 'soundmap'];
                  if (e.key === 'ArrowRight') { e.preventDefault(); upd('ecoSection', sections[(si + 1) % 3]); }
                  if (e.key === 'ArrowLeft') { e.preventDefault(); upd('ecoSection', sections[(si + 2) % 3]); }
                },
                className: 'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' +
                  (active ? 'bg-indigo-600 text-white shadow-md' : (isDark ? 'bg-indigo-900/40 text-indigo-300 hover:bg-indigo-800/50' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'))
              }, h('span', { 'aria-hidden': 'true' }, s.icon), ' ', s.label);
            })
          ),

          // SOUNDSCAPE
          ecoSection === 'soundscape' && h('div', { className: 'space-y-3' },
            h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-white border border-slate-200') },
              h('div', { className: 'flex items-center gap-2 mb-3' },
                h('span', { className: 'text-xl' }, '\uD83C\uDF33'),
                h('span', { className: 'text-sm font-bold ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, 'Night Soundscape \u2014 Toggle animals to hear how they share the frequency space')),
              h('canvas', {
                ref: soundscapeCanvasRef,
                width: 700,
                height: 250,
                role: 'img',
                'aria-label': 'Soundscape visualization showing frequency bands used by different animals. Active animals: ' +
                  SOUNDSCAPE_ANIMALS.filter(function(a) { return activeSounds[a.id]; }).map(function(a) { return a.name; }).join(', '),
                tabIndex: 0,
                onKeyDown: function() {},
                style: { width: '100%', height: 'auto', borderRadius: '8px', display: 'block', background: '#050d14' }
              }),
              // Animal toggles
              h('div', { className: 'flex flex-wrap gap-2 mt-3' },
                SOUNDSCAPE_ANIMALS.map(function(animal) {
                  var isActive = !!activeSounds[animal.id];
                  return h('button', {
                    key: animal.id,
                    'aria-label': animal.name + (isActive ? ', active, click to mute' : ', muted, click to activate'),
                    'aria-pressed': isActive ? 'true' : 'false',
                    onClick: function() {
                      var newSounds = Object.assign({}, activeSounds);
                      newSounds[animal.id] = !newSounds[animal.id];
                      upd('activeSounds', newSounds);
                      if (!isActive && typeof beep === 'function') {
                        try { beep(animal.beepFreq, animal.beepDur, 0.15); } catch(e) {}
                      }
                    },
                    className: 'flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ' +
                      (isActive
                        ? 'text-white shadow-md'
                        : (isDark ? 'bg-slate-700/50 text-slate-400 hover:bg-slate-600' : 'bg-slate-200 text-slate-400 hover:bg-slate-300')),
                    style: isActive ? { background: animal.color } : {}
                  }, h('span', { 'aria-hidden': 'true' }, animal.emoji), ' ', animal.name);
                })
              ),
              // Noise pollution slider
              h('div', { className: 'mt-3' },
                h('label', { className: 'text-[10px] font-bold ' + (isDark ? 'text-red-400' : 'text-red-600') },
                  '\uD83D\uDE97 Human Noise Level: ' + noiseLevel + '%' + (noiseLevel > 50 ? ' \u2014 Animals going silent!' : '')),
                h('input', {
                  type: 'range', min: 0, max: 100, value: noiseLevel, step: 1,
                  'aria-label': 'Human noise level, ' + noiseLevel + ' percent',
                  onChange: function(e) { upd('noiseLevel', parseInt(e.target.value)); },
                  className: 'w-full accent-red-500'
                }),
                noiseLevel > 0 && h('div', { className: 'text-[9px] mt-1 ' + (isDark ? 'text-red-400' : 'text-red-600') },
                  noiseLevel > 70 ? '\uD83D\uDD07 Most animal communication is masked by noise! Traffic noise reduces bird breeding success by 20-50%.' :
                  noiseLevel > 40 ? '\u26A0\uFE0F Mid-frequency animals (frogs, birds) are struggling to be heard over the noise.' :
                  noiseLevel > 0 ? '\uD83D\uDC42 Some low-frequency overlap with traffic noise. Animals may need to call louder.' : '')
              )
            ),
            // Acoustic niche explanation
            h('div', { className: 'p-3 rounded-lg ' + (isDark ? 'bg-indigo-900/30 border border-indigo-800/40' : 'bg-indigo-50 border border-indigo-200') },
              h('div', { className: 'text-xs font-bold ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, '\uD83C\uDFB5 Acoustic Niche Hypothesis'),
              h('p', { className: 'text-[10px] mt-1 ' + (isDark ? 'text-indigo-200' : 'text-indigo-800') },
                'Animals evolved to call at different frequencies so they don\'t interfere with each other \u2014 like radio stations on different channels. Insects use high frequencies, frogs use mid-range, owls use low frequencies, and bats use ultrasonic frequencies above human hearing. This frequency partitioning allows multiple species to communicate simultaneously without "jamming" each other\'s signals.')
            ),

            // Seasonal Soundscape Changes
            h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-white border border-slate-200') },
              h('div', { className: 'text-sm font-bold mb-3 ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, '\uD83C\uDF43 How Soundscapes Change with Seasons'),
              h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
                [
                  { season: 'Spring', emoji: '\uD83C\uDF31', sounds: 'Bird dawn chorus peaks, spring peepers (frogs) call at ponds, first bat activity resumes after hibernation, insects emerging', color: isDark ? 'bg-green-900/30' : 'bg-green-50' },
                  { season: 'Summer', emoji: '\u2600\uFE0F', sounds: 'Insect chorus dominates (crickets, cicadas, katydids), bat activity highest, frog breeding chorus, nocturnal insect noise peaks', color: isDark ? 'bg-yellow-900/30' : 'bg-yellow-50' },
                  { season: 'Autumn', emoji: '\uD83C\uDF42', sounds: 'Migrating bird calls overhead, elk bugling, insect chorus fading, bat migration/hibernation prep, owl territorial calls increase', color: isDark ? 'bg-orange-900/30' : 'bg-orange-50' },
                  { season: 'Winter', emoji: '\u2744\uFE0F', sounds: 'Quietest season. Owl hooting, wolf howling, chickadee calls, ice cracking, wind. Bats hibernating. Few insects. Snow muffles all sounds.', color: isDark ? 'bg-blue-900/30' : 'bg-blue-50' }
                ].map(function(s, si) {
                  return h('div', { key: si, className: 'p-2 rounded-lg ' + s.color },
                    h('div', { className: 'text-center mb-1' },
                      h('span', { className: 'text-xl' }, s.emoji),
                      h('div', { className: 'text-[10px] font-bold ' + (isDark ? 'text-slate-200' : 'text-slate-800') }, s.season)),
                    h('p', { className: 'text-[9px] ' + (isDark ? 'text-slate-400' : 'text-slate-600') }, s.sounds));
                })
              ),
              h('div', { className: 'mt-2 text-[10px] ' + (isDark ? 'text-indigo-400' : 'text-indigo-600') },
                'Acoustic ecologists record soundscapes year-round at fixed locations. By comparing recordings over years, they can detect biodiversity changes \u2014 a "quieter" spring chorus may indicate declining bird populations.')
            ),

            // Decibel Scale Reference
            h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-white border border-slate-200') },
              h('div', { className: 'text-sm font-bold mb-3 ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, '\uD83D\uDCCA The Decibel Scale \u2014 How Loud Is Loud?'),
              h('div', { className: 'space-y-1' },
                [
                  { dB: 0, label: 'Threshold of hearing', bar: 0, color: '#22c55e' },
                  { dB: 20, label: 'Rustling leaves, whisper', bar: 10, color: '#22c55e' },
                  { dB: 40, label: 'Quiet library', bar: 20, color: '#22c55e' },
                  { dB: 60, label: 'Normal conversation', bar: 30, color: '#eab308' },
                  { dB: 80, label: 'Vacuum cleaner, city traffic', bar: 40, color: '#f97316' },
                  { dB: 100, label: 'Chainsaw, bat echolocation call!', bar: 55, color: '#ef4444' },
                  { dB: 120, label: 'Jet engine at 100m, pain threshold', bar: 70, color: '#dc2626' },
                  { dB: 140, label: 'Bat echolocation at source (up to 140 dB!)', bar: 85, color: '#7c2d12' },
                  { dB: 188, label: 'Blue whale call (loudest animal)', bar: 100, color: '#581c87' }
                ].map(function(item, i) {
                  return h('div', { key: i, className: 'flex items-center gap-2' },
                    h('div', { className: 'w-10 text-right text-[9px] font-mono font-bold ' + (isDark ? 'text-slate-400' : 'text-slate-600') }, item.dB + ' dB'),
                    h('div', { className: 'flex-1 h-3 rounded-full overflow-hidden ' + (isDark ? 'bg-slate-700' : 'bg-slate-200') },
                      h('div', { style: { width: item.bar + '%', background: item.color }, className: 'h-full rounded-full' })),
                    h('div', { className: 'flex-1 text-[8px] ' + (isDark ? 'text-slate-500' : 'text-slate-500') }, item.label));
                })
              ),
              h('div', { className: 'mt-2 text-[9px] italic ' + (isDark ? 'text-indigo-400' : 'text-indigo-600') },
                'Decibels are logarithmic: every +10 dB is perceived as roughly twice as loud. A bat\'s echolocation call at the source (140 dB) would be painfully loud to humans \u2014 but we can\'t hear it because it\'s ultrasonic!')
            )
          ),

          // BIOACOUSTICS EXPLORER
          ecoSection === 'bioacoustics' && h('div', { className: 'space-y-3' },
            h('div', { className: 'text-sm font-bold ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, '\uD83D\uDD0A Bioacoustics Explorer'),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
              SOUNDSCAPE_ANIMALS.map(function(animal) {
                return h('div', { key: animal.id, className: 'rounded-lg p-3 ' + (isDark ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-white border border-slate-200') },
                  h('div', { className: 'flex items-center justify-between mb-2' },
                    h('div', { className: 'flex items-center gap-2' },
                      h('span', { className: 'text-2xl' }, animal.emoji),
                      h('div', null,
                        h('div', { className: 'text-xs font-bold ' + (isDark ? 'text-indigo-200' : 'text-indigo-800') }, animal.name),
                        h('div', { className: 'text-[9px] ' + (isDark ? 'text-slate-400' : 'text-slate-600') }, animal.freq))),
                    h('button', {
                      'aria-label': 'Play ' + animal.name + ' sound',
                      onClick: function() {
                        if (typeof beep === 'function') {
                          try { beep(animal.beepFreq, animal.beepDur, 0.2); } catch(e) {}
                        }
                      },
                      className: 'px-3 py-1.5 rounded-lg text-[10px] font-bold bg-indigo-600 text-white hover:bg-indigo-500'
                    }, '\uD83D\uDD0A Play')
                  ),
                  h('p', { className: 'text-[10px] ' + (isDark ? 'text-slate-400' : 'text-slate-600') }, animal.desc),
                  h('div', { className: 'flex gap-2 mt-2 text-[9px]' },
                    h('span', { className: 'px-2 py-0.5 rounded', style: { background: animal.color + '30', color: animal.color } },
                      animal.range),
                    h('span', { className: 'px-2 py-0.5 rounded ' + (isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600') },
                      '\u03BB = ' + (SPEED_OF_SOUND_AIR / animal.beepFreq).toFixed(3) + ' m')
                  )
                );
              })
            ),
            // Convergent evolution callout
            h('div', { className: 'p-3 rounded-lg ' + (isDark ? 'bg-cyan-900/30 border border-cyan-800/40' : 'bg-cyan-50 border border-cyan-200') },
              h('div', { className: 'text-xs font-bold ' + (isDark ? 'text-cyan-300' : 'text-cyan-700') }, '\uD83E\uDDEC Convergent Evolution'),
              h('p', { className: 'text-[10px] mt-1 ' + (isDark ? 'text-cyan-200' : 'text-cyan-800') },
                'Both bats and dolphins evolved echolocation independently \u2014 a textbook case of convergent evolution! Despite being separated by 80 million years of evolution, they use remarkably similar strategies: emit high-frequency pulses, listen for echoes, and build a "sound picture" of their environment. Even the neural circuits that process echoes are similar, suggesting evolution has found an optimal solution to the sonar problem.')
            ),

            // Cricket Temperature Calculator
            h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-emerald-900/30 border border-emerald-800/40' : 'bg-emerald-50 border border-emerald-200') },
              h('div', { className: 'flex items-center gap-2 mb-3' },
                h('span', { className: 'text-xl' }, '\uD83E\uDD97'),
                h('span', { className: 'text-sm font-bold ' + (isDark ? 'text-emerald-300' : 'text-emerald-700') }, 'Cricket Thermometer \u2014 Dolbear\'s Law')),
              h('p', { className: 'text-[10px] mb-3 ' + (isDark ? 'text-emerald-200' : 'text-emerald-700') },
                'Crickets are cold-blooded, so their chirp rate changes with temperature. Amos Dolbear discovered this relationship in 1897. Count the number of chirps in 14 seconds and add 40 to get the approximate temperature in \u00B0F!'),
              h('div', { className: 'p-3 rounded-lg text-center ' + (isDark ? 'bg-emerald-900/40' : 'bg-emerald-100') },
                h('div', { className: 'text-xs font-mono font-bold ' + (isDark ? 'text-emerald-300' : 'text-emerald-700') },
                  'T(\u00B0F) = N\u2081\u2084 + 40'),
                h('div', { className: 'text-[9px] mt-1 ' + (isDark ? 'text-emerald-400' : 'text-emerald-600') },
                  'where N\u2081\u2084 = number of chirps in 14 seconds')),
              h('div', { className: 'mt-3' },
                h('label', { className: 'text-[10px] font-bold ' + (isDark ? 'text-emerald-300' : 'text-slate-600') },
                  'Chirps in 14 seconds: ' + (d.cricketChirps || 30)),
                h('input', {
                  type: 'range', min: 5, max: 80, value: d.cricketChirps || 30, step: 1,
                  'aria-label': 'Cricket chirps per 14 seconds: ' + (d.cricketChirps || 30),
                  onChange: function(e) { upd('cricketChirps', parseInt(e.target.value)); },
                  className: 'w-full accent-emerald-500'
                }),
                h('div', { className: 'grid grid-cols-2 gap-3 mt-2' },
                  h('div', { className: 'text-center p-2 rounded ' + (isDark ? 'bg-emerald-900/40' : 'bg-emerald-100') },
                    h('div', { className: 'text-lg font-black ' + (isDark ? 'text-emerald-300' : 'text-emerald-700') },
                      ((d.cricketChirps || 30) + 40) + '\u00B0F'),
                    h('div', { className: 'text-[9px] ' + (isDark ? 'text-emerald-400' : 'text-emerald-600') }, 'Fahrenheit')),
                  h('div', { className: 'text-center p-2 rounded ' + (isDark ? 'bg-emerald-900/40' : 'bg-emerald-100') },
                    h('div', { className: 'text-lg font-black ' + (isDark ? 'text-emerald-300' : 'text-emerald-700') },
                      (((d.cricketChirps || 30) + 40 - 32) * 5 / 9).toFixed(1) + '\u00B0C'),
                    h('div', { className: 'text-[9px] ' + (isDark ? 'text-emerald-400' : 'text-emerald-600') }, 'Celsius'))
                ),
                h('div', { className: 'text-[9px] mt-2 italic ' + (isDark ? 'text-emerald-400' : 'text-emerald-600') },
                  'The physics: cricket muscles contract faster in warm temperatures because chemical reactions speed up. This is the same reason reptiles are sluggish in cold weather \u2014 enzymes work slower at lower temperatures (Arrhenius equation).')
              )
            ),

            // Echolocation Comparison Table
            h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-white border border-slate-200') },
              h('div', { className: 'text-sm font-bold mb-3 ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, '\uD83D\uDD0D Echolocation Across Species'),
              h('p', { className: 'text-[10px] mb-3 ' + (isDark ? 'text-slate-400' : 'text-slate-600') },
                'Multiple animals have evolved the ability to "see" with sound. Compare their sonar systems:'),
              h('div', { className: 'overflow-x-auto' },
                h('table', { className: 'w-full text-[10px] ' + (isDark ? 'text-slate-300' : 'text-slate-600'), role: 'table', 'aria-label': 'Comparison of echolocation across species' },
                  h('thead', null,
                    h('tr', { className: isDark ? 'bg-slate-700/50' : 'bg-slate-100' },
                      ['Animal', 'Frequency', 'Range', 'Method', 'Medium', 'Precision'].map(function(hdr) {
                        return h('th', { key: hdr, className: 'px-2 py-1.5 text-left font-bold ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, hdr);
                      })
                    )
                  ),
                  h('tbody', null,
                    [
                      { animal: '\uD83E\uDD87 Microbat', freq: '20-200 kHz', range: '0.5-5 m', method: 'Laryngeal calls', medium: 'Air', precision: 'Can detect 0.1mm wire' },
                      { animal: '\uD83D\uDC2C Dolphin', freq: '20-150 kHz', range: '1-100 m', method: 'Click trains via melon', medium: 'Water', precision: 'Can distinguish coin sizes' },
                      { animal: '\uD83D\uDC33 Sperm Whale', freq: '5-25 kHz', range: '500+ m', method: 'Clicks via spermaceti organ', medium: 'Water', precision: 'Can detect squid at depth' },
                      { animal: '\uD83D\uDC26 Oilbird', freq: '1-15 kHz', range: '1-3 m', method: 'Tongue clicks (audible!)', medium: 'Air', precision: 'Navigation only, not hunting' },
                      { animal: '\uD83E\uDD87 Fruit bat', freq: '10-100 kHz', range: '1-5 m', method: 'Tongue clicks', medium: 'Air', precision: 'Obstacle avoidance' },
                      { animal: '\uD83D\uDC00 Shrew', freq: '30-60 kHz', range: '0.1-0.5 m', method: 'Ultrasonic squeaks', medium: 'Air', precision: 'Habitat exploration' },
                      { animal: '\uD83E\uDD86 Swiftlet', freq: '2-10 kHz', range: '1-3 m', method: 'Paired clicks', medium: 'Air (caves)', precision: 'Cave navigation in darkness' }
                    ].map(function(row, ri) {
                      return h('tr', { key: ri, className: ri % 2 === 0 ? (isDark ? 'bg-slate-800/30' : 'bg-slate-50/50') : '' },
                        h('td', { className: 'px-2 py-1.5 font-bold' }, row.animal),
                        h('td', { className: 'px-2 py-1.5' }, row.freq),
                        h('td', { className: 'px-2 py-1.5' }, row.range),
                        h('td', { className: 'px-2 py-1.5' }, row.method),
                        h('td', { className: 'px-2 py-1.5' }, row.medium),
                        h('td', { className: 'px-2 py-1.5' }, row.precision)
                      );
                    })
                  )
                )
              ),
              h('div', { className: 'mt-2 text-[9px] italic ' + (isDark ? 'text-slate-500' : 'text-slate-400') },
                'Note: Sound travels ~4.3x faster in water than air, so dolphin sonar has much greater range than bat sonar at similar frequencies.')
            ),

            // Speed of Sound comparison
            h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-white border border-slate-200') },
              h('div', { className: 'text-sm font-bold mb-3 ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, '\u26A1 Speed of Sound in Different Media'),
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-3' },
                [
                  { medium: 'Air (20\u00B0C)', speed: 343, emoji: '\uD83C\uDF2C\uFE0F', color: isDark ? 'bg-sky-900/40' : 'bg-sky-50', detail: 'Sound moves slowly through air because air molecules are far apart. Speed increases ~0.6 m/s per \u00B0C rise in temperature.' },
                  { medium: 'Water (25\u00B0C)', speed: 1480, emoji: '\uD83C\uDF0A', color: isDark ? 'bg-blue-900/40' : 'bg-blue-50', detail: 'Water molecules are closer together, transmitting vibrations much faster. This is why dolphin sonar works at much greater distances than bat sonar.' },
                  { medium: 'Steel', speed: 5960, emoji: '\u2699\uFE0F', color: isDark ? 'bg-slate-700/40' : 'bg-slate-100', detail: 'Rigid solids transmit sound fastest because atoms are tightly packed and bonded. You can hear a train coming by putting your ear to the rail long before you hear it through air!' }
                ].map(function(m, mi) {
                  return h('div', { key: mi, className: 'p-3 rounded-lg ' + m.color },
                    h('div', { className: 'flex items-center gap-2 mb-1' },
                      h('span', { className: 'text-xl' }, m.emoji),
                      h('span', { className: 'text-xs font-bold ' + (isDark ? 'text-slate-200' : 'text-slate-800') }, m.medium)),
                    h('div', { className: 'text-xl font-black ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, m.speed.toLocaleString() + ' m/s'),
                    h('p', { className: 'text-[9px] mt-1 ' + (isDark ? 'text-slate-400' : 'text-slate-600') }, m.detail)
                  );
                })
              )
            ),

            // Echolocation vs Human Technology
            h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-white border border-slate-200') },
              h('div', { className: 'text-sm font-bold mb-3 ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, '\uD83E\uDD16 Nature vs Technology: Sonar Showdown'),
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
                [
                  { icon: '\uD83E\uDD87', title: 'Bat Echolocation', items: [
                    'Weighs: 5-40 grams (entire animal!)',
                    'Power: microwatts (powered by insects)',
                    'Processing: 100 billion neurons',
                    'Can detect 0.1mm wire in flight',
                    'Processes echoes in 1-2 milliseconds',
                    'Works while flying at 30+ mph',
                    'Self-repairing, self-reproducing',
                    'Evolved over 52 million years'
                  ]},
                  { icon: '\uD83D\uDEA2', title: 'Naval SONAR', items: [
                    'Weighs: 500-2000+ kg (just the array)',
                    'Power: kilowatts (nuclear/diesel)',
                    'Processing: high-end computers',
                    'Can detect submarines at 100+ km',
                    'Processing delay: tens of milliseconds',
                    'Works on stable ship platform',
                    'Requires maintenance, replacement',
                    'Developed over ~80 years'
                  ]}
                ].map(function(col, ci) {
                  return h('div', { key: ci, className: 'p-3 rounded-lg ' + (isDark ? 'bg-slate-700/40 border border-slate-600/30' : 'bg-slate-50 border border-slate-200') },
                    h('div', { className: 'text-center mb-2' },
                      h('span', { className: 'text-2xl' }, col.icon),
                      h('div', { className: 'text-xs font-bold ' + (isDark ? 'text-indigo-200' : 'text-indigo-800') }, col.title)),
                    h('div', { className: 'space-y-1' },
                      col.items.map(function(item, ii) {
                        return h('div', { key: ii, className: 'text-[9px] ' + (isDark ? 'text-slate-400' : 'text-slate-600') },
                          '\u2022 ' + item);
                      })
                    )
                  );
                })
              ),
              h('div', { className: 'mt-2 text-[10px] italic text-center ' + (isDark ? 'text-indigo-400' : 'text-indigo-600') },
                'Pound for pound, bat echolocation is the most sophisticated sonar system on Earth. Engineers study bats to improve robot navigation and autonomous vehicles.')
            )
          ),

          // SOUND MAP (AI-powered)
          ecoSection === 'soundmap' && h('div', { className: 'space-y-3' },
            h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-white border border-slate-200') },
              h('div', { className: 'flex items-center gap-2 mb-3' },
                h('span', { className: 'text-xl' }, '\uD83D\uDDFA\uFE0F'),
                h('span', { className: 'text-sm font-bold ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, 'AI Sound Map Generator')),
              h('p', { className: 'text-[10px] mb-3 ' + (isDark ? 'text-slate-400' : 'text-slate-600') },
                'Choose an environment and time of day. The AI will describe the soundscape \u2014 what animals you\'d hear, their frequencies, and how they share the acoustic space.'),
              h('div', { className: 'grid grid-cols-2 gap-3 mb-3' },
                h('div', null,
                  h('label', { className: 'text-[10px] font-bold ' + (isDark ? 'text-indigo-300' : 'text-slate-600') }, 'Environment'),
                  h('select', {
                    value: d.soundmapEnv || 'temperate_forest',
                    'aria-label': 'Select environment',
                    onChange: function(e) { upd('soundmapEnv', e.target.value); },
                    className: 'w-full mt-1 px-3 py-1.5 rounded-lg text-xs ' + (isDark ? 'bg-slate-700 text-slate-200 border-slate-600' : 'bg-white text-slate-800 border-slate-300') + ' border'
                  },
                    h('option', { value: 'temperate_forest' }, 'Temperate Forest'),
                    h('option', { value: 'tropical_rainforest' }, 'Tropical Rainforest'),
                    h('option', { value: 'desert' }, 'Desert'),
                    h('option', { value: 'ocean_coast' }, 'Ocean Coast'),
                    h('option', { value: 'cave' }, 'Cave'),
                    h('option', { value: 'freshwater_pond' }, 'Freshwater Pond'),
                    h('option', { value: 'arctic_tundra' }, 'Arctic Tundra'),
                    h('option', { value: 'coral_reef' }, 'Coral Reef (underwater)')
                  )),
                h('div', null,
                  h('label', { className: 'text-[10px] font-bold ' + (isDark ? 'text-indigo-300' : 'text-slate-600') }, 'Time of Day'),
                  h('select', {
                    value: d.soundmapTime || 'dusk',
                    'aria-label': 'Select time of day',
                    onChange: function(e) { upd('soundmapTime', e.target.value); },
                    className: 'w-full mt-1 px-3 py-1.5 rounded-lg text-xs ' + (isDark ? 'bg-slate-700 text-slate-200 border-slate-600' : 'bg-white text-slate-800 border-slate-300') + ' border'
                  },
                    h('option', { value: 'dawn' }, 'Dawn (5-7am)'),
                    h('option', { value: 'midday' }, 'Midday (12-2pm)'),
                    h('option', { value: 'dusk' }, 'Dusk (7-9pm)'),
                    h('option', { value: 'midnight' }, 'Midnight (12-2am)')
                  ))
              ),
              h('button', {
                'aria-label': 'Generate soundscape description',
                disabled: soundmapLoading,
                onClick: function() {
                  if (!callGemini) { if (addToast) addToast('AI not available', 'info'); return; }
                  upd('soundmapLoading', true);
                  var env = d.soundmapEnv || 'temperate_forest';
                  var time = d.soundmapTime || 'dusk';
                  var prompt = 'Describe the soundscape of a ' + env.replace(/_/g, ' ') + ' at ' + time + '. ' +
                    'List 5-8 animals or natural sounds you would hear. For each, include: the sound description, approximate frequency range in Hz, whether it\'s infrasonic/audible/ultrasonic, and its ecological purpose (mating call, territory defense, echolocation, etc.). ' +
                    'Explain how these animals share the acoustic space (frequency partitioning). ' +
                    'Write for a ' + (gradeLevel || 'middle school') + ' student. Keep it engaging and educational. Use bullet points.';
                  callGemini(prompt).then(function(result) {
                    updMulti({ soundmapResult: result, soundmapLoading: false });
                    srAnnounce('Soundscape description generated');
                  }).catch(function(err) {
                    updMulti({ soundmapResult: 'Error generating soundscape: ' + err.message, soundmapLoading: false });
                  });
                },
                className: 'px-4 py-2 rounded-lg text-xs font-bold ' + (soundmapLoading ? 'bg-slate-500 text-slate-300 cursor-wait' : 'bg-indigo-600 text-white hover:bg-indigo-500')
              }, soundmapLoading ? '\u23F3 Generating...' : '\uD83E\uDD16 Generate Soundscape'),
              soundmapResult ? h('div', { className: 'mt-3 p-3 rounded-lg whitespace-pre-wrap text-[10px] leading-relaxed ' + (isDark ? 'bg-slate-700/50 text-slate-200' : 'bg-slate-50 text-slate-700') },
                soundmapResult) : null
            ),

            // Did You Know? Sound facts
            h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-white border border-slate-200') },
              h('div', { className: 'text-sm font-bold mb-3 ' + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, '\uD83D\uDCA1 Did You Know? \u2014 Amazing Sound Facts'),
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
                [
                  { fact: 'The pistol shrimp produces a sound of 218 decibels by snapping its claw \u2014 louder than a gunshot. The snap creates a cavitation bubble that reaches 4,700\u00B0C (as hot as the sun\'s surface) for a fraction of a second.', icon: '\uD83E\uDD90' },
                  { fact: 'Elephants communicate using infrasonic rumbles as low as 14 Hz, below human hearing. These calls can travel 10+ km through the ground. Other elephants "hear" them through vibrations in their feet!', icon: '\uD83D\uDC18' },
                  { fact: 'The Greater Wax Moth has the highest frequency hearing of any animal: up to 300 kHz (humans max out at ~20 kHz). Scientists think this evolved as a defense against bat echolocation.', icon: '\uD83E\uDD8B' },
                  { fact: 'In space, no one can hear you scream \u2014 literally. Sound requires a medium (air, water, solid) to travel through. The vacuum of space is perfectly silent.', icon: '\uD83C\uDF0C' },
                  { fact: 'The brown-headed cowbird learns its species-specific song even when raised by a different species. The password? A specific wingbeat pattern that unlocks the song-learning circuit in the brain.', icon: '\uD83D\uDC26' },
                  { fact: 'Submarine crews can hear the "biological dawn chorus" \u2014 thousands of marine animals singing at sunrise, creating a wall of sound that can interfere with naval sonar. The ocean is incredibly noisy!', icon: '\uD83D\uDEA2' },
                  { fact: 'Trees may communicate through sound: studies show plant roots produce clicking sounds at 220 Hz, and neighboring roots grow toward these sounds. "Talking trees" may be more than a metaphor.', icon: '\uD83C\uDF33' },
                  { fact: 'The loudest animal relative to body size is the water boatman (Micronecta scholtzi), a tiny aquatic insect. It produces 99 dB by rubbing its body parts together \u2014 while being only 2mm long!', icon: '\uD83D\uDC1B' }
                ].map(function(item, i) {
                  return h('div', { key: i, className: 'p-2 rounded-lg ' + (isDark ? 'bg-slate-700/40' : 'bg-slate-50') },
                    h('div', { className: 'flex items-start gap-2' },
                      h('span', { className: 'text-lg flex-shrink-0' }, item.icon),
                      h('p', { className: 'text-[10px] ' + (isDark ? 'text-slate-300' : 'text-slate-600') }, item.fact))
                  );
                })
              )
            ),

            // Noise Pollution Data
            h('div', { className: 'rounded-xl p-4 ' + (isDark ? 'bg-red-900/20 border border-red-800/30' : 'bg-red-50 border border-red-200') },
              h('div', { className: 'flex items-center gap-2 mb-3' },
                h('span', { className: 'text-xl' }, '\uD83D\uDD07'),
                h('span', { className: 'text-sm font-bold ' + (isDark ? 'text-red-300' : 'text-red-800') }, 'The Growing Problem of Noise Pollution')),
              h('p', { className: 'text-[10px] mb-2 ' + (isDark ? 'text-red-200' : 'text-red-700') },
                'Human-generated noise has doubled in many natural areas over the past 50 years. This acoustic pollution has measurable effects on wildlife:'),
              h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2 text-center' },
                [
                  { stat: '20-50%', label: 'Reduction in bird breeding success near roads', color: isDark ? 'text-red-300' : 'text-red-700' },
                  { stat: '30%', label: 'Of US protected areas have noise doubling', color: isDark ? 'text-amber-300' : 'text-amber-700' },
                  { stat: '63%', label: 'Of US parks exceed natural sound levels', color: isDark ? 'text-orange-300' : 'text-orange-700' },
                  { stat: '2x', label: 'Stress hormones in birds near airports', color: isDark ? 'text-red-300' : 'text-red-700' }
                ].map(function(s, si) {
                  return h('div', { key: si, className: 'p-2 rounded ' + (isDark ? 'bg-red-900/30' : 'bg-red-100') },
                    h('div', { className: 'text-lg font-black ' + s.color }, s.stat),
                    h('div', { className: 'text-[8px] ' + (isDark ? 'text-red-400' : 'text-red-600') }, s.label));
                })
              ),
              h('div', { className: 'mt-2 text-[10px] ' + (isDark ? 'text-red-200' : 'text-red-700') },
                h('strong', null, 'How you can help: '), 'Support quiet zone designations in natural areas. Advocate for electric vehicles and quieter construction equipment. Even small actions like turning off leaf blowers and reducing nighttime lighting make a difference for nocturnal animals like bats.')
            )
          )
        );
      }

      // Soundscape canvas animation
      useEffect(function() {
        if (tab !== 'ecology' || ecoSection !== 'soundscape') return;
        var canvas = soundscapeCanvasRef.current;
        if (!canvas) return;
        var gfx = canvas.getContext('2d');
        var running = true;
        var phase = 0;

        // Each animal's position on canvas
        var positions = {
          cricket: { x: 150, y: 180 },
          frog: { x: 300, y: 200 },
          owl: { x: 480, y: 80 },
          bat: { x: 600, y: 60 },
          whale: { x: 100, y: 120 },
          dolphin: { x: 550, y: 160 }
        };

        function animate() {
          if (!running) return;
          phase += 0.03;
          var W = canvas.width;
          var H = canvas.height;

          // Night scene background
          gfx.fillStyle = '#050d14';
          gfx.fillRect(0, 0, W, H);

          // Stars
          gfx.fillStyle = 'rgba(255,255,255,0.3)';
          for (var si = 0; si < 30; si++) {
            var sx = (si * 137.5 + 50) % W;
            var sy = (si * 73.3 + 20) % (H * 0.5);
            gfx.beginPath();
            gfx.arc(sx, sy, 1, 0, Math.PI * 2);
            gfx.fill();
          }

          // Ground/water
          gfx.fillStyle = '#0a1628';
          gfx.fillRect(0, H * 0.8, W, H * 0.2);

          // Trees
          gfx.fillStyle = '#0d1f0d';
          var treeXs = [60, 180, 350, 500, 640];
          treeXs.forEach(function(tx) {
            gfx.beginPath();
            gfx.moveTo(tx, H * 0.8);
            gfx.lineTo(tx - 20, H * 0.5);
            gfx.lineTo(tx + 20, H * 0.5);
            gfx.fill();
          });

          // Moon
          gfx.fillStyle = 'rgba(250,250,210,0.8)';
          gfx.beginPath();
          gfx.arc(620, 40, 18, 0, Math.PI * 2);
          gfx.fill();

          // Draw noise overlay
          if (noiseLevel > 0) {
            gfx.fillStyle = 'rgba(239,68,68,' + (noiseLevel / 300) + ')';
            gfx.fillRect(0, 0, W, H);
            gfx.fillStyle = 'rgba(255,255,255,0.3)';
            gfx.font = '10px system-ui';
            gfx.textAlign = 'center';
            gfx.fillText('\uD83D\uDE97 Human noise: ' + noiseLevel + '%', W / 2, H - 10);
          }

          // Draw active animals with expanding sound circles
          SOUNDSCAPE_ANIMALS.forEach(function(animal) {
            if (!activeSounds[animal.id]) return;
            var pos = positions[animal.id];
            if (!pos) return;

            // Mute at high noise levels based on frequency range
            var noiseMask = 0;
            if (animal.range === 'low') noiseMask = noiseLevel * 0.8;
            else if (animal.range === 'mid') noiseMask = noiseLevel * 0.6;
            else if (animal.range === 'high') noiseMask = noiseLevel * 0.3;
            else noiseMask = noiseLevel * 0.1; // ultrasonic/infrasonic less affected

            if (noiseMask > 70) return; // silenced by noise

            var alpha = Math.max(0.1, 1 - noiseMask / 100);

            // Sound wave circles
            for (var ri = 0; ri < 3; ri++) {
              var r = ((phase * 60 + ri * 30) % 80);
              var ringAlpha = Math.max(0, (1 - r / 80)) * 0.4 * alpha;
              gfx.strokeStyle = animal.color.replace(')', ',' + ringAlpha + ')').replace('rgb', 'rgba');
              if (animal.color.charAt(0) === '#') {
                var hex = animal.color;
                var rr = parseInt(hex.slice(1, 3), 16);
                var gg = parseInt(hex.slice(3, 5), 16);
                var bb = parseInt(hex.slice(5, 7), 16);
                gfx.strokeStyle = 'rgba(' + rr + ',' + gg + ',' + bb + ',' + ringAlpha + ')';
              }
              gfx.lineWidth = 1.5;
              gfx.beginPath();
              gfx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
              gfx.stroke();
            }

            // Emoji
            gfx.font = '18px system-ui';
            gfx.textAlign = 'center';
            gfx.globalAlpha = alpha;
            gfx.fillText(animal.emoji, pos.x, pos.y + 6);
            gfx.globalAlpha = 1;

            // Label
            gfx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.6) + ')';
            gfx.font = '8px system-ui';
            gfx.fillText(animal.name, pos.x, pos.y + 22);
            gfx.fillText(animal.freq, pos.x, pos.y + 31);
          });

          // Frequency spectrum bar at bottom
          var specH = 25;
          var specY = H - specH - 2;
          gfx.fillStyle = 'rgba(0,0,0,0.5)';
          gfx.fillRect(0, specY, W, specH);

          // Frequency scale
          gfx.fillStyle = 'rgba(255,255,255,0.3)';
          gfx.font = '7px system-ui';
          gfx.textAlign = 'center';
          var freqLabels = [
            { f: 20, label: '20 Hz' },
            { f: 200, label: '200 Hz' },
            { f: 2000, label: '2 kHz' },
            { f: 20000, label: '20 kHz' },
            { f: 200000, label: '200 kHz' }
          ];
          freqLabels.forEach(function(fl) {
            var xPos = (Math.log10(fl.f) - Math.log10(20)) / (Math.log10(200000) - Math.log10(20)) * W;
            gfx.fillText(fl.label, xPos, specY + specH - 3);
            gfx.strokeStyle = 'rgba(255,255,255,0.1)';
            gfx.beginPath(); gfx.moveTo(xPos, specY); gfx.lineTo(xPos, specY + specH - 10); gfx.stroke();
          });

          // Animal frequency bands on spectrum
          SOUNDSCAPE_ANIMALS.forEach(function(animal) {
            if (!activeSounds[animal.id]) return;
            var lowF, highF;
            if (animal.id === 'cricket') { lowF = 4000; highF = 8000; }
            else if (animal.id === 'frog') { lowF = 500; highF = 3000; }
            else if (animal.id === 'owl') { lowF = 200; highF = 800; }
            else if (animal.id === 'bat') { lowF = 20000; highF = 200000; }
            else if (animal.id === 'whale') { lowF = 10; highF = 40; }
            else if (animal.id === 'dolphin') { lowF = 20000; highF = 150000; }
            else return;

            var x1 = (Math.log10(Math.max(20, lowF)) - Math.log10(20)) / (Math.log10(200000) - Math.log10(20)) * W;
            var x2 = (Math.log10(highF) - Math.log10(20)) / (Math.log10(200000) - Math.log10(20)) * W;

            var noiseMask2 = 0;
            if (animal.range === 'low') noiseMask2 = noiseLevel * 0.8;
            else if (animal.range === 'mid') noiseMask2 = noiseLevel * 0.6;
            else noiseMask2 = noiseLevel * 0.2;
            var bandAlpha = Math.max(0.1, 1 - noiseMask2 / 100) * 0.5;

            // Extract color components from hex
            var hex = animal.color;
            var cr = parseInt(hex.slice(1, 3), 16);
            var cg = parseInt(hex.slice(3, 5), 16);
            var cb = parseInt(hex.slice(5, 7), 16);

            gfx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + bandAlpha + ')';
            gfx.fillRect(x1, specY, x2 - x1, specH - 10);
          });

          // Human hearing range
          var hearLow = (Math.log10(20) - Math.log10(20)) / (Math.log10(200000) - Math.log10(20)) * W;
          var hearHigh = (Math.log10(20000) - Math.log10(20)) / (Math.log10(200000) - Math.log10(20)) * W;
          gfx.strokeStyle = 'rgba(255,255,255,0.2)';
          gfx.setLineDash([3, 3]);
          gfx.beginPath(); gfx.moveTo(hearLow, specY); gfx.lineTo(hearLow, specY + specH - 10); gfx.stroke();
          gfx.beginPath(); gfx.moveTo(hearHigh, specY); gfx.lineTo(hearHigh, specY + specH - 10); gfx.stroke();
          gfx.setLineDash([]);
          gfx.fillStyle = 'rgba(255,255,255,0.2)';
          gfx.font = '7px system-ui';
          gfx.textAlign = 'center';
          gfx.fillText('\uD83D\uDC42 Human hearing', (hearLow + hearHigh) / 2, specY - 3);

          soundscapeAnimRef.current = requestAnimationFrame(animate);
        }

        soundscapeAnimRef.current = requestAnimationFrame(animate);
        return function() { running = false; if (soundscapeAnimRef.current) cancelAnimationFrame(soundscapeAnimRef.current); };
      }, [tab, ecoSection, activeSounds, noiseLevel]);


      // ═════════════════════════════════════════
      // MAIN RENDER
      // ═════════════════════════════════════════
      var textColor = isDark ? 'text-slate-200' : 'text-slate-800';
      var subtextColor = isDark ? 'text-slate-400' : 'text-slate-600';

      return h('div', { className: 'space-y-4' },
        // Header with back button
        h('div', { className: 'flex items-center justify-between' },
          h('div', { className: 'flex items-center gap-3' },
            h('button', {
              'aria-label': 'Back to STEM Lab menu',
              onClick: function() { if (setStemLabTool) setStemLabTool(null); },
              className: 'p-2 rounded-lg transition-all ' + (isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200')
            }, h(ArrowLeft, { size: 18 })),
            h('div', null,
              h('div', { className: 'flex items-center gap-2' },
                h('span', { className: 'text-2xl' }, '\uD83E\uDD87'),
                h('span', { className: 'text-lg font-black ' + textColor }, 'Echolocation Lab')),
              h('div', { className: 'text-[10px] ' + subtextColor }, 'See the world through sound \u2014 bat sonar vision, sound wave physics, Doppler effect & acoustic ecology'))),
          // Quest progress
          h('div', { className: 'text-right text-[9px] ' + subtextColor },
            h('div', null, '\uD83E\uDD87 Cave: ' + (d.caveMapped ? '\u2713' : '\u2014')),
            h('div', null, '\uD83E\uDD8B Moths: ' + (d.mothsCaught || 0) + '/10'),
            h('div', null, '\uD83C\uDF0A Doppler: ' + (d.dopplerCorrect || 0) + '/5'))
        ),

        // Tab bar
        h('div', { className: 'flex gap-1 flex-wrap', role: 'tablist', 'aria-label': 'Echolocation Lab sections' },
          TABS.map(function(tb, ti) {
            var active = tab === tb.id;
            return h('button', {
              key: tb.id, role: 'tab',
              'aria-selected': active ? 'true' : 'false',
              tabIndex: active ? 0 : -1,
              'aria-label': tb.label + ' tab',
              onClick: function() { upd('tab', tb.id); },
              onKeyDown: function(e) {
                var nextIdx = ti;
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); nextIdx = (ti + 1) % TABS.length; }
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); nextIdx = (ti - 1 + TABS.length) % TABS.length; }
                else return;
                upd('tab', TABS[nextIdx].id);
              },
              className: 'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ' +
                (active
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : (isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'))
            }, h('span', { 'aria-hidden': 'true' }, tb.icon), tb.label);
          })
        ),

        // Tab content
        tab === 'sonar' && renderSonarTab(),
        tab === 'waves' && renderWavesTab(),
        tab === 'doppler' && renderDopplerTab(),
        tab === 'biology' && renderBiologyTab(),
        tab === 'ecology' && renderEcologyTab()
      );
    }
  });

})();
} // end duplicate guard
