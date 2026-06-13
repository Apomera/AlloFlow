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
        category: (typeof n.category === 'string' && n.category) ? n.category : null
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

    var svgRef = useRef(null);
    var fileInputRef = useRef(null);

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

    // ── Open a node's lesson (hardened) ───────────────────────────
    function openNodeLesson(node) {
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
        var ok = window.confirm(t('throughline.live_open_confirm') ||
          'You are in a live class session. Opening this lesson will show it to connected students. Continue?');
        if (!ok) return;
      }
      onOpenLesson(item);
    }

    // ── Export: existing pack shape + unitLayout sidecar ──────────
    function exportUnit() {
      try {
        // subset history to lessons actually referenced by nodes
        var referenced = {};
        unit.nodes.forEach(function (n) { if (n.lessonId) referenced[n.lessonId] = true; });
        var history = Object.keys(referenced).map(function (id) { return lessonPool[id]; }).filter(Boolean);
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
        addToast((t('throughline.exported') || 'Unit exported') + ' (' + history.length + ' ' + (t('throughline.lessons') || 'lessons') + ')', 'success');
      } catch (e) {
        addToast((t('throughline.export_failed') || 'Export failed') + ': ' + e.message, 'error');
      }
    }

    // ── Import: a unit file (has unitLayout) OR a plain pack (auto-layout) ──
    function importFile(file) {
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        try {
          var parsed = JSON.parse(ev.target.result);
          var packHistory = Array.isArray(parsed && parsed.history) ? parsed.history : [];
          // keep the file's lessons resolvable
          var imp = {};
          packHistory.forEach(function (it) { if (it && it.id) imp[it.id] = it; });

          if (parsed && parsed.unitLayout) {
            var nu = normalizeUnit(parsed.unitLayout);
            if (unit.nodes.length > 0) {
              var ok = window.confirm(t('throughline.confirm_replace') || 'Replace your current unit with the imported one? This cannot be undone.');
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
            var ok2 = window.confirm(t('throughline.confirm_replace') || 'Replace your current unit with the imported one? This cannot be undone.');
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

    function clearUnit() {
      var ok = window.confirm(t('throughline.confirm_clear') || 'Clear the entire unit? This cannot be undone.');
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
          // default to sequence; offer prerequisite via a quick prompt
          var pre = window.confirm(t('throughline.edge_kind_prompt') ||
            'Connect as a SEQUENCE (teach next)?\n\nOK = sequence,  Cancel = prerequisite gate');
          addEdge(pendingFrom, node.nodeId, pre ? 'sequence' : 'prerequisite');
          setPendingFrom(null);
          setMode('view');
        }
      } else if (mode === 'delete') {
        deleteNode(node.nodeId);
      }
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
      return h('div', {
        key: n.nodeId,
        onMouseDown: function (e) { onCardMouseDown(e, n); },
        onClick: function (e) { onCardClick(e, n); },
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
      tbBtn('➕ ' + (t('throughline.add_node') || 'Add node'), mode === 'addNode', function () { setMode(mode === 'addNode' ? 'view' : 'addNode'); setPendingFrom(null); }),
      tbBtn('🔗 ' + (t('throughline.connect') || 'Connect'), mode === 'connect', function () { setMode(mode === 'connect' ? 'view' : 'connect'); setPendingFrom(null); }),
      tbBtn('🗑 ' + (t('throughline.delete') || 'Delete'), mode === 'delete', function () { setMode(mode === 'delete' ? 'view' : 'delete'); setPendingFrom(null); }),
      h('div', { style: { width: 1, height: 20, background: '#cbd5e1', margin: '0 2px' } }),
      (hostHistory.length > 0) && tbBtn('📥 ' + (t('throughline.add_lessons') || 'Add my lessons'), false, function () { setPickerForNode('BULK'); }, t('throughline.add_lessons_title') || 'Add lessons from your history into this unit'),
      tbBtn('🧾 ' + (t('throughline.outline') || 'Outline'), showOutline, function () { setShowOutline(!showOutline); }, t('throughline.outline_title') || 'Printable scope & sequence'),
      h('div', { style: { width: 1, height: 20, background: '#cbd5e1', margin: '0 2px' } }),
      tbBtn('💾 ' + (t('throughline.export') || 'Export unit'), false, exportUnit, t('throughline.export_title') || 'Download this unit as one file'),
      tbBtn('📂 ' + (t('throughline.import') || 'Import'), false, function () { if (fileInputRef.current) fileInputRef.current.click(); }, t('throughline.import_title') || 'Open a unit or lesson-pack file'),
      h('input', { ref: fileInputRef, type: 'file', accept: 'application/json,.json', style: { display: 'none' },
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
          return h('div', { key: nid, style: { padding: '6px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 12 } },
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
        h('label', { style: { fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 } }, t('throughline.description_label') || 'Why this lesson lives here (description)'),
        h('textarea', {
          value: editNode.description || '', rows: 3,
          onChange: function (e) { setNodeFields(editNode.nodeId, { description: e.target.value }); },
          placeholder: t('throughline.description_ph') || 'e.g. Hook — surfaces prior knowledge. Gates the exit ticket.',
          style: { width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }
        }),
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
        h('label', { style: { fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 } }, t('throughline.title_label') || 'Unit title'),
        h('input', { value: unit.title || '', autoFocus: true, onChange: function (e) { patchUnit({ title: e.target.value }); },
          placeholder: t('throughline.title_ph') || 'e.g. The Water Cycle',
          style: { width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', marginBottom: 12 } }),
        h('label', { style: { fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 } }, t('throughline.eq_label') || 'Essential question (Understanding by Design)'),
        h('textarea', { value: unit.essentialQuestion || '', rows: 2, onChange: function (e) { patchUnit({ essentialQuestion: e.target.value }); },
          placeholder: t('throughline.eq_ph') || 'e.g. How does Earth recycle its water?',
          style: { width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' } }),
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: 14 } },
          h('button', { onClick: function () { setEditingHeader(false); },
            style: { padding: '7px 14px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' } }, t('common.done') || 'Done'))
      )
    );

    return h('div', { style: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)', zIndex: 100, display: 'flex', flexDirection: 'column' }, role: 'dialog', 'aria-modal': 'true', 'aria-label': TOOL_NAME },
      topBar, toolbar, quotaNudge, hint,
      h('div', { style: { flex: 1, position: 'relative', display: 'flex' } }, canvas, outlinePanel),
      pickerModal, editModal, headerModal
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
 *   5. Mirror module to prismflow-deploy/public/ (+ build/), publish to alloflow-cdn.pages.dev.
 *   6. Optional v1.1: units-feature integration — read item.unitId to seed nodes; surface a
 *      "Visualize in Throughline" entry from the existing UnitModal / history panel.
 */
