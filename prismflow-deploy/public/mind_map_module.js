/**
 * AlloFlow Mind Map Module — standalone learning tool
 *
 * MVP scope (2026-06-10/11): a student-owned, persistent knowledge graph.
 * Lives next to LitLab, StoryForge, PoetTree, etc. in the Learning Hub.
 *
 * INTENTIONALLY MINIMAL: just nodes + edges + manual layout + localStorage
 * persistence + JSON export/import. No AI yet, no glossary/quiz integration,
 * no mnemonic generation — those layers go on top in v2 once the basic
 * "do students return and add nodes?" question is answered.
 *
 * Design notes:
 * - localStorage (not studentProjectSettings) so the graph survives even if
 *   the AlloFlow session state is lost. Key: 'alloflow_mindmap_v1'.
 * - SVG renders the graph; no Canvas, no force-layout library. Nodes are
 *   draggable circles with editable text labels. Edges are straight lines.
 * - Three interaction modes: 'view' (default), 'addNode' (click empty area),
 *   'connect' (click two nodes to link them). Delete via per-node ×.
 * - Pedagogical framing follows UDL multiple-means-of-representation, NOT
 *   contested "learning styles" framing. The graph + text-label pair gives
 *   spatial + linguistic representations of the same knowledge.
 *
 * Props (from CDNModuleGate at AlloFlowANTI.txt:~27774):
 *   isOpen, onClose, addToast, studentNickname, t
 */
(function () {
  'use strict';
  if (window.AlloModules && window.AlloModules.MindMap) {
    console.log('[MindMap] Already loaded, skipping');
    return;
  }
  if (!window.React) {
    console.warn('[MindMap] React not available, skipping');
    return;
  }
  var React = window.React;
  var h = React.createElement;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useRef = React.useRef;
  var useCallback = React.useCallback;

  var STORAGE_KEY = 'alloflow_mindmap_v1';
  var SCHEMA_VERSION = 1;

  // ── State persistence ───────────────────────────────────────────────
  // localStorage shape: { v, nodes, edges, updated }
  function loadFromStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.v !== SCHEMA_VERSION) return emptyState();
      return normalize(parsed);
    } catch (e) {
      console.warn('[MindMap] storage load failed:', e.message);
      return emptyState();
    }
  }
  function saveToStorage(state) {
    try {
      var payload = { v: SCHEMA_VERSION, nodes: state.nodes, edges: state.edges, updated: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('[MindMap] storage save failed:', e.message);
    }
  }
  function emptyState() {
    return { v: SCHEMA_VERSION, nodes: [], edges: [] };
  }
  function normalize(s) {
    // Defensive: tolerate a partial / older / hand-edited JSON without crashing.
    var nodes = Array.isArray(s.nodes) ? s.nodes.filter(function (n) {
      return n && typeof n.id === 'string' && typeof n.x === 'number' && typeof n.y === 'number';
    }) : [];
    var edges = Array.isArray(s.edges) ? s.edges.filter(function (e) {
      return e && typeof e.from === 'string' && typeof e.to === 'string' && e.from !== e.to;
    }) : [];
    // Drop dangling edges whose endpoints don't exist
    var ids = {};
    nodes.forEach(function (n) { ids[n.id] = true; });
    edges = edges.filter(function (e) { return ids[e.from] && ids[e.to]; });
    // Default text per node if missing
    nodes = nodes.map(function (n) { return { id: n.id, x: n.x, y: n.y, text: typeof n.text === 'string' ? n.text : 'Untitled' }; });
    return { v: SCHEMA_VERSION, nodes: nodes, edges: edges };
  }

  // ── ID generation ──────────────────────────────────────────────────
  function uid() {
    return 'n_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
  }

  // ── Constants ─────────────────────────────────────────────────────
  var NODE_R = 28;             // node radius (px)
  var NODE_PAD = 6;             // text padding inside node
  var CANVAS_DEFAULT_W = 1200;
  var CANVAS_DEFAULT_H = 700;

  function MindMapModal(props) {
    var isOpen = props.isOpen;
    var onClose = props.onClose;
    var addToast = props.addToast || function () {};
    var t = props.t || function (k) { return k; };

    var stateRef = useRef(null);
    if (stateRef.current === null) stateRef.current = loadFromStorage();
    var initial = stateRef.current;

    var stateHook = useState(initial);
    var graph = stateHook[0]; var setGraph = stateHook[1];
    var modeHook = useState('view'); var mode = modeHook[0]; var setMode = modeHook[1];
    var pendingHook = useState(null); var pendingConnectFrom = pendingHook[0]; var setPendingConnectFrom = pendingHook[1];
    var draggingHook = useState(null); var dragging = draggingHook[0]; var setDragging = draggingHook[1];
    var editingHook = useState(null); var editingNodeId = editingHook[0]; var setEditingNodeId = editingHook[1];
    var editTextHook = useState(''); var editText = editTextHook[0]; var setEditText = editTextHook[1];
    var hoverHook = useState(null); var hoveredId = hoverHook[0]; var setHoveredId = hoverHook[1];

    var svgRef = useRef(null);
    var fileInputRef = useRef(null);

    // Persist on every change
    useEffect(function () { saveToStorage(graph); }, [graph]);

    // ── Helpers ───────────────────────────────────────────────────
    var addNode = useCallback(function (x, y) {
      var newNode = { id: uid(), x: x, y: y, text: t('mindmap.new_node_default') || 'New idea' };
      setGraph(function (g) { return { v: g.v, nodes: g.nodes.concat([newNode]), edges: g.edges }; });
      // Auto-start editing the new node's text
      setEditingNodeId(newNode.id);
      setEditText(newNode.text);
    }, [t]);

    var deleteNode = useCallback(function (id) {
      setGraph(function (g) {
        return {
          v: g.v,
          nodes: g.nodes.filter(function (n) { return n.id !== id; }),
          edges: g.edges.filter(function (e) { return e.from !== id && e.to !== id; }),
        };
      });
      addToast(t('mindmap.node_deleted') || 'Node deleted', 'info');
    }, [addToast, t]);

    var addEdge = useCallback(function (fromId, toId) {
      if (fromId === toId) return;
      setGraph(function (g) {
        // No duplicates (undirected)
        var exists = g.edges.some(function (e) {
          return (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId);
        });
        if (exists) return g;
        return { v: g.v, nodes: g.nodes, edges: g.edges.concat([{ from: fromId, to: toId }]) };
      });
    }, []);

    var moveNode = useCallback(function (id, x, y) {
      setGraph(function (g) {
        return {
          v: g.v,
          nodes: g.nodes.map(function (n) { return n.id === id ? { id: n.id, x: x, y: y, text: n.text } : n; }),
          edges: g.edges,
        };
      });
    }, []);

    var setNodeText = useCallback(function (id, text) {
      setGraph(function (g) {
        return {
          v: g.v,
          nodes: g.nodes.map(function (n) { return n.id === id ? { id: n.id, x: n.x, y: n.y, text: text } : n; }),
          edges: g.edges,
        };
      });
    }, []);

    // ── JSON I/O ──────────────────────────────────────────────────
    var exportJSON = useCallback(function () {
      try {
        var payload = { v: SCHEMA_VERSION, nodes: graph.nodes, edges: graph.edges, exportedAt: new Date().toISOString(), generator: 'AlloFlow MindMap' };
        var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        var stamp = new Date().toISOString().slice(0, 10);
        a.href = url; a.download = 'alloflow-mindmap-' + stamp + '.json';
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 100);
        addToast(t('mindmap.exported') || 'Mind map exported', 'success');
      } catch (e) {
        addToast((t('mindmap.export_failed') || 'Export failed') + ': ' + e.message, 'error');
      }
    }, [graph, addToast, t]);

    var importJSON = useCallback(function (file) {
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        try {
          var parsed = JSON.parse(ev.target.result);
          var normalized = normalize(parsed);
          if (normalized.nodes.length === 0 && parsed && (parsed.nodes || parsed.edges)) {
            // Parsed but normalization dropped everything — bad shape.
            throw new Error('No valid nodes found in file');
          }
          // Confirm before replacing current graph
          if (graph.nodes.length > 0) {
            var ok = window.confirm(t('mindmap.confirm_import_replace') || 'Replace your current mind map with the imported one? This cannot be undone.');
            if (!ok) return;
          }
          setGraph(normalized);
          addToast((t('mindmap.imported') || 'Imported') + ' ' + normalized.nodes.length + ' nodes, ' + normalized.edges.length + ' connections', 'success');
        } catch (e) {
          addToast((t('mindmap.import_failed') || 'Import failed') + ': ' + e.message, 'error');
        }
      };
      reader.onerror = function () {
        addToast(t('mindmap.import_read_error') || 'Could not read file', 'error');
      };
      reader.readAsText(file);
    }, [graph.nodes.length, addToast, t]);

    var clearAll = useCallback(function () {
      var ok = window.confirm(t('mindmap.confirm_clear') || 'Clear the entire mind map? This cannot be undone.');
      if (!ok) return;
      setGraph(emptyState());
      addToast(t('mindmap.cleared') || 'Mind map cleared', 'info');
    }, [addToast, t]);

    // ── Mouse handlers ───────────────────────────────────────────
    function getSvgCoords(e) {
      var svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      var rect = svg.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function onSvgClick(e) {
      // Only fires when clicking the SVG background (not a node — node handlers stopPropagation).
      if (mode === 'addNode') {
        var pt = getSvgCoords(e);
        addNode(pt.x, pt.y);
        setMode('view'); // one-shot
      }
    }

    function onNodeMouseDown(e, node) {
      e.stopPropagation();
      if (mode === 'view') {
        // Start drag
        var pt = getSvgCoords(e);
        setDragging({ id: node.id, offsetX: pt.x - node.x, offsetY: pt.y - node.y });
      }
    }

    function onSvgMouseMove(e) {
      if (!dragging) return;
      var pt = getSvgCoords(e);
      moveNode(dragging.id, pt.x - dragging.offsetX, pt.y - dragging.offsetY);
    }

    function onSvgMouseUp() {
      if (dragging) setDragging(null);
    }

    function onNodeClick(e, node) {
      e.stopPropagation();
      if (dragging) return; // mouse-up handler will clear
      if (mode === 'connect') {
        if (pendingConnectFrom === null) {
          setPendingConnectFrom(node.id);
        } else if (pendingConnectFrom !== node.id) {
          addEdge(pendingConnectFrom, node.id);
          setPendingConnectFrom(null);
          setMode('view');
        }
      } else if (mode === 'delete') {
        deleteNode(node.id);
      } else {
        // 'view' mode → start editing label on click
        setEditingNodeId(node.id);
        setEditText(node.text);
      }
    }

    function commitEdit() {
      if (editingNodeId) {
        setNodeText(editingNodeId, editText.trim() || 'Untitled');
      }
      setEditingNodeId(null);
      setEditText('');
    }

    function onFileChange(e) {
      var file = e.target && e.target.files && e.target.files[0];
      if (file) importJSON(file);
      // Reset input so re-importing the same file works
      if (e.target) e.target.value = '';
    }

    // ── Render ───────────────────────────────────────────────────
    if (!isOpen) return null;

    var nodeById = {};
    graph.nodes.forEach(function (n) { nodeById[n.id] = n; });

    var edgeElements = graph.edges.map(function (e, i) {
      var a = nodeById[e.from], b = nodeById[e.to];
      if (!a || !b) return null;
      return h('line', {
        key: 'e-' + i,
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        stroke: '#94a3b8', strokeWidth: 2, strokeLinecap: 'round',
      });
    });

    var nodeElements = graph.nodes.map(function (n) {
      var isHover = hoveredId === n.id;
      var isPending = pendingConnectFrom === n.id;
      var fill = isPending ? '#fde68a' : (isHover ? '#dbeafe' : '#ffffff');
      var stroke = isPending ? '#d97706' : (mode === 'connect' ? '#2563eb' : '#475569');
      return h('g', {
        key: n.id,
        onMouseEnter: function () { setHoveredId(n.id); },
        onMouseLeave: function () { setHoveredId(null); },
        onMouseDown: function (e) { onNodeMouseDown(e, n); },
        onClick: function (e) { onNodeClick(e, n); },
        style: { cursor: mode === 'view' ? 'grab' : (mode === 'delete' ? 'not-allowed' : 'pointer') },
      },
        h('circle', { cx: n.x, cy: n.y, r: NODE_R, fill: fill, stroke: stroke, strokeWidth: 2 }),
        h('text', {
          x: n.x, y: n.y, textAnchor: 'middle', dominantBaseline: 'central',
          fontSize: 12, fontWeight: 600, fill: '#1e293b',
          style: { userSelect: 'none', pointerEvents: 'none' },
        }, n.text.length > 14 ? n.text.slice(0, 13) + '…' : n.text)
      );
    });

    // Pending-connect helper line from the pending node to mouse position
    // (Skipped — drawing a real line requires global mouse-track state that
    //  adds complexity; visual feedback comes from the orange-highlighted
    //  pending node + the "Click another node to connect" hint instead.)

    var toolbarBtn = function (label, active, onClick, ariaLabel, color) {
      var base = 'px-3 py-1.5 rounded-md text-xs font-bold border transition-all flex items-center gap-1.5 ';
      var cls = active
        ? 'bg-' + (color || 'indigo') + '-600 text-white border-' + (color || 'indigo') + '-700 shadow-sm'
        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50';
      return h('button', { onClick: onClick, className: base + cls, 'aria-pressed': active, 'aria-label': ariaLabel || label }, label);
    };

    var editingNode = editingNodeId ? nodeById[editingNodeId] : null;

    return h('div', {
      className: 'fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex flex-col allo-section-enter',
      role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Mind Map',
    },
      // Top bar
      h('div', { className: 'bg-white border-b border-slate-300 px-5 py-3 flex items-center gap-3 shadow-sm' },
        h('span', { className: 'text-2xl select-none', 'aria-hidden': 'true' }, '🧩'),
        h('div', { className: 'flex-grow' },
          h('h2', { className: 'text-base font-bold text-slate-800 leading-tight' }, t('mindmap.title') || 'Mind Map'),
          h('p', { className: 'text-[11px] text-slate-600 leading-tight' },
            (graph.nodes.length || 0) + ' ' + (t('mindmap.nodes') || 'nodes') + ' · ' +
            (graph.edges.length || 0) + ' ' + (t('mindmap.connections') || 'connections')
          )
        ),
        h('button', {
          onClick: onClose, 'aria-label': t('common.close') || 'Close',
          className: 'p-2 rounded-md hover:bg-slate-100 text-slate-700 transition-colors text-lg',
        }, '✕')
      ),
      // Toolbar
      h('div', { className: 'bg-slate-50 border-b border-slate-200 px-5 py-2 flex items-center gap-2 flex-wrap' },
        toolbarBtn('+ ' + (t('mindmap.add_node') || 'Add node'), mode === 'addNode', function () {
          setMode(mode === 'addNode' ? 'view' : 'addNode');
          setPendingConnectFrom(null);
        }, t('mindmap.add_node_aria') || 'Add a new node — click empty canvas after activating'),
        toolbarBtn('🔗 ' + (t('mindmap.connect') || 'Connect'), mode === 'connect', function () {
          setMode(mode === 'connect' ? 'view' : 'connect');
          setPendingConnectFrom(null);
        }, t('mindmap.connect_aria') || 'Connect two nodes — click first node then second after activating'),
        toolbarBtn('🗑 ' + (t('mindmap.delete') || 'Delete'), mode === 'delete', function () {
          setMode(mode === 'delete' ? 'view' : 'delete');
          setPendingConnectFrom(null);
        }, t('mindmap.delete_aria') || 'Delete a node — click a node after activating'),
        h('div', { className: 'w-px h-5 bg-slate-300 mx-1' }),
        toolbarBtn('💾 ' + (t('mindmap.export') || 'Export JSON'), false, exportJSON, t('mindmap.export_aria') || 'Download your mind map as a JSON file'),
        toolbarBtn('📂 ' + (t('mindmap.import') || 'Import JSON'), false, function () { if (fileInputRef.current) fileInputRef.current.click(); }, t('mindmap.import_aria') || 'Load a mind map from a JSON file'),
        h('input', { ref: fileInputRef, type: 'file', accept: 'application/json,.json', onChange: onFileChange, style: { display: 'none' } }),
        h('div', { className: 'flex-grow' }),
        toolbarBtn('Clear all', false, clearAll, t('mindmap.clear_aria') || 'Clear the entire mind map')
      ),
      // Hint bar (mode-aware)
      h('div', { className: 'bg-amber-50 border-b border-amber-200 px-5 py-1.5 text-[11px] text-amber-900 italic' },
        mode === 'addNode' ? (t('mindmap.hint_add') || 'Click an empty area on the canvas to drop a new node.')
        : mode === 'connect' ? (pendingConnectFrom
            ? (t('mindmap.hint_connect_2') || 'Now click a second node to connect them.')
            : (t('mindmap.hint_connect_1') || 'Click a first node to start the connection.'))
        : mode === 'delete' ? (t('mindmap.hint_delete') || 'Click any node to delete it (cannot be undone).')
        : (t('mindmap.hint_view') || 'Drag nodes to rearrange. Click a node to rename it. Your work auto-saves.')
      ),
      // Canvas
      h('div', { className: 'flex-grow bg-white overflow-auto relative' },
        h('svg', {
          ref: svgRef,
          width: CANVAS_DEFAULT_W,
          height: CANVAS_DEFAULT_H,
          onClick: onSvgClick,
          onMouseMove: onSvgMouseMove,
          onMouseUp: onSvgMouseUp,
          onMouseLeave: onSvgMouseUp,
          style: { display: 'block', cursor: mode === 'addNode' ? 'crosshair' : 'default' },
          'aria-label': t('mindmap.canvas_aria') || 'Mind map canvas — nodes connected by lines',
        },
          // Background grid for visual anchoring
          h('defs', null,
            h('pattern', { id: 'mm-grid', width: 24, height: 24, patternUnits: 'userSpaceOnUse' },
              h('path', { d: 'M 24 0 L 0 0 0 24', fill: 'none', stroke: '#f1f5f9', strokeWidth: 1 })
            )
          ),
          h('rect', { x: 0, y: 0, width: CANVAS_DEFAULT_W, height: CANVAS_DEFAULT_H, fill: 'url(#mm-grid)' }),
          edgeElements,
          nodeElements
        ),
        // Empty-state overlay
        graph.nodes.length === 0 && h('div', {
          className: 'absolute inset-0 flex flex-col items-center justify-center pointer-events-none',
        },
          h('span', { className: 'text-6xl mb-3 allo-empty-float select-none', 'aria-hidden': 'true' }, '🧩'),
          h('h3', { className: 'text-lg font-bold text-slate-700 mb-1' }, t('mindmap.empty_title') || 'No nodes yet'),
          h('p', { className: 'text-sm text-slate-600 max-w-sm text-center' },
            t('mindmap.empty_hint') || 'Click "+ Add node" in the toolbar above, then click anywhere on the canvas to drop your first idea.')
        )
      ),
      // Edit-label overlay
      editingNode && h('div', {
        className: 'fixed inset-0 bg-black/50 z-[110] flex items-center justify-center',
        onClick: function (e) { if (e.target === e.currentTarget) commitEdit(); },
      },
        h('div', { className: 'bg-white rounded-xl shadow-2xl p-5 w-full max-w-sm' },
          h('h3', { className: 'text-sm font-bold text-slate-800 mb-2' }, t('mindmap.edit_label') || 'Edit node text'),
          h('input', {
            autoFocus: true,
            value: editText,
            onChange: function (e) { setEditText(e.target.value); },
            onKeyDown: function (e) { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditingNodeId(null); setEditText(''); } },
            className: 'w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500',
            'aria-label': t('mindmap.edit_label_aria') || 'New text for this node',
          }),
          h('div', { className: 'flex gap-2 mt-3 justify-end' },
            h('button', { onClick: function () { setEditingNodeId(null); setEditText(''); }, className: 'px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors' }, t('common.cancel') || 'Cancel'),
            h('button', { onClick: commitEdit, className: 'px-3 py-1.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors' }, t('common.save') || 'Save')
          )
        )
      )
    );
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.MindMap = MindMapModal;
  console.log('[MindMap] Registered MindMapModal');
})();
