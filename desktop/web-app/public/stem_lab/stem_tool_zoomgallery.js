// ═══════════════════════════════════════════════════════════════════════
// AlloFlow STEM Lab — Zoom Gallery (OpenSeadragon deep-zoom + Notice-Wonder coach)
//
// The shelf itself is a COMPANION WINDOW (zoom_gallery/zoom_gallery.html):
// OpenSeadragon (openseadragon.github.io, BSD-3-Clause) — the deep-zoom / pan
// viewer museums and archives use — showing openly-licensed images you can
// magnify to the pixel: Smithsonian Open Access artifacts served as IIIF tile
// pyramids (CC0) and famous NASA photographs (public domain). It complements
// the science tools by making "look closely" its own skill — a low-vision and
// attention-to-detail win as much as a science one.
//
// This tool is the launcher + AI bridge. Like the Molecule Shelf, the coach is
// an OBSERVING tutor (you don't "predict" a photograph): NOTICE → WONDER. The
// student records what they notice while zooming and what they wonder; the AI
// (when enabled) responds Socratically — never lectures the content. Bridge
// protocol mirrors the shelves, renamed alloczoom-* :
//   popup ── alloczoom-hello ──────────▶ here (replies -ready {ai})
//   popup ── alloczoom-ai-request ─────▶ here ── ctx.callGemini ──▶ Gemini
//   popup ◀─ alloczoom-ai-response ──── here
//
// House rules: zero AI traffic unless ctx.aiHintsEnabled AND the student
// pressed the coach button; nothing persisted except quest-slice counters in
// '_zoomGallery'.
// ═══════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  var ZOOM_GALLERY_CDN_URL = 'https://alloflow-cdn.pages.dev/zoom_gallery/zoom_gallery.html?v=1';
  function companionUrl(path, cdnUrl) {
    try {
      var loc = window.location || {};
      var host = loc.hostname || '';
      var pathname = loc.pathname || '';
      var isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(host);
      var isDesktopBundled = !!window._isDesktopBundledApp || (isLocalHost && pathname.indexOf('/app/') === 0);
      var isAlloHosted = /(^|\.)alloflow/i.test(host) || /(^|\.)web\.app$/i.test(host) || /(^|\.)firebaseapp\.com$/i.test(host);
      if (isDesktopBundled) return new URL(path, loc.href).toString();
      if (isLocalHost || isAlloHosted) return new URL('/' + String(path).replace(/^\/+/, ''), loc.origin).toString();
    } catch (_) {}
    return cdnUrl;
  }
  var ZOOM_GALLERY_URL = companionUrl('zoom_gallery/zoom_gallery.html?v=1', ZOOM_GALLERY_CDN_URL);

  function buildCoachPrompt(image, meta, notice, wonder) {
    return [
      'You are a warm, Socratic OBSERVATION COACH for a K-12 student zooming into a real, openly-licensed image: "' + String(image || '').slice(0, 120) + '"' + (meta ? ' (' + String(meta).slice(0, 160) + ')' : '') + '.',
      'They wrote what they NOTICE:',
      '"' + String(notice || '(nothing yet)').slice(0, 600) + '"',
      'And what they WONDER:',
      '"' + String(wonder || '').slice(0, 600) + '"',
      'RULES:',
      '- At most 4 sentences, ending in exactly ONE question.',
      '- Build on their OWN observation — quote a few of their words back.',
      '- Never deliver the full textbook explanation. Point them to look harder at a specific detail (an edge, a texture, a repeated pattern, a bright spot) and reason about it.',
      '- If their notice is vague, ask them to zoom into ONE spot and describe exactly what is there.',
      '- Warm, grade-appropriate, jargon-free. Plain text only.'
    ].join('\n');
  }

  window.StemLab.registerTool('zoomGallery', {
    icon: '🔍',
    label: 'Zoom Gallery',
    desc: 'Zoom deep into real, openly-licensed images — Smithsonian Open Access artifacts (CC0) and famous NASA photographs (public domain) — in OpenSeadragon, the viewer museums use. Magnify to the pixel: the Pillars of Creation, an Apollo bootprint, the Apollo 11 capsule, a coral fan. A Notice → Wonder coach sits beside the viewer.',
    color: 'sky',
    category: 'general',
    questHooks: [
      { id: 'zoom_open', label: 'Open an image and zoom in', icon: '🔍',
        check: function (d) { return !!(d && d.opened); } },
      { id: 'zoom_notice', label: 'Record what you notice up close', icon: '🔬',
        check: function (d) { return !!(d && (d.noticedCount || 0) >= 1); } },
      { id: 'zoom_coach', label: 'Take your observation to the coach', icon: '💬',
        check: function (d) { return !!(d && (d.coachCount || 0) >= 1); } }
    ],
    render: function (ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var t = ctx.t || function (k, fb) { return fb != null ? fb : k; };
      var announceToSR = ctx.announceToSR;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;

      var _win = React.useRef(null);
      var _st = React.useState('idle'); var popupState = _st[0], setPopupState = _st[1];

      var aiOn = !!(ctx.aiHintsEnabled && typeof ctx.callGemini === 'function');

      function bumpSlice(key) {
        setLabToolData(function (prev) {
          var cur = Object.assign({}, (prev && prev._zoomGallery) || {});
          cur[key] = (cur[key] || 0) + 1;
          if (key === 'openedCount') cur.opened = true;
          var next = Object.assign({}, prev); next._zoomGallery = cur; return next;
        });
      }

      // ── AI bridge ──
      React.useEffect(function () {
        function onMsg(ev) {
          var data = ev && ev.data;
          if (!data || typeof data.type !== 'string') return;
          if (data.type === 'alloczoom-hello') {
            try { if (ev.source) ev.source.postMessage({ type: 'alloczoom-ready', ai: aiOn }, '*'); } catch (_) {}
            setPopupState('open');
            return;
          }
          if (data.type === 'alloczoom-closed') { setPopupState('closed'); return; }
          if (data.type === 'alloczoom-noticed') { bumpSlice('noticedCount'); return; }
          if (data.type !== 'alloczoom-ai-request' || !data.id) return;
          var replyTo = ev.source || _win.current;
          var respond = function (payload) {
            try { if (replyTo) replyTo.postMessage(Object.assign({ type: 'alloczoom-ai-response', id: data.id }, payload), '*'); } catch (_) {}
          };
          if (!aiOn) { respond({ error: 'ai-disabled' }); return; }
          bumpSlice('coachCount');
          var prompt = buildCoachPrompt(data.image, data.meta, data.notice, data.wonder);
          Promise.resolve().then(function () {
            return ctx.callGemini(prompt, false, false, 0.7);
          }).then(function (resp) {
            var text = (typeof resp === 'string') ? resp : ((resp && (resp.text || resp.output || resp.response)) || '');
            respond({ text: String(text || '').slice(0, 1000) });
          }).catch(function (e) {
            respond({ error: String((e && e.message) || e).slice(0, 120) });
          });
        }
        window.addEventListener('message', onMsg);
        return function () { window.removeEventListener('message', onMsg); };
      }, [aiOn]);

      function openShelf() {
        var existing = _win.current;
        if (existing && !existing.closed) { try { existing.focus(); } catch (_) {} return; }
        var lang = (ctx.lang || 'en');
        var w = null;
        try { w = window.open(ZOOM_GALLERY_URL + '&lang=' + encodeURIComponent(lang) + '&theme=' + encodeURIComponent(ctx.theme || 'dark'), 'alloflow-zoom-gallery', 'width=1280,height=860'); } catch (_) { w = null; }
        if (!w) {
          setPopupState('blocked');
          if (announceToSR) announceToSR(t('stem.zoomGallery.popup_blocked', 'The Zoom Gallery window was blocked. Allow pop-ups for this page, then try again.'));
          return;
        }
        _win.current = w;
        setPopupState('opening');
        bumpSlice('openedCount');
        if (announceToSR) announceToSR(t('stem.zoomGallery.opened_sr', 'Opened the Zoom Gallery in a new window.'));
      }

      function returnToCatalog() {
        if (typeof setStemLabTool !== 'function') return;
        setStemLabTool(null);
        if (announceToSR) announceToSR(t('stem.zoomGallery.returned_catalog_sr', 'Returned to the STEM Lab tools.'));
      }

      return h('div', { className: 'flex flex-col gap-4 animate-in fade-in duration-300 max-w-2xl' },
        typeof setStemLabTool === 'function' && h('button', {
          onClick: returnToCatalog,
          className: 'inline-flex w-fit items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-800 active:scale-[0.97]',
          'aria-label': t('stem.zoomGallery.back_to_tools', 'Back to STEM Lab tools')
        },
          ArrowLeft ? h(ArrowLeft, { size: 16 }) : null,
          h('span', null, t('stem.zoomGallery.back_to_tools', 'Back to STEM Lab tools'))
        ),
        h('h2', { className: 'text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400' },
          t('stem.zoomGallery.title', '🔍 Zoom Gallery — real images, up close')),
        h('p', { className: 'text-sm text-slate-300 leading-relaxed' },
          t('stem.zoomGallery.blurb', 'Zoom deep into real, openly-licensed images in OpenSeadragon — the deep-zoom viewer museums and archives use. Magnify to the pixel: the Pillars of Creation, Saturn\'s rings, an Apollo bootprint on the Moon, the real Apollo 11 capsule, a branching coral fan. A Notice → Wonder coach sits beside the viewer: you record what you see up close and what it makes you curious about, and the coach asks a question back.')),
        h('div', { className: 'bg-slate-800/60 rounded-xl p-3 border border-slate-700 text-xs text-slate-300 space-y-1.5' },
          h('div', null, '🔬 ' + t('stem.zoomGallery.note1', 'Your notes stay in the gallery window — nothing is saved or graded.')),
          h('div', null, (aiOn ? '✨ ' + t('stem.zoomGallery.ai_on', 'AI coach is ON — it will build on what you notice while this window stays open.')
            : '🌱 ' + t('stem.zoomGallery.ai_off', 'AI hints are off — the gallery still works, with built-in observation prompts instead of the AI coach.')))),
        h('button', {
          onClick: openShelf,
          className: 'px-4 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 shadow-md shadow-sky-600/20 transition-all w-fit',
          'aria-label': t('stem.zoomGallery.open_title', 'Open the Zoom Gallery in a new window (OpenSeadragon deep-zoom viewer with the Notice-Wonder coach)')
        }, t('stem.zoomGallery.open', '🔍 Open Zoom Gallery')),
        popupState === 'opening' && h('p', { className: 'text-xs text-sky-300' },
          t('stem.zoomGallery.opening_note', 'Opening Zoom Gallery. If it does not appear, check your pop-up settings.')),
        popupState === 'blocked' && h('p', { className: 'text-xs text-amber-300' },
          t('stem.zoomGallery.blocked_note', 'Pop-up blocked — allow pop-ups for this page and try again.')),
        popupState === 'open' && h('p', { className: 'text-xs text-emerald-300' },
          t('stem.zoomGallery.open_note', 'Zoom Gallery is open. Keep this AlloFlow window open too — it powers the AI coach.')),
        popupState === 'closed' && h('p', { className: 'text-xs text-slate-400' },
          t('stem.zoomGallery.closed_note', 'Zoom Gallery was closed. You can reopen it whenever you are ready.')),
        h('p', { className: 'text-[11px] text-slate-500 leading-relaxed' },
          t('stem.zoomGallery.credit', 'Viewer: OpenSeadragon (openseadragon.github.io), free and open source under the BSD-3-Clause license. Images: Smithsonian Open Access (released CC0) served as IIIF deep-zoom tiles, and NASA photographs (public domain). Each image lists its source and a link to the original record. The viewer and images load from the web, so the gallery needs internet.'))
      );
    }
  });
  console.log('[StemLab] stem_tool_zoomgallery.js loaded — Zoom Gallery (OpenSeadragon + Notice-Wonder coach)');
})();
