// ═══════════════════════════════════════════════════════════════════════
// AlloFlow STEAM Lab — Timeline Studio (TimelineJS + AI document→timeline)
//
// The renderer is a COMPANION WINDOW (timeline_studio/timeline_studio.html)
// that embeds TimelineJS3 by Northwestern University Knight Lab
// (timeline.knightlab.com, MPL-2.0) — the interactive timeline behind many
// newsroom features. Unlike the Sim/Circuit/Molecule shelves (which wrap an
// external sandbox), the value here is the AlloFlow AI layer: this tool turns
// ANY text — a history reading, a biography, a science-discovery passage —
// into a TimelineJS JSON document (via ctx.callGemini), then hands it to the
// popup to render. That gives teachers a one-click "reading → interactive
// timeline" transform and a new means of representation (UDL). Students can
// also build a timeline event-by-event by hand with AI off.
//
// Bridge (opener HOLDS the data; popup RENDERS it):
//   popup ── allotimeline-hello ─────▶ here (replies -data { timeline })
//   here  ── allotimeline-data ──────▶ popup (also pushed on regenerate)
//
// House rules: AI runs only on an explicit "Generate" click and only when
// ctx.aiHintsEnabled; the source text and generated timeline stay in memory
// (nothing persisted except _timeline quest counters). Prompt is
// factually-careful and forbids inventing precise dates (scientific-integrity
// stance).
// ═══════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  var TIMELINE_STUDIO_CDN_URL = 'https://alloflow-cdn.pages.dev/timeline_studio/timeline_studio.html?v=1';
  function companionUrl(path, cdnUrl) {
    try {
      var loc = window.location || {};
      var host = loc.hostname || '';
      var pathname = loc.pathname || '';
      var isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(host);
      var isDesktopBundled = !!window._isDesktopBundledApp || (isLocalHost && pathname.indexOf('/app/') === 0);
      var isAlloHosted = /^alloflow-cdn\.pages\.dev$/i.test(host) || /^(?:(?:www|app|cdn)\.)?alloflow\.org$/i.test(host);
      if (isDesktopBundled) return new URL(path, loc.href).toString();
      if (isLocalHost || isAlloHosted) return new URL('/' + String(path).replace(/^\/+/, ''), loc.origin).toString();
    } catch (_) {}
    return cdnUrl;
  }
  var TIMELINE_STUDIO_URL = companionUrl('timeline_studio/timeline_studio.html?v=1', TIMELINE_STUDIO_CDN_URL);
  // Bridge trust: only the pop-up this tool opened, at the companion's own origin,
  // may drive the bridge. Opaque origins (file://) report "null", which postMessage
  // rejects as a target, so those fall back to '*' and rely on the source check.
  var TIMELINE_STUDIO_ORIGIN = (function () {
    try { var o = new URL(TIMELINE_STUDIO_URL, (window.location && window.location.href) || undefined).origin; return (o && o !== 'null') ? o : '*'; } catch (_) { return '*'; }
  })();
  var _timelinePopup = null; // module scope: a still-open pop-up keeps working after a remount
  function _timelineBridgeTrusted(ev, win) {
    var src = ev && ev.source;
    if (!src || (src !== win && src !== _timelinePopup)) return false;
    return TIMELINE_STUDIO_ORIGIN === '*' || ev.origin === TIMELINE_STUDIO_ORIGIN;
  }

  function buildTimelinePrompt(sourceText, grade) {
    return [
      'You convert a passage of text into a JSON timeline in TimelineJS3 format for a ' + (grade || 'middle-school') + ' audience.',
      'Return ONLY a JSON object of exactly this shape (no markdown, no commentary):',
      '{"title":{"text":{"headline":"<short title>","text":"<one sentence on what this timeline shows>"}},"events":[{"start_date":{"year":"YYYY","month":"M","day":"D"},"text":{"headline":"<<=8 words>","text":"<1-2 plain factual sentences>"}}]}',
      'RULES:',
      '- 6 to 14 events, in chronological order (earliest first).',
      '- Every event MUST include start_date.year as a numeric string (e.g. "1969"). "month" and "day" are OPTIONAL — include them ONLY if the text clearly gives them; NEVER invent a precise date.',
      '- For dates before year 1, use a negative year string (e.g. "-3000") and mention BCE in the headline.',
      '- headline: at most 8 words. text: 1-2 sentences, factually careful, grade-appropriate, no markdown, no citations.',
      '- Only include events actually supported by the passage. Do not add outside "famous" events that are not in the text.',
      '- If the passage contains no datable events, return {"title":{"text":{"headline":"No dated events found","text":"This text did not contain clear dates to place on a timeline."}},"events":[]}.',
      'Passage:',
      '"""',
      String(sourceText || '').slice(0, 12000),
      '"""'
    ].join('\n');
  }

  // Normalize whatever callGemini returns (object in JSON mode, or a string
  // that may be fenced) into a TimelineJS data object, or null.
  function coerceTimeline(raw) {
    var obj = raw;
    if (typeof raw === 'string') {
      var s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
      try { obj = JSON.parse(s); } catch (_) { return null; }
    }
    if (!obj || typeof obj !== 'object' || !Array.isArray(obj.events)) return null;
    // Keep only events with a usable year.
    obj.events = obj.events.filter(function (e) {
      return e && e.start_date && (e.start_date.year !== undefined && e.start_date.year !== null && String(e.start_date.year).trim() !== '');
    }).map(function (e) {
      // TimelineJS wants string-ish date parts; coerce.
      var d = e.start_date || {};
      var nd = { year: String(d.year).trim() };
      if (d.month !== undefined && d.month !== null && String(d.month).trim() !== '') nd.month = String(d.month).trim();
      if (d.day !== undefined && d.day !== null && String(d.day).trim() !== '') nd.day = String(d.day).trim();
      return { start_date: nd, text: { headline: (e.text && e.text.headline) || '', text: (e.text && e.text.text) || '' } };
    });
    return obj;
  }

  window.StemLab.registerTool('timelineStudio', {
    icon: '🕰️',
    label: 'Timeline Studio',
    desc: 'Turn any reading — history, a biography, a science-discovery passage — into an interactive TimelineJS timeline. Paste or drop in text and the AI pulls out the dated events; scroll, zoom, and step through them. You can also build a timeline event by event yourself.',
    color: 'rose',
    category: 'history',
    aliases: ['timeline', 'TimelineJS', 'history', 'dated events'],
    // bumpSlice() writes the quest counters to toolData._timeline, but the host
    // reads quest state from toolData[toolId] || toolData['_' + toolId]
    // (_getToolQuestState in stem_lab_module.js). '_timeline' is neither
    // 'timelineStudio' nor '_timelineStudio', so every check() below received
    // {} and all three quests could never complete, however much a student did.
    // Naming the key the tool actually writes is the fix that preserves any
    // counters already saved; renaming the writes would orphan them.
    questDataKey: '_timeline',
    questHooks: [
      { id: 'tl_open', label: 'Open a timeline', icon: '🕰️',
        check: function (d) { return !!(d && d.opened); } },
      { id: 'tl_generate', label: 'Turn a reading into a timeline', icon: '✨',
        check: function (d) { return !!(d && (d.generatedCount || 0) >= 1); } },
      { id: 'tl_build', label: 'Add a timeline event by hand', icon: '✍️',
        check: function (d) { return !!(d && (d.manualCount || 0) >= 1); } }
    ],
    render: function (ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var t = ctx.t || function (k, fb) { return fb != null ? fb : k; };
      var announceToSR = ctx.announceToSR;
      var setLabToolData = ctx.setToolData;

      var _win = React.useRef(null);

      React.useEffect(function () {
        var popup = _win.current;
        if (!popup || popup.closed) return;
        var activeTheme = ctx.theme === 'light' || ctx.theme === 'contrast' ? ctx.theme : 'dark';
        try { popup.postMessage({ type: 'alloflow-theme-change', theme: activeTheme }, TIMELINE_STUDIO_ORIGIN); } catch (_) {}
      }, [ctx.theme]);
      var _data = React.useRef(null);   // current TimelineJS object held for the popup
      var _srcState = React.useState('');
      var sourceText = _srcState[0], setSourceText = _srcState[1];
      var _gradeState = React.useState('middle-school');
      var grade = _gradeState[0], setGrade = _gradeState[1];
      var _st = React.useState('idle'); var status = _st[0], setStatus = _st[1];
      var _busy = React.useState(false); var busy = _busy[0], setBusy = _busy[1];

      var aiOn = !!(ctx.aiHintsEnabled && typeof ctx.callGemini === 'function');

      function bumpSlice(key) {
        setLabToolData(function (prev) {
          var cur = Object.assign({}, (prev && prev._timeline) || {});
          cur[key] = (cur[key] || 0) + 1;
          if (key === 'openedCount') cur.opened = true;
          var next = Object.assign({}, prev); next._timeline = cur; return next;
        });
      }

      function sendData() {
        var w = _win.current;
        if (w && !w.closed && _data.current) {
          try { w.postMessage({ type: 'allotimeline-data', timeline: _data.current }, TIMELINE_STUDIO_ORIGIN); } catch (_) {}
        }
      }

      // ── Bridge: popup asks for data on hello ──
      React.useEffect(function () {
        function onMsg(ev) {
          var data = ev && ev.data;
          if (!data || typeof data.type !== 'string') return;
          if (!_timelineBridgeTrusted(ev, _win.current)) return;
          if (data.type === 'allotimeline-hello') {
            var replyTo = ev.source || _win.current;
            try { if (replyTo && _data.current) replyTo.postMessage({ type: 'allotimeline-data', timeline: _data.current }, TIMELINE_STUDIO_ORIGIN); } catch (_) {}
            setStatus('open');
            return;
          }
          if (data.type === 'allotimeline-closed') { setStatus('closed'); return; }
          if (data.type === 'allotimeline-manual-added') { bumpSlice('manualCount'); return; }
        }
        window.addEventListener('message', onMsg);
        return function () { window.removeEventListener('message', onMsg); };
      }, []);

      function openPopup() {
        var existing = _win.current;
        if (existing && !existing.closed) { try { existing.focus(); } catch (_) {} sendData(); return existing; }
        var w = null;
        try { w = window.open(TIMELINE_STUDIO_URL + '&lang=' + encodeURIComponent(ctx.lang || 'en') + '&theme=' + encodeURIComponent(ctx.theme || 'dark'), 'alloflow-timeline-studio', 'width=1200,height=800'); } catch (_) { w = null; }
        if (!w) {
          setStatus('blocked');
          if (announceToSR) announceToSR(t('stem.timeline.popup_blocked', 'The Timeline window was blocked. Allow pop-ups for this page, then try again.'));
          return null;
        }
        _win.current = w;
        _timelinePopup = w;
        bumpSlice('openedCount');
        if (announceToSR) announceToSR(t('stem.timeline.opened_sr', 'Opened Timeline Studio in a new window.'));
        return w;
      }

      function generate() {
        if (busy) return;
        var text = (sourceText || '').trim();
        if (text.length < 40) { setStatus('needtext'); return; }
        if (!aiOn) { setStatus('needsai'); openPopup(); return; }
        setBusy(true); setStatus('thinking');
        Promise.resolve().then(function () {
          return ctx.callGemini(buildTimelinePrompt(text, grade), true, false, 0.3);
        }).then(function (raw) {
          var tl = coerceTimeline(raw);
          setBusy(false);
          if (!tl || !tl.events || !tl.events.length) { setStatus('noevents'); return; }
          _data.current = tl;
          bumpSlice('generatedCount');
          setStatus('ready');
          var w = openPopup();
          // popup may already be open — push immediately; also covered by hello.
          if (w) setTimeout(sendData, 400);
        }).catch(function (e) {
          setBusy(false);
          setStatus('error:' + String((e && e.message) || e).slice(0, 80));
        });
      }

      var isContrast = ctx.theme === 'contrast';
      var isDark = ctx.theme === 'dark';
      var generatedCount = (_data.current && Array.isArray(_data.current.events)) ? _data.current.events.length : 0;

      // Bespoke Chronometer Crest Emblem SVG (pure visual craft, HC-safe)
      function renderTimelineEmblem() {
        var ringStroke = isContrast ? '#ffff00' : 'url(#tl-emb-ring)';
        var handCol = isContrast ? '#00ffff' : '#fda4af';
        return h('svg', {
          width: 40, height: 40, viewBox: '0 0 44 44', 'aria-hidden': 'true', focusable: 'false',
          className: 'shrink-0',
          style: {
            borderRadius: 11,
            background: isContrast ? '#000000' : 'linear-gradient(145deg,#1e1b4b,#0f172a)',
            border: isContrast ? '2px solid #ffff00' : '1px solid rgba(251,113,133,0.42)',
            boxShadow: isContrast ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.14), 0 4px 12px rgba(2,6,23,0.45)'
          }
        },
          !isContrast ? h('defs', null,
            h('radialGradient', { id: 'tl-emb-aura', cx: '50%', cy: '50%', r: '52%' },
              h('stop', { offset: '0%', stopColor: '#fb7185', stopOpacity: '0.32' }),
              h('stop', { offset: '100%', stopColor: '#0f172a', stopOpacity: '0' })
            ),
            h('linearGradient', { id: 'tl-emb-ring', x1: '0', y1: '0', x2: '1', y2: '1' },
              h('stop', { offset: '0%', stopColor: '#fecdd3' }),
              h('stop', { offset: '55%', stopColor: '#fb7185' }),
              h('stop', { offset: '100%', stopColor: '#a855f7' })
            )
          ) : null,
          !isContrast ? h('rect', { x: 0, y: 0, width: 44, height: 44, rx: 11, fill: 'url(#tl-emb-aura)' }) : null,
          h('circle', { cx: 22, cy: 22, r: 14, fill: 'none', stroke: ringStroke, strokeWidth: 2 }),
          h('circle', { cx: 22, cy: 22, r: 10.5, fill: 'none', stroke: isContrast ? '#ffffff' : 'rgba(244,114,182,0.35)', strokeWidth: 0.9, strokeDasharray: '2 2.5' }),
          h('line', { x1: 22, y1: 11, x2: 22, y2: 13.5, stroke: isContrast ? '#ffff00' : '#fda4af', strokeWidth: 1.5, strokeLinecap: 'round' }),
          h('line', { x1: 33, y1: 22, x2: 30.5, y2: 22, stroke: isContrast ? '#ffff00' : '#fda4af', strokeWidth: 1.5, strokeLinecap: 'round' }),
          h('line', { x1: 22, y1: 33, x2: 22, y2: 30.5, stroke: isContrast ? '#ffff00' : '#fda4af', strokeWidth: 1.5, strokeLinecap: 'round' }),
          h('line', { x1: 11, y1: 22, x2: 13.5, y2: 22, stroke: isContrast ? '#ffff00' : '#fda4af', strokeWidth: 1.5, strokeLinecap: 'round' }),
          h('line', { x1: 22, y1: 22, x2: 22, y2: 14.8, stroke: isContrast ? '#ffffff' : '#f8fafc', strokeWidth: 2, strokeLinecap: 'round' }),
          h('line', { x1: 22, y1: 22, x2: 28, y2: 25, stroke: handCol, strokeWidth: 1.8, strokeLinecap: 'round' }),
          h('circle', { cx: 22, cy: 22, r: 2.3, fill: isContrast ? '#ffff00' : '#fbbf24' })
        );
      }

      // Bespoke Chronology Rail & Era-Band Studio Preview SVG (pure visual framing, zero fake dates/spoilers)
      function renderChronologyRailSvg() {
        var beacons = [
          { x: 76,  cardY: 18, cardW: 66, col: isContrast ? '#ffff00' : '#fb7185', active: generatedCount >= 1 || status === 'open' },
          { x: 196, cardY: 22, cardW: 72, col: isContrast ? '#00ffff' : '#f472b6', active: generatedCount >= 2 || status === 'open' },
          { x: 320, cardY: 15, cardW: 76, col: isContrast ? '#ffff00' : '#fbbf24', active: true },
          { x: 444, cardY: 22, cardW: 72, col: isContrast ? '#00ffff' : '#38bdf8', active: generatedCount >= 4 || status === 'ready' },
          { x: 564, cardY: 18, cardW: 66, col: isContrast ? '#ffff00' : '#34d399', active: generatedCount >= 5 || status === 'ready' }
        ];
        var ticks = [];
        for (var tx = 36; tx <= 604; tx += 16) {
          var isMajor = ((tx - 36) % 64 === 0);
          ticks.push(h('line', {
            key: 'tk-' + tx,
            x1: tx, y1: 82, x2: tx, y2: isMajor ? 92 : 87,
            stroke: isContrast ? '#ffffff' : (isMajor ? 'rgba(226,232,240,0.48)' : 'rgba(148,163,184,0.28)'),
            strokeWidth: isMajor ? 1.2 : 0.85,
            strokeLinecap: 'round'
          }));
        }
        return h('svg', {
          viewBox: '0 0 640 108', width: '100%', role: 'img',
          'aria-label': t('stem.timeline.rail_aria', 'Interactive chronology studio preview showing layered era bands, a calibrated timeline rail, and milestone event markers'),
          style: { display: 'block', borderRadius: 12, maxHeight: 118 }
        },
          !isContrast ? h('defs', null,
            h('linearGradient', { id: 'tl-stage-bg', x1: '0', y1: '0', x2: '0', y2: '1' },
              h('stop', { offset: '0%', stopColor: '#070c19' }),
              h('stop', { offset: '100%', stopColor: '#11192e' })
            ),
            h('linearGradient', { id: 'tl-era-1', x1: '0', y1: '0', x2: '0', y2: '1' },
              h('stop', { offset: '0%', stopColor: '#fb7185', stopOpacity: '0.2' }),
              h('stop', { offset: '100%', stopColor: '#fb7185', stopOpacity: '0.03' })
            ),
            h('linearGradient', { id: 'tl-era-2', x1: '0', y1: '0', x2: '0', y2: '1' },
              h('stop', { offset: '0%', stopColor: '#a855f7', stopOpacity: '0.2' }),
              h('stop', { offset: '100%', stopColor: '#a855f7', stopOpacity: '0.03' })
            ),
            h('linearGradient', { id: 'tl-era-3', x1: '0', y1: '0', x2: '0', y2: '1' },
              h('stop', { offset: '0%', stopColor: '#38bdf8', stopOpacity: '0.2' }),
              h('stop', { offset: '100%', stopColor: '#38bdf8', stopOpacity: '0.03' })
            ),
            h('linearGradient', { id: 'tl-rail-grad', x1: '0', y1: '0', x2: '1', y2: '0' },
              h('stop', { offset: '0%', stopColor: '#fb7185' }),
              h('stop', { offset: '36%', stopColor: '#c084fc' }),
              h('stop', { offset: '68%', stopColor: '#38bdf8' }),
              h('stop', { offset: '100%', stopColor: '#34d399' })
            ),
            h('linearGradient', { id: 'tl-card-bg', x1: '0', y1: '0', x2: '0', y2: '1' },
              h('stop', { offset: '0%', stopColor: '#1e293b' }),
              h('stop', { offset: '100%', stopColor: '#0f172a' })
            )
          ) : null,
          // Recessed chronology stage
          h('rect', {
            x: 1, y: 1, width: 638, height: 106, rx: 11,
            fill: isContrast ? '#000000' : 'url(#tl-stage-bg)',
            stroke: isContrast ? '#ffff00' : 'rgba(148,163,184,0.28)',
            strokeWidth: isContrast ? 2 : 1.2
          }),
          // Corner registration brackets
          h('path', {
            d: 'M10 16 V10 H16 M630 16 V10 H624 M10 92 V98 H16 M630 92 V98 H624',
            fill: 'none', stroke: isContrast ? '#ffff00' : 'rgba(244,114,182,0.45)', strokeWidth: 1.1, strokeLinecap: 'round'
          }),
          // Layered Era Bands with depth shading & top specular accent edge
          h('rect', { x: 24, y: 54, width: 192, height: 26, rx: 5, fill: isContrast ? '#0a0a0a' : 'url(#tl-era-1)', stroke: isContrast ? '#ffff00' : 'rgba(251,113,133,0.32)', strokeWidth: 0.9 }),
          h('rect', { x: 224, y: 54, width: 192, height: 26, rx: 5, fill: isContrast ? '#0a0a0a' : 'url(#tl-era-2)', stroke: isContrast ? '#00ffff' : 'rgba(192,132,252,0.34)', strokeWidth: 0.9 }),
          h('rect', { x: 424, y: 54, width: 192, height: 26, rx: 5, fill: isContrast ? '#0a0a0a' : 'url(#tl-era-3)', stroke: isContrast ? '#ffff00' : 'rgba(56,189,248,0.32)', strokeWidth: 0.9 }),
          !isContrast ? h('line', { x1: 28, y1: 55.2, x2: 212, y2: 55.2, stroke: 'rgba(254,205,211,0.45)', strokeWidth: 1 }) : null,
          !isContrast ? h('line', { x1: 228, y1: 55.2, x2: 412, y2: 55.2, stroke: 'rgba(233,213,255,0.45)', strokeWidth: 1 }) : null,
          !isContrast ? h('line', { x1: 428, y1: 55.2, x2: 612, y2: 55.2, stroke: 'rgba(186,230,253,0.45)', strokeWidth: 1 }) : null,
          // Calibrated tick hierarchy
          ticks,
          // Dual-pass luminous Timeline Rail
          !isContrast ? h('line', { x1: 24, y1: 80, x2: 616, y2: 80, stroke: 'url(#tl-rail-grad)', strokeWidth: 7, strokeOpacity: 0.24, strokeLinecap: 'round' }) : null,
          h('line', { x1: 24, y1: 80, x2: 616, y2: 80, stroke: isContrast ? '#ffff00' : 'url(#tl-rail-grad)', strokeWidth: 2.5, strokeLinecap: 'round' }),
          // Sculpted Milestone Beacons + miniature floating event plaques
          beacons.map(function (b, idx) {
            var cx = b.x;
            var px = cx - b.cardW / 2;
            return h('g', { key: 'mb-' + idx },
              // Vertical stem pin
              h('line', {
                x1: cx, y1: b.cardY + 24, x2: cx, y2: 75,
                stroke: b.col, strokeOpacity: isContrast ? 1 : 0.72, strokeWidth: 1.4, strokeDasharray: '2.5 2'
              }),
              // Sculpted floating miniature event card
              h('rect', {
                x: px, y: b.cardY, width: b.cardW, height: 24, rx: 5,
                fill: isContrast ? '#000000' : 'url(#tl-card-bg)',
                stroke: b.active ? b.col : (isContrast ? '#ffffff' : 'rgba(148,163,184,0.42)'),
                strokeWidth: b.active ? 1.3 : 1
              }),
              h('rect', { x: px + 6, y: b.cardY + 6, width: Math.round(b.cardW * 0.42), height: 3.2, rx: 1.6, fill: b.col }),
              h('rect', { x: px + 6, y: b.cardY + 13, width: Math.round(b.cardW * 0.72), height: 2.4, rx: 1.2, fill: isContrast ? '#ffffff' : 'rgba(203,213,225,0.68)' }),
              h('rect', { x: px + 6, y: b.cardY + 18, width: Math.round(b.cardW * 0.54), height: 2.2, rx: 1.1, fill: isContrast ? '#e5e7eb' : 'rgba(148,163,184,0.48)' }),
              // Milestone beacon on the timeline rail
              (!isContrast && b.active) ? h('circle', { cx: cx, cy: 80, r: 9, fill: b.col, fillOpacity: 0.22 }) : null,
              h('circle', { cx: cx, cy: 80, r: 5.2, fill: isContrast ? '#000000' : '#0b1120', stroke: b.col, strokeWidth: 2 }),
              h('circle', { cx: cx, cy: 80, r: 2.2, fill: b.col })
            );
          })
        );
      }

      var statusLine = null;
      if (status === 'thinking') statusLine = h('p', { className: 'text-xs ' + (isContrast ? 'text-yellow-300' : 'text-indigo-300') }, t('stem.timeline.thinking', '✨ Reading the text and finding dated events…'));
      else if (status === 'needtext') statusLine = h('p', { className: 'text-xs ' + (isContrast ? 'text-yellow-300' : 'text-amber-300') }, t('stem.timeline.needtext', 'Paste at least a short paragraph of text with some dates in it.'));
      else if (status === 'noevents') statusLine = h('p', { className: 'text-xs ' + (isContrast ? 'text-yellow-300' : 'text-amber-300') }, t('stem.timeline.noevents', 'No clear dated events were found in that text. Try a passage with years or dates.'));
      else if (status === 'needsai') statusLine = h('p', { className: 'text-xs ' + (isContrast ? 'text-yellow-300' : 'text-amber-300') }, t('stem.timeline.needsai', 'AI hints are off, so opening the manual timeline builder instead — add events by hand.'));
      else if (status === 'blocked') statusLine = h('p', { className: 'text-xs ' + (isContrast ? 'text-yellow-300' : 'text-amber-300') }, t('stem.timeline.blocked', 'Pop-up blocked — allow pop-ups for this page and try again.'));
      else if (status === 'ready' || status === 'open') statusLine = h('p', { className: 'text-xs ' + (isContrast ? 'text-yellow-300' : 'text-emerald-300') }, t('stem.timeline.ready', 'Timeline is open in a new window. Keep this window open to send it new timelines.'));
      else if (typeof status === 'string' && status.indexOf('error:') === 0) statusLine = h('p', { className: 'text-xs ' + (isContrast ? 'text-yellow-300' : 'text-rose-300') }, t('stem.timeline.error', 'Something went wrong generating the timeline: ') + status.slice(6));

      return h('div', { className: 'flex flex-col gap-4 animate-in fade-in duration-300 max-w-2xl',
        // The launcher card is dark-authored (text-slate-300 body, bg-slate-800/60
        // privacy panel, slate-900/70 back button) but painted no ground, so it sat
        // on the host card -- white in BOTH themes (stem_lab_module.js ~1633): body
        // text 1.48:1, privacy rows 2.72:1 on the composited grey. Six shelf/launcher
        // tools share this exact recipe; each gets the slate ground its inks assume,
        // plus an explicit high-contrast shell when ctx.theme === 'contrast'.
        style: isContrast
          ? { background: '#000000', color: '#ffffff', border: '2px solid #ffff00', borderRadius: 14, padding: 16 }
          : {
              background: isDark
                ? 'radial-gradient(680px 260px at 8% -12%, rgba(244,63,94,0.16), transparent 62%), radial-gradient(560px 220px at 94% 0%, rgba(168,85,247,0.14), transparent 58%), #0b1220'
                : 'radial-gradient(680px 260px at 8% -12%, rgba(244,63,94,0.14), transparent 62%), radial-gradient(560px 220px at 94% 0%, rgba(56,189,248,0.12), transparent 58%), #0f172a',
              border: '1px solid #334155',
              boxShadow: '0 16px 36px -22px rgba(2,6,23,0.75)',
              borderRadius: 14,
              padding: 16
            } },
        h('div', { className: 'flex items-center gap-3' },
          renderTimelineEmblem(),
          h('h2', {
            className: isContrast
              ? 'text-lg font-bold text-yellow-300'
              : 'text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-300 via-pink-300 to-amber-200'
          }, t('stem.timeline.title', '🕰️ Timeline Studio — turn a reading into a timeline'))
        ),
        renderChronologyRailSvg(),
        h('p', { className: 'text-sm leading-relaxed ' + (isContrast ? 'text-white' : 'text-slate-300') },
          t('stem.timeline.blurb', 'Paste a reading — a history handout, a biography, the story of a scientific discovery — and the AI finds the dated events and lays them out as an interactive timeline you can scroll and step through. Great for turning dense text into a clear sequence.')),
        h('label', { className: 'text-xs font-bold ' + (isContrast ? 'text-yellow-300' : 'text-slate-300'), htmlFor: 'tl-src' },
          t('stem.timeline.source_label', 'Paste the text to turn into a timeline')),
        h('textarea', {
          id: 'tl-src',
          value: sourceText,
          onChange: function (e) { setSourceText(e.target.value); },
          rows: 8,
          placeholder: t('stem.timeline.placeholder', 'Paste a passage with dates — e.g. a chapter on the Space Race, a scientist’s biography, the events of a novel…'),
          className: isContrast
            ? 'w-full rounded-xl bg-black border-2 border-yellow-300 p-3 text-sm text-white placeholder-slate-300 focus:border-cyan-300 focus:outline-none resize-y'
            : 'w-full rounded-xl bg-slate-900/70 border border-slate-700 p-3 text-sm text-slate-100 placeholder-slate-400 focus:border-rose-500 focus:outline-none resize-y'
        }),
        h('div', { className: 'flex flex-wrap items-center gap-3' },
          h('label', { className: 'text-xs flex items-center gap-2 ' + (isContrast ? 'text-white' : 'text-slate-300') },
            t('stem.timeline.reading_level', 'Reading level'),
            h('select', {
              value: grade,
              onChange: function (e) { setGrade(e.target.value); },
              className: isContrast
                ? 'rounded-lg bg-black border-2 border-yellow-300 px-2 py-1 text-xs text-white'
                : 'rounded-lg bg-slate-900/70 border border-slate-700 px-2 py-1 text-xs text-slate-100'
            },
              h('option', { value: 'early-elementary' }, t('stem.timeline.lvl_early', 'Early elementary')),
              h('option', { value: 'upper-elementary' }, t('stem.timeline.lvl_upper', 'Upper elementary')),
              h('option', { value: 'middle-school' }, t('stem.timeline.lvl_middle', 'Middle school')),
              h('option', { value: 'high-school' }, t('stem.timeline.lvl_high', 'High school')))),
          h('button', {
            onClick: generate,
            disabled: busy,
            className: isContrast
              ? 'px-4 py-2.5 rounded-xl text-sm font-bold text-black bg-yellow-300 border-2 border-yellow-300 disabled:opacity-60 transition-all'
              : 'px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 disabled:opacity-60 shadow-md shadow-rose-600/20 transition-all',
            'aria-label': t('stem.timeline.generate_title', 'Generate an interactive timeline from the pasted text')
          }, busy ? t('stem.timeline.generating', '✨ Building…') : t('stem.timeline.generate', '✨ Build the timeline')),
          h('button', {
            onClick: function () { openPopup(); },
            className: isContrast
              ? 'px-3 py-2.5 rounded-xl text-xs font-bold text-yellow-300 bg-black border-2 border-yellow-300 transition-all'
              : 'px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 bg-slate-700 hover:bg-slate-600 transition-all',
            'aria-label': t('stem.timeline.build_title', 'Open the timeline window to build one by hand')
          }, t('stem.timeline.build', '✍️ Build by hand'))),
        statusLine,
        h('div', {
          className: isContrast
            ? 'bg-black rounded-xl p-3 border-2 border-yellow-300 text-xs text-white space-y-1.5'
            : 'bg-slate-800/60 rounded-xl p-3 border border-slate-700 text-xs text-slate-300 space-y-1.5'
        },
          h('div', null, (aiOn ? '✨ ' + t('stem.timeline.ai_on', 'AI is ON — it reads your text and pulls out the dated events.')
            : '🌱 ' + t('stem.timeline.ai_off', 'AI hints are off — use “Build by hand” to add events yourself in the timeline window.'))),
          h('div', null, '🔒 ' + t('stem.timeline.privacy', 'Your text and the timeline stay in memory — nothing is saved or graded.'))),
        h('p', { className: 'text-[0.6875rem] leading-relaxed ' + (isContrast ? 'text-white' : 'text-slate-300') },
          t('stem.timeline.credit', 'Timeline rendering: TimelineJS by Northwestern University Knight Lab (timeline.knightlab.com), free and open source under the Mozilla Public License. The timeline library loads from Knight Lab’s CDN, so this tool needs internet.'))
      );
    }
  });
  console.log('[StemLab] stem_tool_timeline.js loaded — Timeline Studio (TimelineJS + AI doc→timeline)');
})();
