// Builds the First Response body scene against a stub THREE and reports the
// recovery-position landmarks in world space.
//
// Why this exists: the recovery tab's teaching content IS the pose, and the
// only instrument we had for it was a WebGL screenshot diff. A screenshot can
// answer "did anything change", which the broken step schedule satisfied — the
// body kept rotating during the steps that were meant to move a head or a leg,
// so a test asserting "the airway step changes the picture" passed while the
// airway step moved nothing. Positions answer the actual question, in
// milliseconds and with no browser.
//
// The stub implements only what buildBodyScene touches. Segment ORIENTATION is
// not modelled (quaternion is a no-op) because every assertion here is about
// where joints are, which the builder sets directly.

class V3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  length() { return Math.hypot(this.x, this.y, this.z); }
  normalize() { const l = this.length() || 1; return this.multiplyScalar(1 / l); }
  setScalar(s) { return this.set(s, s, s); }
}

class Obj {
  constructor() {
    this.position = new V3();
    this.rotation = new V3();
    this.scale = new V3(1, 1, 1);
    this.children = [];
    this.userData = {};
    this.visible = true;
    this.quaternion = { setFromUnitVectors() {} };
  }
  add(o) { this.children.push(o); return this; }
  traverse(f) { f(this); this.children.forEach((c) => c.traverse(f)); }
}

class Mesh extends Obj {
  constructor(g, m) { super(); this.geometry = g; this.material = m || {}; this.isMesh = true; }
}

function geom() { return {}; }

const THREE = {
  Group: Obj, Mesh, Vector3: V3,
  BoxGeometry: geom, SphereGeometry: geom, CylinderGeometry: geom,
  TorusGeometry: geom, RingGeometry: geom, ConeGeometry: geom,
};

function arrayLiteral(src, name) {
  const start = src.indexOf('var ' + name + ' = [');
  if (start < 0) throw new Error('pose probe: ' + name + ' not found');
  const open = src.indexOf('[', start);
  let depth = 0, end = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') { depth--; if (!depth) { end = i; break; } }
  }
  return 'var ' + name + ' = ' + src.slice(open, end + 1) + ';';
}

function fnSource(src, name) {
  const start = src.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('pose probe: function ' + name + ' not found');
  let depth = 0, end = -1;
  for (let i = src.indexOf('{', start); i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (!depth) { end = i; break; } }
  }
  return src.slice(start, end + 1);
}

function scalar(src, name) {
  const m = src.match(new RegExp('var ' + name + ' = ([-\\d.]+);'));
  if (!m) throw new Error('pose probe: ' + name + ' not found');
  return 'var ' + name + ' = ' + m[1] + ';';
}

/**
 * @param {string} src  the tool source
 * @returns {(phase: number, age?: string, tab?: string) => object} landmark reader
 */
export function makePoseProbe(src) {
  const sandbox = [
    arrayLiteral(src, 'CPR_AGES'),
    arrayLiteral(src, 'RECOVERY_STEPS'),
    scalar(src, 'AIRWAY_TILT_MAX'),
    scalar(src, 'RECOVERY_HEAD_TILT'),
    scalar(src, 'RECOVERY_MOUTH_DOWN'),
    scalar(src, 'STABLE_THIGH_ANGLE'),
    fnSource(src, 'buildBodyScene'),
    'return buildBodyScene;',
  ].join('\n');
  // eslint-disable-next-line no-new-func
  const build = new Function('THREE', sandbox)(THREE);
  return function pose(phase, age, tab) {
    const built = build(THREE, {
      scene: new Obj(),
      phase,
      dark: true,
      contrast: false,
      wantShadow: false,
      trim: () => ({}),
      sceneProps: { tab: tab || 'recovery', age: age || 'adult' },
    });
    if (!built.landmarks) throw new Error('pose probe: buildBodyScene returned no landmarks');
    return built.landmarks;
  };
}

export function span(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
