/**
 * AlloFlow GLB Library — the CC0 collectibles catalog + loader (glblib/1)
 *
 * Tier D / "collecting" lane of docs/allohaven_cozy_world_design.md §4.7: the
 * cozy-game SHOP. Students spend earned tokens on catalog items (collect) as a
 * complement to Prim3D/Imagen (craft). Assets are CC0 low-poly .glb (Kenney /
 * Quaternius) hosted on our own CDN — no license friction, tiny, cohesive.
 *
 * HONEST STATUS: this is the loader + catalog ENGINE. Real .glb assets are a
 * curation task (Aaron picks ~50-100). Every catalog item carries a Prim3D
 * `recipe` FALLBACK, so the shop renders real objects TODAY with zero external
 * assets; adding a `glbUrl` upgrades an item in place. The three.js GLTFLoader
 * is lazy-loaded from CDN (the bloom-addon pattern) only when a .glb is needed.
 *
 * PURE, testable seams: normalizeCatalog / listCatalog / canAfford / affordable
 * / resolveSource. loadModel() is async and needs a THREE instance.
 *
 * RUNTIME: plain JS, no imports; registers window.AlloModules.GlbLibrary.
 */
(function () {
  'use strict';
  if (window.AlloModules && window.AlloModules.GlbLibrary) {
    console.log('[GlbLibrary] Already loaded, skipping');
    return;
  }

  var VERSION = 'glblib/1';
  // GLTFLoader attaches THREE.GLTFLoader (UMD examples/js — same base the
  // ConceptGraph3D bloom chain uses, so version + host stay consistent).
  var GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.137.0/examples/js/loaders/GLTFLoader.js';
  var CATEGORIES = { plant: 1, nature: 1, furniture: 1, creature: 1, trophy: 1, decor: 1 };

  function isNum(v) { return typeof v === 'number' && !isNaN(v); }
  function num(v, d) { return isNum(v) ? v : d; }

  // Starter catalog — Prim3D-recipe-backed so the shop works before any .glb
  // exists. `glbUrl: null` → renders from `recipe`; set glbUrl to upgrade.
  var STARTER_CATALOG = [
    { id: 'sprout', label: 'Sprout', category: 'plant', cost: 5, glbUrl: null, recipe: { name: 'Sprout', parts: [
      { shape: 'cylinder', size: [0.06, 0.4], position: [0, 0.2, 0], color: '#16a34a' },
      { shape: 'sphere', size: [0.18], position: [0, 0.5, 0], color: '#22c55e' },
      { shape: 'cone', size: [0.12, 0.2], position: [-0.14, 0.42, 0], rotation: [0, 0, 40], color: '#4ade80' }
    ] } },
    { id: 'boulder', label: 'Mossy Boulder', category: 'nature', cost: 8, glbUrl: null, recipe: { name: 'Boulder', parts: [
      { shape: 'sphere', size: [0.4], position: [0, 0.32, 0], color: '#6b7280' },
      { shape: 'sphere', size: [0.22], position: [0.28, 0.2, 0.1], color: '#9ca3af' },
      { shape: 'box', size: [0.5, 0.08, 0.5], position: [0, 0.55, 0], color: '#4d7c0f' }
    ] } },
    { id: 'lantern', label: 'Paper Lantern', category: 'furniture', cost: 10, glbUrl: null, recipe: { name: 'Lantern', parts: [
      { shape: 'cylinder', size: [0.04, 0.3], position: [0, 0.85, 0], color: '#334155' },
      { shape: 'sphere', size: [0.22], position: [0, 0.55, 0], color: '#f97316' },
      { shape: 'cylinder', size: [0.1, 0.5], position: [0, 0.25, 0], color: '#78350f' }
    ] } },
    { id: 'companion', label: 'Blocky Companion', category: 'creature', cost: 15, glbUrl: null, recipe: { name: 'Companion', parts: [
      { shape: 'box', size: [0.4, 0.35, 0.5], position: [0, 0.35, 0], color: '#818cf8' },
      { shape: 'box', size: [0.3, 0.28, 0.3], position: [0, 0.72, 0.05], color: '#a5b4fc' },
      { shape: 'sphere', size: [0.05], position: [-0.08, 0.76, 0.22], color: '#0b1020' },
      { shape: 'sphere', size: [0.05], position: [0.08, 0.76, 0.22], color: '#0b1020' },
      { shape: 'cylinder', size: [0.05, 0.2], position: [-0.14, 0.1, 0], color: '#6366f1' },
      { shape: 'cylinder', size: [0.05, 0.2], position: [0.14, 0.1, 0], color: '#6366f1' }
    ] } },
    { id: 'trophy', label: 'Gold Trophy', category: 'trophy', cost: 25, glbUrl: null, recipe: { name: 'Trophy', parts: [
      { shape: 'cylinder', size: [0.22, 0.12], position: [0, 0.06, 0], color: '#78350f' },
      { shape: 'cylinder', size: [0.06, 0.25], position: [0, 0.24, 0], color: '#f59e0b' },
      { shape: 'sphere', size: [0.24], position: [0, 0.5, 0], color: '#fbbf24' },
      { shape: 'torus', size: [0.24, 0.05], position: [0, 0.5, 0], rotation: [0, 0, 90], color: '#f59e0b' }
    ] } }
  ];

  function _validColor(v) { return (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.trim())); }

  function normalizeItem(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var id = (typeof raw.id === 'string' && raw.id.trim()) ? raw.id.trim() : null;
    if (!id) return null;
    var P3D = window.AlloModules && window.AlloModules.Prim3D;
    var recipe = null;
    if (raw.recipe) recipe = P3D ? P3D.normalizeRecipe(raw.recipe) : raw.recipe;   // keep raw if Prim3D not loaded yet
    var glbUrl = (typeof raw.glbUrl === 'string' && raw.glbUrl.trim()) ? raw.glbUrl.trim() : null;
    if (!glbUrl && !recipe) return null;   // nothing renderable
    return {
      id: id,
      label: (raw.label != null) ? String(raw.label).slice(0, 80) : id,
      category: CATEGORIES[raw.category] ? raw.category : 'decor',
      cost: Math.max(0, Math.round(num(raw.cost, 0))),
      glbUrl: glbUrl,
      recipe: recipe,
      tint: _validColor(raw.tint) ? raw.tint.trim().toLowerCase() : null
    };
  }

  function normalizeCatalog(items) {
    var arr = Array.isArray(items) ? items : STARTER_CATALOG;
    var out = [], seen = {};
    arr.forEach(function (raw) {
      var it = normalizeItem(raw);
      if (it && !seen[it.id]) { seen[it.id] = 1; out.push(it); }
    });
    return out;
  }

  function listCatalog(opts) {
    opts = opts || {};
    var cat = normalizeCatalog(opts.catalog);
    if (opts.category) cat = cat.filter(function (it) { return it.category === opts.category; });
    return cat;
  }

  function canAfford(item, tokens) {
    if (!item) return false;
    return num(tokens, 0) >= num(item.cost, 0);
  }
  function affordable(items, tokens) {
    return normalizeCatalog(items).filter(function (it) { return canAfford(it, tokens); });
  }

  // Which renderer an item uses: a real .glb when present, else its Prim3D
  // recipe, else nothing. PURE — the loader and any "needs download?" badge
  // both read this.
  function resolveSource(item) {
    if (!item) return 'none';
    if (item.glbUrl) return 'glb';
    if (item.recipe) return 'prim3d';
    return 'none';
  }

  function loadGLTFLoader(THREE, opts) {
    opts = opts || {};
    if (THREE.GLTFLoader) return Promise.resolve(true);
    if (window.__glbLoaderPromise) return window.__glbLoaderPromise;
    window.__glbLoaderPromise = new Promise(function (resolve, reject) {
      // Clear the cached promise on failure so a later call can RE-ATTEMPT the load —
      // otherwise one transient network/CSP hiccup permanently degrades every .glb
      // item to its Prim3D fallback for the whole page session.
      function fail(err) { try { window.__glbLoaderPromise = null; } catch (e) {} reject(err); }
      try {
        var s = document.createElement('script');
        s.src = opts.gltfUrl || GLTF_URL;
        s.async = true;
        s.onload = function () { THREE.GLTFLoader ? resolve(true) : fail(new Error('GLTFLoader loaded but THREE.GLTFLoader missing')); };
        s.onerror = function () { fail(new Error('failed to load GLTFLoader')); };
        document.head.appendChild(s);
      } catch (e) { fail(e); }
    });
    return window.__glbLoaderPromise;
  }

  // Multiplicatively tint an object's materials toward item.tint (colorway variants).
  // Keeps relative shading; no-op when tint is unset.
  function _applyTint(THREE, obj, tint) {
    if (!obj || !tint) return obj;
    try {
      var c = new THREE.Color(tint);
      obj.traverse(function (o) {
        var mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        mats.forEach(function (m) { if (m && m.color && m.color.multiply) { try { m.color.multiply(c); } catch (e) {} } });
      });
    } catch (e) {}
    return obj;
  }
  function _primFallback(THREE, item, opts) {
    var P3D = window.AlloModules && window.AlloModules.Prim3D;
    if (P3D && item && item.recipe) {
      var g = P3D.buildObject(THREE, item.recipe, { unit: num(opts.unit, 1) });
      if (g) return _applyTint(THREE, g, item.tint);
    }
    return null;
  }

  // Resolve an item to a THREE object. Real .glb → GLTFLoader (scaled to opts.unit),
  // with a graceful Prim3D fallback on any load failure; recipe-only items build
  // directly. Rejects only when nothing renderable exists.
  function loadModel(THREE, item, opts) {
    opts = opts || {};
    if (!THREE || !item) return Promise.reject(new Error('THREE and item required'));
    var src = resolveSource(item);
    if (src === 'prim3d') {
      var g = _primFallback(THREE, item, opts);
      return g ? Promise.resolve(g) : Promise.reject(new Error('recipe did not build'));
    }
    if (src === 'glb') {
      return loadGLTFLoader(THREE, opts).then(function () {
        return new Promise(function (resolve, reject) {
          try {
            new THREE.GLTFLoader().load(item.glbUrl, function (gltf) {
              try {
                var obj = gltf.scene || (gltf.scenes && gltf.scenes[0]);
                if (!obj) { reject(new Error('empty gltf')); return; }
                if (isNum(opts.unit)) obj.scale.setScalar(opts.unit);
                _applyTint(THREE, obj, item.tint);
                obj.userData.glbItemId = item.id;
                resolve(obj);
              } catch (e) { reject(e); }
            }, undefined, function () { reject(new Error('gltf load error')); });
          } catch (e) { reject(e); }
        });
      }).catch(function () {
        var fb = _primFallback(THREE, item, opts);   // never leave a purchased item invisible
        if (fb) return fb;
        throw new Error('glb failed and no fallback');
      });
    }
    return Promise.reject(new Error('item has neither glbUrl nor recipe'));
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.GlbLibrary = {
    version: VERSION,
    CATEGORIES: Object.keys(CATEGORIES),
    STARTER_CATALOG: STARTER_CATALOG,
    normalizeCatalog: normalizeCatalog,
    listCatalog: listCatalog,
    canAfford: canAfford,
    affordable: affordable,
    resolveSource: resolveSource,
    loadModel: loadModel
  };
  console.log('[GlbLibrary] Registered (glblib/1 — CC0 collectibles catalog + GLTFLoader, Prim3D fallback)');
})();
