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
      var pos = typeof (row && row.pos) === 'string' && row.pos.length <= 400 && /^(?:\d{1,3}:[nvja](?:,\d{1,3}:[nvja])*)$/.test(row.pos) ? row.pos : '';
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
    if (p.glossary && typeof p.glossary === 'object' && !Array.isArray(p.glossary)) {
      var gloss = {}, gCount = 0;
      Object.keys(p.glossary).forEach(function (k) {
        if (gCount >= 120 || k.length > 40 || !/^[a-z]{2,24}(?: [a-z]{2,24}){0,2}$/.test(k)) return;
        var v = p.glossary[k];
        if (!v || typeof v !== 'object') return;
        var def = line(v.d, 240);
        if (!def) return;
        var entry = { w: line(v.w, 40) || k, d: def };
        var vp = line(v.p, 24), ve = line(v.e, 200), vImg = clip(v.img), vAlt = line(v.alt, 60);
        if (vp) entry.p = vp;
        if (ve) entry.e = ve;
        if (vImg) { entry.img = vImg; if (vAlt) entry.alt = vAlt; }
        gloss[k] = entry;
        gCount++;
      });
      if (gCount) item.glossary = gloss;
    }
    return { item: item };
  },
  render: function (item, ctx) {
    var L = ctx.L, nodes = [], paraNodes = [], run = 0, playing = false, from = 0, counted = {};
    var activeLine = -1, activeWord = -1;
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
    var showBold = readPref('bold', 'bold', false);
    var showPosLabels = readPref('posLabels', 'pos-labels', false);
    var chunkMode = item.lines.length > 1 && readPref('chunk', 'chunk', false);
    var autoAdv = !readPref('noAuto', 'no-auto', false);
    var devVoice = typeof ctx.deviceVoice === 'function' ? ctx.deviceVoice(item.lang) : null;
    var hasDevVoice = !!(devVoice && typeof devVoice.available === 'function' && devVoice.available());
    var tapMode = showDef ? 'define' : (hasAudio ? 'sentence' : (hasDevVoice ? 'speak' : (hasSyl ? 'sounds' : 'sentence')));
    var pausedLine = -1, pausedTime = 0, closeOverlays = null, chunkTimer = 0, chunkAutoOn = false, chunkPaceMs = 3500, chunkMood = 'highlight', twTimer = 0, twFull = false, devReading = false;
    var win = doc.defaultView || {};
    var reducedMotion = function () { try { return !!(win.matchMedia && win.matchMedia('(prefers-reduced-motion:reduce)').matches); } catch (_) { return false; } };
    var posOn = {
      n: !readPref('posHideN', 'pos-hide-n', false),
      v: !readPref('posHideV', 'pos-hide-v', false),
      j: !readPref('posHideJ', 'pos-hide-j', false),
      a: !readPref('posHideA', 'pos-hide-a', false),
    };
    var use = function (name) { if (!counted[name]) { counted[name] = true; ctx.support(name); } };
    var press = function (button, on) { button.setAttribute('aria-pressed', String(on)); button.style.background = on ? 'var(--accent)' : ''; button.style.color = on ? 'var(--accent-ink)' : ''; };
    if (item.heading) ctx.root.appendChild(ctx.el('p', { class: 'letters', style: 'margin:0 0 4px', text: item.heading }));
    if (item.pages > 1) ctx.root.appendChild(ctx.el('p', { class: 'muted', style: 'margin:0 0 4px', 'data-read-along-page': '', text: ctx.fmt(L.read_along_page, { n: item.page, total: item.pages }) }));
    var sentCounter = item.lines.length > 1 ? ctx.el('p', { class: 'muted', style: 'margin:0 0 4px', 'data-read-along-sentence': '', text: ctx.fmt(L.read_along_sentence || 'Sentence {n} of {total}', { n: 1, total: item.lines.length }) }) : null;
    var progFill = item.lines.length > 1 ? ctx.el('span', { class: 'ra-progress-fill', style: 'width:' + Math.round(100 / item.lines.length) + '%' }) : null;
    var progBar = progFill ? ctx.el('div', { class: 'ra-progress', 'aria-hidden': 'true', 'data-read-along-progress': '' }, [progFill]) : null;
    var dock = ctx.el('div', { class: 'ra-dock' + (item.lines.length > 6 ? ' is-sticky' : ''), 'data-read-along-dock': '' });
    if (sentCounter) dock.appendChild(sentCounter);
    if (progBar) dock.appendChild(progBar);
    ctx.root.appendChild(dock);
    var resumeBar = null;
    var savedPlace = typeof ctx.place === 'function' ? Math.floor(Number(ctx.place()) || 0) : 0;
    if (savedPlace > 0 && savedPlace < item.lines.length) {
      var resumeGo = ctx.el('button', { type: 'button', class: 'primary', 'data-read-along-resume-go': '', text: ctx.fmt(L.read_along_resume_go || 'Continue from sentence {n}', { n: savedPlace + 1 }) });
      var resumeTop = ctx.el('button', { type: 'button', 'data-read-along-resume-top': '', text: L.read_along_resume_top || 'Start from sentence 1' });
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
      var re = /[A-Za-z\u00b7]+(?:['\u2019][A-Za-z\u00b7]+)*/g, m, list = [];
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
        var sre = /[A-Za-z\u00b7]+(?:['\u2019][A-Za-z\u00b7]+)*/g, sm;
        while ((sm = sre.exec(row.syl))) sylTokens.push(sm[0]);
      }
      n.textContent = '';
      var re = /[A-Za-z\u00b7]+(?:['\u2019][A-Za-z\u00b7]+)*/g, m, last = 0, wi = 0;
      var lineTokens = null, phraseAt = null;
      if (showDef && gloss) {
        lineTokens = [];
        var preRe = /[A-Za-z\u00b7]+(?:['\u2019][A-Za-z\u00b7]+)*/g, pm;
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
            attrs['data-pos-tag'] = tag === 'n' ? 'N' : tag === 'v' ? 'V' : tag === 'j' ? 'Adj' : 'Adv';
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
        var hearBtn = ctx.el('button', { type: 'button', 'data-sounds-hear': '', text: 'Hear word' });
        hearBtn.addEventListener('click', function () { devVoice.speak(plainWord); });
        headRow.push(hearBtn);
      }
      var closeS = ctx.el('button', { type: 'button', 'data-sounds-close': '', text: L.tools_close || 'Close' });
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
    var showDefinition = function (key) {
      if (!defCard || !gloss || !Object.prototype.hasOwnProperty.call(gloss, key)) return;
      var entry = gloss[key];
      defCard.textContent = '';
      var head = entry.w && entry.w !== key ? key + ' (' + entry.w + ')' : (entry.w || key);
      var textCol = ctx.el('div', { class: 'ra-def-body' }, [
        ctx.el('p', { class: 'ra-def-head', text: head + (entry.p ? ' - ' + entry.p : '') }),
        ctx.el('p', { style: 'margin:4px 0', text: entry.d }),
        entry.e ? ctx.el('p', { class: 'muted', style: 'margin:4px 0 0', text: '"' + entry.e + '"' }) : null,
      ]);
      var imgSrc = entry.img && typeof ctx.image === 'function' ? ctx.image(entry.img) : null;
      if (imgSrc) {
        defCard.appendChild(ctx.el('div', { class: 'ra-def-layout' }, [
          ctx.el('img', { class: 'ra-def-img', src: imgSrc, alt: entry.alt || entry.w || key, 'data-def-img': key }),
          textCol,
        ]));
      } else {
        defCard.appendChild(textCol);
      }
      Object.keys(defPickBtns).forEach(function (k) { defPickBtns[k].setAttribute('aria-pressed', String(k === key)); });
    };
    var paint = function () {
      if (posLegend) posLegend.hidden = !showPos;
      if (box) {
        if (showPos && showPosLabels) box.setAttribute('data-pos-tags', '1');
        else box.removeAttribute('data-pos-tags');
      }
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
    var scheduleChunkTimer = function () {
      if (chunkTimer && win.clearTimeout) { win.clearTimeout(chunkTimer); chunkTimer = 0; }
      if (!chunkMode || !chunkAutoOn || playing) return;
      chunkTimer = win.setTimeout(function () {
        chunkTimer = 0;
        if (!chunkMode || !chunkAutoOn || playing) return;
        if (from >= item.lines.length - 1) {
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
      paraNodes.forEach(function (p) { p.hidden = chunkMode; });
      if (chunkNav) chunkNav.hidden = !chunkMode;
      if (sentPrevBtn) sentPrevBtn.disabled = from <= 0;
      if (sentNextBtn) sentNextBtn.disabled = from >= item.lines.length - 1;
      if (!chunkMode) { chunkAutoOn = false; if (chunkAutoBtn) press(chunkAutoBtn, false); stopChunkTimers(); }
      else runTypewriter(from);
    };
    var mic = typeof ctx.studentMic === 'function' ? ctx.studentMic({
      getSentence: function () { return { index: from, total: item.lines.length, text: (item.lines[from] && item.lines[from].text) || '' }; },
    }) : null;
    var setActiveSentence = function (idx, savePlace) {
      var clamped = Math.max(0, Math.min(item.lines.length - 1, idx));
      from = clamped;
      if (sentCounter) sentCounter.textContent = ctx.fmt(L.read_along_sentence || 'Sentence {n} of {total}', { n: from + 1, total: item.lines.length });
      if (progFill) progFill.style.width = Math.round(((from + 1) / item.lines.length) * 100) + '%';
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
    var playButton = hasAudio ? ctx.el('button', { type: 'button', class: 'primary', 'data-read-along-play': '', text: L.read_along_play }) : null;
    var devReadButton = (!hasAudio && hasDevVoice) ? ctx.el('button', { type: 'button', class: 'primary', 'data-read-along-device-read': '', text: 'Read with device voice' }) : null;
    var restartButton = (hasAudio || hasDevVoice || item.lines.length > 1) ? ctx.el('button', { type: 'button', 'data-read-along-restart': '', text: L.read_along_restart || 'Restart' }) : null;
    var autoButton = ((hasAudio || hasDevVoice) && item.lines.length > 1) ? ctx.el('button', { type: 'button', 'data-read-along-auto': '', text: L.read_along_auto || 'Auto-advance' }) : null;
    var sylButton = hasSyl ? ctx.el('button', { type: 'button', 'data-read-along-syllables': '', text: L.read_along_syllables }) : null;
    var posButton = hasPos ? ctx.el('button', { type: 'button', 'data-read-along-pos': '', text: L.read_along_pos || 'Parts of speech' }) : null;
    var defButton = hasDef ? ctx.el('button', { type: 'button', 'data-read-along-define': '', text: L.read_along_define || 'Word meanings' }) : null;
    var boldButton = ctx.el('button', { type: 'button', 'data-read-along-bold': '', text: L.read_along_bold || 'Bold start' });
    var chunkButton = item.lines.length > 1 ? ctx.el('button', { type: 'button', 'data-read-along-chunk': '', text: L.read_along_chunk || 'One sentence' }) : null;
    var rsvpButton = ctx.el('button', { type: 'button', 'data-read-along-rsvp': '', text: L.read_along_rsvp || 'Focus mode' });
    var crawlButton = ctx.el('button', { type: 'button', 'data-read-along-crawl': '', text: L.read_along_crawl || 'Crawl' });
    if (autoButton) press(autoButton, autoAdv);
    if (sylButton) press(sylButton, showSyl);
    if (posButton) press(posButton, showPos);
    if (defButton) press(defButton, showDef);
    press(boldButton, showBold);
    if (chunkButton) press(chunkButton, chunkMode);
    var posFilterBtns = {};
    var posLabelsBtn = hasPos ? ctx.el('button', { type: 'button', class: 'ra-pos-pill', 'data-pos-labels': '', 'aria-pressed': String(showPosLabels), text: L.read_along_pos_labels || 'Show tags' }) : null;
    if (posLabelsBtn) {
      posLabelsBtn.addEventListener('click', function () {
        showPosLabels = !showPosLabels;
        posLabelsBtn.setAttribute('aria-pressed', String(showPosLabels));
        remember('posLabels', 'pos-labels', showPosLabels);
        paint();
      });
    }
    var posLegend = hasPos ? ctx.el('div', { class: 'ra-pos-legend', role: 'group', 'aria-label': L.read_along_pos || 'Parts of speech', 'data-read-along-pos-legend': '', hidden: !showPos }, [
      ['n', L.read_along_pos_n || 'Noun', 'posHideN', 'pos-hide-n'],
      ['v', L.read_along_pos_v || 'Verb', 'posHideV', 'pos-hide-v'],
      ['j', L.read_along_pos_j || 'Adjective', 'posHideJ', 'pos-hide-j'],
      ['a', L.read_along_pos_a || 'Adverb', 'posHideA', 'pos-hide-a'],
    ].map(function (entry) {
      var code = entry[0], label = entry[1], pref = entry[2], attr = entry[3];
      var btn = ctx.el('button', { type: 'button', class: 'ra-pos-pill ra-pos ra-pos-' + code, 'data-pos-filter': code, 'aria-pressed': String(posOn[code]), text: label });
      btn.addEventListener('click', function () {
        posOn[code] = !posOn[code];
        btn.setAttribute('aria-pressed', String(posOn[code]));
        remember(pref, attr, !posOn[code]);
        paint();
      });
      posFilterBtns[code] = btn;
      return btn;
    }).concat([posLabelsBtn])) : null;
    var setPlaying = function (on) {
      playing = on;
      if (playButton) playButton.textContent = on ? L.read_along_stop : L.read_along_play;
      if (devReadButton) devReadButton.textContent = on ? L.read_along_stop : 'Read with device voice';
    };
    var halt = function (keepPause) {
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
      if (mic && typeof mic.halt === 'function') mic.halt();
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
    var playLine = function (i, countSupport) {
      if (!hasAudio || i < 0 || i >= item.lines.length || !item.lines[i].audio) return false;
      if (resumeBar) resumeBar.hidden = true;
      pausedLine = -1; pausedTime = 0;
      var mine = ++run;
      setPlaying(false);
      setActiveSentence(i, true);
      playedAny = true;
      if (countSupport !== false) ctx.support('lineReplays');
      mark(i);
      ctx.play(item.lines[i].audio, 0, makeWordTracker(i, mine), 0).then(function () { if (mine === run) mark(-1); });
      return true;
    };
    var findAudio = function (start, stepDir) {
      for (var j = start; j >= 0 && j < item.lines.length; j += stepDir) {
        if (item.lines[j] && item.lines[j].audio) return j;
      }
      return -1;
    };
    // The page from line i to its end (or just line i if Auto-advance is off): resumes mid-sentence when paused.
    var readFrom = function (i) {
      if (!hasAudio) return;
      if (resumeBar) resumeBar.hidden = true;
      var mine = ++run;
      setPlaying(true);
      var step = function (at) {
        if (mine !== run) return;
        while (at < item.lines.length && !item.lines[at].audio) at++;
        if (at >= item.lines.length) { pausedLine = -1; pausedTime = 0; mark(-1); setPlaying(false); setActiveSentence(0, true); return; }
        var startSec = (at === pausedLine && pausedTime > 0.15) ? pausedTime : 0;
        pausedLine = -1; pausedTime = 0;
        setActiveSentence(at, true);
        playedAny = true;
        mark(at);
        ctx.play(item.lines[at].audio, 0, makeWordTracker(at, mine), startSec).then(function (ok) {
          if (mine !== run) return;
          if (ok === false) { mark(-1); setPlaying(false); return; }
          if (!autoAdv) { mark(-1); setPlaying(false); return; }
          step(at + 1);
        });
      };
      step(i);
    };
    if (playButton) playButton.addEventListener('click', function () {
      if (playing) { halt(true); return; }
      ctx.support('readThroughs');
      readFrom(from);
    });
    var readDeviceFrom = function (i) {
      if (!hasDevVoice) return;
      if (resumeBar) resumeBar.hidden = true;
      var mine = ++run;
      devReading = true;
      setPlaying(true);
      var step = function (at) {
        if (mine !== run || !devReading) return;
        if (at >= item.lines.length) { devReading = false; mark(-1); setPlaying(false); setActiveSentence(0, true); return; }
        setActiveSentence(at, true);
        playedAny = true;
        mark(at);
        devVoice.speak(item.lines[at].text, function (ok) {
          if (mine !== run || !devReading) return;
          if (!ok || !autoAdv) { devReading = false; mark(-1); setPlaying(false); return; }
          step(at + 1);
        });
      };
      step(i);
    };
    if (devReadButton) devReadButton.addEventListener('click', function () {
      if (playing) { halt(false); return; }
      ctx.support('readThroughs');
      readDeviceFrom(from);
    });
    if (restartButton) restartButton.addEventListener('click', function () {
      halt();
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
        var b = ctx.el('button', { type: 'button', 'data-tap-mode': tc[0], text: tc[1] });
        press(b, tc[0] === tapMode);
        b.addEventListener('click', function () { setTapMode(tc[0]); });
        tapBtns[tc[0]] = b;
        tapNodes.push(b);
      });
      extraStudy.push(ctx.el('div', { class: 'ra-tap-bar', role: 'group', 'aria-label': 'Tap a word mode', 'data-read-along-tap-bar': '' }, tapNodes));
    }
    if (item.simpleBar) {
      var extraWrap = ctx.el('div', { class: 'ra-extra-tools', 'data-read-along-extra-tools': '', hidden: true }, extraStudy);
      var moreBtn = ctx.el('button', { type: 'button', 'data-read-along-more-tools': '', 'aria-expanded': 'false', text: 'More tools' });
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
        node = ctx.el('button', { type: 'button', 'data-read-along-line': String(i + 1), text: row.text,
          style: (isHeading ? headingStyle : 'display:inline;') + 'font:inherit;color:inherit;background:none;border:0;border-radius:6px;padding:6px 6px;margin:' + (isHeading ? (i > 0 ? '.65em 0 .25em' : '0 0 .25em') : '0') + ';min-height:0;min-width:36px;text-align:start;cursor:pointer;-webkit-box-decoration-break:clone;box-decoration-break:clone' + (isHeading ? ';font-weight:800;font-size:' + (row.heading === 1 ? '1.25em' : '1.12em') + ';line-height:1.35' : '') });
        if (isHeading) node.setAttribute('data-heading', String(row.heading));
        if (!row.audio) {
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
      if (!isHeading) box.appendChild(doc.createTextNode(' '));
    });
    ctx.root.appendChild(box);
    if (hasSyl) {
      soundsCard = ctx.el('div', { class: 'ra-sounds-card', 'aria-live': 'polite', 'data-read-along-sounds-card': '', hidden: true });
      ctx.root.appendChild(soundsCard);
    }
    if (hasDef) {
      defCard = ctx.el('div', { class: 'ra-def-card', 'aria-live': 'polite', 'data-read-along-def-card': '' }, [
        ctx.el('p', { class: 'muted', style: 'margin:0', text: L.read_along_define_hint || 'Tap an underlined word in the passage, or choose one below, to see its meaning.' }),
      ]);
      var chips = glossKeys.map(function (k) {
        var b = ctx.el('button', { type: 'button', class: 'ra-def-pick', 'data-def-pick': k, 'aria-pressed': 'false', text: k });
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
    if (item.lines.length > 1) {
      sentPrevBtn = ctx.el('button', { type: 'button', 'data-read-along-sent-prev': '', text: L.read_along_sent_prev || 'Previous sentence' });
      sentNextBtn = ctx.el('button', { type: 'button', 'data-read-along-sent-next': '', text: L.read_along_sent_next || 'Next sentence' });
      chunkAutoBtn = ctx.el('button', { type: 'button', 'data-chunk-auto-timer': '', text: 'Auto pace' });
      press(chunkAutoBtn, false);
      var chunkPaceOut = ctx.el('span', { class: 'muted', 'data-chunk-pace-out': '', text: '3.5s' });
      var chunkPaceIn = ctx.el('input', { type: 'range', min: '1000', max: '8000', step: '500', value: String(chunkPaceMs), 'aria-label': 'Seconds per sentence', 'data-chunk-pace': '' });
      var chunkMoodSel = ctx.el('select', { 'aria-label': 'Sentence style', 'data-chunk-mood': '' }, [
        ctx.el('option', { value: 'highlight', text: 'Sweep' }),
        ctx.el('option', { value: 'typewriter', text: 'Typewriter' }),
        ctx.el('option', { value: 'popin', text: 'Pop-In' }),
        ctx.el('option', { value: 'pulse', text: 'Pulse' }),
      ]);
      sentPrevBtn.addEventListener('click', function () { halt(); setActiveSentence(from - 1, true); });
      sentNextBtn.addEventListener('click', function () { halt(); setActiveSentence(from + 1, true); });
      chunkAutoBtn.addEventListener('click', function () {
        chunkAutoOn = !chunkAutoOn;
        press(chunkAutoBtn, chunkAutoOn);
        if (chunkAutoOn) scheduleChunkTimer(); else stopChunkTimers();
      });
      chunkPaceIn.addEventListener('input', function () {
        chunkPaceMs = Math.max(1000, Math.min(8000, Number(chunkPaceIn.value) || 3500));
        chunkPaceOut.textContent = (chunkPaceMs / 1000).toFixed(1) + 's';
        if (chunkAutoOn) scheduleChunkTimer();
      });
      chunkMoodSel.addEventListener('change', function () {
        chunkMood = chunkMoodSel.value || 'highlight';
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
    applyChunkView();
    if (mic && mic.el) {
      if (typeof mic.setSentence === 'function') mic.setSentence(from, item.lines.length);
      ctx.root.appendChild(mic.el);
    }
    var navButtons = [];
    if (item.page > 1 && typeof ctx.goPrev === 'function') {
      var prev = ctx.el('button', { type: 'button', 'data-read-along-prev': '', text: L.read_along_prev });
      prev.addEventListener('click', function () { halt(); ctx.goPrev(); });
      navButtons.push(prev);
    }
    var doneLabel = item.page >= item.pages ? (L.read_along_finish || L.finish || L.read_along_done) : (L.read_along_next || L.read_along_done);
    var done = ctx.el('button', { type: 'button', 'data-read-along-done': '', text: doneLabel });
    done.addEventListener('click', function () {
      halt();
      if (!ctx.isDone()) ctx.practice('read', L.read_along_done_said, { advance: true });
      else if (typeof ctx.goNext === 'function') ctx.goNext();
    });
    navButtons.push(done);
    ctx.root.appendChild(ctx.el('div', { class: 'row' }, navButtons));
    ctx.root.appendChild(ctx.el('details', { class: 'ra-keys-hint', 'data-read-along-keys-hint': '' }, [
      ctx.el('summary', { text: 'Keyboard shortcuts' }),
      ctx.el('p', { text: 'Space: play or pause. Left / Right arrows: previous or next sentence. Home / End: first or last sentence. R: replay sentence.' }),
    ]));
    // Focus Mode (RSVP / 1-6 word bold-assist) & Cinematic Crawl overlays (100% offline, zero AI, reduced-motion safe).
    var activeOverlay = null;
    closeOverlays = function () {
      if (activeOverlay && typeof activeOverlay.close === 'function') activeOverlay.close(false);
    };
    var openRsvp = function () {
      halt(false);
      var allWords = [];
      item.lines.forEach(function (row) {
        String(row.text || '').split(/\s+/).filter(Boolean).forEach(function (w) { allWords.push(w); });
      });
      if (!allWords.length) return;
      var wpm = 250, chunkSize = 1, chunkIdx = 0, rsvpPlaying = false, punctPauses = true, timer = 0, countdown = 0, rsvpTheme = 'warm', focusColor = '#dc2626';
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
      var closeBtn = ctx.el('button', { type: 'button', 'data-rsvp-close': '', text: L.tools_close || 'Close' });
      var playBtn = ctx.el('button', { type: 'button', class: 'primary', 'data-rsvp-play': '', text: 'Play' });
      var prevBtn = ctx.el('button', { type: 'button', 'data-rsvp-prev': '', text: 'Previous' });
      var nextBtn = ctx.el('button', { type: 'button', 'data-rsvp-next': '', text: 'Next' });
      var resetBtn = ctx.el('button', { type: 'button', 'data-rsvp-restart': '', text: L.read_along_restart || 'Restart' });
      var punctBtn = ctx.el('button', { type: 'button', 'data-rsvp-punct': '', 'aria-pressed': 'true', text: 'Pause at punctuation' });
      var wpmInput = ctx.el('input', { type: 'range', min: '100', max: '900', step: '25', value: String(wpm), 'aria-label': 'Words per minute', 'data-rsvp-wpm': '' });
      var wpmOut = ctx.el('span', { class: 'muted', 'data-rsvp-wpm-out': '', text: wpm + ' wpm' });
      var sizeInput = ctx.el('input', { type: 'range', min: '1', max: '6', step: '1', value: String(chunkSize), 'aria-label': 'Words per chunk', 'data-rsvp-chunk-size': '' });
      var sizeOut = ctx.el('span', { class: 'muted', 'data-rsvp-size-out': '', text: '1 word' });
      var themeSel = ctx.el('select', { 'aria-label': 'Focus mode theme', 'data-rsvp-theme': '' }, [
        ctx.el('option', { value: 'warm', text: 'Warm' }),
        ctx.el('option', { value: 'dark', text: 'Dark' }),
        ctx.el('option', { value: 'sepia', text: 'Sepia' }),
      ]);
      var swatchBtns = [];
      var swatchWrap = ctx.el('div', { class: 'ra-rsvp-swatches', role: 'group', 'aria-label': 'Center letter color', 'data-rsvp-colors': '' }, colorOpts.map(function (co) {
        var b = ctx.el('button', { type: 'button', class: 'ra-rsvp-swatch', 'data-rsvp-color': co[1], 'aria-label': 'Focus color ' + co[0], 'aria-pressed': String(co[1] === focusColor), style: 'background:' + co[1] });
        b.addEventListener('click', function () {
          focusColor = co[1];
          swatchBtns.forEach(function (sb) { sb.setAttribute('aria-pressed', String(sb.getAttribute('data-rsvp-color') === focusColor)); });
          drawStage();
        });
        swatchBtns.push(b);
        return b;
      }));
      var countOut = ctx.el('span', { class: 'muted', 'data-rsvp-count': '', text: '1 / ' + chunks.length });
      var stage = ctx.el('div', { class: 'ra-rsvp-stage', 'data-rsvp-stage': '', 'aria-live': 'off' });
      var dialog = ctx.el('div', { class: 'ra-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': L.read_along_rsvp || 'Focus mode', 'data-rsvp-dialog': '' }, [
        ctx.el('div', { class: 'ra-ov-head' }, [
          ctx.el('strong', { text: L.read_along_rsvp || 'Focus mode' }),
          countOut,
          closeBtn,
        ]),
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
      var applyRsvpTheme = function () {
        var th = rsvpThemes[rsvpTheme] || rsvpThemes.warm;
        dialog.style.background = th.bg;
        dialog.style.color = th.ink;
        stage.style.background = th.card;
        stage.style.color = th.ink;
      };
      var clearT = function () { if (timer && win.clearTimeout) { win.clearTimeout(timer); timer = 0; } };
      var delayFor = function (idx) {
        var ch = chunks[idx] || [];
        var base = (60000 / Math.max(100, wpm)) * Math.max(1, ch.length);
        if (!punctPauses || !ch.length) return Math.max(60, base);
        var tail = ch[ch.length - 1].replace(/["'\u201d\u2019)\]]*$/, '').slice(-1);
        var mult = /[.!?]/.test(tail) ? 2.0 : /[,;:]/.test(tail) ? 1.4 : 1;
        return Math.max(60, Math.round(base * mult));
      };
      var drawStage = function () {
        chunks = chunksOf();
        chunkIdx = Math.max(0, Math.min(chunks.length - 1, chunkIdx));
        countOut.textContent = (chunkIdx + 1) + ' / ' + chunks.length;
        wpmOut.textContent = wpm + ' wpm';
        sizeOut.textContent = chunkSize === 1 ? '1 word' : chunkSize + ' words';
        swatchWrap.hidden = chunkSize !== 1;
        prevBtn.disabled = chunkIdx <= 0;
        nextBtn.disabled = chunkIdx >= chunks.length - 1;
        playBtn.textContent = rsvpPlaying ? 'Pause' : 'Play';
        stage.textContent = '';
        if (countdown > 0) {
          stage.appendChild(ctx.el('span', { class: 'ra-rsvp-countdown', 'data-rsvp-countdown': String(countdown), text: String(countdown) }));
          return;
        }
        var ch = chunks[chunkIdx] || [];
        if (chunkSize === 1) {
          var word = ch[0] || '', mid = Math.floor(word.length / 2);
          stage.appendChild(doc.createTextNode(word.slice(0, mid)));
          stage.appendChild(ctx.el('span', { class: 'ra-rsvp-orp', style: 'color:' + focusColor, text: word.charAt(mid) }));
          stage.appendChild(doc.createTextNode(word.slice(mid + 1)));
        } else {
          ch.forEach(function (w, wi) {
            var cut = Math.max(1, Math.ceil(w.length * 0.4));
            stage.appendChild(ctx.el('strong', { class: 'ra-bionic', text: w.slice(0, cut) }));
            if (cut < w.length) stage.appendChild(doc.createTextNode(w.slice(cut)));
            if (wi < ch.length - 1) stage.appendChild(doc.createTextNode(' '));
          });
        }
      };
      var tick = function () {
        clearT();
        if (!rsvpPlaying) return;
        if (countdown > 0) {
          timer = win.setTimeout(function () {
            if (!rsvpPlaying) return;
            countdown--;
            drawStage();
            tick();
          }, 500);
          return;
        }
        timer = win.setTimeout(function () {
          if (!rsvpPlaying) return;
          if (chunkIdx >= chunks.length - 1) { rsvpPlaying = false; drawStage(); return; }
          chunkIdx++;
          drawStage();
          tick();
        }, delayFor(chunkIdx));
      };
      var toggle = function () {
        if (rsvpPlaying) { rsvpPlaying = false; countdown = 0; clearT(); drawStage(); return; }
        var freshStart = chunkIdx === 0 || chunkIdx >= chunks.length - 1;
        if (chunkIdx >= chunks.length - 1) chunkIdx = 0;
        countdown = (freshStart && !reducedMotion()) ? 3 : 0;
        rsvpPlaying = true;
        drawStage();
        tick();
      };
      var onKey = function (e) {
        if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); close(true); return; }
        if (e.target && /^(INPUT|SELECT)$/.test(e.target.tagName)) return;
        if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); toggle(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); rsvpPlaying = false; countdown = 0; clearT(); chunkIdx++; drawStage(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); rsvpPlaying = false; countdown = 0; clearT(); chunkIdx--; drawStage(); }
        else if (e.key === '+' || e.key === '=') { wpm = Math.min(900, wpm + 25); wpmInput.value = String(wpm); drawStage(); }
        else if (e.key === '-' || e.key === '_') { wpm = Math.max(100, wpm - 25); wpmInput.value = String(wpm); drawStage(); }
        else if (e.key === '[') { chunkSize = Math.max(1, chunkSize - 1); sizeInput.value = String(chunkSize); drawStage(); }
        else if (e.key === ']') { chunkSize = Math.min(6, chunkSize + 1); sizeInput.value = String(chunkSize); drawStage(); }
        else if (e.key === 'p' || e.key === 'P') { punctPauses = !punctPauses; punctBtn.setAttribute('aria-pressed', String(punctPauses)); }
      };
      var close = function (restoreFocus) {
        rsvpPlaying = false;
        countdown = 0;
        clearT();
        doc.removeEventListener('keydown', onKey, true);
        if (dialog.parentNode) dialog.parentNode.removeChild(dialog);
        if (activeOverlay && activeOverlay.dialog === dialog) activeOverlay = null;
        if (restoreFocus && rsvpButton) rsvpButton.focus();
      };
      playBtn.addEventListener('click', toggle);
      prevBtn.addEventListener('click', function () { rsvpPlaying = false; countdown = 0; clearT(); chunkIdx--; drawStage(); });
      nextBtn.addEventListener('click', function () { rsvpPlaying = false; countdown = 0; clearT(); chunkIdx++; drawStage(); });
      resetBtn.addEventListener('click', function () { rsvpPlaying = false; countdown = 0; clearT(); chunkIdx = 0; drawStage(); });
      punctBtn.addEventListener('click', function () { punctPauses = !punctPauses; punctBtn.setAttribute('aria-pressed', String(punctPauses)); });
      themeSel.addEventListener('change', function () { rsvpTheme = themeSel.value || 'warm'; applyRsvpTheme(); });
      wpmInput.addEventListener('input', function () { wpm = Math.max(100, Math.min(900, Number(wpmInput.value) || 250)); drawStage(); });
      sizeInput.addEventListener('input', function () {
        var prevSize = chunkSize, wordPos = chunkIdx * prevSize;
        chunkSize = Math.max(1, Math.min(6, Number(sizeInput.value) || 1));
        chunkIdx = Math.floor(wordPos / chunkSize);
        drawStage();
      });
      closeBtn.addEventListener('click', function () { close(true); });
      applyRsvpTheme();
      activeOverlay = { dialog: dialog, close: close };
      doc.body.appendChild(dialog);
      doc.addEventListener('keydown', onKey, true);
      drawStage();
      use('focusMode');
      playBtn.focus();
    };
    var openCrawl = function () {
      halt(false);
      var paras = [], cur = [];
      item.lines.forEach(function (row, idx) {
        if ((row.para || row.heading) && cur.length) { paras.push(cur.join(' ')); cur = []; }
        cur.push(row.text);
        if (row.heading) { paras.push(cur.join(' ')); cur = []; }
        if (idx === item.lines.length - 1 && cur.length) paras.push(cur.join(' '));
      });
      var speed = 60, y = 0, crawlPlaying = !reducedMotion(), raf = 0, lastTs = 0, palette = 'gold', ambientOn = false, padCtx = null, padNodes = null;
      var palettes = {
        gold: { bg: '#000000', ink: '#fde047' },
        aqua: { bg: '#061629', ink: '#67e8f9' },
        paper: { bg: '#111827', ink: '#f9fafb' },
      };
      var closeBtn = ctx.el('button', { type: 'button', 'data-crawl-close': '', text: L.tools_close || 'Close' });
      var playBtn = ctx.el('button', { type: 'button', class: 'primary', 'data-crawl-play': '', text: crawlPlaying ? 'Pause' : 'Play' });
      var resetBtn = ctx.el('button', { type: 'button', 'data-crawl-restart': '', text: L.read_along_restart || 'Restart' });
      var ambientBtn = ctx.el('button', { type: 'button', 'data-crawl-ambient': '', 'aria-pressed': 'false', text: 'Ambient sound' });
      var speedInput = ctx.el('input', { type: 'range', min: '10', max: '140', step: '5', value: String(speed), 'aria-label': 'Crawl speed', 'data-crawl-speed': '' });
      var speedOut = ctx.el('span', { 'data-crawl-speed-out': '', text: speed + ' px/s' });
      var themeSel = ctx.el('select', { 'aria-label': 'Crawl colors', 'data-crawl-theme': '' }, [
        ctx.el('option', { value: 'gold', text: 'Golden' }),
        ctx.el('option', { value: 'aqua', text: 'Aqua' }),
        ctx.el('option', { value: 'paper', text: 'Paper' }),
      ]);
      var replayEndBtn = ctx.el('button', { type: 'button', class: 'primary', 'data-crawl-replay': '', text: 'Replay' });
      var endCard = ctx.el('div', { class: 'ra-crawl-end', 'data-crawl-end': '', hidden: true }, [
        ctx.el('h3', { text: 'THE END' }),
        replayEndBtn,
      ]);
      var textWrap = ctx.el('div', { class: 'ra-crawl-text', 'data-crawl-text': '' }, paras.map(function (p) { return ctx.el('p', { text: p }); }));
      var viewport = ctx.el('div', { class: 'ra-crawl-view' + (reducedMotion() ? ' is-flat' : ''), 'data-crawl-view': '' }, [textWrap, endCard]);
      var dialog = ctx.el('div', { class: 'ra-overlay ra-crawl-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': L.read_along_crawl || 'Crawl', 'data-crawl-dialog': '' }, [
        ctx.el('div', { class: 'ra-ov-head' }, [
          ctx.el('strong', { text: L.read_along_crawl || 'Crawl' }),
          closeBtn,
        ]),
        ctx.el('div', { class: 'ra-ov-controls' }, [
          ctx.el('label', { class: 'ra-ov-range' }, ['Speed ', speedInput, speedOut]),
          ctx.el('label', { class: 'ra-ov-range' }, ['Colors ', themeSel]),
          ambientBtn,
          playBtn,
          resetBtn,
        ]),
        viewport,
      ]);
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
      var stepFrame = function (ts) {
        if (!crawlPlaying) return;
        var now = typeof ts === 'number' ? ts : Date.now();
        if (!lastTs) lastTs = now;
        var dt = Math.min(100, Math.max(0, now - lastTs)) / 1000;
        lastTs = now;
        y -= dt * speed;
        textWrap.style.transform = 'translateY(' + Math.round(y) + 'px)';
        var limit = (viewport.clientHeight || 400) + (textWrap.clientHeight || 400);
        if (y < -limit) { crawlPlaying = false; playBtn.textContent = 'Play'; endCard.hidden = false; stopFrame(); syncAmbient(); return; }
        raf = win.requestAnimationFrame ? win.requestAnimationFrame(stepFrame) : win.setTimeout(function () { stepFrame(Date.now()); }, 32);
      };
      var setCrawlPlay = function (on) {
        if (on && !endCard.hidden) { y = 0; textWrap.style.transform = 'translateY(0px)'; endCard.hidden = true; }
        crawlPlaying = !!on;
        playBtn.textContent = crawlPlaying ? 'Pause' : 'Play';
        stopFrame();
        syncAmbient();
        if (crawlPlaying) raf = win.requestAnimationFrame ? win.requestAnimationFrame(stepFrame) : win.setTimeout(function () { stepFrame(Date.now()); }, 32);
      };
      var restartCrawl = function () { endCard.hidden = true; y = 0; textWrap.style.transform = 'translateY(0px)'; setCrawlPlay(true); };
      var toggleAmbient = function () { ambientOn = !ambientOn; ambientBtn.setAttribute('aria-pressed', String(ambientOn)); syncAmbient(); };
      var onKey = function (e) {
        if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); close(true); return; }
        if (e.target && /^(INPUT|SELECT)$/.test(e.target.tagName)) return;
        if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); setCrawlPlay(!crawlPlaying); }
        else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); restartCrawl(); }
        else if (e.key === 'm' || e.key === 'M') { e.preventDefault(); toggleAmbient(); }
      };
      var close = function (restoreFocus) {
        crawlPlaying = false;
        stopFrame();
        tearAmbient();
        doc.removeEventListener('keydown', onKey, true);
        if (dialog.parentNode) dialog.parentNode.removeChild(dialog);
        if (activeOverlay && activeOverlay.dialog === dialog) activeOverlay = null;
        if (restoreFocus && crawlButton) crawlButton.focus();
      };
      playBtn.addEventListener('click', function () { setCrawlPlay(!crawlPlaying); });
      viewport.addEventListener('click', function (ev) { if (ev && ev.target === replayEndBtn) return; setCrawlPlay(!crawlPlaying); });
      replayEndBtn.addEventListener('click', function (ev) { ev.stopPropagation(); restartCrawl(); });
      resetBtn.addEventListener('click', restartCrawl);
      ambientBtn.addEventListener('click', toggleAmbient);
      speedInput.addEventListener('input', function () { speed = Math.max(10, Math.min(140, Number(speedInput.value) || 60)); speedOut.textContent = speed + ' px/s'; });
      themeSel.addEventListener('change', function () { palette = themeSel.value; applyPalette(); });
      closeBtn.addEventListener('click', function () { close(true); });
      applyPalette();
      activeOverlay = { dialog: dialog, close: close };
      doc.body.appendChild(dialog);
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
        if (hasAudio && (key === ' ' || key === 'Spacebar') && !onBtn) {
          if (playing) halt(true);
          else { ctx.support('readThroughs'); readFrom(from); }
          return true;
        }
        if (key === 'Home' && item.lines.length > 1) {
          halt(false);
          setActiveSentence(0, true);
          return true;
        }
        if (key === 'End' && item.lines.length > 1) {
          halt(false);
          setActiveSentence(item.lines.length - 1, true);
          return true;
        }
        if (key === 'ArrowRight') {
          if (chunkMode || !hasAudio) {
            if (from < item.lines.length - 1) { halt(false); setActiveSentence(from + 1, true); return true; }
          } else {
            var nextIdx = playedAny ? findAudio(from + 1, 1) : findAudio(0, 1);
            if (nextIdx >= 0) { playLine(nextIdx, true); return true; }
          }
        }
        if (key === 'ArrowLeft') {
          if (chunkMode || !hasAudio) {
            if (from > 0) { halt(false); setActiveSentence(from - 1, true); return true; }
          } else {
            var prevIdx = playedAny ? findAudio(from - 1, -1) : findAudio(item.lines.length - 1, -1);
            if (prevIdx >= 0) { playLine(prevIdx, true); return true; }
          }
        }
        return false;
      });
    }
    var handle = { allowRevisit: true, reveal: function () { halt(false); } };
    if (hasAudio) {
      handle.replay = function () {
        var target = (item.lines[from] && item.lines[from].audio) ? from : findAudio(0, 1);
        if (target >= 0) playLine(target, false);
      };
    }
    return handle;
  },
  // Listening practice: no answer is right or wrong, so nothing is ever scored.
  score: function () { return { correct: false, digitsCorrect: null, digitsPossible: null }; },
};
