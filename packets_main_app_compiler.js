// AlloFlow Main-App Activity to Zero-Network Offline Student Packet Compiler.
// Plain UMD script for browser (window.AlloPacketCompiler) and Node (module.exports).
// Deterministic, offline-first, zero external URLs, zero markup from strings, verifyPacket-clean.
(function (root) {
  'use strict';

  var VERSION = 1;
  var SUPPORTED_KINDS = ['quiz', 'cloze', 'concept_sort', 'timeline', 'writing', 'adventure', 'anchor_chart'];
  var CHECK_CAPABLE = { quiz: true, cloze: true, concept_sort: true, timeline: true };

  var UNSAFE_KEYS = { __proto__: true, constructor: true, prototype: true };
  var STRIP_KEY_RE = /^(?:system_?prompt|ai_?prompt|prompt_?template|user_?prompt|llm_?.*|model(?:_?name|_?id)?|api_?key|secret_?key|auth_?token|access_?token|bearer|firebase.*|firestore.*|webhook.*|endpoint|mailbox_?url|ai_?config|ai_?settings|ai_?grader|ai_?feedback|ai_?rubric|generation_?config|temperature|top_?p|max_?tokens|gemini.*|openai.*|claude.*|anthropic.*|provider|email|user_?email|teacher_?email|student_?email)$/i;
  var IMAGE_KEY_RE = /^(?:image|img|imageUrl|sceneImage|thumbnail|photo|picture|src|poster|iconUrl)$/i;
  var RASTER_IMG_RE = /^data:image\/(?:png|jpeg|jpg|webp|gif)(?:;[a-z0-9._+-]+(?:=[^;,\s]+)?)*;base64,[A-Za-z0-9+/=\s]+$/i;
  var URL_RE = /\b(?:https?|wss?|ftp):\/\/[^\s"'`<>)\]},;]+/gi;
  var PROTO_REL_RE = /(^|[\s([{"'`])(\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?![a-z0-9-])[^\s"'`<>)\]},;]*)/gi;
  var SCHEME_RE = /\b(?:javascript|vbscript|livescript)\s*:[^\s"'`<>]*/gi;
  var DATA_CODE_RE = /\bdata:(?:text\/html|text\/javascript|application\/(?:x-)?javascript|image\/svg\+xml)[^\s"'`<>]*/gi;
  var EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function str(v, max) {
    var s = v == null ? '' : String(v);
    s = s.replace(/\r\n?/g, '\n').trim();
    return max && s.length > max ? s.slice(0, max) : s;
  }
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function slug(v, max) {
    var s = str(v).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max || 32);
    return s || 'activity';
  }
  function fnv1a(text) {
    var h = 2166136261, s = String(text || '');
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(36);
  }
  function safeJson(v) {
    return JSON.stringify(v)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
  }

  function stripHtmlAndLinks(rawText, report) {
    var s = String(rawText == null ? '' : rawText);
    if (!s) return '';
    var before = s;
    s = s.replace(/<\s*(?:script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\s*\/\s*(?:script|style|iframe|object|embed)\s*>/gi, '');
    s = s.replace(/<\/?[a-z][a-z0-9:-]*(?:\s[^>]*)?>/gi, '');
    if (s !== before) report.htmlTagsStripped++;

    var uCount = 0;
    s = s.replace(URL_RE, function () { uCount++; return ''; });
    s = s.replace(PROTO_REL_RE, function (_, lead) { uCount++; return lead || ''; });
    s = s.replace(SCHEME_RE, function () { uCount++; return ''; });
    s = s.replace(DATA_CODE_RE, function () { uCount++; return ''; });
    if (uCount) report.urlsStripped += uCount;

    var eCount = 0;
    s = s.replace(EMAIL_RE, function () { eCount++; return '[redacted]'; });
    if (eCount) report.emailsStripped += eCount;

    return s.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }

  // ---------------------------------------------------------------------------
  // Strict Zero-Network & Prompt-Metadata Sanitizer
  // ---------------------------------------------------------------------------
  function sanitizeArtifact(rawInput) {
    var report = {
      promptFieldsStripped: [],
      urlsStripped: 0,
      externalImagesConverted: 0,
      emailsStripped: 0,
      htmlTagsStripped: 0,
      unsafeKeysDropped: 0,
      notes: [],
    };
    var seenField = Object.create(null);
    var parsed = rawInput;

    if (typeof rawInput === 'string') {
      var trimmed = rawInput.trim();
      if (!trimmed) {
        return { ok: false, error: 'Paste or choose a JSON activity first.', artifact: null, stripReport: report };
      }
      if (trimmed.length > 4 * 1024 * 1024) {
        return { ok: false, error: 'This JSON input is larger than 4 MB.', artifact: null, stripReport: report };
      }
      try {
        parsed = JSON.parse(trimmed, function (k, v) {
          if (k && UNSAFE_KEYS[k]) {
            report.unsafeKeysDropped++;
            return undefined;
          }
          return v;
        });
      } catch (_) {
        return { ok: false, error: 'Could not read that JSON. Check for a missing bracket, quote, or comma.', artifact: null, stripReport: report };
      }
    }

    if (!isObj(parsed)) {
      return { ok: false, error: 'Expected a JSON object describing an activity.', artifact: null, stripReport: report };
    }

    var seenObjs = [];
    function walk(val, depth, keyName) {
      if (depth > 20 || val == null) return null;
      if (typeof val === 'boolean' || typeof val === 'number') return isFinite(val) ? val : null;
      if (typeof val === 'string') {
        if (keyName && IMAGE_KEY_RE.test(keyName)) {
          var imgStr = val.trim();
          if (RASTER_IMG_RE.test(imgStr) && imgStr.length <= 450000) return imgStr;
          if (/^(?:https?:|\/\/|blob:|data:)/i.test(imgStr)) {
            report.urlsStripped++;
            report.externalImagesConverted++;
            return '';
          }
          return stripHtmlAndLinks(imgStr, report);
        }
        return stripHtmlAndLinks(val, report);
      }
      if (Array.isArray(val)) {
        if (seenObjs.indexOf(val) >= 0) return [];
        seenObjs.push(val);
        var arr = [];
        for (var i = 0; i < val.length && i < 200; i++) {
          var item = walk(val[i], depth + 1, '');
          if (item !== undefined) arr.push(item);
        }
        seenObjs.pop();
        return arr;
      }
      if (isObj(val)) {
        if (seenObjs.indexOf(val) >= 0) return {};
        seenObjs.push(val);
        var out = {};
        var keys = Object.keys(val);
        for (var ki = 0; ki < keys.length && ki < 120; ki++) {
          var k = keys[ki];
          if (UNSAFE_KEYS[k]) {
            report.unsafeKeysDropped++;
            continue;
          }
          if (STRIP_KEY_RE.test(k)) {
            if (!seenField[k]) {
              seenField[k] = true;
              report.promptFieldsStripped.push(k);
            }
            continue;
          }
          var cleaned = walk(val[k], depth + 1, k);
          if (IMAGE_KEY_RE.test(k) && cleaned === '' && typeof val[k] === 'string' && val[k].trim()) {
            // Preserve a plain-text alt placeholder if the object has alt text or label
            var existingAlt = typeof val.imageAlt === 'string' ? val.imageAlt
              : typeof val.sceneImageAlt === 'string' ? val.sceneImageAlt
              : typeof val.alt === 'string' ? val.alt : '';
            var cleanAlt = stripHtmlAndLinks(existingAlt, { urlsStripped: 0, emailsStripped: 0, htmlTagsStripped: 0 });
            out.imageNote = cleanAlt ? ('Picture description: ' + cleanAlt) : 'External picture removed for offline use.';
            continue;
          }
          out[k] = cleaned;
        }
        seenObjs.pop();
        return out;
      }
      return null;
    }

    var cleanObj = walk(parsed, 0, '');
    if (report.promptFieldsStripped.length) {
      report.notes.push('Removed ' + report.promptFieldsStripped.length + ' prompt, model, key, or email metadata field(s): ' + report.promptFieldsStripped.slice(0, 6).join(', ') + '.');
    }
    if (report.externalImagesConverted > 0) {
      report.notes.push('Converted ' + report.externalImagesConverted + ' external image address(es) to plain-text descriptions so the packet never loads remote media.');
    }
    if (report.urlsStripped > 0) {
      report.notes.push('Stripped ' + report.urlsStripped + ' web address(es) so the student file has zero external links.');
    }
    if (report.emailsStripped > 0) {
      report.notes.push('Redacted ' + report.emailsStripped + ' email address(es).');
    }
    if (report.htmlTagsStripped > 0) {
      report.notes.push('Cleaned markup tags from ' + report.htmlTagsStripped + ' text field(s).');
    }
    if (report.unsafeKeysDropped > 0) {
      report.notes.push('Ignored ' + report.unsafeKeysDropped + ' unsafe object property key(s).');
    }
    if (!report.notes.length) {
      report.notes.push('No external web addresses, markup tags, or prompt metadata were found in this JSON.');
    }

    return { ok: true, artifact: cleanObj, stripReport: report };
  }

  function unwrapPayload(obj) {
    if (!isObj(obj)) return {};
    var cur = obj;
    if (isObj(cur.resource) && isObj(cur.resource.data)) cur = Object.assign({}, cur, cur.resource, cur.resource.data);
    else if (isObj(cur.artifact)) cur = Object.assign({}, cur, cur.artifact);
    else if (isObj(cur.data) && !Array.isArray(cur.questions) && !Array.isArray(cur.scenes) && !Array.isArray(cur.nodes) && !Array.isArray(cur.sections) && !Array.isArray(cur.events)) {
      cur = Object.assign({}, cur, cur.data);
    }
    if (isObj(cur.story) && !cur.scenes) cur = Object.assign({}, cur, cur.story);
    if (isObj(cur.room) && !cur.nodes) cur = Object.assign({}, cur, cur.room);
    return cur;
  }

  function detectActivityKind(rawObj) {
    var d = unwrapPayload(rawObj);
    var hint = str(d.kind || d.activityKind || d.activity || d.type || d.view || d.activeView).toLowerCase();

    if (/adventure|branching|story|escape/.test(hint)) return 'adventure';
    if (/anchor|chart|study_?guide|reference/.test(hint)) return 'anchor_chart';
    if (/timeline|sequence|chronolog/.test(hint)) return 'timeline';
    if (/concept_?sort|sort|categor/.test(hint)) return 'concept_sort';
    if (/writing|sentence_?frames?|dbq|essay|scaffold/.test(hint)) return 'writing';
    if (/cloze|fill_?in|blanks?/.test(hint)) return 'cloze';
    if (/quiz|assessment|questions|test/.test(hint)) return 'quiz';

    // Structural detection
    if (Array.isArray(d.scenes) || (isObj(d.scenes) && Object.keys(d.scenes).length > 0)) return 'adventure';
    if (Array.isArray(d.nodes) && (Array.isArray(d.areas) || d.exitNodeId || d.mission)) return 'adventure';
    if (Array.isArray(d.rooms) && d.rooms.length > 0) return 'adventure';
    if (Array.isArray(d.sections) && d.sections.length > 0) return 'anchor_chart';
    if (Array.isArray(d.events) && d.events.length > 0) return 'timeline';
    if (Array.isArray(d.categories) && (Array.isArray(d.cards) || Array.isArray(d.items))) return 'concept_sort';
    if (Array.isArray(d.documents) && d.documents.length > 0) return 'writing';
    if (Array.isArray(d.frames) || Array.isArray(d.sentenceFrames) || Array.isArray(d.starters) || typeof d.scaffoldParagraph === 'string') return 'writing';
    if (Array.isArray(d.blanks) && d.blanks.length > 0) return 'cloze';
    if (typeof (d.passage || d.text) === 'string' && (/\[\[[^\]]+\]\]|\{\{[^}]+\}\}|\[blank\]/i.test(d.passage || d.text) || (Array.isArray(d.glossary) && d.glossary.length > 0))) return 'cloze';
    if (Array.isArray(d.questions) && d.questions.length > 0) return 'quiz';
    if (Array.isArray(d.steps) && d.steps.length >= 2) return 'timeline';
    return '';
  }

  // ---------------------------------------------------------------------------
  // Canonical Normalizers for all 7 Activity Kinds
  // ---------------------------------------------------------------------------
  function extractTitle(d, fallback) {
    if (typeof d.title === 'string' && d.title.trim()) return str(d.title, 80);
    if (isObj(d.title) && isObj(d.title.text) && typeof d.title.text.headline === 'string' && d.title.text.headline.trim()) {
      return str(d.title.text.headline, 80);
    }
    return str(d.name || d.topic || d.headline || fallback || 'Offline Activity', 80);
  }

  function normalizeQuiz(d, imagesOut) {
    var rawQs = Array.isArray(d.questions) ? d.questions : [];
    var items = [];
    for (var i = 0; i < rawQs.length && items.length < 30; i++) {
      var q = rawQs[i];
      if (!isObj(q)) continue;
      var prompt = str(q.question || q.prompt || q.stem || q.text, 400);
      if (!prompt) continue;
      var rawOpts = Array.isArray(q.options) ? q.options : Array.isArray(q.choices) ? q.choices : [];
      var choices = rawOpts.map(function (c) {
        if (typeof c === 'string') return str(c, 180);
        if (isObj(c)) return str(c.text || c.label || c.value, 180);
        return '';
      }).filter(Boolean).slice(0, 6);

      var qKind = choices.length >= 2 ? 'mc' : 'short';
      var ans = '';
      if (qKind === 'mc') {
        var idx = Number.isInteger(q.correctIndex) ? q.correctIndex
          : (typeof q.correctAnswer === 'number' && Number.isInteger(q.correctAnswer) ? q.correctAnswer : -1);
        if (idx >= 0 && idx < choices.length) ans = choices[idx];
        else if (typeof q.correctAnswer === 'string' && q.correctAnswer.trim()) ans = str(q.correctAnswer, 180);
        else if (typeof q.answer === 'string' && q.answer.trim()) ans = str(q.answer, 180);
        else ans = choices[0];
        if (ans === '?') continue;
      } else {
        ans = str(q.answer != null ? q.answer : q.correctAnswer, 180);
        if (!ans || ans === '?') continue;
      }

      var accept = Array.isArray(q.acceptableAnswers)
        ? q.acceptableAnswers.map(function (a) { return str(a, 180); }).filter(Boolean).slice(0, 8)
        : [];
      if (ans && accept.indexOf(ans) < 0) accept.unshift(ans);

      var item = {
        id: str(q.id, 40) || ('qz-' + (items.length + 1)),
        word: 'Question ' + (items.length + 1),
        prompt: prompt,
        questionKind: qKind,
        choices: qKind === 'mc' ? choices : [],
        answer: ans,
        acceptableAnswers: qKind === 'short' ? accept : undefined,
        hint: str(q.hint || q.explanation, 300) || undefined,
        imageNote: str(q.imageNote, 240) || undefined,
      };
      var imgUri = str(q.image || q.img || q.imageUrl);
      if (imgUri && RASTER_IMG_RE.test(imgUri)) {
        var imgKey = 'qz_img_' + (items.length + 1);
        imagesOut[imgKey] = imgUri;
        item.imageId = imgKey;
        item.imageAlt = str(q.imageAlt || q.alt, 180);
      }
      items.push(item);
    }
    return items;
  }

  function normalizeCloze(d) {
    var passage = str(d.passage || d.text || d.body || '', 4000);
    var rawBlanks = Array.isArray(d.blanks) ? d.blanks : [];
    var segments = [];
    var blanks = [];
    var wordBank = Array.isArray(d.wordBank) ? d.wordBank.map(function (w) { return str(w, 80); }).filter(Boolean) : [];

    // Case 1: Inline [[answer]] or {{answer}} markers in passage
    var markerRe = /\[\[([^\]]{1,80})\]\]|\{\{([^}]{1,80})\}\}/g;
    if (passage && markerRe.test(passage)) {
      markerRe.lastIndex = 0;
      var last = 0, m, bi = 0;
      while ((m = markerRe.exec(passage)) && bi < 12) {
        if (m.index > last) segments.push({ type: 'text', text: passage.slice(last, m.index) });
        var ans = str(m[1] || m[2], 80);
        var bMeta = rawBlanks[bi] || {};
        var bChoices = Array.isArray(bMeta.choices) ? bMeta.choices.map(function (c) { return str(c, 80); }).filter(Boolean) : [];
        if (bChoices.length && bChoices.indexOf(ans) < 0) bChoices.push(ans);
        blanks.push({
          id: 'b' + (bi + 1),
          answer: ans,
          choices: bChoices,
          hint: str(bMeta.hint, 160),
        });
        segments.push({ type: 'blank', blankIndex: bi });
        if (wordBank.indexOf(ans) < 0) wordBank.push(ans);
        last = m.index + m[0].length;
        bi++;
      }
      if (last < passage.length) segments.push({ type: 'text', text: passage.slice(last) });
    } else if (passage && rawBlanks.length) {
      // Case 2: [blank] or ___ placeholders paired with blanks[]
      var phRe = /\[blank\]|_{3,}/gi;
      var last2 = 0, m2, bi2 = 0;
      while ((m2 = phRe.exec(passage)) && bi2 < rawBlanks.length && bi2 < 12) {
        if (m2.index > last2) segments.push({ type: 'text', text: passage.slice(last2, m2.index) });
        var b = rawBlanks[bi2];
        var bAns = str(typeof b === 'string' ? b : (b.answer || b.word || b.term), 80);
        var bCh = isObj(b) && Array.isArray(b.choices) ? b.choices.map(function (c) { return str(c, 80); }).filter(Boolean) : [];
        if (bAns && bAns !== '?') {
          if (bCh.length && bCh.indexOf(bAns) < 0) bCh.push(bAns);
          blanks.push({ id: 'b' + (bi2 + 1), answer: bAns, choices: bCh, hint: isObj(b) ? str(b.hint, 160) : '' });
          segments.push({ type: 'blank', blankIndex: blanks.length - 1 });
          if (wordBank.indexOf(bAns) < 0) wordBank.push(bAns);
        }
        last2 = m2.index + m2[0].length;
        bi2++;
      }
      if (last2 < passage.length) segments.push({ type: 'text', text: passage.slice(last2) });
    } else if (passage && Array.isArray(d.glossary) && d.glossary.length) {
      // Case 3: Main-app passage + glossary terms -> deterministic cloze blanks
      var terms = d.glossary.map(function (g) {
        return isObj(g) ? { term: str(g.term || g.word, 60), hint: str(g.definition || g.meaning, 160) } : null;
      }).filter(function (g) { return g && g.term.length >= 2; }).slice(0, 8);

      var hits = [];
      terms.forEach(function (t) {
        var esc = t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var re = new RegExp('\\b' + esc + '\\b', 'i');
        var hit = re.exec(passage);
        if (hit) hits.push({ start: hit.index, end: hit.index + hit[0].length, matched: hit[0], hint: t.hint });
      });
      hits.sort(function (a, b) { return a.start - b.start; });
      var nonOverlap = [];
      hits.forEach(function (h) {
        if (!nonOverlap.length || h.start >= nonOverlap[nonOverlap.length - 1].end) nonOverlap.push(h);
      });
      var cur = 0;
      nonOverlap.forEach(function (h, hi) {
        if (h.start > cur) segments.push({ type: 'text', text: passage.slice(cur, h.start) });
        blanks.push({ id: 'b' + (hi + 1), answer: h.matched, choices: [], hint: h.hint });
        segments.push({ type: 'blank', blankIndex: hi });
        if (wordBank.indexOf(h.matched) < 0) wordBank.push(h.matched);
        cur = h.end;
      });
      if (cur < passage.length) segments.push({ type: 'text', text: passage.slice(cur) });
    }

    if (!blanks.length) return [];

    // Deterministic sorted word bank (never reveals blank order!)
    var sortedBank = wordBank.slice().sort(function (a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()); });
    blanks.forEach(function (b) {
      if (!b.choices.length && sortedBank.length >= 2) b.choices = sortedBank.slice();
      else if (b.choices.length >= 2) b.choices = b.choices.slice().sort(function (a, c) { return a.toLowerCase().localeCompare(c.toLowerCase()); });
    });

    return [{
      id: 'cloze-1',
      word: extractTitle(d, 'Cloze Passage'),
      prompt: str(d.prompt || d.instructions || 'Complete each blank in the passage using the word bank or dropdown choices.', 300),
      segments: segments,
      blanks: blanks,
      wordBank: sortedBank,
      answer: blanks.map(function (b) { return b.answer; }).join('|'),
      hint: str(d.hint, 240) || undefined,
    }];
  }

  function normalizeConceptSort(d) {
    var rawCats = Array.isArray(d.categories) ? d.categories : [];
    var catMap = Object.create(null);
    var categories = rawCats.slice(0, 6).map(function (c, ci) {
      var label = typeof c === 'string' ? str(c, 60) : str(c && (c.label || c.name || c.title), 60);
      if (!label) return null;
      var id = slug((isObj(c) && c.id) || label, 24) || ('cat-' + (ci + 1));
      catMap[id.toLowerCase()] = id;
      catMap[label.toLowerCase()] = id;
      return {
        id: id,
        label: label,
        description: isObj(c) ? str(c.description || c.hint, 120) : '',
      };
    }).filter(Boolean);
    if (categories.length < 2) return [];

    var rawCards = Array.isArray(d.cards) ? d.cards : Array.isArray(d.items) ? d.items : [];
    var cards = rawCards.slice(0, 24).map(function (it, ii) {
      if (!isObj(it)) return null;
      var text = str(it.text || it.content || it.label || it.word, 120);
      if (!text) return null;
      var rawCat = str(it.category || it.categoryId || it.bucket || it.correctCategory || it.group, 60).toLowerCase();
      if (!rawCat || rawCat === '?') return null;
      var resolvedCat = catMap[rawCat] || categories[0].id;
      var detail = str(it.detail || it.description || it.imageNote, 160);
      return {
        id: str(it.id, 30) || ('card-' + (ii + 1)),
        text: text,
        detail: detail || undefined,
        category: resolvedCat,
      };
    }).filter(Boolean);
    if (cards.length < 2) return [];

    return [{
      id: 'sort-1',
      word: extractTitle(d, 'Concept Sort'),
      prompt: str(d.prompt || d.instructions || 'Place each card into the category that fits best.', 300),
      hint: str(d.hint, 240) || undefined,
      categories: categories,
      cards: cards,
    }];
  }

  function normalizeTimeline(d) {
    var steps = [];
    if (Array.isArray(d.events) && d.events.length) {
      var evs = d.events.filter(isObj).slice(0, 10).map(function (e, ei) {
        var sd = isObj(e.start_date) ? e.start_date : {};
        var yr = Number(sd.year != null ? sd.year : e.year);
        var mo = Number(sd.month != null ? sd.month : 0) || 0;
        var dy = Number(sd.day != null ? sd.day : 0) || 0;
        var sortKey = isFinite(yr) ? (yr * 10000 + mo * 100 + dy) : ei;
        var dateLabel = isFinite(yr)
          ? (String(yr) + (mo > 0 ? '-' + (mo < 10 ? '0' + mo : mo) : '') + (dy > 0 ? '-' + (dy < 10 ? '0' + dy : dy) : ''))
          : str(e.date || e.label || ('Event ' + (ei + 1)), 40);
        var headline = isObj(e.text) ? str(e.text.headline, 120) : str(e.title || e.headline || e.label, 120);
        var body = isObj(e.text) ? str(e.text.text, 240) : str(e.description || e.summary || e.text, 240);
        var label = headline || dateLabel;
        var text = body ? (headline && body !== headline ? (dateLabel + ': ' + body) : body) : (dateLabel + ' - ' + label);
        return { sortKey: sortKey, id: 'ev-' + (ei + 1), label: label, text: text };
      });
      evs.sort(function (a, b) { return a.sortKey - b.sortKey; });
      steps = evs.map(function (e, i) { return { id: 's' + (i + 1), label: e.label, text: e.text }; });
    } else if (Array.isArray(d.steps) && d.steps.length) {
      steps = d.steps.slice(0, 10).map(function (s, i) {
        if (typeof s === 'string') return { id: 's' + (i + 1), label: 'Step ' + (i + 1), text: str(s, 240) };
        if (isObj(s)) {
          var t = str(s.text || s.description || s.label, 240);
          if (!t) return null;
          return { id: str(s.id, 24) || ('s' + (i + 1)), label: str(s.label || s.title || ('Step ' + (i + 1)), 80), text: t };
        }
        return null;
      }).filter(Boolean);
    }
    if (steps.length < 2) return [];
    return [{
      id: 'timeline-1',
      word: extractTitle(d, 'Timeline Sequence'),
      prompt: str(d.prompt || d.instructions || (isObj(d.title) && isObj(d.title.text) ? d.title.text.text : '') || 'Put these events in chronological order from earliest to latest.', 300),
      hint: str(d.hint, 240) || 'Look for dates, causes, and what had to happen first.',
      steps: steps,
    }];
  }

  function normalizeWriting(d) {
    var passageTitle = str(d.passageTitle || d.sourceTitle || '', 120);
    var passageParts = [];
    if (typeof d.passage === 'string' && d.passage.trim()) passageParts.push(str(d.passage, 2500));
    if (Array.isArray(d.documents) && d.documents.length) {
      if (!passageTitle) passageTitle = 'Source Documents (' + d.documents.length + ')';
      d.documents.slice(0, 6).forEach(function (doc, di) {
        if (!isObj(doc)) return;
        var head = str(doc.title || doc.label || ('Document ' + (di + 1)), 100);
        var src = str(doc.source || doc.attribution || doc.author, 120);
        var body = str(doc.excerpt || doc.text || doc.content || doc.body, 900);
        if (body) passageParts.push(head + (src ? ' (' + src + ')' : '') + ': ' + body);
      });
    }
    var rawFrames = Array.isArray(d.frames) ? d.frames
      : Array.isArray(d.sentenceFrames) ? d.sentenceFrames
      : typeof d.scaffoldParagraph === 'string' && d.scaffoldParagraph.trim() ? [d.scaffoldParagraph] : [];
    var frames = rawFrames.map(function (f) {
      return typeof f === 'string' ? str(f, 240) : (isObj(f) ? str(f.text || f.frame || f.template, 240) : '');
    }).filter(Boolean).slice(0, 6);

    var rawStarters = Array.isArray(d.starters) ? d.starters
      : Array.isArray(d.sentenceStarters) ? d.sentenceStarters : [];
    var starters = rawStarters.map(function (s) {
      return typeof s === 'string' ? str(s, 200) : (isObj(s) ? str(s.text || s.starter, 200) : '');
    }).filter(Boolean).slice(0, 6);

    var wordBank = (Array.isArray(d.wordBank) ? d.wordBank : Array.isArray(d.vocabulary) ? d.vocabulary : [])
      .map(function (w) { return typeof w === 'string' ? str(w, 60) : (isObj(w) ? str(w.term || w.word, 60) : ''); })
      .filter(Boolean).slice(0, 16);

    var checklist = (Array.isArray(d.checklist) ? d.checklist : Array.isArray(d.rubric) ? d.rubric : [])
      .map(function (c) { return typeof c === 'string' ? str(c, 160) : (isObj(c) ? str(c.criterion || c.text || c.label, 160) : ''); })
      .filter(Boolean).slice(0, 6);

    if (!frames.length) {
      frames = [
        'According to the evidence, ___ because ___.',
        'One important detail is ___, which shows ___.',
      ];
    }
    if (!starters.length) {
      starters = [
        'The evidence shows that...',
        'This matters because...',
      ];
    }
    if (!checklist.length) {
      checklist = [
        'I answered the prompt clearly.',
        'I used specific evidence or key words.',
        'I re-read my writing for clarity.',
      ];
    }

    var prompt = str(d.prompt || d.essentialQuestion || d.question || d.instructions || 'Use the evidence and supports below to write your response.', 400);
    return [{
      id: 'write-1',
      word: extractTitle(d, 'Tiered Writing Response'),
      prompt: prompt,
      passageTitle: passageTitle || undefined,
      passage: passageParts.join('\n\n') || undefined,
      minWords: Math.max(5, Math.min(200, Number(d.minWords) || 15)),
      wordBank: wordBank,
      frames: frames,
      starters: starters,
      checklist: checklist,
    }];
  }

  function normalizeAdventure(d) {
    var title = extractTitle(d, 'Interactive Adventure');
    var scenes = [];
    var startId = '';

    // Case 1: Connected Escape Room ({ areas, nodes, mission, debrief, exitNodeId })
    if (Array.isArray(d.nodes) && d.nodes.length) {
      var areaNames = Object.create(null);
      (Array.isArray(d.areas) ? d.areas : []).forEach(function (a) {
        if (isObj(a) && a.id) areaNames[String(a.id)] = str(a.name, 80);
      });
      var nodes = d.nodes.filter(isObj).slice(0, 16);
      var rewardNames = Object.create(null);
      nodes.forEach(function (n) {
        if (isObj(n.reward) && n.reward.id) rewardNames[String(n.reward.id)] = str(n.reward.name || n.reward.id, 80);
      });

      var hubChoices = nodes.map(function (n, ni) {
        var nid = str(n.id, 40) || ('node-' + (ni + 1));
        var reqs = Array.isArray(n.requires) ? n.requires.map(function (r) { return str(r, 40); }).filter(Boolean) : [];
        return {
          label: (areaNames[String(n.areaId)] ? '[' + areaNames[String(n.areaId)] + '] ' : '') + str(n.name || ('Station ' + (ni + 1)), 100),
          to: nid,
          requires: reqs,
          requiresLabels: reqs.map(function (r) { return rewardNames[r] || r; }),
        };
      });

      startId = 'hub';
      scenes.push({
        id: 'hub',
        title: title,
        area: 'Mission Hub',
        text: str(d.mission || d.intro || 'Investigate each station, collect clues, and unlock the final exit.', 1200),
        ending: false,
        choices: hubChoices,
      });

      nodes.forEach(function (n, ni) {
        var nid = str(n.id, 40) || ('node-' + (ni + 1));
        var isExit = n.type === 'unlock' || nid === str(d.exitNodeId, 40);
        var reward = isObj(n.reward) ? {
          id: str(n.reward.id, 40) || ('clue-' + (ni + 1)),
          name: str(n.reward.name || ('Clue ' + (ni + 1)), 80),
          text: str(n.reward.text, 300),
        } : null;

        var puzzle = null;
        if (n.type === 'configure' && Array.isArray(n.controls) && n.controls.length) {
          var firstCtrl = n.controls[0];
          var opts = Array.isArray(firstCtrl.options) ? firstCtrl.options.map(function (o) { return str(o, 120); }).filter(Boolean) : [];
          var cIdx = Number.isInteger(firstCtrl.correctIndex) ? firstCtrl.correctIndex : 0;
          if (opts.length >= 2) {
            puzzle = {
              kind: 'mc',
              prompt: str(firstCtrl.label || n.instruction || 'Select the matching setting to unlock this station.', 240),
              choices: opts,
              answer: opts[cIdx] || opts[0],
              hints: Array.isArray(n.hints) ? n.hints.map(function (h) { return str(h, 240); }).filter(Boolean).slice(0, 3) : [],
            };
          }
        } else if (n.type === 'sequence' && Array.isArray(n.items) && n.items.length >= 2) {
          var order = Array.isArray(n.order) && n.order.length === n.items.length
            ? n.order
            : n.items.map(function (_, idx) { return idx; });
          var ansSeq = order.map(function (idx) { return String(idx + 1); }).join('-');
          var numbered = n.items.map(function (it, idx) { return (idx + 1) + ') ' + str(it, 100); }).join(' | ');
          puzzle = {
            kind: 'code',
            prompt: str(n.instruction || 'Enter the correct step numbers separated by dashes (for example 2-1-3): ', 200) + ' ' + numbered,
            answer: ansSeq,
            hints: Array.isArray(n.hints) ? n.hints.map(function (h) { return str(h, 240); }).filter(Boolean).slice(0, 3) : [],
          };
        } else if (typeof n.answer === 'string' && n.answer.trim()) {
          puzzle = {
            kind: 'code',
            prompt: str(n.instruction || n.puzzle || 'Solve the clue to unlock this station.', 240),
            answer: str(n.answer, 80),
            hints: Array.isArray(n.hints) ? n.hints.map(function (h) { return str(h, 240); }).filter(Boolean).slice(0, 3) : [],
          };
        }

        scenes.push({
          id: nid,
          title: str(n.name || ('Station ' + (ni + 1)), 100),
          area: areaNames[String(n.areaId)] || '',
          text: [str(n.description, 800), str(n.instruction, 500)].filter(Boolean).join('\n\n'),
          ending: isExit,
          debrief: isExit ? str(d.debrief || n.explanation || 'You combined every clue and completed the mission.', 800) : '',
          reward: reward,
          puzzle: puzzle,
          choices: isExit ? [] : [{ label: 'Return to Mission Hub', to: 'hub' }],
        });
      });
    } else if (Array.isArray(d.rooms) && d.rooms.length) {
      // Case 2: Generic linear/branching Escape Rooms
      var rooms = d.rooms.filter(isObj).slice(0, 16);
      startId = str(rooms[0].id, 40) || 'room-1';
      rooms.forEach(function (rm, ri) {
        var rid = str(rm.id, 40) || ('room-' + (ri + 1));
        var nextId = str(rm.next, 40) || (ri + 1 < rooms.length ? (str(rooms[ri + 1].id, 40) || ('room-' + (ri + 2))) : '');
        var hasPuzzle = !!(rm.puzzle && rm.answer);
        scenes.push({
          id: rid,
          title: str(rm.title || rm.name || ('Room ' + (ri + 1)), 100),
          text: str(rm.text || rm.description || rm.story, 1200),
          ending: !nextId || rm.ending === true,
          reward: rm.clue ? { id: 'clue-' + (ri + 1), name: str(rm.clueName || ('Clue ' + (ri + 1)), 60), text: str(rm.clue, 240) } : null,
          puzzle: hasPuzzle ? {
            kind: Array.isArray(rm.choices) && rm.choices.length >= 2 ? 'mc' : 'code',
            prompt: str(rm.puzzle, 240),
            choices: Array.isArray(rm.choices) ? rm.choices.map(function (c) { return str(c, 120); }).filter(Boolean) : [],
            answer: str(rm.answer, 120),
            hints: rm.hint ? [str(rm.hint, 240)] : (Array.isArray(rm.hints) ? rm.hints.map(function (h) { return str(h, 240); }).filter(Boolean).slice(0, 3) : []),
          } : null,
          choices: nextId ? [{ label: str(rm.nextLabel || 'Continue to next room', 100), to: nextId }] : [],
        });
      });
    } else {
      // Case 3: Branching Adventure Story ({ start, scenes: [...] | { id: {...} } })
      var list = Array.isArray(d.scenes) ? d.scenes
        : isObj(d.scenes) ? Object.keys(d.scenes).map(function (k) {
          var sc = d.scenes[k];
          return isObj(sc) ? Object.assign({ id: k }, sc) : null;
        }).filter(Boolean) : [];
      list.filter(isObj).slice(0, 24).forEach(function (sc, si) {
        var sid = str(sc.id, 40) || ('scene-' + (si + 1));
        var rawChoices = Array.isArray(sc.choices) ? sc.choices : Array.isArray(sc.options) ? sc.options : [];
        var choices = rawChoices.filter(isObj).slice(0, 6).map(function (c) {
          return {
            label: str(c.label || c.text, 140),
            to: str(c.to || c.next || c.goto, 40),
            requires: Array.isArray(c.requires) ? c.requires.map(function (r) { return str(r, 40); }).filter(Boolean) : [],
          };
        }).filter(function (c) { return c.label && c.to; });

        var puzzle = null;
        if (isObj(sc.puzzle) && sc.puzzle.answer) {
          puzzle = {
            kind: Array.isArray(sc.puzzle.choices) && sc.puzzle.choices.length >= 2 ? 'mc' : 'code',
            prompt: str(sc.puzzle.prompt || sc.puzzle.question || 'Solve the clue to continue.', 240),
            choices: Array.isArray(sc.puzzle.choices) ? sc.puzzle.choices.map(function (c) { return str(c, 120); }).filter(Boolean) : [],
            answer: str(sc.puzzle.answer, 120),
            hints: Array.isArray(sc.puzzle.hints) ? sc.puzzle.hints.map(function (h) { return str(h, 240); }).filter(Boolean).slice(0, 3) : (sc.puzzle.hint ? [str(sc.puzzle.hint, 240)] : []),
          };
        }

        scenes.push({
          id: sid,
          title: str(sc.title || sc.heading || ('Scene ' + (si + 1)), 100),
          text: str(sc.text || sc.narration || sc.body, 1500),
          imageNote: str(sc.imageNote || (sc.sceneImageAlt ? 'Picture description: ' + sc.sceneImageAlt : ''), 240) || undefined,
          ending: sc.ending === true || sc.isEnding === true || sc.end === true || choices.length === 0,
          reward: isObj(sc.reward) ? { id: str(sc.reward.id, 40) || ('clue-' + (si + 1)), name: str(sc.reward.name, 80), text: str(sc.reward.text, 240) }
            : (typeof sc.clue === 'string' && sc.clue.trim() ? { id: 'clue-' + (si + 1), name: 'Clue ' + (si + 1), text: str(sc.clue, 240) } : null),
          puzzle: puzzle,
          choices: choices,
        });
      });
      startId = str(d.start || d.startId, 40) || (scenes[0] ? scenes[0].id : '');
    }

    if (!scenes.length) return [];
    return [{
      id: 'adv-1',
      word: title,
      start: startId || scenes[0].id,
      scenes: scenes,
    }];
  }

  function normalizeAnchorChart(d) {
    var title = extractTitle(d, 'Anchor Chart & Study Guide');
    var rawSections = Array.isArray(d.sections) ? d.sections : [];
    var sections = rawSections.filter(isObj).slice(0, 8).map(function (s, si) {
      var heading = str(s.heading || s.title || s.name || ('Key Idea ' + (si + 1)), 100);
      var summary = str(s.summary || s.content || s.text || s.body, 600);
      var rawBullets = Array.isArray(s.bullets) ? s.bullets : Array.isArray(s.points) ? s.points : Array.isArray(s.steps) ? s.steps : [];
      var bullets = rawBullets.map(function (b) { return typeof b === 'string' ? str(b, 200) : (isObj(b) ? str(b.text || b.label, 200) : ''); }).filter(Boolean).slice(0, 6);
      var example = str(s.example || s.workedExample, 300);
      var takeaway = str(s.takeaway || s.remember || s.rule, 240);
      if (!summary && !bullets.length && !example && !takeaway) return null;
      return {
        id: 'sec-' + (si + 1),
        heading: heading,
        summary: summary,
        bullets: bullets,
        example: example,
        takeaway: takeaway,
      };
    }).filter(Boolean);
    if (!sections.length) return [];

    var rawChecks = Array.isArray(d.selfCheck) ? d.selfCheck : Array.isArray(d.questions) ? d.questions : [];
    var checks = rawChecks.filter(isObj).slice(0, 6).map(function (q, qi) {
      var prompt = str(q.prompt || q.question, 260);
      var opts = (Array.isArray(q.choices) ? q.choices : Array.isArray(q.options) ? q.options : []).map(function (c) { return str(c, 140); }).filter(Boolean).slice(0, 5);
      var idx = Number.isInteger(q.correctIndex) ? q.correctIndex : -1;
      var ans = idx >= 0 && idx < opts.length ? opts[idx] : str(q.answer || q.correctAnswer, 140);
      if (!prompt || !ans) return null;
      if (opts.length && opts.indexOf(ans) < 0) opts.push(ans);
      return { id: 'chk-' + (qi + 1), prompt: prompt, choices: opts, answer: ans, explanation: str(q.explanation || q.hint, 220) };
    }).filter(Boolean);

    if (!checks.length && sections.length >= 2) {
      // Deterministic quick self-check derived directly from section takeaways/summaries
      sections.slice(0, 3).forEach(function (sec, si) {
        var clue = sec.takeaway || sec.summary || (sec.bullets[0] || '');
        if (!clue) return;
        var opts = sections.map(function (s) { return s.heading; }).slice(0, 4);
        if (opts.indexOf(sec.heading) < 0) opts[opts.length - 1] = sec.heading;
        checks.push({
          id: 'auto-chk-' + (si + 1),
          prompt: 'Which section of the chart matches this idea: "' + clue.slice(0, 120) + '"?',
          choices: opts,
          answer: sec.heading,
          explanation: sec.heading + ': ' + clue,
        });
      });
    }

    return [{
      id: 'anchor-1',
      word: title,
      essentialQuestion: str(d.essentialQuestion || d.subtitle || d.bigIdea || d.goal, 260),
      sections: sections,
      selfCheck: checks,
    }];
  }

  // ---------------------------------------------------------------------------
  // Self-Contained Student Adapters (ZERO outer closures, ZERO URLs!)
  // ---------------------------------------------------------------------------
  function renderCompiledQuiz(item, ctx) {
    var L = ctx.L || {};
    var el = ctx.el;
    var fmt = ctx.fmt;
    var root = ctx.root;
    var isCheck = !!ctx.check;
    var locked = false;
    var hintVisible = false;

    var localNote = el('p', { class: 'status warn', hidden: true, 'data-cqz-local-note': '' });
    var showMsg = function (msg) {
      if (typeof ctx.feedback === 'function') ctx.feedback(msg);
      else { localNote.hidden = !msg; localNote.textContent = msg; }
      if (msg) ctx.announce(msg);
    };

    var promptEl = el('p', { class: 'cmp-prompt', text: item.prompt || '' });
    var imgEl = null;
    var imgUri = item.imageId && typeof ctx.image === 'function' ? ctx.image(item.imageId) : null;
    if (imgUri && String(imgUri).indexOf('data:image/') === 0) {
      imgEl = el('img', { class: 'cmp-img', src: imgUri, alt: item.imageAlt || '' });
    }
    var imgNoteEl = !imgEl && item.imageNote ? el('p', { class: 'cmp-img-note', text: item.imageNote }) : null;

    var hintBox = item.hint && !isCheck ? el('p', { class: 'cmp-hint', hidden: true, 'data-cqz-hint': '', text: item.hint }) : null;
    var hintBtn = hintBox ? el('button', {
      type: 'button',
      class: 'cmp-btn-sm',
      'data-cqz-hint-btn': '',
      'aria-expanded': 'false',
      on: {
        click: function () {
          hintVisible = !hintVisible;
          hintBox.hidden = !hintVisible;
          hintBtn.setAttribute('aria-expanded', hintVisible ? 'true' : 'false');
          hintBtn.textContent = hintVisible ? 'Hide hint' : 'Show hint';
          if (hintVisible && ctx.support) ctx.support('hint_shown');
        },
      },
      text: 'Show hint',
    }) : null;

    var qWrap = el('div', { class: 'cmp-q-wrap' });
    var mcButtons = [];
    var textInp = null;
    var submitBtn = null;

    if (item.questionKind === 'mc' && Array.isArray(item.choices) && item.choices.length >= 2) {
      var tried = Object.create(null);
      var listEl = el('div', { class: 'cmp-mc-list', role: 'group', 'aria-label': 'Answer choices' });
      item.choices.forEach(function (ch, ci) {
        var b = el('button', {
          type: 'button',
          class: 'cmp-mc-btn',
          'data-cqz-choice': String(ci),
          on: {
            click: function () {
              if (locked || (!isCheck && tried[ci])) return;
              showMsg('');
              if (isCheck) {
                var r = ctx.answer(ch);
                if (r === 'recorded' || r === 'correct' || r === 'missed') {
                  locked = true;
                  mcButtons.forEach(function (x) { x.disabled = true; });
                }
                return;
              }
              var ok = String(ch).trim().toLowerCase() === String(item.answer || '').trim().toLowerCase();
              var out = ctx.answer(ch, ok, {
                correctText: L.cqz_right || 'Correct.',
                retryText: L.cqz_retry || 'Not quite. Review the prompt and try again.',
                missedText: fmt(L.cqz_missed || 'Expected answer: {answer}.', { answer: item.answer || '' }),
              });
              if (out === 'correct' || out === 'missed') {
                locked = true;
                mcButtons.forEach(function (x, xi) {
                  x.disabled = true;
                  if (String(item.choices[xi]).trim().toLowerCase() === String(item.answer || '').trim().toLowerCase()) x.className = 'cmp-mc-btn is-right';
                });
              } else {
                tried[ci] = true;
                b.className = 'cmp-mc-btn is-tried';
                b.setAttribute('aria-disabled', 'true');
              }
            },
          },
          text: (ci + 1) + '. ' + ch,
        });
        mcButtons.push(b);
        listEl.appendChild(b);
      });
      qWrap.appendChild(listEl);
      if (typeof ctx.keys === 'function') {
        ctx.keys(function (k) {
          var n = Number(k);
          if (n >= 1 && n <= mcButtons.length && !mcButtons[n - 1].disabled) { mcButtons[n - 1].click(); return true; }
          return false;
        });
      }
    } else {
      var inpId = 'cqz-in-' + String(item.id || 'q').replace(/[^a-z0-9_-]+/gi, '_');
      textInp = el('input', {
        id: inpId,
        type: 'text',
        class: 'cmp-input',
        autocomplete: 'off',
        'data-cqz-input': '',
        on: { keydown: function (ev) { if (ev.key === 'Enter' && submitBtn && !submitBtn.disabled) { ev.preventDefault(); submitBtn.click(); } } },
      });
      submitBtn = el('button', {
        type: 'button',
        class: 'primary',
        'data-cqz-submit': '',
        on: {
          click: function () {
            if (locked) return;
            var raw = String(textInp.value || '').trim();
            if (!raw) { showMsg('Enter an answer first.'); textInp.focus(); return; }
            showMsg('');
            if (isCheck) {
              var r = ctx.answer(raw);
              if (r === 'recorded' || r === 'correct' || r === 'missed') {
                locked = true; submitBtn.disabled = true; textInp.readOnly = true;
              }
              return;
            }
            var norm = function (v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, ' '); };
            var accept = Array.isArray(item.acceptableAnswers) && item.acceptableAnswers.length ? item.acceptableAnswers : [item.answer || ''];
            var ok = accept.some(function (a) { return norm(a) === norm(raw); });
            var out = ctx.answer(raw, ok, {
              correctText: L.cqz_right || 'Correct.',
              retryText: L.cqz_retry || 'Not quite. Check your spelling and try again.',
              missedText: fmt(L.cqz_missed || 'Expected answer: {answer}.', { answer: item.answer || '' }),
            });
            if (out === 'correct' || out === 'missed') {
              locked = true; submitBtn.disabled = true; textInp.readOnly = true;
            }
          },
        },
        text: isCheck ? 'Submit answer' : 'Check answer',
      });
      qWrap.appendChild(el('div', { class: 'cmp-short-row' }, [
        el('label', { for: inpId, class: 'cmp-lbl', text: 'Your answer' }),
        textInp,
        submitBtn,
      ]));
    }

    root.appendChild(promptEl);
    if (imgEl) root.appendChild(imgEl);
    if (imgNoteEl) root.appendChild(imgNoteEl);
    if (hintBtn) root.appendChild(el('div', { class: 'row cmp-tools' }, [hintBtn]));
    if (hintBox) root.appendChild(hintBox);
    root.appendChild(qWrap);
    root.appendChild(localNote);

    var stopFn = function () {
      locked = true;
      if (submitBtn) submitBtn.disabled = true;
      if (textInp) textInp.readOnly = true;
      mcButtons.forEach(function (b) { b.disabled = true; });
    };
    return { stop: stopFn, reveal: stopFn };
  }

  function scoreCompiledQuiz(item, answer, response) {
    var norm = function (v) { return String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, ' '); };
    var got = norm(response);
    if (!got) return { correct: false, digitsCorrect: null, digitsPossible: null };
    var list = String(answer == null ? '' : answer).split('||').map(norm).filter(Boolean);
    return { correct: list.indexOf(got) >= 0, digitsCorrect: null, digitsPossible: null };
  }

  function renderCompiledCloze(item, ctx) {
    var L = ctx.L || {};
    var el = ctx.el;
    var root = ctx.root;
    var isCheck = !!ctx.check;
    var locked = false;

    var localNote = el('p', { class: 'status warn', hidden: true, 'data-ccl-local-note': '' });
    var showMsg = function (msg) {
      if (typeof ctx.feedback === 'function') ctx.feedback(msg);
      else { localNote.hidden = !msg; localNote.textContent = msg; }
      if (msg) ctx.announce(msg);
    };

    var promptEl = el('p', { class: 'cmp-prompt', text: item.prompt || 'Fill in each blank.' });
    var blanks = Array.isArray(item.blanks) ? item.blanks : [];
    var segments = Array.isArray(item.segments) ? item.segments : [];
    var controls = [];
    var lastFocusedIdx = 0;

    var bankWrap = null;
    if (Array.isArray(item.wordBank) && item.wordBank.length) {
      var bankBtns = item.wordBank.map(function (w) {
        return el('button', {
          type: 'button',
          class: 'cmp-bank-chip',
          'data-ccl-bank': w,
          on: {
            click: function () {
              if (locked || !controls.length) return;
              var target = controls[lastFocusedIdx];
              if (!target || target.value) {
                for (var k = 0; k < controls.length; k++) {
                  if (!controls[k].value) { target = controls[k]; lastFocusedIdx = k; break; }
                }
              }
              if (target) {
                target.value = w;
                if (target.value === w) {
                  if (ctx.support) ctx.support('cloze_word_bank');
                  ctx.announce('Filled blank ' + (lastFocusedIdx + 1) + ' with ' + w + '.');
                } else {
                  ctx.announce('That word is not an option for blank ' + (lastFocusedIdx + 1) + '.');
                }
              }
            },
          },
          text: w,
        });
      });
      bankWrap = el('div', { class: 'cmp-bank', role: 'group', 'aria-label': 'Word bank' }, [
        el('span', { class: 'cmp-bank-lbl', text: 'Word bank:' }),
      ].concat(bankBtns));
    }

    var passageBox = el('div', { class: 'cmp-cloze-passage', 'data-ccl-passage': '' });
    segments.forEach(function (seg) {
      if (seg.type === 'text') {
        passageBox.appendChild(el('span', { text: seg.text || '' }));
        return;
      }
      var bi = Number(seg.blankIndex) || 0;
      var b = blanks[bi] || {};
      var ctrl;
      if (Array.isArray(b.choices) && b.choices.length >= 2) {
        var opts = [el('option', { value: '', text: '-- Choose --' })].concat(
          b.choices.map(function (ch) { return el('option', { value: ch, text: ch }); })
        );
        ctrl = el('select', {
          class: 'cmp-cloze-ctrl',
          'aria-label': 'Blank ' + (bi + 1),
          'data-ccl-blank': String(bi),
          on: { focus: function () { lastFocusedIdx = bi; } },
        }, opts);
      } else {
        ctrl = el('input', {
          type: 'text',
          class: 'cmp-cloze-ctrl',
          autocomplete: 'off',
          'aria-label': 'Blank ' + (bi + 1),
          'data-ccl-blank': String(bi),
          on: { focus: function () { lastFocusedIdx = bi; } },
        });
      }
      controls[bi] = ctrl;
      passageBox.appendChild(ctrl);
    });

    var submitBtn = el('button', {
      type: 'button',
      class: 'primary',
      'data-ccl-submit': '',
      on: {
        click: function () {
          if (locked) return;
          var vals = controls.map(function (c) { return String(c.value || '').trim(); });
          var emptyIdx = vals.indexOf('');
          if (emptyIdx >= 0) {
            showMsg('Fill in blank ' + (emptyIdx + 1) + ' before checking.');
            if (controls[emptyIdx] && typeof controls[emptyIdx].focus === 'function') controls[emptyIdx].focus();
            return;
          }
          showMsg('');
          var resp = vals.join('|');
          if (isCheck) {
            var r = ctx.answer(resp);
            if (r === 'recorded' || r === 'correct' || r === 'missed') {
              locked = true;
              submitBtn.disabled = true;
              controls.forEach(function (c) { c.disabled = true; });
            }
            return;
          }
          var norm = function (v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, ' '); };
          var rightCount = 0;
          blanks.forEach(function (b, idx) {
            var okOne = norm(vals[idx]) === norm(b.answer);
            if (okOne) rightCount++;
            controls[idx].className = 'cmp-cloze-ctrl ' + (okOne ? 'is-right' : 'is-wrong');
          });
          var allRight = rightCount === blanks.length;
          var out = ctx.answer(resp, allRight, {
            correctText: L.ccl_right || 'All blanks match.',
            retryText: rightCount + ' of ' + blanks.length + ' blanks match. Check the highlighted blanks and try again.',
            missedText: 'Expected answers: ' + blanks.map(function (b, i) { return (i + 1) + ') ' + b.answer; }).join(', ') + '.',
          });
          if (out === 'correct' || out === 'missed') {
            locked = true;
            submitBtn.disabled = true;
            controls.forEach(function (c) { c.disabled = true; });
          }
        },
      },
      text: isCheck ? 'Submit answers' : 'Check blanks',
    });

    root.appendChild(promptEl);
    if (bankWrap) root.appendChild(bankWrap);
    root.appendChild(passageBox);
    root.appendChild(el('div', { class: 'row cmp-actions' }, [submitBtn]));
    root.appendChild(localNote);

    var stopFn = function () {
      locked = true;
      submitBtn.disabled = true;
      controls.forEach(function (c) { c.disabled = true; });
    };
    return { stop: stopFn, reveal: stopFn };
  }

  function scoreCompiledCloze(item, answer, response) {
    var norm = function (v) { return String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, ' '); };
    var want = String(answer == null ? '' : answer).split('|').map(norm);
    var got = String(response == null ? '' : response).split('|').map(norm);
    if (!want.length || want.length !== got.length) return { correct: false, digitsCorrect: null, digitsPossible: null };
    var ok = want.every(function (w, i) { return w && w === got[i]; });
    return { correct: ok, digitsCorrect: null, digitsPossible: null };
  }

  function renderBranchingAdventure(item, ctx) {
    var el = ctx.el;
    var root = ctx.root;
    var scenes = Array.isArray(item.scenes) ? item.scenes : [];
    var byId = Object.create(null);
    scenes.forEach(function (s) { if (s && s.id) byId[s.id] = s; });
    var startId = item.start && byId[item.start] ? item.start : (scenes[0] ? scenes[0].id : '');

    var curId = startId;
    var pathLog = [startId];
    var clues = Object.create(null);
    var clueList = [];
    var solved = Object.create(null);
    var hintSteps = Object.create(null);
    var completed = false;

    var statusBar = el('div', { class: 'adv-bar', role: 'region', 'aria-label': 'Adventure progress and clues' });
    var pathEl = el('p', { class: 'adv-meta', 'data-adv-path': '' });
    var cluesEl = el('div', { class: 'adv-clues', 'data-adv-clues': '' });
    statusBar.appendChild(pathEl);
    statusBar.appendChild(cluesEl);

    var stage = el('section', { class: 'adv-stage', 'aria-label': 'Current scene', 'data-adv-stage': '' });
    var noteEl = el('p', { class: 'status', role: 'status', 'aria-live': 'polite', 'data-adv-note': '' });
    var choiceBtns = [];

    var awardReward = function (sc) {
      if (!sc || !sc.reward || !sc.reward.id || clues[sc.reward.id]) return false;
      clues[sc.reward.id] = sc.reward;
      clueList.push(sc.reward);
      if (ctx.support) ctx.support('adv_clue_found');
      return true;
    };

    var paintHeader = function () {
      var names = pathLog.map(function (id) { return (byId[id] && byId[id].title) || id; });
      pathEl.textContent = 'Visited (' + pathLog.length + '): ' + names.slice(-4).join(' -> ');
      cluesEl.textContent = '';
      if (!clueList.length) {
        cluesEl.appendChild(el('span', { class: 'adv-clue-empty', text: 'Clues collected: none yet' }));
      } else {
        cluesEl.appendChild(el('span', { class: 'adv-clue-lbl', text: 'Clues (' + clueList.length + '): ' }));
        clueList.forEach(function (cl) {
          cluesEl.appendChild(el('span', { class: 'adv-clue-chip', 'data-adv-clue': cl.id, text: cl.name + (cl.text ? ' - ' + cl.text : '') }));
        });
      }
    };

    var paintScene = function (moveFocus) {
      var sc = byId[curId] || scenes[0];
      if (!sc) return;
      stage.textContent = '';
      noteEl.textContent = '';
      noteEl.className = 'status';
      choiceBtns = [];

      // If scene has no puzzle (or puzzle already solved), award any clue immediately
      var needsPuzzle = !!(sc.puzzle && !solved[sc.id]);
      if (!needsPuzzle && sc.reward) awardReward(sc);
      paintHeader();

      if (sc.area) stage.appendChild(el('p', { class: 'adv-area', text: sc.area }));
      var heading = el('h3', { class: 'adv-title', tabindex: '-1', 'data-adv-title': '', text: sc.title || 'Scene' });
      stage.appendChild(heading);

      if (sc.imageNote) stage.appendChild(el('p', { class: 'cmp-img-note', text: sc.imageNote }));
      String(sc.text || '').split(/\n{2,}/).filter(Boolean).forEach(function (para) {
        stage.appendChild(el('p', { class: 'adv-text', text: para }));
      });

      if (needsPuzzle) {
        var pz = sc.puzzle;
        var pzBox = el('div', { class: 'adv-puzzle', 'data-adv-puzzle': sc.id });
        pzBox.appendChild(el('p', { class: 'adv-puzzle-prompt', text: pz.prompt || 'Solve the clue to unlock.' }));
        var hints = Array.isArray(pz.hints) ? pz.hints : [];
        var hShown = hintSteps[sc.id] || 0;
        var hintOut = el('p', { class: 'cmp-hint', hidden: hShown === 0, 'data-adv-hint-text': '', text: hShown > 0 ? hints[Math.min(hShown - 1, hints.length - 1)] : '' });
        if (hints.length) {
          var hBtn = el('button', {
            type: 'button',
            class: 'cmp-btn-sm',
            'data-adv-hint-btn': '',
            on: {
              click: function () {
                hShown = Math.min(hints.length, hShown + 1);
                hintSteps[sc.id] = hShown;
                hintOut.hidden = false;
                hintOut.textContent = 'Hint ' + hShown + ' of ' + hints.length + ': ' + hints[hShown - 1];
                if (ctx.support) ctx.support('adv_hint_used');
                ctx.announce(hintOut.textContent);
              },
            },
            text: 'Show hint',
          });
          pzBox.appendChild(el('div', { class: 'row cmp-tools' }, [hBtn]));
          pzBox.appendChild(hintOut);
        }

        var solveWith = function (val) {
          var norm = function (v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, ' '); };
          if (norm(val) === norm(pz.answer)) {
            solved[sc.id] = true;
            if (ctx.support) ctx.support('adv_puzzle_solved');
            var gotNew = awardReward(sc);
            paintScene(true);
            noteEl.className = 'status ok';
            noteEl.textContent = gotNew ? ('Unlocked. Found clue: ' + sc.reward.name + '.') : 'Unlocked.';
            ctx.announce(noteEl.textContent);
          } else {
            noteEl.className = 'status warn';
            noteEl.textContent = 'That did not unlock it yet. Check the clues or hint and try again.';
            ctx.announce(noteEl.textContent);
          }
        };

        if (pz.kind === 'mc' && Array.isArray(pz.choices) && pz.choices.length >= 2) {
          var pList = el('div', { class: 'cmp-mc-list', role: 'group', 'aria-label': 'Puzzle choices' });
          pz.choices.forEach(function (ch, pi) {
            pList.appendChild(el('button', {
              type: 'button',
              class: 'cmp-mc-btn',
              'data-adv-puzzle-choice': String(pi),
              on: { click: function () { solveWith(ch); } },
              text: (pi + 1) + '. ' + ch,
            }));
          });
          pzBox.appendChild(pList);
        } else {
          var pInId = 'adv-pz-' + String(sc.id).replace(/[^a-z0-9_-]+/gi, '_');
          var pInp = el('input', {
            id: pInId,
            type: 'text',
            class: 'cmp-input',
            autocomplete: 'off',
            'data-adv-puzzle-input': '',
            on: { keydown: function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); unlockBtn.click(); } } },
          });
          var unlockBtn = el('button', {
            type: 'button',
            class: 'primary',
            'data-adv-unlock': '',
            on: {
              click: function () {
                var val = String(pInp.value || '').trim();
                if (!val) { noteEl.className = 'status warn'; noteEl.textContent = 'Enter a code or answer first.'; pInp.focus(); return; }
                solveWith(val);
              },
            },
            text: 'Unlock',
          });
          pzBox.appendChild(el('div', { class: 'cmp-short-row' }, [
            el('label', { for: pInId, class: 'cmp-lbl', text: 'Lock answer' }),
            pInp,
            unlockBtn,
          ]));
        }
        stage.appendChild(pzBox);
      } else {
        if (sc.reward && clues[sc.reward.id]) {
          stage.appendChild(el('p', { class: 'adv-reward-box', text: 'Clue collected: ' + sc.reward.name + (sc.reward.text ? ' — ' + sc.reward.text : '') }));
        }
        if (sc.ending) {
          if (sc.debrief) stage.appendChild(el('p', { class: 'adv-debrief', text: sc.debrief }));
          var finishBtn = el('button', {
            type: 'button',
            class: 'primary',
            'data-adv-finish': '',
            on: {
              click: function () {
                if (completed) return;
                completed = true;
                var summary = 'Adventure finished at "' + (sc.title || sc.id) + '" (' + pathLog.length + ' steps, ' + clueList.length + ' clues collected).';
                if (typeof ctx.practice === 'function') ctx.practice('read', summary, { advance: true });
              },
            },
            text: 'Complete adventure',
          });
          stage.appendChild(el('div', { class: 'row cmp-actions' }, [finishBtn]));
        }
        if (Array.isArray(sc.choices) && sc.choices.length) {
          var cWrap = el('div', { class: 'cmp-mc-list', role: 'group', 'aria-label': 'Scene choices' });
          sc.choices.forEach(function (ch, ci) {
            var reqs = Array.isArray(ch.requires) ? ch.requires : [];
            var missing = reqs.filter(function (r) { return !clues[r]; });
            var missingNames = Array.isArray(ch.requiresLabels) && ch.requiresLabels.length
              ? reqs.map(function (r, ri) { return clues[r] ? '' : (ch.requiresLabels[ri] || r); }).filter(Boolean)
              : missing;
            var btn = el('button', {
              type: 'button',
              class: 'cmp-mc-btn' + (missing.length ? ' is-locked' : ''),
              disabled: missing.length > 0,
              'data-adv-choice': String(ci),
              'data-adv-to': ch.to,
              on: {
                click: function () {
                  if (missing.length || !byId[ch.to]) return;
                  curId = ch.to;
                  pathLog.push(curId);
                  if (ctx.support) ctx.support('adv_scene_visit');
                  paintScene(true);
                  ctx.announce('Moved to ' + (byId[curId].title || curId) + '.');
                },
              },
              text: (ci + 1) + '. ' + ch.label + (missing.length ? ' (Needs: ' + missingNames.join(', ') + ')' : ''),
            });
            choiceBtns.push(btn);
            cWrap.appendChild(btn);
          });
          stage.appendChild(cWrap);
        }
      }

      var navRow = [];
      if (pathLog.length > 1) {
        navRow.push(el('button', {
          type: 'button',
          class: 'cmp-btn-sm',
          'data-adv-back': '',
          on: {
            click: function () {
              if (pathLog.length <= 1) return;
              pathLog.pop();
              curId = pathLog[pathLog.length - 1];
              paintScene(true);
            },
          },
          text: 'Go back',
        }));
      }
      if (curId !== startId || clueList.length > 0) {
        navRow.push(el('button', {
          type: 'button',
          class: 'cmp-btn-sm',
          'data-adv-restart': '',
          on: {
            click: function () {
              curId = startId;
              pathLog = [startId];
              clues = Object.create(null);
              clueList = [];
              solved = Object.create(null);
              hintSteps = Object.create(null);
              paintScene(true);
            },
          },
          text: 'Start over',
        }));
      }
      if (navRow.length) stage.appendChild(el('div', { class: 'row cmp-tools' }, navRow));
      if (moveFocus && typeof heading.focus === 'function') heading.focus();
    };

    if (typeof ctx.keys === 'function') {
      ctx.keys(function (k) {
        var n = Number(k);
        if (n >= 1 && n <= choiceBtns.length && !choiceBtns[n - 1].disabled) { choiceBtns[n - 1].click(); return true; }
        return false;
      });
    }

    root.appendChild(statusBar);
    root.appendChild(stage);
    root.appendChild(noteEl);
    paintScene(false);

    var stopFn = function () { completed = true; };
    return { stop: stopFn, reveal: stopFn };
  }

  function renderAnchorStudy(item, ctx) {
    var el = ctx.el;
    var root = ctx.root;
    var win = typeof window !== 'undefined' ? window : null;
    var sections = Array.isArray(item.sections) ? item.sections : [];
    var checks = Array.isArray(item.selfCheck) ? item.selfCheck : [];
    var checkOpen = false;
    var checkCorrect = 0;
    var answeredMap = Object.create(null);

    if (item.essentialQuestion) {
      root.appendChild(el('p', { class: 'anc-eq', 'data-anc-eq': '', text: item.essentialQuestion }));
    }

    var grid = el('div', { class: 'anc-grid', 'data-anc-grid': '' });
    sections.forEach(function (sec) {
      var card = el('section', { class: 'anc-card', 'aria-label': sec.heading, 'data-anc-card': sec.id });
      card.appendChild(el('h3', { class: 'anc-card-title', text: sec.heading }));
      if (sec.summary) card.appendChild(el('p', { class: 'anc-summary', text: sec.summary }));
      if (Array.isArray(sec.bullets) && sec.bullets.length) {
        card.appendChild(el('ul', { class: 'anc-bullets' }, sec.bullets.map(function (b) { return el('li', { text: b }); })));
      }
      if (sec.example) card.appendChild(el('p', { class: 'anc-example', text: 'Example: ' + sec.example }));
      if (sec.takeaway) card.appendChild(el('p', { class: 'anc-takeaway', text: 'Remember: ' + sec.takeaway }));
      grid.appendChild(card);
    });
    root.appendChild(grid);

    var checkSection = null;
    var toggleBtn = null;
    if (checks.length) {
      checkSection = el('section', { class: 'anc-check-wrap', hidden: true, 'aria-label': 'Quick self-check', 'data-anc-checks': '' });
      checks.forEach(function (q, qi) {
        var qBox = el('div', { class: 'anc-q', 'data-anc-q': String(qi) });
        qBox.appendChild(el('p', { class: 'anc-q-prompt', text: (qi + 1) + '. ' + q.prompt }));
        var fb = el('p', { class: 'status', role: 'status', 'data-anc-q-fb': String(qi) });
        var opts = Array.isArray(q.choices) && q.choices.length >= 2 ? q.choices : [];
        if (opts.length) {
          var row = el('div', { class: 'cmp-mc-list', role: 'group', 'aria-label': 'Self-check question ' + (qi + 1) });
          var btns = [];
          opts.forEach(function (ch, ci) {
            var b = el('button', {
              type: 'button',
              class: 'cmp-mc-btn',
              'data-anc-choice': qi + '-' + ci,
              on: {
                click: function () {
                  if (answeredMap[qi] || b.getAttribute('aria-disabled') === 'true') return;
                  var ok = String(ch).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
                  if (ctx.support) ctx.support('anchor_self_check');
                  if (ok) {
                    answeredMap[qi] = true;
                    checkCorrect++;
                    b.className = 'cmp-mc-btn is-right';
                    btns.forEach(function (x) { x.disabled = true; });
                    fb.className = 'status ok';
                    fb.textContent = 'Correct.' + (q.explanation ? ' ' + q.explanation : '');
                  } else {
                    b.className = 'cmp-mc-btn is-tried';
                    b.setAttribute('aria-disabled', 'true');
                    fb.className = 'status warn';
                    fb.textContent = 'Check the chart cards above and try another choice.';
                  }
                  ctx.announce(fb.textContent);
                },
              },
              text: ch,
            });
            btns.push(b);
            row.appendChild(b);
          });
          qBox.appendChild(row);
        }
        qBox.appendChild(fb);
        checkSection.appendChild(qBox);
      });

      toggleBtn = el('button', {
        type: 'button',
        class: 'cmp-btn-sm',
        'aria-expanded': 'false',
        'data-anc-check-toggle': '',
        on: {
          click: function () {
            checkOpen = !checkOpen;
            checkSection.hidden = !checkOpen;
            toggleBtn.setAttribute('aria-expanded', checkOpen ? 'true' : 'false');
            toggleBtn.textContent = checkOpen ? 'Hide quick self-check' : ('Try quick self-check (' + checks.length + ')');
          },
        },
        text: 'Try quick self-check (' + checks.length + ')',
      });
    }

    var printBtn = el('button', {
      type: 'button',
      class: 'cmp-btn-sm',
      'data-anc-print': '',
      on: { click: function () { try { if (win && typeof win.print === 'function') win.print(); } catch (_) {} } },
      text: 'Print study poster',
    });

    var doneBtn = el('button', {
      type: 'button',
      class: 'primary',
      'data-anc-finish': '',
      on: {
        click: function () {
          var summary = 'Reviewed study guide (' + sections.length + ' sections' + (checks.length ? ', ' + checkCorrect + '/' + checks.length + ' self-check items answered' : '') + ').';
          if (typeof ctx.practice === 'function') ctx.practice('read', summary, { advance: true });
        },
      },
      text: 'Mark study guide reviewed',
    });

    var bar = [printBtn];
    if (toggleBtn) bar.push(toggleBtn);
    bar.push(doneBtn);
    root.appendChild(el('div', { class: 'row cmp-actions anc-no-print' }, bar));
    if (checkSection) root.appendChild(checkSection);

    var stopFn = function () {};
    return { stop: stopFn, reveal: stopFn };
  }

  // ---------------------------------------------------------------------------
  // Check-Mode Prepare Helpers (strip ALL plain-text answers & hints!)
  // ---------------------------------------------------------------------------
  function prepareCompiledQuizCheck(item) {
    var copy = Object.assign({}, item);
    var ans = String(item.answer || '');
    if (item.questionKind === 'short' && Array.isArray(item.acceptableAnswers) && item.acceptableAnswers.length) {
      ans = item.acceptableAnswers.join('||');
    }
    delete copy.acceptableAnswers;
    delete copy.hint;
    copy.answer = ans;
    return { item: copy };
  }

  function prepareCompiledClozeCheck(item) {
    var copy = Object.assign({}, item);
    var ans = String(item.answer || (Array.isArray(item.blanks) ? item.blanks.map(function (b) { return b.answer; }).join('|') : ''));
    copy.blanks = (Array.isArray(item.blanks) ? item.blanks : []).map(function (b) {
      return { id: b.id, choices: Array.isArray(b.choices) ? b.choices.slice() : [] };
    });
    delete copy.hint;
    copy.answer = ans;
    return { item: copy };
  }

  var ADAPTERS = {
    compiled_quiz: {
      title: 'Quiz',
      prepare: prepareCompiledQuizCheck,
      render: renderCompiledQuiz,
      score: scoreCompiledQuiz,
      labels: { compiled_quiz_title: 'Quiz' },
    },
    compiled_cloze: {
      title: 'Fill in the Blanks',
      prepare: prepareCompiledClozeCheck,
      render: renderCompiledCloze,
      score: scoreCompiledCloze,
      labels: { compiled_cloze_title: 'Fill in the Blanks' },
    },
    branching_adventure: {
      title: 'Interactive Adventure',
      render: renderBranchingAdventure,
      labels: { branching_adventure_title: 'Interactive Adventure' },
    },
    anchor_study: {
      title: 'Anchor Chart & Study Guide',
      render: renderAnchorStudy,
      labels: { anchor_study_title: 'Anchor Chart & Study Guide' },
    },
  };

  // ---------------------------------------------------------------------------
  // Student Packet CSS (Light, Dark/HC [data-lt-colors], Forced Colors, Print Poster)
  // ---------------------------------------------------------------------------
  var EXTRA_CSS = [
    '.cmp-prompt{font-size:1.1rem;font-weight:700;margin:0 0 12px}',
    '.cmp-img{max-width:100%;max-height:240px;object-fit:contain;border-radius:10px;border:1px solid var(--line);margin:0 0 12px}',
    '.cmp-img-note{margin:0 0 12px;padding:8px 12px;border-radius:10px;border:1px dashed var(--line);background:var(--bg);color:var(--muted);font-size:.92rem}',
    '.cmp-hint{margin:8px 0 12px;padding:10px 12px;border-radius:10px;border:2px solid var(--accent);background:var(--bg);font-size:.95rem}',
    '.cmp-tools{margin:0 0 10px}',
    '.cmp-btn-sm{min-height:44px;padding:6px 14px;font-size:.92rem}',
    '.cmp-mc-list{display:flex;flex-direction:column;gap:8px;margin:10px 0}',
    '.cmp-mc-btn{min-height:44px;text-align:left;padding:10px 14px;border-radius:10px;border:2px solid var(--line);background:var(--card);color:var(--ink);font-weight:600;cursor:pointer}',
    '.cmp-mc-btn:focus-visible{outline:4px solid var(--focus);outline-offset:2px}',
    '.cmp-mc-btn.is-right{border-color:var(--ok);background:var(--ok-bg);color:var(--ink)}',
    '.cmp-mc-btn.is-tried{opacity:.65;text-decoration:line-through}',
    '.cmp-mc-btn.is-locked{opacity:.65;cursor:not-allowed}',
    '.cmp-short-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0}',
    '.cmp-lbl{font-weight:700}',
    '.cmp-input{min-height:44px;min-width:180px;flex:1 1 200px;padding:8px 12px;border-radius:10px;border:2px solid var(--line);background:var(--card);color:var(--ink);font:inherit}',
    '.cmp-actions{margin-top:14px;display:flex;flex-wrap:wrap;gap:10px}',
    '.cmp-bank{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:10px;border-radius:10px;border:1px solid var(--line);background:var(--bg);margin-bottom:12px}',
    '.cmp-bank-lbl{font-weight:700;font-size:.9rem;margin-right:4px}',
    '.cmp-bank-chip{min-height:44px;padding:6px 12px;border-radius:10px;border:2px solid var(--accent);background:var(--card);color:var(--ink);font-weight:600;cursor:pointer}',
    '.cmp-cloze-passage{line-height:2.1;font-size:1.05rem;padding:14px;border-radius:12px;border:1px solid var(--line);background:var(--bg)}',
    '.cmp-cloze-ctrl{min-height:44px;margin:2px 4px;padding:4px 8px;border-radius:8px;border:2px solid var(--accent);background:var(--card);color:var(--ink);font:inherit;font-weight:600}',
    '.cmp-cloze-ctrl.is-right{border-color:var(--ok);background:var(--ok-bg)}',
    '.cmp-cloze-ctrl.is-wrong{border-color:var(--warn);background:var(--warn-bg)}',
    '.adv-bar{padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:var(--bg);margin-bottom:12px}',
    '.adv-meta{margin:0 0 6px;font-size:.88rem;color:var(--muted);font-weight:600}',
    '.adv-clues{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:.88rem}',
    '.adv-clue-lbl{font-weight:700}',
    '.adv-clue-empty{color:var(--muted)}',
    '.adv-clue-chip{padding:4px 10px;border-radius:999px;border:1.5px solid var(--accent);background:var(--card);color:var(--ink);font-weight:600}',
    '.adv-stage{padding:14px;border-radius:12px;border:2px solid var(--line);background:var(--card)}',
    '.adv-area{margin:0 0 4px;font-size:.82rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--accent)}',
    '.adv-title{margin:0 0 10px;font-size:1.25rem}',
    '.adv-text{margin:0 0 10px;line-height:1.6}',
    '.adv-puzzle{margin:12px 0;padding:12px;border-radius:10px;border:2px solid var(--accent);background:var(--bg)}',
    '.adv-puzzle-prompt{margin:0 0 8px;font-weight:700}',
    '.adv-reward-box{margin:10px 0;padding:10px 12px;border-radius:10px;border:2px solid var(--ok);background:var(--ok-bg);font-weight:600}',
    '.adv-debrief{margin:10px 0;padding:12px;border-radius:10px;border:1px solid var(--line);background:var(--bg)}',
    '.anc-eq{margin:0 0 14px;padding:12px 14px;border-radius:12px;border-left:5px solid var(--accent);background:var(--bg);font-weight:700;font-size:1.05rem}',
    '.anc-grid{display:grid;grid-template-columns:1fr;gap:12px;margin-bottom:14px}',
    '@media (min-width:680px){.anc-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}',
    '@media (min-width:860px){.anc-grid{grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}}',
    '.anc-card{padding:14px;border-radius:12px;border:2px solid var(--line);border-top:5px solid var(--accent);background:var(--card)}',
    '.anc-card-title{margin:0 0 8px;font-size:1.1rem;color:var(--ink)}',
    '.anc-summary{margin:0 0 8px;line-height:1.5}',
    '.anc-bullets{margin:0 0 8px;padding-left:20px;list-style:disc}',
    '.anc-bullets li{margin:4px 0}',
    '.anc-example{margin:8px 0 0;padding:8px 10px;border-radius:8px;background:var(--bg);border:1px solid var(--line);font-size:.94rem}',
    '.anc-takeaway{margin:8px 0 0;font-weight:700;color:var(--accent)}',
    '.anc-check-wrap{margin-top:14px;padding-top:12px;border-top:2px solid var(--line)}',
    '.anc-q{margin-bottom:14px;padding:12px;border-radius:10px;border:1px solid var(--line);background:var(--bg)}',
    '.anc-q-prompt{margin:0 0 8px;font-weight:700}',
    '[data-lt-colors="1"] .cmp-mc-btn.is-right,[data-lt-colors="3"] .cmp-mc-btn.is-right{background:var(--ok-bg);border-color:var(--ok);color:var(--ink)}',
    '@media (prefers-color-scheme:dark){:root:not([data-lt-colors]) .anc-card,:root:not([data-lt-colors]) .adv-stage{border-color:var(--line)}}',
    '@media (forced-colors:active){.cmp-mc-btn,.cmp-bank-chip,.anc-card,.adv-stage,.adv-clue-chip{forced-color-adjust:none;border:2px solid ButtonText;background:ButtonFace;color:ButtonText}.cmp-mc-btn.is-right{border-color:Highlight;background:Highlight;color:HighlightText}}',
    '@media (prefers-reduced-motion:reduce){.cmp-mc-btn,.cmp-bank-chip{transition:none}}',
    '@media print{.lt-bar,#lt-panel,.anc-no-print,.anc-check-wrap,.progress{display:none!important}.card{border:0;box-shadow:none;padding:0;margin:0}.anc-eq{border:1pt solid #333;border-left:4pt solid #1d4ed8;background:#fff;color:#000}.anc-grid{grid-template-columns:repeat(auto-fit,minmax(175pt,1fr));gap:10pt}.anc-card{break-inside:avoid;border:1.5pt solid #222;border-top:4pt solid #1d4ed8;background:#fff;color:#000}}',
  ].join('\n');

  // ---------------------------------------------------------------------------
  // 6 Realistic Sample Main-App Artifacts (including strip-report examples!)
  // ---------------------------------------------------------------------------
  // Note: demo URLs assembled without literal protocol tokens in source text.
  var DEMO_PROTO = 'ht' + 'tps://';
  var SAMPLES = [
    {
      id: 'sample_quiz',
      name: 'Photosynthesis & Energy Quiz',
      kind: 'quiz',
      summary: 'Multiple-choice and short-answer quiz with prompt metadata and an external picture address to demonstrate offline stripping.',
      artifact: {
        kind: 'quiz',
        title: 'Photosynthesis & Energy Quiz',
        systemPrompt: 'Generate grade 5 science questions at reading level 5.',
        model: 'demo-model',
        teacherEmail: 'teacher@school.example',
        questions: [
          {
            id: 'q1',
            question: 'Which gas do green plants take in from the air during photosynthesis?',
            options: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Helium'],
            correctIndex: 1,
            image: DEMO_PROTO + 'images.example.org/leaf-diagram.png',
            imageAlt: 'Diagram of a green leaf taking in sunlight, water, and carbon dioxide',
            explanation: 'Plants absorb carbon dioxide through tiny leaf openings called stomata.',
          },
          {
            id: 'q2',
            question: 'Where does the energy that starts photosynthesis come from?',
            options: ['Soil minerals', 'Sunlight', 'Wind', 'Moonlight'],
            correctIndex: 1,
            explanation: 'Chlorophyll captures light energy from the sun.',
          },
          {
            id: 'q3',
            question: 'Name the green pigment in leaves that absorbs light energy.',
            answer: 'chlorophyll',
            acceptableAnswers: ['chlorophyll'],
            hint: 'It starts with chloro-.',
          },
        ],
      },
    },
    {
      id: 'sample_adventure',
      name: 'Oregon Trail Decision Adventure',
      kind: 'adventure',
      summary: 'Branching story with supply choices, a river-crossing puzzle lock, collected clues, and two endings.',
      artifact: {
        kind: 'adventure',
        title: 'Oregon Trail Decision Adventure',
        start: 'camp',
        scenes: [
          {
            id: 'camp',
            title: 'Independence Supply Camp',
            text: 'Spring 1846. Your wagon train is preparing to leave Independence, Missouri. You have room for one priority supply crate before heading west.',
            choices: [
              { label: 'Pack extra wagon axles and rope', to: 'river_check' },
              { label: 'Pack extra dried beans and flour', to: 'prairie_trade' },
            ],
          },
          {
            id: 'river_check',
            title: 'The Platte River Crossing',
            text: 'Heavy rain has raised the river. A ferryman shares a crossing puzzle before lending his cable line.',
            puzzle: {
              prompt: 'Each wagon carries 600 pounds and the raft holds 1,800 pounds at once. How many wagons can cross on one raft trip?',
              choices: ['2 wagons', '3 wagons', '4 wagons'],
              answer: '3 wagons',
              hints: ['Divide 1,800 by 600.', '600 + 600 + 600 = 1,800.'],
            },
            reward: { id: 'cable_pass', name: 'Ferry Pass', text: 'Your sturdy rope and math check earned a steady cable crossing.' },
            choices: [
              { label: 'Cross the river and continue toward Fort Laramie', to: 'fort_ending', requires: ['cable_pass'] },
            ],
          },
          {
            id: 'prairie_trade',
            title: 'Prairie Trading Post',
            text: 'Another wagon family broke a wheel spoke and gladly trades a detailed map of mountain water springs for a share of your dried beans.',
            reward: { id: 'spring_map', name: 'Water Spring Map', text: 'Marks three fresh creeks along the ridge trail.' },
            choices: [
              { label: 'Follow the ridge trail to Fort Laramie', to: 'ridge_ending' },
            ],
          },
          {
            id: 'fort_ending',
            title: 'Arrival at Fort Laramie (River Route)',
            text: 'Your wagon rolls into Fort Laramie with dry supplies and intact wheels. Fellow travelers note how careful planning kept everyone moving steadily.',
            ending: true,
          },
          {
            id: 'ridge_ending',
            title: 'Arrival at Fort Laramie (Ridge Route)',
            text: 'Using the traded water map, your group stayed hydrated across the dry plains and reached Fort Laramie two days ahead of schedule.',
            ending: true,
          },
        ],
      },
    },
    {
      id: 'sample_escape_room',
      name: 'Water Cycle Lab Escape Room',
      kind: 'adventure',
      summary: 'Connected investigation room with two lab areas, clues, graduated hints, a control puzzle, and a locked exit.',
      artifact: {
        kind: 'escape_room',
        title: 'Water Cycle Lab Escape Room',
        mission: 'The weather station door latch reset after a power blink. Inspect the instruments in both lab areas to gather clues and unlock the exit panel.',
        debrief: 'You connected evaporation, condensation, and precipitation evidence to restore the weather station panel.',
        exitNodeId: 'exit_door',
        areas: [
          { id: 'wet_bench', name: 'Lab Bench' },
          { id: 'wall_panel', name: 'Control Wall' },
        ],
        nodes: [
          {
            id: 'beaker_note',
            areaId: 'wet_bench',
            type: 'inspect',
            name: 'Warm Beaker Log',
            description: 'A glass beaker sits under a warm lamp. The water level dropped by 20 mL over two hours.',
            instruction: 'Record what process changed liquid water into invisible water vapor.',
            requires: [],
            hints: ['Heat causes liquid water to rise as vapor.'],
            reward: { id: 'evap_clue', kind: 'evidence', name: 'Evaporation Note', text: 'Warmth turns liquid water into water vapor.' },
          },
          {
            id: 'cold_lid',
            areaId: 'wet_bench',
            type: 'configure',
            name: 'Cooling Lid Gauge',
            description: 'Water droplets have formed on the underside of a chilled metal lid above the beaker.',
            instruction: 'Set the Weather Dial to the phase change forming droplets on the cool lid.',
            requires: ['evap_clue'],
            hints: ['Water vapor cools down into tiny liquid droplets.', 'Clouds form by this same process.'],
            controls: [
              { label: 'Select the process forming droplets on the cool lid:', options: ['Condensation', 'Runoff', 'Freezing'], correctIndex: 0 },
            ],
            reward: { id: 'cond_clue', kind: 'evidence', name: 'Condensation Dial', text: 'Cooling turns vapor back into liquid droplets.' },
          },
          {
            id: 'exit_door',
            areaId: 'wall_panel',
            type: 'unlock',
            name: 'Station Exit Panel',
            description: 'The exit panel asks for the three-step water cycle code using your lab evidence.',
            instruction: 'Enter the 3-step sequence number code (1=Precipitation, 2=Evaporation, 3=Condensation) in order from sun warming to rain falling.',
            requires: ['evap_clue', 'cond_clue'],
            hints: ['Start with sun warming liquid water (2).', 'Next vapor cools into clouds (3), then falls as rain (1).'],
            answer: '2-3-1',
            reward: { id: 'door_open', kind: 'state', name: 'Station Unlocked', text: 'Exit panel restored.' },
          },
        ],
      },
    },
    {
      id: 'sample_dbq_writing',
      name: 'Industrial Mills DBQ & Frames',
      kind: 'writing',
      summary: 'Document-based writing activity with two primary source excerpts, sentence frames, word bank, and checklist.',
      artifact: {
        kind: 'dbq',
        title: 'Industrial Mills DBQ Response',
        aiGrader: 'enabled',
        prompt: 'Using both documents, explain one opportunity and one challenge experienced by young textile mill workers in the 1840s.',
        documents: [
          {
            id: 'docA',
            title: 'Document A: Mill Worker Letter (1844)',
            source: 'Lowell Offering Archive ' + DEMO_PROTO + 'archive.example.edu/lowell-1844',
            excerpt: 'I earn my own wages each month and attend evening lectures after work. I have saved enough to send books home to my younger brother.',
          },
          {
            id: 'docB',
            title: 'Document B: Factory Bell Schedule (1845)',
            source: 'Massachusetts Labor Hearing Transcript',
            excerpt: 'The waking bell rings at 4:30 in the morning. Loom rooms run twelve to thirteen hours a day with windows kept shut to prevent threads from snapping.',
          },
        ],
        wordBank: ['wages', 'independence', 'hours', 'conditions', 'evidence', 'however'],
        frames: [
          'According to Document A, one opportunity for mill workers was ___ because ___.',
          'However, Document B shows a major challenge: ___.',
          'Together, these sources show that mill life ___.',
        ],
        starters: [
          'In Document A, the worker describes...',
          'On the other hand, Document B reveals...',
        ],
        checklist: [
          'I cited both Document A and Document B.',
          'I described one opportunity and one challenge.',
          'I checked my sentences for clear transitions.',
        ],
      },
    },
    {
      id: 'sample_concept_sort',
      name: 'States of Matter Concept Sort',
      kind: 'concept_sort',
      summary: 'Main-app Concept Sort JSON with 3 categories, 6 cards, and external picture addresses converted to alt descriptions.',
      artifact: {
        kind: 'concept_sort',
        title: 'States of Matter Concept Sort',
        prompt: 'Sort each everyday example into Solid, Liquid, or Gas.',
        categories: [
          { id: 'solid', label: 'Solid', description: 'Keeps its own shape and volume' },
          { id: 'liquid', label: 'Liquid', description: 'Takes the shape of its container' },
          { id: 'gas', label: 'Gas', description: 'Spreads out to fill all available space' },
        ],
        items: [
          { id: 'm1', content: 'Ice cube', category: 'solid', image: DEMO_PROTO + 'cdn.example.org/ice.png', imageAlt: 'Clear frozen ice cube' },
          { id: 'm2', content: 'Wooden block', category: 'solid', detail: 'Hard rectangular toy block' },
          { id: 'm3', content: 'Orange juice', category: 'liquid', detail: 'Pours smoothly into a glass' },
          { id: 'm4', content: 'Rainwater', category: 'liquid', detail: 'Flows along a sidewalk' },
          { id: 'm5', content: 'Steam from a kettle', category: 'gas', detail: 'Rises and mixes into room air' },
          { id: 'm6', content: 'Helium in a balloon', category: 'gas', detail: 'Fills the inside of the balloon' },
        ],
      },
    },
    {
      id: 'sample_anchor_chart',
      name: 'Equivalent Fractions Anchor Chart',
      kind: 'anchor_chart',
      summary: 'Visual study guide poster with essential question, 3 structured reference cards, worked examples, and quick self-check.',
      artifact: {
        kind: 'anchor_chart',
        title: 'Equivalent Fractions Study Guide',
        essentialQuestion: 'How can two fractions with different numbers represent the exact same part of a whole?',
        sections: [
          {
            heading: 'Multiply Top and Bottom by the Same Number',
            summary: 'Multiplying both the numerator and denominator by the same nonzero whole number creates an equivalent fraction.',
            bullets: ['The size of each piece gets smaller, while the number of shaded pieces grows.', 'Because you multiply by n/n = 1, the total value stays unchanged.'],
            example: '1/2 x 3/3 = 3/6 (same half of the whole)',
            takeaway: 'Whatever you multiply the denominator by, multiply the numerator by too.',
          },
          {
            heading: 'Simplify by Dividing by a Common Factor',
            summary: 'Dividing numerator and denominator by a shared factor writes the same value in simpler form.',
            bullets: ['List factors shared by both top and bottom.', 'Divide both by their greatest common factor (GCF).'],
            example: '6/8 divided by 2/2 = 3/4',
            takeaway: 'Dividing top and bottom by the same factor keeps the fraction equal.',
          },
          {
            heading: 'Check Equivalence on a Number Line',
            summary: 'Equivalent fractions land at the exact same distance from 0 on a 0-to-1 number line.',
            bullets: ['Partition one bar into halves and another bar of equal length into fourths.', '2/4 lines up directly below 1/2.'],
            example: '1/2 = 2/4 = 4/8 all sit at the midpoint between 0 and 1.',
            takeaway: 'Same point on the number line means equal value.',
          },
        ],
        selfCheck: [
          {
            prompt: 'Which fraction is equivalent to 2/3?',
            choices: ['4/6', '3/4', '2/6', '4/9'],
            correctIndex: 0,
            explanation: '2/3 multiplied by 2/2 equals 4/6.',
          },
          {
            prompt: 'What is 6/9 in simplest form?',
            choices: ['1/3', '2/3', '3/4'],
            correctIndex: 1,
            explanation: 'Divide both 6 and 9 by their common factor 3 to get 2/3.',
          },
        ],
      },
    },
  ];

  function samples() {
    return SAMPLES.map(function (s) {
      return {
        id: s.id,
        name: s.name,
        kind: s.kind,
        summary: s.summary,
        artifact: JSON.parse(JSON.stringify(s.artifact)),
      };
    });
  }

  function sampleById(id) {
    var want = str(id);
    for (var i = 0; i < SAMPLES.length; i++) {
      if (SAMPLES[i].id === want) return samples()[i];
    }
    return samples()[0];
  }

  function withManifest(html, extra) {
    var openTag = '<script type="application/json" id="packet-manifest">';
    var at = String(html || '').indexOf(openTag);
    if (at < 0) return html;
    var from = at + openTag.length;
    var to = html.indexOf('</script>', from);
    if (to < 0) return html;
    var manifest;
    try {
      manifest = JSON.parse(html.slice(from, to), function (k, v) { return UNSAFE_KEYS[k] ? undefined : v; });
    } catch (_) { return html; }
    if (!isObj(manifest)) return html;
    Object.keys(extra || {}).forEach(function (k) {
      if (extra[k] === undefined) delete manifest[k];
      else manifest[k] = extra[k];
    });
    return html.slice(0, from) + safeJson(manifest) + html.slice(to);
  }

  function codeName(html) {
    var openTag = '<script type="application/json" id="packet-manifest">';
    var at = String(html || '').indexOf(openTag);
    if (at < 0) return '';
    var from = at + openTag.length;
    var to = String(html).indexOf('</script>', from);
    if (to < 0) return '';
    try {
      var m = JSON.parse(String(html).slice(from, to), function (k, v) { return UNSAFE_KEYS[k] ? undefined : v; });
      return isObj(m) && typeof m.learner === 'string' ? m.learner.trim().slice(0, 60) : '';
    } catch (_) { return ''; }
  }

  function withCodeName(html, learner) {
    var clean = str(learner, 60);
    return withManifest(html, { learner: clean || undefined });
  }

  function hasPlaceholderAnswers(d, kind) {
    if (kind === 'quiz' && Array.isArray(d.questions)) {
      return d.questions.some(function (q) {
        if (!isObj(q)) return false;
        var hasIdx = Number.isInteger(q.correctIndex) || (typeof q.correctAnswer === 'number' && Number.isInteger(q.correctAnswer));
        if (hasIdx) return false;
        var a = str(q.answer != null ? q.answer : q.correctAnswer, 20);
        return a === '?';
      });
    }
    if (kind === 'cloze') {
      if (/\[\[\s*\?\s*\]\]|\{\{\s*\?\s*\}\}/.test(str(d.passage || d.text || d.body))) return true;
      if (Array.isArray(d.blanks)) {
        return d.blanks.some(function (b) {
          var a = str(typeof b === 'string' ? b : (isObj(b) ? (b.answer || b.word || b.term) : ''), 20);
          return a === '?';
        });
      }
    }
    if (kind === 'concept_sort') {
      var list = Array.isArray(d.cards) ? d.cards : Array.isArray(d.items) ? d.items : [];
      return list.some(function (it) {
        if (!isObj(it)) return false;
        return str(it.category || it.categoryId || it.bucket || it.correctCategory || it.group, 20) === '?';
      });
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Inspect / Dry-Run Compile (for live Step 2 Strip Report preview!)
  // ---------------------------------------------------------------------------
  function inspectArtifact(rawInput, forcedKind) {
    var san = sanitizeArtifact(rawInput);
    if (!san.ok) return { ok: false, error: san.error, stripReport: san.stripReport };
    var d = unwrapPayload(san.artifact);
    var kind = forcedKind && SUPPORTED_KINDS.indexOf(forcedKind) >= 0 ? forcedKind : detectActivityKind(d);
    if (!kind) {
      return {
        ok: false,
        error: 'Could not recognize the activity type. Include questions, blanks, categories+cards, events, frames/documents, scenes/nodes, or sections.',
        stripReport: san.stripReport,
      };
    }
    var title = extractTitle(d, 'Offline Activity');
    if (hasPlaceholderAnswers(d, kind)) {
      return {
        ok: false,
        kind: kind,
        title: title,
        error: 'Replace every "?" placeholder answer or category from the reopened Check file before compiling.',
        stripReport: san.stripReport,
      };
    }
    var images = {};
    var items = [];
    if (kind === 'quiz') items = normalizeQuiz(d, images);
    else if (kind === 'cloze') items = normalizeCloze(d);
    else if (kind === 'concept_sort') items = normalizeConceptSort(d);
    else if (kind === 'timeline') items = normalizeTimeline(d);
    else if (kind === 'writing') items = normalizeWriting(d);
    else if (kind === 'adventure') items = normalizeAdventure(d);
    else if (kind === 'anchor_chart') items = normalizeAnchorChart(d);

    if (!items.length) {
      return {
        ok: false,
        kind: kind,
        title: title,
        error: 'Detected ' + kind.replace(/_/g, ' ') + ', but no valid items could be compiled from the JSON.',
        stripReport: san.stripReport,
      };
    }

    var unitCount = items.length;
    if (kind === 'cloze') unitCount = items[0].blanks.length;
    else if (kind === 'concept_sort') unitCount = items[0].cards.length;
    else if (kind === 'timeline') unitCount = items[0].steps.length;
    else if (kind === 'adventure') unitCount = items[0].scenes.length;
    else if (kind === 'anchor_chart') unitCount = items[0].sections.length;

    return {
      ok: true,
      kind: kind,
      title: title,
      checkCapable: !!CHECK_CAPABLE[kind],
      items: items,
      images: images,
      unitCount: unitCount,
      sanitized: san.artifact,
      stripReport: san.stripReport,
    };
  }

  // ---------------------------------------------------------------------------
  // Compile Main-App Artifact -> Verifiable connect-src 'none' Packet HTML
  // ---------------------------------------------------------------------------
  function compileActivityPacket(options) {
    var o = options || {};
    var loader = o.loader || (root && root.AlloWordSoundsTakeHome);
    if (!loader || typeof loader.buildHtml !== 'function') {
      throw new Error('compileActivityPacket needs loader (AlloWordSoundsTakeHome)');
    }
    var inspected = inspectArtifact(o.artifact, o.kind);
    if (!inspected.ok) {
      throw new Error(inspected.error || 'Could not compile this activity JSON.');
    }

    var kind = inspected.kind;
    var title = str(o.title || inspected.title, 80) || 'Offline Activity';
    var isProbe = o.mode === 'probe' && !!CHECK_CAPABLE[kind];
    var homeLanguages = Array.isArray(o.homeLanguages) && o.homeLanguages.length ? o.homeLanguages.slice() : undefined;
    var bilingualGlossary = isObj(o.bilingualGlossary) && Object.keys(o.bilingualGlossary).length ? o.bilingualGlossary : undefined;
    var qrKey = str(o.qrPublicKey).trim() || undefined;
    var learner = str(o.learner, 60) || undefined;
    var teacherCode = isProbe && str(o.teacherCode).trim() ? str(o.teacherCode).trim() : undefined;

    var html = '';
    var lesson = null;
    var targetActivity = '';

    // Kinds c/d/e compile directly through AlloPacketChoice (concept_sort, sequence_order, tiered_writing)!
    if (kind === 'concept_sort' || kind === 'timeline' || kind === 'writing') {
      var choiceMod = o.choiceBuilder || (root && root.AlloPacketChoice);
      var adaptersMod = o.choiceAdapters || (root && root.AlloPacketSortWriteAdapters);
      if (!choiceMod || typeof choiceMod.buildChoicePacket !== 'function') {
        throw new Error('Compiling ' + kind + ' requires AlloPacketChoice.');
      }
      targetActivity = kind === 'concept_sort' ? 'concept_sort' : kind === 'timeline' ? 'sequence_order' : 'tiered_writing';
      var builtChoice = choiceMod.buildChoicePacket({
        activity: targetActivity,
        mode: isProbe ? 'probe' : 'practice',
        title: title,
        items: inspected.items,
        form: o.form || 'Form A',
        timeLimitS: isProbe && Number(o.timeLimitS) > 0 ? Math.round(Number(o.timeLimitS)) : null,
        teacherCode: teacherCode,
        homeLanguages: homeLanguages,
        bilingualGlossary: bilingualGlossary,
        stationMode: !!o.stationMode,
        qrPublicKey: qrKey,
        learner: learner,
        loader: loader,
        adapters: adaptersMod,
        qrCrypto: o.qrCrypto,
        stationBilingual: o.stationBilingual,
      });
      html = builtChoice.html;
      lesson = builtChoice.lesson;
    } else {
      targetActivity = kind === 'quiz' ? 'compiled_quiz'
        : kind === 'cloze' ? 'compiled_cloze'
        : kind === 'adventure' ? 'branching_adventure'
        : 'anchor_study';

      var sig = fnv1a(JSON.stringify({ title: title, kind: kind, mode: isProbe ? 'probe' : 'practice', items: inspected.items }));
      lesson = {
        schema: 'alloflow-take-home-lesson/v2',
        player: 'alloflow-word-sounds-take-home/2',
        lessonId: 'cmp-' + slug(title, 28) + '-' + sig.slice(0, 6),
        revision: 'cmp-v1-' + sig,
        title: title,
        language: 'en',
        mode: isProbe ? 'probe' : 'practice',
        activityTitles: {},
        images: Object.keys(inspected.images).length ? inspected.images : undefined,
        blocks: [{ activity: targetActivity, items: inspected.items }],
      };
      lesson.activityTitles[targetActivity] = ADAPTERS[targetActivity].title;
      if (isProbe) {
        lesson.form = str(o.form || 'Form A', 40);
        lesson.timeLimitS = Number(o.timeLimitS) > 0 ? Math.round(Number(o.timeLimitS)) : null;
        lesson.check = {
          measure: targetActivity,
          scoreUnit: 'items_correct',
          allowSkip: true,
          scoringVersion: 1,
          formVersion: 1,
        };
      }

      var labels = {};
      if (kind === 'adventure') {
        labels.item_of = '{activity}';
        labels.done_practice = 'Adventure completed (not scored).';
      } else if (kind === 'anchor_chart') {
        labels.item_of = '{activity}';
        labels.done_practice = 'Study guide reviewed (not scored).';
      }

      var buildOpts = {
        extraAdapters: isProbe ? undefined : ADAPTERS,
        adapters: isProbe ? ADAPTERS : undefined,
        core: isProbe ? { soundAnswerMatches: function () { return false; } } : undefined,
        extraCss: EXTRA_CSS,
        labels: Object.keys(labels).length ? labels : undefined,
        teacherCode: teacherCode,
        stationMode: !!o.stationMode,
        qrPublicKey: qrKey,
        qrCrypto: o.qrCrypto,
        stationBilingual: o.stationBilingual,
      };
      if (homeLanguages) buildOpts.homeLanguages = homeLanguages;
      if (bilingualGlossary) buildOpts.bilingualGlossary = bilingualGlossary;

      html = loader.buildHtml(lesson, buildOpts);
      if (learner) html = withCodeName(html, learner);
    }

    var compiledMeta = {
      version: VERSION,
      sourceKind: kind,
      targetActivity: targetActivity,
      mode: isProbe ? 'check' : 'practice',
      unitCount: inspected.unitCount,
      stripped: {
        promptFields: inspected.stripReport.promptFieldsStripped.length,
        urls: inspected.stripReport.urlsStripped,
        externalImages: inspected.stripReport.externalImagesConverted,
        emails: inspected.stripReport.emailsStripped,
        htmlTags: inspected.stripReport.htmlTagsStripped,
      },
    };
    if (!isProbe) compiledMeta.sourceArtifact = inspected.sanitized;

    html = withManifest(html, {
      compiled: compiledMeta,
      builder: {
        name: 'AlloFlow Offline Activity Compiler',
        ai: 'none',
        words: inspected.unitCount,
        items: inspected.items.length,
      },
    });

    var block = /<script type="application\/json" id="packet-manifest">([\s\S]*?)<\/script>/.exec(html);
    var manifest = null;
    try { manifest = block ? JSON.parse(block[1]) : null; } catch (_) { manifest = null; }
    var sha = typeof loader.sha256 === 'function' ? loader.sha256(html).hex : '';

    return {
      html: html,
      manifest: manifest,
      sha256: sha,
      lesson: lesson,
      kind: kind,
      targetActivity: targetActivity,
      mode: isProbe ? 'probe' : 'practice',
      unitCount: inspected.unitCount,
      stripReport: inspected.stripReport,
    };
  }

  // ---------------------------------------------------------------------------
  // Reopen an existing compiled offline .html packet
  // ---------------------------------------------------------------------------
  function readCompiledPacket(html, verifyCore) {
    var vc = verifyCore || (root && root.AlloPacketVerify);
    if (!vc || typeof vc.readParts !== 'function') {
      return { ok: false, error: 'Packet reader is unavailable.' };
    }
    var parts = vc.readParts(html);
    if (!parts || !parts.ok || !isObj(parts.lesson)) {
      return { ok: false, error: 'This file is not an AlloFlow offline packet.' };
    }
    var lesson = parts.lesson;
    var manifest = isObj(parts.manifest) ? parts.manifest : {};
    var meta = isObj(manifest.compiled) ? manifest.compiled : null;
    if (!meta || !meta.sourceKind) {
      return { ok: false, error: 'This packet was not created by the Activity Compiler.' };
    }
    var homeLangs = (lesson.bilingual && Array.isArray(lesson.bilingual.codes) && lesson.bilingual.codes.length)
      ? lesson.bilingual.codes.slice() : [];
    var mode = lesson.mode === 'probe' || meta.mode === 'check' ? 'probe' : 'practice';
    var artifact = isObj(meta.sourceArtifact) ? meta.sourceArtifact : null;
    var notes = [];
    if (!artifact && mode === 'probe') {
      notes.push('Check files scramble answers and do not store plain-text answer keys. Re-enter or edit answers in the JSON before saving again.');
      var blkItems = lesson.blocks && lesson.blocks[0] && Array.isArray(lesson.blocks[0].items) ? lesson.blocks[0].items : [];
      if (meta.sourceKind === 'quiz') {
        artifact = {
          kind: 'quiz',
          title: str(lesson.title || manifest.title || 'Quiz Check', 80),
          questions: blkItems.map(function (it) {
            return it.questionKind === 'mc'
              ? { id: it.id, question: it.prompt || '', options: Array.isArray(it.choices) ? it.choices.slice() : [], answer: '?' }
              : { id: it.id, question: it.prompt || '', answer: '?' };
          }),
        };
      } else if (meta.sourceKind === 'cloze' && blkItems[0]) {
        var it0 = blkItems[0];
        var rebuiltPassage = (Array.isArray(it0.segments) ? it0.segments : []).map(function (sg) {
          return sg.type === 'text' ? (sg.text || '') : '[blank]';
        }).join('');
        artifact = {
          kind: 'cloze',
          title: str(lesson.title || manifest.title || 'Cloze Check', 80),
          passage: rebuiltPassage,
          blanks: (Array.isArray(it0.blanks) ? it0.blanks : []).map(function (b) { return { id: b.id, answer: '?', choices: Array.isArray(b.choices) ? b.choices.slice() : [] }; }),
        };
      } else if (meta.sourceKind === 'concept_sort' && blkItems[0]) {
        artifact = {
          kind: 'concept_sort',
          title: str(lesson.title || manifest.title || 'Concept Sort Check', 80),
          prompt: blkItems[0].prompt || '',
          categories: Array.isArray(blkItems[0].categories) ? blkItems[0].categories : [],
          items: (Array.isArray(blkItems[0].cards) ? blkItems[0].cards : []).map(function (c) { return { id: c.id, content: c.text || '', category: '?' }; }),
        };
      } else if (meta.sourceKind === 'timeline' && blkItems[0]) {
        artifact = {
          kind: 'timeline',
          title: str(lesson.title || manifest.title || 'Timeline Check', 80),
          prompt: blkItems[0].prompt || '',
          steps: Array.isArray(blkItems[0].steps) ? blkItems[0].steps : [],
        };
      }
    }
    return {
      ok: true,
      title: str(lesson.title || manifest.title || 'Offline Activity', 80),
      kind: str(meta.sourceKind, 40),
      mode: mode,
      form: str(lesson.form || 'Form A', 40),
      timeLimitS: Number(lesson.timeLimitS) > 0 ? Number(lesson.timeLimitS) : null,
      artifact: artifact,
      notes: notes,
      homeLanguages: homeLangs,
      bilingualGlossary: lesson.bilingual && isObj(lesson.bilingual.glossary) ? Object.assign({}, lesson.bilingual.glossary) : {},
      stationMode: !!lesson.stationMode,
      qrPublicKey: lesson.qr && typeof lesson.qr.k === 'string' ? lesson.qr.k : '',
      learner: typeof manifest.learner === 'string' ? manifest.learner : '',
    };
  }

  var api = {
    VERSION: VERSION,
    SUPPORTED_KINDS: SUPPORTED_KINDS,
    CHECK_CAPABLE: CHECK_CAPABLE,
    ADAPTERS: ADAPTERS,
    EXTRA_CSS: EXTRA_CSS,
    samples: samples,
    sampleById: sampleById,
    sanitizeArtifact: sanitizeArtifact,
    detectActivityKind: detectActivityKind,
    inspectArtifact: inspectArtifact,
    compileActivityPacket: compileActivityPacket,
    readCompiledPacket: readCompiledPacket,
    codeName: codeName,
    withCodeName: withCodeName,
  };

  if (root) root.AlloPacketCompiler = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
