// ═══════════════════════════════════════════
// stem_tool_migration.js — Migration & Wind Patterns Lab
// V-formation aerodynamics, wind currents, bird migration routes & flight physics
// Canvas-based rendering with real-ish flight physics
// ═══════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};
// ═══ End Guard ═══

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('migration'))) {

(function() {
  'use strict';

  // ── Module-scoped bird drawing ──
  function drawBird(c, x, y, size, flapPhase, facing, color, isDark) {
    c.save();
    c.translate(x, y);
    c.scale(facing, 1);
    var wa = Math.sin(flapPhase) * 0.4;
    // Body
    c.fillStyle = color || (isDark ? '#94a3b8' : '#475569');
    c.beginPath();
    c.ellipse(0, 0, size * 1.2, size * 0.4, 0, 0, Math.PI * 2);
    c.fill();
    // Head
    c.beginPath();
    c.arc(size, -size * 0.1, size * 0.25, 0, Math.PI * 2);
    c.fill();
    // Beak
    c.fillStyle = '#f59e0b';
    c.beginPath();
    c.moveTo(size * 1.25, -size * 0.1);
    c.lineTo(size * 1.5, 0);
    c.lineTo(size * 1.25, size * 0.05);
    c.closePath();
    c.fill();
    // Wings
    c.fillStyle = color || (isDark ? '#64748b' : '#334155');
    c.save(); c.rotate(-wa);
    c.beginPath();
    c.moveTo(-size * 0.2, 0);
    c.quadraticCurveTo(-size * 0.5, -size * 1.2, -size * 1.5, -size * 0.3);
    c.quadraticCurveTo(-size * 0.8, -size * 0.1, -size * 0.2, 0);
    c.fill(); c.restore();
    c.save(); c.rotate(wa);
    c.beginPath();
    c.moveTo(-size * 0.2, 0);
    c.quadraticCurveTo(-size * 0.5, size * 1.2, -size * 1.5, size * 0.3);
    c.quadraticCurveTo(-size * 0.8, size * 0.1, -size * 0.2, 0);
    c.fill(); c.restore();
    c.restore();
  }

  // ── Utility: clamp ──
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // ── Utility: lerp ──
  function lerp(a, b, t) { return a + (b - a) * t; }

  // ── Utility: distance ──
  function dist(x1, y1, x2, y2) { return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)); }

  // ── Migration species data ──
  var SPECIES = [
    { id: 'canada_goose', name: 'Canada Goose', emoji: '\uD83E\uDEBF', flyway: 'atlantic', distance: 3000, speed: 40, altitude: 3000, breedingRange: 'Northern Canada & Alaska', winterRange: 'Southern US & Mexico', funFact: 'Canada Geese can fly up to 1,500 miles in 24 hours during migration. They mate for life.', formation: 'V-formation' },
    { id: 'arctic_tern', name: 'Arctic Tern', emoji: '\uD83D\uDD4A\uFE0F', flyway: 'atlantic', distance: 44000, speed: 25, altitude: 1500, breedingRange: 'Arctic Circle', winterRange: 'Antarctic', funFact: 'Arctic Terns see two summers per year and more daylight than any other creature. Their migration is the longest of any animal.', formation: 'Loose flock' },
    { id: 'ruby_hummingbird', name: 'Ruby-throated Hummingbird', emoji: '\uD83D\uDC26', flyway: 'mississippi', distance: 3000, speed: 30, altitude: 500, breedingRange: 'Eastern North America', winterRange: 'Central America', funFact: 'This tiny bird weighing just 3g flies 500 miles non-stop across the Gulf of Mexico. It beats its wings 53 times per second.', formation: 'Solo' },
    { id: 'snow_goose', name: 'Snow Goose', emoji: '\uD83E\uDEBF', flyway: 'central', distance: 5000, speed: 50, altitude: 7500, breedingRange: 'Arctic tundra', winterRange: 'Southern US', funFact: 'Snow Geese have increased from 2 million to 15 million birds since the 1970s, actually damaging their Arctic breeding grounds.', formation: 'V-formation' },
    { id: 'peregrine', name: 'Peregrine Falcon', emoji: '\uD83E\uDD85', flyway: 'pacific', distance: 15500, speed: 60, altitude: 3500, breedingRange: 'Arctic tundra', winterRange: 'South America', funFact: 'The Peregrine Falcon is the fastest animal on Earth, reaching over 240 mph (386 km/h) in a hunting stoop (dive).', formation: 'Solo' },
    { id: 'sandhill_crane', name: 'Sandhill Crane', emoji: '\uD83E\uDDA9', flyway: 'central', distance: 6000, speed: 35, altitude: 6000, breedingRange: 'Northern US & Canada', winterRange: 'Southern US & Mexico', funFact: 'Sandhill Cranes are among the oldest living bird species, with fossils dating back 2.5 million years. They dance to bond with mates.', formation: 'V-formation' },
    { id: 'monarch', name: 'Monarch Butterfly', emoji: '\uD83E\uDD8B', flyway: 'central', distance: 3000, speed: 12, altitude: 1200, breedingRange: 'Eastern North America', winterRange: 'Central Mexico (oyamel fir forests)', funFact: 'No single Monarch makes the full round trip. It takes 4 generations to complete the cycle. Only the "super generation" migrates south.', formation: 'Swarm' },
    { id: 'bartailed_godwit', name: 'Bar-tailed Godwit', emoji: '\uD83D\uDC26', flyway: 'pacific', distance: 7000, speed: 55, altitude: 6000, breedingRange: 'Alaska', winterRange: 'New Zealand', funFact: 'In 2007, a female Bar-tailed Godwit flew 7,145 miles non-stop from Alaska to New Zealand in 9 days without eating, drinking, or sleeping.', formation: 'V-formation' }
  ];

  // ── Wing types for aerodynamics tab ──
  var WING_TYPES = [
    { id: 'soaring', name: 'Soaring (Eagle)', emoji: '\uD83E\uDD85', aspectRatio: 'High (7:1)', shape: 'Long, narrow, slotted tips', liftCoeff: 1.6, dragCoeff: 0.02, bestAngle: 5, stallAngle: 16, desc: 'Long narrow wings maximize lift-to-drag ratio for effortless soaring. Slotted wingtip feathers reduce induced drag by spreading vortices. Eagles can soar for hours without a single flap, using thermals and ridge lift.' },
    { id: 'flapping', name: 'Flapping (Goose)', emoji: '\uD83E\uDEBF', aspectRatio: 'Medium (5:1)', shape: 'Medium, broad, rounded', liftCoeff: 1.4, dragCoeff: 0.035, bestAngle: 6, stallAngle: 14, desc: 'Broad wings provide good lift at moderate speeds. Geese use powered flight with steady flapping for long-distance migration. The V-formation reduces drag by 65% for trailing birds via upwash exploitation.' },
    { id: 'hovering', name: 'Hovering (Hummingbird)', emoji: '\uD83D\uDC26', aspectRatio: 'Low (3:1)', shape: 'Short, figure-8 stroke', liftCoeff: 1.8, dragCoeff: 0.08, bestAngle: 40, stallAngle: 90, desc: 'Hummingbird wings rotate at the shoulder, allowing a figure-8 stroke pattern that generates lift on both the downstroke AND upstroke. They can fly backwards, sideways, and hover in place. Wing beat: 50-80 times per second.' },
    { id: 'speed', name: 'Speed (Falcon)', emoji: '\uD83E\uDD85', aspectRatio: 'Medium-High (6:1)', shape: 'Swept back, pointed', liftCoeff: 1.2, dragCoeff: 0.018, bestAngle: 4, stallAngle: 12, desc: 'Swept-back pointed wings minimize drag at high speeds. During a stoop (dive), Peregrines tuck their wings to form a teardrop shape, reaching 240+ mph. A small tubercle on the beak disrupts airflow to prevent suffocation at speed.' }
  ];

  // ── Navigation methods data ──
  var NAV_METHODS = [
    { id: 'magnetic', icon: '\uD83E\uDDED', name: 'Magnetic Sense', desc: 'Birds have magnetite crystals in their upper beaks connected to the trigeminal nerve. These crystals align with Earth\'s magnetic field like tiny compasses. Some species also have cryptochrome proteins in their eyes that may let them literally SEE magnetic field lines as colored overlays on their vision.' },
    { id: 'stars', icon: '\u2B50', name: 'Star Navigation', desc: 'Nocturnal migrants (warblers, thrushes) use star patterns to navigate. Experiments in planetariums showed that birds orient to the rotation center of the night sky (near Polaris). Young birds learn star patterns during their first summer — they aren\'t born knowing them.' },
    { id: 'sun', icon: '\u2600\uFE0F', name: 'Sun Compass', desc: 'Birds track the sun\'s position and use an internal circadian clock to compensate for its movement across the sky. Experiments with clock-shifted birds (kept in artificially lit rooms) showed they navigate in predictably wrong directions, proving the sun-compass mechanism.' },
    { id: 'landmarks', icon: '\uD83C\uDFD4\uFE0F', name: 'Landmarks', desc: 'Experienced migrants follow visual landmarks: coastlines, mountain ranges, rivers, and highways. Pigeons even follow roads and make turns at intersections. This "pilotage" navigation is learned over multiple migration trips and passed down through flock experience.' },
    { id: 'smell', icon: '\uD83D\uDC43', name: 'Smell Navigation', desc: 'Seabirds (petrels, albatrosses) navigate using olfactory maps of ocean scents. Dimethyl sulfide released by phytoplankton marks productive feeding areas. Homing pigeons also use smell — blocking their nostrils impairs their ability to find home.' },
    { id: 'inherited', icon: '\uD83E\uDDEC', name: 'Inherited Maps', desc: 'Some migration routes are genetically encoded. Young Cuckoos raised by foster parents of other species still migrate to the correct wintering grounds — a place they\'ve never been, following a route they were never taught. The CLOCK gene and ADCYAP1 gene are linked to migratory restlessness.' }
  ];

  // ── Beaufort scale labels ──
  var BEAUFORT = [
    { min: 0, max: 1, label: 'Calm' },
    { min: 1, max: 7, label: 'Light Breeze' },
    { min: 8, max: 18, label: 'Moderate' },
    { min: 19, max: 31, label: 'Fresh' },
    { min: 32, max: 40, label: 'Strong' },
    { min: 41, max: 50, label: 'Gale' }
  ];

  function getBeaufort(speed) {
    for (var i = 0; i < BEAUFORT.length; i++) {
      if (speed <= BEAUFORT[i].max) return BEAUFORT[i].label;
    }
    return 'Gale';
  }

  // ── Formation physics constants ──
  var FORMATION_FACTS = [
    { title: 'Upwash Zone', text: 'When a bird flaps, it creates a downward push of air (downwash) directly behind it and an upward push (upwash) at roughly 30\u00B0 to either side of the wingtip. Trailing birds position themselves in this upwash zone to get free lift.' },
    { title: 'Energy Savings', text: 'Research on pelicans (Weimerskirch et al., 2001) showed that birds in V-formation have lower heart rates and glide more often. Trailing birds save up to 65% of their energy compared to flying alone.' },
    { title: 'Leader Rotation', text: 'Leading is exhausting \u2014 the front bird gets no upwash benefit and faces full air resistance. In nature, birds rotate leadership every few minutes. Each bird serves roughly equal time at the front.' },
    { title: 'Flap Timing', text: 'Birds in formation synchronize their wing beats with the bird ahead, adjusted by a phase delay. This maximizes the upwash capture. High-speed cameras show flap timing accuracy within 0.1 seconds.' },
    { title: 'Communication', text: 'Geese honk during flight to communicate position and encourage the leader. The V-shape also gives each bird an unobstructed view of the bird ahead, helping maintain spacing.' },
    { title: 'Vortex Physics', text: 'Each wingtip generates a spinning vortex of air (like a tiny tornado). The air on the outer edge of the vortex moves upward. By flying in the upwash of the preceding bird\'s wingtip vortex, trailing birds effectively surf on rising air.' }
  ];

  // ── Migration records ──
  var MIGRATION_RECORDS = [
    { species: 'Bar-tailed Godwit', record: 'Longest non-stop flight', value: '7,145 miles (Alaska to New Zealand, 9 days without rest)', year: 2007 },
    { species: 'Arctic Tern', record: 'Longest annual migration', value: '44,000 miles pole-to-pole round trip', year: 'Annual' },
    { species: 'Great Snipe', record: 'Fastest migration', value: '4,200 miles at 60 mph average', year: 2011 },
    { species: 'Ruppell\'s Griffon Vulture', record: 'Highest flight altitude', value: '37,000 feet (hit by airplane)', year: 1973 },
    { species: 'Ruby-throated Hummingbird', record: 'Smallest migrant', value: '500 miles non-stop across Gulf of Mexico at 3 grams', year: 'Annual' },
    { species: 'Common Swift', record: 'Longest continuous flight', value: '10 months airborne without landing', year: 2016 }
  ];

  // ── Threats to migratory birds ──
  var MIGRATION_THREATS = [
    { threat: 'Light Pollution', emoji: '\uD83D\uDCA1', desc: 'Artificial lights disorient nocturnal migrants, causing building collisions. Up to 1 billion birds die from building strikes annually in the US alone. Lights Out programs in major cities reduce deaths by 80%.' },
    { threat: 'Habitat Loss', emoji: '\uD83C\uDFD7\uFE0F', desc: 'Wetland drainage and deforestation destroy critical stopover sites where birds rest and refuel. Without these rest stops, birds cannot complete their journeys. 50% of North American wetlands have been lost since 1900.' },
    { threat: 'Climate Change', emoji: '\uD83C\uDF21\uFE0F', desc: 'Warming temperatures shift the timing of insect emergence and plant flowering, creating mismatches with bird arrival. Birds may arrive at breeding grounds to find their food sources have already peaked.' },
    { threat: 'Wind Turbines', emoji: '\uD83C\uDF2C\uFE0F', desc: 'Poorly sited wind farms can kill migratory birds, especially raptors. Modern solutions include radar-activated shutdown systems and careful placement away from migration corridors.' },
    { threat: 'Cat Predation', emoji: '\uD83D\uDC08', desc: 'Domestic and feral cats kill an estimated 1.3-4 billion birds per year in the US. Keeping cats indoors is one of the simplest conservation actions for birds.' }
  ];

  // ── Draw a simple compass rose ──
  function drawCompassRose(c, cx, cy, radius, windAngle, isDark) {
    c.save();
    c.translate(cx, cy);

    // Outer ring
    c.beginPath();
    c.arc(0, 0, radius, 0, Math.PI * 2);
    c.fillStyle = isDark ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.85)';
    c.fill();
    c.strokeStyle = isDark ? '#475569' : '#cbd5e1';
    c.lineWidth = 1.5;
    c.stroke();

    // Cardinal tick marks
    var dirs = ['E', 'N', 'W', 'S'];
    var angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    c.font = 'bold 8px system-ui';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (var di = 0; di < 4; di++) {
      var a = -angles[di];
      // Tick
      c.beginPath();
      c.moveTo(Math.cos(a) * (radius - 6), Math.sin(a) * (radius - 6));
      c.lineTo(Math.cos(a) * (radius - 1), Math.sin(a) * (radius - 1));
      c.strokeStyle = isDark ? '#94a3b8' : '#64748b';
      c.lineWidth = 1;
      c.stroke();
      // Label
      c.fillStyle = isDark ? '#94a3b8' : '#64748b';
      c.fillText(dirs[di], Math.cos(a) * (radius - 12), Math.sin(a) * (radius - 12));
    }

    // Wind arrow
    c.rotate(-windAngle * Math.PI / 180);
    c.beginPath();
    c.moveTo(radius * 0.65, 0);
    c.lineTo(-radius * 0.3, -radius * 0.2);
    c.lineTo(-radius * 0.15, 0);
    c.lineTo(-radius * 0.3, radius * 0.2);
    c.closePath();
    c.fillStyle = '#0ea5e9';
    c.fill();

    c.restore();
  }

  // ── Format large numbers ──
  function fmtNum(n) {
    if (n >= 1000) return Math.round(n / 100) / 10 + 'k';
    return String(n);
  }

  // ════════════════════════════════════════════
  // REGISTER TOOL
  // ════════════════════════════════════════════
  window.StemLab.registerTool('migration', {
    icon: '\uD83E\uDEBF',
    label: 'Migration & Wind Lab',
    desc: 'V-formation aerodynamics, wind currents, bird migration routes & flight physics',
    color: 'sky',
    category: 'science',
    questHooks: [
      { id: 'form_v', label: 'Form a perfect V-formation', icon: '\uD83E\uDEBF', check: function(d) { return d.perfectVFormed; }, progress: function(d) { return d.perfectVFormed ? '\u2713' : '\u2014'; } },
      { id: 'plan_route', label: 'Plan a migration route', icon: '\uD83D\uDDFA\uFE0F', check: function(d) { return (d.routesPlanned || 0) >= 1; }, progress: function(d) { return (d.routesPlanned || 0) + '/1'; } },
      { id: 'ride_thermal', label: 'Help a bird ride a thermal updraft', icon: '\uD83C\uDF00', check: function(d) { return d.thermalRidden; }, progress: function(d) { return d.thermalRidden ? '\u2713' : '\u2014'; } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var useState = React.useState;
      var useEffect = React.useEffect;
      var useRef = React.useRef;
      var useCallback = React.useCallback;
      var d = (ctx.toolData && ctx.toolData['migration']) || {};
      var upd = function(key, val) { ctx.update('migration', key, val); };
      var updMulti = function(obj) { ctx.updateMulti('migration', obj); };
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;
      var t = ctx.t;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var awardXP = ctx.awardXP;
      var celebrate = ctx.celebrate;
      var beep = ctx.beep;
      var isDark = ctx.isDark;
      var isContrast = ctx.isContrast;
      var gradeLevel = ctx.gradeLevel;
      var setStemLabTool = ctx.setStemLabTool;
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;

      // ── Tab state ──
      var tab = d.tab || 'vformation';
      var TABS = [
        { id: 'vformation', label: 'V-Formation', icon: '\uD83E\uDEBF' },
        { id: 'wind', label: 'Wind Currents', icon: '\uD83C\uDF2C\uFE0F' },
        { id: 'routes', label: 'Migration Routes', icon: '\uD83D\uDDFA\uFE0F' },
        { id: 'aero', label: 'Aerodynamics', icon: '\u2708\uFE0F' },
        { id: 'navigate', label: 'Weather & Nav', icon: '\uD83E\uDDED' }
      ];

      // ── Theme helpers ──
      var bg = isDark ? 'bg-slate-900' : 'bg-white';
      var cardBg = isDark ? 'bg-slate-800' : 'bg-slate-50';
      var borderCol = isDark ? 'border-slate-700' : 'border-slate-200';
      var textPrimary = isDark ? 'text-white' : 'text-slate-900';
      var textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
      var textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
      var accent = 'text-sky-500';
      var accentBg = isDark ? 'bg-sky-900/40' : 'bg-sky-50';
      var btnPrimary = 'bg-sky-600 hover:bg-sky-700 text-white';
      var btnSecondary = isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700';

      // ── Reduced motion ──
      var reducedMotionRef = useRef(false);
      useEffect(function() {
        var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
        reducedMotionRef.current = mq && mq.matches;
        if (mq && mq.addEventListener) {
          var handler = function(e) { reducedMotionRef.current = e.matches; };
          mq.addEventListener('change', handler);
          return function() { mq.removeEventListener('change', handler); };
        }
      }, []);

      // ══════════════════════════════════════════
      // HOISTED HOOKS — all useRef/useEffect must be called unconditionally
      // (React Rules of Hooks: same number in same order every render)
      // ══════════════════════════════════════════
      // Tab 1: V-Formation refs
      var _vfCanvasRef = useRef(null);
      var _vfAnimRef = useRef(null);
      var _vfBirdsRef = useRef(null);
      var _vfDragRef = useRef({ active: false, idx: -1, offX: 0, offY: 0 });
      var _vfTimeRef = useRef(0);
      // Tab 2: Wind Currents refs
      var _wcCanvasRef = useRef(null);
      var _wcAnimRef = useRef(null);
      var _wcParticlesRef = useRef(null);
      var _wcObjectsRef = useRef(null);
      var _wcBirdsRef = useRef([]);
      var _wcTimeRef = useRef(0);
      // Tab 3: Routes refs
      var _rtCanvasRef = useRef(null);
      var _rtAnimRef = useRef(null);
      var _rtTimeRef = useRef(0);
      // Tab 4: Aero refs
      var _arCanvasRef = useRef(null);
      var _arAnimRef = useRef(null);
      var _arTimeRef = useRef(0);
      // Tab 5: Navigate refs
      var _nvCanvasRef = useRef(null);
      var _nvAnimRef = useRef(null);
      var _nvTimeRef = useRef(0);
      // Live values ref — updated every render so animation loops read fresh state
      var _liveVals = useRef({});
      _liveVals.current = {
        birdCount: d.vBirdCount || 9, simSpeed: d.vSpeed || 1,
        windDir: d.windDir || 0, windSpeed: d.windSpeed || 15,
        showStreamlines: d.showStreamlines, placingObj: d.placingObj,
        selectedSpecies: d.selectedSpecies, aoa: d.aoa || 5,
        selectedWing: d.selectedWing || 'goose', isDark: isDark, tab: tab
      };

      // ══════════════════════════════════════════
      // TAB 1: V-FORMATION SIMULATOR
      // ══════════════════════════════════════════
      function renderVFormation() {
        var canvasRef = _vfCanvasRef;
        var animRef = _vfAnimRef;
        var birdsRef = _vfBirdsRef;
        var dragRef = _vfDragRef;
        var timeRef = _vfTimeRef;

        var birdCount = d.vBirdCount || 9;
        var simSpeed = d.vSpeed || 1;
        var leaderRotations = d.vLeaderRotations || 0;

        // Initialize birds
        function makeFlock(count) {
          var birds = [];
          for (var i = 0; i < count; i++) {
            birds.push({
              x: 300 + (Math.random() - 0.5) * 200,
              y: 200 + (Math.random() - 0.5) * 150,
              vx: 0, vy: 0,
              energy: 80 + Math.random() * 20,
              flapPhase: Math.random() * Math.PI * 2,
              role: i === 0 ? 'leader' : 'follower'
            });
          }
          return birds;
        }

        function makeVFormation(count) {
          var birds = [];
          var cx = 300, cy = 220;
          var spacing = 42;
          var angle = Math.PI / 6; // 30 deg
          birds.push({ x: cx, y: cy, vx: 0, vy: 0, energy: 100, flapPhase: 0, role: 'leader' });
          for (var i = 1; i < count; i++) {
            var side = (i % 2 === 0) ? 1 : -1;
            var rank = Math.ceil(i / 2);
            birds.push({
              x: cx - rank * spacing * Math.cos(angle),
              y: cy + side * rank * spacing * Math.sin(angle),
              vx: 0, vy: 0,
              energy: 100,
              flapPhase: rank * 0.4,
              role: 'follower'
            });
          }
          return birds;
        }

        // Check if formation is good
        function calcFormationEfficiency(birds) {
          if (!birds || birds.length < 2) return 0;
          var leaderIdx = -1;
          for (var i = 0; i < birds.length; i++) {
            if (birds[i].role === 'leader') { leaderIdx = i; break; }
          }
          if (leaderIdx < 0) leaderIdx = 0;
          var leader = birds[leaderIdx];
          var inUpwash = 0;
          for (var j = 0; j < birds.length; j++) {
            if (j === leaderIdx) continue;
            // Check if in upwash zone of any bird ahead
            var hasUpwash = false;
            for (var k = 0; k < birds.length; k++) {
              if (k === j) continue;
              var dx = birds[j].x - birds[k].x;
              var dy = birds[j].y - birds[k].y;
              var d2 = Math.sqrt(dx * dx + dy * dy);
              if (d2 < 5 || d2 > 80) continue;
              // Bird j is behind bird k and offset to side
              if (dx < -10) {
                var absAngle = Math.abs(Math.atan2(Math.abs(dy), Math.abs(dx)));
                if (absAngle > 0.3 && absAngle < 0.8) {
                  hasUpwash = true;
                  break;
                }
              }
            }
            if (hasUpwash) inUpwash++;
          }
          return Math.round((inUpwash / (birds.length - 1)) * 100);
        }

        // Canvas init via ref callback (avoids useEffect inside conditional render)
        var _vfInitCanvas = function(canvas) {
          if (!canvas) return;
          canvasRef.current = canvas;
          if (canvas._vfInit) return;
          canvas._vfInit = true;
          var c = canvas.getContext('2d');
          var dpr = window.devicePixelRatio || 1;
          var W = canvas.parentElement ? canvas.parentElement.clientWidth : 620;
          var H = 380;
          canvas.width = W * dpr;
          canvas.height = H * dpr;
          canvas.style.width = W + 'px';
          canvas.style.height = H + 'px';
          c.setTransform(dpr, 0, 0, dpr, 0, 0);

          if (!birdsRef.current || birdsRef.current.length !== birdCount) {
            birdsRef.current = makeFlock(birdCount);
          }
          var birds = birdsRef.current;

          // Vortex particles
          var vortices = [];
          for (var vi = 0; vi < 80; vi++) {
            vortices.push({ x: Math.random() * W, y: Math.random() * H, vx: -1 - Math.random(), vy: (Math.random() - 0.5) * 0.3, life: Math.random() });
          }

          // Wind background particles
          var windParts = [];
          for (var wi = 0; wi < 60; wi++) {
            windParts.push({ x: Math.random() * W, y: Math.random() * H, speed: 0.5 + Math.random() * 1.5, size: 1 + Math.random() });
          }

          function frame() {
            if (reducedMotionRef.current) {
              c.clearRect(0, 0, W, H);
              renderFrame(c, W, H, birds, vortices, windParts, 0);
              return;
            }
            // Read fresh values from live ref (updated every React render)
            var lv = _liveVals.current;
            // Dynamically update bird count if changed
            if (birdsRef.current && birdsRef.current.length !== lv.birdCount) {
              birdsRef.current = makeFlock(lv.birdCount);
              birds = birdsRef.current;
            }
            timeRef.current += 0.016 * lv.simSpeed;
            c.clearRect(0, 0, W, H);
            renderFrame(c, W, H, birds, vortices, windParts, timeRef.current);
            animRef.current = requestAnimationFrame(frame);
          }

          function renderFrame(c, W, H, birds, vortices, windParts, time) {
            // Sky gradient
            var skyGrad = c.createLinearGradient(0, 0, 0, H);
            if (isDark) {
              skyGrad.addColorStop(0, '#0f172a');
              skyGrad.addColorStop(0.5, '#1e293b');
              skyGrad.addColorStop(1, '#334155');
            } else {
              skyGrad.addColorStop(0, '#bae6fd');
              skyGrad.addColorStop(0.5, '#e0f2fe');
              skyGrad.addColorStop(1, '#f0f9ff');
            }
            c.fillStyle = skyGrad;
            c.fillRect(0, 0, W, H);

            // Clouds
            c.globalAlpha = isDark ? 0.1 : 0.3;
            c.fillStyle = isDark ? '#475569' : '#ffffff';
            var cloudOff = (time * 8) % (W + 200);
            for (var ci = 0; ci < 4; ci++) {
              var cx2 = ((ci * 180 + cloudOff) % (W + 200)) - 80;
              var cy2 = 30 + ci * 50 + Math.sin(ci * 2.1) * 20;
              c.beginPath();
              c.ellipse(cx2, cy2, 60 + ci * 10, 18 + ci * 3, 0, 0, Math.PI * 2);
              c.fill();
              c.beginPath();
              c.ellipse(cx2 + 30, cy2 - 8, 40, 14, 0, 0, Math.PI * 2);
              c.fill();
            }
            c.globalAlpha = 1;

            // Wind particles
            c.fillStyle = isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.15)';
            for (var wp = 0; wp < windParts.length; wp++) {
              var p = windParts[wp];
              p.x -= p.speed * simSpeed;
              if (p.x < -5) { p.x = W + 5; p.y = Math.random() * H; }
              c.beginPath();
              c.moveTo(p.x, p.y);
              c.lineTo(p.x + p.size * 6, p.y);
              c.lineWidth = p.size * 0.5;
              c.strokeStyle = isDark ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.12)';
              c.stroke();
            }

            // Update bird physics
            var leaderIdx = 0;
            for (var bi = 0; bi < birds.length; bi++) {
              if (birds[bi].role === 'leader') { leaderIdx = bi; break; }
            }

            for (var bi2 = 0; bi2 < birds.length; bi2++) {
              var b = birds[bi2];
              b.flapPhase += (0.06 + simSpeed * 0.03);

              // Energy depletion
              var inUpwash = false;
              if (b.role !== 'leader') {
                for (var k = 0; k < birds.length; k++) {
                  if (k === bi2) continue;
                  var ddx = b.x - birds[k].x;
                  var ddy = b.y - birds[k].y;
                  var dd = Math.sqrt(ddx * ddx + ddy * ddy);
                  if (dd < 5 || dd > 80) continue;
                  if (ddx < -10) {
                    var ang = Math.abs(Math.atan2(Math.abs(ddy), Math.abs(ddx)));
                    if (ang > 0.3 && ang < 0.8) { inUpwash = true; break; }
                  }
                }
              }

              var depletionRate = b.role === 'leader' ? 0.012 : (inUpwash ? 0.004 : 0.012);
              b.energy = Math.max(0, b.energy - depletionRate * simSpeed);

              // Leader rotation when energy low
              if (b.role === 'leader' && b.energy < 30) {
                b.role = 'follower';
                // Find next highest energy follower
                var bestIdx = -1;
                var bestE = -1;
                for (var ni = 0; ni < birds.length; ni++) {
                  if (ni === bi2) continue;
                  if (birds[ni].energy > bestE) { bestE = birds[ni].energy; bestIdx = ni; }
                }
                if (bestIdx >= 0) {
                  birds[bestIdx].role = 'leader';
                  upd('vLeaderRotations', (leaderRotations || 0) + 1);
                }
              }

              // Slow energy recovery
              b.energy = Math.min(100, b.energy + 0.003 * simSpeed);
            }

            // Vortex trail particles behind each bird's wingtips
            c.globalAlpha = 0.15;
            for (var vbi = 0; vbi < birds.length; vbi++) {
              var vb = birds[vbi];
              var vortCol = isDark ? 'rgba(125,211,252,0.3)' : 'rgba(56,189,248,0.15)';
              for (var trail = 0; trail < 3; trail++) {
                var tx = vb.x - 15 - trail * 8 + Math.sin(time * 3 + trail + vbi) * 3;
                var ty1 = vb.y - 10 + Math.cos(time * 4 + trail) * 4;
                var ty2 = vb.y + 10 + Math.cos(time * 4 + trail + 1) * 4;
                c.fillStyle = vortCol;
                c.beginPath(); c.arc(tx, ty1, 2, 0, Math.PI * 2); c.fill();
                c.beginPath(); c.arc(tx, ty2, 2, 0, Math.PI * 2); c.fill();
              }
            }
            c.globalAlpha = 1;

            // Show upwash zones (faint cones behind each bird)
            c.globalAlpha = 0.06;
            for (var uzi = 0; uzi < birds.length; uzi++) {
              var uzb = birds[uzi];
              // Draw two upwash cones (one per wing)
              for (var side2 = -1; side2 <= 1; side2 += 2) {
                c.beginPath();
                c.moveTo(uzb.x - 5, uzb.y + side2 * 10);
                c.lineTo(uzb.x - 70, uzb.y + side2 * 35);
                c.lineTo(uzb.x - 70, uzb.y + side2 * 15);
                c.closePath();
                c.fillStyle = '#22c55e';
                c.fill();
              }
              // Draw downwash zone (directly behind, red)
              c.beginPath();
              c.moveTo(uzb.x - 5, uzb.y - 8);
              c.lineTo(uzb.x - 60, uzb.y - 12);
              c.lineTo(uzb.x - 60, uzb.y + 12);
              c.lineTo(uzb.x - 5, uzb.y + 8);
              c.closePath();
              c.fillStyle = '#ef4444';
              c.fill();
            }
            c.globalAlpha = 1;

            // Draw birds
            for (var di = 0; di < birds.length; di++) {
              var db = birds[di];
              var birdColor = db.role === 'leader' ? (isDark ? '#fbbf24' : '#d97706') : null;
              drawBird(c, db.x, db.y, 10, db.flapPhase, -1, birdColor, isDark);

              // Energy bar
              var barW = 24, barH = 3;
              var barX = db.x - barW / 2;
              var barY = db.y - 18;
              c.fillStyle = 'rgba(0,0,0,0.3)';
              c.fillRect(barX, barY, barW, barH);
              var ePct = db.energy / 100;
              var eColor = ePct > 0.6 ? '#22c55e' : ePct > 0.3 ? '#eab308' : '#ef4444';
              c.fillStyle = eColor;
              c.fillRect(barX, barY, barW * ePct, barH);

              // Leader star
              if (db.role === 'leader') {
                c.fillStyle = isDark ? '#fbbf24' : '#d97706';
                c.font = '10px system-ui';
                c.textAlign = 'center';
                c.fillText('\u2605', db.x, db.y - 22);
              }
            }

            // Efficiency display
            var eff = calcFormationEfficiency(birds);
            c.fillStyle = isDark ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.85)';
            c.fillRect(8, 8, 170, 46);
            c.strokeStyle = isDark ? '#334155' : '#cbd5e1';
            c.lineWidth = 1;
            c.strokeRect(8, 8, 170, 46);
            c.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
            c.font = 'bold 12px system-ui';
            c.textAlign = 'left';
            c.fillText('Formation Efficiency: ' + eff + '%', 14, 26);
            c.font = '10px system-ui';
            c.fillStyle = isDark ? '#94a3b8' : '#64748b';
            c.fillText('Energy Savings: ' + Math.round(eff * 0.65) + '%', 14, 40);
            c.fillText('Leader Rotations: ' + (leaderRotations || 0), 14, 52);

            // Check for perfect V
            if (eff >= 85 && !d.perfectVFormed) {
              upd('perfectVFormed', true);
              if (celebrate) celebrate();
              if (awardXP) awardXP(20);
              if (addToast) addToast('Perfect V-formation achieved! +20 XP', 'success');
              if (announceToSR) announceToSR('Perfect V formation achieved. 20 experience points awarded.');
            }
          }

          // Mouse handlers for dragging birds
          function getMousePos(e) {
            var rect = canvas.getBoundingClientRect();
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
          }

          function onMouseDown(e) {
            var pos = getMousePos(e);
            var birds2 = birdsRef.current;
            if (!birds2) return;
            for (var i = 0; i < birds2.length; i++) {
              if (dist(pos.x, pos.y, birds2[i].x, birds2[i].y) < 18) {
                dragRef.current = { active: true, idx: i, offX: birds2[i].x - pos.x, offY: birds2[i].y - pos.y };
                break;
              }
            }
          }
          function onMouseMove(e) {
            if (!dragRef.current.active) return;
            var pos = getMousePos(e);
            var birds2 = birdsRef.current;
            if (birds2 && birds2[dragRef.current.idx]) {
              birds2[dragRef.current.idx].x = pos.x + dragRef.current.offX;
              birds2[dragRef.current.idx].y = pos.y + dragRef.current.offY;
            }
          }
          function onMouseUp() {
            dragRef.current.active = false;
          }

          canvas.addEventListener('mousedown', onMouseDown);
          canvas.addEventListener('mousemove', onMouseMove);
          canvas.addEventListener('mouseup', onMouseUp);
          canvas.addEventListener('mouseleave', onMouseUp);

          // Touch support
          function getTouchPos(e) {
            var rect = canvas.getBoundingClientRect();
            var touch = e.touches[0] || e.changedTouches[0];
            return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
          }
          function onTouchStart(e) {
            e.preventDefault();
            var pos = getTouchPos(e);
            var birds2 = birdsRef.current;
            if (!birds2) return;
            for (var i = 0; i < birds2.length; i++) {
              if (dist(pos.x, pos.y, birds2[i].x, birds2[i].y) < 24) {
                dragRef.current = { active: true, idx: i, offX: birds2[i].x - pos.x, offY: birds2[i].y - pos.y };
                break;
              }
            }
          }
          function onTouchMove(e) {
            e.preventDefault();
            if (!dragRef.current.active) return;
            var pos = getTouchPos(e);
            var birds2 = birdsRef.current;
            if (birds2 && birds2[dragRef.current.idx]) {
              birds2[dragRef.current.idx].x = pos.x + dragRef.current.offX;
              birds2[dragRef.current.idx].y = pos.y + dragRef.current.offY;
            }
          }
          function onTouchEnd() { dragRef.current.active = false; }

          canvas.addEventListener('touchstart', onTouchStart, { passive: false });
          canvas.addEventListener('touchmove', onTouchMove, { passive: false });
          canvas.addEventListener('touchend', onTouchEnd);

          frame();

          return function() {
            if (animRef.current) cancelAnimationFrame(animRef.current);
            canvas.removeEventListener('mousedown', onMouseDown);
            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('mouseup', onMouseUp);
            canvas.removeEventListener('mouseleave', onMouseUp);
            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchmove', onTouchMove);
            canvas.removeEventListener('touchend', onTouchEnd);
          };
          // Cleanup when canvas unmounts
          var obs = new MutationObserver(function() { if (!document.contains(canvas)) { cancelAnimationFrame(animRef.current); obs.disconnect(); canvas._vfInit = false; } });
          obs.observe(document.body, { childList: true, subtree: true });
        };

        // Read aloud helper
        var vReadAloud = function() {
          if (!callTTS) return;
          callTTS('V formation simulator. Birds fly in a V shape to save energy. The lead bird works hardest because it breaks through the air first. Birds behind it ride on the upwash from the leader\'s wingtips, saving up to 65 percent of their energy. When the leader gets tired, it drops back and another bird takes over. This is called leader rotation. Drag the birds to different positions and see how formation efficiency changes.');
        };

        return h('div', { className: 'space-y-3' },
          // Read aloud button
          callTTS && h('div', { className: 'flex justify-end' },
            h('button', {
              className: 'px-2.5 py-1 rounded-lg text-[10px] font-medium ' + btnSecondary,
              'aria-label': 'Read V-Formation explanation aloud',
              onClick: vReadAloud
            }, '\uD83D\uDD0A Read Aloud')
          ),

          // Canvas
          h('div', { className: 'rounded-xl overflow-hidden border ' + borderCol },
            h('canvas', { 'aria-label': 'Migration visualization',
              ref: _vfInitCanvas,
              role: 'img',
              'aria-label': 'V-formation simulator canvas. Drag birds to reposition them. Leader bird shown with star. Energy bars above each bird show current energy level. Green cones behind each bird show upwash zones where trailing birds save energy. Red zone directly behind shows downwash area.',
              tabIndex: 0,
              onKeyDown: function(e) {
                if (e.key === 'v' || e.key === 'V') {
                  birdsRef.current = makeVFormation(birdCount);
                  if (announceToSR) announceToSR('Auto-formed V formation');
                } else if (e.key === 's' || e.key === 'S') {
                  birdsRef.current = makeFlock(birdCount);
                  if (announceToSR) announceToSR('Flock scattered');
                }
              },
              style: { width: '100%', cursor: 'grab', display: 'block' }
            })
          ),

          // Controls
          h('div', { className: 'flex flex-wrap gap-2 items-center' },
            h('button', {
              className: 'px-3 py-1.5 rounded-lg text-xs font-bold ' + btnPrimary,
              'aria-label': 'Auto-form V formation',
              onClick: function() {
                birdsRef.current = makeVFormation(birdCount);
                if (beep) beep('confirm');
                if (announceToSR) announceToSR('V formation formed automatically');
              }
            }, '\uD83E\uDEBF Auto-Form V'),
            h('button', {
              className: 'px-3 py-1.5 rounded-lg text-xs font-bold ' + btnSecondary,
              'aria-label': 'Scatter birds randomly',
              onClick: function() {
                birdsRef.current = makeFlock(birdCount);
                if (beep) beep('click');
                if (announceToSR) announceToSR('Birds scattered randomly');
              }
            }, '\uD83C\uDF2A\uFE0F Scatter'),

            // Bird count slider
            h('div', { className: 'flex items-center gap-2 ml-auto' },
              h('label', { className: 'text-xs font-medium ' + textSecondary }, 'Birds:'),
              h('input', {
                type: 'range', 'aria-label': 'bird count', min: 5, max: 15, value: birdCount,
                'aria-label': 'Number of birds in flock: ' + birdCount,
                className: 'w-20 accent-sky-500',
                onChange: function(e) {
                  var n = parseInt(e.target.value, 10);
                  upd('vBirdCount', n);
                  birdsRef.current = null;
                }
              }),
              h('span', { className: 'text-xs font-bold ' + textPrimary, 'aria-hidden': 'true' }, birdCount)
            ),

            // Speed slider
            h('div', { className: 'flex items-center gap-2' },
              h('label', { className: 'text-xs font-medium ' + textSecondary }, 'Speed:'),
              h('input', {
                type: 'range', 'aria-label': 'sim speed', min: 0.5, max: 3, step: 0.5, value: simSpeed,
                'aria-label': 'Simulation speed: ' + simSpeed + 'x',
                className: 'w-16 accent-sky-500',
                onChange: function(e) { upd('vSpeed', parseFloat(e.target.value)); }
              }),
              h('span', { className: 'text-xs font-bold ' + textPrimary, 'aria-hidden': 'true' }, simSpeed + 'x')
            )
          ),

          // Info panel
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, '\uD83E\uDEBF How V-Formation Works'),
            h('div', { className: 'text-xs leading-relaxed space-y-2 ' + textSecondary },
              h('p', null, 'When a bird flaps its wings, it creates a rotating vortex of air off each wingtip. The air immediately behind and below the wingtip pushes ', h('strong', null, 'downward'), ' (downwash), but the air to the side pushes ', h('strong', null, 'upward'), ' (upwash).'),
              h('p', null, 'By positioning themselves in the upwash zone \u2014 roughly 30\u00B0 behind and to the side of the bird ahead \u2014 trailing birds get a free boost of rising air. This reduces the energy needed to stay aloft by up to ', h('strong', null, '65%'), '.'),
              h('p', null, 'The leader gets no benefit and tires faster. When its energy drops below 30%, it falls back and another bird takes the lead. This is called ', h('strong', null, 'leader rotation'), '. In nature, every bird takes a turn at the front.'),
              h('p', null, h('em', null, 'Try dragging birds into different positions and watch how formation efficiency and energy savings change! Press V to auto-form, S to scatter.'))
            )
          ),

          // Formation science cards
          h('div', { className: 'space-y-2' },
            h('h3', { className: 'font-bold text-sm ' + textPrimary }, '\uD83D\uDD2C Formation Science'),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
              FORMATION_FACTS.map(function(fact, fi) {
                var isExpanded = d.expandedFact === fi;
                return h('div', {
                  key: fi,
                  role: 'button',
                  tabIndex: 0,
                  'aria-expanded': isExpanded ? 'true' : 'false',
                  'aria-label': fact.title + '. ' + (isExpanded ? 'Click to collapse.' : 'Click to expand.'),
                  className: 'rounded-lg p-3 border cursor-pointer transition-all ' + (isExpanded ? 'ring-1 ring-sky-400 ' + accentBg + ' border-sky-300' : borderCol + ' ' + cardBg + ' hover:border-sky-200'),
                  onClick: function() { upd('expandedFact', isExpanded ? null : fi); },
                  onKeyDown: function(e) {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); upd('expandedFact', isExpanded ? null : fi); }
                  }
                },
                  h('div', { className: 'flex items-center justify-between' },
                    h('span', { className: 'text-xs font-bold ' + textPrimary }, fact.title),
                    h('span', { className: 'text-[10px] ' + textMuted, 'aria-hidden': 'true' }, isExpanded ? '\u25B2' : '\u25BC')
                  ),
                  isExpanded && h('p', { className: 'text-[10px] mt-2 leading-relaxed ' + textSecondary }, fact.text)
                );
              })
            )
          ),

          // Migration records
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, '\uD83C\uDFC6 Migration World Records'),
            h('div', { className: 'space-y-1.5' },
              MIGRATION_RECORDS.map(function(rec, ri) {
                return h('div', { key: ri, className: 'flex items-start gap-2 text-[10px]' },
                  h('span', { className: 'font-bold min-w-[120px] ' + accent }, rec.species),
                  h('div', null,
                    h('span', { className: 'font-medium ' + textPrimary }, rec.record + ': '),
                    h('span', { className: textSecondary }, rec.value)
                  )
                );
              })
            )
          )
        );
      }

      // ══════════════════════════════════════════
      // TAB 2: WIND CURRENTS SANDBOX
      // ══════════════════════════════════════════
      function renderWindCurrents() {
        var canvasRef = _wcCanvasRef;
        var animRef = _wcAnimRef;
        var particlesRef = _wcParticlesRef;
        var objectsRef = _wcObjectsRef;
        var windBirdsRef = _wcBirdsRef;
        var timeRef = _wcTimeRef;

        var windDir = d.windDir || 0; // degrees, 0=East
        var windSpeed = d.windSpeed || 15;
        var showStreamlines = d.showStreamlines || false;
        var placingObj = d.placingObj || null; // 'mountain', 'building', 'lake', 'thermal', 'forest'

        var PLACEABLE = [
          { id: 'mountain', emoji: '\u26F0\uFE0F', label: 'Mountain', desc: 'Deflects wind upward on windward side' },
          { id: 'building', emoji: '\uD83C\uDFE2', label: 'Building', desc: 'Creates turbulent wake' },
          { id: 'lake', emoji: '\uD83C\uDF0A', label: 'Lake', desc: 'Sea breeze thermal effect' },
          { id: 'thermal', emoji: '\uD83C\uDF00', label: 'Thermal', desc: 'Rising warm air column' },
          { id: 'forest', emoji: '\uD83C\uDF32', label: 'Forest', desc: 'Friction slows wind near surface' }
        ];

        var COMPASS_DIRS = [
          { label: 'E', angle: 0 },
          { label: 'NE', angle: 45 },
          { label: 'N', angle: 90 },
          { label: 'NW', angle: 135 },
          { label: 'W', angle: 180 },
          { label: 'SW', angle: 225 },
          { label: 'S', angle: 270 },
          { label: 'SE', angle: 315 }
        ];

        var _wcInitCanvas = function(canvas) {
          if (!canvas) return;
          canvasRef.current = canvas;
          if (canvas._wcInit) return;
          canvas._wcInit = true;
          var c = canvas.getContext('2d');
          var dpr = window.devicePixelRatio || 1;
          var W = canvas.parentElement ? canvas.parentElement.clientWidth : 620;
          var H = 380;
          canvas.width = W * dpr;
          canvas.height = H * dpr;
          canvas.style.width = W + 'px';
          canvas.style.height = H + 'px';
          c.setTransform(dpr, 0, 0, dpr, 0, 0);

          // Init particles
          if (!particlesRef.current) {
            var parts = [];
            for (var pi = 0; pi < 300; pi++) {
              parts.push({ x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0, age: Math.random() * 100 });
            }
            particlesRef.current = parts;
          }
          if (!objectsRef.current) objectsRef.current = d.windObjects || [];

          function getWindAt(x, y) {
            // Read fresh wind values from live ref (updated every React render)
            var lv = _liveVals.current;
            var windRad2 = lv.windDir * Math.PI / 180;
            var baseVx = Math.cos(windRad2) * lv.windSpeed * 0.06;
            var baseVy = -Math.sin(windRad2) * lv.windSpeed * 0.06;
            var vx = baseVx;
            var vy = baseVy;
            var objs = objectsRef.current || [];
            for (var oi = 0; oi < objs.length; oi++) {
              var obj = objs[oi];
              var dx = x - obj.x;
              var dy = y - obj.y;
              var d2 = Math.sqrt(dx * dx + dy * dy);
              if (d2 < 5) d2 = 5;
              var influence = 1;

              if (obj.type === 'mountain' && d2 < 80) {
                influence = Math.max(0, 1 - d2 / 80);
                // Windward: deflect upward
                var windward = (dx * baseVx + dy * baseVy) < 0;
                if (windward) {
                  vy -= influence * 1.5;
                } else {
                  // Leeward: downdraft + turbulence
                  vy += influence * 1.2;
                  vx += (Math.random() - 0.5) * influence * 0.8;
                }
              } else if (obj.type === 'building' && d2 < 60) {
                influence = Math.max(0, 1 - d2 / 60);
                // Turbulent wake behind building
                var behindBuilding = dx * baseVx > 0;
                if (behindBuilding) {
                  vx += (Math.random() - 0.5) * influence * 2;
                  vy += (Math.random() - 0.5) * influence * 2;
                } else if (d2 < 30) {
                  // Block wind
                  vx *= (1 - influence * 0.8);
                  vy *= (1 - influence * 0.8);
                }
              } else if (obj.type === 'lake' && d2 < 70) {
                influence = Math.max(0, 1 - d2 / 70);
                // Thermal convection: air rises over warm lake
                vy -= influence * 0.8;
                // Convergence toward center
                vx -= (dx / d2) * influence * 0.3;
              } else if (obj.type === 'thermal' && d2 < 60) {
                influence = Math.max(0, 1 - d2 / 60);
                // Strong upward spiral
                vy -= influence * 2.5;
                var spiralAngle = Math.atan2(dy, dx) + Math.PI / 2;
                vx += Math.cos(spiralAngle) * influence * 0.6;
                vy += Math.sin(spiralAngle) * influence * 0.3;
              } else if (obj.type === 'forest' && d2 < 50) {
                influence = Math.max(0, 1 - d2 / 50);
                // Friction: slow wind near surface
                vx *= (1 - influence * 0.5);
                vy *= (1 - influence * 0.3);
              }
            }
            return { vx: vx, vy: vy };
          }

          function frame() {
            timeRef.current += 0.016;
            c.clearRect(0, 0, W, H);

            // Background
            var bgGrad = c.createLinearGradient(0, 0, 0, H);
            if (isDark) {
              bgGrad.addColorStop(0, '#0c4a6e');
              bgGrad.addColorStop(1, '#082f49');
            } else {
              bgGrad.addColorStop(0, '#e0f2fe');
              bgGrad.addColorStop(1, '#f0f9ff');
            }
            c.fillStyle = bgGrad;
            c.fillRect(0, 0, W, H);

            // Ground
            c.fillStyle = isDark ? '#1e3a2f' : '#86efac';
            c.fillRect(0, H - 30, W, 30);
            c.fillStyle = isDark ? '#15803d' : '#4ade80';
            c.fillRect(0, H - 30, W, 2);

            // Draw objects
            var objs = objectsRef.current || [];
            for (var oi = 0; oi < objs.length; oi++) {
              var obj = objs[oi];
              c.font = '28px system-ui';
              c.textAlign = 'center';
              c.textBaseline = 'middle';
              var emoji = '';
              for (var pi2 = 0; pi2 < PLACEABLE.length; pi2++) {
                if (PLACEABLE[pi2].id === obj.type) { emoji = PLACEABLE[pi2].emoji; break; }
              }
              c.fillText(emoji, obj.x, obj.y);
              // Influence radius hint
              c.beginPath();
              var rad = obj.type === 'mountain' ? 80 : obj.type === 'building' ? 60 : obj.type === 'forest' ? 50 : obj.type === 'thermal' ? 60 : 70;
              c.arc(obj.x, obj.y, rad, 0, Math.PI * 2);
              c.strokeStyle = isDark ? 'rgba(125,211,252,0.15)' : 'rgba(14,165,233,0.1)';
              c.lineWidth = 1;
              c.setLineDash([4, 4]);
              c.stroke();
              c.setLineDash([]);
            }

            // Update & draw particles
            var parts = particlesRef.current || [];
            for (var pk = 0; pk < parts.length; pk++) {
              var pp = parts[pk];
              var wind = getWindAt(pp.x, pp.y);
              pp.vx = lerp(pp.vx, wind.vx, 0.1);
              pp.vy = lerp(pp.vy, wind.vy, 0.1);
              pp.x += pp.vx;
              pp.y += pp.vy;
              pp.age += 1;

              // Toroidal wrapping
              if (pp.x < 0) pp.x += W;
              if (pp.x > W) pp.x -= W;
              if (pp.y < 0) pp.y += H;
              if (pp.y > H - 30) pp.y -= (H - 30);

              // Color by speed
              var spd = Math.sqrt(pp.vx * pp.vx + pp.vy * pp.vy);
              var speedNorm = Math.min(1, spd / 3);
              var r2, g2, b2;
              if (speedNorm < 0.4) {
                // slow = light blue
                r2 = 125; g2 = 211; b2 = 252;
              } else if (speedNorm < 0.7) {
                // medium = white
                r2 = lerp(125, 255, (speedNorm - 0.4) / 0.3);
                g2 = lerp(211, 255, (speedNorm - 0.4) / 0.3);
                b2 = 255;
              } else {
                // fast = yellow
                r2 = 255;
                g2 = lerp(255, 230, (speedNorm - 0.7) / 0.3);
                b2 = lerp(255, 50, (speedNorm - 0.7) / 0.3);
              }

              if (showStreamlines) {
                // Draw short lines
                c.beginPath();
                c.moveTo(pp.x, pp.y);
                c.lineTo(pp.x - pp.vx * 4, pp.y - pp.vy * 4);
                c.strokeStyle = 'rgba(' + Math.round(r2) + ',' + Math.round(g2) + ',' + Math.round(b2) + ',0.6)';
                c.lineWidth = 1.5;
                c.stroke();
              } else {
                c.fillStyle = 'rgba(' + Math.round(r2) + ',' + Math.round(g2) + ',' + Math.round(b2) + ',0.7)';
                c.beginPath();
                c.arc(pp.x, pp.y, 1.5 + speedNorm, 0, Math.PI * 2);
                c.fill();
              }
            }

            // Draw wind birds
            var wbirds = windBirdsRef.current || [];
            for (var wbi = 0; wbi < wbirds.length; wbi++) {
              var wb = wbirds[wbi];
              var wbWind = getWindAt(wb.x, wb.y);
              wb.vx = lerp(wb.vx, wbWind.vx * 1.2, 0.05);
              wb.vy = lerp(wb.vy, wbWind.vy * 1.2, 0.05);
              wb.x += wb.vx;
              wb.y += wb.vy;
              wb.phase += 0.08;
              if (wb.x < -20) wb.x += W + 40;
              if (wb.x > W + 20) wb.x -= W + 40;
              if (wb.y < -20) wb.y += H;
              if (wb.y > H) wb.y -= H;

              // Check thermal for quest
              for (var toi = 0; toi < objs.length; toi++) {
                if (objs[toi].type === 'thermal') {
                  var tdx = wb.x - objs[toi].x;
                  var tdy = wb.y - objs[toi].y;
                  if (Math.sqrt(tdx * tdx + tdy * tdy) < 40 && wb.vy < -0.5 && !d.thermalRidden) {
                    upd('thermalRidden', true);
                    if (celebrate) celebrate();
                    if (awardXP) awardXP(15);
                    if (addToast) addToast('Thermal updraft ridden! +15 XP', 'success');
                    if (announceToSR) announceToSR('Bird rode a thermal updraft. 15 experience points awarded.');
                  }
                }
              }

              var faceDir = wb.vx >= 0 ? -1 : 1;
              drawBird(c, wb.x, wb.y, 8, wb.phase, faceDir, null, isDark);
            }

            // Wind direction indicator
            c.save();
            c.translate(W - 40, 40);
            c.beginPath();
            c.arc(0, 0, 22, 0, Math.PI * 2);
            c.fillStyle = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)';
            c.fill();
            c.strokeStyle = isDark ? '#475569' : '#94a3b8';
            c.lineWidth = 1;
            c.stroke();
            // Arrow
            c.rotate(-windRad);
            c.beginPath();
            c.moveTo(16, 0);
            c.lineTo(-8, -6);
            c.lineTo(-4, 0);
            c.lineTo(-8, 6);
            c.closePath();
            c.fillStyle = '#0ea5e9';
            c.fill();
            c.restore();

            // Speed label
            c.fillStyle = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)';
            c.fillRect(W - 80, 68, 76, 18);
            c.fillStyle = isDark ? '#e2e8f0' : '#334155';
            c.font = '10px system-ui';
            c.textAlign = 'center';
            c.fillText(windSpeed + ' mph \u2022 ' + getBeaufort(windSpeed), W - 42, 80);

            animRef.current = requestAnimationFrame(frame);
          }

          // Click to place objects
          function onClick(e) {
            if (!placingObj) return;
            var rect = canvas.getBoundingClientRect();
            var mx = e.clientX - rect.left;
            var my = e.clientY - rect.top;
            if (my > H - 35) return; // Don't place on ground
            var newObjs = (objectsRef.current || []).concat([{ type: placingObj, x: mx, y: my }]);
            objectsRef.current = newObjs;
            upd('windObjects', newObjs);
            upd('placingObj', null);
            if (beep) beep('confirm');
            if (announceToSR) announceToSR(placingObj + ' placed on wind field');
          }

          canvas.addEventListener('click', onClick);
          frame();

          return function() {
            if (animRef.current) cancelAnimationFrame(animRef.current);
            canvas.removeEventListener('click', onClick);
          };
          var obs2 = new MutationObserver(function() { if (!document.contains(canvas)) { cancelAnimationFrame(animRef.current); obs2.disconnect(); canvas._wcInit = false; } });
          obs2.observe(document.body, { childList: true, subtree: true });
        };

        return h('div', { className: 'space-y-3' },
          // Canvas
          h('div', { className: 'rounded-xl overflow-hidden border ' + borderCol },
            h('canvas', { 'aria-label': 'Migration visualization',
              ref: _wcInitCanvas,
              role: 'img',
              'aria-label': 'Wind currents sandbox. Click to place objects that affect wind patterns. Particles show wind speed and direction. ' + windSpeed + ' mph ' + getBeaufort(windSpeed) + ' wind.',
              tabIndex: 0,
              onKeyDown: function(e) {
                if (e.key === 'c' || e.key === 'C') {
                  objectsRef.current = [];
                  upd('windObjects', []);
                  if (announceToSR) announceToSR('All objects cleared');
                }
              },
              style: { width: '100%', cursor: placingObj ? 'crosshair' : 'default', display: 'block' }
            })
          ),

          // Controls row
          h('div', { className: 'flex flex-wrap gap-2 items-start' },
            // Object palette
            h('div', { className: 'flex flex-wrap gap-1' },
              PLACEABLE.map(function(obj) {
                var active = placingObj === obj.id;
                return h('button', {
                  key: obj.id,
                  className: 'px-2 py-1.5 rounded-lg text-xs font-bold transition-all ' + (active ? 'ring-2 ring-sky-400 ' + btnPrimary : btnSecondary),
                  'aria-label': 'Place ' + obj.label + ': ' + obj.desc,
                  'aria-pressed': active ? 'true' : 'false',
                  onClick: function() { upd('placingObj', active ? null : obj.id); }
                }, obj.emoji + ' ' + obj.label);
              })
            ),

            h('button', {
              className: 'px-2 py-1.5 rounded-lg text-xs font-bold ' + btnSecondary,
              'aria-label': 'Add a bird to ride the wind currents',
              onClick: function() {
                var wb = windBirdsRef.current || [];
                wb.push({ x: 50, y: 100 + Math.random() * 150, vx: 0, vy: 0, phase: Math.random() * 6 });
                windBirdsRef.current = wb;
                if (beep) beep('click');
                if (announceToSR) announceToSR('Bird added to wind field');
              }
            }, '\uD83D\uDC26 Add Bird'),

            h('button', {
              className: 'px-2 py-1.5 rounded-lg text-xs font-bold ' + btnSecondary,
              'aria-label': 'Clear all objects and birds',
              onClick: function() {
                objectsRef.current = [];
                windBirdsRef.current = [];
                upd('windObjects', []);
                if (beep) beep('click');
                if (announceToSR) announceToSR('All objects and birds cleared');
              }
            }, '\uD83D\uDDD1\uFE0F Clear All'),

            h('button', {
              className: 'px-2 py-1.5 rounded-lg text-xs font-bold ' + (showStreamlines ? btnPrimary : btnSecondary),
              'aria-label': showStreamlines ? 'Switch to dot particles' : 'Switch to streamlines',
              'aria-pressed': showStreamlines ? 'true' : 'false',
              onClick: function() { upd('showStreamlines', !showStreamlines); }
            }, showStreamlines ? '\u2500 Lines' : '\u2022 Dots')
          ),

          // Wind direction + speed
          h('div', { className: 'flex flex-wrap gap-4 items-center' },
            // Compass
            h('div', { className: 'flex flex-wrap gap-1', role: 'radiogroup', 'aria-label': 'Wind direction' },
              COMPASS_DIRS.map(function(cd) {
                var active = windDir === cd.angle;
                return h('button', {
                  key: cd.label,
                  role: 'radio',
                  'aria-checked': active ? 'true' : 'false',
                  'aria-label': 'Wind from ' + cd.label,
                  className: 'w-8 h-8 rounded-full text-[10px] font-bold transition-all ' + (active ? 'bg-sky-500 text-white ring-2 ring-sky-300' : (isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-600 hover:bg-slate-300')),
                  onClick: function() { upd('windDir', cd.angle); }
                }, cd.label);
              })
            ),

            // Speed slider
            h('div', { className: 'flex items-center gap-2 flex-1 min-w-[180px]' },
              h('label', { className: 'text-xs font-medium ' + textSecondary }, '\uD83C\uDF2C\uFE0F Wind:'),
              h('input', {
                type: 'range', 'aria-label': 'wind speed', min: 0, max: 50, value: windSpeed,
                'aria-label': 'Wind speed: ' + windSpeed + ' mph, ' + getBeaufort(windSpeed),
                className: 'flex-1 accent-sky-500',
                onChange: function(e) { upd('windSpeed', parseInt(e.target.value, 10)); }
              }),
              h('span', { className: 'text-xs font-bold min-w-[80px] text-right ' + textPrimary }, windSpeed + ' mph'),
              h('span', { className: 'text-[10px] ' + textMuted }, getBeaufort(windSpeed))
            )
          ),

          // Wind science info
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, '\uD83C\uDF2C\uFE0F Wind Science for Migrators'),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
              [
                { title: 'Thermals', emoji: '\uD83C\uDF00', text: 'Thermals are columns of rising warm air created when the sun heats the ground unevenly. Dark surfaces (parking lots, plowed fields) create stronger thermals than light surfaces (water, forests). Soaring birds like hawks and eagles ride thermals in spiraling circles, gaining altitude without flapping. They then glide to the next thermal, creating an energy-efficient "thermal street" highway in the sky.' },
                { title: 'Orographic Lift', emoji: '\u26F0\uFE0F', text: 'When wind encounters a mountain, it is forced upward along the windward slope. This creates a band of rising air that ridge-soaring birds (like golden eagles) exploit. On the leeward (downwind) side, the air descends rapidly creating a dangerous "rotor" zone of turbulent, sinking air. This is why birds and pilots avoid the lee side of mountains.' },
                { title: 'Sea Breezes', emoji: '\uD83C\uDF0A', text: 'Land heats faster than water during the day. Hot air rises over land, and cooler air flows in from the sea to replace it \u2014 creating an onshore "sea breeze." At night, the pattern reverses. Migrating birds use these predictable coastal winds to conserve energy. The convergence zone where sea breeze meets inland air often creates thermals that birds use to gain altitude.' },
                { title: 'Jet Streams', emoji: '\u2708\uFE0F', text: 'High-altitude jet streams are narrow bands of very fast wind (100-200 mph) at 30,000-40,000 feet. While most birds fly far below jet streams, some migrants like the Bar-tailed Godwit climb to 20,000+ feet to catch favorable high-altitude winds. Geese have been detected by radar at 29,000 feet over the Himalayas, where oxygen is scarce and temperatures plunge to -50\u00B0F.' },
                { title: 'Wind Shear', emoji: '\u26A0\uFE0F', text: 'Wind shear is a sudden change in wind speed or direction over a short distance. It is dangerous for both birds and aircraft. Microbursts (sudden columns of sinking air) during thunderstorms create intense wind shear near the ground. Birds sense pressure changes and will often delay migration when storm fronts approach.' },
                { title: 'Beaufort Scale', emoji: '\uD83D\uDCCF', text: 'Admiral Sir Francis Beaufort created his wind scale in 1805 based on the effect of wind on sailing ships. Modern Beaufort uses ground observations: Force 0 (Calm) = smoke rises vertically; Force 6 (Strong Breeze) = large branches sway, umbrellas turn inside out; Force 12 (Hurricane) = devastation. Most birds prefer to migrate in Force 2-4 winds (Light to Moderate Breeze).' }
              ].map(function(card) {
                return h('div', { key: card.title, className: 'rounded-lg p-3 border ' + borderCol + ' ' + (isDark ? 'bg-slate-700/50' : 'bg-white') },
                  h('div', { className: 'flex items-center gap-1.5 mb-1' },
                    h('span', { className: 'text-base', 'aria-hidden': 'true' }, card.emoji),
                    h('span', { className: 'text-[11px] font-bold ' + textPrimary }, card.title)
                  ),
                  h('p', { className: 'text-[10px] leading-relaxed ' + textSecondary }, card.text)
                );
              })
            )
          ),

          // How birds use wind
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, '\uD83D\uDC26 How Birds Use Wind'),
            h('div', { className: 'text-xs leading-relaxed space-y-2 ' + textSecondary },
              h('p', null, h('strong', null, 'Tail Winds: '), 'Migrants strongly prefer flying with the wind at their backs. A tailwind of just 15 mph effectively doubles a bird\'s ground speed while requiring the same energy output. Studies show that migration days with favorable tail winds see 10x more bird traffic than headwind days.'),
              h('p', null, h('strong', null, 'Dynamic Soaring: '), 'Albatrosses exploit wind speed gradients over ocean waves. By alternating between climbing into faster wind and diving into slower wind near the surface, they extract energy from the wind shear itself. An albatross can fly thousands of miles with almost no flapping.'),
              h('p', null, h('strong', null, 'Slope Soaring: '), 'When wind hits a cliff face or ridge, the deflected air creates a "wave" of lift along the ridge line. Raptors ride these ridge lifts during migration, stringing together mountain ridges like stepping stones. Hawk Mountain in Pennsylvania is famous for this phenomenon.'),
              h('p', null, h('em', null, 'Experiment: Place a thermal and a mountain on the field, then add a bird. Watch how it rides the updrafts!'))
            )
          ),

          // Weather forecasting for birds
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, '\uD83C\uDF26\uFE0F Birds as Weather Forecasters'),
            h('div', { className: 'text-xs leading-relaxed space-y-2 ' + textSecondary },
              h('p', null, 'Birds are exquisitely sensitive to weather changes and have been used as "biological barometers" throughout history:'),
              h('ul', { className: 'list-disc pl-4 space-y-1' },
                h('li', null, h('strong', null, 'Barometric Pressure: '), 'Birds can detect changes in barometric pressure through specialized receptors in their middle ear (the paratympanic organ). When pressure drops before a storm, birds often fly lower and feed more intensely. Swallows flying low is a classic storm predictor.'),
                h('li', null, h('strong', null, 'Infrasound: '), 'Some birds can hear infrasound (below 20 Hz) generated by distant storms, ocean waves, and even earthquakes. Golden-winged Warblers evacuated Tennessee 24 hours before a tornado system arrived in 2014, detected by GPS trackers. They flew 900+ miles to avoid the storms.'),
                h('li', null, h('strong', null, 'Cold Fronts: '), 'Autumn migration is strongly correlated with cold front passage. Birds ride the northwesterly winds behind cold fronts, which provide both tailwinds and clear skies. Experienced birders watch weather maps to predict peak migration nights.'),
                h('li', null, h('strong', null, 'Fog: '), 'Fog is dangerous for migrating birds because it obscures landmarks and celestial navigation cues. Foggy nights with low cloud ceilings cause "fallouts" where exhausted migrants land en masse at the first available habitat. These events, while stressful for birds, create spectacular birding opportunities.')
              ),
              h('p', { className: 'mt-2 italic' }, '"When the swallows fly high, the weather will be dry. When the swallows fly low, rain is on the go." \u2014 This folk saying is actually scientifically accurate: insects (swallow food) fly higher in high-pressure systems and lower before storms.')
            )
          ),

          // Particle physics legend
          h('div', { className: 'rounded-lg p-3 border ' + borderCol + ' ' + (isDark ? 'bg-slate-700/50' : 'bg-sky-50/50') },
            h('div', { className: 'text-[10px] font-bold mb-1 ' + textPrimary }, '\uD83C\uDFA8 Particle Color Guide'),
            h('div', { className: 'flex flex-wrap gap-3 text-[9px] ' + textSecondary },
              h('span', null, h('span', { style: { color: '#7dd3fc' } }, '\u25CF'), ' Light blue = slow wind'),
              h('span', null, h('span', { style: { color: '#ffffff' } }, '\u25CF'), ' White = moderate wind'),
              h('span', null, h('span', { style: { color: '#fbbf24' } }, '\u25CF'), ' Yellow = fast wind'),
              h('span', null, h('span', { style: { color: '#22c55e', fontSize: '8px' } }, '\u25CF'), ' Green zone = upwash (rising air)'),
              h('span', null, h('span', { style: { color: '#ef4444', fontSize: '8px' } }, '\u25CF'), ' Red zone = downwash (sinking air)')
            )
          )
        );
      }

      // ══════════════════════════════════════════
      // TAB 3: MIGRATION ROUTE EXPLORER
      // ══════════════════════════════════════════
      function renderRoutes() {
        var canvasRef = _rtCanvasRef;
        var animRef = _rtAnimRef;
        var timeRef = _rtTimeRef;
        var selectedSpecies = d.selectedSpecies || null;
        var routeAnimProgress = d.routeAnimProgress || 0;
        var aiExplorerText = d.aiExplorerText || '';
        var aiExplorerLoading = d.aiExplorerLoading || false;

        // Flyway colors
        var FLYWAY_COLORS = {
          atlantic: { stroke: '#3b82f6', fill: 'rgba(59,130,246,0.15)' },
          mississippi: { stroke: '#22c55e', fill: 'rgba(34,197,94,0.15)' },
          central: { stroke: '#f59e0b', fill: 'rgba(245,158,11,0.15)' },
          pacific: { stroke: '#ef4444', fill: 'rgba(239,68,68,0.15)' }
        };

        // Simplified flyway paths (canvas coords in a ~620x400 space)
        // These are approximate curved paths representing the four North American flyways
        var FLYWAY_PATHS = {
          atlantic: [
            { x: 420, y: 30 }, { x: 430, y: 80 }, { x: 435, y: 130 },
            { x: 430, y: 170 }, { x: 420, y: 210 }, { x: 410, y: 250 },
            { x: 400, y: 290 }, { x: 380, y: 330 }, { x: 350, y: 370 }
          ],
          mississippi: [
            { x: 380, y: 30 }, { x: 360, y: 80 }, { x: 340, y: 130 },
            { x: 330, y: 170 }, { x: 320, y: 210 }, { x: 310, y: 260 },
            { x: 300, y: 310 }, { x: 280, y: 350 }, { x: 260, y: 380 }
          ],
          central: [
            { x: 320, y: 30 }, { x: 300, y: 80 }, { x: 280, y: 130 },
            { x: 270, y: 170 }, { x: 260, y: 210 }, { x: 250, y: 260 },
            { x: 240, y: 310 }, { x: 230, y: 350 }, { x: 220, y: 380 }
          ],
          pacific: [
            { x: 180, y: 30 }, { x: 170, y: 80 }, { x: 160, y: 130 },
            { x: 155, y: 170 }, { x: 150, y: 210 }, { x: 148, y: 260 },
            { x: 150, y: 310 }, { x: 155, y: 350 }, { x: 160, y: 380 }
          ]
        };

        // Stopover markers
        var STOPOVERS = [
          { name: 'Delaware Bay', x: 430, y: 185, flyway: 'atlantic', fact: 'Over 1 million shorebirds stop here to feast on horseshoe crab eggs' },
          { name: 'Gulf Coast', x: 350, y: 280, flyway: 'atlantic', fact: 'Critical rest stop after the 500-mile Gulf of Mexico crossing' },
          { name: 'Platte River, NE', x: 290, y: 170, flyway: 'central', fact: '600,000 Sandhill Cranes gather here each spring \u2014 one of nature\'s greatest spectacles' },
          { name: 'Great Salt Lake', x: 200, y: 170, flyway: 'pacific', fact: '5 million migratory birds depend on this inland sea as a refueling station' },
          { name: 'Mississippi Delta', x: 330, y: 275, flyway: 'mississippi', fact: 'Wetlands here support 40% of North America\'s migratory waterfowl' },
          { name: 'Chesapeake Bay', x: 430, y: 200, flyway: 'atlantic', fact: 'Largest estuary in the US \u2014 critical wintering habitat for ducks and geese' }
        ];

        var _rtInitCanvas = function(canvas) {
          if (!canvas) return;
          canvasRef.current = canvas;
          if (canvas._rtInit) return;
          canvas._rtInit = true;
          var c = canvas.getContext('2d');
          var dpr = window.devicePixelRatio || 1;
          var W = canvas.parentElement ? canvas.parentElement.clientWidth : 620;
          var H = 400;
          canvas.width = W * dpr;
          canvas.height = H * dpr;
          canvas.style.width = W + 'px';
          canvas.style.height = H + 'px';
          c.setTransform(dpr, 0, 0, dpr, 0, 0);

          var scaleX = W / 620;
          var scaleY = H / 400;

          function frame() {
            timeRef.current += 0.016;
            c.clearRect(0, 0, W, H);

            // Ocean background
            c.fillStyle = isDark ? '#0c4a6e' : '#bae6fd';
            c.fillRect(0, 0, W, H);

            // ── Simplified North America ──
            // Main continent
            c.beginPath();
            c.moveTo(140 * scaleX, 10 * scaleY);
            c.lineTo(420 * scaleX, 10 * scaleY);
            c.lineTo(460 * scaleX, 50 * scaleY);
            c.lineTo(470 * scaleX, 100 * scaleY);
            c.lineTo(460 * scaleX, 140 * scaleY);
            c.lineTo(450 * scaleX, 180 * scaleY);
            c.lineTo(440 * scaleX, 210 * scaleY);
            c.lineTo(420 * scaleX, 230 * scaleY);
            c.lineTo(400 * scaleX, 250 * scaleY);
            c.lineTo(380 * scaleX, 260 * scaleY);
            c.lineTo(360 * scaleX, 275 * scaleY);
            c.lineTo(330 * scaleX, 295 * scaleY);
            c.lineTo(310 * scaleX, 310 * scaleY);
            c.lineTo(280 * scaleX, 330 * scaleY);
            c.lineTo(250 * scaleX, 350 * scaleY);
            c.lineTo(230 * scaleX, 370 * scaleY);
            c.lineTo(210 * scaleX, 380 * scaleY);
            c.lineTo(200 * scaleX, 370 * scaleY);
            c.lineTo(190 * scaleX, 350 * scaleY);
            c.lineTo(170 * scaleX, 330 * scaleY);
            c.lineTo(160 * scaleX, 310 * scaleY);
            c.lineTo(145 * scaleX, 280 * scaleY);
            c.lineTo(130 * scaleX, 250 * scaleY);
            c.lineTo(120 * scaleX, 210 * scaleY);
            c.lineTo(115 * scaleX, 170 * scaleY);
            c.lineTo(120 * scaleX, 130 * scaleY);
            c.lineTo(125 * scaleX, 90 * scaleY);
            c.lineTo(130 * scaleX, 50 * scaleY);
            c.closePath();
            c.fillStyle = isDark ? '#1e293b' : '#e2e8f0';
            c.fill();
            c.strokeStyle = isDark ? '#475569' : '#94a3b8';
            c.lineWidth = 1.5;
            c.stroke();

            // Alaska (simplified)
            c.beginPath();
            c.moveTo(60 * scaleX, 20 * scaleY);
            c.lineTo(100 * scaleX, 15 * scaleY);
            c.lineTo(120 * scaleX, 30 * scaleY);
            c.lineTo(115 * scaleX, 55 * scaleY);
            c.lineTo(90 * scaleX, 65 * scaleY);
            c.lineTo(60 * scaleX, 55 * scaleY);
            c.closePath();
            c.fillStyle = isDark ? '#1e293b' : '#e2e8f0';
            c.fill();
            c.strokeStyle = isDark ? '#475569' : '#94a3b8';
            c.lineWidth = 1;
            c.stroke();

            // Central America (narrow strip)
            c.beginPath();
            c.moveTo(230 * scaleX, 370 * scaleY);
            c.lineTo(250 * scaleX, 375 * scaleY);
            c.lineTo(270 * scaleX, 380 * scaleY);
            c.lineTo(285 * scaleX, 390 * scaleY);
            c.lineTo(275 * scaleX, 395 * scaleY);
            c.lineTo(260 * scaleX, 390 * scaleY);
            c.lineTo(240 * scaleX, 385 * scaleY);
            c.lineTo(220 * scaleX, 378 * scaleY);
            c.closePath();
            c.fillStyle = isDark ? '#1e293b' : '#e2e8f0';
            c.fill();
            c.strokeStyle = isDark ? '#475569' : '#94a3b8';
            c.lineWidth = 1;
            c.stroke();

            // Great Lakes (simplified outlines)
            c.fillStyle = isDark ? '#0c4a6e' : '#bae6fd';
            // Lake Superior
            c.beginPath();
            c.ellipse(335 * scaleX, 108 * scaleY, 22 * scaleX, 10 * scaleY, -0.2, 0, Math.PI * 2);
            c.fill();
            // Lake Michigan
            c.beginPath();
            c.ellipse(345 * scaleX, 135 * scaleY, 8 * scaleX, 18 * scaleY, 0.1, 0, Math.PI * 2);
            c.fill();
            // Lake Huron
            c.beginPath();
            c.ellipse(365 * scaleX, 120 * scaleY, 12 * scaleX, 15 * scaleY, 0.2, 0, Math.PI * 2);
            c.fill();
            // Lake Erie
            c.beginPath();
            c.ellipse(380 * scaleX, 145 * scaleY, 18 * scaleX, 5 * scaleY, -0.1, 0, Math.PI * 2);
            c.fill();
            // Lake Ontario
            c.beginPath();
            c.ellipse(400 * scaleX, 135 * scaleY, 12 * scaleX, 4 * scaleY, -0.15, 0, Math.PI * 2);
            c.fill();

            // Geographic labels (subtle)
            c.fillStyle = isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.3)';
            c.font = '8px system-ui';
            c.textAlign = 'center';
            c.fillText('CANADA', 290 * scaleX, 70 * scaleY);
            c.fillText('UNITED STATES', 300 * scaleX, 200 * scaleY);
            c.fillText('MEXICO', 240 * scaleX, 340 * scaleY);
            c.fillText('ALASKA', 85 * scaleX, 40 * scaleY);
            c.fillText('Gulf of Mexico', 340 * scaleX, 310 * scaleY);
            c.font = '7px system-ui';
            c.fillText('Atlantic', 480 * scaleX, 200 * scaleY);
            c.fillText('Ocean', 480 * scaleX, 210 * scaleY);
            c.fillText('Pacific', 100 * scaleX, 200 * scaleY);
            c.fillText('Ocean', 100 * scaleX, 210 * scaleY);

            // Map legend
            c.fillStyle = isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.9)';
            c.fillRect(W - 130, H - 70, 125, 65);
            c.strokeStyle = isDark ? '#334155' : '#cbd5e1';
            c.lineWidth = 0.5;
            c.strokeRect(W - 130, H - 70, 125, 65);
            c.font = 'bold 8px system-ui';
            c.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
            c.textAlign = 'left';
            c.fillText('Flyways', W - 125, H - 57);
            var legendItems = [
              { color: '#3b82f6', label: 'Atlantic' },
              { color: '#22c55e', label: 'Mississippi' },
              { color: '#f59e0b', label: 'Central' },
              { color: '#ef4444', label: 'Pacific' }
            ];
            for (var li2 = 0; li2 < legendItems.length; li2++) {
              var ly = H - 46 + li2 * 12;
              c.beginPath();
              c.moveTo(W - 125, ly);
              c.lineTo(W - 110, ly);
              c.strokeStyle = legendItems[li2].color;
              c.lineWidth = 2.5;
              c.stroke();
              c.fillStyle = isDark ? '#94a3b8' : '#475569';
              c.font = '7px system-ui';
              c.fillText(legendItems[li2].label, W - 106, ly + 3);
            }
            // Stopover marker legend
            c.beginPath();
            c.arc(W - 118, H - 9, 3, 0, Math.PI * 2);
            c.fillStyle = '#fbbf24';
            c.fill();
            c.fillStyle = isDark ? '#94a3b8' : '#475569';
            c.font = '7px system-ui';
            c.fillText('Stopover site', W - 112, H - 6);

            // Draw all flyways
            var flyways = ['atlantic', 'mississippi', 'central', 'pacific'];
            for (var fi = 0; fi < flyways.length; fi++) {
              var fw = flyways[fi];
              var pts = FLYWAY_PATHS[fw];
              var col = FLYWAY_COLORS[fw];
              var isActive = selectedSpecies && getSpeciesById(selectedSpecies).flyway === fw;

              c.beginPath();
              c.moveTo(pts[0].x * scaleX, pts[0].y * scaleY);
              for (var pi3 = 1; pi3 < pts.length; pi3++) {
                var prev = pts[pi3 - 1];
                var curr = pts[pi3];
                var cpx = (prev.x + curr.x) / 2 * scaleX;
                var cpy = (prev.y + curr.y) / 2 * scaleY;
                c.quadraticCurveTo(prev.x * scaleX, prev.y * scaleY, cpx, cpy);
              }
              c.quadraticCurveTo(pts[pts.length - 2].x * scaleX, pts[pts.length - 2].y * scaleY, pts[pts.length - 1].x * scaleX, pts[pts.length - 1].y * scaleY);
              c.strokeStyle = col.stroke;
              c.lineWidth = isActive ? 4 : 2;
              c.globalAlpha = isActive ? 1 : 0.4;
              c.stroke();
              c.globalAlpha = 1;

              // Flyway label
              c.fillStyle = col.stroke;
              c.font = 'bold 9px system-ui';
              c.textAlign = 'left';
              c.fillText(fw.charAt(0).toUpperCase() + fw.slice(1), pts[0].x * scaleX + 8, pts[0].y * scaleY + 4);
            }

            // Draw stopovers
            for (var si = 0; si < STOPOVERS.length; si++) {
              var sp = STOPOVERS[si];
              var spActive = selectedSpecies && getSpeciesById(selectedSpecies).flyway === sp.flyway;
              c.beginPath();
              c.arc(sp.x * scaleX, sp.y * scaleY, spActive ? 5 : 3, 0, Math.PI * 2);
              c.fillStyle = spActive ? '#fbbf24' : (isDark ? '#475569' : '#94a3b8');
              c.fill();
              if (spActive) {
                c.strokeStyle = '#f59e0b';
                c.lineWidth = 1;
                c.stroke();
                c.fillStyle = isDark ? '#fde68a' : '#92400e';
                c.font = '8px system-ui';
                c.textAlign = 'center';
                c.fillText(sp.name, sp.x * scaleX, sp.y * scaleY - 8);
              }
            }

            // Animate bird along route
            if (selectedSpecies) {
              var sp2 = getSpeciesById(selectedSpecies);
              var pts2 = FLYWAY_PATHS[sp2.flyway];
              if (pts2 && pts2.length > 1) {
                var prog = (timeRef.current * 0.15) % 1;
                var totalPts = pts2.length - 1;
                var segIdx = Math.floor(prog * totalPts);
                var segT = (prog * totalPts) - segIdx;
                if (segIdx >= totalPts) { segIdx = totalPts - 1; segT = 1; }
                var ax = lerp(pts2[segIdx].x, pts2[Math.min(segIdx + 1, pts2.length - 1)].x, segT) * scaleX;
                var ay = lerp(pts2[segIdx].y, pts2[Math.min(segIdx + 1, pts2.length - 1)].y, segT) * scaleY;

                drawBird(c, ax, ay, 8, timeRef.current * 4, -1, FLYWAY_COLORS[sp2.flyway].stroke, isDark);
                // Species emoji
                c.font = '14px system-ui';
                c.textAlign = 'center';
                c.fillText(sp2.emoji, ax, ay - 16);
              }
            }

            // Title
            c.fillStyle = isDark ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.85)';
            c.fillRect(8, 8, 200, 22);
            c.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
            c.font = 'bold 11px system-ui';
            c.textAlign = 'left';
            c.fillText('\uD83D\uDDFA\uFE0F North American Flyways', 14, 24);

            animRef.current = requestAnimationFrame(frame);
          }

          frame();

          return function() {
            if (animRef.current) cancelAnimationFrame(animRef.current);
          };
          var obs3 = new MutationObserver(function() { if (!document.contains(canvas)) { cancelAnimationFrame(animRef.current); obs3.disconnect(); canvas._rtInit = false; } });
          obs3.observe(document.body, { childList: true, subtree: true });
        };

        function getSpeciesById(id) {
          for (var i = 0; i < SPECIES.length; i++) {
            if (SPECIES[i].id === id) return SPECIES[i];
          }
          return SPECIES[0];
        }

        function handleAIExplorer() {
          if (!selectedSpecies || !callGemini || d.aiExplorerLoading) return; // prevent double-click
          var sp = getSpeciesById(selectedSpecies);
          var reqId = Date.now();
          updMulti({ aiExplorerLoading: true, aiExplorerReqId: reqId });
          var prompt = 'You are a wildlife biologist teaching grade ' + (gradeLevel || 5) + ' students. Tell me 3 fascinating facts about ' + sp.name + ' migration that most people don\'t know. Include one fact about their navigation, one about their physical adaptations, and one about conservation. Keep each fact to 1-2 sentences. Format as numbered list.';
          callGemini(prompt).then(function(result) {
            // Only update if this is still the latest request
            if (d.aiExplorerReqId === reqId || !d.aiExplorerReqId) {
              updMulti({ aiExplorerText: result, aiExplorerLoading: false });
            }
          }).catch(function() {
            updMulti({ aiExplorerText: 'Could not load AI facts. Try again later.', aiExplorerLoading: false });
          });
        }

        return h('div', { className: 'space-y-3' },
          // Map canvas
          h('div', { className: 'rounded-xl overflow-hidden border ' + borderCol },
            h('canvas', { 'aria-label': 'Migration visualization',
              ref: _rtInitCanvas,
              role: 'img',
              'aria-label': 'Migration route map of North America showing four flyways: Atlantic, Mississippi, Central, and Pacific. ' + (selectedSpecies ? 'Currently tracking ' + getSpeciesById(selectedSpecies).name : 'Select a species to see its route.'),
              tabIndex: 0,
              onKeyDown: function(e) {
                // Arrow keys to cycle species
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  var idx = 0;
                  for (var i = 0; i < SPECIES.length; i++) {
                    if (SPECIES[i].id === selectedSpecies) { idx = i; break; }
                  }
                  var next = (idx + 1) % SPECIES.length;
                  updMulti({ selectedSpecies: SPECIES[next].id, aiExplorerText: '' });
                  if (announceToSR) announceToSR('Selected ' + SPECIES[next].name);
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  var idx2 = 0;
                  for (var i2 = 0; i2 < SPECIES.length; i2++) {
                    if (SPECIES[i2].id === selectedSpecies) { idx2 = i2; break; }
                  }
                  var prev = (idx2 - 1 + SPECIES.length) % SPECIES.length;
                  updMulti({ selectedSpecies: SPECIES[prev].id, aiExplorerText: '' });
                  if (announceToSR) announceToSR('Selected ' + SPECIES[prev].name);
                }
              },
              style: { width: '100%', display: 'block' }
            })
          ),

          // Species selector
          h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
            SPECIES.map(function(sp) {
              var active = selectedSpecies === sp.id;
              var fwColor = FLYWAY_COLORS[sp.flyway];
              return h('button', {
                key: sp.id,
                className: 'p-2 rounded-lg text-left transition-all border ' + (active ? 'ring-2 ring-sky-400 border-sky-400 ' + accentBg : borderCol + ' ' + cardBg + ' hover:border-sky-300'),
                'aria-label': sp.name + ', ' + sp.flyway + ' flyway, ' + sp.distance + ' miles',
                'aria-pressed': active ? 'true' : 'false',
                onClick: function() {
                  updMulti({ selectedSpecies: sp.id, routeAnimProgress: 0, aiExplorerText: '', routesPlanned: (d.routesPlanned || 0) + (active ? 0 : 1) });
                  if (beep) beep('click');
                  if (announceToSR) announceToSR('Selected ' + sp.name + '. ' + sp.flyway + ' flyway.');
                }
              },
                h('div', { className: 'flex items-center gap-1.5' },
                  h('span', { className: 'text-lg', 'aria-hidden': 'true' }, sp.emoji),
                  h('div', null,
                    h('div', { className: 'text-[11px] font-bold ' + textPrimary }, sp.name),
                    h('div', { className: 'text-[9px] ' + textMuted },
                      h('span', { style: { color: fwColor.stroke } }, '\u25CF'),
                      ' ' + sp.flyway.charAt(0).toUpperCase() + sp.flyway.slice(1) + ' \u2022 ' + sp.distance.toLocaleString() + ' mi'
                    )
                  )
                )
              );
            })
          ),

          // Species info card
          selectedSpecies && (function() {
            var sp = getSpeciesById(selectedSpecies);
            return h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg + ' space-y-2' },
              h('div', { className: 'flex items-center gap-2' },
                h('span', { className: 'text-2xl', 'aria-hidden': 'true' }, sp.emoji),
                h('div', null,
                  h('h3', { className: 'font-bold text-sm ' + textPrimary }, sp.name),
                  h('div', { className: 'text-[10px] ' + textMuted }, sp.formation + ' \u2022 ' + sp.flyway.charAt(0).toUpperCase() + sp.flyway.slice(1) + ' Flyway')
                )
              ),
              h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2 text-center' },
                [
                  { label: 'Distance', value: sp.distance.toLocaleString() + ' mi' },
                  { label: 'Speed', value: sp.speed + ' mph' },
                  { label: 'Altitude', value: sp.altitude.toLocaleString() + ' ft' },
                  { label: 'Formation', value: sp.formation }
                ].map(function(stat) {
                  return h('div', { key: stat.label, className: 'rounded-lg p-2 ' + (isDark ? 'bg-slate-700' : 'bg-white') },
                    h('div', { className: 'text-xs font-bold ' + accent }, stat.value),
                    h('div', { className: 'text-[9px] ' + textMuted }, stat.label)
                  );
                })
              ),
              h('div', { className: 'text-xs ' + textSecondary },
                h('div', { className: 'mb-1' }, h('strong', null, 'Breeding: '), sp.breedingRange),
                h('div', { className: 'mb-1' }, h('strong', null, 'Wintering: '), sp.winterRange),
                h('div', null, h('strong', null, 'Fun Fact: '), sp.funFact)
              ),

              // AI Explorer
              h('div', { className: 'flex items-center gap-2 mt-2' },
                h('button', {
                  className: 'px-3 py-1.5 rounded-lg text-xs font-bold ' + btnPrimary,
                  'aria-label': 'Ask AI for more facts about ' + sp.name,
                  disabled: aiExplorerLoading,
                  onClick: handleAIExplorer
                }, aiExplorerLoading ? '\u23F3 Loading...' : '\u2728 AI Explorer')
              ),
              aiExplorerText && h('div', { className: 'text-xs p-3 rounded-lg ' + (isDark ? 'bg-slate-700' : 'bg-sky-50') + ' ' + textSecondary + ' whitespace-pre-wrap' }, aiExplorerText)
            );
          })(),

          // Flyway comparison table
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, '\uD83D\uDDFA\uFE0F The Four North American Flyways'),
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
              [
                { name: 'Atlantic', color: '#3b82f6', emoji: '\uD83C\uDF0A', birds: '~500 species', terrain: 'Coastal marshes, barrier islands, estuaries', key: 'Delaware Bay, Chesapeake Bay stopover sites' },
                { name: 'Mississippi', color: '#22c55e', emoji: '\uD83C\uDF3F', birds: '~325 species', terrain: 'River bottomlands, wetlands, delta marshes', key: 'Mississippi River acts as a north-south highway' },
                { name: 'Central', color: '#f59e0b', emoji: '\uD83C\uDF3E', birds: '~300 species', terrain: 'Great Plains, prairies, playas', key: 'Platte River hosts 600,000 Sandhill Cranes each spring' },
                { name: 'Pacific', color: '#ef4444', emoji: '\uD83C\uDF0B', birds: '~350 species', terrain: 'Coastline, mountains, inland valleys', key: 'Pacific Coast provides continuous north-south corridor' }
              ].map(function(fw) {
                return h('div', { key: fw.name, className: 'rounded-lg p-3 border ' + borderCol + ' ' + (isDark ? 'bg-slate-700/50' : 'bg-white') },
                  h('div', { className: 'flex items-center gap-1.5 mb-1.5' },
                    h('div', { className: 'w-2.5 h-2.5 rounded-full', style: { backgroundColor: fw.color } }),
                    h('span', { className: 'text-xs font-bold ' + textPrimary }, fw.name)
                  ),
                  h('div', { className: 'space-y-1 text-[9px] ' + textSecondary },
                    h('div', null, h('strong', null, 'Species: '), fw.birds),
                    h('div', null, h('strong', null, 'Terrain: '), fw.terrain),
                    h('div', null, h('strong', null, 'Key: '), fw.key)
                  )
                );
              })
            )
          ),

          // Migration timing
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, '\uD83D\uDCC5 When Do Birds Migrate?'),
            h('div', { className: 'text-xs leading-relaxed space-y-2 ' + textSecondary },
              h('p', null, 'Migration timing varies dramatically by species:'),
              h('div', { className: 'grid grid-cols-2 gap-2 mt-2' },
                [
                  { period: 'Feb-Mar', desc: 'Early spring: Waterfowl (ducks, geese) head north following ice melt. Red-winged Blackbirds return to marshes.' },
                  { period: 'Apr-May', desc: 'Peak spring: Warblers, vireos, tanagers flood northward. Most songbirds migrate at night. Peak nights see 500+ million birds in the air.' },
                  { period: 'Jul-Aug', desc: 'Shorebirds start south \u2014 some species "fail" on breeding grounds and begin returning in early July. Adults often leave before juveniles.' },
                  { period: 'Sep-Nov', desc: 'Peak fall: Raptors ride thermals along mountain ridges. Songbirds follow cold fronts south. Geese fly in V-formation at night.' }
                ].map(function(time) {
                  return h('div', { key: time.period, className: 'rounded-lg p-2 ' + (isDark ? 'bg-slate-700/50' : 'bg-sky-50') },
                    h('div', { className: 'text-[10px] font-bold ' + accent + ' mb-0.5' }, time.period),
                    h('p', { className: 'text-[9px] ' + textSecondary }, time.desc)
                  );
                })
              ),
              h('p', { className: 'mt-2 italic' }, 'Photoperiod (day length) is the primary trigger for migration. As days shorten in autumn, hormones trigger "Zugunruhe" \u2014 migratory restlessness \u2014 and birds begin adding fat stores (hyperphagia), sometimes doubling their body weight.')
            )
          ),

          // Stopover ecology
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, '\u26FA Stopover Ecology'),
            h('div', { className: 'text-xs leading-relaxed space-y-2 ' + textSecondary },
              h('p', null, 'Stopovers are not just rest stops \u2014 they are ', h('strong', null, 'refueling stations'), ' critical to survival. A migrating warbler may spend 75% of its migration time at stopovers, eating frantically to rebuild fat stores. Quality stopover habitat can mean the difference between life and death.'),
              h('p', null, 'At Delaware Bay, over 1 million shorebirds (Red Knots, Ruddy Turnstones, Sanderlings) depend on horseshoe crab eggs laid in May. The timing must be perfect: the birds arrive exactly when crabs spawn. If crab populations decline (from overharvesting for bait), the entire migration chain collapses.'),
              h('p', null, h('em', null, 'Conservation success story: After horseshoe crab harvest limits were imposed in 2012, Red Knot populations began slowly recovering from a critical low of 15,000 to over 50,000 by 2025.'))
            )
          ),

          // Migration physiology
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, '\uD83E\uDDB4 Migration Physiology'),
            h('div', { className: 'text-xs leading-relaxed space-y-2 ' + textSecondary },
              h('p', null, 'Migration is one of the most physically demanding activities in the animal kingdom. Birds undergo remarkable physiological transformations before departure:'),
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2' },
                [
                  { title: 'Hyperphagia', emoji: '\uD83C\uDF57', text: 'Before migration, birds enter a feeding frenzy called hyperphagia, consuming food at 2-3 times their normal rate. A Blackpoll Warbler (12g) adds 8-12g of fat stores, nearly doubling its body weight. This fat is the fuel for non-stop flights of 2,000+ miles.' },
                  { title: 'Organ Shrinkage', emoji: '\uD83E\uDEC1', text: 'To reduce weight, migrating birds actually shrink their digestive organs (intestines, liver, gizzard) by up to 40% before departure. Upon arrival at stopovers, they rapidly regrow these organs to refuel. This "phenotypic flexibility" is unique among vertebrates.' },
                  { title: 'Hemoglobin', emoji: '\uD83E\uDE78', text: 'High-altitude migrants like Bar-headed Geese (which fly over the Himalayas at 29,000 ft) have special hemoglobin with higher oxygen affinity. Their muscles contain extra myoglobin, and their capillary density is double that of lowland species.' },
                  { title: 'Sleep in Flight', emoji: '\uD83D\uDE34', text: 'Some birds can sleep while flying using "unihemispheric sleep" \u2014 shutting down one brain hemisphere at a time. Frigate birds have been recorded sleeping for 42 minutes per day during 10-day transoceanic flights, taking micro-naps of 12 seconds each.' },
                  { title: 'Navigation Clock', emoji: '\u23F0', text: 'Birds maintain an internal circadian clock with extraordinary precision. This clock compensates for the sun\'s movement across the sky (time-compensated sun compass) and tracks seasonal changes in day length that trigger migration hormones.' },
                  { title: 'Zugunruhe', emoji: '\uD83C\uDF19', text: 'Zugunruhe ("migration restlessness") is a behavioral state where caged migratory birds flutter in the direction they would naturally migrate, at the time they would migrate. It is hormonally driven and genetically encoded. Even hand-raised birds with no migratory experience display Zugunruhe.' }
                ].map(function(phys) {
                  return h('div', { key: phys.title, className: 'rounded-lg p-2.5 border ' + borderCol + ' ' + (isDark ? 'bg-slate-700/50' : 'bg-white') },
                    h('div', { className: 'flex items-center gap-1.5 mb-1' },
                      h('span', { className: 'text-base', 'aria-hidden': 'true' }, phys.emoji),
                      h('span', { className: 'text-[11px] font-bold ' + textPrimary }, phys.title)
                    ),
                    h('p', { className: 'text-[10px] leading-relaxed ' + textSecondary }, phys.text)
                  );
                })
              )
            )
          ),

          // Species comparison table
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, '\uD83D\uDCCA Species Comparison'),
            h('div', { className: 'overflow-x-auto' },
              h('table', { className: 'w-full text-[9px] ' + textSecondary, role: 'table' },
                h('thead', null,
                  h('tr', { className: 'border-b ' + borderCol },
                    ['Species', 'Distance', 'Speed', 'Altitude', 'Weight', 'Flyway', 'Formation'].map(function(col) {
                      return h('th', { key: col, scope: 'col', className: 'text-left py-1.5 px-1 font-bold ' + textPrimary }, col);
                    })
                  )
                ),
                h('tbody', null,
                  [
                    { name: 'Canada Goose', dist: '3,000 mi', spd: '40 mph', alt: '3,000 ft', wt: '3.5-6 kg', fw: 'Atlantic', form: 'V-formation' },
                    { name: 'Arctic Tern', dist: '44,000 mi', spd: '25 mph', alt: '1,500 ft', wt: '100 g', fw: 'Atlantic', form: 'Loose flock' },
                    { name: 'Ruby-thr. Hummingbird', dist: '3,000 mi', spd: '30 mph', alt: '500 ft', wt: '3.5 g', fw: 'Mississippi', form: 'Solo' },
                    { name: 'Snow Goose', dist: '5,000 mi', spd: '50 mph', alt: '7,500 ft', wt: '2.5-3.5 kg', fw: 'Central', form: 'V-formation' },
                    { name: 'Peregrine Falcon', dist: '15,500 mi', spd: '60 mph', alt: '3,500 ft', wt: '0.5-1.5 kg', fw: 'Pacific', form: 'Solo' },
                    { name: 'Sandhill Crane', dist: '6,000 mi', spd: '35 mph', alt: '6,000 ft', wt: '3-5 kg', fw: 'Central', form: 'V-formation' },
                    { name: 'Monarch Butterfly', dist: '3,000 mi', spd: '12 mph', alt: '1,200 ft', wt: '0.5 g', fw: 'Central', form: 'Swarm' },
                    { name: 'Bar-tailed Godwit', dist: '7,000 mi', spd: '55 mph', alt: '6,000 ft', wt: '300 g', fw: 'Pacific', form: 'V-formation' }
                  ].map(function(row, ri2) {
                    return h('tr', { key: ri2, className: 'border-b ' + borderCol + ' ' + (ri2 % 2 === 0 ? (isDark ? 'bg-slate-800/30' : 'bg-slate-50/50') : '') },
                      h('td', { className: 'py-1 px-1 font-medium ' + textPrimary }, row.name),
                      h('td', { className: 'py-1 px-1' }, row.dist),
                      h('td', { className: 'py-1 px-1' }, row.spd),
                      h('td', { className: 'py-1 px-1' }, row.alt),
                      h('td', { className: 'py-1 px-1' }, row.wt),
                      h('td', { className: 'py-1 px-1' }, row.fw),
                      h('td', { className: 'py-1 px-1' }, row.form)
                    );
                  })
                )
              )
            ),
            h('p', { className: 'text-[9px] mt-2 italic ' + textMuted }, 'Distances are approximate annual migration distances. Speeds are typical cruising speeds. Altitude is typical migration altitude.')
          ),

          // Technology & tracking
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, '\uD83D\uDCE1 How Scientists Track Migration'),
            h('div', { className: 'text-xs leading-relaxed space-y-2 ' + textSecondary },
              h('p', null, 'Our understanding of migration has been revolutionized by technology:'),
              h('ul', { className: 'list-disc pl-4 space-y-1.5 mt-1' },
                h('li', null, h('strong', null, 'Bird Banding: '), 'Since 1920, over 80 million birds have been banded in North America. Each band has a unique number. When a banded bird is recaptured, scientists learn about survival, routes, and timing. Recovery rates are low (1-5%) but the dataset is enormous.'),
                h('li', null, h('strong', null, 'GPS Trackers: '), 'Solar-powered GPS tags (now as small as 1g) transmit location data via satellite. They reveal exact routes, stopover timing, and flight altitude. The 7,145-mile non-stop Godwit flight was tracked by GPS.'),
                h('li', null, h('strong', null, 'Geolocators: '), 'Light-level geolocators (0.5g) record sunrise/sunset times. When the bird is recaptured, scientists download the data and calculate latitude (from day length) and longitude (from solar noon timing). Accuracy: ~200 km.'),
                h('li', null, h('strong', null, 'Weather Radar: '), 'NEXRAD weather radar stations across the US detect massive flocks of migrating birds. BirdCast (Cornell Lab) uses machine learning to predict and visualize real-time migration from radar data. On peak nights, radar shows enormous green blobs of bird migration.'),
                h('li', null, h('strong', null, 'eBird: '), 'Citizen scientists submit 100+ million bird observations per year through eBird, creating the largest biodiversity database in the world. These data reveal continent-scale patterns in migration timing and distribution that no research team could collect alone.'),
                h('li', null, h('strong', null, 'Motus Wildlife Tracking: '), 'A network of 1,500+ automated radio telemetry stations across the Americas detects tagged birds as they fly by. Each station listens for unique radio frequencies, creating a continental-scale detection network. A tagged bird flying from Canada to Brazil is detected at dozens of stations along the way.')
              )
            )
          )
        );
      }

      // ══════════════════════════════════════════
      // TAB 4: AERODYNAMICS LAB
      // ══════════════════════════════════════════
      function renderAero() {
        var canvasRef = _arCanvasRef;
        var animRef = _arAnimRef;
        var timeRef = _arTimeRef;

        var aoa = typeof d.aoa === 'number' ? d.aoa : 5; // angle of attack
        var selectedWing = d.selectedWing || 'flapping';

        function getWingType(id) {
          for (var i = 0; i < WING_TYPES.length; i++) {
            if (WING_TYPES[i].id === id) return WING_TYPES[i];
          }
          return WING_TYPES[1];
        }

        var wing = getWingType(selectedWing);

        // Lift & drag calculations
        var aoaRad = aoa * Math.PI / 180;
        var cl = aoa <= wing.stallAngle ? wing.liftCoeff * Math.sin(2 * aoaRad) : wing.liftCoeff * 0.5 * Math.sin(2 * aoaRad) * 0.4;
        var cd = wing.dragCoeff + (cl * cl) / (Math.PI * 5 * 0.85); // induced drag
        var isStalling = aoa > wing.stallAngle;
        var ldRatio = cd > 0.001 ? cl / cd : 0;

        var _arInitCanvas = function(canvas) {
          if (!canvas) return;
          canvasRef.current = canvas;
          if (canvas._arInit) return;
          canvas._arInit = true;
          var c = canvas.getContext('2d');
          var dpr = window.devicePixelRatio || 1;
          var W = canvas.parentElement ? canvas.parentElement.clientWidth : 620;
          var H = 320;
          canvas.width = W * dpr;
          canvas.height = H * dpr;
          canvas.style.width = W + 'px';
          canvas.style.height = H + 'px';
          c.setTransform(dpr, 0, 0, dpr, 0, 0);

          function frame() {
            timeRef.current += 0.016;
            c.clearRect(0, 0, W, H);

            // Read fresh values from live ref
            var lv = _liveVals.current;
            var _aoa = lv.aoa;
            var _selWing = lv.selectedWing;
            var _wing = getWingType(_selWing);
            var _aoaRad = _aoa * Math.PI / 180;
            var _cl = _aoa <= _wing.stallAngle ? _wing.liftCoeff * Math.sin(2 * _aoaRad) : _wing.liftCoeff * 0.5 * Math.sin(2 * _aoaRad) * 0.4;
            var _cd = _wing.dragCoeff + (_cl * _cl) / (Math.PI * 5 * 0.85);
            var _isStalling = _aoa > _wing.stallAngle;
            var aoaRad = _aoaRad;
            var isStalling = _isStalling;

            // Background
            c.fillStyle = lv.isDark ? '#0f172a' : '#f8fafc';
            c.fillRect(0, 0, W, H);

            var cx = W * 0.35;
            var cy = H * 0.45;
            var chordLen = Math.min(W * 0.3, 160);

            // Draw airfoil
            c.save();
            c.translate(cx, cy);
            c.rotate(-aoaRad);

            // Pressure coloring around airfoil
            // Low pressure top (blue)
            var topGrad = c.createLinearGradient(0, -chordLen * 0.3, 0, 0);
            topGrad.addColorStop(0, 'rgba(59,130,246,0)');
            topGrad.addColorStop(1, isStalling ? 'rgba(59,130,246,0.05)' : 'rgba(59,130,246,0.2)');
            c.fillStyle = topGrad;
            c.beginPath();
            c.ellipse(0, -chordLen * 0.05, chordLen * 0.55, chordLen * 0.25, 0, Math.PI, 0);
            c.fill();

            // High pressure bottom (red)
            var botGrad = c.createLinearGradient(0, 0, 0, chordLen * 0.25);
            botGrad.addColorStop(0, 'rgba(239,68,68,0.2)');
            botGrad.addColorStop(1, 'rgba(239,68,68,0)');
            c.fillStyle = botGrad;
            c.beginPath();
            c.ellipse(0, chordLen * 0.02, chordLen * 0.55, chordLen * 0.15, 0, 0, Math.PI);
            c.fill();

            // Airfoil shape
            c.beginPath();
            c.moveTo(-chordLen * 0.5, 0);
            // Upper surface (more curved)
            c.bezierCurveTo(
              -chordLen * 0.3, -chordLen * 0.15,
              chordLen * 0.1, -chordLen * 0.12,
              chordLen * 0.5, 0
            );
            // Lower surface (flatter)
            c.bezierCurveTo(
              chordLen * 0.1, chordLen * 0.04,
              -chordLen * 0.3, chordLen * 0.03,
              -chordLen * 0.5, 0
            );
            c.closePath();
            c.fillStyle = isDark ? '#475569' : '#94a3b8';
            c.fill();
            c.strokeStyle = isDark ? '#64748b' : '#64748b';
            c.lineWidth = 1.5;
            c.stroke();

            c.restore();

            // Streamlines
            var streamCount = 12;
            for (var si2 = 0; si2 < streamCount; si2++) {
              var sy = cy - chordLen * 0.6 + (si2 / (streamCount - 1)) * chordLen * 1.2;
              var isAbove = sy < cy - 5;
              var isBelow = sy > cy + 5;
              var nearWing = Math.abs(sy - cy) < chordLen * 0.25;

              c.beginPath();
              var pts = [];
              for (var sx = 0; sx < W; sx += 4) {
                var px = sx;
                var py = sy;

                // Deflect around airfoil
                var distToCenter = dist(px, py, cx, cy);
                if (distToCenter < chordLen * 0.8) {
                  var deflectStr = Math.max(0, 1 - distToCenter / (chordLen * 0.8));

                  if (isAbove) {
                    // Speed up over top (Bernoulli)
                    py -= deflectStr * chordLen * 0.15 * Math.sin(aoaRad + 0.2);
                  } else if (isBelow) {
                    py += deflectStr * chordLen * 0.08;
                  }

                  // Stall: flow separation on top at high AoA
                  if (isStalling && isAbove && px > cx) {
                    py += (Math.random() - 0.3) * deflectStr * 20;
                  }
                }

                // Add time-based flow animation
                var flowOff = Math.sin((sx * 0.02 - timeRef.current * 3 + si2) * 0.5) * 1;
                py += flowOff;

                pts.push({ x: px, y: py });
              }

              // Draw streamline
              if (pts.length > 1) {
                c.beginPath();
                c.moveTo(pts[0].x, pts[0].y);
                for (var pk2 = 1; pk2 < pts.length; pk2++) {
                  c.lineTo(pts[pk2].x, pts[pk2].y);
                }
                if (isStalling && isAbove) {
                  c.strokeStyle = 'rgba(239,68,68,0.4)';
                } else if (isAbove) {
                  c.strokeStyle = isDark ? 'rgba(96,165,250,0.4)' : 'rgba(59,130,246,0.3)';
                } else {
                  c.strokeStyle = isDark ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.2)';
                }
                c.lineWidth = 1;
                c.stroke();
              }
            }

            // Force arrows
            // Lift arrow (up from center)
            if (cl > 0.01) {
              var liftLen = Math.min(80, cl * 50);
              c.beginPath();
              c.moveTo(cx, cy);
              c.lineTo(cx, cy - liftLen);
              c.strokeStyle = '#3b82f6';
              c.lineWidth = 3;
              c.stroke();
              // Arrowhead
              c.beginPath();
              c.moveTo(cx, cy - liftLen - 6);
              c.lineTo(cx - 5, cy - liftLen + 2);
              c.lineTo(cx + 5, cy - liftLen + 2);
              c.closePath();
              c.fillStyle = '#3b82f6';
              c.fill();
              c.fillStyle = '#3b82f6';
              c.font = 'bold 10px system-ui';
              c.textAlign = 'center';
              c.fillText('LIFT', cx, cy - liftLen - 10);
            }

            // Drag arrow (opposite to motion = rightward)
            if (cd > 0.001) {
              var dragLen = Math.min(60, cd * 400);
              c.beginPath();
              c.moveTo(cx, cy);
              c.lineTo(cx + dragLen, cy);
              c.strokeStyle = '#ef4444';
              c.lineWidth = 3;
              c.stroke();
              c.beginPath();
              c.moveTo(cx + dragLen + 6, cy);
              c.lineTo(cx + dragLen - 2, cy - 5);
              c.lineTo(cx + dragLen - 2, cy + 5);
              c.closePath();
              c.fillStyle = '#ef4444';
              c.fill();
              c.fillStyle = '#ef4444';
              c.font = 'bold 10px system-ui';
              c.textAlign = 'left';
              c.fillText('DRAG', cx + dragLen + 8, cy + 4);
            }

            // Stall warning (enhanced with flashing border + red overlay)
            if (isStalling) {
              // Red screen flash (pulsing)
              var stallPulse = 0.05 + Math.sin(timeRef.current * 8) * 0.04;
              c.fillStyle = 'rgba(239,68,68,' + stallPulse + ')';
              c.fillRect(0, 0, W, H);
              // Warning banner
              c.fillStyle = 'rgba(239,68,68,0.9)';
              c.fillRect(0, 8, W, 28);
              c.fillStyle = '#fff';
              c.font = 'bold 13px system-ui';
              c.textAlign = 'center';
              c.fillText('\u26A0 STALL \u2014 Flow Separation! Lift drops dramatically above ' + _wing.stallAngle + '\u00B0', W / 2, 27);
              // Red border flash
              c.strokeStyle = 'rgba(239,68,68,' + (0.4 + Math.sin(timeRef.current * 6) * 0.3) + ')';
              c.lineWidth = 3;
              c.strokeRect(1, 1, W - 2, H - 2);
            }

            // Pressure labels
            if (!isStalling) {
              c.font = '9px system-ui';
              c.textAlign = 'center';
              c.fillStyle = '#3b82f6';
              c.fillText('Low pressure (fast air)', cx, cy - chordLen * 0.32);
              c.fillStyle = '#ef4444';
              c.fillText('High pressure (slow air)', cx, cy + chordLen * 0.28);
            }

            // L/D curve on right side
            var graphX = W * 0.68;
            var graphY = 30;
            var graphW = W * 0.28;
            var graphH = H - 60;

            // Graph background
            c.fillStyle = isDark ? 'rgba(30,41,59,0.8)' : 'rgba(255,255,255,0.9)';
            c.fillRect(graphX - 5, graphY - 5, graphW + 10, graphH + 30);
            c.strokeStyle = isDark ? '#334155' : '#e2e8f0';
            c.lineWidth = 1;
            c.strokeRect(graphX - 5, graphY - 5, graphW + 10, graphH + 30);

            // Axes
            c.strokeStyle = isDark ? '#64748b' : '#94a3b8';
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(graphX, graphY + graphH);
            c.lineTo(graphX + graphW, graphY + graphH);
            c.stroke();
            c.beginPath();
            c.moveTo(graphX, graphY);
            c.lineTo(graphX, graphY + graphH);
            c.stroke();

            // Draw L vs AoA curve
            c.beginPath();
            var firstPt = true;
            for (var plotAoa = 0; plotAoa <= 20; plotAoa += 0.5) {
              var plotRad = plotAoa * Math.PI / 180;
              var plotCl = plotAoa <= wing.stallAngle ? wing.liftCoeff * Math.sin(2 * plotRad) : wing.liftCoeff * 0.5 * Math.sin(2 * plotRad) * (0.4 + 0.6 * Math.exp(-(plotAoa - wing.stallAngle) * 0.3));
              var plotX = graphX + (plotAoa / 20) * graphW;
              var plotY = graphY + graphH - (plotCl / 2) * graphH;
              if (firstPt) { c.moveTo(plotX, plotY); firstPt = false; }
              else c.lineTo(plotX, plotY);
            }
            c.strokeStyle = '#3b82f6';
            c.lineWidth = 2;
            c.stroke();

            // Draw drag curve
            c.beginPath();
            firstPt = true;
            for (var plotAoa2 = 0; plotAoa2 <= 20; plotAoa2 += 0.5) {
              var plotRad2 = plotAoa2 * Math.PI / 180;
              var plotCl2 = wing.liftCoeff * Math.sin(2 * plotRad2);
              var plotCd2 = wing.dragCoeff + (plotCl2 * plotCl2) / (Math.PI * 5 * 0.85);
              var plotX2 = graphX + (plotAoa2 / 20) * graphW;
              var plotY2 = graphY + graphH - (plotCd2 * 5) * graphH;
              if (firstPt) { c.moveTo(plotX2, plotY2); firstPt = false; }
              else c.lineTo(plotX2, plotY2);
            }
            c.strokeStyle = '#ef4444';
            c.lineWidth = 1.5;
            c.stroke();

            // Current AoA marker
            var markerX = graphX + (aoa / 20) * graphW;
            c.beginPath();
            c.setLineDash([3, 3]);
            c.moveTo(markerX, graphY);
            c.lineTo(markerX, graphY + graphH);
            c.strokeStyle = isDark ? '#fbbf24' : '#d97706';
            c.lineWidth = 1;
            c.stroke();
            c.setLineDash([]);

            // Graph labels
            c.fillStyle = isDark ? '#94a3b8' : '#64748b';
            c.font = '8px system-ui';
            c.textAlign = 'center';
            c.fillText('Angle of Attack (\u00B0)', graphX + graphW / 2, graphY + graphH + 22);
            c.save();
            c.translate(graphX - 14, graphY + graphH / 2);
            c.rotate(-Math.PI / 2);
            c.fillText('Coefficient', 0, 0);
            c.restore();

            // Legend
            c.fillStyle = '#3b82f6';
            c.fillRect(graphX + 4, graphY + 4, 8, 2);
            c.fillStyle = isDark ? '#94a3b8' : '#64748b';
            c.font = '8px system-ui';
            c.textAlign = 'left';
            c.fillText('Lift (C\u2097)', graphX + 16, graphY + 8);
            c.fillStyle = '#ef4444';
            c.fillRect(graphX + 4, graphY + 16, 8, 2);
            c.fillStyle = isDark ? '#94a3b8' : '#64748b';
            c.fillText('Drag (C\u2091)', graphX + 16, graphY + 20);

            // Best L/D marker
            var bestAoa = wing.bestAngle;
            var bestX = graphX + (bestAoa / 20) * graphW;
            c.beginPath();
            c.arc(bestX, graphY + graphH - 10, 3, 0, Math.PI * 2);
            c.fillStyle = '#22c55e';
            c.fill();
            c.fillStyle = '#22c55e';
            c.font = '7px system-ui';
            c.textAlign = 'center';
            c.fillText('Best L/D', bestX, graphY + graphH - 16);

            animRef.current = requestAnimationFrame(frame);
          }

          frame();
          return function() { if (animRef.current) cancelAnimationFrame(animRef.current); };
          var obs4 = new MutationObserver(function() { if (!document.contains(canvas)) { cancelAnimationFrame(animRef.current); obs4.disconnect(); canvas._arInit = false; } });
          obs4.observe(document.body, { childList: true, subtree: true });
        };

        return h('div', { className: 'space-y-3' },
          // Canvas
          h('div', { className: 'rounded-xl overflow-hidden border ' + borderCol },
            h('canvas', { 'aria-label': 'Migration visualization',
              ref: _arInitCanvas,
              role: 'img',
              'aria-label': 'Aerodynamics lab showing airfoil cross-section with streamlines. Current angle of attack: ' + aoa + ' degrees. ' + (isStalling ? 'Wing is stalling, flow separation occurring.' : 'Lift coefficient: ' + cl.toFixed(2) + ', Drag coefficient: ' + cd.toFixed(3) + ', L/D ratio: ' + ldRatio.toFixed(1)),
              tabIndex: 0,
              onKeyDown: function(e) {
                if (e.key === 'ArrowUp' && aoa < 20) { e.preventDefault(); upd('aoa', aoa + 1); }
                else if (e.key === 'ArrowDown' && aoa > 0) { e.preventDefault(); upd('aoa', aoa - 1); }
              },
              style: { width: '100%', display: 'block' }
            })
          ),

          // AoA slider
          h('div', { className: 'flex items-center gap-3' },
            h('label', { className: 'text-xs font-bold ' + textPrimary }, 'Angle of Attack:'),
            h('input', {
              type: 'range', 'aria-label': 'aoa', min: 0, max: 20, value: aoa,
              'aria-label': 'Angle of attack: ' + aoa + ' degrees',
              className: 'flex-1 accent-sky-500',
              onChange: function(e) { upd('aoa', parseInt(e.target.value, 10)); }
            }),
            h('span', { className: 'text-sm font-bold min-w-[40px] text-right ' + (isStalling ? 'text-red-500' : accent) }, aoa + '\u00B0'),
            isStalling && h('span', { className: 'text-xs font-bold text-red-500' }, '\u26A0 STALL')
          ),

          // Stats readout
          h('div', { className: 'grid grid-cols-3 gap-2 text-center' },
            [
              { label: 'Lift Coeff (C\u2097)', value: cl.toFixed(3), color: '#3b82f6' },
              { label: 'Drag Coeff (C\u2091)', value: cd.toFixed(4), color: '#ef4444' },
              { label: 'L/D Ratio', value: ldRatio.toFixed(1), color: '#22c55e' }
            ].map(function(s) {
              return h('div', { key: s.label, className: 'rounded-lg p-2 border ' + borderCol + ' ' + cardBg },
                h('div', { className: 'text-sm font-black', style: { color: s.color } }, s.value),
                h('div', { className: 'text-[9px] ' + textMuted }, s.label)
              );
            })
          ),

          // Wing type selector
          h('div', { className: 'space-y-2' },
            h('h3', { className: 'font-bold text-sm ' + textPrimary }, 'Wing Type Comparison'),
            h('div', { className: 'grid grid-cols-2 gap-2' },
              WING_TYPES.map(function(wt) {
                var active = selectedWing === wt.id;
                return h('button', {
                  key: wt.id,
                  className: 'p-3 rounded-xl text-left transition-all border ' + (active ? 'ring-2 ring-sky-400 border-sky-400 ' + accentBg : borderCol + ' ' + cardBg + ' hover:border-sky-300'),
                  'aria-label': wt.name + ' wing type. Aspect ratio: ' + wt.aspectRatio + '. ' + wt.desc,
                  'aria-pressed': active ? 'true' : 'false',
                  onClick: function() { upd('selectedWing', wt.id); }
                },
                  h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', { className: 'text-lg', 'aria-hidden': 'true' }, wt.emoji),
                    h('div', null,
                      h('div', { className: 'text-xs font-bold ' + textPrimary }, wt.name),
                      h('div', { className: 'text-[9px] ' + textMuted }, wt.shape)
                    )
                  ),
                  h('div', { className: 'text-[10px] ' + textSecondary + ' leading-relaxed' }, wt.desc),
                  h('div', { className: 'flex gap-2 mt-1.5 text-[9px]' },
                    h('span', { className: accent }, 'AR: ' + wt.aspectRatio),
                    h('span', { className: textMuted }, 'Best AoA: ' + wt.bestAngle + '\u00B0'),
                    h('span', { className: textMuted }, 'Stall: ' + wt.stallAngle + '\u00B0')
                  )
                );
              })
            )
          ),

          // Flight physics explanation
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, '\uD83D\uDCDA Flight Physics Explained'),
            h('div', { className: 'text-xs leading-relaxed space-y-3 ' + textSecondary },
              h('div', null,
                h('h4', { className: 'font-bold text-[11px] mb-1 ' + textPrimary }, 'Bernoulli\'s Principle'),
                h('p', null, 'As air speeds up, its pressure drops. A wing\'s curved upper surface forces air to travel faster over the top than under the bottom. This creates ', h('strong', null, 'lower pressure above'), ' and ', h('strong', null, 'higher pressure below'), ' the wing, generating lift.'),
                h('p', { className: 'mt-1 font-mono text-[10px] ' + accent }, 'P + \u00BDpv\u00B2 + pgh = constant')
              ),
              h('div', null,
                h('h4', { className: 'font-bold text-[11px] mb-1 ' + textPrimary }, 'Angle of Attack & Stall'),
                h('p', null, 'As the angle of attack increases, lift increases \u2014 up to a point. Beyond the ', h('strong', null, 'critical angle'), ' (stall angle), airflow separates from the upper surface. The wing loses its smooth airflow, lift drops dramatically, and drag spikes. This is a "stall."'),
                h('p', { className: 'mt-1' }, 'Current wing\'s stall angle: ', h('strong', { className: 'text-red-500' }, wing.stallAngle + '\u00B0'), '. Best L/D at: ', h('strong', { className: 'text-green-500' }, wing.bestAngle + '\u00B0'), '.')
              ),
              h('div', null,
                h('h4', { className: 'font-bold text-[11px] mb-1 ' + textPrimary }, 'Lift-to-Drag Ratio (L/D)'),
                h('p', null, 'L/D measures aerodynamic efficiency. A higher L/D means more lift per unit of drag. Albatrosses achieve L/D ratios of ', h('strong', null, '20:1'), ' (meaning 20 pounds of lift for every 1 pound of drag), among the best in nature. Modern sailplanes reach ', h('strong', null, '60:1'), '.')
              ),
              h('div', null,
                h('h4', { className: 'font-bold text-[11px] mb-1 ' + textPrimary }, 'Induced vs Parasite Drag'),
                h('p', null, h('strong', null, 'Induced drag'), ' is a byproduct of creating lift \u2014 the wingtip vortices that V-formation birds exploit. It decreases with speed. ', h('strong', null, 'Parasite drag'), ' comes from the bird\'s body pushing through air \u2014 it increases with speed\u00B2. At the intersection of these two curves lies the ', h('strong', null, 'minimum drag speed'), ' \u2014 the most efficient cruising speed.')
              ),
              h('div', null,
                h('h4', { className: 'font-bold text-[11px] mb-1 ' + textPrimary }, 'Reynolds Number'),
                h('p', null, 'Bird flight operates at Reynolds numbers between 10,000 and 500,000 \u2014 a tricky aerodynamic regime. At these scales, the boundary layer (thin layer of air clinging to the wing surface) is partly laminar and partly turbulent. Bird feathers create micro-turbulence that actually ', h('strong', null, 'helps'), ' maintain airflow attachment, especially at high angles of attack. This is something engineers are still trying to replicate in drone designs.')
              )
            )
          ),

          // Bio-inspired engineering
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, '\u2699\uFE0F Bio-Inspired Engineering'),
            h('div', { className: 'text-xs leading-relaxed space-y-2 ' + textSecondary },
              h('p', null, 'Bird flight has inspired countless engineering innovations:'),
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2' },
                [
                  { title: 'Winglets', text: 'The upturned wingtips on modern airliners (Boeing 737 MAX, Airbus A350) are directly inspired by the slotted feathers at the tip of eagle wings. These "winglets" reduce induced drag by 5-7%, saving airlines billions in fuel costs annually. They work by disrupting the wingtip vortex.' },
                  { title: 'Owl-Quiet Fans', text: 'Owl feathers have a serrated leading edge, a velvety surface texture, and a fringed trailing edge that together reduce aerodynamic noise to near-silence. Engineers at GE and Dyson have mimicked these features in turbine blades and fan designs, reducing noise by 10+ decibels.' },
                  { title: 'Kingfisher Bullet Trains', text: 'The Shinkansen bullet train\'s nose was redesigned after engineer Eiji Nakatsu, a birdwatcher, noticed that kingfishers dive from air into water without a splash. The kingfisher-bill-shaped nose reduced the sonic boom when exiting tunnels by 30% and cut electricity use by 15%.' },
                  { title: 'Morphing Wings', text: 'Birds continuously adjust wing shape, angle, and feather positions during flight \u2014 far more sophisticated than any aircraft. NASA and MIT are developing "morphing wing" technology that uses flexible materials and actuators to mimic bird-like wing adjustment, potentially improving efficiency by 8-12%.' }
                ].map(function(eng) {
                  return h('div', { key: eng.title, className: 'rounded-lg p-2.5 border ' + borderCol + ' ' + (isDark ? 'bg-slate-700/50' : 'bg-white') },
                    h('div', { className: 'text-[11px] font-bold mb-1 ' + textPrimary }, eng.title),
                    h('p', { className: 'text-[10px] leading-relaxed ' + textSecondary }, eng.text)
                  );
                })
              )
            )
          ),

          // Feather microstructure
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, '\uD83E\uDEB6 Feather Engineering'),
            h('div', { className: 'text-xs leading-relaxed space-y-2 ' + textSecondary },
              h('p', null, 'A bird feather is one of the most complex structures in nature. A single flight feather has:'),
              h('ul', { className: 'list-disc pl-4 space-y-1' },
                h('li', null, h('strong', null, 'Rachis: '), 'The central shaft \u2014 a hollow tube stronger per weight than steel, made of beta-keratin.'),
                h('li', null, h('strong', null, 'Barbs: '), 'Hundreds of branches growing from the rachis, forming the feather vane.'),
                h('li', null, h('strong', null, 'Barbules: '), 'Tiny hook-like structures connecting barbs together like Velcro. A single pigeon feather has ~1 million barbules.'),
                h('li', null, h('strong', null, 'Hooklets: '), 'Microscopic hooks on barbules that zip barbs together, creating an airtight surface. When a feather gets ruffled, a bird can "zip" it back by preening.')
              ),
              h('p', { className: 'mt-2' }, 'Flight feathers are asymmetric \u2014 the leading edge vane is narrower than the trailing edge. This asymmetry creates a cambered airfoil shape that generates lift, similar to an airplane wing. Primary feathers at the wingtips twist during the downstroke, acting like individual propeller blades.'),
              h('p', null, 'Birds have 1,000-25,000 feathers (a swan has the most). They replace all flight feathers annually during ', h('strong', null, 'molt'), ', typically after breeding season and before migration. Losing too many feathers at once would ground the bird, so molt follows a precise bilateral symmetry \u2014 matching feathers on each wing are replaced simultaneously.')
            )
          ),

          // Energy budget
          h('div', { className: 'rounded-xl p-4 border-2 border-sky-400/50 ' + accentBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, '\u26A1 Migration Energy Budget'),
            h('div', { className: 'text-xs leading-relaxed space-y-2 ' + textSecondary },
              h('p', null, 'Consider a Ruby-throated Hummingbird crossing the Gulf of Mexico (500 miles non-stop):'),
              h('div', { className: 'font-mono text-[10px] p-2 rounded-lg mt-1 ' + (isDark ? 'bg-slate-700' : 'bg-white') },
                h('div', null, 'Body mass: 3.5g'),
                h('div', null, 'Pre-flight fat: +2g (57% body weight!)'),
                h('div', null, 'Fat energy density: 9 kcal/g'),
                h('div', null, 'Available energy: ~18 kcal'),
                h('div', null, 'Flight metabolic rate: ~0.8 kcal/hr'),
                h('div', null, 'Crossing time: ~20 hours at 25 mph'),
                h('div', null, 'Energy required: ~16 kcal'),
                h('div', { className: 'mt-1 font-bold ' + accent }, 'Margin of safety: ~2 kcal (11%)')
              ),
              h('p', { className: 'mt-2' }, 'That is an incredibly thin margin. A strong headwind, a cold front, or arriving at the coast 10% underweight could be fatal. This is why stopover habitat quality is ', h('strong', null, 'literally life or death'), ' for migratory birds.')
            )
          )
        );
      }

      // ══════════════════════════════════════════
      // TAB 5: WEATHER & NAVIGATION
      // ══════════════════════════════════════════
      function renderNavigate() {
        var expandedNav = d.expandedNav || null;
        var navCanvasRef = _nvCanvasRef;
        var navAnimRef = _nvAnimRef;
        var navTimeRef = _nvTimeRef;

        // Navigation demo canvas (ref callback, not useEffect)
        var _nvInitCanvas = function(canvas) {
          if (!canvas) return;
          navCanvasRef.current = canvas;
          if (canvas._nvInit) return;
          canvas._nvInit = true;
          var c = canvas.getContext('2d');
          var dpr = window.devicePixelRatio || 1;
          var W = canvas.parentElement ? canvas.parentElement.clientWidth : 620;
          var H = 180;
          canvas.width = W * dpr;
          canvas.height = H * dpr;
          canvas.style.width = W + 'px';
          canvas.style.height = H + 'px';
          c.setTransform(dpr, 0, 0, dpr, 0, 0);

          // Stars for star navigation demo
          var stars = [];
          for (var si3 = 0; si3 < 60; si3++) {
            stars.push({
              x: Math.random() * W,
              y: Math.random() * H,
              size: 0.5 + Math.random() * 1.5,
              twinkle: Math.random() * Math.PI * 2,
              brightness: 0.3 + Math.random() * 0.7
            });
          }

          // Migrating birds (small flock)
          var navBirds = [];
          for (var nbi = 0; nbi < 5; nbi++) {
            navBirds.push({
              x: W * 0.2 + nbi * 15,
              y: H * 0.5 + (nbi % 2 ? -1 : 1) * nbi * 8,
              phase: nbi * 0.5
            });
          }

          // Magnetic field lines
          var fieldLines = [];
          for (var fl = 0; fl < 8; fl++) {
            fieldLines.push({
              startX: 0,
              startY: H * 0.15 + fl * H * 0.1,
              curve: 0.3 + Math.random() * 0.4
            });
          }

          function frame() {
            navTimeRef.current += 0.016;
            var t2 = navTimeRef.current;
            c.clearRect(0, 0, W, H);

            // Night sky gradient
            var skyGrad = c.createLinearGradient(0, 0, 0, H);
            skyGrad.addColorStop(0, '#020617');
            skyGrad.addColorStop(0.6, '#0f172a');
            skyGrad.addColorStop(1, '#1e293b');
            c.fillStyle = skyGrad;
            c.fillRect(0, 0, W, H);

            // Stars with twinkling
            for (var sk = 0; sk < stars.length; sk++) {
              var star = stars[sk];
              var twink = 0.5 + 0.5 * Math.sin(t2 * 2 + star.twinkle);
              c.globalAlpha = star.brightness * twink;
              c.fillStyle = '#ffffff';
              c.beginPath();
              c.arc(star.x, star.y, star.size, 0, Math.PI * 2);
              c.fill();
            }
            c.globalAlpha = 1;

            // Polaris (bright, labeled)
            var polarisX = W * 0.75;
            var polarisY = H * 0.12;
            c.fillStyle = '#fde68a';
            c.beginPath();
            c.arc(polarisX, polarisY, 3, 0, Math.PI * 2);
            c.fill();
            c.beginPath();
            c.arc(polarisX, polarisY, 6, 0, Math.PI * 2);
            c.strokeStyle = 'rgba(253,230,138,0.3)';
            c.lineWidth = 1;
            c.stroke();
            c.fillStyle = '#fde68a';
            c.font = '8px system-ui';
            c.textAlign = 'center';
            c.fillText('Polaris', polarisX, polarisY - 10);

            // Star rotation lines (showing how stars circle Polaris)
            c.globalAlpha = 0.15;
            for (var ri = 1; ri <= 3; ri++) {
              c.beginPath();
              c.arc(polarisX, polarisY, ri * 25, 0, Math.PI * 2);
              c.strokeStyle = '#94a3b8';
              c.lineWidth = 0.5;
              c.setLineDash([2, 4]);
              c.stroke();
              c.setLineDash([]);
            }
            c.globalAlpha = 1;

            // Magnetic field lines (curved, subtle)
            c.globalAlpha = 0.08;
            for (var fli = 0; fli < fieldLines.length; fli++) {
              var fl2 = fieldLines[fli];
              c.beginPath();
              c.moveTo(0, fl2.startY);
              c.bezierCurveTo(
                W * 0.3, fl2.startY - 20 * fl2.curve,
                W * 0.7, fl2.startY + 15 * fl2.curve,
                W, fl2.startY - 5
              );
              c.strokeStyle = '#60a5fa';
              c.lineWidth = 1;
              c.stroke();
            }
            c.globalAlpha = 1;

            // Compass in corner
            drawCompassRose(c, 50, H - 45, 28, ((t2 * 3) % 360), isDark);

            // Migrating flock
            for (var mbi = 0; mbi < navBirds.length; mbi++) {
              var nb = navBirds[mbi];
              nb.x += 0.3;
              nb.y += Math.sin(t2 * 2 + mbi) * 0.2;
              nb.phase += 0.07;
              if (nb.x > W + 20) nb.x = -20;
              drawBird(c, nb.x, nb.y, 5, nb.phase, -1, '#94a3b8', true);
            }

            // Moon
            c.fillStyle = '#e2e8f0';
            c.beginPath();
            c.arc(W * 0.9, H * 0.25, 12, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = '#020617';
            c.beginPath();
            c.arc(W * 0.9 + 4, H * 0.25 - 2, 10, 0, Math.PI * 2);
            c.fill();

            // Horizon line
            c.fillStyle = '#1e293b';
            c.fillRect(0, H - 18, W, 18);
            // Distant tree silhouettes
            c.fillStyle = '#0f172a';
            for (var ti2 = 0; ti2 < 12; ti2++) {
              var tx = ti2 * (W / 12) + 20;
              var th = 8 + Math.sin(ti2 * 1.5) * 5;
              c.beginPath();
              c.moveTo(tx - 4, H - 18);
              c.lineTo(tx, H - 18 - th);
              c.lineTo(tx + 4, H - 18);
              c.closePath();
              c.fill();
            }

            // Label
            c.fillStyle = 'rgba(255,255,255,0.5)';
            c.font = '9px system-ui';
            c.textAlign = 'left';
            c.fillText('Nocturnal migration \u2014 birds navigate by stars, magnetic field, and moon', 10, H - 4);

            navAnimRef.current = requestAnimationFrame(frame);
          }

          frame();
          return function() { if (navAnimRef.current) cancelAnimationFrame(navAnimRef.current); };
          var obs5 = new MutationObserver(function() { if (!document.contains(canvas)) { cancelAnimationFrame(navAnimRef.current); obs5.disconnect(); canvas._nvInit = false; } });
          obs5.observe(document.body, { childList: true, subtree: true });
        };

        // Challenge state
        var challengeActive = d.challengeActive || false;
        var challengeStep = d.challengeStep || 0;
        var challengeEnergy = typeof d.challengeEnergy === 'number' ? d.challengeEnergy : 100;
        var challengeDistance = typeof d.challengeDistance === 'number' ? d.challengeDistance : 3000;
        var challengeDistRemaining = typeof d.challengeDistRemaining === 'number' ? d.challengeDistRemaining : 3000;
        var challengeWeather = d.challengeWeather || 'Clear';
        var challengeFlockSize = typeof d.challengeFlockSize === 'number' ? d.challengeFlockSize : 50;
        var challengeChoices = d.challengeChoices || null;
        var challengeResult = d.challengeResult || '';
        var challengeLoading = d.challengeLoading || false;
        var challengeScore = d.challengeScore || 0;
        var challengeComplete = d.challengeComplete || false;
        var challengeLog = d.challengeLog || [];

        function startChallenge() {
          updMulti({
            challengeActive: true,
            challengeStep: 0,
            challengeEnergy: 100,
            challengeDistance: 3000,
            challengeDistRemaining: 3000,
            challengeWeather: 'Clear',
            challengeFlockSize: 50,
            challengeChoices: null,
            challengeResult: '',
            challengeScore: 0,
            challengeComplete: false,
            challengeLog: []
          });
          generateDecision(0, 100, 3000, 'Clear', 50);
        }

        function generateDecision(step, energy, remaining, weather, flockSize) {
          if (!callGemini) return;
          upd('challengeLoading', true);
          var weathers = ['Clear', 'Overcast', 'Headwind', 'Tailwind', 'Thunderstorm', 'Fog', 'Crosswind', 'Snow Squall'];
          var newWeather = weathers[Math.floor(Math.random() * weathers.length)];
          var prompt = 'You are creating a bird migration survival game for a grade ' + (gradeLevel || 5) + ' student. The flock of ' + flockSize + ' Canada Geese is migrating south. Step ' + (step + 1) + ' of the journey. Energy: ' + energy + '%. Distance remaining: ' + remaining + ' miles. Weather: ' + newWeather + '. Create ONE decision point. Format your response EXACTLY as JSON (no markdown): {"scenario": "brief description of what the flock encounters", "choices": [{"label": "choice text", "energy_cost": number, "distance_gain": number, "flock_change": number, "result": "what happens"}]}. Give exactly 3 choices with different risk/reward tradeoffs. Energy costs should be -5 to -30. Distance gains 100-500. Flock changes -5 to +2. Make it educational about bird biology.';

          callGemini(prompt).then(function(result) {
            try {
              // Try to parse JSON from the response
              var jsonStr = result;
              var startIdx = jsonStr.indexOf('{');
              var endIdx = jsonStr.lastIndexOf('}');
              if (startIdx >= 0 && endIdx > startIdx) {
                jsonStr = jsonStr.substring(startIdx, endIdx + 1);
              }
              var parsed = JSON.parse(jsonStr);
              updMulti({
                challengeChoices: parsed,
                challengeWeather: newWeather,
                challengeLoading: false
              });
            } catch (e) {
              updMulti({
                challengeChoices: {
                  scenario: 'Your flock encounters ' + newWeather.toLowerCase() + ' conditions over a mountain range. Energy is at ' + energy + '%.',
                  choices: [
                    { label: 'Push through the weather', energy_cost: -20, distance_gain: 400, flock_change: -3, result: 'The flock battles through but loses some members to exhaustion.' },
                    { label: 'Find shelter and wait', energy_cost: -5, distance_gain: 0, flock_change: 0, result: 'The flock rests safely but makes no progress.' },
                    { label: 'Detour around', energy_cost: -12, distance_gain: 250, flock_change: -1, result: 'A longer but safer route. One bird gets separated.' }
                  ]
                },
                challengeWeather: newWeather,
                challengeLoading: false
              });
            }
          }).catch(function() {
            updMulti({
              challengeChoices: {
                scenario: 'The flock faces ' + newWeather.toLowerCase() + ' conditions. ' + remaining + ' miles remain.',
                choices: [
                  { label: 'Keep flying', energy_cost: -15, distance_gain: 300, flock_change: -1, result: 'Steady progress at moderate cost.' },
                  { label: 'Land and rest', energy_cost: 10, distance_gain: 0, flock_change: 0, result: 'The flock recovers some energy.' },
                  { label: 'Ride thermals', energy_cost: -5, distance_gain: 200, flock_change: 0, result: 'Smart use of rising air currents saves energy.' }
                ]
              },
              challengeWeather: newWeather,
              challengeLoading: false
            });
          });
        }

        function makeChoice(choiceIdx) {
          if (!challengeChoices || !challengeChoices.choices) return;
          var choice = challengeChoices.choices[choiceIdx];
          if (!choice) return;

          var newEnergy = clamp(challengeEnergy + (choice.energy_cost || 0), 0, 100);
          var newRemaining = Math.max(0, challengeDistRemaining - (choice.distance_gain || 0));
          var newFlock = Math.max(1, challengeFlockSize + (choice.flock_change || 0));
          var newStep = challengeStep + 1;
          var newLog = challengeLog.concat([{
            step: challengeStep + 1,
            scenario: challengeChoices.scenario,
            choice: choice.label,
            result: choice.result,
            energy: newEnergy,
            remaining: newRemaining,
            flock: newFlock
          }]);

          var newScore = challengeScore + Math.round((choice.distance_gain || 0) / 10) + newFlock;

          // Check win/lose
          if (newRemaining <= 0) {
            updMulti({
              challengeStep: newStep,
              challengeEnergy: newEnergy,
              challengeDistRemaining: 0,
              challengeFlockSize: newFlock,
              challengeResult: choice.result,
              challengeScore: newScore + Math.round(newEnergy) + newFlock * 5,
              challengeComplete: true,
              challengeChoices: null,
              challengeLog: newLog
            });
            if (celebrate) celebrate();
            if (awardXP) awardXP(25);
            if (addToast) addToast('Migration complete! Your flock arrived safely. +25 XP', 'success');
            return;
          }

          if (newEnergy <= 0 || newFlock <= 0) {
            updMulti({
              challengeStep: newStep,
              challengeEnergy: newEnergy,
              challengeDistRemaining: newRemaining,
              challengeFlockSize: newFlock,
              challengeResult: choice.result,
              challengeScore: newScore,
              challengeComplete: true,
              challengeChoices: null,
              challengeLog: newLog
            });
            if (addToast) addToast('Your flock ran out of ' + (newEnergy <= 0 ? 'energy' : 'members') + '. Try again!', 'info');
            return;
          }

          updMulti({
            challengeStep: newStep,
            challengeEnergy: newEnergy,
            challengeDistRemaining: newRemaining,
            challengeFlockSize: newFlock,
            challengeResult: choice.result,
            challengeScore: newScore,
            challengeLog: newLog
          });

          // Generate next decision
          generateDecision(newStep, newEnergy, newRemaining, challengeWeather, newFlock);
        }

        return h('div', { className: 'space-y-4' },
          // Night sky navigation canvas
          h('div', { className: 'rounded-xl overflow-hidden border ' + borderCol },
            h('canvas', { 'aria-label': 'Migration visualization',
              ref: _nvInitCanvas,
              role: 'img',
              'aria-label': 'Animated night sky showing nocturnal bird migration. Stars twinkle around Polaris, magnetic field lines curve across the sky, and a small flock migrates through the scene. Demonstrates how birds use stars and magnetic sense to navigate at night.',
              tabIndex: 0,
              onKeyDown: function(e) {
                if (e.key === 'r' || e.key === 'R') {
                  if (callTTS) callTTS('Birds navigate using a combination of star patterns, Earth\'s magnetic field, the sun\'s position, landmarks, and even smell. Many songbirds migrate at night when the air is calmer and stars are visible.');
                }
              },
              style: { width: '100%', display: 'block' }
            })
          ),

          // Navigation methods
          h('div', { className: 'space-y-2' },
            h('h3', { className: 'font-bold text-sm ' + textPrimary }, '\uD83E\uDDED How Birds Navigate'),
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-2' },
              NAV_METHODS.map(function(nm) {
                var isExpanded = expandedNav === nm.id;
                return h('div', {
                  key: nm.id,
                  className: 'rounded-xl border transition-all cursor-pointer ' + (isExpanded ? 'ring-2 ring-sky-400 border-sky-400 ' + accentBg : borderCol + ' ' + cardBg + ' hover:border-sky-300'),
                  role: 'button',
                  tabIndex: 0,
                  'aria-expanded': isExpanded ? 'true' : 'false',
                  'aria-label': nm.name + '. ' + (isExpanded ? 'Click to collapse.' : 'Click to learn more.'),
                  onClick: function() { upd('expandedNav', isExpanded ? null : nm.id); },
                  onKeyDown: function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      upd('expandedNav', isExpanded ? null : nm.id);
                    }
                  }
                },
                  h('div', { className: 'p-3' },
                    h('div', { className: 'flex items-center gap-2 mb-1' },
                      h('span', { className: 'text-xl', 'aria-hidden': 'true' }, nm.icon),
                      h('span', { className: 'text-xs font-bold ' + textPrimary }, nm.name)
                    ),
                    isExpanded && h('p', { className: 'text-[10px] leading-relaxed mt-2 ' + textSecondary }, nm.desc)
                  )
                );
              })
            )
          ),

          // Divider
          h('hr', { className: borderCol }),

          // Challenge game
          h('div', { className: 'space-y-3' },
            h('div', { className: 'flex items-center justify-between' },
              h('h3', { className: 'font-bold text-sm ' + textPrimary }, '\uD83C\uDFAE Navigate Your Flock'),
              !challengeActive && h('button', {
                className: 'px-4 py-2 rounded-lg text-xs font-bold ' + btnPrimary,
                'aria-label': 'Start the Navigate Your Flock challenge',
                onClick: startChallenge
              }, '\uD83E\uDEBF Start Challenge')
            ),

            !challengeActive && h('p', { className: 'text-xs ' + textSecondary },
              'Guide a flock of Canada Geese from their breeding grounds in Northern Canada to their wintering grounds in the Southern US. Make decisions about weather, rest stops, and routes. Can you get your flock home safely?'
            ),

            // Active challenge
            challengeActive && h('div', { className: 'space-y-3' },
              // Status bar
              h('div', { className: 'grid grid-cols-4 gap-2 text-center' },
                h('div', { className: 'rounded-lg p-2 ' + cardBg + ' border ' + borderCol },
                  h('div', { className: 'text-[9px] ' + textMuted }, '\u26A1 Energy'),
                  h('div', { className: 'mt-1 h-2 rounded-full ' + (isDark ? 'bg-slate-700' : 'bg-slate-200') + ' overflow-hidden' },
                    h('div', { className: 'h-full rounded-full transition-all ' + (challengeEnergy > 50 ? 'bg-green-500' : challengeEnergy > 25 ? 'bg-yellow-500' : 'bg-red-500'), style: { width: challengeEnergy + '%' } })
                  ),
                  h('div', { className: 'text-xs font-bold mt-1 ' + textPrimary }, challengeEnergy + '%')
                ),
                h('div', { className: 'rounded-lg p-2 ' + cardBg + ' border ' + borderCol },
                  h('div', { className: 'text-[9px] ' + textMuted }, '\uD83D\uDCCD Distance'),
                  h('div', { className: 'mt-1 h-2 rounded-full ' + (isDark ? 'bg-slate-700' : 'bg-slate-200') + ' overflow-hidden' },
                    h('div', { className: 'h-full bg-sky-500 rounded-full transition-all', style: { width: ((challengeDistance - challengeDistRemaining) / challengeDistance * 100) + '%' } })
                  ),
                  h('div', { className: 'text-xs font-bold mt-1 ' + textPrimary }, challengeDistRemaining + ' mi left')
                ),
                h('div', { className: 'rounded-lg p-2 ' + cardBg + ' border ' + borderCol },
                  h('div', { className: 'text-[9px] ' + textMuted }, '\uD83E\uDEBF Flock'),
                  h('div', { className: 'text-sm font-bold ' + textPrimary }, challengeFlockSize),
                  h('div', { className: 'text-[9px] ' + textMuted }, 'birds')
                ),
                h('div', { className: 'rounded-lg p-2 ' + cardBg + ' border ' + borderCol },
                  h('div', { className: 'text-[9px] ' + textMuted }, '\uD83C\uDF24\uFE0F Weather'),
                  h('div', { className: 'text-[11px] font-bold ' + textPrimary }, challengeWeather),
                  h('div', { className: 'text-[9px] ' + textMuted }, 'Step ' + (challengeStep + 1))
                )
              ),

              // Last result
              challengeResult && h('div', { className: 'text-xs p-2 rounded-lg ' + (isDark ? 'bg-slate-700' : 'bg-sky-50') + ' ' + textSecondary },
                h('strong', null, 'Last result: '), challengeResult
              ),

              // Decision
              challengeLoading && h('div', { className: 'text-center py-4 ' + textMuted },
                h('span', { className: 'animate-spin inline-block text-xl' }, '\uD83C\uDF00'),
                h('p', { className: 'text-xs mt-2' }, 'Scouting ahead...')
              ),

              challengeChoices && !challengeComplete && h('div', { className: 'space-y-2' },
                h('div', { className: 'p-3 rounded-xl ' + cardBg + ' border ' + borderCol },
                  h('p', { className: 'text-xs font-medium ' + textPrimary }, challengeChoices.scenario)
                ),
                h('div', { className: 'grid gap-2' },
                  (challengeChoices.choices || []).map(function(ch, ci) {
                    return h('button', {
                      key: ci,
                      className: 'p-3 rounded-lg border text-left transition-all hover:ring-2 hover:ring-sky-300 ' + borderCol + ' ' + cardBg,
                      'aria-label': 'Choice ' + (ci + 1) + ': ' + ch.label,
                      onClick: function() { makeChoice(ci); }
                    },
                      h('div', { className: 'text-xs font-bold ' + textPrimary }, ch.label),
                      h('div', { className: 'flex gap-3 mt-1 text-[9px]' },
                        h('span', { className: (ch.energy_cost || 0) > 0 ? 'text-green-500' : 'text-red-400' }, '\u26A1 ' + (ch.energy_cost > 0 ? '+' : '') + ch.energy_cost),
                        h('span', { className: 'text-sky-400' }, '\uD83D\uDCCD +' + (ch.distance_gain || 0) + 'mi'),
                        ch.flock_change !== 0 && h('span', { className: ch.flock_change > 0 ? 'text-green-500' : 'text-red-400' }, '\uD83E\uDEBF ' + (ch.flock_change > 0 ? '+' : '') + ch.flock_change)
                      )
                    );
                  })
                )
              ),

              // Challenge complete
              challengeComplete && h('div', { className: 'text-center p-4 rounded-xl border ' + borderCol + ' ' + cardBg },
                challengeDistRemaining <= 0 ? h('div', null,
                  h('div', { className: 'text-3xl mb-2', 'aria-hidden': 'true' }, '\uD83C\uDF89'),
                  h('h4', { className: 'font-bold ' + textPrimary }, 'Migration Complete!'),
                  h('p', { className: 'text-xs ' + textSecondary + ' mt-1' }, challengeFlockSize + ' of 50 birds arrived safely.'),
                  h('p', { className: 'text-sm font-bold mt-2 ' + accent }, 'Score: ' + challengeScore)
                ) : h('div', null,
                  h('div', { className: 'text-3xl mb-2', 'aria-hidden': 'true' }, '\uD83D\uDE22'),
                  h('h4', { className: 'font-bold ' + textPrimary }, 'Migration Failed'),
                  h('p', { className: 'text-xs ' + textSecondary + ' mt-1' }, challengeEnergy <= 0 ? 'The flock ran out of energy.' : 'Too many birds were lost.'),
                  h('p', { className: 'text-xs ' + textSecondary }, 'You made it ' + (challengeDistance - challengeDistRemaining) + ' of ' + challengeDistance + ' miles.')
                ),
                h('button', {
                  className: 'mt-3 px-4 py-2 rounded-lg text-xs font-bold ' + btnPrimary,
                  'aria-label': 'Try the migration challenge again',
                  onClick: startChallenge
                }, '\uD83D\uDD04 Try Again')
              ),

              // Journey log
              challengeLog.length > 0 && h('details', { className: 'text-xs ' + textSecondary },
                h('summary', { className: 'cursor-pointer font-bold ' + textPrimary + ' text-[11px]' }, '\uD83D\uDCDC Journey Log (' + challengeLog.length + ' steps)'),
                h('div', { className: 'mt-2 space-y-1 max-h-40 overflow-y-auto' },
                  challengeLog.map(function(entry, ei) {
                    return h('div', { key: ei, className: 'p-1.5 rounded ' + (isDark ? 'bg-slate-700/50' : 'bg-slate-100') },
                      h('div', { className: 'flex items-center gap-2' },
                        h('span', { className: 'font-bold text-[10px] ' + accent }, 'Step ' + entry.step),
                        h('span', { className: 'text-[9px] ' + textMuted }, '\u26A1' + entry.energy + '% \u2022 ' + entry.remaining + 'mi \u2022 ' + entry.flock + ' birds')
                      ),
                      h('div', { className: 'text-[9px] mt-0.5' }, h('em', null, entry.choice), ' \u2014 ', entry.result)
                    );
                  })
                )
              )
            )
          ),

          // Divider
          h('hr', { className: borderCol }),

          // Threats to migratory birds
          h('div', { className: 'space-y-2' },
            h('h3', { className: 'font-bold text-sm ' + textPrimary }, '\u26A0\uFE0F Threats to Migratory Birds'),
            h('p', { className: 'text-[10px] ' + textSecondary }, 'Migratory birds face growing dangers. Understanding these threats is the first step toward conservation.'),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
              MIGRATION_THREATS.map(function(th, ti) {
                return h('div', { key: ti, className: 'rounded-lg p-3 border ' + borderCol + ' ' + cardBg },
                  h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', { className: 'text-lg', 'aria-hidden': 'true' }, th.emoji),
                    h('span', { className: 'text-xs font-bold ' + textPrimary }, th.threat)
                  ),
                  h('p', { className: 'text-[10px] leading-relaxed ' + textSecondary }, th.desc)
                );
              })
            )
          ),

          // Conservation actions
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, '\uD83C\uDF31 What You Can Do'),
            h('div', { className: 'text-xs leading-relaxed space-y-2 ' + textSecondary },
              h('ul', { className: 'list-disc pl-4 space-y-1' },
                h('li', null, h('strong', null, 'Lights Out: '), 'Turn off unnecessary lights during spring and fall migration (March-May, August-November). Even a single dark building can save hundreds of birds per night.'),
                h('li', null, h('strong', null, 'Window Decals: '), 'Apply bird-safe decals to windows. Birds see reflections of sky and trees in glass, not the glass itself. Decals spaced 2 inches apart break up reflections.'),
                h('li', null, h('strong', null, 'Native Plants: '), 'Plant native trees and shrubs that produce berries and attract insects \u2014 critical fuel for migrating birds. Non-native plants often lack the insects birds need.'),
                h('li', null, h('strong', null, 'Keep Cats Inside: '), 'Indoor cats live longer, healthier lives AND save birds. Win-win.'),
                h('li', null, h('strong', null, 'Citizen Science: '), 'Use apps like eBird (Cornell Lab) to report bird sightings. Your data helps scientists track migration timing and population trends.'),
                h('li', null, h('strong', null, 'Support Habitat: '), 'Advocate for wetland protection and responsible wind energy siting in your community.')
              )
            )
          ),

          // Did you know box
          h('div', { className: 'rounded-xl p-4 border-2 border-sky-400/50 ' + accentBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, '\uD83E\uDD14 Did You Know?'),
            h('div', { className: 'text-xs leading-relaxed space-y-2 ' + textSecondary },
              h('p', null, 'On peak migration nights, ', h('strong', null, 'over 500 million birds'), ' are in the air over North America simultaneously. Weather radar stations detect massive clouds of migrants taking off at sunset. You can watch migration in real-time at BirdCast (birdcast.info).'),
              h('p', null, 'Most songbird migration happens at night, when the air is calmer, predators are fewer, and stars are visible for navigation. Birds use the ', h('strong', null, 'setting sun'), ' to calibrate their star compass at dusk.'),
              h('p', null, 'The ', h('strong', null, 'magnetic sense'), ' of birds may work through quantum mechanics. Cryptochrome proteins in bird eyes may use quantum entanglement to detect Earth\'s magnetic field \u2014 making bird navigation one of the few biological processes that depends on quantum physics.'),
              h('p', null, 'Some bird species can detect the ', h('strong', null, 'polarization pattern'), ' of sunlight even through heavy cloud cover, using special UV-sensitive cone cells in their retinas. This means that even on overcast days, birds can determine the sun\'s position and maintain their heading.'),
              h('p', null, 'The ', h('strong', null, 'hippocampus'), ' (the brain\'s memory center) is significantly larger in migratory bird species than in non-migratory ones. During the migration season, it actually grows in size, adding new neurons through a process called adult neurogenesis. After migration, it shrinks back. This seasonal brain plasticity is a major area of neuroscience research.')
            )
          ),

          // Vocabulary builder
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, '\uD83D\uDCD6 Migration Vocabulary'),
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-1.5' },
              [
                { term: 'Zugunruhe', def: 'Migration restlessness; the urge to migrate' },
                { term: 'Hyperphagia', def: 'Extreme overeating before migration' },
                { term: 'Flyway', def: 'A broad migration corridor' },
                { term: 'Stopover', def: 'A rest/refueling site along the route' },
                { term: 'Philopatry', def: 'Returning to the same breeding site each year' },
                { term: 'Irruption', def: 'Irregular mass movement due to food scarcity' },
                { term: 'Austral', def: 'Southward migration (in Southern Hemisphere)' },
                { term: 'Boreal', def: 'Northward migration to breeding grounds' },
                { term: 'Diurnal', def: 'Migrating during daytime (raptors, swallows)' },
                { term: 'Nocturnal', def: 'Migrating at night (most songbirds)' },
                { term: 'Kettle', def: 'A group of birds circling in a thermal' },
                { term: 'Fallout', def: 'Mass emergency landing due to bad weather' }
              ].map(function(v) {
                return h('div', { key: v.term, className: 'rounded-lg p-2 ' + (isDark ? 'bg-slate-700/50' : 'bg-sky-50') },
                  h('div', { className: 'text-[10px] font-bold ' + accent }, v.term),
                  h('div', { className: 'text-[9px] ' + textSecondary }, v.def)
                );
              })
            )
          )
        );
      }

      // ══════════════════════════════════════════
      // MAIN RENDER
      // ══════════════════════════════════════════

      // Back button
      var backButton = h('button', {
        className: 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + btnSecondary,
        'aria-label': 'Back to STEM Lab tool list',
        onClick: function() { if (setStemLabTool) setStemLabTool(null); }
      },
        ArrowLeft && h(ArrowLeft, { size: 14, 'aria-hidden': 'true' }),
        'Back'
      );

      // Tab bar
      var tabBar = h('div', { className: 'flex gap-1 flex-wrap', role: 'tablist', 'aria-label': 'Migration & Wind Lab sections' },
        TABS.map(function(tb, ti) {
          var active = tab === tb.id;
          return h('button', {
            key: tb.id,
            role: 'tab',
            'aria-selected': active ? 'true' : 'false',
            'aria-label': tb.label,
            tabIndex: active ? 0 : -1,
            onKeyDown: function(e) {
              var nextIdx = ti;
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); nextIdx = (ti + 1) % TABS.length; }
              else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); nextIdx = (ti - 1 + TABS.length) % TABS.length; }
              else return;
              upd('tab', TABS[nextIdx].id);
            },
            className: 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (active ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25' : (isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')),
            onClick: function() { upd('tab', tb.id); }
          },
            h('span', { 'aria-hidden': 'true' }, tb.icon),
            tb.label
          );
        })
      );

      // Tab content
      var tabContent = null;
      if (tab === 'vformation') tabContent = renderVFormation();
      else if (tab === 'wind') tabContent = renderWindCurrents();
      else if (tab === 'routes') tabContent = renderRoutes();
      else if (tab === 'aero') tabContent = renderAero();
      else if (tab === 'navigate') tabContent = renderNavigate();

      return h('div', { className: 'space-y-3 p-3 ' + bg + ' rounded-2xl' },
        // Header
        h('div', { className: 'flex items-center justify-between' },
          backButton,
          h('div', { className: 'flex items-center gap-2' },
            h('span', { className: 'text-2xl', 'aria-hidden': 'true' }, '\uD83E\uDEBF'),
            h('div', null,
              h('h2', { className: 'font-black text-sm ' + textPrimary }, t ? t('Migration & Wind Lab') : 'Migration & Wind Lab'),
              h('p', { className: 'text-[10px] ' + textMuted }, 'V-formation \u2022 Wind currents \u2022 Flyways \u2022 Aerodynamics \u2022 Navigation')
            )
          )
        ),
        tabBar,
        h('div', { role: 'tabpanel', 'aria-label': (function() { for (var i = 0; i < TABS.length; i++) { if (TABS[i].id === tab) return TABS[i].label; } return 'Tab'; })() },
          tabContent
        )
      );
    }
  });

})();
} // end duplicate guard
