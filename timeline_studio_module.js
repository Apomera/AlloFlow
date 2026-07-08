/**
 * AlloFlow Timeline Studio Module
 * Standalone Learning Hub tool that opens the TimelineJS companion window.
 */
(function () {
  'use strict';
  if (window.AlloModules && window.AlloModules.TimelineStudio) {
    console.log('[CDN] TimelineStudio already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) {
    console.error('[TimelineStudio] React not found on window');
    return;
  }

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

  function withParam(url, key, value) {
    return url + (url.indexOf('?') === -1 ? '?' : '&') + encodeURIComponent(key) + '=' + encodeURIComponent(value);
  }

  function tr(t, key, fallback) {
    if (typeof t === 'function') {
      try {
        var v = t(key);
        if (v && v !== key) return v;
      } catch (_) {}
    }
    return fallback;
  }

  function buildTimelinePrompt(sourceText, grade) {
    return [
      'You convert a passage of text into a JSON timeline in TimelineJS3 format for a ' + (grade || 'middle-school') + ' audience.',
      'Return ONLY a JSON object of exactly this shape (no markdown, no commentary):',
      '{"title":{"text":{"headline":"<short title>","text":"<one sentence on what this timeline shows>"}},"events":[{"start_date":{"year":"YYYY","month":"M","day":"D"},"text":{"headline":"<<=8 words>","text":"<1-2 plain factual sentences>"}}]}',
      'RULES:',
      '- 6 to 14 events, in chronological order (earliest first).',
      '- Every event MUST include start_date.year as a numeric string, such as "1969". Month and day are optional. Include them only if the text clearly gives them. Never invent a precise date.',
      '- For dates before year 1, use a negative year string, such as "-3000", and mention BCE in the headline.',
      '- Headline: at most 8 words. Text: 1-2 sentences, factually careful, grade-appropriate, no markdown, no citations.',
      '- Only include events actually supported by the passage. Do not add outside events that are not in the text.',
      '- If the passage contains no datable events, return {"title":{"text":{"headline":"No dated events found","text":"This text did not contain clear dates to place on a timeline."}},"events":[]}.',
      'Passage:',
      '"""',
      String(sourceText || '').slice(0, 12000),
      '"""'
    ].join('\n');
  }

  function coerceTimeline(raw) {
    var obj = raw;
    if (typeof raw === 'string') {
      var s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
      try { obj = JSON.parse(s); } catch (_) { return null; }
    }
    if (!obj || typeof obj !== 'object' || !Array.isArray(obj.events)) return null;
    obj.events = obj.events.filter(function (e) {
      return e && e.start_date && e.start_date.year !== undefined && e.start_date.year !== null && String(e.start_date.year).trim() !== '';
    }).map(function (e) {
      var d = e.start_date || {};
      var nd = { year: String(d.year).trim() };
      if (d.month !== undefined && d.month !== null && String(d.month).trim() !== '') nd.month = String(d.month).trim();
      if (d.day !== undefined && d.day !== null && String(d.day).trim() !== '') nd.day = String(d.day).trim();
      return {
        start_date: nd,
        text: {
          headline: (e.text && e.text.headline) || '',
          text: (e.text && e.text.text) || ''
        }
      };
    });
    return obj;
  }

  function TimelineStudio(props) {
    props = props || {};
    var h = React.createElement;
    var t = props.t;
    var onClose = typeof props.onClose === 'function' ? props.onClose : function () {};
    var callGemini = props.callGemini;
    var addToast = props.addToast;

    var winRef = React.useRef(null);
    var dataRef = React.useRef(null);
    var sourceState = React.useState('');
    var sourceText = sourceState[0];
    var setSourceText = sourceState[1];
    var gradeState = React.useState('middle-school');
    var grade = gradeState[0];
    var setGrade = gradeState[1];
    var statusState = React.useState('idle');
    var status = statusState[0];
    var setStatus = statusState[1];
    var busyState = React.useState(false);
    var busy = busyState[0];
    var setBusy = busyState[1];

    var aiOn = props.aiHintsEnabled !== false && typeof callGemini === 'function';
    var lang = props.lang || 'en';

    function sendData() {
      var w = winRef.current;
      if (w && !w.closed && dataRef.current) {
        try { w.postMessage({ type: 'allotimeline-data', timeline: dataRef.current }, '*'); } catch (_) {}
      }
    }

    React.useEffect(function () {
      function onMsg(ev) {
        var data = ev && ev.data;
        if (!data || typeof data.type !== 'string') return;
        if (data.type === 'allotimeline-hello') {
          var replyTo = ev.source || winRef.current;
          try {
            if (replyTo && dataRef.current) replyTo.postMessage({ type: 'allotimeline-data', timeline: dataRef.current }, '*');
          } catch (_) {}
          setStatus('open');
          return;
        }
        if (data.type === 'allotimeline-closed') setStatus('closed');
      }
      window.addEventListener('message', onMsg);
      return function () { window.removeEventListener('message', onMsg); };
    }, []);

    function openPopup() {
      var existing = winRef.current;
      if (existing && !existing.closed) {
        try { existing.focus(); } catch (_) {}
        sendData();
        return existing;
      }
      var w = null;
      try {
        w = window.open(withParam(TIMELINE_STUDIO_URL, 'lang', lang), 'alloflow-timeline-studio', 'width=1200,height=800');
      } catch (_) {
        w = null;
      }
      if (!w) {
        setStatus('blocked');
        if (typeof addToast === 'function') addToast(tr(t, 'timeline_studio.popup_blocked', 'Allow pop-ups for this page, then try Timeline Studio again.'), 'warning');
        return null;
      }
      winRef.current = w;
      setStatus('opening');
      return w;
    }

    function generate() {
      if (busy) return;
      var text = String(sourceText || '').trim();
      if (text.length < 40) {
        setStatus('needtext');
        return;
      }
      if (!aiOn) {
        setStatus('needsai');
        openPopup();
        return;
      }
      setBusy(true);
      setStatus('thinking');
      Promise.resolve().then(function () {
        return callGemini(buildTimelinePrompt(text, grade), true, false, 0.3);
      }).then(function (raw) {
        var tl = coerceTimeline(raw);
        setBusy(false);
        if (!tl || !tl.events || !tl.events.length) {
          setStatus('noevents');
          return;
        }
        dataRef.current = tl;
        setStatus('ready');
        var w = openPopup();
        if (w) setTimeout(sendData, 400);
      }).catch(function (e) {
        setBusy(false);
        setStatus('error:' + String((e && e.message) || e).slice(0, 100));
      });
    }

    function statusLine() {
      if (status === 'thinking') return h('p', { className: 'text-sm text-indigo-700' }, tr(t, 'timeline_studio.thinking', 'Reading the text and finding dated events...'));
      if (status === 'needtext') return h('p', { className: 'text-sm text-amber-700' }, tr(t, 'timeline_studio.needtext', 'Paste at least a short paragraph with dates or years in it.'));
      if (status === 'noevents') return h('p', { className: 'text-sm text-amber-700' }, tr(t, 'timeline_studio.noevents', 'No clear dated events were found. Try a passage with years or dates.'));
      if (status === 'needsai') return h('p', { className: 'text-sm text-amber-700' }, tr(t, 'timeline_studio.needsai', 'AI is not available, so the manual timeline builder opened instead.'));
      if (status === 'blocked') return h('p', { className: 'text-sm text-amber-700' }, tr(t, 'timeline_studio.blocked', 'Pop-up blocked. Allow pop-ups for this page and try again.'));
      if (status === 'ready' || status === 'open' || status === 'opening') return h('p', { className: 'text-sm text-emerald-700' }, tr(t, 'timeline_studio.ready', 'Timeline Studio is open. Keep this window open to send it new timelines.'));
      if (typeof status === 'string' && status.indexOf('error:') === 0) return h('p', { className: 'text-sm text-rose-700' }, tr(t, 'timeline_studio.error', 'Something went wrong generating the timeline: ') + status.slice(6));
      return null;
    }

    return h('div', {
      className: 'fixed inset-0 z-[70] bg-slate-950/70 flex items-center justify-center p-4',
      onClick: onClose,
      role: 'button',
      tabIndex: 0,
      onKeyDown: function (e) { if (e.key === 'Escape') onClose(); }
    },
      h('section', {
        className: 'allo-docsuite bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': tr(t, 'timeline_studio.title', 'Timeline Studio'),
        onClick: function (e) { e.stopPropagation(); }
      },
        h('div', { className: 'flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-200 bg-slate-50' },
          h('div', null,
            h('h2', { className: 'text-xl font-black text-slate-900' }, tr(t, 'timeline_studio.title', 'Timeline Studio')),
            h('p', { className: 'text-sm text-slate-600 mt-1 max-w-2xl' }, tr(t, 'timeline_studio.subtitle', 'Turn a reading, biography, or historical passage into an interactive timeline.'))
          ),
          h('button', {
            onClick: onClose,
            className: 'p-2 -m-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors text-xl',
            'aria-label': tr(t, 'timeline_studio.close', 'Close Timeline Studio')
          }, '\u00d7')
        ),
        h('div', { className: 'p-6 space-y-4 max-h-[78vh] overflow-y-auto' },
          h('label', { className: 'block text-sm font-bold text-slate-700', htmlFor: 'allo-timeline-source' }, tr(t, 'timeline_studio.source_label', 'Paste text to turn into a timeline')),
          h('textarea', {
            id: 'allo-timeline-source',
            value: sourceText,
            onChange: function (e) { setSourceText(e.target.value); },
            rows: 9,
            placeholder: tr(t, 'timeline_studio.placeholder', 'Paste a passage with dates, years, or events in sequence...'),
            className: 'w-full rounded-xl bg-white border border-slate-300 p-3 text-sm text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200 resize-y'
          }),
          h('div', { className: 'flex flex-wrap items-center gap-3' },
            h('label', { className: 'text-sm text-slate-700 flex items-center gap-2' },
              tr(t, 'timeline_studio.reading_level', 'Reading level'),
              h('select', {
                value: grade,
                onChange: function (e) { setGrade(e.target.value); },
                className: 'rounded-lg bg-white border border-slate-300 px-2 py-2 text-sm text-slate-900'
              },
                h('option', { value: 'early-elementary' }, tr(t, 'timeline_studio.lvl_early', 'Early elementary')),
                h('option', { value: 'upper-elementary' }, tr(t, 'timeline_studio.lvl_upper', 'Upper elementary')),
                h('option', { value: 'middle-school' }, tr(t, 'timeline_studio.lvl_middle', 'Middle school')),
                h('option', { value: 'high-school' }, tr(t, 'timeline_studio.lvl_high', 'High school'))
              )
            ),
            h('button', {
              onClick: generate,
              disabled: busy,
              className: 'px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 transition-colors',
              'aria-label': tr(t, 'timeline_studio.generate_title', 'Generate an interactive timeline from the pasted text')
            }, busy ? tr(t, 'timeline_studio.generating', 'Building...') : tr(t, 'timeline_studio.generate', 'Build the timeline')),
            h('button', {
              onClick: openPopup,
              className: 'px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 border border-slate-300 hover:bg-slate-200 transition-colors',
              'aria-label': tr(t, 'timeline_studio.manual_title', 'Open the timeline window to build one by hand')
            }, tr(t, 'timeline_studio.manual', 'Build by hand'))
          ),
          statusLine(),
          h('div', { className: 'bg-slate-50 rounded-xl p-4 border border-slate-200 text-sm text-slate-700 space-y-1.5' },
            h('p', null, aiOn
              ? tr(t, 'timeline_studio.ai_on', 'AI is available for turning text into dated events.')
              : tr(t, 'timeline_studio.ai_off', 'Manual timeline building still works when AI is unavailable.')),
            h('p', null, tr(t, 'timeline_studio.privacy', 'Your text and generated timeline stay in memory for this session.'))
          )
        )
      )
    );
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.TimelineStudio = TimelineStudio;
  console.log('[CDN] TimelineStudio loaded');
})();
