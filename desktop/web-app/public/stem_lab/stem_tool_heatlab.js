// ═══════════════════════════════════════════════════════════════════════
// AlloFlow STEAM Lab — Heat & Thermodynamics Lab
//
// Fills the largest remaining curriculum hole in the lab: NGSS MS-PS3 and
// HS-PS3 had no home. Plate Tectonics teaches mantle convection and the
// chemistry suite mentions heat transfer, but nothing owned the subject.
//
// Five modules, each with a real model rather than an animation:
//   1. Heat Transfer     — 1-D explicit finite-difference heat equation over a
//                          bar of a chosen material; convection and radiation
//                          modes for the other two mechanisms.
//   2. Insulation        — Newton's law of cooling driven by a real R-value,
//                          so thickness and material change the curve honestly.
//   3. Specific Heat     — calorimetry mixing, predict-then-reveal:
//                          Tf = (m1c1T1 + m2c2T2) / (m1c1 + m2c2)
//   4. Heating Curve     — water from ice to steam, including the two latent
//                          plateaus that make the graph counter-intuitive.
//   5. Heat Engines      — Carnot limit eta = 1 - Tc/Th against real engines,
//                          i.e. why 100 percent is not an engineering problem.
//
// House rules followed from the rest of the lab: every control is a real
// button or labelled input (never div + role + tabIndex), the canvas answers
// arrow keys, animation respects prefers-reduced-motion, and the quest hooks
// measure what the learner DID, never what they merely opened.
// ═══════════════════════════════════════════════════════════════════════
function __alloOneWord(s) { if (String(s).indexOf('1 ') < 0) return s; var irr = { inches: 'inch', boxes: 'box', copies: 'copy', batches: 'batch', categories: 'category', entries: 'entry', halves: 'half', shelves: 'shelf', tries: 'try', classes: 'class', guesses: 'guess', quizzes: 'quiz', feet: 'foot', people: 'person', children: 'child', volcanoes: 'volcano' }; return String(s).replace(/(^|[^\d.,\-−\/:])([Tt]here are )?1 ((?:square|cubic|unit|equal|full|whole|live|alive|dying|new|more|fewer|extra|small|real|complete|separate|shaded|missed|remaining|plotted|turning|significant|decimal|wrong|required|sample|spaceship|part|path|trail|walking|cool|factor|zero|loose|trading|question|bottom|planned|residual|imperial|different|two-way|best-fit) )?((?:dot|row|column|square|tile|unit|piece|part|group|hop|jump|step|cup|stack|point|value|cell|face|block|marker|answer|question|problem|cube|counter|item|round|badge|generation|meter|metre|kilometer|kilometre|centimeter|centimetre|millimeter|millimetre|liter|litre|gram|kilogram|gallon|yard|mile|hectare|acre|teaspoon|tablespoon|ounce|pound|cent|dollar|coin|degree|space|place|side|second|minute|hour|day|week|month|year|apple|sticker|pencil|chair|student|bag|muffin|trial|rule|sector|shot|hundredth|tenth|thousandth|third|fourth|fifth|sixth|eighth|twelfth|quarter|whole|table|plant|marble|card|seat|ball|book|sample|ticket|tick|check|number|crayon|pack|grape|attempt|page|seed|bead|cookie|ribbon|caterpillar|feather|tray|egg|edge|mission|serving|member|dig|field|angle|birth|death|tone|parcel|prime|player|bucket|beat|pet|line|bar|slice|bin|record|response|pair|outlier|orange|crate|disk|mark|length|car|desk|tree|chocolate|challenge|section|hit|spot|landmark|pool|bee|carrot|textbook|elephant|bottle|tub|sneeze|screen|room|pin|ray|diagonal|corner|polygon|survivor|neighbour|neighbor|neighbourhood|observation|pattern|period|change|edit|stop|plan|home|wedge|figure|estimate|layer|wave|word|image|note|lesson|star|color|colour|photo|airport|event|earthquake|quake|eruption|droplet|stage|input|design|topic|case|cycle|pole|location|objective|character|credit|plate|pick|result|sound)s|inches|boxes|copies|batches|categories|entries|halves|shelves|tries|classes|guesses|quizzes|feet|people|children|volcanoes)\b( are| were| have| make| fit| remain| get| meet| need)?/g, function (m, pre, there, mod, noun, verb, at, all) { if (/(?:\b(?:Grade|Row|Column|Group|Team|Player|Level|Round|Step|Set|Part|Page|Table|Type|Day|Week|Stage|Trial|Test|Sample|Question|Problem|Card|Box|Line|Side|Figure|Item|Number|Chapter|Section|Area|Zone|Class|Tier|Unit|Lesson|Module|Generation)|[×÷+*]) $/i.test(all.slice(0, at + pre.length))) return m; if (/^(?:square|cube|round|point|change|group)s$/.test(noun) && /^ (?:to|up|down|into)\b/.test(all.slice(at + m.length))) return m; return pre + (there ? there.replace('are', 'is') : '') + '1 ' + (mod || '') + (irr[noun] || noun.slice(0, -1)) + (verb === ' are' ? ' is' : verb === ' were' ? ' was' : verb === ' have' ? ' has' : verb ? verb + 's' : ''); }).replace(/\b1 (row|group) of (\d+) make\b/g, '1 $1 of $2 makes'); }
(function () {
  'use strict';
  // Fallback-aware translator reachable from every call site in this tool.
  var __alloCtx_heatlab = null;
  var __alloT = function (k, fb) {
    var v;
    try { v = (__alloCtx_heatlab && typeof __alloCtx_heatlab.t === "function") ? __alloCtx_heatlab.t(k, fb) : null; } catch (e) { v = null; }
    return (v == null) ? (fb != null ? fb : k) : v;
  };
  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  // ── Materials. k = thermal conductivity (W/m-K), c = specific heat (J/kg-K),
  //    rho = density (kg/m^3). Diffusivity alpha = k / (rho * c) drives module 1.
  var MATERIALS = [
    { id: 'copper',   name: 'Copper',       k: 401,   c: 385,  rho: 8960, colour: '#f97316', note: 'The best common conductor. Used for pan bases and heat sinks precisely because heat races through it.' },
    { id: 'aluminium',name: 'Aluminium',    k: 237,   c: 897,  rho: 2700, colour: '#94a3b8', note: 'Two-thirds of copper’s conductivity at a third of the weight, which is why radiators and laptop bodies use it.' },
    { id: 'steel',    name: 'Steel',        k: 50,    c: 490,  rho: 7850, colour: '#64748b', note: 'Eight times worse than copper. A steel pan handle stays touchable far longer than a copper one.' },
    { id: 'glass',    name: 'Glass',        k: 1.0,   c: 840,  rho: 2500, colour: '#7dd3fc', note: 'Four hundred times worse than copper. Single-pane windows still lose heat fast because they are thin.' },
    // Conduction only, so it is labelled as STILL (gelled) water: in real liquid
    // water a temperature difference sets up convection, which carries heat far
    // faster than this bar or wrap model can show.
    { id: 'water',    name: 'Still water',  k: 0.6,   c: 4186, rho: 1000, colour: '#38bdf8', note: 'A poor conductor but an enormous heat store. That huge specific heat is why oceans steady the climate. Modelled as gelled, perfectly still water: real liquid water would start convecting and move heat much faster.' },
    { id: 'wood',     name: 'Wood',         k: 0.12,  c: 1700, rho: 600,  colour: '#a16207', note: 'A natural insulator. A wooden spoon in a hot pan never burns your hand the way a metal one does.' },
    { id: 'fibre',    name: 'Fibreglass',   k: 0.04,  c: 840,  rho: 20,   colour: '#fbbf24', note: 'Loft insulation. The glass itself conducts; the trapped still air between the fibres is what actually insulates.' },
    { id: 'aerogel',  name: 'Aerogel',      k: 0.015, c: 1000, rho: 150,  colour: '#c4b5fd', note: 'Almost entirely air held in a silica lattice. NASA used it on Mars rovers to survive the overnight cold.' }
  ];

  // Specific heats for the calorimetry module (J/kg-K)
  var SUBSTANCES = [
    { id: 'water',   name: 'Water',        c: 4186, colour: '#38bdf8' },
    { id: 'oil',     name: 'Olive oil',    c: 1970, colour: '#a3a635' },
    // maxC: ethanol boils at 78.4 C, so a liquid sample cannot start hotter.
    { id: 'ethanol', name: 'Ethanol',      c: 2440, colour: '#c4b5fd', maxC: 78 },
    { id: 'sand',    name: 'Dry sand',     c: 830,  colour: '#d6b370' },
    { id: 'alum',    name: 'Aluminium',    c: 897,  colour: '#94a3b8' },
    { id: 'iron',    name: 'Iron',         c: 449,  colour: '#71717a' },
    { id: 'copper',  name: 'Copper',       c: 385,  colour: '#f97316' }
  ];

  // Real engines, for the second-law module
  var ENGINES = [
    { name: 'Car petrol engine',      hot: 2500, cold: 350, real: 25, note: 'Most of the fuel energy leaves as hot exhaust and radiator heat, not motion.' },
    { name: 'Coal power station',     hot: 850,  cold: 320, real: 37, note: 'Steam turbines run near their practical ceiling; the waste heat goes up the cooling towers.' },
    { name: 'Combined-cycle gas',     hot: 1700, cold: 300, real: 62, note: 'A gas turbine’s exhaust drives a second steam turbine, so less heat is thrown away.' },
    { name: 'Nuclear (PWR)',          hot: 600,  cold: 310, real: 33, note: 'Limited by how hot the water loop is allowed to get, not by the reaction itself.' },
    { name: 'Human body (muscle)',    hot: 310,  cold: 295, real: 25, note: 'Not a heat engine at all — muscle converts chemical energy directly, which is why it beats its Carnot figure.' }
  ];

  // Everyday cases, for the spotlight list. `accept` lists the mechanism
  // choices (conduction, convection, radiation, evaporation, all) that count
  // as naming it correctly; the learner must choose before `mech` is shown.
  var EVERYDAY = [
    { name: 'Vacuum flask',      accept: ['all'],                       mech: 'All three, blocked',   desc:'The vacuum stops conduction and convection because there is no matter to carry heat. The silvered wall reflects radiation back. The only real leak is the stopper and the thin glass neck.', icon: '🥤' },
    // The sealed gap is a layer of still gas (argon conducts worse than air):
    // it beats conduction as much as convection, so both count.
    { name: 'Double glazing',    accept: ['convection', 'conduction'],  mech: 'Convection, slowed',   desc: 'The gap is too narrow for a convection current to get going, and it is often filled with argon, which conducts worse than air.', icon: '🪟' },
    { name: 'Car radiator',      accept: ['convection'],                mech: 'Convection, forced',   desc: 'Fins add surface area and the fan forces air across them. Forced convection moves far more heat than letting air drift past.', icon: '🚗' },
    { name: 'Penguin huddle',    accept: ['conduction', 'convection'],  mech: 'Conduction + wind',    desc: 'Huddling cuts the exposed surface area per bird and blocks wind chill. Penguins rotate so nobody stays on the cold edge.', icon: '🐧' },
    { name: 'Wetsuit',           accept: ['conduction'],                mech: 'Conduction, trapped',  desc: 'Neoprene traps a thin layer of water your body warms. Water conducts heat about 25 times better than air, so without the suit you lose heat fast.', icon: '🌊' },
    // 2,260 kJ/kg is the latent heat of vaporisation AT 100 C. Sweat leaves the
    // skin near 33 C, where it costs about 2,420 kJ/kg — and this tool is careful
    // enough elsewhere to use skin temperature rather than core temperature.
    { name: 'Sweating',          accept: ['evaporation'],               mech: 'Evaporation',          desc: 'Turning sweat to vapour costs about 2,420 kJ per kilogram at skin temperature, taken straight from your skin. It stops working when humidity is too high for the vapour to leave.', icon: '💦' },
    { name: 'Sea breeze',        accept: ['convection'],                mech: 'Convection, driven',   desc: 'Land heats faster than sea because rock has a much lower specific heat. The warm air over land rises and cool sea air flows in underneath.', icon: '🏖️' },
    { name: 'Oven mitt',         accept: ['conduction'],                mech: 'Conduction, resisted', desc: 'Thick fabric full of still air. It fails the moment it gets wet, because water conducts heat far better than the trapped air it replaces.', icon: '🧤' }
  ];

  // Linear expansion coefficients, per kelvin. dL = alpha * L * dT.
  var EXPANSION = [
    { id: 'invar',    name: 'Invar',           alpha: 1.2e-6,  note: 'A nickel-iron alloy designed to barely move. Used in precision instruments and old clock pendulums.' },
    { id: 'pyrex',    name: 'Borosilicate',    alpha: 3.3e-6,  note: 'Pyrex. It survives the oven-to-worktop shock that shatters ordinary glass, because the inside and outside expand almost equally.' },
    { id: 'glass',    name: 'Window glass',    alpha: 9.0e-6,  note: 'Nearly three times more than borosilicate, which is exactly why pouring boiling water into a cold tumbler cracks it.' },
    { id: 'steel',    name: 'Steel',           alpha: 12e-6,   note: 'Rails, bridges and reinforcing bar. Its near-match to concrete is what makes reinforced concrete possible at all.' },
    { id: 'concrete', name: 'Concrete',        alpha: 12e-6,   note: 'Almost identical to steel. If the two differed much, every reinforced structure would tear itself apart through the seasons.' },
    { id: 'copper',   name: 'Copper',          alpha: 17e-6,   note: 'Copper pipe in a long hot-water run needs expansion loops, or it buckles and creaks.' },
    { id: 'alum',     name: 'Aluminium',       alpha: 23e-6,   note: 'Twice steel. Aircraft skins and large aluminium roofs need generous allowance for movement.' }
  ];

  // Composite wall layers. Real insulation is layers in series, and the total
  // resistance is their sum — which is why one weak layer ruins a good wall.
  var WALL_LAYERS = [
    { id: 'brick',    name: 'Brick, 100 mm',        r: 0.13, note: 'Structural, not insulating. A solid brick wall is a poor thermal barrier however thick it looks.' },
    { id: 'block',    name: 'Concrete block, 100 mm', r: 0.11, note: 'Even worse than brick per millimetre. Dense materials conduct.' },
    { id: 'cavity',   name: 'Air cavity, 50 mm',    r: 0.18, note: 'Still air insulates well. The catch is that a wide cavity lets convection start, which is why 50 mm beats 200 mm.' },
    { id: 'mineral',  name: 'Mineral wool, 100 mm', r: 2.50, note: 'The workhorse. Traps air in fibres so it cannot circulate — you get the air’s low conductivity without the convection.' },
    { id: 'pir',      name: 'PIR board, 50 mm',     r: 2.27, note: 'Rigid foam with low-conductivity gas in closed cells. Half the thickness of mineral wool for the same resistance.' },
    { id: 'plaster',  name: 'Plasterboard, 12 mm',  r: 0.06, note: 'Finish, not insulation. Included because it is easy to imagine it helping when it barely does.' },
    { id: 'timber',   name: 'Timber, 20 mm',        r: 0.14, note: 'Modest but not nothing. Timber studs bridging the insulation are a real weak point in a wall.' },
    { id: 'glazing',  name: 'Double glazing unit',  r: 0.35, note: 'Far better than single glass, far worse than any insulated wall. Windows are usually the weakest element.' }
  ];
  // The still-air films clinging to each face. They were folded into one 0.17
  // constant that appeared in the total and nowhere in the layer list, so the
  // arithmetic on screen did not add up: four layers summing to 0.48 produced a
  // total of 0.65 with no visible explanation. Split for display at the standard
  // split; the sum, and therefore every U-value, is unchanged.
  var WALL_FILM_INSIDE = 0.13;
  var WALL_FILM_OUTSIDE = 0.04;
  var WALL_SURFACE_R = WALL_FILM_INSIDE + WALL_FILM_OUTSIDE;   // 0.17

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function fmt(n, dp) { var f = Math.pow(10, dp || 0); return (Math.round(n * f) / f).toLocaleString(); }

  // ── Thermal colour ramp ──────────────────────────────────────────────
  // The old ramp interpolated straight from blue to red in RGB, so everything
  // between 60 and 160 C came out the same desaturated mauve and a learner could
  // not tell warm from hot. These stops rise monotonically in lightness as well
  // as hue, which is what makes neighbouring temperatures distinguishable, and
  // they follow the sequence a real heated metal goes through: dull red, orange,
  // amber, white hot. The identical ramp colours the convection fluid and the
  // radiation absorber, so one key explains all three mechanisms.
  var HEAT_RAMP = [
    [0.00, 0x1d, 0x4e, 0xd8],
    [0.22, 0x7c, 0x3a, 0xed],
    [0.46, 0xdb, 0x27, 0x77],
    [0.68, 0xf9, 0x73, 0x16],
    [0.86, 0xfb, 0xbf, 0x24],
    [1.00, 0xfe, 0xf3, 0xc7]
  ];
  function heatRampColour(f) {
    var x = clamp(f, 0, 1), i;
    for (i = 1; i < HEAT_RAMP.length; i++) {
      if (x <= HEAT_RAMP[i][0] || i === HEAT_RAMP.length - 1) {
        var a = HEAT_RAMP[i - 1], b = HEAT_RAMP[i];
        var span = b[0] - a[0];
        var u = span > 0 ? clamp((x - a[0]) / span, 0, 1) : 0;
        return 'rgb(' + Math.round(a[1] + (b[1] - a[1]) * u) + ',' +
          Math.round(a[2] + (b[2] - a[2]) * u) + ',' +
          Math.round(a[3] + (b[3] - a[3]) * u) + ')';
      }
    }
    return 'rgb(29,78,216)';
  }

  // Axis ticks a human would choose. Splitting a range into four equal parts
  // produced labels like "-25, 21, 68, 114, 160" on the heating curve, which
  // hides the only two temperatures that matter on it — 0 and 100.
  function niceTicks(min, max, count) {
    var span = max - min;
    if (!(span > 0)) return [min];
    var raw = span / (count || 4);
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var norm = raw / mag;
    var step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
    var out = [], v = Math.ceil(min / step - 1e-9) * step;
    for (; v <= max + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
    return out;
  }
  function tickLabel(v, step) {
    // Use however many decimals the step itself needs (up to 3). The old
    // magnitude rule gave step 2.5 zero decimals, so a 0-10 axis read
    // "0, 3, 5, 8, 10", and gave step 0.25 one decimal ("0.3, 0.5, 0.8").
    var dp = 0;
    while (dp < 3 && Math.abs(step * Math.pow(10, dp) - Math.round(step * Math.pow(10, dp))) > 1e-9) dp++;
    return v.toFixed(dp);
  }

  // Pure model helpers are shared by the UI and the focused science tests. Keeping
  // one implementation prevents a test copy of an equation from drifting away
  // from what learners actually see.
  var HEAT_FINISH_C = 50;
  // Bar geometry shared by the model, the canvas, the probes and the ledger.
  // N is odd so node (N-1)/2 sits exactly at the centre, and the end nodes are
  // N-1 spacings apart, so the simulated bar really is 0.20 m long (it used to
  // be 89/90 of that, which put the steady midpoint at 108.99 C, not 110 C).
  var HEAT_BAR_LENGTH = 0.20;        // m
  var HEAT_BAR_NODES = 91;
  var HEAT_BAR_AREA = 1e-4;          // m^2 (a 1 cm^2 bar), for watts and joules
  var HEAT_COLD_C = 20;
  // A hot end at or below 80 C can never lift the middle to 50 C: the steady
  // midpoint is (hot + 20) / 2. 90 C leaves a 5 degree margin.
  var HEAT_HOT_MIN = 90;
  var HEAT_HOT_MAX = 300;
  var HEAT_TIME_SCALES = [10, 100, 1000];
  var HEAT_PROBE_MAX = 3;
  var HEAT_LOG_MAX = 200;
  // Contact temperature of skin (W s^0.5 / m^2 K). Published values for skin
  // sit around 1,000-1,600; 1,500 reproduces the textbook copper / wood demo.
  var HEAT_SKIN_EFFUSIVITY = 1500;
  var HEAT_SKIN_C = 33;
  function heatDiffusivity(material) {
    return material.k / (material.rho * material.c);
  }
  function heatAdvanceBar(T, material, hot, dt, barLength) {
    var n = T.length;
    if (n < 3) return T;
    var alpha = heatDiffusivity(material);
    var dx = (barLength || HEAT_BAR_LENGTH) / (n - 1);
    var stable = 0.4 * dx * dx / alpha;
    // Never cap this count: doing so makes a large manual step violate the
    // explicit heat-equation stability limit and produce impossible values.
    var sub = Math.max(1, Math.ceil(dt / stable));
    var sdt = dt / sub;
    for (var s = 0; s < sub; s++) {
      T[0] = hot;
      T[n - 1] = 20;
      var prev = T.slice();
      for (var i = 1; i < n - 1; i++) {
        T[i] = prev[i] + alpha * sdt * (prev[i + 1] - 2 * prev[i] + prev[i - 1]) / (dx * dx);
      }
    }
    return T;
  }
  // A race bar: profile, clock, finish time and the energy that has crossed
  // each end. Plain numbers plus one typed array; it lives in a ref, never in
  // toolData.
  function heatRaceState(n) {
    var N = n || HEAT_BAR_NODES;
    var T = new Float64Array(N);
    for (var i = 0; i < N; i++) T[i] = HEAT_COLD_C;
    return { T: T, clock: 0, reach: null, inJ: 0, outJ: 0 };
  }
  // Same explicit scheme as heatAdvanceBar, stepped one stable sub-step at a
  // time so that (a) the finish crossing is interpolated between sub-steps
  // instead of being stamped at the end of a whole frame or a 10 s button
  // press, and (b) the energy entering and leaving each end is summed with
  // exactly the fluxes the scheme used, so in = stored + out closes to
  // rounding error.
  function heatRaceAdvance(state, material, hot, dt, opts) {
    var o = opts || {};
    var T = state.T, n = T.length;
    if (!(dt > 0) || n < 3) return state;
    var L = o.barLength || HEAT_BAR_LENGTH;
    var area = o.area || HEAT_BAR_AREA;
    var finish = o.finishC == null ? HEAT_FINISH_C : o.finishC;
    var mid = o.probeIndex == null ? Math.floor(n / 2) : o.probeIndex;
    var alpha = heatDiffusivity(material);
    var dx = L / (n - 1);
    var stable = 0.4 * dx * dx / alpha;
    var sub = Math.max(1, Math.ceil(dt / stable));
    var sdt = dt / sub;
    var r = alpha * sdt / (dx * dx);
    var kA = material.k * area / dx;          // W per kelvin across one spacing
    var prev = state._prev && state._prev.length === n ? state._prev : (state._prev = new Float64Array(n));
    for (var s = 0; s < sub; s++) {
      T[0] = hot;
      T[n - 1] = HEAT_COLD_C;
      prev.set(T);
      for (var i = 1; i < n - 1; i++) T[i] = prev[i] + r * (prev[i + 1] - 2 * prev[i] + prev[i - 1]);
      state.inJ += kA * (prev[0] - prev[1]) * sdt;
      state.outJ += kA * (prev[n - 2] - prev[n - 1]) * sdt;
      if (state.reach === null && T[mid] >= finish) {
        var before = prev[mid], after = T[mid];
        var frac = after > before ? clamp((finish - before) / (after - before), 0, 1) : 1;
        state.reach = state.clock + sdt * frac;
      }
      state.clock += sdt;
    }
    return state;
  }
  // Thermal energy held by the interior nodes above the 20 C start (J).
  function heatBarStoredJ(T, material, barLength, area) {
    var n = T.length;
    if (n < 3) return 0;
    var dx = (barLength || HEAT_BAR_LENGTH) / (n - 1);
    var perK = material.rho * material.c * (area || HEAT_BAR_AREA) * dx;
    var sum = 0;
    for (var i = 1; i < n - 1; i++) sum += T[i] - HEAT_COLD_C;
    return perK * sum;
  }
  // Heat flowing in at the hot end and out at the cold end right now, from the
  // profile (Fourier's law across the first and last grid spacing).
  function heatBarFlux(T, material, opts) {
    var o = opts || {};
    var n = T.length;
    if (n < 3) return { inW: 0, outW: 0, inWm2: 0, outWm2: 0 };
    var dx = (o.barLength || HEAT_BAR_LENGTH) / (n - 1);
    var hot = o.hot == null ? T[0] : o.hot;
    var cold = o.cold == null ? T[n - 1] : o.cold;
    var inWm2 = material.k * (hot - T[1]) / dx;
    var outWm2 = material.k * (T[n - 2] - cold) / dx;
    var area = o.area || HEAT_BAR_AREA;
    return { inW: inWm2 * area, outW: outWm2 * area, inWm2: inWm2, outWm2: outWm2 };
  }
  // Steady-state heat flow through the bar, q = kA dT / L. This is what an
  // insulator is FOR, and it depends on k alone.
  function heatSteadyFlowW(material, hot, barLength, area) {
    return material.k * (area || HEAT_BAR_AREA) * (hot - HEAT_COLD_C) / (barLength || HEAT_BAR_LENGTH);
  }
  // Published series solution for a slab at 20 C whose ends are suddenly held
  // at `hot` and 20 C, evaluated at the centre:
  //   T(L/2, t) = (hot+20)/2 + sum_n 2(20-hot)/(n pi) sin(n pi/2) exp(-alpha n^2 pi^2 t / L^2)
  function heatMidpointAnalytic(material, hot, t, barLength) {
    var L = barLength || HEAT_BAR_LENGTH;
    var a = heatDiffusivity(material);
    var T = (hot + HEAT_COLD_C) / 2;
    for (var k = 1; k < 600; k += 2) {
      var sign = ((k - 1) / 2) % 2 === 0 ? 1 : -1;
      T += 2 * (HEAT_COLD_C - hot) / (k * Math.PI) * sign * Math.exp(-a * k * k * Math.PI * Math.PI * t / (L * L));
    }
    return T;
  }
  // Seconds until the analytic midpoint reaches the finish line; Infinity when
  // its steady value never gets there.
  function heatMidReachTime(material, hot, finishC, barLength) {
    var f = finishC == null ? HEAT_FINISH_C : finishC;
    if ((hot + HEAT_COLD_C) / 2 <= f) return Infinity;
    var lo = 0, hi = 1;
    while (heatMidpointAnalytic(material, hot, hi, barLength) < f && hi < 1e12) hi *= 2;
    for (var i = 0; i < 100; i++) {
      var m = (lo + hi) / 2;
      if (heatMidpointAnalytic(material, hot, m, barLength) >= f) hi = m; else lo = m;
    }
    return hi;
  }
  // Thermal effusivity e = sqrt(k rho c): how hard a material pulls heat out of
  // whatever touches it. It, not temperature, is why metal FEELS colder.
  function heatEffusivity(material) {
    if (typeof material === 'number') return material;
    return Math.sqrt(material.k * material.rho * material.c);
  }
  // Interface temperature when two semi-infinite bodies touch:
  //   Tc = (e1 T1 + e2 T2) / (e1 + e2). Either side may be a material or an e.
  function heatContactTemperature(a, b, Ta, Tb) {
    var ea = heatEffusivity(a), eb = heatEffusivity(b);
    if (!(ea + eb > 0)) return NaN;
    return (ea * Ta + eb * Tb) / (ea + eb);
  }
  // Two blocks in thermal contact (conductance G, W/K), each optionally leaking
  // to a room through g1, g2 (W/K). Exact solution of the linear 2x2 system by
  // eigen-decomposition, so every point is analytic rather than integrated.
  // Entropy: S = sum C ln(T in K); the room's share is the leaked heat / T_room.
  // Inputs: { m1, c1, T1, m2, c2, T2 (kg, J/kgK, C), G, leak1, leak2, roomC,
  // tEnd (s), steps }. Each point: T1, T2, q12J (+ = heat from body 1 to 2),
  // leak1J / leak2J (to the room), S, dS, dSroom, dStotal, energyResidualJ.
  function heatTwoBodyEquilibrium(o) {
    var C1 = o.m1 * o.c1, C2 = o.m2 * o.c2;
    var G = Math.max(0, Number(o.G) || 0);
    var g1 = Math.max(0, Number(o.leak1) || 0), g2 = Math.max(0, Number(o.leak2) || 0);
    var room = o.roomC == null ? HEAT_COLD_C : Number(o.roomC);
    var roomK = room + 273.15;
    var u0 = [o.T1 - room, o.T2 - room];
    var a = -(G + g1) / C1, b = G / C1, c = G / C2, dd = -(G + g2) / C2;
    var integ = function (lam, t) { return Math.abs(lam * t) < 1e-14 ? t : Math.expm1(lam * t) / lam; };
    var lam1, lam2, P1, P2;
    if (G > 0) {
      var disc = Math.sqrt((a - dd) * (a - dd) + 4 * b * c);
      lam1 = (a + dd + disc) / 2;
      lam2 = (a + dd - disc) / 2;
      // u(t) = P1 e^(lam1 t) + P2 e^(lam2 t)
      P1 = [((a - lam2) * u0[0] + b * u0[1]) / disc, (c * u0[0] + (dd - lam2) * u0[1]) / disc];
      P2 = [u0[0] - P1[0], u0[1] - P1[1]];
    } else {
      lam1 = a; lam2 = dd;
      P1 = [u0[0], 0]; P2 = [0, u0[1]];
    }
    var S0 = C1 * Math.log(o.T1 + 273.15) + C2 * Math.log(o.T2 + 273.15);
    function at(t) {
      var e1 = Math.exp(lam1 * t), e2 = Math.exp(lam2 * t);
      var I1 = integ(lam1, t), I2 = integ(lam2, t);
      var u1 = P1[0] * e1 + P2[0] * e2, u2 = P1[1] * e1 + P2[1] * e2;
      var T1 = room + u1, T2 = room + u2;
      var q12 = G * ((P1[0] - P1[1]) * I1 + (P2[0] - P2[1]) * I2);
      var leak1J = g1 * (P1[0] * I1 + P2[0] * I2);
      var leak2J = g2 * (P1[1] * I1 + P2[1] * I2);
      var S = C1 * Math.log(T1 + 273.15) + C2 * Math.log(T2 + 273.15);
      var Sroom = (leak1J + leak2J) / roomK;
      return {
        t: t, T1: T1, T2: T2, q12J: q12, leak1J: leak1J, leak2J: leak2J,
        S: S, dS: S - S0, dSroom: Sroom, dStotal: S - S0 + Sroom,
        energyResidualJ: C1 * (T1 - o.T1) + C2 * (T2 - o.T2) + leak1J + leak2J
      };
    }
    var tEnd = o.tEnd == null ? 600 : Math.max(0, Number(o.tEnd));
    var steps = Math.max(1, Math.round(o.steps == null ? 60 : o.steps));
    var points = [];
    for (var i = 0; i <= steps; i++) points.push(at(tEnd * i / steps));
    var slow = Math.max(lam1, lam2);
    var fast = Math.min(lam1, lam2);
    return {
      closed: g1 === 0 && g2 === 0,
      Tf: (C1 * o.T1 + C2 * o.T2) / (C1 + C2),
      // the exchange time constant (the faster mode when a leak is present)
      tauS: fast < 0 ? -1 / fast : Infinity,
      leakTauS: (g1 > 0 || g2 > 0) && slow < 0 ? -1 / slow : Infinity,
      at: at,
      points: points
    };
  }
  // Append a plain row to a trial log, keeping only the newest `max` rows.
  function heatLogAppend(log, row, max) {
    var cap = max || HEAT_LOG_MAX;
    var list = Array.isArray(log) ? log.slice() : [];
    list.push(row);
    return list.length > cap ? list.slice(list.length - cap) : list;
  }
  // Calorimetry credit is keyed to the exact scenario, so revealing the model
  // answer and retyping it on the same mix earns nothing.
  function heatMixSignature(sub1Id, m1, t1, sub2Id, m2, t2) {
    return [sub1Id, Number(m1).toFixed(2), Number(t1).toFixed(1), sub2Id, Number(m2).toFixed(2), Number(t2).toFixed(1)].join('|');
  }
  // Seconds as an axis or readout label: 45 s, 2.5 min, 3.2 h.
  function heatTimeLabel(s) {
    if (!isFinite(s)) return '—';
    if (Math.abs(s) < 120) return (Math.abs(s) < 10 && s % 1 ? s.toFixed(1) : Math.round(s)) + ' s';
    if (Math.abs(s) < 7200) return (Math.round(s / 6) / 10) + ' min';
    return (Math.round(s / 360) / 10) + ' h';
  }
  function heatRacePrediction(a, b) {
    var alphaA = heatDiffusivity(a), alphaB = heatDiffusivity(b);
    var faster = alphaA >= alphaB ? a : b;
    var slower = alphaA >= alphaB ? b : a;
    var fastAlpha = Math.max(alphaA, alphaB), slowAlpha = Math.min(alphaA, alphaB);
    return {
      ratio: slowAlpha > 0 ? fastAlpha / slowAlpha : Infinity,
      fasterId: faster.id,
      fasterName: faster.name,
      slowerId: slower.id,
      slowerName: slower.name
    };
  }
  // Auto race speed: the slower bar's finish time (the analytic series above)
  // spread over about 18 s of wall time, rounded UP to two significant
  // figures, so the slower middle always crosses inside ~20 s on screen.
  var HEAT_AUTO_WALL_S = 18;
  function heatAutoTimeScale(slowestS, wallS) {
    var w = wallS > 0 ? wallS : HEAT_AUTO_WALL_S;
    if (!(slowestS > 0) || !isFinite(slowestS)) return HEAT_TIME_SCALES[0];
    var raw = slowestS / w;
    if (raw <= 1) return 1;
    var p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10) - 1);
    return Math.round(Math.ceil(raw / p - 1e-9) * p * 1e6) / 1e6;
  }
  // Finish times repeat across renders (4 a second during a race); cache them.
  var heatReachCache = {};
  function heatMidReachCached(material, hot) {
    var key = material.k + '|' + material.rho + '|' + material.c + '|' + hot;
    if (!(key in heatReachCache)) heatReachCache[key] = heatMidReachTime(material, hot);
    return heatReachCache[key];
  }
  function heatMixTemperature(sub1, m1, t1, sub2, m2, t2) {
    return (m1 * sub1.c * t1 + m2 * sub2.c * t2) / (m1 * sub1.c + m2 * sub2.c);
  }
  function heatMixExplanation(sub1, m1, t1, sub2, m2, t2) {
    if (Math.abs(t1 - t2) < 1e-9) {
      return __alloT('stem.heatlab.mix_expl_same', 'Both samples start at the same temperature, so there is no net heat flow between them.');
    }
    var capacity1 = m1 * sub1.c, capacity2 = m2 * sub2.c;
    var scale = Math.max(capacity1, capacity2);
    if (scale > 0 && Math.abs(capacity1 - capacity2) / scale < 0.01) {
      return __alloT('stem.heatlab.mix_expl_equal', 'The samples have almost the same total heat capacity (mass × specific heat), so each changes temperature by about the same amount.');
    }
    var steadier = capacity1 > capacity2 ? sub1 : sub2;
    var other = capacity1 > capacity2 ? sub2 : sub1;
    return __alloOneWord(__alloT('stem.heatlab.mix_expl_larger', '{a} has the larger total heat capacity (mass × specific heat), so its temperature changes less while the {b} changes more.')
      .replace('{a}', function () { return steadier.name; }).replace('{b}', function () { return other.name.toLowerCase(); }));
  }
  // One set of water constants feeds the model, the chart's plateau bands and
  // the "Show the numbers" table, so the table can no longer drift from the
  // model (it used to be hand-typed and said 795 / 3,055 kJ for 794.4 / 3,054.4).
  var HEAT_WATER = Object.freeze({ startC: -20, cIce: 2090, lFusion: 334000, cWater: 4186, lVap: 2260000, cSteam: 2010 });
  function heatWaterState(kJ) {
    var W = HEAT_WATER;
    var e = kJ * 1000;
    var warmIce = W.cIce * (0 - W.startC), warmWater = W.cWater * 100;
    if (e < warmIce) return { phase: 'Ice', temp: W.startC + e / W.cIce, frac: 0 };
    e -= warmIce;
    if (e < W.lFusion) return { phase: 'Ice melting', temp: 0, frac: e / W.lFusion };
    e -= W.lFusion;
    if (e < warmWater) return { phase: 'Liquid water', temp: e / W.cWater, frac: 0 };
    e -= warmWater;
    if (e < W.lVap) return { phase: 'Water boiling', temp: 100, frac: e / W.lVap };
    e -= W.lVap;
    return { phase: 'Steam', temp: 100 + e / W.cSteam, frac: 0 };
  }
  // The five stages in kJ for 1 kg, ending at the slider's maximum energy.
  function heatWaterStages(maxKJ) {
    var W = HEAT_WATER;
    var parts = [
      { id: 'ice', kJ: W.cIce * (0 - W.startC) / 1000, fromC: W.startC, toC: 0 },
      { id: 'melt', kJ: W.lFusion / 1000, fromC: 0, toC: 0 },
      { id: 'water', kJ: W.cWater * 100 / 1000, fromC: 0, toC: 100 },
      { id: 'boil', kJ: W.lVap / 1000, fromC: 100, toC: 100 }
    ];
    var total = 0;
    parts.forEach(function (p) { total += p.kJ; p.totalKJ = total; });
    var end = maxKJ == null ? total : maxKJ;
    if (end > total) parts.push({ id: 'steam', kJ: end - total, totalKJ: end, fromC: 100, toC: heatWaterState(end).temp });
    return parts;
  }
  function heatCoolingTemperature(material, mm, minutes) {
    // Exact Newton cooling for a 350 ml mug at 90 C in a 20 C room. Using the
    // analytical exponential keeps the result independent of an arbitrary
    // one-minute integration step, while the wrap and outside air film remain
    // resistances in series.
    var conductivity = material && Number(material.k);
    if (!(conductivity > 0)) return NaN;
    var area = 0.045;                       // m^2 of mug wall
    var rWrap = (Math.max(0, Number(mm) || 0) / 1000) / conductivity;
    var rSurface = 0.12;
    var conductance = area / (rWrap + rSurface); // W/K
    var heatCapacity = 0.35 * 4186;         // J/K
    var seconds = Math.max(0, Number(minutes) || 0) * 60;
    return 20 + (90 - 20) * Math.exp(-(conductance * seconds) / heatCapacity);
  }
  function heatCoolingCurve(material, mm, totalMinutes) {
    var end = totalMinutes == null ? 60 : Math.max(0, Math.floor(totalMinutes));
    var points = [];
    for (var minute = 0; minute <= end; minute++) {
      points.push(heatCoolingTemperature(material, mm, minute));
    }
    return points;
  }
  var HEAT_SIGMA = 5.670374419e-8;
  function heatRadiationModel(surfaceC, roomC, area, emissivity) {
    var surfaceK = Number(surfaceC) + 273.15;
    var roomK = Number(roomC) + 273.15;
    var a = area == null ? 1.8 : Number(area);
    var eps = emissivity == null ? 0.98 : Number(emissivity);
    if (!(surfaceK > 0) || !(roomK > 0) || !(a >= 0) || !(eps >= 0 && eps <= 1)) {
      return { valid: false, emittedW: NaN, absorbedW: NaN, netToRoomW: NaN, peakUm: NaN };
    }
    var scale = eps * HEAT_SIGMA * a;
    var emittedW = scale * Math.pow(surfaceK, 4);
    var absorbedW = scale * Math.pow(roomK, 4);
    return {
      valid: true,
      emittedW: emittedW,
      absorbedW: absorbedW,
      // Positive means the surface warms the room; negative means the room
      // radiatively warms the colder surface. Keeping the sign prevents a cold
      // object from being described as sending a negative amount into the room.
      netToRoomW: emittedW - absorbedW,
      peakUm: 2897.771955 / surfaceK
    };
  }
  function heatPumpModel(outdoorC, indoorC) {
    var liftK = indoorC - outdoorC;
    if (!isFinite(liftK) || liftK <= 0) {
      return { heating: false, liftK: liftK, idealCOP: null, realisticCOP: null, equipmentLiftK: null };
    }
    var hotK = indoorC + 273.15;
    var idealCOP = hotK / liftK;
    // A real heat pump never exchanges heat at the room and outdoor-air
    // temperatures themselves. The refrigerant must run colder than the source
    // and hotter than the sink, fans/pumps consume power, and cold coils defrost.
    // This remains a transparent teaching estimate, not a product rating.
    var sourceApproachK = 5;
    var sinkApproachK = 8;
    var equipmentHotK = hotK + sinkApproachK;
    var equipmentColdK = outdoorC + 273.15 - sourceApproachK;
    var equipmentLiftK = equipmentHotK - equipmentColdK;
    var cycleCOP = (equipmentHotK / equipmentLiftK) * 0.45;
    var defrostFactor = outdoorC < 7 ? clamp(0.78 + (outdoorC + 20) * 0.008, 0.72, 0.98) : 1;
    var auxiliaryPowerFactor = 1.18;
    var realisticCOP = clamp((cycleCOP * defrostFactor) / auxiliaryPowerFactor, 1, 8);
    return {
      heating: true,
      liftK: liftK,
      idealCOP: idealCOP,
      realisticCOP: realisticCOP,
      equipmentLiftK: equipmentLiftK,
      sourceApproachK: sourceApproachK,
      sinkApproachK: sinkApproachK,
      defrostFactor: defrostFactor,
      practicalCap: 8
    };
  }
  // Keep the chart domain beside the model it visualises. The outdoor control
  // reaches 20 C and the teaching estimate is capped at 8, so a narrower plot
  // silently placed valid selected points beyond its axes.
  var HEAT_PUMP_CHART_DOMAIN = Object.freeze({
    xMin: -20,
    xMax: 20,
    yMin: 0,
    yMax: 8.5
  });
  // Time constant of the mug model, tau = C (L/k + R_film) / A, in seconds.
  function heatMugTimeConstantS(material, mm) {
    return 0.35 * 4186 * ((Math.max(0, Number(mm) || 0) / 1000) / material.k + 0.12) / 0.045;
  }
  // Outer surface of the mug wrap: the wrap and the air film are resistances
  // in series, so the surface sits R_film / (R_wrap + R_film) of the way from
  // the room up to the tea. This is what a thermal camera actually sees.
  function heatMugSurfaceC(material, mm, teaC) {
    var rWrap = (Math.max(0, Number(mm) || 0) / 1000) / material.k;
    return HEAT_COLD_C + (teaC - HEAT_COLD_C) * 0.12 / (rWrap + 0.12);
  }

  // ── Stage B models: particles, touch test, thermal camera, notebook ──
  var HEAT_R_GAS = 8.314462618;          // J/mol K
  var HEAT_AVOGADRO = 6.02214076e23;
  var HEAT_BOLTZMANN = 1.380649e-23;     // J/K
  var HEAT_LENS_MAX = 150;               // particles per zoom lens
  // Mass of one particle, as kg per mole: the atom in a metal, the molecule in
  // a liquid, the average atom in a network solid (glass, sand, wood).
  var HEAT_MOLAR_MASS = {
    water: 0.018015, copper: 0.063546, aluminium: 0.026982, alum: 0.026982,
    steel: 0.055845, iron: 0.055845, ethanol: 0.046069, oil: 0.8853,
    glass: 0.020028, sand: 0.020028, fibre: 0.020028, aerogel: 0.020028, wood: 0.00772
  };
  var HEAT_LIQUIDS = { water: true, oil: true, ethanol: true };
  function heatKelvin(c) { return Number(c) + 273.15; }
  // Equipartition: every particle carries 3/2 kT of kinetic energy on average
  // (translation in a fluid, vibration in a solid), so v_rms = sqrt(3RT/M).
  function heatRmsSpeed(tempC, molarMassKg) {
    var T = heatKelvin(tempC), M = Number(molarMassKg);
    if (!(T > 0) || !(M > 0)) return NaN;
    return Math.sqrt(3 * HEAT_R_GAS * T / M);
  }
  // Speed relative to the same particles at refC: sqrt(T / Tref) in kelvin.
  function heatSpeedRatio(tempC, refC) {
    var a = heatKelvin(tempC), b = heatKelvin(refC == null ? HEAT_COLD_C : refC);
    return a > 0 && b > 0 ? Math.sqrt(a / b) : NaN;
  }
  function heatMeanKineticJ(tempC) { return 1.5 * HEAT_BOLTZMANN * heatKelvin(tempC); }
  // Maxwell-Boltzmann distributions: speed (per m/s) and kinetic energy (per J).
  function heatMaxwellSpeedPdf(v, tempC, molarMassKg) {
    var T = heatKelvin(tempC), m = Number(molarMassKg) / HEAT_AVOGADRO;
    var a = m / (2 * HEAT_BOLTZMANN * T);
    if (!(v >= 0) || !(a > 0) || !isFinite(a)) return 0;
    return 4 * Math.PI * Math.pow(a / Math.PI, 1.5) * v * v * Math.exp(-a * v * v);
  }
  function heatMaxwellEnergyPdf(E, tempC) {
    var kT = HEAT_BOLTZMANN * heatKelvin(tempC);
    if (!(E >= 0) || !(kT > 0)) return 0;
    return 2 * Math.sqrt(E / Math.PI) * Math.pow(kT, -1.5) * Math.exp(-E / kT);
  }
  // Molecules freed during a change of state of `massKg` of a substance
  // (water unless `sub` names one of HEAT_PHASE_SUBS), after a fraction
  // `frac` of the plateau. Each one costs L M / N_A of bond energy.
  function heatPhaseChangeCount(kind, frac, massKg, sub) {
    var S = sub == null ? null : heatPhaseSub(sub);
    var M = S ? S.M : HEAT_MOLAR_MASS.water, mass = massKg == null ? 1 : Number(massKg);
    var L = S ? ((kind === 'boil' ? S.lV : S.lF) || 0) : (kind === 'boil' ? HEAT_WATER.lVap : HEAT_WATER.lFusion);
    var f = clamp(Number(frac) || 0, 0, 1);
    var total = mass / M * HEAT_AVOGADRO;
    return { total: total, freed: f * total, kJ: f * L * mass / 1000, perMoleculeJ: L * M / HEAT_AVOGADRO, perMoleKJ: L * M / 1000 };
  }
  // Deterministic generator (mulberry32), so a lens draws the same frame
  // every time and under reduced motion.
  function heatRng(seed) {
    var s = (Number(seed) >>> 0) || 1;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var x = s;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Up to 150 particles with a start position, two phase angles and a speed
  // factor drawn from the 3-D Maxwell distribution, scaled so the rms is 1.
  function heatLensParticles(n, seed) {
    var N = clamp(Math.round(Number(n) || 0), 0, HEAT_LENS_MAX);
    var r = heatRng(seed || 7), out = [], sum2 = 0, i, k;
    var gauss = function () { var u = Math.max(1e-12, r()), w = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * w); };
    for (i = 0; i < N; i++) {
      var s2 = 0;
      for (k = 0; k < 3; k++) { var g = gauss(); s2 += g * g; }
      out.push({ hx: r(), hy: r(), ang: r() * 2 * Math.PI, ph: r() * 2 * Math.PI, spd: Math.sqrt(s2) });
      sum2 += s2;
    }
    var rms = N ? Math.sqrt(sum2 / N) : 1;
    out.forEach(function (p) { p.spd = p.spd / rms; });
    return out;
  }
  // Touch test. Two semi-infinite bodies suddenly in contact: the interface
  // jumps to Tc = (e1T1 + e2T2)/(e1 + e2) and the heat flux out of the warmer
  // one falls as q(t) = e1 e2 (T1 - T2) / ((e1 + e2) sqrt(pi t)).
  function heatTouchTest(material, opts) {
    var o = opts || {};
    var eSkin = o.skinE == null ? HEAT_SKIN_EFFUSIVITY : Number(o.skinE);
    var Ts = o.skinC == null ? HEAT_SKIN_C : Number(o.skinC);
    var To = o.objectC == null ? HEAT_COLD_C : Number(o.objectC);
    var t = o.seconds == null ? 1 : Math.max(1e-6, Number(o.seconds));
    var area = o.areaM2 == null ? 1e-4 : Number(o.areaM2);
    var e = heatEffusivity(material);
    var eff = eSkin * e / (eSkin + e);
    var flux = eff * (Ts - To) / Math.sqrt(Math.PI * t);
    var heat = 2 * eff * (Ts - To) * Math.sqrt(t / Math.PI);
    return {
      effusivity: e, contactC: heatContactTemperature(eSkin, e, Ts, To), skinDropK: Ts - heatContactTemperature(eSkin, e, Ts, To),
      fluxWm2: flux, fingertipW: flux * area, heatJm2: heat, fingertipJ: heat * area
    };
  }
  // Thermal-camera palettes. Iron-bow runs black, indigo, magenta, red,
  // orange, yellow, white and rises in lightness all the way; the greyscale
  // option carries the same order with no hue at all, for colour-blind users.
  var HEAT_IR_IRONBOW = [
    [0.00, 0x00, 0x00, 0x00],
    [0.18, 0x1e, 0x0a, 0x6e],
    [0.38, 0x8b, 0x10, 0x8f],
    [0.58, 0xd9, 0x32, 0x3a],
    [0.76, 0xf9, 0x8a, 0x10],
    [0.90, 0xfc, 0xd3, 0x35],
    [1.00, 0xff, 0xff, 0xf0]
  ];
  function heatIrColour(f, palette) {
    var x = clamp(Number(f) || 0, 0, 1), i;
    if (palette === 'grey') { var g = Math.round(x * 255); return 'rgb(' + g + ',' + g + ',' + g + ')'; }
    for (i = 1; i < HEAT_IR_IRONBOW.length; i++) {
      if (x <= HEAT_IR_IRONBOW[i][0] || i === HEAT_IR_IRONBOW.length - 1) {
        var a = HEAT_IR_IRONBOW[i - 1], b = HEAT_IR_IRONBOW[i];
        var u = clamp((x - a[0]) / (b[0] - a[0]), 0, 1);
        return 'rgb(' + Math.round(a[1] + (b[1] - a[1]) * u) + ',' + Math.round(a[2] + (b[2] - a[2]) * u) + ',' + Math.round(a[3] + (b[3] - a[3]) * u) + ')';
      }
    }
    return 'rgb(0,0,0)';
  }
  // Layer thicknesses (mm) behind the wall names, so the camera view can draw
  // the wall at its real depth. The R-values themselves stay in WALL_LAYERS.
  var HEAT_WALL_MM = { brick: 100, block: 100, cavity: 50, mineral: 100, pir: 50, plaster: 12, timber: 20, glazing: 24 };
  // Steady temperature through a wall of series resistances (inside film,
  // layers, outside film). Each layer takes a share of the drop equal to its
  // share of the total R. Returns the boundary temperatures and the flux.
  function heatWallProfile(layerRs, insideC, outsideC) {
    var Rs = [WALL_FILM_INSIDE].concat(layerRs || []).concat([WALL_FILM_OUTSIDE]);
    var total = Rs.reduce(function (s, r) { return s + r; }, 0);
    var q = (insideC - outsideC) / total;      // W/m2
    var temps = [insideC], T = insideC;
    Rs.forEach(function (r) { T -= q * r; temps.push(T); });
    return { fluxWm2: q, totalR: total, boundaries: temps, insideSurfaceC: temps[1], outsideSurfaceC: temps[temps.length - 2] };
  }
  // ── Lab notebook helpers: plain rows in, plain values out ──
  var HEAT_LOG_META = ['kind', 'section', 'at'];
  function heatLogKinds(log) {
    var order = [], counts = {};
    (Array.isArray(log) ? log : []).forEach(function (r) {
      var k = r && typeof r.kind === 'string' ? r.kind : 'other';
      if (!counts[k]) { counts[k] = 0; order.push(k); }
      counts[k]++;
    });
    return order.map(function (k) { return { kind: k, count: counts[k] }; });
  }
  function heatLogColumns(rows) {
    var cols = [];
    (rows || []).forEach(function (r) {
      Object.keys(r || {}).forEach(function (k) { if (HEAT_LOG_META.indexOf(k) === -1 && cols.indexOf(k) === -1) cols.push(k); });
    });
    return cols;
  }
  // Columns that can go on a plot: every recorded value a finite number.
  function heatLogNumericColumns(rows) {
    return heatLogColumns(rows).filter(function (k) {
      var seen = 0, ok = true;
      (rows || []).forEach(function (r) {
        var v = r ? r[k] : null;
        if (v == null) return;
        if (typeof v === 'number' && isFinite(v)) seen++; else ok = false;
      });
      return ok && seen > 0;
    });
  }
  // Stable sort of { row, index } pairs; empty cells always sink to the end.
  function heatLogSorted(rows, col, dir) {
    var list = (rows || []).map(function (r, i) { return { row: r, index: i }; });
    if (!col) return list;
    var sgn = dir === 'desc' ? -1 : 1;
    return list.sort(function (a, b) {
      var x = a.row ? a.row[col] : null, y = b.row ? b.row[col] : null;
      if (x == null && y == null) return a.index - b.index;
      if (x == null) return 1;
      if (y == null) return -1;
      var cmp = (typeof x === 'number' && typeof y === 'number') ? x - y : String(x).localeCompare(String(y));
      return cmp ? sgn * cmp : a.index - b.index;
    });
  }
  // RFC 4180 cell. Text that a spreadsheet would run as a formula (= + - @)
  // is prefixed with an apostrophe.
  function heatCsvCell(v) {
    if (v == null) return '';
    if (typeof v === 'number') return isFinite(v) ? String(v) : '';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    var s = String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function heatLogToCsv(rows, columns) {
    var cols = columns || heatLogColumns(rows);
    var lines = [['kind', 'recorded_at'].concat(cols).map(heatCsvCell).join(',')];
    (rows || []).forEach(function (r) {
      var at = r && typeof r.at === 'number' && isFinite(r.at) ? new Date(r.at).toISOString() : '';
      lines.push([r ? r.kind : '', at].concat(cols.map(function (k) { return r ? r[k] : null; })).map(heatCsvCell).join(','));
    });
    return lines.join('\r\n') + '\r\n';
  }

  // ══ Stage C models: convection driver, surfaces, vacuum flask, heating and
  //    cooling curves for four substances, the cooler challenge ══════════

  // Solve f(x) = target for an increasing f on [lo, hi] by bisection.
  function heatBisect(f, target, lo, hi, iters) {
    var a = lo, b = hi;
    for (var i = 0; i < (iters || 80); i++) {
      var m = (a + b) / 2;
      if (f(m) < target) a = m; else b = m;
    }
    return (a + b) / 2;
  }

  // ── Convection with a real driver: a horizontal fluid layer heated from
  //    below (Rayleigh-Bénard). Properties near 20 C, handbook values good to
  //    about 10 %: water and dry air from Incropera & DeWitt, Fundamentals of
  //    Heat and Mass Transfer, Tables A.6 and A.4; olive oil from published
  //    viscosity (about 84 mPa s) and expansion (about 7.2e-4 /K) data.
  //    maxDT: where constant properties stop being honest (water nears boiling,
  //    oil nears smoking, air's density changes by a fifth). ──
  var HEAT_FLUIDS = [
    { id: 'water', rho: 998, c: 4182, k: 0.598, nu: 1.004e-6, beta: 2.07e-4, maxDT: 75, M: 0.018015 },
    { id: 'oil', rho: 910, c: 1970, k: 0.17, nu: 9.2e-5, beta: 7.2e-4, maxDT: 150, M: 0.8853 },
    { id: 'air', rho: 1.204, c: 1007, k: 0.02514, nu: 1.516e-5, beta: 3.41e-3, maxDT: 60, M: 0.02897 }
  ];
  var HEAT_GRAVITY = 9.81;
  // Onset of convection between rigid plates (Chandrasekhar 1961).
  var HEAT_RA_ONSET = 1708;
  // Steady rolls give way to unsteady rising plumes. The real threshold
  // depends on Pr (Krishnamurti 1970, 1973); 5e4 is the right order for
  // water and air and a teaching simplification for oil.
  var HEAT_RA_PLUMES = 5e4;
  var HEAT_CONV_AREA = 0.01;      // m^2: a 10 cm x 10 cm heater plate
  function heatFluid(id) {
    for (var i = 0; i < HEAT_FLUIDS.length; i++) if (HEAT_FLUIDS[i].id === id) return HEAT_FLUIDS[i];
    return HEAT_FLUIDS[0];
  }
  function heatFluidAlpha(f) { return f.k / (f.rho * f.c); }
  // Ra = g beta dT L^3 / (nu alpha)
  function heatRayleigh(fluid, dT, depthM) {
    var f = typeof fluid === 'object' ? fluid : heatFluid(fluid);
    return HEAT_GRAVITY * f.beta * dT * Math.pow(depthM, 3) / (f.nu * heatFluidAlpha(f));
  }
  // Nusselt number of a horizontal layer heated from below. Below Ra = 1708
  // the fluid cannot move, so Nu = 1 (conduction only). Above it, Nu is the
  // larger of two published correlations, which keeps the curve continuous:
  //   Hollands, Raithby & Konicek (1975), Int. J. Heat Mass Transfer 18, 879:
  //     Nu = 1 + 1.44 [1 - 1708/Ra] + [(Ra/5830)^(1/3) - 1], last term >= 0
  //   Globe & Dropkin (1959), J. Heat Transfer 81, 24 (3e5 < Ra < 7e9):
  //     Nu = 0.069 Ra^(1/3) Pr^0.074
  // Both as quoted in Incropera & DeWitt, section 9.8.
  function heatNusselt(Ra, Pr) {
    if (!(Ra > HEAT_RA_ONSET)) return 1;
    var hollands = 1 + 1.44 * (1 - HEAT_RA_ONSET / Ra) + Math.max(0, Math.cbrt(Ra / 5830) - 1);
    var globe = 0.069 * Math.cbrt(Ra) * Math.pow(Pr, 0.074);
    return Math.max(hollands, globe);
  }
  // Steady state: the heater's power crosses the layer to a top plate held at
  // 20 C (none is lost through the sides). Given the power, find the
  // temperature difference that carries it: P = Nu(Ra(dT)) k A dT / L.
  // Heated from above, warm fluid already sits on top: the layer is stable,
  // nothing moves and Nu = 1 whatever the power.
  // The flow speed uses the buoyancy (free-fall) velocity sqrt(g beta dT L),
  // an upper bound (real bulk flow is several times slower), scaled near
  // onset by sqrt(1 - Ra_c/Ra), the way roll amplitude grows.
  function heatConvectionModel(o) {
    var f = typeof o.fluid === 'object' ? o.fluid : heatFluid(o.fluid);
    var L = o.depthM > 0 ? o.depthM : 0.01;
    var A = o.areaM2 > 0 ? o.areaM2 : HEAT_CONV_AREA;
    var P = Math.max(0, Number(o.powerW) || 0);
    var below = o.from !== 'above';
    var alpha = heatFluidAlpha(f), Pr = f.nu / alpha;
    var nuAt = function (dT) { return below ? heatNusselt(heatRayleigh(f, dT, L), Pr) : 1; };
    var flow = function (dT) { return nuAt(dT) * f.k * A * dT / L; };
    var hi = 1;
    while (flow(hi) < P && hi < 1e7) hi *= 2;
    var dT = P > 0 ? heatBisect(flow, P, 0, hi, 90) : 0;
    var Ra = heatRayleigh(f, dT, L);
    var Nu = nuAt(dT);
    var regime = !below ? 'stable' : Ra < HEAT_RA_ONSET ? 'conduction' : Ra < HEAT_RA_PLUMES ? 'rolls' : 'plumes';
    var dTonset = HEAT_RA_ONSET * f.nu * alpha / (HEAT_GRAVITY * f.beta * Math.pow(L, 3));
    var dTplumes = HEAT_RA_PLUMES * f.nu * alpha / (HEAT_GRAVITY * f.beta * Math.pow(L, 3));
    var freeFall = Math.sqrt(HEAT_GRAVITY * f.beta * Math.max(0, dT) * L);
    var moving = regime === 'rolls' || regime === 'plumes';
    return {
      fluid: f.id, powerW: P, depthM: L, areaM2: A, from: below ? 'below' : 'above',
      dT: dT, baseC: HEAT_COLD_C + (below ? dT : 0), topC: HEAT_COLD_C + (below ? 0 : dT),
      Ra: below ? Ra : -Ra, Nu: Nu, Pr: Pr, regime: regime,
      // what conduction alone would need to carry the same power
      conductionDT: P * L / (f.k * A),
      convectedShare: 1 - 1 / Nu,
      onsetW: below ? f.k * A * dTonset / L : Infinity,
      plumesW: below ? heatNusselt(HEAT_RA_PLUMES, Pr) * f.k * A * dTplumes / L : Infinity,
      freeFallMs: freeFall,
      speedMs: moving ? freeFall * Math.sqrt(Math.max(0, 1 - HEAT_RA_ONSET / Ra)) : 0,
      valid: dT <= f.maxDT
    };
  }

  // ── Surfaces: emissivity is absorptivity, band by band (Kirchhoff).
  //    eps: thermal infrared (about 5-50 µm); aSun: sunlight (0.3-2.5 µm).
  //    White paint absorbs little sunlight yet radiates like black in the
  //    infrared. Typical values, Incropera & DeWitt Table A.12 and ASHRAE
  //    Fundamentals ch. 4; real finishes vary with age and dirt. Skin has no
  //    single solar value (it depends on skin tone), so it sits out the sun
  //    comparison. ──
  var HEAT_SURFACES = [
    { id: 'skin', eps: 0.98, aSun: null },
    { id: 'black', eps: 0.95, aSun: 0.95 },
    { id: 'white', eps: 0.90, aSun: 0.20 },
    { id: 'brick', eps: 0.93, aSun: 0.63 },
    { id: 'foil', eps: 0.05, aSun: 0.15 },
    { id: 'silver', eps: 0.03, aSun: 0.07 }
  ];
  function heatSurface(id) {
    for (var i = 0; i < HEAT_SURFACES.length; i++) if (HEAT_SURFACES[i].id === id) return HEAT_SURFACES[i];
    return HEAT_SURFACES[0];
  }
  // A flat panel in full sun with an insulated back: it settles where the
  // sunlight it absorbs equals what it radiates plus what the air carries off,
  //   aSun G = eps sigma (T^4 - Tair^4) + h (T - Tair).
  // Radiation is exchanged with surroundings at the air temperature (a clear
  // sky would be colder); h = 10 W/m2K is a light breeze.
  function heatSurfaceSun(surface, opts) {
    var s = typeof surface === 'object' ? surface : heatSurface(surface);
    var o = opts || {};
    var G = o.solarWm2 == null ? 800 : Number(o.solarWm2);
    var air = o.airC == null ? 30 : Number(o.airC);
    var hc = o.h == null ? 10 : Number(o.h);
    var aK = heatKelvin(air);
    var absorbed = (s.aSun || 0) * G;
    var loss = function (T) { var K = heatKelvin(T); return s.eps * HEAT_SIGMA * (Math.pow(K, 4) - Math.pow(aK, 4)) + hc * (T - air); };
    var eqC = absorbed > 0 ? heatBisect(loss, absorbed, air, air + 400, 80) : air;
    var at = o.compareC == null ? 40 : Number(o.compareC);
    return {
      absorbedWm2: absorbed, reflectedWm2: G - absorbed, eqC: eqC,
      radiatedAtEqWm2: s.eps * HEAT_SIGMA * (Math.pow(heatKelvin(eqC), 4) - Math.pow(aK, 4)),
      convectedAtEqWm2: hc * (eqC - air),
      emittedAtWm2: s.eps * HEAT_SIGMA * Math.pow(heatKelvin(at), 4)
    };
  }

  // ── Vacuum flask builder: 0.5 kg of coffee at 90 C in a 20 C room.
  //    Heat leaves by four parallel paths: gas in the 5 mm gap between the
  //    walls (conduction; too narrow to convect) and radiation across that
  //    gap, both in series with the outer wall's air film; the thin glass
  //    neck that joins the two walls; and the top (a cork stopper, or an open
  //    mouth losing heat by convection and evaporation). Radiation between two
  //    facing surfaces: q = sigma A (T1^4 - T2^4) / (1/e1 + 1/e2 - 1).
  //    Geometry and the open-mouth figure are rough; the comparison between
  //    the eight builds is the point. ──
  var HEAT_FLASK = Object.freeze({
    massKg: 0.5, startC: 90, roomC: 20,
    areaM2: 0.045,       // inner wall, a 0.5 l flask
    gapM: 0.005, kAir: 0.026,
    epsGlass: 0.9, epsSilver: 0.03,
    hOut: 10, areaOutM2: 0.05,
    neckG: 0.011,        // W/K: glass neck, k 1.0 W/mK, 3.3 cm^2 ring, 3 cm long
    stopperG: 0.002,     // W/K: cork, k 0.05 W/mK, 12.6 cm^2, 3 cm thick
    openG: 0.075         // W/K: open mouth, about 60 W/m2K over 12.6 cm^2 (mostly evaporation)
  });
  function heatFlaskPaths(coffeeC, o) {
    var F = HEAT_FLASK, room = F.roomC;
    var gasG = o.vacuum ? 0 : F.kAir * F.areaM2 / F.gapM;
    var eps = o.silver ? F.epsSilver : F.epsGlass;
    var radF = HEAT_SIGMA * F.areaM2 / (2 / eps - 1);
    var Tc = heatKelvin(coffeeC);
    var gap = function (outerC) { return gasG * (coffeeC - outerC) + radF * (Math.pow(Tc, 4) - Math.pow(heatKelvin(outerC), 4)); };
    var outG = F.hOut * F.areaOutM2;
    // the outer wall settles where the gap delivers what its air film removes
    var outerC = coffeeC > room
      ? heatBisect(function (x) { return outG * (x - room) - gap(x); }, 0, room, coffeeC, 60)
      : room;
    var gasW = gasG * (coffeeC - outerC);
    var radW = radF * (Math.pow(Tc, 4) - Math.pow(heatKelvin(outerC), 4));
    var neckW = F.neckG * (coffeeC - room);
    var topW = (o.stopper ? F.stopperG : F.openG) * (coffeeC - room);
    return { gasW: gasW, radW: radW, neckW: neckW, topW: topW, outerC: outerC, totalW: gasW + radW + neckW + topW };
  }
  // Explicit steps; each path's energy is summed from the same fluxes the
  // step uses, so energy out = C (T0 - T) closes to rounding error.
  function heatFlaskModel(opts) {
    var o = opts || {};
    var F = HEAT_FLASK;
    var hours = o.hours == null ? 12 : Number(o.hours);
    var dt = o.dtS == null ? 20 : Number(o.dtS);
    var C = F.massKg * 4186;
    var T = F.startC, t = 0, n = Math.round(hours * 3600 / dt);
    var E = { gas: 0, rad: 0, neck: 0, top: 0 };
    var points = [[0, T]], to60 = null, every = Math.max(1, Math.round(600 / dt));
    var start = heatFlaskPaths(T, o);
    for (var i = 1; i <= n; i++) {
      var p = heatFlaskPaths(T, o);
      E.gas += p.gasW * dt; E.rad += p.radW * dt; E.neck += p.neckW * dt; E.top += p.topW * dt;
      var next = T - p.totalW * dt / C;
      if (to60 === null && T > 60 && next <= 60) to60 = t + dt * (T - 60) / (T - next);
      T = next; t += dt;
      if (i % every === 0 || i === n) points.push([t / 3600, T]);
    }
    var outJ = E.gas + E.rad + E.neck + E.top;
    return {
      start: start, endC: T, hours: hours, points: points, energyJ: E, outJ: outJ,
      storedDropJ: C * (F.startC - T), residualJ: outJ - C * (F.startC - T),
      to60S: to60 === null ? Infinity : to60,
      at6hC: (function () { for (var k = 0; k < points.length; k++) if (points[k][0] >= 6 - 1e-9) return points[k][1]; return T; })()
    };
  }

  // ── Heating and cooling curves for four substances. Per kilogram, rounded
  //    from the CRC Handbook of Chemistry and Physics and the NIST Chemistry
  //    WebBook:
  //    water: the HEAT_WATER constants above (one source for both views).
  //    ethanol: melts -114.1 C, boils 78.4 C; c solid about 1.6 kJ/kgK (Cp near
  //      75 J/mol K at 150 K), liquid 2.44, vapour about 1.7; fusion 4.93
  //      kJ/mol = 107 kJ/kg; vaporisation 38.56 kJ/mol at the boiling point
  //      = 837 kJ/kg.
  //    paraffin (candle) wax: a mixture, so a range: melts near 58 C (46-68),
  //      fusion about 210 kJ/kg (180-240), c about 2.14 solid and 2.9 liquid;
  //      it smokes and decomposes long before boiling, so the curve stops at
  //      150 C. M: n-pentacosane, C25H52, a typical wax molecule.
  //    lead: melts 327.5 C, boils 1749 C (off this chart); c solid 0.129,
  //      liquid about 0.147 kJ/kgK; fusion 4.77 kJ/mol = 23.0 kJ/kg.
  //    cool: a 50 g sample in a test tube losing G (T - env) watts: water in an
  //    ice-salt bath, ethanol in liquid nitrogen, wax and lead in room air or a
  //    water bath. G values are typical of such a tube, not measured. ──
  var HEAT_PHASE_SUBS = [
    { id: 'water', startC: HEAT_WATER.startC, mpC: 0, bpC: 100, cS: HEAT_WATER.cIce, lF: HEAT_WATER.lFusion, cL: HEAT_WATER.cWater, lV: HEAT_WATER.lVap, cG: HEAT_WATER.cSteam, M: 0.018015, endC: 125,
      cool: { massKg: 0.05, startC: 20, envC: -20, G: 0.2 }, supercool: true },
    { id: 'ethanol', startC: -130, mpC: -114.1, bpC: 78.4, cS: 1600, lF: 107000, cL: 2440, lV: 837000, cG: 1700, M: 0.046069, endC: 110,
      cool: { massKg: 0.05, startC: 20, envC: -196, G: 0.05 } },
    { id: 'wax', startC: 20, mpC: 58, bpC: null, cS: 2140, lF: 210000, cL: 2900, lV: null, cG: null, M: 0.3527, endC: 150,
      cool: { massKg: 0.05, startC: 90, envC: 20, G: 0.15 } },
    { id: 'lead', startC: 20, mpC: 327.5, bpC: null, cS: 129, lF: 23000, cL: 147, lV: null, cG: null, M: 0.2072, endC: 500,
      cool: { massKg: 0.05, startC: 400, envC: 20, G: 0.1 } }
  ];
  function heatPhaseSub(id) {
    if (id && typeof id === 'object') return id;
    for (var i = 0; i < HEAT_PHASE_SUBS.length; i++) if (HEAT_PHASE_SUBS[i].id === id) return HEAT_PHASE_SUBS[i];
    return HEAT_PHASE_SUBS[0];
  }
  // The stages for 1 kg from the start temperature to endC, in J.
  function heatPhaseStages(subId) {
    var s = heatPhaseSub(subId);
    var parts = [{ id: 'solid', J: s.cS * (s.mpC - s.startC), fromC: s.startC, toC: s.mpC },
      { id: 'melt', J: s.lF, fromC: s.mpC, toC: s.mpC }];
    if (s.bpC != null) {
      parts.push({ id: 'liquid', J: s.cL * (s.bpC - s.mpC), fromC: s.mpC, toC: s.bpC });
      parts.push({ id: 'boil', J: s.lV, fromC: s.bpC, toC: s.bpC });
      parts.push({ id: 'gas', J: s.cG * (s.endC - s.bpC), fromC: s.bpC, toC: s.endC });
    } else {
      parts.push({ id: 'liquid', J: s.cL * (s.endC - s.mpC), fromC: s.mpC, toC: s.endC });
    }
    var total = 0;
    parts.forEach(function (p) { p.startJ = total; total += p.J; p.totalJ = total; });
    return parts;
  }
  // State of 1 kg after `joules` have gone in (same shape as heatWaterState,
  // which it reproduces exactly for water).
  function heatPhaseState(subId, joules) {
    var s = heatPhaseSub(subId);
    var e = Math.max(0, Number(joules) || 0);
    var stages = heatPhaseStages(s);
    for (var i = 0; i < stages.length; i++) {
      var p = stages[i];
      var last = i === stages.length - 1;
      if (e < p.totalJ || last) {
        var into = e - p.startJ;
        if (p.id === 'melt' || p.id === 'boil') return { phase: p.id === 'melt' ? 'melting' : 'boiling', temp: p.fromC, frac: clamp(into / p.J, 0, 1) };
        var c = p.id === 'solid' ? s.cS : p.id === 'liquid' ? s.cL : s.cG;
        return { phase: p.id, temp: p.fromC + into / c, frac: 0 };
      }
    }
    return { phase: 'solid', temp: s.startC, frac: 0 };
  }
  // Heating with an ideal heater (every joule into the sample, none lost):
  // the time axis is just energy / power.
  function heatPhaseHeating(subId, powerW, massKg) {
    var s = heatPhaseSub(subId);
    var m = massKg > 0 ? massKg : 1, P = powerW > 0 ? powerW : 1000;
    var stages = heatPhaseStages(s).map(function (p) {
      return { id: p.id, J: p.J * m, fromC: p.fromC, toC: p.toC, startS: p.startJ * m / P, endS: p.totalJ * m / P };
    });
    var endS = stages[stages.length - 1].endS;
    return {
      stages: stages, endS: endS, powerW: P, massKg: m,
      at: function (sec) { return heatPhaseState(s, clamp(sec, 0, endS) * P / m); }
    };
  }
  // Cooling a liquid sample through its freezing point, closed form. Each
  // sensible stretch is Newton cooling, T = env + (T0 - env) e^(-G t / C); the
  // freezing plateau removes m L at the constant rate G (mp - env).
  // Supercooling (water only): the liquid runs dK below the freezing point
  // before a crystal forms; the latent heat of the ice that forms at once
  // warms it straight back to the freezing point, so that fraction is
  // c_L dK / L, and the rest freezes on the plateau. Energy is unchanged.
  function heatPhaseCooling(subId, opts) {
    var s = heatPhaseSub(subId);
    var o = Object.assign({}, s.cool || {}, opts || {});
    var m = o.massKg, G = o.G, env = o.envC, T0 = o.startC;
    var sc = s.supercool ? clamp(Number(o.supercoolK) || 0, 0, 15) : 0;
    var CL = m * s.cL, CS = m * s.cS;
    var dip = s.mpC - sc;
    var t1 = (CL / G) * Math.log((T0 - env) / (dip - env));
    var f0 = sc > 0 ? Math.min(1, s.cL * sc / s.lF) : 0;
    var plateau = (1 - f0) * m * s.lF / (G * (s.mpC - env));
    var t2 = t1 + plateau;
    var tauS = CS / G;
    var endS = o.endS == null ? t2 + 2.5 * tauS : Number(o.endS);
    function at(sec) {
      var t = Math.max(0, sec);
      if (t < t1 || (t === t1 && sc > 0)) return { phase: 'liquid', temp: env + (T0 - env) * Math.exp(-G * t / CL), frozen: 0 };
      if (t < t2) {
        var removed = G * (s.mpC - env) * (t - t1);
        return { phase: 'freezing', temp: s.mpC, frozen: clamp(f0 + removed / (m * s.lF), 0, 1) };
      }
      return { phase: 'solid', temp: env + (s.mpC - env) * Math.exp(-G * (t - t2) / CS), frozen: 1 };
    }
    return {
      massKg: m, G: G, envC: env, startC: T0, supercoolK: sc, frozenAtOnce: f0,
      freezeStartS: t1, freezeEndS: t2, plateauS: plateau, endS: endS, at: at,
      // heat that has left the sample by time t, from the closed form
      // = the drop in the sample's own energy: sensible heat down to mp plus
      // the latent heat of everything frozen so far (the ice that formed at
      // once was paid for by the supercooling, c_L dK = f0 L)
      heatOutJ: function (sec) {
        var p = at(sec);
        if (p.phase === 'liquid') return CL * (T0 - p.temp);
        var toMp = CL * (T0 - s.mpC);
        if (p.phase === 'freezing') return toMp + p.frozen * m * s.lF;
        return toMp + m * s.lF + CS * (s.mpC - p.temp);
      }
    };
  }

  // ── "Keep it frozen" cooler. A 10 cm cube of inside space holds 200 g of
  //    ice from a -18 C freezer; the car is a steady 30 C. Heat comes in by
  //    two parallel routes: through the walls (inside air film, liner, shell,
  //    outside film of convection plus radiation, all in series) and through
  //    the lid seal (car air swapped with inside air: G = m_dot c_p). Each wall
  //    layer uses the geometric mean of its inner and outer face areas, the
  //    usual thick-wall correction. Outside radiation is linearised,
  //    h_r = 4 eps sigma T^3 at 30 C. The ice is lumped at one temperature and
  //    the box itself stores no heat. ──
  var HEAT_COOLER = Object.freeze({
    iceKg: 0.2, iceStartC: -18, carC: 30, targetH: 4, budget: 12, maxOuterCm: 16,
    innerM: 0.10, hIn: 10, hConvOut: 8, cIce: 2090, lFusion: 334000, cWater: 4186
  });
  var HEAT_COOLER_SHELLS = [
    { id: 'plastic', mm: 2, k: 0.20, cost: 3, eps: 0.9 },     // polypropylene
    { id: 'plywood', mm: 6, k: 0.12, cost: 5, eps: 0.9 },
    { id: 'steel', mm: 1, k: 16, cost: 6, eps: 0.9 }          // painted steel
  ];
  var HEAT_COOLER_LINERS = [
    { id: 'none', k: 0, costPer10: 0 },
    { id: 'eps', k: 0.036, costPer10: 0.8 },     // expanded polystyrene
    { id: 'wool', k: 0.040, costPer10: 1.0 },    // wool felt
    { id: 'cork', k: 0.043, costPer10: 1.5 },
    { id: 'pu', k: 0.025, costPer10: 1.6 },      // polyurethane foam
    { id: 'aerogel', k: 0.015, costPer10: 6 }    // aerogel blanket
  ];
  // Loose lid: 0.06 W/K is about 6e-5 kg/s of car air, some 0.2 m^3 an hour.
  var HEAT_COOLER_SEALS = [
    { id: 'none', G: 0.06, cost: 0 },
    { id: 'foam', G: 0.02, cost: 1 },
    { id: 'gasket', G: 0.005, cost: 3 }
  ];
  var HEAT_COOLER_FOIL = Object.freeze({ cost: 1.5, eps: 0.05 });
  var HEAT_COOLER_MM_MAX = 40;
  function heatPick(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
  }
  function heatCoolerDesign(o) {
    var d = o || {};
    var liner = heatPick(HEAT_COOLER_LINERS, d.liner);
    return {
      shell: heatPick(HEAT_COOLER_SHELLS, d.shell).id,
      liner: liner.id,
      mm: liner.id === 'none' ? 0 : clamp(Math.round((Number(d.mm) || 0) / 5) * 5, 0, HEAT_COOLER_MM_MAX),
      seal: heatPick(HEAT_COOLER_SEALS, d.seal).id,
      foil: !!d.foil
    };
  }
  function heatCoolerModel(design) {
    var C = HEAT_COOLER;
    var dz = heatCoolerDesign(design);
    var sh = heatPick(HEAT_COOLER_SHELLS, dz.shell), ln = heatPick(HEAT_COOLER_LINERS, dz.liner);
    var seal = heatPick(HEAT_COOLER_SEALS, dz.seal);
    var Lln = ln.k > 0 ? dz.mm / 1000 : 0, Lsh = sh.mm / 1000;
    var s0 = C.innerM, s1 = s0 + 2 * Lln, s2 = s1 + 2 * Lsh;
    var eps = dz.foil ? HEAT_COOLER_FOIL.eps : sh.eps;
    var hRad = 4 * eps * HEAT_SIGMA * Math.pow(heatKelvin(C.carC), 3);
    var R = {
      inFilm: 1 / (C.hIn * 6 * s0 * s0),
      liner: Lln > 0 ? Lln / (ln.k * 6 * s0 * s1) : 0,
      shell: Lsh / (sh.k * 6 * s1 * s2),
      outFilm: 1 / ((C.hConvOut + hRad) * 6 * s2 * s2)
    };
    var Rsum = R.inFilm + R.liner + R.shell + R.outFilm;
    var Gwall = 1 / Rsum, G = Gwall + seal.G;
    var Cice = C.iceKg * C.cIce;
    var warmS = (Cice / G) * Math.log((C.carC - C.iceStartC) / (C.carC - 0));
    var meltJ = C.iceKg * C.lFusion;
    var meltS = warmS + meltJ / (G * C.carC);
    var cost = sh.cost + ln.costPer10 * dz.mm / 10 + seal.cost + (dz.foil ? HEAT_COOLER_FOIL.cost : 0);
    var outerCm = s2 * 100;
    var meltH = meltS / 3600;
    function at(sec) {
      var t = Math.max(0, sec);
      if (t < warmS) return { phase: 'ice', temp: C.carC - (C.carC - C.iceStartC) * Math.exp(-G * t / Cice), iceFrac: 1 };
      if (t < meltS) return { phase: 'melting', temp: 0, iceFrac: 1 - G * C.carC * (t - warmS) / meltJ };
      return { phase: 'water', temp: C.carC - C.carC * Math.exp(-G * (t - meltS) / (C.iceKg * C.cWater)), iceFrac: 0 };
    }
    return {
      design: dz, R: R, Rsum: Rsum, Gwall: Gwall, Gseal: seal.G, G: G, hRad: hRad,
      tauS: Cice / G, warmS: warmS, meltS: meltS, meltH: meltH,
      sensibleJ: Cice * (0 - C.iceStartC), meltJ: meltJ,
      wallW: Gwall * C.carC, sealW: seal.G * C.carC,
      cost: Math.round(cost * 100) / 100, outerCm: outerCm,
      meetsTime: meltH >= C.targetH, meetsBudget: cost <= C.budget + 1e-9, meetsSize: outerCm <= C.maxOuterCm + 1e-9,
      meets: meltH >= C.targetH && cost <= C.budget + 1e-9 && outerCm <= C.maxOuterCm + 1e-9,
      at: at
    };
  }
  // Every single change to a design that makes the ice last longer, best
  // first, with what it costs and whether it still fits the brief.
  function heatCoolerUpgrades(design) {
    var base = heatCoolerModel(design), dz = base.design, out = [];
    var tryOne = function (kind, id, patch) {
      var m = heatCoolerModel(Object.assign({}, dz, patch));
      var gain = m.meltH - base.meltH;
      if (gain > 0.01) out.push({ kind: kind, id: id, design: m.design, gainH: gain, meltH: m.meltH, extraCost: m.cost - base.cost, cost: m.cost, fitsBudget: m.meetsBudget, fitsSize: m.meetsSize });
    };
    if (dz.liner !== 'none' && dz.mm < HEAT_COOLER_MM_MAX) tryOne('thicker', String(dz.mm + 5), { mm: dz.mm + 5 });
    HEAT_COOLER_LINERS.forEach(function (l) { if (l.id !== dz.liner && l.id !== 'none') tryOne('liner', l.id, { liner: l.id, mm: dz.mm || 10 }); });
    HEAT_COOLER_SEALS.forEach(function (s) { if (s.id !== dz.seal) tryOne('seal', s.id, { seal: s.id }); });
    if (!dz.foil) tryOne('foil', 'on', { foil: true });
    HEAT_COOLER_SHELLS.forEach(function (s) { if (s.id !== dz.shell) tryOne('shell', s.id, { shell: s.id }); });
    return out.sort(function (a, b) { return b.gainH - a.gainH; });
  }

  // ── Stage D: passive house designer (P3-2) ──────────────────────────
  // A one-storey 10 m x 10 m house (100 m² floor, 2.6 m walls, 260 m³ air).
  // Monthly method, after EN ISO 13790:2008 section 12:
  //   loss_m  = (UA + H_vent) x HDD_m x 24 / 1000          kWh
  //   gain_m  = sum over windows of A x g x 0.6 x I_orient,m  kWh
  //   need_m  = loss_m - eta_m x gain_m,  eta = (1 - y^a) / (1 - y^(a+1)),
  //             y = gain / loss, a = 4 (medium thermal mass, a = 1 + 45 h / 15 h)
  // HDD_m = days x max(0, 18.3 - mean_m) (mean-temperature method, base 65 F).
  // The 18.3 C base sits below a 20 C room because people, cooking and
  // appliances supply the last degree or two, so internal gains are not
  // added again. Teaching model: no thermal bridges, no cooling, one zone.
  var HEAT_HOUSE = Object.freeze({
    floorM2: 100, wallGrossM2: 104, roofM2: 100, volumeM3: 260, insideC: 20, baseC: 18.3,
    airWhM3K: 0.335,            // rho c of air: 1.2 kg/m³ x 1005 J/kgK / 3600
    freshAch: 0.35,             // healthy minimum fresh air, air changes per hour
    mvhrEff: 0.8, mvhrCost: 7000, mvhrCo2: 400,
    frameShade: 0.6,            // glass share of the frame x typical shading
    groundFactor: 0.5,          // the ground under a slab stays milder than winter air
    utilA: 4, comfortC: 17,     // Passive House comfort: glass inner face >= 17 C
    priceKWh: 0.25,             // $ per kWh of electricity (teaching value)
    windowMaxM2: 60,
    brief: Object.freeze({ climate: 'cold', kwhM2: 50, budget: 45000, co2: 13000 })
  });
  var HEAT_HOUSE_DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  // Monthly mean air temperature normals, 1991-2020 (°C):
  //  cold: Portland, Maine (NOAA NCEI 1991-2020 monthly normals, station
  //        USW00014764, MLY-TAVG-NORMAL, converted from °F). NCEI's own
  //        HDD normals (MLY-HTDD-NORMAL) sum to 6,795 °F·d = 3,775 K·d; the
  //        mean-temperature method here gives 3,686 K·d, 2.4 % lower.
  //  temperate: London Heathrow (Met Office 1991-2020 averages).
  //  mild: San Francisco Downtown (NOAA NCEI 1991-2020 normals, USW00023272).
  // southKWh: sunlight on a south-facing vertical window, kWh/m² per month.
  // These are APPROXIMATE, rounded teaching values (not one published data
  // set); use PVGIS (re.jrc.ec.europa.eu, slope 90°) for a real design.
  var HEAT_CLIMATES = [
    { id: 'cold', meanC: [-4.4, -3.2, 1.2, 7.0, 12.7, 17.9, 21.3, 20.7, 16.4, 10.2, 4.4, -0.9],
      southKWh: [85, 95, 100, 80, 75, 70, 75, 80, 90, 90, 65, 65] },
    { id: 'temperate', meanC: [5.6, 5.8, 7.9, 10.5, 13.7, 16.8, 19.0, 18.7, 15.9, 12.3, 8.4, 5.9],
      southKWh: [30, 45, 65, 75, 80, 75, 80, 80, 75, 60, 35, 25] },
    { id: 'mild', meanC: [11.2, 12.3, 13.1, 13.6, 14.3, 15.4, 15.7, 16.5, 17.2, 16.7, 14.0, 11.4],
      southKWh: [95, 95, 100, 85, 70, 60, 65, 75, 95, 110, 100, 95] }
  ];
  // Heating-season sunlight on other walls, as a share of the south wall's.
  var HEAT_HOUSE_ORIENT = Object.freeze({ S: 1, E: 0.55, W: 0.55, N: 0.3 });
  // Cost ($ per m² of wall) and embodied carbon (kg CO2e per m²) of each
  // section-3 wall layer: rough teaching values in the range of the ICE
  // database (Univ. of Bath / Circular Ecology), not quotes.
  var HEAT_HOUSE_LAYER_COST = {
    brick: { cost: 60, co2: 45 }, block: { cost: 35, co2: 20 }, cavity: { cost: 0, co2: 0 },
    mineral: { cost: 15, co2: 5 }, pir: { cost: 25, co2: 8 }, plaster: { cost: 10, co2: 3 },
    timber: { cost: 15, co2: 3 }, glazing: { cost: 250, co2: 40 }
  };
  var HEAT_HOUSE_WALLS = [
    { id: 'solid', layers: ['brick', 'plaster'] },
    { id: 'cavity', layers: ['brick', 'cavity', 'block', 'plaster'] },
    { id: 'filled', layers: ['brick', 'mineral', 'block', 'plaster'] },
    { id: 'super', layers: ['brick', 'mineral', 'pir', 'block', 'plaster'] }
  ];
  var HEAT_HOUSE_ROOF_MM = [100, 200, 300, 400];        // mineral wool, k = 0.040
  var HEAT_HOUSE_FLOORS = [
    { id: 'none', addR: 0, cost: 0, co2: 0 },
    { id: 'pir100', addR: 0.1 / 0.022, cost: 25, co2: 16 },
    { id: 'pir200', addR: 0.2 / 0.022, cost: 45, co2: 32 }
  ];
  var HEAT_HOUSE_FLOOR_R0 = 1 / 0.75;                   // slab plus ground, uninsulated
  var HEAT_HOUSE_GLAZING = [
    { id: 'single', U: 5.8, g: 0.85, cost: 150, co2: 25 },
    { id: 'double', U: 2.8, g: 0.76, cost: 250, co2: 40 },
    { id: 'lowe', U: 1.4, g: 0.62, cost: 350, co2: 45 },
    { id: 'triple', U: 0.8, g: 0.5, cost: 500, co2: 60 }
  ];
  var HEAT_HOUSE_AIR = [
    { id: 'leaky', ach: 1.0, cost: 0, co2: 0 },
    { id: 'average', ach: 0.6, cost: 500, co2: 50 },
    { id: 'tight', ach: 0.3, cost: 2500, co2: 300 },
    { id: 'passive', ach: 0.1, cost: 5000, co2: 600 }
  ];
  var HEAT_WALL_MAX_LAYERS = 20;
  function heatHouseWallR(layers) {
    var r = WALL_SURFACE_R;
    (layers || []).forEach(function (id) { var L = heatPick(WALL_LAYERS, id); if (L && L.id === id) r += L.r; });
    return r;
  }
  function heatHouseDesign(o) {
    var d = o || {};
    var win = function (v, def) { var n = Number(v); return clamp(Math.round(isFinite(n) ? n : def), 0, 30); };
    // Same cap as the section-3 wall builder, so "My wall" is the wall the
    // learner built (it used to keep only 12 layers of a 16-layer CER wall).
    var mine = Array.isArray(d.mine) ? d.mine.filter(function (id) { return !!HEAT_HOUSE_LAYER_COST[id]; }).slice(0, HEAT_WALL_MAX_LAYERS) : null;
    var known = HEAT_HOUSE_WALLS.some(function (w) { return w.id === d.wall; });
    var wall = d.wall === 'mine' && mine && mine.length ? 'mine' : known ? d.wall : 'cavity';
    var roof = HEAT_HOUSE_ROOF_MM.indexOf(Number(d.roofMm)) !== -1 ? Number(d.roofMm) : 100;
    var out = {
      wall: wall, mine: wall === 'mine' ? mine : null, roofMm: roof,
      floor: heatPick(HEAT_HOUSE_FLOORS, d.floor).id,
      glazing: heatPick(HEAT_HOUSE_GLAZING, d.glazing || 'double').id,
      winS: win(d.winS, 8), winE: win(d.winE, 4), winW: win(d.winW, 4), winN: win(d.winN, 4),
      air: heatPick(HEAT_HOUSE_AIR, d.air || 'average').id,
      mvhr: !!d.mvhr
    };
    return out;
  }
  function heatHouseModel(design, climateId) {
    var H = HEAT_HOUSE, dz = heatHouseDesign(design);
    var clim = heatPick(HEAT_CLIMATES, climateId || H.brief.climate);
    var layers = dz.wall === 'mine' ? dz.mine : heatPick(HEAT_HOUSE_WALLS, dz.wall).layers;
    var winTotal = dz.winS + dz.winE + dz.winW + dz.winN;
    var winScale = winTotal > H.windowMaxM2 ? H.windowMaxM2 / winTotal : 1;
    var win = { S: dz.winS * winScale, E: dz.winE * winScale, W: dz.winW * winScale, N: dz.winN * winScale };
    var winA = win.S + win.E + win.W + win.N;
    var wallA = H.wallGrossM2 - winA;
    var gl = heatPick(HEAT_HOUSE_GLAZING, dz.glazing), fl = heatPick(HEAT_HOUSE_FLOORS, dz.floor);
    var air = heatPick(HEAT_HOUSE_AIR, dz.air);
    var U = {
      wall: 1 / heatHouseWallR(layers),
      roof: 1 / (0.10 + dz.roofMm / 1000 / 0.040),
      floor: 1 / (HEAT_HOUSE_FLOOR_R0 + fl.addR),
      window: gl.U
    };
    var UA = {
      wall: U.wall * wallA, roof: U.roof * H.roofM2,
      floor: U.floor * H.floorM2 * H.groundFactor, window: U.window * winA
    };
    var UAsum = UA.wall + UA.roof + UA.floor + UA.window;
    // Fresh air: infiltration leaks in unrecovered. With heat recovery the
    // fan supplies the healthy minimum through the exchanger; without it, a
    // house tighter than the minimum must be aired through windows.
    var ventAch = dz.mvhr ? air.ach + H.freshAch * (1 - H.mvhrEff) : Math.max(air.ach, H.freshAch);
    var freshAch = dz.mvhr ? air.ach + H.freshAch : Math.max(air.ach, H.freshAch);
    var Hvent = H.airWhM3K * H.volumeM3 * ventAch;
    var Htot = UAsum + Hvent;
    var gArea = (win.S * HEAT_HOUSE_ORIENT.S + win.E * HEAT_HOUSE_ORIENT.E + win.W * HEAT_HOUSE_ORIENT.W + win.N * HEAT_HOUSE_ORIENT.N) * gl.g * H.frameShade;
    var months = clim.meanC.map(function (Tm, i) {
      var hdd = HEAT_HOUSE_DAYS[i] * Math.max(0, H.baseC - Tm);
      var lossKWh = Htot * hdd * 24 / 1000;
      var solarKWh = gArea * clim.southKWh[i];
      var y = lossKWh > 0 ? solarKWh / lossKWh : Infinity;
      var a = H.utilA;
      var eta = lossKWh <= 0 ? 0 : Math.abs(y - 1) < 1e-9 ? a / (a + 1) : (1 - Math.pow(y, a)) / (1 - Math.pow(y, a + 1));
      var usable = eta * solarKWh;
      var needKWh = Math.max(0, lossKWh - usable);
      var hp = heatPumpModel(Tm, H.insideC);
      var cop = hp.heating ? hp.realisticCOP : null;
      return { month: i, meanC: Tm, hdd: hdd, lossKWh: lossKWh, solarKWh: solarKWh, eta: eta, usableKWh: usable,
        needKWh: needKWh, cop: cop, elecKWh: needKWh > 0 && cop ? needKWh / cop : 0 };
    });
    var sum = function (k) { return months.reduce(function (s, m) { return s + m[k]; }, 0); };
    var demandKWh = sum('needKWh'), elecKWh = sum('elecKWh');
    var wallCost = 0, wallCo2 = 0;
    layers.forEach(function (id) { var c = HEAT_HOUSE_LAYER_COST[id]; if (c) { wallCost += c.cost; wallCo2 += c.co2; } });
    var cost = {
      wall: wallCost * wallA, roof: H.roofM2 * (20 + 0.12 * dz.roofMm), floor: fl.cost * H.floorM2,
      window: gl.cost * winA, air: air.cost + (dz.mvhr ? H.mvhrCost : 0)
    };
    var co2 = {
      wall: wallCo2 * wallA, roof: H.roofM2 * (15 + 0.05 * dz.roofMm), floor: fl.co2 * H.floorM2,
      window: gl.co2 * winA, air: air.co2 + (dz.mvhr ? H.mvhrCo2 : 0)
    };
    var costSum = cost.wall + cost.roof + cost.floor + cost.window + cost.air;
    var co2Sum = co2.wall + co2.roof + co2.floor + co2.window + co2.air;
    // Comfort: inner glass face in the coldest month, T_in - U R_si (T_in - T_out).
    var coldC = Math.min.apply(null, clim.meanC);
    var glassC = H.insideC - gl.U * 0.13 * (H.insideC - coldC);
    var kwhM2 = demandKWh / H.floorM2;
    var B = H.brief;
    var res = {
      design: dz, climate: clim.id, layers: layers.slice(), U: U, UA: UA, UAsum: UAsum, ventAch: ventAch, freshAch: freshAch,
      Hvent: Hvent, Htot: Htot, wallA: wallA, winA: winA, gArea: gArea, months: months,
      hdd: sum('hdd'), lossKWh: sum('lossKWh'), solarKWh: sum('solarKWh'), usableKWh: sum('usableKWh'),
      demandKWh: demandKWh, kwhM2: kwhM2, elecKWh: elecKWh, scop: elecKWh > 0 ? demandKWh / elecKWh : null,
      billHP: elecKWh * H.priceKWh, billResist: demandKWh * H.priceKWh,
      cost: cost, costSum: Math.round(costSum), co2: co2, co2Sum: Math.round(co2Sum),
      glassC: glassC, comfortOk: glassC >= H.comfortC - 1e-9, freshOk: freshAch >= H.freshAch - 1e-9,
      meetsDemand: kwhM2 <= B.kwhM2 + 1e-9, meetsBudget: costSum <= B.budget + 1e-9, meetsCo2: co2Sum <= B.co2 + 1e-9
    };
    res.meets = res.meetsDemand && res.meetsBudget && res.meetsCo2 && res.comfortOk && res.freshOk;
    return res;
  }

  // ── Stage D: hearing temperature (P5-2) ──────────────────────────────
  // After stem_tool_physics.js physCurveSonifyPlan: a curve of {x, y} points
  // is swept left to right in a fixed time, here with pitch rising with
  // TEMPERATURE (log frequency, linear in °C between yMin and yMax), so a
  // plateau is a steady tone. Each plateau gets a soft chime where it starts.
  var HEAT_SONIFY = Object.freeze({ fMin: 220, fMax: 880, panMax: 0.8, seconds: 5, startHz: 200, plateauHz: 1320, endHz: 150 });
  function heatPlateaus(pts, tolFrac, minFrac) {
    if (!pts || pts.length < 2) return [];
    var ys = pts.map(function (p) { return p.y; });
    var span = Math.max.apply(null, ys) - Math.min.apply(null, ys);
    // Model plateaus are exactly flat; a tolerance this tight keeps an
    // exponential's slow tail from counting as one.
    var tol = Math.max(1e-9, (tolFrac == null ? 1e-4 : tolFrac) * (span || 1));
    var xs = pts[pts.length - 1].x - pts[0].x;
    var out = [], i = 0;
    while (i < pts.length - 1) {
      var j = i;
      while (j + 1 < pts.length && Math.abs(pts[j + 1].y - pts[i].y) <= tol) j++;
      if (j > i && (pts[j].x - pts[i].x) >= (minFrac == null ? 0.04 : minFrac) * xs) {
        out.push({ x0: pts[i].x, x1: pts[j].x, y: pts[i].y });
        i = j;
      } else i++;
    }
    return out;
  }
  function heatSonifyPlan(points, opts) {
    opts = opts || {};
    if (!Array.isArray(points)) return null;
    var pts = points.map(function (p) { return Array.isArray(p) ? { x: p[0], y: p[1] } : p; })
      .filter(function (p) { return p && isFinite(p.x) && isFinite(p.y); });
    if (pts.length < 2) return null;
    for (var i = 1; i < pts.length; i++) if (pts[i].x < pts[i - 1].x) return null;
    var x0 = pts[0].x, x1 = pts[pts.length - 1].x;
    if (!(x1 > x0)) return null;
    var ys = pts.map(function (p) { return p.y; });
    var yMin = isFinite(opts.yMin) ? opts.yMin : Math.min.apply(null, ys);
    var yMax = isFinite(opts.yMax) ? opts.yMax : Math.max.apply(null, ys);
    if (!(yMax > yMin)) yMax = yMin + 1;
    var S = HEAT_SONIFY, duration = isFinite(opts.seconds) && opts.seconds > 0 ? opts.seconds : S.seconds;
    var ratio = S.fMax / S.fMin;
    var frac = function (x) { return (x - x0) / (x1 - x0); };
    var freqOf = function (y) { return S.fMin * Math.pow(ratio, clamp((y - yMin) / (yMax - yMin), 0, 1)); };
    var samples = [], lastT = -1;
    pts.forEach(function (p) {
      var tt = frac(p.x) * duration;
      if (tt <= lastT) { if (samples.length) samples[samples.length - 1].freq = freqOf(p.y); return; }
      lastT = tt;
      samples.push({ t: tt, freq: freqOf(p.y), pan: S.panMax * (2 * frac(p.x) - 1) });
    });
    var plateaus = heatPlateaus(pts, opts.tolFrac, opts.minFrac);
    var cues = [{ t: 0, kind: 'start', freq: S.startHz }];
    plateaus.forEach(function (pl) { if (frac(pl.x0) > 0.01) cues.push({ t: frac(pl.x0) * duration, kind: 'plateau', freq: S.plateauHz }); });
    cues.push({ t: duration, kind: 'end', freq: S.endHz });
    return Object.freeze({ duration: duration, samples: Object.freeze(samples), cues: Object.freeze(cues), x0: x0, x1: x1,
      yMin: yMin, yMax: yMax, plateaus: plateaus, fAt: freqOf });
  }
  // Schedule a plan on a Web Audio context (after physSonifyPlay). Returns
  // { duration, stop } or null; `onEnd` runs once, at the end or on stop().
  function heatSonifyPlay(plan, ac, onEnd) {
    if (!plan || !ac || typeof ac.createOscillator !== 'function' || typeof ac.createGain !== 'function') return null;
    var nodes = [], ended = false, timer = null;
    function finish() { if (ended) return; ended = true; if (timer) clearTimeout(timer); if (typeof onEnd === 'function') { try { onEnd(); } catch (e) {} } }
    try {
      var t0 = ac.currentTime + 0.06, end = t0 + plan.duration;
      var osc = ac.createOscillator(), gain = ac.createGain();
      var pan = typeof ac.createStereoPanner === 'function' ? ac.createStereoPanner() : null;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(plan.samples[0].freq, t0);
      if (pan) pan.pan.setValueAtTime(plan.samples[0].pan, t0);
      for (var i = 1; i < plan.samples.length; i++) {
        osc.frequency.linearRampToValueAtTime(plan.samples[i].freq, t0 + plan.samples[i].t);
        if (pan) pan.pan.linearRampToValueAtTime(plan.samples[i].pan, t0 + plan.samples[i].t);
      }
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.08, t0 + 0.04);
      gain.gain.setValueAtTime(0.08, Math.max(t0 + 0.05, end - 0.06));
      gain.gain.exponentialRampToValueAtTime(0.0001, end + 0.05);
      osc.connect(gain); if (pan) { gain.connect(pan); pan.connect(ac.destination); } else gain.connect(ac.destination);
      osc.start(t0); osc.stop(end + 0.08);
      nodes.push({ osc: osc, gain: gain });
      plan.cues.forEach(function (c) {
        var o = ac.createOscillator(), g = ac.createGain(), at = t0 + c.t, len = c.kind === 'plateau' ? 0.08 : 0.1;
        o.type = c.kind === 'end' ? 'sawtooth' : c.kind === 'plateau' ? 'triangle' : 'sine';
        o.frequency.setValueAtTime(c.freq, at);
        g.gain.setValueAtTime(0.06, at); g.gain.exponentialRampToValueAtTime(0.001, at + len);
        o.connect(g); g.connect(ac.destination); o.start(at); o.stop(at + len + 0.02); nodes.push({ osc: o, gain: g });
      });
      timer = setTimeout(finish, (plan.duration + 0.4) * 1000);
    } catch (e) { finish(); return null; }
    return { duration: plan.duration, stop: function () {
      if (ended) return;
      nodes.forEach(function (n) { try { n.gain.gain.cancelScheduledValues(0); n.gain.gain.setValueAtTime(0.0001, ac.currentTime); } catch (e) {} try { n.osc.stop(); } catch (e) {} try { n.osc.disconnect(); } catch (e) {} });
      finish();
    } };
  }
  // A ticking thermometer: one tick a second at `loC`, ten a second at `hiC`.
  function heatTickIntervalMs(tempC, loC, hiC) {
    var f = hiC > loC ? clamp((tempC - loC) / (hiC - loC), 0, 1) : 0;
    return 1000 * Math.pow(0.1, f);
  }
  // Numbers behind "Describe this graph": start, end, extremes, the time to
  // close half of the gap to `towards` (when given) and any plateaus.
  function heatDescribeSeries(points, opts) {
    opts = opts || {};
    var pts = (points || []).map(function (p) { return Array.isArray(p) ? { x: p[0], y: p[1] } : p; })
      .filter(function (p) { return p && isFinite(p.x) && isFinite(p.y); });
    if (pts.length < 2) return null;
    var first = pts[0], last = pts[pts.length - 1], lo = first, hi = first;
    pts.forEach(function (p) { if (p.y < lo.y) lo = p; if (p.y > hi.y) hi = p; });
    var halfX = null;
    if (isFinite(opts.towards) && Math.abs(first.y - opts.towards) > 1e-9) {
      var gap0 = first.y - opts.towards;
      for (var i = 1; i < pts.length; i++) {
        var g1 = pts[i - 1].y - opts.towards, g2 = pts[i].y - opts.towards;
        if ((g2 / gap0) <= 0.5) {
          var f = (g1 - gap0 / 2) / ((g1 - g2) || 1);
          halfX = pts[i - 1].x + clamp(f, 0, 1) * (pts[i].x - pts[i - 1].x);
          break;
        }
      }
    }
    return { x0: first.x, y0: first.y, x1: last.x, y1: last.y, minX: lo.x, minY: lo.y, maxX: hi.x, maxY: hi.y,
      rising: last.y > first.y, halfX: halfX, plateaus: heatPlateaus(pts, opts.tolFrac, opts.minFrac) };
  }

  // ── Predict-observe-explain: the eleven targeted misconceptions ──────
  // Built with the host translator at render time so every string has a
  // literal key. `n` is the number used in the 2026-11-03 review.
  function heatMisconceptions(t) {
    return [
      { id: 'heat_is_temperature', n: 1, label: t('stem.heatlab.mis_heat_is_temperature', 'Heat and temperature are the same thing') },
      { id: 'cold_flows', n: 2, label: t('stem.heatlab.mis_cold_flows', '“Cold” is a substance that flows into things') },
      { id: 'metal_colder', n: 3, label: t('stem.heatlab.mis_metal_colder', 'Metal is colder than wood at the same room temperature') },
      { id: 'insulator_makes_heat', n: 4, label: t('stem.heatlab.mis_insulator_makes_heat', 'Insulators make heat or hold “warmth”') },
      { id: 'boiling_keeps_rising', n: 5, label: t('stem.heatlab.mis_boiling_keeps_rising', 'Temperature keeps rising while water boils') },
      { id: 'bubbles_are_air', n: 6, label: t('stem.heatlab.mis_bubbles_are_air', 'The bubbles in boiling water are air') },
      { id: 'dark_attracts_heat', n: 7, label: t('stem.heatlab.mis_dark_attracts_heat', 'Dark colours attract heat') },
      { id: 'heat_rises', n: 8, label: t('stem.heatlab.mis_heat_rises', 'Heat itself rises') },
      { id: 'equilibrium_stops', n: 9, label: t('stem.heatlab.mis_equilibrium_stops', 'At equilibrium heat stops moving') },
      { id: 'bigger_is_hotter', n: 10, label: t('stem.heatlab.mis_bigger_is_hotter', 'A bigger object is hotter') },
      { id: 'insulator_slow_always', n: 11, label: t('stem.heatlab.mis_insulator_slow_always', 'Insulators are slow at everything') }
    ];
  }
  // Each card: a question, options whose wrong answers carry a misconception
  // tag, the section holding the evidence (plus an optional plain-data setup
  // patch for that demo), evidence text computed from the models, and the
  // scientific idea the correct answer uses.
  function heatPoeCards(t) {
    var fmt1 = function (n) { return fmt(n, 1); };
    return [
      { id: 'heatvstemp', answer: 'c', section: 'mixing',
        q: t('stem.heatlab.poe_heatvstemp_q', 'A full bath at 40 °C and a cup of tea at 90 °C. Which statement is right?'),
        options: [
          { id: 'a', text: t('stem.heatlab.poe_heatvstemp_a', 'The tea holds more heat, because it is hotter.'), tag: 'heat_is_temperature' },
          { id: 'b', text: t('stem.heatlab.poe_heatvstemp_b', 'The bath is hotter, because it is bigger.'), tag: 'bigger_is_hotter' },
          { id: 'c', text: t('stem.heatlab.poe_heatvstemp_c', 'The tea is hotter, but the bath holds far more thermal energy.'), tag: null }
        ],
        idea: t('stem.heatlab.poe_heatvstemp_idea', 'Temperature says how hot; thermal energy also depends on how much material there is (Q = mcΔT).'),
        evidence: function () {
          var bath = 100 * 4186 * (40 - 20) / 1000, tea = 0.25 * 4186 * (90 - 20) / 1000;
          return t('stem.heatlab.poe_heatvstemp_ev', 'Energy each gives out cooling to a 20 °C room: 100 kg of bath water, {bath} kJ; 0.25 kg of tea, {tea} kJ. In the mixing demo, 2 kg at 40 °C barely moves while 0.1 kg at 90 °C drops a long way.')
            .replace('{bath}', fmt(bath, 0)).replace('{tea}', fmt(tea, 0));
        },
        setup: { sub1: 'water', m1: 2, t1: 40, sub2: 'water', m2: 0.1, t2: 90, mixEstimateResult: null, mixEstimateRevision: '', mixEstimateReflection: '', mixEstimateReflectionComplete: false },
        explain: t('stem.heatlab.poe_heatvstemp_x', 'The tea is hotter: its particles move faster on average. But the bath has about 400 times more water, so cooling it to room temperature releases over a hundred times more energy.') },
      { id: 'coldflow', answer: 'b', section: 'conduction',
        q: t('stem.heatlab.poe_coldflow_q', 'You hold an ice cube and your hand feels cold. What is actually moving?'),
        options: [
          { id: 'a', text: t('stem.heatlab.poe_coldflow_a', 'Cold flows out of the ice into your hand.'), tag: 'cold_flows' },
          { id: 'b', text: t('stem.heatlab.poe_coldflow_b', 'Heat flows out of your hand into the ice.'), tag: null },
          { id: 'c', text: t('stem.heatlab.poe_coldflow_c', 'Cold flows in and heat flows out, in equal amounts.'), tag: 'cold_flows' }
        ],
        idea: t('stem.heatlab.poe_coldflow_idea', 'Heat flows from the hotter object to the colder one; “cold” is just less thermal energy.'),
        evidence: function () {
          return t('stem.heatlab.poe_coldflow_ev', 'Watch the energy ledger under the bar: energy enters at the hot end and leaves through the cold end. Nothing called “cold” is ever added; the cold end simply receives heat.');
        },
        setup: { mode: 'conduction' },
        explain: t('stem.heatlab.poe_coldflow_x', 'Your hand is warmer than the ice, so energy leaves your hand. The nerves in your skin sense that loss of heat as “cold”. The ice gains exactly the energy your hand loses.') },
      { id: 'insulatorrace', answer: 'b', section: 'conduction',
        q: t('stem.heatlab.poe_insulatorrace_q', 'Race a fibreglass bar against a glass bar, each heated at one end. Whose middle reaches 50 °C first?'),
        options: [
          { id: 'a', text: t('stem.heatlab.poe_insulatorrace_a', 'Glass: fibreglass is the better insulator, so it is slower at everything.'), tag: 'insulator_slow_always' },
          { id: 'b', text: t('stem.heatlab.poe_insulatorrace_b', 'Fibreglass: it stores so little heat that a trickle warms it quickly.'), tag: null },
          { id: 'c', text: t('stem.heatlab.poe_insulatorrace_c', 'They tie, because both are insulators.'), tag: 'insulator_slow_always' }
        ],
        idea: t('stem.heatlab.poe_insulatorrace_idea', 'Diffusivity (k ÷ ρc) sets how fast a material warms up; conductivity k sets how much heat flows through it.'),
        evidence: function () {
          var fib = MATERIALS[6], gl = MATERIALS[3];
          var tf = heatMidReachTime(fib, 200), tg = heatMidReachTime(gl, 200);
          var qf = heatSteadyFlowW(fib, 200), qg = heatSteadyFlowW(gl, 200);
          return t('stem.heatlab.poe_insulatorrace_ev', 'Heat-equation prediction with a 200 °C hot end: fibreglass reaches 50 °C at the middle in {tf}, glass in {tg}. Yet once steady, glass passes {ratio} times more heat than fibreglass.')
            .replace('{tf}', heatTimeLabel(tf)).replace('{tg}', heatTimeLabel(tg)).replace('{ratio}', fmt(qg / qf, 0));
        },
        setup: { mode: 'conduction', raceOn: true, matId: 'fibre', matBId: 'glass', timeScale: 1000, hotEnd: 200 },
        resetRace: true,
        explain: t('stem.heatlab.poe_insulatorrace_x', 'Fibreglass is mostly air, so it has almost no heat capacity per cubic metre. The little heat that gets in warms it fast, so it wins a warming-up race. An insulator’s job is the steady flow, and there fibreglass lets through far less heat than glass.') },
      { id: 'scarf', answer: 'b', section: 'insulation',
        q: t('stem.heatlab.poe_scarf_q', 'On a warm day you wrap a cold can of drink in a wool scarf. After an hour, compared with an unwrapped can, it is…'),
        options: [
          { id: 'a', text: t('stem.heatlab.poe_scarf_a', 'Warmer, because wool makes things warm.'), tag: 'insulator_makes_heat' },
          { id: 'b', text: t('stem.heatlab.poe_scarf_b', 'Colder, because the wool slows heat flowing in, just as it slows heat leaving a hot mug.'), tag: null },
          { id: 'c', text: t('stem.heatlab.poe_scarf_c', 'The same, because insulation only works on hot things.'), tag: 'insulator_makes_heat' }
        ],
        idea: t('stem.heatlab.poe_scarf_idea', 'Insulation does not make warmth; it slows heat flow in either direction.'),
        evidence: function () {
          var slow = heatMugTimeConstantS(MATERIALS[6], 10) / heatMugTimeConstantS(MATERIALS[0], 1);
          return t('stem.heatlab.poe_scarf_ev', 'In the mug model the wrap only changes how fast the gap between the drink and the room closes. 10 mm of fibreglass closes it {x} times more slowly than a bare mug, whichever way the heat is flowing.')
            .replace('{x}', fmt1(slow));
        },
        explain: t('stem.heatlab.poe_scarf_x', 'A coat feels warm because it slows the loss of YOUR body heat. Wrapped round a cold can, the same wool slows the heat flowing in from the warm air, so the drink stays cold for longer.') },
      { id: 'touch', answer: 'c', section: 'touch',
        q: t('stem.heatlab.poe_touch_q', 'A metal spoon and a wooden spoon have both sat in a 20 °C room all night. Which one is colder?'),
        options: [
          { id: 'a', text: t('stem.heatlab.poe_touch_a', 'The metal spoon.'), tag: 'metal_colder' },
          { id: 'b', text: t('stem.heatlab.poe_touch_b', 'The wooden spoon.'), tag: 'metal_colder' },
          { id: 'c', text: t('stem.heatlab.poe_touch_c', 'Neither: both are at 20 °C. Metal only feels colder because it pulls heat out of your hand faster.'), tag: null }
        ],
        idea: t('stem.heatlab.poe_touch_idea', 'Things left in one room reach the same temperature; how cold they feel depends on how fast they draw heat from you (effusivity).'),
        evidence: function () {
          var cu = heatContactTemperature(HEAT_SKIN_EFFUSIVITY, MATERIALS[0], HEAT_SKIN_C, 20);
          var wd = heatContactTemperature(HEAT_SKIN_EFFUSIVITY, MATERIALS[5], HEAT_SKIN_C, 20);
          return t('stem.heatlab.poe_touch_ev', 'Contact model, Tc = (e₁T₁ + e₂T₂) ÷ (e₁ + e₂), with skin at 33 °C: touching 20 °C copper, your skin surface drops to {cu} °C; touching 20 °C wood, it stays near {wood} °C. Copper’s effusivity is about {ratio} times wood’s.')
            .replace('{cu}', fmt1(cu)).replace('{wood}', fmt1(wd))
            .replace('{ratio}', fmt(heatEffusivity(MATERIALS[0]) / heatEffusivity(MATERIALS[5]), 0));
        },
        explain: t('stem.heatlab.poe_touch_x', 'Your skin cannot measure an object’s temperature, only how fast you lose heat. Copper conducts so well that it drags your skin surface almost down to 20 °C; wood barely draws any heat, so it feels nearly as warm as you.') },
      { id: 'boiltemp', answer: 'b', section: 'heatingcurve',
        q: t('stem.heatlab.poe_boiltemp_q', 'A pan of water is boiling hard. You keep heating it for five more minutes. Its temperature…'),
        options: [
          { id: 'a', text: t('stem.heatlab.poe_boiltemp_a', 'keeps rising, because energy keeps going in.'), tag: 'boiling_keeps_rising' },
          { id: 'b', text: t('stem.heatlab.poe_boiltemp_b', 'stays at 100 °C until the water has boiled away.'), tag: null },
          { id: 'c', text: t('stem.heatlab.poe_boiltemp_c', 'drops, because the steam carries heat away.'), tag: null }
        ],
        idea: t('stem.heatlab.poe_boiltemp_idea', 'During a change of state the energy breaks bonds between molecules instead of speeding them up, so the temperature holds steady.'),
        evidence: function () {
          return t('stem.heatlab.poe_boiltemp_ev', 'On the heating curve, boiling 1 kg of water takes {kj} kJ, and the line stays flat at 100 °C the whole way.')
            .replace('{kj}', fmt(HEAT_WATER.lVap / 1000, 0));
        },
        setup: { energyIn: 1900 },
        explain: t('stem.heatlab.poe_boiltemp_x', 'At atmospheric pressure liquid water cannot get hotter than 100 °C. Extra energy turns more liquid into vapour instead, which is why the pan boils faster, not hotter.') },
      { id: 'bubbles', answer: 'b', section: 'heatingcurve',
        q: t('stem.heatlab.poe_bubbles_q', 'What is inside the big bubbles that rise through boiling water?'),
        options: [
          { id: 'a', text: t('stem.heatlab.poe_bubbles_a', 'Air that was dissolved in the water.'), tag: 'bubbles_are_air' },
          { id: 'b', text: t('stem.heatlab.poe_bubbles_b', 'Water vapour: the water itself, turned to gas.'), tag: null },
          { id: 'c', text: t('stem.heatlab.poe_bubbles_c', 'Hydrogen and oxygen split out of the water.'), tag: 'bubbles_are_air' }
        ],
        idea: t('stem.heatlab.poe_bubbles_idea', 'Boiling is liquid turning to gas all through the liquid; the bubbles are that gas.'),
        evidence: function () {
          return t('stem.heatlab.poe_bubbles_ev', 'Each kilogram that boils absorbs {kj} kJ to become vapour: that is the long boiling plateau. A little dissolved air does escape as tiny bubbles while the water warms, but the rolling bubbles at 100 °C are steam.')
            .replace('{kj}', fmt(HEAT_WATER.lVap / 1000, 0));
        },
        setup: { energyIn: 1900 },
        explain: t('stem.heatlab.poe_bubbles_x', 'At 100 °C water molecules at the bottom of the pan gain enough energy to break free as gas, forming pockets of vapour that rise and burst. No chemical change happens: steam condenses straight back into water.') },
      { id: 'heatrises', answer: 'b', section: 'convection3d',
        q: t('stem.heatlab.poe_heatrises_q', 'Why does warm air collect near the ceiling of a room?'),
        options: [
          { id: 'a', text: t('stem.heatlab.poe_heatrises_a', 'Because heat itself rises.'), tag: 'heat_rises' },
          { id: 'b', text: t('stem.heatlab.poe_heatrises_b', 'Warm air is less dense, so cooler, denser air sinks beneath it and pushes it up.'), tag: null },
          { id: 'c', text: t('stem.heatlab.poe_heatrises_c', 'The cold ceiling pulls the warm air towards it.'), tag: 'heat_rises' }
        ],
        idea: t('stem.heatlab.poe_heatrises_idea', 'Hot fluid rises because it is less dense (buoyancy); heat itself spreads in every direction.'),
        // Evidence from the convection model (stage C): the same heater on a
        // 1 cm layer of water, once underneath and once on top.
        evidence: function () {
          var up = heatConvectionModel({ fluid: 'water', powerW: 1, depthM: 0.01, from: 'below' });
          var down = heatConvectionModel({ fluid: 'water', powerW: 1, depthM: 0.01, from: 'above' });
          return t('stem.heatlab.poe_heatrises_ev2', 'Convection model, a 1 W heater on 1 cm of water. Heated from below, warm water is lighter than the water above it, so it rises and the layer circulates (Rayleigh number {ra}); the heater sits only {up} °C above the top. Heated from above, the warm light water already sits on top, nothing moves, and the same 1 W has to creep DOWN by conduction alone, which needs {down} °C. Heat flowed downwards either way; only the fluid’s movement depends on which way is up.')
            .replace('{ra}', fmt(up.Ra, 0)).replace('{up}', fmt(up.dT, 2)).replace('{down}', fmt(down.dT, 2));
        },
        setup: { cvFrom: 'above', cvFluid: 'water', cvDepth: 0.01, cvPowerExp: 0 },
        explain: t('stem.heatlab.poe_heatrises_x', 'It is the warm air that rises, not the heat. In a solid, where nothing can flow, a heater at the top warms the bottom by conduction just as surely; it only takes longer.') },
      { id: 'darkcolour', answer: 'b', section: 'radiation',
        q: t('stem.heatlab.poe_darkcolour_q', 'A black car and a white car park side by side in the sun. Why does the black car get hotter?'),
        options: [
          { id: 'a', text: t('stem.heatlab.poe_darkcolour_a', 'Black attracts heat towards it.'), tag: 'dark_attracts_heat' },
          { id: 'b', text: t('stem.heatlab.poe_darkcolour_b', 'Both receive the same sunlight; black paint absorbs more of it and reflects less.'), tag: null },
          { id: 'c', text: t('stem.heatlab.poe_darkcolour_c', 'Black paint makes its own heat.'), tag: 'insulator_makes_heat' }
        ],
        idea: t('stem.heatlab.poe_darkcolour_idea', 'Nothing attracts radiation; surfaces differ in how much of the light that hits them they absorb.'),
        // From the surface model (stage C), not a fixed emissivity.
        evidence: function () {
          var b = heatSurfaceSun('black'), w = heatSurfaceSun('white');
          return t('stem.heatlab.poe_darkcolour_ev2', 'Surface model, 800 W/m² of sunlight on each: matte black paint absorbs {ab} W/m² and white paint {aw} W/m² (it reflects the rest), so in full sun black settles near {tb} °C and white near {tw} °C. In the infrared both are nearly “black” (ε 0.95 and 0.90): at 40 °C they radiate {eb} and {ew} W/m². Nothing is attracted; black simply absorbs more of the light that reaches both.')
            .replace('{ab}', fmt(b.absorbedWm2, 0)).replace('{aw}', fmt(w.absorbedWm2, 0))
            .replace('{tb}', fmt(b.eqC, 0)).replace('{tw}', fmt(w.eqC, 0))
            .replace('{eb}', fmt(b.emittedAtWm2, 0)).replace('{ew}', fmt(w.emittedAtWm2, 0));
        },
        setup: { radSurf: 'black' },
        explain: t('stem.heatlab.poe_darkcolour_x', 'Radiation travels in straight lines and is not pulled anywhere. A white surface reflects most visible sunlight, a black one absorbs it, and absorbed light becomes thermal energy in the paint.') },
      { id: 'equilibrium', answer: 'b', section: 'radiation',
        q: t('stem.heatlab.poe_equilibrium_q', 'A mug has cooled to exactly room temperature. Is any thermal radiation still passing between the mug and the room?'),
        options: [
          { id: 'a', text: t('stem.heatlab.poe_equilibrium_a', 'No: at the same temperature nothing moves.'), tag: 'equilibrium_stops' },
          { id: 'b', text: t('stem.heatlab.poe_equilibrium_b', 'Yes: each sends the other the same amount, so the net flow is zero.'), tag: null }
        ],
        idea: t('stem.heatlab.poe_equilibrium_idea', 'Equilibrium means equal flows both ways, not no flow at all.'),
        evidence: function () {
          var r = heatRadiationModel(20, 20, 1.8, 0.98);
          return t('stem.heatlab.poe_equilibrium_ev', 'At 20 °C in a 20 °C room, a 1.8 m² surface still emits {w} W and absorbs {w2} W from the room. Net: 0 W. Set the surface to 20 °C in this section to see it.')
            .replace('{w}', fmt(r.emittedW, 0)).replace('{w2}', fmt(r.absorbedW, 0));
        },
        setup: { radT: 20 },
        explain: t('stem.heatlab.poe_equilibrium_x', 'Everything above absolute zero radiates all the time. At equal temperatures the two streams are equal, so neither object warms or cools: a balance, not a standstill.') },
      // The same idea by contact rather than radiation, tied to the two-block
      // simulator (section 'equilibrium').
      { id: 'eqstop', answer: 'b', section: 'equilibrium',
        q: t('stem.heatlab.poe_eqstop_q', 'A hot copper block and a cold aluminium block touch inside a sealed box until both read the same temperature. What is happening between them now?'),
        options: [
          { id: 'a', text: t('stem.heatlab.poe_eqstop_a', 'Nothing at all: once the temperatures match, energy stops moving.'), tag: 'equilibrium_stops' },
          { id: 'b', text: t('stem.heatlab.poe_eqstop_b', 'Particles still trade energy across the contact, equally in both directions, so the net heat flow is zero.'), tag: null },
          { id: 'c', text: t('stem.heatlab.poe_eqstop_c', 'The bigger block keeps feeding heat to the smaller one.'), tag: 'bigger_is_hotter' }
        ],
        idea: t('stem.heatlab.poe_eqstop_idea', 'Heat is the NET flow of energy; at equilibrium the exchanges in each direction balance, so the net flow is zero.'),
        evidence: function () {
          var run = heatTwoBodyEquilibrium({ m1: 1, c1: MATERIALS[0].c, T1: 90, m2: 1, c2: MATERIALS[1].c, T2: 10, G: 5, tEnd: 0, steps: 1 });
          var p = run.at(10 * run.tauS);
          return t('stem.heatlab.poe_eqstop_ev', 'In the two-block model the net heat flow is G × (T₁ − T₂): {w0} W at the start, {w} W after ten time constants, and exactly zero only when the temperatures match at {tf} °C. The model counts only the net flow; the particles keep colliding across the contact the whole time.')
            .replace('{w0}', fmt(5 * 80, 0)).replace('{w}', fmt(5 * (p.T1 - p.T2), 3)).replace('{tf}', fmt(run.Tf, 1));
        },
        setup: { eqCursor: 100 },
        explain: t('stem.heatlab.poe_eqstop_x', 'Atoms at the contact keep jostling: sometimes a copper atom gives energy to an aluminium atom, sometimes the reverse. Once the temperatures match those exchanges balance on average, so no NET heat flows and neither block changes temperature. Size has nothing to do with it.') },
      { id: 'fridge', answer: 'b', section: 'heatpumps',
        q: t('stem.heatlab.poe_fridge_q', 'You leave a fridge door open in a closed kitchen and it runs all day. The kitchen…'),
        options: [
          { id: 'a', text: t('stem.heatlab.poe_fridge_a', 'cools down, because the fridge pours out cold.'), tag: 'cold_flows' },
          { id: 'b', text: t('stem.heatlab.poe_fridge_b', 'warms up: the fridge only moves heat around, and its motor adds heat too.'), tag: null },
          { id: 'c', text: t('stem.heatlab.poe_fridge_c', 'stays the same, because the cold and the heat cancel out.'), tag: 'cold_flows' }
        ],
        idea: t('stem.heatlab.poe_fridge_idea', 'A fridge is a heat pump: it moves heat, it cannot destroy it, and the electricity it uses also ends up as heat.'),
        evidence: function () {
          return t('stem.heatlab.poe_fridge_ev', 'A heat pump takes heat from its cold side and dumps it, plus the electrical energy it used, on its hot side. With the door open both sides are the kitchen, so the only change is the electricity added as heat.');
        },
        explain: t('stem.heatlab.poe_fridge_x', 'The coils on the back of the fridge give out more heat than the inside takes in. With the door open that heat goes straight back into the cabinet, so the kitchen gains the motor’s energy and warms slowly.') }
    ];
  }

  // ── P2-3: four guided claim-evidence-reasoning investigations ──
  // kinds: notebook row kinds that count as evidence (needAll: one of each);
  // cols: the columns shown for a picked row, per kind; ivCols: columns that
  // should differ between compared rows (a fair test changes one of them);
  // ideas: words a reasoning that uses the science idea will contain;
  // go: plain toolData patches that set a section up for the plan.
  // Text is built with the host translator at render time.
  var HEAT_CER_RUBRIC = ['claim', 'rows', 'fair', 'idea', 'limit'];
  function heatInvestigations(t) {
    return [
      { id: 'massmaterial', icon: '⚖️', kinds: ['mixing'], ivCols: ['m1_kg', 'm2_kg', 'sub1', 'sub2'], cvCols: ['T1_C', 'T2_C'],
        cols: { mixing: ['sub1', 'm1_kg', 'sub2', 'm2_kg', 'Tf_C', 'dT1_K'] },
        ideas: /heat capacity|specific heat|m\s*[×x*·]\s*c|\bmc\b|Q\s*=/i,
        go: [{ section: 'mixing', setup: { sub1: 'water', m1: 0.5, t1: 20, sub2: 'iron', m2: 0.5, t2: 90, mixEstimateResult: null, mixEstimateRevision: '', mixEstimateReflection: '', mixEstimateReflectionComplete: false } }],
        title: t('stem.heatlab.cer_mm_title', 'Mass or material?'),
        q: t('stem.heatlab.cer_mm_q', 'A hot sample is dropped into 0.5 kg of water. Which changes the final temperature more: doubling the sample’s mass, or swapping it for a different material?'),
        iv: t('stem.heatlab.cer_mm_iv', 'The hot sample’s mass (first), then its material (second), never both at once'),
        dv: t('stem.heatlab.cer_mm_dv', 'The final temperature Tf, and how far the water warms'),
        cv: t('stem.heatlab.cer_mm_cv', 'The water (0.5 kg at 20 °C), the hot sample’s start temperature (90 °C), no heat lost to the room'),
        plan: [
          t('stem.heatlab.cer_mm_p1', 'Set up the mix: 0.5 kg of water at 20 °C and 0.5 kg of iron at 90 °C. Record a trial.'),
          t('stem.heatlab.cer_mm_p2', 'Change only the iron’s mass, to 1.0 kg and then 2.0 kg. Record each.'),
          t('stem.heatlab.cer_mm_p3', 'Put the mass back to 0.5 kg and change only the material: aluminium, copper, sand. Record each.'),
          t('stem.heatlab.cer_mm_p4', 'Compare the rows: which change moved Tf further?')
        ],
        frames: {
          claim: t('stem.heatlab.cer_mm_fc', 'Changing the ___ of the hot sample changed the final temperature more than changing its ___, because …'),
          evidence: t('stem.heatlab.cer_mm_fe', 'When I doubled the mass from ___ to ___ kg, Tf went from ___ to ___ °C. When I swapped iron for ___, Tf went to ___ °C.'),
          reasoning: t('stem.heatlab.cer_mm_fr', 'The heat a sample can give depends on its heat capacity, mass × specific heat (Q = mcΔT), so …')
        },
        idea: t('stem.heatlab.cer_mm_idea', 'Both matter through the total heat capacity, mass times specific heat; whichever change alters m × c more moves the final temperature further.') },
      { id: 'cosy', icon: '🧣', kinds: ['mug'], ivCols: ['material', 'thickness_mm'],
        cols: { mug: ['material', 'thickness_mm', 'R_wrap_m2KW', 'T60_C'] },
        ideas: /resist|R\s*=|R-value|R value|conductiv|\bk\b|insulat/i,
        go: [{ section: 'insulation', setup: { insMatId: 'copper', thickness: 10 } }],
        title: t('stem.heatlab.cer_cosy_title', 'The best cup cosy'),
        q: t('stem.heatlab.cer_cosy_q', 'Which wrap keeps a mug of tea hottest after an hour, and how much does thickness matter compared with the material?'),
        iv: t('stem.heatlab.cer_cosy_iv', 'The wrap material (at one thickness), then the thickness (of one material)'),
        dv: t('stem.heatlab.cer_cosy_dv', 'The tea’s temperature after 60 minutes (T60)'),
        cv: t('stem.heatlab.cer_cosy_cv', '350 ml of tea starting at 90 °C, the same mug, a 20 °C room'),
        plan: [
          t('stem.heatlab.cer_cosy_p1', 'Choose a thickness, for example 10 mm, and keep it fixed.'),
          t('stem.heatlab.cer_cosy_p2', 'Test at least three materials at that thickness. Record each.'),
          t('stem.heatlab.cer_cosy_p3', 'Take the best material and record it at three thicknesses, such as 5, 10 and 20 mm.'),
          t('stem.heatlab.cer_cosy_p4', 'Look for the pattern: does doubling the thickness double the benefit?')
        ],
        frames: {
          claim: t('stem.heatlab.cer_cosy_fc', 'The best cosy is ___, and its material matters more / less than its thickness, because …'),
          evidence: t('stem.heatlab.cer_cosy_fe', 'At ___ mm, ___ kept the tea at ___ °C after an hour but ___ only ___ °C. Going from ___ to ___ mm of ___ raised T60 from ___ to ___ °C.'),
          reasoning: t('stem.heatlab.cer_cosy_fr', 'A good insulator has a low conductivity k, so its resistance R = thickness ÷ k is large and heat leaks out more slowly, but …')
        },
        idea: t('stem.heatlab.cer_cosy_idea', 'The wrap adds resistance R = thickness ÷ k in series with the air film; low-k materials give far more resistance per millimetre, and thickness helps less once the wrap dominates.') },
      { id: 'layers', icon: '🧱', kinds: ['wall'], ivCols: ['layers'],
        cols: { wall: ['layers', 'thickness_mm', 'R_total_m2KW', 'U_Wm2K'] },
        ideas: /series|\badd|total|sum|resist|R\s*=|R-value/i,
        go: [{ section: 'wall', setup: { wallStack: ['mineral', 'mineral'] } }],
        title: t('stem.heatlab.cer_layers_title', 'One thick layer or many thin ones?'),
        q: t('stem.heatlab.cer_layers_q', 'For about the same total thickness, does a wall keep more heat in with one thick insulating layer or with many thin layers?'),
        iv: t('stem.heatlab.cer_layers_iv', 'How the wall is layered: one thick layer, or several thin ones'),
        dv: t('stem.heatlab.cer_layers_dv', 'The U-value (W/m²K) and the heat lost through 100 m² of wall'),
        cv: t('stem.heatlab.cer_layers_cv', '21 °C inside and 2 °C outside, the same 100 m² of wall, about the same total thickness'),
        plan: [
          t('stem.heatlab.cer_layers_p1', 'Build one thick insulating layer, for example two mineral-wool batts (200 mm). Record it.'),
          t('stem.heatlab.cer_layers_p2', 'Remove them and build many thin layers of about the same total thickness, for example sixteen sheets of plasterboard. Record it.'),
          t('stem.heatlab.cer_layers_p3', 'Try thin layers with still-air cavities between them, then thin layers of a good insulator such as PIR board. Record each.'),
          t('stem.heatlab.cer_layers_p4', 'Compare the U-value and thickness columns.')
        ],
        frames: {
          claim: t('stem.heatlab.cer_layers_fc', 'For the same thickness, ___ keeps more heat in; what really decides it is …'),
          evidence: t('stem.heatlab.cer_layers_fe', 'One ___ layer, ___ mm thick, gave U = ___ W/m²K. ___ thin layers, ___ mm in total, gave U = ___ W/m²K.'),
          reasoning: t('stem.heatlab.cer_layers_fr', 'Resistances in series add: R_total = R₁ + R₂ + … So the number of layers matters only if …')
        },
        idea: t('stem.heatlab.cer_layers_idea', 'Layer resistances in series simply add, so the total R decides; many thin layers win only if each one, or the still air between them, adds real resistance.') },
      { id: 'coldtohot', icon: '🔄', kinds: ['equilibrium', 'heat-pump'], needAll: true, ivCols: ['t_s', 'outdoor_C'],
        cvCols: ['mat1', 'm1_kg', 'T1start_C', 'mat2', 'm2_kg', 'T2start_C', 'G_WK', 'leak', 'indoor_C'],
        cols: { equilibrium: ['t_s', 'T1_C', 'T2_C', 'q12_J', 'dS_total_JK'], 'heat-pump': ['outdoor_C', 'indoor_C', 'teachingCOP'] },
        ideas: /entropy|second law|\bwork|electric|spontaneous|by itself|energy input/i,
        go: [{ section: 'equilibrium', setup: { eqLeak: false, eqCursor: 30 } }, { section: 'heatpumps', setup: { hpOut: 2, hpIn: 21 } }],
        title: t('stem.heatlab.cer_cold_title', 'Can heat flow from cold to hot?'),
        q: t('stem.heatlab.cer_cold_q', 'Does heat ever flow by itself from a colder object to a hotter one? And how does a heat pump warm a house using cold outdoor air?'),
        iv: t('stem.heatlab.cer_cold_iv', 'Time, in the two-block model; the outdoor temperature, for the heat pump'),
        dv: t('stem.heatlab.cer_cold_dv', 'Which way the heat flows and how much, and the total entropy change'),
        cv: t('stem.heatlab.cer_cold_cv', 'Two blocks in a sealed box (no leak); a heat pump keeping the house at 21 °C'),
        plan: [
          t('stem.heatlab.cer_cold_p1', 'In Two blocks, keep the box closed. Record trials at three different times on the graphs.'),
          t('stem.heatlab.cer_cold_p2', 'In each row, check the sign of the heat passed from block 1 (hot) to block 2 (cold) and of the total entropy change.'),
          t('stem.heatlab.cer_cold_p3', 'In Heat pumps, record trials at three outdoor temperatures.'),
          t('stem.heatlab.cer_cold_p4', 'Compare: when did heat go from cold to hot, and what did it cost?')
        ],
        frames: {
          claim: t('stem.heatlab.cer_cold_fc', 'Heat flows by itself only from ___ to ___. It moves from cold to hot only when …'),
          evidence: t('stem.heatlab.cer_cold_fe', 'In the two-block rows the heat passed from block 1 to block 2 was always ___ and the total entropy change was ___. At ___ °C outside, the heat pump delivered ___ kW of heat for each 1 kW of electricity.'),
          reasoning: t('stem.heatlab.cer_cold_fr', 'The second law says the total entropy never decreases, so …')
        },
        idea: t('stem.heatlab.cer_cold_idea', 'Heat flows by itself only from hot to cold, and total entropy rises; a heat pump moves heat from cold to hot only by using work, and total entropy still rises.') }
    ];
  }

  // ── 3D convection tank ──────────────────────────────────────────────
  // Convection is the mechanism a flat diagram serves worst. In 2D it looks like
  // a circle of arrows; in reality it is a closed toroidal roll, and you only
  // believe that once you can turn it over. The viewer shell (WebGL setup,
  // orbit, picking, labels, context-loss recovery, no-WebGL fallback) belongs to
  // the host — window.StemLab.makeBayViewer — so this file only builds geometry.
  var HEAT_3D_PARTS = [
    { id: 'heater',    label: 'Heated base',   color: '#ef4444', desc: 'Energy enters here. The fluid touching the plate warms, expands, and becomes less dense than the fluid above it.' },
    { id: 'plume',     label: 'Rising plume',  color: '#fb923c', desc: 'Warm, less dense fluid is pushed upward by the denser fluid around it. Nothing pulls it up — it is buoyancy, the same force that lifts a cork.' },
    { id: 'ceiling',   label: 'Cool ceiling',  color: '#38bdf8', desc: 'At the top the fluid gives its heat to the cold surface, contracts, and becomes dense again.' },
    { id: 'downdraft', label: 'Sinking edges', color: '#7dd3fc', desc: 'Cooled dense fluid falls back down the sides. This is the return half of the loop, and it is why the middle can keep rising.' },
    { id: 'tank',      label: 'Tank walls',    color: '#94a3b8', desc: 'The container. Change its shape and the roll changes with it — convection cells take the form the boundary allows.' }
  ];
  // A compact left-to-right key sits under the viewer. It gives the learner a
  // stable mental model while the camera is moving, and remains useful when the
  // host cannot provide WebGL and the 2D fallback is all they can see.
  var HEAT_3D_FLOW = [
    { id: 'heater',    label: 'Heat in',  hint: 'warm + expand' },
    { id: 'plume',     label: 'Rise',     hint: 'buoyancy' },
    { id: 'ceiling',   label: 'Cool',     hint: 'release heat' },
    { id: 'downdraft', label: 'Sink',     hint: 'denser fluid' },
    { id: 'tank',      label: 'Contain',  hint: 'shape the loop' }
  ];
  // High-contrast treatment per part: a pure colour on black plus a distinct
  // surface (solid vs wireframe), so no two neighbouring parts rely on hue.
  var HEAT_3D_CONTRAST = {
    heater:    { color: '#ffffff', wire: false, cue: 'solid white' },
    plume:     { color: '#ffff00', wire: false, cue: 'solid yellow' },
    ceiling:   { color: '#00ffff', wire: true,  cue: 'cyan wireframe' },
    downdraft: { color: '#ff66ff', wire: true,  cue: 'magenta wireframe' },
    tank:      { color: '#ffffff', wire: true,  cue: 'white wireframe' }
  };

  function heatBuildScene(THREE, api) {
    // Every variable is declared before it is used. A declaration sitting below
    // its first use is what silently broke another 3D tool in this lab for most
    // of its shapes, and the failure surfaced as "your device lacks WebGL".
    var meshes = {};
    var picks = [];
    var anchor = new THREE.Group();
    api.scene.add(anchor);

    var contrast = !!api.contrast;
    // High contrast used to flatten every part to white, so the hot and cold
    // plates were indistinguishable. Each part now keeps its own pure colour
    // on the black stage AND its own surface treatment (solid, wireframe or
    // semi-solid), so they differ even for a reader who cannot tell the hues.
    var colourOf = function (id) {
      if (contrast) return HEAT_3D_CONTRAST[id] ? HEAT_3D_CONTRAST[id].color : '#ffffff';
      for (var i = 0; i < HEAT_3D_PARTS.length; i++) if (HEAT_3D_PARTS[i].id === id) return HEAT_3D_PARTS[i].color;
      return '#94a3b8';
    };
    var mat = function (id, opts) {
      var o = opts || {};
      var hc = contrast ? HEAT_3D_CONTRAST[id] : null;
      return new THREE.MeshPhongMaterial({
        color: new THREE.Color(colourOf(id)),
        shininess: contrast ? 0 : (o.shininess == null ? 26 : o.shininess),
        specular: contrast ? 0x000000 : 0x5b6472,
        transparent: !!o.opacity && o.opacity < 1,
        opacity: o.opacity == null ? 1 : o.opacity,
        emissive: new THREE.Color(o.emissive || '#000000'),
        wireframe: !!(hc && hc.wire),
        side: o.side || THREE.FrontSide
      });
    };

    var W = 2.6, D = 2.6, H = 2.0;

    // Tank: four thin walls, left open at top and bottom so the plates read as
    // the hot and cold surfaces rather than as part of the glass.
    var wallMat = mat('tank', { opacity: contrast ? 1 : 0.16, shininess: 60 });
    var wallGeo = [
      [W, H, 0.05, 0, 0, -D / 2],
      [W, H, 0.05, 0, 0, D / 2],
      [0.05, H, D, -W / 2, 0, 0],
      [0.05, H, D, W / 2, 0, 0]
    ];
    var tankGroup = new THREE.Group();
    var gi, wg, wm;
    for (gi = 0; gi < wallGeo.length; gi++) {
      wg = wallGeo[gi];
      wm = new THREE.Mesh(new THREE.BoxGeometry(wg[0], wg[1], wg[2]), wallMat);
      wm.position.set(wg[3], wg[4], wg[5]);
      tankGroup.add(wm);
    }
    anchor.add(tankGroup);
    meshes.tank = tankGroup;
    picks.push(tankGroup);

    // Hot plate below, cold plate above
    var plate = function (id, y, emissive) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(W, 0.12, D), mat(id, { emissive: emissive, shininess: 8 }));
      m.position.set(0, y, 0);
      if (api.wantShadow) { m.castShadow = true; m.receiveShadow = true; }
      anchor.add(m);
      meshes[id] = m;
      picks.push(m);
      return m;
    };
    // Stage C: the convection model drives the scene through sceneProps
    // { regime, from, rate }. Older hosts pass none, which keeps the original
    // static roll.
    var sp = api.sceneProps || {};
    var fromAbove = sp.from === 'above';
    var regime = sp.regime || 'rolls';
    var still = regime === 'conduction' || regime === 'stable';
    plate('heater', (fromAbove ? 1 : -1) * (H / 2 + 0.06), contrast ? '#000000' : '#5a1010');
    plate('ceiling', (fromAbove ? -1 : 1) * (H / 2 + 0.06), contrast ? '#000000' : '#0b2b3d');

    // The rising column in the middle and the falling sheets at the walls, drawn
    // as stacked spheres so the roll reads as moving fluid, not as solid pipe.
    var sphereGeo = new THREE.SphereGeometry(0.13, 14, 12);
    var plumeGroup = new THREE.Group();
    var downGroup = new THREE.Group();
    var n, fy, ring, ang, rx, rz, s;
    for (n = 0; n < 9; n++) {
      fy = -H / 2 + 0.18 + (n / 8) * (H - 0.36);
      s = new THREE.Mesh(sphereGeo, mat('plume', { emissive: contrast ? '#000000' : '#3d1a05' }));
      s.position.set(0, fy, 0);
      if (api.wantShadow) s.castShadow = true;
      plumeGroup.add(s);
    }
    for (ring = 0; ring < 8; ring++) {
      ang = (ring / 8) * Math.PI * 2;
      rx = Math.cos(ang) * (W / 2 - 0.28);
      rz = Math.sin(ang) * (D / 2 - 0.28);
      for (n = 0; n < 5; n++) {
        fy = H / 2 - 0.18 - (n / 4) * (H - 0.36);
        s = new THREE.Mesh(sphereGeo, mat('downdraft', { emissive: contrast ? '#000000' : '#082131' }));
        s.position.set(rx, fy, rz);
        s.scale.setScalar(0.82);
        downGroup.add(s);
      }
    }
    anchor.add(plumeGroup);
    anchor.add(downGroup);
    meshes.plume = plumeGroup;
    meshes.downdraft = downGroup;
    picks.push(plumeGroup);
    picks.push(downGroup);

    // Direction cones. Without these the roll is ambiguous — a ring of spheres
    // says nothing about which way anything is going.
    var coneGeo = new THREE.ConeGeometry(0.16, 0.34, 12);
    var upCone = new THREE.Mesh(coneGeo, mat('plume'));
    upCone.position.set(0, H / 2 - 0.05, 0);
    plumeGroup.add(upCone);
    var dc, dcAng;
    for (dc = 0; dc < 4; dc++) {
      dcAng = (dc / 4) * Math.PI * 2 + Math.PI / 4;
      var down = new THREE.Mesh(coneGeo, mat('downdraft'));
      down.position.set(Math.cos(dcAng) * (W / 2 - 0.28), -H / 2 + 0.05, Math.sin(dcAng) * (D / 2 - 0.28));
      down.rotation.z = Math.PI;
      downGroup.add(down);
    }

    // Curved returns along the base and ceiling, closing the loop visually
    var torusGeo = new THREE.TorusGeometry(W / 2 - 0.3, 0.045, 8, 40);
    var topRing = new THREE.Mesh(torusGeo, mat('ceiling'));
    topRing.rotation.x = Math.PI / 2;
    topRing.position.y = H / 2 - 0.22;
    anchor.add(topRing);
    var botRing = new THREE.Mesh(torusGeo, mat('heater'));
    botRing.rotation.x = Math.PI / 2;
    botRing.position.y = -H / 2 + 0.22;
    anchor.add(botRing);

    // With no flow (conduction, or heated from above) the roll guide fades:
    // a still layer must not look as if it circulates.
    if (still || fromAbove) {
      [plumeGroup, downGroup, topRing, botRing].forEach(function (g) {
        g.traverse(function (o) {
          if (o.isMesh && o.material) { o.material.transparent = true; o.material.opacity = 0.16; o.material.depthWrite = false; }
        });
      });
    }

    // Tracers that move at the model's speed around the toroidal roll: up the
    // middle, out under the ceiling, down the walls, back across the floor.
    // In a still layer they sit in rows, coloured warm to cool from the heated
    // plate. Under reduced motion they freeze and the streamlines show.
    var rc = W / 4 + 0.05, ra = W / 4 - 0.18, rb = H / 2 - 0.3;
    var warmC = new THREE.Color(contrast ? '#ffff00' : '#f97316');
    var coolC = new THREE.Color(contrast ? '#00ffff' : '#38bdf8');
    var tracerGeo = new THREE.SphereGeometry(0.055, 10, 8);
    var tracerGroup = new THREE.Group();
    var tracers = [];
    var TR = 48, ti;
    var rnd = heatRng(97);
    for (ti = 0; ti < TR; ti++) {
      var tm = new THREE.MeshBasicMaterial({ color: warmC.clone() });
      var tr = new THREE.Mesh(tracerGeo, tm);
      var tp = { mesh: tr, phi: (ti % 12) / 12 * Math.PI * 2 + rnd() * 0.3, th: rnd() * Math.PI * 2, wob: rnd() * Math.PI * 2, lane: 0.75 + 0.5 * rnd() };
      tracers.push(tp);
      tracerGroup.add(tr);
    }
    anchor.add(tracerGroup);
    var place = function (p, th, extra) {
      var e = extra || 0;
      var r = rc + ra * p.lane * Math.cos(th) + e * 0.12;
      var y = -rb * p.lane * Math.sin(th);
      if (fromAbove) y = -y;
      p.mesh.position.set(Math.cos(p.phi) * r, y, Math.sin(p.phi) * r);
      // the rising inner leg and the fluid along the hot floor are warmest
      var w = clamp(0.5 - 0.3 * Math.cos(th) + 0.2 * Math.sin(th), 0, 1);
      p.mesh.material.color.copy(coolC).lerp(warmC, w);
    };
    if (still) {
      tracers.forEach(function (p, i) {
        var row = i % 6, f = row / 5;
        var r = 0.25 + (W / 2 - 0.45) * ((Math.floor(i / 6) % 8) / 7);
        p.mesh.position.set(Math.cos(p.phi) * r, (f - 0.5) * (H - 0.5), Math.sin(p.phi) * r);
        var warmth = fromAbove ? f : 1 - f;
        p.mesh.material.color.copy(coolC).lerp(warmC, warmth);
      });
    } else {
      tracers.forEach(function (p) { place(p, p.th, 0); });
    }
    // Frozen streamlines: closed loops around the roll at eight azimuths.
    var streamGroup = new THREE.Group();
    if (!still) {
      var lineMat = new THREE.LineBasicMaterial({ color: contrast ? '#ffffff' : '#fb923c', transparent: !contrast, opacity: contrast ? 1 : 0.8 });
      for (var sl = 0; sl < 8; sl++) {
        var phiS = sl / 8 * Math.PI * 2, pts = [];
        for (var k = 0; k <= 48; k++) {
          var thS = k / 48 * Math.PI * 2;
          var rS = rc + ra * Math.cos(thS), yS = -rb * Math.sin(thS) * (fromAbove ? -1 : 1);
          pts.push(new THREE.Vector3(Math.cos(phiS) * rS, yS, Math.sin(phiS) * rS));
        }
        streamGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
      }
    }
    streamGroup.visible = !!api.reduced;
    anchor.add(streamGroup);

    var lastMs = 0, clock = 0;
    var frame = function (nowMs, props, reduced) {
      var p = props || {};
      streamGroup.visible = !!reduced && !still;
      if (still) return;
      if (reduced) { lastMs = 0; return; }
      var dt = lastMs ? Math.min(0.1, (nowMs - lastMs) / 1000) : 0;
      lastMs = nowMs;
      var rate = typeof p.rate === 'number' && isFinite(p.rate) ? p.rate : 0.6;
      clock += dt;
      var plumes = p.regime === 'plumes';
      tracers.forEach(function (q) {
        q.th += rate * dt * (2 - q.lane);
        place(q, q.th, plumes ? Math.sin(clock * 2.3 + q.wob) : 0);
      });
    };

    return { meshes: meshes, picks: picks, anchor: anchor, frame: frame };
  }

  var HEAT_3D_NULL = {
    attach: function () {}, sync: function () {}, nudge: function () {},
    zoom: function () {}, reset: function () {}, status: function () { return 'failed'; }
  };
  var HEAT_3D_MISSING = null;
  var HEAT_VIEWER = (function () {
    var mk = window.StemLab && window.StemLab.makeBayViewer;
    if (!mk) {
      // Two different failures used to share one message. If the HOST is older
      // than the tool, no amount of network access fixes it, and saying "check
      // your connection" sends the reader the wrong way.
      HEAT_3D_MISSING = 'host';
      return HEAT_3D_NULL;
    }
    return mk({
      parts: HEAT_3D_PARTS.map(function (p) { return { id: p.id, label: p.label, color: p.color }; }),
      buildScene: heatBuildScene,
      home: { yaw: -0.7, pitch: 0.42, dist: 6.4 },
      failMessage: '3D convection tank unavailable'
    });
  })();

  // Stable identity. A fresh callback each render makes React tear the viewer
  // down and rebuild it on every state change.
  function heat3dAttach(node) { HEAT_VIEWER.attach(node || null); }

  // Read on every frame / effect, never once at load: the host's own toggle
  // adds .reduce-motion to the page at any time, as can the OS setting.
  function heatPrefersReducedMotion() {
    try {
      if (typeof document !== 'undefined' && document.querySelector && document.querySelector('.reduce-motion')) return true;
      return !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  }

  // ── Particle zoom lens ─────────────────────────────────────────────
  // One reusable canvas: up to 150 particles whose speed scales as
  // sqrt(T / M) (kelvin), drawn as a lattice that vibrates (solid), a crowd
  // that slides and jostles (liquid) or free flight (gas), beside the
  // Maxwell distribution for each population. It pauses off screen, and under
  // reduced motion it paints one still frame (re-read every frame / change).
  // props: React, t, id, pops [{ key, label, tempC, M, phase, colour,
  //   region 'left'|'right'|'all', share }], plateau { kind 'melt'|'boil',
  //   frac } | null, theme 'light'|'dark'|'contrast', ariaLabel, description,
  //   live (announce description changes), height, seed, panel (style), ink.
  function heatLensPalette(theme) {
    if (theme === 'contrast') return { bg: '#000000', ink: '#ffffff', dim: '#ffffff', frame: '#ffffff', bond: 'rgba(255,255,255,0.45)', ring: '#ffff00', halo: '#000000' };
    if (theme === 'dark') return { bg: '#0b1120', ink: '#e2e8f0', dim: '#cbd5e1', frame: 'rgba(148,163,184,0.55)', bond: 'rgba(148,163,184,0.35)', ring: '#ffffff', halo: 'rgba(2,6,23,0.85)' };
    return { bg: '#f8fafc', ink: '#0f172a', dim: '#334155', frame: 'rgba(71,85,105,0.55)', bond: 'rgba(71,85,105,0.3)', ring: '#0f172a', halo: 'rgba(248,250,252,0.9)' };
  }
  // The lens counter on a plateau. `frac` is the share of particles moving
  // freely (melted or boiled off). Heating breaks bonds; freezing (dir
  // 'freeze', frac = still-liquid share) forms them, so it counts the rest.
  function heatLensBondCounter(plateau, n) {
    var total = Math.max(0, Math.round(n || 0));
    var free = Math.round(clamp(plateau && isFinite(plateau.frac) ? plateau.frac : 0, 0, 1) * total);
    return plateau && plateau.dir === 'freeze'
      ? { word: 'formed', k: total - free, n: total }
      : { word: 'broken', k: free, n: total };
  }
  function HeatParticleLens(props) {
    var React = props.React, h = React.createElement;
    var t = props.t || function (k, fb) { return fb; };
    var canvasRef = React.useRef(null);
    var propsRef = React.useRef(props);
    propsRef.current = props;
    var redrawRef = React.useRef(null);
    var pops = props.pops || [];
    var drawKey = JSON.stringify([pops.map(function (p) { return [Math.round(p.tempC * 100), p.phase, p.region, p.share, p.M]; }),
      props.plateau ? [props.plateau.kind, Math.round(props.plateau.frac * 1000), props.plateau.dir || ''] : null, props.theme]);

    React.useEffect(function () {
      var el = canvasRef.current;
      if (!el || typeof el.getContext !== 'function') return;
      var c = el.getContext('2d');
      if (!c) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var W = 0, H = 0;
      var seeds = heatLensParticles(HEAT_LENS_MAX, propsRef.current.seed || 11);
      var N = seeds.length;
      var st = seeds.map(function (p) { return { x: p.hx, y: p.hy, dir: p.ang, mode: null }; });
      // Rank of each particle by a random key, so "freed during the plateau"
      // is a stable, evenly spread subset of each population.
      var raf = 0, visible = true, last = 0, clock = 0, io = null, ro = null;
      function size() {
        W = el.width = Math.round((el.offsetWidth || 320) * dpr);
        H = el.height = Math.round((el.offsetHeight || 200) * dpr);
      }
      size();
      function assign(list) {
        var out = [], counts = [], total = 0, i;
        var shares = list.map(function (p) { return p.share > 0 ? p.share : 1; });
        var sum = shares.reduce(function (a, b) { return a + b; }, 0) || 1;
        list.forEach(function (p, k) { counts[k] = Math.round(N * shares[k] / sum); total += counts[k]; });
        if (list.length) counts[list.length - 1] += N - total;
        list.forEach(function (p, k) { for (i = 0; i < counts[k]; i++) out.push(k); });
        while (out.length < N) out.push(Math.max(0, list.length - 1));
        return { of: out, counts: counts };
      }
      function draw(dt) {
        var P = propsRef.current;
        var list = P.pops || [];
        var pal = heatLensPalette(P.theme);
        var u = function (px) { return px * dpr; };
        c.clearRect(0, 0, W, H);
        c.fillStyle = pal.bg;
        c.fillRect(0, 0, W, H);
        if (!list.length) return;
        var wide = W / dpr >= 440;
        var box = wide ? { x: u(6), y: u(6), w: W * 0.62 - u(9), h: H - u(12) } : { x: u(6), y: u(6), w: W - u(12), h: H * 0.64 - u(9) };
        var plot = wide ? { x: W * 0.62 + u(6), y: u(6), w: W * 0.38 - u(12), h: H - u(12) } : { x: u(6), y: H * 0.64 + u(3), w: W - u(12), h: H * 0.36 - u(9) };
        var asg = assign(list);
        var refM = Math.min.apply(null, list.map(function (p) { return p.M > 0 ? p.M : 0.03; }));
        var vis = function (p) { return Math.sqrt(heatKelvin(p.tempC) / (p.M > 0 ? p.M : 0.03)) / Math.sqrt(293.15 / refM); };
        var regionOf = function (p) {
          if (p.region === 'left') return [0, 0.5];
          if (p.region === 'right') return [0.5, 1];
          return [0, 1];
        };
        var plateau = P.plateau && list.length === 1 ? P.plateau : null;
        // ranks inside each population (stable from the seeds)
        var ranks = [], k;
        for (k = 0; k < list.length; k++) {
          var idx = [];
          for (var i0 = 0; i0 < N; i0++) if (asg.of[i0] === k) idx.push(i0);
          idx.sort(function (a, b) { return seeds[a].ph - seeds[b].ph; });
          idx.forEach(function (ii, r) { ranks[ii] = r; });
        }
        var freedCount = plateau ? Math.round(clamp(plateau.frac, 0, 1) * asg.counts[0]) : 0;
        // Lattice homes per population, laid out on a grid in its region.
        var homes = [], grid = {};
        for (k = 0; k < list.length; k++) {
          var rg = regionOf(list[k]);
          var n = asg.counts[k];
          var aw = box.w * (rg[1] - rg[0]), ah = box.h * 0.66;
          var cols = Math.max(1, Math.ceil(Math.sqrt(n * aw / Math.max(1, ah))));
          var rows = Math.max(1, Math.ceil(n / cols));
          var m = 0;
          for (var i1 = 0; i1 < N; i1++) {
            if (asg.of[i1] !== k) continue;
            var col = m % cols, row = Math.floor(m / cols);
            homes[i1] = { x: rg[0] + (rg[1] - rg[0]) * (col + 0.5) / cols, y: 0.34 + 0.66 * (row + 0.5) / rows, col: col, row: row, sp: Math.min((rg[1] - rg[0]) / cols, 0.66 / rows) };
            grid[k + ':' + col + ':' + row] = i1;
            m++;
          }
        }
        var modeOf = function (i) {
          var p = list[asg.of[i]];
          var phase = p.phase === 'gas' || p.phase === 'liquid' ? p.phase : 'solid';
          if (plateau && ranks[i] < freedCount) return plateau.kind === 'boil' ? 'gas' : 'liquid';
          return phase;
        };
        var pos = [];
        var BASE = 0.22;     // box widths per second for the lightest population at 20 C
        for (var i = 0; i < N; i++) {
          var pop = list[asg.of[i]];
          var mode = modeOf(i);
          var s = st[i];
          var hm = homes[i];
          var rgn = regionOf(pop);
          var speed = seeds[i].spd * vis(pop);
          if (mode === 'solid') {
            var amp = 0.18 * hm.sp * speed;
            var x = hm.x + amp * Math.cos(10 * clock + seeds[i].ph);
            var y = hm.y + amp * Math.sin(13 * clock + seeds[i].ang);
            s.x = x; s.y = y; s.mode = 'solid';
            pos.push([x, y, mode]);
            continue;
          }
          if (s.mode == null) {
            s.x = rgn[0] + (rgn[1] - rgn[0]) * seeds[i].hx;
            s.y = mode === 'gas' ? seeds[i].hy : 0.46 + 0.52 * seeds[i].hy;
          }
          s.mode = mode;
          // A liquid keeps a surface and stays packed below it; a gas fills the box.
          var yTop = mode === 'gas' ? 0.02 : 0.44;
          if (dt > 0) {
            if (mode === 'liquid') s.dir += (Math.random() - 0.5) * 18 * dt;
            var step = BASE * speed * dt * (mode === 'liquid' ? 0.55 : 1);
            s.x += Math.cos(s.dir) * step * (box.h / box.w);
            s.y += Math.sin(s.dir) * step;
          }
          var lo = rgn[0] + 0.01, hi = rgn[1] - 0.01;
          if (s.x < lo) { s.x = lo; s.dir = Math.PI - s.dir; }
          if (s.x > hi) { s.x = hi; s.dir = Math.PI - s.dir; }
          if (s.y < yTop) { s.y = yTop; s.dir = -s.dir; }
          if (s.y > 0.98) { s.y = 0.98; s.dir = -s.dir; }
          pos.push([s.x, s.y, mode]);
        }
        // box frame and the contact surface between two regions
        c.strokeStyle = pal.frame;
        c.lineWidth = Math.max(1, dpr);
        c.strokeRect(box.x, box.y, box.w, box.h);
        if (list.some(function (p) { return p.region === 'left'; })) {
          c.setLineDash([u(4), u(4)]);
          c.beginPath(); c.moveTo(box.x + box.w / 2, box.y); c.lineTo(box.x + box.w / 2, box.y + box.h); c.stroke();
          c.setLineDash([]);
        }
        var X = function (v) { return box.x + v * box.w; }, Y = function (v) { return box.y + v * box.h; };
        // bonds between neighbouring lattice particles that are still bound
        c.strokeStyle = pal.bond;
        c.lineWidth = Math.max(1, u(1));
        c.beginPath();
        for (i = 0; i < N; i++) {
          if (pos[i][2] !== 'solid') continue;
          var hh = homes[i], kk = asg.of[i];
          [[1, 0], [0, 1]].forEach(function (d) {
            var j = grid[kk + ':' + (hh.col + d[0]) + ':' + (hh.row + d[1])];
            if (j == null || pos[j][2] !== 'solid') return;
            c.moveTo(X(pos[i][0]), Y(pos[i][1])); c.lineTo(X(pos[j][0]), Y(pos[j][1]));
          });
        }
        c.stroke();
        var r = u(3.1);
        for (i = 0; i < N; i++) {
          var pp = list[asg.of[i]];
          var freed = plateau && ranks[i] < freedCount;
          c.fillStyle = pp.colour || '#fb923c';
          c.beginPath(); c.arc(X(pos[i][0]), Y(pos[i][1]), r, 0, 6.2832); c.fill();
          c.lineWidth = freed ? u(1.6) : Math.max(1, u(0.8));
          c.strokeStyle = freed ? pal.ring : pal.halo;
          c.stroke();
        }
        // legend and the plateau counter, with a halo so they read over particles
        var label = function (text, x, y, align, colour) {
          c.font = '700 ' + u(10) + 'px system-ui, sans-serif';
          c.textAlign = align; c.textBaseline = 'top';
          c.lineWidth = u(3); c.strokeStyle = pal.halo; c.strokeText(text, x, y);
          c.fillStyle = colour || pal.ink; c.fillText(text, x, y);
        };
        list.forEach(function (p, li) {
          var ly = box.y + u(4) + li * u(13);
          c.fillStyle = p.colour; c.beginPath(); c.arc(box.x + u(9), ly + u(5.5), u(3.5), 0, 6.2832); c.fill();
          label(p.label + ' · ' + fmt(p.tempC, 1) + ' °C', box.x + u(16), ly, 'left');
        });
        if (plateau) {
          // Freezing: the still-bound particles are the ones that have
          // locked into the crystal, so count bonds formed, not broken.
          var bc = heatLensBondCounter(plateau, asg.counts[0]);
          var counterText = bc.word === 'formed'
            ? t('stem.heatlab.lens_bonds_formed', 'bonds formed: {k} of {n}')
            : t('stem.heatlab.lens_bonds_counter', 'bonds broken: {k} of {n}');
          label(counterText.replace('{k}', String(bc.k)).replace('{n}', String(bc.n)),
            box.x + box.w - u(4), box.y + box.h - u(16), 'right');
        }
        // Maxwell distributions. One substance: speed in m/s. Several with
        // different particle masses: kinetic energy, which is what equal
        // temperatures make equal.
        var sameM = list.every(function (p) { return p.M === list[0].M; });
        var maxT = Math.max.apply(null, list.map(function (p) { return p.tempC; }));
        var xMax = sameM ? 2.6 * heatRmsSpeed(maxT, list[0].M) : 5 * HEAT_BOLTZMANN * heatKelvin(maxT);
        var pdf = function (p, x) { return sameM ? heatMaxwellSpeedPdf(x, p.tempC, p.M) : heatMaxwellEnergyPdf(x, p.tempC); };
        var SAMPLES = 48, peak = 0, curves = list.map(function (p) {
          var pts = [];
          for (var q = 0; q <= SAMPLES; q++) { var xv = xMax * q / SAMPLES; var yv = pdf(p, xv); pts.push([xv, yv]); if (yv > peak) peak = yv; }
          return pts;
        });
        c.strokeStyle = pal.frame;
        c.lineWidth = Math.max(1, dpr);
        c.strokeRect(plot.x, plot.y, plot.w, plot.h);
        var px0 = plot.x + u(6), pw = plot.w - u(12), py0 = plot.y + u(16), ph = plot.h - u(32);
        curves.forEach(function (pts, ci) {
          var p = list[ci];
          c.strokeStyle = p.colour;
          c.lineWidth = u(2);
          c.setLineDash(ci === 1 ? [u(5), u(3)] : ci === 2 ? [u(2), u(3)] : []);
          c.beginPath();
          pts.forEach(function (pt, pi) {
            var xx = px0 + pt[0] / xMax * pw, yy = py0 + ph - (peak > 0 ? pt[1] / peak : 0) * ph;
            if (pi === 0) c.moveTo(xx, yy); else c.lineTo(xx, yy);
          });
          c.stroke();
          c.setLineDash([]);
          var mean = sameM ? heatRmsSpeed(p.tempC, p.M) : heatMeanKineticJ(p.tempC);
          var mx = px0 + mean / xMax * pw;
          c.beginPath(); c.moveTo(mx, py0 + ph); c.lineTo(mx, py0 + ph - u(8)); c.stroke();
        });
        c.font = '700 ' + u(9) + 'px system-ui, sans-serif';
        c.fillStyle = pal.dim; c.textBaseline = 'top'; c.textAlign = 'left';
        c.fillText(sameM ? t('stem.heatlab.lens_axis_speed', 'particle speed (m/s)') : t('stem.heatlab.lens_axis_energy', 'energy per particle'), plot.x + u(5), plot.y + u(3));
        c.textBaseline = 'bottom';
        c.fillText('0', px0, plot.y + plot.h - u(3));
        c.textAlign = 'right';
        c.fillText(sameM ? fmt(xMax, 0) : fmt(xMax * 1e21, 0) + ' × 10⁻²¹ J', px0 + pw, plot.y + plot.h - u(3));
      }
      function frame(ts) {
        raf = 0;
        if (!el.isConnected) return;
        if (heatPrefersReducedMotion()) { draw(0); return; }
        var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
        last = ts;
        clock += dt;
        try { draw(dt); } catch (err) { console.error('Heat lab lens error:', err); return; }
        request();
      }
      function request() {
        if (!visible || raf) return;
        if (heatPrefersReducedMotion()) { draw(0); return; }
        raf = requestAnimationFrame(frame) || 0;
      }
      redrawRef.current = function () { if (!raf || heatPrefersReducedMotion()) draw(0); request(); };
      if (typeof ResizeObserver === 'function') {
        ro = new ResizeObserver(function () { size(); draw(0); });
        ro.observe(el);
      }
      if (typeof IntersectionObserver === 'function') {
        io = new IntersectionObserver(function (entries) {
          visible = !entries.length || entries[0].isIntersecting;
          if (visible) { last = 0; request(); }
          else if (raf) { cancelAnimationFrame(raf); raf = 0; }
        }, { rootMargin: '80px' });
        io.observe(el);
      }
      try { draw(0); } catch (err0) { console.error('Heat lab lens error:', err0); }
      request();
      return function () {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        if (io) io.disconnect();
        if (ro) ro.disconnect();
        redrawRef.current = null;
      };
    }, []);
    React.useEffect(function () { if (redrawRef.current) redrawRef.current(); }, [drawKey]);

    var descId = props.id + '-desc';
    return h('div', { id: props.id, 'data-ht-lens': props.id, 'data-ht-lens-bonds': props.plateau ? heatLensBondCounter(props.plateau, 100).word : undefined,
      className: 'mt-2 rounded-lg border p-2', style: props.panel || null },
      h('div', { className: 'rounded-md overflow-hidden', style: { height: (props.height || 200) + 'px' } },
        h('canvas', {
          ref: canvasRef, role: 'img',
          'aria-label': props.ariaLabel || t('stem.heatlab.lens_aria', 'Particle zoom lens'),
          'aria-describedby': descId,
          style: { width: '100%', height: '100%', display: 'block' }
        })),
      h('p', {
        id: descId,
        role: props.live ? 'status' : undefined, 'aria-live': props.live ? 'polite' : undefined, 'aria-atomic': props.live ? 'true' : undefined,
        className: 'text-[0.6875rem] mt-1.5 leading-relaxed', style: { color: props.ink }
      }, props.description),
      props.children || null
    );
  }

  // Pure models, shared by the UI, the tests and other tools. Kitchen, Weld and
  // Water Cycle can reach them as window.StemLab._heat instead of copying them.
  // Stage D: the data tables, for render-time translation by id.
  var HEAT_TABLES = { materials: MATERIALS, substances: SUBSTANCES, engines: ENGINES, everyday: EVERYDAY, expansion: EXPANSION,
    wallLayers: WALL_LAYERS, parts3d: HEAT_3D_PARTS, flow3d: HEAT_3D_FLOW };
  var HEAT_MODELS = {
    finishC: HEAT_FINISH_C,
    barLength: HEAT_BAR_LENGTH,
    barNodes: HEAT_BAR_NODES,
    barArea: HEAT_BAR_AREA,
    hotMin: HEAT_HOT_MIN,
    hotMax: HEAT_HOT_MAX,
    timeScales: HEAT_TIME_SCALES.slice(),
    skinEffusivity: HEAT_SKIN_EFFUSIVITY,
    water: HEAT_WATER,
    diffusivity: heatDiffusivity,
    advanceBar: heatAdvanceBar,
    raceState: heatRaceState,
    raceAdvance: heatRaceAdvance,
    barStoredJ: heatBarStoredJ,
    barFlux: heatBarFlux,
    steadyFlowW: heatSteadyFlowW,
    midpointAnalytic: heatMidpointAnalytic,
    midReachTime: heatMidReachTime,
    racePrediction: heatRacePrediction,
    autoTimeScale: heatAutoTimeScale,
    autoWallS: HEAT_AUTO_WALL_S,
    effusivity: heatEffusivity,
    contactTemperature: heatContactTemperature,
    twoBodyEquilibrium: heatTwoBodyEquilibrium,
    logAppend: heatLogAppend,
    mixSignature: heatMixSignature,
    mixTemperature: heatMixTemperature,
    mixExplanation: heatMixExplanation,
    waterState: heatWaterState,
    waterStages: heatWaterStages,
    coolingTemperature: heatCoolingTemperature,
    coolingCurve: heatCoolingCurve,
    mugTimeConstantS: heatMugTimeConstantS,
    radiation: heatRadiationModel,
    heatPump: heatPumpModel,
    heatPumpChartDomain: HEAT_PUMP_CHART_DOMAIN,
    timeLabel: heatTimeLabel,
    misconceptions: heatMisconceptions,
    poeCards: heatPoeCards,
    // stage B
    molarMass: HEAT_MOLAR_MASS,
    lensMax: HEAT_LENS_MAX,
    rmsSpeed: heatRmsSpeed,
    speedRatio: heatSpeedRatio,
    meanKineticJ: heatMeanKineticJ,
    maxwellSpeedPdf: heatMaxwellSpeedPdf,
    maxwellEnergyPdf: heatMaxwellEnergyPdf,
    phaseChangeCount: heatPhaseChangeCount,
    lensParticles: heatLensParticles,
    touchTest: heatTouchTest,
    irColour: heatIrColour,
    mugSurfaceC: heatMugSurfaceC,
    wallLayerMm: HEAT_WALL_MM,
    wallProfile: heatWallProfile,
    logKinds: heatLogKinds,
    logColumns: heatLogColumns,
    logNumericColumns: heatLogNumericColumns,
    logSorted: heatLogSorted,
    csvCell: heatCsvCell,
    logToCsv: heatLogToCsv,
    // stage C
    investigations: heatInvestigations,
    cerRubric: HEAT_CER_RUBRIC,
    fluids: HEAT_FLUIDS,
    raOnset: HEAT_RA_ONSET,
    raPlumes: HEAT_RA_PLUMES,
    rayleigh: heatRayleigh,
    nusselt: heatNusselt,
    convection: heatConvectionModel,
    surfaces: HEAT_SURFACES,
    surfaceSun: heatSurfaceSun,
    flask: HEAT_FLASK,
    flaskPaths: heatFlaskPaths,
    flaskModel: heatFlaskModel,
    phaseSubstances: HEAT_PHASE_SUBS,
    phaseStages: heatPhaseStages,
    phaseState: heatPhaseState,
    phaseHeating: heatPhaseHeating,
    phaseCooling: heatPhaseCooling,
    cooler: HEAT_COOLER,
    coolerShells: HEAT_COOLER_SHELLS,
    coolerLiners: HEAT_COOLER_LINERS,
    coolerSeals: HEAT_COOLER_SEALS,
    coolerFoil: HEAT_COOLER_FOIL,
    coolerDesign: heatCoolerDesign,
    coolerModel: heatCoolerModel,
    coolerUpgrades: heatCoolerUpgrades,
    // stage D
    lensBondCounter: heatLensBondCounter,
    house: HEAT_HOUSE,
    houseDays: HEAT_HOUSE_DAYS,
    climates: HEAT_CLIMATES,
    houseOrient: HEAT_HOUSE_ORIENT,
    houseLayerCost: HEAT_HOUSE_LAYER_COST,
    houseWalls: HEAT_HOUSE_WALLS,
    houseRoofMm: HEAT_HOUSE_ROOF_MM,
    houseFloors: HEAT_HOUSE_FLOORS,
    houseGlazing: HEAT_HOUSE_GLAZING,
    houseAir: HEAT_HOUSE_AIR,
    houseWallR: heatHouseWallR,
    houseDesign: heatHouseDesign,
    houseModel: heatHouseModel,
    sonify: HEAT_SONIFY,
    plateaus: heatPlateaus,
    sonifyPlan: heatSonifyPlan,
    sonifyPlay: heatSonifyPlay,
    tickIntervalMs: heatTickIntervalMs,
    describeSeries: heatDescribeSeries
  };
  try { window.StemLab._heat = HEAT_MODELS; } catch (e) {}

  // Contrast theme: hovered buttons, owned by this tool (allo-heatlab-hc-extra-css).
  (function() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-heatlab-hc-extra-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-heatlab-hc-extra-css';
    st.textContent = ".theme-contrast [data-stem-tool-shell=\"heatLab\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h){background-color:#00ff00!important;background-image:none!important;color:#000!important;-webkit-text-fill-color:#000!important}.theme-contrast [data-stem-tool-shell=\"heatLab\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h) *{color:#000!important;-webkit-text-fill-color:#000!important}.theme-contrast [data-stem-tool-shell=\"heatLab\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h) *:not(:empty):not(svg,svg *,canvas,img,video){background-color:#00ff00!important;background-image:none!important}";
    document.head.appendChild(st);
  })();
  window.StemLab.registerTool('heatLab', {
    icon: '🌡️',
    label: 'Heat & Thermodynamics Lab',
    desc: 'Conduction, convection and radiation on a real heat-equation model; insulation R-values; calorimetry mixing; the water heating curve with its two latent plateaus; and why no heat engine reaches 100 percent.',
    color: 'orange',
    category: 'science',
    gradeRange: '7-12',
    aliases: ['thermodynamics', 'heat', 'heat transfer', 'conduction', 'convection', 'radiation', 'insulation',
      'specific heat', 'calorimetry', 'latent heat', 'phase change', 'heating curve', 'entropy', 'carnot',
      'heat engine', 'thermal', 'temperature', 'R-value', 'second law'],

    // Exposed as pure calculations so tests verify the same code the UI uses.
    models: HEAT_MODELS,

    // Quest hooks measure deliberate acts, never "you opened the panel".
    questHooks: [
      { id: 'heat_transfer_run', label: __alloT('stem.heatlab.quest_transfer_run', 'Run all three heat transfer modes'), icon: '🔥',
        check: function (d) { return !!(d && d.modesSeen && d.modesSeen.length >= 3); } },
      { id: 'heat_material_compare', label: __alloT('stem.heatlab.quest_material_compare', 'Compare three materials in the bar'), icon: '🧱',
        check: function (d) { return !!(d && d.materialsTried && d.materialsTried.length >= 3); } },
      { id: 'heat_insulation', label: __alloT('stem.heatlab.quest_insulation', 'Keep the mug above 65 °C for an hour'), icon: '🧣',
        check: function (d) { return !!(d && d.insulationWin); } },
      { id: 'heat_calorimetry', label: __alloT('stem.heatlab.quest_calorimetry', 'Estimate a mixing temperature within 2 °C'), icon: '⚖️',
        check: function (d) { return !!(d && (d.mixWins || 0) >= 1); } },
      { id: 'heat_curve', label: __alloT('stem.heatlab.quest_curve', 'Take water all the way from ice to steam'), icon: '♨️',
        check: function (d) { return !!(d && d.curveComplete); } },
      // Counts engines the learner JUDGED (which loss is bigger), not rows opened.
      { id: 'heat_engine', label: __alloT('stem.heatlab.quest_engine', 'Compare three engines against the Carnot limit'), icon: '⚙️',
        check: function (d) { return !!(d && d.enginesJudged && Object.keys(d.enginesJudged).length >= 3); } },
      { id: 'heat_wall', label: __alloT('stem.heatlab.quest_wall', 'Build a wall that meets 0.18 W/m²K'), icon: '🧱',
        check: function (d) { return !!(d && d.wallMet); } },
      { id: 'heat_3d', label: __alloT('stem.heatlab.quest_3d', 'Inspect three parts of the 3D convection tank'), icon: '🧊',
        check: function (d) { return !!(d && (d.parts3d || []).length >= 3); } },
      // Counts cases where the learner NAMED a mechanism, not cards opened.
      { id: 'heat_everyday', label: __alloT('stem.heatlab.quest_everyday', 'Explain three everyday cases'), icon: '🌍',
        check: function (d) { return !!(d && d.everydayAnswers && Object.keys(d.everydayAnswers).length >= 3); } },
      { id: 'heat_poe', label: __alloT('stem.heatlab.quest_poe', 'Predict, check and explain three heat ideas'), icon: '🔮',
        check: function (d) {
          if (!d || !d.poe) return false;
          return Object.keys(d.poe).filter(function (k) { return d.poe[k] && d.poe[k].explained; }).length >= 3;
        } },
      // Stage C: a completed investigation (claim, two or more notebook rows,
      // reasoning, self-check), and a cooler the learner built that met the brief.
      { id: 'heat_cer', label: __alloT('stem.heatlab.quest_cer', 'Complete a claim-evidence-reasoning investigation'), icon: '🔬',
        check: function (d) {
          if (!d || !d.cer || typeof d.cer !== 'object') return false;
          return Object.keys(d.cer).some(function (k) { return d.cer[k] && d.cer[k].completed === true; });
        } },
      { id: 'heat_cooler', label: __alloT('stem.heatlab.quest_cooler', 'Design a cooler that keeps the ice frozen for 4 hours'), icon: '❄️',
        check: function (d) { return !!(d && d.clBadge); } },
      // Stage D: a house the learner changed and tested that meets the brief.
      { id: 'heat_house', label: __alloT('stem.heatlab.quest_house', 'Design a house that meets the passive house brief'), icon: '🏠',
        check: function (d) { return !!(d && d.hsBadge); } }
    ],

    render: function (ctx) {
      try { __alloCtx_heatlab = ctx; } catch (e) {}
      var React = ctx.React;
      var h = React.createElement;
      // Never let a missing key reach the page as "undefined" or as the raw key.
      var t = function (k, fb) {
        var v = null;
        try { v = typeof ctx.t === 'function' ? ctx.t(k, fb) : null; } catch (e) { v = null; }
        return (v == null || v === k) ? (fb != null ? fb : k) : v;
      };
      // Stage D i18n: the module data tables, translated at render time by id.
      // The module arrays (and the tests' `var MATERIALS = [` anchors) stay as
      // they are; these copies shadow them inside render only. Rows without an
      // id (engines, everyday cases) keep `key`, the English name that saved
      // answers are keyed by.
      var htFmt = function (s, args) {
        return __alloOneWord(String(s).replace(/\{(\d+)\}/g, function (m, n) { var v = args[Number(n)]; return v == null ? '' : String(v); }));
      };
      function htLocalise(list, text, byName) {
        return list.map(function (row) {
          var tr = text[byName ? row.name : row.id] || {};
          return Object.assign({}, row, tr, byName ? { key: row.name } : null);
        });
      }
      var MATERIALS = htLocalise(HEAT_TABLES.materials, {
        'copper': { name: t('stem.heatlab.mat_copper_name', 'Copper'), note: t('stem.heatlab.mat_copper_note', 'The best common conductor. Used for pan bases and heat sinks precisely because heat races through it.') },
        'aluminium': { name: t('stem.heatlab.mat_aluminium_name', 'Aluminium'), note: t('stem.heatlab.mat_aluminium_note', 'Two-thirds of copper’s conductivity at a third of the weight, which is why radiators and laptop bodies use it.') },
        'steel': { name: t('stem.heatlab.mat_steel_name', 'Steel'), note: t('stem.heatlab.mat_steel_note', 'Eight times worse than copper. A steel pan handle stays touchable far longer than a copper one.') },
        'glass': { name: t('stem.heatlab.mat_glass_name', 'Glass'), note: t('stem.heatlab.mat_glass_note', 'Four hundred times worse than copper. Single-pane windows still lose heat fast because they are thin.') },
        'water': { name: t('stem.heatlab.mat_water_name', 'Still water'), note: t('stem.heatlab.mat_water_note', 'A poor conductor but an enormous heat store. That huge specific heat is why oceans steady the climate. Modelled as gelled, perfectly still water: real liquid water would start convecting and move heat much faster.') },
        'wood': { name: t('stem.heatlab.mat_wood_name', 'Wood'), note: t('stem.heatlab.mat_wood_note', 'A natural insulator. A wooden spoon in a hot pan never burns your hand the way a metal one does.') },
        'fibre': { name: t('stem.heatlab.mat_fibre_name', 'Fibreglass'), note: t('stem.heatlab.mat_fibre_note', 'Loft insulation. The glass itself conducts; the trapped still air between the fibres is what actually insulates.') },
        'aerogel': { name: t('stem.heatlab.mat_aerogel_name', 'Aerogel'), note: t('stem.heatlab.mat_aerogel_note', 'Almost entirely air held in a silica lattice. NASA used it on Mars rovers to survive the overnight cold.') }
      });
      var SUBSTANCES = htLocalise(HEAT_TABLES.substances, {
        'water': { name: t('stem.heatlab.sub_water_name', 'Water') },
        'oil': { name: t('stem.heatlab.sub_oil_name', 'Olive oil') },
        'ethanol': { name: t('stem.heatlab.sub_ethanol_name', 'Ethanol') },
        'sand': { name: t('stem.heatlab.sub_sand_name', 'Dry sand') },
        'alum': { name: t('stem.heatlab.sub_alum_name', 'Aluminium') },
        'iron': { name: t('stem.heatlab.sub_iron_name', 'Iron') },
        'copper': { name: t('stem.heatlab.sub_copper_name', 'Copper') }
      });
      var ENGINES = htLocalise(HEAT_TABLES.engines, {
        'Car petrol engine': { name: t('stem.heatlab.eng_car_petrol_engine_name', 'Car petrol engine'), note: t('stem.heatlab.eng_car_petrol_engine_note', 'Most of the fuel energy leaves as hot exhaust and radiator heat, not motion.') },
        'Coal power station': { name: t('stem.heatlab.eng_coal_power_station_name', 'Coal power station'), note: t('stem.heatlab.eng_coal_power_station_note', 'Steam turbines run near their practical ceiling; the waste heat goes up the cooling towers.') },
        'Combined-cycle gas': { name: t('stem.heatlab.eng_combined_cycle_gas_name', 'Combined-cycle gas'), note: t('stem.heatlab.eng_combined_cycle_gas_note', 'A gas turbine’s exhaust drives a second steam turbine, so less heat is thrown away.') },
        'Nuclear (PWR)': { name: t('stem.heatlab.eng_nuclear_pwr_name', 'Nuclear (PWR)'), note: t('stem.heatlab.eng_nuclear_pwr_note', 'Limited by how hot the water loop is allowed to get, not by the reaction itself.') },
        'Human body (muscle)': { name: t('stem.heatlab.eng_human_body_muscle_name', 'Human body (muscle)'), note: t('stem.heatlab.eng_human_body_muscle_note', 'Not a heat engine at all — muscle converts chemical energy directly, which is why it beats its Carnot figure.') }
      }, true);
      var EVERYDAY = htLocalise(HEAT_TABLES.everyday, {
        'Vacuum flask': { name: t('stem.heatlab.day_vacuum_flask_name', 'Vacuum flask'), mech: t('stem.heatlab.day_vacuum_flask_mech', 'All three, blocked'), desc: t('stem.heatlab.day_vacuum_flask_desc', 'The vacuum stops conduction and convection because there is no matter to carry heat. The silvered wall reflects radiation back. The only real leak is the stopper and the thin glass neck.') },
        'Double glazing': { name: t('stem.heatlab.day_double_glazing_name', 'Double glazing'), mech: t('stem.heatlab.day_double_glazing_mech', 'Convection, slowed'), desc: t('stem.heatlab.day_double_glazing_desc', 'The gap is too narrow for a convection current to get going, and it is often filled with argon, which conducts worse than air.') },
        'Car radiator': { name: t('stem.heatlab.day_car_radiator_name', 'Car radiator'), mech: t('stem.heatlab.day_car_radiator_mech', 'Convection, forced'), desc: t('stem.heatlab.day_car_radiator_desc', 'Fins add surface area and the fan forces air across them. Forced convection moves far more heat than letting air drift past.') },
        'Penguin huddle': { name: t('stem.heatlab.day_penguin_huddle_name', 'Penguin huddle'), mech: t('stem.heatlab.day_penguin_huddle_mech', 'Conduction + wind'), desc: t('stem.heatlab.day_penguin_huddle_desc', 'Huddling cuts the exposed surface area per bird and blocks wind chill. Penguins rotate so nobody stays on the cold edge.') },
        'Wetsuit': { name: t('stem.heatlab.day_wetsuit_name', 'Wetsuit'), mech: t('stem.heatlab.day_wetsuit_mech', 'Conduction, trapped'), desc: t('stem.heatlab.day_wetsuit_desc', 'Neoprene traps a thin layer of water your body warms. Water conducts heat about 25 times better than air, so without the suit you lose heat fast.') },
        'Sweating': { name: t('stem.heatlab.day_sweating_name', 'Sweating'), mech: t('stem.heatlab.day_sweating_mech', 'Evaporation'), desc: t('stem.heatlab.day_sweating_desc', 'Turning sweat to vapour costs about 2,420 kJ per kilogram at skin temperature, taken straight from your skin. It stops working when humidity is too high for the vapour to leave.') },
        'Sea breeze': { name: t('stem.heatlab.day_sea_breeze_name', 'Sea breeze'), mech: t('stem.heatlab.day_sea_breeze_mech', 'Convection, driven'), desc: t('stem.heatlab.day_sea_breeze_desc', 'Land heats faster than sea because rock has a much lower specific heat. The warm air over land rises and cool sea air flows in underneath.') },
        'Oven mitt': { name: t('stem.heatlab.day_oven_mitt_name', 'Oven mitt'), mech: t('stem.heatlab.day_oven_mitt_mech', 'Conduction, resisted'), desc: t('stem.heatlab.day_oven_mitt_desc', 'Thick fabric full of still air. It fails the moment it gets wet, because water conducts heat far better than the trapped air it replaces.') }
      }, true);
      var EXPANSION = htLocalise(HEAT_TABLES.expansion, {
        'invar': { name: t('stem.heatlab.exp_invar_name', 'Invar'), note: t('stem.heatlab.exp_invar_note', 'A nickel-iron alloy designed to barely move. Used in precision instruments and old clock pendulums.') },
        'pyrex': { name: t('stem.heatlab.exp_pyrex_name', 'Borosilicate'), note: t('stem.heatlab.exp_pyrex_note', 'Pyrex. It survives the oven-to-worktop shock that shatters ordinary glass, because the inside and outside expand almost equally.') },
        'glass': { name: t('stem.heatlab.exp_glass_name', 'Window glass'), note: t('stem.heatlab.exp_glass_note', 'Nearly three times more than borosilicate, which is exactly why pouring boiling water into a cold tumbler cracks it.') },
        'steel': { name: t('stem.heatlab.exp_steel_name', 'Steel'), note: t('stem.heatlab.exp_steel_note', 'Rails, bridges and reinforcing bar. Its near-match to concrete is what makes reinforced concrete possible at all.') },
        'concrete': { name: t('stem.heatlab.exp_concrete_name', 'Concrete'), note: t('stem.heatlab.exp_concrete_note', 'Almost identical to steel. If the two differed much, every reinforced structure would tear itself apart through the seasons.') },
        'copper': { name: t('stem.heatlab.exp_copper_name', 'Copper'), note: t('stem.heatlab.exp_copper_note', 'Copper pipe in a long hot-water run needs expansion loops, or it buckles and creaks.') },
        'alum': { name: t('stem.heatlab.exp_alum_name', 'Aluminium'), note: t('stem.heatlab.exp_alum_note', 'Twice steel. Aircraft skins and large aluminium roofs need generous allowance for movement.') }
      });
      var WALL_LAYERS = htLocalise(HEAT_TABLES.wallLayers, {
        'brick': { name: t('stem.heatlab.layer_brick_name', 'Brick, 100 mm'), note: t('stem.heatlab.layer_brick_note', 'Structural, not insulating. A solid brick wall is a poor thermal barrier however thick it looks.') },
        'block': { name: t('stem.heatlab.layer_block_name', 'Concrete block, 100 mm'), note: t('stem.heatlab.layer_block_note', 'Even worse than brick per millimetre. Dense materials conduct.') },
        'cavity': { name: t('stem.heatlab.layer_cavity_name', 'Air cavity, 50 mm'), note: t('stem.heatlab.layer_cavity_note', 'Still air insulates well. The catch is that a wide cavity lets convection start, which is why 50 mm beats 200 mm.') },
        'mineral': { name: t('stem.heatlab.layer_mineral_name', 'Mineral wool, 100 mm'), note: t('stem.heatlab.layer_mineral_note', 'The workhorse. Traps air in fibres so it cannot circulate — you get the air’s low conductivity without the convection.') },
        'pir': { name: t('stem.heatlab.layer_pir_name', 'PIR board, 50 mm'), note: t('stem.heatlab.layer_pir_note', 'Rigid foam with low-conductivity gas in closed cells. Half the thickness of mineral wool for the same resistance.') },
        'plaster': { name: t('stem.heatlab.layer_plaster_name', 'Plasterboard, 12 mm'), note: t('stem.heatlab.layer_plaster_note', 'Finish, not insulation. Included because it is easy to imagine it helping when it barely does.') },
        'timber': { name: t('stem.heatlab.layer_timber_name', 'Timber, 20 mm'), note: t('stem.heatlab.layer_timber_note', 'Modest but not nothing. Timber studs bridging the insulation are a real weak point in a wall.') },
        'glazing': { name: t('stem.heatlab.layer_glazing_name', 'Double glazing unit'), note: t('stem.heatlab.layer_glazing_note', 'Far better than single glass, far worse than any insulated wall. Windows are usually the weakest element.') }
      });
      var HEAT_3D_PARTS = htLocalise(HEAT_TABLES.parts3d, {
        'heater': { label: t('stem.heatlab.part3d_heater_label', 'Heated base'), desc: t('stem.heatlab.part3d_heater_desc', 'Energy enters here. The fluid touching the plate warms, expands, and becomes less dense than the fluid above it.') },
        'plume': { label: t('stem.heatlab.part3d_plume_label', 'Rising plume'), desc: t('stem.heatlab.part3d_plume_desc', 'Warm, less dense fluid is pushed upward by the denser fluid around it. Nothing pulls it up — it is buoyancy, the same force that lifts a cork.') },
        'ceiling': { label: t('stem.heatlab.part3d_ceiling_label', 'Cool ceiling'), desc: t('stem.heatlab.part3d_ceiling_desc', 'At the top the fluid gives its heat to the cold surface, contracts, and becomes dense again.') },
        'downdraft': { label: t('stem.heatlab.part3d_downdraft_label', 'Sinking edges'), desc: t('stem.heatlab.part3d_downdraft_desc', 'Cooled dense fluid falls back down the sides. This is the return half of the loop, and it is why the middle can keep rising.') },
        'tank': { label: t('stem.heatlab.part3d_tank_label', 'Tank walls'), desc: t('stem.heatlab.part3d_tank_desc', 'The container. Change its shape and the roll changes with it — convection cells take the form the boundary allows.') }
      });
      var HEAT_3D_FLOW = htLocalise(HEAT_TABLES.flow3d, {
        'heater': { label: t('stem.heatlab.flow3d_heater_label', 'Heat in'), hint: t('stem.heatlab.flow3d_heater_hint', 'warm + expand') },
        'plume': { label: t('stem.heatlab.flow3d_plume_label', 'Rise'), hint: t('stem.heatlab.flow3d_plume_hint', 'buoyancy') },
        'ceiling': { label: t('stem.heatlab.flow3d_ceiling_label', 'Cool'), hint: t('stem.heatlab.flow3d_ceiling_hint', 'release heat') },
        'downdraft': { label: t('stem.heatlab.flow3d_downdraft_label', 'Sink'), hint: t('stem.heatlab.flow3d_downdraft_hint', 'denser fluid') },
        'tank': { label: t('stem.heatlab.flow3d_tank_label', 'Contain'), hint: t('stem.heatlab.flow3d_tank_hint', 'shape the loop') }
      });
      var announceToSR = ctx.announceToSR;
      var setToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var awardXP = ctx.awardXP;
      var celebrate = ctx.celebrate;
      var beep = ctx.beep;
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;
      // High contrast is its own theme, not "dark": the host passes isContrast /
      // theme 'contrast' and a palette. Contrast keeps the dark base (black
      // stage) and then overrides surfaces, ink and canvases below.
      var isContrast = ctx.isContrast === true || ctx.theme === 'contrast';
      var isDark = isContrast || ctx.theme !== 'light';
      var hcPal = isContrast
        ? Object.assign({ bg: '#000000', text: '#ffffff', textMuted: '#ffffff', border: '#fbbf24', accent: '#fbbf24' }, ctx.pal && typeof ctx.pal === 'object' ? ctx.pal : {})
        : null;
      // Accent hues were originally chosen for the dark lab canvas. Preserve
      // those colors in dark mode, but use their deeper, WCAG-safe partners
      // whenever the host supplies the light theme.
      var lightInk = {
        '#fb923c': '#c2410c', '#fbbf24': '#92400e', '#16a34a': '#166534',
        '#84cc16': '#3f6212', '#4d7c0f': '#365314', '#f43f5e': '#be123c',
        '#0284c7': '#0369a1', '#a78bfa': '#6d28d9', '#34d399': '#047857',
        '#f59e0b': '#92400e', '#f472b6': '#9d174d', '#22d3ee': '#0e7490',
        '#60a5fa': '#1d4ed8', '#0891b2': '#155e75', '#94a3b8': '#475569',
        '#7dd3fc': '#0369a1', '#38bdf8': '#0369a1', '#c4b5fd': '#6d28d9', '#a3e635': '#3f6212'
      };
      var darkInk = {
        '#64748b': '#94a3b8', '#a16207': '#fbbf24', '#71717a': '#d4d4d8',
        '#1d4ed8': '#60a5fa', 'rgb(29,78,216)': '#60a5fa', '#0891b2': '#22d3ee'
      };
      function ink(color) {
        if (typeof color !== 'string') return color;
        return (isDark ? darkInk : lightInk)[color.toLowerCase()] || color;
      }

      // Every hook is declared unconditionally, before any branching. Declaring a
      // hook after a render-time conditional is the TDZ crash class that has bitten
      // other tools in this lab on navigation.
      var canvasRef = React.useRef(null);
      // Fullscreen stage: the wrapper (stage + its controls) is what fills the
      // screen, not the bare canvas, so the mode pills stay reachable. The canvas
      // itself re-measures through the ResizeObserver already watching it.
      var heatStageRef = React.useRef(null);
      var stHeatFs = React.useState(false);
      var heatFs = stHeatFs[0], setHeatFs = stHeatFs[1];
      var animRef = React.useRef(0);
      var roRef = React.useRef(null);
      var coolRef = React.useRef(null);
      var curveRef = React.useRef(null);
      var entropyRef = React.useRef(null);
      var hpRef = React.useRef(null);
      var initialHeatLabState = (ctx.toolData && ctx.toolData._heatLab) || {};
      var initialMixEstimate = initialHeatLabState.mixEstimateResult && typeof initialHeatLabState.mixEstimateResult.estimated === 'number'
        ? initialHeatLabState.mixEstimateResult
        : null;
      var stPredict = React.useState(initialMixEstimate ? String(initialMixEstimate.estimated) : '');
      var predictText = stPredict[0], setPredictText = stPredict[1];
      var stReveal = React.useState(!!initialMixEstimate);
      var revealed = stReveal[0], setRevealed = stReveal[1];
      var st3d = React.useState(HEAT_VIEWER.status ? HEAT_VIEWER.status() : 'idle');
      var view3dStatus = st3d[0], setView3dStatus = st3d[1];
      var stTables = React.useState({});
      var tableVisibility = stTables[0], setTableVisibility = stTables[1];
      var stRaceStatus = React.useState(htFmt(t('stem.heatlab.bars_begin_at_20_c_the', 'Bars begin at 20 °C. The finish line is {0} °C at the midpoint.'), [HEAT_FINISH_C]));
      var raceStatus = stRaceStatus[0], setRaceStatus = stRaceStatus[1];
      var prefersReducedMotion = heatPrefersReducedMotion();
      // Conduction race plumbing. The simulation lives in a ref so a theme
      // change or a time-scale change never wipes a race in progress; React
      // only sees a throttled snapshot (raceLive) for readouts.
      var probeChartRef = React.useRef(null);
      var raceSimRef = React.useRef(null);
      var probeDragRef = React.useRef(null);
      var stRaceLive = React.useState(null);
      var raceLive = stRaceLive[0], setRaceLive = stRaceLive[1];
      var stRacePaused = React.useState(false);
      var racePaused = stRacePaused[0], setRacePaused = stRacePaused[1];
      var stKAlpha = React.useState(false);
      var kAlphaOpen = stKAlpha[0], setKAlphaOpen = stKAlpha[1];
      // Stage B: thermal-camera canvases, the two-block charts, the notebook
      // plot, and the notebook's inline confirm and export messages.
      var mugIrRef = React.useRef(null);
      var wallIrRef = React.useRef(null);
      var touchIrRef = React.useRef(null);
      var eqTRef = React.useRef(null);
      var eqSRef = React.useRef(null);
      var nbPlotRef = React.useRef(null);
      var stNbConfirm = React.useState(null);
      var nbConfirm = stNbConfirm[0], setNbConfirm = stNbConfirm[1];
      var stNbMsg = React.useState('');
      var nbMsg = stNbMsg[0], setNbMsg = stNbMsg[1];
      // Stage C: flask, heating-over-time, cooler and trade-off charts, and
      // the AI coach's reply for an investigation (session only).
      var flaskRef = React.useRef(null);
      var hcTimeRef = React.useRef(null);
      var coolerRef = React.useRef(null);
      var tradeRef = React.useRef(null);
      var stCerHint = React.useState('');
      var cerHint = stCerHint[0], setCerHint = stCerHint[1];
      // Stage D: "Show the maths" / "Go further" / vocabulary / describe
      // disclosures (session only), the sound in progress, the ticking
      // thermometer, throttled announcements and the teacher panel. Audio
      // handles and any own AudioContext live in refs, never in toolData.
      var stMathsOpen = React.useState({});
      var mathsOpen = stMathsOpen[0], setMathsOpen = stMathsOpen[1];
      var stVocab = React.useState('');
      var vocabOpen = stVocab[0], setVocabOpen = stVocab[1];
      var stDescribe = React.useState({});
      var describeOpen = stDescribe[0], setDescribeOpen = stDescribe[1];
      var stHearing = React.useState('');
      var hearing = stHearing[0], setHearing = stHearing[1];
      var stTick = React.useState(false);
      var tickOn = stTick[0], setTickOn = stTick[1];
      var stAccessMsg = React.useState(null);
      var accessMsg = stAccessMsg[0], setAccessMsg = stAccessMsg[1];
      var stTeacherMsg = React.useState('');
      var teacherMsg = stTeacherMsg[0], setTeacherMsg = stTeacherMsg[1];
      var playRef = React.useRef(null);
      var ownAcRef = React.useRef(null);
      var tickTempRef = React.useRef({ T: 20, lo: 20, hi: 200 });
      var announceRef = React.useRef({ at: 0, keys: {} });
      var phaseSeenRef = React.useRef({});
      var keyCacheRef = React.useRef(null);
      // Engagement pass (2026-11-04): the topic menu / settings popover
      // ('' | 'topics' | 'settings'), their toggle buttons, the section to
      // focus after a topic switch renders, the "drag me" hint on P1 (until a
      // thermometer is moved this session) and the canvas focus hint.
      var stHtMenu = React.useState('');
      var htMenu = stHtMenu[0], setHtMenu = stHtMenu[1];
      var topicsBtnRef = React.useRef(null);
      var settingsBtnRef = React.useRef(null);
      var pendingFocusRef = React.useRef(null);
      var stProbeHint = React.useState(true);
      var probeHintOn = stProbeHint[0], setProbeHintOn = stProbeHint[1];
      var stCanvasFocus = React.useState(false);
      var canvasFocus = stCanvasFocus[0], setCanvasFocus = stCanvasFocus[1];

      var d = initialHeatLabState;

      function upd(patch) {
        setToolData(function (prev) {
          var cur = Object.assign({}, (prev && prev._heatLab) || {}, patch);
          var next = Object.assign({}, prev);
          next._heatLab = cur;
          return next;
        });
      }
      function resetMixEstimate(patch) {
        upd(Object.assign({}, patch || {}, {
          mixEstimateResult: null,
          mixEstimateRevision: '',
          mixEstimateReflection: '',
          mixEstimateReflectionComplete: false
        }));
        setPredictText('');
        setRevealed(false);
      }
      function pushOnce(key, value) {
        pushAll(key, [value]);
      }
      // Several values into one list in ONE patch: two pushOnce calls in the
      // same handler both read the same stale list and the second erased the
      // first.
      function pushAll(key, values) {
        var list = d[key] || [];
        var next = list.slice();
        values.forEach(function (v) { if (next.indexOf(v) === -1) next.push(v); });
        if (next.length === list.length) return;
        var patch = {};
        patch[key] = next;
        upd(patch);
      }
      // Trial log (toolData._heatLab.log): plain rows only, newest 200 kept.
      // Stage B's notebook reads and extends this; see heatLogAppend.
      function recordTrial(row) {
        var clean = {};
        Object.keys(row || {}).forEach(function (k) {
          var v = row[k];
          if (v == null || typeof v === 'string' || typeof v === 'boolean') clean[k] = v;
          else if (typeof v === 'number') clean[k] = isFinite(v) ? v : null;
        });
        if (!clean.at) clean.at = Date.now();
        var next = heatLogAppend(d.log, clean, HEAT_LOG_MAX);
        upd({ log: next });
        return next.length;
      }

      var mode = d.mode || 'conduction';
      var matId = d.matId || 'copper';
      var matBId = d.matBId || 'wood';
      var material = MATERIALS.filter(function (m) { return m.id === matId; })[0] || MATERIALS[0];
      var materialB = MATERIALS.filter(function (m) { return m.id === matBId; })[0] || MATERIALS[5];
      var raceOn = !!d.raceOn;
      // Older saves could hold a hot end down to 30 C, where the race can never
      // finish; clamp them into the reachable range.
      var hotEnd = clamp(typeof d.hotEnd === 'number' && isFinite(d.hotEnd) ? d.hotEnd : 200, HEAT_HOT_MIN, HEAT_HOT_MAX);
      // 'auto' fits the slower bar's finish (analytic series) into ~18 s of
      // wall time; any other unknown value falls back to 10x as before.
      var timeScaleAuto = d.timeScale === 'auto';
      var timeScale = timeScaleAuto
        ? heatAutoTimeScale(Math.max(heatMidReachCached(material, hotEnd), raceOn ? heatMidReachCached(materialB, hotEnd) : 0))
        : (HEAT_TIME_SCALES.indexOf(d.timeScale) !== -1 ? d.timeScale : HEAT_TIME_SCALES[0]);
      // Thermometers: up to three, each { cm: 1..19 along the bar, bar: 'a'|'b' }.
      var probes = (Array.isArray(d.probes) ? d.probes : [{ cm: 5, bar: 'a' }, { cm: 10, bar: 'a' }, { cm: 15, bar: 'a' }])
        .filter(function (p) { return p && typeof p.cm === 'number' && isFinite(p.cm); })
        .slice(0, HEAT_PROBE_MAX)
        .map(function (p) { return { cm: clamp(Math.round(p.cm), 1, 19), bar: p.bar === 'b' ? 'b' : 'a' }; });
      var PROBE_COLOURS = isContrast ? ['#ffff00', '#00ffff', '#ff66ff']
        : isDark ? ['#fb923c', '#22d3ee', '#c4b5fd'] : ['#c2410c', '#0e7490', '#6d28d9'];
      var PROBE_DASH = [null, [6, 3], [2, 3]];
      // Thermal camera (stage B): one switch repaints every camera view.
      var irOn = !!d.irOn;
      var irPalette = d.irGrey ? 'grey' : 'iron';
      var irCrossCm = typeof d.irCrossCm === 'number' && isFinite(d.irCrossCm) ? clamp(d.irCrossCm, 0, 20) : 10;
      var racePrediction = heatRacePrediction(material, materialB);
      var raceRatioText = racePrediction.ratio >= 10 ? Math.round(racePrediction.ratio).toLocaleString() : racePrediction.ratio.toFixed(1);

      // Fullscreen state follows the shared helper rather than a local guess:
      // __alloStemFS may land in real fullscreen OR in its CSS fill-frame fallback
      // (sandboxed embeds like Gemini Canvas refuse the real API), and Escape can
      // leave either one without going through our button. Watching the marker
      // attribute keeps the label honest in every one of those cases.
      React.useEffect(function () {
        var el = heatStageRef.current;
        if (!el || typeof MutationObserver !== 'function') return;
        var sync = function () {
          var on = el.hasAttribute('data-allo-fullscreen-active')
            || document.fullscreenElement === el
            || document.webkitFullscreenElement === el;
          setHeatFs(!!on);
        };
        var mo = new MutationObserver(sync);
        mo.observe(el, { attributes: true, attributeFilter: ['data-allo-fullscreen-active'] });
        document.addEventListener('fullscreenchange', sync);
        document.addEventListener('webkitfullscreenchange', sync);
        sync();
        return function () {
          mo.disconnect();
          document.removeEventListener('fullscreenchange', sync);
          document.removeEventListener('webkitfullscreenchange', sync);
        };
      }, []);

      // ── Module 1 canvas ──────────────────────────────────────────────
      React.useEffect(function () {
        var el = canvasRef.current;
        if (!el) return;
        // Re-read every frame (see frame()); this is only the starting value.
        var reduce = heatPrefersReducedMotion();
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var W = 0, H = 0;
        function size() {
          var ow = el.offsetWidth || 600, oh = el.offsetHeight || 220;
          W = el.width = Math.round(ow * dpr);
          H = el.height = Math.round(oh * dpr);
        }
        size();
        var c = el.getContext('2d');

        // Two bars, not one. Switching material and comparing from memory is a
        // poor test; racing them side by side is the demonstration itself, and it
        // turns "copper is better" into a number.
        // Geometry and finish line are chosen from the physics, not from taste.
        // A 30 cm bar needs 195 s of simulated time for copper's midpoint to pass
        // 100 C and steel never gets there at all, so nothing ever finished. A
        // 20 cm bar with the line at 50 C gives copper 22.5 s, aluminium 26.7 s,
        // steel 201 s (heat-equation series; the corrected grid agrees within
        // 0.05%), fibreglass 18 min and glass, wood and aerogel 1.5-7 hours, which
        // the 100x / 1000x time scales bring into a lesson.
        var N = HEAT_BAR_NODES;
        var MID = Math.floor(N / 2);
        var HIST_MAX = 400;
        var raceOpts = { barLength: HEAT_BAR_LENGTH, area: HEAT_BAR_AREA, finishC: HEAT_FINISH_C, probeIndex: MID };
        var sim = raceSimRef.current;
        if (!sim || !sim.a || sim.a.T.length !== N) {
          sim = raceSimRef.current = { a: heatRaceState(N), b: heatRaceState(N), hist: null, nextSample: 0 };
        }
        var last = 0, lastLive = 0, lastChart = 0;
        var geo = null;                  // last drawn bar geometry, for probe dragging

        function matOf(id, fallback) {
          return MATERIALS.filter(function (x) { return x.id === id; })[0] || fallback;
        }
        function scaleNow() {
          var s = parseFloat(el.dataset.timeScale || '10');
          return s > 0 ? s : 10;
        }
        function racingNow() { return el.dataset.race === 'on'; }
        var probeCache = { key: null, list: [] };
        function readProbes() {
          var key = el.dataset.probes || '[]';
          if (key !== probeCache.key) {
            var list = [];
            try { list = JSON.parse(key); } catch (e) { list = []; }
            probeCache = { key: key, list: Array.isArray(list) ? list : [] };
          }
          return probeCache.list;
        }
        // Probe positions are continuous (cm), read by linear interpolation
        // between the two neighbouring grid nodes.
        function probeTemp(T, cm) {
          var pos = clamp(cm / 20, 0, 1) * (N - 1);
          var i0 = Math.floor(pos), i1 = Math.min(N - 1, i0 + 1), f = pos - i0;
          return T[i0] + (T[i1] - T[i0]) * f;
        }
        function sampleEvery() { return Math.max(0.05, scaleNow() / 8) * (sim.hist.factor || 1); }
        function sample() {
          var hst = sim.hist;
          hst.t.push(sim.a.clock);
          hst.a.push(new Float64Array(sim.a.T));
          hst.b.push(racingNow() ? new Float64Array(sim.b.T) : null);
          if (hst.t.length > HIST_MAX) {
            var keep = function (_, i) { return i % 2 === 0 || i === hst.t.length - 1; };
            hst.t = hst.t.filter(keep); hst.a = hst.a.filter(keep); hst.b = hst.b.filter(keep);
            hst.factor = (hst.factor || 1) * 2;
          }
          sim.nextSample = sim.a.clock + sampleEvery();
        }
        function freshHistory() {
          sim.hist = { t: [], a: [], b: [], factor: 1 };
          sample();
        }
        if (!sim.hist) freshHistory();

        function secs(x) { return x < 1000 ? x.toFixed(1) : fmt(x, 0); }
        function reset() {
          sim.a = heatRaceState(N);
          sim.b = heatRaceState(N);
          sim.runHot = null;
          sim.hotMixed = false;
          freshHistory();
          last = 0;
          setRaceStatus(htFmt(t('stem.heatlab.bars_reset_to_20_c_the', 'Bars reset to 20 °C. The finish line is {0} °C at the midpoint.'), [HEAT_FINISH_C]));
          pushLive(true);
        }
        function hotEndNowRaw() { return clamp(parseFloat(el.dataset.hot || '200'), HEAT_HOT_MIN, HEAT_HOT_MAX); }

        function step(dt) {
          var hot = hotEndNowRaw();
          if (sim.runHot == null) sim.runHot = hot;
          else if (sim.runHot !== hot) sim.hotMixed = true;
          var racing = racingNow();
          var mA = matOf(el.dataset.material, MATERIALS[0]);
          var mB = matOf(el.dataset.materialB, MATERIALS[5]);
          var reachA0 = sim.a.reach, reachB0 = sim.b.reach;
          var remaining = dt, guard = 0;
          // Advance in chunks that end on the sampling grid, so the T(t) chart
          // gets the same shape whether time arrives as 60 small frames or one
          // big reduced-motion step.
          while (remaining > 1e-9 && guard++ < 100000) {
            var chunk = Math.min(remaining, Math.max(1e-6, sim.nextSample - sim.a.clock));
            heatRaceAdvance(sim.a, mA, hot, chunk, raceOpts);
            if (racing) heatRaceAdvance(sim.b, mB, hot, chunk, raceOpts);
            remaining -= chunk;
            if (sim.a.clock >= sim.nextSample - 1e-9) sample();
          }
          var reachedNow = (reachA0 === null && sim.a.reach !== null) || (racing && reachB0 === null && sim.b.reach !== null);
          if (reachedNow) {
            var parts = [sim.a.reach === null
              ? t('stem.heatlab.race_a_not_reached', '{m} has not reached the finish line.').replace('{m}', function () { return mA.name; })
              : t('stem.heatlab.race_a_reached', '{m} reached {f} °C at the midpoint in {s} simulated seconds.').replace('{m}', function () { return mA.name; })
                .replace('{f}', String(HEAT_FINISH_C)).replace('{s}', secs(sim.a.reach))];
            if (racing) {
              parts.push(sim.b.reach === null
                ? t('stem.heatlab.race_b_not_reached', '{m} has not reached the finish line yet.').replace('{m}', function () { return mB.name; })
                : t('stem.heatlab.race_b_reached', '{m} reached it in {s} simulated seconds.').replace('{m}', function () { return mB.name; }).replace('{s}', secs(sim.b.reach)));
            }
            setRaceStatus(parts.join(' '));
          }
        }
        function currentRaceStatus() {
          var mA = matOf(el.dataset.material, MATERIALS[0]);
          var one = function (m, st) {
            return (st.reach === null ? t('stem.heatlab.race_mid_now', '{m} midpoint: {T} °C.')
              : t('stem.heatlab.race_mid_done', '{m} midpoint: {T} °C, reached the finish in {s} simulated seconds.').replace('{s}', secs(st.reach)))
              .replace('{m}', function () { return m.name; }).replace('{T}', st.T[MID].toFixed(1));
          };
          var text = one(mA, sim.a);
          if (racingNow()) {
            var mB = matOf(el.dataset.materialB, MATERIALS[5]);
            text += ' ' + one(mB, sim.b);
          }
          return text;
        }
        // Readouts for React, throttled to 4 per second while animating.
        function snapshot() {
          var hot = hotEndNowRaw(), racing = racingNow();
          var mA = matOf(el.dataset.material, MATERIALS[0]);
          var mB = matOf(el.dataset.materialB, MATERIALS[5]);
          function barInfo(st, m) {
            // Before the first step the hot end has not been applied yet, so
            // report the flux the profile actually has (zero), not a spike.
            var f = heatBarFlux(st.T, m, { hot: st.clock > 0 ? hot : st.T[0], cold: HEAT_COLD_C });
            return { matId: m.id, inW: f.inW, outW: f.outW, inJ: st.inJ, outJ: st.outJ, storedJ: heatBarStoredJ(st.T, m), mid: st.T[MID], reach: st.reach };
          }
          return {
            clock: sim.a.clock, racing: racing, hot: hot, hotMixed: !!sim.hotMixed,
            a: barInfo(sim.a, mA), b: racing ? barInfo(sim.b, mB) : null,
            cross: irMode() ? probeTemp(sim.a.T, crossCm()) : null,
            probes: readProbes().map(function (p) {
              var st = p.bar === 'b' && racing ? sim.b : sim.a;
              return probeTemp(st.T, p.cm);
            })
          };
        }
        function pushLive(force) {
          var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
          if (!force && now - lastLive < 250) return;
          lastLive = now;
          setRaceLive(snapshot());
        }
        function chartCfg() {
          var hot = hotEndNowRaw(), racing = racingNow(), hst = sim.hist;
          var mA = matOf(el.dataset.material, MATERIALS[0]);
          var mB = matOf(el.dataset.materialB, MATERIALS[5]);
          var series = [], legend = [], markers = [];
          readProbes().forEach(function (p, i) {
            var useB = p.bar === 'b' && racing;
            var arr = useB ? hst.b : hst.a;
            var st = useB ? sim.b : sim.a;
            var pts = [];
            for (var k = 0; k < hst.t.length; k++) if (arr[k]) pts.push([hst.t[k], probeTemp(arr[k], p.cm)]);
            var now = probeTemp(st.T, p.cm);
            if (!pts.length || pts[pts.length - 1][0] < st.clock) pts.push([st.clock, now]);
            var colour = PROBE_COLOURS[i % PROBE_COLOURS.length];
            series.push({ points: pts, colour: colour, width: 2.2, dashPattern: PROBE_DASH[i % PROBE_DASH.length] });
            legend.push({ label: 'P' + (i + 1) + ' · ' + p.cm + ' cm' + (racing ? ' · ' + (useB ? mB.name : mA.name) : ''), colour: colour, dashPattern: PROBE_DASH[i % PROBE_DASH.length] });
            markers.push({ x: st.clock, y: now, colour: colour, label: 'P' + (i + 1) });
          });
          return {
            xMin: 0, xMax: Math.max(scaleNow(), sim.a.clock * 1.06), yMin: HEAT_COLD_C, yMax: Math.max(60, hot),
            xUnit: '', yUnit: '°',
            xFormat: function (v) { return fmt(v, v % 1 ? 1 : 0); },
            xLabel: t('stem.heatlab.probe_chart_x', 'simulated time (s)'),
            yLabel: t('stem.heatlab.probe_chart_y', 'temperature (°C)'),
            series: series,
            refLines: [{ axis: 'y', at: HEAT_FINISH_C, colour: isContrast ? '#ffffff' : (isDark ? '#4ade80' : '#15803d'), label: t('stem.heatlab.probe_chart_finish', 'finish line at the midpoint'), align: 'left' }],
            legend: legend,
            legendAt: 'tl',
            markers: markers
          };
        }
        function paintChart(force) {
          var node = probeChartRef.current;
          if (!node || !node.isConnected) return;
          var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
          if (!force && now - lastChart < 120) return;
          lastChart = now;
          drawChart(node, chartCfg());
        }

        // Every length below is written in CSS pixels and scaled once here, so the
        // layout reads the same as the rest of the tool instead of being littered
        // with `* dpr`.
        function u(px) { return px * dpr; }

        // The canvas used to paint itself near-black in both themes, which left a
        // slab of midnight sitting inside a white card in light mode — the only
        // element on the page that ignored the theme.
        function irMode() { var m = el.dataset.ir; return m === 'iron' || m === 'grey' ? m : null; }
        function rampC(f) { var m = irMode(); return m ? heatIrColour(f, m) : heatRampColour(f); }
        function skin() {
          // Thermal camera: the room itself is the coldest thing in view, so
          // the field takes the palette's 20 C colour and the ink goes white.
          if (irMode()) return { bg: heatIrColour(0, irMode()), bg2: heatIrColour(0, irMode()), ink: '#ffffff', dim: '#e2e8f0', rule: 'rgba(255,255,255,0.6)', glass: 'rgba(255,255,255,0.18)', win: '#4ade80' };
          // High contrast: pure black field, pure white ink and rules, no
          // translucent greys (they are what the mode exists to remove).
          if (isContrast) return { bg: '#000000', bg2: '#000000', ink: '#ffffff', dim: '#ffffff', rule: '#ffffff', glass: 'rgba(255,255,255,0.6)', win: '#00ff66' };
          return isDark
            ? { bg: '#0b1120', bg2: '#131f38', ink: 'rgba(226,232,240,0.94)', dim: 'rgba(148,163,184,0.88)', rule: 'rgba(226,232,240,0.55)', glass: 'rgba(148,163,184,0.16)', win: '#4ade80' }
            : { bg: '#f6f8fc', bg2: '#e4ecfb', ink: 'rgba(15,23,42,0.94)', dim: 'rgba(51,65,85,0.86)', rule: 'rgba(15,23,42,0.45)', glass: 'rgba(71,85,105,0.13)', win: '#166534' };
        }
        function backdrop() {
          var s = skin();
          var g = c.createLinearGradient(0, 0, 0, H);
          g.addColorStop(0, s.bg2); g.addColorStop(1, s.bg);
          c.clearRect(0, 0, W, H);
          c.fillStyle = g; c.fillRect(0, 0, W, H);
          return s;
        }
        function hotEndNow() { return hotEndNowRaw(); }
        // The strip is coloured by temperature, so the scale has to be anchored to
        // the temperatures actually in play, not to a fixed 260-degree window.
        function tempFrac(temp) { return clamp((temp - 20) / Math.max(1, hotEndNow() - 20), 0, 1); }
        function colourFor(temp) { return rampC(tempFrac(temp)); }

        // A strip of colour with no key is decoration. This is the key.
        function drawColourKey(cy) {
          var s = skin();
          var hot = hotEndNow();
          var kw = Math.min(W * 0.42, u(230)), kh = u(9);
          var kx = (W - kw) / 2, ky = cy - kh / 2;
          var g = c.createLinearGradient(kx, 0, kx + kw, 0), i;
          for (i = 0; i <= 10; i++) g.addColorStop(i / 10, rampC(i / 10));
          c.fillStyle = g;
          c.fillRect(kx, ky, kw, kh);
          c.strokeStyle = s.glass;
          c.lineWidth = Math.max(1, dpr);
          c.strokeRect(kx, ky, kw, kh);

          c.font = '700 ' + u(9.5) + 'px system-ui, sans-serif';
          c.textBaseline = 'middle';
          c.fillStyle = s.dim;
          c.textAlign = 'right';
          c.fillText('20°C', kx - u(6), cy);
          c.textAlign = 'left';
          c.fillText(fmt(hot, 0) + '°C', kx + kw + u(6), cy);

          // Tie the key to the race: this is the colour the finish line is at.
          var ff = tempFrac(HEAT_FINISH_C);
          if (ff > 0.02 && ff < 0.98) {
            var fx = kx + kw * ff;
            c.strokeStyle = s.ink;
            c.lineWidth = Math.max(1, dpr);
            c.beginPath();
            c.moveTo(fx, ky - u(3)); c.lineTo(fx, ky + kh + u(3));
            c.stroke();
            c.font = '700 ' + u(8.5) + 'px system-ui, sans-serif';
            c.textAlign = 'center';
            c.textBaseline = 'top';
            c.fillStyle = s.dim;
            c.fillText(htFmt(t('stem.heatlab.finish', 'finish {0}°'), [HEAT_FINISH_C]), fx, ky + kh + u(4));
          }
        }

        function oneBar(T, mat, top, barH, pad, reached, label, showEnds) {
          var s = skin();
          var cellW = (W - pad * 2) / N, i;
          for (i = 0; i < N; i++) {
            c.fillStyle = colourFor(T[i]);
            c.fillRect(pad + i * cellW, top, cellW + 1, barH);
          }

          // The temperature profile along the bar — the actual shape the heat
          // equation produces. Colour alone never showed that it is a curve, nor
          // how steeply it falls away from the hot end.
          var pts = [], x, y;
          for (i = 0; i < N; i++) {
            x = pad + (i + 0.5) * cellW;
            y = top + barH - tempFrac(T[i]) * (barH - u(3)) - u(1.5);
            pts.push([x, y]);
          }
          var strokeProfile = function (colour, width) {
            c.strokeStyle = colour;
            c.lineWidth = width;
            c.lineJoin = 'round';
            c.beginPath();
            for (i = 0; i < pts.length; i++) {
              if (i === 0) c.moveTo(pts[i][0], pts[i][1]); else c.lineTo(pts[i][0], pts[i][1]);
            }
            c.stroke();
          };
          // A dark halo under a light line keeps the profile readable over every
          // colour in the ramp, from deep blue to near-white.
          strokeProfile('rgba(2,6,23,0.75)', u(3.2));
          strokeProfile('rgba(255,255,255,0.96)', u(1.5));

          c.strokeStyle = s.rule;
          c.lineWidth = Math.max(1, dpr);
          c.strokeRect(pad, top, W - pad * 2, barH);
          // midpoint marker, the line the race is timed to
          // Same halo as the profile line: it has to read on every ramp colour.
          c.setLineDash([u(3), u(3)]);
          [['rgba(2,6,23,0.75)', u(3)], ['rgba(255,255,255,0.96)', u(1.5)]].forEach(function (mark) {
            c.strokeStyle = mark[0];
            c.lineWidth = mark[1];
            c.beginPath();
            c.moveTo(W / 2, top - u(2)); c.lineTo(W / 2, top + barH + u(2));
            c.stroke();
          });
          c.setLineDash([]);

          // A swatch in the material's own colour, so the bar and the pill the
          // learner pressed are visibly the same thing.
          c.fillStyle = mat.colour;
          c.beginPath();
          c.arc(pad + u(4), top - u(9), u(3.5), 0, 6.2832);
          c.fill();

          c.font = '700 ' + u(10) + 'px system-ui, sans-serif';
          c.textBaseline = 'alphabetic';
          c.textAlign = 'left';
          c.fillStyle = s.ink;
          c.fillText(label, pad + u(11), top - u(6));
          c.textAlign = 'right';
          c.fillStyle = reached === null ? s.dim : s.win;
          var reachable = (hotEndNow() + HEAT_COLD_C) / 2 > HEAT_FINISH_C;
          c.fillText(reached === null
            ? (reachable
              ? htFmt(t('stem.heatlab.c_at_the_middle_still_climbing', '{0}°C at the middle, still climbing'), [fmt(T[MID], 0)])
              : t('stem.heatlab.canvas_never_reaches', '{t}°C at the middle; it can never reach the finish at this hot end').replace('{t}', fmt(T[MID], 0)))
            : htFmt(t('stem.heatlab.middle_hit_c_in_s', 'middle hit {0}°C in {1} s'), [HEAT_FINISH_C, secs(reached)]),
            // The top race bar's label row runs under the 34 px fullscreen button.
            top - u(6) < u(46) ? W - u(48) : W - pad, top - u(6));

          // Which end is heated was never stated anywhere on the canvas.
          if (showEnds) {
            c.font = '700 ' + u(9) + 'px system-ui, sans-serif';
            c.textBaseline = 'top';
            c.fillStyle = s.dim;
            c.textAlign = 'left';
            c.fillText(htFmt(t('stem.heatlab.held_at_c', '🔥 held at {0}°C'), [fmt(hotEndNow(), 0)]), pad, top + barH + u(5));
            c.textAlign = 'center';
            c.fillText(t('stem.heatlab.midpoint', 'midpoint'), W / 2, top + barH + u(5));
            c.textAlign = 'right';
            c.fillText(t('stem.heatlab.held_at_20_c', 'held at 20°C ❄'), W - pad, top + barH + u(5));
          }
        }

        // Thermometers on a bar: a haloed vertical line through the bar at the
        // probe's exact position, with a numbered tag, in the probe's chart
        // colour so the bar and the T(t) graph are visibly the same thing.
        // Node i is painted as cell i, so its centre is (i + 0.5) cells in.
        function probeX(cm, pad) {
          var cellW = (W - pad * 2) / N;
          return pad + (clamp(cm / 20, 0, 1) * (N - 1) + 0.5) * cellW;
        }
        function cmAtX(x, pad) {
          var cellW = (W - pad * 2) / N;
          return clamp(Math.round(((x - pad) / cellW - 0.5) / (N - 1) * 20), 1, 19);
        }
        function drawProbes(which, top, barH, pad) {
          var racing = racingNow();
          readProbes().forEach(function (p, i) {
            var onBar = (p.bar === 'b' && racing) ? 'b' : 'a';
            if (onBar !== which) return;
            var x = probeX(p.cm, pad);
            var colour = PROBE_COLOURS[i % PROBE_COLOURS.length];
            c.lineWidth = u(4);
            c.strokeStyle = 'rgba(2,6,23,0.85)';
            c.beginPath(); c.moveTo(x, top - u(2)); c.lineTo(x, top + barH + u(2)); c.stroke();
            c.lineWidth = u(2);
            c.strokeStyle = colour;
            c.beginPath(); c.moveTo(x, top - u(2)); c.lineTo(x, top + barH + u(2)); c.stroke();
            var tag = 'P' + (i + 1);
            c.font = '800 ' + u(9) + 'px system-ui, sans-serif';
            var tw = c.measureText(tag).width + u(8);
            var ty = top + u(3);
            c.fillStyle = 'rgba(2,6,23,0.88)';
            c.fillRect(x - tw / 2, ty, tw, u(13));
            c.strokeStyle = colour;
            c.lineWidth = Math.max(1, dpr);
            c.strokeRect(x - tw / 2, ty, tw, u(13));
            c.fillStyle = '#ffffff';
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText(tag, x, ty + u(6.5));
            // "Drag me": arrowheads either side of P1's tag and a word under
            // it, until a thermometer has been moved this session.
            if (i === 0 && el.dataset.dragHint === 'on') {
              var ay = ty + u(6.5), gap = tw / 2 + u(3);
              c.fillStyle = '#ffffff';
              c.strokeStyle = 'rgba(2,6,23,0.85)';
              c.lineWidth = Math.max(1, dpr);
              [-1, 1].forEach(function (sgn) {
                c.beginPath();
                c.moveTo(x + sgn * (gap + u(7)), ay);
                c.lineTo(x + sgn * gap, ay - u(5));
                c.lineTo(x + sgn * gap, ay + u(5));
                c.closePath();
                c.fill(); c.stroke();
              });
              var word = t('stem.heatlab.canvas_drag_me', 'drag');
              c.font = '800 ' + u(9) + 'px system-ui, sans-serif';
              var ww = c.measureText(word).width + u(8);
              c.fillStyle = 'rgba(2,6,23,0.88)';
              c.fillRect(x - ww / 2, ty + u(16), ww, u(13));
              c.fillStyle = '#ffffff';
              c.fillText(word, x, ty + u(22.5));
            }
          });
        }

        // Thermal camera crosshair on the top bar, with its reading.
        function crossCm() { return clamp(parseFloat(el.dataset.irCross || '10'), 0, 20); }
        function drawCross(top, barH, pad) {
          if (!irMode()) return;
          var cm = crossCm();
          var x = probeX(cm, pad), y = top + barH / 2;
          var temp = probeTemp(sim.a.T, cm);
          c.lineWidth = u(3); c.strokeStyle = 'rgba(0,0,0,0.85)';
          c.beginPath(); c.moveTo(x - u(12), y); c.lineTo(x + u(12), y); c.moveTo(x, y - u(12)); c.lineTo(x, y + u(12)); c.stroke();
          c.lineWidth = u(1.5); c.strokeStyle = '#00ffff';
          c.beginPath(); c.moveTo(x - u(12), y); c.lineTo(x + u(12), y); c.moveTo(x, y - u(12)); c.lineTo(x, y + u(12)); c.stroke();
          var tag = fmt(temp, 1) + ' °C';
          c.font = '800 ' + u(10) + 'px system-ui, sans-serif';
          var tw = c.measureText(tag).width + u(8);
          var tx = x + u(14) + tw > W - u(2) ? x - u(14) - tw : x + u(14), ty = y - u(7);
          c.fillStyle = 'rgba(0,0,0,0.88)'; c.fillRect(tx, ty, tw, u(14));
          c.strokeStyle = '#00ffff'; c.lineWidth = Math.max(1, dpr); c.strokeRect(tx, ty, tw, u(14));
          c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(tag, tx + tw / 2, ty + u(7));
        }
        function drawBar(ts) {
          var racing = racingNow();
          var pad = u(26);
          var s = backdrop();

          var mA = matOf(el.dataset.material, MATERIALS[0]);
          if (racing) {
            var mB = matOf(el.dataset.materialB, MATERIALS[5]);
            var bh = H * 0.20;
            oneBar(sim.a.T, mA, H * 0.14, bh, pad, sim.a.reach, mA.name, false);
            oneBar(sim.b.T, mB, H * 0.44, bh, pad, sim.b.reach, mB.name, true);
            drawProbes('a', H * 0.14, bh, pad);
            drawProbes('b', H * 0.44, bh, pad);
            drawCross(H * 0.14, bh, pad);
            geo = { pad: pad, a: { top: H * 0.14, h: bh }, b: { top: H * 0.44, h: bh } };
            drawColourKey(H * 0.81);
          } else {
            oneBar(sim.a.T, mA, H * 0.22, H * 0.30, pad, sim.a.reach, mA.name, true);
            drawProbes('a', H * 0.22, H * 0.30, pad);
            drawCross(H * 0.22, H * 0.30, pad);
            geo = { pad: pad, a: { top: H * 0.22, h: H * 0.30 }, b: null };
            drawColourKey(H * 0.72);
          }
          c.textAlign = 'center';
          c.textBaseline = 'alphabetic';
          c.fillStyle = s.dim;
          c.font = '600 ' + u(10) + 'px system-ui, sans-serif';
          var state = el.dataset.paused === 'on' ? t('stem.heatlab.canvas_paused', 'paused')
            : (reduce ? t('stem.heatlab.canvas_step_mode', 'step with the Advance button') : t('stem.heatlab.canvas_running', 'running'));
          c.fillText(t('stem.heatlab.canvas_bar_caption', '20 cm bar, held at {hot}°C and 20°C · {scale}× real time · t = {time} s · {state}')
            .replace('{hot}', fmt(hotEndNow(), 0)).replace('{scale}', fmt(scaleNow(), 0))
            .replace('{time}', secs(sim.a.clock)).replace('{state}', state), W / 2, H - u(9));
        }

        // ── Convection ────────────────────────────────────────────────────
        // The old version drew 26 dots at pseudo-random heights under a caption
        // promising a loop. The `warm ? y : H - y` mirror folded every particle
        // into the top 40% of the canvas, and cool blue dots sat above warm
        // orange ones — the opposite of the sentence above them.
        //
        // What is drawn now is the cross-section of a real Rayleigh-Bénard pair:
        // heat in at the base, out at the ceiling, fluid rising up the middle and
        // sinking at both walls, so the two counter-rotating cells match the 3D
        // tank in section 8 exactly. Each cell is traversed as an ellipse, and
        // increasing theta gives up-the-centre, out-along-the-top, down-the-wall,
        // back-along-the-floor.
        function convectionCells() {
          var m = u(16);
          var tankX = m, tankY = u(30), tankW = W - m * 2, tankH = H - tankY - u(30);
          var plate = u(9);
          var innerY = tankY + plate, innerH = tankH - plate * 2;
          var rx = tankW / 4 - u(10), ry = innerH / 2 - u(8);
          return {
            tankX: tankX, tankY: tankY, tankW: tankW, tankH: tankH,
            plate: plate, innerY: innerY, innerH: innerH,
            cy: innerY + innerH / 2, rx: rx, ry: ry,
            cells: [
              { cx: tankX + tankW * 0.25, dir: -1 },   // left cell, mirrored
              { cx: tankX + tankW * 0.75, dir: 1 }
            ]
          };
        }
        function cellPoint(g, cell, th) {
          return [cell.cx + cell.dir * g.rx * Math.cos(th), g.cy + g.ry * Math.sin(th)];
        }
        function drawConvection(ts) {
          var s = backdrop();
          var g = convectionCells();
          var tt = reduce ? 0 : ts / 1000;
          var i, k, p, th;

          // Tank walls, then the two plates that drive the whole thing.
          c.fillStyle = s.glass;
          c.fillRect(g.tankX, g.tankY, g.tankW, g.tankH);
          c.strokeStyle = s.rule;
          c.lineWidth = Math.max(1, dpr);
          c.strokeRect(g.tankX, g.tankY, g.tankW, g.tankH);

          var hotG = c.createLinearGradient(0, g.tankY + g.tankH, 0, g.tankY + g.tankH - g.plate * 2.6);
          hotG.addColorStop(0, rampC(0.92));
          hotG.addColorStop(1, 'rgba(249,115,22,0)');
          c.fillStyle = hotG;
          c.fillRect(g.tankX, g.tankY + g.tankH - g.plate * 2.6, g.tankW, g.plate * 2.6);
          c.fillStyle = rampC(1);
          c.fillRect(g.tankX, g.tankY + g.tankH - g.plate, g.tankW, g.plate);
          c.fillStyle = rampC(0);
          c.fillRect(g.tankX, g.tankY, g.tankW, g.plate);

          // Faint guide ellipses, so the circuit still reads when the animation is
          // frozen for prefers-reduced-motion.
          c.strokeStyle = s.glass;
          c.lineWidth = Math.max(1, u(1));
          for (k = 0; k < g.cells.length; k++) {
            c.beginPath();
            c.ellipse(g.cells[k].cx, g.cy, g.rx, g.ry, 0, 0, 6.2832);
            c.stroke();
          }

          // The fluid itself. Warmth comes from height — genuinely true inside a
          // convection cell — plus a bonus on the rising half, because the leg
          // that has just left the hot plate really is warmer than the leg
          // returning from the ceiling at the same height.
          var COUNT = 13;
          for (k = 0; k < g.cells.length; k++) {
            for (i = 0; i < COUNT; i++) {
              th = (i / COUNT) * 6.2832 + tt * 0.9 + Math.PI;
              p = cellPoint(g, g.cells[k], th);
              var rising = Math.cos(th) < 0;
              // Canvas y grows downward, so the LOW end of the tank is the LARGE
              // y. Reading height straight off p[1] put the cold colours on the
              // hot plate — the same inversion this rewrite exists to kill.
              var base = clamp((p[1] - (g.cy - g.ry)) / (2 * g.ry), 0, 1);
              var warmth = clamp(base * 0.8 + (rising ? 0.2 : -0.06), 0, 1);
              c.fillStyle = rampC(warmth);
              c.beginPath();
              c.arc(p[0], p[1], u(5.2), 0, 6.2832);
              c.fill();
              c.strokeStyle = 'rgba(2,6,23,0.35)';
              c.lineWidth = Math.max(1, dpr);
              c.stroke();
            }
          }

          // Direction arrows at the four corners of each circuit. Without them a
          // ring of dots says nothing about which way anything travels.
          c.fillStyle = s.ink;
          for (k = 0; k < g.cells.length; k++) {
            for (i = 0; i < 4; i++) {
              th = Math.PI + i * (Math.PI / 2) + tt * 0.9;
              p = cellPoint(g, g.cells[k], th);
              var q = cellPoint(g, g.cells[k], th + 0.16);
              var a = Math.atan2(q[1] - p[1], q[0] - p[0]);
              c.save();
              c.translate(p[0], p[1]);
              c.rotate(a);
              c.beginPath();
              c.moveTo(u(7), 0); c.lineTo(-u(3.5), u(4)); c.lineTo(-u(3.5), -u(4));
              c.closePath();
              c.fill();
              c.restore();
            }
          }

          c.textAlign = 'center';
          c.textBaseline = 'alphabetic';
          c.fillStyle = s.ink;
          c.font = '700 ' + u(11.5) + 'px system-ui, sans-serif';
          c.fillText(t('stem.heatlab.warm_fluid_rises_up_the_middle', 'Warm fluid rises up the middle, cools at the top, and sinks down the walls'), W / 2, u(19));
          c.font = '700 ' + u(9) + 'px system-ui, sans-serif';
          c.textBaseline = 'middle';
          // The plates are opposite ends of the ramp, so one label has to be light
          // and the other dark. A single ink colour left "cold ceiling" as
          // near-black on deep blue.
          c.fillStyle = 'rgba(241,245,249,0.95)';
          c.fillText(t('stem.heatlab.cold_ceiling_heat_leaves_here', 'cold ceiling — heat leaves here'), W / 2, g.tankY + g.plate / 2);
          c.fillStyle = 'rgba(2,6,23,0.88)';
          c.fillText(t('stem.heatlab.hot_plate_heat_enters_here', 'hot plate — heat enters here'), W / 2, g.tankY + g.tankH - g.plate / 2);
          c.textBaseline = 'alphabetic';
          c.fillStyle = s.dim;
          c.font = '600 ' + u(9.5) + 'px system-ui, sans-serif';
          c.fillText(t('stem.heatlab.only_fluids_can_do_this_a', 'Only fluids can do this. A solid cannot convect — its particles cannot move past each other.'), W / 2, H - u(9));
        }

        // ── Radiation ─────────────────────────────────────────────────────
        // The old drawing had an unlabelled orange disc, arcs that faded out well
        // short of an unlabelled near-black slab, and nothing showing that any
        // energy ever arrived. Nothing on it said which object was which, and the
        // slab was almost invisible against the background it sat on.
        function drawRadiation(ts) {
          var s = skin();
          // Space is the one place a dark field is the honest choice, so this mode
          // keeps its own backdrop in both themes — but the ink adapts.
          var g0 = c.createLinearGradient(0, 0, 0, H);
          g0.addColorStop(0, isDark ? '#05070f' : '#111a2e');
          g0.addColorStop(1, isDark ? '#0b1120' : '#1c2740');
          c.clearRect(0, 0, W, H);
          c.fillStyle = g0; c.fillRect(0, 0, W, H);
          var ink = 'rgba(226,232,240,0.94)', dim = 'rgba(203,213,225,0.8)';

          var tt = reduce ? 0 : ts / 1000;
          var cy = H * 0.52;
          var srcX = W * 0.17, srcR = u(24);
          var absX = W * 0.80, absW = u(26), absH = H * 0.40;
          var reach = absX - srcX;
          var i, r, rad;
          // Stage C: this view now draws the section 11 model. The surface's
          // temperature and emissivity set how strongly each side radiates;
          // the 20 C room radiates back, and the label gives the net.
          var surfC = parseFloat(el.dataset.radT);
          if (!isFinite(surfC)) surfC = 33;
          var surfEps = parseFloat(el.dataset.radEps);
          if (!(surfEps >= 0 && surfEps <= 1)) surfEps = 0.98;
          var rm = heatRadiationModel(surfC, 20, 1.8, surfEps);
          var outStr = clamp(Math.log10(Math.max(1, rm.emittedW)) / 5, 0.06, 1);
          var inStr = clamp(Math.log10(Math.max(1, rm.absorbedW)) / 5, 0.06, 1);
          var surfF = clamp((surfC + 20) / 920, 0, 1);

          // The vacuum between them, called out because "no medium" is the whole
          // point of the mode and nothing used to say it.
          c.setLineDash([u(4), u(5)]);
          c.strokeStyle = 'rgba(148,163,184,0.35)';
          c.lineWidth = Math.max(1, dpr);
          c.beginPath();
          c.moveTo(srcX + srcR + u(8), cy + H * 0.30);
          c.lineTo(absX - u(8), cy + H * 0.30);
          c.stroke();
          c.setLineDash([]);
          c.font = '600 ' + u(9) + 'px system-ui, sans-serif';
          c.textAlign = 'center';
          c.textBaseline = 'top';
          c.fillStyle = dim;
          c.fillText(t('stem.heatlab.vacuum_no_particles_nothing_to_carry', 'vacuum — no particles, nothing to carry the heat'), (srcX + absX) / 2, cy + H * 0.30 + u(4));

          // Wavefronts that actually cross the gap and land on the absorber.
          // A fixed angular width made the near arcs a sliver and the far ones
          // 700 px tall, spilling off the top and bottom of the canvas. Holding
          // the SPREAD constant instead keeps the beam a cone aimed at the target.
          var spread = absH / 2 + u(10);
          for (i = 0; i < 5; i++) {
            rad = ((tt * 0.38 + i / 5) % 1) * reach;
            rad = Math.max(srcR, rad);
            var half = Math.min(0.62, Math.atan(spread / rad));
            // Fade with distance, but never to nothing: a front that vanished
            // before touching the absorber argued against the caption above it.
            // Brightness and width follow the emitted power (log scale).
            c.globalAlpha = (0.25 + clamp(1 - rad / reach, 0, 1) * 0.35) * (0.4 + 0.6 * outStr);
            c.strokeStyle = heatRampColour(0.86);
            c.lineWidth = u(0.8 + 3 * outStr);
            c.beginPath();
            c.arc(srcX, cy, rad, -half, half);
            c.stroke();
          }
          // The room radiates too, back towards the surface (dashed, cooler).
          for (i = 0; i < 4; i++) {
            rad = ((tt * 0.38 + i / 4 + 0.12) % 1) * reach;
            rad = Math.max(u(14), rad);
            var halfB = Math.min(0.5, Math.atan(srcR * 1.4 / rad));
            c.globalAlpha = (0.2 + clamp(1 - rad / reach, 0, 1) * 0.3) * (0.4 + 0.6 * inStr);
            c.strokeStyle = '#7dd3fc';
            c.lineWidth = u(0.8 + 3 * inStr);
            c.setLineDash([u(5), u(4)]);
            c.beginPath();
            c.arc(absX, cy, rad, Math.PI - halfB, Math.PI + halfB);
            c.stroke();
            c.setLineDash([]);
          }
          c.globalAlpha = 1;

          // The emitter, coloured by its temperature on the tool's one ramp. It
          // only glows once it is hot enough to emit visible red (about 500 C).
          if (surfC >= 500) {
            var glow = c.createRadialGradient(srcX, cy, srcR * 0.2, srcX, cy, srcR * 2.2);
            glow.addColorStop(0, 'rgba(251,191,36,0.55)');
            glow.addColorStop(1, 'rgba(251,191,36,0)');
            c.fillStyle = glow;
            c.beginPath(); c.arc(srcX, cy, srcR * 2.2, 0, 6.2832); c.fill();
          }
          c.fillStyle = heatRampColour(surfF);
          c.beginPath(); c.arc(srcX, cy, srcR, 0, 6.2832); c.fill();
          c.strokeStyle = 'rgba(226,232,240,0.85)';
          c.lineWidth = u(2);
          c.stroke();

          // The room-temperature object, in the same ramp the conduction bar
          // uses, so a colour means one thing across the tool.
          c.fillStyle = heatRampColour(40 / 920);
          c.fillRect(absX, cy - absH / 2, absW, absH);
          c.strokeStyle = 'rgba(226,232,240,0.6)';
          c.lineWidth = Math.max(1, dpr);
          c.strokeRect(absX, cy - absH / 2, absW, absH);

          var wTxt = function (w) { return Math.abs(w) >= 100 ? fmt(w, 0) : Math.abs(w).toFixed(1); };
          c.font = '700 ' + u(9.5) + 'px system-ui, sans-serif';
          c.textAlign = 'left';
          c.textBaseline = 'top';
          c.fillStyle = ink;
          c.fillText(t('stem.heatlab.rad_canvas_surface', 'surface {T} °C, ε {e}').replace('{T}', fmt(surfC, 0)).replace('{e}', surfEps.toFixed(2)), u(8), cy + srcR + u(8));
          c.fillStyle = dim;
          c.font = '600 ' + u(9) + 'px system-ui, sans-serif';
          c.fillText(t('stem.heatlab.rad_canvas_emits', 'emits {w} W').replace('{w}', wTxt(rm.emittedW)), u(8), cy + srcR + u(20));
          c.font = '700 ' + u(9.5) + 'px system-ui, sans-serif';
          c.fillStyle = ink;
          c.textAlign = 'right';
          c.fillText(t('stem.heatlab.rad_canvas_room', 'room, 20 °C'), W - u(10), cy + absH / 2 + u(8));
          c.font = '600 ' + u(9) + 'px system-ui, sans-serif';
          c.fillStyle = dim;
          c.fillText(t('stem.heatlab.rad_canvas_back', 'sends back {w} W').replace('{w}', wTxt(rm.absorbedW)), W - u(10), cy + absH / 2 + u(20));

          c.textAlign = 'center';
          c.textBaseline = 'alphabetic';
          c.fillStyle = ink;
          c.font = '700 ' + u(11.5) + 'px system-ui, sans-serif';
          c.fillText(t('stem.heatlab.rad_canvas_title', 'Radiation needs no medium, and both sides radiate'), W / 2, u(19));
          c.font = '600 ' + u(9.5) + 'px system-ui, sans-serif';
          c.fillStyle = dim;
          var net = rm.netToRoomW;
          c.fillText(Math.abs(net) < 0.05
            ? t('stem.heatlab.rad_canvas_net_zero', 'Net: 0 W. Equal streams both ways (section 11 model, 1.8 m²)')
            : (net > 0 ? t('stem.heatlab.rad_canvas_net_out', 'Net: {w} W from the surface to the room (section 11 model, 1.8 m²)')
              : t('stem.heatlab.rad_canvas_net_in', 'Net: {w} W from the room to the colder surface (section 11 model, 1.8 m²)')).replace('{w}', wTxt(Math.abs(net))), W / 2, H - u(9));
        }

        function drawCurrent(ts) {
          if (!c) return;
          reduce = heatPrefersReducedMotion();
          var m = el.dataset.mode || 'conduction';
          if (m === 'conduction') drawBar(ts);
          else if (m === 'convection') drawConvection(ts);
          else drawRadiation(ts);
        }
        var visible = true;
        var io = null;
        var reduceSeen = reduce;
        function requestNext() {
          if (!visible || animRef.current) return;
          animRef.current = requestAnimationFrame(frame);
        }
        function frame(ts) {
          animRef.current = 0;
          // The frame id has already been consumed, so there is nothing left to
          // cancel here — just stop scheduling once the canvas has been detached.
          if (!el.isConnected) return;
          // Reduced motion is re-read every frame, so switching it on mid-race
          // freezes the bar at once instead of after the next remount.
          var wasReduce = reduceSeen;
          reduce = reduceSeen = heatPrefersReducedMotion();
          var m = el.dataset.mode || 'conduction';
          var paused = el.dataset.paused === 'on';
          try {
            if (m === 'conduction') {
              var dt = last ? Math.min(0.25, (ts - last) / 1000) : 0.016;
              if (!reduce && !paused) step(dt * scaleNow());
              if (c) drawBar(ts);
              pushLive(reduce && !wasReduce);
              paintChart(false);
            } else if (c && m === 'convection') { drawConvection(ts); }
            else if (c) { drawRadiation(ts); }
          } catch (err) { console.error('Heat lab draw error:', err); }
          last = ts;
          // Nothing moves in a paused conduction race, so stop asking for frames
          // until something changes (_heatKick).
          if (!reduce && !(paused && m === 'conduction')) requestNext();
        }

        el._heatReset = function () { reset(); drawCurrent(0); paintChart(true); };
        el._heatDraw = function () {
          // A reset sampled t = 0 before the new race / material settings
          // reached the dataset; re-take that first sample so bar B has one.
          if (sim.a.clock === 0) freshHistory();
          drawCurrent(0); paintChart(true); pushLive(true);
        };
        el._heatKick = function () { last = 0; requestNext(); };
        el._heatSnapshot = function () { return snapshot(); };
        // Stage D: each thermometer's T(t) points, for "Hear it" and "Describe".
        el._heatProbeSeries = function () { return chartCfg().series.map(function (s) { return s.points.slice(); }); };
        // Manual step: one press = one real second at the chosen time scale.
        el._heatStep = function () {
          if ((el.dataset.mode || 'conduction') !== 'conduction') return;
          step(scaleNow());
          if (c) drawBar(0);
          pushLive(true);
          paintChart(true);
          setRaceStatus(currentRaceStatus());
        };
        // Probe dragging: hit-test in CSS pixels against the last drawn bars.
        el._heatProbeHit = function (clientX, clientY) {
          if (!geo) return -1;
          var rect = el.getBoundingClientRect();
          var x = (clientX - rect.left) * dpr, y = (clientY - rect.top) * dpr;
          var best = -1, bestD = u(14);
          readProbes().forEach(function (p, i) {
            var which = (p.bar === 'b' && racingNow() && geo.b) ? geo.b : geo.a;
            if (y < which.top - u(10) || y > which.top + which.h + u(10)) return;
            var dx = Math.abs(probeX(p.cm, geo.pad) - x);
            if (dx <= bestD) { best = i; bestD = dx; }
          });
          return best;
        };
        el._heatProbeCmAt = function (clientX) {
          var rect = el.getBoundingClientRect();
          return cmAtX((clientX - rect.left) * dpr, geo ? geo.pad : u(26));
        };
        if (typeof ResizeObserver === 'function') {
          var ro = new ResizeObserver(function () { size(); drawCurrent(0); });
          ro.observe(el);
          roRef.current = ro;
        }
        if (typeof IntersectionObserver === 'function') {
          io = new IntersectionObserver(function (entries) {
            visible = !entries.length || entries[0].isIntersecting;
            if (visible) requestNext();
            else if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = 0; }
          }, { rootMargin: '120px' });
          io.observe(el);
        }
        var motionMq = null;
        function onMotionChange() {
          reduceSeen = heatPrefersReducedMotion();
          pushLive(true);
          if (!reduceSeen) { last = 0; requestNext(); }
        }
        try {
          motionMq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
          if (motionMq && motionMq.addEventListener) motionMq.addEventListener('change', onMotionChange);
          else if (motionMq && motionMq.addListener) motionMq.addListener(onMotionChange);
        } catch (mqErr) { motionMq = null; }
        requestNext();
        pushLive(true);
        return function () {
          cancelAnimationFrame(animRef.current);
          animRef.current = 0;
          if (motionMq) {
            try {
              if (motionMq.removeEventListener) motionMq.removeEventListener('change', onMotionChange);
              else if (motionMq.removeListener) motionMq.removeListener(onMotionChange);
            } catch (mqErr2) {}
          }
          if (io) io.disconnect();
          if (roRef.current) { roRef.current.disconnect(); roRef.current = null; }
          el._heatReset = null;
          el._heatDraw = null;
          el._heatStep = null;
          el._heatKick = null;
          el._heatSnapshot = null;
          el._heatProbeSeries = null;
          el._heatProbeHit = null;
          el._heatProbeCmAt = null;
        };
      }, [isDark, isContrast, prefersReducedMotion]);

      // keep the canvas fed without re-creating the loop
      var probesKey = JSON.stringify(probes);
      // (read straight from toolData: the section 11 variables come later)
      var canvasRadT = typeof d.radT === 'number' && isFinite(d.radT) ? d.radT : 33;
      var canvasRadEps = heatSurface(d.radSurf).eps;
      React.useEffect(function () {
        var el = canvasRef.current;
        if (!el) return;
        el.dataset.mode = mode;
        el.dataset.material = matId;
        el.dataset.materialB = matBId;
        el.dataset.race = raceOn ? 'on' : 'off';
        el.dataset.hot = String(hotEnd);
        el.dataset.timeScale = String(timeScale);
        el.dataset.probes = probesKey;
        el.dataset.paused = racePaused ? 'on' : 'off';
        el.dataset.ir = irOn ? irPalette : 'off';
        el.dataset.irCross = String(irCrossCm);
        // Stage C: the radiation mode draws the section 11 model.
        el.dataset.radT = String(canvasRadT);
        el.dataset.radEps = String(canvasRadEps);
        el.dataset.dragHint = probeHintOn && probes.length ? 'on' : 'off';
        if (el._heatDraw) el._heatDraw();
        if (el._heatKick) el._heatKick();
      }, [mode, matId, matBId, raceOn, hotEnd, timeScale, probesKey, racePaused, irOn, irPalette, irCrossCm, canvasRadT, canvasRadEps, probeHintOn]);

      // The T(t) chart only exists in conduction mode, so it is watched here
      // rather than by the mount-once observer that serves the static charts.
      React.useEffect(function () {
        var node = probeChartRef.current;
        if (!node || typeof ResizeObserver !== 'function') return;
        var ro = new ResizeObserver(function () {
          var el = canvasRef.current;
          if (el && el._heatDraw) el._heatDraw();
        });
        ro.observe(node);
        return function () { ro.disconnect(); };
      }, [mode]);

      // ── Shared line chart. Both curves are the point of their module, and a
      //    row of numbers cannot show a plateau or an exponential tail. ──
      // cfg: xMin xMax yMin yMax xUnit yUnit xLabel yLabel, optional
      //   xFormat(v, step) / yFormat(v, step)  custom tick text (e.g. a time axis)
      //   series  [{ points: [[x, y]], colour, width, dash | dashPattern: [px] }]
      //   bands, refLines, legend [{ label, colour, dash | dashPattern }],
      //   legendAt 'bl' | 'tl' | default top-right,
      //   marker  { x, y, colour }            one "you are here" dot + guide
      //   markers [{ x, y, colour, label }]   several probe dots, no guide
      // High contrast swaps to a black field with white ink automatically.
      function drawChart(el, cfg) {
        if (!el) return;
        // Remember how to repaint. Nothing redrew these canvases on a container
        // resize, so rotating a tablet left the old backing store stretched
        // across the new box until some unrelated state change happened to
        // trigger a redraw.
        el._htRedraw = function () { drawChart(el, cfg); };
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var ow = el.offsetWidth || 560, oh = el.offsetHeight || 190;
        var W = el.width = Math.round(ow * dpr);
        var H = el.height = Math.round(oh * dpr);
        var c = el.getContext('2d');
        if (!c) return;
        var padL = (cfg.yLabel ? 56 : 42) * dpr, padR = 12 * dpr;
        var padT = 14 * dpr, padB = (cfg.xLabel ? 42 : 30) * dpr;
        var pw = W - padL - padR, ph = H - padT - padB;
        var axisInk = isContrast ? '#ffffff' : isDark ? 'rgba(148,163,184,0.9)' : 'rgba(71,85,105,0.9)';
        var titleInk = isContrast ? '#ffffff' : isDark ? 'rgba(203,213,225,0.95)' : 'rgba(51,65,85,0.95)';
        if (!(cfg.xMax > cfg.xMin)) cfg = Object.assign({}, cfg, { xMax: cfg.xMin + 1 });
        if (!(cfg.yMax > cfg.yMin)) cfg = Object.assign({}, cfg, { yMax: cfg.yMin + 1 });

        c.clearRect(0, 0, W, H);
        c.fillStyle = isContrast ? '#000000' : isDark ? '#0b1120' : '#f8fafc';
        c.fillRect(0, 0, W, H);

        function px(v) { return padL + (v - cfg.xMin) / (cfg.xMax - cfg.xMin) * pw; }
        function py(v) { return padT + (1 - (v - cfg.yMin) / (cfg.yMax - cfg.yMin)) * ph; }

        // gridlines and axis labels
        var yTicks = niceTicks(cfg.yMin, cfg.yMax, 4);
        var xTicks = niceTicks(cfg.xMin, cfg.xMax, 4);
        var yStep = yTicks.length > 1 ? yTicks[1] - yTicks[0] : 1;
        var xStep = xTicks.length > 1 ? xTicks[1] - xTicks[0] : 1;
        c.strokeStyle = isContrast ? 'rgba(255,255,255,0.35)' : isDark ? 'rgba(148,163,184,0.18)' : 'rgba(100,116,139,0.18)';
        c.lineWidth = Math.max(1, dpr);
        c.font = '600 ' + (9 * dpr) + 'px system-ui, sans-serif';
        c.fillStyle = axisInk;
        c.textAlign = 'right';
        c.textBaseline = 'middle';
        yTicks.forEach(function (yv) {
          var y = py(yv);
          c.beginPath(); c.moveTo(padL, y); c.lineTo(W - padR, y); c.stroke();
          c.fillText((cfg.yFormat ? cfg.yFormat(yv, yStep) : tickLabel(yv, yStep)) + (cfg.yUnit || ''), padL - 5 * dpr, y);
        });
        c.textAlign = 'center';
        c.textBaseline = 'top';
        xTicks.forEach(function (xv) {
          c.fillText((cfg.xFormat ? cfg.xFormat(xv, xStep) : tickLabel(xv, xStep)) + (cfg.xUnit || ''), px(xv), H - padB + 6 * dpr);
        });

        // Axis titles. Three charts carried bare numbers — the entropy y-axis in
        // particular read "133, 117, 101" with nothing to say those were logs.
        if (cfg.xLabel) {
          c.fillStyle = titleInk;
          c.font = '700 ' + (9.5 * dpr) + 'px system-ui, sans-serif';
          c.fillText(cfg.xLabel, padL + pw / 2, H - 14 * dpr);
        }
        if (cfg.yLabel) {
          c.save();
          c.translate(12 * dpr, padT + ph / 2);
          c.rotate(-Math.PI / 2);
          c.fillStyle = titleInk;
          c.font = '700 ' + (9.5 * dpr) + 'px system-ui, sans-serif';
          c.textAlign = 'center';
          c.textBaseline = 'top';
          c.fillText(cfg.yLabel, 0, 0);
          c.restore();
        }

        // Everything data-driven is confined to the plot box. Without this a
        // series that runs past yMax paints over the axis labels and the title
        // instead of simply leaving the top of the chart.
        c.save();
        c.beginPath();
        c.rect(padL, padT, pw, ph);
        c.clip();

        // shaded bands, used to mark the two latent plateaus
        (cfg.bands || []).forEach(function (b) {
          c.fillStyle = b.colour;
          c.fillRect(px(b.from), padT, px(b.to) - px(b.from), ph);
          c.save();
          c.fillStyle = b.label_colour || b.colour;
          c.font = '700 ' + (9 * dpr) + 'px system-ui, sans-serif';
          c.textAlign = 'center';
          c.textBaseline = 'top';
          c.fillText(b.label, (px(b.from) + px(b.to)) / 2, padT + 4 * dpr);
          c.restore();
        });

        // series
        var dashOf = function (item) {
          if (item.dashPattern && item.dashPattern.length) return item.dashPattern.map(function (v) { return v * dpr; });
          return item.dash ? [4 * dpr, 4 * dpr] : [];
        };
        (cfg.series || []).forEach(function (s) {
          if (!s.points || !s.points.length) return;
          c.strokeStyle = s.colour;
          c.lineWidth = ((s.width || 2) + (isContrast ? 0.6 : 0)) * dpr;
          c.setLineDash(dashOf(s));
          c.beginPath();
          s.points.forEach(function (p, i) {
            var x = px(p[0]), y = py(p[1]);
            if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
          });
          c.stroke();
          c.setLineDash([]);
        });

        // Probe markers: the newest reading of each series, as a ringed dot.
        (cfg.markers || []).forEach(function (m) {
          if (!isFinite(m.x) || !isFinite(m.y)) return;
          c.fillStyle = m.colour;
          c.strokeStyle = isContrast ? '#ffffff' : isDark ? '#0b1120' : '#ffffff';
          c.lineWidth = 1.5 * dpr;
          c.beginPath();
          c.arc(px(m.x), py(m.y), 4 * dpr, 0, 6.2832);
          c.fill();
          c.stroke();
        });

        c.restore();   // end plot-box clip; labels below may use the margins

        // Reference lines: the number a module is actually asking about. The
        // insulation module is scored on 65 degrees at sixty minutes and never
        // drew that line, so the target existed only in the prose.
        (cfg.refLines || []).forEach(function (ref) {
          var vertical = ref.axis === 'x';
          var at = vertical ? px(ref.at) : py(ref.at);
          c.strokeStyle = ref.colour;
          c.lineWidth = Math.max(1, 1.4 * dpr);
          c.setLineDash([5 * dpr, 4 * dpr]);
          c.beginPath();
          if (vertical) { c.moveTo(at, padT); c.lineTo(at, H - padB); }
          else { c.moveTo(padL, at); c.lineTo(W - padR, at); }
          c.stroke();
          c.setLineDash([]);
          if (ref.label) {
            c.font = '700 ' + (8.5 * dpr) + 'px system-ui, sans-serif';
            c.fillStyle = ref.colour;
            if (vertical) {
              // Along the bottom, not the top: a vertical line marks a peak often
              // enough that a label at the top lands squarely on the curve.
              c.textAlign = at > padL + pw * 0.6 ? 'right' : 'left';
              c.textBaseline = 'bottom';
              c.fillText(ref.label, at + (at > padL + pw * 0.6 ? -4 * dpr : 4 * dpr), H - padB - 4 * dpr);
            } else if (ref.align === 'left') {
              // On the heating curve the right-hand end is where the steam ramp
              // climbs, so a right-aligned label sat on top of the line it names.
              c.textAlign = 'left';
              c.textBaseline = 'bottom';
              c.fillText(ref.label, padL + 5 * dpr, at - 3 * dpr);
            } else {
              c.textAlign = 'right';
              c.textBaseline = 'bottom';
              c.fillText(ref.label, W - padR - 4 * dpr, at - 3 * dpr);
            }
          }
        });

        // Legend. The cooling chart draws three lines and named them only in a
        // paragraph underneath, which meant matching prose to pixels from memory.
        if (cfg.legend && cfg.legend.length) {
          var lgH = 12 * dpr, lgPad = 6 * dpr;
          c.font = '700 ' + (8.5 * dpr) + 'px system-ui, sans-serif';
          var lgW = 0;
          cfg.legend.forEach(function (item) {
            lgW = Math.max(lgW, c.measureText(item.label).width + 22 * dpr);
          });
          var leftSide = cfg.legendAt === 'bl' || cfg.legendAt === 'tl';
          var lgX = leftSide ? padL + lgPad : W - padR - lgW - lgPad;
          var lgY = cfg.legendAt === 'bl'
            ? H - padB - lgPad - cfg.legend.length * lgH
            : padT + lgPad;
          c.fillStyle = isContrast ? 'rgba(0,0,0,0.9)' : isDark ? 'rgba(11,17,32,0.82)' : 'rgba(248,250,252,0.88)';
          c.fillRect(lgX - lgPad / 2, lgY - lgPad / 2, lgW + lgPad, cfg.legend.length * lgH + lgPad);
          if (isContrast) {
            c.strokeStyle = '#ffffff';
            c.lineWidth = Math.max(1, dpr);
            c.strokeRect(lgX - lgPad / 2, lgY - lgPad / 2, lgW + lgPad, cfg.legend.length * lgH + lgPad);
          }
          c.textAlign = 'left';
          c.textBaseline = 'middle';
          cfg.legend.forEach(function (item, li) {
            var ly = lgY + li * lgH + lgH / 2;
            c.strokeStyle = item.colour;
            c.lineWidth = 2 * dpr;
            c.setLineDash(item.dashPattern && item.dashPattern.length
              ? item.dashPattern.map(function (v) { return v * dpr * 0.75; })
              : (item.dash ? [3 * dpr, 3 * dpr] : []));
            c.beginPath();
            c.moveTo(lgX, ly); c.lineTo(lgX + 15 * dpr, ly);
            c.stroke();
            c.setLineDash([]);
            c.fillStyle = isContrast ? '#ffffff' : isDark ? 'rgba(226,232,240,0.92)' : 'rgba(30,41,59,0.92)';
            c.fillText(item.label, lgX + 20 * dpr, ly);
          });
        }

        // marker for the current position
        if (cfg.marker) {
          c.fillStyle = cfg.marker.colour;
          c.beginPath();
          c.arc(px(cfg.marker.x), py(cfg.marker.y), 4 * dpr, 0, 6.2832);
          c.fill();
          c.strokeStyle = cfg.marker.colour + '80';
          c.lineWidth = dpr;
          c.beginPath(); c.moveTo(px(cfg.marker.x), padT); c.lineTo(px(cfg.marker.x), H - padB); c.stroke();
        }

        // axis frame last so nothing paints over it
        c.strokeStyle = isContrast ? '#ffffff' : isDark ? 'rgba(148,163,184,0.45)' : 'rgba(100,116,139,0.45)';
        c.lineWidth = Math.max(1, dpr);
        c.beginPath();
        c.moveTo(padL, padT); c.lineTo(padL, H - padB); c.lineTo(W - padR, H - padB);
        c.stroke();
      }

      // ── Module 2: cooling with a real R-value ────────────────────────
      // Starts as a near-bare mug (1 mm of copper, 47.9 C after an hour). The
      // old default, 10 mm of fibreglass, already beat 65 C, so the badge was
      // won by an effect on first render before the learner did anything.
      var insMatId = d.insMatId || 'copper';
      var insMat = MATERIALS.filter(function (m) { return m.id === insMatId; })[0] || MATERIALS[0];
      var thickness = typeof d.thickness === 'number' ? d.thickness : 1;   // mm
      function coolingCurve(mat, mm) {
        return heatCoolingCurve(mat, mm, 60);
      }
      var curve = coolingCurve(insMat, thickness);
      var after60 = curve[curve.length - 1];
      var wrapRHere = (thickness / 1000) / insMat.k;
      var surfaceRHere = 0.12;
      var doubledFlowRatio = (wrapRHere + surfaceRHere) / (2 * wrapRHere + surfaceRHere);
      var doubledFlowReductionPct = Math.max(0, (1 - doubledFlowRatio) * 100);

      // The badge is awarded inside the learner's own change (a material pill or
      // the thickness slider), never by an effect reacting to whatever state
      // happens to be on screen at mount.
      function insulationChange(nextMat, nextMm) {
        var patch = { insMatId: nextMat.id, thickness: nextMm };
        if (!d.insulationWin && heatCoolingTemperature(nextMat, nextMm, 60) >= 65) patch.insulationWin = true;
        upd(patch);
      }

      // ── Module 3: calorimetry ────────────────────────────────────────
      var sub1 = SUBSTANCES.filter(function (s) { return s.id === (d.sub1 || 'water'); })[0] || SUBSTANCES[0];
      var sub2 = SUBSTANCES.filter(function (s) { return s.id === (d.sub2 || 'iron'); })[0] || SUBSTANCES[5];
      var m1 = typeof d.m1 === 'number' ? d.m1 : 0.5;
      var m2 = typeof d.m2 === 'number' ? d.m2 : 0.5;
      // Each sample stays liquid or solid at its start temperature (ethanol
      // would be vapour above 78 C, and c = 2,440 J/kgK is the liquid's value).
      var mixMaxC = function (sub) { return typeof sub.maxC === 'number' ? sub.maxC : 100; };
      var t1 = Math.min(typeof d.t1 === 'number' ? d.t1 : 20, mixMaxC(sub1));
      var t2 = Math.min(typeof d.t2 === 'number' ? d.t2 : 90, mixMaxC(sub2));
      var finalT = heatMixTemperature(sub1, m1, t1, sub2, m2, t2);
      var mixExplanation = heatMixExplanation(sub1, m1, t1, sub2, m2, t2);
      var mixEstimateResult = d.mixEstimateResult && typeof d.mixEstimateResult.estimated === 'number' ? d.mixEstimateResult : null;
      var mixEstimateRevision = ['supported', 'revised', 'uncertain'].indexOf(d.mixEstimateRevision) !== -1 ? d.mixEstimateRevision : '';
      var mixEstimateReflection = typeof d.mixEstimateReflection === 'string' ? d.mixEstimateReflection : '';
      var parsedMixEstimate = parseFloat(predictText);
      var mixEstimateReady = predictText !== '' && isFinite(parsedMixEstimate) && parsedMixEstimate >= 0 && parsedMixEstimate <= 100;
      // Credit is keyed to the exact scenario. Once the model answer for a mix
      // has been revealed, typing it back in ("Try another estimate") earns no
      // estimation XP, and a reflection is credited once per mix.
      var mixSig = heatMixSignature(sub1.id, m1, t1, sub2.id, m2, t2);
      var mixRevealedSigs = Array.isArray(d.mixRevealedSigs) ? d.mixRevealedSigs : [];
      var mixReflectedSigs = Array.isArray(d.mixReflectedSigs) ? d.mixReflectedSigs : [];
      // The particle lens states Tf ("heading for … °C") and converges on it,
      // and a recorded mixing trial writes Tf_C to the notebook, so either one
      // shows the answer for this mix; it is marked revealed in the effect below.
      var mixLensShowsTf = !!(d.lens && typeof d.lens === 'object' && d.lens.mix);
      var mixAlreadyRevealed = mixRevealedSigs.indexOf(mixSig) !== -1 || mixLensShowsTf;
      var mixAlreadyReflected = mixReflectedSigs.indexOf(mixSig) !== -1;
      function markMixRevealed() {
        if (mixRevealedSigs.indexOf(mixSig) === -1) upd({ mixRevealedSigs: heatLogAppend(mixRevealedSigs, mixSig, 100) });
      }
      React.useEffect(function () {
        if (mixLensShowsTf) markMixRevealed();
      }, [mixLensShowsTf, mixSig]);

      // ── Module 4: heating curve ──────────────────────────────────────
      var energyIn = typeof d.energyIn === 'number' ? d.energyIn : 0;   // kJ per kg
      var wstate = heatWaterState(energyIn);
      // A temperature-only colour ramp can hide the important flat sections of
      // the curve, so pair it with phase landmarks and a live marker. The marker
      // uses a slightly wider display domain than the chart to leave room for the
      // final steam state without pushing the 100 C landmark against the edge.
      var CURVE_SCALE_MIN = -20;
      var CURVE_SCALE_MAX = 125;
      var curveTempFraction = clamp((wstate.temp - CURVE_SCALE_MIN) / (CURVE_SCALE_MAX - CURVE_SCALE_MIN), 0, 1);
      var curveScaleGradient = HEAT_RAMP.map(function (stop) {
        return heatRampColour(stop[0]) + ' ' + (stop[0] * 100).toFixed(0) + '%';
      }).join(', ');
      var curveStateNote = (wstate.phase === 'Ice melting' || wstate.phase === 'Water boiling')
        ? t('stem.heatlab.energy_is_changing_the_phase_so', 'Energy is changing the phase, so the temperature is holding steady.')
        : t('stem.heatlab.energy_is_raising_the_average_molecular', 'Energy is raising the average molecular motion, so the temperature is rising.');

      React.useEffect(function () {
        if (wstate.phase === 'Steam' && !d.curveComplete) upd({ curveComplete: true });
      }, [wstate.phase, d.curveComplete]);

      // Sample the curve across the full energy range so the plateaus are visible
      var CURVE_MAX = 3100;
      var waterStages = heatWaterStages(CURVE_MAX);
      var stageById = {};
      waterStages.forEach(function (s) { stageById[s.id] = s; });
      var curvePts = [];
      for (var ce = 0; ce <= CURVE_MAX; ce += 10) curvePts.push([ce, heatWaterState(ce).temp]);

      React.useEffect(function () {
        drawChart(curveRef.current, {
          // 160 wasted the top quarter of the plot: the curve cannot pass 123 at
          // the slider's limit. 135 gives the two plateaus the room instead.
          xMin: 0, xMax: CURVE_MAX, yMin: -25, yMax: 135, xUnit: '', yUnit: '°',
          xLabel: t('stem.heatlab.energy_added_to_1_kg_of', 'energy added to 1 kg of ice (kJ)'), yLabel: t('stem.heatlab.probe_chart_y', 'temperature (°C)'),
          bands: [
            { from: stageById.ice.totalKJ, to: stageById.melt.totalKJ, colour: 'rgba(96,165,250,0.16)', label_colour: '#60a5fa', label: t('stem.heatlab.hc_melting', 'melting') },
            { from: stageById.water.totalKJ, to: stageById.boil.totalKJ, colour: 'rgba(251,146,60,0.16)', label_colour: '#fb923c', label: t('stem.heatlab.hc_boiling', 'boiling') }
          ],
          // The two temperatures the whole module is about were left for the eye
          // to find among evenly spaced gridlines.
          refLines: [
            { axis: 'y', at: 0, colour: 'rgba(96,165,250,0.75)', label: t('stem.heatlab.n0_c_ice_water', '0 °C  ice ⇄ water'), align: 'left' },
            { axis: 'y', at: 100, colour: 'rgba(251,146,60,0.8)', label: t('stem.heatlab.n100_c_water_steam', '100 °C  water ⇄ steam'), align: 'left' }
          ],
          series: [{ points: curvePts, colour: '#a78bfa', width: 2.4 }],
          marker: { x: energyIn, y: wstate.temp, colour: '#f472b6' }
        });
      }, [energyIn, isDark, isContrast]);

      // ── Module 2 chart: this material against the two extremes ──
      React.useEffect(function () {
        var best = MATERIALS[MATERIALS.length - 1], worst = MATERIALS[0];
        function toPts(mat) {
          return coolingCurve(mat, thickness).map(function (v, i) { return [i, v]; });
        }
        // #c4b5fd is a pale lavender that all but vanished on the light theme's
        // near-white plot. The line has to change with the theme, not the plot.
        var bestColour = isDark ? '#c4b5fd' : '#7c3aed';
        drawChart(coolRef.current, {
          xMin: 0, xMax: 60, yMin: 20, yMax: 92, xUnit: '', yUnit: '°',
          xLabel: t('stem.heatlab.minutes_in_a_20_c_room', 'minutes in a 20 °C room'), yLabel: t('stem.heatlab.tea_temperature_c', 'tea temperature (°C)'),
          series: [
            { points: toPts(worst), colour: '#f97316', width: 1.4, dash: true },
            { points: toPts(best), colour: bestColour, width: 1.4, dash: true },
            { points: toPts(insMat), colour: '#fbbf24', width: 2.6 }
          ],
          // The badge is won or lost on this line, and it was never drawn.
          refLines: [{ axis: 'y', at: 65, colour: isDark ? '#4ade80' : '#15803d', label: t('stem.heatlab.n65_c_badge_line', '65 °C badge line') }],
          legend: [
            { label: htFmt(t('stem.heatlab.yours', '{0} (yours)'), [insMat.name]), colour: '#fbbf24' },
            { label: t('stem.heatlab.copper_worst', 'Copper — worst'), colour: '#f97316', dash: true },
            { label: t('stem.heatlab.aerogel_best', 'Aerogel — best'), colour: bestColour, dash: true }
          ],
          legendAt: 'bl',
          marker: { x: 60, y: after60, colour: '#fbbf24' }
        });
      }, [insMatId, thickness, isDark, isContrast]);

      // The three line charts size their backing store from offsetWidth at draw
      // time, but nothing redrew them when the container changed. Rotating a
      // tablet, or opening the numbers table beside one, left the previous
      // bitmap stretched across the new box until unrelated state moved.
      React.useEffect(function () {
        if (typeof ResizeObserver !== 'function') return;
        var els = [coolRef.current, curveRef.current, entropyRef.current, hpRef.current].filter(Boolean);
        if (!els.length) return;
        var ro = new ResizeObserver(function (entries) {
          entries.forEach(function (entry) {
            var target = entry.target;
            if (target && typeof target._htRedraw === 'function') target._htRedraw();
          });
        });
        els.forEach(function (n) { ro.observe(n); });
        return function () { ro.disconnect(); };
      }, []);

      // ── 3D bay: keep the host viewer in step with theme and selection ──
      var pick3d = d.pick3d || null;
      var part3d = HEAT_3D_PARTS.filter(function (p) { return p.id === pick3d; })[0] || null;
      var heatFlowNodes = [];
      HEAT_3D_FLOW.forEach(function (step, i) {
        var flowPart = HEAT_3D_PARTS.filter(function (p) { return p.id === step.id; })[0] || HEAT_3D_PARTS[0];
        var flowOn = pick3d === step.id;
        heatFlowNodes.push(h('div', {
          key: 'heat-flow-' + step.id,
          role: 'listitem',
          'aria-current': flowOn ? 'step' : undefined,
          'aria-label': step.label + ': ' + step.hint + (flowOn ? t('stem.heatlab.selected_in_the_3d_view', ', selected in the 3D view') : ''),
          className: 'flex-1 min-w-[5.5rem] rounded-lg px-2 py-1.5 text-center',
          style: flowOn
            ? { background: flowPart.color, color: '#0b1020', border: '1px solid ' + flowPart.color }
            : { background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(255,255,255,0.78)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.25)' : 'rgba(100,116,139,0.2)') }
        },
          h('span', { className: 'block text-[0.625rem] font-black' }, step.label),
          h('span', { className: 'block text-[0.625rem]', style: { color: flowOn ? '#0b1020' : (isDark ? '#94a3b8' : '#64748b') } }, step.hint)
        ));
        if (i < HEAT_3D_FLOW.length - 1) {
          heatFlowNodes.push(h('span', { key: 'heat-flow-arrow-' + i, 'aria-hidden': 'true', className: 'text-[0.8125rem] font-black', style: { color: isDark ? '#94a3b8' : '#64748b' } }, '→'));
        }
      });
      // ── Stage C: convection with a real driver ──
      var cvFluid = ['water', 'oil', 'air'].indexOf(d.cvFluid) !== -1 ? d.cvFluid : 'water';
      var cvDepth = d.cvDepth === 0.1 ? 0.1 : 0.01;
      var cvFrom = d.cvFrom === 'above' ? 'above' : 'below';
      var cvPowerExp = clamp(typeof d.cvPowerExp === 'number' && isFinite(d.cvPowerExp) ? d.cvPowerExp : 0, -3, 2);
      var cvPower = Math.pow(10, cvPowerExp);
      var cv = heatConvectionModel({ fluid: cvFluid, powerW: cvPower, depthM: cvDepth, from: cvFrom });
      // Tracer angular speed in the 3D roll: grows with the model's flow speed
      // on a log scale (mm/s to cm/s would otherwise be invisible or a blur).
      var cvRate = cv.speedMs > 0 ? clamp(0.45 + 0.5 * Math.log10(1 + cv.speedMs * 1000), 0.45, 2.4) : 0;
      React.useEffect(function () {
        HEAT_VIEWER.sync({
          selected: pick3d,
          dark: isDark,
          contrast: isContrast,
          // Rebuild only when the picture changes (regime, which plate heats);
          // the speed is read live by the scene's frame hook.
          sceneKey: cv.regime + '|' + cvFrom,
          sceneProps: { regime: cv.regime, from: cvFrom, rate: cvRate, fluid: cvFluid },
          reduced: prefersReducedMotion,
          onPick: function (id) {
            upd({ pick3d: id });
            pushOnce('parts3d', id);
            var p = HEAT_3D_PARTS.filter(function (x) { return x.id === id; })[0];
            if (p && typeof announceToSR === 'function') announceToSR(p.label + '. ' + p.desc);
          },
          onStatus: function (next) { setView3dStatus(next); }
        });
      }, [pick3d, isDark, isContrast, ctx.theme, cv.regime, cvFrom, cvRate, cvFluid, prefersReducedMotion]);

      // ── Composite wall: resistances in series ────────────────────────
      // A saved stack that is not a list (hostile or corrupt save) used to crash
      // the whole tool at wallStack.forEach.
      var wallStack = Array.isArray(d.wallStack) ? d.wallStack.filter(function (id) { return typeof id === 'string'; }).slice(0, HEAT_WALL_MAX_LAYERS) : ['brick', 'cavity', 'block', 'plaster'];
      var wallFull = wallStack.length >= HEAT_WALL_MAX_LAYERS;
      var wallTotalR = WALL_SURFACE_R;
      wallStack.forEach(function (id) {
        var L = WALL_LAYERS.filter(function (x) { return x.id === id; })[0];
        if (L) wallTotalR += L.r;
      });
      var wallU = 1 / wallTotalR;                       // W/m²K
      var wallLoss = wallU * 100 * 19;                  // 100 m² of wall, 19 K indoor-outdoor gap
      // UK building regs want about 0.18 W/m²K for a new-build wall
      var wallTarget = 0.18;

      React.useEffect(function () {
        if (wallU <= wallTarget && !d.wallMet) upd({ wallMet: true });
      }, [wallU, d.wallMet]);

      // ── Entropy, by counting ──────────────────────────────────────────
      // The tool advertised "entropy" in its search aliases and never taught it.
      // Rather than hand-wave about disorder, count microstates directly: two
      // blocks of oscillators share a fixed pot of energy quanta, and
      //   ln(multiplicity) = ln C(q+N-1, q)
      // computed in logs because the raw numbers overflow a double almost at once.
      var ENT_NA = 60, ENT_NB = 60, ENT_Q = 80;
      function lnChoose(n, k) {
        if (k < 0 || k > n) return -Infinity;
        var s = 0;
        for (var i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i);
        return s;
      }
      function lnMultiplicity(q, N) { return lnChoose(q + N - 1, q); }
      var entSplit = typeof d.entSplit === 'number' ? d.entSplit : 4;   // quanta in block A
      var entPts = [], entPeak = -Infinity, entPeakAt = 0, eq;
      for (eq = 0; eq <= ENT_Q; eq++) {
        var lnW = lnMultiplicity(eq, ENT_NA) + lnMultiplicity(ENT_Q - eq, ENT_NB);
        entPts.push([eq, lnW]);
        if (lnW > entPeak) { entPeak = lnW; entPeakAt = eq; }
      }
      var entHere = lnMultiplicity(entSplit, ENT_NA) + lnMultiplicity(ENT_Q - entSplit, ENT_NB);
      // how many times more likely the even split is than the current one
      var entOddsLog10 = (entPeak - entHere) / Math.LN10;
      var entAtPeak = entSplit === entPeakAt;
      var entNearPeak = !entAtPeak && entOddsLog10 < 0.5;

      React.useEffect(function () {
        drawChart(entropyRef.current, {
          xMin: 0, xMax: ENT_Q, yMin: Math.max(0, entPeak - 60), yMax: entPeak + 4,
          xUnit: '', yUnit: '',
          xLabel: htFmt(t('stem.heatlab.energy_units_in_block_a_of', 'energy units in block A (of {0})'), [ENT_Q]),
          yLabel: t('stem.heatlab.ln_number_of_arrangements', 'ln(number of arrangements)'),
          series: [{ points: entPts, colour: '#f472b6', width: 2.4 }],
          // The peak IS the argument this section makes; leaving it unmarked made
          // a broad curve look like it had no particular preference.
          refLines: [{ axis: 'x', at: entPeakAt, colour: isDark ? '#34d399' : '#047857', label: t('stem.heatlab.even_split_the_peak', 'even split, the peak') }],
          marker: { x: entSplit, y: entHere, colour: '#fbbf24' }
        });
      }, [entSplit, isDark, isContrast]);

      // ── Heat pumps: the engine run backwards ─────────────────────────
      var hpOut = typeof d.hpOut === 'number' ? d.hpOut : 2;    // outdoor °C
      var hpIn = typeof d.hpIn === 'number' ? d.hpIn : 21;      // indoor °C
      var hpModel = heatPumpModel(hpOut, hpIn);
      var hpTh = hpIn + 273.15;
      var hpIdealCOP = hpModel.idealCOP;
      var hpRealCOP = hpModel.realisticCOP;

      // "Drag the outdoor temperature down and watch what happens to the COP"
      // asked the learner to discover a curve one point at a time, by memory.
      // The curve itself is the argument, so draw it: the collapse in the cold
      // is obvious at a glance, and the 1.0 line shows where a heat pump stops
      // beating a plain electric heater.
      var HP_X_MIN = HEAT_PUMP_CHART_DOMAIN.xMin;
      var HP_X_MAX = HEAT_PUMP_CHART_DOMAIN.xMax;
      var hpCurve = [];
      for (var hx = HP_X_MIN; hx <= HP_X_MAX; hx += 0.5) {
        var hm = heatPumpModel(hx, hpIn);
        if (hm.heating) hpCurve.push([hx, hm.realisticCOP]);
      }
      React.useEffect(function () {
        drawChart(hpRef.current, {
          xMin: HP_X_MIN, xMax: HP_X_MAX,
          yMin: HEAT_PUMP_CHART_DOMAIN.yMin, yMax: HEAT_PUMP_CHART_DOMAIN.yMax,
          xUnit: '', yUnit: '',
          xLabel: t('stem.heatlab.outdoor_temperature_c', 'outdoor temperature (°C)'), yLabel: t('stem.heatlab.heat_out_per_unit_of_electricity', 'heat out per unit of electricity'),
          series: [{ points: hpCurve, colour: '#22d3ee', width: 2.4 }],
          refLines: [{ axis: 'y', at: 1, colour: isDark ? '#f87171' : '#b91c1c', label: t('stem.heatlab.electric_bar_heater_1_0', 'electric bar heater = 1.0'), align: 'left' }],
          marker: hpModel.heating ? { x: hpOut, y: hpRealCOP, colour: '#fbbf24' } : null
        });
      }, [hpOut, hpIn, isDark, isContrast]);

      // ── Module 5: engines ────────────────────────────────────────────
      var enginePick = typeof d.enginePick === 'number' ? d.enginePick : null;

      // ── Module 6: radiation is the one mechanism with a fourth-power law,
      //    which is why a small temperature rise changes so much. ──
      // 33 C is SKIN temperature. Core body temperature is 37 C, but skin is what
      // actually radiates, and using the core figure overstates the loss by a third.
      var radT = typeof d.radT === 'number' ? d.radT : 33;
      // Stage C: the surface finish sets the emissivity. Skin (0.98) is the
      // default, so every original figure is unchanged until one is picked.
      var radSurf = heatSurface(d.radSurf);
      var radiationModel = heatRadiationModel(radT, 20, 1.8, radSurf.eps);
      var radGross = radiationModel.emittedW;
      var radNet = radiationModel.netToRoomW;
      var radNetMagnitude = Math.abs(radNet);
      var radNetLabel = radNet > 0
        ? t('stem.heatlab.net_to_a_20_c_room', 'Net to a 20 °C room')
        : radNet < 0 ? t('stem.heatlab.net_absorbed_from_a_20_c', 'Net absorbed from a 20 °C room') : t('stem.heatlab.net_exchange_with_a_20_c', 'Net exchange with a 20 °C room');
      // Wien's displacement law: where the emitted spectrum peaks
      var wienUm = radiationModel.peakUm;

      // ── Module 7: thermal expansion ──────────────────────────────────
      var expMatId = d.expMatId || 'steel';
      var expMat = EXPANSION.filter(function (e) { return e.id === expMatId; })[0] || EXPANSION[0];
      var expLen = typeof d.expLen === 'number' ? d.expLen : 100;     // metres
      var expDT = typeof d.expDT === 'number' ? d.expDT : 40;         // kelvin swing
      var expDelta = expMat.alpha * expLen * expDT;                    // metres

      // ── shared UI helpers ────────────────────────────────────────────
      // Takes any number of children after the accent. Declaring this as
      // (accent, children) silently dropped every argument past the second and
      // rendered nothing but the heading.
      var card = function (accent) {
        var children = Array.prototype.slice.call(arguments, 1);
        // Spread as separate arguments, not as one array child: an array makes
        // React treat static siblings as a dynamic list and demand keys.
        return h.apply(null, ['section', {
          className: 'rounded-xl border p-3 mt-3',
          style: {
            borderColor: accent + '55',
            background: isDark ? 'rgba(15,23,42,0.72)' : 'rgba(255,255,255,0.92)',
            boxShadow: '0 1px 2px rgba(15,23,42,0.05), 0 12px 28px -22px rgba(15,23,42,0.5)'
          }
        }].concat(children));
      };
      // Same card, plus the anchor the topic index jumps to. scroll-margin keeps
      // the heading clear of the sticky index bar instead of hiding under it.
      // Stage D: after the heading, every section gains its plain summary
      // (Simple), key words and derivation (Extended); "Go further" sections
      // fold away at Simple; the teacher's hide and lock settings apply to
      // learners (the teacher sees a note instead).
      var sec = function (id, accent) {
        var children = Array.prototype.slice.call(arguments, 2);
        var hidden = htHidden.indexOf(id) !== -1, locked = htLocked.indexOf(id) !== -1;
        if (hidden && !isTeacher) return null;
        var head = children[0], body = children.slice(1);
        var pre = [];
        if (isTeacher && (hidden || locked)) {
          pre.push(h('p', { key: 'ht-tnote', 'data-ht-teacher-note': id, className: 'text-[0.625rem] font-bold mb-1', style: { color: isContrast ? '#ffffff' : (isDark ? '#fcd34d' : '#92400e') } },
            '👩‍🏫 ' + (hidden ? t('stem.heatlab.teacher_note_hidden', 'Hidden from learners.') : t('stem.heatlab.teacher_note_locked', 'Locked for learners.'))));
        }
        if (htSimple && HT_PLAIN[id]) pre.push(h('p', { key: 'ht-plain', 'data-ht-plain': id, className: 'text-[0.6875rem] mb-2 leading-relaxed font-bold', style: { color: bodyInk } }, '💡 ' + HT_PLAIN[id]));
        if (HT_SECTION_WORDS[id]) pre.push(vocabRow(id, HT_SECTION_WORDS[id]));
        if (htSimple && HT_GO_FURTHER[id] && !mathsOpen['further:' + id]) {
          body = [h('div', { 'data-ht-further': id },
            h('p', { className: 'text-[0.6875rem] leading-relaxed', style: { color: softInk } },
              t('stem.heatlab.further_note', 'This section goes further than grades 6–8 need. Open it when you are ready.')),
            h('button', {
              type: 'button', 'aria-expanded': 'false', 'data-ht-further-btn': id,
              onClick: function () { setMathsOpen(function (p) { var n = Object.assign({}, p); n['further:' + id] = true; return n; }); },
              className: 'mt-1.5 min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(false)
            }, '🚀 ' + t('stem.heatlab.go_further', 'Go further')))];
        } else {
          if (HT_DERIVE[id]) body = body.concat([derive(id)]);
          var xl = htCrossLinks(id);
          if (xl) body = body.concat([xl]);
        }
        if (locked && !isTeacher) {
          body = [h('p', { className: 'text-[0.6875rem] font-bold mb-1', 'data-ht-locked-note': id, style: { color: bodyInk } },
            '🔒 ' + t('stem.heatlab.locked_note', 'Your teacher has locked this section for now.')),
            h.apply(null, ['div', { inert: '', 'data-ht-locked': id, style: { opacity: 0.55 } }].concat(body))];
        }
        // One topic at a time: the rest stay in the DOM, hidden.
        var shownHere = htSecShown(id);
        var pager = shownHere ? htPager(id) : null;
        if (pager) body = body.concat([pager]);
        var node = card.apply(null, [accent, head].concat(pre, body));
        return React.cloneElement(node, {
          id: 'htsec-' + id,
          'data-ht-sec': id,
          tabIndex: -1,
          hidden: shownHere ? undefined : true,
          'data-ht-current': id === htCurrent && !htAll ? 'true' : undefined,
          style: Object.assign({}, node.props.style, { scrollMarginTop: '72px' })
        });
      };
      var heading = function (accent, text) {
        return h('h4', { className: 'text-xs font-black mb-2', style: { color: ink(accent) } }, text);
      };
      var pillTextColor = function (accent) { var m = String(accent || '').match(/^#([0-9a-f]{6})/i); if (!m) return '#0b1020'; var r = parseInt(m[1].slice(0, 2), 16) / 255; var g = parseInt(m[1].slice(2, 4), 16) / 255; var b = parseInt(m[1].slice(4, 6), 16) / 255; var linear = function (v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; var lum = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b); var darkRatio = (lum + 0.05) / 0.05; var lightRatio = 1.05 / (lum + 0.05); return lightRatio >= darkRatio ? '#ffffff' : '#0b1020'; };
      var pill = function (on, accent, label, onClick, ariaLabel) {
        return h('button', {
          key: label, type: 'button',
          'aria-pressed': on ? 'true' : 'false',
          'aria-label': ariaLabel || label,
          onClick: onClick,
          className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold transition-colors',
          style: on
            ? { background: accent, color: pillTextColor(accent), border: '1px solid ' + accent }
            : { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') }
        }, label);
      };
      var slider = function (id, label, min, max, step, value, onChange, suffix, controlsId) {
        // On a phone, keep the label and live value together and give the range
        // control a full row. At the small breakpoint the familiar one-line
        // layout returns.
        return h('div', { className: 'grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[7rem_minmax(0,1fr)_5rem] items-center gap-x-2 gap-y-1 mt-1.5' },
          h('label', { htmlFor: id, className: 'col-start-1 row-start-1 text-[0.6875rem] font-bold min-w-0', style: { color: isDark ? '#cbd5e1' : '#475569' } }, label),
          h('input', {
            id: id, type: 'range', min: min, max: max, step: step, value: value,
            'aria-valuetext': String(suffix),
            'aria-controls': controlsId || undefined,
            onChange: onChange,
            className: 'col-span-2 row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1 w-full min-w-0 h-11 accent-orange-500'
          }),
          h('output', { htmlFor: id, id: id + '-value', className: 'col-start-2 row-start-1 sm:col-start-3 text-[0.6875rem] font-bold text-right whitespace-nowrap', style: { color: isDark ? '#fdba74' : '#c2410c' } }, suffix)
        );
      };

      // A prose aria-label describes a chart's shape but never its numbers. This
      // gives the same data as a real table, for a screen reader or for anyone who
      // would rather read values than squint at a line.
      var dataTable = function (id, caption, cols, rows) {
        var expanded = !!tableVisibility[id];
        var panelId = 'ht-table-' + id;
        return h('div', { className: 'mt-2' },
          h('button', {
            type: 'button',
            'aria-expanded': expanded ? 'true' : 'false',
            'aria-controls': panelId,
            onClick: function () {
              setTableVisibility(function (prev) {
                var next = Object.assign({}, prev);
                next[id] = !prev[id];
                return next;
              });
            },
            className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold transition-colors',
            style: { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') }
          }, expanded ? t('stem.heatlab.hide_the_numbers', '▾ Hide the numbers') : t('stem.heatlab.show_the_numbers', '▸ Show the numbers')),
          expanded ? h('div', { id: panelId, role: 'region', 'aria-label': caption, className: 'mt-2 overflow-x-auto' },
            h('table', { className: 'w-full text-[0.6875rem]', style: { borderCollapse: 'collapse' } },
              h('caption', { className: 'text-left text-[0.6875rem] mb-1', style: { color: isDark ? '#94a3b8' : '#64748b' } }, caption),
              h('thead', null, h('tr', null, cols.map(function (c) {
                return h('th', { key: c, scope: 'col', className: 'text-left py-1 pr-3 font-bold', style: { color: isDark ? '#cbd5e1' : '#475569', borderBottom: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.25)') } }, c);
              }))),
              h('tbody', null, rows.map(function (r, i) {
                return h('tr', { key: i }, r.map(function (cell, ci) {
                  return h('td', { key: ci, className: 'py-1 pr-3', style: { color: isDark ? '#e2e8f0' : '#334155', borderBottom: '1px solid ' + (isDark ? 'rgba(148,163,184,0.14)' : 'rgba(100,116,139,0.12)') } }, cell);
                }));
              }))
            )
          ) : null
        );
      };

      // ── Shared small helpers for the stage A additions ──────────────
      var neutralBtnStyle = function (on) {
        if (isContrast) return on ? { background: '#fbbf24', color: '#000000', border: '2px solid #fbbf24' } : { background: '#000000', color: '#ffffff', border: '2px solid #fbbf24' };
        return on
          ? { background: '#fb923c', color: '#0b1020', border: '1px solid #fb923c' }
          : { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') };
      };
      var bodyInk = isContrast ? '#ffffff' : isDark ? '#e2e8f0' : '#334155';
      var softInk = isContrast ? '#ffffff' : isDark ? '#cbd5e1' : '#475569';
      var panelStyle = function (accent) {
        return {
          borderColor: isContrast ? '#fbbf24' : accent + '66',
          background: isContrast ? '#000000' : isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.92)'
        };
      };
      function fmtW(w) {
        if (!isFinite(w)) return '—';
        var a = Math.abs(w);
        if (a === 0) return '0 W';
        if (a >= 100) return fmt(w, 0) + ' W';
        if (a >= 1) return w.toFixed(2) + ' W';
        if (a >= 0.001) return (w * 1000).toFixed(1) + ' mW';
        return (w * 1e6).toFixed(1) + ' µW';
      }
      function fmtJ(j) {
        if (!isFinite(j)) return '—';
        var a = Math.abs(j);
        if (a === 0) return '0 J';
        if (a >= 1e4) return fmt(j / 1000, 1) + ' kJ';
        if (a >= 1) return j.toFixed(1) + ' J';
        if (a >= 0.001) return (j * 1000).toFixed(1) + ' mJ';
        return (j * 1e6).toFixed(1) + ' µJ';
      }

      // ── Conduction race: live readouts (thermometers, ledger) ──────────
      var blankBar = { inW: 0, outW: 0, inJ: 0, outJ: 0, storedJ: 0, mid: HEAT_COLD_C, reach: null };
      var live = raceLive || { clock: 0, racing: raceOn, hot: hotEnd, a: blankBar, b: raceOn ? blankBar : null, probes: [] };
      function probeReading(i) {
        var v = live.probes && live.probes[i];
        return typeof v === 'number' && isFinite(v) ? v : HEAT_COLD_C;
      }
      function setProbes(next) { upd({ probes: next.slice(0, HEAT_PROBE_MAX) }); }
      function setProbe(i, patch) {
        if (patch && typeof patch.cm === 'number' && probeHintOn) setProbeHintOn(false);
        setProbes(probes.map(function (p, j) { return j === i ? Object.assign({}, p, patch) : p; }));
      }
      var probeSummary = probes.map(function (p, i) {
        return 'P' + (i + 1) + ' ' + p.cm + ' cm' + (raceOn && p.bar === 'b' ? ' ' + t('stem.heatlab.probe_on_bottom', 'on the bottom bar') : '') +
          ': ' + probeReading(i).toFixed(1) + ' °C';
      }).join('; ');
      function recordRaceTrial() {
        var el = canvasRef.current;
        var snap = el && el._heatSnapshot ? el._heatSnapshot() : live;
        var row = {
          kind: 'conduction-race', section: 'conduction', at: Date.now(),
          hotC: hotEnd, timeScale: timeScale, matA: matId, matB: raceOn ? matBId : null,
          simS: snap.clock, reachA_s: snap.a ? snap.a.reach : null, reachB_s: snap.b ? snap.b.reach : null,
          midA_C: snap.a ? snap.a.mid : null, midB_C: snap.b ? snap.b.mid : null,
          inA_J: snap.a ? snap.a.inJ : null, storedA_J: snap.a ? snap.a.storedJ : null, outA_J: snap.a ? snap.a.outJ : null
        };
        probes.forEach(function (p, i) {
          row['p' + (i + 1) + '_cm'] = p.cm;
          row['p' + (i + 1) + '_bar'] = p.bar;
          row['p' + (i + 1) + '_C'] = snap.probes && typeof snap.probes[i] === 'number' ? snap.probes[i] : null;
        });
        var n = recordTrial(row);
        if (typeof announceToSR === 'function') announceToSR(__alloOneWord(t('stem.heatlab.sr_trial_recorded', 'Trial recorded. {n} rows in your log.').replace('{n}', String(n))));
      }
      var logCount = Array.isArray(d.log) ? d.log.length : 0;

      // ── First minute: guess, then race two different bars ────────────
      // toolData._heatLab.firstRace = { a, b, pick: 'a'|'b'|'tie', stage:
      // 'predict'|'racing'|'done', winner, correct, reachA, reachB, round }.
      // The guess is locked by the same press that starts the race, the speed
      // is the auto scale (both finish inside ~20 s), and the verdict is read
      // off the race itself once both middles have crossed 50 °C.
      var FR_PAIRS = [['copper', 'wood'], ['aluminium', 'steel'], ['water', 'wood'], ['glass', 'aerogel'], ['steel', 'glass']];
      var fr = d.firstRace && typeof d.firstRace === 'object' ? d.firstRace : {};
      function matById(id, fallback) { return MATERIALS.filter(function (m) { return m.id === id; })[0] || fallback; }
      var frA = matById(fr.a, matById('copper', MATERIALS[0]));
      var frB = matById(fr.b, matById('wood', MATERIALS[5]));
      var frPick = fr.pick === 'a' || fr.pick === 'b' || fr.pick === 'tie' ? fr.pick : null;
      // A saved stage past "predict" with no guess in it never happened.
      var frStage = frPick && (fr.stage === 'racing' || fr.stage === 'done') ? fr.stage : 'predict';
      function frGuessName(p) { return p === 'a' ? frA.name : p === 'b' ? frB.name : t('stem.heatlab.fr_tie', 'A tie'); }
      var frOnTrack = raceOn && matId === frA.id && matBId === frB.id;
      var frPairRacing = raceOn && (frOnTrack || (matId === frB.id && matBId === frA.id));
      var frHotMoved = frStage === 'racing' && !!live.hotMixed;
      // The pressed button leaves the DOM with its stage: focus goes to the card.
      var frFocusRef = React.useRef(false);
      React.useEffect(function () {
        if (!frFocusRef.current) return;
        frFocusRef.current = false;
        var cardEl = typeof document !== 'undefined' && document.querySelector('[data-ht-first-race]');
        if (cardEl) { try { cardEl.focus({ preventScroll: true }); } catch (e) {} }
      });
      function frSet(patch) { upd({ firstRace: Object.assign({}, fr, { a: frA.id, b: frB.id }, patch) }); }
      function frStart() {
        if (!frPick) return;
        upd({
          firstRace: Object.assign({}, fr, { a: frA.id, b: frB.id, pick: frPick, stage: 'racing', winner: null, correct: null, reachA: null, reachB: null }),
          mode: 'conduction', raceOn: true, matId: frA.id, matBId: frB.id, timeScale: 'auto'
        });
        pushAll('materialsTried', [frA.id, frB.id]);
        setRacePaused(false);
        frFocusRef.current = true;
        var el = canvasRef.current;
        if (el && el._heatReset) el._heatReset();
        if (typeof announceToSR === 'function') {
          announceToSR(t('stem.heatlab.sr_fr_locked', 'Guess locked: {g}. The race is on.').replace('{g}', function () { return frGuessName(frPick); }));
        }
      }
      function frNext() {
        var i = -1;
        FR_PAIRS.forEach(function (p, k) { if (p[0] === frA.id && p[1] === frB.id) i = k; });
        var nx = FR_PAIRS[(i + 1) % FR_PAIRS.length];
        frFocusRef.current = true;
        upd({ firstRace: { a: nx[0], b: nx[1], stage: 'predict', pick: null, round: (Number(fr.round) || 1) + 1 }, raceOn: false });
        var el = canvasRef.current;
        if (el && el._heatReset) el._heatReset();
      }
      // The verdict comes from the live race, never from a precomputed answer.
      var frLiveA = live.a && live.a.reach, frLiveB = live.b && live.b.reach;
      React.useEffect(function () {
        if (frStage !== 'racing' || !frOnTrack || !live.racing || !live.b) return;
        if (live.a.matId !== frA.id || live.b.matId !== frB.id || live.hotMixed) return;
        var ra = live.a.reach, rb = live.b.reach;
        if (ra === null || rb === null || ra === undefined || rb === undefined) return;
        var winner = Math.abs(ra - rb) <= 0.02 * Math.max(ra, rb) ? 'tie' : (ra < rb ? 'a' : 'b');
        var correct = frPick === winner;
        frSet({ stage: 'done', reachA: ra, reachB: rb, winner: winner, correct: correct });
        if (typeof announceToSR === 'function') {
          announceToSR(t('stem.heatlab.fr_done', 'Middle reached 50 °C: {a} after {ta}, {b} after {tb}.')
            .replace('{a}', function () { return frA.name; }).replace('{ta}', heatTimeLabel(ra))
            .replace('{b}', function () { return frB.name; }).replace('{tb}', heatTimeLabel(rb)) + ' ' +
            (correct ? t('stem.heatlab.fr_right', 'You guessed {g}: right!') : t('stem.heatlab.fr_wrong', 'You guessed {g}: not this time.'))
              .replace('{g}', function () { return frGuessName(frPick); }));
        }
      }, [frStage, frOnTrack, frLiveA, frLiveB]);
      function firstRaceCard() {
        if (mode !== 'conduction') return null;
        var accent = '#fb923c';
        var qId = 'ht-fr-q';
        var opts = [['a', frA.name], ['b', frB.name], ['tie', t('stem.heatlab.fr_tie', 'A tie')]];
        var body = [];
        if (frStage === 'predict') {
          body.push(h('fieldset', { key: 'fs', className: 'mt-1.5' },
            h('legend', { className: 'sr-only' }, t('stem.heatlab.fr_legend', 'Your guess')),
            h('div', { className: 'flex flex-wrap gap-1.5' }, opts.map(function (o) {
              var on = frPick === o[0];
              return h('label', {
                key: o[0], 'data-ht-fr-opt': o[0],
                className: 'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[0.6875rem] font-bold min-h-11',
                style: {
                  color: bodyInk,
                  borderColor: on ? (isContrast ? '#fbbf24' : ink(accent)) : (isContrast ? '#ffffff' : 'rgba(251,146,60,0.45)'),
                  background: on ? (isContrast ? '#000000' : isDark ? 'rgba(251,146,60,0.18)' : 'rgba(251,146,60,0.12)') : 'transparent',
                  borderWidth: on ? 2 : 1
                }
              },
                h('input', { type: 'radio', name: 'ht-fr-guess', value: o[0], checked: on,
                  onChange: function () { frSet({ pick: o[0], stage: 'predict' }); },
                  className: 'h-4 w-4 flex-shrink-0 accent-orange-600' }),
                h('span', null, o[1]));
            }))),
            h('button', {
              key: 'go', type: 'button', disabled: !frPick, 'aria-disabled': frPick ? 'false' : 'true', 'data-ht-fr-start': 'true',
              onClick: frStart,
              className: 'mt-2 min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-black disabled:cursor-not-allowed disabled:opacity-50',
              style: isContrast ? { background: '#fbbf24', color: '#000000', border: '2px solid #fbbf24' } : { background: '#c2410c', color: '#ffffff', border: '1px solid #c2410c' }
            }, '🏁 ' + t('stem.heatlab.fr_lock', 'Lock my guess and race')));
        } else {
          body.push(h('p', { key: 'g', className: 'text-[0.6875rem] mt-1 font-bold', 'data-ht-fr-guess': frPick || '', style: { color: bodyInk } },
            '🔒 ' + t('stem.heatlab.fr_locked', 'Your guess: {g} (locked).').replace('{g}', function () { return frGuessName(frPick); })));
        }
        if (frStage === 'racing') {
          body.push(frOnTrack && !frHotMoved
            ? h('p', { key: 'r', className: 'text-[0.6875rem] mt-1 leading-relaxed', 'data-ht-fr-speed': String(timeScale), style: { color: softInk } },
              prefersReducedMotion
                ? t('stem.heatlab.fr_racing_rm', 'Press “Advance” under the bars to step the race. Each press is {t} of real time.').replace('{t}', heatTimeLabel(timeScale))
                : (timeScaleAuto
                  ? t('stem.heatlab.fr_racing', 'The race is on. 1 s here = {t} of real time, so the slower bar finishes in about 20 s.')
                  : t('stem.heatlab.fr_racing_manual', 'The race is on. 1 s here = {t} of real time. Auto speed finishes it in about 20 s.')).replace('{t}', heatTimeLabel(timeScale)))
            : h('div', { key: 'r', className: 'mt-1' },
              h('p', { className: 'text-[0.6875rem] leading-relaxed', style: { color: softInk } },
                (frOnTrack
                  ? t('stem.heatlab.fr_changed_hot', 'You changed the hot end during the race. Race {a} against {b} again to check your guess.')
                  : t('stem.heatlab.fr_changed', 'You changed the bars. Race {a} against {b} again to check your guess.'))
                  .replace('{a}', function () { return frA.name; }).replace('{b}', function () { return frB.name; })),
              h('button', { type: 'button', onClick: frStart, 'data-ht-fr-again': 'true',
                className: 'mt-1 min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(false) },
                '↺ ' + t('stem.heatlab.fr_again', 'Race them again'))));
        }
        if (frStage === 'done') {
          var ra = Number(fr.reachA), rb = Number(fr.reachB);
          var pred = heatRacePrediction(frA, frB);
          var ratio = pred.ratio >= 10 ? Math.round(pred.ratio).toLocaleString() : pred.ratio.toFixed(1);
          body.push(h('div', { key: 'v', role: 'status', className: 'mt-1.5 rounded-lg border p-2', 'data-ht-fr-result': fr.correct ? 'right' : 'wrong', style: panelStyle(fr.correct ? '#16a34a' : '#f59e0b') },
            h('p', { className: 'text-[0.6875rem] font-black', style: { color: isContrast ? '#ffffff' : fr.correct ? ink('#16a34a') : (isDark ? '#fcd34d' : '#92400e') } },
              (fr.correct ? '✅ ' + t('stem.heatlab.fr_right', 'You guessed {g}: right!') : '🔁 ' + t('stem.heatlab.fr_wrong', 'You guessed {g}: not this time.'))
                .replace('{g}', function () { return frGuessName(frPick); })),
            h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: bodyInk } },
              t('stem.heatlab.fr_done', 'Middle reached 50 °C: {a} after {ta}, {b} after {tb}.')
                .replace('{a}', function () { return frA.name; }).replace('{ta}', heatTimeLabel(ra))
                .replace('{b}', function () { return frB.name; }).replace('{tb}', heatTimeLabel(rb))),
            h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: bodyInk } },
              fr.winner === 'tie'
                ? t('stem.heatlab.fr_why_tie', 'Same diffusivity, same race: a dead heat.')
                : t('stem.heatlab.fr_why', '{f} spreads a temperature change {r}× faster than {s}, so its middle warms first. Scientists call this diffusivity.')
                  .replace('{f}', function () { return pred.fasterName; }).replace('{r}', ratio).replace('{s}', function () { return pred.slowerName; }))),
            h('button', { key: 'n', type: 'button', onClick: frNext, 'data-ht-fr-next': 'true',
              className: 'mt-2 min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(false) },
              '🎲 ' + t('stem.heatlab.fr_new', 'New race, new guess')));
        }
        return h('div', { 'data-ht-first-race': frStage, role: 'group', 'aria-labelledby': qId, tabIndex: -1,
          className: 'mb-2 rounded-lg border p-2.5', style: panelStyle(accent) },
          h('p', { id: qId, className: 'text-[0.75rem] font-black leading-snug', style: { color: isContrast ? '#fbbf24' : ink(accent) } },
            '🏁 ' + t('stem.heatlab.fr_q', '{a} or {b}: whose middle reaches 50 °C first?')
              .replace('{a}', function () { return frA.name; }).replace('{b}', function () { return frB.name; })),
          body);
      }

      // ── Predict-observe-explain cards ─────────────────────────────────
      var MISCONCEPTIONS = heatMisconceptions(t);
      var misById = {};
      MISCONCEPTIONS.forEach(function (m) { misById[m.id] = m; });
      var POE_CARDS = heatPoeCards(t);
      var poeById = {};
      POE_CARDS.forEach(function (c) { poeById[c.id] = c; });
      var poeState = d.poe && typeof d.poe === 'object' ? d.poe : {};
      function poePatch(id, patch, extra) {
        var all = Object.assign({}, poeState);
        all[id] = Object.assign({}, poeState[id] || {}, patch);
        upd(Object.assign({ poe: all }, extra || {}));
      }
      function poeCommit(card) {
        var st = poeState[card.id] || {};
        var opt = card.options.filter(function (o) { return o.id === st.pick; })[0];
        if (!opt || (st.stage && st.stage !== 'predict')) return;
        var extra = {};
        var patch = { stage: 'observe', firstPick: st.firstPick || opt.id };
        // The tally counts a card's misconception once, on the learner's first
        // committed answer, so retrying a card cannot inflate it.
        if (opt.tag && !st.counted) {
          var tally = Object.assign({}, d.misTally || {});
          tally[opt.tag] = (tally[opt.tag] || 0) + 1;
          extra.misTally = tally;
          patch.counted = true;
        } else if (!st.counted) {
          patch.counted = true;
        }
        poePatch(card.id, patch, extra);
        if (typeof announceToSR === 'function') announceToSR(t('stem.heatlab.sr_poe_locked', 'Prediction locked in. Now check the evidence.'));
      }
      function poeGoEvidence(card) {
        var st = poeState[card.id] || {};
        poePatch(card.id, { observed: true }, card.setup || null);
        if (card.resetRace) {
          var el = canvasRef.current;
          if (el && el._heatReset) el._heatReset();
        }
        var s = HT_SECTIONS.filter(function (x) { return x.id === card.section; })[0];
        if (s) htGoTo(s);
        return st;
      }
      function poeExplain(card) {
        var st = poeState[card.id] || {};
        var opt = card.options.filter(function (o) { return o.id === st.pick; })[0];
        poePatch(card.id, { stage: 'explain', explained: true, lastCorrect: !!(opt && opt.id === card.answer) });
        if (!st.explained && typeof awardXP === 'function') awardXP('heatlab_poe', 2, t('stem.heatlab.xp_poe', 'Predicted, checked the evidence and explained'));
        if (typeof announceToSR === 'function') {
          announceToSR(opt && opt.id === card.answer
            ? t('stem.heatlab.poe_right', 'Your prediction matches the evidence.')
            : t('stem.heatlab.poe_not_quite', 'Not quite: the evidence points another way.'));
        }
      }
      function poeRetry(card) {
        poePatch(card.id, { stage: 'predict', pick: null, observed: false });
      }
      function poeCard(id) {
        var card = poeById[id];
        if (!card) return null;
        var st = poeState[id] || {};
        var stage = st.stage === 'observe' || st.stage === 'explain' ? st.stage : 'predict';
        var picked = card.options.filter(function (o) { return o.id === st.pick; })[0] || null;
        var correct = !!(picked && picked.id === card.answer);
        var accent = '#a78bfa';
        var ideaUsed = !picked ? '' : correct ? card.idea
          : (picked.tag && misById[picked.tag] ? misById[picked.tag].label : t('stem.heatlab.poe_idea_untagged', 'a guess that the evidence does not support'));
        return h('div', {
          key: 'poe-' + id, 'data-ht-poe': id, role: 'group', 'aria-labelledby': 'ht-poe-q-' + id,
          className: 'mt-3 rounded-lg border p-2.5', style: panelStyle(accent)
        },
          h('p', { className: 'text-[0.625rem] font-black uppercase tracking-wide', style: { color: isContrast ? '#fbbf24' : ink(accent) } },
            '🔮 ' + t('stem.heatlab.poe_badge', 'Predict, check, explain')),
          h('p', { id: 'ht-poe-q-' + id, className: 'text-[0.6875rem] font-bold mt-1 leading-relaxed', style: { color: bodyInk } }, card.q),
          h('fieldset', { className: 'mt-1.5', disabled: stage !== 'predict' },
            h('legend', { className: 'sr-only' }, t('stem.heatlab.poe_legend', 'Your prediction')),
            h('div', { className: 'grid gap-1' }, card.options.map(function (o) {
              var on = st.pick === o.id;
              return h('label', {
                key: o.id,
                className: 'flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-[0.6875rem] min-h-11',
                style: {
                  color: bodyInk,
                  borderColor: on ? (isContrast ? '#fbbf24' : ink(accent)) : (isContrast ? '#ffffff' : 'rgba(167,139,250,0.35)'),
                  background: on ? (isContrast ? '#000000' : isDark ? 'rgba(167,139,250,0.18)' : 'rgba(167,139,250,0.12)') : 'transparent',
                  borderWidth: on ? 2 : 1
                }
              },
                h('input', {
                  type: 'radio', name: 'ht-poe-' + id, value: o.id, checked: on,
                  onChange: function () { poePatch(id, { pick: o.id }); },
                  className: 'mt-0.5 h-4 w-4 flex-shrink-0 accent-violet-600'
                }),
                h('span', null, o.text));
            }))
          ),
          stage === 'predict' ? h('button', {
            type: 'button', disabled: !picked, 'aria-disabled': picked ? 'false' : 'true',
            onClick: function () { poeCommit(card); },
            className: 'mt-2 min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-black disabled:cursor-not-allowed disabled:opacity-50',
            style: isContrast ? { background: '#fbbf24', color: '#000000', border: '2px solid #fbbf24' } : { background: '#6d28d9', color: '#ffffff', border: '1px solid #6d28d9' }
          }, t('stem.heatlab.poe_commit', 'Lock in my prediction')) : null,
          stage !== 'predict' ? h('div', { className: 'mt-2 rounded-lg border p-2', style: panelStyle('#38bdf8') },
            h('p', { className: 'text-[0.6875rem] font-black', style: { color: isContrast ? '#fbbf24' : ink('#38bdf8') } }, '👀 ' + t('stem.heatlab.poe_observe', 'Check the evidence')),
            h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: bodyInk } }, card.evidence()),
            h('div', { className: 'mt-1.5 flex flex-wrap gap-1.5' },
              h('button', {
                type: 'button', onClick: function () { poeGoEvidence(card); },
                className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(false)
              }, '↗ ' + t('stem.heatlab.poe_go', 'Show me in the demo')),
              stage === 'observe' ? h('button', {
                type: 'button', onClick: function () { poeExplain(card); },
                className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-black',
                style: isContrast ? { background: '#fbbf24', color: '#000000', border: '2px solid #fbbf24' } : { background: '#0369a1', color: '#ffffff', border: '1px solid #0369a1' }
              }, t('stem.heatlab.poe_explain_btn', 'I have checked: explain it')) : null
            )
          ) : null,
          stage === 'explain' ? h('div', { role: 'status', className: 'mt-2 rounded-lg border p-2', style: panelStyle(correct ? '#16a34a' : '#f59e0b') },
            h('p', { className: 'text-[0.6875rem] font-black', style: { color: isContrast ? '#ffffff' : correct ? ink('#16a34a') : (isDark ? '#fcd34d' : '#92400e') } },
              correct ? '✅ ' + t('stem.heatlab.poe_right', 'Your prediction matches the evidence.')
                : '🔁 ' + t('stem.heatlab.poe_not_quite', 'Not quite: the evidence points another way.')),
            h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: bodyInk } },
              h('b', null, t('stem.heatlab.poe_idea_used', 'The idea you used:') + ' '), ideaUsed),
            !correct ? h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: bodyInk } },
              h('b', null, t('stem.heatlab.poe_better_idea', 'The idea that fits the evidence:') + ' '), card.idea) : null,
            h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: bodyInk } }, card.explain),
            h('button', {
              type: 'button', onClick: function () { poeRetry(card); },
              className: 'mt-1.5 min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(false)
            }, '↺ ' + t('stem.heatlab.poe_retry', 'Try this one again'))
          ) : null
        );
      }

      // ══ Stage B: notebook, particle lens, thermal camera, touch test, two blocks ══
      function matById(id, fallback) { return MATERIALS.filter(function (m) { return m.id === id; })[0] || fallback; }
      function numOr(v, fb) { return typeof v === 'number' && isFinite(v) ? v : fb; }
      function sciText(n) {
        if (!isFinite(n) || n <= 0) return '0';
        var e = Math.floor(Math.log10(n)), m = n / Math.pow(10, e);
        if (m >= 9.95) { m /= 10; e += 1; }
        var sup = String(e).split('').map(function (ch) { return ch === '-' ? '⁻' : '⁰¹²³⁴⁵⁶⁷⁸⁹'.charAt(Number(ch)); }).join('');
        return m.toFixed(1) + ' × 10' + sup;
      }
      var KIND_LABELS = {
        'conduction-race': t('stem.heatlab.kind_race', 'Conduction race'),
        mug: t('stem.heatlab.kind_mug', 'Insulated mug'),
        wall: t('stem.heatlab.kind_wall', 'Wall'),
        touch: t('stem.heatlab.kind_touch', 'Touch test'),
        mixing: t('stem.heatlab.kind_mixing', 'Calorimetry'),
        equilibrium: t('stem.heatlab.kind_equilibrium', 'Two blocks'),
        'heating-curve': t('stem.heatlab.kind_curve', 'Heating curve'),
        radiation: t('stem.heatlab.kind_radiation', 'Radiation'),
        expansion: t('stem.heatlab.kind_expansion', 'Thermal expansion'),
        'heat-pump': t('stem.heatlab.kind_heatpump', 'Heat pump')
      };
      function kindLabel(k) { return KIND_LABELS[k] || String(k); }
      function goToSection(id) {
        var s = HT_SECTIONS.filter(function (x) { return x.id === id; })[0];
        if (s) htGoTo(s);
      }
      function notebookChip() {
        if (!logCount) return null;
        return h('button', {
          type: 'button',
          onClick: function () { goToSection('notebook'); },
          'aria-label': __alloOneWord(t('stem.heatlab.nb_open_aria', 'Open the lab notebook: {n} rows recorded').replace('{n}', String(logCount))),
          className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(false)
        }, '📓 ' + t('stem.heatlab.log_count', '{n} in your log').replace('{n}', String(logCount)));
      }
      // One "Record trial" control per section. buildRow runs at click time and
      // returns plain primitives (recordTrial drops anything else).
      function recordButton(kind, buildRow, disabled) {
        return h('div', { className: 'mt-2 flex flex-wrap items-center gap-2', 'data-ht-record': kind },
          h('button', {
            type: 'button', disabled: !!disabled, 'aria-disabled': disabled ? 'true' : 'false',
            'aria-label': t('stem.heatlab.record_kind_aria', 'Record this {what} trial in your lab notebook').replace('{what}', kindLabel(kind)),
            onClick: function () {
              if (disabled) return;
              var row = buildRow();
              if (!row) return;
              var n = recordTrial(Object.assign({ kind: kind }, row));
              if (typeof announceToSR === 'function') announceToSR(__alloOneWord(t('stem.heatlab.sr_trial_recorded', 'Trial recorded. {n} rows in your log.').replace('{n}', String(n))));
            },
            className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold disabled:cursor-not-allowed disabled:opacity-50',
            style: neutralBtnStyle(false)
          }, '📝 ' + t('stem.heatlab.record_trial', 'Record trial')),
          notebookChip());
      }

      // ── Thermal camera controls and the shared colour key ──
      var irKeyGradient = [0, 0.2, 0.4, 0.6, 0.8, 1].map(function (f) { return heatIrColour(f, irPalette) + ' ' + (f * 100) + '%'; }).join(', ');
      function irKey(lo, hi) {
        return h('span', { className: 'flex flex-wrap items-center gap-1.5 text-[0.625rem] font-bold', style: { color: softInk } },
          h('span', null, lo == null ? t('stem.heatlab.ir_cooler', 'cooler') : fmt(lo, 0) + ' °C'),
          h('span', { 'aria-hidden': 'true', style: { display: 'inline-block', width: 72, height: 10, borderRadius: 3, background: 'linear-gradient(90deg, ' + irKeyGradient + ')', border: '1px solid ' + (isContrast ? '#ffffff' : 'rgba(100,116,139,0.5)') } }),
          h('span', null, hi == null ? t('stem.heatlab.ir_hotter', 'hotter') : fmt(hi, 0) + ' °C'),
          h('span', null, t('stem.heatlab.ir_key_note', 'darker = colder, brighter = hotter')));
      }
      function irControls(where, lo, hi) {
        return h('div', { className: 'mt-2 flex flex-wrap items-center gap-1.5', 'data-ht-ir-controls': where },
          h('button', {
            type: 'button', 'aria-pressed': irOn ? 'true' : 'false',
            onClick: function () {
              upd({ irOn: !irOn });
              if (typeof announceToSR === 'function') announceToSR(irOn ? t('stem.heatlab.sr_ir_off', 'Thermal camera off.') : t('stem.heatlab.sr_ir_on', 'Thermal camera on. Colours now show temperature.'));
            },
            className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(irOn)
          }, '📷 ' + t('stem.heatlab.ir_toggle', 'Thermal camera')),
          irOn ? h('button', {
            type: 'button', 'aria-pressed': irPalette === 'grey' ? 'true' : 'false',
            onClick: function () { upd({ irGrey: irPalette !== 'grey' }); },
            className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(irPalette === 'grey')
          }, t('stem.heatlab.ir_grey', 'Greyscale palette')) : null,
          irOn ? irKey(lo, hi) : null);
      }
      function irCanvas(el, cssH) {
        if (!el || typeof el.getContext !== 'function') return null;
        var c = el.getContext('2d');
        if (!c) return null;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var W = el.width = Math.round((el.offsetWidth || 320) * dpr);
        var H = el.height = Math.round((el.offsetHeight || cssH) * dpr);
        return { c: c, W: W, H: H, dpr: dpr, u: function (px) { return px * dpr; } };
      }
      function irLabel(g, text, x, y, align) {
        g.c.font = '700 ' + g.u(10) + 'px system-ui, sans-serif';
        g.c.textAlign = align || 'center'; g.c.textBaseline = 'middle';
        g.c.lineWidth = g.u(3); g.c.strokeStyle = '#000000'; g.c.strokeText(text, x, y);
        g.c.fillStyle = '#ffffff'; g.c.fillText(text, x, y);
      }
      // Temperature along a horizontal line through a view described as zones
      // [{ from, to (fractions of the width), a, b (C at each edge), name }].
      function zoneAt(zones, f) {
        var x = clamp(f, 0, 1);
        for (var i = 0; i < zones.length; i++) {
          var z = zones[i];
          if (x <= z.to || i === zones.length - 1) {
            var span = z.to - z.from;
            return { zone: z, T: span > 0 ? z.a + (z.b - z.a) * clamp((x - z.from) / span, 0, 1) : z.a };
          }
        }
        return { zone: zones[0], T: zones[0].a };
      }

      // ── Insulated mug: minute, camera view and particle lens ──
      var mugMin = clamp(numOr(d.mugMin, 0), 0, 60);
      var mugTeaC = heatCoolingTemperature(insMat, thickness, mugMin);
      var mugSurfC = heatMugSurfaceC(insMat, thickness, mugTeaC);
      var mugBareSurfC = heatMugSurfaceC(MATERIALS[0], 1, heatCoolingTemperature(MATERIALS[0], 1, mugMin));
      var mugCross = clamp(numOr(d.irCrossMug, 50), 0, 100);
      var MUG_ZONE_NAMES = {
        air: t('stem.heatlab.zone_room_air', 'room air'), film: t('stem.heatlab.zone_air_film', 'still air film'),
        wrap: t('stem.heatlab.zone_wrap', 'the wrap'), tea: t('stem.heatlab.zone_tea', 'the tea')
      };
      function mugZones() {
        var w = clamp(0.02 + thickness * 0.005, 0.02, 0.2), film = 0.035, inner = 0.3;
        return [
          { from: 0, to: inner - w - film, a: HEAT_COLD_C, b: HEAT_COLD_C, name: MUG_ZONE_NAMES.air },
          { from: inner - w - film, to: inner - w, a: HEAT_COLD_C, b: mugSurfC, name: MUG_ZONE_NAMES.film },
          { from: inner - w, to: inner, a: mugSurfC, b: mugTeaC, name: MUG_ZONE_NAMES.wrap },
          { from: inner, to: 1 - inner, a: mugTeaC, b: mugTeaC, name: MUG_ZONE_NAMES.tea },
          { from: 1 - inner, to: 1 - inner + w, a: mugTeaC, b: mugSurfC, name: MUG_ZONE_NAMES.wrap },
          { from: 1 - inner + w, to: 1 - inner + w + film, a: mugSurfC, b: HEAT_COLD_C, name: MUG_ZONE_NAMES.film },
          { from: 1 - inner + w + film, to: 1, a: HEAT_COLD_C, b: HEAT_COLD_C, name: MUG_ZONE_NAMES.air }
        ];
      }
      var mugCrossRead = zoneAt(mugZones(), mugCross / 100);
      React.useEffect(function () {
        var el = mugIrRef.current;
        if (!el) return;
        var paint = function () {
          var g = irCanvas(el, 170);
          if (!g) return;
          var zones = mugZones(), lo = HEAT_COLD_C, hi = 90;
          var col = function (T) { return heatIrColour((T - lo) / (hi - lo), irPalette); };
          var top = g.H * 0.16, bottom = g.H * 0.86, base = g.u(10);
          g.c.fillStyle = col(HEAT_COLD_C);
          g.c.fillRect(0, 0, g.W, g.H);
          var step = Math.max(1, Math.round(g.u(1)));
          for (var x = 0; x < g.W; x += step) {
            var r = zoneAt(zones, (x + step / 2) / g.W);
            if (r.zone.name === MUG_ZONE_NAMES.air) continue;
            g.c.fillStyle = col(r.T);
            g.c.fillRect(x, top, step, bottom - top);
          }
          // the wrap under the mug, at its mid-thickness temperature
          var wl = zones[1].from * g.W, wr = zones[5].to * g.W;
          g.c.fillStyle = col((mugTeaC + mugSurfC) / 2);
          g.c.fillRect(wl, bottom, wr - wl, base);
          var cx = mugCross / 100 * g.W, cy = (top + bottom) / 2;
          g.c.lineWidth = g.u(3); g.c.strokeStyle = '#000000';
          g.c.beginPath(); g.c.moveTo(cx, cy - g.u(14)); g.c.lineTo(cx, cy + g.u(14)); g.c.moveTo(cx - g.u(14), cy); g.c.lineTo(cx + g.u(14), cy); g.c.stroke();
          g.c.lineWidth = g.u(1.5); g.c.strokeStyle = '#00ffff'; g.c.stroke();
          irLabel(g, fmt(zoneAt(zones, mugCross / 100).T, 1) + ' °C', clamp(cx, g.u(30), g.W - g.u(30)), cy - g.u(24));
          irLabel(g, t('stem.heatlab.ir_mug_tea', 'tea {t} °C').replace('{t}', fmt(mugTeaC, 1)), g.W / 2, top - g.u(10));
          irLabel(g, t('stem.heatlab.ir_mug_surface', 'outer surface {t} °C').replace('{t}', fmt(mugSurfC, 1)), g.W / 2, bottom + base + g.u(9));
        };
        el._htRedraw = paint;
        paint();
      }, [irOn, irPalette, insMatId, thickness, mugMin, mugCross, isDark, isContrast]);

      // ── Wall: camera view of the temperature through the layers ──
      var WALL_IN_C = 21, WALL_OUT_C = 2;
      var wallLayersNow = wallStack.map(function (id) { return WALL_LAYERS.filter(function (x) { return x.id === id; })[0]; }).filter(Boolean);
      var wallProf = heatWallProfile(wallLayersNow.map(function (L) { return L.r; }), WALL_IN_C, WALL_OUT_C);
      var wallCross = clamp(numOr(d.irCrossWall, 50), 0, 100);
      function wallZones() {
        var b = wallProf.boundaries;
        var names = { inAir: t('stem.heatlab.zone_inside_air', 'inside air'), inFilm: t('stem.heatlab.zone_inside_film', 'inside air film'),
          outFilm: t('stem.heatlab.zone_outside_film', 'outside air film'), outAir: t('stem.heatlab.zone_outside_air', 'outside air') };
        var z = [{ from: 0, to: 0.05, a: WALL_IN_C, b: WALL_IN_C, name: names.inAir }];
        if (!wallLayersNow.length) {
          z.push({ from: 0.05, to: 0.5, a: b[0], b: b[1], name: names.inFilm });
          z.push({ from: 0.5, to: 0.95, a: b[1], b: b[2], name: names.outFilm });
        } else {
          z.push({ from: 0.05, to: 0.1, a: b[0], b: b[1], name: names.inFilm });
          var mmTot = wallLayersNow.reduce(function (s, L) { return s + (HEAT_WALL_MM[L.id] || 50); }, 0);
          var x = 0.1;
          wallLayersNow.forEach(function (L, k) {
            var w = 0.8 * (HEAT_WALL_MM[L.id] || 50) / mmTot;
            z.push({ from: x, to: x + w, a: b[1 + k], b: b[2 + k], name: L.name, layer: L });
            x += w;
          });
          z.push({ from: 0.9, to: 0.95, a: b[b.length - 2], b: b[b.length - 1], name: names.outFilm });
        }
        z.push({ from: 0.95, to: 1, a: WALL_OUT_C, b: WALL_OUT_C, name: names.outAir });
        return z;
      }
      var wallCrossRead = zoneAt(wallZones(), wallCross / 100);
      var wallBiggestDrop = wallZones().filter(function (z) { return z.layer; }).reduce(function (best, z) {
        var dT = Math.abs(z.a - z.b);
        return !best || dT > best.dT ? { name: z.name, dT: dT } : best;
      }, null);
      React.useEffect(function () {
        var el = wallIrRef.current;
        if (!el) return;
        var paint = function () {
          var g = irCanvas(el, 150);
          if (!g) return;
          var zones = wallZones();
          var col = function (T) { return heatIrColour((T - WALL_OUT_C) / (WALL_IN_C - WALL_OUT_C), irPalette); };
          var step = Math.max(1, Math.round(g.u(1)));
          for (var x = 0; x < g.W; x += step) {
            g.c.fillStyle = col(zoneAt(zones, (x + step / 2) / g.W).T);
            g.c.fillRect(x, 0, step, g.H);
          }
          // layer boundaries, so the bands can be told apart in greyscale too
          g.c.strokeStyle = 'rgba(255,255,255,0.55)';
          g.c.lineWidth = Math.max(1, g.dpr);
          g.c.setLineDash([g.u(3), g.u(3)]);
          zones.forEach(function (z, i) { if (i) { g.c.beginPath(); g.c.moveTo(z.from * g.W, g.u(22)); g.c.lineTo(z.from * g.W, g.H); g.c.stroke(); } });
          g.c.setLineDash([]);
          var cx = wallCross / 100 * g.W, cy = g.H * 0.58;
          g.c.lineWidth = g.u(3); g.c.strokeStyle = '#000000';
          g.c.beginPath(); g.c.moveTo(cx, cy - g.u(14)); g.c.lineTo(cx, cy + g.u(14)); g.c.moveTo(cx - g.u(14), cy); g.c.lineTo(cx + g.u(14), cy); g.c.stroke();
          g.c.lineWidth = g.u(1.5); g.c.strokeStyle = '#00ffff'; g.c.stroke();
          irLabel(g, fmt(zoneAt(zones, wallCross / 100).T, 1) + ' °C', clamp(cx, g.u(30), g.W - g.u(30)), cy - g.u(24));
          irLabel(g, t('stem.heatlab.ir_wall_inside', 'inside {t} °C').replace('{t}', fmt(WALL_IN_C, 0)), g.u(6), g.u(11), 'left');
          irLabel(g, t('stem.heatlab.ir_wall_outside', 'outside {t} °C').replace('{t}', fmt(WALL_OUT_C, 0)), g.W - g.u(6), g.u(11), 'right');
        };
        el._htRedraw = paint;
        paint();
      }, [irOn, irPalette, wallStack.join('|'), wallCross, isDark, isContrast]);

      // ── Touch test: two blocks at 20 C, a hand at 33 C ──
      var touchMatA = matById(d.touchA, MATERIALS[0]);
      var touchMatB = matById(d.touchB, MATERIALS[5]);
      var touchSide = d.touchSide === 'a' || d.touchSide === 'b' ? d.touchSide : null;
      var touchedIds = Array.isArray(d.touchTried) ? d.touchTried : [];
      var touchA = heatTouchTest(touchMatA), touchB = heatTouchTest(touchMatB);
      var TOUCH_LO = 15, TOUCH_HI = 35;
      function touchNow(side) {
        var m = side === 'b' ? touchMatB : touchMatA;
        upd({ touchSide: side, touchTried: touchedIds.indexOf(m.id) === -1 ? touchedIds.concat([m.id]) : touchedIds });
        var r = heatTouchTest(m);
        if (typeof announceToSR === 'function') {
          announceToSR(__alloOneWord(t('stem.heatlab.sr_touch', 'You touch the {mat} block. Your skin surface drops to {tc} degrees and loses {w} watts through a fingertip in the first second.')
            .replace('{mat}', m.name.toLowerCase()).replace('{tc}', fmt(r.contactC, 1)).replace('{w}', r.fingertipW.toFixed(2))));
        }
      }
      React.useEffect(function () {
        var el = touchIrRef.current;
        if (!el) return;
        var paint = function () {
          var g = irCanvas(el, 180);
          if (!g) return;
          var col = function (T) { return heatIrColour((T - TOUCH_LO) / (TOUCH_HI - TOUCH_LO), irPalette); };
          g.c.fillStyle = col(HEAT_COLD_C);
          g.c.fillRect(0, 0, g.W, g.H);
          var benchY = g.H * 0.74;
          var blocks = [{ side: 'a', m: touchMatA, r: touchA, x0: 0.1, x1: 0.42 }, { side: 'b', m: touchMatB, r: touchB, x0: 0.58, x1: 0.9 }];
          var bt = g.H * 0.48;
          g.c.strokeStyle = 'rgba(255,255,255,0.75)';
          g.c.lineWidth = Math.max(1, g.u(1.2));
          g.c.setLineDash([g.u(4), g.u(3)]);
          g.c.beginPath(); g.c.moveTo(0, benchY); g.c.lineTo(g.W, benchY); g.c.stroke();
          blocks.forEach(function (b) { g.c.strokeRect(b.x0 * g.W, bt, (b.x1 - b.x0) * g.W, benchY - bt); });
          g.c.setLineDash([]);
          blocks.forEach(function (b) {
            irLabel(g, b.m.name + ' ' + fmt(HEAT_COLD_C, 1) + ' °C', (b.x0 + b.x1) / 2 * g.W, (bt + benchY) / 2);
          });
          irLabel(g, t('stem.heatlab.ir_touch_bench', 'bench and air: 20 °C'), g.W / 2, benchY + g.u(14));
          // the hand: 33 C, cooled where it touches
          var target = touchSide === 'b' ? blocks[1] : touchSide === 'a' ? blocks[0] : null;
          var hx = target ? (target.x0 + target.x1) / 2 * g.W : g.W / 2;
          var hw = Math.min(g.W * 0.2, g.u(90)), hTop = g.u(18), hBot = target ? bt : bt - g.u(26);
          var grad = g.c.createLinearGradient(0, hTop, 0, hBot);
          grad.addColorStop(0, col(HEAT_SKIN_C));
          grad.addColorStop(0.75, col(HEAT_SKIN_C));
          grad.addColorStop(1, col(target ? target.r.contactC : HEAT_SKIN_C));
          g.c.fillStyle = grad;
          g.c.fillRect(hx - hw / 2, hTop, hw, hBot - hTop);
          if (target) {
            g.c.fillStyle = col(target.r.contactC);
            g.c.fillRect(hx - hw / 2, hBot - g.u(5), hw, g.u(5));
            irLabel(g, t('stem.heatlab.ir_touch_contact', 'skin surface {t} °C').replace('{t}', fmt(target.r.contactC, 1)), hx, hBot + g.u(11));
          }
          irLabel(g, t('stem.heatlab.ir_touch_hand', 'hand {t} °C').replace('{t}', fmt(HEAT_SKIN_C, 0)), hx, hTop + g.u(12));
        };
        el._htRedraw = paint;
        paint();
      }, [irPalette, touchMatA.id, touchMatB.id, touchSide, isDark, isContrast]);
      function touchWhy(m, r) {
        var e = r.effusivity;
        return t('stem.heatlab.touch_why', '{mat} sat at 20 °C, like everything on the bench, yet touching it drops your skin surface to {tc} °C. Its effusivity √(kρc) is {e}, {x} times your skin’s {es}, so heat drains out of your fingertip at {w} W in the first second ({kw} kW/m²). Your nerves sense heat leaving, not the block’s temperature, and that drain is what you call cold.')
          .replace('{mat}', m.name).replace('{tc}', fmt(r.contactC, 1)).replace('{e}', fmt(e, 0))
          .replace('{x}', e / HEAT_SKIN_EFFUSIVITY >= 1 ? fmt(e / HEAT_SKIN_EFFUSIVITY, 1) : (e / HEAT_SKIN_EFFUSIVITY).toFixed(2))
          .replace('{es}', fmt(HEAT_SKIN_EFFUSIVITY, 0)).replace('{w}', r.fingertipW.toFixed(2)).replace('{kw}', fmt(r.fluxWm2 / 1000, 1));
      }

      // ── Two blocks in contact: closed system, optional leak to the room ──
      var EQ_LEAK_G = 0.5;   // W/K from each block to the room when the leak is on
      var eqMat1 = matById(d.eqMat1, MATERIALS[0]);
      var eqMat2 = matById(d.eqMat2, MATERIALS[1]);
      var eqM1 = clamp(numOr(d.eqM1, 1), 0.1, 5), eqM2 = clamp(numOr(d.eqM2, 1), 0.1, 5);
      var eqT1 = clamp(numOr(d.eqT1, 90), 0, 100), eqT2 = clamp(numOr(d.eqT2, 10), 0, 100);
      var eqG = clamp(numOr(d.eqG, 5), 1, 20);
      var eqLeak = !!d.eqLeak;
      var eqCursor = clamp(numOr(d.eqCursor, 100), 0, 100);
      var eqBase = { m1: eqM1, c1: eqMat1.c, T1: eqT1, m2: eqM2, c2: eqMat2.c, T2: eqT2, G: eqG,
        leak1: eqLeak ? EQ_LEAK_G : 0, leak2: eqLeak ? EQ_LEAK_G : 0, roomC: HEAT_COLD_C };
      var eqProbe = heatTwoBodyEquilibrium(Object.assign({}, eqBase, { tEnd: 0, steps: 1 }));
      var eqTEnd = 6 * eqProbe.tauS;
      if (eqLeak && isFinite(eqProbe.leakTauS)) eqTEnd = Math.max(eqTEnd, 3 * eqProbe.leakTauS);
      eqTEnd = clamp(isFinite(eqTEnd) ? eqTEnd : 600, 10, 7 * 86400);
      var eqRun = heatTwoBodyEquilibrium(Object.assign({}, eqBase, { tEnd: eqTEnd, steps: 120 }));
      var eqTime = eqCursor / 100 * eqTEnd;
      var eqNow = eqRun.at(eqTime);
      var eqC1 = eqM1 * eqMat1.c, eqC2 = eqM2 * eqMat2.c;
      var eqFlowW = eqG * (eqNow.T1 - eqNow.T2);
      var eqLeakJ = eqNow.leak1J + eqNow.leak2J;
      var eqDU1 = eqC1 * (eqNow.T1 - eqT1), eqDU2 = eqC2 * (eqNow.T2 - eqT2);
      var EQ_COLOURS = PROBE_COLOURS;
      // One time unit per chart, so the ticks are round numbers of it.
      var eqUnit = eqTEnd <= 600 ? { div: 1, u: 's' } : eqTEnd <= 3 * 3600 ? { div: 60, u: 'min' } : { div: 3600, u: 'h' };
      React.useEffect(function () {
        var pts1 = eqRun.points.map(function (p) { return [p.t / eqUnit.div, p.T1]; });
        var pts2 = eqRun.points.map(function (p) { return [p.t / eqUnit.div, p.T2]; });
        var lo = Math.min(eqT1, eqT2, eqLeak ? HEAT_COLD_C : 100), hi = Math.max(eqT1, eqT2, eqLeak ? HEAT_COLD_C : 0);
        drawChart(eqTRef.current, {
          xMin: 0, xMax: eqTEnd / eqUnit.div, yMin: Math.floor(lo - 4), yMax: Math.ceil(hi + 4), xUnit: '', yUnit: '°',
          xLabel: t('stem.heatlab.eq_chart_x', 'time ({u})').replace('{u}', eqUnit.u), yLabel: t('stem.heatlab.eq_chart_y', 'temperature (°C)'),
          series: [
            { points: pts1, colour: EQ_COLOURS[0], width: 2.4 },
            { points: pts2, colour: EQ_COLOURS[1], width: 2.4, dashPattern: [6, 3] }
          ],
          refLines: [{ axis: 'y', at: eqRun.Tf, colour: isContrast ? '#ffffff' : (isDark ? '#4ade80' : '#15803d'), label: t('stem.heatlab.eq_chart_tf', 'shared final temperature, closed box'), align: 'left' }],
          legend: [
            { label: eqMat1.name + ' · ' + fmt(eqM1, 1) + ' kg', colour: EQ_COLOURS[0] },
            { label: eqMat2.name + ' · ' + fmt(eqM2, 1) + ' kg', colour: EQ_COLOURS[1], dashPattern: [6, 3] }
          ],
          markers: [{ x: eqTime / eqUnit.div, y: eqNow.T1, colour: EQ_COLOURS[0] }, { x: eqTime / eqUnit.div, y: eqNow.T2, colour: EQ_COLOURS[1] }]
        });
        var sBlocks = eqRun.points.map(function (p) { return [p.t / eqUnit.div, p.dS]; });
        var sRoom = eqRun.points.map(function (p) { return [p.t / eqUnit.div, p.dSroom]; });
        var sTotal = eqRun.points.map(function (p) { return [p.t / eqUnit.div, p.dStotal]; });
        var all = sBlocks.concat(eqLeak ? sRoom.concat(sTotal) : []).map(function (p) { return p[1]; });
        var sLo = Math.min(0, Math.min.apply(null, all)), sHi = Math.max(0.01, Math.max.apply(null, all));
        var pad = (sHi - sLo) * 0.08;
        var series = [{ points: sBlocks, colour: EQ_COLOURS[0], width: 2.4 }];
        var legend = [{ label: t('stem.heatlab.eq_s_blocks', 'ΔS of the two blocks'), colour: EQ_COLOURS[0] }];
        if (eqLeak) {
          series.push({ points: sRoom, colour: EQ_COLOURS[1], width: 2, dashPattern: [6, 3] });
          series.push({ points: sTotal, colour: EQ_COLOURS[2], width: 2.4, dashPattern: [2, 3] });
          legend.push({ label: t('stem.heatlab.eq_s_room', 'ΔS of the room'), colour: EQ_COLOURS[1], dashPattern: [6, 3] });
          legend.push({ label: t('stem.heatlab.eq_s_total', 'ΔS total'), colour: EQ_COLOURS[2], dashPattern: [2, 3] });
        }
        drawChart(eqSRef.current, {
          xMin: 0, xMax: eqTEnd / eqUnit.div, yMin: sLo - pad, yMax: sHi + pad, xUnit: '', yUnit: '',
          xLabel: t('stem.heatlab.eq_chart_x', 'time ({u})').replace('{u}', eqUnit.u), yLabel: t('stem.heatlab.eq_chart_s', 'entropy change (J/K)'),
          series: series, legend: legend, legendAt: 'bl',
          refLines: [{ axis: 'y', at: 0, colour: isContrast ? '#ffffff' : (isDark ? 'rgba(148,163,184,0.8)' : 'rgba(71,85,105,0.8)') }],
          markers: [{ x: eqTime / eqUnit.div, y: eqNow.dS, colour: EQ_COLOURS[0] }].concat(eqLeak ? [{ x: eqTime / eqUnit.div, y: eqNow.dStotal, colour: EQ_COLOURS[2] }] : [])
        });
      }, [eqMat1.id, eqMat2.id, eqM1, eqM2, eqT1, eqT2, eqG, eqLeak, eqCursor, isDark, isContrast]);

      // ── Particle zoom lens: shared toggles and per-section populations ──
      var lensTheme = isContrast ? 'contrast' : isDark ? 'dark' : 'light';
      var lensOpen = d.lens && typeof d.lens === 'object' ? d.lens : {};
      var LENS_HC = ['#ffff00', '#00ffff'];
      function lensColour(hex, i) { return isContrast ? LENS_HC[i % 2] : ink(hex); }
      function particleM(id) { return HEAT_MOLAR_MASS[id] || 0.03; }
      function phaseWords(phase) {
        return phase === 'gas' ? t('stem.heatlab.lens_gas', 'a gas: the molecules fly freely and meet only in collisions')
          : phase === 'liquid' ? t('stem.heatlab.lens_liquid', 'a liquid: the molecules slide past one another, always touching')
            : t('stem.heatlab.lens_solid', 'a solid: the particles vibrate about fixed places in a lattice');
      }
      function speedWords(tempC, M) {
        return t('stem.heatlab.lens_speed', 'average speed about {v} m/s, {r} times their speed at 20 °C')
          .replace('{v}', fmt(heatRmsSpeed(tempC, M), 0)).replace('{r}', heatSpeedRatio(tempC, 20).toFixed(2));
      }
      function lensToggle(key) {
        var open = !!lensOpen[key];
        return h('button', {
          type: 'button', 'aria-expanded': open ? 'true' : 'false', 'aria-controls': 'ht-lens-' + key,
          onClick: function () { var next = Object.assign({}, lensOpen); next[key] = !open; upd({ lens: next }); },
          className: 'mt-2 min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(open)
        }, (open ? '▾ ' : '🔍 ') + t('stem.heatlab.lens_toggle', 'Zoom in on the particles'));
      }
      function lensPanel(key, props, children) {
        if (!lensOpen[key]) return null;
        return h(HeatParticleLens, Object.assign({
          React: React, t: t, id: 'ht-lens-' + key, theme: lensTheme, panel: panelStyle('#a78bfa'), ink: bodyInk, live: true
        }, props), children || null);
      }
      // Race: a thermometer, or the middle of the top bar.
      var lensProbe = typeof d.lensProbe === 'number' && d.lensProbe >= 0 && d.lensProbe < probes.length ? d.lensProbe : -1;
      var raceLensMat = lensProbe >= 0 && raceOn && probes[lensProbe].bar === 'b' ? materialB : material;
      var raceLensT = lensProbe >= 0 ? probeReading(lensProbe) : (live.a && isFinite(live.a.mid) ? live.a.mid : HEAT_COLD_C);
      var raceLensPhase = raceLensMat.id === 'water' ? 'liquid' : 'solid';
      var raceLensWhere = lensProbe >= 0
        ? t('stem.heatlab.lens_where_probe', 'thermometer P{n}, {cm} cm from the hot end').replace('{n}', String(lensProbe + 1)).replace('{cm}', String(probes[lensProbe].cm))
        : t('stem.heatlab.lens_where_mid', 'the middle');
      var raceLensDesc = t('stem.heatlab.lens_race_desc', 'Zoomed in on {where} of the {mat} bar: {T} °C. It is {phase}; {speed}. Heat spreads along the bar as faster particles jostle slower neighbours; no particle travels from end to end.')
        .replace('{where}', raceLensWhere).replace('{mat}', raceLensMat.name.toLowerCase()).replace('{T}', fmt(raceLensT, 1))
        .replace('{phase}', phaseWords(raceLensPhase)).replace('{speed}', speedWords(raceLensT, particleM(raceLensMat.id)));
      // Mug: the tea at the chosen minute.
      var mugLensDesc = t('stem.heatlab.lens_mug_desc', 'The tea after {min} min: {T} °C. Water is {phase}; {speed}. Speed goes as the square root of the absolute temperature, so cooling from 90 °C to 20 °C slows the molecules by only {pct}%.')
        .replace('{min}', String(mugMin)).replace('{T}', fmt(mugTeaC, 1)).replace('{phase}', phaseWords('liquid'))
        .replace('{speed}', speedWords(mugTeaC, HEAT_MOLAR_MASS.water)).replace('{pct}', fmt((1 - Math.sqrt(293.15 / 363.15)) * 100, 0));
      // Calorimetry: both samples, relaxing exactly as the two-body model says.
      var mixLensP = clamp(numOr(d.mixLensP, 0), 0, 100);
      var mixLensRun = heatTwoBodyEquilibrium({ m1: m1, c1: sub1.c, T1: t1, m2: m2, c2: sub2.c, T2: t2, G: 1, tEnd: 0, steps: 1 });
      var mixLensNow = mixLensRun.at(isFinite(mixLensRun.tauS) ? mixLensP / 100 * 6 * mixLensRun.tauS : 0);
      var mixLiquid1 = !!HEAT_LIQUIDS[sub1.id], mixLiquid2 = !!HEAT_LIQUIDS[sub2.id];
      var mixBothLiquid = mixLiquid1 && mixLiquid2;
      var mixPops = [
        { key: 's1', label: sub1.name, tempC: mixLensNow.T1, M: particleM(sub1.id), phase: mixLiquid1 ? 'liquid' : 'solid', colour: lensColour(sub1.colour, 0), region: mixBothLiquid ? 'all' : 'left', share: 1 },
        { key: 's2', label: sub2.name, tempC: mixLensNow.T2, M: particleM(sub2.id), phase: mixLiquid2 ? 'liquid' : 'solid', colour: lensColour(sub2.colour === sub1.colour ? '#f472b6' : sub2.colour, 1), region: mixBothLiquid ? 'all' : 'right', share: 1 }
      ];
      var mixSameM = mixPops[0].M === mixPops[1].M;
      var mixLensDesc = t('stem.heatlab.lens_mix_desc', 'Mixing {p}% of the way: {s1} at {T1} °C, {s2} at {T2} °C, heading for {Tf} °C.')
        .replace('{p}', String(mixLensP)).replace('{s1}', sub1.name).replace('{T1}', fmt(mixLensNow.T1, 1))
        .replace('{s2}', sub2.name.toLowerCase()).replace('{T2}', fmt(mixLensNow.T2, 1)).replace('{Tf}', fmt(finalT, 1)) + ' ' +
        (mixSameM
          ? t('stem.heatlab.lens_mix_same', 'Same kind of particle, so as the temperatures meet the two speed curves merge into one.')
          : t('stem.heatlab.lens_mix_diff', 'At any one temperature lighter particles move faster (now {v1} m/s against {v2} m/s), so the speed curves never merge. What evens out is the average kinetic energy per particle: {e1} and {e2} × 10⁻²¹ J now, {ef} × 10⁻²¹ J each at the end. That shared average IS the temperature.')
            .replace('{v1}', fmt(heatRmsSpeed(mixLensNow.T1, mixPops[0].M), 0)).replace('{v2}', fmt(heatRmsSpeed(mixLensNow.T2, mixPops[1].M), 0))
            .replace('{e1}', (heatMeanKineticJ(mixLensNow.T1) * 1e21).toFixed(2)).replace('{e2}', (heatMeanKineticJ(mixLensNow.T2) * 1e21).toFixed(2))
            .replace('{ef}', (heatMeanKineticJ(finalT) * 1e21).toFixed(2)));
      // Heating curve: phase from the marker; on a plateau, bonds not speed.
      var curvePhase = wstate.phase === 'Ice' || wstate.phase === 'Ice melting' ? 'solid' : wstate.phase === 'Steam' ? 'gas' : 'liquid';
      var curvePlateau = wstate.phase === 'Ice melting' ? { kind: 'melt', frac: wstate.frac } : wstate.phase === 'Water boiling' ? { kind: 'boil', frac: wstate.frac } : null;
      var curveCount = curvePlateau ? heatPhaseChangeCount(curvePlateau.kind, curvePlateau.frac, 1) : null;
      var curveLensDesc = curvePlateau
        ? t('stem.heatlab.lens_curve_plateau', '{state} at {T} °C, {pct}% of the way through. The average speed stays at {v} m/s, because the temperature is not changing. Instead {freed} of the {total} molecules in 1 kg have broken free ({kj} kJ so far, {mol} kJ per mole of bonds). The energy goes into bonds, not speed.')
          .replace('{state}', curvePlateau.kind === 'melt' ? t('stem.heatlab.lens_melting', 'Ice melting') : t('stem.heatlab.lens_boiling', 'Water boiling'))
          .replace('{T}', fmt(wstate.temp, 0)).replace('{pct}', fmt(curvePlateau.frac * 100, 0))
          .replace('{v}', fmt(heatRmsSpeed(wstate.temp, HEAT_MOLAR_MASS.water), 0))
          .replace('{freed}', sciText(curveCount.freed)).replace('{total}', sciText(curveCount.total))
          .replace('{kj}', fmt(curveCount.kJ, 0)).replace('{mol}', fmt(curveCount.perMoleKJ, 1))
        : t('stem.heatlab.lens_curve_warm', 'Water at {T} °C is {phase}; {speed}. Energy added here speeds the molecules up, so the temperature rises.')
          .replace('{T}', fmt(wstate.temp, 1)).replace('{phase}', phaseWords(curvePhase)).replace('{speed}', speedWords(wstate.temp, HEAT_MOLAR_MASS.water));

      // ── Lab notebook ──
      var nbLog = Array.isArray(d.log) ? d.log : [];
      var nbKinds = heatLogKinds(nbLog.filter(function (r) { return r && typeof r === 'object'; }));
      var nbTotal = nbKinds.reduce(function (s, k) { return s + k.count; }, 0);
      var nbKind = d.nbKind && nbKinds.some(function (k) { return k.kind === d.nbKind; }) ? d.nbKind : 'all';
      var nbIdx = [];
      nbLog.forEach(function (r, i) { if (r && typeof r === 'object' && (nbKind === 'all' || r.kind === nbKind)) nbIdx.push(i); });
      var nbRows = nbIdx.map(function (i) { return nbLog[i]; });
      var nbCols = nbKind === 'all' ? [] : heatLogColumns(nbRows);
      var nbNum = nbKind === 'all' ? [] : heatLogNumericColumns(nbRows);
      var nbSortCol = d.nbSortCol && (d.nbSortCol === 'at' || nbCols.indexOf(d.nbSortCol) !== -1) ? d.nbSortCol : null;
      var nbSortDir = d.nbSortDir === 'desc' ? 'desc' : 'asc';
      var nbSorted = heatLogSorted(nbRows, nbSortCol, nbSortDir).map(function (p) { return { row: p.row, logIndex: nbIdx[p.index], n: p.index + 1 }; });
      var nbX = nbNum.indexOf(d.nbX) !== -1 ? d.nbX : (nbNum[0] || null);
      var nbY = nbNum.indexOf(d.nbY) !== -1 ? d.nbY : (nbNum[1] || nbNum[0] || null);
      var nbPts = nbX && nbY ? nbRows.filter(function (r) { return typeof r[nbX] === 'number' && typeof r[nbY] === 'number' && isFinite(r[nbX]) && isFinite(r[nbY]); })
        .map(function (r) { return [r[nbX], r[nbY]]; }) : [];
      function nbCell(v) {
        if (v == null) return '—';
        if (typeof v === 'boolean') return v ? t('stem.heatlab.nb_yes', 'yes') : t('stem.heatlab.nb_no', 'no');
        if (typeof v === 'number') {
          if (!isFinite(v)) return '—';
          var a = Math.abs(v);
          if (a !== 0 && (a >= 1e7 || a < 1e-3)) return v.toExponential(2);
          return Number(v.toPrecision(4)).toLocaleString(undefined, { maximumFractionDigits: 6 });
        }
        return String(v);
      }
      function nbTime(at) {
        if (typeof at !== 'number' || !isFinite(at)) return '—';
        try { return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return '—'; }
      }
      function nbSummary(r) {
        return heatLogNumericColumns([r]).slice(0, 3).map(function (k) { return k + ' ' + nbCell(r[k]); }).join(' · ');
      }
      function nbRange(vals) {
        var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
        if (!(hi > lo)) { lo -= 1; hi += 1; }
        var pad = (hi - lo) * 0.08;
        return [lo - pad, hi + pad];
      }
      React.useEffect(function () {
        var node = nbPlotRef.current;
        if (!node || nbPts.length < 1) return;
        var xr = nbRange(nbPts.map(function (p) { return p[0]; })), yr = nbRange(nbPts.map(function (p) { return p[1]; }));
        drawChart(node, {
          xMin: xr[0], xMax: xr[1], yMin: yr[0], yMax: yr[1], xUnit: '', yUnit: '',
          xLabel: nbX, yLabel: nbY,
          markers: nbPts.map(function (p) { return { x: p[0], y: p[1], colour: PROBE_COLOURS[0] }; })
        });
      }, [nbKind, nbX, nbY, JSON.stringify(nbPts), isDark, isContrast]);
      function nbCsv() {
        var cols = heatLogColumns(nbRows);
        return heatLogToCsv(nbRows, cols);
      }
      function nbCopy() {
        var csv = nbCsv();
        var api = window.StemLab && typeof window.StemLab.writeClipboard === 'function' ? window.StemLab.writeClipboard : null;
        var done = function (ok) {
          var msg = ok ? __alloOneWord(t('stem.heatlab.nb_copied', 'Copied {n} rows as CSV. Paste them into a spreadsheet.').replace('{n}', String(nbRows.length)))
            : t('stem.heatlab.nb_copy_failed', 'Copy is not available here. Use Download CSV instead.');
          setNbMsg(msg);
          if (typeof announceToSR === 'function') announceToSR(msg);
        };
        try {
          var p = api ? api(csv) : (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(csv) : Promise.reject(new Error('no clipboard')));
          Promise.resolve(p).then(function () { done(true); }, function () { done(false); });
        } catch (e) { done(false); }
      }
      function nbDownload() {
        var url = null, msg;
        try {
          url = URL.createObjectURL(new Blob(['\uFEFF' + nbCsv()], { type: 'text/csv;charset=utf-8' }));
          var link = document.createElement('a');
          link.href = url;
          link.download = 'heat-lab-notebook' + (nbKind === 'all' ? '' : '-' + nbKind) + '.csv';
          document.body.appendChild(link); link.click(); link.remove();
          msg = t('stem.heatlab.nb_downloaded', 'CSV file downloaded.');
        } catch (e) {
          msg = t('stem.heatlab.nb_download_failed', 'The download was blocked here. Use Copy CSV instead.');
        } finally { if (url) setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e2) {} }, 1000); }
        setNbMsg(msg);
        if (typeof announceToSR === 'function') announceToSR(msg);
      }
      function nbSnapshot() {
        if (typeof ctx.saveSnapshot !== 'function') return;
        var rows = nbRows.map(function (r) { return Object.assign({}, r); });
        ctx.saveSnapshot('heatLab', __alloOneWord(t('stem.heatlab.nb_snapshot_label', 'Heat Lab notebook: {n} rows').replace('{n}', String(rows.length))), { kind: nbKind, rows: rows, csv: nbCsv() });
        var msg = t('stem.heatlab.nb_snapshot_saved', 'Saved a snapshot of these rows.');
        setNbMsg(msg);
        if (typeof announceToSR === 'function') announceToSR(msg);
      }
      // Hand notebook rows to Data Plot (Charts & Graphs, Regression mode) or to CODAP through
      // Data Lab. Both hooks live in lazily loaded modules: fall back to their inboxes and open the tool.
      function nbSay(msg) { setNbMsg(msg); if (typeof announceToSR === 'function') announceToSR(msg); }
      function nbOpenTool(id) {
        try { if (typeof window.__alloEnsureStemPluginLoaded === 'function') window.__alloEnsureStemPluginLoaded(id); } catch (e) {}
        if (typeof setStemLabTool === 'function') setStemLabTool(id);
      }
      function nbTitle() {
        return nbKind === 'all' ? t('stem.heatlab.nb_send_title_all', 'Heat Lab notebook')
          : t('stem.heatlab.nb_send_title', 'Heat Lab notebook: {kind}').replace('{kind}', function () { return KIND_LABELS[nbKind] || nbKind; });
      }
      function nbSendPlot() {
        if (!nbPts.length) { nbSay(t('stem.heatlab.nb_send_none', 'No rows have both of these values yet. Pick other columns or record more rows.')); return; }
        var payload = { title: nbTitle(), xLabel: nbX, yLabel: nbY, source: 'Heat Lab', points: nbPts.map(function (p) { return { x: p[0], y: p[1] }; }) };
        var SL = window.StemLab || {};
        if (typeof SL.dataPlotImport === 'function') {
          var res = SL.dataPlotImport(payload, ctx);
          if (!res || !res.ok) { nbSay(t('stem.heatlab.nb_send_failed', 'Those rows could not be sent. Try Copy CSV instead.')); return; }
        } else {
          SL._dataPlotInbox = payload;
          if (typeof ctx.setToolData === 'function') {
            ctx.setToolData(function (prev) {
              var ds = Object.assign({}, prev && prev._dataStudio && typeof prev._dataStudio === 'object' ? prev._dataStudio : {}, { studioMode: 'regression' });
              return Object.assign({}, prev, { _dataStudio: ds });
            });
          }
          nbOpenTool('dataStudio');
        }
        nbSay(__alloOneWord(t('stem.heatlab.nb_send_plot_done', 'Sent {n} rows to Data Plot.').replace('{n}', function () { return String(nbPts.length); })));
      }
      function nbSendCodap() {
        var cols = heatLogColumns(nbRows);
        var attributes = [{ name: 'kind', type: 'categorical' }].concat(cols.map(function (k) { return { name: k }; }));
        var rows = nbRows.map(function (r) {
          return [r.kind || ''].concat(cols.map(function (k) {
            var v = r[k];
            return typeof v === 'number' ? (isFinite(v) ? v : '') : (v == null ? '' : String(v));
          }));
        });
        var dataset = { title: nbTitle(), attributes: attributes, rows: rows, source: 'Heat Lab' };
        var SL = window.StemLab || {};
        if (typeof SL.openInDataLab === 'function') {
          var res = SL.openInDataLab(dataset);
          if (res && res.error === 'desktop-app') {
            // The desktop app opens CODAP in the web browser; Data Lab's inbox offers the rows as a copyable table.
            if (!Array.isArray(window.__alloDataLabInbox)) window.__alloDataLabInbox = [];
            window.__alloDataLabInbox.push(dataset);
            nbOpenTool('dataLab');
            nbSay(t('stem.heatlab.nb_send_codap_desktop', 'In the desktop app, CODAP opens in your web browser. Data Lab is open now: copy your rows as a table there and paste them into CODAP.'));
            return;
          }
          nbSay(res && res.ok ? __alloOneWord(t('stem.heatlab.nb_send_codap_done', 'Sent {n} rows to CODAP in a new window.').replace('{n}', function () { return String(rows.length); }))
            : res && res.error === 'popup-blocked' ? t('stem.heatlab.nb_send_codap_blocked', 'The browser blocked the CODAP window. Allow pop-ups for this site, then try again.')
            : t('stem.heatlab.nb_send_failed', 'Those rows could not be sent. Try Copy CSV instead.'));
          return;
        }
        if (!Array.isArray(window.__alloDataLabInbox)) window.__alloDataLabInbox = [];
        window.__alloDataLabInbox.push(dataset);
        nbOpenTool('dataLab');
        nbSay(t('stem.heatlab.nb_send_codap_inbox', 'Opening Data Lab. Press "Open it in CODAP" there to see your rows.'));
      }
      function nbDelete(logIndex) {
        var next = nbLog.slice();
        next.splice(logIndex, 1);
        upd({ log: next });
        setNbConfirm(null);
        if (typeof announceToSR === 'function') announceToSR(__alloOneWord(t('stem.heatlab.nb_row_deleted', 'Row deleted. {n} rows left.').replace('{n}', String(next.length))));
      }
      function nbClear() {
        var keep = nbKind === 'all' ? [] : nbLog.filter(function (r) { return !(r && r.kind === nbKind); });
        upd({ log: keep });
        setNbConfirm(null);
        if (typeof announceToSR === 'function') announceToSR(__alloOneWord(t('stem.heatlab.nb_cleared', 'Notebook rows cleared. {n} rows left.').replace('{n}', String(keep.length))));
      }
      // Stage B canvases outside the mount-time observer: repaint on resize.
      React.useEffect(function () {
        if (typeof ResizeObserver !== 'function') return;
        var els = [mugIrRef.current, wallIrRef.current, touchIrRef.current, eqTRef.current, eqSRef.current, nbPlotRef.current].filter(Boolean);
        if (!els.length) return;
        var ro = new ResizeObserver(function (entries) {
          entries.forEach(function (entry) { if (entry.target && typeof entry.target._htRedraw === 'function') entry.target._htRedraw(); });
        });
        els.forEach(function (n) { ro.observe(n); });
        return function () { ro.disconnect(); };
      }, [irOn, nbKind, nbPts.length > 0]);

      // ══ Stage C: investigations, cooler challenge, convection readouts,
      //    surfaces, vacuum flask, heating and cooling curves over time ══
      KIND_LABELS.convection = t('stem.heatlab.kind_convection', 'Convection layer');
      KIND_LABELS.flask = t('stem.heatlab.kind_flask', 'Vacuum flask');
      KIND_LABELS['phase-time'] = t('stem.heatlab.kind_phase_time', 'Heating or cooling curve');
      KIND_LABELS.cooler = t('stem.heatlab.kind_cooler', 'Cooler design');
      KIND_LABELS.house = t('stem.heatlab.kind_house', 'House design');
      function secLabel(id) {
        var s = HT_SECTIONS.filter(function (x) { return x.id === id; })[0];
        return s ? s.label : id;
      }
      function bigNum(n) {
        if (!isFinite(n)) return '—';
        var a = Math.abs(n);
        return a >= 1e5 ? (n < 0 ? '−' : '') + sciText(a) : (n < 0 ? '−' : '') + fmt(a, a >= 10 ? 0 : 1);
      }
      function fmtPowerW(w) {
        if (!(w > 0)) return '0 W';
        if (w >= 1) return fmt(w, w >= 10 ? 0 : 2) + ' W';
        if (w >= 1e-3) return fmt(w * 1000, w * 1000 >= 10 ? 0 : 2) + ' mW';
        return fmt(w * 1e6, w * 1e6 >= 10 ? 0 : 2) + ' µW';
      }
      // Another STEM tool, but only once the host can actually load it: open
      // it if registered, or ask the host's loader for it first (the host then
      // shows its loading card until the plugin registers).
      function toolReachable(id) {
        try {
          if (typeof setStemLabTool !== 'function' || !window.StemLab) return false;
          return !!((window.StemLab.isRegistered && window.StemLab.isRegistered(id)) || typeof window.__alloEnsureStemPluginLoaded === 'function');
        } catch (e) { return false; }
      }
      function openTool(id, name) {
        var ok = false;
        try { ok = !!(window.StemLab.isRegistered && window.StemLab.isRegistered(id)); } catch (e) { ok = false; }
        if (!ok) {
          try { ok = typeof window.__alloEnsureStemPluginLoaded === 'function' && window.__alloEnsureStemPluginLoaded(id) !== false; } catch (e2) { ok = false; }
        }
        if (!ok || typeof setStemLabTool !== 'function') {
          if (typeof announceToSR === 'function') announceToSR(t('stem.heatlab.tool_unavailable', '{name} is not available in this build.').replace('{name}', name));
          return;
        }
        pushOnce('bridged', id);
        setStemLabTool(id);
      }

      // ── Convection readouts (the model itself ran above, beside the 3D sync) ──
      var FLUID_NAMES = { water: t('stem.heatlab.fluid_water', 'Water'), oil: t('stem.heatlab.fluid_oil', 'Olive oil'), air: t('stem.heatlab.fluid_air', 'Air') };
      var REGIME_NAMES = {
        conduction: t('stem.heatlab.regime_conduction', 'Conduction only'),
        rolls: t('stem.heatlab.regime_rolls', 'Steady rolls'),
        plumes: t('stem.heatlab.regime_plumes', 'Rising plumes'),
        stable: t('stem.heatlab.regime_stable', 'Stable: conduction only')
      };
      var REGIME_WHY = {
        conduction: t('stem.heatlab.regime_conduction_why', 'Below a Rayleigh number of about 1,708, the fluid’s stickiness and conduction win: it stays still and heat crosses it particle by particle, just as in a solid.'),
        rolls: t('stem.heatlab.regime_rolls_why', 'Above about 1,708, buoyancy wins: warm, less dense fluid rises in steady rolls and cooler, denser fluid sinks between them, carrying heat bodily.'),
        plumes: t('stem.heatlab.regime_plumes_why', 'Past about 50,000, the rolls break up into rising plumes of hot fluid that wander and mix: the regime of a pan on a stove.'),
        stable: t('stem.heatlab.regime_stable_why', 'The warm, light fluid is already on top, so nothing can rise: the layer stays still and the heat creeps DOWN by conduction alone.')
      };
      var cvSpeedText = cv.speedMs > 0
        ? (cv.speedMs >= 0.01 ? fmt(cv.speedMs * 100, 1) + ' cm/s' : fmt(cv.speedMs * 1000, 1) + ' mm/s')
        : t('stem.heatlab.cv_still', 'still');

      // ── Surfaces and the sun ──
      var SURFACE_NAMES = {
        skin: t('stem.heatlab.surf_skin', 'Skin'), black: t('stem.heatlab.surf_black', 'Matte black paint'),
        white: t('stem.heatlab.surf_white', 'White paint'), brick: t('stem.heatlab.surf_brick', 'Red brick'),
        foil: t('stem.heatlab.surf_foil', 'Aluminium foil'), silver: t('stem.heatlab.surf_silver', 'Polished silver')
      };
      var sunRows = HEAT_SURFACES.filter(function (s) { return s.aSun != null; }).map(function (s) { return { s: s, r: heatSurfaceSun(s) }; });
      var sunMaxC = Math.max.apply(null, sunRows.map(function (x) { return x.r.eqC; }));

      // ── Vacuum flask builder ──
      var flOpts = { vacuum: !!d.flVacuum, silver: !!d.flSilver, stopper: !!d.flStopper };
      var flKey = (flOpts.vacuum ? 'v' : '-') + (flOpts.silver ? 's' : '-') + (flOpts.stopper ? 'c' : '-');
      var flRun = React.useMemo(function () { return heatFlaskModel(flOpts); }, [flKey]);
      var flRefs = React.useMemo(function () {
        return { plain: heatFlaskModel({}), full: heatFlaskModel({ vacuum: true, silver: true, stopper: true }) };
      }, []);
      var FL_COLOURS = isContrast ? ['#ffff00', '#00ffff', '#ff66ff'] : isDark ? ['#f472b6', '#94a3b8', '#4ade80'] : ['#be185d', '#475569', '#15803d'];
      React.useEffect(function () {
        drawChart(flaskRef.current, {
          xMin: 0, xMax: 12, yMin: 15, yMax: 95, xUnit: '', yUnit: '°',
          xLabel: t('stem.heatlab.fl_chart_x', 'hours'), yLabel: t('stem.heatlab.fl_chart_y', 'coffee (°C)'),
          series: [
            { points: flRefs.plain.points, colour: FL_COLOURS[1], width: 1.6, dashPattern: [6, 3] },
            { points: flRefs.full.points, colour: FL_COLOURS[2], width: 1.6, dashPattern: [2, 3] },
            { points: flRun.points, colour: FL_COLOURS[0], width: 2.6 }
          ],
          refLines: [{ axis: 'y', at: 60, colour: isContrast ? '#ffffff' : (isDark ? '#fbbf24' : '#92400e'), label: t('stem.heatlab.fl_chart_60', '60 °C: still hot'), align: 'left' }],
          legend: [
            { label: t('stem.heatlab.fl_legend_yours', 'Your build'), colour: FL_COLOURS[0] },
            { label: t('stem.heatlab.fl_legend_plain', 'Plain double wall, open'), colour: FL_COLOURS[1], dashPattern: [6, 3] },
            { label: t('stem.heatlab.fl_legend_full', 'Real flask: all three'), colour: FL_COLOURS[2], dashPattern: [2, 3] }
          ]
        });
      }, [flKey, isDark, isContrast]);

      // ── Heating and cooling over time, four substances ──
      var PHASE_SUB_NAMES = {
        water: t('stem.heatlab.sub_water', 'Water'), ethanol: t('stem.heatlab.sub_ethanol', 'Ethanol'),
        wax: t('stem.heatlab.sub_wax', 'Paraffin wax'), lead: t('stem.heatlab.sub_lead', 'Lead')
      };
      var HC_PHASE_WORDS = {
        solid: t('stem.heatlab.hc_solid', 'solid'), melting: t('stem.heatlab.hc_melting', 'melting'),
        liquid: t('stem.heatlab.hc_liquid', 'liquid'), boiling: t('stem.heatlab.hc_boiling', 'boiling'),
        gas: t('stem.heatlab.hc_gas', 'gas'), freezing: t('stem.heatlab.hc_freezing', 'freezing')
      };
      var hcSub = heatPhaseSub(['water', 'ethanol', 'wax', 'lead'].indexOf(d.hcSub) !== -1 ? d.hcSub : 'water');
      var hcName = PHASE_SUB_NAMES[hcSub.id];
      var hcMode = d.hcMode === 'cool' ? 'cool' : 'heat';
      var hcPower = clamp(numOr(d.hcPower, 1000), 200, 3000);
      var hcSuper = hcSub.supercool ? clamp(numOr(d.hcSuper, 0), 0, 10) : 0;
      var hcCursor = clamp(numOr(d.hcCursor, 50), 0, 100);
      var hcHeat = heatPhaseHeating(hcSub, hcPower, 1);
      var hcCool = heatPhaseCooling(hcSub, { supercoolK: hcSuper });
      var hcRun = hcMode === 'heat' ? hcHeat : hcCool;
      var hcEndS = hcRun.endS;
      var hcTimeS = hcCursor / 100 * hcEndS;
      var hcNow = hcRun.at(hcTimeS);
      var hcUnit = hcEndS <= 600 ? { div: 1, u: 's' } : hcEndS <= 3 * 3600 ? { div: 60, u: 'min' } : { div: 3600, u: 'h' };
      var hcPts = [];
      if (hcMode === 'heat') {
        hcHeat.stages.forEach(function (st, i) {
          if (i === 0) hcPts.push([st.startS / hcUnit.div, st.fromC]);
          hcPts.push([st.endS / hcUnit.div, st.toC]);
        });
      } else {
        // even samples plus the exact corners of the plateau; with
        // supercooling the curve jumps straight up from the dip to mp
        var hcTimes = [];
        for (var hci = 0; hci <= 200; hci++) hcTimes.push(hcEndS * hci / 200);
        hcTimes.push(hcCool.freezeStartS, hcCool.freezeEndS);
        hcTimes.sort(function (a, b) { return a - b; });
        hcTimes.forEach(function (ts) {
          if (ts > hcEndS) return;
          hcPts.push([ts / hcUnit.div, hcCool.at(ts).temp]);
          if (ts === hcCool.freezeStartS && hcCool.supercoolK > 0) hcPts.push([ts / hcUnit.div, hcSub.mpC]);
        });
      }
      var hcPlateau = null, hcBase = 'solid';
      var hcMass = hcMode === 'heat' ? 1 : hcCool.massKg;
      if (hcMode === 'heat') {
        if (hcNow.phase === 'melting') hcPlateau = { kind: 'melt', frac: hcNow.frac };
        else if (hcNow.phase === 'boiling') { hcPlateau = { kind: 'boil', frac: hcNow.frac }; hcBase = 'liquid'; }
        else hcBase = hcNow.phase === 'gas' ? 'gas' : hcNow.phase === 'liquid' ? 'liquid' : 'solid';
      } else if (hcNow.phase === 'freezing') {
        // freezing shown as melting run backwards: the not-yet-frozen share
        // moves freely; dir 'freeze' makes the lens count bonds FORMED.
        hcPlateau = { kind: 'melt', frac: 1 - hcNow.frozen, dir: 'freeze' };
      } else {
        hcBase = hcNow.phase === 'liquid' ? 'liquid' : 'solid';
      }
      var hcCount = hcPlateau ? heatPhaseChangeCount(hcPlateau.kind, hcMode === 'heat' ? hcPlateau.frac : hcNow.frozen, hcMass, hcSub) : null;
      var hcBoiling = hcMode === 'heat' && hcNow.phase === 'boiling';
      var hcSupercooled = hcMode === 'cool' && hcNow.phase === 'liquid' && hcNow.temp < hcSub.mpC - 1e-9;
      var hcMassText = hcMass >= 1 ? fmt(hcMass, 0) + ' kg' : fmt(hcMass * 1000, 0) + ' g';
      var hcDesc = hcPlateau
        ? (hcMode === 'heat'
          ? t('stem.heatlab.hc_desc_plateau', '{sub} {state} at {T} °C, {pct}% of the way through. The temperature holds while {freed} of the {total} particles in {mass} break free ({kj} kJ so far, {mol} kJ per mole). The energy goes into bonds, not speed.')
            .replace('{state}', HC_PHASE_WORDS[hcNow.phase]).replace('{pct}', fmt(hcPlateau.frac * 100, 0))
            .replace('{kj}', fmt(hcCount.kJ, hcCount.kJ >= 10 ? 0 : 1))
          : t('stem.heatlab.hc_desc_freezing', '{sub} freezing at {T} °C, {pct}% frozen: {freed} of the {total} particles in {mass} have locked into the crystal, each giving up its share of {mol} kJ per mole. That released heat is what holds the temperature flat while the bath keeps drawing heat out.')
            .replace('{pct}', fmt(hcNow.frozen * 100, 0)))
          .replace('{sub}', hcName).replace('{T}', fmt(hcNow.temp, 1)).replace('{freed}', sciText(hcCount.freed))
          .replace('{total}', sciText(hcCount.total)).replace('{mass}', hcMassText).replace('{mol}', fmt(hcCount.perMoleKJ, 1))
        : t('stem.heatlab.hc_desc_warm', '{sub} at {T} °C is {phase}; {speed}.')
          .replace('{sub}', hcName).replace('{T}', fmt(hcNow.temp, 1)).replace('{phase}', phaseWords(hcBase)).replace('{speed}', speedWords(hcNow.temp, hcSub.M)) +
          (hcSupercooled ? ' ' + t('stem.heatlab.hc_desc_supercooled', 'It is supercooled: still liquid below its freezing point, because no ice crystal has started yet.') : '');
      React.useEffect(function () {
        var div = hcUnit.div;
        var bandBlue = isContrast ? 'rgba(255,255,255,0.14)' : 'rgba(96,165,250,0.16)';
        var bandOrange = isContrast ? 'rgba(255,255,255,0.14)' : 'rgba(251,146,60,0.16)';
        var inkBlue = isContrast ? '#ffffff' : isDark ? '#93c5fd' : '#1d4ed8';
        var inkOrange = isContrast ? '#ffffff' : isDark ? '#fdba74' : '#9a3412';
        var bands = [];
        if (hcMode === 'heat') {
          hcHeat.stages.forEach(function (st) {
            if (st.id === 'melt') bands.push({ from: st.startS / div, to: st.endS / div, colour: bandBlue, label_colour: inkBlue, label: HC_PHASE_WORDS.melting });
            if (st.id === 'boil') bands.push({ from: st.startS / div, to: st.endS / div, colour: bandOrange, label_colour: inkOrange, label: HC_PHASE_WORDS.boiling });
          });
        } else {
          bands.push({ from: hcCool.freezeStartS / div, to: hcCool.freezeEndS / div, colour: bandBlue, label_colour: inkBlue, label: HC_PHASE_WORDS.freezing });
        }
        var temps = hcPts.map(function (p) { return p[1]; });
        var lo = Math.min.apply(null, temps), hi = Math.max.apply(null, temps);
        var pad = Math.max(4, (hi - lo) * 0.08);
        var refs = [{ axis: 'y', at: hcSub.mpC, colour: inkBlue, label: t('stem.heatlab.hc_ref_mp', 'melts / freezes {T} °C').replace('{T}', fmt(hcSub.mpC, 1)), align: 'left' }];
        if (hcMode === 'heat' && hcSub.bpC != null) refs.push({ axis: 'y', at: hcSub.bpC, colour: inkOrange, label: t('stem.heatlab.hc_ref_bp', 'boils {T} °C').replace('{T}', fmt(hcSub.bpC, 1)), align: 'left' });
        drawChart(hcTimeRef.current, {
          xMin: 0, xMax: hcEndS / div, yMin: Math.floor(lo - pad), yMax: Math.ceil(hi + pad), xUnit: '', yUnit: '°',
          xLabel: t('stem.heatlab.hc_chart_x', 'time ({u})').replace('{u}', hcUnit.u), yLabel: t('stem.heatlab.hc_chart_y', 'temperature (°C)'),
          bands: bands, refLines: refs,
          series: [{ points: hcPts, colour: isContrast ? '#ffff00' : '#a78bfa', width: 2.4 }],
          marker: { x: hcTimeS / div, y: hcNow.temp, colour: isContrast ? '#00ffff' : '#f472b6' }
        });
      }, [hcSub.id, hcMode, hcPower, hcSuper, hcCursor, isDark, isContrast]);

      // ── "Keep it frozen" cooler challenge ──
      var CL_SHELL_NAMES = {
        plastic: t('stem.heatlab.cl_shell_plastic', 'Plastic box, 2 mm'), plywood: t('stem.heatlab.cl_shell_plywood', 'Plywood box, 6 mm'),
        steel: t('stem.heatlab.cl_shell_steel', 'Steel box, 1 mm')
      };
      var CL_LINER_NAMES = {
        none: t('stem.heatlab.cl_liner_none', 'No liner'), eps: t('stem.heatlab.cl_liner_eps', 'Polystyrene foam'),
        wool: t('stem.heatlab.cl_liner_wool', 'Wool felt'), cork: t('stem.heatlab.cl_liner_cork', 'Cork'),
        pu: t('stem.heatlab.cl_liner_pu', 'Polyurethane foam'), aerogel: t('stem.heatlab.cl_liner_aerogel', 'Aerogel blanket')
      };
      var CL_SEAL_NAMES = { none: t('stem.heatlab.cl_seal_none', 'Loose lid'), foam: t('stem.heatlab.cl_seal_foam', 'Foam strip'), gasket: t('stem.heatlab.cl_seal_gasket', 'Rubber gasket') };
      var clDesign = heatCoolerDesign({ shell: d.clShell, liner: d.clLiner, mm: d.clMm, seal: d.clSeal, foil: d.clFoil });
      var clLive = heatCoolerModel(clDesign);
      var clTestRec = d.clTest && typeof d.clTest === 'object' && d.clTest.design ? d.clTest : null;
      var clTested = clTestRec ? heatCoolerModel(clTestRec.design) : null;
      var clStale = !!(clTested && JSON.stringify(clTested.design) !== JSON.stringify(clDesign));
      var clSaved = (Array.isArray(d.clSaved) ? d.clSaved : []).filter(function (x) { return x && x.design; }).slice(0, 3);
      var clUpgrades = clTested ? heatCoolerUpgrades(clTested.design).slice(0, 3) : [];
      var CL_COLOURS = PROBE_COLOURS;
      var clNowColour = isContrast ? '#ffffff' : isDark ? '#f472b6' : '#be185d';
      function clMoney(v) { return '$' + (Math.round(v * 100) / 100).toFixed(2); }
      function clDescribe(dz) {
        var z = heatCoolerDesign(dz);
        return CL_SHELL_NAMES[z.shell] + ' + ' + (z.liner === 'none' ? CL_LINER_NAMES.none.toLowerCase() : z.mm + ' mm ' + CL_LINER_NAMES[z.liner].toLowerCase()) +
          ', ' + CL_SEAL_NAMES[z.seal].toLowerCase() + (z.foil ? ', ' + t('stem.heatlab.cl_with_foil', 'foil wrap') : '');
      }
      // Any choice the learner makes marks the design as theirs.
      function clSet(patch) { upd(Object.assign({ clTouched: true }, patch)); }
      function clRunTest() {
        var m = heatCoolerModel(clDesign);
        var earned = m.meets && !!d.clTouched && !d.clBadge;
        var patch = { clTest: { design: m.design, meltH: m.meltH, cost: m.cost, outerCm: m.outerCm, meets: m.meets, at: Date.now() }, clTests: (d.clTests || 0) + 1 };
        if (earned) patch.clBadge = true;
        upd(patch);
        recordTrial({
          kind: 'cooler', section: 'cooler', shell: m.design.shell, liner: m.design.liner, liner_mm: m.design.mm, seal: m.design.seal, foil: m.design.foil,
          cost_usd: m.cost, outer_cm: m.outerCm, G_WK: m.G, melt_h: m.meltH, meetsBrief: m.meets
        });
        if (earned) {
          if (typeof celebrate === 'function') celebrate();
          if (typeof awardXP === 'function') awardXP('heatlab_cooler', 20, t('stem.heatlab.xp_cooler', 'Designed a cooler that meets the keep-it-frozen brief'));
        }
        if (typeof announceToSR === 'function') {
          announceToSR(__alloOneWord(t('stem.heatlab.sr_cl_tested', 'Tested. The ice lasts {h} hours; cost {cost}; outside {cm} cm. {verdict}')
            .replace('{h}', fmt(m.meltH, 1)).replace('{cost}', function () { return clMoney(m.cost); }).replace('{cm}', fmt(m.outerCm, 1))
            .replace('{verdict}', m.meets ? t('stem.heatlab.cl_meets', 'It meets the brief.') : t('stem.heatlab.cl_fails', 'It does not meet the brief yet.'))));
        }
      }
      function clSave() {
        if (!clTested || clStale || clSaved.length >= 3) return;
        var next = clSaved.concat([{ design: clTested.design, meltH: clTested.meltH, cost: clTested.cost, outerCm: clTested.outerCm, meets: clTested.meets }]);
        upd({ clSaved: next });
        if (typeof announceToSR === 'function') announceToSR(t('stem.heatlab.sr_cl_saved', 'Design saved for comparison. {n} of 3 slots used.').replace('{n}', String(next.length)));
      }
      function clRemove(i) {
        var next = clSaved.slice();
        next.splice(i, 1);
        upd({ clSaved: next });
      }
      React.useEffect(function () {
        if (!clTested) return;
        var endH = clamp(Math.max(6, clTested.meltH * 1.3), 6, 24);
        var pts = [];
        for (var i = 0; i <= 160; i++) { var s = endH * 3600 * i / 160; pts.push([s / 3600, clTested.at(s).temp]); }
        drawChart(coolerRef.current, {
          xMin: 0, xMax: endH, yMin: -20, yMax: 32, xUnit: '', yUnit: '°',
          xLabel: t('stem.heatlab.cl_chart_x', 'hours in the 30 °C car'), yLabel: t('stem.heatlab.cl_chart_y', 'ice pack (°C)'),
          bands: [{ from: clTested.warmS / 3600, to: clTested.meltS / 3600, colour: isContrast ? 'rgba(255,255,255,0.14)' : 'rgba(96,165,250,0.16)', label_colour: isContrast ? '#ffffff' : isDark ? '#93c5fd' : '#1d4ed8', label: t('stem.heatlab.cl_band_melting', 'melting') }],
          refLines: [{ axis: 'x', at: HEAT_COOLER.targetH, colour: isContrast ? '#ffffff' : (isDark ? '#4ade80' : '#15803d'), label: t('stem.heatlab.cl_ref_target', '4 h target') }],
          series: [{ points: pts, colour: clNowColour, width: 2.4 }],
          marker: { x: clTested.meltH, y: 0, colour: clNowColour }
        });
      }, [clTested ? JSON.stringify(clTested.design) : '', isDark, isContrast]);
      React.useEffect(function () {
        var all = clSaved.map(function (x, i) { return { x: x.cost, y: x.meltH, colour: CL_COLOURS[i % 3] }; });
        if (clTested && !clStale) all.push({ x: clTested.cost, y: clTested.meltH, colour: clNowColour });
        if (!all.length) return;
        var xMax = Math.max(HEAT_COOLER.budget * 1.3, Math.max.apply(null, all.map(function (p) { return p.x; })) + 2);
        var yMax = Math.max(6, Math.max.apply(null, all.map(function (p) { return p.y; })) * 1.15);
        drawChart(tradeRef.current, {
          xMin: 0, xMax: xMax, yMin: 0, yMax: yMax, xUnit: '', yUnit: '',
          xLabel: t('stem.heatlab.cl_trade_x', 'cost ($)'), yLabel: t('stem.heatlab.cl_trade_y', 'ice lasts (h)'),
          markers: all,
          refLines: [
            { axis: 'y', at: HEAT_COOLER.targetH, colour: isContrast ? '#ffffff' : (isDark ? '#4ade80' : '#15803d'), label: t('stem.heatlab.cl_ref_target', '4 h target'), align: 'left' },
            { axis: 'x', at: HEAT_COOLER.budget, colour: isContrast ? '#ffffff' : (isDark ? '#fbbf24' : '#92400e'), label: t('stem.heatlab.cl_ref_budget', 'budget') }
          ],
          legend: clSaved.map(function (x, i) { return { label: t('stem.heatlab.cl_design_n', 'Design {n}').replace('{n}', String.fromCharCode(65 + i)), colour: CL_COLOURS[i % 3] }; })
            .concat(clTested && !clStale ? [{ label: t('stem.heatlab.cl_design_now', 'Latest test'), colour: clNowColour }] : [])
        });
      }, [JSON.stringify(clSaved), clTested ? JSON.stringify(clTested.design) : '', clStale, isDark, isContrast]);

      // ── Guided claim-evidence-reasoning investigations ──
      var INVESTIGATIONS = heatInvestigations(t);
      var CER_RUBRIC_TEXT = {
        claim: t('stem.heatlab.cer_r_claim', 'My claim answers the question in one clear sentence.'),
        rows: t('stem.heatlab.cer_r_rows', 'I cite at least two notebook rows and quote their numbers.'),
        fair: t('stem.heatlab.cer_r_fair', 'The rows I compare differ in one variable only (a fair test).'),
        idea: t('stem.heatlab.cer_r_idea', 'My reasoning names the science idea that links the evidence to the claim.'),
        limit: t('stem.heatlab.cer_r_limit', 'I name one limit of the model, or one thing I would test next.')
      };
      var cerAll = d.cer && typeof d.cer === 'object' ? d.cer : {};
      var cerId = INVESTIGATIONS.some(function (x) { return x.id === d.cerOpen; }) ? d.cerOpen : INVESTIGATIONS[0].id;
      var cerInv = INVESTIGATIONS.filter(function (x) { return x.id === cerId; })[0];
      var cerSt = cerAll[cerId] && typeof cerAll[cerId] === 'object' ? cerAll[cerId] : {};
      var cerPicks = (Array.isArray(cerSt.picks) ? cerSt.picks : []).filter(function (p) { return p && typeof p.at === 'number' && typeof p.kind === 'string'; }).slice(0, 6);
      var cerChecks = cerSt.checks && typeof cerSt.checks === 'object' ? cerSt.checks : {};
      var cerClaim = typeof cerSt.claim === 'string' ? cerSt.claim : '';
      var cerEvidence = typeof cerSt.evidence === 'string' ? cerSt.evidence : '';
      var cerReasoning = typeof cerSt.reasoning === 'string' ? cerSt.reasoning : '';
      function cerPatch(patch) {
        var all = Object.assign({}, cerAll);
        all[cerId] = Object.assign({}, cerSt, patch);
        upd({ cer: all });
      }
      var cerRows = [];
      nbLog.forEach(function (r, i) { if (r && typeof r === 'object' && cerInv.kinds.indexOf(r.kind) !== -1) cerRows.push({ row: r, index: i }); });
      function cerRowText(r) {
        return (cerInv.cols[r.kind] || []).map(function (c) { return c + ' ' + nbCell(r[c]); }).join(' · ');
      }
      function cerIsPicked(r) { return cerPicks.some(function (p) { return p.at === r.at && p.kind === r.kind; }); }
      function cerToggle(r) {
        var on = cerIsPicked(r);
        if (!on && cerPicks.length >= 6) {
          if (typeof announceToSR === 'function') announceToSR(t('stem.heatlab.cer_pick_max', 'Six rows is the most you can pick. Unpick one first.'));
          return;
        }
        var next = on ? cerPicks.filter(function (p) { return !(p.at === r.at && p.kind === r.kind); })
          : cerPicks.concat([{ at: r.at, kind: r.kind, text: kindLabel(r.kind) + ': ' + cerRowText(r) }]);
        cerPatch({ picks: next });
      }
      var cerPickedRows = cerPicks.map(function (p) {
        return nbLog.filter(function (r) { return r && r.at === p.at && r.kind === p.kind; })[0] || null;
      });
      var cerKindsOk = !cerInv.needAll || cerInv.kinds.every(function (k) { return cerPicks.some(function (p) { return p.kind === k; }); });
      // A fair comparison: two picked rows of one experiment that differ in
      // exactly one of the investigation's variables.
      var cerFair = (function () {
        var rows = cerPickedRows.filter(Boolean);
        for (var i = 0; i < rows.length; i++) {
          for (var j = i + 1; j < rows.length; j++) {
            if (rows[i].kind !== rows[j].kind) continue;
            var diff = 0;
            cerInv.ivCols.forEach(function (c) {
              if (rows[i][c] == null && rows[j][c] == null) return;
              if (rows[i][c] !== rows[j][c]) diff++;
            });
            // ...and agree on every controlled input: two mixes that also start
            // at different temperatures are not a fair test of mass.
            var uncontrolled = (cerInv.cvCols || []).some(function (c) {
              return rows[i][c] != null && rows[j][c] != null && rows[i][c] !== rows[j][c];
            });
            if (diff === 1 && !uncontrolled) return true;
          }
        }
        return false;
      })();
      var cerAuto = [
        { id: 'rows', ok: cerPicks.length >= 2 && cerKindsOk, text: cerInv.needAll
          ? t('stem.heatlab.cer_auto_rows_all', 'Rows picked from both experiments, two or more in all')
          : t('stem.heatlab.cer_auto_rows', 'At least two notebook rows picked') },
        { id: 'fair', ok: cerFair, text: t('stem.heatlab.cer_auto_fair', 'Two picked rows differ in just one variable') },
        { id: 'number', ok: /\d/.test(cerEvidence), text: t('stem.heatlab.cer_auto_number', 'Your evidence quotes a number') },
        { id: 'idea', ok: cerInv.ideas.test(cerReasoning), text: t('stem.heatlab.cer_auto_idea', 'Your reasoning uses a science idea') }
      ];
      var cerTextsOk = cerClaim.trim().length >= 15 && cerEvidence.trim().length >= 15 && cerReasoning.trim().length >= 30;
      var cerTicksOk = HEAT_CER_RUBRIC.every(function (k) { return !!cerChecks[k]; });
      var cerReady = cerTextsOk && cerPicks.length >= 2 && cerKindsOk && cerTicksOk;
      var cerDone = INVESTIGATIONS.filter(function (x) { return cerAll[x.id] && cerAll[x.id].completed === true; }).length;
      function cerComplete() {
        if (!cerReady) return;
        var first = !cerSt.xp;
        cerPatch({ completed: true, xp: true, completedAt: Date.now() });
        if (first) {
          if (typeof celebrate === 'function') celebrate();
          if (typeof awardXP === 'function') awardXP('heatlab_cer_' + cerId, 15, t('stem.heatlab.xp_cer', 'Completed a claim-evidence-reasoning investigation'));
        }
        if (typeof announceToSR === 'function') announceToSR(t('stem.heatlab.sr_cer_done', 'Investigation complete. Your claim, evidence and reasoning are saved.'));
      }
      // AI feedback stays optional: only through the host's guarded getHint,
      // and only when the teacher has hints switched on.
      var cerCanAsk = typeof ctx.getHint === 'function' && !!ctx.aiHintsEnabled;
      function cerAsk() {
        if (!cerCanAsk) return;
        ctx.getHint('heatLab-cer-' + cerId, cerInv.q, (cerClaim + ' ' + cerEvidence + ' ' + cerReasoning).slice(0, 900), cerInv.idea,
          cerSt.revisions || 0, function (text) { setCerHint(String(text || '')); });
      }
      // "Bubbles are vapour, not air", with a way on to the Water Cycle tool
      // when the substance is water and the host can load that tool.
      function bubblesCallout(subName, isWater, where) {
        return h('div', { className: 'mt-2 rounded-lg border p-2', 'data-ht-bubbles': where, style: panelStyle('#38bdf8') },
          h('p', { className: 'text-[0.6875rem] font-black', style: { color: isContrast ? '#fbbf24' : ink('#38bdf8') } },
            '🫧 ' + t('stem.heatlab.bubbles_title', 'Bubbles are vapour, not air')),
          h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: bodyInk } },
            t('stem.heatlab.bubbles_body', 'The big bubbles rising through boiling {sub} are {sub} itself, turned to gas. Dissolved air comes out earlier, as tiny bubbles while the liquid warms. At the boiling point, molecules gain enough energy to break free in pockets of vapour, and the plateau is the energy those escapes cost. Cool the vapour and it condenses straight back into liquid.')
              .replace(/\{sub\}/g, subName.toLowerCase())),
          isWater && toolReachable('waterCycle') ? h('button', {
            type: 'button', onClick: function () { openTool('waterCycle', t('stem.heatlab.watercycle_name', 'Water Cycle')); },
            className: 'mt-1.5 min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(false)
          }, '💧 ' + t('stem.heatlab.bubbles_link', 'See evaporation and condensation in the Water Cycle tool')) : null);
      }

      // Stage C charts repaint on resize too.
      React.useEffect(function () {
        if (typeof ResizeObserver !== 'function') return;
        var els = [flaskRef.current, hcTimeRef.current, coolerRef.current, tradeRef.current].filter(Boolean);
        if (!els.length) return;
        var ro = new ResizeObserver(function (entries) {
          entries.forEach(function (entry) { if (entry.target && typeof entry.target._htRedraw === 'function') entry.target._htRedraw(); });
        });
        els.forEach(function (n) { ro.observe(n); });
        return function () { ro.disconnect(); };
      }, [!!clTested, clSaved.length > 0 || !!clTested]);

      // ══ Stage D (P5-1): grade bands, scaffold levels, vocabulary ══
      // ctx.gradeBand is 'k2'|'g35'|'g68'|'g912' (the host falls back to
      // 'g68'). Grades 6-8 and below start at Simple, 9-12 at Extended; with
      // no band the tool keeps its Standard (full-maths) copy. The learner's
      // own choice (toolData.level) always wins.
      var HT_LEVELS = ['simple', 'standard', 'extended'];
      var htBand = typeof ctx.gradeBand === 'string' ? ctx.gradeBand : '';
      var htBandLevel = (htBand === 'k2' || htBand === 'g35' || htBand === 'g68') ? 'simple' : htBand === 'g912' ? 'extended' : 'standard';
      var htLevel = HT_LEVELS.indexOf(d.level) !== -1 ? d.level : htBandLevel;
      var htSimple = htLevel === 'simple', htExtended = htLevel === 'extended';
      var HT_LEVEL_NAMES = {
        simple: t('stem.heatlab.level_simple', 'Simple'),
        standard: t('stem.heatlab.level_standard', 'Standard'),
        extended: t('stem.heatlab.level_extended', 'Extended')
      };
      var HT_LEVEL_HELP = {
        simple: t('stem.heatlab.level_simple_help', 'Plain words first. Equations wait behind “Show the maths”, and engines, entropy and heat pumps wait under “Go further”.'),
        standard: t('stem.heatlab.level_standard_help', 'Every section with its equations and units.'),
        extended: t('stem.heatlab.level_extended_help', 'Equations and units, plus where each key equation comes from.')
      };
      var HT_GO_FURTHER = { engines: true, entropy: true, heatpumps: true };
      // One plain-language summary per section, shown at the Simple level.
      var HT_PLAIN = {
        conduction: t('stem.heatlab.plain_conduction', 'Heat always moves from hot to cold. It can move by touch (conduction), by a moving liquid or gas carrying it (convection), or as invisible light (radiation). Metals pass heat along fast; wood and foam pass it slowly.'),
        insulation: t('stem.heatlab.plain_insulation', 'A wrap does not make heat. It slows heat leaving the tea. Thicker wraps and materials full of trapped air slow it the most.'),
        wall: t('stem.heatlab.plain_wall', 'Each layer of a wall slows heat a little. Stack layers and their slowing adds up. One good insulating layer does most of the work.'),
        range: t('stem.heatlab.plain_range', 'Some materials pass heat thousands of times better than others. Copper is a racetrack for heat; air and foam are a traffic jam.'),
        touch: t('stem.heatlab.plain_touch', 'Metal and wood in the same room are the same temperature. Metal feels colder because it pulls heat out of your finger faster.'),
        mixing: t('stem.heatlab.plain_mixing', 'Mix something hot with something cold and they meet in the middle, but not always exactly halfway. The one that stores more heat moves less.'),
        equilibrium: t('stem.heatlab.plain_equilibrium', 'Two blocks that touch swap heat until they reach the same temperature. Then the flow stops, and it never runs backwards on its own.'),
        heatingcurve: t('stem.heatlab.plain_heatingcurve', 'Heat ice and it warms, then stays at 0 °C while it melts, then warms again, then stays at 100 °C while it boils. During melting and boiling the energy pulls particles apart instead of making them faster.'),
        engines: t('stem.heatlab.plain_engines', 'An engine turns heat into motion, but some heat must always go to waste. The bigger the gap between hot and cold, the less is wasted.'),
        convection3d: t('stem.heatlab.plain_convection3d', 'Warm liquid is lighter, so it rises; cool liquid sinks. Heat a tank from below and it turns over in rolling loops.'),
        radiation: t('stem.heatlab.plain_radiation', 'Everything warm glows with invisible infrared light. Hotter things glow much, much more. Dull dark surfaces give off and soak up more than shiny ones.'),
        expansion: t('stem.heatlab.plain_expansion', 'Most things get a little bigger when they warm up. Bridges and rails have gaps so they have room to grow on hot days.'),
        spot: t('stem.heatlab.plain_spot', 'Practise naming how heat moves in everyday things.'),
        entropy: t('stem.heatlab.plain_entropy', 'Energy spreads out by itself, like a drop of ink in water. It never gathers back up on its own. That is why heat flows from hot to cold.'),
        heatpumps: t('stem.heatlab.plain_heatpumps', 'A heat pump uses a little electricity to move a lot of heat from cold air outside into a warm house, like a fridge working backwards.'),
        notebook: t('stem.heatlab.plain_notebook', 'Every trial you record lands here, so you can compare your results.'),
        investigate: t('stem.heatlab.plain_investigate', 'Ask a question, test it fairly, then make a claim and back it up with your results.'),
        cooler: t('stem.heatlab.plain_cooler', 'Build a box that keeps ice frozen. Good insulation slows heat getting IN, just as it slows heat getting out.'),
        house: t('stem.heatlab.plain_house', 'Design a house that needs very little heating. Every wall, window and gap lets heat out; sunshine through windows brings some back in.')
      };
      // Vocabulary pop-overs: a real button per term, its definition in a
      // region the button controls; Escape closes it.
      var HT_VOCAB = {
        conduction: [t('stem.heatlab.v_conduction', 'conduction'), t('stem.heatlab.v_conduction_def', 'Heat passed from particle to particle by contact, without the material itself moving. Fastest in metals.')],
        convection: [t('stem.heatlab.v_convection', 'convection'), t('stem.heatlab.v_convection_def', 'Heat carried by a moving liquid or gas: warm fluid rises and cooler fluid sinks to take its place.')],
        radiation: [t('stem.heatlab.v_radiation', 'radiation'), t('stem.heatlab.v_radiation_def', 'Heat carried by light, mostly infrared. It needs no matter, so it is the only way heat crosses a vacuum.')],
        temperature: [t('stem.heatlab.v_temperature', 'temperature'), t('stem.heatlab.v_temperature_def', 'How fast the particles move on average. It is not the same as heat, which is energy on the move.')],
        heat: [t('stem.heatlab.v_heat', 'heat'), t('stem.heatlab.v_heat_def', 'Energy that flows from something hotter to something colder. Measured in joules (J).')],
        equilibrium: [t('stem.heatlab.v_equilibrium', 'thermal equilibrium'), t('stem.heatlab.v_equilibrium_def', 'The state where touching objects have the same temperature, so no more heat flows between them overall.')],
        specificheat: [t('stem.heatlab.v_specificheat', 'specific heat'), t('stem.heatlab.v_specificheat_def', 'The energy needed to warm 1 kg of a material by 1 °C (J/kg·K). Water’s is very high: 4,186 J.')],
        latent: [t('stem.heatlab.v_latent', 'latent heat'), t('stem.heatlab.v_latent_def', 'Energy taken in or given out while a material melts, boils or freezes, with no change in temperature.')],
        conductivity: [t('stem.heatlab.v_conductivity', 'conductivity'), t('stem.heatlab.v_conductivity_def', 'How well a material lets heat flow through it (k, in W/m·K). High for copper, tiny for air.')],
        diffusivity: [t('stem.heatlab.v_diffusivity', 'diffusivity'), t('stem.heatlab.v_diffusivity_def', 'How fast a temperature change spreads through a material: conductivity divided by (density × specific heat).')],
        insulator: [t('stem.heatlab.v_insulator', 'insulator'), t('stem.heatlab.v_insulator_def', 'A material that slows heat flow, usually by trapping still air. It does not make heat or cold.')],
        rvalue: [t('stem.heatlab.v_rvalue', 'R-value'), t('stem.heatlab.v_rvalue_def', 'Thermal resistance: how strongly a layer slows heat. Layers in a stack add their R-values.')],
        uvalue: [t('stem.heatlab.v_uvalue', 'U-value'), t('stem.heatlab.v_uvalue_def', 'Watts lost through each square metre for each degree of difference (W/m²K). It is 1 ÷ total R; lower is better.')],
        emissivity: [t('stem.heatlab.v_emissivity', 'emissivity'), t('stem.heatlab.v_emissivity_def', 'How well a surface gives off (and soaks up) infrared, from 0 (perfect mirror) to 1 (perfect black body).')],
        effusivity: [t('stem.heatlab.v_effusivity', 'effusivity'), t('stem.heatlab.v_effusivity_def', 'How hard a material pulls heat from something that touches it. It decides how cold a surface feels.')],
        entropy: [t('stem.heatlab.v_entropy', 'entropy'), t('stem.heatlab.v_entropy_def', 'A measure of how spread out energy is. In a closed system it never goes down, which is why heat flows one way.')],
        efficiency: [t('stem.heatlab.v_efficiency', 'efficiency'), t('stem.heatlab.v_efficiency_def', 'The share of the energy put in that comes out as useful work. The Carnot limit caps it for any heat engine.')],
        cop: [t('stem.heatlab.v_cop', 'COP'), t('stem.heatlab.v_cop_def', 'Coefficient of performance: heat delivered ÷ electricity used. A heat pump with COP 3 moves 3 J of heat per 1 J of electricity.')],
        phasechange: [t('stem.heatlab.v_phasechange', 'change of state'), t('stem.heatlab.v_phasechange_def', 'Melting, freezing, boiling or condensing. The temperature holds steady while it happens.')],
        degreedays: [t('stem.heatlab.v_degreedays', 'heating degree-days'), t('stem.heatlab.v_degreedays_def', 'How cold a place is over a season: each day adds how many degrees its average falls below 18.3 °C.')]
      };
      var HT_SECTION_WORDS = {
        conduction: ['conduction', 'convection', 'radiation', 'diffusivity'], insulation: ['insulator', 'conductivity'],
        wall: ['rvalue', 'uvalue'], range: ['conductivity'], touch: ['effusivity', 'temperature'],
        mixing: ['specificheat', 'heat', 'temperature'], equilibrium: ['equilibrium', 'entropy'],
        heatingcurve: ['latent', 'phasechange'], engines: ['efficiency'], convection3d: ['convection'],
        radiation: ['radiation', 'emissivity'], entropy: ['entropy'], heatpumps: ['cop'],
        cooler: ['insulator', 'latent'], house: ['uvalue', 'degreedays', 'cop']
      };
      function vocabRow(where, ids) {
        var openId = vocabOpen.indexOf(where + ':') === 0 ? vocabOpen.slice(where.length + 1) : '';
        var regionId = 'ht-vocab-' + where;
        return h('div', { className: 'mb-2', 'data-ht-vocab': where },
          h('div', { className: 'flex flex-wrap items-center gap-1' },
            h('span', { className: 'text-[0.625rem] font-bold', style: { color: softInk } }, '📖 ' + t('stem.heatlab.key_words', 'Key words:')),
            ids.filter(function (id) { return HT_VOCAB[id]; }).map(function (id) {
              var on = openId === id;
              return h('button', {
                key: id, type: 'button', 'aria-expanded': on ? 'true' : 'false', 'aria-controls': regionId, 'data-ht-term': id,
                onClick: function () { setVocabOpen(on ? '' : where + ':' + id); },
                onKeyDown: function (e) { if (e.key === 'Escape' && on) { e.preventDefault(); setVocabOpen(''); } },
                className: 'min-h-11 px-2 py-1 rounded-lg text-[0.6875rem] font-bold underline decoration-dotted underline-offset-2',
                style: neutralBtnStyle(on)
              }, HT_VOCAB[id][0]);
            })),
          openId && HT_VOCAB[openId] ? h('p', {
            id: regionId, role: 'note', 'data-ht-vocab-def': openId,
            className: 'mt-1 rounded-lg border p-2 text-[0.6875rem] leading-relaxed', style: Object.assign({ color: bodyInk }, panelStyle('#a78bfa'))
          }, h('b', null, HT_VOCAB[openId][0] + ': '), HT_VOCAB[openId][1]) : null);
      }
      // Equations: always shown at Standard and Extended; behind a button at Simple.
      function maths(id) {
        var kids = Array.prototype.slice.call(arguments, 1);
        if (!htSimple) return kids.length === 1 ? kids[0] : h.apply(null, ['div', { 'data-ht-maths': id }].concat(kids));
        var open = !!mathsOpen[id];
        return h('div', { className: 'mt-1', 'data-ht-maths': id },
          h('button', {
            type: 'button', 'aria-expanded': open ? 'true' : 'false', 'aria-controls': 'ht-maths-' + id,
            onClick: function () { setMathsOpen(function (p) { var n = Object.assign({}, p); n[id] = !p[id]; return n; }); },
            className: 'min-h-11 px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(open)
          }, (open ? '▾ ' : '▸ ') + '🧮 ' + t('stem.heatlab.show_maths', 'Show the maths')),
          open ? h.apply(null, ['div', { id: 'ht-maths-' + id }].concat(kids)) : null);
      }
      // Extended level: where the key equation comes from.
      var HT_DERIVE = {
        conduction: t('stem.heatlab.derive_conduction', 'Fourier’s law says the heat flow through a slab is q = −k A dT/dx. Balancing the heat flowing into and out of a thin slice, ρc ∂T/∂t = k ∂²T/∂x², gives the heat equation; the bar steps it forward with α = k/ρc.'),
        insulation: t('stem.heatlab.derive_insulation', 'Heat loss is (T − T_room)/R and the tea stores C = mc, so C dT/dt = −(T − T_room)/R. Its solution, T = T_room + (T₀ − T_room) e^(−t/RC), is Newton’s law of cooling with time constant τ = RC.'),
        wall: t('stem.heatlab.derive_wall', 'In steady state the same heat flow q passes every layer, and each layer’s temperature drop is q × R. Adding the drops gives ΔT = q × (R₁ + R₂ + …), so resistances in series add and U = 1/ΣR.'),
        mixing: t('stem.heatlab.derive_mixing', 'Energy is conserved: the heat one sample loses is the heat the other gains, m₁c₁(T_f − T₁) + m₂c₂(T_f − T₂) = 0. Solving for T_f gives the weighted average.'),
        heatingcurve: t('stem.heatlab.derive_heatingcurve', 'Sensible heat raises temperature: Q = mcΔT, so the slope of T against Q is 1/mc. On a plateau Q = mL goes into breaking bonds, so the slope is zero.'),
        radiation: t('stem.heatlab.derive_radiation', 'Integrating Planck’s spectrum over every wavelength gives the Stefan–Boltzmann law, P = εσAT⁴; the net exchange with a room is εσA(T⁴ − T_room⁴).'),
        engines: t('stem.heatlab.derive_engines', 'A reversible engine makes no entropy: Q_h/T_h = Q_c/T_c. The work is Q_h − Q_c, so the best efficiency is 1 − Q_c/Q_h = 1 − T_c/T_h (temperatures in kelvin).'),
        heatpumps: t('stem.heatlab.derive_heatpumps', 'Run the Carnot cycle backwards: the heat delivered is Q_h and the work is Q_h − Q_c, so the ideal COP is T_h/(T_h − T_c). A small temperature lift gives a big COP.'),
        house: t('stem.heatlab.derive_house', 'Each element loses U × A watts per kelvin; air changes lose 0.335 × n × V. Multiply the total by the degree-days (K·days) and 24 h to get kWh, then subtract the share of sunshine the house can actually use.')
      };
      function derive(id) {
        return htExtended && HT_DERIVE[id] ? h('p', { 'data-ht-derive': id, className: 'mt-1.5 rounded-lg border p-2 text-[0.6875rem] leading-relaxed', style: Object.assign({ color: bodyInk }, panelStyle('#22d3ee')) },
          h('b', null, '📐 ' + t('stem.heatlab.derive_label', 'Where this comes from:') + ' '), HT_DERIVE[id]) : null;
      }
      function levelBar() {
        return h('div', { className: 'rounded-xl border px-2.5 py-2 mt-1', 'data-ht-level': htLevel, style: panelStyle('#a78bfa') },
          h('div', { role: 'group', 'aria-label': t('stem.heatlab.level_group', 'How much detail to show'), className: 'flex flex-wrap items-center gap-1.5' },
            h('span', { className: 'text-[0.6875rem] font-black', style: { color: isContrast ? '#fbbf24' : ink('#a78bfa') } }, '🎚️ ' + t('stem.heatlab.level_title', 'Detail level')),
            HT_LEVELS.map(function (lv) {
              return h('button', {
                key: lv, type: 'button', 'aria-pressed': htLevel === lv ? 'true' : 'false', 'data-ht-level-btn': lv,
                onClick: function () { upd({ level: lv }); },
                className: 'min-h-11 px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(htLevel === lv)
              }, HT_LEVEL_NAMES[lv]);
            })),
          h('p', { className: 'text-[0.625rem] mt-1 leading-relaxed', style: { color: softInk } },
            HT_LEVEL_HELP[htLevel] + ' ' + (HT_LEVELS.indexOf(d.level) !== -1
              ? t('stem.heatlab.level_chosen', '(Your choice.)')
              : htBand ? t('stem.heatlab.level_from_band', '(Set from your grade band; change it any time.)') : '')));
      }

      // ══ Stage D (P5-2): hearing and describing temperature ══
      var isTeacher = ctx.isTeacherMode === true;
      function htMuted() { try { return !!window._alloGlobalMute; } catch (e) { return false; } }
      // The host's shared AudioContext when it exists; otherwise one of our
      // own, held in a ref and closed on unmount. Never stored in toolData.
      function htAudio() {
        try {
          if (window.StemLab && typeof window.StemLab.audioContext === 'function') return window.StemLab.audioContext();
          var C = window.AudioContext || window.webkitAudioContext;
          if (!C) return null;
          if (!ownAcRef.current || ownAcRef.current.state === 'closed') ownAcRef.current = new C();
          if (ownAcRef.current.state === 'suspended' && ownAcRef.current.resume) { try { ownAcRef.current.resume(); } catch (e2) {} }
          return ownAcRef.current;
        } catch (e) { return null; }
      }
      var htSayFor = '';
      function htSay(msg) {
        setAccessMsg([htSayFor, msg]);
        if (typeof announceToSR === 'function') announceToSR(msg);
      }
      function stopSound() {
        var p = playRef.current;
        playRef.current = null;
        if (p && typeof p.stop === 'function') { try { p.stop(); } catch (e) {} }
        setHearing('');
      }
      // Several series play one after another on one shared pitch scale.
      function htJoin(list) {
        var out = [], offset = 0;
        (list || []).forEach(function (pts) {
          if (!pts || pts.length < 2) return;
          var x0 = pts[0][0], span = pts[pts.length - 1][0] - x0;
          pts.forEach(function (p) { out.push([offset + (p[0] - x0), p[1]]); });
          offset += span * 1.08 + 1e-9;
        });
        return out;
      }
      function hearIt(id, list, opts) {
        htSayFor = id;
        if (hearing === id) { stopSound(); htSay(t('stem.heatlab.sound_stopped', 'Sound stopped.')); return; }
        if (playRef.current) stopSound();
        if (htMuted()) { htSay(t('stem.heatlab.sound_muted', 'Sound is muted. Turn sound on to hear the graph.')); return; }
        var plan = heatSonifyPlan(htJoin(list), opts);
        if (!plan) { htSay(t('stem.heatlab.sound_nothing', 'There is nothing to play yet.')); return; }
        var ac = htAudio();
        if (!ac) { htSay(t('stem.heatlab.sound_unavailable', 'Sound is not available in this browser. Use “Describe this graph” instead.')); return; }
        var handle = heatSonifyPlay(plan, ac, function () {
          if (playRef.current === handle) { playRef.current = null; setHearing(''); }
        });
        if (!handle) { htSay(t('stem.heatlab.sound_unavailable', 'Sound is not available in this browser. Use “Describe this graph” instead.')); return; }
        playRef.current = handle;
        setHearing(id);
        htSay(__alloOneWord(t('stem.heatlab.sound_playing', 'Playing {s} seconds: higher pitch means hotter. {n}')
          .replace('{s}', fmt(plan.duration, 0))
          .replace('{n}', plan.plateaus.length
            ? t('stem.heatlab.sound_plateaus', 'A chime marks each of the {k} flat stretches, which play as a steady tone.').replace('{k}', String(plan.plateaus.length))
            : '')));
      }
      function htSpeak(text) {
        if (!text) return;
        if (htMuted()) { htSay(t('stem.heatlab.speech_muted', 'Sound is muted. Turn sound on to hear it read aloud.')); return; }
        var fallback = function () {
          try {
            var ss = window.speechSynthesis;
            if (!ss || typeof window.SpeechSynthesisUtterance !== 'function') { htSay(t('stem.heatlab.speech_unavailable', 'Read-aloud is not available here.')); return; }
            ss.cancel();
            ss.speak(new window.SpeechSynthesisUtterance(text));
          } catch (e) { htSay(t('stem.heatlab.speech_unavailable', 'Read-aloud is not available here.')); }
        };
        // A press of "Read aloud" is an explicit request, so it may pass the
        // narration setting ({ force: true }); the global mute still wins above.
        if (typeof ctx.callTTS === 'function') {
          try { Promise.resolve(ctx.callTTS(text, undefined, undefined, { force: true })).then(function (url) { if (!url) fallback(); }, fallback); }
          catch (e) { fallback(); }
        } else fallback();
      }
      // Announcements for significant events only: at most one every 2.5 s,
      // and the same event not again within 20 s.
      function htAnnounce(key, msg) {
        var a = announceRef.current, now = Date.now();
        if (now - a.at < 2500) return false;
        if (a.keys[key] && now - a.keys[key] < 20000) return false;
        a.at = now; a.keys[key] = now;
        if (typeof announceToSR === 'function') announceToSR(msg);
        return true;
      }
      // The access row under a chart: Hear it, Describe this graph, Read aloud.
      // `cfg.series()` returns [[x, °C], ...] lists; `cfg.describe()` the text.
      function accessRow(id, cfg) {
        var open = !!describeOpen[id];
        var regionId = 'ht-desc-' + id;
        var playing = hearing === id;
        return h('div', { className: 'mt-1.5', 'data-ht-access': id },
          h('div', { className: 'flex flex-wrap gap-1.5' },
            cfg.series ? h('button', {
              type: 'button', 'aria-pressed': playing ? 'true' : 'false', 'data-ht-hear': id,
              onClick: function () { hearIt(id, cfg.series(), cfg.sound || null); },
              className: 'min-h-11 px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(playing)
            }, playing ? '⏹️ ' + t('stem.heatlab.hear_stop', 'Stop sound') : '🔊 ' + t('stem.heatlab.hear_it', 'Hear it')) : null,
            h('button', {
              type: 'button', 'aria-expanded': open ? 'true' : 'false', 'aria-controls': regionId, 'data-ht-describe': id,
              onClick: function () { setDescribeOpen(function (p) { var n = Object.assign({}, p); n[id] = !p[id]; return n; }); },
              className: 'min-h-11 px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(open)
            }, '📝 ' + t('stem.heatlab.describe_graph', 'Describe this graph')),
            h('button', {
              type: 'button', 'data-ht-read': id,
              onClick: function () { htSayFor = id; htSpeak(cfg.describe()); },
              className: 'min-h-11 px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(false)
            }, '🗣️ ' + t('stem.heatlab.read_aloud', 'Read aloud'))),
          open ? h('p', { id: regionId, 'data-ht-desc': id, className: 'mt-1 rounded-lg border p-2 text-[0.6875rem] leading-relaxed', style: Object.assign({ color: bodyInk }, panelStyle('#60a5fa')) },
            cfg.describe()) : null,
          accessMsg && accessMsg[0] === id ? h('p', { className: 'text-[0.625rem] mt-1 font-bold', 'data-ht-access-msg': id, style: { color: softInk } }, accessMsg[1]) : null);
      }
      // Describers, built from the model data behind each chart.
      function describeRace() {
        var el = canvasRef.current;
        var series = el && typeof el._heatProbeSeries === 'function' ? el._heatProbeSeries() : [];
        if (!probes.length) return t('stem.heatlab.desc_race_empty', 'No thermometers are placed yet. Add one to see its temperature over time.');
        var parts = probes.map(function (p, i) {
          var pts = series[i] || [];
          var who = t('stem.heatlab.desc_race_who', 'P{n}, {cm} cm from the hot end').replace('{n}', String(i + 1)).replace('{cm}', String(p.cm)) +
            (raceOn ? ' (' + (p.bar === 'b' ? materialB.name : material.name) + ')' : '');
          var s = heatDescribeSeries(pts);
          if (!s) return t('stem.heatlab.desc_race_none', '{p}: no readings yet.').replace('{p}', who);
          var cross = null;
          for (var k = 1; k < pts.length; k++) if (pts[k - 1][1] < HEAT_FINISH_C && pts[k][1] >= HEAT_FINISH_C) { cross = pts[k - 1][0] + (HEAT_FINISH_C - pts[k - 1][1]) / ((pts[k][1] - pts[k - 1][1]) || 1) * (pts[k][0] - pts[k - 1][0]); break; }
          return t('stem.heatlab.desc_race_probe', '{p}: starts at {a} °C and reads {b} °C after {time}.').replace('{p}', who)
            .replace('{a}', fmt(s.y0, 1)).replace('{b}', fmt(s.y1, 1)).replace('{time}', heatTimeLabel(s.x1)) + ' ' +
            (cross != null ? t('stem.heatlab.desc_race_cross', 'It passed {f} °C at {when}.').replace('{f}', String(HEAT_FINISH_C)).replace('{when}', heatTimeLabel(cross))
              : t('stem.heatlab.desc_race_nocross', 'It has not reached {f} °C yet.').replace('{f}', String(HEAT_FINISH_C)));
        });
        return t('stem.heatlab.desc_race_intro', 'Temperature against time for each thermometer; the hot end is held at {hot} °C and the bars start at 20 °C.').replace('{hot}', fmt(hotEnd, 0)) + ' ' + parts.join(' ');
      }
      function describeMug() {
        var pts = curve.map(function (v, i) { return [i, v]; });
        var s = heatDescribeSeries(pts, { towards: HEAT_COLD_C });
        if (!s) return '';
        var below = null;
        for (var k = 1; k < pts.length; k++) if (pts[k - 1][1] >= 65 && pts[k][1] < 65) { below = pts[k - 1][0] + (pts[k - 1][1] - 65) / ((pts[k - 1][1] - pts[k][1]) || 1); break; }
        var best = MATERIALS[MATERIALS.length - 1], worst = MATERIALS[0];
        return t('stem.heatlab.desc_mug', 'Tea wrapped in {mm} mm of {mat}, in a 20 °C room: it starts at {a} °C and is at {b} °C after 60 minutes. The line falls fastest at the start and flattens as the tea nears room temperature.')
            .replace('{mm}', fmt(thickness, 0)).replace('{mat}', insMat.name.toLowerCase()).replace('{a}', fmt(s.y0, 0)).replace('{b}', fmt(s.y1, 1)) + ' ' +
          (s.halfX != null ? __alloOneWord(t('stem.heatlab.desc_mug_half', 'Half of the gap to room temperature has gone after {m} minutes.').replace('{m}', fmt(s.halfX, 1)))
            : t('stem.heatlab.desc_mug_nohalf', 'Less than half of the gap to room temperature closes within the hour.')) + ' ' +
          (below != null ? __alloOneWord(t('stem.heatlab.desc_mug_below', 'It drops below the 65 °C line after {m} minutes.').replace('{m}', fmt(below, 1)))
            : t('stem.heatlab.desc_mug_above', 'It stays above the 65 °C line for the whole hour.')) + ' ' +
          t('stem.heatlab.desc_mug_compare', 'With the same thickness, {worst} ends at {w} °C and {best} at {g} °C.')
            .replace('{worst}', worst.name.toLowerCase()).replace('{w}', fmt(heatCoolingTemperature(worst, thickness, 60), 1))
            .replace('{best}', best.name.toLowerCase()).replace('{g}', fmt(heatCoolingTemperature(best, thickness, 60), 1));
      }
      function describeCurve() {
        var ice = stageById.ice, melt = stageById.melt, water = stageById.water, boil = stageById.boil;
        return t('stem.heatlab.desc_curve', 'Temperature of 1 kg of water against the energy added. It starts as ice at −20 °C and rises to 0 °C after {a} kJ. Then a flat stretch at 0 °C lasts {b} kJ while the ice melts. It rises again to 100 °C at {c} kJ, then a much longer flat stretch at 100 °C lasts {d} kJ while it boils. Past {e} kJ the steam warms again. Your marker is at {E} kJ: {phase}, {T} °C.')
          .replace('{a}', fmt(ice.totalKJ, 1)).replace('{b}', fmt(melt.kJ, 0)).replace('{c}', fmt(water.totalKJ, 1)).replace('{d}', fmt(boil.kJ, 0))
          .replace('{e}', fmt(boil.totalKJ, 1)).replace('{E}', fmt(energyIn, 0)).replace('{phase}', waterPhaseName(wstate.phase).toLowerCase()).replace('{T}', fmt(wstate.temp, 1));
      }
      function describeHc() {
        var u = function (s) { return heatTimeLabel(s); };
        if (hcMode === 'heat') {
          var bits = hcHeat.stages.map(function (st) {
            return st.fromC === st.toC
              ? t('stem.heatlab.desc_hc_flat', 'holds at {T} °C for {d} ({what})').replace('{T}', fmt(st.fromC, 1)).replace('{d}', u(st.endS - st.startS)).replace('{what}', st.id === 'melt' ? HC_PHASE_WORDS.melting : HC_PHASE_WORDS.boiling)
              : t('stem.heatlab.desc_hc_rise', 'rises from {a} to {b} °C in {d}').replace('{a}', fmt(st.fromC, 1)).replace('{b}', fmt(st.toC, 1)).replace('{d}', u(st.endS - st.startS));
          });
          return t('stem.heatlab.desc_hc_heat', '1 kg of {sub} heated at {p} W: it {steps}.').replace('{sub}', hcName.toLowerCase()).replace('{p}', fmt(hcPower, 0)).replace('{steps}', bits.join('; then it '));
        }
        return t('stem.heatlab.desc_hc_cool', '{m} of {sub} cooling in a {env} °C bath: it cools from {a} °C to {dip} °C in {t1}, holds at {mp} °C for {plat} while it freezes, then cools towards {env} °C, reaching {end} °C at {tend}.')
          .replace('{m}', hcMassText).replace('{sub}', hcName.toLowerCase()).replace(/\{env\}/g, fmt(hcCool.envC, 0)).replace('{a}', fmt(hcCool.startC, 0))
          .replace('{dip}', fmt(hcSub.mpC - hcCool.supercoolK, 1)).replace('{t1}', u(hcCool.freezeStartS)).replace('{mp}', fmt(hcSub.mpC, 1))
          .replace('{plat}', u(hcCool.plateauS)).replace('{end}', fmt(hcCool.at(hcCool.endS).temp, 1)).replace('{tend}', u(hcCool.endS));
      }
      function describeEq() {
        var gap = eqRun.points.map(function (p) { return [p.t, p.T1 - p.T2]; });
        var s = heatDescribeSeries(gap, { towards: 0 });
        return t('stem.heatlab.desc_eq', 'Block 1 ({m1}, {k1} kg) starts at {a} °C and block 2 ({m2}, {k2} kg) at {b} °C. Their temperatures move towards each other and meet at {tf} °C, the shared final temperature.')
            .replace('{m1}', eqMat1.name.toLowerCase()).replace('{k1}', fmt(eqM1, 1)).replace('{a}', fmt(eqT1, 0))
            .replace('{m2}', eqMat2.name.toLowerCase()).replace('{k2}', fmt(eqM2, 1)).replace('{b}', fmt(eqT2, 0)).replace('{tf}', fmt(eqRun.Tf, 1)) + ' ' +
          (s && s.halfX != null ? t('stem.heatlab.desc_eq_half', 'Half of the gap between them closes after {t}; the gap keeps halving at that same pace, so the lines flatten as they meet.').replace('{t}', heatTimeLabel(s.halfX)) : '') +
          (eqLeak ? ' ' + t('stem.heatlab.desc_eq_leak', 'With the room leak on, both then drift slowly towards the 20 °C room.') : '');
      }
      function describeTrade() {
        var rows = clSaved.map(function (x, i) {
          return t('stem.heatlab.desc_trade_row', '{name}: {cost}, ice lasts {h} h{ok}.').replace('{name}', t('stem.heatlab.cl_design_n', 'Design {n}').replace('{n}', String.fromCharCode(65 + i)))
            .replace('{cost}', function () { return clMoney(x.cost); }).replace('{h}', fmt(x.meltH, 1)).replace('{ok}', x.meets ? ', ' + t('stem.heatlab.cl_meets_short', 'meets the brief') : '');
        });
        if (clTested && !clStale) rows.push(t('stem.heatlab.desc_trade_now', 'Latest test: {cost}, ice lasts {h} h.').replace('{cost}', function () { return clMoney(clTested.cost); }).replace('{h}', fmt(clTested.meltH, 1)));
        return __alloOneWord(t('stem.heatlab.desc_trade_intro', 'Cost across, hours the ice lasts up. The target line is {h} hours and the budget line ${b}; a design that meets the brief sits above the target and left of the budget.')
          .replace('{h}', String(HEAT_COOLER.targetH)).replace('{b}', String(HEAT_COOLER.budget))) + ' ' + rows.join(' ');
      }
      var WATER_PHASE_NAMES = {
        'Ice': t('stem.heatlab.wphase_ice', 'Ice'), 'Ice melting': t('stem.heatlab.wphase_melting', 'Ice melting'),
        'Liquid water': t('stem.heatlab.wphase_liquid', 'Liquid water'), 'Water boiling': t('stem.heatlab.wphase_boiling', 'Water boiling'),
        'Steam': t('stem.heatlab.wphase_steam', 'Steam')
      };
      function waterPhaseName(p) { return WATER_PHASE_NAMES[p] || p; }
      // The ticking thermometer follows P1 (or the bar's middle) while on.
      tickTempRef.current = { T: probes.length ? probeReading(0) : (live.a ? live.a.mid : HEAT_COLD_C), lo: HEAT_COLD_C, hi: hotEnd };
      React.useEffect(function () {
        if (!tickOn) return undefined;
        var stopped = false, timer = 0;
        function tick() {
          if (stopped) return;
          if (htMuted()) { stopped = true; setTickOn(false); htSay(t('stem.heatlab.sound_muted', 'Sound is muted. Turn sound on to hear the graph.')); return; }
          var ac = htAudio();
          if (ac) {
            try {
              var o = ac.createOscillator(), g = ac.createGain(), now = ac.currentTime;
              o.type = 'square'; o.frequency.setValueAtTime(1500, now);
              g.gain.setValueAtTime(0.04, now); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
              o.connect(g); g.connect(ac.destination); o.start(now); o.stop(now + 0.04);
            } catch (e) {}
          }
          var r = tickTempRef.current;
          timer = setTimeout(tick, heatTickIntervalMs(r.T, r.lo, r.hi));
        }
        tick();
        return function () { stopped = true; clearTimeout(timer); };
      }, [tickOn]);
      // Stop every sound, and close our own context, when the tool closes.
      React.useEffect(function () {
        return function () {
          var p = playRef.current;
          playRef.current = null;
          if (p && typeof p.stop === 'function') { try { p.stop(); } catch (e) {} }
          try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e2) {}
          var own = ownAcRef.current;
          ownAcRef.current = null;
          if (own && typeof own.close === 'function') { try { own.close(); } catch (e3) {} }
        };
      }, []);
      // Significant events, throttled: a plateau starts or ends as the learner
      // scrubs the heating curves.
      React.useEffect(function () {
        var seen = phaseSeenRef.current;
        if (seen.curve !== undefined && seen.curve !== wstate.phase) {
          var msg = wstate.phase === 'Ice melting' ? t('stem.heatlab.sr_ev_melt', 'The ice starts to melt. The temperature holds at 0 °C while energy breaks bonds.')
            : wstate.phase === 'Water boiling' ? t('stem.heatlab.sr_ev_boil', 'The water starts to boil. The temperature holds at 100 °C.')
              : seen.curve === 'Ice melting' && wstate.phase === 'Liquid water' ? t('stem.heatlab.sr_ev_melted', 'All the ice has melted. The temperature rises again.')
                : seen.curve === 'Water boiling' && wstate.phase === 'Steam' ? t('stem.heatlab.sr_ev_boiled', 'All the water has boiled. The steam warms up.') : '';
          if (msg) htAnnounce('curve:' + wstate.phase, msg);
        }
        seen.curve = wstate.phase;
        var hcKey = hcSub.id + '|' + hcMode;
        if (seen.hcKey === hcKey && seen.hc !== hcNow.phase && (hcNow.phase === 'melting' || hcNow.phase === 'boiling' || hcNow.phase === 'freezing')) {
          htAnnounce('hc:' + hcKey + ':' + hcNow.phase, t('stem.heatlab.sr_ev_hc', '{sub} is {state}: the temperature holds at {T} °C.')
            .replace('{sub}', hcName).replace('{state}', HC_PHASE_WORDS[hcNow.phase]).replace('{T}', fmt(hcNow.temp, 1)));
        }
        seen.hcKey = hcKey; seen.hc = hcNow.phase;
      }, [wstate.phase, hcSub.id, hcMode, hcNow.phase]);
      function tickButton() {
        return h('button', {
          type: 'button', 'aria-pressed': tickOn ? 'true' : 'false', 'data-ht-tick': 'true',
          onClick: function () {
            htSayFor = 'race';
            if (tickOn) { setTickOn(false); htSay(t('stem.heatlab.tick_off', 'Ticking thermometer off.')); return; }
            if (htMuted()) { htSay(t('stem.heatlab.sound_muted', 'Sound is muted. Turn sound on to hear the graph.')); return; }
            if (!htAudio()) { htSay(t('stem.heatlab.sound_unavailable', 'Sound is not available in this browser. Use “Describe this graph” instead.')); return; }
            setTickOn(true);
            htSay(t('stem.heatlab.tick_on', 'Ticking thermometer on: it ticks once a second at 20 °C and faster as {where} warms, up to ten a second at the hot end.')
              .replace('{where}', probes.length ? 'P1' : t('stem.heatlab.tick_mid', 'the middle')));
          },
          className: 'min-h-11 px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(tickOn)
        }, '⏱️ ' + (tickOn ? t('stem.heatlab.tick_stop', 'Stop ticking') : t('stem.heatlab.tick_start', 'Ticking thermometer')));
      }

      // ══ Stage D (P3-2): passive house designer ══
      var HS = HEAT_HOUSE;
      var HS_WALL_NAMES = {
        solid: t('stem.heatlab.hs_wall_solid', 'Solid brick'), cavity: t('stem.heatlab.hs_wall_cavity', 'Cavity wall (empty)'),
        filled: t('stem.heatlab.hs_wall_filled', 'Mineral-wool cavity'), super: t('stem.heatlab.hs_wall_super', 'Super-insulated'),
        mine: t('stem.heatlab.hs_wall_mine', 'My wall from section 3')
      };
      var HS_FLOOR_NAMES = { none: t('stem.heatlab.hs_floor_none', 'Bare slab'), pir100: t('stem.heatlab.hs_floor_pir100', '100 mm PIR board'), pir200: t('stem.heatlab.hs_floor_pir200', '200 mm PIR board') };
      var HS_GLAZING_NAMES = { single: t('stem.heatlab.hs_gl_single', 'Single'), double: t('stem.heatlab.hs_gl_double', 'Double'), lowe: t('stem.heatlab.hs_gl_lowe', 'Double, low-e'), triple: t('stem.heatlab.hs_gl_triple', 'Triple') };
      var HS_AIR_NAMES = { leaky: t('stem.heatlab.hs_air_leaky', 'Leaky'), average: t('stem.heatlab.hs_air_average', 'Average'), tight: t('stem.heatlab.hs_air_tight', 'Airtight'), passive: t('stem.heatlab.hs_air_passive', 'Passive-house tight') };
      var HS_CLIMATE_NAMES = { cold: t('stem.heatlab.hs_cl_cold', 'Cold (Portland, Maine)'), temperate: t('stem.heatlab.hs_cl_temperate', 'Temperate (London)'), mild: t('stem.heatlab.hs_cl_mild', 'Mild (San Francisco)') };
      var HS_ELEMENT_NAMES = { wall: t('stem.heatlab.hs_el_wall', 'Walls'), roof: t('stem.heatlab.hs_el_roof', 'Roof'), floor: t('stem.heatlab.hs_el_floor', 'Floor'), window: t('stem.heatlab.hs_el_window', 'Windows'), air: t('stem.heatlab.hs_el_air', 'Air changes') };
      var HS_MONTHS = [t('stem.heatlab.m_jan', 'Jan'), t('stem.heatlab.m_feb', 'Feb'), t('stem.heatlab.m_mar', 'Mar'), t('stem.heatlab.m_apr', 'Apr'), t('stem.heatlab.m_may', 'May'), t('stem.heatlab.m_jun', 'Jun'),
        t('stem.heatlab.m_jul', 'Jul'), t('stem.heatlab.m_aug', 'Aug'), t('stem.heatlab.m_sep', 'Sep'), t('stem.heatlab.m_oct', 'Oct'), t('stem.heatlab.m_nov', 'Nov'), t('stem.heatlab.m_dec', 'Dec')];
      var hsMineOk = wallStack.length > 0;
      var hsDesign = heatHouseDesign({ wall: d.hsWall === 'mine' && !hsMineOk ? 'cavity' : d.hsWall, mine: wallStack, roofMm: d.hsRoofMm, floor: d.hsFloor, glazing: d.hsGlazing,
        winS: d.hsWinS, winE: d.hsWinE, winW: d.hsWinW, winN: d.hsWinN, air: d.hsAir, mvhr: d.hsMvhr });
      var hsClimate = HEAT_CLIMATES.some(function (c) { return c.id === d.hsClimate; }) ? d.hsClimate : HS.brief.climate;
      var hsLive = heatHouseModel(hsDesign, hsClimate);
      var hsBriefLive = hsClimate === HS.brief.climate ? hsLive : heatHouseModel(hsDesign, HS.brief.climate);
      var hsTestRec = d.hsTest && typeof d.hsTest === 'object' && d.hsTest.design ? d.hsTest : null;
      var hsTested = hsTestRec ? heatHouseModel(hsTestRec.design, HS.brief.climate) : null;
      var hsStale = !!(hsTested && JSON.stringify(hsTested.design) !== JSON.stringify(hsDesign));
      var hsSaved = (Array.isArray(d.hsSaved) ? d.hsSaved : []).filter(function (x) { return x && x.design; }).slice(0, 3);
      function hsMoney(v) { return '$' + fmt(Math.round(v), 0); }
      var houseBriefText = t('stem.heatlab.hs_brief', 'Design a one-storey, 100 m² house for the cold climate (Portland, Maine). It may need no more than {k} kWh of heating per square metre a year. The parts you choose may cost no more than {b} and embody no more than {c} kg CO₂e. The inside of the glass must stay at {g} °C or warmer in the coldest month, and the house needs at least {a} fresh-air changes an hour.')
        .replace('{k}', String(HS.brief.kwhM2)).replace('{b}', function () { return hsMoney(HS.brief.budget); }).replace('{c}', fmt(HS.brief.co2, 0))
        .replace('{g}', String(HS.comfortC)).replace('{a}', String(HS.freshAch));
      var coolerBriefText = __alloOneWord(t('stem.heatlab.cl_brief', 'A 200 g ice pack straight from a −18 °C freezer must stay frozen for at least {h} hours in a car at {car} °C. The inside of the box is a 10 cm cube. Your budget is ${b} and the box must fit a {cm} cm space.')
        .replace('{h}', String(HEAT_COOLER.targetH)).replace('{car}', String(HEAT_COOLER.carC)).replace('{b}', String(HEAT_COOLER.budget)).replace('{cm}', String(HEAT_COOLER.maxOuterCm)));
      function hsSet(patch) { upd(Object.assign({ hsTouched: true }, patch)); }
      function hsDescribe(dz) {
        var z = heatHouseDesign(dz);
        return HS_WALL_NAMES[z.wall] + ', ' + t('stem.heatlab.hs_roof_short', '{mm} mm roof').replace('{mm}', String(z.roofMm)) + ', ' + HS_FLOOR_NAMES[z.floor].toLowerCase() + ', ' +
          HS_GLAZING_NAMES[z.glazing].toLowerCase() + ' ' + t('stem.heatlab.hs_glazing_word', 'glazing') + ' (' + (z.winS + z.winE + z.winW + z.winN) + ' m²), ' +
          HS_AIR_NAMES[z.air].toLowerCase() + (z.mvhr ? ' + ' + t('stem.heatlab.hs_mvhr_short', 'heat recovery') : '');
      }
      function hsRunTest() {
        var m = heatHouseModel(hsDesign, HS.brief.climate);
        var earned = m.meets && !!d.hsTouched && !d.hsBadge;
        var patch = { hsTest: { design: m.design, kwhM2: m.kwhM2, cost: m.costSum, co2: m.co2Sum, meets: m.meets, at: Date.now() }, hsTests: (d.hsTests || 0) + 1 };
        if (earned) patch.hsBadge = true;
        upd(patch);
        recordTrial({
          kind: 'house', section: 'house', wall: m.design.wall, roof_mm: m.design.roofMm, floor: m.design.floor, glazing: m.design.glazing,
          window_m2: m.winA, airtight: m.design.air, mvhr: m.design.mvhr, UA_WK: m.UAsum, Hvent_WK: m.Hvent,
          demand_kWh: m.demandKWh, kWh_m2: m.kwhM2, cost_usd: m.costSum, co2_kg: m.co2Sum, meetsBrief: m.meets
        });
        if (earned) {
          if (typeof celebrate === 'function') celebrate();
          if (typeof awardXP === 'function') awardXP('heatlab_house', 25, t('stem.heatlab.xp_house', 'Designed a house that meets the passive house brief'));
        }
        if (typeof announceToSR === 'function') {
          announceToSR(t('stem.heatlab.sr_hs_tested', 'Tested in the cold climate: {k} kWh per square metre a year; cost {cost}; carbon {co2} kg. {verdict}')
            .replace('{k}', fmt(m.kwhM2, 0)).replace('{cost}', function () { return hsMoney(m.costSum); }).replace('{co2}', fmt(m.co2Sum, 0))
            .replace('{verdict}', m.meets ? t('stem.heatlab.hs_meets', 'It meets the brief.') : t('stem.heatlab.hs_fails', 'It does not meet the brief yet.')));
        }
      }
      function hsSave() {
        if (!hsTested || hsStale || hsSaved.length >= 3) return;
        var next = hsSaved.concat([{ design: hsTested.design, kwhM2: hsTested.kwhM2, cost: hsTested.costSum, co2: hsTested.co2Sum, meets: hsTested.meets }]);
        upd({ hsSaved: next });
        if (typeof announceToSR === 'function') announceToSR(t('stem.heatlab.sr_hs_saved', 'House design saved for comparison. {n} of 3 slots used.').replace('{n}', String(next.length)));
      }
      function hsRemove(i) { var next = hsSaved.slice(); next.splice(i, 1); upd({ hsSaved: next }); }
      function describeHouse() {
        var m = hsLive;
        var peak = m.months.reduce(function (a, b) { return b.needKWh > a.needKWh ? b : a; }, m.months[0]);
        var zero = m.months.filter(function (x) { return x.needKWh < 0.5; }).map(function (x) { return HS_MONTHS[x.month]; });
        return t('stem.heatlab.desc_house', 'Monthly heating need in the {cl} climate: {total} kWh a year ({k} kWh per square metre). The biggest month is {peak} at {pk} kWh.')
            .replace('{cl}', HS_CLIMATE_NAMES[m.climate]).replace('{total}', fmt(m.demandKWh, 0)).replace('{k}', fmt(m.kwhM2, 0))
            .replace('{peak}', HS_MONTHS[peak.month]).replace('{pk}', fmt(peak.needKWh, 0)) + ' ' +
          (zero.length ? t('stem.heatlab.desc_house_zero', 'No heating is needed in {list}.').replace('{list}', zero.join(', ')) : '') + ' ' +
          t('stem.heatlab.desc_house_solar', 'Sunshine through the windows covers {s} kWh of the {l} kWh lost.').replace('{s}', fmt(m.usableKWh, 0)).replace('{l}', fmt(m.lossKWh, 0));
      }
      function hsPills(group, list, cur, names, onPick, extra) {
        return h('div', { role: 'group', 'aria-label': group, className: 'flex flex-wrap gap-1' },
          list.map(function (id) {
            return pill(cur === id, '#84cc16', names[id] + (extra ? extra(id) : ''), function () { onPick(id); });
          }));
      }
      function hsChip(ok, text, key) {
        return h('li', { key: key, 'data-ok': ok ? 'true' : 'false', className: 'rounded-full border px-2 py-0.5',
          style: { color: isContrast ? '#ffffff' : ok ? ink('#16a34a') : (isDark ? '#fca5a5' : '#b91c1c'), borderColor: isContrast ? '#ffffff' : ok ? 'rgba(22,163,74,0.5)' : 'rgba(239,68,68,0.5)' } },
          (ok ? '✓ ' : '✗ ') + text);
      }

      // ══ Stage D (P5-3): teacher panel, presets and locks ══
      var htTeach = d.teacher && typeof d.teacher === 'object' ? d.teacher : {};
      var htHidden = (Array.isArray(htTeach.hidden) ? htTeach.hidden : []).filter(function (x) { return typeof x === 'string'; });
      var htLocked = (Array.isArray(htTeach.locked) ? htTeach.locked : []).filter(function (x) { return typeof x === 'string'; });
      function teacherSet(patch) { upd({ teacher: Object.assign({}, htTeach, patch) }); }
      function htEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
      // Cross-links into other tools (Weld Lab, Kitchen Lab, Water Cycle),
      // shown only when the host can load them; sec() appends them.
      function htCrossLinks(id) {
        var WELD = t('stem.heatlab.xl_weld_name', 'Weld Lab'), KITCHEN = t('stem.heatlab.xl_kitchen_name', 'Kitchen Lab'), WATER = t('stem.heatlab.watercycle_name', 'Water Cycle');
        var list = id === 'conduction' ? [crossLink('weldLab', WELD, '⚒️', t('stem.heatlab.xl_weld_conduction', 'See conduction carry heat away from a weld bead in Weld Lab'))]
          : id === 'expansion' ? [crossLink('weldLab', WELD, '⚒️', t('stem.heatlab.xl_weld_expansion', 'See expansion and shrinkage pull a weld out of shape in Weld Lab'))]
            : id === 'mixing' ? [crossLink('kitchenLab', KITCHEN, '🍳', t('stem.heatlab.xl_kitchen_mixing', 'Put specific heat to work in real cooking in Kitchen Lab'))]
              : id === 'heatingcurve' ? [crossLink('kitchenLab', KITCHEN, '🍳', t('stem.heatlab.xl_kitchen_boil', 'See why a boiling pot holds at 100 °C in Kitchen Lab')),
                crossLink('waterCycle', WATER, '💧', t('stem.heatlab.xl_water_curve', 'Follow the same melting, evaporation and condensation through the Water Cycle tool'))]
                : [];
        list = list.filter(Boolean);
        return list.length ? h('div', { className: 'flex flex-wrap gap-1.5', 'data-ht-crosslinks': id }, list.map(function (b, i) { return React.cloneElement(b, { key: i }); })) : null;
      }
      // Cross-links into other tools, shown only when the host can load them.
      function crossLink(id, name, icon, text) {
        if (!toolReachable(id)) return null;
        return h('button', {
          type: 'button', 'data-ht-crosslink': id, onClick: function () { openTool(id, name); },
          className: 'mt-2 min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold text-left', style: neutralBtnStyle(false)
        }, icon + ' ' + text);
      }

      var MODES = [
        { id: 'conduction', label: t('stem.heatlab.mech_conduction', 'Conduction'), why: t('stem.heatlab.particles_jostle_their_neighbours_needs', 'Particles jostle their neighbours. Needs direct contact, works best in solids.') },
        { id: 'convection', label: t('stem.heatlab.mech_convection', 'Convection'), why: t('stem.heatlab.the_fluid_itself_moves_and_carries', 'The fluid itself moves and carries its heat along with it.') },
        { id: 'radiation', label: t('stem.heatlab.kind_radiation', 'Radiation'), why: t('stem.heatlab.infrared_light_the_only_one_that', 'Infrared light. The only one that crosses a vacuum.') }
      ];
      var activeMode = MODES.filter(function (m) { return m.id === mode; })[0] || MODES[0];

      // ── topic index ──
      // Order here MUST match DOM order — the heading numbers are read off it.
      var HT_GROUPS = [
        { id: 'all', label: t('stem.heatlab.nb_all', 'All') },
        { id: 'transfer', label: t('stem.heatlab.preset_transfer', 'How heat moves') },
        { id: 'energy', label: t('stem.heatlab.energy_temperature', 'Energy & temperature') },
        { id: 'engines', label: t('stem.heatlab.engines_entropy', 'Engines & entropy') },
        { id: 'practice', label: t('stem.heatlab.practice', 'Practice') }
      ];
      var HT_SECTIONS = [
        { id: 'conduction', grp: 'transfer', icon: '🔥', label: t('stem.heatlab.three_ways_heat_moves', 'Three ways heat moves'), kw: 'conduction convection radiation mechanism transfer race bar thermometer probe graph energy ledger diffusivity' },
        { id: 'insulation', grp: 'transfer', icon: '🧣', label: t('stem.heatlab.insulation', 'Insulation'), kw: 'mug keep hot foam wool material conductivity lag cooling' },
        { id: 'wall', grp: 'transfer', icon: '🧱', label: t('stem.heatlab.build_a_wall', 'Build a wall'), kw: 'r-value resistance layers brick cavity plaster u-value adds up' },
        { id: 'range', grp: 'transfer', icon: '📊', label: t('stem.heatlab.conductivity_range', 'Conductivity range'), kw: 'orders of magnitude diamond copper air scale log bigger than it looks' },
        { id: 'touch', grp: 'transfer', icon: '🖐️', label: t('stem.heatlab.topic_touch', 'Touch test & thermal camera'), kw: 'touch feel cold metal wood effusivity contact temperature thermal camera infrared ir imaging' },
        { id: 'mixing', grp: 'energy', icon: '⚖️', label: t('stem.heatlab.mix_two_things', 'Mix two things'), kw: 'final temperature calorimetry specific heat capacity equilibrium hot cold particles zoom' },
        { id: 'equilibrium', grp: 'energy', icon: '🤝', label: t('stem.heatlab.topic_equilibrium', 'Two blocks reach equilibrium'), kw: 'closed system equilibrium contact conductance time entropy ledger leak room second law' },
        { id: 'heatingcurve', grp: 'energy', icon: '♨️', label: t('stem.heatlab.the_heating_curve', 'The heating curve'), kw: 'latent heat fusion vaporisation plateau melting boiling phase change' },
        { id: 'engines', grp: 'engines', icon: '⚙️', label: t('stem.heatlab.why_no_engine_reaches_100', 'Why no engine reaches 100%'), kw: 'carnot efficiency limit petrol diesel turbine hot cold reservoir' },
        { id: 'convection3d', grp: 'transfer', icon: '🧊', label: t('stem.heatlab.convection_in_3d', 'Convection in 3D'), kw: 'three dimensional rolling cell plume buoyancy turn it over simulation' },
        { id: 'radiation', grp: 'transfer', icon: '📡', label: t('stem.heatlab.radiation_the_fourth_power', 'Radiation & the fourth power'), kw: 'stefan boltzmann t4 emissivity infrared black body vacuum sun' },
        { id: 'expansion', grp: 'energy', icon: '📏', label: t('stem.heatlab.kind_expansion', 'Thermal expansion'), kw: 'bridges gaps rails coefficient linear expand contract buckle' },
        { id: 'spot', grp: 'practice', icon: '🌍', label: t('stem.heatlab.spot_the_mechanism', 'Spot the mechanism'), kw: 'quiz practice identify scenario which one test yourself' },
        { id: 'entropy', grp: 'engines', icon: '🎲', label: t('stem.heatlab.entropy', 'Entropy'), kw: 'second law disorder one way arrow of time irreversible microstates' },
        { id: 'heatpumps', grp: 'engines', icon: '🔄', label: t('stem.heatlab.heat_pumps', 'Heat pumps'), kw: 'cop coefficient of performance reverse fridge air source ground heating' },
        { id: 'notebook', grp: 'practice', icon: '📓', label: t('stem.heatlab.topic_notebook', 'Lab notebook'), kw: 'notebook log trials record data table csv export graph plot investigation' },
        { id: 'investigate', grp: 'practice', icon: '🔬', label: t('stem.heatlab.topic_investigate', 'Investigations: claim, evidence, reasoning'), kw: 'cer claim evidence reasoning investigation argue question variables fair test rubric mass material cosy layers cold hot' },
        { id: 'cooler', grp: 'practice', icon: '❄️', label: t('stem.heatlab.topic_cooler', 'Design challenge: keep it frozen'), kw: 'cooler cool box ice melt design challenge engineering budget cost trade-off insulation seal foil' },
        { id: 'house', grp: 'practice', icon: '🏠', label: t('stem.heatlab.topic_house', 'Design challenge: a passive house'), kw: 'passive house home design heating demand u-value window roof floor ventilation heat recovery climate degree days budget carbon heat pump' }
      ];
      var htQuery = (d.htQuery || '').trim().toLowerCase();
      var htGroup = d.htGroup || 'all';
      function htMatches(s) {
        if (!isTeacher && htHidden.indexOf(s.id) !== -1) return false;
        if (htGroup !== 'all' && s.grp !== htGroup) return false;
        if (!htQuery) return true;
        return (s.id + ' ' + s.label + ' ' + s.kw).toLowerCase().indexOf(htQuery) !== -1;
      }
      var htVisible = HT_SECTIONS.filter(htMatches);
      // One topic at a time (engagement pass 2026-11-04). Every section stays
      // in the DOM in its registry order; all but the current one carry the
      // hidden attribute. toolData._heatLab.htTopic = section id,
      // htAll = true shows every topic on one long page (the old layout).
      var htNavList = HT_SECTIONS.filter(function (s) { return isTeacher || htHidden.indexOf(s.id) === -1; });
      if (!htNavList.length) htNavList = HT_SECTIONS.slice(0, 1);
      var htAll = d.htAll === true;
      var htCurrentSec = htNavList.filter(function (s) { return s.id === d.htTopic; })[0] || htNavList[0];
      var htCurrent = htCurrentSec.id;
      function htSecShown(id) { return htAll || id === 'next' || id === htCurrent; }
      var htSoundTopicRef = React.useRef(htCurrent);
      React.useEffect(function () {
        var left = !htAll && htSoundTopicRef.current !== htCurrent;
        htSoundTopicRef.current = htCurrent;
        if (left && playRef.current) stopSound();
        if (tickOn && (mode !== 'conduction' || (!htAll && htCurrent !== 'conduction'))) {
          setTickOn(false);
          if (typeof announceToSR === 'function') announceToSR(t('stem.heatlab.tick_off', 'Ticking thermometer off.'));
        }
      }, [htAll, htCurrent, mode, tickOn]);
      function htFocusSection(id) {
        var target = typeof document !== 'undefined' && document.getElementById('htsec-' + id);
        if (!target) return;
        var rm = heatPrefersReducedMotion();
        if (typeof target.scrollIntoView === 'function') {
          try { target.scrollIntoView({ behavior: rm ? 'auto' : 'smooth', block: 'start' }); }
          catch (e) { try { target.scrollIntoView(); } catch (e2) {} }
        }
        try { target.focus({ preventScroll: true }); }
        catch (focusErr) { try { target.focus(); } catch (f2) {} }
      }
      function htGoTo(s) {
        setHtMenu('');
        if (htNavList.indexOf(s) === -1) {
          if (typeof announceToSR === 'function') announceToSR(t('stem.heatlab.jump_hidden', 'Your teacher has hidden that topic for now.'));
          return;
        }
        if (htAll || s.id === htCurrent) htFocusSection(s.id);
        else {
          // Focus after the switch has rendered (see the effect below).
          pendingFocusRef.current = s.id;
          upd({ htTopic: s.id });
        }
        if (typeof announceToSR === 'function') announceToSR(htFmt(t('stem.heatlab.jumped_to', 'Jumped to {0}.'), [s.label]));
      }
      function htToggleMenu(which) {
        setHtMenu(htMenu === which ? '' : which);
      }
      function htCloseMenu(focusBack) {
        var which = htMenu;
        setHtMenu('');
        var btn = which === 'settings' ? settingsBtnRef.current : which === 'topics' ? topicsBtnRef.current : null;
        if (focusBack && btn && typeof btn.focus === 'function') { try { btn.focus(); } catch (e) {} }
      }
      // Previous / next topic, at the foot of the topic on show.
      function htPager(id) {
        if (htAll || id === 'next') return null;
        var idx = -1;
        htNavList.forEach(function (s, k) { if (s.id === id) idx = k; });
        if (idx === -1) return null;
        var prev = htNavList[idx - 1], next = htNavList[idx + 1];
        var num = function (s) { return HT_SECTIONS.indexOf(s) + 1; };
        return h('div', { key: 'ht-pager', 'data-ht-pager': id, className: 'mt-3 flex flex-wrap justify-between gap-2' },
          prev ? h('button', {
            type: 'button', onClick: function () { htGoTo(prev); }, 'data-ht-pager-prev': prev.id,
            'aria-label': t('stem.heatlab.pager_prev_aria', 'Previous topic: {n}. {label}').replace('{n}', String(num(prev))).replace('{label}', function () { return prev.label; }),
            className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold text-left', style: neutralBtnStyle(false)
          }, '← ' + num(prev) + '. ' + prev.label) : h('span', null),
          next ? h('button', {
            type: 'button', onClick: function () { htGoTo(next); }, 'data-ht-pager-next': next.id,
            'aria-label': t('stem.heatlab.pager_next_aria', 'Next topic: {n}. {label}').replace('{n}', String(num(next))).replace('{label}', function () { return next.label; }),
            className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-black text-right', style: neutralBtnStyle(false)
          }, t('stem.heatlab.pager_next', 'Next: {n}. {label}').replace('{n}', String(num(next))).replace('{label}', function () { return next.label; }) + ' →') : null);
      }
      React.useEffect(function () {
        var id = pendingFocusRef.current;
        if (!id || id !== htCurrent) return;
        pendingFocusRef.current = null;
        htFocusSection(id);
      });
      // Topic bar (engagement pass 2026-11-04): a "Topics" menu button and a
      // detail-level popover replace the 400 px always-open index. Both panels
      // stay in the DOM (hidden when closed), so every jump button and level
      // button exists for search, tests and assistive tech once opened. The
      // bar is sticky only on wide, tall screens (see the style rule below).
      var htTopicNum = HT_SECTIONS.indexOf(htCurrentSec) + 1;
      var htMenuBtnStyle = function (on) { return Object.assign({}, neutralBtnStyle(on), { whiteSpace: 'nowrap' }); };
      var htIndex = h('nav', {
        'aria-label': t('stem.heatlab.heat_lab_topics','Heat lab topics'),
        'data-ht-topicbar': 'true',
        className: 'rounded-xl border px-2.5 py-1.5 mt-1',
        onKeyDown: function (e) {
          if (e.key === 'Escape' && htMenu) { e.preventDefault(); htCloseMenu(true); }
        },
        style: {
          zIndex: 30,
          borderColor: 'rgba(251,146,60,0.4)',
          background: isDark ? 'rgba(15,23,42,0.97)' : 'rgba(255,255,255,0.97)'
        }
      },
        h('div', { className: 'flex flex-wrap items-center gap-2' },
          h('button', {
            type: 'button', ref: topicsBtnRef, 'data-ht-topics-btn': 'true',
            'aria-expanded': htMenu === 'topics' ? 'true' : 'false', 'aria-controls': 'ht-topic-menu',
            onClick: function () { htToggleMenu('topics'); },
            className: 'min-h-11 px-3 py-1.5 rounded-lg text-[0.6875rem] font-black', style: htMenuBtnStyle(htMenu === 'topics')
          }, '🧭 ' + t('stem.heatlab.topics_btn', 'Topics ({n})').replace('{n}', String(htNavList.length)) + (htMenu === 'topics' ? ' ▴' : ' ▾')),
          h('span', { className: 'flex-1 min-w-0 text-[0.6875rem] font-bold truncate', 'data-ht-topic-now': htAll ? 'all' : htCurrent, style: { color: isDark ? '#fdba74' : '#9a3412' } },
            htAll ? t('stem.heatlab.topics_all_on', 'All topics on one page')
              : htCurrentSec.icon + ' ' + htTopicNum + '. ' + htCurrentSec.label),
          h('button', {
            type: 'button', ref: settingsBtnRef, 'data-ht-settings-btn': 'true',
            'aria-expanded': htMenu === 'settings' ? 'true' : 'false', 'aria-controls': 'ht-settings',
            'aria-label': t('stem.heatlab.settings_btn_aria', 'Detail level: {level}. Change it').replace('{level}', function () { return HT_LEVEL_NAMES[htLevel]; }),
            onClick: function () { htToggleMenu('settings'); },
            className: 'min-h-11 px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold', style: htMenuBtnStyle(htMenu === 'settings')
          }, '🎚️ ' + HT_LEVEL_NAMES[htLevel] + (htMenu === 'settings' ? ' ▴' : ' ▾'))
        ),
        // Detail level, in a popover.
        h('div', { id: 'ht-settings', hidden: htMenu === 'settings' ? undefined : true, 'data-ht-settings': 'true' }, levelBar()),
        // The topic menu: search, groups, one button per topic.
        h('div', { id: 'ht-topic-menu', hidden: htMenu === 'topics' ? undefined : true, 'data-ht-topic-menu': 'true',
          className: 'mt-1.5', style: { maxHeight: '60vh', overflowY: 'auto' } },
          h('div', { className: 'flex flex-wrap items-center gap-2' },
            h('label', { htmlFor: 'ht-topic-search', className: 'sr-only' }, t('stem.heatlab.search_topics', 'Search topics')),
            h('input', {
              id: 'ht-topic-search', type: 'search', value: d.htQuery || '',
              placeholder: t('stem.heatlab.search_topics_2', 'Search topics…'),
              'aria-label': htFmt(t('stem.heatlab.search_the_topics_by_name_or', 'Search the {0} topics by name or keyword'), [htNavList.length]),
              onChange: function (e) { upd({ htQuery: e.target.value }); },
              className: 'flex-1 min-w-[8rem] min-h-11 rounded-lg px-2 py-1 text-[0.6875rem]',
              style: {
                background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.95)',
                color: isDark ? '#e2e8f0' : '#1e293b',
                border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)')
              }
            }),
            h('span', { className: 'text-[0.625rem] font-bold', style: { color: isDark ? '#94a3b8' : '#475569' } },
              htVisible.length === HT_SECTIONS.length ? t('stem.heatlab.showing_all', 'showing all') : htFmt(t('stem.heatlab.showing', 'showing {0}'), [htVisible.length]))
          ),
          h('div', { className: 'flex flex-wrap gap-1 mt-1.5' },
            HT_GROUPS.map(function (g) {
              var n = g.id === 'all' ? htNavList.length : htNavList.filter(function (s) { return s.grp === g.id; }).length;
              return pill(htGroup === g.id, '#fb923c', g.label + ' (' + n + ')', function () {
                upd({ htGroup: g.id });
              }, htFmt(t('stem.heatlab.show_topics', 'Show {0}, {1} topics'), [g.label, n]));
            })
          ),
          h('div', { className: 'flex flex-wrap gap-1 mt-1.5' },
            htVisible.length === 0
              ? h('span', { className: 'text-[0.6875rem]', style: { color: isDark ? '#cbd5e1' : '#475569' } },
                  htFmt(t('stem.heatlab.no_topic_matches', 'No topic matches “{0}”.'), [(d.htQuery || '')]))
              : htVisible.map(function (s) {
                  var here = !htAll && s.id === htCurrent;
                  return h('button', {
                    key: s.id, type: 'button',
                    onClick: function () { htGoTo(s); },
                    'aria-label': htFmt(t('stem.heatlab.jump_to', 'Jump to {0}'), [s.label]),
                    'aria-current': here ? 'true' : undefined,
                    className: 'min-h-11 px-2.5 py-1.5 rounded-lg text-[0.6875rem] font-bold transition-colors',
                    style: here ? neutralBtnStyle(true) : {
                      background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(251,146,60,0.09)',
                      color: isDark ? '#e2e8f0' : '#334155',
                      border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.28)' : 'rgba(251,146,60,0.35)')
                    }
                  }, s.icon + ' ' + (HT_SECTIONS.indexOf(s) + 1) + '. ' + s.label);
                })
          ),
          h('button', {
            type: 'button', 'aria-pressed': htAll ? 'true' : 'false', 'data-ht-all-topics': 'true',
            onClick: function () {
              upd({ htAll: !htAll });
              // This button goes away with the menu: focus returns to Topics.
              htCloseMenu(true);
              if (typeof announceToSR === 'function') announceToSR(htAll ? t('stem.heatlab.sr_topics_one', 'Showing one topic at a time.') : t('stem.heatlab.sr_topics_all', 'Showing every topic on one page.'));
            },
            className: 'mt-1.5 min-h-11 px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(htAll)
          }, '📜 ' + t('stem.heatlab.topics_all_btn', 'Show every topic on one page'))
        )
      );

      // ── Stage D: teacher panel (ctx.isTeacherMode only) ──
      // Presets and per-section show/lock live in toolData.teacher as plain
      // id lists; learners never see this panel.
      var HT_PRESETS = [
        ['full', t('stem.heatlab.preset_full', 'Whole lab'), null],
        ['transfer', t('stem.heatlab.preset_transfer', 'How heat moves'), ['conduction', 'insulation', 'wall', 'range', 'touch', 'convection3d', 'radiation', 'spot', 'notebook']],
        ['energy', t('stem.heatlab.preset_energy', 'Energy, temperature and change of state'), ['conduction', 'mixing', 'equilibrium', 'heatingcurve', 'expansion', 'notebook', 'investigate']],
        ['design', t('stem.heatlab.preset_design', 'Engineering design'), ['insulation', 'wall', 'cooler', 'house', 'notebook', 'investigate']],
        ['thermo', t('stem.heatlab.preset_thermo', 'Thermodynamics (high school)'), ['equilibrium', 'heatingcurve', 'engines', 'entropy', 'heatpumps', 'notebook', 'investigate']]
      ];
      var HT_NGSS = [
        ['MS-PS1-4', t('stem.heatlab.ngss_ms_ps1_4', 'Particle motion, temperature and state of a substance when thermal energy is added or removed'), ['heatingcurve', 'expansion', 'mixing']],
        ['MS-PS3-3', t('stem.heatlab.ngss_ms_ps3_3', 'Design, build and test a device that minimises or maximises thermal energy transfer'), ['insulation', 'wall', 'cooler', 'house']],
        ['MS-PS3-4', t('stem.heatlab.ngss_ms_ps3_4', 'Plan an investigation of how the energy transferred relates to the type of matter, its mass and its temperature change'), ['conduction', 'mixing', 'investigate', 'notebook']],
        ['MS-PS3-5', t('stem.heatlab.ngss_ms_ps3_5', 'Argue from evidence that when kinetic energy changes, energy is transferred'), ['mixing', 'equilibrium', 'investigate']],
        ['HS-PS3-1', t('stem.heatlab.ngss_hs_ps3_1', 'Use a computational model to calculate the change in energy of one part of a system'), ['equilibrium', 'mixing', 'house']],
        ['HS-PS3-2', t('stem.heatlab.ngss_hs_ps3_2', 'Model energy at the large scale as particle motion and stored energy'), ['heatingcurve', 'touch', 'radiation']],
        ['HS-PS3-3', t('stem.heatlab.ngss_hs_ps3_3', 'Design and refine a device that converts one form of energy into another'), ['engines', 'heatpumps', 'house']],
        ['HS-PS3-4', t('stem.heatlab.ngss_hs_ps3_4', 'Show that heat flow in a closed system makes the energy distribution more uniform (second law)'), ['equilibrium', 'entropy', 'touch']],
        [t('stem.heatlab.ms_ets1_hs_ets1', 'MS-ETS1 / HS-ETS1'), t('stem.heatlab.ngss_ets1', 'Define criteria and constraints, evaluate competing designs, and optimise'), ['cooler', 'house']]
      ];
      function secNumLabel(id) {
        var i = -1;
        HT_SECTIONS.forEach(function (s, k) { if (s.id === id) i = k; });
        return i === -1 ? id : (i + 1) + '. ' + HT_SECTIONS[i].label;
      }
      function teacherKeyData() {
        if (keyCacheRef.current) return keyCacheRef.current;
        var cooler = null;
        HEAT_COOLER_SHELLS.forEach(function (s) { HEAT_COOLER_LINERS.forEach(function (l) { [10, 20, 25, 30, 40].forEach(function (mm) { HEAT_COOLER_SEALS.forEach(function (se) { [false, true].forEach(function (f) {
          var m = heatCoolerModel({ shell: s.id, liner: l.id, mm: mm, seal: se.id, foil: f });
          if (m.meets && (!cooler || m.cost < cooler.cost)) cooler = m;
        }); }); }); }); });
        var house = null;
        HEAT_HOUSE_WALLS.forEach(function (w) { HEAT_HOUSE_ROOF_MM.forEach(function (r) { HEAT_HOUSE_FLOORS.forEach(function (f) { HEAT_HOUSE_AIR.forEach(function (a) { [false, true].forEach(function (mv) {
          var m = heatHouseModel({ wall: w.id, roofMm: r, floor: f.id, glazing: 'triple', winS: 16, winE: 2, winW: 2, winN: 2, air: a.id, mvhr: mv }, HS.brief.climate);
          if (m.meets && (!house || m.costSum < house.costSum)) house = m;
        }); }); }); }); });
        keyCacheRef.current = { cooler: cooler, house: house };
        return keyCacheRef.current;
      }
      function htCsvDownload(csv, name) {
        var url = null, ok = false;
        try {
          url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
          var link = document.createElement('a');
          link.href = url; link.download = name;
          document.body.appendChild(link); link.click(); link.remove();
          ok = true;
        } catch (e) { ok = false; } finally { if (url) setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e2) {} }, 1000); }
        return ok;
      }
      function misTallyCsv() {
        var tally = d.misTally && typeof d.misTally === 'object' ? d.misTally : {};
        var cards = heatPoeCards(t);
        var rows = [['number', 'id', 'misconception', 'times_chosen', 'cards']].concat(heatMisconceptions(t).map(function (m) {
          var on = cards.filter(function (c) { return c.options.some(function (o) { return o.tag === m.id; }); }).map(function (c) { return c.id; });
          return [m.n, m.id, m.label, Number(tally[m.id]) || 0, on.join(' ')];
        }));
        return rows.map(function (r) { return r.map(heatCsvCell).join(','); }).join('\r\n');
      }
      function teacherMisCsv(copy) {
        var csv = misTallyCsv(), msg;
        if (copy) {
          var api = window.StemLab && typeof window.StemLab.writeClipboard === 'function' ? window.StemLab.writeClipboard : null;
          var done = function (ok) {
            var m = ok ? t('stem.heatlab.teacher_csv_copied', 'Misconception tally copied as CSV.') : t('stem.heatlab.teacher_csv_copy_failed', 'Copy is not available here. Use Download instead.');
            setTeacherMsg(m); if (typeof announceToSR === 'function') announceToSR(m);
          };
          try {
            var p = api ? api(csv) : (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(csv) : Promise.reject(new Error('no clipboard')));
            Promise.resolve(p).then(function () { done(true); }, function () { done(false); });
          } catch (e) { done(false); }
          return;
        }
        msg = htCsvDownload(csv, 'heat-lab-misconception-tally.csv') ? t('stem.heatlab.teacher_csv_done', 'Misconception tally downloaded as CSV.') : t('stem.heatlab.teacher_csv_failed', 'The download was blocked here. Use Copy instead.');
        setTeacherMsg(msg);
        if (typeof announceToSR === 'function') announceToSR(msg);
      }
      // A printable worksheet in a NEW window (Gemini Canvas ignores
      // window.print() on the tool page itself); a download if pop-ups are blocked.
      function worksheetHtml() {
        var shown = HT_SECTIONS.filter(function (s) { return htHidden.indexOf(s.id) === -1; });
        var ids = shown.map(function (s) { return s.id; });
        var cards = heatPoeCards(t).filter(function (c) { return ids.indexOf(c.section) !== -1; });
        var invs = ids.indexOf('investigate') !== -1 ? heatInvestigations(t) : [];
        var words = {};
        ids.forEach(function (id) { (HT_SECTION_WORDS[id] || []).forEach(function (w) { words[w] = true; }); });
        var out = ['<!doctype html><html><head><meta charset="utf-8"><title>' + htEsc(t('stem.heatlab.ws_title', 'Heat Lab worksheet')) + '</title>',
          '<style>body{font:14px/1.5 system-ui,sans-serif;color:#111;max-width:46rem;margin:1.5rem auto;padding:0 1rem}h1{font-size:1.4rem}h2{font-size:1.1rem;margin-top:1.4rem;border-bottom:1px solid #999}li{margin:.3rem 0}.line{border-bottom:1px solid #777;height:1.6rem}@media print{button{display:none}}</style></head><body>',
          '<button type="button" onclick="window.print()">' + htEsc(t('stem.heatlab.ws_print', 'Print this worksheet')) + '</button>',
          '<h1>' + htEsc(t('stem.heatlab.ws_title', 'Heat Lab worksheet')) + '</h1>',
          '<p>' + htEsc(t('stem.heatlab.ws_name', 'Name')) + ': ________________ &nbsp; ' + htEsc(t('stem.heatlab.ws_date', 'Date')) + ': __________</p>',
          '<h2>' + htEsc(t('stem.heatlab.ws_sections', 'Sections to explore')) + '</h2><ol>'];
        shown.forEach(function (s) { out.push('<li><b>' + htEsc(s.label) + '</b>' + (HT_PLAIN[s.id] ? ': ' + htEsc(HT_PLAIN[s.id]) : '') + '</li>'); });
        out.push('</ol><h2>' + htEsc(t('stem.heatlab.ws_words', 'Key words')) + '</h2><ul>');
        Object.keys(words).forEach(function (w) { out.push('<li><b>' + htEsc(HT_VOCAB[w][0]) + '</b>: ' + htEsc(HT_VOCAB[w][1]) + '</li>'); });
        out.push('</ul>');
        if (cards.length) {
          out.push('<h2>' + htEsc(t('stem.heatlab.ws_predict', 'Predict, check, explain')) + '</h2><ol>');
          cards.forEach(function (c) {
            out.push('<li><p>' + htEsc(c.q) + '</p><ol type="A">' + c.options.map(function (o) { return '<li>' + htEsc(o.text) + '</li>'; }).join('') + '</ol>' +
              '<p>' + htEsc(t('stem.heatlab.ws_my_prediction', 'My prediction and why:')) + '</p><div class="line"></div><p>' + htEsc(t('stem.heatlab.ws_what_happened', 'What the model showed, and my explanation:')) + '</p><div class="line"></div><div class="line"></div></li>');
          });
          out.push('</ol>');
        }
        if (invs.length) {
          out.push('<h2>' + htEsc(t('stem.heatlab.ws_investigations', 'Investigations: claim, evidence, reasoning')) + '</h2>');
          invs.forEach(function (x) {
            out.push('<h3>' + htEsc(x.title) + '</h3><p>' + htEsc(x.q) + '</p><p><b>' + htEsc(t('stem.heatlab.ws_claim', 'Claim')) + ':</b> ' + htEsc(x.frames.claim) + '</p><div class="line"></div>' +
              '<p><b>' + htEsc(t('stem.heatlab.ws_evidence', 'Evidence')) + ':</b> ' + htEsc(x.frames.evidence) + '</p><div class="line"></div>' +
              '<p><b>' + htEsc(t('stem.heatlab.ws_reasoning', 'Reasoning')) + ':</b> ' + htEsc(x.frames.reasoning) + '</p><div class="line"></div>');
          });
        }
        if (ids.indexOf('cooler') !== -1) out.push('<h2>' + htEsc(t('stem.heatlab.cooler_title', 'Design challenge: keep it frozen')) + '</h2><p>' + htEsc(coolerBriefText) + '</p><div class="line"></div><div class="line"></div>');
        if (ids.indexOf('house') !== -1) out.push('<h2>' + htEsc(t('stem.heatlab.house_title', 'Design challenge: a passive house')) + '</h2><p>' + htEsc(houseBriefText) + '</p><div class="line"></div><div class="line"></div>');
        out.push('</body></html>');
        return out.join('');
      }
      function openWorksheet() {
        var html = worksheetHtml(), msg;
        var w = null;
        try { w = window.open('', '_blank'); } catch (e) { w = null; }
        if (w && w.document) {
          try { w.document.open(); w.document.write(html); w.document.close(); msg = t('stem.heatlab.ws_opened', 'Worksheet opened in a new tab. Use its Print button.'); }
          catch (e2) { w = null; }
        }
        if (!w) {
          var url = null;
          try {
            url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
            var link = document.createElement('a');
            link.href = url; link.download = 'heat-lab-worksheet.html';
            document.body.appendChild(link); link.click(); link.remove();
            msg = t('stem.heatlab.ws_downloaded', 'Pop-ups are blocked here, so the worksheet was downloaded as a web page. Open it to print.');
          } catch (e3) { msg = t('stem.heatlab.ws_failed', 'This page cannot open or download the worksheet.'); }
          finally { if (url) setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e4) {} }, 1000); }
        }
        setTeacherMsg(msg);
        if (typeof announceToSR === 'function') announceToSR(msg);
      }
      function teacherPanel() {
        if (!isTeacher) return null;
        // Panel, answer key and NGSS map open states persist with the settings.
        var teacherOpen = !!htTeach.open, keyOpen = !!htTeach.keyOpen, ngssOpen = !!htTeach.ngssOpen;
        var toggle = function (k) { var p = {}; p[k] = !htTeach[k]; teacherSet(p); };
        var allIds = HT_SECTIONS.map(function (s) { return s.id; });
        var kd = keyOpen ? teacherKeyData() : null;
        var cards = keyOpen ? heatPoeCards(t) : [];
        var invs = keyOpen ? heatInvestigations(t) : [];
        return h('section', { className: 'rounded-xl border p-3 mt-1', 'data-ht-teacher': 'true', 'aria-labelledby': 'ht-teacher-h', style: panelStyle('#f59e0b') },
          h('h3', { id: 'ht-teacher-h', className: 'text-xs font-black', style: { color: isContrast ? '#fbbf24' : ink('#f59e0b') } }, '👩‍🏫 ' + t('stem.heatlab.teacher_title', 'Teacher panel')),
          h('button', {
            type: 'button', 'aria-expanded': teacherOpen ? 'true' : 'false', 'aria-controls': 'ht-teacher-body',
            onClick: function () { toggle('open'); },
            className: 'mt-1 min-h-11 px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(teacherOpen)
          }, (teacherOpen ? '▾ ' : '▸ ') + t('stem.heatlab.teacher_toggle', 'Lesson set-up, answer key, NGSS and exports')),
          teacherOpen ? h('div', { id: 'ht-teacher-body', className: 'mt-2' },
            h('p', { className: 'text-[0.6875rem] font-bold', style: { color: softInk } }, t('stem.heatlab.teacher_presets', 'Lesson presets')),
            h('div', { role: 'group', 'aria-label': t('stem.heatlab.teacher_presets', 'Lesson presets'), className: 'flex flex-wrap gap-1 mt-1' },
              HT_PRESETS.map(function (p) {
                return h('button', {
                  key: p[0], type: 'button', 'aria-pressed': htTeach.preset === p[0] ? 'true' : 'false', 'data-ht-preset': p[0],
                  onClick: function () { teacherSet({ preset: p[0], hidden: p[2] ? allIds.filter(function (id) { return p[2].indexOf(id) === -1; }) : [], locked: [] }); },
                  className: 'min-h-11 px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(htTeach.preset === p[0])
                }, p[1]);
              })),
            h('fieldset', { className: 'mt-2 rounded-lg border p-2', style: { borderColor: isContrast ? '#ffffff' : 'rgba(245,158,11,0.4)' } },
              h('legend', { className: 'text-[0.6875rem] font-bold px-1', style: { color: bodyInk } }, t('stem.heatlab.teacher_sections', 'Sections for learners')),
              h('ul', { className: 'space-y-1' },
                HT_SECTIONS.map(function (s, i) {
                  var shown = htHidden.indexOf(s.id) === -1, lk = htLocked.indexOf(s.id) !== -1;
                  return h('li', { key: s.id, className: 'flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[0.6875rem]', style: { color: bodyInk } },
                    h('span', { className: 'min-w-0 flex-1 basis-40 font-bold' }, (i + 1) + '. ' + s.label),
                    h('label', { className: 'inline-flex items-center gap-1 min-h-11' },
                      h('input', { type: 'checkbox', checked: shown, 'data-ht-show': s.id, className: 'w-5 h-5',
                        onChange: function () { teacherSet({ preset: 'custom', hidden: shown ? htHidden.concat([s.id]) : htHidden.filter(function (x) { return x !== s.id; }) }); } }),
                      t('stem.heatlab.teacher_show', 'Show')),
                    h('label', { className: 'inline-flex items-center gap-1 min-h-11' },
                      h('input', { type: 'checkbox', checked: lk, 'data-ht-lock': s.id, className: 'w-5 h-5',
                        onChange: function () { teacherSet({ preset: 'custom', locked: lk ? htLocked.filter(function (x) { return x !== s.id; }) : htLocked.concat([s.id]) }); } }),
                      t('stem.heatlab.teacher_lock', 'Lock')));
                }))),
            h('div', { className: 'mt-2 flex flex-wrap gap-1.5' },
              h('button', { type: 'button', 'aria-expanded': keyOpen ? 'true' : 'false', 'aria-controls': 'ht-teacher-key', onClick: function () { toggle('keyOpen'); },
                className: 'min-h-11 px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(keyOpen) }, '🔑 ' + t('stem.heatlab.teacher_key', 'Answer key')),
              h('button', { type: 'button', 'aria-expanded': ngssOpen ? 'true' : 'false', 'aria-controls': 'ht-teacher-ngss', onClick: function () { toggle('ngssOpen'); },
                className: 'min-h-11 px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(ngssOpen) }, '🗺️ ' + t('stem.heatlab.teacher_ngss', 'NGSS map')),
              h('button', { type: 'button', onClick: openWorksheet, 'data-ht-worksheet': 'true',
                className: 'min-h-11 px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(false) }, '🖨️ ' + t('stem.heatlab.teacher_worksheet', 'Printable worksheet')),
              h('button', { type: 'button', onClick: function () { teacherMisCsv(false); }, 'data-ht-mis-csv': 'true',
                className: 'min-h-11 px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(false) }, '⬇️ ' + t('stem.heatlab.teacher_mis_download', 'Misconception tally (CSV)')),
              h('button', { type: 'button', onClick: function () { teacherMisCsv(true); },
                className: 'min-h-11 px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(false) }, '📋 ' + t('stem.heatlab.teacher_mis_copy', 'Copy tally'))),
            h('p', { role: 'status', 'aria-live': 'polite', className: 'text-[0.6875rem] mt-1', style: { color: bodyInk } }, teacherMsg),
            keyOpen ? h('div', { id: 'ht-teacher-key', className: 'mt-2 rounded-lg border p-2', 'data-ht-teacher-key': 'true', style: panelStyle('#f59e0b') },
              h('p', { className: 'text-[0.6875rem] font-black', style: { color: bodyInk } }, t('stem.heatlab.key_poe', 'Predict-check-explain cards')),
              h('ol', { className: 'list-decimal pl-5 space-y-1 text-[0.6875rem] leading-relaxed', style: { color: bodyInk } },
                cards.map(function (c) {
                  var right = c.options.filter(function (o) { return o.id === c.answer; })[0];
                  return h('li', { key: c.id, 'data-ht-key-card': c.id }, h('b', null, c.q + ' '), '→ ' + (right ? right.text : c.answer) + '. ' + c.idea + ' (' + secNumLabel(c.section) + ')');
                })),
              h('p', { className: 'text-[0.6875rem] font-black mt-2', style: { color: bodyInk } }, t('stem.heatlab.key_cer', 'Investigations: the science idea a strong answer reaches')),
              h('ul', { className: 'list-disc pl-5 space-y-1 text-[0.6875rem] leading-relaxed', style: { color: bodyInk } },
                invs.map(function (x) { return h('li', { key: x.id }, h('b', null, x.title + ': '), x.idea); })),
              h('p', { className: 'text-[0.6875rem] font-black mt-2', style: { color: bodyInk } }, t('stem.heatlab.key_designs', 'Design challenges: one passing design each (others exist)')),
              h('ul', { className: 'list-disc pl-5 space-y-1 text-[0.6875rem] leading-relaxed', style: { color: bodyInk } },
                kd.cooler ? h('li', null, t('stem.heatlab.key_cooler', 'Cooler, cheapest found: {d}: {h} h, {cost}.').replace('{d}', clDescribe(kd.cooler.design)).replace('{h}', fmt(kd.cooler.meltH, 1)).replace('{cost}', function () { return clMoney(kd.cooler.cost); })) : null,
                kd.house ? h('li', null, t('stem.heatlab.key_house', 'House, cheapest found with 22 m² of triple glazing: {d}: {k} kWh/m²·yr, {cost}, {co2} kg CO₂e.').replace('{d}', hsDescribe(kd.house.design)).replace('{k}', fmt(kd.house.kwhM2, 0)).replace('{cost}', function () { return hsMoney(kd.house.costSum); }).replace('{co2}', fmt(kd.house.co2Sum, 0))) : null)) : null,
            ngssOpen ? h('div', { id: 'ht-teacher-ngss', className: 'mt-2 overflow-x-auto', 'data-ht-teacher-ngss': 'true', role: 'region', tabIndex: 0, 'aria-label': t('stem.heatlab.teacher_ngss', 'NGSS map') },
              h('table', { className: 'w-full text-[0.6875rem]', style: { borderCollapse: 'collapse', color: bodyInk } },
                h('caption', { className: 'text-left font-black mb-1' }, t('stem.heatlab.ngss_caption', 'Where each performance expectation is practised')),
                h('thead', null, h('tr', null,
                  h('th', { scope: 'col', className: 'text-left pr-2 py-1' }, t('stem.heatlab.ngss_pe', 'Standard')),
                  h('th', { scope: 'col', className: 'text-left pr-2 py-1' }, t('stem.heatlab.ngss_what', 'What learners do')),
                  h('th', { scope: 'col', className: 'text-left py-1' }, t('stem.heatlab.ngss_where', 'Sections')))),
                h('tbody', null, HT_NGSS.map(function (r) {
                  return h('tr', { key: r[0], style: { borderTop: '1px solid ' + (isContrast ? '#ffffff' : 'rgba(100,116,139,0.3)') } },
                    h('th', { scope: 'row', className: 'text-left pr-2 py-1 font-mono whitespace-nowrap' }, r[0]),
                    h('td', { className: 'pr-2 py-1' }, r[1]),
                    h('td', { className: 'py-1' }, r[2].map(secNumLabel).join('; ')));
                })))) : null) : null);
      }

      return h('div', { 'data-heat-lab': 'true', 'data-ht-hc': isContrast ? 'true' : undefined, className: 'max-w-5xl mx-auto animate-in fade-in duration-200',
        // ★In DARK theme the host wraps every tool in a WHITE card (stem_lab_module.js
        // ~1633), but this tool keeps its dark accents (ink() maps to lightInk only when
        // ctx.theme === 'light') and builds its panels from translucent slate. Over white
        // those composited to a mid-grey #525866 that suits neither palette: 141 nodes at
        // 3.14-4.4:1. The accents were 'originally chosen for the dark lab canvas', as the
        // ink() comment says, so give them that canvas back. Light theme is untouched and
        // already measured clean.
        // High contrast gets a pure black stage plus the scoped [data-ht-hc]
        // rules below: white ink, yellow borders, pressed = yellow on black.
        style: isContrast ? { background: '#000000', color: '#ffffff', borderRadius: 12, padding: 10 } : isDark ? { background: '#0b1120', borderRadius: 12, padding: 10 } : null },
        // The topic bar sticks only where it costs little: wide AND tall
        // screens. Phones and short landscape windows get a static bar.
        h('style', null, '[data-heat-lab] [data-ht-topicbar]{position:static}@media (min-width:640px) and (min-height:501px){[data-heat-lab] [data-ht-topicbar]{position:sticky;top:0}[data-heat-lab] :is(a,button,input,select,textarea,canvas,summary,[tabindex]){scroll-margin-top:72px}}' +
          '[data-ht-hc] section[data-ht-sec],[data-ht-hc] nav{background:#000!important;border:2px solid #fbbf24!important}' +
          '[data-ht-hc] :is(p,span,label,dt,dd,td,th,caption,legend,output,b,div):not([data-ht-keep]){color:#fff!important}[data-ht-hc] h4{color:#fbbf24!important}' +
          '[data-ht-hc] button{background:#000!important;color:#fff!important;border:2px solid #fbbf24!important}' +
          '[data-ht-hc] button[aria-pressed=true],[data-ht-hc] [aria-current=step]{background:#fbbf24!important;color:#000!important}' +
          '[data-ht-hc] button[aria-pressed=true] :is(span,b),[data-ht-hc] [aria-current=step] :is(span,b){color:#000!important}' +
          '[data-ht-hc] input,[data-ht-hc] textarea{background:#000!important;color:#fff!important;border:2px solid #fff!important}' +
          '[data-ht-hc] :focus-visible{outline:3px solid #00ffff!important;outline-offset:2px}'),

        // ── header ──
        h('div', { className: 'relative overflow-hidden rounded-xl border mb-1 px-3 py-2.5', style: { background: 'linear-gradient(115deg, #2a0f04 0%, #451a03 46%, #0c1a2e 100%)', borderColor: 'rgba(251,146,60,0.4)' } },
          h('div', { className: 'flex flex-wrap items-center gap-3' },
            ArrowLeft ? h('button', {
              onClick: function () { if (typeof setStemLabTool === 'function') setStemLabTool(null); },
              className: 'p-1.5 rounded-lg transition-colors',
              style: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(226,232,240,0.18)' },
              'aria-label': t('stem.common.back_to_tools', 'Back to tools')
            }, h(ArrowLeft, { size: 18, className: 'text-slate-100' })) : null,
            h('div', null,
              h('h3', { className: 'text-lg font-black tracking-tight text-white' }, t('stem.heatlab.heat_thermodynamics_lab', '🌡️ Heat & Thermodynamics Lab')),
              h('span', { className: 'text-xs', style: { color: 'rgba(253,186,116,0.9)' } }, t('stem.heatlab.why_heat_moves_where_it_goes', 'Why heat moves, where it goes, and why you never get all of it back'))
            )
          )
        ),

        teacherPanel(),
        htIndex,

        // ── 1. heat transfer ──
        sec('conduction', '#f97316',
          heading('#fb923c', '🔥 1. ' + t('stem.heatlab.the_three_ways_heat_moves', 'The three ways heat moves')),
          h('div', { role: 'group', 'aria-label': t('stem.heatlab.heat_transfer_mechanism','Heat transfer mechanism'), className: 'flex flex-wrap gap-1.5 mb-2' },
            MODES.map(function (m) {
              return pill(mode === m.id, '#fb923c', m.label, function () {
                upd({ mode: m.id });
                // The mode on screen when the learner switches has been running
                // in front of them, so it counts as seen too. Only pushing the
                // clicked mode meant the starting mode never counted unless it
                // was re-clicked.
                pushAll('modesSeen', mode === m.id ? [m.id] : [mode, m.id]);
                if (typeof beep === 'function') beep();
                if (typeof announceToSR === 'function') announceToSR(m.label + '. ' + m.why);
              }, htFmt(t('stem.heatlab.show', 'Show {0}'), [m.label]));
            })
          ),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } }, activeMode.why),
          mode !== 'radiation' ? irControls('bar', mode === 'conduction' ? HEAT_COLD_C : null, mode === 'conduction' ? hotEnd : null) : null,
          mode === 'conduction' && irOn ? h('div', { className: 'mb-2', 'data-ht-ir-cross': 'bar' },
            slider('heat-ir-cross-bar', t('stem.heatlab.ir_crosshair', 'Camera crosshair'), 0, 20, 0.5, irCrossCm,
              function (e) { upd({ irCrossCm: parseFloat(e.target.value) }); },
              t('stem.heatlab.ir_cross_cm', '{cm} cm from the hot end').replace('{cm}', fmt(irCrossCm, 1))),
            h('p', { className: 'text-[0.6875rem] mt-1 font-bold', style: { color: bodyInk } },
              t('stem.heatlab.ir_cross_bar_read', 'Crosshair {cm} cm along the top bar reads {t} °C. Tap the bar to aim it.')
                .replace('{cm}', fmt(irCrossCm, 1)).replace('{t}', fmt(typeof live.cross === 'number' && isFinite(live.cross) ? live.cross : HEAT_COLD_C, 1)))
          ) : null,

          // First minute: guess, then race (engagement pass 2026-11-04).
          firstRaceCard(),

          // 220px left the single bar floating in a third of a black field. The
          // extra height goes to the colour key, the end labels and the two-cell
          // convection tank, none of which fitted before.
          // The stage (canvas + its fullscreen button) is one element so the helper
          // fills the screen with a usable unit. In fullscreen the fixed 260px becomes
          // a flex height, which is what makes the picture actually bigger — the
          // ResizeObserver on the canvas repaints it at the new size.
          h('div', { ref: heatStageRef, 'data-allo-fs-stage': 'true', className: 'relative rounded-lg overflow-hidden border',
            style: heatFs
              ? { borderColor: 'rgba(251,146,60,0.35)', height: '100%', display: 'flex', flexDirection: 'column', padding: 12, boxSizing: 'border-box' }
              : { borderColor: 'rgba(251,146,60,0.35)', height: '260px' } },
            h('button', {
              type: 'button',
              onClick: function () { if (typeof window.__alloStemFS === 'function') window.__alloStemFS(heatStageRef.current); },
              'aria-pressed': heatFs ? 'true' : 'false',
              'aria-label': heatFs
                ? t('stem.heatLab.exit_fullscreen', 'Exit fullscreen heat visualisation')
                : t('stem.heatLab.enter_fullscreen', 'View the heat visualisation fullscreen'),
              title: heatFs ? t('stem.common.exit_fullscreen', 'Exit fullscreen (Esc)') : t('stem.common.fullscreen', 'Fullscreen'),
              className: 'absolute top-2 right-2 z-20',
              style: { width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(251,146,60,0.55)', color: '#fdba74', fontSize: 16, fontWeight: 700, cursor: 'pointer' }
            }, h('span', { 'aria-hidden': 'true' }, heatFs ? '✕' : '⛶')),
            h('canvas', {
              ref: canvasRef,
              tabIndex: 0,
              role: 'img',
              'aria-describedby': mode === 'conduction' ? 'heat-race-status' : undefined,
              'aria-label': htFmt(t('stem.heatlab.heat_transfer_visualisation_currently', 'Heat transfer visualisation, currently showing {0}. {1}{2}'), [activeMode.label, activeMode.why, (mode === 'conduction' ? htFmt(t('stem.heatlab.the_bar_is_heated_to_degrees', ' The bar is {0}, heated to {1} degrees Celsius at the left end. Use arrow keys to change the hot end temperature.{2}'), [material.name, hotEnd, (probes.length ? ' ' + t('stem.heatlab.canvas_probe_aria', 'Thermometers: {list}. Drag them along the bar, or move them with the position sliders below.').replace('{list}', probeSummary) : '')]) : '')]),
              onKeyDown: function (e) {
                if (mode !== 'conduction') return;
                var step = 0;
                if (e.key === 'ArrowUp' || e.key === 'ArrowRight') step = 10;
                else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') step = -10;
                else return;
                e.preventDefault();
                var next = clamp(hotEnd + step, HEAT_HOT_MIN, HEAT_HOT_MAX);
                upd({ hotEnd: next });
                if (typeof announceToSR === 'function') announceToSR(htFmt(t('stem.heatlab.hot_end_degrees_celsius', 'Hot end {0} degrees Celsius.'), [next]));
              },
              // Thermometer dragging. Pointer events cover mouse, pen and touch;
              // the sliders under the bar are the keyboard route to the same thing.
              onPointerDown: function (e) {
                if (mode !== 'conduction') return;
                var el = canvasRef.current;
                if (!el || typeof el._heatProbeHit !== 'function') return;
                var idx = el._heatProbeHit(e.clientX, e.clientY);
                // With the camera on, a tap off the thermometers aims the crosshair.
                if (idx < 0 && irOn && typeof el._heatProbeCmAt === 'function') { upd({ irCrossCm: el._heatProbeCmAt(e.clientX) }); return; }
                if (idx < 0) return;
                probeDragRef.current = { idx: idx };
                try { el.setPointerCapture(e.pointerId); } catch (err) {}
                e.preventDefault();
              },
              onFocus: function () { setCanvasFocus(true); },
              onBlur: function () { setCanvasFocus(false); },
              onPointerMove: function (e) {
                var dr = probeDragRef.current;
                var el = canvasRef.current;
                // A grab cursor over a thermometer says "this moves".
                if (!dr && el && mode === 'conduction' && typeof el._heatProbeHit === 'function') {
                  var over = el._heatProbeHit(e.clientX, e.clientY) >= 0 ? 'grab' : '';
                  if (el.style.cursor !== over) el.style.cursor = over;
                }
                if (!dr || !el || typeof el._heatProbeCmAt !== 'function') return;
                var cm = el._heatProbeCmAt(e.clientX);
                if (probes[dr.idx] && probes[dr.idx].cm !== cm) setProbe(dr.idx, { cm: cm });
              },
              onPointerUp: function () {
                var dr = probeDragRef.current;
                if (!dr) return;
                probeDragRef.current = null;
                if (probes[dr.idx] && typeof announceToSR === 'function') {
                  announceToSR(__alloOneWord(t('stem.heatlab.sr_probe_moved', 'Thermometer P{n} at {cm} centimetres from the hot end.')
                    .replace('{n}', String(dr.idx + 1)).replace('{cm}', String(probes[dr.idx].cm))));
                }
              },
              onPointerCancel: function () { probeDragRef.current = null; },
              style: heatFs
                ? { width: '100%', flex: '1 1 auto', minHeight: 0, display: 'block', touchAction: 'pan-y' }
                : { width: '100%', height: '100%', display: 'block', touchAction: 'pan-y' }
            })
          ),
          // Keyboard hint, shown while the bar has focus (the aria-label says
          // the same to a screen reader).
          mode === 'conduction' && canvasFocus ? h('p', { 'data-ht-key-hint': 'true', className: 'text-[0.6875rem] mt-1.5 font-bold', style: { color: bodyInk } },
            '⌨️ ' + t('stem.heatlab.canvas_key_hint', 'Arrow keys change the hot end. Move the thermometers with their sliders below.')) : null,
          mode === 'conduction' ? h('p', {
            id: 'heat-race-status', role: 'status', 'aria-live': 'polite',
            className: 'text-[0.6875rem] mt-1.5', style: { color: isDark ? '#cbd5e1' : '#475569' }
          }, raceStatus) : null,

          mode === 'conduction' ? h('div', { className: 'mt-2' },
            h('div', { className: 'flex flex-wrap items-center gap-2 mb-2' },
              h('button', {
                type: 'button',
                'aria-pressed': raceOn ? 'true' : 'false',
                'aria-label': raceOn ? t('stem.heatlab.switch_back_to_a_single_bar', 'Switch back to a single bar') : t('stem.heatlab.race_two_materials_side_by_side', 'Race two materials side by side'),
                onClick: function () {
                  upd({ raceOn: !raceOn });
                  var el = canvasRef.current;
                  if (el && el._heatReset) el._heatReset();
                  if (typeof beep === 'function') beep();
                  if (typeof announceToSR === 'function') {
                    announceToSR(raceOn ? t('stem.heatlab.single_bar', 'Single bar.') : htFmt(t('stem.heatlab.racing_against_both_start_at_20', 'Racing {0} against {1}. Both start at 20 degrees; the clock stops when the middle of each bar passes {2} degrees.'), [material.name, materialB.name, HEAT_FINISH_C]));
                  }
                },
                className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-black transition-colors',
                style: raceOn
                  ? { background: '#fb923c', color: '#0b1020', border: '1px solid #fb923c' }
                  : { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') }
              }, raceOn ? t('stem.heatlab.racing_two_bars', '⏱ Racing two bars') : t('stem.heatlab.race_two_materials', '⏱ Race two materials')),
              h('button', {
                type: 'button',
                'aria-label': t('stem.heatlab.restart_the_bars_from_room_temperature','Restart the bars from room temperature'),
                onClick: function () {
                  var el = canvasRef.current;
                  if (el && el._heatReset) el._heatReset();
                  if (typeof beep === 'function') beep();
                  if (typeof announceToSR === 'function') announceToSR(__alloT('stem.heatlab.sr_bars_reset_to_20_degrees', 'Bars reset to 20 degrees.'));
                },
                className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold transition-colors',
                style: { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') }
              }, t('stem.heatlab.restart', '↺ Restart')),
              // Pause / run: auto-moving content needs a stop (WCAG 2.2.2), and a
              // paused race is how a learner reads the thermometers calmly.
              !prefersReducedMotion ? h('button', {
                type: 'button',
                'aria-pressed': racePaused ? 'true' : 'false',
                'aria-label': racePaused ? t('stem.heatlab.resume_race', 'Resume the conduction model') : t('stem.heatlab.pause_race', 'Pause the conduction model'),
                onClick: function () { setRacePaused(!racePaused); if (typeof beep === 'function') beep(); },
                className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold transition-colors',
                style: neutralBtnStyle(racePaused)
              }, racePaused ? '▶ ' + t('stem.heatlab.run', 'Run') : '⏸ ' + t('stem.heatlab.pause', 'Pause')) : null,
              // Manual step: one press = one real second at the chosen speed.
              (prefersReducedMotion || racePaused) ? h('button', {
                type: 'button',
                'aria-label': timeScale === 10
                  ? t('stem.heatlab.advance_the_conduction_model_by_10_simulated', 'Advance the conduction model by 10 simulated seconds')
                  : t('stem.heatlab.advance_conduction_by_n', 'Advance the conduction model by {n} simulated seconds').replace('{n}', fmt(timeScale, timeScale % 1 ? 1 : 0)),
                onClick: function () {
                  var el = canvasRef.current;
                  if (el && el._heatStep) el._heatStep();
                },
                className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold transition-colors',
                style: neutralBtnStyle(false)
              }, t('stem.heatlab.advance_n_s', 'Advance {n} s').replace('{n}', fmt(timeScale, timeScale % 1 ? 1 : 0))) : null,
              h('button', {
                type: 'button',
                'aria-label': t('stem.heatlab.record_trial_aria', 'Record this trial in your lab log'),
                onClick: recordRaceTrial,
                className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold transition-colors',
                style: neutralBtnStyle(false)
              }, '📝 ' + t('stem.heatlab.record_trial', 'Record trial')),
              notebookChip()
            ),
            h('div', { role: 'group', 'aria-label': t('stem.heatlab.sim_speed_group', 'Simulation speed'), className: 'flex flex-wrap items-center gap-1.5 mb-2' },
              h('span', { className: 'text-[0.6875rem] font-bold', style: { color: softInk } }, t('stem.heatlab.sim_speed', 'Speed')),
              // Auto: the slower bar finishes in about 20 s of wall time.
              pill(timeScaleAuto, '#fb923c', t('stem.heatlab.sim_speed_auto', 'Auto'), function () {
                upd({ timeScale: 'auto' });
                if (typeof announceToSR === 'function') announceToSR(t('stem.heatlab.sr_speed_auto', 'Auto speed: the slower bar finishes in about 20 seconds.'));
              }, t('stem.heatlab.sim_speed_auto_aria', 'Auto speed: the slower bar finishes in about 20 seconds')),
              HEAT_TIME_SCALES.map(function (s) {
                return pill(!timeScaleAuto && timeScale === s, '#fb923c', fmt(s, 0) + '×', function () {
                  upd({ timeScale: s });
                  if (typeof announceToSR === 'function') announceToSR(t('stem.heatlab.sr_speed', 'Running at {n} times real time.').replace('{n}', fmt(s, 0)));
                }, t('stem.heatlab.sim_speed_aria', 'Run at {n} times real time').replace('{n}', fmt(s, 0)));
              }),
              h('span', { className: 'text-[0.625rem]', 'data-ht-speed-note': String(timeScale), style: { color: softInk } },
                t('stem.heatlab.sim_speed_note', '1 s here = {t} of real time').replace('{t}', heatTimeLabel(timeScale)))
            ),
            raceOn && !(frStage === 'predict' && frPairRacing) ? h('p', { className: 'text-[0.6875rem] mb-1', style: { color: softInk } },
              material.id === materialB.id
                ? t('stem.heatlab.prediction_identical_materials_should_tie', 'Prediction: identical materials should tie.')
                : htFmt(t('stem.heatlab.prediction_should_reach_the_midpoint_about', 'Prediction: {0} should reach the midpoint about {1}× sooner than {2}. Does the clock agree?'), [racePrediction.fasterName, raceRatioText, racePrediction.slowerName])) : null,
            h('p', { className: 'text-[0.6875rem] font-bold mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, raceOn ? t('stem.heatlab.top_bar_2', 'Top bar') : t('stem.heatlab.bar_material', 'Bar material')),
            h('div', { className: 'flex flex-wrap gap-1' },
              MATERIALS.map(function (m) {
                return pill(matId === m.id, m.colour, m.name, function () {
                  upd({ matId: m.id });
                  pushOnce('materialsTried', m.id);
                  var el = canvasRef.current;
                  if (el && el._heatReset) el._heatReset();
                  if (typeof beep === 'function') beep();
                }, htFmt(t('stem.heatlab.use_a_bar', 'Use a {0} bar'), [m.name]));
              })
            ),
            raceOn ? h('div', { className: 'mt-2' },
              h('p', { className: 'text-[0.6875rem] font-bold mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, t('stem.heatlab.bottom_bar_2', 'Bottom bar')),
              h('div', { className: 'flex flex-wrap gap-1' },
                MATERIALS.map(function (m) {
                  return pill(matBId === m.id, m.colour, m.name, function () {
                    upd({ matBId: m.id });
                    pushOnce('materialsTried', m.id);
                    var el = canvasRef.current;
                    if (el && el._heatReset) el._heatReset();
                    if (typeof beep === 'function') beep();
                  }, htFmt(t('stem.heatlab.race_against_a_bar', 'Race against a {0} bar'), [m.name]));
                })
              )
            ) : null,
            h('p', { className: 'text-[0.6875rem] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              h('b', null, material.name + ': '), material.note),
            // Simple band: the numbers (k, c, diffusivity) and the diffusivity
            // note wait behind "Show the maths"; Standard and up show them.
            maths('race-props',
              h('p', { key: 'props', className: 'text-[0.6875rem] mt-1 font-mono', style: { color: isDark ? '#fdba74' : '#c2410c' } },
                htFmt(t('stem.heatlab.k_w_m_k_c_j', 'k = {0} W/m·K   c = {1} J/kg·K   diffusivity = {2} mm²/s'), [material.k, material.c, (material.k / (material.rho * material.c) * 1e6).toFixed(2)])),
              // Bug 11: the race ranks diffusivity, so say so where the ranking is.
              h('p', { key: 'diff', className: 'text-[0.6875rem] mt-1 leading-relaxed', 'data-ht-diffusivity-note': 'true', style: { color: softInk } },
                t('stem.heatlab.race_measures_diffusivity', 'The race times how fast the middle of the bar warms up. That depends on diffusivity (k ÷ ρc), not on conductivity k alone, so a very light insulator can win the race while still letting very little heat through.'))),
            slider('heat-hot-end', t('stem.heatlab.hot_end', 'Hot end'), HEAT_HOT_MIN, HEAT_HOT_MAX, 5, hotEnd,
              function (e) { upd({ hotEnd: parseFloat(e.target.value) }); }, hotEnd + ' °C'),
            h('p', { className: 'text-[0.625rem] mt-1', 'data-ht-hot-floor': 'true', style: { color: softInk } },
              t('stem.heatlab.hot_end_floor_v3', 'The lowest hot end is 90 °C. The middle of the bar settles halfway between its two ends, so below 80 °C it could never reach the 50 °C finish line.')),

            // ── Thermometers and the temperature-time graph ──
            h('div', { className: 'mt-3 rounded-lg border p-2.5', 'data-ht-probes': 'true', style: panelStyle('#fb923c') },
              h('p', { className: 'text-[0.6875rem] font-black', style: { color: isContrast ? '#fbbf24' : ink('#fb923c') } },
                '🌡️ ' + t('stem.heatlab.probes_title', 'Thermometers on the bar')),
              h('p', { className: 'text-[0.625rem] mt-0.5 leading-relaxed', style: { color: softInk } },
                t('stem.heatlab.probes_help', 'Drag a thermometer along the bar, or move it with its slider. Each one plots its own line on the graph below.')),
              h('div', { role: 'group', 'aria-label': t('stem.heatlab.probes_group', 'Thermometer positions'), className: 'mt-1.5 space-y-1.5' },
                probes.map(function (p, i) {
                  var colour = PROBE_COLOURS[i % PROBE_COLOURS.length];
                  return h('div', { key: 'probe-' + i, className: 'rounded-lg p-1.5', style: { border: '1px solid ' + (isContrast ? '#ffffff' : colour + '66') } },
                    h('div', { className: 'flex flex-wrap items-center gap-2' },
                      h('span', { 'aria-hidden': 'true', style: { display: 'inline-block', width: 14, height: 4, background: colour, borderRadius: 2 } }),
                      h('span', { className: 'text-[0.6875rem] font-black flex-1 min-w-0', style: { color: bodyInk } },
                        'P' + (i + 1) + ' · ' + p.cm + ' cm · ' + probeReading(i).toFixed(1) + ' °C'),
                      raceOn ? h('div', { role: 'group', 'aria-label': t('stem.heatlab.probe_bar_group', 'Which bar P{n} measures').replace('{n}', String(i + 1)), className: 'flex gap-1' },
                        pill(p.bar !== 'b', '#fb923c', t('stem.heatlab.probe_top', 'Top'), function () { setProbe(i, { bar: 'a' }); },
                          t('stem.heatlab.probe_top_aria', 'Put P{n} on the top bar').replace('{n}', String(i + 1))),
                        pill(p.bar === 'b', '#fb923c', t('stem.heatlab.probe_bottom', 'Bottom'), function () { setProbe(i, { bar: 'b' }); },
                          t('stem.heatlab.probe_bottom_aria', 'Put P{n} on the bottom bar').replace('{n}', String(i + 1)))
                      ) : null,
                      h('button', {
                        type: 'button',
                        'aria-label': t('stem.heatlab.probe_remove', 'Remove thermometer P{n}').replace('{n}', String(i + 1)),
                        onClick: function () { setProbes(probes.filter(function (_, j) { return j !== i; })); },
                        className: 'min-h-11 px-2 rounded-lg text-[0.6875rem] font-black',
                        style: Object.assign({ minWidth: 44 }, neutralBtnStyle(false))
                      }, '✕')
                    ),
                    slider('heat-probe-' + i, t('stem.heatlab.probe_position', 'P{n} position').replace('{n}', String(i + 1)), 1, 19, 1, p.cm,
                      function (e) { setProbe(i, { cm: parseFloat(e.target.value) }); },
                      t('stem.heatlab.probe_cm_from_hot', '{cm} cm from the hot end').replace('{cm}', String(p.cm)))
                  );
                })
              ),
              probes.length < HEAT_PROBE_MAX ? h('button', {
                type: 'button',
                onClick: function () {
                  var used = probes.map(function (p) { return p.cm; });
                  var spot = [10, 5, 15, 3, 17, 8, 12].filter(function (cm) { return used.indexOf(cm) === -1; })[0] || 10;
                  setProbes(probes.concat([{ cm: spot, bar: 'a' }]));
                },
                className: 'mt-1.5 min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold',
                style: neutralBtnStyle(false)
              }, '+ ' + t('stem.heatlab.probe_add', 'Add a thermometer')) : null,
              h('div', { className: 'mt-2 rounded-lg overflow-hidden border', style: { borderColor: isContrast ? '#ffffff' : 'rgba(251,146,60,0.35)', height: '200px' } },
                h('canvas', {
                  ref: probeChartRef, role: 'img',
                  'aria-describedby': 'ht-probe-chart-description',
                  'aria-label': t('stem.heatlab.probe_chart_aria', 'Temperature against time for each thermometer. At {time} of simulated time: {list}.')
                    .replace('{time}', heatTimeLabel(live.clock)).replace('{list}', probes.length ? probeSummary : t('stem.heatlab.no_probes', 'no thermometers placed')),
                  style: { width: '100%', height: '100%', display: 'block' }
                })),
              h('p', { id: 'ht-probe-chart-description', className: 'text-[0.625rem] mt-1 leading-relaxed', style: { color: softInk } },
                t('stem.heatlab.probe_chart_desc', 'Each line is one thermometer. Points near the hot end shoot up first; points further along lag behind and rise more slowly. The dashed line is the 50 °C finish, timed at the middle of the bar.')),
              accessRow('race', {
                series: function () {
                  var el = canvasRef.current;
                  return el && typeof el._heatProbeSeries === 'function' ? el._heatProbeSeries() : [];
                },
                sound: { yMin: HEAT_COLD_C, yMax: hotEnd },
                describe: describeRace
              }),
              h('div', { className: 'mt-1.5 flex flex-wrap gap-1.5' }, tickButton())
            ),

            // ── Particle zoom lens on a thermometer or the bar's middle ──
            lensToggle('race'),
            lensPanel('race', {
              pops: [{ key: 'bar', label: raceLensMat.name, tempC: raceLensT, M: particleM(raceLensMat.id), phase: raceLensPhase, colour: lensColour(raceLensMat.colour, 0), region: 'all', share: 1 }],
              ariaLabel: t('stem.heatlab.lens_race_aria', 'Particles in the {mat} bar at {T} °C').replace('{mat}', raceLensMat.name.toLowerCase()).replace('{T}', fmt(raceLensT, 0)),
              description: raceLensDesc, live: false, seed: 21
            }, h('div', { role: 'group', 'aria-label': t('stem.heatlab.lens_target_group', 'Where the lens looks'), className: 'mt-1.5 flex flex-wrap gap-1' },
              probes.map(function (p, i) {
                return pill(lensProbe === i, '#a78bfa', 'P' + (i + 1), function () { upd({ lensProbe: i }); },
                  t('stem.heatlab.lens_target_probe', 'Zoom in at thermometer P{n}').replace('{n}', String(i + 1)));
              }).concat([pill(lensProbe === -1, '#a78bfa', t('stem.heatlab.lens_target_mid', 'Middle'), function () { upd({ lensProbe: -1 }); },
                t('stem.heatlab.lens_target_mid_aria', 'Zoom in at the middle of the top bar'))]))),

            // ── Energy ledger: in = stored + out ──
            h('div', { className: 'mt-3 rounded-lg border p-2.5', 'data-ht-ledger': 'true', style: panelStyle('#34d399') },
              h('p', { className: 'text-[0.6875rem] font-black', style: { color: isContrast ? '#fbbf24' : ink('#34d399') } },
                '⚖️ ' + t('stem.heatlab.ledger_title', 'Energy ledger (a bar 1 cm² in cross-section)')),
              h('div', { className: 'mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2' },
                [['a', material, live.a], raceOn ? ['b', materialB, live.b || blankBar] : null].filter(Boolean).map(function (row) {
                  var info = row[2] || blankBar, m = row[1];
                  var residual = info.inJ - info.storedJ - info.outJ;
                  var lines = [
                    [t('stem.heatlab.ledger_flow_in', 'Heat flowing in at the hot end'), fmtW(info.inW)],
                    [t('stem.heatlab.ledger_flow_out', 'Heat flowing out at the cold end'), fmtW(info.outW)],
                    [t('stem.heatlab.ledger_in', 'Energy in so far'), fmtJ(info.inJ)],
                    [t('stem.heatlab.ledger_stored', 'Stored in the bar'), fmtJ(info.storedJ)],
                    [t('stem.heatlab.ledger_out', 'Energy out so far'), fmtJ(info.outJ)]
                  ];
                  return h('div', { key: 'ledger-' + row[0], className: 'rounded-lg p-2', style: { border: '1px solid ' + (isContrast ? '#ffffff' : 'rgba(52,211,153,0.35)') } },
                    h('p', { className: 'text-[0.6875rem] font-black', style: { color: bodyInk } },
                      m.name + (raceOn ? ' · ' + (row[0] === 'a' ? t('stem.heatlab.top_bar', 'top bar') : t('stem.heatlab.bottom_bar', 'bottom bar')) : '')),
                    h('dl', { className: 'mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-0.5 text-[0.6875rem]' },
                      lines.map(function (ln, li) {
                        return [
                          h('dt', { key: 'dt' + li, style: { color: softInk } }, ln[0]),
                          h('dd', { key: 'dd' + li, className: 'font-mono font-bold text-right', style: { color: bodyInk } }, ln[1])
                        ];
                      })
                    ),
                    maths('ledger-' + row[0], h('p', { className: 'text-[0.625rem] mt-1 font-mono break-words', style: { color: softInk } },
                      t('stem.heatlab.ledger_check', 'in = stored + out: {in} = {stored} + {out} (difference {diff} J)')
                        .replace('{in}', fmtJ(info.inJ)).replace('{stored}', fmtJ(info.storedJ)).replace('{out}', fmtJ(info.outJ))
                        .replace('{diff}', Math.abs(residual) < 1e-300 ? '0' : residual.toExponential(1)))),
                    h('p', { className: 'text-[0.625rem] mt-1 leading-relaxed', style: { color: softInk } },
                      t('stem.heatlab.ledger_steady', 'Once steady, storing stops and heat in = heat out = kAΔT ÷ L = {w}.').replace('{w}', fmtW(heatSteadyFlowW(m, hotEnd))))
                  );
                })
              )
            ),

            // ── Conductivity k against diffusivity alpha ──
            h('button', {
              type: 'button',
              'aria-expanded': kAlphaOpen ? 'true' : 'false',
              'aria-controls': 'ht-kalpha-panel',
              onClick: function () { setKAlphaOpen(!kAlphaOpen); },
              className: 'mt-3 min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold',
              style: neutralBtnStyle(false)
            }, (kAlphaOpen ? '▾ ' : '▸ ') + t('stem.heatlab.kalpha_toggle', 'Why can an insulator win the race? Conductivity k against diffusivity α')),
            kAlphaOpen ? (function () {
              var pair = material.id === materialB.id ? [material] : [material, materialB];
              var rows = pair.map(function (m) {
                var reach = heatMidReachTime(m, hotEnd);
                return [m.name, String(m.k), fmt(m.rho * m.c / 1000, 0), (heatDiffusivity(m) * 1e6).toFixed(3),
                  fmtW(heatSteadyFlowW(m, hotEnd)), heatTimeLabel(reach)];
              });
              var verdict = '';
              if (pair.length === 2) {
                var a = pair[0], b = pair[1];
                var warmFast = heatDiffusivity(a) >= heatDiffusivity(b) ? a : b, warmSlow = warmFast === a ? b : a;
                var passMore = a.k >= b.k ? a : b, passLess = passMore === a ? b : a;
                var r1 = heatDiffusivity(warmFast) / heatDiffusivity(warmSlow), r2 = passMore.k / passLess.k;
                verdict = warmFast === passMore
                  ? t('stem.heatlab.kalpha_same', '{a} both warms up faster ({r1}× the diffusivity) and passes more heat once steady ({r2}× the conductivity).')
                    .replace('{a}', warmFast.name).replace('{r1}', fmt(r1, 1)).replace('{r2}', fmt(r2, 1))
                  : t('stem.heatlab.kalpha_split', '{a} warms up {r1}× faster (diffusivity), yet once steady {b} passes {r2}× more heat (conductivity). Racing and insulating are different questions.')
                    .replace('{a}', warmFast.name).replace('{r1}', fmt(r1, 1)).replace('{b}', passMore.name).replace('{r2}', fmt(r2, 1));
              }
              return h('div', { id: 'ht-kalpha-panel', className: 'mt-2 rounded-lg border p-2.5', style: panelStyle('#22d3ee') },
                h('p', { className: 'text-[0.6875rem] leading-relaxed', style: { color: bodyInk } },
                  t('stem.heatlab.kalpha_body', 'Conductivity k says how much heat flows through a material once temperatures have settled. Diffusivity α = k ÷ ρc says how fast a temperature change spreads, because the heat that arrives must also warm the material it passes. Fibreglass is mostly air, so ρc is tiny: a trickle of heat warms it quickly, yet its k is so low that it lets very little heat through.')),
                verdict ? h('p', { className: 'text-[0.6875rem] mt-1.5 font-bold leading-relaxed', style: { color: bodyInk } }, verdict) : null,
                h('div', { className: 'mt-2 overflow-x-auto' },
                  h('table', { className: 'w-full text-[0.6875rem]', style: { borderCollapse: 'collapse' } },
                    h('caption', { className: 'text-left text-[0.625rem] mb-1', style: { color: softInk } },
                      t('stem.heatlab.kalpha_caption', 'With the hot end at {hot} °C, through a 20 cm bar of 1 cm² cross-section').replace('{hot}', String(hotEnd))),
                    h('thead', null, h('tr', null, [
                      t('stem.heatlab.col_material', 'Material'), 'k (W/m·K)', 'ρc (kJ/m³·K)', 'α (mm²/s)',
                      t('stem.heatlab.col_steady_flow', 'Steady heat flow'), t('stem.heatlab.col_mid_time', 'Middle reaches 50 °C')
                    ].map(function (c2) {
                      return h('th', { key: c2, scope: 'col', className: 'text-left py-1 pr-3 font-bold', style: { color: softInk } }, c2);
                    }))),
                    h('tbody', null, rows.map(function (r, ri) {
                      return h('tr', { key: ri }, r.map(function (cell, ci) {
                        return h(ci === 0 ? 'th' : 'td', ci === 0 ? { key: ci, scope: 'row', className: 'text-left py-1 pr-3 font-bold', style: { color: bodyInk } } : { key: ci, className: 'py-1 pr-3 font-mono', style: { color: bodyInk } }, cell);
                      }));
                    }))
                  )
                )
              );
            })() : null
          ) : null,
          poeCard('coldflow'),
          poeCard('insulatorrace')
        ),

        // ── 2. insulation ──
        sec('insulation', '#fbbf24',
          heading('#fbbf24', '🧣 2. ' + t('stem.heatlab.insulation_keep_the_mug_hot', 'Insulation: keep the mug hot')),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            t('stem.heatlab.a_350_ml_mug_of_tea', 'A 350 ml mug of tea at 90 °C in a 20 °C room. Wrap it and see how much you can slow the loss. Getting it above 65 °C after a full hour earns the badge — only a genuine insulator manages that, and thickness alone will not rescue a metal.')),
          h('div', { className: 'flex flex-wrap gap-1 mb-1' },
            MATERIALS.map(function (m) {
              return pill(insMatId === m.id, m.colour, m.name, function () {
                insulationChange(m, thickness);
                if (typeof beep === 'function') beep();
              }, htFmt(t('stem.heatlab.wrap_the_mug_in', 'Wrap the mug in {0}'), [m.name]));
            })
          ),
          slider('heat-thickness', t('stem.heatlab.thickness', 'Thickness'), 1, 60, 1, thickness,
            function (e) { insulationChange(insMat, parseFloat(e.target.value)); }, thickness + ' mm', 'ht-insulation-status'),
          h('p', {
            id: 'ht-insulation-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', className: 'sr-only'
          }, htFmt(t('stem.heatlab.millimetres_after_60_minutes_the_tea', '{0}, {1} millimetres. After 60 minutes the tea is {2} degrees Celsius. {3}'), [insMat.name, thickness, after60.toFixed(1), (after60 >= 65 ? t('stem.heatlab.the_insulation_target_is_met', 'The insulation target is met.') : t('stem.heatlab.the_insulation_target_is_not_yet', 'The insulation target is not yet met.'))])),
          h('div', { className: 'mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2' },
            [[t('stem.heatlab.after_10_min', 'After 10 min'), fmt(curve[10], 1) + ' °C'], [t('stem.heatlab.after_30_min', 'After 30 min'), fmt(curve[30], 1) + ' °C'],
             [t('stem.heatlab.after_60_min', 'After 60 min'), fmt(after60, 1) + ' °C'], [t('stem.heatlab.v_rvalue', 'R-value'), ((thickness / 1000) / insMat.k).toFixed(3) + ' m²·K/W']
            ].map(function (p) {
              return h('div', { key: p[0], className: 'rounded-lg p-2 text-center', style: { background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' } },
                h('p', { className: 'text-[0.625rem] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } }, p[0]),
                h('p', { className: 'text-sm font-black', style: { color: isDark ? '#fbbf24' : '#b45309' } }, p[1]));
            })
          ),
          h('div', { className: 'mt-2 rounded-lg overflow-hidden border', style: { borderColor: 'rgba(251,191,36,0.35)', height: '190px' } },
            h('canvas', {
              ref: coolRef, role: 'img',
              'data-a11y-static': 'true',
              'aria-describedby': 'ht-cooling-curve-description',
              'aria-label': htFmt(t('stem.heatlab.cooling_curve_over_one_hour_with', 'Cooling curve over one hour. With {0} millimetres of {1} the tea falls from 90 degrees to {2} degrees. The dashed lines show copper, the worst choice, and aerogel, the best, at the same thickness.'), [thickness, insMat.name, after60.toFixed(0)]),
              style: { width: '100%', height: '100%', display: 'block' }
            })),
          h('p', { id: 'ht-cooling-curve-description', className: 'text-[0.625rem] mt-1', style: { color: isDark ? '#94a3b8' : '#64748b' } },
            t('stem.heatlab.solid_line_your_choice_dashed_copper', 'Solid line: your choice. Dashed: copper (worst) and aerogel (best) at the same thickness. The curve is steepest at the start, because heat flow is proportional to the temperature gap.')),
          accessRow('mug', { series: function () { return [curve.map(function (v, i) { return [i, v]; })]; }, sound: { yMin: 20, yMax: 90 }, describe: describeMug }),
          dataTable('cooling', htFmt(t('stem.heatlab.tea_temperature_every_ten_minutes_mm', 'Tea temperature every ten minutes, {0} mm of {1}'), [thickness, insMat.name]),
            [t('stem.heatlab.minutes', 'Minutes'), t('stem.heatlab.your_wrap', 'Your wrap'), t('stem.heatlab.copper', 'Copper'), t('stem.heatlab.aerogel', 'Aerogel')],
            [0, 10, 20, 30, 40, 50, 60].map(function (min) {
              return [String(min),
                coolingCurve(insMat, thickness)[min].toFixed(1) + ' °C',
                coolingCurve(MATERIALS[0], thickness)[min].toFixed(1) + ' °C',
                coolingCurve(MATERIALS[MATERIALS.length - 1], thickness)[min].toFixed(1) + ' °C'];
            })),
          h('p', { className: 'text-[0.6875rem] mt-2', style: { color: after60 >= 65 ? ink('#16a34a') : (isDark ? '#cbd5e1' : '#475569') } },
            after60 >= 65
              ? htFmt(t('stem.heatlab.still_c_after_an_hour_in', '✅ Still {0} °C after an hour. In this series-resistance model, doubling the wrap from {1} to {2} mm cuts wall heat flow by about {3}%. It approaches a one-half reduction only when the wrap dominates the surface-film resistance. The model omits the lid, evaporation and thermal bridges.'), [fmt(after60, 1), thickness, (thickness * 2), Math.round(doubledFlowReductionPct)])
              : htFmt(t('stem.heatlab.down_to_c_try_a_material', 'Down to {0} °C. Try a material with a lower k, or more of it.'), [fmt(after60, 1)])),
          recordButton('mug', function () {
            return {
              material: insMat.id, thickness_mm: thickness, k_WmK: insMat.k, R_wrap_m2KW: (thickness / 1000) / insMat.k,
              T10_C: curve[10], T30_C: curve[30], T60_C: after60, tau_min: heatMugTimeConstantS(insMat, thickness) / 60, above65: after60 >= 65
            };
          }),

          // ── Thermal camera and particle lens on the tea ──
          irControls('mug', HEAT_COLD_C, 90),
          (irOn || lensOpen.mug) ? slider('heat-mug-min', t('stem.heatlab.mug_minute', 'Minutes since pouring'), 0, 60, 1, mugMin,
            function (e) { upd({ mugMin: parseFloat(e.target.value) }); },
            t('stem.heatlab.mug_minute_value', '{n} min').replace('{n}', String(mugMin))) : null,
          irOn ? h('div', { className: 'mt-2', 'data-ht-ir-view': 'mug' },
            h('div', { className: 'rounded-lg overflow-hidden border', style: { borderColor: isContrast ? '#ffffff' : 'rgba(251,191,36,0.35)', height: '170px' } },
              h('canvas', {
                ref: mugIrRef, role: 'img', 'aria-describedby': 'ht-mug-ir-read',
                'aria-label': __alloOneWord(t('stem.heatlab.ir_mug_aria', 'Thermal camera view of the mug after {min} minutes: tea {tea} °C, outer surface of the wrap {surf} °C, room 20 °C.')
                  .replace('{min}', String(mugMin)).replace('{tea}', fmt(mugTeaC, 1)).replace('{surf}', fmt(mugSurfC, 1))),
                style: { width: '100%', height: '100%', display: 'block' }
              })),
            slider('heat-mug-cross', t('stem.heatlab.ir_crosshair', 'Camera crosshair'), 0, 100, 1, mugCross,
              function (e) { upd({ irCrossMug: parseFloat(e.target.value) }); },
              t('stem.heatlab.ir_cross_pct', '{p}% across: {zone}, {t} °C').replace('{p}', String(mugCross)).replace('{zone}', mugCrossRead.zone.name).replace('{t}', fmt(mugCrossRead.T, 1))),
            h('p', { id: 'ht-mug-ir-read', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: bodyInk } },
              t('stem.heatlab.ir_mug_read', 'Crosshair on {zone}: {t} °C. The outer surface of the wrap is {surf} °C; a bare copper mug’s surface would be {bare} °C at the same minute. A good wrap looks COOL on camera, because it keeps the heat inside.')
                .replace('{zone}', mugCrossRead.zone.name).replace('{t}', fmt(mugCrossRead.T, 1))
                .replace('{surf}', fmt(mugSurfC, 1)).replace('{bare}', fmt(mugBareSurfC, 1)))
          ) : null,
          lensToggle('mug'),
          lensPanel('mug', {
            pops: [{ key: 'tea', label: t('stem.heatlab.lens_tea', 'Tea (water)'), tempC: mugTeaC, M: HEAT_MOLAR_MASS.water, phase: 'liquid', colour: lensColour('#38bdf8', 0), region: 'all', share: 1 }],
            ariaLabel: t('stem.heatlab.lens_mug_aria', 'Water molecules in the tea at {T} °C').replace('{T}', fmt(mugTeaC, 0)),
            description: mugLensDesc, seed: 33
          }),
          poeCard('scarf')
        ),

        // ── 2b. composite wall ──
        sec('wall', '#84cc16',
          heading('#84cc16', '🧱 3. ' + t('stem.heatlab.build_a_wall_resistances_add_up', 'Build a wall: resistances add up')),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            t('stem.heatlab.a_real_wall_is_layers_in', 'A real wall is layers in series, and their R-values simply add. Tap to add or remove a layer and watch the U-value. New-build regulations here want 0.18 W/m²K or lower.')),
          h('div', { className: 'flex flex-wrap gap-1 mb-2' },
            WALL_LAYERS.map(function (L) {
              var count = wallStack.filter(function (x) { return x === L.id; }).length;
              return h('button', {
                key: L.id, type: 'button', disabled: wallFull, 'aria-disabled': wallFull ? 'true' : 'false',
                'aria-label': htFmt(t('stem.heatlab.add_a_layer_of_r_value', 'Add a layer of {0}, R-value {1}{2}'), [L.name, L.r, (count ? htFmt(t('stem.heatlab.currently_in_the_wall', '. Currently {0} in the wall'), [count]) : '')]),
                onClick: function () {
                  if (wallFull) return;
                  upd({ wallStack: wallStack.concat([L.id]) });
                  pushOnce('wallTried', L.id);
                  if (typeof beep === 'function') beep();
                },
                className: 'min-h-11 px-2.5 py-2 rounded-lg text-[0.6875rem] font-bold transition-colors disabled:cursor-not-allowed',
                style: { background: count ? 'rgba(132,204,22,0.18)' : (isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)'), color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (count ? '#84cc16' : (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)')) }
              }, '+ ' + L.name + (count > 1 ? ' ×' + count : ''));
            })
          ),
          wallFull ? h('p', { className: 'text-[0.6875rem] mb-2 font-bold', 'data-ht-wall-full': 'true', style: { color: bodyInk } },
            __alloOneWord(t('stem.heatlab.wall_full', 'The wall holds at most {n} layers. Remove one to add another.').replace('{n}', String(HEAT_WALL_MAX_LAYERS)))) : null,
          // The wall in section, each band as wide as the resistance it adds.
          // A list of equal-height rows gave a 0.06 sheet of plasterboard the
          // same visual weight as a 2.50 batt of mineral wool, which argues
          // against the one thing this section exists to teach.
          (function () {
            var bands = [{ id: '_in', name: t('stem.heatlab.inside_air_film', 'Inside air film'), r: WALL_FILM_INSIDE, colour: '#38bdf8', film: true }];
            wallStack.forEach(function (id, i) {
              var L = WALL_LAYERS.filter(function (x) { return x.id === id; })[0];
              if (L) bands.push({ id: id + '-' + i, name: L.name, r: L.r, colour: L.r >= 1 ? '#84cc16' : '#a16207' });
            });
            bands.push({ id: '_out', name: t('stem.heatlab.outside_air_film', 'Outside air film'), r: WALL_FILM_OUTSIDE, colour: '#38bdf8', film: true });
            var biggest = bands.reduce(function (a, b) { return b.r > a.r ? b : a; }, bands[0]);
            return h('div', { className: 'mt-1 mb-2' },
              h('div', { className: 'flex items-center justify-between mb-1' },
                h('span', { className: 'text-[0.625rem] font-bold', style: { color: isDark ? '#94a3b8' : '#64748b' } }, t('stem.heatlab.warm_inside', '← warm inside')),
                h('span', { className: 'text-[0.625rem] font-bold', style: { color: isDark ? '#94a3b8' : '#64748b' } }, t('stem.heatlab.cold_outside', 'cold outside →'))),
              h('div', {
                className: 'flex rounded-lg overflow-hidden',
                style: { height: '54px', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') },
                role: 'img',
                'aria-label': htFmt(t('stem.heatlab.the_wall_in_cross_section_each', 'The wall in cross-section. Each band is as wide as the resistance it contributes. {0}. Total R {1}. The widest band is {2}.'), [bands.map(function (b) { return b.name + ', R ' + b.r.toFixed(2); }).join('. '), wallTotalR.toFixed(2), biggest.name])
              },
                bands.map(function (b) {
                  var pct = (b.r / wallTotalR) * 100;
                  // Wide enough to letter? Below about a twelfth of the wall the
                  // name will not fit, and squeezing it in would misrepresent how
                  // little that layer contributes. A middle tier still carries its
                  // R-value, so no band is left completely unexplained.
                  var roomy = pct >= 12;
                  var narrow = !roomy && pct >= 6;
                  return h('div', {
                    key: b.id,
                    className: 'flex flex-col items-center justify-center overflow-hidden',
                    style: {
                      width: pct + '%', minWidth: '3px', height: '100%',
                      // Both fills are translucent, so the card beneath supplies
                      // the theme and one value is correct in either. Written as
                      // a single value rather than `isDark ? X : X`, which reads
                      // like a copy-paste slip.
                      background: b.film
                        ? (isDark ? 'rgba(56,189,248,0.16)' : 'rgba(56,189,248,0.18)')
                        : 'rgba(132,204,22,0.16)',
                      borderRight: '1px solid ' + (isDark ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.3)'),
                      borderTop: b.film ? 'none' : '3px solid ' + b.colour
                    }
                  },
                    roomy ? h('span', { className: 'text-[0.625rem] font-bold text-center px-1', style: { color: isDark ? '#e2e8f0' : '#1e293b' } }, b.name) : null,
                    roomy || narrow ? h('span', { className: 'text-[0.625rem] font-mono', style: { color: isDark ? '#a3e635' : '#365314' } }, 'R ' + b.r.toFixed(2)) : null
                  );
                })
              ),
              h('p', { className: 'text-[0.625rem] mt-1', style: { color: isDark ? '#94a3b8' : '#64748b' } },
                t('stem.heatlab.band_width_share_of_the_total', 'Band width = share of the total resistance. Layers too thin to letter are contributing almost nothing.'))
            );
          })(),

          h('div', { role: 'list', 'aria-label': t('stem.heatlab.wall_layers_from_inside_to_outside','Wall layers from inside to outside'), className: 'space-y-1' },
            wallStack.length === 0
              ? h('p', { className: 'text-[0.6875rem] italic', style: { color: isDark ? '#94a3b8' : '#64748b' } }, t('stem.heatlab.no_layers_yet_even_an_empty', 'No layers yet. Even an empty opening has some resistance from the still air on each face.'))
              : wallStack.map(function (id, i) {
                var L = WALL_LAYERS.filter(function (x) { return x.id === id; })[0];
                if (!L) return null;
                return h('div', { key: i + '-' + id, role: 'listitem', className: 'flex items-center gap-2 rounded-lg px-2.5 py-1.5', style: { background: isDark ? 'rgba(148,163,184,0.09)' : 'rgba(132,204,22,0.08)', border: '1px solid rgba(132,204,22,0.3)' } },
                  h('span', { className: 'flex-1 text-[0.6875rem] font-bold', style: { color: isDark ? '#fff' : '#1e293b' } }, L.name),
                  h('span', { className: 'text-[0.6875rem] font-mono', style: { color: ink('#84cc16') } }, 'R ' + L.r.toFixed(2)),
                  h('button', {
                    type: 'button',
                    'aria-label': htFmt(t('stem.heatlab.remove_this_layer_of', 'Remove this layer of {0}'), [L.name]),
                    onClick: function () {
                      var next = wallStack.slice();
                      next.splice(i, 1);
                      upd({ wallStack: next });
                      if (typeof beep === 'function') beep();
                    },
                    className: 'min-h-11 px-2 rounded text-[0.6875rem] font-black',
                    style: { color: ink('#f43f5e'), background: 'transparent', border: 'none' }
                  }, '✕')
                );
              })
          ),
          h('div', { className: 'mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2' },
            [[t('stem.heatlab.total_r', 'Total R'), wallTotalR.toFixed(2) + ' m²K/W'], [t('stem.heatlab.v_uvalue', 'U-value'), wallU.toFixed(3) + ' W/m²K'], [t('stem.heatlab.loss_100_m_wall', 'Loss, 100 m² wall'), fmt(wallLoss, 0) + ' W']
            ].map(function (p) {
              return h('div', { key: p[0], className: 'rounded-lg p-2 text-center', style: { background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(132,204,22,0.1)', border: '1px solid rgba(132,204,22,0.32)' } },
                h('p', { className: 'text-[0.625rem] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } }, p[0]),
                h('p', { className: 'text-sm font-black', style: { color: isDark ? '#a3e635' : '#4d7c0f' } }, p[1]));
            })
          ),
          h('p', { className: 'text-[0.6875rem] mt-2 leading-relaxed', style: { color: wallU <= wallTarget ? ink('#16a34a') : (isDark ? '#e2e8f0' : '#334155') } },
            wallU <= wallTarget
              ? htFmt(t('stem.heatlab.w_m_k_meets_the_0', '✅ {0} W/m²K meets the 0.18 target. Notice how much of that came from one insulating layer — the brick and plaster contribute almost nothing.'), [wallU.toFixed(3)])
              : htFmt(t('stem.heatlab.at_w_m_k_this_wall', 'At {0} W/m²K this wall is above the 0.18 target. Adding more brick will barely move it. Which layer would you reach for — and how much of it? One 100 mm batt is not enough on its own.'), [wallU.toFixed(3)])),
          maths('wall', h('p', { className: 'text-[0.6875rem] mt-1 font-mono', style: { color: isDark ? '#94a3b8' : '#64748b' } },
            htFmt(t('stem.heatlab.r_total_r_surfaces_r_layers', 'R_total = R_surfaces + ΣR_layers = {0}   U = 1 / R_total'), [wallTotalR.toFixed(2)]))),
          recordButton('wall', function () {
            return {
              layers: wallStack.join('+'), layerCount: wallStack.length,
              thickness_mm: wallStack.reduce(function (s, id) { return s + (HEAT_WALL_MM[id] || 0); }, 0),
              R_total_m2KW: wallTotalR, U_Wm2K: wallU,
              loss_W: wallLoss, outsideSurface_C: wallProf.outsideSurfaceC, meetsTarget: wallU <= wallTarget
            };
          }),
          irControls('wall', WALL_OUT_C, WALL_IN_C),
          irOn ? h('div', { className: 'mt-2', 'data-ht-ir-view': 'wall' },
            h('div', { className: 'rounded-lg overflow-hidden border', style: { borderColor: isContrast ? '#ffffff' : 'rgba(132,204,22,0.35)', height: '150px' } },
              h('canvas', {
                ref: wallIrRef, role: 'img', 'aria-describedby': 'ht-wall-ir-read',
                'aria-label': t('stem.heatlab.ir_wall_aria', 'Thermal camera view through the wall, inside at {in} °C on the left, outside at {out} °C on the right. Inside surface {si} °C, outside surface {so} °C.')
                  .replace('{in}', fmt(WALL_IN_C, 0)).replace('{out}', fmt(WALL_OUT_C, 0))
                  .replace('{si}', fmt(wallProf.insideSurfaceC, 1)).replace('{so}', fmt(wallProf.outsideSurfaceC, 1)),
                style: { width: '100%', height: '100%', display: 'block' }
              })),
            slider('heat-wall-cross', t('stem.heatlab.ir_crosshair', 'Camera crosshair'), 0, 100, 1, wallCross,
              function (e) { upd({ irCrossWall: parseFloat(e.target.value) }); },
              t('stem.heatlab.ir_cross_pct', '{p}% across: {zone}, {t} °C').replace('{p}', String(wallCross)).replace('{zone}', wallCrossRead.zone.name).replace('{t}', fmt(wallCrossRead.T, 1))),
            h('p', { id: 'ht-wall-ir-read', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: bodyInk } },
              t('stem.heatlab.ir_wall_read', 'Crosshair in {zone}: {t} °C. Drawn at true depth, each layer takes a share of the 19-degree drop equal to its share of the resistance.')
                .replace('{zone}', wallCrossRead.zone.name).replace('{t}', fmt(wallCrossRead.T, 1)) +
              (wallBiggestDrop ? ' ' + t('stem.heatlab.ir_wall_biggest', '{name} carries {dT} of those degrees.').replace('{name}', wallBiggestDrop.name).replace('{dT}', fmt(wallBiggestDrop.dT, 1)) : '') + ' ' +
              __alloOneWord(t('stem.heatlab.ir_wall_outside_read', 'From the street, a camera sees the outside surface at {so} °C, {d} degrees above the air: that glow is heat escaping.')
                .replace('{so}', fmt(wallProf.outsideSurfaceC, 1)).replace('{d}', fmt(wallProf.outsideSurfaceC - WALL_OUT_C, 1))))
          ) : null
        ),

        // ── 2c. how far apart are these materials? ──
        sec('range', '#f97316',
          heading('#fb923c', '📊 4. ' + t('stem.heatlab.the_range_is_bigger_than_it', 'The range is bigger than it looks')),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            t('stem.heatlab.conductivity_is_plotted_on_a_logarithmic', 'Conductivity is plotted on a logarithmic scale, because a linear one would squash everything below copper into a single line at the bottom.')),
          // One definition of the scale, shared by the bars and the decade ticks,
          // so a change to the span can never leave the axis lying about the bars.
          (function () {
            var LO = 0.01, HI = 500;
            var span = Math.log10(HI) - Math.log10(LO);
            var fracOf = function (v) { return (Math.log10(v) - Math.log10(LO)) / span; };
            var decadePct = (1 / span) * 100;      // one power of ten, as a width
            var DECADES = [0.01, 0.1, 1, 10, 100];
            // A logarithmic axis with no tick marks is just a row of bars of
            // unexplained length. The caption promised "every bar is one step of
            // ten" and nothing on screen let a reader check that.
            var gridline = isDark ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.3)';
            var trackBase = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)';
            var grid = 'repeating-linear-gradient(to right, ' + gridline + ' 0 1px, transparent 1px ' + decadePct.toFixed(4) + '%)';
            return h('div', null,
              h('div', { role: 'list', 'aria-label': t('stem.heatlab.thermal_conductivity_of_each_material','Thermal conductivity of each material'), className: 'space-y-1' },
                MATERIALS.slice().sort(function (a, b) { return b.k - a.k; }).map(function (m) {
                  var frac = fracOf(m.k);
                  return h('div', {
                    key: m.id, role: 'listitem',
                    'aria-label': htFmt(t('stem.heatlab.watts_per_metre_kelvin', '{0}, {1} watts per metre kelvin'), [m.name, m.k]),
                    className: 'flex items-center gap-2'
                  },
                    h('span', { className: 'text-[0.6875rem] font-bold w-20 flex-shrink-0', style: { color: isDark ? '#e2e8f0' : '#334155' } }, m.name),
                    h('div', { className: 'flex-1 h-3 rounded-full overflow-hidden', 'aria-hidden': 'true', style: { background: grid + ', ' + trackBase } },
                      h('div', { style: { height: '100%', width: Math.max(2, frac * 100).toFixed(1) + '%', background: m.colour, borderRadius: '999px' } })),
                    // The pale swatch colours (aerogel's lavender, fibreglass's
                    // amber) are legible as a BAR on white but not as 11px text.
                    h('span', { className: 'text-[0.6875rem] font-mono w-16 text-right', style: { color: isDark ? ink(m.colour) : '#334155' } }, m.k >= 1 ? m.k : m.k.toFixed(3))
                  );
                })
              ),
              h('div', { className: 'flex items-center gap-2 mt-1', 'aria-hidden': 'true' },
                h('span', { className: 'w-20 flex-shrink-0' }),
                h('div', { className: 'flex-1 relative', style: { height: '14px' } },
                  DECADES.map(function (v) {
                    return h('span', {
                      key: v,
                      className: 'absolute text-[0.625rem] font-bold',
                      style: {
                        left: (fracOf(v) * 100).toFixed(4) + '%',
                        transform: 'translateX(-50%)',
                        whiteSpace: 'nowrap',
                        color: isDark ? '#94a3b8' : '#64748b'
                      }
                    }, v >= 1 ? String(v) : String(v));
                  })
                ),
                h('span', { className: 'w-16 flex-shrink-0 text-[0.625rem] font-bold text-right', style: { color: isDark ? '#94a3b8' : '#64748b' } }, 'W/m·K')
              )
            );
          })(),
          h('p', { className: 'text-[0.6875rem] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            htFmt(t('stem.heatlab.copper_conducts_about_times_better_than', 'Copper conducts about {0} times better than aerogel. Every gridline is one power of ten, so neighbouring bars are further apart than they look.'), [Math.round(MATERIALS[0].k / MATERIALS[MATERIALS.length - 1].k).toLocaleString()]))
        ),

        // ── Touch test under a thermal camera ──
        sec('touch', '#38bdf8',
          heading('#38bdf8', '🖐️ 5. ' + t('stem.heatlab.touch_title', 'Touch test: why metal feels colder')),
          h('p', { id: 'ht-touch-intro', className: 'text-[0.6875rem] mb-2 leading-relaxed', style: { color: softInk } },
            t('stem.heatlab.touch_intro', 'Two blocks have sat on the bench all night. The thermal camera shows them at exactly the bench’s 20 °C. Predict which will feel colder, then touch each with a 33 °C hand.')),
          poeCard('touch'),
          h('div', { className: 'mt-2 flex flex-wrap items-center gap-1.5' },
            h('button', {
              type: 'button', 'aria-pressed': irPalette === 'grey' ? 'true' : 'false',
              onClick: function () { upd({ irGrey: irPalette !== 'grey' }); },
              className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(irPalette === 'grey')
            }, t('stem.heatlab.ir_grey', 'Greyscale palette')),
            irKey(TOUCH_LO, TOUCH_HI)),
          h('div', { className: 'mt-2 rounded-lg overflow-hidden border', style: { borderColor: isContrast ? '#ffffff' : 'rgba(56,189,248,0.35)', height: '180px' } },
            h('canvas', {
              ref: touchIrRef, role: 'img', 'aria-describedby': 'ht-touch-intro',
              'aria-label': t('stem.heatlab.ir_touch_aria', 'Thermal camera view: a {a} block and a {b} block on a bench, both reading 20 °C, the same colour as the bench. {hand}')
                .replace('{a}', touchMatA.name.toLowerCase()).replace('{b}', touchMatB.name.toLowerCase())
                .replace('{hand}', touchSide
                  ? t('stem.heatlab.ir_touch_aria_hand', 'A 33 °C hand touches the {m} block; the skin where it touches reads {tc} °C.')
                    .replace('{m}', (touchSide === 'b' ? touchMatB : touchMatA).name.toLowerCase()).replace('{tc}', fmt((touchSide === 'b' ? touchB : touchA).contactC, 1))
                  : t('stem.heatlab.ir_touch_aria_wait', 'A 33 °C hand waits above them.')),
              style: { width: '100%', height: '100%', display: 'block' }
            })),
          h('div', { className: 'mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2' },
            [['a', touchMatA, touchA, 'touchA'], ['b', touchMatB, touchB, 'touchB']].map(function (row) {
              var side = row[0], m = row[1], key = row[3];
              var sideName = side === 'a' ? t('stem.heatlab.touch_block_a', 'Left block') : t('stem.heatlab.touch_block_b', 'Right block');
              return h('div', { key: side, className: 'rounded-lg border p-2', style: panelStyle('#38bdf8') },
                h('p', { className: 'text-[0.6875rem] font-black', style: { color: bodyInk } }, sideName + ': ' + m.name),
                h('div', { role: 'group', 'aria-label': t('stem.heatlab.touch_pick_group', '{side} material').replace('{side}', sideName), className: 'mt-1 flex flex-wrap gap-1' },
                  MATERIALS.map(function (mm) {
                    return pill(m.id === mm.id, mm.colour, mm.name, function () {
                      var p = {}; p[key] = mm.id;
                      if (touchSide === side) p.touchSide = null;
                      upd(p);
                    }, t('stem.heatlab.touch_pick_aria', 'Make the {side} {mat}').replace('{side}', sideName.toLowerCase()).replace('{mat}', mm.name.toLowerCase()));
                  })),
                h('button', {
                  type: 'button', 'aria-pressed': touchSide === side ? 'true' : 'false',
                  onClick: function () { touchNow(side); },
                  className: 'mt-1.5 min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-black', style: neutralBtnStyle(touchSide === side)
                }, '🖐️ ' + t('stem.heatlab.touch_btn', 'Touch the {mat}').replace('{mat}', m.name.toLowerCase())));
            })
          ),
          (function () {
            var shown = [[touchMatA, touchA], [touchMatB, touchB]].filter(function (p) { return touchedIds.indexOf(p[0].id) !== -1; });
            if (!shown.length) return h('p', { className: 'text-[0.6875rem] mt-2', style: { color: softInk } },
              t('stem.heatlab.touch_waiting', 'Touch a block to measure what your skin feels.'));
            var current = touchSide ? (touchSide === 'b' ? [touchMatB, touchB] : [touchMatA, touchA]) : shown[shown.length - 1];
            var both = shown.length === 2 && touchMatA.id !== touchMatB.id;
            var more = both ? (touchA.fingertipW >= touchB.fingertipW ? [touchMatA, touchA, touchMatB, touchB] : [touchMatB, touchB, touchMatA, touchA]) : null;
            return h('div', { className: 'mt-2 rounded-lg border p-2.5', 'data-ht-touch-result': 'true', style: panelStyle('#38bdf8') },
              h('div', { className: 'overflow-x-auto', role: 'region', tabIndex: 0, 'aria-label': t('stem.heatlab.touch_table_caption', 'What your fingertip feels on each block') },
                h('table', { className: 'w-full text-[0.6875rem]', style: { borderCollapse: 'collapse' } },
                  h('caption', { className: 'text-left text-[0.625rem] mb-1', style: { color: softInk } },
                    t('stem.heatlab.touch_table_caption', 'What your fingertip feels on each block')),
                  h('thead', null, h('tr', null, [
                    t('stem.heatlab.col_material', 'Material'), t('stem.heatlab.touch_col_e', 'Effusivity √(kρc)'),
                    t('stem.heatlab.touch_col_tc', 'Skin surface'), t('stem.heatlab.touch_col_flux', 'Heat drain after 1 s'), t('stem.heatlab.touch_col_tip', 'Through a 1 cm² fingertip')
                  ].map(function (c2) { return h('th', { key: c2, scope: 'col', className: 'text-left py-1 pr-3 font-bold', style: { color: softInk } }, c2); }))),
                  h('tbody', null, shown.map(function (p) {
                    return h('tr', { key: p[0].id },
                      h('th', { scope: 'row', className: 'text-left py-1 pr-3 font-bold', style: { color: bodyInk } }, p[0].name),
                      h('td', { className: 'py-1 pr-3 font-mono', style: { color: bodyInk } }, fmt(p[1].effusivity, 0)),
                      h('td', { className: 'py-1 pr-3 font-mono', style: { color: bodyInk } }, fmt(p[1].contactC, 1) + ' °C'),
                      h('td', { className: 'py-1 pr-3 font-mono', style: { color: bodyInk } }, fmt(p[1].fluxWm2 / 1000, 1) + ' kW/m²'),
                      h('td', { className: 'py-1 pr-3 font-mono', style: { color: bodyInk } }, p[1].fingertipW.toFixed(2) + ' W'));
                  }))
                )),
              h('p', { className: 'text-[0.6875rem] mt-2 leading-relaxed', style: { color: bodyInk } }, touchWhy(current[0], current[1])),
              more ? h('p', { className: 'text-[0.6875rem] mt-1.5 font-bold leading-relaxed', style: { color: bodyInk } },
                t('stem.heatlab.touch_compare', 'Both blocks are at 20 °C, yet {a} drains {r} times as much heat from your fingertip as {b}. Nothing cold flows into you; heat flows out of you, faster into {a}.')
                  .replace(/\{a\}/g, more[0].name.toLowerCase()).replace('{b}', more[2].name.toLowerCase())
                  .replace('{r}', fmt(more[1].fingertipW / Math.max(1e-9, more[3].fingertipW), 1))) : null,
              maths('touch', h('p', { className: 'text-[0.625rem] mt-1 font-mono', style: { color: softInk } },
                htFmt(t('stem.heatlab.tc_e_skin_33_e_block', 'Tc = (e_skin·33 + e_block·20) ÷ (e_skin + e_block)   q(t) = e_skin·e_block·ΔT ÷ ((e_skin + e_block)·√(πt))   e_skin ≈ {0}'), [fmt(HEAT_SKIN_EFFUSIVITY, 0)])))
            );
          })(),
          recordButton('touch', function () {
            var m = touchSide === 'b' ? touchMatB : touchMatA, r = touchSide === 'b' ? touchB : touchA;
            return { material: m.id, effusivity: r.effusivity, object_C: HEAT_COLD_C, skin_C: HEAT_SKIN_C, contact_C: r.contactC, skinDrop_K: r.skinDropK, flux1s_Wm2: r.fluxWm2, fingertip_W: r.fingertipW };
          }, !touchSide)
        ),

        // ── 3. calorimetry ──
        sec('mixing', '#38bdf8',
          heading('#38bdf8', '⚖️ 6. ' + t('stem.heatlab.calorimetry_estimation_challenge', 'Calorimetry estimation challenge')),
          h('p', { className: 'text-[0.6875rem] mb-2', 'data-heat-estimation-challenge': 'true', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            t('stem.heatlab.estimate_the_final_temperature_compare_it', 'Estimate the final temperature, compare it with the energy model, then revise your thinking. Closeness can earn estimation XP; reflection credit never depends on matching the model.')),
          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            [[1, sub1, m1, t1, 'sub1', 'm1', 't1'], [2, sub2, m2, t2, 'sub2', 'm2', 't2']].map(function (row) {
              var n = row[0], sub = row[1];
              return h('div', { key: n, className: 'rounded-lg p-2', style: { background: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.28)' } },
                h('p', { className: 'text-[0.6875rem] font-black mb-1', style: { color: ink(sub.colour) } }, htFmt(t('stem.heatlab.sample', 'Sample {0}: {1}'), [n, sub.name])),
                h('div', { className: 'flex flex-wrap gap-1 mb-1' },
                  SUBSTANCES.map(function (s) {
                    return pill(sub.id === s.id, s.colour, s.name, function () {
                      var patch = {}; patch[row[4]] = s.id;
                      resetMixEstimate(patch);
                    }, htFmt(t('stem.heatlab.set_sample_to', 'Set sample {0} to {1}'), [n, s.name]));
                  })
                ),
                slider('heat-mass-' + n, t('stem.heatlab.eq_mass', 'Mass'), 0.1, 2, 0.1, row[2],
                  function (e) { var p = {}; p[row[5]] = parseFloat(e.target.value); resetMixEstimate(p); }, row[2].toFixed(1) + ' kg'),
                slider('heat-temp-' + n, t('stem.heatlab.eq_start', 'Start temp'), 0, mixMaxC(sub), 1, row[3],
                  function (e) { var p = {}; p[row[6]] = parseFloat(e.target.value); resetMixEstimate(p); }, row[3] + ' °C'),
                h('p', { className: 'text-[0.625rem] mt-1 font-mono', style: { color: isDark ? '#94a3b8' : '#475569' } }, 'c = ' + sub.c + ' J/kg·K'));
            })
          ),
          h('div', { className: 'flex flex-wrap items-end gap-2 mt-2' },
            h('div', { className: 'flex-1 min-w-[160px]' },
              h('label', { htmlFor: 'heat-predict', className: 'block text-[0.6875rem] font-bold mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, t('stem.heatlab.your_temperature_estimate_c', 'Your temperature estimate (°C)')),
              h('input', {
                id: 'heat-predict', type: 'number', min: 0, max: 100, value: predictText,
                placeholder: t('stem.heatlab.e_g_45','e.g. 45'),
                'aria-describedby': 'heat-estimate-help',
                onChange: function (e) {
                  setPredictText(e.target.value);
                  setRevealed(false);
                  upd({ mixEstimateResult: null, mixEstimateRevision: '', mixEstimateReflection: '', mixEstimateReflectionComplete: false });
                },
                className: 'w-full min-h-11 px-3 py-2 rounded-lg text-[0.6875rem]',
                style: { border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.32)' : 'rgba(100,116,139,0.3)'), background: isDark ? 'rgba(15,23,42,0.8)' : '#fff', color: isDark ? '#e2e8f0' : '#0f172a' }
              }),
              h('p', { id: 'heat-estimate-help', className: 'mt-1 text-[0.625rem]', style: { color: isDark ? '#94a3b8' : '#64748b' } }, t('stem.heatlab.enter_a_number_before_comparing_a', 'Enter a number before comparing. A reasonable estimate can be above or below the model result.'))),
            h('button', {
              type: 'button',
              disabled: !mixEstimateReady || revealed,
              'aria-disabled': mixEstimateReady && !revealed ? 'false' : 'true',
              'aria-label': t('stem.heatlab.compare_your_temperature_estimate_with_the_c','Compare your temperature estimate with the calorimetry model'),
              onClick: function () {
                if (!mixEstimateReady || revealed) return;
                var guess = parseFloat(predictText);
                var absoluteError = Math.abs(guess - finalT);
                var percentError = finalT === 0 ? 0 : (absoluteError / Math.abs(finalT)) * 100;
                var withinTwo = absoluteError <= 2;
                // Only a first, blind estimate on this exact mix can earn credit.
                var credited = withinTwo && !mixAlreadyRevealed;
                setRevealed(true);
                upd({
                  mixEstimateResult: { estimated: guess, actual: finalT, absoluteError: absoluteError, percentError: percentError, withinTwo: withinTwo, credited: credited },
                  mixEstimateRevision: '',
                  mixEstimateReflection: '',
                  mixEstimateReflectionComplete: mixAlreadyReflected,
                  mixWins: credited ? (d.mixWins || 0) + 1 : (d.mixWins || 0),
                  mixRevealedSigs: mixAlreadyRevealed ? mixRevealedSigs : heatLogAppend(mixRevealedSigs, mixSig, 100)
                });
                if (withinTwo && !credited) {
                  if (typeof announceToSR === 'function') announceToSR(t('stem.heatlab.sr_mix_already_revealed', 'Within two degrees, but the answer for this exact mix was already shown, so no estimation XP. Change a sample to earn it.'));
                } else if (withinTwo) {
                  if (typeof celebrate === 'function') celebrate();
                  if (typeof awardXP === 'function') awardXP('heatlab_mix_estimate', 10, t('stem.heatlab.xp_mix', 'Mixing estimate within two degrees'));
                  if (typeof announceToSR === 'function') announceToSR(htFmt(t('stem.heatlab.your_estimate_is_within_two_degrees', 'Your estimate is within two degrees of the model result. The model gives {0} degrees Celsius.'), [finalT.toFixed(1)]));
                } else if (typeof announceToSR === 'function') {
                  announceToSR(htFmt(t('stem.heatlab.the_model_gives_degrees_celsius_your', 'The model gives {0} degrees Celsius. Your estimate differs by {1} degrees.'), [finalT.toFixed(1), absoluteError.toFixed(1)]));
                }
              },
              className: 'min-h-11 px-4 py-2 rounded-lg text-[0.6875rem] font-black text-white disabled:cursor-not-allowed disabled:opacity-45',
              style: { background: '#0369a1', border: '1px solid #0369a1' }
            }, revealed ? t('stem.heatlab.estimate_compared', 'Estimate compared') : t('stem.heatlab.compare_estimate_with_model', 'Compare estimate with model'))
          ),
          revealed && mixEstimateResult ? h('div', { role: 'status', className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(56,189,248,0.5)', background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(240,249,255,0.9)' } },
            h('p', { className: 'text-sm font-black', style: { color: ink('#0284c7') } }, htFmt(t('stem.heatlab.estimate_c_model_c', 'Estimate: {0} °C · Model: {1} °C'), [mixEstimateResult.estimated.toFixed(1), mixEstimateResult.actual.toFixed(1)])),
            h('p', { className: 'text-[0.6875rem] mt-1 font-bold', style: { color: mixEstimateResult.withinTwo ? ink('#15803d') : (isDark ? '#fcd34d' : '#92400e') } },
              mixEstimateResult.withinTwo
                ? (mixEstimateResult.credited === false
                  ? t('stem.heatlab.mix_within_two_no_credit', 'Within 2 °C. The answer for this exact mix had already been shown, so no estimation XP this time: change a sample to try a fresh one.')
                  : t('stem.heatlab.within_2_c_estimation_xp_earned', 'Within 2 °C — estimation XP earned.'))
                : htFmt(t('stem.heatlab.difference_c_error_reflection_credit_is', 'Difference: {0} °C ({1}% error). Reflection credit is still fully available.'), [mixEstimateResult.absoluteError.toFixed(1), mixEstimateResult.percentError.toFixed(0)])),
            maths('mixing', h('p', { className: 'text-[0.6875rem] mt-1 font-mono', style: { color: isDark ? '#cbd5e1' : '#475569' } },
              'Tf = (m₁c₁T₁ + m₂c₂T₂) / (m₁c₁ + m₂c₂)')),
            h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              mixExplanation)
          ) : null,
          revealed && mixEstimateResult ? h('section', { className: 'mt-2 rounded-lg border p-2.5', 'data-heat-estimation-reflection': 'true', 'aria-label': t('stem.heatlab.calorimetry_estimation_reflection','Calorimetry estimation reflection'), style: { borderColor: 'rgba(56,189,248,0.5)', background: isDark ? 'rgba(8,47,73,0.45)' : 'rgba(240,249,255,0.9)' } },
            h('h4', { className: 'text-[0.6875rem] font-black uppercase tracking-wide', style: { color: ink('#0284c7') } }, t('stem.heatlab.revise_from_evidence', 'Revise from evidence')),
            h('p', { className: 'mt-1 text-[0.625rem] leading-relaxed', style: { color: isDark ? '#cbd5e1' : '#475569' } }, t('stem.heatlab.choose_how_the_comparison_changed_your', 'Choose how the comparison changed your thinking, then cite the measured difference or the energy model. This completion credit is independent of accuracy.')),
            h('fieldset', { className: 'mt-2' },
              h('legend', { className: 'text-[0.6875rem] font-bold', style: { color: isDark ? '#e2e8f0' : '#334155' } }, t('stem.heatlab.what_does_the_evidence_suggest', 'What does the evidence suggest?')),
              h('div', { className: 'mt-1 grid gap-1 sm:grid-cols-3' },
                [
                  { id: 'supported', label: t('stem.heatlab.my_reasoning_was_supported', 'My reasoning was supported') },
                  { id: 'revised', label: t('stem.heatlab.i_would_revise_my_reasoning', 'I would revise my reasoning') },
                  { id: 'uncertain', label: t('stem.heatlab.i_need_another_trial', 'I need another trial') }
                ].map(function (option) {
                  return h('label', { key: option.id, className: 'flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-[0.625rem]', style: { borderColor: mixEstimateRevision === option.id ? '#0284c7' : 'rgba(56,189,248,0.3)', background: mixEstimateRevision === option.id ? (isDark ? 'rgba(14,116,144,0.3)' : '#e0f2fe') : 'transparent', color: isDark ? '#e2e8f0' : '#334155' } },
                    h('input', { type: 'radio', name: 'heat-estimation-revision', value: option.id, checked: mixEstimateRevision === option.id, onChange: function () { upd({ mixEstimateRevision: option.id, mixEstimateReflectionComplete: false }); }, className: 'mt-0.5 h-4 w-4 accent-sky-700' }),
                    h('span', null, option.label));
                })
              )
            ),
            h('label', { htmlFor: 'heat-estimation-reflection', className: 'mt-2 block text-[0.6875rem] font-bold', style: { color: isDark ? '#e2e8f0' : '#334155' } }, t('stem.heatlab.evidence_note', 'Evidence note')),
            h('textarea', { id: 'heat-estimation-reflection', rows: 2, maxLength: 400, value: mixEstimateReflection, onChange: function (e) { upd({ mixEstimateReflection: e.target.value.slice(0, 400), mixEstimateReflectionComplete: false }); }, placeholder: t('stem.heatlab.the_model_result_and_temperature_difference','The model result and temperature difference show... Next time I would...'), className: 'mt-1 w-full rounded-lg border p-2 text-[0.6875rem]', style: { borderColor: 'rgba(56,189,248,0.4)', background: isDark ? 'rgba(15,23,42,0.8)' : '#fff', color: isDark ? '#e2e8f0' : '#0f172a' } }),
            h('div', { className: 'mt-2 flex flex-wrap gap-2' },
              h('button', { type: 'button', disabled: !mixEstimateRevision || mixEstimateReflection.trim().length < 12 || !!d.mixEstimateReflectionComplete, 'aria-disabled': mixEstimateRevision && mixEstimateReflection.trim().length >= 12 && !d.mixEstimateReflectionComplete ? 'false' : 'true', onClick: function () {
                if (!mixEstimateRevision || mixEstimateReflection.trim().length < 12 || d.mixEstimateReflectionComplete) return;
                upd({ mixEstimateReflectionComplete: true, mixReflectedSigs: mixAlreadyReflected ? mixReflectedSigs : heatLogAppend(mixReflectedSigs, mixSig, 100) });
                // Reflection credit once per mix, so re-saving the same scenario is not a loop.
                if (!mixAlreadyReflected && typeof awardXP === 'function') awardXP('heatlab_mix_reflection', 5, t('stem.heatlab.xp_reflection', 'Completed a calorimetry evidence reflection'));
                if (typeof announceToSR === 'function') announceToSR(__alloT('stem.heatlab.sr_calorimetry_estimation_reflection_saved', 'Calorimetry estimation reflection saved.'));
              }, className: 'min-h-10 rounded-lg bg-sky-700 px-3 py-2 text-[0.625rem] font-black text-white disabled:cursor-not-allowed disabled:opacity-45' }, d.mixEstimateReflectionComplete ? t('stem.heatlab.reflection_saved', 'Reflection saved') : t('stem.heatlab.save_evidence_reflection', 'Save evidence reflection')),
              h('button', { type: 'button', onClick: function () { resetMixEstimate({}); }, className: 'min-h-10 rounded-lg border px-3 py-2 text-[0.625rem] font-black', style: { borderColor: 'rgba(56,189,248,0.5)', color: isDark ? '#7dd3fc' : '#0369a1' } }, t('stem.heatlab.try_another_estimate', 'Try another estimate'))
            )
          ) : null,
          recordButton('mixing', function () {
            markMixRevealed();   // the row carries Tf_C, so this mix is no longer a blind estimate
            return {
              sub1: sub1.id, m1_kg: m1, T1_C: t1, c1_JkgK: sub1.c, sub2: sub2.id, m2_kg: m2, T2_C: t2, c2_JkgK: sub2.c,
              Tf_C: finalT, dT1_K: finalT - t1, dT2_K: finalT - t2,
              estimate_C: mixEstimateResult ? mixEstimateResult.estimated : null,
              error_K: mixEstimateResult ? mixEstimateResult.estimated - finalT : null
            };
          }),
          lensToggle('mix'),
          lensPanel('mix', {
            pops: mixPops,
            ariaLabel: t('stem.heatlab.lens_mix_aria', 'Particles of {s1} and {s2} exchanging energy').replace('{s1}', sub1.name.toLowerCase()).replace('{s2}', sub2.name.toLowerCase()),
            description: mixLensDesc, seed: 45
          }, slider('heat-mix-lens', t('stem.heatlab.lens_mix_progress', 'Mixing progress'), 0, 100, 5, mixLensP,
            function (e) { upd({ mixLensP: parseFloat(e.target.value) }); },
            t('stem.heatlab.lens_mix_value', '{p}%: {T1} °C and {T2} °C').replace('{p}', String(mixLensP)).replace('{T1}', fmt(mixLensNow.T1, 1)).replace('{T2}', fmt(mixLensNow.T2, 1)))),
          poeCard('heatvstemp')
        ),

        // ── Two blocks reach equilibrium, with T(t), a ledger and S(t) ──
        sec('equilibrium', '#34d399',
          heading('#34d399', '🤝 7. ' + t('stem.heatlab.eq_title', 'Two blocks reach equilibrium')),
          h('p', { className: 'text-[0.6875rem] mb-2 leading-relaxed', style: { color: softInk } },
            t('stem.heatlab.eq_intro', 'The calorimetry section gave only the end point. Here two blocks touch through a contact that passes G watts for every degree between them, and you watch the whole approach. The model is solved exactly, so the ledger balances to rounding error at every moment.')),
          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
            [[1, eqMat1, eqM1, eqT1, 'eqMat1', 'eqM1', 'eqT1'], [2, eqMat2, eqM2, eqT2, 'eqMat2', 'eqM2', 'eqT2']].map(function (row) {
              var n = row[0], m = row[1];
              var title = t('stem.heatlab.eq_block_n', 'Block {n}').replace('{n}', String(n));
              return h('div', { key: 'eq' + n, className: 'rounded-lg border p-2', style: panelStyle(n === 1 ? '#fb923c' : '#22d3ee') },
                h('p', { className: 'text-[0.6875rem] font-black', style: { color: bodyInk } }, title + ': ' + m.name + ' · c = ' + m.c + ' J/kg·K'),
                h('div', { role: 'group', 'aria-label': t('stem.heatlab.eq_block_material', '{block} material').replace('{block}', title), className: 'mt-1 flex flex-wrap gap-1' },
                  MATERIALS.map(function (mm) {
                    return pill(m.id === mm.id, mm.colour, mm.name, function () { var p = {}; p[row[4]] = mm.id; upd(p); },
                      t('stem.heatlab.eq_pick_aria', 'Make {block} {mat}').replace('{block}', title.toLowerCase()).replace('{mat}', mm.name.toLowerCase()));
                  })),
                slider('heat-eq-m' + n, t('stem.heatlab.eq_mass', 'Mass'), 0.1, 5, 0.1, row[2],
                  function (e) { var p = {}; p[row[5]] = parseFloat(e.target.value); upd(p); }, fmt(row[2], 1) + ' kg'),
                slider('heat-eq-t' + n, t('stem.heatlab.eq_start', 'Start temp'), 0, 100, 1, row[3],
                  function (e) { var p = {}; p[row[6]] = parseFloat(e.target.value); upd(p); }, row[3] + ' °C'));
            })
          ),
          slider('heat-eq-g', t('stem.heatlab.eq_contact', 'Contact G'), 1, 20, 1, eqG,
            function (e) { upd({ eqG: parseFloat(e.target.value) }); },
            t('stem.heatlab.eq_contact_value', '{g} W/K').replace('{g}', fmt(eqG, 0))),
          h('div', { className: 'mt-2 flex flex-wrap items-center gap-2' },
            h('button', {
              type: 'button', 'aria-pressed': eqLeak ? 'true' : 'false',
              onClick: function () { upd({ eqLeak: !eqLeak }); },
              className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(eqLeak)
            }, '🌬️ ' + t('stem.heatlab.eq_leak', 'Leak to the 20 °C room')),
            h('span', { className: 'text-[0.625rem]', style: { color: softInk } },
              eqLeak ? t('stem.heatlab.eq_leak_on', 'Open system: each block also loses {g} W/K to the room.').replace('{g}', fmt(EQ_LEAK_G, 1))
                : t('stem.heatlab.eq_leak_off', 'Closed system: the box lets no heat in or out.'))),
          slider('heat-eq-time', t('stem.heatlab.eq_time', 'Time on the graphs'), 0, 100, 1, eqCursor,
            function (e) { upd({ eqCursor: parseFloat(e.target.value) }); }, heatTimeLabel(eqTime), 'ht-eq-ledger'),
          h('div', { className: 'mt-2 rounded-lg overflow-hidden border', style: { borderColor: isContrast ? '#ffffff' : 'rgba(52,211,153,0.35)', height: '190px' } },
            h('canvas', {
              ref: eqTRef, role: 'img', 'aria-describedby': 'ht-eq-ledger',
              'aria-label': t('stem.heatlab.eq_t_aria', 'Temperature against time. {b1} starts at {t1} °C and {b2} at {t2} °C; they converge on {tf} °C with a time constant of {tau}. At {now}: {n1} °C and {n2} °C.')
                .replace('{b1}', eqMat1.name).replace('{t1}', fmt(eqT1, 0)).replace('{b2}', eqMat2.name.toLowerCase()).replace('{t2}', fmt(eqT2, 0))
                .replace('{tf}', fmt(eqRun.Tf, 1)).replace('{tau}', heatTimeLabel(eqRun.tauS)).replace('{now}', heatTimeLabel(eqTime))
                .replace('{n1}', fmt(eqNow.T1, 1)).replace('{n2}', fmt(eqNow.T2, 1)),
              style: { width: '100%', height: '100%', display: 'block' }
            })),
          accessRow('equilibrium', {
            series: function () { return [eqRun.points.map(function (p) { return [p.t, p.T1]; }), eqRun.points.map(function (p) { return [p.t, p.T2]; })]; },
            sound: { yMin: Math.min(eqT1, eqT2, HEAT_COLD_C), yMax: Math.max(eqT1, eqT2, HEAT_COLD_C) }, describe: describeEq
          }),
          h('div', { className: 'mt-2 rounded-lg overflow-hidden border', style: { borderColor: isContrast ? '#ffffff' : 'rgba(52,211,153,0.35)', height: '170px' } },
            h('canvas', {
              ref: eqSRef, role: 'img', 'aria-describedby': 'ht-eq-ledger',
              'aria-label': t('stem.heatlab.eq_s_aria', 'Entropy change against time. The blocks’ entropy changes by {s} J/K by {now}{room}.')
                .replace('{s}', eqNow.dS.toFixed(3)).replace('{now}', heatTimeLabel(eqTime))
                .replace('{room}', eqLeak ? t('stem.heatlab.eq_s_aria_room', '; the room gains {r} J/K, so the total changes by {tot} J/K').replace('{r}', eqNow.dSroom.toFixed(3)).replace('{tot}', eqNow.dStotal.toFixed(3)) : ''),
              style: { width: '100%', height: '100%', display: 'block' }
            })),
          h('div', { id: 'ht-eq-ledger', className: 'mt-2 rounded-lg border p-2.5', 'data-ht-eq-ledger': 'true', style: panelStyle('#34d399') },
            h('p', { className: 'text-[0.6875rem] font-black', style: { color: isContrast ? '#fbbf24' : ink('#34d399') } },
              '⚖️ ' + t('stem.heatlab.eq_ledger_title', 'Energy and entropy ledger at {now}').replace('{now}', heatTimeLabel(eqTime))),
            h('dl', { className: 'mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-0.5 text-[0.6875rem]' },
              [
                [eqMat1.name + ' (' + t('stem.heatlab.eq_block_n', 'Block {n}').replace('{n}', '1') + ')', eqNow.T1.toFixed(2) + ' °C'],
                [eqMat2.name + ' (' + t('stem.heatlab.eq_block_n', 'Block {n}').replace('{n}', '2') + ')', eqNow.T2.toFixed(2) + ' °C'],
                [t('stem.heatlab.eq_flow_now', 'Net heat flow now, block 1 → block 2'), fmtW(eqFlowW)],
                [t('stem.heatlab.eq_q12', 'Heat passed from block 1 to block 2 so far'), fmtJ(eqNow.q12J)],
                [t('stem.heatlab.eq_du1', 'Energy change of block 1, C₁ΔT₁'), fmtJ(eqDU1)],
                [t('stem.heatlab.eq_du2', 'Energy change of block 2, C₂ΔT₂'), fmtJ(eqDU2)]
              ].concat(eqLeak ? [[t('stem.heatlab.eq_leak_j', 'Heat leaked to the room'), fmtJ(eqLeakJ)]] : []).concat([
                [t('stem.heatlab.eq_ds', 'Entropy change of the blocks'), eqNow.dS.toFixed(3) + ' J/K'],
                [t('stem.heatlab.eq_ds_room', 'Entropy change of the room'), eqNow.dSroom.toFixed(3) + ' J/K'],
                [t('stem.heatlab.eq_ds_total', 'Total entropy change'), eqNow.dStotal.toFixed(3) + ' J/K']
              ]).map(function (ln, li) {
                return [
                  h('dt', { key: 'dt' + li, style: { color: softInk } }, ln[0]),
                  h('dd', { key: 'dd' + li, className: 'font-mono font-bold text-right', style: { color: bodyInk } }, ln[1])
                ];
              })
            ),
            maths('eqcheck', h('p', { className: 'text-[0.625rem] mt-1 font-mono break-words', style: { color: softInk } },
              t('stem.heatlab.eq_check', 'C₁ΔT₁ + C₂ΔT₂ + leak = {a} + {b} + {c} (difference {diff} J)')
                .replace('{a}', fmtJ(eqDU1)).replace('{b}', fmtJ(eqDU2)).replace('{c}', fmtJ(eqLeakJ))
                .replace('{diff}', Math.abs(eqNow.energyResidualJ) < 1e-300 ? '0' : eqNow.energyResidualJ.toExponential(1)))),
            h('p', { className: 'text-[0.6875rem] mt-1.5 leading-relaxed', style: { color: bodyInk } },
              eqLeak
                ? t('stem.heatlab.eq_story_leak', 'With the leak, both blocks drift towards 20 °C and the pair’s own entropy can even fall, but the room gains more than they lose: the total never goes down.')
                : t('stem.heatlab.eq_story_closed', 'Whatever block 1 loses, block 2 gains, so the energy total never changes. The entropy of the pair only rises, fast at first, and stops rising when the temperatures meet. There the net flow is zero: that is equilibrium.')),
            h('button', {
              type: 'button', onClick: function () { goToSection('entropy'); },
              className: 'mt-1.5 min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(false)
            }, '🎲 ' + t('stem.heatlab.eq_to_entropy', 'Why only one way? Count the arrangements in the entropy section'))
          ),
          recordButton('equilibrium', function () {
            return {
              mat1: eqMat1.id, m1_kg: eqM1, T1start_C: eqT1, mat2: eqMat2.id, m2_kg: eqM2, T2start_C: eqT2, G_WK: eqG, leak: eqLeak,
              t_s: eqTime, T1_C: eqNow.T1, T2_C: eqNow.T2, Tf_C: eqRun.Tf, tau_s: eqRun.tauS, q12_J: eqNow.q12J, leak_J: eqLeakJ,
              dS_blocks_JK: eqNow.dS, dS_room_JK: eqNow.dSroom, dS_total_JK: eqNow.dStotal
            };
          }),
          poeCard('eqstop')
        ),

        // ── 4. heating curve ──
        sec('heatingcurve', '#a78bfa',
          heading('#a78bfa', '♨️ 8. ' + t('stem.heatlab.the_heating_curve_where_the_energy', 'The heating curve: where the energy hides')),
          h('p', { id: 'ht-heating-curve-description', className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            t('stem.heatlab.pour_energy_into_1_kg_of', 'Pour energy into 1 kg of ice at −20 °C and watch the temperature. It does not rise steadily, and the reason is the most useful idea in this whole tool.')),
          h('div', { className: 'rounded-lg overflow-hidden border mb-2', style: { borderColor: 'rgba(167,139,250,0.35)', height: '190px' } },
            h('canvas', {
              ref: curveRef, role: 'img',
              'data-a11y-static': 'true',
              'aria-describedby': 'ht-heating-curve-description',
              'aria-label': htFmt(t('stem.heatlab.heating_curve_for_one_kilogram_of', 'Heating curve for one kilogram of water, temperature against energy added. The line rises through ice, then holds flat at zero degrees for 334 kilojoules while the ice melts, rises again through liquid water, then holds flat at 100 degrees for 2,260 kilojoules while it boils, then rises as steam. Currently at {0} kilojoules, {1} degrees, {2}.'), [fmt(energyIn, 0), wstate.temp.toFixed(0), waterPhaseName(wstate.phase)]),
              style: { width: '100%', height: '100%', display: 'block' }
          })),
          accessRow('curve', { series: function () { return [curvePts]; }, sound: { yMin: -20, yMax: 125 }, describe: describeCurve }),

          h('div', {
            className: 'mt-2 rounded-lg p-2.5',
            role: 'img',
            'aria-label': htFmt(t('stem.heatlab.live_thermal_state_scale_from_minus', 'Live thermal state scale from minus 20 to 125 degrees Celsius. Current state: {0} at {1} degrees Celsius.'), [waterPhaseName(wstate.phase), wstate.temp.toFixed(1)]),
            style: {
              background: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(167,139,250,0.07)',
              border: '1px solid rgba(167,139,250,0.3)'
            }
          },
            h('div', { className: 'flex flex-wrap items-baseline justify-between gap-1' },
              h('span', { className: 'text-[0.6875rem] font-black', style: { color: isDark ? '#e2e8f0' : '#334155' } }, t('stem.heatlab.live_thermal_state', 'Live thermal state')),
              // The ramp colour is a cue on the dark stage only; on white its
              // amber and orange stops fall to under 2:1, so light uses ink.
              h('span', { className: 'text-[0.6875rem] font-black', style: { color: isDark ? ink(heatRampColour(curveTempFraction)) : '#334155' } },
                htFmt(t('stem.heatlab.degrees_c', '{0} · {1} degrees C'), [waterPhaseName(wstate.phase), wstate.temp.toFixed(1)]))
            ),
            h('div', { className: 'relative mt-2', 'aria-hidden': 'true' },
              h('div', {
                className: 'h-3 rounded-full overflow-hidden',
                style: { background: 'linear-gradient(90deg, ' + curveScaleGradient + ')' }
              }),
              h('span', {
                className: 'absolute top-1/2',
                style: {
                  left: (curveTempFraction * 100).toFixed(2) + '%',
                  width: '4px', height: '24px',
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '999px',
                  background: isDark ? '#f8fafc' : '#0f172a',
                  boxShadow: '0 0 0 2px ' + heatRampColour(curveTempFraction),
                  transition: prefersReducedMotion ? 'none' : 'left 160ms ease-out'
                }
              })
            ),
            h('div', { className: 'relative h-8 mt-1', 'aria-hidden': 'true' },
              [{ temp: -20, label: t('stem.heatlab.wphase_ice', 'Ice'), value: '-20 C' },
               { temp: 0, label: t('stem.heatlab.hc_stage_melt', 'Melt'), value: '0 C' },
               { temp: 100, label: t('stem.heatlab.hc_stage_boil', 'Boil'), value: '100 C' },
               { temp: heatWaterState(CURVE_MAX).temp, label: t('stem.heatlab.wphase_steam', 'Steam'), value: fmt(heatWaterState(CURVE_MAX).temp, 0) + ' C' }].map(function (mark) {
                 var left = clamp((mark.temp - CURVE_SCALE_MIN) / (CURVE_SCALE_MAX - CURVE_SCALE_MIN), 0, 1) * 100;
                 var edge = mark.temp === CURVE_SCALE_MIN ? 'translateX(0)' : mark.temp > 100 ? 'translateX(-100%)' : 'translateX(-50%)';
                 return h('div', {
                   key: mark.label,
                   className: 'absolute text-center',
                   style: { left: left.toFixed(2) + '%', transform: edge, minWidth: '3rem' }
                 },
                   h('span', { className: 'block text-[0.625rem] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } }, mark.label),
                   h('span', { className: 'block text-[0.625rem]', style: { color: isDark ? '#94a3b8' : '#475569' } }, mark.value)
                 );
               })
            ),
            h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, curveStateNote)
          ),
          slider('heat-energy', t('stem.heatlab.energy_added', 'Energy added'), 0, 3100, 10, energyIn,
            function (e) { upd({ energyIn: parseFloat(e.target.value) }); }, fmt(energyIn, 0) + ' kJ', 'ht-heating-status'),
          h('p', {
            id: 'ht-heating-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', className: 'sr-only'
          }, htFmt(t('stem.heatlab.degrees_celsius_at_kilojoules', '{0}, {1} degrees Celsius at {2} kilojoules.{3}'), [waterPhaseName(wstate.phase), wstate.temp.toFixed(1), fmt(energyIn, 0), (wstate.frac > 0 ? htFmt(t('stem.heatlab.percent_through_the_phase_change', ' {0} percent through the phase change.'), [(wstate.frac * 100).toFixed(0)]) : '')])),
          h('div', { className: 'mt-2 grid grid-cols-2 gap-2' },
            h('div', { className: 'rounded-lg p-2.5 text-center', style: { background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.35)' } },
              h('p', { className: 'text-[0.625rem] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } }, t('stem.heatlab.state', 'State')),
              h('p', { className: 'text-sm font-black', style: { color: ink('#a78bfa') } }, waterPhaseName(wstate.phase))),
            h('div', { className: 'rounded-lg p-2.5 text-center', style: { background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.35)' } },
              h('p', { className: 'text-[0.625rem] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } }, t('stem.heatlab.hc_col_temp', 'Temperature')),
              h('p', { className: 'text-sm font-black', style: { color: ink('#a78bfa') } }, wstate.temp.toFixed(1) + ' °C'))
          ),
          wstate.frac > 0 ? h('div', { className: 'mt-2' },
            h('div', { className: 'h-2 rounded-full overflow-hidden', style: { background: 'rgba(148,163,184,0.25)' } },
              h('div', { style: { height: '100%', width: (wstate.frac * 100).toFixed(0) + '%', background: '#a78bfa', borderRadius: '999px' } })),
            h('p', { className: 'text-[0.6875rem] mt-1 font-bold', style: { color: ink('#a78bfa') } },
              htFmt(t('stem.heatlab.of_the_way_through_the_change', '{0}% of the way through the change of state — and the temperature is not moving at all.'), [(wstate.frac * 100).toFixed(0)]))
          ) : null,
          wstate.phase === 'Water boiling' ? bubblesCallout(t('stem.heatlab.sub_water', 'Water'), true, 'energy') : null,
          h('p', { className: 'text-[0.6875rem] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            wstate.phase.indexOf('melting') !== -1 || wstate.phase.indexOf('boiling') !== -1
              ? t('stem.heatlab.the_energy_is_going_into_breaking', 'The energy is going into breaking bonds between molecules, not speeding them up. Temperature measures average molecular motion, so it stalls until every last bond has gone.')
              : t('stem.heatlab.here_the_energy_raises_the_temperature', 'Here the energy raises the temperature directly. Notice the slope differs by state: ice warms about twice as fast per kilojoule as liquid water, because its specific heat is roughly half.')),
          h('p', { className: 'text-[0.6875rem] mt-1 font-mono', style: { color: isDark ? '#94a3b8' : '#64748b' } },
            t('stem.heatlab.melting_1_kg_of_ice_334', 'Melting 1 kg of ice: 334 kJ. Boiling 1 kg of water: 2,260 kJ — nearly seven times more.')),
          // Built from HEAT_WATER through heatWaterStages, the same constants the
          // model and the chart bands use, so every figure here is the model's.
          // It ends where the slider does (3,100 kJ), not at a state the tool
          // cannot reach.
          dataTable('heating', t('stem.heatlab.every_stage_of_the_curve_for', 'Every stage of the curve, for 1 kg of water'),
            [t('stem.heatlab.hc_col_stage', 'Stage'), t('stem.heatlab.energy_needed', 'Energy needed'), t('stem.heatlab.running_total', 'Running total'), t('stem.heatlab.hc_col_temp', 'Temperature')],
            waterStages.map(function (s) {
              var name = {
                ice: t('stem.heatlab.hc_row_ice', 'Warm ice, −20 to 0 °C'),
                melt: t('stem.heatlab.hc_row_melt', 'Melt the ice'),
                water: t('stem.heatlab.hc_row_water', 'Warm water, 0 to 100 °C'),
                boil: t('stem.heatlab.hc_row_boil', 'Boil the water'),
                steam: t('stem.heatlab.hc_row_steam', 'Superheat the steam')
              }[s.id];
              var temp = s.fromC === s.toC
                ? t('stem.heatlab.hc_row_stays', 'stays at {T} °C').replace('{T}', fmt(s.fromC, 0))
                : String(s.fromC).replace('-', '−') + ' → ' + fmt(s.toC, 1) + ' °C';
              return [name, fmt(s.kJ, 1) + ' kJ', fmt(s.totalKJ, 1) + ' kJ', temp];
            })),
          lensToggle('curve'),
          lensPanel('curve', {
            pops: [{ key: 'water', label: t('stem.heatlab.lens_water', 'Water'), tempC: wstate.temp, M: HEAT_MOLAR_MASS.water, phase: curvePhase, colour: lensColour('#38bdf8', 0), region: 'all', share: 1 }],
            plateau: curvePlateau,
            ariaLabel: t('stem.heatlab.lens_curve_aria', 'Water molecules at {kj} kJ: {T} °C').replace('{kj}', fmt(energyIn, 0)).replace('{T}', fmt(wstate.temp, 0)),
            description: curveLensDesc, seed: 57
          }),
          recordButton('heating-curve', function () {
            return { energy_kJ: energyIn, phase: wstate.phase, T_C: wstate.temp, phaseFrac: wstate.frac };
          }),

          // ── Stage C: the curve against the clock, four substances, heating
          //    and cooling (with supercooling for water) ──
          h('div', { className: 'mt-3 rounded-lg border p-2.5', 'data-ht-phase-time': hcMode, style: panelStyle('#a78bfa') },
            h('p', { className: 'text-[0.6875rem] font-black', style: { color: isContrast ? '#fbbf24' : ink('#a78bfa') } },
              '⏱️ ' + t('stem.heatlab.hc_title', 'Against the clock: four substances, heating and cooling')),
            h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: softInk } },
              t('stem.heatlab.hc_intro', 'The same plateaus, now against time. Heating: an ideal heater puts every watt into 1 kg of the substance, so time = energy ÷ power. Cooling: a 50 g sample in a test tube loses heat to a cold bath in proportion to the temperature gap, so it slows as it nears the bath.')),
            h('div', { role: 'group', 'aria-label': t('stem.heatlab.hc_sub_group', 'Substance'), className: 'mt-1.5 flex flex-wrap gap-1' },
              HEAT_PHASE_SUBS.map(function (s) {
                return pill(hcSub.id === s.id, '#a78bfa', PHASE_SUB_NAMES[s.id], function () { upd({ hcSub: s.id }); });
              })),
            h('div', { role: 'group', 'aria-label': t('stem.heatlab.hc_mode_group', 'Heat or cool'), className: 'mt-1 flex flex-wrap gap-1' },
              [['heat', '🔥 ' + t('stem.heatlab.hc_mode_heat', 'Heating curve')], ['cool', '❄️ ' + t('stem.heatlab.hc_mode_cool', 'Cooling curve')]].map(function (o) {
                return pill(hcMode === o[0], '#a78bfa', o[1], function () { upd({ hcMode: o[0] }); });
              })),
            hcMode === 'heat'
              ? slider('heat-hc-power', t('stem.heatlab.hc_power', 'Heater power'), 200, 3000, 100, hcPower,
                function (e) { upd({ hcPower: parseFloat(e.target.value) }); }, fmt(hcPower, 0) + ' W')
              : h('p', { className: 'text-[0.6875rem] mt-1.5', style: { color: softInk } },
                t('stem.heatlab.hc_cool_setup', 'A {m} sample cooling from {T0} °C in a bath at {env} °C; it loses {G} W for every degree it is warmer than the bath.')
                  .replace('{m}', fmt(hcCool.massKg * 1000, 0) + ' g').replace('{T0}', fmt(hcCool.startC, 0))
                  .replace('{env}', fmt(hcCool.envC, 0)).replace('{G}', fmt(hcCool.G, 2))),
            hcMode === 'cool' && hcSub.supercool
              ? slider('heat-hc-super', t('stem.heatlab.hc_super', 'Supercooling'), 0, 10, 1, hcSuper,
                function (e) { upd({ hcSuper: parseFloat(e.target.value) }); },
                hcSuper > 0 ? t('stem.heatlab.hc_super_value', '{k} K below 0 °C').replace('{k}', fmt(hcSuper, 0)) : t('stem.heatlab.hc_super_off', 'none'))
              : null,
            h('div', { className: 'mt-2 rounded-lg overflow-hidden border', style: { borderColor: isContrast ? '#ffffff' : 'rgba(167,139,250,0.35)', height: '200px' } },
              h('canvas', {
                ref: hcTimeRef, role: 'img', 'aria-describedby': 'ht-hc-desc',
                'aria-label': (hcMode === 'heat'
                  ? t('stem.heatlab.hc_chart_aria_heat', 'Heating curve for 1 kg of {sub} at {p} W, temperature against time: flat at {mp} °C for {melt} while it melts{boil}. It reaches {end} °C after {total}.')
                    .replace('{p}', fmt(hcPower, 0)).replace('{melt}', heatTimeLabel(hcHeat.stages[1].endS - hcHeat.stages[1].startS))
                    .replace('{boil}', hcSub.bpC != null ? t('stem.heatlab.hc_chart_aria_boil', ', then flat at {bp} °C for {dur} while it boils').replace('{bp}', fmt(hcSub.bpC, 1)).replace('{dur}', heatTimeLabel(hcHeat.stages[3].endS - hcHeat.stages[3].startS)) : '')
                    .replace('{end}', fmt(hcSub.endC, 0)).replace('{total}', heatTimeLabel(hcHeat.endS))
                  : t('stem.heatlab.hc_chart_aria_cool', 'Cooling curve for {m} of {sub}, temperature against time: it cools to {dip} °C in {t1}, then holds at {mp} °C for {plat} while it freezes, then cools towards {env} °C.')
                    .replace('{m}', fmt(hcCool.massKg * 1000, 0) + ' g').replace('{dip}', fmt(hcSub.mpC - hcCool.supercoolK, 1))
                    .replace('{t1}', heatTimeLabel(hcCool.freezeStartS)).replace('{plat}', heatTimeLabel(hcCool.plateauS)).replace('{env}', fmt(hcCool.envC, 0)))
                  .replace('{sub}', hcName.toLowerCase()).replace('{mp}', fmt(hcSub.mpC, 1)),
                style: { width: '100%', height: '100%', display: 'block' }
              })),
            accessRow('hctime', { series: function () { return [hcPts.map(function (p) { return [p[0], p[1]]; })]; }, describe: describeHc }),
            slider('heat-hc-time', t('stem.heatlab.hc_time', 'Time'), 0, 100, 1, hcCursor,
              function (e) { upd({ hcCursor: parseFloat(e.target.value) }); },
              heatTimeLabel(hcTimeS) + ' · ' + fmt(hcNow.temp, 1) + ' °C', 'ht-hc-desc'),
            h('p', { id: 'ht-hc-desc', role: lensOpen.time ? undefined : 'status', 'aria-live': lensOpen.time ? undefined : 'polite', 'aria-atomic': lensOpen.time ? undefined : 'true',
              className: 'text-[0.6875rem] mt-1.5 leading-relaxed', 'data-ht-hc-desc': 'true', style: { color: bodyInk } }, hcDesc),
            hcMode === 'cool' && hcCool.supercoolK > 0 ? h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: softInk } },
              t('stem.heatlab.hc_super_story', 'When the first crystal forms, {pct}% of the water freezes almost at once. The latent heat it releases, c × {k} K = L × {pct}%, warms the rest straight back to 0 °C, which is the jump on the graph. The remaining {rest}% freezes on the plateau.')
                .replace(/\{pct\}/g, fmt(hcCool.frozenAtOnce * 100, 1)).replace('{k}', fmt(hcCool.supercoolK, 0)).replace('{rest}', fmt((1 - hcCool.frozenAtOnce) * 100, 1))) : null,
            lensToggle('time'),
            lensPanel('time', {
              pops: [{ key: 's', label: hcName, tempC: hcNow.temp, M: hcSub.M, phase: hcBase, colour: lensColour('#a78bfa', 0), region: 'all', share: 1 }],
              plateau: hcPlateau,
              ariaLabel: t('stem.heatlab.lens_time_aria', 'Particles of {sub} at {T} °C').replace('{sub}', hcName.toLowerCase()).replace('{T}', fmt(hcNow.temp, 0)),
              description: hcDesc, seed: 71
            }),
            hcBoiling ? bubblesCallout(hcName, hcSub.id === 'water', 'time') : null,
            dataTable('phase-time', hcMode === 'heat'
              ? t('stem.heatlab.hc_table_heat', 'Every stage for 1 kg of {sub} at {p} W').replace('{sub}', hcName.toLowerCase()).replace('{p}', fmt(hcPower, 0))
              : t('stem.heatlab.hc_table_cool', 'Every stage for {m} of {sub} cooling in a {env} °C bath').replace('{m}', fmt(hcCool.massKg * 1000, 0) + ' g').replace('{sub}', hcName.toLowerCase()).replace('{env}', fmt(hcCool.envC, 0)),
              [t('stem.heatlab.hc_col_stage', 'Stage'), t('stem.heatlab.hc_col_energy', 'Energy'), t('stem.heatlab.hc_col_from', 'From'), t('stem.heatlab.hc_col_to', 'To'), t('stem.heatlab.hc_col_temp', 'Temperature')],
              hcMode === 'heat'
                ? hcHeat.stages.map(function (st) {
                  var stageName = {
                    solid: t('stem.heatlab.hc_stage_solid', 'Warm the solid'), melt: t('stem.heatlab.hc_stage_melt', 'Melt'),
                    liquid: t('stem.heatlab.hc_stage_liquid', 'Warm the liquid'), boil: t('stem.heatlab.hc_stage_boil', 'Boil'), gas: t('stem.heatlab.hc_stage_gas', 'Heat the vapour')
                  }[st.id];
                  return [stageName, fmt(st.J / 1000, 1) + ' kJ', heatTimeLabel(st.startS), heatTimeLabel(st.endS),
                    st.fromC === st.toC ? t('stem.heatlab.hc_stays', 'stays at {T} °C').replace('{T}', fmt(st.fromC, 1)) : fmt(st.fromC, 1) + ' → ' + fmt(st.toC, 1) + ' °C'];
                })
                : [[t('stem.heatlab.hc_stage_cool_liquid', 'Liquid cools'), fmt(hcCool.massKg * hcSub.cL * (hcCool.startC - (hcSub.mpC - hcCool.supercoolK)) / 1000, 2) + ' kJ', heatTimeLabel(0), heatTimeLabel(hcCool.freezeStartS),
                    fmt(hcCool.startC, 1) + ' → ' + fmt(hcSub.mpC - hcCool.supercoolK, 1) + ' °C']]
                  .concat(hcCool.supercoolK > 0 ? [[t('stem.heatlab.hc_stage_nucleate', 'A crystal forms; part freezes at once'), fmt(hcCool.frozenAtOnce * hcCool.massKg * hcSub.lF / 1000, 2) + ' kJ', heatTimeLabel(hcCool.freezeStartS), heatTimeLabel(hcCool.freezeStartS),
                    fmt(hcSub.mpC - hcCool.supercoolK, 1) + ' → ' + fmt(hcSub.mpC, 1) + ' °C']] : [])
                  .concat([[t('stem.heatlab.hc_stage_freeze', 'Freeze'), fmt((1 - hcCool.frozenAtOnce) * hcCool.massKg * hcSub.lF / 1000, 2) + ' kJ', heatTimeLabel(hcCool.freezeStartS), heatTimeLabel(hcCool.freezeEndS),
                    t('stem.heatlab.hc_stays', 'stays at {T} °C').replace('{T}', fmt(hcSub.mpC, 1))],
                  [t('stem.heatlab.hc_stage_cool_solid', 'Solid cools'), fmt(hcCool.massKg * hcSub.cS * (hcSub.mpC - hcCool.at(hcCool.endS).temp) / 1000, 2) + ' kJ', heatTimeLabel(hcCool.freezeEndS), heatTimeLabel(hcCool.endS),
                    fmt(hcSub.mpC, 1) + ' → ' + fmt(hcCool.at(hcCool.endS).temp, 1) + ' °C']])),
            h('p', { className: 'text-[0.625rem] mt-1 leading-relaxed', style: { color: softInk } },
              t('stem.heatlab.hc_sources', 'Constants per kilogram from the CRC Handbook and the NIST WebBook. Paraffin wax is a mixture, so its melting point (about 58 °C) and latent heat (about 210 kJ/kg) are typical values; it decomposes before it boils. Lead boils at 1,749 °C, off this chart.')),
            recordButton('phase-time', function () {
              return {
                substance: hcSub.id, mode: hcMode, power_W: hcMode === 'heat' ? hcPower : null, bath_C: hcMode === 'cool' ? hcCool.envC : null,
                supercool_K: hcMode === 'cool' ? hcCool.supercoolK : null, t_s: hcTimeS, T_C: hcNow.temp,
                phase: hcNow.phase, plateau_s: hcMode === 'heat' ? hcHeat.stages[1].endS - hcHeat.stages[1].startS : hcCool.plateauS
              };
            })
          ),
          poeCard('boiltemp'),
          poeCard('bubbles')
        ),

        // ── 5. engines ──
        sec('engines', '#34d399',
          heading('#34d399', '⚙️ 9. ' + t('stem.heatlab.why_no_engine_reaches_100_percent', 'Why no engine reaches 100 percent')),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            t('stem.heatlab.carnot_showed_the_ceiling_depends_only', 'Carnot showed the ceiling depends only on the two temperatures: η = 1 − Tc/Th, in kelvin. No amount of engineering beats it — this is the second law, not a design flaw.')),
          h('div', { className: 'space-y-1' },
            ENGINES.map(function (en, i) {
              var carnot = (1 - en.cold / en.hot) * 100;
              var on = enginePick === i;
              return h('button', {
                key: en.name, type: 'button',
                'aria-pressed': on ? 'true' : 'false',
                'aria-label': htFmt(t('stem.heatlab.details_for_carnot_limit_percent_real', '{0} details for {1}, Carnot limit {2} percent, real efficiency {3} percent'), [(on ? t('stem.heatlab.hide', 'Hide') : t('stem.heatlab.teacher_show', 'Show')), en.name, carnot.toFixed(0), en.real]),
                onClick: function () {
                  // Opening a row is not comparing anything, so it no longer
                  // feeds the quest; judging the losses below does.
                  upd({ enginePick: on ? null : i });
                  if (typeof beep === 'function') beep();
                },
                className: 'w-full text-left rounded-lg px-2.5 py-2 border transition-colors',
                style: on
                  ? { background: 'rgba(52,211,153,0.16)', borderColor: '#34d399' }
                  : { background: isDark ? 'rgba(148,163,184,0.07)' : 'rgba(255,255,255,0.9)', borderColor: isDark ? 'rgba(148,163,184,0.22)' : 'rgba(100,116,139,0.2)' }
              },
                h('span', { className: 'flex items-center gap-2' },
                  h('span', { className: 'flex-1 text-[0.6875rem] font-bold', style: { color: isDark ? '#fff' : '#1e293b' } }, en.name),
                  h('span', { className: 'text-[0.6875rem] font-mono', style: { color: ink('#34d399') } }, htFmt(t('stem.heatlab.limit', 'limit {0}%'), [carnot.toFixed(0)])),
                  h('span', { className: 'text-[0.6875rem] font-mono', style: { color: isDark ? '#fbbf24' : '#92400e' } }, htFmt(t('stem.heatlab.real', 'real {0}%'), [en.real]))
                ),
                // The quest here is "compare three engines against the Carnot
                // limit", which two numbers at the end of a row do not support.
                // A shared 0-100% track does: how far the fill falls short of the
                // tick, and how the ticks differ between engines, is the lesson.
                h('span', { className: 'block relative mt-1.5 rounded-full overflow-hidden', 'aria-hidden': 'true', style: { height: '8px', background: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)' } },
                  h('span', { className: 'block h-full rounded-full', style: { width: Math.max(1, en.real) + '%', background: '#fbbf24' } }),
                  h('span', { className: 'block absolute top-0', style: { left: 'calc(' + clamp(carnot, 0, 100) + '% - 1px)', width: '2px', height: '100%', background: '#34d399' } })
                ),
                // The note gives the judgement away (muscle: "Not a heat engine
                // at all"), so it waits until this engine has been judged.
                on ? h('span', { className: 'block text-[0.6875rem] mt-1.5 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
                  htFmt(t('stem.heatlab.hot_side_k_cold_side_k', 'Hot side {0} K, cold side {1} K. {2}'),
                    [en.hot, en.cold, d.enginesJudged && typeof d.enginesJudged === 'object' && d.enginesJudged[en.key || en.name] ? en.note : '']).trim()) : null
              );
            })
          ),
          // Judge before the breakdown appears. The quest counts these
          // judgements (enginesJudged), so it measures a comparison the learner
          // made, not rows they happened to open.
          enginePick !== null && ENGINES[enginePick] ? (function () {
            var en = ENGINES[enginePick];
            var carnot = (1 - en.cold / en.hot) * 100;
            var truth = en.real > carnot ? 'none' : ((100 - carnot) > (carnot - en.real) ? 'law' : 'engineering');
            var judged = d.enginesJudged && typeof d.enginesJudged === 'object' ? d.enginesJudged : {};
            var mine = judged[en.key || en.name] || null;
            var opts = [
              { id: 'law', label: t('stem.heatlab.engine_judge_law', 'The second law: heat that must be dumped to the cold side') },
              { id: 'engineering', label: t('stem.heatlab.engine_judge_eng', 'Engineering: friction, leaks and other fixable losses') },
              { id: 'none', label: t('stem.heatlab.engine_judge_none', 'Neither: it is not a heat engine at all') }
            ];
            return h('div', { className: 'mt-2 rounded-lg border p-2.5', 'data-ht-engine-judge': 'true', style: panelStyle('#34d399') },
              h('p', { id: 'ht-engine-judge-q', className: 'text-[0.6875rem] font-bold', style: { color: bodyInk } },
                t('stem.heatlab.engine_judge_q', 'Use the limit and the real figure for the {name}: what wastes more of its fuel?').replace('{name}', en.name.toLowerCase())),
              h('div', { role: 'group', 'aria-labelledby': 'ht-engine-judge-q', className: 'mt-1.5 flex flex-wrap gap-1' },
                opts.map(function (o) {
                  return pill(mine === o.id, '#34d399', o.label, function () {
                    if (mine) return;
                    var next = Object.assign({}, judged);
                    next[en.key || en.name] = o.id;
                    upd({ enginesJudged: next });
                    if (typeof announceToSR === 'function') {
                      announceToSR(o.id === truth ? t('stem.heatlab.engine_judge_right', 'Yes. The breakdown below shows it.') : t('stem.heatlab.engine_judge_wrong', 'Not this time. Compare your answer with the breakdown below.'));
                    }
                  });
                })
              ),
              mine ? h('p', { role: 'status', className: 'text-[0.6875rem] mt-1.5 font-bold', style: { color: isContrast ? '#ffffff' : mine === truth ? ink('#16a34a') : (isDark ? '#fcd34d' : '#92400e') } },
                mine === truth ? '✅ ' + t('stem.heatlab.engine_judge_right', 'Yes. The breakdown below shows it.')
                  : '🔁 ' + t('stem.heatlab.engine_judge_wrong', 'Not this time. Compare your answer with the breakdown below.')) : null
            );
          })() : null,
          // Where the fuel actually goes. The table gives two percentages; this
          // shows that the waste is the majority, which the numbers alone do not.
          enginePick !== null && ENGINES[enginePick] && d.enginesJudged && d.enginesJudged[ENGINES[enginePick].key || ENGINES[enginePick].name] ? (function () {
            var en = ENGINES[enginePick];
            var carnot = (1 - en.cold / en.hot) * 100;
            var useful = en.real;
            // The body beats its Carnot figure because it is not a heat engine, so
            // splitting its fuel into "second law" and "engineering" losses would be
            // arithmetic nonsense (the three shares would come to 120%). Say why
            // instead of drawing a broken chart.
            if (useful > carnot) {
              return h('div', { className: 'mt-3 rounded-lg border p-2.5', style: { borderColor: 'rgba(251,191,36,0.45)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,251,235,0.9)' } },
                h('p', { className: 'text-[0.6875rem] font-black mb-1', style: { color: ink('#f59e0b') } }, t('stem.heatlab.no_energy_flow_chart_for_this', 'No energy-flow chart for this one — and that is the point')),
                h('p', { className: 'text-[0.6875rem] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
                  htFmt(t('stem.heatlab.converts_of_its_chemical_energy_to', '{0} converts {1}% of its chemical energy to work while the Carnot limit for its temperatures is only {2}%. Nothing is broken: Carnot applies to engines that take in heat and dump some to a cold sink. Muscle skips that step and converts chemical energy directly, so the limit simply does not apply to it.'), [en.name, useful, carnot.toFixed(1)])),
                h('p', { className: 'text-[0.6875rem] mt-2 font-bold', style: { color: ink('#f59e0b') } },
                  t('stem.heatlab.if_the_second_law_does_not', '🤔 If the second law does not cap muscle at 4.8%, what does cap it at around 25%?'))
              );
            }
            var lostToLaw = Math.max(0, 100 - carnot);
            var lostToEngineering = Math.max(0, carnot - useful);
            // ONE bar of 100 units, not three independent 0-100% tracks. The
            // three shares are parts of a single whole and they sum to 100; drawn
            // as separate full-width bars they summed to nothing on screen, so
            // "the waste is the majority" — the entire point of this panel — was
            // left to the reader to work out from the percentages.
            var SHARES = [
              { label: t('stem.heatlab.useful_work_out', 'Useful work out'), pct: useful, colour: '#34d399', note: t('stem.heatlab.what_you_actually_paid_for', 'What you actually paid for.') },
              { label: t('stem.heatlab.lost_to_engineering', 'Lost to engineering'), pct: lostToEngineering, colour: '#fbbf24', note: t('stem.heatlab.friction_incomplete_combustion_pumping', 'Friction, incomplete combustion, pumping losses. In principle recoverable — this is where engineers work.') },
              { label: t('stem.heatlab.lost_to_the_second_law', 'Lost to the second law'), pct: lostToLaw, colour: '#f87171', note: t('stem.heatlab.waste_heat_that_must_be_dumped', 'Waste heat that must be dumped to the cold sink. No design can recover this; it is the price of running between two temperatures.') }
            ];
            return h('div', { className: 'mt-3 rounded-lg border p-2.5', style: { borderColor: 'rgba(52,211,153,0.4)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(240,253,244,0.85)' } },
              h('p', { className: 'text-[0.6875rem] font-black mb-2', style: { color: ink('#34d399') } }, htFmt(t('stem.heatlab.where_100_units_of_fuel_energy', 'Where 100 units of fuel energy go in a {0}'), [en.name.toLowerCase()])),
              h('div', {
                className: 'flex rounded-lg overflow-hidden',
                style: { height: '30px', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.28)' : 'rgba(100,116,139,0.24)') },
                role: 'img',
                'aria-label': htFmt(t('stem.heatlab.of_100_units_of_fuel_energy', 'Of 100 units of fuel energy in a {0}: {1}.'), [en.name.toLowerCase(), SHARES.map(function (s) { return htFmt(t('stem.heatlab.units', '{0} units {1}'), [s.pct.toFixed(0), s.label.toLowerCase()]); }).join(', ')])
              },
                SHARES.map(function (s) {
                  return h('div', {
                    key: s.label,
                    className: 'flex items-center justify-center',
                    // High contrast: black segments keyed by a thick colour stripe, so the
                    // percentage is legible whatever ink the theme forces.
                    style: isContrast
                      ? { width: s.pct + '%', minWidth: s.pct > 0 ? '2px' : '0', background: '#000000', borderTop: '6px solid ' + s.colour, borderRight: '1px solid #ffffff' }
                      : { width: s.pct + '%', minWidth: s.pct > 0 ? '2px' : '0', background: s.colour }
                  }, s.pct >= 9 ? h('span', { className: 'text-[0.625rem] font-black', 'data-ht-keep': isContrast ? undefined : 'true', style: { color: isContrast ? '#ffffff' : '#0b1020' } }, s.pct.toFixed(0) + '%') : null);
                })
              ),
              h('div', { className: 'mt-2 space-y-1' },
                SHARES.map(function (s) {
                  return h('div', { key: s.label, className: 'flex items-baseline gap-2' },
                    h('span', { 'aria-hidden': 'true', className: 'flex-shrink-0 rounded-full', style: { width: '10px', height: '10px', background: s.colour, display: 'inline-block' } }),
                    h('span', { className: 'flex-1' },
                      h('span', { className: 'text-[0.6875rem] font-bold', style: { color: isDark ? '#e2e8f0' : '#334155' } }, s.label + ' — ' + s.pct.toFixed(0) + '%'),
                      h('span', { className: 'block text-[0.625rem]', style: { color: isDark ? '#94a3b8' : '#64748b' } }, s.note)));
                })
              ),
              h('p', { className: 'text-[0.6875rem] mt-2 font-bold', style: { color: ink('#34d399') } },
                t('stem.heatlab.the_only_ways_to_raise_the', '🤔 The only ways to raise the ceiling are a hotter source or a colder sink. Which is easier to change on Earth, and why?'))
            );
          })() : null
        ),

        // ── 3D convection tank ──
        sec('convection3d', '#fb923c',
          heading('#fb923c', '🧊 10. ' + t('stem.heatlab.turn_it_over_convection_in_3d', 'Turn it over: convection in 3D')),
          h('p', { id: 'ht-convection3d-description', className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            t('stem.heatlab.a_flat_arrow_diagram_makes_convection', 'A flat arrow diagram makes convection look like a circle. It is not — it is a closed roll wrapping all the way round the tank. Drag to rotate, or use the buttons and arrow keys.')),

          // ── Stage C: convection with a real driver ──
          h('div', { className: 'rounded-lg border p-2.5 mb-2', 'data-ht-convection-model': 'true', style: panelStyle('#fb923c') },
            h('p', { className: 'text-[0.6875rem] font-black', style: { color: isContrast ? '#fbbf24' : ink('#fb923c') } },
              '🔥 ' + t('stem.heatlab.cv_title', 'Drive it: heater power, fluid and depth')),
            h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: softInk } },
              t('stem.heatlab.cv_intro', 'A 10 cm square heater plate under a layer of fluid whose top is held at 20 °C. Whether the fluid moves is decided by one number, the Rayleigh number Ra = gβΔT·L³ ÷ (να): buoyancy pushing against the fluid’s stickiness and the heat leaking away by conduction.')),
            h('div', { role: 'group', 'aria-label': t('stem.heatlab.cv_fluid_group', 'Fluid in the layer'), className: 'mt-1.5 flex flex-wrap gap-1' },
              ['water', 'oil', 'air'].map(function (id) {
                return pill(cvFluid === id, '#fb923c', FLUID_NAMES[id], function () { upd({ cvFluid: id }); },
                  t('stem.heatlab.cv_fluid_aria', 'Fill the layer with {f}').replace('{f}', FLUID_NAMES[id].toLowerCase()));
              })),
            h('div', { role: 'group', 'aria-label': t('stem.heatlab.cv_depth_group', 'Layer depth'), className: 'mt-1 flex flex-wrap gap-1' },
              [[0.01, t('stem.heatlab.cv_depth_dish', '1 cm dish')], [0.1, t('stem.heatlab.cv_depth_tank', '10 cm tank')]].map(function (o) {
                return pill(cvDepth === o[0], '#fb923c', o[1], function () { upd({ cvDepth: o[0] }); });
              })),
            h('div', { role: 'group', 'aria-label': t('stem.heatlab.cv_from_group', 'Where the heater is'), className: 'mt-1 flex flex-wrap gap-1' },
              [['below', t('stem.heatlab.cv_from_below', 'Heater underneath')], ['above', t('stem.heatlab.cv_from_above', 'Heater on top')]].map(function (o) {
                return pill(cvFrom === o[0], '#fb923c', o[1], function () { upd({ cvFrom: o[0] }); });
              })),
            slider('heat-cv-power', t('stem.heatlab.cv_power', 'Heater power'), -3, 2, 0.1, cvPowerExp,
              function (e) { upd({ cvPowerExp: parseFloat(e.target.value) }); }, fmtPowerW(cvPower), 'ht-cv-status'),
            h('div', { className: 'mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2' },
              [[t('stem.heatlab.cv_tile_dt', 'Plate above top'), fmt(cv.dT, cv.dT < 1 ? 3 : 1) + ' °C'],
               [t('stem.heatlab.cv_tile_ra', 'Rayleigh number'), bigNum(cv.Ra)],
               [t('stem.heatlab.cv_tile_nu', 'Nusselt number'), cv.Nu.toFixed(2)],
               [t('stem.heatlab.cv_tile_regime', 'Regime'), REGIME_NAMES[cv.regime]]
              ].map(function (p) {
                return h('div', { key: p[0], className: 'rounded-lg p-2 text-center min-w-0', style: { background: isContrast ? '#000000' : isDark ? 'rgba(148,163,184,0.1)' : 'rgba(251,146,60,0.08)', border: '1px solid ' + (isContrast ? '#ffffff' : 'rgba(251,146,60,0.3)') } },
                  h('p', { className: 'text-[0.625rem] font-bold', style: { color: softInk } }, p[0]),
                  h('p', { className: 'text-[0.8125rem] font-black break-words', style: { color: isContrast ? '#ffffff' : ink('#fb923c') } }, p[1]));
              })),
            h('p', { id: 'ht-cv-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', 'data-ht-cv-status': 'true', className: 'text-[0.6875rem] mt-2 leading-relaxed', style: { color: bodyInk } },
              h('b', null, REGIME_NAMES[cv.regime] + '. '), REGIME_WHY[cv.regime] + ' ' +
              (cvFrom === 'below'
                ? t('stem.heatlab.cv_story_below', 'Nu = {nu}: the moving fluid carries {pct}% of the heat, so the plate sits {dt} °C above the top instead of the {cd} °C conduction alone would need. Flow speed scale: {v}.')
                  .replace('{nu}', cv.Nu.toFixed(2)).replace('{pct}', fmt(cv.convectedShare * 100, 0))
                  .replace('{dt}', fmt(cv.dT, cv.dT < 1 ? 3 : 1)).replace('{cd}', fmt(cv.conductionDT, cv.conductionDT < 1 ? 3 : 1)).replace('{v}', cvSpeedText)
                : t('stem.heatlab.cv_story_above', 'All {p} cross the layer by conduction, so the top plate sits {dt} °C above the bottom. Move the heater underneath and the same power needs far less.')
                  .replace('{p}', fmtPowerW(cvPower)).replace('{dt}', fmt(cv.dT, cv.dT < 1 ? 3 : 1)))),
            cvFrom === 'below' ? h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: softInk } },
              t('stem.heatlab.cv_onset', 'In {f} {depth} deep, the fluid starts to move at about {on} and breaks into plumes at about {pl}. Depth enters as L³, so a deeper layer convects far more readily.')
                .replace('{f}', FLUID_NAMES[cvFluid].toLowerCase()).replace('{depth}', cvDepth === 0.1 ? '10 cm' : '1 cm')
                .replace('{on}', fmtPowerW(cv.onsetW)).replace('{pl}', fmtPowerW(cv.plumesW))) : null,
            !cv.valid ? h('p', { role: 'note', className: 'text-[0.6875rem] mt-1 font-bold', style: { color: isContrast ? '#ffffff' : (isDark ? '#fcd34d' : '#92400e') } },
              '⚠️ ' + t('stem.heatlab.cv_invalid', 'Outside this model: a {dt} °C difference changes the fluid’s properties a lot (water would boil, oil would smoke), so treat these numbers as rough.').replace('{dt}', fmt(cv.dT, 0))) : null,
            maths('convection', h('p', { className: 'text-[0.625rem] mt-1 font-mono break-words', style: { color: softInk } },
              'Ra = gβΔT·L³ ÷ (να)   P = Nu·k·A·ΔT ÷ L   Pr = ' + fmt(cv.Pr, cv.Pr < 10 ? 2 : 0))),
            h('p', { className: 'text-[0.625rem] mt-1 leading-relaxed', style: { color: softInk } },
              t('stem.heatlab.cv_assume', 'Model: properties fixed at 20 °C, no heat lost through the sides; Nu is the larger of the Hollands et al. (1975) and Globe and Dropkin (1959) correlations; convection starts at Ra = 1,708. The speed is the buoyancy speed √(gβΔT·L), an upper bound, scaled down near the onset.')),
            recordButton('convection', function () {
              return {
                fluid: cvFluid, depth_cm: cvDepth * 100, heatedFrom: cvFrom, power_W: cvPower, dT_K: cv.dT,
                Ra: cv.Ra, Nu: cv.Nu, regime: cv.regime, convectedPct: cv.convectedShare * 100, speed_mm_s: cv.speedMs * 1000
              };
            })
          ),

          h('div', { role: 'group', 'aria-label': t('stem.heatlab.interactive_3d_convection_tank','Interactive 3D convection tank'), 'aria-describedby': 'ht-convection3d-description', className: 'relative rounded-xl overflow-hidden border', style: { borderColor: 'rgba(251,146,60,0.4)', height: '300px', background: isDark ? '#0b1220' : '#dfe6ef' } },
            h('div', { ref: heat3dAttach, style: { position: 'absolute', inset: 0 } }),
            view3dStatus !== 'ready' ? h('div', {
              role: 'status',
              className: 'absolute inset-0 flex items-center justify-center text-center p-4',
              style: { background: isDark ? 'rgba(11,18,32,0.92)' : 'rgba(223,230,239,0.92)' }
            },
              h('p', { className: 'text-[0.6875rem] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } },
                view3dStatus === 'loading' ? t('stem.heatlab.loading_the_3d_tank', 'Loading the 3D tank…')
                  : (HEAT_3D_MISSING === 'host'
                    ? t('stem.heatlab.the_3d_tank_needs_a_newer', 'The 3D tank needs a newer host module than this build has. Everything else on this page still works — the 2D convection mode above shows the same loop in cross-section.')
                    : t('stem.heatlab.the_3d_tank_could_not_start', 'The 3D tank could not start on this device, usually because WebGL is unavailable or blocked. The 2D convection mode above shows the same loop in cross-section.')))
            ) : null
          ),
          h('p', { className: 'text-[0.625rem] mt-1 leading-relaxed', 'data-ht-3d-motion-note': 'true', style: { color: softInk } },
            prefersReducedMotion
              ? t('stem.heatlab.cv_3d_reduced', 'Reduced motion is on, so the dots in the tank stand still and the roll’s streamlines are drawn instead.')
              : t('stem.heatlab.cv_3d_note', 'The dots in the tank circulate at a speed set by the model for this regime. In a still layer they sit in rows, warm near the heater and cool near the top.')),

          h('div', {
            className: 'mt-2 rounded-lg p-2.5',
            role: 'group',
            'aria-label': t('stem.heatlab.convection_flow_path_heat_enters_warm_fluid','Convection flow path: heat enters, warm fluid rises, the ceiling cools it, dense fluid sinks, and the tank walls shape the loop.'),
            style: { background: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(251,146,60,0.07)', border: '1px solid rgba(251,146,60,0.28)' }
          },
            h('div', { role: 'list', className: 'flex flex-wrap items-center gap-1.5' }, heatFlowNodes),
            h('p', { className: 'text-[0.6875rem] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              t('stem.heatlab.read_the_loop_left_to_right', 'Read the loop left to right: heat in → rise → cool → sink → the boundary turns the flow back around.'))
          ),

          // The model snapshot describes the convection tank, so it lives with it
          // (it used to sit in the middle of the heating-curve section).
          h('div', { className: 'mt-2 rounded-xl border p-3', 'data-heat-3d-snapshot': 'true', role: 'group', 'aria-label': t('stem.heatlab.3d_convection_model_snapshot','3D convection model snapshot'), style: { borderColor: 'rgba(251,146,60,0.32)', background: isDark ? 'linear-gradient(135deg, rgba(15,23,42,0.92), rgba(124,45,18,0.28))' : 'linear-gradient(135deg, rgba(255,247,237,0.96), rgba(224,242,254,0.72))' } },
            h('div', { className: 'flex flex-wrap items-center justify-between gap-2' },
              h('div', null,
                h('div', { className: 'text-[0.625rem] font-black uppercase tracking-[0.18em]', style: { color: isDark ? '#fdba74' : '#c2410c' } }, t('stem.heatlab.model_snapshot', 'Model snapshot')),
                h('div', { className: 'mt-0.5 text-[0.6875rem] font-bold', style: { color: isDark ? '#e2e8f0' : '#334155' } }, part3d ? htFmt(t('stem.heatlab.inspecting', 'Inspecting {0}'), [part3d.label]) : t('stem.heatlab.full_convection_loop', 'Full convection loop'))
              ),
              h('span', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', className: 'rounded-full border px-2 py-1 text-[0.625rem] font-black uppercase tracking-wide', style: view3dStatus === 'ready' ? { borderColor: 'rgba(52,211,153,0.45)', background: 'rgba(52,211,153,0.12)', color: isDark ? '#bbf7d0' : '#166534' } : { borderColor: 'rgba(251,146,60,0.42)', background: 'rgba(251,146,60,0.12)', color: isDark ? '#fed7aa' : '#9a3412' } }, view3dStatus === 'ready' ? t('stem.heatlab.interactive_3d_ready', 'Interactive 3D ready') : (HEAT_3D_MISSING === 'host' ? t('stem.heatlab.n2d_fallback_guide_available', '2D fallback guide available') : (view3dStatus === 'loading' ? t('stem.heatlab.loading_3d_model', 'Loading 3D model') : t('stem.heatlab.n2d_fallback_guide_available', '2D fallback guide available'))))
            ),
            h('div', { className: 'mt-2 grid gap-2 sm:grid-cols-3' },
              h('div', { className: 'rounded-lg border p-2', style: { borderColor: isDark ? 'rgba(251,146,60,0.25)' : 'rgba(251,146,60,0.28)', background: isDark ? 'rgba(251,146,60,0.08)' : 'rgba(255,255,255,0.62)' } },
                h('div', { className: 'text-[0.625rem] font-black uppercase tracking-wide', style: { color: isDark ? '#fdba74' : '#c2410c' } }, t('stem.heatlab.focus', 'Focus')),
                h('div', { className: 'mt-0.5 text-[0.6875rem] font-black', style: { color: isDark ? '#f8fafc' : '#0f172a' } }, part3d ? part3d.label : t('stem.heatlab.full_loop', 'Full loop')),
                h('div', { className: 'mt-0.5 text-[0.625rem] leading-relaxed', style: { color: isDark ? '#cbd5e1' : '#475569' } }, part3d ? t('stem.heatlab.selected_hotspot_in_the_tank', 'Selected hotspot in the tank.') : t('stem.heatlab.choose_a_stage_to_inspect_its', 'Choose a stage to inspect its evidence.'))
              ),
              h('div', { className: 'rounded-lg border p-2', style: { borderColor: isDark ? 'rgba(251,146,60,0.25)' : 'rgba(251,146,60,0.28)', background: isDark ? 'rgba(14,165,233,0.08)' : 'rgba(255,255,255,0.62)' } },
                h('div', { className: 'text-[0.625rem] font-black uppercase tracking-wide', style: { color: isDark ? '#7dd3fc' : '#0369a1' } }, t('stem.heatlab.causal_direction', 'Causal direction')),
                h('div', { className: 'mt-0.5 text-[0.6875rem] font-black', style: { color: isDark ? '#f8fafc' : '#0f172a' } }, t('stem.heatlab.heat_in_rise_cool_sink', 'Heat in → rise → cool → sink')),
                h('div', { className: 'mt-0.5 text-[0.625rem] leading-relaxed', style: { color: isDark ? '#cbd5e1' : '#475569' } }, t('stem.heatlab.buoyancy_closes_the_loop', 'Buoyancy closes the loop.'))
              ),
              h('div', { className: 'rounded-lg border p-2', style: { borderColor: isDark ? 'rgba(251,146,60,0.25)' : 'rgba(251,146,60,0.28)', background: isDark ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.62)' } },
                h('div', { className: 'text-[0.625rem] font-black uppercase tracking-wide', style: { color: isDark ? '#c4b5fd' : '#6d28d9' } }, t('stem.heatlab.boundary_cue', 'Boundary cue')),
                h('div', { className: 'mt-0.5 text-[0.6875rem] font-black', style: { color: isDark ? '#f8fafc' : '#0f172a' } }, t('stem.heatlab.tank_walls_shape_the_roll', 'Tank walls shape the roll')),
                h('div', { className: 'mt-0.5 text-[0.625rem] leading-relaxed', style: { color: isDark ? '#cbd5e1' : '#475569' } }, t('stem.heatlab.the_return_flow_brings_dense_fluid', 'The return flow brings dense fluid back to the heater.'))
              )
            )
          ),

          h('div', { role: 'group', 'aria-label': t('stem.heatlab.3d_view_controls','3D view controls'), className: 'flex flex-wrap gap-1 mt-2' },
            [['◀', t('stem.heatlab.rotate_left', 'Rotate left'), function () { HEAT_VIEWER.nudge(-0.3, 0); }],
             ['▶', t('stem.heatlab.rotate_right', 'Rotate right'), function () { HEAT_VIEWER.nudge(0.3, 0); }],
             ['▲', t('stem.heatlab.tilt_up', 'Tilt up'), function () { HEAT_VIEWER.nudge(0, 0.2); }],
             ['▼', t('stem.heatlab.tilt_down', 'Tilt down'), function () { HEAT_VIEWER.nudge(0, -0.2); }],
             ['＋', t('stem.heatlab.zoom_in', 'Zoom in'), function () { HEAT_VIEWER.zoom(-0.6); }],
             ['－', t('stem.heatlab.zoom_out', 'Zoom out'), function () { HEAT_VIEWER.zoom(0.6); }],
             ['↺', t('stem.heatlab.reset_view', 'Reset view'), function () { HEAT_VIEWER.reset(); }]
            ].map(function (b) {
              return h('button', {
                key: b[1], type: 'button', 'aria-label': b[1], title: b[1],
                disabled: view3dStatus !== 'ready',
                onClick: b[2],
                className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold transition-colors',
                style: {
                  background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)',
                  color: isDark ? '#e2e8f0' : '#334155',
                  border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)'),
                  opacity: view3dStatus === 'ready' ? 1 : 0.45
                }
              }, b[0]);
            })
          ),

          // In high contrast the parts differ by surface as well as colour; say how.
          isContrast ? h('p', { className: 'text-[0.6875rem] mt-2', style: { color: '#ffffff' } },
            t('stem.heatlab.hc_3d_key', 'High-contrast key: heated base solid white, rising plume solid yellow, cool ceiling cyan wireframe, sinking edges magenta wireframe, tank walls white wireframe.')) : null,
          h('p', { className: 'text-[0.6875rem] font-bold mt-2 mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, t('stem.heatlab.pick_a_part_of_the_loop', 'Pick a part of the loop')),
          h('div', { className: 'flex flex-wrap gap-1' },
            HEAT_3D_PARTS.map(function (p) {
              var on = pick3d === p.id;
              return h('button', {
                key: p.id, type: 'button',
                'aria-pressed': on ? 'true' : 'false',
                'aria-label': htFmt(t('stem.heatlab.details_for', '{0} details for {1}'), [(on ? t('stem.heatlab.hide', 'Hide') : t('stem.heatlab.teacher_show', 'Show')), p.label]),
                onClick: function () {
                  upd({ pick3d: on ? null : p.id });
                  if (!on) {
                    pushOnce('parts3d', p.id);
                    if (typeof announceToSR === 'function') announceToSR(p.label + '. ' + p.desc);
                  }
                  if (typeof beep === 'function') beep();
                },
                className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold transition-colors',
                style: on
                  ? { background: p.color, color: '#0b1020', border: '1px solid ' + p.color }
                  : { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') }
              }, p.label);
            })
          ),
          part3d ? h('div', { role: 'status', className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: part3d.color + '80', background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.92)' } },
            h('p', { className: 'text-[0.6875rem] font-black mb-1', style: { color: ink(part3d.color) } }, part3d.label),
            h('p', { className: 'text-[0.6875rem] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, part3d.desc)
          ) : h('p', { className: 'text-[0.6875rem] mt-2', style: { color: isDark ? '#94a3b8' : '#64748b' } },
            t('stem.heatlab.pick_a_part_above_or_click', 'Pick a part above, or click it directly in the 3D view.')),
          h('p', { className: 'text-[0.6875rem] mt-2 font-bold', style: { color: ink('#fb923c') } },
            t('stem.heatlab.rotate_until_you_are_looking_straight', '🤔 Rotate until you are looking straight down. What shape is the flow from above, and why can this never happen in a solid?')),
          poeCard('heatrises')
        ),

        // ── 6. Stefan-Boltzmann ──
        sec('radiation', '#f472b6',
          heading('#f472b6', '📡 11. ' + t('stem.heatlab.radiation_has_a_fourth_power_law', 'Radiation has a fourth-power law')),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            t('stem.heatlab.everything_above_absolute_zero_radiates_the', 'Everything above absolute zero radiates. The power goes as T⁴ in kelvin, so a modest temperature rise makes a startling difference — and that single exponent explains thermal cameras, why embers glow, and why a small planet-wide warming matters.')),
          // Stage C: the surface finish sets ε (infrared emissivity = absorptivity).
          h('div', { role: 'group', 'aria-label': t('stem.heatlab.rad_surface_group', 'Surface finish'), className: 'flex flex-wrap gap-1 mb-1' },
            HEAT_SURFACES.map(function (s) {
              return pill(radSurf.id === s.id, '#f472b6', SURFACE_NAMES[s.id] + ' · ε ' + s.eps.toFixed(2), function () { upd({ radSurf: s.id }); },
                t('stem.heatlab.rad_surface_aria', 'Use {s}, infrared emissivity {e}').replace('{s}', SURFACE_NAMES[s.id].toLowerCase()).replace('{e}', s.eps.toFixed(2)));
            })),
          slider('heat-radt', t('stem.heatlab.surface_temp', 'Surface temp'), -20, 900, 5, radT,
            function (e) { upd({ radT: parseFloat(e.target.value) }); }, radT + ' °C', 'ht-radiation-status'),
          h('p', {
            id: 'ht-radiation-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', className: 'sr-only'
          }, htFmt(t('stem.heatlab.at_degrees_celsius_the_surface_emits', 'At {0} degrees Celsius the surface emits {1} watts. {2} Its peak wavelength is {3} micrometres.'), [radT, fmt(radGross, 0), (radNet > 0
              ? htFmt(t('stem.heatlab.it_sends_watts_net_to_the', 'It sends {0} watts net to the 20 degree room.'), [fmt(radNetMagnitude, 0)])
              : radNet < 0
                ? htFmt(t('stem.heatlab.it_absorbs_watts_net_from_the', 'It absorbs {0} watts net from the 20 degree room.'), [fmt(radNetMagnitude, 0)])
                : t('stem.heatlab.it_is_in_radiative_equilibrium_with', 'It is in radiative equilibrium with the 20 degree room.')), wienUm.toFixed(1)])),
          h('div', { className: 'mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2' },
            [[t('stem.heatlab.emitted', 'Emitted'), fmt(radGross, 0) + ' W'], [radNetLabel, fmt(radNetMagnitude, 0) + ' W'],
             [t('stem.heatlab.peak_wavelength', 'Peak wavelength'), wienUm.toFixed(1) + ' µm']
            ].map(function (p) {
              return h('div', { key: p[0], className: 'rounded-lg p-2 text-center', style: { background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(244,114,182,0.09)', border: '1px solid rgba(244,114,182,0.3)' } },
                h('p', { className: 'text-[0.625rem] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } }, p[0]),
                h('p', { className: 'text-sm font-black', style: { color: ink('#f472b6') } }, p[1]));
            })
          ),
          maths('radiation', h('p', { className: 'text-[0.6875rem] mt-2 font-mono', style: { color: isDark ? '#94a3b8' : '#64748b' } },
            htFmt(t('stem.heatlab.pemitted_ats_pnet_a_ts_troom', 'Pemitted = εσATs⁴   Pnet = εσA(Ts⁴ − Troom⁴)   σ = 5.67 × 10⁻⁸ W/m²K⁴   A = 1.8 m²   ε = {0}   λmax = 2898/Ts'), [radSurf.eps.toFixed(2)]))),
          radSurf.eps < 0.5 ? h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: bodyInk } },
            t('stem.heatlab.rad_low_eps', '{s} has ε = {e}: it emits only {pct}% of what a perfect emitter would, and by the same token absorbs only {pct}% of the infrared that reaches it. That is why foil blankets and silvered flasks work in both directions.')
              .replace('{s}', SURFACE_NAMES[radSurf.id]).replace('{e}', radSurf.eps.toFixed(2)).replace(/\{pct\}/g, fmt(radSurf.eps * 100, 0))) : null,
          h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            radT < 20
              ? htFmt(t('stem.heatlab.this_surface_is_colder_than_the', 'This surface is colder than the room, so the direction reverses: it still emits {0} W, but it absorbs {1} W more than it emits. Net radiation warms the surface.'), [fmt(radGross, 0), fmt(radNetMagnitude, 0)])
              : radT === 20
                ? t('stem.heatlab.the_surface_and_room_are_at', 'The surface and room are at the same temperature. Both still radiate, but equal power crosses each way, so the net transfer is zero — radiative equilibrium is not the absence of radiation.')
              : radT <= 40
                ? htFmt(t('stem.heatlab.this_surface_sends_w_net_to', 'This surface sends {0} W net to the room. Bare skin sits near 33 °C, not the 37 °C of your core; clothing changes the effective area and surface temperature. The spectrum peaks at {1} µm — deep infrared, invisible to your eye but exactly what a thermal camera detects.'), [fmt(radNetMagnitude, 0), wienUm.toFixed(0)])
              : (radT < 500
                ? htFmt(t('stem.heatlab.doubling_the_absolute_temperature', 'Doubling the absolute temperature multiplies radiated power by sixteen, not two. That is why an oven element at 300 °C throws far more heat than its temperature alone suggests — and why it still looks dark, since the peak is at {0} µm, well outside visible light.'), [wienUm.toFixed(1)])
                : htFmt(t('stem.heatlab.the_peak_has_moved_to_m', 'The peak has moved to {0} µm and the short-wavelength tail now reaches visible red, so the object glows — dull red, then orange, then white as it climbs. Nothing changed but the temperature.'), [wienUm.toFixed(1)]))),
          recordButton('radiation', function () {
            return { surface_C: radT, room_C: 20, emitted_W: radGross, net_W: radNet, peak_um: wienUm, finish: radSurf.id, emissivity: radSurf.eps };
          }),

          // ── Stage C: sunlight against infrared, surface by surface ──
          h('div', { className: 'mt-3 rounded-lg border p-2.5', 'data-ht-sun-panel': 'true', style: panelStyle('#f472b6') },
            h('p', { className: 'text-[0.6875rem] font-black', style: { color: isContrast ? '#fbbf24' : ink('#f472b6') } },
              '☀️ ' + t('stem.heatlab.rad_sun_title', 'Do dark colours attract heat?')),
            h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: bodyInk } },
              t('stem.heatlab.rad_sun_intro', 'Nothing attracts radiation. Each surface below receives the same 800 W/m² of sunlight; what differs is how much it absorbs. A surface absorbs exactly as well as it emits at each wavelength (Kirchhoff’s law), but sunlight and infrared are different wavelengths, so a surface can be pale in sunlight and nearly black in the infrared.')),
            h('div', { role: 'region', tabIndex: 0, 'aria-label': t('stem.heatlab.rad_sun_region', 'Surfaces in sunlight, table scrolls sideways'), className: 'mt-1.5 overflow-x-auto rounded-lg border', style: { borderColor: isContrast ? '#ffffff' : 'rgba(244,114,182,0.35)' } },
              h('table', { className: 'text-[0.6875rem]', style: { borderCollapse: 'collapse', minWidth: '100%' } },
                h('caption', { className: 'sr-only' }, t('stem.heatlab.rad_sun_caption', 'Sunlight absorbed, infrared emissivity and temperature in full sun for five surfaces')),
                h('thead', null, h('tr', null, [
                  t('stem.heatlab.rad_sun_col_surface', 'Surface'), t('stem.heatlab.rad_sun_col_abs', 'Absorbs sunlight'),
                  t('stem.heatlab.rad_sun_col_eps', 'Infrared ε'), t('stem.heatlab.rad_sun_col_emit', 'Emits at 40 °C'),
                  t('stem.heatlab.rad_sun_col_sun', 'In full sun')
                ].map(function (c) {
                  return h('th', { key: c, scope: 'col', className: 'text-left px-1.5 py-1 font-bold', style: { color: softInk, whiteSpace: 'nowrap', borderBottom: '1px solid ' + (isContrast ? '#ffffff' : 'rgba(244,114,182,0.35)') } }, c);
                }))),
                h('tbody', null, sunRows.map(function (x) {
                  var cell = { color: bodyInk, whiteSpace: 'nowrap', borderBottom: '1px solid ' + (isContrast ? '#ffffff' : 'rgba(148,163,184,0.18)') };
                  return h('tr', { key: x.s.id, 'data-ht-sun-row': x.s.id },
                    h('th', { scope: 'row', className: 'text-left px-1.5 py-1 font-bold', style: cell }, SURFACE_NAMES[x.s.id]),
                    h('td', { className: 'px-1.5 py-1 font-mono', style: cell }, fmt(x.s.aSun * 100, 0) + '% · ' + fmt(x.r.absorbedWm2, 0) + ' W/m²'),
                    h('td', { className: 'px-1.5 py-1 font-mono', style: cell }, x.s.eps.toFixed(2)),
                    h('td', { className: 'px-1.5 py-1 font-mono', style: cell }, fmt(x.r.emittedAtWm2, 0) + ' W/m²'),
                    h('td', { className: 'px-1.5 py-1', style: cell },
                      h('span', { className: 'flex items-center gap-1.5' },
                        h('span', { 'aria-hidden': 'true', style: { display: 'inline-block', height: 8, width: Math.round(56 * (x.r.eqC - 30) / Math.max(1, sunMaxC - 30)) + 4, borderRadius: 3, background: isContrast ? '#ffffff' : heatRampColour(clamp((x.r.eqC + 20) / 140, 0, 1)) } }),
                        h('span', { className: 'font-mono' }, fmt(x.r.eqC, 0) + ' °C'))));
                })))),
            (function () {
              var b = sunRows.filter(function (x) { return x.s.id === 'black'; })[0].r, w = sunRows.filter(function (x) { return x.s.id === 'white'; })[0].r;
              var ag = sunRows.filter(function (x) { return x.s.id === 'silver'; })[0].r;
              return h('p', { className: 'text-[0.6875rem] mt-1.5 leading-relaxed', style: { color: bodyInk } },
                t('stem.heatlab.rad_sun_story', 'Black and white paint radiate almost equally ({eb} and {ew} W/m² at 40 °C), but in full sun black absorbs {ab} W/m² against white’s {aw}, so black settles near {tb} °C while white stays near {tw} °C. Polished silver is the surprise: it absorbs little sunlight but can hardly radiate, so it still warms to {ts} °C.')
                  .replace('{eb}', fmt(b.emittedAtWm2, 0)).replace('{ew}', fmt(w.emittedAtWm2, 0)).replace('{ab}', fmt(b.absorbedWm2, 0)).replace('{aw}', fmt(w.absorbedWm2, 0))
                  .replace('{tb}', fmt(b.eqC, 0)).replace('{tw}', fmt(w.eqC, 0)).replace('{ts}', fmt(ag.eqC, 0)));
            })(),
            h('p', { className: 'text-[0.625rem] mt-1 leading-relaxed', style: { color: softInk } },
              t('stem.heatlab.rad_sun_assume', 'Model: a flat panel facing the sun with an insulated back, in 30 °C air with a light breeze (h = 10 W/m²K), exchanging infrared with surroundings at air temperature. Values are typical; real paints vary with age and dirt.'))
          ),

          // ── Stage C: vacuum flask builder, four heat paths side by side ──
          h('div', { className: 'mt-3 rounded-lg border p-2.5', 'data-ht-flask': 'true', style: panelStyle('#f472b6') },
            h('p', { className: 'text-[0.6875rem] font-black', style: { color: isContrast ? '#fbbf24' : ink('#f472b6') } },
              '🥤 ' + t('stem.heatlab.fl_title', 'Build a vacuum flask')),
            h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: bodyInk } },
              t('stem.heatlab.fl_intro', '0.5 kg of coffee at 90 °C in a 20 °C room, inside a double-walled glass bottle. Switch each feature on and watch which heat path it closes. The paths run side by side, so a flask is only as good as its leakiest path.')),
            h('div', { role: 'group', 'aria-label': t('stem.heatlab.fl_group', 'Flask features'), className: 'mt-1.5 flex flex-wrap gap-1.5' },
              [['flVacuum', flOpts.vacuum, '🫙 ' + t('stem.heatlab.fl_vacuum', 'Vacuum between the walls')],
               ['flSilver', flOpts.silver, '🪞 ' + t('stem.heatlab.fl_silver', 'Silvered walls')],
               ['flStopper', flOpts.stopper, '🍾 ' + t('stem.heatlab.fl_stopper', 'Stopper')]].map(function (o) {
                return h('button', {
                  key: o[0], type: 'button', 'aria-pressed': o[1] ? 'true' : 'false',
                  onClick: function () { var p = {}; p[o[0]] = !o[1]; upd(p); },
                  className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(o[1])
                }, o[2]);
              })),
            (function () {
              var s = flRun.start;
              var paths = [
                ['gas', t('stem.heatlab.fl_path_gas', 'Gas in the gap (conduction)'), s.gasW],
                ['rad', t('stem.heatlab.fl_path_rad', 'Radiation across the gap'), s.radW],
                ['neck', t('stem.heatlab.fl_path_neck', 'Glass neck (conduction)'), s.neckW],
                ['top', flOpts.stopper ? t('stem.heatlab.fl_path_stopper', 'Through the stopper') : t('stem.heatlab.fl_path_open', 'Open top (convection and evaporation)'), s.topW]
              ];
              var big = paths.reduce(function (a, b) { return b[2] > a[2] ? b : a; }, paths[0]);
              return h('div', { className: 'mt-2', 'data-ht-flask-paths': 'true' },
                h('p', { className: 'text-[0.6875rem] font-bold', style: { color: softInk } }, t('stem.heatlab.fl_paths_head', 'Heat leaving the 90 °C coffee, path by path')),
                h('dl', { className: 'mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-0.5 text-[0.6875rem]' },
                  paths.concat([['total', t('stem.heatlab.fl_path_total', 'Total'), s.totalW]]).map(function (p, i) {
                    return [
                      h('dt', { key: 'dt' + i, style: { color: softInk, fontWeight: p[0] === 'total' ? 700 : 400 } }, p[1]),
                      h('dd', { key: 'dd' + i, className: 'font-mono font-bold text-right', style: { color: bodyInk } },
                        fmtW(p[2]) + (p[0] === 'total' ? '' : ' · ' + fmt(s.totalW > 0 ? p[2] / s.totalW * 100 : 0, 0) + '%'))
                    ];
                  })),
                h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { color: bodyInk } },
                  t('stem.heatlab.fl_biggest', 'The biggest leak now is {path}, {pct}% of the heat. After 6 hours the coffee is at {t6} °C; it falls to 60 °C after {to60}.')
                    .replace('{path}', big[1].toLowerCase()).replace('{pct}', fmt(s.totalW > 0 ? big[2] / s.totalW * 100 : 0, 0))
                    .replace('{t6}', fmt(flRun.at6hC, 1))
                    .replace('{to60}', isFinite(flRun.to60S) ? heatTimeLabel(flRun.to60S) : t('stem.heatlab.fl_over_12h', 'more than 12 hours'))));
            })(),
            h('div', { className: 'mt-2 rounded-lg overflow-hidden border', style: { borderColor: isContrast ? '#ffffff' : 'rgba(244,114,182,0.35)', height: '190px' } },
              h('canvas', {
                ref: flaskRef, role: 'img',
                'aria-label': t('stem.heatlab.fl_chart_aria', 'Coffee temperature over 12 hours. Your build: {y} °C after 6 hours. A plain open double wall: {p} °C. A real flask with all three features: {f} °C.')
                  .replace('{y}', fmt(flRun.at6hC, 1)).replace('{p}', fmt(flRefs.plain.at6hC, 1)).replace('{f}', fmt(flRefs.full.at6hC, 1)),
                style: { width: '100%', height: '100%', display: 'block' }
              })),
            maths('flask', h('p', { className: 'text-[0.625rem] mt-1 font-mono break-words', 'data-ht-flask-ledger': 'true', style: { color: softInk } },
              t('stem.heatlab.fl_ledger', 'Energy check over 12 h: the four paths carried {out}; the coffee lost C·ΔT = {drop} (difference {diff} J).')
                .replace('{out}', fmtJ(flRun.outJ)).replace('{drop}', fmtJ(flRun.storedDropJ)).replace('{diff}', Math.abs(flRun.residualJ) < 1e-6 ? '0' : flRun.residualJ.toExponential(1)))),
            h('p', { className: 'text-[0.625rem] mt-1 leading-relaxed', style: { color: softInk } },
              t('stem.heatlab.fl_assume', 'Model: a 5 mm gap between glass walls (ε 0.9, or 0.03 silvered); still air in the gap conducts and is too thin to convect; the outer wall loses heat to the room at 10 W/m²K; the glass neck joining the walls always leaks; an open top loses heat mainly by evaporation, a rough figure.')),
            recordButton('flask', function () {
              var s = flRun.start;
              return {
                vacuum: flOpts.vacuum, silvered: flOpts.silver, stopper: flOpts.stopper,
                start_W: s.totalW, gas_W: s.gasW, rad_W: s.radW, neck_W: s.neckW, top_W: s.topW,
                T6h_C: flRun.at6hC, to60_h: isFinite(flRun.to60S) ? flRun.to60S / 3600 : null
              };
            })
          ),
          poeCard('equilibrium'),
          poeCard('darkcolour')
        ),

        // ── 7. thermal expansion ──
        sec('expansion', '#22d3ee',
          heading('#22d3ee', '📏 12. ' + t('stem.heatlab.thermal_expansion_why_bridges_have_gaps', 'Thermal expansion: why bridges have gaps')),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            t('stem.heatlab.heat_something_and_it_grows_the', 'Heat something and it grows. The effect is tiny per metre and per degree, which is exactly why it catches engineers out over long spans and wide temperature swings.')),
          h('div', { className: 'flex flex-wrap gap-1 mb-1' },
            EXPANSION.map(function (e) {
              return pill(expMatId === e.id, '#22d3ee', e.name, function () {
                upd({ expMatId: e.id });
                pushOnce('expTried', e.id);
                if (typeof beep === 'function') beep();
              }, htFmt(t('stem.heatlab.use', 'Use {0}'), [e.name]));
            })
          ),
          slider('heat-explen', t('stem.heatlab.length', 'Length'), 1, 1000, 1, expLen,
            function (e) { upd({ expLen: parseFloat(e.target.value) }); }, fmt(expLen, 0) + ' m'),
          slider('heat-expdt', t('stem.heatlab.temp_swing', 'Temp swing'), 1, 120, 1, expDT,
            function (e) { upd({ expDT: parseFloat(e.target.value) }); }, expDT + ' K'),
          h('div', { className: 'mt-2 rounded-lg p-2.5 text-center', style: { background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(34,211,238,0.09)', border: '1px solid rgba(34,211,238,0.35)' } },
            h('p', { className: 'text-[0.625rem] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } }, t('stem.heatlab.it_grows_by', 'It grows by')),
            h('p', { className: 'text-lg font-black', style: { color: ink('#22d3ee') } },
              expDelta >= 1 ? expDelta.toFixed(2) + ' m' : (expDelta * 1000).toFixed(1) + ' mm'),
            h('p', { className: 'text-[0.625rem] font-mono mt-0.5', style: { color: isDark ? '#94a3b8' : '#475569' } },
              'ΔL = αLΔT = ' + expMat.alpha.toExponential(1) + ' × ' + fmt(expLen, 0) + ' × ' + expDT)
          ),
          h('p', { className: 'text-[0.6875rem] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            h('b', null, expMat.name + ': '), expMat.note),
          expDelta > 0.05 ? h('p', { className: 'text-[0.6875rem] mt-1.5 font-bold', style: { color: ink('#22d3ee') } },
            htFmt(t('stem.heatlab.that_is_mm_of_movement_where', '🤔 That is {0} mm of movement. Where does it go if the ends are bolted down — and what happens to the material instead?'), [(expDelta * 1000).toFixed(0)])) : null,
          recordButton('expansion', function () {
            return { material: expMat.id, alpha_perK: expMat.alpha, length_m: expLen, dT_K: expDT, dL_mm: expDelta * 1000 };
          })
        ),

        // ── 8. everyday cases ──
        sec('spot', '#60a5fa',
          heading('#60a5fa', '🌍 13. ' + t('stem.heatlab.spot_the_mechanism', 'Spot the mechanism')),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            t('stem.heatlab.each_of_these_beats_heat_transfer', 'Each of these beats heat transfer in a different way. Pick one and name the mechanism before you read the answer.')),
          // A real choice now: the mechanism and the explanation stay hidden
          // until the learner names one, and only naming counts for the quest.
          h('div', { className: 'space-y-1' },
            EVERYDAY.map(function (ev, i) {
              var on = d.everydayPick === i;
              var answers = d.everydayAnswers && typeof d.everydayAnswers === 'object' ? d.everydayAnswers : {};
              var chosen = answers[ev.key || ev.name] || null;
              var panelId = 'ht-spot-' + i;
              var choices = [
                { id: 'conduction', label: t('stem.heatlab.mech_conduction', 'Conduction') },
                { id: 'convection', label: t('stem.heatlab.mech_convection', 'Convection') },
                { id: 'radiation', label: t('stem.heatlab.mech_radiation', 'Radiation') },
                { id: 'evaporation', label: t('stem.heatlab.mech_evaporation', 'Evaporation') },
                { id: 'all', label: t('stem.heatlab.mech_all', 'All three') }
              ];
              var right = chosen ? ev.accept.indexOf(chosen) !== -1 : false;
              return h('div', { key: ev.name, className: 'rounded-lg border', style: on
                  ? { background: isContrast ? '#000000' : 'rgba(96,165,250,0.16)', borderColor: isContrast ? '#fbbf24' : '#60a5fa' }
                  : { background: isContrast ? '#000000' : isDark ? 'rgba(148,163,184,0.07)' : 'rgba(255,255,255,0.9)', borderColor: isContrast ? '#ffffff' : isDark ? 'rgba(148,163,184,0.22)' : 'rgba(100,116,139,0.2)' } },
                h('button', {
                  type: 'button',
                  'aria-expanded': on ? 'true' : 'false',
                  'aria-controls': panelId,
                  onClick: function () {
                    upd({ everydayPick: on ? null : i });
                    if (typeof beep === 'function') beep();
                  },
                  className: 'w-full min-h-11 text-left rounded-lg px-2.5 py-2 transition-colors',
                  style: { background: 'transparent', border: 'none' }
                },
                  h('span', { className: 'flex items-center gap-2' },
                    h('span', { className: 'text-sm', 'aria-hidden': 'true' }, ev.icon),
                    h('span', { className: 'flex-1' },
                      h('span', { className: 'block text-[0.6875rem] font-bold', style: { color: isContrast ? '#ffffff' : isDark ? '#fff' : '#1e293b' } }, ev.name),
                      h('span', { className: 'block text-[0.6875rem]', style: { color: softInk } },
                        chosen ? ev.mech : t('stem.heatlab.spot_unanswered', 'Not answered yet'))),
                    h('span', { className: 'text-[0.6875rem] font-bold', 'aria-hidden': 'true', style: { color: isContrast ? '#fbbf24' : ink('#60a5fa') } }, on ? '▾' : '›')
                  )
                ),
                on ? h('div', { id: panelId, className: 'px-2.5 pb-2' },
                  h('div', { role: 'group', 'aria-label': t('stem.heatlab.spot_choose', 'Which mechanism does {name} beat or use most?').replace('{name}', ev.name), className: 'flex flex-wrap gap-1' },
                    h('p', { className: 'w-full text-[0.6875rem] font-bold', style: { color: bodyInk } },
                      t('stem.heatlab.spot_choose', 'Which mechanism does {name} beat or use most?').replace('{name}', ev.name)),
                    choices.map(function (ch) {
                      return pill(chosen === ch.id, '#60a5fa', ch.label, function () {
                        if (chosen) return;   // first answer stands; the explanation is now visible
                        var next = Object.assign({}, answers);
                        next[ev.key || ev.name] = ch.id;
                        upd({ everydayAnswers: next });
                        if (typeof announceToSR === 'function') {
                          announceToSR((ev.accept.indexOf(ch.id) !== -1 ? t('stem.heatlab.spot_right', 'Yes.') : t('stem.heatlab.spot_wrong', 'Not quite.')) + ' ' + ev.mech + '. ' + ev.desc);
                        }
                      }, ch.label + (chosen ? '' : ' — ' + t('stem.heatlab.spot_answer_aria', 'answer for {name}').replace('{name}', ev.name)));
                    })
                  ),
                  chosen ? h('div', { role: 'status', className: 'mt-1.5' },
                    h('p', { className: 'text-[0.6875rem] font-black', style: { color: isContrast ? '#ffffff' : right ? ink('#16a34a') : (isDark ? '#fcd34d' : '#92400e') } },
                      (right ? '✅ ' + t('stem.heatlab.spot_right', 'Yes.') : '🔁 ' + t('stem.heatlab.spot_wrong', 'Not quite.')) + ' ' + ev.mech),
                    h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: bodyInk } }, ev.desc)
                  ) : null
                ) : null
              );
            })
          )
        ),

        // ── entropy ──
        sec('entropy', '#f472b6',
          heading('#f472b6', '🎲 14. ' + t('stem.heatlab.entropy_why_heat_only_goes_one', 'Entropy: why heat only goes one way')),
          h('p', { id: 'ht-entropy-description', className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            t('stem.heatlab.nothing_forbids_a_cold_cup_warming', 'Nothing forbids a cold cup warming itself by cooling the room — energy would still be conserved. It does not happen because of counting. Two blocks share 80 units of energy; the graph plots how many ways each split can be arranged.')),
          h('div', { className: 'rounded-lg overflow-hidden border mb-2', style: { borderColor: 'rgba(244,114,182,0.35)', height: '190px' } },
            h('canvas', {
              ref: entropyRef, role: 'img',
              'data-a11y-static': 'true',
              'aria-describedby': 'ht-entropy-description',
              'aria-label': htFmt(t('stem.heatlab.log_of_the_number_of_arrangements', 'Log of the number of arrangements against how the 80 energy units are split between two equal blocks. The curve peaks sharply at an even split of {0} units each. The current split of {1} units is {2} less likely than the peak.'), [entPeakAt, entSplit, (entOddsLog10 > 1 ? htFmt(t('stem.heatlab.n10_to_the_power_times', '10 to the power {0} times'), [entOddsLog10.toFixed(0)]) : t('stem.heatlab.only_slightly', 'only slightly'))]),
              style: { width: '100%', height: '100%', display: 'block' }
            })),
          slider('heat-entropy', t('stem.heatlab.units_in_block_a', 'Units in block A'), 0, ENT_Q, 1, entSplit,
            function (e) { upd({ entSplit: parseFloat(e.target.value) }); }, entSplit + ' / ' + ENT_Q),
          h('div', { className: 'mt-2 grid grid-cols-2 gap-2' },
            h('div', { className: 'rounded-lg p-2.5 text-center', style: { background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(244,114,182,0.09)', border: '1px solid rgba(244,114,182,0.32)' } },
              h('p', { className: 'text-[0.625rem] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } }, t('stem.heatlab.arrangements_at_this_split', 'Arrangements at this split')),
              h('p', { className: 'text-sm font-black', style: { color: ink('#f472b6') } }, '10^' + (entHere / Math.LN10).toFixed(1))),
            h('div', { className: 'rounded-lg p-2.5 text-center', style: { background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(244,114,182,0.09)', border: '1px solid rgba(244,114,182,0.32)' } },
              h('p', { className: 'text-[0.625rem] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } }, t('stem.heatlab.times_rarer_than_even', 'Times rarer than even')),
              h('p', { className: 'text-sm font-black', style: { color: ink(entOddsLog10 < 0.5 ? '#34d399' : '#fbbf24') } }, entOddsLog10 < 0.05 ? t('stem.heatlab.at_the_peak', 'at the peak') : '10^' + entOddsLog10.toFixed(1)))
          ),
          h('p', { className: 'text-[0.6875rem] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            entAtPeak
              ? t('stem.heatlab.you_are_exactly_at_the_peak', 'You are exactly at the peak: the two equal blocks hold the same number of energy units. In this deliberately tiny model, ordinary fluctuations away from the peak are still visible.')
              : entNearPeak
                ? t('stem.heatlab.this_is_near_equilibrium_not_exactly', 'This is near equilibrium, not exactly at it. A 120-oscillator teaching model visibly fluctuates among nearby splits; only when the particle count becomes macroscopic do large reverse flows become effectively impossible.')
              : htFmt(t('stem.heatlab.this_lopsided_split_is_about_10', 'This lopsided split is about 10^{0} times rarer than the even one. That is the whole of the second law: heat flows toward the split with more arrangements, not because it is forced to, but because the alternatives are outnumbered beyond counting.'), [entOddsLog10.toFixed(0)])),
          maths('entropy', h('p', { className: 'text-[0.6875rem] mt-1 font-mono', style: { color: isDark ? '#94a3b8' : '#64748b' } },
            t('stem.heatlab.s_k_ln_c_q_n', 'S = k ln Ω    Ω = C(q+N−1, q) for q units among N oscillators'))),
          h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            t('stem.heatlab.entropy_is_not_mess_it_is', 'Entropy is not mess. It is how many ways the energy can be arranged — and spreading it out simply wins by an overwhelming margin.'))
        ),

        // ── heat pumps ──
        sec('heatpumps', '#22d3ee',
          heading('#22d3ee', '🔄 15. ' + t('stem.heatlab.heat_pumps_the_engine_in_reverse', 'Heat pumps: the engine in reverse')),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            t('stem.heatlab.run_a_heat_engine_backwards_and', 'Run a heat engine backwards and you spend work to move heat up the temperature gradient. Because you are moving heat rather than making it, you get out more than you put in — and no law is broken.')),
          slider('heat-hp-out', t('stem.heatlab.outdoor_temp', 'Outdoor temp'), -20, 20, 1, hpOut,
            function (e) { upd({ hpOut: parseFloat(e.target.value) }); }, hpOut + ' °C'),
          slider('heat-hp-in', t('stem.heatlab.indoor_temp', 'Indoor temp'), 15, 26, 1, hpIn,
            function (e) { upd({ hpIn: parseFloat(e.target.value) }); }, hpIn + ' °C'),
          h('div', { className: 'mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2' },
            [[t('stem.heatlab.ideal_cop', 'Ideal COP'), hpModel.heating ? hpIdealCOP.toFixed(1) : '—', '#22d3ee'],
             [t('stem.heatlab.teaching_estimate_cop', 'Teaching estimate COP'), hpModel.heating ? hpRealCOP.toFixed(1) : '—', '#0891b2'],
             [t('stem.heatlab.heat_per_1_kw_in', 'Heat per 1 kW in'), hpModel.heating ? hpRealCOP.toFixed(1) + ' kW' : '—', '#f59e0b']
            ].map(function (p) {
              return h('div', { key: p[0], className: 'rounded-lg p-2 text-center', style: { background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(34,211,238,0.09)', border: '1px solid rgba(34,211,238,0.32)' } },
                h('p', { className: 'text-[0.625rem] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } }, p[0]),
                h('p', { className: 'text-sm font-black', style: { color: ink(p[2]) } }, p[1]));
            })
          ),
          h('div', { className: 'mt-2 rounded-lg overflow-hidden border', style: { borderColor: 'rgba(34,211,238,0.35)', height: '190px' } },
            h('canvas', {
              ref: hpRef, role: 'img',
              'data-a11y-static': 'true',
              'aria-describedby': 'ht-hp-curve-description',
              'aria-label': htFmt(t('stem.heatlab.how_the_teaching_estimate_cop_changes', 'How the teaching-estimate COP changes with outdoor temperature, for a {0} degree indoor target. It falls from about {1} at 15 degrees outdoors to about {2} at minus 20, and the dashed line marks 1.0, where an electric bar heater would do just as well. {3}'), [hpIn, (heatPumpModel(15, hpIn).realisticCOP || 0).toFixed(1), (heatPumpModel(-20, hpIn).realisticCOP || 0).toFixed(1), (hpModel.heating ? htFmt(t('stem.heatlab.you_are_at_degrees_outdoors_cop', 'You are at {0} degrees outdoors, COP {1}.'), [hpOut, hpRealCOP.toFixed(1)]) : '')]),
              style: { width: '100%', height: '100%', display: 'block' }
            })),
          h('p', { id: 'ht-hp-curve-description', className: 'text-[0.625rem] mt-1', style: { color: isDark ? '#94a3b8' : '#64748b' } },
            t('stem.heatlab.the_curve_is_the_teaching_estimate', 'The curve is the teaching estimate, not a product rating. It never touches 1.0 — a heat pump still beats a bar heater in the cold, just by far less.')),
          hpModel.heating ? maths('heatpumps', h('p', { className: 'text-[0.6875rem] mt-2 font-mono', style: { color: isDark ? '#94a3b8' : '#64748b' } },
            htFmt(t('stem.heatlab.cop_ideal_t_hot_t_hot', 'COP_ideal = T_hot / (T_hot − T_cold) = {0} / {1} K'), [hpTh.toFixed(0), hpModel.liftK.toFixed(0)])))
            : h('div', { role: 'status', className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(34,211,238,0.4)', background: isDark ? 'rgba(15,23,42,0.65)' : 'rgba(236,254,255,0.9)' } },
              h('p', { className: 'text-[0.6875rem] font-bold', style: { color: isDark ? '#67e8f9' : '#0e7490' } },
                t('stem.heatlab.no_heating_lift_is_required_outdoor', 'No heating lift is required. Outdoor air is already as warm as or warmer than the indoor target, so heating-mode COP is undefined. Lower the outdoor temperature or raise the indoor target to model heating.'))),
          hpModel.heating ? h('p', { className: 'text-[0.6875rem] mt-1.5 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            htFmt(t('stem.heatlab.an_electric_bar_heater_is_exactly', 'An electric bar heater is exactly 1.0: every joule of electricity becomes one joule of heat. The teaching estimate is {0}, using a refrigerant 5 K colder than outdoors and 8 K hotter than the room, 45% of the resulting cycle limit, auxiliary power and a cold-weather defrost penalty. It is capped at {1} and is not a product rating.'), [hpRealCOP.toFixed(1), hpModel.practicalCap])) : null,
          hpModel.heating ? h('p', { className: 'text-[0.6875rem] mt-1.5 leading-relaxed', style: { color: hpOut <= -10 ? ink('#fbbf24') : (isDark ? '#cbd5e1' : '#475569') } },
            hpOut <= -10
              ? t('stem.heatlab.notice_what_the_cold_does_as', '⚠️ Notice what the cold does. As the outdoor temperature falls the gap widens, the COP collapses, and the pump has to work far harder for the same warmth. This is the real engineering problem with heat pumps in cold climates, and it falls straight out of the Carnot expression.')
              : t('stem.heatlab.drag_the_outdoor_temperature_down_towards', 'Drag the outdoor temperature down towards −20 °C and watch what happens to the COP. The reason is the same denominator that caps every heat engine.')) : null,
          recordButton('heat-pump', function () {
            return { outdoor_C: hpOut, indoor_C: hpIn, lift_K: hpIn - hpOut, idealCOP: hpModel.heating ? hpIdealCOP : null, teachingCOP: hpModel.heating ? hpRealCOP : null };
          }),
          // The old open "🤔 fridge" question is now a predict-check-explain card,
          // so the learner commits to an answer and gets feedback on the idea used.
          poeCard('fridge')
        ),

        // ── Lab notebook: every recorded trial, sortable, plottable, exportable ──
        sec('notebook', '#a78bfa',
          heading('#a78bfa', '📓 16. ' + t('stem.heatlab.nb_title', 'Lab notebook')),
          h('p', { className: 'text-[0.6875rem] mb-2 leading-relaxed', style: { color: softInk } },
            t('stem.heatlab.nb_intro', 'Every section has a Record trial button. Each press adds one row here with the settings and the model’s results, newest 200 kept. Filter by experiment, sort a column, plot one column against another, and export.')),
          nbTotal === 0
            ? h('p', { className: 'text-[0.6875rem] italic', 'data-ht-nb-empty': 'true', style: { color: softInk } },
              t('stem.heatlab.nb_empty', 'No trials yet. Change a setting in any section, then press Record trial.'))
            : h('div', { 'data-ht-notebook': 'true' },
              h('div', { role: 'group', 'aria-label': t('stem.heatlab.nb_filter', 'Show trials from'), className: 'flex flex-wrap gap-1' },
                [pill(nbKind === 'all', '#a78bfa', t('stem.heatlab.nb_all', 'All') + ' (' + nbTotal + ')', function () { upd({ nbKind: 'all' }); setNbConfirm(null); },
                  __alloOneWord(t('stem.heatlab.nb_all_aria', 'Show all {n} trials').replace('{n}', String(nbTotal))))].concat(nbKinds.map(function (k) {
                  return pill(nbKind === k.kind, '#a78bfa', kindLabel(k.kind) + ' (' + k.count + ')', function () { upd({ nbKind: k.kind }); setNbConfirm(null); },
                    __alloOneWord(t('stem.heatlab.nb_kind_aria', 'Show only {kind} trials, {n} rows').replace('{kind}', kindLabel(k.kind)).replace('{n}', String(k.count))));
                }))),
              h('div', { className: 'mt-2 overflow-x-auto rounded-lg border', role: 'region', tabIndex: 0,
                'aria-label': t('stem.heatlab.nb_table_region', 'Notebook table, scrolls sideways'),
                style: { borderColor: isContrast ? '#ffffff' : 'rgba(167,139,250,0.35)' } },
                h('table', { className: 'text-[0.6875rem]', style: { borderCollapse: 'collapse', minWidth: '100%' } },
                  h('caption', { className: 'sr-only' }, nbKind === 'all' ? t('stem.heatlab.nb_caption_all', 'All recorded trials') : __alloOneWord(t('stem.heatlab.nb_caption_kind', '{kind} trials').replace('{kind}', kindLabel(nbKind)))),
                  h('thead', null, h('tr', null,
                    (nbKind === 'all'
                      ? [['#', null], [t('stem.heatlab.nb_col_kind', 'Experiment'), null], [t('stem.heatlab.nb_col_time', 'Time'), 'at'], [t('stem.heatlab.nb_col_summary', 'Summary'), null]]
                      : [['#', null], [t('stem.heatlab.nb_col_time', 'Time'), 'at']].concat(nbCols.map(function (c2) { return [c2, c2]; })))
                      .concat([[t('stem.heatlab.nb_col_actions', 'Delete'), null]])
                      .map(function (cdef, ci) {
                        var sortable = !!cdef[1] && (nbKind !== 'all' || cdef[1] === 'at');
                        var on = sortable && nbSortCol === cdef[1];
                        var thStyle = { color: softInk, borderBottom: '1px solid ' + (isContrast ? '#ffffff' : 'rgba(167,139,250,0.35)'), whiteSpace: 'nowrap' };
                        return h('th', { key: 'h' + ci, scope: 'col', 'aria-sort': sortable ? (on ? (nbSortDir === 'desc' ? 'descending' : 'ascending') : 'none') : undefined, className: 'text-left px-1.5 py-1 font-bold', style: thStyle },
                          sortable ? h('button', {
                            type: 'button',
                            onClick: function () { upd({ nbSortCol: cdef[1], nbSortDir: on && nbSortDir === 'asc' ? 'desc' : 'asc' }); },
                            className: 'min-h-11 px-1.5 rounded text-[0.6875rem] font-bold',
                            style: { background: 'transparent', border: 'none', color: softInk },
                            'aria-label': t('stem.heatlab.nb_sort_aria', 'Sort by {col}').replace('{col}', cdef[0])
                          }, cdef[0] + (on ? (nbSortDir === 'desc' ? ' ▼' : ' ▲') : ' ↕')) : cdef[0]);
                      }))),
                  h('tbody', null, nbSorted.map(function (item) {
                    var r = item.row, li = item.logIndex;
                    var confirming = nbConfirm && nbConfirm.type === 'row' && nbConfirm.index === li;
                    var cellStyle = { color: bodyInk, borderBottom: '1px solid ' + (isContrast ? '#ffffff' : 'rgba(148,163,184,0.18)'), whiteSpace: 'nowrap' };
                    var cells = nbKind === 'all'
                      ? [String(item.n), kindLabel(r.kind), nbTime(r.at), nbSummary(r)]
                      : [String(item.n), nbTime(r.at)].concat(nbCols.map(function (c2) { return nbCell(r[c2]); }));
                    return h('tr', { key: 'r' + li, 'data-ht-nb-row': String(li) },
                      cells.map(function (cell, ci) { return h('td', { key: ci, className: 'px-1.5 py-1 font-mono', style: cellStyle }, cell); }),
                      h('td', { key: 'act', className: 'px-1.5 py-1', style: cellStyle },
                        confirming
                          ? h('span', { className: 'flex flex-wrap items-center gap-1', role: 'group', 'aria-label': t('stem.heatlab.nb_confirm_row', 'Delete row {n}?').replace('{n}', String(item.n)) },
                            h('span', { className: 'font-bold' }, t('stem.heatlab.nb_confirm_row', 'Delete row {n}?').replace('{n}', String(item.n))),
                            h('button', { type: 'button', onClick: function () { nbDelete(li); }, className: 'min-h-11 px-2 rounded-lg text-[0.6875rem] font-black', style: neutralBtnStyle(true) },
                              t('stem.heatlab.nb_yes_delete', 'Yes, delete')),
                            h('button', { type: 'button', onClick: function () { setNbConfirm(null); }, className: 'min-h-11 px-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(false) },
                              t('stem.heatlab.nb_keep', 'Keep it')))
                          : h('button', {
                            type: 'button', onClick: function () { setNbConfirm({ type: 'row', index: li }); },
                            'aria-label': t('stem.heatlab.nb_delete_aria', 'Delete row {n}').replace('{n}', String(item.n)),
                            className: 'min-h-11 px-2 rounded-lg text-[0.6875rem] font-bold', style: Object.assign({ minWidth: 44 }, neutralBtnStyle(false))
                          }, '✕')));
                  }))
                )),
              // plot one column against another (one experiment at a time)
              nbKind === 'all'
                ? h('p', { className: 'text-[0.6875rem] mt-2', style: { color: softInk } },
                  t('stem.heatlab.nb_pick_kind', 'Pick one experiment above to plot its columns against each other.'))
                : nbNum.length === 0 ? null : h('div', { className: 'mt-2', 'data-ht-nb-plot': 'true' },
                  h('div', { className: 'flex flex-wrap gap-2' },
                    [['x', nbX, 'nbX', t('stem.heatlab.nb_plot_x', 'Across (x)')], ['y', nbY, 'nbY', t('stem.heatlab.nb_plot_y', 'Up (y)')]].map(function (ax) {
                      return h('div', { key: ax[0], className: 'flex items-center gap-1.5' },
                        h('label', { htmlFor: 'ht-nb-' + ax[0], className: 'text-[0.6875rem] font-bold', style: { color: softInk } }, ax[3]),
                        h('select', {
                          id: 'ht-nb-' + ax[0], value: ax[1] || '',
                          onChange: function (e) { var p = {}; p[ax[2]] = e.target.value; upd(p); },
                          className: 'min-h-11 rounded-lg px-2 text-[0.6875rem]',
                          style: { background: isContrast ? '#000000' : isDark ? 'rgba(15,23,42,0.9)' : '#ffffff', color: bodyInk, border: '1px solid ' + (isContrast ? '#ffffff' : 'rgba(100,116,139,0.4)'), maxWidth: '100%' }
                        }, nbNum.map(function (c2) { return h('option', { key: c2, value: c2 }, c2); })));
                    })),
                  nbPts.length < 2
                    ? h('p', { className: 'text-[0.6875rem] mt-1.5', style: { color: softInk } },
                      t('stem.heatlab.nb_plot_more', 'Record at least two trials of this experiment, changing one setting between them, to see a pattern.'))
                    : null,
                  nbPts.length ? h('div', { className: 'mt-1.5 rounded-lg overflow-hidden border', style: { borderColor: isContrast ? '#ffffff' : 'rgba(167,139,250,0.35)', height: '200px' } },
                    h('canvas', {
                      ref: nbPlotRef, role: 'img',
                      'aria-label': __alloOneWord(t('stem.heatlab.nb_plot_aria', '{y} against {x} for {n} trials. {x} runs from {x0} to {x1}; {y} from {y0} to {y1}.')
                        .replace(/\{x\}/g, nbX).replace(/\{y\}/g, nbY).replace('{n}', String(nbPts.length))
                        .replace('{x0}', nbCell(Math.min.apply(null, nbPts.map(function (p) { return p[0]; })))).replace('{x1}', nbCell(Math.max.apply(null, nbPts.map(function (p) { return p[0]; }))))
                        .replace('{y0}', nbCell(Math.min.apply(null, nbPts.map(function (p) { return p[1]; })))).replace('{y1}', nbCell(Math.max.apply(null, nbPts.map(function (p) { return p[1]; }))))),
                      style: { width: '100%', height: '100%', display: 'block' }
                    })) : null),
              // export and clear
              h('div', { className: 'mt-2 flex flex-wrap items-center gap-1.5' },
                h('button', { type: 'button', onClick: nbCopy, className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(false) },
                  '📋 ' + t('stem.heatlab.nb_copy', 'Copy CSV')),
                h('button', { type: 'button', onClick: nbDownload, className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(false) },
                  '⬇ ' + t('stem.heatlab.nb_download', 'Download CSV')),
                nbPts.length > 0 && h('button', { type: 'button', onClick: nbSendPlot, className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(false) },
                  t('stem.heatlab.nb_send_plot', 'Graph these columns in Data Plot')),
                nbRows.length > 0 && h('button', { type: 'button', onClick: nbSendCodap, className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(false) },
                  t('stem.heatlab.nb_send_codap', 'Explore these rows in CODAP')),
                typeof ctx.saveSnapshot === 'function' ? h('button', { type: 'button', onClick: nbSnapshot, className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(false) },
                  '📸 ' + t('stem.heatlab.nb_snapshot', 'Save snapshot')) : null,
                nbConfirm && nbConfirm.type === 'clear'
                  ? h('span', { className: 'flex flex-wrap items-center gap-1', role: 'group', 'aria-label': __alloOneWord(t('stem.heatlab.nb_confirm_clear', 'Delete these {n} rows? This cannot be undone.').replace('{n}', String(nbRows.length))) },
                    h('span', { className: 'text-[0.6875rem] font-bold', style: { color: bodyInk } },
                      __alloOneWord(t('stem.heatlab.nb_confirm_clear', 'Delete these {n} rows? This cannot be undone.').replace('{n}', String(nbRows.length)))),
                    h('button', { type: 'button', onClick: nbClear, className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-black', style: neutralBtnStyle(true) },
                      t('stem.heatlab.nb_yes_clear', 'Yes, clear them')),
                    h('button', { type: 'button', onClick: function () { setNbConfirm(null); }, className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(false) },
                      t('stem.heatlab.nb_cancel', 'Cancel')))
                  : h('button', { type: 'button', onClick: function () { setNbConfirm({ type: 'clear' }); }, className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(false) },
                    '🗑 ' + (nbKind === 'all' ? t('stem.heatlab.nb_clear_all', 'Clear the notebook') : t('stem.heatlab.nb_clear_kind', 'Clear these rows')))),
              h('p', { role: 'status', 'aria-live': 'polite', className: 'text-[0.6875rem] mt-1.5', style: { color: bodyInk } }, nbMsg))
        ),

        // ── Stage C: guided claim-evidence-reasoning investigations ──
        sec('investigate', '#38bdf8',
          heading('#38bdf8', '🔬 17. ' + t('stem.heatlab.cer_title', 'Investigations: claim, evidence, reasoning')),
          h('p', { className: 'text-[0.6875rem] mb-2 leading-relaxed', style: { color: softInk } },
            t('stem.heatlab.cer_intro', 'Four questions to answer like a scientist. Plan a fair test, run it in the section it uses, record trials, then argue from your own notebook rows. Your writing saves as you type. {n} of 4 complete.').replace('{n}', String(cerDone))),
          h('div', { role: 'group', 'aria-label': t('stem.heatlab.cer_pick_group', 'Choose an investigation'), className: 'flex flex-wrap gap-1' },
            INVESTIGATIONS.map(function (x) {
              var done = !!(cerAll[x.id] && cerAll[x.id].completed === true);
              return pill(cerId === x.id, '#38bdf8', x.icon + ' ' + x.title + (done ? ' ✓' : ''), function () { upd({ cerOpen: x.id }); setCerHint(''); },
                x.title + (done ? ', ' + t('stem.heatlab.cer_done_aria', 'complete') : ''));
            })),
          (function () {
            var stepHead = function (n, text) {
              return h('h5', { className: 'text-[0.6875rem] font-black uppercase tracking-wide mt-3', style: { color: isContrast ? '#fbbf24' : ink('#38bdf8') } }, n + ' · ' + text);
            };
            var boxStyle = { borderColor: isContrast ? '#ffffff' : 'rgba(100,116,139,0.4)', background: isContrast ? '#000000' : isDark ? 'rgba(15,23,42,0.85)' : '#ffffff', color: bodyInk };
            var shown = cerRows.slice(-30).reverse();
            var gone = cerPicks.filter(function (p, i) { return !cerPickedRows[i]; });
            var KIND_LIST = cerInv.kinds.map(kindLabel).join(' / ');
            return h('div', { 'data-ht-cer': cerId, role: 'group', 'aria-labelledby': 'ht-cer-q', className: 'mt-2 rounded-lg border p-2.5', style: panelStyle('#38bdf8') },
              stepHead('1', t('stem.heatlab.cer_step_q', 'The question')),
              h('p', { id: 'ht-cer-q', className: 'text-[0.75rem] font-bold mt-1 leading-relaxed', style: { color: bodyInk } }, cerInv.q),
              h('dl', { className: 'mt-1.5 grid grid-cols-1 sm:grid-cols-[10rem_minmax(0,1fr)] gap-x-2 gap-y-1 text-[0.6875rem]' },
                [[t('stem.heatlab.cer_iv', 'Change (independent variable)'), cerInv.iv],
                 [t('stem.heatlab.cer_dv', 'Measure (dependent variable)'), cerInv.dv],
                 [t('stem.heatlab.cer_cv', 'Keep the same (controlled variables)'), cerInv.cv]].map(function (r, i) {
                  return [h('dt', { key: 'dt' + i, className: 'font-bold', style: { color: softInk } }, r[0]), h('dd', { key: 'dd' + i, style: { color: bodyInk } }, r[1])];
                })),
              stepHead('2', t('stem.heatlab.cer_step_plan', 'The plan')),
              h('ol', { className: 'mt-1 list-decimal pl-5 space-y-0.5 text-[0.6875rem] leading-relaxed', style: { color: bodyInk } },
                cerInv.plan.map(function (p, i) { return h('li', { key: i }, p); })),
              h('div', { className: 'mt-1.5 flex flex-wrap gap-1.5' },
                cerInv.go.map(function (g) {
                  return h('button', {
                    key: g.section, type: 'button',
                    onClick: function () {
                      upd(g.setup);
                      goToSection(g.section);
                    },
                    className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(false)
                  }, '↗ ' + t('stem.heatlab.cer_go', 'Set up {sec}').replace('{sec}', secLabel(g.section)));
                })),
              stepHead('3', t('stem.heatlab.cer_step_evidence', 'Pick your evidence')),
              shown.length === 0
                ? h('p', { className: 'text-[0.6875rem] mt-1 italic', 'data-ht-cer-norows': 'true', style: { color: softInk } },
                  __alloOneWord(t('stem.heatlab.cer_no_rows', 'No {kinds} rows in your notebook yet. Follow the plan and press Record trial in that section.').replace('{kinds}', KIND_LIST)))
                : h('fieldset', { className: 'mt-1' },
                  h('legend', { className: 'text-[0.6875rem]', style: { color: softInk } },
                    __alloOneWord(t('stem.heatlab.cer_pick_legend', 'Tick two to six {kinds} rows that answer the question. {n} picked.').replace('{kinds}', KIND_LIST).replace('{n}', String(cerPicks.length)))),
                  h('div', { className: 'mt-1 grid gap-1', style: { maxHeight: '260px', overflowY: 'auto' }, role: 'region', tabIndex: 0, 'aria-label': t('stem.heatlab.cer_rows_region', 'Notebook rows you can pick') },
                    shown.map(function (item) {
                      var r = item.row, on = cerIsPicked(r);
                      return h('label', {
                        key: 'cr' + item.index, 'data-ht-cer-row': String(item.index),
                        className: 'flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-[0.6875rem] min-h-11',
                        style: { color: bodyInk, borderColor: on ? (isContrast ? '#fbbf24' : ink('#38bdf8')) : (isContrast ? '#ffffff' : 'rgba(56,189,248,0.3)'), borderWidth: on ? 2 : 1 }
                      },
                        h('input', { type: 'checkbox', checked: on, onChange: function () { cerToggle(r); }, className: 'mt-0.5 h-4 w-4 flex-shrink-0 accent-sky-700' }),
                        h('span', { className: 'min-w-0 break-words' },
                          h('b', null, '#' + (item.index + 1) + ' ' + kindLabel(r.kind) + ' · ' + nbTime(r.at) + ': '), cerRowText(r)));
                    }))),
              gone.length ? h('p', { className: 'text-[0.625rem] mt-1', style: { color: softInk } },
                t('stem.heatlab.cer_gone', 'Picked earlier but no longer in the notebook: {rows}').replace('{rows}', gone.map(function (p) { return p.text; }).join('; '))) : null,
              stepHead('4', t('stem.heatlab.cer_step_argue', 'Claim, evidence, reasoning')),
              [['claim', t('stem.heatlab.cer_claim', 'Claim: your answer to the question'), cerClaim, cerInv.frames.claim],
               ['evidence', t('stem.heatlab.cer_evidence', 'Evidence: what your rows show, with numbers'), cerEvidence, cerInv.frames.evidence],
               ['reasoning', t('stem.heatlab.cer_reasoning', 'Reasoning: the science that links the evidence to the claim'), cerReasoning, cerInv.frames.reasoning]].map(function (b) {
                var id = 'ht-cer-' + b[0];
                return h('div', { key: b[0], className: 'mt-2' },
                  h('label', { htmlFor: id, className: 'block text-[0.6875rem] font-bold', style: { color: bodyInk } }, b[1]),
                  h('p', { id: id + '-frame', className: 'text-[0.625rem] mt-0.5 leading-relaxed', style: { color: softInk } },
                    t('stem.heatlab.cer_starter', 'Sentence starter:') + ' ' + b[3]),
                  h('textarea', {
                    id: id, rows: 3, maxLength: 1200, value: b[2], 'aria-describedby': id + '-frame',
                    onChange: function (e) { var p = { dirty: true }; p[b[0]] = e.target.value.slice(0, 1200); cerPatch(p); },
                    onBlur: function () { if (cerSt.dirty) cerPatch({ dirty: false, revisions: (cerSt.revisions || 0) + 1 }); },
                    className: 'mt-1 w-full rounded-lg border p-2 text-[0.6875rem]', style: boxStyle
                  }),
                  !b[2].trim() ? h('button', {
                    type: 'button', onClick: function () { var p = {}; p[b[0]] = b[3]; cerPatch(p); },
                    'aria-label': t('stem.heatlab.cer_use_starter_aria', 'Copy the sentence starter into the {box} box').replace('{box}', b[0]),
                    className: 'mt-1 min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(false)
                  }, '✍️ ' + t('stem.heatlab.cer_use_starter', 'Use the starter')) : null);
              }),
              stepHead('5', t('stem.heatlab.cer_step_check', 'Check your work')),
              h('p', { className: 'text-[0.6875rem] mt-1 font-bold', style: { color: softInk } },
                t('stem.heatlab.cer_auto_head', 'Quick checks the tool can make (not a grade):')),
              h('ul', { className: 'mt-0.5 space-y-0.5 text-[0.6875rem]', 'data-ht-cer-auto': 'true' },
                cerAuto.map(function (a) {
                  return h('li', { key: a.id, 'data-ok': a.ok ? 'true' : 'false', style: { color: bodyInk } },
                    (a.ok ? '✅ ' : '⬜ ') + a.text + (a.ok ? '' : ' — ' + t('stem.heatlab.cer_not_yet', 'not yet')));
                })),
              h('fieldset', { className: 'mt-2' },
                h('legend', { className: 'text-[0.6875rem] font-bold', style: { color: softInk } },
                  t('stem.heatlab.cer_rubric_legend', 'Self-check: tick each one you can honestly say yes to')),
                h('div', { className: 'mt-1 grid gap-1' },
                  HEAT_CER_RUBRIC.map(function (k) {
                    return h('label', { key: k, className: 'flex cursor-pointer items-start gap-2 text-[0.6875rem] min-h-11 py-1', style: { color: bodyInk } },
                      h('input', {
                        type: 'checkbox', checked: !!cerChecks[k],
                        onChange: function () { var c = Object.assign({}, cerChecks); c[k] = !cerChecks[k]; cerPatch({ checks: c }); },
                        className: 'mt-0.5 h-4 w-4 flex-shrink-0 accent-sky-700'
                      }),
                      h('span', null, CER_RUBRIC_TEXT[k]));
                  }))),
              cerCanAsk ? h('button', {
                type: 'button', onClick: cerAsk,
                className: 'mt-2 min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(false)
              }, '💡 ' + t('stem.heatlab.cer_ask_ai', 'Ask the AI coach for feedback')) : null,
              cerHint ? h('p', { role: 'status', className: 'text-[0.6875rem] mt-1.5 leading-relaxed', style: { color: bodyInk } }, cerHint) : null,
              h('div', { className: 'mt-2 flex flex-wrap items-center gap-2' },
                h('button', {
                  type: 'button', disabled: !cerReady, 'aria-disabled': cerReady ? 'false' : 'true', onClick: cerComplete,
                  'aria-describedby': 'ht-cer-ready',
                  className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-black disabled:cursor-not-allowed disabled:opacity-50',
                  style: isContrast ? { background: '#fbbf24', color: '#000000', border: '2px solid #fbbf24' } : { background: '#0369a1', color: '#ffffff', border: '1px solid #0369a1' }
                }, cerSt.completed ? '✅ ' + t('stem.heatlab.cer_completed', 'Completed (edits still save)') : t('stem.heatlab.cer_complete', 'Mark this investigation complete')),
                notebookChip()),
              h('p', { id: 'ht-cer-ready', className: 'text-[0.625rem] mt-1 leading-relaxed', style: { color: softInk } },
                cerReady ? t('stem.heatlab.cer_ready', 'Ready: everything needed is in place.')
                  : t('stem.heatlab.cer_needs', 'To finish: a claim (15+ characters), evidence (15+), reasoning (30+), two or more picked rows{both}, and every self-check ticked.')
                    .replace('{both}', cerInv.needAll ? t('stem.heatlab.cer_needs_both', ' including both experiments') : '')));
          })()
        ),

        // ── Stage C: "Keep it frozen" cooler design challenge ──
        sec('cooler', '#38bdf8',
          heading('#38bdf8', '❄️ 18. ' + t('stem.heatlab.cooler_title', 'Design challenge: keep it frozen')),
          h('div', { className: 'rounded-lg border p-2.5', 'data-ht-cooler-brief': 'true', style: panelStyle('#38bdf8') },
            h('p', { className: 'text-[0.6875rem] font-black', style: { color: isContrast ? '#fbbf24' : ink('#38bdf8') } }, '📋 ' + t('stem.heatlab.cl_brief_title', 'The brief')),
            h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: bodyInk } },
              __alloOneWord(t('stem.heatlab.cl_brief', 'A 200 g ice pack straight from a −18 °C freezer must stay frozen for at least {h} hours in a car at {car} °C. The inside of the box is a 10 cm cube. Your budget is ${b} and the box must fit a {cm} cm space.')
                .replace('{h}', String(HEAT_COOLER.targetH)).replace('{car}', String(HEAT_COOLER.carC)).replace('{b}', String(HEAT_COOLER.budget)).replace('{cm}', String(HEAT_COOLER.maxOuterCm)))),
            h('div', { className: 'mt-1.5 flex flex-wrap gap-1.5', 'data-ht-cooler-live': 'true' },
              [[t('stem.heatlab.cl_chip_cost', 'Cost {v} of ${b}').replace('{v}', function () { return clMoney(clLive.cost); }).replace('{b}', String(HEAT_COOLER.budget)), clLive.meetsBudget],
               [t('stem.heatlab.cl_chip_size', 'Outside {v} cm of {m}').replace('{v}', fmt(clLive.outerCm, 1)).replace('{m}', String(HEAT_COOLER.maxOuterCm)), clLive.meetsSize]].map(function (c, i) {
                return h('span', { key: i, className: 'rounded-full border px-2 py-1 text-[0.625rem] font-black', 'data-ok': c[1] ? 'true' : 'false',
                  style: { color: isContrast ? '#ffffff' : c[1] ? ink('#16a34a') : (isDark ? '#fca5a5' : '#b91c1c'), borderColor: isContrast ? '#ffffff' : c[1] ? 'rgba(22,163,74,0.5)' : 'rgba(239,68,68,0.5)' } },
                  (c[1] ? '✓ ' : '✗ ') + c[0]);
              }))),
          h('p', { className: 'text-[0.6875rem] font-bold mt-2', style: { color: softInk } }, t('stem.heatlab.cl_shell', 'Outer shell')),
          h('div', { role: 'group', 'aria-label': t('stem.heatlab.cl_shell', 'Outer shell'), className: 'flex flex-wrap gap-1' },
            HEAT_COOLER_SHELLS.map(function (s) {
              return pill(clDesign.shell === s.id, '#38bdf8', CL_SHELL_NAMES[s.id] + ' · ' + clMoney(s.cost), function () { clSet({ clShell: s.id }); });
            })),
          h('p', { className: 'text-[0.6875rem] font-bold mt-2', style: { color: softInk } }, t('stem.heatlab.cl_liner', 'Insulating liner')),
          h('div', { role: 'group', 'aria-label': t('stem.heatlab.cl_liner', 'Insulating liner'), className: 'flex flex-wrap gap-1' },
            HEAT_COOLER_LINERS.map(function (l) {
              return pill(clDesign.liner === l.id, '#38bdf8', CL_LINER_NAMES[l.id] + (l.k > 0 ? ' · k ' + l.k + ' · ' + clMoney(l.costPer10) + '/10 mm' : ''),
                function () { clSet(l.id !== 'none' && !(clDesign.mm > 0) ? { clLiner: l.id, clMm: 10 } : { clLiner: l.id }); });
            })),
          clDesign.liner !== 'none'
            ? slider('heat-cl-mm', t('stem.heatlab.cl_mm', 'Liner thickness'), 5, HEAT_COOLER_MM_MAX, 5, Math.max(5, clDesign.mm),
              function (e) { clSet({ clMm: parseFloat(e.target.value) }); }, fmt(Math.max(5, clDesign.mm), 0) + ' mm')
            : null,
          h('p', { className: 'text-[0.6875rem] font-bold mt-2', style: { color: softInk } }, t('stem.heatlab.cl_seal', 'Lid seal')),
          h('div', { role: 'group', 'aria-label': t('stem.heatlab.cl_seal', 'Lid seal'), className: 'flex flex-wrap gap-1' },
            HEAT_COOLER_SEALS.map(function (s) {
              return pill(clDesign.seal === s.id, '#38bdf8', CL_SEAL_NAMES[s.id] + ' · ' + clMoney(s.cost), function () { clSet({ clSeal: s.id }); });
            })),
          h('div', { className: 'mt-2 flex flex-wrap items-center gap-2' },
            h('button', {
              type: 'button', 'aria-pressed': clDesign.foil ? 'true' : 'false', onClick: function () { clSet({ clFoil: !clDesign.foil }); },
              className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(clDesign.foil)
            }, '🪞 ' + t('stem.heatlab.cl_foil', 'Reflective foil wrap') + ' · ' + clMoney(HEAT_COOLER_FOIL.cost)),
            h('button', {
              type: 'button', onClick: clRunTest, 'data-ht-cooler-test': 'true',
              className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-black',
              style: isContrast ? { background: '#fbbf24', color: '#000000', border: '2px solid #fbbf24' } : { background: '#0369a1', color: '#ffffff', border: '1px solid #0369a1' }
            }, '🧪 ' + t('stem.heatlab.cl_test', 'Test this design'))),
          !clTested ? h('p', { className: 'text-[0.6875rem] mt-2 italic', style: { color: softInk } },
            t('stem.heatlab.cl_untested', 'Choose your materials, then press Test. Each test is also recorded in your lab notebook.')) : null,
          clTested ? h('div', { className: 'mt-2 rounded-lg border p-2.5', 'data-ht-cooler-result': clTested.meets ? 'pass' : 'fail', style: panelStyle(clTested.meets ? '#16a34a' : '#f59e0b') },
            h('p', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', className: 'text-[0.6875rem] font-black leading-relaxed', style: { color: bodyInk } },
              __alloOneWord(t('stem.heatlab.cl_result', '{design}: the ice lasts {h} hours ({warm} warming to 0 °C, then {melt} melting). Cost {cost}; outside {cm} cm.')
                .replace('{design}', clDescribe(clTested.design)).replace('{h}', fmt(clTested.meltH, 1)).replace('{warm}', heatTimeLabel(clTested.warmS))
                .replace('{melt}', heatTimeLabel(clTested.meltS - clTested.warmS)).replace('{cost}', function () { return clMoney(clTested.cost); }).replace('{cm}', fmt(clTested.outerCm, 1))) + ' ' +
              (clTested.meets ? t('stem.heatlab.cl_meets', 'It meets the brief.') : t('stem.heatlab.cl_fails', 'It does not meet the brief yet.'))),
            h('ul', { className: 'mt-1 flex flex-wrap gap-1.5 text-[0.625rem] font-bold' },
              [[t('stem.heatlab.cl_need_time', '4 hours or more'), clTested.meetsTime], [t('stem.heatlab.cl_need_budget', 'within budget'), clTested.meetsBudget], [t('stem.heatlab.cl_need_size', 'fits the space'), clTested.meetsSize]].map(function (c, i) {
                return h('li', { key: i, className: 'rounded-full border px-2 py-0.5', style: { color: bodyInk, borderColor: isContrast ? '#ffffff' : c[1] ? 'rgba(22,163,74,0.5)' : 'rgba(239,68,68,0.5)' } }, (c[1] ? '✓ ' : '✗ ') + c[0]);
              })),
            clStale ? h('p', { className: 'text-[0.6875rem] mt-1 font-bold', style: { color: isContrast ? '#ffffff' : (isDark ? '#fcd34d' : '#92400e') } },
              t('stem.heatlab.cl_stale', 'You have changed the design since this test. Test again to see the new result.')) : null,
            d.clBadge ? h('p', { className: 'text-[0.6875rem] mt-1 font-black', 'data-ht-cooler-badge': 'true', style: { color: isContrast ? '#ffffff' : ink('#16a34a') } },
              '🏅 ' + t('stem.heatlab.cl_badge', 'Badge earned: a design you built meets the brief.')) : null,
            h('div', { className: 'mt-2 rounded-lg overflow-hidden border', style: { borderColor: isContrast ? '#ffffff' : 'rgba(56,189,248,0.35)', height: '190px' } },
              h('canvas', {
                ref: coolerRef, role: 'img',
                'aria-label': __alloOneWord(t('stem.heatlab.cl_chart_aria', 'Ice pack temperature against time in the car: it warms from −18 °C to 0 °C in {warm}, holds at 0 °C while it melts until {h} hours, then the meltwater warms towards 30 °C.')
                  .replace('{warm}', heatTimeLabel(clTested.warmS)).replace('{h}', fmt(clTested.meltH, 1))),
                style: { width: '100%', height: '100%', display: 'block' }
              })),
            (function () {
              var parts = [['inFilm', t('stem.heatlab.cl_r_infilm', 'Still air inside')], ['liner', CL_LINER_NAMES[clTested.design.liner]],
                ['shell', CL_SHELL_NAMES[clTested.design.shell]], ['outFilm', t('stem.heatlab.cl_r_outfilm', 'Outside air film (convection + radiation)')]]
                .filter(function (p) { return clTested.R[p[0]] > 0; });
              var big = parts.reduce(function (a, b) { return clTested.R[b[0]] > clTested.R[a[0]] ? b : a; }, parts[0]);
              var leakPct = clTested.sealW / (clTested.wallW + clTested.sealW) * 100;
              return h('div', { className: 'mt-2', 'data-ht-cooler-limits': 'true' },
                h('p', { className: 'text-[0.6875rem] font-black', style: { color: bodyInk } }, '🔍 ' + t('stem.heatlab.cl_limits_title', 'What limits this design?')),
                h('ul', { className: 'mt-1 space-y-1' },
                  parts.map(function (p) {
                    var pct = clTested.R[p[0]] / clTested.Rsum * 100;
                    return h('li', { key: p[0], className: 'text-[0.6875rem]', style: { color: bodyInk } },
                      h('span', { className: 'flex flex-wrap justify-between gap-x-2' },
                        h('span', null, p[1]),
                        h('span', { className: 'font-mono' }, fmt(clTested.R[p[0]], 2) + ' K/W · ' + fmt(pct, 0) + '%')),
                      h('span', { 'aria-hidden': 'true', style: { display: 'block', height: 6, marginTop: 2, borderRadius: 3, width: Math.max(2, pct) + '%', background: isContrast ? '#ffffff' : ink('#38bdf8') } }));
                  })),
                h('p', { className: 'text-[0.6875rem] mt-1.5 leading-relaxed', style: { color: bodyInk } },
                  t('stem.heatlab.cl_limits_story', 'The wall layers are in series, so their resistances add: {big} gives {pct}% of the wall’s resistance. The lid seal is a second path in parallel: {leak}% of the heat getting in ({w} of {tot}) sneaks round the lid.')
                    .replace('{big}', big[1]).replace('{pct}', fmt(clTested.R[big[0]] / clTested.Rsum * 100, 0)).replace('{leak}', fmt(leakPct, 0))
                    .replace('{w}', fmtW(clTested.sealW)).replace('{tot}', fmtW(clTested.wallW + clTested.sealW))),
                clUpgrades.length ? h('div', { className: 'mt-1.5' },
                  h('p', { className: 'text-[0.6875rem] font-bold', style: { color: softInk } }, t('stem.heatlab.cl_up_title', 'Single changes that would help most:')),
                  h('ul', { className: 'mt-0.5 space-y-0.5 text-[0.6875rem]', style: { color: bodyInk } },
                    clUpgrades.map(function (u, i) {
                      var what = u.kind === 'thicker' ? t('stem.heatlab.cl_up_thicker', '5 mm more {liner}').replace('{liner}', CL_LINER_NAMES[clTested.design.liner].toLowerCase())
                        : u.kind === 'liner' ? t('stem.heatlab.cl_up_liner', 'switch the liner to {liner}').replace('{liner}', CL_LINER_NAMES[u.id].toLowerCase())
                          : u.kind === 'seal' ? t('stem.heatlab.cl_up_seal', 'use a {seal}').replace('{seal}', CL_SEAL_NAMES[u.id].toLowerCase())
                            : u.kind === 'foil' ? t('stem.heatlab.cl_up_foil', 'add the foil wrap')
                              : t('stem.heatlab.cl_up_shell', 'use a {shell}').replace('{shell}', CL_SHELL_NAMES[u.id].toLowerCase());
                      var flags = (!u.fitsBudget ? ' ' + t('stem.heatlab.cl_up_over', '(over budget)') : '') + (!u.fitsSize ? ' ' + t('stem.heatlab.cl_up_big', '(too big)') : '');
                      return h('li', { key: i }, '+' + fmt(u.gainH, 1) + ' h: ' + what + ', ' + (u.extraCost >= 0 ? '+' : '−') + clMoney(Math.abs(u.extraCost)) + flags);
                    }))) : null);
            })(),
            h('button', {
              type: 'button', onClick: clSave, disabled: clStale || clSaved.length >= 3, 'aria-disabled': clStale || clSaved.length >= 3 ? 'true' : 'false',
              className: 'mt-2 min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold disabled:cursor-not-allowed disabled:opacity-50', style: neutralBtnStyle(false)
            }, '💾 ' + t('stem.heatlab.cl_save', 'Save for comparison ({n} of 3 used)').replace('{n}', String(clSaved.length)))
          ) : null,
          (clSaved.length || clTested) ? h('div', { className: 'mt-2', 'data-ht-cooler-compare': 'true' },
            h('p', { className: 'text-[0.6875rem] font-black', style: { color: bodyInk } }, '⚖️ ' + t('stem.heatlab.cl_compare_title', 'Trade-off: cost against how long the ice lasts')),
            h('div', { className: 'mt-1 rounded-lg overflow-hidden border', style: { borderColor: isContrast ? '#ffffff' : 'rgba(56,189,248,0.35)', height: '190px' } },
              h('canvas', {
                ref: tradeRef, role: 'img',
                'aria-label': __alloOneWord(t('stem.heatlab.cl_trade_aria', 'Cost against hours the ice lasts for {n} designs; the target is 4 hours and the budget ${b}.')
                  .replace('{n}', String(clSaved.length + (clTested && !clStale ? 1 : 0))).replace('{b}', String(HEAT_COOLER.budget))),
                style: { width: '100%', height: '100%', display: 'block' }
              })),
            accessRow('trade', { describe: describeTrade }),
            clSaved.length ? h('ul', { className: 'mt-1.5 space-y-1' },
              clSaved.map(function (x, i) {
                var name = t('stem.heatlab.cl_design_n', 'Design {n}').replace('{n}', String.fromCharCode(65 + i));
                return h('li', { key: i, 'data-ht-cooler-saved': String(i), className: 'flex flex-wrap items-center gap-2 text-[0.6875rem] rounded-lg border p-1.5', style: { color: bodyInk, borderColor: isContrast ? '#ffffff' : 'rgba(56,189,248,0.3)' } },
                  h('span', { 'aria-hidden': 'true', style: { display: 'inline-block', width: 10, height: 10, borderRadius: 5, background: CL_COLOURS[i % 3] } }),
                  h('span', { className: 'min-w-0 flex-1 break-words' }, h('b', null, name + ': '), clDescribe(x.design) + ' · ' + fmt(x.meltH, 1) + ' h · ' + clMoney(x.cost) + ' · ' + fmt(x.outerCm, 1) + ' cm' +
                    (x.meets ? ' · ✓ ' + t('stem.heatlab.cl_meets_short', 'meets the brief') : '')),
                  h('button', { type: 'button', onClick: function () { clRemove(i); }, 'aria-label': t('stem.heatlab.cl_remove_aria', 'Remove {name}').replace('{name}', name),
                    className: 'min-h-11 px-2 rounded-lg text-[0.6875rem] font-bold', style: Object.assign({ minWidth: 44 }, neutralBtnStyle(false)) }, '✕'));
              })) : null) : null,
          h('label', { htmlFor: 'ht-cl-why', className: 'mt-3 block text-[0.6875rem] font-bold', style: { color: bodyInk } },
            t('stem.heatlab.cl_why', 'Justify your pick: which design would you build, and what did you trade off?')),
          h('p', { id: 'ht-cl-why-frame', className: 'text-[0.625rem] mt-0.5', style: { color: softInk } },
            t('stem.heatlab.cl_why_frame', 'Sentence starter: I would build ___ because it keeps the ice for ___ h at ___. I gave up ___ to stay within ___. Its weakest point is ___.')),
          h('textarea', {
            id: 'ht-cl-why', rows: 3, maxLength: 1000, value: typeof d.clWhy === 'string' ? d.clWhy : '', 'aria-describedby': 'ht-cl-why-frame',
            onChange: function (e) { upd({ clWhy: e.target.value.slice(0, 1000) }); },
            className: 'mt-1 w-full rounded-lg border p-2 text-[0.6875rem]',
            style: { borderColor: isContrast ? '#ffffff' : 'rgba(100,116,139,0.4)', background: isContrast ? '#000000' : isDark ? 'rgba(15,23,42,0.85)' : '#ffffff', color: bodyInk }
          }),
          h('details', { className: 'mt-3 rounded-lg border p-2', 'data-ht-cooler-model': 'true', style: panelStyle('#94a3b8') },
            h('summary', { className: 'min-h-11 flex items-center cursor-pointer text-[0.6875rem] font-black', style: { color: bodyInk } },
              h('span', null, '🧮 ' + t('stem.heatlab.cl_how_title', 'How we model it'))),
            h('ul', { className: 'mt-1 list-disc pl-5 space-y-1 text-[0.6875rem] leading-relaxed', style: { color: bodyInk } },
              [t('stem.heatlab.cl_how_1', 'Heat comes in by two parallel paths: through the walls, and round the lid seal. The total conductance is G = 1 ÷ (R_inside + R_liner + R_shell + R_outside) + G_seal.'),
               t('stem.heatlab.cl_how_2', 'Each wall layer’s resistance is thickness ÷ (k × area), using the average (geometric mean) of its inner and outer face areas, because a thick wall’s outside is bigger than its inside.'),
               t('stem.heatlab.cl_how_3', 'The air films: {hin} W/m²K inside; outside, {hout} W/m²K of convection in a still car plus radiation 4εσT³ ({hrad} W/m²K for this surface, ε {eps}). Foil cuts ε to 0.05.')
                 .replace('{hin}', String(HEAT_COOLER.hIn)).replace('{hout}', String(HEAT_COOLER.hConvOut)).replace('{hrad}', fmt((clTested || clLive).hRad, 2)).replace('{eps}', (clTested || clLive).design.foil ? '0.05' : '0.9'),
               t('stem.heatlab.cl_how_4', 'Lid seals, estimated: a loose lid swaps about 0.2 m³ of car air an hour (G = 0.06 W/K), a foam strip 0.02 W/K, a rubber gasket 0.005 W/K.'),
               t('stem.heatlab.cl_how_5', 'The ice is one lump at one temperature. It warms from −18 °C by Newton’s law, T = 30 − 48·e^(−Gt/C) with C = m·c_ice, then melts at 0 °C, taking m·L = 0.2 × 334 kJ while heat arrives at G × 30 W.'),
               t('stem.heatlab.cl_how_6', 'Ignored: the box’s own heat capacity, sunlight on the box, the car warming up, and the meltwater pooling. Real coolers do a little worse than this model.')
              ].map(function (txt, i) { return h('li', { key: i }, txt); })))
        ),

        // ── Stage D: passive house designer ──
        sec('house', '#84cc16',
          heading('#84cc16', '🏠 19. ' + t('stem.heatlab.house_title', 'Design challenge: a passive house')),
          h('div', { className: 'rounded-lg border p-2.5', 'data-ht-house-brief': 'true', style: panelStyle('#84cc16') },
            h('p', { className: 'text-[0.6875rem] font-black', style: { color: isContrast ? '#fbbf24' : ink('#84cc16') } }, '📋 ' + t('stem.heatlab.hs_brief_title', 'The brief')),
            h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: bodyInk } }, houseBriefText),
            h('ul', { className: 'mt-1.5 flex flex-wrap gap-1.5 text-[0.625rem] font-black', 'data-ht-house-live': 'true' },
              hsChip(hsBriefLive.meetsDemand, t('stem.heatlab.hs_chip_demand', '{k} of {max} kWh/m²·yr').replace('{k}', fmt(hsBriefLive.kwhM2, 0)).replace('{max}', String(HS.brief.kwhM2)), 'd'),
              hsChip(hsBriefLive.meetsBudget, t('stem.heatlab.hs_chip_cost', '{v} of {b}').replace('{v}', function () { return hsMoney(hsBriefLive.costSum); }).replace('{b}', function () { return hsMoney(HS.brief.budget); }), 'b'),
              hsChip(hsBriefLive.meetsCo2, t('stem.heatlab.hs_chip_co2', '{v} of {c} kg CO₂e').replace('{v}', fmt(hsBriefLive.co2Sum, 0)).replace('{c}', fmt(HS.brief.co2, 0)), 'c'),
              hsChip(hsBriefLive.comfortOk, t('stem.heatlab.hs_chip_glass', 'glass {g} °C').replace('{g}', fmt(hsBriefLive.glassC, 1)), 'g'),
              hsChip(hsBriefLive.freshOk, t('stem.heatlab.hs_chip_air', 'fresh air {a}/h').replace('{a}', fmt(hsBriefLive.freshAch, 2)), 'a'))),
          h('p', { className: 'text-[0.6875rem] font-bold mt-2', style: { color: softInk } }, '1. ' + HS_ELEMENT_NAMES.wall + ' · U ' + fmt(hsLive.U.wall, 2) + ' W/m²K'),
          hsPills(HS_ELEMENT_NAMES.wall, HEAT_HOUSE_WALLS.map(function (w) { return w.id; }).concat(hsMineOk ? ['mine'] : []), hsDesign.wall, HS_WALL_NAMES,
            function (id) { hsSet({ hsWall: id }); }),
          h('p', { className: 'text-[0.625rem] mt-0.5', style: { color: softInk } },
            t('stem.heatlab.hs_wall_layers', 'Layers, inside films included: {list}. Build your own stack in section 3 and pick “My wall”.')
              .replace('{list}', hsLive.layers.map(function (id) { var L = WALL_LAYERS.filter(function (x) { return x.id === id; })[0]; return L ? L.name : id; }).join(' + '))),
          h('p', { className: 'text-[0.6875rem] font-bold mt-2', style: { color: softInk } }, '2. ' + HS_ELEMENT_NAMES.roof + ' · U ' + fmt(hsLive.U.roof, 2) + ' W/m²K'),
          hsPills(HS_ELEMENT_NAMES.roof, HEAT_HOUSE_ROOF_MM.map(String), String(hsDesign.roofMm),
            { '100': t('stem.heatlab.hs_roof_100', '100 mm wool'), '200': t('stem.heatlab.hs_roof_200', '200 mm wool'), '300': t('stem.heatlab.hs_roof_300', '300 mm wool'), '400': t('stem.heatlab.hs_roof_400', '400 mm wool') },
            function (id) { hsSet({ hsRoofMm: Number(id) }); }),
          h('p', { className: 'text-[0.6875rem] font-bold mt-2', style: { color: softInk } }, '3. ' + HS_ELEMENT_NAMES.floor + ' · U ' + fmt(hsLive.U.floor, 2) + ' W/m²K'),
          hsPills(HS_ELEMENT_NAMES.floor, HEAT_HOUSE_FLOORS.map(function (f) { return f.id; }), hsDesign.floor, HS_FLOOR_NAMES, function (id) { hsSet({ hsFloor: id }); }),
          h('p', { className: 'text-[0.6875rem] font-bold mt-2', style: { color: softInk } }, '4. ' + HS_ELEMENT_NAMES.window + ' · U ' + fmt(hsLive.U.window, 1) + ' W/m²K · g ' + fmt(heatPick(HEAT_HOUSE_GLAZING, hsDesign.glazing).g, 2)),
          hsPills(t('stem.heatlab.hs_glazing', 'Glazing'), HEAT_HOUSE_GLAZING.map(function (g) { return g.id; }), hsDesign.glazing, HS_GLAZING_NAMES, function (id) { hsSet({ hsGlazing: id }); }),
          [['S', 'winS', t('stem.heatlab.hs_win_s', 'South windows')], ['E', 'winE', t('stem.heatlab.hs_win_e', 'East windows')], ['W', 'winW', t('stem.heatlab.hs_win_w', 'West windows')], ['N', 'winN', t('stem.heatlab.hs_win_n', 'North windows')]].map(function (o) {
            var key = 'hs' + o[1].charAt(0).toUpperCase() + o[1].slice(1);
            return h('div', { key: o[0] }, slider('heat-hs-' + o[0], o[2], 0, 30, 1, hsDesign[o[1]], function (e) { var p = {}; p[key] = parseFloat(e.target.value); hsSet(p); }, hsDesign[o[1]] + ' m²'));
          }),
          hsLive.winA < hsDesign.winS + hsDesign.winE + hsDesign.winW + hsDesign.winN - 1e-9 ? h('p', { className: 'text-[0.625rem] mt-0.5 font-bold', style: { color: isContrast ? '#ffffff' : (isDark ? '#fcd34d' : '#92400e') } },
            t('stem.heatlab.hs_win_cap', 'Windows are capped at {m} m² in total, so each area is scaled down.').replace('{m}', String(HS.windowMaxM2))) : null,
          h('p', { className: 'text-[0.6875rem] font-bold mt-2', style: { color: softInk } }, '5. ' + HS_ELEMENT_NAMES.air + ' · ' + fmt(hsLive.Hvent, 0) + ' W/K'),
          hsPills(t('stem.heatlab.hs_airtight', 'Airtightness'), HEAT_HOUSE_AIR.map(function (a) { return a.id; }), hsDesign.air, HS_AIR_NAMES, function (id) { hsSet({ hsAir: id }); },
            function (id) { return ' · ' + heatPick(HEAT_HOUSE_AIR, id).ach + '/h'; }),
          h('div', { className: 'mt-1.5 flex flex-wrap items-center gap-2' },
            h('button', {
              type: 'button', 'aria-pressed': hsDesign.mvhr ? 'true' : 'false', 'data-ht-hs-mvhr': 'true', onClick: function () { hsSet({ hsMvhr: !hsDesign.mvhr }); },
              className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold', style: neutralBtnStyle(hsDesign.mvhr)
            }, '🌀 ' + t('stem.heatlab.hs_mvhr', 'Heat-recovery ventilation (80%)') + ' · ' + hsMoney(HS.mvhrCost))),
          h('p', { className: 'text-[0.625rem] mt-0.5 leading-relaxed', style: { color: softInk } },
            __alloOneWord(t('stem.heatlab.hs_air_note', 'Fresh air you breathe is air you heat. Without heat recovery, a house tighter than {a} changes an hour must be aired through windows, losing all that heat; with it, a fan supplies {a} changes an hour through an exchanger that keeps 80% of the warmth.').replace(/\{a\}/g, String(HS.freshAch)))),
          h('p', { className: 'text-[0.6875rem] font-bold mt-2', style: { color: softInk } }, t('stem.heatlab.hs_climate', 'Climate to view')),
          hsPills(t('stem.heatlab.hs_climate', 'Climate to view'), HEAT_CLIMATES.map(function (c) { return c.id; }), hsClimate, HS_CLIMATE_NAMES, function (id) { upd({ hsClimate: id }); }),
          h('div', { className: 'mt-2 rounded-lg border p-2.5', 'data-ht-house-result': 'true', style: panelStyle('#84cc16') },
            h('p', { className: 'text-[0.6875rem] font-black', style: { color: bodyInk } },
              t('stem.heatlab.hs_result', 'In the {cl} climate this house needs {kwh} kWh of heat a year: {k} kWh per square metre.')
                .replace('{cl}', HS_CLIMATE_NAMES[hsClimate]).replace('{kwh}', fmt(hsLive.demandKWh, 0)).replace('{k}', fmt(hsLive.kwhM2, 1))),
            h('div', { className: 'mt-1.5 overflow-x-auto', role: 'region', tabIndex: 0, 'aria-label': t('stem.heatlab.hs_ua_region', 'Heat loss by element') },
              h('table', { className: 'w-full text-[0.6875rem]', 'data-ht-house-ua': 'true', style: { borderCollapse: 'collapse', color: bodyInk } },
                h('caption', { className: 'text-left font-bold mb-1', style: { color: softInk } }, t('stem.heatlab.hs_ua_caption', 'Where the heat leaks: UA = U × area for each element, W/K')),
                h('thead', null, h('tr', null,
                  [t('stem.heatlab.hs_col_el', 'Element'), 'U', t('stem.heatlab.hs_col_area', 'Area'), 'W/K', t('stem.heatlab.hs_col_share', 'Share')].map(function (c, i) {
                    return h('th', { key: i, scope: 'col', className: 'text-left py-1 pr-2' }, c);
                  }))),
                h('tbody', null,
                  [['wall', hsLive.U.wall, hsLive.wallA, hsLive.UA.wall], ['roof', hsLive.U.roof, HS.roofM2, hsLive.UA.roof],
                   ['floor', hsLive.U.floor, HS.floorM2, hsLive.UA.floor], ['window', hsLive.U.window, hsLive.winA, hsLive.UA.window],
                   ['air', null, null, hsLive.Hvent]].map(function (r) {
                    return h('tr', { key: r[0], style: { borderTop: '1px solid ' + (isContrast ? '#ffffff' : 'rgba(100,116,139,0.25)') } },
                      h('th', { scope: 'row', className: 'text-left py-1 pr-2 font-bold' }, HS_ELEMENT_NAMES[r[0]] + (r[0] === 'floor' ? ' ×0.5' : '')),
                      h('td', { className: 'py-1 pr-2 font-mono' }, r[1] == null ? '—' : fmt(r[1], 2)),
                      h('td', { className: 'py-1 pr-2 font-mono' }, r[2] == null ? fmt(hsLive.ventAch, 2) + '/h' : fmt(r[2], 0) + ' m²'),
                      h('td', { className: 'py-1 pr-2 font-mono' }, fmt(r[3], 1)),
                      h('td', { className: 'py-1 font-mono' }, fmt(r[3] / hsLive.Htot * 100, 0) + '%'));
                  }).concat([h('tr', { key: 'tot', style: { borderTop: '2px solid ' + (isContrast ? '#ffffff' : 'rgba(100,116,139,0.45)') } },
                    h('th', { scope: 'row', className: 'text-left py-1 pr-2 font-black' }, t('stem.heatlab.hs_total', 'Total')),
                    h('td', null), h('td', null),
                    h('td', { className: 'py-1 pr-2 font-mono font-black' }, fmt(hsLive.Htot, 1)), h('td', { className: 'py-1 font-mono' }, '100%'))])))),
            maths('house',
              h('p', { className: 'text-[0.625rem] mt-1.5 font-mono break-words', style: { color: softInk } },
                t('stem.heatlab.hs_maths_v2', 'loss = {H} W/K × {hdd} K·days × 24 h ÷ 1000 = {loss} kWh; usable sun {sun} kWh; need = {need} kWh')
                  .replace('{H}', fmt(hsLive.Htot, 1)).replace('{hdd}', fmt(hsLive.hdd, 0)).replace('{loss}', fmt(hsLive.lossKWh, 0))
                  .replace('{sun}', fmt(hsLive.usableKWh, 0)).replace('{need}', fmt(hsLive.demandKWh, 0)))),
            h('div', { className: 'mt-2 overflow-x-auto', role: 'region', tabIndex: 0, 'aria-label': t('stem.heatlab.hs_month_region', 'Monthly heating table') },
              h('table', { className: 'w-full text-[0.625rem]', 'data-ht-house-months': 'true', style: { borderCollapse: 'collapse', color: bodyInk } },
                h('caption', { className: 'text-left text-[0.6875rem] font-bold mb-1', style: { color: softInk } }, t('stem.heatlab.hs_month_caption', 'Month by month: heat lost, sunshine used, heating needed (kWh)')),
                h('thead', null, h('tr', null,
                  [t('stem.heatlab.hs_col_month', 'Month'), '°C', t('stem.heatlab.hs_col_loss', 'Lost'), t('stem.heatlab.hs_col_sun', 'Sun used'), t('stem.heatlab.hs_col_need', 'Need')].map(function (c, i) {
                    return h('th', { key: i, scope: 'col', className: 'text-left py-0.5 pr-2' }, c);
                  }))),
                h('tbody', null, (function () {
                  var maxNeed = Math.max.apply(null, hsLive.months.map(function (m) { return m.lossKWh; })) || 1;
                  return hsLive.months.map(function (m) {
                    return h('tr', { key: m.month },
                      h('th', { scope: 'row', className: 'text-left py-0.5 pr-2 font-bold' }, HS_MONTHS[m.month]),
                      h('td', { className: 'py-0.5 pr-2 font-mono' }, fmt(m.meanC, 1)),
                      h('td', { className: 'py-0.5 pr-2 font-mono' }, fmt(m.lossKWh, 0)),
                      h('td', { className: 'py-0.5 pr-2 font-mono' }, fmt(m.usableKWh, 0)),
                      h('td', { className: 'py-0.5 font-mono', style: { minWidth: '5.5rem' } },
                        h('span', { 'aria-hidden': 'true', style: { display: 'inline-block', verticalAlign: 'middle', height: 6, marginRight: 4, borderRadius: 3, width: Math.round(m.needKWh / maxNeed * 48) + 'px', background: isContrast ? '#ffffff' : ink('#84cc16') } }),
                        fmt(m.needKWh, 0)));
                  });
                })()))),
            accessRow('house', { describe: describeHouse }),
            h('ul', { className: 'mt-2 space-y-0.5 text-[0.6875rem] leading-relaxed', style: { color: bodyInk } },
              h('li', null, t('stem.heatlab.hs_hp', 'Heat pump (section 15 model): seasonal COP {cop}, so {e} kWh of electricity a year, about {bill} at {p}/kWh. Plain electric heaters would cost {res}.')
                .replace('{cop}', hsLive.scop ? fmt(hsLive.scop, 2) : '—').replace('{e}', fmt(hsLive.elecKWh, 0)).replace('{bill}', function () { return hsMoney(hsLive.billHP); })
                .replace('{p}', '$' + HS.priceKWh.toFixed(2)).replace('{res}', function () { return hsMoney(hsLive.billResist); })),
              h('li', null, __alloOneWord(t('stem.heatlab.hs_comfort', 'Coldest-month glass surface: {g} °C ({ok}). Fresh air: {a} changes an hour.')
                .replace('{g}', fmt(hsLive.glassC, 1)).replace('{ok}', hsLive.comfortOk ? t('stem.heatlab.hs_comfort_ok', 'comfortable, no cold downdraught') : t('stem.heatlab.hs_comfort_bad', 'cold: draughts and condensation near the windows'))
                .replace('{a}', fmt(hsLive.freshAch, 2)))),
              h('li', null, t('stem.heatlab.hs_costs', 'Cost {cost} and embodied carbon {co2} kg CO₂e for the parts you chose.').replace('{cost}', function () { return hsMoney(hsLive.costSum); }).replace('{co2}', fmt(hsLive.co2Sum, 0))))),
          h('div', { className: 'mt-2 flex flex-wrap items-center gap-2' },
            h('button', {
              type: 'button', onClick: hsRunTest, 'data-ht-house-test': 'true',
              className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-black',
              style: isContrast ? { background: '#fbbf24', color: '#000000', border: '2px solid #fbbf24' } : { background: '#3f6212', color: '#ffffff', border: '1px solid #3f6212' }
            }, '🧪 ' + t('stem.heatlab.hs_test', 'Test against the brief')),
            notebookChip()),
          hsTested ? h('div', { className: 'mt-2 rounded-lg border p-2.5', 'data-ht-house-tested': hsTested.meets ? 'pass' : 'fail', style: panelStyle(hsTested.meets ? '#16a34a' : '#f59e0b') },
            h('p', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', className: 'text-[0.6875rem] font-black leading-relaxed', style: { color: bodyInk } },
              t('stem.heatlab.hs_tested', 'Tested in the cold climate: {k} kWh/m²·yr, {cost}, {co2} kg CO₂e.').replace('{k}', fmt(hsTested.kwhM2, 1))
                .replace('{cost}', function () { return hsMoney(hsTested.costSum); }).replace('{co2}', fmt(hsTested.co2Sum, 0)) + ' ' +
              (hsTested.meets ? t('stem.heatlab.hs_meets', 'It meets the brief.') : t('stem.heatlab.hs_fails', 'It does not meet the brief yet.'))),
            h('ul', { className: 'mt-1 flex flex-wrap gap-1.5 text-[0.625rem] font-bold' },
              hsChip(hsTested.meetsDemand, t('stem.heatlab.hs_need_demand', 'heating need'), 'd'), hsChip(hsTested.meetsBudget, t('stem.heatlab.hs_need_budget', 'budget'), 'b'),
              hsChip(hsTested.meetsCo2, t('stem.heatlab.hs_need_co2', 'carbon'), 'c'), hsChip(hsTested.comfortOk, t('stem.heatlab.hs_need_comfort', 'comfort'), 'g'),
              hsChip(hsTested.freshOk, t('stem.heatlab.hs_need_air', 'fresh air'), 'a')),
            hsStale ? h('p', { className: 'text-[0.6875rem] mt-1 font-bold', style: { color: isContrast ? '#ffffff' : (isDark ? '#fcd34d' : '#92400e') } },
              t('stem.heatlab.hs_stale', 'You have changed the house since this test. Test again to see the new result.')) : null,
            d.hsBadge ? h('p', { className: 'text-[0.6875rem] mt-1 font-black', 'data-ht-house-badge': 'true', style: { color: isContrast ? '#ffffff' : ink('#16a34a') } },
              '🏅 ' + t('stem.heatlab.hs_badge', 'Badge earned: a house you designed meets the brief.')) : null,
            h('button', {
              type: 'button', onClick: hsSave, disabled: hsStale || hsSaved.length >= 3, 'aria-disabled': hsStale || hsSaved.length >= 3 ? 'true' : 'false',
              className: 'mt-2 min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold disabled:cursor-not-allowed disabled:opacity-50', style: neutralBtnStyle(false)
            }, '💾 ' + t('stem.heatlab.hs_save', 'Save for comparison ({n} of 3 used)').replace('{n}', String(hsSaved.length)))) : null,
          hsSaved.length ? h('div', { className: 'mt-2 overflow-x-auto', 'data-ht-house-compare': 'true', role: 'region', tabIndex: 0, 'aria-label': t('stem.heatlab.hs_compare', 'Compare your saved houses') },
            h('table', { className: 'w-full text-[0.6875rem]', style: { borderCollapse: 'collapse', color: bodyInk } },
              h('caption', { className: 'text-left font-black mb-1' }, '⚖️ ' + t('stem.heatlab.hs_compare', 'Compare your saved houses')),
              h('thead', null, h('tr', null,
                [t('stem.heatlab.hs_col_design', 'Design'), 'kWh/m²', t('stem.heatlab.hs_col_cost', 'Cost'), 'kg CO₂e', t('stem.heatlab.hs_col_brief', 'Brief'), ''].map(function (c, i) {
                  return h('th', { key: i, scope: 'col', className: 'text-left py-1 pr-2' }, c);
                }))),
              h('tbody', null, hsSaved.map(function (x, i) {
                var name = t('stem.heatlab.hs_design_n', 'House {n}').replace('{n}', String.fromCharCode(65 + i));
                return h('tr', { key: i, 'data-ht-house-saved': String(i), style: { borderTop: '1px solid ' + (isContrast ? '#ffffff' : 'rgba(100,116,139,0.25)') } },
                  h('th', { scope: 'row', className: 'text-left py-1 pr-2 font-normal' }, h('b', null, name + ': '), hsDescribe(x.design)),
                  h('td', { className: 'py-1 pr-2 font-mono' }, fmt(x.kwhM2, 1)),
                  h('td', { className: 'py-1 pr-2 font-mono' }, hsMoney(x.cost)),
                  h('td', { className: 'py-1 pr-2 font-mono' }, fmt(x.co2, 0)),
                  h('td', { className: 'py-1 pr-2' }, x.meets ? '✓' : '✗'),
                  h('td', { className: 'py-1' }, h('button', { type: 'button', onClick: function () { hsRemove(i); }, 'aria-label': t('stem.heatlab.hs_remove_aria', 'Remove {name}').replace('{name}', name),
                    className: 'min-h-11 px-2 rounded-lg text-[0.6875rem] font-bold', style: Object.assign({ minWidth: 44 }, neutralBtnStyle(false)) }, '✕')));
              })))) : null,
          h('label', { htmlFor: 'ht-hs-why', className: 'mt-3 block text-[0.6875rem] font-bold', style: { color: bodyInk } },
            t('stem.heatlab.hs_why', 'Justify your design: which element mattered most, and what did you trade off against cost and carbon?')),
          h('textarea', {
            id: 'ht-hs-why', rows: 3, maxLength: 1000, value: typeof d.hsWhy === 'string' ? d.hsWhy : '',
            onChange: function (e) { upd({ hsWhy: e.target.value.slice(0, 1000) }); },
            className: 'mt-1 w-full rounded-lg border p-2 text-[0.6875rem]',
            style: { borderColor: isContrast ? '#ffffff' : 'rgba(100,116,139,0.4)', background: isContrast ? '#000000' : isDark ? 'rgba(15,23,42,0.85)' : '#ffffff', color: bodyInk }
          }),
          h('details', { className: 'mt-3 rounded-lg border p-2', 'data-ht-house-model': 'true', style: panelStyle('#94a3b8') },
            h('summary', { className: 'min-h-11 flex items-center cursor-pointer text-[0.6875rem] font-black', style: { color: bodyInk } },
              h('span', null, '🧮 ' + t('stem.heatlab.hs_how_title', 'How we model it'))),
            h('ul', { className: 'mt-1 list-disc pl-5 space-y-1 text-[0.6875rem] leading-relaxed', style: { color: bodyInk } },
              [t('stem.heatlab.hs_how_1', 'A one-storey house, 10 m × 10 m, walls 2.6 m high: 104 m² of wall (minus windows), 100 m² of roof and floor, 260 m³ of air.'),
               t('stem.heatlab.hs_how_2', 'Heat loss per kelvin H = Σ U × A + 0.335 × n × V. The floor counts half, because the ground under it stays milder than winter air.'),
               t('stem.heatlab.hs_how_3', 'Each month: loss = H × degree-days × 24 h ÷ 1000. Degree-days are days × (18.3 °C − monthly mean), never below zero; people and appliances supply the last degrees up to 20 °C.'),
               t('stem.heatlab.hs_how_4', 'Sunshine in = window area × g-value × 0.6 (frame and shading) × the month’s sunshine on that wall. Only part of it is useful (the ISO 13790 utilisation factor): on a sunny mild day the house would just overheat.'),
               t('stem.heatlab.hs_how_5', 'Monthly mean temperatures are 1991–2020 normals (NOAA for Portland and San Francisco, the Met Office for London). The sunshine figures are rounded teaching values, not measured data for a real site.'),
               t('stem.heatlab.hs_how_6', 'Ignored: thermal bridges, cooling in summer, hot water, and how heavy the walls are. Costs and carbon are rough teaching values.')
              ].map(function (txt, i) { return h('li', { key: i }, txt); })))
        ),

        // ── where this goes next ──
        // Four tools in this lab lean hard on heat and had nowhere to point back to.
        sec('next', '#94a3b8',
          heading(isDark ? '#cbd5e1' : '#475569', t('stem.heatlab.take_this_somewhere', '🔗 Take this somewhere')),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            t('stem.heatlab.every_one_of_these_runs_on', 'Every one of these runs on the ideas above. Open one and look for them.')),
          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
            [{ id: 'renewablesLab', icon: '⚡', name: t('stem.heatlab.renewables_lab', 'Renewables Lab'), why: t('stem.heatlab.every_thermal_power_source_is_a', 'Every thermal power source is a heat engine. Carnot sets the ceiling on all of them.') },
             { id: 'plateTectonics', icon: '🌋', name: t('stem.heatlab.plate_tectonics', 'Plate Tectonics'), why: t('stem.heatlab.mantle_convection_is_the_same_roll', 'Mantle convection is the same roll as the 3D tank, running for hundreds of millions of years.') },
             { id: 'weldLab', icon: '⚒️', name: t('stem.heatlab.xl_weld_card', 'WeldLab'), why: t('stem.heatlab.heat_input_conduction_away_from_the', 'Heat input, conduction away from the bead and thermal expansion decide whether a weld holds.') },
             { id: 'kitchenLab', icon: '🍳', name: t('stem.heatlab.xl_kitchen_name', 'Kitchen Lab'), why: t('stem.heatlab.conduction_convection_and_radiation_are', 'Conduction, convection and radiation are three ways to cook, and specific heat is why oil burns you worse than water.') }
            ].map(function (b) {
              return h('button', {
                key: b.id, type: 'button',
                'aria-label': htFmt(t('stem.heatlab.open', 'Open {0}. {1}'), [b.name, b.why]),
                onClick: function () {
                  pushOnce('bridged', b.id);
                  if (typeof setStemLabTool === 'function') setStemLabTool(b.id);
                },
                className: 'text-left rounded-lg p-2.5 border transition-colors',
                style: { background: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(255,255,255,0.92)', borderColor: isDark ? 'rgba(148,163,184,0.26)' : 'rgba(100,116,139,0.24)' }
              },
                h('span', { className: 'flex items-center gap-2' },
                  h('span', { className: 'text-sm', 'aria-hidden': 'true' }, b.icon),
                  h('span', { className: 'text-[0.6875rem] font-black', style: { color: isDark ? '#fff' : '#1e293b' } }, b.name),
                  h('span', { className: 'ml-auto text-[0.6875rem] font-bold', style: { color: ink('#94a3b8') } }, '→')),
                h('span', { className: 'block text-[0.6875rem] mt-1 leading-relaxed', style: { color: isDark ? '#cbd5e1' : '#475569' } }, b.why)
              );
            })
          )
        ),

        h('p', { className: 'text-[0.625rem] mt-3 text-center', style: { color: isDark ? '#94a3b8' : '#475569' } },
          t('stem.heatlab.models_are_real_1_d_heat', 'Models are real: 1-D heat equation, R-values, Q = mcΔT, latent heats of water, and the Carnot limit. Figures are order-of-magnitude accurate for teaching, not for engineering design.'))
      );
    }
  });
})();
