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
    { id: 'context', title: 'The gray room', principle: 'Brightness & surrounding context', goal: 'Find the two center tiles with the same rendered gray. Compare them with and without their surrounds.', hints: ['A light or dark surround can change how bright a center tile appears.', 'Compare the tiles against a common neutral surround. Their rendered gray stays fixed when the surrounds change.'], explanation: 'A and C use the same gray. Their different surrounds can make them appear different in brightness. Changing the surround changes the context, while the center tiles themselves remain unchanged.' },
    { id: 'continuity', title: 'The hidden line', principle: 'Occlusion & perceived alignment', goal: 'From the marked viewpoint, move the right rod until both fragments follow the same straight line behind the screen.', hints: ['Imagine the direction of the left rod continuing behind the screen. Compare that direction with the right rod.', 'Inspect from another position, then return to the marked viewpoint. Small height changes can make a large difference to the apparent join.'], explanation: 'An intervening screen can make aligned diagonal fragments appear displaced, as in the Poggendorff illusion. The reveal removes the screen and adds a straight guide from the fixed rod. Your impression may differ from the geometric alignment; this is an exploration, not a vision test.' },
    { id: 'shadow', title: 'The shadow workshop', principle: 'Depth & projected shape', goal: 'Rotate the sculpture until its dark wall silhouette matches the coral outline. Check your match from the marked observation area.', hints: ['Watch each level of the shadow while turning the sculpture. A small change can expose blocks that were hidden behind others.', 'Compare the narrow top and the wider lower levels. Walking around the sculpture can help you understand which blocks create each edge.'], explanation: 'Parallel light paths project the sculpture onto a flat wall. Blocks at different depths can overlap in the shadow, so one silhouette cannot show every part of the solid. The reveal traces the light paths and shows a wireframe orientation that matches the outline.' },
    { id: 'change', title: 'The change room', principle: 'Attention & change detection', goal: 'Compare both arrangements through the shutter, then identify the object that changed. Solve all three scenes.', hints: ['Compare one object at a time across the two arrangements. Its color may stay the same while another property changes.', 'Inspect position, height, and orientation. Keeping the same viewpoint can make comparisons easier.'], explanation: 'A visual interruption can make a change harder to notice. Comparing the same object across views directs attention to its properties. The outline shows its other arrangement. This untimed exploration is not a test of your attention or vision.' },
    { id: 'rotation', title: 'The rotation studio', principle: 'Mental rotation & mirror images', goal: 'Turn and tilt sculptures A and B. Find the one with the same three-dimensional shape as reference R, then solve the second pair.', hints: ['Follow the chain of blocks from one end to the other. Compare how the bends turn in depth.', 'Try matching the reference orientation. A mirror image can share a silhouette from one view without being the same solid.'], explanation: 'Turning a solid changes its viewpoint but preserves its handedness. Each pair contains one rotated copy of R and one mirror image that cannot be made identical by rotation. The gold ring marks the copy; its wireframe shows the reference orientation.' }
  ];
  ACTIVITIES.push({ id: 'relief', title: 'Light and form', principle: 'Shape from shading', goal: 'Change the lighting above and below the surfaces. Find the hollow surface, then solve the second pair.', hints: ['A bright edge can come from the lighting direction, not just the shape. Compare the same surface under opposite lights.', 'Inspect a surface from the side. Its center stays raised or recessed even when the shading reverses.'], explanation: 'Shading depends on both surface shape and light direction. Expectations about lighting can influence whether a surface looks raised or hollow, but other visual cues also matter. Moving sideways exposes the actual depth; changing the light leaves that depth unchanged. The gold profile compares each surface with its flat rim.' });
  ACTIVITIES.push({ id: 'shape', title: 'The shape studio', principle: 'Shape constancy & slant', goal: 'Turn, tilt, and inspect both hoops. Find the true circle, then solve the second pair.', hints: ['A circle can make an oval image when viewed at a slant. The image alone does not tell you the physical shape.', 'Compare each hoop from several directions. Turning changes its projection, but not the lengths of its two principal diameters.'], explanation: 'A slanted circle projects an oval image, even though the hoop remains circular. An oval can also look rounder from some viewpoints. Shape constancy concerns recognizing a stable physical shape across these changing views. The colored diameter guides have equal lengths only on the circular hoop.' });
  ACTIVITIES.push({ id: 'motion', title: 'Moving together', principle: 'Common fate & visual grouping', goal: 'Compare the moving spheres. Select the three that travel together, then solve the second pattern.', hints: ['Compare how the gaps between spheres change as the motion advances. Nearby spheres do not necessarily belong together.', 'The matching three share the same displacement at every moment. Compare at least three separated phases of the motion.'], explanation: 'Elements with shared motion can appear to belong to one group, a cue called common fate. The matching spheres keep the same spacing in three-dimensional space while traveling together. Their color and size do not identify the group. The reveal connects the matching spheres and traces their displacement from the starting positions.' });
  ACTIVITIES.push({ id: 'frame', title: 'The tilted room', principle: 'Orientation & visual reference', goal: 'Align the rod vertically, then horizontally. Compare it with and without the tilted frame in each trial.', hints: ['A tilted surround can change what looks upright. Compare the rod with the frame hidden, without turning the rod.', 'Use the room as a second reference. In the first trial the rod should be vertical; in the second it should be parallel to the floor.'], explanation: 'A tilted frame can influence perceived orientation, a phenomenon called the rod-and-frame illusion. Turning or hiding the surround leaves the rod unchanged. The reveal adds world-space vertical and horizontal references. The effect can vary with the available visual cues; this exploration is not a vision test.' });
  ACTIVITIES.push({ id: 'weave', title: 'Crossing paths', principle: 'Occlusion & relative depth', goal: 'Move the three beams to match the crossing order. Record front and side observations of each finished arrangement, then solve the second pattern.', hints: ['At a crossing, the nearer beam hides part of the farther one. Follow each beam away from the crossing to identify it.', 'Inspect from the side to compare the gaps between beams. Moving a beam changes the arrangement, so record both views again after adjusting it.'], explanation: 'Occlusion provides a relative-depth cue: the nearer beam interrupts the visible contour of the farther beam. A front view can hide how far apart the beams are. Moving sideways reveals their separation. The reveal traces their depths along the floor. Many arrangements work; the order and clear separation matter, not one exact position.' });
  ACTIVITIES.push({ id: 'landing', title: 'Shadow landing', principle: 'Cast shadows & height', goal: 'Lift the three spheres until their shadows cover the floor targets, then solve the second lighting arrangement.', hints: ['Light travels downward to the floor. Raising a sphere shifts its shadow farther from the point directly beneath it.', 'Inspect from the side to compare the sphere and its shadow. A different lighting direction changes where the shadow falls, even if the sphere stays still.'], explanation: 'A cast shadow connects an object with the surface receiving it. Here, parallel light rays project each sphere onto a flat floor. Raising a sphere moves its shadow along the floor without changing the shadow size. Rotating the light here swings the shadows and targets around their spheres without changing sphere heights or shadow size. The reveal traces the light paths and marks the target heights.' });
  ACTIVITIES.push({ id: 'aperture', title: 'The aperture room', principle: 'Motion & restricted views', goal: 'Compare the moving rod through the window and with the screen open. Identify its actual motion axis in both trials.', hints: ['A short section of a moving line does not reveal every part of its motion. Compare several positions with the screen closed and open.', 'Follow an endpoint when the screen is open. Does it travel side to side or up and down?'], explanation: 'Through a small opening, different motions of a diagonal line can produce the same visible change. This ambiguity is called the aperture problem. These two rods follow different motion axes, but their central line occupies the same positions at matching phases. Opening the screen exposes endpoints that distinguish their paths. The reveal traces the actual motion axis.' });
  var CORNER_TARGETS = [315, 225, 135, 45], CORNER_DEFAULTS = [90, 0, 270, 180], TILE_IDS = ['A', 'B', 'C', 'D'];
  ACTIVITIES.push({ id: 'length', title: 'The length studio', principle: 'Length & surrounding context', goal: 'Match the lower teal shaft to the upper coral shaft in physical length. Compare the current match with the fins shown and hidden, then solve the second arrangement.', hints: ['Compare the straight shafts between their endpoints, not the total width including the fins.', 'Hide the fins without changing the shaft. A straight-ahead viewpoint can help you compare the endpoints.'], explanation: 'Endpoint fins can change how long a shaft appears, a pattern known as the Muller-Lyer illusion. Here, showing or hiding the fins leaves both shaft lengths unchanged. The second trial reverses the fin directions. Gold guides mark the reference endpoints. Your impression may vary; this is an exploration, not a vision test.' });
  var SHADOW_CELLS = [[-1, 0, 0], [0, 0, 0], [1, 0, 0], [-1, 1, 0], [0, 1, 0], [1, 1, 0], [0, 1, -1], [0, 1, -2], [-1, 2, 0], [0, 2, 0], [0, 2, -1], [-1, 3, 0]];
  var ROTATION_CELLS = [[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0], [2, 1, 1], [2, 1, 2]];
  function object(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
  function number(value, fallback, min, max) { var n = typeof value === 'number' || typeof value === 'string' && value.trim() ? Number(value) : NaN; return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback; }
  function activity(id) { return ACTIVITIES.find(function (item) { return item.id === id; }) || ACTIVITIES[0]; }
  function nextRoom(raw, direction, unsolved) {
    var state = normalize(raw), index = ACTIVITIES.indexOf(activity(state.activity)), step = direction < 0 ? -1 : 1;
    for (var distance = 1; distance < ACTIVITIES.length; distance++) {
      var candidate = index + step * distance;
      if (!unsolved) return candidate >= 0 && candidate < ACTIVITIES.length ? ACTIVITIES[candidate].id : null;
      var id = ACTIVITIES[(candidate + ACTIVITIES.length) % ACTIVITIES.length].id;
      if (!state.progress[id].solved) return id;
    }
    return null;
  }
  function spawn(id) { return id === 'length' ? { x: 192, z: 10, yaw: 0, pitch: 0 } : id === 'aperture' ? { x: 180, z: 11, yaw: 0, pitch: 0 } : id === 'landing' ? { x: 168, z: 12, yaw: 0, pitch: 0 } : id === 'weave' ? { x: 156, z: 9, yaw: 0, pitch: 0 } : id === 'frame' ? { x: 144, z: 9, yaw: 0, pitch: 0 } : id === 'motion' ? { x: 132, z: 9, yaw: 0, pitch: 0 } : id === 'shape' ? { x: 120, z: 9, yaw: 0, pitch: 0 } : id === 'relief' ? { x: 108, z: 9, yaw: 0, pitch: 0 } : id === 'rotation' ? { x: 96, z: 9, yaw: 0, pitch: 0 } : id === 'change' ? { x: 84, z: 9, yaw: 0, pitch: 0 } : id === 'shadow' ? { x: 72, z: 9, yaw: 0, pitch: 0 } : id === 'continuity' ? { x: 60, z: 9, yaw: 0, pitch: 0 } : id === 'contour' ? { x: 36, z: 6.5, yaw: 0, pitch: 0 } : id === 'context' ? { x: 48, z: 7, yaw: 0, pitch: 0 } : id === 'parallax' ? { x: 24, z: 9, yaw: 0, pitch: 0 } : id === 'scale' ? { x: 0, z: 9, yaw: 0, pitch: 0 } : id === 'occlusion' ? { x: 12, z: 8, yaw: 0, pitch: 0 } : { x: -15, z: 10, yaw: 15, pitch: 0 }; }
  function normalizePlayer(raw) {
    var p = object(raw), start = spawn('ring');
    return { x: number(p.x, start.x, -19.3, 199.3), z: number(p.z, start.z, -7.3, 13.3), yaw: ((number(p.yaw, start.yaw, -100000, 100000) + 180) % 360 + 360) % 360 - 180, pitch: number(p.pitch, 0, -45, 45) };
  }
  function angle(value, fallback) { return ((number(value, fallback, -100000, 100000) % 360) + 360) % 360; }
  function normalizeViewpoint(raw, id) {
    var data = object(raw), p = {};
    ['x', 'z', 'yaw', 'pitch'].forEach(function (key) { p[key] = number(data[key], NaN, -Infinity, Infinity); });
    // Keep bookmarks made beside the former end wall before the length studio opened.
    var legacyApertureEdge = id === 'aperture' && p.x > 186 && p.x <= 187.3;
    if (!Object.keys(p).every(function (key) { return Number.isFinite(p[key]); }) || p.x < -19.3 || p.x > 199.3 || p.z < -7.3 || p.z > 13.3 || Math.abs(p.pitch) > 45 || roomAtX(p.x) !== id && !legacyApertureEdge) return null;
    return normalizePlayer(p);
  }
  function sameViewpoint(a, b) { return !!a && !!b && ['x', 'z', 'yaw', 'pitch'].every(function (key) { return Math.abs(a[key] - b[key]) < 1e-6; }); }
  function viewpointLocked(state) { return state.activity === 'change' && state.change.closed; }
  function canSaveViewpoint(raw) { var state = normalize(raw); return !viewpointLocked(state) && roomAtX(state.player.x) === state.activity; }
  function saveViewpoint(raw, slot) {
    var state = normalize(raw);
    if (['A', 'B'].indexOf(slot) >= 0 && !viewpointLocked(state) && roomAtX(state.player.x) === state.activity) state.viewpoints[state.activity][slot] = Object.assign({}, state.player);
    return state;
  }
  function recallViewpoint(raw, slot) {
    var state = normalize(raw), pose = ['A', 'B'].indexOf(slot) >= 0 && state.viewpoints[state.activity][slot];
    // The size workshop's movable block may now occupy the original camera position.
    if (pose && !viewpointLocked(state)) state.player = safePlayer(pose, state.blockZ);
    return state;
  }
  function clearViewpoint(raw, slot) {
    var state = normalize(raw);
    if (['A', 'B'].indexOf(slot) >= 0 && !viewpointLocked(state)) state.viewpoints[state.activity][slot] = null;
    return state;
  }
  function roomAtX(x) {
    if (x < -6) return 'ring';
    for (var i = 1; i < ACTIVITIES.length - 1; i++) if (x <= (i - 1) * 12 + 6) return ACTIVITIES[i].id;
    return ACTIVITIES[ACTIVITIES.length - 1].id;
  }
  function observationArea(p) { return p.x >= 22.8 - 1e-8 && p.x <= 25.4 + 1e-8 && p.z >= 8.5 - 1e-8 && p.z <= 11 + 1e-8; }
  function separateViews(a, b) { return Math.abs(a.x - b.x) >= 1.2 - 1e-8 && Math.abs(a.z - b.z) <= 0.25 + 1e-8; }
  function normalize(raw) {
    var data = object(raw), progress = object(data.progress), notes = object(data.notes), contour = object(data.contour), context = object(data.context), change = object(data.change), rotation = object(data.rotation), result = {
      activity: activity(data.activity).id, player: normalizePlayer(data.player), blockZ: number(data.blockZ, -1, -1, 6), continuityOffset: number(data.continuityOffset, 0.8, -1.2, 1.2), shadowAngle: angle(data.shadowAngle, 0),
      collected: Array.isArray(data.collected) ? [0, 1, 2].filter(function (id) { return data.collected.indexOf(id) >= 0; }) : [], precise: data.precise === true, parallax: { samples: [], choice: '' },
      contour: { angles: CORNER_DEFAULTS.map(function (value, index) { return angle(Array.isArray(contour.angles) ? contour.angles[index] : undefined, value); }), selected: Math.floor(number(contour.selected, 0, 0, 3)), choice: ['square', 'circle', 'triangle'].indexOf(contour.choice) >= 0 ? contour.choice : '' },
      context: { selected: Array.isArray(context.selected) ? context.selected.filter(function (value, index, all) { return TILE_IDS.indexOf(value) >= 0 && all.indexOf(value) === index; }).slice(0, 2) : [], neutral: context.neutral === true },
      change: { round: Math.floor(number(change.round, 0, 0, 2)), variant: change.variant === 1 ? 1 : 0, closed: change.closed === true, seen: Math.floor(number(change.seen, 1, 1, 3)), selected: ['A', 'B', 'C', 'D', 'E'].indexOf(change.selected) >= 0 ? change.selected : '', completed: Array.isArray(change.completed) ? [0, 1, 2].filter(function (id) { return change.completed.indexOf(id) >= 0; }) : [] },
      rotation: { round: Math.floor(number(rotation.round, 0, 0, 1)), angles: [125, 225].map(function (v, i) { return angle(Array.isArray(rotation.angles) ? rotation.angles[i] : undefined, v); }), tilts: [20, -25].map(function (v, i) { return number(Array.isArray(rotation.tilts) ? rotation.tilts[i] : undefined, v, -75, 75); }), selected: Math.floor(number(rotation.selected, 0, 0, 1)), choice: ['A', 'B'].indexOf(rotation.choice) >= 0 ? rotation.choice : '', completed: Array.isArray(rotation.completed) ? [0, 1].filter(function (id) { return rotation.completed.indexOf(id) >= 0; }) : [] }, progress: {}, notes: {}
    };
    var savedViews = object(data.viewpoints);
    result.viewpoints = {};
    ACTIVITIES.forEach(function (item) { var views = object(savedViews[item.id]); result.viewpoints[item.id] = { A: normalizeViewpoint(views.A, item.id), B: normalizeViewpoint(views.B, item.id) }; });
    var length = object(data.length), lengthRound = Math.floor(number(length.round, 0, 0, 1));
    result.length = { round: lengthRound, value: number(length.value, lengthDefaults(lengthRound).value, 1.8, 4.2), visible: length.visible !== false, seen: Math.floor(number(length.seen, length.visible === false ? 2 : 1, 0, 3)), completed: Array.isArray(length.completed) ? [0, 1].filter(function (id) { return length.completed.indexOf(id) >= 0; }) : [] };
    result.length.seen |= result.length.visible ? 1 : 2;
    var aperture = object(data.aperture);
    result.aperture = { round: Math.floor(number(aperture.round, 0, 0, 1)), phase: angle(aperture.phase, 0), speed: number(aperture.speed, 1, 0.25, 2), masked: aperture.masked !== false, seenMasked: Math.floor(number(aperture.seenMasked, 2, 0, 7)), seenOpen: Math.floor(number(aperture.seenOpen, 0, 0, 7)), choice: ['horizontal', 'vertical'].indexOf(aperture.choice) >= 0 ? aperture.choice : '', completed: Array.isArray(aperture.completed) ? [0, 1].filter(function (id) { return aperture.completed.indexOf(id) >= 0; }) : [] };
    var relief = object(data.relief);
    var landing = object(data.landing), landingRound = Math.floor(number(landing.round, 0, 0, 1)), landingStart = landingDefaults(landingRound);
    result.landing = { round: landingRound, lightAngle: number(landing.lightAngle, 0, -25, 25), heights: landingStart.heights.map(function (value, i) { return number(Array.isArray(landing.heights) ? landing.heights[i] : undefined, value, 0.55, 3.2); }), selected: Math.floor(number(landing.selected, 0, 0, 2)), completed: Array.isArray(landing.completed) ? [0, 1].filter(function (id) { return landing.completed.indexOf(id) >= 0; }) : [] };
    var weave = object(data.weave), weaveRound = Math.floor(number(weave.round, 0, 0, 1)), weaveStart = weaveDefaults(weaveRound);
    result.weave = { round: weaveRound, depths: weaveStart.depths.map(function (value, i) { return number(Array.isArray(weave.depths) ? weave.depths[i] : undefined, value, -1.5, 1.5); }), selected: Math.floor(number(weave.selected, 0, 0, 2)), seen: Math.floor(number(weave.seen, 0, 0, 3)), completed: Array.isArray(weave.completed) ? [0, 1].filter(function (id) { return weave.completed.indexOf(id) >= 0; }) : [] };
    var frame = object(data.frame), frameRound = Math.floor(number(frame.round, 0, 0, 1)), frameStart = frameDefaults(frameRound);
    result.frame = { round: frameRound, adjustment: number(frame.adjustment, 0, -45, 45), surround: number(frame.surround, frameStart.surround, -30, 30), visible: frame.visible !== false, seen: Math.floor(number(frame.seen, 1, 1, 3)), completed: Array.isArray(frame.completed) ? [0, 1].filter(function (id) { return frame.completed.indexOf(id) >= 0; }) : [] };
    result.frame.seen |= result.frame.visible ? 1 : 2;
    var motion = object(data.motion);
    result.motion = { round: Math.floor(number(motion.round, 0, 0, 1)), phase: angle(motion.phase, 0), seen: Math.floor(number(motion.seen, 1, 1, 15)), selected: Array.isArray(motion.selected) ? motion.selected.filter(function (value, index, all) { return ['A', 'B', 'C', 'D', 'E', 'F'].indexOf(value) >= 0 && all.indexOf(value) === index; }).slice(0, 3) : [], completed: Array.isArray(motion.completed) ? [0, 1].filter(function (id) { return motion.completed.indexOf(id) >= 0; }) : [] };
    var shape = object(data.shape), shapeRound = Math.floor(number(shape.round, 0, 0, 1)), shapeStart = shapeDefaults(shapeRound);
    result.shape = { round: shapeRound, angles: shapeStart.angles.map(function (value, i) { return angle(Array.isArray(shape.angles) ? shape.angles[i] : undefined, value); }), tilts: shapeStart.tilts.map(function (value, i) { return number(Array.isArray(shape.tilts) ? shape.tilts[i] : undefined, value, -75, 75); }), selected: Math.floor(number(shape.selected, 0, 0, 1)), choice: ['A', 'B'].indexOf(shape.choice) >= 0 ? shape.choice : '', completed: Array.isArray(shape.completed) ? [0, 1].filter(function (id) { return shape.completed.indexOf(id) >= 0; }) : [] };
    result.relief = { round: Math.floor(number(relief.round, 0, 0, 1)), lightAngle: angle(relief.lightAngle, 0), seen: Math.floor(number(relief.seen, 1, 1, 3)), choice: ['A', 'B'].indexOf(relief.choice) >= 0 ? relief.choice : '', completed: Array.isArray(relief.completed) ? [0, 1].filter(function (id) { return relief.completed.indexOf(id) >= 0; }) : [] };
    var parallax = object(data.parallax);
    result.parallax.choice = ['A', 'B', 'C'].indexOf(parallax.choice) >= 0 ? parallax.choice : '';
    if (Array.isArray(parallax.samples)) parallax.samples.slice(0, 2).forEach(function (raw) {
      var sample = object(raw), p = { x: number(sample.x, NaN, -Infinity, Infinity), z: number(sample.z, NaN, -Infinity, Infinity), yaw: 0, pitch: 0 };
      if (observationArea(p) && (!result.parallax.samples.length || separateViews(result.parallax.samples[0], p))) result.parallax.samples.push(p);
    });
    ACTIVITIES.forEach(function (item) { var p = object(progress[item.id]); result.progress[item.id] = { solved: p.solved === true, assisted: p.assisted === true, hints: Math.floor(number(p.hints, 0, 0, 2)) }; result.notes[item.id] = typeof notes[item.id] === 'string' ? notes[item.id].slice(0, 600) : ''; });
    result.change.seen |= 1 << result.change.variant;
    result.progress.change.solved = result.change.completed.length === 3 && !result.progress.change.assisted;
    result.progress.rotation.solved = result.rotation.completed.length === 2 && !result.progress.rotation.assisted;
    result.progress.relief.solved = result.relief.completed.length === 2 && !result.progress.relief.assisted;
    result.progress.shape.solved = result.shape.completed.length === 2 && !result.progress.shape.assisted;
    result.progress.motion.solved = result.motion.completed.length === 2 && !result.progress.motion.assisted;
    result.progress.frame.solved = result.frame.completed.length === 2 && !result.progress.frame.assisted;
    result.progress.weave.solved = result.weave.completed.length === 2 && !result.progress.weave.assisted;
    result.progress.aperture.solved = result.aperture.completed.length === 2 && !result.progress.aperture.assisted;
    result.progress.length.solved = result.length.completed.length === 2 && !result.progress.length.assisted;
    result.progress.landing.solved = result.landing.completed.length === 2 && !result.progress.landing.assisted;
    result.player = safePlayer(result.player, result.blockZ);
    return result;
  }
  function obstacles(blockZ) { return [[9.65, 14.35, 1.45, 2.55], [-1.8, -0.1, -3.65, -2.35], [0.35, 1.55, blockZ - 0.6, blockZ + 0.6], [21.54, 23.26, 0.14, 1.86], [22.86, 25.14, -4.14, -1.86], [25.15, 26.45, 3.35, 4.65], [32.75, 39.25, -0.65, 0.35], [45.3, 50.7, -0.4, 0.4], [46.15, 46.85, 3.65, 4.35], [56.85, 63.15, -0.5, 0.6], [67.9, 72.1, -1.1, 3.1], [67.7, 77.3, -4.55, -3.7], [79.8, 88.2, -1.4, 2.6], [78.7, 89.3, -4.85, -4.15], [90.85, 94.15, -1.65, 1.65], [94.35, 97.65, -1.65, 1.65], [97.85, 101.15, -1.65, 1.65], [90.4, 101.6, -4.85, -4.15], [104.05, 107.95, -1.4, 1.1], [108.05, 111.95, -1.4, 1.1], [116.25, 119.75, -1.75, 1.75], [120.25, 123.75, -1.75, 1.75], [127.8, 136.2, -2.35, 1.25], [140.9, 147.1, -0.8, 0.65], [152.5, 159.5, -2, 2], [164, 172, -1.5, 1.5], [175.8, 184.2, -0.4, 1], [187.75, 196.25, -0.2, 0.55]]; }
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
    var state = normalize(raw), x = state.activity === 'length' ? 192 : state.activity === 'aperture' ? 180 : state.activity === 'landing' ? 168 : state.activity === 'weave' ? 156 : state.activity === 'frame' ? 144 : state.activity === 'motion' ? 132 : state.activity === 'shape' ? 120 : state.activity === 'relief' ? 108 : state.activity === 'rotation' ? 96 : state.activity === 'change' ? 84 : state.activity === 'ring' ? -12 : state.activity === 'scale' ? 0 : state.activity === 'parallax' ? 24 : state.activity === 'contour' ? 36 : state.activity === 'context' ? 48 : state.activity === 'continuity' ? 60 : state.activity === 'shadow' ? 72.5 : 12;
    if (state.activity === 'parallax') return Object.assign({}, state.player, { yaw: 0, pitch: 0 });
    var z = state.activity === 'shadow' ? -4 : state.activity === 'length' || state.activity === 'aperture' || state.activity === 'landing' || state.activity === 'weave' || state.activity === 'frame' || state.activity === 'motion' || state.activity === 'shape' || state.activity === 'relief' || state.activity === 'rotation' || state.activity === 'change' || state.activity === 'ring' || state.activity === 'contour' || state.activity === 'context' || state.activity === 'continuity' ? 0 : state.activity === 'scale' ? (state.blockZ - 3) / 2 : -1.5;
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
  function canMoveContinuation(raw) { var state = normalize(raw), p = state.player; return state.activity === 'continuity' && p.z >= 0.6 && Math.hypot(p.x - 61.7, p.z, 2.995 + state.continuityOffset - 1.65) <= 12 + 1e-8; }
  function moveContinuation(raw, value) { var state = normalize(raw), offset = state.continuityOffset; if (canMoveContinuation(state)) { state.continuityOffset = number(value, offset, -1.2, 1.2); if (!canMoveContinuation(state)) state.continuityOffset = offset; } return state; }
  function shadowGeometry(value) {
    var rotation = angle(value, 0), radians = rotation * Math.PI / 180, c = Math.cos(radians), s = Math.sin(radians);
    var width = 0.7 * (Math.abs(c - 0.5 * s) + Math.abs(s + 0.5 * c));
    return SHADOW_CELLS.map(function (cell, index) {
      var x = 70 + 0.7 * (c * cell[0] + s * cell[2]), z = 1 + 0.7 * (-s * cell[0] + c * cell[2]);
      return { id: 'shadow-block-' + index, x: x, y: 0.75 + cell[1] * 0.7, z: z, size: 0.7, angle: rotation, row: cell[1], projectedX: x + 0.5 * (z + 4), projectedWidth: width };
    });
  }
  function shadowProfile(value) {
    var blocks = shadowGeometry(value);
    // Each connected row projects to a continuous interval under parallel light.
    return [0, 1, 2, 3].map(function (row) {
      var pieces = blocks.filter(function (block) { return block.row === row; });
      return { y: 0.75 + row * 0.7, left: Math.min.apply(null, pieces.map(function (block) { return block.projectedX - block.projectedWidth / 2; })), right: Math.max.apply(null, pieces.map(function (block) { return block.projectedX + block.projectedWidth / 2; })) };
    });
  }
  function shadowOutline(rows) {
    var points = [];
    rows.forEach(function (row) { points.push({ x: row.left, y: row.y - 0.35 }, { x: row.left, y: row.y + 0.35 }); });
    rows.slice().reverse().forEach(function (row) { points.push({ x: row.right, y: row.y + 0.35 }, { x: row.right, y: row.y - 0.35 }); });
    return points;
  }
  function canRotateShadow(raw) { var state = normalize(raw), p = state.player; return state.activity === 'shadow' && p.z >= 3.1 && Math.hypot(p.x - 70, p.z - 1, 0.15) <= 12 + 1e-8; }
  function rotateShadow(raw, value) { var state = normalize(raw); if (canRotateShadow(state)) state.shadowAngle = angle(value, state.shadowAngle); return state; }
  function changeTarget(round) { return ['B', 'D', 'A'][Math.floor(number(round, 0, 0, 2))]; }
  function changeObjects(round, variant) {
    var objects = [
      { choice: 'A', x: 80.6, z: 0, width: 1.1, height: 1.4, depth: 0.5, color: 0xe87967, shape: 'box' },
      { choice: 'B', x: 82.3, z: 1.2, width: 1.1, height: 1.1, depth: 1.1, color: 0xe9b342, shape: 'sphere' },
      { choice: 'C', x: 84, z: -0.2, width: 0.8, height: 1.8, depth: 0.8, color: 0x208e87, shape: 'cylinder' },
      { choice: 'D', x: 85.7, z: 0.8, width: 1.15, height: 1, depth: 0.8, color: 0x477cbe, shape: 'box' },
      { choice: 'E', x: 87.4, z: 0, width: 1, height: 1.4, depth: 1, color: 0x95668f, shape: 'cylinder' }
    ];
    return objects.map(function (item) {
      item.id = 'change-' + item.choice; item.rotation = 0;
      if (variant === 1 && item.choice === changeTarget(round)) {
        if (item.choice === 'B') item.z = -0.3;
        if (item.choice === 'D') item.height = 1.8;
        if (item.choice === 'A') item.rotation = 65;
      }
      item.y = 0.9 + item.height / 2; return item;
    });
  }
  function canObserveChange(raw) { var state = normalize(raw), p = state.player; return state.activity === 'change' && p.x >= 80 && p.x <= 88 && p.z >= 4 && p.z <= 12 && facing(p, 84, 0); }
  function toggleChangeShutter(raw) {
    var state = normalize(raw), c = state.change;
    if (c.closed && !canObserveChange(state)) { c.closed = false; return state; }
    if (!canObserveChange(state)) return state;
    if (c.closed) { c.variant = 1 - c.variant; c.seen |= 1 << c.variant; }
    c.closed = !c.closed; return state;
  }
  function selectChange(raw, choice) { var state = normalize(raw); if (!state.change.closed && canObserveChange(state) && ['A', 'B', 'C', 'D', 'E'].indexOf(choice) >= 0) state.change.selected = choice; return state; }
  function changeMatches(raw) { var state = normalize(raw), c = state.change; return !c.closed && c.seen === 3 && c.selected === changeTarget(c.round) && canObserveChange(state); }
  function checkChange(raw) {
    var state = normalize(raw), c = state.change;
    if (changeMatches(state) && !state.progress.change.assisted && c.completed.indexOf(c.round) < 0) c.completed.push(c.round);
    state.progress.change.solved = c.completed.length === 3 && !state.progress.change.assisted;
    return state;
  }
  function nextChange(raw) {
    var state = normalize(raw), c = state.change;
    if (state.activity !== 'change' || c.completed.indexOf(c.round) < 0 && !state.progress.change.assisted) return state;
    state.change = { round: (c.round + 1) % 3, variant: 0, closed: false, seen: 1, selected: '', completed: c.completed.slice() }; return state;
  }
  function rotationMatch(round) { return Math.floor(number(round, 0, 0, 1)) === 0 ? 'A' : 'B'; }
  function rotationObjects(round, angles, tilts) {
    var cells = ROTATION_CELLS.slice();
    if (Math.floor(number(round, 0, 0, 1)) === 1) cells.push([0, 0, 1]);
    return ['R', 'A', 'B'].map(function (choice, index) {
      var mirrored = choice !== 'R' && choice !== rotationMatch(round);
      return { id: 'rotation-' + choice, choice: choice, x: 92.5 + index * 3.5, y: 2.1, z: 0,
        yaw: index ? angle(Array.isArray(angles) ? angles[index - 1] : undefined, [125, 225][index - 1]) : -25,
        pitch: index ? number(Array.isArray(tilts) ? tilts[index - 1] : undefined, [20, -25][index - 1], -75, 75) : 15,
        cells: cells.map(function (cell) { return { x: (cell[0] - 1) * 0.64 * (mirrored ? -1 : 1), y: (cell[1] - 0.5) * 0.64, z: (cell[2] - 1) * 0.64, size: 0.58 }; }) };
    });
  }
  function rotationPoint(item, point) {
    var yaw = item.yaw * Math.PI / 180, pitch = item.pitch * Math.PI / 180;
    var y = point.y * Math.cos(pitch) - point.z * Math.sin(pitch), z = point.y * Math.sin(pitch) + point.z * Math.cos(pitch);
    return { x: item.x + point.x * Math.cos(yaw) + z * Math.sin(yaw), y: item.y + y, z: item.z - point.x * Math.sin(yaw) + z * Math.cos(yaw) };
  }
  function canTurnRotation(raw, index) { var state = normalize(raw), p = state.player; return state.activity === 'rotation' && (index === 0 || index === 1) && p.z >= 1.65 && Math.hypot(p.x - (96 + index * 3.5), p.z, 0.45) <= 14 + 1e-8; }
  function turnRotation(raw, index, yaw, pitch) { var state = normalize(raw), r = state.rotation; if (canTurnRotation(state, index)) { r.angles[index] = angle(yaw, r.angles[index]); r.tilts[index] = number(pitch, r.tilts[index], -75, 75); r.selected = index; } return state; }
  function chooseRotation(raw, choice) { var state = normalize(raw), index = ['A', 'B'].indexOf(choice); if (canTurnRotation(state, index)) state.rotation.choice = choice; return state; }
  function rotationMatches(raw) { var state = normalize(raw), p = state.player; return state.activity === 'rotation' && state.rotation.choice === rotationMatch(state.rotation.round) && p.z >= 4 && p.z <= 12 && Math.abs(p.x - 96) <= 4 && facing(p, 96, 0); }
  function checkRotation(raw) { var state = normalize(raw), r = state.rotation; if (rotationMatches(state) && !state.progress.rotation.assisted && r.completed.indexOf(r.round) < 0) r.completed.push(r.round); state.progress.rotation.solved = r.completed.length === 2 && !state.progress.rotation.assisted; return state; }
  function nextRotation(raw) { var state = normalize(raw), r = state.rotation; if (state.activity === 'rotation' && (r.completed.indexOf(r.round) >= 0 || state.progress.rotation.assisted)) state.rotation = { round: 1 - r.round, angles: [125, 225], tilts: [20, -25], selected: 0, choice: '', completed: r.completed.slice() }; return state; }
  function rotationInspectionViews() {
    var views = [];
    ['R', 'A', 'B'].forEach(function (choice, index) {
      ['front', 'left', 'right'].forEach(function (side, sideIndex) {
        var degrees = [0, -30, 30][sideIndex], radians = degrees * Math.PI / 180;
        views.push({ choice: choice, side: side, player: { x: 92.5 + index * 3.5 + Math.sin(radians) * 3.8, z: Math.cos(radians) * 3.8, yaw: degrees ? -degrees : 0, pitch: Math.atan(0.45 / 3.8) * 180 / Math.PI } });
      });
    });
    return views;
  }
  function rotationInspection(raw) {
    var state = normalize(raw);
    if (state.activity !== 'rotation') return null;
    return rotationInspectionViews().find(function (view) { return ['x', 'z', 'yaw', 'pitch'].every(function (key) { return Math.abs(view.player[key] - state.player[key]) < 0.00001; }); }) || null;
  }
  function inspectRotation(raw, choice, side) {
    var state = normalize(raw), view = rotationInspectionViews().find(function (item) { return item.choice === choice && item.side === side; });
    if (state.activity !== 'rotation' || !view) return state;
    state.player = normalizePlayer(view.player);
    if (choice !== 'R') state.rotation.selected = choice === 'A' ? 0 : 1;
    return state;
  }
  function apertureDefaults(round) { return { round: Math.floor(number(round, 0, 0, 1)), phase: 0, speed: 1, masked: true, seenMasked: 2, seenOpen: 0, choice: '', completed: [] }; }
  function lengthDefaults(round) { var r = Math.floor(number(round, 0, 0, 1)); return { round: r, value: r ? 3.8 : 2.2, visible: true, seen: 1, completed: [] }; }
  function lengthObjects(round, value) {
    var r = Math.floor(number(round, 0, 0, 1)), fin = 0.6 / Math.sqrt(2);
    function shaft(size, y, outward) {
      var from = { x: 192 - size / 2, y: y, z: 0.2 }, to = { x: 192 + size / 2, y: y, z: 0.2 }, fins = [];
      [from, to].forEach(function (point, index) { [-1, 1].forEach(function (vertical) { fins.push({ from: Object.assign({}, point), to: { x: point.x + (index ? 1 : -1) * (outward ? 1 : -1) * fin, y: point.y + vertical * fin, z: point.z } }); }); });
      return { from: from, to: to, center: { x: 192, y: y, z: 0.2 }, length: size, fins: fins };
    }
    return { reference: shaft(3, 3.3, r === 0), adjustable: shaft(number(value, lengthDefaults(r).value, 1.8, 4.2), 1.35, r === 1), toggle: { x: 188.5, y: 1.1, z: 2.2 } };
  }
  function canObserveLength(raw) { var state = normalize(raw), p = state.player; return state.activity === 'length' && p.x >= 186.5 && p.x <= 197.5 && p.z >= 3 && p.z <= 13 && (facing(p, 192, 0) || facing(p, 188.5, 2.2) || facing(p, 192 + state.length.value / 2, 0.2)); }
  function setLengthValue(raw, value) { var state = normalize(raw), l = state.length, next = number(value, l.value, 1.8, 4.2); if (canObserveLength(state) && next !== l.value) { l.value = next; l.seen = l.visible ? 1 : 2; } return state; }
  function setLengthVisible(raw, value) { var state = normalize(raw), l = state.length; if (canObserveLength(state)) { l.visible = typeof value === 'boolean' ? value : !l.visible; l.seen |= l.visible ? 1 : 2; } return state; }
  function lengthMatches(raw) { var state = normalize(raw); return canObserveLength(state) && state.length.seen === 3 && Math.abs(state.length.value - 3) <= 0.05 + 1e-8; }
  function checkLength(raw) { var state = normalize(raw), l = state.length; if (lengthMatches(state) && !state.progress.length.assisted && l.completed.indexOf(l.round) < 0) l.completed.push(l.round); return normalize(state); }
  function nextLength(raw) { var state = normalize(raw), l = state.length; if (state.activity === 'length' && (l.completed.indexOf(l.round) >= 0 || state.progress.length.assisted)) { state.length = Object.assign(lengthDefaults(1 - l.round), { completed: l.completed.slice() }); state.player = spawn('length'); } return state; }
  function lengthInspectionViews() { return ['front', 'left', 'right'].map(function (side) { var dx = side === 'left' ? -3.8 : side === 'right' ? 3.8 : 0, z = side === 'front' ? 10 : 9; return { side: side, player: { x: 192 + dx, z: z, yaw: Math.atan2(-dx, z) * 180 / Math.PI, pitch: 0 } }; }); }
  function inspectLength(raw, side) { var state = normalize(raw), view = lengthInspectionViews().find(function (item) { return item.side === side; }); if (state.activity === 'length' && view) state.player = view.player; return state; }
  function apertureObjects(round, phase) {
    // Equal line intercepts: a slope of 2.8 / 5 turns a 0.65 horizontal shift into -0.364 vertically.
    var vertical = Math.floor(number(round, 0, 0, 1)) === 1, s = Math.sin(angle(phase, 0) * Math.PI / 180), offset = { x: vertical ? 0 : 0.65 * s, y: vertical ? -0.364 * s : 0 };
    return { from: { x: 177.5 + offset.x, y: 0.6 + offset.y, z: 0 }, to: { x: 182.5 + offset.x, y: 3.4 + offset.y, z: 0 }, center: { x: 180 + offset.x, y: 2 + offset.y, z: 0 }, axis: vertical ? 'vertical' : 'horizontal', offset: offset, screen: { x: 180, y: 2, z: 0.5, width: 7.8, height: 4.8, openingWidth: 1.5, openingHeight: 1.3 } };
  }
  function canObserveAperture(raw) { var state = normalize(raw), p = state.player; return state.activity === 'aperture' && p.x >= 174.5 && p.x <= 185.5 && p.z >= 5 && p.z <= 13 && (facing(p, 180, 0) || facing(p, 176.5, 2.2) || facing(p, 183.5, 2.2)); }
  function apertureSeen(mask) { return [1, 2, 4].filter(function (bit) { return mask & bit; }).length; }
  function recordAperture(state) { var a = state.aperture, s = Math.sin(a.phase * Math.PI / 180); a[a.masked ? 'seenMasked' : 'seenOpen'] |= s < -0.35 ? 1 : s > 0.35 ? 4 : 2; return state; }
  function setAperturePhase(raw, value) { var state = normalize(raw); if (canObserveAperture(state)) { state.aperture.phase = angle(value, state.aperture.phase); recordAperture(state); } return state; }
  function setApertureSpeed(raw, value) { var state = normalize(raw); if (canObserveAperture(state)) state.aperture.speed = number(value, state.aperture.speed, 0.25, 2); return state; }
  function toggleApertureMask(raw, value) { var state = normalize(raw); if (canObserveAperture(state)) { state.aperture.masked = typeof value === 'boolean' ? value : !state.aperture.masked; recordAperture(state); } return state; }
  function selectApertureAxis(raw, choice) { var state = normalize(raw); if (canObserveAperture(state) && ['horizontal', 'vertical'].indexOf(choice) >= 0) state.aperture.choice = choice; return state; }
  function apertureMatches(raw) { var state = normalize(raw), a = state.aperture; return canObserveAperture(state) && apertureSeen(a.seenMasked) >= 2 && apertureSeen(a.seenOpen) >= 2 && a.choice === apertureObjects(a.round, a.phase).axis; }
  function checkAperture(raw) { var state = normalize(raw), a = state.aperture; if (apertureMatches(state) && !state.progress.aperture.assisted && a.completed.indexOf(a.round) < 0) a.completed.push(a.round); return normalize(state); }
  function nextAperture(raw) { var state = normalize(raw), a = state.aperture; if (state.activity === 'aperture' && (a.completed.indexOf(a.round) >= 0 || state.progress.aperture.assisted)) { state.aperture = Object.assign(apertureDefaults(1 - a.round), { speed: a.speed, completed: a.completed.slice() }); state.player = spawn('aperture'); } return state; }
  function apertureInspectionViews() { return ['front', 'left', 'right'].map(function (side) { var dx = side === 'left' ? -4 : side === 'right' ? 4 : 0, z = side === 'front' ? 11 : 10; return { side: side, player: { x: 180 + dx, z: z, yaw: Math.atan2(-dx, z) * 180 / Math.PI, pitch: 0 } }; }); }
  function inspectAperture(raw, side) { var state = normalize(raw), view = apertureInspectionViews().find(function (item) { return item.side === side; }); if (state.activity === 'aperture' && view) state.player = view.player; return state; }
  function landingDefaults(round) { return { heights: Math.floor(number(round, 0, 0, 1)) ? [0.7, 2.8, 1.2] : [2.6, 1, 2.9], selected: 0, lightAngle: 0 }; }
  function landingLight(round, angle) {
    var light = Math.floor(number(round, 0, 0, 1)) ? { x: -0.8, z: 0.85 } : { x: 0.6, z: 1.1 }, radians = number(angle, 0, -25, 25) * Math.PI / 180;
    return { x: light.x * Math.cos(radians) - light.z * Math.sin(radians), z: light.x * Math.sin(radians) + light.z * Math.cos(radians) };
  }
  function landingObjects(round, heights, lightAngle) {
    var r = Math.floor(number(round, 0, 0, 1)), light = landingLight(r, lightAngle), defaults = landingDefaults(r), targets = r ? [2.65, 1.35, 2.3] : [1.25, 2.7, 1.9], radius = 0.38;
    return ['A', 'B', 'C'].map(function (choice, i) {
      var x = 166 + i * 2, z = [0, -0.6, 0.4][i], y = number(Array.isArray(heights) ? heights[i] : undefined, defaults.heights[i], 0.55, 3.2);
      function projection(height) { return { x: x + height * light.x, z: z + height * light.z, major: radius * Math.sqrt(1 + light.x * light.x + light.z * light.z), minor: radius, angle: Math.atan2(light.z, light.x) }; }
      return { id: 'landing-' + choice, choice: choice, index: i, x: x, y: y, z: z, radius: radius, targetHeight: targets[i], shadow: projection(y), target: projection(targets[i]) };
    });
  }
  function canManipulateLanding(raw) { var state = normalize(raw), p = state.player; return state.activity === 'landing' && p.x >= 162.5 && p.x <= 173.5 && p.z >= 3 && p.z <= 12 && facing(p, 168, 0); }
  function selectLanding(raw, index) { var state = normalize(raw); if (canManipulateLanding(state) && Number.isInteger(index) && index >= 0 && index < 3) state.landing.selected = index; return state; }
  function setLandingHeight(raw, index, value) { var state = selectLanding(raw, index); if (canManipulateLanding(state) && Number.isInteger(index) && index >= 0 && index < 3) state.landing.heights[index] = number(value, state.landing.heights[index], 0.55, 3.2); return state; }
  function setLandingLight(raw, value) { var state = normalize(raw); if (canManipulateLanding(state)) state.landing.lightAngle = number(value, state.landing.lightAngle, -25, 25); return state; }
  function landingAligned(raw) { var state = normalize(raw); return landingObjects(state.landing.round, state.landing.heights, state.landing.lightAngle).filter(function (item) { return Math.abs(item.y - item.targetHeight) <= 0.12 + 1e-8; }).length; }
  function landingMatches(raw) { return canManipulateLanding(raw) && landingAligned(raw) === 3; }
  function checkLanding(raw) { var state = normalize(raw), p = state.progress.landing; if (landingMatches(state) && !p.assisted && state.landing.completed.indexOf(state.landing.round) < 0) state.landing.completed.push(state.landing.round); return normalize(state); }
  function nextLanding(raw) { var state = normalize(raw), l = state.landing; if (l.completed.indexOf(l.round) < 0 && !state.progress.landing.assisted) return state; state.landing = Object.assign(landingDefaults(1 - l.round), { round: 1 - l.round, completed: l.completed }); state.player = spawn('landing'); return state; }
  function landingInspectionViews() { return ['front', 'left', 'right'].map(function (side) { var dx = side === 'left' ? -5.2 : side === 'right' ? 5.2 : 0, z = side === 'front' ? 12 : 11; return { side: side, player: { x: 168 + dx, z: z, yaw: Math.atan2(-dx, z - 1) * 180 / Math.PI, pitch: 0 } }; }); }
  function inspectLanding(raw, side) { var state = normalize(raw), view = landingInspectionViews().find(function (item) { return item.side === side; }); if (state.activity === 'landing' && view) state.player = view.player; return state; }
  function weaveDefaults(round) { return { depths: Math.floor(number(round, 0, 0, 1)) === 0 ? [-1.2, 1.2, 0] : [1.2, 0, -1.2], selected: 0 }; }
  function weaveOrder(round) { return Math.floor(number(round, 0, 0, 1)) === 0 ? ['A', 'B', 'C'] : ['C', 'A', 'B']; }
  function weaveObjects(depths) {
    var defaults = weaveDefaults(0).depths;
    return [[[153.5, 1.8], [158.5, 1.8]], [[153.7, 1.105], [158.3, 4.095]], [[153.7, 4.095], [158.3, 1.105]]].map(function (ends, index) { var choice = ['A', 'B', 'C'][index], z = number(Array.isArray(depths) ? depths[index] : undefined, defaults[index], -1.5, 1.5); return { id: 'weave-' + choice, choice: choice, index: index, depth: z, from: { x: ends[0][0], y: ends[0][1], z: z }, to: { x: ends[1][0], y: ends[1][1], z: z } }; });
  }
  function canManipulateWeave(raw) { var state = normalize(raw), p = state.player; return state.activity === 'weave' && p.x >= 150.8 && p.x <= 161.2 && p.z >= 3 && p.z <= 12 && facing(p, 156, 0); }
  function selectWeave(raw, index) { var state = normalize(raw); if (canManipulateWeave(state) && Number.isInteger(index) && index >= 0 && index < 3) state.weave.selected = index; return state; }
  function setWeaveDepth(raw, index, value) {
    var state = normalize(raw); if (!canManipulateWeave(state) || !Number.isInteger(index) || index < 0 || index > 2) return state;
    var depth = number(value, state.weave.depths[index], -1.5, 1.5);
    if (Math.abs(depth - state.weave.depths[index]) > 1e-8) { state.weave.depths[index] = depth; state.weave.seen = 0; }
    state.weave.selected = index; return state;
  }
  function weaveView(raw) { var state = normalize(raw), p = state.player, offset = Math.abs(p.x - 156); if (!canManipulateWeave(state)) return ''; return offset <= 0.6 + 1e-8 && p.z >= 7 && p.z <= 11 ? 'front' : offset >= 3.4 - 1e-8 && offset <= 5.2 + 1e-8 && p.z >= 3 && p.z <= 8 ? 'side' : ''; }
  function recordWeaveView(raw) { var state = normalize(raw), view = weaveView(state); if (view) state.weave.seen |= view === 'front' ? 1 : 2; return state; }
  function weaveInspectionViews() { return ['front', 'left', 'right'].map(function (side) { var dx = side === 'left' ? -4.4 : side === 'right' ? 4.4 : 0, z = side === 'front' ? 9 : 5.5; return { side: side, player: { x: 156 + dx, z: z, yaw: Math.atan2(-dx, z) * 180 / Math.PI, pitch: 0 } }; }); }
  function inspectWeave(raw, side) { var state = normalize(raw), view = weaveInspectionViews().find(function (item) { return item.side === side; }); if (state.activity === 'weave' && view) state.player = view.player; return state; }
  function weaveMatches(raw) { var state = normalize(raw), w = state.weave, order = weaveOrder(w.round).map(function (choice) { return w.depths[choice.charCodeAt(0) - 65]; }); return canManipulateWeave(state) && w.seen === 3 && order[0] - order[1] >= 0.55 - 1e-8 && order[1] - order[2] >= 0.55 - 1e-8; }
  function checkWeave(raw) { var state = normalize(raw), w = state.weave; if (weaveMatches(state) && !state.progress.weave.assisted && w.completed.indexOf(w.round) < 0) w.completed.push(w.round); state.progress.weave.solved = w.completed.length === 2 && !state.progress.weave.assisted; return state; }
  function nextWeave(raw) { var state = normalize(raw), w = state.weave; if (state.activity === 'weave' && (w.completed.indexOf(w.round) >= 0 || state.progress.weave.assisted)) state.weave = Object.assign(weaveDefaults(1 - w.round), { round: 1 - w.round, seen: 0, completed: w.completed.slice() }); return state; }
  function frameDefaults(round) { return { adjustment: 0, surround: Math.floor(number(round, 0, 0, 1)) === 0 ? 22 : -22 }; }
  function frameObjects(round, adjustment, surround) {
    var base = Math.floor(number(round, 0, 0, 1)) === 0 ? 18 : 66, degrees = base + number(adjustment, 0, -45, 45), radians = degrees * Math.PI / 180, a = number(surround, frameDefaults(round).surround, -30, 30) * Math.PI / 180;
    function end(t) { return { x: 144 + Math.sin(radians) * t, y: 2.6 + Math.cos(radians) * t, z: 0.15 }; }
    return { center: { x: 144, y: 2.6, z: 0 }, angle: degrees, rod: { from: end(-1.45), to: end(1.45) }, corners: [[-1.8, -1.8], [-1.8, 1.8], [1.8, 1.8], [1.8, -1.8]].map(function (point) { return { x: 144 + Math.cos(a) * point[0] + Math.sin(a) * point[1], y: 2.6 - Math.sin(a) * point[0] + Math.cos(a) * point[1], z: 0 }; }) };
  }
  function canObserveFrame(raw) { var state = normalize(raw), p = state.player; return state.activity === 'frame' && p.x >= 140 && p.x <= 148 && p.z >= 4 && p.z <= 12 && facing(p, 144, 0); }
  function setFrameAdjustment(raw, value) { var state = normalize(raw); if (canObserveFrame(state)) state.frame.adjustment = number(value, state.frame.adjustment, -45, 45); return state; }
  function setFrameSurround(raw, value) { var state = normalize(raw); if (canObserveFrame(state)) state.frame.surround = number(value, state.frame.surround, -30, 30); return state; }
  function setFrameVisible(raw, value) { var state = normalize(raw); if (canObserveFrame(state) && typeof value === 'boolean') { state.frame.visible = value; state.frame.seen |= value ? 1 : 2; } return state; }
  function frameMatches(raw) { var state = normalize(raw), f = state.frame; return canObserveFrame(state) && f.seen === 3 && Math.abs(f.adjustment + (f.round === 0 ? 18 : -24)) <= 2 + 1e-8; }
  function checkFrame(raw) { var state = normalize(raw), f = state.frame; if (frameMatches(state) && !state.progress.frame.assisted && f.completed.indexOf(f.round) < 0) f.completed.push(f.round); state.progress.frame.solved = f.completed.length === 2 && !state.progress.frame.assisted; return state; }
  function nextFrame(raw) { var state = normalize(raw), f = state.frame; if (state.activity === 'frame' && (f.completed.indexOf(f.round) >= 0 || state.progress.frame.assisted)) state.frame = Object.assign(frameDefaults(1 - f.round), { round: 1 - f.round, visible: true, seen: 1, completed: f.completed.slice() }); return state; }
  function motionTargets(round) { return Math.floor(number(round, 0, 0, 1)) === 0 ? ['A', 'C', 'E'] : ['B', 'D', 'F']; }
  function motionObjects(round, phase) {
    round = Math.floor(number(round, 0, 0, 1)); var t = angle(phase, 0) * Math.PI / 180, s = Math.sin(t), c = Math.cos(t) - 1, targets = motionTargets(round);
    var shared = round ? { x: 0.4 * s, y: 0.5 * s, z: 0.22 * c } : { x: 0.6 * s, y: 0.32 * c, z: 0.22 * s }, distractor = 0;
    return ['A', 'B', 'C', 'D', 'E', 'F'].map(function (choice, index) {
      var base = { x: 129 + index % 3 * 3, y: index < 3 ? 3.15 : 1.4, z: 0 }, offset;
      if (targets.indexOf(choice) >= 0) offset = Object.assign({}, shared);
      else { var kind = distractor++; offset = kind === 0 ? { x: -0.6 * s, y: 0.26 * c, z: -0.18 * s } : kind === 1 ? { x: 0.45 * c, y: -0.38 * s, z: 0.15 * s } : { x: 0.38 * Math.sin(2 * t), y: -0.24 * c, z: 0.12 * Math.sin(2 * t) }; }
      return { id: 'motion-' + choice, choice: choice, x: base.x + offset.x, y: base.y + offset.y, z: base.z + offset.z, radius: 0.27, base: base, offset: offset };
    });
  }
  function canObserveMotion(raw) { var state = normalize(raw), p = state.player; return state.activity === 'motion' && p.x >= 128 && p.x <= 136 && p.z >= 4 && p.z <= 12 && facing(p, 132, 0); }
  function setMotionPhase(raw, value) { var state = normalize(raw); if (!canObserveMotion(state)) return state; var m = state.motion; m.phase = angle(value, m.phase); [0, 90, 180, 270].forEach(function (phase, index) { if (Math.abs((m.phase - phase + 540) % 360 - 180) <= 22.5) m.seen |= 1 << index; }); return state; }
  function observedMotion(raw) { var mask = normalize(raw).motion.seen; return [1, 2, 4, 8].filter(function (bit) { return mask & bit; }).length; }
  function toggleMotion(raw, choice) { var state = normalize(raw), selected = state.motion.selected, index = selected.indexOf(choice); if (!canObserveMotion(state) || ['A', 'B', 'C', 'D', 'E', 'F'].indexOf(choice) < 0) return state; if (index >= 0) selected.splice(index, 1); else if (selected.length < 3) selected.push(choice); return state; }
  function motionMatches(raw) { var state = normalize(raw); return canObserveMotion(state) && observedMotion(state) >= 3 && state.motion.selected.length === 3 && motionTargets(state.motion.round).every(function (choice) { return state.motion.selected.indexOf(choice) >= 0; }); }
  function checkMotion(raw) { var state = normalize(raw), m = state.motion; if (motionMatches(state) && !state.progress.motion.assisted && m.completed.indexOf(m.round) < 0) m.completed.push(m.round); state.progress.motion.solved = m.completed.length === 2 && !state.progress.motion.assisted; return state; }
  function nextMotion(raw) { var state = normalize(raw), m = state.motion; if (state.activity === 'motion' && (m.completed.indexOf(m.round) >= 0 || state.progress.motion.assisted)) state.motion = { round: 1 - m.round, phase: 0, seen: 1, selected: [], completed: m.completed.slice() }; return state; }
  function shapeDefaults(round) { return round === 1 ? { angles: [13, 347], tilts: [4, 59] } : { angles: [68, 347], tilts: [4, 4] }; }
  function shapeTarget(round) { return Math.floor(number(round, 0, 0, 1)) === 0 ? 'A' : 'B'; }
  function shapeObjects(round, angles, tilts) {
    round = Math.floor(number(round, 0, 0, 1)); var defaults = shapeDefaults(round);
    return ['A', 'B'].map(function (choice, index) { var circle = choice === shapeTarget(round); return { id: 'shape-' + choice, choice: choice, x: 118 + index * 4, y: 2.3, z: 0, rx: circle || round === 1 ? 1.3 : 0.75, ry: circle || round === 0 ? 1.3 : 0.75, tube: 0.075, yaw: angle(Array.isArray(angles) ? angles[index] : undefined, defaults.angles[index]), pitch: number(Array.isArray(tilts) ? tilts[index] : undefined, defaults.tilts[index], -75, 75) }; });
  }
  function canTurnShape(raw, index) { var state = normalize(raw), p = state.player; return state.activity === 'shape' && (index === 0 || index === 1) && p.z >= 1.3 && Math.hypot(p.x - (118 + index * 4), p.z, 0.65) <= 14 + 1e-8; }
  function turnShape(raw, index, yaw, pitch) { var state = normalize(raw), r = state.shape; if (canTurnShape(state, index)) { r.angles[index] = angle(yaw, r.angles[index]); r.tilts[index] = number(pitch, r.tilts[index], -75, 75); r.selected = index; } return state; }
  function chooseShape(raw, choice) { var state = normalize(raw); if (canTurnShape(state, ['A', 'B'].indexOf(choice))) state.shape.choice = choice; return state; }
  function shapeMatches(raw) { var state = normalize(raw), p = state.player; return state.activity === 'shape' && state.shape.choice === shapeTarget(state.shape.round) && p.x >= 114 && p.x <= 126 && p.z >= 1.3 && p.z <= 12 && [118, 120, 122].some(function (x) { return facing(p, x, 0); }); }
  function checkShape(raw) { var state = normalize(raw), r = state.shape; if (shapeMatches(state) && !state.progress.shape.assisted && r.completed.indexOf(r.round) < 0) r.completed.push(r.round); state.progress.shape.solved = r.completed.length === 2 && !state.progress.shape.assisted; return state; }
  function nextShape(raw) { var state = normalize(raw), r = state.shape; if (state.activity === 'shape' && (r.completed.indexOf(r.round) >= 0 || state.progress.shape.assisted)) state.shape = Object.assign(shapeDefaults(1 - r.round), { round: 1 - r.round, selected: 0, choice: '', completed: r.completed.slice() }); return state; }
  function shapeInspectionViews() {
    var views = [];
    shapeObjects(0).forEach(function (item) { ['front', 'left', 'right'].forEach(function (side) { var a = side === 'left' ? -40 : side === 'right' ? 40 : 0, radians = a * Math.PI / 180; views.push({ choice: item.choice, side: side, player: { x: item.x + Math.sin(radians) * 4.5, z: Math.cos(radians) * 4.5, yaw: -a, pitch: Math.atan2(0.65, 4.5) * 180 / Math.PI } }); }); });
    return views;
  }
  function shapeInspection(raw) { var state = normalize(raw); return state.activity === 'shape' ? shapeInspectionViews().find(function (view) { return ['x', 'z', 'yaw', 'pitch'].every(function (key) { return Math.abs(state.player[key] - view.player[key]) < 1e-5; }); }) || null : null; }
  function inspectShape(raw, choice, side) { var state = normalize(raw), view = shapeInspectionViews().find(function (item) { return item.choice === choice && item.side === side; }); if (state.activity === 'shape' && view) { state.player = view.player; state.shape.selected = choice === 'A' ? 0 : 1; } return state; }
  function alignedCorners(state) { return state.contour.angles.filter(function (value, index) { return Math.abs(((value - CORNER_TARGETS[index] + 540) % 360) - 180) <= 7.5; }).length; }
  function reliefTarget(round) { return Math.floor(number(round, 0, 0, 1)) === 0 ? 'B' : 'A'; }
  function reliefObjects(round) {
    return ['A', 'B'].map(function (choice, index) { return { id: 'relief-' + choice, choice: choice, x: 106 + index * 4, y: 2.3, z: 0, width: 3.2, height: 3.2, radius: 1.25, depth: choice === reliefTarget(round) ? -0.7 : 0.7 }; });
  }
  function reliefSurface(item, x, y) {
    var q = Math.max(0, 1 - (x * x + y * y) / (item.radius * item.radius));
    var nx = 4 * item.depth * x * q / (item.radius * item.radius), ny = 4 * item.depth * y * q / (item.radius * item.radius), length = Math.hypot(nx, ny, 1);
    return { z: item.depth * q * q, normal: { x: nx / length, y: ny / length, z: 1 / length } };
  }
  function reliefLight(value) { var a = angle(value, 0) * Math.PI / 180; return { x: Math.sin(a) * Math.sqrt(0.75), y: Math.cos(a) * Math.sqrt(0.75), z: 0.5 }; }
  function reliefShade(item, x, y, value) { var n = reliefSurface(item, x, y).normal, light = reliefLight(value); return 0.18 + 0.82 * Math.max(0, n.x * light.x + n.y * light.y + n.z * light.z); }
  function canObserveRelief(raw) { var state = normalize(raw), p = state.player; return state.activity === 'relief' && p.x >= 102 && p.x <= 114 && p.z >= 1.3 && p.z <= 12 && [106, 108, 110].some(function (x) { return facing(p, x, 0); }); }
  function turnReliefLight(raw, value) {
    var state = normalize(raw); if (!canObserveRelief(state)) return state;
    state.relief.lightAngle = angle(value, state.relief.lightAngle);
    if (state.relief.lightAngle <= 30 || state.relief.lightAngle >= 330) state.relief.seen |= 1;
    if (Math.abs(state.relief.lightAngle - 180) <= 30) state.relief.seen |= 2;
    return state;
  }
  function chooseRelief(raw, choice) { var state = normalize(raw); if (canObserveRelief(state) && ['A', 'B'].indexOf(choice) >= 0) state.relief.choice = choice; return state; }
  function reliefMatches(raw) { var state = normalize(raw); return canObserveRelief(state) && state.relief.seen === 3 && state.relief.choice === reliefTarget(state.relief.round); }
  function checkRelief(raw) {
    var state = normalize(raw), r = state.relief;
    if (reliefMatches(state) && !state.progress.relief.assisted && r.completed.indexOf(r.round) < 0) r.completed.push(r.round);
    state.progress.relief.solved = r.completed.length === 2 && !state.progress.relief.assisted; return state;
  }
  function nextRelief(raw) {
    var state = normalize(raw), r = state.relief;
    if (state.activity !== 'relief' || r.completed.indexOf(r.round) < 0 && !state.progress.relief.assisted) return state;
    var round = (r.round + 1) % 2;
    state.relief = { round: round, lightAngle: round * 180, seen: round ? 2 : 1, choice: '', completed: r.completed.slice() }; return state;
  }
  function reliefInspectionViews() {
    var views = [];
    reliefObjects(0).forEach(function (item) { ['front', 'left', 'right'].forEach(function (side) { var a = side === 'left' ? -45 : side === 'right' ? 45 : 0, radians = a * Math.PI / 180; views.push({ choice: item.choice, side: side, player: { x: item.x + Math.sin(radians) * 4.4, z: Math.cos(radians) * 4.4, yaw: -a, pitch: Math.atan2(0.65, 4.4) * 180 / Math.PI } }); }); });
    return views;
  }
  function reliefInspection(raw) { var state = normalize(raw); return state.activity === 'relief' ? reliefInspectionViews().find(function (view) { return ['x', 'z', 'yaw', 'pitch'].every(function (key) { return Math.abs(state.player[key] - view.player[key]) < 1e-5; }); }) || null : null; }
  function inspectRelief(raw, choice, side) { var state = normalize(raw), view = reliefInspectionViews().find(function (item) { return item.choice === choice && item.side === side; }); if (state.activity === 'relief' && view) state.player = view.player; return state; }
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
    var profile = shadowProfile(state.shadowAngle), target = shadowProfile(90), shadowError = Math.max.apply(null, profile.map(function (row, index) { return Math.max(Math.abs(row.left - target[index].left), Math.abs(row.right - target[index].right)); }));
    return { ringError: ringError, ringAlignment: Math.max(0, Math.round(100 * (1 - Math.min(1, ringError)))), ringFacing: facing(p, -12, 0), scaleRatio: Number.isFinite(ratio) && ratio > 0 ? ratio : null, scaleFacing: facing(p, 0, (state.blockZ - 3) / 2), collected: state.collected.length, contourAligned: alignedCorners(state), contourFacing: facing(p, 36, 0), contextSelected: state.context.selected.length, continuityOffset: state.continuityOffset, continuityFacing: facing(p, 60, 0) && p.z >= 7 && p.z <= 11 && Math.abs(p.x - 60) <= 0.6 + 1e-8, shadowError: shadowError, shadowFacing: facing(p, 72.5, -4) && p.x >= 70.8 - 1e-8 && p.x <= 73.2 + 1e-8 && p.z >= 7 && p.z <= 11 };
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
  function checkAnswer(raw) { var state = normalize(raw), values = evidence(state); return state.activity === 'length' ? checkLength(state).progress.length.solved : state.activity === 'aperture' ? checkAperture(state).progress.aperture.solved : state.activity === 'landing' ? checkLanding(state).progress.landing.solved : state.activity === 'weave' ? checkWeave(state).progress.weave.solved : state.activity === 'frame' ? checkFrame(state).progress.frame.solved : state.activity === 'motion' ? checkMotion(state).progress.motion.solved : state.activity === 'shape' ? checkShape(state).progress.shape.solved : state.activity === 'relief' ? checkRelief(state).progress.relief.solved : state.activity === 'rotation' ? checkRotation(state).progress.rotation.solved : state.activity === 'change' ? checkChange(state).progress.change.solved : state.activity === 'ring' ? values.ringError <= 0.055 && values.ringFacing : state.activity === 'scale' ? values.scaleRatio != null && Math.abs(values.scaleRatio - 1) <= 0.05 && values.scaleFacing : state.activity === 'parallax' ? state.parallax.samples.length === 2 && state.parallax.choice === 'C' : state.activity === 'contour' ? values.contourAligned === 4 && state.contour.choice === 'square' && values.contourFacing : state.activity === 'context' ? state.context.selected.length === 2 && state.context.selected.indexOf('A') >= 0 && state.context.selected.indexOf('C') >= 0 : state.activity === 'continuity' ? Math.abs(state.continuityOffset) <= 0.06 + 1e-8 && values.continuityFacing : state.activity === 'shadow' ? values.shadowError <= 0.06 + 1e-8 && values.shadowFacing : values.collected === 3; }
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
    .pw-nav{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border-block:1px solid var(--pw-line);margin-bottom:16px}[data-perception-walk] .pw-nav button{border:0;border-radius:0;text-align:left;justify-content:flex-start;padding:13px 12px;min-width:0;overflow-wrap:anywhere}.pw-nav button+button{border-left:1px solid var(--pw-line)!important}.pw-nav button:nth-child(5n+1){border-left:0!important}.pw-nav button:nth-child(n+6){border-top:1px solid var(--pw-line)!important}.pw-nav strong,.pw-nav small{display:block}.pw-nav strong{font-size:15px}.pw-nav small{font-size:12px;color:var(--pw-muted)}
    .pw-workspace{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:24px;align-items:start}.pw-scene-column{min-width:0}.pw-toolbar{margin-bottom:10px}.pw-toolbar label{display:flex;align-items:center;gap:7px;font-size:13px}.pw-toolbar input{width:20px;height:20px;accent-color:var(--pw-accent)}
    .pw-stage{position:relative;height:clamp(360px,62vh,690px);width:100%;overflow:hidden;background:#edf2ef;isolation:isolate}.pw-viewport,.pw-plan{position:absolute;inset:0;width:100%;height:100%}.pw-viewport{touch-action:pan-y;cursor:grab}.pw-viewport:active{cursor:grabbing}.pw-viewport[hidden]{display:none}.pw-crosshair{position:absolute;left:50%;top:50%;width:18px;height:18px;transform:translate(-50%,-50%);pointer-events:none;filter:drop-shadow(0 1px 1px #fff)}.pw-crosshair:before,.pw-crosshair:after{content:'';position:absolute;background:#183532}.pw-crosshair:before{width:16px;height:2px;left:1px;top:8px}.pw-crosshair:after{height:16px;width:2px;top:1px;left:8px}
    .pw-stage figcaption{position:absolute;bottom:0;left:0;max-width:100%;padding:7px 10px;background:#fff;color:#203032;font-size:12px;pointer-events:none}.pw-render-status{position:absolute;top:12px;left:12px;right:12px;padding:10px;background:#fff;color:#203032;font-size:14px;border:1px solid #c9d6d5;display:flex;gap:12px;justify-content:space-between;align-items:center}
    .pw-change-cover{position:absolute;inset:0;z-index:5;display:grid;place-items:center;background:#526466;color:#fff;font-size:18px;font-weight:650;pointer-events:auto}.pw-change-scene{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.pw-change-scene strong{font-size:14px}.pw-change-scene span{font-size:13px;color:var(--pw-muted)}
    .pw-rotation-pieces{display:flex;gap:16px;flex-wrap:wrap}.pw-rotation-pieces legend{width:100%}.pw-motion-choices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 16px}.pw-rotation-adjustments{display:flex;gap:8px;margin-top:8px}.pw-rotation-adjustments button{width:44px;padding:8px!important}
    .pw-inspection{display:flex;gap:12px;flex-wrap:wrap;margin:0 0 12px;padding:0;border:0;min-width:0}.pw-inspection legend{font-size:13px;margin-bottom:6px}.pw-inspection-tools,.pw-inspection-views{display:flex;gap:6px}.pw-inspection-tools button{min-width:54px}.pw-viewpoint-slot{display:grid;grid-template-columns:56px 44px 44px;gap:4px}.pw-viewpoint-slot button{width:100%;height:44px;padding:8px!important}.pw-viewpoints{column-gap:16px}.pw-inspection-views button{width:44px;padding:8px!important}
    .pw-waypoints{position:absolute;inset:0;pointer-events:none}[data-perception-walk] .pw-waypoint{position:absolute;transform:translate(-50%,-50%);pointer-events:auto;width:100px;min-height:44px;padding:7px 5px;font-size:13px;background:#fff;color:#203032;border:2px solid #096a65;box-shadow:0 2px 4px #20303224;overflow-wrap:anywhere}.pw-waypoint:hover{background:#edf3f2!important}.pw-waypoint span:first-child{color:#096a65;font-weight:750}
    .pw-navigation{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;border-bottom:1px solid var(--pw-line);padding:12px 0}.pw-pad{display:grid;grid-template-columns:repeat(3,44px);grid-template-rows:repeat(2,44px);gap:4px}.pw-pad button{padding:0!important;touch-action:none;user-select:none}.pw-look{display:grid;grid-template-columns:repeat(2,44px);gap:4px}.pw-look button{padding:0!important;touch-action:none;user-select:none}.pw-controls{display:flex;gap:12px;align-items:center}.pw-actions .pw-icon{width:44px;padding:8px}.pw-position{font-size:12px;color:var(--pw-muted);font-variant-numeric:tabular-nums;margin-top:8px!important}
    .pw-task{border-left:1px solid var(--pw-line);padding-left:24px;min-width:0}.pw-task>*+*{margin-top:16px!important}.pw-task p{font-size:14px}.pw-task .pw-goal{font-size:16px;font-weight:600}.pw-reading{display:flex;align-items:baseline;justify-content:space-between;gap:12px;border-block:1px solid var(--pw-line);padding:12px 0;font-size:14px}.pw-reading strong{font-size:21px;font-variant-numeric:tabular-nums}.pw-task input[type=range]{width:100%;display:block;min-height:36px;accent-color:var(--pw-accent)}.pw-slider{display:block;font-size:14px}.pw-slider output{float:right;font-variant-numeric:tabular-nums}
    .pw-tokens{display:grid;gap:8px}.pw-tokens button{justify-content:flex-start!important}.pw-token-dot{display:inline-block;width:18px;height:18px;border:1px solid currentColor;flex:none}.pw-note{display:block;font-size:14px}.pw-note textarea{display:block;margin-top:7px;min-height:85px;resize:vertical;width:100%;background:var(--pw-bg);color:var(--pw-ink);border:1px solid var(--pw-line);border-radius:4px;font:inherit;padding:9px}.pw-status{min-height:24px;font-size:14px;color:var(--pw-muted);margin-top:12px!important}.pw-explanation{border-top:1px solid var(--pw-line);padding-top:12px}
    .pw-hints{font-size:14px}.pw-hints ol{padding-left:20px;margin:10px 0 0}.pw-hints li+li{margin-top:8px}.pw-reach{font-size:12px!important;color:var(--pw-muted);margin:7px 0!important}.pw-reading[data-unavailable=true] strong{font-size:14px;max-width:100px;text-align:right}
    .pw-precision{display:flex;align-items:center;gap:7px;font-size:13px}.pw-precision input,.pw-choices input{width:20px;height:20px;accent-color:var(--pw-accent);flex:none}.pw-choices{border:0;padding:0;margin:0;min-width:0}.pw-choices legend{font-size:14px;font-weight:600;margin-bottom:8px}.pw-choices label{display:flex;align-items:center;gap:8px;min-height:44px;font-size:14px;cursor:pointer}.pw-samples{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.pw-samples button{flex:1;min-width:90px}.pw-baseline{font-size:12px!important;color:var(--pw-muted);margin-top:8px!important}
    @media(max-width:1000px){.pw-workspace{grid-template-columns:minmax(0,1fr) 250px;gap:16px}.pw-task{padding-left:16px}}
    @media(max-width:760px){[data-perception-walk]{padding:12px}.pw-workspace{grid-template-columns:minmax(0,1fr)}.pw-task{border-left:0;border-top:1px solid var(--pw-line);padding:20px 0 0}.pw-stage{height:360px}.pw-nav strong{font-size:13px}.pw-nav small{display:none}[data-perception-walk] .pw-nav button{padding:10px 7px}.pw-header h2{font-size:23px}.pw-navigation{gap:10px}.pw-nav{margin-bottom:12px}}
    @media(max-width:380px){.pw-stage{height:320px}.pw-nav strong{font-size:12px}.pw-navigation{align-items:flex-start}.pw-controls{gap:8px}.pw-header h2{font-size:22px}.pw-toolbar{gap:8px}}
    @media(max-width:760px){.pw-nav{grid-template-columns:repeat(2,minmax(0,1fr))}.pw-nav button:nth-child(2n+1){border-left:0!important}.pw-nav button:nth-child(2n){border-left:1px solid var(--pw-line)!important}.pw-nav button:nth-child(n+3){border-top:1px solid var(--pw-line)!important}.pw-precision{order:3;flex-basis:100%}}
    @media(forced-colors:active){.pw-stage{forced-color-adjust:none}.pw-primary{border:2px solid ButtonText!important}}
    .pw-room-tools{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;flex-wrap:wrap}.pw-room-tools>div{display:flex;gap:6px}.pw-room-tools .pw-icon{width:44px;padding:8px}
    [data-perception-walk] .pw-nav[data-expanded=false]{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:minmax(160px,calc(20% - 2px));overflow-x:auto;overscroll-behavior-x:contain;scroll-padding:4px;padding:4px 0;gap:0}
    [data-perception-walk] .pw-nav[data-expanded=false] button{border:0!important;border-right:1px solid var(--pw-line)!important;min-height:64px}
    [data-perception-walk] .pw-nav[data-expanded=false] button:focus-visible{outline-offset:-3px}
    [data-perception-walk] .pw-nav[data-expanded=false] small{display:block}.pw-nav[data-expanded=false] strong{font-size:14px}
    [data-perception-walk][data-mouse-look=true] .pw-waypoints{visibility:hidden}.pw-scene-column{position:relative}.pw-mouse-look{position:absolute;right:0;top:0;width:44px;padding:8px!important}.pw-scene-column>.pw-toolbar{padding-right:52px;min-height:44px}
  `;
  function LengthPlan(props) {
    var h = props.h, state = props.state, p = state.player, l = state.length, objects = lengthObjects(l.round, l.value), yaw = p.yaw * Math.PI / 180, pitch = p.pitch * Math.PI / 180;
    function project(point) { var dx = point.x - p.x, dz = point.z - p.z, dy = point.y - 1.65, depth = dx * Math.sin(yaw) - dz * Math.cos(yaw), d = depth * Math.cos(pitch) + dy * Math.sin(pitch); return d > 0.05 ? { x: (dx * Math.cos(yaw) + dz * Math.sin(yaw)) / d, y: (dy * Math.cos(pitch) - depth * Math.sin(pitch)) / d } : null; }
    var corners = [{ x: 188, y: 0, z: 0 }, { x: 188, y: 4.7, z: 0 }, { x: 196, y: 4.7, z: 0 }, { x: 196, y: 0, z: 0 }], bounds = corners.map(project).filter(Boolean), focal = Math.min(750, 350 / Math.max.apply(null, bounds.map(function (v) { return Math.abs(v.x); }).concat([0.001])), 245 / Math.max.apply(null, bounds.map(function (v) { return Math.abs(v.y); }).concat([0.001])));
    function pixel(point) { var v = project(point); return v && { x: 400 + focal * v.x, y: 300 - focal * v.y }; }
    function line(from, to, attrs) { var a = pixel(from), b = pixel(to); return a && b ? h('line', Object.assign({ x1: a.x, y1: a.y, x2: b.x, y2: b.y }, attrs)) : null; }
    var board = corners.map(pixel), handle = pixel(objects.adjustable.to);
    return h('svg', { className: 'pw-plan', viewBox: '0 0 800 600', role: 'img', 'aria-label': props.t('length_plan', 'Perspective comparison of two shafts and their endpoint fins'), 'data-walk-plan': true, 'data-walk-length-plan': true },
      h('rect', { width: 800, height: 600, fill: '#edf3f2' }), board.every(Boolean) && h('polygon', { points: board.map(function (point) { return point.x + ',' + point.y; }).join(' '), fill: '#fff', stroke: '#c9d6d5', strokeWidth: 3 }),
      ['reference', 'adjustable'].map(function (key) { var shaft = objects[key]; return h('g', { key: key, 'data-walk-length-shaft': key }, line(shaft.from, shaft.to, { stroke: key === 'reference' ? '#b84632' : '#147e78', strokeWidth: 8, strokeLinecap: 'round' }), l.visible && h('g', { 'data-walk-length-fins': key }, shaft.fins.map(function (fin, index) { return line(fin.from, fin.to, { key: index, stroke: '#203032', strokeWidth: 5, strokeLinecap: 'round' }); }))); }),
      handle && h('circle', { cx: handle.x, cy: handle.y, r: 7, fill: '#a66e00', stroke: '#203032', strokeWidth: 1 }),
      props.reveal && h('g', { 'data-walk-length-guides': true }, [objects.reference.from, objects.reference.to].map(function (point, index) { return line({ x: point.x, y: 0.7, z: 0.12 }, { x: point.x, y: 3.9, z: 0.12 }, { key: index, stroke: '#a66e00', strokeWidth: 3, strokeDasharray: '8 5' }); })));
  }
  function AperturePlan(props) {
    var h = props.h, state = props.state, a = state.aperture, p = state.player, item = apertureObjects(a.round, a.phase), s = item.screen, yaw = p.yaw * Math.PI / 180, pitch = p.pitch * Math.PI / 180;
    var left = s.x - s.width / 2, right = s.x + s.width / 2, bottom = s.y - s.height / 2, top = s.y + s.height / 2, holeLeft = s.x - s.openingWidth / 2, holeRight = s.x + s.openingWidth / 2, holeBottom = s.y - s.openingHeight / 2, holeTop = s.y + s.openingHeight / 2;
    function project(point) { var dx = point.x - p.x, dy = point.y - 1.65, dz = point.z - p.z, depth = dx * Math.sin(yaw) * Math.cos(pitch) + dy * Math.sin(pitch) - dz * Math.cos(yaw) * Math.cos(pitch); return depth > 0.2 ? { x: (dx * Math.cos(yaw) + dz * Math.sin(yaw)) / depth, y: (-dx * Math.sin(yaw) * Math.sin(pitch) + dy * Math.cos(pitch) + dz * Math.cos(yaw) * Math.sin(pitch)) / depth } : null; }
    function corners(x1, y1, x2, y2) { return [[x1, y1], [x1, y2], [x2, y2], [x2, y1]].map(function (v) { return { x: v[0], y: v[1], z: s.z }; }); }
    var bounds = corners(left, bottom, right, top).concat([item.from, item.to]).map(project).filter(Boolean), maxX = Math.max.apply(null, bounds.map(function (v) { return Math.abs(v.x); }).concat([0.001])), maxY = Math.max.apply(null, bounds.map(function (v) { return Math.abs(v.y); }).concat([0.001])), focal = Math.min(750, 350 / maxX, 245 / maxY);
    function pixel(point) { var v = project(point); return v && { x: 400 + focal * v.x, y: 300 - focal * v.y }; }
    function polygon(points, attrs) { var projected = points.map(pixel); return projected.every(Boolean) ? h('polygon', Object.assign({ points: projected.map(function (v) { return v.x + ',' + v.y; }).join(' ') }, attrs)) : null; }
    function line(from, to, attrs) { var first = pixel(from), last = pixel(to); return first && last ? h('line', Object.assign({ x1: first.x, y1: first.y, x2: last.x, y2: last.y }, attrs)) : null; }
    var open = !a.masked, axisEnds = function (point) { return a.round ? [{ x: point.x, y: point.y - item.offset.y - 0.5, z: point.z }, { x: point.x, y: point.y - item.offset.y + 0.5, z: point.z }] : [{ x: point.x - item.offset.x - 0.85, y: point.y, z: point.z }, { x: point.x - item.offset.x + 0.85, y: point.y, z: point.z }]; };
    return h('svg', { className: 'pw-plan', viewBox: '0 0 800 600', role: 'img', 'aria-label': props.t('aperture_plan', 'Perspective view of a moving diagonal rod and aperture screen'), 'data-walk-plan': true, 'data-walk-aperture-plan': true },
      h('rect', { width: 800, height: 600, fill: '#f6f8f5' }),
      line(item.from, item.to, { stroke: '#147e78', strokeWidth: 9, strokeLinecap: 'round', 'data-walk-aperture-rod': true }),
      open ? polygon(corners(left, bottom, right, top), { fill: 'none', stroke: '#526466', strokeWidth: 4 }) : h('g', { fill: '#596d78', stroke: '#203032', strokeWidth: 1, 'data-walk-aperture-panels': true }, [[left, bottom, holeLeft, top], [holeRight, bottom, right, top], [holeLeft, bottom, holeRight, holeBottom], [holeLeft, holeTop, holeRight, top]].map(function (v, index) { return polygon(corners.apply(null, v), { key: index }); })),
      props.reveal && h('g', { 'data-walk-aperture-guides': true }, [item.from, item.to].map(function (point, index) { var ends = axisEnds(point); return line(ends[0], ends[1], { key: index, stroke: '#b84632', strokeWidth: 4, strokeDasharray: '8 5' }); })));
  }
  function LandingPlan(props) {
    var h = props.h, state = props.state, p = state.player, objects = landingObjects(state.landing.round, state.landing.heights, state.landing.lightAngle), colors = ['#147e78', '#b84632', '#9b6700'], yaw = p.yaw * Math.PI / 180, pitch = p.pitch * Math.PI / 180, focal = 580;
    function project(point) { var dx = point.x - p.x, dz = point.z - p.z, dy = point.y - 1.65, depth = dx * Math.sin(yaw) - dz * Math.cos(yaw), d = depth * Math.cos(pitch) + dy * Math.sin(pitch); return d > 0.05 ? { x: 400 + focal * (dx * Math.cos(yaw) + dz * Math.sin(yaw)) / d, y: 300 - focal * (dy * Math.cos(pitch) - depth * Math.sin(pitch)) / d, depth: d } : null; }
    function ellipse(item) { return Array.from({ length: 64 }, function (_, i) { var a = i * Math.PI / 32, u = item.major * Math.cos(a), v = item.minor * Math.sin(a); return { x: item.x + u * Math.cos(item.angle) - v * Math.sin(item.angle), y: 0.025, z: item.z + u * Math.sin(item.angle) + v * Math.cos(item.angle) }; }); }
    var bounds = [];
    objects.forEach(function (item) { bounds = bounds.concat(ellipse(item.shadow), ellipse(item.target), [{ x: item.x - 0.5, y: item.y - 0.5, z: item.z }, { x: item.x + 0.5, y: item.y + 0.9, z: item.z }]); });
    focal /= bounds.map(project).filter(Boolean).reduce(function (scale, point) { return Math.max(scale, Math.abs(point.x - 400) / 345, Math.abs(point.y - 300) / 235); }, 1);
    function path(points) { var projected = points.map(project); return projected.every(Boolean) ? projected.map(function (point, i) { return (i ? 'L' : 'M') + point.x + ' ' + point.y; }).join(' ') + 'Z' : ''; }
    function line(a, b, color, key) { var from = project(a), to = project(b); return from && to && h('line', { key: key, x1: from.x, y1: from.y, x2: to.x, y2: to.y, stroke: color, strokeWidth: 3, strokeDasharray: '7 6' }); }
    return h('svg', { className: 'pw-plan', viewBox: '0 0 800 600', role: 'img', 'aria-label': props.t('landing_plan', 'Spheres and floor shadows from your current viewpoint'), 'data-walk-plan': true, 'data-walk-landing-plan': true },
      h('rect', { width: 800, height: 600, fill: '#edf2ef' }),
      objects.map(function (item, i) { var label = project({ x: item.target.x, y: 0.04, z: item.target.z - 0.65 }); return h('g', { key: item.id }, h('path', { d: path(ellipse(item.shadow)), fill: '#435250' }), h('path', { d: path(ellipse(item.target)), fill: 'none', stroke: colors[i], strokeWidth: 4 }), label && h('text', { x: label.x, y: label.y, textAnchor: 'middle', fill: '#203032', fontSize: 28, fontWeight: 700 }, item.choice)); }),
      props.reveal && h('g', { 'data-walk-landing-guides': true }, objects.map(function (item, i) { return h('g', { key: item.id }, line({ x: item.x, y: 0, z: item.z }, item, colors[i], 'height'), line(item, { x: item.shadow.x, y: 0.025, z: item.shadow.z }, colors[i], 'light'), line({ x: item.x - 0.4, y: item.targetHeight, z: item.z }, { x: item.x + 0.4, y: item.targetHeight, z: item.z }, colors[i], 'target')); })),
      objects.slice().sort(function (a, b) { return (project(b) || {}).depth - (project(a) || {}).depth; }).map(function (item) { var center = project(item), label = project({ x: item.x, y: item.y + 0.65, z: item.z }); return center && h('g', { key: item.id }, h('circle', { cx: center.x, cy: center.y, r: focal * item.radius / center.depth, fill: colors[item.index], stroke: state.landing.selected === item.index ? '#203032' : 'none', strokeWidth: 4 }), label && h('text', { x: label.x, y: label.y, textAnchor: 'middle', fill: '#203032', fontSize: 32, fontWeight: 700 }, item.choice)); }));
  }
  function WeavePlan(props) {
    var h = props.h, state = props.state, p = state.player, yaw = p.yaw * Math.PI / 180, pitch = p.pitch * Math.PI / 180, colors = ['#147e78', '#b84632', '#9b6700'], focal = 540;
    function project(point) { var dx = point.x - p.x, dz = point.z - p.z, dy = point.y - 1.65, depth = dx * Math.sin(yaw) - dz * Math.cos(yaw), d = depth * Math.cos(pitch) + dy * Math.sin(pitch); return d > 0.05 ? { x: 400 + focal * (dx * Math.cos(yaw) + dz * Math.sin(yaw)) / d, y: 300 - focal * (dy * Math.cos(pitch) - depth * Math.sin(pitch)) / d, depth: d } : null; }
    function line(from, to, color, width, key, dashed) { var a = project(from), b = project(to); return a && b && h('line', { key: key, x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: color, strokeWidth: width, strokeLinecap: 'round', strokeDasharray: dashed ? '6 5' : undefined }); }
    var objects = weaveObjects(state.weave.depths), rails = [153.5, 156, 158.5];
    var bounds = [];
    objects.forEach(function (item, i) { var anchor = i === 1 ? item.to : item.from; bounds.push(item.from, item.to, { x: anchor.x, y: anchor.y + 0.45, z: anchor.z }, { x: rails[i], y: 0.55, z: -1.5 }, { x: rails[i], y: 0.55, z: 1.5 }); if (props.reveal) bounds.push({ x: 152.8, y: 0.1, z: item.depth }, { x: 159.2, y: 0.1, z: item.depth }); });
    // Reserve space for labels as well as geometry at oblique inspection views.
    focal /= bounds.map(project).filter(Boolean).reduce(function (scale, point) { return Math.max(scale, Math.abs(point.x - 400) / 350, Math.abs(point.y - 300) / 235); }, 1);
    return h('svg', { className: 'pw-plan', viewBox: '0 0 800 600', role: 'img', 'aria-label': props.t('weave_plan', 'Three crossing beams seen from your current viewpoint'), 'data-walk-plan': true, 'data-walk-weave-plan': true },
      h('rect', { width: 800, height: 600, fill: '#edf2ef' }),
      rails.map(function (x, i) { var knob = project({ x: x, y: 0.55, z: state.weave.depths[i] }); return h('g', { key: i }, line({ x: x, y: 0.55, z: -1.5 }, { x: x, y: 0.55, z: 1.5 }, '#526466', 4, 'rail'), knob && h('circle', { cx: knob.x, cy: knob.y, r: 8, fill: colors[i] })); }),
      props.reveal && h('g', { 'data-walk-weave-guides': true }, objects.map(function (item, i) { return line({ x: 152.8, y: 0.1, z: item.depth }, { x: 159.2, y: 0.1, z: item.depth }, colors[i], 4, i, true); })),
      objects.slice().sort(function (a, b) { return (p.z >= 0 ? 1 : -1) * (a.depth - b.depth); }).map(function (item) { var a = project(item.from), b = project(item.to), selected = state.weave.selected === item.index, anchor = item.index === 1 ? item.to : item.from, label = project({ x: anchor.x, y: anchor.y + 0.45, z: anchor.z }); return h('g', { key: item.choice }, a && b && selected && line(item.from, item.to, '#203032', Math.max(6, 140 / ((a.depth + b.depth) / 2)), 'selected'), a && b && line(item.from, item.to, colors[item.index], Math.max(4, 115 / ((a.depth + b.depth) / 2)), 'beam'), label && h('text', { x: label.x, y: label.y, textAnchor: 'middle', fill: '#203032', fontSize: 42, fontWeight: 700 }, item.choice)); }));
  }
  function FramePlan(props) {
    var h = props.h, state = props.state, p = state.player, yaw = p.yaw * Math.PI / 180, pitch = p.pitch * Math.PI / 180, f = frameObjects(state.frame.round, state.frame.adjustment, state.frame.surround);
    function project(point) { var dx = point.x - p.x, dz = point.z - p.z, dy = point.y - 1.65, depth = dx * Math.sin(yaw) - dz * Math.cos(yaw), d = depth * Math.cos(pitch) + dy * Math.sin(pitch); return d > 0.05 ? { x: 400 + 640 * (dx * Math.cos(yaw) + dz * Math.sin(yaw)) / d, y: 300 - 640 * (dy * Math.cos(pitch) - depth * Math.sin(pitch)) / d, depth: d } : null; }
    function line(a, b, color, width, key, dashed) { var from = project(a), to = project(b); return from && to && h('line', { key: key, x1: from.x, y1: from.y, x2: to.x, y2: to.y, stroke: color, strokeWidth: width, strokeLinecap: 'round', strokeDasharray: dashed ? '8 6' : undefined }); }
    var disk = Array.from({ length: 64 }, function (_, i) { var a = i * Math.PI / 32; return project({ x: 144 + 2.58 * Math.cos(a), y: 2.6 + 2.58 * Math.sin(a), z: -0.25 }); }), end = project(f.rod.to);
    return h('svg', { className: 'pw-plan', viewBox: '0 0 800 600', role: 'img', 'aria-label': props.t('frame_plan', 'Rod and tilted frame seen from your current viewpoint'), 'data-walk-plan': true, 'data-walk-frame-plan': true },
      h('rect', { width: 800, height: 600, fill: '#edf2ef' }),
      disk.every(Boolean) && h('polygon', { points: disk.map(function (point) { return point.x + ',' + point.y; }).join(' '), fill: '#ced6d3' }),
      state.frame.visible && h('g', { 'data-walk-frame-surround-plan': true }, f.corners.map(function (corner, i) { return line(corner, f.corners[(i + 1) % 4], '#b84632', 9, i); })),
      line(f.rod.from, f.rod.to, '#147e78', 10, 'rod'), end && h('circle', { cx: end.x, cy: end.y, r: 10, fill: '#9b6700' }),
      props.reveal && h('g', { 'data-walk-frame-guides': true }, line({ x: 144, y: 0.25, z: 0.3 }, { x: 144, y: 4.95, z: 0.3 }, '#526466', 3, 'vertical', true), line({ x: 141.65, y: 2.6, z: 0.3 }, { x: 146.35, y: 2.6, z: 0.3 }, '#526466', 3, 'horizontal', true)));
  }
  function MotionPlan(props) {
    var h = props.h, state = props.state, p = state.player, yaw = p.yaw * Math.PI / 180, pitch = p.pitch * Math.PI / 180;
    function project(point) { var dx = point.x - p.x, dz = point.z - p.z, dy = point.y - 1.65, depth = dx * Math.sin(yaw) - dz * Math.cos(yaw), d = depth * Math.cos(pitch) + dy * Math.sin(pitch); return d > 0.05 ? { x: 400 + 640 * (dx * Math.cos(yaw) + dz * Math.sin(yaw)) / d, y: 300 - 640 * (dy * Math.cos(pitch) - depth * Math.sin(pitch)) / d, depth: d } : null; }
    var spheres = motionObjects(state.motion.round, state.motion.phase).map(function (item) { return { item: item, point: project(item), base: project(item.base) }; }), targets = motionTargets(state.motion.round), connected = spheres.filter(function (sphere) { return targets.indexOf(sphere.item.choice) >= 0; });
    return h('svg', { className: 'pw-plan', viewBox: '0 0 800 600', role: 'img', 'aria-label': props.t('motion_plan', 'Six spheres at the current motion phase'), 'data-walk-plan': true, 'data-walk-motion-plan': true },
      h('rect', { width: 800, height: 600, fill: '#edf2ef' }),
      props.reveal && h('g', { 'data-walk-motion-links': true }, connected.every(function (sphere) { return sphere.point; }) && h('polygon', { points: connected.map(function (sphere) { return sphere.point.x + ',' + sphere.point.y; }).join(' '), fill: 'none', stroke: '#b84632', strokeWidth: 4 }), connected.map(function (sphere) { return sphere.point && sphere.base && h('line', { key: sphere.item.choice, x1: sphere.base.x, y1: sphere.base.y, x2: sphere.point.x, y2: sphere.point.y, stroke: '#9b6700', strokeWidth: 3, strokeDasharray: '6 4' }); })),
      spheres.filter(function (sphere) { return sphere.point; }).sort(function (a, b) { return b.point.depth - a.point.depth; }).map(function (sphere) { var point = sphere.point, radius = 640 * sphere.item.radius / point.depth, selected = state.motion.selected.indexOf(sphere.item.choice) >= 0; return h('g', { key: sphere.item.choice }, h('circle', { cx: point.x, cy: point.y, r: radius, fill: selected ? '#e9b342' : '#208e87', stroke: '#203032', strokeWidth: 2 }), h('text', { x: point.x, y: point.y - radius - 15, textAnchor: 'middle', fill: '#203032', fontSize: 42, fontWeight: 700 }, sphere.item.choice)); }));
  }
  function ShapePlan(props) {
    var h = props.h, state = props.state, p = state.player, segments = [], guides = [], labels = [], yaw = p.yaw * Math.PI / 180, pitch = p.pitch * Math.PI / 180;
    function project(point) { var dx = point.x - p.x, dz = point.z - p.z, dy = point.y - 1.65, depth = dx * Math.sin(yaw) - dz * Math.cos(yaw), d = depth * Math.cos(pitch) + dy * Math.sin(pitch); return d > 0.05 ? { x: 400 + 640 * (dx * Math.cos(yaw) + dz * Math.sin(yaw)) / d, y: 300 - 640 * (dy * Math.cos(pitch) - depth * Math.sin(pitch)) / d, depth: d } : null; }
    shapeObjects(state.shape.round, state.shape.angles, state.shape.tilts).forEach(function (item, index) {
      var selected = state.shape.selected === index, top = -Infinity;
      for (var step = 0; step < 128; step++) {
        var ends = [step, step + 1].map(function (n) { var a = n / 128 * Math.PI * 2, world = rotationPoint(item, { x: item.rx * Math.cos(a), y: item.ry * Math.sin(a), z: 0 }); top = Math.max(top, world.y); return project(world); });
        if (ends.every(Boolean)) segments.push({ key: item.choice + step, from: ends[0], to: ends[1], depth: (ends[0].depth + ends[1].depth) / 2, selected: selected });
      }
      var label = project({ x: item.x, y: top + 0.45, z: item.z });
      if (label) labels.push(h('text', { key: item.choice, x: label.x, y: label.y, textAnchor: 'middle', fill: '#203032', fontSize: 26, fontWeight: 700 }, item.choice));
      if (props.reveal) [['x', item.rx, '#9b6700'], ['y', item.ry, '#b84632']].forEach(function (axis) {
        var ends = [-1, 1].map(function (sign) { var local = { x: 0, y: 0, z: 0.012 }; local[axis[0]] = sign * axis[1]; return project(rotationPoint(item, local)); });
        if (ends.every(Boolean)) guides.push(h('line', { key: item.choice + axis[0], x1: ends[0].x, y1: ends[0].y, x2: ends[1].x, y2: ends[1].y, stroke: axis[2], strokeWidth: 4 }));
      });
    });
    return h('svg', { className: 'pw-plan', viewBox: '0 0 800 600', role: 'img', 'aria-label': props.t('shape_plan', 'Two hoops seen from your current viewpoint'), 'data-walk-plan': true, 'data-walk-shape-plan': true },
      h('rect', { width: 800, height: 600, fill: '#edf2ef' }),
      segments.sort(function (a, b) { return b.depth - a.depth; }).map(function (line) { var width = Math.max(3, Math.min(30, 96 / line.depth)); return h('g', { key: line.key }, line.selected && h('line', { x1: line.from.x, y1: line.from.y, x2: line.to.x, y2: line.to.y, stroke: '#9b6700', strokeWidth: width + 3, strokeLinecap: 'round' }), h('line', { x1: line.from.x, y1: line.from.y, x2: line.to.x, y2: line.to.y, stroke: '#147e78', strokeWidth: width, strokeLinecap: 'round' })); }),
      labels, props.reveal && h('g', { 'data-walk-shape-diameters': true }, guides));
  }
  function ReliefPlan(props) {
    var h = props.h, state = props.state, p = state.player, patches = [], profiles = [], yaw = p.yaw * Math.PI / 180, pitch = p.pitch * Math.PI / 180;
    function project(x, y, z) { var dx = x - p.x, dz = z - p.z, dy = y - 1.65, depth = dx * Math.sin(yaw) - dz * Math.cos(yaw), d = depth * Math.cos(pitch) + dy * Math.sin(pitch); return d > 0.05 ? { x: 400 + 640 * (dx * Math.cos(yaw) + dz * Math.sin(yaw)) / d, y: 300 - 640 * (dy * Math.cos(pitch) - depth * Math.sin(pitch)) / d, depth: d } : null; }
    function pointsString(points) { return points.map(function (point) { return point.x + ',' + point.y; }).join(' '); }
    var surfaces = reliefObjects(state.relief.round);
    surfaces.forEach(function (item) {
      for (var row = 0; row < 32; row++) for (var col = 0; col < 32; col++) {
        var x = -1.6 + col * 0.1, y = -1.6 + row * 0.1;
        var corners = [[x, y], [x + 0.1, y], [x + 0.1, y + 0.1], [x, y + 0.1]].map(function (v) { return project(item.x + v[0], item.y + v[1], reliefSurface(item, v[0], v[1]).z); });
        if (corners.some(function (point) { return !point; })) continue;
        var linear = reliefShade(item, x + 0.05, y + 0.05, state.relief.lightAngle), gray = Math.round(255 * (1.055 * Math.pow(linear, 1 / 2.4) - 0.055));
        patches.push({ key: item.choice + '-' + row + '-' + col, points: pointsString(corners), depth: corners.reduce(function (sum, v) { return sum + v.depth / 4; }, 0), fill: 'rgb(' + gray + ',' + gray + ',' + gray + ')' });
      }
      if (props.reveal) {
        var profile = [], rim = [];
        for (var step = 0; step <= 40; step++) { var local = -1.5 + step * 0.075; profile.push(project(item.x + local, item.y, reliefSurface(item, local, 0).z + 0.012)); rim.push(project(item.x + local, item.y, 0.014)); }
        [rim, profile].forEach(function (line, index) { if (line.every(Boolean)) profiles.push(h('polyline', { key: item.choice + index, points: pointsString(line), fill: 'none', stroke: index ? '#9b6700' : '#b84632', strokeWidth: 3, strokeDasharray: index ? undefined : '5 5' })); });
      }
    });
    return h('svg', { className: 'pw-plan', viewBox: '0 0 800 600', role: 'img', 'aria-label': props.t('relief_plan', 'Two shaded surfaces seen from your current viewpoint'), 'data-walk-plan': true, 'data-walk-relief-plan': true }, h('rect', { width: 800, height: 600, fill: '#e5edeb' }),
      patches.sort(function (a, b) { return b.depth - a.depth; }).map(function (patch) { return h('polygon', { key: patch.key, points: patch.points, fill: patch.fill, stroke: patch.fill, strokeWidth: 0.6 }); }),
      surfaces.map(function (item) { var label = project(item.x, item.y + 1.95, 0); return label && h('text', { key: item.choice, x: label.x, y: label.y, textAnchor: 'middle', fontSize: 26, fill: '#203032', fontWeight: 700 }, item.choice); }),
      props.reveal && h('g', { 'data-walk-relief-profile': true }, profiles));
  }
  function Plan(props) {
    if (props.state.activity === 'length') return props.h(LengthPlan, props);
    if (props.state.activity === 'aperture') return props.h(AperturePlan, props);
    if (props.state.activity === 'landing') return props.h(LandingPlan, props);
    var h = props.h, t = props.t, state = props.state, p = state.player, scale = 15, px = function (x) { return 30 + (x + 20) * scale; }, pz = function (z) { return 25 + (z + 8) * scale; };
    if (state.activity === 'relief') return ReliefPlan(props);
    if (state.activity === 'shape') return ShapePlan(props);
    if (state.activity === 'weave') return WeavePlan(props); if (state.activity === 'frame') return FramePlan(props); if (state.activity === 'motion') return MotionPlan(props);
    if (state.activity === 'rotation') {
      var sculptures = rotationObjects(state.rotation.round, state.rotation.angles, state.rotation.tilts), faces = [], comparison = [];
      function projectRotation(point) { var k = 700 / (9 - point.z); return (400 + (point.x - 96) * k) + ',' + (330 - (point.y - 1.65) * k); }
      var normals = [[0, 0, -1], [1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 1, 0], [0, -1, 0]], indices = [[0, 1, 5, 4], [1, 3, 7, 5], [2, 3, 7, 6], [0, 2, 6, 4], [4, 5, 7, 6], [0, 1, 3, 2]];
      sculptures.forEach(function (item, sculptureIndex) {
        item.cells.forEach(function (cell, cellIndex) {
          var corners = [];
          [-1, 1].forEach(function (y) { [-1, 1].forEach(function (z) { [-1, 1].forEach(function (x) { corners.push(rotationPoint(item, { x: cell.x + x * cell.size / 2, y: cell.y + y * cell.size / 2, z: cell.z + z * cell.size / 2 })); }); }); });
          indices.forEach(function (list, faceIndex) {
            var n = normals[faceIndex], normal = rotationPoint(Object.assign({}, item, { x: 0, y: 0, z: 0 }), { x: n[0], y: n[1], z: n[2] }), center = { x: 0, y: 0, z: 0 };
            list.forEach(function (i) { center.x += corners[i].x / 4; center.y += corners[i].y / 4; center.z += corners[i].z / 4; });
            if (normal.x * (96 - center.x) + normal.y * (1.65 - center.y) + normal.z * (9 - center.z) <= 0) return;
            var shades = item.choice === 'R' ? ['#df9078', '#9c4937', '#c9674f'] : ['#56aaa4', '#176a66', '#208e87'];
            faces.push({ key: item.choice + '-' + cellIndex + '-' + faceIndex, z: center.z, points: list.map(function (i) { return projectRotation(corners[i]); }).join(' '), fill: shades[normal.y > 0.4 ? 0 : normal.x > 0.2 ? 1 : 2], selected: sculptureIndex - 1 === state.rotation.selected });
          });
        });
      });
      if (props.reveal) {
        var match = sculptures.filter(function (item) { return item.choice === rotationMatch(state.rotation.round); })[0];
        var reference = Object.assign({}, sculptures[0], { x: match.x, y: match.y, z: match.z });
        reference.cells.forEach(function (cell, cellIndex) {
          var corners = [];
          [-1, 1].forEach(function (y) { [-1, 1].forEach(function (z) { [-1, 1].forEach(function (x) { corners.push(projectRotation(rotationPoint(reference, { x: cell.x + x * cell.size / 2, y: cell.y + y * cell.size / 2, z: cell.z + z * cell.size / 2 }))); }); }); });
          [[0, 1, 3, 2, 0], [4, 5, 7, 6, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(function (edge, edgeIndex) {
            comparison.push(h('polyline', { key: cellIndex + '-' + edgeIndex, points: edge.map(function (i) { return corners[i]; }).join(' '), fill: 'none', stroke: '#9b6700', strokeWidth: 2 }));
          });
        });
      }
      return h('svg', { className: 'pw-plan', viewBox: '0 0 800 600', role: 'img', 'aria-label': t('rotation_plan', 'Reference R and two rotatable block sculptures'), 'data-walk-plan': true, 'data-walk-rotation-plan': true },
        h('rect', { width: 800, height: 600, fill: '#f6f8f5' }),
        sculptures.map(function (item) { return h('g', { key: item.choice }, h('ellipse', { cx: 400 + (item.x - 96) * 700 / 9, cy: 447, rx: 97, ry: 19, fill: '#d5dfdc', stroke: props.reveal && item.choice === rotationMatch(state.rotation.round) ? '#9b6700' : '#526466', strokeWidth: props.reveal && item.choice === rotationMatch(state.rotation.round) ? 5 : 1 }), h('text', { x: 400 + (item.x - 96) * 700 / 9, y: 132, textAnchor: 'middle', fontSize: 28, fontWeight: 700, fill: '#203032' }, item.choice)); }),
        faces.sort(function (a, b) { return a.z - b.z; }).map(function (face) { return h('polygon', { key: face.key, points: face.points, fill: face.fill, stroke: face.selected ? '#9b6700' : '#203032', strokeWidth: face.selected ? 2 : 1.2 }); }),
        props.reveal && h('g', { 'data-walk-rotation-comparison': true }, comparison, h('text', { x: 400, y: 548, textAnchor: 'middle', fontSize: 24, fill: '#203032' }, t('rotation_copy', 'Matching copy') + ': ' + rotationMatch(state.rotation.round))));
    }
    if (state.activity === 'change') {
      function project(point) { var k = 760 / (9 - point.z); return { x: 400 + (point.x - 84) * k, y: 330 - (point.y - 1.65) * k }; }
      function shape(item, outline) {
        var c = project(item), k = 760 / (9 - item.z), color = '#' + item.color.toString(16).padStart(6, '0'), children = [];
        if (item.shape === 'box') {
          var radians = item.rotation * Math.PI / 180, corners = [], world = [];
          [-1, 1].forEach(function (y) { [-1, 1].forEach(function (z) { [-1, 1].forEach(function (x) {
            var dx = x * item.width / 2, dz = z * item.depth / 2;
            var point = { x: item.x + dx * Math.cos(radians) + dz * Math.sin(radians), y: item.y + y * item.height / 2, z: item.z - dx * Math.sin(radians) + dz * Math.cos(radians) };
            world.push(point); corners.push(project(point));
          }); }); });
          var normals = [[0, 0, -1], [1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 1, 0], [0, -1, 0]];
          [[0, 1, 5, 4], [1, 3, 7, 5], [2, 3, 7, 6], [0, 2, 6, 4], [4, 5, 7, 6], [0, 1, 3, 2]].forEach(function (indices, index) {
            var n = normals[index], nx = n[0] * Math.cos(radians) + n[2] * Math.sin(radians), nz = -n[0] * Math.sin(radians) + n[2] * Math.cos(radians), center = { x: 0, y: 0, z: 0 };
            indices.forEach(function (i) { center.x += world[i].x / 4; center.y += world[i].y / 4; center.z += world[i].z / 4; });
            if (!outline && nx * (84 - center.x) + n[1] * (1.65 - center.y) + nz * (9 - center.z) <= 0) return;
            children.push(h('polygon', { key: index, points: indices.map(function (i) { return corners[i].x + ',' + corners[i].y; }).join(' '), fill: outline ? 'none' : color, stroke: outline ? '#096a65' : '#203032', strokeWidth: outline ? 3 : 1.5, strokeDasharray: outline ? '6 4' : undefined }));
          });
        } else {
          children.push(h(item.shape === 'sphere' ? 'ellipse' : 'rect', Object.assign({ key: 'body', fill: outline ? 'none' : color, stroke: outline ? '#096a65' : '#203032', strokeWidth: outline ? 3 : 1.5, strokeDasharray: outline ? '6 4' : undefined }, item.shape === 'sphere' ? { cx: c.x, cy: c.y, rx: item.width * k / 2, ry: item.height * k / 2 } : { x: c.x - item.width * k / 2, y: c.y - item.height * k / 2, width: item.width * k, height: item.height * k, rx: 8 })));
          if (item.shape === 'cylinder') children.push(h('ellipse', { key: 'top', cx: c.x, cy: c.y - item.height * k / 2, rx: item.width * k / 2, ry: 8, fill: outline ? 'none' : color, stroke: outline ? '#096a65' : '#203032', strokeWidth: 1.5 }));
        }
        if (!outline) children.push(h('text', { key: 'label', x: c.x, y: c.y - item.height * k / 2 - 22, textAnchor: 'middle', fontSize: 26, fontWeight: 700, fill: '#203032' }, item.choice));
        return h('g', { key: (outline ? 'other-' : '') + item.choice }, children);
      }
      return h('svg', { className: 'pw-plan', viewBox: '0 0 800 600', role: 'img', 'aria-hidden': state.change.closed || undefined, 'aria-label': t('change_plan', 'Five objects in the current arrangement'), 'data-walk-plan': true, 'data-walk-change-plan': true },
        h('rect', { width: 800, height: 600, fill: '#f6f8f5' }), h('path', { d: 'M35 430 L765 430 L720 500 L80 500 Z', fill: '#d5dfdc', stroke: '#526466', strokeWidth: 2 }),
        changeObjects(state.change.round, state.change.variant).map(function (item) { return shape(item, false); }),
        props.reveal && shape(changeObjects(state.change.round, 1 - state.change.variant).find(function (item) { return item.choice === changeTarget(state.change.round); }), true));
    }
    if (state.activity === 'shadow') {
      var toX = function (x) { return 400 + (x - 72.5) * 125; }, toY = function (y) { return 525 - y * 125; };
      return h('svg', { className: 'pw-plan', viewBox: '0 0 800 600', role: 'img', 'aria-label': t('shadow_plan', 'Wall silhouette and its target outline'), 'data-walk-plan': true, 'data-walk-shadow-plan': true },
        h('rect', { width: 800, height: 600, fill: '#f6f8f5' }),
        shadowProfile(state.shadowAngle).map(function (row, index) { return h('rect', { key: 'actual-' + index, x: toX(row.left), y: toY(row.y + 0.35), width: (row.right - row.left) * 125, height: 87.5, fill: '#324d50' }); }),
        h('path', { d: shadowOutline(shadowProfile(90)).map(function (point, index) { return (index ? 'L' : 'M') + toX(point.x) + ' ' + toY(point.y); }).join(' ') + ' Z', fill: 'none', stroke: '#b84632', strokeWidth: 5 }),
        props.reveal && h('text', { x: 400, y: 565, textAnchor: 'middle', fontSize: 24, fill: '#203032' }, t('shadow_target_angle', 'Matching orientation') + ': 90\u00b0'));
    }
    if (state.activity === 'continuity') {
      var lineY = function (x, offset) { return 535 - (2.4 + 0.35 * (x - 60) + offset) * 100; };
      return h('svg', { className: 'pw-plan', viewBox: '0 0 800 600', role: 'img', 'aria-label': t('continuity_plan', 'Front view of diagonal rods interrupted by a screen'), 'data-walk-plan': true, 'data-walk-continuity-plan': true },
        h('rect', { width: 800, height: 600, fill: '#f6f8f5' }),
        h('line', { x1: 120, y1: lineY(57.2, 0), x2: 340, y2: lineY(59.4, 0), stroke: '#324d50', strokeWidth: 9, strokeLinecap: 'round' }),
        h('line', { x1: 460, y1: lineY(60.6, state.continuityOffset), x2: 680, y2: lineY(62.8, state.continuityOffset), stroke: '#208e87', strokeWidth: 9, strokeLinecap: 'round' }),
        props.reveal ? h('line', { x1: 340, y1: lineY(59.4, 0), x2: 680, y2: lineY(62.8, 0), stroke: '#e87967', strokeWidth: 3, strokeDasharray: '8 7' }) : h('rect', { x: 320, y: 45, width: 160, height: 480, fill: '#e9b342', stroke: '#324d50', strokeWidth: 2 }));
    }
    if (state.activity === 'contour' || state.activity === 'context') return h('svg', { className: 'pw-plan', viewBox: '0 0 800 600', role: 'img', 'aria-label': state.activity === 'contour' ? 'Front view of the four cutout pieces' : 'Four gray tiles and their surrounds', 'data-walk-plan': true },
      h('rect', { width: 800, height: 600, fill: '#f6f8f5' }),
      state.activity === 'contour' ? [[250, 150], [550, 150], [550, 450], [250, 450]].map(function (center, index) { return h('g', { key: index }, h('path', { d: 'M0 0 L57.45 57.45 A81.25 81.25 0 1 1 57.45 -57.45 Z', transform: 'translate(' + center.join(' ') + ') rotate(' + (-state.contour.angles[index]) + ')', fill: '#324d50' }), h('text', { x: center[0], y: center[1] - 100, textAnchor: 'middle', fontSize: 24, fill: '#203032' }, TILE_IDS[index])); }) : [[250, 175], [550, 175], [250, 425], [550, 425]].map(function (center, index) { var id = TILE_IDS[index]; return h('g', { key: id }, h('rect', { x: center[0] - 120, y: center[1] - 100, width: 240, height: 200, fill: state.context.neutral ? '#b8b8b8' : ['#ededed', '#ededed', '#202020', '#292929'][index], stroke: state.context.selected.indexOf(id) >= 0 ? '#096a65' : 'none', strokeWidth: 5 }), h('rect', { x: center[0] - 40, y: center[1] - 40, width: 80, height: 80, fill: ['#888888', '#a0a0a0', '#888888', '#707070'][index] }), h('text', { x: center[0], y: center[1] - 110, textAnchor: 'middle', fontSize: 24, fill: '#203032' }, id)); }),
      props.reveal && state.activity === 'contour' && h('rect', { x: 250, y: 150, width: 300, height: 300, fill: 'none', stroke: '#096a65', strokeWidth: 3 }));
    return h('svg', { className: 'pw-plan', viewBox: '0 0 3360 380', role: 'img', 'aria-label': t('plan_label', 'Plan of the challenge spaces and your current position'), 'data-walk-plan': true },
      h('rect', { x: 25, y: 20, width: 3310, height: 340, fill: '#e5edeb', stroke: '#506c68', strokeWidth: 2 }),
      [-12, 0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 144, 156, 168, 180, 192].map(function (x, index) { return h('text', { key: x, x: px(x), y: 43, textAnchor: 'middle', fill: '#203032', fontSize: 14, fontWeight: 700 }, ['Circle', 'Size', 'Screen', 'Depth', 'Corners', 'Context', 'Line', 'Shadow', 'Change', 'Rotation', 'Light', 'Shape', 'Motion', 'Frame', 'Crossings', 'Landing', 'Aperture', 'Length'][index]); }),
      [-3, 0, 3].map(function (z, index) { return h('line', { key: z, x1: px(-13.5), x2: px(-10.5), y1: pz(z), y2: pz(z), stroke: ['#147e78', '#c66b57', '#a8801d'][index], strokeWidth: 5 }); }),
      h('rect', { x: px(-1.45), y: pz(-3.3), width: 15, height: 9, fill: '#c66b57' }), h('rect', { x: px(0.7), y: pz(state.blockZ - 0.25), width: 7.5, height: 7.5, fill: '#147e78' }),
      h('rect', { x: px(10), y: pz(1.8), width: 60, height: 6, fill: '#43565d' }), [0, 1, 2].map(function (id) { return h('circle', { key: id, cx: px(10.5 + id * 1.5), cy: pz(-1.5), r: 5, fill: state.collected.indexOf(id) >= 0 ? '#b2bdb9' : ['#e9b342', '#208e87', '#e87967'][id] }); }),
      props.reveal && state.activity === 'ring' && h('circle', { cx: px(-12), cy: pz(9), r: 8, fill: 'none', stroke: '#096a65', strokeWidth: 2 }),
      [[22.4, 1, 0.56, '#e87967'], [24, -3, 0.84, '#e9b342'], [25.8, 4, 0.35, '#208e87']].map(function (sphere, index) { return h('g', { key: index }, h('circle', { cx: px(sphere[0]), cy: pz(sphere[1]), r: sphere[2] * scale, fill: sphere[3], stroke: '#203032' }), h('text', { x: px(sphere[0]) + 15, y: pz(sphere[1]) + 4, fontSize: 13, fill: '#203032' }, ['A', 'B', 'C'][index])); }),
      h('rect', { x: px(22.8), y: pz(8.5), width: 39, height: 37.5, fill: 'none', stroke: '#526466', strokeDasharray: '3 3' }),
      state.parallax.samples.map(function (sample, index) { return h('text', { key: index, x: px(sample.x), y: pz(sample.z) - 10, textAnchor: 'middle', fill: '#096a65', fontSize: 13 }, index + 1); }),
      [36, 48].map(function (x) { return h('line', { key: x, x1: px(x - 2.8), x2: px(x + 2.8), y1: pz(0), y2: pz(0), stroke: '#324d50', strokeWidth: 4 }); }),
      h('line', { x1: px(57.2), x2: px(62.8), y1: pz(0), y2: pz(0), stroke: '#208e87', strokeWidth: 4 }),
      h('rect', { x: px(59.2), y: pz(0.14), width: 24, height: 5, fill: '#e9b342' }),
      h('rect', { x: px(68), y: pz(-4.2), width: 135, height: 5, fill: '#324d50' }), h('circle', { cx: px(70), cy: pz(1), r: 24, fill: '#208e87' }),
      h('rect', { x: px(79.8), y: pz(-1.4), width: 126, height: 60, fill: '#adbdb6' }), changeObjects(state.change.round, state.change.variant).map(function (item) { return h('circle', { key: item.id, cx: px(item.x), cy: pz(item.z), r: 5, fill: '#' + item.color.toString(16).padStart(6, '0') }); }),
      [92.5, 96, 99.5].map(function (x) { return h('circle', { key: x, cx: px(x), cy: pz(0), r: 21, fill: '#208e87', stroke: '#203032' }); }),
      h('g', { transform: 'translate(' + px(p.x) + ' ' + pz(p.z) + ') rotate(' + p.yaw + ')' }, h('path', { d: 'M0 -12 L8 9 L0 5 L-8 9 Z', fill: '#203032', stroke: '#fff', strokeWidth: 2 })));
  }
  function Walk(props) {
    var ctx = props.ctx, React = ctx.React, h = React.createElement, state = normalize((ctx.toolData || {}).perceptionWalk), meta = activity(state.activity), reading = evidence(state), progress = state.progress[meta.id];
    var uid = React.useId(), statusPair = React.useState(''), status = statusPair[0], setStatus = statusPair[1], diagramPair = React.useState(false), diagram = diagramPair[0], setDiagram = diagramPair[1];
    var renderPair = React.useState('idle'), renderStatus = renderPair[0], setRenderStatus = renderPair[1], retryPair = React.useState(0), retry = retryPair[0], setRetry = retryPair[1];
    var revealPair = React.useState(false), reveal = revealPair[0], setReveal = revealPair[1], selectedPair = React.useState(false), selected = selectedPair[0], setSelected = selectedPair[1];
    var layoutPair = React.useState([]), layout = layoutPair[0], setLayout = layoutPair[1];
    var roomsPair = React.useState(false), allRooms = roomsPair[0], setAllRooms = roomsPair[1];
    var lockPair = React.useState(false), mouseLook = lockPair[0], setMouseLook = lockPair[1], lockRequested = React.useRef(false), lockOwner = React.useRef(false), lockButton = React.useRef(null), lockTarget = React.useRef(null), lockTicket = React.useRef(0), lockPromise = React.useRef(false);
    var playingPair = React.useState(false), motionPlaying = playingPair[0], setMotionPlaying = playingPair[1], motionTimer = React.useRef(null);
    var motionMedia = React.useMemo(function () { return typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null; }, []);
    var reducedPair = React.useState(function () { return !!(motionMedia && motionMedia.matches); }), reducedMotion = reducedPair[0], setReducedMotion = reducedPair[1];
    var host = React.useRef(null), root = React.useRef(null), viewer = React.useRef(null), latest = React.useRef(state), sceneLatest = React.useRef(null), drag = React.useRef(null), hold = React.useRef(null), focusStation = React.useRef(null);
    latest.current = state;
    var reliefView = reliefInspection(state), shapeView = shapeInspection(state);
    var inspection = !diagram && renderStatus === 'ready' ? rotationInspection(state) : null, referenceInspection = !!inspection && inspection.choice === 'R';
    function t(key, fallback) { var translated; try { translated = ctx.t && ctx.t('stem.perception.walk_' + key, fallback); } catch (_) {} return typeof translated === 'string' && translated !== 'stem.perception.walk_' + key ? translated : fallback; }
    function update(fn) { var setter = ctx.setToolData || ctx.setLabToolData; if (setter) setter(function (prev) { return Object.assign({}, prev, { perceptionWalk: normalize(fn(normalize((prev || {}).perceptionWalk))) }); }); }
    function icon(name, fallback) { var Icon = (ctx.icons || {})[name] || (window.LucideReact || {})[name]; return Icon ? h(Icon, { size: 20, 'aria-hidden': true, focusable: false }) : h('span', { 'aria-hidden': true }, fallback); }
    function button(label, handler, attrs) { return h('button', Object.assign({ type: 'button', onClick: handler }, attrs || {}), label); }
    function pauseMotion() { setMotionPlaying(false); if (motionTimer.current != null) { clearInterval(motionTimer.current); motionTimer.current = null; } }
    function releaseMouse() { lockRequested.current = false; lockTicket.current++; var target = lockTarget.current; if (target && document.pointerLockElement === target && document.exitPointerLock) document.exitPointerLock(); }
    function stop() { releaseMouse(); pauseMotion(); if (hold.current != null) { clearInterval(hold.current); hold.current = null; } drag.current = null; }
    function toggleMouseLook() {
      if (mouseLook || lockRequested.current) { releaseMouse(); return; }
      var target = host.current;
      if (!target || !target.requestPointerLock || diagram || renderStatus !== 'ready' || covered(latest.current)) return;
      stop(); lockRequested.current = true; lockPromise.current = false; lockTarget.current = target; var ticket = ++lockTicket.current; setStatus('');
      function failed() { if (!lockRequested.current || ticket !== lockTicket.current) return; lockRequested.current = false; setStatus(t('mouse_look_failed', 'Mouse look is unavailable.')); }
      try {
        var request = target.requestPointerLock();
        if (request && typeof request.then === 'function') { lockPromise.current = true; request.then(function () { if (!lockRequested.current && document.pointerLockElement === target && document.exitPointerLock) document.exitPointerLock(); }, failed); }
      } catch (_) { failed(); }
    }
    function covered(current) { return viewpointLocked(current); }
    function viewpointAction(action, slot) {
      var current = latest.current, pose = current.viewpoints[current.activity][slot];
      if (covered(current) || action === 'save' && !canSaveViewpoint(current) || action !== 'save' && !pose) return;
      stop();
      var adjusted = action === 'recall' && !sameViewpoint(pose, safePlayer(pose, current.blockZ));
      update(function (next) { return action === 'save' ? saveViewpoint(next, slot) : action === 'recall' ? recallViewpoint(next, slot) : clearViewpoint(next, slot); });
      var key = action === 'save' ? 'viewpoint_saved' : action === 'clear' ? 'viewpoint_cleared' : adjusted ? 'viewpoint_adjusted' : 'viewpoint_recalled';
      var message = action === 'save' ? 'Viewpoint {slot} saved.' : action === 'clear' ? 'Viewpoint {slot} cleared.' : adjusted ? 'Viewpoint {slot} recalled beside an obstacle.' : 'Viewpoint {slot} recalled.';
      setStatus(t(key, message).replace('{slot}', slot));
    }
    function move(command, precise) { pauseMotion(); drag.current = null; update(function (next) { if (covered(next)) return next; var fine = precise || next.precise; next.player = movePlayer(next.player, command, command.indexOf('turn') === 0 || command.indexOf('look') === 0 ? fine ? 1 : 5 : fine ? 0.05 : 0.2, next.blockZ); next.activity = roomAtX(next.player.x); return next; }); }
    React.useEffect(function () { setReveal(false); setSelected(false); setStatus(''); }, [state.activity]);
    React.useEffect(function () {
      if (!root.current || allRooms) return;
      var target = root.current.querySelector('[data-walk-activity="' + state.activity + '"]'), nav = target && target.parentElement;
      if (!nav) return;
      // Scroll only the room strip, never the surrounding lesson or page.
      function keepVisible() {
        var roomRect = target.getBoundingClientRect(), navRect = nav.getBoundingClientRect();
        if (roomRect.left < navRect.left) nav.scrollLeft += roomRect.left - navRect.left - 4;
        else if (roomRect.right > navRect.right) nav.scrollLeft += roomRect.right - navRect.right + 4;
      }
      keepVisible();
      if (typeof ResizeObserver === 'function') { var observer = new ResizeObserver(keepVisible); observer.observe(nav); return function () { observer.disconnect(); }; }
      window.addEventListener('resize', keepVisible); return function () { window.removeEventListener('resize', keepVisible); };
    }, [state.activity, allRooms]);
    React.useEffect(function () {
      function changed() {
        var owned = !!host.current && document.pointerLockElement === host.current;
        if (owned && !lockRequested.current) { releaseMouse(); return; }
        var wasOwned = lockOwner.current; lockOwner.current = owned; setMouseLook(owned); drag.current = null;
        if (owned) { host.current.focus({ preventScroll: true }); }
        else if (wasOwned) {
          lockRequested.current = false; pauseMotion();
          if (hold.current != null) { clearInterval(hold.current); hold.current = null; }
          if (document.activeElement === host.current && lockButton.current) lockButton.current.focus({ preventScroll: true });
        }
      }
      function failed() { if (lockRequested.current && !lockPromise.current) { lockRequested.current = false; setStatus(t('mouse_look_failed', 'Mouse look is unavailable.')); } }
      function look(event) {
        if (!lockRequested.current || !host.current || document.pointerLockElement !== host.current || covered(latest.current)) return;
        var dx = number(event.movementX, 0, -1000, 1000), dy = number(event.movementY, 0, -1000, 1000);
        if (!dx && !dy) return;
        update(function (next) { var sensitivity = next.precise ? 0.25 : 1; next.player = normalizePlayer(Object.assign({}, next.player, { yaw: next.player.yaw + dx * 0.2 * sensitivity, pitch: next.player.pitch - dy * 0.17 * sensitivity })); return next; });
      }
      document.addEventListener('pointerlockchange', changed); document.addEventListener('pointerlockerror', failed); document.addEventListener('mousemove', look);
      return function () { releaseMouse(); document.removeEventListener('pointerlockchange', changed); document.removeEventListener('pointerlockerror', failed); document.removeEventListener('mousemove', look); };
    }, []);
    React.useEffect(function () { if (!focusStation.current || !root.current) return; var target = root.current.querySelector('[data-walk-activity="' + focusStation.current + '"]'); focusStation.current = null; if (target) target.focus({ preventScroll: true }); });
    React.useEffect(function () { function pause() { if (document.hidden) stop(); } window.addEventListener('blur', stop); document.addEventListener('visibilitychange', pause); return function () { stop(); window.removeEventListener('blur', stop); document.removeEventListener('visibilitychange', pause); }; }, []);
    React.useEffect(function () {
      if (!motionMedia) return;
      function changed() { setReducedMotion(motionMedia.matches); if (motionMedia.matches) pauseMotion(); }
      if (motionMedia.addEventListener) motionMedia.addEventListener('change', changed); else if (motionMedia.addListener) motionMedia.addListener(changed);
      return function () { if (motionMedia.removeEventListener) motionMedia.removeEventListener('change', changed); else if (motionMedia.removeListener) motionMedia.removeListener(changed); };
    }, [motionMedia]);
    React.useEffect(function () {
      if (!motionPlaying) return;
      if ((state.activity !== 'motion' && state.activity !== 'aperture') || !(state.activity === 'aperture' ? canObserveAperture(state) : canObserveMotion(state)) || diagram || renderStatus !== 'ready' || reducedMotion || document.hidden) { pauseMotion(); return; }
      motionTimer.current = setInterval(function () { update(function (next) { return next.activity === 'aperture' ? setAperturePhase(next, next.aperture.phase + 2.25 * next.aperture.speed) : setMotionPhase(next, next.motion.phase + 2.25); }); }, 50);
      return function () { if (motionTimer.current != null) clearInterval(motionTimer.current); motionTimer.current = null; };
    }, [motionPlaying, state.activity, state.motion.round, state.aperture.round, canObserveAperture(state), canObserveMotion(state), diagram, renderStatus, reducedMotion]);
    var sceneData = { player: state.player, activity: state.activity, blockZ: state.blockZ, continuityOffset: state.continuityOffset, shadowAngle: state.shadowAngle, changeRound: state.change.round, changeVariant: state.change.variant, changeSelected: state.change.selected, collected: state.collected, parallaxChoice: state.parallax.choice, contourAngles: state.contour.angles, contourSelected: state.contour.selected, contextNeutral: state.context.neutral, contextSelected: state.context.selected, reveal: reveal, selected: selected, static: true, sig: [state.activity, state.blockZ, state.continuityOffset, state.shadowAngle, state.change.round, state.change.variant, state.change.selected, state.collected.join(','), state.parallax.choice, state.contour.angles.join(','), state.contour.selected, state.context.neutral, state.context.selected.join(','), reveal, selected].join(':') };
    Object.assign(sceneData, { rotationRound: state.rotation.round, rotationAngles: state.rotation.angles, rotationTilts: state.rotation.tilts, rotationSelected: state.rotation.selected, rotationChoice: state.rotation.choice, reliefRound: state.relief.round, reliefAngle: state.relief.lightAngle, reliefChoice: state.relief.choice, shapeRound: state.shape.round, shapeAngles: state.shape.angles, shapeTilts: state.shape.tilts, shapeSelected: state.shape.selected, shapeChoice: state.shape.choice, motionRound: state.motion.round, motionPhase: state.motion.phase, motionSelected: state.motion.selected, frameRound: state.frame.round, frameAdjustment: state.frame.adjustment, frameSurround: state.frame.surround, frameVisible: state.frame.visible, weaveRound: state.weave.round, weaveDepths: state.weave.depths, weaveSelected: state.weave.selected, landingRound: state.landing.round, landingLightAngle: state.landing.lightAngle, landingHeights: state.landing.heights, landingSelected: state.landing.selected, apertureRound: state.aperture.round, aperturePhase: state.aperture.phase, apertureMasked: state.aperture.masked, apertureChoice: state.aperture.choice, lengthRound: state.length.round, lengthValue: state.length.value, lengthVisible: state.length.visible });
    sceneData.sig += ':' + [state.rotation.round, state.rotation.angles.join(','), state.rotation.tilts.join(','), state.rotation.selected, state.rotation.choice, state.relief.round, state.relief.choice, state.shape.round, state.shape.selected, state.shape.choice, state.motion.round, state.motion.selected.join(','), state.frame.round, state.frame.visible, state.weave.round, state.weave.selected, state.landing.round, state.landing.selected, state.aperture.round, state.aperture.masked, state.length.round, state.length.visible].join(':');
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
    React.useEffect(function () { if (viewer.current) viewer.current.push(sceneData); }, [state.player.x, state.player.z, state.player.yaw, state.player.pitch, state.relief.lightAngle, state.shape.angles.join(','), state.shape.tilts.join(','), state.motion.phase, state.frame.adjustment, state.frame.surround, state.weave.depths.join(','), state.landing.heights.join(','), state.landing.lightAngle, state.aperture.phase, state.aperture.choice, state.length.value, sceneData.sig, diagram, retry]);
    function choose(id, focus) { stop(); if (focus) focusStation.current = id; setReveal(false); setSelected(false); setStatus(''); update(function (next) { next.activity = id; next.player = spawn(id); return next; }); }
    function travel(direction, unsolved) { var id = nextRoom(state, direction, unsolved); if (id) choose(id, !nextRoom(Object.assign({}, state, { activity: id }), direction, unsolved)); }
    function home() { stop(); update(function (next) { if (!covered(next)) next.player = spawn(next.activity); return next; }); setStatus(''); }
    function face() { stop(); update(function (next) { if (!covered(next)) next.player = faceExhibit(next); return next; }); setStatus(''); }
    function record() {
      stop(); var next = recordView(state), count = next.parallax.samples.length;
      if (count > state.parallax.samples.length) { update(recordView); setStatus(count === 1 ? t('view_first', 'First straight-ahead view recorded.') : t('view_second', 'Second view recorded. Compare the spheres.')); }
      else setStatus(!observationArea(state.player) ? t('view_area', 'The viewpoint must be inside the marked observation area.') : t('view_baseline', 'A second view needs at least 1.2 units sideways, with the same forward distance.'));
    }
    function revisit(index) { stop(); update(function (next) { if (next.parallax.samples[index]) next.player = Object.assign({}, next.parallax.samples[index]); return next; }); setStatus(''); }
    function selectSphere(choice) { update(function (next) { next.parallax.choice = choice; return next; }); setStatus(t('sphere_selected', 'Selected sphere') + ' ' + choice + '.'); }
    function selectCorner(index) { if (!canTurnCorner(latest.current, index)) { setStatus(t('corner_far', 'Move closer to the front of the cutout pieces.')); return; } update(function (next) { next.contour.selected = index; return next; }); setStatus(t('corner_selected', 'Selected piece') + ' ' + TILE_IDS[index] + '.'); }
    function changeCorner(index, value) { update(function (next) { return turnCorner(next, index, value); }); }
    function changeContinuation(value) { update(function (next) { return moveContinuation(next, value); }); setStatus(''); }
    function selectContinuation() { if (!canMoveContinuation(latest.current)) { setStatus(t('continuity_far', 'Move closer to the front of the rods.')); return; } setSelected(true); setStatus(t('continuity_selected', 'Right rod selected.')); }
    function changeShadow(value) { update(function (next) { return rotateShadow(next, value); }); setStatus(''); }
    function selectShadow() { if (!canRotateShadow(latest.current)) { setStatus(t('shadow_far', 'Move closer to the front of the sculpture.')); return; } setSelected(true); setStatus(t('shadow_selected', 'Sculpture selected.')); }
    function shutter() { stop(); update(toggleChangeShutter); setStatus(''); }
    function selectChanged(choice) { update(function (next) { return selectChange(next, choice); }); setStatus(''); }
    function nextChangeScene() { stop(); setReveal(false); setStatus(''); update(nextChange); }
    function selectRotation(index) { if (!canTurnRotation(latest.current, index)) { setStatus(t('rotation_far', 'Move closer to the front of the sculptures.')); return; } var view = !diagram && renderStatus === 'ready' ? rotationInspection(latest.current) : null; update(function (next) { if (view) return inspectRotation(next, index === 0 ? 'A' : 'B', view.side); next.rotation.selected = index; return next; }); setStatus(''); }
    function inspectSculpture(choice, side) { stop(); update(function (next) { return inspectRotation(next, choice, side); }); setStatus(''); if (host.current) host.current.focus({ preventScroll: true }); }
    function rotationOverview() { home(); if (host.current) host.current.focus({ preventScroll: true }); }
    function rotateSculpture(index, yaw, pitch) { update(function (next) { return turnRotation(next, index, yaw, pitch); }); setStatus(''); }
    function nextRotationPair() { stop(); setReveal(false); setStatus(''); update(nextRotation); }
    function changeReliefLight(value) { update(function (next) { return turnReliefLight(next, value); }); setStatus(''); }
    function selectRelief(choice) { update(function (next) { return chooseRelief(next, choice); }); setStatus(''); }
    function inspectSurface(choice, side) { stop(); update(function (next) { return inspectRelief(next, choice, side); }); setStatus(''); if (!diagram && renderStatus === 'ready' && host.current) host.current.focus({ preventScroll: true }); }
    function nextReliefPair() { stop(); setReveal(false); setStatus(''); update(nextRelief); }
    function selectShape(index) { if (!canTurnShape(latest.current, index)) { setStatus(t('shape_far', 'Move closer to the front of the hoops.')); return; } var view = shapeInspection(latest.current); update(function (next) { if (view) return inspectShape(next, index === 0 ? 'A' : 'B', view.side); next.shape.selected = index; return next; }); setStatus(''); }
    function inspectHoop(choice, side) { stop(); update(function (next) { return inspectShape(next, choice, side); }); setStatus(''); if (!diagram && renderStatus === 'ready' && host.current) host.current.focus({ preventScroll: true }); }
    function rotateHoop(index, yaw, pitch) { update(function (next) { return turnShape(next, index, yaw, pitch); }); setStatus(''); }
    function nextShapePair() { stop(); setReveal(false); setStatus(''); update(nextShape); }
    function changeMotionPhase(value) { pauseMotion(); update(function (next) { return setMotionPhase(next, value); }); setStatus(''); }
    function selectMotion(choice) { pauseMotion(); if (state.motion.selected.indexOf(choice) < 0 && state.motion.selected.length >= 3) { setStatus(t('motion_limit', 'Three spheres are selected. Unselect one before choosing another.')); return; } update(function (next) { return toggleMotion(next, choice); }); setStatus(''); }
    function nextMotionPattern() { stop(); setReveal(false); setStatus(''); update(nextMotion); }
    function changeFrameAdjustment(value) { update(function (next) { return setFrameAdjustment(next, value); }); setStatus(''); }
    function changeFrameSurround(value) { update(function (next) { return setFrameSurround(next, value); }); setStatus(''); }
    function changeFrameVisible(value) { stop(); update(function (next) { return setFrameVisible(next, value); }); setStatus(''); }
    function nextFrameTrial() { stop(); setReveal(false); setStatus(''); update(nextFrame); }
    function selectWeavePiece(index) { update(function (next) { return selectWeave(next, index); }); setStatus(''); }
    function changeAperturePhase(value) { pauseMotion(); update(function (next) { return setAperturePhase(next, value); }); setStatus(''); }
    function changeApertureSpeed(value) { update(function (next) { return setApertureSpeed(next, value); }); setStatus(''); }
    function stepApertureDial() { pauseMotion(); update(function (next) { return setAperturePhase(next, next.aperture.phase + (next.precise ? 5 : 30)); }); setStatus(''); }
    function changeApertureMask(value) { pauseMotion(); update(function (next) { return toggleApertureMask(next, value); }); setStatus(''); }
    function chooseApertureAxis(choice) { pauseMotion(); update(function (next) { return selectApertureAxis(next, choice); }); setStatus(''); }
    function inspectApertureView(side) { stop(); update(function (next) { return inspectAperture(next, side); }); setStatus(''); }
    function nextApertureTrial() { stop(); setReveal(false); setStatus(''); update(nextAperture); }
    function selectLandingPiece(index) { update(function (next) { return selectLanding(next, index); }); setStatus(''); }
    function changeLandingHeight(index, value) { update(function (next) { return setLandingHeight(next, index, value); }); setStatus(''); }
    function changeLandingLight(value) { update(function (next) { return setLandingLight(next, value); }); setStatus(''); }
    function inspectLandingView(side) { stop(); update(function (next) { return inspectLanding(next, side); }); setStatus(''); }
    function nextLandingPattern() { stop(); setReveal(false); setStatus(''); update(nextLanding); }
    function changeWeaveDepth(index, value) { update(function (next) { return setWeaveDepth(next, index, value); }); setStatus(''); }
    function inspectWeaveView(side) { stop(); update(function (next) { return inspectWeave(next, side); }); setStatus(''); }
    function recordWeaveObservation() { stop(); update(recordWeaveView); setStatus(weaveView(state) ? t('weave_recorded', 'Observation recorded for this arrangement.') : t('weave_view_needed', 'Use a front or side observation position.')); }
    function nextWeavePattern() { stop(); setReveal(false); setStatus(''); update(nextWeave); }
    function toggleMotionPlayback() { var wasPlaying = motionPlaying; stop(); if (!wasPlaying && !reducedMotion && !(motionMedia && motionMedia.matches) && !diagram && renderStatus === 'ready' && (state.activity === 'aperture' ? canObserveAperture(state) : canObserveMotion(state)) && !document.hidden) setMotionPlaying(true); }
    function selectTile(choice) { var selected = latest.current.context.selected; if (selected.indexOf(choice) < 0 && selected.length >= 2) { setStatus(t('two_tiles', 'Two tiles are selected. Unselect one before choosing another.')); return; } update(function (next) { return toggleTile(next, choice); }); setStatus(''); }
    function neutralSurround(value) { stop(); update(function (next) { next.context.neutral = typeof value === 'boolean' ? value : !next.context.neutral; return next; }); setStatus(t('surround_changed', 'Surround changed. The center tiles remain unchanged.')); }
    function collect(id) { if (!canCollect(latest.current, id)) { setStatus(t('hidden', 'That symbol is hidden or out of reach.')); return; } update(function (next) { if (canCollect(next, id)) next.collected.push(id); return next; }); setStatus(t('collected', 'Symbol collected.')); }
    function nearBlock(current) { return Math.hypot(current.player.x - 0.95, current.player.z - current.blockZ) <= 7.00000001; }
    function pick(x, y) { if (covered(latest.current) || !viewer.current || !viewer.current.pick) return; var hit = viewer.current.pick(x, y); if (!hit) { setStatus(t('nothing', 'No reachable object at this point.')); return; } if (hit.id === 'scale-block') { setSelected(true); setStatus(t('selected', 'Teal block selected.')); } else if (hit.id === 'length-fins') changeLengthVisible(); else if (hit.id === 'length-rod' || hit.id === 'length-handle') stepLengthHandle(); else if (hit.id === 'aperture-screen') changeApertureMask(); else if (hit.id === 'aperture-dial') stepApertureDial(); else if (/^landing-[ABC]$/.test(hit.id)) selectLandingPiece(hit.id.charCodeAt(8) - 65); else if (/^weave-[ABC]$/.test(hit.id)) selectWeavePiece(hit.id.charCodeAt(6) - 65); else if (/^weave-rail-[012]$/.test(hit.id)) selectWeavePiece(Number(hit.id.slice(-1))); else if (hit.id === 'frame-rod' || hit.id === 'frame-surround') setStatus(''); else if (/^motion-[A-F]$/.test(hit.id)) selectMotion(hit.id.slice(-1)); else if (hit.id === 'motion-dial') setStatus(''); else if (/^shape-[AB]$/.test(hit.id)) selectShape(hit.id === 'shape-A' ? 0 : 1); else if (/^relief-[AB]$/.test(hit.id)) selectRelief(hit.id.slice(-1)); else if (hit.id === 'relief-light') setStatus(''); else if (/^rotation-[AB]$/.test(hit.id)) selectRotation(hit.id === 'rotation-A' ? 0 : 1); else if (hit.id === 'continuity-rod') selectContinuation(); else if (/^shadow-block-\d+$/.test(hit.id)) selectShadow(); else if (/^change-[ABCDE]$/.test(hit.id)) selectChanged(hit.id.slice(-1)); else if (/^token-[012]$/.test(hit.id)) collect(Number(hit.id.slice(-1))); else if (/^parallax-[ABC]$/.test(hit.id)) selectSphere(hit.id.slice(-1)); else if (/^contour-[0123]$/.test(hit.id)) selectCorner(Number(hit.id.slice(-1))); else if (/^context-[ABCD]$/.test(hit.id)) selectTile(hit.id.slice(-1)); else if (hit.id === 'context-switch') neutralSurround(); }
    function interact() { if (diagram || renderStatus !== 'ready') { if (state.activity === 'scale' && nearBlock(state)) setSelected(true); return; } var rect = host.current.getBoundingClientRect(); pick(rect.left + rect.width / 2, rect.top + rect.height / 2); }
    function changeBlock(value) { update(function (next) { return moveBlock(next, value); }); }
    function changeLengthValue(value) { update(function (next) { return setLengthValue(next, value); }); setStatus(''); }
    function changeLengthVisible(value) { stop(); update(function (next) { return setLengthVisible(next, value); }); setStatus(''); }
    function stepLengthHandle() { var current = latest.current; changeLengthValue(current.length.value + (current.precise ? 0.025 : 0.1)); }
    function nextLengthTrial() { stop(); setReveal(false); setStatus(''); update(nextLength); }
    function inspectLengthView(side) { stop(); update(function (next) { return inspectLength(next, side); }); setStatus(''); if (!diagram && renderStatus === 'ready' && host.current) host.current.focus({ preventScroll: true }); }
    function check() {
      pauseMotion();
      if (state.activity === 'length') {
        var lengthResult = checkLength(state);
        setStatus(!canObserveLength(state) ? t('length_face', 'Face the shafts from an observation area.') : state.length.seen !== 3 ? t('length_compare', 'Compare the current shaft with the fins shown and hidden.') : lengthMatches(state) ? progress.assisted ? t('explored', 'Challenge explored with a reveal.') : lengthResult.progress.length.solved ? t('solved', 'Challenge solved.') : t('length_found', 'Lengths matched. The next arrangement is ready.') : t('length_again', 'The straight shafts have different lengths. Compare their endpoints.'));
        update(checkLength); return;
      }
      if (state.activity === 'aperture') {
        var apertureResult = checkAperture(state), a = state.aperture;
        setStatus(!canObserveAperture(state) ? t('aperture_face', 'Face the rod from an observation area.') : apertureSeen(a.seenMasked) < 2 || apertureSeen(a.seenOpen) < 2 ? t('aperture_compare', 'Compare at least two separated positions with the screen closed and open.') : !a.choice ? t('aperture_choose', 'Choose the actual motion axis of the rod.') : apertureMatches(state) ? progress.assisted ? t('explored', 'Challenge explored with a reveal.') : apertureResult.progress.aperture.solved ? t('solved', 'Challenge solved.') : t('aperture_found', 'Motion identified. The next trial is ready.') : t('aperture_again', 'Follow an endpoint with the screen open and compare its path.'));
        update(checkAperture); return;
      }
      if (state.activity === 'landing') {
        var landingResult = checkLanding(state);
        setStatus(!canManipulateLanding(state) ? t('landing_face', 'Face the spheres from an observation area.') : landingMatches(state) ? progress.assisted ? t('explored', 'Challenge explored with a reveal.') : landingResult.progress.landing.solved ? t('solved', 'Challenge solved.') : t('landing_found', 'Shadows aligned. The next lighting arrangement is ready.') : t('landing_again', 'Compare each shadow with its floor target.'));
        update(checkLanding); return;
      }
      if (state.activity === 'weave') {
        var weaveResult = checkWeave(state);
        setStatus(!canManipulateWeave(state) ? t('weave_face', 'Face the beams from an observation area.') : state.weave.seen !== 3 ? t('weave_observe', 'Record both a front and a side view of the current arrangement before checking.') : weaveMatches(state) ? progress.assisted ? t('explored', 'Challenge explored with a reveal.') : weaveResult.progress.weave.solved ? t('solved', 'Challenge solved.') : t('weave_found', 'Crossing order matched. The next pattern is ready.') : t('weave_again', 'Compare the crossing order and leave a clear gap between each beam.'));
        update(checkWeave); return;
      }
      if (state.activity === 'frame') {
        var frameResult = checkFrame(state);
        setStatus(!canObserveFrame(state) ? t('frame_view', 'Face the rod from the front observation area.') : state.frame.seen !== 3 ? t('frame_compare', 'Compare the rod with the frame shown and hidden before checking.') : frameMatches(state) ? progress.assisted ? t('explored', 'Challenge explored with a reveal.') : frameResult.progress.frame.solved ? t('solved', 'Challenge solved.') : t('frame_found', 'Alignment found. The horizontal trial is ready.') : t('frame_again', 'The rod is still tilted from the target direction. Compare it against the room with the frame hidden.'));
        update(checkFrame); return;
      }
      if (state.activity === 'motion') {
        var motionResult = checkMotion(state);
        setStatus(!canObserveMotion(state) ? t('motion_view', 'Face the spheres from the front observation area.') : observedMotion(state) < 3 ? t('motion_observe', 'Compare at least three separated phases of the motion before checking.') : state.motion.selected.length !== 3 ? t('motion_choose', 'Choose three spheres that travel together.') : motionMatches(state) ? progress.assisted ? t('explored', 'Challenge explored with a reveal.') : motionResult.progress.motion.solved ? t('solved', 'Challenge solved.') : t('motion_found', 'Shared motion found. The next pattern is ready.') : t('motion_again', 'These spheres do not all travel together. Compare how their spacing changes.'));
        update(checkMotion); return;
      }
      if (state.activity === 'shape') {
        var shapeResult = checkShape(state), matches = shapeMatches(state);
        setStatus(!state.shape.choice ? t('shape_choose', 'Choose the hoop whose physical shape is a circle.') : matches ? progress.assisted ? t('explored', 'Challenge explored with a reveal.') : shapeResult.progress.shape.solved ? t('solved', 'Challenge solved.') : t('shape_found', 'Circle found. The next pair is ready.') : state.shape.choice === shapeTarget(state.shape.round) ? t('shape_view', 'Face the hoops from the front or an inspection viewpoint.') : t('shape_retry', 'That hoop is an oval. Compare its shape from another direction.'));
        update(checkShape); return;
      }
      if (state.activity === 'relief') {
        var result = checkRelief(state);
        setStatus(!canObserveRelief(state) ? t('relief_view', 'Face the surfaces from the front or an inspection viewpoint.') : state.relief.seen !== 3 ? t('relief_both', 'Compare the surfaces with light from above and below before checking.') : !state.relief.choice ? t('relief_choose', 'Choose the surface with a hollow center.') : reliefMatches(state) ? progress.assisted ? t('explored', 'Challenge explored with a reveal.') : result.progress.relief.solved ? t('solved', 'Challenge solved.') : t('relief_found', 'Hollow surface found. The next pair is ready.') : t('relief_again', 'That surface is raised. Compare its depth from a side viewpoint.'));
        update(checkRelief); return;
      }
      if (state.activity === 'rotation') {
        var matchedRotation = rotationMatches(state), rotationResult = checkRotation(state);
        setStatus(!state.rotation.choice ? t('rotation_choose', 'Choose the sculpture with the same shape as R.') : matchedRotation ? progress.assisted ? t('explored', 'Challenge explored with a reveal.') : rotationResult.progress.rotation.solved ? t('solved', 'Challenge solved.') : t('rotation_found', 'Matching copy found. The next pair is ready.') : state.rotation.choice === rotationMatch(state.rotation.round) ? t('rotation_view', 'Return to the front observation area and face the sculptures.') : t('rotation_again', 'That sculpture is a mirror image. Compare how its bends turn in depth.'));
        update(checkRotation); return;
      }
      if (state.activity === 'change') {
        var c = state.change, matched = changeMatches(state), checked = checkChange(state);
        setStatus(c.closed ? t('change_open_first', 'Open the shutter before checking.') : !canObserveChange(state) ? t('change_view', 'Return to the front observation area and face the display.') : c.seen !== 3 ? t('change_both', 'Compare both arrangements before checking.') : !c.selected ? t('change_choose', 'Select the object that changed.') : matched ? progress.assisted ? t('explored', 'Challenge explored with a reveal.') : checked.progress.change.solved ? t('solved', 'Challenge solved.') : t('change_found', 'Change found. The next scene is ready.') : t('change_again', 'That object stayed the same. Compare the two arrangements again.'));
        update(checkChange); return;
      }
      var correct = checkAnswer(state), message;
      if (state.activity === 'ring' && !reading.ringFacing || state.activity === 'scale' && (!reading.scaleFacing || reading.scaleRatio == null) || state.activity === 'contour' && !reading.contourFacing) message = t('face_again', 'The exhibit is out of view. Face the exhibit to compare it.');
      else if (correct) message = progress.assisted ? t('explored', 'Challenge explored with a reveal.') : t('solved', 'Challenge solved.');
      else if (state.activity === 'ring') message = t('ring_again', 'The arcs are still separated. Try another position and face the circle.');
      else if (state.activity === 'scale') message = t('scale_again', 'The apparent heights differ. Compare their distance as well as their size.');
      else if (state.activity === 'parallax') message = state.parallax.samples.length < 2 ? t('views_needed', 'Two separated viewpoints are needed before checking.') : !state.parallax.choice ? t('choice_needed', 'Choose the sphere you think is nearest.') : t('parallax_again', 'Compare again: which sphere shifts farthest between the two views?');
      else if (state.activity === 'contour') message = reading.contourAligned < 4 ? t('contour_again', 'Some openings still face away from the center.') : !state.contour.choice ? t('shape_needed', 'Choose the shape you see in the empty center.') : t('shape_again', 'Compare the implied edges again.');
      else if (state.activity === 'context') message = state.context.selected.length < 2 ? t('pair_needed', 'Choose two center tiles to compare.') : t('context_again', 'These tiles use different grays. Compare them with a neutral surround.');
      else if (state.activity === 'continuity') message = !reading.continuityFacing ? t('continuity_view', 'Return to the marked viewpoint and face the rods before checking.') : t('continuity_again', 'The fragments are not yet on the same straight line. Compare their direction across the screen.');
      else if (state.activity === 'shadow') message = !reading.shadowFacing ? t('shadow_view', 'Return to the marked observation area and face the wall before checking.') : t('shadow_again', 'Some shadow edges still extend beyond the outline or leave gaps. Compare all four levels.');
      else message = t('occlusion_again', 'There are still hidden symbols to uncover.');
      setStatus(message);
      if (correct) update(function (next) { if (checkAnswer(next) && !next.progress[next.activity].assisted) next.progress[next.activity].solved = true; return next; });
    }
    function reset() { stop(); setReveal(false); setSelected(false); setStatus(''); update(function (next) { next.player = spawn(next.activity); next.progress[next.activity] = { solved: false, assisted: false, hints: 0 }; if (next.activity === 'length') next.length = lengthDefaults(0); if (next.activity === 'aperture') next.aperture = apertureDefaults(0); if (next.activity === 'landing') next.landing = Object.assign(landingDefaults(0), { round: 0, completed: [] }); if (next.activity === 'weave') next.weave = Object.assign(weaveDefaults(0), { round: 0, seen: 0, completed: [] }); if (next.activity === 'frame') next.frame = Object.assign(frameDefaults(0), { round: 0, visible: true, seen: 1, completed: [] }); if (next.activity === 'motion') next.motion = { round: 0, phase: 0, seen: 1, selected: [], completed: [] }; if (next.activity === 'shape') next.shape = Object.assign(shapeDefaults(0), { round: 0, selected: 0, choice: '', completed: [] }); if (next.activity === 'relief') next.relief = { round: 0, lightAngle: 0, seen: 1, choice: '', completed: [] }; if (next.activity === 'scale') next.blockZ = -1; if (next.activity === 'occlusion') next.collected = []; if (next.activity === 'parallax') next.parallax = { samples: [], choice: '' }; if (next.activity === 'contour') next.contour = { angles: CORNER_DEFAULTS.slice(), selected: 0, choice: '' }; if (next.activity === 'context') next.context = { selected: [], neutral: false }; if (next.activity === 'continuity') next.continuityOffset = 0.8; if (next.activity === 'shadow') next.shadowAngle = 0; if (next.activity === 'change') next.change = { round: 0, variant: 0, closed: false, seen: 1, selected: '', completed: [] }; if (next.activity === 'rotation') next.rotation = { round: 0, angles: [125, 225], tilts: [20, -25], selected: 0, choice: '', completed: [] }; return next; }); }
    function hint() { update(function (next) { next.progress[next.activity].hints = Math.min(2, next.progress[next.activity].hints + 1); return next; }); }
    function revealPrinciple() { setMotionPlaying(false); setReveal(!reveal); if (!reveal) update(function (next) { if (next.activity === 'aperture') next.aperture.masked = false; if (['change', 'rotation', 'relief', 'shape', 'motion', 'frame', 'weave', 'landing', 'aperture', 'length'].indexOf(next.activity) < 0 || !next.progress[next.activity].solved) next.progress[next.activity].assisted = true; return next; }); }
    function keyDown(event) { if (event.ctrlKey || event.altKey || event.metaKey) return; var command = { w: 'forward', s: 'back', a: 'left', d: 'right', ArrowUp: 'forward', ArrowDown: 'back', ArrowLeft: 'turnLeft', ArrowRight: 'turnRight', PageUp: 'lookUp', PageDown: 'lookDown' }[event.key.length === 1 ? event.key.toLowerCase() : event.key]; if (command) { event.preventDefault(); move(command, event.shiftKey); } else if (event.key.toLowerCase() === 'e') { event.preventDefault(); if (!event.repeat) interact(); } else if (event.key === 'Escape' || event.key === 'Tab' && mouseLook) { var wasLocked = mouseLook; stop(); var target = wasLocked ? lockButton.current : root.current && root.current.querySelector('[data-walk-activity="' + state.activity + '"]'); if (target) { event.preventDefault(); target.focus({ preventScroll: true }); } } }
    function pointerDown(event) {
      if (event.button !== 0 || covered(latest.current) || diagram || renderStatus !== 'ready') return;
      if (document.pointerLockElement === host.current) { event.preventDefault(); interact(); return; }
      pauseMotion();
      event.currentTarget.focus({ preventScroll: true });
      var instance = viewer.current, hit = instance && instance.pick && instance.pick(event.clientX, event.clientY), block = hit && hit.id === 'scale-block' && nearBlock(latest.current);
      var corner = hit && /^contour-[0123]$/.test(hit.id) ? Number(hit.id.slice(-1)) : -1;
      if (!canTurnCorner(latest.current, corner)) corner = -1;
      var continuation = hit && hit.id === 'continuity-rod' && canMoveContinuation(latest.current);
      var shadow = hit && /^shadow-block-\d+$/.test(hit.id) && canRotateShadow(latest.current);
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, player: latest.current.player, moved: false, kind: block ? 'block' : corner >= 0 ? 'corner' : continuation ? 'continuation' : shadow ? 'shadow' : 'look', corner: corner, angle: shadow ? latest.current.shadowAngle : corner >= 0 ? latest.current.contour.angles[corner] : 0, blockZ: latest.current.blockZ, offset: latest.current.continuityOffset, height: continuation && instance.continuationCoordinate ? instance.continuationCoordinate(event.clientX, event.clientY) : null, track: block && instance.blockCoordinate ? instance.blockCoordinate(event.clientX, event.clientY) : null };
      var rotationIndex = hit && /^rotation-[AB]$/.test(hit.id) ? hit.id === 'rotation-A' ? 0 : 1 : -1;
      var shapeIndex = hit && /^shape-[AB]$/.test(hit.id) ? hit.id === 'shape-A' ? 0 : 1 : -1;
      var weaveIndex = hit && /^weave-[ABC]$/.test(hit.id) ? hit.id.charCodeAt(6) - 65 : hit && /^weave-rail-[012]$/.test(hit.id) ? Number(hit.id.slice(-1)) : -1;
      var landingIndex = hit && /^landing-[ABC]$/.test(hit.id) ? hit.id.charCodeAt(8) - 65 : -1;
      if (hit && /^length-(handle|rod)$/.test(hit.id) && canObserveLength(latest.current)) {
        var lengthStart = instance.lengthCoordinate ? instance.lengthCoordinate(event.clientX, event.clientY) : null;
        Object.assign(drag.current, { kind: 'length', value: latest.current.length.value, fine: latest.current.precise ? 0.25 : 1, coordinate: lengthStart, direction: Number.isFinite(lengthStart) && lengthStart < 192 ? -1 : 1 });
      }
      if (landingIndex >= 0 && canManipulateLanding(latest.current)) { Object.assign(drag.current, { kind: 'landing', landingIndex: landingIndex, height: latest.current.landing.heights[landingIndex], coordinate: instance.landingCoordinate ? instance.landingCoordinate(event.clientX, event.clientY, landingIndex) : null }); selectLandingPiece(landingIndex); }
      if (weaveIndex >= 0 && canManipulateWeave(latest.current)) { var rail = hit.id.indexOf('weave-rail-') === 0; Object.assign(drag.current, { kind: rail ? 'weave-rail' : 'weave', weaveIndex: weaveIndex, depth: latest.current.weave.depths[weaveIndex], coordinate: rail && instance.weaveCoordinate ? instance.weaveCoordinate(event.clientX, event.clientY, weaveIndex) : null }); selectWeavePiece(weaveIndex); }
      if (hit && (hit.id === 'frame-rod' || hit.id === 'frame-surround') && canObserveFrame(latest.current)) Object.assign(drag.current, { kind: hit.id, angle: hit.id === 'frame-rod' ? latest.current.frame.adjustment : latest.current.frame.surround, coordinate: instance.frameCoordinate ? instance.frameCoordinate(event.clientX, event.clientY) : null });
      if (hit && hit.id === 'motion-dial' && canObserveMotion(latest.current)) Object.assign(drag.current, { kind: 'motion', phase: latest.current.motion.phase, coordinate: instance.motionCoordinate ? instance.motionCoordinate(event.clientX, event.clientY) : null });
      if (hit && hit.id === 'aperture-dial' && canObserveAperture(latest.current)) Object.assign(drag.current, { kind: 'aperture', phase: latest.current.aperture.phase, fine: latest.current.precise ? 0.25 : 1, coordinate: instance.apertureCoordinate ? instance.apertureCoordinate(event.clientX, event.clientY) : null });
      if (canTurnShape(latest.current, shapeIndex)) { Object.assign(drag.current, { kind: 'shape', shapeIndex: shapeIndex, angle: latest.current.shape.angles[shapeIndex], tilt: latest.current.shape.tilts[shapeIndex] }); selectShape(shapeIndex); }
      if (hit && hit.id === 'relief-light' && canObserveRelief(latest.current)) Object.assign(drag.current, { kind: 'relief', angle: latest.current.relief.lightAngle, lightCoordinate: instance.reliefLightAngle ? instance.reliefLightAngle(event.clientX, event.clientY) : null });
      if (canTurnRotation(latest.current, rotationIndex)) { Object.assign(drag.current, { kind: 'rotation', rotationIndex: rotationIndex, angle: latest.current.rotation.angles[rotationIndex], tilt: latest.current.rotation.tilts[rotationIndex] }); selectRotation(rotationIndex); }
      if (block) { setSelected(true); setStatus(t('selected', 'Teal block selected.')); }
      if (corner >= 0) selectCorner(corner);
      if (continuation) selectContinuation();
      if (shadow) selectShadow();
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    function pointerMove(event) {
      var start = drag.current; if (!start || start.id !== event.pointerId) return;
      var dx = event.clientX - start.x, dy = event.clientY - start.y;
      if (Math.hypot(dx, dy) <= 6 && !start.moved) return;
      if (start.kind === 'landing') {
        if (event.pointerType === 'touch' && !start.moved && Math.abs(dy) > Math.abs(dx)) return;
        start.moved = true;
        var height = viewer.current && viewer.current.landingCoordinate && viewer.current.landingCoordinate(event.clientX, event.clientY, start.landingIndex);
        changeLandingHeight(start.landingIndex, event.pointerType === 'touch' ? start.height + dx * 0.01 : Number.isFinite(height) && Number.isFinite(start.coordinate) ? start.height + height - start.coordinate : start.height - dy * 0.01); return;
      }
      // Leave vertical touch gestures to page scrolling before changing scene state.
      if (event.pointerType === 'touch' && start.kind !== 'continuation' && !start.moved && Math.abs(dy) > Math.abs(dx)) return;
      start.moved = true;
      if (start.kind === 'length') {
        var lengthCoordinate = viewer.current && viewer.current.lengthCoordinate && viewer.current.lengthCoordinate(event.clientX, event.clientY);
        if (event.pointerType === 'touch') changeLengthValue(start.value + dx * 0.01 * start.fine * start.direction);
        else if (Number.isFinite(lengthCoordinate) && Number.isFinite(start.coordinate)) changeLengthValue(start.value + 2 * (lengthCoordinate - start.coordinate) * start.fine * start.direction);
        return;
      }
      if (start.kind === 'aperture') {
        if (event.pointerType === 'touch') changeAperturePhase(start.phase + dx * 0.75 * start.fine);
        else {
          var dialCoordinate = viewer.current && viewer.current.apertureCoordinate && viewer.current.apertureCoordinate(event.clientX, event.clientY);
          if (Number.isFinite(dialCoordinate) && Number.isFinite(start.coordinate)) {
            // Incremental wrapped deltas allow repeated turns without a jump at zero degrees.
            start.phase = angle(start.phase + ((dialCoordinate - start.coordinate + 540) % 360 - 180) * start.fine, start.phase);
            changeAperturePhase(start.phase);
          }
          start.coordinate = dialCoordinate;
        }
        return;
      }
      if (start.kind === 'weave' || start.kind === 'weave-rail') {
        if (start.kind === 'weave') changeWeaveDepth(start.weaveIndex, start.depth + dx * 0.015);
        else { var weaveCoordinate = viewer.current && viewer.current.weaveCoordinate && viewer.current.weaveCoordinate(event.clientX, event.clientY, start.weaveIndex); if (Number.isFinite(weaveCoordinate) && Number.isFinite(start.coordinate)) changeWeaveDepth(start.weaveIndex, start.depth + weaveCoordinate - start.coordinate); }
        return;
      }
      if (start.kind === 'frame-rod' || start.kind === 'frame-surround') {
        var frameCoordinate = viewer.current && viewer.current.frameCoordinate && viewer.current.frameCoordinate(event.clientX, event.clientY);
        if (Number.isFinite(frameCoordinate) && Number.isFinite(start.coordinate)) { var value = start.angle + ((frameCoordinate - start.coordinate + 540) % 360 - 180); if (start.kind === 'frame-rod') changeFrameAdjustment(value); else changeFrameSurround(value); }
        return;
      }
      if (start.kind === 'motion') { var phase = viewer.current && viewer.current.motionCoordinate && viewer.current.motionCoordinate(event.clientX, event.clientY); if (Number.isFinite(phase) && Number.isFinite(start.coordinate)) changeMotionPhase(Math.max(0, Math.min(359.9, start.phase + phase - start.coordinate))); return; }
      if (start.kind === 'shape') { rotateHoop(start.shapeIndex, start.angle + dx * 0.5, start.tilt - (event.pointerType === 'touch' ? 0 : dy * 0.35)); return; }
      if (start.kind === 'relief') {
        var coordinate = viewer.current && viewer.current.reliefLightAngle && viewer.current.reliefLightAngle(event.clientX, event.clientY);
        if (Number.isFinite(coordinate) && Number.isFinite(start.lightCoordinate)) changeReliefLight(start.angle + ((coordinate - start.lightCoordinate + 540) % 360 - 180));
        else changeReliefLight(start.angle + dx * 0.7);
        return;
      }
      if (start.kind === 'rotation') { rotateSculpture(start.rotationIndex, start.angle + dx * 0.5, start.tilt - (event.pointerType === 'touch' ? 0 : dy * 0.35)); return; }
      if (start.kind === 'shadow') { changeShadow(start.angle + dx * 0.5); return; }
      if (start.kind === 'continuation') {
        var rodHeight = viewer.current && viewer.current.continuationCoordinate && viewer.current.continuationCoordinate(event.clientX, event.clientY);
        if (Number.isFinite(rodHeight) && Number.isFinite(start.height)) changeContinuation(start.offset + rodHeight - start.height);
        return;
      }
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
    function control(command, label, name, fallback, style) { return button(icon(name, fallback), function (event) { if (!event.detail) move(command); }, { 'data-walk-move': command, disabled: covered(state), 'aria-label': t(command, label), title: t(command, label), style: style, onPointerDown: function (event) { if (event.button !== 0 || covered(latest.current)) return; event.currentTarget.focus({ preventScroll: true }); stop(); event.currentTarget.setPointerCapture(event.pointerId); move(command); hold.current = setInterval(function () { move(command); }, 120); }, onPointerUp: stop, onPointerCancel: stop, onLostPointerCapture: stop, onBlur: stop }); }
    var fallback = diagram || renderStatus !== 'ready', solved = ACTIVITIES.filter(function (item) { return state.progress[item.id].solved; }).length;
    var readingVisible = meta.id === 'length' ? canObserveLength(state) : meta.id === 'aperture' ? canObserveAperture(state) : meta.id === 'landing' ? canManipulateLanding(state) : meta.id === 'weave' ? canManipulateWeave(state) : meta.id === 'frame' ? canObserveFrame(state) : meta.id === 'ring' ? reading.ringFacing : meta.id === 'scale' ? reading.scaleFacing && reading.scaleRatio != null : meta.id === 'contour' ? reading.contourFacing : meta.id === 'continuity' ? reading.continuityFacing : meta.id === 'shadow' ? reading.shadowFacing : true;
    var markers = [], width = host.current && host.current.clientWidth || 600, height = host.current && host.current.clientHeight || 360, focusedWeave = state.activity === 'weave' && canManipulateWeave(state);
    layout.filter(function (marker) { return marker.visible && (state.activity !== 'length' || !canObserveLength(state) || marker.id === 'length') && (state.activity !== 'aperture' || !canObserveAperture(state) || marker.id === 'aperture') && (!focusedWeave || marker.id === 'weave') && (state.activity !== 'landing' || !canManipulateLanding(state) || marker.id === 'landing'); }).sort(function (a, b) { return (a.id === state.activity ? -1 : b.id === state.activity ? 1 : a.distance - b.distance); }).forEach(function (marker) {
      var item = Object.assign({}, marker, { x: Math.max(55, Math.min(width - 55, marker.x * width)), y: marker.id === state.activity ? 28 : Math.max(28, Math.min(height - 62, marker.y * height)) });
      if (!markers.some(function (other) { return Math.abs(other.x - item.x) < 110 && Math.abs(other.y - item.y) < 64; })) markers.push(item);
    });
    return h('section', { ref: root, 'data-perception-walk': true, 'data-mouse-look': mouseLook, 'data-theme': ctx.isContrast || ctx.theme === 'contrast' ? 'contrast' : ctx.isDark || ctx.theme === 'dark' ? 'dark' : 'light', 'aria-label': t('title', 'Walk-through perception challenges') },
      h('style', null, CSS),
      h('header', { className: 'pw-header' }, h('div', null, h('div', { className: 'pw-eyebrow' }, t('lab', 'Perception Lab')), h('h2', null, t('title', 'Walk-through challenges'))), h('div', { className: 'pw-actions' }, h('span', { className: 'pw-progress' }, solved + ' / ' + ACTIVITIES.length + ' ' + t('solved_count', 'solved')), button(h(React.Fragment, null, icon('ArrowLeft', '\u2190'), t('back', 'Back to gallery')), function () { stop(); props.onClose(); }, { 'data-walk-close': true }))),
      h('div', { className: 'pw-room-tools' }, h('div', null,
        button(icon('ArrowLeft', '<'), function () { travel(-1); }, { className: 'pw-icon', 'data-walk-previous-room': true, title: t('previous_room', 'Previous room'), 'aria-label': t('previous_room', 'Previous room'), disabled: !nextRoom(state, -1) }),
        button(icon('ArrowRight', '>'), function () { travel(1); }, { className: 'pw-icon', 'data-walk-next-room': true, title: t('next_room', 'Next room'), 'aria-label': t('next_room', 'Next room'), disabled: !nextRoom(state, 1) }),
        button(icon('LayoutGrid', '+'), function () { stop(); setAllRooms(!allRooms); }, { className: 'pw-icon', 'data-walk-all-rooms': true, title: t('all_rooms', 'All rooms'), 'aria-label': t('all_rooms', 'All rooms'), 'aria-expanded': allRooms, 'aria-controls': uid + '-rooms' })),
        button(h(React.Fragment, null, icon('SkipForward', '>'), t('next_unsolved', 'Next unsolved')), function () { travel(1, true); }, { 'data-walk-next-unsolved': true, disabled: !nextRoom(state, 1, true) })),
      h('nav', { id: uid + '-rooms', className: 'pw-nav', 'data-expanded': allRooms, 'aria-label': t('activities', 'Challenge spaces') }, ACTIVITIES.map(function (item, index) { return button(h('span', null, h('strong', null, (index + 1) + '. ' + t(item.id + '_title', item.title)), h('small', null, state.progress[item.id].solved ? t('solved_label', 'Solved') : t(item.id + '_principle', item.principle))), function () { choose(item.id); }, { key: item.id, 'data-walk-activity': item.id, 'aria-pressed': state.activity === item.id }); })),
      h('div', { className: 'pw-workspace' }, h('div', { className: 'pw-scene-column' },
        button(icon(mouseLook ? 'Unlock' : 'MousePointer2', '+'), toggleMouseLook, { ref: lockButton, className: 'pw-mouse-look', 'data-walk-mouse-look': true, title: t(mouseLook ? 'mouse_look_exit' : 'mouse_look', mouseLook ? 'Release mouse look' : 'Mouse look'), 'aria-label': t(mouseLook ? 'mouse_look_exit' : 'mouse_look', mouseLook ? 'Release mouse look' : 'Mouse look'), 'aria-pressed': mouseLook, disabled: fallback || covered(state) || !host.current || typeof host.current.requestPointerLock !== 'function' }),
        h('div', { className: 'pw-toolbar' }, h('div', { className: 'pw-actions' }, button(icon('MapPin', '+'), home, { className: 'pw-icon', disabled: covered(state), title: t('home', 'Return to challenge start'), 'aria-label': t('home', 'Return to challenge start'), 'data-walk-home': true }), button(icon('Crosshair', '+'), face, { className: 'pw-icon', disabled: covered(state), title: t('face', 'Face exhibit'), 'aria-label': t('face', 'Face exhibit'), 'data-walk-face': true }), button(h(React.Fragment, null, icon('Hand', '+'), t('interact', 'Interact')), interact, { 'data-walk-interact': true, disabled: covered(state) || fallback && state.activity !== 'scale' }), meta.id === 'change' && button(h(React.Fragment, null, icon(state.change.closed ? 'Eye' : 'EyeOff', '+'), t(state.change.closed ? 'change_open' : 'change_close', state.change.closed ? 'Open shutter' : 'Close shutter')), shutter, { 'data-walk-change-shutter': true, disabled: !state.change.closed && !canObserveChange(state), 'aria-controls': uid + '-change-cover', 'aria-expanded': !state.change.closed })), h('label', null, h('input', { type: 'checkbox', checked: diagram, 'data-walk-diagram-toggle': true, onChange: function (event) { stop(); setDiagram(event.target.checked); } }), t('plan', 'Plan view'))),
        h('fieldset', { className: 'pw-inspection pw-viewpoints', 'data-walk-viewpoints': true }, h('legend', null, t('saved_viewpoints', 'Saved viewpoints')),
          ['A', 'B'].map(function (slot) {
            var pose = state.viewpoints[state.activity][slot], label = t('viewpoint_slot', 'Viewpoint {slot}').replace('{slot}', slot);
            var recallLabel = t('viewpoint_recall', 'Recall viewpoint {slot}').replace('{slot}', slot), saveLabel = t(pose ? 'viewpoint_replace' : 'viewpoint_save', pose ? 'Replace viewpoint {slot}' : 'Save viewpoint {slot}').replace('{slot}', slot), clearLabel = t('viewpoint_clear', 'Clear viewpoint {slot}').replace('{slot}', slot);
            return h('div', { className: 'pw-viewpoint-slot', role: 'group', 'aria-label': label, key: slot },
              button(h(React.Fragment, null, icon('Eye', '+'), slot), function () { viewpointAction('recall', slot); }, { 'data-walk-viewpoint-recall': slot, title: recallLabel, 'aria-label': recallLabel, 'aria-pressed': sameViewpoint(pose, state.player), disabled: !pose || covered(state) }),
              button(icon('Save', '+'), function () { viewpointAction('save', slot); }, { 'data-walk-viewpoint-save': slot, title: saveLabel, 'aria-label': saveLabel, disabled: !canSaveViewpoint(state) }),
              button(icon('Trash2', 'x'), function () { viewpointAction('clear', slot); }, { 'data-walk-viewpoint-clear': slot, title: clearLabel, 'aria-label': clearLabel, disabled: !pose || covered(state) }));
          })),
        meta.id === 'weave' && h('fieldset', { className: 'pw-inspection' }, h('legend', null, t('weave_views', 'Observation viewpoints')), h('div', { className: 'pw-inspection-views' }, [['left', 'ArrowLeft'], ['front', 'Eye'], ['right', 'ArrowRight']].map(function (view) { var label = view[0] === 'left' ? t('weave_view_left', 'Left-side view') : view[0] === 'front' ? t('weave_view_front', 'Front view') : t('weave_view_right', 'Right-side view'); return button(icon(view[1], '>'), function () { inspectWeaveView(view[0]); }, { key: view[0], 'data-walk-weave-view': view[0], title: label, 'aria-label': label }); })), button(icon('Camera', '+'), recordWeaveObservation, { className: 'pw-icon', title: t('weave_record', 'Record view'), 'aria-label': t('weave_record', 'Record view'), 'data-walk-weave-record': true, disabled: !weaveView(state) })),
        meta.id === 'rotation' && !fallback && h('fieldset', { className: 'pw-inspection', 'data-walk-rotation-inspection': true },
          h('legend', null, t('rotation_inspection', 'Inspect sculpture')),
          h('div', { className: 'pw-inspection-tools' }, ['R', 'A', 'B'].map(function (choice) { var label = t('rotation_inspect_' + choice.toLowerCase(), choice === 'R' ? 'Inspect reference R' : 'Inspect sculpture ' + choice); return button(h(React.Fragment, null, icon('Search', '+'), choice), function () { inspectSculpture(choice, inspection ? inspection.side : 'front'); }, { key: choice, 'data-walk-rotation-inspect': choice, title: label, 'aria-label': label, 'aria-pressed': !!inspection && inspection.choice === choice }); })),
          h('div', { className: 'pw-inspection-views', role: 'group', 'aria-label': t('rotation_inspection_views', 'Inspection viewpoints') }, [['left', 'ArrowLeft', 'Left-side view'], ['front', 'Eye', 'Front view'], ['right', 'ArrowRight', 'Right-side view']].map(function (view) { var label = t('rotation_view_' + view[0], view[2]); return button(icon(view[1], '+'), function () { if (inspection) inspectSculpture(inspection.choice, view[0]); }, { key: view[0], 'data-walk-rotation-view': view[0], title: label, 'aria-label': label, disabled: !inspection, 'aria-pressed': !!inspection && inspection.side === view[0] }); }), button(icon('Maximize', '+'), rotationOverview, { 'data-walk-rotation-overview': true, title: t('rotation_overview', 'Return to comparison view'), 'aria-label': t('rotation_overview', 'Return to comparison view') }))),
        meta.id === 'relief' && h('fieldset', { className: 'pw-inspection', 'data-walk-relief-inspection': true },
          h('legend', null, t('relief_inspection', 'Inspect surface')),
          h('div', { className: 'pw-inspection-tools' }, ['A', 'B'].map(function (choice) { var label = t('relief_inspect_' + choice.toLowerCase(), 'Inspect surface ' + choice); return button(h(React.Fragment, null, icon('Search', '+'), choice), function () { inspectSurface(choice, reliefView ? reliefView.side : 'front'); }, { key: choice, 'data-walk-relief-inspect': choice, title: label, 'aria-label': label, 'aria-pressed': !!reliefView && reliefView.choice === choice }); })),
          h('div', { className: 'pw-inspection-views', role: 'group', 'aria-label': t('rotation_inspection_views', 'Inspection viewpoints') }, [['left', 'ArrowLeft', 'Left-side view'], ['front', 'Eye', 'Front view'], ['right', 'ArrowRight', 'Right-side view']].map(function (view) { var label = t('rotation_view_' + view[0], view[2]); return button(icon(view[1], '+'), function () { if (reliefView) inspectSurface(reliefView.choice, view[0]); }, { key: view[0], 'data-walk-relief-view': view[0], title: label, 'aria-label': label, disabled: !reliefView, 'aria-pressed': !!reliefView && reliefView.side === view[0] }); }), button(icon('Maximize', '+'), function () { home(); if (!fallback && host.current) host.current.focus({ preventScroll: true }); }, { 'data-walk-relief-overview': true, title: t('rotation_overview', 'Return to comparison view'), 'aria-label': t('rotation_overview', 'Return to comparison view') }))),
        meta.id === 'shape' && h('fieldset', { className: 'pw-inspection', 'data-walk-shape-inspection': true },
          h('legend', null, t('shape_inspection', 'Inspect hoop')),
          h('div', { className: 'pw-inspection-tools' }, ['A', 'B'].map(function (choice) { var label = t('shape_inspect_' + choice.toLowerCase(), 'Inspect hoop ' + choice); return button(h(React.Fragment, null, icon('Search', '+'), choice), function () { inspectHoop(choice, shapeView ? shapeView.side : 'front'); }, { key: choice, 'data-walk-shape-inspect': choice, title: label, 'aria-label': label, 'aria-pressed': !!shapeView && shapeView.choice === choice }); })),
          h('div', { className: 'pw-inspection-views', role: 'group', 'aria-label': t('rotation_inspection_views', 'Inspection viewpoints') }, [['left', 'ArrowLeft', 'Left-side view'], ['front', 'Eye', 'Front view'], ['right', 'ArrowRight', 'Right-side view']].map(function (view) { var label = t('rotation_view_' + view[0], view[2]); return button(icon(view[1], '+'), function () { if (shapeView) inspectHoop(shapeView.choice, view[0]); }, { key: view[0], 'data-walk-shape-view': view[0], title: label, 'aria-label': label, disabled: !shapeView, 'aria-pressed': !!shapeView && shapeView.side === view[0] }); }), button(icon('Maximize', '+'), function () { home(); if (!fallback && host.current) host.current.focus({ preventScroll: true }); }, { 'data-walk-shape-overview': true, title: t('rotation_overview', 'Return to comparison view'), 'aria-label': t('rotation_overview', 'Return to comparison view') }))),
        meta.id === 'length' && h('fieldset', { className: 'pw-inspection' }, h('legend', null, t('length_views', 'Inspection viewpoints')), h('div', { className: 'pw-inspection-views' }, lengthInspectionViews().sort(function (a, b) { return ['left', 'front', 'right'].indexOf(a.side) - ['left', 'front', 'right'].indexOf(b.side); }).map(function (view) { var label = t('length_view_' + view.side, view.side === 'left' ? 'Left-side view' : view.side === 'right' ? 'Right-side view' : 'Front view'); return button(icon(view.side === 'left' ? 'ArrowLeft' : view.side === 'right' ? 'ArrowRight' : 'Eye', '>'), function () { inspectLengthView(view.side); }, { key: view.side, 'data-walk-length-view': view.side, title: label, 'aria-label': label, 'aria-pressed': sameViewpoint(view.player, state.player) }); }))),
        meta.id === 'aperture' && h('fieldset', { className: 'pw-inspection' }, h('legend', null, t('aperture_views', 'Inspection viewpoints')), h('div', { className: 'pw-inspection-views' }, [['left', 'ArrowLeft'], ['front', 'Eye'], ['right', 'ArrowRight']].map(function (view) { var label = view[0] === 'left' ? t('aperture_view_left', 'Left-side view') : view[0] === 'front' ? t('aperture_view_front', 'Front view') : t('aperture_view_right', 'Right-side view'); return button(icon(view[1], '>'), function () { inspectApertureView(view[0]); }, { key: view[0], 'data-walk-aperture-view': view[0], title: label, 'aria-label': label }); }))),
        meta.id === 'landing' && h('fieldset', { className: 'pw-inspection' }, h('legend', null, t('landing_views', 'Inspection viewpoints')), h('div', { className: 'pw-inspection-views' }, [['left', 'ArrowLeft'], ['front', 'Eye'], ['right', 'ArrowRight']].map(function (view) { var label = view[0] === 'left' ? t('landing_view_left', 'Left-side view') : view[0] === 'front' ? t('landing_view_front', 'Front view') : t('landing_view_right', 'Right-side view'); return button(icon(view[1], '>'), function () { inspectLandingView(view[0]); }, { key: view[0], 'data-walk-landing-view': view[0], title: label, 'aria-label': label }); }))),
        h('figure', { className: 'pw-stage', 'aria-label': t(meta.id + '_goal', meta.goal) },
          fallback && h(Plan, { h: h, t: t, state: state, reveal: reveal }),
          h('div', { className: 'pw-viewport', ref: host, hidden: fallback, style: state.activity === 'continuity' ? { touchAction: 'none' } : undefined, tabIndex: fallback || covered(state) ? -1 : 0, 'aria-hidden': covered(state) || undefined, role: 'group', 'aria-label': t('first_person', 'First-person viewpoint'), 'aria-keyshortcuts': 'W A S D ArrowUp ArrowDown ArrowLeft ArrowRight PageUp PageDown E Escape', 'data-walk-stage': true, onKeyDown: keyDown, onPointerDown: pointerDown, onPointerMove: pointerMove, onPointerUp: pointerEnd, onPointerCancel: function (event) { pointerEnd(event, true); }, onLostPointerCapture: function () { drag.current = null; } }),
          !fallback && h('span', { className: 'pw-crosshair', 'aria-hidden': true }),
          !fallback && !covered(state) && h('div', { className: 'pw-waypoints', role: 'group', 'aria-label': t('activities', 'Challenge spaces') }, markers.map(function (marker) { var item = activity(marker.id), index = ACTIVITIES.indexOf(item), label = t('visit_' + item.id, 'Visit ' + item.title); return button(h(React.Fragment, null, h('span', { 'aria-hidden': true }, index + 1), h('span', null, t(item.id + '_short', ['Circle', 'Size', 'Screen', 'Depth', 'Corners', 'Context', 'Line', 'Shadow', 'Change', 'Rotation', 'Light', 'Shape', 'Motion', 'Frame', 'Crossings', 'Landing', 'Aperture', 'Length'][index]))), function () { choose(item.id, true); }, { key: item.id, className: 'pw-waypoint', style: { left: marker.x, top: marker.y }, title: label, 'aria-label': label, 'data-walk-waypoint': item.id }); })),
          !diagram && renderStatus !== 'ready' && h('div', { className: 'pw-render-status', role: 'status' }, renderStatus === 'failed' ? t('failed', '3D unavailable. Plan view is active.') : t('loading', 'Opening the walk-through...'), renderStatus === 'failed' && button(t('retry', 'Retry 3D'), function () { setRetry(retry + 1); }, { 'data-walk-retry': true })),
          h('figcaption', null, t(fallback ? ['contour', 'context', 'continuity', 'shadow', 'change', 'rotation'].indexOf(meta.id) >= 0 ? 'front_view' : 'plan' : 'first_person_caption', fallback ? ['contour', 'context', 'continuity', 'shadow', 'change', 'rotation'].indexOf(meta.id) >= 0 ? 'Front view' : 'Plan view' : 'First-person view') + ' / ' + t(meta.id + '_title', meta.title)),
          meta.id === 'change' && h('div', { id: uid + '-change-cover', className: 'pw-change-cover', hidden: !state.change.closed, style: !state.change.closed ? { display: 'none' } : undefined, 'data-walk-change-cover': true, role: 'status' }, t('change_covered', 'Shutter closed'))),
        h('div', { className: 'pw-navigation', role: 'group', 'aria-label': t('movement', 'Movement controls') },
          h('div', { className: 'pw-pad' }, control('forward', 'Move forward', 'ArrowUp', '\u2191', { gridColumn: 2 }), control('left', 'Step left', 'ArrowLeft', '\u2190', { gridColumn: 1, gridRow: 2 }), control('back', 'Move backward', 'ArrowDown', '\u2193', { gridColumn: 2, gridRow: 2 }), control('right', 'Step right', 'ArrowRight', '\u2192', { gridColumn: 3, gridRow: 2 })),
          h('label', { className: 'pw-precision' }, h('input', { type: 'checkbox', checked: state.precise, 'data-walk-precision': true, onChange: function (event) { stop(); var value = event.target.checked; update(function (next) { next.precise = value; return next; }); } }), t('precision', 'Fine movement')),
          h('div', { className: 'pw-look' }, control('turnLeft', 'Turn left', 'RotateCcw', '\u21ba'), control('turnRight', 'Turn right', 'RotateCw', '\u21bb'), control('lookUp', 'Look up', 'ChevronUp', '\u2191'), control('lookDown', 'Look down', 'ChevronDown', '\u2193'))),
        h('p', { className: 'pw-position', 'data-walk-position': true }, 'X ' + state.player.x.toFixed(1) + ' / Z ' + state.player.z.toFixed(1) + ' / ' + t('heading', 'Heading') + ' ' + state.player.yaw.toFixed(0)),
        h('p', { className: 'pw-status', role: 'status', 'aria-live': 'polite', 'data-walk-status': true }, status)),
        h('aside', { className: 'pw-task', 'aria-label': t('challenge', 'Current challenge') },
          h('div', { className: 'pw-principle' }, t(meta.id + '_principle', meta.principle)), h('h3', null, t(meta.id + '_title', meta.title)), h('p', { className: 'pw-goal' }, t(meta.id + '_goal', meta.goal)),
          h('div', { className: 'pw-reading', 'data-walk-evidence': true, 'data-unavailable': !readingVisible }, h('span', null, t(meta.id + '_reading', { ring: 'Arc alignment', scale: 'Teal / coral image height', occlusion: 'Symbols collected', parallax: 'Viewpoints recorded', contour: 'Corners aligned', context: 'Tiles selected', continuity: 'Observation viewpoint', shadow: 'Observation viewpoint', change: 'Scenes solved', rotation: 'Pairs solved', relief: 'Pairs solved', shape: 'Pairs solved', motion: 'Patterns solved', frame: 'Trials solved', weave: 'Patterns solved', landing: 'Shadows aligned', aperture: 'Trials solved', length: 'Trials solved' }[meta.id])), h('strong', null, !readingVisible ? t('out_of_view', 'Out of view') : meta.id === 'length' ? state.length.completed.length + ' / 2' : meta.id === 'aperture' ? state.aperture.completed.length + ' / 2' : meta.id === 'landing' ? landingAligned(state) + ' / 3' : meta.id === 'weave' ? state.weave.completed.length + ' / 2' : meta.id === 'frame' ? state.frame.completed.length + ' / 2' : meta.id === 'motion' ? state.motion.completed.length + ' / 2' : meta.id === 'shape' ? state.shape.completed.length + ' / 2' : meta.id === 'relief' ? state.relief.completed.length + ' / 2' : meta.id === 'rotation' ? state.rotation.completed.length + ' / 2' : meta.id === 'change' ? state.change.completed.length + ' / 3' : meta.id === 'ring' ? reading.ringAlignment + '%' : meta.id === 'scale' ? reading.scaleRatio.toFixed(2) + ' : 1' : meta.id === 'parallax' ? state.parallax.samples.length + ' / 2' : meta.id === 'contour' ? reading.contourAligned + ' / 4' : meta.id === 'context' ? state.context.selected.length + ' / 2' : meta.id === 'continuity' || meta.id === 'shadow' ? t('continuity_ready', 'Ready') : reading.collected + ' / 3')),
          meta.id === 'length' && h('div', { className: 'pw-change-scene' }, h('strong', null, t('length_trial', 'Fin arrangement') + ' ' + (state.length.round + 1) + ' / 2'), button(h(React.Fragment, null, t('length_next', 'Next arrangement'), icon('ArrowRight', '>')), nextLengthTrial, { 'data-walk-length-next': true, disabled: state.length.completed.indexOf(state.length.round) < 0 && !progress.assisted })),
          meta.id === 'length' && h('div', null,
            h('label', { className: 'pw-slider', htmlFor: uid + '-length-value' }, t('length_value', 'Lower shaft length'), h('output', { htmlFor: uid + '-length-value' }, state.length.value.toFixed(2)), h('input', { id: uid + '-length-value', type: 'range', min: 1.8, max: 4.2, step: 0.01, value: state.length.value, disabled: !canObserveLength(state), 'data-walk-length-value': true, 'aria-valuetext': state.length.value.toFixed(2) + ' ' + t('units', 'units'), onChange: function (event) { changeLengthValue(Number(event.target.value)); } })),
            h('div', { className: 'pw-inspection-views' }, [['shorter', 'Minus', -1, 'Shorten shaft'], ['longer', 'Plus', 1, 'Lengthen shaft']].map(function (control) { var label = t('length_' + control[0], control[3]); return button(icon(control[1], control[2] < 0 ? '-' : '+'), function () { changeLengthValue(state.length.value + control[2] * (state.precise ? 0.025 : 0.1)); }, { key: control[0], ['data-walk-length-' + control[0]]: true, title: label, 'aria-label': label, disabled: !canObserveLength(state) || (control[2] < 0 ? state.length.value <= 1.8 : state.length.value >= 4.2) }); }))),
          meta.id === 'length' && h('label', { className: 'pw-precision' }, h('input', { type: 'checkbox', checked: state.length.visible, 'data-walk-length-visible': true, disabled: !canObserveLength(state), onChange: function (event) { changeLengthVisible(event.target.checked); } }), t('length_visible', 'Endpoint fins')),
          meta.id === 'length' && h('p', { className: 'pw-baseline', 'data-walk-length-observed': true }, t('length_observed', 'Contexts compared') + ': ' + ((state.length.seen & 1 ? 1 : 0) + (state.length.seen & 2 ? 1 : 0)) + ' / 2'),
          meta.id === 'aperture' && h('div', { className: 'pw-change-scene' }, h('strong', null, t('aperture_trial', 'Motion trial') + ' ' + (state.aperture.round + 1) + ' / 2'), button(h(React.Fragment, null, t('aperture_next', 'Next trial'), icon('ArrowRight', '>')), nextApertureTrial, { 'data-walk-aperture-next': true, disabled: state.aperture.completed.indexOf(state.aperture.round) < 0 && !progress.assisted })),
          meta.id === 'aperture' && h('div', null,
            h('label', { className: 'pw-slider', htmlFor: uid + '-aperture-phase' }, t('aperture_phase', 'Motion phase'), h('output', { htmlFor: uid + '-aperture-phase' }, state.aperture.phase.toFixed(0) + '\u00b0'), h('input', { id: uid + '-aperture-phase', type: 'range', min: 0, max: 359, step: 1, value: state.aperture.phase, disabled: !canObserveAperture(state), 'data-walk-aperture-phase': true, onChange: function (event) { changeAperturePhase(Number(event.target.value)); } })),
            h('div', { className: 'pw-inspection-views' }, button(icon('SkipBack', '<'), function () { changeAperturePhase(state.aperture.phase - 30); }, { 'data-walk-aperture-back': true, title: t('aperture_back', 'Previous motion phase'), 'aria-label': t('aperture_back', 'Previous motion phase'), disabled: !canObserveAperture(state) }), button(icon(motionPlaying ? 'Pause' : 'Play', motionPlaying ? '||' : '>'), toggleMotionPlayback, { 'data-walk-aperture-play': true, title: t(motionPlaying ? 'aperture_pause' : 'aperture_play', motionPlaying ? 'Pause motion' : 'Play motion'), 'aria-label': t(motionPlaying ? 'aperture_pause' : 'aperture_play', motionPlaying ? 'Pause motion' : 'Play motion'), 'aria-pressed': motionPlaying, disabled: reducedMotion || fallback || !canObserveAperture(state) }), button(icon('SkipForward', '>'), function () { changeAperturePhase(state.aperture.phase + 30); }, { 'data-walk-aperture-forward': true, title: t('aperture_forward', 'Next motion phase'), 'aria-label': t('aperture_forward', 'Next motion phase'), disabled: !canObserveAperture(state) }))),
          meta.id === 'aperture' && h('label', { className: 'pw-slider', htmlFor: uid + '-aperture-speed' }, t('aperture_speed', 'Playback speed'), h('output', { htmlFor: uid + '-aperture-speed' }, state.aperture.speed.toFixed(2) + '\u00d7'), h('input', { id: uid + '-aperture-speed', type: 'range', min: 0.25, max: 2, step: 0.25, value: state.aperture.speed, disabled: !canObserveAperture(state), 'data-walk-aperture-speed': true, onChange: function (event) { changeApertureSpeed(Number(event.target.value)); } })),
          meta.id === 'aperture' && h('label', { className: 'pw-precision' }, h('input', { type: 'checkbox', checked: state.aperture.masked, 'data-walk-aperture-mask': true, disabled: !canObserveAperture(state), onChange: function (event) { changeApertureMask(event.target.checked); } }), t('aperture_mask', 'Screen closed')),
          meta.id === 'aperture' && h('p', { className: 'pw-baseline', 'data-walk-aperture-observed': true }, t('aperture_closed', 'Closed-screen positions') + ': ' + Math.min(2, apertureSeen(state.aperture.seenMasked)) + ' / 2; ' + t('aperture_open', 'Open-screen positions') + ': ' + Math.min(2, apertureSeen(state.aperture.seenOpen)) + ' / 2'),
          meta.id === 'aperture' && h('fieldset', { className: 'pw-choices', disabled: !canObserveAperture(state) }, h('legend', null, t('aperture_axis', 'Actual motion axis')), ['horizontal', 'vertical'].map(function (choice) { return h('label', { key: choice }, h('input', { type: 'radio', name: uid + '-aperture-axis', value: choice, checked: state.aperture.choice === choice, 'data-walk-aperture-choice': choice, onChange: function () { chooseApertureAxis(choice); } }), t('aperture_' + choice, choice === 'horizontal' ? 'Side to side' : 'Up and down')); })),
          meta.id === 'landing' && h('div', { className: 'pw-change-scene' }, h('strong', null, t('landing_pattern', 'Lighting arrangement') + ' ' + (state.landing.round + 1) + ' / 2'), button(h(React.Fragment, null, t('landing_next', 'Next arrangement'), icon('ArrowRight', '>')), nextLandingPattern, { 'data-walk-landing-next': true, disabled: state.landing.completed.indexOf(state.landing.round) < 0 && !progress.assisted })),
          meta.id === 'landing' && h('fieldset', { className: 'pw-choices pw-rotation-pieces', disabled: !canManipulateLanding(state) }, h('legend', null, t('landing_piece', 'Sphere to lift')), ['A', 'B', 'C'].map(function (choice, index) { return h('label', { key: choice }, h('input', { type: 'radio', name: uid + '-landing-piece', value: index, checked: state.landing.selected === index, 'data-walk-landing-piece': index, onChange: function () { selectLandingPiece(index); } }), h('span', { className: 'pw-token-dot', style: { background: ['#208e87', '#e87967', '#e9b342'][index] }, 'aria-hidden': true }), choice); })),
          meta.id === 'landing' && h('div', null,
            h('label', { className: 'pw-slider', htmlFor: uid + '-landing-height' }, t('landing_height', 'Sphere center height'), h('output', { htmlFor: uid + '-landing-height' }, state.landing.heights[state.landing.selected].toFixed(2)), h('input', { id: uid + '-landing-height', type: 'range', min: 0.55, max: 3.2, step: 0.025, value: state.landing.heights[state.landing.selected], disabled: !canManipulateLanding(state), 'data-walk-landing-height': true, onChange: function (event) { changeLandingHeight(state.landing.selected, Number(event.target.value)); } })),
            h('div', { className: 'pw-inspection-views' }, [['up', 'ArrowUp', 1, 'Lift sphere'], ['down', 'ArrowDown', -1, 'Lower sphere']].map(function (control) { var label = t('landing_' + control[0], control[3]), height = state.landing.heights[state.landing.selected]; return button(icon(control[1], '+'), function () { changeLandingHeight(state.landing.selected, height + control[2] * (state.precise ? 0.025 : 0.1)); }, { key: control[0], ['data-walk-landing-' + control[0]]: true, title: label, 'aria-label': label, disabled: !canManipulateLanding(state) || (control[2] > 0 ? height >= 3.2 : height <= 0.55) }); }))),
          meta.id === 'landing' && h('div', null,
            h('label', { className: 'pw-slider', htmlFor: uid + '-landing-light' }, t('landing_light', 'Light direction'), h('output', { htmlFor: uid + '-landing-light' }, (state.landing.lightAngle > 0 ? '+' : '') + state.landing.lightAngle.toFixed(0) + '\u00b0'), h('input', { id: uid + '-landing-light', type: 'range', min: -25, max: 25, step: 1, value: state.landing.lightAngle, disabled: !canManipulateLanding(state), 'data-walk-landing-light': true, onChange: function (event) { changeLandingLight(Number(event.target.value)); } })),
            h('div', { className: 'pw-inspection-views' }, [['left', 'RotateCcw', -1, 'Rotate light counterclockwise'], ['right', 'RotateCw', 1, 'Rotate light clockwise']].map(function (control) { var label = t('landing_light_' + control[0], control[3]); return button(icon(control[1], control[2] < 0 ? '<' : '>'), function () { changeLandingLight(state.landing.lightAngle + control[2] * (state.precise ? 1 : 5)); }, { key: control[0], ['data-walk-landing-light-' + control[0]]: true, title: label, 'aria-label': label, disabled: !canManipulateLanding(state) || (control[2] > 0 ? state.landing.lightAngle >= 25 : state.landing.lightAngle <= -25) }); }), button(icon('Undo2', '0'), function () { changeLandingLight(0); }, { 'data-walk-landing-light-reset': true, title: t('landing_light_reset', 'Restore original light direction'), 'aria-label': t('landing_light_reset', 'Restore original light direction'), disabled: !canManipulateLanding(state) || state.landing.lightAngle === 0 }))),
          meta.id === 'weave' && h('div', { className: 'pw-change-scene' }, h('strong', null, t('weave_pattern', 'Pattern') + ' ' + (state.weave.round + 1) + ' / 2'), button(h(React.Fragment, null, t('weave_next', 'Next pattern'), icon('ArrowRight', '>')), nextWeavePattern, { 'data-walk-weave-next': true, disabled: state.weave.completed.indexOf(state.weave.round) < 0 && !progress.assisted })),
          meta.id === 'weave' && h('div', { 'data-walk-weave-order': true }, [[0, 1], [1, 2], [0, 2]].map(function (pair, index) { var order = weaveOrder(state.weave.round); return h('p', { key: index }, h('strong', null, order[pair[0]]), ' ' + t('weave_front_of', 'in front of') + ' ', h('strong', null, order[pair[1]])); })),
          meta.id === 'weave' && h('fieldset', { className: 'pw-choices pw-rotation-pieces', disabled: !canManipulateWeave(state) }, h('legend', null, t('weave_piece', 'Beam to move')), ['A', 'B', 'C'].map(function (choice, index) { return h('label', { key: choice }, h('input', { type: 'radio', name: uid + '-weave-piece', value: index, checked: state.weave.selected === index, 'data-walk-weave-piece': index, onChange: function () { selectWeavePiece(index); } }), h('span', { className: 'pw-token-dot', style: { background: ['#208e87', '#e87967', '#e9b342'][index] }, 'aria-hidden': true }), choice); })),
          meta.id === 'weave' && h('div', null,
            h('label', { className: 'pw-slider', htmlFor: uid + '-weave-depth' }, t('weave_depth', 'Depth along rail'), h('output', { htmlFor: uid + '-weave-depth' }, state.weave.depths[state.weave.selected].toFixed(2)), h('input', { id: uid + '-weave-depth', type: 'range', min: -1.5, max: 1.5, step: 0.025, value: state.weave.depths[state.weave.selected], disabled: !canManipulateWeave(state), 'data-walk-weave-depth': true, onChange: function (event) { changeWeaveDepth(state.weave.selected, Number(event.target.value)); } })),
            h('div', { className: 'pw-inspection-views' }, button(icon('ArrowUp', '^'), function () { changeWeaveDepth(state.weave.selected, state.weave.depths[state.weave.selected] - (state.precise ? 0.025 : 0.1)); }, { 'data-walk-weave-far': true, title: t('weave_far', 'Move beam farther'), 'aria-label': t('weave_far', 'Move beam farther'), disabled: !canManipulateWeave(state) || state.weave.depths[state.weave.selected] <= -1.5 }), button(icon('ArrowDown', 'v'), function () { changeWeaveDepth(state.weave.selected, state.weave.depths[state.weave.selected] + (state.precise ? 0.025 : 0.1)); }, { 'data-walk-weave-near': true, title: t('weave_near', 'Move beam nearer'), 'aria-label': t('weave_near', 'Move beam nearer'), disabled: !canManipulateWeave(state) || state.weave.depths[state.weave.selected] >= 1.5 }))),
          meta.id === 'weave' && h('p', { className: 'pw-baseline', 'data-walk-weave-observed': true }, t('weave_front', 'Front') + ': ' + (state.weave.seen & 1 ? t('weave_recorded_short', 'Recorded') : t('weave_needed', 'Needed')) + ' / ' + t('weave_side', 'Side') + ': ' + (state.weave.seen & 2 ? t('weave_recorded_short', 'Recorded') : t('weave_needed', 'Needed'))),
          meta.id === 'frame' && h('div', { className: 'pw-change-scene' }, h('strong', { 'data-walk-frame-target': true }, state.frame.round === 0 ? t('frame_vertical', '1 / 2: Align vertically') : t('frame_horizontal', '2 / 2: Align horizontally')), button(h(React.Fragment, null, t('frame_next', 'Next trial'), icon('ArrowRight', '>')), nextFrameTrial, { 'data-walk-frame-next': true, disabled: state.frame.completed.indexOf(state.frame.round) < 0 && !progress.assisted })),
          meta.id === 'frame' && h('div', null,
            h('label', { className: 'pw-slider', htmlFor: uid + '-frame-adjustment' }, t('frame_adjustment', 'Rod adjustment'), h('output', { htmlFor: uid + '-frame-adjustment' }, (state.frame.adjustment > 0 ? '+' : '') + state.frame.adjustment.toFixed(1) + '\u00b0'), h('input', { id: uid + '-frame-adjustment', type: 'range', min: -45, max: 45, step: 0.5, value: state.frame.adjustment, disabled: !canObserveFrame(state), 'data-walk-frame-adjustment': true, onChange: function (event) { changeFrameAdjustment(Number(event.target.value)); } })),
            h('div', { className: 'pw-inspection-views' }, button(icon('RotateCcw', '<'), function () { changeFrameAdjustment(state.frame.adjustment - (state.precise ? 0.5 : 2)); }, { 'data-walk-frame-left': true, title: t('frame_left', 'Turn rod counterclockwise'), 'aria-label': t('frame_left', 'Turn rod counterclockwise'), disabled: !canObserveFrame(state) || state.frame.adjustment <= -45 }), button(icon('RotateCw', '>'), function () { changeFrameAdjustment(state.frame.adjustment + (state.precise ? 0.5 : 2)); }, { 'data-walk-frame-right': true, title: t('frame_right', 'Turn rod clockwise'), 'aria-label': t('frame_right', 'Turn rod clockwise'), disabled: !canObserveFrame(state) || state.frame.adjustment >= 45 }))),
          meta.id === 'frame' && h('label', { className: 'pw-slider', htmlFor: uid + '-frame-surround' }, t('frame_surround', 'Surround tilt'), h('output', { htmlFor: uid + '-frame-surround' }, state.frame.surround.toFixed(0) + '\u00b0'), h('input', { id: uid + '-frame-surround', type: 'range', min: -30, max: 30, step: 1, value: state.frame.surround, disabled: !state.frame.visible || !canObserveFrame(state), 'data-walk-frame-surround': true, onChange: function (event) { changeFrameSurround(Number(event.target.value)); } })),
          meta.id === 'frame' && h('div', null, h('label', { className: 'pw-precision' }, h('input', { type: 'checkbox', checked: state.frame.visible, disabled: !canObserveFrame(state), 'data-walk-frame-visible': true, onChange: function (event) { changeFrameVisible(event.target.checked); } }), t('frame_visible', 'Show tilted frame')), h('p', { className: 'pw-baseline', 'data-walk-frame-observed': true }, t('frame_observed', 'Surround conditions compared') + ': ' + (state.frame.seen === 3 ? 2 : 1) + ' / 2')),
          meta.id === 'motion' && h('div', { className: 'pw-change-scene' }, h('strong', null, t('motion_pattern', 'Pattern') + ' ' + (state.motion.round + 1) + ' / 2'), button(h(React.Fragment, null, t('motion_next', 'Next pattern'), icon('ArrowRight', '>')), nextMotionPattern, { 'data-walk-motion-next': true, disabled: state.motion.completed.indexOf(state.motion.round) < 0 && !progress.assisted })),
          meta.id === 'motion' && h('div', null,
            h('label', { className: 'pw-slider', htmlFor: uid + '-motion-phase' }, t('motion_phase', 'Motion phase'), h('output', { htmlFor: uid + '-motion-phase' }, state.motion.phase.toFixed(0) + '\u00b0'), h('input', { id: uid + '-motion-phase', type: 'range', min: 0, max: 359, step: 1, value: state.motion.phase, disabled: !canObserveMotion(state), 'data-walk-motion-phase': true, onChange: function (event) { changeMotionPhase(Number(event.target.value)); } })),
            h('div', { className: 'pw-inspection-views' }, button(icon('SkipBack', '<'), function () { changeMotionPhase(state.motion.phase - 45); }, { 'data-walk-motion-back': true, title: t('motion_back', 'Previous motion phase'), 'aria-label': t('motion_back', 'Previous motion phase'), disabled: !canObserveMotion(state) }), button(icon(motionPlaying ? 'Pause' : 'Play', motionPlaying ? '||' : '>'), toggleMotionPlayback, { 'data-walk-motion-play': true, title: t(motionPlaying ? 'motion_pause' : 'motion_play', motionPlaying ? 'Pause motion' : 'Play motion'), 'aria-label': t(motionPlaying ? 'motion_pause' : 'motion_play', motionPlaying ? 'Pause motion' : 'Play motion'), 'aria-pressed': motionPlaying, disabled: reducedMotion || fallback || !canObserveMotion(state) }), button(icon('SkipForward', '>'), function () { changeMotionPhase(state.motion.phase + 45); }, { 'data-walk-motion-forward': true, title: t('motion_forward', 'Next motion phase'), 'aria-label': t('motion_forward', 'Next motion phase'), disabled: !canObserveMotion(state) })),
            h('p', { className: 'pw-baseline', 'data-walk-motion-observed': true }, t('motion_observed', 'Separated phases compared') + ': ' + Math.min(3, observedMotion(state)) + ' / 3')),
          meta.id === 'motion' && h('fieldset', { className: 'pw-choices pw-motion-choices', disabled: !canObserveMotion(state) }, h('legend', null, t('motion_group', 'Three spheres moving together')), ['A', 'B', 'C', 'D', 'E', 'F'].map(function (choice) { return h('label', { key: choice }, h('input', { type: 'checkbox', value: choice, checked: state.motion.selected.indexOf(choice) >= 0, 'data-walk-motion-choice': choice, onChange: function () { selectMotion(choice); } }), choice); })),
          meta.id === 'shape' && h('div', { className: 'pw-change-scene' }, h('strong', null, t('rotation_pair', 'Pair') + ' ' + (state.shape.round + 1) + ' / 2'), button(h(React.Fragment, null, t('rotation_next', 'Next pair'), icon('ArrowRight', '>')), nextShapePair, { 'data-walk-shape-next': true, disabled: state.shape.completed.indexOf(state.shape.round) < 0 && !progress.assisted })),
          meta.id === 'shape' && h('div', null,
            h('fieldset', { className: 'pw-choices pw-rotation-pieces' }, h('legend', null, t('shape_piece', 'Hoop to turn')), ['A', 'B'].map(function (choice, index) { return h('label', { key: choice }, h('input', { type: 'radio', name: uid + '-shape-piece', value: index, checked: state.shape.selected === index, disabled: !canTurnShape(state, index), 'data-walk-shape-piece': index, onChange: function () { selectShape(index); } }), choice); })),
            [['yaw', 'Turn angle', state.shape.angles, 0, 359], ['tilt', 'Tilt angle', state.shape.tilts, -75, 75]].map(function (setting) { var value = setting[2][state.shape.selected]; return h('label', { key: setting[0], className: 'pw-slider', htmlFor: uid + '-shape-' + setting[0] }, t('rotation_' + setting[0], setting[1]), h('output', { htmlFor: uid + '-shape-' + setting[0] }, value.toFixed(0) + '\u00b0'), h('input', { id: uid + '-shape-' + setting[0], type: 'range', min: setting[3], max: setting[4], step: 1, value: value, disabled: !canTurnShape(state, state.shape.selected), ['data-walk-shape-' + setting[0]]: true, onChange: function (event) { var r = state.shape; rotateHoop(r.selected, setting[0] === 'yaw' ? Number(event.target.value) : r.angles[r.selected], setting[0] === 'tilt' ? Number(event.target.value) : r.tilts[r.selected]); } })); }),
            h('div', { className: 'pw-rotation-adjustments' }, [['left', 'RotateCcw', 'Turn hoop counterclockwise', -1, 0], ['right', 'RotateCw', 'Turn hoop clockwise', 1, 0], ['up', 'ChevronUp', 'Tilt hoop upward', 0, 1], ['down', 'ChevronDown', 'Tilt hoop downward', 0, -1]].map(function (control) { var r = state.shape, label = t('shape_' + control[0], control[2]); return button(icon(control[1], '+'), function () { var step = state.precise ? 1 : 5; rotateHoop(r.selected, r.angles[r.selected] + control[3] * step, r.tilts[r.selected] + control[4] * step); }, { key: control[0], title: label, 'aria-label': label, ['data-walk-shape-' + control[0]]: true, disabled: !canTurnShape(state, r.selected) || control[4] > 0 && r.tilts[r.selected] >= 75 || control[4] < 0 && r.tilts[r.selected] <= -75 }); }))),
          meta.id === 'shape' && h('fieldset', { className: 'pw-choices pw-rotation-pieces' }, h('legend', null, t('shape_answer', 'Circular hoop')), ['A', 'B'].map(function (choice, index) { return h('label', { key: choice }, h('input', { type: 'radio', name: uid + '-shape-answer', value: choice, checked: state.shape.choice === choice, disabled: !canTurnShape(state, index), 'data-walk-shape-choice': choice, onChange: function () { update(function (next) { return chooseShape(next, choice); }); setStatus(''); } }), choice); })),
          meta.id === 'relief' && h('div', { className: 'pw-change-scene' }, h('strong', null, t('rotation_pair', 'Pair') + ' ' + (state.relief.round + 1) + ' / 2'), button(h(React.Fragment, null, t('rotation_next', 'Next pair'), icon('ArrowRight', '>')), nextReliefPair, { 'data-walk-relief-next': true, disabled: state.relief.completed.indexOf(state.relief.round) < 0 && !progress.assisted })),
          meta.id === 'relief' && h('div', null,
            h('label', { className: 'pw-slider', htmlFor: uid + '-relief-angle' }, t('relief_angle', 'Light direction'), h('output', { htmlFor: uid + '-relief-angle' }, state.relief.lightAngle.toFixed(0) + '\u00b0'), h('input', { id: uid + '-relief-angle', type: 'range', min: 0, max: 359, step: 1, value: state.relief.lightAngle, disabled: !canObserveRelief(state), 'data-walk-relief-angle': true, onChange: function (event) { changeReliefLight(Number(event.target.value)); } })),
            h('div', { className: 'pw-inspection-views' }, [['above', 'ArrowUp', 'Light from above', 0], ['below', 'ArrowDown', 'Light from below', 180], ['left', 'RotateCcw', 'Turn light counterclockwise', -1], ['right', 'RotateCw', 'Turn light clockwise', 1]].map(function (light) { var label = t('relief_light_' + light[0], light[2]); return button(icon(light[1], '+'), function () { changeReliefLight(light[0] === 'above' || light[0] === 'below' ? light[3] : state.relief.lightAngle + light[3] * (state.precise ? 1 : 15)); }, { key: light[0], 'data-walk-relief-light': light[0], disabled: !canObserveRelief(state), title: label, 'aria-label': label, 'aria-pressed': light[0] === 'above' || light[0] === 'below' ? Math.abs(state.relief.lightAngle - light[3]) < 1e-5 : undefined }); })),
            h('p', { className: 'pw-baseline', 'data-walk-relief-evidence': true }, t('relief_lights', 'Opposing lights compared') + ': ' + (state.relief.seen === 3 ? '2' : '1') + ' / 2')),
          meta.id === 'relief' && h('fieldset', { className: 'pw-choices pw-rotation-pieces', disabled: !canObserveRelief(state) }, h('legend', null, t('relief_hollow', 'Surface with a hollow center')), ['A', 'B'].map(function (choice) { return h('label', { key: choice }, h('input', { type: 'radio', name: uid + '-relief-answer', value: choice, checked: state.relief.choice === choice, 'data-walk-relief-choice': choice, onChange: function () { selectRelief(choice); } }), choice); })),
          meta.id === 'rotation' && h('div', { className: 'pw-change-scene' }, h('strong', null, t('rotation_pair', 'Pair') + ' ' + (state.rotation.round + 1) + ' / 2'), button(h(React.Fragment, null, t('rotation_next', 'Next pair'), icon('ArrowRight', '>')), nextRotationPair, { 'data-walk-rotation-next': true, disabled: state.rotation.completed.indexOf(state.rotation.round) < 0 && !progress.assisted })),
          meta.id === 'rotation' && h('div', null,
            h('fieldset', { className: 'pw-choices pw-rotation-pieces' }, h('legend', null, t('rotation_piece', 'Sculpture to turn')), ['A', 'B'].map(function (choice, index) { return h('label', { key: choice }, h('input', { type: 'radio', name: uid + '-rotation-piece', value: index, checked: !referenceInspection && state.rotation.selected === index, disabled: !canTurnRotation(state, index), 'data-walk-rotation-piece': index, onChange: function () { selectRotation(index); } }), choice); })),
            [['yaw', 'Turn angle', state.rotation.angles, 0, 359], ['tilt', 'Tilt angle', state.rotation.tilts, -75, 75]].map(function (setting) { var value = setting[2][state.rotation.selected]; return h('label', { key: setting[0], className: 'pw-slider', htmlFor: uid + '-rotation-' + setting[0] }, t('rotation_' + setting[0], setting[1]), h('output', { htmlFor: uid + '-rotation-' + setting[0] }, value.toFixed(0) + '\u00b0'), h('input', { id: uid + '-rotation-' + setting[0], type: 'range', min: setting[3], max: setting[4], step: 1, value: value, disabled: referenceInspection || !canTurnRotation(state, state.rotation.selected), ['data-walk-rotation-' + setting[0]]: true, onChange: function (event) { var r = state.rotation; rotateSculpture(r.selected, setting[0] === 'yaw' ? Number(event.target.value) : r.angles[r.selected], setting[0] === 'tilt' ? Number(event.target.value) : r.tilts[r.selected]); } })); }),
            h('div', { className: 'pw-rotation-adjustments' }, [['left', 'RotateCcw', 'Turn sculpture counterclockwise', 1, 0], ['right', 'RotateCw', 'Turn sculpture clockwise', -1, 0], ['up', 'ChevronUp', 'Tilt sculpture upward', 0, 1], ['down', 'ChevronDown', 'Tilt sculpture downward', 0, -1]].map(function (control) { var r = state.rotation, label = t('rotation_' + control[0], control[2]); return button(icon(control[1], '+'), function () { var step = state.precise ? 1 : 5; rotateSculpture(r.selected, r.angles[r.selected] + control[3] * step, r.tilts[r.selected] + control[4] * step); }, { key: control[0], title: label, 'aria-label': label, ['data-walk-rotation-' + control[0]]: true, disabled: referenceInspection || !canTurnRotation(state, r.selected) || control[4] > 0 && r.tilts[r.selected] >= 75 || control[4] < 0 && r.tilts[r.selected] <= -75 }); }))),
          meta.id === 'rotation' && h('fieldset', { className: 'pw-choices pw-rotation-pieces' }, h('legend', null, t('rotation_matching', 'Matches reference R')), ['A', 'B'].map(function (choice, index) { return h('label', { key: choice }, h('input', { type: 'radio', name: uid + '-rotation-answer', value: choice, checked: state.rotation.choice === choice, disabled: !canTurnRotation(state, index), 'data-walk-rotation-choice': choice, onChange: function () { update(function (next) { return chooseRotation(next, choice); }); setStatus(''); } }), choice); })),
          meta.id === 'change' && h('div', { className: 'pw-change-scene' }, h('strong', null, t('change_scene', 'Scene') + ' ' + (state.change.round + 1) + ' / 3'), h('span', { 'data-walk-change-arrangement': true }, t('change_arrangement', 'Arrangement') + ' ' + (state.change.variant + 1)), button(h(React.Fragment, null, t('change_next', 'Next scene'), icon('ArrowRight', '>')), nextChangeScene, { 'data-walk-change-next': true, disabled: state.change.closed || state.change.completed.indexOf(state.change.round) < 0 && !progress.assisted })),
          meta.id === 'change' && h('fieldset', { className: 'pw-choices', disabled: state.change.closed || !canObserveChange(state) }, h('legend', null, t('change_changed', 'Object that changed')), ['A', 'B', 'C', 'D', 'E'].map(function (choice) { return h('label', { key: choice }, h('input', { type: 'radio', name: uid + '-change-object', value: choice, checked: state.change.selected === choice, 'data-walk-change-choice': choice, onChange: function () { selectChanged(choice); } }), t('change_object', 'Object') + ' ' + choice); })),
          meta.id === 'shadow' && h('div', null,
            h('label', { className: 'pw-slider', htmlFor: uid + '-shadow-angle' }, t('shadow_angle', 'Turntable angle'), h('output', { htmlFor: uid + '-shadow-angle' }, state.shadowAngle.toFixed(0) + '\u00b0'), h('input', { id: uid + '-shadow-angle', type: 'range', min: 0, max: 359, step: 1, value: state.shadowAngle, disabled: !canRotateShadow(state), 'data-walk-shadow-angle': true, onChange: function (event) { changeShadow(Number(event.target.value)); } })),
            h('div', { className: 'pw-actions' }, button(icon('RotateCcw', '\u21ba'), function () { changeShadow(state.shadowAngle + (state.precise ? 1 : 5)); }, { disabled: !canRotateShadow(state), title: t('shadow_left', 'Turn sculpture counterclockwise'), 'aria-label': t('shadow_left', 'Turn sculpture counterclockwise'), 'data-walk-shadow-left': true }), button(icon('RotateCw', '\u21bb'), function () { changeShadow(state.shadowAngle - (state.precise ? 1 : 5)); }, { disabled: !canRotateShadow(state), title: t('shadow_right', 'Turn sculpture clockwise'), 'aria-label': t('shadow_right', 'Turn sculpture clockwise'), 'data-walk-shadow-right': true }))),
          meta.id === 'continuity' && h('div', null,
            h('label', { className: 'pw-slider', htmlFor: uid + '-continuity-offset' }, t('continuity_height', 'Right rod height'), h('output', { htmlFor: uid + '-continuity-offset' }, (2.995 + state.continuityOffset).toFixed(2)), h('input', { id: uid + '-continuity-offset', type: 'range', min: -1.2, max: 1.2, step: 0.01, value: state.continuityOffset, disabled: !canMoveContinuation(state), 'data-walk-continuity-offset': true, 'aria-valuetext': (2.995 + state.continuityOffset).toFixed(2) + ' ' + t('units', 'units'), onChange: function (event) { changeContinuation(Number(event.target.value)); } })),
            h('div', { className: 'pw-actions' }, button(icon('ArrowUp', '\u2191'), function () { changeContinuation(state.continuityOffset + (state.precise ? 0.01 : 0.05)); }, { disabled: !canMoveContinuation(state) || state.continuityOffset >= 1.2, title: t('continuity_up', 'Raise right rod'), 'aria-label': t('continuity_up', 'Raise right rod'), 'data-walk-continuity-up': true }), button(icon('ArrowDown', '\u2193'), function () { changeContinuation(state.continuityOffset - (state.precise ? 0.01 : 0.05)); }, { disabled: !canMoveContinuation(state) || state.continuityOffset <= -1.2, title: t('continuity_down', 'Lower right rod'), 'aria-label': t('continuity_down', 'Lower right rod'), 'data-walk-continuity-down': true }))),
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
          button(t(meta.id === 'continuity' ? reveal ? 'continuity_cover' : 'continuity_uncover' : 'reveal', meta.id === 'continuity' ? reveal ? 'Cover the line' : 'Uncover the line' : 'Reveal principle'), revealPrinciple, { 'data-walk-reveal': true, 'aria-pressed': reveal }), reveal && h('p', { className: 'pw-explanation', 'data-walk-explanation': true }, t(meta.id + '_explanation', meta.explanation)),
          h('label', { className: 'pw-note', htmlFor: uid + '-note' }, t('note', 'Your observation'), h('textarea', { id: uid + '-note', maxLength: 600, value: state.notes[meta.id], 'data-walk-note': true, onChange: function (event) { var value = event.target.value; update(function (next) { next.notes[next.activity] = value; return next; }); } })))));
  }
  Lab.PerceptionWalk = { Component: Walk, normalize: normalize, normalizePlayer: normalizePlayer, movePlayer: movePlayer, moveBlock: moveBlock, moveContinuation: moveContinuation, canMoveContinuation: canMoveContinuation, shadowGeometry: shadowGeometry, shadowProfile: shadowProfile, shadowOutline: shadowOutline, canRotateShadow: canRotateShadow, rotateShadow: rotateShadow, changeObjects: changeObjects, changeTarget: changeTarget, canObserveChange: canObserveChange, toggleChangeShutter: toggleChangeShutter, selectChange: selectChange, changeMatches: changeMatches, checkChange: checkChange, nextChange: nextChange, faceExhibit: faceExhibit, recordView: recordView, turnCorner: turnCorner, toggleTile: toggleTile, evidence: evidence, checkAnswer: checkAnswer, canCollect: canCollect, spawn: spawn, activities: ACTIVITIES };
  Object.assign(Lab.PerceptionWalk, { nextRoom: nextRoom, rotationObjects: rotationObjects, rotationPoint: rotationPoint, rotationMatch: rotationMatch, canTurnRotation: canTurnRotation, turnRotation: turnRotation, chooseRotation: chooseRotation, rotationMatches: rotationMatches, checkRotation: checkRotation, nextRotation: nextRotation, rotationInspectionViews: rotationInspectionViews, rotationInspection: rotationInspection, inspectRotation: inspectRotation });
  Object.assign(Lab.PerceptionWalk, { reliefObjects: reliefObjects, reliefSurface: reliefSurface, reliefLight: reliefLight, reliefShade: reliefShade, reliefTarget: reliefTarget, canObserveRelief: canObserveRelief, turnReliefLight: turnReliefLight, chooseRelief: chooseRelief, reliefMatches: reliefMatches, checkRelief: checkRelief, nextRelief: nextRelief, reliefInspectionViews: reliefInspectionViews, reliefInspection: reliefInspection, inspectRelief: inspectRelief });
  Object.assign(Lab.PerceptionWalk, { shapeObjects: shapeObjects, shapePoint: rotationPoint, shapeTarget: shapeTarget, shapeDefaults: shapeDefaults, canTurnShape: canTurnShape, turnShape: turnShape, chooseShape: chooseShape, shapeMatches: shapeMatches, checkShape: checkShape, nextShape: nextShape, shapeInspectionViews: shapeInspectionViews, shapeInspection: shapeInspection, inspectShape: inspectShape });
  Object.assign(Lab.PerceptionWalk, { motionTargets: motionTargets, motionObjects: motionObjects, canObserveMotion: canObserveMotion, setMotionPhase: setMotionPhase, observedMotion: observedMotion, toggleMotion: toggleMotion, motionMatches: motionMatches, checkMotion: checkMotion, nextMotion: nextMotion });
  Object.assign(Lab.PerceptionWalk, { frameDefaults: frameDefaults, frameObjects: frameObjects, canObserveFrame: canObserveFrame, setFrameAdjustment: setFrameAdjustment, setFrameSurround: setFrameSurround, setFrameVisible: setFrameVisible, frameMatches: frameMatches, checkFrame: checkFrame, nextFrame: nextFrame });
  Object.assign(Lab.PerceptionWalk, { weaveDefaults: weaveDefaults, weaveOrder: weaveOrder, weaveObjects: weaveObjects, canManipulateWeave: canManipulateWeave, selectWeave: selectWeave, setWeaveDepth: setWeaveDepth, weaveView: weaveView, recordWeaveView: recordWeaveView, weaveInspectionViews: weaveInspectionViews, inspectWeave: inspectWeave, weaveMatches: weaveMatches, checkWeave: checkWeave, nextWeave: nextWeave });
  Object.assign(Lab.PerceptionWalk, { apertureDefaults: apertureDefaults, apertureObjects: apertureObjects, canObserveAperture: canObserveAperture, setAperturePhase: setAperturePhase, setApertureSpeed: setApertureSpeed, toggleApertureMask: toggleApertureMask, selectApertureAxis: selectApertureAxis, apertureMatches: apertureMatches, checkAperture: checkAperture, nextAperture: nextAperture, apertureInspectionViews: apertureInspectionViews, inspectAperture: inspectAperture, apertureSeen: apertureSeen });
  Object.assign(Lab.PerceptionWalk, { landingDefaults: landingDefaults, landingLight: landingLight, landingObjects: landingObjects, canManipulateLanding: canManipulateLanding, selectLanding: selectLanding, setLandingHeight: setLandingHeight, setLandingLight: setLandingLight, landingAligned: landingAligned, landingMatches: landingMatches, checkLanding: checkLanding, nextLanding: nextLanding, landingInspectionViews: landingInspectionViews, inspectLanding: inspectLanding });
  Object.assign(Lab.PerceptionWalk, { saveViewpoint: saveViewpoint, recallViewpoint: recallViewpoint, clearViewpoint: clearViewpoint, canSaveViewpoint: canSaveViewpoint });
  Object.assign(Lab.PerceptionWalk, { lengthDefaults: lengthDefaults, lengthObjects: lengthObjects, canObserveLength: canObserveLength, setLengthValue: setLengthValue, setLengthVisible: setLengthVisible, lengthMatches: lengthMatches, checkLength: checkLength, nextLength: nextLength, lengthInspectionViews: lengthInspectionViews, inspectLength: inspectLength });
}());
