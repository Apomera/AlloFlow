// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

// Shared theme enforcement for legacy neutral utility classes and Windows forced colors.
(function() {
  if (typeof document === 'undefined' || document.getElementById('allo-stem-theme-contract-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-theme-contract-css';
  st.textContent = '[data-stem-theme=contrast]{background:#000!important;color:#fff!important;color-scheme:dark}' +
    '[data-stem-theme=contrast] :is(.bg-white,.bg-slate-50,.bg-slate-100,.bg-slate-800,.bg-slate-900,.bg-slate-950){background-color:#000!important}' +
    '[data-stem-theme=contrast] :is(.text-slate-300,.text-slate-400,.text-slate-500,.text-slate-600,.text-slate-700,.text-slate-800,.text-slate-900){color:#fff!important}' +
    '[data-stem-theme=contrast] :is(.border-slate-100,.border-slate-200,.border-slate-300,.border-slate-600,.border-slate-700,.border-slate-800){border-color:#fbbf24!important}' +
    '@media (forced-colors:active){[data-stem-tool-shell] :is(button,input,select,textarea,summary,a){forced-color-adjust:auto!important}[data-stem-tool-shell] :focus-visible{outline:3px solid Highlight!important;outline-offset:2px!important}[data-stem-tool-shell] canvas,[data-stem-tool-shell] svg{border:1px solid CanvasText!important}}';
  if (document.head) document.head.appendChild(st);
})();

// stem_lab_module.js — v2.3.0 (a11y enhancements)
(function () {
  if (window.AlloModules && window.AlloModules.StemLab) { console.log('[CDN] StemLab already loaded, skipping duplicate'); } else {
    // stem_lab_module.js
    // Canonical hand-maintained source — edited directly, NOT generated from AlloFlowANTI.txt
    // STEAM Lab module for AlloFlow - loaded from GitHub CDN

    // ── Shared "engaged" definition (2026-07-27) ──────────────────────────────
    // timeSpent quests must mean the same thing as a directions `time` goal and
    // as the host's engagedMinutes: tab visible AND interacted with inside the
    // timeout. The host publishes window.__alloEngagement; prefer it so there is
    // ONE clock. STEM tools also run standalone (no host — see the raw-tool
    // harness), so keep a self-contained fallback that uses the IDENTICAL
    // timeout. A test pins the two constants equal; if they ever diverge,
    // "5 minutes" quietly means two things again.
    var _STEM_ENGAGEMENT_TIMEOUT_MS = 180000; // must equal AlloQuestContract.ENGAGEMENT_TIMEOUT_MS
    var _stemLastInteractionAt = Date.now();
    try {
      ['click', 'keydown', 'scroll', 'mousemove'].forEach(function (evt) {
        window.addEventListener(evt, function () { _stemLastInteractionAt = Date.now(); }, { passive: true });
      });
    } catch (e) {}
    function _stemEngagementTimeout() {
      var c = (typeof window !== 'undefined') && window.AlloQuestContract;
      if (c && typeof c.ENGAGEMENT_TIMEOUT_MS === 'number') return c.ENGAGEMENT_TIMEOUT_MS;
      return _STEM_ENGAGEMENT_TIMEOUT_MS;
    }
    function _stemIsEngaged() {
      var probe = (typeof window !== 'undefined') && window.__alloEngagement;
      if (probe && typeof probe.isEngaged === 'function') {
        try { return !!probe.isEngaged(); } catch (e) {}
      }
      if (typeof document !== 'undefined' && document.hidden) return false;
      return (Date.now() - _stemLastInteractionAt) < _stemEngagementTimeout();
    }

    // ── AlloStemTheme JS helper (Piece A) ──
    // Exposes the same palette as the --allo-stem-* CSS variables defined
    // in AlloFlowANTI.txt, but as plain strings for JS consumers that can't
    // use CSS variables (canvas drawing, SVG attribute writes, dynamic
    // style construction). Reads the current theme by checking the
    // .theme-{light,dark,contrast} class on document.body or the
    // <main> element. Tools call:
    //   var p = window.AlloStemTheme.palette();      // current theme
    //   var p = window.AlloStemTheme.palette('dark'); // explicit
    //   ctx.fillStyle = p.canvas;
    //   ctx.strokeStyle = p.text;
    // The helper re-reads on each call so tools don't need to subscribe
    // to theme changes — they pick up the new palette next paint.
    if (!window.AlloStemTheme) {
      var _ASTPalettes = {
        light: {
          canvas: '#ffffff', panel: '#f8fafc', deeper: '#e2e8f0',
          text: '#0f172a', textSoft: '#475569', border: '#cbd5e1',
          buttonBg: '#f1f5f9', buttonText: '#0f172a', buttonBorder: '#cbd5e1',
        },
        dark: {
          canvas: '#0f172a', panel: '#1e293b', deeper: '#020617',
          text: '#e2e8f0', textSoft: '#94a3b8', border: '#334155',
          buttonBg: '#1e293b', buttonText: '#e2e8f0', buttonBorder: '#334155',
        },
        contrast: {
          canvas: '#000000', panel: '#000000', deeper: '#000000',
          text: '#ffff00', textSoft: '#ffff00', border: '#ffff00',
          buttonBg: '#000000', buttonText: '#00ff00', buttonBorder: '#00ff00',
        },
      };
      var _ASTDetectTheme = function () {
        try {
          if (typeof document === 'undefined') return 'light';
          // <main> carries `theme-${theme}` class; fallback to body if absent
          var main = document.querySelector('main.theme-contrast') ? 'contrast'
                   : document.querySelector('main.theme-dark')     ? 'dark'
                   : document.querySelector('main.theme-light')    ? 'light'
                   : null;
          if (main) return main;
          if (document.body && document.body.classList) {
            if (document.body.classList.contains('theme-contrast')) return 'contrast';
            if (document.body.classList.contains('theme-dark')) return 'dark';
            if (document.body.classList.contains('theme-light')) return 'light';
          }
        } catch (_) {}
        // Match the STEM host's initial theme so SSR and first paint agree.
        return 'light';
      };
      window.AlloStemTheme = {
        palette: function (themeName) {
          var t = themeName || _ASTDetectTheme();
          return _ASTPalettes[t] || _ASTPalettes.dark;
        },
        currentTheme: _ASTDetectTheme,
        // Opt-in: tools that need a render-time refresh on theme change
        // can subscribe. Light implementation via MutationObserver on the
        // main element's class attribute.
        onChange: function (callback) {
          if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
            return function () {};
          }
          var main = document.querySelector('main');
          if (!main) return function () {};
          var lastTheme = _ASTDetectTheme();
          var observer = new MutationObserver(function () {
            var newTheme = _ASTDetectTheme();
            if (newTheme !== lastTheme) {
              lastTheme = newTheme;
              try { callback(newTheme, _ASTPalettes[newTheme] || _ASTPalettes.dark); }
              catch (e) { console.warn('[AlloStemTheme] onChange callback error:', e); }
            }
          });
          observer.observe(main, { attributes: true, attributeFilter: ['class'] });
          return function () { observer.disconnect(); };
        },
      };
    }

    // ── Shared "safe fullscreen" toggle for STEM tool canvases ──
    // Real OS fullscreen only works where the host iframe grants it (document.fullscreenEnabled).
    // Inside a sandboxed iframe (e.g. Gemini Canvas) requestFullscreen() rejects/throws
    // "Disallowed by permissions policy" — which, left unhandled, breaks the button (the bug
    // reported on the physics tool). window.__alloStemFS(el) toggles: in real fullscreen → exit;
    // in CSS fill-frame → exit; else → try real (guarded, .catch), else a CSS "fill the frame"
    // mode (wrapper → fixed/100vw/100vh with !important so React re-renders don't revert it, plus
    // a window resize event so canvases that listen re-measure, and Escape to exit). Never throws.
    if (typeof window !== 'undefined' && !window.__alloStemFS) {
      var _stemFsProps = { position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', width: '100vw', height: '100vh', margin: '0', 'border-radius': '0', 'z-index': '99998', background: '#0f172a' };
      var _stemFsNotify = function(el, active) {
        try {
          if (!el || !el.setAttribute) return;
          if (active) el.setAttribute('data-allo-fullscreen-active', 'true');
          else el.removeAttribute('data-allo-fullscreen-active');
        } catch (e) {}
      };
      var _stemFsExit = function(el) {
        if (!el) return;
        el.__alloFsOn = false;
        _stemFsNotify(el, false);
        var s = el.style, saved = el.__alloFsSaved || {};
        Object.keys(_stemFsProps).forEach(function(p) { if (saved[p]) s.setProperty(p, saved[p]); else s.removeProperty(p); });
        try { if (el.__alloFsEsc) document.removeEventListener('keydown', el.__alloFsEsc); } catch (e) {}
        try { window.dispatchEvent(new Event('resize')); } catch (e) {}
      };
      var _stemFsEnter = function(el) {
        el.__alloFsSaved = {}; el.__alloFsOn = true;
        _stemFsNotify(el, true);
        var s = el.style;
        Object.keys(_stemFsProps).forEach(function(p) { el.__alloFsSaved[p] = s.getPropertyValue(p); s.setProperty(p, _stemFsProps[p], 'important'); });
        el.__alloFsEsc = function(ev) { if (ev && ev.key === 'Escape') _stemFsExit(el); };
        try { document.addEventListener('keydown', el.__alloFsEsc); } catch (e) {}
        try { window.dispatchEvent(new Event('resize')); } catch (e) {}
      };
      window.__alloStemFS = function(el) {
        if (!el) return;
        try {
          var realEl = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement;
          if (realEl) {
            var ex = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen;
            if (ex) { var pe = ex.call(document); if (pe && pe.catch) pe.catch(function() {}); }
            return;
          }
          if (el.__alloFsOn) { _stemFsExit(el); return; }
          var rq = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
          if (rq && (document.fullscreenEnabled || document.webkitFullscreenEnabled)) {
            var pr = rq.call(el);
            if (pr && pr.catch) pr.catch(function() { _stemFsEnter(el); });
            return;
          }
          _stemFsEnter(el);
        } catch (e) { try { if (!el.__alloFsOn) _stemFsEnter(el); } catch (e2) {} }
      };
    }

    // ── StemLab Plugin Registry (Phase 2) ──
    // Initialize before the hub component so plugins can register tools.
    // Plugins (stem_tool_*.js) call window.StemLab.registerTool(id, config)
    // and the hub's fallback renderer (at the end of the explore chain) delegates to them.
    if (!window.StemLab) {
      window.StemLab = {
        _registry: {},
        _order: [],
        // Resilient external-script loader shared by 3D tools. One CDN is a
        // single point of failure on filtered school networks, and a request
        // those filters black-hole fires neither load nor error — so: try each
        // URL in order, time out each attempt, remove failed tags (their
        // events never re-fire, so re-listening would hang forever), and clear
        // the cached promise on total failure so a Retry starts fresh.
        loadScriptResilient: function (urls, opts) {
          opts = opts || {};
          var timeoutMs = opts.timeoutMs || 20000;
          var check = typeof opts.check === 'function' ? opts.check : null;
          var cacheKey = opts.cacheKey;
          var cache = window.__stemScriptPromises = window.__stemScriptPromises || {};
          if (check && check()) return Promise.resolve(true);
          if (cacheKey && cache[cacheKey]) return cache[cacheKey];
          function attempt(index) {
            return new Promise(function (resolve, reject) {
              if (index >= urls.length) { reject(new Error(opts.failMessage || 'The library could not be loaded from any source. School network filters sometimes block CDNs — retry, or check the connection.')); return; }
              var script = document.createElement('script');
              var settled = false;
              var timer = window.setTimeout(function () { finish(false); }, timeoutMs);
              function finish(ok) {
                if (settled) return;
                settled = true;
                window.clearTimeout(timer);
                if (ok && (!check || check())) { resolve(true); return; }
                if (script.parentNode) script.parentNode.removeChild(script);
                resolve(attempt(index + 1));
              }
              script.src = urls[index];
              script.async = true;
              script.crossOrigin = 'anonymous';
              script.addEventListener('load', function () { finish(true); }, { once: true });
              script.addEventListener('error', function () { finish(false); }, { once: true });
              document.head.appendChild(script);
            });
          }
          var promise = attempt(0).catch(function (error) { if (cacheKey) cache[cacheKey] = null; throw error; });
          if (cacheKey) cache[cacheKey] = promise;
          return promise;
        },
        // One canonical way to get Three.js r128 (+ optionally OrbitControls):
        // resilient multi-CDN load, shared promise cache across every 3D tool.
        // Resolves with window.THREE; rejects only when no CDN could deliver
        // the core (orbit failures are non-fatal unless orbitRequired).
        ensureThree: function (opts) {
          opts = opts || {};
          var self = this;
          var wantOrbit = opts.orbit === true;
          if (window.THREE && (!wantOrbit || window.THREE.OrbitControls)) return Promise.resolve(window.THREE);
          // Prefer the app's pinned local r128 asset so bundled/offline desktop
          // builds do not wait on a school-network CDN timeout. CDN fallbacks keep
          // the hosted Canvas surface resilient when the local asset is absent.
          var localThreeUrls = [];
          var localOrbitUrls = [];
          try {
            var stemScripts = document.getElementsByTagName('script');
            for (var si = 0; si < stemScripts.length; si++) {
              var stemSrc = stemScripts[si].src || '';
              if (stemSrc.indexOf('stem_lab_module.js') !== -1) {
                localThreeUrls.push(new URL('../vendor/three-r128/three.min.js', stemSrc).href);
                // OrbitControls gets the same local-first treatment as the core.
                // Without it the core resolved from the bundled asset but orbit still
                // waited on a CDN, so offline and desktop builds silently lost camera
                // control in EVERY 3D tool while looking like a successful load.
                // vendor/three-r128/OrbitControls.js is the classic global build
                // (assigns THREE.OrbitControls), so a plain <script> is correct here.
                localOrbitUrls.push(new URL('../vendor/three-r128/OrbitControls.js', stemSrc).href);
                break;
              }
            }
          } catch (localThreeError) {}
          var coreUrls = localThreeUrls.concat(['https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js']);
          var core = window.THREE ? Promise.resolve(true) : self.loadScriptResilient(
            coreUrls,
            { cacheKey: 'three-core', check: function () { return !!window.THREE; }, failMessage: opts.failMessage || 'The 3D engine could not load. School network filters sometimes block CDNs — retry, or check the connection.' });
          return core.then(function () {
            if (!wantOrbit || window.THREE.OrbitControls) return true;
            var orbit = self.loadScriptResilient(
              localOrbitUrls.concat(['https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js', 'https://unpkg.com/three@0.128.0/examples/js/controls/OrbitControls.js']),
              { cacheKey: 'three-orbit', check: function () { return !!(window.THREE && window.THREE.OrbitControls); } });
            return opts.orbitRequired ? orbit : orbit.catch(function () { console.warn('[StemLab] OrbitControls failed to load, proceeding without orbit controls'); return true; });
          }).then(function () { return window.THREE; });
        },
        // Shared 3D viewer shell — see makeBayViewer usage in stem_tool_autorepair
        // and stem_tool_firstresponse. Lives here, beside ensureThree, because the
        // host always loads before any tool and needs no loader-order change.

        // Generic 3D viewer shell — everything that is NOT scene content: attach and
        // teardown, pause-when-unseen, WebGL context-loss recovery, theme rebuild,
        // drag + raycast picking, keyboard camera, and label chips with de-overlap.
        //
        // Scene content comes from cfg.buildScene, so the tyre-change module reuses
        // this whole lifecycle rather than copying ~200 lines of it. cfg is:
        //   parts      — [{id, label, ...}] used for labels and pick mapping
        //   buildScene — (THREE, api) => { meshes: {id: Group}, picks: [Mesh], anchor: Mesh }
        //   home       — { yaw, pitch, dist } default camera
        makeBayViewer: function (cfg) {
          var S = null;                 // live scene state, null when detached
          var props = { selected: null, onPick: null, onStatus: null, dark: true, contrast: false };
          var status = 'idle';          // idle | loading | ready | failed
          var restoreAttempts = 0;      // WebGL context-loss rebuilds, capped at 1

          function setStatus(next) {
            if (status === next) return;
            status = next;
            if (props.onStatus) { try { props.onStatus(next); } catch (e) {} }
          }

          function partColor(p) {
            if (props.contrast) return '#ffffff';
            return p.color;
          }

          function partLabel(id) {
            for (var i = 0; i < cfg.parts.length; i++) {
              if (cfg.parts[i].id === id) return cfg.parts[i].label;
            }
            return id;
          }

          function build(THREE, node) {
            var renderer;
            var reducedMotion = (function () {
              try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
              catch (e) { return false; }
            })();
            try {
              renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
            } catch (e) {
              return null;              // no WebGL on this device — 2D list carries on
            }
            var w = node.clientWidth || 480;
            var hgt = node.clientHeight || 340;
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            renderer.setSize(w, hgt);
            node.appendChild(renderer.domElement);
            renderer.domElement.style.display = 'block';
            renderer.domElement.style.width = '100%';
            renderer.domElement.style.height = '100%';
            renderer.domElement.style.borderRadius = '10px';
            // pan-y, NOT none. With touch-action:none a full-width canvas swallows
            // every vertical swipe, so on a phone or tablet the student cannot
            // scroll past the bay to reach the parts list underneath — the canvas
            // becomes a scroll trap. pan-y gives vertical swipes back to the page
            // and keeps horizontal drag for rotation; the ▲▼ buttons and arrow keys
            // still cover tilt.
            renderer.domElement.style.touchAction = 'pan-y';
            renderer.domElement.setAttribute('aria-hidden', 'true');

            // Floating label chip. Owned by this module and mutated directly in the
            // RAF loop — routing a per-frame screen position through React state
            // would re-render the whole tool 60 times a second.
            // One chip per part, created once and positioned in the RAF loop. The
            // "label everything" mode turns the bay into the map the module claims
            // to be, which is exactly what a first-time owner staring at an unlabelled
            // engine actually needs.
            function chipCss(strong) {
              return 'position:absolute;pointer-events:none;padding:' + (strong ? '3px 8px' : '2px 6px') +
                ';border-radius:999px;font:' + (strong ? '700 11px' : '600 10px') + '/1.3 system-ui,sans-serif;' +
                'white-space:nowrap;transform:translate(-50%,-50%);opacity:0;' +
                'transition:opacity .12s linear;z-index:2;' +
                (props.contrast
                  ? 'background:#000;color:#fff;border:' + (strong ? '2px' : '1px') + ' solid #fff;'
                  : strong
                    ? 'background:rgba(15,23,42,.94);color:#fbbf24;border:1px solid #fbbf24;'
                    : 'background:rgba(15,23,42,.72);color:#e2e8f0;border:1px solid rgba(148,163,184,.55);');
            }
            var labels = {};
            cfg.parts.forEach(function (p) {
              var el = document.createElement('div');
              el.setAttribute('aria-hidden', 'true');
              el.textContent = p.label;
              el.style.cssText = chipCss(false);
              node.appendChild(el);
              labels[p.id] = el;
            });

            // Shadows are what make a box read as an OBJECT SITTING IN a bay rather
            // than a sprite floating on a background. Cheap here: a dozen casters.
            // Skipped in high-contrast, where soft grey gradients fight the mode.
            var wantShadow = !props.contrast;
            if (wantShadow) {
              renderer.shadowMap.enabled = true;
              renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            }

            var scene = new THREE.Scene();
            scene.background = new THREE.Color(props.contrast ? 0x000000 : (props.dark ? 0x0b1220 : 0xdfe6ef));
            if (!props.contrast) {
              scene.fog = new THREE.Fog(props.dark ? 0x0b1220 : 0xdfe6ef, 5.2, 11.0);
            }

            var camera = new THREE.PerspectiveCamera(42, w / hgt, 0.1, 100);

            scene.add(new THREE.AmbientLight(0xffffff, props.contrast ? 0.95 : 0.44));
            var key = new THREE.DirectionalLight(0xfff4e0, props.contrast ? 0.4 : 0.92);
            key.position.set(2.4, 4.6, 2.8);
            if (wantShadow) {
              key.castShadow = true;
              key.shadow.mapSize.width = 1024;
              key.shadow.mapSize.height = 1024;
              var sc = key.shadow.camera;
              sc.left = -3.2; sc.right = 3.2; sc.top = 3.2; sc.bottom = -3.2;
              sc.near = 0.5; sc.far = 14;
              key.shadow.bias = -0.0012;
            }
            scene.add(key);
            var fill = new THREE.DirectionalLight(0xbcd4ff, props.contrast ? 0.2 : 0.34);
            fill.position.set(-2.6, 1.6, -2.0);
            scene.add(fill);
            // Low warm bounce off the bay floor — stops undersides going pure black.
            var bounce = new THREE.DirectionalLight(0xffd9a0, props.contrast ? 0 : 0.20);
            bounce.position.set(-0.6, -1.8, 1.2);
            scene.add(bounce);

            // ── Scene content ──
            // Everything above is generic. What actually gets modelled comes from the
            // caller, which is how the engine bay and the wheel corner share one
            // viewer. Shared material helpers go in so both scenes look alike.
            function trim(hex, shiny) {
              return new THREE.MeshPhongMaterial({
                color: props.contrast ? 0xffffff : hex,
                shininess: props.contrast ? 0 : (shiny == null ? 30 : shiny),
                specular: props.contrast ? 0x000000 : 0x6b7688
              });
            }
            var content = cfg.buildScene(THREE, {
              scene: scene, contrast: props.contrast, dark: props.dark,
              wantShadow: wantShadow, trim: trim, partColor: partColor, parts: cfg.parts,
              phase: props.phase || null,
              // Arbitrary caller state for scenes that vary by more than a step
              // count (e.g. which body-position tab is open, adult vs infant).
              // Rebuilds are driven by props.sceneKey, so the caller decides
              // what counts as a change rather than us deep-comparing.
              sceneProps: props.sceneProps || null,
              reduced: reducedMotion
            });
            var meshes = content.meshes;
            var picks = content.picks;
            var anchor = content.anchor;
            // Optional scene-owned motion. The shared shell still owns the RAF,
            // visibility pausing and reduced-motion preference; a content module
            // can animate its own nodes without rebuilding the whole WebGL scene
            // or routing frame-by-frame positions through React state.
            var contentFrame = (typeof content.frame === 'function') ? content.frame : null;

            // Selection cage. Emissive alone is not enough — on the pale translucent
            // reservoirs an amber glow washes straight out, and the selected part is
            // often behind the radiator from the default angle. A wireframe box with
            // depthTest off reads on ANY part colour and shows through occluders,
            // which is the whole job: "the thing you asked about is HERE."
            // In high-contrast mode every part is flattened to white, so a white cage
            // would be invisible against them. Yellow is the tool's contrast accent
            // and sits at ~19:1 on black.
            var selBox = new THREE.BoxHelper(anchor, props.contrast ? 0xffff00 : 0xfbbf24);
            selBox.material.depthTest = false;
            selBox.material.transparent = true;
            selBox.material.linewidth = 2;
            selBox.renderOrder = 999;
            selBox.visible = false;
            scene.add(selBox);

            return {
              THREE: THREE, node: node, renderer: renderer, scene: scene, camera: camera,
              labels: labels, chipCss: chipCss, meshes: meshes, picks: picks, selBox: selBox,
              contentFrame: contentFrame,
              raycaster: new THREE.Raycaster(), pointer: new THREE.Vector2(),
              builtDark: props.dark, builtContrast: props.contrast, builtPhase: (props.phase || 0),
              builtSceneKey: (props.sceneKey || ''),
              paused: false, io: null,
              yaw: cfg.home.yaw, pitch: cfg.home.pitch, dist: cfg.home.dist,
              dragging: false, lastX: 0, lastY: 0, moved: 0,
              hovered: null, t0: 0, raf: 0, handlers: [],
              reduced: reducedMotion
            };
          }

          function placeCamera() {
            var cy = Math.max(0.12, Math.min(1.35, S.pitch));
            S.camera.position.set(
              Math.sin(S.yaw) * Math.cos(cy) * S.dist,
              Math.sin(cy) * S.dist,
              Math.cos(S.yaw) * Math.cos(cy) * S.dist
            );
            S.camera.lookAt(0, 0.30, 0);
          }

          // Screen-space position of a part, for the HTML label chip. Returns null
          // when the part is behind the camera.
          function project(id) {
            var g = S.meshes[id];
            if (!g) return null;
            var v = new S.THREE.Vector3();
            if (g.userData && g.userData.labelAnchor) {
              v.copy(g.userData.labelAnchor);
              g.localToWorld(v);
            } else {
              g.getWorldPosition(v);
              v.y += 0.30;
            }
            v.project(S.camera);
            if (v.z > 1) return null;
            var r = S.renderer.domElement;
            return { x: (v.x * 0.5 + 0.5) * r.clientWidth, y: (-v.y * 0.5 + 0.5) * r.clientHeight };
          }

          // Rendering pauses when the bay is off-screen or the tab is hidden. This
          // tool's audience is on school Chromebooks, often with a dozen tabs open;
          // spinning a WebGL loop for a canvas nobody can see burns battery and
          // frame budget for nothing.
          function pauseLoop() {
            if (!S || S.paused) return;
            S.paused = true;
            if (S.raf) cancelAnimationFrame(S.raf);
            S.raf = 0;
          }
          function resumeLoop() {
            if (!S || !S.paused) return;
            S.paused = false;
            S.raf = requestAnimationFrame(frame);
          }

          function frame() {
            if (!S || S.paused) return;

            // Scene colours are baked at build time from the theme. If the user
            // toggles dark/light/high-contrast while sitting in this module, rebuild
            // rather than leaving a stale background. Done here, not in sync(),
            // because sync() runs during React's render pass and must not touch DOM.
            // Theme AND phase are baked at build time. The tyre scene changes shape
            // as the procedure advances (car lifts, wheel comes off), so a phase
            // change rebuilds exactly like a theme change does.
            if (S.builtDark !== props.dark || S.builtContrast !== props.contrast ||
                S.builtPhase !== (props.phase || 0) ||
                S.builtSceneKey !== (props.sceneKey || '')) {
              var node = S.node;
              var keep = { yaw: S.yaw, pitch: S.pitch, dist: S.dist };
              teardown();
              if (window.THREE && node && node.isConnected) {
                start(window.THREE, node);
                if (S) { S.yaw = keep.yaw; S.pitch = keep.pitch; S.dist = keep.dist; }
              }
              return;
            }

            S.raf = requestAnimationFrame(frame);
            S.t0 += 1;
            placeCamera();

            var sel = props.selected;
            // Repair Bay marks already-inspected parts green so the student can see
            // what ground they have covered without leaving the 3D view.
            var marks = props.marks || {};
            // Selection has to be unmistakable at a glance: bright emissive + a
            // small scale bump, with everything else only GENTLY pushed back. An
            // earlier build dimmed non-selected parts to 0.35 and the whole bay just
            // read as fog — recede the context, don't erase it.
            var pulse = S.reduced ? 1 : (0.78 + 0.22 * Math.sin(S.t0 * 0.08));
            // Optional per-node activation channel, for tools whose scene shows a
            // QUANTITY changing over time rather than a set of parts to inspect.
            // props.levels is {meshId: 0..1}; absent (every existing caller) this
            // whole block is skipped and behaviour is byte-for-byte unchanged.
            // Smoothed here rather than by the caller so the motion is owned by the
            // frame loop that draws it — and so it honours S.reduced like everything
            // else, instead of a caller re-rendering React on a timer.
            var levels = props.levels || null;
            if (levels && !S.lvl) S.lvl = {};
            for (var id in S.meshes) {
              if (!S.meshes.hasOwnProperty(id)) continue;
              var isSel = (id === sel);
              var isHov = (id === S.hovered && !isSel);
              var recede = (sel && !isSel);
              var g = S.meshes[id];
              var lvl = null;
              if (levels) {
                var target = levels[id] == null ? 0 : Math.max(0, Math.min(1, levels[id]));
                var prev = S.lvl[id] == null ? target : S.lvl[id];
                // Snap when reduced motion is requested: the value still reads, the
                // travel does not.
                S.lvl[id] = S.reduced ? target : prev + (target - prev) * 0.18;
                lvl = S.lvl[id];
              }

              // Wide on purpose. At 0.82-1.16 a node at 19% and a node at 74% were
              // the same dot on screen, which defeats the point of drawing the data
              // at all — size is the cue that survives a small viewport.
              var keepGroupScale = !!(g.userData && g.userData.noSelectionScale);
              var wantScale = keepGroupScale ? 1
                : (isSel ? (S.reduced ? 1.12 : 1.06 + 0.06 * pulse)
                  : (lvl == null ? 1 : 0.52 + 0.78 * lvl));
              g.scale.setScalar(g.scale.x + (wantScale - g.scale.x) * 0.25);

              g.traverse(function (o) {
                if (!o.isMesh || !o.material) return;
                if (o.material.emissive) {
                  // Tree foliage opts into preserving its dim transmitted-light base.
                  // All existing materials keep the original zero-base behaviour.
                  var baseR = 0, baseG = 0, baseB = 0;
                  if (o.material.userData && o.material.userData._preserveBaseEmissive) {
                    if (!o.material.userData._baseEmissive) {
                      o.material.userData._baseEmissive = {
                        r: o.material.emissive.r, g: o.material.emissive.g, b: o.material.emissive.b
                      };
                    }
                    baseR = o.material.userData._baseEmissive.r;
                    baseG = o.material.userData._baseEmissive.g;
                    baseB = o.material.userData._baseEmissive.b;
                  }
                  // Restrained on purpose. The wireframe cage answers "where is it";
                  // a hot emissive on top of that just repaints the part gold.
                  if (isSel) o.material.emissive.setRGB(
                    Math.min(1, baseR + 0.26 * pulse),
                    Math.min(1, baseG + 0.19 * pulse),
                    Math.min(1, baseB + 0.03 * pulse));
                  else if (isHov) o.material.emissive.setRGB(
                    Math.min(1, baseR + 0.16), Math.min(1, baseG + 0.17), Math.min(1, baseB + 0.20));
                  else if (lvl != null) o.material.emissive.setRGB(
                    Math.min(1, baseR + 0.30 * lvl), Math.min(1, baseG + 0.22 * lvl),
                    Math.min(1, baseB + 0.44 * lvl));
                  else if (marks[id] === 'checked') o.material.emissive.setRGB(
                    Math.min(1, baseR + 0.02), Math.min(1, baseG + 0.13), Math.min(1, baseB + 0.07));
                  else o.material.emissive.setRGB(baseR, baseG, baseB);
                }
                if (o.material.userData._baseOpacity === undefined) {
                  o.material.userData._baseOpacity = (o.material.opacity === undefined) ? 1 : o.material.opacity;
                }
                var base = o.material.userData._baseOpacity;
                // Alpha-tested foliage must stay in the opaque render queue. Switching
                // it to blending makes instanced leaves sort and wink as the view moves.
                var keepOpaque = o.material.alphaTest > 0 ||
                  !!(o.material.userData && o.material.userData._keepOpaqueOnRecede);
                var want = recede && !keepOpaque ? base * 0.70 : base;
                if (Math.abs(o.material.opacity - want) > 0.01) {
                  o.material.opacity = want;
                  var nextTransparent = want < 1;
                  if (o.material.transparent !== nextTransparent) {
                    o.material.transparent = nextTransparent;
                    o.material.needsUpdate = true;   // only on the actual flip
                  }
                }
              });
            }

            if (sel && S.meshes[sel]) {
              S.selBox.visible = true;
              S.selBox.setFromObject(S.meshes[sel]);
              S.selBox.material.opacity = S.reduced ? 1 : (0.6 + 0.4 * pulse);
            } else if (S.selBox.visible) {
              S.selBox.visible = false;
            }

            if (S.contentFrame) {
              try {
                // Content animations receive epoch milliseconds so event times
                // from UI handlers can drive the next rendered frame directly.
                S.contentFrame(Date.now(), props.sceneProps || {}, S.reduced);
              } catch (contentFrameError) {
                // A content animation must never take down camera controls or the
                // 2D learning path. Disable only the faulty callback, once.
                console.warn('[StemLab] 3D scene animation disabled after an error', contentFrameError);
                S.contentFrame = null;
              }
            }

            S.renderer.render(S.scene, S.camera);

            // Label chips. Focused chip (selected/hovered) always shows; the rest
            // only in "label everything" mode, and dimmer so focus still reads.
            var focusId = sel || S.hovered;
            var showAll = !!props.showAllLabels;
            var placed = [];
            var viewW = S.renderer.domElement.clientWidth;
            var viewH = S.renderer.domElement.clientHeight;

            for (var li = 0; li < cfg.parts.length; li++) {
              var pid = cfg.parts[li].id;
              var el = S.labels[pid];
              var strong = (pid === focusId);
              var want = strong || showAll;
              if (!want) {
                if (el.style.opacity !== '0') el.style.opacity = '0';
                continue;
              }
              var at = project(pid);
              if (!at) { if (el.style.opacity !== '0') el.style.opacity = '0'; continue; }
              if (el._strong !== strong) {
                el._strong = strong;
                el.style.cssText = S.chipCss(strong);
                el._w = 0;                       // restyle changes the measured size
              }
              // Measure once per style; offsetWidth forces layout, so never per-frame.
              if (!el._w) {
                el.style.opacity = '0.01';
                el._w = el.offsetWidth || 90;
                el._h = el.offsetHeight || 18;
              }
              placed.push({ el: el, x: at.x, y: at.y, w: el._w, h: el._h, strong: strong });
            }

            // Label-everything mode put twelve chips on a small canvas and several
            // landed on top of each other, which defeats the point of a map. Greedy
            // de-overlap: keep the focused chip anchored, nudge the rest downward
            // until they clear. O(n²) over twelve items — nothing.
            placed.sort(function (a, b) { return (b.strong ? 1 : 0) - (a.strong ? 1 : 0) || a.y - b.y; });
            var settled = [];
            for (var pi2 = 0; pi2 < placed.length; pi2++) {
              var c = placed[pi2];
              if (!c.strong) {
                var guard = 0;
                while (guard++ < 14) {
                  var hit = false;
                  for (var si = 0; si < settled.length; si++) {
                    var o = settled[si];
                    if (Math.abs(c.x - o.x) < (c.w + o.w) / 2 + 4 &&
                        Math.abs(c.y - o.y) < (c.h + o.h) / 2 + 3) { hit = true; break; }
                  }
                  if (!hit) break;
                  c.y += c.h + 4;
                }
                // Pushed off the bottom? Better to hide it than to stack it on the edge.
                if (c.y > viewH - c.h / 2) { c.el.style.opacity = '0'; continue; }
              }
              // Keep chips inside the viewport horizontally.
              c.x = Math.max(c.w / 2 + 2, Math.min(viewW - c.w / 2 - 2, c.x));
              settled.push(c);
              c.el.style.left = c.x + 'px';
              c.el.style.top = c.y + 'px';
              c.el.style.opacity = c.strong ? '1' : '0.92';
            }
          }

          function bind() {
            var el = S.renderer.domElement;
            function on(target, type, fn, opts) {
              target.addEventListener(type, fn, opts || false);
              S.handlers.push([target, type, fn, opts || false]);
            }
            function ndc(ev) {
              var r = el.getBoundingClientRect();
              S.pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
              S.pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
            }
            function hit() {
              S.raycaster.setFromCamera(S.pointer, S.camera);
              var xs = S.raycaster.intersectObjects(S.picks, false);
              // Raycaster checks the mesh itself, not hidden ancestors. Skip an
              // invisible crown so a dead tree's visible trunk/roots remain clickable.
              for (var xi = 0; xi < xs.length; xi++) {
                var candidate = xs[xi].object;
                var node = candidate;
                var visible = true;
                while (node) {
                  if (node.visible === false) { visible = false; break; }
                  node = node.parent;
                }
                if (visible && candidate.userData && candidate.userData.partId) {
                  return candidate.userData.partId;
                }
              }
              return null;
            }
            on(el, 'pointerdown', function (ev) {
              S.dragging = true; S.moved = 0;
              S.lastX = ev.clientX; S.lastY = ev.clientY;
              try { el.setPointerCapture(ev.pointerId); } catch (e) {}
            });
            on(el, 'pointermove', function (ev) {
              if (S.dragging) {
                var dx = ev.clientX - S.lastX, dy = ev.clientY - S.lastY;
                S.moved += Math.abs(dx) + Math.abs(dy);
                S.yaw -= dx * 0.008;
                S.pitch = Math.max(0.12, Math.min(1.35, S.pitch + dy * 0.006));
                S.lastX = ev.clientX; S.lastY = ev.clientY;
              } else {
                ndc(ev);
                var over = hit();
                if (over !== S.hovered) {
                  S.hovered = over;
                  el.style.cursor = over ? 'pointer' : 'grab';
                }
              }
            });
            on(el, 'pointerup', function (ev) {
              var wasDrag = S.moved > 6;
              S.dragging = false;
              try { el.releasePointerCapture(ev.pointerId); } catch (e) {}
              if (wasDrag) return;                       // rotating, not picking
              ndc(ev);
              var id = hit();
              if (id && props.onPick) { try { props.onPick(id); } catch (e) {} }
            });
            on(el, 'pointerleave', function () {
              S.dragging = false;
              if (S.hovered) { S.hovered = null; el.style.cursor = 'grab'; }
            });
            on(el, 'wheel', function (ev) {
              ev.preventDefault();
              S.dist = Math.max(2.6, Math.min(8.5, S.dist + (ev.deltaY > 0 ? 0.4 : -0.4)));
            }, { passive: false });
            el.style.cursor = 'grab';

            var onResize = function () {
              if (!S || !S.node) return;
              var w = S.node.clientWidth, hh = S.node.clientHeight;
              if (!w || !hh) return;
              S.renderer.setSize(w, hh);
              S.camera.aspect = w / hh;
              S.camera.updateProjectionMatrix();
            };
            on(window, 'resize', onResize);

            on(el, 'pointercancel', function () {
              // Fires when the browser takes the gesture over for scrolling
              // (touch-action: pan-y). Without this the scene stays stuck in
              // "dragging" and the next pointermove yanks the camera.
              S.dragging = false;
            });

            // ── Context loss ──
            // Real on low-memory Chromebooks: the GPU process drops contexts under
            // pressure. Previously this was a permanent "failed". Now we rebuild
            // once, and only fall back to the 2D list if the rebuild also fails.
            on(el, 'webglcontextlost', function (ev) {
              ev.preventDefault();
              console.warn('[AutoRepair] WebGL context lost — attempting one rebuild');
              var node = S ? S.node : null;
              var keep = S ? { yaw: S.yaw, pitch: S.pitch, dist: S.dist } : null;
              teardown();
              if (restoreAttempts >= 1 || !node || !node.isConnected) { setStatus('failed'); return; }
              restoreAttempts++;
              setStatus('loading');
              window.setTimeout(function () {
                if (!node.isConnected) return;
                try {
                  start(window.THREE, node);
                  if (S && keep) { S.yaw = keep.yaw; S.pitch = keep.pitch; S.dist = keep.dist; }
                } catch (e) { setStatus('failed'); }
              }, 350);
            }, false);

            // ── Pause when unseen ──
            var onVis = function () {
              if (document.hidden) pauseLoop(); else resumeLoop();
            };
            on(document, 'visibilitychange', onVis);

            if (typeof IntersectionObserver === 'function') {
              try {
                S.io = new IntersectionObserver(function (entries) {
                  for (var i = 0; i < entries.length; i++) {
                    if (entries[i].isIntersecting && !document.hidden) resumeLoop();
                    else if (!entries[i].isIntersecting) pauseLoop();
                  }
                }, { threshold: 0.01 });
                S.io.observe(S.node);
              } catch (e) { S.io = null; }
            }
          }

          function teardown() {
            if (!S) return;
            if (S.raf) cancelAnimationFrame(S.raf);
            if (S.io) { try { S.io.disconnect(); } catch (e) {} S.io = null; }
            S.handlers.forEach(function (hd) {
              try { hd[0].removeEventListener(hd[1], hd[2], hd[3]); } catch (e) {}
            });
            try {
              var disposedGeometries = new Set();
              var disposedMaterials = new Set();
              var disposedTextures = new Set();
              var textureSlots = [
                'map', 'alphaMap', 'aoMap', 'bumpMap', 'displacementMap', 'emissiveMap',
                'envMap', 'lightMap', 'metalnessMap', 'normalMap', 'roughnessMap', 'specularMap'
              ];
              S.scene.traverse(function (o) {
                if (o.geometry && o.geometry.dispose && !disposedGeometries.has(o.geometry)) {
                  disposedGeometries.add(o.geometry);
                  o.geometry.dispose();
                }
                if (o.material) {
                  var ms = Array.isArray(o.material) ? o.material : [o.material];
                  ms.forEach(function (m) {
                    if (!m || disposedMaterials.has(m)) return;
                    disposedMaterials.add(m);
                    for (var tsi = 0; tsi < textureSlots.length; tsi++) {
                      var tex = m[textureSlots[tsi]];
                      if (tex && tex.dispose && !disposedTextures.has(tex)) {
                        disposedTextures.add(tex);
                        tex.dispose();
                      }
                    }
                    if (m.dispose) m.dispose();
                  });
                }
              });
              if (S.renderer.domElement && S.renderer.domElement.parentNode) {
                S.renderer.domElement.parentNode.removeChild(S.renderer.domElement);
              }
              Object.keys(S.labels || {}).forEach(function (k) {
                var el = S.labels[k];
                if (el && el.parentNode) el.parentNode.removeChild(el);
              });
              S.renderer.dispose();
              if (S.renderer.forceContextLoss) S.renderer.forceContextLoss();
            } catch (e) {}
            S = null;
            status = 'idle';
          }

          function start(THREE, node) {
            var built = build(THREE, node);
            if (!built) { setStatus('failed'); return; }
            S = built;
            bind();
            placeCamera();
            setStatus('ready');
            S.raf = requestAnimationFrame(frame);
          }

          return {
            // STABLE identity — never recreate this function.
            attach: function (node) {
              if (!node) { teardown(); return; }
              if (S && S.node === node) return;
              teardown();
              restoreAttempts = 0;      // fresh visit gets its own context-loss retry
              setStatus('loading');
              if (window.THREE) { start(window.THREE, node); return; }
              if (!window.StemLab || !window.StemLab.ensureThree) { setStatus('failed'); return; }
              window.StemLab.ensureThree({
                orbit: false,
                failMessage: 'The 3D engine could not load. School network filters sometimes block CDNs. The full labelled parts list below remains available.'
              }).then(function (THREE) {
                if (!node.isConnected) return;           // navigated away mid-load
                start(THREE, node);
              }).catch(function () {
                console.warn('[AutoRepair] Three.js failed to load — under-hood tour falling back to the 2D list');
                setStatus('failed');
              });
            },
            sync: function (next) { props = next; },
            nudge: function (dYaw, dPitch) {
              if (!S) return;
              S.yaw += dYaw;
              S.pitch = Math.max(0.12, Math.min(1.35, S.pitch + dPitch));
            },
            // Zoom was wheel-only, which left keyboard, touch and switch users with
            // no way to get closer. Same clamp as the wheel handler.
            zoom: function (delta) {
              if (!S) return;
              S.dist = Math.max(2.6, Math.min(8.5, S.dist + delta));
            },
            reset: function () {
              if (!S) return;
              S.yaw = cfg.home.yaw; S.pitch = cfg.home.pitch; S.dist = cfg.home.dist;
            },
            status: function () { return status; }
          };
        },
        // One canonical way to draw a large batch of identical, individually
        // coloured little solids — unit cubes for the Volume explorer and the
        // base-ten blocks, spheres for earthquake foci in Plate Tectonics.
        //
        // Extracted after the third tool needed it. The mechanics are dull,
        // but BOTH r128 traps below were found the hard way, each costing a
        // debugging session, and neither is visible to a jsdom test:
        //
        //   1. instanceColor must exist BEFORE the first render. r128 decides
        //      whether to compile USE_INSTANCING_COLOR into the shader from
        //      whether the attribute is null at compile time, then caches the
        //      program. Tools whose first frame is empty (freeform Volume, an
        //      empty base-ten board, a boundary with no quakes yet) would
        //      cache a colourless program and silently drop every colour set
        //      afterwards — solids render white and read as the wrong thing.
        //   2. Outlines must be real box edges. `wireframe: true` draws the
        //      TRIANGLE edges, putting an X through every face, which destroys
        //      the countability that is the whole point of a voxel view.
        //
        // Also defaults frustumCulled off: r128 InstancedMesh has no
        // per-instance bounds, so culling tests the whole batch against one
        // unit-sized sphere at the origin and pops the model out of view.
        //
        // ── Shared orbit-viewer lifecycle ──────────────────────────────
        //
        // Four tools (bridgeLab, opticsLab polarization, opticsLab Snell's
        // window, astronomy moon geometry) had independently grown the SAME
        // ~180 lines: a module singleton, one stable ref callback, render()
        // stashing plain data that a rAF loop diffs by signature, an exact
        // camera fit, context-loss handling and teardown. Rule of three, twice
        // over. Everything tool-specific now lives in two callbacks.
        //
        // The contract that makes this safe, and that every consumer relies on:
        //   * render() NEVER touches the GPU. It calls push() with plain data.
        //     The rAF loop compares `sig` and rebuilds only when it changed.
        //   * the tool's 2D layer is a guaranteed floor and always renders.
        //   * status flips asynchronously, so onStatusChange() must be wired
        //     back into React or a "Loading" overlay sits on a live canvas.
        //
        // cfg:
        //   attr          data-* attribute stamped on the canvas (for tests)
        //   clearColor    scene background
        //   fov           camera field of view (default 42)
        //   rot           { y, x } initial orbit, degrees
        //   lights        function (THREE, scene) — called once at build
        //   build         function (THREE, S, m) — rebuild S.model from pushed
        //                 data m. Set S.target, and EITHER S.fitPts (array of
        //                 Vector3 the scene really occupies — preferred) OR
        //                 S.half (box half-extents). Points beat a box: a box
        //                 invents corners for disc/cone scenes and the camera
        //                 backs off to frame empty space.
        //   fitPad        extra world-units of margin around fitPts
        //   debug         function (S) — extra fields merged into debug()
        //   failMessage   passed to ensureThree
        //
        // Returns { attach, push, onStatusChange, status, debug, dispose }.
        // attach IS the ref callback — define ONE at module scope and reuse it;
        // an inline arrow is a new identity every render, so React detaches and
        // reattaches and the scene is rebuilt on every keystroke.
        makeOrbitViewer: function (cfg) {
          cfg = cfg || {};
          var S = null, status = 'idle', pending = null, node = null, sig = '';
          var notify = null, restoreAttempts = 0, attachGeneration = 0;
          var self = this;

          function setStatus(next) {
            if (status === next) return;
            status = next;
            if (notify) { try { notify(next); } catch (e) {} }
          }

          function disposeGroup(group) {
            if (!group) return;
            var objects = [], geometries = [], materials = [];
            var collect = function(c) {
              if (!c || c === group) return;
              if (typeof c.dispose === 'function' && objects.indexOf(c) === -1) objects.push(c);
              if (c.geometry && geometries.indexOf(c.geometry) === -1) geometries.push(c.geometry);
              if (c.material) {
                var list = Array.isArray(c.material) ? c.material : [c.material];
                for (var mi = 0; mi < list.length; mi++) {
                  if (list[mi] && materials.indexOf(list[mi]) === -1) materials.push(list[mi]);
                }
              }
            };
            if (typeof group.traverse === 'function') group.traverse(collect);
            else for (var ci = 0; ci < group.children.length; ci++) collect(group.children[ci]);
            // InstancedMesh.dispose() releases renderer-owned instance buffers;
            // geometry/material disposal alone does not do that in pinned Three r128.
            for (var oi = 0; oi < objects.length; oi++) { try { objects[oi].dispose(); } catch (e) {} }
            for (var gi = 0; gi < geometries.length; gi++) { try { geometries[gi].dispose(); } catch (e) {} }
            for (var mati = 0; mati < materials.length; mati++) { try { materials[mati].dispose(); } catch (e) {} }
            while (group.children.length) group.remove(group.children[group.children.length - 1]);
          }

          function debug() {
            var base = {
              state: status,
              contextLost: !!(S && S.contextLost),
              canvas: S && S.renderer
                ? { w: S.renderer.domElement.width, h: S.renderer.domElement.height }
                : null
            };
            if (S && cfg.debug) {
              try {
                var extra = cfg.debug(S) || {};
                for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) base[k] = extra[k];
              } catch (e) {}
            }
            return base;
          }

          function ensureFrame() {
            if (!S || S.raf || S.contextLost || S.failed || !S.renderer) return;
            if (S.visible === false || (typeof document !== 'undefined' && document.hidden)) return;
            S.raf = requestAnimationFrame(frame);
          }

          function failRuntime(error, phase) {
            if (!S || S.failed) return;
            S.failed = true;
            if (S.raf) cancelAnimationFrame(S.raf);
            S.raf = 0;
            if (window.console && console.error) console.error('[StemLab] 3D ' + phase + ' failed', error);
            setStatus('failed');
          }
          function frame(now) {
            if (!S) return;
            S.raf = 0;
            if (S.contextLost || S.failed || !S.renderer) return;
            var hadPending = false;
            if (pending) {
              var next = pending; pending = null;
              hadPending = true;
              if (next.sig !== sig) {
                sig = next.sig;
                disposeGroup(S.model);
                S.fitPts = null;
                S.tick = null;
                try {
                  cfg.build(S.THREE, S, next);
                } catch (e) {
                  disposeGroup(S.model);
                  failRuntime(e, 'scene build');
                  return;
                }
              }
              S.rotY = next.rotY; S.rotX = next.rotX; S.zoom = next.zoom;
              S.data = next;
              S.dirty = true;
            }
            var isStatic = !!(S.data && S.data.static);
            if (S.visible === false || (typeof document !== 'undefined' && document.hidden)) return;
            if (S.tick && (!isStatic || hadPending)) {
              try { S.tick(now || 0); }
              catch (e) { failRuntime(e, 'animation'); return; }
            }

            var el = S.renderer.domElement;
            var w = el.clientWidth || 1, hgt = el.clientHeight || 1;
            var sizeChanged = w !== S.lastW || hgt !== S.lastH;
            if (sizeChanged) {
              S.lastW = w; S.lastH = hgt;
              S.renderer.setSize(w, hgt, false);
              S.camera.aspect = w / Math.max(1, hgt);
              S.dirty = true;
            }
            if (isStatic && !hadPending && !sizeChanged && !S.dirty) return;

            var THREE = S.THREE;
            var ry = (S.rotY || 0) * Math.PI / 180, rx = (S.rotX || 0) * Math.PI / 180;
            var dir = new THREE.Vector3(
              Math.cos(rx) * Math.sin(ry), Math.sin(rx), Math.cos(rx) * Math.cos(ry)
            ).normalize();

            // Exact fit: for each sample, the distance that just keeps it inside
            // the frustum is |offset along the screen axis| / tan(half fov) plus
            // how far it already sits toward the camera. Take the largest. Done
            // per frame, so the fit survives orbiting — content seen end-on
            // needs a very different distance than the same content broadside.
            var fit = 1;
            var up0 = new THREE.Vector3(0, 1, 0);
            var right = new THREE.Vector3().crossVectors(up0, dir);
            if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
            right.normalize();
            var upv = new THREE.Vector3().crossVectors(dir, right).normalize();
            var tanV = Math.tan(S.camera.fov * Math.PI / 360);
            var tanH = tanV * Math.max(0.2, S.camera.aspect);
            var pad = cfg.fitPad || 0;
            var tgt = S.target || new THREE.Vector3();

            function consider(v) {
              var rel = new THREE.Vector3().subVectors(v, tgt);
              var along = rel.dot(dir);
              var nh = (Math.abs(rel.dot(right)) + pad) / tanH + along;
              var nv = (Math.abs(rel.dot(upv)) + pad) / tanV + along;
              if (nh > fit) fit = nh;
              if (nv > fit) fit = nv;
            }

            if (S.fitPts && S.fitPts.length) {
              for (var fi = 0; fi < S.fitPts.length; fi++) consider(S.fitPts[fi]);
            } else if (S.half) {
              for (var sx = -1; sx <= 1; sx += 2) {
                for (var sy = -1; sy <= 1; sy += 2) {
                  for (var sz = -1; sz <= 1; sz += 2) {
                    consider(new THREE.Vector3(
                      tgt.x + sx * S.half.x, tgt.y + sy * S.half.y, tgt.z + sz * S.half.z
                    ));
                  }
                }
              }
            }
            fit *= (cfg.fitSlack || 1.05);

            var dist = fit / Math.max(0.3, S.zoom || 1);
            S.camera.position.copy(tgt).addScaledVector(dir, dist);
            S.camera.near = Math.max(0.05, dist * 0.01);
            S.camera.far = dist * 8 + 200;
            S.camera.updateProjectionMatrix();
            S.camera.lookAt(tgt);
            try { S.renderer.render(S.scene, S.camera); S.dirty = false; }
            catch (e) { failRuntime(e, 'render'); return; }
            if (!isStatic) ensureFrame();
          }

          function build(THREE, host) {
            var renderer;
            try {
              renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
            } catch (e) {
              return false;              // no WebGL here — the 2D floor carries on
            }
            var w = host.clientWidth || 460, hgt = host.clientHeight || 300;
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            renderer.setSize(w, hgt);
            renderer.setClearColor(cfg.clearColor == null ? 0x0a0e1a : cfg.clearColor, 1);
            var el = renderer.domElement;
            el.style.display = 'block';
            el.style.width = '100%';
            el.style.height = '100%';
            el.style.borderRadius = cfg.radius == null ? '10px' : cfg.radius;
            // pan-y, NOT none: a full-width canvas with touch-action:none
            // swallows every vertical swipe and becomes a scroll trap on a phone.
            el.style.touchAction = 'pan-y';
            if (cfg.attr) el.setAttribute(cfg.attr, 'true');
            el.setAttribute('aria-hidden', 'true');
            host.appendChild(el);

            var scene = new THREE.Scene();
            var camera = new THREE.PerspectiveCamera(cfg.fov || 42, w / Math.max(1, hgt), 0.1, 4000);
            var model = new THREE.Group();
            scene.add(model);

            S = {
              THREE: THREE, renderer: renderer, scene: scene, camera: camera, model: model,
              rotY: (cfg.rot && cfg.rot.y) || 0, rotX: (cfg.rot && cfg.rot.x) || 0, zoom: 1,
              target: new THREE.Vector3(), half: null, fitPts: null, data: null, tick: null,
              contextLost: false, failed: false, disposing: false, visible: true, dirty: true,
              observer: null, resizeObserver: null, onWindowResize: null, onVisibilityChange: null,
              onContextLost: null, onContextRestored: null,
              lastW: w, lastH: hgt, raf: 0
            };
            if (cfg.lights) { try { cfg.lights(THREE, scene, S); } catch (e) {} }

            var localS = S;
            localS.onContextLost = function (ev) {
              ev.preventDefault();
              if (localS.disposing) return;
              localS.contextLost = true;
              if (localS.raf) cancelAnimationFrame(localS.raf);
              localS.raf = 0;
              setStatus('failed');
            };
            localS.onContextRestored = function () {
              if (localS.disposing || restoreAttempts >= 1) return;
              restoreAttempts++;
              localS.contextLost = false;
              localS.failed = false;
              localS.dirty = true;
              sig = '';
              setStatus('ready');
              ensureFrame();
            };
            el.addEventListener('webglcontextlost', localS.onContextLost);
            el.addEventListener('webglcontextrestored', localS.onContextRestored);
            if (typeof window.IntersectionObserver === 'function') {
              localS.observer = new window.IntersectionObserver(function(entries) {
                if (!entries || !entries[0] || localS.disposing) return;
                localS.visible = entries[0].isIntersecting !== false;
                if (localS.visible) {
                  localS.dirty = true;
                  ensureFrame();
                } else if (localS.raf) {
                  cancelAnimationFrame(localS.raf);
                  localS.raf = 0;
                }
              });
              localS.observer.observe(host);
            }
            var markDirty = function() {
              if (localS.disposing) return;
              localS.dirty = true;
              ensureFrame();
            };
            if (typeof window.ResizeObserver === 'function') {
              localS.resizeObserver = new window.ResizeObserver(markDirty);
              localS.resizeObserver.observe(host);
            } else {
              localS.onWindowResize = markDirty;
              window.addEventListener('resize', localS.onWindowResize);
            }
            localS.onVisibilityChange = function() {
              if (localS.disposing) return;
              if (document.hidden) {
                if (localS.raf) cancelAnimationFrame(localS.raf);
                localS.raf = 0;
              } else {
                localS.dirty = true;
                ensureFrame();
              }
            };
            if (typeof document !== 'undefined') document.addEventListener('visibilitychange', localS.onVisibilityChange);

            sig = '';
            ensureFrame();
            return true;
          }

          function teardown(preserveNotify) {
            if (!preserveNotify) notify = null;
            var retiring = S;
            if (retiring) {
              retiring.disposing = true;
              if (retiring.raf) cancelAnimationFrame(retiring.raf);
              retiring.raf = 0;
              if (retiring.observer) { try { retiring.observer.disconnect(); } catch (e) {} }
              if (retiring.resizeObserver) { try { retiring.resizeObserver.disconnect(); } catch (e) {} }
              if (retiring.onWindowResize) window.removeEventListener('resize', retiring.onWindowResize);
              if (retiring.onVisibilityChange && typeof document !== 'undefined') document.removeEventListener('visibilitychange', retiring.onVisibilityChange);
              if (retiring.renderer && retiring.renderer.domElement) {
                var canvas = retiring.renderer.domElement;
                if (retiring.onContextLost) canvas.removeEventListener('webglcontextlost', retiring.onContextLost);
                if (retiring.onContextRestored) canvas.removeEventListener('webglcontextrestored', retiring.onContextRestored);
              }
              disposeGroup(retiring.model);
              if (retiring.renderer) {
                try { retiring.renderer.forceContextLoss(); } catch (e) {}
                try { retiring.renderer.dispose(); } catch (e) {}
                if (retiring.renderer.domElement && retiring.renderer.domElement.parentNode) {
                  retiring.renderer.domElement.parentNode.removeChild(retiring.renderer.domElement);
                }
              }
            }
            S = null; node = null; pending = null; sig = ''; restoreAttempts = 0;
            status = 'idle';
          }
          var api = {
            /** Stable ref callback target. Host div, or null on unmount. */
            attach: function (host) {
              if (!host) {
                var detachedGeneration = ++attachGeneration;
                teardown(true);
                // Callback refs may detach/re-attach within one commit. Preserve
                // the subscriber through that cycle, but release it after a real unmount.
                Promise.resolve().then(function() {
                  if (!node && attachGeneration === detachedGeneration) notify = null;
                });
                return;
              }
              if (node === host) return;
              var generation = ++attachGeneration;
              if (S || node) teardown(true);
              node = host;
              setStatus('loading');
              var ensure = self.ensureThree
                ? self.ensureThree({ orbit: false, failMessage: cfg.failMessage || '3D view unavailable' })
                : Promise.reject(new Error('no host loader'));
              ensure.then(function (THREE) {
                if (generation !== attachGeneration || node !== host) return;
                if (!THREE) { setStatus('failed'); return; }
                setStatus(build(THREE, host) ? 'ready' : 'failed');
              }).catch(function () {
                if (generation !== attachGeneration || node !== host) return;
                setStatus('failed');
              });
            },
            /** render() calls this. Never touches the GPU — the rAF loop does. */
            push: function (data) {
              pending = data;
              if (S) { S.dirty = true; ensureFrame(); }
            },
            /** Wire back into React, or a dead overlay sits on a live canvas. */
            onStatusChange: function (fn) { notify = fn; },
            status: function () { return status; },
            debug: debug,
            dispose: function () {
              attachGeneration++;
              teardown(false);
            }
          };
          return api;
        },

        // Usage:
        //   var batch = StemLab.makeVoxelBatch(THREE, { capacity: n, edges: true });
        //   batch.set(i, x, y, z, scale, '#2563eb');   // or 0x2563eb
        //   batch.commit(count);  scene.add(batch.mesh); scene.add(batch.edges);
        makeVoxelBatch: function (THREE, opts) {
          opts = opts || {};
          var capacity = Math.max(1, opts.capacity || 64);
          var clip = opts.clippingPlanes || null;
          var geo = opts.geometry || new THREE.BoxGeometry(
            opts.size || 0.94, opts.size || 0.94, opts.size || 0.94);
          var mat = opts.material || new THREE.MeshLambertMaterial({
            color: 0xffffff,
            side: opts.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
            clippingPlanes: clip
          });

          var mesh = new THREE.InstancedMesh(geo, mat, capacity);
          mesh.frustumCulled = opts.frustumCulled === true;
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          if (opts.castShadow) mesh.castShadow = true;
          if (opts.receiveShadow) mesh.receiveShadow = true;

          // Trap 1. Allocate the colour attribute up front.
          if (typeof mesh.setColorAt === 'function') {
            var seed = new THREE.Color(0xffffff);
            for (var s = 0; s < capacity; s++) mesh.setColorAt(s, seed);
            if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
          }

          // Trap 2. The twelve edges of a unit cube as twenty-four endpoints.
          var edges = null, epos = null;
          var CORNERS = [[-0.5,-0.5,-0.5],[0.5,-0.5,-0.5],[0.5,-0.5,0.5],[-0.5,-0.5,0.5],
                         [-0.5,0.5,-0.5],[0.5,0.5,-0.5],[0.5,0.5,0.5],[-0.5,0.5,0.5]];
          var PAIRS = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
          var TEMPLATE = [];
          PAIRS.forEach(function (p) { TEMPLATE.push(CORNERS[p[0]], CORNERS[p[1]]); });

          if (opts.edges) {
            var eg = new THREE.BufferGeometry();
            eg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(capacity * 24 * 3), 3));
            edges = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({
              color: opts.edgeColor != null ? opts.edgeColor : 0x0f172a,
              transparent: true,
              opacity: opts.edgeOpacity != null ? opts.edgeOpacity : 0.3,
              clippingPlanes: clip
            }));
            edges.frustumCulled = false;
            epos = eg.attributes.position;
          }

          var dummy = new THREE.Object3D();
          var tmpColor = new THREE.Color();

          return {
            mesh: mesh,
            edges: edges,
            capacity: capacity,
            set: function (i, x, y, z, scale, color) {
              if (i >= capacity) return;
              var sc = scale == null ? 1 : scale;
              dummy.position.set(x, y, z);
              dummy.rotation.set(0, 0, 0);
              dummy.scale.set(sc, sc, sc);
              dummy.updateMatrix();
              mesh.setMatrixAt(i, dummy.matrix);
              if (color != null && typeof mesh.setColorAt === 'function') {
                if (typeof color === 'number') tmpColor.setHex(color);
                else tmpColor.setStyle(color);
                mesh.setColorAt(i, tmpColor);
              }
              if (epos) {
                for (var k = 0; k < 24; k++) {
                  var e = TEMPLATE[k];
                  epos.array[(i * 24 + k) * 3]     = x + e[0] * sc;
                  epos.array[(i * 24 + k) * 3 + 1] = y + e[1] * sc;
                  epos.array[(i * 24 + k) * 3 + 2] = z + e[2] * sc;
                }
              }
            },
            commit: function (n) {
              mesh.count = n;
              mesh.instanceMatrix.needsUpdate = true;
              if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
              if (edges) {
                epos.needsUpdate = true;
                edges.geometry.setDrawRange(0, n * 24);
              }
            },
            drawnCount: function () { return mesh.count; },
            outlinedCount: function () { return edges ? edges.geometry.drawRange.count / 24 : 0; },
            addTo: function (scene) { scene.add(mesh); if (edges) scene.add(edges); },
            dispose: function (scene) {
              if (scene) { scene.remove(mesh); if (edges) scene.remove(edges); }
              mesh.geometry.dispose(); mesh.material.dispose();
              if (edges) { edges.geometry.dispose(); edges.material.dispose(); }
            }
          };
        },
        registerTool: function(id, config) {
          config.id = id;
          config.ready = config.ready !== false;
          // Normalize legacy field-name aliases so downstream `tool.label`/`tool.desc` reads
          // always resolve. Some plugins use `title`/`name` (legacy) or `description` (legacy)
          // instead of canonical `label`/`desc`. Defaults applied for fields whose absence
          // would cause visible degradation (slate tile, ungrouped category).
          if (!config.label) config.label = config.title || config.name || id;
          if (!config.desc) config.desc = config.description || '';
          if (config.aliases && !Array.isArray(config.aliases)) config.aliases = [config.aliases];
          if (!config.aliases && config.searchAliases) config.aliases = Array.isArray(config.searchAliases) ? config.searchAliases : [config.searchAliases];
          if (!config.color) config.color = 'slate';
          if (!config.category) config.category = 'general';
          this._registry[id] = config;
          if (this._order.indexOf(id) === -1) this._order.push(id);
          console.log('[StemLab] Registered tool: ' + id);
          // Populate STEM_TOOL_REGISTRY for lesson plan integration
          if (!window.STEM_TOOL_REGISTRY) window.STEM_TOOL_REGISTRY = [];
          var catMap = { science: ['Science'], math: ['Math'], engineering: ['Engineering'], art: ['Art'], coding: ['CS'] };
          var entry = { id: id, name: config.label, subjects: catMap[config.category] || ['STEM'], tags: [config.category || 'stem', id].concat(config.aliases || []) };
          var exists = false;
          for (var ri = 0; ri < window.STEM_TOOL_REGISTRY.length; ri++) {
            if (window.STEM_TOOL_REGISTRY[ri].id === id) { exists = true; break; }
          }
          if (!exists) window.STEM_TOOL_REGISTRY.push(entry);
        },
        getRegisteredTools: function() {
          var self = this;
          return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
        },
        isRegistered: function(id) { return !!this._registry[id]; },
        renderTool: function(id, ctx) {
          var tool = this._registry[id];
          if (!tool || !tool.render) return null;
          var rendered;
          try { rendered = tool.render(ctx); }
          catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; }
          if (rendered == null) return null;
          // ── Keyless-list guard ──
          // If a tool's render() returns a BARE ARRAY (fragment-style, e.g.
          // `return [headerEl, bodyEl]`), React treats the elements as a list.
          // Passed as a child below (or returned directly on the lightBackground
          // path), those elements lack keys → "Each child in a list should have
          // a unique key" — attributed to the StemPluginBridge fiber because
          // renderTool is inlined there. Wrap bare arrays in a Fragment and give
          // each element a stable per-index key so the warning can't originate
          // from any tool, regardless of how its render was authored.
          if (Array.isArray(rendered) && ctx && ctx.React) {
            rendered = ctx.React.createElement(ctx.React.Fragment, null,
              rendered.map(function(child, i) {
                return (child != null && typeof child === 'object' && ctx.React.isValidElement && ctx.React.isValidElement(child) && child.key == null)
                  ? ctx.React.cloneElement(child, { key: 'stem-frag-' + i })
                  : child;
              }));
          }
          // ── WCAG dark-shell auto-wrap ──
          // Every STEM tool's text palette was designed for a dark navy
          // substrate (#86efac, #94a3b8, #cbd5e1, #e2e8f0 etc.). When the
          // tool renders on a white host page, those colors fail WCAG AA
          // (e.g., #86efac on white = 1.6:1, need 4.5:1).
          //
          // Wrap the tool's output in a self-contained dark shell at the
          // host level so every tool inherits the proper contrast substrate
          // automatically — no per-tool wrap needed.
          //
          // Opt out by setting `lightBackground: true` in the registerTool
          // config (intended for tools that genuinely need a white surface,
          // e.g., printable artifact tools).
          if (tool.lightBackground === true) return rendered;
          if (!ctx || !ctx.React) return rendered;

          var shellTheme = (ctx.theme === 'contrast' || ctx.theme === 'dark' || ctx.theme === 'light')
            ? ctx.theme
            : (ctx.isContrast ? 'contrast' : (ctx.isDark ? 'dark' : 'light'));

          // ── Why the tool content sits on its own light card ──
          // The themed canvas above is the page BACKDROP. It must not be the
          // surface tool content is painted on, because tools are authored for a
          // light substrate: they use Tailwind's dark text utilities and paint
          // their own white/50-tint panels. Text that happens NOT to sit on one of
          // those panels inherits the backdrop, and in .theme-dark / .theme-contrast
          // that made it dark-on-dark. Measured across a sample of eight tools,
          // 32 elements failed that way — the worst were tool titles at 1.0-1.2:1,
          // i.e. literally invisible, and it extrapolates to 400+ across the ~132
          // registered tools.
          //
          // Fixing it per tool would mean ~400 edits across 132 files, several of
          // which are actively being worked on elsewhere. Fixing it here is one
          // change that covers every tool, including ones added later, and keeps
          // the dark chrome a dark-theme user expects: a lit page on a dark desk.
          //
          // `contrast` deliberately keeps its pure-black surface — that theme's
          // whole point is maximum separation, its own palette is built for it,
          // and a light card would fight it.
          var isDarkBackdrop = shellTheme === 'dark';

          return ctx.React.createElement('div', {
            style: {
              background: 'var(--allo-stem-canvas, #0f172a)',
              color: 'var(--allo-stem-text, #e2e8f0)',
              borderRadius: 12,
              minHeight: 'calc(100vh - 32px)',
              padding: isDarkBackdrop ? 10 : 0
            },
            'data-stem-tool-shell': id,
            'data-stem-theme': shellTheme
          },
            // sr-only tool-name heading — gives every tool a semantic H1 landmark
            // for screen readers (many tools' visible titles are non-heading text
            // or sit behind a tab). Visual layout is unchanged.
            ctx.React.createElement('h1', { style: { position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 } }, (tool.label || id)),
            isDarkBackdrop
              ? ctx.React.createElement('div', {
                  'data-stem-tool-surface': id,
                  style: {
                    background: '#ffffff',
                    color: '#0f172a',
                    borderRadius: 10,
                    padding: 10,
                    minHeight: 'calc(100vh - 56px)'
                  }
                }, rendered)
              : rendered);
        },
        // Shared HiDPI canvas setup. Resizes the internal pixel buffer
        // to match the device pixel ratio while keeping CSS dims at the
        // logical size, so retina/HiDPI displays render canvas content
        // crisply instead of CSS-scaling a 1x bitmap. Idempotent: only
        // re-allocates when dpr or logical dims change.
        //
        // Usage in a tool's render useEffect:
        //   var canvas = canvasRef.current; if (!canvas) return;
        //   window.StemLab.setupHiDPI(canvas, 720, 360);
        //   var gfx = canvas.getContext('2d');
        //   gfx.setTransform(canvas._dpr, 0, 0, canvas._dpr, 0, 0);
        //   var W = canvas._logicalW || canvas.width;
        //   var H = canvas._logicalH || canvas.height;
        //   // ... rest of draw code, all in CSS px ...
        //
        // Mouse coord math should use canvas._logicalW / canvas._logicalH
        // (NOT canvas.width/height which after setup return the dpr-scaled
        // buffer size, off by a factor of dpr).
        //
        // dpr is clamped to [1, 2] to avoid runaway memory on 3x phones.
        setupHiDPI: function(canvas, logicalW, logicalH) {
          if (!canvas) return;
          var dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
          if (canvas._dpr === dpr && canvas._logicalW === logicalW && canvas._logicalH === logicalH) return;
          canvas.width = Math.round(logicalW * dpr);
          canvas.height = Math.round(logicalH * dpr);
          canvas.style.width = logicalW + 'px';
          canvas.style.height = logicalH + 'px';
          canvas._dpr = dpr;
          canvas._logicalW = logicalW;
          canvas._logicalH = logicalH;
        },
        // ── findById: null-safe lookup over an array of {id, ...} records.
        // Replaces the corpus-wide `.find(x => x.id === id).field` chain that
        // crashes the tool when an id is renamed, i18n-filtered, or stale
        // in persisted state. The recommended replacement pattern is:
        //
        //   var rec = window.StemLab.findById(SCENARIOS, id);
        //   var name = rec ? rec.name : 'Unknown';
        //   // OR with optional chaining at the call site:
        //   var name = window.StemLab.findById(SCENARIOS, id)?.name ?? 'Unknown';
        //
        // The check_find_deref.cjs gate flags new `.find(...).field` writes;
        // existing instances are converted opportunistically as authors touch
        // each tool. STEAM Lab audit (2026-06-07) found ~10 tools with this
        // pattern; autorepair / learning_lab / rocks were the HIGH-severity
        // first-pass conversions.
        findById: function(arr, id) {
          if (!Array.isArray(arr) || id === null || id === undefined) return null;
          for (var i = 0; i < arr.length; i++) {
            if (arr[i] && arr[i].id === id) return arr[i];
          }
          return null;
        }
      };
    }

    // ── AI Hint guardrails (pure + testable; the gate lives in getHint below) ──
    // Socratic, answer-GROUNDED prompt: the correct answer is given to the model
    // ONLY as grounding (this cuts fact-hallucination of the target), but the hint
    // must be framed as a guiding question / principle and must NOT restate the
    // answer. The reveal-check is the STRUCTURAL backstop — the prompt instruction
    // alone is never trusted to keep the answer hidden.
    function stemHintBuildPrompt(grade, tool, question, wrongAnswer, correctAnswer) {
      return 'You are a STEM tutor for a ' + (grade || '5th Grade') + ' student. Tool: ' + (tool || 'a STEM activity') + '.\n' +
        'Question: ' + question + '\n' +
        'The student answered: ' + wrongAnswer + '\n' +
        'For your reference ONLY (never state it): the correct answer is ' + correctAnswer + '.\n' +
        'Give exactly ONE short hint (max 2 sentences), phrased as a guiding question or a reminder of the relevant principle or the next thing to check. ' +
        'Do NOT state or restate the answer, do NOT evaluate their specific answer, and do NOT complete the final step for them. Use age-appropriate, encouraging language.';
    }
    // Returns true if the hint appears to leak the literal/numeric answer. Used to
    // SUPPRESS + replace a leaking hint before it is ever shown to a student.
    function stemHintRevealsAnswer(hint, correctAnswer) {
      if (!hint || correctAnswer === null || correctAnswer === undefined) return false;
      var a = String(correctAnswer).trim().toLowerCase();
      var h = String(hint).toLowerCase();
      if (!a) return false;
      if (a.length >= 2 && h.indexOf(a) !== -1) return true; // literal answer verbatim
      var m = a.match(/-?\d+(?:\.\d+)?/);                    // numeric answer as its own token
      if (m) {
        var num = m[0].replace(/\./g, '\\.');
        if (new RegExp('(^|[^\\w.])' + num + '([^\\w.]|$)').test(h)) return true;
      }
      return false;
    }

    // BEEHIVE_PERSISTENCE_HELPER_START
    // Keep this payload version independent from the shared STEM localStorage key.
    // Future Bee migrations can inspect it without invalidating other tool data.
    var _BEEHIVE_PERSISTENCE_VERSION = 1;
    function _serializeBeehiveForPersistence(beehive) {
      if (!beehive || typeof beehive !== 'object' || Array.isArray(beehive)) return null;
      var persisted = Object.assign({}, beehive, { _persistenceVersion: _BEEHIVE_PERSISTENCE_VERSION });
      // Simulation clocks are session controls. A reload must wait for an
      // explicit learner action instead of silently advancing the colony.
      delete persisted.autoAdvance;
      if (beehive.queen && typeof beehive.queen === 'object' && !Array.isArray(beehive.queen)) {
        var queen = Object.assign({}, beehive.queen);
        // Queen RTS has enough durable state to resume, but an active match
        // reopens paused so elapsed cycles never accrue during reload/remount.
        if (queen.active) queen.paused = true;
        persisted.queen = queen;
      }
      if (beehive.drone && typeof beehive.drone === 'object' && !Array.isArray(beehive.drone)) {
        var drone = Object.assign({}, beehive.drone);
        // The live flight model is held in refs and cannot be reconstructed from
        // these UI flags. Reload into preflight/debrief while retaining completed
        // runs, scores, attempts, route choices, and accessibility preferences.
        delete drone.active;
        delete drone.paused;
        delete drone.carryover;
        delete drone.replayIndex;
        delete drone.interrupted;
        persisted.drone = drone;
      } else {
        delete persisted.drone;
      }
      return persisted;
    }
    // Legacy reads and current writes share one non-mutating safety contract.
    // This prevents pre-fix localStorage from reviving session-only clocks.
    function _deserializeBeehiveFromPersistence(beehive) {
      return _serializeBeehiveForPersistence(beehive);
    }
    // BEEHIVE_PERSISTENCE_HELPER_END

    window.AlloModules = window.AlloModules || {};
    window.AlloModules.StemLab = function StemLabModal(props) {
      const {
        ArrowLeft,
        Calculator,
        GripVertical,
        Sparkles,
        X,
        addToast,
        angleChallenge,
        angleFeedback,
        angleValue,
        areaModelDims,
        areaModelHighlight,
        assessmentBlocks,
        base10Challenge,
        base10Feedback,
        base10Value,
        cubeAnswer,
        cubeBuilderChallenge,
        cubeBuilderFeedback,
        cubeBuilderMode,
        cubeChallenge,
        cubeClickSuppressed,
        cubeDims,
        cubeDragRef,
        cubeFeedback,
        cubeHoverPos,
        cubePositions,
        cubeRotation,
        cubeScale,
        cubeShowLayers,
        exploreDifficulty,
        exploreScore,
        fractionPieces,
        gridChallenge,
        gridFeedback,
        gridPoints,
        gridRange,
        mathInput,
        mathMode,
        mathQuantity,
        mathSubject,
        multTableAnswer,
        multTableChallenge,
        multTableFeedback,
        multTableHidden,
        multTableHover,
        multTableRevealed,
        numberLineMarkers,
        numberLineRange,
        setActiveView,
        setAngleChallenge,
        setAngleFeedback,
        setAngleValue,
        setAreaAnswer,
        setAreaChallenge,
        setAreaFeedback,
        setAreaModelDims,
        setAreaModelHighlight,
        setAssessmentBlocks,
        setBase10Challenge,
        setBase10Feedback,
        setBase10Value,
        setCubeAnswer,
        setCubeBuilderChallenge,
        setCubeBuilderFeedback,
        setCubeBuilderMode,
        setCubeChallenge,
        setCubeDims,
        setCubeFeedback,
        setCubeHoverPos,
        setCubePositions,
        setCubeRotation,
        setCubeScale,
        setCubeShowLayers,
        setData,
        setExploreDifficulty,
        setExploreScore,
        setFracAnswer,
        setFracChallenge,
        setFracFeedback,
        setFractionPieces,
        setGridChallenge,
        setGridFeedback,
        setGridPoints,
        setHistory,
        setMathInput,
        setMathMode,
        setMathQuantity,
        setMathSubject,
        setMultTableAnswer,
        setMultTableChallenge,
        setMultTableFeedback,
        setMultTableHidden,
        setMultTableHover,
        setMultTableRevealed,
        setNlAnswer,
        setNlChallenge,
        setNlFeedback,
        setNumberLineMarkers,
        setNumberLineRange,
        setShowAssessmentBuilder,
        setShowStemLab,
        setExpandedTools,
        useMathSourceContext,
        hasSourceOrAnalysis,
        setStemLabCreateMode,
        setStemLabTab,
        setStemLabTool,
        setToolSnapshots,
        showAssessmentBuilder,
        showStemLab,
        startMathFluencyProbe,
        stemLabCreateMode,
        stemLabTab,
        stemLabTool,
        submitExploreScore,
        toolSnapshots,
        nlAnswer,
        nlChallenge,
        nlFeedback,
        nlMarkerLabel,
        nlMarkerVal,
        areaChallenge,
        areaFeedback,
        areaAnswer,
        fracChallenge,
        fracFeedback,
        fracAnswer,
        handleGenerateMath,
        labToolData,
        setLabToolData,
        gradeLevel,
        sourceTopic,
        inputText,
        storageDB,
        ai,
        sourceProvenance,
        sourceLocator,
        sourceType,
        callGemini,
        callTTS,
        callImagen,
        callGeminiVision,
        callGeminiImageEdit,
        // W7 (2026-08-16): the host nulls the AI functions above when no backend
        // is configured (no key, not Canvas, no local model), and passes this
        // callback so the header pill can open AI Backend Settings. Every AI
        // feature in this module already self-disables through its `callGemini`
        // guard; the pill is the one honest indicator that explains why.
        onOpenAiSetup,
        theme: _themeProp,
        activeSessionCode,
        studentNickname,
        isTeacherMode
      } = props;
      // t (translation function) — pulled from props with a safe fallback
      var t = props.t || function (k) { return k; };

      // -- Theme Detection (must precede theme-dependent effects) --
      var _stemTheme = (_themeProp === 'light' || _themeProp === 'dark' || _themeProp === 'contrast')
        ? _themeProp
        : null;
      if (!_stemTheme) {
        try {
          _stemTheme = window.AlloStemTheme && window.AlloStemTheme.currentTheme
            ? window.AlloStemTheme.currentTheme()
            : null;
        } catch (e) { _stemTheme = null; }
      }
      if (!_stemTheme) _stemTheme = 'light';
      var isDark = _stemTheme === 'dark';
      var isContrast = _stemTheme === 'contrast';

      // ── STEAM Lab Global Sound Effect Helper ──
      var _stemAudioCtx = null;
      function stemBeep(freq, dur, vol) {
        try {
          if (!_stemAudioCtx) _stemAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
          var osc = _stemAudioCtx.createOscillator();
          var gain = _stemAudioCtx.createGain();
          osc.connect(gain); gain.connect(_stemAudioCtx.destination);
          osc.frequency.value = freq; osc.type = 'sine';
          gain.gain.value = vol || 0.12;
          gain.gain.exponentialRampToValueAtTime(0.001, _stemAudioCtx.currentTime + (dur || 0.15));
          osc.start(); osc.stop(_stemAudioCtx.currentTime + (dur || 0.15));
        } catch (e) { }
      }
      function stemCelebrate() {
        stemBeep(523, 0.15, 0.14); // C5
        setTimeout(function () { stemBeep(659, 0.15, 0.14); }, 100); // E5
        setTimeout(function () { stemBeep(784, 0.25, 0.16); }, 200); // G5
      }

      // _reduceMotion declared below (L~460) — single source of truth

      // ── Floating +XP Popup State ──
      var _stemXpPopups = React.useRef([]);
      var _stemXpPopupCounter = React.useRef(0);
      var [_xpPopupTick, _setXpPopupTick] = React.useState(0);
      // XP badge pulse state
      var [_xpBadgePulse, _setXpBadgePulse] = React.useState(false);
      // Plugin-load progress tick — bumped by the allo-plugins-changed event the
      // lazy-loader fires after each stem_tool_*.js script finishes registering.
      // Forces the tile grid to re-render as plugins stream in on first hub-open.
      var [_pluginProgressTick, _setPluginProgressTick] = React.useState(0);
      React.useEffect(function() {
        var handler = function(e) {
          if (e && e.detail && e.detail.label !== 'Stem') return;
          // Defer out of any in-progress React render. dispatchEvent runs its
          // listeners synchronously, so if 'allo-plugins-changed' is ever
          // dispatched while React is rendering AlloFlowContent, a direct
          // setState here updates StemLabModal mid-render → "Cannot update a
          // component while rendering a different component". This tick only
          // refreshes the tool-tile grid as plugins stream in, so a microtask
          // defer is imperceptible and render-safe.
          Promise.resolve().then(function() { _setPluginProgressTick(function(t) { return t + 1; }); });
        };
        window.addEventListener('allo-plugins-changed', handler);
        return function() { window.removeEventListener('allo-plugins-changed', handler); };
      }, []);

      // Life Skills Lab Global State
      var [stemState, setStemState] = React.useState({});
      // d / upd — generic state shorthand used by the category filter and quest builder
      var d = stemState;
      var upd = function(key, val) { setStemState(function(prev) { var next = Object.assign({}, prev); next[key] = val; return next; }); };

      // ── Inject XP CSS Keyframes ──
      React.useEffect(function () {
        if (document.getElementById('stem-xp-keyframes')) return;
        var s = document.createElement('style');
        s.id = 'stem-xp-keyframes';
        s.textContent = [
          '@keyframes stemXpShimmer { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }',
          '@keyframes stemXpBadgePulse { 0% { transform: scale(1); } 40% { transform: scale(1.18); } 100% { transform: scale(1); } }',
          '@keyframes stemXpFloat { 0% { opacity: 1; transform: translateX(-50%) translateY(0); } 100% { opacity: 0; transform: translateX(-50%) translateY(-38px); } }',
          // WCAG 2.4.7: Focus visible outlines for keyboard navigation
          '.stem-lab-modal button:focus-visible, .stem-lab-modal input:focus-visible, .stem-lab-modal select:focus-visible, .stem-lab-modal textarea:focus-visible, .stem-lab-modal [tabindex]:focus-visible { outline: 2px solid #6366f1 !important; outline-offset: 2px !important; border-radius: 4px; }',
          '.stem-lab-modal canvas:focus-visible { outline: 3px solid #6366f1 !important; outline-offset: 2px !important; }',
          // Skip mouse users — only show outlines for keyboard
          '.stem-lab-modal :focus:not(:focus-visible) { outline: none !important; }',
          // WCAG 2.3.3: Reduced motion — disable ALL animations for users who prefer
          '@media (prefers-reduced-motion: reduce) { .stem-lab-modal *, .stem-lab-modal *::before, .stem-lab-modal *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }',
          // WCAG 1.4.11: Ensure focus indicators have adequate contrast on all backgrounds
          '.stem-lab-modal [role="button"]:focus-visible { outline: 2px solid #6366f1 !important; outline-offset: 2px !important; }',
          // Percentage, not a viewport unit. The parent (.stem-lab-modal) is
          // `fixed inset-0`, so 100% is exactly the box this shell must fit, in
          // every environment. dvh/vh resolve against the DYNAMIC VIEWPORT, which
          // a nested iframe (Gemini Canvas is one) and any transformed ancestor
          // both report differently — and when it comes back larger than the frame
          // the shell overflows while its own overflow:hidden clips the excess with
          // no scrollbar, so no STEM tool can be scrolled. 16px = the m-2 margins.
          '.stem-lab-modal-shell { max-height: calc(100% - 16px); }',
          '.stem-lab-scroll-region { overscroll-behavior: contain; scrollbar-gutter: stable; }',
          '.stem-lab-topbar { gap: 16px; }',
          '.stem-lab-brand-block, .stem-lab-actionbar { min-width: 0; }',
          '.stem-lab-title-lockup { min-width: 0; }',
          '.stem-lab-title-lockup p { max-width: 520px; }',
          '.stem-lab-actionbar button { min-height: 34px; }',
          '.stem-tool-catalog { width: min(100%, 1120px); }',
          '.stem-tool-searchbar { position: sticky; top: 0; z-index: 12; padding-top: 8px; padding-bottom: 10px; backdrop-filter: blur(10px); }',
          '.stem-catalog-context { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: -4px 0 12px; flex-wrap: wrap; }',
          '.stem-catalog-status { display: inline-flex; align-items: center; gap: 8px; min-height: 28px; padding: 0 10px; border-radius: 999px; font-size: 11px; font-weight: 900; border: 1px solid rgba(148,163,184,0.28); }',
          '.stem-catalog-clear { display: inline-flex; align-items: center; gap: 6px; min-height: 28px; padding: 0 10px; border-radius: 999px; font-size: 11px; font-weight: 900; border: 1px solid rgba(99,102,241,0.35); }',
          '.stem-catalog-quickbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 0 0 12px; }',
          '.stem-catalog-row-label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0; margin-right: 2px; }',
          '.stem-catalog-chip { display: inline-flex; align-items: center; gap: 6px; min-height: 34px; padding: 0 11px; border-radius: 999px; font-size: 11px; font-weight: 900; border: 1px solid rgba(148,163,184,0.34); box-shadow: 0 6px 14px rgba(15,23,42,0.06); transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease; }',
          '.stem-catalog-chip:hover { transform: translateY(-1px); box-shadow: 0 10px 18px rgba(15,23,42,0.10); border-color: rgba(99,102,241,0.55); }',
          '.stem-catalog-chip-icon { font-size: 14px; line-height: 1; }',
          '.stem-tool-matchmaker { margin: 0 0 14px; padding: 12px; border-radius: 14px; border: 1px solid rgba(99,102,241,0.30); box-shadow: 0 10px 24px rgba(15,23,42,0.07); }',
          '.stem-tool-matchmaker-form { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: stretch; }',
          '.stem-tool-matchmaker-input { min-height: 42px; border-radius: 10px; padding: 0 12px; font-size: 13px; font-weight: 700; border: 1px solid rgba(148,163,184,0.45); outline: none; }',
          '.stem-tool-matchmaker-button { min-height: 42px; padding: 0 14px; border-radius: 10px; font-size: 12px; font-weight: 900; border: 1px solid rgba(99,102,241,0.45); display: inline-flex; align-items: center; justify-content: center; gap: 7px; white-space: nowrap; }',
          '.stem-tool-matchmaker-status { margin-top: 8px; font-size: 11px; font-weight: 800; }',
          '.stem-tool-ai-suggestions { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; margin-top: 10px; }',
          '.stem-tool-ai-suggestion { text-align: left; min-height: 84px; padding: 10px 11px; border-radius: 12px; border: 1px solid rgba(148,163,184,0.34); transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease; }',
          '.stem-tool-ai-suggestion:hover { transform: translateY(-1px); box-shadow: 0 12px 22px rgba(15,23,42,0.12); border-color: rgba(99,102,241,0.55); }',
          '.stem-tool-ai-suggestion-title { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 950; margin-bottom: 4px; }',
          '.stem-tool-ai-suggestion-reason { font-size: 11px; line-height: 1.35; font-weight: 700; }',
          '.stem-tool-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; align-items: stretch; }',
          '.stem-tool-category { grid-column: 1 / -1; }',
          '.stem-tool-card { min-height: 148px; border-radius: 14px !important; background-color: var(--stem-card-surface) !important; border-color: var(--stem-card-border) !important; border-top: 4px solid var(--stem-card-accent) !important; box-shadow: 0 8px 20px rgba(15,23,42,0.06); display: flex; flex-direction: column; }',
          '.stem-tool-card:hover { background-color: var(--stem-card-hover) !important; border-color: var(--stem-card-accent) !important; transform: translateY(-2px) !important; box-shadow: 0 16px 28px rgba(15,23,42,0.12) !important; }',
          '.stem-tool-card:focus-visible { outline: 3px solid var(--stem-card-focus) !important; outline-offset: 3px !important; }',
          '.stem-tool-card-icon { width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center; border-radius: 12px; background-color: var(--stem-card-icon-bg); }',
          '.stem-tool-card h4 { color: var(--stem-card-title) !important; line-height: 1.25; }',
          '.stem-tool-card p { color: var(--stem-card-desc) !important; line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }',
          '.stem-active-toolbar { position: sticky; top: 0; z-index: 100; flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 24px; border-bottom: 1px solid rgba(148,163,184,0.24); backdrop-filter: blur(12px); }',
          '.stem-active-tool-main { display: flex; align-items: center; gap: 10px; min-width: 0; }',
          '.stem-active-tool-icon { width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; font-size: 18px; background: rgba(99,102,241,0.10); }',
          '.stem-active-tool-title { min-width: 0; }',
          '.stem-active-tool-title h3 { margin: 0; font-size: 14px; line-height: 1.2; font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
          '.stem-active-tool-title p { margin: 2px 0 0; font-size: 11px; line-height: 1.25; }',
          '.stem-active-tool-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }',
          '.stem-active-tool-back { display: inline-flex; align-items: center; gap: 7px; min-height: 34px; padding: 0 12px; border-radius: 10px; border: 1px solid rgba(99,102,241,0.35); font-size: 12px; font-weight: 900; }',
          '.stem-active-tool-hint { font-size: 11px; white-space: nowrap; }',
          '@media (max-width: 640px) { .stem-lab-modal-shell { margin: 0 !important; border-radius: 0 !important; max-width: 100vw !important; max-height: 100% !important; } .stem-lab-topbar { padding: 14px 14px 16px 88px !important; align-items: flex-start !important; flex-wrap: wrap !important; } .stem-lab-brand-block { flex: 1 1 180px !important; gap: 8px !important; } .stem-lab-brand-icon, .stem-lab-keyboard-badge, .stem-lab-xp-badge { display: none !important; } .stem-lab-title-lockup h2 { font-size: 26px !important; line-height: 1.05 !important; max-width: 176px; } .stem-lab-title-lockup p { font-size: 12.5px !important; line-height: 1.35 !important; max-width: 178px; } .stem-lab-actionbar { flex: 0 0 auto !important; margin-left: 0 !important; margin-top: 4px !important; gap: 2px !important; max-width: 184px; flex-wrap: wrap; } .stem-lab-actionbar button { box-sizing: border-box; flex: 0 0 40px !important; width: 40px; min-width: 40px; max-width: 40px; height: 40px; min-height: 40px; padding: 0 !important; justify-content: center; background: rgba(255,255,255,0.14); } .stem-lab-actionbar button span, .stem-lab-subject-select { display: none !important; } .stem-lab-tablist { padding-left: 0 !important; padding-right: 0 !important; } .stem-lab-tablist > button { flex: 1 1 0; justify-content: center; padding: 12px 8px !important; } .stem-active-toolbar { padding: 10px 12px; gap: 10px; } .stem-active-tool-icon { width: 32px; height: 32px; } .stem-active-tool-title p, .stem-active-tool-hint { display: none; } .stem-active-tool-back { min-height: 36px; padding: 0 10px; } .stem-tool-catalog { width: 100%; } .stem-tool-searchbar { position: static; padding-top: 0; } .stem-catalog-context { align-items: flex-start; margin-top: 0; } .stem-catalog-status, .stem-catalog-clear { min-height: 32px; } .stem-catalog-chip { min-height: 38px; font-size: 12px; padding: 0 12px; } .stem-tool-matchmaker-form, .stem-tool-ai-suggestions { grid-template-columns: 1fr; } .stem-tool-matchmaker-button { width: 100%; } .stem-tool-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; } .stem-tool-card { min-height: 220px; padding: 22px !important; } .stem-tool-card h4 { font-size: 20px !important; line-height: 1.25; } .stem-tool-card p { font-size: 16px !important; line-height: 1.55; } }',
          '@media (max-width: 640px) { .stem-lab-modal-shell { max-height: 100% !important; } .stem-lab-scroll-region { scrollbar-gutter: auto; } }',
          '@media (max-width: 430px) { .stem-lab-topbar { padding-left: 96px !important; } .stem-tool-grid { grid-template-columns: 1fr; } .stem-tool-card { min-height: auto; } }'
        ].join('\n');
        document.head.appendChild(s);
        return function () { var el = document.getElementById('stem-xp-keyframes'); if (el) el.remove(); };
      }, []);

      // ── Theme-aware CSS overrides for dark mode & high contrast ──
      React.useEffect(function () {
        var id = 'stem-theme-overrides';
        var existing = document.getElementById(id);
        if (existing) existing.remove();
        if (!isDark && !isContrast) return;
        var s = document.createElement('style');
        s.id = id;
        if (isDark) {
          s.textContent = [
            '[data-stem-lab] .bg-white { background-color: #1e293b !important; color: #f1f5f9 !important; }',
            '[data-stem-lab] [class~="bg-white/60"], [data-stem-lab] [class~="bg-white/70"], [data-stem-lab] [class~="bg-white/75"], [data-stem-lab] [class~="bg-white/80"], [data-stem-lab] [class~="bg-white/85"], [data-stem-lab] [class~="bg-white/90"], [data-stem-lab] [class~="bg-white/95"], [data-stem-lab] [class~="bg-indigo-50/60"], [data-stem-lab] [class~="bg-indigo-50/70"], [data-stem-lab] [class~="bg-indigo-50/80"], [data-stem-lab] [class~="bg-emerald-50/60"], [data-stem-lab] [class~="bg-emerald-50/70"], [data-stem-lab] [class~="bg-emerald-50/80"], [data-stem-lab] [class~="bg-amber-50/60"], [data-stem-lab] [class~="bg-amber-50/70"], [data-stem-lab] [class~="bg-amber-50/75"], [data-stem-lab] [class~="bg-amber-50/80"], [data-stem-lab] [class~="bg-violet-50/60"], [data-stem-lab] [class~="bg-violet-50/70"], [data-stem-lab] [class~="bg-violet-50/80"], [data-stem-lab] [class~="bg-sky-50/65"], [data-stem-lab] [class~="bg-sky-50/70"], [data-stem-lab] [class~="bg-sky-50/80"], [data-stem-lab] [class~="bg-cyan-50/60"], [data-stem-lab] [class~="bg-cyan-50/65"], [data-stem-lab] [class~="bg-cyan-50/70"], [data-stem-lab] [class~="bg-slate-50/70"], [data-stem-lab] [class~="bg-slate-50/95"], [data-stem-lab] [class~="bg-blue-50/70"], [data-stem-lab] [class~="bg-fuchsia-50/60"], [data-stem-lab] [class~="bg-fuchsia-50/70"], [data-stem-lab] [class~="bg-purple-50/60"], [data-stem-lab] [class~="bg-purple-50/70"], [data-stem-lab] [class~="bg-purple-50/80"], [data-stem-lab] [class~="bg-rose-50/60"], [data-stem-lab] [class~="bg-rose-50/70"], [data-stem-lab] [class~="bg-rose-50/80"], [data-stem-lab] [class~="bg-red-50/70"], [data-stem-lab] [class~="bg-teal-50/70"] { background-color: #1e293b !important; color: #f1f5f9 !important; }',
            '[data-stem-lab] .bg-slate-50 { background-color: #0f172a !important; color: #f1f5f9 !important; }',
            '[data-stem-lab] .bg-slate-100 { background-color: #1e293b !important; }',
            '[data-stem-lab] .bg-slate-200 { background-color: #334155 !important; }',
            '[data-stem-lab] .text-slate-900, [data-stem-lab] .text-slate-800, [data-stem-lab] .text-slate-700 { color: #f1f5f9 !important; }',
            '[data-stem-lab] .text-slate-600 { color: #cbd5e1 !important; }',
            '[data-stem-lab] .text-slate-500 { color: #94a3b8 !important; }',
            '[data-stem-lab] .text-stone-900, [data-stem-lab] .text-stone-800, [data-stem-lab] .text-stone-700 { color: #f5f5f4 !important; }',
            '[data-stem-lab] .text-stone-600 { color: #d6d3d1 !important; }',
            '[data-stem-lab] .border-slate-200 { border-color: #475569 !important; }',
            '[data-stem-lab] .border-slate-100 { border-color: #334155 !important; }',
            '[data-stem-lab] .border-slate-300 { border-color: #475569 !important; }',
            '[data-stem-lab] .border-stone-200 { border-color: #78716c !important; }',
            '[data-stem-lab] .bg-indigo-50 { background-color: #312e81 !important; }',
            '[data-stem-lab] .bg-blue-50 { background-color: #1e3a5f !important; }',
            '[data-stem-lab] .bg-green-50 { background-color: #14532d !important; }',
            '[data-stem-lab] .bg-yellow-50 { background-color: #422006 !important; }',
            '[data-stem-lab] .bg-red-50 { background-color: #450a0a !important; }',
            '[data-stem-lab] .bg-purple-50 { background-color: #3b0764 !important; }',
            '[data-stem-lab] .bg-emerald-50 { background-color: #064e3b !important; }',
            '[data-stem-lab] .bg-gradient-to-br.from-slate-50 { background: #0f172a !important; }',
            // ── Fill the theme-remap gaps that left "a few panels" bright in dark mode ──
            // (1) solid light-tint cards missing above (amber/orange/cyan/… + the -100 tints)
            '[data-stem-lab] .bg-amber-50, [data-stem-lab] .bg-orange-50, [data-stem-lab] .bg-amber-100, [data-stem-lab] .bg-orange-100, [data-stem-lab] .bg-yellow-100 { background-color: #422006 !important; }',
            '[data-stem-lab] .bg-cyan-50, [data-stem-lab] .bg-sky-50, [data-stem-lab] .bg-blue-100, [data-stem-lab] .bg-indigo-100, [data-stem-lab] .bg-cyan-100, [data-stem-lab] .bg-sky-100 { background-color: #1e3a5f !important; }',
            '[data-stem-lab] .bg-teal-50, [data-stem-lab] .bg-lime-50, [data-stem-lab] .bg-green-100, [data-stem-lab] .bg-emerald-100, [data-stem-lab] .bg-teal-100 { background-color: #064e3b !important; }',
            '[data-stem-lab] .bg-rose-50, [data-stem-lab] .bg-pink-50, [data-stem-lab] .bg-red-100, [data-stem-lab] .bg-rose-100, [data-stem-lab] .bg-pink-100 { background-color: #4c0519 !important; }',
            '[data-stem-lab] .bg-violet-50, [data-stem-lab] .bg-fuchsia-50, [data-stem-lab] .bg-purple-100, [data-stem-lab] .bg-violet-100, [data-stem-lab] .bg-fuchsia-100 { background-color: #3b0764 !important; }',
            '[data-stem-lab] .bg-gray-50, [data-stem-lab] .bg-gray-100, [data-stem-lab] .bg-zinc-50, [data-stem-lab] .bg-neutral-50, [data-stem-lab] .bg-stone-50 { background-color: #111827 !important; }',
            // (2) gradient cards: any light `from-*-50` start → neutral dark (only .from-slate-50 was covered).
            //     `~=` matches the exact class token so `from-*-500` gradients (e.g. buttons) are untouched.
            '[data-stem-lab] [class~="from-white"], [data-stem-lab] [class~="from-slate-50"], [data-stem-lab] [class~="from-gray-50"], [data-stem-lab] [class~="from-zinc-50"], [data-stem-lab] [class~="from-amber-50"], [data-stem-lab] [class~="from-orange-50"], [data-stem-lab] [class~="from-yellow-50"], [data-stem-lab] [class~="from-blue-50"], [data-stem-lab] [class~="from-indigo-50"], [data-stem-lab] [class~="from-sky-50"], [data-stem-lab] [class~="from-cyan-50"], [data-stem-lab] [class~="from-green-50"], [data-stem-lab] [class~="from-emerald-50"], [data-stem-lab] [class~="from-teal-50"], [data-stem-lab] [class~="from-lime-50"], [data-stem-lab] [class~="from-purple-50"], [data-stem-lab] [class~="from-violet-50"], [data-stem-lab] [class~="from-fuchsia-50"], [data-stem-lab] [class~="from-pink-50"], [data-stem-lab] [class~="from-rose-50"] { background-image: none !important; background-color: #1e293b !important; }',
            // (3) lighten dark accent text (600–800) so headings/values stay legible on the darkened cards.
            '[data-stem-lab] .text-blue-800, [data-stem-lab] .text-blue-700, [data-stem-lab] .text-blue-600 { color: #93c5fd !important; }',
            '[data-stem-lab] .text-indigo-800, [data-stem-lab] .text-indigo-700, [data-stem-lab] .text-indigo-600 { color: #a5b4fc !important; }',
            '[data-stem-lab] .text-sky-800, [data-stem-lab] .text-sky-700, [data-stem-lab] .text-sky-600, [data-stem-lab] .text-cyan-800, [data-stem-lab] .text-cyan-700, [data-stem-lab] .text-cyan-600 { color: #7dd3fc !important; }',
            '[data-stem-lab] .text-amber-800, [data-stem-lab] .text-amber-700, [data-stem-lab] .text-amber-600, [data-stem-lab] .text-yellow-800, [data-stem-lab] .text-yellow-700, [data-stem-lab] .text-yellow-600 { color: #fcd34d !important; }',
            '[data-stem-lab] .text-orange-800, [data-stem-lab] .text-orange-700, [data-stem-lab] .text-orange-600 { color: #fdba74 !important; }',
            '[data-stem-lab] .text-green-800, [data-stem-lab] .text-green-700, [data-stem-lab] .text-green-600, [data-stem-lab] .text-emerald-800, [data-stem-lab] .text-emerald-700, [data-stem-lab] .text-emerald-600, [data-stem-lab] .text-teal-800, [data-stem-lab] .text-teal-700, [data-stem-lab] .text-teal-600 { color: #6ee7b7 !important; }',
            '[data-stem-lab] .text-purple-800, [data-stem-lab] .text-purple-700, [data-stem-lab] .text-purple-600, [data-stem-lab] .text-violet-800, [data-stem-lab] .text-violet-700, [data-stem-lab] .text-violet-600, [data-stem-lab] .text-fuchsia-700, [data-stem-lab] .text-fuchsia-600 { color: #c4b5fd !important; }',
            '[data-stem-lab] .text-rose-800, [data-stem-lab] .text-rose-700, [data-stem-lab] .text-rose-600, [data-stem-lab] .text-pink-800, [data-stem-lab] .text-pink-700, [data-stem-lab] .text-pink-600, [data-stem-lab] .text-red-700, [data-stem-lab] .text-red-600 { color: #fca5a5 !important; }',
            '[data-stem-lab] input, [data-stem-lab] textarea, [data-stem-lab] select { background-color: #0f172a !important; color: #f1f5f9 !important; border-color: #475569 !important; }',
            '[data-stem-lab] .stem-tool-card h4 { color: #f1f5f9 !important; }',
            '[data-stem-lab] .stem-tool-card p { color: #cbd5e1 !important; }',
            '[data-stem-lab] .stem-tool-card:focus-visible { outline: 3px solid #fbbf24 !important; outline-offset: 3px !important; }',
          ].join('\n');
        } else if (isContrast) {
          s.textContent = [
            '[data-stem-lab] .bg-white, [data-stem-lab] .bg-slate-50, [data-stem-lab] .bg-slate-100 { background-color: #000000 !important; color: #ffffff !important; }',
            '[data-stem-lab] [class~="bg-white/60"], [data-stem-lab] [class~="bg-white/70"], [data-stem-lab] [class~="bg-white/75"], [data-stem-lab] [class~="bg-white/80"], [data-stem-lab] [class~="bg-white/85"], [data-stem-lab] [class~="bg-white/90"], [data-stem-lab] [class~="bg-white/95"], [data-stem-lab] [class~="bg-indigo-50/60"], [data-stem-lab] [class~="bg-indigo-50/70"], [data-stem-lab] [class~="bg-indigo-50/80"], [data-stem-lab] [class~="bg-emerald-50/60"], [data-stem-lab] [class~="bg-emerald-50/70"], [data-stem-lab] [class~="bg-emerald-50/80"], [data-stem-lab] [class~="bg-amber-50/60"], [data-stem-lab] [class~="bg-amber-50/70"], [data-stem-lab] [class~="bg-amber-50/75"], [data-stem-lab] [class~="bg-amber-50/80"], [data-stem-lab] [class~="bg-violet-50/60"], [data-stem-lab] [class~="bg-violet-50/70"], [data-stem-lab] [class~="bg-violet-50/80"], [data-stem-lab] [class~="bg-sky-50/65"], [data-stem-lab] [class~="bg-sky-50/70"], [data-stem-lab] [class~="bg-sky-50/80"], [data-stem-lab] [class~="bg-cyan-50/60"], [data-stem-lab] [class~="bg-cyan-50/65"], [data-stem-lab] [class~="bg-cyan-50/70"], [data-stem-lab] [class~="bg-slate-50/70"], [data-stem-lab] [class~="bg-slate-50/95"], [data-stem-lab] [class~="bg-blue-50/70"], [data-stem-lab] [class~="bg-fuchsia-50/60"], [data-stem-lab] [class~="bg-fuchsia-50/70"], [data-stem-lab] [class~="bg-purple-50/60"], [data-stem-lab] [class~="bg-purple-50/70"], [data-stem-lab] [class~="bg-purple-50/80"], [data-stem-lab] [class~="bg-rose-50/60"], [data-stem-lab] [class~="bg-rose-50/70"], [data-stem-lab] [class~="bg-rose-50/80"], [data-stem-lab] [class~="bg-red-50/70"], [data-stem-lab] [class~="bg-teal-50/70"] { background-color: #000000 !important; color: #ffffff !important; }',
            '[data-stem-lab] .bg-slate-200, [data-stem-lab] .bg-slate-300 { background-color: #1a1a1a !important; color: #ffffff !important; }',
            '[data-stem-lab] .text-slate-900, [data-stem-lab] .text-slate-800, [data-stem-lab] .text-slate-700, [data-stem-lab] .text-slate-600, [data-stem-lab] .text-slate-500, [data-stem-lab] .text-stone-900, [data-stem-lab] .text-stone-800, [data-stem-lab] .text-stone-700, [data-stem-lab] .text-stone-600 { color: #ffffff !important; }',
            '[data-stem-lab] .text-indigo-700, [data-stem-lab] .text-indigo-600, [data-stem-lab] .text-blue-700, [data-stem-lab] .text-blue-600 { color: #fbbf24 !important; }',
            // all other dark accent text → amber (mirror the -50 gap fix for contrast mode)
            '[data-stem-lab] .text-amber-700, [data-stem-lab] .text-amber-600, [data-stem-lab] .text-orange-700, [data-stem-lab] .text-orange-600, [data-stem-lab] .text-green-700, [data-stem-lab] .text-green-600, [data-stem-lab] .text-emerald-700, [data-stem-lab] .text-emerald-600, [data-stem-lab] .text-teal-700, [data-stem-lab] .text-teal-600, [data-stem-lab] .text-cyan-700, [data-stem-lab] .text-cyan-600, [data-stem-lab] .text-sky-700, [data-stem-lab] .text-sky-600, [data-stem-lab] .text-purple-700, [data-stem-lab] .text-purple-600, [data-stem-lab] .text-violet-700, [data-stem-lab] .text-violet-600, [data-stem-lab] .text-rose-700, [data-stem-lab] .text-rose-600, [data-stem-lab] .text-pink-700, [data-stem-lab] .text-pink-600, [data-stem-lab] .text-red-700, [data-stem-lab] .text-red-600 { color: #fbbf24 !important; }',
            '[data-stem-lab] .border-slate-200, [data-stem-lab] .border-slate-100, [data-stem-lab] .border-slate-300, [data-stem-lab] .border-stone-200 { border-color: #fbbf24 !important; }',
            '[data-stem-lab] .bg-indigo-50, [data-stem-lab] .bg-blue-50, [data-stem-lab] .bg-green-50, [data-stem-lab] .bg-yellow-50, [data-stem-lab] .bg-red-50, [data-stem-lab] .bg-purple-50, [data-stem-lab] .bg-emerald-50, [data-stem-lab] .bg-amber-50, [data-stem-lab] .bg-orange-50, [data-stem-lab] .bg-cyan-50, [data-stem-lab] .bg-sky-50, [data-stem-lab] .bg-teal-50, [data-stem-lab] .bg-lime-50, [data-stem-lab] .bg-rose-50, [data-stem-lab] .bg-pink-50, [data-stem-lab] .bg-violet-50, [data-stem-lab] .bg-fuchsia-50, [data-stem-lab] .bg-gray-50, [data-stem-lab] .bg-stone-50 { background-color: #000000 !important; border: 2px solid #fbbf24 !important; }',
            // gradient cards → solid black + amber border in contrast mode
            '[data-stem-lab] [class~="from-white"], [data-stem-lab] [class~="from-slate-50"], [data-stem-lab] [class~="from-gray-50"], [data-stem-lab] [class~="from-amber-50"], [data-stem-lab] [class~="from-orange-50"], [data-stem-lab] [class~="from-yellow-50"], [data-stem-lab] [class~="from-blue-50"], [data-stem-lab] [class~="from-indigo-50"], [data-stem-lab] [class~="from-sky-50"], [data-stem-lab] [class~="from-cyan-50"], [data-stem-lab] [class~="from-green-50"], [data-stem-lab] [class~="from-emerald-50"], [data-stem-lab] [class~="from-teal-50"], [data-stem-lab] [class~="from-lime-50"], [data-stem-lab] [class~="from-purple-50"], [data-stem-lab] [class~="from-violet-50"], [data-stem-lab] [class~="from-fuchsia-50"], [data-stem-lab] [class~="from-pink-50"], [data-stem-lab] [class~="from-rose-50"] { background-image: none !important; background-color: #000000 !important; border: 2px solid #fbbf24 !important; }',
            '[data-stem-lab] input, [data-stem-lab] textarea, [data-stem-lab] select { background-color: #000000 !important; color: #ffffff !important; border: 2px solid #fbbf24 !important; }',
            '[data-stem-lab] button { border: 1px solid #fbbf24 !important; }',
            '[data-stem-lab] .stem-tool-card { background-color: #000000 !important; border: 2px solid #fbbf24 !important; border-top-width: 4px !important; }',
            '[data-stem-lab] .stem-tool-card h4 { color: #fbbf24 !important; }',
            '[data-stem-lab] .stem-tool-card p { color: #ffffff !important; }',
            '[data-stem-lab] .stem-tool-card:focus-visible { outline: 3px solid #fbbf24 !important; outline-offset: 3px !important; }',
          ].join('\n');
        }
        document.head.appendChild(s);
        return function () { var el = document.getElementById(id); if (el) el.remove(); };
      }, [isDark, isContrast]);

      // ── WCAG 1.4.3: Minimum contrast fixes for standard mode ──
      // text-slate-400 (#94a3b8) on white (#fff) = 2.97:1 ratio — FAILS AA.
      // Upgrading to text-slate-500 (#64748b) = 4.63:1 ratio — PASSES AA.
      React.useEffect(function() {
        if (isDark || isContrast) return; // Dark/HC modes handle their own contrast
        var id = 'stem-contrast-fix';
        if (document.getElementById(id)) return;
        var s = document.createElement('style');
        s.id = id;
        s.textContent = [
          // Upgrade low-contrast slate-400 text to slate-500 (4.63:1 on white)
          '[data-stem-lab] .text-slate-400 { color: #64748b !important; }',
          '[data-stem-lab] .text-\\[10px\\].text-slate-400 { color: #64748b !important; }',
          // Upgrade low-contrast [9px] and [8px] text (small text needs 4.5:1)
          '[data-stem-lab] .text-\\[9px\\] { font-size: 10px !important; }',
          '[data-stem-lab] .text-\\[8px\\] { font-size: 9px !important; }',
          // Ensure slate-500 meets AA on light backgrounds
          '[data-stem-lab] .text-slate-500 { color: #475569 !important; }',
          // Fix rose-400 on white (used in vocab bars) — upgrade to rose-500
          '[data-stem-lab] .text-rose-400 { color: #e11d48 !important; }',
          // Fix amber-400 on white — upgrade to amber-600
          '[data-stem-lab] .text-amber-400 { color: #d97706 !important; }',
          // Fix cyan-400 on white — upgrade to cyan-600
          '[data-stem-lab] .text-cyan-400 { color: #0891b2 !important; }',
        ].join('\n');
        document.head.appendChild(s);
        return function() { var el = document.getElementById(id); if (el) el.remove(); };
      }, [isDark, isContrast]);

      // ── Dark-shell text contrast (always-on, scoped to per-tool dark navy wrapper) ──
      // The tool shell at renderTool() forces background:#0f172a on every tool,
      // but Tailwind classes like text-slate-800 stay dark — invisible on dark navy.
      // Trick: make dark text classes inside the shell `color: inherit`, then have
      // each light-bg card set its own dark color so descendants inherit dark.
      // Result: bare headers on the shell → light; headers inside white cards → dark.
      React.useEffect(function() {
        var id = 'stem-tool-shell-contrast';
        if (document.getElementById(id)) return;
        var s = document.createElement('style');
        s.id = id;
        var DARK_TEXT_CLASSES = [
          'text-slate-700','text-slate-800','text-slate-900',
          'text-gray-700','text-gray-800','text-gray-900',
          'text-zinc-700','text-zinc-800','text-zinc-900',
          'text-neutral-700','text-neutral-800','text-neutral-900',
          'text-stone-700','text-stone-800','text-stone-900'
        ];
        var LIGHT_BG_CLASSES = [
          'bg-white',
          'bg-slate-50','bg-slate-100',
          'bg-gray-50','bg-gray-100',
          'bg-zinc-50','bg-neutral-50','bg-stone-50',
          'bg-indigo-50','bg-blue-50','bg-sky-50','bg-cyan-50',
          'bg-teal-50','bg-emerald-50','bg-green-50','bg-lime-50',
          'bg-yellow-50','bg-amber-50','bg-orange-50',
          'bg-red-50','bg-rose-50','bg-pink-50',
          'bg-fuchsia-50','bg-purple-50','bg-violet-50',
          'from-white','from-slate-50','from-blue-50','from-indigo-50',
          'from-purple-50','from-green-50','from-amber-50'
        ];
        var inheritRule = DARK_TEXT_CLASSES.map(function(c) {
          return '[data-stem-tool-shell] .' + c;
        }).join(', ') + ' { color: inherit; }';
        var lightBgRule = LIGHT_BG_CLASSES.map(function(c) {
          return '[data-stem-tool-shell] .' + c;
        }).join(', ') + ' { color: #1e293b; }';
        s.textContent = inheritRule + '\n' + lightBgRule;
        document.head.appendChild(s);
        return function() { var el = document.getElementById(id); if (el) el.remove(); };
      }, []);

      // ── STEAM Lab XP System (per-activity cap: 100 XP) ──
      var stemXpData = (labToolData && labToolData._stemXP) || {};
      function awardStemXP(activityId, points, reason) {
        var _awardedPts = Math.min(points, Math.max(0, 100 - getStemXP(activityId)));
        if (_awardedPts <= 0) return;
        setLabToolData(function (prev) {
          var xpState = Object.assign({}, (prev && prev._stemXP) || {});
          var actData = Object.assign({}, xpState[activityId] || { earned: 0, log: [] });
          var cap = 100;
          var canEarn = Math.max(0, cap - actData.earned);
          var awarded = Math.min(points, canEarn);
          if (awarded <= 0) return prev;
          actData.earned += awarded;
          actData.log = (actData.log || []).concat([{
            pts: awarded, reason: reason || 'Activity', ts: Date.now()
          }]);
          xpState[activityId] = actData;
          // Total XP across all activities
          var total = 0;
          Object.keys(xpState).forEach(function (k) {
            if (k !== '_total' && xpState[k] && typeof xpState[k].earned === 'number') total += xpState[k].earned;
          });
          xpState._total = total;
          return Object.assign({}, prev, { _stemXP: xpState });
        });
        if (addToast) addToast(t('stem.common.u2b50') + _awardedPts + ' XP: ' + (reason || 'STEM activity') + '!', 'success');
        announceToSR('Earned ' + _awardedPts + ' XP for ' + (reason || 'STEM activity'));
        // ── XP Chime (ascending two-note) ──
        stemBeep(523, 0.08, 0.10); // C5
        setTimeout(function () { stemBeep(659, 0.12, 0.10); }, 80); // E5
        // ── Floating +XP Popup ──
        if (!_reduceMotion) {
          _stemXpPopupCounter.current += 1;
          var popupId = _stemXpPopupCounter.current;
          _stemXpPopups.current = _stemXpPopups.current.concat([{ id: popupId, pts: _awardedPts, ts: Date.now() }]);
          _setXpPopupTick(function (t) { return t + 1; });
          setTimeout(function () {
            _stemXpPopups.current = _stemXpPopups.current.filter(function (p) { return p.id !== popupId; });
            _setXpPopupTick(function (t) { return t + 1; });
          }, 1400);
        }
        // ── Badge Pulse ──
        _setXpBadgePulse(true);
        setTimeout(function () { _setXpBadgePulse(false); }, 600);
      }
      function getStemXP(activityId) {
        return (stemXpData[activityId] && stemXpData[activityId].earned) || 0;
      }
      function getStemXPCap(activityId) {
        return 100 - getStemXP(activityId);
      }
      var totalStemXP = stemXpData._total || 0;

      // ── AI Helper Functions (powered by main app's callGemini) ──
      var _aiPending = {};
      var _stemGrade = gradeLevel || '5th Grade';

      // AI Hints: default OFF, teacher-controlled. localStorage mirror so the
      // header toggle re-renders. When OFF, getHint is a no-op → ZERO LLM traffic.
      var [_aiHintsOn, _setAiHintsOn] = React.useState(function () {
        try { return localStorage.getItem('alloflow_stem_ai_hints') === 'on'; } catch (e) { return false; }
      });
      // Per-question hint ledger (one AI hint per question, per session).
      var _hintLedger = React.useRef({});

      // The SINGLE guarded entry point for AI hints. Tools call ctx.getHint(...).
      // Enforces, in order: feature ON, AI available, >=2 genuine attempts
      // (productive struggle), 1 hint per question, concurrency, and a reveal-check
      // that suppresses any hint leaking the answer. The student only ever sees a
      // labeled "AI may be imperfect" string. No PII is sent (question + answers only).
      function getHint(tool, question, wrongAnswer, correctAnswer, attemptCount, displayFn) {
        if (!_aiHintsOn) return;                 // gate OFF → zero LLM traffic
        if (!callGemini) return;                 // no AI surface available
        if ((attemptCount || 0) < 2) {           // try-again-before-hint (productive struggle)
          if (addToast) addToast('Give it another try first — a hint unlocks after a couple of attempts.', 'info');
          return;
        }
        var key = String(tool) + '::' + String(question);
        if (_hintLedger.current[key]) {          // one AI hint per question
          if (addToast) addToast('You already used your hint for this one — give it a go!', 'info');
          return;
        }
        if (_aiPending[tool + '_hint']) return;  // concurrency
        _aiPending[tool + '_hint'] = true;
        var prompt = stemHintBuildPrompt(_stemGrade, tool, question, wrongAnswer, correctAnswer);
        callGemini(prompt).then(function (hint) {
          _aiPending[tool + '_hint'] = false;
          if (!hint) return;
          if (stemHintRevealsAnswer(hint, correctAnswer)) {  // reveal-check backstop
            hint = 'Re-read the question and focus on the key idea it is testing — check each step and your units rather than the final number.';
          }
          _hintLedger.current[key] = true;
          var labeled = '💡 ' + hint + '  — AI hint, may be imperfect; check it against your own reasoning.';
          if (typeof displayFn === 'function') { try { displayFn(labeled); } catch (e) { if (addToast) addToast(labeled, 'info'); } }
          else if (addToast) addToast(labeled, 'info');
        }).catch(function () { _aiPending[tool + '_hint'] = false; });
      }



      var [_stemToolSearch, _setStemToolSearch] = React.useState('');
      var [_stemToolInterest, _setStemToolInterest] = React.useState('');
      var [_stemToolSuggesting, _setStemToolSuggesting] = React.useState(false);
      var [_stemToolSuggestions, _setStemToolSuggestions] = React.useState([]);
      var [_stemToolSuggestError, _setStemToolSuggestError] = React.useState('');
      var _stemToolSuggestRequestRef = React.useRef(0);
      var [_recentStemToolIds, _setRecentStemToolIds] = React.useState(function () {
        try {
          var saved = JSON.parse(localStorage.getItem('alloflow_stem_recent_tools') || '[]');
          return Array.isArray(saved) ? saved.filter(Boolean).slice(0, 5) : [];
        } catch (e) { return []; }
      });
      function _rememberStemToolUse(id) {
        if (!id) return;
        _setRecentStemToolIds(function (prev) {
          var next = [id].concat((prev || []).filter(function (tid) { return tid && tid !== id; })).slice(0, 5);
          try { localStorage.setItem('alloflow_stem_recent_tools', JSON.stringify(next)); } catch (e) {}
          return next;
        });
      }
      function _openStemTool(id, label) {
        if (!id) return;
        try {
          if (typeof window.__alloEnsureStemPluginLoaded === 'function') window.__alloEnsureStemPluginLoaded(id);
        } catch (e) {}
        setStemLabTool(id);
        _rememberStemToolUse(id);
        _setStemToolSearch('');
        upd('_categoryFilter', '');
        setTimeout(function() {
          var root = _stemDialogRef.current;
          var contentArea = root ? root.querySelector('[data-stem-scroll-region]') : null;
          if (contentArea) contentArea.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
        if (typeof announceToSR === 'function') announceToSR('Opening ' + (label || _formatStemToolId(id)));
      }
      function _stemToolCatalogText(tool) {
        if (!tool) return '';
        return [
          tool.id,
          tool.label,
          tool.desc,
          tool.description,
          tool.category,
          Array.isArray(tool.aliases) ? tool.aliases.join(' ') : '',
          Array.isArray(tool.searchAliases) ? tool.searchAliases.join(' ') : ''
        ].filter(Boolean).join(' ').toLowerCase();
      }
      function _extractStemSuggestionJson(raw) {
        var txt = '';
        if (raw == null) return null;
        if (typeof raw === 'string') txt = raw;
        else if (typeof raw.text === 'string') txt = raw.text;
        else if (typeof raw.content === 'string') txt = raw.content;
        else {
          try { txt = JSON.stringify(raw); } catch (e) { txt = String(raw); }
        }
        txt = txt.replace(/```json/gi, '```').replace(/```/g, '').trim();
        var start = txt.indexOf('[');
        var end = txt.lastIndexOf(']');
        if (start < 0 || end <= start) return null;
        try { return JSON.parse(txt.slice(start, end + 1)); } catch (e2) { return null; }
      }
      function _normalizeStemSuggestions(items, tools) {
        var byId = {};
        var byLabel = {};
        tools.forEach(function (tool) {
          byId[String(tool.id || '').toLowerCase()] = tool;
          byLabel[String(tool.label || '').toLowerCase()] = tool;
        });
        var seen = {};
        var out = [];
        (Array.isArray(items) ? items : []).forEach(function (item) {
          if (out.length >= 4) return;
          var rawId = typeof item === 'string' ? item : (item && (item.id || item.toolId || item.tool || item.label || item.name));
          if (!rawId) return;
          var key = String(rawId).trim().toLowerCase();
          var tool = byId[key] || byLabel[key];
          if (!tool || seen[tool.id]) return;
          seen[tool.id] = true;
          out.push({
            id: tool.id,
            label: tool.label,
            icon: tool.icon || 'AI',
            reason: String((item && (item.reason || item.why || item.match)) || (tool.desc || 'Good match for this interest.')).replace(/\s+/g, ' ').slice(0, 150),
            starter: String((item && (item.starter || item.firstStep || item.start)) || '').replace(/\s+/g, ' ').slice(0, 120)
          });
        });
        return out;
      }
      function _localStemToolMatches(interest, tools) {
        var raw = String(interest || '').toLowerCase();
        var words = raw.split(/[^a-z0-9]+/).filter(function (w) {
          return w.length > 2 && ['the', 'and', 'for', 'with', 'about', 'learn', 'want', 'how', 'why'].indexOf(w) === -1;
        });
        if (!words.length) return [];
        return tools.map(function (tool) {
          var hay = _stemToolCatalogText(tool);
          var score = 0;
          words.forEach(function (w) {
            if (hay.indexOf(w) !== -1) score += 1;
            if (String(tool.label || '').toLowerCase().indexOf(w) !== -1) score += 2;
          });
          if (raw && hay.indexOf(raw) !== -1) score += 4;
          return { tool: tool, score: score };
        }).filter(function (row) { return row.score > 0; }).sort(function (a, b) { return b.score - a.score; }).slice(0, 4).map(function (row) {
          return {
            id: row.tool.id,
            label: row.tool.label,
            icon: row.tool.icon || 'AI',
            reason: row.tool.desc || 'This tool has related STEM activities for your interest.',
            starter: ''
          };
        });
      }

      // ── Keyboard Help State ──
      var [_showKeyHelp, _setShowKeyHelp] = React.useState(false);

      // ── Canvas Narration Toggle (mirrors localStorage so the header button re-renders) ──
      var [_narrationOn, _setNarrationOn] = React.useState(function () {
        try { return localStorage.getItem('alloflow_canvas_narrate') === 'on'; } catch (e) { return false; }
      });

      // ── Station Builder State ──
      var [_showStationBuilder, _setShowStationBuilder] = React.useState(false);
      var [_stationName, _setStationName] = React.useState('');
      var [_stationGrade, _setStationGrade] = React.useState('');
      var [_stationNote, _setStationNote] = React.useState('');
      var [_stationTools, _setStationTools] = React.useState({});
      var [_stationTimeEst, _setStationTimeEst] = React.useState('20');
      var [_savedStations, _setSavedStations] = React.useState(function() {
        try { return JSON.parse(localStorage.getItem('alloflow_stem_stations') || '[]'); } catch(e) { return []; }
      });
      var [_activeStationId, _setActiveStationId] = React.useState(null);

      // ═══ QUEST SYSTEM ═══
      var [_stationQuests, _setStationQuests] = React.useState([]);
      var [_questPickerOpen, _setQuestPickerOpen] = React.useState(false);
      var [_questProgress, _setQuestProgress] = React.useState(function() {
        try { return JSON.parse(localStorage.getItem('alloflow_quest_progress') || '{}'); } catch(e) { return {}; }
      });
      var [_questHudCollapsed, _setQuestHudCollapsed] = React.useState(false);
      var [_showXpPanel, _setShowXpPanel] = React.useState(false);
      var [_questFreeResponseOpen, _setQuestFreeResponseOpen] = React.useState(null); // qid of expanded free response

      // Quest progress persistence
      React.useEffect(function() {
        try { localStorage.setItem('alloflow_quest_progress', JSON.stringify(_questProgress)); }
        catch(e) { console.warn('[QuestSystem] Quest progress not saved (storage quota or permission) — non-fatal, continuing:', e.message || e); }
      }, [_questProgress]);

      // Quest evaluation — watches labToolData for auto-completion
      React.useEffect(function() {
        if (!_activeStation || !_activeStation.quests || !_activeStation.quests.length) return;
        var updated = _evaluateQuests(_activeStation, labToolData || {}, _questProgress);
        if (updated !== _questProgress) {
          // Check which quests just completed for celebration
          var stProg = updated[_activeStation.id] || {};
          _activeStation.quests.forEach(function(q) {
            var oldProg = (_questProgress[_activeStation.id] || {})[q.qid];
            var newProg = stProg[q.qid];
            if (newProg && newProg.complete && (!oldProg || !oldProg.complete)) {
              // Streak detection: if last quest was completed <2 min ago, it's a streak
              var streakBonus = 0;
              var lastCompletionTime = 0;
              _activeStation.quests.forEach(function(q2) {
                var p2 = stProg[q2.qid];
                if (p2 && p2.complete && p2.completedAt && q2.qid !== q.qid) {
                  var t2 = new Date(p2.completedAt).getTime();
                  if (t2 > lastCompletionTime) lastCompletionTime = t2;
                }
              });
              if (lastCompletionTime > 0 && (Date.now() - lastCompletionTime) < 120000) {
                streakBonus = 5;
              }
              var totalBonus = 10 + streakBonus;
              var streakMsg = streakBonus > 0 ? ' \uD83D\uDD25 Streak bonus +' + streakBonus + '!' : '';
              if (addToast) addToast('\uD83C\uDFC6 Quest complete: ' + q.label + ' (+' + totalBonus + ' XP)' + streakMsg, 'success');
              if (typeof announceToSR === 'function') announceToSR('Quest completed: ' + q.label);
              if (typeof stemCelebrate === 'function') stemCelebrate();
              if (typeof awardStemXP === 'function') awardStemXP('questBonus', totalBonus, 'Quest: ' + q.label + (streakBonus ? ' (streak)' : ''));
            }
          });
          _setQuestProgress(updated);
        }
      }, [labToolData, _activeStationId]);

      // Quest time tracking — accumulates ENGAGED time spent in each tool.
      //
      // This used to be wall clock: Date.now() minus mount, banked once on
      // unmount. Two problems. (1) An abandoned open tab earned credit, so
      // "spend 5 minutes" here meant something weaker than the identical phrase
      // on a directions goal. (2) Banking only on unmount meant a student who
      // never switched tools accrued nothing, and a crash or tab close lost the
      // whole session. Now it ticks, and only while the learner is actually
      // present — same definition the host uses for engagedMinutes.
      React.useEffect(function() {
        if (!_activeStation || !stemLabTool) return;
        var timeQuests = (_activeStation.quests || []).filter(function(q) {
          return q.type === 'timeSpent' && q.toolId === stemLabTool;
        });
        if (timeQuests.length === 0) return;
        var TICK_MS = 5000;
        var timer = setInterval(function() {
          if (!_stemIsEngaged()) return; // idle or hidden — not time spent
          _setQuestProgress(function(prev) {
            var sp = Object.assign({}, prev[_activeStation.id] || {});
            timeQuests.forEach(function(q) {
              var qp = Object.assign({}, sp[q.qid] || {});
              qp.timeAccumMs = (qp.timeAccumMs || 0) + TICK_MS;
              sp[q.qid] = qp;
            });
            var next = Object.assign({}, prev);
            next[_activeStation.id] = sp;
            return next;
          });
        }, TICK_MS);
        return function() { clearInterval(timer); };
      }, [stemLabTool, _activeStationId]);


      // Quest type definitions
      var QUEST_TYPES = [
        { id: 'xpThreshold', label: 'Earn XP', icon: '\u2B50', paramLabel: 'XP Target', defaultVal: 50, unit: 'XP' },
        { id: 'timeSpent', label: 'Spend Time', icon: '\u23F1', paramLabel: 'Minutes', defaultVal: 5, unit: 'min' },
        { id: 'discoveryCount', label: 'Discover Items', icon: '\uD83D\uDD2D', paramLabel: 'Item Count', defaultVal: 5, unit: 'items' },
        { id: 'quizScore', label: 'Quiz Score', icon: '\uD83C\uDFAF', paramLabel: 'Min Score', defaultVal: 5, unit: 'pts' },
        { id: 'freeResponse', label: 'Written Response', icon: '\u270D\uFE0F', paramLabel: 'Min Characters', defaultVal: 30, unit: 'chars' },
        { id: 'toolQuest', label: 'Tool-Specific', icon: '\uD83C\uDFC6', paramLabel: 'Quest', defaultVal: '', unit: '' }
      ];

      // Get available tool-specific quests for a given tool ID
      function _getToolQuestHooks(toolId) {
        if (!toolId || !window.StemLab || !window.StemLab._registry) return [];
        var toolConfig = window.StemLab._registry[toolId];
        return (toolConfig && toolConfig.questHooks) || [];
      }

      // Resolve where a tool keeps its quest-visible state. Most tools store it
      // at toolData[toolId] or toolData['_' + toolId]; tools whose state lives
      // under a different key (or split across several keys) declare
      // questDataKey (string) or questDataKeys (array, shallow-merged) in their
      // registerTool config — e.g. coordgrid ('coordinate' → '_coordGrid') and
      // multtable ('_multTimer' + '_multExt').
      function _getToolQuestState(toolId, toolData) {
        var td = toolData || {};
        var cfg = (window.StemLab && window.StemLab._registry && window.StemLab._registry[toolId]) || {};
        if (cfg.questDataKeys && cfg.questDataKeys.length) {
          var merged = {};
          cfg.questDataKeys.forEach(function(k) { Object.assign(merged, td[k] || {}); });
          return merged;
        }
        if (cfg.questDataKey) return td[cfg.questDataKey] || {};
        return td[toolId] || td['_' + toolId] || {};
      }

      // Auto-generate quest label
      function _questAutoLabel(type, toolId, params) {
        var toolName = 'this tool';
        if (toolId) {
          // Resolve from the plugin registry, NOT from _allStemTools: that array
          // is declared inside the explore-tab render branch (`stemLabTab ===
          // 'explore' && ... (() => { var _allStemTools = [...] })()`) and does
          // not exist in this scope. Every call with a toolId threw
          // ReferenceError, which took the whole quest builder down —
          // "Auto-generate smart quests" could never fire at all, and the
          // builder's live preview crashed the moment a tool was chosen.
          var reg = (typeof window !== 'undefined' && window.StemLab && window.StemLab._registry) || {};
          var found = reg[toolId];
          if (found && (found.label || found.name)) toolName = found.label || found.name;
        }
        switch(type) {
          case 'xpThreshold': return 'Earn ' + (params.threshold || 50) + ' XP in ' + toolName;
          case 'timeSpent': return 'Spend ' + (params.minutes || 5) + ' minutes in ' + toolName;
          case 'discoveryCount': return 'Discover ' + (params.count || 5) + ' items in ' + toolName;
          case 'quizScore': return 'Score ' + (params.minScore || 5) + '+ on the ' + toolName + ' quiz';
          case 'freeResponse': return params.prompt || 'Describe what you learned';
          default: return 'Complete a quest';
        }
      }

      // Evaluate all quests for a station against current tool data
      function _evaluateQuests(station, toolData, progress) {
        if (!station || !station.quests || !station.quests.length) return progress;
        var stProg = Object.assign({}, progress[station.id] || {});
        var changed = false;
        station.quests.forEach(function(q) {
          var qp = stProg[q.qid] || {};
          if (qp.complete) return;
          var complete = false;
          var xpData, toolState, field, val, score;
          switch(q.type) {
            case 'xpThreshold':
              xpData = (toolData._stemXP || {})[q.toolId];
              complete = xpData && (typeof xpData === 'number' ? xpData : (xpData.earned || 0)) >= (q.params.threshold || 50);
              break;
            case 'timeSpent':
              complete = (qp.timeAccumMs || 0) >= (q.params.minutes || 5) * 60000;
              break;
            case 'discoveryCount':
              toolState = toolData['_' + q.toolId] || toolData[q.toolId] || {};
              field = q.params.field || 'discoveries';
              val = field.indexOf('.') !== -1 ? field.split('.').reduce(function(o, k) { return (o || {})[k]; }, toolState) : toolState[field];
              complete = (Array.isArray(val) ? val.length : (typeof val === 'number' ? val : 0)) >= (q.params.count || 5);
              break;
            case 'quizScore':
              toolState = toolData['_' + q.toolId] || toolData[q.toolId] || {};
              field = q.params.field || 'quizScore';
              score = field.indexOf('.') !== -1 ? field.split('.').reduce(function(o, k) { return (o || {})[k]; }, toolState) : toolState[field];
              complete = typeof score === 'number' && score >= (q.params.minScore || 5);
              break;
            case 'freeResponse':
              complete = (qp.response || '').length >= (q.params.minLength || 30);
              break;
            case 'toolQuest':
              // Tool-specific quest — look up the hook's check function
              var hooks = _getToolQuestHooks(q.toolId);
              var hook = hooks.find(function(h) { return h.id === q.params.hookId; });
              if (hook && hook.check) {
                var toolState2 = _getToolQuestState(q.toolId, toolData);
                complete = hook.check(toolState2);
              }
              break;
          }
          if (complete && !qp.complete) {
            qp.complete = true;
            qp.completedAt = new Date().toISOString();
            changed = true;
          }
          stProg[q.qid] = qp;
        });
        if (changed) {
          var updated = Object.assign({}, progress);
          updated[station.id] = stProg;
          return updated;
        }
        return progress;
      }

      // Get display info for a quest's progress
      function _getQuestDisplay(quest, toolData, progress, stationId) {
        var qp = ((progress[stationId] || {})[quest.qid]) || {};
        if (qp.complete) return { done: true, text: 'Complete', pct: 100 };
        var xpData, toolState, field, val, ms, targetMs;
        switch(quest.type) {
          case 'xpThreshold':
            xpData = (toolData._stemXP || {})[quest.toolId];
            var earned = xpData ? (typeof xpData === 'number' ? xpData : (xpData.earned || 0)) : 0;
            var thr = quest.params.threshold || 50;
            return { done: false, text: earned + '/' + thr + ' XP', pct: Math.min(100, earned / thr * 100) };
          case 'timeSpent':
            ms = qp.timeAccumMs || 0;
            targetMs = (quest.params.minutes || 5) * 60000;
            return { done: false, text: Math.floor(ms / 60000) + '/' + (quest.params.minutes || 5) + ' min', pct: Math.min(100, ms / targetMs * 100) };
          case 'discoveryCount':
            toolState = toolData['_' + quest.toolId] || toolData[quest.toolId] || {};
            field = quest.params.field || 'discoveries';
            val = field.indexOf('.') !== -1 ? field.split('.').reduce(function(o, k) { return (o || {})[k]; }, toolState) : toolState[field];
            var c = Array.isArray(val) ? val.length : (typeof val === 'number' ? val : 0);
            var target = quest.params.count || 5;
            return { done: false, text: c + '/' + target, pct: Math.min(100, c / target * 100) };
          case 'quizScore':
            toolState = toolData['_' + quest.toolId] || toolData[quest.toolId] || {};
            field = quest.params.field || 'quizScore';
            val = field.indexOf('.') !== -1 ? field.split('.').reduce(function(o, k) { return (o || {})[k]; }, toolState) : toolState[field];
            var sv = typeof val === 'number' ? val : 0;
            var minS = quest.params.minScore || 5;
            return { done: false, text: sv + '/' + minS, pct: Math.min(100, sv / minS * 100) };
          case 'freeResponse':
            var len = (qp.response || '').length;
            var minL = quest.params.minLength || 30;
            return { done: false, text: len + '/' + minL + ' chars', pct: Math.min(100, len / minL * 100) };
          case 'toolQuest':
            var hooks2 = _getToolQuestHooks(quest.toolId);
            var hook2 = hooks2.find(function(h2) { return h2.id === quest.params.hookId; });
            if (hook2 && hook2.progress) {
              var ts2 = _getToolQuestState(quest.toolId, toolData);
              var progText = hook2.progress(ts2);
              var isDone2 = hook2.check ? hook2.check(ts2) : false;
              return { done: isDone2, text: progText, pct: isDone2 ? 100 : 50 };
            }
            return { done: false, text: 'In progress', pct: 25 };
          default:
            return { done: false, text: '?', pct: 0 };
        }
      }

      // Sync incoming activeStation prop from main app (e.g. resource pack click)
      // When the main app sets activeStation and opens STEAM Lab, auto-load that station
      React.useEffect(function () {
        if (props.activeStation && props.activeStation.id) {
          _setActiveStationId(props.activeStation.id);
          // Ensure the station exists in local storage (it should, but be safe)
          var existing = _savedStations.find(function (s) { return s.id === props.activeStation.id; });
          if (!existing) {
            var updated = _savedStations.concat([props.activeStation]);
            _setSavedStations(updated);
            try { localStorage.setItem('alloflow_stem_stations', JSON.stringify(updated)); } catch (e) {}
          }
          // Clear the prop so re-opening STEAM Lab without a station click doesn't re-trigger
          if (typeof props.setActiveStation === 'function') props.setActiveStation(null);
        }
      }, [props.activeStation]);

      // Active station helper
      var _activeStation = _activeStationId ? _savedStations.find(function(s) { return s.id === _activeStationId; }) : null;

      // -- Catalog accent palette --
      // Card surfaces and text stay neutral; these eight accents identify subject
      // families through the top edge, icon badge, and hover tint. High contrast
      // intentionally collapses every accent to amber on black.
      var _toolColorMap = {
        blue: { light: '#2563eb', soft: '#dbeafe', hover: '#eff6ff', dark: '#60a5fa', darkSoft: '#172554' },
        indigo: { light: '#4f46e5', soft: '#e0e7ff', hover: '#eef2ff', dark: '#818cf8', darkSoft: '#1e1b4b' },
        violet: { light: '#7c3aed', soft: '#ede9fe', hover: '#f5f3ff', dark: '#a78bfa', darkSoft: '#2e1065' },
        rose: { light: '#e11d48', soft: '#ffe4e6', hover: '#fff1f2', dark: '#fb7185', darkSoft: '#4c0519' },
        orange: { light: '#c2410c', soft: '#ffedd5', hover: '#fff7ed', dark: '#fb923c', darkSoft: '#431407' },
        amber: { light: '#b45309', soft: '#fef3c7', hover: '#fffbeb', dark: '#fbbf24', darkSoft: '#422006' },
        emerald: { light: '#047857', soft: '#d1fae5', hover: '#ecfdf5', dark: '#34d399', darkSoft: '#022c22' },
        cyan: { light: '#0e7490', soft: '#cffafe', hover: '#ecfeff', dark: '#22d3ee', darkSoft: '#083344' }
      };


      // (Former orphan StemAIHintButton removed; AI hints now flow through the
      // single guarded ctx.getHint entry point — see getHint above.)

      // ── Theme Detection (prop from parent app, falls back to DOM query) ──
      // Theme values are resolved above before theme-dependent effects are registered.
      var _stemDialogRef = React.useRef(null);
      var _stemOpenerRef = React.useRef(null);
      React.useEffect(function () {
        _stemOpenerRef.current = document.activeElement;
        var body = document.body;
        var priorBodyOverflow = body ? body.style.overflow : '';
        var priorBodyOverscroll = body ? body.style.overscrollBehavior : '';
        if (body) {
          body.style.overflow = 'hidden';
          body.style.overscrollBehavior = 'none';
        }
        var focusTimer = setTimeout(function () {
          var root = _stemDialogRef.current;
          if (root && typeof root.focus === 'function') {
            try { root.focus({ preventScroll: true }); } catch (_) { root.focus(); }
          }
        }, 0);
        return function () {
          clearTimeout(focusTimer);
          if (body) {
            body.style.overflow = priorBodyOverflow;
            body.style.overscrollBehavior = priorBodyOverscroll;
          }
          var opener = _stemOpenerRef.current;
          if (opener && document.contains(opener) && typeof opener.focus === 'function') {
            try { opener.focus({ preventScroll: true }); } catch (_) { opener.focus(); }
          }
        };
      }, []);
      var _previousStemToolRef = React.useRef(null);
      React.useEffect(function () {
        var prior = _previousStemToolRef.current;
        var focusTimer = setTimeout(function () {
          var root = _stemDialogRef.current;
          var target = stemLabTool && root ? root.querySelector('.stem-active-tool-back') : null;
          if (!target && prior) {
            var cards = root ? root.querySelectorAll('[data-stem-tool-id]') : [];
            for (var i = 0; i < cards.length; i++) {
              if (cards[i].getAttribute('data-stem-tool-id') === prior) { target = cards[i]; break; }
            }
          }
          if (target && typeof target.focus === 'function') target.focus();
        }, 0);
        _previousStemToolRef.current = stemLabTool || null;
        return function () { clearTimeout(focusTimer); };
      }, [stemLabTool]);
      React.useEffect(function () {
        if (!stemLabTool) return;
        var state = null;
        var registered = false;
        try {
          state = typeof window.__alloGetStemPluginState === 'function' ? window.__alloGetStemPluginState(stemLabTool) : null;
          registered = !!(window.StemLab && window.StemLab.isRegistered && window.StemLab.isRegistered(stemLabTool));
        } catch (_) {}
        if (registered || !state || (state.status !== 'error' && state.status !== 'loaded')) return;
        var retryFocusTimer = setTimeout(function () {
          var root = _stemDialogRef.current;
          var retry = root ? root.querySelector('[data-stem-plugin-retry]') : null;
          if (retry && typeof retry.focus === 'function') {
            try { retry.focus({ preventScroll: true }); } catch (_) { retry.focus(); }
          }
        }, 0);
        return function () { clearTimeout(retryFocusTimer); };
      }, [stemLabTool, _pluginProgressTick]);

      function _stemFocusableElements(root) {
        if (!root) return [];
        var selector = 'a[href], area[href], button, input, select, textarea, iframe, object, embed, [contenteditable], [tabindex]';
        return Array.prototype.filter.call(root.querySelectorAll(selector), function (el) {
          if (el.disabled || el.tabIndex < 0 || (el.tagName === 'INPUT' && el.type === 'hidden')) return false;
          if (el.getAttribute && el.getAttribute('contenteditable') === 'false' && !el.hasAttribute('tabindex')) return false;
          if (el.closest && el.closest('[hidden], [aria-hidden=true], [inert]')) return false;
          var style = null;
          try { style = window.getComputedStyle ? window.getComputedStyle(el) : null; } catch (_) {}
          if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
          if (el.offsetParent === null && (!style || style.position !== 'fixed')) return false;
          return true;
        });
      }
      // ── Keyboard Accessibility ──
      React.useEffect(function () {
        function handleKeyDown(e) {
          // Escape to close STEAM Lab
          if (e.key === 'Escape') {
            // If a tool is open, close the tool first
            if (stemLabTool) {
              e.preventDefault();
              setStemLabTool(null);
              announceToSR('Tool closed');
              return;
            }
            // Otherwise close STEAM Lab
            e.preventDefault();
            if (typeof setShowStemLab === 'function') setShowStemLab(false);
          }
          // Tab key focus trapping within dialog
          if (e.key === 'Tab') {
            var root = _stemDialogRef.current;
            if (!root) return;
            var focusable = _stemFocusableElements(root);
            if (focusable.length === 0) return;
            var first = focusable[0];
            var last = focusable[focusable.length - 1];
            if (document.activeElement === root) {
              e.preventDefault();
              (e.shiftKey ? last : first).focus();
              return;
            }
            if (!root.contains(document.activeElement)) {
              e.preventDefault();
              (e.shiftKey ? last : first).focus();
              return;
            }
            if (e.shiftKey) {
              if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
              if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
          }
          // ? key toggles keyboard help. A bare slash is ordinary text/navigation
          // input and must not trigger a global UI change.
          if (e.key === '?' && !e.altKey && !e.ctrlKey && !e.metaKey) {
            var tag = document.activeElement ? document.activeElement.tagName : '';
            if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
              e.preventDefault();
              var nextHelpState = !_showKeyHelp;
              _setShowKeyHelp(nextHelpState);
              announceToSR(nextHelpState ? 'Keyboard help shown' : 'Keyboard help hidden');
            }
          }
          // Keyboard shortcuts (with Alt key)
          if (e.altKey) {
            if (e.key === '1') { e.preventDefault(); setStemLabTab('explore'); announceToSR('Switched to Explore tab'); }
            else if (e.key === '2') { e.preventDefault(); setStemLabTab('create'); announceToSR('Switched to Create tab'); }
            else if (e.key === 'Backspace' || e.key === 'b') { e.preventDefault(); setStemLabTool(null); announceToSR('Returned to tool grid'); }
          }
        }
        document.addEventListener('keydown', handleKeyDown);
        return function () { document.removeEventListener('keydown', handleKeyDown); };
      }, [stemLabTool, stemLabTab, _showKeyHelp]);

      // Accessibility semantics belong to the React source. The report-only
      // scanner below surfaces gaps without rewriting React-owned DOM.

      // ── Accessibility: aria-live feedback region ──
      var [a11yAnnouncement, setA11yAnnouncement] = React.useState('');
      function announceToSR(msg) {
        setA11yAnnouncement(msg);
        try { var liveEl = document.getElementById('stem-a11y-live'); if (liveEl) liveEl.textContent = msg; } catch (e) { }
        setTimeout(function () { setA11yAnnouncement(''); try { var liveEl = document.getElementById('stem-a11y-live'); if (liveEl) liveEl.textContent = ''; } catch (e) { } }, 3000);
      }

      // ── WCAG Auto-Fixer: Runs after tool renders to catch unlabeled interactive elements ──
      // This is a safety net — tools should be accessible by default, but this catches gaps.
      //
      // AS OF 2026-08-11 THIS REPORTS; IT NO LONGER REWRITES THE DOM.
      //
      // It shipped on 2026-04-10 (0efbd93bb) as a silent auto-fixer and stamped
      // aria-label/alt/role onto anything it judged unlabelled, every 2 seconds.
      // Two problems made that worse than the gaps it covered:
      //
      //   1. It silenced the audits used to FIND those gaps. An unlabelled
      //      select, an unlabelled input, a missing alt -- each became a pass, so
      //      runtime results read cleaner than the source deserved and disagreed
      //      with static ones for no visible reason.
      //   2. The names it added were intermittent. React owns this DOM; every
      //      re-render drops the attributes and the loop restores them up to two
      //      seconds later, so a name blinks in and out. Assistive tech landing
      //      in that window gets nothing, and no test can assert on it.
      //
      // What remains: the "x" -> "Close" button mapping, which fixes something
      // real. Everything else collects into window.__stemA11yFindings and warns
      // once per element. Call window.__stemA11yReport() for a grouped summary.
      // Fix what it lists AT SOURCE -- persistent, correctly worded,
      // translatable -- and when the list stays empty this loop can be deleted.
      if (!window._stemA11yFixerActive) {
        window._stemA11yFixerActive = true;

        // Findings accumulate across lab open/close. The signature dedupe is what
        // makes a 2-second loop usable as a reporter: without it every element
        // would reprint 30 times a minute and the console would be unreadable.
        window.__stemA11yFindings = window.__stemA11yFindings || [];
        var _a11ySeen = window.__stemA11ySeen || (window.__stemA11ySeen = {});
        var _a11yReport = function (rule, el, detail) {
          try {
            var sig = rule + '|' + el.tagName + '|' + String(el.className || '').slice(0, 40)
              + '|' + (el.textContent || '').trim().slice(0, 40);
            if (_a11ySeen[sig]) return;
            _a11ySeen[sig] = true;
            var entry = {
              rule: rule,
              detail: detail,
              html: String(el.outerHTML || '').slice(0, 160).replace(/\s+/g, ' ')
            };
            window.__stemA11yFindings.push(entry);
            console.warn('[a11y] ' + rule + ' - ' + detail + '\n  ' + entry.html);
          } catch (e) { /* a reporter must never break the page it reports on */ }
        };

        // Grouped summary on demand, for working through the list:
        //   window.__stemA11yReport()
        window.__stemA11yReport = function () {
          var byRule = {};
          window.__stemA11yFindings.forEach(function (f) {
            (byRule[f.rule] = byRule[f.rule] || []).push(f);
          });
          Object.keys(byRule).sort().forEach(function (r) {
            console.warn(r + ': ' + byRule[r].length);
            byRule[r].forEach(function (f) { console.warn('   ' + f.html); });
          });
          return window.__stemA11yFindings.length;
        };

        window._stemA11yFixerInterval = setInterval(function() {
          try {
            var modal = document.querySelector('.stem-lab-modal');
            if (!modal) {
              // Lab is closed — stop the polling loop and allow a clean restart on reopen.
              try { clearInterval(window._stemA11yFixerInterval); } catch (e) {}
              window._stemA11yFixerInterval = null;
              window._stemA11yFixerActive = false;
              return;
            }
            // 1. REPORT ONLY. This used to copy textContent into aria-label,
            //    which changed nothing for a screen reader: role=button already
            //    computes its accessible name from its own content. The single
            //    genuinely broken case is a control with NO text -- and the old
            //    rule skipped exactly that one, because its `if (text)` guard was
            //    false precisely when the element needed help. What it did
            //    accomplish was making dead unnamed controls look named to any
            //    check that tests for the attribute's presence.
            modal.querySelectorAll('[role="button"]:not([aria-label])').forEach(function(el) {
              if (!(el.textContent || '').trim()) {
                _a11yReport('role-button-unnamed', el, 'role=button with no text and no aria-label');
              }
            });
            // 2. Auto-label close buttons (×) that lack aria-label
            var closeBtns = modal.querySelectorAll('button:not([aria-label])');
            closeBtns.forEach(function(el) {
              var text = (el.textContent || '').trim();
              if (text === '\u00d7' || text === 'X' || text === '\u2715' || text === '\u2716') {
                el.setAttribute('aria-label', 'Close');
              }
              // The `else if` that used to sit here copied a button's own text
              // into aria-label, which a native <button> already announces from
              // its content. Dropped: it changed nothing for a user and inflated
              // the count of elements that look labelled.
              //
              // The "x" -> "Close" mapping above is kept deliberately. A
              // multiplication sign is not a name, and this is the one rule in
              // the loop that fixes something real.
            });
            // 3. REPORT ONLY. This used to stamp role="img", one fixed label
            //    ("Interactive visualization. Use controls above and below to
            //    interact.") and tabindex="0" onto every unlabelled canvas.
            //    All three were wrong: a live simulation is not an image and
            //    role="img" makes its children presentational; one identical
            //    label across every canvas in the app distinguishes nothing; and
            //    tabindex="0" on an element with no key handling manufactures
            //    exactly the focusable-but-dead control this codebase has been
            //    removing everywhere else.
            modal.querySelectorAll('canvas:not([aria-label])').forEach(function(el) {
              _a11yReport('canvas-unnamed', el, 'canvas has no aria-label; needs a description of what it shows');
            });
            // 4. REPORT ONLY. This used to guess a name from the previous DOM
            //    sibling's text, falling back to "Selection menu". Adjacency is
            //    not a label relationship: the sibling is often a bare number, a
            //    unit, or another control entirely, and the fallback says nothing
            //    at all. Either way it silenced a genuine axe violation.
            modal.querySelectorAll('select:not([aria-label]):not([aria-labelledby])').forEach(function(el) {
              _a11yReport('select-unlabelled', el, 'select has no aria-label, aria-labelledby or associated label');
            });
            // 5. REPORT ONLY. This used to copy the placeholder into aria-label.
            //    That is a real improvement over a placeholder alone -- an
            //    aria-label survives typing where the visual placeholder does not
            //    -- but it hid the defect from every runtime audit, and a
            //    placeholder is written as a hint ("e.g. Division with
            //    remainders...") rather than as a name. Fix these at source.
            modal.querySelectorAll('input:not([aria-label]):not([aria-labelledby]):not([id])').forEach(function(el) {
              _a11yReport('input-unlabelled', el,
                'input named only by its placeholder: "' + (el.getAttribute('placeholder') || '(none)') + '"');
            });
            // 6. REPORT ONLY. This used to write alt="Illustration", which is
            //    wrong in both directions: a decorative image needs alt="" so a
            //    screen reader skips it, and a meaningful one needs a real
            //    description. It satisfied the automated check while telling the
            //    user nothing either way. Deciding WHICH kind an image is cannot
            //    be done from the DOM, which is why this one can only report.
            modal.querySelectorAll('img:not([alt])').forEach(function(el) {
              _a11yReport('img-no-alt', el, 'img has no alt; needs alt="" if decorative, a description if not');
            });
          } catch(e) { /* safety net — never crash the app */ }
        }, 2000); // Run every 2 seconds
      }

      // ── Gamepad API Adapter — maps controller inputs to keyboard events ──
      // Runs a polling loop when a gamepad is connected. Synthesizes KeyboardEvents
      // so all existing tools get controller support automatically (no per-tool changes).
      // Supports Xbox, PlayStation, and generic HID controllers.
      // Button mapping follows the W3C Standard Gamepad layout:
      //   Left stick: WASD movement | Right stick: Arrow keys (camera/turn)
      //   A/Cross: Space (jump/click) | B/Circle: Escape (close dialog)
      //   X/Square: KeyE (interact) | Y/Triangle: KeyM (measure)
      //   LB: KeyQ (cycle shape) | RB: right-click (place block)
      //   LT: Shift (sprint) | RT: left-click (break block)
      //   D-pad: 1-4 block selection | Start: KeyF (fly) | Select: KeyG (grid)
      if (!window._stemGamepadActive) {
        window._stemGamepadActive = true;
        var _gpPrevButtons = {};
        var _gpConnected = false;
        var _gpDeadzone = 0.2;

        window.addEventListener('gamepadconnected', function(e) {
          _gpConnected = true;
          console.log('[Gamepad] Connected: ' + e.gamepad.id);
          if (typeof addToast === 'function') addToast('\uD83C\uDFAE Controller connected: ' + e.gamepad.id.substring(0, 40), 'success');
        });
        window.addEventListener('gamepaddisconnected', function() {
          _gpConnected = false;
          console.log('[Gamepad] Disconnected');
        });

        // Synthesize a keyboard event the same way the browser would
        function _gpKey(code, type) {
          try {
            var ev = new KeyboardEvent(type, { code: code, key: code.replace('Key', '').toLowerCase(), bubbles: true, cancelable: true });
            document.dispatchEvent(ev);
            // Also dispatch to the focused element (for canvas listeners)
            if (document.activeElement && document.activeElement !== document.body) {
              document.activeElement.dispatchEvent(new KeyboardEvent(type, { code: code, key: code.replace('Key', '').toLowerCase(), bubbles: true, cancelable: true }));
            }
          } catch(e) {}
        }

        // Synthesize mouse click for block place/break
        function _gpClick(button) {
          try {
            var target = document.activeElement || document.querySelector('canvas');
            if (target) {
              var rect = target.getBoundingClientRect();
              var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
              target.dispatchEvent(new MouseEvent('mousedown', { button: button, clientX: cx, clientY: cy, bubbles: true }));
              setTimeout(function() {
                target.dispatchEvent(new MouseEvent('mouseup', { button: button, clientX: cx, clientY: cy, bubbles: true }));
              }, 50);
            }
          } catch(e) {}
        }

        // Button state tracker (press/release edge detection)
        function _gpBtnPressed(idx, pressed) {
          var wasPressed = !!_gpPrevButtons[idx];
          _gpPrevButtons[idx] = pressed;
          return pressed && !wasPressed; // true on rising edge only
        }
        function _gpBtnReleased(idx, pressed) {
          var wasPressed = !!_gpPrevButtons[idx];
          _gpPrevButtons[idx] = pressed;
          return !pressed && wasPressed;
        }

        // Axis-to-key state tracking (hold behavior, not just press)
        var _gpAxisKeys = {};
        function _gpAxisToKey(axisVal, negKey, posKey, id) {
          var negActive = axisVal < -_gpDeadzone;
          var posActive = axisVal > _gpDeadzone;
          var prevNeg = _gpAxisKeys[id + '_neg'];
          var prevPos = _gpAxisKeys[id + '_pos'];
          if (negActive && !prevNeg) _gpKey(negKey, 'keydown');
          if (!negActive && prevNeg) _gpKey(negKey, 'keyup');
          if (posActive && !prevPos) _gpKey(posKey, 'keydown');
          if (!posActive && prevPos) _gpKey(posKey, 'keyup');
          _gpAxisKeys[id + '_neg'] = negActive;
          _gpAxisKeys[id + '_pos'] = posActive;
        }

        // Poll loop (requestAnimationFrame)
        function _gpPoll() {
          requestAnimationFrame(_gpPoll);
          if (!_gpConnected) return;
          var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
          var gp = null;
          for (var gi = 0; gi < gamepads.length; gi++) { if (gamepads[gi]) { gp = gamepads[gi]; break; } }
          if (!gp) return;

          // Left stick → WASD
          _gpAxisToKey(gp.axes[1], 'KeyW', 'KeyS', 'ls_y'); // Y-axis inverted: up = negative
          _gpAxisToKey(gp.axes[0], 'KeyA', 'KeyD', 'ls_x');

          // Right stick → Arrow keys (camera/turn)
          if (gp.axes.length >= 4) {
            _gpAxisToKey(gp.axes[3], 'ArrowUp', 'ArrowDown', 'rs_y');
            _gpAxisToKey(gp.axes[2], 'ArrowLeft', 'ArrowRight', 'rs_x');
          }

          // Face buttons (Standard Gamepad mapping)
          var btns = gp.buttons;
          if (btns.length >= 4) {
            // A/Cross (index 0) → Space
            if (_gpBtnPressed(0, btns[0].pressed)) _gpKey('Space', 'keydown');
            if (_gpBtnReleased(0, btns[0].pressed)) _gpKey('Space', 'keyup');
            // B/Circle (1) → Escape
            if (_gpBtnPressed(1, btns[1].pressed)) _gpKey('Escape', 'keydown');
            if (_gpBtnReleased(1, btns[1].pressed)) _gpKey('Escape', 'keyup');
            // X/Square (2) → KeyE (interact with NPC)
            if (_gpBtnPressed(2, btns[2].pressed)) _gpKey('KeyE', 'keydown');
            if (_gpBtnReleased(2, btns[2].pressed)) _gpKey('KeyE', 'keyup');
            // Y/Triangle (3) → KeyM (measure)
            if (_gpBtnPressed(3, btns[3].pressed)) _gpKey('KeyM', 'keydown');
            if (_gpBtnReleased(3, btns[3].pressed)) _gpKey('KeyM', 'keyup');
          }
          if (btns.length >= 8) {
            // LB (4) → KeyQ (cycle shape/tool)
            if (_gpBtnPressed(4, btns[4].pressed)) _gpKey('KeyQ', 'keydown');
            if (_gpBtnReleased(4, btns[4].pressed)) _gpKey('KeyQ', 'keyup');
            // RB (5) → right-click (place block)
            if (_gpBtnPressed(5, btns[5].pressed)) _gpClick(2);
            // LT (6) → Shift (sprint)
            if (btns[6].value > 0.3 && !_gpAxisKeys['lt']) { _gpKey('ShiftLeft', 'keydown'); _gpAxisKeys['lt'] = true; }
            if (btns[6].value <= 0.3 && _gpAxisKeys['lt']) { _gpKey('ShiftLeft', 'keyup'); _gpAxisKeys['lt'] = false; }
            // RT (7) → left-click (break block)
            if (_gpBtnPressed(7, btns[7].pressed)) _gpClick(0);
          }
          if (btns.length >= 10) {
            // Select/Back (8) → KeyG (grid toggle)
            if (_gpBtnPressed(8, btns[8].pressed)) _gpKey('KeyG', 'keydown');
            // Start (9) → KeyF (fly toggle)
            if (_gpBtnPressed(9, btns[9].pressed)) _gpKey('KeyF', 'keydown');
          }
          // D-pad → Digit1-4 (block type selection)
          if (btns.length >= 16) {
            if (_gpBtnPressed(12, btns[12].pressed)) _gpKey('Digit1', 'keydown'); // Up
            if (_gpBtnPressed(13, btns[13].pressed)) _gpKey('Digit2', 'keydown'); // Down
            if (_gpBtnPressed(14, btns[14].pressed)) _gpKey('Digit3', 'keydown'); // Left
            if (_gpBtnPressed(15, btns[15].pressed)) _gpKey('Digit4', 'keydown'); // Right
          }
        }
        _gpPoll();
      }

      // ── Canvas Narration: Dual-Channel (aria-live + TTS) with Smart Detection & Adaptive Verbosity ──
      // Dedupe + encounter maps MUST live on window so they persist across React renders
      // (otherwise init/debounce guards reset every render → infinite repeat narration).
      var _canvasNarrateDedupe = window._alloCanvasNarrateDedupe || (window._alloCanvasNarrateDedupe = {});
      var _canvasNarrateEncounters = window._alloCanvasNarrateEncounters || (window._alloCanvasNarrateEncounters = {});

      // Canvas narration TTS — OFF by default, must be explicitly enabled
      // The aria-live channel still works for screen readers (independent of TTS)
      function _canvasNarrateTTSEnabled() {
        // Global mute always wins
        if (window._alloGlobalMute) return false;
        // URL override: ?a11y=tts (for testing)
        try { if (new URLSearchParams(window.location.search).get('a11y') === 'tts') return true; } catch(e) {}
        // User explicitly enabled it via toggle button
        try { if (localStorage.getItem('alloflow_canvas_narrate') === 'on') return true; } catch(e) {}
        return false;
      }

      /**
       * canvasNarrate — Dual-channel narration for canvas simulations
       * @param {string} toolId — e.g., 'galaxy', 'physics', 'wave'
       * @param {string} eventKey — e.g., 'launch', 'landing', 'paramChange'
       * @param {object} variants — { first: 'Full narration...', repeat: 'Short version', terse: '142m' }
       *     OR a plain string (treated as all-encounters-same narration)
       * @param {object} options — { debounce: 2000, speak: true/false }
       */
      function canvasNarrate(toolId, eventKey, variants, options) {
        options = options || {};
        var debounceMs = options.debounce != null ? options.debounce : 2000;

        // For 'init' events, only fire ONCE per tool session (re-renders should not re-narrate)
        if (eventKey === 'init') {
          var initKey = '__init__' + toolId;
          if (_canvasNarrateDedupe[initKey]) return;
          _canvasNarrateDedupe[initKey] = true;
          // Don't auto-clear init flag — stays set until page reload
        }

        // Resolve variants to the right verbosity level
        var msg;
        if (typeof variants === 'string') {
          msg = variants;
        } else {
          var encounterKey = toolId + '::' + eventKey;
          var count = _canvasNarrateEncounters[encounterKey] || 0;
          _canvasNarrateEncounters[encounterKey] = count + 1;
          if (count === 0 && variants.first) {
            msg = variants.first;
          } else if (count === 1 && variants.repeat) {
            msg = variants.repeat;
          } else {
            msg = variants.terse || variants.repeat || variants.first || '';
          }
        }

        if (!msg) return;

        // Debounce: skip if same toolId+eventKey fired within window (non-init events)
        var dedupeKey = toolId + ':' + eventKey;
        if (eventKey !== 'init' && debounceMs > 0 && _canvasNarrateDedupe[dedupeKey]) return;
        if (eventKey !== 'init' && debounceMs > 0) {
          _canvasNarrateDedupe[dedupeKey] = true;
          setTimeout(function() { delete _canvasNarrateDedupe[dedupeKey]; }, debounceMs);
        }

        // Channel 1: aria-live (always active — silent unless SR is running)
        announceToSR(msg);

        // Channel 2: AlloFlow TTS (only if Smart Detection says yes)
        var speakAloud = options.speak != null ? options.speak : _canvasNarrateTTSEnabled();
        if (speakAloud && callTTS) {
          try { callTTS(msg).then(function(url) { if (url) { var a = new Audio(url); a.play().catch(function() {}); } }).catch(function() {}); } catch(e) {}
        }
      }

      // Manual toggle: let users flip canvas narration on/off
      function setCanvasNarrateEnabled(enabled) {
        try { localStorage.setItem('alloflow_canvas_narrate', enabled ? 'on' : 'off'); } catch(e) {}
      }

      // ── Reduced Motion Detection (reads parent app's header button toggle) ──
      var _reduceMotion = false;
      try {
        if (document.querySelector('.reduce-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches) _reduceMotion = true;
      } catch (e) { }

      var _pal = isDark ? { bg: '#1e293b', bgAlt: '#334155', text: '#f1f5f9', textMuted: '#94a3b8', border: '#475569', card: '#1e293b', accent: '#38bdf8' }
        : isContrast ? { bg: '#000000', bgAlt: '#1a1a1a', text: '#ffffff', textMuted: '#e2e8f0', border: '#fbbf24', card: '#000000', accent: '#fbbf24' }
          : { bg: '#ffffff', bgAlt: '#f8fafc', text: '#1e293b', textMuted: '#64748b', border: '#e2e8f0', card: '#ffffff', accent: '#3b82f6' };

      // ── localStorage persistence (wrapped in useEffect to avoid setState-during-render) ──
      React.useEffect(function () {
        if (labToolData._persisted) return;
        try {
          var _saved = localStorage.getItem('alloflow_stemlab_v2');
          if (_saved) {
            var _parsed = JSON.parse(_saved);
            if (_parsed && typeof _parsed === 'object') {
              var _parsedForHydration = _parsed;
              if (_parsed.beehive && typeof _parsed.beehive === 'object' && !Array.isArray(_parsed.beehive)) {
                var _hydratedBeehive = _deserializeBeehiveFromPersistence(_parsed.beehive);
                _parsedForHydration = Object.assign({}, _parsed, { beehive: _hydratedBeehive });
              }
              setLabToolData(function (prev) { return Object.assign({}, prev, _parsedForHydration, { _persisted: true }); });
            } else {
              setLabToolData(function (prev) { return Object.assign({}, prev, { _persisted: true }); });
            }
          } else {
            setLabToolData(function (prev) { return Object.assign({}, prev, { _persisted: true }); });
          }
        } catch (e) {
          setLabToolData(function (prev) { return Object.assign({}, prev, { _persisted: true }); });
        }
      }, [labToolData._persisted]);
      // Save to localStorage on meaningful changes
      React.useEffect(function () {
        if (!labToolData._persisted) return;
        try {
          var _toSave = {};
          // @tool waterCycle
          ['calculus', 'wave', 'physics', 'punnett', 'chemBalance', 'galaxy', 'rockCycle', 'waterCycle', 'lumen', 'companionPlanting', 'cellProgress', '_tutorialSeen'].forEach(function (k) {
            if (labToolData[k]) _toSave[k] = labToolData[k];
          });
          // flightSim progression (badges, visited airports, flight time,
          // discoveries, tutorial dismissals) was never in the whitelist, so
          // every "persists" promise in SkySchool silently reset on reload.
          // Strip per-session keys: view must not reload into 'flying', and
          // rescue/survey are transient mission state tied to the sim clock.
          if (labToolData.flightSim) {
            var _fs = Object.assign({}, labToolData.flightSim);
            delete _fs.view; delete _fs.rescue; delete _fs.survey;
            delete _fs.weatherLesson; delete _fs.nearestWaypoint; delete _fs.showHelp;
            _toSave.flightSim = _fs;
          }
          if (labToolData.beehive) {
            var _beehive = _serializeBeehiveForPersistence(labToolData.beehive);
            if (_beehive) _toSave.beehive = _beehive;
          }
          localStorage.setItem('alloflow_stemlab_v2', JSON.stringify(_toSave));
        } catch (e) { }
      }, [labToolData]);

      // ── Tutorial Overlay Helper ──
      var _tutorialSeen = labToolData._tutorialSeen || {};
      function markTutorialSeen(toolId) {
        setLabToolData(function (prev) {
          var seen = Object.assign({}, prev._tutorialSeen || {});
          seen[toolId] = true;
          return Object.assign({}, prev, { _tutorialSeen: seen });
        });
      }
      // Track whether tutorial needs auto-completion (deferred to useEffect to avoid setState-during-render)
      var [_tutorialAutoComplete, _setTutorialAutoComplete] = React.useState(null);
      React.useEffect(function () {
        if (_tutorialAutoComplete) {
          markTutorialSeen(_tutorialAutoComplete);
          setLabToolData(function (p) { return Object.assign({}, p, { _tutorialStep: 0 }); });
          _setTutorialAutoComplete(null);
        }
      }, [_tutorialAutoComplete]);
      // ── Synth Keyboard Hook (MUST be at top level to satisfy React Rules of Hooks) ──
      React.useEffect(function () {
        if (stemLabTab !== 'explore' || stemLabTool !== 'musicSynth') return;
        function onKeyDown(e) { if (window._alloSynthKeyDown) window._alloSynthKeyDown(e); }
        function onKeyUp(e) { if (window._alloSynthKeyUp) window._alloSynthKeyUp(e); }
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return function () { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
      }, [stemLabTab, stemLabTool, labToolData]);
      /* companionPlanting canvas sync: removed — see stem_tool_companionplanting.js */
      /* graphCalc math.js loader: removed — see stem_tool_graphcalc.js */
      /* graphCalc canvas renderer: removed — see stem_tool_graphcalc.js */
      // ── 3D Tools: Load Three.js on demand (Geometry Sandbox + Architecture Studio) ──
      React.useEffect(function () {
        var wcNeedsThree = stemLabTool === 'waterCycle' && labToolData.waterCycle && labToolData.waterCycle.journeyView === '3d';
        var weatherNeedsThree = stemLabTool === 'weatherSystems' && labToolData.weatherSystems && labToolData.weatherSystems.tab === 'immersive';
        if (stemLabTab !== 'explore' || (stemLabTool !== 'geoSandbox' && stemLabTool !== 'archStudio' && stemLabTool !== 'geometryWorld' && stemLabTool !== 'echolocation' && stemLabTool !== 'geologyExplorer' && !wcNeedsThree && !weatherNeedsThree)) return;
        // THREE already present — but make sure OrbitControls came with it. This
        // early-return used to skip OrbitControls whenever THREE was cached, so a
        // 3D tool opened after the first got _threeLoaded with controls=null → the
        // camera was never aimed (scene stuck in a corner, no orbit). If it's
        // missing, load it first, THEN mark ready.
        if (window.THREE && window.THREE.OrbitControls) { setLabToolData(function (p) { return Object.assign({}, p, { _threeLoaded: true }); }); return; }
        // Resilient path via the shared ensureThree (cdnjs \u2192 jsDelivr core,
        // jsDelivr \u2192 unpkg OrbitControls, per-attempt timeouts). The promise
        // cache doubles as an in-flight guard, so this effect re-running
        // mid-load no longer appends duplicate script tags; a total failure
        // clears the cache so re-entering the tool (or _threeAttempt bumps)
        // retries fresh.
        var hadThree = !!window.THREE;
        window.StemLab.ensureThree({ orbit: true, failMessage: 'The 3D engine could not load. School network filters sometimes block CDNs. The accessible 2D view remains available.' }).then(function () {
          if (!hadThree && typeof addToast === 'function') addToast('\uD83D\uDD37 3D engine loaded', 'info');
          setLabToolData(function (p) { return Object.assign({}, p, { _threeLoaded: true, _threeLoadError: undefined }); });
        }).catch(function (error) {
          console.error('[StemLab] Three.js failed to load');
          setLabToolData(function (p) {
            return Object.assign({}, p, { _threeLoadError: (error && error.message) || 'The 3D engine could not load. The accessible 2D view remains available.' });
          });
          if (typeof addToast === 'function') addToast('\u274c 3D engine failed to load', 'error');
        });
      }, [stemLabTab, stemLabTool, labToolData._threeAttempt, labToolData.waterCycle && labToolData.waterCycle.journeyView, labToolData.weatherSystems && labToolData.weatherSystems.tab]);
      // ── Geometry Sandbox: Scene init, render loop, shape updates (MUST be at top level) ──
      React.useEffect(function () {
        if (stemLabTab !== 'explore' || stemLabTool !== 'geoSandbox') return;
        if (!window.THREE) return;
        var cnv = document.getElementById('geo-sandbox-canvas');
        if (!cnv) return;
        var gd = (labToolData && labToolData.geoSandbox) || {};
        // The plugin owns stretch/sculpt scene graphs. This legacy single-shape
        // bridge used to rebuild a primitive on every tool-data change regardless
        // of mode, racing the plugin and flashing that primitive over stretch mode.
        var activeGeoMode = window._geoActiveMode || gd.mode || 'single';
        if (activeGeoMode !== 'single') {
          var legacyGeoScene = window._geoScene;
          if (legacyGeoScene && legacyGeoScene.mesh) {
            legacyGeoScene.mesh.visible = false;
            legacyGeoScene.scene.remove(legacyGeoScene.mesh);
            legacyGeoScene.mesh.traverse(function(o) {
              if (o.geometry && o.geometry.dispose) o.geometry.dispose();
              if (o.material) {
                var materials = Array.isArray(o.material) ? o.material : [o.material];
                materials.forEach(function(material) { if (material && material.dispose) material.dispose(); });
              }
            });
            legacyGeoScene.mesh = null;
          }
          return;
        }
        var shapeType = gd.shape || 'box';
        var dims = gd.dims || { w: 3, h: 3, d: 3, r: 1.5, rTop: 1.5, rBot: 1.5, tube: 0.5, segs: 32 };
        var shapeColor = gd.color || '#60a5fa';
        var wireframe = gd.wireframe || false;
        var opacity = gd.opacity != null ? gd.opacity : 1;
        var THREE = window.THREE;

        // Init scene if not already
        if (!window._geoScene) {
          var scene = new THREE.Scene();
          scene.background = new THREE.Color('#0f172a');
          var camera = new THREE.PerspectiveCamera(50, cnv.clientWidth / cnv.clientHeight, 0.1, 1000);
          camera.position.set(6, 5, 8);
          camera.lookAt(0, 0, 0);
          var renderer = new THREE.WebGLRenderer({ canvas: cnv, antialias: true });
          renderer.setSize(cnv.clientWidth, cnv.clientHeight);
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          // Lights
          var ambient = new THREE.AmbientLight(0xffffff, 0.5);
          scene.add(ambient);
          var directional = new THREE.DirectionalLight(0xffffff, 0.8);
          directional.position.set(5, 10, 7.5);
          scene.add(directional);
          var fillLight = new THREE.DirectionalLight(0xc7d2fe, 0.3);
          fillLight.position.set(-5, 3, -5);
          scene.add(fillLight);
          // Ground grid
          var gridHelper = new THREE.GridHelper(20, 20, 0x334155, 0x1e293b);
          scene.add(gridHelper);
          // Orbit controls
          var controls;
          if (THREE.OrbitControls) {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.08;
            controls.minDistance = 2;
            controls.maxDistance = 30;
          }
          // Animation loop
          var animId;
          var animate = function () {
            animId = requestAnimationFrame(animate);
            if (controls) controls.update();
            renderer.render(scene, camera);
          };
          animate();
          window._geoScene = { scene: scene, camera: camera, renderer: renderer, controls: controls, animId: animId, mesh: null };
        }

        var gs = window._geoScene;
        // Remove old mesh
        if (gs.mesh) { gs.scene.remove(gs.mesh); gs.mesh.geometry.dispose(); if (gs.mesh.material) gs.mesh.material.dispose(); gs.mesh = null; }
        // Create geometry based on shape type
        var geometry;
        switch (shapeType) {
          case 'sphere': geometry = new THREE.SphereGeometry(dims.r || 1.5, dims.segs || 32, dims.segs || 32); break;
          case 'cylinder': geometry = new THREE.CylinderGeometry(dims.rTop || 1.5, dims.rBot || 1.5, dims.h || 3, dims.segs || 32); break;
          case 'cone': geometry = new THREE.ConeGeometry(dims.r || 1.5, dims.h || 3, dims.segs || 32); break;
          case 'pyramid': geometry = new THREE.ConeGeometry(dims.r || 1.5, dims.h || 3, 4); break;
          case 'torus': geometry = new THREE.TorusGeometry(dims.r || 1.5, dims.tube || 0.5, 16, dims.segs || 32); break;
          case 'prism': {
            var triShape = new THREE.Shape();
            var bw = dims.w || 3;
            triShape.moveTo(-bw / 2, 0);
            triShape.lineTo(bw / 2, 0);
            triShape.lineTo(0, dims.h || 3);
            triShape.closePath();
            geometry = new THREE.ExtrudeGeometry(triShape, { depth: dims.d || 3, bevelEnabled: false });
            geometry.center();
            break;
          }
          default: geometry = new THREE.BoxGeometry(dims.w || 3, dims.h || 3, dims.d || 3); break;
        }
        // Material
        var material = new THREE.MeshPhongMaterial({
          color: new THREE.Color(shapeColor),
          wireframe: wireframe,
          transparent: opacity < 1,
          opacity: opacity,
          shininess: 60,
          flatShading: false
        });
        var mesh = new THREE.Mesh(geometry, material);
        // Position shape above ground
        var bbox = new THREE.Box3().setFromObject(mesh);
        mesh.position.y = -bbox.min.y;
        gs.scene.add(mesh);
        gs.mesh = mesh;

        // Resize handler
        var handleResize = function () {
          if (!cnv || !gs.renderer) return;
          gs.renderer.setSize(cnv.clientWidth, cnv.clientHeight);
          gs.camera.aspect = cnv.clientWidth / cnv.clientHeight;
          gs.camera.updateProjectionMatrix();
        };
        window.addEventListener('resize', handleResize);

        return function () {
          window.removeEventListener('resize', handleResize);
        };
      }, [stemLabTab, stemLabTool, labToolData]);
      // ── Geometry Sandbox cleanup on exit ──
      React.useEffect(function () {
        return function () {
          if (window._geoScene) {
            cancelAnimationFrame(window._geoScene.animId);
            if (window._geoScene.renderer) window._geoScene.renderer.dispose();
            if (window._geoScene.controls) window._geoScene.controls.dispose();
            window._geoScene = null;
          }
        };
      }, [stemLabTool]);
      // ── Architecture Studio: Scene init, render loop, block placement (MUST be at top level) ──
      React.useEffect(function () {
        if (stemLabTab !== 'explore' || stemLabTool !== 'archStudio') return;
        if (!window.THREE) return;
        var cnv = document.getElementById('arch-studio-canvas');
        if (!cnv) return;
        var gd = (labToolData && labToolData.archStudio) || {};
        var blocks = gd.blocks || [];
        var THREE = window.THREE;

        // ── Init scene if not already ──
        if (!window._archScene) {
          var scene = new THREE.Scene();
          scene.background = new THREE.Color('#131a2b');
          scene.fog = new THREE.Fog('#131a2b', 30, 60);
          var camera = new THREE.PerspectiveCamera(50, cnv.clientWidth / cnv.clientHeight, 0.1, 1000);
          camera.position.set(14, 12, 18);
          camera.lookAt(10, 0, 10);
          var renderer = new THREE.WebGLRenderer({ canvas: cnv, antialias: true });
          renderer.setSize(cnv.clientWidth, cnv.clientHeight);
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          renderer.shadowMap.enabled = true;
          renderer.shadowMap.type = THREE.PCFSoftShadowMap;

          // ── Bloom post-processing (guarded, auto-fallback) — AlloFlow FX rollout ──
          // ArchStudio: gentle, high-threshold glow on bright block highlights over the
          // dark navy bg; kept subtle so the build editor stays legible (same tuning
          // philosophy as geometryworld). Plain render until the r128 addons load; any
          // failure falls back to renderer.render — can never break the tool. This is
          // the LAST un-bloomed 3D surface in STEAM Lab.
          renderer._alloComposer = null;
          (function(){
            if (window.AlloPostFXEnabled === false) return;
            var _ens = function(cb){
              if (window.THREE && window.THREE.EffectComposer && window.THREE.UnrealBloomPass) { cb(); return; }
              var u = ['https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js','https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js','https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js','https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js','https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js','https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js'];
              var i=0; (function n(){ if(i>=u.length){cb();return;} var s=document.createElement("script"); s.src=u[i]; s.onload=function(){i++;n();}; s.onerror=function(){i++;n();}; document.head.appendChild(s); })();
            };
            _ens(function(){
              try {
                var T=window.THREE; if(!T||!T.EffectComposer||!T.RenderPass||!T.UnrealBloomPass) return;
                var rm=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
                var lp=rm||(!!navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4); var rs=lp?0.5:1;
                var cc=new T.EffectComposer(renderer);
                cc.addPass(new T.RenderPass(scene, camera));
                cc.addPass(new T.UnrealBloomPass(new T.Vector2(Math.max(1,Math.round((cnv.clientWidth)*rs)),Math.max(1,Math.round((cnv.clientHeight)*rs))), lp?0.49:0.7, 0.35, 0.85));
                renderer._alloComposer=cc;
              } catch(e){ try{ renderer._alloComposer=null; }catch(_){} }
            });
          })();
          // Lights
          var ambient = new THREE.AmbientLight(0xffffff, 0.45);
          scene.add(ambient);
          var sun = new THREE.DirectionalLight(0xfff4e0, 0.9);
          sun.position.set(15, 20, 10);
          sun.castShadow = true;
          sun.shadow.mapSize.width = 1024;
          sun.shadow.mapSize.height = 1024;
          sun.shadow.camera.near = 0.5;
          sun.shadow.camera.far = 50;
          sun.shadow.camera.left = -25;
          sun.shadow.camera.right = 25;
          sun.shadow.camera.top = 25;
          sun.shadow.camera.bottom = -25;
          scene.add(sun);
          var fill = new THREE.DirectionalLight(0xc7d2fe, 0.25);
          fill.position.set(-10, 8, -5);
          scene.add(fill);
          // Ground plane
          var groundGeo = new THREE.PlaneGeometry(20, 20);
          var groundMat = new THREE.MeshPhongMaterial({ color: 0x1e293b, side: THREE.DoubleSide });
          var ground = new THREE.Mesh(groundGeo, groundMat);
          ground.rotation.x = -Math.PI / 2;
          ground.position.set(10, 0, 10);
          ground.receiveShadow = true;
          ground.name = 'ground';
          scene.add(ground);
          // Grid overlay
          var gridHelper = new THREE.GridHelper(20, 20, 0x475569, 0x334155);
          gridHelper.position.set(10, 0.01, 10);
          scene.add(gridHelper);
          // Orbit controls
          var controls;
          if (THREE.OrbitControls) {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.08;
            controls.minDistance = 3;
            controls.maxDistance = 40;
            controls.target.set(10, 2, 10);
          }
          // Raycaster + mouse
          var raycaster = new THREE.Raycaster();
          var mouse = new THREE.Vector2();
          // Ghost preview mesh
          var ghostMat = new THREE.MeshPhongMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.35, depthWrite: false });
          var ghostMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), ghostMat);
          ghostMesh.visible = false;
          ghostMesh.name = '_ghost';
          scene.add(ghostMesh);
          // Animation loop
          var animId;
          var animate = function () {
            animId = requestAnimationFrame(animate);
            if (controls) controls.update();
            var _ac = renderer._alloComposer; if (_ac) { try { _ac.render(); } catch (e) { renderer._alloComposer = null; renderer.render(scene, camera); } } else { renderer.render(scene, camera); }
          };
          animate();
          // ── Pointer events for placement ──
          var _getGridPos = function (evt) {
            var rect = cnv.getBoundingClientRect();
            mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            // Collect all clickable objects (ground + placed block meshes)
            var targets = [];
            scene.traverse(function (obj) {
              if (obj.isMesh && obj.name !== '_ghost') targets.push(obj);
            });
            var hits = raycaster.intersectObjects(targets, false);
            if (hits.length === 0) return null;
            var hit = hits[0];
            var n = hit.face.normal.clone();
            // If we hit ground, place at that grid cell at y=0
            if (hit.object.name === 'ground') {
              var gx = Math.floor(hit.point.x);
              var gz = Math.floor(hit.point.z);
              if (gx < 0 || gx >= 20 || gz < 0 || gz >= 20) return null;
              return { x: gx, y: 0, z: gz };
            }
            // If we hit a block, place adjacent to it along the face normal
            var center = new THREE.Vector3();
            hit.object.getWorldPosition(center);
            // Use floor for x/z (mesh centers are at b.x+0.5) and round with offset for y
            var nx = Math.floor(center.x + n.x);
            var ny = Math.round(center.y - 0.5 + n.y);
            var nz = Math.floor(center.z + n.z);
            if (nx < 0 || nx >= 20 || ny < 0 || ny >= 10 || nz < 0 || nz >= 20) return null;
            return { x: nx, y: ny, z: nz };
          };
          var _getClickedBlock = function (evt) {
            var rect = cnv.getBoundingClientRect();
            mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            var targets = [];
            scene.traverse(function (obj) {
              if (obj.isMesh && obj.name !== '_ghost' && obj.name !== 'ground') targets.push(obj);
            });
            var hits = raycaster.intersectObjects(targets, false);
            if (hits.length === 0) return null;
            var obj = hits[0].object;
            // obj.userData holds { bx, by, bz }
            return obj.userData;
          };
          // Mouse move → update ghost position (only in place mode)
          cnv.addEventListener('mousemove', function (evt) {
            var _as = window._archScene;
            var _act = (_as && _as._active) || {};
            if ((_act.mode || 'place') !== 'place') { ghostMesh.visible = false; return; }
            var pos = _getGridPos(evt);
            if (!pos) { ghostMesh.visible = false; return; }
            ghostMesh.visible = true;
            ghostMesh.position.set(pos.x + 0.5, pos.y + 0.5, pos.z + 0.5);
          });
          // Click → place/erase/paint  (reads from window._archScene._active to avoid stale closure)
          cnv.addEventListener('click', function (evt) {
            var _as = window._archScene; if (!_as) return;
            var _act = _as._active || {};
            var mode = _act.mode || 'place';
            if (mode === 'place') {
              var pos = _getGridPos(evt);
              if (!pos) return;
              var _shape = _act.activeShape || 'block';
              var _material = _act.activeMaterial || 'stone';
              var _color = _act.activeColor || '#94a3b8';
              setLabToolData(function (p) {
                var a = Object.assign({}, p.archStudio || {});
                var curBlocks = a.blocks || [];
                var exists = curBlocks.some(function (b) { return b.x === pos.x && b.y === pos.y && b.z === pos.z; });
                if (exists) return p;
                var newBlock = { x: pos.x, y: pos.y, z: pos.z, shape: _shape, material: _material, color: _color };
                return Object.assign({}, p, { archStudio: Object.assign({}, a, { blocks: curBlocks.concat([newBlock]) }) });
              });
            } else if (mode === 'erase') {
              var bd = _getClickedBlock(evt);
              if (!bd) return;
              setLabToolData(function (p) {
                var a = Object.assign({}, p.archStudio || {});
                var nb = (a.blocks || []).filter(function (b) { return !(b.x === bd.bx && b.y === bd.by && b.z === bd.bz); });
                return Object.assign({}, p, { archStudio: Object.assign({}, a, { blocks: nb }) });
              });
            } else if (mode === 'paint') {
              var bd2 = _getClickedBlock(evt);
              if (!bd2) return;
              var _pMat = _act.activeMaterial || 'stone';
              var _pCol = _act.activeColor || '#94a3b8';
              setLabToolData(function (p) {
                var a = Object.assign({}, p.archStudio || {});
                var nb = (a.blocks || []).map(function (b) {
                  if (b.x === bd2.bx && b.y === bd2.by && b.z === bd2.bz) {
                    return Object.assign({}, b, { material: _pMat, color: _pCol });
                  }
                  return b;
                });
                return Object.assign({}, p, { archStudio: Object.assign({}, a, { blocks: nb }) });
              });
            }
          });
          window._archScene = { scene: scene, camera: camera, renderer: renderer, controls: controls, animId: animId, ghostMesh: ghostMesh, blockMeshes: [], _active: {} };
        }

        // ── Update active state on every re-render (avoids stale closure in click handler) ──
        window._archScene._active = { activeShape: gd.activeShape || 'block', activeMaterial: gd.activeMaterial || 'stone', activeColor: gd.activeColor || '#94a3b8', mode: gd.mode || 'place', styleMode: gd.styleMode || 'architect', blueprintView: gd.blueprintView || false };

        // ── Rebuild all block meshes ──
        var as = window._archScene;
        var _styleMode = gd.styleMode || 'architect';
        var _blueprintView = gd.blueprintView || false;
        // Remove old block meshes (including stud children)
        as.blockMeshes.forEach(function (m) {
          while (m.children.length > 0) { var c = m.children[0]; m.remove(c); if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); }
          as.scene.remove(m); m.geometry.dispose(); if (m.material) m.material.dispose();
        });
        as.blockMeshes = [];
        // Material colors (architect vs brick mode)
        var matColors = _styleMode === 'bricks'
          ? { stone: '#ef4444', brick: '#f59e0b', wood: '#22c55e', glass: '#3b82f6', marble: '#f8fafc', metal: '#1e293b' }
          : { stone: '#94a3b8', brick: '#b45309', wood: '#92400e', glass: '#38bdf8', marble: '#f1f5f9', metal: '#cbd5e1' };
        // Shape geometry factory
        var mkGeo = function (shape) {
          if (_styleMode === 'bricks') {
            // Brick mode: shapes keep their form but get brick-scale sizing (gap for stud seams)
            switch (shape) {
              case 'slab': return new THREE.BoxGeometry(0.95, 0.45, 0.95, 2, 1, 2);
              case 'ramp': {
                var rS = new THREE.Shape();
                rS.moveTo(-0.475, -0.475);
                rS.lineTo(0.475, -0.475);
                rS.lineTo(0.475, 0.475);
                rS.closePath();
                var rG = new THREE.ExtrudeGeometry(rS, { depth: 0.95, bevelEnabled: false });
                rG.center();
                return rG;
              }
              case 'column': return new THREE.CylinderGeometry(0.33, 0.33, 0.95, 16);
              case 'cylinder': return new THREE.CylinderGeometry(0.475, 0.475, 0.95, 32);
              case 'lbeam': {
                var lbs1 = new THREE.Shape();
                lbs1.moveTo(-0.475, -0.475); lbs1.lineTo(0.475, -0.475); lbs1.lineTo(0.475, 0.475);
                lbs1.lineTo(0, 0.475); lbs1.lineTo(0, 0); lbs1.lineTo(-0.475, 0); lbs1.closePath();
                var lbg1 = new THREE.ExtrudeGeometry(lbs1, { depth: 0.95, bevelEnabled: false });
                lbg1.center(); return lbg1;
              }
              case 'window': return new THREE.BoxGeometry(0.95, 0.95, 0.285);
              case 'door': return new THREE.BoxGeometry(0.95, 0.95, 0.38);
              case 'arch': {
                var aG = new THREE.TorusGeometry(0.42, 0.12, 8, 16, Math.PI);
                aG.rotateX(Math.PI / 2);
                return aG;
              }
              case 'roof': {
                var rfS = new THREE.Shape();
                rfS.moveTo(-0.475, -0.33);
                rfS.lineTo(0.475, -0.33);
                rfS.lineTo(0, 0.33);
                rfS.closePath();
                var rfG = new THREE.ExtrudeGeometry(rfS, { depth: 0.95, bevelEnabled: false });
                rfG.center();
                return rfG;
              }
              case 'pyramid': return new THREE.ConeGeometry(0.475, 0.95, 4);
              case 'dome': return new THREE.SphereGeometry(0.475, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
              default: return new THREE.BoxGeometry(0.95, 0.95, 0.95, 2, 2, 2);
            }
          }
          switch (shape) {
            case 'slab': return new THREE.BoxGeometry(1, 0.5, 1);
            case 'ramp': {
              var rampShape = new THREE.Shape();
              rampShape.moveTo(-0.5, -0.5);
              rampShape.lineTo(0.5, -0.5);
              rampShape.lineTo(0.5, 0.5);
              rampShape.closePath();
              var geo = new THREE.ExtrudeGeometry(rampShape, { depth: 1, bevelEnabled: false });
              geo.center();
              return geo;
            }
            case 'column': return new THREE.CylinderGeometry(0.35, 0.35, 1, 16);
            case 'cylinder': return new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
            case 'lbeam': {
              var lbs2 = new THREE.Shape();
              lbs2.moveTo(-0.5, -0.5); lbs2.lineTo(0.5, -0.5); lbs2.lineTo(0.5, 0.5);
              lbs2.lineTo(0, 0.5); lbs2.lineTo(0, 0); lbs2.lineTo(-0.5, 0); lbs2.closePath();
              var lbg2 = new THREE.ExtrudeGeometry(lbs2, { depth: 1, bevelEnabled: false });
              lbg2.center(); return lbg2;
            }
            case 'window': return new THREE.BoxGeometry(1, 1, 0.3);
            case 'door': return new THREE.BoxGeometry(1, 1, 0.4);
            case 'arch': {
              var archGeo = new THREE.TorusGeometry(0.45, 0.12, 8, 16, Math.PI);
              archGeo.rotateX(Math.PI / 2);
              return archGeo;
            }
            case 'roof': {
              var roofShape = new THREE.Shape();
              roofShape.moveTo(-0.5, -0.35);
              roofShape.lineTo(0.5, -0.35);
              roofShape.lineTo(0, 0.35);
              roofShape.closePath();
              var roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 1, bevelEnabled: false });
              roofGeo.center();
              return roofGeo;
            }
            case 'pyramid': return new THREE.ConeGeometry(0.5, 1, 4);
            case 'dome': {
              var domeGeo = new THREE.SphereGeometry(0.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
              return domeGeo;
            }
            default: return new THREE.BoxGeometry(1, 1, 1);
          }
        };
        // Stud geometry (reusable, only created once in brick mode)
        var studGeo = _styleMode === 'bricks' ? new THREE.CylinderGeometry(0.15, 0.15, 0.12, 12) : null;
        // Create mesh for each placed block
        blocks.forEach(function (b) {
          var geo = mkGeo(b.shape || 'block');
          var col = _styleMode === 'bricks' ? (matColors[b.material] || b.color || '#ef4444') : (b.color || matColors[b.material] || '#94a3b8');
          var isGlass = (b.material === 'glass') && _styleMode !== 'bricks';
          var mat = new THREE.MeshPhongMaterial({
            color: new THREE.Color(col),
            transparent: isGlass,
            opacity: isGlass ? 0.4 : 1,
            shininess: _styleMode === 'bricks' ? 60 : ((b.material === 'metal') ? 100 : (b.material === 'marble' ? 80 : 40)),
            flatShading: _styleMode === 'bricks' ? false : (b.material === 'stone' || b.material === 'brick')
          });
          var mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(b.x + 0.5, (b.shape === 'slab' ? 0.25 : (b.shape === 'dome' ? 0 : 0.5)) + b.y, b.z + 0.5);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.userData = { bx: b.x, by: b.y, bz: b.z };
          // In brick mode, add stud bumps on top
          if (_styleMode === 'bricks' && studGeo && (b.shape || 'block') !== 'slab') {
            var studMat = new THREE.MeshPhongMaterial({ color: new THREE.Color(col), shininess: 80 });
            var offsets = [[-0.2, 0.2], [0.2, 0.2], [-0.2, -0.2], [0.2, -0.2]];
            offsets.forEach(function (off) {
              var stud = new THREE.Mesh(studGeo, studMat);
              stud.position.set(off[0], 0.535, off[1]);
              stud.castShadow = true;
              mesh.add(stud);
            });
          }
          as.scene.add(mesh);
          as.blockMeshes.push(mesh);
        });
        // ── Blueprint view: switch camera ──
        if (_blueprintView) {
          // Move camera to top-down orthographic-like position
          as.camera.position.set(10, 25, 10);
          as.camera.lookAt(10, 0, 10);
          as.camera.fov = 30;
          as.camera.updateProjectionMatrix();
          if (as.controls) as.controls.target.set(10, 0, 10);
          as.scene.background = new THREE.Color('#0c1524');
        } else {
          as.camera.fov = 50;
          as.camera.updateProjectionMatrix();
          as.scene.background = new THREE.Color('#131a2b');
        }
        // Update ghost color
        var gd3 = gd;
        if (as.ghostMesh) {
          as.ghostMesh.material.color.set(gd3.activeColor || matColors[gd3.activeMaterial] || '#60a5fa');
          // Update ghost geometry for selected shape
          var ghostGeo = mkGeo(gd3.activeShape || 'block');
          as.ghostMesh.geometry.dispose();
          as.ghostMesh.geometry = ghostGeo;
          // Hide ghost in erase/paint mode
          if ((gd3.mode || 'place') !== 'place') as.ghostMesh.visible = false;
        }

        // Resize handler
        var handleResize = function () {
          if (!cnv || !as.renderer) return;
          as.renderer.setSize(cnv.clientWidth, cnv.clientHeight);
          as.camera.aspect = cnv.clientWidth / cnv.clientHeight;
          as.camera.updateProjectionMatrix();
        };
        window.addEventListener('resize', handleResize);
        return function () { window.removeEventListener('resize', handleResize); };
      }, [stemLabTab, stemLabTool, labToolData]);
      // ── Architecture Studio cleanup on exit ──
      React.useEffect(function () {
        return function () {
          if (window._archScene) {
            cancelAnimationFrame(window._archScene.animId);
            try { var _arc = window._archScene.renderer && window._archScene.renderer._alloComposer; if (_arc) { (_arc.passes || []).forEach(function (p) { if (p && p.dispose) p.dispose(); }); window._archScene.renderer._alloComposer = null; } } catch (e) {}
            if (window._archScene.renderer) window._archScene.renderer.dispose();
            if (window._archScene.controls) window._archScene.controls.dispose();
            window._archScene.blockMeshes.forEach(function (m) { m.geometry.dispose(); if (m.material) m.material.dispose(); });
            window._archScene = null;
          }
        };
      }, [stemLabTool]);
      /* companionPlanting day ticker: removed — see stem_tool_companionplanting.js */
      // ── Coding Playground: Canvas ref (MUST be at top level) ──
      var _codingCanvasRef = React.useRef(null);
      // ── Coding Playground: Canvas drawing is handled by enhanced useEffect below ──
      // ── Coding Playground: Keyboard shortcuts ──
      React.useEffect(function () {
        if (stemLabTab !== 'explore' || stemLabTool !== 'codingPlayground') return;
        function handleKey(e) {
          if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            var cpd = (labToolData && labToolData._codingPlayground) || {};
            var us = cpd.undoStack || [];
            if (us.length === 0) return;
            var prev = us[us.length - 1];
            var newUndo = us.slice(0, -1);
            var newRedo = (cpd.redoStack || []).concat([JSON.parse(JSON.stringify(cpd.blocks || []))]);
            setLabToolData(function (p) {
              var cp = Object.assign({}, (p && p._codingPlayground) || {});
              cp.blocks = prev; cp.undoStack = newUndo; cp.redoStack = newRedo;
              if (cp.codeMode === 'text') {
                // rebuild text from blocks
                cp.textCode = ''; // will be recalculated on next render
              }
              return Object.assign({}, p, { _codingPlayground: cp });
            });
          }
          if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            e.preventDefault();
            var cpd2 = (labToolData && labToolData._codingPlayground) || {};
            var rs = cpd2.redoStack || [];
            if (rs.length === 0) return;
            var next = rs[rs.length - 1];
            var newRedo2 = rs.slice(0, -1);
            var newUndo2 = (cpd2.undoStack || []).concat([JSON.parse(JSON.stringify(cpd2.blocks || []))]);
            setLabToolData(function (p) {
              var cp = Object.assign({}, (p && p._codingPlayground) || {});
              cp.blocks = next; cp.undoStack = newUndo2; cp.redoStack = newRedo2;
              return Object.assign({}, p, { _codingPlayground: cp });
            });
          }
        }
        window.addEventListener('keydown', handleKey);
        return function () { window.removeEventListener('keydown', handleKey); };
      }, [stemLabTab, stemLabTool, labToolData]);
      // ── Slide Rule: Canvas ref (MUST be at top level) ──
      var _slideRuleCanvasRef = React.useRef(null);
      // ── Slide Rule: Canvas rendering ──
      React.useEffect(function () {
        var _manipMode = (labToolData && labToolData._mathManipMode) || 'blocks';
        if (stemLabTab !== 'explore' || stemLabTool !== 'base10' || _manipMode !== 'slideRule') return;
        var _srd = (labToolData && labToolData._slideRule) || { cOffset: 0, cursorPos: 0.301 };
        var cvs = _slideRuleCanvasRef.current;
        if (!cvs) return;
        var ctx = cvs.getContext('2d');
        var W = 600, H = 180;
        cvs.width = W; cvs.height = H;
        var PAD = 40, RULER_W = W - PAD * 2, RULER_H = 36;
        var cOff = _srd.cOffset || 0;
        var cursorX = _srd.cursorPos || 0.301;
        // Background
        ctx.fillStyle = '#fefce8'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#d4a574'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, W - 2, H - 2);
        // Helper: log position
        function logX(val) { return PAD + (Math.log10(val)) * RULER_W; }
        // Draw scale function
        function drawScale(yTop, offset, label, bgColor, textColor) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(PAD, yTop, RULER_W, RULER_H);
          ctx.strokeStyle = '#92400e'; ctx.lineWidth = 0.5;
          ctx.strokeRect(PAD, yTop, RULER_W, RULER_H);
          // Tick marks
          for (var n = 1; n <= 10; n++) {
            var x = PAD + (Math.log10(n) + offset) * RULER_W;
            if (x < PAD - 1 || x > PAD + RULER_W + 1) continue;
            // Major tick
            ctx.strokeStyle = '#451a03'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(x, yTop); ctx.lineTo(x, yTop + RULER_H); ctx.stroke();
            // Label
            ctx.fillStyle = textColor; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
            ctx.fillText(String(n), x, yTop + RULER_H + 10);
            // Minor ticks
            if (n < 10) {
              var minorCount = n === 1 ? 10 : 5;
              for (var m = 1; m < minorCount; m++) {
                var minorVal = n + m * (n === 1 ? 0.1 : 0.2);
                var mx = PAD + (Math.log10(minorVal) + offset) * RULER_W;
                if (mx < PAD || mx > PAD + RULER_W) continue;
                ctx.strokeStyle = '#78350f'; ctx.lineWidth = 0.5;
                var tickH = m % (n === 1 ? 5 : 1) === 0 ? RULER_H * 0.5 : RULER_H * 0.3;
                ctx.beginPath(); ctx.moveTo(mx, yTop); ctx.lineTo(mx, yTop + tickH); ctx.stroke();
              }
            }
          }
          // Scale label
          ctx.fillStyle = textColor; ctx.font = 'bold 14px serif'; ctx.textAlign = 'right';
          ctx.fillText(label, PAD - 6, yTop + RULER_H / 2 + 5);
        }
        // D scale (fixed)
        drawScale(H - 50, 0, 'D', '#fef3c7', '#92400e');
        // C scale (movable)
        ctx.save();
        ctx.beginPath(); ctx.rect(PAD, 0, RULER_W, H); ctx.clip();
        drawScale(H - 50 - RULER_H - 2, cOff, 'C', '#ecfccb', '#365314');
        ctx.restore();
        // Cursor hairline
        var cx = PAD + cursorX * RULER_W;
        ctx.strokeStyle = 'rgba(220,38,38,0.8)'; ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(cx, 8); ctx.lineTo(cx, H - 8); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(220,38,38,0.9)'; ctx.beginPath();
        ctx.moveTo(cx - 5, 8); ctx.lineTo(cx + 5, 8); ctx.lineTo(cx, 14); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx - 5, H - 8); ctx.lineTo(cx + 5, H - 8); ctx.lineTo(cx, H - 14); ctx.closePath(); ctx.fill();
        // Readout
        var dVal = Math.pow(10, cursorX);
        var cVal = Math.pow(10, cursorX - cOff);
        var product = dVal * Math.pow(10, cOff);
        ctx.fillStyle = '#451a03'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
        ctx.fillText('D: ' + dVal.toFixed(2) + '  ×  C: ' + cVal.toFixed(2) + '  =  ' + product.toFixed(2), W / 2, 30);
        // Title
        ctx.fillStyle = '#78350f'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText('Drag below to slide C-scale • Click to set cursor', PAD, H - 2);
      }, [stemLabTab, stemLabTool, labToolData]);
      // ── Coding Playground: Canvas rendering (MUST be at top level) ──
      React.useEffect(function () {
        if (stemLabTab !== 'explore' || stemLabTool !== 'codingPlayground') return;
        var _cpgd = (labToolData && labToolData._codingPlayground) || {};
        var _turtleState = _cpgd.turtle || { x: 250, y: 250, angle: -90, penDown: true, color: '#6366f1', width: 2 };
        var _drawnLines = _cpgd.lines || [];
        var _showTurtle = _cpgd.showTurtle !== false;
        var _hc = !!_cpgd.highContrastMode; // C3: high-contrast = black bg, white thick lines (21:1, AA)
        var cvs = _codingCanvasRef.current;
        if (!cvs) return;
        var ctx = cvs.getContext('2d');
        var W = 500, H = 500;
        cvs.width = W; cvs.height = H;
        ctx.fillStyle = _hc ? '#000000' : '#0f172a';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = _hc ? '#1f1f1f' : '#1e293b'; ctx.lineWidth = 0.5;
        for (var gx = 0; gx <= W; gx += 25) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
        for (var gy = 0; gy <= H; gy += 25) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
        ctx.strokeStyle = _hc ? '#3a3a3a' : '#334155'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
        _drawnLines.forEach(function (ln) {
          ctx.strokeStyle = _hc ? '#ffffff' : (ln.color || '#6366f1'); ctx.lineWidth = _hc ? Math.max(3, (ln.width || 2) + 1) : (ln.width || 2); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(ln.x1, ln.y1); ctx.lineTo(ln.x2, ln.y2); ctx.stroke();
        });
        var tx = _turtleState.x, ty = _turtleState.y, ta = _turtleState.angle * Math.PI / 180;
        if (_showTurtle) {
          // Glow under turtle
          ctx.save(); ctx.translate(tx, ty);
          var _glowGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 28);
          _glowGrad.addColorStop(0, 'rgba(74,222,128,0.35)'); _glowGrad.addColorStop(1, 'rgba(74,222,128,0)');
          ctx.fillStyle = _glowGrad; ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          ctx.save(); ctx.translate(tx, ty); ctx.rotate(ta + Math.PI / 2);
          var _ts = 1.5; ctx.scale(_ts, _ts);
          // Legs (four stubby green legs)
          ctx.fillStyle = '#4ade80';
          [[-8, -4], [8, -4], [-8, 6], [8, 6]].forEach(function (p) { ctx.beginPath(); ctx.ellipse(p[0], p[1], 3.5, 5.5, 0, 0, Math.PI * 2); ctx.fill(); });
          // Shell (oval body with pattern)
          ctx.fillStyle = '#15803d'; ctx.beginPath(); ctx.ellipse(0, 1, 11, 13, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.ellipse(0, 1, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
          // Shell hexagonal pattern
          ctx.strokeStyle = '#15803d'; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 12); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-9, 1); ctx.lineTo(9, 1); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-7, -5); ctx.lineTo(7, 7); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(7, -5); ctx.lineTo(-7, 7); ctx.stroke();
          // Shell highlight
          ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.ellipse(-2, -3, 4, 5, -0.3, 0, Math.PI * 2); ctx.fill();
          // Head
          ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.ellipse(0, -15, 6, 6, 0, 0, Math.PI * 2); ctx.fill();
          // Eyes (bigger, friendlier)
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-3, -16, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(3, -16, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(-3, -16.5, 1.2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(3, -16.5, 1.2, 0, Math.PI * 2); ctx.fill();
          // Smile
          ctx.strokeStyle = '#15803d'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(0, -13.5, 3, 0.2, Math.PI - 0.2); ctx.stroke();
          // Tail
          ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 13); ctx.quadraticCurveTo(4, 19, 1, 22); ctx.stroke();
          ctx.restore();
        } else {
          // Simple arrow cursor
          ctx.save(); ctx.translate(tx, ty); ctx.rotate(ta + Math.PI / 2);
          ctx.fillStyle = '#4ade80'; ctx.strokeStyle = '#15803d'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(-8, 10); ctx.lineTo(0, 5); ctx.lineTo(8, 10); ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.restore();
        }
        if (_turtleState.penDown) { ctx.fillStyle = _turtleState.color; ctx.beginPath(); ctx.arc(tx, ty, 3, 0, Math.PI * 2); ctx.fill(); }
        // Coordinates badge
        ctx.fillStyle = 'rgba(15,23,42,0.7)'; ctx.fillRect(4, H - 24, 180, 20); ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 12px monospace';
        ctx.fillText('📍 (' + Math.round(_turtleState.x) + ', ' + Math.round(_turtleState.y) + ') ' + Math.round((_turtleState.angle + 90 + 360) % 360) + '°', 10, H - 9);
        ctx.fillStyle = 'rgba(15,23,42,0.7)'; ctx.fillRect(W - 120, H - 24, 116, 20); ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 12px monospace';
        ctx.fillText(_drawnLines.length + ' segments', W - 114, H - 9);
      }, [stemLabTab, stemLabTool, labToolData]);
      function renderTutorial(toolId, steps) {
        if (_tutorialSeen[toolId]) return null;
        var step = labToolData._tutorialStep || 0;
        if (step >= steps.length) {
          // Defer the setState to useEffect to avoid setState-during-render
          if (_tutorialAutoComplete !== toolId) {
            Promise.resolve().then(function () { _setTutorialAutoComplete(toolId); });
          }
          return null;
        }
        var s = steps[step];
        // Theme-aware styles (inline to survive parent .theme-contrast [class*="bg-"] override)
        var _tutBg = isContrast ? { backgroundColor: '#000', color: '#fff', border: '3px solid #fbbf24' }
          : isDark ? { backgroundColor: '#312e81', color: '#e0e7ff', border: '2px solid #818cf8' }
            : { backgroundColor: '#4f46e5', color: '#fff', border: '2px solid #818cf8' };
        var _tutBtn = isContrast ? { backgroundColor: '#fbbf24', color: '#000' }
          : isDark ? { backgroundColor: '#e0e7ff', color: '#312e81' }
            : { backgroundColor: '#fff', color: '#4f46e5' };
        var _tutSkip = isContrast ? { color: '#fbbf24' } : { color: '#a5b4fc' };
        return React.createElement("div", { className: "absolute z-50 animate-in fade-in duration-300", style: { top: s.top || '50%', left: s.left || '50%', transform: 'translate(-50%,-50%)', maxWidth: '280px' } },
          React.createElement("div", { className: "rounded-xl p-3 shadow-xl", style: Object.assign({}, _tutBg, { animation: 'pulse 2s infinite' }) },
            React.createElement("p", { className: "text-xs font-bold mb-1" }, "\uD83D\uDCA1 Step " + (step + 1) + " of " + steps.length),
            React.createElement("p", { className: "text-xs leading-relaxed" }, s.text),
            React.createElement("div", { className: "flex gap-2 mt-2 justify-end" },
              React.createElement("button", { "aria-label": "Skip", onClick: function () { markTutorialSeen(toolId); setLabToolData(function (p) { return Object.assign({}, p, { _tutorialStep: 0 }); }); }, className: "px-2 py-1 text-[10px]", style: _tutSkip }, "Skip"),
              React.createElement("button", { "aria-label": step < steps.length - 1 ? "Next tutorial step" : "Finish tutorial", onClick: function () { setLabToolData(function (p) { return Object.assign({}, p, { _tutorialStep: (p._tutorialStep || 0) + 1 }); }); }, className: "px-3 py-1 text-[10px] font-bold rounded-lg", style: _tutBtn }, step < steps.length - 1 ? "Next \u2192" : "Got it! \u2705")
            )
          )
        );
      }

      // ── Tutorial Step Definitions ──
      var _tutCalculus = [
        { text: 'Welcome to the Calculus Visualizer! Adjust the sliders for a, b, c to change the curve f(x) = ax\u00B2 + bx + c.', top: '30%', left: '50%' },
        { text: 'Set xMin and xMax to define the integration bounds, then watch the area fill in real-time.', top: '50%', left: '50%' },
        { text: 'Switch between Left Riemann, Right Riemann, Midpoint, and Trapezoidal methods to see how they approximate the integral differently.', top: '70%', left: '50%' },
        { text: 'The convergence mini-chart below shows how the error shrinks as the number of rectangles increases. Try it!', top: '85%', left: '50%' }
      ];
      var _tutWave = [
        { text: 'Welcome to the Wave Simulator! Drag the Amplitude and Frequency sliders to shape your wave.', top: '30%', left: '50%' },
        { text: 'Switch wave types — Sine, Square, Triangle, or Sawtooth — to explore different waveforms.', top: '50%', left: '50%' },
        { text: 'Enable the second wave to see superposition — two waves combining into one!', top: '65%', left: '50%' },
        { text: 'Use keyboard shortcuts: Arrow Up/Down for amplitude, Left/Right for frequency, +/- for speed.', top: '80%', left: '50%' }
      ];
      var _tutPhysics = [
        { text: 'Welcome to the Projectile Physics Lab! Adjust the angle and velocity sliders to set up your launch.', top: '25%', left: '50%' },
        { text: 'Click "Launch" (or press Space) to fire the projectile. Watch it trace a parabolic arc!', top: '45%', left: '50%' },
        { text: 'Tweak gravity and wind to see how forces change the trajectory. Use WASD keys for fine control.', top: '65%', left: '50%' },
        { text: 'Check the flight stats panel for max height, range, and flight time. Try challenge mode to predict landings!', top: '85%', left: '50%' }
      ];
      var _tutGalaxy = [
        { text: 'Welcome to the Galaxy Explorer! Switch between Galaxy Simulation and Star Lifespan modes using the tabs. Click and drag to orbit the galaxy, scroll to zoom.', top: '25%', left: '50%' },
        { text: 'Adjust Star Count and Arm Count to change the galaxy\'s structure. Watch the spiral arms reform!', top: '45%', left: '50%' },
        { text: 'Click on any star to identify its spectral type (O, B, A, F, G, K, M) — the hottest stars are blue!', top: '65%', left: '50%' },
        { text: 'Use keyboard: Arrow keys to orbit, +/- to zoom, R to reset view. Try the quiz to test your knowledge!', top: '80%', left: '50%' }
      ];
      var _tutCompanionPlanting = [
        { text: 'Welcome to the Companion Planting Lab! This simulation models the milpa / Three Sisters — a 7,000-year-old agricultural system.', top: '25%', left: '50%' },
        { text: 'Drag seeds onto the mound: plant corn first, then beans around the stalks, then squash around the edges.', top: '45%', left: '50%' },
        { text: 'Watch the Soil Dashboard — nitrogen, moisture, and temperature all change as the plants grow together.', top: '65%', left: '50%' },
        { text: 'Use the Compare button to see how the Three Sisters garden compares to a monoculture plot. Try the quiz to earn XP!', top: '80%', left: '50%' }
      ];
      var _tutGraphCalc = [
        { text: 'Welcome to the Graphing Calculator! Type a function like y = 2x + 3 in the expression panel and watch it appear on the graph.', top: '25%', left: '50%' },
        { text: 'Use the Table view to see exact (x, y) values for your function. Great for checking homework answers!', top: '45%', left: '50%' },
        { text: 'Zoom and pan the graph with mouse wheel and drag. Use Window settings to set exact axis ranges.', top: '65%', left: '50%' },
        { text: 'The Coach panel explains every feature in plain English. Press the challenge button to practice with AI-generated problems!', top: '80%', left: '50%' }
      ];
      var _tutCoding = [
        { text: 'Welcome to the Coding Playground! Add blocks from the Toolbox on the left to build your program.', top: '30%', left: '50%' },
        { text: 'Each block is a command: move the turtle, turn, change colors, or use loops. Set values with the number inputs.', top: '45%', left: '50%' },
        { text: 'Click ▶ Run to watch your program execute step-by-step. The turtle draws on the canvas as it moves!', top: '55%', left: '50%' },
        { text: 'Try Variables (set $myVar) and If/Else blocks for advanced programs. Use Undo/Redo to experiment fearlessly!', top: '65%', left: '50%' },
        { text: 'Pick a Starter Template to load a prebuilt program, or tackle Challenges to earn XP. Switch to Code mode for JavaScript-like syntax!', top: '80%', left: '50%' }
      ];

      var _activeToolFallbackMeta = {
        heatLab: { label: 'Heat & Thermodynamics Lab', icon: '\uD83C\uDF21\uFE0F' },
        nuclearLab: { label: 'Nuclear & Radiation Lab', icon: '\u2622\uFE0F' },
        volume: { label: '3D Volume Explorer', icon: 'ðŸ“¦' },
        numberline: { label: 'Number Line', icon: 'ðŸ“' },
        areamodel: { label: 'Area Model', icon: 'ðŸŸ§' },
        fractionViz: { label: 'Fraction Lab', icon: 'ðŸ•' },
        chemBalance: { label: 'Chemistry Lab', icon: 'âš–ï¸' },
        opticsLab: { label: 'Optics Lab', icon: 'ðŸ”†' },
        codingPlayground: { label: 'Coding Playground', icon: 'ðŸ’»' },
        graphCalc: { label: 'Graphing Calculator', icon: 'ðŸ“ˆ' },
        solarSystem: { label: 'Solar System Explorer', icon: 'ðŸª' },
        anatomy: { label: 'Human Anatomy', icon: 'ðŸ«€' },
        titrationLab: { label: 'Titration Lab', icon: 'ðŸ§ª' }
      };
      function _formatStemToolId(id) {
        return String(id || 'Tool').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/\b\w/g, function(ch) { return ch.toUpperCase(); });
      }
      function _getActiveStemToolMeta(id) {
        var reg = null;
        try { reg = window.StemLab && window.StemLab._registry && window.StemLab._registry[id]; } catch (_) {}
        var fallback = _activeToolFallbackMeta[id] || {};
        var label = (reg && reg.label) || fallback.label || _formatStemToolId(id);
        var icon = (reg && reg.icon) || fallback.icon || 'ðŸ§ª';
        return { label: label, icon: icon };
      }
      var _activeStemToolMeta = stemLabTool ? _getActiveStemToolMeta(stemLabTool) : null;

      // STEAM Lab modal JSX
      return /*#__PURE__*/React.createElement("div", {
        "data-stem-lab": "true", ref: _stemDialogRef, tabIndex: -1, role: "dialog", "aria-modal": "true", "aria-label": stemLabTool ? "STEAM Lab: " + (_activeStemToolMeta ? _activeStemToolMeta.label : stemLabTool) : "STEAM Lab",
        className: "fixed inset-0 z-[9999] flex items-stretch justify-center stem-lab-modal" + (_reduceMotion ? " reduce-motion" : ""),
        style: {
          zIndex: 10020,
          background: 'rgba(15,23,42,0.7)',
          backdropFilter: 'blur(6px)'
        }
      },
        // Screen reader live region — must be inside the dialog for modal context
        React.createElement("div", {
          id: "stem-a11y-live", role: "status", "aria-live": "assertive", "aria-atomic": "true",
          style: { position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }
        }, a11yAnnouncement),
        /*#__PURE__*/React.createElement("div", {
        className: "stem-lab-modal-shell w-full max-w-[98vw] m-2 rounded-2xl shadow-2xl flex flex-col overflow-hidden" + (_reduceMotion ? "" : " animate-in zoom-in-95 duration-300"),
        style: {
          backgroundColor: _pal.bg,
          color: _pal.text,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          maxHeight: 'calc(100% - 16px)',
          minHeight: 0,
          overflow: 'hidden',
          boxSizing: 'border-box'
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "stem-lab-topbar flex items-center justify-between px-6 py-3 text-white", role: "banner",
        style: { background: isContrast ? '#000' : 'linear-gradient(to right, #2563eb, #4f46e5, #7c3aed)', borderBottom: isContrast ? '3px solid #fbbf24' : 'none' }
      }, /*#__PURE__*/React.createElement("div", {
        className: "stem-lab-brand-block flex items-center gap-3"
      }, React.createElement("button", {
        className: "stem-lab-xp-badge flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black relative cursor-pointer border-none outline-none focus:ring-2 focus:ring-white/50",
        style: {
          background: 'linear-gradient(135deg, #f59e0b, #eab308, #f59e0b)',
          backgroundSize: '200% 200%',
          animation: _xpBadgePulse ? 'stemXpBadgePulse 0.6s ease-out' : 'stemXpShimmer 3s ease-in-out infinite',
          boxShadow: _xpBadgePulse ? '0 0 16px rgba(245,158,11,0.6), 0 0 4px rgba(245,158,11,0.3)' : '0 2px 8px rgba(0,0,0,0.2)',
          color: '#1e293b',
          transition: 'box-shadow 0.3s ease'
        },
        title: 'View XP Progress',
        'aria-label': 'View XP Progress — ' + totalStemXP + ' total XP',
        onClick: function() { _setShowXpPanel(function(v) { return !v; }); }
      },
        React.createElement("span", { style: { filter: 'drop-shadow(0 0 3px rgba(255,200,0,0.8))', fontSize: '14px' } }, "\u2B50"),
        React.createElement("span", { style: { textShadow: '0 1px 2px rgba(0,0,0,0.15)' } }, totalStemXP + " XP"),
        // Floating +XP popups
        _stemXpPopups.current.map(function (p) {
          return React.createElement("div", {
            key: p.id,
            className: "stemXpFloatPopup",
            style: {
              position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)',
              pointerEvents: 'none', zIndex: 99999,
              animation: 'stemXpFloat 1.3s ease-out forwards',
              fontWeight: 900, fontSize: '14px', color: '#f59e0b',
              textShadow: '0 0 8px rgba(245,158,11,0.6), 0 1px 3px rgba(0,0,0,0.3)',
              whiteSpace: 'nowrap'
            }
          }, "+" + p.pts + " XP");
        })
      ),
        React.createElement("div", {
          className: "stem-lab-keyboard-badge hidden md:flex items-center gap-1 bg-white/10 backdrop-blur rounded-full px-2.5 py-1 text-[11px] font-medium text-white/70",
          title: "Keyboard shortcuts: Esc = close, Alt+1/2 = switch tabs, Alt+B = back to tools, Tab = navigate, Arrow keys = orbit 3D views"
        }, React.createElement("span", null, "\u2328\uFE0F"), React.createElement("span", null, "Keyboard accessible")),
      /*#__PURE__*/React.createElement("div", {
          className: "stem-lab-brand-icon bg-white/20 p-2 rounded-lg"
        }, /*#__PURE__*/React.createElement(Calculator, {
          size: 20
        })), /*#__PURE__*/React.createElement("div", {
          className: "stem-lab-title-lockup"
        }, /*#__PURE__*/React.createElement("h2", {
          className: "text-lg font-bold tracking-tight"
        }, "\uD83E\uDDEA STEAM Lab"), /*#__PURE__*/React.createElement("p", {
          className: "text-xs text-white/70"
        }, "Create problems, build assessments, explore with manipulatives"))), /*#__PURE__*/React.createElement("div", {
          className: "stem-lab-actionbar flex items-center gap-3"
        }, stemLabTab !== 'explore' && /*#__PURE__*/React.createElement("select", {
          value: mathSubject,
          onChange: e => setMathSubject(e.target.value),
          className: "stem-lab-subject-select px-3 py-1.5 text-xs font-medium bg-white/15 border border-white/25 rounded-lg text-white outline-none focus:ring-2 focus:ring-indigo-400",
          "aria-label": "Subject"
        }, /*#__PURE__*/React.createElement("option", {
          value: "General Math",
          className: "text-slate-800"
        }, "General Math"), /*#__PURE__*/React.createElement("option", {
          value: "Algebra",
          className: "text-slate-800"
        }, "Algebra"), /*#__PURE__*/React.createElement("option", {
          value: "Geometry",
          className: "text-slate-800"
        }, "Geometry"), /*#__PURE__*/React.createElement("option", {
          value: "Calculus",
          className: "text-slate-800"
        }, "Calculus"), /*#__PURE__*/React.createElement("option", {
          value: "Chemistry",
          className: "text-slate-800"
        }, "Chemistry"), /*#__PURE__*/React.createElement("option", {
          value: "Physics",
          className: "text-slate-800"
        }, "Physics"), /*#__PURE__*/React.createElement("option", {
          value: "Biology",
          className: "text-slate-800"
        }, "Biology")), /*#__PURE__*/React.createElement("button", {
          onClick: () => { if (typeof window.AlloToggleTheme === 'function') window.AlloToggleTheme(); },
          className: "p-1.5 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1",
          "aria-label": "Toggle theme",
          title: isContrast ? 'High Contrast' : isDark ? 'Dark Mode' : 'Light Mode'
        }, isContrast ? '\uD83D\uDC41' : isDark ? '\uD83C\uDF19' : '\u2600\uFE0F', /*#__PURE__*/React.createElement("span", { className: "text-[10px] font-bold" }, isContrast ? 'Hi-Con' : isDark ? 'Dark' : 'Light')),
        /*#__PURE__*/React.createElement("button", {
          onClick: () => {
            var next = !_narrationOn;
            try { localStorage.setItem('alloflow_canvas_narrate', next ? 'on' : 'off'); } catch(e) {}
            _setNarrationOn(next);
            if (typeof addToast === 'function') addToast(next ? '🔊 Canvas narration ON — tools will speak descriptions' : '🔇 Canvas narration OFF', 'info');
          },
          className: "p-1.5 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1",
          "aria-label": "Toggle canvas narration TTS",
          title: _narrationOn ? 'Canvas narration ON — click to disable' : 'Canvas narration OFF — click to enable spoken descriptions'
        }, _narrationOn ? '\uD83D\uDD0A' : '\uD83D\uDD07', /*#__PURE__*/React.createElement("span", { className: "text-[10px] font-bold" }, _narrationOn ? 'TTS' : 'Mute')),
        // ✨ AI-extras pill (W7): when no AI backend is reachable, the hints
        // toggle below would be a dead control, so it is replaced by one quiet
        // indicator. Neutral wording on purpose — the sims are fully functional
        // without AI, and a deep-link visitor reading "AI DISABLED" would take
        // it as breakage. Click opens AI Backend Settings (incl. the Canvas
        // path) via the host callback.
        !callGemini && /*#__PURE__*/React.createElement("button", {
          onClick: function () { try { if (typeof onOpenAiSetup === 'function') onOpenAiSetup(); } catch (e) {} },
          className: "p-1.5 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1",
          "aria-label": 'AI extras are off. No AI backend is set up. Click to see the ways to turn AI on.',
          title: 'AI extras (hints, coaching) are off because no AI backend is set up. The lab itself works fully without them. Click to set one up, or use AlloFlow inside Gemini Canvas for free AI.'
        }, '✨', /*#__PURE__*/React.createElement("span", { className: "text-[10px] font-bold" }, 'AI extras: off')),
        isTeacherMode && !!callGemini && /*#__PURE__*/React.createElement("button", {
          onClick: async () => {
            if (!_aiHintsOn) {
              // This previously read `... ? window.confirm(...) : true`, which
              // FAILED OPEN: with no confirm available `ok` was true and AI
              // hints switched on for students without the teacher ever seeing
              // the disclosure about what gets sent to the model. That is a
              // consent decision, so it now fails CLOSED — no dialog, no change.
              var confirmApi = typeof window !== 'undefined' && window.AlloFlowUX && window.AlloFlowUX.confirm;
              var unavailable = 'The confirmation dialog is unavailable right now, so AI hints stayed OFF.';
              if (typeof confirmApi !== 'function') {
                if (typeof addToast === 'function') addToast(unavailable, 'warning');
                return;
              }
              var ok = false;
              try {
                ok = await confirmApi(
                  'Enable AI hints for students?\n\nWhen ON, a stuck student (after a couple of tries) can request a hint. The question, the student\'s answer, and the correct answer are sent to the AI to generate a short guiding hint. No names or IDs are sent.\n\nHints are AI-generated and may be imperfect. Keep this OFF during graded / assessment work.',
                  { title: 'Enable AI hints', confirmText: 'Turn hints ON',
                    cancelText: 'Keep hints OFF', tone: 'warning' }
                );
              } catch (e) {
                if (typeof addToast === 'function') addToast(unavailable, 'warning');
                return;
              }
              if (!ok) return;
              try { localStorage.setItem('alloflow_stem_ai_hints', 'on'); } catch(e) {}
              _setAiHintsOn(true);
              if (typeof addToast === 'function') addToast('\uD83D\uDCA1 AI hints ON \u2014 practice only; turn OFF for graded work', 'info');
            } else {
              try { localStorage.setItem('alloflow_stem_ai_hints', 'off'); } catch(e) {}
              _setAiHintsOn(false);
              if (typeof addToast === 'function') addToast('\uD83D\uDCA1 AI hints OFF', 'info');
            }
          },
          className: "p-1.5 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1",
          "aria-pressed": _aiHintsOn,
          "aria-label": _aiHintsOn ? 'AI hints are ON for students \u2014 click to turn off' : 'AI hints are OFF \u2014 click to enable (teacher control)',
          title: _aiHintsOn ? 'AI hints ON: a stuck student can request an AI hint (their answer is sent to the AI). Practice only \u2014 turn OFF for graded work.' : 'AI hints OFF. Click to enable AI hints for stuck students (sends their answer to the AI; keep off during graded work).'
        }, '\uD83D\uDCA1', /*#__PURE__*/React.createElement("span", { className: "text-[10px] font-bold" }, _aiHintsOn ? 'Hints' : 'Hints Off')),
        /*#__PURE__*/React.createElement("button", {
          onClick: () => _setShowKeyHelp(v => !v),
          className: "p-1.5 hover:bg-white/20 rounded-lg transition-colors text-xs font-bold",
          "aria-label": "Show keyboard shortcuts",
          title: "Keyboard shortcuts (?)"
        }, "?"),
        /*#__PURE__*/React.createElement("button", {
          onClick: () => setShowStemLab(false),
          className: "p-1.5 hover:bg-white/20 rounded-lg transition-colors",
          "aria-label": "Close STEAM Lab"
        }, /*#__PURE__*/React.createElement(X, {
          size: 20
        })))), /*#__PURE__*/React.createElement("div", {
          className: "stem-lab-tablist flex border-b px-6", role: "tablist", "aria-label": "STEAM Lab navigation",
          style: { backgroundColor: _pal.bgAlt, borderColor: _pal.border }
        }, [{
          id: 'create',
          label: '\uD83D\uDCDD Create',
          desc: t('stem.solver.generate_assess')
        }, {
          id: 'explore',
          label: '\uD83D\uDD27 Explore',
          desc: t('stem.solver.manipulatives')
        }].map(tab => /*#__PURE__*/React.createElement("button", { "aria-label": tab.desc ? (tab.label + " tab: " + tab.desc) : (tab.label + " tab"),
          key: tab.id, role: "tab", "aria-selected": stemLabTab === tab.id,
          onClick: () => {
            setStemLabTab(tab.id);
            setStemLabTool(null);
          },
          className: "flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all",
          style: stemLabTab === tab.id
            ? { borderColor: isContrast ? '#fbbf24' : '#4f46e5', color: isContrast ? '#fbbf24' : (isDark ? '#a5b4fc' : '#4338ca'), backgroundColor: _pal.bg }
            : { borderColor: 'transparent', color: _pal.textMuted }
        }, /*#__PURE__*/React.createElement("span", null, tab.label), /*#__PURE__*/React.createElement("span", {
          className: `text-[10px] font-normal ${stemLabTab === tab.id ? 'text-indigo-400' : 'text-slate-500'}`
        }, tab.desc)))),
        stemLabTab === 'explore' && stemLabTool && _activeStemToolMeta && /*#__PURE__*/React.createElement("div", {
          className: "stem-active-toolbar",
          role: "region",
          "aria-label": "Current STEAM Lab tool",
          style: {
            backgroundColor: isContrast ? '#000' : (isDark ? 'rgba(15,23,42,0.94)' : 'rgba(255,255,255,0.94)'),
            borderColor: _pal.border
          }
        }, /*#__PURE__*/React.createElement("div", {
          className: "stem-active-tool-main"
        }, /*#__PURE__*/React.createElement("button", {
          type: "button",
          className: "stem-active-tool-back",
          onClick: function () {
            setStemLabTool(null);
            if (typeof announceToSR === 'function') announceToSR('Returned to all STEAM Lab tools');
          },
          "aria-label": "Back to all STEAM Lab tools",
          style: {
            backgroundColor: isContrast ? '#111' : (isDark ? 'rgba(99,102,241,0.18)' : '#eef2ff'),
            color: isContrast ? '#fbbf24' : (isDark ? '#c7d2fe' : '#3730a3'),
            borderColor: isContrast ? '#fbbf24' : 'rgba(99,102,241,0.35)'
          }
        }, /*#__PURE__*/React.createElement(ArrowLeft, { size: 15 }), /*#__PURE__*/React.createElement("span", null, "All tools")),
          /*#__PURE__*/React.createElement("span", {
            className: "stem-active-tool-icon",
            "aria-hidden": "true"
          }, _activeStemToolMeta.icon),
          /*#__PURE__*/React.createElement("div", {
            className: "stem-active-tool-title"
          }, /*#__PURE__*/React.createElement("h3", {
            style: { color: _pal.text }
          }, _activeStemToolMeta.label), /*#__PURE__*/React.createElement("p", {
            style: { color: _pal.textMuted }
          }, "Explore tool"))), /*#__PURE__*/React.createElement("div", {
            className: "stem-active-tool-actions"
          }, /*#__PURE__*/React.createElement("span", {
            className: "stem-active-tool-hint",
            style: { color: _pal.textMuted }
          }, "Esc or Alt+B returns to all tools"))),
        // ── Keyboard Help Panel ──
        _showKeyHelp && React.createElement("div", {
          role: "region", "aria-label": "Keyboard shortcuts",
          style: { padding: '12px 24px', borderBottom: '2px solid ' + _pal.border, background: isContrast ? '#111' : isDark ? '#1e293b' : '#f1f5f9' }
        },
          React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
            React.createElement("h3", { style: { margin: 0, fontSize: 13, fontWeight: 800, color: isContrast ? '#facc15' : '#4f46e5' } }, "\u2328\uFE0F Keyboard Shortcuts"),
            React.createElement("button", { onClick: function () { _setShowKeyHelp(false); }, "aria-label": "Close keyboard help", style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: _pal.textMuted, padding: 4 } }, "\u2715")
          ),
          React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', gap: '4px 16px', fontSize: 12 } },
            React.createElement("kbd", { style: { background: _pal.bgAlt, border: '1px solid ' + _pal.border, padding: '1px 6px', borderRadius: 3, fontFamily: 'monospace', fontSize: 11 } }, "Esc"),
            React.createElement("span", { style: { color: _pal.textMuted } }, stemLabTool ? "Close tool / Close lab" : "Close STEAM Lab"),
            React.createElement("kbd", { style: { background: _pal.bgAlt, border: '1px solid ' + _pal.border, padding: '1px 6px', borderRadius: 3, fontFamily: 'monospace', fontSize: 11 } }, "Alt+1"),
            React.createElement("span", { style: { color: _pal.textMuted } }, "Explore tab"),
            React.createElement("kbd", { style: { background: _pal.bgAlt, border: '1px solid ' + _pal.border, padding: '1px 6px', borderRadius: 3, fontFamily: 'monospace', fontSize: 11 } }, "Alt+2"),
            React.createElement("span", { style: { color: _pal.textMuted } }, "Create tab"),
            React.createElement("kbd", { style: { background: _pal.bgAlt, border: '1px solid ' + _pal.border, padding: '1px 6px', borderRadius: 3, fontFamily: 'monospace', fontSize: 11 } }, "Alt+B"),
            React.createElement("span", { style: { color: _pal.textMuted } }, "Back to tool grid"),
            React.createElement("kbd", { style: { background: _pal.bgAlt, border: '1px solid ' + _pal.border, padding: '1px 6px', borderRadius: 3, fontFamily: 'monospace', fontSize: 11 } }, "Tab"),
            React.createElement("span", { style: { color: _pal.textMuted } }, "Move between controls"),
            React.createElement("kbd", { style: { background: _pal.bgAlt, border: '1px solid ' + _pal.border, padding: '1px 6px', borderRadius: 3, fontFamily: 'monospace', fontSize: 11 } }, "?"),
            React.createElement("span", { style: { color: _pal.textMuted } }, "Toggle this help panel")
          ),
          // Gamepad controller mapping
          React.createElement("div", { style: { marginTop: 12, paddingTop: 10, borderTop: '1px solid ' + _pal.border } },
            React.createElement("h4", { style: { margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: isContrast ? '#facc15' : '#4f46e5' } }, "\uD83C\uDFAE Controller Support (Xbox / PlayStation / Generic)"),
            React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', gap: '3px 14px', fontSize: 11 } },
              React.createElement("span", { style: { fontWeight: 700, color: _pal.text } }, "L Stick"),
              React.createElement("span", { style: { color: _pal.textMuted } }, "Move (WASD)"),
              React.createElement("span", { style: { fontWeight: 700, color: _pal.text } }, "R Stick"),
              React.createElement("span", { style: { color: _pal.textMuted } }, "Look / Turn"),
              React.createElement("span", { style: { fontWeight: 700, color: _pal.text } }, "A / \u2A2F"),
              React.createElement("span", { style: { color: _pal.textMuted } }, "Jump / Click / Confirm"),
              React.createElement("span", { style: { fontWeight: 700, color: _pal.text } }, "B / \u25CB"),
              React.createElement("span", { style: { color: _pal.textMuted } }, "Close / Back"),
              React.createElement("span", { style: { fontWeight: 700, color: _pal.text } }, "X / \u25A1"),
              React.createElement("span", { style: { color: _pal.textMuted } }, "Interact (NPC)"),
              React.createElement("span", { style: { fontWeight: 700, color: _pal.text } }, "Y / \u25B3"),
              React.createElement("span", { style: { color: _pal.textMuted } }, "Measure"),
              React.createElement("span", { style: { fontWeight: 700, color: _pal.text } }, "LB"),
              React.createElement("span", { style: { color: _pal.textMuted } }, "Cycle tool/shape"),
              React.createElement("span", { style: { fontWeight: 700, color: _pal.text } }, "RB"),
              React.createElement("span", { style: { color: _pal.textMuted } }, "Place block"),
              React.createElement("span", { style: { fontWeight: 700, color: _pal.text } }, "LT"),
              React.createElement("span", { style: { color: _pal.textMuted } }, "Sprint"),
              React.createElement("span", { style: { fontWeight: 700, color: _pal.text } }, "RT"),
              React.createElement("span", { style: { color: _pal.textMuted } }, "Break block"),
              React.createElement("span", { style: { fontWeight: 700, color: _pal.text } }, "D-pad"),
              React.createElement("span", { style: { color: _pal.textMuted } }, "Select blocks 1-4"),
              React.createElement("span", { style: { fontWeight: 700, color: _pal.text } }, "Start"),
              React.createElement("span", { style: { color: _pal.textMuted } }, "Toggle fly mode"),
              React.createElement("span", { style: { fontWeight: 700, color: _pal.text } }, "Select"),
              React.createElement("span", { style: { color: _pal.textMuted } }, "Toggle grid")
            ),
            React.createElement("p", { style: { margin: '6px 0 0', fontSize: 10, color: _pal.textMuted, fontStyle: 'italic' } }, "Just connect your controller \u2014 it\u2019s auto-detected. Works with all 3D tools including Geometry World, Echo Navigator, SkySchool, Moon Mission, and Solar System.")
          )
        ),
        // ═══ XP Progress Overlay Panel ═══
        _showXpPanel && React.createElement("div", {
          role: "region", "aria-label": "STEAM Lab XP Progress",
          className: "relative",
          style: { borderBottom: '2px solid ' + _pal.border }
        },
          React.createElement("div", { className: "p-4 max-w-4xl mx-auto", style: { background: 'linear-gradient(135deg, #fffbeb, #fef3c7, #fffbeb)' } },
            React.createElement("div", { className: "flex items-center gap-2 mb-3" },
              React.createElement("span", { style: { fontSize: '20px', filter: 'drop-shadow(0 0 4px rgba(255,200,0,0.7))' } }, "\u2B50"),
              React.createElement("h4", { className: "text-sm font-black text-amber-800" }, "STEAM Lab XP Progress"),
              React.createElement("span", { className: "ml-auto text-xs font-black text-amber-700 px-2.5 py-1 rounded-full", style: { background: 'linear-gradient(135deg, #f59e0b, #eab308)', color: '#1e293b', boxShadow: '0 2px 6px rgba(245,158,11,0.3)' } }, totalStemXP + " Total XP"),
              React.createElement("button", { onClick: function() { _setShowXpPanel(false); }, "aria-label": "Close XP panel", className: "ml-2 p-1 rounded-full hover:bg-amber-200 transition-colors text-amber-800" }, "\u2715")
            ),
            (function () {
              // ── Dynamic XP activity discovery ──
              // Label + icon lookup for friendly display; any activityId not in this map
              // gets an auto-generated label from its camelCase/snake_case id
              var _xpLabelMap = {
                behaviorLab: ['Behavior Lab', '\uD83D\uDC2D'], aquarium: ['Aquarium', '\uD83D\uDC20'],
                ocean: ['Ocean', '\uD83D\uDC0B'], 'wave-match': ['Waves', '\uD83C\uDF0A'],
                'wave-quiz': ['Wave Quiz', '\uD83C\uDFB6'], galaxy_quiz: ['Galaxy Quiz', '\uD83C\uDF0C'],
                galaxy_explore: ['Galaxy Explorer', '\u2B50'], universe_explore: ['Universe', '\uD83C\uDF20'],
                solarSystem: ['Solar System', '\u2600\uFE0F'], physicsQuiz: ['Physics', '\uD83C\uDFAF'],
                chemBalance: ['Chemistry', '\uD83E\uDDEA'], circuit: ['Circuits', '\u26A1'],
                calculus: ['Calculus', '\u222B'], inequality: ['Inequalities', '\u2696\uFE0F'],
                molecule: ['Molecules', '\uD83E\uDDEC'], codingPlayground: ['Coding', '\uD83D\uDCBB'],
                algebraCAS: ['Algebra', '\uD83D\uDCD0'], dissection: ['Dissection', '\uD83D\uDD2C'],
                fractionChallenge: ['Fractions', '\uD83D\uDD22'], fractionViz: ['Fraction Lab', '\uD83C\uDF55'],
                fractionWall: ['Fraction Wall', '\uD83E\uDDF1'], cyberDefense: ['Cyber Defense', '\uD83D\uDEE1\uFE0F'],
                companion_planting_corn: ['Three Sisters', '\uD83C\uDF3D'], companion_planting_beans: ['Bean Planting', '\uD83E\uDED8'],
                companion_planting_squash: ['Squash', '\uD83C\uDF83'], companion_planting_grow: ['Growing', '\uD83C\uDF31'],
                companion_planting_harvest: ['Harvest', '\uD83C\uDF3E'], companion_planting_quiz: ['Garden Quiz', '\uD83D\uDCDD'],
                volume: ['Volume', '\uD83D\uDCE6'], numberline: ['Number Line', '\uD83D\uDCCF'],
                areamodel: ['Area Model', '\uD83D\uDFE7'], base10: ['Manipulatives', '\uD83E\uDDEE'],
                coordinate: ['Coordinates', '\uD83D\uDCCD'], protractor: ['Angles', '\uD83D\uDCD0'],
                geoSandbox: ['Geo Sandbox', '\uD83D\uDD37'], moneyMath: ['Money Math', '\uD83D\uDCB5'],
                multtable: ['Times Table', '\u2716\uFE0F'], dataPlot: ['Regression', '\uD83D\uDCC8'],
                dataStudio: ['Charts & Graphs', '\uD83D\uDCCA'], funcGrapher: ['Graphing', '\uD83D\uDCC9'],
                geometryProver: ['Geometry', '\uD83D\uDCD0'], logicLab: ['Logic Lab', '\uD83E\uDDE0'],
                probability: ['Probability', '\uD83C\uDFB2'], unitConvert: ['Unit Convert', '\uD83D\uDD04'],
                ecosystem: ['Ecosystem', '\uD83C\uDF3F'], waterCycle: ['Water Cycle', '\uD83D\uDCA7'],
                plateTectonics: ['Plate Tectonics', '\uD83C\uDF0B'], dnaLab: ['DNA Lab', '\uD83E\uDDEC'],
                cell: ['Cell Explorer', '\uD83D\uDD2C'], epidemicSim: ['Epidemic Sim', '\uD83E\uDDA0'],
                titrationLab: ['Titration', '\uD83E\uDDEA'], climateExplorer: ['Climate', '\uD83C\uDF21\uFE0F'],
                moonMission: ['Moon Mission', '\uD83C\uDF11'], appLab: ['App Lab', '\uD83D\uDCF1'],
                gameStudio: ['Game Studio', '\uD83C\uDFAE'], freeForms: ['Free Forms', '\uD83C\uDFDB\uFE0F'], lifeSkills: ['Life Skills', '\uD83D\uDD27'],
                popSim: ['Population Sim', '\uD83D\uDC3E'], targetMode: ['Target Mode', '\uD83C\uDFAF'],
                oratory_warmup: ['Oratory Warmup', '\uD83C\uDFA4'], oratory_phrase: ['Speech Practice', '\uD83D\uDDE3\uFE0F'],
                oratory_smooth_pacing: ['Pacing', '\u23F1\uFE0F'], geoQuiz: ['Geo Quiz', '\uD83C\uDF0D'],
                life: ['Life Sim', '\uD83C\uDF31']
              };
              function _xpLabel(id) {
                if (_xpLabelMap[id]) return { id: id, label: _xpLabelMap[id][0], icon: _xpLabelMap[id][1] };
                // Auto-generate from id: fire_sim_burn → Fire Sim Burn, circuitChallenge → Circuit Challenge
                var nice = id.replace(/[-_]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
                return { id: id, label: nice, icon: '\uD83E\uDDEA' };
              }
              // Build activity list dynamically from actual XP data
              var _xpActivities = [];
              var _xpKeys = Object.keys(stemXpData);
              _xpKeys.forEach(function(key) {
                if (key === '_total') return;
                if (!stemXpData[key] || typeof stemXpData[key].earned !== 'number' || stemXpData[key].earned <= 0) return;
                _xpActivities.push(_xpLabel(key));
              });
              // Sort: maxed first, then by earned descending
              _xpActivities.sort(function(a, b) {
                var ea = getStemXP(a.id), eb = getStemXP(b.id);
                if (ea >= 100 && eb < 100) return -1;
                if (eb >= 100 && ea < 100) return 1;
                return eb - ea;
              });
              var _earnedCount = _xpActivities.length;
              var _maxedCount = _xpActivities.filter(function(a) { return getStemXP(a.id) >= 100; }).length;
              return React.createElement(React.Fragment, null,
                React.createElement("div", { className: "mb-3" },
                  React.createElement("div", { className: "flex justify-between items-center mb-1" },
                    React.createElement("span", { className: "text-[10px] font-bold text-amber-700 uppercase" },
                      _earnedCount + " Active" + (_maxedCount > 0 ? " \u00B7 " + _maxedCount + " Maxed" : "")
                    ),
                    React.createElement("span", { className: "text-[10px] font-black text-amber-600" }, totalStemXP + " Total XP")
                  ),
                  React.createElement("div", { className: "w-full h-3 bg-amber-100 rounded-full overflow-hidden", style: { boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' } },
                    React.createElement("div", { className: "h-full rounded-full transition-all duration-700", style: {
                      width: Math.min(100, totalStemXP / 10) + '%',
                      background: totalStemXP >= 1000 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #f59e0b, #eab308, #f59e0b)',
                      backgroundSize: '200% 100%',
                      animation: 'stemXpShimmer 2s ease-in-out infinite',
                      boxShadow: '0 0 8px rgba(245,158,11,0.4)'
                    } })
                  )
                ),
                (function() {
                  if (_xpActivities.length === 0) {
                    return React.createElement("div", { className: "text-center py-6 text-amber-600" },
                      React.createElement("p", { className: "text-sm font-bold mb-1" }, "No XP earned yet!"),
                      React.createElement("p", { className: "text-xs text-amber-500" }, "Explore STEM tools and complete quizzes to earn XP. Your progress will appear here.")
                    );
                  }
                  return React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-[10px]" },
                    _xpActivities.map(function (act) {
                      var earned = getStemXP(act.id);
                      var pct = Math.min(100, earned);
                      var isMaxed = pct >= 100;
                      return React.createElement("div", { key: act.id, className: "bg-white rounded-lg p-2 border transition-all duration-200 hover:shadow-md", style: { borderColor: isMaxed ? '#10b981' : '#fde68a' } },
                        React.createElement("div", { className: "flex items-center gap-1 mb-1" },
                          React.createElement("span", { style: { fontSize: '12px' } }, act.icon),
                          React.createElement("span", { className: "font-bold truncate", style: { color: isMaxed ? '#059669' : '#334155', fontSize: '10px' } }, act.label)
                        ),
                        React.createElement("div", { className: "w-full h-1.5 rounded-full overflow-hidden", style: { background: '#fef3c7', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' } },
                          React.createElement("div", { className: "h-full rounded-full transition-all duration-500", style: {
                            width: pct + '%',
                            background: isMaxed ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                            boxShadow: isMaxed ? '0 0 4px rgba(16,185,129,0.4)' : 'none'
                          } })
                        ),
                        React.createElement("div", { className: "flex justify-between mt-0.5" },
                          React.createElement("span", { style: { color: isMaxed ? '#059669' : '#d97706', fontWeight: 700 } }, earned + "/100"),
                          isMaxed && React.createElement("span", { style: { color: '#059669', fontWeight: 900, fontSize: '11px' } }, "\u2714 MAX")
                        )
                      );
                    })
                  );
                })()
              );
            })()
          )
        ),
        /*#__PURE__*/React.createElement("div", {
          className: "stem-lab-scroll-region stemlab-styled-scrollbar flex-1 overflow-y-auto p-6",
          "data-stem-scroll-region": "true",
          "data-stem-scroll-contract": "vertical",
          tabIndex: 0,
          role: "region",
          "aria-label": stemLabTool && _activeStemToolMeta ? _activeStemToolMeta.label + " workspace" : "STEAM Lab workspace",
          style: {
            backgroundColor: _pal.bg,
            color: _pal.text,
            flex: '1 1 0%',
            minHeight: 0,
            maxHeight: '100%',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            scrollbarGutter: 'stable'
          }
        }, stemLabTab === 'create' && !showAssessmentBuilder && /*#__PURE__*/React.createElement("div", {
          className: "space-y-5 max-w-3xl mx-auto animate-in fade-in duration-200"
        }, /*#__PURE__*/React.createElement("div", {
          className: "flex items-center gap-2"
        }, [{
          id: 'topic',
          label: '📋 From Topic'
        }, {
          id: 'content',
          label: '📖 From My Content'
        }, {
          id: 'solve',
          label: '✏️ Solve One'
        }].map(m => /*#__PURE__*/React.createElement("button", { "aria-label": m.label.replace(/[^\w\s]/g, '').trim() + ' mode',
          key: m.id,
          onClick: () => setStemLabCreateMode(m.id),
          className: `px-4 py-2 rounded-xl text-sm font-bold transition-all ${stemLabCreateMode === m.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border border-slate-400 text-slate-600 hover:border-indigo-600 hover:text-indigo-600'}`
        }, m.label)), /*#__PURE__*/React.createElement("div", {
          className: "flex-1"
        }), /*#__PURE__*/React.createElement("button", {
          // Direct door to the live timed-fluency panel (MathFluencyPanel in the
          // sidebar math accordion). Before this, Create's only fluency path was
          // hidden inside the Assessment Builder \u2014 compose blocks, set every one
          // to "fluency", press Generate \u2014 which nobody would discover. Same
          // routing as that branch; the panel owns its own state.
          "aria-label": t('stem.fluency.probe_button_aria') || 'Open the timed fluency probe in the Math panel',
          onClick: () => {
            if (typeof setMathMode === 'function') setMathMode('Fluency Probes');
            if (typeof setExpandedTools === 'function') setExpandedTools(prev => (Array.isArray(prev) && prev.includes('math')) ? prev : [...(Array.isArray(prev) ? prev : []), 'math']);
            setShowStemLab(false);
            addToast(t('stem.fluency.panel_opened') || 'Fluency Probes is open in the Math panel. Set the operation and press Start.', 'info');
          },
          className: "px-4 py-2 rounded-xl text-sm font-bold bg-white text-indigo-700 border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all flex items-center gap-2"
        }, "\u23F1\uFE0F " + (t('stem.fluency.probe_button') || 'Fluency Probe')), /*#__PURE__*/React.createElement("button", { "aria-label": "Open assessment builder",
          onClick: () => setShowAssessmentBuilder(true),
          className: "px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-purple-200 hover:from-violet-600 hover:to-purple-600 transition-all flex items-center gap-2"
        }, "\uD83D\uDCCB Build Assessment")), stemLabCreateMode !== 'solve' && /*#__PURE__*/React.createElement("div", {
          className: "flex items-center gap-4"
        }, /*#__PURE__*/React.createElement("span", {
          className: "text-xs font-bold text-slate-500 uppercase"
        }, "Style:"), [{
          val: t('stem.solver.stepbystep'),
          label: t('stem.solver.stepbystep')
        }, {
          val: t('stem.solver.conceptual'),
          label: t('stem.solver.conceptual')
        }, {
          val: 'Real-World Application',
          label: t('stem.solver.realworld')
        }].map(s => /*#__PURE__*/React.createElement("button", { "aria-label": s.label + ' style',
          key: s.val,
          onClick: () => setMathMode(s.val),
          className: `px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mathMode === s.val ? 'bg-blue-100 text-blue-700 border border-blue-600' : 'bg-white border border-slate-400 text-slate-500 hover:border-blue-200'}`
        }, s.label))), /*#__PURE__*/React.createElement("div", {
          className: "bg-slate-50 rounded-xl p-4 border border-slate-400"
        }, /*#__PURE__*/React.createElement("textarea", {
          value: mathInput,
          onChange: e => setMathInput(e.target.value),
          placeholder: stemLabCreateMode === 'solve' ? 'Enter a math problem to solve step-by-step...' : stemLabCreateMode === 'content' ? 'Paste or describe content to generate math problems from...' : 'Enter topic, standard, or description (e.g. "3rd grade multiplication word problems")...',
          className: "w-full h-28 px-4 py-3 text-sm border border-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none bg-white",
          "aria-label": "Math problem input"
        }), stemLabCreateMode === 'content' && /*#__PURE__*/React.createElement("p", {
          // "From My Content" never needed the teacher to re-paste the lesson:
          // handleGenerateMath attaches the current source itself, gated on the
          // useMathSourceContext flag (a MathPanel checkbox, default on). The
          // placeholder said "Paste or describe content", so teachers pasted
          // text the app already holds. Say what will actually happen instead.
          className: "text-xs mt-2 font-semibold " + (useMathSourceContext !== false && hasSourceOrAnalysis ? "text-emerald-700" : "text-amber-700"),
          role: "note"
        }, useMathSourceContext !== false && hasSourceOrAnalysis
          ? (t('stem.solver.content_source_attached') || '📎 Your current lesson content is attached automatically. Describe what to focus on; no need to paste it.')
          : hasSourceOrAnalysis
            ? (t('stem.solver.content_source_off') || 'Source attachment is turned off in the Math panel settings, so only what you type here is used.')
            : (t('stem.solver.content_source_none') || 'No lesson content is loaded yet. Add source text first, or describe the content here.')
        ), stemLabCreateMode !== 'solve' && /*#__PURE__*/React.createElement("div", {
          className: "flex items-center gap-4 mt-3"
        }, /*#__PURE__*/React.createElement("span", {
          className: "text-xs font-bold text-slate-500"
        }, "Quantity:"), /*#__PURE__*/React.createElement("input", {
          type: "range",
          min: "1",
          max: "20",
          value: mathQuantity,
          onChange: e => setMathQuantity(parseInt(e.target.value)),
          // The visible "Quantity:" caption beside this slider is a <span>, which
          // names nothing. An unnamed range input announces only a bare number.
          "aria-label": "Quantity",
          className: "flex-1 h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        }), /*#__PURE__*/React.createElement("span", {
          className: "text-sm font-bold text-indigo-700 w-8 text-center"
        }, mathQuantity))), /*#__PURE__*/React.createElement("button", { "aria-label": "Generate math problems",
          onClick: () => {
            // Resolve the mode ONCE and hand it to handleGenerateMath as
            // modeOverride. This button used to stage the mode and navigate to
            // the math view without ever generating — the teacher had to find
            // the sidebar's Generate themselves. The staging-vs-state race that
            // likely caused that (a freshly set mode is not yet readable) is
            // exactly what the modeOverride parameter exists for.
            let resolvedMode;
            if (stemLabCreateMode === 'content') {
              resolvedMode = 'Word Problems from Source';
            } else if (stemLabCreateMode === 'solve') {
              resolvedMode = 'Freeform Builder';
            } else {
              resolvedMode = (mathMode === 'Freeform Builder' || mathMode === 'Word Problems from Source') ? 'Problem Set Generator' : mathMode;
            }
            setMathMode(resolvedMode);
            if (typeof handleGenerateMath === 'function') {
              // switchView=true: handleGenerateMath clears stale content and
              // sets activeView('math') itself.
              handleGenerateMath(mathInput, true, resolvedMode);
              // Close so the teacher sees the generation progress they just
              // started. The old "stay open" comment here dated from when this
              // button generated nothing, so closing WAS abrupt: it dumped you
              // on an unchanged math view. Assessment building is unaffected —
              // the Builder has its own generate path and stays open.
              setShowStemLab(false);
            } else {
              // Older host without the handler in the bag: old behaviour.
              setActiveView('math');
            }
          },
          disabled: !mathInput.trim(),
          className: "w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl text-sm hover:from-indigo-700 hover:to-blue-700 disabled:opacity-40 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
        }, /*#__PURE__*/React.createElement(Sparkles, {
          size: 16
        }), " ", stemLabCreateMode === 'solve' ? 'Solve Problem' : 'Generate Problems'), /*#__PURE__*/React.createElement("div", {
          className: "flex items-center gap-2 pt-1"
        }, /*#__PURE__*/React.createElement("span", {
          className: "text-[10px] text-slate-500 font-bold uppercase"
        }, "Tools:"), [{
          // @tool volume
          id: 'volume',
          icon: '📦',
          label: t('stem.assessment.volume_explorer')
        }, {
          id: 'numberline',
          icon: '📏',
          label: t('stem.assessment.number_line')
        }, {
          // @tool areamodel
          id: 'areamodel',
          icon: '🟧',
          label: t('stem.assessment.area_model')
        }, {
          id: 'fractionViz',
          icon: '🍕',
          label: t('stem.assessment.fraction_lab')
        }].map(tool => /*#__PURE__*/React.createElement("button", { "aria-label": "Open " + tool.label,
          key: tool.id,
          onClick: () => {
            setStemLabTab('explore');
            _openStemTool(tool.id, tool.label);
          },
          className: "px-2 py-1 text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center gap-1"
        }, tool.icon, " ", tool.label)))), stemLabTab === 'create' && showAssessmentBuilder && /*#__PURE__*/React.createElement("div", {
          className: "space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200"
        }, /*#__PURE__*/React.createElement("div", {
          className: "flex items-center justify-between"
        }, /*#__PURE__*/React.createElement("div", {
          className: "flex items-center gap-3"
        }, /*#__PURE__*/React.createElement("button", {
          onClick: () => setShowAssessmentBuilder(false),
          className: "p-1.5 hover:bg-slate-100 rounded-lg transition-colors",
          'aria-label': 'Back'
        }, /*#__PURE__*/React.createElement(ArrowLeft, {
          size: 18,
          className: "text-slate-500"
        })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
          className: "text-lg font-bold text-slate-800"
        }, "\uD83D\uDCCB Assessment Builder"), /*#__PURE__*/React.createElement("p", {
          className: "text-xs text-slate-500"
        }, "Compose blocks of different problem types into a custom assessment")))), /*#__PURE__*/React.createElement("div", {
          className: "space-y-2"
        }, assessmentBlocks.map((block, idx) => /*#__PURE__*/React.createElement("div", {
          key: block.id,
          className: "bg-white rounded-xl border-2 border-slate-200 hover:border-indigo-300 p-3 flex items-start gap-3 transition-all group",
          draggable: true,
          onDragStart: e => e.dataTransfer.setData('blockIdx', idx.toString()),
          onDragOver: e => e.preventDefault(),
          onDrop: e => {
            const fromIdx = parseInt(e.dataTransfer.getData('blockIdx'));
            const newBlocks = [...assessmentBlocks];
            const [moved] = newBlocks.splice(fromIdx, 1);
            newBlocks.splice(idx, 0, moved);
            setAssessmentBlocks(newBlocks);
          }
        }, /*#__PURE__*/React.createElement("div", {
          // Reordering used to be drag-only: this column held nothing but a
          // GripVertical in a plain div, so a keyboard or touch user could not
          // change block order at all (WCAG 2.5.7 dragging movements, 2.1.1
          // keyboard). The drag handlers above are kept — they still work for a
          // mouse — and these two native buttons are the equivalent path, the
          // same shape stem_tool_geologyexplorer.js already uses for its
          // reorderable list.
          //
          // The labels carry the POSITION rather than the block type, because
          // block.type is a machine value ('word_problems') and several blocks
          // commonly share one type — "Move block 2 up" is the only phrasing
          // that identifies which row is about to move.
          className: "flex flex-col items-center pt-1 text-slate-500 group-hover:text-slate-600"
        }, /*#__PURE__*/React.createElement("button", {
          type: "button",
          onClick: () => {
            if (idx === 0) return;
            const nb = [...assessmentBlocks];
            const [moved] = nb.splice(idx, 1);
            nb.splice(idx - 1, 0, moved);
            setAssessmentBlocks(nb);
            // Focus stays on this button, and its label silently becomes the
            // block's NEW position — a change a screen reader will not reliably
            // report on its own, so the move would be invisible to the user who
            // most needs confirming. stem_tool_coding.js announces its reorders
            // for exactly this reason.
            announceToSR('Block moved up to position ' + idx + ' of ' + assessmentBlocks.length + '.');
          },
          disabled: idx === 0,
          className: "px-1 leading-none text-xs rounded outline-none hover:text-indigo-600 focus:ring-2 focus:ring-indigo-400 disabled:opacity-30 disabled:hover:text-slate-500",
          "aria-label": "Move block " + (idx + 1) + " up"
        }, "▲"), /*#__PURE__*/React.createElement(GripVertical, {
          size: 16,
          className: "cursor-grab active:cursor-grabbing",
          "aria-hidden": "true"
        }), /*#__PURE__*/React.createElement("button", {
          type: "button",
          onClick: () => {
            if (idx >= assessmentBlocks.length - 1) return;
            const nb = [...assessmentBlocks];
            const [moved] = nb.splice(idx, 1);
            nb.splice(idx + 1, 0, moved);
            setAssessmentBlocks(nb);
            announceToSR('Block moved down to position ' + (idx + 2) + ' of ' + assessmentBlocks.length + '.');
          },
          disabled: idx >= assessmentBlocks.length - 1,
          className: "px-1 leading-none text-xs rounded outline-none hover:text-indigo-600 focus:ring-2 focus:ring-indigo-400 disabled:opacity-30 disabled:hover:text-slate-500",
          "aria-label": "Move block " + (idx + 1) + " down"
        }, "▼")), /*#__PURE__*/React.createElement("div", {
          className: "flex-1 space-y-2"
        }, /*#__PURE__*/React.createElement("div", {
          className: "flex items-center gap-2"
        }, /*#__PURE__*/React.createElement("select", {
          // 'aria-label': 'Question type' also sat here. This object already ends
          // with "aria-label": "Block type", and the last duplicate key wins, so
          // the first was dead — the control has always announced "Block type".
          value: block.type,
          onChange: e => {
            const nb = [...assessmentBlocks];
            nb[idx].type = e.target.value;
            setAssessmentBlocks(nb);
          },
          className: "px-3 py-1.5 text-sm font-bold border border-slate-400 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none",
          "aria-label": "Block type"
        }, /*#__PURE__*/React.createElement("option", {
          value: "computation"
        }, "\uD83D\uDD22 Computation"), /*#__PURE__*/React.createElement("option", {
          value: "word_problems"
        }, "\uD83D\uDCDD Word Problems"), /*#__PURE__*/React.createElement("option", {
          value: "fluency"
        }, "\u23F1\uFE0F Fluency Drill"), /*#__PURE__*/React.createElement("option", {
          value: "volume"
        }, "\uD83D\uDCE6 Volume"), /*#__PURE__*/React.createElement("option", {
          value: "fractions"
        }, "\uD83C\uDF55 Fractions"), /*#__PURE__*/React.createElement("option", {
          value: "geometry"
        }, "\uD83D\uDCD0 Geometry"), /*#__PURE__*/React.createElement("option", {
          value: "step_by_step"
        }, "\uD83D\uDCCA Step-by-Step"), /*#__PURE__*/React.createElement("option", {
          value: "custom"
        }, "\u2728 Custom"), /*#__PURE__*/React.createElement("option", {
          value: "manipulative"
        }, "\uD83E\uDDF1 Manipulative Response")), /*#__PURE__*/React.createElement("span", {
          className: "text-xs text-slate-500"
        }, "\xD7"), /*#__PURE__*/React.createElement("input", {
          type: "number",
          min: "1",
          max: "30",
          value: block.quantity,
          onChange: e => {
            const nb = [...assessmentBlocks];
            nb[idx].quantity = Math.max(1, parseInt(e.target.value) || 1);
            setAssessmentBlocks(nb);
          },
          className: "w-14 px-2 py-1.5 text-sm font-mono border border-slate-400 rounded-lg text-center",
          "aria-label": "Quantity"
        }), block.type === 'fluency' && /*#__PURE__*/React.createElement("span", {
          className: "px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full"
        }, "\u23F1 Timed"), block.type === 'manipulative' && /*#__PURE__*/React.createElement("span", {
          className: "px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-full"
        }, "\uD83E\uDDF1 Hands-on")), /*#__PURE__*/React.createElement("input", {
          value: block.directive,
          onChange: e => {
            const nb = [...assessmentBlocks];
            nb[idx].directive = e.target.value;
            setAssessmentBlocks(nb);
          },
          placeholder: "Directive (e.g. 'Single-digit multiplication', 'Division with remainders')...",
          // The placeholder was the only name this field had, and a placeholder
          // is gone the moment the user types — so anyone returning to a filled
          // form got an unlabelled text box (WCAG 3.3.2).
          "aria-label": "Block " + (idx + 1) + " directive",
          className: "w-full px-3 py-1.5 text-xs border border-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none placeholder-slate-300"
        })), /*#__PURE__*/React.createElement("button", {
          onClick: () => setAssessmentBlocks(assessmentBlocks.filter((_, i) => i !== idx)),
          className: "p-1 text-slate-500 hover:text-red-500 transition-colors",
          "aria-label": "Remove block"
        }, /*#__PURE__*/React.createElement(X, {
          size: 14
        }))))), /*#__PURE__*/React.createElement("button", { "aria-label": "+ Add Block",
          onClick: () => setAssessmentBlocks([...assessmentBlocks, {
            id: 'b-' + Date.now(),
            type: 'computation',
            quantity: 5,
            directive: ''
          }]),
          className: "w-full py-2.5 border-2 border-dashed border-slate-300 text-slate-400 font-bold text-sm rounded-xl hover:border-indigo-400 hover:text-indigo-500 transition-all"
        }, "+ Add Block"), assessmentBlocks.length > 0 && /*#__PURE__*/React.createElement("div", {
          className: "flex gap-3 pt-2"
        }, /*#__PURE__*/React.createElement("button", { "aria-label": "Generate assessment problems",
          onClick: () => {
            const fluencyBlocks = assessmentBlocks.filter(b => b.type === 'fluency');
            if (fluencyBlocks.length > 0 && assessmentBlocks.length === fluencyBlocks.length) {
              // Route to the LIVE fluency panel (MathFluencyPanel, mounted in the
              // sidebar math accordion under mathMode === 'Fluency Probes').
              // The old call here, startMathFluencyProbe(false), was the host's
              // DEAD implementation: its overlay was removed, so this button
              // showed a toast and nothing else while a 120s timer ran — and
              // before the finishMathFluencyProbe guard landed, that timer then
              // recorded a fabricated 0-attempt CBM result into the student's
              // probe history. The panel owns its own state, so all this button
              // must do is put it on screen.
              if (typeof setMathMode === 'function') setMathMode('Fluency Probes');
              if (typeof setExpandedTools === 'function') setExpandedTools(prev => (Array.isArray(prev) && prev.includes('math')) ? prev : [...(Array.isArray(prev) ? prev : []), 'math']);
              setShowStemLab(false);
              // Not the old "Fluency drill started!" key: nothing has started —
              // the panel opened, and saying otherwise is how this button lied
              // for a month. Fallback-first pattern matches the rest of this file.
              addToast(t('stem.fluency.panel_opened') || 'Fluency Probes is open in the Math panel. Set the operation and press Start.', 'info');
              return;
            }
            const nonFluencyBlocks = assessmentBlocks.filter(b => b.type !== 'fluency');
            // A MIXED assessment reaches here (the branch above only fires when
            // EVERY block is fluency), and fluency blocks cannot be generated
            // into a printed document — they are a timed interactive probe. They
            // used to be dropped without a word, so a teacher who composed
            // "10 computation + 1 fluency" got a document silently missing a
            // section. Say what is happening instead.
            if (fluencyBlocks.length > 0) {
              addToast(t('stem.fluency.mixed_blocks_note') || ('Note: ' + fluencyBlocks.length + ' fluency block(s) are not part of the generated document. Run them from the Math panel’s Fluency Probes mode.'), 'warning');
            }
            setMathInput('Building assessment: ' + nonFluencyBlocks.length + ' sections...');
            setMathMode('Freeform Builder');
            setActiveView('math');
            setShowStemLab(false);
            addToast('⏳ Generating assessment... ' + nonFluencyBlocks.length + ' sections', 'info');

            // Chunked generation: one callGemini per block, merge results, push to history once
            (async () => {
              const allProblems = [];
              let blockErrors = 0;
              for (let bi = 0; bi < nonFluencyBlocks.length; bi++) {
                const block = nonFluencyBlocks[bi];
                const blockLabel = block.type.replace(/_/g, ' ');
                addToast('🔄 Section ' + (bi + 1) + '/' + nonFluencyBlocks.length + ': ' + blockLabel + ' (' + block.quantity + ')...', 'info');
                const blockPrompt = 'You are an Expert Math Curriculum Designer.\n' +
                  'Generate EXACTLY ' + block.quantity + ' ' + blockLabel + ' math problems for grade ' + gradeLevel + '.\n' +
                  (block.directive && block.directive !== 'general' ? 'Focus area: ' + block.directive + '.\n' : '') +
                  'Subject: ' + (mathSubject || 'General Math') + '.\n\n' +
                  'Return a JSON object: {"title":"<section title>","problems":[{"question":"...","expression":"...","answer":<number or string>,"steps":[{"explanation":"...","latex":"..."}],"realWorld":"1-2 sentence real-life connection naming a specific career or situation where this skill is used — NOT a word problem restatement"}]}\n' +
                  'IMPORTANT: Return ONLY valid JSON. Every problem MUST have question, answer, and steps.';
                try {
                  const result = await callGemini(blockPrompt, true);
                  if (!result) throw new Error('Empty response');
                  let cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                  const startBrace = cleaned.indexOf('{');
                  if (startBrace > 0) cleaned = cleaned.substring(startBrace);
                  const endBrace = cleaned.lastIndexOf('}');
                  if (endBrace > 0) cleaned = cleaned.substring(0, endBrace + 1);
                  let parsed = null;
                  if (typeof window !== 'undefined' && window.jsonrepair) {
                    try { parsed = JSON.parse(window.jsonrepair(cleaned)); } catch (e) { /* fall through */ }
                  }
                  if (!parsed) parsed = JSON.parse(cleaned);
                  const problems = Array.isArray(parsed.problems) ? parsed.problems : (parsed.question ? [parsed] : []);
                  if (problems.length > 0) {
                    problems.forEach(p => { p._blockType = blockLabel; });
                    allProblems.push(...problems);
                    console.log('[ASSESS] Block ' + (bi + 1) + ' (' + blockLabel + '): ' + problems.length + ' problems parsed');
                  } else {
                    throw new Error('No problems in parsed response');
                  }
                } catch (e) {
                  console.warn('[ASSESS] Block ' + (bi + 1) + ' (' + blockLabel + ') failed:', e.message);
                  blockErrors++;
                }
                if (bi < nonFluencyBlocks.length - 1) {
                  await new Promise(r => setTimeout(r, 500));
                }
              }
              if (allProblems.length === 0) {
                addToast('Assessment generation failed — no problems could be generated. Try fewer sections.', 'error');
              } else {
                allProblems.forEach(p => {
                  if (!Array.isArray(p.steps)) p.steps = [];
                  p.steps = p.steps.map(s => typeof s === 'string' ? { explanation: s, latex: '' } : s);
                });
                const normalizedContent = {
                  title: 'Assessment: ' + (mathSubject || 'General Math') + ' (Grade ' + gradeLevel + ')',
                  problems: allProblems,
                  graphData: null
                };
                const newItem = {
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                  type: 'math',
                  data: normalizedContent,
                  meta: (mathSubject || 'General Math') + ' - Assessment',
                  title: normalizedContent.title,
                  timestamp: new Date(),
                  config: {}
                };
                setHistory(prev => [...prev, newItem]);
                // Trigger display by calling handleGenerateMath with a tiny prompt to show the last result
                // The problems are already in history, so user can access them from Resources
                if (blockErrors > 0) {
                  addToast('Assessment partially generated — ' + allProblems.length + ' problems (' + blockErrors + ' section(s) failed). Check Resources.', 'warning');
                } else {
                  addToast('✅ Assessment complete! ' + allProblems.length + ' problems across ' + nonFluencyBlocks.length + ' sections. Check Resources panel.', 'success');
                }
              }
            })();
          },
          className: "flex-1 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl text-sm hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
        }, /*#__PURE__*/React.createElement(Sparkles, {
          size: 16
        }), " Generate All (", assessmentBlocks.reduce((s, b) => s + b.quantity, 0), " problems)"), /*#__PURE__*/React.createElement("button", { "aria-label": "Save to Resources",
          onClick: () => {
            const stemAssessment = {
              id: 'stem-' + Date.now(),
              type: 'stem-assessment',
              title: t('stem.fluency.stem_assessment') + (mathSubject || 'General Math'),
              timestamp: Date.now(),
              data: {
                blocks: assessmentBlocks.map(b => ({
                  ...b
                })),
                subject: mathSubject || 'General Math',
                totalProblems: assessmentBlocks.reduce((s, b) => s + b.quantity, 0),
                results: null
              }
            };
            setHistory(prev => [...prev, stemAssessment]);
            addToast(t('stem.fluency.stem_assessment_saved_to_resources') + assessmentBlocks.length + ' blocks)', 'success');
          },
          className: "py-3 px-5 bg-gradient-to-r from-emerald-700 to-teal-700 text-white font-bold rounded-xl text-sm hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
        }, "\uD83D\uDCBE Save to Resources"),
          toolSnapshots.length > 0 && /*#__PURE__*/React.createElement("div", {
            // This is a section wrapper, and it used to carry role="button" +
            // tabIndex=0 + an e.target.click() key shim with NO onClick — so it
            // took focus, announced as an unnamed button, and did nothing when
            // activated. Worse, it wrapped the "Clear all" and "Open ..."
            // buttons in a button role, whose children ARIA treats as
            // presentational: the shim meant to improve access was putting the
            // controls that DID work at risk of being flattened out of the
            // accessibility tree. A plain div is correct here.
            //
            // The same e.target.click() shim elsewhere (companionplanting,
            // universe, galaxy) is paired with a real onClick and does work —
            // this was the only instance with nothing behind it.
            className: "mt-4 pt-4 border-t border-slate-200"
          }, /*#__PURE__*/React.createElement("div", {
            className: "flex items-center gap-2 mb-3"
          }, /*#__PURE__*/React.createElement("h4", {
            className: "text-sm font-bold text-slate-700"
          }, "\uD83D\uDCF8 Tool Snapshots (", toolSnapshots.length, ")"), /*#__PURE__*/React.createElement("button", { "aria-label": "Clear all",
            onClick: () => setToolSnapshots([]),
            className: "text-[10px] text-slate-500 hover:text-red-500 transition-colors"
          }, "\u21BA Clear all")), /*#__PURE__*/React.createElement("div", {
            className: "grid grid-cols-2 gap-2"
          }, toolSnapshots.map((snap, si) => /*#__PURE__*/React.createElement("div", {
            key: snap.id,
            className: "bg-white rounded-lg p-2.5 border border-slate-400 hover:border-indigo-300 transition-all group"
          }, /*#__PURE__*/React.createElement("div", {
            className: "flex items-center gap-2"
          }, /*#__PURE__*/React.createElement("span", {
            className: "text-sm"
          }, snap.tool === 'volume' ? '📦' : snap.tool === 'base10' ? '🧮' : snap.tool === 'coordinate' ? '📍' : snap.tool === 'codingPlayground' ? '🔬' : '📐'), /*#__PURE__*/React.createElement("span", {
            className: "text-xs font-bold text-slate-700 flex-1 truncate"
          }, snap.label), /*#__PURE__*/React.createElement("button", { "aria-label": "Open " + snap.label + " snapshot",
            onClick: () => {
              setStemLabTab('explore');
              _openStemTool(snap.tool, snap.label);
              if (snap.tool === 'volume' && snap.data) {
                if (snap.mode === 'slider' && snap.data.dims) {
                  setCubeBuilderMode('slider');
                  setCubeDims(snap.data.dims);
                } else if (snap.data.positions) {
                  setCubeBuilderMode('freeform');
                  setCubePositions(new Set(snap.data.positions));
                }
                if (snap.rotation) setCubeRotation(snap.rotation);
              }
              if (snap.tool === 'base10' && snap.data) setBase10Value(snap.data);
              if (snap.tool === 'coordinate' && snap.data) setGridPoints(snap.data.points || []);
              if (snap.tool === 'protractor' && snap.data) setAngleValue(snap.data.angle || 45);
              if (snap.tool === 'codingPlayground' && snap.data) setLabToolData(function (prev) { return Object.assign({}, prev, { _codingPlayground: snap.data }); });
              // Machine Lab saves a curated design payload (the machine and its
              // conditions, not transient shot or wall state). It fills any key
              // it is missing from its own defaults on render, so a partial
              // payload restores cleanly rather than blanking the tool.
              if (snap.tool === 'machineLab' && snap.data) setLabToolData(function (prev) { return Object.assign({}, prev, { machineLab: Object.assign({}, prev.machineLab, snap.data) }); });
            },
            className: "text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
          }, "\u21A9 Load"), /*#__PURE__*/React.createElement("button", { "aria-label": "Set Tool Snapshots",
            onClick: () => setToolSnapshots(prev => prev.filter((_, idx) => idx !== si)),
            className: "text-slate-500 hover:text-red-500 transition-colors"
          }, /*#__PURE__*/React.createElement(X, {
            size: 12
          }))), /*#__PURE__*/React.createElement("div", {
            className: "text-[10px] text-slate-500 mt-1"
          }, new Date(snap.timestamp).toLocaleTimeString()))))))), stemLabTab === 'explore' && !stemLabTool && (() => {
            var _allStemTools = [
              { id: '_cat_MathFundamentals', icon: '', label: t('stem.tools_menu.math_fundamentals'), desc: '', color: 'slate', chip: 'math', palette: ['blue', 'cyan', 'indigo'], category: true },
              {
                id: 'numberline',
                icon: '📏',
                label: t('stem.assessment.number_line'),
                desc: 'Interactive number line with draggable markers. Great for addition, subtraction, fractions.',
                color: 'blue',
                ready: true
              },
              {
                id: 'areamodel',
                icon: '🟧',
                label: t('stem.assessment.area_model'),
                desc: 'Visual multiplication and division with color-coded rows and columns.',
                color: 'amber',
                ready: true
              },
              {
                id: 'arithmeticStudio',
                icon: '➕',
                label: 'Arithmetic Strategy Studio',
                desc: 'Learn all four operations through models, strategies, estimation, and mistake analysis.',
                color: 'blue',
                ready: true
              },
              {
                id: 'fractionViz',
                aliases: ['fractions'],
                icon: '🍕',
                label: t('stem.assessment.fraction_lab'),
                desc: 'Compare fractions side-by-side (Compare tab) or practice with interactive challenges (Challenge tab).',
                color: 'rose',
                ready: true
              },
              {
                // @tool base10
                id: 'base10',
                icon: '🧮',
                label: 'Math Manipulatives',
                desc: 'Base-10 blocks, abacus & slide rule. Explore place value, counting, and multiplication with hands-on tools.',
                color: 'orange',
                ready: true
              },

              {
                // @tool multtable
                id: 'multtable',
                icon: '🔢',
                label: t('stem.tools_menu.multiplication_table'),
                desc: 'Interactive times table grid. Spot patterns, practice facts with challenges.',
                color: 'pink',
                ready: true
              },
              {
                id: 'ratioLab',
                icon: '➗',
                label: 'Ratios, Rates & Proportions Lab',
                desc: 'Explore ratio tables, double number lines, unit rates, percents, and proportional relationships.',
                color: 'indigo',
                ready: true
              },
              {
                id: 'moneyMath', icon: '💵', label: 'Money Math',
                desc: 'Coins, bills, making change, grocery store sim, money word problems, and currency exchange. Multi-currency with USD, EUR, GBP & more.',
                color: 'emerald', ready: true
              },

              {
                id: 'unitConvert', icon: '🔄', label: t('stem.tools_menu.unit_converter'),
                desc: 'Convert between metric and imperial units for length, mass, volume, and more.',
                color: 'teal', ready: true
              },
              {
                id: 'timeSchedule',
                icon: '\uD83D\uDD70\uFE0F',
                label: 'Time & Schedule Lab',
                desc: 'Link clocks, model elapsed time, reason about schedules, and convert 12/24-hour time.',
                color: 'sky',
                ready: true
              },
              { id: '_cat_AdvancedMath', icon: '', label: t('stem.tools_menu.advanced_math'), desc: '', color: 'slate', chip: 'math', palette: ['indigo', 'violet'], category: true },
              {
                // @tool funcGrapher
                id: 'funcGrapher', icon: '📈', label: t('stem.tools_menu.function_grapher'),
                desc: 'Plot linear, quadratic, and trig functions. Adjust coefficients in real-time.',
                aliases: ['trigonometry', 'sine', 'cosine', 'amplitude', 'period'], color: 'indigo', ready: true
              },
              {
                id: 'inequality', icon: '↕️', label: t('stem.tools_menu.inequality_grapher'),
                desc: t('stem.tools_menu.graph_inequalities_on_number_lines'),
                color: 'fuchsia', ready: true
              },
              {
                id: 'calculus', icon: '∫', label: t('stem.tools_menu.calculus_visualizer'),
                desc: 'Riemann sums, area under curves, and derivative tangent lines.',
                color: 'red', ready: true
              },
              {
                id: 'algebraCAS', icon: '🔣', label: 'Algebra Solver',
                desc: 'Step-by-step equation solving, factoring, simplification — powered by AI. See every algebraic rule applied.',
                color: 'amber', ready: true
              },
              {
                id: 'graphCalc', icon: '📟', label: 'Graphing Calculator',
                desc: 'Type equations, plot functions, explore data. Learn what every button really does.',
                color: 'indigo', ready: true
              },
              { id: '_cat_GeometryMeasurement', icon: '', label: '\uD83D\uDCD0 Geometry & Measurement', desc: '', color: 'slate', chip: 'math', palette: ['cyan', 'blue', 'indigo'], category: true },
              {
                id: 'volume',
                icon: '📦',
                label: '3D Volume Explorer',
                desc: 'Build rectangular prisms with unit cubes. Rotate, zoom, explore layers.',
                color: 'emerald',
                ready: true
              },
              {
                id: 'areaPerimeter',
                icon: '🟦',
                label: 'Area & Perimeter Lab',
                desc: 'Tile, compare, decompose, and investigate 2-D shapes while building measurement reasoning.',
                color: 'teal',
                ready: true
              },
              {
                // @tool coordinate
                id: 'coordinate',
                icon: '📍',
                label: t('stem.tools_menu.coordinate_grid'),
                desc: t('stem.tools_menu.plot_points_draw_lines_and'),
                color: 'cyan',
                ready: true
              },
              {
                // @tool protractor
                id: 'protractor',
                icon: '📐',
                label: t('stem.tools_menu.angle_explorer'),
                desc: 'Measure and construct angles. Classify acute, right, obtuse, and reflex.',
                color: 'purple',
                ready: true
              },
              {
                id: 'geoSandbox', icon: '\uD83D\uDD37', label: 'Geometry Sandbox',
                desc: 'Build 3D shapes, measure properties, and export STL files for 3D printing.',
                color: 'sky', ready: true
              },
              { id: 'geometryProver', icon: '🔺', label: 'Geometry Prover', desc: 'Construct geometric proofs step-by-step with interactive diagrams.', color: 'violet', ready: true },
              { id: 'geometryWorld', icon: '\uD83E\uDDF1', label: 'Geometry World', desc: 'Explore a 3D world where geometry questions unlock new areas. Talk to NPCs and solve shape puzzles!', color: 'purple', ready: true },
              { id: '_cat_DataStatsProbability', icon: '', label: '\uD83D\uDCCA Data, Statistics & Probability', desc: '', color: 'slate', chip: 'math', palette: ['blue', 'indigo', 'cyan'], category: true },
              {
                id: 'probability', icon: '\uD83C\uDFB2', label: t('stem.tools_menu.probability'),
                desc: 'Coin flips, dice rolls, and spinners. Visualize outcomes and explore chance.',
                color: 'sky', ready: true
              },
              {
                id: 'statsLab', icon: '🔎', label: 'Statistical Tests',
                desc: 'Inferential statistics: t-tests, ANOVA, correlation, regression, chi-square, non-parametric, power analysis. AP Psych / AP Bio focus. Transparent computation, plain-English results, APA write-ups, AI interpretation grader.',
                color: 'sky', ready: true
              },
              {
                // @tool dataStudio — Data Plotter (dataPlot) was merged in here on
                // 2026-08-03 as the "Regression" mode. dataPlot is still registered as a
                // plugin (rendered by this tool) but intentionally has no tile of its
                // own; it is listed in intentionallyHiddenRegisteredIds in
                // dev-tools/check_stem_tile_catalog.cjs. The alias keeps deep links and
                // searches for the old name working.
                id: 'dataStudio', icon: '📊', label: 'Charts & Graphs',
                aliases: ['dataPlot'],
                desc: 'Bar, pie, line, scatter, box & histogram charts. Import CSV or enter your own data. Switch to Regression mode for curve fitting, R², residuals and outlier analysis.',
                color: 'cyan', ready: true
              },
              {
                id: 'dataLab', icon: '\uD83D\uDDC2\uFE0F', label: 'CODAP Data Science',
                desc: 'Real data science in CODAP \u2014 the Concord Consortium\u2019s open data workspace \u2014 with an AlloFlow Socratic tutor beside it that sees the shape of your data (names and counts, never values) and asks questions instead of giving answers.',
                color: 'indigo', ready: true
              },
              {
                // @tool lumen
                id: 'lumen', icon: '💡', label: 'Lumen Research Canvas',
                desc: 'Reactive research canvas — collect, analyze & present as one honest, provenance-bound object. 9 chart types, correlation-not-causation guards, FERPA-aware exports.',
                color: 'amber', ready: true
              },
              { id: '_cat_LifeScienceGenetics', icon: '', label: '\uD83E\uDDEC Life Science & Genetics', desc: '', color: 'slate', chip: 'science', palette: ['emerald', 'cyan'], category: true },
              {
                // @tool cell
                id: 'cell', icon: '🔬', label: t('stem.tools_menu.cell_simulator'),
                desc: 'Microscope mode: observe, control, and quiz on living organisms. Earn XP!',
                color: 'green', ready: true
              },
              {
                id: 'dissection', icon: '🐸', label: 'Dissection Lab',
                desc: 'Virtual frog dissection — peel back layers to explore organs, muscles, and skeleton.',
                color: 'emerald', ready: true
              },
              {
                id: 'treeLab', icon: '🌳', label: 'Tree Life Lab',
                desc: 'Photosynthesis at the whole-tree scale in 3D: what limits the rate hour to hour, what a big tree spends just staying alive, why rings narrow with age, and how trees make more of themselves with seeds and without.',
                color: 'emerald', ready: true
              },
              {
                id: 'cellAtlasLab', icon: '\u2237', label: 'Cell Atlas Lab',
                desc: 'Classify human pancreatic cell types from gene-expression evidence, compare marker profiles, solve mystery cells, and follow insulin toward AlphaFold structure.',
                color: 'cyan', ready: true
              },
              { id: 'dnaLab', icon: '🧬', label: 'DNA Lab', desc: 'Extract, sequence, and analyze DNA. Explore genetics through interactive experiments.', color: 'emerald', ready: true },
              {
                id: 'punnett', icon: '👪', label: t('stem.tools_menu.punnett_square'),
                desc: 'Genetic crosses with alleles. Predict genotype and phenotype ratios.',
                color: 'violet', ready: true
              },
              { id: 'microbiology', icon: '\uD83E\uDD7C', label: 'Microbiology Lab', desc: 'NGSS MS-LS1 + HS-LS1 + HS-LS3 + HS-LS4. The microbial world: bacteria (beneficial + pathogenic), viruses (COVID, flu, HIV, phages, measles), microscopy (light + phase + fluorescent + EM + AFM), antibiotic resistance evolution, the human + soil + ocean microbiome, vaccines + immune system, fermentation (sourdough, yogurt, kimchi, sauerkraut, kombucha, cheese), case studies (Snow, Fleming, MRSA, COVID/mRNA, FMT), quiz, printable lab safety + microbes reference.', color: 'emerald', ready: true },
              { id: 'epidemicSim', icon: '\uD83E\uDDA0', label: 'Epidemic Simulator', desc: 'Model disease spread with SIR/SEIR models. Adjust R0, vaccination rates, and social distancing. Flatten the curve!', color: 'red', ready: true },
              {
                id: 'evoLab', icon: '🦎', label: 'EvoLab: Evolution',
                desc: 'Evolution + natural selection: Selection Sandbox, Galápagos Beak Lab, Phylogenetic Tree Builder, plus quick labs on Hardy-Weinberg, genetic drift, common ancestry, evolution misconceptions. Maine wildlife examples.',
                color: 'emerald', ready: true
              },
              {
                id: 'organismId', icon: '🧬', label: 'Taxonomy Explorer',
                desc: 'Walk the ranked tree of life, meet the lookalike pairs that fool experienced foragers, and learn why the boxes keep moving — Linnaean ranks vs cladistics, what a species even is, and the organisms that break the system. Photo identification is built but held back pending expert review of its hazard copy.',
                color: 'emerald', ready: true,
                aliases: ['taxonomy', 'classification', 'organism id', 'identify organism', 'linnaean', 'cladistics', 'species', 'lookalikes', 'mimicry', 'tree of life', 'dichotomous key']
              },
              { id: 'dinoLab', icon: '🦕', label: 'Dino Lab', desc: 'Explore 360+ dinosaurs across deep time: search, compare, dig fossils, build food webs, and meet the bird connection — with how-we-know notes on every species.', color: 'emerald', ready: true },
              {
                id: 'alphaFoldExplorer', icon: '\u03B1', label: 'AlphaFold Explorer',
                desc: 'Look up public AlphaFold DB protein structures by UniProt/accession, inspect them in Mol*, import downloaded prediction files, and prepare AlphaFold Server-ready JSON with guardrails for public or synthetic classroom sequences only.',
                color: 'teal', ready: true
              },
              { id: '_cat_HumanBodyHealth', icon: '', label: '\uD83E\uDEC0 Human Body, Health & Safety', desc: '', color: 'slate', chip: 'science', palette: ['rose', 'violet', 'orange', 'rose', 'orange'], category: true },
              {
                id: 'anatomy', icon: '🫀', label: t('stem.tools_menu.human_anatomy'),
                desc: 'Explore all 11 body systems with interactive canvas — skeletal, muscular, circulatory, nervous, and more.',
                color: 'rose', ready: true
              },
              {
                id: 'brainAtlas', icon: '🧠', label: t('stem.tools_menu.brain_atlas'),
                desc: 'Detailed cerebral regions, lobes, nuclei and clinical correlations. Lateral, medial, inferior & coronal views.',
                color: 'purple', ready: true
              },
              {
                id: 'nutritionLab', icon: '🥗', label: 'NutritionLab: Nutrition Science',
                desc: 'Adolescent-safe nutrition science: macros, micros, food labels, metabolism, digestion, food + mental health, eating-disorder awareness. Physiology-first framing — NOT weight-loss. Sources: USDA / NIH / Harvard / AAP / NEDA.',
                color: 'green', ready: true
              },
              {
                id: 'firstResponse', icon: '🚑', label: 'First Response Lab',
                desc: 'Recognize + respond to medical emergencies. Hands-only CPR rhythm trainer, AED walkthrough, Stop the Bleed, choking, seizure, stroke, anaphylaxis. Disability-affirming peer response. Maine 911 + text-to-911. Educational only.',
                color: 'rose', ready: true
              },
              {
                id: 'kitchenLab', icon: '🍳', label: 'Kitchen Lab',
                desc: 'Cooking life skills + culinary science: USDA safe temps + bacteria danger zone, knife cuts (dice/julienne/chiffonade/brunoise), heat techniques (sauté/sear/simmer/braise/roast/fry/steam), Maillard chemistry, top-9 allergens, real-time recipe sim (coming next ship). Sister to NutritionLab + BakingScience.',
                color: 'orange', ready: true
              },
              { id: '_cat_EcologyEnvironment', icon: '', label: '\uD83C\uDF0D Ecology, Environment & Animals', desc: '', color: 'slate', chip: 'science', palette: ['emerald', 'cyan', 'amber'], category: true },
              {
                // @tool ecosystem
                id: 'ecosystem', icon: '\uD83D\uDC3A', label: 'Ecosystem',
                desc: 'Predator-prey dynamics with Lotka-Volterra simulation. Adjust birth and death rates.',
                color: 'emerald', ready: true
              },
              {
                id: 'companionPlanting', icon: '\uD83C\uDF31', label: 'Companion Planting Lab',
                desc: 'Explore the ancient milpa / Three Sisters system \u2014 corn, beans, and squash growing in symbiosis. Soil chemistry, nitrogen cycles, and 7,000 years of agricultural science.',
                color: 'emerald', ready: true
              },
              {
                id: 'beehive', icon: '\uD83D\uDC1D', label: 'Beehive Colony Simulator',
                desc: 'Manage a living honeybee colony \u2014 nectar economics, waggle dances, seasonal cycles, threats, and the science of superorganisms. Connected to Companion Planting!',
                color: 'amber', ready: true
              },
              {
                id: 'climateExplorer', icon: '\uD83C\uDF0D', label: 'Climate Explorer',
                desc: 'Carbon calculator, renewables impact simulator, climate justice map, and solutions spotlight. Understand your footprint, design clean energy futures, and discover real-world innovations.',
                color: 'emerald', ready: true
              },
              {
                id: 'stewardshipHub', icon: '♻️', label: 'Environmental Stewardship Campaigns',
                desc: 'Fifteen environmental stewardship campaigns across eleven regions. Five deep multi-period Maine campaigns plus ten cross-region scenarios across all five mechanic families: fire (Yarralin Australia, Karuk Northern California), conservation (Yellowstone, Akagera Rwanda), public health (Mumbai dengue, Liberia 2014 Ebola), watershed (Klamath River, Murray\u2013Darling Basin), climate (Marshall Islands, Bangladesh delta). Family Pairing Insights unlock when you complete Maine + cross-region in the same mechanic family.',
                color: 'emerald', ready: true
              },
              {
                id: 'fireEcology', icon: '\uD83D\uDD25', label: 'Fire Ecology & Indigenous Stewardship',
                desc: 'Explore 65,000+ years of Indigenous fire knowledge, fire-adapted ecosystems, prescribed burn planning, and forest management science. Centers Aboriginal Australian, Karuk, Martu, Plains Nations, and more.',
                color: 'orange', ready: true
              },
              {
                id: 'renewablesLab', icon: '\u26A1', label: 'Renewables Lab',
                desc: 'How each renewable source actually generates electricity. Live sliders for solar PV, wind (Betz limit + cube of wind speed), hydro (head x flow), geothermal (depth x gradient), CSP, wave/tidal, biomass, and storage. Cited to NREL, IEA, IRENA.',
                color: 'green', ready: true
              },
              {
                id: 'aquarium', icon: '🐠', label: 'Aquaculture & Ocean Lab',
                desc: 'Manage aquarium tanks, simulate sustainable fishing, and explore marine ecosystems. Water chemistry, population dynamics and species studies.',
                color: 'cyan', ready: true
              },
              { id: 'birdLab', icon: '\uD83D\uDC26', label: 'BirdLab: I-Spy Ornithology', desc: 'Layered habitat I-Spy with animated birds whose movement signatures double as field marks. Field Marks Trainer, Beak & Feet Lab, Bird Calls, Maine Birds Spotlight, Migration, Citizen Science, Photo ID, and a Life List that persists across habitats. Pairs with Cornell Lab\u2019s Merlin Bird ID.', color: 'emerald', ready: true },
              { id: 'raptorHunt', icon: '\uD83E\uDD85', label: 'Raptor Hunt: Predator Physics + Biology', desc: 'Three.js stoop simulator + deep science of raptor hunt mechanics. Fly as a peregrine at 240 mph, a harpy with 530 psi talons, or a silent great horned owl. 8 species + 12 sections covering talon force, vision (4-8\u00D7 human, UV in kestrels), flight physics, owl silent flight, terminal-velocity calculator, DDT recovery + ongoing conservation crises, field ID by silhouette + gestalt.', color: 'amber', ready: true },
              { id: 'migration', icon: '\uD83E\uDDED', label: 'Animal Migration Lab', desc: 'Explore 3D migration routes, navigation, climate triggers, conservation challenges, and an explicit monarch butterfly simulation.', color: 'teal', ready: true },
              {
                id: 'cephalopodLab', icon: '🐙', label: 'Cephalopod Lab',
                desc: 'Marine biology + behavioral science of octopuses, squid, cuttlefish, nautilus. Headline: Hunter Sim — pick species + habitat + prey + tactic, run the camouflage minigame, time the strike. Unlocks field-note biology trivia (chromatophore mechanics, 9 brains, blue blood, jet propulsion). 10-species field guide with intelligence + camouflage + jet-speed stats.',
                color: 'indigo', ready: true
              },
              {
                id: 'petsLab', icon: '🐾', label: 'Science of Pets Lab',
                desc: 'Companion-animal SCIENCE: physiology, ethology, nutrition, genetics, domestication, zoonoses. Service & support animals. Cross-species training that assumes BehaviorLab\'s operant theory.',
                color: 'amber', ready: true
              },
              {
                id: 'decomposer', icon: '🧫', label: t('stem.tools_menu.decomposer'), desc: t('stem.tools_menu.break_materials_into_elements'),
                color: 'lime', ready: true
              },
              { id: '_cat_EarthSpaceScience', icon: '', label: '\uD83C\uDF0E Earth & Space Science', desc: '', color: 'slate', chip: 'science', palette: ['amber', 'orange', 'cyan'], paletteBreaks: { astronomy: ['indigo', 'blue', 'violet'] }, category: true },
              // @tool rocks
              { id: 'rocks', icon: '🪨', label: t('stem.tools_menu.rocks_minerals'), desc: t('stem.tools_menu.interactive_rock_cycle_mineral_properties'), color: 'amber', ready: true },
              {
                id: 'rockCycle', icon: '🔁', label: t('stem.tools_menu.rock_cycle'),
                desc: 'Trace the transformation of igneous, sedimentary, and metamorphic rocks.',
                color: 'stone', ready: true
              },
              {
                id: 'waterCycle', icon: '💧', label: t('stem.tools_menu.water_cycle'),
                desc: 'Follow water through evaporation, condensation, precipitation, and collection.',
                color: 'cyan', ready: true
              },
              {
                id: 'weatherSystems', icon: '\uD83C\uDF26\uFE0F', label: 'Weather Systems & Forecasting',
                desc: 'Explore fronts, pressure, humidity, wind, radar, station models, severe-weather hazards, and evidence-based forecasting.',
                color: 'sky', ready: true
              },
              { id: 'plateTectonics', icon: '🌋', label: 'Plate Tectonics', desc: 'Explore tectonic plates, earthquakes, volcanoes, and continental drift.', aliases: ['convection', 'mantle convection', 'heat transfer'], color: 'orange', ready: true },
              { id: 'geologyExplorer', icon: '⛰️', label: 'Geology Explorer', desc: 'Dig a 3D voxel cross-section of the crust — identify rocks, read the layers, and find the pluton that cuts them.', color: 'amber', ready: true },
              { id: 'geoQuiz', icon: '🗺️', label: 'Geography Quiz', desc: 'Test your world geography knowledge with interactive maps, flags, and capitals.', color: 'sky', ready: true },
              // gisStudio registers itself in stem_tool_gisstudio.js but had NO tile here,
              // so a finished, tested, mirrored tool was unreachable from the picker —
              // check_stem_tile_catalog and stem_plugin_fallback_allowlist were both red
              // on exactly this. Icon written as escapes (matching how the tool declares
              // its own icon) so it cannot be re-encoded into mojibake.
              // NB: no apostrophes in comments inside this array — the catalog gate
              // tracks quote state as it scans and an unpaired one blinds it.
              { id: 'gisStudio', icon: '🌐', label: 'GIS Studio', desc: 'Build, compare, compose, sequence, annotate, and export accessible GIS and remote-sensing investigations: import CSV/GeoJSON, choropleths, buffers, change over time, NDVI/NDWI/NDBI, swipe scenes, story maps, and table-first evidence reports.', color: 'teal', ready: true },
              { id: 'astronomy', icon: '🔭', label: 'Night Sky & Astronomy', desc: 'Earth & Space Science: constellations (with Wabanaki + cross-cultural sky traditions), moon phases, planets, seasons, stars, galaxies, eclipses, observing practice, light-pollution awareness. NGSS MS-ESS1 + HS-ESS1. Place-based for Maine. Printable observing checklists.', color: 'indigo', ready: true },
              {
                // @tool solarSystem
                id: 'solarSystem', icon: '🪐', label: 'Solar System',
                desc: '3D interactive solar system with orbit, zoom, planet facts and quiz.',
                color: 'blue', ready: true
              },
              {
                // @tool moonMission
                id: 'moonMission', icon: '\uD83D\uDE80', label: 'Moon Mission',
                desc: 'Full Apollo mission simulator — launch, orbit, land on the Moon, walk in 1/6 gravity, collect rocks, and splash down!',
                color: 'slate', ready: true
              },
              {
                // @tool spaceStation
                id: 'spaceStation', icon: '🛰️', label: 'Space Station',
                desc: 'Explore a clickable 3D map of the ISS, live an astronaut’s day, trace the water and air recycling loops, and run real orbital mechanics in the Orbit Lab.',
                color: 'sky', ready: true
              },
              {
                // @tool galaxy
                id: 'galaxy', icon: '\uD83C\uDF0C', label: t('stem.tools_menu.galaxy_explorer'),
                desc: 'Fly through a 3D Milky Way. Discover star types, nebulae, and black holes.',
                color: 'indigo', ready: true
              },
              {
                id: 'universe', icon: '\uD83C\uDF20', label: t('stem.tools_menu.universe_timelapse'),
                desc: 'Experience 13.8 billion years of cosmic history, from the Big Bang to the far future.',
                color: 'violet', ready: true
              },
              { id: '_cat_Physics&Chemistry', icon: '', label: t('stem.tools_menu.physics_chemistry'), desc: '', color: 'slate', chip: 'science', palette: ['cyan', 'orange', 'violet'], paletteBreaks: { molecule: ['amber', 'emerald', 'violet'] }, category: true },
              {
                // @tool wave
                id: 'wave', icon: '🌊', label: t('stem.tools_menu.wave_simulator'),
                desc: 'Adjust frequency, amplitude, wavelength. Explore interference patterns.',
                color: 'cyan', ready: true
              },
              { id: 'heatLab', icon: '🌡️', label: 'Heat & Thermodynamics Lab', desc: 'Conduction, convection and radiation on a real heat-equation model; insulation R-values; calorimetry mixing; the water heating curve; and why no heat engine reaches 100%.', aliases: ['thermodynamics', 'heat', 'heat transfer', 'conduction', 'convection', 'radiation', 'insulation', 'specific heat', 'calorimetry', 'latent heat', 'phase change', 'heating curve', 'carnot', 'heat engine', 'thermal', 'temperature', 'second law'], color: 'orange', ready: true },
              { id: 'nuclearLab', icon: '☢️', label: 'Nuclear & Radiation Lab', desc: 'Half-life and decay you can run, what actually stops alpha, beta and gamma, fission and fusion, radiation doses on a readable scale, why the same accident gets two death tolls a hundredfold apart, the three accidents in honest numbers, the waste question, and where small modular reactors really stand.', aliases: ['nuclear', 'radiation', 'radioactive', 'radioactivity', 'half-life', 'isotope', 'decay', 'fission', 'fusion', 'reactor', 'SMR', 'small modular reactor', 'uranium', 'plutonium', 'carbon dating', 'chernobyl', 'fukushima', 'sievert', 'dose', 'radiation safety', 'shielding', 'nuclear waste', 'alpha', 'beta', 'gamma', 'radon', 'meltdown', 'enrichment', 'nuclear power', 'linear no-threshold', 'LNT', 'hormesis', 'low-dose risk', 'radiation risk', 'collective dose', 'person-sievert', 'risk coefficient', 'ICRP', 'radiation epidemiology', 'is a small dose dangerous'], color: 'violet', ready: true },
              { id: 'echolocation', icon: '\uD83E\uDD87', label: 'Echolocation Lab', desc: 'See the world through sound! Sonar vision, wave physics, Doppler effect, bat biology, and acoustic ecology with interactive canvas simulations.', color: 'indigo', ready: true },
              {
                // @tool magnetism
                id: 'magnetism', icon: '🧲', label: 'Magnetism Lab',
                desc: 'See magnetic field lines with a live compass, build an electromagnet, spin a DC motor, generate electricity with Faraday’s law, and explore Earth’s magnetic shield.',
                color: 'rose', ready: true
              },
              {
                // @tool physics
                id: 'physics', icon: '🎯', label: t('stem.tools_menu.physics_simulator'),
                desc: 'Projectile motion, velocity vectors, and trajectory visualization.',
                color: 'sky', ready: true
              },
              {
                id: 'opticsLab', icon: '🔆', label: 'OpticsLab AP',
                desc: 'AP Physics 2 geometric + wave optics: ray diagrams, Snell\'s law, mirrors, lenses, double-slit interference, single-slit diffraction, polarization. Side-by-side draggable sims + calculators with show-the-math, sample problems, glossary, misconceptions, AP exam quiz, and AI-graded explanations.',
                aliases: ['Optics Lab', 'optics', 'light lab', 'lenses', 'mirrors', 'reflection', 'refraction', 'Snell', 'AP Physics 2'],
                color: 'sky', ready: true
              },
              {
                id: 'particleLab3d', icon: '\u2728', label: 'Particle Lab 3D',
                desc: 'Run fully 3D particle experiments with states of matter, gas laws, diffusion, collisions, attraction, live measurements, and particle tracing.',
                color: 'cyan', ready: true
              },
              {
                // @tool coasterLab
                id: 'coasterLab', icon: '🎢', label: 'Coaster Lab',
                desc: 'Design a roller coaster in full 3D, predict its speeds and g-forces with real physics, pass the certification inspection, and ride onboard with checkpoint questions.',
                color: 'amber', ready: true
              },
              {
                id: 'molecule', icon: '⚛️', label: t('stem.tools_menu.molecule_builder'),
                desc: 'Build molecules with atoms and bonds. Explore molecular geometry.',
                color: 'stone', ready: true
              },
              {
                // @tool chemBalance
                id: 'chemBalance', icon: '⚖️', label: t('stem.tools_menu.equation_balancer'),
                desc: t('stem.tools_menu.balance_chemical_equations_with_visual'),
                aliases: ['Chemistry Lab', 'chem lab', 'chemical equations', 'equation balancing', 'stoichiometry', 'chemical reactions', 'periodic table', 'elements', 'element properties', 'atomic number', 'equation balancer', 'balance equations', 'chemlab', 'safety', 'GHS', 'hazard', 'pictogram'],
                color: 'lime', ready: true
              },
              {
                id: 'titrationLab', icon: '🧪', label: 'Titration Lab',
                desc: 'Virtual titration with live S-curve graphing, indicator selection, and pH calculation.',
                color: 'emerald', ready: true
              },
              {
                id: 'bakingScience', icon: '🥐', label: 'Baking Lab',
                desc: 'Leavening chemistry, emulsions, recipe scaling, oven timeline, and Maillard browning — the science behind every bake.',
                color: 'amber', ready: true
              },
              { id: '_cat_EngineeringDesign', icon: '', label: '\u2699\uFE0F Engineering & Design', desc: '', color: 'slate', chip: 'engineering', palette: ['amber', 'orange', 'cyan'], category: true },
              {
                // @tool machineLab
                id: 'machineLab', icon: '\u2699\uFE0F', label: 'Machine Lab',
                desc: 'Levers, pulleys, ramps, wedges and screws. See how simple machines trade distance for force, and prove it with your own predictions.',
                color: 'amber', ready: true
              },
              {
                // @tool circuit
                id: 'circuit', icon: '🔌', label: t('stem.tools_menu.circuit_builder'),
                desc: 'Build circuits with resistors and batteries. Calculate voltage and current.',
                color: 'yellow', ready: true
              },
              {
                // @tool semiconductor
                id: 'semiconductor', icon: '💠', label: 'Semiconductor Lab',
                desc: 'Explore transistors, logic gates, silicon doping, and chip design fundamentals.',
                color: 'cyan', ready: true
              },
              { id: 'bridgeLab', icon: '\uD83C\uDF09', label: 'Bridge Engineering Lab', desc: 'NGSS MS-ETS1 + HS-ETS1 + HS-PS2. Truss stress simulator with adjustable span/height/load/material, bridge type comparison (beam/truss/arch/suspension/cable-stayed), materials database, force types, real-world case studies (Tacoma Narrows, Hyatt Regency, Tay, Silver, plus Brooklyn/Golden Gate/Akashi/Millau), engineering design cycle, AP-style quiz, printable design specs.', color: 'amber', ready: true },
              { id: 'printingPress', icon: '\uD83D\uDCDC', label: 'PrintingPress', desc: 'The Gutenberg-style screw press as a working simulation. Pull the bar, set your own type, see the impression. Plus the materials science (lead-tin-antimony alloy), economics (cost-per-book collapse), history (Reformation, scientific revolution), typography, and the people behind the press (including women printers history forgot). Built for interdisciplinary middle-school work.', aliases: ['simple machines', 'lever', 'mechanical advantage', 'screw press'], color: 'amber', ready: true },
              {
                id: 'archStudio', icon: '\uD83C\uDFD7\uFE0F', label: 'Architecture Studio',
                desc: '3D building with blocks, columns, arches, and ramps. Snap to grid, measure, and export STL.',
                color: 'amber', ready: true
              },
              {
                // @tool cityLab. Architecture Studio stops at one building and GIS Studio
                // analyses places that already exist, so nothing in the catalog let a
                // student design a settlement under constraints that genuinely conflict.
                // Indicators are tiered: measured, modelled, and a contested tier that is
                // deliberately never produced as a number. See docs/city_planning_lab_design.md
                id: 'cityLab', icon: '\uD83C\uDFD9\uFE0F', label: 'City Planning Lab',
                desc: 'NGSS MS-ETS1 + HS-ETS1-3 + MS-ESS3-3. Design a town on a 144-parcel grid against requirements that genuinely conflict. Three towns, each with a different binding constraint: Riverbend, where stormwater and the bond bite; Mesa Hollow, where the aquifer is fixed and the farms are drinking it; and Harborlight, where the plan has to still work in 2050. Rational-method runoff, water balance, sea-level allowance, network walk distance and a costed road network, each openable to show its formula. The Assumption Lab reruns one plan under two published parameter sets so students can see which conclusions survive both. Map, editable parcel table and a 3D model of the same plan. Discussion prompts and documented history carry the questions the tool refuses to model. No score and no answer key.',
                color: 'teal', ready: true
              },
              { id: '_cat_ComputingAI', icon: '', label: '\uD83D\uDCBB Computing, AI & Digital Literacy', desc: '', color: 'slate', chip: 'engineering', palette: ['indigo', 'violet', 'cyan'], category: true },
              {
                id: 'codingPlayground', icon: '🖥️', label: 'Coding Playground',
                desc: 'Visual block coding with turtle graphics. Learn sequencing, loops, and conditionals. Toggle between blocks and text code.',
                color: 'indigo', ready: true
              },
              { id: 'gameStudio', icon: '🎮', label: 'Game Studio', desc: 'Design, build, and test your own games with a visual coding interface.', color: 'purple', ready: true },
              { id: 'appLab', icon: '\uD83D\uDCF1', label: 'AppLab: AI App Generator', desc: 'Describe what you want and AI generates a complete interactive mini-app. Science demos, visualizations, calculators, and educational tools \u2014 created from your imagination.', color: 'violet', ready: true },
              { id: 'logicLab', icon: '\uD83E\uDDE9', label: 'Logic Lab', desc: 'Logic gates, truth tables, and Boolean algebra puzzles.', color: 'indigo', ready: true },
              { id: 'cellularLab', icon: '🟩', label: 'Cellular Automaton Lab', desc: "Explore polished 2-D Life-like worlds with custom B/S rules, scientific lenses, design challenges, 17 classic patterns, dynamic grids, population evidence, PNG export, and all 256 elementary Wolfram rules.", color: 'emerald', ready: true },
              {
                id: 'cyberDefense', icon: '\uD83D\uDEE1\uFE0F', label: 'Cyber Defense Lab',
                desc: 'Spot phishing emails, forge strong passwords, and crack ciphers. Gamified cybersecurity training aligned with Digital Citizenship standards.',
                color: 'rose', ready: true
              },
              {
                id: 'a11yAuditor', icon: '\u267F', label: 'Digital Accessibility Lab',
                desc: 'Audit websites for WCAG 2.1 AA compliance. Learn how accessibility barriers affect people with disabilities and how to fix them.',
                color: 'teal', ready: true
              },
              {
                id: 'llmLiteracy', icon: '🤖', label: 'AI Literacy Lab',
                desc: 'How LLMs actually work, when they fail, how to prompt well, and when to use AI as a scaffold vs. let it substitute for your thinking.',
                color: 'violet', ready: true
              },
              {
                id: 'accessLens', icon: '\uD83D\uDCF7', label: 'Access Lens',
                desc: 'Point your camera at the world: scene descriptions read aloud (built for students who are blind or have low vision), large-print re-reading of any text, translation of signs and handouts, and a Socratic investigate mode where the AI asks questions instead of pronouncing answers.',
                color: 'sky', ready: true
              },
              {
                id: 'typingPractice', icon: '\u2328\uFE0F', label: 'Typing Practice',
                desc: 'Disability-first keyboarding — dyslexia font, high-contrast, audio cues, error-tolerant mode, pace reference, on-screen keyboard. 8+ drill tiers, AI-personalized passages, IEP-ready progress reports.',
                color: 'violet', ready: true
              },
              {
                id: 'simShelf', icon: '🗄️', label: 'Sim Shelf',
                desc: 'Sixteen hand-picked PhET simulations (University of Colorado Boulder) \u2014 forces, circuits, light, matter, orbits, evolution, fractions, probability \u2014 wrapped in a Predict \u2192 Explore \u2192 Explain coach that makes you commit to a guess before you touch anything.',
                color: 'amber', ready: true
              },
              {
                id: 'zoomGallery', icon: '\uD83D\uDD0D', label: 'Zoom Gallery',
                desc: 'Zoom deep into real, openly-licensed images in OpenSeadragon \u2014 the viewer museums use \u2014 from the Pillars of Creation and Saturn\u2019s rings to an Apollo bootprint, the real Apollo 11 capsule, and a coral fan. Smithsonian Open Access (CC0) + NASA (public domain), with a Notice \u2192 Wonder observation coach beside it.',
                color: 'sky', ready: true
              },
              { id: '_cat_Arts&Music', icon: '', label: t('stem.tools_menu.arts_music'), desc: '', color: 'slate', chip: 'creative', palette: ['violet', 'rose', 'indigo'], category: true },

              {

                // @tool musicSynth
                id: 'musicSynth', icon: '🎹', label: t('stem.tools_menu.music_synthesizer'),

                desc: 'Play a piano, build beats, and learn the science of sound with real-time waveform visualization.',

                color: 'violet', ready: true

              },

              {
                id: 'artStudio', icon: '🎨', label: t('stem.tools_menu.art_design_studio'),
                desc: 'Explore color theory, mix colors, draw pixel art, create symmetry patterns, and check accessibility contrast.',
                color: 'rose', ready: true
              },
              {
                id: 'freeForms', icon: '\uD83C\uDFDB\uFE0F', label: 'Free Forms',
                desc: 'Build your own World of Forms: fill an archetypal 3D structure (Venn, story mountain, fishbone\u2026) with your OWN ideas, sculpt them, and get AI coaching on the whole composition.',
                color: 'violet', ready: true
              },
              { id: 'singing', icon: '\uD83C\uDFB5', label: 'Voice & Singing Lab', desc: 'Vocal range exploration, pitch matching, breathing exercises, and the science of the singing voice.', color: 'violet', ready: true },
              { id: 'oratory', icon: '\uD83D\uDDE3\uFE0F', label: 'Oratory & Speech Lab', desc: 'Practice public speaking with real-time pacing analysis, vocal warm-ups, and speech delivery coaching.', color: 'rose', ready: true },
              {
                id: 'echoTrainer', icon: '🎧', label: 'Echo Navigator',
                desc: 'Navigate virtual spaces using only spatial audio echoes — real HRTF binaural sound. Wear headphones!',
                color: 'indigo', ready: true
              },
              {
                id: 'worldBuilder', icon: '✍️', label: 'WriteCraft',
                desc: 'Literary RPG — explore worlds, craft items, build structures, and battle through the strength of your prose. Your eloquence IS your superpower.',
                color: 'violet', ready: true
              },
              { id: '_cat_LearningBehavioral', icon: '', label: '\uD83E\uDDE0 Learning & Behavioral Science', desc: '', color: 'slate', chip: 'applied', palette: ['indigo', 'violet', 'rose'], category: true },
              {
                id: 'behaviorLab', icon: '\uD83D\uDC2D', label: 'Behavior Shaping Lab',
                desc: 'Train a virtual mouse using operant conditioning! Learn ABA fundamentals: reinforcement, shaping, extinction, and schedules of reinforcement.',
                color: 'amber', ready: true
              },
              {
                id: 'schoolBehaviorToolkit', icon: '\uD83C\uDFEB', label: 'School Behavior Toolkit',
                desc: 'Applied K-12 behavior practice \u2014 what school psychs and educators actually do with the science. PBIS three-tier framework, replacement behaviors mapped to FBA functions, setting events (slow triggers most BIPs miss), Geoff Colvin\'s seven-phase Acting-Out Cycle, Restraint & Seclusion ethics anchored in Maine Chapter 33. Sister tool to BehaviorLab.',
                color: 'teal', ready: true
              },
              {
                id: 'learningLab', icon: '🎓', label: 'Learning Lab: How Learning Works',
                desc: 'Bloom\'s Taxonomy, UDL framework, metacognition, cognitive load, spaced repetition + retrieval practice, study strategies that actually work, neuromyth debunking. Cited primary sources (Dunlosky 2013, Pashler 2008, Sweller 1988, CAST UDL 3.0).',
                color: 'indigo', ready: true
              },
              {
                id: 'consciousnessLab', icon: '💭', label: 'Consciousness Theory Lab',
                desc: 'Compare scientific theories and philosophical views of consciousness through evidence, predictions, real cases, and thought experiments. Reading depth and knowledge checks adapt from K-2 through graduate study.',
                color: 'violet', ready: true,
                aliases: ['consciousness', 'mind', 'awareness', 'phenomenal consciousness', 'global workspace', 'integrated information']
              },
              {
                id: 'assessmentLiteracy', icon: '📋', label: 'Assessment Literacy Lab',
                desc: 'How cognitive, personality, career, and employer tests actually work. Build mock batteries, critique pseudoscience, coach yourself ethically for hiring tests.',
                color: 'fuchsia', ready: true
              },
              {
                id: 'lawNavigator', icon: '🏛️', label: 'Education Law Navigator',
                desc: 'Read what special-education law actually says, in its own words. The real text of IDEA Part B and Section 504, fetched from eCFR and date-stamped, searchable, with federal and state rules side by side. Nothing is paraphrased or generated — if the official text is not loaded, the tool says so instead of guessing.',
                color: 'indigo', ready: true
              },
              {
                id: 'parentingLab', icon: '🫂', label: 'Science of Parenting Lab',
                desc: 'What the parenting literature actually says — warmth and structure as two dials, with a strength-of-evidence badge on every claim (RCT-supported to popular-but-unsupported). Strengths-based and non-diagnostic. Sister tool to BehaviorLab and Learning Lab.',
                color: 'rose', ready: true
              },
              { id: '_cat_LifeSkillsCareers', icon: '', label: '\uD83D\uDCB0 Life Skills, Careers & Economics', desc: '', color: 'slate', chip: 'applied', palette: ['emerald', 'amber', 'orange', 'cyan'], category: true },
              {
                id: 'economicsLab', icon: '💰', label: 'Economics Lab',
                desc: 'Supply & demand curves, personal finance life sim, stock market trading, AI business startup sim, and a national economy policy simulator.',
                color: 'emerald', ready: true
              },
              {
                // @tool paperTrail \u2014 field-level document trainer. Complements
                // the 3-decision Form Navigator in Life Skills Lab rather than
                // duplicating it; all practice uses a fictional identity.
                // NOTE: no apostrophes in comments inside this array \u2014
                // check_stem_tile_catalog scans it string-aware but comment-blind,
                // so a lone quote in a comment desyncs its bracket matcher.
                id: 'paperTrail', icon: '\uD83D\uDCC4', label: 'PaperTrail: Official Documents',
                desc: 'Practice reading and completing the documents adult life runs on \u2014 job applications, W-4s, leases, medical intake, driver permits, and your own IEP meeting invitation. Every field decoded in plain language, the boxes that can cost you flagged, pressure scenarios for when someone wants you to sign now, and scripts for asking for time. All practice uses a made-up person, never your real information.',
                color: 'amber', ready: true
              },
              {
                id: 'lifeSkills', icon: '\uD83E\uDDED', label: 'Life Skills Lab',
                desc: 'Tax & paycheck calculator, data literacy, decision matrix, contract reader, records and paperwork, transportation planning, job readiness, resume building, portfolio proof organization, interview practice, communication skills, time management, health insurance, dental care, body care ergonomics, sleep routines, medication labels, appointment prep, home safety, digital safety, food confidence, and applied science for daily life.',
                color: 'cyan', ready: true
              },
              {
                id: 'roadReady', icon: '🚗', label: "RoadReady: Driver's Ed",
                desc: "3D driving simulator + US permit test + fuel efficiency physics. 14 scenarios, 114 practice questions, real stopping-distance math. Maine state focus.",
                color: 'emerald', ready: true
              },
              {
                id: 'autoRepair', icon: '🔧', label: 'Auto Repair Shop',
                desc: 'Diagnose + fix a vehicle: OBD-II codes, fluid / sound / visual diagnosis, 7 step-by-step repairs (oil, brakes, alternator, tires, A/C, timing belt). Maine vocational pathways + ASE certification info. Pairs with RoadReady.',
                color: 'slate', ready: true
              },
              {
                id: 'weldLab', icon: '⚒️', label: 'WeldLab: Welding & Metal Joining',
                desc: 'MIG / TIG / Stick / Oxy-Fuel processes, heat-input physics, weld-bead geometry, defect ID, AWS welding symbols, OSHA-aligned PPE. Maine career pathways (Bath Iron Works, EMCC, AWS cert ladder).',
                color: 'orange', ready: true
              },
              {
                id: 'bikeLab', icon: '🚲', label: 'BikeLab: Physics & Repair',
                desc: '2D side-view physics sandbox (force vectors, energy graph) + gearing lab (chainring/cassette math, climb sim) + hands-on repair simulator (patch tube, brakes, chain, derailleur).',
                aliases: ['gears', 'gear ratio', 'mechanical advantage'], color: 'amber', ready: true
              },

              {
                id: 'flightSim', icon: '✈️', label: 'SkySchool',
                desc: 'Educational flight simulator — learn aerodynamics, navigation, and world geography by flying between real airports with real physics.',
                color: 'sky', ready: true
              },
              {
                id: 'atcTower', icon: '🗼', label: 'ATC Tower',
                desc: 'Air Traffic Control simulator — manage approaching aircraft, solve rate problems, and learn the math behind aviation safety.',
                color: 'emerald', ready: true
              },
              {
                id: 'fisherLab', icon: '🎣', label: 'FisherLab: Boating & Fishing Sim',
                desc: 'Pilot a Maine skiff from Portland Harbor out to the fishing grounds. Learn IALA-B buoyage (red-right-returning), COLREGS rules of the road, charts, tides, and weather while fishing for cod, haddock, pollock, striper, and pulling lobster traps. Full 3D three.js sim with Maine-default DMR regs and a region toggle.',
                color: 'cyan', ready: true
              },
              {
                id: 'aquacultureLab', icon: '🦪', label: 'AquacultureLab: Mussel Farm Sim',
                desc: 'Run a Maine shellfish farm. Pilot your skiff out to a Bagaduce River lease, deploy seeded longlines, monitor water quality (DO, salinity, pH, temp, chlorophyll-a), harvest mussels and oysters, navigate weather and tides. Full 3D three.js sim teaching boating navigation alongside aquaculture fundamentals.',
                color: 'teal', ready: true
              },
              { id: '_cat_SportsMovement', icon: '', label: '\uD83C\uDFC5 Sports & Movement Science', desc: '', color: 'slate', chip: 'applied', palette: ['orange', 'cyan', 'emerald'], category: true },
              {
                id: 'throwlab', icon: '⚾', label: 'ThrowLab: Sports Physics',
                desc: 'Pitcher\'s Mound: dial spin, speed, and release point and watch the Magnus + drag integrator shape the ball\'s path. 6 pitch types. Hot-Hand streaks + Rookie/Pro tiers.',
                color: 'amber', ready: true
              },
              {
                id: 'skatelab', icon: '🛹', label: 'SkateLab: Skate + BMX Physics',
                desc: 'The physics that lands a 720: kickflips, halfpipe pumps, gap jumps. Energy conservation + angular momentum, made for kids who learn through tricks.',
                color: 'amber', ready: true
              },
              {
                id: 'playlab', icon: '🏈', label: 'PlayLab: Strategy on the Field',
                desc: 'Football + soccer play design: drag-to-place routes, animated simulation, Coach Mode coverage analysis, drills + saved plays. Built for athletic kids.',
                color: 'lime', ready: true
              },
              {
                id: 'swimLab', icon: '🏊', label: 'SwimLab',
                desc: 'How swimming works (stroke physics + survival skills) plus what every swimmer should know about cold water, rip currents, ice, life jackets, and rescue. Visual stroke breakdowns, the science of buoyancy and propulsion, and the survival skills (back float, eggbeater, HELP, huddle) that actually save lives. Sources: CDC, USCG, AAP, NAA, NOAA, USA Swimming. Educational only — find a Water Safety Instructor for actual swim training.',
                color: 'cyan', ready: true
              },
              { id: '_cat_Strategy', icon: '', label: '\u2694\uFE0F Strategy Games', desc: '', color: 'slate', chip: 'strategy', palette: ['violet', 'indigo'], category: true },
              { id: 'arccity', icon: '🌆', label: 'Arc City', desc: 'Author functions, re-light a neon city, and battle across two function-powered Circuit Clash arenas.', color: 'fuchsia', ready: true },
              { id: 'spaceColony', label: 'Kepler Colony', icon: '🛖', desc: 'Colonize an alien planet! Turn-based cooperative strategy where mastering science unlocks colony survival.', color: 'indigo', ready: true },
              { id: 'spaceExplorer', label: 'Space Explorer', icon: '🛸', desc: 'Roguelike missions across the solar system. AI-generated challenges teach real science through strategic decisions.', color: 'purple', ready: true },
              { id: 'alloBotSage', label: 'AlloBot: Starbound Sage', icon: '\uD83E\uDDD9\u200D\u2642\uFE0F', desc: 'Cozy sci-fi roguelite. AlloBot\u2019s spells unlock as you master other STEAM Lab tools \u2014 and every cast is a retrieval-practice micro-challenge. Spaced practice, in-game.', color: 'violet', ready: true }
            ];

            // Category palettes are the visual source of truth. Cycling a small
            // subject family keeps neighboring cards distinct while making each
            // reordered section recognizable at a glance.
            var _catalogColorById = {};
            var _activeCatalogPalette = null;
            var _activeCatalogBreaks = null;
            var _catalogPaletteIndex = 0;
            _allStemTools.forEach(function (tool) {
              if (tool.category) {
                _activeCatalogPalette = tool.palette || null;
                _activeCatalogBreaks = tool.paletteBreaks || null;
                _catalogPaletteIndex = 0;
                return;
              }
              if (_activeCatalogBreaks && _activeCatalogBreaks[tool.id]) {
                _activeCatalogPalette = _activeCatalogBreaks[tool.id];
                _catalogPaletteIndex = 0;
              }
              if (!_activeCatalogPalette || !_activeCatalogPalette.length) return;
              var _catalogColor = _activeCatalogPalette[_catalogPaletteIndex % _activeCatalogPalette.length];
              if (_toolColorMap[_catalogColor]) _catalogColorById[tool.id] = _catalogColor;
              _catalogPaletteIndex++;
            });
            // ── Tool search filter ──
            // Lazily built id -> index-entry map; rebuilt if the index arrives late.
            var _stemToolIndexById = null;
            var _searchAliasMap = {
              // The search haystack is built from the TILE (id/label/desc/aliases) and never
              // from the tool's own registerTool description, so a feature that exists only
              // inside the tool is unfindable. Before this block, "periodic table" returned
              // 0 results even though molecule ships a full 118-element table; likewise
              // "international space station", "skinner", "transpiration", "virtual
              // microscope" and "food safety". Every keyword below was taken from the
              // tool's own description — do not add features a tool does not have.
              // See STEM_LAB_CATEGORY_AUDIT.md F5.
              // Tools renamed 2026-08-03 keep their FORMER labels as aliases so an
              // existing lesson plan or a teacher's memory still finds them.
              statsLab: 'statistics lab statslab stats lab inferential statistics t test anova chi square correlation regression non parametric power analysis apa write up significance p value hypothesis test',
              dataStudio: 'data studio data plotter dataplot plot plotter chart charts graph graphs bar pie line scatter box plot histogram trendline trend line regression curve fit r squared residuals outliers five number summary csv import spreadsheet',
              paperTrail: 'papertrail paper trail forms form documents official documents job application w4 w-4 tax withholding lease rental apartment medical intake permit drivers permit iep meeting invitation signature ssn social security identity theft paperwork fill out transition life skills self advocacy',
              lawNavigator: 'law legal education law special education law idea part b section 504 cfr regulation regulations statute muser maine chapter 101 iep 504 plan rights procedural safeguards child find manifestation determination prior written notice iee due process federal state ecfr',
              parentingLab: 'parenting parents family science of parenting warmth structure responsiveness demandingness baumrind authoritative authoritarian permissive attachment discipline positive parenting evidence badges styles child development home behavior tantrum bedtime praise',
              molecule: 'periodic table elements element chemistry chemical 118 elements compound creator bond builder molecular geometry reaction simulator orbital clouds orbitals atoms atom valence covalent ionic bonds',
              rockCycle: 'rock cycle earth science igneous sedimentary metamorphic shale slate limestone marble granite gneiss metamorphism weathering erosion melting cooling cross section specimen transformation',
              behaviorLab: 'operant conditioning skinner box skinner reinforcement schedules fixed ratio variable ratio fixed interval variable interval chaining chained sequences dro classical conditioning pavlov aba applied behavior analysis fba functional behavior assessment attention escape tangible sensory cumulative record',
              microbiology: 'microbiology bacteria virus viruses microscope virtual microscope microscopy phase contrast fluorescent electron microscope e coli streptococcus paramecium plasmodium phage antibiotic resistance petri dish microbiome immune system vaccines fermentation sourdough yogurt kimchi sauerkraut kombucha cheese cholera snow penicillin fleming mrsa covid mrna',
              moonMission: 'apollo moon landing lunar module kennedy splashdown eva orbital mechanics oxygen leak abort rock samples nasa space race',
              autoRepair: 'auto repair car mechanic obd obd2 diagnostic codes oil change brakes alternator tires air filter timing belt jack stands ase certification automotive vocational engine maintenance',
              weldLab: 'welding weld mig tig stick oxy fuel arc welding heat input bead geometry weld defects aws welding symbols osha ppe skilled trades vocational metal joining fabrication',
              schoolBehaviorToolkit: 'pbis positive behavior interventions supports three tier replacement behaviors fba functions setting events acting out cycle de escalation crisis behavior intervention plan bip restraint seclusion maine chapter 33 classroom management school psychology',
              nutritionLab: 'nutrition macronutrients micronutrients protein carbohydrates fats vitamins minerals food label nutrition facts metabolism digestion eating disorder awareness food and mental health dietitian usda nih health',
              evoLab: 'evolution natural selection galapagos beak darwin finches phylogenetic tree common ancestry hardy weinberg genetic drift adaptation misconceptions snowshoe hare moose tick maine wildlife',
              magnetism: 'magnetism magnet magnetic field field lines compass electromagnet dc motor generator faraday induction electromagnetism magnetic materials earth magnetic field electricity',
              echoTrainer: 'echolocation echo navigation spatial audio binaural hrtf headphones blind low vision orientation and mobility clicks reflections first person accessibility',
              waterCycle: 'water cycle evaporation condensation precipitation collection transpiration infiltration runoff groundwater droplet journey hydrologic cycle',
              spaceStation: 'international space station iss orbit microgravity low gravity life support crew shift astronaut eva orbital mechanics space engineering',
              kitchenLab: 'food safety usda safe temperatures bacteria danger zone cooking culinary science kitchen knife skills recipe',
              chemBalance: 'chemistry lab chemistry chemical equation balancer equation balancing stoichiometry reaction reactions molecule molecules',
              opticsLab: 'optics lab light lab geometric optics wave optics lens lenses mirror mirrors reflection refraction snell diffraction interference polarization ap physics',
              fractionViz: 'fraction lab fractions compare numerator denominator pizza visualizer',
              base10: 'base ten base-10 manipulatives place value math blocks abacus slide rule',
              titrationLab: 'chemistry lab titration acid base acids bases ph hcl',
              anatomy: 'anatomy lab human anatomy body systems organs skeletal muscular',
              solarSystem: 'solar system explorer planets astronomy space orbit orrery',
              accessLens: 'camera photo picture describe scene description blind low vision ocr read text aloud large print translate translation language sign label socratic investigate object identify accessibility',
              dataLab: 'data science codap statistics dataset table graph plot scatter chart mean median analyze census concord tutor socratic data literacy spreadsheet cases attributes',
              alphaFoldExplorer: 'alphafold alpha fold protein structure prediction uniprot accession molstar mol molecule molecular biology bioinformatics pdb cif mmcif bcif plddt pae confidence sequence amino acid fasta server deepmind ebi structure viewer',
              cellAtlasLab: 'human cell atlas hca single cell scrna rna sequencing transcriptomics gene expression marker genes pancreas beta alpha delta ductal acinar stellate endothelial immune insulin cell type bioinformatics data literacy',
              simShelf: 'phet simulation simulations sims physics forces energy circuits light waves matter orbits evolution fractions probability predict explore explain poe lab colorado interactive',
              particleLab3d: 'particle particles 3d molecular dynamics states matter solid liquid gas diffusion kinetic theory temperature pressure collisions attraction intermolecular forces gas laws',
              zoomGallery: 'zoom gallery deep zoom openseadragon iiif image images photo photos picture pictures magnify magnifier close up detail details observe observation notice wonder smithsonian open access nasa museum artifact artifacts space astronomy hubble webb pillars creation saturn moon apollo bootprint coral fossil low vision cc0 public domain'
            };
            function _normalizeToolSearchText(value) {
              return String(value || '')
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, ' ')
                .trim();
            }
            // The tile blurb is a marketing line, not an inventory. Searching
            // it alone meant features INSIDE a tool were unfindable — "periodic
            // table" returned nothing while a 118-element table shipped inside
            // Molecule Builder, and 7 of 14 realistic teacher queries died.
            // Two extra sources fix that at the root instead of one alias at a
            // time:
            //   1. the LIVE plugin config, richest when the tool has loaded;
            //   2. the build-time capability index, which is complete even
            //      before any plugin loads.
            // Both are self-descriptions and headings, never tool source.
            function _stemToolIndexEntry(id) {
              try {
                var ix = window.ALLO_TOOL_INDEX;
                if (!ix || !ix.tools) return null;
                if (!_stemToolIndexById) {
                  _stemToolIndexById = {};
                  for (var i = 0; i < ix.tools.length; i++) _stemToolIndexById[ix.tools[i].id] = ix.tools[i];
                }
                return _stemToolIndexById[id] || null;
              } catch (_) { return null; }
            }
            function _stemToolSearchHaystack(tool) {
              var aliases = [];
              if (tool.aliases) aliases = aliases.concat(tool.aliases);
              if (_searchAliasMap[tool.id]) aliases.push(_searchAliasMap[tool.id]);
              var extra = '';
              try {
                var plug = window.StemLab && window.StemLab._registry && window.StemLab._registry[tool.id];
                if (plug && plug.desc) extra += ' ' + plug.desc;
              } catch (_) {}
              var entry = _stemToolIndexEntry(tool.id);
              if (entry) {
                extra += ' ' + (entry.desc || '') + ' ' + (entry.topics || []).join(' ') + ' ' + (entry.keywords || []).join(' ');
              }
              return _normalizeToolSearchText([tool.id, tool.label, tool.desc, tool.category, aliases.join(' '), extra].join(' '));
            }
            var _searchLower = _normalizeToolSearchText(_stemToolSearch);
            var _filteredTools = _searchLower ? _allStemTools.filter(function (tool) {
              if (tool.category) {
                // Keep category if ANY tool in it matches
                return true;
              }
              return _stemToolSearchHaystack(tool).indexOf(_searchLower) !== -1;
            }) : _allStemTools;
            // Remove orphan category headers (categories with no matching tools after them)
            if (_searchLower) {
              _filteredTools = _filteredTools.filter(function (tool, i, arr) {
                if (!tool.category) return true;
                // Check if at least one non-category tool follows before next category or end
                for (var j = i + 1; j < arr.length; j++) {
                  if (arr[j].category) return false;
                  return true;
                }
                return false;
              });
            }
            // Station filter — only show tools in active station
            if (_activeStation && _activeStation.tools && _activeStation.tools.length > 0) {
              var _stationToolSet = {};
              _activeStation.tools.forEach(function(tid) { _stationToolSet[tid] = true; });
              _filteredTools = _allStemTools.filter(function(tool) {
                if (tool.category) return true;
                return !!_stationToolSet[tool.id];
              });
              // Remove orphan categories
              _filteredTools = _filteredTools.filter(function(tool, i, arr) {
                if (!tool.category) return true;
                for (var j = i + 1; j < arr.length; j++) {
                  if (arr[j].category) return false;
                  return true;
                }
                return false;
              });
            }
            // Category filter (from chip buttons)
            var _categoryFilterOptions = [
              { id: '', label: 'All', icon: '\u2B50' },
              { id: 'science', label: 'Science', icon: '\uD83E\uDDEA' },
              { id: 'math', label: 'Math', icon: '\uD83D\uDCCA' },
              { id: 'engineering', label: 'Engineering', icon: '\u2699\uFE0F' },
              { id: 'creative', label: 'Creative', icon: '\uD83C\uDFA8' },
              { id: 'applied', label: 'Applied', icon: '\uD83D\uDE80' },
              { id: 'strategy', label: 'Games', icon: '\uD83C\uDFAE' }
            ];
            function _categoryFilterLabel(id) {
              var found = _categoryFilterOptions.find(function (cat) { return cat.id === id; });
              return found ? found.label : 'All';
            }
            var _catFilter = d._categoryFilter || '';
            if (_catFilter && !_activeStation) {
              // Each { category: true } header declares its own `chip`. This used to
              // lowercase the header's DISPLAY LABEL and indexOf-match English keywords,
              // which broke two ways:
              //   1. Substrings collided inside unrelated words — "physiCS" matched the
              //      'cs' engineering key (so the Science chip showed ZERO physics and
              //      chemistry tools), "eARTh" matched 'Art' (so 31 earth/life science
              //      tools showed under Creative), "economiCS" matched 'cs' too. Two
              //      sections ("Sound, Speech & Music", "Ecology & Migration") matched no
              //      key at all and vanished from every chip.
              //   2. It tested ENGLISH keywords against a TRANSLATED label, so the chips
              //      filtered to near-nothing in every localized UI.
              // Comparing a declared field fixes both and can't drift when a label is
              // reworded or translated. See STEM_LAB_CATEGORY_AUDIT.md.
              _filteredTools = _filteredTools.filter(function(tool) {
                if (tool.category) return tool.chip === _catFilter;
                // A tile inherits the chip of the nearest preceding header.
                var toolChip = '';
                var toolIdx = _allStemTools.indexOf(tool);
                for (var ci3 = toolIdx - 1; ci3 >= 0; ci3--) {
                  if (_allStemTools[ci3].category) { toolChip = _allStemTools[ci3].chip || ''; break; }
                }
                return toolChip === _catFilter;
              });
              // Remove orphan categories
              _filteredTools = _filteredTools.filter(function(tool, i, arr) {
                if (!tool.category) return true;
                for (var j = i + 1; j < arr.length; j++) {
                  if (arr[j].category) return false;
                  return true;
                }
                return false;
              });
            }
            var _cardIndex = 0;
            // Tool count summary
            var _toolCount = _filteredTools.filter(function(t2) { return !t2.category; }).length;
            var _totalToolCount = _allStemTools.filter(function(t2) { return !t2.category; }).length;
            var _catalogContextLabel = _activeStation ? _activeStation.name : (_searchLower ? 'Search results' : (_catFilter ? _categoryFilterLabel(_catFilter) : 'All tools'));
            function _findStemToolById(id) {
              return _allStemTools.find(function (tool) { return tool && !tool.category && tool.id === id; }) || null;
            }
            var _availableStemTools = _allStemTools.filter(function (tool) { return tool && !tool.category && tool.id; });
            var _recentStemTools = (_recentStemToolIds || []).map(_findStemToolById).filter(Boolean);
            function _requestStemToolSuggestions() {
              var interest = String(_stemToolInterest || '').trim();
              if (!interest) {
                _setStemToolSuggestError('Add a topic, question, or project idea first.');
                _setStemToolSuggestions([]);
                if (typeof announceToSR === 'function') announceToSR('Add an interest first.');
                return;
              }
              var reqId = _stemToolSuggestRequestRef.current + 1;
              _stemToolSuggestRequestRef.current = reqId;
              _setStemToolSuggesting(true);
              _setStemToolSuggestError('');
              _setStemToolSuggestions([]);
              var catalogForPrompt = _availableStemTools.map(function (tool) {
                return {
                  id: tool.id,
                  label: tool.label,
                  category: tool.category || '',
                  desc: String(tool.desc || tool.description || '').slice(0, 150),
                  aliases: Array.isArray(tool.aliases) ? tool.aliases.slice(0, 8) : []
                };
              });
              var prompt = [
                'You are helping a student choose a STEAM Lab tool.',
                'Student interest: ' + interest,
                'Choose up to 4 tools from this catalog. Use only exact ids from the catalog.',
                'Return strict JSON only, no markdown, as an array of objects: [{"id":"toolId","reason":"short reason","starter":"first thing to try"}].',
                'Catalog:',
                JSON.stringify(catalogForPrompt)
              ].join('\n');
              var fallback = function (message) {
                var local = _localStemToolMatches(interest, _availableStemTools);
                if (_stemToolSuggestRequestRef.current !== reqId) return;
                _setStemToolSuggesting(false);
                _setStemToolSuggestions(local);
                _setStemToolSuggestError(local.length ? '' : (message || 'No close matches yet. Try a more specific topic.'));
                if (typeof announceToSR === 'function') announceToSR(local.length ? 'Suggested ' + local.length + ' STEM tools.' : 'No STEM tool suggestions found.');
              };
              if (typeof callGemini !== 'function') {
                fallback('AI suggestions are unavailable right now; showing closest catalog matches.');
                return;
              }
              callGemini(prompt, true).then(function (raw) {
                if (_stemToolSuggestRequestRef.current !== reqId) return;
                var parsed = _extractStemSuggestionJson(raw);
                var suggestions = _normalizeStemSuggestions(parsed, _availableStemTools);
                if (!suggestions.length) {
                  fallback('AI did not return a usable tool list; showing closest catalog matches.');
                  return;
                }
                _setStemToolSuggesting(false);
                _setStemToolSuggestions(suggestions);
                _setStemToolSuggestError('');
                if (typeof announceToSR === 'function') announceToSR('Suggested ' + suggestions.length + ' STEM tools.');
              }).catch(function () {
                fallback('AI suggestions hit a snag; showing closest catalog matches.');
              });
            }
            var _hasCatalogFilter = !!(_searchLower || (!_activeStation && _catFilter));
            // ── Mastery Atlas: cross-tool engagement dashboard ──
            // Reads each tool's persistent window slot (with localStorage
            // fallback) and renders a single dashboard tile per tool that
            // has the mastery primitive wired in. Surfaces 10 simultaneous
            // engagement counts so kids see their full STEAM Lab progress at
            // a glance and can jump straight into the tool with one click.
            // Only shows tools where the user has mastered ≥1 item, so the
            // atlas stays out of the way for first-time visitors.
            var _readSlot = function (slotName, lsKey) {
              var win = null, ls = null;
              try { win = (typeof window !== 'undefined' && window[slotName]) || null; } catch (e) {}
              try { ls = JSON.parse(localStorage.getItem(lsKey) || 'null'); } catch (e) {}
              return win || ls || null;
            };
            var _atlasCardCount = function (state, getCount) {
              if (!state) return 0;
              try { return getCount(state) || 0; } catch (e) { return 0; }
            };
            var _atlasEntries = [
              { id: 'birdLab', icon: '🪶', label: 'BirdLab Life List',
                color: '#10b981', accent: 'rgba(16,185,129,0.15)',
                slot: '__alloflowBirdLab', lsKey: 'birdLab.lifeList.v1', total: 15,
                count: function () { var s = _readSlot('__alloflowBirdLab', 'birdLab.lifeList.v1'); if (!s) return 0; var ll = (s.lifeList || s); return Object.keys(ll || {}).length; } },
              { id: 'petsLab', icon: '🐾', label: 'PetsLab Decoder',
                color: '#f59e0b', accent: 'rgba(245,158,11,0.15)',
                slot: '__alloflowPetsLab', lsKey: 'petsLab.state.v1', total: 27,
                count: function () { var s = _readSlot('__alloflowPetsLab', 'petsLab.state.v1'); return s && s.decoderMastery ? Object.keys(s.decoderMastery).length : 0; } },
              { id: 'opticsLab', icon: '🔆', label: 'OpticsLab AP',
                color: '#0ea5e9', accent: 'rgba(14,165,233,0.15)',
                slot: '__alloflowOpticsLab', lsKey: 'opticsLab.state.v1', total: 30,
                count: function () { var s = _readSlot('__alloflowOpticsLab', 'opticsLab.state.v1'); return s && s.quizMastery ? Object.keys(s.quizMastery).length : 0; } },
              { id: 'statsLab', icon: '📊', label: 'StatsLab AP',
                color: '#a855f7', accent: 'rgba(168,85,247,0.15)',
                slot: '__alloflowStatsLab', lsKey: 'statsLab.state.v1', total: 25,
                count: function () { var s = _readSlot('__alloflowStatsLab', 'statsLab.state.v1'); return s && s.quizMastery ? Object.keys(s.quizMastery).length : 0; } },
              { id: 'weldLab', icon: '🔥', label: "Welder's Catalog",
                color: '#dc2626', accent: 'rgba(220,38,38,0.15)',
                slot: '__alloflowWeldLab', lsKey: 'weldLab.defectCatalog.v1', total: 6,
                count: function () { var s = _readSlot('__alloflowWeldLab', 'weldLab.defectCatalog.v1'); if (!s) return 0; var cat = (s.defectCatalog || s); return Object.keys(cat || {}).length; } },
              { id: 'renewablesLab', icon: '☀️', label: 'Energy Mastery',
                color: '#22c55e', accent: 'rgba(34,197,94,0.15)',
                slot: '__alloflowRenewablesLab', lsKey: 'renewablesLab.state.v1', total: 18,
                count: function () { var s = _readSlot('__alloflowRenewablesLab', 'renewablesLab.state.v1'); return s && s.quizMastery ? Object.keys(s.quizMastery).length : 0; } },
              { id: 'firstResponse', icon: '🚑', label: 'Responder Mastery',
                color: '#ef4444', accent: 'rgba(239,68,68,0.15)',
                slot: '__alloflowFirstResponse', lsKey: 'firstResponse.state.v1', total: 10,
                count: function () { var s = _readSlot('__alloflowFirstResponse', 'firstResponse.state.v1'); return s && s.faMastery ? Object.keys(s.faMastery).length : 0; } },
              { id: 'throwlab', icon: '⚾', label: 'Pitch Locker',
                color: '#7c3aed', accent: 'rgba(124,58,237,0.15)',
                slot: '__alloflowThrowLab', lsKey: 'throwlab.state.v1', total: 6,
                count: function () { var s = _readSlot('__alloflowThrowLab', 'throwlab.state.v1'); return s && s.pitchLocker ? Object.keys(s.pitchLocker).length : 0; } },
              { id: 'playlab', icon: '🏈', label: 'Play Catalog',
                color: '#fb923c', accent: 'rgba(251,146,60,0.15)',
                slot: '__alloflowPlayLab', lsKey: 'playlab.state.v1', total: 13,
                count: function () { var s = _readSlot('__alloflowPlayLab', 'playlab.state.v1'); return s && s.playCatalog ? Object.keys(s.playCatalog).length : 0; } },
              { id: 'roadReady', icon: '🚗', label: 'Permit Mastery',
                color: '#fbbf24', accent: 'rgba(251,191,36,0.15)',
                slot: '__alloflowRoadReady', lsKey: 'roadReady.permitMastery.v1', total: 185,
                count: function () { var s = _readSlot('__alloflowRoadReady', 'roadReady.permitMastery.v1'); if (!s) return 0; var pm = (s.permitMastery || s); return Object.keys(pm || {}).length; } },
              { id: 'assessmentLiteracy', icon: '🔍', label: 'Junk-Science',
                color: '#c026d3', accent: 'rgba(192,38,211,0.15)',
                slot: '__alloflowAssessmentLiteracy', lsKey: 'assessmentLiteracy.state.v1', total: 15,
                count: function () { var s = _readSlot('__alloflowAssessmentLiteracy', 'assessmentLiteracy.state.v1'); return s && s.junkMastery ? Object.keys(s.junkMastery).length : 0; } },
              { id: 'fisherLab', icon: '🎣', label: 'Fisher Life Log',
                color: '#0ea5e9', accent: 'rgba(14,165,233,0.15)',
                slot: '__alloflowFisherLab', lsKey: 'fisherLab.state.v1', total: 8,
                count: function () { var s = _readSlot('__alloflowFisherLab', 'fisherLab.state.v1'); if (!s) return 0; var caught = s.speciesCaught || {}; return Object.keys(caught).length; } },
              { id: 'aquacultureLab', icon: '🦪', label: 'Farm Log',
                color: '#14b8a6', accent: 'rgba(20,184,166,0.15)',
                slot: '__alloflowAquacultureLab', lsKey: 'aquacultureLab.state.v1', total: 5,
                count: function () { var s = _readSlot('__alloflowAquacultureLab', 'aquacultureLab.state.v1'); return s && typeof s.droppersDeployed === 'number' ? s.droppersDeployed : 0; } }
            ];
            var _atlasActive = _atlasEntries.map(function (e) { return Object.assign({}, e, { current: e.count() }); }).filter(function (e) { return e.current > 0; });
            var _atlasTotal = _atlasActive.reduce(function (s, e) { return s + e.current; }, 0);
            return /*#__PURE__*/React.createElement("div", {
              className: "stem-tool-catalog max-w-6xl mx-auto animate-in fade-in duration-200"
            },
          // ── Mastery Atlas (only shows when at least one tool has progress) ──
          _atlasActive.length > 0 && /*#__PURE__*/React.createElement("div", {
            role: 'region',
            'aria-label': 'STEAM Lab Mastery Atlas — ' + _atlasTotal + ' total items mastered across ' + _atlasActive.length + ' tools',
            className: "mb-4 rounded-2xl p-4 border-2",
            style: { background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #312e81 100%)', borderColor: 'rgba(99,102,241,0.50)' }
          },
            /*#__PURE__*/React.createElement("div", { className: "flex items-center justify-between gap-2 mb-3 flex-wrap" },
              /*#__PURE__*/React.createElement("div", { className: "flex items-center gap-2" },
                /*#__PURE__*/React.createElement("span", { 'aria-hidden': 'true', style: { fontSize: 22 } }, '🏅'),
                /*#__PURE__*/React.createElement("h3", { className: "text-base font-black text-amber-300 m-0" }, "Your Mastery Atlas"),
                /*#__PURE__*/React.createElement("span", { className: "text-[11px] text-slate-300 font-mono ml-1" }, _atlasTotal + ' items locked in')
              ),
              /*#__PURE__*/React.createElement("span", { className: "text-[11px] text-slate-400 italic" }, "Click any tool to jump back in")
            ),
            /*#__PURE__*/React.createElement("div", {
              className: "grid gap-2",
              style: { gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }
            },
              _atlasActive.map(function (entry) {
                var pct = entry.total > 0 ? Math.round((entry.current / entry.total) * 100) : 0;
                var isFull = entry.current >= entry.total;
                return /*#__PURE__*/React.createElement("button", {
                  key: entry.id,
                  onClick: function () { _openStemTool(entry.id, entry.label); },
                  'aria-label': entry.label + ': ' + entry.current + ' of ' + entry.total + ' mastered. Click to open.',
                  className: "text-left p-3 rounded-xl border transition hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-amber-400",
                  style: {
                    background: entry.accent,
                    borderColor: entry.color + '88',
                    color: '#f1f5f9',
                    cursor: 'pointer'
                  }
                },
                  /*#__PURE__*/React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                    /*#__PURE__*/React.createElement("span", { 'aria-hidden': 'true', style: { fontSize: 20 } }, entry.icon),
                    /*#__PURE__*/React.createElement("div", { className: "flex-1 min-w-0" },
                      /*#__PURE__*/React.createElement("div", { className: "text-[12px] font-black truncate", style: { color: '#f1f5f9' } }, entry.label),
                      /*#__PURE__*/React.createElement("div", { className: "text-[10px] font-mono", style: { color: entry.color } },
                        entry.current + ' / ' + entry.total + (isFull ? ' 🏆' : '')
                      )
                    )
                  ),
                  /*#__PURE__*/React.createElement("div", {
                    className: "h-1.5 rounded-full overflow-hidden",
                    style: { background: 'rgba(15,23,42,0.6)' },
                    'aria-hidden': 'true'
                  },
                    /*#__PURE__*/React.createElement("div", {
                      className: "h-full transition-all",
                      style: { width: pct + '%', background: entry.color }
                    })
                  )
                );
              })
            )
          ),
          // Search input
          /*#__PURE__*/React.createElement("div", { className: "stem-tool-searchbar mb-4 relative" },
            /*#__PURE__*/React.createElement("input", {
              type: "text",
              value: _stemToolSearch,
              onChange: function (e) {
                _setStemToolSearch(e.target.value);
                if (d._categoryFilter) upd('_categoryFilter', '');
              },
              placeholder: "Search " + _totalToolCount + " tools...",
              className: "w-full px-4 py-2.5 pl-10 text-sm border border-slate-500 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all",
              'aria-label': 'Search STEAM Lab tools'
            }),
            /*#__PURE__*/React.createElement("span", { className: "absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" }, "\uD83D\uDD0D"),
              _stemToolSearch && /*#__PURE__*/React.createElement("button", {
                onClick: function () { _setStemToolSearch(''); upd('_categoryFilter', ''); },
                className: "absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600 text-xs font-bold transition-colors",
                'aria-label': 'Clear search'
              }, "\u2715")
            ),

          // ── Category filter chips ──
          React.createElement("div", {
            className: "stem-catalog-context"
          },
            React.createElement("span", {
              className: "stem-catalog-status",
              role: "status",
              "aria-live": "polite",
              style: {
                backgroundColor: isContrast ? '#000' : (isDark ? 'rgba(30,41,59,0.82)' : '#f8fafc'),
                color: _pal.text,
                borderColor: _pal.border
              }
            }, _catalogContextLabel + " · " + _toolCount + " tool" + (_toolCount === 1 ? "" : "s")),
            _hasCatalogFilter && !_activeStation && React.createElement("button", {
              type: "button",
              className: "stem-catalog-clear",
              onClick: function () {
                _setStemToolSearch('');
                upd('_categoryFilter', '');
                if (typeof announceToSR === 'function') announceToSR('Showing all STEAM Lab tools');
              },
              style: {
                backgroundColor: isContrast ? '#111' : (isDark ? 'rgba(99,102,241,0.18)' : '#eef2ff'),
                color: isContrast ? '#fbbf24' : (isDark ? '#c7d2fe' : '#3730a3'),
                borderColor: isContrast ? '#fbbf24' : 'rgba(99,102,241,0.35)'
              },
              "aria-label": "Clear STEAM Lab catalog filters"
            }, "\u2715", React.createElement("span", null, "Clear filters"))
          ),

          !_activeStation && _recentStemTools.length > 0 && React.createElement("div", {
            className: "stem-catalog-quickbar",
            role: "group",
            "aria-label": "Recent STEM tools"
          },
            React.createElement("span", {
              className: "stem-catalog-row-label",
              style: { color: _pal.textMuted }
            }, "Recent"),
            _recentStemTools.map(function (tool) {
              return React.createElement("button", {
                key: "recent-" + tool.id,
                type: "button",
                className: "stem-catalog-chip",
                onClick: function () { _openStemTool(tool.id, tool.label); },
                style: {
                  backgroundColor: isContrast ? '#000' : (isDark ? 'rgba(15,23,42,0.82)' : '#ffffff'),
                  color: _pal.text,
                  borderColor: _pal.border
                },
                "aria-label": "Open recent STEM tool " + tool.label
              }, React.createElement("span", { className: "stem-catalog-chip-icon", "aria-hidden": "true" }, tool.icon), React.createElement("span", null, tool.label));
            })
          ),

          !_activeStation && !_searchLower && !_catFilter && React.createElement("div", {
            className: "stem-tool-matchmaker",
            role: "region",
            "aria-label": "AI STEM tool picker",
            style: {
              backgroundColor: isContrast ? '#000' : (isDark ? 'rgba(15,23,42,0.76)' : '#ffffff'),
              color: _pal.text,
              borderColor: isContrast ? '#fbbf24' : 'rgba(99,102,241,0.30)'
            }
          },
            React.createElement("form", {
              className: "stem-tool-matchmaker-form",
              onSubmit: function (e) {
                e.preventDefault();
                _requestStemToolSuggestions();
              }
            },
              React.createElement("label", { className: "sr-only", htmlFor: "stem-tool-interest" }, "Topic or project interest"),
              React.createElement("input", {
                id: "stem-tool-interest",
                type: "text",
                value: _stemToolInterest,
                onChange: function (e) {
                  _setStemToolInterest(e.target.value);
                  if (_stemToolSuggestError) _setStemToolSuggestError('');
                },
                placeholder: "What do you want to learn about?",
                className: "stem-tool-matchmaker-input",
                style: {
                  backgroundColor: isContrast ? '#000' : (isDark ? '#0f172a' : '#ffffff'),
                  color: _pal.text,
                  borderColor: _pal.border
                },
                "aria-label": "What do you want to learn about?"
              }),
              React.createElement("button", {
                type: "submit",
                className: "stem-tool-matchmaker-button",
                disabled: _stemToolSuggesting,
                style: {
                  backgroundColor: isContrast ? '#fbbf24' : '#4f46e5',
                  color: isContrast ? '#000' : '#ffffff',
                  cursor: _stemToolSuggesting ? 'wait' : 'pointer',
                  opacity: _stemToolSuggesting ? 0.78 : 1
                },
                "aria-label": "Suggest STEM tools with AI"
              }, React.createElement("span", { "aria-hidden": "true" }, "AI"), React.createElement("span", null, _stemToolSuggesting ? "Thinking..." : "Suggest tools"))
            ),
            (_stemToolSuggesting || _stemToolSuggestError) && React.createElement("p", {
              className: "stem-tool-matchmaker-status",
              role: "status",
              "aria-live": "polite",
              style: { color: _stemToolSuggestError ? (isContrast ? '#fbbf24' : '#b45309') : _pal.textMuted }
            }, _stemToolSuggesting ? "Finding tool matches..." : _stemToolSuggestError),
            _stemToolSuggestions.length > 0 && React.createElement("div", {
              className: "stem-tool-ai-suggestions",
              role: "group",
              "aria-label": "Suggested STEM tools"
            },
              _stemToolSuggestions.map(function (suggestion) {
                return React.createElement("button", {
                  key: "ai-suggest-" + suggestion.id,
                  type: "button",
                  className: "stem-tool-ai-suggestion",
                  onClick: function () { _openStemTool(suggestion.id, suggestion.label); },
                  style: {
                    backgroundColor: isContrast ? '#000' : (isDark ? 'rgba(30,41,59,0.92)' : '#f8fafc'),
                    color: _pal.text,
                    borderColor: _pal.border
                  },
                  "aria-label": "Open suggested STEM tool " + suggestion.label + ". " + suggestion.reason
                },
                  React.createElement("span", { className: "stem-tool-ai-suggestion-title" },
                    React.createElement("span", { className: "stem-catalog-chip-icon", "aria-hidden": "true" }, suggestion.icon),
                    React.createElement("span", null, suggestion.label)
                  ),
                  React.createElement("span", { className: "stem-tool-ai-suggestion-reason", style: { color: _pal.textMuted } }, suggestion.reason),
                  suggestion.starter && React.createElement("span", { className: "block mt-1 text-[10px] font-black", style: { color: isContrast ? '#fbbf24' : (isDark ? '#c7d2fe' : '#4338ca') } }, "Try: " + suggestion.starter)
                );
              })
            )
          ),

          !_activeStation && React.createElement("div", { className: "stem-tool-filter-row flex flex-wrap gap-1.5 mb-3", role: 'group', 'aria-label': 'Filter tools by category' },
            _categoryFilterOptions.map(function(cat) {
              var isActive = (_stemToolSearch === '' && !d._categoryFilter && cat.id === '') || d._categoryFilter === cat.id;
              return React.createElement("button", {
                key: cat.id,
                'aria-label': 'Filter by ' + (cat.label || 'all categories'),
                'aria-pressed': isActive ? 'true' : 'false',
                onClick: function() {
                  var newFilter = cat.id === d._categoryFilter ? '' : cat.id;
                  upd('_categoryFilter', newFilter);
                  _setStemToolSearch('');
                  if (typeof announceToSR === 'function') announceToSR(newFilter ? 'Showing ' + cat.label + ' tools' : 'Showing all tools');
                },
                className: "px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border " +
                  (isActive ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-600 hover:text-indigo-600')
              }, cat.icon + ' ' + cat.label);
            })
          ),

          // ── Station Controls ──
          React.createElement("div", { className: "flex items-center gap-2 mb-4" },
            // Create Station button
            React.createElement("button", { "aria-label": "Toggle station builder",
              onClick: function() { _setShowStationBuilder(!_showStationBuilder); },
              className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all " +
                (_showStationBuilder ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100")
            }, "\uD83D\uDCCC", _showStationBuilder ? "Close Builder" : "Create Station"),
            // Active station indicator
            _activeStation ? React.createElement("div", { className: "flex items-center gap-2 flex-1 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200" },
              React.createElement("span", { className: "text-xs font-bold text-emerald-700" }, "\uD83C\uDFAF Station: " + _activeStation.name),
              _activeStation.grade ? React.createElement("span", { className: "text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold" }, "Grade " + _activeStation.grade) : null,
              React.createElement("button", { "aria-label": "Exit Station",
                onClick: function() { _setActiveStationId(null); },
                className: "ml-auto text-[10px] text-emerald-500 hover:text-emerald-700 font-bold"
              }, "\u2715 Exit Station"),
              // Quest count badge
              _activeStation.quests && _activeStation.quests.length > 0 ? React.createElement("span", { className: "text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold" },
                "\uD83C\uDFC6 " + (_activeStation.quests.filter(function(q) { return ((_questProgress[_activeStation.id] || {})[q.qid] || {}).complete; }).length) + "/" + _activeStation.quests.length + " quests"
              ) : null
            ) : null,
            // Saved stations dropdown
            _savedStations.length > 0 && !_activeStation ? React.createElement("select", {
              // No caption at all next to this one — its only clue was the first
              // option's text, which a screen reader reads as a value, not a name.
              "aria-label": "Load a saved station",
              value: _activeStationId || '',
              onChange: function(e) {
                var sid = e.target.value;
                _setActiveStationId(sid || null);
                if (sid) {
                  var st = _savedStations.find(function(s) { return s.id === sid; });
                  if (st && st.grade && typeof props.setGradeLevel === 'function') {
                    props.setGradeLevel(st.grade);
                  }
                  if (addToast) addToast('\uD83C\uDFAF Station loaded: ' + (st ? st.name : ''), 'success');
                }
              },
              className: "px-2 py-1.5 text-xs border border-slate-500 rounded-lg bg-white text-slate-700 font-bold"
            },
              React.createElement("option", { value: "" }, "\uD83D\uDCCB Load Station..."),
              _savedStations.map(function(st) {
                var questInfo = st.quests && st.quests.length > 0 ? ' \uD83C\uDFC6' + st.quests.length : '';
                return React.createElement("option", { key: st.id, value: st.id }, st.name + (st.grade ? ' (Gr ' + st.grade + ')' : '') + questInfo);
              })
            ) : null
          ),

          // ═══ Quest HUD (floating compact panel) ═══
          _activeStation && _activeStation.quests && _activeStation.quests.length > 0 && stemLabTool ?
            React.createElement("div", {
              className: "fixed bottom-4 right-4 z-[9998] transition-all " + (_questHudCollapsed ? 'w-auto' : 'w-72'),
              role: 'region',
              'aria-label': 'Quest log for station ' + _activeStation.name
            },
              React.createElement("div", { className: "bg-white/95 backdrop-blur-sm rounded-xl border-2 border-amber-300 shadow-2xl overflow-hidden" },
              // Header
              React.createElement("div", {
                className: "flex items-center justify-between px-3 py-1.5 bg-amber-100 cursor-pointer",
                onClick: function() { _setQuestHudCollapsed(!_questHudCollapsed); }
              },
                React.createElement("span", { className: "text-xs font-bold text-amber-800" }, "\uD83C\uDFC6 Quest Log"),
                React.createElement("div", { className: "flex items-center gap-2" },
                  React.createElement("span", { className: "text-[10px] text-amber-600 font-bold" },
                    _activeStation.quests.filter(function(q) { return ((_questProgress[_activeStation.id] || {})[q.qid] || {}).complete; }).length + "/" + _activeStation.quests.length + " complete"
                  ),
                  React.createElement("span", { className: "text-[10px] text-amber-500" }, _questHudCollapsed ? "\u25BC" : "\u25B2")
                )
              ),
              // Quest list
              !_questHudCollapsed && React.createElement("div", { className: "p-2 space-y-1.5" },
                _activeStation.quests.map(function(quest) {
                  var disp = _getQuestDisplay(quest, labToolData || {}, _questProgress, _activeStation.id);
                  var qp = ((_questProgress[_activeStation.id] || {})[quest.qid]) || {};
                  var qtDef = QUEST_TYPES.find(function(qt) { return qt.id === quest.type; }) || {};
                  // Difficulty indicator
                  var difficulty = 'easy';
                  if (quest.type === 'xpThreshold' && (quest.params.threshold || 50) >= 75) difficulty = 'hard';
                  else if (quest.type === 'xpThreshold' && (quest.params.threshold || 50) >= 40) difficulty = 'medium';
                  else if (quest.type === 'timeSpent' && (quest.params.minutes || 5) >= 8) difficulty = 'hard';
                  else if (quest.type === 'timeSpent' && (quest.params.minutes || 5) >= 5) difficulty = 'medium';
                  else if (quest.type === 'freeResponse' && (quest.params.minLength || 30) >= 60) difficulty = 'hard';
                  else if (quest.type === 'freeResponse') difficulty = 'medium';
                  else if (quest.type === 'toolQuest') difficulty = 'medium';
                  var diffColors = { easy: 'bg-green-100 text-green-700', medium: 'bg-amber-100 text-amber-800', hard: 'bg-red-100 text-red-700' };
                  var diffLabels = { easy: '\u2605', medium: '\u2605\u2605', hard: '\u2605\u2605\u2605' };
                  return React.createElement("div", { key: quest.qid, className: "bg-white rounded-lg px-2.5 py-2 border " + (disp.done ? 'border-green-300 bg-green-50/50' : 'border-amber-200') },
                    React.createElement("div", { className: "flex items-center justify-between mb-1" },
                      React.createElement("div", { className: "flex items-center gap-1.5 flex-1 min-w-0" },
                        React.createElement("span", { className: "text-[11px] font-bold truncate " + (disp.done ? 'text-green-700' : 'text-slate-700') },
                          (disp.done ? "\u2705 " : (qtDef.icon || "\u2B1C") + " ") + quest.label
                        ),
                        !disp.done && React.createElement("span", { className: "text-[10px] px-1 py-0.5 rounded-full shrink-0 " + diffColors[difficulty], title: difficulty + ' difficulty' }, diffLabels[difficulty])
                      ),
                      React.createElement("span", { className: "text-[10px] font-mono shrink-0 ml-1 " + (disp.done ? 'text-green-500' : 'text-amber-600') }, disp.text)
                    ),
                    // Live timer for timeSpent quests
                    quest.type === 'timeSpent' && !disp.done && (function() {
                      var ms = (qp.timeAccumMs || 0);
                      var targetMs = (quest.params.minutes || 5) * 60000;
                      var min = Math.floor(ms / 60000);
                      var sec = Math.floor((ms % 60000) / 1000);
                      var isActive = stemLabTool === quest.toolId;
                      return React.createElement("div", { className: "flex items-center gap-1.5 mt-0.5 mb-0.5" },
                        React.createElement("span", { className: "text-[10px] " + (isActive ? 'text-green-600 font-bold' : 'text-slate-400') },
                          (isActive ? '\u25CF ' : '\u25CB ') + min + ':' + sec.toString().padStart(2, '0') + ' / ' + (quest.params.minutes || 5) + ':00'
                        ),
                        // "counting active time", not "timing" — the clock only
                        // advances while the learner is present, so a bare
                        // "timing..." next to a stalled number would be a lie.
                        isActive && React.createElement("span", { className: "text-[10px] text-green-500" }, 'counting active time')
                      );
                    })(),
                    // Progress bar
                    !disp.done && React.createElement("div", { className: "h-1.5 bg-slate-100 rounded-full overflow-hidden", role: 'progressbar', 'aria-valuenow': Math.round(disp.pct), 'aria-valuemax': 100 },
                      React.createElement("div", { className: "h-full rounded-full transition-all " + (disp.pct >= 80 ? 'bg-green-400' : disp.pct >= 50 ? 'bg-amber-400' : 'bg-amber-300'), style: { width: disp.pct + '%' } })
                    ),
                    // Free response textarea
                    quest.type === 'freeResponse' && !disp.done && React.createElement("textarea", {
                      value: qp.response || '',
                      placeholder: quest.params.prompt || 'Describe what you learned...',
                      'aria-label': quest.params.prompt || 'Write your response',
                      onChange: function(e) {
                        var val = e.target.value;
                        _setQuestProgress(function(prev) {
                          var sp = Object.assign({}, prev[_activeStation.id] || {});
                          var qpUpdate = Object.assign({}, sp[quest.qid] || {});
                          qpUpdate.response = val;
                          sp[quest.qid] = qpUpdate;
                          var next = Object.assign({}, prev);
                          next[_activeStation.id] = sp;
                          return next;
                        });
                      },
                      rows: 2,
                      className: "w-full mt-1.5 px-2 py-1.5 text-xs border border-amber-200 rounded-lg resize-none focus:ring-2 focus:ring-amber-400 outline-none"
                    })
                  );
                }),
                // All quests complete celebration
                (function() {
                  var allDone = _activeStation.quests.every(function(q) { return ((_questProgress[_activeStation.id] || {})[q.qid] || {}).complete; });
                  var completedCount = _activeStation.quests.filter(function(q) { return ((_questProgress[_activeStation.id] || {})[q.qid] || {}).complete; }).length;
                  return React.createElement("div", { className: "space-y-1.5" },
                    // All complete celebration
                    allDone ? React.createElement("div", { className: "bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg p-3 border border-green-300 text-center" },
                      React.createElement("div", { className: "text-2xl mb-1" }, "\uD83C\uDF89"),
                      React.createElement("p", { className: "text-sm font-bold text-green-800" }, "All Quests Complete!"),
                      React.createElement("p", { className: "text-[10px] text-green-600 mb-2" }, "Great work, explorer! You finished all " + _activeStation.quests.length + " quests in this station."),
                      React.createElement("div", { className: "flex gap-3 justify-center" },
                        React.createElement("button", {
                          'aria-label': 'Copy quest completion report to clipboard',
                          onClick: function() {
                            var stProg = _questProgress[_activeStation.id] || {};
                            var report = '\uD83C\uDFC6 QUEST REPORT: ' + _activeStation.name + '\n';
                            report += 'Completed: ' + new Date().toLocaleDateString() + '\n\n';
                            _activeStation.quests.forEach(function(q) {
                              var qp = stProg[q.qid] || {};
                              report += (qp.complete ? '\u2705' : '\u2B1C') + ' ' + q.label;
                              if (qp.completedAt) report += ' (at ' + new Date(qp.completedAt).toLocaleTimeString() + ')';
                              if (q.type === 'freeResponse' && qp.response) report += '\n   Response: "' + qp.response + '"';
                              report += '\n';
                            });
                            report += '\nStation: ' + _activeStation.name + ' | Tools: ' + _activeStation.tools.join(', ');
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(report).then(function() {
                                if (addToast) addToast('\uD83D\uDCCB Report copied to clipboard!', 'success');
                              });
                            }
                          },
                          className: "text-[10px] text-green-700 hover:text-green-900 underline font-bold"
                        }, "\uD83D\uDCCB Copy Report"),
                        React.createElement("button", {
                          'aria-label': 'Reset all quest progress for this station',
                          onClick: function() {
                            _setQuestProgress(function(prev) {
                              var next = Object.assign({}, prev);
                              delete next[_activeStation.id];
                              return next;
                            });
                            if (addToast) addToast('\uD83D\uDD04 Quest progress reset for ' + _activeStation.name, 'info');
                          },
                          className: "text-[10px] text-green-600 hover:text-green-800 underline"
                        }, "\uD83D\uDD04 Reset & Try Again")
                      )
                    ) : null,
                    // Progress summary bar (when not all complete)
                    !allDone && completedCount > 0 ? React.createElement("div", { className: "flex items-center gap-2 px-2 py-1 bg-amber-50 rounded-lg border border-amber-200" },
                      React.createElement("div", { className: "w-full h-1.5 bg-amber-100 rounded-full overflow-hidden flex-1" },
                        React.createElement("div", { className: "h-full bg-amber-400 rounded-full transition-all", style: { width: Math.round(completedCount / _activeStation.quests.length * 100) + '%' } })
                      ),
                      React.createElement("span", { className: "text-[10px] font-bold text-amber-700 shrink-0" }, Math.round(completedCount / _activeStation.quests.length * 100) + '%')
                    ) : null
                  );
                })()
              )
            )) : null,

          // ── Station Builder Panel ──
          _showStationBuilder ? React.createElement("div", { className: "mb-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-300 p-4" },
            React.createElement("h3", { className: "text-sm font-black text-indigo-800 mb-3 flex items-center gap-2" }, "\uD83D\uDCCC Station Builder"),

            // Station name
            React.createElement("div", { className: "mb-3" },
              React.createElement("label", { className: "text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1" }, "Station Name"),
              React.createElement("input", {
                // The "Station Name" caption above is a <label> with no htmlFor,
                // and this input has no id — so they are not associated and the
                // caption is decoration. Same pattern on the two selects and the
                // prompt field below. Naming each control directly is the smaller
                // change here; pairing htmlFor with generated ids would risk
                // collisions, since this panel renders inside a shared modal.
                "aria-label": "Station Name",
                type: "text", value: _stationName, placeholder: "e.g. Water Cycle Exploration",
                onChange: function(e) { _setStationName(e.target.value); },
                className: "w-full px-3 py-2 text-sm border border-indigo-500 rounded-lg bg-white focus:ring-2 focus:ring-indigo-400 outline-none"
              })
            ),

            // Grade + Time row
            React.createElement("div", { className: "grid grid-cols-2 gap-3 mb-3" },
              React.createElement("div", null,
                React.createElement("label", { className: "text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1" }, "Grade Level"),
                React.createElement("select", {
                  "aria-label": "Grade Level",
                  value: _stationGrade,
                  onChange: function(e) { _setStationGrade(e.target.value); },
                  className: "w-full px-3 py-2 text-sm border border-indigo-500 rounded-lg bg-white"
                },
                  React.createElement("option", { value: "" }, "Auto-detect"),
                  ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map(function(g) {
                    return React.createElement("option", { key: g, value: g }, "Grade " + g);
                  })
                )
              ),
              React.createElement("div", null,
                React.createElement("label", { className: "text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1" }, "Time Estimate"),
                React.createElement("select", {
                  "aria-label": "Time Estimate",
                  value: _stationTimeEst,
                  onChange: function(e) { _setStationTimeEst(e.target.value); },
                  className: "w-full px-3 py-2 text-sm border border-indigo-500 rounded-lg bg-white"
                },
                  ["10", "15", "20", "30", "45", "60"].map(function(m) {
                    return React.createElement("option", { key: m, value: m }, m + " minutes");
                  })
                )
              )
            ),

            // Teacher note
            React.createElement("div", { className: "mb-3" },
              React.createElement("label", { className: "text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1" }, "Teacher Instructions (optional)"),
              React.createElement("textarea", {
                value: _stationNote, placeholder: "e.g. Start with the Water Cycle tool, then complete the Quiz.",
                onChange: function(e) { _setStationNote(e.target.value); },
                rows: 2, className: "w-full px-3 py-2 text-sm border border-indigo-500 rounded-lg bg-white resize-none focus:ring-2 focus:ring-indigo-400 outline-none"
              })
            ),

            // ═══ Quest Picker (optional) ═══
            React.createElement("div", { className: "mb-3 border border-amber-200 rounded-xl overflow-hidden" },
              React.createElement("button", {
                'aria-label': 'Toggle quest assignment section. ' + _stationQuests.length + ' quests added.',
                'aria-expanded': _questPickerOpen ? 'true' : 'false',
                onClick: function() { _setQuestPickerOpen(!_questPickerOpen); },
                className: "w-full flex items-center justify-between px-3 py-2 text-sm font-bold " + (_questPickerOpen ? 'bg-amber-100 text-amber-800' : 'bg-amber-50 text-amber-700 hover:bg-amber-100') + " transition-colors"
              },
                React.createElement("span", null, "\uD83C\uDFC6 Add Quests (" + _stationQuests.length + ")" + (_stationQuests.length === 0 ? " \u2014 optional" : "")),
                React.createElement("span", { className: "text-xs" }, _questPickerOpen ? "\u25B2" : "\u25BC")
              ),
              _questPickerOpen && React.createElement("div", { className: "p-3 bg-amber-50/50 space-y-3" },
                // Quick preset templates + auto-suggest
                _stationQuests.length === 0 && React.createElement("div", { className: "space-y-1.5" },
                  React.createElement("p", { className: "text-[10px] text-amber-600 font-bold uppercase tracking-wider mb-1" }, "\u26A1 Quick Presets"),
                  // Auto-suggest button
                  (function() {
                    var selectedTools = Object.keys(_stationTools).filter(function(k) { return _stationTools[k]; });
                    var totalHooksAvailable = 0;
                    selectedTools.forEach(function(tid) { totalHooksAvailable += _getToolQuestHooks(tid).length; });
                    if (totalHooksAvailable === 0 || selectedTools.length === 0) return null;
                    return React.createElement("button", {
                      'aria-label': 'Auto-generate smart quests based on selected tools',
                      onClick: function() {
                        var autoQuests = [];
                        // Add 1 XP quest per tool
                        selectedTools.slice(0, 2).forEach(function(tid) {
                          autoQuests.push({ type: 'xpThreshold', toolId: tid, label: _questAutoLabel('xpThreshold', tid, { threshold: 40 }), params: { threshold: 40 } });
                        });
                        // Add best tool-specific hooks (up to 3)
                        var hookQuests = [];
                        selectedTools.forEach(function(tid) {
                          var hooks = _getToolQuestHooks(tid);
                          if (hooks.length > 0) hookQuests.push({ type: 'toolQuest', toolId: tid, label: hooks[0].label, params: { hookId: hooks[0].id } });
                          if (hooks.length > 1) hookQuests.push({ type: 'toolQuest', toolId: tid, label: hooks[1].label, params: { hookId: hooks[1].id } });
                        });
                        autoQuests = autoQuests.concat(hookQuests.slice(0, 3));
                        // Add a reflection
                        autoQuests.push({ type: 'freeResponse', toolId: null, label: 'What did you learn?', params: { prompt: 'What was the most interesting thing you discovered today?', minLength: 30 } });
                        _setStationQuests(autoQuests);
                        if (addToast) addToast('\uD83E\uDD16 Smart quests generated! ' + autoQuests.length + ' quests based on your tools.', 'success');
                      },
                      className: "w-full mb-1.5 py-2 rounded-lg text-[10px] font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-600 hover:to-indigo-600 transition-all shadow-sm"
                    }, "\uD83E\uDD16 Auto-Generate Smart Quests (" + totalHooksAvailable + " available)");
                  })(),
                  React.createElement("div", { className: "grid grid-cols-3 gap-1.5" },
                    [
                      { name: 'Quick Explore', icon: '\uD83D\uDC63', desc: 'XP + time in each tool', quests: function() {
                        var tools = Object.keys(_stationTools).filter(function(k) { return _stationTools[k]; });
                        return tools.slice(0, 3).map(function(tid) {
                          return { type: 'xpThreshold', toolId: tid, label: _questAutoLabel('xpThreshold', tid, { threshold: 30 }), params: { threshold: 30 } };
                        }).concat([{ type: 'timeSpent', toolId: tools[0] || null, label: _questAutoLabel('timeSpent', tools[0] || null, { minutes: 3 }), params: { minutes: 3 } }]);
                      }},
                      { name: 'Deep Dive', icon: '\uD83D\uDD2C', desc: 'XP + quiz + reflection', quests: function() {
                        var tools = Object.keys(_stationTools).filter(function(k) { return _stationTools[k]; });
                        var t0 = tools[0] || null;
                        return [
                          { type: 'xpThreshold', toolId: t0, label: _questAutoLabel('xpThreshold', t0, { threshold: 75 }), params: { threshold: 75 } },
                          { type: 'timeSpent', toolId: t0, label: _questAutoLabel('timeSpent', t0, { minutes: 8 }), params: { minutes: 8 } },
                          { type: 'freeResponse', toolId: null, label: 'What was the most important thing you learned?', params: { prompt: 'What was the most important thing you learned and why?', minLength: 50 } }
                        ];
                      }},
                      { name: 'Research Report', icon: '\uD83D\uDCDD', desc: 'Explore + document', quests: function() {
                        var tools = Object.keys(_stationTools).filter(function(k) { return _stationTools[k]; });
                        return tools.slice(0, 2).map(function(tid) {
                          return { type: 'xpThreshold', toolId: tid, label: _questAutoLabel('xpThreshold', tid, { threshold: 50 }), params: { threshold: 50 } };
                        }).concat([
                          { type: 'freeResponse', toolId: null, label: 'Compare what you learned from each tool', params: { prompt: 'Compare what you learned from each tool. How do they connect?', minLength: 80 } },
                          { type: 'freeResponse', toolId: null, label: 'Write a question you still have', params: { prompt: 'Write a question you still have after exploring.', minLength: 20 } }
                        ]);
                      }}
                    ].map(function(preset) {
                      return React.createElement("button", {
                        key: preset.name,
                        'aria-label': 'Apply preset: ' + preset.name + '. ' + preset.desc,
                        onClick: function() {
                          var tools = Object.keys(_stationTools).filter(function(k) { return _stationTools[k]; });
                          if (tools.length === 0) { if (addToast) addToast('Select tools first, then add quests', 'info'); return; }
                          _setStationQuests(preset.quests());
                          if (addToast) addToast('\uD83C\uDFC6 Applied "' + preset.name + '" quest template!', 'success');
                        },
                        className: "bg-white rounded-lg p-2 border border-amber-200 hover:border-amber-400 hover:bg-amber-50 transition-all text-center"
                      },
                        React.createElement("div", { className: "text-lg" }, preset.icon),
                        React.createElement("div", { className: "text-[10px] font-bold text-amber-800" }, preset.name),
                        React.createElement("div", { className: "text-[10px] text-amber-600" }, preset.desc)
                      );
                    })
                  )
                ),
                // Added quests list
                _stationQuests.length > 0 && React.createElement("div", { className: "space-y-1.5" },
                  _stationQuests.map(function(q, qi) {
                    return React.createElement("div", { key: qi, className: "flex items-center justify-between bg-white rounded-lg px-2.5 py-1.5 border border-amber-200 text-xs" },
                      React.createElement("span", null, QUEST_TYPES.find(function(qt) { return qt.id === q.type; })?.icon + " " + q.label),
                      React.createElement("button", {
                        'aria-label': 'Remove quest: ' + q.label,
                        onClick: function() { _setStationQuests(_stationQuests.filter(function(_, i) { return i !== qi; })); },
                        className: "text-red-400 hover:text-red-600 px-1"
                      }, "\u2715")
                    );
                  })
                ),
                // Tool-specific quests (from questHooks)
                (function() {
                  var selectedToolIds = Object.keys(_stationTools).filter(function(k) { return _stationTools[k]; });
                  var allHooks = [];
                  selectedToolIds.forEach(function(tid) {
                    var hooks3 = _getToolQuestHooks(tid);
                    hooks3.forEach(function(h3) {
                      // Skip if already added
                      var alreadyAdded = _stationQuests.some(function(sq) { return sq.type === 'toolQuest' && sq.params && sq.params.hookId === h3.id && sq.toolId === tid; });
                      if (!alreadyAdded) allHooks.push({ toolId: tid, hook: h3 });
                    });
                  });
                  if (allHooks.length === 0) return null;
                  return React.createElement("div", { className: "bg-white rounded-lg p-2.5 border border-purple-200 space-y-1.5" },
                    React.createElement("p", { className: "text-[10px] text-purple-600 font-bold uppercase tracking-wider" }, "\uD83C\uDFC6 Tool-Specific Quests (" + allHooks.length + " available)"),
                    React.createElement("div", { className: "grid grid-cols-1 gap-1 max-h-[200px] overflow-y-auto" },
                      allHooks.map(function(ah, ahi) {
                        var toolLabel = (_allStemTools.find(function(t3) { return t3.id === ah.toolId; }) || {}).label || ah.toolId;
                        return React.createElement("button", {
                          key: ah.toolId + '_' + ah.hook.id,
                          'aria-label': 'Add quest: ' + ah.hook.label + ' in ' + toolLabel,
                          onClick: function() {
                            _setStationQuests(_stationQuests.concat([{
                              type: 'toolQuest',
                              toolId: ah.toolId,
                              label: ah.hook.label,
                              params: { hookId: ah.hook.id }
                            }]));
                            if (addToast) addToast('\uD83C\uDFC6 Added: ' + ah.hook.label, 'success');
                          },
                          className: "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[10px] bg-purple-50 border border-purple-100 hover:border-purple-400 hover:bg-purple-100 transition-all"
                        },
                          React.createElement("span", { className: "text-sm shrink-0" }, ah.hook.icon || '\uD83C\uDFC6'),
                          React.createElement("div", { className: "flex-1 min-w-0" },
                            React.createElement("div", { className: "font-bold text-purple-800 truncate" }, ah.hook.label),
                            React.createElement("div", { className: "text-[10px] text-purple-500" }, toolLabel)
                          ),
                          React.createElement("span", { className: "text-purple-400 text-xs shrink-0" }, "+")
                        );
                      })
                    )
                  );
                })(),
                // Add quest form (universal types)
                React.createElement("div", { className: "bg-white rounded-lg p-2.5 border border-amber-200 space-y-2" },
                  React.createElement("p", { className: "text-[10px] text-amber-600 font-bold uppercase tracking-wider" }, "Custom Quest"),
                  // Type selector
                  React.createElement("div", { className: "grid grid-cols-5 gap-1" },
                    QUEST_TYPES.map(function(qt) {
                      var isActive = (d._questBuilderType || 'xpThreshold') === qt.id;
                      return React.createElement("button", {
                        key: qt.id,
                        'aria-label': 'Quest type: ' + qt.label,
                        onClick: function() { upd('_questBuilderType', qt.id); },
                        className: "px-1.5 py-1.5 rounded-lg text-[10px] font-bold text-center transition-all border " + (isActive ? 'bg-amber-700 text-white border-amber-600' : 'bg-white text-amber-700 border-amber-200 hover:border-amber-400')
                      },
                        React.createElement("div", { className: "text-sm" }, qt.icon),
                        React.createElement("div", null, qt.label)
                      );
                    })
                  ),
                  // Tool selector (for non-freeResponse types)
                  (d._questBuilderType || 'xpThreshold') !== 'freeResponse' && React.createElement("div", null,
                    React.createElement("label", { className: "text-[10px] text-slate-500 block mb-0.5" }, "For which tool?"),
                    React.createElement("select", {
                      value: d._questBuilderTool || '',
                      onChange: function(e) { upd('_questBuilderTool', e.target.value); },
                      'aria-label': 'Select tool for quest',
                      className: "w-full px-2 py-1.5 text-xs border border-amber-600 rounded-lg bg-white"
                    },
                      React.createElement("option", { value: "" }, "-- Select a tool --"),
                      Object.keys(_stationTools).filter(function(k) { return _stationTools[k]; }).map(function(toolId) {
                        var tool = _allStemTools.find(function(t2) { return t2.id === toolId; });
                        return React.createElement("option", { key: toolId, value: toolId }, (tool ? tool.icon + ' ' + tool.label : toolId));
                      })
                    )
                  ),
                  // Parameter input
                  React.createElement("div", null,
                    (function() {
                      var qType = d._questBuilderType || 'xpThreshold';
                      var qtDef = QUEST_TYPES.find(function(qt2) { return qt2.id === qType; }) || QUEST_TYPES[0];
                      if (qType === 'freeResponse') {
                        return React.createElement("div", null,
                          React.createElement("label", { className: "text-[10px] text-slate-500 block mb-0.5" }, "Prompt for student"),
                          React.createElement("input", {
                            type: "text",
                            "aria-label": "Prompt for student",
                            value: d._questBuilderPrompt || '',
                            onChange: function(e) { upd('_questBuilderPrompt', e.target.value); },
                            placeholder: "e.g. What was the most interesting thing you learned?",
                            className: "w-full px-2 py-1.5 text-xs border border-amber-200 rounded-lg"
                          })
                        );
                      }
                      return React.createElement("div", null,
                        React.createElement("label", { className: "text-[10px] text-slate-500 block mb-0.5" }, qtDef.paramLabel),
                        React.createElement("input", {
                          type: "number",
                          value: d._questBuilderParam || qtDef.defaultVal,
                          onChange: function(e) { upd('_questBuilderParam', parseInt(e.target.value) || qtDef.defaultVal); },
                          min: 1,
                          'aria-label': qtDef.paramLabel + ' for quest',
                          className: "w-20 px-2 py-1.5 text-xs border border-amber-200 rounded-lg"
                        }),
                        React.createElement("span", { className: "text-[10px] text-slate-400 ml-1.5" }, qtDef.unit)
                      );
                    })()
                  ),
                  // Preview + Add button
                  React.createElement("div", { className: "flex items-center justify-between" },
                    React.createElement("span", { className: "text-[10px] text-slate-400 italic" },
                      "\u201C" + _questAutoLabel(
                        d._questBuilderType || 'xpThreshold',
                        d._questBuilderTool || null,
                        (function() {
                          var qT = d._questBuilderType || 'xpThreshold';
                          var p = d._questBuilderParam || QUEST_TYPES.find(function(x) { return x.id === qT; })?.defaultVal || 5;
                          if (qT === 'xpThreshold') return { threshold: p };
                          if (qT === 'timeSpent') return { minutes: p };
                          if (qT === 'discoveryCount') return { count: p };
                          if (qT === 'quizScore') return { minScore: p };
                          if (qT === 'freeResponse') return { prompt: d._questBuilderPrompt || 'Describe what you learned', minLength: 30 };
                          return {};
                        })()
                      ) + "\u201D"
                    ),
                    React.createElement("button", {
                      'aria-label': 'Add this quest to the station',
                      disabled: (d._questBuilderType || 'xpThreshold') !== 'freeResponse' && !d._questBuilderTool,
                      onClick: function() {
                        var qT2 = d._questBuilderType || 'xpThreshold';
                        var p2 = d._questBuilderParam || QUEST_TYPES.find(function(x) { return x.id === qT2; })?.defaultVal || 5;
                        var params2;
                        if (qT2 === 'xpThreshold') params2 = { threshold: p2 };
                        else if (qT2 === 'timeSpent') params2 = { minutes: p2 };
                        else if (qT2 === 'discoveryCount') params2 = { count: p2, field: 'discoveries' };
                        else if (qT2 === 'quizScore') params2 = { minScore: p2, field: 'quizScore' };
                        else if (qT2 === 'freeResponse') params2 = { prompt: d._questBuilderPrompt || 'Describe what you learned', minLength: 30 };
                        else params2 = {};
                        var newQuest = {
                          type: qT2,
                          toolId: qT2 === 'freeResponse' ? null : (d._questBuilderTool || null),
                          label: _questAutoLabel(qT2, qT2 === 'freeResponse' ? null : d._questBuilderTool, params2),
                          params: params2
                        };
                        _setStationQuests(_stationQuests.concat([newQuest]));
                        upd('_questBuilderParam', null);
                        upd('_questBuilderPrompt', '');
                      },
                      className: "px-3 py-1.5 rounded-lg text-[10px] font-bold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    }, "+ Add Quest")
                  )
                )
              )
            ),

            // Tool selector grid
            React.createElement("div", { className: "mb-3" },
              React.createElement("label", { className: "text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1" },
                "Select Tools (" + Object.keys(_stationTools).filter(function(k) { return _stationTools[k]; }).length + " selected)"
              ),
              React.createElement("div", { className: "grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-[200px] overflow-y-auto p-1" },
                _allStemTools.filter(function(t) { return !t.category && t.ready !== false; }).map(function(tool) {
                  var isSelected = !!_stationTools[tool.id];
                  return React.createElement("button", { "aria-label": (isSelected ? "Remove " : "Add ") + tool.label + " to station",
                    key: tool.id,
                    onClick: function() {
                      var next = Object.assign({}, _stationTools);
                      if (next[tool.id]) { delete next[tool.id]; } else { next[tool.id] = true; }
                      _setStationTools(next);
                    },
                    className: "p-2 rounded-lg text-left text-[10px] font-bold transition-all border " +
                      (isSelected ? "bg-indigo-100 border-indigo-400 text-indigo-800" : "bg-white border-slate-200 text-slate-600 hover:border-indigo-600")
                  },
                    React.createElement("span", { className: "text-lg block" }, tool.icon),
                    React.createElement("span", { className: "block truncate" }, tool.label)
                  );
                })
              )
            ),

            // Save + Cancel buttons
            React.createElement("div", { className: "flex gap-2" },
              React.createElement("button", { "aria-label": "Save STEM station",
                onClick: function() {
                  var selectedIds = Object.keys(_stationTools).filter(function(k) { return _stationTools[k]; });
                  if (selectedIds.length === 0) { if (addToast) addToast('Select at least one tool', 'error'); return; }
                  var station = {
                    id: 'station_' + Date.now(),
                    name: _stationName.trim() || 'STEM Station',
                    tools: selectedIds,
                    grade: _stationGrade || null,
                    timeEstimate: _stationTimeEst + ' min',
                    teacherNote: _stationNote.trim(),
                    createdAt: new Date().toISOString(),
                    quests: _stationQuests.map(function(q, qi) {
                      return { qid: 'q_' + Date.now() + '_' + qi, type: q.type, toolId: q.toolId, label: q.label, params: q.params };
                    })
                  };
                  var updated = _savedStations.concat([station]);
                  _setSavedStations(updated);
                  localStorage.setItem('alloflow_stem_stations', JSON.stringify(updated));
                  _setShowStationBuilder(false);
                  _setStationName(''); _setStationGrade(''); _setStationNote(''); _setStationTools({}); _setStationTimeEst('20');
                  _setStationQuests([]); _setQuestPickerOpen(false);
                  _setActiveStationId(station.id);
                  if (station.grade && typeof props.setGradeLevel === 'function') props.setGradeLevel(station.grade);
                  var questMsg = station.quests.length > 0 ? ' \u2022 ' + station.quests.length + ' quest' + (station.quests.length > 1 ? 's' : '') : '';
                  if (addToast) addToast('\u2705 Station "' + station.name + '" created with ' + selectedIds.length + ' tools!' + questMsg, 'success');
                },
                disabled: Object.keys(_stationTools).filter(function(k) { return _stationTools[k]; }).length === 0,
                className: "flex-1 py-2 rounded-lg text-sm font-bold transition-all " +
                  (Object.keys(_stationTools).filter(function(k) { return _stationTools[k]; }).length > 0
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-slate-200 text-slate-700 cursor-not-allowed")
              }, "\uD83D\uDCCC Save Station"),
              React.createElement("button", { "aria-label": "Cancel",
                onClick: function() { _setShowStationBuilder(false); },
                className: "px-4 py-2 rounded-lg text-sm font-bold text-slate-600 bg-white border border-slate-400 hover:bg-slate-50"
              }, "Cancel")
            ),

            // Manage saved stations
            _savedStations.length > 0 ? React.createElement("div", { className: "mt-3 pt-3 border-t border-indigo-200" },
              React.createElement("p", { className: "text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-2" },
                "\uD83D\uDCCB Saved Stations (" + _savedStations.length + ")"
              ),
              React.createElement("div", { className: "space-y-1.5" },
                _savedStations.map(function(st) {
                  return React.createElement("div", {
                    key: st.id, className: "flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white border border-indigo-100 text-xs"
                  },
                    React.createElement("span", { className: "font-bold text-indigo-800 flex-1" }, st.name),
                    st.grade ? React.createElement("span", { className: "text-[11px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold" }, "Gr " + st.grade) : null,
                    React.createElement("span", { className: "text-[11px] text-slate-500" }, st.tools.length + " tools"),
                    st.timeEstimate ? React.createElement("span", { className: "text-[11px] text-slate-500" }, st.timeEstimate) : null,
                    React.createElement("button", { "aria-label": "Load saved station",
                      onClick: function() {
                        _setActiveStationId(st.id);
                        _setShowStationBuilder(false);
                        if (st.grade && typeof props.setGradeLevel === 'function') props.setGradeLevel(st.grade);
                        if (addToast) addToast('\uD83C\uDFAF Station loaded!', 'success');
                      },
                      className: "text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                    }, "Load"),
                    React.createElement("button", { "aria-label": "Delete station: " + st.name,
                      onClick: function() {
                        var filtered = _savedStations.filter(function(s) { return s.id !== st.id; });
                        _setSavedStations(filtered);
                        localStorage.setItem('alloflow_stem_stations', JSON.stringify(filtered));
                        if (_activeStationId === st.id) _setActiveStationId(null);
                      },
                      className: "text-[10px] font-bold text-red-400 hover:text-red-600"
                    }, "\u2715")
                  );
                })
              )
            ) : null
          ) : null,

          // ── Active Station Info Bar ──
          _activeStation ? React.createElement("div", { className: "mb-4 bg-emerald-50 rounded-xl border border-emerald-200 p-3" },
            React.createElement("div", { className: "flex items-center gap-2 mb-1" },
              React.createElement("span", { className: "text-sm font-bold text-emerald-800" }, "\uD83C\uDFAF " + _activeStation.name),
              _activeStation.grade ? React.createElement("span", { className: "text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-200 text-emerald-800 font-bold" }, "Grade " + _activeStation.grade) : null,
              _activeStation.timeEstimate ? React.createElement("span", { className: "text-[10px] text-emerald-600" }, "\u23F1 " + _activeStation.timeEstimate) : null,
              React.createElement("span", { className: "text-[10px] text-emerald-600" }, _activeStation.tools.length + " tools")
            ),
            _activeStation.teacherNote ? React.createElement("p", { className: "text-xs text-emerald-700 italic mt-1" }, "\uD83D\uDCDD " + _activeStation.teacherNote) : null
          ) : null,

          // Tool grid
          /*#__PURE__*/React.createElement("div", { role: 'region', 'aria-label': _activeStation ? _activeStation.name + ' station tools' : 'STEAM Lab tools',
              className: "stem-tool-grid"
            }, _filteredTools.map(function (tool) {
              if (tool.category) {
                return /*#__PURE__*/React.createElement("div", {
                  key: tool.id,
                  className: "stem-tool-category mt-3 first:mt-0"
                }, /*#__PURE__*/React.createElement("h3", {
                  className: "text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1 mb-1"
                }, tool.label));
              }
              var _ci = _cardIndex++;
              var _cardColor = _catalogColorById[tool.id] || tool.color;
              var _cm = _toolColorMap[_cardColor] || _toolColorMap.blue;
              var _cardTone = isContrast ? {
                accent: '#fbbf24', iconBg: '#fbbf24', hover: '#1a1a1a',
                surface: '#000000', border: '#fbbf24', title: '#fbbf24',
                desc: '#ffffff', focus: '#fbbf24'
              } : isDark ? {
                accent: _cm.dark, iconBg: _cm.darkSoft, hover: '#1e293b',
                surface: '#0f172a', border: '#475569', title: '#f1f5f9',
                desc: '#cbd5e1', focus: '#fbbf24'
              } : {
                accent: _cm.light, iconBg: _cm.soft, hover: _cm.hover,
                surface: '#ffffff', border: '#cbd5e1', title: '#0f172a',
                desc: '#475569', focus: '#1d4ed8'
              };
              var _cardStyle = {
                '--stem-card-accent': _cardTone.accent,
                '--stem-card-icon-bg': _cardTone.iconBg,
                '--stem-card-hover': _cardTone.hover,
                '--stem-card-surface': _cardTone.surface,
                '--stem-card-border': _cardTone.border,
                '--stem-card-title': _cardTone.title,
                '--stem-card-desc': _cardTone.desc,
                '--stem-card-focus': _cardTone.focus
              };
              if (!_reduceMotion) {
                _cardStyle.animation = 'stemCardIn 0.35s ease-out both';
                _cardStyle.animationDelay = (_ci * 40) + 'ms';
              }
              return /*#__PURE__*/React.createElement("button", { "aria-label": tool.label + ': ' + (tool.desc || 'STEM tool'),
                key: tool.id,
                'data-stem-tool-id': tool.id,
                'data-stem-card-color': _cardColor,
                onClick: function () {
                  if (tool.ready === false) { if (addToast) addToast(tool.label + ' is coming soon!', 'info'); return; }
                  _openStemTool(tool.id, tool.label);
                },
                onMouseEnter: function () { try { if (typeof window.__alloEnsureStemPluginLoaded === 'function') window.__alloEnsureStemPluginLoaded(tool.id); } catch (e) {} },
                onFocus: function () { try { if (typeof window.__alloEnsureStemPluginLoaded === 'function') window.__alloEnsureStemPluginLoaded(tool.id); } catch (e) {} },
                title: tool.desc || tool.label,
                className: 'stem-tool-card group p-5 rounded-2xl border-2 text-left transition-all duration-200',
                style: _cardStyle
              }, /*#__PURE__*/React.createElement("div", {
                className: "stem-tool-card-icon text-3xl mb-2"
              }, tool.icon), /*#__PURE__*/React.createElement("h4", {
                className: 'font-bold text-sm mb-1'
              }, tool.label), /*#__PURE__*/React.createElement("p", {
                className: 'text-xs'
              }, tool.desc));
            })),
              // No results message
              _hasCatalogFilter && _toolCount === 0 && /*#__PURE__*/React.createElement("div", { className: "text-center py-12 text-slate-400" },
            /*#__PURE__*/React.createElement("div", { className: "text-4xl mb-2" }, "\uD83D\uDD0D"),
            /*#__PURE__*/React.createElement("p", { className: "text-sm font-bold" }, _stemToolSearch ? ('No tools match "' + _stemToolSearch + '"') : 'No tools match this filter'),
            /*#__PURE__*/React.createElement("button", { "aria-label": "Clear search",
                onClick: function () { _setStemToolSearch(''); upd('_categoryFilter', ''); },
                className: "mt-2 text-xs text-indigo-500 hover:text-indigo-700 font-bold transition-colors"
              }, "Clear filters")
              ));
          })(),
        /* base10: removed -- see stem_tool_manipulatives.js */
        /* moneyMath: removed -- see stem_tool_money.js */
        /* lifeSkills: removed -- see stem_tool_lifeskills.js */

          /* coordinate: removed -- see stem_tool_coordgrid.js */
          /* protractor: removed -- see stem_tool_angles.js */
        /* multtable: removed -- see stem_tool_multtable.js */
        /* numberline: removed -- see stem_tool_numberline.js */
        /* areamodel: removed -- see stem_tool_areamodel.js */

        /* calculus: removed — see stem_tool_calculus.js */



        // ── Wave Simulator ── (handled by stem_tool_science.js plugin registry)







        /* cell: removed — see individual stem_tool_*.js files */
        // funcGrapher: EXTRACTED to stem_tool_funcgrapher.js (handled by registry fallback)



        // physics: EXTRACTED to stem_tool_physics.js (handled by registry fallback)



        /* chemBalance: removed — see individual stem_tool_*.js files */


        /* punnett: removed — see individual stem_tool_*.js files */


        /* circuit: removed — see individual stem_tool_*.js files */


        // --- DATA PLOTTER -> extracted to stem_tool_creative.js (plugin-only) ---
        null,


        // --- INEQUALITY GRAPHER -> extracted to stem_tool_inequality.js (plugin-only) ---
        null,


        /* molecule: removed — see individual stem_tool_*.js files */


        /* decomposer: removed — see individual stem_tool_*.js files */


        // ═══════════════════════════════════════════════════════
        // SOLAR SYSTEM EXPLORER — 3D (Three.js)
        // ═══════════════════════════════════════════════════════
        /* solarSystem: removed — see individual stem_tool_*.js files */

        // [Galaxy tool extracted to stem_tool_galaxy.js]



        /* universe: removed — see individual stem_tool_*.js files */

        /* rocks: removed -- see stem_tool_rocks.js */

        /* waterCycle: removed -- see stem_tool_watercycle.js */


        // ═══════════════════════════════════════════════════════
        // ROCK CYCLE
        // ═══════════════════════════════════════════════════════
        /* rockCycle: removed — see individual stem_tool_*.js files */


        // ═══════════════════════════════════════════════════════
        // ═══════════════════════════════════════════════════════
        // ECOSYSTEM SIMULATOR — Canvas2D Animated Population
        // ═══════════════════════════════════════════════════════
        /* ecosystem: removed — see individual stem_tool_*.js files */
        /* fractionViz: removed -- see stem_tool_fractions.js */
        /* fractions: removed -- see stem_tool_fractions.js */
        /* decomposer (duplicate): removed — see individual stem_tool_*.js files */

        // ═══════════════════════════════════════════════════════
        // UNIT CONVERTER
        // ═══════════════════════════════════════════════════════
        /* unitConvert: removed — see stem_tool_unitconvert.js */


        /* probability: removed -- see stem_tool_probability.js */




        // ═══════════════════════════════════════════════════════

        // MUSIC SYNTHESIZER — Web Audio API + Canvas2D Oscilloscope

        // ═══════════════════════════════════════════════════════

        // musicSynth hook stubs — MUST run every render to maintain React hook count
        // (active rendering handled by external stem_tool_music.js via plugin bridge)
        (function _musicSynthHookStubs() {
            React.useEffect(function(){}, []);  // 1 – waveform draw loop
            React.useEffect(function(){}, []);  // 2 – sequencer playback
            React.useRef(null);                 // 3 – beat-painter FX ref
            React.useEffect(function(){}, []);  // 4 – beat-painter cleanup
            React.useEffect(function(){}, []);  // 5 – chord helper
            React.useRef(null);                 // 6 – recording ref
            React.useRef(null);                 // 7 – recording chunks ref
            React.useRef(null);                 // 8 – recording stream ref
            React.useEffect(function(){}, []);  // 9 – recording toggle
            React.useRef(null);                 // 10 – sequencer step ref
            React.useRef(null);                 // 11 – metronome ref
            React.useEffect(function(){}, []);  // 12 – metronome tick
            React.useEffect(function(){}, []);  // 13 – metronome cleanup
            React.useEffect(function(){}, []);  // 14 – arpeggiator
            React.useEffect(function(){}, []);  // 15 – particle cleanup
            return null;
        })(),

        // ═══════════════════════════════════════════════════════
        // HUMAN ANATOMY EXPLORER
        /* anatomy: removed — see individual stem_tool_*.js files */
        /* dissection: removed — see stem_tool_dissection.js */
        stemLabTab === 'explore' && stemLabTool === 'dissection' && !window.StemLab.isRegistered('dissection') && (function() {
          return React.createElement('div', { style: { padding: 40, textAlign: 'center' } },
            React.createElement('p', { style: { fontSize: 32, marginBottom: 12 } }, '\uD83D\uDD2C'),
            React.createElement('p', { style: { fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 8 } }, 'Loading Dissection Lab\u2026'),
            React.createElement('p', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #64748b)', marginBottom: 16 } }, 'If this persists, the plugin may have failed to load from CDN.'),
            React.createElement('button', {
              onClick: function() { setStemLabTool(null); },
              style: { marginTop: 16, padding: '8px 20px', borderRadius: 8, background: '#3b82f6', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }
            }, '\u2190 Back to Tools')
          );
        })(),



        /* brainAtlas: removed — see stem_tool_brainatlas.js */



        /* artStudio: removed — see stem_tool_creative.js */


        // ═══════════════════════════════════════════════════════
        // COMPANION PLANTING LAB — Canvas2D Animated Garden
        // ═══════════════════════════════════════════════════════
        /* companionPlanting: removed — see individual stem_tool_*.js files */

        // --- GEOMETRY SANDBOX → extracted to stem_tool_geosandbox.js (plugin-only) ---
        null,


        /* archStudio: removed -- see stem_tool_archstudio.js */

        // --- GRAPHING CALCULATOR EMULATOR ---
        /* graphCalc: removed — see individual stem_tool_*.js files */

        /* dataStudio: removed -- see stem_tool_datastudio.js */

        // ═══════════════════════════════════════════════════════════════
        // ██  ALGEBRA SOLVER (CAS) — AI-Powered Step-by-Step Math      ██
        // ═══════════════════════════════════════════════════════════════
        /* algebraCAS: removed — see individual stem_tool_*.js files */


        // ═══════════════════════════════════════════════════════════════
        // ██  AQUACULTURE & OCEAN ECOLOGY LAB                         ██
        // ═══════════════════════════════════════════════════════════════
        /* aquarium: removed — see individual stem_tool_*.js files */

        // ═══════════════════════════════════════════════════════════════
        // ██  CODING PLAYGROUND — Visual Block / Text Turtle Graphics  ██

        /* spaceColony: removed u2014 see stem_tool_spacecolony.js */

        // ═══════════════════════════════════════════════════════════════
        /* economicsLab: removed — see individual stem_tool_*.js files */

        // ═══════════════════════════════════════════════════════════════
        // ██  BEHAVIOR SHAPING LAB — ABA Operant Conditioning Sim  ██
        // ═══════════════════════════════════════════════════════════════
        /* behaviorLab: removed — see individual stem_tool_*.js files */

        // ════════════════════════════════════════════════════════════════════
        // 🛡️  CYBER DEFENSE LAB — rendered via plugin registry fallback
        // ════════════════════════════════════════════════════════════════════
        (function _cyberDefenseLab() { return null; })(/* inline removed — see stem_tool_cyberdefense.js */),
        /* REMOVED: inline CyberDefense IIFE (~700 lines) — now handled by
           _pluginFallback via stem_tool_cyberdefense.js plugin file.
           Original inline code caused React Error #310 (hooks in plain function).
           CRITICAL: The previous stub had 23 conditional React.useState calls
           behind an early-return guard, which violated React Rules of Hooks
           and crashed StemLabModal for ALL tools (not just cyberDefense). */

        // ════════════════════════════════════════════════════════════════════
        // ── Plugin Registry Fallback Renderer (Phase 2) ──
        // For tools registered via window.StemLab.registerTool() that do NOT
        // have inline render code above. Bridges hub-scope variables into
        // the plugin's ctx object format.
        // ════════════════════════════════════════════════════════════════════
        // Outer guard previously required isRegistered(stemLabTool), which made
        // the inner "plugin not yet loaded" skeleton (below) dead code. With
        // lazy-loaded plugin scripts (May 11 2026), a user can click a tile
        // before its plugin has registered; the skeleton handles that window.
        stemLabTab === 'explore' && stemLabTool && window.StemLab && (function _pluginFallback() {
          // Only render if no inline IIFE already handled this tool.
          // We detect this by checking a known marker: inline tools set state
          // immediately via their IIFE returns. If the tool is in the registry
          // AND has inline code, the inline code already rendered it — we skip.
          // For now, use an explicit set of tools WITHOUT inline code.
          // Plugin-only tools: these render via StemLab.renderTool(), not inline code
          var _pluginOnlyTools = {
            // Math
            algebraCAS: true, areamodel: true, base10: true, calculus: true,
            coordinate: true, decomposer: true, fractions: true, fractionViz: true,
            funcGrapher: true, geoSandbox: true, graphCalc: true, inequality: true,
            math: true, moneyMath: true, multtable: true, numberline: true,
            probability: true, protractor: true, volume: true,
            arithmeticStudio: true,
            ratioLab: true,
            areaPerimeter: true,
            timeSchedule: true,
            // Science
            anatomy: true, aquarium: true, aquacultureLab: true, brainAtlas: true, cell: true, cellAtlasLab: true,
            chemBalance: true, climateExplorer: true, companionPlanting: true, fisherLab: true, heatLab: true, nuclearLab: true, renewablesLab: true, petsLab: true,
            dataPlot: true, dinoLab: true, dissection: true, dnaLab: true, ecosystem: true,
            epidemicSim: true, fireEcology: true, microbiology: true, molecule: true, opticsLab: true, punnett: true,
            rocks: true, rockCycle: true, geologyExplorer: true, science: true, solarSystem: true,
            titrationLab: true, universe: true, unitConvert: true, waterCycle: true, weatherSystems: true,
            // Aug 2026: Tree Life Lab — whole-organism photosynthesis, 3D growth clock,
            // and the reproduction-strategy game.
            treeLab: true,
            // Aug 2026: Machine Lab — simple machines, forces and mechanical advantage.
            machineLab: true,
            // Engineering & CS
            archStudio: true, bridgeLab: true, circuit: true, codingPlayground: true,
            cyberDefense: true, magnetism: true, semiconductor: true,
            // Aug 2026: City Planning Lab — settlement-scale design under conflicting
            // constraints, with a deliberately un-modelled contested tier.
            cityLab: true,
            // Art & Music
            artStudio: true, creative: true, gameStudio: true, freeForms: true,
            // Earth & Space
            astronomy: true, coasterLab: true, galaxy: true, moonMission: true, plateTectonics: true, spaceColony: true, spaceExplorer: true, spaceStation: true,
            // Data & Logic
            behaviorLab: true, schoolBehaviorToolkit: true, dataStudio: true, economicsLab: true, logicLab: true, timelineStudio: true,
            // Geography
            geoQuiz: true, geometryProver: true, geometryWorld: true,
            // gisStudio: without this the new catalog tile would open a BLANK content
            // area — the same failure the arccity note above records. A tile and a
            // fallback entry are both required for a plugin-only tool to be reachable.
            gisStudio: true,
            // Applied
            a11yAuditor: true, lifeSkills: true, paperTrail: true, physics: true, wave: true,
            worldBuilder: true,
            typingPractice: true,
            flightSim: true,
            roadReady: true,
            bikeLab: true,
            birdLab: true,
            raptorHunt: true,
            printingPress: true,
            atcTower: true,
            throwlab: true,
            playlab: true,
            // Apr 30 catch-up: 10 production-ready tools that had built JS files
            // and were loading via toolModules but were NEVER given menu tiles or
            // plugin-only flags — so they were completely invisible. Adding both.
            skatelab: true,
            firstResponse: true,
            swimLab: true,
            autoRepair: true,
            weldLab: true,
            nutritionLab: true,
            evoLab: true,
            kitchenLab: true,
            cephalopodLab: true,
            statsLab: true,
            learningLab: true,
            consciousnessLab: true,
            organismId: true,
            // Added May 15 2026 — was registering successfully but missing
            // from this map caused the fallback at line ~4489 to return
            // null, so the user saw a blank tile content area.
            stewardshipHub: true,
            llmLiteracy: true,
            assessmentLiteracy: true,
            parentingLab: true,
            lawNavigator: true,
            diagnosisEligibility: true,
            musicSynth: true,
            beehive: true,
            echolocation: true,
            echoTrainer: true,
            oratory: true,
            singing: true,
            migration: true,
            appLab: true,
            bakingScience: true,
            alloBotSage: true,
            // Jun 2026: Lumen go-live — provenance-bound reactive research canvas.
            lumen: true,
            // Jun 2026: Cellular Automaton Lab — was registered + tiled but
            // missing from this map (and from the stemToolModules loader), so
            // the tile rendered a blank content area. Both fixed 2026-07-02.
            cellularLab: true,
            // Jul 2026: Access Lens — learner accessibility camera kit
            // (describe / read / translate / Socratic investigate).
            accessLens: true,
            // Jul 5 2026: Arc City — registered + tiled since Phase 1 but never
            // added here, so the tile rendered a blank content area (same bug
            // as stewardshipHub May 15 and cellularLab Jul 2).
            arccity: true,
            // Jul 2026: Data Lab — CODAP companion window + Socratic tutor
            // (launcher + AI bridge live in stem_tool_datalab.js).
            dataLab: true,
            // Jul 2026: AlphaFold Explorer — public AlphaFold DB lookup + Mol*
            // viewer + safe AlphaFold Server input prep.
            alphaFoldExplorer: true,
            // Jul 2026: Sim Shelf — PhET companion window + POE coach
            // (launcher + AI bridge live in stem_tool_simshelf.js).
            simShelf: true,
            // Jul 2026: Circuit Shelf — CircuitJS1 (Falstad/Sharp, GPL) companion
            // window + POE coach (launcher + AI bridge in stem_tool_circuitshelf.js).
            circuitShelf: true,
            // Jul 2026: Molecule Shelf — Mol* (RCSB, MIT) companion window +
            // Notice→Wonder coach (launcher + AI bridge in stem_tool_moleculeshelf.js).
            moleculeShelf: true,
            // Jul 2026: Particle Lab 3D — deterministic Three.js particle sandbox
            // for states of matter, gas laws, diffusion, and collisions.
            particleLab3d: true,
            // Jul 2026: Zoom Gallery — OpenSeadragon (BSD-3) deep-zoom companion
            // window over Smithsonian CC0 (IIIF) + NASA public-domain images +
            // Notice→Wonder coach (launcher + AI bridge in stem_tool_zoomgallery.js).
            zoomGallery: true
          };
          // Throttle fallback log to once per tool (avoid flooding console on re-renders)
          if (!window._stemFallbackLogged) window._stemFallbackLogged = {};
          if (!window._stemFallbackLogged[stemLabTool]) {
            console.log('[StemLab Fallback] Rendering plugin: ' + stemLabTool + ' (registered: ' + window.StemLab.isRegistered(stemLabTool) + ')');
            window._stemFallbackLogged[stemLabTool] = true;
          }
          if (!_pluginOnlyTools[stemLabTool]) return null;

          var _pluginMeta = _activeStemToolMeta ? _activeStemToolMeta : { label: _formatStemToolId(stemLabTool), icon: '\uD83E\uDDEA' };
          var _pluginLoadState = null;
          try {
            if (typeof window.__alloGetStemPluginState === 'function') {
              _pluginLoadState = window.__alloGetStemPluginState(stemLabTool);
            }
          } catch (_) { _pluginLoadState = null; }
          function _retryCurrentStemPlugin() {
            var retried = typeof window.__alloRetryStemPlugin === 'function' ? window.__alloRetryStemPlugin(stemLabTool) : false;
            if (retried) {
              if (typeof announceToSR === 'function') announceToSR('Retrying ' + _pluginMeta.label);
              setTimeout(function () {
                var root = _stemDialogRef.current;
                var back = root ? root.querySelector('.stem-active-tool-back') : null;
                if (back && typeof back.focus === 'function') back.focus();
              }, 0);
            } else if (addToast) {
              addToast('This tool could not be retried. Return to all tools and try opening it again.', 'error');
            }
          }
          function _backFromStemPluginError() {
            setStemLabTool(null);
            if (typeof announceToSR === 'function') announceToSR('Returned to all STEAM Lab tools');
          }
          function _renderStemPluginLoadError(message) {
            return React.createElement('div', {
              role: 'region',
              'aria-label': _pluginMeta.label + ' load error',
              className: 'max-w-xl mx-auto my-8 rounded-2xl border-2 border-orange-400 bg-white p-6 text-center text-slate-800'
            },
              React.createElement('div', { 'aria-hidden': 'true', className: 'text-4xl mb-2' }, _pluginMeta.icon),
              React.createElement('h3', { className: 'text-lg font-black mb-2' }, _pluginMeta.label + ' could not load'),
              React.createElement('p', { role: 'alert', className: 'text-sm text-slate-600 mb-4' }, message),
              React.createElement('button', {
                type: 'button', onClick: _retryCurrentStemPlugin,
                'data-stem-plugin-retry': 'true',
                className: 'mx-1 px-4 py-2 rounded-xl bg-indigo-600 text-white font-black text-sm',
                'aria-label': 'Retry loading ' + _pluginMeta.label
              }, 'Retry'),
              React.createElement('button', {
                type: 'button', onClick: _backFromStemPluginError,
                className: 'mx-1 px-4 py-2 rounded-xl border border-slate-400 font-black text-sm',
                'aria-label': 'Back to all STEAM Lab tools'
              }, 'All tools')
            );
          }

          // Show skeleton loader while plugin hasn't registered yet
          if (!window.StemLab.isRegistered(stemLabTool)) {
            var _pluginStatus = _pluginLoadState ? _pluginLoadState.status : '';
            // Safety net: an empty status means NOTHING was ever requested for this
            // tool, which is the one state that waits forever — the 20s timeout is
            // armed inside the loader, so with no request there is no timeout and no
            // error card either. That happens when a caller activates a tool without
            // going through _openStemTool. Those callers are fixed, but request it
            // here too so a future entry point cannot reintroduce a silent hang.
            // Safe to call during render: loadOne() ignores a repeat while a load is
            // already in flight, and the status stops being empty immediately after.
            if (!_pluginStatus) {
              try {
                if (typeof window.__alloEnsureStemPluginLoaded === 'function') {
                  window.__alloEnsureStemPluginLoaded(stemLabTool);
                }
              } catch (e) {}
            }
            if (['error', 'loaded'].indexOf(_pluginStatus) !== -1) {
              var _pluginError = _pluginLoadState.error ? _pluginLoadState.error : 'The plugin loaded but did not register with STEAM Lab.';
              return _renderStemPluginLoadError(_pluginError);
            }
            return React.createElement("div", {
              className: "animate-pulse space-y-4 p-6",
              role: 'status',
              'aria-live': 'polite',
              'aria-busy': 'true',
              'aria-label': 'Loading ' + _pluginMeta.label
            },
              React.createElement("div", { className: "flex items-center gap-3" },
                React.createElement("div", { className: "w-10 h-10 bg-slate-200 rounded-lg" }),
                React.createElement("div", { className: "space-y-2 flex-1" },
                  React.createElement("div", { className: "h-4 bg-slate-200 rounded w-1/3" }),
                  React.createElement("div", { className: "h-3 bg-slate-100 rounded w-1/2" })
                )
              ),
              React.createElement("div", { className: "h-48 bg-slate-100 rounded-xl" }),
              React.createElement("div", { className: "grid grid-cols-3 gap-3" },
                React.createElement("div", { className: "h-20 bg-slate-100 rounded-lg" }),
                React.createElement("div", { className: "h-20 bg-slate-100 rounded-lg" }),
                React.createElement("div", { className: "h-20 bg-slate-100 rounded-lg" })
              ),
              React.createElement("p", { className: "text-center text-xs text-slate-400" }, "\uD83D\uDD2C Loading " + _pluginMeta.label + "..."),
              React.createElement("p", { className: "text-center text-[10px] text-slate-500 mt-1" }, "The tool plugin is being downloaded. This usually takes 1\u20132 seconds.")
            );
          }

          // Build context bridge: map hub-local variables to plugin ctx format
          // Deferred setter: if called during a React render pass, queue via setTimeout(0)
          // to avoid "Cannot update a component while rendering a different component"
          var _renderingFlag = { current: false };
          function _deferSafe(fn) {
            return function() {
              var args = arguments;
              var self = this;
              if (_renderingFlag.current) {
                setTimeout(function() { fn.apply(self, args); }, 0);
              } else {
                fn.apply(self, args);
              }
            };
          }
          var _safeSetLabToolData = _deferSafe(setLabToolData);
          // Wrap every parent-state setter exposed to plugins so any
          // during-render call gets deferred. Previously only setLabToolData
          // had this protection; plugins that called setStemLabTool /
          // setStemLabTab / setToolSnapshots / shared explore setters during
          // render could trigger "Cannot update a component while rendering
          // a different component" because those setters were raw.
          // Wrap setStemLabTool so any tool switch first runs the universe tool's cleanup
          // (animationFrame, ResizeObserver, tracked setTimeouts, time-lapse interval).
          // The cleanup is idempotent + no-op if universe was never mounted, so safe for every switch.
          var _safeSetStemLabTool = typeof setStemLabTool === 'function' ? _deferSafe(function() {
            if (typeof window !== 'undefined' && typeof window._universeCleanupAll === 'function') {
              try { window._universeCleanupAll(); } catch(e) {}
            }
            setStemLabTool.apply(null, arguments);
          }) : function() {};
          var _safeSetStemLabTab = typeof setStemLabTab === 'function' ? _deferSafe(setStemLabTab) : function() {};
          var _safeSetToolSnapshots = typeof setToolSnapshots === 'function' ? _deferSafe(setToolSnapshots) : function() {};
          var _ctx = {
            React: React,
            toolData: labToolData,
            setToolData: _safeSetLabToolData,
            update: function(toolId, key, val) {
              _safeSetLabToolData(function(prev) {
                var toolState = Object.assign({}, (prev && prev[toolId]) || {});
                toolState[key] = val;
                var patch = {}; patch[toolId] = toolState;
                return Object.assign({}, prev, patch);
              });
            },
            updateMulti: function(toolId, obj) {
              _safeSetLabToolData(function(prev) {
                var toolState = Object.assign({}, (prev && prev[toolId]) || {}, obj);
                var patch = {}; patch[toolId] = toolState;
                return Object.assign({}, prev, patch);
              });
            },
            setStemLabTool: _safeSetStemLabTool,
            setStemLabTab: _safeSetStemLabTab,
            stemLabTab: stemLabTab,
            stemLabTool: stemLabTool,
            toolSnapshots: toolSnapshots,
            setToolSnapshots: _safeSetToolSnapshots,
            // Wrap addToast so every plugin toast also announces to screen readers.
            // This gives all 57 STEM tools SR announcements without modifying each plugin.
            // _deferSafe wrap: addToast + the inner announceToSR both touch parent
            // React state (toast list + a11y live-region useState). Plugins that
            // toast during their initial render (e.g. funcgrapher canvasNarrate
            // chain) trigger "Cannot update component while rendering" without it.
            addToast: _deferSafe(function(msg, type) {
              if (addToast) addToast(msg, type);
              // Strip emoji from message for cleaner SR output
              if (typeof announceToSR === 'function' && msg) {
                var srMsg = msg.replace(/[\u{1F000}-\u{1FFFF}]|[\u2600-\u27BF]|[\uFE00-\uFE0F]|[\u200D]/gu, '').trim();
                if (srMsg) announceToSR(srMsg);
              }
            }),
            // _deferSafe wrap: awardStemXP calls setStemXP (parent useState).
            awardXP: typeof awardStemXP === 'function' ? _deferSafe(awardStemXP) : function() {},
            getXP: typeof getStemXP === 'function' ? getStemXP : function() { return 0; },
            // _deferSafe wrap: announceToSR calls setA11yAnnouncement (parent useState)
            // and canvasNarrate calls announceToSR. Without these wraps, plugins
            // that call canvasNarrate('init', ...) during their first render \u2014 like
            // funcgrapher at stem_tool_funcgrapher.js:123 \u2014 produce the React
            // "Cannot update component while rendering" warning every modal open.
            announceToSR: typeof announceToSR === 'function' ? _deferSafe(announceToSR) : function() {},
            canvasNarrate: typeof canvasNarrate === 'function' ? _deferSafe(canvasNarrate) : function() {},
            setCanvasNarrateEnabled: typeof setCanvasNarrateEnabled === 'function' ? setCanvasNarrateEnabled : function() {},
            // _deferSafe wrap: stemCelebrate sets parent confetti/celebration state.
            celebrate: typeof stemCelebrate === 'function' ? _deferSafe(stemCelebrate) : function() {},
            callGemini: typeof callGemini === 'function' ? callGemini : null,
            ai: ai || null,
            generateText: (ai && typeof ai.generateText === 'function')
              ? function(prompt, options) { return ai.generateText(prompt, options || {}); }
              : (typeof callGemini === 'function' ? function(prompt, options) { return callGemini(prompt, !!(options && options.jsonMode)); } : null),
            storageDB: storageDB || null,
            // Guarded AI-hint entry point + its enabled flag. getHint self-gates
            // (off → zero traffic), enforces try-again/cap/reveal-check, and shows
            // a labeled hint. aiHintsEnabled lets a tool show/hide its hint button.
            // NOTE: a tool author must route hints through getHint, NOT raw
            // callGemini, or the guardrails are bypassed.
            getHint: getHint,
            aiHintsEnabled: !!_aiHintsOn,
            // W7: true only when the host handed us a live AI backend. Tools can
            // gate their own AI-extra buttons on this instead of rendering a
            // control that silently no-ops (getHint/aiChat already fail safe).
            aiAvailable: typeof callGemini === 'function',
            // Callback-style AI helper. cyberdefense's AI coach was written to a
            // callback API before the host standardized on promise-based callGemini.
            // Adapter keeps both surfaces working.
            aiChat: typeof callGemini === 'function' ? function(prompt, cb) {
              try {
                callGemini(prompt).then(function(resp) { try { cb && cb(resp); } catch(_) {} })
                  .catch(function() { try { cb && cb(null); } catch(_) {} });
              } catch (_) { try { cb && cb(null); } catch(_) {} }
            } : null,
            sourceText: typeof inputText === 'string' ? inputText : (typeof sourceText === 'string' ? sourceText : ''),
            inputText: typeof inputText === 'string' ? inputText : '',
            sourceTopic: typeof sourceTopic === 'string' ? sourceTopic : '',
            sourceProvenance: sourceProvenance && typeof sourceProvenance === 'object' ? sourceProvenance : null,
            sourceLocator: typeof sourceLocator === 'string' ? sourceLocator : '',
            sourceType: typeof sourceType === 'string' ? sourceType : '',
            // gradeLevel, studentNickname and isTeacherMode were ALSO defined
            // here, roughly sixty lines above their real definitions further down
            // this same object literal. Duplicate keys are legal JavaScript and
            // the LAST one wins, so these three were dead — and the isTeacherMode
            // one was dangerous: `isTeacherMode !== false` evaluates to TRUE when
            // the host omits the flag, i.e. it would have defaulted every learner
            // into teacher mode. The surviving `!!isTeacherMode` defaults to
            // false, which is the safe reading, but only by accident of ordering.
            // Removing the dead trio changes no behaviour and removes the trap.
            // Coarse-grained grade banding for tools that target tiers rather than
            // single grades (firstresponse, swimlab, etc. expect 'k2'|'g35'|'g68'|'g912').
            gradeBand: (function() {
              var g = (typeof gradeLevel === 'string' ? gradeLevel : '').toLowerCase();
              if (g.indexOf('kindergarten') === 0 || /\b(1st|2nd)\b/.test(g)) return 'k2';
              if (/\b(3rd|4th|5th)\b/.test(g)) return 'g35';
              if (/\b(6th|7th|8th)\b/.test(g)) return 'g68';
              if (/\b(9th|10th|11th|12th)\b/.test(g) || g.indexOf('college') !== -1 || g.indexOf('graduate') !== -1) return 'g912';
              return 'g68';
            })(),
            // Coordinate grid range (passed from host useState — defaults to ±10).
            gridRange: typeof gridRange !== 'undefined' && gridRange ? gridRange : { min: -10, max: 10 },
            // Fallback-aware t (2026-07-21). STEM tools call t(key, englishFallback)
            // and expect the fallback when a key is missing. The app's real t()
            // returns undefined for a missing key (and treats arg2 as params), so
            // any tool whose keys were never added to the lang packs rendered the
            // literal text "undefined" — this is what broke the Sim / Molecule /
            // Circuit / Zoom shelves (42 tools use this convention). Pass a params
            // OBJECT through for interpolation, but never let a missing key reach a
            // tool as undefined: fall back to the string default, or the key.
            t: function(k, fb) {
              var _params = (fb && typeof fb === 'object') ? fb : undefined;
              var _v = (typeof t === 'function') ? t(k, _params) : null;
              if (_v != null && _v !== k) return _v;
              return (typeof fb === 'string') ? fb : k;
            },
            icons: { ArrowLeft: ArrowLeft, Calculator: Calculator, Sparkles: Sparkles, X: X, GripVertical: GripVertical },
            _codingCanvasRef: typeof _codingCanvasRef !== 'undefined' ? _codingCanvasRef : null,
            saveSnapshot: function(toolId, label, data) {
              if (typeof setToolSnapshots === 'function') {
                _safeSetToolSnapshots(function(prev) {
                  return (prev || []).concat([{ id: toolId + '-' + Date.now(), tool: toolId, label: label, data: data, ts: Date.now() }]);
                });
              }
            },
            renderTutorial: typeof renderTutorial === 'function' ? renderTutorial : function() { return null; },
            _tutGalaxy: typeof _tutGalaxy !== 'undefined' ? _tutGalaxy : [],
            beep: typeof stemBeep === 'function' ? stemBeep : function() {},
            callTTS: typeof callTTS === 'function' ? function stemSpeakTTS(text, voice, speed, opts) {
              // Header mute button is the master gate. Tools can pass { force: true }
              // to bypass it for explicit user-initiated speak actions.
              opts = opts || {};
              if (!opts.force && !_canvasNarrateTTSEnabled()) return Promise.resolve(null);
              return callTTS(text, voice, speed, opts).then(function(url) {
                if (url) { var a = new Audio(url); a.play().catch(function() {}); }
                return url;
              }).catch(function(e) { console.warn('[STEM TTS]', e && e.message); return null; });
            } : null,
            callImagen: typeof callImagen === 'function' ? callImagen : null,
            callGeminiVision: typeof callGeminiVision === 'function' ? callGeminiVision : null,
            callGeminiImageEdit: typeof callGeminiImageEdit === 'function' ? callGeminiImageEdit : null,
            gradeLevel: gradeLevel || '5th Grade',
            srOnly: function(text) { return React.createElement('span', { className: 'sr-only' }, text); },
            a11yClick: function(handler) { return { onClick: handler, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(e); } }, role: 'button', tabIndex: 0 }; },
            canvasA11yDesc: function(desc) { return { role: 'img', 'aria-label': desc }; },
            props: props || {},
            // ── Live Session (for collaborative features) ──
            activeSessionCode: activeSessionCode || null,
            studentNickname: studentNickname || null,
            isTeacherMode: !!isTeacherMode,
            // False when the host launches a tool from its own tile. A tool that is
            // rendered INSIDE another tool (Data Plotter inside Charts & Graphs)
            // receives embedded: true via Object.assign on this ctx, and suppresses
            // its own Back button and title so the host owns the chrome.
            embedded: false,
            // ── Theme ──
            isDark: isDark,
            isContrast: isContrast,
            theme: _stemTheme,
            pal: _pal,
            // ── Shared explore state ──
            // Setters wrapped via _deferSafe so plugins calling them during
            // render don't trip "Cannot update component while rendering" warnings.
            exploreScore: exploreScore || { correct: 0, total: 0 },
            setExploreScore: typeof setExploreScore === 'function' ? _deferSafe(setExploreScore) : function() {},
            exploreDifficulty: exploreDifficulty,
            setExploreDifficulty: typeof setExploreDifficulty === 'function' ? _deferSafe(setExploreDifficulty) : function() {},
            // ── Angle Explorer state ──
            angleValue: typeof angleValue !== 'undefined' ? angleValue : 45,
            setAngleValue: typeof setAngleValue === 'function' ? _deferSafe(setAngleValue) : function() {},
            angleChallenge: typeof angleChallenge !== 'undefined' ? angleChallenge : null,
            setAngleChallenge: typeof setAngleChallenge === 'function' ? _deferSafe(setAngleChallenge) : function() {},
            angleFeedback: typeof angleFeedback !== 'undefined' ? angleFeedback : null,
            setAngleFeedback: typeof setAngleFeedback === 'function' ? _deferSafe(setAngleFeedback) : function() {},
            // ── Multiplication Table state ──
            multTableAnswer: typeof multTableAnswer !== 'undefined' ? multTableAnswer : '',
            setMultTableAnswer: typeof setMultTableAnswer === 'function' ? _deferSafe(setMultTableAnswer) : function() {},
            multTableChallenge: typeof multTableChallenge !== 'undefined' ? multTableChallenge : null,
            setMultTableChallenge: typeof setMultTableChallenge === 'function' ? _deferSafe(setMultTableChallenge) : function() {},
            multTableFeedback: typeof multTableFeedback !== 'undefined' ? multTableFeedback : null,
            setMultTableFeedback: typeof setMultTableFeedback === 'function' ? _deferSafe(setMultTableFeedback) : function() {},
            multTableHidden: typeof multTableHidden !== 'undefined' ? multTableHidden : false,
            setMultTableHidden: typeof setMultTableHidden === 'function' ? _deferSafe(setMultTableHidden) : function() {},
            multTableHover: typeof multTableHover !== 'undefined' ? multTableHover : null,
            setMultTableHover: typeof setMultTableHover === 'function' ? _deferSafe(setMultTableHover) : function() {},
            multTableRevealed: typeof multTableRevealed !== 'undefined' ? multTableRevealed : new Set(),
            setMultTableRevealed: typeof setMultTableRevealed === 'function' ? _deferSafe(setMultTableRevealed) : function() {},
            // ── Shared labToolData ──
            labToolData: labToolData || {},
            setLabToolData: _safeSetLabToolData,
            _renderingFlag: _renderingFlag
          };

          try {
            // Wrap plugin render in a stable React component so hooks work correctly.
            // We cache the component function per tool ID so React sees the same type
            // across re-renders (preventing unmount/remount loops).
            if (!window.__stemPluginComponents) window.__stemPluginComponents = {};
            if (!window.__stemPluginComponents[stemLabTool]) {
              window.__stemPluginComponents[stemLabTool] = function StemPluginBridge(props) {
                // Set rendering flag so any setState calls during render get deferred via setTimeout(0)
                props._ctx._renderingFlag.current = true;
                try {
                  return window.StemLab.renderTool(props._toolId, props._ctx);
                } finally {
                  props._ctx._renderingFlag.current = false;
                }
              };
            }
            // The deferred setState bridge uses _renderingFlag to queue updates that
            // would otherwise trigger "Cannot update a component while rendering".
            //
            // Hook-safety: the bridge inlines the tool's render() into ONE fiber,
            // and many tools dispatch to different sub-renderers per tab/subtool,
            // each calling a DIFFERENT set of canvas hooks (useRef/useEffect).
            // Keying only by tool ID meant a same-fiber subtool switch reordered
            // hooks → "Rendered fewer hooks than expected" (e.g. semiconductor
            // bandgap→gates). Fold the active tab + the tool's own mode field into
            // the key so switching sub-views remounts a fresh fiber (correct, and
            // the expected UX). These fields only change on an explicit switch, so
            // normal re-renders keep the same key and don't remount.
            var _modeTd = (_ctx.toolData && _ctx.toolData[stemLabTool]) || {};
            var _modeSig = [
              stemLabTool,
              _ctx.stemLabTab || '',
              _modeTd.subtool || _modeTd.tab || _modeTd.mode || _modeTd.activeTab || _modeTd.activeSubtool || ''
            ].join(':');
            return React.createElement(window.__stemPluginComponents[stemLabTool], { key: 'plugin-' + _modeSig, _toolId: stemLabTool, _ctx: _ctx });
          } catch(e) {
            console.error('[StemLab] Plugin fallback error for ' + stemLabTool, e);
            return React.createElement('div', { style: { padding: 40, textAlign: 'center', color: '#ef4444' } },
              React.createElement('p', { style: { fontSize: 32, marginBottom: 12 } }, '⚠️'),
              React.createElement('p', { style: { fontWeight: 700, marginBottom: 8 } }, 'Error loading ' + stemLabTool),
              React.createElement('p', { style: { fontSize: 12, color: 'var(--allo-stem-text-soft, #64748b)', marginBottom: 16 } }, e.message || 'Unknown error'),
              React.createElement('button', {
                onClick: function() { setStemLabTool(null); },
                style: { padding: '8px 20px', borderRadius: 8, background: '#3b82f6', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }
              }, '← Back to Tools')
            );
          }
        })())
      ));
    };
  }
})();
