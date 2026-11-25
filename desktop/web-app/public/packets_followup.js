// Closed-loop follow-up packet planning, 1-page printable student progress and UDL supports summary,
// and local MTSS triage export for the Add up results page (packets-results.html).
// One plain script for a browser page (window.AlloPacketFollowup) and for Node (module.exports).
// Runs locally in the browser with zero network calls and zero markup strings (DOM textContent only).
(function (root) {
  'use strict';

  var VERSION = 'alloflow-packet-followup/1';
  var MTSS_EXPORT_KIND = 'alloflow-packets-mtss-triage';
  var MTSS_EXPORT_VERSION = 1;
  var MIN_GROWTH = 6;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var HONEST = 'This compares students in these files with each other. It does not compare them with any published scores. Compare only results gathered the same way.';

  var WORD_SOUNDS_ACTIVITIES = {
    rhyming: true,
    syllable_counting: true,
    syllable_blending: true,
    word_families: true,
    isolation: true,
    sound_sort: true,
    blending: true,
    segmentation: true,
    counting: true,
    manipulation: true,
    mapping: true,
    missing_letter: true,
    orthography: true,
    word_scramble: true,
    spelling_bee: true,
    decoding: true,
    read_sentence: true,
    sentence_match: true,
    read_passage: true,
  };

  var TOOL_LABELS = {
    textLarger: 'larger text',
    textLargest: 'largest text',
    textExtraLarge: 'extra large text',
    contrastHigh: 'high contrast',
    contrastSoft: 'soft contrast',
    colorsDark: 'dark colors',
    colorsOcean: 'ocean colors',
    colorsSunny: 'sunny colors',
    colorsForest: 'forest colors',
    colorsRose: 'rose colors',
    spacingWide: 'wider spacing',
    lettersLexend: 'Lexend letters',
    lettersAtkinson: 'Atkinson letters',
    lettersBook: 'book letters',
    lettersRounded: 'rounded letters',
    lettersMono: 'monospace letters',
    lettersOpenDyslexic: 'OpenDyslexic letters',
    readingFocus: 'reading focus line',
    magnifier: 'magnifier',
    readChoices: 'read choices aloud',
  };

  var ITEM_SUPPORT_LABELS = {
    wordReplays: 'Word audio replay',
    wordReplay: 'Word audio replay',
    replay: 'Audio replay',
    replays: 'Audio replay',
    soundReplay: 'Sound audio replay',
    soundReplays: 'Sound audio replay',
    phonemeReplay: 'Sound audio replay',
    sentenceReplay: 'Sentence audio replay',
    readAloud: 'Read-aloud support',
    audio: 'Audio support',
    copied: 'Copy-and-compare model',
    copyModel: 'Copy-and-compare model',
    study: 'Study model shown',
    hint: 'Worked hint',
    hints: 'Worked hint',
    hint_shown: 'Worked hint',
    workedExample: 'Worked example',
    adaptiveHint: 'Step-by-step hint',
    picture: 'Picture support',
    pictureHint: 'Picture support',
    slow: 'Slower playback',
    slowAudio: 'Slower playback',
    syllables: 'Syllable breakdown',
    bilingual: 'Home-language support',
    bilingual_dir: 'Home-language directions',
    homeLang: 'Home-language support',
    home_lang_dir: 'Home-language directions',
    efChecklist: 'First-Then checklist',
    ef_checklist: 'First-Then checklist',
    calmBreak: 'Calm-down break card',
    calm_break: 'Calm-down break card',
    calmBreath: 'Box breathing guide',
    calmGround: '5-4-3-2-1 grounding card',
    calmStretch: 'Seated movement break',
    focusTimer: 'Focus timer',
    focus_timer: 'Focus timer',
    regroup: 'Base-ten regrouping',
    balanceStep: 'Balance-scale step',
    playlistRoadmap: 'Unit playlist roadmap',
    aac_scan_used: 'Switch scanning (AAC)',
    aac_sentence_spoken: 'AAC sentence bar voice',
    aac_audio_clip: 'Recorded AAC voice clip',
    aac_core_tap: 'AAC core symbol tap',
    aac_fringe_tap: 'AAC fringe symbol tap',
    aac_tab_switch: 'AAC folder switch',
    tier_frames: 'Sentence frames (Level 1)',
    tier_starters: 'Sentence starters (Level 2)',
    tier_independent: 'Independent writing (Level 3)',
    stretch: 'Stretch challenge item',
    stretch_item: 'Stretch challenge item',
    lab_data_filter: 'Data Explorer filter',
    lab_chart_switch: 'Data Explorer chart view',
    lab_circuit: 'Interactive circuit builder',
    lab_circuit_toggle: 'Circuit switch trial',
    lab_tile_toggle: 'Geometry grid exploration',
    lab_number_line: 'Interactive number line',
    lab_fraction_bars: 'Interactive fraction bars',
    lab_geoboard: 'Interactive geoboard',
    manip_number_line: 'Interactive number line',
    manip_fraction_bars: 'Interactive fraction bars',
    manip_base_ten: 'Base-ten blocks',
  };

  var CHOICE_PATHWAY_LABELS = {
    concept_sort: 'Concept Sort',
    sequence_order: 'Sequencing & Timeline',
    tiered_writing: 'Tiered Writing',
    cloze_short: 'Fill-in-the-Blank',
  };

  var MAZE_STOP_WORDS = {
    that: true, with: true, from: true, this: true, they: true, them: true,
    when: true, what: true, into: true, have: true, were: true, been: true,
    will: true, just: true, some: true, more: true, than: true, very: true,
    also: true, then: true, only: true, each: true, about: true, after: true,
    before: true, while: true, where: true, which: true, their: true, there: true,
    these: true, those: true, would: true, could: true, should: true, other: true,
    over: true, under: true, through: true, between: true, because: true,
    without: true, around: true, across: true, during: true, every: true,
    many: true, much: true, most: true, both: true, such: true, here: true,
    your: true, does: true, done: true, make: true, made: true, said: true,
    went: true, come: true, came: true, like: true, back: true, down: true,
    even: true, still: true, well: true, good: true, long: true, away: true,
    onto: true, upon: true, until: true,
  };

  function mazeContentWord(it) {
    var raw = String((it && (it.word || it.target)) || '').trim().toLowerCase();
    if (!raw || !/^[a-z]{4,20}$/.test(raw) || own(MAZE_STOP_WORDS, raw)) return '';
    return raw;
  }

  function own(obj, key) {
    return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
  }

  function isUnsafeKey(key) {
    return key === '__proto__' || key === 'constructor' || key === 'prototype';
  }

  function countWord(n, one, many) {
    return n + ' ' + (n === 1 ? one : (many || one + 's'));
  }

  function unitFor(value, unitName) {
    return Number(value) === 1
      ? String(unitName || '').replace(/^digits /, 'digit ').replace(/^items /, 'item ')
      : String(unitName || '');
  }

  function round1(n) {
    return Math.round(Number(n) * 10) / 10;
  }

  function signed(n) {
    var r = round1(n);
    if (r === 0) return '0';
    return (r > 0 ? '+' : '') + r;
  }

  function showDate(iso, short) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    if (!m || !MONTHS[Number(m[2]) - 1]) return 'No date';
    return MONTHS[Number(m[2]) - 1] + ' ' + Number(m[3]) + (short ? '' : ', ' + m[1]);
  }

  function dateRange(first, last) {
    if (!first) return '';
    if (!last || first === last) return showDate(first);
    return showDate(first, first.slice(0, 4) === last.slice(0, 4)) + ' to ' + showDate(last);
  }

  function dayNumber(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000 : 0;
  }

  function formatDuration(ms) {
    var sec = Math.max(0, Math.round((Number(ms) || 0) / 1000));
    if (sec < 60) return sec + ' s';
    var min = Math.floor(sec / 60);
    var rem = sec % 60;
    if (min < 60) return min + ' min' + (rem ? ' ' + rem + ' s' : '');
    var hr = Math.floor(min / 60);
    return hr + ' h' + (min % 60 ? ' ' + (min % 60) + ' min' : '');
  }

  function two(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate());
  }

  function slugOf(text) {
    return String(text || 'set')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'set';
  }

  function csvGuard(value) {
    var raw = value == null ? '' : String(value);
    var s = /^[\t\r\n]/.test(raw) || /^\s*[=+\-@|]/.test(raw) ? "'" + raw : raw;
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function parseMathFact(raw) {
    var m = /^(\d{1,3})\s*([-+xX*/:\u2212\u00D7\u00F7])\s*(\d{1,3})$/.exec(String(raw || '').trim());
    if (!m) return null;
    var op = m[2] === '+' ? '+'
      : (m[2] === '-' || m[2] === '\u2212') ? '-'
      : (m[2] === 'x' || m[2] === 'X' || m[2] === '*' || m[2] === '\u00D7') ? 'x'
      : '/';
    var key = m[1] + op + m[3];
    var turnaroundKey = (op === '+' || op === 'x') ? (m[3] + op + m[1]) : '';
    return { text: m[0], a: m[1], b: m[3], op: op, key: key, turnaroundKey: turnaroundKey };
  }

  var ITEM_SUPPORT_LABELS_LOWER = Object.create(null);
  Object.keys(ITEM_SUPPORT_LABELS).forEach(function (k) {
    ITEM_SUPPORT_LABELS_LOWER[k.toLowerCase()] = ITEM_SUPPORT_LABELS[k];
  });

  function humanSupportLabel(key) {
    if (own(ITEM_SUPPORT_LABELS, key)) return ITEM_SUPPORT_LABELS[key];
    var low = String(key || '').toLowerCase();
    if (own(ITEM_SUPPORT_LABELS_LOWER, low)) return ITEM_SUPPORT_LABELS_LOWER[low];
    if (/^(?:bilingual_|lang_|home_lang_)/.test(low)) return 'Home-language support';
    if (/^lab_/.test(low)) {
      var labPart = low.slice(4).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
      return labPart ? ('STEM lab: ' + labPart) : 'STEM lab tool';
    }
    if (/^manip_/.test(low)) {
      var manipPart = low.slice(6).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
      return manipPart ? ('Math manipulative: ' + manipPart) : 'Math manipulative';
    }
    var spaced = String(key || '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!spaced) return '';
    return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
  }

  function parseItemSupports(raw) {
    var keys = [];
    var totalCount = 0;
    if (!raw) return { totalCount: 0, keys: keys };
    if (typeof raw === 'string') {
      raw.split(/[;,]+/).forEach(function (part) {
        var trimmed = part.trim();
        if (!trimmed) return;
        var at = trimmed.indexOf(':');
        if (at < 0) at = trimmed.indexOf('=');
        var k = (at >= 0 ? trimmed.slice(0, at) : trimmed).trim();
        var v = at >= 0 ? trimmed.slice(at + 1).trim() : '1';
        if (!k || isUnsafeKey(k)) return;
        var low = v.toLowerCase();
        if (low === '' || low === '0' || low === 'false' || low === 'no' || low === 'none') return;
        var num = Number(v);
        var count = isFinite(num) && num > 0 ? Math.round(num) : 1;
        totalCount += count;
        keys.push({ key: k, label: humanSupportLabel(k), count: count });
      });
    } else if (typeof raw === 'object' && !Array.isArray(raw)) {
      Object.keys(raw).forEach(function (k) {
        if (!k || isUnsafeKey(k)) return;
        var val = raw[k];
        if (val === false || val === null || val === undefined || val === '' || val === 0 || val === '0') return;
        var num = Number(val);
        var count = isFinite(num) && num > 0 ? Math.round(num) : 1;
        totalCount += count;
        keys.push({ key: k, label: humanSupportLabel(k), count: count });
      });
    }
    return { totalCount: totalCount, keys: keys };
  }

  function detectWordSoundsPattern(words) {
    var list = (words || []).map(function (w) { return String(w || '').trim().toLowerCase(); }).filter(Boolean);
    if (!list.length) return '';
    var counts = [
      ['digraphs', 0, /(?:ch|sh|th|wh|ck|ph|ng)/],
      ['vowel teams', 0, /(?:ai|ay|ea|ee|oa|oe|ow|oo|oi|oy|ou|igh|ew|aw|au)/],
      ['r-controlled vowels', 0, /(?:ar|er|ir|or|ur)/],
      ['final e', 0, /^[bcdfghjklmnpqrstvwxyz]+[aeiou][bcdfghjklmnpqrstvwxyz]e$/],
      ['blends', 0, /^(?:bl|br|cl|cr|dr|fl|fr|gl|gr|pl|pr|sc|sk|sl|sm|sn|sp|st|sw|tr|tw)/],
      ['short vowels', 0, /^[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz]$/],
    ];
    list.forEach(function (w) {
      for (var i = 0; i < counts.length; i++) {
        if (counts[i][2].test(w)) {
          counts[i][1] += 1;
          break;
        }
      }
    });
    counts.sort(function (a, b) { return b[1] - a[1]; });
    return counts[0][1] > 0 && counts[0][1] * 2 >= list.length ? counts[0][0] : '';
  }

  // Interleave missed/retried targets with mastered review items (roughly 2 missed : 1 review).
  function interleaveItems(missed, review, maxTotal) {
    var m = Array.isArray(missed) ? missed.slice() : [];
    var r = Array.isArray(review) ? review.slice() : [];
    var cap = Number(maxTotal) > 0 ? Math.floor(Number(maxTotal)) : (m.length + r.length);
    var out = [];
    var mi = 0;
    var ri = 0;
    while (out.length < cap && (mi < m.length || ri < r.length)) {
      if (mi < m.length) out.push(m[mi++]);
      if (out.length < cap && mi < m.length && (m.length - mi >= r.length - ri || ri >= r.length)) {
        out.push(m[mi++]);
      }
      if (out.length < cap && ri < r.length) {
        out.push(r[ri++]);
      }
    }
    return out;
  }

  function isWordSoundsActivity(act, reader) {
    if (!act || act === 'letter_tracing') return false;
    if (reader && reader.ACTIVITIES && own(reader.ACTIVITIES, act)) return true;
    return own(WORD_SOUNDS_ACTIVITIES, act);
  }

  // ---------------------------------------------------------------------------
  // 1. Closed-loop follow-up analysis and draft builders
  // ---------------------------------------------------------------------------
  function analyzeFollowup(input, options) {
    var opts = options || {};
    var reader = opts.reader || (root && root.AlloPacketResults) || null;
    var scope = input && input.scope === 'group' ? 'group' : 'student';
    var learners = scope === 'group'
      ? (Array.isArray(input && input.learners) ? input.learners : [])
      : (input && input.learner ? [input.learner] : []);
    var totalLearners = scope === 'group'
      ? Math.max(learners.length, Number(input && input.totalLearners) || learners.length)
      : learners.length;
    var query = scope === 'group' ? String((input && input.query) || '').trim() : '';
    var maxMissed = Math.max(1, Math.min(20, Number(opts.maxMissed) || 10));

    var wsMissedMap = Object.create(null);
    var wsMissedList = [];
    var wsMasteredMap = Object.create(null);
    var wsMasteredList = [];
    var wsActivityMisses = Object.create(null);

    var vocabMissedMap = Object.create(null);
    var vocabMissedList = [];
    var vocabMasteredMap = Object.create(null);
    var vocabMasteredList = [];
    var vocabDirectMisses = 0;
    var mazeVocabMisses = 0;

    var mathMissedMap = Object.create(null);
    var mathMissedList = [];
    var mathMasteredMap = Object.create(null);
    var mathMasteredList = [];
    var mathBlocked = Object.create(null);

    function bumpEntry(map, list, key, display, learnerSeen, studentKey) {
      var entry = map[key];
      if (!entry) {
        entry = map[key] = { key: key, display: display, misses: 0, unresolved: 0, retries: 0, successes: 0, students: 0 };
        list.push(entry);
      }
      if (learnerSeen && studentKey && !learnerSeen[key]) {
        learnerSeen[key] = true;
        entry.students += 1;
      }
      return entry;
    }

    learners.forEach(function (learner, idx) {
      if (!learner) return;
      var studentKey = String(learner.key || learner.label || ('s-' + idx));
      var wsMissSeen = Object.create(null);
      var wsOkSeen = Object.create(null);
      var vocabMissSeen = Object.create(null);
      var vocabOkSeen = Object.create(null);
      var mathMissSeen = Object.create(null);
      var mathOkSeen = Object.create(null);

      (learner.sessions || []).forEach(function (s) {
        (s.items || []).forEach(function (it) {
          if (!it || it.practice || !it.attempted) return;
          var act = String(it.activity || '');
          var masteredOnItem = !!(it.firstTry && it.correct);

          if (/^math_(?:computation|ccc|rehearsal)$/i.test(act)) {
            var mf = parseMathFact(it.word);
            if (!mf) return;
            if (!masteredOnItem) {
              mathBlocked[mf.key] = true;
              if (mf.turnaroundKey) mathBlocked[mf.turnaroundKey] = true;
              var me = bumpEntry(mathMissedMap, mathMissedList, mf.key, mf.text, mathMissSeen, studentKey);
              me.misses += 1;
              if (!it.correct) me.unresolved += 1;
              if (Number(it.tries) > 1) me.retries += 1;
            } else {
              var mok = bumpEntry(mathMasteredMap, mathMasteredList, mf.key, mf.text, mathOkSeen, studentKey);
              mok.successes += 1;
            }
            return;
          }

          if (/^vocab_/i.test(act)) {
            var vw = String(it.word || it.target || '').trim();
            if (!vw) return;
            var vk = vw.toLowerCase();
            if (!masteredOnItem) {
              var ve = bumpEntry(vocabMissedMap, vocabMissedList, vk, vw, vocabMissSeen, studentKey);
              ve.misses += 1;
              if (!it.correct) ve.unresolved += 1;
              if (Number(it.tries) > 1) ve.retries += 1;
              vocabDirectMisses += 1;
            } else {
              var vok = bumpEntry(vocabMasteredMap, vocabMasteredList, vk, vw, vocabOkSeen, studentKey);
              vok.successes += 1;
            }
            return;
          }

          if (act === 'maze_reading') {
            var mw = mazeContentWord(it);
            if (!mw) return;
            if (!masteredOnItem) {
              var mve = bumpEntry(vocabMissedMap, vocabMissedList, mw, mw, vocabMissSeen, studentKey);
              mve.misses += 1;
              if (!it.correct) mve.unresolved += 1;
              if (Number(it.tries) > 1) mve.retries += 1;
              mazeVocabMisses += 1;
            } else {
              var mvok = bumpEntry(vocabMasteredMap, vocabMasteredList, mw, mw, vocabOkSeen, studentKey);
              mvok.successes += 1;
            }
            return;
          }

          if (isWordSoundsActivity(act, reader)) {
            var ww = String(it.word || it.target || '').trim();
            if (!ww || !/^[a-z]{2,16}$/i.test(ww)) return;
            var wk = ww.toLowerCase();
            if (!masteredOnItem) {
              var we = bumpEntry(wsMissedMap, wsMissedList, wk, wk, wsMissSeen, studentKey);
              we.misses += 1;
              if (!it.correct) we.unresolved += 1;
              if (Number(it.tries) > 1) we.retries += 1;
              wsActivityMisses[act] = (wsActivityMisses[act] || 0) + 1;
            } else {
              var wok = bumpEntry(wsMasteredMap, wsMasteredList, wk, wk, wsOkSeen, studentKey);
              wok.successes += 1;
            }
          }
        });
      });
    });

    function sortMissed(a, b) {
      return (b.students - a.students)
        || (b.misses - a.misses)
        || (b.unresolved - a.unresolved)
        || (b.retries - a.retries)
        || (a.display < b.display ? -1 : a.display > b.display ? 1 : 0);
    }

    function sortMastered(a, b) {
      return (b.students - a.students)
        || (b.successes - a.successes)
        || (a.display < b.display ? -1 : a.display > b.display ? 1 : 0);
    }

    wsMissedList.sort(sortMissed);
    vocabMissedList.sort(sortMissed);
    mathMissedList.sort(sortMissed);

    var wsReviewPool = wsMasteredList.filter(function (row) { return !wsMissedMap[row.key]; }).sort(sortMastered);
    var vocabReviewPool = vocabMasteredList.filter(function (row) { return !vocabMissedMap[row.key]; }).sort(sortMastered);
    var mathReviewPool = mathMasteredList.filter(function (row) { return !mathBlocked[row.key]; }).sort(sortMastered);

    var who = scope === 'student' && learners[0]
      ? String(learners[0].label || 'Student')
      : (query ? 'Group (' + query + ')' : 'Group');

    function clipTitle(text) {
      return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    }

    var targets = { word_sounds: null, vocab: null, math_practice: null };

    if (wsMissedList.length) {
      var wsMissedWords = wsMissedList.slice(0, maxMissed).map(function (r) { return r.display; });
      var wsReviewCap = Math.min(4, Math.max(2, Math.ceil(wsMissedWords.length / 2)));
      var wsReviewWords = wsReviewPool.slice(0, wsReviewCap).map(function (r) { return r.display; });
      var wsMixed = interleaveItems(wsMissedWords, wsReviewWords, 14);
      var wsActs = Object.keys(wsActivityMisses)
        .sort(function (a, b) { return (wsActivityMisses[b] - wsActivityMisses[a]) || (a < b ? -1 : a > b ? 1 : 0); })
        .slice(0, 4);
      var wsPattern = detectWordSoundsPattern(wsMissedWords);
      var wsTitle = clipTitle((scope === 'group' ? 'Follow-up Word Sounds: ' : 'Follow-up Word Sounds - ') + who);
      targets.word_sounds = {
        target: 'word_sounds',
        name: 'Word Sounds',
        href: 'packets-make.html',
        buttonLabel: scope === 'group' ? 'Make group follow-up Word Sounds packet' : 'Make follow-up Word Sounds packet',
        missedItems: wsMissedWords,
        reviewItems: wsReviewWords,
        items: wsMixed,
        missedCount: wsMissedWords.length,
        reviewCount: wsReviewWords.length,
        activities: wsActs,
        pattern: wsPattern,
        draft: {
          kind: 'word_sounds',
          title: wsTitle,
          lang: 'en',
          words: wsMixed,
          pattern: wsPattern,
          activities: wsActs,
          pictures: {},
        },
      };
    }

    if (vocabMissedList.length) {
      var vocabMissedWords = vocabMissedList.slice(0, maxMissed).map(function (r) { return r.display; });
      var vocabMinReview = vocabMissedWords.length < 4 ? (4 - vocabMissedWords.length) : 2;
      var vocabReviewCap = Math.min(4, Math.max(vocabMinReview, Math.ceil(vocabMissedWords.length / 2)));
      var vocabReviewWords = vocabReviewPool.slice(0, vocabReviewCap).map(function (r) { return r.display; });
      var vocabMixed = interleaveItems(vocabMissedWords, vocabReviewWords, 14);
      var vocabPattern = mazeVocabMisses > 0
        ? (vocabDirectMisses > 0 ? 'Vocabulary and Maze reading' : 'Maze reading words')
        : '';
      var vocabTitle = clipTitle((scope === 'group' ? 'Follow-up Vocabulary: ' : 'Follow-up Vocabulary - ') + who);
      targets.vocab = {
        target: 'vocab',
        name: 'Vocabulary',
        href: 'packets-vocab.html',
        buttonLabel: scope === 'group' ? 'Make group follow-up Vocabulary packet' : 'Make follow-up Vocabulary packet',
        missedItems: vocabMissedWords,
        reviewItems: vocabReviewWords,
        items: vocabMixed,
        missedCount: vocabMissedWords.length,
        reviewCount: vocabReviewWords.length,
        pattern: vocabPattern,
        fromMaze: mazeVocabMisses > 0,
        draft: {
          kind: 'vocab',
          title: vocabTitle,
          lang: 'en',
          entries: vocabMixed.map(function (w) {
            return { word: w, meaning: '', example: '', pos: '', tier: '', imgUri: '', alt: '' };
          }),
        },
      };
    }

    if (mathMissedList.length) {
      var mathMissedFacts = mathMissedList.slice(0, maxMissed).map(function (r) { return r.display; });
      var mathReviewCap = Math.min(6, Math.max(3, Math.ceil(mathMissedFacts.length / 2)));
      var mathReviewFacts = mathReviewPool.slice(0, mathReviewCap).map(function (r) { return r.display; });
      var mathMixed = interleaveItems(mathMissedFacts, mathReviewFacts, 16);
      var mathMethod = mathReviewFacts.length >= 3 ? 'rehearsal' : 'ccc';
      var mathTitle = clipTitle((scope === 'group' ? 'Follow-up Math Facts: ' : 'Follow-up Math Facts - ') + who);
      targets.math_practice = {
        target: 'math_practice',
        name: 'Math Facts',
        href: 'packets-math-practice.html',
        buttonLabel: scope === 'group' ? 'Make group follow-up Math Facts packet' : 'Make follow-up Math Facts packet',
        missedItems: mathMissedFacts,
        reviewItems: mathReviewFacts,
        items: mathMixed,
        missedCount: mathMissedFacts.length,
        reviewCount: mathReviewFacts.length,
        method: mathMethod,
        draft: {
          kind: 'math_practice',
          title: mathTitle,
          missedFacts: mathMissedFacts,
          reviewFacts: mathReviewFacts,
          facts: mathMixed,
          method: mathMethod,
        },
      };
    }

    var list = [targets.word_sounds, targets.vocab, targets.math_practice].filter(Boolean);
    var scopeLabel = scope === 'student'
      ? (learners[0] ? learners[0].label : 'Selected student')
      : (query
        ? countWord(learners.length, 'filtered student') + ' of ' + totalLearners + ' matching "' + query + '"'
        : 'All ' + countWord(learners.length, 'student') + ' in this group');

    return {
      version: VERSION,
      scope: scope,
      scopeLabel: scopeLabel,
      learnerCount: learners.length,
      totalLearners: totalLearners,
      query: query,
      hasAny: list.length > 0,
      targets: targets,
      list: list,
    };
  }

  function launchFollowupDraft(targetSpec, handoff, options) {
    var opts = options || {};
    var bridge = handoff || (root && root.AlloPacketHandoff) || null;
    if (!targetSpec || !targetSpec.draft || !targetSpec.href) {
      return Promise.reject(new Error('There is no follow-up draft ready for this selection.'));
    }
    if (!bridge || typeof bridge.redirectDraft !== 'function') {
      return Promise.reject(new Error('This browser cannot hand the follow-up draft to the maker right now.'));
    }
    var openNewTab = opts.openNewTab !== false;
    return bridge.redirectDraft(targetSpec.draft, targetSpec.href, openNewTab);
  }

  // ---------------------------------------------------------------------------
  // 2. 1-page printable student progress and UDL supports summary
  // ---------------------------------------------------------------------------
  function growthSlope(points) {
    var valid = (points || [])
      .filter(function (p) { return p && p.value !== null && p.value !== undefined && p.date; })
      .slice()
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    if (valid.length < MIN_GROWTH) return { n: valid.length, slope: null };
    var xs = valid.map(function (p) { return dayNumber(p.date) / 7; });
    var ys = valid.map(function (p) { return Number(p.value); });
    var n = valid.length, mx = 0, my = 0, sxx = 0, sxy = 0, i;
    for (i = 0; i < n; i++) { mx += xs[i] / n; my += ys[i] / n; }
    for (i = 0; i < n; i++) { sxx += (xs[i] - mx) * (xs[i] - mx); sxy += (xs[i] - mx) * (ys[i] - my); }
    return { n: n, slope: sxx > 0 ? sxy / sxx : null };
  }

  function mapLookup(map, learnerKey, measureKey, canonKey) {
    if (!map) return undefined;
    var direct = learnerKey + '\n' + measureKey;
    if (own(map, direct)) return map[direct];
    if (typeof canonKey !== 'function') return undefined;
    var keys = Object.keys(map);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var at = k.indexOf('\n');
      if (at >= 0 && k.slice(at + 1) === measureKey && canonKey(k.slice(0, at)) === learnerKey) return map[k];
    }
    return undefined;
  }

  function analyzeUdlSupports(sessions) {
    var toolCounts = Object.create(null);
    var itemSupportCounts = Object.create(null);
    var choicePathwayCounts = Object.create(null);
    var pathwaySwitchSessions = 0;
    var untimedChecks = 0;
    var directionsHeardSessions = 0;

    var withSup = { items: 0, firstTry: 0, correct: 0 };
    var withoutSup = { items: 0, firstTry: 0, correct: 0 };
    var checkWithTools = { count: 0, accSum: 0 };
    var checkWithoutTools = { count: 0, accSum: 0 };

    (sessions || []).forEach(function (s) {
      if (!s) return;
      var sessionTools = (s.score && Array.isArray(s.score.tools)) ? s.score.tools : [];
      var hasSessionTool = sessionTools.length > 0;
      sessionTools.forEach(function (code) {
        if (!code || isUnsafeKey(code)) return;
        if (!toolCounts[code]) toolCounts[code] = { code: code, label: own(TOOL_LABELS, code) ? TOOL_LABELS[code] : humanSupportLabel(code), sessions: 0 };
        toolCounts[code].sessions += 1;
      });
      if (s.untimed || (Array.isArray(s.flags) && s.flags.indexOf('untimed') >= 0)) untimedChecks += 1;
      if (s.score && s.score.directionsHeard) directionsHeardSessions += 1;

      if (s.mode === 'probe' && s.summary && s.summary.attempted > 0) {
        var checkAcc = Math.round((s.summary.correct / s.summary.attempted) * 100);
        if (hasSessionTool || s.untimed) {
          checkWithTools.count += 1;
          checkWithTools.accSum += checkAcc;
        } else {
          checkWithoutTools.count += 1;
          checkWithoutTools.accSum += checkAcc;
        }
      }

      var sPathways = Object.create(null);
      var sSwitched = false;
      var bumpPathway = function (rawKind) {
        var clean = String(rawKind || '').toLowerCase();
        if (!clean || clean === 'switch' || isUnsafeKey(clean)) return;
        var label = own(CHOICE_PATHWAY_LABELS, clean) ? CHOICE_PATHWAY_LABELS[clean] : clean.replace(/_/g, ' ');
        if (!sPathways[label]) {
          sPathways[label] = true;
          if (!choicePathwayCounts[label]) choicePathwayCounts[label] = { label: label, sessions: 0 };
          choicePathwayCounts[label].sessions += 1;
        }
      };

      (s.items || []).forEach(function (it) {
        if (!it) return;
        var actName = String(it.activity || '');
        var isNonScoredToolkit = /^(?:sel_|aac_)/.test(actName);
        if ((it.practice || !it.attempted) && !isNonScoredToolkit) return;
        var isChoiceBoard = actName === 'choice_board';
        var parsed = parseItemSupports(it.supports);
        var realSupportCount = 0;
        parsed.keys.forEach(function (entry) {
          var lowKey = String(entry.key || '').toLowerCase();
          if (isChoiceBoard && lowKey === 'modality_switch') {
            sSwitched = true;
            return;
          }
          var modMatch = isChoiceBoard ? /^modality_([a-z0-9_]+)$/.exec(lowKey) : null;
          if (modMatch) {
            bumpPathway(modMatch[1]);
            return;
          }
          realSupportCount += entry.count;
          if (!itemSupportCounts[entry.key]) {
            itemSupportCounts[entry.key] = { key: entry.key, label: entry.label, items: 0, uses: 0 };
          }
          itemSupportCounts[entry.key].items += 1;
          itemSupportCounts[entry.key].uses += entry.count;
        });
        if (isChoiceBoard && Array.isArray(it.responses)) {
          it.responses.forEach(function (raw) {
            var rm = /^mod:([a-z0-9_]+)\b/i.exec(String(raw || '').trim());
            if (rm) bumpPathway(rm[1]);
          });
        }
        if (it.practice || !it.attempted || isNonScoredToolkit) return;
        var bucket = (realSupportCount > 0 || hasSessionTool || s.untimed) ? withSup : withoutSup;
        bucket.items += 1;
        if (it.firstTry) bucket.firstTry += 1;
        if (it.correct) bucket.correct += 1;
      });
      if (sSwitched) pathwaySwitchSessions += 1;
    });

    function pct(part, total) {
      return total > 0 ? Math.round((part / total) * 100) : null;
    }

    var readingTools = Object.keys(toolCounts).map(function (k) { return toolCounts[k]; })
      .sort(function (a, b) { return (b.sessions - a.sessions) || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0); });
    var itemSupports = Object.keys(itemSupportCounts).map(function (k) { return itemSupportCounts[k]; })
      .sort(function (a, b) { return (b.items - a.items) || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0); });
    var choicePathways = Object.keys(choicePathwayCounts).map(function (k) { return choicePathwayCounts[k]; })
      .sort(function (a, b) { return (b.sessions - a.sessions) || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0); });

    var withObj = {
      items: withSup.items,
      firstTry: withSup.firstTry,
      correct: withSup.correct,
      firstTryPct: pct(withSup.firstTry, withSup.items),
      accuracyPct: pct(withSup.correct, withSup.items),
    };
    var withoutObj = {
      items: withoutSup.items,
      firstTry: withoutSup.firstTry,
      correct: withoutSup.correct,
      firstTryPct: pct(withoutSup.firstTry, withoutSup.items),
      accuracyPct: pct(withoutSup.correct, withoutSup.items),
    };
    var comparable = withObj.items > 0 && withoutObj.items > 0;

    return {
      readingTools: readingTools,
      choicePathways: choicePathways,
      pathwaySwitchSessions: pathwaySwitchSessions,
      untimedChecks: untimedChecks,
      directionsHeardSessions: directionsHeardSessions,
      itemSupports: itemSupports,
      hasAnySupports: readingTools.length > 0 || choicePathways.length > 0 || itemSupports.length > 0 || untimedChecks > 0 || directionsHeardSessions > 0,
      accuracyComparison: {
        withSupports: withObj,
        withoutSupports: withoutObj,
        comparable: comparable,
        deltaFirstTryPct: comparable ? (withObj.firstTryPct - withoutObj.firstTryPct) : null,
        deltaAccuracyPct: comparable ? (withObj.accuracyPct - withoutObj.accuracyPct) : null,
        checksWithSupports: {
          count: checkWithTools.count,
          avgAccuracyPct: checkWithTools.count > 0 ? Math.round(checkWithTools.accSum / checkWithTools.count) : null,
        },
        checksWithoutSupports: {
          count: checkWithoutTools.count,
          avgAccuracyPct: checkWithoutTools.count > 0 ? Math.round(checkWithoutTools.accSum / checkWithoutTools.count) : null,
        },
      },
    };
  }

  function summarizeReadAlong(sessions) {
    var raSessions = 0;
    var pages = 0;
    var read = 0;
    var played = 0;
    var timeMs = 0;
    var answers = 0;
    var rightAnswers = 0;
    var notRightAnswers = 0;
    var openAnswers = 0;

    (sessions || []).forEach(function (s) {
      if (!s || s.mode === 'probe' || !s.readAlong) return;
      var ra = s.readAlong;
      raSessions += 1;
      pages += Number(ra.pages) || 0;
      read += Number(ra.read) || 0;
      played += Number(ra.played) || 0;
      timeMs += Number(ra.timeMs) || 0;
      answers += Number(ra.answers) || 0;
      (ra.byPage || []).forEach(function (page) {
        (page.answers || []).forEach(function (ans) {
          if (ans.result === 'right') rightAnswers += 1;
          else if (ans.result === 'not_right') notRightAnswers += 1;
          else openAnswers += 1;
        });
      });
    });

    if (!raSessions) return null;
    return {
      sessions: raSessions,
      pages: pages,
      read: read,
      played: played,
      neither: Math.max(0, pages - read - played),
      timeMs: timeMs,
      timeText: formatDuration(timeMs),
      answers: answers,
      rightAnswers: rightAnswers,
      notRightAnswers: notRightAnswers,
      openAnswers: openAnswers,
    };
  }

  function buildStudentProgressSummary(learner, model, options) {
    var opts = options || {};
    var reader = opts.reader || (root && root.AlloPacketResults) || null;
    var canonKey = typeof opts.canonKey === 'function' ? opts.canonKey : function (k) { return k; };
    var today = opts.today || todayIso();
    var sessions = (learner && Array.isArray(learner.sessions)) ? learner.sessions : [];
    var dated = sessions.filter(function (s) { return !!s.date; });
    var firstDate = dated.length ? dated[0].date : '';
    var lastDate = (learner && learner.lastDate) || (dated.length ? dated[dated.length - 1].date : '');

    var checkSessions = sessions.filter(function (s) { return s.mode === 'probe'; });
    var readAlongSessions = sessions.filter(function (s) { return s.mode !== 'probe' && !!s.readAlong; });
    var practiceSessions = sessions.filter(function (s) { return s.mode !== 'probe' && (!s.readAlong || (s.summary && s.summary.given > 0)); });

    var seriesList = (reader && typeof reader.learnerSeries === 'function' && learner && model)
      ? reader.learnerSeries(learner, model)
      : [];

    var seenSeries = Object.create(null);
    seriesList.forEach(function (sr) { seenSeries[sr.key] = true; });
    (opts.paper || []).forEach(function (p) {
      if (!learner || canonKey(p.learner) !== learner.key || seenSeries[p.measure]) return;
      seenSeries[p.measure] = true;
      seriesList.push({ key: p.measure, kind: 'paper', name: p.name, unitName: '', percent: false, points: [], dates: 0, formKey: '' });
    });

    var trends = seriesList.map(function (series) {
      var paper = (opts.paper || []).filter(function (p) {
        return learner && canonKey(p.learner) === learner.key && p.measure === series.key;
      }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
      var scored = (series.points || []).filter(function (p) { return p.value !== null && p.value !== undefined; });
      var sourcePoints = series.kind === 'paper' ? paper : series.points;
      var first = scored[0] || (series.kind === 'paper' ? paper[0] : null);
      var latest = scored[scored.length - 1] || (series.kind === 'paper' ? paper[paper.length - 1] : null);
      var delta = first && latest && (series.kind === 'paper' ? paper.length : scored.length) >= 2
        ? round1(latest.value - first.value)
        : null;
      var direction = !latest ? 'unscored'
        : delta === null ? 'single_point'
        : delta > 0 ? 'improving'
        : delta < 0 ? 'declining'
        : 'steady';
      var slopeInfo = growthSlope(sourcePoints);
      var goalVal = learner ? mapLookup(opts.goals, learner.key, series.key, canonKey) : undefined;
      var goalDateVal = learner ? mapLookup(opts.goalDates, learner.key, series.key, canonKey) : undefined;
      var latestMazeNet = latest && latest.session && latest.session.mazeNet
        ? { correct: latest.session.mazeNet.correct, incorrect: latest.session.mazeNet.incorrect, net: latest.session.mazeNet.net }
        : null;
      return {
        key: series.key,
        kind: series.kind,
        name: series.name,
        unitName: series.unitName || '',
        percent: !!series.percent,
        scoredCount: series.kind === 'paper' ? paper.length : scored.length,
        firstDate: first ? first.date : '',
        latestDate: latest ? latest.date : '',
        firstValue: first ? first.value : null,
        latestValue: latest ? latest.value : null,
        latestMazeNet: latestMazeNet,
        delta: delta,
        direction: direction,
        growthPerWeek: slopeInfo.slope !== null ? round1(slopeInfo.slope) : null,
        goal: goalVal !== undefined ? goalVal : null,
        goalDate: goalDateVal || '',
        paperCount: paper.length,
      };
    });

    var udlSupports = analyzeUdlSupports(sessions);
    var readAlong = summarizeReadAlong(sessions);
    var followup = analyzeFollowup({ scope: 'student', learner: learner }, { reader: reader });

    var nextFocus = [];
    followup.list.forEach(function (t) {
      var sampleList = t.missedItems.slice(0, 5).join(', ');
      var extra = t.missedItems.length > 5 ? ' (+' + (t.missedItems.length - 5) + ' more)' : '';
      var patternNote = t.pattern ? ' (' + t.pattern + ')' : '';
      nextFocus.push({
        area: t.name + patternNote,
        detail: 'Practice missed items: ' + sampleList + extra + '.',
      });
    });

    var checkMissed = (reader && typeof reader.checkMissedItems === 'function')
      ? reader.checkMissedItems(sessions, 6)
      : [];
    if (checkMissed.length && nextFocus.length < 5) {
      nextFocus.push({
        area: checkMissed[0].check,
        detail: 'Review missed check items: ' + checkMissed.slice(0, 4).map(function (r) { return r.item; }).join(', ') + '.',
      });
    }

    trends
      .filter(function (tr) { return tr.kind === 'practice' && tr.latestValue !== null && tr.latestValue < 85; })
      .sort(function (a, b) { return a.latestValue - b.latestValue; })
      .forEach(function (tr) {
        if (nextFocus.length >= 5) return;
        var already = nextFocus.some(function (f) { return f.area.toLowerCase().indexOf(tr.name.toLowerCase()) >= 0; });
        if (!already) {
          nextFocus.push({
            area: tr.name,
            detail: 'Latest first-try accuracy ' + tr.latestValue + '% (' + showDate(tr.latestDate) + ').',
          });
        }
      });

    return {
      version: VERSION,
      student: {
        key: learner ? learner.key : '',
        label: learner ? learner.label : '',
        alternateLabels: learner && Array.isArray(learner.labels)
          ? learner.labels.filter(function (l) { return l !== learner.label; })
          : [],
        sessionCount: sessions.length,
        checkCount: checkSessions.length,
        practiceCount: practiceSessions.length,
        readAlongCount: readAlongSessions.length,
        firstDate: firstDate,
        lastDate: lastDate,
        dateRangeText: dateRange(firstDate, lastDate),
        preparedDate: today,
        preparedDateText: showDate(today),
        sample: !!opts.sample,
      },
      trends: trends,
      udlSupports: udlSupports,
      readAlong: readAlong,
      nextFocus: nextFocus.slice(0, 5),
      followup: followup,
      honestNote: HONEST,
    };
  }

  // ---------------------------------------------------------------------------
  // 3. Local MTSS Triage Export Bridge (compatible with AlloFlow MTSS schema)
  // ---------------------------------------------------------------------------
  function mtssTierOf(score, cutpoints) {
    var t2 = Number(cutpoints && cutpoints.tier2Cut);
    var t3 = Number(cutpoints && cutpoints.tier3Cut);
    var val = Number(score);
    if (!isFinite(val) || !isFinite(t2) || !isFinite(t3)) return null;
    if (cutpoints.higherBetter) {
      if (val >= t2) return 1;
      if (val >= t3) return 2;
      return 3;
    }
    if (val <= t2) return 1;
    if (val <= t3) return 2;
    return 3;
  }

  function medianOf(values) {
    var list = (values || []).filter(function (v) { return typeof v === 'number' && isFinite(v); }).sort(function (a, b) { return a - b; });
    if (!list.length) return null;
    var mid = list.length >> 1;
    return list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2;
  }

  function buildPasteCsv(rows) {
    return ['Code,Score'].concat((rows || []).map(function (r) {
      return csvGuard(r.code) + ',' + r.score;
    })).join('\n');
  }

  function computeLocalCutpoints(rows, goalValues) {
    var goalMed = medianOf(goalValues);
    var t2, t3, source;
    if (goalMed !== null && goalMed > 0) {
      t2 = round1(goalMed * 0.8);
      t3 = round1(goalMed * 0.6);
      source = 'teacher_goals';
    } else {
      var scores = rows.map(function (r) { return r.score; });
      var med = medianOf(scores);
      var base = med !== null && med > 0 ? med : 10;
      t2 = round1(Math.max(1, base * 0.8));
      t3 = round1(Math.max(0, base * 0.55));
      source = rows.length >= 2 ? 'local_group_median' : 'single_student_local_reference';
    }
    if (!(t3 < t2)) t3 = round1(t2 - 1);
    return { cutpoints: { higherBetter: true, tier2Cut: t2, tier3Cut: t3 }, source: source };
  }

  var TIER_LABELS = {
    1: 'Tier 1 - core range in these files',
    2: 'Tier 2 - flagged for team review (targeted range)',
    3: 'Tier 3 - flagged for team review (intensive range)',
  };

  function buildMtssTriageExport(model, options) {
    var opts = options || {};
    var reader = opts.reader || (root && root.AlloPacketResults) || null;
    var canonKey = typeof opts.canonKey === 'function' ? opts.canonKey : function (k) { return k; };
    var today = opts.today || todayIso();
    var exportedAt = opts.nowLocal || (today + 'T00:00:00');
    var savedAt = Number(opts.savedAt) || Date.now();
    var learners = Array.isArray(opts.learners)
      ? opts.learners
      : (model && Array.isArray(model.learners) ? model.learners : []);
    var checks = (model && Array.isArray(model.checks)) ? model.checks : [];
    var windowText = dateRange(model && model.firstDate, model && model.lastDate) || today;

    var practiceT2 = isFinite(Number(opts.practiceTier2Cut)) ? Number(opts.practiceTier2Cut) : 80;
    var practiceT3 = isFinite(Number(opts.practiceTier3Cut)) ? Number(opts.practiceTier3Cut) : 60;
    if (!(practiceT3 < practiceT2)) { practiceT2 = 80; practiceT3 = 60; }
    var practiceCuts = { higherBetter: true, tier2Cut: practiceT2, tier3Cut: practiceT3 };

    var datasets = [];
    var studentTiersByKey = Object.create(null);

    function recordStudentBand(learnerKey, tier, reason) {
      if (!studentTiersByKey[learnerKey]) studentTiersByKey[learnerKey] = { tiers: [], reasons: [] };
      if (tier !== null) studentTiersByKey[learnerKey].tiers.push(tier);
      if (reason) studentTiersByKey[learnerKey].reasons.push(reason);
    }

    checks.forEach(function (series) {
      var rows = [];
      var goalValues = [];
      var seenCode = Object.create(null);
      learners.forEach(function (learner) {
        var cell = learner.checks && learner.checks[series.key];
        if (!cell || cell.value === null || cell.value === undefined) return;
        var code = String(learner.label || '').trim();
        if (!code || seenCode[code]) return;
        seenCode[code] = true;
        rows.push({ code: code, score: Number(cell.value), learnerKey: learner.key });
        var gv = mapLookup(opts.goals, learner.key, series.key, canonKey);
        if (gv !== undefined && isFinite(Number(gv)) && Number(gv) > 0) goalValues.push(Number(gv));
      });
      if (!rows.length) return;
      var cutInfo = computeLocalCutpoints(rows, goalValues);
      var cleanRows = rows.map(function (r) { return { code: r.code, score: r.score }; });
      datasets.push({
        id: 'md_packets_' + slugOf(series.label) + '_' + today.replace(/-/g, ''),
        label: series.label,
        window: windowText,
        cutpoints: cutInfo.cutpoints,
        cutSource: cutInfo.source,
        rows: cleanRows,
        pasteCsv: buildPasteCsv(cleanRows),
        savedAt: savedAt,
      });
      rows.forEach(function (r) {
        var tier = mtssTierOf(r.score, cutInfo.cutpoints);
        recordStudentBand(r.learnerKey, tier, series.label + ': ' + r.score + ' (local cuts T2=' + cutInfo.cutpoints.tier2Cut + ', T3=' + cutInfo.cutpoints.tier3Cut + ')');
      });
    });

    var practiceRows = [];
    var seenPracticeCode = Object.create(null);
    learners.forEach(function (learner) {
      var strandKeys = learner.strands ? Object.keys(learner.strands) : [];
      var gradedTotal = 0;
      var firstTryTotal = 0;
      strandKeys.forEach(function (sk) {
        var cell = learner.strands[sk];
        if (!cell || !cell.graded) return;
        gradedTotal += cell.graded;
        firstTryTotal += cell.firstTry;
      });
      if (!gradedTotal) return;
      var pct = Math.round((firstTryTotal / gradedTotal) * 100);
      var code = String(learner.label || '').trim();
      if (!code || seenPracticeCode[code]) return;
      seenPracticeCode[code] = true;
      practiceRows.push({ code: code, score: pct, learnerKey: learner.key });
    });

    if (practiceRows.length) {
      var cleanPracticeRows = practiceRows.map(function (r) { return { code: r.code, score: r.score }; });
      datasets.push({
        id: 'md_packets_practice_accuracy_' + today.replace(/-/g, ''),
        label: 'Practice first-try accuracy (%)',
        window: windowText,
        cutpoints: practiceCuts,
        cutSource: 'local_accuracy_default',
        rows: cleanPracticeRows,
        pasteCsv: buildPasteCsv(cleanPracticeRows),
        savedAt: savedAt,
      });
      practiceRows.forEach(function (r) {
        var tier = mtssTierOf(r.score, practiceCuts);
        recordStudentBand(r.learnerKey, tier, 'Practice first-try accuracy: ' + r.score + '% (local cuts T2=' + practiceCuts.tier2Cut + '%, T3=' + practiceCuts.tier3Cut + '%)');
      });
    }

    var students = learners.map(function (learner) {
      var summary = buildStudentProgressSummary(learner, model, {
        reader: reader,
        goals: opts.goals,
        goalDates: opts.goalDates,
        paper: opts.paper,
        canonKey: canonKey,
        today: today,
        sample: opts.sample,
      });
      var bandInfo = studentTiersByKey[learner.key] || { tiers: [], reasons: [] };
      var reasons = bandInfo.reasons.slice();

      var checkAccs = [];
      (learner.sessions || []).forEach(function (s) {
        if (s.mode === 'probe' && s.summary && s.summary.attempted > 0) {
          checkAccs.push(Math.round((s.summary.correct / s.summary.attempted) * 100));
        }
      });
      if (checkAccs.length) {
        var latestCheckAcc = checkAccs[checkAccs.length - 1];
        var accTier = mtssTierOf(latestCheckAcc, practiceCuts);
        if (accTier !== null) {
          bandInfo.tiers.push(accTier);
          reasons.push('Latest check accuracy of attempted items: ' + latestCheckAcc + '%');
        }
      }

      var suggestedTier = bandInfo.tiers.length ? Math.max.apply(null, bandInfo.tiers) : null;
      var trendDirections = summary.trends.map(function (tr) { return tr.direction; });
      var decliningCount = trendDirections.filter(function (d) { return d === 'declining'; }).length;
      var improvingCount = trendDirections.filter(function (d) { return d === 'improving'; }).length;
      var trendDirection = decliningCount > improvingCount ? 'declining'
        : improvingCount > decliningCount ? 'improving'
        : (summary.trends.some(function (tr) { return tr.direction === 'steady'; }) ? 'steady' : 'single_point');

      if (decliningCount > 0) {
        reasons.push('Declining trend observed across ' + countWord(decliningCount, 'measure') + '; review with team.');
      } else if (improvingCount > 0) {
        reasons.push('Improving trend observed across ' + countWord(improvingCount, 'measure') + '.');
      }

      var supportsUsed = summary.udlSupports.readingTools.map(function (t) { return t.label; })
        .concat(summary.udlSupports.itemSupports.map(function (it) { return it.label; }));
      if (summary.udlSupports.untimedChecks > 0) supportsUsed.push('untimed check accommodation');

      return {
        studentCode: learner.label,
        sessionCount: learner.count,
        dateRange: summary.student.dateRangeText,
        suggestedTier: suggestedTier,
        tierLabel: suggestedTier ? TIER_LABELS[suggestedTier] : 'Unscored practice only (no tier band)',
        trendDirection: trendDirection,
        reasons: reasons,
        measures: summary.trends.map(function (tr) {
          var row = {
            name: tr.name,
            kind: tr.kind,
            latestValue: tr.latestValue,
            delta: tr.delta,
            direction: tr.direction,
            growthPerWeek: tr.growthPerWeek,
            unitName: tr.unitName,
          };
          if (tr.latestMazeNet) row.latestMazeNet = tr.latestMazeNet;
          return row;
        }),
        udlSupportsUsed: supportsUsed,
        choicePathways: (summary.udlSupports.choicePathways || []).map(function (cp) { return { label: cp.label, sessions: cp.sessions }; }),
        pathwaySwitchSessions: summary.udlSupports.pathwaySwitchSessions || 0,
        mazeNetSessions: (learner.sessions || []).filter(function (s) { return !!(s && s.mazeNet); }).map(function (s) {
          return {
            date: s.date || '',
            title: s.title || '',
            form: s.form || '',
            net: s.mazeNet.net,
            correct: s.mazeNet.correct,
            incorrect: s.mazeNet.incorrect,
          };
        }),
        nextFocus: summary.nextFocus.slice(0, 3).map(function (f) { return f.area; }),
      };
    });

    students.sort(function (a, b) {
      var ta = a.suggestedTier === null ? 0 : a.suggestedTier;
      var tb = b.suggestedTier === null ? 0 : b.suggestedTier;
      return (tb - ta) || (a.studentCode.toLowerCase() < b.studentCode.toLowerCase() ? -1 : a.studentCode.toLowerCase() > b.studentCode.toLowerCase() ? 1 : 0);
    });

    var counts = { totalStudents: students.length, tier1: 0, tier2: 0, tier3: 0, unscored: 0 };
    var tier2Members = [];
    var tier3Members = [];
    var groupPathways = Object.create(null);
    var groupSupports = Object.create(null);
    var studentsWithChoicePathways = 0;
    var untimedStudents = 0;
    students.forEach(function (st) {
      if (st.suggestedTier === 1) counts.tier1 += 1;
      else if (st.suggestedTier === 2) { counts.tier2 += 1; tier2Members.push(st.studentCode); }
      else if (st.suggestedTier === 3) { counts.tier3 += 1; tier3Members.push(st.studentCode); }
      else counts.unscored += 1;

      if (st.choicePathways && st.choicePathways.length) {
        studentsWithChoicePathways += 1;
        var seenP = Object.create(null);
        st.choicePathways.forEach(function (cp) {
          if (cp && cp.label && !seenP[cp.label]) {
            seenP[cp.label] = true;
            groupPathways[cp.label] = (groupPathways[cp.label] || 0) + 1;
          }
        });
      }
      var seenS = Object.create(null);
      (st.udlSupportsUsed || []).forEach(function (lbl) {
        if (!lbl || seenS[lbl]) return;
        seenS[lbl] = true;
        if (lbl === 'untimed check accommodation') untimedStudents += 1;
        groupSupports[lbl] = (groupSupports[lbl] || 0) + 1;
      });
    });

    var udlSummary = {
      studentsWithChoicePathways: studentsWithChoicePathways,
      choicePathways: Object.keys(groupPathways).map(function (k) { return { label: k, students: groupPathways[k] }; })
        .sort(function (a, b) { return (b.students - a.students) || a.label.localeCompare(b.label); }),
      supportsUsed: Object.keys(groupSupports).map(function (k) { return { label: k, students: groupSupports[k] }; })
        .sort(function (a, b) { return (b.students - a.students) || a.label.localeCompare(b.label); }),
      untimedStudents: untimedStudents,
    };

    var suggestedGroups = [];
    var primaryMeasure = datasets.length ? datasets[0].label : 'Packets results';
    var groupFollowup = analyzeFollowup({ scope: 'group', learners: learners }, { reader: reader });
    var sharedFocus = groupFollowup.list.map(function (t) { return t.name; }).join(', ') || 'targeted skill review';
    var learnerByCode = Object.create(null);
    learners.forEach(function (l) {
      if (l && l.label && !learnerByCode[l.label]) learnerByCode[l.label] = l;
    });
    function focusForMembers(memberCodes) {
      var subset = (memberCodes || []).map(function (c) { return learnerByCode[c]; }).filter(Boolean);
      if (!subset.length) return sharedFocus;
      var sub = analyzeFollowup({ scope: 'group', learners: subset, totalLearners: subset.length }, { reader: reader });
      return sub.list.map(function (t) { return t.name; }).join(', ') || sharedFocus;
    }

    if (tier3Members.length) {
      suggestedGroups.push({
        id: 'mg_packets_t3_' + today.replace(/-/g, ''),
        name: 'Tier 3 review group',
        focus: focusForMembers(tier3Members),
        measure: primaryMeasure,
        window: windowText,
        members: tier3Members,
        createdAt: today,
      });
    }
    if (tier2Members.length) {
      suggestedGroups.push({
        id: 'mg_packets_t2_' + today.replace(/-/g, ''),
        name: 'Tier 2 review group',
        focus: focusForMembers(tier2Members),
        measure: primaryMeasure,
        window: windowText,
        members: tier2Members,
        createdAt: today,
      });
    }

    return {
      kind: MTSS_EXPORT_KIND,
      schemaVersion: MTSS_EXPORT_VERSION,
      exportedAt: exportedAt,
      window: windowText,
      sample: !!opts.sample,
      privacyNote: 'Student codes only. Computed locally in this browser with zero network access.',
      teamReviewNotice: 'Suggested tiers are screening bands computed locally from loaded results files for MTSS team review, never placement decisions.',
      honestNote: HONEST,
      summary: counts,
      udlSummary: udlSummary,
      datasets: datasets,
      suggestedGroups: suggestedGroups,
      students: students,
    };
  }

  // ---------------------------------------------------------------------------
  // DOM builders (createElement and textContent only, zero markup strings)
  // ---------------------------------------------------------------------------
  function domEl(doc, tag, className, text) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function domAdd(parent) {
    for (var i = 1; i < arguments.length; i++) {
      if (arguments[i]) parent.appendChild(arguments[i]);
    }
    return parent;
  }

  function renderFollowupCard(doc, analysis, callbacks) {
    if (!doc || !analysis || !analysis.hasAny) return null;
    var cb = callbacks || {};
    var section = domEl(doc, 'section', 'followup-card no-print');
    section.id = analysis.scope === 'group' ? 'group-followup-card' : 'learner-followup-card';
    var titleId = section.id + '-title';
    var heading = domEl(doc, 'h4', 'followup-title',
      analysis.scope === 'group' ? 'Make a follow-up packet for this group' : 'Make a follow-up packet from missed items');
    heading.id = titleId;
    section.setAttribute('aria-labelledby', titleId);

    var introText = analysis.scope === 'group'
      ? 'Interleaved practice built from missed and retried items plus mastered review items (' + analysis.scopeLabel + ').'
      : 'Interleaved practice built from missed and retried items plus mastered review items for ' + analysis.scopeLabel + '.';
    var intro = domEl(doc, 'p', 'hint followup-intro', introText);

    var breakdown = domEl(doc, 'ul', 'followup-summary');
    var row = domEl(doc, 'div', 'followup-actions');
    var status = domEl(doc, 'p', 'hint followup-status', '');
    status.setAttribute('role', 'status');

    analysis.list.forEach(function (spec) {
      var liText = spec.name + ': ' + countWord(spec.missedCount, 'missed item')
        + (spec.reviewCount ? ' + ' + countWord(spec.reviewCount, 'mastered review item') : '')
        + (spec.pattern ? ' (focus: ' + spec.pattern + ')' : '')
        + ' \u2014 ' + spec.items.slice(0, 6).join(', ') + (spec.items.length > 6 ? ', ...' : '') + '.';
      breakdown.appendChild(domEl(doc, 'li', '', liText));

      var btn = domEl(doc, 'button', 'btn btn-small followup-launch', spec.buttonLabel);
      btn.type = 'button';
      btn.setAttribute('data-followup-target', spec.target);
      btn.addEventListener('click', function () {
        status.textContent = 'Preparing ' + spec.name + ' follow-up draft...';
        var promise = typeof cb.onLaunch === 'function'
          ? Promise.resolve(cb.onLaunch(spec))
          : launchFollowupDraft(spec, null, { openNewTab: true });
        promise.then(function () {
          var okMsg = 'Opened ' + spec.name + ' follow-up draft (' + countWord(spec.missedCount, 'missed') + (spec.reviewCount ? ', ' + countWord(spec.reviewCount, 'review') : '') + ') in a new tab.';
          status.textContent = okMsg;
          if (typeof cb.say === 'function') cb.say(okMsg);
        }, function (err) {
          var errMsg = String((err && err.message) || 'Could not hand the follow-up draft to the maker.');
          status.textContent = errMsg;
          if (typeof cb.say === 'function') cb.say(errMsg);
        });
      });
      row.appendChild(btn);
    });

    var note = domEl(doc, 'p', 'hint followup-note', 'Opens the maker in a new tab with missed and mastered review items preloaded. This page stays open.');
    return domAdd(section, heading, intro, breakdown, row, note, status);
  }

  function formatTrendLine(tr) {
    if (tr.latestValue === null) return tr.name + ': no scored results yet.';
    var valStr = tr.percent ? (tr.latestValue + '%') : (tr.unitName ? (tr.latestValue + ' ' + unitFor(tr.latestValue, tr.unitName)) : String(tr.latestValue));
    var out = tr.name + ': latest ' + valStr + ' (' + showDate(tr.latestDate) + ')';
    if (tr.latestMazeNet) {
      out += ', Maze net ' + tr.latestMazeNet.net;
    }
    if (tr.delta !== null && tr.scoredCount >= 2) {
      var unitDelta = tr.percent ? ' percentage points' : (tr.unitName ? ' ' + unitFor(Math.abs(tr.delta), tr.unitName) : '');
      out += ', change ' + signed(tr.delta) + unitDelta + ' across ' + countWord(tr.scoredCount, 'result');
    }
    if (tr.growthPerWeek !== null) {
      var perUnit = tr.percent ? ' percentage points/week' : (tr.unitName ? ' ' + unitFor(Math.abs(tr.growthPerWeek), tr.unitName) + '/week' : '/week');
      out += ', trend ' + signed(tr.growthPerWeek) + perUnit;
    }
    if (tr.goal !== null) {
      var goalStr = tr.percent ? (tr.goal + '%') : String(tr.goal);
      out += ', teacher goal ' + goalStr + (tr.goalDate ? ' by ' + showDate(tr.goalDate) : '');
    }
    return out + '.';
  }

  function renderProgressSummaryCard(doc, summary, callbacks) {
    if (!doc || !summary || !summary.student) return null;
    var cb = callbacks || {};
    var section = domEl(doc, 'section', 'progress-sheet');
    section.id = 'student-progress-summary';
    var titleId = 'progress-sheet-title';
    section.setAttribute('aria-labelledby', titleId);

    var header = domEl(doc, 'div', 'progress-sheet-head');
    var headingWrap = domEl(doc, 'div', '');
    var title = domEl(doc, 'h4', 'progress-sheet-title', '1-page progress and UDL supports summary');
    title.id = titleId;
    var sub = domEl(doc, 'p', 'hint no-print', 'Formatted for IEP meetings and parent-teacher conferences. Built in this browser and never uploaded.');
    domAdd(headingWrap, title, sub);

    var printBtn = domEl(doc, 'button', 'btn btn-small no-print', 'Print 1-page progress summary');
    printBtn.type = 'button';
    printBtn.id = 'print-progress-summary';
    printBtn.setAttribute('aria-label', 'Print 1-page progress summary for ' + summary.student.label);
    printBtn.addEventListener('click', function () {
      if (typeof cb.onPrint === 'function') {
        cb.onPrint(summary);
      } else {
        var foldNode = doc.getElementById('progress-sheet-fold');
        if (foldNode) foldNode.open = true;
      }
    });
    domAdd(header, headingWrap, printBtn);

    var fold = domEl(doc, 'details', 'progress-sheet-fold');
    fold.id = 'progress-sheet-fold';
    var foldSummary = domEl(doc, 'summary', 'no-print', 'Preview 1-page summary');

    var sheet = domEl(doc, 'div', 'progress-sheet-body');
    var metaLine = domEl(doc, 'div', 'progress-meta');
    domAdd(metaLine,
      domEl(doc, 'p', 'progress-student', summary.student.label),
      domEl(doc, 'p', 'progress-dates',
        countWord(summary.student.sessionCount, 'result')
        + (summary.student.dateRangeText ? ' \u00B7 ' + summary.student.dateRangeText : '')
        + ' \u00B7 Prepared ' + summary.student.preparedDateText
        + (summary.student.sample ? ' \u00B7 Sample results' : '')));
    if (summary.student.alternateLabels.length) {
      metaLine.appendChild(domEl(doc, 'p', 'progress-sub-note', 'Also written in files as: ' + summary.student.alternateLabels.join(', ') + '.'));
    }

    var grid = domEl(doc, 'div', 'progress-grid');

    // Panel 1: Growth and accuracy trends
    var trendPanel = domEl(doc, 'div', 'progress-block');
    trendPanel.appendChild(domEl(doc, 'p', 'progress-block-title', 'Progress and accuracy trends'));
    if (summary.trends.length) {
      var trendList = domEl(doc, 'ul', 'progress-list');
      summary.trends.forEach(function (tr) {
        trendList.appendChild(domEl(doc, 'li', '', formatTrendLine(tr)));
      });
      trendPanel.appendChild(trendList);
    } else {
      trendPanel.appendChild(domEl(doc, 'p', 'progress-empty', 'No scored progress measures in these files yet.'));
    }
    grid.appendChild(trendPanel);

    // Panel 2: UDL supports used + accuracy with vs without supports
    var supPanel = domEl(doc, 'div', 'progress-block');
    supPanel.appendChild(domEl(doc, 'p', 'progress-block-title', 'UDL supports used across sessions'));
    var sup = summary.udlSupports;
    if (sup.hasAnySupports) {
      var supList = domEl(doc, 'ul', 'progress-list');
      if (sup.choicePathways && sup.choicePathways.length) {
        supList.appendChild(domEl(doc, 'li', '', 'UDL Choice Board pathways: ' + sup.choicePathways.map(function (p) {
          return p.label + ' (' + countWord(p.sessions, 'session') + ')';
        }).join(', ') + (sup.pathwaySwitchSessions > 0 ? '; switched pathway in ' + countWord(sup.pathwaySwitchSessions, 'session') : '') + '.'));
      }
      if (sup.readingTools.length) {
        supList.appendChild(domEl(doc, 'li', '', 'Reading tools: ' + sup.readingTools.map(function (t) {
          return t.label + ' (' + countWord(t.sessions, 'session') + ')';
        }).join(', ') + '.'));
      }
      if (sup.itemSupports.length) {
        supList.appendChild(domEl(doc, 'li', '', 'Activity supports: ' + sup.itemSupports.map(function (it) {
          return it.label + ' (' + countWord(it.items, 'item') + ')';
        }).join(', ') + '.'));
      }
      if (sup.untimedChecks > 0) {
        supList.appendChild(domEl(doc, 'li', '', 'Untimed check accommodation on ' + countWord(sup.untimedChecks, 'check') + ' (kept separate from timed rates).'));
      }
      if (sup.directionsHeardSessions > 0) {
        supList.appendChild(domEl(doc, 'li', '', 'Audio directions replayed before starting on ' + countWord(sup.directionsHeardSessions, 'session') + '.'));
      }
      supPanel.appendChild(supList);
    } else {
      supPanel.appendChild(domEl(doc, 'p', 'progress-empty', 'No optional reading tools or item supports recorded in these files.'));
    }

    var cmp = sup.accuracyComparison;
    if (cmp.comparable) {
      var cmpText = 'Graded items with supports: ' + cmp.withSupports.accuracyPct + '% right (' + cmp.withSupports.firstTryPct + '% first try, n=' + cmp.withSupports.items + '). '
        + 'Without supports: ' + cmp.withoutSupports.accuracyPct + '% right (' + cmp.withoutSupports.firstTryPct + '% first try, n=' + cmp.withoutSupports.items + ').';
      supPanel.appendChild(domEl(doc, 'p', 'progress-compare', cmpText));
    } else if (cmp.withSupports.items > 0) {
      supPanel.appendChild(domEl(doc, 'p', 'progress-compare',
        'Supports were active on all ' + countWord(cmp.withSupports.items, 'graded item') + ' (' + cmp.withSupports.accuracyPct + '% right, ' + cmp.withSupports.firstTryPct + '% first try).'));
    } else if (cmp.withoutSupports.items > 0) {
      supPanel.appendChild(domEl(doc, 'p', 'progress-compare',
        'All ' + countWord(cmp.withoutSupports.items, 'graded item') + ' completed without recorded supports (' + cmp.withoutSupports.accuracyPct + '% right, ' + cmp.withoutSupports.firstTryPct + '% first try).'));
    }
    grid.appendChild(supPanel);

    // Panel 3: Read-Along summary (only when present)
    if (summary.readAlong) {
      var ra = summary.readAlong;
      var raPanel = domEl(doc, 'div', 'progress-block');
      raPanel.appendChild(domEl(doc, 'p', 'progress-block-title', 'Read-Along summary'));
      var raLine = countWord(ra.sessions, 'read-along session') + ': read ' + ra.read + ' of ' + countWord(ra.pages, 'page')
        + (ra.played ? ', ' + countWord(ra.played, 'page') + ' played aloud by the file' : '')
        + ', ' + ra.timeText + ' on pages.';
      raPanel.appendChild(domEl(doc, 'p', 'progress-text', raLine));
      if (ra.answers > 0) {
        var ansDetail = countWord(ra.answers, 'understanding answer') + ' recorded'
          + (ra.rightAnswers || ra.notRightAnswers ? ' (' + ra.rightAnswers + ' right, ' + ra.notRightAnswers + ' not right' + (ra.openAnswers ? ', ' + ra.openAnswers + ' open-ended' : '') + ')' : '') + '.';
        raPanel.appendChild(domEl(doc, 'p', 'progress-text', ansDetail));
      }
      grid.appendChild(raPanel);
    }

    // Panel 4: Top next-focus skills
    var focusPanel = domEl(doc, 'div', 'progress-block');
    focusPanel.appendChild(domEl(doc, 'p', 'progress-block-title', 'Top next-focus skills'));
    if (summary.nextFocus.length) {
      var focusList = domEl(doc, 'ul', 'progress-list');
      summary.nextFocus.forEach(function (item) {
        var li = domEl(doc, 'li', '');
        domAdd(li, domEl(doc, 'strong', '', item.area + ': '), doc.createTextNode(item.detail));
        focusList.appendChild(li);
      });
      focusPanel.appendChild(focusList);
    } else {
      focusPanel.appendChild(domEl(doc, 'p', 'progress-empty', 'No missed items recorded across these files. Continue current level or introduce next skill set.'));
    }
    grid.appendChild(focusPanel);

    var foot = domEl(doc, 'p', 'progress-foot', summary.honestNote + ' Prepared locally on this device.');
    domAdd(sheet, metaLine, grid, foot);
    domAdd(fold, foldSummary, sheet);
    return domAdd(section, header, fold);
  }

  function formatMtssHuddleText(payload) {
    if (!payload || !payload.summary) return '';
    var s = payload.summary;
    var lines = [];
    lines.push('MTSS small-group screening summary (' + countWord(s.totalStudents, 'student') + ')');
    if (payload.window) lines.push('Window: ' + payload.window);
    if (payload.sample) lines.push('Note: Sample results with made-up code names and scores.');
    var countsLine = 'Tier 3 (intensive review): ' + s.tier3
      + ' | Tier 2 (targeted review): ' + s.tier2
      + ' | Tier 1 (on-track): ' + s.tier1;
    if (s.unscored > 0) countsLine += ' | Unscored support/practice only: ' + s.unscored;
    lines.push(countsLine);

    var groups = [
      { key: 3, title: 'Tier 3 — intensive review' },
      { key: 2, title: 'Tier 2 — targeted review' },
      { key: 1, title: 'Tier 1 — on-track' },
      { key: null, title: 'Unscored support or practice only (no tier band)' },
    ];
    var students = Array.isArray(payload.students) ? payload.students : [];
    groups.forEach(function (g) {
      var list = students.filter(function (st) { return st.suggestedTier === g.key; });
      if (!list.length) return;
      lines.push('');
      lines.push(g.title + ' (' + countWord(list.length, 'student') + '):');
      list.forEach(function (st) {
        var bits = [];
        bits.push(countWord(st.sessionCount, 'session'));
        if (st.trendDirection === 'improving' || st.trendDirection === 'declining') {
          bits.push('trend ' + st.trendDirection);
        }
        var detail = [];
        if (Array.isArray(st.reasons) && st.reasons.length) detail.push(st.reasons[0]);
        if (Array.isArray(st.nextFocus) && st.nextFocus.length) detail.push('next focus: ' + st.nextFocus.slice(0, 2).join(', '));
        if (Array.isArray(st.udlSupportsUsed) && st.udlSupportsUsed.length) detail.push('supports: ' + st.udlSupportsUsed.slice(0, 3).join(', '));
        lines.push('- ' + st.studentCode + ' (' + bits.join(', ') + ')' + (detail.length ? ' — ' + detail.join('; ') : '') + '.');
      });
    });

    if (Array.isArray(payload.suggestedGroups) && payload.suggestedGroups.length) {
      lines.push('');
      lines.push('Suggested small-group review sets:');
      payload.suggestedGroups.forEach(function (grp) {
        lines.push('- ' + grp.name + ' (' + grp.members.join(', ') + '): focus on ' + grp.focus + ' (' + grp.measure + ').');
      });
    }

    var udl = payload.udlSummary;
    if (udl && ((udl.choicePathways && udl.choicePathways.length) || (udl.supportsUsed && udl.supportsUsed.length))) {
      lines.push('');
      lines.push('Group UDL pathways and supports:');
      if (udl.choicePathways && udl.choicePathways.length) {
        lines.push('- Choice pathways: ' + udl.choicePathways.map(function (cp) { return cp.label + ' (' + cp.students + ')'; }).join(', ') + '.');
      }
      if (udl.supportsUsed && udl.supportsUsed.length) {
        lines.push('- Supports recorded: ' + udl.supportsUsed.slice(0, 8).map(function (sp) { return sp.label + ' (' + sp.students + ')'; }).join(', ') + '.');
      }
    }

    lines.push('');
    lines.push(payload.teamReviewNotice || 'Suggested tiers are screening bands computed locally from loaded results files for MTSS team review, never placement decisions.');
    if (payload.honestNote) lines.push(payload.honestNote);
    return lines.join('\n');
  }

  function renderMtssHuddleCard(doc, payload, callbacks) {
    if (!doc || !payload || !payload.summary || !payload.summary.totalStudents) return null;
    var cb = callbacks || {};
    var s = payload.summary;
    var section = domEl(doc, 'section', 'mtss-huddle-card');
    section.id = 'group-mtss-card';
    section.setAttribute('aria-labelledby', 'group-mtss-heading');

    var heading = domEl(doc, 'h4', 'mtss-huddle-title', 'MTSS small-group screening huddle');
    heading.id = 'group-mtss-heading';

    var fold = domEl(doc, 'details', 'mtss-huddle-fold');
    fold.id = 'group-mtss-fold';
    var summaryParts = [
      'Tier 3: ' + s.tier3,
      'Tier 2: ' + s.tier2,
      'Tier 1: ' + s.tier1,
    ];
    if (s.unscored > 0) summaryParts.push('Unscored: ' + s.unscored);
    var foldSummary = domEl(doc, 'summary', '', 'Show small-group screening bands (' + summaryParts.join(' \u00b7 ') + ')');

    var body = domEl(doc, 'div', 'mtss-huddle-body');
    body.appendChild(domEl(doc, 'p', 'hint mtss-huddle-notice',
      payload.teamReviewNotice || 'Suggested tiers are screening bands computed locally from loaded results files for MTSS team review, never placement decisions.'));

    var grid = domEl(doc, 'div', 'mtss-tier-grid');
    var bandDefs = [
      { key: 3, cls: 'mtss-band-t3', title: 'Tier 3 — intensive review' },
      { key: 2, cls: 'mtss-band-t2', title: 'Tier 2 — targeted review' },
      { key: 1, cls: 'mtss-band-t1', title: 'Tier 1 — on-track' },
      { key: null, cls: 'mtss-band-unscored', title: 'Unscored support or practice only' },
    ];
    var students = Array.isArray(payload.students) ? payload.students : [];
    bandDefs.forEach(function (band) {
      var list = students.filter(function (st) { return st.suggestedTier === band.key; });
      if (!list.length) return;
      var bandCode = band.key === null ? 'unscored' : ('tier' + band.key);
      var block = domEl(doc, 'div', 'mtss-tier-block ' + band.cls);
      block.setAttribute('data-mtss-band', bandCode);
      var bandHead = domEl(doc, 'div', 'mtss-tier-head');
      bandHead.appendChild(domEl(doc, 'p', 'mtss-tier-title', band.title + ' (' + list.length + ')'));
      if (typeof cb.onFilterTier === 'function') {
        var active = cb.activeTier === bandCode;
        var filterBtn = domEl(doc, 'button', 'btn btn-text btn-small mtss-tier-filter-btn no-print',
          active ? 'Showing in table' : 'Filter group table');
        filterBtn.type = 'button';
        filterBtn.setAttribute('data-mtss-filter', bandCode);
        filterBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
        filterBtn.setAttribute('aria-label', (active ? 'Clear group table filter for ' : 'Filter group table to ') + band.title);
        filterBtn.addEventListener('click', function () {
          cb.onFilterTier(active ? '' : bandCode, band.title);
        });
        bandHead.appendChild(filterBtn);
      }
      block.appendChild(bandHead);
      var ul = domEl(doc, 'ul', 'mtss-student-list');
      list.forEach(function (st) {
        var li = domEl(doc, 'li', 'mtss-student-row');
        var btn = domEl(doc, 'button', 'btn btn-text mtss-student-chip', st.studentCode);
        btn.type = 'button';
        btn.setAttribute('data-mtss-student', st.studentCode);
        btn.setAttribute('aria-label', st.studentCode + ': open student view');
        btn.addEventListener('click', function () {
          if (typeof cb.onSelectStudent === 'function') cb.onSelectStudent(st.studentCode);
        });
        li.appendChild(btn);
        var detailBits = [];
        if (st.trendDirection === 'improving' || st.trendDirection === 'declining') detailBits.push(st.trendDirection);
        if (Array.isArray(st.nextFocus) && st.nextFocus.length) detailBits.push('focus: ' + st.nextFocus.slice(0, 2).join(', '));
        else if (Array.isArray(st.reasons) && st.reasons.length) detailBits.push(st.reasons[0]);
        if (detailBits.length) {
          li.appendChild(domEl(doc, 'span', 'mtss-student-detail', ' — ' + detailBits.join(' \u00b7 ')));
        }
        ul.appendChild(li);
      });
      block.appendChild(ul);
      grid.appendChild(block);
    });
    body.appendChild(grid);

    if (Array.isArray(payload.suggestedGroups) && payload.suggestedGroups.length) {
      var sgWrap = domEl(doc, 'div', 'mtss-suggested');
      sgWrap.appendChild(domEl(doc, 'p', 'mtss-tier-title', 'Suggested small-group review sets'));
      var sgList = domEl(doc, 'ul', 'mtss-suggested-list');
      var tierMap = cb.tierFollowups && typeof cb.tierFollowups === 'object' ? cb.tierFollowups : null;
      var followupStatus = domEl(doc, 'p', 'hint mtss-followup-status no-print', '');
      followupStatus.id = 'mtss-followup-status';
      followupStatus.setAttribute('role', 'status');
      followupStatus.hidden = true;

      payload.suggestedGroups.forEach(function (grp) {
        var li = domEl(doc, 'li', 'mtss-suggested-item');
        li.appendChild(domEl(doc, 'span', '', grp.name + ' (' + grp.members.join(', ') + '): ' + grp.focus + ' — ' + grp.measure + '.'));
        var specs = tierMap && Array.isArray(tierMap[grp.id]) ? tierMap[grp.id] : [];
        var hasMembers = Array.isArray(grp.members) && grp.members.length > 0;
        if ((specs.length && typeof cb.onLaunchFollowup === 'function') || hasMembers) {
          var row = domEl(doc, 'div', 'mtss-group-actions no-print');
          if (specs.length && typeof cb.onLaunchFollowup === 'function') {
            specs.forEach(function (spec) {
              var fBtn = domEl(doc, 'button', 'btn btn-small mtss-followup-btn', spec.buttonLabel);
              fBtn.type = 'button';
              fBtn.setAttribute('data-mtss-followup-group', grp.id);
              fBtn.setAttribute('data-followup-target', spec.target);
              fBtn.addEventListener('click', function () {
                followupStatus.hidden = false;
                followupStatus.textContent = 'Preparing ' + spec.name + ' follow-up draft for ' + grp.name + '...';
                Promise.resolve(cb.onLaunchFollowup(spec)).then(function () {
                  var okMsg = 'Opened ' + spec.name + ' follow-up draft for ' + grp.name
                    + ' (' + countWord(spec.missedCount, 'missed') + (spec.reviewCount ? ', ' + countWord(spec.reviewCount, 'review') : '') + ') in a new tab.';
                  followupStatus.textContent = okMsg;
                  if (typeof cb.say === 'function') cb.say(okMsg);
                }, function (err) {
                  var errMsg = String((err && err.message) || 'Could not hand the follow-up draft to the maker.');
                  followupStatus.textContent = errMsg;
                  if (typeof cb.say === 'function') cb.say(errMsg);
                });
              });
              row.appendChild(fBtn);
            });
          }
          if (hasMembers) {
            var copyCodesBtn = domEl(doc, 'button', 'btn btn-small', 'Copy code names');
            copyCodesBtn.type = 'button';
            copyCodesBtn.setAttribute('data-mtss-copy-codes', grp.id);
            copyCodesBtn.setAttribute('aria-label', 'Copy code names for ' + grp.name);
            copyCodesBtn.addEventListener('click', function () {
              var codeText = grp.members.join('\n');
              var fallback = function () {
                followupStatus.hidden = false;
                followupStatus.textContent = grp.name + ' code names: ' + grp.members.join(', ');
                if (typeof cb.say === 'function') cb.say(followupStatus.textContent);
              };
              var win = doc.defaultView || (typeof window !== 'undefined' ? window : null);
              try {
                if (win && win.navigator && win.navigator.clipboard && typeof win.navigator.clipboard.writeText === 'function') {
                  win.navigator.clipboard.writeText(codeText).then(function () {
                    var msg = 'Copied ' + countWord(grp.members.length, 'code name') + ' for ' + grp.name + ' (ready to paste into any maker).';
                    followupStatus.hidden = false;
                    followupStatus.textContent = msg;
                    if (typeof cb.say === 'function') cb.say(msg);
                  }, fallback);
                } else {
                  fallback();
                }
              } catch (_) { fallback(); }
            });
            row.appendChild(copyCodesBtn);

            var saveCodesBtn = domEl(doc, 'button', 'btn btn-small', 'Save code list (.txt)');
            saveCodesBtn.type = 'button';
            saveCodesBtn.setAttribute('data-mtss-save-codes', grp.id);
            saveCodesBtn.setAttribute('aria-label', 'Save code list (.txt) for ' + grp.name);
            saveCodesBtn.addEventListener('click', function () {
              var dateStamp = String((grp.createdAt || todayIso())).replace(/[^0-9-]/g, '') || todayIso();
              var fileName = slugOf(grp.name).replace(/_/g, '-') + '-codes__' + dateStamp + '.txt';
              var bodyText = grp.members.join('\r\n') + '\r\n';
              var saved = false;
              if (typeof cb.onSaveCodeList === 'function') {
                saved = !!cb.onSaveCodeList(fileName, bodyText);
              } else {
                var win = doc.defaultView || (typeof window !== 'undefined' ? window : null);
                try {
                  if (win && typeof win.Blob === 'function' && win.URL && typeof win.URL.createObjectURL === 'function') {
                    var url = win.URL.createObjectURL(new win.Blob([bodyText], { type: 'text/plain;charset=utf-8' }));
                    var a = doc.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    doc.body.appendChild(a);
                    a.click();
                    if (a.parentNode) a.parentNode.removeChild(a);
                    win.setTimeout(function () { try { win.URL.revokeObjectURL(url); } catch (_) {} }, 60000);
                    saved = true;
                  }
                } catch (_) { saved = false; }
              }
              if (saved) {
                var msg = 'Saved ' + fileName + ' (' + countWord(grp.members.length, 'code name') + '). Load it in any maker under Make one for each student.';
                followupStatus.hidden = false;
                followupStatus.textContent = msg;
                if (typeof cb.say === 'function') cb.say(msg);
              }
            });
            row.appendChild(saveCodesBtn);
          }
          li.appendChild(row);
        }
        sgList.appendChild(li);
      });
      sgWrap.appendChild(sgList);
      sgWrap.appendChild(followupStatus);
      body.appendChild(sgWrap);
    }

    var actions = domEl(doc, 'div', 'mtss-huddle-actions no-print');
    if (typeof cb.onPrintHuddle === 'function') {
      var printBtn = domEl(doc, 'button', 'btn btn-small', 'Print 1-page MTSS huddle');
      printBtn.type = 'button';
      printBtn.id = 'print-mtss-huddle';
      printBtn.addEventListener('click', function () { cb.onPrintHuddle(payload); });
      actions.appendChild(printBtn);
    }
    var copyBtn = domEl(doc, 'button', 'btn btn-small', 'Copy MTSS huddle notes');
    copyBtn.type = 'button';
    copyBtn.id = 'copy-mtss-huddle';
    var copySaid = domEl(doc, 'p', 'hint mtss-copy-said no-print', '');
    copySaid.id = 'copy-mtss-huddle-said';
    copySaid.setAttribute('role', 'status');
    copySaid.hidden = true;
    var copyBox = domEl(doc, 'div', 'mtss-copy-box no-print');
    copyBox.id = 'copy-mtss-huddle-box';
    copyBox.hidden = true;

    copyBtn.addEventListener('click', function () {
      var text = formatMtssHuddleText(payload);
      var manual = function () {
        copyBox.textContent = '';
        var area = domEl(doc, 'textarea', 'copy-summary-box');
        area.readOnly = true;
        area.rows = 10;
        area.setAttribute('aria-label', 'Plain-text MTSS small-group huddle notes');
        area.value = text;
        copyBox.appendChild(area);
        copyBox.hidden = false;
        copySaid.textContent = 'This browser did not let the page copy. Select all of the text below and copy it.';
        copySaid.hidden = false;
        area.focus();
        area.select();
        if (typeof cb.say === 'function') cb.say(copySaid.textContent);
      };
      var win = doc.defaultView || (typeof window !== 'undefined' ? window : null);
      try {
        if (win && win.navigator && win.navigator.clipboard && typeof win.navigator.clipboard.writeText === 'function') {
          win.navigator.clipboard.writeText(text).then(function () {
            copyBox.hidden = true;
            copySaid.textContent = 'Copied MTSS huddle notes for ' + countWord(s.totalStudents, 'student') + '.';
            copySaid.hidden = false;
            if (typeof cb.say === 'function') cb.say(copySaid.textContent);
          }, manual);
        } else {
          manual();
        }
      } catch (_) { manual(); }
    });
    actions.appendChild(copyBtn);

    if (typeof cb.onExportCsv === 'function') {
      var csvBtn = domEl(doc, 'button', 'btn btn-small', 'Save MTSS table (CSV)');
      csvBtn.type = 'button';
      csvBtn.id = 'mtss-huddle-csv';
      csvBtn.addEventListener('click', function () { cb.onExportCsv(payload); });
      actions.appendChild(csvBtn);
    }

    if (typeof cb.onExportJson === 'function') {
      var expBtn = domEl(doc, 'button', 'btn btn-small', 'Export MTSS triage JSON');
      expBtn.type = 'button';
      expBtn.id = 'mtss-huddle-export';
      expBtn.addEventListener('click', function () { cb.onExportJson(); });
      actions.appendChild(expBtn);
    }

    domAdd(body, actions, copySaid, copyBox);
    domAdd(fold, foldSummary, body);
    return domAdd(section, heading, fold);
  }

  function buildMtssCsv(payload) {
    if (!payload || !Array.isArray(payload.students)) return '';
    var header = [
      'student_code',
      'suggested_tier',
      'tier_label',
      'sessions',
      'date_range',
      'trend_direction',
      'primary_reason',
      'next_focus',
      'choice_pathways',
      'udl_supports',
    ];
    var rows = [header];
    payload.students.forEach(function (st) {
      var tierVal = st.suggestedTier === null || st.suggestedTier === undefined ? 'unscored' : ('Tier ' + st.suggestedTier);
      var primaryReason = Array.isArray(st.reasons) && st.reasons.length ? st.reasons[0] : '';
      var focusStr = Array.isArray(st.nextFocus) ? st.nextFocus.join('; ') : '';
      var pathwaysStr = Array.isArray(st.choicePathways)
        ? st.choicePathways.map(function (cp) { return cp.label + ' (' + cp.sessions + ')'; }).join('; ')
        : '';
      var supportsStr = Array.isArray(st.udlSupportsUsed) ? st.udlSupportsUsed.join('; ') : '';
      rows.push([
        st.studentCode || '',
        tierVal,
        st.tierLabel || '',
        String(st.sessionCount || 0),
        st.dateRange || '',
        st.trendDirection || '',
        primaryReason,
        focusStr,
        pathwaysStr,
        supportsStr,
      ]);
    });
    return String.fromCharCode(0xFEFF)
      + rows.map(function (cells) { return cells.map(csvGuard).join(','); }).join('\r\n')
      + '\r\n';
  }

  function buildTierFollowupSpecs(payload, learners, options) {
    var out = Object.create(null);
    if (!payload || !Array.isArray(payload.suggestedGroups) || !Array.isArray(learners) || !learners.length) return out;
    var byCode = Object.create(null);
    learners.forEach(function (l) {
      if (l && l.label && !byCode[l.label]) byCode[l.label] = l;
    });
    payload.suggestedGroups.forEach(function (grp) {
      if (!grp || !grp.id || !Array.isArray(grp.members) || !grp.members.length) return;
      var subset = grp.members.map(function (code) { return byCode[code]; }).filter(Boolean);
      if (!subset.length) return;
      var analysis = analyzeFollowup({ scope: 'group', learners: subset, totalLearners: subset.length }, options || {});
      if (!analysis || !analysis.list || !analysis.list.length) return;
      out[grp.id] = analysis.list.map(function (spec) {
        var draftCopy = Object.assign({}, spec.draft);
        var baseTitle = String(draftCopy.title || (spec.name + ' follow-up')).trim();
        draftCopy.title = (grp.name + ': ' + baseTitle).slice(0, 120);
        return Object.assign({}, spec, {
          groupId: grp.id,
          groupName: grp.name,
          groupMembers: grp.members.slice(),
          buttonLabel: 'Make ' + spec.name + ' packet for ' + grp.name,
          draft: draftCopy,
        });
      });
    });
    return out;
  }

  var api = {
    VERSION: VERSION,
    MTSS_EXPORT_KIND: MTSS_EXPORT_KIND,
    MTSS_EXPORT_VERSION: MTSS_EXPORT_VERSION,
    parseMathFact: parseMathFact,
    parseItemSupports: parseItemSupports,
    detectWordSoundsPattern: detectWordSoundsPattern,
    interleaveItems: interleaveItems,
    analyzeFollowup: analyzeFollowup,
    launchFollowupDraft: launchFollowupDraft,
    analyzeUdlSupports: analyzeUdlSupports,
    summarizeReadAlong: summarizeReadAlong,
    buildStudentProgressSummary: buildStudentProgressSummary,
    mtssTierOf: mtssTierOf,
    buildMtssTriageExport: buildMtssTriageExport,
    buildMtssCsv: buildMtssCsv,
    buildTierFollowupSpecs: buildTierFollowupSpecs,
    formatMtssHuddleText: formatMtssHuddleText,
    renderMtssHuddleCard: renderMtssHuddleCard,
    renderFollowupCard: renderFollowupCard,
    renderProgressSummaryCard: renderProgressSummaryCard,
  };

  root.AlloPacketFollowup = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
