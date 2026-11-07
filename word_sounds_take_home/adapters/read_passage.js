// Take-home adapter: Read the Story (read_passage).
// App: board { story, parts: [{text} | {before, after}], options: [word + 3] }
// built from a gated three-sentence story, one blank per sentence that holds
// the word (word_sounds_setup_source.jsx:4742-4768, splitPackSentence
// 2474-2483, packStoryIsUsable 2504-2527). The player takes it when story is
// set, some part is a blank and options (>= 2) hold the word
// (word_sounds_module.js:13128-13167) and prints every part, one choice
// filling every blank (20929-21028). Picture clue, else "Your word:" card
// (20938-20945,20978-20989). Graded by tap at 20946-20954 -> checkAnswer(w,
// rpWord): lower-cased, trimmed comparison (17099-17113), 2 tries. The prompt,
// story and per-sentence clips are packed by setup (5423-5436); after a right
// answer the app reads the story back line by line when the sentence split
// matches the parts, else the whole-story clip (17301-17337).

var SPLIT = /(?<=[.!?])\s+/;
function pictureFor(text, env) {
  var raw = typeof env.packImage === 'function' ? env.packImage(text) : null;
  if (typeof raw !== 'string' || !raw || /^https?:/i.test(raw)) return null;
  return env.image(/^data:/i.test(raw) ? raw : 'data:image/png;base64,' + raw);
}
// A blank line as printed: the authored sentence when the fragments locate the
// word in it (WS_CORE.preparedSentenceParts), else the app's own layout of the
// trimmed fragments, sentence-initial blanks capitalized (20973).
function blankLine(core, sentence, part, word) {
  var located = typeof sentence === 'string' ? core.preparedSentenceParts(sentence, part.before, word, part.after) : null;
  if (located) return { before: located.before, answer: located.answer, after: located.after };
  return {
    before: part.before ? part.before + ' ' : '',
    answer: part.before ? word : word.charAt(0).toUpperCase() + word.slice(1),
    after: part.after ? (/^[.,!?;:]/.test(part.after) ? '' : ' ') + part.after : '',
  };
}

module.exports = {
  id: 'read_passage',
  title: 'Read the Story',
  labels: {
    read_passage_prompt: 'Read the story. Which word finishes it?',
    read_passage_picture_practice: 'Use the picture to choose a word.',
    read_passage_matching_practice: 'Match your word to a choice.',
    read_passage_word_hint: 'Your word:',
    read_passage_picture_clue: 'Picture clue: {word}',
    read_passage_story: 'Story',
    read_passage_blank: 'blank',
    read_passage_hear_instructions: 'Hear the instructions',
    read_passage_hear_story: 'Hear the story',
    read_passage_choose: 'Choose {word}',
    read_passage_correct: 'Yes! That word finishes the story.',
    read_passage_missed: 'The word {word} finishes the story.',
    read_passage_answer_mark: '(the answer)',
  },
  prepare: function (w, env) {
    var core = env.core;
    var board = w && w.activityItems && w.activityItems.read_passage;
    var word = String(env.word);
    var lower = word.toLowerCase().trim();
    var story = board && typeof board.story === 'string' ? board.story.trim() : '';
    var parts = board && Array.isArray(board.parts) ? board.parts : [];
    var raw = board && Array.isArray(board.options) ? board.options.map(function (v) { return String(v == null ? '' : v).trim(); }).filter(Boolean) : [];
    // The player's gate (13137-13147).
    if (!story || !parts.some(function (p) { return p && !p.text; }) || raw.length < 2) return { missing: ['board'] };
    var options = [], seen = {};
    raw.forEach(function (o) { var k = o.toLowerCase(); if (!seen[k]) { seen[k] = true; options.push(o); } });
    if (!seen[lower] || options.length < 2) return { missing: ['board'] };
    var sentences = story.split(SPLIT).map(function (s) { return s.trim(); }).filter(Boolean);
    var aligned = sentences.length === parts.length;
    var lines = parts.map(function (p, i) {
      if (p && p.text) return { text: String(p.text) };
      var part = { before: String((p && p.before) || '').trim(), after: String((p && p.after) || '').trim() };
      return blankLine(core, aligned ? sentences[i] : null, part, word);
    });
    var prompt = env.packClip('Read the story. Which word finishes it?');
    if (!prompt) return { missing: ['question'] };
    // Read-back (17318-17336): line by line when the split matches the parts,
    // else the whole-story clip. Optional: the item is complete without it.
    var readBack = [];
    if (aligned && sentences.length > 1) {
      var lineClips = sentences.map(function (s) { return env.packClip(s); });
      if (lineClips.every(Boolean)) readBack = lineClips;
    }
    if (!readBack.length) { var whole = env.packClip(story); if (whole) readBack = [whole]; }
    return { item: { target: word, lines: lines, options: options, picture: pictureFor(word, env), prompt: prompt,
      readBack: readBack, readBackByLine: readBack.length > 1, introAudio: [prompt], answerAudio: [] } };
  },
  render: function (item, ctx) {
    var norm = function (s) { return String(s == null ? '' : s).toLowerCase().trim(); };
    var picture = ctx.image(item.picture);
    var blanks = [];
    var lineNodes = [];
    var storyBox = ctx.el('div', { role: 'group', 'aria-label': ctx.L.read_passage_story, class: 'letters', lang: 'en',
      style: 'font-size:1.6rem;border:1px solid var(--line);border-radius:14px;padding:12px 16px;margin:12px 0' });
    item.lines.forEach(function (line) {
      var node;
      if (line.text != null) node = ctx.el('p', { style: 'margin:6px 0;padding:2px 6px;border-radius:8px', text: line.text });
      else {
        var blank = ctx.el('span', { style: 'display:inline-block;min-width:4.5em;border-bottom:3px dashed var(--muted);text-align:center' }, [
          ctx.el('span', { 'aria-hidden': 'true', text: '____' }), ctx.el('span', { class: 'sr', text: ctx.L.read_passage_blank })]);
        blanks.push({ node: blank, answer: line.answer });
        node = ctx.el('p', { style: 'margin:6px 0;padding:2px 6px;border-radius:8px;white-space:pre-wrap' }, [line.before, blank, line.after]);
      }
      lineNodes.push(node);
      storyBox.appendChild(node);
    });
    var after = ctx.el('div', { class: 'row' });
    ctx.root.appendChild(ctx.el('p', { text: ctx.L.read_passage_prompt }));
    ctx.root.appendChild(ctx.el('p', { class: 'muted', text: picture ? ctx.L.read_passage_picture_practice : ctx.L.read_passage_matching_practice }));
    if (picture) ctx.root.appendChild(ctx.el('img', { class: 'picture', src: picture, alt: ctx.fmt(ctx.L.read_passage_picture_clue, { word: item.target }) }));
    else ctx.root.appendChild(ctx.el('p', {}, [ctx.L.read_passage_word_hint + ' ', ctx.el('span', { class: 'letters', lang: 'en', text: item.target.toLowerCase() })]));
    ctx.root.appendChild(storyBox);
    ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
      ctx.el('button', { type: 'button', on: { click: function () { run++; mark(-1); ctx.support('questionReplays'); ctx.play(item.prompt); } }, text: ctx.L.read_passage_hear_instructions }),
    ]));
    var cards = [];
    var list = ctx.el('ul', { class: 'choices' });
    item.options.forEach(function (option) {
      var right = norm(option) === norm(item.target);
      var choose = ctx.el('button', { type: 'button', class: 'primary', 'aria-label': ctx.fmt(ctx.L.read_passage_choose, { word: option }),
        on: { click: function () {
          if (ctx.isDone() || choose.getAttribute('aria-disabled') === 'true') return;
          var outcome = ctx.answer(option, right, { correctText: ctx.L.read_passage_correct, missedText: ctx.fmt(ctx.L.read_passage_missed, { word: item.target }) });
          if (outcome !== 'correct') { box.classList.add('tried'); choose.setAttribute('aria-disabled', 'true'); }
        } } }, [ctx.el('span', { class: 'letters', lang: 'en', style: 'text-transform:lowercase', text: option })]);
      var box = ctx.el('li', { class: 'choice' }, [choose]);
      cards.push({ box: box, choose: choose, right: right });
      list.appendChild(box);
    });
    ctx.root.appendChild(list);
    ctx.root.appendChild(after);
    // Follow-along read-back: each line is highlighted while its clip plays.
    // A newer run, or leaving the screen (which pauses the clip), ends the old one.
    var run = 0;
    var mark = function (index) {
      lineNodes.forEach(function (n, i) {
        var on = i === index;
        n.style.background = on ? 'var(--ok-bg)' : '';
        if (on) n.setAttribute('aria-current', 'true'); else n.removeAttribute('aria-current');
      });
    };
    var readBack = function () {
      var mine = ++run;
      ctx.support('storyReadBacks');
      if (!item.readBackByLine) { mark(-1); ctx.play(item.readBack[0]); return; }
      var step = function (i) {
        if (mine !== run) return;
        if (i >= item.readBack.length) { mark(-1); return; }
        mark(i);
        ctx.play(item.readBack[i]).then(function () { step(i + 1); });
      };
      step(0);
    };
    return {
      reveal: function () {
        // Every blank fills with the word as written in its sentence.
        blanks.forEach(function (b) {
          b.node.textContent = b.answer;
          b.node.style.borderBottomStyle = 'solid';
          b.node.style.color = 'var(--ok)';
        });
        cards.forEach(function (c) {
          c.choose.setAttribute('aria-disabled', 'true');
          if (c.right && !c.box.classList.contains('right')) {
            c.box.classList.add('right');
            c.choose.setAttribute('aria-label', c.choose.getAttribute('aria-label') + ' ' + ctx.L.read_passage_answer_mark);
          }
        });
        if (item.readBack && item.readBack.length && !after.childNodes.length) {
          after.appendChild(ctx.el('button', { type: 'button', on: { click: readBack }, text: ctx.L.read_passage_hear_story }));
        }
      },
    };
  },
};
