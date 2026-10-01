// Builds the First Response body scene against bundled Three.js and reports the
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
import { readFileSync } from 'node:fs';
const THREE = {};
new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });

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
    const scene = new THREE.Scene();
    try {
      const built = build(THREE, {
        scene,
        phase,
        dark: true,
        contrast: false,
        wantShadow: false,
        trim: color => new THREE.MeshPhongMaterial({ color }),
        sceneProps: { tab: tab || 'recovery', age: age || 'adult' },
      });
      if (!built.landmarks) throw new Error('pose probe: buildBodyScene returned no landmarks');
      return built.landmarks;
    } finally {
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    }
  };
}

export function span(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
