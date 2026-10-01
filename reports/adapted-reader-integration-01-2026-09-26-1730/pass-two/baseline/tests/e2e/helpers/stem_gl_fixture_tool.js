/**
 * A STEM tool that exists only to prove the GL harness's gates can FAIL.
 * Loaded by tests/e2e/22b-stem-gl-harness-selftest.spec.ts; never shipped.
 *
 * toolData.glFixture.mode picks one known behaviour:
 *   scene         5 meshes, drawn every frame, context released on unmount (correct)
 *   leak          the same scene, but unmount only calls renderer.dispose()
 *   noRenderer    a <canvas> the tool never calls getContext on (the molecule
 *                 failure: the harness used to supply the only context)
 *   clearOnly     a live context that clears and draws nothing
 *   overlay       clearOnly under a busy DOM overlay, the way a HUD sits over a
 *                 dead scene; a screenshot of the canvas BOX photographs the overlay
 *   late2d        a canvas that gets its 2D context 1.5s after mount, as charts
 *                 drawn in a later effect do
 *   adoptEarly    mounts a canvas whose context was made BEFORE the mount, by
 *                 window.__fixtureMakeEarly(), and never releases it: a leak that a
 *                 check looking only at contexts created during the mount misses
 * toolData.glFixture.spin === false holds the scene still (same-input calibration).
 */
(function () {
  if (!window.StemLab || !window.StemLab.registerTool) return;
  var MESHES = 5;

  // A renderer made at module-load time, as a tool with a shared viewer might.
  window.__fixtureMakeEarly = function () {
    var c = document.createElement('canvas');
    window.__fixtureEarly = { canvas: c, renderer: new window.THREE.WebGLRenderer({ canvas: c }) };
  };

  window.StemLab.registerTool('glFixture', {
    label: 'GL harness fixture',
    render: function (ctx) {
      var React = ctx.React, h = React.createElement;
      var mode = (ctx.toolData.glFixture && ctx.toolData.glFixture.mode) || 'scene';
      var spin = !(ctx.toolData.glFixture && ctx.toolData.glFixture.spin === false);
      var ref = React.useRef(null), hostRef = React.useRef(null);

      React.useEffect(function () {
        if (mode === 'adoptEarly') {
          var early = window.__fixtureEarly;
          if (!early || !hostRef.current) return undefined;
          early.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
          hostRef.current.appendChild(early.canvas);
          var s2 = new window.THREE.Scene(), cam = new window.THREE.PerspectiveCamera(50, 1.6, 0.1, 100);
          cam.position.z = 5;
          s2.add(new window.THREE.Mesh(new window.THREE.BoxGeometry(2, 2, 2), new window.THREE.MeshBasicMaterial({ color: 0xf59e0b })));
          early.renderer.render(s2, cam);
          return function () { if (early.canvas.parentNode) early.canvas.parentNode.removeChild(early.canvas); };
        }
        var canvas = ref.current;
        if (!canvas) return undefined;
        if (mode === 'noRenderer') return undefined;
        if (mode === 'late2d') {
          var t = setTimeout(function () {
            var g = canvas.getContext('2d');
            window.__fixture2d = !!g;
            if (g) { g.fillStyle = '#22c55e'; g.fillRect(0, 0, 50, 50); }
          }, 1500);
          return function () { clearTimeout(t); };
        }
        var THREE = window.THREE;
        window.StemLab.ensureThree({ orbit: true });
        var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
        renderer.setSize(canvas.clientWidth || 400, canvas.clientHeight || 300, false);
        renderer.setClearColor(0x0b1220, 1);
        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(50, (canvas.clientWidth || 400) / (canvas.clientHeight || 300), 0.1, 100);
        camera.position.set(0, 0, 8);
        if (mode === 'scene' || mode === 'leak') {
          var colours = [0xef4444, 0xf59e0b, 0x22c55e, 0x3b82f6, 0xa855f7];
          for (var i = 0; i < MESHES; i++) {
            var m = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2),
              new THREE.MeshBasicMaterial({ color: colours[i] }));
            m.position.set((i - 2) * 1.8, 0, 0);
            scene.add(m);
          }
        }
        var raf = 0;
        var frame = function () {
          raf = requestAnimationFrame(frame);
          if (spin) scene.children.forEach(function (c) { c.rotation.y += 0.02; });
          renderer.render(scene, camera);
        };
        frame();
        return function () {
          cancelAnimationFrame(raf);
          renderer.dispose();
          if (mode !== 'leak' && window.StemLab.releaseGl) window.StemLab.releaseGl(renderer);
        };
      }, [mode]);

      return h('div', { ref: hostRef, style: { position: 'relative', flex: 1, background: 'linear-gradient(90deg,#1e3a8a,#be185d)' } },
        mode === 'adoptEarly' ? null : h('canvas', { ref: ref, 'data-fixture-canvas': mode, style: { width: '100%', height: '100%', display: 'block' } }),
        mode === 'overlay' ? h('div', {
          style: { position: 'absolute', inset: 0, padding: 24, color: '#fff', font: '700 28px sans-serif',
            background: 'linear-gradient(135deg,rgba(239,68,68,.6),rgba(59,130,246,.6))' }
        }, 'HUD overlay: speed 42, altitude 900, heading NE, score 12,345') : null);
    }
  });
})();
