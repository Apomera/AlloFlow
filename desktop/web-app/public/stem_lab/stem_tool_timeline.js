// ═══════════════════════════════════════════════════════════════════════
// AlloFlow STEM Lab — Timeline Studio (TimelineJS + AI document→timeline)
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
      var isAlloHosted = /(^|\.)alloflow/i.test(host) || /(^|\.)web\.app$/i.test(host) || /(^|\.)firebaseapp\.com$/i.test(host);
      if (isDesktopBundled) return new URL(path, loc.href).toString();
      if (isLocalHost || isAlloHosted) return new URL('/' + String(path).replace(/^\/+/, ''), loc.origin).toString();
    } catch (_) {}
    return cdnUrl;
  }
  var TIMELINE_STUDIO_URL = companionUrl('timeline_studio/timeline_studio.html?v=1', TIMELINE_STUDIO_CDN_URL);

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
    category: 'general',
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
          try { w.postMessage({ type: 'allotimeline-data', timeline: _data.current }, '*'); } catch (_) {}
        }
      }

      // ── Bridge: popup asks for data on hello ──
      React.useEffect(function () {
        function onMsg(ev) {
          var data = ev && ev.data;
          if (!data || typeof data.type !== 'string') return;
          if (data.type === 'allotimeline-hello') {
            var replyTo = ev.source || _win.current;
            try { if (replyTo && _data.current) replyTo.postMessage({ type: 'allotimeline-data', timeline: _data.current }, '*'); } catch (_) {}
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

      var statusLine = null;
      if (status === 'thinking') statusLine = h('p', { className: 'text-xs text-indigo-300' }, t('stem.timeline.thinking', '✨ Reading the text and finding dated events…'));
      else if (status === 'needtext') statusLine = h('p', { className: 'text-xs text-amber-300' }, t('stem.timeline.needtext', 'Paste at least a short paragraph of text with some dates in it.'));
      else if (status === 'noevents') statusLine = h('p', { className: 'text-xs text-amber-300' }, t('stem.timeline.noevents', 'No clear dated events were found in that text. Try a passage with years or dates.'));
      else if (status === 'needsai') statusLine = h('p', { className: 'text-xs text-amber-300' }, t('stem.timeline.needsai', 'AI hints are off, so opening the manual timeline builder instead — add events by hand.'));
      else if (status === 'blocked') statusLine = h('p', { className: 'text-xs text-amber-300' }, t('stem.timeline.blocked', 'Pop-up blocked — allow pop-ups for this page and try again.'));
      else if (status === 'ready' || status === 'open') statusLine = h('p', { className: 'text-xs text-emerald-300' }, t('stem.timeline.ready', 'Timeline is open in a new window. Keep this window open to send it new timelines.'));
      else if (typeof status === 'string' && status.indexOf('error:') === 0) statusLine = h('p', { className: 'text-xs text-rose-300' }, t('stem.timeline.error', 'Something went wrong generating the timeline: ') + status.slice(6));

      return h('div', { className: 'flex flex-col gap-4 animate-in fade-in duration-300 max-w-2xl' },
        h('h2', { className: 'text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-400' },
          t('stem.timeline.title', '🕰️ Timeline Studio — turn a reading into a timeline')),
        h('p', { className: 'text-sm text-slate-300 leading-relaxed' },
          t('stem.timeline.blurb', 'Paste a reading — a history handout, a biography, the story of a scientific discovery — and the AI finds the dated events and lays them out as an interactive timeline you can scroll and step through. Great for turning dense text into a clear sequence.')),
        h('label', { className: 'text-xs font-bold text-slate-400', htmlFor: 'tl-src' },
          t('stem.timeline.source_label', 'Paste the text to turn into a timeline')),
        h('textarea', {
          id: 'tl-src',
          value: sourceText,
          onChange: function (e) { setSourceText(e.target.value); },
          rows: 8,
          placeholder: t('stem.timeline.placeholder', 'Paste a passage with dates — e.g. a chapter on the Space Race, a scientist’s biography, the events of a novel…'),
          className: 'w-full rounded-xl bg-slate-900/70 border border-slate-700 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:outline-none resize-y'
        }),
        h('div', { className: 'flex flex-wrap items-center gap-3' },
          h('label', { className: 'text-xs text-slate-400 flex items-center gap-2' },
            t('stem.timeline.reading_level', 'Reading level'),
            h('select', {
              value: grade,
              onChange: function (e) { setGrade(e.target.value); },
              className: 'rounded-lg bg-slate-900/70 border border-slate-700 px-2 py-1 text-xs text-slate-100'
            },
              h('option', { value: 'early-elementary' }, t('stem.timeline.lvl_early', 'Early elementary')),
              h('option', { value: 'upper-elementary' }, t('stem.timeline.lvl_upper', 'Upper elementary')),
              h('option', { value: 'middle-school' }, t('stem.timeline.lvl_middle', 'Middle school')),
              h('option', { value: 'high-school' }, t('stem.timeline.lvl_high', 'High school')))),
          h('button', {
            onClick: generate,
            disabled: busy,
            className: 'px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 disabled:opacity-60 shadow-md shadow-rose-600/20 transition-all',
            'aria-label': t('stem.timeline.generate_title', 'Generate an interactive timeline from the pasted text')
          }, busy ? t('stem.timeline.generating', '✨ Building…') : t('stem.timeline.generate', '✨ Build the timeline')),
          h('button', {
            onClick: function () { openPopup(); },
            className: 'px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 bg-slate-700 hover:bg-slate-600 transition-all',
            'aria-label': t('stem.timeline.build_title', 'Open the timeline window to build one by hand')
          }, t('stem.timeline.build', '✍️ Build by hand'))),
        statusLine,
        h('div', { className: 'bg-slate-800/60 rounded-xl p-3 border border-slate-700 text-xs text-slate-300 space-y-1.5' },
          h('div', null, (aiOn ? '✨ ' + t('stem.timeline.ai_on', 'AI is ON — it reads your text and pulls out the dated events.')
            : '🌱 ' + t('stem.timeline.ai_off', 'AI hints are off — use “Build by hand” to add events yourself in the timeline window.'))),
          h('div', null, '🔒 ' + t('stem.timeline.privacy', 'Your text and the timeline stay in memory — nothing is saved or graded.'))),
        h('p', { className: 'text-[11px] text-slate-500 leading-relaxed' },
          t('stem.timeline.credit', 'Timeline rendering: TimelineJS by Northwestern University Knight Lab (timeline.knightlab.com), free and open source under the Mozilla Public License. The timeline library loads from Knight Lab’s CDN, so this tool needs internet.'))
      );
    }
  });
  console.log('[StemLab] stem_tool_timeline.js loaded — Timeline Studio (TimelineJS + AI doc→timeline)');
})();
