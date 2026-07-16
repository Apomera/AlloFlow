/**
 * AlloFlow Timeline Studio Module
 * Standalone Learning Hub tool that opens the TimelineJS companion window.
 *
 * Input modes:
 *  - Paste text (original): ungrounded single call; the pasted passage is the
 *    grounding, so events are restricted to what the passage supports.
 *  - Describe a topic (agentic, 2026-07-11): grounded two-step loop —
 *    (1) research the topic with callGemini(useSearch=true) and attach the
 *        grounding sources to individual events via groundingSupports;
 *    (2) fact-verify per event by reusing the Sequence Builder verifier
 *        (window.AlloModules.createTimelineRevision → handleVerifyTimelineAccuracy),
 *        instantiated with a search-grounded callGemini wrapper so the check is
 *        an independent retrieval pass, NOT the model grading its own memory.
 *    Honesty rules: verification state and source coverage are always disclosed
 *    on the rendered timeline; a failed/unavailable verify renders as
 *    "unverified", never as a silent pass. content_engine is NOT touched.
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

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Attribute-safe URL: only allow http(s); anything else becomes '#'.
  function safeUri(u) {
    var s = String(u || '').trim();
    if (!/^https?:\/\//i.test(s)) return '#';
    return s.replace(/"/g, '%22');
  }

  // Grounded calls run with jsonMode OFF (the Gemini google_search tool is
  // incompatible with responseMimeType:application/json in production — see
  // content_engine, which grounds with jsonMode=false and parses text). So the
  // model may wrap the JSON in a code fence or prose; strip fences, and if it
  // still won't parse, extract the outermost object/array.
  function cleanJsonLocal(raw) {
    var s = String(raw == null ? '' : raw).trim().replace(/^```(?:json)?/i, '').replace(/```\s*$/, '').trim();
    try { JSON.parse(s); return s; } catch (_) {}
    var firstObj = s.indexOf('{');
    var firstArr = s.indexOf('[');
    var start = (firstArr !== -1 && (firstObj === -1 || firstArr < firstObj)) ? firstArr : firstObj;
    if (start === -1) return s;
    var end = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
    return (end > start) ? s.slice(start, end + 1) : s;
  }

  var TIMELINE_JSON_SHAPE = '{"title":{"text":{"headline":"<short title>","text":"<one sentence on what this timeline shows>"}},"events":[{"start_date":{"year":"YYYY","month":"M","day":"D"},"text":{"headline":"<<=8 words>","text":"<1-2 plain factual sentences>"}}]}';

  function buildTimelinePrompt(sourceText, grade) {
    return [
      'You convert a passage of text into a JSON timeline in TimelineJS3 format for a ' + (grade || 'middle-school') + ' audience.',
      'Return ONLY a JSON object of exactly this shape (no markdown, no commentary):',
      TIMELINE_JSON_SHAPE,
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

  // Topic mode: grounded research prompt. Same JSON contract as the paste
  // prompt so coerceTimeline works unchanged; the grounding rule replaces the
  // "only events in the passage" rule.
  function buildTopicResearchPrompt(topic, period, mustInclude, grade) {
    var lines = [
      'You are researching a topic with Google Search and building a JSON timeline in TimelineJS3 format for a ' + (grade || 'middle-school') + ' audience.',
      'Topic: ' + String(topic || '').slice(0, 400)
    ];
    if (period && String(period).trim()) lines.push('Time period to cover: ' + String(period).slice(0, 200) + '. Only include events inside this period.');
    if (mustInclude && String(mustInclude).trim()) lines.push('The teacher asked to include these events if they can be grounded in sources: ' + String(mustInclude).slice(0, 800));
    lines = lines.concat([
      'Return ONLY a JSON object of exactly this shape (no markdown, no commentary):',
      TIMELINE_JSON_SHAPE,
      'RULES:',
      '- Use the web search results. Only include events you can ground in a retrieved source. Do NOT include events you cannot ground.',
      '- 6 to 14 events, in chronological order (earliest first).',
      '- Every event MUST include start_date.year as a numeric string, such as "1969". Include month/day ONLY if a source confirms the precise date. Never invent a precise date; when unsure, give the year only.',
      '- For dates before year 1, use a negative year string, such as "-3000", and mention BCE in the headline.',
      '- Headline: at most 8 words. Text: 1-2 sentences, factually careful, grade-appropriate, no markdown.',
      '- If a requested must-include event cannot be grounded in a source, leave it out rather than guessing a date.',
      '- If the topic has no datable events (for example a cyclic process), return {"title":{"text":{"headline":"No dated events found","text":"This topic did not produce clearly dated events for a timeline."}},"events":[]}.'
    ]);
    return lines.join('\n');
  }

  function coerceTimeline(raw) {
    var obj = raw;
    if (typeof raw === 'string') {
      var s = cleanJsonLocal(raw);
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
      var out = {
        start_date: nd,
        text: {
          headline: (e.text && e.text.headline) || '',
          text: (e.text && e.text.text) || ''
        }
      };
      // Topic-mode enrichments ride through untouched (absent in paste mode).
      if (Array.isArray(e.sources)) out.sources = e.sources;
      if (e.verification && typeof e.verification === 'object') out.verification = e.verification;
      return out;
    });
    return obj;
  }

  // ── Topic-mode step 1b: map grounding sources onto individual events. ──────
  // groundingSupports segments index into the RAW RESPONSE TEXT (same contract
  // content_engine's computeGroundingSupportStats consumes). We locate each
  // event's span in the raw text (headline position → next headline position)
  // and attach every chunk whose support segment overlaps that span.
  // Returns { events, docSources, hasSupports, sourcedCount }.
  function attachSourcesToEvents(events, rawText, groundingMetadata) {
    events = Array.isArray(events) ? events : [];
    var chunks = (groundingMetadata && Array.isArray(groundingMetadata.groundingChunks)) ? groundingMetadata.groundingChunks : [];
    var supports = (groundingMetadata && Array.isArray(groundingMetadata.groundingSupports)) ? groundingMetadata.groundingSupports : [];
    var docSources = [];
    var seenDoc = {};
    chunks.forEach(function (c) {
      var uri = (c && c.web && c.web.uri) || '';
      if (!uri || seenDoc[uri]) return;
      seenDoc[uri] = true;
      docSources.push({ title: (c.web && c.web.title) || uri, uri: uri });
    });

    var s = String(rawText || '');
    var hasSupports = supports.length > 0 && s.length > 0;
    // Event spans in the raw response text.
    var spans = [];
    var cursor = 0;
    events.forEach(function (e) {
      var head = (e.text && e.text.headline) || '';
      var idx = head ? s.indexOf(head, cursor) : -1;
      if (idx === -1 && head) idx = s.indexOf(head); // fallback: unordered match
      spans.push(idx);
      if (idx !== -1) cursor = idx + head.length;
    });
    var outEvents = events.map(function (e, i) {
      var start = spans[i];
      var attached = [];
      if (hasSupports && start !== -1) {
        var end = s.length;
        for (var j = i + 1; j < spans.length; j++) { if (spans[j] > start) { end = spans[j]; break; } }
        var seen = {};
        supports.forEach(function (sup) {
          var seg = sup && sup.segment;
          if (!seg || typeof seg.endIndex !== 'number') return;
          var a = typeof seg.startIndex === 'number' ? seg.startIndex : 0; // Gemini omits startIndex when 0
          var b = seg.endIndex;
          if (b <= start || a >= end) return; // no overlap with this event's span
          var idxList = Array.isArray(sup.groundingChunkIndices) ? sup.groundingChunkIndices : [];
          idxList.forEach(function (ci) {
            var c = chunks[ci];
            var uri = (c && c.web && c.web.uri) || '';
            if (!uri || seen[uri]) return;
            seen[uri] = true;
            if (attached.length < 3) attached.push({ title: (c.web && c.web.title) || uri, uri: uri });
          });
        });
      }
      var copy = Object.assign({}, e);
      copy.sources = attached;
      return copy;
    });
    var sourcedCount = outEvents.filter(function (e) { return e.sources.length > 0; }).length;
    return { events: outEvents, docSources: docSources, hasSupports: hasSupports, sourcedCount: sourcedCount };
  }

  // ── Topic-mode step 2: reuse the Sequence Builder verifier, grounded. ──────
  // createTimelineRevision takes { callGemini, gradeLevel }; we hand it a
  // wrapper that forces useSearch=true and unwraps the {text, groundingMetadata}
  // result back to a string (the verifier expects string → cleanJson → parse).
  // Zero changes to timeline_revision itself; default Sequence Builder behavior
  // elsewhere is untouched.
  function runGroundedVerify(callGemini, events, gradeLabel, t, addToast) {
    var factory = window.AlloModules && window.AlloModules.createTimelineRevision;
    if (typeof factory !== 'function') return Promise.resolve({ status: 'unavailable', events: events });
    // Force useSearch=true so the verify is an independent retrieval pass. Force
    // jsonMode=false regardless of what the verifier requests: google_search +
    // JSON responseMimeType is rejected in production. The verifier's prompt
    // already demands a JSON array and parses via cleanJson (→ cleanJsonLocal),
    // which strips fences and extracts the array.
    var groundedCallGemini = function (prompt) {
      return Promise.resolve(callGemini(prompt, false, true, 0.2)).then(function (r) {
        return (r && typeof r === 'object' && typeof r.text === 'string') ? r.text : r;
      });
    };
    var rev;
    try {
      rev = factory({ callGemini: groundedCallGemini, gradeLevel: gradeLabel });
    } catch (_) {
      return Promise.resolve({ status: 'unavailable', events: events });
    }
    var items = events.map(function (e) {
      var d = e.start_date || {};
      var date = String(d.year || '');
      if (d.month) date += '-' + d.month;
      if (d.day) date += '-' + d.day;
      if (String(d.year || '').charAt(0) === '-') date += ' (BCE)';
      return { date: date, event: ((e.text && e.text.headline) || '') + '. ' + ((e.text && e.text.text) || '') };
    });
    var content = {
      type: 'timeline',
      id: 'timeline-studio-topic',
      data: { mode: 'timeline', progressionLabel: 'chronological order (earliest first)', items: items }
    };
    var captured = null;
    var ctx = {
      generatedContent: content,
      gradeLevel: gradeLabel,
      t: t,
      cleanJson: cleanJsonLocal,
      addToast: typeof addToast === 'function' ? addToast : function () {},
      setGeneratedContent: function (u) { captured = (typeof u === 'function') ? u(content) : u; },
      setHistory: function (fn) { if (typeof fn === 'function') { try { fn([]); } catch (_) {} } },
      setIsVerifyingTimeline: function () {}
    };
    return Promise.resolve(rev.handleVerifyTimelineAccuracy(ctx)).then(function () {
      var verifiedItems = captured && captured.data && Array.isArray(captured.data.items) ? captured.data.items : null;
      // The verifier surfaces its own failure via toast and leaves state
      // untouched — no captured content means verification did NOT run.
      if (!verifiedItems) return { status: 'failed', events: events };
      var merged = events.map(function (e, i) {
        var v = verifiedItems[i] && verifiedItems[i].verification;
        return v ? Object.assign({}, e, { verification: v }) : e;
      });
      return { status: 'ok', events: merged };
    }).catch(function () {
      return { status: 'failed', events: events };
    });
  }

  // ── Decorate the TimelineJS payload for the companion window. ─────────────
  // The companion renders TimelineJS3 HTML text fields, so badges/sources/
  // disclosure travel inside the payload — no companion changes needed.
  function decorateTimelineForDisplay(tl, research, t) {
    var out = { title: tl.title, events: [] };
    var flagged = 0;
    out.events = (tl.events || []).map(function (e) {
      var v = e.verification;
      var bits = [];
      if (v && v.factual !== false && v.position !== false) {
        bits.push('<small>✅ ' + escapeHtml(tr(t, 'timeline_studio.badge_checked', 'Checked')) + (v.rationale ? ' — ' + escapeHtml(v.rationale) : '') + '</small>');
      } else if (v) {
        flagged++;
        bits.push('<small>⚠️ ' + escapeHtml(tr(t, 'timeline_studio.badge_flagged', 'Check this')) + (v.concern ? ' — ' + escapeHtml(v.concern) : '') + '</small>');
      } else if (research) {
        flagged++;
        bits.push('<small>⚠️ ' + escapeHtml(tr(t, 'timeline_studio.badge_unverified', 'Not verified')) + '</small>');
      }
      if (research && Array.isArray(e.sources)) {
        if (e.sources.length > 0) {
          var links = e.sources.slice(0, 2).map(function (src) {
            return '<a href="' + safeUri(src.uri) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(src.title) + '</a>';
          }).join(', ');
          bits.push('<small>' + escapeHtml(tr(t, 'timeline_studio.source_label_inline', 'Source:')) + ' ' + links + '</small>');
        } else {
          bits.push('<small>' + escapeHtml(tr(t, 'timeline_studio.unsourced', 'No source matched this event — verify before teaching.')) + '</small>');
        }
      }
      var text = escapeHtml((e.text && e.text.text) || '');
      if (bits.length) text += '<br>' + bits.join('<br>');
      return {
        start_date: e.start_date,
        text: { headline: escapeHtml((e.text && e.text.headline) || ''), text: text }
      };
    });
    if (research) {
      var title = out.title && out.title.text ? out.title : { text: { headline: '', text: '' } };
      var discl;
      if (!research.hasGrounding) {
        discl = tr(t, 'timeline_studio.disclosure_ungrounded', 'AI draft — no web sources were retrieved for this topic. Treat every date as unverified.');
      } else {
        discl = tr(t, 'timeline_studio.disclosure_grounded', 'AI-researched from web sources.') +
          ' ' + research.sourcedCount + '/' + out.events.length + ' ' + tr(t, 'timeline_studio.disclosure_sourced', 'events tied to a source.');
        if (research.verifyStatus === 'ok') {
          discl += ' ' + tr(t, 'timeline_studio.disclosure_verified', 'An automated accuracy check ran on every event; it is a helpful signal, not proof — review flagged items.');
        } else {
          discl += ' ' + tr(t, 'timeline_studio.disclosure_unverified', 'The automated accuracy check could not run — treat all events as unverified.');
        }
      }
      var srcList = (research.docSources || []).slice(0, 8).map(function (sc) {
        return '<a href="' + safeUri(sc.uri) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(sc.title) + '</a>';
      }).join(' · ');
      var extra = '<br><small>' + escapeHtml(discl) + (srcList ? '<br>' + escapeHtml(tr(t, 'timeline_studio.sources_heading', 'Sources:')) + ' ' + srcList : '') + '</small>';
      out.title = { text: { headline: (title.text && title.text.headline) || '', text: ((title.text && title.text.text) || '') + extra } };
    }
    return { timeline: out, flagged: flagged };
  }

  var GRADE_LABELS = {
    'early-elementary': 'Early elementary',
    'upper-elementary': 'Upper elementary',
    'middle-school': 'Middle school',
    'high-school': 'High school'
  };

  function TimelineStudio(props) {
    props = props || {};
    var h = React.createElement;
    var t = props.t;
    var onClose = typeof props.onClose === 'function' ? props.onClose : function () {};
    var callGemini = props.callGemini;
    var addToast = props.addToast;

    var winRef = React.useRef(null);
    var dialogRef = React.useRef(null);
    var closeButtonRef = React.useRef(null);
    var dataRef = React.useRef(null);
    var modeState = React.useState('paste'); // 'paste' | 'topic'
    var inputMode = modeState[0];
    var setInputMode = modeState[1];
    var sourceState = React.useState('');
    var sourceText = sourceState[0];
    var setSourceText = sourceState[1];
    var topicState = React.useState('');
    var topic = topicState[0];
    var setTopic = topicState[1];
    var periodState = React.useState('');
    var period = periodState[0];
    var setPeriod = periodState[1];
    var mustState = React.useState('');
    var mustInclude = mustState[0];
    var setMustInclude = mustState[1];
    var gradeState = React.useState('middle-school');
    var grade = gradeState[0];
    var setGrade = gradeState[1];
    var statusState = React.useState('idle');
    var status = statusState[0];
    var setStatus = statusState[1];
    var busyState = React.useState(false);
    var busy = busyState[0];
    var setBusy = busyState[1];
    var busyRef = React.useRef(false);
    var summaryState = React.useState(null); // {events, sourcedCount, flagged, verifyStatus, hasGrounding}
    var summary = summaryState[0];
    var setSummary = summaryState[1];

    var aiOn = props.aiHintsEnabled !== false && typeof callGemini === 'function';
    var lang = props.lang || 'en';

    React.useEffect(function () {
      var priorFocus = document.activeElement;
      var timer = setTimeout(function () {
        var target = closeButtonRef.current || dialogRef.current;
        if (target && typeof target.focus === 'function') target.focus();
      }, 0);
      return function () {
        clearTimeout(timer);
        if (priorFocus && typeof priorFocus.focus === 'function' && document.contains(priorFocus)) {
          try { priorFocus.focus(); } catch (_) {}
        }
      };
    }, []);

    function handleDialogKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      var nodes = dialogRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])');
      var focusable = Array.prototype.filter.call(nodes, function (node) {
        return node.getAttribute('aria-hidden') !== 'true' && node.offsetParent !== null;
      });
      if (!focusable.length) {
        e.preventDefault();
        dialogRef.current.focus();
        return;
      }
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

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
          if (!busyRef.current) setStatus('open');
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
      dataRef.current = null;
      var w = openPopup();
      if (!w) return;
      busyRef.current = true;
      setBusy(true);
      setSummary(null);
      setStatus('thinking');
      Promise.resolve().then(function () {
        return callGemini(buildTimelinePrompt(text, grade), true, false, 0.3);
      }).then(function (raw) {
        var tl = coerceTimeline(raw);
        busyRef.current = false;
        setBusy(false);
        if (!tl || !tl.events || !tl.events.length) {
          setStatus('noevents');
          return;
        }
        dataRef.current = tl;
        setStatus('ready');
        setTimeout(sendData, 400);
      }).catch(function (e) {
        busyRef.current = false;
        setBusy(false);
        setStatus('error:' + String((e && e.message) || e).slice(0, 100));
      });
    }

    // Topic mode: research (grounded) → attach sources → verify (grounded,
    // via Sequence Builder) → decorate → send. Fails honest at every step.
    function generateTopic() {
      if (busy) return;
      var topicText = String(topic || '').trim();
      if (topicText.length < 3) {
        setStatus('needtopic');
        return;
      }
      if (!aiOn) {
        setStatus('needsai');
        openPopup();
        return;
      }
      dataRef.current = null;
      var w = openPopup();
      if (!w) return;
      busyRef.current = true;
      setBusy(true);
      setSummary(null);
      setStatus('researching');
      var rawTextForSpans = '';
      var meta = null;
      Promise.resolve().then(function () {
        // jsonMode=false: grounded search is incompatible with JSON responseMimeType
        // in production. The prompt demands JSON-only; coerceTimeline strips fences.
        return callGemini(buildTopicResearchPrompt(topicText, period, mustInclude, grade), false, true, 0.3);
      }).then(function (res) {
        var rawText = (res && typeof res === 'object' && typeof res.text === 'string') ? res.text : res;
        meta = (res && typeof res === 'object') ? res.groundingMetadata : null;
        rawTextForSpans = String(rawText || '');
        var tl = coerceTimeline(rawText);
        if (!tl || !tl.events || !tl.events.length) {
          busyRef.current = false;
          setBusy(false);
          setStatus('noevents_topic');
          return null;
        }
        var attach = attachSourcesToEvents(tl.events, rawTextForSpans, meta);
        tl.events = attach.events;
        var hasGrounding = attach.docSources.length > 0;
        setStatus('verifying');
        return runGroundedVerify(callGemini, tl.events, GRADE_LABELS[grade] || grade, t, addToast).then(function (verify) {
          tl.events = verify.events;
          var research = {
            hasGrounding: hasGrounding,
            sourcedCount: attach.sourcedCount,
            docSources: attach.docSources,
            verifyStatus: verify.status
          };
          var deco = decorateTimelineForDisplay(tl, research, t);
          dataRef.current = deco.timeline;
          setSummary({
            events: tl.events.length,
            sourcedCount: attach.sourcedCount,
            flagged: deco.flagged,
            verifyStatus: verify.status,
            hasGrounding: hasGrounding
          });
          busyRef.current = false;
          setBusy(false);
          setStatus('ready');
          setTimeout(sendData, 400);
        });
      }).catch(function (e) {
        busyRef.current = false;
        setBusy(false);
        setStatus('error:' + String((e && e.message) || e).slice(0, 100));
      });
    }

    function statusLine() {
      if (status === 'thinking') return h('p', { className: 'text-sm text-indigo-700' }, tr(t, 'timeline_studio.thinking', 'Reading the text and finding dated events...'));
      if (status === 'researching') return h('p', { className: 'text-sm text-indigo-700' }, tr(t, 'timeline_studio.researching', 'Researching the topic with web search...'));
      if (status === 'verifying') return h('p', { className: 'text-sm text-indigo-700' }, tr(t, 'timeline_studio.verifying', 'Fact-checking each event against sources...'));
      if (status === 'needtext') return h('p', { className: 'text-sm text-amber-700' }, tr(t, 'timeline_studio.needtext', 'Paste at least a short paragraph with dates or years in it.'));
      if (status === 'needtopic') return h('p', { className: 'text-sm text-amber-700' }, tr(t, 'timeline_studio.needtopic', 'Type a topic first, like "the Apollo program" or "the French Revolution".'));
      if (status === 'noevents') return h('p', { className: 'text-sm text-amber-700' }, tr(t, 'timeline_studio.noevents', 'No clear dated events were found. Try a passage with years or dates.'));
      if (status === 'noevents_topic') return h('p', { className: 'text-sm text-amber-700' }, tr(t, 'timeline_studio.noevents_topic', 'The research pass could not build dated events for this topic. Timelines need datable events — for processes or cycles, try the Sequence Builder in Learning Hub instead.'));
      if (status === 'needsai') return h('p', { className: 'text-sm text-amber-700' }, tr(t, 'timeline_studio.needsai', 'AI is not available, so the manual timeline builder opened instead.'));
      if (status === 'blocked') return h('p', { className: 'text-sm text-amber-700' }, tr(t, 'timeline_studio.blocked', 'Pop-up blocked. Allow pop-ups for this page and try again.'));
      if (status === 'ready' || status === 'open' || status === 'opening') return h('p', { className: 'text-sm text-emerald-700' }, tr(t, 'timeline_studio.ready', 'Timeline Studio is open. Keep this window open to send it new timelines.'));
      if (typeof status === 'string' && status.indexOf('error:') === 0) return h('p', { className: 'text-sm text-rose-700' }, tr(t, 'timeline_studio.error', 'Something went wrong generating the timeline: ') + status.slice(6));
      return null;
    }

    function summaryLine() {
      if (!summary) return null;
      var parts = [];
      parts.push(summary.events + ' ' + tr(t, 'timeline_studio.sum_events', 'events'));
      if (summary.hasGrounding) {
        parts.push(summary.sourcedCount + '/' + summary.events + ' ' + tr(t, 'timeline_studio.sum_sourced', 'tied to a web source'));
      } else {
        parts.push(tr(t, 'timeline_studio.sum_nogrounding', 'no web sources retrieved — unverified draft'));
      }
      if (summary.verifyStatus === 'ok') {
        parts.push(summary.flagged === 0
          ? tr(t, 'timeline_studio.sum_allclear', 'accuracy check: all clear')
          : summary.flagged + ' ' + tr(t, 'timeline_studio.sum_flagged', 'flagged for review'));
      } else {
        parts.push(tr(t, 'timeline_studio.sum_noverify', 'accuracy check unavailable — treat as unverified'));
      }
      var tone = (summary.verifyStatus === 'ok' && summary.flagged === 0 && summary.hasGrounding) ? 'text-emerald-700' : 'text-amber-700';
      return h('p', { className: 'text-sm ' + tone }, parts.join(' · '));
    }

    var isTopic = inputMode === 'topic';
    function modeBtn(id, label) {
      var active = inputMode === id;
      return h('button', {
        type: 'button',
        onClick: function () { if (!busy) { setInputMode(id); setStatus('idle'); } },
        'aria-disabled': busy ? 'true' : 'false',
        className: 'min-h-11 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2 ' + (active
          ? 'bg-rose-600 text-white'
          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'),
        'aria-pressed': active ? 'true' : 'false'
      }, label);
    }

    return h('div', {
      className: 'fixed inset-0 z-[70] bg-slate-950/70 flex items-center justify-center p-4',
      onClick: onClose
    },
      h('section', {
        ref: dialogRef,
        className: 'allo-docsuite bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden',
        role: 'dialog',
        tabIndex: -1,
        'aria-modal': 'true',
        'aria-labelledby': 'timeline-studio-title',
        'aria-describedby': 'timeline-studio-description',
        onClick: function (e) { e.stopPropagation(); },
        onKeyDown: handleDialogKeyDown
      },
        h('div', { className: 'flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-200 bg-slate-50' },
          h('div', null,
            h('h2', { id: 'timeline-studio-title', className: 'text-xl font-black text-slate-900' }, tr(t, 'timeline_studio.title', 'Timeline Studio')),
            h('p', { id: 'timeline-studio-description', className: 'text-sm text-slate-600 mt-1 max-w-2xl' }, tr(t, 'timeline_studio.subtitle', 'Turn a reading, biography, or historical passage into an interactive timeline.'))
          ),
          h('button', {
            type: 'button',
            ref: closeButtonRef,
            onClick: onClose,
            className: 'min-w-11 min-h-11 p-2 -m-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2 transition-colors text-xl',
            'aria-label': tr(t, 'timeline_studio.close', 'Close Timeline Studio')
          }, '×')
        ),
        h('div', { className: 'p-6 space-y-4 max-h-[78vh] overflow-y-auto' },
          h('div', { className: 'flex items-center gap-2', role: 'group', 'aria-label': tr(t, 'timeline_studio.mode_label', 'How do you want to start?') },
            modeBtn('paste', tr(t, 'timeline_studio.mode_paste', 'Paste text')),
            modeBtn('topic', tr(t, 'timeline_studio.mode_topic', 'Describe a topic'))
          ),
          !isTopic && h('div', { className: 'space-y-2' },
            h('label', { className: 'block text-sm font-bold text-slate-700', htmlFor: 'allo-timeline-source' }, tr(t, 'timeline_studio.source_label', 'Paste text to turn into a timeline')),
            h('textarea', {
              id: 'allo-timeline-source',
              value: sourceText,
              onChange: function (e) { setSourceText(e.target.value); },
              rows: 9,
              placeholder: tr(t, 'timeline_studio.placeholder', 'Paste a passage with dates, years, or events in sequence...'),
              className: 'w-full rounded-xl bg-white border border-slate-300 p-3 text-sm text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200 resize-y'
            })
          ),
          isTopic && h('div', { className: 'space-y-3' },
            h('div', null,
              h('label', { className: 'block text-sm font-bold text-slate-700', htmlFor: 'allo-timeline-topic' }, tr(t, 'timeline_studio.topic_label', 'What should the timeline be about?')),
              h('input', {
                id: 'allo-timeline-topic',
                type: 'text',
                value: topic,
                onChange: function (e) { setTopic(e.target.value); },
                placeholder: tr(t, 'timeline_studio.topic_placeholder', 'e.g. The Apollo program, The French Revolution, Ancient Egypt'),
                className: 'w-full rounded-xl bg-white border border-slate-300 p-3 text-sm text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200'
              })
            ),
            h('div', null,
              h('label', { className: 'block text-sm font-bold text-slate-700', htmlFor: 'allo-timeline-period' }, tr(t, 'timeline_studio.period_label', 'Time period (optional)')),
              h('input', {
                id: 'allo-timeline-period',
                type: 'text',
                value: period,
                onChange: function (e) { setPeriod(e.target.value); },
                placeholder: tr(t, 'timeline_studio.period_placeholder', 'e.g. 1789–1799, or "the 20th century"'),
                className: 'w-full rounded-xl bg-white border border-slate-300 p-3 text-sm text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200'
              })
            ),
            h('div', null,
              h('label', { className: 'block text-sm font-bold text-slate-700', htmlFor: 'allo-timeline-must' }, tr(t, 'timeline_studio.must_label', 'Events to include (optional)')),
              h('textarea', {
                id: 'allo-timeline-must',
                value: mustInclude,
                onChange: function (e) { setMustInclude(e.target.value); },
                rows: 2,
                placeholder: tr(t, 'timeline_studio.must_placeholder', 'e.g. the Tennis Court Oath, the storming of the Bastille'),
                className: 'w-full rounded-xl bg-white border border-slate-300 p-3 text-sm text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200 resize-y'
              })
            )
          ),
          h('div', { className: 'flex flex-wrap items-center gap-3' },
            h('label', { className: 'text-sm text-slate-700 flex items-center gap-2', htmlFor: 'allo-timeline-grade' },
              tr(t, 'timeline_studio.reading_level', 'Reading level'),
              h('select', {
                id: 'allo-timeline-grade',
                value: grade,
                onChange: function (e) { setGrade(e.target.value); },
                className: 'min-h-11 rounded-lg bg-white border border-slate-300 px-2 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2'
              },
                h('option', { value: 'early-elementary' }, tr(t, 'timeline_studio.lvl_early', 'Early elementary')),
                h('option', { value: 'upper-elementary' }, tr(t, 'timeline_studio.lvl_upper', 'Upper elementary')),
                h('option', { value: 'middle-school' }, tr(t, 'timeline_studio.lvl_middle', 'Middle school')),
                h('option', { value: 'high-school' }, tr(t, 'timeline_studio.lvl_high', 'High school'))
              )
            ),
            h('button', {
              type: 'button',
              onClick: isTopic ? generateTopic : generate,
              'aria-disabled': busy ? 'true' : 'false',
              'aria-busy': busy ? 'true' : 'false',
              'aria-describedby': 'timeline-studio-status timeline-studio-summary',
              className: 'min-h-11 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 aria-disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2',
              title: isTopic
                ? tr(t, 'timeline_studio.generate_topic_title', 'Research the topic and build a fact-checked timeline')
                : tr(t, 'timeline_studio.generate_title', 'Generate an interactive timeline from the pasted text')
            }, busy
              ? tr(t, 'timeline_studio.generating', 'Building...')
              : (isTopic ? tr(t, 'timeline_studio.generate_topic', 'Research & build') : tr(t, 'timeline_studio.generate', 'Build the timeline'))),
            h('button', {
              type: 'button',
              onClick: openPopup,
              className: 'min-h-11 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 border border-slate-300 hover:bg-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2',
              title: tr(t, 'timeline_studio.manual_title', 'Open the timeline window to build one by hand')
            }, tr(t, 'timeline_studio.manual', 'Build by hand'))
          ),
          h('div', { id: 'timeline-studio-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, statusLine()),
          h('div', { id: 'timeline-studio-summary', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, summaryLine()),
          h('div', { className: 'bg-slate-50 rounded-xl p-4 border border-slate-200 text-sm text-slate-700 space-y-1.5' },
            h('p', null, aiOn
              ? (isTopic
                  ? tr(t, 'timeline_studio.ai_on_topic', 'Topic mode researches with web search, ties each event to sources, and runs an automated accuracy check. The check is a helpful signal, not proof — review flagged items before teaching.')
                  : tr(t, 'timeline_studio.ai_on', 'AI is available for turning text into dated events.'))
              : tr(t, 'timeline_studio.ai_off', 'Manual timeline building still works when AI is unavailable.')),
            h('p', null, tr(t, 'timeline_studio.privacy', 'Your text and generated timeline stay in memory for this session.'))
          )
        )
      )
    );
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.TimelineStudio = TimelineStudio;
  // Pure helpers exposed for unit tests (and future reuse by AlloBot quick-actions).
  window.AlloModules.TimelineStudioHelpers = {
    buildTimelinePrompt: buildTimelinePrompt,
    buildTopicResearchPrompt: buildTopicResearchPrompt,
    coerceTimeline: coerceTimeline,
    attachSourcesToEvents: attachSourcesToEvents,
    decorateTimelineForDisplay: decorateTimelineForDisplay,
    runGroundedVerify: runGroundedVerify,
    escapeHtml: escapeHtml,
    safeUri: safeUri
  };
  console.log('[CDN] TimelineStudio loaded');
})();
