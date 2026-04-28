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
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // ── Accessibility live region (WCAG 4.1.3) ──
  (function() {
    if (document.getElementById('allo-live-bikelab')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-bikelab';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();


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
    },
    {
      id: 'cargo', name: 'Cargo Bike', icon: '📦',
      mass: 135, crr: 0.009, cdA: 0.72, wheelR: 0.325,
      chainringT: [38, 28], cassetteT: [34, 28, 24, 21, 18, 15, 13, 11],
      maxPower: 220,
      desc: 'Long-tail or front-loader built to haul groceries, kids, or 80 kg of payload. Very heavy, very stable.',
      tip: 'Mass dominates climbing — the extra 50 kg adds nearly half a horsepower of gravity drag at a 6% grade.'
    },
    {
      id: 'bmx', name: 'BMX', icon: '🤘',
      mass: 72, crr: 0.011, cdA: 0.55, wheelR: 0.254,
      chainringT: [25], cassetteT: [9],
      maxPower: 180,
      desc: 'Single-speed, 20″ wheels, super short wheelbase. Built for tricks and pump tracks, not commuting.',
      tip: 'Single gear + tiny wheels = low top speed but insane acceleration and control at low speed.'
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
    },
    {
      id: 'pedal_change',
      name: 'Swap the Pedals',
      icon: '🦶',
      difficulty: 'Beginner',
      minutes: 8,
      description: 'Pedals wear out or you want to switch between flat, clipless, or platform. The trick: opposite threads on the left side.',
      steps: [
        { id: 'id_side', label: 'Identify left vs right', instruction: 'Pedals are stamped "L" or "R" on the spindle. The LEFT pedal uses REVERSE (counter-clockwise to tighten) threads so pedaling doesn\'t unscrew it.', tool: 'hand' },
        { id: 'wrench_on', label: 'Fit a 15mm pedal wrench', instruction: 'Use a proper pedal wrench (thinner than a normal wrench so it fits the flats). Or a 6/8mm hex on the back of the spindle if there\'s a socket.', tool: 'allen' },
        { id: 'loosen_right', label: 'Loosen the RIGHT pedal', instruction: 'Standard threads: turn counter-clockwise (toward the rear of the bike) to loosen. Use your body weight — don\'t jerk.', tool: 'allen' },
        { id: 'loosen_left', label: 'Loosen the LEFT pedal', instruction: 'Reverse threads! Turn CLOCKWISE (still toward the rear of the bike) to loosen. Getting this wrong rounds the spindle flats.', tool: 'allen' },
        { id: 'grease', label: 'Grease the new spindles', instruction: 'Dab bike grease on the threads of each new pedal. Prevents galling and makes removal easy in a year.', tool: 'lube' },
        { id: 'thread_by_hand', label: 'Thread each pedal in BY HAND', instruction: 'Start the threads by hand for a full turn or two before reaching for the wrench. If it resists, you are cross-threading — stop and restart.', tool: 'hand' },
        { id: 'torque_spec', label: 'Tighten to 35 Nm', instruction: 'Right pedal: clockwise. Left pedal: counter-clockwise. Spec is ~35 Nm — firm, not stripped. No need to lean with your whole body.', tool: 'allen' }
      ]
    },
    {
      id: 'wheel_true',
      name: 'True a Wobbly Wheel',
      icon: '🎯',
      difficulty: 'Intermediate',
      minutes: 20,
      description: 'Bent rim causing brake rub? A basic true fixes side-to-side wobble with a spoke wrench. Introduces the real truing stand workflow.',
      steps: [
        { id: 'find_wobble', label: 'Spin the wheel, find the wobble', instruction: 'Lift the bike. Spin the wheel slowly. Watch where the rim is closest to the brake pad — that\'s where the wobble is largest. Mark it with a piece of tape.', tool: 'hand' },
        { id: 'id_spokes', label: 'Identify which spokes to adjust', instruction: 'At a right-leaning wobble, the spokes pulling the rim right are on the LEFT hub flange. To move rim left, LOOSEN left-flange spokes OR TIGHTEN right-flange spokes at the wobble peak.', tool: 'hand' },
        { id: 'match_wrench', label: 'Match the spoke wrench to nipple size', instruction: 'Spoke nipples come in 3.2mm, 3.3mm, 3.4mm (most common) — use exactly the right size or you\'ll round them off. Park Tool color-codes theirs.', tool: 'allen' },
        { id: 'small_turns', label: 'Turn spokes 1/4 turn max', instruction: 'Small adjustments only. From above the spoke: clockwise = tighten. Do 2–3 adjacent spokes a quarter turn each, then re-check the wobble.', tool: 'allen' },
        { id: 'respin_check', label: 'Re-spin, re-evaluate', instruction: 'Spin the wheel. Did the wobble move or shrink? Good. Did it get worse? You tightened the wrong side — undo and switch.', tool: 'hand' },
        { id: 'tension_check', label: 'Check final spoke tension', instruction: 'Squeeze pairs of spokes. They should feel similar and sing a similar tone if plucked. One loose spoke = next wobble waiting to happen.', tool: 'hand' }
      ]
    },
    {
      id: 'headset_adjust',
      name: 'Adjust a Loose Headset',
      icon: '🎩',
      difficulty: 'Advanced',
      minutes: 15,
      description: 'Clunking from the front end under braking? The headset (steering bearings) needs preload adjustment. Critical safety fix.',
      steps: [
        { id: 'diagnose', label: 'Diagnose the play', instruction: 'Hold the front brake and rock the bike forward/back. Clunk + fork moving = loose headset. Binding when you turn the bar = overtight.', tool: 'hand' },
        { id: 'loosen_stem', label: 'Loosen stem pinch bolts', instruction: 'With a hex key, loosen (do NOT remove) the 2 pinch bolts clamping the stem to the steerer tube. The stem should rotate freely on the steerer.', tool: 'allen' },
        { id: 'top_cap', label: 'Snug the top-cap bolt', instruction: 'Turn the top-cap bolt clockwise gently. This pulls the stem DOWN on the spacers and preloads the bearings. Quarter-turn at a time.', tool: 'allen' },
        { id: 'recheck_play', label: 'Re-check for play', instruction: 'Front brake + rock test again. No clunk? Good. Still clunks? Quarter-turn more. Over-tight causes rough steering — feel for it.', tool: 'hand' },
        { id: 'align_stem', label: 'Align the stem to the wheel', instruction: 'Sight down the stem to the front wheel. Adjust left/right until perfectly perpendicular to the tire. Stand in front of the bike to sight it.', tool: 'hand' },
        { id: 'torque_pinch', label: 'Torque stem pinch bolts', instruction: 'Tighten each pinch bolt alternately in small increments to 5 Nm (carbon steerer) or 7 Nm (aluminum). Over-torque can crack carbon.', tool: 'allen' },
        { id: 'final_test', label: 'Full steering test', instruction: 'Lift the front end and turn the bar lock-to-lock — should rotate smoothly without catches. Drop the bike front: bar should swing freely to the side from vertical.', tool: 'hand' }
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
      // Voice narration helper — reads a string aloud via the host's TTS. Silently
      // no-ops when TTS isn't available. Throttled to avoid spam.
      var callTTS = ctx.callTTS || null;
      var _lastTtsRef = useRef(0);
      var speak = function(text) {
        if (!callTTS || !text) return;
        var now = Date.now();
        if (now - _lastTtsRef.current < 800) return;
        _lastTtsRef.current = now;
        try { callTTS(text, null, 1.0, { force: true }).catch(function() {}); }
        catch (_) {}
      };

      // Top-level view selector. 'menu' | 'sandbox' | 'gearing' | 'repair'
      var viewState = useState(d.view || 'menu');
      var view = viewState[0], setView = viewState[1];
      var goto = function(v) { setView(v); upd('view', v); };

      // ─────────────────────────────────────────────────────
      // MAIN MENU
      // ─────────────────────────────────────────────────────
      function MainMenu() {
        var bigCards = [
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
            desc: 'Seven step-by-step procedures with drag-and-drop tool placement, step verification, and read-aloud instructions: patch a tube, brakes, chain, derailleur, pedal swap, wheel true, headset adjust. Builds real mechanical literacy.',
            bullets: ['Patch a flat tube · Adjust rim brakes', 'Clean & lube chain · Index derailleur', 'Swap pedals · True a wobbly wheel', 'Headset adjust · TTS narration'],
            color: 'from-amber-500 to-orange-600',
            ring: 'ring-amber-500/40'
          },
          {
            id: 'ride', title: 'Neighborhood Ride', icon: '🏘️',
            subtitle: 'Applied-physics commute demo',
            desc: 'A scripted 600 m commute to school: flat block → stop sign → Oak Hill (7% grade) → descent → wet patch → school. Apply Sandbox + Gearing + Braking concepts in one scored run.',
            bullets: ['Keyboard controls: ↑/↓ gears, Space brakes', 'Three scored events + coach feedback', 'Tracks personal best time', 'Reuses live bike physics engine'],
            color: 'from-green-500 to-emerald-600',
            ring: 'ring-green-500/40'
          }
        ];
        var miniCards = [
          {
            id: 'fit', title: 'Bike Fit Calculator', icon: '📏',
            subtitle: 'Saddle height, reach, bar drop',
            desc: 'Enter rider height & inseam; pick bike type. Get evidence-based fit numbers (LeMond formula, KOPS setback).',
            color: 'from-emerald-500 to-teal-600',
            ring: 'ring-emerald-500/40'
          },
          {
            id: 'braking', title: 'Braking Physics', icon: '🛑',
            subtitle: 'Stopping distance & weight transfer',
            desc: 'Dry/wet/gravel/ice surfaces × front/both/rear brake choice. Solves d = v²/(2a) with endo-limit gating.',
            color: 'from-rose-500 to-red-600',
            ring: 'ring-rose-500/40'
          },
          {
            id: 'safety', title: 'Hand Signals & Safety', icon: '🛡️',
            subtitle: '6-question road safety quiz',
            desc: 'SVG-illustrated quiz: turn signals, lane position, stop signs, helmet fit. Instant feedback with explanations.',
            color: 'from-sky-500 to-indigo-600',
            ring: 'ring-sky-500/40'
          },
          {
            id: 'parts', title: 'Bike Parts Inspector', icon: '🔍',
            subtitle: '19 parts on a clickable bike',
            desc: 'SVG bike diagram with clickable hotspots. Each part shows its function, common failure modes, and a deep-link to the related repair job.',
            color: 'from-slate-500 to-slate-700',
            ring: 'ring-slate-500/40'
          }
        ];

        var renderCard = function(c, isBig) {
          return h('button', {
            key: c.id,
            onClick: function() { goto(c.id); },
            className: 'text-left bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all border-2 border-slate-200 hover:border-slate-400 overflow-hidden group focus:outline-none focus:ring-4 ' + c.ring
          },
            h('div', { className: 'bg-gradient-to-br ' + c.color + ' p-5 text-white' },
              h('div', { className: 'flex items-start justify-between mb-2' },
                h('span', { className: isBig ? 'text-5xl' : 'text-4xl' }, c.icon),
                h('span', { className: 'bg-white/20 backdrop-blur px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider' }, isBig ? 'Core' : 'Mini')
              ),
              h('h2', { className: isBig ? 'text-2xl font-black' : 'text-xl font-black' }, c.title),
              h('p', { className: 'text-sm opacity-90 font-medium' }, c.subtitle)
            ),
            h('div', { className: 'p-5' },
              h('p', { className: 'text-sm text-slate-700 leading-relaxed ' + (isBig ? 'mb-3' : '') }, c.desc),
              isBig && h('ul', { className: 'space-y-1' },
                c.bullets.map(function(b, i) {
                  return h('li', { key: i, className: 'text-xs text-slate-600 flex items-start gap-1.5' },
                    h('span', { className: 'text-emerald-500 font-bold' }, '✓'),
                    h('span', null, b)
                  );
                })
              )
            )
          );
        };

        return h('div', { className: 'p-6 max-w-6xl mx-auto' },
          h('div', { className: 'text-center mb-6' },
            h('div', { className: 'text-6xl mb-3' }, '🚲'),
            h('h1', { className: 'text-4xl font-black text-slate-800 mb-2' }, 'BikeLab'),
            h('p', { className: 'text-lg text-slate-600 max-w-2xl mx-auto' },
              'Physics, mechanics, and maintenance — learn the science of cycling and the real-world skills to keep a bike rolling.')
          ),
          h('div', { className: 'text-xs font-bold uppercase tracking-widest text-slate-600 mb-2 px-1' }, 'Core Modules'),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8' },
            bigCards.map(function(c) { return renderCard(c, true); })
          ),
          h('div', { className: 'text-xs font-bold uppercase tracking-widest text-slate-600 mb-2 px-1' }, 'Quick Labs'),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4' },
            miniCards.map(function(c) { return renderCard(c, false); })
          ),
          h('div', { className: 'mt-8 text-center text-xs text-slate-600' },
            'STEM Lab tool · Side-view 2D canvas · No plugins required'
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
        // Wind: positive = headwind (m/s felt by rider above ground speed),
        // negative = tailwind. Drag scales with |v + wind|² so students can
        // see why a 10 mph headwind erases more power than a 10% grade.
        var windState = useState(0);
        var wind = windState[0], setWind = windState[1];
        // Coast-down: when true, pedal force is forced to zero so students can
        // watch pure drag + rolling + gravity decelerate the bike \u2014 the
        // classic physics-lab demo where you let a cart roll and time its
        // stopping distance.
        var coastState = useState(false);
        var coasting = coastState[0], setCoasting = coastState[1];

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
        // Particle system for surface-specific spray/dust behind rear wheel.
        // Each particle: {x, y, vx, vy, life, maxLife, size, color}. World-space.
        var particlesRef = useRef([]);
        // Milestone teaching callouts: a set of string keys already triggered
        // this session so each concept fires a toast at most once per ride.
        // Cleared on reset. Teaches the physics in context as students discover
        // it rather than front-loading a wall of instruction.
        var milestonesRef = useRef({});

        var reset = function() {
          posRef.current = 0; velRef.current = 0; timeRef.current = 0;
          energyHistoryRef.current = [];
          particlesRef.current = [];
          setCoasting(false);
          milestonesRef.current = {};
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
          // Drag scales with relative air velocity (headwind adds, tailwind
          // subtracts). Keep the quadratic sign so a strong tailwind can push.
          var vRel = v + wind;
          var dragF = 0.5 * RHO_AIR * bike.cdA * vRel * Math.abs(vRel); // v_rel²
          // Pedal force from power: F = P/v. Floor so we don't divide by zero at rest.
          var effectivePower = coasting ? 0 : Math.min(power, bike.maxPower) * gear;
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
        }, [bike, terrain, power, gear, wind, coasting]);

        // Check milestone teaching callouts. Fires each concept at most once
        // per reset. Keeps toasts as one-shot "gotcha!" moments rather than
        // repeating mid-ride.
        var checkMilestones = function() {
          var ms = milestonesRef.current;
          var v = velRef.current;
          var x = posRef.current;
          var p = terrain.profile(x);
          var pAhead = terrain.profile(x + 1);
          var slopeLocal = pAhead.y - p.y;
          var fire = function(key, msg) {
            if (ms[key]) return;
            ms[key] = true;
            if (addToast) addToast(msg, 'info');
          };
          if (v * 2.23694 >= 10) fire('mph10', '\uD83D\uDCA8 10 mph \u2014 air drag is catching up to rolling resistance. From here, drag grows with v\u00B2.');
          if (v * 2.23694 >= 20) fire('mph20', '\uD83D\uDCA8 20 mph \u2014 drag just quadrupled vs. 10 mph. That\u2019s why pros tuck and wear skin-tight kit.');
          if (x >= 100) fire('dist100', '\uD83D\uDCCF 100 m rolled. Work done \u2248 pedal power \u00D7 time, minus everything drag + rolling dissipated as heat.');
          if (slopeLocal > 0.05) fire('climb', '\u26F0\uFE0F Climbing! Gravity now works against motion: F_grav = m\u00B7g\u00B7sin\u03B8. Every meter of rise = m\u00B7g\u00B7h stored as PE.');
          if (slopeLocal < -0.05) fire('descend', '\uD83D\uDD3D Descending. PE \u2192 KE: your altitude is converting straight into speed even with no pedaling.');
          if (p.kind === 'sand') fire('surfSand', '\uD83C\uDFDC\uFE0F Sand \u2014 rolling resistance ~3\u00D7 pavement. Speed bleeds fast even on flat ground.');
          if (p.kind === 'wet') fire('surfWet', '\uD83D\uDCA7 Wet pavement \u2014 rolling up ~20%. Grip drops more than that, so corner gently.');
          if (p.kind === 'dirt') fire('surfDirt', '\uD83C\uDFDE\uFE0F Dirt \u2014 rolling resistance ~1.8\u00D7 pavement. Knobby tires cost you on smooth roads too.');
          if (coasting && v < 0.5 && x > 5) fire('stopped', '\uD83D\uDED1 Stopped coasting. All the KE you had went to drag + rolling + uphill work \u2014 none vanished, just moved form.');
        };

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
            checkMilestones();
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

          // ── Parallax backdrop: clouds + two distant hill layers ──
          // Clouds drift 5% of bike speed, far hills 20%, near hills 50% — gives
          // the scene depth and reinforces that the rider is the one moving.
          var cloudOffset = camX * 0.05;
          ctx2d.fillStyle = 'rgba(255,255,255,0.85)';
          for (var ci = 0; ci < 8; ci++) {
            var cBaseX = (ci * 220 - (cloudOffset * pxPerMeter) % (W + 200)) % (W + 200);
            if (cBaseX < -200) cBaseX += W + 200;
            var cY = 40 + (ci % 3) * 22;
            var cSz = 18 + (ci % 4) * 4;
            ctx2d.beginPath();
            ctx2d.arc(cBaseX, cY, cSz, 0, 2 * Math.PI);
            ctx2d.arc(cBaseX + cSz * 0.8, cY - 3, cSz * 0.8, 0, 2 * Math.PI);
            ctx2d.arc(cBaseX + cSz * 1.6, cY, cSz * 0.7, 0, 2 * Math.PI);
            ctx2d.arc(cBaseX + cSz * 0.4, cY + 2, cSz * 0.9, 0, 2 * Math.PI);
            ctx2d.fill();
          }
          // Far hills (blue-gray silhouette, slow parallax)
          var farOff = camX * 0.20;
          ctx2d.fillStyle = 'rgba(71,85,105,0.55)';
          ctx2d.beginPath();
          ctx2d.moveTo(0, H * 0.62);
          for (var fhX = 0; fhX <= W + 20; fhX += 20) {
            var fhWorld = fhX + farOff * pxPerMeter;
            var fhY = H * 0.58 + Math.sin(fhWorld * 0.015) * 18 + Math.sin(fhWorld * 0.004) * 30;
            ctx2d.lineTo(fhX, fhY);
          }
          ctx2d.lineTo(W, H * 0.75); ctx2d.lineTo(0, H * 0.75);
          ctx2d.closePath(); ctx2d.fill();
          // Near hills (darker, faster parallax)
          var nearOff = camX * 0.50;
          ctx2d.fillStyle = 'rgba(51,65,85,0.78)';
          ctx2d.beginPath();
          ctx2d.moveTo(0, H * 0.68);
          for (var nhX = 0; nhX <= W + 20; nhX += 16) {
            var nhWorld = nhX + nearOff * pxPerMeter;
            var nhY = H * 0.64 + Math.sin(nhWorld * 0.025) * 12 + Math.sin(nhWorld * 0.007) * 22;
            ctx2d.lineTo(nhX, nhY);
          }
          ctx2d.lineTo(W, H * 0.75); ctx2d.lineTo(0, H * 0.75);
          ctx2d.closePath(); ctx2d.fill();

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

          // ── Roadside scenery (trees, signs, cones) ──
          // Each object is anchored at a deterministic world x (every 15m) so
          // its identity and position are stable as the camera scrolls. Sits
          // on the terrain surface (follows the profile curve). Drawn before
          // the bike so the bike occludes when passing.
          for (var scX = Math.floor((camX - 60) / 15) * 15; scX <= camX + 100; scX += 15) {
            if (scX < 5) continue;
            var scHash = (Math.floor(scX / 15) * 2654435761) >>> 0; // unsigned hash
            var scKind = scHash % 6; // 0-2 tree, 3 sign, 4 bench, 5 cone
            var scP = terrain.profile(scX);
            var scSide = (scHash & 2) ? 1 : -1; // left or right of path
            var scBaseX = worldToScreenX(scX);
            var scBaseY = worldToScreenY(scP.y);
            if (scBaseX < -30 || scBaseX > W + 30) continue;
            if (scKind <= 2) {
              // Tree: trunk + leafy top. Size varies with hash.
              var trH = 18 + (scHash % 12);
              var trW = 3 + (scHash % 2);
              ctx2d.fillStyle = '#78350f';
              ctx2d.fillRect(scBaseX - trW / 2, scBaseY - trH, trW, trH);
              ctx2d.fillStyle = scP.kind === 'sand' ? '#65a30d' : (scHash & 4 ? '#166534' : '#15803d');
              ctx2d.beginPath();
              ctx2d.arc(scBaseX, scBaseY - trH - 2, 10 + (scHash % 5), 0, 2 * Math.PI);
              ctx2d.fill();
              // Small highlight dot on canopy for sun
              ctx2d.fillStyle = 'rgba(255,255,255,0.18)';
              ctx2d.beginPath();
              ctx2d.arc(scBaseX - 4, scBaseY - trH - 5, 3, 0, 2 * Math.PI);
              ctx2d.fill();
            } else if (scKind === 3) {
              // Wooden signpost with a distance badge
              ctx2d.fillStyle = '#57534e';
              ctx2d.fillRect(scBaseX - 1, scBaseY - 22, 2, 22);
              ctx2d.fillStyle = '#fde68a';
              ctx2d.fillRect(scBaseX - 11, scBaseY - 26, 22, 10);
              ctx2d.strokeStyle = '#78350f'; ctx2d.lineWidth = 1;
              ctx2d.strokeRect(scBaseX - 11, scBaseY - 26, 22, 10);
              ctx2d.fillStyle = '#78350f';
              ctx2d.font = 'bold 7px monospace';
              // Save/restore around textAlign change so an exception inside the fillText
              // (or any future code added between save/restore) doesn't leave 'center'
              // active and shift subsequent HUD/label text off-screen.
              ctx2d.save();
              ctx2d.textAlign = 'center';
              ctx2d.fillText(Math.round(scX) + 'm', scBaseX, scBaseY - 19);
              ctx2d.restore();
            } else if (scKind === 4) {
              // Park bench
              ctx2d.fillStyle = '#57534e';
              ctx2d.fillRect(scBaseX - 9, scBaseY - 5, 18, 2);
              ctx2d.fillRect(scBaseX - 9, scBaseY - 10, 18, 2);
              ctx2d.fillRect(scBaseX - 8, scBaseY - 5, 1, 5);
              ctx2d.fillRect(scBaseX + 7, scBaseY - 5, 1, 5);
              ctx2d.fillRect(scBaseX - 9, scBaseY - 11, 1, 6);
              ctx2d.fillRect(scBaseX + 8, scBaseY - 11, 1, 6);
            } else {
              // Traffic cone
              ctx2d.fillStyle = '#f97316';
              ctx2d.beginPath();
              ctx2d.moveTo(scBaseX, scBaseY - 12);
              ctx2d.lineTo(scBaseX + 4, scBaseY);
              ctx2d.lineTo(scBaseX - 4, scBaseY);
              ctx2d.closePath();
              ctx2d.fill();
              ctx2d.fillStyle = '#fff';
              ctx2d.fillRect(scBaseX - 3, scBaseY - 8, 6, 1.5);
            }
            // Each scenery piece ignores scSide currently (sits on path); could
            // be parameterized later if lateral positioning is added.
            void scSide;
          }

          // Bike at world position camX (on the ground)
          var gp = terrain.profile(camX);
          var bx = worldToScreenX(camX);
          var by = worldToScreenY(gp.y);
          var bxAhead = worldToScreenX(camX + 0.5);
          var byAhead = worldToScreenY(terrain.profile(camX + 0.5).y);
          var bikeAngle = Math.atan2(byAhead - by, bxAhead - bx);

          // Shadow under bike — soft oval grounded to terrain directly below
          var shadowGrad = ctx2d.createRadialGradient(bx, by + 1, 2, bx, by + 1, 26);
          shadowGrad.addColorStop(0, 'rgba(0,0,0,0.45)');
          shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx2d.fillStyle = shadowGrad;
          ctx2d.beginPath(); ctx2d.ellipse(bx, by + 1, 24, 4, 0, 0, 2 * Math.PI); ctx2d.fill();

          // Wheel angular position: phi = distance / wheelR. Drives the spoke
          // angles so students see the wheel rotating at the correct rate —
          // ties the visual back to v = ω·r.
          var wheelPhi = camX / bike.wheelR;
          // Pedal cadence (rad/s) from linear speed and gear ratio. Simplified
          // effective cadence for the animation (cap so it stays readable).
          var cadenceRate = Math.min(16, (velRef.current / Math.max(0.5, bike.wheelR)) * Math.max(0.3, gear * 0.7));
          var pedalPhi = timeRef.current * cadenceRate;

          ctx2d.save();
          ctx2d.translate(bx, by);
          ctx2d.rotate(bikeAngle);
          // Spoked wheels (rear at -18, front at 18)
          [ { cx: -18, phiOffset: 0 }, { cx: 18, phiOffset: 0.4 } ].forEach(function(wh) {
            // Tire
            ctx2d.strokeStyle = '#111827';
            ctx2d.lineWidth = 3.5;
            ctx2d.beginPath(); ctx2d.arc(wh.cx, -7, 7.5, 0, 2 * Math.PI); ctx2d.stroke();
            // Rim
            ctx2d.strokeStyle = '#cbd5e1';
            ctx2d.lineWidth = 1;
            ctx2d.beginPath(); ctx2d.arc(wh.cx, -7, 6.2, 0, 2 * Math.PI); ctx2d.stroke();
            // Spokes (6, rotating with wheelPhi)
            ctx2d.strokeStyle = 'rgba(203,213,225,0.85)';
            ctx2d.lineWidth = 0.7;
            for (var sp = 0; sp < 6; sp++) {
              var ang = wheelPhi + wh.phiOffset + (sp * Math.PI) / 3;
              ctx2d.beginPath();
              ctx2d.moveTo(wh.cx, -7);
              ctx2d.lineTo(wh.cx + Math.cos(ang) * 6.2, -7 + Math.sin(ang) * 6.2);
              ctx2d.stroke();
            }
            // Hub
            ctx2d.fillStyle = '#475569';
            ctx2d.beginPath(); ctx2d.arc(wh.cx, -7, 1.3, 0, 2 * Math.PI); ctx2d.fill();
          });
          // Frame (triangles)
          ctx2d.strokeStyle = '#f43f5e';
          ctx2d.lineWidth = 3;
          ctx2d.beginPath();
          ctx2d.moveTo(-18, -7); ctx2d.lineTo(0, -22); ctx2d.lineTo(18, -7);
          ctx2d.lineTo(0, -14); ctx2d.lineTo(-10, -22); ctx2d.lineTo(0, -22);
          ctx2d.stroke();
          // Crankset at bottom bracket (0, -14) + rotating pedal crank
          var crankR = 4;
          var pedalX = 0 + Math.cos(pedalPhi) * crankR;
          var pedalY = -14 + Math.sin(pedalPhi) * crankR;
          var pedalX2 = 0 - Math.cos(pedalPhi) * crankR;
          var pedalY2 = -14 - Math.sin(pedalPhi) * crankR;
          ctx2d.fillStyle = '#94a3b8';
          ctx2d.beginPath(); ctx2d.arc(0, -14, 2.2, 0, 2 * Math.PI); ctx2d.fill();
          ctx2d.strokeStyle = '#94a3b8'; ctx2d.lineWidth = 1.5;
          ctx2d.beginPath();
          ctx2d.moveTo(pedalX, pedalY); ctx2d.lineTo(0, -14); ctx2d.lineTo(pedalX2, pedalY2);
          ctx2d.stroke();
          // Rider
          ctx2d.beginPath(); ctx2d.arc(0, -32, 4, 0, 2 * Math.PI);
          ctx2d.fillStyle = '#fed7aa'; ctx2d.fill();
          // Torso + arms to handlebar
          ctx2d.strokeStyle = '#1e40af';
          ctx2d.lineWidth = 2;
          ctx2d.beginPath();
          ctx2d.moveTo(0, -28); ctx2d.lineTo(2, -22);
          ctx2d.moveTo(2, -22); ctx2d.lineTo(10, -16);
          ctx2d.stroke();
          // Pedaling legs — upper leg from hip to knee, lower leg from knee to
          // the moving pedal position. Second leg is 180° out of phase.
          ctx2d.lineWidth = 2.2;
          var hipX = 1, hipY = -22;
          [{ px: pedalX, py: pedalY }, { px: pedalX2, py: pedalY2 }].forEach(function(pd, pi) {
            var kneeX = hipX + (pd.px - hipX) * 0.5 + (pi === 0 ? 2 : -2);
            var kneeY = hipY + (pd.py - hipY) * 0.5 - 2;
            ctx2d.strokeStyle = pi === 0 ? '#1e40af' : '#1d4ed8';
            ctx2d.beginPath();
            ctx2d.moveTo(hipX, hipY);
            ctx2d.lineTo(kneeX, kneeY);
            ctx2d.lineTo(pd.px, pd.py);
            ctx2d.stroke();
          });
          ctx2d.restore();

          // ── Surface-specific particles from rear wheel ──
          // Moving on dirt kicks up dust, on wet leaves a mist, on sand tosses
          // grains. Emission rate scales with speed — so students physically
          // see that higher velocity = more energy dissipated into the surface.
          var emitSurf = terrain.profile(camX).kind;
          var vNow = velRef.current;
          var emitRate = 0;
          var emitColor = '#fbbf24';
          var emitSpread = 0.7;
          if (emitSurf === 'dirt' && vNow > 1.5) { emitRate = Math.min(3, vNow * 0.25); emitColor = '#a8774a'; }
          else if (emitSurf === 'wet' && vNow > 2) { emitRate = Math.min(4, vNow * 0.35); emitColor = '#94a3b8'; emitSpread = 1.1; }
          else if (emitSurf === 'sand' && vNow > 1) { emitRate = Math.min(5, vNow * 0.45); emitColor = '#fcd34d'; emitSpread = 0.9; }
          if (emitRate > 0) {
            for (var em = 0; em < emitRate; em++) {
              if (Math.random() > 0.7) continue;
              var rwWorldX = camX - (18 / pxPerMeter);
              var rwWorldY = terrain.profile(rwWorldX).y + 0.3;
              particlesRef.current.push({
                x: rwWorldX,
                y: rwWorldY,
                vx: -(0.5 + Math.random() * vNow * 0.4),
                vy: 0.5 + Math.random() * 1.2 * emitSpread,
                life: 0,
                maxLife: 0.8 + Math.random() * 0.8,
                size: 1 + Math.random() * 2,
                color: emitColor
              });
            }
          }
          // Advance + render particles
          var pArr = particlesRef.current;
          var newP = [];
          var pdt = 1 / 60;
          for (var pi2 = 0; pi2 < pArr.length; pi2++) {
            var p = pArr[pi2];
            p.life += pdt;
            if (p.life >= p.maxLife) continue;
            p.x += p.vx * pdt;
            p.y += p.vy * pdt - 0.8 * pdt; // gravity pulls down visually
            p.vy -= 3 * pdt; // decelerate upward
            var fade = 1 - (p.life / p.maxLife);
            var psX = worldToScreenX(p.x);
            var psY = worldToScreenY(p.y);
            ctx2d.fillStyle = p.color;
            ctx2d.globalAlpha = fade * 0.7;
            ctx2d.beginPath();
            ctx2d.arc(psX, psY, p.size, 0, 2 * Math.PI);
            ctx2d.fill();
            newP.push(p);
          }
          ctx2d.globalAlpha = 1;
          particlesRef.current = newP.slice(-80); // cap so memory stays bounded

          // ── Speed lines at high velocity ──
          // Thin horizontal streaks sweeping past the bike, brighter when the
          // relative air velocity (v + headwind) is high. Gives students a
          // visceral sense of speed and reinforces that headwind compounds
          // with ground speed to increase drag.
          var slVRel = Math.abs(velRef.current + wind);
          if (slVRel > 4) {
            var slIntensity = Math.min(1, (slVRel - 4) / 12);
            ctx2d.save();
            ctx2d.strokeStyle = 'rgba(255,255,255,' + (0.25 * slIntensity) + ')';
            ctx2d.lineWidth = 1.2;
            for (var sl = 0; sl < 10; sl++) {
              var slPhase = (timeRef.current * slVRel * 0.8 + sl * 71) % 200;
              var slX = W * 1.1 - slPhase;
              var slY = by - 30 + ((sl * 37) % 70) - 35;
              var slLen = 14 + slIntensity * 22;
              ctx2d.beginPath();
              ctx2d.moveTo(slX, slY);
              ctx2d.lineTo(slX + slLen, slY + 1);
              ctx2d.stroke();
            }
            ctx2d.restore();
          }

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
            var vRelVec = v + wind;
            var dragF = 0.5 * RHO_AIR * bike.cdA * vRelVec * Math.abs(vRelVec);
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

          // ── Elevation minimap (bottom-right) ──
          // Samples terrain profile from 0-400m and draws it as a filled curve,
          // with a marker at the rider\u2019s current x. Students see the course
          // shape AND their position on it \u2014 crucial for the sandbox\u2019s energy
          // conservation lesson (PE ? KE as you roll into valleys).
          (function() {
            var mmW = 180, mmH = 52;
            var mmX = W - mmW - 10;
            var mmY = H - mmH - 10;
            var mmXMin = 0, mmXMax = 400;
            // Find elevation range for y-scaling
            var mmYMin = Infinity, mmYMax = -Infinity;
            for (var mmSample = mmXMin; mmSample <= mmXMax; mmSample += 8) {
              var me = terrain.profile(mmSample).y;
              if (me < mmYMin) mmYMin = me;
              if (me > mmYMax) mmYMax = me;
            }
            if (mmYMax - mmYMin < 4) { mmYMax = mmYMin + 4; } // pad flat terrain
            var mmToX = function(wx) { return mmX + ((wx - mmXMin) / (mmXMax - mmXMin)) * mmW; };
            var mmToY = function(wy) { return mmY + mmH - 6 - ((wy - mmYMin) / (mmYMax - mmYMin)) * (mmH - 10); };
            // Background panel
            ctx2d.fillStyle = 'rgba(15,23,42,0.78)';
            ctx2d.strokeStyle = 'rgba(148,163,184,0.3)';
            ctx2d.lineWidth = 1;
            ctx2d.beginPath();
            if (ctx2d.roundRect) ctx2d.roundRect(mmX, mmY, mmW, mmH, 6); else ctx2d.rect(mmX, mmY, mmW, mmH);
            ctx2d.fill(); ctx2d.stroke();
            // Label
            ctx2d.fillStyle = '#fbbf24';
            ctx2d.font = 'bold 9px monospace';
            ctx2d.textAlign = 'left';
            ctx2d.fillText('COURSE', mmX + 6, mmY + 11);
            ctx2d.fillStyle = '#94a3b8';
            ctx2d.fillText(Math.round(mmXMax) + ' m', mmX + mmW - 34, mmY + 11);
            // Terrain curve (filled)
            ctx2d.fillStyle = 'rgba(56,189,248,0.22)';
            ctx2d.strokeStyle = 'rgba(56,189,248,0.9)';
            ctx2d.lineWidth = 1.2;
            ctx2d.beginPath();
            ctx2d.moveTo(mmToX(mmXMin), mmY + mmH - 2);
            for (var mmx = mmXMin; mmx <= mmXMax; mmx += 4) {
              var my = terrain.profile(mmx).y;
              ctx2d.lineTo(mmToX(mmx), mmToY(my));
            }
            ctx2d.lineTo(mmToX(mmXMax), mmY + mmH - 2);
            ctx2d.closePath();
            ctx2d.fill();
            // Stroke just the top edge
            ctx2d.beginPath();
            for (var mmx2 = mmXMin; mmx2 <= mmXMax; mmx2 += 4) {
              var my2 = terrain.profile(mmx2).y;
              if (mmx2 === mmXMin) ctx2d.moveTo(mmToX(mmx2), mmToY(my2));
              else ctx2d.lineTo(mmToX(mmx2), mmToY(my2));
            }
            ctx2d.stroke();
            // Rider position marker
            var mmRiderX = mmToX(Math.max(mmXMin, Math.min(mmXMax, camX)));
            var mmRiderY = mmToY(terrain.profile(Math.max(mmXMin, Math.min(mmXMax, camX))).y);
            ctx2d.fillStyle = '#f43f5e';
            ctx2d.beginPath();
            ctx2d.arc(mmRiderX, mmRiderY - 2, 3, 0, 2 * Math.PI);
            ctx2d.fill();
            ctx2d.strokeStyle = 'rgba(244,63,94,0.45)';
            ctx2d.lineWidth = 1;
            ctx2d.beginPath();
            ctx2d.moveTo(mmRiderX, mmY + 16); ctx2d.lineTo(mmRiderX, mmY + mmH - 2);
            ctx2d.stroke();
          })();

          // ── Wind indicator (top-center) ──
          // Large arrow showing wind direction and magnitude. Wind > 0 means
          // the air is moving TOWARD the rider (headwind) so the arrow points
          // left (against the direction of travel). Stronger winds get a longer
          // arrow with visible streaks.
          if (Math.abs(wind) > 0.1) {
            var wiCx = W * 0.5;
            var wiCy = 28;
            var wiMag = Math.min(1, Math.abs(wind) / 11);
            var wiLen = 28 + wiMag * 60;
            var wiDir = wind > 0 ? -1 : 1; // headwind points left (against motion)
            var wiCol = wind > 0 ? 'rgba(248,113,113,0.9)' : 'rgba(74,222,128,0.9)';
            ctx2d.save();
            // Box
            ctx2d.fillStyle = 'rgba(15,23,42,0.6)';
            ctx2d.strokeStyle = 'rgba(148,163,184,0.25)';
            ctx2d.lineWidth = 1;
            ctx2d.beginPath();
            if (ctx2d.roundRect) ctx2d.roundRect(wiCx - 82, wiCy - 16, 164, 32, 6); else ctx2d.rect(wiCx - 82, wiCy - 16, 164, 32);
            ctx2d.fill(); ctx2d.stroke();
            // Label
            ctx2d.fillStyle = '#cbd5e1';
            ctx2d.font = 'bold 9px monospace';
            ctx2d.textAlign = 'center';
            ctx2d.fillText((wind > 0 ? 'HEADWIND ' : 'TAILWIND ') + Math.abs(wind * 2.23694).toFixed(0) + ' mph', wiCx, wiCy - 4);
            // Arrow
            ctx2d.strokeStyle = wiCol;
            ctx2d.fillStyle = wiCol;
            ctx2d.lineWidth = 2.5;
            ctx2d.beginPath();
            ctx2d.moveTo(wiCx - (wiLen / 2) * wiDir, wiCy + 8);
            ctx2d.lineTo(wiCx + (wiLen / 2) * wiDir, wiCy + 8);
            ctx2d.stroke();
            // Arrowhead
            ctx2d.beginPath();
            var tipX = wiCx + (wiLen / 2) * wiDir;
            ctx2d.moveTo(tipX, wiCy + 8);
            ctx2d.lineTo(tipX - 6 * wiDir, wiCy + 4);
            ctx2d.lineTo(tipX - 6 * wiDir, wiCy + 12);
            ctx2d.closePath();
            ctx2d.fill();
            // Streak lines to imply speed
            ctx2d.strokeStyle = wiCol;
            ctx2d.lineWidth = 1;
            ctx2d.globalAlpha = 0.6;
            for (var ws = 0; ws < 3; ws++) {
              var wy = wiCy + 8 + (ws - 1) * 4;
              var wx0 = wiCx - (wiLen / 2) * wiDir + ws * 4 * wiDir;
              ctx2d.beginPath();
              ctx2d.moveTo(wx0, wy);
              ctx2d.lineTo(wx0 + 10 * wiDir, wy);
              ctx2d.stroke();
            }
            ctx2d.globalAlpha = 1;
            ctx2d.textAlign = 'left';
            ctx2d.restore();
          }

          // ── Telemetry HUD (top-left) ──
          // Live readout of the quantities students are manipulating. Cadence
          // derived from v = ω·r so they can see the rotational-linear tie.
          var hudV = velRef.current;
          var hudMph = hudV * 2.23694;
          var hudKph = hudV * 3.6;
          var hudCadRpm = Math.round((hudV / Math.max(0.5, bike.wheelR)) * Math.max(0.3, gear * 0.7) * 60 / (2 * Math.PI));
          var hudSurfLabel = { pavement: 'Pavement', dirt: 'Dirt', wet: 'Wet Road', sand: 'Sand' }[terrain.profile(camX).kind] || 'Pavement';
          var hudSlopePct = (function() {
            var a = terrain.profile(camX);
            var b2 = terrain.profile(camX + 1);
            return Math.round((b2.y - a.y) * 100);
          })();
          var hudX = 10, hudY = 10;
          var hudW = 164, hudH = 88;
          ctx2d.fillStyle = 'rgba(15,23,42,0.78)';
          ctx2d.strokeStyle = 'rgba(148,163,184,0.3)';
          ctx2d.lineWidth = 1;
          ctx2d.beginPath();
          ctx2d.roundRect ? ctx2d.roundRect(hudX, hudY, hudW, hudH, 8) : ctx2d.rect(hudX, hudY, hudW, hudH);
          ctx2d.fill(); ctx2d.stroke();
          ctx2d.fillStyle = '#fbbf24';
          ctx2d.font = 'bold 10px monospace';
          ctx2d.fillText('TELEMETRY', hudX + 8, hudY + 14);
          ctx2d.fillStyle = '#e2e8f0';
          ctx2d.font = 'bold 11px monospace';
          ctx2d.fillText('v ' + hudMph.toFixed(1) + ' mph', hudX + 8, hudY + 30);
          ctx2d.fillStyle = '#94a3b8';
          ctx2d.font = '9px monospace';
          ctx2d.fillText('(' + hudKph.toFixed(1) + ' km/h)', hudX + 88, hudY + 30);
          ctx2d.fillStyle = '#e2e8f0';
          ctx2d.font = 'bold 11px monospace';
          ctx2d.fillText('cad ' + hudCadRpm + ' rpm', hudX + 8, hudY + 44);
          ctx2d.fillText(coasting ? 'pwr 0 W (COAST)' : ('pwr ' + Math.round(Math.min(power, bike.maxPower)) + ' W'), hudX + 8, hudY + 58);
          ctx2d.fillStyle = '#a5b4fc';
          ctx2d.font = '9px monospace';
          ctx2d.fillText('surface: ' + hudSurfLabel, hudX + 8, hudY + 72);
          ctx2d.fillStyle = hudSlopePct > 3 ? '#f87171' : hudSlopePct < -3 ? '#4ade80' : '#94a3b8';
          ctx2d.fillText('slope: ' + (hudSlopePct > 0 ? '+' : '') + hudSlopePct + '%', hudX + 92, hudY + 72);
          // Distance rolled
          ctx2d.fillStyle = '#94a3b8';
          ctx2d.font = 'bold 9px monospace';
          ctx2d.fillText('dist ' + Math.round(camX) + ' m', hudX + 8, hudY + 84);
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
              h('div', { className: 'bg-white rounded-xl p-4 shadow border border-slate-400' },
                h('div', { className: 'text-xs font-bold text-slate-600 uppercase tracking-wider mb-2' }, 'Bike'),
                BIKES.map(function(b) {
                  return h('button', {
                    key: b.id,
                    onClick: function() { setBikeId(b.id); upd('sandboxBikeId', b.id); },
                    className: 'w-full flex items-center gap-2 p-2 rounded-lg border-2 mb-1.5 text-left transition-colors ' + (bikeId === b.id ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 hover:border-slate-300')
                  },
                    h('span', { className: 'text-xl' }, b.icon),
                    h('div', { className: 'flex-1 min-w-0' },
                      h('div', { className: 'text-sm font-bold text-slate-800 truncate' }, b.name),
                      h('div', { className: 'text-[10px] text-slate-600' }, 'm=' + b.mass + 'kg · Cd·A=' + b.cdA.toFixed(2) + ' · Crr=' + b.crr)
                    )
                  );
                })
              ),
              h('div', { className: 'bg-white rounded-xl p-4 shadow border border-slate-400' },
                h('div', { className: 'text-xs font-bold text-slate-600 uppercase tracking-wider mb-2' }, 'Terrain'),
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
              h('div', { className: 'bg-white rounded-xl p-4 shadow border border-slate-400' },
                h('label', { className: 'text-xs font-bold text-slate-600 uppercase tracking-wider flex justify-between' },
                  h('span', null, 'Rider Power'), h('span', { className: 'text-cyan-600' }, power + ' W')),
                h('input', { type: 'range', min: 0, max: 400, value: power,
                  onChange: function(e) { setPower(parseInt(e.target.value)); },
                  className: 'w-full mt-1 accent-cyan-500' }),
                h('div', { className: 'text-[10px] text-slate-600 mt-1' }, 'Pro: ~300 W · Amateur: ~150 W · Casual: ~80 W'),
                h('label', { className: 'text-xs font-bold text-slate-600 uppercase tracking-wider flex justify-between mt-3' },
                  h('span', null, 'Gear Ratio'), h('span', { className: 'text-violet-600' }, (gear * 100).toFixed(0) + '%')),
                h('input', { type: 'range', min: 0.2, max: 1.0, step: 0.05, value: gear,
                  onChange: function(e) { setGear(parseFloat(e.target.value)); },
                  className: 'w-full mt-1 accent-violet-500' }),
                h('div', { className: 'text-[10px] text-slate-600 mt-1' }, 'Low gear = more torque, less top speed. See Gearing Lab for math.'),
                h('label', { className: 'text-xs font-bold text-slate-600 uppercase tracking-wider flex justify-between mt-3' },
                  h('span', null, 'Wind'),
                  h('span', { className: wind > 0 ? 'text-rose-600' : wind < 0 ? 'text-emerald-600' : 'text-slate-600' },
                    wind === 0 ? 'calm' : (Math.abs(wind * 2.23694).toFixed(0) + ' mph ' + (wind > 0 ? 'headwind' : 'tailwind')))),
                h('input', { type: 'range', min: -11, max: 11, step: 0.5, value: wind,
                  onChange: function(e) { setWind(parseFloat(e.target.value)); },
                  className: 'w-full mt-1 accent-rose-500' }),
                h('div', { className: 'text-[10px] text-slate-600 mt-1' }, 'Drag scales with (v + wind)² \u2014 a 10 mph headwind at 15 mph feels like 25 mph worth of drag.')
              )
            ),
            // Canvas column
            h('div', { className: 'col-span-9 space-y-3' },
              h('div', { className: 'bg-slate-900 rounded-xl overflow-hidden shadow-xl border border-slate-800' },
                h('canvas', { ref: canvasRef, width: 900, height: 440, className: 'w-full block', role: 'img', 'aria-label': 'Physics sandbox simulation: bicycle on terrain with live force vectors (gravity, drag, rolling resistance, propulsion) and energy graphs.' })
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
                  'aria-pressed': showVectors,
                  className: 'py-2.5 px-4 rounded-xl font-bold transition-colors ' + (showVectors ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600')
                }, '→ Force Vectors'),
                h('button', {
                  onClick: function() { setShowGraph(!showGraph); upd('sandboxShowEnergyGraph', !showGraph); },
                  'aria-pressed': showGraph,
                  className: 'py-2.5 px-4 rounded-xl font-bold transition-colors ' + (showGraph ? 'bg-pink-500 text-white' : 'bg-slate-200 text-slate-600')
                }, '📈 Energy Graph'),
                h('button', {
                  onClick: function() { setCoasting(!coasting); },
                  'aria-pressed': coasting,
                  title: 'Stop pedaling \u2014 watch drag, rolling, and gravity decelerate the bike on their own.',
                  className: 'py-2.5 px-4 rounded-xl font-bold transition-colors ' + (coasting ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600')
                }, coasting ? '\uD83D\uDED1 Coasting' : '\uD83D\uDECC\uFE0F Coast Down')
              ),
              h('div', { className: 'grid grid-cols-5 gap-2' },
                [['Speed', mph.toFixed(1) + ' mph', kph.toFixed(1) + ' km/h'],
                 ['Distance', (posRef.current).toFixed(0) + ' m', ((posRef.current) * 3.281).toFixed(0) + ' ft'],
                 ['Elevation', elev.toFixed(1) + ' m', (elev * 3.281).toFixed(1) + ' ft'],
                 ['Kinetic E', (ke / 1000).toFixed(2) + ' kJ', (0.5 * bike.mass * v * v).toFixed(0) + ' J'],
                 ['Potential E', (pe / 1000).toFixed(2) + ' kJ', (bike.mass * G * elev).toFixed(0) + ' J']
                ].map(function(stat, i) {
                  return h('div', { key: i, className: 'bg-white rounded-lg p-3 shadow border border-slate-400' },
                    h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-slate-600' }, stat[0]),
                    h('div', { className: 'text-lg font-black text-slate-800 mt-0.5' }, stat[1]),
                    h('div', { className: 'text-[10px] text-slate-600 font-mono' }, stat[2])
                  );
                })
              ),
              h('div', { className: 'bg-slate-100 rounded-xl p-3 text-xs text-slate-600 leading-relaxed border border-slate-400' },
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
                  h('span', { className: 'text-[10px] text-slate-600 font-mono' }, b.chainringT.length + '×' + b.cassetteT.length)
                );
              })
            ),
            // Main layout: gear picker + stats + climb sim
            h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-4' },
              // Gear picker card
              h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-5' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-3' }, 'Gear Selection'),
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
                    h('div', { className: 'text-[11px] text-slate-600 mt-2' }, 'Leftmost = largest = easiest to climb. Rightmost = smallest = fastest top speed.')
                  ),
                  h('div', { className: 'pt-2' }, crossHint),
                  h('label', { className: 'text-sm font-bold text-slate-700 flex justify-between pt-2' },
                    h('span', null, 'Pedal Cadence (RPM)'),
                    h('span', { className: 'text-violet-600' }, cadence)),
                  h('input', { type: 'range', min: 40, max: 120, value: cadence,
                    onChange: function(e) { setCadence(parseInt(e.target.value)); },
                    className: 'w-full accent-violet-500' }),
                  h('div', { className: 'text-[11px] text-slate-600' }, 'Casual riders: 60–80. Trained: 80–100. Spin classes: 100+.')
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
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-5' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-3' }, 'Speed vs. Cadence (this gear)'),
              h('div', { className: 'flex items-end gap-2 h-32' },
                cadenceCurve.map(function(pt, i) {
                  var pct = pt.v / (cadenceCurve[cadenceCurve.length - 1].v + 1);
                  var isCurrent = Math.abs(pt.c - cadence) < 5;
                  return h('div', { key: i, className: 'flex-1 flex flex-col items-center justify-end' },
                    h('div', { className: 'w-full rounded-t ' + (isCurrent ? 'bg-violet-500' : 'bg-violet-200'),
                      style: { height: Math.round(pct * 100) + '%' } },
                      isCurrent && h('div', { className: 'text-[10px] font-bold text-white text-center pt-1' }, pt.v.toFixed(0))
                    ),
                    h('div', { className: 'text-[10px] text-slate-600 font-mono mt-1' }, pt.c),
                    h('div', { className: 'text-[9px] text-slate-400' }, pt.v.toFixed(0) + ' mph')
                  );
                })
              ),
              h('div', { className: 'text-xs text-slate-600 mt-2' }, 'X axis: pedal cadence (RPM). Y axis: bike speed (mph). Linear in this gear — double the cadence, double the speed.')
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
                            h('div', { className: 'flex items-center gap-2 text-xs text-slate-600' },
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
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-4' },
              h('div', { className: 'flex items-center justify-between mb-3' },
                h('div', { className: 'flex items-center gap-3' },
                  h('span', { className: 'text-3xl' }, job.icon),
                  h('div', null,
                    h('h2', { className: 'text-xl font-black text-slate-800' }, job.name),
                    h('div', { className: 'text-xs text-slate-600' }, 'Step ' + (step + 1) + ' of ' + job.steps.length)
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
              h('div', { className: 'flex items-start justify-between gap-3 mb-1' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider opacity-80' }, 'Current Step'),
                callTTS && h('button', {
                  onClick: function() { speak(currStep.label + '. ' + currStep.instruction); },
                  className: 'bg-white/15 hover:bg-white/25 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shrink-0',
                  title: 'Read this step aloud'
                }, h('span', null, '🔊'), h('span', null, 'Read Aloud'))
              ),
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
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-5' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-3' }, 'Toolbox (drag the right tool to the job)'),
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
              h('div', { className: 'text-[11px] text-slate-600 mt-3' }, 'Tip: click or drag. If your choice matches the step, the job advances. Wrong choice = no penalty, try again.')
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
                    h('div', { className: 'text-sm text-slate-600' }, 'Drop the correct tool here'))
            ),
            // Step controls
            h('div', { className: 'flex items-center gap-3' },
              h('button', {
                onClick: prevStep,
                disabled: step === 0,
                className: 'px-4 py-2 rounded-lg font-bold text-sm ' + (step === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-200 hover:bg-slate-300 text-slate-700')
              }, '← Previous Step'),
              h('div', { className: 'flex-1 text-center text-sm text-slate-600' },
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
      // SUB-VIEW: BIKE FIT CALCULATOR
      // ─────────────────────────────────────────────────────
      // LeMond method: saddle height = inseam × 0.883 (measured BB center to
      // top of saddle along the seat tube). Reach and drop scale with rider
      // height and bike type / flexibility.
      function BikeFit() {
        var heightState = useState(d.fitHeightCm || 170);
        var heightCm = heightState[0], setHeightCm = heightState[1];
        var inseamState = useState(d.fitInseamCm || 78);
        var inseamCm = inseamState[0], setInseamCm = inseamState[1];
        var bikeTypeState = useState(d.fitBikeType || 'road');
        var bikeType = bikeTypeState[0], setBikeType = bikeTypeState[1];
        var flexibilityState = useState(d.fitFlexibility || 'medium');
        var flexibility = flexibilityState[0], setFlexibility = flexibilityState[1];

        var saddleHeight = inseamCm * 0.883;
        var setback = bikeType === 'road' ? 4 : bikeType === 'mtb' ? 1 : 2;
        var reachCm = heightCm * (bikeType === 'road' ? 0.234 : bikeType === 'mtb' ? 0.221 : 0.215);
        var drop = bikeType === 'road'
          ? (flexibility === 'high' ? 10 : flexibility === 'medium' ? 6 : 3)
          : bikeType === 'mtb' ? 2 : 0;

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          BackBar({ icon: '📏', title: 'Bike Fit Calculator' }),
          h('div', { className: 'p-4 max-w-6xl mx-auto w-full' },
            h('div', { className: 'grid grid-cols-1 lg:grid-cols-5 gap-4' },
              h('div', { className: 'lg:col-span-2 space-y-3' },
                h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-5' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-3' }, 'Rider Measurements'),
                  h('label', { className: 'text-sm font-bold text-slate-700 flex justify-between' },
                    h('span', null, 'Height'), h('span', { className: 'text-sky-600' }, heightCm + ' cm · ' + (heightCm / 2.54).toFixed(1) + '″')),
                  h('input', { type: 'range', min: 140, max: 210, value: heightCm,
                    onChange: function(e) { var v = parseInt(e.target.value); setHeightCm(v); upd('fitHeightCm', v); },
                    className: 'w-full mt-1 accent-sky-500' }),
                  h('label', { className: 'text-sm font-bold text-slate-700 flex justify-between mt-3' },
                    h('span', null, 'Inseam (cm)'), h('span', { className: 'text-emerald-600' }, inseamCm + ' cm · ' + (inseamCm / 2.54).toFixed(1) + '″')),
                  h('input', { type: 'range', min: 60, max: 100, value: inseamCm,
                    onChange: function(e) { var v = parseInt(e.target.value); setInseamCm(v); upd('fitInseamCm', v); },
                    className: 'w-full mt-1 accent-emerald-500' }),
                  h('div', { className: 'text-[11px] text-slate-600 mt-2 leading-relaxed bg-slate-50 p-2 rounded' },
                    h('strong', null, 'How to measure inseam: '),
                    'Stand barefoot against a wall. Place a hardcover book snug between your legs. Measure from floor to the top spine of the book.'),
                  h('div', { className: 'mt-4 pt-3 border-t border-slate-200' },
                    h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-2' }, 'Bike Type'),
                    h('div', { className: 'grid grid-cols-3 gap-2' },
                      [['road', '🏁 Road'], ['hybrid', '🚴 Hybrid'], ['mtb', '⛰️ MTB']].map(function(opt) {
                        return h('button', {
                          key: opt[0],
                          onClick: function() { setBikeType(opt[0]); upd('fitBikeType', opt[0]); },
                          className: 'py-2 rounded-lg border-2 font-bold text-sm transition-colors ' + (bikeType === opt[0] ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300')
                        }, opt[1]);
                      })
                    )
                  ),
                  h('div', { className: 'mt-3' },
                    h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-2' }, 'Flexibility / Experience'),
                    h('div', { className: 'grid grid-cols-3 gap-2' },
                      [['low', 'Casual'], ['medium', 'Regular'], ['high', 'Racer']].map(function(opt) {
                        return h('button', {
                          key: opt[0],
                          onClick: function() { setFlexibility(opt[0]); upd('fitFlexibility', opt[0]); },
                          className: 'py-2 rounded-lg border-2 font-bold text-xs transition-colors ' + (flexibility === opt[0] ? 'border-fuchsia-500 bg-fuchsia-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300')
                        }, opt[1]);
                      })
                    ),
                    h('div', { className: 'text-[11px] text-slate-600 mt-2' }, 'Less flexible = higher bars.')
                  )
                )
              ),
              h('div', { className: 'lg:col-span-3 space-y-3' },
                h('div', { className: 'bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl shadow-lg text-white p-5' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider opacity-80 mb-3' }, 'Your Fit'),
                  h('svg', { viewBox: '0 0 420 240', className: 'w-full h-48' },
                    h('circle', { cx: 80, cy: 190, r: 36, fill: 'none', stroke: '#fff', strokeWidth: 3 }),
                    h('circle', { cx: 340, cy: 190, r: 36, fill: 'none', stroke: '#fff', strokeWidth: 3 }),
                    h('line', { x1: 80, y1: 190, x2: 210, y2: 90, stroke: '#fff', strokeWidth: 2 }),
                    h('line', { x1: 210, y1: 90, x2: 340, y2: 190, stroke: '#fff', strokeWidth: 2 }),
                    h('line', { x1: 210, y1: 190, x2: 210, y2: 90, stroke: '#fff', strokeWidth: 2 }),
                    h('line', { x1: 80, y1: 190, x2: 210, y2: 190, stroke: '#fff', strokeWidth: 2 }),
                    h('line', { x1: 195 - setback * 2, y1: 80 - saddleHeight * 0.5, x2: 225 - setback * 2, y2: 80 - saddleHeight * 0.5, stroke: '#fde047', strokeWidth: 6, strokeLinecap: 'round' }),
                    h('line', { x1: 210, y1: 90, x2: 210 - setback * 2, y2: 80 - saddleHeight * 0.5, stroke: '#fde047', strokeWidth: 3 }),
                    h('circle', { cx: 340, cy: 90 + drop * 2, r: 5, fill: '#f472b6' }),
                    h('line', { x1: 340, y1: 190, x2: 340, y2: 90 + drop * 2, stroke: '#f472b6', strokeWidth: 3 }),
                    h('circle', { cx: 210, cy: 190, r: 5, fill: '#fff' }),
                    h('text', { x: 215, y: 140, fill: '#fde047', fontSize: 11, fontWeight: 'bold' }, saddleHeight.toFixed(1) + ' cm'),
                    h('text', { x: 240, y: 210, fill: '#f472b6', fontSize: 11, fontWeight: 'bold' }, reachCm.toFixed(1) + ' cm reach'),
                    h('text', { x: 10, y: 20, fill: '#fde047', fontSize: 10, fontWeight: 'bold' }, '● Saddle'),
                    h('text', { x: 10, y: 36, fill: '#f472b6', fontSize: 10, fontWeight: 'bold' }, '● Handlebar')
                  )
                ),
                h('div', { className: 'grid grid-cols-2 gap-3' },
                  [
                    { label: 'Saddle Height', main: saddleHeight.toFixed(1) + ' cm', sub: '(BB center → saddle top)', formula: 'LeMond: inseam × 0.883', color: 'from-emerald-500 to-teal-600' },
                    { label: 'Saddle Setback', main: setback + ' cm', sub: '(BB → saddle nose)', formula: bikeType === 'road' ? 'Road: 4 cm' : bikeType === 'mtb' ? 'MTB: 1 cm' : 'Hybrid: 2 cm', color: 'from-violet-500 to-purple-600' },
                    { label: 'Reach (horizontal)', main: reachCm.toFixed(1) + ' cm', sub: '(BB → bar center)', formula: 'height × ' + (bikeType === 'road' ? '0.234' : bikeType === 'mtb' ? '0.221' : '0.215'), color: 'from-sky-500 to-blue-600' },
                    { label: 'Bar Drop', main: drop + ' cm', sub: '(saddle → bar, below)', formula: bikeType === 'road' ? 'Scales with flexibility' : bikeType === 'mtb' ? 'MTB: slightly below' : 'Hybrid: level', color: 'from-amber-500 to-orange-600' }
                  ].map(function(r, i) {
                    return h('div', { key: i, className: 'bg-gradient-to-br ' + r.color + ' text-white rounded-xl p-4 shadow' },
                      h('div', { className: 'text-[11px] opacity-80 uppercase tracking-wider font-bold' }, r.label),
                      h('div', { className: 'text-2xl font-black font-mono mt-1' }, r.main),
                      h('div', { className: 'text-[10px] opacity-80' }, r.sub),
                      h('div', { className: 'text-[10px] opacity-70 font-mono mt-1 border-t border-white/20 pt-1' }, r.formula)
                    );
                  })
                ),
                h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-slate-700 leading-relaxed' },
                  h('strong', { className: 'text-amber-800' }, '📚 The science: '),
                  'Saddle height affects knee extension at the bottom of the pedal stroke. Too low = quad-dominant + knee pain. Too high = hip rock + hamstring strain + saddle sores. LeMond\'s 0.883 × inseam targets ~27° of knee flexion at pedal 6 o\'clock — optimal sustained power with least joint stress. Saddle setback aligns knee over pedal spindle (KOPS), preventing forward-knee strain.'
                )
              )
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // SUB-VIEW: BRAKING PHYSICS
      // ─────────────────────────────────────────────────────
      function BrakingPhysics() {
        var speedState = useState(d.brakingMph || 20);
        var speedMph = speedState[0], setSpeedMph = speedState[1];
        var surfState = useState(d.brakingSurface || 'dry');
        var surf = surfState[0], setSurf = surfState[1];
        var brakeState = useState(d.brakingSplit || 'both');
        var brakeSplit = brakeState[0], setBrakeSplit = brakeState[1];
        var reactionState = useState(d.brakingReactionSec || 1.0);
        var reaction = reactionState[0], setReaction = reactionState[1];

        var SURFACES = {
          dry:    { label: 'Dry Pavement', mu: 0.80 },
          wet:    { label: 'Wet Pavement', mu: 0.45 },
          gravel: { label: 'Loose Gravel', mu: 0.35 },
          ice:    { label: 'Ice',          mu: 0.10 }
        };
        var mu = SURFACES[surf].mu;

        // Typical commuter geometry: wheelbase L, CoM height h_com, CoM forward
        // of rear axle a_com. Endo limit = g·(L − a_com)/h_com.
        var L = 1.05, h_com = 1.1, a_com = 0.42 * L;
        var endoA = G * (L - a_com) / h_com;
        var frictionA = mu * G;
        var achieved;
        if (brakeSplit === 'rear') achieved = 0.3 * frictionA;
        else if (brakeSplit === 'front') achieved = Math.min(endoA, frictionA);
        else achieved = Math.min(0.95 * endoA, 0.9 * frictionA);

        var speedMs = speedMph / 2.237;
        var brakingDist = (speedMs * speedMs) / (2 * achieved);
        var reactionDist = speedMs * reaction;
        var totalDist = brakingDist + reactionDist;
        var timeToStop = speedMs / achieved;

        var cvsRef = useRef(null);
        useEffect(function() {
          var cvs = cvsRef.current;
          if (!cvs) return;
          var ctx2d = cvs.getContext('2d');
          var W = cvs.width, H = cvs.height;
          ctx2d.clearRect(0, 0, W, H);
          ctx2d.fillStyle = surf === 'dry' ? '#334155' : surf === 'wet' ? '#1e3a8a' : surf === 'gravel' ? '#78350f' : '#bae6fd';
          ctx2d.fillRect(0, H - 40, W, 40);
          var maxD = Math.max(totalDist, 30);
          var pxPerM = (W - 80) / maxD;
          var bikeX = 40;
          var stopX = 40 + totalDist * pxPerM;
          ctx2d.fillStyle = 'rgba(251, 191, 36, 0.3)';
          ctx2d.fillRect(bikeX, H - 40, reactionDist * pxPerM, 40);
          ctx2d.fillStyle = 'rgba(239, 68, 68, 0.3)';
          ctx2d.fillRect(bikeX + reactionDist * pxPerM, H - 40, brakingDist * pxPerM, 40);
          ctx2d.font = '24px sans-serif';
          ctx2d.fillText('🚴', bikeX - 12, H - 45);
          ctx2d.fillStyle = '#ef4444';
          ctx2d.fillRect(stopX, H - 55, 3, 55);
          ctx2d.font = 'bold 11px monospace';
          ctx2d.fillStyle = '#1e293b';
          ctx2d.fillText('STOP', stopX + 6, H - 32);
          ctx2d.strokeStyle = '#64748b'; ctx2d.lineWidth = 1;
          ctx2d.font = '10px monospace'; ctx2d.fillStyle = '#475569';
          for (var d_m = 0; d_m <= maxD; d_m += 5) {
            var tx = bikeX + d_m * pxPerM;
            ctx2d.beginPath(); ctx2d.moveTo(tx, H - 40); ctx2d.lineTo(tx, H - 35); ctx2d.stroke();
            ctx2d.fillText(d_m + 'm', tx - 6, H - 22);
          }
          ctx2d.font = 'bold 11px monospace';
          ctx2d.fillStyle = '#d97706'; ctx2d.fillText('Reaction: ' + reactionDist.toFixed(1) + ' m', bikeX + 2, 20);
          ctx2d.fillStyle = '#b91c1c'; ctx2d.fillText('Braking: ' + brakingDist.toFixed(1) + ' m', bikeX + 2, 36);
          ctx2d.fillStyle = '#0f172a'; ctx2d.fillText('Total: ' + totalDist.toFixed(1) + ' m (' + (totalDist * 3.281).toFixed(1) + ' ft)', bikeX + 2, 54);
        }, [speedMph, surf, brakeSplit, reaction, achieved]); // eslint-disable-line

        var endoWarn = (brakeSplit === 'front' && frictionA > endoA) || (brakeSplit === 'both' && frictionA > endoA / 0.95);

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          BackBar({ icon: '🛑', title: 'Braking Physics' }),
          h('div', { className: 'p-4 max-w-6xl mx-auto w-full space-y-4' },
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 overflow-hidden' },
              h('canvas', { ref: cvsRef, width: 1000, height: 200, className: 'w-full block', role: 'img', 'aria-label': 'Braking distance visualization: bicycle stops over the calculated reaction-plus-braking distance for the selected speed and surface.' })
            ),
            h('div', { className: 'grid grid-cols-1 lg:grid-cols-4 gap-3' },
              h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-4' },
                h('label', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 flex justify-between' },
                  h('span', null, 'Initial Speed'), h('span', { className: 'text-rose-600' }, speedMph + ' mph')),
                h('input', { type: 'range', min: 5, max: 40, value: speedMph,
                  onChange: function(e) { var v = parseInt(e.target.value); setSpeedMph(v); upd('brakingMph', v); },
                  className: 'w-full mt-2 accent-rose-500' }),
                h('div', { className: 'text-[10px] text-slate-600' }, (speedMph / 2.237).toFixed(1) + ' m/s · ' + (speedMph * 1.609).toFixed(1) + ' km/h')
              ),
              h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-4' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-2' }, 'Surface'),
                h('div', { className: 'grid grid-cols-2 gap-1' },
                  Object.keys(SURFACES).map(function(k) {
                    return h('button', {
                      key: k,
                      onClick: function() { setSurf(k); upd('brakingSurface', k); },
                      className: 'py-1.5 rounded border-2 text-xs font-bold transition-colors ' + (surf === k ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300')
                    }, SURFACES[k].label);
                  })
                ),
                h('div', { className: 'text-[10px] text-slate-600 font-mono mt-2' }, 'μ = ' + mu.toFixed(2))
              ),
              h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-4' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-2' }, 'Brake Used'),
                h('div', { className: 'grid grid-cols-3 gap-1' },
                  [['front', 'Front'], ['both', 'Both'], ['rear', 'Rear']].map(function(opt) {
                    return h('button', {
                      key: opt[0],
                      onClick: function() { setBrakeSplit(opt[0]); upd('brakingSplit', opt[0]); },
                      className: 'py-1.5 rounded border-2 text-xs font-bold transition-colors ' + (brakeSplit === opt[0] ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300')
                    }, opt[1]);
                  })
                ),
                h('div', { className: 'text-[10px] text-slate-600 mt-2' }, 'Rear-only stops ~3× slower than front.')
              ),
              h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-4' },
                h('label', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 flex justify-between' },
                  h('span', null, 'Reaction Time'), h('span', { className: 'text-amber-600' }, reaction.toFixed(1) + ' s')),
                h('input', { type: 'range', min: 0.3, max: 2.5, step: 0.1, value: reaction,
                  onChange: function(e) { var v = parseFloat(e.target.value); setReaction(v); upd('brakingReactionSec', v); },
                  className: 'w-full mt-2 accent-amber-500' }),
                h('div', { className: 'text-[10px] text-slate-600' }, 'Alert adult: 1.0 s · Pro racer: 0.3 s')
              )
            ),
            h('div', { className: 'grid grid-cols-2 lg:grid-cols-4 gap-3' },
              [
                { label: 'Total Stopping Distance', val: totalDist.toFixed(1) + ' m', sub: (totalDist * 3.281).toFixed(1) + ' ft', color: 'from-rose-500 to-red-600' },
                { label: 'Braking Distance', val: brakingDist.toFixed(1) + ' m', sub: 'd = v²/(2a)', color: 'from-orange-500 to-amber-600' },
                { label: 'Reaction Distance', val: reactionDist.toFixed(1) + ' m', sub: 'd = v · t_react', color: 'from-yellow-500 to-amber-500' },
                { label: 'Time to Stop', val: timeToStop.toFixed(2) + ' s', sub: 't = v / a', color: 'from-purple-500 to-fuchsia-600' }
              ].map(function(s, i) {
                return h('div', { key: i, className: 'bg-gradient-to-br ' + s.color + ' text-white rounded-xl p-4 shadow' },
                  h('div', { className: 'text-[10px] opacity-80 uppercase tracking-wider font-bold' }, s.label),
                  h('div', { className: 'text-2xl font-black font-mono mt-1' }, s.val),
                  h('div', { className: 'text-[10px] opacity-75 font-mono' }, s.sub)
                );
              })
            ),
            h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-4' },
              h('div', { className: 'bg-indigo-50 border border-indigo-200 rounded-xl p-4' },
                h('div', { className: 'text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2' }, '📐 Weight Transfer & Endo Limit'),
                h('p', { className: 'text-xs text-slate-700 leading-relaxed mb-2' },
                  'Hard front braking transfers weight forward. If deceleration exceeds a = g·(L − a_cm)/h_cm, the rear wheel lifts (endo).'),
                h('div', { className: 'font-mono text-[11px] text-slate-800 bg-white p-2 rounded border border-indigo-100' },
                  'endo limit = ' + endoA.toFixed(2) + ' m/s²'),
                endoWarn && h('div', { className: 'mt-2 text-[11px] font-bold text-rose-700 bg-rose-50 p-2 rounded border border-rose-200' },
                  '⚠ At this friction, pure front braking will flip you. Shift weight back or use both brakes.')
              ),
              h('div', { className: 'bg-emerald-50 border border-emerald-200 rounded-xl p-4' },
                h('div', { className: 'text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2' }, '🎯 Real-World Lesson'),
                h('ul', { className: 'text-xs text-slate-700 leading-relaxed space-y-1' },
                  h('li', null, '• ', h('strong', null, 'Doubling speed quadruples stopping distance'), ' (d ∝ v²).'),
                  h('li', null, '• ', h('strong', null, 'Front brake does ~70% of the work'), ' on pavement.'),
                  h('li', null, '• ', h('strong', null, 'Wet cuts grip nearly in half.')),
                  h('li', null, '• ', h('strong', null, 'On gravel/ice, rear brake is safer'), ' — locked rear skids; locked front = over the bars.')
                )
              )
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // SUB-VIEW: HAND SIGNALS & SAFETY QUIZ
      // ─────────────────────────────────────────────────────
      function SafetyQuiz() {
        var QUESTIONS = [
          {
            q: 'You want to turn LEFT at an upcoming intersection. What hand signal do you use?',
            choices: [
              { id: 'a', label: 'Left arm straight out to the side', svg: 'left_straight', correct: true },
              { id: 'b', label: 'Left arm bent up at 90°', svg: 'left_up' },
              { id: 'c', label: 'Left arm bent down at 90°', svg: 'left_down' }
            ],
            explain: 'Left arm straight out = left turn. Universal in the US.'
          },
          {
            q: 'You want to turn RIGHT. What\'s the primary hand signal?',
            choices: [
              { id: 'a', label: 'Left arm bent up at 90° (forearm vertical)', svg: 'left_up', correct: true },
              { id: 'b', label: 'Right arm straight out', svg: 'right_straight' },
              { id: 'c', label: 'Left arm bent down', svg: 'left_down' }
            ],
            explain: 'Left arm bent up = right turn. Right-arm-out is also accepted in most states and is more intuitive for drivers.'
          },
          {
            q: 'You\'re slowing or stopping. What hand signal do you use?',
            choices: [
              { id: 'a', label: 'Left arm straight down, palm facing back', svg: 'left_down', correct: true },
              { id: 'b', label: 'Both arms out to the sides', svg: 'both_out' },
              { id: 'c', label: 'Left arm straight out', svg: 'left_straight' }
            ],
            explain: 'Left arm straight down, palm back = slowing/stopping. Palm-back keeps it visible to drivers behind.'
          },
          {
            q: 'Where should you ride on a 2-lane road with no bike lane?',
            choices: [
              { id: 'a', label: 'On the sidewalk — safer from cars' },
              { id: 'b', label: 'Far right of the road, with traffic', correct: true },
              { id: 'c', label: 'In the middle of the right lane' },
              { id: 'd', label: 'Against traffic so you can see cars coming' }
            ],
            explain: 'Ride WITH traffic, as far right as is practical (not so close you hit the curb or open doors). Against-traffic is illegal in most states AND more dangerous.'
          },
          {
            q: 'You\'re approaching a 4-way stop sign on a bike. What should you do?',
            choices: [
              { id: 'a', label: 'Speed through — momentum helps balance' },
              { id: 'b', label: 'Come to a FULL stop, then proceed in order', correct: true },
              { id: 'c', label: 'Slow to 5 mph but don\'t fully stop' },
              { id: 'd', label: 'Wait for cars to go first, always' }
            ],
            explain: 'Cyclists must obey the same traffic laws as cars. Full stop at stop signs. "Idaho stop" is legal in some states but not most.'
          },
          {
            q: 'When should you wear a helmet?',
            choices: [
              { id: 'a', label: 'Only on long rides' },
              { id: 'b', label: 'Only at night' },
              { id: 'c', label: 'EVERY ride, every time', correct: true },
              { id: 'd', label: 'Only when you ride fast' }
            ],
            explain: 'Every ride. In Maine, helmets are LEGALLY REQUIRED for riders under 16 (Title 29-A §2323). Even where not required by law, most bike crashes happen close to home on low-speed rides. Fit check: 2 fingers above eyebrows, straps form a Y under each ear, chin strap allows only 1 finger of slack.'
          },
          {
            q: 'In Maine, the minimum legal passing distance when a car overtakes a cyclist is:',
            choices: [
              { id: 'a', label: '1 foot' },
              { id: 'b', label: '2 feet' },
              { id: 'c', label: '3 feet', correct: true },
              { id: 'd', label: 'No specific distance — just safe'}
            ],
            explain: 'Maine\'s 3-foot passing law (Title 29-A §2070) requires drivers to give cyclists at least 3 feet of clearance when overtaking. Crossing a double-yellow centerline to provide that 3 feet is legal in Maine if it\'s safe to do so. As a cyclist, ride predictably and signal — drivers need to see your intentions to safely pass.'
          },
          {
            q: 'Maine law requires bicycles ridden after dark (or in low visibility) to have:',
            choices: [
              { id: 'a', label: 'Reflectors only — no lights needed' },
              { id: 'b', label: 'A white front headlight visible 500 ft AND a red rear reflector or light', correct: true },
              { id: 'c', label: 'Just a rear reflector' },
              { id: 'd', label: 'No lights — the rider just has to wear bright clothing' }
            ],
            explain: 'Maine law (Title 29-A §2065) requires a white front headlight visible from 500 feet and a red rear reflector (a red rear light is even better — many cyclists run both). Add ankle reflectors and side reflectors if you can. Driver crashes with cyclists at night happen mostly because the cyclist was simply invisible.'
          },
          {
            q: 'You\'re approaching a turn from a bike lane. What\'s the safest way to signal a left turn?',
            choices: [
              { id: 'a', label: 'Yell at drivers' },
              { id: 'b', label: 'Stick your left arm straight out, check over your shoulder, signal early', correct: true },
              { id: 'c', label: 'Just turn — drivers will see you' },
              { id: 'd', label: 'Brake first, then turn the wheel' }
            ],
            explain: 'Left arm extended straight out is the universal "left turn" signal. Hold for at least 3-4 seconds before turning. Always check over your shoulder for traffic before crossing lanes (the bike equivalent of a head check). Brief, predictable signals + eye contact with drivers is the single best crash-prevention behavior on the road.'
          }
        ];

        var idxState = useState(0);
        var idx = idxState[0], setIdx = idxState[1];
        var answersState = useState({});
        var answers = answersState[0], setAnswers = answersState[1];
        var revealState = useState(false);
        var reveal = revealState[0], setReveal = revealState[1];

        var q = QUESTIONS[idx];
        var hasAnswered = answers[idx] !== undefined;
        var chosenId = answers[idx];
        // Null-guard: if answers state somehow contains a chosenId not in choices
        // (corrupted state, hot-reload mid-answer), fall back to incorrect.
        var chosenChoice = hasAnswered ? q.choices.find(function(c) { return c.id === chosenId; }) : null;
        var isCorrect = !!(chosenChoice && chosenChoice.correct);

        var pickChoice = function(cid) {
          if (hasAnswered) return;
          // Immutable update via Object.assign so React detects the change.
          setAnswers(Object.assign({}, answers, (function() { var o = {}; o[idx] = cid; return o; })()));
          setReveal(true);
        };
        var goNext = function() { if (idx < QUESTIONS.length - 1) { setIdx(idx + 1); setReveal(false); } };
        var goPrev = function() { if (idx > 0) { setIdx(idx - 1); setReveal(false); } };
        var correctCount = Object.keys(answers).filter(function(k) {
          var ci = answers[k];
          var ch = QUESTIONS[k] && QUESTIONS[k].choices.find(function(c) { return c.id === ci; });
          return !!(ch && ch.correct);
        }).length;

        function signalSvg(kind) {
          var common = { viewBox: '0 0 80 80', className: 'w-16 h-16 mx-auto' };
          if (kind === 'left_straight') {
            return h('svg', common,
              h('circle', { cx: 40, cy: 28, r: 8, fill: '#fde68a', stroke: '#0f172a', strokeWidth: 2 }),
              h('rect', { x: 35, y: 36, width: 10, height: 20, fill: '#3b82f6', stroke: '#0f172a', strokeWidth: 2 }),
              h('rect', { x: 5, y: 42, width: 30, height: 6, fill: '#fde68a', stroke: '#0f172a', strokeWidth: 2 })
            );
          }
          if (kind === 'left_up') {
            return h('svg', common,
              h('circle', { cx: 40, cy: 28, r: 8, fill: '#fde68a', stroke: '#0f172a', strokeWidth: 2 }),
              h('rect', { x: 35, y: 36, width: 10, height: 20, fill: '#3b82f6', stroke: '#0f172a', strokeWidth: 2 }),
              h('rect', { x: 18, y: 42, width: 6, height: 18, fill: '#fde68a', stroke: '#0f172a', strokeWidth: 2 }),
              h('rect', { x: 18, y: 20, width: 6, height: 24, fill: '#fde68a', stroke: '#0f172a', strokeWidth: 2 })
            );
          }
          if (kind === 'left_down') {
            return h('svg', common,
              h('circle', { cx: 40, cy: 28, r: 8, fill: '#fde68a', stroke: '#0f172a', strokeWidth: 2 }),
              h('rect', { x: 35, y: 36, width: 10, height: 20, fill: '#3b82f6', stroke: '#0f172a', strokeWidth: 2 }),
              h('rect', { x: 20, y: 42, width: 6, height: 30, fill: '#fde68a', stroke: '#0f172a', strokeWidth: 2 })
            );
          }
          if (kind === 'right_straight') {
            return h('svg', common,
              h('circle', { cx: 40, cy: 28, r: 8, fill: '#fde68a', stroke: '#0f172a', strokeWidth: 2 }),
              h('rect', { x: 35, y: 36, width: 10, height: 20, fill: '#3b82f6', stroke: '#0f172a', strokeWidth: 2 }),
              h('rect', { x: 45, y: 42, width: 30, height: 6, fill: '#fde68a', stroke: '#0f172a', strokeWidth: 2 })
            );
          }
          if (kind === 'both_out') {
            return h('svg', common,
              h('circle', { cx: 40, cy: 28, r: 8, fill: '#fde68a', stroke: '#0f172a', strokeWidth: 2 }),
              h('rect', { x: 35, y: 36, width: 10, height: 20, fill: '#3b82f6', stroke: '#0f172a', strokeWidth: 2 }),
              h('rect', { x: 5, y: 42, width: 30, height: 6, fill: '#fde68a', stroke: '#0f172a', strokeWidth: 2 }),
              h('rect', { x: 45, y: 42, width: 30, height: 6, fill: '#fde68a', stroke: '#0f172a', strokeWidth: 2 })
            );
          }
          return h('div', null, '?');
        }

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          BackBar({ icon: '🛡️', title: 'Hand Signals & Safety' }),
          h('div', { className: 'p-4 max-w-4xl mx-auto w-full space-y-4' },
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-4' },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600' }, 'Question ' + (idx + 1) + ' / ' + QUESTIONS.length),
                h('div', { className: 'text-sm font-bold' },
                  h('span', { className: 'text-emerald-600' }, '✓ ' + correctCount),
                  h('span', { className: 'text-slate-400 mx-1' }, '/'),
                  h('span', { className: 'text-slate-600' }, Object.keys(answers).length + ' answered'))
              ),
              h('div', { className: 'w-full h-2 bg-slate-100 rounded-full overflow-hidden' },
                h('div', { className: 'h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all',
                  style: { width: (((idx + 1) / QUESTIONS.length) * 100) + '%' } })
              )
            ),
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-5' },
              h('div', { className: 'text-base font-bold text-slate-800 mb-4' }, q.q),
              h('div', { className: 'grid grid-cols-1 ' + (q.choices[0].svg ? 'md:grid-cols-3' : 'md:grid-cols-2') + ' gap-3' },
                q.choices.map(function(c) {
                  var isPicked = chosenId === c.id;
                  var borderColor = 'border-slate-200 hover:border-slate-400';
                  if (hasAnswered && c.correct) borderColor = 'border-emerald-500 bg-emerald-50';
                  else if (hasAnswered && isPicked && !c.correct) borderColor = 'border-rose-500 bg-rose-50';
                  else if (isPicked) borderColor = 'border-indigo-500 bg-indigo-50';
                  return h('button', {
                    key: c.id,
                    onClick: function() { pickChoice(c.id); },
                    disabled: hasAnswered,
                    className: 'text-left p-4 rounded-xl border-2 transition-all ' + borderColor + (hasAnswered ? ' cursor-default' : ' cursor-pointer')
                  },
                    c.svg && signalSvg(c.svg),
                    h('div', { className: 'text-sm font-medium text-slate-700 mt-2' }, c.label),
                    hasAnswered && c.correct && h('div', { className: 'text-xs text-emerald-700 font-bold mt-2' }, '✓ Correct'),
                    hasAnswered && isPicked && !c.correct && h('div', { className: 'text-xs text-rose-700 font-bold mt-2' }, '✗ Your answer')
                  );
                })
              ),
              reveal && h('div', { className: 'mt-4 p-4 rounded-lg border ' + (isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200') },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider mb-1 ' + (isCorrect ? 'text-emerald-700' : 'text-amber-700') }, isCorrect ? '✓ Why that\'s right' : '📖 The correct answer'),
                h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, q.explain)
              )
            ),
            h('div', { className: 'flex items-center gap-3' },
              h('button', {
                onClick: goPrev,
                disabled: idx === 0,
                className: 'px-4 py-2 rounded-lg font-bold text-sm ' + (idx === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-200 hover:bg-slate-300 text-slate-700')
              }, '← Previous'),
              h('div', { className: 'flex-1' }),
              idx === QUESTIONS.length - 1
                ? h('div', { className: 'text-sm text-slate-600 font-bold' }, correctCount + ' / ' + QUESTIONS.length + ' correct')
                : h('button', {
                    onClick: goNext,
                    disabled: !hasAnswered,
                    className: 'px-4 py-2 rounded-lg font-bold text-sm ' + (!hasAnswered ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white')
                  }, 'Next →')
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // SUB-VIEW: NEIGHBORHOOD RIDE DEMO
      // ─────────────────────────────────────────────────────
      // Applied-physics capstone. Ride a scripted 600 m "commute to school"
      // course that reuses the Sandbox physics engine. Three scored events
      // along the way (stop sign, steep climb, wet section) teach real-world
      // gear + braking decisions.
      function NeighborhoodRide() {
        var bikeState = useState(d.rideBikeId || 'hybrid');
        var bikeId = bikeState[0], setBikeId = bikeState[1];
        var bike = BIKES.find(function(b) { return b.id === bikeId; }) || BIKES[1];
        var powerState = useState(150);
        var power = powerState[0], setPower = powerState[1];
        var gearState = useState(0.7);
        var gear = gearState[0], setGear = gearState[1];
        var brakingState = useState(false);
        var braking = brakingState[0], setBraking = brakingState[1];
        var runningState = useState(false);
        var running = runningState[0], setRunning = runningState[1];
        var finishedState = useState(false);
        var finished = finishedState[0], setFinished = finishedState[1];

        var COURSE_LENGTH = 600;
        var COURSE_SEGMENTS = [
          { from: 0,   to: 180, kind: 'pavement', label: 'Your block', elevFn: function(x) { return 0; } },
          { from: 180, to: 220, kind: 'pavement', label: 'STOP SIGN',  elevFn: function(x) { return 0; }, stopSign: { at: 205, windowStart: 195, windowEnd: 215 } },
          { from: 220, to: 280, kind: 'pavement', label: 'Flat run',   elevFn: function(x) { return 0; } },
          { from: 280, to: 380, kind: 'pavement', label: 'Oak Hill',   elevFn: function(x) { return (x - 280) * 0.07; }, hill: { start: 280, end: 380 } },
          { from: 380, to: 450, kind: 'pavement', label: 'Descent',    elevFn: function(x) { return 7 - (x - 380) * 0.03; } },
          { from: 450, to: 520, kind: 'wet',      label: 'Wet patch',  elevFn: function(x) { return 4.9 - (x - 450) * 0.04; }, wet: { start: 450, end: 520 } },
          { from: 520, to: 600, kind: 'pavement', label: 'School St.', elevFn: function(x) { return 2.1 - (x - 520) * 0.026; } }
        ];
        var DECOR = [
          { x: 20,  emoji: '🏠', h: 3.5 }, { x: 60,  emoji: '🏡', h: 3.5 },
          { x: 100, emoji: '🌳', h: 2.5 }, { x: 140, emoji: '🏠', h: 3.5 },
          { x: 205, emoji: '🛑', h: 2.0 }, { x: 250, emoji: '🌳', h: 2.5 },
          { x: 300, emoji: '🌳', h: 2.5 }, { x: 340, emoji: '🌳', h: 2.5 },
          { x: 420, emoji: '🏡', h: 3.5 }, { x: 470, emoji: '🌧️', h: 4.0 },
          { x: 560, emoji: '🏡', h: 3.5 }, { x: 600, emoji: '🏫', h: 4.5 }
        ];

        var scoreRef = useRef({ stopSignObeyed: null, stopSignMinV: null, hillMinSpeed: 999, hillCrawlTime: 0, wetBrakingHard: false });
        var posRef = useRef(0);
        var velRef = useRef(0);
        var timeRef = useRef(0);
        var prevVelRef = useRef(0);
        var rafRef = useRef(null);
        var lastTsRef = useRef(0);
        var hudTickState = useState(0);
        var hudTick = hudTickState[0], setHudTick = hudTickState[1];
        var canvasRef = useRef(null);

        var terrainAt = function(x) {
          var clamped = Math.max(0, Math.min(COURSE_LENGTH, x));
          var seg = COURSE_SEGMENTS.find(function(s) { return clamped >= s.from && clamped <= s.to; }) || COURSE_SEGMENTS[0];
          return { y: seg.elevFn(clamped), kind: seg.kind, seg: seg };
        };

        var reset = function() {
          posRef.current = 0; velRef.current = 0; timeRef.current = 0; prevVelRef.current = 0;
          scoreRef.current = { stopSignObeyed: null, stopSignMinV: null, hillMinSpeed: 999, hillCrawlTime: 0, wetBrakingHard: false };
          setFinished(false);
          setHudTick(function(x) { return x + 1; });
        };

        useEffect(function() { reset(); }, [bikeId]);

        useEffect(function() {
          if (!running) return;
          var onKey = function(e) {
            if (e.key === 'ArrowUp') { setGear(function(g) { return Math.min(1, g + 0.1); }); e.preventDefault(); }
            if (e.key === 'ArrowDown') { setGear(function(g) { return Math.max(0.2, g - 0.1); }); e.preventDefault(); }
            if (e.key === ' ') { setBraking(true); e.preventDefault(); }
          };
          var onKeyUp = function(e) { if (e.key === ' ') setBraking(false); };
          window.addEventListener('keydown', onKey);
          window.addEventListener('keyup', onKeyUp);
          return function() {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('keyup', onKeyUp);
          };
        }, [running]);

        var step = useCallback(function(dt) {
          var m = bike.mass;
          var v = velRef.current;
          var x = posRef.current;
          var t = terrainAt(x);
          var y0 = t.y;
          var y1 = terrainAt(x + 0.5).y;
          var slope = (y1 - y0) / 0.5;
          var angle = Math.atan(slope);
          var crrMult = SURFACE_CRR_MULT[t.kind] || 1;
          var normalN = m * G * Math.cos(angle);
          var gravParallel = m * G * Math.sin(angle);
          var rollingF = bike.crr * crrMult * normalN;
          var dragF = 0.5 * RHO_AIR * bike.cdA * v * Math.abs(v);
          var effectivePower = braking ? 0 : Math.min(power, bike.maxPower) * gear;
          var pedalF = v > 0.3 ? effectivePower / v : effectivePower / 0.3;
          if (v < 0.3) pedalF = Math.min(pedalF, 250);
          var brakeF = braking ? m * 5.5 : 0;
          var netF = pedalF - rollingF - dragF - gravParallel - brakeF;
          var a = netF / m;
          var newV = v + a * dt;
          if (newV < 0) newV = 0;
          var newX = x + newV * dt;

          var s = scoreRef.current;
          if (t.seg.stopSign && newX >= t.seg.stopSign.windowStart && newX <= t.seg.stopSign.windowEnd) {
            if (s.stopSignMinV == null || newV < s.stopSignMinV) s.stopSignMinV = newV;
          }
          if (t.seg.stopSign && newX >= t.seg.stopSign.windowEnd && s.stopSignObeyed === null) {
            s.stopSignObeyed = (s.stopSignMinV != null && s.stopSignMinV <= 1.2);
            if (s.stopSignObeyed) addToast('✓ Stopped at the stop sign', 'success');
            else addToast('✗ You ran the stop sign', 'warning');
          }
          if (t.seg.hill && newX >= t.seg.hill.start && newX <= t.seg.hill.end) {
            if (newV < s.hillMinSpeed) s.hillMinSpeed = newV;
            if (newV < 2.0) s.hillCrawlTime += dt;
          }
          if (t.seg.wet && newX >= t.seg.wet.start && newX <= t.seg.wet.start + 5) {
            var decel = (prevVelRef.current - newV) / dt;
            if (decel > 4.0) s.wetBrakingHard = true;
          }

          velRef.current = newV;
          posRef.current = newX;
          prevVelRef.current = newV;
          timeRef.current += dt;

          if (newX >= COURSE_LENGTH) {
            setRunning(false);
            setFinished(true);
            var bestT = d.rideBestTime;
            if (!bestT || timeRef.current < bestT) upd('rideBestTime', timeRef.current);
          }
        }, [bike, power, gear, braking, d.rideBestTime]);

        useEffect(function() {
          if (!running) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return; }
          var loop = function(ts) {
            if (!lastTsRef.current) lastTsRef.current = ts;
            var dt = Math.min(0.05, (ts - lastTsRef.current) / 1000);
            lastTsRef.current = ts;
            var sub = 4;
            for (var i = 0; i < sub; i++) step(dt / sub);
            draw();
            setHudTick(function(x) { return (x + 1) % 1000; });
            rafRef.current = requestAnimationFrame(loop);
          };
          rafRef.current = requestAnimationFrame(loop);
          return function() { if (rafRef.current) cancelAnimationFrame(rafRef.current); lastTsRef.current = 0; };
        }, [running, step]); // eslint-disable-line

        var draw = function() {
          var cvs = canvasRef.current;
          if (!cvs) return;
          var ctx2d = cvs.getContext('2d');
          var W = cvs.width, H = cvs.height;
          var sky = ctx2d.createLinearGradient(0, 0, 0, H * 0.75);
          sky.addColorStop(0, '#7dd3fc'); sky.addColorStop(1, '#e0f2fe');
          ctx2d.fillStyle = sky;
          ctx2d.fillRect(0, 0, W, H * 0.75);
          ctx2d.fillStyle = '#cbd5e1';
          ctx2d.fillRect(0, H * 0.55, W, H * 0.20);

          var camX = posRef.current;
          var pxPerMeter = 8;
          var centerY = H * 0.75;
          var w2sX = function(wx) { return W * 0.25 + (wx - camX) * pxPerMeter; };
          var w2sY = function(wy) { return centerY - wy * pxPerMeter; };

          ctx2d.beginPath();
          ctx2d.moveTo(0, H);
          for (var wx = camX - 50; wx <= camX + 110; wx += 2) {
            var p = terrainAt(wx);
            ctx2d.lineTo(w2sX(wx), w2sY(p.y));
          }
          ctx2d.lineTo(W, H);
          ctx2d.closePath();
          var tNow = terrainAt(camX);
          ctx2d.fillStyle = tNow.kind === 'wet' ? '#475569' : tNow.kind === 'dirt' ? '#78350f' : '#334155';
          ctx2d.fill();
          if (tNow.kind === 'pavement') {
            ctx2d.strokeStyle = '#fbbf24';
            ctx2d.lineWidth = 2;
            ctx2d.setLineDash([12, 10]);
            ctx2d.beginPath();
            for (var wx2 = camX - 50; wx2 <= camX + 110; wx2 += 2) {
              var p2 = terrainAt(wx2);
              if (wx2 === camX - 50) ctx2d.moveTo(w2sX(wx2), w2sY(p2.y));
              else ctx2d.lineTo(w2sX(wx2), w2sY(p2.y));
            }
            ctx2d.stroke();
            ctx2d.setLineDash([]);
          }

          DECOR.forEach(function(dec) {
            var dx = w2sX(dec.x);
            if (dx < -30 || dx > W + 30) return;
            var dp = terrainAt(dec.x);
            var dy = w2sY(dp.y + dec.h);
            ctx2d.font = (dec.h * 8) + 'px serif';
            ctx2d.fillText(dec.emoji, dx - 16, dy);
          });

          COURSE_SEGMENTS.forEach(function(seg) {
            if (seg.stopSign) {
              var sx1 = w2sX(seg.stopSign.windowStart);
              var sx2 = w2sX(seg.stopSign.windowEnd);
              if (sx2 < 0 || sx1 > W) return;
              ctx2d.fillStyle = 'rgba(239, 68, 68, 0.15)';
              ctx2d.fillRect(sx1, centerY - 6, sx2 - sx1, 16);
            }
            if (seg.wet) {
              var wx1 = w2sX(seg.wet.start);
              var wxE = w2sX(seg.wet.end);
              if (wxE < 0 || wx1 > W) return;
              ctx2d.fillStyle = 'rgba(14, 165, 233, 0.18)';
              ctx2d.fillRect(wx1, centerY - 6, wxE - wx1, 16);
            }
          });

          var gp = terrainAt(camX);
          var bx = w2sX(camX);
          var by = w2sY(gp.y);
          var bxAhead = w2sX(camX + 0.5);
          var byAhead = w2sY(terrainAt(camX + 0.5).y);
          var bikeAngle = Math.atan2(byAhead - by, bxAhead - bx);
          ctx2d.save();
          ctx2d.translate(bx, by);
          ctx2d.rotate(bikeAngle);
          ctx2d.strokeStyle = '#0f172a'; ctx2d.lineWidth = 3;
          ctx2d.beginPath(); ctx2d.arc(-14, -6, 6, 0, 2 * Math.PI); ctx2d.stroke();
          ctx2d.beginPath(); ctx2d.arc(14, -6, 6, 0, 2 * Math.PI); ctx2d.stroke();
          ctx2d.beginPath();
          ctx2d.moveTo(-14, -6); ctx2d.lineTo(0, -18); ctx2d.lineTo(14, -6);
          ctx2d.strokeStyle = '#f43f5e'; ctx2d.lineWidth = 3; ctx2d.stroke();
          ctx2d.beginPath(); ctx2d.arc(0, -26, 4, 0, 2 * Math.PI);
          ctx2d.fillStyle = '#fed7aa'; ctx2d.fill();
          ctx2d.restore();

          ctx2d.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx2d.fillRect(0, 0, W, 28);
          var pct = Math.min(1, posRef.current / COURSE_LENGTH);
          ctx2d.fillStyle = '#22c55e';
          ctx2d.fillRect(0, 0, W * pct, 28);
          ctx2d.font = 'bold 13px monospace';
          ctx2d.fillStyle = '#fff';
          ctx2d.fillText('🏠 ' + posRef.current.toFixed(0) + ' / ' + COURSE_LENGTH + ' m · ' + timeRef.current.toFixed(1) + 's · ' + (velRef.current * 2.237).toFixed(1) + ' mph 🏫', 12, 19);

          var nextEventDist = null;
          var nextEventLabel = '';
          COURSE_SEGMENTS.forEach(function(seg) {
            if (seg.stopSign && seg.stopSign.at > posRef.current && (nextEventDist == null || seg.stopSign.at - posRef.current < nextEventDist)) {
              nextEventDist = seg.stopSign.at - posRef.current;
              nextEventLabel = '🛑 Stop sign';
            }
            if (seg.hill && seg.hill.start > posRef.current && (nextEventDist == null || seg.hill.start - posRef.current < nextEventDist)) {
              nextEventDist = seg.hill.start - posRef.current;
              nextEventLabel = '⛰️ Steep climb';
            }
            if (seg.wet && seg.wet.start > posRef.current && (nextEventDist == null || seg.wet.start - posRef.current < nextEventDist)) {
              nextEventDist = seg.wet.start - posRef.current;
              nextEventLabel = '🌧️ Wet section';
            }
          });
          if (nextEventDist != null && nextEventDist < 80) {
            ctx2d.fillStyle = 'rgba(234, 88, 12, 0.9)';
            ctx2d.fillRect(W - 260, 36, 250, 32);
            ctx2d.fillStyle = '#fff';
            ctx2d.font = 'bold 13px sans-serif';
            ctx2d.fillText(nextEventLabel + ' in ' + nextEventDist.toFixed(0) + ' m', W - 250, 56);
          }
        };

        useEffect(function() { draw(); }, [hudTick, bikeId, running]); // eslint-disable-line

        var advice = [];
        if (scoreRef.current.stopSignObeyed === false) advice.push('Brake earlier to fully stop at the sign (≤ 1 m/s for a moment).');
        if (scoreRef.current.hillCrawlTime > 5) advice.push('Downshift to a lower gear before the climb — your speed dropped below 2 m/s for a while.');
        if (scoreRef.current.wetBrakingHard) advice.push('Wet pavement has half the grip of dry. Ease off the brake before entering puddles.');
        if (advice.length === 0 && finished) advice.push('Clean ride! You applied the physics correctly.');
        var bestTime = d.rideBestTime;

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          BackBar({ icon: '🏘️', title: 'Neighborhood Ride' }),
          h('div', { className: 'p-3 max-w-7xl mx-auto w-full space-y-3' },
            h('div', { className: 'bg-slate-900 rounded-xl overflow-hidden shadow-xl border border-slate-800' },
              h('canvas', { ref: canvasRef, width: 1000, height: 380, className: 'w-full block', role: 'img', 'aria-label': 'Neighborhood ride: bicycle traverses streets with hills, stop signs, traffic, and weather. Use the brake button or arrow keys to control.' })
            ),
            h('div', { className: 'grid grid-cols-1 lg:grid-cols-4 gap-3' },
              h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-3 flex flex-col gap-2' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600' }, 'Session'),
                !finished && h('button', {
                  onClick: function() { setRunning(!running); },
                  className: 'py-2.5 px-4 rounded-lg font-bold transition-colors shadow ' + (running ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white')
                }, running ? '⏸ Pause' : (posRef.current > 0 && posRef.current < COURSE_LENGTH ? '▶ Resume' : '▶ Start Ride')),
                finished && h('button', {
                  onClick: function() { reset(); setRunning(true); },
                  className: 'py-2.5 px-4 rounded-lg font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors shadow'
                }, '↻ Ride Again'),
                h('button', {
                  onClick: function() { setRunning(false); reset(); },
                  className: 'py-2 px-4 rounded-lg font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm transition-colors'
                }, '↺ Reset'),
                bestTime && h('div', { className: 'text-[11px] text-slate-600 text-center border-t border-slate-200 pt-2' },
                  '🏆 Best: ' + bestTime.toFixed(1) + 's')
              ),
              h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-3' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-2' }, 'Bike'),
                h('div', { className: 'grid grid-cols-2 gap-1' },
                  BIKES.map(function(b) {
                    return h('button', {
                      key: b.id,
                      onClick: function() { setBikeId(b.id); upd('rideBikeId', b.id); },
                      className: 'flex items-center gap-1 px-1.5 py-1 rounded border text-xs transition-colors ' + (bikeId === b.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-bold' : 'border-slate-200 text-slate-600 hover:border-slate-300')
                    }, h('span', null, b.icon), h('span', { className: 'truncate' }, b.name.split(' ')[0]));
                  })
                )
              ),
              h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-3' },
                h('label', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 flex justify-between' },
                  h('span', null, 'Gear (↑/↓)'), h('span', { className: 'text-violet-600' }, (gear * 100).toFixed(0) + '%')),
                h('input', { type: 'range', min: 0.2, max: 1.0, step: 0.05, value: gear,
                  onChange: function(e) { setGear(parseFloat(e.target.value)); },
                  className: 'w-full accent-violet-500' }),
                h('label', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 flex justify-between mt-2' },
                  h('span', null, 'Pedal Power'), h('span', { className: 'text-cyan-600' }, power + ' W')),
                h('input', { type: 'range', min: 0, max: 400, value: power,
                  onChange: function(e) { setPower(parseInt(e.target.value)); },
                  className: 'w-full accent-cyan-500' })
              ),
              h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-3 flex flex-col' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-2' }, 'Brake (Space)'),
                h('button', {
                  'aria-label': braking ? 'Brake engaged. Release Space to stop braking.' : 'Brake. Hold Space or click to brake.',
                  'aria-pressed': braking,
                  onMouseDown: function() { setBraking(true); },
                  onMouseUp: function() { setBraking(false); },
                  onMouseLeave: function() { setBraking(false); },
                  onTouchStart: function() { setBraking(true); },
                  onTouchEnd: function() { setBraking(false); },
                  onKeyDown: function(e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!braking) setBraking(true); } },
                  onKeyUp: function(e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setBraking(false); } },
                  onBlur: function() { setBraking(false); },
                  className: 'flex-1 rounded-lg font-black text-white transition-colors shadow ' + (braking ? 'bg-rose-700' : 'bg-rose-500 hover:bg-rose-600')
                }, braking ? '🛑 BRAKING' : '🛑 Hold to Brake'),
                h('div', { className: 'text-[10px] text-slate-600 mt-2 text-center' }, 'Hold to slow or stop')
              )
            ),
            finished && h('div', { className: 'bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg text-white p-5' },
              h('div', { className: 'flex items-center gap-3 mb-3' },
                h('span', { className: 'text-5xl' }, '🏫'),
                h('div', null,
                  h('div', { className: 'text-[11px] font-bold uppercase tracking-wider opacity-80' }, 'You made it to school'),
                  h('div', { className: 'text-3xl font-black font-mono' }, timeRef.current.toFixed(1) + 's'),
                  bestTime === timeRef.current && h('div', { className: 'text-xs font-bold' }, '🏆 New personal best!')
                )
              ),
              h('div', { className: 'grid grid-cols-3 gap-3 mb-3' },
                h('div', { className: 'bg-white/15 rounded-lg p-2 text-center' },
                  h('div', { className: 'text-[10px] uppercase opacity-80' }, 'Stop Sign'),
                  h('div', { className: 'text-xl' }, scoreRef.current.stopSignObeyed ? '✓' : '✗')
                ),
                h('div', { className: 'bg-white/15 rounded-lg p-2 text-center' },
                  h('div', { className: 'text-[10px] uppercase opacity-80' }, 'Hill Crawl'),
                  h('div', { className: 'text-xl' }, scoreRef.current.hillCrawlTime <= 5 ? '✓' : '✗')
                ),
                h('div', { className: 'bg-white/15 rounded-lg p-2 text-center' },
                  h('div', { className: 'text-[10px] uppercase opacity-80' }, 'Wet Section'),
                  h('div', { className: 'text-xl' }, !scoreRef.current.wetBrakingHard ? '✓' : '✗')
                )
              ),
              advice.length > 0 && h('div', { className: 'bg-white/20 rounded-lg p-3 text-sm' },
                h('div', { className: 'text-[11px] font-bold uppercase tracking-wider opacity-80 mb-1' }, 'Coach'),
                advice.map(function(a, i) { return h('div', { key: i, className: 'leading-relaxed' }, '• ' + a); })
              )
            ),
            h('div', { className: 'bg-slate-100 rounded-xl p-3 text-xs text-slate-600 leading-relaxed border border-slate-400' },
              h('span', { className: 'font-bold text-slate-700' }, '🧭 Course: '),
              '180 m flat → 🛑 stop sign → flat run → ⛰️ Oak Hill (7% grade) → descent → 🌧️ wet patch → 🏫 school (600 m total). Use ↑/↓ to shift gears, Space to brake. Apply the physics you learned in Sandbox, Gearing, and Braking labs.'
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // SUB-VIEW: BIKE PARTS INSPECTOR
      // ─────────────────────────────────────────────────────
      function PartsInspector() {
        var BIKE_PARTS = [
          { id: 'top_tube',   name: 'Top Tube',        cat: 'Frame', hx: 195, hy: 80, hw: 120, hh: 20,
            fn: 'Horizontal frame tube connecting head tube to seat tube. Defines the "standover height" — you should have 2-5 cm clearance when straddling the bike flat-footed.',
            issues: 'Structural cracks after a crash. Dents from rack-hauling. Carbon tubes show stress as hairline fractures; aluminum shows dents.' },
          { id: 'down_tube',  name: 'Down Tube',       cat: 'Frame', hx: 170, hy: 140, hw: 160, hh: 24,
            fn: 'Diagonal tube from head tube to bottom bracket — the main load-bearing member. Takes pedaling forces and braking loads.',
            issues: 'Rock strikes leave dents that can fail under stress. Inspect after any crash. Check for paint cracks around tube junctions.' },
          { id: 'seat_tube',  name: 'Seat Tube',       cat: 'Frame', hx: 290, hy: 80, hw: 24, hh: 110,
            fn: 'Vertical tube that holds the seatpost. Its angle determines your riding posture (steeper = more forward).',
            issues: 'Seatpost seized from corrosion — grease the post every year. Clamp area cracks from over-tightening.' },
          { id: 'chainstay',  name: 'Chainstay',       cat: 'Frame', hx: 300, hy: 210, hw: 120, hh: 16,
            fn: 'Rear frame tubes running from bottom bracket to rear axle. Shorter chainstays = quicker acceleration and snappier handling.',
            issues: 'Chain slap wears the paint. Dropout threads can strip — use a threadless hanger on aluminum frames.' },
          { id: 'seatstay',   name: 'Seatstay',        cat: 'Frame', hx: 300, hy: 130, hw: 110, hh: 16,
            fn: 'Tubes from seat tube top to rear axle. Form the rear triangle with chainstay and seat tube.',
            issues: 'Carbon seatstays can crack at the dropout on impact. Rim brakes wear a groove in the mounting bosses over time.' },
          { id: 'head_tube',  name: 'Head Tube',       cat: 'Frame', hx: 160, hy: 95, hw: 26, hh: 70,
            fn: 'Short vertical tube at the front — houses the headset bearings that let the fork swivel. Its angle determines steering quickness.',
            issues: 'Creaking headset = loose preload. Cracks at tube junctions after a hard front impact.',
            repairJob: 'headset_adjust' },
          { id: 'rim',        name: 'Rim',             cat: 'Wheels', hx: 70, hy: 210, hw: 90, hh: 90,
            fn: 'Aluminum or carbon hoop holding the tire and transferring braking force (rim brakes) or offering a true surface (disc brakes).',
            issues: 'Bends from pothole hits. Rim-brake wear grooves — replace when the indicator disappears.',
            repairJob: 'wheel_true' },
          { id: 'spokes',     name: 'Spokes',          cat: 'Wheels', hx: 420, hy: 220, hw: 70, hh: 80,
            fn: 'Wire members connecting rim to hub in tension. Transfer weight from the hub to the ground through the rim.',
            issues: 'A broken spoke throws the wheel out of true immediately — zip-tie it to a neighbor and ride gently home.' },
          { id: 'hub',        name: 'Hub',             cat: 'Wheels', hx: 108, hy: 248, hw: 24, hh: 24,
            fn: 'Wheel center containing the axle and bearings. Rear hub also holds the cassette body and ratchet mechanism.',
            issues: 'Grinding = worn bearings. Free-hub pawls can fail — you pedal but the wheel doesn\'t move.' },
          { id: 'tire',       name: 'Tire',            cat: 'Wheels', hx: 60, hy: 250, hw: 100, hh: 36,
            fn: 'Rubber-and-casing air-chamber sleeve that provides grip and cushioning. Width, tread, and pressure all shape the ride.',
            issues: 'Sidewall cuts from glass. Thread showing = replace. Low pressure invites pinch flats on potholes.',
            repairJob: 'patch_tube' },
          { id: 'chainring',  name: 'Chainring',       cat: 'Drivetrain', hx: 285, hy: 220, hw: 40, hh: 40,
            fn: 'Front gear attached to the crank. Its tooth count combined with the cassette cog sets your gear ratio (see Gearing Lab).',
            issues: 'Teeth turn into shark-fins at wear. A chain that jumps teeth under load = replace chainring AND chain together.' },
          { id: 'cassette',   name: 'Cassette',        cat: 'Drivetrain', hx: 415, hy: 232, hw: 28, hh: 36,
            fn: 'Cluster of rear gears. Each cog changes the gear ratio. Shifting up = smaller cog = harder, more speed per pedal stroke.',
            issues: 'Worn cassettes cause skipping under load. Replace with chain every ~2 chain changes.',
            repairJob: 'chain_clean' },
          { id: 'chain',      name: 'Chain',           cat: 'Drivetrain', hx: 315, hy: 230, hw: 100, hh: 20,
            fn: 'Roller chain that transfers power from chainring to cassette. Wears 0.5% — 1% over ~1500 miles, needs replacement when it stretches.',
            issues: 'Use a chain-wear gauge. Clean and lube every 150 miles.',
            repairJob: 'chain_clean' },
          { id: 'rd',         name: 'Rear Derailleur', cat: 'Drivetrain', hx: 408, hy: 265, hw: 28, hh: 28,
            fn: 'Spring-loaded parallelogram that guides the chain between cassette cogs and maintains chain tension.',
            issues: 'Sluggish shifting = cable tension off. Bent hanger = shift is impossible to tune — replace the hanger.',
            repairJob: 'derailleur_index' },
          { id: 'shifter',    name: 'Shifter',         cat: 'Drivetrain', hx: 128, hy: 78, hw: 26, hh: 20,
            fn: 'Handlebar-mounted lever that pulls (or releases) cable to move the derailleur. Each click = one cog.',
            issues: 'Grit in the ratchet causes missed shifts. Replace cable every 2 years.' },
          { id: 'handlebar',  name: 'Handlebar',       cat: 'Cockpit', hx: 80, hy: 82, hw: 80, hh: 16,
            fn: 'Provides steering input and mounting for shifters, brake levers, and lights. Shapes: flat (MTB/hybrid), drop (road), riser.',
            issues: 'Aluminum bars have fatigue life — replace after 5-10 years or a crash. Carbon cracks invisibly.' },
          { id: 'stem',       name: 'Stem',            cat: 'Cockpit', hx: 136, hy: 78, hw: 30, hh: 16,
            fn: 'Clamps handlebar to fork steerer. Length and angle change your reach and bar height — swap it for a better fit.',
            issues: 'Over-torqued bolts crack carbon bars. Re-grease steerer clamp on every service.',
            repairJob: 'headset_adjust' },
          { id: 'saddle',     name: 'Saddle',          cat: 'Cockpit', hx: 282, hy: 58, hw: 46, hh: 14,
            fn: 'Seat. Supports your weight via your "sit bones" (ischial tuberosities). Width should match your sit-bone spacing.',
            issues: 'Wear-through at corners. Creaking rails need grease. Numbness = adjust angle slightly nose-down.' },
          { id: 'brake_lever',name: 'Brake Lever',     cat: 'Brakes', hx: 115, hy: 82, hw: 16, hh: 22,
            fn: 'Pulls the brake cable or hydraulic pistons. Position matters — adjust reach so you can brake without straining your fingers.',
            issues: 'Mushy lever = air in hydraulic line (bleed) or stretched cable (tighten).',
            repairJob: 'brake_adjust' },
          { id: 'caliper',    name: 'Brake Caliper',   cat: 'Brakes', hx: 100, hy: 180, hw: 38, hh: 22,
            fn: 'Clamps the pads onto the rim (rim brakes) or rotor (disc brakes) when cable is pulled. The actual braking force originates here.',
            issues: 'Squealing = pad toe-in wrong or contamination. Grinding = worn pads or misaligned caliper.',
            repairJob: 'brake_adjust' }
        ];

        var selectedState = useState(d.partsLastId || 'chain');
        var selectedId = selectedState[0], setSelectedId = selectedState[1];
        var selected = BIKE_PARTS.find(function(p) { return p.id === selectedId; }) || BIKE_PARTS[0];

        var CATEGORIES = [
          { id: 'Frame', color: 'bg-slate-500' },
          { id: 'Wheels', color: 'bg-blue-500' },
          { id: 'Drivetrain', color: 'bg-violet-500' },
          { id: 'Cockpit', color: 'bg-emerald-500' },
          { id: 'Brakes', color: 'bg-rose-500' }
        ];

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          BackBar({ icon: '🔍', title: 'Bike Parts Inspector' }),
          h('div', { className: 'p-4 max-w-7xl mx-auto w-full' },
            h('div', { className: 'grid grid-cols-1 lg:grid-cols-5 gap-4' },
              h('div', { className: 'lg:col-span-3 bg-white rounded-xl shadow border border-slate-400 p-4' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-2' }, 'Click any part of the bike'),
                h('svg', { viewBox: '0 0 500 300', className: 'w-full h-auto', style: { maxHeight: '420px' } },
                  h('line', { x1: 170, y1: 95, x2: 175, y2: 165, stroke: '#334155', strokeWidth: 3 }),
                  h('line', { x1: 175, y1: 95, x2: 300, y2: 95, stroke: '#334155', strokeWidth: 3 }),
                  h('line', { x1: 175, y1: 165, x2: 300, y2: 240, stroke: '#334155', strokeWidth: 3 }),
                  h('line', { x1: 300, y1: 95, x2: 300, y2: 240, stroke: '#334155', strokeWidth: 3 }),
                  h('line', { x1: 300, y1: 240, x2: 425, y2: 250, stroke: '#334155', strokeWidth: 3 }),
                  h('line', { x1: 300, y1: 95, x2: 425, y2: 250, stroke: '#334155', strokeWidth: 3 }),
                  h('line', { x1: 170, y1: 165, x2: 120, y2: 250, stroke: '#334155', strokeWidth: 3 }),
                  h('circle', { cx: 120, cy: 250, r: 42, fill: 'none', stroke: '#1e293b', strokeWidth: 3 }),
                  h('circle', { cx: 120, cy: 250, r: 5, fill: '#475569' }),
                  h('line', { x1: 120, y1: 250, x2: 120, y2: 210, stroke: '#64748b', strokeWidth: 1 }),
                  h('line', { x1: 120, y1: 250, x2: 154, y2: 270, stroke: '#64748b', strokeWidth: 1 }),
                  h('line', { x1: 120, y1: 250, x2: 86, y2: 270, stroke: '#64748b', strokeWidth: 1 }),
                  h('line', { x1: 120, y1: 250, x2: 120, y2: 290, stroke: '#64748b', strokeWidth: 1 }),
                  h('circle', { cx: 425, cy: 250, r: 42, fill: 'none', stroke: '#1e293b', strokeWidth: 3 }),
                  h('circle', { cx: 425, cy: 250, r: 5, fill: '#475569' }),
                  h('line', { x1: 425, y1: 250, x2: 425, y2: 210, stroke: '#64748b', strokeWidth: 1 }),
                  h('line', { x1: 425, y1: 250, x2: 459, y2: 270, stroke: '#64748b', strokeWidth: 1 }),
                  h('line', { x1: 425, y1: 250, x2: 391, y2: 270, stroke: '#64748b', strokeWidth: 1 }),
                  h('line', { x1: 425, y1: 250, x2: 425, y2: 290, stroke: '#64748b', strokeWidth: 1 }),
                  h('circle', { cx: 300, cy: 240, r: 18, fill: 'none', stroke: '#7c3aed', strokeWidth: 2 }),
                  h('circle', { cx: 425, cy: 250, r: 14, fill: 'none', stroke: '#7c3aed', strokeWidth: 2 }),
                  h('line', { x1: 318, y1: 240, x2: 439, y2: 250, stroke: '#a78bfa', strokeWidth: 2 }),
                  h('line', { x1: 318, y1: 250, x2: 411, y2: 258, stroke: '#a78bfa', strokeWidth: 2 }),
                  h('ellipse', { cx: 300, cy: 62, rx: 22, ry: 6, fill: '#1e293b' }),
                  h('line', { x1: 300, y1: 68, x2: 300, y2: 95, stroke: '#334155', strokeWidth: 2 }),
                  h('line', { x1: 90, y1: 90, x2: 160, y2: 90, stroke: '#334155', strokeWidth: 3 }),
                  h('line', { x1: 138, y1: 90, x2: 170, y2: 95, stroke: '#334155', strokeWidth: 3 }),
                  h('rect', { x: 108, y: 178, width: 24, height: 8, fill: '#f43f5e', stroke: '#881337', strokeWidth: 1 }),
                  h('rect', { x: 412, y: 270, width: 16, height: 22, fill: '#7c3aed', stroke: '#4c1d95', strokeWidth: 1 }),
                  selected && h('rect', {
                    x: selected.hx, y: selected.hy, width: selected.hw, height: selected.hh,
                    fill: 'none', stroke: '#fbbf24', strokeWidth: 3, rx: 4
                  }),
                  BIKE_PARTS.map(function(p) {
                    return h('rect', {
                      key: p.id,
                      x: p.hx, y: p.hy, width: p.hw, height: p.hh,
                      fill: 'transparent',
                      style: { cursor: 'pointer' },
                      onClick: function() { setSelectedId(p.id); upd('partsLastId', p.id); }
                    });
                  })
                )
              ),
              h('div', { className: 'lg:col-span-2 space-y-3' },
                h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 overflow-hidden' },
                  h('div', { className: 'p-4 bg-gradient-to-br from-slate-700 to-slate-900 text-white' },
                    h('div', { className: 'flex items-center justify-between mb-1' },
                      h('span', { className: 'text-xs font-bold uppercase tracking-wider opacity-70' }, selected.cat),
                      selected.repairJob && h('span', { className: 'bg-amber-500/30 text-amber-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider' }, 'Has repair job')
                    ),
                    h('h3', { className: 'text-2xl font-black' }, selected.name)
                  ),
                  h('div', { className: 'p-4 space-y-3' },
                    h('div', null,
                      h('div', { className: 'text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1' }, 'Function'),
                      h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, selected.fn)
                    ),
                    h('div', null,
                      h('div', { className: 'text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1' }, 'Common Issues'),
                      h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, selected.issues)
                    ),
                    selected.repairJob && h('button', {
                      onClick: function() {
                        upd('repairJobId', selected.repairJob);
                        goto('repair');
                      },
                      className: 'w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-colors shadow'
                    }, '🔧 Open related repair job →')
                  )
                ),
                h('div', { className: 'bg-slate-100 rounded-xl p-3' },
                  h('div', { className: 'text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2' }, 'Parts by category'),
                  CATEGORIES.map(function(c) {
                    var parts = BIKE_PARTS.filter(function(p) { return p.cat === c.id; });
                    return h('div', { key: c.id, className: 'mb-2' },
                      h('div', { className: 'flex items-center gap-2 mb-1' },
                        h('span', { className: 'w-3 h-3 rounded ' + c.color }),
                        h('span', { className: 'text-xs font-bold text-slate-700' }, c.id + ' (' + parts.length + ')')
                      ),
                      h('div', { className: 'flex flex-wrap gap-1 pl-5' },
                        parts.map(function(p) {
                          return h('button', {
                            key: p.id,
                            onClick: function() { setSelectedId(p.id); upd('partsLastId', p.id); },
                            className: 'text-[11px] px-2 py-0.5 rounded border transition-colors ' + (selectedId === p.id ? 'border-indigo-500 bg-indigo-500 text-white font-bold' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400')
                          }, p.name);
                        })
                      )
                    );
                  })
                )
              )
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
      if (view === 'fit') return h(BikeFit);
      if (view === 'braking') return h(BrakingPhysics);
      if (view === 'safety') return h(SafetyQuiz);
      if (view === 'ride') return h(NeighborhoodRide);
      if (view === 'parts') return h(PartsInspector);
      return h(MainMenu);
    }
  });

})();

} // end isRegistered guard
