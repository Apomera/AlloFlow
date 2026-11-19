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
    read_along_play: 'Read to me',
    read_along_stop: 'Stop',
    read_along_slower: 'Slower',
    read_along_syllables: 'Syllables',
    read_along_done: 'I have read this page',
    read_along_next: 'Next page',
    read_along_finish: 'Finish',
    read_along_prev: 'Previous page',
    read_along_done_said: 'Good reading.',
  },
  // p: { lines: [{ text, audio: clip id or '', syl: the text with a dot at each syllable break, para: true when a new paragraph starts here }], heading, page, pages, lang }
  // A clip id names a recording in lesson.audio. A line with no clip is shown and skipped by "Read to me".
  prepare: function (p) {
    p = p || {};
    var line = function (v, max) { return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : ''; };
    var clip = function (v) { return typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : ''; };
    if (!Array.isArray(p.lines) || !p.lines.length || p.lines.length > 60) return { missing: ['lines'] };
    var DOT = String.fromCharCode(183);
    var lines = p.lines.map(function (row) {
      var out = { text: line(row && row.text, 600), audio: clip(row && row.audio) }, syl = line(row && row.syl, 900);
      // Kept only when it is the text itself with dots added: the words a student reads are never changed.
      if (syl && syl !== out.text && syl.split(DOT).join('') === out.text) out.syl = syl;
      if (row && row.para === true) out.para = true;
      return out;
    });
    if (lines.some(function (row) { return !row.text; })) return { missing: ['text for every line'] };
    var lang = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/.test(String(p.lang || '')) ? String(p.lang) : 'en';
    var page = Math.floor(Number(p.page)) || 1, pages = Math.floor(Number(p.pages)) || 1;
    var item = { lines: lines, lang: lang, page: Math.max(1, page), pages: Math.max(1, pages), word: lines[0].text.slice(0, 60), target: 'read' };
    if (line(p.heading, 120)) item.heading = line(p.heading, 120);
    return { item: item };
  },
  render: function (item, ctx) {
    var L = ctx.L, nodes = [], run = 0, playing = false, from = 0, counted = {};
    // Persist Syllables in state.tools via ctx.toolPref (survives reloads & packets-open.html), with html attribute fallback.
    // Reading speed is handled uniformly by Reading tools (Voice speed: Normal / Slower).
    var top = ctx.root.ownerDocument.documentElement;
    var readPref = function (prefKey, attr) {
      if (typeof ctx.toolPref === 'function') {
        var v = ctx.toolPref(prefKey);
        if (v === 0 || v === 1) return v === 1;
      }
      return top.getAttribute('data-read-along-' + attr) === '1';
    };
    var remember = function (prefKey, attr, on) {
      if (typeof ctx.toolPref === 'function') ctx.toolPref(prefKey, on ? 1 : 0);
      if (on) top.setAttribute('data-read-along-' + attr, '1'); else top.removeAttribute('data-read-along-' + attr);
    };
    var hasAudio = item.lines.some(function (row) { return !!row.audio; });
    var hasSyl = item.lines.some(function (row) { return !!row.syl; }), showSyl = hasSyl && readPref('syllables', 'syl');
    var use = function (name) { if (!counted[name]) { counted[name] = true; ctx.support(name); } };
    var press = function (button, on) { button.setAttribute('aria-pressed', String(on)); button.style.background = on ? 'var(--accent)' : ''; button.style.color = on ? 'var(--accent-ink)' : ''; };
    if (item.heading) ctx.root.appendChild(ctx.el('p', { class: 'letters', style: 'margin:0 0 4px', text: item.heading }));
    if (item.pages > 1) ctx.root.appendChild(ctx.el('p', { class: 'muted', style: 'margin:0 0 8px', 'data-read-along-page': '', text: ctx.fmt(L.read_along_page, { n: item.page, total: item.pages }) }));
    var mark = function (index) {
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
    var sylButton = hasSyl ? ctx.el('button', { type: 'button', 'data-read-along-syllables': '', text: L.read_along_syllables }) : null;
    if (sylButton) press(sylButton, showSyl);
    // The words as they are, or in syllables. A screen reader is given the plain words either way.
    var paint = function () {
      nodes.forEach(function (n, i) {
        var row = item.lines[i];
        if (showSyl && row.syl) { n.textContent = row.syl; n.setAttribute('aria-label', row.text); }
        else { n.textContent = row.text; n.removeAttribute('aria-label'); }
      });
    };
    var setPlaying = function (on) { playing = on; if (playButton) playButton.textContent = on ? L.read_along_stop : L.read_along_play; };
    var halt = function () { run++; ctx.stop(); mark(-1); setPlaying(false); };
    var playedAny = false;
    var playLine = function (i, countSupport) {
      if (!hasAudio || i < 0 || i >= item.lines.length || !item.lines[i].audio) return false;
      var mine = ++run;
      setPlaying(false);
      from = i;
      playedAny = true;
      if (countSupport !== false) ctx.support('lineReplays');
      mark(i);
      ctx.play(item.lines[i].audio).then(function () { if (mine === run) mark(-1); });
      return true;
    };
    var findAudio = function (start, stepDir) {
      for (var j = start; j >= 0 && j < item.lines.length; j += stepDir) {
        if (item.lines[j] && item.lines[j].audio) return j;
      }
      return -1;
    };
    // The page from line i to its end: each line marked while its recording plays. Stop keeps `from = at` so Read to me resumes where it paused.
    var readFrom = function (i) {
      if (!hasAudio) return;
      var mine = ++run;
      setPlaying(true);
      var step = function (at) {
        if (mine !== run) return;
        while (at < item.lines.length && !item.lines[at].audio) at++;
        if (at >= item.lines.length) { mark(-1); setPlaying(false); from = 0; return; }
        from = at;
        playedAny = true;
        mark(at);
        ctx.play(item.lines[at].audio).then(function (ok) { if (mine !== run) return; if (ok === false) { mark(-1); setPlaying(false); return; } step(at + 1); });
      };
      step(i);
    };
    if (playButton) playButton.addEventListener('click', function () {
      if (playing) { halt(); return; }
      ctx.support('readThroughs');
      readFrom(from);
    });
    if (sylButton) sylButton.addEventListener('click', function () { showSyl = !showSyl; remember('syllables', 'syl', showSyl); press(sylButton, showSyl); if (showSyl) use('syllables'); paint(); });
    var topControls = [];
    if (playButton) topControls.push(playButton);
    if (sylButton) topControls.push(sylButton);
    if (topControls.length) ctx.root.appendChild(ctx.el('div', { class: 'row', style: 'margin:8px 0' }, topControls));
    // data-read: running text, where the shell's reading focus can go.
    var box = ctx.el('div', { role: 'group', 'aria-label': L.read_along_text, lang: item.lang, 'data-read': '', 'data-read-along-text': '',
      style: 'font-size:1.5rem;line-height:1.9;border:1px solid var(--line);border-radius:14px;padding:12px 16px;margin:12px 0;overflow-wrap:anywhere' });
    item.lines.forEach(function (row, i) {
      if (row.para && i > 0) box.appendChild(ctx.el('span', { style: 'display:block;height:.7em', 'aria-hidden': 'true' }));
      var node;
      if (hasAudio) {
        // A sentence is a button that looks like text: pressing it reads that sentence, and "Read to me" then goes on from it.
        node = ctx.el('button', { type: 'button', 'data-read-along-line': String(i + 1), text: row.text,
          style: 'display:inline;font:inherit;color:inherit;background:none;border:0;border-radius:6px;padding:6px 6px;margin:0;min-height:0;min-width:36px;text-align:start;cursor:pointer;-webkit-box-decoration-break:clone;box-decoration-break:clone' });
        if (!row.audio) {
          node.setAttribute('aria-disabled', 'true');
          node.style.cursor = 'default';
          node.style.opacity = '0.72';
        }
        node.addEventListener('click', function () { playLine(i, true); });
      } else {
        // Silent / syllable-only mode: plain reading text with no inert clickable button role.
        node = ctx.el('span', { 'data-read-along-line': String(i + 1), text: row.text,
          style: 'display:inline;padding:2px 2px' });
      }
      nodes.push(node);
      box.appendChild(node);
      box.appendChild(ctx.root.ownerDocument.createTextNode(' '));
    });
    ctx.root.appendChild(box);
    if (showSyl) { paint(); use('syllables'); }
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
    if (hasAudio && typeof ctx.keys === 'function') {
      ctx.keys(function (key) {
        var active = ctx.root.ownerDocument.activeElement;
        var onBtn = !!(active && active.tagName === 'BUTTON');
        if ((key === ' ' || key === 'Spacebar') && !onBtn) {
          if (playing) halt();
          else { ctx.support('readThroughs'); readFrom(from); }
          return true;
        }
        if (key === 'ArrowRight') {
          var nextIdx = playedAny ? findAudio(from + 1, 1) : findAudio(0, 1);
          if (nextIdx >= 0) { playLine(nextIdx, true); return true; }
        }
        if (key === 'ArrowLeft') {
          var prevIdx = playedAny ? findAudio(from - 1, -1) : findAudio(item.lines.length - 1, -1);
          if (prevIdx >= 0) { playLine(prevIdx, true); return true; }
        }
        return false;
      });
    }
    var handle = { allowRevisit: true, reveal: function () { halt(); } };
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
