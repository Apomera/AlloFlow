/* stem_tool_geologyexplorer.js — Geology Explorer
 *
 * An immersive voxel cross-section of the crust (three.js r128), sibling to
 * Geometry World but focused on geology. One scene teaches: superposition
 * (deeper sedimentary = older), cross-cutting (a younger granite pluton cuts the
 * layers), contact metamorphism (a baked aureole), depth -> temperature/pressure,
 * and where the rock cycle restarts (magma). Graduated from the
 * docs/geology_explorer_spike.html prototype.
 *
 * Hooks-safety: every hook is declared unconditionally at the top of render();
 * the THREE-not-ready / WebGL-failure branches choose the VISUAL only (never an
 * early return before a hook) — avoids the throwlab/optics "more hooks" crash.
 *
 * a11y: the 3D canvas is an ENHANCEMENT. The accessible core is an always-present
 * cross-section (SVG) + a keyboard-navigable strata list; selecting a rock there
 * shows the same info and announces it via a live region. So screen-reader and
 * keyboard-only users — and anyone whose WebGL fails — get the full tool.
 */
(function () {
  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;
  if (window.StemLab.isRegistered && window.StemLab.isRegistered('geologyExplorer')) return;

  var ENGINE_KEY = '__alloGeologyEngine';

  // ── Geology model (colours are illustrative, not photographic) ──────────────
  var ROCKS = {
    soil:      { name: 'Soil / Regolith',   type: 'Surface',             color: 0x6b4f2a, formation: 'Weathered rock + organic matter at the very surface.',                            minerals: 'Clay, quartz grains, organics', age: 'Youngest — forming today.' },
    sandstone: { name: 'Sandstone',         type: 'Sedimentary',         color: 0xd9b27a, formation: 'Sand grains (rivers, dunes, beaches) buried, compacted, and cemented.',           minerals: 'Quartz, feldspar',              age: 'Sits on top, so the youngest sedimentary layer.' },
    shale:     { name: 'Shale',             type: 'Sedimentary',         color: 0x6e7681, formation: 'Mud and clay settled in calm water, compacted into thin layers.',                minerals: 'Clay minerals, mica',           age: 'Older than the sandstone above it (superposition).' },
    limestone: { name: 'Limestone',         type: 'Sedimentary',         color: 0xbcd4d6, formation: 'Shells and coral (calcium carbonate) built up in warm, shallow seas.',           minerals: 'Calcite',                       age: 'Oldest sedimentary layer — deposited first.' },
    basement:  { name: 'Granite basement',  type: 'Igneous (intrusive)', color: 0xc99ab8, formation: 'Magma that cooled SLOWLY deep underground -> large interlocking crystals.',       minerals: 'Quartz, feldspar, mica',        age: 'Ancient basement — older than the sediments resting on it.' },
    intrusion: { name: 'Granite pluton',    type: 'Igneous (intrusive)', color: 0xe75fb0, formation: 'A LATER pulse of magma forced up through the layers and froze in place.',        minerals: 'Quartz, feldspar, mica',        age: 'YOUNGER than the layers it cuts — the cross-cutting rule wins here.' },
    marble:    { name: 'Marble',            type: 'Metamorphic',         color: 0xe8e8ee, formation: 'Limestone BAKED by the nearby pluton (contact metamorphism) -> recrystallised.', minerals: 'Recrystallised calcite',        age: 'Re-cooked when the intrusion arrived.' },
    hornfels:  { name: 'Hornfels / Schist', type: 'Metamorphic',         color: 0x8a5a8a, formation: 'Shale baked + squeezed beside the pluton -> hard, sometimes garnet-bearing.',    minerals: 'Mica, garnet',                  age: 'Re-cooked when the intrusion arrived.' },
    magma:     { name: 'Magma chamber',     type: 'Molten',              color: 0xff7a33, formation: 'Molten rock — the source. It cools to igneous rock and the cycle restarts.',     minerals: '—',                             age: 'Active now — still forming.' }
  };
  var TYPE_COLOR = { 'Surface': '#92786a', 'Sedimentary': '#38bdf8', 'Igneous (intrusive)': '#ec4899', 'Metamorphic': '#a78bfa', 'Molten': '#fb923c' };
  var ROCK_ORDER = ['soil', 'sandstone', 'shale', 'limestone', 'basement', 'magma', 'intrusion', 'marble', 'hornfels'];
  var NX = 14, NY = 12, NZ = 14, KM_PER_VOXEL = 0.9;

  function rockKeyAt(x, y, z) {
    var cx = (NX - 1) / 2, cz = (NZ - 1) / 2;
    var r = Math.sqrt((x - cx) * (x - cx) + (z - cz) * (z - cz));
    var intrusionR = 1.2 + (y / NY) * 2.6;
    if (y >= 3 && r < intrusionR) return 'intrusion';
    if (y >= 3 && y < NY - 1 && r < intrusionR + 1.05) return (y >= 6 && y <= 8) ? 'marble' : 'hornfels';
    if (y === 0) return 'soil';
    if (y <= 2) return 'sandstone';
    if (y <= 4) return 'shale';
    if (y <= 6) return 'limestone';
    if (y <= 9) return 'basement';
    return 'magma';
  }
  function hex(n) { return '#' + ('000000' + n.toString(16)).slice(-6); }
  function rockFacts(key, y) {
    var R = ROCKS[key];
    var depthKm = (y * KM_PER_VOXEL).toFixed(1);
    var tempC = key === 'magma' ? '≈ 1000+' : Math.round(15 + y * KM_PER_VOXEL * 25);
    var presMPa = Math.round(y * KM_PER_VOXEL * 27);
    return { key: key, R: R, depthKm: depthKm, tempC: tempC, presMPa: presMPa };
  }

  // ── three.js engine (imperative; lives on window[ENGINE_KEY]) ───────────────
  function initEngine(container, opts) {
    var THREE = window.THREE;
    var eng = { disposed: false };
    var cnv = document.createElement('canvas');
    cnv.style.width = '100%'; cnv.style.height = '100%'; cnv.style.display = 'block';
    container.appendChild(cnv);
    var renderer = new THREE.WebGLRenderer({ canvas: cnv, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913);
    scene.fog = new THREE.Fog(0x060913, 28, 64);
    var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    camera.position.set(NX * 1.15, NY * 1.05, NZ * 1.4);
    var controls = THREE.OrbitControls ? new THREE.OrbitControls(camera, renderer.domElement) : null;
    if (controls) { controls.enableDamping = true; controls.dampingFactor = 0.08; controls.target.set(0, -NY * 0.18, 0); controls.minDistance = 8; controls.maxDistance = 56; }
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    var keyL = new THREE.DirectionalLight(0xfff1d0, 0.95); keyL.position.set(12, 20, 14); scene.add(keyL);
    var fillL = new THREE.DirectionalLight(0x90b4ff, 0.35); fillL.position.set(-14, 6, -10); scene.add(fillL);
    var magmaGlow = new THREE.PointLight(0xff5522, 1.0, 30); magmaGlow.position.set(0, -NY * 0.5, 0); scene.add(magmaGlow);

    var voxels = [];
    for (var y = 0; y < NY; y++) for (var x = 0; x < NX; x++) for (var z = 0; z < NZ; z++) voxels.push({ x: x, y: y, z: z, key: rockKeyAt(x, y, z) });
    var removed = {};
    function vkey(v) { return v.x + ',' + v.y + ',' + v.z; }
    function worldPos(v) { return [(v.x - (NX - 1) / 2), ((NY - 1) / 2 - v.y), (v.z - (NZ - 1) / 2)]; }

    var geo = new THREE.BoxGeometry(1, 1, 1);
    var mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.05 });
    var mesh = new THREE.InstancedMesh(geo, mat, voxels.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);
    var dummy = new THREE.Object3D(), col = new THREE.Color();
    var instanceToVoxel = [];
    var sliceZ = 0, excavate = false;

    function visible(v) { return !removed[vkey(v)] && v.z >= sliceZ; }
    function rebuild() {
      var i = 0; instanceToVoxel.length = 0;
      for (var k = 0; k < voxels.length; k++) {
        var v = voxels[k]; if (!visible(v)) continue;
        var p = worldPos(v); dummy.position.set(p[0], p[1], p[2]); dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix); col.setHex(ROCKS[v.key].color); mesh.setColorAt(i, col);
        instanceToVoxel[i] = v; i++;
      }
      mesh.count = i; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    rebuild();

    var raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), down = null;
    function shallowest(x, z) { for (var yy = 0; yy < NY; yy++) { if (!removed[x + ',' + yy + ',' + z]) return yy; } return null; }
    function pick(ev) {
      var rect = cnv.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      var hits = raycaster.intersectObject(mesh); if (!hits.length) return;
      var v = instanceToVoxel[hits[0].instanceId]; if (!v) return;
      if (excavate) {
        var top = shallowest(v.x, v.z);
        if (v.y !== top) { if (opts.onFlash) opts.onFlash('Dig the layers above first — deeper = older (superposition).'); if (opts.onSelect) opts.onSelect(rockFacts(v.key, v.y)); return; }
        removed[vkey(v)] = 1; rebuild();
        var below = shallowest(v.x, v.z);
        if (below != null && opts.onSelect) opts.onSelect(rockFacts(rockKeyAt(v.x, below, v.z), below));
        if (opts.onFlash) opts.onFlash('Excavated ' + ROCKS[v.key].name + '. The layer beneath is now exposed.');
      } else if (opts.onSelect) { opts.onSelect(rockFacts(v.key, v.y)); }
    }
    function onDown(e) { down = { x: e.clientX, y: e.clientY }; }
    function onUp(e) { if (!down) return; var moved = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y); down = null; if (moved < 6) pick(e); }
    cnv.addEventListener('pointerdown', onDown); cnv.addEventListener('pointerup', onUp);
    function onLost(e) { e.preventDefault(); if (opts.onContextLost) opts.onContextLost(); }
    cnv.addEventListener('webglcontextlost', onLost, false);

    function resize() { var w = container.clientWidth || 600, h = container.clientHeight || 420; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    resize();
    var ro = null; try { ro = new ResizeObserver(resize); ro.observe(container); } catch (e) {}

    var t = 0, raf = null;
    function loop() { if (eng.disposed) return; raf = requestAnimationFrame(loop); t += 0.016; magmaGlow.intensity = 1.05 + Math.sin(t * 2) * 0.22; if (controls) controls.update(); renderer.render(scene, camera); }
    loop();

    eng.setSlice = function (z) { sliceZ = z | 0; rebuild(); };
    eng.setExcavate = function (b) { excavate = !!b; };
    eng.reset = function () { removed = {}; sliceZ = 0; rebuild(); };
    eng.dispose = function () {
      eng.disposed = true; if (raf) cancelAnimationFrame(raf);
      cnv.removeEventListener('pointerdown', onDown); cnv.removeEventListener('pointerup', onUp); cnv.removeEventListener('webglcontextlost', onLost);
      if (ro) try { ro.disconnect(); } catch (e) {}
      try { geo.dispose(); mat.dispose(); renderer.dispose(); } catch (e) {}
      if (cnv.parentNode) cnv.parentNode.removeChild(cnv);
    };
    return eng;
  }

  window.StemLab.registerTool('geologyExplorer', {
    name: 'Geology Explorer',
    icon: '⛰️',
    category: 'explore',
    questHooks: [
      { id: 'identify_5', label: 'Identify 5 different rocks', icon: '🔍', check: function (d) { return Object.keys(d.identified || {}).length >= 5; }, progress: function (d) { return Math.min(Object.keys(d.identified || {}).length, 5) + '/5 rocks'; } },
      { id: 'reach_magma', label: 'Expose the magma chamber', icon: '🌋', check: function (d) { return !!(d.identified && d.identified.magma); }, progress: function (d) { return (d.identified && d.identified.magma) ? 'Found it!' : 'Dig / slice deep'; } },
      { id: 'find_intrusion', label: 'Find the cross-cutting pluton', icon: '⛏️', check: function (d) { return !!(d.identified && d.identified.intrusion); }, progress: function (d) { return (d.identified && d.identified.intrusion) ? 'Cross-cutting!' : 'Slice to the centre'; } }
    ],
    render: function (ctx) {
      var React = ctx.React, h = React.createElement;
      var t = ctx.t || function (k, fb) { return fb != null ? fb : k; };
      var isDark = ctx.isDark;
      var d = (ctx.toolData && ctx.toolData.geologyExplorer) || {};
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast || function () {};
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;
      function upd(key, val) { if (ctx.update) ctx.update('geologyExplorer', key, val); }

      // ── hooks (all unconditional) ──
      var containerRef = React.useRef(null);
      var identifiedRef = React.useRef(d.identified || {}); identifiedRef.current = d.identified || {};
      var st = React.useState(false); var webglError = st[0], setWebglError = st[1];
      var ss = React.useState(null); var selected = ss[0], setSelected = ss[1];
      var slc = React.useState(0); var slice = slc[0], setSlice = slc[1];
      var exc = React.useState(false); var excavate = exc[0], setExcavate = exc[1];
      var threeReady = !!(ctx.toolData && ctx.toolData._threeLoaded) && !!window.THREE;

      function announce(msg) { try { var lr = document.getElementById('allo-live-geology'); if (lr) { lr.textContent = ''; setTimeout(function () { lr.textContent = String(msg || ''); }, 30); } } catch (e) {} }
      function selectRock(facts) {
        setSelected(facts);
        announce(facts.R.name + '. ' + facts.R.type + '. Depth about ' + facts.depthKm + ' kilometres. ' + facts.R.formation + ' ' + facts.R.age);
        var cur = identifiedRef.current || {}; if (!cur[facts.key]) { var id = Object.assign({}, cur); id[facts.key] = 1; upd('identified', id); }
      }

      React.useEffect(function () {
        if (!threeReady || webglError || !containerRef.current || window[ENGINE_KEY]) return;
        try {
          window[ENGINE_KEY] = initEngine(containerRef.current, {
            onSelect: function (facts) { selectRock(facts); },
            onFlash: function (m) { addToast(m, 'info'); },
            onContextLost: function () { setWebglError(true); try { if (window[ENGINE_KEY]) { window[ENGINE_KEY].dispose(); window[ENGINE_KEY] = null; } } catch (e) {} }
          });
        } catch (e) { setWebglError(true); }
        return function () { try { if (window[ENGINE_KEY]) { window[ENGINE_KEY].dispose(); window[ENGINE_KEY] = null; } } catch (e) {} };
      }, [threeReady, webglError]);

      // ── styling helpers ──
      var cardBg = isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-white border-slate-200';
      var muted = isDark ? 'text-slate-400' : 'text-slate-500';
      var ink = isDark ? 'text-slate-100' : 'text-slate-800';

      // ── selected info panel (shared by 3D + list) ──
      function infoPanel() {
        if (!selected) return h('div', { className: 'text-xs ' + muted + ' p-3 rounded-xl border ' + cardBg }, t('stem.geology.pick_hint', 'Pick a rock — in the 3D block or the list below — to see its type, depth, temperature/pressure, how it forms, and its age relationship.'));
        var f = selected, R = f.R, tc = TYPE_COLOR[R.type] || '#64748b';
        return h('div', { className: 'p-3 rounded-xl border ' + cardBg, role: 'region', 'aria-label': 'Selected rock details' },
          h('div', { className: 'text-base font-extrabold tracking-tight ' + ink }, R.name),
          h('span', { className: 'inline-block text-[11px] font-bold px-2 py-0.5 rounded-full mt-1 mb-2', style: { color: tc, background: tc + '22', border: '1px solid ' + tc + '55' } }, R.type),
          h('div', { className: 'grid gap-1 text-[12px] ' + ink, style: { gridTemplateColumns: '64px 1fr' } },
            h('span', { className: muted }, t('stem.geology.depth', 'Depth')), h('span', null, '≈ ' + f.depthKm + ' km'),
            h('span', { className: muted }, t('stem.geology.temp', 'Temp')), h('span', null, '≈ ' + f.tempC + ' °C'),
            h('span', { className: muted }, t('stem.geology.pressure', 'Pressure')), h('span', null, '≈ ' + f.presMPa + ' MPa'),
            h('span', { className: muted }, t('stem.geology.forms', 'Forms by')), h('span', null, R.formation),
            h('span', { className: muted }, t('stem.geology.minerals', 'Minerals')), h('span', null, R.minerals)
          ),
          h('div', { className: 'mt-2 text-[11.5px]', style: { color: '#f59e0b' } }, '🕓 ' + R.age)
        );
      }

      // ── accessible cross-section: SVG diagram + keyboard strata list (the non-3D core) ──
      function crossSectionSVG() {
        var bands = ['soil', 'sandstone', 'shale', 'limestone', 'basement', 'magma'];
        var bh = 26, W = 150, rows = bands.map(function (k, i) {
          return h('g', { key: k },
            h('rect', { x: 0, y: i * bh, width: W, height: bh, fill: hex(ROCKS[k].color), stroke: 'rgba(0,0,0,0.25)' }),
            h('text', { x: 6, y: i * bh + 17, fontSize: 10, fill: i >= 4 ? '#fff' : '#1e293b', style: { fontWeight: 600 } }, ROCKS[k].name)
          );
        });
        // cross-cutting pluton (triangle up the centre) + label
        return h('svg', { width: W, height: bands.length * bh, viewBox: '0 0 ' + W + ' ' + (bands.length * bh), role: 'img', 'aria-label': 'Cross-section: sedimentary layers over basement and magma, cut by a granite pluton', className: 'rounded-lg overflow-hidden border ' + (isDark ? 'border-slate-700' : 'border-slate-300') },
          rows,
          h('polygon', { points: (W / 2) + ',' + (bands.length * bh) + ' ' + (W / 2 - 14) + ',' + (2 * bh) + ' ' + (W / 2 + 14) + ',' + (2 * bh), fill: hex(ROCKS.intrusion.color), opacity: 0.92, stroke: 'rgba(255,255,255,0.4)' })
        );
      }
      function strataList() {
        return h('div', { role: 'group', 'aria-label': 'Rock types — select to learn more', className: 'grid grid-cols-2 gap-1.5' },
          ROCK_ORDER.map(function (k) {
            var R = ROCKS[k];
            return h('button', {
              key: k, type: 'button',
              onClick: function () { var depthGuess = { soil: 0, sandstone: 2, shale: 4, limestone: 6, basement: 8, magma: 11, intrusion: 6, marble: 7, hornfels: 5 }[k] || 4; selectRock(rockFacts(k, depthGuess)); },
              className: 'transition-colors active:scale-[0.97] flex items-center gap-2 text-left px-2 py-1.5 rounded-lg border text-[11.5px] ' + (selected && selected.key === k ? 'ring-2 ring-amber-400 ' : '') + cardBg + ' ' + ink + ' hover:border-amber-400'
            },
              h('span', { 'aria-hidden': 'true', className: 'w-3.5 h-3.5 rounded flex-none', style: { background: hex(R.color), boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)' } }),
              h('span', { className: 'truncate font-semibold' }, R.name)
            );
          })
        );
      }

      // ── 3D viewport / loading / fallback ──
      function viewport() {
        if (webglError) {
          return h('div', { className: 'rounded-xl border p-4 text-center ' + cardBg },
            h('div', { className: 'text-2xl mb-1' }, '⛰️'),
            h('div', { className: 'text-sm font-bold ' + ink }, t('stem.geology.no3d_title', '3D view unavailable')),
            h('div', { className: 'text-xs mt-1 ' + muted }, t('stem.geology.no3d_body', 'Your device could not start WebGL. Use the cross-section and rock list — they have the full content.')));
        }
        if (!threeReady) {
          return h('div', { className: 'rounded-xl border flex items-center justify-center ' + cardBg, style: { minHeight: 320 } },
            h('div', { className: 'text-center' },
              h('div', { className: 'text-2xl mb-2 animate-pulse' }, '🔷'),
              h('div', { className: 'text-sm ' + muted }, t('stem.geology.loading3d', 'Loading the 3D engine…'))));
        }
        return h('div', { ref: containerRef, className: 'rounded-xl overflow-hidden border ' + (isDark ? 'border-slate-700' : 'border-slate-300'), style: { height: 'min(58vh, 460px)', minHeight: 320, background: '#060913', cursor: excavate ? 'crosshair' : 'grab' }, role: 'img', 'aria-label': 'Interactive 3D voxel cross-section of the crust. Use the rock list below for a non-visual version.' });
      }

      var btn = 'transition-colors active:scale-[0.97] text-xs font-bold px-3 py-2 rounded-lg border ';
      var btnIdle = isDark ? 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100';

      return h('div', { className: 'space-y-3 animate-in fade-in duration-200' },
        // live region (SR)
        h('div', { id: 'allo-live-geology', 'aria-live': 'polite', 'aria-atomic': 'true', role: 'status', className: 'sr-only' }),
        // header
        h('div', { className: 'flex items-center gap-3' },
          setStemLabTool ? h('button', { onClick: function () { setStemLabTool(null); }, 'aria-label': t('stem.back', 'Back to tools'), className: 'transition-colors active:scale-[0.97] p-1.5 rounded-lg ' + (isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100') }, ArrowLeft ? h(ArrowLeft, { size: 18, className: isDark ? 'text-slate-200' : 'text-slate-600' }) : '←') : null,
          h('div', null,
            h('h2', { className: 'text-lg font-black tracking-tight ' + ink }, '⛰️ ' + t('stem.geology.title', 'Geology Explorer')),
            h('div', { className: 'h-[3px] w-12 rounded-full mt-1', style: { background: 'linear-gradient(90deg,#f59e0b,#a855f7)' } }),
            h('p', { className: 'text-[11px] mt-1 ' + muted }, t('stem.geology.subtitle', 'Dig a cross-section of the crust. Identify rocks, read the layers, find the pluton that cuts them.')))),
        // main: viewport + controls (left) | info + cross-section + list (right)
        h('div', { className: 'grid gap-3', style: { gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)' } },
          h('div', { className: 'space-y-2' },
            viewport(),
            // controls
            h('div', { className: 'flex flex-wrap items-center gap-2' },
              h('label', { className: 'flex items-center gap-2 text-xs ' + ink },
                h('span', { className: muted }, t('stem.geology.slice', 'Slice')),
                h('input', { type: 'range', min: 0, max: NZ - 1, value: slice, disabled: !threeReady || webglError, 'aria-label': 'Cross-section slice depth', onChange: function (e) { var v = +e.target.value; setSlice(v); if (window[ENGINE_KEY]) window[ENGINE_KEY].setSlice(v); } })),
              h('button', { type: 'button', disabled: !threeReady || webglError, onClick: function () { var nv = !excavate; setExcavate(nv); if (window[ENGINE_KEY]) window[ENGINE_KEY].setExcavate(nv); }, 'aria-pressed': excavate ? 'true' : 'false', className: btn + (excavate ? 'bg-amber-500 border-amber-400 text-amber-950' : btnIdle) }, '⛏️ ' + t('stem.geology.excavate', 'Excavate') + ': ' + (excavate ? t('stem.on', 'ON') : t('stem.off', 'OFF'))),
              h('button', { type: 'button', disabled: !threeReady || webglError, onClick: function () { setSlice(0); setExcavate(false); if (window[ENGINE_KEY]) { window[ENGINE_KEY].reset(); window[ENGINE_KEY].setExcavate(false); } }, className: btn + btnIdle }, '↺ ' + t('stem.geology.reset', 'Reset')),
              h('span', { className: 'text-[11px] ' + muted }, threeReady && !webglError ? t('stem.geology.tip', 'Drag to orbit · click a block to identify') : '')),
            infoPanel()),
          h('div', { className: 'space-y-2' },
            h('div', { className: 'flex items-start gap-3' },
              crossSectionSVG(),
              h('p', { className: 'text-[11px] leading-relaxed ' + muted }, t('stem.geology.teach', 'Deeper sedimentary layers are older (superposition). The granite pluton is YOUNGER than the layers it cuts (cross-cutting), and it bakes a metamorphic rim (contact metamorphism). Heat + pressure rise with depth toward the magma — where the rock cycle restarts.'))),
            h('div', { className: 'text-[11px] font-bold ' + muted }, t('stem.geology.rocks', 'Rock types')),
            strataList()))
      );
    }
  });

  console.log('[StemLab] stem_tool_geologyexplorer.js loaded');
})();
