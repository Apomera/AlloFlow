// Inject inside initEngine before the Block operations section. Ground cells keep
// canonical Mesh identities for collision, selection and recovery, while only
// instanced chunks enter the scene. Textures remain owned by the engine cache.
function installGeometryGround(engine, THREE, getMaterial, groundTint) {
  var SIDE = 16, MAX_GROUND = 16384;
  var chunks = {}, geometries = {}, terrainCount = 0, countSource = null, buildCount = 0;
  var zero = new THREE.Matrix4().makeScale(0, 0, 0), matrix = new THREE.Matrix4();
  engine._groundChunks = [];
  engine._groundBlockLimit = MAX_GROUND;
  function isGround(mesh) { return !!(mesh && mesh.userData && mesh.userData._measurementLayer === 'ground'); }
  engine.getConstructionBlockCount = function() {
    var list = engine.getBlocksArr ? engine.getBlocksArr() : Object.values(engine.blocks || {});
    if (list !== countSource) { countSource = list; buildCount = list.reduce(function(n, mesh) { return n + (isGround(mesh) ? 0 : 1); }, 0); }
    return buildCount;
  };
  engine.getGroundBlockCount = function() { return terrainCount; };
  engine.getRaycastTargets = function() {
    var list = engine.getBlocksArr ? engine.getBlocksArr() : Object.values(engine.blocks || {});
    if (engine._groundRaySource !== list || engine._groundRayRevision !== engine._groundRevision) {
      engine._groundRaySource = list; engine._groundRayRevision = engine._groundRevision;
      engine._groundRayTargets = list.filter(function(mesh) { return !(mesh.userData && mesh.userData.gwGroundProxy); }).concat(engine._groundChunks);
    }
    return engine._groundRayTargets;
  };
  function dirty() { engine._blocksDirty = true; countSource = null; engine._groundRevision = (engine._groundRevision || 0) + 1; }
  function geometry(type) {
    var id = type === 'grass' ? 'grass' : 'cube';
    if (geometries[id]) return geometries[id];
    var geo = new THREE.BoxGeometry(1, 1, 1), uv = geo.getAttribute('uv');
    // r128 enables USE_COLOR whenever instanceColor exists, then multiplies
    // geometry color by instance color. Missing base colors make terrain black.
    geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(geo.getAttribute('position').count * 3).fill(1), 3));
    // Cached block materials use vertex colors; neutral base preserves instance tint.
    geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(geo.getAttribute('position').count * 3).fill(1), 3));
    if (id === 'grass' && uv && uv.count === 24) {
      for (var i = 0; i < 24; i++) uv.setY(i, (i >= 8 && i < 12) ? 0.5 + uv.getY(i) * 0.5 : uv.getY(i) * 0.5);
      uv.needsUpdate = true;
    }
    geometries[id] = geo; return geo;
  }
  function interval(ray, min, max, near, far) {
    var lo = Math.max(0, near || 0), hi = far === undefined ? Infinity : far;
    for (var a = 0; a < 3; a++) {
      var axis = ['x','y','z'][a], p = ray.origin[axis], d = ray.direction[axis];
      if (Math.abs(d) < 1e-12) { if (p < min[axis] || p > max[axis]) return null; continue; }
      var t0 = (min[axis] - p) / d, t1 = (max[axis] - p) / d;
      lo = Math.max(lo, Math.min(t0, t1)); hi = Math.min(hi, Math.max(t0, t1));
      if (hi < lo) return null;
    }
    return [lo, hi];
  }
  function makeChunk(x, y, z, type) {
    var ox = Math.floor(x / SIDE) * SIDE, oz = Math.floor(z / SIDE) * SIDE;
    var key = ox + ',' + y + ',' + oz + ':' + type;
    if (chunks[key]) return chunks[key];
    var mat = getMaterial(type === 'grass' ? 'grass_cube' : type);
    var chunk = new THREE.InstancedMesh(geometry(type), mat, SIDE * SIDE);
    chunk.name = 'gw-ground-' + key;
    chunk.userData.gwGroundChunk = true; chunk.userData._measurementLayer = 'ground';
    chunk.castShadow = false; chunk.receiveShadow = true;
    // r128 does not compute an aggregate InstancedMesh bound. The raycast has its
    // own slab test; disabling render culling prevents distant chunk disappearances.
    chunk.frustumCulled = false;
    var cells = [], min = new THREE.Vector3(ox, y, oz), max = new THREE.Vector3(ox + SIDE, y + 1, oz + SIDE);
    for (var i = 0; i < SIDE * SIDE; i++) chunk.setMatrixAt(i, zero);
    // r128 setColorAt allocates from this.count, so allocate full capacity
    // before count becomes zero for the sparse, initially empty chunk.
    chunk.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(SIDE * SIDE * 3).fill(1), 3);
    chunk.count = 0;
    chunk.raycast = function(raycaster, hits) {
      if (!chunk.visible) return;
      var range = interval(raycaster.ray, min, max, raycaster.near, raycaster.far);
      if (!range) return;
      // Walk only X/Z cells crossed while the ray is inside this one-unit-high
      // slab. This avoids testing every instance in every landscape chunk.
      var ray = raycaster.ray, t = range[0], end = range[1], tested = {};
      for (var step = 0; step < SIDE * 3 + 4 && t <= end + 1e-7; step++) {
        var probe = Math.min(end, t + 1e-7), px = ray.origin.x + ray.direction.x * probe, pz = ray.origin.z + ray.direction.z * probe;
        var gx = Math.max(ox, Math.min(ox + SIDE - 1, Math.floor(px))), gz = Math.max(oz, Math.min(oz + SIDE - 1, Math.floor(pz)));
        var index = (gx - ox) * SIDE + gz - oz, proxy = cells[index];
        if (proxy && !tested[index] && proxy.visible !== false && engine.blocks[gx + ',' + y + ',' + gz] === proxy) {
          tested[index] = true;
          // Mesh.raycast supplies canonical proxy identity, face normal and exact
          // point/distance, which every existing interaction already understands.
          THREE.Mesh.prototype.raycast.call(proxy, raycaster, hits);
        }
        var tx = Math.abs(ray.direction.x) < 1e-12 ? Infinity : ((ray.direction.x > 0 ? gx + 1 : gx) - ray.origin.x) / ray.direction.x;
        var tz = Math.abs(ray.direction.z) < 1e-12 ? Infinity : ((ray.direction.z > 0 ? gz + 1 : gz) - ray.origin.z) / ray.direction.z;
        var next = Math.min(tx > t + 1e-8 ? tx : Infinity, tz > t + 1e-8 ? tz : Infinity);
        if (!isFinite(next) || next > end + 1e-7) break;
        t = next;
      }
    };
    var record = { mesh: chunk, cells: cells, ox: ox, oz: oz, y: y, type: type };
    chunks[key] = record; engine._groundChunks.push(chunk); engine.scene.add(chunk); dirty(); return record;
  }
  engine.placeGroundBlock = function(x, y, z, type) {
    var key = x + ',' + y + ',' + z, old = engine.blocks[key];
    if (old && !(old.userData && old.userData.gwGroundProxy)) return null;
    if (!old && terrainCount >= MAX_GROUND) return null;
    if (old && old.userData.blockType === type) return old;
    if (old) engine.removeGroundBlock(old);
    var record = makeChunk(x, y, z, type), chunk = record.mesh, index = (x - record.ox) * SIDE + z - record.oz;
    var proxy = new THREE.Mesh(chunk.geometry, chunk.material);
    proxy.position.set(x + 0.5, y + 0.5, z + 0.5); proxy.updateMatrixWorld(true);
    proxy.matrixAutoUpdate = false;
    proxy.userData = { blockType: type, gridPos: {x:x,y:y,z:z}, shape: 'cube', volume: 1, rotation: 0,
      _lessonBlock: true, _measurementLayer: 'ground', gwGroundProxy: true, _groundRecord: record, _groundInstance: index };
    matrix.makeTranslation(x + 0.5, y + 0.5, z + 0.5); chunk.setMatrixAt(index, matrix);
    var tint = ((x + z) & 1) ? 0.92 : 1;
    if (type === 'grass') tint *= groundTint(x, z);
    else if (/^(stone|wood|brick|sand)$/.test(type)) tint *= groundTint(x + type.length * 31, z - y * 17);
    chunk.setColorAt(index, new THREE.Color(tint, tint, tint));
    chunk.count = Math.max(chunk.count, index + 1);
    chunk.instanceMatrix.needsUpdate = true; if (chunk.instanceColor) chunk.instanceColor.needsUpdate = true;
    record.cells[index] = proxy; engine.blocks[key] = proxy; terrainCount++; dirty(); return proxy;
  };
  engine.removeGroundBlock = function(proxy) {
    var data = proxy && proxy.userData, record = data && data._groundRecord;
    if (!record || record.cells[data._groundInstance] !== proxy) return false;
    record.mesh.setMatrixAt(data._groundInstance, zero); record.mesh.instanceMatrix.needsUpdate = true;
    record.cells[data._groundInstance] = null;
    var p = data.gridPos, key = p.x + ',' + p.y + ',' + p.z;
    if (engine.blocks[key] === proxy) delete engine.blocks[key];
    terrainCount--; dirty(); return true;
  };
  engine.disposeGround = function() {
    engine._groundChunks.forEach(function(chunk) {
      if (chunk.parent) chunk.parent.remove(chunk);
      chunk.material.dispose(); if (typeof chunk.dispose === 'function') chunk.dispose();
    });
    Object.keys(geometries).forEach(function(key) { geometries[key].dispose(); });
    chunks = {}; geometries = {}; terrainCount = 0; engine._groundChunks = [];
    engine._groundRayTargets = []; engine._groundRaySource = null; dirty();
  };
}
