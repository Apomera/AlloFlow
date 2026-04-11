// ═══════════════════════════════════════════
// stem_tool_atctower.js — ATC Tower: Air Traffic Control Simulator
// Teaches: spatial reasoning, rate problems, vectors, sequencing,
// communication protocols, and decision-making under pressure
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('atcTower'))) {

(function() {
  'use strict';

  // ── ATC MATH HELPERS ──
  var toRad = function(d) { return d * Math.PI / 180; };
  var toDeg = function(r) { return r * 180 / Math.PI; };
  var distNm = function(x1, y1, x2, y2) { return Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1)); };
  var bearingDeg = function(x1, y1, x2, y2) { return (toDeg(Math.atan2(x2-x1, -(y2-y1))) + 360) % 360; };

  // ── AIRPORT CONFIGURATIONS ──
  var AIRPORTS = [
    { id: 'simple', name: 'Smallville Regional', code: 'SVR', runways: [{ hdg: 270, x: 150, y: 200, len: 40 }], difficulty: 'Beginner', desc: '1 runway, low traffic. Learn the basics.', maxTraffic: 4, spawnRate: 8 },
    { id: 'parallel', name: 'Metro International', code: 'MIA', runways: [{ hdg: 270, x: 150, y: 170, len: 40 }, { hdg: 270, x: 150, y: 230, len: 40 }], difficulty: 'Intermediate', desc: '2 parallel runways. Manage simultaneous approaches.', maxTraffic: 6, spawnRate: 6 },
    { id: 'crossing', name: 'Crosswind City', code: 'XWC', runways: [{ hdg: 270, x: 150, y: 200, len: 40 }, { hdg: 180, x: 200, y: 150, len: 40 }], difficulty: 'Advanced', desc: 'Crossing runways! Sequences must be conflict-free.', maxTraffic: 8, spawnRate: 5 },
    { id: 'busy', name: "O'Hare Challenge", code: 'ORD', runways: [{ hdg: 270, x: 120, y: 160, len: 35 }, { hdg: 270, x: 120, y: 200, len: 35 }, { hdg: 270, x: 120, y: 240, len: 35 }, { hdg: 320, x: 180, y: 120, len: 35 }], difficulty: 'Expert', desc: '4 runways, heavy traffic. Can you handle the pressure?', maxTraffic: 12, spawnRate: 3 },
  ];

  // ── AIRCRAFT TYPES ──
  var AC_TYPES = [
    { id: 'C172', name: 'Cessna 172', cat: 'Light', speed: 90, icon: '🛩️', color: '#60a5fa', size: 4 },
    { id: 'B738', name: 'Boeing 737', cat: 'Medium', speed: 140, icon: '✈️', color: '#fbbf24', size: 6 },
    { id: 'A320', name: 'Airbus A320', cat: 'Medium', speed: 135, icon: '✈️', color: '#4ade80', size: 6 },
    { id: 'B77W', name: 'Boeing 777', cat: 'Heavy', speed: 145, icon: '🛫', color: '#f97316', size: 8 },
    { id: 'A388', name: 'Airbus A380', cat: 'Super', speed: 140, icon: '🛫', color: '#ef4444', size: 10 },
  ];

  // ── CALLSIGNS ──
  var AIRLINES = ['Delta', 'United', 'American', 'Southwest', 'JetBlue', 'Spirit', 'Alaska', 'Frontier', 'Air Canada', 'British'];
  var genCallsign = function() { return AIRLINES[Math.floor(Math.random() * AIRLINES.length)] + ' ' + (Math.floor(Math.random() * 900) + 100); };

  // ── ATC PHRASEOLOGY TEMPLATES ──
  var PHRASES = {
    cleared_approach: '{callsign}, cleared ILS runway {rwy}, maintain {speed} knots until established.',
    go_around: '{callsign}, go around. Fly heading {hdg}, climb and maintain 3,000.',
    hold: '{callsign}, hold present position. Expect further clearance in {time} minutes.',
    speed: '{callsign}, reduce speed to {speed} knots.',
    heading: '{callsign}, turn {dir} heading {hdg}.',
    cleared_land: '{callsign}, runway {rwy}, cleared to land. Wind {windDir} at {windSpd}.',
    separation: 'Traffic alert: {callsign1} and {callsign2}, {dist} miles separation. Minimum required: {min} miles.',
  };

  // ── MATH CHALLENGE TEMPLATES ──
  var MATH_CHALLENGES = [
    { type: 'arrival_order', question: 'Aircraft A is {d1} nm out at {s1} kts. Aircraft B is {d2} nm out at {s2} kts. Who arrives first?',
      generate: function() {
        var d1 = 20 + Math.floor(Math.random() * 30);
        var s1 = 120 + Math.floor(Math.random() * 60);
        var d2 = 15 + Math.floor(Math.random() * 35);
        var s2 = 100 + Math.floor(Math.random() * 80);
        var t1 = d1 / s1 * 60; var t2 = d2 / s2 * 60;
        return { d1: d1, s1: s1, d2: d2, s2: s2, answer: t1 < t2 ? 'A' : 'B', t1: Math.round(t1 * 10) / 10, t2: Math.round(t2 * 10) / 10,
          explanation: 'A: ' + d1 + '/' + s1 + ' = ' + (Math.round(t1 * 10) / 10) + ' min. B: ' + d2 + '/' + s2 + ' = ' + (Math.round(t2 * 10) / 10) + ' min. ' + (t1 < t2 ? 'A' : 'B') + ' arrives first.' };
      }
    },
    { type: 'separation', question: 'Two aircraft are {d} nm apart, closing at a combined {rate} kts. How many minutes until they lose {sep} nm separation?',
      generate: function() {
        var d = 15 + Math.floor(Math.random() * 20);
        var rate = 200 + Math.floor(Math.random() * 200);
        var sep = 3 + Math.floor(Math.random() * 3);
        var closingDist = d - sep;
        var minutes = closingDist / rate * 60;
        return { d: d, rate: rate, sep: sep, answer: Math.round(minutes * 10) / 10,
          explanation: 'Closing distance: ' + d + ' - ' + sep + ' = ' + closingDist + ' nm. At ' + rate + ' kts closing: ' + closingDist + '/' + rate + ' × 60 = ' + (Math.round(minutes * 10) / 10) + ' minutes.' };
      }
    },
    { type: 'descent', question: 'An aircraft at FL{alt} needs to be at {target} ft in {dist} nm at {speed} kts. What descent rate (fpm) is needed?',
      generate: function() {
        var alt = (Math.floor(Math.random() * 6) + 2) * 50; // FL100-FL350
        var target = Math.floor(Math.random() * 4 + 2) * 1000;
        var dist = 30 + Math.floor(Math.random() * 40);
        var speed = 200 + Math.floor(Math.random() * 80);
        var altChange = alt * 100 - target;
        var timeMin = dist / speed * 60;
        var fpm = Math.round(altChange / timeMin);
        return { alt: alt, target: target, dist: dist, speed: speed, answer: fpm,
          explanation: 'Altitude to lose: ' + (alt * 100).toLocaleString() + ' - ' + target.toLocaleString() + ' = ' + altChange.toLocaleString() + ' ft. Time: ' + dist + '/' + speed + ' × 60 = ' + (Math.round(timeMin * 10) / 10) + ' min. Rate: ' + altChange.toLocaleString() + ' / ' + (Math.round(timeMin * 10) / 10) + ' = ~' + fpm + ' fpm.' };
      }
    },
    { type: 'wind_correction', question: 'Runway heading is {rwyHdg}°. Wind is from {windDir}° at {windSpd} kts. What is the crosswind component?',
      generate: function() {
        var rwyHdg = Math.floor(Math.random() * 36) * 10;
        var windDir = Math.floor(Math.random() * 36) * 10;
        var windSpd = 10 + Math.floor(Math.random() * 30);
        var diff = Math.abs(windDir - rwyHdg);
        if (diff > 180) diff = 360 - diff;
        var crosswind = Math.round(windSpd * Math.sin(toRad(diff)));
        return { rwyHdg: rwyHdg, windDir: windDir, windSpd: windSpd, answer: Math.abs(crosswind),
          explanation: 'Angle between wind and runway: ' + diff + '°. Crosswind = ' + windSpd + ' × sin(' + diff + '°) = ' + Math.abs(crosswind) + ' kts. ' + (Math.abs(crosswind) > 20 ? '⚠️ This exceeds many aircraft crosswind limits!' : '✅ Within limits for most aircraft.') };
      }
    },
  ];

  // ── EDUCATIONAL LESSONS ──
  var ATC_LESSONS = {
    separation: { title: 'Why Separation Matters', icon: '📏', content: 'Controllers must maintain minimum separation between aircraft: 3 nautical miles horizontally OR 1,000 feet vertically. For heavy aircraft (wake turbulence), 6nm is required behind. A 747 creates wingtip vortices that can flip a small plane — these invisible tornadoes persist for up to 3 minutes.', formula: 'Min separation: 3nm (radar) / 5nm (non-radar) / 6nm (behind heavy)' },
    sequencing: { title: 'The Art of Sequencing', icon: '📋', content: 'Sequencing is the core skill of ATC: deciding the order aircraft land. Factors include: distance from airport, speed, aircraft type (heavies need more spacing), runway assignment, and fuel state (emergency = priority). A good controller builds a smooth, evenly-spaced line of aircraft — like merging highway traffic, but in 3D.', formula: 'Time = Distance / Speed (the fundamental ATC equation)' },
    vectors: { title: 'Radar Vectors', icon: '🧭', content: 'Controllers issue heading instructions ("vectors") to guide aircraft. A 360° turn takes about 2 minutes at standard rate (3°/second). To intercept a course, the vector must account for the turn radius. Wide-body jets have larger turn radii than small planes — like the difference between a bus and a bicycle turning a corner.', formula: 'Turn radius = TAS² / (g × tan(bank angle))' },
    communication: { title: 'ATC Phraseology', icon: '📻', content: 'Aviation uses standardized phrases to prevent misunderstanding. "Cleared to land" is permission to touch down. "Go around" means abort the landing and climb. Every instruction gets a "readback" — the pilot repeats it so the controller can verify. The phonetic alphabet (Alpha, Bravo, Charlie...) prevents letter confusion over radio.', formula: '"Roger" = received. "Wilco" = will comply. "Unable" = I cannot do that.' },
    weather: { title: 'Weather & ATC', icon: '🌧️', content: 'Weather is the #1 factor in ATC delays. Thunderstorms force route changes. Low visibility reduces runway capacity (aircraft need more spacing for instrument approaches). Wind direction determines which runway to use — aircraft always land INTO the wind when possible. A 15kt crosswind is challenging; 25kt is the limit for many aircraft.', formula: 'Headwind component = wind speed × cos(angle). Crosswind = wind speed × sin(angle).' },
  };

  // ═══════════════════════════════════════════
  // REGISTER TOOL
  // ═══════════════════════════════════════════
  window.StemLab.registerTool('atcTower', {
    icon: '🗼',
    label: 'ATC Tower',
    desc: 'Air Traffic Control simulator — manage approaching aircraft, solve rate problems, and learn the math behind aviation safety.',
    color: 'emerald',
    category: 'applied',
    questHooks: [
      { id: 'land_3', label: 'Land 3 aircraft safely', icon: '🛬', check: function(d) { return (d.totalLanded || 0) >= 3; }, progress: function(d) { return (d.totalLanded || 0) + '/3'; } },
      { id: 'land_10', label: 'Land 10 aircraft total', icon: '🏆', check: function(d) { return (d.totalLanded || 0) >= 10; }, progress: function(d) { return (d.totalLanded || 0) + '/10'; } },
      { id: 'score_50', label: 'Reach ATC score of 50', icon: '⭐', check: function(d) { return (d.totalScore || 0) >= 50; }, progress: function(d) { return (d.totalScore || 0) + '/50'; } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var useState = React.useState;
      var useEffect = React.useEffect;
      var useRef = React.useRef;
      var useCallback = React.useCallback;
      var d = (ctx.toolData && ctx.toolData['atcTower']) || {};
      var upd = function(key, val) { ctx.update('atcTower', key, val); };
      var updMulti = function(obj) { ctx.updateMulti('atcTower', obj); };
      var addToast = ctx.addToast;

      var view = d.view || 'menu';
      var totalScore = d.totalScore || 0;
      var totalLanded = d.totalLanded || 0;
      var bestStreak = d.bestStreak || 0;

      // ── Game State Refs ──
      var canvasRef = useRef(null);
      var animRef = useRef(null);
      var gameRef = useRef({
        aircraft: [], time: 0, score: 0, landed: 0, conflicts: 0, streak: 0,
        selected: null, airport: null, gameOver: false, paused: false,
        wind: { dir: 270, speed: 10 }, messages: [], mathChallenge: null
      });
      var runningRef = useRef(false);

      // ── Tutorial System ──
      var tutorialSteps = [
        { msg: '👋 Welcome, Controller! Aircraft are entering your airspace. Click one to select it.', trigger: 'start', key: 'click' },
        { msg: '🛬 Good! Now press R to assign a runway. The aircraft needs to know where to land.', trigger: 'selected', key: 'R' },
        { msg: '🧭 Press H to give a heading. Guide the aircraft toward the runway.', trigger: 'runway_assigned', key: 'H' },
        { msg: '✅ Now press C to clear for approach. The aircraft will fly the ILS to the runway.', trigger: 'heading_given', key: 'C' },
        { msg: '🎉 Great — your first aircraft is on approach! Watch it land. You\'re a natural!', trigger: 'cleared', key: null },
        { msg: '💡 Tip: Watch the ETA timeline at the bottom. Keep aircraft spaced apart to avoid conflicts!', trigger: 'landed_first', key: null },
      ];
      var tutorialRef = useRef({ step: 0, active: true, dismissed: false });

      // ── ATC Sound Effects ──
      var atcAudioRef = useRef({ ctx: null });
      var playATCSound = function(type) {
        try {
          var a = atcAudioRef.current;
          if (!a.ctx) a.ctx = new (window.AudioContext || window.webkitAudioContext)();
          if (a.ctx.state === 'suspended') a.ctx.resume();
          var osc = a.ctx.createOscillator();
          var gain = a.ctx.createGain();
          osc.connect(gain); gain.connect(a.ctx.destination);
          if (type === 'select') { osc.frequency.value = 800; gain.gain.value = 0.03; osc.type = 'sine'; }
          else if (type === 'clear') { osc.frequency.value = 600; gain.gain.value = 0.04; osc.type = 'sine'; }
          else if (type === 'land') { osc.frequency.value = 500; gain.gain.value = 0.03; osc.type = 'triangle'; }
          else if (type === 'conflict') { osc.frequency.value = 300; gain.gain.value = 0.06; osc.type = 'square'; }
          else if (type === 'correct') { osc.frequency.value = 880; gain.gain.value = 0.03; osc.type = 'sine'; }
          else { osc.frequency.value = 440; gain.gain.value = 0.02; osc.type = 'sine'; }
          gain.gain.setTargetAtTime(0, a.ctx.currentTime + 0.1, 0.05);
          osc.start(); osc.stop(a.ctx.currentTime + 0.15);
        } catch(e) {}
      };

      // ── ATC Achievements ──
      var ATC_BADGES = [
        { id: 'first_land', name: 'First Landing', icon: '🛬', desc: 'Land your first aircraft', check: function(g) { return g.landed >= 1; } },
        { id: 'streak_5', name: 'Hot Streak', icon: '🔥', desc: '5 consecutive safe landings', check: function(g) { return g.streak >= 5; } },
        { id: 'streak_10', name: 'Perfect Sequence', icon: '⭐', desc: '10 consecutive safe landings', check: function(g) { return g.streak >= 10; } },
        { id: 'land_10', name: 'Busy Controller', icon: '📋', desc: 'Land 10 aircraft in one session', check: function(g) { return g.landed >= 10; } },
        { id: 'land_25', name: 'Tower Chief', icon: '🗼', desc: 'Land 25 aircraft in one session', check: function(g) { return g.landed >= 25; } },
        { id: 'math_5', name: 'Quick Calculator', icon: '🧮', desc: 'Solve 5 math challenges correctly', check: function(g) { return g.mathCorrect >= 5; } },
        { id: 'no_conflict', name: 'Safety First', icon: '🛡️', desc: 'Land 10+ aircraft with zero conflicts', check: function(g) { return g.landed >= 10 && g.conflicts < 1; } },
        { id: 'heavy_land', name: 'Heavy Metal', icon: '✈️', desc: 'Land a Heavy or Super aircraft', check: function(g) { return g.landedHeavy; } },
        { id: 'efficiency_90', name: 'Efficient Ops', icon: '📊', desc: 'Maintain 90%+ efficiency with 10+ landings', check: function(g) { return g.landed >= 10 && g.efficiency >= 90; } },
      ];
      var atcBadgesRef = useRef({});
      var atcBadgePopRef = useRef(null);
      var earnedATCBadges = d.atcBadges || {};

      var checkATCBadges = function(game, time) {
        var extra = {
          landed: game.landed, streak: game.streak, conflicts: game.conflicts,
          mathCorrect: game.mathCorrect || 0, landedHeavy: game.landedHeavy || false,
          efficiency: game.landed > 0 ? Math.max(0, 100 - Math.round(game.conflicts / game.landed * 20)) : 100
        };
        var newBadges = {};
        var justEarned = null;
        ATC_BADGES.forEach(function(badge) {
          if (earnedATCBadges[badge.id]) return;
          if (badge.check(extra)) { newBadges[badge.id] = true; justEarned = badge; }
        });
        if (Object.keys(newBadges).length > 0) {
          var updated = Object.assign({}, earnedATCBadges, newBadges);
          upd('atcBadges', updated);
          if (justEarned) { atcBadgePopRef.current = { badge: justEarned, time: time }; playATCSound('correct'); }
        }
      };

      // ── Accessibility: keyboard aircraft cycling ──
      var cycleSelection = function(direction) {
        var game = gameRef.current;
        var active = game.aircraft.filter(function(a) { return a.state !== 'landed' && a.state !== 'departed'; });
        if (active.length === 0) return;
        var currentIdx = active.findIndex(function(a) { return a.id === game.selected; });
        var nextIdx = direction > 0 ? (currentIdx + 1) % active.length : (currentIdx - 1 + active.length) % active.length;
        game.selected = active[nextIdx].id;
        var sel = active[nextIdx];
        game.messages.unshift({ text: '📻 ' + sel.callsign + ' (' + sel.type.name + ')', time: game.time, color: '#60a5fa' });
        playATCSound('select');
        announce('Selected ' + sel.callsign + '. ' + sel.type.name + '. Altitude ' + sel.altitude + '. Heading ' + Math.round(sel.heading) + '. ' + Math.round(sel.speed) + ' knots. State: ' + sel.state);
      };

      // ── WCAG 2.1 AA: Accessible state narration ──
      // Creates/updates an aria-live region that announces game events to screen readers
      var a11yRef = useRef(null);
      useEffect(function() {
        if (a11yRef.current) return;
        var region = document.createElement('div');
        region.id = 'atc-a11y-live';
        region.setAttribute('aria-live', 'assertive');
        region.setAttribute('aria-atomic', 'true');
        region.setAttribute('role', 'status');
        region.className = 'sr-only';
        region.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
        document.body.appendChild(region);
        a11yRef.current = region;
        return function() { if (region.parentNode) region.parentNode.removeChild(region); };
      }, []);
      var announce = function(msg) {
        if (a11yRef.current) { a11yRef.current.textContent = ''; setTimeout(function() { a11yRef.current.textContent = msg; }, 50); }
      };

      // ── WCAG 2.2.1: Pause mechanism ──
      var togglePause = function() {
        var game = gameRef.current;
        game.paused = !game.paused;
        announce(game.paused ? 'Game paused' : 'Game resumed');
      };

      // ── WCAG 1.4.3/1.4.11: High contrast mode ──
      var highContrast = d.highContrast || false;

      // ── WCAG 2.3.1: Reduced motion detection ──
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

      // ── Spawn aircraft ──
      var spawnAircraft = function(airport) {
        var game = gameRef.current;
        if (game.aircraft.length >= airport.maxTraffic) return;
        var type = AC_TYPES[Math.floor(Math.random() * AC_TYPES.length)];
        var side = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
        var x, y2, hdg;
        if (side === 0) { x = Math.random() * 400; y2 = 0; hdg = 150 + Math.random() * 60; }
        else if (side === 1) { x = 400; y2 = Math.random() * 400; hdg = 210 + Math.random() * 60; }
        else if (side === 2) { x = Math.random() * 400; y2 = 400; hdg = 330 + Math.random() * 60; }
        else { x = 0; y2 = Math.random() * 400; hdg = 30 + Math.random() * 60; }
        // Emergency scenarios (10% chance after 5 landings)
        var emergency = null;
        if (game.landed >= 5 && Math.random() < 0.1) {
          var emergTypes = [
            { type: 'engine', label: 'ENGINE FAILURE', msg: 'has lost an engine! Priority landing required.', priority: true, fuelOverride: 8, lesson: 'Single-engine aircraft must land immediately. Multi-engine can fly on one engine but with reduced performance. Controllers clear the runway and give direct vectors.' },
            { type: 'medical', label: 'MEDICAL EMERGENCY', msg: 'reports medical emergency on board! Requesting priority.', priority: true, lesson: 'Medical emergencies get priority sequencing. Controllers coordinate with airport emergency services. The aircraft doesn\'t need a special runway — just the fastest path to the gate.' },
            { type: 'birdstrike', label: 'BIRD STRIKE', msg: 'reports bird strike! Checking aircraft systems.', priority: false, lesson: 'Bird strikes happen ~13,000 times per year in the US. Most are minor, but they can damage engines. The pilot may request to return for inspection.' },
            { type: 'hydraulic', label: 'HYDRAULIC FAILURE', msg: 'reports partial hydraulic failure. May have difficulty steering on ground.', priority: true, lesson: 'Hydraulic systems control flaps, landing gear, and brakes. Pilots can use backup systems but need extra runway length. Controllers keep other aircraft clear.' },
          ];
          emergency = emergTypes[Math.floor(Math.random() * emergTypes.length)];
        }

        var newAC = {
          id: Date.now() + Math.random(),
          callsign: genCallsign(),
          type: type,
          x: x, y: y2,
          heading: hdg,
          targetHeading: null,
          speed: type.speed,
          targetSpeed: null,
          altitude: 5000 + Math.floor(Math.random() * 10) * 1000,
          state: 'inbound',
          assignedRunway: null,
          fuel: emergency && emergency.fuelOverride ? emergency.fuelOverride : 30 + Math.floor(Math.random() * 30),
          spawnTime: game.time,
          emergency: emergency,
        };
        game.aircraft.push(newAC);

        if (emergency) {
          game.messages.unshift({ text: '🚨 ' + newAC.callsign + ' ' + emergency.msg, time: game.time, color: '#ef4444' });
          announce(newAC.callsign + ' declares ' + emergency.label + '. ' + emergency.lesson);
          playATCSound('conflict');
        }

        // Radio check-in message
        if (!emergency) {
          var PHONETIC = { A: 'Alpha', B: 'Bravo', C: 'Charlie', D: 'Delta', E: 'Echo', F: 'Foxtrot', G: 'Golf', H: 'Hotel', I: 'India', J: 'Juliet', K: 'Kilo', L: 'Lima', M: 'Mike', N: 'November', O: 'Oscar', P: 'Papa', Q: 'Quebec', R: 'Romeo', S: 'Sierra', T: 'Tango', U: 'Uniform', V: 'Victor', W: 'Whiskey', X: 'Xray', Y: 'Yankee', Z: 'Zulu' };
          var firstLetter = newAC.callsign.charAt(0).toUpperCase();
          var phonetic = PHONETIC[firstLetter] || firstLetter;
          game.messages.unshift({ text: '📻 "' + airport.code + ' Approach, ' + newAC.callsign + ', ' + Math.round(newAC.altitude / 100) * 100 + ' descending, inbound"', time: game.time, color: '#60a5fa' });
        }
      };

      // ── Check separation conflicts ──
      var checkConflicts = function() {
        var game = gameRef.current;
        var ac = game.aircraft.filter(function(a) { return a.state !== 'landed' && a.state !== 'departed'; });
        var conflicts = [];
        for (var i = 0; i < ac.length; i++) {
          for (var j = i + 1; j < ac.length; j++) {
            var dist = distNm(ac[i].x, ac[i].y, ac[j].x, ac[j].y);
            var minSep = (ac[i].type.cat === 'Heavy' || ac[i].type.cat === 'Super' || ac[j].type.cat === 'Heavy' || ac[j].type.cat === 'Super') ? 18 : 10; // pixels ≈ nm scaled
            if (dist < minSep && Math.abs(ac[i].altitude - ac[j].altitude) < 1000) {
              conflicts.push({ a: ac[i], b: ac[j], dist: dist });
            }
          }
        }
        return conflicts;
      };

      // ── Check if aircraft is on approach/landing ──
      var checkLanding = function(ac, airport) {
        if (ac.state !== 'approach') return false;
        var rwy = airport.runways.find(function(r) { return r === ac.assignedRunway; });
        if (!rwy) return false;
        var dist = distNm(ac.x, ac.y, rwy.x, rwy.y);
        var hdgDiff = Math.abs(((ac.heading - rwy.hdg + 180 + 360) % 360) - 180);
        return dist < 8 && hdgDiff < 30;
      };

      // ── Main game loop ──
      var startGame = function(airportId) {
        var airport = AIRPORTS.find(function(a) { return a.id === airportId; });
        if (!airport) return;
        gameRef.current = {
          aircraft: [], time: 0, score: 0, landed: 0, conflicts: 0, streak: 0,
          selected: null, airport: airport, gameOver: false, paused: false,
          wind: { dir: Math.floor(Math.random() * 36) * 10, speed: 5 + Math.floor(Math.random() * 20) },
          messages: [], mathChallenge: null, nextSpawn: airport.spawnRate
        };
        runningRef.current = true;
        upd('view', 'playing');
      };

      useEffect(function() {
        if (view !== 'playing' || !canvasRef.current) return;
        var canvas = canvasRef.current;
        var gfx = canvas.getContext('2d');

        var loop = function() {
          if (!runningRef.current) return;
          var game = gameRef.current;
          if (game.gameOver || game.paused) { animRef.current = requestAnimationFrame(loop); return; }
          // Resize canvas resolution to match display (only when size changes)
          if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
          }
          var W = canvas.width;
          var H = canvas.height;
          gfx.clearRect(0, 0, W, H);
          var dt = 1 / 30;
          game.time += dt;

          var airport = game.airport;
          var scale = Math.min(W, H) / 400;

          // Spawn timer
          game.nextSpawn -= dt;
          if (game.nextSpawn <= 0) {
            spawnAircraft(airport);
            game.nextSpawn = airport.spawnRate + Math.random() * 3;
          }

          // Update aircraft positions
          game.aircraft.forEach(function(ac) {
            if (ac.state === 'landed' || ac.state === 'departed') return;
            // Turn toward target heading
            if (ac.targetHeading !== null) {
              var diff = ((ac.targetHeading - ac.heading + 180 + 360) % 360) - 180;
              var turnRate = 3; // degrees per second
              if (Math.abs(diff) < turnRate * dt) { ac.heading = ac.targetHeading; ac.targetHeading = null; }
              else ac.heading += (diff > 0 ? 1 : -1) * turnRate * dt;
            }
            // Speed adjustment
            if (ac.targetSpeed !== null) {
              var spdDiff = ac.targetSpeed - ac.speed;
              if (Math.abs(spdDiff) < 2) { ac.speed = ac.targetSpeed; ac.targetSpeed = null; }
              else ac.speed += (spdDiff > 0 ? 1 : -1) * 5 * dt;
            }
            // Move
            var spdPx = ac.speed * 0.08 * scale; // nm/s to px/s
            ac.x += Math.sin(toRad(ac.heading)) * spdPx * dt;
            ac.y -= Math.cos(toRad(ac.heading)) * spdPx * dt;
            // Fuel burn
            ac.fuel -= dt / 60;
            // Check landing
            if (checkLanding(ac, airport)) {
              ac.state = 'landed';
              game.landed++;
              game.streak++;
              var baseScore = ac.type.cat === 'Super' ? 50 : ac.type.cat === 'Heavy' ? 30 : ac.type.cat === 'Medium' ? 20 : 10;
              var emergBonus = ac.emergency ? 40 : 0;
              game.score += baseScore + emergBonus;
              if (ac.emergency) {
                game.messages.unshift({ text: '🏥 ' + ac.callsign + ' emergency resolved! +' + emergBonus + ' bonus. ' + ac.emergency.lesson, time: game.time, color: '#a78bfa' });
                announce(ac.callsign + ' emergency aircraft landed safely. Bonus ' + emergBonus + ' points. ' + ac.emergency.lesson);
              }
              game.messages.unshift({ text: '✅ ' + ac.callsign + ' landed RWY ' + (ac.assignedRunway ? ac.assignedRunway.hdg : '?') + '°', time: game.time, color: '#4ade80' });
              // Touchdown visual effect
              if (!game.touchdowns) game.touchdowns = [];
              game.touchdowns.push({ x: ac.x, y: ac.y, time: game.time, color: ac.type.color });
              playATCSound('land');
              announce(ac.callsign + ' landed. Score: ' + game.score + '. Streak: ' + game.streak);
              if (ac.type.cat === 'Heavy' || ac.type.cat === 'Super') game.landedHeavy = true;
              if (tutorialRef.current.active && tutorialRef.current.step === 4) tutorialRef.current.step = 5;
              // Trigger math challenge every 3 landings
              if (game.landed % 3 === 0 && !game.mathChallenge) {
                var template = MATH_CHALLENGES[Math.floor(Math.random() * MATH_CHALLENGES.length)];
                game.mathChallenge = template.generate();
                game.mathChallenge.type = template.type;
              }
            }
            // Off-screen departure
            if (ac.x < -20 || ac.x > 420 || ac.y < -20 || ac.y > 420) {
              if (ac.state === 'goAround') { ac.state = 'departed'; }
              else if (ac.state === 'inbound') {
                ac.state = 'departed';
                game.score -= 10; game.streak = 0;
                game.messages.unshift({ text: '❌ ' + ac.callsign + ' left airspace without clearance!', time: game.time, color: '#ef4444' });
              }
            }
            // Fuel emergency
            if (ac.fuel < 5 && ac.fuel > 4.9) {
              game.messages.unshift({ text: '🔴 ' + ac.callsign + ' FUEL EMERGENCY — priority landing!', time: game.time, color: '#ef4444' });
            }
          });

          // Remove old aircraft
          game.aircraft = game.aircraft.filter(function(ac) { return ac.state !== 'landed' || game.time - ac.spawnTime < 60; });
          game.aircraft = game.aircraft.filter(function(ac) { return ac.state !== 'departed'; });

          // Check conflicts
          var conflicts = checkConflicts();
          if (conflicts.length > 0) { game.conflicts += dt; }
          // Game over if too many conflicts
          if (game.conflicts > 15 && !game.gameOver) { game.gameOver = true; announce('Game over. Too many separation conflicts. Final score: ' + game.score + '. Aircraft landed: ' + game.landed); }

          // ═══ RENDER ═══

          // High contrast color scheme
          var hc = highContrast;
          var colors = {
            bg: hc ? '#000000' : '#0a1a0a',
            radar: hc ? 'rgba(255,255,0,' : 'rgba(34,197,94,',
            text: hc ? '#ffff00' : '#4ade80',
            textDim: hc ? 'rgba(255,255,0,0.5)' : 'rgba(34,197,94,0.3)',
            rwy: hc ? '#ffff00' : '#4ade80',
            conflict: hc ? '#ff0000' : '#ef4444',
          };

          // Background — dark radar scope with subtle radial gradient
          var bgGrad = gfx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
          bgGrad.addColorStop(0, hc ? '#0a0a0a' : '#0d1f0d');
          bgGrad.addColorStop(0.5, hc ? '#050505' : '#081408');
          bgGrad.addColorStop(1, hc ? '#000000' : '#030a03');
          gfx.fillStyle = bgGrad;
          gfx.fillRect(0, 0, W, H);

          // Subtle scanline effect (CRT phosphor look)
          if (!reducedMotion.current && !hc) {
            gfx.fillStyle = 'rgba(0,0,0,0.03)';
            for (var sl = 0; sl < H; sl += 3) { gfx.fillRect(0, sl, W, 1); }
          }

          // Outer scope ring (bezel)
          if (!hc) {
            var scopeR = Math.min(W, H) * 0.48;
            gfx.strokeStyle = 'rgba(34,197,94,0.06)'; gfx.lineWidth = 2;
            gfx.beginPath(); gfx.arc(W / 2, H / 2, scopeR, 0, Math.PI * 2); gfx.stroke();
            gfx.strokeStyle = 'rgba(34,197,94,0.03)'; gfx.lineWidth = 1;
            gfx.beginPath(); gfx.arc(W / 2, H / 2, scopeR + 3, 0, Math.PI * 2); gfx.stroke();
          }

          // Focus ring on canvas (WCAG 2.4.7)
          if (document.activeElement === canvas) {
            gfx.strokeStyle = hc ? '#ffff00' : '#4ade80'; gfx.lineWidth = 3;
            gfx.strokeRect(1, 1, W - 2, H - 2);
          }

          // Pause overlay (WCAG 2.2.1)
          if (game.paused) {
            gfx.fillStyle = 'rgba(0,0,0,0.7)'; gfx.fillRect(0, 0, W, H);
            gfx.fillStyle = '#fff'; gfx.font = 'bold 28px system-ui'; gfx.textAlign = 'center';
            gfx.fillText('⏸ PAUSED', W / 2, H * 0.4);
            gfx.fillStyle = '#94a3b8'; gfx.font = '14px system-ui';
            gfx.fillText('Press Space to resume | I for status | ESC to exit', W / 2, H * 0.5);
            gfx.fillStyle = '#64748b'; gfx.font = '12px system-ui';
            gfx.fillText('Score: ' + game.score + '  |  Landed: ' + game.landed + '  |  Streak: ' + game.streak, W / 2, H * 0.58);
            animRef.current = requestAnimationFrame(loop);
            return;
          }

          // Radar sweep effect — realistic rotating beam with phosphor decay
          if (!reducedMotion.current) {
            var sweepAngle = (game.time * 0.5) % (Math.PI * 2);
            var sweepGrad = gfx.createConicGradient(sweepAngle, W / 2, H / 2);
            sweepGrad.addColorStop(0, colors.radar + '0.12)');
            sweepGrad.addColorStop(0.02, colors.radar + '0.08)');
            sweepGrad.addColorStop(0.06, colors.radar + '0.03)');
            sweepGrad.addColorStop(0.15, colors.radar + '0)');
            sweepGrad.addColorStop(1, 'rgba(34,197,94,0)');
            gfx.fillStyle = sweepGrad;
            gfx.fillRect(0, 0, W, H);
            // Sweep line (bright leading edge)
            gfx.save();
            gfx.translate(W / 2, H / 2);
            gfx.rotate(sweepAngle);
            var sweepLen = Math.max(W, H) * 0.7;
            var lineGrad = gfx.createLinearGradient(0, 0, 0, -sweepLen);
            lineGrad.addColorStop(0, colors.radar + '0.4)');
            lineGrad.addColorStop(0.3, colors.radar + '0.15)');
            lineGrad.addColorStop(1, colors.radar + '0)');
            gfx.strokeStyle = lineGrad; gfx.lineWidth = 1.5;
            gfx.beginPath(); gfx.moveTo(0, 0); gfx.lineTo(0, -sweepLen); gfx.stroke();
            gfx.restore();
          }

          // Range rings — with intermediate dotted rings
          [40, 60, 80, 120, 160, 180].forEach(function(r2) {
            var rPx = r2 * scale;
            var isMajor = r2 % 60 === 0;
            gfx.strokeStyle = isMajor ? (colors.radar + '0.15)') : (colors.radar + '0.05)');
            gfx.lineWidth = isMajor ? 0.8 : 0.4;
            if (!isMajor) { gfx.setLineDash([2, 4]); }
            gfx.beginPath(); gfx.arc(W / 2, H / 2, rPx, 0, Math.PI * 2); gfx.stroke();
            if (!isMajor) { gfx.setLineDash([]); }
          });
          // Range ring labels
          gfx.fillStyle = colors.radar + '0.25)'; gfx.font = '7px monospace'; gfx.textAlign = 'left';
          [60, 120, 180].forEach(function(r2) {
            gfx.fillText(Math.round(r2 / 3) + 'nm', W / 2 + r2 * scale + 3, H / 2 - 2);
          });
          // Center crosshair
          gfx.strokeStyle = colors.radar + '0.08)'; gfx.lineWidth = 0.5;
          gfx.beginPath(); gfx.moveTo(W / 2 - 6, H / 2); gfx.lineTo(W / 2 + 6, H / 2); gfx.stroke();
          gfx.beginPath(); gfx.moveTo(W / 2, H / 2 - 6); gfx.lineTo(W / 2, H / 2 + 6); gfx.stroke();

          // Compass cardinals + intercardinals
          gfx.fillStyle = 'rgba(34,197,94,0.4)'; gfx.font = 'bold 10px monospace'; gfx.textAlign = 'center';
          gfx.fillText('N', W / 2, 14); gfx.fillText('S', W / 2, H - 6);
          gfx.fillText('E', W - 10, H / 2 + 4); gfx.fillText('W', 12, H / 2 + 4);
          gfx.fillStyle = 'rgba(34,197,94,0.15)'; gfx.font = '8px monospace';
          var cRad = Math.min(W, H) * 0.45;
          [['NE', 45], ['SE', 135], ['SW', 225], ['NW', 315]].forEach(function(ic) {
            var rad = toRad(ic[1]);
            gfx.fillText(ic[0], W / 2 + Math.sin(rad) * cRad, H / 2 - Math.cos(rad) * cRad + 3);
          });

          // Compass tick marks (every 10 degrees)
          gfx.strokeStyle = 'rgba(34,197,94,0.08)'; gfx.lineWidth = 0.5;
          for (var ct = 0; ct < 36; ct++) {
            var cAngle = ct * 10 * Math.PI / 180;
            var inner2 = ct % 3 === 0 ? cRad - 8 : cRad - 4;
            gfx.beginPath();
            gfx.moveTo(W / 2 + Math.sin(cAngle) * inner2, H / 2 - Math.cos(cAngle) * inner2);
            gfx.lineTo(W / 2 + Math.sin(cAngle) * cRad, H / 2 - Math.cos(cAngle) * cRad);
            gfx.stroke();
          }

          // Terrain shading — water bodies with depth gradient
          if (!hc) {
            var water1Grad = gfx.createRadialGradient(W * 0.7, H * 0.3, 0, W * 0.7, H * 0.3, 60 * scale);
            water1Grad.addColorStop(0, 'rgba(10,40,90,0.08)');
            water1Grad.addColorStop(1, 'rgba(10,40,90,0)');
            gfx.fillStyle = water1Grad;
            gfx.beginPath(); gfx.ellipse(W * 0.7, H * 0.3, 60 * scale, 40 * scale, 0.3, 0, Math.PI * 2); gfx.fill();
            // Lake label
            gfx.fillStyle = 'rgba(59,130,246,0.12)'; gfx.font = '6px system-ui'; gfx.textAlign = 'center';
            gfx.fillText('Lake', W * 0.7, H * 0.3 + 2);
            var water2Grad = gfx.createRadialGradient(W * 0.2, H * 0.7, 0, W * 0.2, H * 0.7, 45 * scale);
            water2Grad.addColorStop(0, 'rgba(10,40,90,0.08)');
            water2Grad.addColorStop(1, 'rgba(10,40,90,0)');
            gfx.fillStyle = water2Grad;
            gfx.beginPath(); gfx.ellipse(W * 0.2, H * 0.7, 45 * scale, 30 * scale, -0.2, 0, Math.PI * 2); gfx.fill();
            // City area (subtle urban texture)
            gfx.fillStyle = 'rgba(255,200,50,0.02)';
            gfx.beginPath(); gfx.ellipse(W * 0.35, H * 0.35, 50 * scale, 35 * scale, 0, 0, Math.PI * 2); gfx.fill();
            gfx.fillStyle = 'rgba(255,200,50,0.06)'; gfx.font = '6px system-ui'; gfx.textAlign = 'center';
            gfx.fillText('City', W * 0.35, H * 0.35 + 2);
          }

          // Wind sock (bottom-left corner) — animated with multi-stripe pattern
          var wsX = 40; var wsY = H - 55;
          gfx.save();
          gfx.translate(wsX, wsY);
          // Pole with ball top
          gfx.strokeStyle = 'rgba(255,255,255,0.4)'; gfx.lineWidth = 2;
          gfx.beginPath(); gfx.moveTo(0, 0); gfx.lineTo(0, -24); gfx.stroke();
          gfx.fillStyle = 'rgba(255,255,255,0.3)';
          gfx.beginPath(); gfx.arc(0, -24, 2, 0, Math.PI * 2); gfx.fill();
          // Sock segments (alternating red/white, drooping with wind)
          var windRad = toRad(game.wind.dir);
          var sockLen = Math.min(28, game.wind.speed * 0.9);
          var sockWave = Math.sin(game.time * 4) * 2;
          var sockWave2 = Math.sin(game.time * 3 + 1) * 1.5;
          var segCount = 5;
          for (var sg = 0; sg < segCount; sg++) {
            var t1 = sg / segCount; var t2 = (sg + 1) / segCount;
            var sx1 = Math.sin(windRad) * sockLen * t1 + sockWave * t1;
            var sy1 = -24 - Math.cos(windRad) * sockLen * t1 + sockWave2 * t1 * t1;
            var sx2 = Math.sin(windRad) * sockLen * t2 + sockWave * t2;
            var sy2 = -24 - Math.cos(windRad) * sockLen * t2 + sockWave2 * t2 * t2;
            gfx.strokeStyle = sg % 2 === 0 ? (game.wind.speed > 20 ? '#ef4444' : game.wind.speed > 10 ? '#f97316' : '#ef4444') : '#ffffff';
            gfx.lineWidth = 4 - sg * 0.5;
            gfx.beginPath(); gfx.moveTo(sx1, sy1); gfx.lineTo(sx2, sy2); gfx.stroke();
          }
          gfx.restore();
          // Wind info text
          gfx.fillStyle = 'rgba(255,255,255,0.35)'; gfx.font = 'bold 8px monospace'; gfx.textAlign = 'center';
          gfx.fillText(String(game.wind.dir).padStart(3, '0') + '°/' + game.wind.speed + 'kt', wsX, H - 32);

          // Restricted areas / no-fly zones (decorative)
          gfx.strokeStyle = 'rgba(239,68,68,0.1)'; gfx.lineWidth = 1; gfx.setLineDash([3, 3]);
          gfx.beginPath(); gfx.arc(W * 0.8, H * 0.2, 25 * scale, 0, Math.PI * 2); gfx.stroke();
          gfx.setLineDash([]);
          gfx.fillStyle = 'rgba(239,68,68,0.15)'; gfx.font = '7px system-ui'; gfx.textAlign = 'center';
          gfx.fillText('R-001', W * 0.8, H * 0.2 + 3);

          // Runways — enhanced with approach lights, threshold, taxiway stubs
          airport.runways.forEach(function(rwy) {
            var rx = rwy.x * scale; var ry = rwy.y * scale;
            var rwyRad = toRad(rwy.hdg);
            var dx = Math.sin(rwyRad) * rwy.len * scale / 2;
            var dy = -Math.cos(rwyRad) * rwy.len * scale / 2;
            // Runway surface (darker base)
            gfx.strokeStyle = 'rgba(100,100,100,0.4)'; gfx.lineWidth = 6 * scale;
            gfx.beginPath(); gfx.moveTo(rx - dx, ry + dy); gfx.lineTo(rx + dx, ry - dy); gfx.stroke();
            // Runway centerline
            gfx.strokeStyle = colors.rwy; gfx.lineWidth = 1.5 * scale;
            gfx.setLineDash([4 * scale, 3 * scale]);
            gfx.beginPath(); gfx.moveTo(rx - dx, ry + dy); gfx.lineTo(rx + dx, ry - dy); gfx.stroke();
            gfx.setLineDash([]);
            // Runway edge lights
            gfx.strokeStyle = colors.rwy + (hc ? '' : '80'); gfx.lineWidth = 0.5;
            var perpX = Math.cos(rwyRad) * 3 * scale; var perpY = Math.sin(rwyRad) * 3 * scale;
            gfx.beginPath(); gfx.moveTo(rx - dx + perpX, ry + dy + perpY); gfx.lineTo(rx + dx + perpX, ry - dy + perpY); gfx.stroke();
            gfx.beginPath(); gfx.moveTo(rx - dx - perpX, ry + dy - perpY); gfx.lineTo(rx + dx - perpX, ry - dy - perpY); gfx.stroke();
            // Threshold bars
            for (var tb = -2; tb <= 2; tb++) {
              var tbOff = tb * 1.2 * scale;
              var tbPx = perpX * (tb / 2.5); var tbPy = perpY * (tb / 2.5);
              gfx.fillStyle = colors.rwy;
              gfx.fillRect(rx + dx + tbPx - 1, ry - dy + tbPy - 1, 2, 2);
            }
            // Runway label
            gfx.fillStyle = colors.rwy; gfx.font = 'bold ' + (9 * scale) + 'px monospace'; gfx.textAlign = 'center';
            var rwyNum = String(Math.round(rwy.hdg / 10)).padStart(2, '0');
            gfx.fillText(rwyNum, rx, ry + 16 * scale);
            // ILS localizer cone (approach path visualization)
            gfx.save();
            gfx.translate(rx - dx, ry + dy);
            gfx.rotate(rwyRad + Math.PI);
            var coneLen = 120 * scale;
            var coneGrad = gfx.createLinearGradient(0, 0, 0, coneLen);
            coneGrad.addColorStop(0, colors.radar + '0.08)');
            coneGrad.addColorStop(1, colors.radar + '0)');
            gfx.fillStyle = coneGrad;
            gfx.beginPath(); gfx.moveTo(0, 0);
            gfx.lineTo(-15 * scale, coneLen);
            gfx.lineTo(15 * scale, coneLen);
            gfx.closePath(); gfx.fill();
            // ILS centerline
            gfx.strokeStyle = colors.radar + '0.12)'; gfx.lineWidth = 0.8; gfx.setLineDash([4, 6]);
            gfx.beginPath(); gfx.moveTo(0, 0); gfx.lineTo(0, coneLen); gfx.stroke();
            gfx.setLineDash([]);
            // Approach lights (series of dots along centerline)
            for (var al = 1; al <= 5; al++) {
              var alY = al * 12 * scale;
              var alAlpha = 0.4 - al * 0.06;
              gfx.fillStyle = 'rgba(255,200,50,' + alAlpha + ')';
              gfx.beginPath(); gfx.arc(0, alY, 1.5, 0, Math.PI * 2); gfx.fill();
              // Side lights
              gfx.beginPath(); gfx.arc(-5 * scale, alY, 1, 0, Math.PI * 2); gfx.fill();
              gfx.beginPath(); gfx.arc(5 * scale, alY, 1, 0, Math.PI * 2); gfx.fill();
            }
            gfx.restore();
            // Taxiway stubs (short lines perpendicular to runway ends)
            gfx.strokeStyle = 'rgba(59,130,246,0.15)'; gfx.lineWidth = 2 * scale;
            gfx.beginPath(); gfx.moveTo(rx + dx, ry - dy); gfx.lineTo(rx + dx + perpX * 4, ry - dy + perpY * 4); gfx.stroke();
          });

          // Aircraft
          game.aircraft.forEach(function(ac) {
            if (ac.state === 'landed' || ac.state === 'departed') return;
            var ax = ac.x * scale; var ay = ac.y * scale;
            var isSelected = game.selected === ac.id;
            var isConflict = conflicts.some(function(c) { return c.a.id === ac.id || c.b.id === ac.id; });

            // Target line (if heading assigned)
            if (isSelected && ac.targetHeading !== null) {
              gfx.strokeStyle = 'rgba(251,191,36,0.3)'; gfx.lineWidth = 1; gfx.setLineDash([3, 3]);
              gfx.beginPath(); gfx.moveTo(ax, ay);
              gfx.lineTo(ax + Math.sin(toRad(ac.targetHeading)) * 60 * scale, ay - Math.cos(toRad(ac.targetHeading)) * 60 * scale);
              gfx.stroke(); gfx.setLineDash([]);
            }

            // Radar afterglow trail (fading blips from previous sweep)
            var blipColor = ac.emergency ? '#ef4444' : isConflict ? '#ef4444' : ac.fuel < 10 ? '#f97316' : ac.type.color;
            // Emergency aircraft: pulsing red ring + label
            if (ac.emergency) {
              var emAlpha = 0.4 + Math.sin(game.time * 5) * 0.3;
              gfx.strokeStyle = 'rgba(239,68,68,' + emAlpha + ')'; gfx.lineWidth = 2;
              gfx.beginPath(); gfx.arc(ax, ay, 20 * scale, 0, Math.PI * 2); gfx.stroke();
              gfx.fillStyle = 'rgba(239,68,68,' + emAlpha + ')'; gfx.font = 'bold ' + (7 * scale) + 'px system-ui'; gfx.textAlign = 'center';
              gfx.fillText('🚨 ' + ac.emergency.label, ax, ay - 18 * scale);
            }
            for (var tr = 6; tr >= 1; tr--) {
              var trX = ax - Math.sin(toRad(ac.heading)) * tr * 4 * scale;
              var trY = ay + Math.cos(toRad(ac.heading)) * tr * 4 * scale;
              var trAlpha = (1 - tr / 7) * 0.2;
              gfx.fillStyle = isConflict ? 'rgba(239,68,68,' + trAlpha + ')' : 'rgba(34,197,94,' + trAlpha + ')';
              gfx.beginPath(); gfx.arc(trX, trY, (2 + (6 - tr) * 0.3) * scale, 0, Math.PI * 2); gfx.fill();
            }

            // Radar blip glow (bloom effect) — brighter for selected/emergency
            var glowMult = isSelected ? 2.2 : ac.emergency ? 2.0 : 1.5;
            var glowSize = ac.type.size * scale * glowMult;
            var glowGrad = gfx.createRadialGradient(ax, ay, 0, ax, ay, glowSize);
            glowGrad.addColorStop(0, blipColor + (isSelected ? '60' : '40'));
            glowGrad.addColorStop(0.5, blipColor + '15');
            glowGrad.addColorStop(1, blipColor + '00');
            gfx.fillStyle = glowGrad;
            gfx.fillRect(ax - glowSize, ay - glowSize, glowSize * 2, glowSize * 2);

            // Aircraft blip (detailed silhouette with altitude-scaled size)
            var altScale = 0.7 + Math.min(ac.altitude, 10000) / 10000 * 0.6; // bigger at higher altitude
            gfx.fillStyle = blipColor;
            gfx.save(); gfx.translate(ax, ay); gfx.rotate(toRad(ac.heading));
            var sz = ac.type.size * scale * altScale;
            if (ac.type.cat === 'Heavy' || ac.type.cat === 'Super') {
              // Wide-body — fuselage + swept wings + tail
              gfx.beginPath(); gfx.moveTo(0, -sz * 0.8); gfx.lineTo(-sz * 0.12, -sz * 0.2);
              gfx.lineTo(-sz * 0.6, sz * 0.05); gfx.lineTo(-sz * 0.55, sz * 0.15);
              gfx.lineTo(-sz * 0.12, sz * 0.1); gfx.lineTo(-sz * 0.12, sz * 0.5);
              gfx.lineTo(-sz * 0.3, sz * 0.65); gfx.lineTo(-sz * 0.25, sz * 0.7);
              gfx.lineTo(0, sz * 0.55);
              gfx.lineTo(sz * 0.25, sz * 0.7); gfx.lineTo(sz * 0.3, sz * 0.65);
              gfx.lineTo(sz * 0.12, sz * 0.5); gfx.lineTo(sz * 0.12, sz * 0.1);
              gfx.lineTo(sz * 0.55, sz * 0.15); gfx.lineTo(sz * 0.6, sz * 0.05);
              gfx.lineTo(sz * 0.12, -sz * 0.2); gfx.closePath(); gfx.fill();
            } else if (ac.type.cat === 'Light') {
              // Small prop — simple shape with high wing
              gfx.beginPath(); gfx.moveTo(0, -sz * 0.6);
              gfx.lineTo(-sz * 0.08, -sz * 0.1); gfx.lineTo(-sz * 0.45, -sz * 0.05);
              gfx.lineTo(-sz * 0.4, sz * 0.05); gfx.lineTo(-sz * 0.08, sz * 0.1);
              gfx.lineTo(-sz * 0.08, sz * 0.4); gfx.lineTo(-sz * 0.2, sz * 0.5);
              gfx.lineTo(sz * 0.2, sz * 0.5); gfx.lineTo(sz * 0.08, sz * 0.4);
              gfx.lineTo(sz * 0.08, sz * 0.1); gfx.lineTo(sz * 0.4, sz * 0.05);
              gfx.lineTo(sz * 0.45, -sz * 0.05); gfx.lineTo(sz * 0.08, -sz * 0.1);
              gfx.closePath(); gfx.fill();
            } else {
              // Narrow-body — B737/A320 shape
              gfx.beginPath(); gfx.moveTo(0, -sz * 0.7);
              gfx.lineTo(-sz * 0.1, -sz * 0.15); gfx.lineTo(-sz * 0.5, sz * 0.05);
              gfx.lineTo(-sz * 0.45, sz * 0.12); gfx.lineTo(-sz * 0.1, sz * 0.08);
              gfx.lineTo(-sz * 0.1, sz * 0.45); gfx.lineTo(-sz * 0.22, sz * 0.55);
              gfx.lineTo(-sz * 0.18, sz * 0.6);
              gfx.lineTo(0, sz * 0.48);
              gfx.lineTo(sz * 0.18, sz * 0.6); gfx.lineTo(sz * 0.22, sz * 0.55);
              gfx.lineTo(sz * 0.1, sz * 0.45); gfx.lineTo(sz * 0.1, sz * 0.08);
              gfx.lineTo(sz * 0.45, sz * 0.12); gfx.lineTo(sz * 0.5, sz * 0.05);
              gfx.lineTo(sz * 0.1, -sz * 0.15); gfx.closePath(); gfx.fill();
            }
            // Anti-collision strobe (white flash at wing tips)
            if (!reducedMotion.current && Math.floor(game.time * 1.5) % 2 === 0) {
              gfx.fillStyle = 'rgba(255,255,255,0.7)';
              var wingW = (ac.type.cat === 'Heavy' || ac.type.cat === 'Super') ? sz * 0.6 : ac.type.cat === 'Light' ? sz * 0.4 : sz * 0.5;
              gfx.beginPath(); gfx.arc(-wingW, 0, 1.2, 0, Math.PI * 2); gfx.fill();
              gfx.beginPath(); gfx.arc(wingW, 0, 1.2, 0, Math.PI * 2); gfx.fill();
            }
            // Navigation lights (red left, green right)
            if (!hc) {
              var navW = (ac.type.cat === 'Heavy' || ac.type.cat === 'Super') ? sz * 0.58 : ac.type.cat === 'Light' ? sz * 0.38 : sz * 0.48;
              gfx.fillStyle = 'rgba(239,68,68,0.6)'; gfx.beginPath(); gfx.arc(-navW, 0, 0.8, 0, Math.PI * 2); gfx.fill();
              gfx.fillStyle = 'rgba(34,197,94,0.6)'; gfx.beginPath(); gfx.arc(navW, 0, 0.8, 0, Math.PI * 2); gfx.fill();
            }
            gfx.restore();

            // Speed vector line (predicted position in 60 seconds)
            if (isSelected || ac.state === 'approach') {
              var predDist = ac.speed * 0.08 * scale * 60; // 60-second prediction
              var predX = ax + Math.sin(toRad(ac.heading)) * predDist;
              var predY = ay - Math.cos(toRad(ac.heading)) * predDist;
              gfx.strokeStyle = blipColor + '30'; gfx.lineWidth = 1;
              gfx.beginPath(); gfx.moveTo(ax, ay); gfx.lineTo(predX, predY); gfx.stroke();
              // 60-second position marker
              gfx.strokeStyle = blipColor + '50'; gfx.lineWidth = 0.5;
              gfx.beginPath(); gfx.arc(predX, predY, 3, 0, Math.PI * 2); gfx.stroke();
            }

            // Selection ring with rotating dashes
            if (isSelected) {
              gfx.strokeStyle = '#fbbf24'; gfx.lineWidth = 1.5;
              gfx.save(); gfx.translate(ax, ay); gfx.rotate(game.time * 2);
              gfx.setLineDash([4, 4]);
              gfx.beginPath(); gfx.arc(0, 0, 14 * scale, 0, Math.PI * 2); gfx.stroke();
              gfx.setLineDash([]);
              gfx.restore();
            }

            // Conflict ring (pulsing + distance line between conflicting aircraft)
            if (isConflict) {
              var confAlpha = 0.5 + Math.sin(game.time * 6) * 0.3;
              gfx.strokeStyle = 'rgba(239,68,68,' + confAlpha + ')';
              gfx.lineWidth = 2;
              gfx.beginPath(); gfx.arc(ax, ay, 16 * scale, 0, Math.PI * 2); gfx.stroke();
              // Draw separation line to conflicting partner
              conflicts.forEach(function(c) {
                if (c.a.id === ac.id) {
                  gfx.strokeStyle = 'rgba(239,68,68,' + (confAlpha * 0.5) + ')'; gfx.lineWidth = 1;
                  gfx.setLineDash([2, 2]);
                  gfx.beginPath(); gfx.moveTo(ax, ay); gfx.lineTo(c.b.x * scale, c.b.y * scale); gfx.stroke();
                  gfx.setLineDash([]);
                  // Distance label on the line
                  var midX = (ax + c.b.x * scale) / 2; var midY = (ay + c.b.y * scale) / 2;
                  gfx.fillStyle = '#ef4444'; gfx.font = 'bold 8px monospace'; gfx.textAlign = 'center';
                  gfx.fillText((c.dist / scale * 3).toFixed(1) + 'nm', midX, midY - 4);
                }
              });
            }

            // Data tag — professional radar display format
            var tagX = ax + 12 * scale; var tagY = ay - 10 * scale;
            var csShort = ac.callsign.split(' ')[0].substring(0, 3) + ac.callsign.split(' ')[1];
            var altHundreds = Math.round(ac.altitude / 100);
            var altTrend = ac.targetAltitude ? (ac.targetAltitude > ac.altitude ? '↑' : ac.targetAltitude < ac.altitude ? '↓' : '') : '';
            var catPrefix = ac.type.cat === 'Heavy' ? 'H/' : ac.type.cat === 'Super' ? 'J/' : '';
            var line1 = csShort;
            var line2 = ac.type.id + ' ' + catPrefix + altHundreds + altTrend;
            var line3 = Math.round(ac.speed) + 'kt ' + String(Math.round(ac.heading)).padStart(3, '0') + '°';
            gfx.font = (8 * scale) + 'px monospace';
            var tagW = Math.max(gfx.measureText(line1).width, gfx.measureText(line2).width, gfx.measureText(line3).width) + 14;
            var tagH = 34 * scale;
            // Tag background with subtle border
            gfx.fillStyle = isSelected ? 'rgba(50,40,0,0.8)' : 'rgba(0,18,0,0.75)';
            gfx.beginPath(); gfx.roundRect(tagX - 4, tagY - 10, tagW + 6, tagH, 4); gfx.fill();
            gfx.strokeStyle = isSelected ? 'rgba(251,191,36,0.4)' : blipColor + '30';
            gfx.lineWidth = 0.5;
            gfx.beginPath(); gfx.roundRect(tagX - 4, tagY - 10, tagW + 6, tagH, 4); gfx.stroke();
            // Left accent bar (aircraft category color)
            gfx.fillStyle = blipColor;
            gfx.fillRect(tagX - 4, tagY - 6, 2, tagH - 8);
            // Leader line from blip to tag
            gfx.strokeStyle = blipColor + '30'; gfx.lineWidth = 0.5;
            gfx.beginPath(); gfx.moveTo(ax, ay); gfx.lineTo(tagX, tagY + 4); gfx.stroke();
            // Tag text
            gfx.fillStyle = isSelected ? '#fbbf24' : blipColor;
            gfx.font = 'bold ' + (8 * scale) + 'px monospace'; gfx.textAlign = 'left';
            gfx.fillText(line1, tagX + 1, tagY);
            gfx.font = (7 * scale) + 'px monospace';
            gfx.fillStyle = isSelected ? '#fde68a' : 'rgba(255,255,255,0.55)';
            gfx.fillText(line2, tagX + 1, tagY + 10 * scale);
            gfx.fillText(line3, tagX + 1, tagY + 19 * scale);
            // State badge (approach / holding / inbound)
            var stBadge = ac.state === 'approach' ? 'ILS' : ac.state === 'holding' ? 'HLD' : ac.state === 'goAround' ? 'GA' : null;
            var stColor = ac.state === 'approach' ? '#4ade80' : ac.state === 'holding' ? '#a78bfa' : ac.state === 'goAround' ? '#f97316' : null;
            if (stBadge) {
              gfx.fillStyle = stColor + '30';
              gfx.beginPath(); gfx.roundRect(tagX + tagW - 22, tagY - 8, 20, 10, 2); gfx.fill();
              gfx.fillStyle = stColor; gfx.font = 'bold ' + (6 * scale) + 'px system-ui'; gfx.textAlign = 'center';
              gfx.fillText(stBadge, tagX + tagW - 12, tagY - 1);
              gfx.textAlign = 'left';
            }
            // Fuel warning
            if (ac.fuel < 10) {
              gfx.fillStyle = ac.fuel < 5 ? '#ef4444' : '#f97316'; gfx.font = 'bold ' + (7 * scale) + 'px system-ui';
              gfx.fillText('⛽' + Math.round(ac.fuel) + 'm', tagX + 1, tagY + 27 * scale);
            }
            // Assigned runway
            if (ac.assignedRunway && ac.state === 'inbound') {
              gfx.fillStyle = '#a78bfa'; gfx.font = (7 * scale) + 'px monospace';
              gfx.fillText('→R' + String(Math.round(ac.assignedRunway.hdg / 10)).padStart(2, '0'), tagX + 1, tagY + 27 * scale);
            }
          });

          // ── Touchdown Effects (expanding rings on landing) ──
          if (game.touchdowns) {
            game.touchdowns = game.touchdowns.filter(function(td) { return game.time - td.time < 3; });
            game.touchdowns.forEach(function(td) {
              var age = game.time - td.time;
              var alpha = Math.max(0, 1 - age / 3);
              var radius = age * 25 * scale;
              // Expanding ring
              gfx.strokeStyle = td.color + Math.round(alpha * 60).toString(16).padStart(2, '0');
              gfx.lineWidth = 2 * (1 - age / 3);
              gfx.beginPath(); gfx.arc(td.x * scale, td.y * scale, radius, 0, Math.PI * 2); gfx.stroke();
              // Inner glow
              if (age < 1) {
                var tdGlow = gfx.createRadialGradient(td.x * scale, td.y * scale, 0, td.x * scale, td.y * scale, radius * 0.6);
                tdGlow.addColorStop(0, td.color + Math.round(alpha * 30).toString(16).padStart(2, '0'));
                tdGlow.addColorStop(1, td.color + '00');
                gfx.fillStyle = tdGlow;
                gfx.beginPath(); gfx.arc(td.x * scale, td.y * scale, radius * 0.6, 0, Math.PI * 2); gfx.fill();
              }
              // Checkmark flash
              if (age < 0.8) {
                gfx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.8) + ')';
                gfx.font = 'bold ' + Math.round(14 * scale * (1 + age * 0.5)) + 'px system-ui'; gfx.textAlign = 'center';
                gfx.fillText('✓', td.x * scale, td.y * scale - radius - 5);
              }
            });
          }

          // ── Top Status Bar — segmented professional display ──
          var activeTraffic = game.aircraft.filter(function(a) { return a.state !== 'landed' && a.state !== 'departed'; }).length;
          // Bar background with subtle gradient
          var barGrad = gfx.createLinearGradient(0, 0, 0, 30);
          barGrad.addColorStop(0, 'rgba(0,0,0,0.85)');
          barGrad.addColorStop(1, 'rgba(0,10,0,0.7)');
          gfx.fillStyle = barGrad; gfx.fillRect(0, 0, W, 30);
          gfx.strokeStyle = colors.radar + '0.15)'; gfx.lineWidth = 0.5;
          gfx.beginPath(); gfx.moveTo(0, 30); gfx.lineTo(W, 30); gfx.stroke();
          // Airport identifier
          gfx.fillStyle = colors.text; gfx.font = 'bold 13px monospace'; gfx.textAlign = 'left';
          gfx.fillText('🗼 ' + airport.code, 8, 20);
          // Segmented stats
          var statsX = 80;
          var statItems = [
            { label: 'SCORE', value: String(game.score), color: '#4ade80' },
            { label: 'LANDED', value: String(game.landed), color: '#60a5fa' },
            { label: 'STREAK', value: String(game.streak), color: game.streak >= 5 ? '#fbbf24' : '#94a3b8' },
            { label: 'TRAFFIC', value: activeTraffic + '/' + airport.maxTraffic, color: activeTraffic >= airport.maxTraffic - 1 ? '#ef4444' : '#4ade80' },
          ];
          statItems.forEach(function(st) {
            gfx.fillStyle = 'rgba(255,255,255,0.2)'; gfx.font = '7px system-ui'; gfx.textAlign = 'left';
            gfx.fillText(st.label, statsX, 11);
            gfx.fillStyle = st.color; gfx.font = 'bold 11px monospace';
            gfx.fillText(st.value, statsX, 24);
            statsX += Math.max(55, gfx.measureText(st.value).width + 30);
          });
          // Wind on right
          gfx.textAlign = 'right';
          gfx.fillStyle = 'rgba(255,255,255,0.2)'; gfx.font = '7px system-ui';
          gfx.fillText('WIND', W - 8, 11);
          gfx.fillStyle = game.wind.speed > 20 ? '#ef4444' : game.wind.speed > 12 ? '#fbbf24' : '#4ade80';
          gfx.font = 'bold 11px monospace';
          gfx.fillText(String(game.wind.dir).padStart(3, '0') + '° / ' + game.wind.speed + 'kt', W - 8, 24);

          // Conflict warning bar
          if (conflicts.length > 0) {
            gfx.fillStyle = 'rgba(239,68,68,' + (0.3 + Math.sin(game.time * 4) * 0.2) + ')';
            gfx.fillRect(0, 28, W, 20);
            gfx.fillStyle = '#fff'; gfx.font = 'bold 10px system-ui'; gfx.textAlign = 'center';
            gfx.fillText('⚠️ CONFLICT — ' + conflicts.length + ' aircraft pair(s) below minimum separation!', W / 2, 42);
          }

          // ── Flight Strip Board (left panel) ──
          var activeAC = game.aircraft.filter(function(a) { return a.state !== 'landed' && a.state !== 'departed'; });
          var stripW = 130; var stripH = 22;
          var stripX = 4; var stripY = conflicts.length > 0 ? 52 : 30;
          gfx.fillStyle = 'rgba(0,0,0,0.6)';
          gfx.beginPath(); gfx.roundRect(stripX, stripY, stripW + 8, Math.min(H - stripY - 60, activeAC.length * (stripH + 2) + 22), 4); gfx.fill();
          gfx.fillStyle = 'rgba(34,197,94,0.4)'; gfx.font = 'bold 8px system-ui'; gfx.textAlign = 'left';
          gfx.fillText('📋 SEQUENCE (' + activeAC.length + ')', stripX + 4, stripY + 10);

          // Sort by distance to airport center (closest first = landing order)
          var apCx = 200; var apCy = 200;
          var sorted = activeAC.slice().sort(function(a, b) {
            var da = distNm(a.x, a.y, apCx, apCy);
            var db = distNm(b.x, b.y, apCx, apCy);
            if (a.state === 'approach' && b.state !== 'approach') return -1;
            if (b.state === 'approach' && a.state !== 'approach') return 1;
            return da - db;
          });

          sorted.slice(0, 12).forEach(function(ac, i) {
            var sy = stripY + 16 + i * (stripH + 2);
            var isAcSelected = game.selected === ac.id;
            var distToApt = distNm(ac.x, ac.y, apCx, apCy) / scale * 3;
            // Strip background
            var stripBg = ac.state === 'approach' ? 'rgba(34,197,94,0.15)' : ac.fuel < 10 ? 'rgba(239,68,68,0.15)' : isAcSelected ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.03)';
            gfx.fillStyle = stripBg;
            gfx.fillRect(stripX + 2, sy, stripW + 4, stripH);
            // Left color bar (category)
            gfx.fillStyle = ac.type.color;
            gfx.fillRect(stripX + 2, sy, 3, stripH);
            // Sequence number
            gfx.fillStyle = 'rgba(255,255,255,0.3)'; gfx.font = 'bold 8px monospace'; gfx.textAlign = 'left';
            gfx.fillText('#' + (i + 1), stripX + 7, sy + 8);
            // Callsign
            gfx.fillStyle = isAcSelected ? '#fbbf24' : '#fff'; gfx.font = 'bold 8px monospace';
            gfx.fillText(ac.callsign.split(' ')[0].substring(0, 3) + ac.callsign.split(' ')[1], stripX + 22, sy + 8);
            // Type + distance
            gfx.fillStyle = 'rgba(255,255,255,0.4)'; gfx.font = '7px monospace';
            gfx.fillText(ac.type.id + ' ' + Math.round(distToApt) + 'nm', stripX + 22, sy + 17);
            // State badge
            var stateColors = { inbound: '#60a5fa', approach: '#4ade80', goAround: '#f97316' };
            gfx.fillStyle = stateColors[ac.state] || '#64748b'; gfx.font = 'bold 6px system-ui'; gfx.textAlign = 'right';
            gfx.fillText(ac.state === 'approach' ? 'ILS' : ac.state === 'goAround' ? 'GA' : 'INB', stripX + stripW + 4, sy + 8);
            // Assigned runway
            if (ac.assignedRunway) {
              gfx.fillStyle = '#a78bfa'; gfx.fillText('R' + ac.assignedRunway.hdg, stripX + stripW + 4, sy + 17);
            }
          });

          // ── Arrival Sequence Timeline (bottom-left) ──
          if (activeAC.length > 1) {
            var tlY = H - 55; var tlX = 10; var tlW = W * 0.4;
            gfx.fillStyle = 'rgba(0,0,0,0.5)';
            gfx.beginPath(); gfx.roundRect(tlX - 4, tlY - 10, tlW + 8, 40, 4); gfx.fill();
            gfx.fillStyle = 'rgba(34,197,94,0.3)'; gfx.font = 'bold 7px system-ui'; gfx.textAlign = 'left';
            gfx.fillText('ETA TIMELINE (minutes to runway)', tlX, tlY - 2);
            // Timeline bar
            gfx.strokeStyle = 'rgba(255,255,255,0.1)'; gfx.lineWidth = 1;
            gfx.beginPath(); gfx.moveTo(tlX, tlY + 12); gfx.lineTo(tlX + tlW, tlY + 12); gfx.stroke();
            // Time markers
            gfx.fillStyle = 'rgba(255,255,255,0.15)'; gfx.font = '6px monospace'; gfx.textAlign = 'center';
            [0, 5, 10, 15, 20].forEach(function(m) {
              var mx2 = tlX + (m / 20) * tlW;
              gfx.fillText(m + 'm', mx2, tlY + 24);
              gfx.beginPath(); gfx.moveTo(mx2, tlY + 8); gfx.lineTo(mx2, tlY + 16); gfx.stroke();
            });
            // Aircraft ETA dots
            sorted.forEach(function(ac) {
              var dist2 = distNm(ac.x, ac.y, apCx, apCy) / scale * 3; // nm
              var etaMin2 = ac.speed > 0 ? dist2 / ac.speed * 60 : 20;
              if (etaMin2 > 20) return;
              var etaX = tlX + (etaMin2 / 20) * tlW;
              gfx.fillStyle = ac.type.color;
              gfx.beginPath(); gfx.arc(etaX, tlY + 12, 3, 0, Math.PI * 2); gfx.fill();
              gfx.fillStyle = 'rgba(255,255,255,0.5)'; gfx.font = '6px monospace'; gfx.textAlign = 'center';
              gfx.fillText(ac.callsign.split(' ')[1], etaX, tlY + 5);
            });
          }

          // ── Holding Pattern Visualization ──
          game.aircraft.forEach(function(ac) {
            if (ac.state !== 'holding') return;
            var hx = ac.x * scale; var hy = ac.y * scale;
            gfx.strokeStyle = 'rgba(167,139,250,0.2)'; gfx.lineWidth = 1;
            gfx.setLineDash([3, 3]);
            // Racetrack pattern
            gfx.beginPath();
            gfx.ellipse(hx + 15 * scale, hy, 20 * scale, 10 * scale, toRad(ac.heading), 0, Math.PI * 2);
            gfx.stroke();
            gfx.setLineDash([]);
            gfx.fillStyle = '#a78bfa'; gfx.font = '7px system-ui'; gfx.textAlign = 'center';
            gfx.fillText('HOLD', hx, hy - 15 * scale);
          });

          // ── Runway Status Indicators (near each runway) ──
          airport.runways.forEach(function(rwy) {
            var rx = rwy.x * scale; var ry = rwy.y * scale;
            // Count aircraft on approach to this runway
            var approachCount = game.aircraft.filter(function(a) { return a.state === 'approach' && a.assignedRunway === rwy; }).length;
            var inboundCount = game.aircraft.filter(function(a) { return a.assignedRunway === rwy && a.state === 'inbound'; }).length;
            // Status light
            var statusColor = approachCount > 0 ? '#4ade80' : inboundCount > 0 ? '#fbbf24' : '#64748b';
            gfx.fillStyle = statusColor;
            gfx.beginPath(); gfx.arc(rx + 25 * scale, ry, 3, 0, Math.PI * 2); gfx.fill();
            gfx.fillStyle = 'rgba(255,255,255,0.3)'; gfx.font = '7px monospace'; gfx.textAlign = 'left';
            gfx.fillText((approachCount > 0 ? approachCount + ' ILS' : inboundCount > 0 ? inboundCount + ' seq' : 'idle'), rx + 30 * scale, ry + 3);
          });

          // ── Performance Metrics (top-right) ──
          var perfX = W - 115; var perfY = conflicts.length > 0 ? 52 : 30;
          gfx.fillStyle = 'rgba(0,0,0,0.6)';
          gfx.beginPath(); gfx.roundRect(perfX, perfY, 110, 55, 4); gfx.fill();
          gfx.fillStyle = 'rgba(255,255,255,0.3)'; gfx.font = 'bold 7px system-ui'; gfx.textAlign = 'left';
          gfx.fillText('PERFORMANCE', perfX + 4, perfY + 10);
          // Ops per minute
          var opsPerMin = game.time > 60 ? (game.landed / (game.time / 60)).toFixed(1) : '—';
          gfx.fillStyle = '#4ade80'; gfx.font = '8px monospace';
          gfx.fillText('Ops/min: ' + opsPerMin, perfX + 4, perfY + 22);
          // Avg separation
          gfx.fillStyle = game.conflicts > 5 ? '#ef4444' : '#4ade80';
          gfx.fillText('Conflicts: ' + Math.round(game.conflicts) + 's', perfX + 4, perfY + 33);
          // Efficiency
          var efficiency = game.landed > 0 ? Math.max(0, 100 - Math.round(game.conflicts / game.landed * 20)) : 100;
          gfx.fillStyle = efficiency > 80 ? '#4ade80' : efficiency > 50 ? '#fbbf24' : '#ef4444';
          gfx.fillText('Efficiency: ' + efficiency + '%', perfX + 4, perfY + 44);

          // ── Clock ──
          var clockMin = Math.floor(game.time / 60);
          var clockSec = Math.floor(game.time % 60);
          gfx.fillStyle = 'rgba(255,255,255,0.3)'; gfx.font = '9px monospace'; gfx.textAlign = 'right';
          gfx.fillText('⏱ ' + clockMin + ':' + String(clockSec).padStart(2, '0'), W - 8, H - 22);

          // ── Message log (right side) ──
          var msgX = W - 5; var msgY = H - 10;
          gfx.textAlign = 'right'; gfx.font = '9px system-ui';
          game.messages.slice(0, 6).forEach(function(msg, i) {
            var age = game.time - msg.time;
            if (age > 15) return;
            gfx.fillStyle = msg.color || '#94a3b8';
            gfx.globalAlpha = Math.max(0.2, 1 - age / 15);
            gfx.fillText(msg.text, msgX, msgY - i * 14);
          });
          gfx.globalAlpha = 1;

          // ── Math Challenge Overlay ──
          if (game.mathChallenge && !game.mathChallenge.answered) {
            var mc = game.mathChallenge;
            var mcW2 = Math.min(W - 20, 380); var mcX = (W - mcW2) / 2; var mcY = H * 0.3;
            gfx.fillStyle = 'rgba(0,0,0,0.9)';
            gfx.beginPath(); gfx.roundRect(mcX, mcY, mcW2, 90, 10); gfx.fill();
            gfx.strokeStyle = '#fbbf24'; gfx.lineWidth = 2; gfx.stroke();
            gfx.fillStyle = '#fbbf24'; gfx.font = 'bold 9px system-ui'; gfx.textAlign = 'left';
            gfx.fillText('🧮 ATC MATH CHALLENGE (+25 bonus)', mcX + 10, mcY + 14);
            gfx.fillStyle = '#fff'; gfx.font = '12px system-ui';
            // Render question with values
            var qText = mc.type === 'arrival_order' ? 'A is ' + mc.d1 + 'nm at ' + mc.s1 + 'kt. B is ' + mc.d2 + 'nm at ' + mc.s2 + 'kt. Who arrives first?' :
                        mc.type === 'separation' ? mc.d + 'nm apart, closing at ' + mc.rate + 'kt. Minutes until ' + mc.sep + 'nm separation?' :
                        mc.type === 'descent' ? 'FL' + mc.alt + ' → ' + mc.target + 'ft in ' + mc.dist + 'nm at ' + mc.speed + 'kt. FPM needed?' :
                        'Runway ' + mc.rwyHdg + '°, wind ' + mc.windDir + '°/' + mc.windSpd + 'kt. Crosswind?';
            gfx.fillText(qText, mcX + 10, mcY + 35);
            // Answer input hint
            gfx.fillStyle = '#64748b'; gfx.font = '10px system-ui';
            if (mc.type === 'arrival_order') {
              gfx.fillText('Press A or B', mcX + 10, mcY + 55);
            } else {
              gfx.fillText('Type number + Enter (or press S to skip)', mcX + 10, mcY + 55);
            }
            if (mc.inputBuffer) {
              gfx.fillStyle = '#22d3ee'; gfx.font = 'bold 16px monospace'; gfx.textAlign = 'center';
              gfx.fillText(mc.inputBuffer, mcX + mcW2 / 2, mcY + 78);
            }
          }

          // ── Tutorial Overlay ──
          var tut = tutorialRef.current;
          if (tut.active && !tut.dismissed && tut.step < tutorialSteps.length) {
            var ts = tutorialSteps[tut.step];
            var tutW = Math.min(W - 40, 360);
            var tutX = (W - tutW) / 2;
            var tutY = H - 100;
            gfx.fillStyle = 'rgba(0,0,0,0.85)';
            gfx.beginPath(); gfx.roundRect(tutX, tutY, tutW, 42, 8); gfx.fill();
            gfx.strokeStyle = '#4ade80'; gfx.lineWidth = 1.5; gfx.stroke();
            gfx.fillStyle = '#4ade80'; gfx.font = 'bold 11px system-ui'; gfx.textAlign = 'center';
            gfx.fillText(ts.msg, W / 2, tutY + 18);
            if (ts.key) {
              gfx.fillStyle = '#fbbf24'; gfx.font = 'bold 10px monospace';
              gfx.fillText('Press: ' + ts.key, W / 2, tutY + 34);
            }
            gfx.fillStyle = 'rgba(255,255,255,0.2)'; gfx.font = '8px system-ui';
            gfx.fillText('Step ' + (tut.step + 1) + '/' + tutorialSteps.length + '  |  Press T to toggle tutorial', W / 2, tutY - 4);
          }

          // ── Achievement Badge Popup ──
          checkATCBadges(game, game.time);
          var pop = atcBadgePopRef.current;
          if (pop && game.time - pop.time < 5) {
            var popAlpha = Math.min(1, (5 - (game.time - pop.time)) / 1.5);
            gfx.globalAlpha = popAlpha;
            gfx.fillStyle = 'rgba(0,0,0,0.85)';
            var popW2 = 200; var popX2 = W - popW2 - 10; var popY2 = H - 160;
            gfx.beginPath(); gfx.roundRect(popX2, popY2, popW2, 45, 8); gfx.fill();
            gfx.strokeStyle = '#fbbf24'; gfx.lineWidth = 2; gfx.stroke();
            gfx.fillStyle = '#fbbf24'; gfx.font = 'bold 9px system-ui'; gfx.textAlign = 'left';
            gfx.fillText('🏆 BADGE EARNED!', popX2 + 8, popY2 + 14);
            gfx.fillStyle = '#fff'; gfx.font = 'bold 12px system-ui';
            gfx.fillText(pop.badge.icon + ' ' + pop.badge.name, popX2 + 8, popY2 + 32);
            gfx.globalAlpha = 1;
          }

          // ── Conflict sound ──
          if (conflicts.length > 0 && Math.floor(game.time * 2) % 2 === 0 && Math.floor((game.time - dt) * 2) % 2 !== 0) {
            playATCSound('conflict');
          }

          // ── Game Over — dramatic cinematic overlay ──
          if (game.gameOver) {
            gfx.fillStyle = 'rgba(0,0,0,0.85)'; gfx.fillRect(0, 0, W, H);
            // Red scan lines
            gfx.fillStyle = 'rgba(239,68,68,0.03)';
            for (var goSl = 0; goSl < H; goSl += 4) { gfx.fillRect(0, goSl, W, 2); }
            // Warning border
            var goFlash = 0.3 + Math.sin(game.time * 3) * 0.15;
            gfx.strokeStyle = 'rgba(239,68,68,' + goFlash + ')'; gfx.lineWidth = 4;
            gfx.strokeRect(4, 4, W - 8, H - 8);
            // Title
            gfx.fillStyle = '#ef4444'; gfx.font = 'bold 28px system-ui'; gfx.textAlign = 'center';
            gfx.fillText('⚠ TOWER CLOSED', W / 2, H * 0.3);
            gfx.fillStyle = 'rgba(239,68,68,0.5)'; gfx.font = '12px system-ui';
            gfx.fillText('Too many separation conflicts — airspace unsafe', W / 2, H * 0.37);
            // Stats panel
            var goY = H * 0.42;
            gfx.fillStyle = 'rgba(0,0,0,0.5)';
            gfx.beginPath(); gfx.roundRect(W * 0.25, goY, W * 0.5, 85, 8); gfx.fill();
            gfx.strokeStyle = 'rgba(255,255,255,0.1)'; gfx.lineWidth = 1;
            gfx.beginPath(); gfx.roundRect(W * 0.25, goY, W * 0.5, 85, 8); gfx.stroke();
            var goStats = [
              ['Final Score', String(game.score), '#fbbf24'],
              ['Aircraft Landed', String(game.landed), '#4ade80'],
              ['Best Streak', String(game.streak), '#60a5fa'],
              ['Time on Duty', Math.floor(game.time / 60) + ':' + String(Math.floor(game.time % 60)).padStart(2, '0'), '#94a3b8'],
            ];
            goStats.forEach(function(st, idx) {
              var stX = W * 0.25 + (idx + 0.5) * (W * 0.5 / 4);
              gfx.fillStyle = 'rgba(255,255,255,0.3)'; gfx.font = '8px system-ui'; gfx.textAlign = 'center';
              gfx.fillText(st[0], stX, goY + 20);
              gfx.fillStyle = st[2]; gfx.font = 'bold 18px monospace';
              gfx.fillText(st[1], stX, goY + 42);
            });
            // Efficiency rating
            var goEff = game.landed > 0 ? Math.max(0, 100 - Math.round(game.conflicts / game.landed * 20)) : 0;
            var goRating = goEff >= 90 ? 'A+ — Outstanding' : goEff >= 80 ? 'A — Excellent' : goEff >= 70 ? 'B — Good' : goEff >= 50 ? 'C — Needs Work' : 'D — Keep Practicing';
            gfx.fillStyle = 'rgba(255,255,255,0.3)'; gfx.font = '8px system-ui';
            gfx.fillText('Efficiency Rating', W / 2, goY + 60);
            gfx.fillStyle = goEff >= 80 ? '#4ade80' : goEff >= 50 ? '#fbbf24' : '#ef4444';
            gfx.font = 'bold 14px system-ui';
            gfx.fillText(goRating + ' (' + goEff + '%)', W / 2, goY + 76);
            // Return prompt
            gfx.fillStyle = '#94a3b8'; gfx.font = '12px system-ui';
            gfx.fillText('Press ESC to return to tower', W / 2, H * 0.82);
          }

          // ── Help Overlay (press ?) ──
          if (game.showHelp) {
            gfx.fillStyle = 'rgba(0,0,0,0.92)'; gfx.fillRect(0, 0, W, H);
            var helpCx = W / 2; var helpY = 20;
            gfx.fillStyle = colors.text; gfx.font = 'bold 18px system-ui'; gfx.textAlign = 'center';
            gfx.fillText('🗼 ATC TOWER — CONTROLS & HELP', helpCx, helpY += 20);
            gfx.font = '11px system-ui'; gfx.fillStyle = '#94a3b8'; helpY += 10;

            var helpSections = [
              { title: '✈️ AIRCRAFT MANAGEMENT', items: [
                ['Tab / Shift+Tab', 'Cycle through aircraft (keyboard)'],
                ['Click', 'Select aircraft (mouse)'],
                ['H', 'Assign heading — aircraft turns to your heading'],
                ['S', 'Assign speed — aircraft accelerates/decelerates'],
                ['R', 'Cycle runway assignment'],
                ['C', 'Clear for ILS approach (must assign runway first)'],
                ['G', 'Go around — abort landing, climb, reverse'],
                ['P', 'Toggle holding pattern'],
                ['D / U', 'Descend / Climb by 1,000 ft'],
              ]},
              { title: '🎮 GAME CONTROLS', items: [
                ['Space', 'Pause / Resume'],
                ['I', 'Read full status summary (screen reader)'],
                ['V', 'Toggle high contrast mode'],
                ['T', 'Toggle tutorial'],
                ['?', 'Toggle this help screen'],
                ['ESC', 'Exit to menu'],
              ]},
              { title: '📏 ATC RULES', items: [
                ['Separation', '3nm between aircraft, 6nm behind heavy/super'],
                ['Sequence', 'Closest aircraft should land first'],
                ['Fuel', 'Aircraft with <10 min fuel need priority'],
                ['Landing', 'Aircraft must be on correct heading, near runway'],
              ]},
              { title: '♿ ACCESSIBILITY', items: [
                ['Tab', 'Full keyboard control — no mouse needed'],
                ['I key', 'Announces all aircraft info to screen reader'],
                ['V key', 'High contrast yellow-on-black mode'],
                ['Space', 'Pause anytime — no time pressure when paused'],
                ['Sounds', 'Audio cues for select, land, conflict, correct'],
              ]},
            ];

            helpSections.forEach(function(section) {
              helpY += 20;
              gfx.fillStyle = colors.text; gfx.font = 'bold 10px system-ui'; gfx.textAlign = 'left';
              gfx.fillText(section.title, 30, helpY);
              section.items.forEach(function(item) {
                helpY += 14;
                if (helpY > H - 30) return;
                gfx.fillStyle = hc ? '#ffff00' : '#60a5fa'; gfx.font = 'bold 10px monospace'; gfx.textAlign = 'left';
                gfx.fillText(item[0], 40, helpY);
                gfx.fillStyle = '#94a3b8'; gfx.font = '10px system-ui';
                gfx.fillText(item[1], 160, helpY);
              });
            });

            gfx.fillStyle = '#64748b'; gfx.font = '11px system-ui'; gfx.textAlign = 'center';
            gfx.fillText('Press ? or ESC to close help', W / 2, H - 10);
          }

          // ── Adaptive Hints ──
          // Show contextual tips when the player seems stuck
          if (!game.showHelp && !game.paused && !game.gameOver) {
            var hintMsg = null;
            var activeCount = game.aircraft.filter(function(a) { return a.state === 'inbound'; }).length;
            var approachCount = game.aircraft.filter(function(a) { return a.state === 'approach'; }).length;
            if (game.time > 15 && game.landed === 0 && !game.selected && activeCount > 0) {
              hintMsg = '💡 Click an aircraft or press Tab to select one, then R to assign a runway';
            } else if (game.selected && !game.aircraft.find(function(a) { return a.id === game.selected && a.assignedRunway; }) && game.time > 20 && game.landed === 0) {
              hintMsg = '💡 Press R to assign a runway to the selected aircraft';
            } else if (activeCount > 3 && approachCount === 0 && game.time > 30) {
              hintMsg = '💡 You have ' + activeCount + ' aircraft waiting! Select one → R (runway) → C (clear approach)';
            } else if (conflicts.length > 0 && game.landed > 0) {
              hintMsg = '⚠️ Separation conflict! Assign different altitudes (D/U) or headings (H) to separate aircraft';
            }
            if (hintMsg && Math.sin(game.time * 0.5) > 0) {
              gfx.fillStyle = 'rgba(0,0,0,0.6)';
              var hintW = Math.min(W - 20, gfx.measureText(hintMsg).width + 24);
              gfx.beginPath(); gfx.roundRect((W - hintW) / 2, H - 38, hintW, 18, 4); gfx.fill();
              gfx.fillStyle = '#fbbf24'; gfx.font = '10px system-ui'; gfx.textAlign = 'center';
              gfx.fillText(hintMsg, W / 2, H - 25);
            }
          }

          // ── Controls help ──
          gfx.fillStyle = 'rgba(0,0,0,0.5)'; gfx.fillRect(0, H - 18, W, 18);
          gfx.fillStyle = 'rgba(255,255,255,0.4)'; gfx.font = '8px system-ui'; gfx.textAlign = 'center';
          gfx.fillText('Tab: Cycle | H: Heading | S: Speed | R: Runway | C: Clear | G: Go Around | P: Hold | D/U: Alt | Space: Pause | I: Info | V: Contrast', W / 2, H - 5);

          animRef.current = requestAnimationFrame(loop);
        };

        // Mouse click handler
        var onClick = function(e) {
          var game = gameRef.current;
          if (!game || !game.aircraft) return;
          var rect = canvas.getBoundingClientRect();
          // Convert mouse coords from CSS display space to canvas pixel space
          var cssX = e.clientX - rect.left;
          var cssY = e.clientY - rect.top;
          var mx = cssX * (canvas.width / rect.width);
          var my = cssY * (canvas.height / rect.height);
          var scl = Math.min(canvas.width, canvas.height) / 400;
          var closest = null; var closestDist = 35;
          game.aircraft.forEach(function(ac) {
            if (ac.state === 'landed' || ac.state === 'departed') return;
            var dist2 = distNm(mx, my, ac.x * scl, ac.y * scl);
            if (dist2 < closestDist) { closestDist = dist2; closest = ac; }
          });
          game.selected = closest ? closest.id : null;
          if (closest) {
            game.messages.unshift({ text: '📻 Selected: ' + closest.callsign + ' (' + closest.type.name + ')', time: game.time, color: '#60a5fa' });
            playATCSound('select');
            announce('Selected ' + closest.callsign + ', ' + closest.type.name + ', altitude ' + closest.altitude + ' feet, heading ' + Math.round(closest.heading) + ' degrees, ' + Math.round(closest.speed) + ' knots');
            if (tutorialRef.current.active && tutorialRef.current.step === 0) tutorialRef.current.step = 1;
          }
        };

        // Keyboard handler
        var onKey = function(e) {
          var game = gameRef.current;
          var key = e.key.toLowerCase();

          // Math challenge input
          if (game.mathChallenge && !game.mathChallenge.answered) {
            var mc = game.mathChallenge;
            if (mc.type === 'arrival_order' && (key === 'a' || key === 'b')) {
              mc.answered = true;
              mc.correct = key.toUpperCase() === mc.answer;
              if (mc.correct) game.score += 25;
              game.messages.unshift({ text: (mc.correct ? '✅ Correct! ' : '❌ Wrong. ') + mc.explanation, time: game.time, color: mc.correct ? '#4ade80' : '#ef4444' });
              setTimeout(function() { game.mathChallenge = null; }, 4000);
              return;
            }
            if (key >= '0' && key <= '9') { mc.inputBuffer = (mc.inputBuffer || '') + key; return; }
            if (key === 'backspace') { mc.inputBuffer = (mc.inputBuffer || '').slice(0, -1); return; }
            if (key === 'enter' && mc.inputBuffer) {
              mc.answered = true;
              var userAnswer = parseInt(mc.inputBuffer);
              mc.correct = Math.abs(userAnswer - mc.answer) < mc.answer * 0.15; // 15% tolerance
              if (mc.correct) { game.score += 25; game.mathCorrect = (game.mathCorrect || 0) + 1; playATCSound('correct'); }
              else { playATCSound('conflict'); }
              game.messages.unshift({ text: (mc.correct ? '✅ Correct! ' : '❌ Answer: ' + mc.answer + '. ') + mc.explanation, time: game.time, color: mc.correct ? '#4ade80' : '#ef4444' });
              setTimeout(function() { game.mathChallenge = null; }, 5000);
              return;
            }
            if (key === 's') { mc.answered = true; game.messages.unshift({ text: '⏭️ Skipped. ' + mc.explanation, time: game.time, color: '#94a3b8' }); setTimeout(function() { game.mathChallenge = null; }, 4000); return; }
          }

          if (key === 'escape') {
            runningRef.current = false;
            announce('Returning to menu. Score: ' + game.score + '. Aircraft landed: ' + game.landed);
            updMulti({ view: 'menu', totalScore: totalScore + game.score, totalLanded: totalLanded + game.landed, bestStreak: Math.max(bestStreak, game.streak) });
            return;
          }

          // WCAG 2.2.1: Pause (Space bar)
          if (key === ' ' && !game.mathChallenge) {
            e.preventDefault();
            togglePause();
            return;
          }

          // WCAG 1.4.11: High contrast toggle
          if (key === 'v') {
            upd('highContrast', !highContrast);
            announce('High contrast mode ' + (!highContrast ? 'on' : 'off'));
            return;
          }

          // Screen reader summary (I = info)
          if (key === 'i') {
            var active2 = game.aircraft.filter(function(a) { return a.state !== 'landed' && a.state !== 'departed'; });
            var approaching = active2.filter(function(a) { return a.state === 'approach'; });
            var summary = 'Airport: ' + game.airport.code + '. ' + active2.length + ' aircraft in airspace. ' + approaching.length + ' on approach. Score: ' + game.score + '. Landed: ' + game.landed + '. Streak: ' + game.streak + '. Wind: ' + game.wind.dir + ' degrees at ' + game.wind.speed + ' knots.';
            if (game.selected) {
              var selAc = game.aircraft.find(function(a) { return a.id === game.selected; });
              if (selAc) summary += ' Selected: ' + selAc.callsign + ', ' + selAc.type.name + ', altitude ' + selAc.altitude + ', heading ' + Math.round(selAc.heading) + ', ' + Math.round(selAc.speed) + ' knots, state: ' + selAc.state + '.';
            }
            announce(summary);
            return;
          }

          // Tab to cycle between aircraft (accessibility)
          if (key === 'tab') {
            e.preventDefault();
            cycleSelection(e.shiftKey ? -1 : 1);
            return;
          }

          // Help overlay
          if (key === '?' || key === '/') {
            game.showHelp = !game.showHelp;
            announce(game.showHelp ? 'Help screen opened. Listing all controls and rules.' : 'Help screen closed.');
            return;
          }

          // Dismiss tutorial
          if (key === 't') {
            tutorialRef.current.dismissed = !tutorialRef.current.dismissed;
            return;
          }

          var sel = game.aircraft.find(function(a) { return a.id === game.selected; });
          if (!sel) return;

          if (key === 'h') {
            var hdgStr = prompt('Heading for ' + sel.callsign + '? (0-360)');
            if (hdgStr) { sel.targetHeading = parseInt(hdgStr) % 360; game.messages.unshift({ text: '🧭 ' + sel.callsign + ' turn heading ' + sel.targetHeading + '°', time: game.time, color: '#fbbf24' }); playATCSound('select'); if (tutorialRef.current.active && tutorialRef.current.step === 2) tutorialRef.current.step = 3; }
          }
          if (key === 's') {
            var spdStr = prompt('Speed for ' + sel.callsign + '? (knots)');
            if (spdStr) { sel.targetSpeed = parseInt(spdStr); game.messages.unshift({ text: '💨 ' + sel.callsign + ' speed ' + sel.targetSpeed + ' kts', time: game.time, color: '#22d3ee' }); }
          }
          if (key === 'c') {
            if (sel.assignedRunway) {
              sel.state = 'approach';
              var rwyHdg2 = sel.assignedRunway.hdg;
              sel.targetHeading = (rwyHdg2 + 180) % 360; // fly toward runway
              game.messages.unshift({ text: '✈️ ' + sel.callsign + ' cleared ILS RWY ' + rwyHdg2 + '°', time: game.time, color: '#4ade80' });
              playATCSound('clear');
              if (tutorialRef.current.active && tutorialRef.current.step === 3) tutorialRef.current.step = 4;
            } else {
              game.messages.unshift({ text: '⚠️ Assign runway first (R)', time: game.time, color: '#f97316' });
            }
          }
          if (key === 'r') {
            var rwys = game.airport.runways;
            var rwyIdx = rwys.indexOf(sel.assignedRunway);
            sel.assignedRunway = rwys[(rwyIdx + 1) % rwys.length];
            game.messages.unshift({ text: '🛬 ' + sel.callsign + ' assigned RWY ' + sel.assignedRunway.hdg + '°', time: game.time, color: '#a78bfa' });
            playATCSound('select');
            if (tutorialRef.current.active && tutorialRef.current.step === 1) tutorialRef.current.step = 2;
          }
          if (key === 'g') {
            sel.state = 'goAround';
            sel.targetHeading = (sel.heading + 180) % 360;
            sel.altitude = 3000;
            game.messages.unshift({ text: '🔄 ' + sel.callsign + ' GO AROUND — fly heading ' + sel.targetHeading + '°, climb 3,000', time: game.time, color: '#f97316' });
          }
          if (key === 'p') {
            sel.state = sel.state === 'holding' ? 'inbound' : 'holding';
            game.messages.unshift({ text: (sel.state === 'holding' ? '🔁 ' + sel.callsign + ' HOLD present position' : '➡️ ' + sel.callsign + ' resume inbound'), time: game.time, color: '#a78bfa' });
          }
          if (key === 'd') {
            // Descend
            sel.altitude = Math.max(1000, sel.altitude - 1000);
            game.messages.unshift({ text: '⬇️ ' + sel.callsign + ' descend and maintain ' + sel.altitude.toLocaleString() + ' ft', time: game.time, color: '#22d3ee' });
          }
          if (key === 'u') {
            // Climb
            sel.altitude = Math.min(45000, sel.altitude + 1000);
            game.messages.unshift({ text: '⬆️ ' + sel.callsign + ' climb and maintain ' + sel.altitude.toLocaleString() + ' ft', time: game.time, color: '#22d3ee' });
          }
        };

        canvas.addEventListener('click', onClick);
        window.addEventListener('keydown', onKey);
        runningRef.current = true;
        animRef.current = requestAnimationFrame(loop);
        return function() {
          runningRef.current = false;
          cancelAnimationFrame(animRef.current);
          canvas.removeEventListener('click', onClick);
          window.removeEventListener('keydown', onKey);
        };
      }, [view]);

      // ═══ MENU VIEW ═══
      if (view === 'menu') {
        return h('div', { style: { minHeight: '500px', background: 'linear-gradient(135deg, #021a0a 0%, #0a2e1a 50%, #0d3320 100%)', borderRadius: '16px', overflow: 'hidden' } },
          h('div', { style: { textAlign: 'center', padding: '28px 24px 14px' } },
            h('div', { style: { fontSize: '48px', marginBottom: '8px' } }, '🗼'),
            h('div', { style: { fontSize: '28px', fontWeight: 900, color: '#4ade80', letterSpacing: '2px' } }, 'ATC TOWER'),
            h('div', { style: { fontSize: '13px', color: '#94a3b8', marginTop: '4px' } }, 'Guide aircraft safely. Solve rate problems. Master the math of aviation.')
          ),
          // Career stats
          (totalLanded > 0) ? h('div', { style: { padding: '0 24px 12px' } },
            h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center' } },
              [['🏆 ' + totalScore, 'Career Score'], ['✈️ ' + totalLanded, 'Total Landed'], ['🔥 ' + bestStreak, 'Best Streak']].map(function(s) {
                return h('div', { key: s[1], style: { background: '#0a1a0a', padding: '6px 12px', borderRadius: '6px', textAlign: 'center', border: '1px solid #1a3a2a' } },
                  h('div', { style: { fontSize: '13px', fontWeight: 700, color: '#4ade80' } }, s[0]),
                  h('div', { style: { fontSize: '8px', color: '#64748b' } }, s[1])
                );
              })
            )
          ) : null,
          // Airport selection
          h('div', { style: { padding: '0 24px 16px' } },
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' } }, '🏢 Select Airport'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              AIRPORTS.map(function(apt) {
                return h('button', { key: apt.id, onClick: function() { startGame(apt.id); },
                  style: { padding: '12px', borderRadius: '10px', border: '1px solid #1a3a2a', background: '#0a1a0a', color: '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }
                },
                  h('div', { style: { fontSize: '28px', width: '40px', textAlign: 'center', shrink: 0 } }, '🗼'),
                  h('div', { style: { flex: 1 } },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                      h('span', { style: { fontSize: '13px', fontWeight: 800 } }, apt.name + ' (' + apt.code + ')'),
                      h('span', { style: { fontSize: '9px', padding: '2px 8px', borderRadius: '10px', fontWeight: 700, background: apt.difficulty === 'Beginner' ? '#0a2e1a' : apt.difficulty === 'Intermediate' ? '#1a2a0a' : apt.difficulty === 'Advanced' ? '#2a1a0a' : '#2a0a0a', color: apt.difficulty === 'Beginner' ? '#4ade80' : apt.difficulty === 'Intermediate' ? '#fbbf24' : apt.difficulty === 'Advanced' ? '#f97316' : '#ef4444' } }, apt.difficulty)
                    ),
                    h('div', { style: { fontSize: '10px', color: '#94a3b8', marginTop: '2px' } }, apt.desc),
                    h('div', { style: { fontSize: '9px', color: '#64748b', marginTop: '2px' } }, apt.runways.length + ' runway(s) · Max ' + apt.maxTraffic + ' aircraft')
                  )
                );
              })
            )
          ),
          // Lessons
          h('div', { style: { padding: '0 24px 16px' } },
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' } }, '🏆 Badges (' + Object.keys(earnedATCBadges).length + '/' + ATC_BADGES.length + ')'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '12px' } },
              ATC_BADGES.map(function(badge) {
                var earned = !!earnedATCBadges[badge.id];
                return h('div', { key: badge.id, title: badge.name + ': ' + badge.desc,
                  style: { padding: '3px 6px', borderRadius: '6px', fontSize: '9px', fontWeight: 600, background: earned ? '#0a2e1a' : '#0a1a0a', color: earned ? '#4ade80' : '#1a3a2a', border: '1px solid ' + (earned ? '#16a34a' : '#0a2e1a'), cursor: 'default' }
                }, badge.icon + ' ' + (earned ? badge.name : '???'));
              })
            ),
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' } }, '📚 ATC Lessons'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' } },
              Object.keys(ATC_LESSONS).map(function(key) {
                var les = ATC_LESSONS[key];
                return h('button', { key: key, onClick: function() { updMulti({ view: 'lesson', selectedLesson: key }); },
                  style: { padding: '8px 4px', borderRadius: '8px', border: '1px solid #1a3a2a', background: '#0a1a0a', color: '#fff', cursor: 'pointer', textAlign: 'center' }
                },
                  h('div', { style: { fontSize: '18px' } }, les.icon),
                  h('div', { style: { fontSize: '8px', fontWeight: 700, marginTop: '2px', lineHeight: '1.2' } }, les.title)
                );
              })
            )
          ),
          // Controls legend
          h('div', { style: { padding: '12px 24px', borderTop: '1px solid #1a3a2a', display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' } },
            [['Click/Tab', 'Select'], ['H', 'Heading'], ['S', 'Speed'], ['R', 'Runway'], ['C', 'Clear ILS'], ['G', 'Go Around'], ['P', 'Hold'], ['D/U', 'Alt'], ['T', 'Tutorial'], ['ESC', 'Exit']].map(function(item) {
              return h('div', { key: item[0], style: { textAlign: 'center' } },
                h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#4ade80', background: '#0a2e1a', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' } }, item[0]),
                h('div', { style: { fontSize: '8px', color: '#64748b', marginTop: '2px' } }, item[1])
              );
            })
          )
        );
      }

      // ═══ LESSON VIEW ═══
      if (view === 'lesson' && d.selectedLesson && ATC_LESSONS[d.selectedLesson]) {
        var les = ATC_LESSONS[d.selectedLesson];
        return h('div', { style: { padding: '24px', maxWidth: '600px', margin: '0 auto' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '16px', fontSize: '13px', color: '#4ade80', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Back to Tower'),
          h('div', { style: { background: 'linear-gradient(135deg, #021a0a, #0a2e1a)', borderRadius: '16px', padding: '24px', color: '#fff' } },
            h('div', { style: { fontSize: '40px', textAlign: 'center', marginBottom: '8px' } }, les.icon),
            h('h2', { style: { fontSize: '20px', fontWeight: 900, textAlign: 'center', marginBottom: '16px' } }, les.title),
            h('p', { style: { fontSize: '14px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '16px' } }, les.content),
            h('div', { style: { background: '#0a1a0a', borderRadius: '12px', padding: '16px', border: '1px solid #1a3a2a' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' } }, 'Key Formula'),
              h('div', { style: { fontSize: '14px', fontWeight: 800, color: '#4ade80', fontFamily: 'monospace', marginBottom: '8px' } }, les.formula)
            ),
            h('button', { onClick: function() { startGame('simple'); },
              style: { width: '100%', marginTop: '16px', padding: '12px', borderRadius: '10px', border: 'none', background: '#16a34a', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }
            }, '🗼 Practice — Start Controlling')
          )
        );
      }

      // ═══ PLAYING VIEW ═══
      if (view === 'playing') {
        return h('div', { style: { position: 'relative', width: '100%', height: '500px', borderRadius: '12px', overflow: 'hidden', background: '#0a1a0a' } },
          h('canvas', { 'aria-label': 'Atctower visualization',
            ref: canvasRef,
            role: 'application',
            'aria-label': 'Air Traffic Control radar display. Use Tab to cycle aircraft, H for heading, R for runway, C to clear approach, Space to pause, I for status summary.',
            'aria-roledescription': 'Air traffic control simulator',
            tabIndex: 0,
            style: { width: '100%', height: '100%', display: 'block', cursor: 'crosshair', outline: 'none' },
            onFocus: function() { announce('ATC radar display focused. ' + (tutorialRef.current.active ? 'Tutorial active. ' : '') + 'Press I for status summary. Tab to select aircraft.'); }
          })
        );
      }

      return h('div', { style: { padding: '24px', textAlign: 'center', color: '#64748b' } }, 'Loading ATC Tower...');
    }
  });

})();
} // end duplicate guard
