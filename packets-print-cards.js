// "Print word cards" on the maker page (packets-make.html, step 3): the words of the file as cut-out cards,
// and a one-page word list, printed with the browser's own Print. Nothing here loads or sends anything.
// The pictures are the ones the maker already has: a picture the teacher added to a word (read from
// packets_my_words.js through the maker's own reader) wins over a symbol; the symbols come from the
// maker's picture index, whose drawings the maker fetches with its own loader (handed in, so they are
// never fetched twice). Each printed page carries the credit of each picture set it shows.
//
// window.AlloPacketPrintCards = { wire(button, getState), open(state), close(), layout(words, perPage), ... }
//   getState() -> { words: [], title, pictures: true/false, symbols: the picture index or null,
//                   loadPictures() -> Promise<ready>, own(words) -> Promise<{ word: { picture } } or null> }
(function (root) {
  'use strict';

  var VERSION = 1;
  // Cards on a page: columns x rows. The page is laid out to fit inside 12 mm margins on US Letter and A4.
  var SIZES = { 4: { cols: 2, rows: 2, name: 'Big' }, 6: { cols: 2, rows: 3, name: 'Medium' }, 12: { cols: 3, rows: 4, name: 'Small' } };
  var DEFAULT_SIZE = 6;
  var LONGEST = 24;   // a word a teacher adds is at most 24 letters (packets_my_words.js LIMITS.wordMax)
  var SET_ORDER = ['mulberry', 'openmoji'];
  var TEXT = {
    title: 'Word cards',
    print: 'Print',
    back: 'Back to the maker',
    options: 'Card options',
    size: 'Card size',
    shows: 'Each card shows',
    showBoth: 'The word and its picture',
    showWord: 'Only the word',
    showPicture: 'Only the picture, for matching games',
    lines: 'Lines to cut along',
    pagesLegend: 'What to print',
    pagesBoth: 'The cards and a word list',
    pagesCards: 'Only the cards',
    pagesList: 'Only the word list',
    picturesOff: 'Pictures are off, so the cards show only the word. To add pictures, check Include pictures in step 3.',
    noPictureShowsWord: 'A word with no picture shows the word instead.',
    nothing: 'No words are chosen yet. Choose the words in step 2, then come back here.',
    getting: 'Getting the pictures, about {mb} MB.',
    gotNone: 'The pictures could not be downloaded, so the cards show only the pictures you added. Check the connection, then open the cards again.',
    listHeading: 'Word list',
    tip: 'What you see below is what prints. In the print window, keep the scale at 100%.',
    cardsPage: 'Cards, page {n} of {of}',
    picturesLine: 'Pictures: ',
    yourPicture: 'Picture for "{word}": '
  };

  function fill(text, values) { return String(text).replace(/\{(\w+)\}/g, function (all, key) { return values && values[key] != null ? String(values[key]) : all; }); }
  function count(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  function cleanWords(list) {
    var seen = {}, out = [];
    (Array.isArray(list) ? list : []).forEach(function (word) {
      var w = String(word == null ? '' : word).trim();
      if (w && !seen[w]) { seen[w] = true; out.push(w); }
    });
    return out;
  }
  function sizeOf(value) { var n = Number(value); return SIZES[n] ? n : DEFAULT_SIZE; }
  // The words, in order, cut into pages of perPage.
  function layout(words, perPage) {
    var per = sizeOf(perPage), pages = [];
    for (var i = 0; i < words.length; i += per) pages.push(words.slice(i, i + per));
    return pages;
  }
  // The class that sizes a word to its card (packets-print-cards.css): one for each length, so the page needs no inline style.
  function lengthClass(word) { return 'pc-len-' + Math.max(1, Math.min(LONGEST, String(word).length)); }
  function svgUri(svg) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(String(svg)); }
  function isPicture(uri) { return typeof uri === 'string' && /^data:image\/(?:png|jpeg|svg\+xml)[;,]/.test(uri); }

  // Which picture each word shows: { uri, set, credit } or null. set is 'own' for a picture the teacher added.
  function picturesOf(words, own, symbols) {
    var out = {};
    words.forEach(function (word) {
      var entry = own && Object.prototype.hasOwnProperty.call(own, word) ? own[word] : null;
      var picture = entry && entry.picture;
      if (picture && isPicture(picture.dataUri)) { out[word] = { uri: picture.dataUri, set: 'own', credit: picture.credit || null }; return; }
      var got = symbols && typeof symbols.get === 'function' && symbols.has(word) ? symbols.get(word) : null;
      out[word] = got && got.svg ? { uri: svgUri(got.svg), set: got.set || 'mulberry', credit: null } : null;
    });
    return out;
  }
  // The credit lines for the pictures on one page: one for each symbol set shown (the maker's sources wording),
  // then one for each picture the teacher added that is not their own.
  // CC BY-SA asks for a link to the license itself, not only its name.
  var LICENSE_DEEDS = { 'CC BY-SA 4.0': 'creativecommons.org/licenses/by-sa/4.0' };
  function setCredit(symbols, set) {
    var credits = symbols && symbols.credits ? symbols.credits : null;
    var credit = credits && credits[set] ? credits[set] : set === 'mulberry' && symbols && symbols.credit ? symbols.credit : null;
    if (!credit) return '';
    var deed = LICENSE_DEEDS[credit.license];
    return credit.set + ' by ' + credit.author + '. License: ' + credit.license + (deed ? ' (' + deed + ')' : '') + '. ' + credit.url;
  }
  function creditsFor(words, pictures, symbols, creditLine) {
    var sets = [], lines = [];
    words.forEach(function (word) { var p = pictures[word]; if (p && p.set !== 'own' && sets.indexOf(p.set) < 0) sets.push(p.set); });
    var rank = function (set) { var i = SET_ORDER.indexOf(set); return i < 0 ? SET_ORDER.length : i; };
    sets.sort(function (a, b) { return rank(a) - rank(b) || (a < b ? -1 : 1); });
    sets.forEach(function (set) { var line = setCredit(symbols, set); if (line) lines.push(TEXT.picturesLine + line); });
    words.forEach(function (word) {
      var p = pictures[word];
      if (!p || p.set !== 'own' || !p.credit || p.credit.own === true || typeof creditLine !== 'function') return;
      var line = creditLine(p.credit);
      if (line) lines.push(fill(TEXT.yourPicture, { word: word }) + line);
    });
    return lines;
  }

  function create(doc, win) {
    var view = null, nodes = {}, state = null, pictures = {}, run = 0, opener = null, busy = false, note = '';
    var options = { size: DEFAULT_SIZE, shows: 'both', lines: true, pages: 'both' };

    function el(tag, className, text) {
      var node = doc.createElement(tag);
      if (className) node.className = className;
      if (text != null) node.textContent = text;
      return node;
    }
    function radios(name, legend, rows) {
      var set = el('fieldset', 'pc-field');
      set.appendChild(el('legend', '', legend));
      var box = el('div', 'pc-radios');
      rows.forEach(function (row) {
        var label = el('label', 'radio pc-radio'), input = el('input');
        input.type = 'radio'; input.name = 'pc-' + name; input.value = String(row[0]);
        input.checked = String(options[name]) === String(row[0]);
        input.addEventListener('change', function () { if (input.checked) { options[name] = name === 'size' ? sizeOf(input.value) : input.value; draw(); } });
        label.appendChild(input);
        label.appendChild(el('span', '', row[1]));
        box.appendChild(label);
      });
      set.appendChild(box);
      return set;
    }
    function build() {
      view = el('div', 'pc');
      view.id = 'print-cards-view';
      view.hidden = true;
      var bar = el('div', 'pc-bar');
      nodes.heading = el('h1', '', TEXT.title);
      nodes.heading.id = 'pc-heading';
      nodes.heading.tabIndex = -1;
      view.setAttribute('role', 'region');
      view.setAttribute('aria-labelledby', 'pc-heading');
      bar.appendChild(nodes.heading);
      nodes.said = el('p', 'pc-said');
      nodes.said.setAttribute('role', 'status');
      bar.appendChild(nodes.said);
      var actions = el('p', 'pc-actions');
      nodes.print = el('button', 'btn btn-primary', TEXT.print);
      nodes.print.type = 'button';
      nodes.print.addEventListener('click', function () { if (!busy && state && state.words.length) win.print(); });
      nodes.back = el('button', 'btn', TEXT.back);
      nodes.back.type = 'button';
      nodes.back.addEventListener('click', close);
      actions.appendChild(nodes.print);
      actions.appendChild(nodes.back);
      bar.appendChild(actions);
      nodes.tip = el('p', 'pc-hint', TEXT.tip);
      bar.appendChild(nodes.tip);
      nodes.options = el('details', 'pc-options');
      nodes.options.appendChild(el('summary', '', TEXT.options));
      var body = el('div', 'pc-options-body');
      body.appendChild(radios('size', TEXT.size, [4, 6, 12].map(function (n) { return [n, SIZES[n].name + ': ' + n + ' on a page']; })));
      nodes.shows = radios('shows', TEXT.shows, [['both', TEXT.showBoth], ['word', TEXT.showWord], ['picture', TEXT.showPicture]]);
      body.appendChild(nodes.shows);
      nodes.picturesNote = el('p', 'pc-hint');
      body.appendChild(nodes.picturesNote);
      var lines = el('label', 'radio pc-radio pc-check'), box = el('input');
      box.type = 'checkbox'; box.id = 'pc-lines'; box.checked = options.lines;
      box.addEventListener('change', function () { options.lines = box.checked; draw(); });
      lines.appendChild(box);
      lines.appendChild(el('span', '', TEXT.lines));
      body.appendChild(lines);
      body.appendChild(radios('pages', TEXT.pagesLegend, [['both', TEXT.pagesBoth], ['cards', TEXT.pagesCards], ['list', TEXT.pagesList]]));
      nodes.options.appendChild(body);
      bar.appendChild(nodes.options);
      view.appendChild(bar);
      nodes.sheets = el('div', 'pc-sheets');
      view.appendChild(nodes.sheets);
      view.addEventListener('keydown', function (event) { if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); close(); } });
      doc.body.appendChild(view);
    }

    function cardsShow() { return state && state.pictures ? options.shows : 'word'; }
    function cardOf(word) {
      var shows = cardsShow(), picture = shows !== 'word' ? pictures[word] : null;
      var card = el('li', 'pc-card ' + lengthClass(word));
      if (picture) {
        var img = el('img', 'pc-pic');
        img.src = picture.uri;
        img.alt = shows === 'picture' ? word : '';
        img.decoding = 'sync';
        card.appendChild(img);
        card.classList.add('pc-has-pic');
      }
      if (!picture || shows !== 'picture') card.appendChild(el('span', 'pc-word', word));
      return card;
    }
    function cardPages(words) {
      var pages = layout(words, options.size), size = SIZES[options.size], out = [];
      var shown = cardsShow() === 'word' ? {} : pictures;
      pages.forEach(function (page, i) {
        var sheet = el('section', 'pc-sheet pc-cards pc-per-' + options.size + (options.lines ? ' pc-lines' : ' pc-nolines'));
        var label = fill(TEXT.cardsPage, { n: i + 1, of: pages.length });
        sheet.setAttribute('aria-label', label);
        var grid = el('ul', 'pc-grid pc-cols-' + size.cols + ' pc-rows-' + size.rows);
        page.forEach(function (word) { grid.appendChild(cardOf(word)); });
        sheet.appendChild(grid);
        var foot = el('footer', 'pc-foot');
        foot.appendChild(el('p', 'pc-foot-title', (state.title ? state.title + '. ' : '') + label + '.'));
        creditsFor(page, shown, state.symbols, state.creditLine).forEach(function (line) { foot.appendChild(el('p', 'pc-credit', line)); });
        sheet.appendChild(foot);
        out.push(sheet);
      });
      return out;
    }
    function listPage(words) {
      var sheet = el('section', 'pc-sheet pc-list');
      sheet.setAttribute('aria-label', TEXT.listHeading);
      sheet.appendChild(el('h2', 'pc-list-title', state.title || TEXT.title));
      sheet.appendChild(el('p', 'pc-list-sub', TEXT.listHeading + ': ' + count(words.length, 'word') + '.'));
      var cols = words.length <= 12 ? 1 : words.length <= 26 ? 2 : 3;
      var list = el('ol', 'pc-words pc-list-cols-' + cols);
      words.forEach(function (word) { list.appendChild(el('li', '', word)); });
      sheet.appendChild(list);
      return sheet;
    }
    function said() {
      if (!state || !state.words.length) return TEXT.nothing;
      if (busy) return note;
      var n = state.words.length, cards = options.pages !== 'list' ? layout(state.words, options.size).length : 0;
      var parts = [];
      if (cards) parts.push(count(cards, 'page') + ' of cards');
      if (options.pages !== 'cards') parts.push('a word list');
      var withPicture = state.words.filter(function (word) { return !!pictures[word]; }).length;
      var pictureSaid = cardsShow() === 'word' ? '' : ' ' + count(withPicture, 'card') + ' of ' + n + ' with a picture.';
      return count(n, 'word') + '. ' + parts.join(' and ') + ' to print.' + pictureSaid + (note ? ' ' + note : '');
    }
    function draw() {
      if (!view || !state) return;
      var words = state.words;
      while (nodes.sheets.firstChild) nodes.sheets.removeChild(nodes.sheets.firstChild);
      nodes.print.disabled = busy || !words.length;
      nodes.options.hidden = !words.length;
      nodes.tip.hidden = !words.length;
      nodes.shows.hidden = !state.pictures;
      nodes.picturesNote.textContent = !state.pictures ? TEXT.picturesOff : options.shows !== 'word' ? TEXT.noPictureShowsWord : '';
      nodes.said.textContent = said();
      if (busy || !words.length) return;
      if (options.pages !== 'list') cardPages(words).forEach(function (sheet) { nodes.sheets.appendChild(sheet); });
      if (options.pages !== 'cards') nodes.sheets.appendChild(listPage(words));
    }

    // The pictures these words show: the teacher's first (read fresh), then the symbols, whose drawings the
    // maker's loader gets (only when a word needs one and they are not here yet).
    function gather(mine) {
      if (!state.pictures || !state.words.length) return Promise.resolve();
      var own = typeof state.own === 'function' ? Promise.resolve().then(function () { return state.own(state.words); }).catch(function () { return null; }) : Promise.resolve(null);
      return own.then(function (found) {
        if (mine !== run) return;
        var symbols = state.symbols;
        var needs = !!symbols && state.words.some(function (word) { return !(found && found[word] && found[word].picture) && symbols.has(word); });
        if (!needs || symbols.ready() || typeof state.loadPictures !== 'function') { pictures = picturesOf(state.words, found, symbols); return; }
        busy = true;
        note = fill(TEXT.getting, { mb: (Number(symbols.bytes || 0) / 1e6).toFixed(1) });
        draw();
        return Promise.resolve().then(function () { return state.loadPictures(); }).then(function (ready) { return !!ready; }, function () { return false; }).then(function (ready) {
          if (mine !== run) return;
          busy = false;
          note = ready ? '' : TEXT.gotNone;
          pictures = picturesOf(state.words, found, ready ? symbols : null);
        });
      });
    }

    function open(given) {
      if (!view) build();
      var mine = ++run;
      var s = given || {};
      state = { words: cleanWords(s.words), title: String(s.title || '').trim(), pictures: !!s.pictures, symbols: s.symbols || null,
        loadPictures: s.loadPictures || null, own: s.own || null,
        creditLine: typeof s.creditLine === 'function' ? s.creditLine : root && root.AlloPacketMyWords && root.AlloPacketMyWords.creditLine };
      pictures = {}; busy = false; note = '';
      if (!state.pictures && options.shows !== 'both') options.shows = 'both';
      opener = doc.activeElement && doc.activeElement !== doc.body ? doc.activeElement : opener;
      view.hidden = false;
      doc.body.classList.add('pc-on');
      draw();
      if (typeof win.scrollTo === 'function') { try { win.scrollTo(0, 0); } catch (_) {} }
      nodes.heading.focus();
      return gather(mine).then(function () { if (mine === run) { busy = false; draw(); } });
    }
    function close() {
      if (!view || view.hidden) return;
      run++;
      view.hidden = true;
      doc.body.classList.remove('pc-on');
      while (nodes.sheets.firstChild) nodes.sheets.removeChild(nodes.sheets.firstChild);
      if (opener && typeof opener.focus === 'function' && doc.contains(opener)) opener.focus();
    }
    function wire(button, getState) {
      if (!button || typeof getState !== 'function') return false;
      button.hidden = false;
      button.addEventListener('click', function () { opener = button; open(getState()); });
      return true;
    }
    return { open: open, close: close, wire: wire, options: options, view: function () { return view; } };
  }

  var api = root && root.document ? create(root.document, root) : {};
  api.VERSION = VERSION;
  api.SIZES = SIZES;
  api.TEXT = TEXT;
  api.create = create;
  api.layout = layout;
  api.lengthClass = lengthClass;
  api.picturesOf = picturesOf;
  api.creditsFor = creditsFor;

  if (root) root.AlloPacketPrintCards = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
