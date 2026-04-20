// ═══════════════════════════════════════════
// stem_tool_bikelab.js — BikeLab: Physics & Repair
// A side-view 2D physics sandbox + interactive gearing lab + hands-on repair
// simulator. Teaches Newton's laws, mechanical advantage, energy conservation,
// and procedural bike-maintenance skills. No three.js — everything renders on a
// single HTML canvas for lightweight load.
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('bikeLab'))) {

(function() {
  'use strict';

  // ─────────────────────────────────────────────────────────
  // SECTION 1: BIKES — spec sheet drives the physics sim
  // ─────────────────────────────────────────────────────────
  // mass = rider(70 kg) + bike; crr = rolling-resistance coefficient;
  // cdA = drag coefficient × frontal area (m²); wheelR = wheel radius (m);
  // chainringT / cassetteT = stock gearing (teeth); maxPower = sustained watts.
  var BIKES = [
    {
      id: 'cruiser', name: 'Beach Cruiser', icon: '🚲',
      mass: 85, crr: 0.008, cdA: 0.68, wheelR: 0.336,
      chainringT: [44], cassetteT: [22, 18, 16, 14, 12, 11, 10],
      maxPower: 150,
      desc: 'Upright posture, wide tires, relaxed geometry. Heavy but forgiving.',
      tip: 'High Crr + upright posture = lots of rolling & drag loss. Great for flat neighborhoods, painful on hills.'
    },
    {
      id: 'hybrid', name: 'Hybrid Commuter', icon: '🚴',
      mass: 80, crr: 0.006, cdA: 0.52, wheelR: 0.340,
      chainringT: [48, 38, 28], cassetteT: [34, 28, 24, 21, 19, 17, 15, 13, 11],
      maxPower: 200,
      desc: 'Middle-ground bike: upright-ish, medium-width tires, wide gear range. The all-rounder.',
      tip: '27 possible gear combos! Most riders only use ~8. Avoiding cross-chain (big-big / small-small) saves wear.'
    },
    {
      id: 'road', name: 'Road Bike', icon: '🏁',
      mass: 78, crr: 0.004, cdA: 0.40, wheelR: 0.337,
      chainringT: [50, 34], cassetteT: [32, 28, 25, 22, 19, 17, 15, 13, 12, 11],
      maxPower: 280,
      desc: 'Drop bars, skinny slick tires, aero tuck. Built for speed on pavement.',
      tip: 'Cd×A can drop to 0.32 in a full tuck — 20% less drag than hybrid at 25 mph.'
    },
    {
      id: 'mtb', name: 'Mountain Bike', icon: '⛰️',
      mass: 90, crr: 0.012, cdA: 0.57, wheelR: 0.355,
      chainringT: [32], cassetteT: [50, 42, 36, 30, 26, 22, 19, 16, 14, 12, 10],
      maxPower: 230,
      desc: 'Fat knobby tires, suspension, wide 1× gearing. Made for dirt and roots.',
      tip: 'Knobbies triple the rolling resistance on pavement. Run 28+ psi on road to help.'
    },
    {
      id: 'ebike', name: 'Pedal-Assist E-Bike', icon: '⚡',
      mass: 100, crr: 0.007, cdA: 0.56, wheelR: 0.340,
      chainringT: [42], cassetteT: [32, 28, 24, 21, 19, 17, 15, 13, 11],
      maxPower: 500,
      desc: 'Commuter with a 250–500 W motor assisting your pedal input up to 20 mph.',
      tip: 'Motor kicks in proportional to your cadence. Heavier, but hills become trivial.'
    }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 2: TERRAINS — define the sandbox course
  // ─────────────────────────────────────────────────────────
  // Each terrain is a function x → (elevation in m, surface kind).
  // Surface kind maps to a Crr multiplier (pavement=1, dirt=1.8, sand=3.0, wet=1.2).
  var TERRAINS = [
    {
      id: 'flat', name: 'Flat Pavement', icon: '🛣️',
      desc: 'Perfectly level smooth asphalt for 400 m. The control case.',
      profile: function(x) { return { y: 0, kind: 'pavement' }; }
    },
    {
      id: 'rollinghills', name: 'Rolling Hills', icon: '⛰️',
      desc: 'Gentle sine-wave hills (±8 m). Learn how gravity stores and releases energy.',
      profile: function(x) { return { y: 8 * Math.sin(x / 40), kind: 'pavement' }; }
    },
    {
      id: 'steephill', name: 'Steep Climb', icon: '🏔️',
      desc: 'A single 6 % grade climb for 200 m, then flat. Tests your sustained power.',
      profile: function(x) {
        if (x < 200) return { y: x * 0.06, kind: 'pavement' };
        return { y: 12, kind: 'pavement' };
      }
    },
    {
      id: 'dirt', name: 'Dirt Trail', icon: '🌲',
      desc: 'Mildly rolling terrain with loose dirt (Crr ≈ 1.8× pavement).',
      profile: function(x) { return { y: 3 * Math.sin(x / 25), kind: 'dirt' }; }
    },
    {
      id: 'wet', name: 'Rainy Road', icon: '🌧️',
      desc: 'Flat but wet. Slightly higher Crr + lower braking friction.',
      profile: function(x) { return { y: 0, kind: 'wet' }; }
    }
  ];

  var SURFACE_CRR_MULT = { pavement: 1.0, dirt: 1.8, sand: 3.0, wet: 1.2 };
  var G = 9.81;        // m/s²
  var RHO_AIR = 1.225; // kg/m³ at sea level, 15°C

  // ─────────────────────────────────────────────────────────
  // SECTION 3: REPAIR PROCEDURES — each a stepwise mini-sim
  // ─────────────────────────────────────────────────────────
  // Each step: id, label, instruction, (optional) tool chip to place,
  // verify() function, mistakeHint. The simulator advances when verify() passes.
  var REPAIR_JOBS = [
    {
      id: 'patch_tube',
      name: 'Patch a Flat Tube',
      icon: '🩹',
      difficulty: 'Beginner',
      minutes: 15,
      description: 'The #1 roadside repair. Find the puncture, rough it up, glue, patch, reassemble.',
      steps: [
        { id: 'remove_wheel', label: 'Remove wheel', instruction: 'Open the quick-release lever (or unscrew axle nuts) and pull the wheel out of the dropouts. On rear wheels, shift into the smallest cog first so the chain lifts off easily.', tool: 'hand' },
        { id: 'deflate', label: 'Fully deflate tube', instruction: 'Unscrew the valve cap and press the valve core to release any remaining air. You can\'t remove the tire with air inside.', tool: 'hand' },
        { id: 'lever_tire', label: 'Pry tire off rim', instruction: 'Slide a plastic tire lever between the bead and rim. Hook it on a spoke. Use a second lever ~10 cm along to walk the bead over.', tool: 'tire-lever' },
        { id: 'locate_hole', label: 'Find the puncture', instruction: 'Re-inflate the tube a bit and listen / feel for escaping air. No luck? Submerge sections in water and watch for bubbles.', tool: 'pump' },
        { id: 'rough_patch', label: 'Sand the area', instruction: 'Scuff the rubber around the hole with the patch-kit sandpaper. This lets glue bond — don\'t skip it.', tool: 'sandpaper' },
        { id: 'apply_glue', label: 'Apply vulcanizing glue', instruction: 'Spread a thin layer of glue, larger than the patch. Wait 60–90 s until it turns from shiny to matte — that\'s when it\'s ready.', tool: 'glue' },
        { id: 'press_patch', label: 'Press on the patch', instruction: 'Peel the foil from one side of the patch, press it onto the glued area, and squeeze firmly for 30 seconds. Peel the clear film off only after it\'s stuck.', tool: 'patch' },
        { id: 'check_tire', label: 'Inspect the tire casing', instruction: 'Run your fingers inside the tire — carefully. Pull out any thorn, glass shard, or staple that caused the flat. Skipping this = immediate re-puncture.', tool: 'hand' },
        { id: 'reseat', label: 'Reseat the tube + tire', instruction: 'Inflate the tube just enough to hold its shape, tuck it into the tire, then walk the bead back onto the rim by hand. Levers can pinch the tube.', tool: 'hand' },
        { id: 'inflate', label: 'Inflate to spec', instruction: 'Check the tire sidewall for max psi. Road tires: 80–120 psi. MTB: 25–40 psi. Use a gauge — eyeballing is always wrong.', tool: 'pump' }
      ]
    },
    {
      id: 'brake_adjust',
      name: 'Adjust Rim Brakes',
      icon: '🛑',
      difficulty: 'Beginner',
      minutes: 10,
      description: 'Rim brakes rubbing, soft lever, or uneven pads? Fix cable tension and pad alignment.',
      steps: [
        { id: 'squeeze_test', label: 'Squeeze-test the lever', instruction: 'Pull the brake lever. If it hits the bar, cable is too loose. If pads touch rim without pulling, too tight.', tool: 'hand' },
        { id: 'barrel', label: 'Turn the barrel adjuster', instruction: 'Counter-clockwise = more cable tension (pads closer to rim). Clockwise = less. Quarter-turn at a time.', tool: 'hand' },
        { id: 'center_caliper', label: 'Center the caliper', instruction: 'Loosen the mounting bolt slightly. Squeeze the brake, hold, then retighten. This centers the caliper over the rim.', tool: 'allen' },
        { id: 'pad_alignment', label: 'Align pad with rim', instruction: 'Pad should hit the rim\'s braking surface squarely — not the tire (blowout!) and not below the rim (ineffective). Use the eccentric washer to adjust.', tool: 'allen' },
        { id: 'toe_in', label: 'Set a small toe-in', instruction: 'Front of the pad should touch first (1 mm of toe). Prevents brake squeal. Hold a business card under the back of the pad while tightening.', tool: 'allen' },
        { id: 'test_ride', label: 'Test ride at low speed', instruction: 'Roll slowly in a clear area. Brakes should grip firmly without squeal or pulsation. Re-adjust barrel if needed as the cable stretches in.', tool: 'hand' }
      ]
    },
    {
      id: 'chain_clean',
      name: 'Clean & Lube Chain',
      icon: '🔗',
      difficulty: 'Beginner',
      minutes: 15,
      description: 'A clean chain shifts quieter and lasts 3× longer. Degrease, dry, re-lube.',
      steps: [
        { id: 'inspect', label: 'Check chain wear', instruction: 'Use a chain-wear gauge or ruler: 12 links (= 12 inches) should measure exactly 12″. At 12 1/16″ it\'s time to replace.', tool: 'ruler' },
        { id: 'degrease', label: 'Apply degreaser', instruction: 'Spray or brush degreaser onto the chain while backpedaling. Let it sit 2–3 minutes to dissolve old grease & grit.', tool: 'degreaser' },
        { id: 'scrub', label: 'Scrub the links', instruction: 'Use an old toothbrush or chain-cleaning tool to scrub each link section. Rotate slowly — don\'t sling degreaser everywhere.', tool: 'brush' },
        { id: 'rinse', label: 'Rinse with water', instruction: 'Light spray from a bottle, not a pressure washer (which blasts grease out of internal bushings). Wipe the frame dry.', tool: 'water' },
        { id: 'dry', label: 'Dry thoroughly', instruction: 'Chain must be bone dry before lube. Wipe with a rag while rotating the pedals. Wet chain + lube = washed out immediately.', tool: 'rag' },
        { id: 'lube', label: 'Apply lube drop-by-drop', instruction: 'One drop on each roller while slowly backpedaling. Wet lube for wet weather, dry lube for dusty. Two full chain rotations.', tool: 'lube' },
        { id: 'wipe_excess', label: 'Wipe off excess', instruction: 'Hold a rag around the chain and backpedal several rotations. Excess lube attracts grit — the outside should look dry, only the rollers lubed.', tool: 'rag' }
      ]
    },
    {
      id: 'derailleur_index',
      name: 'Index the Rear Derailleur',
      icon: '⚙️',
      difficulty: 'Intermediate',
      minutes: 10,
      description: 'Chain skipping or slow to shift? Dial in cable tension one click at a time.',
      steps: [
        { id: 'smallest_cog', label: 'Shift to smallest cog', instruction: 'Click the shifter all the way to its lowest number (hardest gear). Chain should sit cleanly on the smallest cog.', tool: 'hand' },
        { id: 'barrel_zero', label: 'Seat the barrel adjuster', instruction: 'On the derailleur or shifter, turn the barrel adjuster clockwise until snug, then back out 2 full turns as a starting zero.', tool: 'hand' },
        { id: 'limit_h', label: 'Set the H-limit screw', instruction: 'The H screw sets how far out the derailleur can travel. Adjust until the top pulley sits directly under the smallest cog.', tool: 'phillips' },
        { id: 'tension_cable', label: 'Tension the cable', instruction: 'Loosen the cable pinch bolt, pull any slack out by hand, then retighten. You want snug, not piano-wire tight.', tool: 'allen' },
        { id: 'test_shift_up', label: 'Click one shift up', instruction: 'Pedal and click one shift. Chain should move to the 2nd cog within half a pedal rotation. Slow? Turn barrel counter-clockwise 1/4 turn to add tension.', tool: 'hand' },
        { id: 'test_all_gears', label: 'Shift through all gears', instruction: 'Cycle up then down through every cog. Each should land cleanly. Tune the barrel in tiny increments until every shift is quiet.', tool: 'hand' },
        { id: 'limit_l', label: 'Set the L-limit screw', instruction: 'Shift into the largest cog. The L screw prevents the derailleur from going into the spokes. Adjust until the top pulley sits under the largest cog.', tool: 'phillips' }
      ]
    }
  ];

  var TOOL_ICONS = {
    'hand': '✋', 'tire-lever': '🗡️', 'pump': '💨', 'sandpaper': '🟫',
    'glue': '🧴', 'patch': '🩹', 'allen': '🔧', 'phillips': '🪛',
    'ruler': '📏', 'degreaser': '🧪', 'brush': '🖌️', 'water': '💧',
    'rag': '🧻', 'lube': '🛢️'
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 4: REGISTER TOOL & TOP-LEVEL RENDER
  // ─────────────────────────────────────────────────────────

  window.StemLab.registerTool('bikeLab', {
    name: 'BikeLab: Physics & Repair',
    icon: '🚲',
    category: 'life-skills',
    description: 'Side-view bike physics sandbox + gearing math lab + hands-on repair simulator. Teaches Newton\'s laws, mechanical advantage, and real maintenance skills.',
    tags: ['physics', 'mechanics', 'life-skills', 'repair', 'energy', 'gearing'],

    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var useState = React.useState;
      var useEffect = React.useEffect;
      var useRef = React.useRef;
      var useCallback = React.useCallback;

      var d = (ctx.toolData && ctx.toolData['bikeLab']) || {};
      var upd = function(key, val) { ctx.update && ctx.update('bikeLab', key, val); };
      var addToast = ctx.addToast || function(msg) { console.log('[BikeLab]', msg); };

      // Top-level view selector. 'menu' | 'sandbox' | 'gearing' | 'repair'
      var viewState = useState(d.view || 'menu');
      var view = viewState[0], setView = viewState[1];
      var goto = function(v) { setView(v); upd('view', v); };

      // ─────────────────────────────────────────────────────
      // MAIN MENU
      // ─────────────────────────────────────────────────────
      function MainMenu() {
        var cards = [
          {
            id: 'sandbox', title: 'Physics Sandbox', icon: '🧪',
            subtitle: 'Side-view ride with visible force vectors',
            desc: 'Pedal through flat, hilly, and off-road terrain. Toggle force arrows for pedal force, gravity, drag, rolling resistance, and normal force. Watch kinetic and potential energy swap as you climb and descend.',
            bullets: ['Newton\'s 2nd law in real time', 'Vector decomposition on slopes', 'Energy conservation (KE ↔ PE)', 'Drag scales with v²'],
            color: 'from-cyan-500 to-blue-600',
            ring: 'ring-cyan-500/40'
          },
          {
            id: 'gearing', title: 'Gearing Lab', icon: '⚙️',
            subtitle: 'Chainring × cassette → mechanical advantage',
            desc: 'Pick any chainring and cog combo. See the gear ratio, mechanical advantage, and cadence-to-speed curve. Run the climb simulator to prove why low gears win on hills — same rider power, different torque at the wheel.',
            bullets: ['Gear ratio = chainring ÷ cog', 'Development = ratio × wheel circumference', 'Torque vs. speed tradeoff', 'Find cross-chain & dead gears'],
            color: 'from-violet-500 to-purple-600',
            ring: 'ring-violet-500/40'
          },
          {
            id: 'repair', title: 'Repair Simulator', icon: '🔧',
            subtitle: 'Hands-on procedural practice',
            desc: 'Four step-by-step procedures with drag-and-drop tool placement and step verification: patch a flat tube, adjust rim brakes, clean & lube a chain, index a rear derailleur. Builds real mechanical literacy.',
            bullets: ['Patch a flat tube (10 steps)', 'Adjust rim brakes (6 steps)', 'Clean & lube chain (7 steps)', 'Index rear derailleur (7 steps)'],
            color: 'from-amber-500 to-orange-600',
            ring: 'ring-amber-500/40'
          }
        ];

        return h('div', { className: 'p-6 max-w-6xl mx-auto' },
          h('div', { className: 'text-center mb-8' },
            h('div', { className: 'text-6xl mb-3' }, '🚲'),
            h('h1', { className: 'text-4xl font-black text-slate-800 mb-2' }, 'BikeLab'),
            h('p', { className: 'text-lg text-slate-600 max-w-2xl mx-auto' },
              'Physics, mechanics, and maintenance — learn the science of cycling and the real-world skills to keep a bike rolling.')
          ),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-5' },
            cards.map(function(c) {
              return h('button', {
                key: c.id,
                onClick: function() { goto(c.id); },
                className: 'text-left bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all border-2 border-slate-200 hover:border-slate-400 overflow-hidden group focus:outline-none focus:ring-4 ' + c.ring
              },
                h('div', { className: 'bg-gradient-to-br ' + c.color + ' p-5 text-white' },
                  h('div', { className: 'flex items-start justify-between mb-2' },
                    h('span', { className: 'text-5xl' }, c.icon),
                    h('span', { className: 'bg-white/20 backdrop-blur px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider' }, 'Module')
                  ),
                  h('h2', { className: 'text-2xl font-black' }, c.title),
                  h('p', { className: 'text-sm opacity-90 font-medium' }, c.subtitle)
                ),
                h('div', { className: 'p-5' },
                  h('p', { className: 'text-sm text-slate-700 leading-relaxed mb-3' }, c.desc),
                  h('ul', { className: 'space-y-1' },
                    c.bullets.map(function(b, i) {
                      return h('li', { key: i, className: 'text-xs text-slate-600 flex items-start gap-1.5' },
                        h('span', { className: 'text-emerald-500 font-bold' }, '✓'),
                        h('span', null, b)
                      );
                    })
                  )
                )
              );
            })
          ),
          h('div', { className: 'mt-8 text-center text-xs text-slate-500' },
            'A STEM Lab tool · Side-view 2D canvas · No plugins required'
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // BACK-TO-MENU BAR (shared across sub-views)
      // ─────────────────────────────────────────────────────
      function BackBar(props) {
        return h('div', { className: 'flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm' },
          h('button', {
            onClick: function() { goto('menu'); },
            className: 'flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors'
          }, h('span', null, '←'), ' BikeLab Menu'),
          h('div', { className: 'flex items-center gap-2' },
            h('span', { className: 'text-2xl' }, props.icon),
            h('span', { className: 'font-black text-slate-800 text-lg' }, props.title)
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // SUB-VIEW: PHYSICS SANDBOX
      // ─────────────────────────────────────────────────────
      function PhysicsSandbox() {
        var bikeState = useState(d.sandboxBikeId || 'hybrid');
        var bikeId = bikeState[0], setBikeId = bikeState[1];
        var terrainState = useState(d.sandboxTerrainId || 'rollinghills');
        var terrainId = terrainState[0], setTerrainId = terrainState[1];
        var vecState = useState(d.sandboxShowVectors !== false);
        var showVectors = vecState[0], setShowVectors = vecState[1];
        var graphState = useState(d.sandboxShowEnergyGraph !== false);
        var showGraph = graphState[0], setShowGraph = graphState[1];
        var runningState = useState(false);
        var running = runningState[0], setRunning = runningState[1];
        var powerState = useState(150);
        var power = powerState[0], setPower = powerState[1];
        var gearState = useState(0.7); // gear ratio as a fraction of bike's max
        var gear = gearState[0], setGear = gearState[1];

        var bike = BIKES.find(function(b) { return b.id === bikeId; }) || BIKES[1];
        var terrain = TERRAINS.find(function(t) { return t.id === terrainId; }) || TERRAINS[1];

        // Simulation state — refs so the animation loop doesn't trigger re-renders.
        var posRef = useRef(0);    // x position in meters
        var velRef = useRef(0);    // m/s
        var timeRef = useRef(0);   // seconds elapsed
        var rafRef = useRef(null);
        var lastTsRef = useRef(0);
        var hudTickState = useState(0);
        var hudTick = hudTickState[0], setHudTick = hudTickState[1]; // force HUD re-render ~10Hz
        var energyHistoryRef = useRef([]); // [{t, ke, pe, total}]
        var canvasRef = useRef(null);

        var reset = function() {
          posRef.current = 0; velRef.current = 0; timeRef.current = 0;
          energyHistoryRef.current = [];
          setHudTick(function(x) { return x + 1; });
        };

        useEffect(function() { reset(); }, [bikeId, terrainId]);

        // Physics tick. Called every animation frame while running.
        var step = useCallback(function(dt) {
          var m = bike.mass;
          var v = velRef.current;
          var x = posRef.current;
          // Terrain gives slope via finite-diff over 0.5 m.
          var y0 = terrain.profile(x).y;
          var y1 = terrain.profile(x + 0.5).y;
          var slope = (y1 - y0) / 0.5;
          var angle = Math.atan(slope);
          var surf = terrain.profile(x).kind;
          var crrMult = SURFACE_CRR_MULT[surf] || 1;
          var normalN = m * G * Math.cos(angle);
          var gravParallel = m * G * Math.sin(angle); // opposes motion when climbing
          var rollingF = bike.crr * crrMult * normalN;
          var dragF = 0.5 * RHO_AIR * bike.cdA * v * Math.abs(v); // v²
          // Pedal force from power: F = P/v. Floor so we don't divide by zero at rest.
          var effectivePower = Math.min(power, bike.maxPower) * gear;
          var pedalF = v > 0.3 ? effectivePower / v : effectivePower / 0.3;
          // At rest with throttle on, pedal force is launched limited.
          if (v < 0.3) pedalF = Math.min(pedalF, 250); // cap static force to reasonable pedal max
          var netF = pedalF - rollingF - dragF - gravParallel;
          var a = netF / m;
          var newV = v + a * dt;
          if (newV < 0) newV = 0;
          var newX = x + newV * dt;
          velRef.current = newV;
          posRef.current = newX;
          timeRef.current += dt;
          // Energy tracking (PE relative to start elevation y=0).
          var ke = 0.5 * m * newV * newV;
          var pe = m * G * terrain.profile(newX).y;
          var hist = energyHistoryRef.current;
          hist.push({ t: timeRef.current, ke: ke, pe: pe, total: ke + pe });
          if (hist.length > 600) hist.shift();
        }, [bike, terrain, power, gear]);

        // Animation loop
        useEffect(function() {
          if (!running) {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            return;
          }
          var loop = function(ts) {
            if (!lastTsRef.current) lastTsRef.current = ts;
            var dt = Math.min(0.05, (ts - lastTsRef.current) / 1000);
            lastTsRef.current = ts;
            // Substep for stability at high power
            var sub = 4;
            for (var i = 0; i < sub; i++) step(dt / sub);
            draw();
            setHudTick(function(x) { return (x + 1) % 1000; });
            rafRef.current = requestAnimationFrame(loop);
          };
          rafRef.current = requestAnimationFrame(loop);
          return function() { if (rafRef.current) cancelAnimationFrame(rafRef.current); lastTsRef.current = 0; };
        }, [running, step]); // eslint-disable-line

        // Draw the scene.
        var draw = function() {
          var cvs = canvasRef.current;
          if (!cvs) return;
          var ctx2d = cvs.getContext('2d');
          var W = cvs.width, H = cvs.height;
          ctx2d.fillStyle = '#0f172a';
          ctx2d.fillRect(0, 0, W, H);
          // Sky gradient
          var sky = ctx2d.createLinearGradient(0, 0, 0, H * 0.75);
          sky.addColorStop(0, '#0ea5e9'); sky.addColorStop(1, '#bae6fd');
          ctx2d.fillStyle = sky;
          ctx2d.fillRect(0, 0, W, H * 0.75);

          // World → screen mapping. Camera follows bike, vertical origin at mid-height.
          var camX = posRef.current;
          var pxPerMeter = 10;
          var centerY = H * 0.7;
          var worldToScreenX = function(wx) { return W * 0.3 + (wx - camX) * pxPerMeter; };
          var worldToScreenY = function(wy) { return centerY - wy * pxPerMeter; };

          // Draw terrain — sample every 1 meter from camX-50 to camX+50
          ctx2d.beginPath();
          ctx2d.moveTo(0, H);
          for (var wx = camX - 50; wx <= camX + 80; wx += 1) {
            var p = terrain.profile(wx);
            ctx2d.lineTo(worldToScreenX(wx), worldToScreenY(p.y));
          }
          ctx2d.lineTo(W, H);
          ctx2d.closePath();
          // Ground fill — color by surface at camera position
          var cSurf = terrain.profile(camX).kind;
          var fill = cSurf === 'dirt' ? '#78350f' : cSurf === 'wet' ? '#475569' : cSurf === 'sand' ? '#fcd34d' : '#334155';
          ctx2d.fillStyle = fill;
          ctx2d.fill();
          // Surface line highlight
          ctx2d.beginPath();
          for (var wx2 = camX - 50; wx2 <= camX + 80; wx2 += 1) {
            var p2 = terrain.profile(wx2);
            if (wx2 === camX - 50) ctx2d.moveTo(worldToScreenX(wx2), worldToScreenY(p2.y));
            else ctx2d.lineTo(worldToScreenX(wx2), worldToScreenY(p2.y));
          }
          ctx2d.strokeStyle = cSurf === 'pavement' ? '#fbbf24' : '#f59e0b';
          ctx2d.lineWidth = 2;
          ctx2d.stroke();

          // Distance markers every 10 m
          ctx2d.font = 'bold 10px monospace';
          ctx2d.fillStyle = 'rgba(255,255,255,0.5)';
          for (var mx = Math.floor((camX - 50) / 10) * 10; mx <= camX + 80; mx += 10) {
            if (mx < 0) continue;
            var p3 = terrain.profile(mx);
            var sx = worldToScreenX(mx);
            var sy = worldToScreenY(p3.y);
            ctx2d.fillRect(sx - 1, sy - 10, 2, 10);
            ctx2d.fillText(mx + 'm', sx - 10, sy - 14);
          }

          // Bike at world position camX (on the ground)
          var gp = terrain.profile(camX);
          var bx = worldToScreenX(camX);
          var by = worldToScreenY(gp.y);
          var bxAhead = worldToScreenX(camX + 0.5);
          var byAhead = worldToScreenY(terrain.profile(camX + 0.5).y);
          var bikeAngle = Math.atan2(byAhead - by, bxAhead - bx);

          ctx2d.save();
          ctx2d.translate(bx, by);
          ctx2d.rotate(bikeAngle);
          // wheels
          ctx2d.strokeStyle = '#0f172a';
          ctx2d.lineWidth = 3;
          ctx2d.beginPath(); ctx2d.arc(-18, -7, 7, 0, 2 * Math.PI); ctx2d.stroke();
          ctx2d.beginPath(); ctx2d.arc(18, -7, 7, 0, 2 * Math.PI); ctx2d.stroke();
          // frame
          ctx2d.beginPath();
          ctx2d.moveTo(-18, -7); ctx2d.lineTo(0, -22); ctx2d.lineTo(18, -7);
          ctx2d.lineTo(0, -14); ctx2d.lineTo(-10, -22); ctx2d.lineTo(0, -22);
          ctx2d.strokeStyle = '#f43f5e'; ctx2d.lineWidth = 3; ctx2d.stroke();
          // rider (simple stick figure)
          ctx2d.beginPath(); ctx2d.arc(0, -32, 4, 0, 2 * Math.PI);
          ctx2d.fillStyle = '#fed7aa'; ctx2d.fill();
          ctx2d.beginPath();
          ctx2d.moveTo(0, -28); ctx2d.lineTo(2, -22); // torso
          ctx2d.moveTo(2, -22); ctx2d.lineTo(10, -16); // arm to bar
          ctx2d.strokeStyle = '#1e40af'; ctx2d.lineWidth = 2; ctx2d.stroke();
          ctx2d.restore();

          // Force vectors — scale so the longest ≈ 100 px
          if (showVectors) {
            var v = velRef.current;
            var m = bike.mass;
            var y0v = terrain.profile(camX).y;
            var y1v = terrain.profile(camX + 0.5).y;
            var slope = (y1v - y0v) / 0.5;
            var a = Math.atan(slope);
            var normalN = m * G * Math.cos(a);
            var gravP = m * G * Math.sin(a);
            var surf = terrain.profile(camX).kind;
            var crr = bike.crr * (SURFACE_CRR_MULT[surf] || 1);
            var rollingF = crr * normalN;
            var dragF = 0.5 * RHO_AIR * bike.cdA * v * Math.abs(v);
            var pedalF = v > 0.3 ? (Math.min(power, bike.maxPower) * gear) / v : (Math.min(power, bike.maxPower) * gear) / 0.3;
            if (v < 0.3) pedalF = Math.min(pedalF, 250);
            var maxF = Math.max(50, Math.abs(pedalF), rollingF, dragF, Math.abs(gravP), normalN);
            var pxScale = 80 / maxF;

            // Gravity (straight down)
            drawVector(ctx2d, bx, by - 22, 0, m * G * pxScale, '#ef4444', 'mg');
            // Normal (perpendicular to ground, away)
            drawVector(ctx2d, bx, by - 22, -Math.sin(a) * normalN * pxScale, -Math.cos(a) * normalN * pxScale, '#3b82f6', 'N');
            // Pedal thrust (along ground, forward)
            drawVector(ctx2d, bx, by - 22, Math.cos(a) * pedalF * pxScale, Math.sin(a) * pedalF * pxScale, '#10b981', 'F_pedal');
            // Drag (opposing motion)
            drawVector(ctx2d, bx, by - 22, -Math.cos(a) * dragF * pxScale, -Math.sin(a) * dragF * pxScale, '#a855f7', 'F_drag');
            // Rolling (opposing motion)
            drawVector(ctx2d, bx, by - 10, -Math.cos(a) * rollingF * pxScale, -Math.sin(a) * rollingF * pxScale, '#f59e0b', 'F_roll');
          }

          // Energy graph (top-right corner)
          if (showGraph) {
            drawEnergyGraph(ctx2d, W, H);
          }
        };

        var drawVector = function(ctx2d, x, y, dx, dy, color, label) {
          var len = Math.sqrt(dx * dx + dy * dy);
          if (len < 2) return;
          ctx2d.strokeStyle = color;
          ctx2d.fillStyle = color;
          ctx2d.lineWidth = 2.5;
          ctx2d.beginPath();
          ctx2d.moveTo(x, y);
          ctx2d.lineTo(x + dx, y + dy);
          ctx2d.stroke();
          // arrowhead
          var ang = Math.atan2(dy, dx);
          ctx2d.beginPath();
          ctx2d.moveTo(x + dx, y + dy);
          ctx2d.lineTo(x + dx - 8 * Math.cos(ang - 0.4), y + dy - 8 * Math.sin(ang - 0.4));
          ctx2d.lineTo(x + dx - 8 * Math.cos(ang + 0.4), y + dy - 8 * Math.sin(ang + 0.4));
          ctx2d.closePath(); ctx2d.fill();
          // label
          ctx2d.font = 'bold 11px monospace';
          ctx2d.fillStyle = '#0f172a';
          ctx2d.fillRect(x + dx + 4, y + dy - 8, 50, 14);
          ctx2d.fillStyle = color;
          ctx2d.fillText(label, x + dx + 8, y + dy + 3);
        };

        var drawEnergyGraph = function(ctx2d, W, H) {
          var gw = 220, gh = 90;
          var gx = W - gw - 12, gy = 12;
          ctx2d.fillStyle = 'rgba(15, 23, 42, 0.75)';
          ctx2d.fillRect(gx, gy, gw, gh);
          ctx2d.strokeStyle = '#94a3b8';
          ctx2d.strokeRect(gx, gy, gw, gh);
          ctx2d.font = 'bold 10px monospace';
          ctx2d.fillStyle = '#22d3ee';
          ctx2d.fillText('Energy (J)', gx + 6, gy + 12);
          var hist = energyHistoryRef.current;
          if (hist.length < 2) return;
          var maxE = 1;
          hist.forEach(function(pt) { if (pt.total > maxE) maxE = pt.total; });
          maxE = Math.max(maxE, 100);
          var plot = function(field, color) {
            ctx2d.strokeStyle = color;
            ctx2d.lineWidth = 1.5;
            ctx2d.beginPath();
            hist.forEach(function(pt, i) {
              var px = gx + (i / (hist.length - 1)) * gw;
              var py = gy + gh - (pt[field] / maxE) * (gh - 14) - 2;
              if (i === 0) ctx2d.moveTo(px, py); else ctx2d.lineTo(px, py);
            });
            ctx2d.stroke();
          };
          plot('ke', '#22d3ee');  // cyan = kinetic
          plot('pe', '#fbbf24');  // amber = potential
          plot('total', '#f472b6'); // pink = total
          // Legend
          ctx2d.fillStyle = '#22d3ee'; ctx2d.fillText('KE', gx + 6, gy + 26);
          ctx2d.fillStyle = '#fbbf24'; ctx2d.fillText('PE', gx + 36, gy + 26);
          ctx2d.fillStyle = '#f472b6'; ctx2d.fillText('Total', gx + 66, gy + 26);
        };

        // Draw on HUD tick even when paused
        useEffect(function() { draw(); }, [hudTick, bikeId, terrainId, showVectors, showGraph]); // eslint-disable-line

        // Stats panel
        var v = velRef.current;
        var mph = v * 2.237;
        var kph = v * 3.6;
        var elev = terrain.profile(posRef.current).y;
        var ke = 0.5 * bike.mass * v * v;
        var pe = bike.mass * G * elev;

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          BackBar({ icon: '🧪', title: 'Physics Sandbox' }),
          h('div', { className: 'grid grid-cols-12 gap-3 p-3 flex-1 overflow-auto' },
            // Controls column
            h('div', { className: 'col-span-3 space-y-3' },
              h('div', { className: 'bg-white rounded-xl p-4 shadow border border-slate-200' },
                h('div', { className: 'text-xs font-bold text-slate-500 uppercase tracking-wider mb-2' }, 'Bike'),
                BIKES.map(function(b) {
                  return h('button', {
                    key: b.id,
                    onClick: function() { setBikeId(b.id); upd('sandboxBikeId', b.id); },
                    className: 'w-full flex items-center gap-2 p-2 rounded-lg border-2 mb-1.5 text-left transition-colors ' + (bikeId === b.id ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 hover:border-slate-300')
                  },
                    h('span', { className: 'text-xl' }, b.icon),
                    h('div', { className: 'flex-1 min-w-0' },
                      h('div', { className: 'text-sm font-bold text-slate-800 truncate' }, b.name),
                      h('div', { className: 'text-[10px] text-slate-500' }, 'm=' + b.mass + 'kg · Cd·A=' + b.cdA.toFixed(2) + ' · Crr=' + b.crr)
                    )
                  );
                })
              ),
              h('div', { className: 'bg-white rounded-xl p-4 shadow border border-slate-200' },
                h('div', { className: 'text-xs font-bold text-slate-500 uppercase tracking-wider mb-2' }, 'Terrain'),
                TERRAINS.map(function(tr) {
                  return h('button', {
                    key: tr.id,
                    onClick: function() { setTerrainId(tr.id); upd('sandboxTerrainId', tr.id); },
                    className: 'w-full flex items-center gap-2 p-2 rounded-lg border-2 mb-1.5 text-left transition-colors ' + (terrainId === tr.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300')
                  },
                    h('span', { className: 'text-xl' }, tr.icon),
                    h('div', { className: 'text-sm font-bold text-slate-800' }, tr.name)
                  );
                })
              ),
              h('div', { className: 'bg-white rounded-xl p-4 shadow border border-slate-200' },
                h('label', { className: 'text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between' },
                  h('span', null, 'Rider Power'), h('span', { className: 'text-cyan-600' }, power + ' W')),
                h('input', { type: 'range', min: 0, max: 400, value: power,
                  onChange: function(e) { setPower(parseInt(e.target.value)); },
                  className: 'w-full mt-1 accent-cyan-500' }),
                h('div', { className: 'text-[10px] text-slate-500 mt-1' }, 'Pro: ~300 W · Amateur: ~150 W · Casual: ~80 W'),
                h('label', { className: 'text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between mt-3' },
                  h('span', null, 'Gear Ratio'), h('span', { className: 'text-violet-600' }, (gear * 100).toFixed(0) + '%')),
                h('input', { type: 'range', min: 0.2, max: 1.0, step: 0.05, value: gear,
                  onChange: function(e) { setGear(parseFloat(e.target.value)); },
                  className: 'w-full mt-1 accent-violet-500' }),
                h('div', { className: 'text-[10px] text-slate-500 mt-1' }, 'Low gear = more torque, less top speed. See Gearing Lab for math.')
              )
            ),
            // Canvas column
            h('div', { className: 'col-span-9 space-y-3' },
              h('div', { className: 'bg-slate-900 rounded-xl overflow-hidden shadow-xl border border-slate-800' },
                h('canvas', { ref: canvasRef, width: 900, height: 440, className: 'w-full block' })
              ),
              h('div', { className: 'flex gap-2' },
                h('button', {
                  onClick: function() { setRunning(!running); },
                  className: 'flex-1 py-2.5 px-4 rounded-xl font-bold transition-colors shadow ' + (running ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white')
                }, running ? '⏸ Pause' : '▶ Start'),
                h('button', {
                  onClick: function() { setRunning(false); reset(); },
                  className: 'py-2.5 px-4 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors'
                }, '↺ Reset'),
                h('button', {
                  onClick: function() { setShowVectors(!showVectors); upd('sandboxShowVectors', !showVectors); },
                  className: 'py-2.5 px-4 rounded-xl font-bold transition-colors ' + (showVectors ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600')
                }, '→ Force Vectors'),
                h('button', {
                  onClick: function() { setShowGraph(!showGraph); upd('sandboxShowEnergyGraph', !showGraph); },
                  className: 'py-2.5 px-4 rounded-xl font-bold transition-colors ' + (showGraph ? 'bg-pink-500 text-white' : 'bg-slate-200 text-slate-600')
                }, '📈 Energy Graph')
              ),
              h('div', { className: 'grid grid-cols-5 gap-2' },
                [['Speed', mph.toFixed(1) + ' mph', kph.toFixed(1) + ' km/h'],
                 ['Distance', (posRef.current).toFixed(0) + ' m', ((posRef.current) * 3.281).toFixed(0) + ' ft'],
                 ['Elevation', elev.toFixed(1) + ' m', (elev * 3.281).toFixed(1) + ' ft'],
                 ['Kinetic E', (ke / 1000).toFixed(2) + ' kJ', (0.5 * bike.mass * v * v).toFixed(0) + ' J'],
                 ['Potential E', (pe / 1000).toFixed(2) + ' kJ', (bike.mass * G * elev).toFixed(0) + ' J']
                ].map(function(stat, i) {
                  return h('div', { key: i, className: 'bg-white rounded-lg p-3 shadow border border-slate-200' },
                    h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-slate-500' }, stat[0]),
                    h('div', { className: 'text-lg font-black text-slate-800 mt-0.5' }, stat[1]),
                    h('div', { className: 'text-[10px] text-slate-500 font-mono' }, stat[2])
                  );
                })
              ),
              h('div', { className: 'bg-slate-100 rounded-xl p-3 text-xs text-slate-600 leading-relaxed border border-slate-200' },
                h('span', { className: 'font-bold text-slate-700' }, '💡 Physics notes: '),
                'Newton\'s 2nd law: F_net = m·a. Forces shown: pedal thrust (green), gravity component parallel to slope (red), rolling resistance (amber), air drag (purple, scales with v²). Normal force (blue) keeps the bike on the ground — it doesn\'t do work. ' + bike.tip
              )
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // SUB-VIEW: GEARING LAB
      // ─────────────────────────────────────────────────────
      function GearingLab() {
        var bikeState = useState(d.gearingBikeId || 'hybrid');
        var bikeId = bikeState[0], setBikeId = bikeState[1];
        var bike = BIKES.find(function(b) { return b.id === bikeId; }) || BIKES[1];

        var ringIdxState = useState(0);
        var ringIdx = ringIdxState[0], setRingIdx = ringIdxState[1];
        var cogIdxState = useState(Math.floor(bike.cassetteT.length / 2));
        var cogIdx = cogIdxState[0], setCogIdx = cogIdxState[1];

        // Reset cog when bike changes
        useEffect(function() {
          setRingIdx(0);
          setCogIdx(Math.floor(bike.cassetteT.length / 2));
        }, [bikeId]);

        var cadenceState = useState(85);
        var cadence = cadenceState[0], setCadence = cadenceState[1];

        var chainringT = bike.chainringT[ringIdx];
        var cogT = bike.cassetteT[cogIdx];
        var ratio = chainringT / cogT;
        // Wheel circumference (m)
        var wheelCirc = 2 * Math.PI * bike.wheelR;
        // Development per pedal rev (meters traveled)
        var dev = ratio * wheelCirc;
        // Speed at cadence
        var speedMs = dev * (cadence / 60);
        var speedMph = speedMs * 2.237;
        var speedKph = speedMs * 3.6;
        // Mechanical advantage on rear wheel (inverse of ratio — low gear = high MA)
        var ma = cogT / chainringT;
        // Cross-chain penalty: large ring + large cog, or small ring + small cog
        var chainringCount = bike.chainringT.length;
        var cogCount = bike.cassetteT.length;
        var crossChainScore = 0;
        if (chainringCount > 1) {
          if (ringIdx === 0 && cogIdx >= cogCount - 2) crossChainScore = 2;
          else if (ringIdx === 0 && cogIdx >= cogCount - 4) crossChainScore = 1;
          else if (ringIdx === chainringCount - 1 && cogIdx <= 1) crossChainScore = 2;
          else if (ringIdx === chainringCount - 1 && cogIdx <= 3) crossChainScore = 1;
        }

        // Climb simulator: constant 6% grade, 200W rider. Predict speed from v = P/(F_gravity + F_rolling + F_drag(v)).
        var climbSim = useCallback(function(useGear) {
          var grade = 0.06;
          var angle = Math.atan(grade);
          var P = Math.min(200, bike.maxPower) * useGear; // power at wheel reduced by gear fraction
          var m = bike.mass;
          var gravP = m * G * Math.sin(angle);
          var normalN = m * G * Math.cos(angle);
          var rollingF = bike.crr * normalN;
          // Solve P = v * (gravP + rollingF + 0.5*rho*CdA*v²) — iterate
          var v = 2;
          for (var i = 0; i < 80; i++) {
            var drag = 0.5 * RHO_AIR * bike.cdA * v * v;
            var needed = v * (gravP + rollingF + drag);
            var err = P - needed;
            v += err / (gravP + rollingF + 3 * 0.5 * RHO_AIR * bike.cdA * v * v);
            if (v < 0.1) v = 0.1;
          }
          return v;
        }, [bike]);

        // Speed-vs-cadence curve samples
        var cadenceCurve = [];
        for (var c = 40; c <= 120; c += 10) {
          cadenceCurve.push({ c: c, v: ratio * wheelCirc * (c / 60) * 2.237 });
        }

        var crossHint = crossChainScore === 2
          ? h('span', { className: 'bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md text-xs font-bold' }, '⚠ Extreme cross-chain — avoid')
          : crossChainScore === 1
          ? h('span', { className: 'bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md text-xs font-bold' }, '⚠ Mild cross-chain')
          : h('span', { className: 'bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md text-xs font-bold' }, '✓ Chainline OK');

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          BackBar({ icon: '⚙️', title: 'Gearing Lab' }),
          h('div', { className: 'p-4 max-w-6xl mx-auto w-full space-y-4' },
            // Bike picker
            h('div', { className: 'flex flex-wrap gap-2' },
              BIKES.map(function(b) {
                return h('button', {
                  key: b.id,
                  onClick: function() { setBikeId(b.id); upd('gearingBikeId', b.id); },
                  className: 'flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors ' + (bikeId === b.id ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white hover:border-slate-300')
                },
                  h('span', { className: 'text-xl' }, b.icon),
                  h('span', { className: 'font-bold text-sm text-slate-700' }, b.name),
                  h('span', { className: 'text-[10px] text-slate-500 font-mono' }, b.chainringT.length + '×' + b.cassetteT.length)
                );
              })
            ),
            // Main layout: gear picker + stats + climb sim
            h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-4' },
              // Gear picker card
              h('div', { className: 'bg-white rounded-xl shadow border border-slate-200 p-5' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-500 mb-3' }, 'Gear Selection'),
                h('div', { className: 'space-y-4' },
                  h('div', null,
                    h('div', { className: 'text-sm font-bold text-slate-700 mb-2' }, 'Chainring (front): ' + chainringT + 'T'),
                    h('div', { className: 'flex gap-2 flex-wrap' },
                      bike.chainringT.map(function(t, i) {
                        return h('button', {
                          key: i,
                          onClick: function() { setRingIdx(i); },
                          className: 'w-12 h-12 rounded-full border-2 font-black transition-colors ' + (ringIdx === i ? 'border-violet-500 bg-violet-500 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400')
                        }, t);
                      })
                    )
                  ),
                  h('div', null,
                    h('div', { className: 'text-sm font-bold text-slate-700 mb-2' }, 'Cassette cog (rear): ' + cogT + 'T'),
                    h('div', { className: 'flex gap-1 flex-wrap' },
                      bike.cassetteT.map(function(t, i) {
                        return h('button', {
                          key: i,
                          onClick: function() { setCogIdx(i); },
                          className: 'w-10 h-10 rounded-full border-2 font-bold text-sm transition-colors ' + (cogIdx === i ? 'border-fuchsia-500 bg-fuchsia-500 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400')
                        }, t);
                      })
                    ),
                    h('div', { className: 'text-[11px] text-slate-500 mt-2' }, 'Leftmost = largest = easiest to climb. Rightmost = smallest = fastest top speed.')
                  ),
                  h('div', { className: 'pt-2' }, crossHint),
                  h('label', { className: 'text-sm font-bold text-slate-700 flex justify-between pt-2' },
                    h('span', null, 'Pedal Cadence (RPM)'),
                    h('span', { className: 'text-violet-600' }, cadence)),
                  h('input', { type: 'range', min: 40, max: 120, value: cadence,
                    onChange: function(e) { setCadence(parseInt(e.target.value)); },
                    className: 'w-full accent-violet-500' }),
                  h('div', { className: 'text-[11px] text-slate-500' }, 'Casual riders: 60–80. Trained: 80–100. Spin classes: 100+.')
                )
              ),
              // Stats card
              h('div', { className: 'bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg text-white p-5' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider opacity-80 mb-3' }, 'This Gear'),
                h('div', { className: 'grid grid-cols-2 gap-4' },
                  h('div', null,
                    h('div', { className: 'text-[11px] opacity-80 uppercase tracking-wider' }, 'Gear Ratio'),
                    h('div', { className: 'text-3xl font-black font-mono' }, ratio.toFixed(2)),
                    h('div', { className: 'text-[10px] opacity-70 font-mono' }, chainringT + ' ÷ ' + cogT)
                  ),
                  h('div', null,
                    h('div', { className: 'text-[11px] opacity-80 uppercase tracking-wider' }, 'Mech. Advantage'),
                    h('div', { className: 'text-3xl font-black font-mono' }, ma.toFixed(2) + '×'),
                    h('div', { className: 'text-[10px] opacity-70' }, 'at the wheel')
                  ),
                  h('div', null,
                    h('div', { className: 'text-[11px] opacity-80 uppercase tracking-wider' }, 'Distance per Rev'),
                    h('div', { className: 'text-2xl font-black font-mono' }, dev.toFixed(2) + ' m'),
                    h('div', { className: 'text-[10px] opacity-70 font-mono' }, 'ratio × 2πr = ' + ratio.toFixed(2) + ' × ' + wheelCirc.toFixed(2))
                  ),
                  h('div', null,
                    h('div', { className: 'text-[11px] opacity-80 uppercase tracking-wider' }, 'Speed @ ' + cadence + ' RPM'),
                    h('div', { className: 'text-2xl font-black font-mono' }, speedMph.toFixed(1) + ' mph'),
                    h('div', { className: 'text-[10px] opacity-70 font-mono' }, speedKph.toFixed(1) + ' km/h · ' + speedMs.toFixed(2) + ' m/s')
                  )
                )
              )
            ),
            // Cadence→speed curve
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-200 p-5' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-500 mb-3' }, 'Speed vs. Cadence (this gear)'),
              h('div', { className: 'flex items-end gap-2 h-32' },
                cadenceCurve.map(function(pt, i) {
                  var pct = pt.v / (cadenceCurve[cadenceCurve.length - 1].v + 1);
                  var isCurrent = Math.abs(pt.c - cadence) < 5;
                  return h('div', { key: i, className: 'flex-1 flex flex-col items-center justify-end' },
                    h('div', { className: 'w-full rounded-t ' + (isCurrent ? 'bg-violet-500' : 'bg-violet-200'),
                      style: { height: Math.round(pct * 100) + '%' } },
                      isCurrent && h('div', { className: 'text-[10px] font-bold text-white text-center pt-1' }, pt.v.toFixed(0))
                    ),
                    h('div', { className: 'text-[10px] text-slate-500 font-mono mt-1' }, pt.c),
                    h('div', { className: 'text-[9px] text-slate-400' }, pt.v.toFixed(0) + ' mph')
                  );
                })
              ),
              h('div', { className: 'text-xs text-slate-500 mt-2' }, 'X axis: pedal cadence (RPM). Y axis: bike speed (mph). Linear in this gear — double the cadence, double the speed.')
            ),
            // Climb simulator
            h('div', { className: 'bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-5' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-700 mb-2' }, '⛰️ Climb Simulator (6% grade, 200 W rider)'),
              h('div', { className: 'text-sm text-slate-700 mb-3' }, 'Estimated sustained climb speed at this gear vs. a low gear vs. a high gear:'),
              h('div', { className: 'grid grid-cols-3 gap-3' },
                [
                  { label: 'Low gear (easy)', gear: 0.35, color: 'from-emerald-400 to-emerald-600' },
                  { label: 'This gear', gear: ratio / (bike.chainringT[0] / bike.cassetteT[bike.cassetteT.length - 1]), color: 'from-violet-400 to-violet-600' },
                  { label: 'High gear (hard)', gear: 1.0, color: 'from-rose-400 to-rose-600' }
                ].map(function(g, i) {
                  var climbV = climbSim(g.gear);
                  var climbMph = climbV * 2.237;
                  return h('div', { key: i, className: 'bg-gradient-to-br ' + g.color + ' text-white rounded-lg p-4 shadow' },
                    h('div', { className: 'text-[11px] uppercase tracking-wider font-bold opacity-80' }, g.label),
                    h('div', { className: 'text-3xl font-black font-mono mt-1' }, climbMph.toFixed(1)),
                    h('div', { className: 'text-xs opacity-80 font-mono' }, 'mph up the hill')
                  );
                })
              ),
              h('div', { className: 'text-xs text-slate-600 mt-3 leading-relaxed' },
                h('span', { className: 'font-bold' }, 'Why: '),
                'Power = torque × angular velocity. A low gear trades less angular velocity (slower wheel) for more torque (more force pushing you forward), so your 200 W moves a heavier load (gravity + you + bike) even though your top speed drops. On a climb, you don\'t need speed — you need enough force to overcome gravity. That\'s what low gear gives you.'
              )
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // SUB-VIEW: REPAIR SIMULATOR
      // ─────────────────────────────────────────────────────
      function RepairSim() {
        var jobState = useState(d.repairJobId || null);
        var jobId = jobState[0], setJobId = jobState[1];
        var stepState = useState(0);
        var step = stepState[0], setStep = stepState[1];
        var placedToolsState = useState([]);
        var placedTools = placedToolsState[0], setPlacedTools = placedToolsState[1];
        var completedState = useState(d.repairCompleted || {});
        var completed = completedState[0], setCompleted = completedState[1];
        var draggedState = useState(null);
        var dragged = draggedState[0], setDragged = draggedState[1];

        var job = jobId ? REPAIR_JOBS.find(function(j) { return j.id === jobId; }) : null;

        var startJob = function(id) {
          setJobId(id); setStep(0); setPlacedTools([]);
          upd('repairJobId', id);
        };
        var exitJob = function() {
          setJobId(null); setStep(0); setPlacedTools([]);
          upd('repairJobId', null);
        };
        var nextStep = function() {
          if (!job) return;
          if (step >= job.steps.length - 1) {
            var updated = Object.assign({}, completed);
            updated[job.id] = true;
            setCompleted(updated); upd('repairCompleted', updated);
            addToast('✓ ' + job.name + ' complete! +5 XP', 'success');
            if (ctx.awardXP) ctx.awardXP(5);
            exitJob();
          } else {
            setStep(step + 1); setPlacedTools([]);
          }
        };
        var prevStep = function() { if (step > 0) { setStep(step - 1); setPlacedTools([]); } };

        var handleDrop = function(toolId) {
          if (!job) return;
          var s = job.steps[step];
          if (s.tool === toolId) {
            setPlacedTools([toolId]);
            setTimeout(function() { nextStep(); }, 350);
          } else {
            addToast('Not the right tool for this step. Try again.', 'warning');
            setPlacedTools([]);
          }
        };

        if (!job) {
          // Job selection grid
          return h('div', { className: 'flex flex-col h-full bg-slate-50' },
            BackBar({ icon: '🔧', title: 'Repair Simulator' }),
            h('div', { className: 'p-6 max-w-5xl mx-auto w-full' },
              h('p', { className: 'text-slate-600 mb-6 text-center' }, 'Pick a procedure. Each has step-by-step instructions and tool verification — drag the right tool to the job to advance.'),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
                REPAIR_JOBS.map(function(j) {
                  var isDone = completed[j.id];
                  return h('button', {
                    key: j.id,
                    onClick: function() { startJob(j.id); },
                    className: 'text-left bg-white rounded-xl shadow hover:shadow-lg border-2 transition-all overflow-hidden ' + (isDone ? 'border-emerald-400' : 'border-slate-200 hover:border-slate-400')
                  },
                    h('div', { className: 'p-5' },
                      h('div', { className: 'flex items-start justify-between mb-2' },
                        h('div', { className: 'flex items-center gap-3' },
                          h('span', { className: 'text-4xl' }, j.icon),
                          h('div', null,
                            h('h3', { className: 'text-lg font-black text-slate-800' }, j.name),
                            h('div', { className: 'flex items-center gap-2 text-xs text-slate-500' },
                              h('span', null, j.difficulty),
                              h('span', null, '·'),
                              h('span', null, '⏱ ' + j.minutes + ' min'),
                              h('span', null, '·'),
                              h('span', null, j.steps.length + ' steps')
                            )
                          )
                        ),
                        isDone && h('span', { className: 'bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-[11px] font-bold' }, '✓ Done')
                      ),
                      h('p', { className: 'text-sm text-slate-600 mt-2' }, j.description)
                    )
                  );
                })
              )
            )
          );
        }

        // In-progress job view
        var currStep = job.steps[step];
        var progressPct = ((step + 1) / job.steps.length) * 100;
        // Build a small toolbox of distractor tools alongside the correct one
        var allTools = Object.keys(TOOL_ICONS);
        // Pick the correct tool + 4 random distractors (stable order by step)
        var seed = (job.id + step).split('').reduce(function(a, c) { return a + c.charCodeAt(0); }, 0);
        var distractors = allTools.filter(function(t) { return t !== currStep.tool; });
        for (var i = distractors.length - 1; i > 0; i--) {
          var jj = Math.abs((seed * (i + 1)) * 9301 + 49297) % (i + 1);
          var tmp = distractors[i]; distractors[i] = distractors[jj]; distractors[jj] = tmp;
        }
        var toolbox = [currStep.tool].concat(distractors.slice(0, 4));
        // Re-shuffle so the correct tool isn't always first
        for (var k = toolbox.length - 1; k > 0; k--) {
          var jk = Math.abs((seed * (k + 2)) * 9301 + 49297) % (k + 1);
          var tmp2 = toolbox[k]; toolbox[k] = toolbox[jk]; toolbox[jk] = tmp2;
        }

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          BackBar({ icon: '🔧', title: 'Repair Simulator' }),
          h('div', { className: 'p-4 max-w-5xl mx-auto w-full space-y-4' },
            // Job header + progress
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-200 p-4' },
              h('div', { className: 'flex items-center justify-between mb-3' },
                h('div', { className: 'flex items-center gap-3' },
                  h('span', { className: 'text-3xl' }, job.icon),
                  h('div', null,
                    h('h2', { className: 'text-xl font-black text-slate-800' }, job.name),
                    h('div', { className: 'text-xs text-slate-500' }, 'Step ' + (step + 1) + ' of ' + job.steps.length)
                  )
                ),
                h('button', {
                  onClick: exitJob,
                  className: 'text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-bold'
                }, 'Exit Job')
              ),
              h('div', { className: 'w-full h-2 bg-slate-100 rounded-full overflow-hidden' },
                h('div', { className: 'h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500',
                  style: { width: progressPct + '%' } })
              )
            ),
            // Current step instruction
            h('div', { className: 'bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg text-white p-6' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider opacity-80 mb-1' }, 'Current Step'),
              h('h3', { className: 'text-2xl font-black mb-3' }, currStep.label),
              h('p', { className: 'text-sm leading-relaxed opacity-95' }, currStep.instruction),
              h('div', { className: 'mt-4 pt-4 border-t border-white/20' },
                h('div', { className: 'text-[11px] uppercase tracking-wider font-bold opacity-70 mb-2' }, 'Use:'),
                h('div', { className: 'inline-flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-2 rounded-lg' },
                  h('span', { className: 'text-2xl' }, TOOL_ICONS[currStep.tool] || '🔧'),
                  h('span', { className: 'text-sm font-bold capitalize' }, (currStep.tool || '').replace(/-/g, ' '))
                )
              )
            ),
            // Toolbox — drag source
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-200 p-5' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-500 mb-3' }, 'Toolbox (drag the right tool to the job)'),
              h('div', { className: 'flex flex-wrap gap-3' },
                toolbox.map(function(t, i) {
                  return h('div', {
                    key: i,
                    draggable: true,
                    onDragStart: function() { setDragged(t); },
                    onDragEnd: function() { setDragged(null); },
                    onClick: function() { handleDrop(t); },
                    className: 'w-20 h-20 rounded-xl border-2 border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400 cursor-pointer flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ' + (dragged === t ? 'opacity-40 scale-95' : '')
                  },
                    h('span', { className: 'text-3xl' }, TOOL_ICONS[t] || '🔧'),
                    h('span', { className: 'text-[10px] font-bold text-slate-600 capitalize' }, t.replace(/-/g, ' '))
                  );
                })
              ),
              h('div', { className: 'text-[11px] text-slate-500 mt-3' }, 'Tip: click or drag. If your choice matches the step, the job advances. Wrong choice = no penalty, try again.')
            ),
            // Drop zone / job area
            h('div', {
              onDragOver: function(e) { e.preventDefault(); },
              onDrop: function(e) { e.preventDefault(); if (dragged) handleDrop(dragged); },
              className: 'rounded-xl border-4 border-dashed p-8 text-center transition-colors ' + (placedTools.length > 0 ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-slate-50')
            },
              placedTools.length > 0
                ? h('div', null,
                    h('div', { className: 'text-5xl mb-2' }, '✨'),
                    h('div', { className: 'text-lg font-black text-emerald-700' }, 'Correct!'),
                    h('div', { className: 'text-sm text-emerald-600 mt-1' }, 'Advancing to next step…'))
                : h('div', null,
                    h('div', { className: 'text-5xl mb-2 opacity-40' }, TOOL_ICONS[currStep.tool] || '🔧'),
                    h('div', { className: 'text-sm text-slate-500' }, 'Drop the correct tool here'))
            ),
            // Step controls
            h('div', { className: 'flex items-center gap-3' },
              h('button', {
                onClick: prevStep,
                disabled: step === 0,
                className: 'px-4 py-2 rounded-lg font-bold text-sm ' + (step === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-200 hover:bg-slate-300 text-slate-700')
              }, '← Previous Step'),
              h('div', { className: 'flex-1 text-center text-sm text-slate-500' },
                'Step ' + (step + 1) + ' / ' + job.steps.length),
              h('button', {
                onClick: nextStep,
                className: 'px-4 py-2 rounded-lg font-bold text-sm bg-amber-500 hover:bg-amber-600 text-white'
              }, step === job.steps.length - 1 ? 'Finish Job ✓' : 'Skip Step →')
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MAIN VIEW DISPATCH
      // ─────────────────────────────────────────────────────
      if (view === 'sandbox') return h(PhysicsSandbox);
      if (view === 'gearing') return h(GearingLab);
      if (view === 'repair') return h(RepairSim);
      return h(MainMenu);
    }
  });

})();

} // end isRegistered guard
