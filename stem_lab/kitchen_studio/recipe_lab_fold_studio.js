/* Gather, draw inward and release. Illustration previews never change cooking evidence. */
(function (root) {
  'use strict';
  var ns = 'http://www.w3.org/2000/svg';
  var center = { x: 200, y: 152 }, scale = 170, radius = .42, tau = Math.PI * 2;

  function mount(host) {
    var R = root.KitchenRecipes, F = root.KitchenPanFolding;
    var view = null, locked = true, active = false, gesture = null, disposed = false;
    var listeners = [], foodNodes = [], foodKey = null;
    var studio = document.createElement('section');
    studio.className = 'fold-studio';
    studio.hidden = true;
    studio.setAttribute('aria-label', 'Gather and fold studio');
    studio.innerHTML = '<div class="fold-studio-heading"><span class="fold-studio-eyebrow">GATHER · DRAW IN · RELEASE</span><h4 id="foldStudioHeading">Bring the coating together</h4><p id="foldStudioIntro">Guide the spoon around the food, draw it into the center, then release to fold.</p></div>' +
      '<div class="fold-studio-stage"></div>' +
      '<ol class="fold-studio-sequence" aria-label="Mixing sequence"><li id="foldStudioStep1">Gather around</li><li id="foldStudioStep2">Draw inward</li><li id="foldStudioStep3">Release</li></ol>' +
      '<p id="foldStudioHelp" class="fold-studio-help">Drag from the dotted ring in a full circle, either way. Keep holding and draw inward to the center; release to finish. Keyboard: Enter picks up, Left or Right gathers a quarter turn, Down draws inward, Enter releases. Escape cancels.</p>' +
      '<p id="foldStudioTiming" class="fold-studio-note" hidden></p><p id="foldStudioPool" class="fold-studio-note" hidden></p>' +
      '<p id="mixGestureStatus" class="fold-studio-instruction" role="status" aria-live="polite" aria-atomic="true"></p>' +
      '<dl class="fold-studio-readings"><div><dt id="foldStudioWaterLabel">Saved water awaiting a mix</dt><dd id="foldStudioWater">0 mL</dd></div><div id="foldStudioPlainRow" hidden><dt>Plain water awaiting a mix</dt><dd id="foldStudioPlain">0 mL</dd></div><div><dt id="foldStudioJuiceLabel">Tomato juice awaiting a mix</dt><dd id="foldStudioJuice">0 mL</dd></div></dl>' +
      '<div class="fold-studio-controls" role="group" aria-label="Step through a fold"><button type="button" id="foldStudioPick">Pick up spoon</button><button type="button" id="foldStudioCW">Gather ↻</button><button type="button" id="foldStudioCCW">Gather ↺</button><button type="button" id="foldStudioInward">Draw inward</button><button type="button" id="foldStudioRelease">Release spoon</button><button type="button" id="foldStudioCancel">Put back · cancel</button></div>' +
      '<p class="fold-studio-note">The controls above follow the same path one step at a time. There is no speed or dexterity score. An unfinished movement changes nothing.</p>' +
      '<div class="fold-studio-observation"><p id="foldStudioReceipt"></p><button type="button" id="foldStudioCheck">Inspect the coating</button></div>' +
      '<p id="foldStudioLearning" class="fold-studio-learning">Mixing spreads the liquid already in the pan. It does not add water or reduce excess liquid. Look at a fresh sauce trail before deciding what to change.</p>';
    var svg = document.createElementNS(ns, 'svg');
    svg.id = 'mixSvg';
    svg.setAttribute('viewBox', '0 0 400 320');
    svg.setAttribute('tabindex', '0');
    svg.setAttribute('role', 'application');
    svg.setAttribute('aria-labelledby', 'foldStudioTitle');
    svg.setAttribute('aria-describedby', 'foldStudioHelp mixGestureStatus');
    svg.innerHTML = '<title id="foldStudioTitle">Gather and fold with a wooden spoon</title>' +
      '<defs><linearGradient id="foldStudioWood" x2="0" y2="1"><stop stop-color="#efdfbd"/><stop offset="1" stop-color="#cba679"/></linearGradient>' +
      '<linearGradient id="foldStudioSteel" x2="1" y2="1"><stop stop-color="#f9fff5"/><stop offset=".2" stop-color="#c3d2c5"/><stop offset=".48" stop-color="#668276"/><stop offset=".7" stop-color="#dbe8da"/><stop offset="1" stop-color="#789386"/></linearGradient>' +
      '<radialGradient id="foldStudioPan"><stop stop-color="#627567"/><stop offset=".8" stop-color="#3f584a"/><stop offset="1" stop-color="#273f35"/></radialGradient>' +
      '<linearGradient id="foldStudioSpoonWood" x2="1" y2="1"><stop stop-color="#f0c581"/><stop offset=".5" stop-color="#bd854b"/><stop offset="1" stop-color="#8b5b35"/></linearGradient>' +
      '<clipPath id="foldStudioPanClip"><circle cx="200" cy="152" r="101"/></clipPath></defs>' +
      '<g aria-hidden="true"><rect x="1" y="1" width="398" height="318" rx="20" fill="url(#foldStudioWood)" stroke="#ac885e"/>' +
      '<path d="M16 44Q200 31 384 44M16 94Q176 107 384 94M16 254Q223 242 384 254M16 295Q156 282 384 295" fill="none" stroke="#9e7449" opacity=".21"/>' +
      '<path d="M310 145H366Q381 145 381 157Q381 170 366 170H310" fill="#334e42" stroke="#1e392f" stroke-width="3"/><path d="M329 151H367" stroke="#91aa94" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M87 139H67Q59 139 59 151Q59 165 67 165H87" fill="none" stroke="#789184" stroke-width="8"/>' +
      '<ellipse cx="202" cy="166" rx="124" ry="118" fill="#746045" opacity=".2"/>' +
      '<circle cx="200" cy="152" r="119" fill="url(#foldStudioSteel)" stroke="#4b6a59" stroke-width="2"/>' +
      '<circle cx="200" cy="152" r="109" fill="url(#foldStudioPan)" stroke="#dbe6d0" stroke-width="2"/>' +
      '<path d="M117 98A103 103 0 0 1 251 63" fill="none" stroke="#f8ffed" stroke-width="2" opacity=".45"/>' +
      '<g id="foldStudioPanContents" clip-path="url(#foldStudioPanClip)"><circle id="foldStudioSauce" cx="200" cy="152" r="99" fill="#ac975e" opacity=".42"/>' +
      '<path id="foldStudioSauceSwirl" d="M153 113Q242 87 267 146Q281 203 195 216Q138 213 123 160" fill="none" stroke="#dcc37c" stroke-width="5" stroke-linecap="round" opacity=".3"/>' +
      '<g id="mixFood"><g id="foldStudioPasta"></g><g id="foldStudioProduce"></g></g>' +
      '<ellipse id="foldStudioUnmixedPool" cx="248" cy="193" rx="25" ry="13" fill="#efeabd" stroke="#f5edcd" stroke-width="1.5" opacity="0"/></g>' +
      '<circle id="foldStudioRing" cx="200" cy="152" r="71.4" fill="none" stroke="#fff3c1" stroke-width="2" stroke-dasharray="2 7"/>' +
      '<circle id="mixProgress" cx="200" cy="152" r="76" fill="none" stroke="#fbd67b" stroke-width="4" stroke-linecap="round" stroke-dasharray="0 478"/>' +
      '<g id="foldStudioInwardGuide" visibility="hidden"><path id="foldStudioInwardPath" d="M263 152H217m8-6-8 6 8 6" fill="none" stroke="#fff4c9" stroke-width="2.5" stroke-dasharray="4 4"/><circle cx="200" cy="152" r="16" fill="none" stroke="#fff4c9" stroke-width="2" stroke-dasharray="4 4"/></g>' +
      '<g id="mixSpoon"><ellipse cx="3" cy="8" rx="16" ry="24" fill="#263d30" opacity=".24"/>' +
      '<path d="M-5-14L-6-95Q-6-101 0-101Q6-101 6-95L5-14Z" fill="url(#foldStudioSpoonWood)" stroke="#80552f" stroke-width="1.3"/>' +
      '<path d="M-2-25-2-90M2-31 2-84" fill="none" stroke="#e1b271" stroke-width="1" opacity=".6"/>' +
      '<ellipse rx="14" ry="21" fill="url(#foldStudioSpoonWood)" stroke="#8c6039" stroke-width="1.5"/>' +
      '<ellipse cy="1" rx="9" ry="15" fill="#9f6e3e" opacity=".55"/><path d="M-9-4Q-8-15 0-17" fill="none" stroke="#f3cd8c" stroke-width="1.5" stroke-linecap="round"/>' +
      '<g id="foldStudioLiftedPasta" visibility="hidden"><path d="M-7 2 5-4M-4 9 8 4" stroke="#e6bd69" stroke-width="6" stroke-linecap="round"/><path d="M-7 1 4-5M-4 8 7 3" stroke="#ffdf91" stroke-width="1.4" stroke-linecap="round"/></g></g>' +
      '<rect x="27" y="283" width="346" height="25" rx="9" fill="#fff8e8" opacity=".91"/><text id="foldStudioCaption" x="200" y="300" text-anchor="middle" fill="#35523c" font-size="12" font-weight="700">GATHER AROUND → DRAW IN → RELEASE</text></g>';
    studio.querySelector('.fold-studio-stage').append(svg);
    host.container.append(studio);
    function $(id) { return studio.querySelector('#' + id); }
    function on(el, type, fn) { el.addEventListener(type, fn); listeners.push([el, type, fn]); }
    function text(id, value) { if ($(id).textContent !== value) $(id).textContent = value; }
    function stamp(s) { return JSON.stringify(s); }
    function volume(n) { return (Math.round(n * 10) / 10) + ' mL'; }
    function ready() {
      return !!view && !disposed && active && !locked && !document.hidden && !view.submitted &&
        host.getState() === view && F.available(view, locked);
    }
    function fresh(g) { return !!g && ready() && g.source === view && g.stamp === stamp(view); }
    function preview(trace) { if (host.preview) host.preview(trace); }
    function idle() {
      if (!view) return 'Preparing the spoon.';
      if (!active) return 'Open the mixing tool to use this studio.';
      if (locked) return 'This recorded or finished kitchen is read-only.';
      if (view.submitted) return 'This submitted cook is read-only.';
      if (view.plated) return 'This dish has been plated. Start another cook to practice a fold.';
      if (view.time >= 3600 || view.log.length >= 1200) return 'This cook has reached its limit and is read-only.';
      if (view.time + F.duration(view) > 3600) return 'Fewer than ' + F.duration(view) + ' simulated seconds remain in this cook. There is not enough time to complete another mix.';
      if (R.serving(view).started) return 'Return the spoonfuls to the pan before mixing again.';
      if (!view.pan.produce) return 'Add prepared produce to the pan before mixing.';
      return view.pan.combined ? 'Start on the dotted ring. Gather a full circle, draw into the center, then release to fold.' :
        'Start on the dotted ring. Gather a full circle, then release to redistribute the produce.';
    }
    function instruction() {
      if (!gesture) { text('mixGestureStatus', idle()); return; }
      var t = gesture.trace;
      text('mixGestureStatus', t.invalid ? 'The spoon left the fold path. Put it back and try again; nothing has changed.' :
        t.phase === 'release' ? 'Ready · release the spoon to record this ' + (t.fold ? 'fold.' : 'sweep.') :
        t.phase === 'fold' ? 'Circle gathered · keep holding and draw the spoon toward the center.' :
        'Gathering · follow the dotted ring all the way around in either direction. Release early to cancel.');
    }
    function point(event) {
      var q;
      try {
        var matrix = svg.getScreenCTM();
        if (matrix && svg.createSVGPoint) {
          var p = svg.createSVGPoint(); p.x = event.clientX; p.y = event.clientY;
          q = p.matrixTransform(matrix.inverse());
        }
      } catch (ignore) {}
      if (!q || !Number.isFinite(q.x) || !Number.isFinite(q.y)) {
        var r = svg.getBoundingClientRect(), unit = Math.min(r.width / 400, r.height / 320);
        if (!(unit > 0)) return null;
        q = { x: (event.clientX - r.left - (r.width - unit * 400) / 2) / unit,
          y: (event.clientY - r.top - (r.height - unit * 320) / 2) / unit };
      }
      return { x: (q.x - center.x) / scale, z: (q.y - center.y) / scale };
    }
    function releaseGesture() {
      var old = gesture; gesture = null;
      if (old && old.pointer !== null) {
        try { if (svg.hasPointerCapture && svg.hasPointerCapture(old.pointer)) svg.releasePointerCapture(old.pointer); } catch (ignore) {}
      }
      if (old) preview(null);
      return old;
    }
    function cancel(message) {
      var old = releaseGesture();
      if (disposed) return;
      paint();
      if (message) text('mixGestureStatus', message); else if (old) instruction();
    }
    function begin(p, pointer, input) {
      if (!ready() || !p || Math.hypot(p.x, p.z) < .22 || Math.hypot(p.x, p.z) > .65) return false;
      cancel();
      if (host.cancelNative) host.cancelNative();
      if (host.pause) host.pause();
      view = host.getState();
      if (!ready()) return false;
      var trace = F.start(p, view.pan.combined);
      if (!trace) return false;
      gesture = { trace: trace, pointer: pointer, input: input, source: view, stamp: stamp(view) };
      if (pointer !== null) try { svg.setPointerCapture(pointer); } catch (ignore) {}
      preview(trace); paint(); instruction(); return true;
    }
    function move(p) {
      var g = gesture;
      if (!g) return;
      if (!fresh(g)) { cancel('Movement canceled because the kitchen changed. Nothing was mixed.'); return; }
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.z)) { cancel('Movement interrupted. Nothing was mixed.'); return; }
      g.trace = F.move(g.trace, p);
      preview(g.trace.invalid ? null : g.trace); paint(); instruction();
    }
    function release() {
      var g = gesture;
      if (!g) return;
      if (!fresh(g)) { cancel('Movement canceled because the kitchen changed. Nothing was mixed.'); return; }
      if (!F.complete(g.trace)) { cancel('Spoon put back · the movement was unfinished, so nothing was mixed.'); return; }
      var before = view, expected = R.act(before, 'stirSweep', 'gesture', g.input);
      var entry = expected.log[expected.log.length - 1];
      // Clear preview before calling the host: apply may synchronously render and cancel tools.
      releaseGesture();
      try { host.apply('stirSweep', 'gesture', g.input); } catch (error) {
        view = host.getState(); paint(); text('mixGestureStatus', 'Mix interrupted. Check the pan before trying again.'); return;
      }
      var after = host.getState(); view = after;
      paint();
      if (after !== before && expected !== before && entry && entry.accepted && stamp(after) === stamp(expected)) {
        text('mixGestureStatus', after.mixingModel === 2 ? 'Mix recorded. ' + F.pool(after).text : g.trace.fold ? 'Fold recorded · the liquid is spread through the pasta. Inspect the coating before another splash.' :
          'Sweep recorded · the produce has been redistributed. Observe it before the next cooking step.');
      } else text('mixGestureStatus', 'The kitchen changed before the mix could be recorded. Check the pan before trying again.');
    }
    function turn(direction, input) {
      var g = gesture;
      if (!g || g.pointer !== null || g.trace.invalid || g.trace.phase !== 'sweep') return;
      g.input = input;
      var a = Math.atan2(g.trace.point.z, g.trace.point.x);
      // Small steps match a continuous pointer path and avoid a quarter-turn rounding boundary.
      for (var i = 1; i <= 8 && gesture === g && g.trace.phase === 'sweep'; i++) {
        var angle = a + direction * Math.PI / 2 * i / 8;
        move({ x: Math.cos(angle) * radius, z: Math.sin(angle) * radius });
      }
    }
    function inward(input) {
      var g = gesture;
      if (!g || g.pointer !== null || g.trace.invalid || g.trace.phase !== 'fold') return;
      g.input = input;
      var a = g.trace.anchor, along = g.trace.point.x * a.x + g.trace.point.z * a.z;
      var next = Math.max(0, along - .1);
      move({ x: a.x * next, z: a.z * next });
    }
    function portionRatio(s) {
      var serving = R.serving(s);
      return s.pan.combined ? (serving.total ? serving.remaining / serving.total : 0) : 1;
    }
    function buildFood(s) {
      var surface = R.panSurface(s), portion = portionRatio(s), hasFood = !!s.pan.produce && !s.plated && portion > 0;
      var key = JSON.stringify([s.id, hasFood, s.pan.combined, s.pan.damage, portion, surface.pieces]);
      if (foodKey === key) return;
      foodKey = key; foodNodes = [];
      $('foldStudioProduce').innerHTML = ''; $('foldStudioPasta').innerHTML = '';
      var colors = { pale: '#dcc594', golden: '#b58545', dark: '#725133', scorched: '#443028', firm: '#dc6040', softened: '#ae422e' };
      function add(parent, markup, p, angle, type) {
        var node = document.createElementNS(ns, 'g'); node.innerHTML = markup; parent.append(node);
        foodNodes.push({ node: node, p: { x: p.x, y: 0, z: p.z }, angle: angle, type: type });
      }
      if (hasFood && s.pan.combined) for (var i = 0; i < Math.ceil(23 * portion); i++) {
        var a = i * 2.399, r = .12 + i % 4 * .12, color = s.pan.damage >= 1 ? '#8e724a' : s.id === 'tomato' ? '#e1a257' : '#e9c675';
        add($('foldStudioPasta'), '<path d="M-13-4 10-4 14 0 10 5-13 5-9 0Z" fill="' + color + '" stroke="#a97739" stroke-width=".8"/><path d="M-8-2H9M-8 1H9M-8 3H9" stroke="#ffe2a0" stroke-width=".7" opacity=".8"/><path d="M-13-4-9 0-13 5M10-4 14 0 10 5" fill="none" stroke="#a97940" stroke-width="1"/>',
          { x: Math.cos(a) * r, z: Math.sin(a) * r }, i * 39 % 180, 'pasta');
      }
      if (hasFood) surface.pieces.slice(0, Math.ceil(surface.pieces.length * portion)).forEach(function (p, i) {
        var size = p.width ? Math.max(7, Math.min(13, p.width * 1.1)) : 10;
        var color = colors[p.topColor] || '#b58b57', shape;
        if (s.id === 'tomato') {
          shape = '<path d="M-' + size + ' 0Q-' + (size + 2) + ' -' + size + ' 0 -' + size + 'Q' + size + ' -' + (size + 2) + ' ' + size + ' 1Q' + (size + 1) + ' ' + size + ' 0 ' + size + 'Q-' + size + ' ' + size + ' -' + size + ' 0Z" fill="' + color + '" stroke="#823c2b" stroke-width="1.2"/><path d="M-5-3 1 0M0 5 3-2" stroke="#f3aa72" stroke-width="2" stroke-linecap="round" opacity=".75"/><path d="M-6-5Q-1-9 4-6" fill="none" stroke="#f79564" stroke-width="1.2"/>';
        } else {
          shape = '<path d="M-3 0H3L4 ' + (size + 2) + 'Q0 ' + (size + 5) + ' -4 ' + (size + 2) + 'Z" fill="' + color + '" stroke="#745438" stroke-width="1"/><path d="M-' + size + ' 2Q-' + (size + 2) + ' -' + size + ' 0 -' + size + 'Q' + (size + 2) + ' -' + size + ' ' + size + ' 2Z" fill="' + color + '" stroke="#745438" stroke-width="1.2"/><path d="M-' + (size - 3) + '-1Q0-' + (size - 1) + ' ' + (size - 3) + '-1" fill="none" stroke="#edd4a1" stroke-width="1.5" opacity=".65"/><path d="M-5 2 0 0 5 2" fill="none" stroke="#745438" stroke-width=".8" opacity=".65"/>';
        }
        add($('foldStudioProduce'), shape, p, i * 37 % 160 - 80, 'produce');
      });
    }
    function paintFood(s, t) {
      buildFood(s);
      var hasFood = !!s.pan.produce && !s.plated && portionRatio(s) > 0, mixing = R.mixing(s);
      studio.dataset.panRecipe = s.id;
      studio.dataset.panContents = hasFood ? s.pan.combined ? 'pasta-and-produce' : 'produce' : 'empty';
      $('foldStudioPanContents').setAttribute('visibility', hasFood ? 'visible' : 'hidden');
      $('foldStudioPasta').setAttribute('visibility', hasFood && s.pan.combined ? 'visible' : 'hidden');
      $('foldStudioSauce').setAttribute('fill', s.id === 'tomato' ? '#bf5737' : '#b6a36a');
      $('foldStudioSauce').setAttribute('opacity', String(Math.min(.65, .12 + Math.max(0, s.pan.moisture) / 400)));
      var pooling = s.mixingModel === 2 ? F.pool(s) : null;
      var liquid = hasFood ? pooling ? pooling.visible ? pooling.amount : 0 : Math.max(0, mixing.liquidSinceMix) : 0;
      $('foldStudioPool').hidden = !pooling; text('foldStudioPool', pooling ? pooling.text : '');
      if (pooling) studio.dataset.liquidPool = hasFood && pooling.visible ? 'visible' : 'not-visible'; else delete studio.dataset.liquidPool;
      $('foldStudioUnmixedPool').setAttribute('opacity', liquid ? String(Math.min(.82, .3 + liquid / 150)) : '0');
      $('foldStudioUnmixedPool').setAttribute('rx', String(12 + Math.min(22, liquid * .2)));
      $('foldStudioUnmixedPool').setAttribute('ry', String(5 + Math.min(10, liquid * .08)));
      $('foldStudioSauceSwirl').setAttribute('transform', 'rotate(' + (t && !t.invalid ? t.travel * 12 : 0) + ' 200 152)');
      foodNodes.forEach(function (food, index) {
        var p = food.p, pose = p, rotation = 0;
        if (t && !t.invalid) {
          rotation = t.travel * (.12 + index % 3 * .025);
          var co = Math.cos(rotation), si = Math.sin(rotation);
          pose = F.foodPose({ x: p.x * co - p.z * si, y: p.y, z: p.x * si + p.z * co }, index, t);
        }
        food.node.setAttribute('transform', 'translate(' + (200 + pose.x * scale) + ' ' + (152 + pose.z * scale - pose.y * 70) + ') rotate(' + (food.angle + rotation * 180 / Math.PI) + ')');
      });
      text('foldStudioWater', volume(mixing.waterSinceMix)); var hasPlain = typeof mixing.plainSinceMix === 'number'; $('foldStudioPlainRow').hidden = !hasPlain; text('foldStudioPlain', volume(mixing.plainSinceMix || 0)); text('foldStudioWaterLabel', s.mixingModel === 2 ? hasPlain ? 'Reduced cooking water added since previous mix' : 'Saved water added since previous mix' : hasPlain ? 'Reduced cooking water awaiting a mix' : 'Saved water awaiting a mix'); text('foldStudioJuiceLabel', s.mixingModel === 2 ? 'Tomato juice added since previous mix' : 'Tomato juice awaiting a mix'); $('foldStudioPlainRow').querySelector('dt').textContent = s.mixingModel === 2 ? 'Plain water added since previous mix' : 'Plain water awaiting a mix'; text('foldStudioJuice', volume(mixing.juiceSinceMix));
      var last = F.lastMix(s);
      text('foldStudioReceipt', s.mixingModel === 2 ? F.receipt(s, last) : last ? (last.water + last.juice + (last.plainWater || 0) ? 'Last mix spread ' + (last.plainWater !== undefined ? volume(last.water) + ' reduced cooking water, ' + volume(last.plainWater) + ' plain water and ' : volume(last.water) + ' saved water and ') + volume(last.juice) + ' released juice. ' : 'Last mix redistributed the ingredients. ') + last.observation : 'No mix recorded yet. The food moves as a preview until you release a complete path.');
    }
    function paint() {
      if (disposed) return;
      studio.hidden = !active;
      var g = gesture, t = g && g.trace, phase = t ? t.invalid ? 'retry' : t.phase : 'idle';
      var can = ready(), valid = !!g && fresh(g) && !t.invalid, stepped = !!g && g.pointer === null;
      studio.dataset.foldPhase = phase; studio.dataset.foldHeld = String(!!g);
      svg.dataset.foldPhase = phase; svg.setAttribute('aria-disabled', String(!can));
      // Keep focus inside the studio when a completed step disables its button.
      var focused = document.activeElement;
      if ((focused === $('foldStudioPick') && (!can || !!g)) ||
          ((focused === $('foldStudioCW') || focused === $('foldStudioCCW')) && (!valid || !stepped || phase !== 'sweep')) ||
          (focused === $('foldStudioInward') && (!valid || !stepped || phase !== 'fold')) ||
          ((focused === $('foldStudioRelease') || focused === $('foldStudioCancel')) && !g)) {
        if (active) svg.focus({ preventScroll: true });
      }
      $('foldStudioPick').disabled = !can || !!g;
      $('foldStudioCW').disabled = $('foldStudioCCW').disabled = !valid || !stepped || phase !== 'sweep';
      $('foldStudioInward').disabled = !valid || !stepped || phase !== 'fold';
      $('foldStudioRelease').disabled = !g || !stepped;
      $('foldStudioCancel').disabled = !g;
      $('foldStudioCheck').disabled = !can || !!g || !view.pan.combined;
      if (view) {
        paintFood(view, t);
        $('foldStudioStep2').hidden = !view.pan.combined;
        text('foldStudioIntro', view.pan.combined ? 'Guide the spoon around the food, draw it into the center, then release to fold.' : 'Guide the spoon around the produce, then release to redistribute the pieces.');
        text('foldStudioHelp', view.pan.combined ? 'Drag from the dotted ring in a full circle, either way. Keep holding and draw inward to the center; release to finish. Keyboard: Enter picks up, Left or Right gathers a quarter turn, Down draws inward, Enter releases. Escape cancels.' : 'Drag from the dotted ring in a full circle, either way; release to finish. Keyboard: Enter picks up, Left or Right gathers a quarter turn, Enter releases. Escape cancels.');
      }
      [1, 2, 3].forEach(function (step) {
        var current = valid && (step === 1 && phase === 'sweep' || step === 2 && phase === 'fold' || step === 3 && phase === 'release');
        if (current) $('foldStudioStep' + step).setAttribute('aria-current', 'step');
        else $('foldStudioStep' + step).removeAttribute('aria-current');
      });
      var travel = t && !t.invalid ? Math.min(tau, Math.abs(t.travel)) : 0, angle = t ? Math.atan2(t.point.z, t.point.x) : 0;
      var start = t ? (t.sweep.angle - t.travel) * 180 / Math.PI : 0;
      $('mixProgress').setAttribute('stroke-dasharray', (travel / tau * 477.53) + ' 478');
      $('mixProgress').setAttribute('transform', 'rotate(' + start + ' 200 152)' + (t && t.travel < 0 ? ' translate(0 304) scale(1 -1)' : ''));
      $('foldStudioRing').setAttribute('opacity', t && t.phase !== 'sweep' ? '.22' : '.85');
      $('foldStudioInwardGuide').setAttribute('visibility', valid && t.fold && phase !== 'sweep' ? 'visible' : 'hidden');
      $('foldStudioInwardGuide').setAttribute('transform', 'rotate(' + (t && t.anchor ? Math.atan2(t.anchor.z, t.anchor.x) * 180 / Math.PI : 0) + ' 200 152)');
      var p = t ? t.point : { x: radius, z: 0 }, lift = F.lift(t);
      $('mixSpoon').setAttribute('transform', 'translate(' + (200 + p.x * scale) + ' ' + (152 + p.z * scale - lift * 70) + ') rotate(' + (angle * 180 / Math.PI + 60) + ')');
      $('mixSpoon').setAttribute('opacity', !can && !g ? '.5' : '1');
      $('foldStudioLiftedPasta').setAttribute('visibility', valid && t.fold && t.inward > .1 ? 'visible' : 'hidden');
      text('foldStudioCaption', phase === 'sweep' ? 'GATHER · follow the dotted ring' : phase === 'fold' ? 'DRAW IN · bring the spoon to the center' : phase === 'release' ? 'RELEASE · record the completed movement' : phase === 'retry' ? 'PUT BACK · nothing has changed' : view && !view.pan.combined ? 'GATHER AROUND → RELEASE' : 'GATHER AROUND → DRAW IN → RELEASE');
    }
    on(svg, 'pointerdown', function (e) {
      if (gesture) { cancel('Movement canceled. Use one pointer at a time.'); return; }
      if (e.button !== 0 || e.isPrimary === false || !ready()) return;
      var p = point(e);
      if (!p || Math.hypot(p.x, p.z) < .22 || Math.hypot(p.x, p.z) > .65) return;
      e.preventDefault(); svg.focus({ preventScroll: true }); begin(p, e.pointerId, 'drag');
    });
    on(svg, 'pointermove', function (e) { if (gesture && gesture.pointer === e.pointerId) move(point(e)); });
    on(svg, 'pointerup', function (e) { if (gesture && gesture.pointer === e.pointerId) { move(point(e)); release(); } });
    ['pointercancel', 'lostpointercapture'].forEach(function (type) {
      on(svg, type, function (e) { if (gesture && gesture.pointer === e.pointerId) cancel('Spoon put back. Nothing was mixed.'); });
    });
    on(document, 'pointerdown', function (e) {
      if (gesture && (e.isPrimary === false || gesture.pointer !== null && e.pointerId !== gesture.pointer)) cancel('Movement canceled. Use one pointer at a time.');
    });
    on(svg, 'keydown', function (e) {
      if (['Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowDown', 'Escape'].indexOf(e.key) < 0) return;
      e.preventDefault(); if (e.repeat) return;
      if (e.key === 'Escape') { cancel('Spoon put back. Nothing was mixed.'); return; }
      if (!ready() || gesture && gesture.pointer !== null) return;
      if (e.key === 'Enter' || e.key === ' ') {
        if (gesture) release(); else begin({ x: radius, z: 0 }, null, 'keyboard');
      } else if (e.key === 'ArrowLeft') turn(-1, 'keyboard');
      else if (e.key === 'ArrowRight') turn(1, 'keyboard');
      else if (e.key === 'ArrowDown') inward('keyboard');
    });
    on($('foldStudioPick'), 'click', function () { begin({ x: radius, z: 0 }, null, 'select'); });
    on($('foldStudioCW'), 'click', function () { turn(1, 'select'); });
    on($('foldStudioCCW'), 'click', function () { turn(-1, 'select'); });
    on($('foldStudioInward'), 'click', function () { inward('select'); });
    on($('foldStudioRelease'), 'click', release);
    on($('foldStudioCancel'), 'click', function () { cancel('Spoon put back. Nothing was mixed.'); });
    on($('foldStudioCheck'), 'click', function () { if (ready() && !gesture && view.pan.combined && host.check) host.check(); });
    on(studio, 'focusout', function (e) {
      if (gesture && gesture.pointer === null && (!e.relatedTarget || !studio.contains(e.relatedTarget))) cancel('Spoon put back. Nothing was mixed.');
    });
    ['blur', 'pagehide', 'resize'].forEach(function (type) { on(root, type, function () { cancel(); }); });
    on(document, 'visibilitychange', function () { if (document.hidden) cancel(); });
    on(root, 'keydown', function (e) { if (e.key === 'Escape' && gesture) { e.preventDefault(); cancel('Spoon put back. Nothing was mixed.'); } });
    function render(s, historical, isActive) {
      if (disposed) return;
      view = s; locked = !!historical; active = !!isActive;
      var seconds = F.duration(s);
      $('foldStudioTiming').hidden = !seconds; text('foldStudioTiming', F.timingNote(s));
      svg.setAttribute('aria-describedby', 'foldStudioHelp ' + (seconds ? 'foldStudioTiming ' : '') + 'mixGestureStatus');
      text('foldStudioLearning', seconds ? 'Mixing distributes liquid and disperses oil. The spoon adds no water; while time passes, water can evaporate or move into pasta. Mixing cannot undo scorching. Look at a fresh sauce trail before deciding what to change.' : 'Mixing spreads the liquid already in the pan. It does not add water or reduce excess liquid. Look at a fresh sauce trail before deciding what to change.');
      if (gesture && !fresh(gesture)) cancel('Movement canceled because the kitchen changed. Nothing was mixed.');
      paint(); if (!gesture) instruction();
    }
    function dispose() {
      if (disposed) return;
      releaseGesture(); disposed = true;
      listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2]); }); listeners = []; studio.remove();
    }
    paint();
    return { render: render, cancel: cancel, dispose: dispose,
      focus: function () { if (!disposed) svg.focus({ preventScroll: true }); } };
  }
  var api = { mount: mount };
  root.KitchenFoldStudio = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
