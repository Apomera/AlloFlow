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
    if (!lines.some(function (row) { return row.audio; })) return { missing: ['a recording'] };
    var lang = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/.test(String(p.lang || '')) ? String(p.lang) : 'en';
    var page = Math.floor(Number(p.page)) || 1, pages = Math.floor(Number(p.pages)) || 1;
    var item = { lines: lines, lang: lang, page: Math.max(1, page), pages: Math.max(1, pages), word: lines[0].text.slice(0, 60), target: 'read' };
    if (line(p.heading, 120)) item.heading = line(p.heading, 120);
    return { item: item };
  },
  render: function (item, ctx) {
    var L = ctx.L, nodes = [], run = 0, playing = false, from = 0, counted = {};
    // What the student chose on an earlier page (this file, until it is closed): two marks on the page's top element.
    var top = ctx.root.ownerDocument.documentElement, keep = { slow: top.getAttribute('data-read-along-slow') === '1', syl: top.getAttribute('data-read-along-syl') === '1' };
    var remember = function (name, on) { if (on) top.setAttribute('data-read-along-' + name, '1'); else top.removeAttribute('data-read-along-' + name); };
    var slow = !!keep.slow, hasSyl = item.lines.some(function (row) { return !!row.syl; }), showSyl = hasSyl && !!keep.syl;
    var use = function (name) { if (!counted[name]) { counted[name] = true; ctx.support(name); } };
    var press = function (button, on) { button.setAttribute('aria-pressed', String(on)); button.style.background = on ? 'var(--accent)' : ''; button.style.color = on ? 'var(--accent-ink)' : ''; };
    if (item.heading) ctx.root.appendChild(ctx.el('p', { class: 'letters', style: 'margin:0 0 4px', text: item.heading }));
    if (item.pages > 1) ctx.root.appendChild(ctx.el('p', { class: 'muted', style: 'margin:0 0 8px', 'data-read-along-page': '', text: ctx.fmt(L.read_along_page, { n: item.page, total: item.pages }) }));
    var mark = function (index) {
      nodes.forEach(function (n, i) {
        var on = i === index;
        n.style.background = on ? 'var(--ok-bg)' : 'none';
        n.style.boxShadow = on ? '0 0 0 2px var(--ok)' : 'none';
        // Above the dimming of the reading focus (Reading tools), which follows this sentence.
        n.style.position = on ? 'relative' : '';
        n.style.zIndex = on ? '1' : '';
        if (on) n.setAttribute('aria-current', 'true'); else n.removeAttribute('aria-current');
      });
      if (index >= 0 && nodes[index] && typeof nodes[index].scrollIntoView === 'function') { try { nodes[index].scrollIntoView({ block: 'nearest' }); } catch (_) {} }
    };
    var playButton = ctx.el('button', { type: 'button', class: 'primary', 'data-read-along-play': '', text: L.read_along_play });
    var slowButton = ctx.el('button', { type: 'button', 'data-read-along-slower': '', text: L.read_along_slower });
    var sylButton = hasSyl ? ctx.el('button', { type: 'button', 'data-read-along-syllables': '', text: L.read_along_syllables }) : null;
    press(slowButton, slow);
    if (sylButton) press(sylButton, showSyl);
    // The words as they are, or in syllables. A screen reader is given the plain words either way.
    var paint = function () {
      nodes.forEach(function (n, i) {
        var row = item.lines[i];
        if (showSyl && row.syl) { n.textContent = row.syl; n.setAttribute('aria-label', row.text); }
        else { n.textContent = row.text; n.removeAttribute('aria-label'); }
      });
    };
    var setPlaying = function (on) { playing = on; playButton.textContent = on ? L.read_along_stop : L.read_along_play; };
    var rate = function () { return slow ? 0.8 : 1; };
    var halt = function () { run++; ctx.stop(); mark(-1); setPlaying(false); };
    // The page from line i to its end: each line marked while its recording plays. A newer run, or leaving
    // the screen (which stops the clip), ends this one.
    var readFrom = function (i) {
      var mine = ++run;
      setPlaying(true);
      if (slow) use('slower');
      var step = function (at) {
        if (mine !== run) return;
        while (at < item.lines.length && !item.lines[at].audio) at++;
        if (at >= item.lines.length) { mark(-1); setPlaying(false); from = 0; return; }
        mark(at);
        ctx.play(item.lines[at].audio, rate()).then(function (ok) { if (mine !== run) return; if (ok === false) { mark(-1); setPlaying(false); return; } step(at + 1); });
      };
      step(i);
    };
    playButton.addEventListener('click', function () {
      if (playing) { halt(); return; }
      ctx.support('readThroughs');
      readFrom(from);
    });
    slowButton.addEventListener('click', function () { slow = !slow; remember('slow', slow); press(slowButton, slow); });
    if (sylButton) sylButton.addEventListener('click', function () { showSyl = !showSyl; remember('syl', showSyl); press(sylButton, showSyl); if (showSyl) use('syllables'); paint(); });
    ctx.root.appendChild(ctx.el('div', { class: 'row', style: 'margin:8px 0' }, sylButton ? [playButton, slowButton, sylButton] : [playButton, slowButton]));
    // data-read: running text, where the shell's reading focus can go.
    var box = ctx.el('div', { role: 'group', 'aria-label': L.read_along_text, lang: item.lang, 'data-read': '', 'data-read-along-text': '',
      style: 'font-size:1.5rem;line-height:1.9;border:1px solid var(--line);border-radius:14px;padding:12px 16px;margin:12px 0;overflow-wrap:anywhere' });
    item.lines.forEach(function (row, i) {
      if (row.para && i > 0) box.appendChild(ctx.el('span', { style: 'display:block;height:.7em', 'aria-hidden': 'true' }));
      // A sentence is a button that looks like text: pressing it reads that sentence, and "Read to me" then goes on from it.
      var node = ctx.el('button', { type: 'button', 'data-read-along-line': String(i + 1), text: row.text,
        style: 'display:inline;font:inherit;color:inherit;background:none;border:0;border-radius:6px;padding:2px 3px;margin:0;min-height:0;min-width:0;text-align:start;cursor:pointer;-webkit-box-decoration-break:clone;box-decoration-break:clone' });
      if (!row.audio) node.setAttribute('aria-disabled', 'true');
      node.addEventListener('click', function () {
        if (!row.audio) return;
        var mine = ++run;
        setPlaying(false);
        from = i;
        ctx.support('lineReplays');
        if (slow) use('slower');
        mark(i);
        ctx.play(row.audio, rate()).then(function () { if (mine === run) mark(-1); });
      });
      nodes.push(node);
      box.appendChild(node);
      box.appendChild(ctx.root.ownerDocument.createTextNode(' '));
    });
    ctx.root.appendChild(box);
    if (showSyl) { paint(); use('syllables'); }
    var done = ctx.el('button', { type: 'button', 'data-read-along-done': '', text: L.read_along_done });
    done.addEventListener('click', function () { halt(); done.setAttribute('aria-disabled', 'true'); ctx.practice('read', L.read_along_done_said); });
    ctx.root.appendChild(ctx.el('div', { class: 'row' }, [done]));
    return { reveal: function () { halt(); done.setAttribute('aria-disabled', 'true'); } };
  },
  // Listening practice: no answer is right or wrong, so nothing is ever scored.
  score: function () { return { correct: false, digitsCorrect: null, digitsPossible: null }; },
};
