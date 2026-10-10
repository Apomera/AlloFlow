/* Perception Lab: first-person experiments with keyboard and touch alternatives. */
(function () {
  'use strict';
  var Lab = window.StemLab = window.StemLab || {};
  var ACTIVITIES = [
    { id: 'ring', title: 'The broken circle', principle: 'Viewpoint & alignment', goal: 'Find a viewpoint where all twelve arcs join into one circle.', hints: ['Compare two neighboring arc ends as you step sideways. Their separation changes with your viewpoint.', 'Try changing your distance as well as your sideways position. All twelve joins must align at once.'], explanation: 'The arcs occupy three different depths. From x -12, z 9, their projected ends meet even though the pieces remain separated in space.' },
    { id: 'scale', title: 'The size workshop', principle: 'Apparent size & distance', goal: 'Make the teal block and coral block appear equally tall without resizing either.', hints: ['An object makes a larger image as it gets closer, even when its physical size stays fixed.', 'The teal block is half as tall as the coral block. Compare how far each one is from your viewpoint.'], explanation: 'The coral block is 2.4 units tall and the teal block is 1.2. From x 0, z 9, the teal block at z 3 is half as far away and makes the same-height image.' },
    { id: 'occlusion', title: 'Behind the screen', principle: 'Occlusion & object permanence', goal: 'Uncover and collect three symbols hidden behind the screen.', hints: ['An object can remain present even when another surface blocks your view of it.', 'Explore the edges of the screen. A different position can open a sightline to a hidden symbol.'], explanation: 'The nearer opaque screen blocks the light paths from the symbols. Moving around its edges reveals objects that were present all along.' },
    { id: 'parallax', title: 'Depth detective', principle: 'Motion parallax', goal: 'Compare two sideways viewpoints, then identify the nearest sphere.', hints: ['The spheres look similarly sized from the start, but that does not mean they are equally far away.', 'Compare the two straight-ahead views. The nearer sphere shifts farther across your field of view as you step sideways.'], explanation: 'C is nearest in the observation area. With the same viewing direction, it shifts farther across the image during a sideways step than A or B. Their physical sizes differ, so apparent size alone is misleading.' },
    { id: 'contour', title: 'The missing contour', principle: 'Illusory contours & closure', goal: 'Turn the four cutout pieces until a shape seems to appear in the empty center. Identify the shape.', hints: ['There is no continuous outline between the pieces. Compare the directions of their openings.', 'Turn each opening toward the empty center, then inspect the space between the pieces.'], explanation: 'The inward-facing openings can make a square seem to have an edge even though no square is drawn. Your visual system uses the arrangement of the separated pieces to interpret the missing contour.' },
    { id: 'context', title: 'The gray room', principle: 'Brightness & surrounding context', goal: 'Find the two center tiles with the same rendered gray. Compare them with and without their surrounds.', hints: ['A light or dark surround can change how bright a center tile appears.', 'Compare the tiles against a common neutral surround. Their rendered gray stays fixed when the surrounds change.'], explanation: 'A and C use the same gray. Their different surrounds can make them appear different in brightness. Changing the surround changes the context, while the center tiles themselves remain unchanged.' }
  ];
  var CORNER_TARGETS = [315, 225, 135, 45], CORNER_DEFAULTS = [90, 0, 270, 180], TILE_IDS = ['A', 'B', 'C', 'D'];
  function object(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
  function number(value, fallback, min, max) { var n = typeof value === 'number' || typeof value === 'string' && value.trim() ? Number(value) : NaN; return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback; }
  function activity(id) { return ACTIVITIES.find(function (item) { return item.id === id; }) || ACTIVITIES[0]; }
  function spawn(id) { return id === 'contour' ? { x: 36, z: 6.5, yaw: 0, pitch: 0 } : id === 'context' ? { x: 48, z: 7, yaw: 0, pitch: 0 } : id === 'parallax' ? { x: 24, z: 9, yaw: 0, pitch: 0 } : id === 'scale' ? { x: 0, z: 9, yaw: 0, pitch: 0 } : id === 'occlusion' ? { x: 12, z: 8, yaw: 0, pitch: 0 } : { x: -15, z: 10, yaw: 15, pitch: 0 }; }
  function normalizePlayer(raw) {
    var p = object(raw), start = spawn('ring');
    return { x: number(p.x, start.x, -19.3, 55.3), z: number(p.z, start.z, -7.3, 13.3), yaw: ((number(p.yaw, start.yaw, -100000, 100000) + 180) % 360 + 360) % 360 - 180, pitch: number(p.pitch, 0, -45, 45) };
  }
  function angle(value, fallback) { return ((number(value, fallback, -100000, 100000) % 360) + 360) % 360; }
  function observationArea(p) { return p.x >= 22.8 - 1e-8 && p.x <= 25.4 + 1e-8 && p.z >= 8.5 - 1e-8 && p.z <= 11 + 1e-8; }
  function separateViews(a, b) { return Math.abs(a.x - b.x) >= 1.2 - 1e-8 && Math.abs(a.z - b.z) <= 0.25 + 1e-8; }
  function normalize(raw) {
    var data = object(raw), progress = object(data.progress), notes = object(data.notes), contour = object(data.contour), context = object(data.context), result = {
      activity: activity(data.activity).id, player: normalizePlayer(data.player), blockZ: number(data.blockZ, -1, -1, 6),
      collected: Array.isArray(data.collected) ? [0, 1, 2].filter(function (id) { return data.collected.indexOf(id) >= 0; }) : [], precise: data.precise === true, parallax: { samples: [], choice: '' },
      contour: { angles: CORNER_DEFAULTS.map(function (value, index) { return angle(Array.isArray(contour.angles) ? contour.angles[index] : undefined, value); }), selected: Math.floor(number(contour.selected, 0, 0, 3)), choice: ['square', 'circle', 'triangle'].indexOf(contour.choice) >= 0 ? contour.choice : '' },
      context: { selected: Array.isArray(context.selected) ? context.selected.filter(function (value, index, all) { return TILE_IDS.indexOf(value) >= 0 && all.indexOf(value) === index; }).slice(0, 2) : [], neutral: context.neutral === true }, progress: {}, notes: {}
    };
    var parallax = object(data.parallax);
    result.parallax.choice = ['A', 'B', 'C'].indexOf(parallax.choice) >= 0 ? parallax.choice : '';
    if (Array.isArray(parallax.samples)) parallax.samples.slice(0, 2).forEach(function (raw) {
      var sample = object(raw), p = { x: number(sample.x, NaN, -Infinity, Infinity), z: number(sample.z, NaN, -Infinity, Infinity), yaw: 0, pitch: 0 };
      if (observationArea(p) && (!result.parallax.samples.length || separateViews(result.parallax.samples[0], p))) result.parallax.samples.push(p);
    });
    ACTIVITIES.forEach(function (item) { var p = object(progress[item.id]); result.progress[item.id] = { solved: p.solved === true, assisted: p.assisted === true, hints: Math.floor(number(p.hints, 0, 0, 2)) }; result.notes[item.id] = typeof notes[item.id] === 'string' ? notes[item.id].slice(0, 600) : ''; });
    result.player = safePlayer(result.player, result.blockZ);
    return result;
  }
  function obstacles(blockZ) { return [[9.65, 14.35, 1.45, 2.55], [-1.8, -0.1, -3.65, -2.35], [0.35, 1.55, blockZ - 0.6, blockZ + 0.6], [21.54, 23.26, 0.14, 1.86], [22.86, 25.14, -4.14, -1.86], [25.15, 26.45, 3.35, 4.65], [32.75, 39.25, -0.65, 0.35], [45.3, 50.7, -0.4, 0.4], [46.15, 46.85, 3.65, 4.35]]; }
  function inside(p, box) { return p.x > box[0] && p.x < box[1] && p.z > box[2] && p.z < box[3]; }
  function safePlayer(raw, blockZ) {
    var p = normalizePlayer(raw);
    obstacles(number(blockZ, -1, -1, 6)).forEach(function (box) {
      if (!inside(p, box)) return;
      var edges = [{ key: 'x', value: box[0] }, { key: 'x', value: box[1] }, { key: 'z', value: box[2] }, { key: 'z', value: box[3] }];
      edges.sort(function (a, b) { return Math.abs(p[a.key] - a.value) - Math.abs(p[b.key] - b.value); });
      p[edges[0].key] = edges[0].value;
    });
    return p;
  }
  function movePlayer(raw, command, amount, blockZ) {
    var p = safePlayer(raw, blockZ), n = number(amount, 0.32, 0, 10), radians = p.yaw * Math.PI / 180;
    if (command === 'turnLeft' || command === 'turnRight') { p.yaw += (command === 'turnLeft' ? -1 : 1) * n; return normalizePlayer(p); }
    if (command === 'lookUp' || command === 'lookDown') { p.pitch += (command === 'lookUp' ? 1 : -1) * n; return normalizePlayer(p); }
    var forward = command === 'forward' ? 1 : command === 'back' ? -1 : 0, side = command === 'right' ? 1 : command === 'left' ? -1 : 0;
    var dx = (Math.sin(radians) * forward + Math.cos(radians) * side) * n, dz = (-Math.cos(radians) * forward + Math.sin(radians) * side) * n;
    var count = Math.max(1, Math.ceil(n / 0.12)), boxes = obstacles(number(blockZ, -1, -1, 6));
    // Small axis-separated steps let the camera slide along a barrier without tunnelling through it.
    for (var i = 0; i < count; i++) { var next = normalizePlayer(Object.assign({}, p, { x: p.x + dx / count })); if (!boxes.some(function (box) { return inside(next, box); })) p.x = next.x; next = normalizePlayer(Object.assign({}, p, { z: p.z + dz / count })); if (!boxes.some(function (box) { return inside(next, box); })) p.z = next.z; }
    return p;
  }
  function projectedHeight(p, x, z, height) {
    var yaw = p.yaw * Math.PI / 180, pitch = p.pitch * Math.PI / 180, dx = x - p.x, dz = z - p.z;
    function endpoint(dy) { var depth = dx * Math.sin(yaw) * Math.cos(pitch) + dy * Math.sin(pitch) - dz * Math.cos(yaw) * Math.cos(pitch); return depth > 0.2 ? (-dx * Math.sin(yaw) * Math.sin(pitch) + dy * Math.cos(pitch) + dz * Math.cos(yaw) * Math.sin(pitch)) / depth : NaN; }
    return Math.abs(endpoint(height / 2) - endpoint(-height / 2));
  }
  function moveBlock(raw, value) {
    var next = normalize(raw), p = next.player, offset = p.x - 0.95;
    if (Math.hypot(offset, p.z - next.blockZ) > 7.00000001) return next;
    var reach = Math.sqrt(Math.max(0, 49 - offset * offset));
    var z = Math.max(-1, p.z - reach, Math.min(6, p.z + reach, number(value, next.blockZ, -1, 6)));
    // Preserve the side of the player the block occupies, including large slider jumps.
    if (Math.abs(offset) < 0.6) z = next.blockZ < p.z ? Math.min(z, p.z - 0.65) : Math.max(z, p.z + 0.65);
    next.blockZ = Math.max(-1, Math.min(6, z));
    return next;
  }
  function faceExhibit(raw) {
    var state = normalize(raw), x = state.activity === 'ring' ? -12 : state.activity === 'scale' ? 0 : state.activity === 'parallax' ? 24 : state.activity === 'contour' ? 36 : state.activity === 'context' ? 48 : 12;
    if (state.activity === 'parallax') return Object.assign({}, state.player, { yaw: 0, pitch: 0 });
    var z = state.activity === 'ring' || state.activity === 'contour' || state.activity === 'context' ? 0 : state.activity === 'scale' ? (state.blockZ - 3) / 2 : -1.5;
    var dx = x - state.player.x, dz = z - state.player.z;
    return normalizePlayer(Object.assign({}, state.player, { yaw: Math.hypot(dx, dz) > 0.01 ? Math.atan2(dx, -dz) * 180 / Math.PI : state.player.yaw, pitch: 0 }));
  }
  function recordView(raw) {
    var state = normalize(raw), samples = state.parallax.samples, p = state.player;
    if (state.activity !== 'parallax' || samples.length >= 2 || !observationArea(p) || samples.length && !separateViews(samples[0], p)) return state;
    // A shared heading isolates translation from camera rotation in the comparison.
    state.player = Object.assign({}, p, { yaw: 0, pitch: 0 });
    samples.push(Object.assign({}, state.player));
    return state;
  }
  function canTurnCorner(raw, index) { var p = raw.player; return raw.activity === 'contour' && Number.isInteger(index) && index >= 0 && index < 4 && p.z >= 0.35 && Math.hypot(p.x - (36 + (index === 0 || index === 3 ? -1.2 : 1.2)), p.z - 0.15) <= 10; }
  function turnCorner(raw, index, value) { var state = normalize(raw); if (canTurnCorner(state, index)) { state.contour.angles[index] = angle(value, state.contour.angles[index]); state.contour.selected = index; } return state; }
  function toggleTile(raw, choice) { var state = normalize(raw), selected = state.context.selected, index = selected.indexOf(choice); if (TILE_IDS.indexOf(choice) < 0) return state; if (index >= 0) selected.splice(index, 1); else if (selected.length < 2) selected.push(choice); return state; }
  function alignedCorners(state) { return state.contour.angles.filter(function (value, index) { return Math.abs(((value - CORNER_TARGETS[index] + 540) % 360) - 180) <= 7.5; }).length; }
  function facing(p, x, z) { var dx = x - p.x, dz = z - p.z, length = Math.hypot(dx, dz), yaw = p.yaw * Math.PI / 180; return length > 0.2 && (dx * Math.sin(yaw) - dz * Math.cos(yaw)) / length > 0.94 && Math.abs(p.pitch) < 20; }
  function evidence(raw) {
    var state = normalize(raw), p = state.player, ringError = Infinity;
    if (p.z > 3.5) {
      ringError = 0;
      for (var i = 0; i < 12; i++) {
        var angle = (i + 2) * Math.PI / 6, depths = [-3, 0, 3], a = depths[i % 3], b = depths[(i + 1) % 3];
        function point(depth) { var k = (9 - depth) / 9, t = p.z / (p.z - depth); return { x: p.x + (-12 + Math.cos(angle) * 1.35 * k - p.x) * t, y: Math.sin(angle) * 1.35 * k * t }; }
        var first = point(a), second = point(b); ringError = Math.max(ringError, Math.hypot(first.x - second.x, first.y - second.y) / 1.35);
      }
    }
    var ratio = projectedHeight(p, 0.95, state.blockZ, 1.2) / projectedHeight(p, -0.95, -3, 2.4);
    return { ringError: ringError, ringAlignment: Math.max(0, Math.round(100 * (1 - Math.min(1, ringError)))), ringFacing: facing(p, -12, 0), scaleRatio: Number.isFinite(ratio) && ratio > 0 ? ratio : null, scaleFacing: facing(p, 0, (state.blockZ - 3) / 2), collected: state.collected.length, contourAligned: alignedCorners(state), contourFacing: facing(p, 36, 0), contextSelected: state.context.selected.length };
  }
  function canCollect(raw, id) {
    if ([0, 1, 2].indexOf(id) < 0) return false;
    var state = normalize(raw), p = state.player, x = 10.5 + id * 1.5, z = -1.5;
    if (state.collected.indexOf(id) >= 0 || Math.hypot(x - p.x, z - p.z) > 7) return false;
    // Intersect the line of sight with both faces of the opaque screen.
    var near = 0, far = 1, delta = [x - p.x, z - p.z], origin = [p.x, p.z], bounds = [[10, 14], [1.8, 2.2]];
    for (var axis = 0; axis < 2; axis++) {
      if (Math.abs(delta[axis]) < 0.00001) { if (origin[axis] < bounds[axis][0] || origin[axis] > bounds[axis][1]) return true; }
      else { var t1 = (bounds[axis][0] - origin[axis]) / delta[axis], t2 = (bounds[axis][1] - origin[axis]) / delta[axis]; near = Math.max(near, Math.min(t1, t2)); far = Math.min(far, Math.max(t1, t2)); }
    }
    return near > far;
  }
  function checkAnswer(raw) { var state = normalize(raw), values = evidence(state); return state.activity === 'ring' ? values.ringError <= 0.055 && values.ringFacing : state.activity === 'scale' ? values.scaleRatio != null && Math.abs(values.scaleRatio - 1) <= 0.05 && values.scaleFacing : state.activity === 'parallax' ? state.parallax.samples.length === 2 && state.parallax.choice === 'C' : state.activity === 'contour' ? values.contourAligned === 4 && state.contour.choice === 'square' && values.contourFacing : state.activity === 'context' ? state.context.selected.length === 2 && state.context.selected.indexOf('A') >= 0 && state.context.selected.indexOf('C') >= 0 : values.collected === 3; }
  var CSS = `
    [data-perception-walk]{--pw-ink:#203032;--pw-muted:#526466;--pw-bg:#fff;--pw-line:#c9d6d5;--pw-soft:#edf3f2;--pw-accent:#096a65;background:var(--pw-bg);color:var(--pw-ink);padding:20px;font:inherit;line-height:1.5;min-width:0}
    [data-perception-walk][data-theme=dark]{--pw-ink:#edf6f4;--pw-muted:#b9cdca;--pw-bg:#172323;--pw-line:#506966;--pw-soft:#263936;--pw-accent:#98e3d3}
    [data-perception-walk][data-theme=contrast]{--pw-ink:#fff;--pw-muted:#fff;--pw-bg:#000;--pw-line:#fff;--pw-soft:#161616;--pw-accent:#ffed7a}
    [data-perception-walk] *{box-sizing:border-box;letter-spacing:0}[data-perception-walk] h2,[data-perception-walk] h3,[data-perception-walk] p,[data-perception-walk] figure{margin:0}
    [data-perception-walk] h2{font-size:25px;line-height:1.3;font-weight:750}[data-perception-walk] h3{font-size:19px;line-height:1.35;font-weight:700}
    [data-perception-walk] button{display:inline-flex;align-items:center;justify-content:center;gap:7px;font:inherit;line-height:1.3;color:inherit;background:var(--pw-bg);border:1px solid var(--pw-line);border-radius:5px;padding:9px 12px;min-height:44px;cursor:pointer}
    [data-perception-walk] button:hover{background:var(--pw-soft)}[data-perception-walk] button:disabled{opacity:.5;cursor:default}[data-perception-walk] button[aria-pressed=true]{border-color:var(--pw-accent);box-shadow:inset 0 -3px var(--pw-accent);background:var(--pw-soft)}
    [data-perception-walk] :focus-visible{outline:3px solid var(--pw-accent);outline-offset:3px}[data-perception-walk] .pw-primary{background:var(--pw-accent);color:var(--pw-bg);font-weight:700}
    [data-perception-walk] .pw-primary:hover{background:var(--pw-accent);filter:brightness(.94)}
    .pw-header,.pw-actions,.pw-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.pw-header{padding-bottom:18px}.pw-eyebrow,.pw-principle{font-size:12px;font-weight:700;text-transform:uppercase;color:var(--pw-accent)}.pw-progress{font-size:14px;color:var(--pw-muted)}
    .pw-nav{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));border-block:1px solid var(--pw-line);margin-bottom:16px}[data-perception-walk] .pw-nav button{border:0;border-radius:0;text-align:left;justify-content:flex-start;padding:13px 12px;min-width:0}.pw-nav button+button{border-left:1px solid var(--pw-line)!important}.pw-nav strong,.pw-nav small{display:block}.pw-nav strong{font-size:15px}.pw-nav small{font-size:12px;color:var(--pw-muted)}
    .pw-workspace{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:24px;align-items:start}.pw-scene-column{min-width:0}.pw-toolbar{margin-bottom:10px}.pw-toolbar label{display:flex;align-items:center;gap:7px;font-size:13px}.pw-toolbar input{width:20px;height:20px;accent-color:var(--pw-accent)}
    .pw-stage{position:relative;height:clamp(360px,62vh,690px);width:100%;overflow:hidden;background:#edf2ef;isolation:isolate}.pw-viewport,.pw-plan{position:absolute;inset:0;width:100%;height:100%}.pw-viewport{touch-action:pan-y;cursor:grab}.pw-viewport:active{cursor:grabbing}.pw-viewport[hidden]{display:none}.pw-crosshair{position:absolute;left:50%;top:50%;width:18px;height:18px;transform:translate(-50%,-50%);pointer-events:none;filter:drop-shadow(0 1px 1px #fff)}.pw-crosshair:before,.pw-crosshair:after{content:'';position:absolute;background:#183532}.pw-crosshair:before{width:16px;height:2px;left:1px;top:8px}.pw-crosshair:after{height:16px;width:2px;top:1px;left:8px}
    .pw-stage figcaption{position:absolute;bottom:0;left:0;max-width:100%;padding:7px 10px;background:#fff;color:#203032;font-size:12px;pointer-events:none}.pw-render-status{position:absolute;top:12px;left:12px;right:12px;padding:10px;background:#fff;color:#203032;font-size:14px;border:1px solid #c9d6d5;display:flex;gap:12px;justify-content:space-between;align-items:center}
    .pw-waypoints{position:absolute;inset:0;pointer-events:none}[data-perception-walk] .pw-waypoint{position:absolute;transform:translate(-50%,-50%);pointer-events:auto;width:100px;min-height:44px;padding:7px 5px;font-size:13px;background:#fff;color:#203032;border:2px solid #096a65;box-shadow:0 2px 4px #20303224;overflow-wrap:anywhere}.pw-waypoint:hover{background:#edf3f2!important}.pw-waypoint span:first-child{color:#096a65;font-weight:750}
    .pw-navigation{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;border-bottom:1px solid var(--pw-line);padding:12px 0}.pw-pad{display:grid;grid-template-columns:repeat(3,44px);grid-template-rows:repeat(2,44px);gap:4px}.pw-pad button{padding:0!important;touch-action:none;user-select:none}.pw-look{display:grid;grid-template-columns:repeat(2,44px);gap:4px}.pw-look button{padding:0!important;touch-action:none;user-select:none}.pw-controls{display:flex;gap:12px;align-items:center}.pw-actions .pw-icon{width:44px;padding:8px}.pw-position{font-size:12px;color:var(--pw-muted);font-variant-numeric:tabular-nums;margin-top:8px!important}
    .pw-task{border-left:1px solid var(--pw-line);padding-left:24px;min-width:0}.pw-task>*+*{margin-top:16px!important}.pw-task p{font-size:14px}.pw-task .pw-goal{font-size:16px;font-weight:600}.pw-reading{display:flex;align-items:baseline;justify-content:space-between;gap:12px;border-block:1px solid var(--pw-line);padding:12px 0;font-size:14px}.pw-reading strong{font-size:21px;font-variant-numeric:tabular-nums}.pw-task input[type=range]{width:100%;display:block;min-height:36px;accent-color:var(--pw-accent)}.pw-slider{display:block;font-size:14px}.pw-slider output{float:right;font-variant-numeric:tabular-nums}
    .pw-tokens{display:grid;gap:8px}.pw-tokens button{justify-content:flex-start!important}.pw-token-dot{display:inline-block;width:18px;height:18px;border:1px solid currentColor;flex:none}.pw-note{display:block;font-size:14px}.pw-note textarea{display:block;margin-top:7px;min-height:85px;resize:vertical;width:100%;background:var(--pw-bg);color:var(--pw-ink);border:1px solid var(--pw-line);border-radius:4px;font:inherit;padding:9px}.pw-status{min-height:24px;font-size:14px;color:var(--pw-muted);margin-top:12px!important}.pw-explanation{border-top:1px solid var(--pw-line);padding-top:12px}
    .pw-hints{font-size:14px}.pw-hints ol{padding-left:20px;margin:10px 0 0}.pw-hints li+li{margin-top:8px}.pw-reach{font-size:12px!important;color:var(--pw-muted);margin:7px 0!important}.pw-reading[data-unavailable=true] strong{font-size:14px;max-width:100px;text-align:right}
    .pw-precision{display:flex;align-items:center;gap:7px;font-size:13px}.pw-precision input,.pw-choices input{width:20px;height:20px;accent-color:var(--pw-accent);flex:none}.pw-choices{border:0;padding:0;margin:0;min-width:0}.pw-choices legend{font-size:14px;font-weight:600;margin-bottom:8px}.pw-choices label{display:flex;align-items:center;gap:8px;min-height:44px;font-size:14px;cursor:pointer}.pw-samples{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.pw-samples button{flex:1;min-width:90px}.pw-baseline{font-size:12px!important;color:var(--pw-muted);margin-top:8px!important}
    @media(max-width:1000px){.pw-workspace{grid-template-columns:minmax(0,1fr) 250px;gap:16px}.pw-task{padding-left:16px}.pw-nav{grid-template-columns:repeat(3,minmax(0,1fr))}.pw-nav button:nth-child(4){border-left:0!important}.pw-nav button:nth-child(n+4){border-top:1px solid var(--pw-line)}}
    @media(max-width:760px){[data-perception-walk]{padding:12px}.pw-workspace{grid-template-columns:minmax(0,1fr)}.pw-task{border-left:0;border-top:1px solid var(--pw-line);padding:20px 0 0}.pw-stage{height:360px}.pw-nav strong{font-size:13px}.pw-nav small{display:none}[data-perception-walk] .pw-nav button{padding:10px 7px}.pw-header h2{font-size:23px}.pw-navigation{gap:10px}.pw-nav{margin-bottom:12px}}
    @media(max-width:380px){.pw-stage{height:320px}.pw-nav strong{font-size:12px}.pw-navigation{align-items:flex-start}.pw-controls{gap:8px}.pw-header h2{font-size:22px}.pw-toolbar{gap:8px}}
    @media(max-width:760px){.pw-nav{grid-template-columns:repeat(2,minmax(0,1fr))}.pw-nav button:nth-child(2n+1){border-left:0!important}.pw-nav button:nth-child(2n){border-left:1px solid var(--pw-line)!important}.pw-nav button:nth-child(n+3){border-top:1px solid var(--pw-line)}.pw-precision{order:3;flex-basis:100%}}
    @media(forced-colors:active){.pw-stage{forced-color-adjust:none}.pw-primary{border:2px solid ButtonText!important}}
  `;
  function Plan(props) {
    var h = props.h, state = props.state, p = state.player, scale = 15, px = function (x) { return 30 + (x + 20) * scale; }, pz = function (z) { return 25 + (z + 8) * scale; };
    if (state.activity === 'contour' || state.activity === 'context') return h('svg', { className: 'pw-plan', viewBox: '0 0 800 600', role: 'img', 'aria-label': state.activity === 'contour' ? 'Front view of the four cutout pieces' : 'Four gray tiles and their surrounds', 'data-walk-plan': true },
      h('rect', { width: 800, height: 600, fill: '#f6f8f5' }),
      state.activity === 'contour' ? [[250, 150], [550, 150], [550, 450], [250, 450]].map(function (center, index) { return h('g', { key: index }, h('path', { d: 'M0 0 L57.45 57.45 A81.25 81.25 0 1 1 57.45 -57.45 Z', transform: 'translate(' + center.join(' ') + ') rotate(' + (-state.contour.angles[index]) + ')', fill: '#324d50' }), h('text', { x: center[0], y: center[1] - 100, textAnchor: 'middle', fontSize: 24, fill: '#203032' }, TILE_IDS[index])); }) : [[250, 175], [550, 175], [250, 425], [550, 425]].map(function (center, index) { var id = TILE_IDS[index]; return h('g', { key: id }, h('rect', { x: center[0] - 120, y: center[1] - 100, width: 240, height: 200, fill: state.context.neutral ? '#b8b8b8' : ['#ededed', '#ededed', '#202020', '#292929'][index], stroke: state.context.selected.indexOf(id) >= 0 ? '#096a65' : 'none', strokeWidth: 5 }), h('rect', { x: center[0] - 40, y: center[1] - 40, width: 80, height: 80, fill: ['#888888', '#a0a0a0', '#888888', '#707070'][index] }), h('text', { x: center[0], y: center[1] - 110, textAnchor: 'middle', fontSize: 24, fill: '#203032' }, id)); }),
      props.reveal && state.activity === 'contour' && h('rect', { x: 250, y: 150, width: 300, height: 300, fill: 'none', stroke: '#096a65', strokeWidth: 3 }));
    return h('svg', { className: 'pw-plan', viewBox: '0 0 1200 380', role: 'img', 'aria-label': 'Plan of the six challenge spaces and your current position', 'data-walk-plan': true },
      h('rect', { x: 25, y: 20, width: 1150, height: 340, fill: '#e5edeb', stroke: '#506c68', strokeWidth: 2 }),
      [-12, 0, 12, 24, 36, 48].map(function (x, index) { return h('text', { key: x, x: px(x), y: 43, textAnchor: 'middle', fill: '#203032', fontSize: 14, fontWeight: 700 }, ['Circle', 'Size', 'Screen', 'Depth', 'Corners', 'Context'][index]); }),
      [-3, 0, 3].map(function (z, index) { return h('line', { key: z, x1: px(-13.5), x2: px(-10.5), y1: pz(z), y2: pz(z), stroke: ['#147e78', '#c66b57', '#a8801d'][index], strokeWidth: 5 }); }),
      h('rect', { x: px(-1.45), y: pz(-3.3), width: 15, height: 9, fill: '#c66b57' }), h('rect', { x: px(0.7), y: pz(state.blockZ - 0.25), width: 7.5, height: 7.5, fill: '#147e78' }),
      h('rect', { x: px(10), y: pz(1.8), width: 60, height: 6, fill: '#43565d' }), [0, 1, 2].map(function (id) { return h('circle', { key: id, cx: px(10.5 + id * 1.5), cy: pz(-1.5), r: 5, fill: state.collected.indexOf(id) >= 0 ? '#b2bdb9' : ['#e9b342', '#208e87', '#e87967'][id] }); }),
      props.reveal && state.activity === 'ring' && h('circle', { cx: px(-12), cy: pz(9), r: 8, fill: 'none', stroke: '#096a65', strokeWidth: 2 }),
      [[22.4, 1, 0.56, '#e87967'], [24, -3, 0.84, '#e9b342'], [25.8, 4, 0.35, '#208e87']].map(function (sphere, index) { return h('g', { key: index }, h('circle', { cx: px(sphere[0]), cy: pz(sphere[1]), r: sphere[2] * scale, fill: sphere[3], stroke: '#203032' }), h('text', { x: px(sphere[0]) + 15, y: pz(sphere[1]) + 4, fontSize: 13, fill: '#203032' }, ['A', 'B', 'C'][index])); }),
      h('rect', { x: px(22.8), y: pz(8.5), width: 39, height: 37.5, fill: 'none', stroke: '#526466', strokeDasharray: '3 3' }),
      state.parallax.samples.map(function (sample, index) { return h('text', { key: index, x: px(sample.x), y: pz(sample.z) - 10, textAnchor: 'middle', fill: '#096a65', fontSize: 13 }, index + 1); }),
      [36, 48].map(function (x) { return h('line', { key: x, x1: px(x - 2.8), x2: px(x + 2.8), y1: pz(0), y2: pz(0), stroke: '#324d50', strokeWidth: 4 }); }),
      h('g', { transform: 'translate(' + px(p.x) + ' ' + pz(p.z) + ') rotate(' + p.yaw + ')' }, h('path', { d: 'M0 -12 L8 9 L0 5 L-8 9 Z', fill: '#203032', stroke: '#fff', strokeWidth: 2 })));
  }
  function Walk(props) {
    var ctx = props.ctx, React = ctx.React, h = React.createElement, state = normalize((ctx.toolData || {}).perceptionWalk), meta = activity(state.activity), reading = evidence(state), progress = state.progress[meta.id];
    var uid = React.useId(), statusPair = React.useState(''), status = statusPair[0], setStatus = statusPair[1], diagramPair = React.useState(false), diagram = diagramPair[0], setDiagram = diagramPair[1];
    var renderPair = React.useState('idle'), renderStatus = renderPair[0], setRenderStatus = renderPair[1], retryPair = React.useState(0), retry = retryPair[0], setRetry = retryPair[1];
    var revealPair = React.useState(false), reveal = revealPair[0], setReveal = revealPair[1], selectedPair = React.useState(false), selected = selectedPair[0], setSelected = selectedPair[1];
    var layoutPair = React.useState([]), layout = layoutPair[0], setLayout = layoutPair[1];
    var host = React.useRef(null), root = React.useRef(null), viewer = React.useRef(null), latest = React.useRef(state), sceneLatest = React.useRef(null), drag = React.useRef(null), hold = React.useRef(null), focusStation = React.useRef(null);
    latest.current = state;
    function t(key, fallback) { var translated; try { translated = ctx.t && ctx.t('stem.perception.walk_' + key, fallback); } catch (_) {} return typeof translated === 'string' && translated !== 'stem.perception.walk_' + key ? translated : fallback; }
    function update(fn) { var setter = ctx.setToolData || ctx.setLabToolData; if (setter) setter(function (prev) { return Object.assign({}, prev, { perceptionWalk: normalize(fn(normalize((prev || {}).perceptionWalk))) }); }); }
    function icon(name, fallback) { var Icon = (ctx.icons || {})[name] || (window.LucideReact || {})[name]; return Icon ? h(Icon, { size: 20, 'aria-hidden': true, focusable: false }) : h('span', { 'aria-hidden': true }, fallback); }
    function button(label, handler, attrs) { return h('button', Object.assign({ type: 'button', onClick: handler }, attrs || {}), label); }
    function stop() { if (hold.current != null) { clearInterval(hold.current); hold.current = null; } drag.current = null; }
    function move(command, precise) { drag.current = null; update(function (next) { var fine = precise || next.precise; next.player = movePlayer(next.player, command, command.indexOf('turn') === 0 || command.indexOf('look') === 0 ? fine ? 1 : 5 : fine ? 0.05 : 0.2, next.blockZ); next.activity = next.player.x < -6 ? 'ring' : next.player.x > 42 ? 'context' : next.player.x > 30 ? 'contour' : next.player.x > 18 ? 'parallax' : next.player.x > 6 ? 'occlusion' : 'scale'; return next; }); }
    React.useEffect(function () { setReveal(false); setSelected(false); setStatus(''); }, [state.activity]);
    React.useEffect(function () { if (!focusStation.current || !root.current) return; var target = root.current.querySelector('[data-walk-activity="' + focusStation.current + '"]'); focusStation.current = null; if (target) target.focus({ preventScroll: true }); });
    React.useEffect(function () { function pause() { if (document.hidden) stop(); } window.addEventListener('blur', stop); document.addEventListener('visibilitychange', pause); return function () { stop(); window.removeEventListener('blur', stop); document.removeEventListener('visibilitychange', pause); }; }, []);
    var sceneData = { player: state.player, activity: state.activity, blockZ: state.blockZ, collected: state.collected, parallaxChoice: state.parallax.choice, contourAngles: state.contour.angles, contourSelected: state.contour.selected, contextNeutral: state.context.neutral, contextSelected: state.context.selected, reveal: reveal, selected: selected, static: true, sig: [state.activity, state.blockZ, state.collected.join(','), state.parallax.choice, state.contour.angles.join(','), state.contour.selected, state.context.neutral, state.context.selected.join(','), reveal, selected].join(':') };
    sceneLatest.current = sceneData;
    React.useEffect(function () {
      stop(); setLayout([]); if (diagram) { setRenderStatus('diagram'); return; }
      var factory = Lab.PerceptionWalkScene, active = true;
      if (!factory || typeof Lab.makeOrbitViewer !== 'function') { setRenderStatus('failed'); return; }
      var instance = factory.createViewer(); viewer.current = instance;
      if (!instance) { setRenderStatus('failed'); return; }
      instance.onStatusChange(function (value) { if (active) { setRenderStatus(value); if (value === 'ready') instance.push(sceneLatest.current); else stop(); } });
      if (instance.onLayout) instance.onLayout(function (markers) { if (active) setLayout(markers); });
      instance.attach(host.current); instance.push(sceneLatest.current); setRenderStatus(instance.status());
      return function () { active = false; stop(); instance.dispose(); if (viewer.current === instance) viewer.current = null; };
    }, [diagram, retry]);
    React.useEffect(function () { if (viewer.current) viewer.current.push(sceneData); }, [state.player.x, state.player.z, state.player.yaw, state.player.pitch, sceneData.sig, diagram, retry]);
    function choose(id, focus) { stop(); if (focus) focusStation.current = id; setReveal(false); setSelected(false); setStatus(''); update(function (next) { next.activity = id; next.player = spawn(id); return next; }); }
    function home() { stop(); update(function (next) { next.player = spawn(next.activity); return next; }); setStatus(''); }
    function face() { stop(); update(function (next) { next.player = faceExhibit(next); return next; }); setStatus(''); }
    function record() {
      stop(); var next = recordView(state), count = next.parallax.samples.length;
      if (count > state.parallax.samples.length) { update(recordView); setStatus(count === 1 ? t('view_first', 'First straight-ahead view recorded.') : t('view_second', 'Second view recorded. Compare the spheres.')); }
      else setStatus(!observationArea(state.player) ? t('view_area', 'The viewpoint must be inside the marked observation area.') : t('view_baseline', 'A second view needs at least 1.2 units sideways, with the same forward distance.'));
    }
    function revisit(index) { stop(); update(function (next) { if (next.parallax.samples[index]) next.player = Object.assign({}, next.parallax.samples[index]); return next; }); setStatus(''); }
    function selectSphere(choice) { update(function (next) { next.parallax.choice = choice; return next; }); setStatus(t('sphere_selected', 'Selected sphere') + ' ' + choice + '.'); }
    function selectCorner(index) { if (!canTurnCorner(latest.current, index)) { setStatus(t('corner_far', 'Move closer to the front of the cutout pieces.')); return; } update(function (next) { next.contour.selected = index; return next; }); setStatus(t('corner_selected', 'Selected piece') + ' ' + TILE_IDS[index] + '.'); }
    function changeCorner(index, value) { update(function (next) { return turnCorner(next, index, value); }); }
    function selectTile(choice) { var selected = latest.current.context.selected; if (selected.indexOf(choice) < 0 && selected.length >= 2) { setStatus(t('two_tiles', 'Two tiles are selected. Unselect one before choosing another.')); return; } update(function (next) { return toggleTile(next, choice); }); setStatus(''); }
    function neutralSurround(value) { stop(); update(function (next) { next.context.neutral = typeof value === 'boolean' ? value : !next.context.neutral; return next; }); setStatus(t('surround_changed', 'Surround changed. The center tiles remain unchanged.')); }
    function collect(id) { if (!canCollect(latest.current, id)) { setStatus(t('hidden', 'That symbol is hidden or out of reach.')); return; } update(function (next) { if (canCollect(next, id)) next.collected.push(id); return next; }); setStatus(t('collected', 'Symbol collected.')); }
    function nearBlock(current) { return Math.hypot(current.player.x - 0.95, current.player.z - current.blockZ) <= 7.00000001; }
    function pick(x, y) { if (!viewer.current || !viewer.current.pick) return; var hit = viewer.current.pick(x, y); if (!hit) { setStatus(t('nothing', 'No reachable object at this point.')); return; } if (hit.id === 'scale-block') { setSelected(true); setStatus(t('selected', 'Teal block selected.')); } else if (/^token-[012]$/.test(hit.id)) collect(Number(hit.id.slice(-1))); else if (/^parallax-[ABC]$/.test(hit.id)) selectSphere(hit.id.slice(-1)); else if (/^contour-[0123]$/.test(hit.id)) selectCorner(Number(hit.id.slice(-1))); else if (/^context-[ABCD]$/.test(hit.id)) selectTile(hit.id.slice(-1)); else if (hit.id === 'context-switch') neutralSurround(); }
    function interact() { if (diagram || renderStatus !== 'ready') { if (state.activity === 'scale' && nearBlock(state)) setSelected(true); return; } var rect = host.current.getBoundingClientRect(); pick(rect.left + rect.width / 2, rect.top + rect.height / 2); }
    function changeBlock(value) { update(function (next) { return moveBlock(next, value); }); }
    function check() {
      var correct = checkAnswer(state), message;
      if (state.activity === 'ring' && !reading.ringFacing || state.activity === 'scale' && (!reading.scaleFacing || reading.scaleRatio == null) || state.activity === 'contour' && !reading.contourFacing) message = t('face_again', 'The exhibit is out of view. Face the exhibit to compare it.');
      else if (correct) message = progress.assisted ? t('explored', 'Challenge explored with a reveal.') : t('solved', 'Challenge solved.');
      else if (state.activity === 'ring') message = t('ring_again', 'The arcs are still separated. Try another position and face the circle.');
      else if (state.activity === 'scale') message = t('scale_again', 'The apparent heights differ. Compare their distance as well as their size.');
      else if (state.activity === 'parallax') message = state.parallax.samples.length < 2 ? t('views_needed', 'Two separated viewpoints are needed before checking.') : !state.parallax.choice ? t('choice_needed', 'Choose the sphere you think is nearest.') : t('parallax_again', 'Compare again: which sphere shifts farthest between the two views?');
      else if (state.activity === 'contour') message = reading.contourAligned < 4 ? t('contour_again', 'Some openings still face away from the center.') : !state.contour.choice ? t('shape_needed', 'Choose the shape you see in the empty center.') : t('shape_again', 'Compare the implied edges again.');
      else if (state.activity === 'context') message = state.context.selected.length < 2 ? t('pair_needed', 'Choose two center tiles to compare.') : t('context_again', 'These tiles use different grays. Compare them with a neutral surround.');
      else message = t('occlusion_again', 'There are still hidden symbols to uncover.');
      setStatus(message);
      if (correct) update(function (next) { if (checkAnswer(next) && !next.progress[next.activity].assisted) next.progress[next.activity].solved = true; return next; });
    }
    function reset() { stop(); setReveal(false); setSelected(false); setStatus(''); update(function (next) { next.player = spawn(next.activity); next.progress[next.activity] = { solved: false, assisted: false, hints: 0 }; if (next.activity === 'scale') next.blockZ = -1; if (next.activity === 'occlusion') next.collected = []; if (next.activity === 'parallax') next.parallax = { samples: [], choice: '' }; if (next.activity === 'contour') next.contour = { angles: CORNER_DEFAULTS.slice(), selected: 0, choice: '' }; if (next.activity === 'context') next.context = { selected: [], neutral: false }; return next; }); }
    function hint() { update(function (next) { next.progress[next.activity].hints = Math.min(2, next.progress[next.activity].hints + 1); return next; }); }
    function revealPrinciple() { setReveal(!reveal); if (!reveal) update(function (next) { next.progress[next.activity].assisted = true; return next; }); }
    function keyDown(event) { if (event.ctrlKey || event.altKey || event.metaKey) return; var command = { w: 'forward', s: 'back', a: 'left', d: 'right', ArrowUp: 'forward', ArrowDown: 'back', ArrowLeft: 'turnLeft', ArrowRight: 'turnRight', PageUp: 'lookUp', PageDown: 'lookDown' }[event.key.length === 1 ? event.key.toLowerCase() : event.key]; if (command) { event.preventDefault(); move(command, event.shiftKey); } else if (event.key.toLowerCase() === 'e') { event.preventDefault(); if (!event.repeat) interact(); } else if (event.key === 'Escape') { stop(); var target = root.current && root.current.querySelector('[data-walk-activity="' + state.activity + '"]'); if (target) target.focus(); } }
    function pointerDown(event) {
      if (event.button !== 0 || diagram || renderStatus !== 'ready') return;
      event.currentTarget.focus({ preventScroll: true });
      var instance = viewer.current, hit = instance && instance.pick && instance.pick(event.clientX, event.clientY), block = hit && hit.id === 'scale-block' && nearBlock(latest.current);
      var corner = hit && /^contour-[0123]$/.test(hit.id) ? Number(hit.id.slice(-1)) : -1;
      if (!canTurnCorner(latest.current, corner)) corner = -1;
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, player: latest.current.player, moved: false, kind: block ? 'block' : corner >= 0 ? 'corner' : 'look', corner: corner, angle: corner >= 0 ? latest.current.contour.angles[corner] : 0, blockZ: latest.current.blockZ, track: block && instance.blockCoordinate ? instance.blockCoordinate(event.clientX, event.clientY) : null };
      if (block) { setSelected(true); setStatus(t('selected', 'Teal block selected.')); }
      if (corner >= 0) selectCorner(corner);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    function pointerMove(event) {
      var start = drag.current; if (!start || start.id !== event.pointerId) return;
      var dx = event.clientX - start.x, dy = event.clientY - start.y;
      if (Math.hypot(dx, dy) <= 6 && !start.moved) return;
      // Leave vertical touch gestures to page scrolling before changing scene state.
      if (event.pointerType === 'touch' && !start.moved && Math.abs(dy) > Math.abs(dx)) return;
      start.moved = true;
      if (start.kind === 'corner') { changeCorner(start.corner, start.angle + dx * 0.5); return; }
      if (start.kind === 'block') {
        var coordinate = viewer.current && viewer.current.blockCoordinate && viewer.current.blockCoordinate(event.clientX, event.clientY);
        if (Number.isFinite(coordinate) && Number.isFinite(start.track)) changeBlock(start.blockZ + coordinate - start.track);
        else setStatus(t('edge_on', 'The rail is edge-on from this viewpoint.'));
        return;
      }
      update(function (next) { next.player = normalizePlayer(Object.assign({}, next.player, { yaw: start.player.yaw + dx * 0.2, pitch: event.pointerType === 'touch' ? start.player.pitch : start.player.pitch - dy * 0.17 })); return next; });
    }
    function pointerEnd(event, cancel) { var start = drag.current; if (!start || start.id !== event.pointerId) return; drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); if (!cancel && !start.moved && Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 6) pick(event.clientX, event.clientY); }
    function control(command, label, name, fallback, style) { return button(icon(name, fallback), function (event) { if (!event.detail) move(command); }, { 'data-walk-move': command, 'aria-label': t(command, label), title: t(command, label), style: style, onPointerDown: function (event) { if (event.button !== 0) return; event.currentTarget.focus({ preventScroll: true }); stop(); event.currentTarget.setPointerCapture(event.pointerId); move(command); hold.current = setInterval(function () { move(command); }, 120); }, onPointerUp: stop, onPointerCancel: stop, onLostPointerCapture: stop, onBlur: stop }); }
    var fallback = diagram || renderStatus !== 'ready', solved = ACTIVITIES.filter(function (item) { return state.progress[item.id].solved; }).length;
    var readingVisible = meta.id === 'ring' ? reading.ringFacing : meta.id === 'scale' ? reading.scaleFacing && reading.scaleRatio != null : meta.id === 'contour' ? reading.contourFacing : true;
    var markers = [], width = host.current && host.current.clientWidth || 600, height = host.current && host.current.clientHeight || 360;
    layout.filter(function (marker) { return marker.visible; }).sort(function (a, b) { return (a.id === state.activity ? -1 : b.id === state.activity ? 1 : a.distance - b.distance); }).forEach(function (marker) {
      var item = Object.assign({}, marker, { x: Math.max(55, Math.min(width - 55, marker.x * width)), y: Math.max(28, Math.min(height - 62, marker.y * height)) });
      if (!markers.some(function (other) { return Math.abs(other.x - item.x) < 110 && Math.abs(other.y - item.y) < 64; })) markers.push(item);
    });
    return h('section', { ref: root, 'data-perception-walk': true, 'data-theme': ctx.isContrast || ctx.theme === 'contrast' ? 'contrast' : ctx.isDark || ctx.theme === 'dark' ? 'dark' : 'light', 'aria-label': t('title', 'Walk-through perception challenges') },
      h('style', null, CSS),
      h('header', { className: 'pw-header' }, h('div', null, h('div', { className: 'pw-eyebrow' }, t('lab', 'Perception Lab')), h('h2', null, t('title', 'Walk-through challenges'))), h('div', { className: 'pw-actions' }, h('span', { className: 'pw-progress' }, solved + ' / ' + ACTIVITIES.length + ' ' + t('solved_count', 'solved')), button(h(React.Fragment, null, icon('ArrowLeft', '\u2190'), t('back', 'Back to gallery')), function () { stop(); props.onClose(); }, { 'data-walk-close': true }))),
      h('nav', { className: 'pw-nav', 'aria-label': t('activities', 'Challenge spaces') }, ACTIVITIES.map(function (item, index) { return button(h('span', null, h('strong', null, (index + 1) + '. ' + t(item.id + '_title', item.title)), h('small', null, state.progress[item.id].solved ? t('solved_label', 'Solved') : t(item.id + '_principle', item.principle))), function () { choose(item.id); }, { key: item.id, 'data-walk-activity': item.id, 'aria-pressed': state.activity === item.id }); })),
      h('div', { className: 'pw-workspace' }, h('div', { className: 'pw-scene-column' },
        h('div', { className: 'pw-toolbar' }, h('div', { className: 'pw-actions' }, button(icon('MapPin', '+'), home, { className: 'pw-icon', title: t('home', 'Return to challenge start'), 'aria-label': t('home', 'Return to challenge start'), 'data-walk-home': true }), button(icon('Crosshair', '+'), face, { className: 'pw-icon', title: t('face', 'Face exhibit'), 'aria-label': t('face', 'Face exhibit'), 'data-walk-face': true }), button(h(React.Fragment, null, icon('Hand', '+'), t('interact', 'Interact')), interact, { 'data-walk-interact': true, disabled: fallback && state.activity !== 'scale' })), h('label', null, h('input', { type: 'checkbox', checked: diagram, 'data-walk-diagram-toggle': true, onChange: function (event) { stop(); setDiagram(event.target.checked); } }), t('plan', 'Plan view'))),
        h('figure', { className: 'pw-stage', 'aria-label': t(meta.id + '_goal', meta.goal) },
          fallback && h(Plan, { h: h, state: state, reveal: reveal }),
          h('div', { className: 'pw-viewport', ref: host, hidden: fallback, tabIndex: fallback ? -1 : 0, role: 'group', 'aria-label': t('first_person', 'First-person viewpoint'), 'aria-keyshortcuts': 'W A S D ArrowUp ArrowDown ArrowLeft ArrowRight PageUp PageDown E Escape', 'data-walk-stage': true, onKeyDown: keyDown, onPointerDown: pointerDown, onPointerMove: pointerMove, onPointerUp: pointerEnd, onPointerCancel: function (event) { pointerEnd(event, true); }, onLostPointerCapture: function () { drag.current = null; } }),
          !fallback && h('span', { className: 'pw-crosshair', 'aria-hidden': true }),
          !fallback && h('div', { className: 'pw-waypoints', role: 'group', 'aria-label': t('activities', 'Challenge spaces') }, markers.map(function (marker) { var item = activity(marker.id), index = ACTIVITIES.indexOf(item), label = t('visit_' + item.id, 'Visit ' + item.title); return button(h(React.Fragment, null, h('span', { 'aria-hidden': true }, index + 1), h('span', null, t(item.id + '_short', ['Circle', 'Size', 'Screen', 'Depth', 'Corners', 'Context'][index]))), function () { choose(item.id, true); }, { key: item.id, className: 'pw-waypoint', style: { left: marker.x, top: marker.y }, title: label, 'aria-label': label, 'data-walk-waypoint': item.id }); })),
          !diagram && renderStatus !== 'ready' && h('div', { className: 'pw-render-status', role: 'status' }, renderStatus === 'failed' ? t('failed', '3D unavailable. Plan view is active.') : t('loading', 'Opening the walk-through...'), renderStatus === 'failed' && button(t('retry', 'Retry 3D'), function () { setRetry(retry + 1); }, { 'data-walk-retry': true })),
          h('figcaption', null, t(fallback ? meta.id === 'contour' || meta.id === 'context' ? 'front_view' : 'plan' : 'first_person_caption', fallback ? meta.id === 'contour' || meta.id === 'context' ? 'Front view' : 'Plan view' : 'First-person view') + ' / ' + t(meta.id + '_title', meta.title))),
        h('div', { className: 'pw-navigation', role: 'group', 'aria-label': t('movement', 'Movement controls') },
          h('div', { className: 'pw-pad' }, control('forward', 'Move forward', 'ArrowUp', '\u2191', { gridColumn: 2 }), control('left', 'Step left', 'ArrowLeft', '\u2190', { gridColumn: 1, gridRow: 2 }), control('back', 'Move backward', 'ArrowDown', '\u2193', { gridColumn: 2, gridRow: 2 }), control('right', 'Step right', 'ArrowRight', '\u2192', { gridColumn: 3, gridRow: 2 })),
          h('label', { className: 'pw-precision' }, h('input', { type: 'checkbox', checked: state.precise, 'data-walk-precision': true, onChange: function (event) { stop(); var value = event.target.checked; update(function (next) { next.precise = value; return next; }); } }), t('precision', 'Fine movement')),
          h('div', { className: 'pw-look' }, control('turnLeft', 'Turn left', 'RotateCcw', '\u21ba'), control('turnRight', 'Turn right', 'RotateCw', '\u21bb'), control('lookUp', 'Look up', 'ChevronUp', '\u2191'), control('lookDown', 'Look down', 'ChevronDown', '\u2193'))),
        h('p', { className: 'pw-position', 'data-walk-position': true }, 'X ' + state.player.x.toFixed(1) + ' / Z ' + state.player.z.toFixed(1) + ' / ' + t('heading', 'Heading') + ' ' + state.player.yaw.toFixed(0)),
        h('p', { className: 'pw-status', role: 'status', 'aria-live': 'polite', 'data-walk-status': true }, status)),
        h('aside', { className: 'pw-task', 'aria-label': t('challenge', 'Current challenge') },
          h('div', { className: 'pw-principle' }, t(meta.id + '_principle', meta.principle)), h('h3', null, t(meta.id + '_title', meta.title)), h('p', { className: 'pw-goal' }, t(meta.id + '_goal', meta.goal)),
          h('div', { className: 'pw-reading', 'data-walk-evidence': true, 'data-unavailable': !readingVisible }, h('span', null, t(meta.id + '_reading', { ring: 'Arc alignment', scale: 'Teal / coral image height', occlusion: 'Symbols collected', parallax: 'Viewpoints recorded', contour: 'Corners aligned', context: 'Tiles selected' }[meta.id])), h('strong', null, !readingVisible ? t('out_of_view', 'Out of view') : meta.id === 'ring' ? reading.ringAlignment + '%' : meta.id === 'scale' ? reading.scaleRatio.toFixed(2) + ' : 1' : meta.id === 'parallax' ? state.parallax.samples.length + ' / 2' : meta.id === 'contour' ? reading.contourAligned + ' / 4' : meta.id === 'context' ? reading.contextSelected + ' / 2' : reading.collected + ' / 3')),
          meta.id === 'parallax' && h('div', null,
            button(h(React.Fragment, null, icon('Camera', '+'), t('record', 'Record viewpoint')), record, { 'data-walk-record': true, disabled: state.parallax.samples.length >= 2 }),
            state.parallax.samples.length > 0 && h('p', { className: 'pw-baseline', 'data-walk-baseline': true }, t('baseline', 'Sideways separation') + ': ' + Math.abs((state.parallax.samples[1] || state.player).x - state.parallax.samples[0].x).toFixed(1) + ' / 1.2 ' + t('units', 'units')),
            h('div', { className: 'pw-samples' }, state.parallax.samples.map(function (sample, index) { var label = t('viewpoint', 'Viewpoint') + ' ' + (index + 1); return button(h(React.Fragment, null, icon('Eye', '+'), label), function () { revisit(index); }, { key: index, title: label + ' / X ' + sample.x.toFixed(1) + ', Z ' + sample.z.toFixed(1), 'data-walk-view': index }); }))),
          meta.id === 'parallax' && h('fieldset', { className: 'pw-choices' }, h('legend', null, t('nearest', 'Nearest sphere')), ['A', 'B', 'C'].map(function (choice, index) { return h('label', { key: choice }, h('input', { type: 'radio', name: uid + '-sphere', value: choice, checked: state.parallax.choice === choice, 'data-walk-choice': choice, onChange: function () { selectSphere(choice); } }), h('span', { className: 'pw-token-dot', style: { borderRadius: '50%', background: ['#e87967', '#e9b342', '#208e87'][index] }, 'aria-hidden': true }), choice + ' / ' + t('sphere_color_' + choice, ['Coral', 'Gold', 'Teal'][index])); })),
          meta.id === 'contour' && h('div', null,
            h('fieldset', { className: 'pw-choices' }, h('legend', null, t('cutout_piece', 'Cutout piece')), TILE_IDS.map(function (letter, index) { return h('label', { key: letter }, h('input', { type: 'radio', name: uid + '-corner', value: index, checked: state.contour.selected === index, disabled: !canTurnCorner(state, index), 'data-walk-corner': index, onChange: function () { selectCorner(index); } }), t('piece', 'Piece') + ' ' + letter); })),
            h('p', { className: 'pw-reach', 'data-walk-reach': true }, Math.hypot(state.player.x - (36 + (state.contour.selected === 0 || state.contour.selected === 3 ? -1.2 : 1.2)), state.player.z - 0.15).toFixed(1) + ' ' + t('units_away', 'units away') + ' / ' + t('reach', 'Reach') + ' 10.0'),
            h('label', { className: 'pw-slider', htmlFor: uid + '-corner-angle' }, t('piece_angle', 'Piece angle'), h('output', { htmlFor: uid + '-corner-angle' }, state.contour.angles[state.contour.selected].toFixed(0) + '\u00b0'), h('input', { id: uid + '-corner-angle', type: 'range', min: 0, max: 359, step: 1, value: state.contour.angles[state.contour.selected], disabled: !canTurnCorner(state, state.contour.selected), 'data-walk-corner-angle': true, onChange: function (event) { changeCorner(state.contour.selected, Number(event.target.value)); } })),
            h('div', { className: 'pw-actions' }, button(icon('RotateCcw', '\u21ba'), function () { changeCorner(state.contour.selected, state.contour.angles[state.contour.selected] + 45); }, { disabled: !canTurnCorner(state, state.contour.selected), title: t('corner_left', 'Turn piece counterclockwise'), 'aria-label': t('corner_left', 'Turn piece counterclockwise'), 'data-walk-corner-left': true }), button(icon('RotateCw', '\u21bb'), function () { changeCorner(state.contour.selected, state.contour.angles[state.contour.selected] - 45); }, { disabled: !canTurnCorner(state, state.contour.selected), title: t('corner_right', 'Turn piece clockwise'), 'aria-label': t('corner_right', 'Turn piece clockwise'), 'data-walk-corner-right': true }))),
          meta.id === 'contour' && h('fieldset', { className: 'pw-choices' }, h('legend', null, t('empty_shape', 'Shape in the empty center')), ['square', 'circle', 'triangle'].map(function (choice, index) { return h('label', { key: choice }, h('input', { type: 'radio', name: uid + '-contour-choice', value: choice, checked: state.contour.choice === choice, 'data-walk-contour-choice': choice, onChange: function () { update(function (next) { next.contour.choice = choice; return next; }); setStatus(''); } }), t('shape_' + choice, ['Square', 'Circle', 'Triangle'][index])); })),
          meta.id === 'context' && h('label', { className: 'pw-precision' }, h('input', { type: 'checkbox', checked: state.context.neutral, 'data-walk-context-neutral': true, onChange: function (event) { neutralSurround(event.target.checked); } }), t('neutral_surrounds', 'Neutral surrounds')),
          meta.id === 'context' && h('fieldset', { className: 'pw-choices' }, h('legend', null, t('matching_tiles', 'Matching center tiles')), TILE_IDS.map(function (choice) { return h('label', { key: choice }, h('input', { type: 'checkbox', value: choice, checked: state.context.selected.indexOf(choice) >= 0, 'data-walk-context-tile': choice, onChange: function () { selectTile(choice); } }), t('tile', 'Tile') + ' ' + choice); })),
          meta.id === 'scale' && h('div', null, button(h(React.Fragment, null, icon('Hand', '+'), t('select_block', 'Select teal block')), function () { setSelected(true); }, { 'data-walk-select-block': true, disabled: !nearBlock(state), 'aria-pressed': selected, 'aria-describedby': uid + '-reach' }),
            h('p', { id: uid + '-reach', className: 'pw-reach', 'data-walk-reach': true }, Math.hypot(state.player.x - 0.95, state.player.z - state.blockZ).toFixed(1) + ' ' + t('units_away', 'units away') + ' / ' + t('reach', 'Reach') + ' 7.0'),
            h('label', { className: 'pw-slider', htmlFor: uid + '-block' }, t('block_position', 'Block position'), h('output', { htmlFor: uid + '-block' }, state.blockZ.toFixed(1)), h('input', { id: uid + '-block', type: 'range', min: -1, max: 6, step: 0.1, value: state.blockZ, disabled: !selected || !nearBlock(state), 'data-walk-block-z': true, onChange: function (event) { changeBlock(Number(event.target.value)); } })),
            h('div', { className: 'pw-actions' }, button(icon('ArrowUp', '\u2191'), function () { changeBlock(state.blockZ - 0.3); }, { disabled: !selected || !nearBlock(state), title: t('push', 'Slide block farther'), 'aria-label': t('push', 'Slide block farther'), 'data-walk-push': true }), button(icon('ArrowDown', '\u2193'), function () { changeBlock(state.blockZ + 0.3); }, { disabled: !selected || !nearBlock(state), title: t('pull', 'Slide block nearer'), 'aria-label': t('pull', 'Slide block nearer'), 'data-walk-pull': true }))),
          meta.id === 'occlusion' && h('div', { className: 'pw-tokens', role: 'group', 'aria-label': t('symbols', 'Hidden symbols') }, [0, 1, 2].map(function (id) { var found = state.collected.indexOf(id) >= 0, visible = canCollect(state, id); return button(h(React.Fragment, null, h('span', { className: 'pw-token-dot', style: { background: ['#e9b342', '#208e87', '#e87967'][id] }, 'aria-hidden': true }), t('symbol_' + id, ['Ring', 'Diamond', 'Cross'][id]) + ': ' + t(found ? 'found' : visible ? 'collect' : 'hidden_label', found ? 'Found' : visible ? 'Collect' : 'Hidden')), function () { collect(id); }, { key: id, disabled: found || !visible, 'data-walk-token': id }); })),
          h('div', { className: 'pw-actions' }, button(t('check', 'Check challenge'), check, { className: 'pw-primary', 'data-walk-check': true }), button(icon('RotateCcw', '\u21ba'), reset, { className: 'pw-icon', 'data-walk-reset': true, title: t('reset', 'Reset this challenge'), 'aria-label': t('reset', 'Reset this challenge') })),
          h('div', { className: 'pw-hints' }, button(h(React.Fragment, null, icon('Lightbulb', '?'), t(progress.hints ? 'another_hint' : 'hint', progress.hints ? 'Another hint' : 'Hint')), hint, { 'data-walk-hint': true, disabled: progress.hints >= meta.hints.length, 'aria-controls': uid + '-hints' }), h('div', { id: uid + '-hints', 'data-walk-hints': true, 'aria-live': 'polite' }, progress.hints > 0 && h('ol', null, meta.hints.slice(0, progress.hints).map(function (text, index) { return h('li', { key: index }, t(meta.id + '_hint_' + index, text)); })))),
          button(t('reveal', 'Reveal principle'), revealPrinciple, { 'data-walk-reveal': true, 'aria-pressed': reveal }), reveal && h('p', { className: 'pw-explanation', 'data-walk-explanation': true }, t(meta.id + '_explanation', meta.explanation)),
          h('label', { className: 'pw-note', htmlFor: uid + '-note' }, t('note', 'Your observation'), h('textarea', { id: uid + '-note', maxLength: 600, value: state.notes[meta.id], 'data-walk-note': true, onChange: function (event) { var value = event.target.value; update(function (next) { next.notes[next.activity] = value; return next; }); } })))));
  }
  Lab.PerceptionWalk = { Component: Walk, normalize: normalize, normalizePlayer: normalizePlayer, movePlayer: movePlayer, moveBlock: moveBlock, faceExhibit: faceExhibit, recordView: recordView, turnCorner: turnCorner, toggleTile: toggleTile, evidence: evidence, checkAnswer: checkAnswer, canCollect: canCollect, spawn: spawn, activities: ACTIVITIES };
}());
