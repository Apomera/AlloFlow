// Practice adapter: a passage read aloud, one sentence at a time (read_along). Made by
// packet_read_along_builder.js on "Make a read-along". Listening practice, never scored: the student
// presses "I have read this page" and the item is recorded as practice "read".
// One item is one page of the passage: its sentences, each with a recording that was made ahead of
// time on the teacher's device. This file makes no speech: it only plays those recordings.
// "Read to me" reads the page from the top (or from the sentence last pressed), marking the sentence
// being read, the way Read the Story reads its story back. Pressing a sentence reads that sentence.
// A line may carry syl: the same words with a middle dot at each syllable break, worked out when the file
// was made (the app's on-device syllable table). "Syllables" shows the words that way; a screen reader is
// still given the plain words. Slower and Syllables stay as chosen from page to page.
// Supports counted: readThroughs (Read to me), lineReplays (a sentence pressed), and once for a page on
// which they were used, slower and syllables.
module.exports = {
  id: 'read_along',
  title: 'Read along',
  labels: {
    read_along_intro: 'Listen and follow the words. Press a sentence to hear it again.',
    read_along_text: 'The words to read',
    read_along_page: 'Page {n} of {total}',
    read_along_sentence: 'Sentence {n} of {total}',
    read_along_play: 'Read to me',
    read_along_stop: 'Stop',
    read_along_restart: 'Restart',
    read_along_auto: 'Auto-advance',
    read_along_slower: 'Slower',
    read_along_syllables: 'Syllables',
    read_along_bold: 'Bold start',
    read_along_chunk: 'One sentence',
    read_along_rsvp: 'Focus mode',
    read_along_crawl: 'Crawl',
    read_along_pos_labels: 'Show tags',
    read_along_define: 'Word meanings',
    read_along_define_hint: 'Tap an underlined word in the passage, or choose one below, to see its meaning.',
    read_along_define_words: 'Words on this page',
    read_along_define_close: 'Close meaning',
    read_along_hear_meaning: 'Hear meaning',
    read_along_with_supports: 'Read with supports',
    read_along_supports_heading: 'Notes & supports',
    read_along_support_hint: 'Tap a note below to read or listen to a teacher support.',
    read_along_sent_prev: 'Previous sentence',
    read_along_sent_next: 'Next sentence',
    read_along_resume_note: 'You stopped at sentence {n} of {total}.',
    read_along_resume_go: 'Continue from sentence {n}',
    read_along_resume_top: 'Start from sentence 1',
    read_along_pos: 'Parts of speech',
    read_along_pos_n: 'Noun',
    read_along_pos_v: 'Verb',
    read_along_pos_j: 'Adjective',
    read_along_pos_a: 'Adverb',
    read_along_pos_p: 'Pronoun',
    read_along_pos_r: 'Preposition',
    read_along_pos_c: 'Conjunction',
    read_along_pos_scheme: 'Colors',
    read_along_pos_style: 'Style',
    read_along_checks_heading: 'Check your understanding',
    read_along_checks_right: 'Nice work!',
    read_along_checks_retry: 'Try another choice.',
    read_along_checks_open_note: 'Stays on this device only.',
    read_along_rec: 'Record my voice',
    read_along_rec_stop: 'Stop recording',
    read_along_rec_play: 'Play my voice',
    read_along_rec_save: 'Save my recording',
    read_along_rec_clear: 'Clear',
    read_along_rec_note: 'Stays on this device only. Nothing is saved or sent.',
    read_along_rec_recording: 'Recording sentence {n}...',
    read_along_rec_ready: 'Your recording for sentence {n} is ready to play back.',
    read_along_rec_denied: 'Microphone permission was refused.',
    read_along_rec_unsupported: 'This browser cannot record from a microphone here.',
    read_along_rec_empty: 'Nothing was heard. Try again.',
    read_along_done: 'I have read this page',
    read_along_next: 'Next page',
    read_along_finish: 'Finish',
    read_along_prev: 'Previous page',
    read_along_done_said: 'Good reading.',
  },
  // p: { lines: [{ text, audio: clip id or '', syl: the text with a dot at each syllable break, pos: compact "i:tag,...", para: true when a new paragraph starts here }], heading, page, pages, pageMode, lang }
  // A clip id names a recording in lesson.audio. A line with no clip is shown and skipped by "Read to me".
  prepare: function (p) {
    p = p || {};
    var line = function (v, max) { return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : ''; };
    var clip = function (v) { return typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : ''; };
    var maxLines = (p.pageMode === 'scroll' || p.pageMode === 'custom') ? 120 : 60;
    if (!Array.isArray(p.lines) || !p.lines.length || p.lines.length > maxLines) return { missing: ['lines'] };
    var DOT = String.fromCharCode(183);
    var lines = p.lines.map(function (row) {
      var out = { text: line(row && row.text, 600), audio: clip(row && row.audio) }, syl = line(row && row.syl, 900);
      // Kept only when it is the text itself with dots added: the words a student reads are never changed.
      if (syl && syl !== out.text && syl.split(DOT).join('') === out.text) out.syl = syl;
      var pos = typeof (row && row.pos) === 'string' && row.pos.length <= 400 && /^(?:\d{1,3}:[nvjaprc](?:,\d{1,3}:[nvjaprc])*)$/.test(row.pos) ? row.pos : '';
      if (pos) out.pos = pos;
      if (row && Array.isArray(row.timings) && row.timings.length && row.timings.length <= 120) {
        var cleanT = [], prevT = 0, validT = true;
        for (var ti = 0; ti < row.timings.length; ti++) {
          var tv = Math.round(Number(row.timings[ti]));
          if (!(tv >= 1 && tv <= 1000) || tv < prevT) { validT = false; break; }
          cleanT.push(tv);
          prevT = tv;
        }
        if (validT) out.timings = cleanT;
      }
      if (row && row.para === true) out.para = true;
      if (row && (row.heading === 1 || row.heading === 2 || row.heading === 3)) out.heading = row.heading;
      return out;
    });
    if (lines.some(function (row) { return !row.text; })) return { missing: ['text for every line'] };
    var lang = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/.test(String(p.lang || '')) ? String(p.lang) : 'en';
    var page = Math.floor(Number(p.page)) || 1, pages = Math.floor(Number(p.pages)) || 1;
    var item = { lines: lines, lang: lang, page: Math.max(1, page), pages: Math.max(1, pages), word: lines[0].text.slice(0, 60), target: 'read' };
    if (line(p.heading, 120)) item.heading = line(p.heading, 120);
    if (p.simpleBar === true) item.simpleBar = true;
    if (/^(?:default|fitzgerald|montessori|okabe|mono|custom)$/.test(String(p.posScheme || ''))) item.posScheme = String(p.posScheme);
    if (/^(?:underline|pill|tags)$/.test(String(p.posStyle || ''))) item.posStyle = String(p.posStyle);
    if (p.posPalette && typeof p.posPalette === 'object' && !Array.isArray(p.posPalette)) {
      var pal = {}, pHas = false;
      ['n', 'v', 'j', 'a', 'p', 'r', 'c'].forEach(function (pk) {
        var c = p.posPalette[pk];
        if (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)) { pal[pk] = c; pHas = true; }
      });
      if (pHas) item.posPalette = pal;
    }
    if (Array.isArray(p.questions) && p.questions.length) {
      var qs = [];
      for (var qi = 0; qi < p.questions.length && qs.length < 6; qi++) {
        var qr = p.questions[qi]; if (!qr || typeof qr !== 'object') continue;
        var qp = line(qr.prompt, 240); if (!qp) continue;
        var qk = qr.kind === 'mc' ? 'mc' : 'open';
        var qObj = { id: clip(qr.id) || ('q' + (qs.length + 1)), prompt: qp, kind: qk };
        if (qk === 'mc') {
          var qcs = Array.isArray(qr.choices) ? qr.choices.map(function (c) { return line(c, 120); }).filter(Boolean).slice(0, 4) : [];
          if (qcs.length < 2) continue;
          qObj.choices = qcs;
          var qa = Math.floor(Number(qr.answer));
          if (isFinite(qa) && qa >= 0 && qa < qcs.length) qObj.answer = qa;
        }
        qs.push(qObj);
      }
      if (qs.length) item.questions = qs;
    }
    if (p.glossary && typeof p.glossary === 'object' && !Array.isArray(p.glossary)) {
      var gloss = {}, gCount = 0;
      Object.keys(p.glossary).forEach(function (k) {
        if (gCount >= 120 || k.length > 40 || !/^[a-z]{2,24}(?: [a-z]{2,24}){0,2}$/.test(k)) return;
        var v = p.glossary[k];
        if (!v || typeof v !== 'object') return;
        var def = line(v.d, 240);
        if (!def) return;
        var entry = { w: line(v.w, 40) || k, d: def };
        var vp = line(v.p, 24), ve = line(v.e, 200), vImg = clip(v.img), vAlt = line(v.alt, 60), vAudio = clip(v.a);
        if (vp) entry.p = vp;
        if (ve) entry.e = ve;
        if (vImg) { entry.img = vImg; if (vAlt) entry.alt = vAlt; }
        if (vAudio) entry.a = vAudio;
        if (v.c === true) entry.c = true;
        gloss[k] = entry;
        gCount++;
      });
      if (gCount) item.glossary = gloss;
    }
    if (Array.isArray(p.supports) && p.supports.length) {
      var sups = [];
      for (var si = 0; si < p.supports.length && sups.length < 60; si++) {
        var sr = p.supports[si]; if (!sr || typeof sr !== 'object') continue;
        var sText = line(sr.text, 360), sLine = Math.floor(Number(sr.line));
        if (!sText || !isFinite(sLine) || sLine < 0 || sLine >= lines.length) continue;
        var sup = { id: clip(sr.id) || ('sup' + (sups.length + 1)), line: sLine, text: sText };
        var sq = line(sr.quote, 80);
        if (sq) { sup.quote = sq; var so = Math.floor(Number(sr.occ)); if (isFinite(so) && so > 0 && so <= 20) sup.occ = so; }
        var sImg = clip(sr.img), sAlt = line(sr.alt, 60), sAud = clip(sr.audio);
        if (sImg) { sup.img = sImg; if (sAlt) sup.alt = sAlt; }
        if (sAud) sup.audio = sAud;
        sups.push(sup);
      }
      if (sups.length) item.supports = sups;
    }
    return { item: item };
  },
  render: function (item, ctx) {
    var L = ctx.L, B = function (a, k) { a.type = 'button'; return ctx.el('button', a, k); }, nodes = [], paraNodes = [], run = 0, playing = false, from = 0, counted = {};
    var activeLine = -1, activeWord = -1;
    var allPages = (Array.isArray(ctx.pages) && ctx.pages.length) ? ctx.pages : [item];
    var pageIdx = allPages.indexOf(item);
    if (pageIdx < 0) pageIdx = Math.max(0, Math.min(allPages.length - 1, (item.page || 1) - 1));
    var isMultiPage = allPages.length > 1;
    var cache = (ctx.sessionCache && typeof ctx.sessionCache === 'object') ? ctx.sessionCache : null;
    var nav = (ctx.nav && typeof ctx.nav === 'object') ? ctx.nav : null;
    // Persist Syllables, Bold start, Chunk view, and Parts of speech filters in state.tools via ctx.toolPref.
    var doc = ctx.root.ownerDocument, top = doc.documentElement;
    var readPref = function (prefKey, attr, fallback) {
      if (typeof ctx.toolPref === 'function') {
        var v = ctx.toolPref(prefKey);
        if (v === 0 || v === 1) return v === 1;
      }
      var raw = top.getAttribute('data-read-along-' + attr);
      if (raw === '1') return true;
      if (raw === '0') return false;
      return !!fallback;
    };
    var remember = function (prefKey, attr, on) {
      if (typeof ctx.toolPref === 'function') ctx.toolPref(prefKey, on ? 1 : 0);
      top.setAttribute('data-read-along-' + attr, on ? '1' : '0');
    };
    var hasAudio = item.lines.some(function (row) { return !!row.audio; });
    var hasSyl = item.lines.some(function (row) { return !!row.syl; }), showSyl = hasSyl && readPref('syllables', 'syl', false);
    var hasPos = item.lines.some(function (row) { return !!row.pos; }), showPos = hasPos && readPref('pos', 'pos', false);
    var gloss = item.glossary && typeof item.glossary === 'object' ? item.glossary : null;
    var glossKeys = gloss ? Object.keys(gloss) : [];
    var hasDef = glossKeys.length > 0, showDef = hasDef && readPref('define', 'define', false);
    var supports = Array.isArray(item.supports) ? item.supports : [], hasSupports = supports.length > 0, supportsByLine = {}, supportById = {};
    supports.forEach(function (s) { if (s && s.id) { supportById[s.id] = s; (supportsByLine[String(s.line)] = supportsByLine[String(s.line)] || []).push(s); } });
    var hasSupportAudio = supports.some(function (s) { return !!s.audio; });
    var devVoice = typeof ctx.deviceVoice === 'function' ? ctx.deviceVoice(item.lang) : null, hasDevVoice = !!(devVoice && devVoice.available && devVoice.available());
    var readWithSupports = hasSupports && (hasSupportAudio || hasDevVoice) && readPref('withSupports', 'with-supports', false);
    var showBold = readPref('bold', 'bold', false);
    var showPosLabels = readPref('posLabels', 'pos-labels', false);
    var chunkMode = (item.lines.length > 1 || isMultiPage) && readPref('chunk', 'chunk', false);
    var autoAdv = !readPref('noAuto', 'no-auto', false);
    var tapMode = showDef ? 'define' : (hasAudio ? 'sentence' : (hasDevVoice ? 'speak' : (hasSyl ? 'sounds' : 'sentence')));
    var pausedLine = -1, pausedTime = 0, closeOverlays = null, chunkTimer = 0, chunkAutoOn = false, chunkPaceMs = (cache && cache.chunkPaceMs >= 1000 && cache.chunkPaceMs <= 8000) ? cache.chunkPaceMs : 3500, chunkMood = (cache && cache.chunkMood) || 'highlight', twTimer = 0, twFull = false, devReading = false, pageTurnTimer = 0, finishedRun = false;
    var win = doc.defaultView || {};
    var reducedMotion = function () {
      if (top && top.getAttribute('data-lt-motion') === '1') return true;
      try { return !!(win.matchMedia && win.matchMedia('(prefers-reduced-motion:reduce)').matches); } catch (_) { return false; }
    };
    var posOn = {
      n: !readPref('posHideN', 'pos-hide-n', false),
      v: !readPref('posHideV', 'pos-hide-v', false),
      j: !readPref('posHideJ', 'pos-hide-j', false),
      a: !readPref('posHideA', 'pos-hide-a', false),
      p: !readPref('posHideP', 'pos-hide-p', false),
      r: !readPref('posHideR', 'pos-hide-r', false),
      c: !readPref('posHideC', 'pos-hide-c', false),
    };
    var posScheme = item.posScheme || 'default';
    var posStyle = item.posStyle || (showPosLabels ? 'tags' : 'underline');
    var POS_TAGS = { n: 'N', v: 'V', j: 'Adj', a: 'Adv', p: 'Pron', r: 'Prep', c: 'Conj' };
    var use = function (name) { if (!counted[name]) { counted[name] = true; ctx.support(name); } };
    var press = function (button, on) { button.setAttribute('aria-pressed', String(on)); button.style.background = on ? 'var(--accent)' : ''; button.style.color = on ? 'var(--accent-ink)' : ''; };
    if (item.heading) ctx.root.appendChild(ctx.el('p', { class: 'letters', style: 'margin:0 0 4px', text: item.heading }));
    var jumpSel = null, bmBtn = null, bmGoBtn = null;
    if (item.pages > 1 || isMultiPage) {
      var pageLabel = ctx.el('p', { class: 'muted', style: 'margin:0', 'data-read-along-page': '', text: ctx.fmt(L.read_along_page, { n: item.page, total: item.pages }) });
      var pageBarItems = [pageLabel];
      if (isMultiPage && typeof ctx.goto === 'function') {
        jumpSel = ctx.el('select', { class: 'ra-page-jump', 'aria-label': 'Jump to page', 'data-read-along-jump': '' }, allPages.map(function (pg, pi) {
          var hLine = Array.isArray(pg.lines) ? pg.lines.filter(function (l) { return l && l.heading; })[0] : null;
          var lbl = 'Page ' + (pi + 1) + (hLine ? (' \u2014 ' + String(hLine.text || '').slice(0, 28)) : (pg.heading ? (' \u2014 ' + String(pg.heading).slice(0, 28)) : ''));
          return ctx.el('option', { value: String(pi), text: lbl });
        }));
        jumpSel.value = String(pageIdx);
        jumpSel.addEventListener('change', function () {
          var target = Math.floor(Number(jumpSel.value));
          if (!isFinite(target) || target === pageIdx) return;
          if (guardMic()) { jumpSel.value = String(pageIdx); return; }
          halt(false);
          ctx.goto(target, { fromLine: 0 });
        });
        pageBarItems.push(jumpSel);
        if (typeof ctx.bookmark === 'function') {
          bmBtn = B({ class: 'ra-bookmark-btn', 'data-read-along-bookmark': '', 'aria-pressed': 'false', text: 'Bookmark' });
          bmGoBtn = B({ class: 'ra-bookmark-btn', 'data-read-along-bookmark-go': '', hidden: true, text: 'Go to bookmark' });
          var syncBookmark = function () {
            var bm = ctx.bookmark();
            var here = !!(bm && bm.page === pageIdx);
            bmBtn.setAttribute('aria-pressed', String(here));
            bmBtn.textContent = here ? 'Bookmarked' : 'Bookmark';
            if (bm && bm.page !== pageIdx && bm.page >= 0 && bm.page < allPages.length) {
              bmGoBtn.hidden = false;
              bmGoBtn.textContent = 'Go to bookmark (Page ' + (bm.page + 1) + ')';
            } else {
              bmGoBtn.hidden = true;
            }
          };
          bmBtn.addEventListener('click', function () {
            var bm = ctx.bookmark();
            if (bm && bm.page === pageIdx) ctx.bookmark(null);
            else ctx.bookmark({ page: pageIdx, line: from });
            syncBookmark();
          });
          bmGoBtn.addEventListener('click', function () {
            if (guardMic()) return;
            var bm = ctx.bookmark();
            if (bm && bm.page >= 0 && bm.page < allPages.length) { halt(false); ctx.goto(bm.page, { fromLine: bm.line || 0 }); }
          });
          syncBookmark();
          pageBarItems.push(bmBtn, bmGoBtn);
        }
      }
      ctx.root.appendChild(ctx.el('div', { class: 'ra-page-bar', 'data-read-along-page-bar': '' }, pageBarItems));
    }
    var showMultiSent = item.lines.length > 1 || isMultiPage;
    var sentCounter = showMultiSent ? ctx.el('p', { class: 'muted', style: 'margin:0 0 4px', 'data-read-along-sentence': '', text: ctx.fmt(L.read_along_sentence || 'Sentence {n} of {total}', { n: 1, total: item.lines.length }) }) : null;
    var progFill = showMultiSent ? ctx.el('span', { class: 'ra-progress-fill', style: 'width:' + Math.round(100 / Math.max(1, item.lines.length)) + '%' }) : null;
    var progBar = progFill ? ctx.el('div', { class: 'ra-progress', 'aria-hidden': 'true', 'data-read-along-progress': '' }, [progFill]) : null;
    var dock = ctx.el('div', { class: 'ra-dock' + (item.lines.length > 6 ? ' is-sticky' : ''), 'data-read-along-dock': '' });
    if (sentCounter) dock.appendChild(sentCounter);
    if (progBar) dock.appendChild(progBar);
    ctx.root.appendChild(dock);
    var overlayJumpBar = null, overlayJumpText = null, overlayJumpGo = null, overlayJumpTarget = -1;
    if (isMultiPage && typeof ctx.goto === 'function') {
      overlayJumpText = ctx.el('span', { text: '' });
      overlayJumpGo = B({ class: 'primary', 'data-overlay-jump-go': '', text: 'Go to Page' });
      var overlayJumpStay = B({ 'data-overlay-jump-dismiss': '', text: 'Stay here' });
      overlayJumpBar = ctx.el('div', { class: 'ra-jump-note', 'data-read-along-overlay-jump': '', hidden: true }, [overlayJumpText, overlayJumpGo, overlayJumpStay]);
      overlayJumpGo.addEventListener('click', function () {
        if (guardMic()) return;
        if (overlayJumpTarget >= 0 && overlayJumpTarget < allPages.length) { halt(false); ctx.goto(overlayJumpTarget, { fromLine: 0 }); }
      });
      overlayJumpStay.addEventListener('click', function () { overlayJumpBar.hidden = true; });
      ctx.root.appendChild(overlayJumpBar);
    }
    var showOverlayJump = function (targetIdx) {
      if (!overlayJumpBar || !(targetIdx >= 0 && targetIdx < allPages.length) || targetIdx === pageIdx) return;
      overlayJumpTarget = targetIdx;
      overlayJumpText.textContent = 'You read into Page ' + (targetIdx + 1) + '.';
      overlayJumpGo.textContent = 'Go to Page ' + (targetIdx + 1);
      overlayJumpBar.hidden = false;
    };
    var resumeBar = null;
    var savedPlace = (!nav && typeof ctx.place === 'function') ? Math.floor(Number(ctx.place()) || 0) : 0;
    if (savedPlace > 0 && savedPlace < item.lines.length) {
      var resumeGo = B({ class: 'primary', 'data-read-along-resume-go': '', text: ctx.fmt(L.read_along_resume_go || 'Continue from sentence {n}', { n: savedPlace + 1 }) });
      var resumeTop = B({ 'data-read-along-resume-top': '', text: L.read_along_resume_top || 'Start from sentence 1' });
      resumeBar = ctx.el('div', { class: 'ra-resume-bar', 'data-read-along-resume': '' }, [
        ctx.el('p', { style: 'margin:0 0 8px', text: ctx.fmt(L.read_along_resume_note || 'You stopped at sentence {n} of {total}.', { n: savedPlace + 1, total: item.lines.length }) }),
        ctx.el('div', { class: 'row' }, [resumeGo, resumeTop]),
      ]);
      ctx.root.appendChild(resumeBar);
      resumeGo.addEventListener('click', function () {
        if (resumeBar) resumeBar.hidden = true;
        setActiveSentence(savedPlace, false);
        if (nodes[savedPlace] && typeof nodes[savedPlace].scrollIntoView === 'function') { try { nodes[savedPlace].scrollIntoView({ block: 'center' }); } catch (_) {} }
        if (nodes[savedPlace] && typeof nodes[savedPlace].focus === 'function') nodes[savedPlace].focus();
      });
      resumeTop.addEventListener('click', function () {
        if (resumeBar) resumeBar.hidden = true;
        setActiveSentence(0, true);
        if (nodes[0] && typeof nodes[0].scrollIntoView === 'function') { try { nodes[0].scrollIntoView({ block: 'nearest' }); } catch (_) {} }
      });
    }
    var parsePos = function (spec) {
      var map = {};
      if (!spec) return map;
      spec.split(',').forEach(function (pair) {
        var p = pair.split(':');
        if (p.length === 2) map[p[0]] = p[1];
      });
      return map;
    };
    var wordWeights = function (sentence) {
      var re = /[A-Za-z\u00C0-\u024F\u00b7]+(?:['\u2019][A-Za-z\u00C0-\u024F\u00b7]+)*/g, m, list = [];
      while ((m = re.exec(sentence))) {
        var clean = m[0].replace(/\u00b7/g, ''), tail = sentence.slice(m.index + m[0].length, m.index + m[0].length + 2);
        var bonus = /[.!?]/.test(tail) ? 6 : /[,;:]/.test(tail) ? 3 : /-/.test(tail) ? 2 : 0;
        list.push(Math.max(2, clean.length) + bonus);
      }
      return list;
    };
    var appendWordContent = function (parent, wordText) {
      if (!showBold) { parent.appendChild(doc.createTextNode(wordText)); return; }
      var letters = wordText.replace(/\u00b7/g, '').length;
      var boldTarget = Math.max(1, Math.ceil(letters * 0.4));
      var seen = 0, cut = 0;
      for (var k = 0; k < wordText.length; k++) {
        cut = k + 1;
        if (wordText.charAt(k) !== '\u00b7') seen++;
        if (seen >= boldTarget) break;
      }
      parent.appendChild(ctx.el('strong', { class: 'ra-bionic', text: wordText.slice(0, cut) }));
      if (cut < wordText.length) parent.appendChild(doc.createTextNode(wordText.slice(cut)));
    };
    // Paint one sentence node with syllables, POS filter tags, bold-assist, and/or word-level karaoke highlight.
    var paintLine = function (i) {
      var n = nodes[i], row = item.lines[i];
      if (!n || !row) return;
      var shown = (showSyl && row.syl) ? row.syl : row.text;
      if (showSyl && row.syl) n.setAttribute('aria-label', row.text);
      else n.removeAttribute('aria-label');
      var isKaraoke = activeLine === i && activeWord >= 0;
      var posMap = (showPos && row.pos) ? parsePos(row.pos) : null;
      var wordTapActive = showDef || tapMode === 'speak' || tapMode === 'sounds';
      if (!posMap && !showBold && !isKaraoke && !wordTapActive) {
        n.textContent = shown;
        return;
      }
      var sylTokens = null;
      if (tapMode === 'sounds' && row.syl) {
        sylTokens = [];
        var sre = /[A-Za-z\u00C0-\u024F\u00b7]+(?:['\u2019][A-Za-z\u00C0-\u024F\u00b7]+)*/g, sm;
        while ((sm = sre.exec(row.syl))) sylTokens.push(sm[0]);
      }
      n.textContent = '';
      var re = /[A-Za-z\u00C0-\u024F\u00b7]+(?:['\u2019][A-Za-z\u00C0-\u024F\u00b7]+)*/g, m, last = 0, wi = 0;
      var lineTokens = null, phraseAt = null;
      if (showDef && gloss) {
        lineTokens = [];
        var preRe = /[A-Za-z\u00C0-\u024F\u00b7]+(?:['\u2019][A-Za-z\u00C0-\u024F\u00b7]+)*/g, pm;
        while ((pm = preRe.exec(shown))) lineTokens.push(pm[0].replace(/\u00b7/g, '').toLowerCase());
        phraseAt = {};
        for (var pi = 0; pi < lineTokens.length; pi++) {
          if (pi + 2 < lineTokens.length) {
            var p3 = lineTokens[pi] + ' ' + lineTokens[pi + 1] + ' ' + lineTokens[pi + 2];
            if (Object.prototype.hasOwnProperty.call(gloss, p3)) { phraseAt[pi] = phraseAt[pi + 1] = phraseAt[pi + 2] = p3; continue; }
          }
          if (pi + 1 < lineTokens.length) {
            var p2 = lineTokens[pi] + ' ' + lineTokens[pi + 1];
            if (Object.prototype.hasOwnProperty.call(gloss, p2)) { phraseAt[pi] = phraseAt[pi + 1] = p2; }
          }
        }
      }
      while ((m = re.exec(shown))) {
        if (m.index > last) n.appendChild(doc.createTextNode(shown.slice(last, m.index)));
        var tag = posMap ? posMap[String(wi)] : '';
        if (tag && !posOn[tag]) tag = '';
        var plainWord = m[0].replace(/\u00b7/g, '');
        var plainKey = plainWord.toLowerCase();
        var defKey = (showDef && gloss)
          ? ((phraseAt && phraseAt[wi]) || (plainKey && Object.prototype.hasOwnProperty.call(gloss, plainKey) ? plainKey : ''))
          : '';
        var cls = [];
        if (tag) cls.push('ra-pos', 'ra-pos-' + tag);
        if (defKey || tapMode === 'speak' || tapMode === 'sounds') cls.push('ra-def-word');
        if (isKaraoke && wi === activeWord) cls.push('ra-word-active');
        else if (isKaraoke && wi < activeWord) cls.push('ra-word-past');
        if (cls.length) {
          var attrs = { class: cls.join(' ') };
          if (tag) {
            attrs['data-pos'] = tag;
            attrs['data-pos-tag'] = POS_TAGS[tag] || tag.toUpperCase();
          }
          if (defKey) attrs['data-def-word'] = defKey;
          if (tapMode === 'speak' || tapMode === 'sounds') attrs['data-tap-word'] = plainWord;
          if (sylTokens && sylTokens[wi]) attrs['data-syl-word'] = sylTokens[wi];
          if (isKaraoke && wi === activeWord) attrs['data-word-active'] = 'true';
          var span = ctx.el('span', attrs);
          appendWordContent(span, m[0]);
          n.appendChild(span);
        } else {
          appendWordContent(n, m[0]);
        }
        last = m.index + m[0].length;
        wi++;
      }
      if (last < shown.length) n.appendChild(doc.createTextNode(shown.slice(last)));
    };
    var defBox = null, defCard = null, defPickBtns = {}, soundsCard = null, tapBtns = {};
    var showSounds = function (plainWord, sylWord) {
      if (!soundsCard || !plainWord) return;
      var parts = (sylWord && sylWord.indexOf('\u00b7') >= 0) ? sylWord.split('\u00b7') : [plainWord];
      soundsCard.hidden = false;
      soundsCard.textContent = '';
      var headRow = [ctx.el('strong', { text: plainWord + ' (' + parts.length + (parts.length === 1 ? ' syllable)' : ' syllables)') })];
      if (hasDevVoice) {
        var hearBtn = B({ 'data-sounds-hear': '', text: 'Hear word' });
        hearBtn.addEventListener('click', function () { devVoice.speak(plainWord); });
        headRow.push(hearBtn);
      }
      var closeS = B({ 'data-sounds-close': '', text: L.tools_close || 'Close' });
      closeS.addEventListener('click', function () { soundsCard.hidden = true; });
      headRow.push(closeS);
      soundsCard.appendChild(ctx.el('div', { class: 'row', style: 'justify-content:space-between;align-items:center' }, headRow));
      soundsCard.appendChild(ctx.el('div', { class: 'ra-syl-tiles' }, parts.map(function (pt) { return ctx.el('span', { class: 'ra-syl-tile', text: pt }); })));
    };
    var setTapMode = function (mode) {
      tapMode = mode;
      if (mode === 'define' && hasDef && !showDef) { showDef = true; remember('define', 'define', true); if (defButton) press(defButton, true); }
      else if (mode !== 'define' && showDef) { showDef = false; remember('define', 'define', false); if (defButton) press(defButton, false); }
      if (soundsCard && mode !== 'sounds') soundsCard.hidden = true;
      Object.keys(tapBtns).forEach(function (k) { press(tapBtns[k], k === tapMode); });
      paint();
    };
    var fillCard = function (card, head, body, ex, audio, spk, hAttr, hVal, img, alt, iAttr) {
      card.textContent = '';
      var hr = null;
      if (audio || hasDevVoice) {
        var o = { type: 'button', text: L.read_along_hear_meaning || 'Hear meaning', style: 'margin-top:6px' }; o[hAttr] = hVal;
        var hb = ctx.el('button', o);
        hb.addEventListener('click', function () { halt(false); if (audio) ctx.play(audio, 0, null, 0); else if (hasDevVoice) devVoice.speak(spk); });
        hr = ctx.el('div', { class: 'row', style: 'margin-top:4px' }, [hb]);
      }
      var col = ctx.el('div', { class: 'ra-def-body' }, [ctx.el('p', { class: 'ra-def-head', text: head }), ctx.el('p', { style: 'margin:4px 0', text: body }), ex ? ctx.el('p', { class: 'muted', style: 'margin:4px 0 0', text: '"' + ex + '"' }) : null, hr]);
      var src = img && typeof ctx.image === 'function' ? ctx.image(img) : null;
      if (src) { var io = { class: 'ra-def-img', src: src, alt: alt }; io[iAttr] = hVal; card.appendChild(ctx.el('div', { class: 'ra-def-layout' }, [ctx.el('img', io), col])); }
      else card.appendChild(col);
    };
    var showDefinition = function (k) {
      if (!defCard || !gloss || !Object.prototype.hasOwnProperty.call(gloss, k)) return;
      var e = gloss[k], h = e.w && e.w !== k ? k + ' (' + e.w + ')' : (e.w || k);
      fillCard(defCard, h + (e.p ? ' - ' + e.p : ''), e.d, e.e, e.a, (e.w || k) + '. ' + e.d, 'data-def-hear', k, e.img, e.alt || e.w || k, 'data-def-img');
      Object.keys(defPickBtns).forEach(function (x) { defPickBtns[x].setAttribute('aria-pressed', String(x === k)); });
    };
    var supCard = null, supPickBtns = {}, supLineBtns = [];
    var showSupport = function (id) {
      if (!supCard || !Object.prototype.hasOwnProperty.call(supportById, id)) return;
      var s = supportById[id], h = s.quote ? (s.quote + ' (sentence ' + (s.line + 1) + ')') : ('Note for sentence ' + (s.line + 1));
      fillCard(supCard, h, s.text, '', s.audio, (s.quote ? s.quote + '. ' : '') + s.text, 'data-support-hear', s.id, s.img, s.alt || s.quote || h, 'data-support-img');
      Object.keys(supPickBtns).forEach(function (x) { supPickBtns[x].setAttribute('aria-pressed', String(x === id)); });
    };
    var applyPosTheme = function () {
      var targets = [box, posLegend].filter(Boolean);
      targets.forEach(function (elNode) {
        if (posScheme && posScheme !== 'default') elNode.setAttribute('data-pos-scheme', posScheme);
        else elNode.removeAttribute('data-pos-scheme');
        if (posStyle && posStyle !== 'underline') elNode.setAttribute('data-pos-style', posStyle);
        else elNode.removeAttribute('data-pos-style');
        ['n', 'v', 'j', 'a', 'p', 'r', 'c'].forEach(function (pk) {
          var customHex = (posScheme === 'custom' && item.posPalette && item.posPalette[pk]) ? item.posPalette[pk] : '';
          if (customHex) elNode.style.setProperty('--pos-' + pk, customHex);
          else elNode.style.removeProperty('--pos-' + pk);
        });
      });
    };
    var paint = function () {
      if (posLegend) posLegend.hidden = !showPos;
      if (box) {
        if (showPos && (showPosLabels || posStyle === 'tags')) box.setAttribute('data-pos-tags', '1');
        else box.removeAttribute('data-pos-tags');
      }
      applyPosTheme();
      if (defBox) defBox.hidden = !showDef;
      for (var i = 0; i < nodes.length; i++) paintLine(i);
    };
    var chunkNav = null, sentPrevBtn = null, sentNextBtn = null, chunkAutoBtn = null;
    var stopChunkTimers = function () {
      if (chunkTimer && win.clearTimeout) { win.clearTimeout(chunkTimer); chunkTimer = 0; }
      if (twTimer && win.clearInterval) { win.clearInterval(twTimer); twTimer = 0; }
      twFull = true;
    };
    var runTypewriter = function (idx) {
      if (twTimer && win.clearInterval) { win.clearInterval(twTimer); twTimer = 0; }
      if (!chunkMode || chunkMood !== 'typewriter' || reducedMotion() || !nodes[idx] || !item.lines[idx]) { twFull = true; return; }
      var full = (showSyl && item.lines[idx].syl) ? item.lines[idx].syl : item.lines[idx].text;
      if (full.length <= 2) { twFull = true; return; }
      twFull = false;
      var pos = 1;
      nodes[idx].textContent = full.slice(0, pos);
      twTimer = win.setInterval(function () {
        pos += Math.max(1, Math.ceil(full.length / 26));
        if (pos >= full.length) {
          win.clearInterval(twTimer); twTimer = 0; twFull = true;
          paintLine(idx);
        } else if (nodes[idx]) {
          nodes[idx].textContent = full.slice(0, pos);
        }
      }, 36);
    };
    var canPrevSent = function () { return from > 0 || (isMultiPage && pageIdx > 0 && typeof ctx.goto === 'function'); };
    var canNextSent = function () { return from < item.lines.length - 1 || (isMultiPage && pageIdx < allPages.length - 1 && typeof ctx.goto === 'function'); };
    var stepChunk = function (dir, keepAuto) {
      if (guardMic()) return false;
      if (dir > 0) {
        if (from < item.lines.length - 1) { setActiveSentence(from + 1, true); return true; }
        if (isMultiPage && pageIdx < allPages.length - 1 && typeof ctx.goto === 'function') {
          if (cache) { cache.chunkPaceMs = chunkPaceMs; cache.chunkMood = chunkMood; }
          if (!ctx.isDone()) ctx.practice('read', '', { quiet: true });
          ctx.goto(pageIdx + 1, { fromLine: 0, autoPlay: keepAuto ? 'chunk' : false });
          return true;
        }
        return false;
      }
      if (from > 0) { setActiveSentence(from - 1, true); return true; }
      if (isMultiPage && pageIdx > 0 && typeof ctx.goto === 'function') {
        if (cache) { cache.chunkPaceMs = chunkPaceMs; cache.chunkMood = chunkMood; }
        ctx.goto(pageIdx - 1, { fromLine: -1, autoPlay: false });
        return true;
      }
      return false;
    };
    var scheduleChunkTimer = function () {
      if (chunkTimer && win.clearTimeout) { win.clearTimeout(chunkTimer); chunkTimer = 0; }
      if (!chunkMode || !chunkAutoOn || playing) return;
      chunkTimer = win.setTimeout(function () {
        chunkTimer = 0;
        if (!chunkMode || !chunkAutoOn || playing) return;
        if (from >= item.lines.length - 1) {
          if (isMultiPage && pageIdx < allPages.length - 1 && typeof ctx.goto === 'function') {
            stepChunk(1, true);
            return;
          }
          chunkAutoOn = false;
          if (chunkAutoBtn) press(chunkAutoBtn, false);
          return;
        }
        setActiveSentence(from + 1, true);
        scheduleChunkTimer();
      }, chunkPaceMs);
    };
    var applyChunkView = function () {
      if (box) {
        box.style.fontSize = chunkMode ? '1.75rem' : '1.5rem';
        if (chunkMode && chunkMood !== 'highlight') box.setAttribute('data-chunk-mood', chunkMood);
        else box.removeAttribute('data-chunk-mood');
      }
      nodes.forEach(function (n, i) {
        n.hidden = chunkMode && i !== from;
        if (n.nextSibling && n.nextSibling.nodeType === 3) n.nextSibling.nodeValue = chunkMode ? '' : ' ';
      });
      supLineBtns.forEach(function (entry) {
        entry.el.hidden = chunkMode && entry.line !== from;
      });
      paraNodes.forEach(function (p) { p.hidden = chunkMode; });
      if (chunkNav) chunkNav.hidden = !chunkMode;
      if (sentPrevBtn) sentPrevBtn.disabled = !canPrevSent();
      if (sentNextBtn) sentNextBtn.disabled = !canNextSent();
      if (!chunkMode) { chunkAutoOn = false; if (chunkAutoBtn) press(chunkAutoBtn, false); stopChunkTimers(); }
      else runTypewriter(from);
    };
    var mic = typeof ctx.studentMic === 'function' ? ctx.studentMic({
      itemId: item.id,
      page: item.page,
      pages: allPages.length,
      onRecordStart: function () { haltPlaybackOnly(false); },
      getSentence: function () { return { index: from, total: item.lines.length, text: (item.lines[from] && item.lines[from].text) || '' }; },
    }) : null;
    var guardMic = function () {
      if (mic && typeof mic.isRecording === 'function' && mic.isRecording()) {
        if (typeof mic.warnRecording === 'function') mic.warnRecording();
        return true;
      }
      return false;
    };
    var setActiveSentence = function (idx, savePlace) {
      var clamped = Math.max(0, Math.min(item.lines.length - 1, idx));
      from = clamped;
      if (sentCounter) sentCounter.textContent = ctx.fmt(L.read_along_sentence || 'Sentence {n} of {total}', { n: from + 1, total: item.lines.length });
      if (progFill) progFill.style.width = Math.round(((from + 1) / Math.max(1, item.lines.length)) * 100) + '%';
      if (savePlace !== false && typeof ctx.place === 'function') ctx.place(from);
      if (mic && typeof mic.setSentence === 'function') mic.setSentence(from, item.lines.length);
      applyChunkView();
    };
    var setWordHighlight = function (lineIdx, wordIdx) {
      var prevLine = activeLine, prevWord = activeWord;
      if (prevLine === lineIdx && prevWord === wordIdx) return;
      activeLine = lineIdx;
      activeWord = wordIdx;
      if (prevLine >= 0 && prevLine !== lineIdx) paintLine(prevLine);
      if (lineIdx >= 0) paintLine(lineIdx);
    };
    var mark = function (index) {
      if (index < 0 && activeLine >= 0) { var old = activeLine; activeLine = -1; activeWord = -1; paintLine(old); }
      nodes.forEach(function (n, i) {
        var on = i === index;
        n.style.background = on ? 'var(--ok-bg)' : 'none';
        n.style.boxShadow = on ? '0 0 0 2px var(--ok)' : 'none';
        n.style.outline = on ? '2px solid transparent' : '';
        n.style.textDecoration = on ? 'underline' : '';
        n.style.textUnderlineOffset = on ? '0.18em' : '';
        // Above the dimming of the reading focus (Reading tools), which follows this sentence.
        n.style.position = on ? 'relative' : '';
        n.style.zIndex = on ? '1' : '';
        if (on) n.setAttribute('aria-current', 'true'); else n.removeAttribute('aria-current');
      });
      if (index >= 0 && nodes[index] && typeof nodes[index].scrollIntoView === 'function') { try { nodes[index].scrollIntoView({ block: 'nearest' }); } catch (_) {} }
    };
    var playButton = hasAudio ? B({ class: 'primary', 'data-read-along-play': '', text: L.read_along_play }) : null;
    var devReadButton = (!hasAudio && hasDevVoice) ? B({ class: 'primary', 'data-read-along-device-read': '', text: 'Read with device voice' }) : null;
    var restartButton = (hasAudio || hasDevVoice || showMultiSent) ? B({ 'data-read-along-restart': '', text: L.read_along_restart || 'Restart' }) : null;
    var autoButton = ((hasAudio || hasDevVoice) && showMultiSent) ? B({ 'data-read-along-auto': '', text: L.read_along_auto || 'Auto-advance' }) : null;
    var sylButton = hasSyl ? B({ 'data-read-along-syllables': '', text: L.read_along_syllables }) : null;
    var posButton = hasPos ? B({ 'data-read-along-pos': '', text: L.read_along_pos || 'Parts of speech' }) : null;
    var defButton = hasDef ? B({ 'data-read-along-define': '', text: L.read_along_define || 'Word meanings' }) : null;
    var withSupButton = (hasSupports && (hasSupportAudio || hasDevVoice)) ? B({ 'data-read-along-with-supports': '', text: L.read_along_with_supports || 'Read with supports' }) : null;
    var boldButton = B({ 'data-read-along-bold': '', text: L.read_along_bold || 'Bold start' });
    var chunkButton = showMultiSent ? B({ 'data-read-along-chunk': '', text: L.read_along_chunk || 'One sentence' }) : null;
    var rsvpButton = B({ 'data-read-along-rsvp': '', text: L.read_along_rsvp || 'Focus mode' });
    var crawlButton = B({ 'data-read-along-crawl': '', text: L.read_along_crawl || 'Crawl' });
    if (autoButton) press(autoButton, autoAdv);
    if (sylButton) press(sylButton, showSyl);
    if (posButton) press(posButton, showPos);
    if (defButton) press(defButton, showDef);
    if (withSupButton) press(withSupButton, readWithSupports);
    press(boldButton, showBold);
    if (chunkButton) press(chunkButton, chunkMode);
    var posFilterBtns = {}, posSchemeSel = null, posStyleSel = null;
    var posLabelsBtn = hasPos ? B({ class: 'ra-pos-pill', 'data-pos-labels': '', 'aria-pressed': String(showPosLabels || posStyle === 'tags'), text: L.read_along_pos_labels || 'Show tags' }) : null;
    if (posLabelsBtn) {
      posLabelsBtn.addEventListener('click', function () {
        showPosLabels = !showPosLabels;
        posStyle = showPosLabels ? 'tags' : (posStyle === 'tags' ? 'underline' : posStyle);
        posLabelsBtn.setAttribute('aria-pressed', String(showPosLabels));
        if (posStyleSel) posStyleSel.value = posStyle;
        remember('posLabels', 'pos-labels', showPosLabels);
        paint();
      });
    }
    var presentPos = {};
    if (hasPos) {
      item.lines.forEach(function (row) {
        if (!row.pos) return;
        row.pos.split(',').forEach(function (pair) { var c = pair.split(':')[1]; if (c) presentPos[c] = true; });
      });
    }
    var posLegend = null;
    if (hasPos) {
      var posRows = [
        ['n', L.read_along_pos_n || 'Noun', 'posHideN', 'pos-hide-n'],
        ['v', L.read_along_pos_v || 'Verb', 'posHideV', 'pos-hide-v'],
        ['j', L.read_along_pos_j || 'Adjective', 'posHideJ', 'pos-hide-j'],
        ['a', L.read_along_pos_a || 'Adverb', 'posHideA', 'pos-hide-a'],
        ['p', L.read_along_pos_p || 'Pronoun', 'posHideP', 'pos-hide-p'],
        ['r', L.read_along_pos_r || 'Preposition', 'posHideR', 'pos-hide-r'],
        ['c', L.read_along_pos_c || 'Conjunction', 'posHideC', 'pos-hide-c'],
      ].filter(function (entry) { return !!presentPos[entry[0]]; });
      var schemeOpts = [
        ['default', 'Default'],
        ['fitzgerald', 'Fitzgerald Key'],
        ['montessori', 'Montessori'],
        ['okabe', 'Colorblind-safe'],
        ['mono', 'Monochrome'],
      ];
      if (item.posPalette || posScheme === 'custom') schemeOpts.push(['custom', 'Custom']);
      posSchemeSel = ctx.el('select', { class: 'ra-pos-sel', 'aria-label': L.read_along_pos_scheme || 'Colors', 'data-pos-scheme': '' }, schemeOpts.map(function (o) {
        return ctx.el('option', { value: o[0], text: o[1] });
      }));
      posSchemeSel.value = posScheme;
      posSchemeSel.addEventListener('change', function () { posScheme = posSchemeSel.value || 'default'; paint(); });
      posStyleSel = ctx.el('select', { class: 'ra-pos-sel', 'aria-label': L.read_along_pos_style || 'Style', 'data-pos-style': '' }, [
        ctx.el('option', { value: 'underline', text: 'Underline' }),
        ctx.el('option', { value: 'pill', text: 'Highlight' }),
        ctx.el('option', { value: 'tags', text: 'Tags' }),
      ]);
      posStyleSel.value = posStyle;
      posStyleSel.addEventListener('change', function () {
        posStyle = posStyleSel.value || 'underline';
        showPosLabels = posStyle === 'tags';
        if (posLabelsBtn) posLabelsBtn.setAttribute('aria-pressed', String(showPosLabels));
        remember('posLabels', 'pos-labels', showPosLabels);
        paint();
      });
      posLegend = ctx.el('div', { class: 'ra-pos-legend', role: 'group', 'aria-label': L.read_along_pos || 'Parts of speech', 'data-read-along-pos-legend': '', hidden: !showPos }, posRows.map(function (entry) {
        var code = entry[0], label = entry[1], pref = entry[2], attr = entry[3];
        var btn = B({ class: 'ra-pos-pill ra-pos ra-pos-' + code, 'data-pos-filter': code, 'aria-pressed': String(posOn[code]), text: label });
        btn.addEventListener('click', function () {
          posOn[code] = !posOn[code];
          btn.setAttribute('aria-pressed', String(posOn[code]));
          remember(pref, attr, !posOn[code]);
          paint();
        });
        posFilterBtns[code] = btn;
        return btn;
      }).concat([posLabelsBtn, posSchemeSel, posStyleSel]));
    }
    var setPlaying = function (on) {
      playing = on;
      if (playButton) playButton.textContent = on ? L.read_along_stop : L.read_along_play;
      if (devReadButton) devReadButton.textContent = on ? L.read_along_stop : 'Read with device voice';
    };
    var haltPlaybackOnly = function (keepPause) {
      if (pageTurnTimer && win.clearTimeout) { win.clearTimeout(pageTurnTimer); pageTurnTimer = 0; }
      if (keepPause && playing && !devReading && typeof ctx.audioTime === 'function') {
        var curT = ctx.audioTime();
        if (curT > 0.15) { pausedLine = from; pausedTime = curT; }
        else { pausedLine = -1; pausedTime = 0; }
      } else {
        pausedLine = -1; pausedTime = 0;
      }
      devReading = false;
      if (devVoice && typeof devVoice.stop === 'function') devVoice.stop();
      chunkAutoOn = false;
      if (chunkAutoBtn) press(chunkAutoBtn, false);
      stopChunkTimers();
      run++; ctx.stop(); mark(-1); setPlaying(false);
    };
    var halt = function (keepPause, unmounting) {
      haltPlaybackOnly(keepPause);
      if (mic) {
        if (unmounting && typeof mic.unmount === 'function') mic.unmount();
        else if (typeof mic.halt === 'function') mic.halt();
      }
      if (!keepPause && typeof closeOverlays === 'function') closeOverlays();
    };
    var playedAny = false;
    var makeWordTracker = function (i, mine) {
      var row = item.lines[i] || {};
      var timings = Array.isArray(row.timings) && row.timings.length ? row.timings : null;
      if (timings) {
        return function (cur, dur) {
          if (mine !== run || !(dur > 0)) return;
          var target = Math.max(0, Math.min(1000, Math.round((cur / dur) * 1000)));
          var wi = timings.length - 1;
          for (var k = 0; k < timings.length; k++) {
            if (target <= timings[k]) { wi = k; break; }
          }
          setWordHighlight(i, wi);
        };
      }
      var weights = wordWeights(row.text || '');
      var totalW = weights.reduce(function (a, b) { return a + b; }, 0);
      if (!weights.length || !totalW) return null;
      return function (cur, dur) {
        if (mine !== run || !(dur > 0)) return;
        var pct = Math.max(0, Math.min(1, cur / dur));
        var target = pct * totalW, acc = 0, wi = weights.length - 1;
        for (var k = 0; k < weights.length; k++) {
          acc += weights[k];
          if (target <= acc) { wi = k; break; }
        }
        setWordHighlight(i, wi);
      };
    };
    var speakWithDev = function (lineIdx, mine, cb) {
      devVoice.speak(item.lines[lineIdx].text, function (ok) {
        if (mine === run) cb(ok);
      }, function (wi) {
        if (mine === run) setWordHighlight(lineIdx, wi);
      });
    };
    var playSupportsForLine = function (li, mine, cb) {
      var ls = readWithSupports && hasSupports ? (supportsByLine[String(li)] || []) : [];
      if (!ls.length) { cb(true); return; }
      (function go(si) {
        if (mine !== run) return;
        if (si >= ls.length) { cb(true); return; }
        var s = ls[si]; showSupport(s.id);
        if (s.audio) ctx.play(s.audio, 0, null, 0).then(function (ok) { if (mine === run) ok === false ? cb(false) : go(si + 1); });
        else if (hasDevVoice) devVoice.speak((s.quote ? s.quote + '. ' : '') + s.text, function (ok) { if (mine === run) ok ? go(si + 1) : cb(false); });
        else go(si + 1);
      })(0);
    };
    var playLine = function (i, countSupport) {
      if (guardMic()) return false;
      if (i < 0 || i >= item.lines.length) return false;
      var hasLineClip = !!item.lines[i].audio;
      if (!hasLineClip && !hasDevVoice) return false;
      if (resumeBar) resumeBar.hidden = true;
      pausedLine = -1; pausedTime = 0; finishedRun = false;
      var mine = ++run;
      setPlaying(false);
      setActiveSentence(i, true);
      playedAny = true;
      if (countSupport !== false) ctx.support('lineReplays');
      mark(i);
      var finishOne = function (ok) {
        if (mine !== run) return;
        if (ok === false) { mark(-1); return; }
        playSupportsForLine(i, mine, function () { if (mine === run) mark(-1); });
      };
      if (hasLineClip) ctx.play(item.lines[i].audio, 0, makeWordTracker(i, mine), 0).then(finishOne);
      else speakWithDev(i, mine, finishOne);
      return true;
    };
    var findAudio = function (start, stepDir) {
      for (var j = start; j >= 0 && j < item.lines.length; j += stepDir) {
        if (item.lines[j] && (item.lines[j].audio || hasDevVoice)) return j;
      }
      return -1;
    };
    var scheduleAutoPageTurn = function (mine, mode) {
      if (!autoAdv || !isMultiPage || pageIdx >= allPages.length - 1 || typeof ctx.goto !== 'function') return false;
      mark(-1);
      pageTurnTimer = win.setTimeout(function () {
        pageTurnTimer = 0;
        if (mine !== run || guardMic()) { setPlaying(false); return; }
        if (!ctx.isDone()) ctx.practice('read', '', { quiet: true });
        ctx.goto(pageIdx + 1, { fromLine: 0, autoPlay: mode });
      }, 700);
      return true;
    };
    // The page from line i to its end (and seamlessly to the next page when Auto-advance is on): resumes mid-sentence when paused.
    var readFrom = function (i) {
      if (guardMic()) return;
      if (!hasAudio && !hasDevVoice) return;
      if (resumeBar) resumeBar.hidden = true;
      finishedRun = false;
      var mine = ++run;
      setPlaying(true);
      var step = function (at) {
        if (mine !== run) return;
        while (at < item.lines.length && !item.lines[at].audio && !hasDevVoice) at++;
        if (at >= item.lines.length) {
          pausedLine = -1; pausedTime = 0;
          if (!scheduleAutoPageTurn(mine, 'audio')) { finishedRun = true; mark(-1); setPlaying(false); }
          return;
        }
        var startSec = (at === pausedLine && pausedTime > 0.15) ? pausedTime : 0;
        pausedLine = -1; pausedTime = 0;
        setActiveSentence(at, true);
        playedAny = true;
        mark(at);
        var afterLine = function (ok) {
          if (mine !== run) return;
          if (ok === false) { mark(-1); setPlaying(false); return; }
          playSupportsForLine(at, mine, function (supOk) {
            if (mine !== run) return;
            if (!supOk || !autoAdv) { mark(-1); setPlaying(false); return; }
            step(at + 1);
          });
        };
        if (item.lines[at].audio) ctx.play(item.lines[at].audio, 0, makeWordTracker(at, mine), startSec).then(afterLine);
        else speakWithDev(at, mine, afterLine);
      };
      step(i);
    };
    if (playButton) playButton.addEventListener('click', function () {
      if (guardMic()) return;
      if (playing) { halt(true); return; }
      ctx.support('readThroughs');
      var startAt = finishedRun ? 0 : from;
      finishedRun = false;
      readFrom(startAt);
    });
    var readDeviceFrom = function (i) {
      if (guardMic()) return;
      if (!hasDevVoice) return;
      if (resumeBar) resumeBar.hidden = true;
      finishedRun = false;
      var mine = ++run;
      devReading = true;
      setPlaying(true);
      var step = function (at) {
        if (mine !== run || !devReading) return;
        if (at >= item.lines.length) {
          if (!scheduleAutoPageTurn(mine, 'device')) { devReading = false; finishedRun = true; mark(-1); setPlaying(false); }
          return;
        }
        setActiveSentence(at, true);
        playedAny = true;
        mark(at);
        speakWithDev(at, mine, function (ok) {
          if (mine !== run || !devReading) return;
          if (!ok) { devReading = false; mark(-1); setPlaying(false); return; }
          playSupportsForLine(at, mine, function (supOk) {
            if (mine !== run || !devReading) return;
            if (!supOk || !autoAdv) { devReading = false; mark(-1); setPlaying(false); return; }
            step(at + 1);
          });
        });
      };
      step(i);
    };
    if (devReadButton) devReadButton.addEventListener('click', function () {
      if (guardMic()) return;
      if (playing) { halt(false); return; }
      ctx.support('readThroughs');
      var startAt = finishedRun ? 0 : from;
      finishedRun = false;
      readDeviceFrom(startAt);
    });
    if (restartButton) restartButton.addEventListener('click', function () {
      if (guardMic()) return;
      halt(false);
      finishedRun = false;
      if (resumeBar) resumeBar.hidden = true;
      setActiveSentence(0, true);
      if (nodes[0] && typeof nodes[0].scrollIntoView === 'function') { try { nodes[0].scrollIntoView({ block: 'nearest' }); } catch (_) {} }
    });
    if (autoButton) autoButton.addEventListener('click', function () {
      autoAdv = !autoAdv;
      remember('noAuto', 'no-auto', !autoAdv);
      press(autoButton, autoAdv);
    });
    if (sylButton) sylButton.addEventListener('click', function () { showSyl = !showSyl; remember('syllables', 'syl', showSyl); press(sylButton, showSyl); if (showSyl) use('syllables'); paint(); });
    if (posButton) posButton.addEventListener('click', function () { showPos = !showPos; remember('pos', 'pos', showPos); press(posButton, showPos); if (showPos) use('partsOfSpeech'); paint(); });
    if (defButton) defButton.addEventListener('click', function () {
      showDef = !showDef;
      remember('define', 'define', showDef);
      press(defButton, showDef);
      if (showDef) { tapMode = 'define'; use('wordMeanings'); }
      else if (tapMode === 'define') tapMode = hasAudio ? 'sentence' : (hasDevVoice ? 'speak' : 'sentence');
      Object.keys(tapBtns).forEach(function (k) { press(tapBtns[k], k === tapMode); });
      paint();
    });
    if (withSupButton) withSupButton.addEventListener('click', function () {
      readWithSupports = !readWithSupports;
      remember('withSupports', 'with-supports', readWithSupports);
      press(withSupButton, readWithSupports);
      if (readWithSupports) use('readWithSupports');
    });
    boldButton.addEventListener('click', function () { showBold = !showBold; remember('bold', 'bold', showBold); press(boldButton, showBold); if (showBold) use('boldStart'); paint(); });
    if (win.MutationObserver && top) {
      var boldObs = new win.MutationObserver(function () {
        if (!ctx.root.isConnected) { boldObs.disconnect(); return; }
        var extBold = top.getAttribute('data-lt-bold') === '1';
        if (extBold !== showBold) { showBold = extBold; press(boldButton, showBold); paint(); }
      });
      boldObs.observe(top, { attributes: true, attributeFilter: ['data-lt-bold'] });
    }
    if (chunkButton) chunkButton.addEventListener('click', function () {
      chunkMode = !chunkMode;
      remember('chunk', 'chunk', chunkMode);
      press(chunkButton, chunkMode);
      if (chunkMode) use('chunkRead');
      applyChunkView();
    });
    var mainControls = [];
    if (playButton) mainControls.push(playButton);
    if (devReadButton) mainControls.push(devReadButton);
    if (restartButton && !item.simpleBar) mainControls.push(restartButton);
    if (autoButton && !item.simpleBar) mainControls.push(autoButton);
    if (mainControls.length) dock.appendChild(ctx.el('div', { class: 'ra-bar-main', 'data-read-along-main-bar': '' }, mainControls));
    var coreStudy = [], extraStudy = [];
    if (sylButton) coreStudy.push(sylButton);
    if (posButton) coreStudy.push(posButton);
    if (defButton) coreStudy.push(defButton);
    if (withSupButton) coreStudy.push(withSupButton);
    if (item.simpleBar && restartButton) extraStudy.push(restartButton);
    if (item.simpleBar && autoButton) extraStudy.push(autoButton);
    extraStudy.push(boldButton);
    if (chunkButton) extraStudy.push(chunkButton);
    extraStudy.push(rsvpButton, crawlButton);
    var tapChoices = [];
    if (hasAudio) tapChoices.push(['sentence', 'Sentence']);
    if (hasDevVoice) tapChoices.push(['speak', 'Speak word']);
    if (hasDef) tapChoices.push(['define', 'Define']);
    if (hasSyl) tapChoices.push(['sounds', 'Sounds']);
    if (tapChoices.length >= 2) {
      var tapNodes = [ctx.el('span', { text: 'Tap:' })];
      tapChoices.forEach(function (tc) {
        var b = B({ 'data-tap-mode': tc[0], text: tc[1] });
        press(b, tc[0] === tapMode);
        b.addEventListener('click', function () { setTapMode(tc[0]); });
        tapBtns[tc[0]] = b;
        tapNodes.push(b);
      });
      extraStudy.push(ctx.el('div', { class: 'ra-tap-bar', role: 'group', 'aria-label': 'Tap a word mode', 'data-read-along-tap-bar': '' }, tapNodes));
    }
    if (item.simpleBar) {
      var extraWrap = ctx.el('div', { class: 'ra-extra-tools', 'data-read-along-extra-tools': '', hidden: true }, extraStudy);
      var moreBtn = B({ 'data-read-along-more-tools': '', 'aria-expanded': 'false', text: 'More tools' });
      moreBtn.addEventListener('click', function () {
        var open = extraWrap.hidden;
        extraWrap.hidden = !open;
        moreBtn.setAttribute('aria-expanded', String(open));
        moreBtn.textContent = open ? 'Fewer tools' : 'More tools';
      });
      coreStudy.push(moreBtn);
      ctx.root.appendChild(ctx.el('div', { class: 'ra-tools-bar', role: 'group', 'aria-label': 'Reading helpers', 'data-read-along-tools-bar': '' }, coreStudy.concat([extraWrap])));
    } else {
      ctx.root.appendChild(ctx.el('div', { class: 'ra-tools-bar', role: 'group', 'aria-label': 'Reading helpers', 'data-read-along-tools-bar': '' }, coreStudy.concat(extraStudy)));
    }
    if (posLegend) ctx.root.appendChild(posLegend);
    var handleWordClick = function (ev) {
      if (!ev || !ev.target || typeof ev.target.closest !== 'function') return false;
      if (showDef) {
        var hitDef = ev.target.closest('[data-def-word]');
        if (hitDef) { ev.preventDefault(); ev.stopPropagation(); showDefinition(hitDef.getAttribute('data-def-word')); return true; }
      }
      var hitTap = ev.target.closest('[data-tap-word]');
      if (hitTap) {
        var wTxt = hitTap.getAttribute('data-tap-word');
        if (tapMode === 'sounds') {
          ev.preventDefault(); ev.stopPropagation();
          showSounds(wTxt, hitTap.getAttribute('data-syl-word') || wTxt);
          return true;
        }
        if (tapMode === 'speak' && hasDevVoice) {
          ev.preventDefault(); ev.stopPropagation();
          if (guardMic()) return true;
          devVoice.speak(wTxt);
          return true;
        }
      }
      return false;
    };
    // data-read: running text, where the shell's reading focus can go.
    var box = ctx.el('div', { role: 'group', 'aria-label': L.read_along_text, lang: item.lang, 'data-read': '', 'data-read-along-text': '',
      style: 'font-size:1.5rem;line-height:1.9;border:1px solid var(--line);border-radius:16px;padding:18px 20px;margin:10px 0 12px;overflow-wrap:anywhere' });
    item.lines.forEach(function (row, i) {
      if (row.para && i > 0 && !row.heading) {
        var spacer = ctx.el('span', { style: 'display:block;height:.7em', 'aria-hidden': 'true' });
        paraNodes.push(spacer);
        box.appendChild(spacer);
      }
      var isHeading = row.heading === 1 || row.heading === 2 || row.heading === 3;
      var headingStyle = isHeading ? 'display:block;font-weight:800;margin:' + (i > 0 ? '.65em' : '0') + ' 0 .25em;font-size:' + (row.heading === 1 ? '1.25em' : '1.12em') + ';line-height:1.35;' : '';
      var node;
      if (hasAudio) {
        // A sentence is a button that looks like text: pressing it reads that sentence, and "Read to me" then goes on from it.
        node = B({ 'data-read-along-line': String(i + 1), text: row.text,
          style: (isHeading ? headingStyle : 'display:inline;') + 'font:inherit;color:inherit;background:none;border:0;border-radius:6px;padding:6px 6px;margin:' + (isHeading ? (i > 0 ? '.65em 0 .25em' : '0 0 .25em') : '0') + ';min-height:0;min-width:36px;text-align:start;cursor:pointer;-webkit-box-decoration-break:clone;box-decoration-break:clone' + (isHeading ? ';font-weight:800;font-size:' + (row.heading === 1 ? '1.25em' : '1.12em') + ';line-height:1.35' : '') });
        if (isHeading) node.setAttribute('data-heading', String(row.heading));
        if (!row.audio && !hasDevVoice) {
          node.setAttribute('aria-disabled', 'true');
          node.style.cursor = 'default';
          node.style.opacity = '0.72';
        }
        node.addEventListener('click', function (ev) {
          if (handleWordClick(ev)) return;
          playLine(i, true);
        });
      } else {
        // Silent / syllable-only mode: plain reading text with no inert clickable button role.
        node = ctx.el('span', { 'data-read-along-line': String(i + 1), text: row.text,
          style: isHeading ? headingStyle + 'padding:2px 2px' : 'display:inline;padding:2px 2px' });
        if (isHeading) node.setAttribute('data-heading', String(row.heading));
        if (hasDef || hasSyl || hasDevVoice) {
          node.addEventListener('click', function (ev) { handleWordClick(ev); });
        }
      }
      nodes.push(node);
      box.appendChild(node);
      (supportsByLine[String(i)] || []).forEach(function (sup) {
        var chip = B({ class: 'ra-def-pick', 'data-support-chip': sup.id, text: sup.quote ? ('Note: ' + sup.quote) : 'Note', style: 'margin:0 4px;padding:2px 8px;font-size:.82rem;min-height:28px;vertical-align:middle' });
        chip.addEventListener('click', function (ev) { if (ev && ev.stopPropagation) ev.stopPropagation(); showSupport(sup.id); if (supCard && supCard.scrollIntoView) try { supCard.scrollIntoView({ block: 'nearest' }); } catch (_) {} });
        supLineBtns.push({ line: i, el: chip });
        box.appendChild(chip);
      });
      if (!isHeading) box.appendChild(doc.createTextNode(' '));
    });
    ctx.root.appendChild(box);
    if (hasSupports) {
      supCard = ctx.el('div', { class: 'ra-def-card', 'aria-live': 'polite', 'data-read-along-support-card': '' }, [ctx.el('p', { class: 'muted', style: 'margin:0', text: L.read_along_support_hint || 'Tap a note below to read or listen to a teacher support.' })]);
      var supChips = supports.map(function (s) {
        var b = B({ class: 'ra-def-pick', 'data-support-pick': s.id, 'aria-pressed': 'false', text: s.quote || ('Sentence ' + (s.line + 1)) });
        b.addEventListener('click', function () { showSupport(s.id); });
        return (supPickBtns[s.id] = b);
      });
      ctx.root.appendChild(ctx.el('div', { class: 'ra-def-box', 'data-read-along-supports-box': '' }, [
        ctx.el('p', { class: 'ra-def-head', style: 'margin:0 0 6px', text: L.read_along_supports_heading || 'Notes & supports' }),
        supCard,
        ctx.el('div', { class: 'ra-def-picks', role: 'group', 'aria-label': L.read_along_supports_heading || 'Notes & supports' }, supChips),
      ]));
    }
    if (hasSyl) {
      soundsCard = ctx.el('div', { class: 'ra-sounds-card', 'aria-live': 'polite', 'data-read-along-sounds-card': '', hidden: true });
      ctx.root.appendChild(soundsCard);
    }
    if (hasDef) {
      defCard = ctx.el('div', { class: 'ra-def-card', 'aria-live': 'polite', 'data-read-along-def-card': '' }, [
        ctx.el('p', { class: 'muted', style: 'margin:0', text: L.read_along_define_hint || 'Tap an underlined word in the passage, or choose one below, to see its meaning.' }),
      ]);
      var chips = glossKeys.map(function (k) {
        var b = B({ class: 'ra-def-pick', 'data-def-pick': k, 'aria-pressed': 'false', text: k });
        b.addEventListener('click', function () { showDefinition(k); });
        defPickBtns[k] = b;
        return b;
      });
      defBox = ctx.el('div', { class: 'ra-def-box', 'data-read-along-def-box': '', hidden: !showDef }, [
        defCard,
        ctx.el('div', { class: 'ra-def-picks', role: 'group', 'aria-label': L.read_along_define_words || 'Words on this page' }, chips),
      ]);
      ctx.root.appendChild(defBox);
    }
    if (showMultiSent) {
      sentPrevBtn = B({ 'data-read-along-sent-prev': '', text: L.read_along_sent_prev || 'Previous sentence' });
      sentNextBtn = B({ 'data-read-along-sent-next': '', text: L.read_along_sent_next || 'Next sentence' });
      chunkAutoBtn = B({ 'data-chunk-auto-timer': '', text: 'Auto pace' });
      press(chunkAutoBtn, false);
      var chunkPaceOut = ctx.el('span', { class: 'muted', 'data-chunk-pace-out': '', text: (chunkPaceMs / 1000).toFixed(1) + 's' });
      var chunkPaceIn = ctx.el('input', { type: 'range', min: '1000', max: '8000', step: '500', value: String(chunkPaceMs), 'aria-label': 'Seconds per sentence', 'data-chunk-pace': '' });
      var chunkMoodSel = ctx.el('select', { 'aria-label': 'Sentence style', 'data-chunk-mood': '' }, [
        ctx.el('option', { value: 'highlight', text: 'Sweep' }),
        ctx.el('option', { value: 'typewriter', text: 'Typewriter' }),
        ctx.el('option', { value: 'popin', text: 'Pop-In' }),
        ctx.el('option', { value: 'pulse', text: 'Pulse' }),
      ]);
      chunkMoodSel.value = chunkMood;
      sentPrevBtn.addEventListener('click', function () { if (guardMic()) return; halt(false); stepChunk(-1, false); });
      sentNextBtn.addEventListener('click', function () { if (guardMic()) return; halt(false); stepChunk(1, false); });
      chunkAutoBtn.addEventListener('click', function () {
        if (guardMic()) return;
        chunkAutoOn = !chunkAutoOn;
        press(chunkAutoBtn, chunkAutoOn);
        if (chunkAutoOn) scheduleChunkTimer(); else stopChunkTimers();
      });
      chunkPaceIn.addEventListener('input', function () {
        chunkPaceMs = Math.max(1000, Math.min(8000, Number(chunkPaceIn.value) || 3500));
        if (cache) cache.chunkPaceMs = chunkPaceMs;
        chunkPaceOut.textContent = (chunkPaceMs / 1000).toFixed(1) + 's';
        if (chunkAutoOn) scheduleChunkTimer();
      });
      chunkMoodSel.addEventListener('change', function () {
        chunkMood = chunkMoodSel.value || 'highlight';
        if (cache) cache.chunkMood = chunkMood;
        applyChunkView();
      });
      chunkNav = ctx.el('div', { class: 'ra-ov-controls', style: 'margin:8px 0', 'data-read-along-chunk-nav': '', hidden: !chunkMode }, [
        sentPrevBtn, sentNextBtn, chunkAutoBtn,
        ctx.el('label', { class: 'ra-ov-range' }, ['Pace ', chunkPaceIn, chunkPaceOut]),
        ctx.el('label', { class: 'ra-ov-range' }, ['Style ', chunkMoodSel]),
      ]);
      ctx.root.appendChild(chunkNav);
    }
    if (showSyl || showPos || showBold || showDef || tapMode === 'speak' || tapMode === 'sounds') { paint(); if (showSyl) use('syllables'); if (showPos) use('partsOfSpeech'); if (showBold) use('boldStart'); if (showDef) use('wordMeanings'); }
    else if (hasPos) applyPosTheme();
    applyChunkView();
    if (Array.isArray(item.questions) && item.questions.length) {
      var qNodes = item.questions.map(function (q, qi) {
        var qid = q.id || ('q' + (qi + 1));
        var card = ctx.el('div', { class: 'ra-chk-q', 'data-check-q': qid }, [
          ctx.el('p', { class: 'ra-chk-p', text: (qi + 1) + '. ' + q.prompt }),
        ]);
        if (q.kind === 'mc' && Array.isArray(q.choices)) {
          var fb = ctx.el('p', { class: 'ra-chk-fb', 'aria-live': 'polite', 'data-check-feedback': qid });
          var optBtns = [];
          q.choices.forEach(function (ch, ci) {
            var ob = B({ 'data-check-choice': String(ci), 'aria-pressed': 'false', text: ch });
            ob.addEventListener('click', function () {
              optBtns.forEach(function (b, bi) { b.setAttribute('aria-pressed', String(bi === ci)); });
              var ok = typeof q.answer === 'number' ? ci === q.answer : true;
              fb.textContent = ok ? (L.read_along_checks_right || 'Nice work!') : (L.read_along_checks_retry || 'Try another choice.');
              fb.setAttribute('data-ok', ok ? '1' : '0');
              use('comprehensionCheck');
            });
            optBtns.push(ob);
          });
          card.appendChild(ctx.el('div', { class: 'ra-chk-opts', role: 'group', 'aria-label': q.prompt }, optBtns));
          card.appendChild(fb);
        } else {
          card.appendChild(ctx.el('textarea', { class: 'ra-chk-open', rows: '3', 'aria-label': q.prompt, 'data-check-open': qid }));
          card.appendChild(ctx.el('p', { class: 'muted', style: 'margin:4px 0 0;font-size:.86rem', text: L.read_along_checks_open_note || 'Stays on this device only.' }));
        }
        return card;
      });
      ctx.root.appendChild(ctx.el('section', { class: 'ra-checks', 'aria-label': L.read_along_checks_heading || 'Check your understanding', 'data-read-along-checks': '' }, [
        ctx.el('h3', { text: L.read_along_checks_heading || 'Check your understanding' }),
      ].concat(qNodes)));
    }
    if (mic && mic.el) {
      if (typeof mic.setSentence === 'function') mic.setSentence(from, item.lines.length);
      ctx.root.appendChild(mic.el);
    }
    var navButtons = [];
    if (item.page > 1 && typeof ctx.goPrev === 'function') {
      var prev = B({ 'data-read-along-prev': '', text: L.read_along_prev });
      prev.addEventListener('click', function () { if (guardMic()) return; halt(false); ctx.goPrev(); });
      navButtons.push(prev);
    }
    var doneLabel = item.page >= item.pages ? (L.read_along_finish || L.finish || L.read_along_done) : (L.read_along_next || L.read_along_done);
    var done = B({ 'data-read-along-done': '', text: doneLabel });
    done.addEventListener('click', function () {
      if (guardMic()) return;
      halt(false);
      if (!ctx.isDone()) ctx.practice('read', L.read_along_done_said, { advance: true });
      else if (typeof ctx.goNext === 'function') ctx.goNext();
    });
    navButtons.push(done);
    ctx.root.appendChild(ctx.el('div', { class: 'row' }, navButtons));
    ctx.root.appendChild(ctx.el('details', { class: 'ra-keys-hint', 'data-read-along-keys-hint': '' }, [
      ctx.el('summary', { text: 'Keyboard shortcuts' }),
      ctx.el('p', { text: 'Space: play or pause. Left / Right arrows: previous or next sentence. Home / End: first or last sentence. R: replay sentence.' }),
    ]));
    var printAll = null;
    var renderPrintAll = function () {
      if (!printAll) return;
      printAll.textContent = '';
      allPages.forEach(function (pg, pi) {
        var sec = ctx.el('section', { class: 'ra-print-page', 'data-print-page': String(pi + 1) });
        sec.appendChild(ctx.el('p', { class: 'ra-print-page-label', text: 'Page ' + (pi + 1) + ' of ' + allPages.length + (pg.heading ? (' \u2014 ' + pg.heading) : '') }));
        var cur = [], lines = Array.isArray(pg.lines) ? pg.lines : [];
        var flushP = function () { if (cur.length) { sec.appendChild(ctx.el('p', { class: 'ra-print-p', text: cur.join(' ') })); cur = []; } };
        lines.forEach(function (row) {
          var t = (showSyl && row.syl) ? row.syl : row.text;
          if (row.heading) { flushP(); sec.appendChild(ctx.el('p', { class: 'ra-print-h', 'data-heading': String(row.heading), text: t })); return; }
          if (row.para) flushP();
          cur.push(t);
        });
        flushP();
        printAll.appendChild(sec);
      });
    };
    if (isMultiPage) {
      ctx.root.setAttribute('data-has-print-all', '1');
      printAll = ctx.el('div', { class: 'ra-print-all', 'data-read-along-print-all': '', 'aria-hidden': 'true' });
      ctx.root.appendChild(printAll);
      renderPrintAll();
      if (win.addEventListener) win.addEventListener('beforeprint', renderPrintAll);
    }
    var pagesForScope = function (scope) {
      if (!isMultiPage || scope === 'this') return [{ page: item, idx: pageIdx }];
      var start = scope === 'all' ? 0 : pageIdx, out = [];
      for (var pi = start; pi < allPages.length; pi++) out.push({ page: allPages[pi], idx: pi });
      return out;
    };
    var makeScopeSelect = function (attr) {
      if (!isMultiPage) return null;
      var sel = ctx.el('select', { class: 'ra-ov-scope', 'aria-label': 'Pages to include' }, [
        ctx.el('option', { value: 'from', text: 'From here' }),
        ctx.el('option', { value: 'all', text: 'Whole passage' }),
        ctx.el('option', { value: 'this', text: 'This page' }),
      ]);
      sel.setAttribute(attr, '');
      sel.value = 'from';
      return sel;
    };
    var splitRsvpWords = function (text, lang) {
      var s = String(text || '');
      if (!s.trim()) return [];
      try {
        if (win.Intl && typeof win.Intl.Segmenter === 'function') {
          var seg = new win.Intl.Segmenter(lang || item.lang || undefined, { granularity: 'word' });
          var out = [], pending = '';
          Array.from(seg.segment(s)).forEach(function (part) {
            var t = part.segment;
            if (!t || /^\s+$/.test(t)) return;
            if (part.isWordLike) { out.push(pending + t); pending = ''; }
            else if (/^[\(\[\{"'\u201c\u2018\u300c\u300e\u300a\u00ab]+$/.test(t)) pending += t;
            else if (out.length) out[out.length - 1] += t;
            else pending += t;
          });
          if (pending) { if (out.length) out[out.length - 1] += pending; else out.push(pending); }
          if (out.length) return out;
        }
      } catch (_) {}
      return s.split(/\s+/).filter(Boolean);
    };
    var splitGraphemes = function (word, lang) {
      var w = String(word || '');
      if (!w) return [];
      try {
        if (win.Intl && typeof win.Intl.Segmenter === 'function') {
          var gs = new win.Intl.Segmenter(lang || item.lang || undefined, { granularity: 'grapheme' });
          return Array.from(gs.segment(w)).map(function (p) { return p.segment; });
        }
      } catch (_) {}
      return Array.from(w);
    };
    // Focus Mode (RSVP / 1-6 word bold-assist) & Cinematic Crawl overlays (100% offline, zero AI, reduced-motion safe).
    var activeOverlay = null;
    var setOverlayInert = function (dialogEl, on, saved) {
      if (!doc || !doc.body) return [];
      if (on) {
        var list = [];
        Array.prototype.forEach.call(doc.body.children, function (node) {
          if (!node || node === dialogEl || node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;
          list.push({ node: node, hadInert: node.hasAttribute('inert'), prevHidden: node.getAttribute('aria-hidden') });
          try { node.inert = true; } catch (_) {}
          node.setAttribute('inert', '');
          node.setAttribute('aria-hidden', 'true');
        });
        return list;
      }
      (saved || []).forEach(function (entry) {
        var node = entry.node;
        if (!node) return;
        if (!entry.hadInert) {
          try { node.inert = false; } catch (_) {}
          node.removeAttribute('inert');
        }
        if (entry.prevHidden == null) node.removeAttribute('aria-hidden');
        else node.setAttribute('aria-hidden', entry.prevHidden);
      });
      return [];
    };
    closeOverlays = function () {
      if (activeOverlay && typeof activeOverlay.close === 'function') activeOverlay.close(false);
    };
    var openRsvp = function () {
      if (guardMic()) return;
      halt(false);
      var scope = isMultiPage ? 'from' : 'this';
      var buildWords = function () {
        var list = [];
        pagesForScope(scope).forEach(function (entry) {
          var lines = Array.isArray(entry.page.lines) ? entry.page.lines : [];
          var pgLang = entry.page.lang || item.lang;
          lines.forEach(function (row) {
            splitRsvpWords(row.text, pgLang).forEach(function (w) { list.push({ w: w, p: entry.idx, lang: pgLang }); });
          });
        });
        return list;
      };
      var allWords = buildWords();
      if (!allWords.length) return;
      var wpm = (cache && cache.rsvpWpm >= 100 && cache.rsvpWpm <= 900) ? cache.rsvpWpm : 250;
      var chunkSize = (cache && cache.rsvpChunkSize >= 1 && cache.rsvpChunkSize <= 6) ? cache.rsvpChunkSize : 1;
      var chunkIdx = 0, rsvpPlaying = false, timer = 0, countdown = 0, lastSeenPageIdx = allWords[0].p;
      var punctPauses = (cache && typeof cache.rsvpPunctPauses === 'boolean') ? cache.rsvpPunctPauses : true;
      var rsvpTheme = (cache && cache.rsvpTheme) || 'warm';
      var focusColor = (cache && cache.rsvpColor) || '#dc2626';
      var rsvpThemes = {
        warm: { bg: '#fdfbf7', ink: '#111827', card: '#ffffff' },
        dark: { bg: '#0f172a', ink: '#f1f5f9', card: '#1e293b' },
        sepia: { bg: '#f4ecd8', ink: '#3b2a1a', card: '#fdf6e3' },
      };
      var colorOpts = [
        ['Red', '#dc2626'], ['Blue', '#2563eb'], ['Green', '#16a34a'], ['Purple', '#9333ea'],
        ['Orange', '#ea580c'], ['Pink', '#db2777'], ['Teal', '#0d9488'],
      ];
      var chunksOf = function () {
        var out = [], step = Math.max(1, chunkSize);
        for (var i = 0; i < allWords.length; i += step) out.push(allWords.slice(i, i + step));
        return out;
      };
      var chunks = chunksOf();
      var closeBtn = B({ 'data-rsvp-close': '', text: L.tools_close || 'Close' });
      var playBtn = B({ class: 'primary', 'data-rsvp-play': '', text: 'Play' });
      var prevBtn = B({ 'data-rsvp-prev': '', text: 'Previous' });
      var nextBtn = B({ 'data-rsvp-next': '', text: 'Next' });
      var resetBtn = B({ 'data-rsvp-restart': '', text: L.read_along_restart || 'Restart' });
      var punctBtn = B({ 'data-rsvp-punct': '', 'aria-pressed': String(punctPauses), text: 'Pause at punctuation' });
      var wpmInput = ctx.el('input', { type: 'range', min: '100', max: '900', step: '25', value: String(wpm), 'aria-label': 'Words per minute', 'data-rsvp-wpm': '' });
      var wpmOut = ctx.el('span', { class: 'muted', 'data-rsvp-wpm-out': '', text: wpm + ' wpm' });
      var sizeInput = ctx.el('input', { type: 'range', min: '1', max: '6', step: '1', value: String(chunkSize), 'aria-label': 'Words per chunk', 'data-rsvp-chunk-size': '' });
      var sizeOut = ctx.el('span', { class: 'muted', 'data-rsvp-size-out': '', text: chunkSize === 1 ? '1 word' : chunkSize + ' words' });
      var themeSel = ctx.el('select', { 'aria-label': 'Focus mode theme', 'data-rsvp-theme': '' }, [
        ctx.el('option', { value: 'warm', text: 'Warm' }),
        ctx.el('option', { value: 'dark', text: 'Dark' }),
        ctx.el('option', { value: 'sepia', text: 'Sepia' }),
      ]);
      themeSel.value = rsvpTheme;
      var scopeSel = makeScopeSelect('data-rsvp-scope');
      var pageOut = isMultiPage ? ctx.el('span', { class: 'muted', 'data-rsvp-page': '', text: 'Page ' + (lastSeenPageIdx + 1) + ' of ' + allPages.length }) : null;
      var swatchBtns = [];
      var swatchWrap = ctx.el('div', { class: 'ra-rsvp-swatches', role: 'group', 'aria-label': 'Center letter color', 'data-rsvp-colors': '' }, colorOpts.map(function (co) {
        var b = B({ class: 'ra-rsvp-swatch', 'data-rsvp-color': co[1], 'aria-label': 'Focus color ' + co[0], 'aria-pressed': String(co[1] === focusColor), style: 'background:' + co[1] });
        b.addEventListener('click', function () {
          focusColor = co[1];
          if (cache) cache.rsvpColor = focusColor;
          swatchBtns.forEach(function (sb) { sb.setAttribute('aria-pressed', String(sb.getAttribute('data-rsvp-color') === focusColor)); });
          drawStage();
        });
        swatchBtns.push(b);
        return b;
      }));
      var countOut = ctx.el('span', { class: 'muted', 'data-rsvp-count': '', text: '1 / ' + chunks.length });
      var rsvpProgFill = ctx.el('span', { class: 'ra-progress-fill', style: 'width:0%' });
      var rsvpProg = ctx.el('div', { class: 'ra-progress ra-ov-progress', 'aria-hidden': 'true', 'data-rsvp-progress': '' }, [rsvpProgFill]);
      var stage = ctx.el('div', { class: 'ra-rsvp-stage', 'data-rsvp-stage': '', 'aria-live': 'off' });
      var headItems = [ctx.el('strong', { text: L.read_along_rsvp || 'Focus mode' })];
      if (scopeSel) headItems.push(scopeSel);
      if (pageOut) headItems.push(pageOut);
      headItems.push(countOut, closeBtn);
      var dialog = ctx.el('div', { class: 'ra-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': L.read_along_rsvp || 'Focus mode', 'data-rsvp-dialog': '' }, [
        ctx.el('div', { class: 'ra-ov-head' }, headItems),
        rsvpProg,
        ctx.el('div', { class: 'ra-ov-controls' }, [
          ctx.el('label', { class: 'ra-ov-range' }, ['Words ', sizeInput, sizeOut]),
          ctx.el('label', { class: 'ra-ov-range' }, ['Speed ', wpmInput, wpmOut]),
          ctx.el('label', { class: 'ra-ov-range' }, ['Theme ', themeSel]),
          punctBtn,
          swatchWrap,
        ]),
        stage,
        ctx.el('div', { class: 'row', style: 'justify-content:center' }, [prevBtn, playBtn, nextBtn, resetBtn]),
      ]);
      var applyRsvpTheme = function () { var th = rsvpThemes[rsvpTheme] || rsvpThemes.warm; dialog.style.background = th.bg; dialog.style.color = th.ink; stage.style.background = th.card; stage.style.color = th.ink; };
      var clearT = function () { if (timer && win.clearTimeout) { win.clearTimeout(timer); timer = 0; } };
      var delayFor = function (idx) {
        var ch = chunks[idx] || [], base = (60000 / Math.max(100, wpm)) * Math.max(1, ch.length);
        if (!punctPauses || !ch.length) return Math.max(60, base);
        var tail = ch[ch.length - 1].w.replace(/["'\u201d\u2019)\]\u300d\u300f]*$/, '').slice(-1);
        return Math.max(60, Math.round(base * (/[.!?\u3002\uff01\uff1f]/.test(tail) ? 2.0 : /[,;:\u3001\uff0c\uff1b\uff1a]/.test(tail) ? 1.4 : 1)));
      };
      var drawStage = function () {
        chunks = chunksOf(); chunkIdx = Math.max(0, Math.min(chunks.length - 1, chunkIdx));
        var ch = chunks[chunkIdx] || [];
        if (ch.length) lastSeenPageIdx = ch[0].p;
        if (pageOut) pageOut.textContent = 'Page ' + (lastSeenPageIdx + 1) + ' of ' + allPages.length;
        countOut.textContent = (chunkIdx + 1) + ' / ' + chunks.length; wpmOut.textContent = wpm + ' wpm';
        rsvpProgFill.style.width = Math.round(((chunkIdx + 1) / Math.max(1, chunks.length)) * 100) + '%';
        sizeOut.textContent = chunkSize === 1 ? '1 word' : chunkSize + ' words'; swatchWrap.hidden = chunkSize !== 1;
        prevBtn.disabled = chunkIdx <= 0; nextBtn.disabled = chunkIdx >= chunks.length - 1;
        playBtn.textContent = rsvpPlaying ? 'Pause' : 'Play'; stage.textContent = '';
        if (countdown > 0) { stage.appendChild(ctx.el('span', { class: 'ra-rsvp-countdown', 'data-rsvp-countdown': String(countdown), text: String(countdown) })); return; }
        if (chunkSize === 1) {
          var tok = ch[0] || { w: '', lang: item.lang };
          var gs = splitGraphemes(tok.w, tok.lang), mid = Math.floor(gs.length / 2);
          if (mid > 0) stage.appendChild(doc.createTextNode(gs.slice(0, mid).join('')));
          stage.appendChild(ctx.el('span', { class: 'ra-rsvp-orp', style: 'color:' + focusColor, text: gs[mid] || '' }));
          if (mid + 1 < gs.length) stage.appendChild(doc.createTextNode(gs.slice(mid + 1).join('')));
        } else {
          ch.forEach(function (tok, wi) {
            var gs = splitGraphemes(tok.w, tok.lang), cut = Math.max(1, Math.ceil(gs.length * 0.4));
            stage.appendChild(ctx.el('strong', { class: 'ra-bionic', text: gs.slice(0, cut).join('') }));
            if (cut < gs.length) stage.appendChild(doc.createTextNode(gs.slice(cut).join('')));
            if (wi < ch.length - 1) stage.appendChild(doc.createTextNode(' '));
          });
        }
      };
      var tick = function () {
        clearT(); if (!rsvpPlaying) return;
        if (countdown > 0) { timer = win.setTimeout(function () { if (rsvpPlaying) { countdown--; drawStage(); tick(); } }, 500); return; }
        timer = win.setTimeout(function () {
          if (!rsvpPlaying) return;
          if (chunkIdx >= chunks.length - 1) { rsvpPlaying = false; drawStage(); return; }
          chunkIdx++; drawStage(); tick();
        }, delayFor(chunkIdx));
      };
      var toggle = function () {
        if (rsvpPlaying) { rsvpPlaying = false; countdown = 0; clearT(); drawStage(); return; }
        var freshStart = chunkIdx === 0 || chunkIdx >= chunks.length - 1;
        if (chunkIdx >= chunks.length - 1) chunkIdx = 0;
        countdown = (freshStart && !reducedMotion()) ? 3 : 0; rsvpPlaying = true; drawStage(); tick();
      };
      var onKey = function (e) {
        if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); close(true); return; }
        if (e.target && /^(INPUT|SELECT)$/.test(e.target.tagName)) return;
        if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); toggle(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); rsvpPlaying = false; countdown = 0; clearT(); chunkIdx++; drawStage(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); rsvpPlaying = false; countdown = 0; clearT(); chunkIdx--; drawStage(); }
        else if (e.key === '+' || e.key === '=') { wpm = Math.min(900, wpm + 25); if (cache) cache.rsvpWpm = wpm; wpmInput.value = String(wpm); drawStage(); }
        else if (e.key === '-' || e.key === '_') { wpm = Math.max(100, wpm - 25); if (cache) cache.rsvpWpm = wpm; wpmInput.value = String(wpm); drawStage(); }
        else if (e.key === '[') { chunkSize = Math.max(1, chunkSize - 1); if (cache) cache.rsvpChunkSize = chunkSize; sizeInput.value = String(chunkSize); drawStage(); }
        else if (e.key === ']') { chunkSize = Math.min(6, chunkSize + 1); if (cache) cache.rsvpChunkSize = chunkSize; sizeInput.value = String(chunkSize); drawStage(); }
        else if (e.key === 'p' || e.key === 'P') { punctPauses = !punctPauses; if (cache) cache.rsvpPunctPauses = punctPauses; punctBtn.setAttribute('aria-pressed', String(punctPauses)); }
      };
      var savedInert = [];
      var close = function (restoreFocus) {
        rsvpPlaying = false; countdown = 0; clearT(); doc.removeEventListener('keydown', onKey, true);
        if (dialog.parentNode) dialog.parentNode.removeChild(dialog);
        savedInert = setOverlayInert(dialog, false, savedInert);
        if (activeOverlay && activeOverlay.dialog === dialog) activeOverlay = null;
        if (restoreFocus !== false && isMultiPage && lastSeenPageIdx !== pageIdx) showOverlayJump(lastSeenPageIdx);
        if (restoreFocus && rsvpButton) rsvpButton.focus();
      };
      if (scopeSel) scopeSel.addEventListener('change', function () {
        rsvpPlaying = false; countdown = 0; clearT();
        scope = scopeSel.value || 'from';
        allWords = buildWords();
        chunkIdx = 0;
        drawStage();
      });
      playBtn.addEventListener('click', toggle);
      prevBtn.addEventListener('click', function () { rsvpPlaying = false; countdown = 0; clearT(); chunkIdx--; drawStage(); });
      nextBtn.addEventListener('click', function () { rsvpPlaying = false; countdown = 0; clearT(); chunkIdx++; drawStage(); });
      resetBtn.addEventListener('click', function () { rsvpPlaying = false; countdown = 0; clearT(); chunkIdx = 0; drawStage(); });
      punctBtn.addEventListener('click', function () { punctPauses = !punctPauses; if (cache) cache.rsvpPunctPauses = punctPauses; punctBtn.setAttribute('aria-pressed', String(punctPauses)); });
      themeSel.addEventListener('change', function () { rsvpTheme = themeSel.value || 'warm'; if (cache) cache.rsvpTheme = rsvpTheme; applyRsvpTheme(); });
      wpmInput.addEventListener('input', function () { wpm = Math.max(100, Math.min(900, Number(wpmInput.value) || 250)); if (cache) cache.rsvpWpm = wpm; drawStage(); });
      sizeInput.addEventListener('input', function () {
        var prevSize = chunkSize, wordPos = chunkIdx * prevSize;
        chunkSize = Math.max(1, Math.min(6, Number(sizeInput.value) || 1));
        if (cache) cache.rsvpChunkSize = chunkSize;
        chunkIdx = Math.floor(wordPos / chunkSize);
        drawStage();
      });
      closeBtn.addEventListener('click', function () { close(true); });
      applyRsvpTheme();
      activeOverlay = { dialog: dialog, close: close };
      doc.body.appendChild(dialog);
      savedInert = setOverlayInert(dialog, true);
      doc.addEventListener('keydown', onKey, true);
      drawStage();
      use('focusMode');
      playBtn.focus();
    };
    var openCrawl = function () {
      if (guardMic()) return;
      halt(false);
      var scope = isMultiPage ? 'from' : 'this';
      var isFlat = reducedMotion();
      var speed = (cache && cache.crawlSpeed >= 10 && cache.crawlSpeed <= 140) ? cache.crawlSpeed : 60;
      var palette = (cache && cache.crawlPalette) || 'gold';
      var y = 0, crawlPlaying = !isFlat, raf = 0, lastTs = 0, ambientOn = false, padCtx = null, padNodes = null;
      var included = pagesForScope(scope), pageMarkers = [], lastSeenPageIdx = included[0] ? included[0].idx : pageIdx;
      var palettes = {
        gold: { bg: '#000000', ink: '#fde047' },
        aqua: { bg: '#061629', ink: '#67e8f9' },
        paper: { bg: '#111827', ink: '#f9fafb' },
      };
      var closeBtn = B({ 'data-crawl-close': '', text: L.tools_close || 'Close' });
      var playBtn = B({ class: 'primary', 'data-crawl-play': '', text: crawlPlaying ? 'Pause' : 'Play' });
      var resetBtn = B({ 'data-crawl-restart': '', text: L.read_along_restart || 'Restart' });
      var ambientBtn = B({ 'data-crawl-ambient': '', 'aria-pressed': 'false', text: 'Ambient sound' });
      var speedInput = ctx.el('input', { type: 'range', min: '10', max: '140', step: '5', value: String(speed), 'aria-label': 'Crawl speed', 'data-crawl-speed': '' });
      var speedOut = ctx.el('span', { 'data-crawl-speed-out': '', text: speed + ' px/s' });
      var themeSel = ctx.el('select', { 'aria-label': 'Crawl colors', 'data-crawl-theme': '' }, [
        ctx.el('option', { value: 'gold', text: 'Golden' }),
        ctx.el('option', { value: 'aqua', text: 'Aqua' }),
        ctx.el('option', { value: 'paper', text: 'Paper' }),
      ]);
      themeSel.value = palette;
      var scopeSel = makeScopeSelect('data-crawl-scope');
      var pageOut = isMultiPage ? ctx.el('span', { 'data-crawl-page': '', text: 'Page ' + (lastSeenPageIdx + 1) + ' of ' + allPages.length }) : null;
      var crawlProgFill = ctx.el('span', { class: 'ra-progress-fill', style: 'width:0%' });
      var crawlProg = ctx.el('div', { class: 'ra-progress ra-ov-progress', 'aria-hidden': 'true', 'data-crawl-progress': '' }, [crawlProgFill]);
      var replayEndBtn = B({ class: 'primary', 'data-crawl-replay': '', text: 'Replay' });
      var endCard = ctx.el('div', { class: 'ra-crawl-end', 'data-crawl-end': '', hidden: true }, [
        ctx.el('h3', { text: 'THE END' }),
        replayEndBtn,
      ]);
      var textWrap = ctx.el('div', { class: 'ra-crawl-text', 'data-crawl-text': '' });
      var viewport = ctx.el('div', { class: 'ra-crawl-view' + (isFlat ? ' is-flat' : ''), 'data-crawl-view': '' }, [textWrap, endCard]);
      var headItems = [ctx.el('strong', { text: L.read_along_crawl || 'Crawl' })];
      if (scopeSel) headItems.push(scopeSel);
      if (pageOut) headItems.push(pageOut);
      headItems.push(closeBtn);
      var dialog = ctx.el('div', { class: 'ra-overlay ra-crawl-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': L.read_along_crawl || 'Crawl', 'data-crawl-dialog': '' }, [
        ctx.el('div', { class: 'ra-ov-head' }, headItems),
        crawlProg,
        ctx.el('div', { class: 'ra-ov-controls' }, [
          ctx.el('label', { class: 'ra-ov-range' }, ['Speed ', speedInput, speedOut]),
          ctx.el('label', { class: 'ra-ov-range' }, ['Colors ', themeSel]),
          ambientBtn,
          playBtn,
          resetBtn,
        ]),
        viewport,
      ]);
      var applyTransform = function () {
        textWrap.style.transform = isFlat ? 'none' : ('translateY(' + Math.round(y) + 'px) rotateX(18deg)');
      };
      var buildCrawlNodes = function () {
        textWrap.textContent = '';
        pageMarkers = [];
        included = pagesForScope(scope);
        lastSeenPageIdx = included[0] ? included[0].idx : pageIdx;
        included.forEach(function (entry, ei) {
          if (ei > 0) {
            var sep = ctx.el('div', { class: 'ra-crawl-page-sep', 'data-crawl-page-sep': String(entry.idx + 1), text: 'Page ' + (entry.idx + 1) });
            textWrap.appendChild(sep);
            pageMarkers.push({ el: sep, pageIdx: entry.idx });
          }
          var cur = [], plainCur = [], lines = Array.isArray(entry.page.lines) ? entry.page.lines : [];
          var flush = function () {
            if (!cur.length) return;
            var attrs = { text: cur.join(' ') };
            if (showSyl && cur.join(' ') !== plainCur.join(' ')) attrs['aria-label'] = plainCur.join(' ');
            textWrap.appendChild(ctx.el('p', attrs));
            cur = []; plainCur = [];
          };
          lines.forEach(function (row) {
            var shown = (showSyl && row.syl) ? row.syl : row.text;
            if (row.heading) {
              flush();
              var hAttrs = { class: 'ra-crawl-h ra-crawl-h' + row.heading, 'data-crawl-heading': String(row.heading), text: shown };
              if (showSyl && row.syl && row.syl !== row.text) hAttrs['aria-label'] = row.text;
              textWrap.appendChild(ctx.el('h3', hAttrs));
              return;
            }
            if (row.para) flush();
            cur.push(shown); plainCur.push(row.text);
          });
          flush();
        });
        if (pageOut) pageOut.textContent = 'Page ' + (lastSeenPageIdx + 1) + ' of ' + allPages.length;
        crawlProgFill.style.width = '0%';
      };
      buildCrawlNodes();
      applyTransform();
      var syncAmbient = function () {
        if (!ambientOn || !crawlPlaying) {
          if (padNodes && padNodes.gain) { try { padNodes.gain.gain.setTargetAtTime(0, padCtx.currentTime, 0.25); } catch (_) {} }
          return;
        }
        try {
          var Ctor = win.AudioContext || win.webkitAudioContext;
          if (!Ctor) return;
          if (!padCtx) padCtx = new Ctor();
          if (padCtx.state === 'suspended' && typeof padCtx.resume === 'function') padCtx.resume();
          if (!padNodes) {
            var g = padCtx.createGain();
            g.gain.value = 0;
            var lp = padCtx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = 600;
            var oscs = [110, 164.81, 220].map(function (f, oi) {
              var o = padCtx.createOscillator();
              o.type = oi === 1 ? 'triangle' : 'sine';
              o.frequency.value = f;
              if (o.detune) o.detune.value = (oi - 1) * 6;
              o.connect(g);
              o.start();
              return o;
            });
            g.connect(lp);
            lp.connect(padCtx.destination);
            padNodes = { gain: g, oscs: oscs };
          }
          padNodes.gain.gain.setTargetAtTime(0.05, padCtx.currentTime, 0.5);
        } catch (_) {}
      };
      var tearAmbient = function () {
        try {
          if (padNodes && padNodes.oscs) padNodes.oscs.forEach(function (o) { try { o.stop(); } catch (_) {} });
          padNodes = null;
          if (padCtx && typeof padCtx.close === 'function') padCtx.close();
          padCtx = null;
        } catch (_) {}
      };
      var applyPalette = function () {
        var pal = palettes[palette] || palettes.gold;
        dialog.style.background = pal.bg;
        dialog.style.color = pal.ink;
      };
      var stopFrame = function () {
        if (raf) {
          if (win.cancelAnimationFrame) win.cancelAnimationFrame(raf);
          else if (win.clearTimeout) win.clearTimeout(raf);
          raf = 0;
        }
        lastTs = 0;
      };
      var updateCrawlPage = function (limit) {
        var pct = Math.max(0, Math.min(100, Math.round((-y / Math.max(1, limit)) * 100)));
        crawlProgFill.style.width = pct + '%';
        if (included.length <= 1) return;
        var seen = included[0].idx;
        var vpRect = viewport.getBoundingClientRect ? viewport.getBoundingClientRect() : null;
        if (vpRect && vpRect.height > 0 && pageMarkers.length) {
          pageMarkers.forEach(function (pm) {
            var r = pm.el.getBoundingClientRect ? pm.el.getBoundingClientRect() : null;
            if (r && r.top <= vpRect.bottom - 20) seen = pm.pageIdx;
          });
        } else {
          var est = Math.min(included.length - 1, Math.floor(((-y) / Math.max(1, limit)) * included.length));
          if (est >= 0 && included[est]) seen = included[est].idx;
        }
        if (seen !== lastSeenPageIdx) {
          lastSeenPageIdx = seen;
          if (pageOut) pageOut.textContent = 'Page ' + (lastSeenPageIdx + 1) + ' of ' + allPages.length;
        }
      };
      var stepFrame = function (ts) {
        if (!crawlPlaying) return;
        var now = typeof ts === 'number' ? ts : Date.now();
        if (!lastTs) lastTs = now;
        var dt = Math.min(100, Math.max(0, now - lastTs)) / 1000;
        lastTs = now;
        y -= dt * speed;
        applyTransform();
        var limit = (viewport.clientHeight || 400) + (textWrap.clientHeight || 400);
        updateCrawlPage(limit);
        if (y < -limit) {
          if (included.length) lastSeenPageIdx = included[included.length - 1].idx;
          if (pageOut) pageOut.textContent = 'Page ' + (lastSeenPageIdx + 1) + ' of ' + allPages.length;
          crawlProgFill.style.width = '100%';
          crawlPlaying = false; playBtn.textContent = 'Play'; endCard.hidden = false; stopFrame(); syncAmbient(); return;
        }
        raf = win.requestAnimationFrame ? win.requestAnimationFrame(stepFrame) : win.setTimeout(function () { stepFrame(Date.now()); }, 32);
      };
      var setCrawlPlay = function (on) {
        if (on && !endCard.hidden) { y = 0; applyTransform(); endCard.hidden = true; crawlProgFill.style.width = '0%'; }
        crawlPlaying = !!on;
        playBtn.textContent = crawlPlaying ? 'Pause' : 'Play';
        stopFrame();
        syncAmbient();
        if (crawlPlaying) raf = win.requestAnimationFrame ? win.requestAnimationFrame(stepFrame) : win.setTimeout(function () { stepFrame(Date.now()); }, 32);
      };
      var restartCrawl = function () { endCard.hidden = true; y = 0; applyTransform(); crawlProgFill.style.width = '0%'; setCrawlPlay(!isFlat); };
      var toggleAmbient = function () { ambientOn = !ambientOn; ambientBtn.setAttribute('aria-pressed', String(ambientOn)); syncAmbient(); };
      var onKey = function (e) {
        if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); close(true); return; }
        if (e.target && /^(INPUT|SELECT)$/.test(e.target.tagName)) return;
        if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); setCrawlPlay(!crawlPlaying); }
        else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); restartCrawl(); }
        else if (e.key === 'm' || e.key === 'M') { e.preventDefault(); toggleAmbient(); }
      };
      var savedInert = [];
      var close = function (restoreFocus) {
        crawlPlaying = false;
        stopFrame();
        tearAmbient();
        doc.removeEventListener('keydown', onKey, true);
        if (dialog.parentNode) dialog.parentNode.removeChild(dialog);
        savedInert = setOverlayInert(dialog, false, savedInert);
        if (activeOverlay && activeOverlay.dialog === dialog) activeOverlay = null;
        if (restoreFocus !== false && isMultiPage && lastSeenPageIdx !== pageIdx) showOverlayJump(lastSeenPageIdx);
        if (restoreFocus && crawlButton) crawlButton.focus();
      };
      if (scopeSel) scopeSel.addEventListener('change', function () {
        scope = scopeSel.value || 'from';
        endCard.hidden = true;
        y = 0;
        buildCrawlNodes();
        applyTransform();
      });
      playBtn.addEventListener('click', function () { setCrawlPlay(!crawlPlaying); });
      viewport.addEventListener('click', function (ev) { if (ev && ev.target === replayEndBtn) return; setCrawlPlay(!crawlPlaying); });
      replayEndBtn.addEventListener('click', function (ev) { ev.stopPropagation(); restartCrawl(); });
      resetBtn.addEventListener('click', restartCrawl);
      ambientBtn.addEventListener('click', toggleAmbient);
      speedInput.addEventListener('input', function () { speed = Math.max(10, Math.min(140, Number(speedInput.value) || 60)); if (cache) cache.crawlSpeed = speed; speedOut.textContent = speed + ' px/s'; });
      themeSel.addEventListener('change', function () { palette = themeSel.value; if (cache) cache.crawlPalette = palette; applyPalette(); });
      closeBtn.addEventListener('click', function () { close(true); });
      applyPalette();
      activeOverlay = { dialog: dialog, close: close };
      doc.body.appendChild(dialog);
      savedInert = setOverlayInert(dialog, true);
      doc.addEventListener('keydown', onKey, true);
      use('crawlMode');
      if (crawlPlaying) setCrawlPlay(true);
      playBtn.focus();
    };
    rsvpButton.addEventListener('click', openRsvp);
    crawlButton.addEventListener('click', openCrawl);
    if (typeof ctx.keys === 'function') {
      ctx.keys(function (key) {
        if (activeOverlay) return false;
        var active = ctx.root.ownerDocument.activeElement;
        var onBtn = !!(active && active.tagName === 'BUTTON');
        if (key === 'Enter' && chunkMode && chunkMood === 'typewriter' && !twFull) {
          stopChunkTimers();
          paintLine(from);
          return true;
        }
        if ((hasAudio || hasDevVoice) && (key === ' ' || key === 'Spacebar') && !onBtn) {
          if (guardMic()) return true;
          if (playing) halt(hasAudio);
          else {
            ctx.support('readThroughs');
            var startAt = finishedRun ? 0 : from;
            finishedRun = false;
            if (hasAudio) readFrom(startAt); else readDeviceFrom(startAt);
          }
          return true;
        }
        if (key === 'Home' && item.lines.length > 1) {
          if (guardMic()) return true;
          halt(false);
          setActiveSentence(0, true);
          return true;
        }
        if (key === 'End' && item.lines.length > 1) {
          if (guardMic()) return true;
          halt(false);
          setActiveSentence(item.lines.length - 1, true);
          return true;
        }
        if (key === 'ArrowRight') {
          if (guardMic()) return true;
          if (chunkMode || !hasAudio) {
            if (canNextSent()) { halt(false); stepChunk(1, false); return true; }
          } else {
            var nextIdx = playedAny ? findAudio(from + 1, 1) : findAudio(0, 1);
            if (nextIdx >= 0) { playLine(nextIdx, true); return true; }
          }
        }
        if (key === 'ArrowLeft') {
          if (guardMic()) return true;
          if (chunkMode || !hasAudio) {
            if (canPrevSent()) { halt(false); stepChunk(-1, false); return true; }
          } else {
            var prevIdx = playedAny ? findAudio(from - 1, -1) : findAudio(item.lines.length - 1, -1);
            if (prevIdx >= 0) { playLine(prevIdx, true); return true; }
          }
        }
        return false;
      });
    }
    if (nav) {
      if (typeof nav.fromLine === 'number') {
        var initLine = nav.fromLine < 0 ? Math.max(0, item.lines.length - 1) : Math.max(0, Math.min(item.lines.length - 1, nav.fromLine));
        setActiveSentence(initLine, true);
      }
      if (nav.autoPlay === 'chunk' && chunkMode && chunkAutoBtn) {
        chunkAutoOn = true;
        press(chunkAutoBtn, true);
        scheduleChunkTimer();
      } else if (nav.autoPlay === 'device' && hasDevVoice) {
        readDeviceFrom(from);
      } else if ((nav.autoPlay === 'audio' || nav.autoPlay === true) && (hasAudio || hasDevVoice)) {
        if (hasAudio) readFrom(from); else readDeviceFrom(from);
      }
    }
    var handle = {
      allowRevisit: true,
      reveal: function () { halt(false); },
      stop: function () {
        halt(false, true);
        if (printAll && win.removeEventListener) win.removeEventListener('beforeprint', renderPrintAll);
      },
    };
    if (hasAudio) {
      handle.replay = function () {
        if (guardMic()) return;
        var target = (item.lines[from] && (item.lines[from].audio || hasDevVoice)) ? from : findAudio(0, 1);
        if (target >= 0) playLine(target, false);
      };
    } else if (hasDevVoice) {
      handle.replay = function () {
        if (guardMic()) return;
        var target = (from >= 0 && from < item.lines.length) ? from : 0;
        if (!item.lines[target]) return;
        halt(false);
        setActiveSentence(target, true);
        playedAny = true;
        mark(target);
        var mine = ++run;
        speakWithDev(target, mine, function () { if (mine === run) mark(-1); });
      };
    }
    return handle;
  },
  // Listening practice: no answer is right or wrong, so nothing is ever scored.
  score: function () { return { correct: false, digitsCorrect: null, digitsPossible: null }; },
};
