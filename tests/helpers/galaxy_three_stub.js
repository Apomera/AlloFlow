// Minimal Three.js + canvas-2D stubs so stem_tool_galaxy's initGalaxy() can be
// executed under vitest.
//
// Why this exists: the galaxy scene builder was ~2,300 lines that NO test ever
// ran. The smoke harness resolves ensureThree() with a promise that never
// settles, so initGalaxy was never entered — which is how a self-recursive
// upscaleGalaxyCanvas() shipped and silently killed the 3-D view on every
// machine whose quality tier resolved above "balanced".
//
// The stubs are deliberately dumb: they record calls and hand back objects with
// the shape three.js would. That is enough to catch the failure modes that
// actually bite here — missing APIs, NaN geometry, and exceptions thrown while
// building the scene.

export function installCanvas2DStub() {
  const originalGetContext = window.HTMLCanvasElement.prototype.getContext;
  const nanArgs = [];

  function checkNumbers(method, args) {
    args.forEach((a) => {
      if (typeof a === 'number' && !Number.isFinite(a)) nanArgs.push(method + ' -> ' + a);
    });
  }

  function makeGradient() {
    return { addColorStop(offset) { checkNumbers('addColorStop', [offset]); } };
  }

  function makeContext() {
    const ctx = {
      canvas: null,
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      fillStyle: '#000',
      strokeStyle: '#000',
      lineWidth: 1,
      lineCap: 'butt',
      font: '10px sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      shadowColor: 'transparent',
      shadowBlur: 0,
    };
    const noop = (name) => (...args) => { checkNumbers(name, args); };
    [
      'fillRect', 'clearRect', 'strokeRect', 'beginPath', 'closePath', 'fill', 'stroke',
      'moveTo', 'lineTo', 'arc', 'quadraticCurveTo', 'bezierCurveTo', 'ellipse',
      'save', 'restore', 'translate', 'rotate', 'scale', 'setTransform', 'transform',
      'setLineDash', 'fillText', 'strokeText', 'drawImage', 'clip', 'rect',
    ].forEach((name) => { ctx[name] = noop(name); });
    ctx.createRadialGradient = (...args) => { checkNumbers('createRadialGradient', args); return makeGradient(); };
    ctx.createLinearGradient = (...args) => { checkNumbers('createLinearGradient', args); return makeGradient(); };
    ctx.createPattern = () => null;
    ctx.measureText = (text) => ({ width: String(text).length * 6 });
    ctx.getImageData = (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
    ctx.putImageData = noop('putImageData');
    return ctx;
  }

  window.HTMLCanvasElement.prototype.getContext = function (type) {
    if (type !== '2d') return null;
    if (!this.__stubCtx) {
      this.__stubCtx = makeContext();
      this.__stubCtx.canvas = this;
    }
    return this.__stubCtx;
  };

  // jsdom reports 0 for layout boxes; a real size keeps aspect ratios finite.
  const sized = (prop, value) => {
    Object.defineProperty(window.HTMLCanvasElement.prototype, prop, {
      configurable: true,
      get() { return value; },
    });
  };
  sized('offsetWidth', 800);
  sized('offsetHeight', 540);
  sized('clientWidth', 800);
  sized('clientHeight', 540);

  return {
    nanArgs,
    restore() {
      window.HTMLCanvasElement.prototype.getContext = originalGetContext;
      ['offsetWidth', 'offsetHeight', 'clientWidth', 'clientHeight'].forEach((p) => {
        delete window.HTMLCanvasElement.prototype[p];
      });
    },
  };
}

function vec(x = 0, y = 0, z = 0) {
  const v = {
    x, y, z,
    set(nx, ny, nz) { v.x = nx; v.y = ny; v.z = nz; return v; },
    copy(o) { v.x = o.x; v.y = o.y; v.z = o.z; return v; },
    normalize() { return v; },
    multiplyScalar() { return v; },
    add() { return v; },
    length() { return Math.hypot(v.x, v.y, v.z); },
    clone() { return vec(v.x, v.y, v.z); },
    // Filled out so a missing vector method cannot masquerade as a scene bug.
    // Every one of these was reached by the tool and threw, and because the
    // throw happened inside initGalaxy's catch it surfaced as the SAME
    // "3-D unavailable" card a real device limitation would produce.
    setScalar(s) { v.x = s; v.y = s; v.z = s; return v; },
    addScalar(s) { v.x += s; v.y += s; v.z += s; return v; },
    setX(x) { v.x = x; return v; },
    setY(y) { v.y = y; return v; },
    setZ(z) { v.z = z; return v; },
    sub() { return v; },
    subVectors() { return v; },
    addVectors() { return v; },
    addScaledVector() { return v; },
    applyQuaternion() { return v; },
    applyMatrix4() { return v; },
    project() { return v; },
    unproject() { return v; },
    cross() { return v; },
    crossVectors() { return v; },
    dot() { return 0; },
    distanceTo(o) { return Math.hypot(v.x - o.x, v.y - o.y, v.z - o.z); },
    lengthSq() { return v.x * v.x + v.y * v.y + v.z * v.z; },
    lerp() { return v; },
    lerpVectors() { return v; },
    negate() { v.x = -v.x; v.y = -v.y; v.z = -v.z; return v; },
    divideScalar() { return v; },
    setLength() { return v; },
    setFromSpherical() { return v; },
  };
  return v;
}

function object3D(kind) {
  const o = {
    __kind: kind,
    name: '',
    visible: true,
    renderOrder: 0,
    userData: {},
    children: [],
    position: vec(),
    rotation: vec(),
    scale: vec(1, 1, 1),
    quaternion: { copy() { return this; } },
    material: null,
    geometry: null,
    add(...kids) { kids.forEach((k) => { if (k) o.children.push(k); }); return o; },
    remove(kid) { const i = o.children.indexOf(kid); if (i >= 0) o.children.splice(i, 1); return o; },
    lookAt() { return o; },
    rotateZ() { return o; },
    updateProjectionMatrix() {},
    traverse(fn) { fn(o); o.children.forEach((c) => c.traverse && c.traverse(fn)); },
    clone() { const c = object3D(kind); c.material = o.material; c.geometry = o.geometry; return c; },
  };
  return o;
}

// A Color with the methods the tool actually calls. The previous stub exposed
// only r/g/b/setHSL, so `mat.color.clone()` threw — and because every scene
// build died on it, the suite could not see the real ordering bug underneath.
function colorLike(input) {
  const c = { r: 1, g: 1, b: 1, isColor: true };
  c.set = function (v) {
    if (typeof v === 'number') { c.r = ((v >> 16) & 255) / 255; c.g = ((v >> 8) & 255) / 255; c.b = (v & 255) / 255; }
    else if (v && typeof v === 'object') { c.r = v.r || 0; c.g = v.g || 0; c.b = v.b || 0; }
    return c;
  };
  c.setHex = function (v) { return c.set(v); };
  c.setRGB = function (r, g, b) { c.r = r; c.g = g; c.b = b; return c; };
  c.setHSL = function (h, s, l) { c.r = h; c.g = s; c.b = l; return c; };
  c.getHex = function () { return (Math.round(c.r * 255) << 16) ^ (Math.round(c.g * 255) << 8) ^ Math.round(c.b * 255); };
  c.copy = function (o) { return c.set(o); };
  c.clone = function () { return colorLike({ r: c.r, g: c.g, b: c.b }); };
  c.lerp = function () { return c; };
  c.multiplyScalar = function (s) { c.r *= s; c.g *= s; c.b *= s; return c; };
  c.offsetHSL = function () { return c; };
  c.convertSRGBToLinear = function () { return c; };
  if (input !== undefined && input !== null) c.set(input);
  return c;
}

function material(params) {
  const m = Object.assign({
    __kind: 'Material',
    opacity: 1,
    transparent: false,
    map: null,
    userData: {},
    uniforms: undefined,
    rotation: 0,
    dispose() {},
    needsUpdate: false,
  }, params || {});
  // Real materials always carry a Color, whether or not one was passed, and a
  // numeric `color: 0x93c5fd` argument is converted rather than kept as a
  // number. Mirroring that is what lets `.color.clone()` / `.color.set()` work.
  m.color = colorLike(m.color);
  return m;
}

function geometry(kind) {
  return {
    __kind: kind,
    attributes: {},
    setAttribute(name, attr) { this.attributes[name] = attr; return this; },
    setFromPoints() { return this; },
    setDrawRange() {},
    dispose() {},
  };
}

/** Installs a Three.js stub on window.THREE and returns a teardown fn. */
export function installThreeStub() {
  const previous = window.THREE;

  // Must be a plain function: `new THREE.Points(...)` cannot construct an arrow.
  function meshLike(kind) {
    return function (...args) {
      const o = object3D(kind);
      if (args[0] && args[0].__kind && String(args[0].__kind).includes('Geometry')) o.geometry = args[0];
      if (args[1] && args[1].__kind === 'Material') o.material = args[1];
      if (args[0] && args[0].__kind === 'Material') o.material = args[0];
      return o;
    };
  }

  const THREE = {
    // constants
    AdditiveBlending: 2, NormalBlending: 1, DoubleSide: 2, BackSide: 1, FrontSide: 0,
    sRGBEncoding: 3001, ACESFilmicToneMapping: 4,
    LinearFilter: 1006, LinearMipmapLinearFilter: 1008,
    MathUtils: { isPowerOfTwo: (n) => (n & (n - 1)) === 0 && n !== 0 },

    Scene: function () { return object3D('Scene'); },
    Group: function () { return object3D('Group'); },
    Object3D: function () { return object3D('Object3D'); },
    PerspectiveCamera: function (fov, aspect) {
      const c = object3D('PerspectiveCamera');
      c.fov = fov; c.aspect = aspect;
      return c;
    },
    Vector2: function (x, y) { return vec(x, y, 0); },
    Vector3: function (x, y, z) { return vec(x, y, z); },
    Color: function (input) { return colorLike(input); },
    BufferAttribute: function (array, itemSize) {
      return { __kind: 'BufferAttribute', array, itemSize, needsUpdate: false };
    },
    BufferGeometry: function () { return geometry('BufferGeometry'); },
    RingGeometry: function () { return geometry('RingGeometry'); },
    SphereGeometry: function () { return geometry('SphereGeometry'); },
    TorusGeometry: function () { return geometry('TorusGeometry'); },
    ConeGeometry: function () { return geometry('ConeGeometry'); },
    PlaneGeometry: function () { return geometry('PlaneGeometry'); },
    CircleGeometry: function () { return geometry('CircleGeometry'); },
    BoxGeometry: function () { return geometry('BoxGeometry'); },
    CylinderGeometry: function () { return geometry('CylinderGeometry'); },

    PointsMaterial: function (p) { return material(p); },
    MeshBasicMaterial: function (p) { return material(p); },
    LineBasicMaterial: function (p) { return material(p); },
    SpriteMaterial: function (p) { return material(p); },
    ShaderMaterial: function (p) { return material(p); },

    Points: meshLike('Points'),
    Mesh: meshLike('Mesh'),
    Line: meshLike('Line'),
    // The tool builds magnetic filaments, supernova ejecta webs and the radio
    // polarization field out of LineSegments. Omitting it here made every
    // scene-build test die on "not a constructor" — so the suite that exists to
    // catch scene-build regressions was itself reporting a stub gap, and could
    // not see a real ordering bug sitting underneath it.
    LineSegments: meshLike('LineSegments'),
    Sprite: function (mat) { const s = object3D('Sprite'); s.material = mat || material(); return s; },
    PointLight: function () { const l = object3D('PointLight'); l.intensity = 0; return l; },
    GridHelper: function () { const g = object3D('GridHelper'); g.material = material({ opacity: 1 }); return g; },

    CanvasTexture: function (canvas) {
      return { __kind: 'CanvasTexture', image: canvas, anisotropy: 1, generateMipmaps: true, needsUpdate: false, minFilter: 0, magFilter: 0, dispose() {}, clone() { return this; } };
    },
    Raycaster: function () {
      return { params: { Points: { threshold: 0 } }, setFromCamera() {}, intersectObject() { return []; }, intersectObjects() { return []; } };
    },
    WebGLRenderer: function () {
      let pixelRatio = 1;
      const r = {
        capabilities: { getMaxAnisotropy: () => 8, isWebGL2: true },
        outputEncoding: 0,
        toneMapping: 0,
        toneMappingExposure: 1,
        renderCount: 0,
        setSize() {},
        setPixelRatio(v) { pixelRatio = v; },
        getPixelRatio: () => pixelRatio,
        setClearColor() {},
        render() { r.renderCount++; THREE.__renderers.push(r); },
        dispose() {},
      };
      THREE.__renderers.push(r);
      return r;
    },
  };

  // Lets tests count draw calls (e.g. to prove an off-screen canvas stops drawing).
  THREE.__renderers = [];

  window.THREE = THREE;
  return function restore() {
    if (previous === undefined) delete window.THREE;
    else window.THREE = previous;
  };
}

/** ResizeObserver / IntersectionObserver / rAF stubs; returns a teardown fn. */
export function installLoopStubs() {
  const prevRO = window.ResizeObserver;
  const prevIO = window.IntersectionObserver;
  const prevRAF = window.requestAnimationFrame;
  const prevCAF = window.cancelAnimationFrame;

  const intersectionObservers = [];

  window.ResizeObserver = function (cb) {
    return { __cb: cb, observe() {}, unobserve() {}, disconnect() {} };
  };
  window.IntersectionObserver = function (cb) {
    const io = {
      __cb: cb,
      __targets: [],
      __disconnected: false,
      observe(el) { io.__targets.push(el); },
      unobserve() {},
      disconnect() { io.__disconnected = true; },
    };
    intersectionObservers.push(io);
    return io;
  };

  // Hand back ids and retain every callback scheduled for the next frame.
  // Browsers allow several rAF callbacks at once (for example the Galaxy render
  // loop plus an observing-mode transition), so the stub must not let the last
  // callback overwrite the animation loop.
  let rafId = 0;
  let pending = new Map();
  window.requestAnimationFrame = (cb) => { const id = ++rafId; pending.set(id, cb); return id; };
  window.cancelAnimationFrame = (id) => { pending.delete(id); };
  globalThis.requestAnimationFrame = window.requestAnimationFrame;
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame;

  const api = function restore() {
    window.ResizeObserver = prevRO;
    window.IntersectionObserver = prevIO;
    window.requestAnimationFrame = prevRAF;
    window.cancelAnimationFrame = prevCAF;
    globalThis.requestAnimationFrame = prevRAF;
    globalThis.cancelAnimationFrame = prevCAF;
  };
  /** Runs every callback queued for one animation frame. */
  api.step = function step() {
    const callbacks = Array.from(pending.values());
    if (!callbacks.length) return false;
    pending = new Map();
    const now = performance.now();
    callbacks.forEach((cb) => cb(now));
    return true;
  };
  /** Every IntersectionObserver created since install, newest last. */
  api.intersectionObservers = intersectionObservers;
  /** Drives the observer watching `el` to the given intersecting state. */
  api.setIntersecting = function setIntersecting(el, isIntersecting) {
    const io = intersectionObservers.filter((o) => o.__targets.includes(el)).pop();
    if (!io) throw new Error('no IntersectionObserver is watching that element');
    io.__cb([{ isIntersecting, target: el }], io);
    return io;
  };
  return api;
}
