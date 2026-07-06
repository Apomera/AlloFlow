// ═══════════════════════════════════════════════════════════════════════
// AlloFlow STEM Lab — Whiteboard (Excalidraw + education templates)
//
// The tool itself is a COMPANION WINDOW (whiteboard/whiteboard.html):
// Excalidraw (excalidraw.com, MIT) — the open-source hand-drawn-style sketch &
// diagram canvas — loaded as a UMD library + React 18 from a CDN and mounted
// into a <div> (no iframe → no X-Frame-Options problem; same CDN-library shape
// as the Molecule/Zoom shelves). A freehand surface for "multiple means of
// expression" (UDL): students sketch their thinking; teachers make quick
// visuals.
//
// Unlike the coach shelves there is NO AI relay — the whiteboard is
// self-sufficient (draw + Excalidraw's own save/export). The AlloFlow layer is
// a set of graphic-organizer TEMPLATES (Venn, T-chart, story map, KWL, concept
// web, number line) + one-click PNG export, all inside the popup. This opener
// just launches it and tracks quest progress via a tiny bridge (allocwb-*):
//   popup ── allocwb-hello ─────────▶ here (marks opened)
//   popup ── allocwb-template ──────▶ here (bumps templatesUsed)
//   popup ── allocwb-export ────────▶ here (bumps exports)
//
// Nothing persisted except quest-slice counters in '_whiteboard'.
// ═══════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  var WHITEBOARD_URL = 'https://alloflow-cdn.pages.dev/whiteboard/whiteboard.html?v=1';

  window.StemLab.registerTool('whiteboard', {
    icon: '✏️',
    label: 'Whiteboard',
    desc: 'A freehand sketch and diagram canvas (Excalidraw) for drawing ideas, mapping thinking, and quick visuals — with ready-made graphic organizers (Venn, T-chart, story map, KWL, concept web, number line) and one-click image export. A "multiple means of expression" surface for every learner.',
    color: 'indigo',
    category: 'general',
    questHooks: [
      { id: 'wb_open', label: 'Open the whiteboard', icon: '✏️',
        check: function (d) { return !!(d && d.opened); } },
      { id: 'wb_template', label: 'Start from a graphic-organizer template', icon: '📋',
        check: function (d) { return !!(d && (d.templatesUsed || 0) >= 1); } },
      { id: 'wb_export', label: 'Export a drawing as an image', icon: '⬇️',
        check: function (d) { return !!(d && (d.exports || 0) >= 1); } }
    ],
    render: function (ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var t = ctx.t || function (k, fb) { return fb != null ? fb : k; };
      var announceToSR = ctx.announceToSR;
      var setLabToolData = ctx.setToolData;

      var _win = React.useRef(null);
      var _st = React.useState('idle'); var popupState = _st[0], setPopupState = _st[1];

      function bumpSlice(key) {
        setLabToolData(function (prev) {
          var cur = Object.assign({}, (prev && prev._whiteboard) || {});
          cur[key] = (cur[key] || 0) + 1;
          if (key === 'openedCount') cur.opened = true;
          var next = Object.assign({}, prev); next._whiteboard = cur; return next;
        });
      }

      // ── Quest bridge (no AI) ──
      React.useEffect(function () {
        function onMsg(ev) {
          var data = ev && ev.data;
          if (!data || typeof data.type !== 'string') return;
          if (data.type === 'allocwb-hello') { setPopupState('open'); return; }
          if (data.type === 'allocwb-closed') { setPopupState('closed'); return; }
          if (data.type === 'allocwb-template') { bumpSlice('templatesUsed'); return; }
          if (data.type === 'allocwb-export') { bumpSlice('exports'); return; }
        }
        window.addEventListener('message', onMsg);
        return function () { window.removeEventListener('message', onMsg); };
      }, []);

      function openBoard() {
        var existing = _win.current;
        if (existing && !existing.closed) { try { existing.focus(); } catch (_) {} return; }
        var w = null;
        try { w = window.open(WHITEBOARD_URL, 'alloflow-whiteboard', 'width=1280,height=860'); } catch (_) { w = null; }
        if (!w) {
          setPopupState('blocked');
          if (announceToSR) announceToSR(t('stem.whiteboard.popup_blocked', 'The Whiteboard window was blocked. Allow pop-ups for this page, then try again.'));
          return;
        }
        _win.current = w;
        setPopupState('opening');
        bumpSlice('openedCount');
        if (announceToSR) announceToSR(t('stem.whiteboard.opened_sr', 'Opened the Whiteboard in a new window.'));
      }

      return h('div', { className: 'flex flex-col gap-4 animate-in fade-in duration-300 max-w-2xl' },
        h('h2', { className: 'text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400' },
          t('stem.whiteboard.title', '✏️ Whiteboard — draw and diagram your ideas')),
        h('p', { className: 'text-sm text-slate-300 leading-relaxed' },
          t('stem.whiteboard.blurb', 'Open a full drawing canvas (Excalidraw) in its own window — sketch freehand, build diagrams, and map ideas. Start from a ready-made graphic organizer (Venn diagram, T-chart, story map, KWL chart, concept web, number line) or a blank canvas, then export your work as an image. A flexible way for every learner to show what they know by drawing it.')),
        h('div', { className: 'bg-slate-800/60 rounded-xl p-3 border border-slate-700 text-xs text-slate-300 space-y-1.5' },
          h('div', null, '🖊️ ' + t('stem.whiteboard.note1', 'Your drawing stays in the whiteboard window — nothing is saved or sent until you export or save it.')),
          h('div', null, '📋 ' + t('stem.whiteboard.note2', 'Pick a graphic-organizer template to start with a scaffold, or draw on a blank canvas.'))),
        h('button', {
          onClick: openBoard,
          className: 'px-4 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-600/20 transition-all w-fit',
          'aria-label': t('stem.whiteboard.open_title', 'Open the Whiteboard in a new window (Excalidraw drawing canvas with graphic-organizer templates)')
        }, t('stem.whiteboard.open', '✏️ Open Whiteboard')),
        popupState === 'blocked' && h('p', { className: 'text-xs text-amber-300' },
          t('stem.whiteboard.blocked_note', 'Pop-up blocked — allow pop-ups for this page and try again.')),
        popupState === 'open' && h('p', { className: 'text-xs text-emerald-300' },
          t('stem.whiteboard.open_note', 'Whiteboard is open in its own window.')),
        h('p', { className: 'text-[11px] text-slate-500 leading-relaxed' },
          t('stem.whiteboard.credit', 'Drawing canvas: Excalidraw (excalidraw.com), free and open source under the MIT license. It loads from the web, so the whiteboard needs internet. Your drawing is private — nothing leaves the window until you export or save it.'))
      );
    }
  });
  console.log('[StemLab] stem_tool_whiteboard.js loaded — Whiteboard (Excalidraw + graphic-organizer templates)');
})();
