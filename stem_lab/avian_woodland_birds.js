/* Shared woodland birds for Bird Lab observation and Raptor Lab prey.
 * Three.js r128; meters, ground at y=0, bill pointing along +Z.
 * Fieldmarks: Cornell Lab, allaboutbirds.org/guide/Mourning_Dove/id
 * allaboutbirds.org/guide/Ruffed_Grouse/id, /guide/Blue_Jay/id,
 * and /guide/Northern_Cardinal/id (adult male).
 * Poses and cadence profiles are illustrative.
 * No network assets, global RNG, shared live state, or per-frame allocations.
 */
(function (global) {
  'use strict';
  var PI = Math.PI, TAU = PI * 2, EMPTY_POSE = {};
  var SPECIES = {
    mourningDove: {
      body: [.037, .043, .073], bodyY: .083, bodyZ: -.018,
      // A small head is the dove's field mark: about a third of the body's width.
      head: [.0175, .0205, .0225], headY: .132, headZ: .064,
      leg: .034, stance: .014, shoulder: [.030, .096, .013], wing: 1,
      tailY: .081, tailZ: -.065, tailLength: .137, tailWidth: .014,
      neckBase: [.100, .031], neckWidth: .023, billLength: .020,
      // Buffy-tan, not gray: the ACES-lit scene lifts mid-tones, and the
      // earlier gray palette rendered the dove nearly white.
      dark: '#292725', back: '#6e5c4b', breast: '#a2806b', pale: '#c4ad95',
      wingColor: '#5f5243', foot: '#a57671'
    },
    grouse: {
      body: [.066, .078, .124], bodyY: .126, bodyZ: -.008,
      head: [.030, .037, .038], headY: .205, headZ: .106,
      leg: .056, stance: .024, shoulder: [.050, .151, .024], wing: 1.22,
      tailY: .116, tailZ: -.094, tailLength: .152, tailWidth: .021,
      neckBase: [.151, .049], neckWidth: .038, billLength: .023,
      dark: '#2d251e', back: '#65533e', breast: '#a39578', pale: '#c6b58e',
      wingColor: '#50422f', foot: '#9e8b71'
    },
    blueJay: {
      body: [.035, .043, .067], bodyY: .088, bodyZ: -.012,
      head: [.023, .027, .031], headY: .141, headZ: .059,
      leg: .037, stance: .015, shoulder: [.029, .101, .014], wing: .80,
      tailY: .086, tailZ: -.060, tailLength: .135, tailWidth: .013,
      neckBase: [.106, .033], neckWidth: .024, billLength: .029,
      dark: '#1e2833', back: '#487da8', breast: '#c5c8c5', pale: '#e8e9df',
      wingColor: '#387fb8', foot: '#555a61'
    },
    northernCardinal: {
      body: [.027, .033, .049], bodyY: .068, bodyZ: -.010,
      head: [.019, .022, .024], headY: .111, headZ: .044,
      leg: .030, stance: .0115, shoulder: [.022, .081, .009], wing: .52,
      tailY: .066, tailZ: -.048, tailLength: .096, tailWidth: .0094,
      neckBase: [.083, .021], neckWidth: .0185, billLength: .016,
      dark: '#231f20', back: '#a53135', breast: '#cf3538', pale: '#d66555',
      wingColor: '#913b3b', foot: '#8d706b'
    },
    // Hopping ground songbirds. Their tuning lives in `tune`, so the four
    // original species keep their historical code paths exactly.
    // Fieldmarks: allaboutbirds.org/guide/Dark-eyed_Junco/id (slate-colored),
    // /guide/Tufted_Titmouse/id and /guide/Eastern_Towhee/id (adult male).
    darkEyedJunco: {
      body: [.024, .029, .043], bodyY: .060, bodyZ: -.009,
      head: [.0165, .019, .0205], headY: .098, headZ: .039,
      leg: .027, stance: .0105, shoulder: [.019, .071, .008], wing: .46,
      tailY: .058, tailZ: -.042, tailLength: .074, tailWidth: .0085,
      neckBase: [.073, .018], neckWidth: .016, billLength: .011,
      dark: '#1f2124', back: '#3f454b', breast: '#ecebe5', pale: '#f4f3ee',
      wingColor: '#3a4046', foot: '#a8877d',
      tune: { walkReach: .015, stepLift: .009, strideRate: 12, wingbeatCruise: 7.2, wingbeatBurst: 8.8, sizeM: .155,
        eyeRing: '#3b4045', bill: '#e5c4bb', iris: '#141414', crown: '#3d4348', cheek: '#41474c', throat: '#454b50',
        billWidth: .0050, billHeight: .0049, billDroop: .0008, billTaper: 1.0, eye: [.0030, .0031, .0024, .0025],
        peckDrop: .0705, peckForward: .030, upperLeg: .030, footScale: .74, tailShape: [1.7, .05], fan: .40,
        hood: true, wingRound: .22, tailRound: .30 }
    },
    tuftedTitmouse: {
      body: [.025, .030, .044], bodyY: .062, bodyZ: -.009,
      head: [.018, .021, .022], headY: .101, headZ: .040,
      leg: .028, stance: .0105, shoulder: [.020, .074, .008], wing: .48,
      tailY: .060, tailZ: -.043, tailLength: .076, tailWidth: .0088,
      neckBase: [.076, .019], neckWidth: .0168, billLength: .0095,
      dark: '#161616', back: '#50565d', breast: '#e2dfd8', pale: '#ecebe6',
      wingColor: '#4b5158', foot: '#6d747c',
      tune: { walkReach: .015, stepLift: .009, strideRate: 12, wingbeatCruise: 7.0, wingbeatBurst: 8.5, sizeM: .16,
        eyeRing: '#5b6167', bill: '#2c2c2d', iris: '#0b0b0b', crown: '#52585f', cheek: '#d2d3cf', throat: '#e3e2dc',
        billWidth: .0040, billHeight: .0038, billDroop: .0012, billTaper: .9, eye: [.0036, .0037, .0030, .0031],
        peckDrop: .0737, peckForward: .030, upperLeg: .031, footScale: .74, tailShape: [1.7, .04], fan: .34,
        flank: '#d79c6f', crest: 'titmouse', forehead: true, wingRound: .22, tailRound: .28 }
    },
    easternTowhee: {
      body: [.031, .036, .058], bodyY: .074, bodyZ: -.012,
      head: [.020, .024, .026], headY: .121, headZ: .051,
      leg: .033, stance: .0125, shoulder: [.025, .089, .010], wing: .60,
      tailY: .072, tailZ: -.056, tailLength: .102, tailWidth: .0105,
      neckBase: [.091, .024], neckWidth: .0195, billLength: .014,
      dark: '#121111', back: '#1b1a1a', breast: '#efede7', pale: '#f3f1ec',
      wingColor: '#181717', foot: '#b28e7f',
      tune: { walkReach: .019, stepLift: .011, strideRate: 11, wingbeatCruise: 6.2, wingbeatBurst: 7.6, sizeM: .20,
        eyeRing: '#2a2222', bill: '#1c1b1b', iris: '#8e1712', crown: '#1a1919', cheek: '#1c1b1b', throat: '#1e1c1c',
        billWidth: .0060, billHeight: .0058, billDroop: .0012, billTaper: 1.0, eye: [.0032, .0033, .0026, .0027],
        peckDrop: .0868, peckForward: .034, upperLeg: .038, footScale: .86, tailShape: [1.6, .14], fan: .36,
        hood: true, flank: '#b0582a', wingPatch: true, tailCorners: true, wingRound: .24, tailRound: .34 }
    },
    // A running, ground-foraging thrush (walks, not hops) and a tiny hopping
    // chickadee. allaboutbirds.org/guide/American_Robin/id and
    // /guide/Black-capped_Chickadee/id.
    americanRobin: {
      body: [.034, .040, .066], bodyY: .090, bodyZ: -.012,
      head: [.021, .024, .027], headY: .136, headZ: .060,
      leg: .040, stance: .0145, shoulder: [.028, .098, .013], wing: .78,
      tailY: .084, tailZ: -.060, tailLength: .110, tailWidth: .0125,
      neckBase: [.103, .032], neckWidth: .0235, billLength: .021,
      dark: '#1b1a1a', back: '#56524c', breast: '#b2491b', pale: '#efebe3',
      wingColor: '#4b4742', foot: '#5a4739',
      tune: { walkReach: .026, stepLift: .012, strideRate: 12, wingbeatCruise: 6.2, wingbeatBurst: 7.4, sizeM: .25,
        eyeRing: '#e9e6de', bill: '#e0b02a', iris: '#121111', crown: '#272626', cheek: '#2f2d2c', throat: '#cfc7bc',
        billWidth: .0042, billHeight: .0040, billDroop: .0018, billTaper: .85, eye: [.0040, .0041, .0031, .0032],
        peckDrop: .0944, peckForward: .046, upperLeg: .046, footScale: 1.0, tailShape: [1.6, .06], fan: .40,
        vent: true, throatStreaks: true, tailCorners: true, wingRound: .20, tailRound: .26 }
    },
    blackCappedChickadee: {
      body: [.022, .027, .039], bodyY: .056, bodyZ: -.008,
      head: [.0165, .0185, .0195], headY: .091, headZ: .035,
      leg: .025, stance: .0098, shoulder: [.017, .066, .007], wing: .44,
      tailY: .054, tailZ: -.039, tailLength: .068, tailWidth: .0078,
      neckBase: [.068, .017], neckWidth: .015, billLength: .0075,
      dark: '#121212', back: '#4a5055', breast: '#efede6', pale: '#f4f2ec',
      wingColor: '#42484e', foot: '#4b4f54',
      tune: { walkReach: .013, stepLift: .008, strideRate: 13, wingbeatCruise: 7.6, wingbeatBurst: 9.0, sizeM: .13,
        eyeRing: '#1a1a1a', bill: '#1e1e1f', iris: '#0b0b0b', crown: '#141414', cheek: '#f1f0eb', throat: '#151515',
        billWidth: .0030, billHeight: .0029, billDroop: .0006, billTaper: 1.0, eye: [.0030, .0031, .0024, .0025],
        peckDrop: .0675, peckForward: .028, upperLeg: .028, footScale: .70, tailShape: [1.7, .08], fan: .36,
        flank: '#d6b088', capAndBib: true, wingEdges: true, wingRound: .22, tailRound: .30 }
    },
    // Native, authored additions: breeding adult male American Goldfinch,
    // adult male Eastern Bluebird, and white-striped adult White-throated Sparrow.
    // Plumage and bill fieldmarks: Cornell Lab, https://www.allaboutbirds.org/guide/american_goldfinch/id
    // https://www.allaboutbirds.org/guide/Eastern_bluebird/id/ and
    // https://www.allaboutbirds.org/guide/White-throated_Sparrow/id .
    // Dimensions/cadence are illustrative model tuning, not measured kinematics.
    americanGoldfinch: {
      body: [.022, .027, .039], bodyY: .057, bodyZ: -.008,
      head: [.016, .0185, .020], headY: .092, headZ: .036,
      leg: .025, stance: .0095, shoulder: [.017, .067, .007], wing: .46,
      tailY: .055, tailZ: -.038, tailLength: .054, tailWidth: .0074,
      neckBase: [.070, .017], neckWidth: .015, billLength: .0105,
      dark: '#17191c', back: '#d6b327', breast: '#f0cb30', pale: '#f2eee1',
      wingColor: '#202126', foot: '#bd977b',
      tune: { hop: true, walkReach: .013, stepLift: .008, strideRate: 13, wingbeatCruise: 7.5, wingbeatBurst: 9.0, sizeM: .13,
        eyeRing: '#b69a34', bill: '#d8a47a', iris: '#111211', crown: '#17191b', cheek: '#edc832', throat: '#efd03b',
        billWidth: .0047, billHeight: .0045, billDroop: .0006, billTaper: 1.08, eye: [.0028, .0029, .0022, .0023],
        peckDrop: .0654, peckForward: .028, upperLeg: .028, footScale: .68, tailShape: [1.5, -.10], fan: .33,
        vent: true, wingRound: .18, tailRound: .18, plumage: 'Breeding adult male' }
    },
    easternBluebird: {
      body: [.028, .034, .050], bodyY: .071, bodyZ: -.010,
      head: [.0195, .0225, .024], headY: .116, headZ: .047,
      leg: .033, stance: .0115, shoulder: [.022, .084, .009], wing: .60,
      tailY: .068, tailZ: -.047, tailLength: .078, tailWidth: .0095,
      neckBase: [.087, .022], neckWidth: .018, billLength: .0145,
      dark: '#1c2430', back: '#2763a5', breast: '#ad542c', pale: '#eeeae0',
      wingColor: '#235486', foot: '#514c49',
      tune: { hop: true, walkReach: .018, stepLift: .010, strideRate: 11.5, wingbeatCruise: 6.6, wingbeatBurst: 8.0, sizeM: .18,
        eyeRing: '#344358', bill: '#292e34', iris: '#101214', crown: '#2e70b1', cheek: '#3269a0', throat: '#b35c32',
        billWidth: .0034, billHeight: .0032, billDroop: .0006, billTaper: .88, eye: [.0033, .0034, .0027, .0028],
        peckDrop: .0833, peckForward: .036, upperLeg: .036, footScale: .81, tailShape: [1.7, .06], fan: .34,
        wingRound: .23, tailRound: .28, plumage: 'Adult male' }
    },
    whiteThroatedSparrow: {
      body: [.026, .031, .047], bodyY: .065, bodyZ: -.010,
      head: [.0175, .021, .022], headY: .105, headZ: .043,
      leg: .030, stance: .011, shoulder: [.021, .077, .008], wing: .50,
      tailY: .062, tailZ: -.045, tailLength: .085, tailWidth: .0086,
      neckBase: [.079, .020], neckWidth: .0168, billLength: .0115,
      dark: '#282321', back: '#795a40', breast: '#b0aaa0', pale: '#f0ece2',
      wingColor: '#6b4c35', foot: '#a48c7f',
      tune: { hop: true, walkReach: .016, stepLift: .010, strideRate: 12, wingbeatCruise: 7.0, wingbeatBurst: 8.4, sizeM: .17,
        // Cornell specifies a gray bill; a pink bill would suggest White-crowned Sparrow.
        eyeRing: '#353333', bill: '#898783', iris: '#141313', crown: '#222020', cheek: '#a6a29a', throat: '#f3efe4',
        billWidth: .0047, billHeight: .0044, billDroop: .0007, billTaper: 1.02, eye: [.0030, .0031, .0024, .0025],
        peckDrop: .0759, peckForward: .032, upperLeg: .033, footScale: .76, tailShape: [1.8, .055], fan: .36,
        wingRound: .23, tailRound: .28, plumage: 'White-striped adult' }
    }
  };
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function number(v, fallback) { return typeof v === 'number' && Number.isFinite(v) ? v : fallback; }
  function smooth(v) { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); }
  function smoothHop(v) { v = clamp(v, 0, 1); return v * v * v * (10 + v * (-15 + 6 * v)); }
  function hopPulse(v) { return v > 0 && v < 1 ? Math.pow(Math.sin(PI * v), 4) : 0; }
  function noise(a, b) { var n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); }
  function supports(id) { return Object.prototype.hasOwnProperty.call(SPECIES, id); }

  function create(THREE, id, options) {
    if (!supports(id)) throw new RangeError('Unsupported woodland bird: ' + id);
    options = options || {};
    var p = SPECIES[id], grouse = id === 'grouse', jay = id === 'blueJay', cardinal = id === 'northernCardinal', high = options.quality !== 'low';
    var dove = id === 'mourningDove', tune = p.tune || null;
    var junco = id === 'darkEyedJunco', titmouse = id === 'tuftedTitmouse', towhee = id === 'easternTowhee';
    var robin = id === 'americanRobin', chickadee = id === 'blackCappedChickadee';
    var goldfinch = id === 'americanGoldfinch', bluebird = id === 'easternBluebird', sparrow = id === 'whiteThroatedSparrow';
    // Small songbirds share the cardinal's short rounded wing and its paired
    // two-footed hop. The cardinal's flight-loading cues stay its own.
    var songbird = cardinal || junco || titmouse || towhee || chickadee || !!(tune && tune.hop), hopper = songbird;
    var hooded = !!(tune && tune.hood), vent = !!(tune && tune.vent);
    // Scene adapters share the anatomy's contact/cadence profile, while the
    // retained geometry and deterministic pose evaluator stay scene agnostic.
    var profile = Object.freeze({ speciesId: id, leg: p.leg, stance: p.stance, ankleY: -p.leg + .003, ankleZ: .002,
      walkReach: tune ? tune.walkReach : grouse ? .034 : jay ? .023 : cardinal ? .017 : .022,
      stepLift: tune ? tune.stepLift : grouse ? .016 : jay ? .012 : cardinal ? .010 : .011,
      strideRate: tune ? tune.strideRate : grouse ? 9 : jay ? 10 : cardinal ? 12 : 11,
      wingbeatCruise: tune ? tune.wingbeatCruise : grouse ? 7.4 : jay ? 5.4 : cardinal ? 6.4 : 5.8,
      wingbeatBurst: tune ? tune.wingbeatBurst : grouse ? 8.5 : jay ? 6.4 : cardinal ? 7.8 : 6.8,
      sizeM: tune ? tune.sizeM : grouse ? .30 : jay ? .29 : cardinal ? .22 : .16 });
    var resources = [], disposed = false, meshes = [];
    var root = new THREE.Group(); root.name = 'avian-woodland-' + id;
    root.userData.speciesId = id; root.userData.quality = high ? 'high' : 'low';
    if (tune && tune.plumage) root.userData.plumage = tune.plumage;
    var body = new THREE.Group(); body.name = 'woodland-body'; root.add(body);
    var head = new THREE.Group(); head.name = 'woodland-head'; root.add(head);
    var tail = new THREE.Group(); tail.name = 'woodland-tail'; root.add(tail);
    var left = new THREE.Group(), right = new THREE.Group();
    left.name = 'woodland-left-wing'; right.name = 'woodland-right-wing';
    root.add(left); root.add(right); left.scale.x = -1;
    var wings = [left, right]; wings.left = left; wings.right = right;
    var feet = [new THREE.Group(), new THREE.Group()];
    feet[0].name = 'woodland-left-foot'; feet[1].name = 'woodland-right-foot';
    root.add(feet[0]); root.add(feet[1]);
    function keep(r) { resources.push(r); return r; }
    function color(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }
    var back = color(p.back), breast = color(p.breast), pale = color(p.pale), dark = color(p.dark);
    var wingColor = color(p.wingColor), footColor = color(p.foot), eyeColor = color(tune ? tune.iris : '#0f1010');
    var eyeRing = color(tune ? tune.eyeRing : grouse ? '#aa9370' : jay ? '#41474b' : cardinal ? '#6b5148' : '#a0b6bd'), billColor = color(tune ? tune.bill : grouse ? '#615647' : jay ? '#242b31' : cardinal ? '#e16638' : '#555450');
    var flank = tune && tune.flank ? color(tune.flank) : null, tinted = hooded || vent || !!flank || bluebird || sparrow;
    var loreYellow = sparrow ? color('#e2c628') : null;
    var billDroop = tune ? tune.billDroop : jay ? .0015 : cardinal ? .001 : .0038;
    function mix(a, b, t) { return new THREE.Color(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t); }
    function shade(c, n) { return new THREE.Color(c.r * n, c.g * n, c.b * n); }
    // Hooded songbirds carry the dark hood down over the breast to a clean line
    // above the white belly; flanked ones wash their lower sides with color.
    // Arguments are the unit surface direction: `down` (+1 under the belly),
    // `front` (+1 at the breast pole) and `side` (|lateral|).
    function songbirdTint(c, down, front, side) {
      if (hooded) c = mix(c, back, smooth((front - .08) / .26) * (1 - smooth((down - (.28 + .22 * front)) / .12)));
      if (flank) c = mix(c, flank, smooth((side - .26) / .34) * smooth((down + .34) / .36) *
        (1 - smooth((down - .84) / .14)) * (1 - smooth((front - .58) / .30)) * .95);
      if (bluebird) {
        // Rust covers the whole forward breast as well as its lower sides.
        // Using only the downward direction left a blue belt at the breast
        // pole between the rust neck and lower chest. Keep that junction rust,
        // while the rearward mantle stays blue and the lower belly stays white.
        var bluebirdBreast = Math.max(smooth((front - .18) / .42), smooth((down + .18) / .48));
        c = mix(back, breast, bluebirdBreast);
        c = mix(c, pale, smooth((down - .24) / .30) * (1 - smooth((front - .13) / .43)));
      }
      if (sparrow) {
        // Long dark mantle streaks run toward the tail over a warm brown back.
        // Gray, unstreaked adult underparts stay outside this dorsal mask.
        c = mix(back, breast, smooth((down + .22) / .44));
        var mantleStreak = smooth((Math.cos(side * 28 + front * .7) - .18) / .54) *
          (1 - smooth((down + .06) / .26)) * smooth((.97 - Math.abs(front)) / .22);
        c = mix(c, dark, mantleStreak * .76);
      }
      // A white lower belly and undertail behind the colored breast.
      if (vent) c = mix(c, pale, smooth((-front - .02) / .40) * smooth((down - .05) / .35) * .95);
      return c;
    }
    function data() { return { p: [], c: [], uv: [], feather: [], ix: [], kind: 0, seed: 0 }; }
    function vertex(d, x, y, z, c, u, v) {
      d.p.push(x, y, z); d.c.push(c.r, c.g, c.b); d.uv.push(u, v);
      d.feather.push(d.kind, d.seed);
    }
    function quad(d, a, b, c, e) { d.ix.push(a, b, c, b, e, c); }
    function geometry(d, dynamic) {
      var g = keep(new THREE.BufferGeometry());
      var position = new THREE.Float32BufferAttribute(d.p, 3);
      if (dynamic) position.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute('position', position);
      g.setAttribute('color', new THREE.Float32BufferAttribute(d.c, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(d.uv, 2));
      g.setAttribute('featherInfo', new THREE.Float32BufferAttribute(d.feather, 2));
      g.setIndex(d.ix); g.computeVertexNormals();
      if (dynamic) g.attributes.normal.setUsage(THREE.DynamicDrawUsage);
      // A fixed conservative local sphere covers every pose without allocating
      // bounding volumes or scanning geometry in the animation loop.
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), grouse ? .48 : .36);
      return g;
    }
    function mesh(parent, name, d, mat, dynamic) {
      var m = new THREE.Mesh(geometry(d, dynamic), mat); m.name = name;
      // Forest shadow texels are much larger than these overlapping vanes.
      // Casting retains ground contact; smooth local normals provide feather
      // depth without coarse self-shadow stippling across tiny wing surfaces.
      m.castShadow = true; m.receiveShadow = false; parent.add(m); meshes.push(m); return m;
    }
    function refresh(g) {
      g.attributes.position.needsUpdate = true;
      // Three r128 computeVertexNormals creates eight Vector3 temporaries on
      // every call. Accumulate directly into the retained attribute instead.
      var positions = g.attributes.position.array, normals = g.attributes.normal.array, indices = g.index.array;
      normals.fill(0);
      for (var t = 0; t < indices.length; t += 3) {
        var a = indices[t] * 3, b = indices[t + 1] * 3, c = indices[t + 2] * 3;
        var ux = positions[c] - positions[b], uy = positions[c + 1] - positions[b + 1], uz = positions[c + 2] - positions[b + 2];
        var vx = positions[a] - positions[b], vy = positions[a + 1] - positions[b + 1], vz = positions[a + 2] - positions[b + 2];
        var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        normals[a] += nx; normals[a + 1] += ny; normals[a + 2] += nz;
        normals[b] += nx; normals[b + 1] += ny; normals[b + 2] += nz;
        normals[c] += nx; normals[c + 1] += ny; normals[c + 2] += nz;
      }
      for (var n = 0; n < normals.length; n += 3) {
        var length = Math.sqrt(normals[n] * normals[n] + normals[n + 1] * normals[n + 1] + normals[n + 2] * normals[n + 2]);
        if (length > 1e-20) { normals[n] /= length; normals[n + 1] /= length; normals[n + 2] /= length; }
        else { normals[n] = 0; normals[n + 1] = 1; normals[n + 2] = 0; }
      }
      g.attributes.normal.needsUpdate = true;
      // Box3.setFromObject caches the local boxes on its first query. Keep an
      // already requested box current for Raptor Lab pickup/contact queries;
      // computeBoundingBox reuses it rather than allocating per animation.
      if (g.boundingBox) g.computeBoundingBox();
    }
    var plumage = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92, side: THREE.DoubleSide }));
    plumage.extensions = { derivatives: true };
    plumage.onBeforeCompile = function (shader) {
      shader.vertexShader = 'attribute vec2 featherInfo;\nvarying vec2 awFeatherInfo;\nvarying vec2 awFeatherUv;\nvarying vec3 awPlumageLocal;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nawFeatherUv = uv;\nawFeatherInfo = featherInfo;\nawPlumageLocal = position;');
      shader.fragmentShader = 'varying vec2 awFeatherInfo;\nvarying vec2 awFeatherUv;\nvarying vec3 awPlumageLocal;\n' + shader.fragmentShader;
      shader.uniforms.awGrouse = { value: grouse ? 1 : 0 };
      shader.uniforms.awJay = { value: jay ? 1 : 0 };
      shader.uniforms.awCardinal = { value: cardinal ? 1 : 0 };
      // Dove-only marks are keyed explicitly, so a new species never inherits
      // the covert spots or cheek mark by falling through the other flags.
      shader.uniforms.awDove = { value: dove ? 1 : 0 };
      shader.fragmentShader = 'uniform float awGrouse;\nuniform float awJay;\nuniform float awCardinal;\nuniform float awDove;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', [
        '#include <color_fragment>',
        'float awNeck = step(5.5, awFeatherInfo.x);',
        'vec2 awUv = mix(awFeatherUv, fract(awFeatherUv * vec2(8.0, 3.0)), awNeck);',
        'float awAcross = abs(awUv.x - .5) * 2.0;',
        // Markings follow each vane, so even the low-detail prey retain clear
        // field marks without adding geometry or downloading a texture. Pixel
        // derivatives fade the finest detail before it can shimmer in flight.
        'float awV = awUv.y, awU = awUv.x, awKind = awFeatherInfo.x;',
        'float awSeed = awFeatherInfo.y;',
        'float awContour = step(.5, awKind) * (1.0 - step(2.5, awKind));',
        'float awFlightFeather = step(2.5, awKind) * (1.0 - awNeck);',
        'float awRandom = fract(sin(awSeed * 12.9898 + 4.13) * 43758.5453);',
        'float awBarPhase = awV * mix(10.0, 34.0, awFlightFeather) + sin(awU * 7.0 + awRandom * 6.28) * .9 + awRandom * mix(3.8, 6.28, awFlightFeather);',
        'float awBarAA = 1.0 - smoothstep(.8, 3.0, fwidth(awBarPhase));',
        'float awBar = smoothstep(.16, .66, sin(awBarPhase)) * awBarAA;',
        'float awMargin = smoothstep(.76, .97, awV) * (.45 + .55 * awAcross);',
        // Fine mottling needs its own footprint: broad contour bars may still
        // resolve when tiny pale flecks have already become subpixel noise.
        'float awFleckV = awV * 31.0 + awSeed, awFleckU = awU * 15.0 + awSeed * 3.0;',
        'float awFleckAA = 1.0 - smoothstep(.65, 2.2, max(fwidth(awFleckV), fwidth(awFleckU)));',
        'float awPaleFleck = pow(max(0.0, sin(awFleckV) * cos(awFleckU)), 4.0) * awFleckAA;',
        'float awHead = step(1.5, awKind) * (1.0 - step(2.5, awKind));',
        'float awGrouseMark = (awContour * (1.0 - awHead * .6) + awFlightFeather + awNeck * .32) * awGrouse;',
        'diffuseColor.rgb *= 1.0 - awGrouseMark * awBar * mix(.31, .34, awFlightFeather);',
        'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.42, .33, .21), awGrouseMark * (awMargin * .28 + awPaleFleck * mix(.22, .07, awContour)));',
        'float awCovert = step(2.5, awKind) * (1.0 - step(3.5, awKind));',
        'float awUnderCovert = awCovert * step(2047.5, awSeed);',
        'float awCovertRow = floor(awSeed / 13.0), awCovertColumn = mod(awSeed, 13.0);',
        // Bold black ovals on the folded coverts are the dove's wing field mark.
        // Exposed vane tips carry them; broad spots stay legible at range.
        'float awSpotSelect = (1.0 - step(.5, mod(awCovertColumn + awCovertRow, 3.0))) * (1.0 - step(2.5, awCovertRow));',
        'float awSpotDistance = length(vec2((awU - .48 - awRandom * .08) * (1.8 + awRandom * .4), (awV - .62 - awRandom * .06) * (2.5 + awRandom * .5)));',
        'float awSpot = 1.0 - smoothstep(.66 - fwidth(awSpotDistance), .86 + fwidth(awSpotDistance), awSpotDistance);',
        'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.023, .020, .017), awDove * awCovert * (1.0 - awUnderCovert) * awSpotSelect * awSpot * .93);',
        // Jay barring follows the vanes, retaining the same broad field marks
        // at either geometry quality. Pale wingbars and tail corners remain
        // unbarred; derivatives soften the markings at woodland distance.
        'float awJayPhase = awV * 31.4159265 + awRandom * .35;',
        'float awJayAA = max(.025, fwidth(awJayPhase));',
        'float awJayBars = 1.0 - smoothstep(.22 - awJayAA, .48 + awJayAA, abs(sin(awJayPhase)));',
        'float awJayBlue = 1.0 - smoothstep(.18, .45, min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b)));',
        'float awJayVane = awFlightFeather * (1.0 - awUnderCovert) * awJay * awJayBlue;',
        'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.012, .019, .027), awJayBars * awJayVane * .86);',
        // The dove's dark auricular mark is pigment in the lower cheek feathers,
        // not another convex, reflective surface like the eye. Negative seeds
        // identify the head without applying its local mask to neck/wing meshes.
        'float awHeadSurface = 1.0 - step(-.5, awSeed);',
        'vec2 awCheek = vec2((awPlumageLocal.z + .009) / .0056, (awPlumageLocal.y + .0105) / .0022);',
        'awCheek.y -= awCheek.x * .38;',
        'float awCheekEdge = length(awCheek) + sin(awCheek.x * 18.0 + awCheek.y * 8.0) * .065;',
        'float awCheekAA = max(.04, fwidth(awCheekEdge));',
        'float awCheekMark = (1.0 - smoothstep(.68 - awCheekAA, 1.0 + awCheekAA, awCheekEdge)) * awHeadSurface * awDove;',
        'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.035, .030, .026), awCheekMark * .88);',
        'float awUnderVane = (gl_FrontFacing ? 0.0 : 1.0) * step(3.5, awKind) * (1.0 - awNeck);',
        'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.31, .30, .25), awUnderVane * mix(.32, .12, awGrouse));',
        // Broad vane shading survives at flight distance. A gently darker root
        // and narrow, warmer rachis separate the overlapping feathers without
        // outlining every edge or turning the whole wing into a glossy plate.
        'float awVane = step(2.5, awKind) * (1.0 - awNeck);',
        'float awRemex = step(3.5, awKind) * (1.0 - awNeck);',
        'float awRootShade = (1.0 - smoothstep(.08, .58, awV)) * awVane;',
        'float awVaneCup = (1.0 - awAcross * awAcross) * sin(awV * 3.14159265) * awVane;',
        'diffuseColor.rgb *= 1.0 - awRootShade * .075 + awVaneCup * .035 + (awRandom - .5) * awVane * .045;',
        'float awRachisAA = fwidth(awU);',
        'float awRachisResolve = 1.0 - smoothstep(.025, .09, awRachisAA);',
        'float awRachisDistance = abs(awU - .5);',
        'float awRachis = (1.0 - smoothstep(.006, .013 + awRachisAA, awRachisDistance)) * awRachisResolve * awRemex;',
        'awRachis *= smoothstep(.04, .18, awV) * (1.0 - smoothstep(.87, .99, awV));',
        'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.36, .32, .25), awRachis * .24);',
        // A second, wider barb scale remains visible at observation distance;
        // the fine scale below resolves only as the camera moves closer.
        // Short contours and folded dorsal coverts need a softly varied barb
        // scale that survives at observation distance. Keep the face, flight
        // vanes, and underwing at their existing scale and contrast.
        'float awCardinalContour = awCardinal * step(.5, awKind) * (1.0 - step(1.5, awKind));',
        'float awCardinalCovert = awCardinal * awCovert * (1.0 - awUnderCovert);',
        'float awCardinalSoftVane = max(awCardinalContour, awCardinalCovert);',
        'float awSoftFrequency = mix(mix(41.0, 55.0, awRandom), mix(63.0, 81.0, awRandom), awCardinalCovert);',
        'float awSoftPhase = awV * awSoftFrequency - awAcross * (6.0 + awV * 2.5) + sin(awV * 7.0 + awRandom * 6.28) * awAcross * .65;',
        'float awBarbPhase = mix(awV * 97.0 - awAcross * 11.0, awSoftPhase, awCardinalSoftVane) + awRandom * 2.0;',
        'float awBarbAA = 1.0 - smoothstep(.8, 2.8, fwidth(awBarbPhase));',
        'float awBarb = sin(awBarbPhase) * awBarbAA * step(.5, awKind);',
        'float awFiberPhase = awV * 566.0 - awAcross * 29.0 + sin(awV * 5.0) * awAcross * 6.0;',
        'float awFiberAA = 1.0 - smoothstep(.6, 2.5, fwidth(awFiberPhase));',
        'float awFiber = sin(awFiberPhase) * awFiberAA;',
        'float awFineAA = 1.0 - smoothstep(.6, 2.5, fwidth(awFiberPhase * 1.91));',
        'float awShaft = (1.0 - smoothstep(.008, .024 + fwidth(awAcross), awAcross)) * .035 * (1.0 - awRemex);',
        'float awRoot = (1.0 - smoothstep(0.0, .22, awV)) * .055 * (1.0 - awCardinalContour * .55);',
        'diffuseColor.rgb *= 1.0 + awBarb * (.032 + awCardinalContour * .023 + awCardinalCovert * .014) + awFiber * .027 + cos(awFiberPhase * 1.91) * awFineAA * .011 - awShaft - awRoot;',
        'float awRelief = awFiber * .000006 + awBarb * .000012 + awRachis * .000018;'
      ].join('\n'));
      shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', [
        '#include <roughnessmap_fragment>',
        'roughnessFactor = clamp(roughnessFactor - awFlightFeather * .065 - awShaft * 1.6 - awRachis * .09 + awRootShade * .025 + awBarb * .015, .72, .97);'
      ].join('\n'));
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', [
        '#include <normal_fragment_maps>',
        'vec3 awDx = dFdx(-vViewPosition), awDy = dFdy(-vViewPosition);',
        'vec3 awR1 = cross(awDy, normal), awR2 = cross(normal, awDx);',
        'float awDet = dot(awDx, awR1);',
        'if (abs(awDet) > 1e-12) normal = normalize(abs(awDet) * normal - sign(awDet) * (dFdx(awRelief) * awR1 + dFdy(awRelief) * awR2));'
      ].join('\n'));
    };
    plumage.customProgramCacheKey = function () { return 'avian-woodland-plumage-v13'; };
    var details = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: cardinal ? .34 : .48 }));
    if (cardinal) {
      // A closed seed bill needs two readable mandibles without another mesh
      // or a raised dark mark near the eye. Use bill-local millimetre scales,
      // avoiding the wrapped UV seam on the cone and fading subpixel detail.
      details.extensions = { derivatives: true };
      details.onBeforeCompile = function (shader) {
        shader.vertexShader = 'attribute vec2 featherInfo;\nvarying float awBillSurface;\nvarying vec3 awFaceLocal;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nawBillSurface = featherInfo.x;\nawFaceLocal = position;');
        shader.fragmentShader = 'varying float awBillSurface;\nvarying vec3 awFaceLocal;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', [
          '#include <color_fragment>',
          'float awBillMask = step(.5, awBillSurface);',
          'float awBillAlong = clamp((awFaceLocal.z - .01824) / .016, 0.0, 1.0);',
          'float awBillCenter = -.0035 - awBillAlong * awBillAlong * .001;',
          'float awBillGapeY = awFaceLocal.y - awBillCenter + (1.0 - awBillAlong) * .00035;',
          'float awBillPixel = max(.000015, fwidth(awBillGapeY));',
          'float awBillResolve = 1.0 - smoothstep(.00018, .00060, awBillPixel);',
          'float awBillSeam = (1.0 - smoothstep(.000045, .00011 + awBillPixel, abs(awBillGapeY))) * awBillResolve;',
          'awBillSeam *= smoothstep(.02, .10, awBillAlong) * (1.0 - smoothstep(.90, 1.0, awBillAlong)) * awBillMask;',
          'float awBillLower = (1.0 - smoothstep(-.0004, .0004, awBillGapeY)) * awBillMask;',
          'float awBillTaper = .04 + .96 * pow(1.0 - awBillAlong, 1.04);',
          'float awBillFiberPhase = awFaceLocal.x / max(.0004, awBillTaper * .0083) * 36.0 + awBillAlong * 1.7;',
          'float awBillFiber = sin(awBillFiberPhase) * (1.0 - smoothstep(.7, 2.4, fwidth(awBillFiberPhase))) * awBillMask;',
          'awBillFiber *= smoothstep(.06, .22, awBillAlong) * (1.0 - smoothstep(.76, .96, awBillAlong));',
          'diffuseColor.rgb *= 1.0 - awBillSeam * .56 - awBillLower * .065 + awBillFiber * .012;'
        ].join('\n'));
        shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', [
          '#include <roughnessmap_fragment>',
          'roughnessFactor = mix(roughnessFactor, .47 - smoothstep(.52, 1.0, awBillAlong) * .09 + awBillLower * .025 + awBillFiber * .018, awBillMask);'
        ].join('\n'));
      };
      details.customProgramCacheKey = function () { return 'avian-woodland-cardinal-details-v1'; };
    } else if (goldfinch || bluebird || sparrow) {
      // Close observation should reveal a closed upper/lower mandible, rather
      // than a featureless cone. Bill-local masks follow each authored size
      // and taper; they add no geometry, texture, draw call or animated state.
      // The fine grain and paired nares are illustrative surface detail, not
      // measured bill microanatomy. Adult bill hues remain in the vertex color.
      details.extensions = { derivatives: true };
      details.onBeforeCompile = function (shader) {
        shader.uniforms.awResidentBillProfile = { value: new THREE.Vector4(p.head[2] * .76, p.billLength, billDroop, tune.billTaper) };
        shader.uniforms.awResidentBillSection = { value: new THREE.Vector2(tune.billWidth, tune.billHeight) };
        shader.vertexShader = 'attribute vec2 featherInfo;\nvarying float awResidentBillSurface;\nvarying vec3 awResidentFaceLocal;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nawResidentBillSurface = featherInfo.x;\nawResidentFaceLocal = position;');
        shader.fragmentShader = 'uniform vec4 awResidentBillProfile;\nuniform vec2 awResidentBillSection;\nvarying float awResidentBillSurface;\nvarying vec3 awResidentFaceLocal;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', [
          '#include <color_fragment>',
          'float awResidentBillMask = step(.5, awResidentBillSurface);',
          'float awResidentAlong = clamp((awResidentFaceLocal.z - awResidentBillProfile.x) / awResidentBillProfile.y, 0.0, 1.0);',
          'float awResidentTaper = .04 + .96 * pow(1.0 - awResidentAlong, awResidentBillProfile.w);',
          'float awResidentCenter = -.0035 - awResidentAlong * awResidentAlong * awResidentBillProfile.z;',
          // Project in physical local coordinates, avoiding the cone's UV seam.
          'float awResidentGape = awResidentFaceLocal.y - awResidentCenter + (1.0 - awResidentAlong) * awResidentBillSection.y * .035;',
          'float awResidentPixel = max(.00001, fwidth(awResidentGape));',
          'float awResidentResolve = 1.0 - smoothstep(.00012, .00048, awResidentPixel);',
          'float awResidentSeam = (1.0 - smoothstep(.000025, .000065 + awResidentPixel, abs(awResidentGape))) * awResidentResolve;',
          'awResidentSeam *= smoothstep(.28, .46, awResidentAlong) * (1.0 - smoothstep(.91, 1.0, awResidentAlong)) * awResidentBillMask;',
          'float awResidentLower = (1.0 - smoothstep(-.0002, .0002, awResidentGape)) * awResidentBillMask;',
          // Mirrored lateral masks cannot become an extra eye or a raised bump.
          // They lie above the commissure on the exposed, proximal bill surface.
          'float awResidentSide = abs(awResidentFaceLocal.x) / max(.0001, awResidentBillSection.x * awResidentTaper);',
          'float awResidentUp = (awResidentFaceLocal.y - awResidentCenter) / max(.0001, awResidentBillSection.y * awResidentTaper);',
          'vec2 awResidentNareLocal = vec2((awResidentAlong - .52) / .052, (awResidentUp - .34) / .16);',
          'float awResidentNareDistance = length(awResidentNareLocal);',
          'float awResidentNareAA = max(.035, fwidth(awResidentNareDistance));',
          'float awResidentNareResolve = 1.0 - smoothstep(.9, 2.2, awResidentNareAA);',
          'float awResidentNare = (1.0 - smoothstep(.64 - awResidentNareAA, 1.0 + awResidentNareAA, awResidentNareDistance)) * awResidentNareResolve;',
          'awResidentNare *= smoothstep(.66, .87, awResidentSide) * awResidentBillMask;',
          'float awResidentGrainPhase = awResidentFaceLocal.x / max(.0002, awResidentBillSection.x * awResidentTaper) * 31.0 + awResidentAlong * 2.5;',
          'float awResidentGrain = sin(awResidentGrainPhase) * (1.0 - smoothstep(.65, 2.2, fwidth(awResidentGrainPhase)));',
          'awResidentGrain *= smoothstep(.40, .58, awResidentAlong) * (1.0 - smoothstep(.84, .98, awResidentAlong)) * awResidentBillMask;',
          'diffuseColor.rgb *= 1.0 - awResidentSeam * .48 - awResidentNare * .64 - awResidentLower * .07 + awResidentGrain * .014;'
        ].join('\n'));
        shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', [
          '#include <roughnessmap_fragment>',
          'roughnessFactor = mix(roughnessFactor, .46 - smoothstep(.58, 1.0, awResidentAlong) * .07 + awResidentLower * .025 + awResidentGrain * .018 + awResidentNare * .10, awResidentBillMask);'
        ].join('\n'));
      };
      // All three species share one program; their physical scales are uniforms.
      details.customProgramCacheKey = function () { return 'avian-woodland-resident-bill-v1'; };
    }
    var feetMaterial = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .79 }));
    feetMaterial.extensions = { derivatives: true };
    feetMaterial.onBeforeCompile = function (shader) {
      shader.vertexShader = 'attribute vec2 featherInfo;\nvarying vec2 awFootSurface;\nvarying vec2 awFootUv;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nawFootSurface = featherInfo;\nawFootUv = uv;');
      shader.fragmentShader = 'varying vec2 awFootSurface;\nvarying vec2 awFootUv;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', [
        '#include <color_fragment>',
        'float awFootLeg = 1.0 - step(1.5, awFootSurface.x);',
        'float awFootToe = step(1.5, awFootSurface.x) * (1.0 - step(2.5, awFootSurface.x));',
        'float awFootHorn = step(3.5, awFootSurface.x);',
        // The second surface channel carries a continuous ring-facing value,
        // so the plate mask has no artificial seam around the tiny tubes.
        'float awFootTop = smoothstep(.05, .78, awFootSurface.y);',
        'float awFootPlates = (awFootLeg + awFootToe) * awFootTop;',
        'float awFootPhase = (awFootUv.y * mix(8.0, 11.0, awFootLeg) + awFootSurface.y * .10) * 6.2831853;',
        'float awFootResolve = 1.0 - smoothstep(.8, 3.2, fwidth(awFootPhase));',
        'float awFootWave = sin(awFootPhase);',
        'float awFootGroove = pow(max(0.0, -awFootWave), 7.0) * awFootResolve * awFootPlates;',
        'float awFootPlate = smoothstep(-.15, .86, awFootWave) * awFootResolve * awFootPlates;',
        'float awFootJointDistance = min(abs(awFootUv.y - .31), abs(awFootUv.y - .64));',
        'float awFootJointAA = fwidth(awFootUv.y);',
        'float awFootJoint = (1.0 - smoothstep(.014 + awFootJointAA, .045 + awFootJointAA, awFootJointDistance)) * awFootToe * awFootTop;',
        'awFootJoint *= 1.0 - smoothstep(.035, .12, awFootJointAA);',
        'float awHornPhase = awFootSurface.y * 43.0 + awFootUv.y * 3.0;',
        'float awHornResolve = 1.0 - smoothstep(.8, 3.0, fwidth(awHornPhase));',
        'float awHornFiber = sin(awHornPhase) * awHornResolve * awFootHorn;',
        'diffuseColor.rgb *= 1.0 - awFootGroove * .085 - awFootJoint * .055 + awFootPlate * .025 + awHornFiber * .012;',
        'float awFootRelief = (awFootPlate * .000024 - awFootGroove * .000010 - awFootJoint * .000012) + awHornFiber * .000003;'
      ].join('\n'));
      shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', [
        '#include <roughnessmap_fragment>',
        'roughnessFactor = mix(clamp(roughnessFactor + awFootGroove * .07 - awFootPlate * .025, .74, .90), .55 + awFootUv.y * .08, awFootHorn);'
      ].join('\n'));
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', [
        '#include <normal_fragment_maps>',
        'vec3 awFootDx = dFdx(-vViewPosition), awFootDy = dFdy(-vViewPosition);',
        'vec3 awFootR1 = cross(awFootDy, normal), awFootR2 = cross(normal, awFootDx);',
        'float awFootDet = dot(awFootDx, awFootR1);',
        'if (abs(awFootDet) > 1e-12) normal = normalize(abs(awFootDet) * normal - sign(awFootDet) * (dFdx(awFootRelief) * awFootR1 + dFdy(awFootRelief) * awFootR2));'
      ].join('\n'));
    };
    feetMaterial.customProgramCacheKey = function () { return 'avian-woodland-feet-v1'; };

    // Indexed closed surfaces share seam vertices, so lighting is smooth all
    // the way around the body, eye and toes rather than revealing polygon joins.
    function ellipsoid(d, cx, cy, cz, rx, ry, rz, paint, rings, segments) {
      var base = d.p.length / 3;
      vertex(d, cx, cy + ry, cz, paint(0, 0), .5, 0);
      for (var j = 1; j < rings; j++) {
        var t = j / rings, a = t * PI, sa = Math.sin(a), ca = Math.cos(a);
        for (var k = 0; k < segments; k++) {
          var u = k / segments, b = u * TAU;
          vertex(d, cx + rx * sa * Math.cos(b), cy + ry * ca, cz + rz * sa * Math.sin(b), paint(t, b), u, t);
        }
      }
      var end = d.p.length / 3;
      vertex(d, cx, cy - ry, cz, paint(1, 0), .5, 1);
      for (var s = 0; s < segments; s++) {
        var sn = (s + 1) % segments;
        d.ix.push(base, base + 1 + sn, base + 1 + s);
        for (var r = 0; r < rings - 2; r++) {
          var a0 = base + 1 + r * segments + s, a1 = base + 1 + r * segments + sn;
          quad(d, a0, a1, a0 + segments, a1 + segments);
        }
        d.ix.push(end, end - segments + s, end - segments + sn);
      }
    }
    function constant(c) { return function () { return c; }; }
    var bodyData = data();
    function frontBreastTint(c, zr) {
      return mix(c, breast, smooth((zr - .74) / .26) * .5);
    }
    function bodyColor(t, angle) {
      var ventral = smooth((t - .37) * 2.4), c = mix(back, breast, ventral);
      if (grouse) c = mix(c, pale, ventral * .18);
      c = frontBreastTint(c, Math.sin(t * PI) * Math.sin(angle));
      if (tinted) c = songbirdTint(c, -Math.cos(t * PI), Math.sin(t * PI) * Math.sin(angle), Math.abs(Math.sin(t * PI) * Math.cos(angle)));
      return c;
    }
    // Recess the continuous undercoat slightly. Curved contour facets must
    // remain above it between their vertices, not just at the vertices.
    ellipsoid(bodyData, 0, 0, 0, p.body[0] - .0008, p.body[1] - .0008, p.body[2] - .0008, bodyColor, high ? 20 : 12, high ? 32 : 18);

    // Small overlapping contours follow the rounded torso. Their edges barely
    // rise above the surface; the silhouette stays soft instead of scale-like.
    var contourRows = high ? 18 : 10, contourAround = high ? 28 : 16;
    for (var row = 0; row < contourRows; row++) {
      for (var around = 0; around < contourAround; around++) {
        var startT = .025 + row * (high ? .052 : .091) + (noise(row, around) - .5) * .012;
        var phi = (around + (row % 2) * .5) / contourAround * TAU;
        var widthPhi = TAU / contourAround * .62;
        var lengthT = (high ? .073 : .12) + noise(row + 14, around) * .014;
        var exposed = 1 - smooth((Math.sin(phi) - .18) / .52);
        var featherTurn = (noise(row + 37, around) - .5) * .045 * exposed;
        lengthT *= 1 + (noise(row + 72, around) - .5) * .14 * exposed;
        var steps = high ? 4 : 3, acrossSteps = high ? 4 : 2;
        var offset = bodyData.p.length / 3;
        bodyData.kind = 1; bodyData.seed = row * 31 + around;
        for (var j = 0; j <= steps; j++) {
          var v = j / steps, zt = clamp(startT + v * lengthT, .025, .975);
          var zr = 1 - zt * 2, radial = Math.sqrt(Math.max(0, 1 - zr * zr));
          var edgeShape = .10 + .90 * Math.pow(Math.sin(PI * Math.pow(v, .72)), .58);
          for (var k = 0; k <= acrossSteps; k++) {
            var u = k / acrossSteps, across = u * 2 - 1;
            var lateral = across * widthPhi * edgeShape * (1 + exposed * across * (noise(row, around + 52) - .5) * .09);
            lateral += featherTurn * Math.sin(PI * v);
            var ph = phi + lateral, nx = Math.cos(ph), ny = Math.sin(ph);
            var lift = .00018 + Math.sin(PI * v) * .00022 + v * .00010;
            lift += exposed * (v * v * .00028 + Math.sin(PI * v) * (1 - across * across) * .00012);
            var colorFront = smooth((zr - .74) / .26);
            var colorNy = ny * (1 - colorFront + colorFront * radial);
            var c = frontBreastTint(mix(back, breast, smooth((.35 - colorNy) * .9)), zr);
            if (tinted) c = songbirdTint(c, -ny * radial, zr, Math.abs(nx) * radial);
            var mottling = noise(row * 7 + around, j + k * .37);
            if (grouse) {
              // Broken pale feather margins and fine dark transverse marks.
              c = mix(c, pale, .05 + mottling * .08);
            } else {
              c = mix(c, pale, smooth((v - .86) * 7) * (songbird ? .035 : .08));
            }
            c = shade(c, songbird ? .985 + noise(row, around) * .03 : .96 + noise(row, around) * .08);
            vertex(bodyData, nx * (p.body[0] * radial + lift), ny * (p.body[1] * radial + lift), zr * p.body[2], c, u, v);
          }
        }
        for (var y = 0; y < steps; y++) for (var x = 0; x < acrossSteps; x++) {
          var q = offset + y * (acrossSteps + 1) + x;
          quad(bodyData, q, q + 1, q + acrossSteps + 1, q + acrossSteps + 2);
        }
      }
    }
    // The long torso tracts begin behind the breast pole. A short radial tract
    // closes that bare cap, overlapping the first row without raising a collar.
    // Each feather starts with one fan vertex, avoiding collapsed pole quads.
    var capAround = high ? 14 : 10, capSteps = high ? 5 : 4, capAcross = high ? 4 : 2;
    var capAngle = Math.acos(1 - .064 * 2);
    for (var cap = 0; cap < capAround; cap++) {
      var capBase = bodyData.p.length / 3, capPhi = (cap + .25) / capAround * TAU;
      bodyData.kind = 1; bodyData.seed = 1000 + cap;
      var capCenter = frontBreastTint(mix(back, breast, smooth(.35 * .9)), 1);
      if (tinted) capCenter = songbirdTint(capCenter, 0, 1, 0);
      vertex(bodyData, 0, 0, p.body[2], capCenter, .5, 0);
      for (var cj = 1; cj <= capSteps; cj++) {
        var cv = cj / capSteps, ca = capAngle * cv;
        var capRadial = Math.sin(ca), capZ = Math.cos(ca);
        var capShape = 1 - smooth((cv - .8) / .2) * .86;
        for (var ck = 0; ck <= capAcross; ck++) {
          var cu = ck / capAcross, capSide = cu * 2 - 1;
          var cp = capPhi + capSide * TAU / capAround * .56 * capShape;
          var capNx = Math.cos(cp), capNy = Math.sin(cp);
          var capLift = Math.sin(PI * cv) * (.00011 + (1 - capSide * capSide) * .00007) + cv * .00008;
          var capColor = frontBreastTint(mix(back, breast, smooth((.35 - capNy * capRadial) * .9)), capZ);
      if (tinted) capColor = songbirdTint(capColor, -capNy * capRadial, capZ, Math.abs(capNx) * capRadial);
          capColor = shade(capColor, .98 + noise(cap + 45, cj) * .035);
          vertex(bodyData, capNx * (p.body[0] * capRadial + capLift), capNy * (p.body[1] * capRadial + capLift),
            capZ * p.body[2], capColor, cu, cv);
        }
      }
      for (var cf = 0; cf < capAcross; cf++) bodyData.ix.push(capBase, capBase + 1 + cf, capBase + 2 + cf);
      for (var cy = 0; cy < capSteps - 1; cy++) for (var cx = 0; cx < capAcross; cx++) {
        var cq = capBase + 1 + cy * (capAcross + 1) + cx;
        quad(bodyData, cq, cq + capAcross + 1, cq + 1, cq + capAcross + 2);
      }
    }
    // Short rump and undertail coverts continue the rearward feather lay across
    // the pole. A staggered tract avoids a bare oval or a radial pinwheel where
    // the long torso contours converge; every vane hugs the existing ellipsoid.
    var rumpRows = high ? 7 : 5, rumpColumns = high ? 7 : 5;
    var rumpStep = high ? .14 : .20, rumpSteps = high ? 4 : 3, rumpAcross = high ? 4 : 2;
    for (var rr = 0; rr < rumpRows; rr++) for (var rc = 0; rc < rumpColumns; rc++) {
      var rumpX = (rc - (rumpColumns - 1) * .5 + (rr % 2) * .5) * rumpStep;
      var rumpStart = .48 - rr * rumpStep, rumpLength = (high ? .29 : .40) + noise(rr + 57, rc) * .014;
      var rumpMiddle = rumpStart - rumpLength * .5;
      if (rumpX * rumpX + rumpMiddle * rumpMiddle > .48 * .48) continue;
      var rumpOffset = bodyData.p.length / 3;
      bodyData.kind = 1; bodyData.seed = 1200 + rr * 11 + rc;
      for (var rj = 0; rj <= rumpSteps; rj++) {
        var rv = rj / rumpSteps;
        var rumpShape = .22 + .78 * Math.pow(Math.sin(PI * Math.pow(rv, .76)), .50);
        var rumpY = rumpStart - rv * rumpLength;
        for (var rk = 0; rk <= rumpAcross; rk++) {
          var ru = rk / rumpAcross, rumpSide = ru * 2 - 1;
          var rx = rumpX + rumpSide * (high ? .11 : .15) * rumpShape;
          rx += (noise(rr, rc + 64) - .5) * .012 * Math.sin(PI * rv);
          var rz = -Math.sqrt(Math.max(.01, 1 - rx * rx - rumpY * rumpY));
          var rnx = rx / p.body[0], rny = rumpY / p.body[1], rnz = rz / p.body[2];
          var rnLength = Math.sqrt(rnx * rnx + rny * rny + rnz * rnz);
          var rumpLift = .00009 + (rumpRows - rr) * .000025 + Math.sin(PI * rv) * .00011 + rv * .000045;
          var rumpColor = mix(back, breast, smooth((.20 - rumpY) * 1.3));
          if (grouse) rumpColor = mix(rumpColor, pale, .06 + noise(rr, rc + 12) * .05);
      if (tinted) rumpColor = songbirdTint(rumpColor, -rumpY, rz, Math.abs(rx));
          rumpColor = shade(rumpColor, .97 + noise(rr + 35, rc) * .06);
          vertex(bodyData, rx * p.body[0] + rnx / rnLength * rumpLift,
            rumpY * p.body[1] + rny / rnLength * rumpLift, rz * p.body[2] + rnz / rnLength * rumpLift,
            rumpColor, ru, rv);
        }
      }
      for (var ry = 0; ry < rumpSteps; ry++) for (var rkx = 0; rkx < rumpAcross; rkx++) {
        var rq = rumpOffset + ry * (rumpAcross + 1) + rkx;
        quad(bodyData, rq, rq + 1, rq + rumpAcross + 1, rq + rumpAcross + 2);
      }
    }
    // Keep the dorsal mantle unchanged for the folded wings, but flatten the
    // ventral contour slightly and taper the rear belly toward the tail. This
    // gives a breast/keel profile instead of a uniformly inflated ellipsoid.
    for (var torsoVertex = 0; torsoVertex < bodyData.p.length; torsoVertex += 3) {
      var belly = smooth((-bodyData.p[torsoVertex + 1] / p.body[1] - .10) / .82);
      var rearBelly = smooth(-bodyData.p[torsoVertex + 2] / p.body[2]);
      bodyData.p[torsoVertex] *= 1 - belly * rearBelly * .08;
      bodyData.p[torsoVertex + 1] *= 1 - belly * (grouse ? .035 : .08);
    }
    // Tapered thigh tracts merge into the belly instead of appearing as two
    // bare oval pieces beneath it. Their contour feathers share this mesh and
    // narrow toward the exposed tarsi, with the roots hidden inside the torso.
    for (var side = -1; side <= 1; side += 2) {
      var thighX = side * p.stance, thighY = -p.body[1] * .64, thighZ = .004;
      var thighRx = p.body[0] * .31, thighRy = p.body[1] * .43, thighRz = p.body[2] * .225;
      var thighBase = bodyData.p.length, thighTint = bluebird ? mix(pale, breast, .06) : mix(breast, back, .18);
      bodyData.kind = 0; bodyData.seed = side < 0 ? 2200 : 2400;
      ellipsoid(bodyData, thighX, thighY, thighZ, thighRx - .00055, thighRy - .00055, thighRz - .00055,
        constant(thighTint), high ? 12 : 8, high ? 16 : 12);
      for (var thighVertex = thighBase; thighVertex < bodyData.p.length; thighVertex += 3) {
        var thighT = clamp((1 - (bodyData.p[thighVertex + 1] - thighY) / thighRy) * .5, 0, 1);
        var thighTaper = 1 - smooth((thighT - .38) / .62) * .34;
        bodyData.p[thighVertex] = thighX + (bodyData.p[thighVertex] - thighX) * thighTaper;
        bodyData.p[thighVertex + 2] = thighZ + (bodyData.p[thighVertex + 2] - thighZ) * thighTaper;
      }
      var thighRows = high ? 8 : 5, thighAround = high ? 12 : 8, thighSteps = high ? 4 : 3;
      for (var thighRow = 0; thighRow < thighRows; thighRow++) for (var thighColumn = 0; thighColumn < thighAround; thighColumn++) {
        var thighOffset = bodyData.p.length / 3, thighStart = .045 + thighRow * (high ? .105 : .172);
        var thighPhi = (thighColumn + (thighRow % 2) * .5) / thighAround * TAU;
        var thighLength = (high ? .19 : .28) + noise(thighRow, thighColumn + 81) * .018;
        bodyData.kind = 1; bodyData.seed = (side < 0 ? 2200 : 2400) + thighRow * 17 + thighColumn;
        for (var tj = 0; tj <= thighSteps; tj++) {
          var tv = tj / thighSteps, tt = clamp(thighStart + tv * thighLength, .025, .975), theta = tt * PI;
          var thighShape = .07 + .93 * Math.pow(Math.sin(PI * Math.pow(tv, .77)), .54);
          var taper = 1 - smooth((tt - .38) / .62) * .34;
          for (var tk = 0; tk <= 2; tk++) {
            var tu = tk / 2, tc = tu * 2 - 1;
            var ta = thighPhi + tc * TAU / thighAround * .59 * thighShape;
            var thighLift = .00017 + Math.sin(PI * tv) * (1 - tc * tc) * .00014 + tv * tv * .00010;
            var tr = Math.sin(theta) * taper;
            var thighColor = shade(thighTint, .96 + noise(thighRow, thighColumn + 4) * .08);
            vertex(bodyData, thighX + Math.cos(ta) * (thighRx * tr + thighLift), thighY + Math.cos(theta) * thighRy,
              thighZ + Math.sin(ta) * (thighRz * tr + thighLift), thighColor, tu, tv);
          }
        }
        for (var ty = 0; ty < thighSteps; ty++) for (var tx = 0; tx < 2; tx++) {
          var tq = thighOffset + ty * 3 + tx; quad(bodyData, tq, tq + 1, tq + 3, tq + 4);
        }
      }
    }
    mesh(body, 'woodland-body-plumage', bodyData, plumage);

    var headData = data();
    var headCrown = color(tune ? tune.crown : grouse ? '#61513c' : jay ? '#4b87b5' : cardinal ? '#d43b39' : '#76726c');
    var headCheek = color(tune ? tune.cheek : grouse ? '#806b4c' : jay ? '#d0d5d3' : cardinal ? '#bc3033' : '#957c69');
    var headThroat = color(tune ? tune.throat : grouse ? '#a4936f' : jay ? '#e1e3d9' : cardinal ? '#292021' : '#a2846e');
    function headPaint(t, angle) {
      var c = mix(headCrown, headCheek, smooth((t - .23) * 1.8));
      var front = .5 + .5 * Math.sin(angle);
      c = mix(c, headThroat, smooth((t - .68) * 3) * front * .45);
      if (cardinal) {
        // The male's mask is a continuous matte feather tract around the
        // bill, true eye and throat, never a second round cheek marking.
        // Curve the brow around each socket, retain the red cheek behind it,
        // and taper the lower mask into a bib instead of a broad black collar.
        var maskSide = Math.sin(angle);
        var maskBrow = Math.exp(-Math.pow((maskSide - .36) / .26, 2));
        var maskThreshold = .10 + .60 * smooth((t - .55) / .29);
        var maskFront = smooth((maskSide - maskThreshold) / .15);
        var maskCap = smooth((t - (.400 - .035 * maskBrow)) / .070);
        c = mix(c, dark, maskFront * maskCap * .98);
        c = shade(c, .98 + noise(Math.floor(t * 35), Math.floor(angle * 12)) * .04);
      } else if (goldfinch) {
        // The breeding male's black forehead/cap stops before the yellow nape.
        // Unit-surface masks also cover the undercoat, avoiding raised patches.
        var finchY = Math.cos(t * PI), finchZ = Math.sin(t * PI) * Math.sin(angle);
        var finchCap = smooth((finchY - .27) / .20) * smooth((finchZ + .22) / .26);
        c = mix(headCheek, headThroat, smooth((t - .62) / .28) * front);
        c = mix(c, headCrown, finchCap);
        c = shade(c, .985 + noise(Math.floor(t * 35), Math.floor(angle * 12)) * .03);
      } else if (bluebird) {
        // Blue crown, cheek and nape; rust is confined to the lower front throat.
        c = mix(headCrown, headCheek, smooth((t - .22) / .66) * .35);
        c = mix(c, headThroat, smooth((t - .64) / .15) * smooth((Math.sin(angle) - .10) / .40));
        c = shade(c, .98 + noise(Math.floor(t * 35), Math.floor(angle * 12)) * .04);
      } else if (sparrow) {
        // White central crown + white supercilia separated by black crown
        // stripes, with yellow lores before the real eyes and a neat white bib.
        var sparrowY = Math.cos(t * PI), sparrowX = Math.abs(Math.sin(t * PI) * Math.cos(angle));
        var sparrowZ = Math.sin(t * PI) * Math.sin(angle);
        var crownArc = Math.atan2(sparrowX, sparrowY);
        var crownMask = smooth((sparrowY - .12) / .28);
        var centerStripe = 1 - smooth((crownArc - .20) / .10);
        var browStripe = smooth((crownArc - .73) / .12) * (1 - smooth((crownArc - 1.12) / .11));
        c = mix(headCheek, headCrown, crownMask);
        c = mix(c, pale, Math.max(centerStripe, browStripe) * crownMask);
        var eyeStripe = Math.exp(-Math.pow((sparrowY - .13) / .115, 2)) * smooth((sparrowX - .44) / .22);
        c = mix(c, dark, eyeStripe * .82);
        var lore = Math.exp(-Math.pow((sparrowY - .17) / .16, 2)) * smooth((sparrowZ - .39) / .20) *
          smooth((sparrowX - .42) / .18);
        c = mix(c, loreYellow, lore * .98);
        var throatPatch = smooth((-sparrowY - .29) / .18) * smooth((sparrowZ - .15) / .22);
        c = mix(c, headThroat, throatPatch);
        c = shade(c, .985 + noise(Math.floor(t * 35), Math.floor(angle * 12)) * .03);
      } else if (chickadee) {
        // Black cap and bib frame a white cheek that wraps toward the nape.
        var chickFront = Math.sin(angle);
        c = mix(headCrown, headCheek, smooth((t - .38) / .07));
        c = mix(c, headThroat, smooth((chickFront + .05) / .25) * smooth((t - .58) / .07));
        c = mix(c, back, smooth((-chickFront - .45) / .25) * smooth((t - .40) / .08) * .85);
        c = shade(c, .98 + noise(Math.floor(t * 35), Math.floor(angle * 12)) * .04);
      } else if (robin) {
        // Dark head over a white, dark-streaked throat; the white eye arcs are the eye ring.
        var robinFront = .5 + .5 * Math.sin(angle);
        c = mix(c, headThroat, smooth((t - .64) / .12) * smooth((robinFront - .62) / .20));
        var robinStreak = smooth((Math.sin(angle * 46) - .55) / .25) * smooth((t - .66) / .10) * smooth((robinFront - .70) / .15);
        c = mix(c, dark, robinStreak * .65);
        c = shade(c, .97 + noise(Math.floor(t * 35), Math.floor(angle * 12)) * .05);
      } else if (titmouse) {
        // Gray crown and nape; only the face and throat are pale. A small
        // black band crosses the forehead just above the bill.
        var titFace = .5 + .5 * Math.sin(angle);
        c = mix(headCrown, headCheek, smooth((t - .40) / .22) * smooth((titFace - .30) / .32));
        c = mix(c, headThroat, smooth((t - .68) / .20) * titFace * .6);
        var foreheadPatch = smooth((Math.sin(angle) - .52) / .26) * Math.exp(-Math.pow((t - .37) * 12, 2));
        c = mix(c, dark, foreheadPatch * .96);
        c = shade(c, .97 + noise(Math.floor(t * 35), Math.floor(angle * 12)) * .05);
      } else if (jay) {
        c = mix(headCrown, headCheek, smooth((t - .28) / .22));
        c = mix(c, headThroat, smooth((t - .57) / .30) * front);
        // A narrow feathered loral line joins the bill to each true eye;
        // the pale cheek has no separate dark, eye-like auricular spot.
        var lore = Math.exp(-Math.pow((t - .47) * 24, 2)) * smooth((Math.sin(angle) - .20) / .58);
        c = mix(c, dark, lore * .92);
        c = shade(c, .97 + noise(Math.floor(t * 35), Math.floor(angle * 12)) * .06);
      } else if (grouse) {
        var eyebrow = Math.exp(-Math.pow((t - .34) * 20, 2));
        var eyeLine = Math.exp(-Math.pow((t - .44) * 23, 2));
        c = mix(c, pale, eyebrow * .19 * front);
        c = mix(c, dark, eyeLine * .39 * front);
        c = shade(c, .90 + noise(Math.floor(t * 38), Math.floor(angle * 11)) * .18);
      } else c = shade(c, .97 + noise(Math.floor(t * 35), Math.floor(angle * 12)) * .06);
      return c;
    }
    headData.seed = -1;
    ellipsoid(headData, 0, 0, 0, p.head[0] - .00025, p.head[1] - .00025, p.head[2] - .00025, headPaint,
      cardinal ? (high ? 28 : 24) : (high ? 20 : 12), cardinal ? (high ? 40 : 32) : (high ? 30 : 18));
    // Cardinal facial plumage is finer than the overlapping crown feathers.
    // Keep it in the same mesh, with coverage shared by both quality levels.
    var headRows = cardinal ? (high ? 15 : 9) : (high ? 10 : 6);
    var headAround = cardinal ? (high ? 32 : 20) : (high ? 24 : 14);
    for (var hr = 0; hr < headRows; hr++) for (var hc = 0; hc < headAround; hc++) {
      var ho = headData.p.length / 3, headStep = cardinal ? (high ? .0515 : .0885) : (high ? .077 : .133);
      var headJitter = noise(hr + 12, hc + 7) - .5;
      var start = .070 + hr * headStep + headJitter * .008;
      headData.kind = 2; headData.seed = -2 - (hr * (cardinal ? 37 : 31) + hc);
      var azimuth = (hc + (hr % 2) * .5 + headJitter * .12) / headAround * TAU;
      for (var hj = 0; hj <= 4; hj++) {
        var hv = hj / 4, ht = start + hv * headStep * (1.58 + headJitter * .09), theta = Math.min(.97, ht) * PI;
        var headShape = .10 + .90 * Math.pow(Math.sin(hv * PI), .58) + smooth((hv - .72) / .28) * .10;
        for (var hk = 0; hk <= 2; hk++) {
          var hu = hk / 2, headAcross = hu * 2 - 1;
          var ha = azimuth + (headAcross + Math.sin(hv * PI) * headJitter * .06) * TAU / headAround * .60 * headShape;
          var hl = .00010 + Math.sin(hv * PI) * .00007 + smooth((hv - .55) / .45) * .00005 * (1 - headAcross * headAcross);
          vertex(headData, (p.head[0] + hl) * Math.sin(theta) * Math.cos(ha), (p.head[1] + hl) * Math.cos(theta),
            (p.head[2] + hl) * Math.sin(theta) * Math.sin(ha), shade(headPaint(ht, ha), .98 + noise(hr, hc) * .04), hu, hv);
        }
      }
      for (var hy = 0; hy < 4; hy++) for (var hx = 0; hx < 2; hx++) {
        var hi = ho + hy * 3 + hx; quad(headData, hi, hi + 1, hi + 3, hi + 4);
      }
    }

    // A shallow crown and tapered forehead soften the ball-shaped skull.
    // Leave the eye sockets and bill attachment untouched; the lower nape
    // extends into the neck plumage so the head has a feathered transition.
    for (var skullVertex = 0; skullVertex < headData.p.length; skullVertex += 3) {
      var skullY = headData.p[skullVertex + 1] / p.head[1];
      var skullZ = headData.p[skullVertex + 2] / p.head[2];
      var crown = smooth((skullY - .25) / .75), forehead = smooth((skullZ - .48) / .52);
      var nape = smooth((-skullZ - .15) / .85) * smooth((.10 - skullY) / .80);
      headData.p[skullVertex] *= 1 - forehead * .18;
      headData.p[skullVertex + 1] -= p.head[1] * (crown * .10 + nape * .065);
      headData.p[skullVertex + 2] -= p.head[2] * nape * .10;
    }

    function vane(d, ax, ay, az, bx, by, bz, width, paint, longSteps, wideSteps, bulge, asymmetry) {
      var offset = d.p.length / 3, dx = bx - ax, dz = bz - az;
      var len = Math.sqrt(dx * dx + dz * dz), sx = len > 1e-8 ? -dz / len : 1, sz = len > 1e-8 ? dx / len : 0;
      var detailedVane = d.kind >= 3 && d.kind <= 5, tailVane = d.kind === 5;
      var roundedTip = !detailedVane ? .018 : tailVane ? (tune ? tune.tailRound : grouse ? .48 : jay ? .42 : cardinal ? .36 : .18) : d.kind === 3 ? .34 : tune ? tune.wingRound : grouse ? .28 : jay ? .22 : cardinal ? .26 : .14;
      var capDepth = detailedVane ? Math.min(.055, width / Math.max(len, .001) * (tailVane && grouse ? .23 : .16)) : 0;
      // The shorter, broad underwing tips need a shallower cap so the last
      // outer corner cannot fold back through the preceding row.
      if (d.kind === 3 && d.seed >= 2048) capDepth = Math.min(capDepth, .025);
      var edgePhase = noise(d.seed + 23, d.kind + 5) * TAU;
      for (var j = 0; j <= longSteps; j++) {
        var v = j / longSteps;
        var shape = .018 + .982 * Math.pow(Math.sin(PI * Math.pow(v, .78)), grouse ? .40 : .52);
        var cap = smooth((v - .72) / .28);
        shape += (roundedTip - .018) * cap;
        for (var k = 0; k <= wideSteps; k++) {
          var u = k / wideSteps, across = u * 2 - 1;
          // Across the final row the outer barbs end slightly before the
          // shaft. The parabolic cap remains broad and rounded while its
          // center still reaches the exact anatomical feather endpoint.
          var along = v - capDepth * across * across * cap;
          var edgeWave = detailedVane ? Math.sin(PI * v) * Math.sin(v * TAU * 1.35 + edgePhase + across * .7) * .012 : 0;
          var shaftCurve = detailedVane ? width * .013 * Math.sin(PI * v) * Math.sin(v * PI + edgePhase) : 0;
          var lateral = across * width * .5 * shape * (1 + (asymmetry || 0) * across + edgeWave) + shaftCurve;
          var cup = bulge * Math.sin(PI * v) * (1 - Math.pow(u * 2 - 1, 2));
          vertex(d, ax + (bx - ax) * along + sx * lateral, ay + (by - ay) * along + cup,
            az + (bz - az) * along + sz * lateral, paint(v, u), u, v);
        }
      }
      for (var r = 0; r < longSteps; r++) for (var s = 0; s < wideSteps; s++) {
        var q = offset + r * (wideSteps + 1) + s;
        quad(d, q, q + 1, q + wideSteps + 1, q + wideSteps + 2);
      }
      return offset;
    }
    // Resting crest and ruff feathers lie in their own tangent planes. The
    // general wing vane uses an XZ width, which made upright feathers into
    // flat blades and neck feathers into edge-on wires. A curved shaft and
    // shallow cup give these short, overlapping tufts volume from either side.
    function headTuft(ax, ay, az, bx, by, bz, width, sideX, sideY, sideZ, bow, paint) {
      var offset = headData.p.length / 3, dx = bx - ax, dy = by - ay, dz = bz - az;
      var length = Math.sqrt(dx * dx + dy * dy + dz * dz), tx = dx / length, ty = dy / length, tz = dz / length;
      var dot = sideX * tx + sideY * ty + sideZ * tz;
      sideX -= tx * dot; sideY -= ty * dot; sideZ -= tz * dot;
      var sideLength = Math.sqrt(sideX * sideX + sideY * sideY + sideZ * sideZ);
      sideX /= sideLength; sideY /= sideLength; sideZ /= sideLength;
      var nx = sideY * tz - sideZ * ty, ny = sideZ * tx - sideX * tz, nz = sideX * ty - sideY * tx;
      var steps = high ? 6 : 4, columns = high ? 4 : 2;
      var irregular = noise(headData.seed, 19) - .5;
      for (var row = 0; row <= steps; row++) {
        var v = row / steps, tip = smooth((v - .72) / .28);
        var shape = .12 + .88 * Math.pow(Math.sin(PI * Math.pow(v, .85)), .62) + tip * .20;
        for (var column = 0; column <= columns; column++) {
          var u = column / columns, across = u * 2 - 1;
          var along = v - tip * across * across * .035;
          var lateral = width * .5 * shape * across * (1 + irregular * across * .10);
          var curve = Math.sin(PI * v) * (bow + width * .075 * (1 - across * across));
          vertex(headData, ax + dx * along + sideX * lateral + nx * curve,
            ay + dy * along + sideY * lateral + ny * curve,
            az + dz * along + sideZ * lateral + nz * curve, paint(v, u), u, v);
        }
      }
      for (var rowIndex = 0; rowIndex < steps; rowIndex++) for (var columnIndex = 0; columnIndex < columns; columnIndex++) {
        var corner = offset + rowIndex * (columns + 1) + columnIndex;
        quad(headData, corner, corner + 1, corner + columns + 1, corner + columns + 2);
      }
    }
    var cardinalCrestStart = headData.p.length / 3;
    if (cardinal) {
      // A compact pointed crest grows from the crown in overlapping tracts;
      // its narrow central peak and broad low roots differ from a jay's fan.
      var cardinalCrestColumns = high ? 9 : 7;
      for (var cardinalRow = 0; cardinalRow < 3; cardinalRow++) for (var cardinalColumn = 0; cardinalColumn < cardinalCrestColumns; cardinalColumn++) {
        var cardinalAcross = cardinalColumn / (cardinalCrestColumns - 1) * 2 - 1;
        var cardinalRootX = cardinalAcross * .011;
        var cardinalTipY = .024 + .011 * Math.pow(1 - Math.abs(cardinalAcross), .72) - cardinalRow * .0032;
        cardinalTipY += (noise(cardinalColumn + 4, cardinalRow + 13) - .5) * .0007;
        headData.kind = 2; headData.seed = -1600 - cardinalRow * 16 - cardinalColumn;
        var cardinalCrestColor = shade(headCrown, .96 + noise(cardinalColumn, cardinalRow + 31) * .075);
        var cardinalRootY = .016 - Math.abs(cardinalAcross) * .002, cardinalRootZ = .003 - cardinalRow * .005;
        var cardinalTipZ = -.017 - cardinalRow * .003, cardinalVaneStart = headData.p.length / 3;
        headTuft(cardinalRootX, cardinalRootY, cardinalRootZ,
          cardinalRootX * .30, cardinalTipY, cardinalTipZ,
          // Start with tapered tuft outlines and a narrow central peak;
          // the shared row support below seats these outlines together.
          high ? .0068 : .0082, 1, 0, cardinalAcross * .18, -.001 * Math.abs(cardinalAcross),
          function (v) { return mix(cardinalCrestColor, back, v * .14); });
        // Overlapping vanes share each row's support plane. Independent
        // tangent planes crossed through neighboring feathers and exposed
        // dark, unstable seams. Small ordered offsets retain their layering.
        // The common seated height stays inside the crown; the pointed tip
        // heights and lateral feather shapes remain unchanged.
        // Seat the rear rows close to the leading tract so their tips form
        // one crest instead of three widely separated, comb-like sheets.
        var cardinalPlaneY = .014, cardinalPlaneZ = .003 - cardinalRow * .0018;
        var cardinalSlope = (.020 - cardinalRow * .002) / (.021 - cardinalRow * .0032);
        var cardinalDepth = (cardinalColumn - (cardinalCrestColumns - 1) * .5) * .00012;
        for (var cardinalVertex = cardinalVaneStart; cardinalVertex < headData.p.length / 3; cardinalVertex++) {
          var cardinalAlong = headData.uv[cardinalVertex * 2 + 1];
          // Keep even the shortest outer vane above its seated first row,
          // avoiding a reversed triangle where the broad base tapers inward.
          var cardinalY = cardinalAlong === 0 ? cardinalPlaneY : Math.max(cardinalPlaneY + cardinalAlong * .001,
            headData.p[cardinalVertex * 3 + 1] + (cardinalPlaneY - cardinalRootY) * (1 - cardinalAlong));
          headData.p[cardinalVertex * 3 + 1] = cardinalY;
          headData.p[cardinalVertex * 3 + 2] = cardinalPlaneZ - (cardinalY - cardinalPlaneY) * cardinalSlope + cardinalDepth;
        }
      }
    } else if (titmouse) {
      var titCrestColumns = high ? 7 : 5;
      for (var titRow = 0; titRow < 3; titRow++) for (var titColumn = 0; titColumn < titCrestColumns; titColumn++) {
        var titAcross = titColumn / (titCrestColumns - 1) * 2 - 1;
        var titX = titAcross * .0098, titHeight = .029 + (1 - Math.abs(titAcross)) * .006 - titRow * .0016;
        headData.kind = 2; headData.seed = -1500 - titRow * 16 - titColumn;
        var titColor = shade(headCrown, .95 + noise(titColumn, titRow + 23) * .08);
        headTuft(titX, .0165 - Math.abs(titAcross) * .0024, .003 - titRow * .0055,
          titX * .45, titHeight, -.022 - titRow * .005, high ? .0052 : .0070,
          1, 0, titAcross * .25, .0007,
          function (v) { return mix(titColor, back, v * .12); });
      }
    } else if (jay) {
      var jayCrestColumns = high ? 9 : 6;
      for (var jayRow = 0; jayRow < 3; jayRow++) for (var jayColumn = 0; jayColumn < jayCrestColumns; jayColumn++) {
        var jayAcross = jayColumn / (jayCrestColumns - 1) * 2 - 1;
        var jayCrestX = jayAcross * .0125, jayHeight = .044 + (1 - Math.abs(jayAcross)) * .012 - jayRow * .002;
        headData.kind = 2; headData.seed = -1300 - jayRow * 16 - jayColumn;
        var jayCrestColor = shade(headCrown, .94 + noise(jayColumn, jayRow + 19) * .10);
        headTuft(jayCrestX, .021 - Math.abs(jayAcross) * .003, .004 - jayRow * .007,
          jayCrestX * .55, jayHeight, -.019 - jayRow * .006, high ? .0062 : .0085,
          1, 0, jayAcross * .25, .0009,
          function (v) { return mix(jayCrestColor, back, v * .16); });
      }
    } else if (grouse) {
      var crestColumns = high ? 7 : 5;
      for (var crestRow = 0; crestRow < 2; crestRow++) for (var crest = 0; crest < crestColumns; crest++) {
        var crestAcross = (crest / (crestColumns - 1) * 2 - 1), cx = crestAcross * .012;
        var crestHeight = .039 + (1 - Math.abs(crestAcross)) * .005 + noise(crest, crestRow + 3) * .001;
        headData.kind = 2; headData.seed = -1000 - crestRow * 16 - crest;
        var crestColor = shade(mix(headCrown, back, .38), .95 + noise(crest, 7) * .09);
        headTuft(cx, .027 - Math.abs(crestAcross) * .002 - crestRow * .002, -.007 - crestRow * .007,
          cx * .80, crestHeight - crestRow * .0025, -.023 - crestRow * .008, high ? .008 : .010,
          1, 0, crestAcross * .30, .0007,
          function (v) { return mix(crestColor, headCheek, v * .13); });
      }
      var ruffCount = high ? 9 : 6;
      for (var ruffSide = -1; ruffSide <= 1; ruffSide += 2) for (var rf = 0; rf < ruffCount; rf++) {
        var ruffT = rf / (ruffCount - 1), ruffStagger = noise(rf, 29) * .0015;
        headData.kind = 2; headData.seed = -1100 - (ruffSide + 1) * 16 - rf;
        headTuft(ruffSide * (.019 - ruffT * .003), -.014 - ruffT * .011, -.014 - ruffT * .002,
          ruffSide * (.030 - ruffT * .001), -.024 - ruffT * .018 - ruffStagger, -.033 - ruffT * .008,
          high ? .010 : .012, 0, -ruffSide, ruffSide * .4, .0013,
          function (v) { return mix(dark, back, .12 + v * .22); });
      }
    }
    var headMesh = mesh(head, 'woodland-head-plumage', headData, plumage, cardinal);
    var crestRest = cardinal ? new Float32Array(headData.p.slice(cardinalCrestStart * 3)) : null;
    var face = data();
    for (var faceSide = -1; faceSide <= 1; faceSide += 2) {
      var ex = faceSide * p.head[0] * .905, ey = p.head[1] * .13, ez = p.head[2] * .34;
      ellipsoid(face, ex, ey, ez, .0009, tune ? tune.eye[0] : grouse ? .0046 : cardinal ? .0031 : .0037, tune ? tune.eye[1] : grouse ? .0047 : cardinal ? .0032 : .0038,
        constant(eyeRing), high ? 10 : 6, high ? 16 : 10);
      ellipsoid(face, ex + faceSide * .0006, ey, ez + .0002, .0009, tune ? tune.eye[2] : grouse ? .0038 : cardinal ? .0025 : .0029, tune ? tune.eye[3] : grouse ? .0039 : cardinal ? .0026 : .0030,
        constant(eyeColor), high ? 12 : 7, high ? 18 : 10);
    }
    // The seed-cracking cardinal bill has a deep, short cone. Other bills
    // retain their slender, slightly drooped tip and historical dimensions.
    var billOffset = face.p.length / 3, billRings = high ? 9 : 6, billSegments = high ? 12 : 8;
    face.kind = cardinal || goldfinch || bluebird || sparrow ? 1 : 0;
    for (var br = 0; br <= billRings; br++) {
      var bv = br / billRings, taper = .04 + .96 * Math.pow(1 - bv, tune ? tune.billTaper : cardinal ? 1.04 : .8);
      for (var bs = 0; bs < billSegments; bs++) {
        var ba = bs / billSegments * TAU;
        vertex(face, Math.cos(ba) * (tune ? tune.billWidth : grouse ? .0073 : jay ? .0058 : cardinal ? .0083 : .0045) * taper,
          -.0035 - bv * bv * billDroop + Math.sin(ba) * (tune ? tune.billHeight : grouse ? .006 : jay ? .0051 : cardinal ? .0080 : .0039) * taper,
          p.head[2] * .76 + p.billLength * bv, shade(billColor, .92 + .10 * Math.sin(ba)), bs / billSegments, bv);
      }
    }
    for (var bi = 0; bi < billRings; bi++) for (var bj = 0; bj < billSegments; bj++) {
      var bo = billOffset + bi * billSegments + bj, bn = billOffset + bi * billSegments + (bj + 1) % billSegments;
      quad(face, bo, bn, bo + billSegments, bn + billSegments);
    }
    mesh(head, 'woodland-eyes-and-bill', face, details);

    // A curved crop-to-nape surface carries its own small, overlapping contour
    // feathers. Coordinates are retained in profile space, so the whole tract
    // follows a peck or head turn without allocating geometry or loose meshes.
    var neckData = data(), neckRings = high ? 14 : 8, neckSegments = high ? 24 : 16;
    var neckCoordinates = [];
    function neckColor(t, angle) {
      var throat = .5 + Math.sin(angle) * .5;
      var base = hooded ? back : mix(back, breast, throat * .72);
      var top = mix(headCrown, headCheek, throat * .80);
      var c = mix(base, top, smooth((t - .18) / .82));
      if (grouse) c = mix(c, dark, Math.pow(Math.cos(angle), 2) * smooth((t - .45) / .50) * .18);
      if (cardinal) {
        var bibWidth = .72 - smooth((t - .58) / .36) * .14;
        c = mix(c, dark, smooth((Math.sin(angle) - bibWidth) / .20) * smooth((t - .58) / .24) * .98);
      }
      if (goldfinch) c = mix(back, headThroat, throat * .55);
      if (bluebird) c = mix(back, headThroat, smooth((Math.sin(angle) - .04) / .40));
      if (sparrow) {
        c = mix(back, headCheek, throat * .92);
        // A discrete white throat reaches the upper neck, with gray below it.
        c = mix(c, headThroat, smooth((Math.sin(angle) - .48) / .24) * smooth((t - .36) / .22));
      }
      if (chickadee) c = mix(c, dark, smooth((Math.sin(angle) - .05) / .30) * smooth((t - .22) / .20) * .97);
      if (jay) {
        c = mix(back, headThroat, throat * .94);
        // The necklace dips across the throat and rises around the nape.
        // Coloring the retained neck tracts keeps it attached during scanning.
        var necklace = 1 - smooth((Math.abs(t - (.47 + (1 - throat) * .30)) - .055) / .105);
        c = mix(c, dark, necklace * .96);
      }
      return c;
    }
    function neckVertex(t, angle, lift, c, u, v) {
      vertex(neckData, 0, 0, 0, c, u, v);
      neckCoordinates.push(t, Math.cos(angle), Math.sin(angle), lift, Math.sin(PI * t), Math.cos(PI * t), smooth(t));
    }
    neckData.kind = 6; neckData.seed = 11;
    for (var nr = 0; nr <= neckRings; nr++) for (var ns = 0; ns < neckSegments; ns++) {
      var nv = nr / neckRings, na = ns / neckSegments * TAU;
      neckVertex(nv, na, -.00055, neckColor(nv, na), ns / neckSegments, nv);
    }
    for (var ni = 0; ni < neckRings; ni++) for (var nj = 0; nj < neckSegments; nj++) {
      var n0 = ni * neckSegments + nj, n1 = ni * neckSegments + (nj + 1) % neckSegments;
      quad(neckData, n0, n1, n0 + neckSegments, n1 + neckSegments);
    }
    var neckRows = high ? 12 : 7, neckAround = high ? 24 : 16, neckSteps = high ? 4 : 3;
    for (var neckRow = 0; neckRow < neckRows; neckRow++) for (var neckAroundIndex = 0; neckAroundIndex < neckAround; neckAroundIndex++) {
      var neckOffset = neckData.p.length / 3;
      var neckStart = .985 - neckRow * (high ? .078 : .143);
      var neckAngle = (neckAroundIndex + (neckRow % 2) * .5) / neckAround * TAU;
      var neckLength = (high ? .125 : .225) + noise(neckRow + 9, neckAroundIndex) * .018;
      neckData.kind = 2; neckData.seed = 1700 + neckRow * 29 + neckAroundIndex;
      for (var nj = 0; nj <= neckSteps; nj++) {
        var neckV = nj / neckSteps, neckT = clamp(neckStart - neckV * neckLength, .008, .992);
        var neckShape = .075 + .925 * Math.pow(Math.sin(PI * Math.pow(neckV, .78)), .55);
        for (var nk = 0; nk <= 2; nk++) {
          var neckU = nk / 2, neckAcross = neckU * 2 - 1;
          var neckPhi = neckAngle + neckAcross * TAU / neckAround * .61 * neckShape;
          var neckLift = .00014 + (neckRows - neckRow) * .000014 + Math.sin(PI * neckV) * (1 - neckAcross * neckAcross) * .00011;
          var neckTint = shade(neckColor(neckT, neckPhi), .97 + noise(neckRow, neckAroundIndex) * .06);
          neckVertex(neckT, neckPhi, neckLift, neckTint, neckU, neckV);
        }
      }
      for (var njq = 0; njq < neckSteps; njq++) for (var nkq = 0; nkq < 2; nkq++) {
        var nq = neckOffset + njq * 3 + nkq; quad(neckData, nq, nq + 1, nq + 3, nq + 4);
      }
    }
    var neckProfile = new Float32Array(neckCoordinates);
    var neckMesh = mesh(root, 'woodland-neck-plumage', neckData, plumage, true);

    function featherColor(kind, index) {
      return function (v, u) {
        if (kind === 'undercovert') {
          var lining = grouse ? mix(wingColor, breast, .24) : jay ? mix(wingColor, pale, .76) : mix(wingColor, pale, .16);
          return shade(mix(lining, pale, smooth((v - .80) / .20) * .045), .96 + noise(index, 87) * .08);
        }
        var c = shade(wingColor, .89 + noise(index, kind.length) * .16);
        if (cardinal) {
          // Warm red edges meet darker vane centers on the remiges and long
          // tail. This species has neither dove spots nor jay wingbars.
          var shaftShade = 1 - smooth((Math.abs(u - .5) - .08) / .34);
          if (kind === 'primary' || kind === 'secondary' || kind === 'tertial') {
            c = mix(c, dark, shaftShade * .16 + smooth((v - .72) / .28) * .06);
            c = mix(c, back, smooth((Math.abs(u - .5) - .30) / .20) * .30);
          } else if (kind === 'tail') c = mix(c, breast, .19 + (1 - shaftShade) * .17);
          else c = mix(c, back, .52);
        } else if (goldfinch) {
          // Two pale covert-tip bars cross black wings. White remex edges and
          // tail panels stay attached to the same vanes in folded/open poses.
          if (kind === 'covert') {
            var finchBar = Math.floor(index / 13) === 1 || Math.floor(index / 13) === 2;
            c = mix(c, pale, finchBar ? smooth((v - .67) / .17) * .98 : smooth((v - .94) / .06) * .14);
          }
          if (kind === 'secondary' || kind === 'tertial') c = mix(c, pale, smooth((Math.abs(u - .5) - .29) / .13) * .85);
          if (kind === 'tail' && index !== 5 && index !== 6) c = mix(c, pale, smooth((v - .63) / .20) *
            smooth((Math.abs(u - .5) - .05) / .20) * .90);
          if (kind === 'scapular') c = mix(c, back, .84);
        } else if (bluebird) {
          // Unbarred blue upperwings and tail contrast with the rust/white body.
          if (kind === 'primary' || kind === 'secondary') c = mix(c, dark, smooth((Math.abs(u - .5) - .10) / .35) * .30);
          if (kind === 'scapular') c = mix(c, back, .70);
          if (kind === 'tail') c = mix(c, back, .22);
        } else if (sparrow) {
          // Warm edged brown vanes with dark centers and two pale wingbars.
          var sparrowShaft = 1 - smooth((Math.abs(u - .5) - .09) / .28);
          if (kind !== 'covert') c = mix(c, dark, sparrowShaft * .52);
          c = mix(c, back, smooth((Math.abs(u - .5) - .31) / .15) * .55);
          if (kind === 'covert') {
            c = mix(c, dark, sparrowShaft * .34);
            var sparrowBar = Math.floor(index / 13) === 1 || Math.floor(index / 13) === 2;
            c = mix(c, pale, sparrowBar ? smooth((v - .73) / .15) * .86 : .02);
          }
        } else if (robin) {
          // Blackish tail with small white outer corners; darker remiges.
          if (kind === 'tail') { c = mix(c, dark, .55); if (index === 0 || index === 11) c = mix(c, pale, smooth((v - .86) / .08) * .9); }
          else if (kind === 'primary') c = mix(c, dark, .20);
          else if (kind === 'tertial') c = mix(c, dark, .12);
        } else if (chickadee) {
          // White edges on the secondaries and tertials form the pale wing panel.
          if (kind === 'secondary' || kind === 'tertial') c = mix(c, pale, smooth((Math.abs(u - .5) - .30) / .12) * .75);
          else if (kind === 'tail') c = mix(mix(c, dark, .32), pale, smooth((Math.abs(u - .5) - .40) / .08) * .28);
          else if (kind === 'primary') c = mix(c, dark, .10);
        } else if (junco) {
          // Slate wings. The two outer tail pairs are white, flashing in flight
          // and hidden beneath the central feathers when the tail is folded.
          if (kind === 'tail') c = index <= 1 || index >= 10 ? mix(pale, c, .06) :
            index === 2 || index === 9 ? mix(c, pale, smooth((Math.abs(u - .5) - .05) / .20) * .85) : mix(c, dark, .18);
          else if (kind === 'primary') c = mix(c, dark, .14);
        } else if (titmouse) {
          if (kind === 'primary') c = mix(c, dark, .10);
          if (kind === 'tail') c = mix(c, dark, .08);
        } else if (towhee) {
          // White patch at the primary bases, pale tertial edges, white tail corners.
          if (kind === 'primary' && index >= 2 && index <= 7) c = mix(c, pale, smooth((.34 - v) / .10) * smooth((v - .08) / .06) * .92);
          if (kind === 'tertial') c = mix(c, pale, smooth((Math.abs(u - .5) - .36) / .10) * .55);
          if (kind === 'tail' && (index <= 1 || index >= 10)) c = mix(c, pale, smooth((v - .70) / .12) * .95);
          if (kind === 'tail' && (index === 2 || index === 9)) c = mix(c, pale, smooth((v - .84) / .10) * .80);
        } else if (jay) {
          if (kind === 'scapular') c = mix(c, back, .55);
          if (kind === 'covert') {
            var barRow = Math.floor(index / 13) === 2;
            c = mix(c, pale, barRow ? smooth((v - .61) / .15) * .97 : smooth((v - .93) / .07) * .12);
          }
          if (kind === 'secondary' || kind === 'tertial') c = mix(c, pale, smooth((v - .83) / .12) * .88);
          if (kind === 'primary') c = mix(c, dark, .13 + index / 9 * .12);
          if (kind === 'tail' && (index <= 2 || index >= 9)) c = mix(c, pale, smooth((v - .73) / .13) * .98);
        } else if (grouse) {
          c = mix(c, pale, smooth((Math.abs(u - .5) - .34) * 5) * .19);
          if (kind === 'tail') {
            c = mix(c, dark, smooth((v - .76) * 35) * (1 - smooth((v - .92) * 32)) * .90);
            c = mix(c, pale, smooth((v - .93) * 15) * .65);
          }
        } else {
          c = mix(c, dark, kind === 'primary' ? .22 : .03);
          if (kind === 'tail' && index !== 5 && index !== 6) {
            c = mix(c, dark, smooth((v - .64) * 12) * (1 - smooth((v - .79) * 15)) * .83);
            c = mix(c, pale, smooth((v - .78) * 10) * .80);
          }
        }
        return mix(c, pale, smooth((v - .94) * 10) * .045);
      };
    }
    function makeWing(parent) {
      var open = data(), closed = data(), flex = [], layers = [], scale = p.wing;
      function feather(kind, index, a, b, ca, cb, width, bend) {
        var ls = high ? 9 : 5, ws = high ? 4 : 2, before = open.p.length / 3;
        var underneath = kind === 'undercovert', firstTriangle = open.ix.length;
        open.kind = closed.kind = kind === 'covert' || kind === 'scapular' || underneath ? 3 : 4;
        open.seed = closed.seed = underneath ? 2048 + index : index;
        // Each adjacent vane has its own order through the wing thickness.
        // Preserve that order in the folded mantle as well as the open wing.
        var layer = underneath ? -.0018 + Math.floor(index / 13) * .00024 + (index % 13) * .000015 :
          kind === 'scapular' ? .0043 + index * .00011 :
          kind === 'covert' ? .0032 + Math.floor(index / 13) * -.00058 + (index % 13) * .00007 :
          kind === 'tertial' ? .0025 + index * .00013 :
          kind === 'secondary' ? .00070 + index * .00016 : -.00065 + index * .00014;
        vane(open, a[0] * scale, a[1] * scale, a[2] * scale, b[0] * scale, b[1] * scale, b[2] * scale,
          width * scale, featherColor(kind, index), ls, ws, bend * scale, kind === 'primary' ? .28 : .10);
        vane(closed, ca[0] * scale, ca[1] * scale, ca[2] * scale, cb[0] * scale, cb[1] * scale, cb[2] * scale,
          width * scale * .85, featherColor(kind, index), ls, ws, bend * scale, kind === 'primary' ? .28 : .10);
        if (underneath) for (var ui = firstTriangle; ui < open.ix.length; ui += 3) {
          var openIndex = open.ix[ui + 1], closedIndex = closed.ix[ui + 1];
          open.ix[ui + 1] = open.ix[ui + 2]; open.ix[ui + 2] = openIndex;
          closed.ix[ui + 1] = closed.ix[ui + 2]; closed.ix[ui + 2] = closedIndex;
        }
        var count = open.p.length / 3 - before;
        for (var n = 0; n < count; n++) {
          var fraction = Math.floor(n / (ws + 1)) / ls;
          flex.push(fraction * fraction * (kind === 'primary' ? 1 : .32));
          layers.push(layer);
          open.p[(before + n) * 3 + 1] += layer;
        }
      }
      for (var s = 0; s < 10; s++) {
        var a = s / 9;
        feather('secondary', s, [.008 + a * .094, -.0002 - a * .0003, .013 - a * .019],
          [.020 + a * .098, -.001, songbird ? -.065 - a * .018 : -.075 - a * .021],
          [.020 + a * .006, -.004 - a * .006, .009 - a * .054], [.026 + a * .003, -.012, -.063 - a * .043],
          grouse ? .027 : .023, .0018);
      }
      for (var q = 0; q < 10; q++) {
        var b = q / 9, tipX = .132 + Math.sin(b * PI * (songbird ? .62 : .5)) * (grouse ? .112 : .098);
        feather('primary', q, [.093 + b * .048, -.0009, -.014 + b * .018],
          [tipX, -.002 + b * .002, songbird ? -.083 + b * .053 : -.103 + b * (grouse ? .049 : .068)],
          [.024 + b * .004, -.006, -.034 - b * .020], [.022 + b * .003, -.015, -.108 - b * .019],
          (grouse ? .025 : .020) * (1 - b * .38), .0012);
      }
      // The jay's white greater-covert tips depend on the next overlapping
      // row. Keep that coverage at low detail too; removing it exposes the
      // whole pale vane as a triangular patch instead of a narrow wingbar.
      var covertRows = high || jay || goldfinch || sparrow ? 4 : 3, covertCount = high ? 12 : 9;
      for (var cr = 0; cr < covertRows; cr++) for (var cc = 0; cc < covertCount; cc++) {
        var t = cc / (covertCount - 1), z = .022 - cr * .013;
        // Alternate the interior roots and vary the free tips just enough to
        // break the ruler-straight rows. End coverts stay seated at the wing
        // edges, and both poses use the same character so folding cannot pop.
        t += (cr % 2 ? .18 : -.18) * Math.sin(PI * t) / (covertCount - 1);
        var covertLength = .97 + noise(cr + 81, cc) * .065;
        var covertWidth = .98 + noise(cr + 29, cc + 63) * .06;
        var openRoot = [.002 + t * .141, .0044 - cr * .00045, z - t * .012];
        var closedRoot = [.004 + cr * .007 + t * .0018, .0033 - cr * .00045 - t * .006, .023 - t * .087 - cr * .0015];
        feather('covert', cr * 13 + cc, openRoot,
          [openRoot[0] + .008 * covertLength, openRoot[1] - .001 * covertLength, openRoot[2] - (.034 + t * .002) * covertLength],
          closedRoot, [closedRoot[0] + .005 * covertLength, closedRoot[1] - (.005 + t * .001) * covertLength, closedRoot[2] - .038 * covertLength],
          .023 * covertWidth, .0012);
      }
      // Scapulars bridge the shoulder into the upper mantle; long tertials
      // overlap the remiges beside the rump. They join the same retained wing
      // geometry, retaining the shared shoulder/elbow/wrist articulation.
      for (var sp = 0; sp < 6; sp++) {
        var st = sp / 5;
        feather('scapular', sp, [.002 + st * .045, .006, .026 - st * .014],
          [.011 + st * .045, .004, -.018 - st * .029],
          [-.001 + st * .007, .005, .024 - st * .061], [.008 + st * .008, .003, -.030 - st * .064],
          .025, .0015);
      }
      for (var tr = 0; tr < 4; tr++) {
        var tt = tr / 3;
        feather('tertial', tr, [.010 + tt * .023, .0032, .010 - tt * .014],
          [.019 + tt * .023, .0018, -.079 - tt * .014],
          [.011 + tt * .003, .003, -.012 - tt * .021], [.019 + tt * .003, .001, -.096 - tt * .018],
          .023, .0016);
      }
      // Short underwing coverts bridge the exposed quill roots through
      // recovery. Their cup faces down and the folded layer nests inward;
      // the spotted dorsal mantle remains the visible resting surface.
      for (var ur = 0; ur < 2; ur++) for (var uc = 0; uc < covertCount; uc++) {
        var ut = uc / (covertCount - 1);
        ut += (ur % 2 ? .16 : -.16) * Math.sin(PI * ut) / (covertCount - 1);
        var uz = .018 - ur * .018 - ut * .014 + Math.sin(ut * PI) * .003;
        var underLength = (ur ? .043 - ut * .004 : .036 + ut * .004) * (.98 + noise(ur + 93, uc) * .04);
        feather('undercovert', ur * 13 + uc,
          [.002 + ut * .140, -.0015, uz], [.012 + ut * .140, -.0020, uz - underLength],
          [.006 + ur * .008 + ut * .0018, .002 - ut * .006, .020 - ur * .008 - ut * .075],
          [.011 + ur * .009 + ut * .0018, -.002 - ut * .007, -.014 - ur * .014 - ut * .075],
          .0235 * (.98 + noise(uc + 41, ur) * .04), -.0011);
      }
      // The cardinal's short wing has a continuous arched section beneath
      // its individual vanes. Apply the same section to dorsal and underside
      // layers, preserving their order instead of inflating every feather.
      // It tapers out at the seated shoulder and free tips. The folded mantle
      // remains the original template, so resting/preening contacts stay put.
      var wingCamber = songbird ? new Float32Array(open.p.length / 3) : null;
      if (songbird) for (var cv = 0; cv < open.p.length; cv += 3) {
        var spanX = open.p[cv] / scale, chordZ = open.p[cv + 2] / scale;
        var leadingZ = .026 - spanX * .20;
        var trailingZ = -.069 - spanX * .14 + .065 * smoothHop((spanX - .10) / .13);
        var chord = clamp((leadingZ - chordZ) / Math.max(.008, leadingZ - trailingZ), 0, 1);
        var seatedSpan = smoothHop((spanX - .012) / .045) * smoothHop((.23 - spanX) / .055);
        var section = scale * seatedSpan * (.0042 * Math.sin(PI * chord) + .0014 * Math.sin(PI * clamp(spanX / .23, 0, 1)));
        wingCamber[cv / 3] = section;
        open.p[cv + 1] += section;
      }
      // Nest the folded vanes against the curved mantle, rather than leaving
      // two flat paddles beside the torso. The thin outer primaries extend
      // beyond the rump while coverts wrap from the back down the flank.
      for (var fv = 0; fv < closed.p.length; fv += 3) {
        var originalX = closed.p[fv] / scale;
        var angle = .12 + clamp((originalX + .002) / .040, 0, 1) * 1.86;
        var worldZ = p.shoulder[2] + closed.p[fv + 2];
        var alongBody = (worldZ - p.bodyZ) / (p.body[2] * 1.23);
        var radial = Math.sqrt(Math.max(.12, 1 - alongBody * alongBody));
        // The far wing's dorsal edge must meet the actual back. Extending the
        // broad flank envelope across that ridge exposed a raised dark ribbon
        // underneath the scapulars. Seat those roots into the true torso and
        // retain the larger layered envelope only as it wraps down the flank.
        var dorsalSeat = 1 - smooth((angle - .24) / .62);
        var trueAlong = (worldZ - p.bodyZ) / p.body[2];
        var torsoRadial = Math.sqrt(Math.max(.08, 1 - trueAlong * trueAlong));
        radial += (torsoRadial - radial) * dorsalSeat;
        var featherLayer = (.0026 + layers[fv / 3]) * (1 - dorsalSeat * .88) - dorsalSeat * .00065;
        closed.p[fv] = Math.sin(angle) * (p.body[0] + featherLayer) * radial - p.shoulder[0];
        closed.p[fv + 1] = p.bodyY + Math.cos(angle) * (p.body[1] + featherLayer) * radial - p.shoulder[1];
      }
      var m = mesh(parent, 'woodland-layered-wing', closed, plumage, true);
      return { mesh: m, open: new Float32Array(open.p), closed: new Float32Array(closed.p), flex: new Float32Array(flex), camber: wingCamber };
    }
    var wingStates = [makeWing(left), makeWing(right)];
    // Groom the actual upper folded-wing vanes. Retained local contact points
    // keep both detail levels on their own plumage instead of aiming through
    // an idealized body ellipsoid, and add no geometry or per-frame objects.
    var preenContacts = [], preenPoint = new THREE.Vector3(), preenBill = new THREE.Vector3(), preenNape = new THREE.Vector3();
    var preenRotation = new THREE.Quaternion(), preenEuler = new THREE.Euler();
    for (var preenEnd = 0; preenEnd < 2; preenEnd++) {
      var wantedX = p.body[0] * (grouse ? .51 : .50);
      var wantedY = p.bodyY + p.body[1] * (grouse ? .79 : .78);
      var wantedZ = p.shoulder[2] + (grouse ? .009 : .004) - preenEnd * (grouse ? .010 : .007);
      var closest = Infinity, contact = [0, 0, 0], folded = wingStates[1].closed;
      var tract = wingStates[1].mesh.geometry.attributes.featherInfo.array;
      for (var preenVertex = 0; preenVertex < folded.length; preenVertex += 3) {
        if (tract[preenVertex / 3 * 2] !== 3) continue;
        var px = p.shoulder[0] + folded[preenVertex], py = p.shoulder[1] + folded[preenVertex + 1];
        var pz = p.shoulder[2] + folded[preenVertex + 2];
        var error = Math.pow(px - wantedX, 2) + Math.pow(py - wantedY, 2) * 2 + Math.pow(pz - wantedZ, 2);
        if (error < closest) { closest = error; contact[0] = folded[preenVertex]; contact[1] = folded[preenVertex + 1]; contact[2] = folded[preenVertex + 2]; }
      }
      preenContacts.push(contact);
    }

    var tailData = data(), tailFactors = [], tailCount = grouse ? 18 : 12;
    for (var tf = 0; tf < tailCount; tf++) {
      var factor = (tf / (tailCount - 1) - .5) * 2;
      var length = p.tailLength * (tune ? 1 - Math.pow(Math.abs(factor), tune.tailShape[0]) * tune.tailShape[1] : grouse ? 1 - Math.abs(factor) * .10 : jay ? 1 - Math.abs(factor) * .065 : cardinal ? 1 - Math.pow(Math.abs(factor), 1.7) * .12 : 1 - Math.pow(Math.abs(factor), .8) * .30);
      var old = tailData.p.length / 3;
      tailData.kind = 5; tailData.seed = tf;
      var tailRoot = factor * (grouse ? .007 : .0033);
      var tailLayer = -Math.abs(factor) * .0017 - tf * .000025;
      vane(tailData, tailRoot, tailLayer, 0,
        tailRoot, -.004 + tailLayer, -length, p.tailWidth * (grouse ? 1.12 : 1), featherColor('tail', tf), high ? 14 : 8, high ? 4 : 2, .0012);
      for (var ti = old; ti < tailData.p.length / 3; ti++) tailFactors.push(factor);
    }
    var tailMesh = mesh(tail, 'woodland-layered-tail', tailData, plumage, true);
    var tailRest = new Float32Array(tailData.p), tailAngles = new Float32Array(tailFactors);

    function tube(d, points, radii, c, segments) {
      var start = d.p.length / 3;
      for (var j = 0; j < points.length; j++) {
        var prev = points[Math.max(0, j - 1)], next = points[Math.min(points.length - 1, j + 1)];
        var dx = next[0] - prev[0], dy = next[1] - prev[1], dz = next[2] - prev[2];
        var len = Math.sqrt(dx * dx + dy * dy + dz * dz); dx /= len; dy /= len; dz /= len;
        var ux = Math.abs(dy) > .90 ? 1 : -dz, uy = 0, uz = Math.abs(dy) > .90 ? 0 : dx;
        var ul = Math.sqrt(ux * ux + uz * uz); ux /= ul; uz /= ul;
        var vx = dy * uz, vy = dz * ux - dx * uz, vz = -dy * ux;
        for (var k = 0; k < segments; k++) {
          var a = k / segments * TAU, co = Math.cos(a), si = Math.sin(a);
          var scute = (j % 2 === 0 ? .92 : 1.03);
          vertex(d, points[j][0] + radii[j] * (ux * co + vx * si), points[j][1] + radii[j] * (uy * co + vy * si),
            points[j][2] + radii[j] * (uz * co + vz * si), shade(c, scute), k / segments, j / (points.length - 1));
        }
      }
      for (var r = 0; r < points.length - 1; r++) for (var s = 0; s < segments; s++) {
        var a0 = start + r * segments + s, a1 = start + r * segments + (s + 1) % segments;
        quad(d, a0, a1, a0 + segments, a1 + segments);
      }
    }
    var footStates = [], previousFootTargets = new Float64Array(10);
    var clawRootColor = color(grouse ? '#73624d' : jay ? '#55575a' : '#695b53'), clawTipColor = color(jay ? '#252a2e' : '#302b26');
    for (var foot = 0; foot < 2; foot++) {
      var fd = data(), footScale = tune ? tune.footScale : grouse ? 1.35 : cardinal ? .82 : 1, legPoints = [], legRadii = [], legSegments = high ? 10 : 6, toeProfiles = [];
      for (var ls = 0; ls <= legSegments; ls++) {
        var lt = ls / legSegments;
        legPoints.push([0, .009 - lt * (p.leg + .006), -.004 + lt * .006]);
        legRadii.push((.0024 - lt * .0004) * footScale);
      }
      fd.kind = 1;
      tube(fd, legPoints, legRadii, footColor, high ? 10 : 6);
      fd.kind = 3;
      // Flatten the soft pad without exposing the open toe-root rings. The
      // larger grouse digits need slightly more dorsal coverage than the dove.
      var padHeight = grouse ? .0026 : .0023;
      ellipsoid(fd, 0, -p.leg + padHeight, .002, .003 * footScale, padHeight, .004 * footScale,
        constant(footColor), 6, 10);
      for (var toe = 0; toe < 4; toe++) {
        var backward = toe === 3, spread = backward ? 0 : toe - 1;
        var tx = spread * .010 * footScale, tz = (backward ? -.014 : .021 - Math.abs(spread) * .004) * footScale;
        var toePoints = [], toeRadii = [], toeSteps = high ? 7 : 4;
        for (var ts = 0; ts <= toeSteps; ts++) {
          var tv = ts / toeSteps;
          toePoints.push([tx * tv, -p.leg + .003 + Math.sin(tv * PI) * .0014, .002 + tz * tv]);
          toeRadii.push((.0015 - tv * .00075) * footScale);
        }
        var toeStart = fd.p.length / 3, toeSegments = high ? 8 : 5;
        fd.kind = 2;
        tube(fd, toePoints, toeRadii, footColor, toeSegments);
        var clawPoints = [[tx, -p.leg + .003, .002 + tz], [tx * 1.07, -p.leg + .0026, .002 + tz * 1.10],
          [tx * 1.13, -p.leg + .001, .002 + tz * 1.17]];
        fd.kind = 4;
        tube(fd, clawPoints, [.0009 * footScale, .0006 * footScale, .00012], clawRootColor, toeSegments);
        var toeCenters = new Float64Array((toePoints.length + clawPoints.length) * 3);
        var toeBends = new Float64Array(toePoints.length + clawPoints.length);
        for (var tr = 0; tr < toeBends.length; tr++) {
          var center = tr < toePoints.length ? toePoints[tr] : clawPoints[tr - toePoints.length];
          toeCenters[tr * 3] = center[0]; toeCenters[tr * 3 + 1] = center[1]; toeCenters[tr * 3 + 2] = center[2];
          // Spread the bend over the toe joints, keeping the root still. The
          // claw follows the distal joint as one piece instead of curling shut.
          toeBends[tr] = smooth(Math.min(tr, toeSteps) / toeSteps) * (backward ? 1.35 : 1.64 - Math.abs(spread) * .13);
        }
        var toeLength = Math.sqrt(tx * tx + tz * tz);
        toeProfiles.push({ start: toeStart, segments: toeSegments, centers: toeCenters, bends: toeBends,
          axisX: tx / toeLength, axisZ: tz / toeLength, splay: backward ? 0 : Math.atan2(tx, tz) });
      }
      // Reuse the existing surface metadata rather than adding texture maps or
      // geometry. Scutes face forward on the tarsus and upward on the digits;
      // the rounded pad stays softly matte, and horn darkens toward the tip.
      for (var surfaceVertex = 0; surfaceVertex < fd.p.length / 3; surfaceVertex++) {
        var surfaceKind = fd.feather[surfaceVertex * 2], surfaceU = fd.uv[surfaceVertex * 2], surfaceV = fd.uv[surfaceVertex * 2 + 1];
        var surfaceFacing = surfaceKind === 3 ? 0 : Math.sin(surfaceU * TAU) * (surfaceKind === 1 ? 1 : -1);
        fd.feather[surfaceVertex * 2 + 1] = surfaceFacing;
        var hornTint = smooth((surfaceV - .10) / .86), surfaceShade = .94 + Math.max(0, surfaceFacing) * .045 + surfaceV * .015;
        var surfaceColorIndex = surfaceVertex * 3;
        if (surfaceKind === 4) {
          fd.c[surfaceColorIndex] = clawRootColor.r + (clawTipColor.r - clawRootColor.r) * hornTint;
          fd.c[surfaceColorIndex + 1] = clawRootColor.g + (clawTipColor.g - clawRootColor.g) * hornTint;
          fd.c[surfaceColorIndex + 2] = clawRootColor.b + (clawTipColor.b - clawRootColor.b) * hornTint;
        } else {
          fd.c[surfaceColorIndex] = footColor.r * surfaceShade;
          fd.c[surfaceColorIndex + 1] = footColor.g * surfaceShade;
          fd.c[surfaceColorIndex + 2] = footColor.b * surfaceShade;
        }
      }
      var footMesh = mesh(feet[foot], 'woodland-scaled-toes', fd, feetMaterial, true);
      var legCenters = new Float64Array(legPoints.length * 3);
      for (var lr = 0; lr < legPoints.length; lr++) for (var la = 0; la < 3; la++) legCenters[lr * 3 + la] = legPoints[lr][la];
      footStates.push({ geometry: footMesh.geometry, rest: new Float32Array(fd.p), toes: toeProfiles,
        legRest: legCenters, legCenters: new Float64Array(legCenters.length), legRings: legSegments + 1,
        legSides: high ? 10 : 6, kneeRing: high ? 3 : 2,
        curl: -1, gather: -1, roll: NaN, yaw: NaN, hipX: NaN, hipY: NaN, hipZ: NaN, attachment: -1 });
    }

    var previous = { flight: -1, phase: NaN, effort: -1, bank: NaN, yaw: NaN, pitch: NaN, peck: -1, stride: NaN, walking: -1, fan: -1, landing: -1 };
    function update(pose) {
      if (disposed) return;
      pose = pose || EMPTY_POSE;
      var flight = clamp(number(pose.flight, 0), 0, 1), phase = number(pose.phase, 0);
      var effort = clamp(number(pose.effort, .6), 0, 1), bank = clamp(number(pose.bank, 0), -PI, PI);
      var yaw = clamp(number(pose.lookYaw, 0), -.95, .95), pitch = clamp(number(pose.lookPitch, 0), -.6, .6);
      var peck = clamp(number(pose.peck, 0), 0, 1) * (1 - flight), stride = number(pose.stride, 0);
      var walking = clamp(number(pose.walking, 0), 0, 1) * (1 - flight), fan = clamp(number(pose.tailSpread, 0), 0, 1);
      var landing = clamp(number(pose.landing, 0), 0, 1);
      // Cardinal takeoff and touchdown have a leg-supported loading phase.
      // The optional tuck is timed by actual lift rather than wing opening;
      // callers without those cues keep the ordinary flight foot envelope.
      var launchLoad = cardinal ? clamp(number(pose.launchLoad, 0), 0, 1) : 0;
      var landingLoad = cardinal ? clamp(number(pose.landingLoad, 0), 0, 1) : 0;
      var flightTuck = cardinal && Number.isFinite(pose.flightTuck) ? clamp(pose.flightTuck, 0, 1) : -1;
      var landingReach = cardinal ? clamp(number(pose.landingReach, 0), 0, 1) : 0;
      var flightLoadChanged = cardinal && (previous.launchLoad !== launchLoad || previous.landingLoad !== landingLoad || previous.flightTuck !== flightTuck || previous.landingReach !== landingReach);
      // The crest and long tail relax after contact without moving the
      // supporting body or feet. This analytic cue needs no spring history.
      var landingSettle = cardinal ? clamp(number(pose.landingSettle, 0), 0, 1) : 0;
      var settlingChanged = cardinal && previous.landingSettle !== landingSettle;
      // A paired hop bends through the legs and torso while its gaze stays
      // quiet. Every pulse has zero velocity and acceleration at its joins;
      // the phase is supplied by the scene, so seeking needs no motion history.
      var hopPhase = hopper && flight === 0 ? number(pose.hopPhase, -1) : -1;
      var hopAir = 0, hopGather = 0, hopPlant = 0, hopLean = 0, hopTail = 0, hopTailFlex = 0, hopHeadY = 0, hopHeadZ = 0, hopHeadPitch = 0, hopAttach = 0;
      if (hopPhase >= 0 && hopPhase <= 1) {
        var prepare = hopPulse(hopPhase / .18), settleHop = hopPulse((hopPhase - .65) / .35);
        var hopProgress = clamp((hopPhase - .18) / .47, 0, 1);
        hopAir = smoothHop(hopProgress / .45) * smoothHop((1 - hopProgress) / .55);
        // A recovering foot folds behind the body, then opens ahead of the
        // next plant. Using altitude for both phases kept the toes curled
        // and behind the ankle until the instant of contact.
        hopGather = hopAir * (1 - smoothHop((hopProgress - .48) / .32));
        hopPlant = hopPulse((hopProgress - .58) / .42);
        var risingHop = hopPulse(hopProgress / .78), arrivingHop = hopPulse((hopProgress - .48) / .52);
        hopLean = prepare * .10 + risingHop * .12 - arrivingHop * .065 - settleHop * .07;
        hopTail = -prepare * .09 - risingHop * .12 + arrivingHop * .065 + settleHop * .085;
        hopHeadY = prepare * .0022 - hopAir * .0025 + settleHop * .0018;
        hopHeadZ = prepare * .0025 + risingHop * .002 - settleHop * .0015;
        hopHeadPitch = prepare * .012 - risingHop * .015 + arrivingHop * .010;
        hopHeadPitch += hopPlant * .025;
        hopTail += hopPlant * .025;
        // The long rectrices yield slightly behind the tail-base motion,
        // then relax before the next hop. These delayed, bounded pulses
        // bend only the distal vane rows; the quills remain seated.
        hopTailFlex = .0017 * hopPulse((hopPhase - .025) / .21) +
          .0014 * hopPulse((hopPhase - .18) / .47) - .0016 * hopPulse((hopPhase - .69) / .31);
        hopAttach = Math.max(prepare, hopAir, settleHop);
      }
      var hopChanged = hopper && previous.hopPhase !== hopPhase;
      var crestFold = cardinal ? smoothHop(flight) * (1 - smoothHop(landing) * .40) : 0;
      if (cardinal) crestFold += .35 * landingSettle * (1 - smoothHop(flight));
      var crestChanged = cardinal && previous.crestFold !== crestFold;
      // Preening is a grounded action, subordinate to locomotion and feeding.
      // Zero/absent inputs take the exact historical anatomy path.
      var preen = flight > 0 || walking > 0 || peck > 0 || landing > 0 ? 0 : smooth(clamp(number(pose.preen, 0), 0, 1));
      var preenSide = preen > 0 && number(pose.preenSide, 1) < 0 ? -1 : 1;
      var preenStroke = preen > 0 ? smooth(clamp(number(pose.preenStroke, 0), 0, 1)) : 0;
      var groomingChanged = previous.preen !== preen || previous.preenSide !== preenSide || previous.preenStroke !== preenStroke;
      var targets = pose.footTargets, hasTargets = !!(targets && targets[0] && targets[1]);
      if (hasTargets) for (var targetIndex = 0; targetIndex < 2; targetIndex++) {
        var target = targets[targetIndex];
        if (!Number.isFinite(target.x) || !Number.isFinite(target.y) || !Number.isFinite(target.z) || !Number.isFinite(target.swing)) hasTargets = false;
      }
      var targetBlend = hasTargets ? clamp(number(pose.footTargetBlend, 1), 0, 1) : 0;
      var targetsChanged = previous.hasFootTargets !== hasTargets;
      if (hasTargets) for (var targetCheck = 0; targetCheck < 2; targetCheck++) {
        var checkedTarget = targets[targetCheck], targetOffset = targetCheck * 5;
        if (previousFootTargets[targetOffset] !== checkedTarget.x || previousFootTargets[targetOffset + 1] !== checkedTarget.y ||
            previousFootTargets[targetOffset + 2] !== checkedTarget.z || previousFootTargets[targetOffset + 3] !== checkedTarget.swing ||
            previousFootTargets[targetOffset + 4] !== number(checkedTarget.yaw, 0)) targetsChanged = true;
      }
      if (previous.flight === flight && previous.phase === phase && previous.effort === effort && previous.bank === bank &&
          previous.yaw === yaw && previous.pitch === pitch && previous.peck === peck && previous.stride === stride && previous.walking === walking && previous.fan === fan && previous.landing === landing && previous.targetBlend === targetBlend && !targetsChanged && !groomingChanged && !hopChanged && !crestChanged && !flightLoadChanged && !settlingChanged) return;
      // Transfer the torso toward the supporting foot. External contacts can
      // run independently of stride (for example while turning in RaptorLab),
      // so their actual swing envelopes determine the weight transfer.
      var walkX = 0, walkY = 0, walkAmount = walking * (1 - landing);
      for (var supportFoot = 0; supportFoot < 2; supportFoot++) {
        var supportPhase = ((stride + supportFoot * PI) % TAU + TAU) % TAU;
        var supportSwing = supportPhase < PI ? supportPhase / PI : -1;
        var supportArc = supportSwing > 0 && supportSwing < 1 ? Math.sin(PI * supportSwing) : 0;
        supportArc *= supportArc;
        if (targetBlend > 0) {
          var contactSwing = targets[supportFoot].swing;
          var contactArc = contactSwing > 0 && contactSwing < 1 ? Math.sin(PI * contactSwing) : 0;
          supportArc = supportArc * (1 - targetBlend) + contactArc * contactArc * targetBlend;
        }
        walkX += (supportFoot === 0 ? 1 : -1) * supportArc;
        walkY += supportArc;
      }
      walkX *= walkAmount * (grouse ? .0022 : .0014);
      walkY = Math.min(1, walkY) * walkAmount * (grouse ? .0009 : .00065);
      if (hopper && hopPhase >= 0) { walkX = 0; walkY = hopAir * .00065; }
      var neckChanged = previous.flight !== flight || previous.peck !== peck || previous.yaw !== yaw ||
        previous.walkX !== walkX || previous.walkY !== walkY || groomingChanged || hopChanged || flightLoadChanged ||
        (cardinal && flight > 0 && (previous.phase !== phase || previous.effort !== effort || previous.landing !== landing));
      var wingChanged = previous.flight !== flight || (flight > 0 && (previous.phase !== phase || previous.effort !== effort || previous.bank !== bank || previous.landing !== landing));
      var tailChanged = previous.flight !== flight || previous.fan !== fan || (hopper && hopChanged) || settlingChanged || (flight > 0 && (previous.phase !== phase || previous.effort !== effort || previous.bank !== bank || previous.landing !== landing));
      previous.flight = flight; previous.phase = phase; previous.effort = effort; previous.bank = bank;
      previous.yaw = yaw; previous.pitch = pitch; previous.peck = peck; previous.stride = stride; previous.walking = walking; previous.fan = fan; previous.landing = landing;
      previous.walkX = walkX; previous.walkY = walkY;
      previous.preen = preen; previous.preenSide = preenSide; previous.preenStroke = preenStroke;
      if (hopper) previous.hopPhase = hopPhase;
      if (cardinal) {
        previous.crestFold = crestFold;
        previous.launchLoad = launchLoad; previous.landingLoad = landingLoad; previous.flightTuck = flightTuck; previous.landingReach = landingReach;
        previous.landingSettle = landingSettle;
      }
      previous.targetBlend = targetBlend;
      previous.hasFootTargets = hasTargets;
      if (hasTargets) for (var targetSave = 0; targetSave < 2; targetSave++) {
        var savedTarget = targets[targetSave], saveOffset = targetSave * 5;
        previousFootTargets[saveOffset] = savedTarget.x; previousFootTargets[saveOffset + 1] = savedTarget.y;
        previousFootTargets[saveOffset + 2] = savedTarget.z; previousFootTargets[saveOffset + 3] = savedTarget.swing;
        previousFootTargets[saveOffset + 4] = number(savedTarget.yaw, 0);
      }
      // The power stroke occupies slightly less of the cycle. Elbow recovery
      // leads the wrist; the hand finishes opening after the shoulder has
      // started its next downstroke instead of folding the entire wing flat.
      var unfold = smooth(flight), transition = 4 * unfold * (1 - unfold);
      var beat = phase - Math.cos(phase) * .24;
      var recovery = smooth((-Math.sin(beat - .08) + .12) / 1.0);
      var wristRecovery = smooth((-Math.sin(beat - .24) + .06) / 1.0);
      var power = smooth((Math.sin(beat) + .06) / 1.0);
      var settle = Math.sin(beat - .48) * effort * unfold;
      // The torso accepts the downstroke load while the neck damps its small
      // motion. The long tail counters that pitch; its response follows the
      // same continuous wingbeat, never an independent decorative oscillation.
      var cardinalAir = cardinal ? unfold * effort * (1 - landing) * (flightTuck >= 0 ? flightTuck : 1) : 0;
      var flightLean = cardinal ? .10 * launchLoad - .09 * landing * unfold + .05 * landingLoad + .022 * cardinalAir * Math.sin(beat - .25) : 0;
      var cardinalLean = hopLean + flightLean;
      var cardinalDrop = cardinal ? -.005 * launchLoad - .004 * landingLoad + .0008 * cardinalAir * Math.sin(beat - .50) : 0;
      body.position.set(walkX, p.bodyY - peck * .004 + walkY, p.bodyZ);
      body.rotation.set(.08 * unfold - transition * .07 + peck * .09, 0, -Math.sin(bank) * unfold * .015);
      head.position.set(Math.sin(yaw) * (grouse ? .004 : .0025), p.headY - peck * (tune ? tune.peckDrop : grouse ? .153 : jay ? .100 : cardinal ? .0765 : .0937) - flight * .013,
        p.headZ + peck * (tune ? tune.peckForward : grouse ? .068 : cardinal ? .034 : .048) + flight * .013);
      head.rotation.set(pitch * (1 - peck) + peck * 1.16 - flight * .05, yaw, -Math.sin(bank) * flight * .07);
      if (hopper && hopPhase >= 0) {
        body.rotation.x += hopLean;
        head.position.y += hopHeadY; head.position.z += hopHeadZ;
        head.rotation.x += hopHeadPitch;
      }
      if (cardinal) {
        body.position.y += cardinalDrop; body.rotation.x += flightLean;
        head.position.y -= .003 * launchLoad + .0024 * landingLoad;
        head.position.z += .002 * launchLoad + .0015 * landing * unfold;
        head.rotation.x += -.015 * launchLoad + .015 * landing * unfold;
      }
      if (crestChanged) {
        var crestPositions = headMesh.geometry.attributes.position.array;
        if (crestFold === 0) crestPositions.set(crestRest, cardinalCrestStart * 3);
        else for (var crestIndex = 0; crestIndex < crestRest.length; crestIndex += 3) {
          var crestVertex = cardinalCrestStart + crestIndex / 3;
          // A common affine field settles the crest backward while keeping
          // its seated roots fixed. Its positive vertical scale preserves
          // the row/column ordering throughout flight and landing recovery.
          var crestRise = crestRest[crestIndex + 1] - crestRest[1];
          crestPositions[crestVertex * 3] = crestRest[crestIndex];
          crestPositions[crestVertex * 3 + 1] = crestRest[crestIndex + 1] - crestFold * .60 * crestRise;
          crestPositions[crestVertex * 3 + 2] = crestRest[crestIndex + 2] - crestFold * .15 * crestRise;
        }
        refresh(headMesh.geometry);
      }
      var preenWingLift = preen * (.10 + .012 * preenStroke);
      if (preen > 0) {
        var a = preenContacts[0], b = preenContacts[1];
        var localX = preenSide * (a[0] + (b[0] - a[0]) * preenStroke);
        var localY = a[1] + (b[1] - a[1]) * preenStroke;
        var localZ = a[2] + (b[2] - a[2]) * preenStroke;
        var wingAngle = -preenSide * preenWingLift, cw = Math.cos(wingAngle), sw = Math.sin(wingAngle);
        preenPoint.set(preenSide * p.shoulder[0] + localX * cw - localY * sw,
          p.shoulder[1] + localX * sw + localY * cw + .0012, p.shoulder[2] + localZ);
        preenRotation.setFromEuler(preenEuler.set((grouse ? .86 : jay ? .75 : .72) + preenStroke * .055,
          preenSide * (2.30 + preenStroke * .065), -preenSide * .035, 'YXZ'));
        preenBill.set(0, -.0035 - billDroop, p.head[2] * .76 + p.billLength).applyQuaternion(preenRotation);
        head.position.x += (preenPoint.x - preenBill.x - head.position.x) * preen;
        head.position.y += (preenPoint.y - preenBill.y - head.position.y) * preen;
        head.position.z += (preenPoint.z - preenBill.z - head.position.z) * preen;
        head.quaternion.slerp(preenRotation, preen);
      }
      var neckPos = neckMesh.geometry.attributes.position.array;
      var lowerY = p.neckBase[0] - peck * .005 - (1 - peck) * (grouse ? .009 : .006) + walkY;
      var lowerZ = p.neckBase[1] - (1 - peck) * (grouse ? .008 : .005);
      if (hopper && cardinalLean !== 0) {
        var neckHopY = lowerY - p.bodyY, neckHopZ = lowerZ - p.bodyZ;
        lowerY = p.bodyY + neckHopY * Math.cos(cardinalLean) - neckHopZ * Math.sin(cardinalLean);
        lowerZ = p.bodyZ + neckHopY * Math.sin(cardinalLean) + neckHopZ * Math.cos(cardinalLean);
      }
      if (cardinal) lowerY += cardinalDrop;
      // End the neck inside the head plumage rather than at its silhouette;
      // the last ring then cannot read as a diagonal cut during flight tuck.
      var upperY = head.position.y - p.head[1] * .25, upperZ = head.position.z - p.head[2] * .20;
      var upperX = head.position.x;
      if (preen > 0) {
        // A turned head joins the neck at its rotated nape. Leaving the neck
        // beneath the unturned chin buries the downturned bill in the throat.
        preenNape.set(0, -p.head[1] * .25, -p.head[2] * .50).applyQuaternion(head.quaternion);
        upperX += preenNape.x * preen;
        upperY += (head.position.y + preenNape.y - upperY) * preen;
        upperZ += (head.position.z + preenNape.z - upperZ) * preen;
      }
      var ndy = upperY - lowerY, ndz = upperZ - lowerZ;
      var archY = (grouse ? .009 : .006) * (1 - peck) * (1 - flight * .35);
      var archZ = -(grouse ? .006 : .004) * (1 - peck);
      if (neckChanged) for (var neckIndex = 0, no = 0; neckIndex < neckProfile.length; neckIndex += 7, no += 3) {
        var nt = neckProfile[neckIndex], sine = neckProfile[neckIndex + 4], cosine = neckProfile[neckIndex + 5];
        var eased = neckProfile[neckIndex + 6], radius = p.neckWidth * (1.17 - eased * .59) + neckProfile[neckIndex + 3];
        if (preen > 0) radius *= 1 - preen * .17 * sine;
        var ncy = lowerY + ndy * nt + archY * sine, ncz = lowerZ + ndz * nt + archZ * sine;
        var tangentY = ndy + archY * PI * cosine, tangentZ = ndz + archZ * PI * cosine;
        var tangentLength = Math.sqrt(Math.max(1e-12, tangentY * tangentY + tangentZ * tangentZ));
        var transverse = neckProfile[neckIndex + 2] * radius * (1 - nt * .08);
        neckPos[no] = neckProfile[neckIndex + 1] * radius + walkX * (1 - eased) + upperX * eased;
        if (preen > 0) neckPos[no] -= preenSide * p.neckWidth * .30 * preen * sine;
        neckPos[no + 1] = ncy - transverse * tangentZ / tangentLength;
        neckPos[no + 2] = ncz + transverse * tangentY / tangentLength;
      }
      if (neckChanged) refresh(neckMesh.geometry);
      for (var wing = 0; wing < 2; wing++) {
        var sign = wing === 0 ? -1 : 1, state = wingStates[wing], group = wings[wing];
        var spread = unfold;
        var stroke = unfold * effort * (Math.cos(beat) * (grouse ? .76 : jay ? .72 : .82) + Math.cos(beat * 2) * .085);
        group.position.set(sign * p.shoulder[0] + walkX, p.shoulder[1] + walkY, p.shoulder[2]);
        group.rotation.set(unfold * (.030 + recovery * effort * .040), -sign * unfold * recovery * effort * .045,
          sign * (stroke + unfold * .045 + Math.sin(bank) * unfold * sign * .055));
        if (hopper && cardinalLean !== 0) {
          var shoulderY = p.shoulder[1] - p.bodyY, shoulderZ = p.shoulder[2] - p.bodyZ;
          group.position.y = p.bodyY + walkY + shoulderY * Math.cos(cardinalLean) - shoulderZ * Math.sin(cardinalLean);
          group.position.z = p.bodyZ + shoulderY * Math.sin(cardinalLean) + shoulderZ * Math.cos(cardinalLean);
          group.rotation.x += cardinalLean;
        }
        if (cardinal) {
          group.position.y += cardinalDrop;
          // Raise the shoulder into departure while the legs are still
          // loaded. Keep the oscillator running beneath the smooth bias.
          group.rotation.z += sign * unfold * launchLoad * .28;
        }
        if (preen > 0 && sign === preenSide) group.rotation.z -= sign * preenWingLift;
        var pos = state.mesh.geometry.attributes.position.array;
        // Pressure deepens the section on the power stroke, then its elastic
        // recoil relaxes it during hand recovery. This follows the existing
        // continuous beat and never changes the route or resets its phase.
        var sectionLoad = songbird ? effort * (.32 * smoothHop(Math.sin(beat) + .06) - .18 * smoothHop(-Math.sin(beat - .24) + .06)) : 0;
        // Light differential loading bends the outer vanes through a bank;
        // braking raises their trailing tips without unseating the coverts.
        var strokeFlex = (settle * .0048 + wristRecovery * effort * unfold * .0018) * p.wing;
        var flex = strokeFlex + (landing * unfold * .0024 + Math.sin(bank) * sign * unfold * .0012) * p.wing;
        var elbowSweep = recovery * effort * unfold * (grouse ? .19 : jay ? .21 : .24);
        var wristFold = wristRecovery * effort * unfold * (grouse ? .34 : jay ? .38 : .46);
        var wristSweep = wristRecovery * effort * unfold * (grouse ? .25 : jay ? .28 : .34);
        var wristTwist = effort * unfold * (wristRecovery * .20 - power * .025) +
          unfold * (landing * .10 - Math.sin(bank) * sign * .035);
        var ec = Math.cos(elbowSweep), es = Math.sin(elbowSweep);
        var wc = Math.cos(wristFold), ws = Math.sin(wristFold);
        var sc = Math.cos(wristSweep), ss = Math.sin(wristSweep);
        var tc = Math.cos(wristTwist), ts = Math.sin(wristTwist);
        var elbowX = .063 * p.wing, wristX = .124 * p.wing, wristZ = -.012 * p.wing;
        var vaneUv = state.mesh.geometry.attributes.uv.array, vaneColumns = high ? 5 : 3, vaneRows = high ? 9 : 5;
        var vaneInfo = state.mesh.geometry.attributes.featherInfo.array, vaneCount = vaneColumns * (vaneRows + 1);
        var deployment = transition * transition, deployedFeather = -1, deploymentAngle = 0;
        var pitchRow = -1, pitchFeather = -1;
        if (wingChanged) for (var v = 0; v < state.flex.length; v++) {
          var i = v * 3, bend = state.flex[v], quillFlex = 0;
          var ox = state.open[i], oy = state.open[i + 1], oz = state.open[i + 2];
          if (songbird) oy += state.camber[v] * sectionLoad;
          if (deployment > 0) {
            var featherStart = Math.floor(v / vaneCount) * vaneCount;
            if (deployedFeather !== featherStart) {
              deployedFeather = featherStart; deploymentAngle = 0;
              if (vaneInfo[featherStart * 2] === 4) {
                var rootIndex = (featherStart + (vaneColumns - 1) / 2) * 3;
                var rx = state.open[rootIndex], ry = state.open[rootIndex + 1], rz = state.open[rootIndex + 2];
                var primary = state.flex[featherStart + vaneColumns] > .65 / (vaneRows * vaneRows);
                // The forearm leads while the outer hand stays swept aft.
                // Rotate each whole vane about its moving quill root: changing
                // individual vertex blend times would shear its cross-section.
                deploymentAngle = deployment * (primary ? .055 + smooth((rx / p.wing - .093) / .048) * .105 :
                  -.038 * smooth((rx / p.wing - .035) / .055));
                if (deploymentAngle !== 0) {
                  var rootHand = smooth((rx / p.wing - .105) / .065), rootForearm = smooth((rx / p.wing - .048) / .065);
                  var rhx = rx - wristX, rhy = ry, rhz = rz - wristZ;
                  var rty = rhy * tc - rhz * ts, rtz = rhy * ts + rhz * tc;
                  var rtx = rhx * wc - rty * ws;
                  rty = rhx * ws + rty * wc;
                  var rwx = rtx * sc + rtz * ss + wristX, rwz = -rtx * ss + rtz * sc + wristZ;
                  rx += (rwx - rx) * rootHand; ry += (rty - ry) * rootHand; rz += (rwz - rz) * rootHand;
                  var rex = rx - elbowX, rez = rz + .004 * p.wing;
                  rx += (rex * ec + rez * es + elbowX - rx) * rootForearm;
                  rz += (-rex * es + rez * ec - .004 * p.wing - rz) * rootForearm;
                  var deployedRootX = state.closed[rootIndex] + (rx - state.closed[rootIndex]) * spread;
                  var deployedRootZ = state.closed[rootIndex + 2] + (rz - state.closed[rootIndex + 2]) * spread;
                  var dc = Math.cos(deploymentAngle), ds = Math.sin(deploymentAngle);
                }
              }
            }
          }
          var hand = smooth((ox / p.wing - .105) / .065);
          var forearm = smooth((ox / p.wing - .048) / .065);
          var along = vaneUv[v * 2 + 1];
          if (along > 0 && vaneInfo[v * 2] === 3 && (songbird || vaneInfo[v * 2 + 1] >= 2048)) {
            // Keep the lining and cardinal dorsal coverts broad as the wrist
            // folds. Each row follows its shaft instead of assigning opposite
            // edges different bones and squeezing the vane like an accordion.
            var underColumn = Math.round(vaneUv[v * 2] * (vaneColumns - 1));
            var underCenter = (v - underColumn + (vaneColumns - 1) / 2) * 3;
            hand = smooth((state.open[underCenter] / p.wing - .105) / .065);
            forearm = smooth((state.open[underCenter] / p.wing - .048) / .065);
          }
          if (along > 0 && vaneInfo[v * 2] === 4 && unfold > 0) {
            // Feather the remiges around their own shafts on recovery. The
            // forearm opens first, followed by the more mobile outer hand;
            // root rows and shaft centers keep their original articulation.
            var column = Math.round(vaneUv[v * 2] * (vaneColumns - 1));
            var centerIndex = (v - column + (vaneColumns - 1) / 2) * 3;
            // The two sides of a quill follow the same bone weights. Using
            // each edge's span position also collapsed secondary vane widths
            // by up to a third as the forearm swept through recovery.
            hand = smooth((state.open[centerIndex] / p.wing - .105) / .065);
            forearm = smooth((state.open[centerIndex] / p.wing - .048) / .065);
            if (pitchRow !== centerIndex) {
              pitchRow = centerIndex;
              var row = Math.round(along * vaneRows), firstIndex = centerIndex - row * vaneColumns * 3;
              if (pitchFeather !== firstIndex) {
                pitchFeather = firstIndex;
                var lastIndex = firstIndex + vaneRows * vaneColumns * 3;
                var ax = state.open[lastIndex] - state.open[firstIndex], ay = state.open[lastIndex + 1] - state.open[firstIndex + 1];
                var az = state.open[lastIndex + 2] - state.open[firstIndex + 2], axisLength = Math.sqrt(ax * ax + ay * ay + az * az);
                ax /= axisLength; ay /= axisLength; az /= axisLength;
                var primaryVane = bend > along * along * .65;
                var outer = clamp((state.open[firstIndex] / p.wing - .093) / .048, 0, 1);
                // Keep the inner vanes seated over the shoulder; recovery
                // pitch begins only on shafts extending into the forearm.
                var forearmVane = smooth((state.open[firstIndex] / p.wing - .045) / .057);
                var featherRecovery = smooth((-Math.sin(beat - (primaryVane ? .20 + outer * .23 : .09 + forearmVane * .10)) + .06) / 1.0);
                var pitchAmplitude = effort * unfold * (primaryVane ?
                  featherRecovery * (grouse ? .15 + outer * .055 : .19 + outer * .075) - power * .025 :
                  forearmVane * (featherRecovery * (grouse ? .043 : .055) - power * .006));
                // Longer outer quills finish bending just after the wrist
                // reverses. This passive lag is analytic and periodic, so a
                // seek or a paused frame has exactly the same feather pose.
                var quillLag = (.10 + outer * .28) * (grouse ? .80 : 1);
                var quillRecovery = smooth((-Math.sin(beat - .24 - quillLag) + .06) / 1.0);
                var primaryFlex = effort * unfold * p.wing *
                  (Math.sin(beat - .48 - quillLag) * .0048 + quillRecovery * .0018);
              }
              var featherPitch = smooth(along / .70) * pitchAmplitude;
              var pc = Math.cos(featherPitch), ps = Math.sin(featherPitch);
            }
            var dx = ox - state.open[centerIndex], dy = oy - state.open[centerIndex + 1], dz = oz - state.open[centerIndex + 2];
            var dot = ax * dx + ay * dy + az * dz;
            ox = state.open[centerIndex] + dx * pc + (ay * dz - az * dy) * ps + ax * dot * (1 - pc);
            oy = state.open[centerIndex + 1] + dy * pc + (az * dx - ax * dz) * ps + ay * dot * (1 - pc);
            oz = state.open[centerIndex + 2] + dz * pc + (ax * dy - ay * dx) * ps + az * dot * (1 - pc);
            // Apply the same displacement to the entire shaft row. Curvature
            // grows toward the free tip while the root and vane width remain
            // attached; bank and braking loads retain their shared response.
            if (primaryVane) quillFlex = (primaryFlex * (.70 + .30 * along) - strokeFlex) * bend;
          }
          // Rotate the hand around the wrist before moving that whole section
          // around the elbow. Smooth span weights keep coverts joined to the
          // remiges, while the shoulder vanes stay seated at their roots.
          var hx = ox - wristX, hy = oy, hz = oz - wristZ;
          var ty = hy * tc - hz * ts, tz = hy * ts + hz * tc;
          var tx = hx * wc - ty * ws;
          ty = hx * ws + ty * wc;
          var wx = tx * sc + tz * ss + wristX;
          var wz = -tx * ss + tz * sc + wristZ;
          ox += (wx - ox) * hand; oy += (ty - oy) * hand; oz += (wz - oz) * hand;
          var ex = ox - elbowX, ez = oz + .004 * p.wing;
          var sx = ex * ec + ez * es + elbowX, sz = -ex * es + ez * ec - .004 * p.wing;
          ox += (sx - ox) * forearm; oz += (sz - oz) * forearm;
          var deployedX = state.closed[i] + (ox - state.closed[i]) * spread;
          var deployedZ = state.closed[i + 2] + (oz - state.closed[i + 2]) * spread;
          if (deployment > 0 && deploymentAngle !== 0) {
            var relativeX = deployedX - deployedRootX, relativeZ = deployedZ - deployedRootZ;
            deployedX = deployedRootX + relativeX * dc + relativeZ * ds;
            deployedZ = deployedRootZ - relativeX * ds + relativeZ * dc;
          }
          pos[i] = deployedX;
          pos[i + 1] = state.closed[i + 1] + (oy - state.closed[i + 1]) * spread + flex * bend + quillFlex;
          pos[i + 2] = deployedZ;
        }
        if (wingChanged) refresh(state.mesh.geometry);
      }
      tail.position.set(walkX, p.tailY + walkY, p.tailZ);
      var tailBrake = smooth(landing) * unfold, tailBank = Math.sin(bank) * unfold;
      tail.rotation.set(unfold * (.055 + effort * Math.sin(beat - .65) * .012) + transition * .105 - peck * .11 + tailBrake * .070,
        -Math.sin(bank) * unfold * .095, Math.sin(bank) * unfold * .025);
      if (cardinal) tail.rotation.x += .035 * landingSettle;
      if (hopper && (hopPhase >= 0 || (cardinal && (flight > 0 || launchLoad > 0 || landingLoad > 0)))) {
        var tailHopY = p.tailY - p.bodyY, tailHopZ = p.tailZ - p.bodyZ;
        tail.position.y = p.bodyY + walkY + cardinalDrop + tailHopY * Math.cos(cardinalLean) - tailHopZ * Math.sin(cardinalLean);
        tail.position.z = p.bodyZ + tailHopY * Math.sin(cardinalLean) + tailHopZ * Math.cos(cardinalLean);
        tail.rotation.x += hopTail - .085 * launchLoad + .05 * landingLoad - .020 * cardinalAir * Math.sin(beat - .15);
      }
      var tailSpread = .055 + fan * (tune ? tune.fan : grouse ? .91 : jay ? .36 : cardinal ? .32 : .48) + unfold * (.13 + effort * recovery * .035) + transition * .105;
      if (hopper) tailSpread += hopPlant * .065;
      if (cardinal) tailSpread += landingSettle * .035;
      var tailFlex = unfold * effort * Math.sin(beat - .65) * .0018;
      var tp = tailMesh.geometry.attributes.position.array, tailUv = tailMesh.geometry.attributes.uv.array;
      if (tailChanged) for (var tv = 0; tv < tailAngles.length; tv++) {
        var tailFactor = tailAngles[tv], tailV = tailUv[tv * 2 + 1], tailLoad = tailV * tailV;
        // Keep the quill roots seated while the distal fan flares for braking.
        // The grouse opens a broad, rounded fan; the dove retains its wedge.
        var angle = tailFactor * (tailSpread + tailBrake * (grouse ? .10 : .065) * smooth(tailV));
        var co = Math.cos(angle), si = Math.sin(angle), t0 = tv * 3;
        tp[t0] = tailRest[t0] * co - tailRest[t0 + 2] * si;
        var tailAlong = -tailRest[t0 + 2] / p.tailLength;
        // A shallow dome and lengthwise bow prevent the fan reading as a
        // flat plate. Differential tip loading follows the bank continuously;
        // braking adds gentle cupping without pulling the root rows apart.
        var tailCamber = unfold * p.tailLength * (grouse ? .028 : .022) * (1 - tailFactor * tailFactor * .68);
        var tailLoading = tailBrake * p.tailLength * (.035 + Math.abs(tailFactor) * .015) +
          tailBank * tailFactor * p.tailLength * (grouse ? .024 : .030);
        tp[t0 + 1] = tailRest[t0 + 1] - Math.abs(tailFactor) * fan * .0015 +
          tailFlex * tailAlong * tailAlong + (tailCamber + tailLoading + hopTailFlex * (1 - Math.abs(tailFactor) * .12)) * tailLoad;
        tp[t0 + 2] = tailRest[t0] * si + tailRest[t0 + 2] * co;
      }
      if (tailChanged) refresh(tailMesh.geometry);
      // Feet stay extended briefly as the wings open, then fold neatly into
      // the belly. Reversing flight blend extends them before touchdown;
      // both directions remain seekable without remembered velocity/state.
      var tuck = smooth((flight - .10) / .78), reach = transition * (1 - tuck) * (1 - landing);
      tuck *= 1 - landing;
      if (flightTuck >= 0) { tuck = flightTuck; reach = 0; }
      var flightCurl = smooth(tuck), gait = walking * (1 - landing);
      for (var f = 0; f < 2; f++) {
        var stepPhase = ((stride + f * PI) % TAU + TAU) % TAU;
        var swing = stepPhase < PI ? stepPhase / PI : -1;
        var swingArc = swing < 0 ? 0 : Math.sin(PI * swing); swingArc *= swingArc;
        var walk = Math.sin(stepPhase) * gait, lift = swingArc * gait;
        feet[f].position.set((f === 0 ? -1 : 1) * p.stance * (1 - tuck * .20), p.leg + tuck * (grouse ? .065 : .041) + reach * .001 + lift * profile.stepLift,
          .006 - tuck * .027 + reach * .010 + walk * .012);
        if (targetBlend === 1) feet[f].position.set(targets[f].x, targets[f].y, targets[f].z);
        else if (targetBlend > 0) feet[f].position.set(
          feet[f].position.x * (1 - targetBlend) + targets[f].x * targetBlend,
          feet[f].position.y * (1 - targetBlend) + targets[f].y * targetBlend,
          feet[f].position.z * (1 - targetBlend) + targets[f].z * targetBlend);
        feet[f].rotation.set(-tuck * 1.23 + reach * .10, 0, (f === 0 ? -1 : 1) * tuck * .08);
        if (hopper && hopAir > 0) {
          feet[f].rotation.x -= hopGather * .50;
          // Rotation alone swings the low ankle forward. Compensate that
          // arc so the actual feet gather beneath the belly, not ahead of it.
          feet[f].position.z += -hopGather * .019 + hopPlant * .005;
        }
        if (cardinal) feet[f].position.z += landingReach * .004;
        // Swing toes release and gather gently, then open ahead of the plant.
        // The support foot stays exactly flat. Roll happens about the ankle
        // inside the geometry, leaving terrain-aware footholds undisturbed.
        var walkingCurl = lift * .30 * (1 - .55 * smooth((swing - .5) / .5));
        var toeGather = lift * .34 * (1 - flightCurl);
        var footRoll = lift * .26 * (1 - 2 * Math.max(0, swing)) * (1 - flightCurl);
        if (targetBlend > 0) {
          // Blend articulated poses, not swing phases: interpolating through
          // the planted -1 sentinel would briefly invent an unrelated step.
          var targetSwing = targets[f].swing < 0 ? -1 : clamp(targets[f].swing, 0, 1);
          var targetArc = targetSwing < 0 ? 0 : Math.sin(PI * targetSwing);
          var targetLift = targetArc * targetArc * gait;
          var targetCurl = targetLift * .30 * (1 - .55 * smooth((targetSwing - .5) / .5));
          walkingCurl = walkingCurl * (1 - targetBlend) + targetCurl * targetBlend;
          toeGather = toeGather * (1 - targetBlend) + targetLift * .34 * (1 - flightCurl) * targetBlend;
          footRoll = footRoll * (1 - targetBlend) + targetLift * .26 * (1 - 2 * Math.max(0, targetSwing)) * (1 - flightCurl) * targetBlend;
        }
        if (hopper && hopPhase >= 0) {
          // Both feet recover together; toes unfurl before the ankle reaches
          // forward. An ankle-centered roll lifts the tips during approach
          // without translating any supporting sole through the floor.
          walkingCurl = hopGather * .42;
          toeGather = hopGather * .30;
          footRoll = -hopPlant * .06;
        }
        if (cardinal) footRoll -= landingReach * .06;
        var toeCurl = flightCurl + (1 - flightCurl) * walkingCurl;
        var footYaw = targetBlend > 0 ? number(targets[f].yaw, 0) * targetBlend : 0, attachment = gait;
        if (targetBlend > 0) {
          var offsetX = targets[f].x - (f === 0 ? -1 : 1) * p.stance, offsetZ = targets[f].z - .006;
          // A stopped external foothold still needs its leg attached. Keep the
          // submillimeter idle terrain correction neutral at course boundaries.
          var offsetY = Math.max(0, Math.abs(targets[f].y - p.leg) - .001);
          var hold = smooth(Math.sqrt(offsetX * offsetX + offsetY * offsetY + offsetZ * offsetZ) / .001) * (1 - unfold);
          attachment = Math.max(attachment, hold * targetBlend);
        }
        // A hop's continuous envelope replaces walking's thresholded contact
        // blend. The actual soles remain at their supplied fixed contacts.
        if (hopper && hopPhase >= 0) attachment = hopAttach;
        else if (cardinal) attachment = Math.max(attachment, launchLoad, landingLoad);
        var hipX = 0, hipY = .009, hipZ = -.004;
        if (attachment > 0) {
          // A concealed proximal segment enters the thigh. The exposed tarsus
          // then keeps its length while a backward hock follows the ankle.
          // This prevents a translated foot from pulling its leg out of the body.
          var wx = body.position.x + (f === 0 ? -1 : 1) * p.stance - feet[f].position.x;
          var wy = body.position.y - .010 - feet[f].position.y;
          var wz = .002 - feet[f].position.z;
          if (hopper && cardinalLean !== 0) {
            wy = body.position.y - .010 * Math.cos(cardinalLean) - .012 * Math.sin(cardinalLean) - feet[f].position.y;
            wz = body.position.z - .010 * Math.sin(cardinalLean) + .012 * Math.cos(cardinalLean) - feet[f].position.z;
          }
          var cosFootX = Math.cos(feet[f].rotation.x), sinFootX = Math.sin(feet[f].rotation.x);
          var cosFootZ = Math.cos(feet[f].rotation.z), sinFootZ = Math.sin(feet[f].rotation.z);
          var unrollY = wy * cosFootX + wz * sinFootX;
          hipX = wx * cosFootZ + unrollY * sinFootZ;
          hipY = -wx * sinFootZ + unrollY * cosFootZ;
          hipZ = -wy * sinFootX + wz * cosFootX;
        }
        var footState = footStates[f], footPositions = footState.geometry.attributes.position.array;
        var footChanged = footState.curl !== toeCurl || footState.gather !== toeGather || footState.roll !== footRoll || footState.yaw !== footYaw || footState.hipX !== hipX ||
          footState.hipY !== hipY || footState.hipZ !== hipZ || footState.attachment !== attachment;
        if (footChanged) {
          footState.curl = toeCurl; footState.gather = toeGather; footState.roll = footRoll; footState.yaw = footYaw; footState.hipX = hipX;
          footState.hipY = hipY; footState.hipZ = hipZ; footState.attachment = attachment;
          footPositions.set(footState.rest);
          if (toeCurl !== 0) for (var toeIndex = 0; toeIndex < footState.toes.length; toeIndex++) {
            var toeState = footState.toes[toeIndex], centers = toeState.centers, bends = toeState.bends;
            var toeX = centers[0], toeY = centers[1], toeZ = centers[2];
            for (var rowIndex = 0; rowIndex < bends.length; rowIndex++) {
              var centerIndex = rowIndex * 3, curlAngle = toeCurl * bends[rowIndex];
              var curlCos = Math.cos(curlAngle), curlSin = Math.sin(curlAngle);
              if (rowIndex > 0) {
                // Rotate each original centerline segment, preserving its
                // length. Rigid rings keep the scaled toes round as they flex.
                var segmentAngle = toeCurl * (bends[rowIndex - 1] + bends[rowIndex]) * .5;
                var segmentCos = Math.cos(segmentAngle), segmentSin = Math.sin(segmentAngle);
                var sx = centers[centerIndex] - centers[centerIndex - 3], sy = centers[centerIndex + 1] - centers[centerIndex - 2];
                var sz = centers[centerIndex + 2] - centers[centerIndex - 1];
                var along = sx * toeState.axisX + sz * toeState.axisZ, across = sx * toeState.axisZ - sz * toeState.axisX;
                var bentAlong = along * segmentCos + sy * segmentSin;
                toeX += bentAlong * toeState.axisX + across * toeState.axisZ;
                toeY += sy * segmentCos - along * segmentSin;
                toeZ += bentAlong * toeState.axisZ - across * toeState.axisX;
              }
              for (var ringVertex = 0; ringVertex < toeState.segments; ringVertex++) {
                var fi = (toeState.start + rowIndex * toeState.segments + ringVertex) * 3;
                if (rowIndex === 0) {
                  footPositions[fi] = footState.rest[fi]; footPositions[fi + 1] = footState.rest[fi + 1]; footPositions[fi + 2] = footState.rest[fi + 2];
                } else {
                  var rx = footState.rest[fi] - centers[centerIndex], ry = footState.rest[fi + 1] - centers[centerIndex + 1];
                  var rz = footState.rest[fi + 2] - centers[centerIndex + 2];
                  var ringAlong = rx * toeState.axisX + rz * toeState.axisZ, ringAcross = rx * toeState.axisZ - rz * toeState.axisX;
                  var ringBent = ringAlong * curlCos + ry * curlSin;
                  footPositions[fi] = toeX + ringBent * toeState.axisX + ringAcross * toeState.axisZ;
                  footPositions[fi + 1] = toeY + ry * curlCos - ringAlong * curlSin;
                  footPositions[fi + 2] = toeZ + ringBent * toeState.axisZ - ringAcross * toeState.axisX;
                }
              }
            }
            if (toeGather > 0 && toeState.splay !== 0) {
              var gatherAngle = -toeState.splay * toeGather, gatherCos = Math.cos(gatherAngle), gatherSin = Math.sin(gatherAngle);
              var toeEnd = toeState.start + toeState.bends.length * toeState.segments;
              for (var gatherVertex = toeState.start; gatherVertex < toeEnd; gatherVertex++) {
                var gi = gatherVertex * 3, gatherX = footPositions[gi] - centers[0], gatherZ = footPositions[gi + 2] - centers[2];
                footPositions[gi] = centers[0] + gatherX * gatherCos + gatherZ * gatherSin;
                footPositions[gi + 2] = centers[2] - gatherX * gatherSin + gatherZ * gatherCos;
              }
            }
          }
          var ankleY = -p.leg + .003, ankleZ = .002;
          if (footRoll !== 0) {
            var rollCos = Math.cos(footRoll), rollSin = Math.sin(footRoll);
            for (var distalIndex = footState.legRings * footState.legSides * 3; distalIndex < footPositions.length; distalIndex += 3) {
              var distalY = footPositions[distalIndex + 1] - ankleY, distalZ = footPositions[distalIndex + 2] - ankleZ;
              footPositions[distalIndex + 1] = ankleY + distalY * rollCos - distalZ * rollSin;
              footPositions[distalIndex + 2] = ankleZ + distalY * rollSin + distalZ * rollCos;
            }
          }
          if (footYaw !== 0) {
            // A planted sole can keep its world heading while the body turns.
            // Yaw only the pad and digits; the hock still aims at the body hip.
            var yawCos = Math.cos(footYaw), yawSin = Math.sin(footYaw);
            for (var yawIndex = footState.legRings * footState.legSides * 3; yawIndex < footPositions.length; yawIndex += 3) {
              var distalX = footPositions[yawIndex], yawZ = footPositions[yawIndex + 2] - ankleZ;
              footPositions[yawIndex] = distalX * yawCos + yawZ * yawSin;
              footPositions[yawIndex + 2] = ankleZ - distalX * yawSin + yawZ * yawCos;
            }
          }
          if (attachment > 0) {
            var legDx = -hipX, legDy = ankleY - hipY, legDz = ankleZ - hipZ;
            var legDistance = Math.sqrt(Math.max(1e-12, legDx * legDx + legDy * legDy + legDz * legDz));
            var lowerLength = Math.sqrt((p.leg + .006) * (p.leg + .006) + .006 * .006);
            var upperLength = tune ? tune.upperLeg : grouse ? .066 : jay ? .044 : cardinal ? .034 : .042;
            var legUx = legDx / legDistance, legUy = legDy / legDistance, legUz = legDz / legDistance;
            var kneeAlong = (upperLength * upperLength - lowerLength * lowerLength + legDistance * legDistance) / (2 * legDistance);
            kneeAlong = clamp(kneeAlong, 0, legDistance);
            var kneeHeight = Math.sqrt(Math.max(0, upperLength * upperLength - kneeAlong * kneeAlong));
            // Project a backward-facing bend direction onto the leg plane.
            var bendX = legUz * legUx, bendY = legUz * legUy, bendZ = -1 + legUz * legUz;
            var bendLength = Math.sqrt(bendX * bendX + bendY * bendY + bendZ * bendZ);
            if (bendLength < 1e-6) { bendX = 0; bendY = 1; bendZ = 0; bendLength = 1; }
            var kneeX = hipX + legUx * kneeAlong + bendX / bendLength * kneeHeight;
            var kneeY = hipY + legUy * kneeAlong + bendY / bendLength * kneeHeight;
            var kneeZ = hipZ + legUz * kneeAlong + bendZ / bendLength * kneeHeight;
            var legCenters = footState.legCenters, legRest = footState.legRest;
            for (var legRow = 0; legRow < footState.legRings; legRow++) {
              var li = legRow * 3, upperRow = legRow <= footState.kneeRing;
              var legU = upperRow ? legRow / footState.kneeRing : (legRow - footState.kneeRing) / (footState.legRings - 1 - footState.kneeRing);
              var centerX = upperRow ? hipX + (kneeX - hipX) * legU : kneeX * (1 - legU);
              var centerY = upperRow ? hipY + (kneeY - hipY) * legU : kneeY + (ankleY - kneeY) * legU;
              var centerZ = upperRow ? hipZ + (kneeZ - hipZ) * legU : kneeZ + (ankleZ - kneeZ) * legU;
              legCenters[li] = legRest[li] + (centerX - legRest[li]) * attachment;
              legCenters[li + 1] = legRest[li + 1] + (centerY - legRest[li + 1]) * attachment;
              legCenters[li + 2] = legRest[li + 2] + (centerZ - legRest[li + 2]) * attachment;
            }
            var oldDy = -(p.leg + .006) / lowerLength, oldDz = .006 / lowerLength;
            for (var ring = 0; ring < footState.legRings; ring++) {
              var before = Math.max(0, ring - 1) * 3, after = Math.min(footState.legRings - 1, ring + 1) * 3;
              var tangentX = legCenters[after] - legCenters[before], tangentY = legCenters[after + 1] - legCenters[before + 1];
              var tangentZ = legCenters[after + 2] - legCenters[before + 2];
              var tangentLength = Math.sqrt(Math.max(1e-12, tangentX * tangentX + tangentY * tangentY + tangentZ * tangentZ));
              tangentX /= tangentLength; tangentY /= tangentLength; tangentZ /= tangentLength;
              var axisX = oldDy * tangentZ - oldDz * tangentY, axisY = oldDz * tangentX, axisZ = -oldDy * tangentX;
              var rotationDenominator = Math.max(1e-6, 1 + oldDy * tangentY + oldDz * tangentZ), ci = ring * 3;
              for (var side = 0; side < footState.legSides; side++) {
                var vi = (ring * footState.legSides + side) * 3;
                var localX = footState.rest[vi] - legRest[ci], localY = footState.rest[vi + 1] - legRest[ci + 1];
                var localZ = footState.rest[vi + 2] - legRest[ci + 2];
                var crossX = axisY * localZ - axisZ * localY, crossY = axisZ * localX - axisX * localZ, crossZ = axisX * localY - axisY * localX;
                footPositions[vi] = legCenters[ci] + localX + crossX + (axisY * crossZ - axisZ * crossY) / rotationDenominator;
                footPositions[vi + 1] = legCenters[ci + 1] + localY + crossY + (axisZ * crossX - axisX * crossZ) / rotationDenominator;
                footPositions[vi + 2] = legCenters[ci + 2] + localZ + crossZ + (axisX * crossY - axisY * crossX) / rotationDenominator;
              }
            }
          }
          refresh(footState.geometry);
        }
      }
    }
    function dispose() {
      if (disposed) return; disposed = true;
      if (root.parent) root.parent.remove(root);
      for (var i = 0; i < resources.length; i++) resources[i].dispose();
    }
    update({});
    return { root: root, body: body, head: head, wings: wings, tail: tail, feet: feet, profile: profile, update: update, dispose: dispose };
  }
  global.AvianWoodlandBirds = { version: '1.0.0', supports: supports, create: create };
})(typeof window !== 'undefined' ? window : globalThis);
