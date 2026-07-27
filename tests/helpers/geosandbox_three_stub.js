// A Three.js stub for the Geometry Sandbox SCENE BUILDERS.
//
// Why a second stub instead of reusing galaxy_three_stub: that one is deliberately
// dumb — its Vector3.add() returns the vector unchanged and it has no Box3. That is
// fine for "does initGalaxy throw", but useless here. What decides whether a solid
// is VISIBLE is exact arithmetic: face winding (an inside-out base gets back-face
// culled) and the centroid transform that gives each transparent object its own
// depth sort key. So the vectors and Box3 in THIS stub do real math, and only the
// parts that cannot affect visibility (textures, sprites) are faked.
//
// Only translations are ever applied to construction groups, so Box3 accumulates
// position offsets rather than full matrices — matching what the builders do.

function vec3(x = 0, y = 0, z = 0) {
  const v = {
    x, y, z,
    isVector3: true,
    set(nx, ny, nz) { v.x = nx; v.y = ny; v.z = nz; return v; },
    copy(o) { v.x = o.x; v.y = o.y; v.z = o.z; return v; },
    add(o) { v.x += o.x; v.y += o.y; v.z += o.z; return v; },
    sub(o) { v.x -= o.x; v.y -= o.y; v.z -= o.z; return v; },
    multiplyScalar(s) { v.x *= s; v.y *= s; v.z *= s; return v; },
    clone() { return vec3(v.x, v.y, v.z); },
    toArray() { return [v.x, v.y, v.z]; },
  };
  return v;
}

function object3D(kind) {
  const o = {
    __kind: kind,
    isGroup: kind === 'Group',
    visible: true,
    renderOrder: 0,
    userData: {},
    children: [],
    parent: null,
    position: vec3(),
    scale: vec3(1, 1, 1),
    geometry: null,
    material: null,
    add(...kids) { kids.forEach((k) => { if (k) { k.parent = o; o.children.push(k); } }); return o; },
    remove(k) { const i = o.children.indexOf(k); if (i >= 0) o.children.splice(i, 1); return o; },
    traverse(fn) { fn(o); o.children.forEach((c) => c.traverse && c.traverse(fn)); },
  };
  return o;
}

function geometry(kind, positions) {
  return {
    __kind: kind,
    attributes: positions ? { position: { array: positions, itemSize: 3 } } : {},
    setAttribute(name, attr) { this.attributes[name] = attr; return this; },
    setFromPoints(points) {
      const arr = [];
      points.forEach((p) => { arr.push(p.x, p.y, p.z); });
      this.attributes.position = { array: arr, itemSize: 3 };
      return this;
    },
    computeVertexNormals() { this.__normalsComputed = true; return this; },
    dispose() {},
  };
}

// A sphere has no explicit vertex list here; six axis extremes make its Box3 right,
// which is all the centroid transform needs from it.
function sphereShell(r) {
  return [r, 0, 0, -r, 0, 0, 0, r, 0, 0, -r, 0, 0, 0, r, 0, 0, -r];
}

/** Installs the stub on window.THREE. Returns a teardown fn. */
export function installGeoThreeStub() {
  const previous = window.THREE;

  function meshLike(kind) {
    return function (a, b) {
      const o = object3D(kind);
      if (a && a.__kind && String(a.__kind).includes('Geometry')) o.geometry = a;
      if (b && b.__kind === 'Material') o.material = b;
      return o;
    };
  }

  function material(kind) {
    return function (params) {
      return Object.assign({
        __kind: 'Material', __type: kind,
        transparent: false, opacity: 1, depthWrite: true, depthTest: true,
        side: 0, dispose() {},
      }, params || {});
    };
  }

  const THREE = {
    FrontSide: 0, BackSide: 1, DoubleSide: 2,

    Group: function () { return object3D('Group'); },
    Object3D: function () { return object3D('Object3D'); },
    Vector3: function (x, y, z) { return vec3(x, y, z); },
    Vector2: function (x, y) { return { x: x || 0, y: y || 0 }; },
    Color: function () { return { r: 0.5, g: 0.5, b: 0.5, isColor: true, setStyle() { return this; } }; },

    BufferAttribute: function (array, itemSize) { return { __kind: 'BufferAttribute', array, itemSize }; },
    BufferGeometry: function () { return geometry('BufferGeometry'); },
    SphereGeometry: function (r) { return geometry('SphereGeometry', sphereShell(r || 1)); },
    PlaneGeometry: function () { return geometry('PlaneGeometry', []); },
    // Edges share the source geometry's extent, which is all Box3 cares about.
    EdgesGeometry: function (src) {
      const p = src && src.attributes && src.attributes.position;
      return geometry('EdgesGeometry', p ? Array.from(p.array) : []);
    },

    MeshStandardMaterial: material('MeshStandardMaterial'),
    MeshBasicMaterial: material('MeshBasicMaterial'),
    MeshPhongMaterial: material('MeshPhongMaterial'),
    LineBasicMaterial: material('LineBasicMaterial'),
    SpriteMaterial: material('SpriteMaterial'),
    ShadowMaterial: material('ShadowMaterial'),

    Mesh: meshLike('Mesh'),
    Line: meshLike('Line'),
    LineSegments: meshLike('LineSegments'),
    Sprite: function (mat) {
      const s = object3D('Sprite');
      s.material = mat || null;
      s.scale = vec3(1, 1, 1);
      s.scale.multiplyScalar = function (k) { s.scale.x *= k; s.scale.y *= k; s.scale.z *= k; return s.scale; };
      return s;
    },
    CanvasTexture: function () { return { __kind: 'CanvasTexture', needsUpdate: false, dispose() {} }; },

    Box3: function () {
      const box = {
        min: vec3(Infinity, Infinity, Infinity),
        max: vec3(-Infinity, -Infinity, -Infinity),
        __empty: true,
        isEmpty() { return box.__empty; },
        getCenter(target) {
          const t = target || vec3();
          if (box.__empty) return t.set(0, 0, 0);
          return t.set((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, (box.min.z + box.max.z) / 2);
        },
        expand(x, y, z) {
          box.__empty = false;
          box.min.x = Math.min(box.min.x, x); box.max.x = Math.max(box.max.x, x);
          box.min.y = Math.min(box.min.y, y); box.max.y = Math.max(box.max.y, y);
          box.min.z = Math.min(box.min.z, z); box.max.z = Math.max(box.max.z, z);
        },
        setFromObject(node) {
          (function walk(n, ox, oy, oz) {
            const px = ox + n.position.x, py = oy + n.position.y, pz = oz + n.position.z;
            const attr = n.geometry && n.geometry.attributes && n.geometry.attributes.position;
            if (attr && attr.array) {
              for (let i = 0; i + 2 < attr.array.length; i += 3) {
                box.expand(attr.array[i] + px, attr.array[i + 1] + py, attr.array[i + 2] + pz);
              }
            }
            n.children.forEach((c) => walk(c, px, py, pz));
          })(node, 0, 0, 0);
          return box;
        },
      };
      return box;
    },
  };

  window.THREE = THREE;
  return function restore() {
    if (previous === undefined) delete window.THREE;
    else window.THREE = previous;
  };
}

// ── Geometry readers used by the assertions ─────────────────────────────────

/** Every triangle in a built geometry, as [[x,y,z],[x,y,z],[x,y,z]]. */
export function triangles(geo) {
  const a = (geo.attributes.position && geo.attributes.position.array) || [];
  const out = [];
  for (let i = 0; i + 8 < a.length; i += 9) {
    out.push([[a[i], a[i + 1], a[i + 2]], [a[i + 3], a[i + 4], a[i + 5]], [a[i + 6], a[i + 7], a[i + 8]]]);
  }
  return out;
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * For each triangle, how far its winding normal points AWAY from the solid's
 * centre. Positive = outward-facing = survives back-face culling. This is the
 * check that an inside-out base fails; the volume math cannot see it.
 */
export function outwardness(tris) {
  const pts = tris.flat();
  const c = pts.reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]).map((n) => n / pts.length);
  return tris.map(([p0, p1, p2]) => {
    const n = cross(sub(p1, p0), sub(p2, p0));
    const faceCentre = [(p0[0] + p1[0] + p2[0]) / 3, (p0[1] + p1[1] + p2[1]) / 3, (p0[2] + p1[2] + p2[2]) / 3];
    return dot(n, sub(faceCentre, c));
  });
}

/** World-space vertices of a node, applying the translation chain. */
export function worldVertices(node, ox = 0, oy = 0, oz = 0) {
  const px = ox + node.position.x, py = oy + node.position.y, pz = oz + node.position.z;
  const out = [];
  const attr = node.geometry && node.geometry.attributes && node.geometry.attributes.position;
  if (attr && attr.array) {
    for (let i = 0; i + 2 < attr.array.length; i += 3) {
      out.push([attr.array[i] + px, attr.array[i + 1] + py, attr.array[i + 2] + pz]);
    }
  }
  node.children.forEach((c) => out.push(...worldVertices(c, px, py, pz)));
  return out;
}

/** The first descendant (inclusive) whose __kind matches. */
export function findByKind(node, kind) {
  if (node.__kind === kind) return node;
  for (const c of node.children) {
    const hit = findByKind(c, kind);
    if (hit) return hit;
  }
  return null;
}
