/**
 * AlloFlow Escape Room CDN Module
 *
 * Contains: createEscapeRoomEngine (factory), EscapeRoomGameplay, EscapeRoomDialogs
 *
 * Extracted from AlloFlowANTI.txt escape room engine block.
 * Source: AlloFlowANTI.txt lines 25599-26414 (logic), 41734-42412 (gameplay JSX), 47710-47928 (dialogs JSX)
 */
(function() {
  'use strict';
  // WCAG 2.1 AA: Accessibility CSS
  if (!document.getElementById("escape-room-module-a11y")) { var _s = document.createElement("style"); _s.id = "escape-room-module-a11y"; _s.textContent = "@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }"; document.head.appendChild(_s); }

  // ── Duplicate-load guard ──
  if (window.__escapeRoomModuleLoaded) {
    console.warn('[EscapeRoomModule] Already loaded — skipping');
    return;
  }
  window.__escapeRoomModuleLoaded = true;

  // ── React dependencies ──
  var React = window.React;
  if (!React) { console.error('[EscapeRoomModule] React not found on window'); return; }
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useCallback = React.useCallback;
  var useRef = React.useRef;
  var useMemo = React.useMemo;
  var h = React.createElement;

  // ── Lucide icons from host app ──
  var _icons = window.AlloIcons || {};
  var DoorOpen = _icons.DoorOpen || function(){ return null; };
  var Clock = _icons.Clock || function(){ return null; };
  var Trophy = _icons.Trophy || function(){ return null; };
  var Lightbulb = _icons.Lightbulb || function(){ return null; };
  var Key = _icons.Key || function(){ return null; };
  var Sparkles = _icons.Sparkles || function(){ return null; };
  var Volume2 = _icons.Volume2 || function(){ return null; };
  var VolumeX = _icons.VolumeX || function(){ return null; };
  var Play = _icons.Play || function(){ return null; };
  var Lock = _icons.Lock || function(){ return null; };
  var CheckCircle = _icons.CheckCircle || function(){ return null; };
  var X = _icons.X || function(){ return null; };
  var ChevronUp = _icons.ChevronUp || function(){ return null; };
  var ChevronDown = _icons.ChevronDown || function(){ return null; };
  var GripVertical = _icons.GripVertical || function(){ return null; };
  var RefreshCw = _icons.RefreshCw || function(){ return null; };
  var XCircle = _icons.XCircle || function(){ return null; };
  var Eye = _icons.Eye || function(){ return null; };
  var EyeOff = _icons.EyeOff || function(){ return null; };
  var Save = _icons.Save || function(){ return null; };
  var Rocket = _icons.Rocket || function(){ return null; };
  var Settings = _icons.Settings || function(){ return null; };
  var Puzzle = _icons.Puzzle || function(){ return null; };
  var Star = _icons.Star || function(){ return null; };
  var Zap = _icons.Zap || function(){ return null; };
  var Shield = _icons.Shield || function(){ return null; };
  var Target = _icons.Target || function(){ return null; };
  var Brain = _icons.Brain || function(){ return null; };
  var Flame = _icons.Flame || function(){ return null; };
  var Crown = _icons.Crown || function(){ return null; };
  var Gem = _icons.Gem || function(){ return null; };
  var Skull = _icons.Skull || function(){ return null; };
  var Ghost = _icons.Ghost || function(){ return null; };
  var Wand2 = _icons.Wand2 || function(){ return null; };
  var Swords = _icons.Swords || function(){ return null; };
  var ScrollText = _icons.ScrollText || function(){ return null; };
  var MapPin = _icons.MapPin || function(){ return null; };
  var Compass = _icons.Compass || function(){ return null; };
  var Anchor = _icons.Anchor || function(){ return null; };
  var Music = _icons.Music || function(){ return null; };
  var Palette = _icons.Palette || function(){ return null; };
  var Camera = _icons.Camera || function(){ return null; };
  var Cpu = _icons.Cpu || function(){ return null; };
  var Globe = _icons.Globe || function(){ return null; };
  var Heart = _icons.Heart || function(){ return null; };
  var Moon = _icons.Moon || function(){ return null; };
  var Sun = _icons.Sun || function(){ return null; };
  var Cloud = _icons.Cloud || function(){ return null; };
  var Snowflake = _icons.Snowflake || function(){ return null; };
  var TreePine = _icons.TreePine || function(){ return null; };
  var Mountain = _icons.Mountain || function(){ return null; };
  var Waves = _icons.Waves || function(){ return null; };
  var Wind = _icons.Wind || function(){ return null; };
  var Bug = _icons.Bug || function(){ return null; };
  var Bird = _icons.Bird || function(){ return null; };
  var Fish = _icons.Fish || function(){ return null; };
  var Cat = _icons.Cat || function(){ return null; };
  var Dog = _icons.Dog || function(){ return null; };
  var Flower2 = _icons.Flower2 || function(){ return null; };
  var MicOff = _icons.MicOff || function(){ return null; };

  // ═══════════════════════════════════════════════════════════════
  // MODULE-LOCAL UTILITY
  // ═══════════════════════════════════════════════════════════════

  var derangeShuffle = function(arr) {
    if (arr.length <= 1) return arr.slice();
    var shuffled = arr.slice();
    var maxAttempts = 50;
    do {
      for (var i = shuffled.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
      }
      maxAttempts--;
    } while (
      maxAttempts > 0 &&
      shuffled.some(function(val, idx) { return val === arr[idx]; })
    );
    return shuffled;
  };

  // ═══════════════════════════════════════════════════════════════
  // FACTORY: createEscapeRoomEngine
  // ═══════════════════════════════════════════════════════════════


  // Preserve accents while accepting canonically equivalent keyboard input.
  var normalizeEscapeAnswer = function(value) {
    return String(value == null ? '' : value).normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
  };

  var escapeRoomLanguageDirective = function(state) {
    var language = String(state.leveledTextLanguage || 'English').trim() || 'English';
    // A room has one consistent answer language; a multi-language selection uses its first language.
    if (language.toLowerCase() === 'all selected languages') {
      language = (state.selectedLanguages || []).find(function(value) {
        return typeof value === 'string' && value.trim() && value.trim().toLowerCase() !== 'all selected languages';
      }) || 'English';
    }
    return 'LANGUAGE: Write ALL student-facing text in ' + language + ', using its regional spelling and vocabulary. ' +
      'This includes room themes and descriptions, object names, questions, hints, options, sentences, items, matching pairs, riddles, answers, acceptableAnswers, wordbanks, and revealedClue values. ' +
      'Keep JSON keys, ids, linkedObjectId, revealsClueFor, and puzzle type values in English; keep numeric indices unchanged. ' +
      'Scrambled letters must come from the answer in the requested language.\n';
  };

  // Each tile represents a whole grapheme, including combining marks and emoji.
  var escapeRoomLetters = function(word) {
    var text = String(word || '').normalize('NFC');
    var letters = typeof Intl !== 'undefined' && Intl.Segmenter
      ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), function(part) { return part.segment; })
      : Array.from(text);
    return letters.filter(function(letter) { return letter.trim(); });
  };

  // ═══════════════════════════════════════════════════════════════
  // ROOM DATA CHECKS
  // Model output, saved rooms and teacher edits all pass through one checker.
  // It repairs only what is broken, so a valid room keeps its exact content
  // (and its score id). Puzzles that cannot be played are removed and reported.
  // ═══════════════════════════════════════════════════════════════

  var ESCAPE_PUZZLE_TYPES = ['mcq', 'sequence', 'cipher', 'matching', 'scramble', 'fillin'];
  var ESCAPE_TYPE_ALIASES = {
    multiplechoice: 'mcq', multiplechoicequestion: 'mcq', ordering: 'sequence', order: 'sequence',
    matchingpairs: 'matching', match: 'matching', fillintheblank: 'fillin', fillintheblanks: 'fillin',
    cloze: 'fillin', wordriddle: 'cipher', riddle: 'cipher', wordscramble: 'scramble', anagram: 'scramble'
  };
  var normalizeEscapePuzzleType = function(type) {
    var normalized = String(type || '').toLowerCase().replace(/[^a-z]/g, '');
    return ESCAPE_TYPE_ALIASES[normalized] || normalized;
  };
  var isPlainObject = function(value) { return !!value && typeof value === 'object' && !Array.isArray(value); };
  var escapeText = function(value) { return typeof value === 'string' ? value : (typeof value === 'number' && isFinite(value) ? String(value) : ''); };
  var hasText = function(value) { return escapeText(value).trim().length > 0; };
  var sameEscapeWord = function(a, b) { return normalizeEscapeAnswer(a) === normalizeEscapeAnswer(b); };
  var sameJson = function(a, b) { return JSON.stringify(a) === JSON.stringify(b); };
  var isIndexOrder = function(order, count, base) {
    if (!Array.isArray(order) || order.length !== count) return false;
    var seen = {};
    return order.every(function(value) {
      var ok = Number.isInteger(value) && value >= base && value < count + base && !seen[value];
      seen[value] = true;
      return ok;
    });
  };
  var uniqueEscapeId = function(base, taken) {
    var id = base, n = 2;
    while (taken[id]) id = base + '_' + (n++);
    return id;
  };
  var withoutKeys = function(obj, keys) {
    var out = {};
    Object.keys(obj).forEach(function(key) { if (keys.indexOf(key) === -1) out[key] = obj[key]; });
    return out;
  };
  // Distinct, non-empty words. The answer is always present, so the puzzle stays winnable.
  var escapeWordList = function(list, answer) {
    var words = [];
    (Array.isArray(list) ? list : []).forEach(function(word) {
      var text = escapeText(word);
      if (hasText(text) && !words.some(function(w) { return sameEscapeWord(w, text); })) words.push(text);
    });
    var added = false;
    if (hasText(answer) && !words.some(function(w) { return sameEscapeWord(w, answer); })) { words.push(escapeText(answer)); added = true; }
    return { words: words, added: added };
  };
  // A changed answer replaces its old entry in the word bank rather than adding a stray word.
  var replaceEscapeAnswer = function(list, oldAnswer, newAnswer) {
    var words = (Array.isArray(list) ? list : []).slice();
    var at = hasText(oldAnswer) ? words.findIndex(function(w) { return sameEscapeWord(w, oldAnswer); }) : -1;
    if (at >= 0) words[at] = newAnswer;
    else if (hasText(newAnswer) && !words.some(function(w) { return sameEscapeWord(w, newAnswer); })) words.push(newAnswer);
    return words.filter(function(w, i) { return !hasText(w) || words.findIndex(function(x) { return sameEscapeWord(x, w); }) === i; });
  };
  var inferEscapePuzzleType = function(p) {
    if (Array.isArray(p.options)) return 'mcq';
    if (Array.isArray(p.items)) return 'sequence';
    if (Array.isArray(p.pairs)) return 'matching';
    if (hasText(p.encodedText) || hasText(p.riddle)) return 'cipher';
    if (hasText(p.scrambledWord)) return 'scramble';
    if (hasText(p.sentence)) return 'fillin';
    return '';
  };
  var parseEscapeRoomJson = function(text) {
    var cleaned = String(text == null ? '' : text).replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
    var start = cleaned.indexOf('{'), end = cleaned.lastIndexOf('}');
    var candidates = [cleaned];
    if (start >= 0 && end > start) candidates.push(cleaned.slice(start, end + 1));
    candidates.push(candidates[candidates.length - 1].replace(/,\s*([}\]])/g, '$1'));
    for (var i = 0; i < candidates.length; i++) {
      try { return JSON.parse(candidates[i]); } catch (e) {}
    }
    return null;
  };

  // Checks one puzzle. Returns { puzzle } (possibly a repaired copy) with notes for the
  // teacher, or { error } when the puzzle cannot be played as written.
  var checkEscapePuzzle = function(raw) {
    var p = raw, notes = [];
    var edit = function(patch) { if (p === raw) p = Object.assign({}, raw); Object.assign(p, patch); };
    var type = normalizeEscapePuzzleType(raw.type);
    if (ESCAPE_PUZZLE_TYPES.indexOf(type) === -1) type = inferEscapePuzzleType(raw);
    if (!type) return { error: 'has an unsupported type "' + escapeText(raw.type) + '"' };
    if (raw.type !== type) edit({ type: type });
    if (p.hint != null && typeof p.hint !== 'string') edit({ hint: escapeText(p.hint) });
    if (type === 'mcq') {
      if (!hasText(p.question)) return { error: 'is missing its question' };
      var options = Array.isArray(p.options) ? p.options.map(escapeText) : [];
      var index = p.correctIndex;
      if (typeof index === 'string' && /^\s*\d+\s*$/.test(index)) index = Number(index);
      else if (typeof index === 'string' && /^\s*[A-Fa-f]\s*$/.test(index)) index = index.trim().toUpperCase().charCodeAt(0) - 65;
      if (!(Number.isInteger(index) && index >= 0 && index < options.length && hasText(options[index]))) {
        var keyed = hasText(p.correctAnswer) ? p.correctAnswer : p.answer;
        index = hasText(keyed) ? options.findIndex(function(o) { return sameEscapeWord(o, keyed); }) : -1;
      }
      if (index < 0) return { error: 'has no valid correct option' };
      var cleaned = [];
      options.forEach(function(o) { if (hasText(o) && !cleaned.some(function(c) { return sameEscapeWord(c, o); })) cleaned.push(o); });
      if (cleaned.length < 2) return { error: 'needs at least two different options' };
      var cleanIndex = cleaned.findIndex(function(c) { return sameEscapeWord(c, options[index]); });
      if (!sameJson(cleaned, p.options)) notes.push('options_cleaned');
      if (!sameJson(cleaned, p.options) || cleanIndex !== p.correctIndex) edit({ options: cleaned, correctIndex: cleanIndex });
    } else if (type === 'sequence') {
      if (!hasText(p.question)) return { error: 'is missing its ordering instructions' };
      var items = Array.isArray(p.items) ? p.items.map(escapeText) : [];
      if (items.length < 2 || items.some(function(i) { return !hasText(i); })) return { error: 'needs at least two items to order' };
      if (items.some(function(item, i) { return items.findIndex(function(x) { return sameEscapeWord(x, item); }) !== i; })) return { error: 'has two identical items, so the order is ambiguous' };
      var order = p.correctOrder;
      if (Array.isArray(order) && order.every(function(v) { return typeof v === 'string' && /^\s*\d+\s*$/.test(v); })) order = order.map(Number);
      if (order == null) order = items.map(function(_, i) { return i; });
      else if (!isIndexOrder(order, items.length, 0)) {
        if (isIndexOrder(order, items.length, 1)) { order = order.map(function(v) { return v - 1; }); notes.push('order_renumbered'); }
        else return { error: 'has a correctOrder that is not an ordering of its items' };
      }
      if (!sameJson(items, p.items) || !sameJson(order, p.correctOrder)) edit({ items: items, correctOrder: order });
      if (items.length < 3) notes.push('few_items');
    } else if (type === 'matching') {
      var pairs = [];
      (Array.isArray(p.pairs) ? p.pairs : []).forEach(function(pair) {
        if (!isPlainObject(pair) || !hasText(pair.left) || !hasText(pair.right)) return;
        var left = escapeText(pair.left), right = escapeText(pair.right);
        if (pairs.some(function(x) { return sameEscapeWord(x.left, left) || sameEscapeWord(x.right, right); })) return;
        pairs.push(pair.left === left && pair.right === right ? pair : Object.assign({}, pair, { left: left, right: right }));
      });
      if (!pairs.length) return { error: 'has no complete matching pairs' };
      if (pairs.length !== (Array.isArray(p.pairs) ? p.pairs.length : 0)) notes.push('pairs_removed');
      if (!sameJson(pairs, p.pairs)) edit({ pairs: pairs });
      if (pairs.length < 3) notes.push('few_pairs');
      if (!hasText(p.question)) notes.push('missing_question');
    } else {
      // fillin, cipher and scramble are all graded against one answer word.
      if (!hasText(p.answer)) return { error: 'is missing its answer' };
      if (typeof p.answer !== 'string') edit({ answer: escapeText(p.answer) });
      var answer = p.answer;
      if (type === 'scramble') {
        if (escapeRoomLetters(answer).length < 2) return { error: 'has an answer too short to unscramble' };
        if (!hasText(p.scrambledWord)) edit({ scrambledWord: answer });
      } else {
        if (type === 'cipher' && !hasText(p.encodedText) && hasText(p.riddle)) edit({ encodedText: escapeText(p.riddle) });
        var prompt = type === 'fillin' ? p.sentence : p.encodedText;
        if (!hasText(prompt) && !hasText(p.question)) return { error: type === 'fillin' ? 'is missing its sentence' : 'is missing its riddle' };
        if (type === 'fillin' && hasText(p.sentence) && !/_{3,}/.test(p.sentence)) {
          var at = p.sentence.toLowerCase().indexOf(answer.toLowerCase());
          if (at >= 0 && answer.trim().length > 1) { edit({ sentence: p.sentence.slice(0, at) + '_____' + p.sentence.slice(at + answer.length) }); notes.push('blank_added'); }
          else notes.push('no_blank');
        }
        if (type === 'cipher' && hasText(p.encodedText) && normalizeEscapeAnswer(p.encodedText).indexOf(normalizeEscapeAnswer(answer)) >= 0) notes.push('answer_in_riddle');
        if (Array.isArray(p.wordbank)) {
          var bank = escapeWordList(p.wordbank, answer);
          if (bank.added) notes.push('answer_added');
          if (!sameJson(bank.words, p.wordbank)) edit({ wordbank: bank.words });
        } else notes.push('typed_answer');
      }
    }
    return { puzzle: p, notes: notes };
  };

  var checkEscapeFinalDoor = function(raw) {
    if (raw == null) return { door: null };
    if (!isPlainObject(raw) || !(hasText(raw.sentence) || hasText(raw.question)) || !hasText(raw.answer)) return { door: null, removed: true };
    var door = raw;
    var edit = function(patch) { if (door === raw) door = Object.assign({}, raw); Object.assign(door, patch); };
    if (typeof raw.answer !== 'string') edit({ answer: escapeText(raw.answer) });
    if (raw.acceptableAnswers != null) {
      var accepted = (Array.isArray(raw.acceptableAnswers) ? raw.acceptableAnswers : []).map(escapeText).filter(hasText);
      if (!sameJson(accepted, raw.acceptableAnswers)) edit({ acceptableAnswers: accepted });
    }
    if (Array.isArray(raw.wordbank)) {
      var answers = [door.answer].concat(door.acceptableAnswers || []);
      var bank = escapeWordList(raw.wordbank, answers.some(function(a) { return (raw.wordbank || []).some(function(w) { return sameEscapeWord(w, a); }); }) ? null : door.answer);
      if (!sameJson(bank.words, raw.wordbank)) edit({ wordbank: bank.words });
    }
    return { door: door };
  };

  // opts: requireObjects (saved rooms must carry their objects), expectedCount (trim
  // extras and report a shortfall), minPuzzles (how many must survive to be usable).
  var prepareEscapeRoomData = function(data, opts) {
    opts = opts || {};
    var result = { ok: false, room: null, objects: [], puzzles: [], finalDoor: null, problems: [], notes: { room: [], byId: {} }, dropped: 0 };
    if (!isPlainObject(data) || !Array.isArray(data.puzzles)) {
      result.problems.push('The JSON needs a "puzzles" array (plus "room" and "objects").');
      return result;
    }
    var rawObjects = Array.isArray(data.objects) ? data.objects : [];
    if (opts.requireObjects && !rawObjects.some(isPlainObject)) {
      result.problems.push('The room has no objects.');
      return result;
    }
    var roomIn = isPlainObject(data.room) ? data.room : {};
    result.room = hasText(roomIn.theme) && typeof roomIn.description === 'string' ? data.room :
      Object.assign({}, roomIn, { theme: hasText(roomIn.theme) ? escapeText(roomIn.theme) : 'Puzzle Challenge', description: escapeText(roomIn.description) });
    var objects = [], objectIds = {};
    rawObjects.forEach(function(o, i) {
      if (!isPlainObject(o)) return;
      var obj = o;
      var id = typeof o.id === 'string' && o.id.trim() ? o.id : '';
      if (!id || objectIds[id]) obj = Object.assign({}, o, { id: uniqueEscapeId(hasText(o.id) ? escapeText(o.id).trim() : 'obj' + (i + 1), objectIds) });
      if (!hasText(obj.name) || !hasText(obj.emoji)) obj = Object.assign({}, obj, { name: hasText(obj.name) ? obj.name : 'Puzzle ' + (i + 1), emoji: hasText(obj.emoji) ? obj.emoji : '\uD83D\uDD2E' });
      objectIds[obj.id] = true;
      objects.push(obj);
    });
    var puzzleIds = {}, checked = [];
    data.puzzles.forEach(function(raw, i) {
      var label = 'Puzzle ' + (i + 1) + (isPlainObject(raw) && hasText(raw.id) ? ' ("' + escapeText(raw.id) + '")' : '');
      if (!isPlainObject(raw)) { result.problems.push(label + ' is not an object.'); result.dropped++; return; }
      var check = checkEscapePuzzle(raw);
      if (check.error) { result.problems.push(label + ' ' + check.error + '.'); result.dropped++; return; }
      var p = check.puzzle;
      if (typeof p.id !== 'string' || !p.id.trim() || puzzleIds[p.id]) p = Object.assign({}, p, { id: uniqueEscapeId(hasText(p.id) ? escapeText(p.id).trim() : 'p' + (i + 1), puzzleIds) });
      puzzleIds[p.id] = true;
      checked.push({ puzzle: p, index: i, notes: check.notes });
    });
    if (opts.expectedCount && checked.length > opts.expectedCount) checked = checked.slice(0, opts.expectedCount);
    if (opts.expectedCount && checked.length < opts.expectedCount) result.problems.push('Only ' + checked.length + ' of the ' + opts.expectedCount + ' requested puzzles can be played.');
    // Every puzzle needs its own object. A missing or shared link is re-bound, never guessed away.
    var used = {};
    checked.forEach(function(entry, n) {
      var p = entry.puzzle;
      var link = p.linkedObjectId == null ? '' : String(p.linkedObjectId);
      var target = objects.find(function(o) { return o.id === link && !used[o.id]; });
      if (!target && objects[entry.index] && !used[objects[entry.index].id]) target = objects[entry.index];
      if (!target) target = objects.find(function(o) { return !used[o.id]; });
      if (!target) {
        target = { id: uniqueEscapeId('obj_' + p.id, objectIds), emoji: '\uD83D\uDD2E', name: 'Puzzle ' + (n + 1) };
        objectIds[target.id] = true;
        objects.push(target);
      }
      used[target.id] = true;
      if (p.linkedObjectId !== target.id) entry.puzzle = Object.assign({}, p, { linkedObjectId: target.id });
    });
    var keptIds = {};
    checked.forEach(function(entry) { keptIds[entry.puzzle.id] = true; });
    result.puzzles = checked.map(function(entry) {
      var p = entry.puzzle;
      if (p.revealsClueFor != null && (!keptIds[p.revealsClueFor] || p.revealsClueFor === p.id || !hasText(p.revealedClue))) p = withoutKeys(p, ['revealsClueFor', 'revealedClue']);
      if (entry.notes.length) result.notes.byId[p.id] = entry.notes;
      return p;
    });
    result.objects = objects.filter(function(o) { return used[o.id]; });
    var door = checkEscapeFinalDoor(data.finalDoor);
    result.finalDoor = door.door;
    if (door.removed) result.notes.room.push({ code: 'final_door_removed' });
    if (result.dropped) result.notes.room.push({ code: 'puzzles_removed', count: result.dropped });
    result.ok = result.puzzles.length >= Math.max(1, opts.minPuzzles || 1);
    if (!result.puzzles.length) result.problems.push('No puzzle can be played.');
    return result;
  };

  // Shuffled display fields are derived here and never stored in saved rooms.
  var ESCAPE_DISPLAY_FIELDS = ['linkedObject', 'shuffledItems', 'displayLetters', 'leftColumn', 'rightColumn'];
  var processEscapeRoomPuzzles = function(puzzles, objects) {
    return puzzles.map(function(p, i) {
      var processed = Object.assign({}, p, {
        linkedObject: (objects || []).find(function(o) { return o.id === p.linkedObjectId; }) || (objects || [])[i] || { emoji: '\uD83D\uDD2E', name: 'Puzzle ' + (i + 1) }
      });
      if (p.type === 'sequence' && p.items) {
        // Deranged against the correct order, so a room never opens already solved.
        processed.shuffledItems = derangeShuffle(isIndexOrder(p.correctOrder, p.items.length, 0) ? p.correctOrder : p.items.map(function(_, idx) { return idx; }));
      }
      if (p.type === 'scramble' && p.scrambledWord) {
        processed.displayLetters = derangeShuffle(escapeRoomLetters(p.answer || p.scrambledWord));
      }
      if (p.type === 'matching' && p.pairs) {
        processed.leftColumn = derangeShuffle(p.pairs.map(function(pair) { return pair.left; }));
        processed.rightColumn = derangeShuffle(p.pairs.map(function(pair) { return pair.right; }));
      }
      if ((p.type === 'fillin' || p.type === 'cipher') && p.wordbank) {
        processed.wordbank = derangeShuffle(p.wordbank);
      }
      return processed;
    });
  };
  var toSavedEscapePuzzle = function(p) {
    var out = {};
    Object.keys(p).forEach(function(key) { if (ESCAPE_DISPLAY_FIELDS.indexOf(key) === -1 && p[key] !== undefined) out[key] = p[key]; });
    return out;
  };
  var savedEscapeRoomFrom = function(room) {
    return { room: room.room, objects: room.objects || [], puzzles: (room.puzzles || []).map(toSavedEscapePuzzle), finalDoor: room.finalDoorPuzzle || null };
  };
  var hasEscapeRoomDraftIn = function(room) {
    return !!(room && room.room && Array.isArray(room.puzzles) && room.puzzles.length && !room.isActive && !room.isPreview && !room.isGenerating);
  };
  // The live race asks for this exact mix; a near miss is accepted after one repair.
  var ESCAPE_LIVE_MIX = { mcq: 2, sequence: 2, matching: 2, fillin: 2, cipher: 1, scramble: 1 };
  var escapeMixCounts = function(puzzles) {
    var counts = {};
    (puzzles || []).forEach(function(p) { counts[p.type] = (counts[p.type] || 0) + 1; });
    return counts;
  };
  var escapeMixIsBalanced = function(puzzles) {
    var counts = escapeMixCounts(puzzles);
    return (puzzles || []).length === 10 && Object.keys(ESCAPE_LIVE_MIX).every(function(type) { return counts[type] === ESCAPE_LIVE_MIX[type]; });
  };
  var escapeMixIsPlayable = function(puzzles) {
    var counts = escapeMixCounts(puzzles);
    return (puzzles || []).length >= 8 && (counts.mcq || 0) <= 2 && ESCAPE_PUZZLE_TYPES.every(function(type) { return counts[type] > 0; });
  };
  // Pending AI requests. Module scope, because the host recreates the engine on every render.
  var escapeRoomRequests = { room: null, puzzle: null };
  var newEscapeRequestId = function() { return 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2); };
  var ESCAPE_TYPE_CONTRACT = 'FIELD RULES: every puzzle has "id", "type", "linkedObjectId", "question" and a vague "hint". ' +
    '"mcq": 4 different "options" and "correctIndex" (0-based). ' +
    '"sequence": "items" listed in the CORRECT order and "correctOrder" [0,1,2,...]; the question names the ordering rule. ' +
    '"matching": 4 "pairs" of {"left","right"}, every left and right value different. ' +
    '"fillin": "sentence" with _____ where the answer goes, "answer", and "wordbank" with the answer plus 3 decoys. ' +
    '"cipher": "encodedText" (a riddle that does not contain its answer), "answer", and "wordbank" with the answer plus 3 decoys. ' +
    '"scramble": "answer" (one key term) and "scrambledWord".';
  var reportEscapeRoomIssue = function(stage, problems) {
    var message = '[Puzzle Challenge] ' + stage + ': ' + problems.slice(0, 8).join(' | ');
    try {
      var reporter = window.AlloModules && window.AlloModules.ErrorReporter;
      if (reporter && typeof reporter.record === 'function') reporter.record('warn', message, '', 'escape_room_module.js', 0, 0);
    } catch (e) {}
    return message;
  };

  // A shared keyboard contract for the solo and editor dialogs.
  function useEscapeRoomDialog(open, close) {
    var ref = useRef(null);
    var triggerRef = useRef(null);
    var wasOpen = useRef(false);
    var closeRef = useRef(close);
    closeRef.current = close;
    // Capture before React commits autoFocus inputs.
    if (open && !wasOpen.current) triggerRef.current = document.activeElement;
    wasOpen.current = !!open;
    useEffect(function() {
      if (!open || !ref.current) return;
      var dialog = ref.current;
      var trigger = triggerRef.current;
      var focusable = function() {
        return Array.prototype.slice.call(dialog.querySelectorAll('button, input, select, textarea, a[href], [tabindex]')).filter(function(el) {
          return !el.disabled && el.tabIndex >= 0 && !el.closest('[hidden], [aria-hidden="true"]');
        });
      };
      (focusable()[0] || dialog).focus();
      var onKeyDown = function(event) {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          closeRef.current();
        } else if (event.key === 'Tab') {
          var controls = focusable();
          var first = controls[0] || dialog;
          var last = controls[controls.length - 1] || dialog;
          if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) {
            event.preventDefault(); last.focus();
          } else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement))) {
            event.preventDefault(); first.focus();
          }
        }
      };
      dialog.addEventListener('keydown', onKeyDown);
      return function() {
        dialog.removeEventListener('keydown', onKeyDown);
        if (trigger && trigger.isConnected && !trigger.disabled) trigger.focus();
        else {
          var next = document.querySelector('[data-escape-room-next]:not([disabled])');
          if (next) next.focus();
        }
      };
    }, [open]);
    return ref;
  }

  var escapeRoomPresets = {
    easy: { timePerPuzzle: 45, lives: 99, hints: 5, xpMultiplier: 0.5 },
    normal: { timePerPuzzle: 30, lives: 3, hints: 3, xpMultiplier: 1 },
    hard: { timePerPuzzle: 20, lives: 1, hints: 1, xpMultiplier: 2 }
  };
  var escapeRoomAttempt = function() {
    return { selectedObject: null, discoveredClues: {}, finalDoorUnlocked: false, showFinalDoor: false,
      solvedPuzzles: new Set(), hintsUsed: {}, totalHintsUsed: 0, wrongAttempts: 0,
      currentStreak: 0, bestStreak: 0, streakMultiplier: 1, xpEarned: 0, runScore: 0,
      textInput: '', sequenceOrder: [], matchingPairs: [], matchingSelected: null,
      puzzleDrafts: {}, showClueAnimation: false, isEscaped: false, isGameOver: false,
      gameOverReason: null, timerPaused: true, hasStarted: false };
  };
  var rememberEscapeRoomDraft = function(room) {
    var puzzle = room.selectedObject && (room.puzzles || []).find(function(p) { return p.linkedObjectId === room.selectedObject.id; });
    var drafts = Object.assign({}, room.puzzleDrafts);
    if (puzzle && !room.solvedPuzzles.has(puzzle.id)) drafts[puzzle.id] = {
      textInput: room.textInput || '', sequenceOrder: (room.sequenceOrder || []).slice(),
      matchingPairs: (room.matchingPairs || []).slice(), matchingSelected: room.matchingSelected || null
    };
    return Object.assign({}, room, { puzzleDrafts: drafts, selectedObject: null });
  };
  // Stable content identity keeps different rooms separate while preserving replay high scores.
  var escapeRoomScoreId = function(room) {
    var content = JSON.stringify({ room: room.room, puzzles: (room.puzzles || []).map(function(p) {
      return [p.id, p.type, p.question, p.sentence, p.encodedText, p.answer, p.options, p.correctIndex, p.items, p.correctOrder, p.pairs];
    }), finalDoor: room.finalDoorPuzzle && [room.finalDoorPuzzle.sentence, room.finalDoorPuzzle.answer] });
    var hash = 2166136261;
    for (var i=0; i<content.length; i++) hash = Math.imul(hash ^ content.charCodeAt(i), 16777619);
    return 'escape-room-' + (hash >>> 0).toString(16);
  };

  function createEscapeRoomEngine(deps) {
    var callGemini = deps.callGemini;
    var addToast = deps.addToast;
    var t = deps.t;
    var handleScoreUpdate = deps.handleScoreUpdate;
    var setGlobalPoints = deps.setGlobalPoints;
    var playSound = deps.playSound;
    var getState = deps.getState;
    var setState = deps.setState;
    var firebase = deps.firebase || {};
    var db = firebase.db;
    var doc = firebase.doc;
    var updateDoc = firebase.updateDoc;
    var shared = deps.shared || {};
    var safeGetItem = shared.safeGetItem || function(k) { try { return localStorage.getItem(k); } catch(e) { return null; } };
    var safeSetItem = shared.safeSetItem || function(k,v) { try { localStorage.setItem(k,v); } catch(e) {} };
    var warnLog = shared.warnLog || function() { console.warn.apply(console, arguments); };
    // Optional host wiring for embedding the escape room into the
    // active exit ticket / quiz resource so the config travels with
    // the file (instead of only living in teacher-local storage).
    // setHistory mutates the resource history array; getCurrentResourceId
    // returns the id of the resource currently being viewed (e.g.
    // generatedContent?.id). Both are no-ops if not wired.
    var setHistoryDep = deps.setHistory || null;
    var getCurrentResourceId = deps.getCurrentResourceId || function() { return null; };

    var canPlay = function(state) {
      var room = state.escapeRoomState;
      return room && room.isActive && !room.isPreview && !room.isGenerating && !room.isEscaped && !room.isGameOver &&
        state.isEscapeTimerRunning !== false && (room.timerEnabled === false || !Number.isFinite(state.escapeTimeLeft) || state.escapeTimeLeft > 0);
    };
    var awardXP = function(state, points, suffix) {
      // A teacher's trial run of the preview never earns or records XP.
      if (state.escapeRoomState && state.escapeRoomState.isTrial) return 0;
      var id = escapeRoomScoreId(state.escapeRoomState) + ':' + suffix;
      var previous = state.completedActivities && typeof state.completedActivities.get === 'function' ? state.completedActivities.get(id) || 0 : 0;
      handleScoreUpdate(points, 'Puzzle Challenge', id);
      return Math.max(0, points - previous);
    };

    // ── generateEscapeRoom ──
    var generateEscapeRoom = async function() {
      var state = getState();
      var inputText = state.inputText;
      var escapeRoomState = state.escapeRoomState;
      if (!inputText || !inputText.trim()) {
        addToast(t('errors.no_text'), 'error');
        return;
      }
      var puzzleCount = (escapeRoomState && escapeRoomState.puzzleCount) || 10;
      var difficultyPresets = {
        easy: { timePerPuzzle: 45, lives: 99, hints: 5, xpMultiplier: 0.5 },
        normal: { timePerPuzzle: 30, lives: 3, hints: 3, xpMultiplier: 1.0 },
        hard: { timePerPuzzle: 20, lives: 1, hints: 1, xpMultiplier: 2.0 }
      };
      var selectedDifficulty = (escapeRoomState && escapeRoomState.difficulty) || 'normal';
      var preset = difficultyPresets[selectedDifficulty] || difficultyPresets.normal;
      var totalTime = puzzleCount * preset.timePerPuzzle;
      var requestId = newEscapeRequestId();
      escapeRoomRequests.room = requestId;
      setState.setEscapeRoomState(function(prev) {
        return Object.assign({}, prev, escapeRoomAttempt(), {
          isActive: true,
          isGenerating: true,
          isPreview: false,
          isTrial: false,
          confirmDiscard: false,
          previewNotes: null,
          room: null,
          puzzles: [],
          solvedPuzzles: new Set(),
          isEscaped: false,
          timeRemaining: totalTime,
          maxTime: totalTime,
          selectedObject: null,
          discoveredClues: {},
          finalDoorUnlocked: false,
          finalDoorPuzzle: null,
          showFinalDoor: false,
          difficulty: selectedDifficulty,
          lives: preset.lives,
          maxLives: preset.lives,
          hintsRemaining: preset.hints,
          maxHints: preset.hints,
          xpMultiplier: preset.xpMultiplier,
          streak: 0,
          wrongAttempts: 0,
          isGameOver: false,
          timerPaused: true
        });
      });
      setState.setEscapeTimeLeft(totalTime);
      setState.setIsEscapeTimerRunning(false);
      var escapeRoomPrompt = escapeRoomLanguageDirective(state) + 'You are creating an ADVANCED educational Puzzle Challenge with DIVERSE PUZZLE TYPES based on the following content.\n' +
'SOURCE CONTENT:\n' +
inputText.substring(0, 6000) + '\n' +
'TASK:\n' +
'Generate a themed puzzle challenge with ' + puzzleCount + ' interactive objects. Each object hides a DIFFERENT TYPE of puzzle.\n' +
'PUZZLE TYPES (use a variety - ensure good mix):\n' +
'1. "mcq" - Multiple choice question with 4 options\n' +
'2. "sequence" - Put 4-5 items in the correct order (chronological, size, importance, etc.). List "items" already in the CORRECT order and set "correctOrder" to [0,1,2,...]; the game shuffles them. The question must name the ordering rule.\n' +
'3. "cipher" - A content-based RIDDLE with word options. The riddle clues to a key vocabulary word. MUST include "wordbank" array with 1 correct + 3-4 decoy words\n' +
'4. "matching" - Match 4 pairs of related items (term<->definition, cause<->effect, etc.)\n' +
'5. "scramble" - Unscramble letters to form a key vocabulary word from the content\n' +
'6. "fillin" - Fill-in-the-blank CLOZE STYLE with wordbank (NO TYPING - student selects from choices). MUST include "wordbank" array with 1 correct + 3-4 decoys\n' +
'CLUE CHAIN:\n' +
'- Create connections between puzzles! When a puzzle is solved, it can reveal a clue that helps with another puzzle.\n' +
'- Puzzle 1 should reveal a clue for Puzzle 3\n' +
'- Puzzle 2 should reveal a clue for Puzzle 4\n' +
'- This creates a narrative flow and interdependency.\n' +
'FINAL DOOR:\n' +
'- Include a final synthesis puzzle that requires knowledge from solving the other puzzles\n' +
'- This should be a challenging fill-in-the-blank or short answer that ties everything together\n' +
'IMPORTANT:\n' +
'- Generate EXACTLY ' + puzzleCount + ' objects and ' + puzzleCount + ' puzzles\n' +
'- All content must be answerable from the source material\n' +
'- Theme should relate to the content topic (science lab, historical archive, mystery library, etc.)\n' +
'- Each object needs a thematic emoji and evocative name\n' +
'- Questions should test understanding, not just memorization\n' +
'- HINTS MUST BE VAGUE AND INDIRECT: Hints should NEVER reveal or strongly suggest the correct answer. Good hints encourage thinking about the topic area without pointing to specific answers. Bad: "The answer is the first option" or "It starts with P". Good: "Think about what you learned about energy..." or "Consider the time period...". Hints are a nudge in the right direction, NOT a giveaway.\n' +
ESCAPE_TYPE_CONTRACT + '\n' +
'Return ONLY valid JSON (no markdown wrapper):\n' +
'{\n' +
'  "room": {\n' +
'    "theme": "string (e.g., \'Ancient Library\', \'Space Station Lab\', \'Detective Office\')",\n' +
'    "description": "2-3 sentence atmospheric description setting the scene"\n' +
'  },\n' +
'  "objects": [\n' +
'    { "id": "obj1", "emoji": "\\ud83d\\udcd6", "name": "Old Book", "description": "A dusty tome with strange symbols" }\n' +
'  ],\n' +
'  "puzzles": [\n' +
'    {\n' +
'      "id": "p1",\n' +
'      "type": "mcq",\n' +
'      "linkedObjectId": "obj1",\n' +
'      "question": "Multiple choice question?",\n' +
'      "options": ["Option A", "Option B", "Option C", "Option D"],\n' +
'      "correctIndex": 0,\n' +
'      "hint": "Optional hint text",\n' +
'      "revealsClueFor": "p3",\n' +
'      "revealedClue": "The clue text that helps solve puzzle p3"\n' +
'    },\n' +
'    {\n' +
'      "id": "p2",\n' +
'      "type": "sequence",\n' +
'      "linkedObjectId": "obj2",\n' +
'      "question": "Put these items in the correct order:",\n' +
'      "items": ["First item", "Second item", "Third item", "Fourth item"],\n' +
'      "correctOrder": [0, 1, 2, 3],\n' +
'      "hint": "Think chronologically..."\n' +
'    },\n' +
'    {\n' +
'      "id": "p3",\n' +
'      "type": "fillin",\n' +
'      "linkedObjectId": "obj3",\n' +
'      "question": "Complete this sentence:",\n' +
'      "sentence": "The process of _____ converts sunlight into energy.",\n' +
'      "answer": "photosynthesis",\n' +
'      "wordbank": ["photosynthesis", "respiration", "digestion", "evaporation"],\n' +
'      "hint": "Plants do this with sunlight..."\n' +
'    },\n' +
'    {\n' +
'      "id": "p4",\n' +
'      "type": "matching",\n' +
'      "linkedObjectId": "obj4",\n' +
'      "question": "Match each term with its definition:",\n' +
'      "pairs": [\n' +
'        { "left": "Term 1", "right": "Definition 1" },\n' +
'        { "left": "Term 2", "right": "Definition 2" },\n' +
'        { "left": "Term 3", "right": "Definition 3" },\n' +
'        { "left": "Term 4", "right": "Definition 4" }\n' +
'      ],\n' +
'      "hint": "Think about the relationships..."\n' +
'    },\n' +
'    {\n' +
'      "id": "p5",\n' +
'      "type": "scramble",\n' +
'      "linkedObjectId": "obj5",\n' +
'      "question": "Unscramble this key term from the content:",\n' +
'      "scrambledWord": "NOMTPOAIHHS",\n' +
'      "answer": "PHOTOSYNTHESIS",\n' +
'      "hint": "It\'s a scientific process..."\n' +
'    },\n' +
'    {\n' +
'      "id": "p6",\n' +
'      "type": "cipher",\n' +
'      "linkedObjectId": "obj6",\n' +
'      "question": "Solve this riddle:",\n' +
'      "encodedText": "I am made by plants using sunlight. I am stored in glucose. I release oxygen as a byproduct. What process am I?",\n' +
'      "answer": "photosynthesis",\n' +
'      "wordbank": ["photosynthesis", "respiration", "decomposition", "fermentation"],\n' +
'      "hint": "Think about what plants do during the day..."\n' +
'    }\n' +
'  ],\n' +
'  "finalDoor": {\n' +
'    "sentence": "A fill-in-the-blank synthesis sentence with _____ for the blank",\n' +
'    "answer": "The expected answer word",\n' +
'    "wordbank": ["correct_answer", "decoy1", "decoy2", "decoy3"],\n' +
'    "acceptableAnswers": ["answer1", "answer2", "similar answer"]\n' +
'  }\n' +
'}';
      try {
        var prepared = await requestEscapeRoomData(escapeRoomPrompt, function(data) {
          return prepareEscapeRoomData(data, { expectedCount: puzzleCount, minPuzzles: Math.max(3, Math.ceil(puzzleCount * 0.6)) });
        }, function(result) { return result.ok && !result.problems.length; });
        if (escapeRoomRequests.room !== requestId) return;
        if (!prepared.ok) throw escapeRoomUnusable(prepared);
        showEscapeRoomPreview(prepared, { target: 'solo', requested: puzzleCount, difficulty: selectedDifficulty });
        playSound('correct');
      } catch (e) {
        failEscapeRoomGeneration(requestId, e);
      }
    };

    // ── Shared generation helpers ──
    // One model call, plus at most one repair call that sends back the specific
    // problems. Provider failures are not retried here; the host retries transient errors.
    var requestEscapeRoomData = async function(prompt, check, isGood) {
      var attempt = async function(text) {
        var response = await callGemini(text, true);
        var raw = typeof response === 'string' ? response.trim() : '';
        // callGemini answers "{}" for refusals and a missing key: an outage, not a room to repair.
        if (!raw || raw === '{}') { var empty = new Error('The AI returned no room.'); empty.provider = true; throw empty; }
        var parsed = parseEscapeRoomJson(raw);
        return { response: raw, prepared: parsed ? check(parsed) : { ok: false, puzzles: [], problems: ['The response was not valid JSON.'] } };
      };
      var first = await attempt(prompt);
      if (isGood(first.prepared)) return first.prepared;
      reportEscapeRoomIssue('generation check', first.prepared.problems);
      var second = null;
      try {
        second = await attempt(prompt + '\nREPAIR: Your previous JSON had these problems:\n- ' + first.prepared.problems.slice(0, 20).join('\n- ') +
          '\nReturn the COMPLETE corrected JSON for the whole room, following every rule above. Keep the puzzles that had no problems.\nPREVIOUS JSON:\n' + first.response.slice(0, 30000));
      } catch (e) {
        warnLog('Escape room repair request failed:', e);
      }
      if (!second) return first.prepared;
      if (!isGood(second.prepared)) reportEscapeRoomIssue('repair check', second.prepared.problems);
      if (isGood(second.prepared)) return second.prepared;
      if (isGood(first.prepared) || (first.prepared.ok && !second.prepared.ok)) return first.prepared;
      if (second.prepared.ok && !first.prepared.ok) return second.prepared;
      return (second.prepared.puzzles || []).length > (first.prepared.puzzles || []).length ? second.prepared : first.prepared;
    };
    var escapeRoomUnusable = function(prepared) {
      var error = new Error('Unusable escape room: ' + ((prepared && prepared.problems) || []).slice(0, 5).join(' '));
      error.unusable = true;
      return error;
    };
    var failEscapeRoomGeneration = function(requestId, e) {
      if (escapeRoomRequests.room !== requestId) return;
      escapeRoomRequests.room = null;
      warnLog('Escape room generation failed:', e);
      addToast(e && e.unusable
        ? (t('escape_room.generation_unusable') || 'The AI returned puzzles that could not be played, even after a repair attempt. Try again, or use a shorter source text.')
        : t('errors.generation_failed'), 'error');
      setState.setEscapeRoomState(function(prev) { return Object.assign({}, prev, { isActive: false, isGenerating: false }); });
    };
    // Opens the teacher preview for a checked room. Nothing reaches students from here.
    var showEscapeRoomPreview = function(prepared, meta) {
      escapeRoomRequests.room = null;
      var preset = escapeRoomPresets[meta.difficulty] || escapeRoomPresets.normal;
      var puzzles = processEscapeRoomPuzzles(prepared.puzzles, prepared.objects);
      var finalDoor = prepared.finalDoor && prepared.finalDoor.wordbank
        ? Object.assign({}, prepared.finalDoor, { wordbank: derangeShuffle(prepared.finalDoor.wordbank) }) : prepared.finalDoor;
      var totalTime = puzzles.length * preset.timePerPuzzle;
      var roomNotes = prepared.notes.room.slice();
      if (meta.requested && puzzles.length < meta.requested) roomNotes.push({ code: 'count_short', count: puzzles.length, requested: meta.requested });
      if (meta.target === 'live' && !escapeMixIsBalanced(prepared.puzzles)) roomNotes.push({ code: 'mix_relaxed' });
      setState.setEscapeRoomState(function(prev) {
        var next = Object.assign({}, prev, escapeRoomAttempt(), {
          isGenerating: false, isActive: false, isPreview: true, isTrial: false, isPublishing: false, confirmDiscard: false,
          previewTarget: meta.target, previewNotes: { room: roomNotes, byId: prepared.notes.byId },
          room: prepared.room, objects: prepared.objects, puzzles: puzzles, totalPuzzles: puzzles.length, finalDoorPuzzle: finalDoor,
          difficulty: meta.difficulty || prev.difficulty || 'normal', lives: preset.lives, maxLives: preset.lives,
          hintsRemaining: preset.hints, maxHints: preset.hints, xpMultiplier: preset.xpMultiplier, timeRemaining: totalTime, maxTime: totalTime
        });
        next.savedEscapeRoom = savedEscapeRoomFrom(next);
        return next;
      });
      setState.setEscapeTimeLeft(totalTime);
      setState.setIsEscapeTimerRunning(false);
    };
    // Recomputes everything derived from the puzzle list after a teacher edit.
    var withEscapeRoomEdits = function(prev, patch) {
      var next = Object.assign({}, prev, patch);
      var linked = {};
      (next.puzzles || []).forEach(function(p) { linked[p.linkedObjectId] = true; });
      next.objects = (next.objects || []).filter(function(o) { return linked[o.id]; });
      next.totalPuzzles = (next.puzzles || []).length;
      next.savedEscapeRoom = savedEscapeRoomFrom(next);
      return next;
    };

    // ── launchCollaborativeEscapeRoom ──
    // Collaborative rooms use the same six interaction types as the solo
    // escape room. Keep the generated mix explicit so a model cannot silently
    // fall back to the MCQ-only example in the output schema. The room opens in
    // the teacher preview first; publishEscapeRoomLive sends it to the class.
    var liveMixCheck = function(data) {
      var result = prepareEscapeRoomData(data, { expectedCount: 10, minPuzzles: 8 });
      if (result.ok && !escapeMixIsBalanced(result.puzzles)) {
        var counts = escapeMixCounts(result.puzzles);
        result.problems.push('Unbalanced collaborative puzzle mix: use exactly 2 mcq, 2 sequence, 2 matching, 2 fillin, 1 cipher and 1 scramble (this room has ' +
          Object.keys(counts).map(function(type) { return counts[type] + ' ' + type; }).join(', ') + ').');
      }
      return result;
    };

    var createLiveTeamProgress = function() {
      return { progressVersion: 2, maxHints: 3, solved: {}, misses: {},
        solvedPuzzles: [],
        isEscaped: false,
        lives: 3,
        maxLives: 3,
        wrongAttempts: 0,
        streak: 0,
        isGameOver: false,
        hintsRemaining: 3,
        revealedHints: {}
      };
    };

    var launchCollaborativeEscapeRoom = async function(options) {
      var state = getState();
      var inputText = state.inputText;
      var activeSessionCode = state.activeSessionCode;
      if (!activeSessionCode) {
        addToast(t('errors.no_session'), 'error');
        return;
      }
      // A room the teacher already reviewed opens again instead of being replaced.
      if (!(options && options.fresh) && hasEscapeRoomDraftIn(state.escapeRoomState)) {
        setState.setEscapeRoomState(function(prev) { return Object.assign({}, prev, { isPreview: true, previewTarget: 'live', confirmDiscard: false, showSettings: false }); });
        addToast(t('escape_room.preview_reopened') || 'Your reviewed room is open again. Choose New room to generate a different one.', 'info');
        return;
      }
      if (!inputText || !inputText.trim()) {
        addToast(t('errors.no_text'), 'error');
        return;
      }
      var requestId = newEscapeRequestId();
      escapeRoomRequests.room = requestId;
      setState.setEscapeRoomState(function(prev) {
        return Object.assign({}, prev, {
          isActive: true,
          isGenerating: true,
          isPreview: false,
          isTrial: false,
          confirmDiscard: false,
          room: null,
          puzzles: [],
          solvedPuzzles: new Set(),
          isEscaped: false,
          timeRemaining: 300
        });
      });
      var escapeRoomPrompt = escapeRoomLanguageDirective(state) + 'You are creating an educational Puzzle Challenge with DIVERSE PUZZLE TYPES based on the following content.\n' +
'SOURCE CONTENT:\n' +
inputText.substring(0, 6000) + '\n' +
'TASK:\n' +
'Generate a themed puzzle challenge with exactly 10 interactive objects and exactly 10 puzzles. Each object hides one puzzle.\n' +
'BALANCED PUZZLE MIX - this is mandatory: use exactly 2 "mcq", 2 "sequence", 2 "matching", 2 "fillin", 1 "cipher", and 1 "scramble". Every listed type must appear at least once, and MCQs must never exceed 2 of the 10 puzzles. Do not convert non-MCQ puzzles into multiple choice.\n' +
'TYPE CONTRACT: "mcq" has options + correctIndex; "sequence" has items + correctOrder; "matching" has pairs with left/right values; "fillin" has sentence + answer + wordbank; "cipher" has encodedText + answer + wordbank; "scramble" has scrambledWord + answer. Use these exact lowercase type names.\n' +
ESCAPE_TYPE_CONTRACT + '\n' +
'Return ONLY valid JSON:\n' +
'{\n' +
'  "room": { "theme": "string", "description": "2-3 sentence description" },\n' +
'  "objects": [\n' +
'    { "id": "obj1", "emoji": "\ud83d\udcd6", "name": "Object 1" }, { "id": "obj2", "emoji": "\ud83d\udd2d", "name": "Object 2" }, { "id": "obj3", "emoji": "\ud83c\udf1f", "name": "Object 3" }, { "id": "obj4", "emoji": "\ud83d\udd11", "name": "Object 4" }, { "id": "obj5", "emoji": "\ud83d\udcdc", "name": "Object 5" },\n' +
'    { "id": "obj6", "emoji": "\ud83e\udde9", "name": "Object 6" }, { "id": "obj7", "emoji": "\ud83c\udfdb", "name": "Object 7" }, { "id": "obj8", "emoji": "\ud83d\udee0", "name": "Object 8" }, { "id": "obj9", "emoji": "\ud83d\udca1", "name": "Object 9" }, { "id": "obj10", "emoji": "\ud83c\udf81", "name": "Object 10" }\n' +
'  ],\n' +
'  "puzzles": [\n' +
'    { "id": "p1", "type": "mcq", "linkedObjectId": "obj1", "question": "?", "options": ["A","B","C","D"], "correctIndex": 0, "hint": "" },\n' +
'    { "id": "p2", "type": "sequence", "linkedObjectId": "obj2", "question": "Put these in order", "items": ["A","B","C","D"], "correctOrder": [0,1,2,3], "hint": "" },\n' +
'    { "id": "p3", "type": "matching", "linkedObjectId": "obj3", "question": "Match the pairs", "pairs": [{ "left": "A", "right": "1" }, { "left": "B", "right": "2" }, { "left": "C", "right": "3" }, { "left": "D", "right": "4" }], "hint": "" },\n' +
'    { "id": "p4", "type": "fillin", "linkedObjectId": "obj4", "question": "Complete the sentence", "sentence": "The _____ is important.", "answer": "term", "wordbank": ["term","decoy1","decoy2","decoy3"], "hint": "" },\n' +
'    { "id": "p5", "type": "cipher", "linkedObjectId": "obj5", "question": "Solve the riddle", "encodedText": "A content-based riddle", "answer": "term", "wordbank": ["term","decoy1","decoy2","decoy3"], "hint": "" },\n' +
'    { "id": "p6", "type": "scramble", "linkedObjectId": "obj6", "question": "Unscramble the term", "scrambledWord": "MRET", "answer": "TERM", "hint": "" },\n' +
'    { "id": "p7", "type": "mcq", "linkedObjectId": "obj7", "question": "?", "options": ["A","B","C","D"], "correctIndex": 0, "hint": "" },\n' +
'    { "id": "p8", "type": "sequence", "linkedObjectId": "obj8", "question": "Put these in order", "items": ["A","B","C","D"], "correctOrder": [0,1,2,3], "hint": "" },\n' +
'    { "id": "p9", "type": "matching", "linkedObjectId": "obj9", "question": "Match the pairs", "pairs": [{ "left": "A", "right": "1" }, { "left": "B", "right": "2" }, { "left": "C", "right": "3" }, { "left": "D", "right": "4" }], "hint": "" },\n' +
'    { "id": "p10", "type": "fillin", "linkedObjectId": "obj10", "question": "Complete the sentence", "sentence": "The _____ is important.", "answer": "term", "wordbank": ["term","decoy1","decoy2","decoy3"], "hint": "" }\n' +
'  ]\n' +
'}';
      try {
        var prepared = await requestEscapeRoomData(escapeRoomPrompt, liveMixCheck, function(result) { return result.ok && !result.problems.length; });
        if (escapeRoomRequests.room !== requestId) return;
        if (!prepared.ok || !escapeMixIsPlayable(prepared.puzzles)) throw escapeRoomUnusable(prepared);
        showEscapeRoomPreview(prepared, { target: 'live', requested: 10, difficulty: 'normal' });
        playSound('correct');
      } catch (e) {
        failEscapeRoomGeneration(requestId, e);
      }
    };

    // ── publishEscapeRoomLive ──
    // Sends the room the teacher reviewed (with any edits) to the live session.
    var publishEscapeRoomLive = async function() {
      var state = getState();
      var room = state.escapeRoomState || {};
      var live = state.sessionData || {};
      if (!state.activeSessionCode || !(doc && db && updateDoc)) {
        addToast(t('errors.no_session'), 'error');
        return false;
      }
      if ((live.escapeRoomState && live.escapeRoomState.isActive) || (live.quizState && live.quizState.isActive)) {
        addToast(t('escape_room.end_live_activity_first') || 'End the current live activity before launching this room.', 'error');
        return false;
      }
      if (room.isPublishing) return false;
      var prepared = prepareEscapeRoomData(savedEscapeRoomFrom(room), { requireObjects: true });
      if (!prepared.ok) {
        addToast(t('escape_room.invalid_save') || 'Saved data is corrupted', 'error');
        return false;
      }
      // Firestore rejects undefined values; a JSON round trip drops them.
      var puzzles = JSON.parse(JSON.stringify(processEscapeRoomPuzzles(prepared.puzzles, prepared.objects)));
      var objects = JSON.parse(JSON.stringify(prepared.objects));
      var roomInfo = JSON.parse(JSON.stringify(prepared.room));
      setState.setEscapeRoomState(function(prev) { return Object.assign({}, prev, { isPublishing: true }); });
      try {
        var sessionRef = doc(db, 'artifacts', state.activeSessionAppId, 'public', 'data', 'sessions', state.activeSessionCode);
        await updateDoc(sessionRef, {
          'escapeRoomState': {
            isActive: true,
            room: roomInfo,
            puzzles: puzzles,
            objects: objects,
            teams: {},
            teamProgress: {
              Red: createLiveTeamProgress(),
              Blue: createLiveTeamProgress(),
              Green: createLiveTeamProgress(),
              Yellow: createLiveTeamProgress()
            },
            timeRemaining: 300,
            endsAt: Date.now() + 300000,
            isGameOver: false,
            isPaused: false,
            startedAt: Date.now(),
            hostId: (state.user && state.user.uid) || null
          }
        });
      } catch (e) {
        warnLog('Collaborative escape room launch failed:', e);
        addToast(t('escape_room.launch_failed') || 'The room could not be sent to the class. Check the connection and try again.', 'error');
        setState.setEscapeRoomState(function(prev) { return Object.assign({}, prev, { isPublishing: false }); });
        return false;
      }
      setState.setEscapeRoomState(function(prev) {
        return Object.assign({}, prev, {
          isPublishing: false, isPreview: false, isActive: true, isGenerating: false, isTrial: false, confirmDiscard: false, previewTarget: null,
          room: roomInfo, puzzles: puzzles, objects: objects, totalPuzzles: puzzles.length
        });
      });
      playSound('correct');
      addToast(t('escape_room.team_race'), 'success');
      return true;
    };

    // ── launchConceptQuest ──
    // Concept Quest deliberately reuses the escapeRoomState/teamProgress live
    // envelope. Firestore and the Google Mailbox adapter therefore transport
    // identical state and participant writes without a second backend path.
    var launchConceptQuest = async function() {
      var translateQuest = function(key, fallback, params) {
        var fullKey = 'concept_quest.' + key;
        var translated = t(fullKey, params || {});
        if (typeof translated === 'string' && translated && translated !== fullKey) return translated;
        return Object.keys(params || {}).reduce(function(text, name) {
          return text.replace('{' + name + '}', params[name]);
        }, fallback);
      };
      var state = getState();
      var activeSessionCode = state.activeSessionCode;
      var activeSessionAppId = state.activeSessionAppId;
      var generatedContent = state.generatedContent;
      var user = state.user;
      if (!activeSessionCode) {
        addToast(t('errors.no_session') || 'Start a live session first.', 'error');
        return;
      }
      var questEngine = window.AlloModules && window.AlloModules.ConceptQuestEngine;
      if (!questEngine || typeof questEngine.createSession !== 'function') {
        addToast(translateQuest('loading_retry', 'Concept Quest is still loading. Try again in a moment.'), 'error');
        return;
      }
      var data = generatedContent && generatedContent.data || {};
      var questions = Array.isArray(data.questions) ? data.questions : [];
      var title = data.title || generatedContent && generatedContent.title || translateQuest('title', 'Concept Quest');
      try {
      var quest = questEngine.createSession({
        title: translateQuest('session_title', '{title}: Concept Quest', { title: title }),
        objective: translateQuest('objective', 'Navigate together, use lesson concepts as abilities, and defeat the final misconception.'),
        questions: questions,
        translate: translateQuest
      });
      var allProgress = createLiveTeamProgress();
      allProgress.questVotes = {};
      allProgress.questVoteTurns = {};
      allProgress.questActions = {};
      allProgress.questRoles = {};
      allProgress.isEscaped = false;
        if (doc && db && updateDoc) {
          var sessionRef = doc(db, 'artifacts', activeSessionAppId, 'public', 'data', 'sessions', activeSessionCode);
          await updateDoc(sessionRef, {
            'escapeRoomState': {
              mode: 'concept-quest',
              isActive: true,
              isCoopMode: true,
              isPaused: false,
              isGameOver: false,
              room: { theme: quest.title, description: quest.objective },
              puzzles: [],
              objects: [],
              teams: {},
              teamProgress: { All: allProgress },
              conceptQuest: quest,
              timeRemaining: 0,
              startedAt: Date.now(),
              hostId: user && user.uid || null
            }
          });
        }
        setState.setEscapeRoomState(function(prev) {
          return Object.assign({}, prev, {
            mode: 'concept-quest', isActive: true, isGenerating: false,
            room: { theme: quest.title, description: quest.objective }, conceptQuest: quest
          });
        });
        playSound('correct');
        addToast(translateQuest('launched', 'Concept Quest launched. You are the co-GM.'), 'success');
      } catch (e) {
        warnLog('Concept Quest launch failed:', e);
        addToast(e && e.message || translateQuest('launch_failed', 'Concept Quest could not launch.'), 'error');
      }
    };

    // ── endCollaborativeEscapeRoom ──
    var endCollaborativeEscapeRoom = async function() {
      var state = getState();
      var activeSessionCode = state.activeSessionCode;
      var activeSessionAppId = state.activeSessionAppId;
      // Closing a teacher's local trial must not touch the live session.
      if (state.escapeRoomState && state.escapeRoomState.isTrial) { endEscapeRoomTrial(); return; }
      if (!activeSessionCode) return;
      try {
        if (doc && db && updateDoc) {
          var sessionRef = doc(db, 'artifacts', activeSessionAppId, 'public', 'data', 'sessions', activeSessionCode);
          await updateDoc(sessionRef, { 'escapeRoomState.isActive': false });
        }
        addToast(t('escape_room.end_game'), 'success');
      } catch (e) { warnLog('Failed to end escape room:', e); }
      resetEscapeRoom();
    };

    // ── handlePuzzleSolved ──
    var handlePuzzleSolved = function(puzzleId) {
      var state = getState();
      var escapeRoomState = state.escapeRoomState;
      var activeSessionCode = state.activeSessionCode;
      var sessionData = state.sessionData;
      var user = state.user;
      var activeSessionAppId = state.activeSessionAppId;
      var puzzle = escapeRoomState.puzzles.find(function(p) { return p.id === puzzleId; });
      if (!puzzle || !canPlay(state) || escapeRoomState.solvedPuzzles.has(puzzleId)) return;
      playSound('correct');
      var newSolved = new Set(escapeRoomState.solvedPuzzles);
      newSolved.add(puzzleId);
      var newClues = Object.assign({}, escapeRoomState.discoveredClues);
      if (puzzle.revealsClueFor && puzzle.revealedClue) {
        newClues[puzzle.revealsClueFor] = puzzle.revealedClue;
      }
      var allSolved = newSolved.size >= escapeRoomState.puzzles.length;
      var shouldUnlockDoor = allSolved && !!escapeRoomState.finalDoorPuzzle && !escapeRoomState.finalDoorUnlocked;
      var baseXP = 20;
      var calculatedStreak = (escapeRoomState.currentStreak || 0) + 1;
      var streakMultiplier = calculatedStreak >= 5 ? 3 : calculatedStreak >= 3 ? 2 : 1;
      var difficultyMultiplier = (escapeRoomPresets[escapeRoomState.difficulty] || escapeRoomPresets.normal).xpMultiplier;
      var hintPenalty = ((escapeRoomState.hintsUsed && escapeRoomState.hintsUsed[puzzleId]) ? 1 : 0) * 5;
      var escapeTimeLeft = state.escapeTimeLeft;
      var timeBonus = escapeRoomState.timerEnabled !== false && escapeTimeLeft > 180 ? 10 :
                      escapeRoomState.timerEnabled !== false && escapeTimeLeft > 60 ? 5 : 0;
      var puzzleXP = Math.max(5, Math.round((baseXP * streakMultiplier * difficultyMultiplier) + timeBonus - hintPenalty));
      var completionBonus = allSolved ? (escapeRoomState.difficulty === 'hard' ? 75 : escapeRoomState.difficulty === 'easy' ? 25 : 50) : 0;
      var finishWithoutDoor = allSolved && !escapeRoomState.finalDoorPuzzle;
      var perfectBonus = finishWithoutDoor && !escapeRoomState.wrongAttempts && !escapeRoomState.totalHintsUsed ? 50 : 0;
      var earned = awardXP(state, puzzleXP, 'puzzle:' + puzzleId);
      if (completionBonus) earned += awardXP(state, completionBonus, 'complete');
      if (perfectBonus) earned += awardXP(state, perfectBonus, 'perfect');
      if (finishWithoutDoor) setState.setIsEscapeTimerRunning(false);
      setState.setEscapeRoomState(function(prev) {
        return Object.assign({}, prev, {
          solvedPuzzles: newSolved,
          xpEarned: (prev.xpEarned || 0) + earned,
          runScore: (prev.runScore || 0) + puzzleXP + completionBonus + perfectBonus,
          isEscaped: finishWithoutDoor,
          timerPaused: finishWithoutDoor,
          selectedObject: null,
          discoveredClues: newClues,
          finalDoorUnlocked: shouldUnlockDoor || prev.finalDoorUnlocked,
          showClueAnimation: puzzle.revealsClueFor ? true : false,
          currentStreak: calculatedStreak,
          bestStreak: Math.max(prev.bestStreak || 0, calculatedStreak),
          streakMultiplier: streakMultiplier,
          textInput: '',
          sequenceOrder: [],
          matchingPairs: [],
          matchingSelected: null,
          scrambleLetters: []
        });
      });
      if (!escapeRoomState.isTrial && activeSessionCode && sessionData && sessionData.escapeRoomState && sessionData.escapeRoomState.isActive && user && user.uid) {
        var userTeam = sessionData.escapeRoomState.teams && sessionData.escapeRoomState.teams[user.uid];
        if (userTeam && doc && db && updateDoc) {
          // Path fix 2026-07-02: this ref was missing the 'public','data'
          // segments, so team-progress sync silently wrote to a nonexistent
          // doc (updateDoc failed into the catch below) — teams never saw
          // each other's solves.
          var sessionRef = doc(db, 'artifacts', activeSessionAppId, 'public', 'data', 'sessions', activeSessionCode);
          var currentSolved = (sessionData.escapeRoomState.teamProgress && sessionData.escapeRoomState.teamProgress[userTeam] && sessionData.escapeRoomState.teamProgress[userTeam].solvedPuzzles) || [];
          var totalPuzzles = (sessionData.escapeRoomState.puzzles && sessionData.escapeRoomState.puzzles.length) || 5;
          var combined = currentSolved.concat([puzzleId]);
          var newTeamSolved = combined.filter(function(v, i, a) { return a.indexOf(v) === i; });
          var isEscaped = newTeamSolved.length >= totalPuzzles;
          var updates = {};
          updates['escapeRoomState.teamProgress.' + userTeam + '.solvedPuzzles'] = newTeamSolved;
          updates['escapeRoomState.teamProgress.' + userTeam + '.isEscaped'] = isEscaped;
          updateDoc(sessionRef, updates).catch(function(e) { warnLog('Failed to sync puzzle progress:', e); });
          if (isEscaped) {
            addToast(t('escape_room.team_escaped', { team: userTeam }), 'success');
          }
        }
      }
      if (calculatedStreak === 3) {
        addToast('\uD83D\uDD25 ' + t('escape_room.streak_bonus', { streak: 3, multiplier: 2 }), 'success');
      } else if (calculatedStreak === 5) {
        addToast('\uD83D\uDD25\uD83D\uDD25\uD83D\uDD25 ' + t('escape_room.streak_bonus', { streak: 5, multiplier: 3 }), 'success');
      }
      if (puzzle.revealsClueFor && puzzle.revealedClue) {
        addToast(t('escape_room.clue_found') + ' ' + puzzle.revealedClue, 'info');
      }
      var xpMessage = streakMultiplier > 1
        ? t('escape_room.xp_earned_streak', { xp: puzzleXP, multiplier: streakMultiplier })
        : t('escape_room.xp_earned', { xp: puzzleXP });
      addToast(t('escape_room.correct') + ' ' + xpMessage, 'success');
      if (shouldUnlockDoor) addToast(t('escape_room.final_door_ready'), 'info');
      if (completionBonus) addToast(t('escape_room.all_solved_bonus', { xp: completionBonus }), 'success');
    };

    // ── handleSelectObject ──
    var handleSelectObject = function(obj) {
      var state = getState();
      var room = state.escapeRoomState;
      if (!obj || !canPlay(state)) return;
      var puzzle = room.puzzles.find(function(p) { return p.linkedObjectId === obj.id; });
      if (!puzzle || room.solvedPuzzles.has(puzzle.id)) return;
      setState.setEscapeRoomState(function(prev) {
        var remembered = rememberEscapeRoomDraft(prev);
        var draft = remembered.puzzleDrafts[puzzle.id] || { textInput: '', sequenceOrder: [], matchingPairs: [], matchingSelected: null };
        return Object.assign({}, remembered, draft, { selectedObject: obj, timerPaused: false, hasStarted: true });
      });
      playSound('click');
    };

    // A mistake changes the same clock shown to the player, plus the selected life budget.
    var handleWrongAnswer = function(puzzleId) {
      var state = getState();
      var room = state.escapeRoomState;
      if (!canPlay(state) || (puzzleId && room.solvedPuzzles.has(puzzleId))) return;
      var timed = room.timerEnabled !== false;
      var remaining = Number.isFinite(state.escapeTimeLeft) ? state.escapeTimeLeft : (room.timeRemaining || 0);
      var nextTime = timed ? Math.max(0, remaining - 10) : remaining;
      var maxLives = Number.isFinite(room.maxLives) ? room.maxLives : (escapeRoomPresets[room.difficulty] || escapeRoomPresets.normal).lives;
      var currentLives = Number.isFinite(room.lives) ? room.lives : maxLives;
      var finiteLives = maxLives < 99;
      var nextLives = finiteLives ? Math.max(0, currentLives - 1) : currentLives;
      var reason = timed && nextTime === 0 ? 'time' : finiteLives && nextLives === 0 ? 'lives' : null;
      playSound('incorrect');
      if (timed) setState.setEscapeTimeLeft(nextTime);
      if (reason) setState.setIsEscapeTimerRunning(false);
      setState.setEscapeRoomState(function(prev) {
        return Object.assign({}, prev, { wrongAttempts: (prev.wrongAttempts || 0) + 1, currentStreak: 0,
          streakMultiplier: 1, timeRemaining: nextTime, lives: nextLives, maxLives: maxLives,
          isGameOver: !!reason, gameOverReason: reason, timerPaused: !!reason,
          selectedObject: reason ? null : prev.selectedObject, showFinalDoor: reason ? false : prev.showFinalDoor });
      });
      addToast(reason ? t(reason === 'time' ? 'escape_room.game_over_time' : 'escape_room.game_over') :
        t('escape_room.incorrect') + (timed ? ' ' + t('escape_room.time_penalty', { seconds: 10 }) : '') + (finiteLives ? ' ' + t('escape_room.lives_remaining', { count: nextLives }) : ''), 'error');
    };

    // ── handleEscapeRoomAnswer ──
    var handleEscapeRoomAnswer = function(puzzleId, selectedIndex) {
      var state = getState();
      var escapeRoomState = state.escapeRoomState;
      var puzzle = escapeRoomState.puzzles.find(function(p) { return p.id === puzzleId; });
      if (!puzzle || !canPlay(state) || escapeRoomState.solvedPuzzles.has(puzzleId)) return;
      if (selectedIndex === puzzle.correctIndex) {
        handlePuzzleSolved(puzzleId);
      } else {
        handleWrongAnswer(puzzleId);
      }
    };

    // ── handleSequenceAnswer ──
    var handleSequenceAnswer = function(puzzleId, userOrder) {
      var state = getState();
      var escapeRoomState = state.escapeRoomState;
      var puzzle = escapeRoomState.puzzles.find(function(p) { return p.id === puzzleId; });
      if (!puzzle || !canPlay(state) || escapeRoomState.solvedPuzzles.has(puzzleId)) return;
      var isCorrect = JSON.stringify(userOrder) === JSON.stringify(puzzle.correctOrder);
      if (isCorrect) {
        handlePuzzleSolved(puzzleId);
      } else {
        handleWrongAnswer(puzzleId);
      }
    };

    // ── handleCipherAnswer ──
    var handleCipherAnswer = function(puzzleId, userAnswer) {
      var state = getState();
      var escapeRoomState = state.escapeRoomState;
      var puzzle = escapeRoomState.puzzles.find(function(p) { return p.id === puzzleId; });
      if (!puzzle || !canPlay(state) || escapeRoomState.solvedPuzzles.has(puzzleId)) return;
      var normalizedUser = normalizeEscapeAnswer(userAnswer);
      var normalizedAnswer = normalizeEscapeAnswer(puzzle.answer);
      if (!normalizedAnswer) { handleWrongAnswer(puzzleId); return; }
      if (normalizedUser === normalizedAnswer) {
        handlePuzzleSolved(puzzleId);
      } else {
        handleWrongAnswer(puzzleId);
      }
    };

    // ── handleMatchingSelect ──
    var handleMatchingSelect = function(puzzleId, item, column) {
      var state = getState();
      var escapeRoomState = state.escapeRoomState;
      var puzzle = escapeRoomState.puzzles.find(function(p) { return p.id === puzzleId; });
      if (!puzzle || !canPlay(state) || escapeRoomState.solvedPuzzles.has(puzzleId)) return;
      if ((column !== 'left' && column !== 'right') || !puzzle.pairs.some(function(pair) { return pair[column] === item; })) return;
      if ((escapeRoomState.matchingPairs || []).some(function(pair) { return pair[column === 'left' ? 0 : 1] === item; })) return;
      var currentSelected = escapeRoomState.matchingSelected;
      if (!currentSelected) {
        setState.setEscapeRoomState(function(prev) {
          return Object.assign({}, prev, { matchingSelected: { item: item, column: column } });
        });
      } else if (currentSelected.column === column) {
        setState.setEscapeRoomState(function(prev) {
          return Object.assign({}, prev, { matchingSelected: { item: item, column: column } });
        });
      } else {
        var pair = currentSelected.column === 'left'
          ? [currentSelected.item, item]
          : [item, currentSelected.item];
        var isCorrectPair = puzzle.pairs.some(function(p) {
          return p.left === pair[0] && p.right === pair[1];
        });
        if (isCorrectPair) {
          var newPairs = (escapeRoomState.matchingPairs || []).concat([pair]);
          if (newPairs.length >= puzzle.pairs.length) {
            handlePuzzleSolved(puzzleId);
          } else {
            playSound('click');
            setState.setEscapeRoomState(function(prev) {
              return Object.assign({}, prev, { matchingPairs: newPairs, matchingSelected: null });
            });
          }
        } else {
          handleWrongAnswer(puzzleId);
          setState.setEscapeRoomState(function(prev) { return Object.assign({}, prev, { matchingSelected: null }); });
        }
      }
    };

    // ── handleScrambleAnswer ──
    var handleScrambleAnswer = function(puzzleId, userAnswer) {
      var state = getState();
      var escapeRoomState = state.escapeRoomState;
      var puzzle = escapeRoomState.puzzles.find(function(p) { return p.id === puzzleId; });
      if (!puzzle || !canPlay(state) || escapeRoomState.solvedPuzzles.has(puzzleId)) return;
      var normalizedUser = normalizeEscapeAnswer(userAnswer).replace(/\s/g, '');
      var normalizedAnswer = normalizeEscapeAnswer(puzzle.answer).replace(/\s/g, '');
      if (!normalizedAnswer) { handleWrongAnswer(puzzleId); return; }
      if (normalizedUser === normalizedAnswer) {
        handlePuzzleSolved(puzzleId);
      } else {
        handleWrongAnswer(puzzleId);
      }
    };

    // ── handleFillinAnswer ──
    var handleFillinAnswer = function(puzzleId, userAnswer) {
      handleCipherAnswer(puzzleId, userAnswer);
    };

    // ── handleFinalDoorAnswer ──
    var handleFinalDoorAnswer = function(userAnswer) {
      var state = getState();
      var escapeRoomState = state.escapeRoomState;
      var finalPuzzle = escapeRoomState.finalDoorPuzzle;
      if (!finalPuzzle || !escapeRoomState.finalDoorUnlocked || !canPlay(state)) return;
      var normalizedUser = normalizeEscapeAnswer(userAnswer);
      if (!normalizedUser) return;
      var acceptableAnswers = [finalPuzzle.answer].concat(Array.isArray(finalPuzzle.acceptableAnswers) ? finalPuzzle.acceptableAnswers : [])
        .map(normalizeEscapeAnswer).filter(Boolean);
      var isCorrect = acceptableAnswers.indexOf(normalizedUser) !== -1;
      if (isCorrect) {
        playSound('correct');
        var isPerfect = (escapeRoomState.wrongAttempts || 0) === 0 && !escapeRoomState.totalHintsUsed;
        var perfectEarned = 0;
        if (isPerfect) {
          var bonusXP = 50;
          perfectEarned = awardXP(state, bonusXP, 'perfect');
          addToast(t('escape_room.victory_perfect'), 'success');
        } else {
          addToast(t('escape_room.victory_normal'), 'success');
        }
        setState.setEscapeRoomState(function(prev) {
          return Object.assign({}, prev, { isEscaped: true, showFinalDoor: false, timerPaused: true, xpEarned: (prev.xpEarned || 0) + perfectEarned, runScore: (prev.runScore || 0) + (isPerfect ? 50 : 0) });
        });
        setState.setIsEscapeTimerRunning(false);
      } else {
        handleWrongAnswer();
      }
    };

    // ── resetEscapeRoom ──
    var resetEscapeRoom = function(options) {
      var current = getState().escapeRoomState || {};
      // Closing a trial run returns the teacher to the preview with their edits intact.
      if (!(options && options.replay === true) && current.isTrial && current.room) { endEscapeRoomTrial(); return; }
      if (!(options && options.replay === true)) { escapeRoomRequests.room = null; escapeRoomRequests.puzzle = null; }
      setState.setIsEscapeTimerRunning(false);
      if (options && options.replay === true) {
        var room = getState().escapeRoomState;
        var config = { room: room.room, objects: room.objects, puzzles: room.puzzles, finalDoor: room.finalDoorPuzzle };
        if (_hydrateConfig(config, room.difficulty)) confirmEscapeRoomPreview();
        return;
      }
      setState.setEscapeTimeLeft(300);
      setState.setEscapeRoomState({
        isActive: false,
        room: null,
        puzzles: [],
        currentPuzzleIndex: null,
        solvedPuzzles: new Set(),
        totalPuzzles: 5,
        timeRemaining: 300,
        isEscaped: false,
        isGenerating: false,
        selectedObject: null,
        objects: [],
        wrongAttempts: 0,
        discoveredClues: {},
        sequenceOrder: [],
        matchingPairs: [],
        matchingSelected: null,
        scrambleLetters: [],
        textInput: '',
        showClueAnimation: false,
        finalDoorUnlocked: false,
        finalDoorPuzzle: null,
        showFinalDoor: false,
        difficulty: 'normal',
        timerEnabled: true,
        timerPaused: false,
        timeLimit: 300,
        hintsUsed: {},
        totalHintsUsed: 0,
        livesEnabled: false,
        livesRemaining: 3,
        maxLives: 3,
        currentStreak: 0,
        bestStreak: 0,
        streakMultiplier: 1,
        roomTheme: null,
        achievements: [],
        showSettings: false
      });
    };

    // ── handleRevealHint ──
    var handleRevealHint = function(puzzleId) {
      var state = getState();
      var escapeRoomState = state.escapeRoomState;
      var puzzle = escapeRoomState.puzzles.find(function(p) { return p.id === puzzleId; });
      if (!puzzle || !canPlay(state) || escapeRoomState.solvedPuzzles.has(puzzleId)) return;
      if (escapeRoomState.hintsUsed && escapeRoomState.hintsUsed[puzzleId]) {
        var hintText = puzzle.hint || (puzzle.hints && puzzle.hints[0]);
        if (hintText) {
          addToast('\uD83D\uDCA1 ' + t('escape_room.hint') + ': ' + hintText, 'info');
        }
        return;
      }
      if ((escapeRoomState.hintsRemaining || 0) <= 0) {
        addToast(t('escape_room.no_hints_remaining') || 'No hints remaining!', 'warning');
        return;
      }
      var hintText2 = puzzle.hint || (puzzle.hints && puzzle.hints[0]);
      if (!hintText2) {
        addToast(t('escape_room.no_hint_available') || 'No hint available for this puzzle', 'info');
        return;
      }
      // Charge the hint once, as a reduction to this puzzle's reward when solved.
      setState.setEscapeRoomState(function(prev) {
        var newHintsUsed = Object.assign({}, prev.hintsUsed);
        newHintsUsed[puzzleId] = true;
        return Object.assign({}, prev, {
          hintsRemaining: Math.max(0, (prev.hintsRemaining || 0) - 1),
          hintsUsed: newHintsUsed,
          totalHintsUsed: (prev.totalHintsUsed || 0) + 1
        });
      });
      addToast('\uD83D\uDCA1 ' + t('escape_room.hint') + ': ' + hintText2, 'info');
    };

    // ── openEscapeRoomSettings ──
    var openEscapeRoomSettings = function() {
      setState.setEscapeRoomState(function(prev) {
        return Object.assign({}, prev, {
          showSettings: true,
          puzzleCount: prev.puzzleCount || 10,
          difficulty: prev.difficulty || 'normal'
        });
      });
    };

    // ── updateEscapeRoomSetting ──
    var updateEscapeRoomSetting = function(key, value) {
      setState.setEscapeRoomState(function(prev) {
        var upd = {};
        upd[key] = value;
        return Object.assign({}, prev, upd);
      });
    };

    // ── launchEscapeRoomWithSettings ──
    var launchEscapeRoomWithSettings = function() {
      setState.setEscapeRoomState(function(prev) { return Object.assign({}, prev, { showSettings: false }); });
      generateEscapeRoom();
    };

    // ── confirmEscapeRoomPreview ──
    var confirmEscapeRoomPreview = function() {
      var current = getState().escapeRoomState || {};
      var preset = escapeRoomPresets[current.difficulty] || escapeRoomPresets.normal;
      // Edits can remove puzzles, so the clock follows the final puzzle count.
      var totalTime = (current.puzzles || []).length * preset.timePerPuzzle;
      setState.setEscapeRoomState(function(prev) {
        return Object.assign({}, prev, {
          isPreview: false,
          isActive: true,
          timerPaused: true,
          confirmDiscard: false
        }, totalTime ? { timeRemaining: totalTime, maxTime: totalTime } : {});
      });
      if (totalTime) setState.setEscapeTimeLeft(totalTime);
      playSound('correct');
      addToast(t('escape_room.preview_confirmed') || '\u2705 Puzzle Challenge locked \u2014 ready to play!', 'success');
    };

    // ── updateEscapeRoomPuzzle ──
    // Every field a teacher can change in the preview, answer keys included. The
    // saved copy is re-derived from the edited puzzles, so the two never drift.
    var updateEscapeRoomPuzzle = function(puzzleIndex, field, value) {
      setState.setEscapeRoomState(function(prev) {
        var old = prev.puzzles && prev.puzzles[puzzleIndex];
        if (!old) return prev;
        var p = Object.assign({}, old);
        if (['question', 'hint', 'sentence', 'encodedText'].indexOf(field) >= 0) p[field] = escapeText(value);
        else if (field === 'answer') {
          var answer = escapeText(value);
          if (Array.isArray(p.wordbank)) p.wordbank = replaceEscapeAnswer(p.wordbank, p.answer, answer);
          p.answer = answer;
          if (p.type === 'scramble') { p.scrambledWord = answer; p.displayLetters = derangeShuffle(escapeRoomLetters(answer)); }
        } else if (field === 'options' && p.type === 'mcq') {
          p.options = p.options.slice();
          p.options[value.index] = escapeText(value.text);
        } else if (field === 'correctIndex' && p.type === 'mcq') {
          var index = Number(value);
          if (!Number.isInteger(index) || index < 0 || index >= p.options.length) return prev;
          p.correctIndex = index;
        } else if (field === 'wordbank' && (p.type === 'fillin' || p.type === 'cipher')) {
          p.wordbank = escapeWordList(value, p.answer).words;
        } else if (field === 'item' && p.type === 'sequence') {
          // value.position counts in the correct order shown to the teacher.
          p.items = p.items.slice();
          p.items[p.correctOrder[value.position]] = escapeText(value.text);
        } else if (field === 'moveItem' && p.type === 'sequence') {
          var order = p.correctOrder.slice(), from = value.position, to = value.position + value.delta;
          if (to < 0 || to >= order.length) return prev;
          var moved = order[from]; order[from] = order[to]; order[to] = moved;
          p.correctOrder = order;
          p.shuffledItems = derangeShuffle(order);
        } else if (field === 'pair' && p.type === 'matching') {
          p.pairs = p.pairs.slice();
          var pair = Object.assign({}, p.pairs[value.index]);
          pair[value.side === 'right' ? 'right' : 'left'] = escapeText(value.text);
          p.pairs[value.index] = pair;
          p.leftColumn = derangeShuffle(p.pairs.map(function(x) { return x.left; }));
          p.rightColumn = derangeShuffle(p.pairs.map(function(x) { return x.right; }));
        } else return prev;
        var puzzles = prev.puzzles.slice();
        puzzles[puzzleIndex] = p;
        return withEscapeRoomEdits(prev, { puzzles: puzzles });
      });
    };

    // ── updateEscapeRoomFinalDoor ──
    var updateEscapeRoomFinalDoor = function(field, value) {
      setState.setEscapeRoomState(function(prev) {
        if (!prev.finalDoorPuzzle) return prev;
        var door = Object.assign({}, prev.finalDoorPuzzle);
        if (field === 'sentence') door.sentence = escapeText(value);
        else if (field === 'answer') {
          var answer = escapeText(value);
          if (Array.isArray(door.wordbank)) door.wordbank = replaceEscapeAnswer(door.wordbank, door.answer, answer);
          door.answer = answer;
        } else if (field === 'acceptableAnswers') door.acceptableAnswers = escapeWordList(value).words;
        else if (field === 'wordbank') door.wordbank = escapeWordList(value, door.answer).words;
        else return prev;
        return withEscapeRoomEdits(prev, { finalDoorPuzzle: door });
      });
    };

    // ── updateEscapeRoomRoom ── (theme and description)
    var updateEscapeRoomRoom = function(field, value) {
      if (field !== 'theme' && field !== 'description') return;
      setState.setEscapeRoomState(function(prev) {
        var info = Object.assign({}, prev.room);
        info[field] = escapeText(value);
        return withEscapeRoomEdits(prev, { room: info });
      });
    };

    // ── removeEscapeRoomPuzzle ──
    var removeEscapeRoomPuzzle = function(puzzleIndex) {
      setState.setEscapeRoomState(function(prev) {
        if (!prev.puzzles || prev.puzzles.length <= 1 || !prev.puzzles[puzzleIndex]) return prev;
        var removedId = prev.puzzles[puzzleIndex].id;
        var puzzles = prev.puzzles.filter(function(_, i) { return i !== puzzleIndex; }).map(function(p) {
          return p.revealsClueFor === removedId ? withoutKeys(p, ['revealsClueFor', 'revealedClue']) : p;
        });
        return withEscapeRoomEdits(prev, { puzzles: puzzles });
      });
    };

    // ── regenerateEscapeRoomPuzzle ──
    // Replaces one puzzle with a new version of the same type. The current puzzle
    // stays in place unless the replacement passes the same checks as a full room.
    var regenerateEscapeRoomPuzzle = async function(puzzleIndex) {
      var state = getState();
      var room = state.escapeRoomState || {};
      var puzzle = room.puzzles && room.puzzles[puzzleIndex];
      var inputText = state.inputText || '';
      if (!puzzle || room.regeneratingPuzzleId || !inputText.trim()) {
        if (puzzle && !inputText.trim()) addToast(t('errors.no_text'), 'error');
        return false;
      }
      var requestId = newEscapeRequestId();
      escapeRoomRequests.puzzle = requestId;
      setState.setEscapeRoomState(function(prev) { return Object.assign({}, prev, { regeneratingPuzzleId: puzzle.id }); });
      var others = room.puzzles.filter(function(_, i) { return i !== puzzleIndex; })
        .map(function(p) { return '- ' + escapeText(p.question || p.sentence || p.encodedText).slice(0, 160); }).join('\n');
      var prompt = escapeRoomLanguageDirective(state) + 'Write ONE new puzzle for an educational Puzzle Challenge, based on the source content below.\n' +
        'SOURCE CONTENT:\n' + inputText.substring(0, 6000) + '\n' +
        'Keep "id": "' + puzzle.id + '", "type": "' + puzzle.type + '" and "linkedObjectId": "' + puzzle.linkedObjectId + '". Test a different idea from the current puzzle and from the other puzzles. It must be answerable from the source.\n' +
        ESCAPE_TYPE_CONTRACT + '\n' +
        'CURRENT PUZZLE (replace it):\n' + JSON.stringify(toSavedEscapePuzzle(puzzle)).slice(0, 4000) + '\n' +
        'OTHER PUZZLES (do not repeat them):\n' + others + '\n' +
        'Return ONLY the JSON object for this one puzzle.';
      var fresh = null;
      try {
        var parsed = parseEscapeRoomJson(await callGemini(prompt, true));
        if (parsed && Array.isArray(parsed.puzzles)) parsed = parsed.puzzles[0];
        else if (parsed && isPlainObject(parsed.puzzle)) parsed = parsed.puzzle;
        if (isPlainObject(parsed)) {
          var candidate = Object.assign({}, parsed, { id: puzzle.id, type: puzzle.type, linkedObjectId: puzzle.linkedObjectId });
          if (puzzle.revealsClueFor && !candidate.revealsClueFor) Object.assign(candidate, { revealsClueFor: puzzle.revealsClueFor, revealedClue: puzzle.revealedClue });
          var check = checkEscapePuzzle(candidate);
          if (check.error) reportEscapeRoomIssue('puzzle regeneration check', ['The new puzzle ' + check.error + '.']);
          else fresh = check;
        }
      } catch (e) {
        warnLog('Escape room puzzle regeneration failed:', e);
      }
      if (escapeRoomRequests.puzzle !== requestId) return false;
      escapeRoomRequests.puzzle = null;
      setState.setEscapeRoomState(function(prev) {
        var at = (prev.puzzles || []).findIndex(function(p) { return p.id === puzzle.id; });
        if (!fresh || at < 0) return Object.assign({}, prev, { regeneratingPuzzleId: null });
        var puzzles = prev.puzzles.slice();
        puzzles[at] = processEscapeRoomPuzzles([fresh.puzzle], prev.objects)[0];
        var byId = Object.assign({}, prev.previewNotes && prev.previewNotes.byId);
        if (fresh.notes.length) byId[puzzle.id] = fresh.notes; else delete byId[puzzle.id];
        return withEscapeRoomEdits(prev, { puzzles: puzzles, regeneratingPuzzleId: null, previewNotes: Object.assign({ room: [] }, prev.previewNotes, { byId: byId }) });
      });
      if (fresh) playSound('correct');
      else addToast(t('escape_room.regenerate_failed') || 'A new version could not be made. The current puzzle is unchanged.', 'error');
      return !!fresh;
    };

    // ── Preview lifecycle ──
    var closeEscapeRoomPreview = function() {
      setState.setEscapeRoomState(function(prev) { return Object.assign({}, prev, { isPreview: false, confirmDiscard: false }); });
    };
    var reopenEscapeRoomPreview = function() {
      setState.setEscapeRoomState(function(prev) {
        return hasEscapeRoomDraftIn(prev) ? Object.assign({}, prev, { isPreview: true, showSettings: false, confirmDiscard: false }) : prev;
      });
    };
    var hasEscapeRoomDraft = function() { return hasEscapeRoomDraftIn(getState().escapeRoomState); };
    var discardEscapeRoomPreview = function() {
      escapeRoomRequests.room = null;
      escapeRoomRequests.puzzle = null;
      setState.setEscapeRoomState(function(prev) {
        return Object.assign({}, prev, { isPreview: false, isActive: false, isTrial: false, confirmDiscard: false, room: null, puzzles: [], objects: [],
          savedEscapeRoom: null, finalDoorPuzzle: null, previewNotes: null, previewTarget: null, regeneratingPuzzleId: null });
      });
    };
    var generateNewEscapeRoom = function() {
      var room = getState().escapeRoomState || {};
      if (room.previewTarget === 'live') return launchCollaborativeEscapeRoom({ fresh: true });
      return generateEscapeRoom();
    };
    // A teacher plays the previewed room as a student would: same rules, no XP,
    // nothing sent to the class. Closing it returns to the preview.
    var startEscapeRoomTrial = function() {
      var room = getState().escapeRoomState || {};
      if (!_hydrateConfig(savedEscapeRoomFrom(room), room.difficulty)) return;
      setState.setEscapeRoomState(function(prev) {
        return Object.assign({}, prev, { isPreview: false, isActive: true, isTrial: true, timerPaused: true, confirmDiscard: false,
          previewNotes: room.previewNotes || null, previewTarget: room.previewTarget || null });
      });
      addToast(t('escape_room.trial_started') || 'Trial run: play as a student would. No XP is awarded. Choose Back to preview when you are done.', 'info');
    };
    var endEscapeRoomTrial = function() {
      var room = getState().escapeRoomState || {};
      setState.setIsEscapeTimerRunning(false);
      if (!_hydrateConfig(savedEscapeRoomFrom(room), room.difficulty)) return;
      setState.setEscapeRoomState(function(prev) {
        return Object.assign({}, prev, { isTrial: false, previewNotes: room.previewNotes || null, previewTarget: room.previewTarget || null });
      });
    };

    // ── saveEscapeRoomConfig ──
    var saveEscapeRoomConfig = function() {
      var state = getState();
      var escapeRoomState = state.escapeRoomState;
      var inputText = state.inputText;
      var config = escapeRoomState.savedEscapeRoom;
      if (!config) return;
      try {
        var saveData = {
          config: config,
          difficulty: escapeRoomState.difficulty,
          puzzleCount: escapeRoomState.puzzleCount || config.puzzles.length,
          timestamp: Date.now(),
          sourceTextHash: String(inputText || '').substring(0, 100)
        };
        safeSetItem('allo_saved_escape_room', JSON.stringify(saveData));
        // Embed into the active exit ticket / quiz resource so the
        // config travels with the file. Going-forward only — if
        // setHistory + getCurrentResourceId aren't wired (older
        // host), this is a no-op and the localStorage save above is
        // still the source of truth for the teacher's own device.
        try {
          var parentId = getCurrentResourceId && getCurrentResourceId();
          if (parentId && setHistoryDep) {
            setHistoryDep(function(prev) {
              if (!Array.isArray(prev)) return prev;
              return prev.map(function(item) {
                if (!item || item.id !== parentId) return item;
                var nextData = Object.assign({}, item.data || {}, { escapeRoomConfig: saveData });
                return Object.assign({}, item, { data: nextData });
              });
            });
          }
        } catch (eEmbed) { warnLog('Failed to embed escape room into parent resource:', eEmbed); }
        addToast(t('escape_room.config_saved') || '\uD83D\uDCBE Puzzle Challenge saved! Load it anytime from settings.', 'success');
      } catch (e) {
        warnLog('Failed to save escape room config:', e);
        addToast(t('errors.storage_full') || 'Storage full \u2014 could not save', 'error');
      }
    };

    // ── _hydrateConfig (shared helper) ──
    // Pushes a parsed escape-room config into escapeRoomState. Used
    // by both loadSavedEscapeRoom (localStorage path) and
    // loadEscapeRoomFromConfig (resource-embedded path). Random
    // shuffle on every call — by design; repeat plays vary.
    var _hydrateConfig = function(config, difficulty) {
      // Saved rooms pass the same checks as new ones. Rooms saved before those checks
      // existed (e.g. with a mismatched object link) are repaired instead of refused.
      var prepared = isPlainObject(config) && config.room ? prepareEscapeRoomData(config, { requireObjects: true }) : null;
      if (!prepared || !prepared.ok) {
        addToast(t('escape_room.invalid_save') || 'Saved data is corrupted', 'error');
        return false;
      }
      var processedPuzzles = processEscapeRoomPuzzles(prepared.puzzles, prepared.objects);
      var processedFinalDoor = prepared.finalDoor;
      if (processedFinalDoor && processedFinalDoor.wordbank) {
        processedFinalDoor = Object.assign({}, processedFinalDoor, { wordbank: derangeShuffle(processedFinalDoor.wordbank) });
      }
      var diffPresets = {
        easy: { timePerPuzzle: 45, lives: 99, hints: 5, xpMultiplier: 0.5 },
        normal: { timePerPuzzle: 30, lives: 3, hints: 3, xpMultiplier: 1.0 },
        hard: { timePerPuzzle: 20, lives: 1, hints: 1, xpMultiplier: 2.0 }
      };
      var diff = difficulty || 'normal';
      var preset = diffPresets[diff] || diffPresets.normal;
      var totalTime = processedPuzzles.length * preset.timePerPuzzle;
      setState.setEscapeRoomState(function(prev) {
        var next = Object.assign({}, prev, escapeRoomAttempt(), {
          isActive: false,
          isPreview: true,
          isGenerating: false,
          showSettings: false,
          confirmDiscard: false,
          previewNotes: { room: prepared.notes.room, byId: prepared.notes.byId },
          room: prepared.room,
          puzzles: processedPuzzles,
          objects: prepared.objects,
          totalPuzzles: processedPuzzles.length,
          finalDoorPuzzle: processedFinalDoor,
          solvedPuzzles: new Set(),
          isEscaped: false,
          timeRemaining: totalTime,
          maxTime: totalTime,
          difficulty: diff,
          lives: preset.lives,
          maxLives: preset.lives,
          hintsRemaining: preset.hints,
          maxHints: preset.hints,
          xpMultiplier: preset.xpMultiplier,
          streak: 0,
          wrongAttempts: 0,
          isGameOver: false,
          timerPaused: true
        });
        next.savedEscapeRoom = savedEscapeRoomFrom(next);
        return next;
      });
      setState.setEscapeTimeLeft(totalTime);
      setState.setIsEscapeTimerRunning(false);
      return true;
    };

    // ── loadSavedEscapeRoom ──
    // localStorage path — the teacher's own browser-local saves
    // (independent of any specific exit ticket).
    var loadSavedEscapeRoom = function() {
      try {
        var saved = safeGetItem('allo_saved_escape_room');
        if (!saved) {
          addToast(t('escape_room.no_saved') || 'No saved Puzzle Challenge found', 'info');
          return;
        }
        var saveData = JSON.parse(saved);
        if (_hydrateConfig(saveData.config, saveData.difficulty)) {
          playSound('correct');
          addToast(t('escape_room.loaded_saved') || '\uD83D\uDCC2 Saved Puzzle Challenge loaded! Review and launch when ready.', 'success');
        }
      } catch (e) {
        warnLog('Failed to load saved escape room:', e);
        addToast(t('errors.load_failed') || 'Failed to load saved config', 'error');
      }
    };

    // ── loadEscapeRoomFromConfig (new) ──
    // Resource-embedded path — hydrates from a config object stored
    // inside an exit ticket / quiz resource (resource.data.escapeRoomConfig).
    // No localStorage involvement, so a student opening the same
    // file on a different device gets the same content.
    // saveData shape matches saveEscapeRoomConfig output:
    //   { config, difficulty, puzzleCount, timestamp, sourceTextHash }
    var loadEscapeRoomFromConfig = function(saveData, opts) {
      if (!saveData) return false;
      try {
        var ok = _hydrateConfig(saveData.config, saveData.difficulty);
        if (ok && opts && opts.silent !== true) {
          addToast(t('escape_room.loaded_from_resource') || '\uD83D\uDCC2 Puzzle Challenge loaded from this assessment.', 'success');
        }
        return ok;
      } catch (e) {
        warnLog('Failed to hydrate escape room from resource:', e);
        return false;
      }
    };

    // ── hasSavedEscapeRoom (sync check) ──
    var hasSavedEscapeRoom = function() {
      try { return !!safeGetItem('allo_saved_escape_room'); } catch (e) { return false; }
    };

    // Return public API
    return {
      generateEscapeRoom: generateEscapeRoom,
      launchCollaborativeEscapeRoom: launchCollaborativeEscapeRoom,
      launchConceptQuest: launchConceptQuest,
      endCollaborativeEscapeRoom: endCollaborativeEscapeRoom,
      handlePuzzleSolved: handlePuzzleSolved,
      handleSelectObject: handleSelectObject,
      handleWrongAnswer: handleWrongAnswer,
      handleEscapeRoomAnswer: handleEscapeRoomAnswer,
      handleSequenceAnswer: handleSequenceAnswer,
      handleCipherAnswer: handleCipherAnswer,
      handleMatchingSelect: handleMatchingSelect,
      handleScrambleAnswer: handleScrambleAnswer,
      handleFillinAnswer: handleFillinAnswer,
      handleFinalDoorAnswer: handleFinalDoorAnswer,
      resetEscapeRoom: resetEscapeRoom,
      handleRevealHint: handleRevealHint,
      openEscapeRoomSettings: openEscapeRoomSettings,
      updateEscapeRoomSetting: updateEscapeRoomSetting,
      launchEscapeRoomWithSettings: launchEscapeRoomWithSettings,
      confirmEscapeRoomPreview: confirmEscapeRoomPreview,
      updateEscapeRoomPuzzle: updateEscapeRoomPuzzle,
      updateEscapeRoomFinalDoor: updateEscapeRoomFinalDoor,
      saveEscapeRoomConfig: saveEscapeRoomConfig,
      loadSavedEscapeRoom: loadSavedEscapeRoom,
      loadEscapeRoomFromConfig: loadEscapeRoomFromConfig,
      hasSavedEscapeRoom: hasSavedEscapeRoom,
      publishEscapeRoomLive: publishEscapeRoomLive,
      updateEscapeRoomRoom: updateEscapeRoomRoom,
      removeEscapeRoomPuzzle: removeEscapeRoomPuzzle,
      regenerateEscapeRoomPuzzle: regenerateEscapeRoomPuzzle,
      closeEscapeRoomPreview: closeEscapeRoomPreview,
      reopenEscapeRoomPreview: reopenEscapeRoomPreview,
      hasEscapeRoomDraft: hasEscapeRoomDraft,
      discardEscapeRoomPreview: discardEscapeRoomPreview,
      generateNewEscapeRoom: generateNewEscapeRoom,
      startEscapeRoomTrial: startEscapeRoomTrial,
      endEscapeRoomTrial: endEscapeRoomTrial
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // TIMER EFFECT HOOK (for use from host)
  // ═══════════════════════════════════════════════════════════════

  function startEscapeRoomClock(deps) {
    var room = deps.escapeRoomState || {};
    if (!deps.isEscapeTimerRunning || room.isActive === false || room.isEscaped || room.isGameOver || room.timerEnabled === false) return;
    var last = Math.max(0, Number(deps.escapeTimeLeft) || 0);
    var deadline = Date.now() + last * 1000;
    var interval;
    var tick = function() {
      var next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      if (next === last && next > 0) return;
      if (next > 0 && last > 30 && next <= 30) deps.addToast(deps.t('escape_room.thirty_seconds_warning'), 'error');
      else if (next > 30 && last > 60 && next <= 60) deps.addToast(deps.t('escape_room.one_minute_warning'), 'warning');
      last = next;
      deps.setEscapeTimeLeft(next);
      deps.setEscapeRoomState(function(prev) {
        if (!prev.isActive || prev.isEscaped || prev.isGameOver) return prev;
        return Object.assign({}, prev, { timeRemaining: next }, next === 0 ? {
          isGameOver: true, gameOverReason: 'time', timerPaused: true, selectedObject: null, showFinalDoor: false
        } : {});
      });
      if (next === 0) {
        clearInterval(interval);
        deps.setIsEscapeTimerRunning(false);
        deps.addToast(deps.t('escape_room.game_over_time'), 'error');
      }
    };
    if (last === 0) tick();
    else interval = setInterval(tick, 250);
    return function() { clearInterval(interval); };
  }
  function useEscapeRoomTimer(deps) {
    var room = deps.escapeRoomState || {};
    useEffect(function() { return startEscapeRoomClock(deps); }, [deps.isEscapeTimerRunning, deps.escapeTimeLeft,
      room.isActive, room.isEscaped, room.isGameOver, room.timerEnabled, deps.t, deps.addToast]);
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPONENT: EscapeRoomGameplay
  // ═══════════════════════════════════════════════════════════════

  var EscapeRoomGameplay = React.memo(function EscapeRoomGameplay(props) {
    var escapeRoomState = props.escapeRoomState;
    var setEscapeRoomState = props.setEscapeRoomState;
    var escapeTimeLeft = props.escapeTimeLeft;
    var isEscapeTimerRunning = props.isEscapeTimerRunning;
    var handlers = props.handlers;
    var t = props.t;
    var soundEnabled = props.soundEnabled;
    var setSoundEnabled = props.setSoundEnabled;
    var playSound = props.playSound;
    var handleSetIsEscapeTimerRunningToTrue = props.handleSetIsEscapeTimerRunningToTrue;
    var toggleTimer = function() {
      setEscapeRoomState(function(prev) { return Object.assign({}, rememberEscapeRoomDraft(prev), { timerPaused: !!isEscapeTimerRunning, hasStarted: true, showFinalDoor: false }); });
      if (props.setIsEscapeTimerRunning) props.setIsEscapeTimerRunning(!isEscapeTimerRunning);
      else if (!isEscapeTimerRunning && handleSetIsEscapeTimerRunningToTrue) handleSetIsEscapeTimerRunningToTrue();
    };
    var outcomeRef = useRef(null);
    var terminal = !!(escapeRoomState && (escapeRoomState.isEscaped || escapeRoomState.isGameOver));
    useEffect(function() { if (terminal && outcomeRef.current) outcomeRef.current.focus(); }, [terminal]);
    var previousPhase = useRef({ running: isEscapeTimerRunning, terminal: terminal });
    useEffect(function() {
      var previous = previousPhase.current;
      if (!terminal && escapeRoomState && escapeRoomState.isActive &&
          (previous.running !== isEscapeTimerRunning || previous.terminal)) {
        var next = document.querySelector('[data-escape-room-next]:not([disabled])');
        if (next) next.focus();
      }
      previousPhase.current = { running: isEscapeTimerRunning, terminal: terminal };
    }, [isEscapeTimerRunning, terminal, escapeRoomState && escapeRoomState.isActive]);

    var puzzleDialogRef = useEscapeRoomDialog(!!(escapeRoomState && escapeRoomState.isActive && escapeRoomState.selectedObject), function() {
      setEscapeRoomState(rememberEscapeRoomDraft);
    });
    var finalDialogRef = useEscapeRoomDialog(!!(escapeRoomState && escapeRoomState.isActive && escapeRoomState.showFinalDoor && escapeRoomState.finalDoorPuzzle), function() {
      setEscapeRoomState(function(prev) { return Object.assign({}, prev, { showFinalDoor: false }); });
    });
    if (!escapeRoomState || !escapeRoomState.isActive) return null;

    // ── Generating spinner ──
    var renderGenerating = function() {
      return h('div', { className: 'flex-grow flex flex-col items-center justify-center gap-4' },
        h(Sparkles, { className: 'animate-spin text-purple-400', size: 48 }),
        h('p', { className: 'text-purple-400 text-lg font-bold' }, t('escape_room.generating')),
        h('p', { className: 'text-slate-500 text-sm' }, t('escape_room.generating_hint'))
      );
    };

    // ── Victory screen ──
    var renderVictory = function() {
      var maxTime = escapeRoomState.maxTime || 300;
      var timeTaken = maxTime - escapeTimeLeft;
      var minutes = Math.floor(timeTaken / 60);
      var seconds = timeTaken % 60;
      var puzzlesSolved = escapeRoomState.solvedPuzzles.size;
      var totalPuzzles = escapeRoomState.totalPuzzles;
      var wrongAttempts = escapeRoomState.wrongAttempts || 0;
      var hintsUsed = escapeRoomState.totalHintsUsed || 0;
      var totalXP = escapeRoomState.xpEarned || 0;
      var rating = 'good';
      var ratingEmoji = '\uD83D\uDC4D';
      var ratingColor = 'text-blue-400';
      if (wrongAttempts === 0 && hintsUsed === 0) {
        rating = 'perfect'; ratingEmoji = '\uD83C\uDFC6'; ratingColor = 'text-yellow-400';
      } else if (wrongAttempts <= 2 && hintsUsed <= 1) {
        rating = 'great'; ratingEmoji = '\u2B50'; ratingColor = 'text-green-400';
      }
      return h('div', { className: 'flex-grow flex flex-col items-center justify-center gap-6 text-center p-6' },
        h('div', { className: 'text-8xl animate-bounce' }, ratingEmoji),
        h('h3', { ref: outcomeRef, 'data-escape-room-next': '', tabIndex: -1, className: 'text-4xl font-black ' + ratingColor },
          t('escape_room.performance_' + rating) || (rating === 'perfect' ? 'Perfect Escape!' : rating === 'great' ? 'Great Job!' : 'Good Effort!')
        ),
        h('p', { className: 'text-slate-400' }, t('escape_room.escaped_desc')),
        h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-2xl mt-4' },
          h('div', { className: 'bg-slate-800/70 p-4 rounded-xl border border-slate-700' },
            h('div', { className: 'text-2xl mb-1' }, '\u23F1\uFE0F'),
            h('div', { className: 'text-2xl font-bold text-white' }, minutes + ':' + seconds.toString().padStart(2, '0')),
            h('div', { className: 'text-xs text-slate-400 uppercase' }, t('escape_room.time_taken') || 'Time Taken')
          ),
          h('div', { className: 'bg-slate-800/70 p-4 rounded-xl border border-slate-700' },
            h('div', { className: 'text-2xl mb-1' }, '\u2705'),
            h('div', { className: 'text-2xl font-bold text-green-400' }, puzzlesSolved + '/' + totalPuzzles),
            h('div', { className: 'text-xs text-slate-400 uppercase' }, t('escape_room.puzzles_solved') || 'Puzzles Solved')
          ),
          h('div', { className: 'bg-slate-800/70 p-4 rounded-xl border border-slate-700' },
            h('div', { className: 'text-2xl mb-1' }, '\u274C'),
            h('div', { className: 'text-2xl font-bold ' + (wrongAttempts === 0 ? 'text-green-400' : 'text-red-400') }, wrongAttempts),
            h('div', { className: 'text-xs text-slate-400 uppercase' }, t('escape_room.wrong_attempts') || 'Wrong Attempts')
          ),
          h('div', { className: 'bg-slate-800/70 p-4 rounded-xl border border-slate-700' },
            h('div', { className: 'text-2xl mb-1' }, '\uD83D\uDCA1'),
            h('div', { className: 'text-2xl font-bold ' + (hintsUsed === 0 ? 'text-green-400' : 'text-amber-400') }, hintsUsed),
            h('div', { className: 'text-xs text-slate-400 uppercase' }, t('escape_room.hints_used') || 'Hints Used')
          )
        ),
        h('div', { className: 'bg-gradient-to-r from-purple-900/50 to-indigo-900/50 p-4 rounded-xl border border-purple-500/30 w-full max-w-md' },
          h('div', { className: 'text-lg font-bold text-purple-400 mb-2' }, t('escape_room.xp_earned_label') || 'XP Earned'),
          h('div', { className: 'text-4xl font-black text-purple-400' }, '+' + totalXP + ' XP'),
          h('div', { className: 'text-xs text-slate-400 mt-2' },
            t('common.score') + ': ' + (escapeRoomState.runScore || 0) + ' XP'
          )
        ),
        h('div', { className: 'flex gap-4 mt-4' },
          h('button', {
            'aria-label': t('escape_room.play_again'),
            onClick: function() { handlers.resetEscapeRoom({ replay: true }); },
            className: 'bg-purple-600 text-white px-6 py-3 rounded-full font-bold hover:bg-purple-700 transition-colors flex items-center gap-2'
          }, h(RefreshCw, { size: 18 }), t('escape_room.play_again')),
          h('button', {
            onClick: function() {
              if (escapeRoomState.isTrial) handlers.resetEscapeRoom();
              else setEscapeRoomState(function(prev) { return Object.assign({}, prev, { isActive: false }); });
            },
            className: 'bg-slate-700 text-white px-6 py-3 rounded-full font-bold hover:bg-slate-600 transition-colors'
          }, escapeRoomState.isTrial ? (t('escape_room.back_to_preview') || 'Back to preview') : (t('escape_room.close') || 'Close'))
        )
      );
    };

    var renderGameOver = function() {
      return h('div', { className: 'flex flex-col items-center justify-center gap-6 text-center p-6 flex-grow' },
        h('h3', { ref: outcomeRef, tabIndex: -1, className: 'text-3xl font-bold text-amber-300' },
          t(escapeRoomState.gameOverReason === 'time' ? 'escape_room.game_over_time' : 'escape_room.game_over')),
        h('p', { className: 'text-slate-300' }, t('escape_room.puzzles_solved') + ': ' + escapeRoomState.solvedPuzzles.size + '/' + escapeRoomState.puzzles.length),
        h('p', { className: 'text-purple-300' }, t('escape_room.xp_earned', { xp: escapeRoomState.xpEarned || 0 })),
        h('div', { className: 'flex flex-wrap gap-3 justify-center' },
          h('button', { onClick: function() { handlers.resetEscapeRoom({ replay: true }); }, className: 'bg-purple-600 text-white px-6 py-3 rounded-full font-bold focus:ring-2 focus:ring-purple-300' }, t('escape_room.play_again')),
          h('button', { onClick: function() { handlers.resetEscapeRoom(); }, className: 'bg-slate-700 text-white px-6 py-3 rounded-full font-bold focus:ring-2 focus:ring-slate-300' },
            escapeRoomState.isTrial ? (t('escape_room.back_to_preview') || 'Back to preview') : t('escape_room.close'))
        )
      );
    };

    // ── Puzzle dialog render helper ──
    var renderPuzzleDialog = function() {
      if (!escapeRoomState.selectedObject) return null;
      var puzzle = escapeRoomState.puzzles.find(function(p) { return p.linkedObjectId === escapeRoomState.selectedObject.id; });
      if (!puzzle) return h('p', { className: 'text-slate-500' }, t('escape_room.no_puzzle'));

      var puzzleContent = [];

      // Close button
      puzzleContent.push(
        h('button', {
          key: 'close-btn',
          'aria-label': t('common.close'),
          onClick: function() { setEscapeRoomState(rememberEscapeRoomDraft); },
          className: 'absolute top-4 right-4 text-slate-300 hover:text-white min-w-11 min-h-11 focus:outline-none focus:ring-2 focus:ring-purple-400 rounded'
        }, h(X, { size: 24 }))
      );

      // Header
      puzzleContent.push(
        h('div', { key: 'header', className: 'flex items-center gap-3 mb-6' },
          h('span', { className: 'text-4xl' }, escapeRoomState.selectedObject.emoji),
          h('div', null,
            h('h3', { id: 'escape-room-object-title', className: 'text-xl font-bold text-white' }, escapeRoomState.selectedObject.name),
            h('p', { className: 'text-slate-500 text-sm' }, escapeRoomState.selectedObject.description)
          )
        )
      );

      // Question area
      var questionChildren = [];
      // Type badge + hint button
      var typeHintRow = [];
      typeHintRow.push(
        h('span', { key: 'type-badge', className: 'text-xs px-2 py-0.5 bg-purple-600 text-white rounded-full font-bold uppercase' },
          t('escape_room.type_' + (puzzle.type || 'mcq'))
        )
      );
      if (props.setIsEscapeTimerRunning) typeHintRow.push(h('button', {
        key: 'pause', onClick: toggleTimer, className: 'px-3 py-2 rounded-lg bg-slate-700 text-white text-sm focus:ring-2 focus:ring-purple-400'
      }, t('escape_room.pause')));
      if (puzzle.hint || (puzzle.hints && puzzle.hints.length > 0)) {
        var hintUsed = escapeRoomState.hintsUsed && escapeRoomState.hintsUsed[puzzle.id];
        var hintsRem = escapeRoomState.hintsRemaining || 0;
        typeHintRow.push(
          h('button', {
            key: 'hint-btn',
            onClick: function() { handlers.handleRevealHint(puzzle.id); },
            disabled: hintsRem <= 0 && !hintUsed,
            className: 'text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ' +
              (hintUsed
                ? 'bg-amber-700 text-white cursor-pointer'
                : hintsRem > 0
                  ? 'bg-amber-900/50 text-amber-400 hover:bg-amber-800 border border-amber-600'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'),
            title: hintUsed ? (t('escape_room.show_hint')) : (t('escape_room.get_hint'))
          },
            h(Lightbulb, { size: 14 }),
            hintUsed
              ? (t('escape_room.show_hint') || 'Show Hint')
              : (t('escape_room.get_hint') || 'Get Hint') + ' (' + hintsRem + ')'
          )
        );
      }
      questionChildren.push(
        h('div', { key: 'type-hint-row', className: 'flex flex-wrap items-center justify-between gap-2 mb-2' }, typeHintRow)
      );
      questionChildren.push(
        h('p', { key: 'question-text', className: 'text-lg text-white font-medium' }, puzzle.question)
      );
      // Show revealed hint
      if (escapeRoomState.hintsUsed && escapeRoomState.hintsUsed[puzzle.id] && (puzzle.hint || (puzzle.hints && puzzle.hints[0]))) {
        questionChildren.push(
          h('p', { key: 'hint-display', className: 'text-amber-400 text-sm mt-3 bg-amber-900/30 p-2 rounded-lg' },
            '\uD83D\uDCA1 ' + (puzzle.hint || puzzle.hints[0]))
        );
      }
      // Show discovered clue
      if (escapeRoomState.discoveredClues && escapeRoomState.discoveredClues[puzzle.id]) {
        questionChildren.push(
          h('p', { key: 'clue-display', className: 'text-yellow-400 text-sm mt-2 bg-yellow-900/30 p-2 rounded-lg' },
            '\uD83D\uDD11 ' + t('escape_room.clue') + ': ' + escapeRoomState.discoveredClues[puzzle.id])
        );
      }
      puzzleContent.push(
        h('div', { key: 'question-area', className: 'bg-slate-900 p-4 rounded-xl mb-6' }, questionChildren)
      );

      // ── MCQ ──
      if ((!puzzle.type || puzzle.type === 'mcq') && puzzle.options) {
        puzzleContent.push(
          h('div', { key: 'mcq', className: 'grid gap-3', role: 'radiogroup', 'aria-label': t('escape_room.answer_options') || 'Answer options' },
            puzzle.options.map(function(opt, idx) {
              return h('button', {
                key: idx,
                onClick: function() { handlers.handleEscapeRoomAnswer(puzzle.id, idx); },
                role: 'radio',
                'aria-checked': 'false',
                className: 'w-full text-left p-4 bg-slate-700 hover:bg-purple-700 rounded-xl text-white font-medium transition-colors border-2 border-transparent hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400'
              },
                h('span', { className: 'inline-block w-8 font-bold text-purple-400', 'aria-hidden': 'true' }, String.fromCharCode(65+idx) + '.'),
                h('span', { className: 'sr-only' }, (t('escape_room.option') || 'Option') + ' ' + String.fromCharCode(65+idx) + ': '),
                opt
              );
            })
          )
        );
      }

      // ── Sequence ──
      if (puzzle.type === 'sequence' && puzzle.items) {
        var seqChildren = [];
        seqChildren.push(h('p', { key: 'seq-instr', className: 'text-slate-500 text-sm' }, t('escape_room.sequence_instructions')));
        // Build the reorderable list
        var currentOrder = (escapeRoomState.sequenceOrder && escapeRoomState.sequenceOrder.length > 0)
          ? escapeRoomState.sequenceOrder
          : (puzzle.shuffledItems || puzzle.items.map(function(_, i) { return i; }));

        var seqItems = currentOrder.map(function(itemIdx, displayIdx) {
          return h('div', {
            key: displayIdx,
            id: 'sequence-item-' + displayIdx,
            role: 'listitem',
            tabIndex: 0,
            draggable: true,
            onDragStart: function(e) { e.dataTransfer.setData('text/plain', displayIdx.toString()); },
            onDragOver: function(e) { e.preventDefault(); },
            onDrop: function(e) {
              e.preventDefault();
              var fromDisplayIdx = parseInt(e.dataTransfer.getData('text/plain'));
              var newOrder = currentOrder.slice();
              var removed = newOrder.splice(fromDisplayIdx, 1)[0];
              newOrder.splice(displayIdx, 0, removed);
              setEscapeRoomState(function(prev) { return Object.assign({}, prev, { sequenceOrder: newOrder }); });
            },
            onKeyDown: function(e) {
              if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                if (displayIdx > 0) {
                  var nOrder = currentOrder.slice();
                  var tmp = nOrder[displayIdx]; nOrder[displayIdx] = nOrder[displayIdx-1]; nOrder[displayIdx-1] = tmp;
                  setEscapeRoomState(function(prev) { return Object.assign({}, prev, { sequenceOrder: nOrder }); });
                  setTimeout(function() { var el = document.getElementById('sequence-item-' + (displayIdx-1)); if(el) el.focus(); }, 50);
                }
              } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault();
                if (displayIdx < currentOrder.length - 1) {
                  var nOrder2 = currentOrder.slice();
                  var tmp2 = nOrder2[displayIdx]; nOrder2[displayIdx] = nOrder2[displayIdx+1]; nOrder2[displayIdx+1] = tmp2;
                  setEscapeRoomState(function(prev) { return Object.assign({}, prev, { sequenceOrder: nOrder2 }); });
                  setTimeout(function() { var el = document.getElementById('sequence-item-' + (displayIdx+1)); if(el) el.focus(); }, 50);
                }
              }
            },
            'aria-label': (t('escape_room.position') || 'Position') + ' ' + (displayIdx + 1) + ': ' + puzzle.items[itemIdx] + '. ' + (t('escape_room.use_arrows') || 'Use arrow keys to reorder.'),
            className: 'flex items-center gap-3 p-4 bg-slate-700 rounded-xl text-white font-medium cursor-move hover:bg-slate-600 border-2 border-transparent hover:border-purple-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all'
          },
            h('div', { className: 'flex flex-col gap-1', role: 'group', 'aria-label': t('escape_room.reorder_buttons') || 'Reorder buttons' },
              h('button', {
                onClick: function(e) {
                  e.stopPropagation();
                  if (displayIdx > 0) {
                    var nO = currentOrder.slice();
                    var t2 = nO[displayIdx]; nO[displayIdx] = nO[displayIdx-1]; nO[displayIdx-1] = t2;
                    setEscapeRoomState(function(prev) { return Object.assign({}, prev, { sequenceOrder: nO }); });
                    setTimeout(function() { var el = document.getElementById('sequence-item-' + (displayIdx-1)); if(el) el.focus(); }, 50);
                  }
                },
                disabled: displayIdx === 0,
                className: 'p-1 rounded hover:bg-purple-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-purple-300',
                'aria-label': (t('escape_room.move_up') || 'Move up') + ': ' + puzzle.items[itemIdx],
                title: t('escape_room.move_up') || 'Move up'
              }, h(ChevronUp, { size: 16, className: 'text-slate-600' })),
              h('button', {
                onClick: function(e) {
                  e.stopPropagation();
                  if (displayIdx < currentOrder.length - 1) {
                    var nO = currentOrder.slice();
                    var t2 = nO[displayIdx]; nO[displayIdx] = nO[displayIdx+1]; nO[displayIdx+1] = t2;
                    setEscapeRoomState(function(prev) { return Object.assign({}, prev, { sequenceOrder: nO }); });
                    setTimeout(function() { var el = document.getElementById('sequence-item-' + (displayIdx+1)); if(el) el.focus(); }, 50);
                  }
                },
                disabled: displayIdx === currentOrder.length - 1,
                className: 'p-1 rounded hover:bg-purple-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-purple-300',
                'aria-label': (t('escape_room.move_down') || 'Move down') + ': ' + puzzle.items[itemIdx],
                title: t('escape_room.move_down') || 'Move down'
              }, h(ChevronDown, { size: 16, className: 'text-slate-600' }))
            ),
            h(GripVertical, { size: 20, className: 'text-slate-500', 'aria-hidden': 'true' }),
            h('span', { className: 'inline-flex w-6 h-6 bg-purple-600 text-white text-sm font-bold rounded-full items-center justify-center', 'aria-hidden': 'true' }, displayIdx + 1),
            h('span', { className: 'flex-grow' }, puzzle.items[itemIdx])
          );
        });

        seqChildren.push(
          h('div', { key: 'seq-list', className: 'space-y-2', role: 'list', 'aria-label': t('escape_room.sequence_list_label') || 'Sequence items to reorder' }, seqItems)
        );
        seqChildren.push(
          h('button', {
            key: 'seq-submit',
            onClick: function() {
              var co = (escapeRoomState.sequenceOrder && escapeRoomState.sequenceOrder.length > 0)
                ? escapeRoomState.sequenceOrder
                : (puzzle.shuffledItems || puzzle.items.map(function(_, i) { return i; }));
              handlers.handleSequenceAnswer(puzzle.id, co);
            },
            className: 'w-full mt-4 p-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors'
          }, t('escape_room.check_sequence'))
        );
        puzzleContent.push(h('div', { key: 'sequence', className: 'space-y-3' }, seqChildren));
      }

      // ── Cipher ──
      if (puzzle.type === 'cipher') {
        var cipherChildren = [];
        cipherChildren.push(
          h('div', { key: 'cipher-box', className: 'bg-slate-900 p-6 rounded-xl border-2 border-purple-500' },
            h('div', { className: 'flex items-center gap-2 mb-4' },
              h('span', { className: 'text-2xl' }, '\uD83D\uDD2E'),
              h('p', { className: 'text-purple-300 text-sm font-bold uppercase tracking-wider' }, t('escape_room.riddle_challenge') || 'Riddle Challenge')
            ),
            h('p', { className: 'text-xl text-white font-medium italic leading-relaxed' }, '"' + (puzzle.encodedText || puzzle.riddle || '') + '"')
          )
        );
        if (puzzle.wordbank && puzzle.wordbank.length > 0) {
          cipherChildren.push(
            h('div', { key: 'cipher-wordbank', className: 'space-y-3' },
              h('p', { className: 'text-xs text-slate-500 text-center uppercase font-bold' }, t('escape_room.select_answer') || 'Select your answer:'),
              h('div', { className: 'grid grid-cols-2 gap-3', role: 'group', 'aria-label': t('escape_room.answer_options') || 'Answer options' },
                puzzle.wordbank.map(function(word, idx) {
                  var isSelected = escapeRoomState.textInput === word;
                  return h('button', {
                    key: idx,
                    onClick: function() { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { textInput: word }); }); },
                    'aria-pressed': isSelected,
                    className: 'p-4 rounded-xl font-bold text-lg transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-800 ' +
                      (isSelected
                        ? 'bg-purple-600 text-white ring-2 ring-purple-300 scale-105'
                        : 'bg-slate-700 text-white hover:bg-slate-600 hover:scale-102')
                  },
                    word,
                    isSelected ? h('span', { className: 'sr-only' }, ' - ' + (t('escape_room.selected') || 'selected')) : null
                  );
                })
              )
            )
          );
        } else {
          cipherChildren.push(
            h('input', {
              key: 'cipher-input',
              'aria-label': t('escape_room.enter_answer_label'),
              type: 'text',
              value: escapeRoomState.textInput || '',
              onChange: function(e) { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { textInput: e.target.value }); }); },
              placeholder: t('escape_room.enter_answer'),
              className: 'w-full p-4 bg-slate-700 rounded-xl text-white font-medium border-2 border-slate-600 focus:border-purple-400'
            })
          );
        }
        cipherChildren.push(
          h('button', {
            key: 'cipher-submit',
            onClick: function() { handlers.handleCipherAnswer(puzzle.id, escapeRoomState.textInput || ''); },
            disabled: !escapeRoomState.textInput,
            className: 'w-full p-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          }, t('escape_room.submit_answer'))
        );
        puzzleContent.push(h('div', { key: 'cipher', className: 'space-y-4' }, cipherChildren));
      }

      // ── Matching ──
      if (puzzle.type === 'matching' && puzzle.pairs) {
        var matchChildren = [];
        matchChildren.push(h('p', { key: 'match-instr', className: 'text-slate-500 text-sm' }, t('escape_room.matching_instructions')));
        matchChildren.push(h('p', { key: 'match-hint', className: 'text-purple-400 text-xs' }, t('escape_room.matching_keyboard_hint') || 'Tip: Use Tab to switch columns, Enter to select'));
        // Show matched pairs
        var mp = escapeRoomState.matchingPairs || [];
        if (mp.length > 0) {
          matchChildren.push(
            h('div', { key: 'matched', className: 'space-y-2 mb-4', role: 'status', 'aria-live': 'polite' },
              h('p', { className: 'text-green-400 text-xs font-bold' }, t('escape_room.matched_pairs')),
              mp.map(function(pair, idx) {
                return h('div', { key: idx, className: 'flex items-center gap-2 p-2 bg-green-900/30 rounded-lg text-green-400 text-sm' },
                  h(CheckCircle, { size: 14, 'aria-hidden': 'true' }),
                  h('span', null, pair[0] + ' \u2194 ' + pair[1])
                );
              })
            )
          );
        }
        // Columns
        var leftItems = (puzzle.leftColumn || puzzle.pairs.map(function(p) { return p.left; })).filter(function(item) {
          return !mp.some(function(pair) { return pair[0] === item; });
        });
        var rightItems = (puzzle.rightColumn || puzzle.pairs.map(function(p) { return p.right; })).filter(function(item) {
          return !mp.some(function(pair) { return pair[1] === item; });
        });
        matchChildren.push(
          h('div', { key: 'columns', className: 'grid grid-cols-2 gap-4', role: 'group', 'aria-label': t('escape_room.matching_columns') || 'Matching columns' },
            h('div', { className: 'space-y-2', role: 'listbox', 'aria-label': t('escape_room.left_column') || 'Left column options' },
              leftItems.map(function(item, idx) {
                var isSel = escapeRoomState.matchingSelected && escapeRoomState.matchingSelected.item === item && escapeRoomState.matchingSelected.column === 'left';
                return h('button', {
                  key: idx,
                  onClick: function() { handlers.handleMatchingSelect(puzzle.id, item, 'left'); },
                  onKeyDown: function(e) {
                    if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      var el = document.querySelector('[data-matching-column="right"] button');
                      if (el) el.focus();
                    }
                  },
                  role: 'option',
                  'aria-selected': isSel,
                  'data-matching-column': 'left',
                  className: 'w-full p-3 rounded-xl text-white text-sm font-medium transition-all border-2 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-800 ' +
                    (isSel ? 'bg-purple-600 border-purple-400' : 'bg-slate-700 border-slate-600 hover:border-purple-400')
                },
                  item,
                  isSel ? h('span', { className: 'sr-only' }, ' - ' + (t('escape_room.selected') || 'selected')) : null
                );
              })
            ),
            h('div', { className: 'space-y-2', role: 'listbox', 'aria-label': t('escape_room.right_column') || 'Right column options', 'data-matching-column': 'right' },
              rightItems.map(function(item, idx) {
                var isSel = escapeRoomState.matchingSelected && escapeRoomState.matchingSelected.item === item && escapeRoomState.matchingSelected.column === 'right';
                return h('button', {
                  key: idx,
                  onClick: function() { handlers.handleMatchingSelect(puzzle.id, item, 'right'); },
                  onKeyDown: function(e) {
                    if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      var el = document.querySelector('[data-matching-column="left"]');
                      if (el) el.focus();
                    }
                  },
                  role: 'option',
                  'aria-selected': isSel,
                  className: 'w-full p-3 rounded-xl text-white text-sm font-medium transition-all border-2 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-800 ' +
                    (isSel ? 'bg-purple-600 border-purple-400' : 'bg-slate-700 border-slate-600 hover:border-purple-400')
                },
                  item,
                  isSel ? h('span', { className: 'sr-only' }, ' - ' + (t('escape_room.selected') || 'selected')) : null
                );
              })
            )
          )
        );
        puzzleContent.push(h('div', { key: 'matching', className: 'space-y-4' }, matchChildren));
      }

      // ── Scramble ──
      if (puzzle.type === 'scramble') {
        var scrChildren = [];
        var letters = puzzle.displayLetters || (puzzle.scrambledWord ? escapeRoomLetters(puzzle.scrambledWord) : []);
        scrChildren.push(
          h('p', { key: 'scr-sr', className: 'sr-only', 'aria-live': 'polite' },
            (t('escape_room.scramble_sr_desc') || 'Scrambled letters:') + ' ' + letters.join(', ')
          )
        );
        scrChildren.push(
          h('div', { key: 'scr-letters', className: 'flex flex-wrap gap-2 justify-center p-4 bg-slate-900 rounded-xl', role: 'list', 'aria-label': t('escape_room.scrambled_letters') || 'Scrambled letters to unscramble' },
            letters.map(function(letter, idx) {
              return h('span', {
                key: idx,
                role: 'listitem',
                'aria-label': (t('escape_room.letter') || 'Letter') + ' ' + (idx + 1) + ' ' + (t('escape_room.of') || 'of') + ' ' + letters.length + ': ' + letter,
                className: 'w-10 h-10 bg-purple-600 text-white font-bold text-xl rounded-lg flex items-center justify-center shadow-md'
              }, letter);
            })
          )
        );
        scrChildren.push(
          h('label', { key: 'scr-label', className: 'sr-only', htmlFor: 'scramble-input' },
            t('escape_room.enter_unscrambled') || 'Enter the unscrambled word'
          )
        );
        scrChildren.push(
          h('input', {
            key: 'scr-input',
            'aria-label': t('escape_room.enter_unscrambled'),
            id: 'scramble-input',
            type: 'text',
            value: escapeRoomState.textInput || '',
            onChange: function(e) { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { textInput: e.target.value }); }); },
            placeholder: t('escape_room.unscramble_placeholder'),
            className: 'w-full p-4 bg-slate-700 rounded-xl text-white font-mono text-xl text-center tracking-widest border-2 border-slate-600 focus:border-purple-400 focus:ring-2 focus:ring-purple-400 outline-none uppercase',
            'aria-describedby': 'scramble-hint'
          })
        );
        scrChildren.push(
          h('p', { key: 'scr-sr-hint', id: 'scramble-hint', className: 'sr-only' },
            t('escape_room.scramble_hint_sr') || 'Type the correct word using the scrambled letters shown above'
          )
        );
        scrChildren.push(
          h('button', {
            key: 'scr-submit',
            onClick: function() { handlers.handleScrambleAnswer(puzzle.id, escapeRoomState.textInput || ''); },
            className: 'w-full p-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-800'
          }, t('escape_room.check_word'))
        );
        puzzleContent.push(h('div', { key: 'scramble', className: 'space-y-4' }, scrChildren));
      }

      // ── Fill-in ──
      if (puzzle.type === 'fillin') {
        var filChildren = [];
        if (puzzle.sentence) {
          filChildren.push(
            h('div', {
              key: 'fil-sentence',
              className: 'bg-slate-900 p-4 rounded-xl text-white text-center text-lg',
              'aria-label': t('escape_room.sentence_with_blank') || 'Sentence with blank',
              id: 'fillin-sentence'
            }, puzzle.sentence.replace(/_{3,}/, function() { return escapeRoomState.textInput ? '[' + escapeRoomState.textInput + ']' : '______'; }))
          );
        }
        if (puzzle.wordbank && puzzle.wordbank.length > 0) {
          filChildren.push(
            h('div', { key: 'fil-wordbank', className: 'space-y-3' },
              h('p', { className: 'text-xs text-slate-500 text-center uppercase font-bold', id: 'fillin-wordbank-label' },
                t('escape_room.select_word') || 'Select the correct word:'
              ),
              h('div', { className: 'flex flex-wrap gap-2 justify-center', role: 'group', 'aria-labelledby': 'fillin-wordbank-label' },
                puzzle.wordbank.map(function(word, idx) {
                  return h('button', {
                    key: idx,
                    onClick: function() { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { textInput: word }); }); },
                    'aria-pressed': escapeRoomState.textInput === word,
                    className: 'px-4 py-2 rounded-lg font-bold transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 ' +
                      (escapeRoomState.textInput === word
                        ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                        : 'bg-slate-700 text-white hover:bg-slate-600')
                  },
                    word,
                    h('span', { className: 'sr-only' }, escapeRoomState.textInput === word ? ' - ' + (t('escape_room.selected') || 'selected') : '')
                  );
                })
              )
            )
          );
        } else {
          filChildren.push(
            h('label', { key: 'fil-label', className: 'sr-only', htmlFor: 'fillin-text-input' },
              t('escape_room.enter_answer_label') || 'Enter your answer'
            )
          );
          filChildren.push(
            h('input', {
              key: 'fil-input',
              'aria-label': t('escape_room.enter_unscrambled'),
              id: 'fillin-text-input',
              type: 'text',
              autoFocus: true,
              value: escapeRoomState.textInput || '',
              onChange: function(e) { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { textInput: e.target.value }); }); },
              placeholder: t('escape_room.enter_answer'),
              className: 'w-full p-4 bg-slate-700 rounded-xl text-white font-medium border-2 border-slate-600 focus:border-purple-400 focus:ring-2 focus:ring-purple-400 outline-none',
              'aria-describedby': 'fillin-sentence'
            })
          );
        }
        filChildren.push(
          h('button', {
            key: 'fil-submit',
            onClick: function() { handlers.handleFillinAnswer(puzzle.id, escapeRoomState.textInput || ''); },
            disabled: !escapeRoomState.textInput,
            className: 'w-full p-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-800',
            'aria-disabled': !escapeRoomState.textInput
          }, t('escape_room.submit_answer'))
        );
        puzzleContent.push(h('div', { key: 'fillin', className: 'space-y-4' }, filChildren));
      }

      return puzzleContent;
    };

    // ── Final Door button ──
    var renderFinalDoorButton = function() {
      if (!escapeRoomState.finalDoorUnlocked || !escapeRoomState.finalDoorPuzzle || terminal || !isEscapeTimerRunning) return null;
      return h('div', { className: 'fixed bottom-8 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-4 duration-500' },
        h('button', {
          onClick: function() { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { showFinalDoor: true, textInput: '' }); }); },
          className: 'flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-500 text-slate-900 font-bold rounded-2xl shadow-2xl hover:scale-105 transition-transform animate-pulse border-4 border-yellow-600 focus:outline-none focus:ring-4 focus:ring-yellow-200',
          'data-escape-room-next': '',
          'aria-label': t('escape_room.approach_door') || 'Approach the final door'
        },
          h(DoorOpen, { size: 28, className: 'animate-bounce', 'aria-hidden': 'true' }),
          h('span', { className: 'text-lg' }, t('escape_room.approach_door')),
          h(Sparkles, { size: 20, 'aria-hidden': 'true' })
        )
      );
    };

    // ── Final Door dialog ──
    var renderFinalDoorDialog = function() {
      if (!escapeRoomState.showFinalDoor || !escapeRoomState.finalDoorPuzzle) return null;
      var fdp = escapeRoomState.finalDoorPuzzle;
      var answerContent;
      if (fdp.wordbank && fdp.wordbank.length > 0) {
        answerContent = h(React.Fragment, null,
          h('p', { className: 'text-xs text-slate-500 text-center uppercase font-bold' },
            t('escape_room.select_word') || 'Select the correct answer:'
          ),
          h('div', { className: 'flex flex-wrap gap-2 justify-center' },
            fdp.wordbank.map(function(word, idx) {
              return h('button', {
                key: idx,
                onClick: function() { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { textInput: word }); }); },
                'aria-pressed': escapeRoomState.textInput === word,
                className: 'px-4 py-2 rounded-lg font-bold transition-all focus:outline-none focus:ring-2 focus:ring-yellow-400 ' +
                  (escapeRoomState.textInput === word
                    ? 'bg-yellow-500 text-slate-900 ring-2 ring-yellow-300'
                    : 'bg-slate-700 text-white hover:bg-slate-600')
              }, word);
            })
          )
        );
      } else {
        answerContent = h(React.Fragment, null,
          h('label', { className: 'sr-only', htmlFor: 'final-door-answer' },
            t('escape_room.final_answer_label') || 'Enter your final answer'
          ),
          h('textarea', {
            id: 'final-door-answer',
            autoFocus: true,
            value: escapeRoomState.textInput || '',
            onChange: function(e) { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { textInput: e.target.value }); }); },
            placeholder: t('escape_room.final_answer_placeholder'),
            rows: 3,
            className: 'w-full p-4 bg-slate-700 rounded-xl text-white font-medium border-2 border-slate-600 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400 outline-none resize-none',
            'aria-describedby': 'final-door-question'
          })
        );
      }
      return h('div', {
        className: 'fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4',
        onClick: function() { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { showFinalDoor: false }); }); },
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'final-door-title',
        ref: finalDialogRef,
        tabIndex: -1
      },
        h('div', {
          className: 'bg-gradient-to-b from-slate-800 to-slate-900 w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-2xl border-4 border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.3)] p-8 relative',
          onClick: function(e) { e.stopPropagation(); }
        },
          h('button', {
            onClick: function() { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { showFinalDoor: false }); }); },
            className: 'absolute top-4 right-4 text-slate-300 hover:text-white min-w-11 min-h-11 focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded',
            'aria-label': t('escape_room.close') || 'Close'
          }, h(X, { size: 24, 'aria-hidden': 'true' })),
          h('div', { className: 'text-center mb-8' },
            h('div', { className: 'text-6xl mb-4', 'aria-hidden': 'true' }, '\uD83D\uDEAA'),
            h('h3', { id: 'final-door-title', className: 'text-2xl font-bold text-yellow-400' }, t('escape_room.final_door_title')),
            h('p', { className: 'text-slate-500 text-sm mt-2' }, t('escape_room.final_door_desc'))
          ),
          h('div', { className: 'bg-slate-900 p-6 rounded-xl mb-6 border-2 border-yellow-500/30' },
            h('p', { id: 'final-door-question', className: 'text-lg text-white font-medium text-center' },
              fdp.sentence || fdp.question
            )
          ),
          h('div', { className: 'space-y-4' },
            answerContent,
            h('button', {
              onClick: function() { handlers.handleFinalDoorAnswer(escapeRoomState.textInput || ''); },
              disabled: !escapeRoomState.textInput,
              className: 'w-full p-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-900 font-bold text-lg rounded-xl transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed'
            },
              h(Key, { size: 20, 'aria-hidden': 'true' }),
              t('escape_room.unlock_door')
            )
          )
        )
      );
    };

    // ── Room main content (objects grid or loading error) ──
    var renderRoomContent = function() {
      if (!escapeRoomState.room) {
        return h('div', { className: 'flex-grow flex items-center justify-center' },
          h('p', { className: 'text-slate-500' }, t('escape_room.loading_error'))
        );
      }
      return h('div', { className: 'flex-grow flex flex-col' },
        h('div', { className: 'bg-slate-800/50 p-4 rounded-xl mb-6 text-center border border-slate-700' },
          h('p', { className: 'text-slate-500 italic' }, escapeRoomState.room.description),
          !isEscapeTimerRunning
            ? h('div', { className: 'mt-4' },
                h('button', {
                  'data-escape-room-next': '',
                  'aria-label': escapeRoomState.hasStarted ? t('escape_room.resume') : t('escape_room.start'),
                  onClick: toggleTimer,
                  className: 'bg-gradient-to-r from-green-700 to-emerald-700 hover:from-green-800 hover:to-emerald-800 text-white px-8 py-3 rounded-full font-bold text-lg transition-all shadow-lg shadow-green-900/50 flex items-center gap-3 mx-auto animate-pulse'
                },
                  h(Play, { size: 20 }),
                  escapeRoomState.hasStarted ? t('escape_room.resume') : t('escape_room.start')
                ),
                h('p', { role: escapeRoomState.hasStarted ? 'status' : undefined, className: 'text-slate-400 text-sm mt-2' }, escapeRoomState.hasStarted ? t('escape_room.timer_paused') : t('escape_room.start_hint'))
              )
            : h('p', { className: 'text-purple-400 text-sm mt-2' }, t('escape_room.click_to_inspect'))
        ),
        h('div', { className: 'flex-grow grid grid-cols-3 md:grid-cols-5 gap-4 place-items-center ' + (!isEscapeTimerRunning ? 'opacity-50 pointer-events-none' : '') },
          (escapeRoomState.objects || []).map(function(obj, idx) {
            var puzzle = escapeRoomState.puzzles.find(function(p) { return p.linkedObjectId === obj.id; });
            var isSolved = puzzle && escapeRoomState.solvedPuzzles.has(puzzle.id);
            var isDisabled = isSolved || !isEscapeTimerRunning;
            return h('button', {
              key: obj.id,
              'data-escape-room-next': '',
              onClick: function() { if (!isDisabled) handlers.handleSelectObject(obj); },
              disabled: isDisabled,
              className: 'relative flex flex-col items-center gap-2 p-4 rounded-xl transition-all transform ' + (isEscapeTimerRunning ? 'hover:scale-110' : '') + ' ' +
                (isSolved
                  ? 'bg-green-900/50 border-2 border-green-500 opacity-60 cursor-not-allowed'
                  : !isEscapeTimerRunning
                    ? 'bg-slate-800 border-2 border-slate-700 cursor-not-allowed'
                    : 'bg-slate-800 border-2 border-slate-600 hover:border-purple-400 hover:bg-slate-700 cursor-pointer')
            },
              h('span', { className: 'text-4xl' }, obj.emoji),
              h('span', { className: 'text-xs text-slate-600 font-medium text-center' }, obj.name),
              isSolved ? h(CheckCircle, { className: 'absolute top-1 right-1 text-green-700', size: 16 }) : null,
              !isEscapeTimerRunning && !isSolved ? h(Lock, { className: 'absolute top-1 right-1 text-slate-500', size: 14 }) : null
            );
          })
        )
      );
    };

    // ── Main render ──
    var mainContent;
    if (escapeRoomState.isGenerating) {
      mainContent = renderGenerating();
    } else if (escapeRoomState.isEscaped) {
      mainContent = renderVictory();
    } else if (escapeRoomState.isGameOver) {
      mainContent = renderGameOver();
    } else {
      mainContent = renderRoomContent();
    }

    return h('div', { className: 'animate-in fade-in duration-500' },
      h('div', { className: 'bg-slate-900 p-6 rounded-2xl shadow-2xl border-4 border-purple-500 relative overflow-hidden min-h-[700px] flex flex-col' },
        // Background radial gradient
        h('div', { className: 'absolute inset-0 opacity-10 pointer-events-none' },
          h('div', { className: 'absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.2),transparent_70%)]' })
        ),
        // Top bar
        h('div', { className: 'flex flex-col gap-4 sm:flex-row sm:justify-between items-start mb-6 relative z-10' },
          h('div', { className: 'text-left' },
            h('h2', { className: 'text-3xl font-black text-purple-400 tracking-widest uppercase drop-shadow-md flex items-center gap-3' },
              h(DoorOpen, { size: 32 }),
              ' ',
              t('escape_room.title')
            ),
            escapeRoomState.room
              ? h('p', { className: 'text-slate-500 text-sm mt-1 font-medium' }, escapeRoomState.room.theme)
              : null
          ),
          h('div', { className: 'flex flex-wrap gap-2 items-center' },
            !terminal && isEscapeTimerRunning && props.setIsEscapeTimerRunning ? h('button', {
              onClick: toggleTimer, className: 'px-3 py-2 rounded-lg bg-slate-700 text-white text-sm focus:ring-2 focus:ring-purple-400'
            }, t('escape_room.pause')) : null,
            // Lives are a visible budget; easy mode uses the existing unlimited sentinel.
            h('div', { className: 'px-3 py-1.5 rounded-lg bg-slate-800 text-rose-300', 'aria-label': t('escape_room.lives') },
              t('escape_room.lives') + ': ' + ((escapeRoomState.maxLives || 3) >= 99 ? '\u221E' : (Number.isFinite(escapeRoomState.lives) ? escapeRoomState.lives : 3))),
            // Timer
            h('div', { className: 'px-3 py-1.5 rounded-lg flex items-center gap-2 ' + (escapeTimeLeft <= 60 ? 'bg-red-900/50 animate-pulse' : 'bg-slate-800/50') },
              h(Clock, { size: 16, className: escapeTimeLeft <= 60 ? 'text-red-400' : 'text-slate-400' }),
              h('span', { className: 'font-mono font-bold ' + (escapeTimeLeft <= 60 ? 'text-red-400' : 'text-white') },
                Math.floor(escapeTimeLeft / 60) + ':' + (escapeTimeLeft % 60).toString().padStart(2, '0')
              )
            ),
            // Solved count
            h('div', { className: 'bg-purple-900/50 px-3 py-1.5 rounded-lg flex items-center gap-2' },
              h(Trophy, { size: 16, className: 'text-yellow-400' }),
              h('span', { className: 'text-white font-bold' }, escapeRoomState.solvedPuzzles.size + '/' + escapeRoomState.totalPuzzles)
            ),
            // Hints remaining
            h('div', { className: 'px-3 py-1.5 rounded-lg flex items-center gap-2 ' + ((escapeRoomState.hintsRemaining || 0) > 0 ? 'bg-amber-900/50' : 'bg-slate-800/50') },
              h(Lightbulb, { size: 16, className: (escapeRoomState.hintsRemaining || 0) > 0 ? 'text-amber-400' : 'text-slate-500' }),
              h('span', { className: 'font-bold ' + ((escapeRoomState.hintsRemaining || 0) > 0 ? 'text-amber-400' : 'text-slate-500') },
                escapeRoomState.hintsRemaining || 0
              )
            ),
            // Sound toggle
            h('button', {
              'aria-label': t('common.volume'),
              onClick: function() { setSoundEnabled(!soundEnabled); if (!soundEnabled) playSound('click'); },
              className: 'p-2 rounded-full transition-colors ' + (soundEnabled ? 'bg-purple-700 text-white' : 'bg-slate-700 text-slate-500')
            }, soundEnabled ? h(Volume2, { size: 20 }) : h(MicOff, { size: 20 }))
          )
        ),
        // Trial runs are marked so a teacher never mistakes one for the class's room.
        escapeRoomState.isTrial
          ? h('div', { 'data-escape-room-trial': '', className: 'relative z-10 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400 bg-amber-100 px-4 py-3 text-amber-950' },
              h('p', { className: 'text-sm font-bold' }, t('escape_room.trial_banner') || 'Trial run: you are playing as a student would. No XP is awarded and nothing is sent to the class.'),
              h('button', {
                onClick: function() { handlers.resetEscapeRoom(); },
                className: 'min-h-11 rounded-lg bg-amber-800 px-4 py-2 text-sm font-bold text-white hover:bg-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500'
              }, t('escape_room.back_to_preview') || 'Back to preview'))
          : null,
        // Main content
        mainContent,
        // Selected object puzzle dialog
        escapeRoomState.selectedObject
          ? h('div', {
              className: 'fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4',
              onClick: function() { setEscapeRoomState(rememberEscapeRoomDraft); }
            },
              h('div', {
                className: 'bg-slate-800 w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-2xl border-4 border-purple-500 shadow-2xl p-6 relative',
                role: 'dialog',
                'aria-modal': 'true',
                'aria-labelledby': 'escape-room-object-title',
                ref: puzzleDialogRef,
                tabIndex: -1,
                onClick: function(e) { e.stopPropagation(); }
              }, renderPuzzleDialog())
            )
          : null,
        // Final door button
        renderFinalDoorButton(),
        // Final door dialog
        renderFinalDoorDialog()
      )
    );
  });

  // ═══════════════════════════════════════════════════════════════
  // COMPONENT: EscapeRoomDialogs (Settings + Preview)
  // ═══════════════════════════════════════════════════════════════

  // A comma-separated word list that commits on blur or Enter, so typing a comma
  // never fights the controlled value.
  var ESCAPE_LIST_SEPARATOR = new RegExp('[,;' + String.fromCharCode(0xFF0C, 0x3001, 0x060C) + ']');
  function EscapeListInput(props) {
    var joined = (props.value || []).join(', ');
    var draftState = useState(joined);
    var draft = draftState[0], setDraft = draftState[1];
    useEffect(function() { setDraft(joined); }, [joined]);
    var commit = function() {
      var list = draft.split(ESCAPE_LIST_SEPARATOR).map(function(word) { return word.trim(); }).filter(Boolean);
      if (list.join(', ') !== joined) props.onCommit(list);
      else setDraft(joined);
    };
    return h('input', {
      type: 'text', value: draft, 'aria-label': props.label, disabled: props.disabled,
      onChange: function(e) { setDraft(e.target.value); },
      onBlur: commit,
      onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); commit(); } },
      className: props.className
    });
  }

  var EscapeRoomDialogs = React.memo(function EscapeRoomDialogs(props) {
    var escapeRoomState = props.escapeRoomState;
    var setEscapeRoomState = props.setEscapeRoomState;
    var handlers = props.handlers;
    var t = props.t;
    var hasSourceOrAnalysis = props.hasSourceOrAnalysis;
    var difficultyPreset = escapeRoomPresets[escapeRoomState.difficulty] || escapeRoomPresets.normal;
    var estimatedTime = (escapeRoomState.puzzleCount || 10) * difficultyPreset.timePerPuzzle;

    var settingsDialogRef = useEscapeRoomDialog(!!(escapeRoomState && escapeRoomState.showSettings), function() {
      setEscapeRoomState(function(prev) { return Object.assign({}, prev, { showSettings: false }); });
    });
    var previewDialogRef = useEscapeRoomDialog(!!(escapeRoomState && escapeRoomState.isPreview && escapeRoomState.room), function() {
      setEscapeRoomState(function(prev) { return Object.assign({}, prev, { isPreview: false }); });
    });
    var settingsDialog = null;
    var previewDialog = null;

    // ── Settings Dialog ──
    if (escapeRoomState.showSettings) {
      var hasSaved = typeof handlers.hasSavedEscapeRoom === 'function' ? handlers.hasSavedEscapeRoom() : false;
      var hasDraft = typeof handlers.hasEscapeRoomDraft === 'function' ? !!handlers.hasEscapeRoomDraft() : false;
      settingsDialog = h('div', {
        className: 'fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300',
        onClick: function() { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { showSettings: false }); }); }
      },
        h('div', {
          className: 'bg-white rounded-3xl p-6 md:p-8 shadow-2xl border-4 border-amber-400 relative overflow-hidden max-w-md w-full mx-4 transform transition-all animate-in zoom-in-95 duration-300',
          ref: settingsDialogRef,
          tabIndex: -1,
          'aria-label': t('escape_room.settings_btn'),
          role: 'dialog',
          'aria-modal': 'true',
          onClick: function(e) { e.stopPropagation(); }
        },
          // Close button
          h('button', {
            onClick: function() { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { showSettings: false }); }); },
            className: 'absolute top-4 right-4 p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors',
            'aria-label': t('common.close')
          }, h(X, { size: 20 })),
          // Header
          h('div', { className: 'text-center mb-6 relative' },
            h('div', { className: 'w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm' },
              h(Key, { size: 32, className: 'text-amber-600' })
            ),
            h('h2', { className: 'text-2xl font-black text-slate-800 mb-1' }, t('escape_room.title')),
            h('p', { className: 'text-slate-500 text-sm' }, t('escape_room.settings_btn'))
          ),
          // Settings controls
          h('div', { className: 'space-y-4 mb-6' },
            // Difficulty selector
            h('div', null,
              h('label', { className: 'block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2' }, t('escape_room.difficulty')),
              h('div', { className: 'grid grid-cols-3 gap-2' },
                ['easy', 'normal', 'hard'].map(function(diff) {
                  return h('button', {
                    key: diff,
                    onClick: function() { handlers.updateEscapeRoomSetting('difficulty', diff); },
                    className: 'p-3 rounded-xl border-2 font-bold text-sm capitalize transition-all ' +
                      (escapeRoomState.difficulty === diff
                        ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-md'
                        : 'border-slate-200 text-slate-600 hover:border-amber-200 hover:bg-amber-50')
                  }, t('escape_room.' + diff));
                })
              ),
              h('p', { className: 'text-xs text-slate-500 mt-2 text-center' },
                t('escape_room.time_remaining', { time: Math.floor(estimatedTime / 60) + ':' + String(estimatedTime % 60).padStart(2, '0') }) +
                ' \u2022 ' + t('escape_room.lives') + ': ' + (difficultyPreset.lives >= 99 ? '\u221E' : difficultyPreset.lives) +
                ' \u2022 ' + t('escape_room.hints_remaining', { count: difficultyPreset.hints })
              )
            ),
            // Puzzle count slider
            h('div', null,
              h('label', { className: 'block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2' }, t('escape_room.puzzle_count')),
              h('div', { className: 'flex items-center gap-3' },
                h('input', {
                  'aria-label': t('common.adjust_escape_room_state'),
                  type: 'range',
                  min: '5',
                  max: '15',
                  value: escapeRoomState.puzzleCount || 10,
                  onChange: function(e) { handlers.updateEscapeRoomSetting('puzzleCount', parseInt(e.target.value)); },
                  className: 'flex-grow h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500'
                }),
                h('span', { className: 'w-10 text-center font-bold text-amber-800 bg-amber-50 rounded-lg py-1 border border-amber-200' },
                  escapeRoomState.puzzleCount || 10
                )
              )
            )
          ),
          // A room closed from the preview stays available until it is discarded.
          hasDraft
            ? h('button', {
                type: 'button',
                'data-escape-room-reopen': '',
                onClick: handlers.reopenEscapeRoomPreview,
                className: 'w-full mb-3 py-3 rounded-xl border-2 border-amber-600 text-amber-800 font-bold hover:bg-amber-50 transition-colors flex items-center justify-center gap-2'
              }, h(Eye, { size: 18, 'aria-hidden': 'true' }), t('escape_room.return_to_preview') || 'Return to your room preview')
            : null,
          // Action buttons
          h('div', { className: 'flex gap-3' },
            hasSaved
              ? h('button', {
                  'aria-label': t('common.load_saved_escape_room'),
                  onClick: handlers.loadSavedEscapeRoom,
                  className: 'flex-1 py-3 rounded-xl border-2 border-emerald-600 text-emerald-700 font-bold hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2'
                }, '\uD83D\uDCC2 ' + (t('escape_room.load_saved') || 'Load Saved'))
              : null,
            h('button', {
              'aria-label': t('common.generate'),
              onClick: function() { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { showSettings: false }); }); },
              className: 'flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors'
            }, t('common.cancel')),
            h('button', {
              'aria-label': t('common.launch_escape_room'),
              'aria-busy': !!escapeRoomState.isGenerating,
              onClick: handlers.launchEscapeRoomWithSettings,
              disabled: !hasSourceOrAnalysis,
              className: 'flex-1 py-3 rounded-xl bg-amber-700 text-white font-bold hover:bg-amber-800 transition-all shadow-lg hover:shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
            }, h(Sparkles, { size: 18 }), ' ', t('escape_room.start'))
          )
        )
      );
    }

    // ── Preview Dialog ──
    // Teacher-only review before anyone plays: every answer key is visible and
    // editable, each puzzle can be rewritten or removed, and the room can be tried
    // as a student would play it. Nothing reaches the class from here except
    // through Launch for class.
    if (escapeRoomState.isPreview && escapeRoomState.room) {
      var previewNotes = escapeRoomState.previewNotes || { room: [], byId: {} };
      var previewPuzzles = escapeRoomState.puzzles || [];
      var isPublishing = !!escapeRoomState.isPublishing;
      var previewBusy = !!(escapeRoomState.regeneratingPuzzleId || isPublishing || escapeRoomState.isGenerating);
      var liveSession = !!props.liveSession;
      var fieldClass = 'w-full mt-1 p-2 text-sm border border-slate-400 rounded-lg focus:border-amber-400 focus:ring-1 focus:ring-amber-200 outline-none transition-colors';
      var smallFieldClass = 'flex-1 min-w-0 p-1.5 text-xs border border-slate-400 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1';
      var smallButtonClass = 'min-h-9 px-2.5 py-1 rounded-lg border border-slate-400 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1';
      var puzzleLabel = function(idx, what) { return t('share_collect.q_aria', { n: idx + 1 }) + ': ' + what; };
      var answerLabel = t('escape_room.answer_field') || 'Answer';
      var wordBankLabel = t('simplified.word_bank') || 'Word bank';
      var checkText = {
        options_cleaned: t('escape_room.check_options_cleaned') || 'Duplicate or empty options were removed.',
        order_renumbered: t('escape_room.check_order_renumbered') || 'The order was renumbered. Check that it is right.',
        few_items: t('escape_room.check_few_items') || 'Only two items to put in order.',
        pairs_removed: t('escape_room.check_pairs_removed') || 'Duplicate or incomplete pairs were removed.',
        few_pairs: t('escape_room.check_few_pairs') || 'Fewer than three pairs to match.',
        missing_question: t('escape_room.check_missing_question') || 'Add instructions for students.',
        blank_added: t('escape_room.check_blank_added') || 'The answer appeared in the sentence, so it was replaced with a blank.',
        no_blank: t('escape_room.check_no_blank') || 'The sentence has no blank (_____).',
        answer_in_riddle: t('escape_room.check_answer_in_riddle') || 'The riddle contains its own answer.',
        answer_added: t('escape_room.check_answer_added') || 'The answer was missing from the word bank, so it was added.',
        typed_answer: t('escape_room.check_typed_answer') || 'No word bank: students must type the exact answer.'
      };
      var roomCheckText = function(note) {
        if (note.code === 'count_short') return t('escape_room.check_count_short', { count: note.count, requested: note.requested }) || (note.count + ' of ' + note.requested + ' requested puzzles passed the checks.');
        if (note.code === 'puzzles_removed') return t('escape_room.check_puzzles_removed', { count: note.count }) || ('Puzzles removed because they could not be played: ' + note.count);
        if (note.code === 'final_door_removed') return t('escape_room.check_final_door_removed') || 'The final door was incomplete, so it was removed. Students escape after the last puzzle.';
        if (note.code === 'mix_relaxed') return t('escape_room.check_mix_relaxed') || 'The puzzle mix differs from the usual balance of 2 of each type (1 riddle, 1 scramble).';
        return '';
      };
      var roomChecks = (previewNotes.room || []).map(roomCheckText).filter(Boolean);

      var puzzleCards = previewPuzzles.map(function(puzzle, idx) {
        var typeColorClass =
          puzzle.type === 'mcq' ? 'bg-blue-100 text-blue-800' :
          puzzle.type === 'sequence' ? 'bg-purple-100 text-purple-800' :
          puzzle.type === 'cipher' ? 'bg-red-100 text-red-800' :
          puzzle.type === 'matching' ? 'bg-green-100 text-green-800' :
          puzzle.type === 'scramble' ? 'bg-yellow-100 text-yellow-800' :
          'bg-teal-100 text-teal-800';
        var regenerating = escapeRoomState.regeneratingPuzzleId === puzzle.id;
        var puzzleChecks = (previewNotes.byId && previewNotes.byId[puzzle.id]) || [];
        var puzzleChildren = [];
        // Header row: object, type, and per-puzzle actions
        puzzleChildren.push(
          h('div', { key: 'hdr', className: 'flex flex-wrap items-center gap-2 mb-2' },
            h('span', { className: 'text-xl', 'aria-hidden': 'true' }, (puzzle.linkedObject && puzzle.linkedObject.emoji) || '?'),
            h('span', { className: 'font-bold text-slate-700' }, (puzzle.linkedObject && puzzle.linkedObject.name) || t('share_collect.q_aria', { n: idx + 1 })),
            h('span', { className: 'px-2 py-0.5 rounded-full text-xs font-bold uppercase ' + typeColorClass }, t('escape_room.type_' + puzzle.type) || puzzle.type),
            h('span', { className: 'flex-grow' }),
            h('button', {
              type: 'button',
              'data-regenerate-puzzle': puzzle.id,
              disabled: previewBusy,
              'aria-busy': regenerating,
              'aria-label': puzzleLabel(idx, t('escape_room.regenerate_puzzle') || 'Write a new version'),
              onClick: function() { handlers.regenerateEscapeRoomPuzzle(idx); },
              className: smallButtonClass
            }, h(RefreshCw, { size: 14, 'aria-hidden': 'true', className: regenerating ? 'animate-spin motion-reduce:animate-none' : '' }),
              regenerating ? (t('escape_room.regenerating') || 'Writing...') : (t('escape_room.regenerate_puzzle') || 'Write a new version')),
            h('button', {
              type: 'button',
              'data-remove-puzzle': puzzle.id,
              disabled: previewBusy || previewPuzzles.length <= 1,
              'aria-label': puzzleLabel(idx, t('escape_room.remove_puzzle') || 'Remove puzzle'),
              onClick: function() { handlers.removeEscapeRoomPuzzle(idx); },
              className: smallButtonClass
            }, h(X, { size: 14, 'aria-hidden': 'true' }), t('escape_room.remove_puzzle') || 'Remove puzzle')
          )
        );
        if (puzzleChecks.length) {
          puzzleChildren.push(
            h('ul', { key: 'checks', 'data-puzzle-checks': puzzle.id, className: 'text-xs text-amber-950 bg-amber-50 border border-amber-400 rounded-lg px-3 py-2 list-disc list-inside space-y-0.5' },
              puzzleChecks.map(function(code) { return h('li', { key: code }, checkText[code] || code); }))
          );
        }
        // Question input
        var editField = puzzle.sentence != null ? 'sentence' : (puzzle.encodedText != null ? 'encodedText' : 'question');
        var editLabel = editField === 'sentence' ? t('escape_room.sentence_with_blank') : editField === 'encodedText' ? t('escape_room.riddle_challenge') : t('quiz.question_label');
        puzzleChildren.push(
          h('div', { key: 'q' },
            h('label', { className: 'text-xs font-bold text-slate-600 uppercase' }, editLabel,
              h('input', {
                type: 'text',
                value: puzzle[editField] || '',
                'aria-label': t('share_collect.q_aria', { n: idx + 1 }) + ': ' + editLabel,
                onChange: function(e) {
                  handlers.updateEscapeRoomPuzzle(idx, editField, e.target.value);
                },
                className: fieldClass
              })
            )
          )
        );
        // MCQ options and the correct option
        if (puzzle.type === 'mcq' && puzzle.options) {
          puzzleChildren.push(
            h('div', { key: 'opts', className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
              puzzle.options.map(function(opt, optIdx) {
                return h('div', { key: optIdx, className: 'flex items-center gap-1' },
                  h('span', {
                    'aria-hidden': 'true',
                    className: 'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ' +
                      (optIdx === puzzle.correctIndex ? 'bg-green-700 text-white' : 'bg-slate-200 text-slate-700')
                  }, String.fromCharCode(65 + optIdx)),
                  h('input', {
                    type: 'text',
                    value: opt,
                    'aria-label': t('share_collect.q_aria', { n: idx + 1 }) + ': ' + t('escape_room.option') + ' ' + String.fromCharCode(65 + optIdx),
                    onChange: function(e) { handlers.updateEscapeRoomPuzzle(idx, 'options', { index: optIdx, text: e.target.value }); },
                    className: smallFieldClass + ' ' + (optIdx === puzzle.correctIndex ? 'border-green-700 bg-green-50' : '')
                  })
                );
              })
            ),
            h('label', { key: 'correct', className: 'flex items-center gap-2 text-xs font-bold text-slate-700' },
              t('escape_room.correct_option') || 'Correct option',
              h('select', {
                value: String(puzzle.correctIndex),
                'aria-label': puzzleLabel(idx, t('escape_room.correct_option') || 'Correct option'),
                onChange: function(e) { handlers.updateEscapeRoomPuzzle(idx, 'correctIndex', Number(e.target.value)); },
                className: 'p-1.5 text-xs border border-slate-400 rounded-lg bg-white'
              }, puzzle.options.map(function(opt, optIdx) {
                return h('option', { key: optIdx, value: String(optIdx) }, String.fromCharCode(65 + optIdx) + '. ' + String(opt).slice(0, 60));
              }))
            )
          );
        }
        // Answers for the single-word puzzle types
        if (puzzle.type === 'scramble' || puzzle.type === 'fillin' || puzzle.type === 'cipher') {
          puzzleChildren.push(
            h('div', { key: 'answer', className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
              h('label', { className: 'text-xs font-bold text-slate-600 uppercase' }, answerLabel,
                h('input', {
                  type: 'text',
                  value: puzzle.answer || '',
                  'aria-label': puzzleLabel(idx, answerLabel),
                  onChange: function(e) { handlers.updateEscapeRoomPuzzle(idx, 'answer', e.target.value); },
                  className: fieldClass
                })
              ),
              puzzle.type !== 'scramble'
                ? h('label', { className: 'text-xs font-bold text-slate-600 uppercase' }, wordBankLabel,
                    h(EscapeListInput, {
                      value: puzzle.wordbank || [],
                      label: puzzleLabel(idx, wordBankLabel),
                      onCommit: function(list) { handlers.updateEscapeRoomPuzzle(idx, 'wordbank', list); },
                      className: fieldClass
                    })
                  )
                : null
            )
          );
        }
        // Sequence: items shown in the correct order, editable and reorderable
        if (puzzle.type === 'sequence' && puzzle.items) {
          var order = isIndexOrder(puzzle.correctOrder, puzzle.items.length, 0) ? puzzle.correctOrder : puzzle.items.map(function(_, i) { return i; });
          var orderLabel = t('escape_room.correct_order') || 'Correct order';
          puzzleChildren.push(
            h('div', { key: 'seq' },
              h('p', { className: 'text-xs font-bold text-slate-600 uppercase', id: 'escape-order-' + idx }, orderLabel),
              h('ol', { className: 'space-y-1 mt-1', 'aria-labelledby': 'escape-order-' + idx },
                order.map(function(itemIndex, position) {
                  var itemLabel = t('escape_room.order_item', { n: position + 1 }) || ('Item ' + (position + 1));
                  return h('li', { key: itemIndex, className: 'flex items-center gap-1' },
                    h('span', { className: 'w-6 text-xs font-bold text-slate-600', 'aria-hidden': 'true' }, (position + 1) + '.'),
                    h('input', {
                      type: 'text',
                      value: puzzle.items[itemIndex] || '',
                      'aria-label': puzzleLabel(idx, itemLabel),
                      onChange: function(e) { handlers.updateEscapeRoomPuzzle(idx, 'item', { position: position, text: e.target.value }); },
                      className: smallFieldClass
                    }),
                    h('button', {
                      type: 'button',
                      disabled: position === 0,
                      'aria-label': puzzleLabel(idx, t('escape_room.move_item_up', { n: position + 1 }) || ('Move item ' + (position + 1) + ' up')),
                      onClick: function() { handlers.updateEscapeRoomPuzzle(idx, 'moveItem', { position: position, delta: -1 }); },
                      className: smallButtonClass
                    }, h(ChevronUp, { size: 14, 'aria-hidden': 'true' })),
                    h('button', {
                      type: 'button',
                      disabled: position === order.length - 1,
                      'aria-label': puzzleLabel(idx, t('escape_room.move_item_down', { n: position + 1 }) || ('Move item ' + (position + 1) + ' down')),
                      onClick: function() { handlers.updateEscapeRoomPuzzle(idx, 'moveItem', { position: position, delta: 1 }); },
                      className: smallButtonClass
                    }, h(ChevronDown, { size: 14, 'aria-hidden': 'true' }))
                  );
                })
              )
            )
          );
        }
        // Matching pairs
        if (puzzle.type === 'matching' && puzzle.pairs) {
          puzzleChildren.push(
            h('div', { key: 'pairs' },
              h('p', { className: 'text-xs font-bold text-slate-600 uppercase' }, t('matching.pairs')),
              h('div', { className: 'space-y-1 mt-1' },
                puzzle.pairs.map(function(pair, pairIdx) {
                  return h('div', { key: pairIdx, className: 'grid grid-cols-2 gap-1' },
                    h('input', {
                      type: 'text',
                      value: pair.left || '',
                      'aria-label': puzzleLabel(idx, t('escape_room.pair_left', { n: pairIdx + 1 }) || ('Pair ' + (pairIdx + 1) + ', left')),
                      onChange: function(e) { handlers.updateEscapeRoomPuzzle(idx, 'pair', { index: pairIdx, side: 'left', text: e.target.value }); },
                      className: smallFieldClass
                    }),
                    h('input', {
                      type: 'text',
                      value: pair.right || '',
                      'aria-label': puzzleLabel(idx, t('escape_room.pair_right', { n: pairIdx + 1 }) || ('Pair ' + (pairIdx + 1) + ', right')),
                      onChange: function(e) { handlers.updateEscapeRoomPuzzle(idx, 'pair', { index: pairIdx, side: 'right', text: e.target.value }); },
                      className: smallFieldClass
                    })
                  );
                })
              )
            )
          );
        }
        // Hint input (always shown, so an empty hint can be written and cleared)
        puzzleChildren.push(
          h('div', { key: 'hint' },
            h('label', { className: 'text-xs font-bold text-slate-600 uppercase' }, t('escape_room.hint'),
              h('input', {
                type: 'text',
                value: puzzle.hint || '',
                'aria-label': t('share_collect.q_aria', { n: idx + 1 }) + ': ' + t('escape_room.hint'),
                onChange: function(e) { handlers.updateEscapeRoomPuzzle(idx, 'hint', e.target.value); },
                className: fieldClass
              })
            )
          )
        );
        return h('div', {
          key: (puzzle.id || idx),
          'data-preview-puzzle': puzzle.id,
          className: 'p-4 bg-slate-50 rounded-xl border border-slate-400 hover:border-amber-300 transition-colors'
        },
          h('div', { className: 'space-y-2' }, puzzleChildren)
        );
      });

      var finalDoor = escapeRoomState.finalDoorPuzzle;
      previewDialog = h('div', {
        className: 'fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300',
        style: { overflowY: 'auto' }
      },
        h('div', {
          className: 'bg-white rounded-3xl p-6 md:p-8 shadow-2xl border-4 border-amber-400 relative overflow-y-auto max-w-3xl w-full mx-4 my-8 max-h-[90vh] transform transition-all animate-in zoom-in-95 duration-300',
          ref: previewDialogRef,
          tabIndex: -1,
          'aria-label': t('escape_room.preview_title'),
          role: 'dialog',
          'aria-modal': 'true',
          onClick: function(e) { e.stopPropagation(); }
        },
          // Close keeps the room; Discard is the only action that deletes it.
          h('button', {
            onClick: function() { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { isPreview: false, confirmDiscard: false }); }); },
            className: 'absolute top-4 right-4 p-2 rounded-full text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors z-10',
            'aria-label': t('common.close')
          }, h(X, { size: 20 })),
          // Header
          h('div', { className: 'text-center mb-6' },
            h('div', { className: 'w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm' },
              h(Key, { size: 32, className: 'text-amber-700' })
            ),
            h('h2', { className: 'text-2xl font-black text-slate-800 mb-1 flex items-center justify-center gap-2' },
              h(Eye, { size: 24, 'aria-hidden': 'true' }), t('escape_room.preview_title') || 'Preview Puzzle Challenge'
            ),
            h('p', { className: 'text-slate-600 text-sm' }, t('escape_room.preview_desc') || 'Review and edit puzzles before students play. Click any field to edit.'),
            liveSession
              ? h('p', { className: 'text-slate-700 text-sm font-bold mt-1' }, t('escape_room.preview_live_note') || 'Students see nothing until you choose Launch for class.')
              : null
          ),
          roomChecks.length
            ? h('ul', { 'data-escape-room-checks': '', className: 'mb-4 text-sm text-amber-950 bg-amber-50 border-2 border-amber-400 rounded-xl px-4 py-3 list-disc list-inside space-y-1' },
                roomChecks.map(function(text, i) { return h('li', { key: i }, text); }))
            : null,
          // Room theme and description
          h('div', { className: 'mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-300 space-y-2' },
            h('label', { className: 'block text-xs font-bold text-amber-900 uppercase' }, t('escape_room.room_theme') || 'Room theme',
              h('input', {
                type: 'text',
                value: escapeRoomState.room.theme || '',
                'aria-label': t('escape_room.room_theme') || 'Room theme',
                onChange: function(e) { handlers.updateEscapeRoomRoom('theme', e.target.value); },
                className: fieldClass + ' font-bold text-amber-900'
              })
            ),
            h('label', { className: 'block text-xs font-bold text-amber-900 uppercase' }, t('escape_room.room_description') || 'Room description',
              h('textarea', {
                rows: 2,
                value: escapeRoomState.room.description || '',
                'aria-label': t('escape_room.room_description') || 'Room description',
                onChange: function(e) { handlers.updateEscapeRoomRoom('description', e.target.value); },
                className: fieldClass
              })
            )
          ),
          // Puzzles list
          h('div', { className: 'space-y-3 mb-6' }, puzzleCards),
          // Final door puzzle
          finalDoor
            ? h('div', { className: 'mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border border-red-300 space-y-2' },
                h('h4', { className: 'font-bold text-red-900 flex items-center gap-2' }, h(DoorOpen, { size: 18, 'aria-hidden': 'true' }), t('escape_room.final_door_title')),
                h('input', {
                  type: 'text',
                  value: finalDoor.sentence || '',
                  'aria-label': t('escape_room.final_door_title') + ': ' + t('escape_room.sentence_with_blank'),
                  onChange: function(e) { handlers.updateEscapeRoomFinalDoor('sentence', e.target.value); },
                  className: 'w-full p-2 text-sm border border-red-300 rounded-lg focus:border-red-500'
                }),
                h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
                  h('label', { className: 'text-xs font-bold text-red-900 uppercase' }, answerLabel,
                    h('input', {
                      type: 'text',
                      value: finalDoor.answer || '',
                      'aria-label': t('escape_room.final_door_title') + ': ' + answerLabel,
                      onChange: function(e) { handlers.updateEscapeRoomFinalDoor('answer', e.target.value); },
                      className: fieldClass
                    })
                  ),
                  h('label', { className: 'text-xs font-bold text-red-900 uppercase' }, t('escape_room.acceptable_answers') || 'Also accept',
                    h(EscapeListInput, {
                      value: finalDoor.acceptableAnswers || [],
                      label: t('escape_room.final_door_title') + ': ' + (t('escape_room.acceptable_answers') || 'Also accept'),
                      onCommit: function(list) { handlers.updateEscapeRoomFinalDoor('acceptableAnswers', list); },
                      className: fieldClass
                    })
                  ),
                  Array.isArray(finalDoor.wordbank)
                    ? h('label', { className: 'text-xs font-bold text-red-900 uppercase sm:col-span-2' }, wordBankLabel,
                        h(EscapeListInput, {
                          value: finalDoor.wordbank,
                          label: t('escape_room.final_door_title') + ': ' + wordBankLabel,
                          onCommit: function(list) { handlers.updateEscapeRoomFinalDoor('wordbank', list); },
                          className: fieldClass
                        })
                      )
                    : null
                )
              )
            : null,
          // Discard asks first: generated rooms are expensive to recreate.
          escapeRoomState.confirmDiscard
            ? h('div', { role: 'group', 'aria-label': t('common.discard_preview'), 'data-escape-room-discard-confirm': '', className: 'mb-4 p-4 rounded-xl border-2 border-red-400 bg-red-50' },
                h('p', { className: 'text-sm font-bold text-red-950' }, t('escape_room.discard_confirm') || 'Discard this room? Edits you have not saved will be lost.'),
                h('div', { className: 'flex flex-wrap gap-2 mt-3' },
                  h('button', {
                    type: 'button',
                    autoFocus: true,
                    onClick: function() { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { confirmDiscard: false }); }); },
                    className: 'min-h-11 px-4 py-2 rounded-lg border-2 border-slate-400 bg-white font-bold text-slate-800 hover:bg-slate-50'
                  }, t('escape_room.keep_editing') || 'Keep editing'),
                  h('button', {
                    type: 'button',
                    onClick: handlers.discardEscapeRoomPreview,
                    className: 'min-h-11 px-4 py-2 rounded-lg bg-red-700 font-bold text-white hover:bg-red-800'
                  }, t('escape_room.confirm_discard') || 'Discard room')
                )
              )
            : null,
          // Action buttons
          h('div', { className: 'flex flex-wrap gap-3' },
            h('button', {
              type: 'button',
              'aria-label': t('common.discard_preview'),
              onClick: function() { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { confirmDiscard: true }); }); },
              className: 'flex-1 min-w-[8rem] py-3 rounded-xl border-2 border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors'
            }, t('common.discard') || 'Discard'),
            h('button', {
              type: 'button',
              'data-escape-room-new': '',
              disabled: previewBusy,
              onClick: handlers.generateNewEscapeRoom,
              className: 'flex-1 min-w-[8rem] py-3 rounded-xl border-2 border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2'
            }, h(RefreshCw, { size: 16, 'aria-hidden': 'true' }), t('escape_room.new_room') || 'New room'),
            h('button', {
              type: 'button',
              'data-escape-room-try': '',
              disabled: previewBusy,
              onClick: handlers.startEscapeRoomTrial,
              className: 'flex-1 min-w-[8rem] py-3 rounded-xl border-2 border-indigo-400 text-indigo-800 font-bold hover:bg-indigo-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2'
            }, h(Play, { size: 16, 'aria-hidden': 'true' }), t('escape_room.try_room') || 'Try as a student'),
            h('button', {
              type: 'button',
              'aria-label': t('common.save_escape_room_configuration'),
              onClick: handlers.saveEscapeRoomConfig,
              className: 'flex-1 min-w-[8rem] py-3 rounded-xl border-2 border-emerald-500 text-emerald-800 font-bold hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2'
            }, h(Save, { size: 16, 'aria-hidden': 'true' }), t('escape_room.save_config') || 'Save'),
            liveSession
              ? h('button', {
                  type: 'button',
                  'data-escape-room-launch-live': '',
                  disabled: previewBusy || !!props.liveBusy,
                  'aria-busy': isPublishing,
                  onClick: handlers.publishEscapeRoomLive,
                  className: 'flex-1 min-w-[10rem] py-3 rounded-xl bg-amber-700 text-white font-bold hover:bg-amber-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
                }, h(Rocket, { size: 16, 'aria-hidden': 'true' }), isPublishing ? (t('escape_room.launching_live') || 'Sending to the class...') : (t('escape_room.launch_live') || 'Launch for class'))
              : h('button', {
                  type: 'button',
                  'aria-label': t('common.confirm_and_launch_escape_room'),
                  disabled: previewBusy,
                  onClick: handlers.confirmEscapeRoomPreview,
                  className: 'flex-1 min-w-[8rem] py-3 rounded-xl bg-amber-700 text-white font-bold hover:bg-amber-800 transition-all shadow-lg hover:shadow-amber-500/30 disabled:opacity-50 flex items-center justify-center gap-2'
                }, h(Rocket, { size: 16, 'aria-hidden': 'true' }), t('escape_room.launch') || 'Launch!')
          ),
          liveSession && props.liveBusy
            ? h('p', { className: 'mt-3 text-sm text-slate-700' }, t('escape_room.end_live_activity_first') || 'End the current live activity before launching this room.')
            : null
        )
      );
    }

    return h(React.Fragment, null, settingsDialog, previewDialog);
  });

  // ═══════════════════════════════════════════════════════════════
  // REGISTRATION
  // ═══════════════════════════════════════════════════════════════

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.createEscapeRoomEngine = createEscapeRoomEngine;
  window.AlloModules.EscapeRoomGameplay = EscapeRoomGameplay;
  window.AlloModules.EscapeRoomDialogs = EscapeRoomDialogs;
  window.AlloModules.EscapeRoomData = { prepare: prepareEscapeRoomData, process: processEscapeRoomPuzzles, parse: parseEscapeRoomJson, toSaved: savedEscapeRoomFrom };
  window.AlloModules.useEscapeRoomTimer = useEscapeRoomTimer;
  window.AlloModules.startEscapeRoomClock = startEscapeRoomClock;
  window.AlloModules.EscapeRoomModule = true;

  console.log('[EscapeRoomModule] Loaded successfully');
})();
