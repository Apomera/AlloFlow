/**
 * AlloFlow Throughline Module — spatial UNIT builder (v1)
 *
 * Re-envisioning of the Mind Map MVP into a teacher-facing spatial unit builder.
 * Each node references ONE existing lesson (a history[] item) by lessonId; the
 * connected canvas is a UNIT whose spatial + typed-edge structure carries
 * pedagogical meaning (teaching sequence, prerequisite). A unit FILE is just an
 * existing AlloFlow lesson pack { mode, history:[...] } PLUS one additive
 * `unitLayout` sidecar key, so it loads in today's unmodified app (the importer
 * ignores unknown keys) and round-trips as one durable, exportable file.
 *
 * This IS the evolution of the shipped Mind Map MVP (same file, same
 * loadModule('MindMap', mind_map_module.js) + CDNModuleGate moduleKey="MindMap"
 * chain — no rename churn). Registers window.AlloModules.MindMap (the live chain)
 * and window.AlloModules.Throughline (forward name). The host gate's props are
 * widened to pass history/currentLesson/inLiveSession/onOpenLesson; with the old
 * 5-prop contract the tool still runs in graceful manual mode.
 *
 * Design doc: docs/unitweave_design.md
 *
 * Props (v1, all optional except isOpen/onClose so it degrades gracefully):
 *   isOpen, onClose, addToast, studentNickname, t   (the current 5)
 *   history:        history[] array (read-only) to resolve lessonId / drive the picker / seed from item.unitId
 *   currentLesson:  the lesson the teacher currently has open (generatedContent) for "Attach current"
 *   inLiveSession:  bool — so Open can WARN before broadcasting a lesson to connected students
 *   onOpenLesson:   (item) => host opens the lesson (handleRestoreView). If absent, Open is disabled.
 *
 * GRACEFUL DEGRADATION: with no history/onOpenLesson props (e.g. mounted by the
 * un-updated host), the tool still works in "manual mode": import a unit/pack
 * file, arrange it, annotate, export. Imported files carry their own history[],
 * which the module keeps in-memory to resolve lessonId.
 */
(function () {
  'use strict';
  if (window.AlloModules && window.AlloModules.Throughline) {
    console.log('[Throughline] Already loaded, skipping');
    return;
  }
  if (!window.React) {
    console.warn('[Throughline] React not available, skipping');
    return;
  }
  var React = window.React;
  var h = React.createElement;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useRef = React.useRef;
  var useCallback = React.useCallback;
  var throughlineConfirmSequence = 0;
  function askThroughlineConfirmation(message, options) {
    return new Promise(function(resolve) {
      if (!document.body) { resolve(false); return; }
      options = options || {};
      throughlineConfirmSequence += 1;
      var idBase = 'throughline-confirm-' + throughlineConfirmSequence;
      var opener = document.activeElement;
      var blocked = Array.prototype.slice.call(document.body.children).map(function(el) {
        return { el: el, hadInert: el.hasAttribute('inert'), ariaHidden: el.getAttribute('aria-hidden') };
      });
      var overlay = document.createElement('div');
      overlay.setAttribute('role', 'presentation');
      overlay.setAttribute('data-throughline-confirm', 'true');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(15,23,42,.78);display:flex;align-items:center;justify-content:center;padding:20px;';
      var dialog = document.createElement('div');
      dialog.setAttribute('role', 'alertdialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-labelledby', idBase + '-title');
      dialog.setAttribute('aria-describedby', idBase + '-description');
      dialog.style.cssText = 'box-sizing:border-box;width:min(32rem,100%);background:#fff;color:#0f172a;border-radius:14px;padding:22px;box-shadow:0 24px 64px rgba(0,0,0,.45);font-family:system-ui,sans-serif;';
      var title = document.createElement('h2');
      title.id = idBase + '-title';
      title.textContent = String(options.title || 'Please confirm');
      title.style.cssText = 'margin:0 0 8px;font-size:1.25rem;line-height:1.3;color:#0f172a;';
      var description = document.createElement('p');
      description.id = idBase + '-description';
      description.textContent = String(message || 'Continue with this action?');
      description.style.cssText = 'margin:0;color:#334155;line-height:1.55;white-space:pre-line;';
      var actions = document.createElement('div');
      actions.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px;margin-top:20px;';
      var cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.textContent = String(options.cancelText || 'Cancel');
      cancel.style.cssText = 'min-height:44px;padding:9px 16px;border:2px solid #475569;border-radius:8px;background:#fff;color:#0f172a;font-weight:700;cursor:pointer;';
      var confirm = document.createElement('button');
      confirm.type = 'button';
      confirm.textContent = String(options.confirmText || 'Continue');
      confirm.style.cssText = 'min-height:44px;padding:9px 16px;border:2px solid #1d4ed8;border-radius:8px;background:#1d4ed8;color:#fff;font-weight:700;cursor:pointer;';
      actions.appendChild(cancel); actions.appendChild(confirm);
      dialog.appendChild(title); dialog.appendChild(description); dialog.appendChild(actions);
      overlay.appendChild(dialog); document.body.appendChild(overlay);
      blocked.forEach(function(entry) { entry.el.setAttribute('inert', ''); entry.el.setAttribute('aria-hidden', 'true'); });
      var settled = false;
      function finish(accepted) {
        if (settled) return;
        settled = true;
        window.removeEventListener('keydown', onKeyDown, true);
        try { overlay.remove(); } catch (e) {}
        blocked.forEach(function(entry) {
          if (!entry.hadInert) entry.el.removeAttribute('inert');
          if (entry.ariaHidden == null) entry.el.removeAttribute('aria-hidden'); else entry.el.setAttribute('aria-hidden', entry.ariaHidden);
        });
        try { if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus(); } catch (e) {}
        resolve(accepted === true);
      }
      function onKeyDown(event) {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); finish(false); return; }
        if (event.key !== 'Tab') return;
        if (!dialog.contains(document.activeElement)) { event.preventDefault(); cancel.focus(); return; }
        if (event.shiftKey && document.activeElement === cancel) { event.preventDefault(); confirm.focus(); }
        else if (!event.shiftKey && document.activeElement === confirm) { event.preventDefault(); cancel.focus(); }
      }
      cancel.addEventListener('click', function() { finish(false); });
      confirm.addEventListener('click', function() { finish(true); });
      overlay.addEventListener('click', function(event) { if (event.target === overlay) finish(false); });
      window.addEventListener('keydown', onKeyDown, true);
      cancel.focus();
    });
  }

  var useMemo = React.useMemo;

  // ── Constants ───────────────────────────────────────────────────────
  var TOOL_NAME = 'Throughline';        // display name; kept in one place for an easy future rename
  var STORAGE_KEY = 'alloflow_throughline_v1';
  var SCHEMA_VERSION = 1;
  var GENERATOR = 'throughline@1';
  var NODE_W = 230;
  var NODE_H = 120;
  var CANVAS_W = 2400;
  var CANVAS_H = 1400;
  // ── Swim-lanes (the meaningful 2nd axis: strand / UbD phase / UDL mode / tier) ──
  // node.category (already persisted + round-tripped, previously never rendered) is
  // surfaced as horizontal lane bands. The lane INDEX is the single source of
  // grouping, and is also the depth-plane a future optional 3D view projects onto —
  // so 2D lanes and a 3D "floors" view stay one consistent model.
  var LANE_TOP = 40;
  var LANE_H = NODE_H + 80;                 // tall enough for one row of cards + a label
  var LANE_TINTS = ['#f8fafc', '#eef2f7'];  // subtle, AA-safe alternating bands
  var LANE_BAND_Y = 28;                      // node y offset within its band when tidied

  // Canonical type badges — mirrors the app's typeIcons map so badges match the
  // rest of AlloFlow (view_misc_panels typeIcons).
  var TYPE_ICONS = {
    quiz: '📝', glossary: '📖', outline: '📋', 'lesson-plan': '📚',
    'concept-sort': '🗂️', 'sentence-frames': '💬', simplified: '✨', persona: '🎭',
    timeline: '📅', adventure: '🎮', image: '🖼️', faq: '❓', analysis: '📊',
    tchart: '🪧', 'alignment-report': '✅', 'word-sounds': '🔤', dbq: '🏛️',
    'math-fluency-probe': '🔢', brainstorm: '💡', 'stem-assessment': '🔬',
    'manipulative-resource': '🧮'
  };
  function typeIcon(t) { return TYPE_ICONS[t] || '📄'; }
  function typeLabel(t) { return String(t || 'lesson').replace(/[-_]/g, ' '); }

  // Types whose default handleRestoreView path (setActiveView(type)) renders a
  // resource view. Conservative allowlist: types NOT here still open (the host
  // is defensive) but get a soft "may not open cleanly" note rather than a hard
  // block — better than false-blocking a valid type we forgot to list.
  var RENDERABLE_TYPES = {
    analysis: 1, glossary: 1, simplified: 1, outline: 1, 'concept-sort': 1,
    persona: 1, 'sentence-frames': 1, quiz: 1, 'lesson-plan': 1, 'alignment-report': 1,
    timeline: 1, tchart: 1, adventure: 1, image: 1, faq: 1, brainstorm: 1, dbq: 1,
    'word-sounds': 1, 'manipulative-resource': 1
  };

  var EDGE_STYLES = {
    sequence:     { stroke: '#475569', dash: null,   label: 'teach next' },
    prerequisite: { stroke: '#d97706', dash: '6 4',  label: 'prerequisite gate' }
  };

  // ── Generate Unit (the AI co-author flow) ───────────────────────────
  // The resource types the review editor lets a teacher toggle per lesson.
  // Mirrors the host's _UNIT_KNOWN_TYPES allowlist; the host re-validates.
  var RESOURCE_TYPE_OPTIONS = [
    'analysis', 'simplified', 'glossary', 'outline', 'sentence-frames',
    'concept-sort', 'brainstorm', 'timeline', 'quiz', 'faq', 'note-taking',
    'anchor-chart', 'adventure', 'dbq', 'persona', 'image', 'lesson-plan'
  ];
  // Known lesson/resource types (union of badges, renderable, toggleable). Imported
  // lesson items are sanitized against a tight field set; an unknown type still
  // imports but is render/open-guarded downstream (RENDERABLE_TYPES).
  var _KNOWN_LESSON_TYPES = (function () {
    var s = {};
    Object.keys(TYPE_ICONS).forEach(function (k) { s[k] = 1; });
    Object.keys(RENDERABLE_TYPES).forEach(function (k) { s[k] = 1; });
    RESOURCE_TYPE_OPTIONS.forEach(function (k) { s[k] = 1; });
    ['note-taking', 'anchor-chart', 'math', 'gemini-bridge', 'explore-challenge', 'math-fluency-maze'].forEach(function (k) { s[k] = 1; });
    return s;
  })();
  // Harden an imported lesson item (untrusted file): require a string id, keep only
  // the canonical AlloFlow item fields, coerce/cap type+title. Returns null to drop.
  function sanitizeLessonItem(it) {
    if (!it || typeof it !== 'object' || typeof it.id !== 'string' || !it.id) return null;
    var out = {
      id: it.id.slice(0, 120),
      type: (typeof it.type === 'string' && it.type) ? it.type.slice(0, 80) : 'unknown',
      title: (typeof it.title === 'string') ? it.title.slice(0, 400) : ''
    };
    if (typeof it.timestamp === 'number' || typeof it.timestamp === 'string') out.timestamp = it.timestamp;
    if (typeof it.meta === 'string') out.meta = it.meta.slice(0, 200);
    if (it.data && typeof it.data === 'object') out.data = it.data;
    return out;
  }
  // Pacing between lessons (the "pauses at regular intervals" the flow promises).
  // A short cool-down after each lesson, and a longer breather every Nth, so a
  // full unit run does not hammer the model. Skippable via "Continue now".
  var PACE_SECONDS = 5;
  var BREATHER_EVERY = 4;
  var BREATHER_SECONDS = 15;

  // ── ID generation ──────────────────────────────────────────────────
  function uid(prefix) {
    return (prefix || 'id_') + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
  }
  function nowIso() {
    // Date is allowed in the live runtime (this is not a workflow script).
    try { return new Date().toISOString(); } catch (e) { return ''; }
  }

  // ── Empty unit ──────────────────────────────────────────────────────
  function emptyUnit() {
    return {
      schemaVersion: SCHEMA_VERSION,
      generator: GENERATOR,
      minAppSchema: SCHEMA_VERSION,
      unitId: uid('tl_'),
      sourceUnitId: null,
      title: '',
      essentialQuestion: '',
      author: '',
      license: null,
      parentUnitId: null,
      forkedFrom: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      nodes: [],
      edges: []
    };
  }

  // ── normalize() — tolerate partial / hand-edited / older files ──────
  function normalizeUnit(raw) {
    var u = emptyUnit();
    if (!raw || typeof raw !== 'object') return u;
    // carry forward known scalar fields if present
    ['unitId', 'sourceUnitId', 'title', 'essentialQuestion', 'author', 'license',
     'parentUnitId', 'forkedFrom', 'createdAt', 'updatedAt', 'generator'].forEach(function (k) {
      if (raw[k] != null) u[k] = raw[k];
    });
    if (typeof raw.minAppSchema === 'number') u.minAppSchema = raw.minAppSchema;
    var nodes = Array.isArray(raw.nodes) ? raw.nodes : [];
    var seen = {};
    u.nodes = nodes.filter(function (n) {
      return n && typeof n === 'object' && typeof n.x === 'number' && typeof n.y === 'number';
    }).map(function (n) {
      var id = (typeof n.nodeId === 'string' && n.nodeId) ? n.nodeId : uid('n_');
      if (seen[id]) id = uid('n_');         // de-dupe collided node ids
      seen[id] = true;
      return {
        nodeId: id,
        lessonId: (typeof n.lessonId === 'string' && n.lessonId) ? n.lessonId : null,
        x: n.x, y: n.y,
        description: typeof n.description === 'string' ? n.description : '',
        role: typeof n.role === 'string' ? n.role : '',
        status: typeof n.status === 'string' ? n.status : (n.lessonId ? 'draft' : 'planned'),
        category: (typeof n.category === 'string' && n.category) ? n.category : null,
        bundledLessonIds: Array.isArray(n.bundledLessonIds) ? n.bundledLessonIds.filter(function (id) { return typeof id === 'string' && id; }) : undefined
      };
    });
    var ids = {};
    u.nodes.forEach(function (n) { ids[n.nodeId] = true; });
    var edges = Array.isArray(raw.edges) ? raw.edges : [];
    u.edges = edges.filter(function (e) {
      return e && ids[e.from] && ids[e.to] && e.from !== e.to;
    }).map(function (e) {
      return { from: e.from, to: e.to, type: EDGE_STYLES[e.type] ? e.type : 'sequence' };
    });
    return u;
  }

  // ── localStorage: persist the unitLayout ONLY (never the lesson payloads) ──
  function loadUnitFromStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyUnit();
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION) return emptyUnit();
      return normalizeUnit(parsed);
    } catch (e) {
      console.warn('[Throughline] storage load failed:', e.message);
      return emptyUnit();
    }
  }
  // Returns true on success, false on failure (quota etc.) so the UI can nudge.
  function saveUnitToStorage(unit) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(unit));
      return true;
    } catch (e) {
      console.warn('[Throughline] storage save failed:', e.message);
      return false;
    }
  }

  // ── Topological sort for the derived linear outline (cycle-safe) ────
  // Returns { order: [nodeId...], hasCycle: bool }. Ties + disconnected nodes
  // broken by x then y. On a cycle, falls back to pure x-order for the whole set.
  function deriveOutline(unit) {
    var nodes = unit.nodes.slice();
    var byX = nodes.slice().sort(function (a, b) { return (a.x - b.x) || (a.y - b.y); });
    var indeg = {}, adj = {};
    nodes.forEach(function (n) { indeg[n.nodeId] = 0; adj[n.nodeId] = []; });
    unit.edges.forEach(function (e) {
      if (adj[e.from] && indeg[e.to] != null) { adj[e.from].push(e.to); indeg[e.to]++; }
    });
    // Kahn's algorithm, picking ready nodes in x-order for stable left-to-right reading.
    var ready = byX.filter(function (n) { return indeg[n.nodeId] === 0; }).map(function (n) { return n.nodeId; });
    var order = [];
    var localIndeg = {};
    nodes.forEach(function (n) { localIndeg[n.nodeId] = indeg[n.nodeId]; });
    var posOf = {};
    byX.forEach(function (n, i) { posOf[n.nodeId] = i; });
    while (ready.length) {
      ready.sort(function (a, b) { return posOf[a] - posOf[b]; });
      var id = ready.shift();
      order.push(id);
      (adj[id] || []).forEach(function (to) {
        localIndeg[to]--;
        if (localIndeg[to] === 0) ready.push(to);
      });
    }
    if (order.length !== nodes.length) {
      // cycle present — fall back to x-order, flag it
      return { order: byX.map(function (n) { return n.nodeId; }), hasCycle: true };
    }
    return { order: order, hasCycle: false };
  }

  // ── Lanes: distinct categories among nodes → ordered bands ──────────
  // First-appearance order; uncategorized nodes (category null/'') fall into a
  // single trailing "Ungrouped" lane. The returned index is the band position AND
  // the depth plane a 3D view would stack on.
  function deriveLanes(unit) {
    var order = [], seen = {}, hasUngrouped = false;
    (unit.nodes || []).forEach(function (n) {
      var c = (n && typeof n.category === 'string' && n.category) ? n.category : null;
      if (c === null) { hasUngrouped = true; return; }
      if (!seen[c]) { seen[c] = true; order.push(c); }
    });
    var lanes = order.map(function (c, i) { return { key: c, index: i }; });
    if (hasUngrouped || lanes.length === 0) lanes.push({ key: null, index: lanes.length });
    return lanes;
  }

  // ── Lazy-load the shared ConceptGraph engine + 3D renderer ──────────
  // Loaded from the SAME CDN path this module was served from, so "View in 3D"
  // works in the deployed Canvas with no host wiring. Resolves false if the
  // modules can't be reached (the overlay then shows a graceful message).
  var CG_CDN_FALLBACK = 'https://alloflow-cdn.pages.dev/';
  function _cgSelfBase() {
    try {
      var scripts = document.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i].src || '';
        var idx = src.indexOf('mind_map_module.js');
        if (idx >= 0) return { base: src.slice(0, idx), query: src.slice(idx + 'mind_map_module.js'.length) };
      }
    } catch (e) {}
    return { base: CG_CDN_FALLBACK, query: '' };
  }
  function _loadScriptOnce(url) {
    return new Promise(function (resolve, reject) {
      try {
        var sel = 'script[data-cg-src="' + url + '"]';
        var existing = document.querySelector(sel);
        if (existing) {
          if (existing.getAttribute('data-cg-loaded') === '1') return resolve();
          existing.addEventListener('load', function () { resolve(); });
          existing.addEventListener('error', function () { reject(new Error('load failed')); });
          return;
        }
        var s = document.createElement('script');
        s.src = url; s.async = true; s.setAttribute('data-cg-src', url);
        s.onload = function () { s.setAttribute('data-cg-loaded', '1'); resolve(); };
        s.onerror = function () { reject(new Error('load failed: ' + url)); };
        document.head.appendChild(s);
      } catch (e) { reject(e); }
    });
  }
  function ensureConceptGraph() {
    if (window.AlloModules && window.AlloModules.ConceptGraph3D && window.AlloModules.ConceptGraphEngine) return Promise.resolve(true);
    var loc = _cgSelfBase();
    return _loadScriptOnce(loc.base + 'concept_graph_engine_module.js' + loc.query)
      .then(function () { return _loadScriptOnce(loc.base + 'concept_graph_3d_module.js' + loc.query); })
      .then(function () { return !!(window.AlloModules && window.AlloModules.ConceptGraph3D && window.AlloModules.ConceptGraphEngine); })
      .catch(function () { return false; });
  }

  // ── Component ───────────────────────────────────────────────────────
  function ThroughlineModal(props) {
    var isOpen = props.isOpen;
    var onClose = props.onClose || function () {};
    var addToast = props.addToast || function () {};
    var t = props.t || function (k) { return k; };
    var hostHistory = Array.isArray(props.history) ? props.history : [];
    var currentLesson = props.currentLesson || null;
    var inLiveSession = !!props.inLiveSession;
    var onOpenLesson = typeof props.onOpenLesson === 'function' ? props.onOpenLesson : null;
    // v1.1 units integration: the existing AlloFlow units feature (item.unitId
    // folders). `units` = [{id,name}]; `seedUnitId` opens the tool pre-built
    // from a chosen unit. One system, two altitudes — Throughline visualizes
    // the same units the history panel groups by, it does not parallel them.
    var hostUnits = Array.isArray(props.units) ? props.units : [];
    var seedUnitId = props.seedUnitId || null;
    function unitName(id) {
      for (var i = 0; i < hostUnits.length; i++) { if (hostUnits[i] && hostUnits[i].id === id) return hostUnits[i].name || 'Unit'; }
      return 'Unit';
    }

    var unitRef = useRef(null);
    if (unitRef.current === null) unitRef.current = loadUnitFromStorage();

    var unitHook = useState(unitRef.current); var unit = unitHook[0]; var setUnit = unitHook[1];
    // Lessons imported from a unit/pack file (kept in-memory to resolve lessonId
    // even when the host did not pass `history`). Map id -> item.
    var importedHook = useState({}); var importedLessons = importedHook[0]; var setImportedLessons = importedHook[1];
    var modeHook = useState('view'); var mode = modeHook[0]; var setMode = modeHook[1];
    var pendingHook = useState(null); var pendingFrom = pendingHook[0]; var setPendingFrom = pendingHook[1];
    var draggingHook = useState(null); var dragging = draggingHook[0]; var setDragging = draggingHook[1];
    var pickerHook = useState(null); var pickerForNode = pickerHook[0]; var setPickerForNode = pickerHook[1];
    var pickerQHook = useState(''); var pickerQuery = pickerQHook[0]; var setPickerQuery = pickerQHook[1];
    var editHook = useState(null); var editingNode = editHook[0]; var setEditingNode = editHook[1];
    var outlineHook = useState(false); var showOutline = outlineHook[0]; var setShowOutline = outlineHook[1];
    var headerHook = useState(false); var editingHeader = headerHook[0]; var setEditingHeader = headerHook[1];
    var quotaHook = useState(false); var quotaFailed = quotaHook[0]; var setQuotaFailed = quotaHook[1];
    var lanesHook = useState(false); var showLanes = lanesHook[0]; var setShowLanes = lanesHook[1];
    // pendingEdge holds the two endpoints awaiting an accessible sequence-vs-prereq
    // choice (replaces the SR-hostile window.confirm in connect mode).
    var pendingEdgeHook = useState(null); var pendingEdge = pendingEdgeHook[0]; var setPendingEdge = pendingEdgeHook[1];
    // 3D view overlay: cg3dState idle|loading|ready|error; graph3d = the acg graph
    // currently shown (re-set when "Arrange by meaning" rewrites its axisValues).
    var show3DHook = useState(false); var show3D = show3DHook[0]; var setShow3D = show3DHook[1];
    var cg3dHook = useState('idle'); var cg3dState = cg3dHook[0]; var setCg3dState = cg3dHook[1];
    var graph3dHook = useState(null); var graph3d = graph3dHook[0]; var setGraph3d = graph3dHook[1];
    var aiBusyHook = useState(false); var aiBusy = aiBusyHook[0]; var setAiBusy = aiBusyHook[1];

    // ── Generate Unit machine. `gen` null = closed. When set, holds the whole
    //    flow (setup → proposing → review → generating → done). The async driver
    //    reads live state through genRef so user edits mid-run are honored.
    var genHook = useState(null); var gen = genHook[0]; var setGen = genHook[1];
    var onProposeUnit = typeof props.onProposeUnit === 'function' ? props.onProposeUnit : null;
    var onGenerateUnitLesson = typeof props.onGenerateUnitLesson === 'function' ? props.onGenerateUnitLesson : null;
    var canGenerate = !!(onProposeUnit && onGenerateUnitLesson);

    var svgRef = useRef(null);
    var fileInputRef = useRef(null);
    var cardRefs = useRef({});            // nodeId -> card DOM, for arrow-key roving focus
    var genRef = useRef(null);            // latest `gen` for the async loop
    var mountedRef = useRef(true);        // false after unmount → loop bails
    var abortRef = useRef(null);          // AbortController for the active run
    var decisionRef = useRef(null);       // resolver for the per-lesson backpressure gate
    var paceResolveRef = useRef(null);    // resolver for the pacing countdown
    var paceTimerRef = useRef(null);      // active pacing setTimeout

    // Resolve a lessonId against (host history ∪ imported lessons).
    var lessonPool = useMemo(function () {
      var m = {};
      hostHistory.forEach(function (it) { if (it && it.id) m[it.id] = it; });
      Object.keys(importedLessons).forEach(function (k) { if (!m[k]) m[k] = importedLessons[k]; });
      return m;
    }, [hostHistory, importedLessons]);

    function resolveLesson(lessonId) {
      return lessonId ? (lessonPool[lessonId] || null) : null;
    }

    // Persist (unitLayout only) on every change; surface quota failures.
    useEffect(function () {
      var stamped = Object.assign({}, unit, { updatedAt: nowIso() });
      var ok = saveUnitToStorage(stamped);
      setQuotaFailed(!ok);
    }, [unit]);

    // ── Mutators ──────────────────────────────────────────────────
    var patchUnit = useCallback(function (patch) {
      setUnit(function (u) { return Object.assign({}, u, patch); });
    }, []);

    var addNode = useCallback(function (x, y, lessonId) {
      var n = {
        nodeId: uid('n_'),
        lessonId: lessonId || null,
        x: x, y: y,
        description: '',
        role: '',
        status: lessonId ? 'draft' : 'planned',
        category: null
      };
      setUnit(function (u) { return Object.assign({}, u, { nodes: u.nodes.concat([n]) }); });
      return n.nodeId;
    }, []);

    var deleteNode = useCallback(function (nodeId) {
      setUnit(function (u) {
        return Object.assign({}, u, {
          nodes: u.nodes.filter(function (n) { return n.nodeId !== nodeId; }),
          edges: u.edges.filter(function (e) { return e.from !== nodeId && e.to !== nodeId; })
        });
      });
    }, []);

    var moveNode = useCallback(function (nodeId, x, y) {
      setUnit(function (u) {
        return Object.assign({}, u, {
          nodes: u.nodes.map(function (n) { return n.nodeId === nodeId ? Object.assign({}, n, { x: x, y: y }) : n; })
        });
      });
    }, []);

    var setNodeFields = useCallback(function (nodeId, fields) {
      setUnit(function (u) {
        return Object.assign({}, u, {
          nodes: u.nodes.map(function (n) { return n.nodeId === nodeId ? Object.assign({}, n, fields) : n; })
        });
      });
    }, []);

    var addEdge = useCallback(function (from, to, type) {
      if (from === to) return;
      setUnit(function (u) {
        var dup = u.edges.some(function (e) {
          return (e.from === from && e.to === to) || (e.from === to && e.to === from);
        });
        if (dup) return u;
        return Object.assign({}, u, { edges: u.edges.concat([{ from: from, to: to, type: type || 'sequence' }]) });
      });
    }, []);

    // ── Attach flows ──────────────────────────────────────────────
    function attachCurrentToNode(nodeId) {
      if (!currentLesson || !currentLesson.id) {
        addToast(t('throughline.no_current_lesson') || 'No lesson is currently open to attach.', 'info');
        return;
      }
      if (!currentLesson.type) {
        addToast(t('throughline.current_not_lesson') || 'The current view is not an attachable lesson.', 'info');
        return;
      }
      // keep the current lesson resolvable even if it is not in props.history
      setImportedLessons(function (m) { var n = Object.assign({}, m); n[currentLesson.id] = currentLesson; return n; });
      setNodeFields(nodeId, { lessonId: currentLesson.id, status: 'draft' });
      addToast((t('throughline.attached') || 'Attached') + ': ' + (currentLesson.title || typeLabel(currentLesson.type)), 'success');
    }

    function pickFromHistoryToNode(nodeId, item) {
      if (!item || !item.id) return;
      setImportedLessons(function (m) { var n = Object.assign({}, m); if (!n[item.id]) n[item.id] = item; return n; });
      setNodeFields(nodeId, { lessonId: item.id, status: 'draft' });
      setPickerForNode(null);
      setPickerQuery('');
      addToast((t('throughline.attached') || 'Attached') + ': ' + (item.title || typeLabel(item.type)), 'success');
    }

    // Bulk-add: lay out a set of lessons left-to-right (creation order),
    // optionally grouped by unitId. Used for "add all lessons from <unit>".
    function bulkAddLessons(items) {
      if (!items || !items.length) {
        addToast(t('throughline.no_lessons_to_add') || 'No lessons available to add.', 'info');
        return;
      }
      var startX = 80, y0 = 120, gapX = NODE_W + 40, gapY = NODE_H + 50, perRow = 6;
      var newNodes = [];
      var newImported = {};
      items.forEach(function (it, i) {
        if (!it || !it.id) return;
        newImported[it.id] = it;
        newNodes.push({
          nodeId: uid('n_'),
          lessonId: it.id,
          x: startX + (i % perRow) * gapX,
          y: y0 + Math.floor(i / perRow) * gapY,
          description: '',
          role: '',
          status: 'draft',
          category: it.unitId || null
        });
      });
      // chain sequence edges along creation order within the added batch
      var newEdges = [];
      for (var k = 1; k < newNodes.length; k++) {
        newEdges.push({ from: newNodes[k - 1].nodeId, to: newNodes[k].nodeId, type: 'sequence' });
      }
      setImportedLessons(function (m) { return Object.assign({}, m, newImported); });
      setUnit(function (u) {
        return Object.assign({}, u, {
          nodes: u.nodes.concat(newNodes),
          edges: u.edges.concat(newEdges)
        });
      });
      addToast((t('throughline.added_n') || 'Added') + ' ' + newNodes.length + ' ' + (t('throughline.lessons') || 'lessons'), 'success');
    }

    // Build a FRESH unit from one existing units-feature unit (item.unitId).
    function seedFromUnit(unitId) {
      var items = hostHistory.filter(function (it) { return it && it.unitId === unitId; });
      if (!items.length) {
        addToast((t('throughline.unit_empty') || 'That unit has no lessons yet') + ': ' + unitName(unitId), 'info');
        return false;
      }
      var fresh = emptyUnit();
      fresh.title = unitName(unitId);
      fresh.sourceUnitId = unitId;
      var startX = 80, y0 = 120, gapX = NODE_W + 40, gapY = NODE_H + 50, perRow = 6;
      var imp = {};
      items.forEach(function (it, i) {
        imp[it.id] = it;
        fresh.nodes.push({
          nodeId: uid('n_'), lessonId: it.id,
          x: startX + (i % perRow) * gapX, y: y0 + Math.floor(i / perRow) * gapY,
          description: '', role: '', status: 'draft', category: unitId
        });
      });
      for (var k = 1; k < fresh.nodes.length; k++) fresh.edges.push({ from: fresh.nodes[k - 1].nodeId, to: fresh.nodes[k].nodeId, type: 'sequence' });
      setImportedLessons(function (m) { return Object.assign({}, m, imp); });
      setUnit(fresh);
      return true;
    }

    // Seed-on-open from a chosen unit (the "Visualize in Throughline" entry).
    // Empty canvas → build silently. Non-empty → confirm replace (consistent
    // with the import-replace idiom). Consume each seedUnitId once.
    var seedConsumedRef = useRef(null);
    useEffect(function () {
      if (!seedUnitId || seedConsumedRef.current === seedUnitId) return;
      seedConsumedRef.current = seedUnitId;
      var cancelled = false;
      if (unit.nodes.length === 0) {
        if (seedFromUnit(seedUnitId)) {
          addToast((t('throughline.opened_unit') || 'Opened unit') + ': ' + unitName(seedUnitId), 'success');
        }
      } else {
        var message = (t('throughline.confirm_seed_replace') || 'Replace your current canvas with the unit') + ' "' + unitName(seedUnitId) + '"?';
        askThroughlineConfirmation(message, { title: 'Replace current canvas', confirmText: 'Replace canvas' }).then(function(ok) {
          if (!cancelled && ok) seedFromUnit(seedUnitId);
        });
      }
      return function () { cancelled = true; };
    }, [seedUnitId]); // eslint-disable-line

    // ── Open a node's lesson (hardened) ───────────────────────────
    async function openNodeLesson(node) {
      var item = resolveLesson(node.lessonId);
      if (!item) {
        addToast(t('throughline.lesson_missing') || 'This lesson is not present in the unit file.', 'info');
        return;
      }
      if (!onOpenLesson) {
        addToast(t('throughline.open_unavailable') || 'Opening lessons is not available here. Export the unit and open it in AlloFlow.', 'info');
        return;
      }
      if (inLiveSession) {
        var ok = await askThroughlineConfirmation(t('throughline.live_open_confirm') ||
          'You are in a live class session. Opening this lesson will show it to connected students. Continue?', { title: 'Open lesson in live session', confirmText: 'Open lesson' });
        if (!ok) return;
      }
      onOpenLesson(item);
    }

    // ── Export: existing pack shape + unitLayout sidecar ──────────
    function exportUnit() {
      try {
        // subset history to lessons actually referenced by nodes (the attached
        // lesson AND any sibling resources a Generate-Unit run bundled with it,
        // so export is non-lossy)
        var referenced = {};
        unit.nodes.forEach(function (n) {
          if (n.lessonId) referenced[n.lessonId] = true;
          if (Array.isArray(n.bundledLessonIds)) n.bundledLessonIds.forEach(function (id) { if (id) referenced[id] = true; });
        });
        // FERPA scrub: a shareable unit file must never carry per-student response/
        // score PII (e.g. stem-assessment data.answers). Drop these keys anywhere in
        // an exported item; answer KEYS (singular "answer"/"correctAnswer") are kept.
        var _PII_KEYS = { answers: 1, studentAnswers: 1, studentResponses: 1, studentSubmissions: 1, responses: 1, submissions: 1, roster: 1, students: 1, studentName: 1, studentNames: 1, liveResults: 1, pollResults: 1, votes: 1, scoresByStudent: 1, perStudent: 1 };
        function _scrubPII(v, depth) {
          if (!v || typeof v !== 'object' || depth > 8) return v;
          if (Array.isArray(v)) return v.map(function (x) { return _scrubPII(x, depth + 1); });
          var out = {}; Object.keys(v).forEach(function (k) { if (_PII_KEYS[k]) return; out[k] = _scrubPII(v[k], depth + 1); });
          return out;
        }
        var _scrubbed = 0;
        var _refIds = Object.keys(referenced);
        var _resolved = _refIds.map(function (id) { return lessonPool[id]; }).filter(Boolean);
        var _dropped = _refIds.length - _resolved.length;   // referenced lessons not resolvable (e.g. import-only after reload)
        var history = _resolved.map(function (it) {
          var clean = _scrubPII(it, 0);
          try { if (JSON.stringify(clean) !== JSON.stringify(it)) _scrubbed += 1; } catch (e) {}
          return clean;
        });
        var stamped = Object.assign({}, unit, { updatedAt: nowIso(), generator: GENERATOR, schemaVersion: SCHEMA_VERSION });
        var payload = {
          mode: 'independent',
          history: history,
          // session-state keys omitted (a fresh unit carries none); the importer tolerates their absence
          unitLayout: stamped
        };
        var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        var slug = (unit.title || 'unit').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'unit';
        a.href = url; a.download = 'alloflow-' + slug + '.unit.json';
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 100);
        addToast((t('throughline.exported') || 'Unit exported') + ' (' + history.length + ' ' + (t('throughline.lessons') || 'lessons') + ')' + (_scrubbed ? ' · ' + _scrubbed + ' ' + (t('throughline.export_scrubbed') || 'with student data removed') : '') + (_dropped ? ' · ' + _dropped + ' ' + (t('throughline.export_dropped') || 'could not be included (open them once, then re-export)') : ''), _dropped ? 'warning' : 'success');
      } catch (e) {
        addToast((t('throughline.export_failed') || 'Export failed') + ': ' + e.message, 'error');
      }
    }

    // ── Import: a unit file (has unitLayout) OR a plain pack (auto-layout) ──
    function importFile(file) {
      if (!file) return;
      var reader = new FileReader();
      reader.onload = async function (ev) {
        try {
          var parsed = JSON.parse(ev.target.result);
          var packHistory = Array.isArray(parsed && parsed.history) ? parsed.history : [];
          // keep the file's lessons resolvable
          var imp = {};
          packHistory.forEach(function (it) { var s = sanitizeLessonItem(it); if (s) imp[s.id] = s; });

          if (parsed && parsed.unitLayout) {
            var nu = normalizeUnit(parsed.unitLayout);
            if (unit.nodes.length > 0) {
              var ok = await askThroughlineConfirmation(t('throughline.confirm_replace') || 'Replace your current unit with the imported one? This cannot be undone.', { title: 'Replace current unit', confirmText: 'Replace unit' });
              if (!ok) return;
            }
            setImportedLessons(function (m) { return Object.assign({}, m, imp); });
            setUnit(nu);
            addToast((t('throughline.imported_unit') || 'Imported unit') + ': ' + (nu.title || nu.nodes.length + ' nodes'), 'success');
            return;
          }

          // Plain pack — auto-layout its history left-to-right, grouped by unitId.
          if (packHistory.length === 0) {
            throw new Error(t('throughline.no_history') || 'No lessons found in this file');
          }
          if (unit.nodes.length > 0) {
            var ok2 = await askThroughlineConfirmation(t('throughline.confirm_replace') || 'Replace your current unit with the imported one? This cannot be undone.', { title: 'Replace current unit', confirmText: 'Replace unit' });
            if (!ok2) return;
          }
          // sort: group by unitId (tagged units cluster), preserve order within
          var ordered = packHistory.slice();
          var fresh = emptyUnit();
          fresh.title = (parsed && parsed.title) || '';
          var startX = 80, y0 = 120, gapX = NODE_W + 40, gapY = NODE_H + 50, perRow = 6;
          var nodes = [], edges = [];
          ordered.forEach(function (it, i) {
            if (!it || !it.id) return;
            nodes.push({
              nodeId: uid('n_'), lessonId: it.id,
              x: startX + (i % perRow) * gapX, y: y0 + Math.floor(i / perRow) * gapY,
              description: '', role: '', status: 'draft', category: it.unitId || null
            });
          });
          for (var k = 1; k < nodes.length; k++) edges.push({ from: nodes[k - 1].nodeId, to: nodes[k].nodeId, type: 'sequence' });
          fresh.nodes = nodes; fresh.edges = edges;
          setImportedLessons(function (m) { return Object.assign({}, m, imp); });
          setUnit(fresh);
          addToast((t('throughline.imported_pack') || 'Imported pack as a unit') + ' (' + nodes.length + ' ' + (t('throughline.lessons') || 'lessons') + ')', 'success');
        } catch (e) {
          addToast((t('throughline.import_failed') || 'Import failed') + ': ' + e.message, 'error');
        }
      };
      reader.onerror = function () { addToast(t('throughline.import_read_error') || 'Could not read file', 'error'); };
      reader.readAsText(file);
    }

    async function clearUnit() {
      var ok = await askThroughlineConfirmation(t('throughline.confirm_clear') || 'Clear the entire unit? This cannot be undone.', { title: 'Clear entire unit', confirmText: 'Clear unit' });
      if (!ok) return;
      setImportedLessons({});
      setUnit(emptyUnit());
      addToast(t('throughline.cleared') || 'Unit cleared', 'info');
    }

    // ── Mouse handling (drag nodes; click to connect; add empty node) ──
    function svgCoords(e) {
      var svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      var r = svg.getBoundingClientRect();
      return { x: e.clientX - r.left + (svg.parentNode ? svg.parentNode.scrollLeft : 0),
               y: e.clientY - r.top + (svg.parentNode ? svg.parentNode.scrollTop : 0) };
    }
    function onCanvasClick(e) {
      if (mode === 'addNode') {
        var p = svgCoords(e);
        var id = addNode(p.x - NODE_W / 2, p.y - NODE_H / 2, null);
        setMode('view');
        setEditingNode(id);
      }
    }
    function onCardMouseDown(e, node) {
      if (mode !== 'view') return;
      e.stopPropagation();
      var p = svgCoords(e);
      setDragging({ id: node.nodeId, ox: p.x - node.x, oy: p.y - node.y, moved: false });
    }
    function onCanvasMouseMove(e) {
      if (!dragging) return;
      var p = svgCoords(e);
      setDragging(function (d) { return d ? Object.assign({}, d, { moved: true }) : d; });
      moveNode(dragging.id, p.x - dragging.ox, p.y - dragging.oy);
    }
    function onCanvasMouseUp() { if (dragging) setDragging(null); }

    function onCardClick(e, node) {
      e.stopPropagation();
      if (dragging && dragging.moved) return;
      if (mode === 'connect') {
        if (!pendingFrom) { setPendingFrom(node.nodeId); }
        else if (pendingFrom !== node.nodeId) {
          // open the accessible inline sequence-vs-prerequisite choice (no window.confirm)
          setPendingEdge({ from: pendingFrom, to: node.nodeId });
        }
      } else if (mode === 'delete') {
        deleteNode(node.nodeId);
      }
    }

    // Resolve the pending connect-mode edge with the chosen type (accessible path).
    function resolvePendingEdge(type) {
      if (!pendingEdge) return;
      addEdge(pendingEdge.from, pendingEdge.to, type);
      setPendingEdge(null); setPendingFrom(null); setMode('view');
    }
    function cancelPendingEdge() { setPendingEdge(null); setPendingFrom(null); setMode('view'); }

    // Arrow-key roving focus across cards, following the derived teaching order so
    // keyboard users traverse the canvas in the same sequence the outline reads.
    function focusAdjacentCard(nodeId, dir) {
      var ord = deriveOutline(unit).order;
      var i = ord.indexOf(nodeId);
      if (i < 0) return;
      var j = i + dir;
      if (j < 0 || j >= ord.length) return;
      var el = cardRefs.current[ord[j]];
      if (el && el.focus) el.focus();
    }

    // A category may be a unitId (auto-set on import/seed) or a free-text strand the
    // teacher typed; show the unit's friendly name when known, else the raw label.
    function laneLabel(key) {
      if (key == null) return (t('throughline.lane_ungrouped') || 'Ungrouped');
      for (var i = 0; i < hostUnits.length; i++) { if (hostUnits[i] && hostUnits[i].id === key) return hostUnits[i].name || 'Unit'; }
      return key;
    }

    // Tidy nodes into their lane bands (keeps x = teaching order; sets y per lane).
    function arrangeIntoLanes() {
      var lanes = deriveLanes(unit);
      var idxOf = {}; lanes.forEach(function (l) { idxOf[l.key == null ? '__none' : l.key] = l.index; });
      setUnit(function (u) {
        return Object.assign({}, u, {
          nodes: u.nodes.map(function (n) {
            var key = (typeof n.category === 'string' && n.category) ? n.category : '__none';
            var li = idxOf[key] || 0;
            return Object.assign({}, n, { y: LANE_TOP + li * LANE_H + LANE_BAND_Y });
          })
        });
      });
      addToast(t('throughline.lanes_arranged') || 'Arranged into lanes', 'success');
    }

    // ── 3D view ───────────────────────────────────────────────────
    // Build an acg graph from the current unit, with each node labelled by its
    // resolved lesson title (so the 3D scene + the a11y outline read meaningfully).
    function buildGraphForView() {
      var E = window.AlloModules && window.AlloModules.ConceptGraphEngine;
      if (!E) return null;
      var g = E.fromThroughlineUnit(unit);
      g.nodes.forEach(function (n) {
        var item = resolveLesson(n.lessonId);
        n.label = item ? (item.title || typeLabel(item.type)) : (n.description || (t('throughline.planned') || 'Planned lesson'));
      });
      return g;
    }
    function open3D() {
      setShow3D(true); setCg3dState('loading');
      ensureConceptGraph().then(function (ok) {
        if (!mountedRef.current) return;
        if (!ok) { setCg3dState('error'); return; }
        setGraph3d(buildGraphForView()); setCg3dState('ready');
      });
    }
    function close3D() { setShow3D(false); setCg3dState('idle'); setGraph3d(null); setAiBusy(false); }
    // Ask Gemini to score nodes on named axes (x=sequence, y=Bloom, z=strand), then
    // re-render the 3D scene from those — so position carries real meaning.
    function arrange3DByMeaning() {
      var E = window.AlloModules && window.AlloModules.ConceptGraphEngine;
      if (!E || typeof window.callGemini !== 'function' || !graph3d) {
        addToast(t('throughline.ai_unavailable') || 'AI arrange is not available here.', 'info'); return;
      }
      setAiBusy(true);
      E.layoutWithGemini(graph3d, window.callGemini, { topic: unit.title || '', gradeLevel: '' })
        .then(function (merged) { if (mountedRef.current) { setGraph3d(merged); addToast(t('throughline.ai_arranged') || 'Arranged by meaning', 'success'); } })
        .catch(function (e) { if (mountedRef.current) addToast((t('throughline.ai_arrange_failed') || 'AI arrange failed') + ': ' + (e && e.message ? e.message : ''), 'error'); })
        .then(function () { if (mountedRef.current) setAiBusy(false); });
    }

    // ── Generate Unit engine ──────────────────────────────────────
    // The module owns the loop (one lesson at a time) so it can pace, pause for
    // review, and survive an in-flight unmount without orphaning host state. The
    // host provides only two capabilities: onProposeUnit (draft a structure) and
    // onGenerateUnitLesson (run ONE lesson through the shared blueprint engine).
    var genBaseRef = useRef(120);
    var genDialogRef = useRef(null);
    var busyRef = useRef(false);   // synchronous re-entrancy guard for propose/build/retry
    var threeDDialogRef = useRef(null);
    useEffect(function () { genRef.current = gen; }, [gen]);
    useEffect(function () {
      mountedRef.current = true;
      return function () {
        mountedRef.current = false;
        try { if (abortRef.current) abortRef.current.abort(); } catch (e) {}
        try { if (paceTimerRef.current) clearTimeout(paceTimerRef.current); } catch (e) {}
      };
    }, []);
    // Generate-Unit modal a11y: focus on open, Escape to close (confirm mid-build),
    // Tab-trap inside the dialog, restore focus on close. (WCAG 2.1.2 / 2.4.3)
    useEffect(function () {
      if (!gen) return;
      var prevFocus = (typeof document !== 'undefined') ? document.activeElement : null;
      function focusables() {
        var el = genDialogRef.current; if (!el) return [];
        return Array.prototype.slice.call(el.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'))
          .filter(function (n) { return !n.disabled && n.offsetParent !== null; });
      }
      try { var f0 = focusables(); var t0 = f0[0] || genDialogRef.current; if (t0 && t0.focus) t0.focus(); } catch (e) {}
      async function onKey(ev) {
        var el = genDialogRef.current; if (!el) return;
        if (ev.key === 'Escape') {
          ev.preventDefault();
          var g = genRef.current;
          if (g && g.phase === 'generating') { if (!await askThroughlineConfirmation(t('throughline.gen_stop_confirm') || 'Stop generating this unit? Lessons already built will stay in your canvas.', { title: 'Stop unit generation', confirmText: 'Stop generation' })) return; stopGeneration(); }
          closeGenerate(); return;
        }
        if (ev.key === 'Tab') {
          var f = focusables(); if (!f.length) return;
          var first = f[0], last = f[f.length - 1], a = document.activeElement;
          if (ev.shiftKey && (a === first || !el.contains(a))) { ev.preventDefault(); last.focus(); }
          else if (!ev.shiftKey && (a === last || !el.contains(a))) { ev.preventDefault(); first.focus(); }
        }
      }
      document.addEventListener('keydown', onKey, true);
      return function () {
        document.removeEventListener('keydown', onKey, true);
        try { if (prevFocus && prevFocus.focus) prevFocus.focus(); } catch (e) {}
      };
    }, [!!gen]);
    // 3D modal a11y: keep keyboard focus inside the immersive overlay and
    // restore it to the View in 3D trigger when the student returns to the map.
    useEffect(function () {
      if (!show3D) return;
      var prevFocus = (typeof document !== 'undefined') ? document.activeElement : null;
      function focusables3D() {
        var el = threeDDialogRef.current; if (!el) return [];
        return Array.prototype.slice.call(el.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'))
          .filter(function (n) { return !n.disabled && n.offsetParent !== null; });
      }
      try { var f0 = focusables3D(); var t0 = f0[0] || threeDDialogRef.current; if (t0 && t0.focus) t0.focus(); } catch (e) {}
      function on3DKey(ev) {
        var el = threeDDialogRef.current; if (!el) return;
        if (ev.key === 'Escape') { ev.preventDefault(); close3D(); return; }
        if (ev.key !== 'Tab') return;
        var f = focusables3D();
        if (!f.length) { ev.preventDefault(); el.focus(); return; }
        var first = f[0], last = f[f.length - 1], active = document.activeElement;
        if (ev.shiftKey && (active === first || !el.contains(active))) { ev.preventDefault(); last.focus(); }
        else if (!ev.shiftKey && (active === last || !el.contains(active))) { ev.preventDefault(); first.focus(); }
      }
      document.addEventListener('keydown', on3DKey, true);
      return function () {
        document.removeEventListener('keydown', on3DKey, true);
        try { if (prevFocus && prevFocus.focus) prevFocus.focus(); } catch (e) {}
      };
    }, [show3D]);


    function setGenMerge(patch) { setGen(function (g) { return g ? Object.assign({}, g, patch) : g; }); }
    function setLesson(idx, patch) {
      setGen(function (g) {
        if (!g || !g.results) return g;
        var results = g.results.slice();
        results[idx] = Object.assign({}, results[idx], patch);
        return Object.assign({}, g, { results: results });
      });
    }

    function openGenerate() {
      if (!canGenerate) return;
      if (inLiveSession) {
        addToast(t('throughline.gen_live_block') || 'Generate Unit is paused during a live class session. End the session before planning a new unit.', 'info');
        return;
      }
      setGen({
        phase: 'setup',
        input: { topic: unit.title || '', gradeLevel: '', standards: '', lessonCount: 4, tone: '', notes: '', sourceText: '' },
        proposal: null, results: [], cursor: -1, awaiting: -1,
        autoContinue: false, pacing: 0, busy: false, error: null
      });
    }
    function closeGenerate() {
      try { if (abortRef.current) abortRef.current.abort(); } catch (e) {}
      try { if (paceTimerRef.current) clearTimeout(paceTimerRef.current); } catch (e) {}
      decisionRef.current = null; paceResolveRef.current = null;
      busyRef.current = false;
      setGen(null);
    }
    function setInput(patch) { setGen(function (g) { return g ? Object.assign({}, g, { input: Object.assign({}, g.input, patch) }) : g; }); }

    // setup → proposing → review
    function proposeStructure() {
      var g = genRef.current; if (!g || !onProposeUnit) return;
      if (busyRef.current) return;   // re-entrancy guard (double-click → double Gemini call)
      if (!g.input.topic || !g.input.topic.trim()) { setGenMerge({ error: t('throughline.gen_need_topic') || 'Add a topic or focus for the unit first.' }); return; }
      busyRef.current = true;
      setGenMerge({ phase: 'proposing', busy: true, error: null });
      Promise.resolve().then(function () { return onProposeUnit(g.input); }).then(function (proposal) {
        busyRef.current = false;
        if (!mountedRef.current) return;
        var lessons = (proposal && Array.isArray(proposal.lessons)) ? proposal.lessons : [];
        if (!lessons.length) throw new Error(t('throughline.gen_empty') || 'no lessons returned');
        setGenMerge({ phase: 'review', busy: false, proposal: proposal, results: lessons.map(function () { return { status: 'pending', sub: null, nulls: 0, error: null, nodeId: null }; }) });
      }).catch(function (e) {
        busyRef.current = false;
        if (!mountedRef.current) return;
        setGenMerge({ phase: 'setup', busy: false, error: (t('throughline.gen_propose_failed') || 'Could not draft a structure') + ': ' + (e && e.message ? e.message : 'unknown error') });
      });
    }

    // review editors (operate on gen.proposal)
    function patchProposal(patch) { setGen(function (g) { return g ? Object.assign({}, g, { proposal: Object.assign({}, g.proposal, patch) }) : g; }); }
    function patchLessonSpec(i, patch) {
      setGen(function (g) {
        if (!g || !g.proposal) return g;
        var lessons = g.proposal.lessons.slice();
        lessons[i] = Object.assign({}, lessons[i], patch);
        return Object.assign({}, g, { proposal: Object.assign({}, g.proposal, { lessons: lessons }) });
      });
    }
    function toggleLessonType(i, type) {
      var g = genRef.current; if (!g || !g.proposal) return;
      var cur = (g.proposal.lessons[i].suggestedResourceTypes || []).slice();
      var at = cur.indexOf(type);
      if (at >= 0) cur.splice(at, 1); else if (cur.length < 6) cur.push(type);
      patchLessonSpec(i, { suggestedResourceTypes: cur });
    }
    function removeLessonSpec(i) {
      setGen(function (g) {
        if (!g || !g.proposal) return g;
        var lessons = g.proposal.lessons.slice(); lessons.splice(i, 1);
        var results = g.results.slice(); results.splice(i, 1);
        return Object.assign({}, g, { proposal: Object.assign({}, g.proposal, { lessons: lessons }), results: results });
      });
    }
    function addLessonSpec() {
      setGen(function (g) {
        if (!g || !g.proposal || g.proposal.lessons.length >= 8) return g;
        var lessons = g.proposal.lessons.concat([{ title: t('throughline.gen_new_lesson') || 'New lesson', objective: '', focus: '', suggestedResourceTypes: ['analysis', 'glossary', 'lesson-plan'], sourceStrategy: 'shared' }]);
        var results = g.results.concat([{ status: 'pending', sub: null, nulls: 0, error: null, nodeId: null }]);
        return Object.assign({}, g, { proposal: Object.assign({}, g.proposal, { lessons: lessons }), results: results });
      });
    }
    function moveLessonSpec(i, dir) {
      setGen(function (g) {
        if (!g || !g.proposal) return g;
        var j = i + dir; if (j < 0 || j >= g.proposal.lessons.length) return g;
        var lessons = g.proposal.lessons.slice(); var results = g.results.slice();
        var a = lessons[i]; lessons[i] = lessons[j]; lessons[j] = a;
        var b = results[i]; results[i] = results[j]; results[j] = b;
        return Object.assign({}, g, { proposal: Object.assign({}, g.proposal, { lessons: lessons }), results: results });
      });
    }
    function estimateCalls(proposal) {
      if (!proposal || !proposal.lessons) return 0;
      return proposal.lessons.reduce(function (s, l) { return s + (((l.suggestedResourceTypes && l.suggestedResourceTypes.length) || 0)); }, 0);
    }

    // backpressure gate + pacing
    function waitForDecision() { return new Promise(function (res) { decisionRef.current = res; }); }
    function resolveDecision(value) {
      var r = decisionRef.current; decisionRef.current = null;
      setGenMerge({ awaiting: -1 });
      if (r) r(value);
    }
    function pace(seconds) {
      return new Promise(function (resolve) {
        var remaining = seconds;
        paceResolveRef.current = resolve;
        setGenMerge({ pacing: remaining });
        function tick() {
          if (!mountedRef.current || (abortRef.current && abortRef.current.signal.aborted)) { paceResolveRef.current = null; setGenMerge({ pacing: 0 }); return resolve(); }
          remaining -= 1;
          if (remaining <= 0) { paceResolveRef.current = null; setGenMerge({ pacing: 0 }); return resolve(); }
          setGenMerge({ pacing: remaining });
          paceTimerRef.current = setTimeout(tick, 1000);
        }
        paceTimerRef.current = setTimeout(tick, 1000);
      });
    }
    function continueNow() {
      try { if (paceTimerRef.current) clearTimeout(paceTimerRef.current); } catch (e) {}
      var r = paceResolveRef.current; paceResolveRef.current = null;
      setGenMerge({ pacing: 0 });
      if (r) r();
    }
    function stopGeneration() {
      try { if (abortRef.current) abortRef.current.abort(); } catch (e) {}
      // unblock whichever gate the loop is parked on
      if (paceResolveRef.current) continueNow();
      if (decisionRef.current) resolveDecision('stop');
      else setGenMerge({ awaiting: -1 });
    }

    function placeGeneratedNode(i, lessonId, description, bundleIds, prevNodeId, category) {
      var perRow = 5, gapX = NODE_W + 50, gapY = NODE_H + 80;
      var x = 80 + (i % perRow) * gapX;
      var y = genBaseRef.current + Math.floor(i / perRow) * gapY;
      var nodeId = uid('n_');
      var node = {
        nodeId: nodeId, lessonId: lessonId || null, x: x, y: y,
        description: description || '', role: '', status: lessonId ? 'draft' : 'planned',
        category: category || null, bundledLessonIds: (bundleIds && bundleIds.length) ? bundleIds.slice() : undefined
      };
      setUnit(function (u) {
        var nodes = u.nodes.concat([node]);
        // only chain a sequence edge when the predecessor still exists — regenerate
        // deletes-then-rebuilds the node at this index, which would otherwise dangle
        var canChain = prevNodeId && u.nodes.some(function (nn) { return nn.nodeId === prevNodeId; });
        var edges = canChain ? u.edges.concat([{ from: prevNodeId, to: nodeId, type: 'sequence' }]) : u.edges;
        return Object.assign({}, u, { nodes: nodes, edges: edges });
      });
      return nodeId;
    }

    function startGeneration() {
      var g = genRef.current; if (!g || !g.proposal) return;
      if (busyRef.current || g.phase === 'generating') return;   // re-entrancy guard (double-click)
      busyRef.current = true;
      if (!unit.title && g.proposal.title) patchUnit({ title: g.proposal.title });
      if (!unit.essentialQuestion && g.proposal.essentialQuestion) patchUnit({ essentialQuestion: g.proposal.essentialQuestion });
      var maxY = 0; unit.nodes.forEach(function (n) { if (n.y > maxY) maxY = n.y; });
      genBaseRef.current = unit.nodes.length ? (maxY + NODE_H + 100) : 120;
      abortRef.current = (typeof AbortController !== 'undefined')
        ? new AbortController()
        : { abort: function () {}, signal: { aborted: false, addEventListener: function () {} } };
      setGenMerge({ phase: 'generating', cursor: 0, error: null });
      runGeneration();
    }
    // rebuild only the lessons that failed or came back empty; keep the rest in place
    function retryFailed() {
      var g = genRef.current; if (!g || !g.proposal) return;
      if (busyRef.current) return;
      if (!(g.results || []).some(function (r) { return r && (r.status === 'error' || r.status === 'empty'); })) return;
      busyRef.current = true;
      abortRef.current = (typeof AbortController !== 'undefined') ? new AbortController() : { abort: function () {}, signal: { aborted: false, addEventListener: function () {} } };
      setGenMerge({ phase: 'generating', cursor: 0, awaiting: -1, error: null });
      runGeneration(true);
    }

    function runGeneration(retryOnly) {
      var g = genRef.current; if (!g || !g.proposal) return;
      var lessons = g.proposal.lessons;
      var dna = {
        grade: g.proposal.gradeBand || g.input.gradeLevel || '',
        topic: g.proposal.title || g.input.topic || '',
        standard: g.input.standards || '',
        concepts: (Array.isArray(g.proposal.goldenThread) ? g.proposal.goldenThread : []).map(function (s) { return String(s).trim(); }).filter(Boolean),
        keyTerms: (Array.isArray(g.proposal.keyTerms) ? g.proposal.keyTerms : []).map(function (s) { return String(s).trim(); }).filter(Boolean),
        desiredResults: (Array.isArray(g.proposal.desiredResults) ? g.proposal.desiredResults : []).map(function (s) { return String(s).trim(); }).filter(Boolean),
        essentialQuestion: g.proposal.essentialQuestion || '',
        sourceConfig: (g.proposal.sourceConfig && typeof g.proposal.sourceConfig === 'object') ? g.proposal.sourceConfig : null
      };
      var prevNodeId = null;
      var i = 0;

      function finish() {
        busyRef.current = false;
        if (!mountedRef.current) return;
        setGenMerge({ phase: 'done', cursor: -1, awaiting: -1, pacing: 0 });
      }
      function aborted() { return !mountedRef.current || (abortRef.current && abortRef.current.signal.aborted); }
      // most recent placed node before index k (skips skipped/errored lessons that left no node)
      function anchorBefore(k) { for (var j = k - 1; j >= 0; j--) { var pid = genRef.current.results[j] && genRef.current.results[j].nodeId; if (pid) return pid; } return null; }

      function step() {
        if (aborted() || i >= lessons.length) return finish();
        var idx = i;
        // retry mode: keep already-built/skipped lessons; only rebuild error/empty/pending
        if (retryOnly) {
          var rs = (genRef.current.results[idx] || {}).status;
          if (rs === 'done' || rs === 'skipped') {
            var keep = genRef.current.results[idx] && genRef.current.results[idx].nodeId;
            if (keep) prevNodeId = keep;
            i = idx + 1; return step();
          }
        }
        // regenerate cleanup: drop the node a prior attempt at this index made
        var prior = genRef.current.results[idx] && genRef.current.results[idx].nodeId;
        if (prior) {
          setUnit(function (u) {
            return Object.assign({}, u, {
              nodes: u.nodes.filter(function (n) { return n.nodeId !== prior; }),
              edges: u.edges.filter(function (e) { return e.from !== prior && e.to !== prior; })
            });
          });
        }
        var spec = genRef.current.proposal.lessons[idx]; // latest (user may have edited)
        var total = (spec.suggestedResourceTypes && spec.suggestedResourceTypes.length) || 0;
        var prog = { done: 0 };
        setGenMerge({ cursor: idx });
        setLesson(idx, { status: 'running', sub: null, error: null, nodeId: null });

        onGenerateUnitLesson(spec, dna, {
          signal: abortRef.current.signal,
          onResource: function (type) {
            if (!mountedRef.current) return;
            prog.done += 1;
            setLesson(idx, { sub: { type: type, done: prog.done, total: total } });
          }
        }).then(function (res) {
          if (!mountedRef.current) return;
          dna = (res && res.dnaOut) || dna;
          var items = (res && Array.isArray(res.items)) ? res.items.filter(Boolean) : [];
          if (items.length) {
            setImportedLessons(function (m) { var n = Object.assign({}, m); items.forEach(function (it) { if (it && it.id) n[it.id] = it; }); return n; });
          }
          var anchor = (res && res.anchorItem) || (items.length ? items[items.length - 1] : null);
          var bundleIds = items.map(function (it) { return it && it.id; }).filter(Boolean);
          var nodeId = placeGeneratedNode(idx, anchor ? anchor.id : null, spec.objective || spec.focus || '', bundleIds, prevNodeId, unit.sourceUnitId || null);
          prevNodeId = nodeId;
          var nullCount = (res && Array.isArray(res.nulls)) ? res.nulls.length : 0;
          setLesson(idx, { status: anchor ? 'done' : 'empty', sub: null, nulls: nullCount, nodeId: nodeId, count: items.length });
          afterLesson(idx);
        }).catch(function (e) {
          if (!mountedRef.current) return;
          if (aborted()) return finish();
          setLesson(idx, { status: 'error', sub: null, error: (e && e.message) ? e.message : 'generation failed' });
          afterLesson(idx);
        });
      }

      function afterLesson(idx) {
        if (aborted()) return finish();
        var isLast = idx >= lessons.length - 1;
        var _st = (genRef.current.results[idx] || {}).status;
        // even in auto mode, stop at the gate on a failed/empty lesson so the teacher can retry or skip
        if (genRef.current.autoContinue && _st !== 'error' && _st !== 'empty') {
          i = idx + 1;
          if (isLast) return finish();
          var s0 = (i % BREATHER_EVERY === 0) ? BREATHER_SECONDS : PACE_SECONDS;
          pace(s0).then(step);
          return;
        }
        setGenMerge({ awaiting: idx });
        waitForDecision().then(function (decision) {
          if (!mountedRef.current) return;
          if (decision === 'stop') return finish();
          if (decision === 'regenerate') { prevNodeId = anchorBefore(idx); i = idx; return step(); }   // re-chain off the predecessor, not the node step() deletes
          if (decision === 'skip') {
            // discard this lesson's node (if one was built) and bypass it in the sequence
            var skipNode = genRef.current.results[idx] && genRef.current.results[idx].nodeId;
            if (skipNode) setUnit(function (u) { return Object.assign({}, u, { nodes: u.nodes.filter(function (n) { return n.nodeId !== skipNode; }), edges: u.edges.filter(function (e) { return e.from !== skipNode && e.to !== skipNode; }) }); });
            setLesson(idx, { status: 'skipped', nodeId: null });
            prevNodeId = anchorBefore(idx);
            i = idx + 1; if (isLast) return finish(); return pace(PACE_SECONDS).then(step);
          }
          // accept
          i = idx + 1;
          if (isLast) return finish();
          var s1 = (i % BREATHER_EVERY === 0) ? BREATHER_SECONDS : PACE_SECONDS;
          pace(s1).then(step);
        });
      }

      step();
    }

    // ── Render ────────────────────────────────────────────────────
    if (!isOpen) return null;

    var nodeById = {};
    unit.nodes.forEach(function (n) { nodeById[n.nodeId] = n; });

    // edges in SVG
    var edgeEls = unit.edges.map(function (e, i) {
      var a = nodeById[e.from], b = nodeById[e.to];
      if (!a || !b) return null;
      var ax = a.x + NODE_W / 2, ay = a.y + NODE_H / 2, bx = b.x + NODE_W / 2, by = b.y + NODE_H / 2;
      var st = EDGE_STYLES[e.type] || EDGE_STYLES.sequence;
      return h('line', {
        key: 'e' + i, x1: ax, y1: ay, x2: bx, y2: by,
        stroke: st.stroke, strokeWidth: 2, strokeDasharray: st.dash || undefined,
        markerEnd: 'url(#tl-arrow)'
      });
    });

    // node cards in HTML overlay
    var cardEls = unit.nodes.map(function (n) {
      var item = resolveLesson(n.lessonId);
      var missing = n.lessonId && !item;
      var unsupported = item && !RENDERABLE_TYPES[item.type];
      var planned = !n.lessonId;
      var pendingThis = pendingFrom === n.nodeId;
      var border = pendingThis ? '#d97706' : (planned ? '#cbd5e1' : '#475569');
      var bg = pendingThis ? '#fffbeb' : '#ffffff';
      // keyboard summary + ops so the canvas is operable without a mouse (WCAG 2.1.1)
      var laneSuffix = (showLanes && typeof n.category === 'string' && n.category)
        ? (' ' + (t('throughline.lane_label_short') || 'Lane') + ': ' + laneLabel(n.category) + '.') : '';
      var cardAria = (planned
        ? ((t('throughline.empty_node') || 'Attach a lesson') + (n.description ? ': ' + n.description : '') + '. ' + (t('throughline.aria_planned_hint') || 'Press Enter to attach a lesson, E to edit, Delete to remove. Arrow keys move between lessons.'))
        : ((item ? (typeLabel(item.type) + ': ' + (item.title || typeLabel(item.type))) : (t('throughline.lesson_missing_short') || 'Lesson missing')) + '. ' + (t('throughline.aria_lesson_hint') || 'Press Enter to open, E to edit, Delete to remove. Arrow keys move between lessons.'))) + laneSuffix;
      return h('div', {
        key: n.nodeId,
        ref: function (el) { if (el) cardRefs.current[n.nodeId] = el; else delete cardRefs.current[n.nodeId]; },
        tabIndex: 0,
        role: 'group',
        'aria-label': cardAria,
        onMouseDown: function (e) { onCardMouseDown(e, n); },
        onClick: function (e) { onCardClick(e, n); },
        onKeyDown: function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            if (!planned && !missing && onOpenLesson) { e.preventDefault(); openNodeLesson(n); }
            else if (planned && hostHistory.length) { e.preventDefault(); setPickerForNode(n.nodeId); }
          } else if (e.key === 'e' || e.key === 'E' || e.key === 'F2') { e.preventDefault(); setEditingNode(n.nodeId); }
          else if (e.key === 'Delete') { e.preventDefault(); deleteNode(n.nodeId); }
          else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); focusAdjacentCard(n.nodeId, 1); }
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); focusAdjacentCard(n.nodeId, -1); }
        },
        style: {
          position: 'absolute', left: n.x, top: n.y, width: NODE_W, minHeight: NODE_H,
          background: bg, border: '2px ' + (planned ? 'dashed' : 'solid') + ' ' + border,
          borderRadius: 12, boxShadow: '0 1px 4px rgba(15,23,42,0.10)', padding: 10,
          cursor: mode === 'view' ? 'grab' : (mode === 'delete' ? 'not-allowed' : 'pointer'),
          fontSize: 12, color: '#1e293b', boxSizing: 'border-box', userSelect: 'none'
        }
      },
        planned
          ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', textAlign: 'center', paddingTop: 6 } },
              h('div', { style: { fontSize: 20, color: '#94a3b8' } }, '➕'),
              h('div', { style: { fontWeight: 700, color: '#64748b' } }, t('throughline.empty_node') || 'Attach a lesson'),
              n.description && h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, n.description)
            )
          : h('div', null,
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 } },
                h('span', { style: { fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' } },
                  typeIcon(item ? item.type : null) + ' ' + (item ? typeLabel(item.type) : (missing ? (t('throughline.missing') || 'missing') : 'lesson'))),
                missing && h('span', { title: t('throughline.lesson_missing') || 'Lesson not present in this unit', style: { fontSize: 11 } }, '⚠️')
              ),
              h('div', { style: { fontWeight: 700, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                item ? (item.title || typeLabel(item.type)) : (t('throughline.lesson_missing_short') || 'Lesson missing')),
              n.description && h('div', { style: { fontSize: 11, color: '#64748b', fontStyle: 'italic', marginBottom: 3, maxHeight: 30, overflow: 'hidden' } }, n.description),
              item && item.meta && h('div', { style: { fontSize: 10, color: '#94a3b8', marginBottom: 4 } }, item.meta),
              h('div', { style: { display: 'flex', gap: 6, marginTop: 4 } },
                h('button', {
                  onClick: function (e) { e.stopPropagation(); openNodeLesson(n); },
                  disabled: missing || !onOpenLesson,
                  title: unsupported ? (t('throughline.type_unsupported') || 'This lesson type may not open cleanly in this version') : '',
                  style: {
                    flex: 1, fontSize: 11, fontWeight: 700, padding: '4px 6px', borderRadius: 6,
                    border: '1px solid ' + (missing || !onOpenLesson ? '#e2e8f0' : '#6366f1'),
                    background: missing || !onOpenLesson ? '#f1f5f9' : '#eef2ff',
                    color: missing || !onOpenLesson ? '#94a3b8' : '#4338ca',
                    cursor: missing || !onOpenLesson ? 'not-allowed' : 'pointer'
                  }
                }, (t('throughline.open_lesson') || 'Open') + ' ↗' + (unsupported ? ' ?' : '')),
                h('button', {
                  onClick: function (e) { e.stopPropagation(); setEditingNode(n.nodeId); },
                  style: { fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer' }
                }, t('throughline.edit') || 'Edit')
              )
            )
      );
    });

    var outline = deriveOutline(unit);
    var lanes = deriveLanes(unit);

    // header bar
    var topBar = h('div', { style: { background: '#fff', borderBottom: '1px solid #cbd5e1', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 12 } },
      h('span', { style: { fontSize: 22 }, 'aria-hidden': 'true' }, '🧭'),
      h('div', { style: { flex: 1 } },
        h('div', { style: { fontSize: 15, fontWeight: 800, color: '#1e293b', cursor: 'pointer' }, onClick: function () { setEditingHeader(true); } },
          unit.title || (t('throughline.untitled_unit') || 'Untitled unit') + ' ✎'),
        h('div', { style: { fontSize: 11, color: '#64748b' } },
          unit.essentialQuestion
            ? ('“' + unit.essentialQuestion + '”')
            : (t('throughline.set_eq') || 'Click the title to set an essential question'))
      ),
      h('div', { style: { fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' } },
        unit.nodes.length + ' ' + (t('throughline.nodes') || 'nodes') + ' · ' + unit.edges.length + ' ' + (t('throughline.links') || 'links')),
      h('button', { onClick: onClose, 'aria-label': t('common.close') || 'Close',
        style: { padding: 8, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: '#475569' } }, '✕')
    );

    function tbBtn(label, active, onClick, title) {
      return h('button', {
        onClick: onClick, title: title || label, 'aria-pressed': !!active,
        style: {
          padding: '6px 11px', borderRadius: 8, fontSize: 12, fontWeight: 700,
          border: '1px solid ' + (active ? '#4338ca' : '#cbd5e1'),
          background: active ? '#4f46e5' : '#fff', color: active ? '#fff' : '#334155', cursor: 'pointer'
        }
      }, label);
    }

    var toolbar = h('div', { style: { background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '8px 18px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
      canGenerate && h('button', {
        onClick: openGenerate,
        disabled: inLiveSession,
        title: inLiveSession ? (t('throughline.gen_live_block') || 'Disabled during a live class session') : (t('throughline.gen_btn_title') || 'Draft a multi-lesson unit with AI, then review each lesson as it is built'),
        style: {
          padding: '6px 13px', borderRadius: 8, fontSize: 12, fontWeight: 800,
          border: '1px solid ' + (inLiveSession ? '#e2e8f0' : '#7c3aed'),
          background: inLiveSession ? '#f1f5f9' : 'linear-gradient(90deg,#7c3aed,#4f46e5)',
          color: inLiveSession ? '#94a3b8' : '#fff', cursor: inLiveSession ? 'not-allowed' : 'pointer'
        }
      }, '✨ ' + (t('throughline.gen_btn') || 'Generate unit')),
      canGenerate && h('div', { style: { width: 1, height: 20, background: '#cbd5e1', margin: '0 2px' } }),
      tbBtn('➕ ' + (t('throughline.add_node') || 'Add node'), mode === 'addNode', function () { setMode(mode === 'addNode' ? 'view' : 'addNode'); setPendingFrom(null); setPendingEdge(null); }),
      tbBtn('🔗 ' + (t('throughline.connect') || 'Connect'), mode === 'connect', function () { setMode(mode === 'connect' ? 'view' : 'connect'); setPendingFrom(null); setPendingEdge(null); }),
      tbBtn('🗑 ' + (t('throughline.delete') || 'Delete'), mode === 'delete', function () { setMode(mode === 'delete' ? 'view' : 'delete'); setPendingFrom(null); setPendingEdge(null); }),
      h('div', { style: { width: 1, height: 20, background: '#cbd5e1', margin: '0 2px' } }),
      (hostHistory.length > 0) && tbBtn('📥 ' + (t('throughline.add_lessons') || 'Add my lessons'), false, function () { setPickerForNode('BULK'); }, t('throughline.add_lessons_title') || 'Add lessons from your history into this unit'),
      tbBtn('🧾 ' + (t('throughline.outline') || 'Outline'), showOutline, function () { setShowOutline(!showOutline); }, t('throughline.outline_title') || 'Printable scope & sequence'),
      tbBtn('🛤 ' + (t('throughline.lanes') || 'Lanes'), showLanes, function () { setShowLanes(!showLanes); }, t('throughline.lanes_title') || 'Group lessons into strands / phases (swim-lanes)'),
      showLanes && tbBtn('↕ ' + (t('throughline.arrange_lanes') || 'Arrange into lanes'), false, arrangeIntoLanes, t('throughline.arrange_lanes_title') || 'Tidy each lesson into its lane band (keeps left-to-right teaching order)'),
      (unit.nodes.length > 0) && tbBtn('🧊 ' + (t('throughline.view_3d') || 'View in 3D'), show3D, open3D, t('throughline.view_3d_title') || 'See this unit as an orbitable 3D concept map (strands become depth)'),
      h('div', { style: { width: 1, height: 20, background: '#cbd5e1', margin: '0 2px' } }),
      tbBtn('💾 ' + (t('throughline.export') || 'Export unit'), false, exportUnit, t('throughline.export_title') || 'Download this unit as one file'),
      tbBtn('📂 ' + (t('throughline.import') || 'Import'), false, function () { if (fileInputRef.current) fileInputRef.current.click(); }, t('throughline.import_title') || 'Open a unit or lesson-pack file'),
      h('input', { ref: fileInputRef, type: 'file', accept: 'application/json,.json', style: { display: 'none' },
        'aria-label': t('throughline.import_title') || 'Import unit file',
        onChange: function (e) { var f = e.target && e.target.files && e.target.files[0]; if (f) importFile(f); if (e.target) e.target.value = ''; } }),
      h('div', { style: { flex: 1 } }),
      tbBtn(t('throughline.clear') || 'Clear', false, clearUnit)
    );

    var hint = h('div', { style: { background: '#fffbeb', borderBottom: '1px solid #fde68a', padding: '5px 18px', fontSize: 11, color: '#92400e', fontStyle: 'italic' } },
      mode === 'addNode' ? (t('throughline.hint_add') || 'Click the canvas to drop an empty/planned node, then attach a lesson to it.')
      : mode === 'connect' ? (pendingFrom ? (t('throughline.hint_connect2') || 'Click a second node. You will choose sequence vs prerequisite.') : (t('throughline.hint_connect1') || 'Click the first node of the connection.'))
      : mode === 'delete' ? (t('throughline.hint_delete') || 'Click a node to remove it from the unit (the lesson itself is not deleted).')
      : (t('throughline.hint_view') || 'Left-to-right reads as teaching order. Drag to arrange, click a node to edit, Open to launch the lesson. The exported file is the durable copy.')
    );

    // Accessible inline replacement for the old window.confirm in connect mode:
    // a focusable choice bar (Escape cancels) so the sequence-vs-prerequisite
    // decision is operable by keyboard / screen reader.
    var connectChoice = pendingEdge && h('div', {
      role: 'dialog', 'aria-label': t('throughline.edge_choose_aria') || 'Choose how to connect these two lessons',
      onKeyDown: function (e) { if (e.key === 'Escape') { e.preventDefault(); cancelPendingEdge(); } },
      style: { background: '#eef2ff', borderBottom: '1px solid #c7d2fe', padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
    },
      h('span', { style: { fontSize: 12, fontWeight: 800, color: '#3730a3' } }, t('throughline.edge_choose') || 'Connect these lessons as:'),
      h('button', { autoFocus: true, onClick: function () { resolvePendingEdge('sequence'); },
        style: { fontSize: 12, fontWeight: 800, padding: '5px 12px', borderRadius: 7, border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer' } },
        '→ ' + (t('throughline.edge_sequence') || 'Teach next (sequence)')),
      h('button', { onClick: function () { resolvePendingEdge('prerequisite'); },
        style: { fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 7, border: '1px solid #d97706', background: '#fff', color: '#b45309', cursor: 'pointer' } },
        '⛔ ' + (t('throughline.edge_prereq') || 'Prerequisite gate')),
      h('button', { onClick: cancelPendingEdge,
        style: { fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 7, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer' } },
        t('common.cancel') || 'Cancel')
    );

    var quotaNudge = quotaFailed && h('div', { style: { background: '#fef2f2', borderBottom: '1px solid #fecaca', padding: '6px 18px', fontSize: 11, color: '#991b1b', fontWeight: 700 } },
      '⚠️ ' + (t('throughline.quota_fail') || 'This unit could not be auto-saved to the browser. Export it to a file now so you do not lose your work.'));

    var canvas = h('div', { style: { flex: 1, position: 'relative', overflow: 'auto', background: '#ffffff' } },
      h('svg', {
        ref: svgRef, width: CANVAS_W, height: CANVAS_H,
        onClick: onCanvasClick, onMouseMove: onCanvasMouseMove, onMouseUp: onCanvasMouseUp, onMouseLeave: onCanvasMouseUp,
        style: { display: 'block', position: 'absolute', top: 0, left: 0, cursor: mode === 'addNode' ? 'crosshair' : 'default' },
        'aria-label': t('throughline.canvas_aria') || 'Unit canvas: lessons connected left-to-right by teaching order'
      },
        h('defs', null,
          h('marker', { id: 'tl-arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' },
            h('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#64748b' })),
          h('pattern', { id: 'tl-grid', width: 28, height: 28, patternUnits: 'userSpaceOnUse' },
            h('path', { d: 'M 28 0 L 0 0 0 28', fill: 'none', stroke: '#f1f5f9', strokeWidth: 1 }))
        ),
        h('rect', { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H, fill: 'url(#tl-grid)' }),
        // swim-lane bands (the 2nd meaningful axis; also the depth planes a 3D view stacks)
        showLanes && lanes.map(function (lane, i) {
          var y = LANE_TOP + lane.index * LANE_H;
          return h('g', { key: 'lane' + i, 'aria-hidden': 'true' },
            h('rect', { x: 0, y: y, width: CANVAS_W, height: LANE_H, fill: LANE_TINTS[i % 2], opacity: 0.7, stroke: '#e2e8f0', strokeWidth: 1 }),
            h('text', { x: 14, y: y + 22, fontSize: 13, fontWeight: 700, fill: '#64748b' }, laneLabel(lane.key))
          );
        }),
        edgeEls
      ),
      // HTML card overlay (same scroll container, reads same x/y as edges)
      h('div', { style: { position: 'absolute', top: 0, left: 0, width: CANVAS_W, height: CANVAS_H, pointerEvents: 'none' } },
        h('div', { style: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'auto' } }, cardEls)
      ),
      // empty state
      unit.nodes.length === 0 && h('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' } },
        h('span', { style: { fontSize: 52, marginBottom: 10 }, 'aria-hidden': 'true' }, '🧭'),
        h('div', { style: { fontSize: 17, fontWeight: 800, color: '#334155', marginBottom: 4 } }, t('throughline.empty_title') || 'Start a unit'),
        h('div', { style: { fontSize: 13, color: '#64748b', maxWidth: 460, textAlign: 'center', lineHeight: 1.5 } },
          hostHistory.length > 0
            ? (t('throughline.empty_hint_host') || 'Click "Add my lessons" to pull your saved lessons in, or "Add node" to block out a unit before the lessons exist.')
            : (t('throughline.empty_hint_manual') || 'Click "Import" to open a lesson-pack file and arrange it into a unit, or "Add node" to start planning from scratch.'))
      )
    );

    // ── Outline panel (derived scope & sequence) ──────────────────
    var outlinePanel = showOutline && h('div', { style: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 340, background: '#fff', borderLeft: '1px solid #cbd5e1', boxShadow: '-4px 0 12px rgba(15,23,42,0.06)', display: 'flex', flexDirection: 'column', zIndex: 5 } },
      h('div', { style: { padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
        h('div', { style: { fontWeight: 800, fontSize: 13, color: '#1e293b' } }, t('throughline.outline') || 'Unit Outline'),
        h('button', { onClick: function () { setShowOutline(false); }, style: { border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16, color: '#64748b' } }, '✕')
      ),
      outline.hasCycle && h('div', { style: { padding: '8px 16px', fontSize: 11, color: '#92400e', background: '#fffbeb' } },
        '⚠️ ' + (t('throughline.cycle_warn') || 'This unit has a loop, so the sequence is ambiguous here. Showing left-to-right order instead.')),
      h('div', { style: { flex: 1, overflow: 'auto', padding: '8px 0' } },
        outline.order.map(function (nid, i) {
          var n = nodeById[nid]; if (!n) return null;
          var item = resolveLesson(n.lessonId);
          var prereqFor = unit.edges.filter(function (e) { return e.from === nid && e.type === 'prerequisite'; }).length;
          var needsPrereq = unit.edges.filter(function (e) { return e.to === nid && e.type === 'prerequisite'; });
          return h('div', { key: nid, tabIndex: 0, role: 'button',
            'aria-label': (i + 1) + '. ' + (item ? (item.title || typeLabel(item.type)) : (t('throughline.planned') || 'Planned lesson')) + '. ' + (t('throughline.outline_row_hint') || 'Press Enter to focus this lesson on the canvas.'),
            onClick: function () { var el = cardRefs.current[nid]; if (el && el.focus) el.focus(); },
            onKeyDown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); var el = cardRefs.current[nid]; if (el && el.focus) el.focus(); } },
            style: { padding: '6px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 12, cursor: 'pointer' } },
            h('div', { style: { display: 'flex', gap: 8 } },
              h('span', { style: { fontWeight: 800, color: '#6366f1', minWidth: 18 } }, (i + 1) + '.'),
              h('div', { style: { flex: 1 } },
                h('div', { style: { fontWeight: 600, color: '#1e293b' } },
                  (item ? (item.title || typeLabel(item.type)) : (t('throughline.planned') || 'Planned lesson'))),
                h('div', { style: { fontSize: 10, color: '#94a3b8' } },
                  (item ? typeIcon(item.type) + ' ' + typeLabel(item.type) : '➕ ' + (t('throughline.planned') || 'planned')) +
                  (prereqFor ? '  · ' + (t('throughline.prereq_for') || 'prereq for') + ' ' + prereqFor : '')),
                needsPrereq.length > 0 && h('div', { style: { fontSize: 10, color: '#b45309' } },
                  '⚠ ' + (t('throughline.needs_prereq') || 'needs a prerequisite mastered first'))
              )
            )
          );
        })
      ),
      h('div', { style: { padding: 12, borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8 } },
        h('button', { onClick: function () { try { window.print(); } catch (e) {} },
          style: { flex: 1, padding: '7px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', color: '#334155' } },
          '🖨 ' + (t('throughline.print') || 'Print')),
        h('button', { onClick: function () {
            var txt = 'UNIT OUTLINE — ' + (unit.title || 'Untitled') + (unit.essentialQuestion ? ' (“' + unit.essentialQuestion + '”)' : '') + '\n\n' +
              outline.order.map(function (nid, i) { var n = nodeById[nid]; var it = n && resolveLesson(n.lessonId); return (i + 1) + '. ' + (it ? (it.title || typeLabel(it.type)) : 'Planned lesson') + (it ? '  [' + typeLabel(it.type) + ']' : ''); }).join('\n');
            try { navigator.clipboard.writeText(txt); addToast(t('throughline.copied') || 'Outline copied', 'success'); } catch (e) { addToast(t('throughline.copy_failed') || 'Copy failed', 'error'); }
          },
          style: { flex: 1, padding: '7px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', color: '#334155' } },
          '📋 ' + (t('throughline.copy') || 'Copy'))
      )
    );

    // ── Picker modal (pick-from-history for a node, or BULK add) ───
    var pickerModal = pickerForNode && h('div', {
      style: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' },
      onClick: function (e) { if (e.target === e.currentTarget) { setPickerForNode(null); setPickerQuery(''); } }
    },
      h('div', { style: { background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '78vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' } },
        h('div', { style: { padding: '14px 18px', borderBottom: '1px solid #e2e8f0' } },
          h('div', { style: { fontWeight: 800, fontSize: 14, color: '#1e293b', marginBottom: 8 } },
            pickerForNode === 'BULK' ? (t('throughline.add_lessons') || 'Add lessons to this unit') : (t('throughline.pick_lesson') || 'Pick a lesson for this node')),
          h('input', { autoFocus: true, value: pickerQuery, onChange: function (e) { setPickerQuery(e.target.value); },
            'aria-label': t('throughline.search_lessons') || 'Search your lessons',
            placeholder: t('throughline.search_lessons') || 'Search your lessons…',
            style: { width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' } })
        ),
        h('div', { style: { flex: 1, overflow: 'auto' } },
          (function () {
            var q = pickerQuery.trim().toLowerCase();
            var list = hostHistory.filter(function (it) {
              if (!it || !it.id) return false;
              if (!q) return true;
              return (String(it.title || '') + ' ' + String(it.type || '') + ' ' + String(it.meta || '')).toLowerCase().indexOf(q) >= 0;
            });
            if (list.length === 0) return h('div', { style: { padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 } }, t('throughline.no_lessons') || 'No matching lessons in your history.');
            return list.map(function (it) {
              return h('button', {
                key: it.id,
                onClick: function () {
                  if (pickerForNode === 'BULK') { bulkAddLessons([it]); }
                  else { pickFromHistoryToNode(pickerForNode, it); }
                },
                style: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '9px 16px', border: 'none', borderBottom: '1px solid #f1f5f9', background: '#fff', cursor: 'pointer', fontSize: 13 }
              },
                h('span', { style: { fontSize: 18 } }, typeIcon(it.type)),
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, it.title || typeLabel(it.type)),
                  h('div', { style: { fontSize: 11, color: '#94a3b8' } }, typeLabel(it.type) + (it.meta ? ' · ' + it.meta : '')))
              );
            });
          })()
        ),
        pickerForNode === 'BULK' && hostHistory.length > 0 && h('div', { style: { padding: 12, borderTop: '1px solid #e2e8f0' } },
          // Unit-grouped quick-adds (the existing item.unitId folders).
          hostUnits.length > 0 && (function () {
            var withCounts = hostUnits.map(function (u) {
              var n = hostHistory.filter(function (it) { return it && it.unitId === u.id; }).length;
              return { id: u.id, name: u.name, n: n };
            }).filter(function (u) { return u.n > 0; });
            if (!withCounts.length) return null;
            return h('div', { style: { marginBottom: 10 } },
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }, t('throughline.add_from_unit') || 'Add a whole unit'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                withCounts.map(function (u) {
                  return h('button', { key: u.id,
                    onClick: function () { bulkAddLessons(hostHistory.filter(function (it) { return it && it.unitId === u.id; })); setPickerForNode(null); setPickerQuery(''); },
                    style: { fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 999, border: '1px solid #c7d2fe', background: '#eef2ff', color: '#4338ca', cursor: 'pointer' } },
                    '📁 ' + u.name + ' (' + u.n + ')');
                })
              )
            );
          })(),
          h('button', { onClick: function () { bulkAddLessons(hostHistory.slice()); setPickerForNode(null); setPickerQuery(''); },
            style: { width: '100%', padding: 9, borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' } },
            (t('throughline.add_all') || 'Add all') + ' ' + hostHistory.length + ' ' + (t('throughline.lessons') || 'lessons'))
        ),
        h('div', { style: { padding: 10, borderTop: '1px solid #e2e8f0', textAlign: 'right' } },
          h('button', { onClick: function () { setPickerForNode(null); setPickerQuery(''); },
            style: { padding: '6px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#475569' } }, t('common.close') || 'Close'))
      )
    );

    // ── Node edit modal (description + attach) ────────────────────
    var editNode = editingNode ? nodeById[editingNode] : null;
    var editModal = editNode && h('div', {
      style: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' },
      onClick: function (e) { if (e.target === e.currentTarget) setEditingNode(null); }
    },
      h('div', { style: { background: '#fff', borderRadius: 14, width: '100%', maxWidth: 440, padding: 18 } },
        h('div', { style: { fontWeight: 800, fontSize: 14, color: '#1e293b', marginBottom: 10 } }, t('throughline.edit_node') || 'Edit node'),
        h('label', { htmlFor: 'tl-node-description', style: { fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 } }, t('throughline.description_label') || 'Why this lesson lives here (description)'),
        h('textarea', {
          id: 'tl-node-description', value: editNode.description || '', rows: 3,
          onChange: function (e) { setNodeFields(editNode.nodeId, { description: e.target.value }); },
          placeholder: t('throughline.description_ph') || 'e.g. Hook — surfaces prior knowledge. Gates the exit ticket.',
          style: { width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }
        }),
        h('label', { htmlFor: 'tl-node-lane', style: { fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', margin: '12px 0 4px' } },
          t('throughline.lane_label') || 'Lane / strand (groups this lesson — UbD phase, UDL mode, content strand…)'),
        h('input', { id: 'tl-node-lane', value: (typeof editNode.category === 'string' ? editNode.category : ''), list: 'tl-lane-list',
          onChange: function (e) { var v = (e.target.value || '').trim(); setNodeFields(editNode.nodeId, { category: v || null }); },
          placeholder: t('throughline.lane_ph') || 'e.g. Acquire · Make-Meaning · Transfer',
          style: { width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' } }),
        h('datalist', { id: 'tl-lane-list' }, lanes.filter(function (l) { return l.key != null; }).map(function (l) { return h('option', { key: l.key, value: l.key }); })),
        h('div', { style: { marginTop: 12, padding: 10, background: '#f8fafc', borderRadius: 8 } },
          h('div', { style: { fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 } }, t('throughline.lesson_label') || 'Lesson'),
          editNode.lessonId && resolveLesson(editNode.lessonId)
            ? h('div', { style: { fontSize: 12, color: '#1e293b' } }, typeIcon(resolveLesson(editNode.lessonId).type) + ' ' + (resolveLesson(editNode.lessonId).title || typeLabel(resolveLesson(editNode.lessonId).type)))
            : h('div', { style: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' } }, t('throughline.no_lesson_attached') || 'No lesson attached yet'),
          h('div', { style: { display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' } },
            currentLesson && h('button', { onClick: function () { attachCurrentToNode(editNode.nodeId); },
              style: { fontSize: 12, fontWeight: 700, padding: '6px 10px', borderRadius: 7, border: '1px solid #6366f1', background: '#eef2ff', color: '#4338ca', cursor: 'pointer' } },
              t('throughline.attach_current') || 'Attach current lesson'),
            hostHistory.length > 0 && h('button', { onClick: function () { setEditingNode(null); setPickerForNode(editNode.nodeId); },
              style: { fontSize: 12, fontWeight: 700, padding: '6px 10px', borderRadius: 7, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer' } },
              t('throughline.pick_from_history') || 'Pick from history'),
            editNode.lessonId && h('button', { onClick: function () { setNodeFields(editNode.nodeId, { lessonId: null, status: 'planned' }); },
              style: { fontSize: 12, padding: '6px 10px', borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', cursor: 'pointer' } },
              t('throughline.detach') || 'Detach')
          )
        ),
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 } },
          h('button', { onClick: function () { deleteNode(editNode.nodeId); setEditingNode(null); },
            style: { padding: '7px 12px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff', color: '#b91c1c', fontSize: 13, cursor: 'pointer' } }, t('throughline.remove_node') || 'Remove node'),
          h('button', { onClick: function () { setEditingNode(null); },
            style: { padding: '7px 14px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' } }, t('common.done') || 'Done'))
      )
    );

    // ── Header edit modal (title + essential question) ────────────
    var headerModal = editingHeader && h('div', {
      style: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' },
      onClick: function (e) { if (e.target === e.currentTarget) setEditingHeader(false); }
    },
      h('div', { style: { background: '#fff', borderRadius: 14, width: '100%', maxWidth: 440, padding: 18 } },
        h('div', { style: { fontWeight: 800, fontSize: 14, color: '#1e293b', marginBottom: 12 } }, t('throughline.unit_details') || 'Unit details'),
        h('label', { htmlFor: 'tl-unit-title', style: { fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 } }, t('throughline.title_label') || 'Unit title'),
        h('input', { id: 'tl-unit-title', value: unit.title || '', autoFocus: true, onChange: function (e) { patchUnit({ title: e.target.value }); },
          placeholder: t('throughline.title_ph') || 'e.g. The Water Cycle',
          style: { width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', marginBottom: 12 } }),
        h('label', { htmlFor: 'tl-unit-eq', style: { fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 } }, t('throughline.eq_label') || 'Essential question (Understanding by Design)'),
        h('textarea', { id: 'tl-unit-eq', value: unit.essentialQuestion || '', rows: 2, onChange: function (e) { patchUnit({ essentialQuestion: e.target.value }); },
          placeholder: t('throughline.eq_ph') || 'e.g. How does Earth recycle its water?',
          style: { width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' } }),
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: 14 } },
          h('button', { onClick: function () { setEditingHeader(false); },
            style: { padding: '7px 14px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' } }, t('common.done') || 'Done'))
      )
    );

    // ── Generate Unit overlay ─────────────────────────────────────
    var genModal = gen && (function () {
      var phase = gen.phase;
      var inp = gen.input || {};
      var proposal = gen.proposal;

      function field(label, node) {
        // nest the control inside the <label> for an implicit, AT-correct association
        return h('div', { style: { marginBottom: 11 } },
          h('label', { style: { display: 'block', fontSize: 11, fontWeight: 700, color: '#475569' } },
            h('span', { style: { display: 'block', marginBottom: 4 } }, label), node));
      }
      var inStyle = { width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' };

      var body, footer, headline, sub;

      if (phase === 'setup') {
        headline = '✨ ' + (t('throughline.gen_title') || 'Generate a unit');
        sub = t('throughline.gen_setup_sub') || 'AI drafts a backward-designed structure, then builds each lesson with the blueprint engine. You review and refine every step. This makes several AI calls and is paced to respect rate limits.';
        body = h('div', null,
          gen.error && h('div', { style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8, padding: '8px 10px', fontSize: 12, marginBottom: 10, fontWeight: 600 } }, '⚠️ ' + gen.error),
          field((t('throughline.gen_topic') || 'Topic or focus') + ' *', h('input', { autoFocus: true, 'aria-required': true, 'aria-label': t('throughline.gen_topic') || 'Topic or focus', value: inp.topic || '', onChange: function (e) { setInput({ topic: e.target.value }); }, placeholder: t('throughline.gen_topic_ph') || 'e.g. The water cycle; Causes of the American Revolution', style: inStyle })),
          h('div', { style: { display: 'flex', gap: 10 } },
            h('div', { style: { flex: 2 } }, field(t('throughline.gen_grade') || 'Grade band', h('input', { 'aria-label': t('throughline.gen_grade') || 'Grade band', value: inp.gradeLevel || '', onChange: function (e) { setInput({ gradeLevel: e.target.value }); }, placeholder: t('throughline.gen_grade_ph') || 'e.g. 5th grade (blank = use app setting)', style: inStyle }))),
            h('div', { style: { flex: 1 } }, field(t('throughline.gen_count') || 'Lessons', h('input', { type: 'number', min: 2, max: 8, 'aria-label': t('throughline.gen_count') || 'Lessons', value: inp.lessonCount || 4, onChange: function (e) { var v = parseInt(e.target.value, 10); setInput({ lessonCount: isNaN(v) ? 4 : Math.max(2, Math.min(8, v)) }); }, style: inStyle })))
          ),
          field(t('throughline.gen_standards') || 'Standards (optional)', h('input', { 'aria-label': t('throughline.gen_standards') || 'Standards (optional)', value: inp.standards || '', onChange: function (e) { setInput({ standards: e.target.value }); }, placeholder: t('throughline.gen_standards_ph') || 'e.g. NGSS 5-ESS2-1', style: inStyle })),
          field(t('throughline.gen_tone') || 'Tone / approach (optional)', h('input', { 'aria-label': t('throughline.gen_tone') || 'Tone / approach (optional)', value: inp.tone || '', onChange: function (e) { setInput({ tone: e.target.value }); }, placeholder: t('throughline.gen_tone_ph') || 'e.g. inquiry-first, lots of scaffolding', style: inStyle })),
          field(t('throughline.gen_source') || 'Source text (optional)', h('textarea', { 'aria-label': t('throughline.gen_source') || 'Source text (optional)', value: inp.sourceText || '', rows: 3, onChange: function (e) { setInput({ sourceText: e.target.value }); }, placeholder: t('throughline.gen_source_ph') || 'Paste a text to ground the whole unit in it. Leave blank to generate from the topic.', style: Object.assign({}, inStyle, { resize: 'vertical' }) })),
          field(t('throughline.gen_notes') || 'Notes for the planner (optional)', h('textarea', { 'aria-label': t('throughline.gen_notes') || 'Notes for the planner (optional)', value: inp.notes || '', rows: 2, onChange: function (e) { setInput({ notes: e.target.value }); }, placeholder: t('throughline.gen_notes_ph') || 'e.g. my class has several emerging bilingual students', style: Object.assign({}, inStyle, { resize: 'vertical' }) }))
        );
        footer = h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8 } },
          h('button', { onClick: closeGenerate, style: { padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: 13, cursor: 'pointer' } }, t('common.cancel') || 'Cancel'),
          h('button', { onClick: proposeStructure, style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' } }, (t('throughline.gen_propose') || 'Propose structure') + ' →')
        );
      } else if (phase === 'proposing') {
        headline = '✨ ' + (t('throughline.gen_drafting') || 'Drafting a unit structure');
        sub = inp.topic || '';
        body = h('div', { style: { padding: '30px 10px', textAlign: 'center' } },
          h('div', { style: { fontSize: 40, marginBottom: 12 }, 'aria-hidden': 'true' }, '🧭'),
          h('div', { style: { fontSize: 14, color: '#475569', fontWeight: 600 } }, t('throughline.gen_thinking') || 'Designing backward from your essential question…'),
          h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 6 } }, t('throughline.gen_one_call') || 'One AI call — your lessons are not built yet.')
        );
        footer = h('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
          h('button', { onClick: closeGenerate, style: { padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: 13, cursor: 'pointer' } }, t('common.cancel') || 'Cancel'));
      } else if (phase === 'review' && proposal) {
        var calls = estimateCalls(proposal);
        headline = '📋 ' + (t('throughline.gen_review_title') || 'Review the plan');
        sub = t('throughline.gen_review_sub') || 'Edit, reorder, or remove any lesson before building. Nothing has been generated yet.';
        var chip = function (txt, key) { return h('span', { key: key, style: { display: 'inline-block', fontSize: 11, color: '#4338ca', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 999, padding: '2px 8px', margin: '0 4px 4px 0' } }, txt); };
        body = h('div', null,
          h('div', { style: { background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: '#5b21b6', marginBottom: 12, fontWeight: 600 } },
            '~' + calls + ' ' + (t('throughline.gen_calls') || 'AI generations across') + ' ' + proposal.lessons.length + ' ' + (t('throughline.lessons') || 'lessons') + '. ' + (t('throughline.gen_paced_note') || 'Paced, and you review each one as it is built.')),
          field(t('throughline.gen_unit_title') || 'Unit title', h('input', { 'aria-label': t('throughline.gen_unit_title') || 'Unit title', value: proposal.title || '', onChange: function (e) { patchProposal({ title: e.target.value }); }, style: inStyle })),
          field(t('throughline.eq_label') || 'Essential question', h('textarea', { 'aria-label': t('throughline.eq_label') || 'Essential question', value: proposal.essentialQuestion || '', rows: 2, onChange: function (e) { patchProposal({ essentialQuestion: e.target.value }); }, style: Object.assign({}, inStyle, { resize: 'vertical' }) })),
          field(t('throughline.gen_eu') || 'Enduring understandings (the big ideas this unit is designed backward from)', h('textarea', { 'aria-label': t('throughline.gen_eu') || 'Enduring understandings (the big ideas this unit is designed backward from)', value: (proposal.desiredResults || []).join('\n'), rows: 2, onChange: function (e) { patchProposal({ desiredResults: e.target.value.split('\n') }); }, placeholder: t('throughline.gen_eu_ph') || 'One per line — these now ground every lesson the AI builds', style: Object.assign({}, inStyle, { resize: 'vertical' }) })),
          (proposal.keyTerms && proposal.keyTerms.length > 0) && h('div', { style: { marginBottom: 10 } },
            h('div', { style: { fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 } }, t('throughline.gen_key_terms') || 'Key terms (carried through every lesson)'),
            h('div', null, proposal.keyTerms.slice(0, 14).map(function (kt, i) { return chip(kt, 'kt' + i); }))),
          field(t('throughline.gen_golden') || 'Golden thread — recurring concepts carried into every lesson', h('textarea', { 'aria-label': t('throughline.gen_golden') || 'Golden thread — recurring concepts carried into every lesson', value: (proposal.goldenThread || []).join('\n'), rows: 2, onChange: function (e) { patchProposal({ goldenThread: e.target.value.split('\n') }); }, placeholder: t('throughline.gen_golden_ph') || 'One concept per line — these steer every lesson the AI builds', style: Object.assign({}, inStyle, { resize: 'vertical' }) })),
          (function () {
            var _scDefault = { lengthWords: 350, tone: 'Informative', readingLevel: proposal.gradeBand || '' };
            var _sc = (proposal.sourceConfig && typeof proposal.sourceConfig === 'object') ? proposal.sourceConfig : _scDefault;
            var _setSc = function (patch) { patchProposal({ sourceConfig: Object.assign({}, _scDefault, _sc, patch) }); };
            var _TONES = ['Informative', 'Engaging Narrative', 'Persuasive', 'Humorous', 'Step-by-Step', 'Dialogue'];
            var _lblStyle = { fontSize: 11, fontWeight: 700, color: '#475569', display: 'flex', flexDirection: 'column', gap: 3 };
            return field(
              t('throughline.gen_source_settings') || 'Reading-passage settings (when you have not loaded your own source, the AI writes a passage per lesson with these — edit before building)',
              h('div', { style: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' } },
                h('label', { style: _lblStyle }, (t('throughline.gen_source_length') || 'Length (words)'),
                  h('input', { type: 'number', min: 100, max: 1500, step: 50, value: _sc.lengthWords || 350, onChange: function (e) { _setSc({ lengthWords: Math.max(100, Math.min(1500, parseInt(e.target.value, 10) || 350)) }); }, style: Object.assign({}, inStyle, { width: 110 }) })),
                h('label', { style: _lblStyle }, (t('throughline.gen_source_tone') || 'Tone'),
                  h('select', { value: (_TONES.indexOf(_sc.tone) >= 0 ? _sc.tone : 'Informative'), onChange: function (e) { _setSc({ tone: e.target.value }); }, style: Object.assign({}, inStyle, { width: 180 }) },
                    _TONES.map(function (tn) { return h('option', { key: tn, value: tn }, tn); }))),
                h('label', { style: _lblStyle }, (t('throughline.gen_source_level') || 'Reading level'),
                  h('input', { value: _sc.readingLevel || '', onChange: function (e) { _setSc({ readingLevel: e.target.value }); }, placeholder: proposal.gradeBand || 'Grade', style: Object.assign({}, inStyle, { width: 130 }) }))));
          })(),
          h('div', { style: { fontSize: 12, fontWeight: 800, color: '#1e293b', margin: '12px 0 6px' } }, (t('throughline.gen_lessons_label') || 'Lessons')),
          proposal.lessons.map(function (l, i) {
            return h('div', { key: 'L' + i, style: { border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, marginBottom: 8, background: '#fff' } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 } },
                h('span', { style: { fontWeight: 800, color: '#6366f1', fontSize: 13, minWidth: 20 } }, (i + 1) + '.'),
                h('input', { 'aria-label': (t('throughline.lesson_label') || 'Lesson') + ' ' + (i + 1) + ' ' + (t('throughline.title_label') || 'title'), value: l.title || '', onChange: function (e) { patchLessonSpec(i, { title: e.target.value }); }, style: Object.assign({}, inStyle, { flex: 1, fontWeight: 700 }) }),
                h('button', { onClick: function () { moveLessonSpec(i, -1); }, disabled: i === 0, title: t('throughline.move_up') || 'Move up', style: { border: '1px solid #cbd5e1', background: '#fff', borderRadius: 6, cursor: i === 0 ? 'not-allowed' : 'pointer', padding: '4px 7px', color: '#475569' } }, '↑'),
                h('button', { onClick: function () { moveLessonSpec(i, 1); }, disabled: i === proposal.lessons.length - 1, title: t('throughline.move_down') || 'Move down', style: { border: '1px solid #cbd5e1', background: '#fff', borderRadius: 6, cursor: i === proposal.lessons.length - 1 ? 'not-allowed' : 'pointer', padding: '4px 7px', color: '#475569' } }, '↓'),
                h('button', { onClick: function () { removeLessonSpec(i); }, disabled: proposal.lessons.length <= 1, title: t('throughline.gen_remove_lesson') || 'Remove lesson', style: { border: '1px solid #fecaca', background: '#fef2f2', borderRadius: 6, cursor: proposal.lessons.length <= 1 ? 'not-allowed' : 'pointer', padding: '4px 7px', color: '#b91c1c' } }, '✕')
              ),
              h('input', { 'aria-label': (t('throughline.lesson_label') || 'Lesson') + ' ' + (i + 1) + ': ' + (t('throughline.gen_objective_ph') || 'Measurable objective'), value: l.objective || '', onChange: function (e) { patchLessonSpec(i, { objective: e.target.value }); }, placeholder: t('throughline.gen_objective_ph') || 'Measurable objective', style: Object.assign({}, inStyle, { marginBottom: 6, fontSize: 12 }) }),
              h('input', { 'aria-label': (t('throughline.lesson_label') || 'Lesson') + ' ' + (i + 1) + ': ' + (t('throughline.gen_focus_ph') || 'One-line focus that steers every resource in this lesson'), value: l.focus || '', onChange: function (e) { patchLessonSpec(i, { focus: e.target.value }); }, placeholder: t('throughline.gen_focus_ph') || 'One-line focus that steers every resource in this lesson', style: Object.assign({}, inStyle, { marginBottom: 6, fontSize: 12 }) }),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
                // standard palette + any AI-proposed type not in it, so every type that
                // will actually generate is visible and can be toggled off
                RESOURCE_TYPE_OPTIONS.concat((l.suggestedResourceTypes || []).filter(function (rt) { return RESOURCE_TYPE_OPTIONS.indexOf(rt) < 0; })).map(function (rt) {
                  var on = (l.suggestedResourceTypes || []).indexOf(rt) >= 0;
                  return h('button', { key: rt, onClick: function () { toggleLessonType(i, rt); }, 'aria-pressed': on, 'aria-label': typeLabel(rt) + (on ? ' — ' + (t('throughline.selected') || 'selected') : ''),
                    title: rt, style: { fontSize: 11, padding: '3px 8px', borderRadius: 999, cursor: 'pointer', border: '1px solid ' + (on ? '#4338ca' : '#e2e8f0'), background: on ? '#4f46e5' : '#fff', color: on ? '#fff' : '#64748b', fontWeight: on ? 700 : 500 } },
                    typeIcon(rt) + ' ' + typeLabel(rt));
                })
              )
            );
          }),
          proposal.lessons.length < 8 && h('button', { onClick: addLessonSpec, style: { marginTop: 4, padding: '7px 12px', borderRadius: 8, border: '1px dashed #c7d2fe', background: '#f8fafc', color: '#4338ca', fontWeight: 700, fontSize: 12, cursor: 'pointer' } }, '➕ ' + (t('throughline.gen_add_lesson') || 'Add a lesson')),
          h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 12, color: '#475569', cursor: 'pointer' } },
            h('input', { type: 'checkbox', checked: !!gen.autoContinue, onChange: function (e) { setGenMerge({ autoContinue: e.target.checked }); } }),
            (t('throughline.gen_auto') || 'Build all lessons without pausing for me (still paced between calls)'))
        );
        footer = h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8 } },
          h('button', { onClick: function () { setGenMerge({ phase: 'setup' }); }, style: { padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: 13, cursor: 'pointer' } }, '← ' + (t('common.back') || 'Back')),
          h('button', { onClick: startGeneration, style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#7c3aed,#4f46e5)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' } }, '✨ ' + (t('throughline.gen_build') || 'Build') + ' ' + proposal.lessons.length + ' ' + (t('throughline.lessons') || 'lessons'))
        );
      } else if ((phase === 'generating' || phase === 'done') && proposal) {
        var lessons = proposal.lessons;
        var statusMeta = {
          pending: { icon: '•', color: '#64748b', label: t('throughline.gen_pending') || 'waiting' },
          running: { icon: '⏳', color: '#7c3aed', label: t('throughline.gen_running') || 'building' },
          done: { icon: '✅', color: '#15803d', label: t('throughline.gen_done') || 'added to canvas' },
          empty: { icon: '⚠️', color: '#b45309', label: t('throughline.gen_empty_label') || 'no resources returned' },
          error: { icon: '❌', color: '#dc2626', label: t('throughline.gen_error_label') || 'failed' },
          skipped: { icon: '⤼', color: '#64748b', label: t('throughline.gen_skipped') || 'skipped' }
        };
        var doneN = gen.results.filter(function (r) { return r.status === 'done'; }).length;
        var failedN = gen.results.filter(function (r) { return r.status === 'error' || r.status === 'empty'; }).length;
        // gate banner reflects the ACTUAL outcome of the lesson at gen.awaiting (not always "ready")
        var gateR = (gen.awaiting >= 0 && gen.results[gen.awaiting]) || { status: 'done' };
        var gateOk = gateR.status === 'done';
        var gateLessonN = (t('throughline.gen_review_gate') || 'Lesson') + ' ' + (gen.awaiting + 1) + ' ';
        var gateRetry = (t('throughline.gen_gate_retry') || 'Regenerate to try again, or skip it.');
        var gateText = gateOk
          ? (gateLessonN + (t('throughline.gen_ready_review') || 'is ready. Review it, then continue.'))
          : (gateR.status === 'error'
              ? (gateLessonN + (t('throughline.gen_gate_failed') || 'did not build') + (gateR.error ? ' (' + gateR.error + ')' : '') + '. ' + gateRetry)
              : (gateLessonN + (t('throughline.gen_gate_empty') || 'returned no resources') + '. ' + gateRetry));
        var gateBg = gateOk ? '#eef2ff' : '#fff7ed';
        var gateBorder = gateOk ? '#c7d2fe' : '#fed7aa';
        var gateTextColor = gateOk ? '#3730a3' : '#9a3412';
        headline = (phase === 'done' ? '🎉 ' : '🛠 ') + (phase === 'done' ? (t('throughline.gen_complete') || 'Unit built') : (t('throughline.gen_building') || 'Building your unit'));
        sub = phase === 'done'
          ? (doneN + ' / ' + lessons.length + ' ' + (t('throughline.gen_lessons_added') || 'lessons added to your canvas') + (failedN ? ' · ' + failedN + ' ' + (t('throughline.gen_failed_count') || 'need attention') : ''))
          : ((t('throughline.gen_lesson') || 'Lesson') + ' ' + (Math.min(gen.cursor + 1, lessons.length)) + ' ' + (t('throughline.gen_of') || 'of') + ' ' + lessons.length);

        body = h('div', null,
          h('div', { role: 'log', 'aria-live': 'polite', 'aria-label': t('throughline.gen_progress_aria') || 'Lesson build progress' },
          lessons.map(function (l, i) {
            var r = gen.results[i] || { status: 'pending' };
            var meta = statusMeta[r.status] || statusMeta.pending;
            var current = phase === 'generating' && gen.cursor === i;
            return h('div', { key: 'G' + i, style: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 10px', borderRadius: 8, marginBottom: 6, border: '1px solid ' + (current ? '#c4b5fd' : '#eef2f6'), background: current ? '#f5f3ff' : '#fff' } },
              h('span', { style: { fontSize: 16, lineHeight: '20px' }, 'aria-hidden': 'true' }, meta.icon),
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { fontWeight: 700, fontSize: 13, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, (i + 1) + '. ' + (l.title || (t('throughline.gen_lesson') || 'Lesson'))),
                h('div', { style: { fontSize: 11, color: meta.color, fontWeight: 600 } },
                  meta.label +
                  (r.status === 'running' && r.sub ? ' — ' + typeLabel(r.sub.type) + (r.sub.total ? ' (' + r.sub.done + '/' + r.sub.total + ')' : '') : '') +
                  (r.status === 'done' && r.count ? ' — ' + r.count + ' ' + (t('throughline.gen_resources') || 'resources') + (r.nulls ? ' (' + r.nulls + ' ' + (t('throughline.gen_skipped_res') || 'skipped') + ')' : '') : '') +
                  (r.status === 'error' && r.error ? ' — ' + r.error : '')
                )
              ),
              (phase === 'done' && r.status === 'done' && r.nodeId && onOpenLesson) && h('button', { onClick: function () { var nd = null; unit.nodes.forEach(function (n) { if (n.nodeId === r.nodeId) nd = n; }); if (nd) openNodeLesson(nd); }, style: { fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6, border: '1px solid #6366f1', background: '#eef2ff', color: '#4338ca', cursor: 'pointer', whiteSpace: 'nowrap' } }, (t('throughline.open_lesson') || 'Open') + ' ↗')
            );
          })),
          // pacing countdown
          (phase === 'generating' && gen.pacing > 0) && h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 10px', marginTop: 6, fontSize: 12, color: '#92400e', fontWeight: 600 } },
            h('span', null, '⏸ ' + (t('throughline.gen_pacing') || 'Pausing') + ' ' + gen.pacing + 's ' + (t('throughline.gen_pacing_why') || 'to respect rate limits…')),
            h('button', { onClick: continueNow, style: { fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 6, border: '1px solid #f59e0b', background: '#fff', color: '#b45309', cursor: 'pointer' } }, t('throughline.gen_continue_now') || 'Continue now')),
          // backpressure / review gate
          (phase === 'generating' && gen.awaiting >= 0) && h('div', { role: 'status', style: { background: gateBg, border: '1px solid ' + gateBorder, borderRadius: 8, padding: '10px', marginTop: 6 } },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: gateTextColor, marginBottom: 8 } }, gateText),
            h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
              h('button', { onClick: function () { resolveDecision('accept'); }, style: { fontSize: 12, fontWeight: 800, padding: '6px 12px', borderRadius: 7, border: gateOk ? 'none' : '1px solid #cbd5e1', background: gateOk ? '#4f46e5' : '#fff', color: gateOk ? '#fff' : '#475569', cursor: 'pointer' } }, gateOk ? ('✓ ' + (t('throughline.gen_accept') || 'Accept & continue')) : ('→ ' + (t('throughline.gen_continue_without') || 'Continue without it'))),
              h('button', { onClick: function () { resolveDecision('regenerate'); }, style: { fontSize: 12, fontWeight: gateOk ? 700 : 800, padding: '6px 12px', borderRadius: 7, border: gateOk ? '1px solid #c7d2fe' : 'none', background: gateOk ? '#fff' : '#4f46e5', color: gateOk ? '#4338ca' : '#fff', cursor: 'pointer' } }, '↻ ' + (t('throughline.gen_regen') || 'Regenerate')),
              h('button', { onClick: function () { resolveDecision('skip'); }, style: { fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 7, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer' } }, '⤼ ' + (t('throughline.gen_skip') || 'Skip')),
              h('button', { onClick: function () { resolveDecision('stop'); }, style: { fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', cursor: 'pointer' } }, (t('throughline.gen_finish_here') || 'Finish here'))
            )
          ),
          phase === 'generating' && h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12, color: '#475569', cursor: 'pointer' } },
            h('input', { type: 'checkbox', checked: !!gen.autoContinue, onChange: function (e) { setGenMerge({ autoContinue: e.target.checked }); if (e.target.checked && gen.awaiting >= 0 && (gen.results[gen.awaiting] || {}).status === 'done') resolveDecision('accept'); } }),
            (t('throughline.gen_auto_running') || 'Stop pausing — build the rest without me (still paced)')),
          phase === 'done' && h('div', { style: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px', marginTop: 8, fontSize: 12, color: '#166534' } },
            '💾 ' + (t('throughline.gen_export_nudge') || 'Your lessons live in this browser. Use Export unit to save a durable file you can reopen or share.'))
        );

        footer = phase === 'done'
          ? h('div', { style: { display: 'flex', justifyContent: failedN ? 'space-between' : 'flex-end', gap: 8 } },
              failedN ? h('button', { onClick: retryFailed, style: { padding: '8px 14px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff', color: '#b91c1c', fontWeight: 700, fontSize: 13, cursor: 'pointer' } }, '↻ ' + (t('throughline.gen_retry_failed') || 'Retry failed') + ' (' + failedN + ')') : null,
              h('button', { onClick: closeGenerate, style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' } }, t('throughline.gen_open_unit') || 'Open the unit'))
          : h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8 } },
              h('div', { style: { fontSize: 11, color: '#94a3b8', alignSelf: 'center' } }, t('throughline.gen_safe_note') || 'Lessons already built stay in your unit.'),
              h('button', { onClick: function () { stopGeneration(); }, style: { padding: '8px 14px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff', color: '#b91c1c', fontWeight: 700, fontSize: 13, cursor: 'pointer' } }, '■ ' + (t('throughline.gen_stop') || 'Stop')));
      } else {
        body = null; footer = null; headline = ''; sub = '';
      }

      async function onOverlayClose() {
        if (phase === 'generating') {
          var ok = await askThroughlineConfirmation(t('throughline.gen_stop_confirm') || 'Stop generating this unit? Lessons already built will stay in your canvas.', { title: 'Stop unit generation', confirmText: 'Stop generation' });
          if (!ok) return;
          stopGeneration();
        }
        closeGenerate();
      }

      return h('div', {
        style: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
        onClick: function (e) { if (e.target === e.currentTarget && phase !== 'generating') onOverlayClose(); }
      },
        h('div', { ref: genDialogRef, tabIndex: -1, style: { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(15,23,42,0.3)' }, role: 'dialog', 'aria-modal': 'true', 'aria-label': t('throughline.gen_title') || 'Generate a unit' },
          h('div', { style: { padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: 10 } },
            h('div', { style: { flex: 1 } },
              h('div', { style: { fontSize: 15, fontWeight: 800, color: '#1e293b' } }, headline),
              sub && h('div', { style: { fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 1.45 } }, sub)),
            h('button', { onClick: onOverlayClose, 'aria-label': t('common.close') || 'Close', style: { border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: '#475569', padding: 2 } }, '✕')
          ),
          h('div', { style: { padding: 18, overflow: 'auto', flex: 1 } }, body),
          footer && h('div', { style: { padding: '12px 18px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' } }, footer)
        )
      );
    })();

    // ── 3D view overlay ───────────────────────────────────────────
    var CG3D = window.AlloModules && window.AlloModules.ConceptGraph3D;
    var _cg3dCenter = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, color: '#cbd5e1', fontSize: 14, lineHeight: 1.5 };
    var threeDModal = show3D && h('div', {
      ref: threeDDialogRef, tabIndex: -1, style: { position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.94)', zIndex: 140, display: 'flex', flexDirection: 'column' },
      role: 'dialog', 'aria-modal': 'true', 'aria-label': t('throughline.view_3d') || 'View in 3D',
    },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: '#0b1020', borderBottom: '1px solid #1e293b', color: '#e2e8f0' } },
        h('span', { style: { fontSize: 18 }, 'aria-hidden': 'true' }, '🧊'),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { fontWeight: 800, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
            (unit.title || (t('throughline.untitled_unit') || 'Untitled unit')) + ' — ' + (t('throughline.view_3d') || '3D concept map')),
          h('div', { style: { fontSize: 11, color: '#94a3b8' } },
            t('throughline.view_3d_controls') || 'Drag to orbit · scroll to zoom · depth = strand. A reading-order outline stays available to screen readers.')),
        (typeof window.callGemini === 'function') && h('button', {
          onClick: arrange3DByMeaning, disabled: aiBusy || cg3dState !== 'ready',
          title: t('throughline.ai_arrange_title') || 'Use AI to position lessons by meaning: left→right = sequence, up = cognitive depth, depth = strand',
          style: { fontSize: 12, fontWeight: 800, minHeight: 44, padding: '8px 12px', borderRadius: 8, border: 'none', whiteSpace: 'nowrap',
            background: (aiBusy || cg3dState !== 'ready') ? '#334155' : 'linear-gradient(90deg,#7c3aed,#4f46e5)',
            color: '#fff', cursor: (aiBusy || cg3dState !== 'ready') ? 'default' : 'pointer' }
        }, aiBusy ? ('… ' + (t('throughline.ai_arranging') || 'Arranging')) : ('✨ ' + (t('throughline.ai_arrange') || 'Arrange by meaning'))),
        h('button', { onClick: close3D, 'aria-label': t('common.close') || 'Close',
          style: { border: 'none', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: 18, padding: 4 } }, '✕')
      ),
      h('div', { style: { flex: 1, position: 'relative', minHeight: 0 } },
        cg3dState === 'loading' ? h('div', { style: _cg3dCenter }, '🧭 ' + (t('throughline.view_3d_loading') || 'Loading the 3D view…'))
        : cg3dState === 'error' ? h('div', { style: _cg3dCenter }, '⚠️ ' + (t('throughline.view_3d_failed') || 'The 3D view could not load here. Open the latest Canvas link and try again — the outline view still works.'))
        : (cg3dState === 'ready' && CG3D && CG3D.View && graph3d)
          ? h(CG3D.View, { graph: graph3d, t: t, height: '100%', onOpenNode: function (id) {
              var nd = null; unit.nodes.forEach(function (n) { if (n.nodeId === id) nd = n; });
              if (nd && nd.lessonId) { close3D(); openNodeLesson(nd); }
            } })
          : h('div', { style: _cg3dCenter }, t('throughline.view_3d_unavailable') || '3D view unavailable.')
      )
    );

    return h('div', { style: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)', zIndex: 100, display: 'flex', flexDirection: 'column' }, role: 'dialog', 'aria-modal': 'true', 'aria-label': TOOL_NAME },
      topBar, toolbar, quotaNudge, hint, connectChoice,
      h('div', { style: { flex: 1, position: 'relative', display: 'flex' } }, canvas, outlinePanel),
      pickerModal, editModal, headerModal, genModal, threeDModal
    );
  }

  window.AlloModules = window.AlloModules || {};
  // Register under MindMap (keeps the existing loadModule('MindMap', mind_map_module.js)
  // + CDNModuleGate moduleKey="MindMap" chain working — no rename churn) AND under the
  // forward name Throughline.
  window.AlloModules.MindMap = ThroughlineModal;
  window.AlloModules.Throughline = ThroughlineModal;
  console.log('[Throughline] Registered (spatial unit builder v1; aliased as MindMap for the existing gate)');
})();

/*
 * ── COORDINATED HOST-SWAP STEPS (do when the PDF-pipeline agent is clear) ──
 * This file is intentionally NOT wired yet. To go live:
 *   1. Decide swap mechanic with Aaron:
 *      (a) Repoint the existing MindMap gate at this module (keep moduleKey="MindMap",
 *          change displayName→"Throughline", icon→"🧭", loadModule URL→throughline_module.js,
 *          and have the gate read window.AlloModules.Throughline), OR
 *      (b) copy this file's contents into mind_map_module.js (preserve the filename/key chain
 *          the design prefers) and retire the Mind Map MVP.
 *   2. Widen the CDNModuleGate props (AlloFlowANTI.txt ~28119 + 2 mirrors):
 *        history={Array.isArray(history)?history:[]}
 *        currentLesson={generatedContent||null}
 *        inLiveSession={!!(isTeacherMode && activeSessionCode)}
 *        onOpenLesson={(item)=>{ setShowMindMap(false); setTimeout(()=>handleRestoreView(item),50); }}
 *   3. Update the launcher card text (view_learning_hub_modal_source.jsx) + rebuild + mirror.
 *   4. Add throughline_module.js to build.js MODULES + loadModule(...) bootstrap (3 surfaces).
 *   5. Mirror module to desktop/web-app/public/ (+ build/), publish to alloflow-cdn.pages.dev.
 *   6. Optional v1.1: units-feature integration — read item.unitId to seed nodes; surface a
 *      "Visualize in Throughline" entry from the existing UnitModal / history panel.
 */
