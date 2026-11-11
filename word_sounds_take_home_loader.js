// Word Sounds take-home activities: turn a prepared, reviewed lesson into ONE
// self-contained HTML file a learner can open on any device, offline, plus a
// results file (and, when the teacher has a Class Mailbox, an automatic send).
// Loaded on demand with window.__alloLoadPlugin('word_sounds_take_home_loader.js').
//
// Shape: a player SHELL (start, progress, attempts, feedback, saving, finish)
// and one ADAPTER per activity. An adapter has two halves:
//   prepare(word, env) -> { item } | { missing: [...] }   runs in the app
//   render(item, ctx)  -> { reveal() }                     runs in the file
// render is embedded with Function.prototype.toString, so it may use ONLY its
// arguments: everything it needs comes through ctx (see makeCtx below).
//
// The file carries only what each activity needs (an allowlist, never a copy
// of the pack), plays prepared recordings only (no speech engine, no network
// except an optional mailbox send, strict CSP), and grades sounds with
// WS_CORE.soundAnswerMatches, the function the app itself uses. Answers travel
// with the file to be graded offline, so they can be read in its source: this
// is for practice, not for tests.
//
// A lesson with mode 'probe' is a CHECK (one try, no feedback, an honest clock,
// a teacher's screen): see takeHomeCheck. Its answers are scrambled, which
// stops casual looking and nothing more; the same caution applies.
(function (root) {
  'use strict';
  if (root.AlloWordSoundsTakeHome) return;

  var LESSON_SCHEMA = 'alloflow-take-home-lesson/v2';
  var RESULT_KIND = 'alloflow-take-home-result';
  var RESULT_SCHEMA = 3;
  var PACKET_ENGINE = 'alloflow-packet/1';
  var PLAYER = 'alloflow-word-sounds-take-home/2';
  var ORDINAL_KEYS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
  var FEEDBACK_CORRECT = ['fb_great_job', 'fb_nice', 'fb_correct'];
  var FEEDBACK_RETRY = 'fb_try_again_listen';
  var MAX_ITEMS = 40;

  // Words the learner sees. Activity adapters add their own under their id
  // prefix (e.g. isolation_question). Translated through
  // word_sounds.take_home_player_<key> in the app.
  var DEFAULT_LABELS = {
    lang: 'en',
    title: 'Word Sounds practice',
    intro: 'Listen carefully and answer each question. You can hear everything again as many times as you like.',
    learner_label: 'Your code name or first name',
    start: 'Start',
    continue: 'Continue where I left off',
    start_over: 'Start over',
    item_of: '{activity}: {n} of {total}',
    hear_word: 'Hear the word',
    hear_question: 'Hear the question',
    listen_sound: 'Listen to sound {n}',
    choose_sound: 'Choose sound {n}',
    choose_label: 'Choose {sound}',
    sound_n: 'Sound {n}',
    correct: 'Yes! That is right.',
    try_again: 'Not quite. Listen again and try once more.',
    missed: 'Here is the answer. Listen.',
    next: 'Next',
    finish: 'See my results',
    done_title: 'You finished!',
    done_summary: 'Right on the first try: {first} of {total}.',
    done_retry: 'Right after trying again: {retry}.',
    save: 'Save my work as a file',
    send: 'Send my work to my teacher',
    sending: 'Sending...',
    sent: 'Sent. Your teacher\'s mailbox received it ({receipt}).',
    send_failed: 'It did not send. Save your work as a file instead, and give the file to your teacher.',
    saved_device: 'Your work is kept on this device until you start over.',
    saved_device_off: 'This browser cannot keep your work. Save it as a file before you close this page.',
    saved_file: 'Saved as {file}. Give this file to your teacher.',
    not_sent: 'Saving does not send anything. Your teacher gets your work when you give them the file.',
    send_note: 'Sending goes only to your teacher\'s school mailbox.',
    send_closed: 'Sending closed on {date}. Save your work as a file and give it to your teacher.',
    practice_again: 'Practice again',
    practice_again_confirm: 'Your results have not been sent or saved as a file yet. If you start over, they will be lost.',
    keep_results: 'Keep my results',
    name_prompt: 'Add your name so your teacher knows these are yours.',
    name_prompt_add: 'Add my name',
    name_prompt_skip: 'Continue without a name',
    copy_results: 'This browser cannot save files. Copy all of this text and send it to your teacher.',
    save_csv: 'Save results as a spreadsheet file (CSV)',
    copy_tsv: 'Copy for a spreadsheet',
    copied: 'Copied. Now paste it into a spreadsheet.',
    copy_manual: 'Copy all of this text and paste it into a spreadsheet.',
    about_button: 'About this file',
    about_what: 'This is a practice activity in one file. It works with no internet.',
    about_engine: 'File type: {engine}.',
    about_stores: 'It keeps your place and your answers on this device only, under the name {key}. Start over removes them.',
    about_saves: 'When you finish, it can save two files: {csv} opens in a spreadsheet, and {json} is for your teacher to open in AlloFlow.',
    about_no_network: 'It never connects to the internet.',
    about_mailbox: 'It connects to the internet for one thing only: when you press Send, your results go to your teacher\'s class mailbox at {host}. Nothing is sent before that.',
    about_never: 'It never uses the microphone or the camera. It has no cookies and no AI.',
    about_check: 'Each saved file has a check value. It shows when a file was changed by accident. It cannot stop someone who changes a file on purpose.',
    about_rules: 'The safety rules this file gives the browser: {csp}',
    about_licence: 'Licence: {licence}. Anyone may read, share and change the code.',
    about_credits: 'Made with: {list}',
    // Shown only when the file is opened somewhere that does not run it (a Drive or Files preview).
    no_script: 'If the practice does not start, download this file and open it in Chrome, Edge or Safari.',
    audio_missing: 'This sound could not play.',
    ordinals: ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'],
  };

  // Words only a check shows (lesson.mode 'probe'). Kept apart from
  // DEFAULT_LABELS so a practice file does not carry them; translated through
  // word_sounds.take_home_player_<key> like the others. Everything from
  // check_teacher_title down to check_r_practice is the teacher's screen and is
  // written for an adult.
  var CHECK_LABELS = {
    check_about: 'This is a check to see how you are doing. It is not for a grade.',
    check_go_on: 'Next',
    check_practice_title: 'Practice {n} of {total}',
    check_practice_note: 'This one is for practice. It does not count.',
    check_practice_right: 'Yes! That is right.',
    check_practice_wrong: 'Not quite. The answer is {answer}.',
    check_ready_title: 'Get ready',
    check_ready_timed: 'You have {time}. Do as many as you can.',
    check_ready_untimed: 'There is no clock. Take your time.',
    check_ready_one_try: 'You get one try for each one. You cannot go back.',
    check_begin: 'Start',
    check_item_of: 'Question {n} of {total}',
    check_time_left: 'Time left: {time}',
    check_time_start: 'The clock has started. You have {time}.',
    check_time_10: '10 seconds left.',
    check_time_up: 'Time is up.',
    check_one_minute: '1 minute',
    check_minutes: '{n} minutes',
    check_seconds: '{n} seconds',
    check_skip: 'Skip',
    check_stop: 'Stop the check',
    check_stop_confirm: 'Do you want to stop now? You cannot come back to this check.',
    check_stop_yes: 'Yes, stop',
    check_stop_no: 'Keep going',
    check_done_title: 'You finished. Thank you.',
    check_done_count: 'You answered {done} of {total}.',
    check_done_time: 'Time: {time}.',
    check_again: 'Start over',
    check_again_confirm: 'Do you want to start this check again? It will be saved as a new try. Save your work first.',
    check_again_yes: 'Yes, start over',
    check_again_no: 'Keep my work',
    check_pad_label: 'Your answer',
    check_pad_keys: 'Number keys',
    check_pad_delete: 'Delete',
    check_pad_minus: 'Minus',
    check_pad_next: 'Next',
    check_teacher_title: 'For the teacher',
    check_teacher_open: 'For the teacher: show results',
    check_teacher_code: 'Teacher code',
    check_teacher_show: 'Show results',
    check_teacher_checking: 'Checking the code...',
    check_teacher_wrong: 'That code is not correct. Tries left before a 30-second wait: {left}.',
    check_teacher_wait: 'Too many incorrect codes. Wait {seconds} seconds, then try again.',
    check_review_title: 'Results for the teacher',
    check_review_close: 'Close the results',
    check_review_score: 'Score: {score} {unit}.',
    check_review_no_score: 'No score: {reason}.',
    check_reason_ended_early: 'the check was stopped before the end',
    check_reason_too_fast: 'every item was finished in under 20 seconds, which is too fast to prorate to a full minute',
    check_reason_untimed: 'a rate needs a time limit',
    check_unit_items_correct: 'items correct',
    check_unit_digits_correct_per_minute: 'digits correct per minute',
    check_review_items: 'Items correct: {correct} of {attempted} attempted ({given} given).',
    check_review_digits: 'Digits correct: {correct} of {possible} possible on the items attempted.',
    check_review_time: 'Time used: {elapsed} s. Time limit: {limit}.',
    check_review_limit: '{seconds} s',
    check_review_no_limit: 'none',
    check_review_hidden: 'Time with the page hidden or closed: {hidden} s.',
    check_review_prorated: 'All items were finished before the time limit, so the rate is prorated over the time used.',
    check_review_attempt: 'Attempt {n} for this learner label on this device.',
    check_review_flags: 'Flags: {flags}.',
    check_flag_left_the_page: 'left the page for more than 3 seconds',
    check_flag_clock_changed: 'the device clock was set back',
    check_flag_reloaded: 'the page was reloaded',
    check_review_note: 'All times come from the clock of the learner device.',
    check_col_n: 'No.',
    check_col_prompt: 'Item',
    check_col_response: 'Response',
    check_col_result: 'Result',
    check_col_expected: 'Expected',
    check_col_time: 'Time (s)',
    check_r_right: 'right',
    check_r_wrong: 'wrong',
    check_r_skipped: 'skipped',
    check_r_time_up: 'time ran out',
    check_r_not_reached: 'not reached',
    check_r_practice: 'practice (not scored)',
    check_no_script: 'If the check does not start, download this file and open it in Chrome, Edge or Safari.',
    check_about_what: 'This is a check in one file. It works with no internet.',
    check_about_clock: 'The clock uses the time on this device. It keeps going when you leave the page.',
    check_about_tries: 'It also keeps a count of how many times this check was started on this device.',
    check_about_scrambled: 'The answers are scrambled so they cannot be read by opening the file. This stops casual looking, not a determined person.',
    check_about_code: 'The teacher code keeps the answers screen closed. It is a lock on the screen, not secret writing: someone who knows how to read the file\'s code could still work the answers out.',
  };

  function str(value) { return value == null ? '' : String(value); }
  function hashText(text) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function randomId() {
    try { if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID(); } catch (_) {}
    return 'th-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }
  var SHA_K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  // SHA-256 of a string's UTF-8 bytes, synchronously (the app side: the file's
  // script hash and checking a returned file). null where it cannot be made.
  function sha256(text) {
    var bytes;
    try { bytes = new TextEncoder().encode(text); } catch (_) { return null; }
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var n = bytes.length, total = ((n + 72) >> 6) << 6;
    var data = new Uint8Array(total);
    data.set(bytes); data[n] = 0x80;
    var view = new DataView(data.buffer);
    view.setUint32(total - 8, Math.floor(n / 536870912), false); view.setUint32(total - 4, (n << 3) >>> 0, false);
    var w = new Int32Array(64), i;
    for (var at = 0; at < total; at += 64) {
      for (i = 0; i < 16; i++) w[i] = view.getInt32(at + i * 4, false);
      for (i = 16; i < 64; i++) {
        var x = w[i - 15], y = w[i - 2];
        w[i] = (w[i - 16] + ((x >>> 7 | x << 25) ^ (x >>> 18 | x << 14) ^ (x >>> 3)) + w[i - 7] + ((y >>> 17 | y << 15) ^ (y >>> 19 | y << 13) ^ (y >>> 10))) | 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (i = 0; i < 64; i++) {
        var t1 = (h + ((e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7)) + ((e & f) ^ (~e & g)) + SHA_K[i] + w[i]) | 0;
        var t2 = (((a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    var out = new Uint8Array(32), ov = new DataView(out.buffer);
    for (i = 0; i < 8; i++) ov.setInt32(i * 4, H[i], false);
    var hex = '', bin = '';
    for (i = 0; i < 32; i++) { hex += (out[i] < 16 ? '0' : '') + out[i].toString(16); bin += String.fromCharCode(out[i]); }
    return { hex: hex, base64: btoa(bin) };
  }

  // The results as one table: the spreadsheet file, the text to copy, the
  // summary and the text the integrity value covers. Uses only its argument (a
  // result object, as saved): it is embedded in the learner's file with
  // toString() and also checks returned files in the app.
  function packetCsv(result) {
    var r = result || {};
    var packet = r.packet && typeof r.packet === 'object' ? r.packet : {};
    var text = function (v) { return v == null ? '' : typeof v === 'string' ? v : typeof v === 'object' ? JSON.stringify(v) : String(v); };
    // Same rules as _acCsvCell (student_analytics_module.js).
    var cell = function (v) {
      var t = v == null ? '' : String(v);
      if (typeof v === 'string' && /^[=+\-@\t\r]/.test(t)) t = "'" + t;
      return '"' + t.replace(/"/g, '""') + '"';
    };
    var header = ['format', 'session_id', 'packet_id', 'packet_version', 'form', 'mode', 'learner', 'started_local', 'finished_local', 'duration_s',
      'item_n', 'item_id', 'activity', 'activity_title', 'scored', 'word', 'target', 'responses', 'correct', 'first_try', 'tries', 'time_ms', 'supports', 'flag'];
    // A check (packet.mode "probe") has two more cells in every item row, after
    // "flag": digits_correct and digits_possible, each a whole number or empty
    // (item.digitsCorrect / item.digitsPossible; empty when null or absent).
    // The integrity value covers the item rows as written, so in a check it
    // covers these two cells too. The "#score" row is, like "#summary", not covered.
    var probe = text(packet.mode) === 'probe';
    var count = function (v) { return v == null || v === '' || !isFinite(Number(v)) ? '' : Math.max(0, Math.round(Number(v))); };
    if (probe) header.push('digits_correct', 'digits_possible');
    var titles = r.activityTitles && typeof r.activityTitles === 'object' ? r.activityTitles : {};
    var learner = text(r.learner != null ? r.learner : r.learnerName);
    var session = text(r.sessionId);
    var seconds = Math.round((Number(r.durationMs) || 0) / 1000);
    var list = Array.isArray(r.items) ? r.items : [];
    var summary = { itemsGiven: 0, attempted: 0, correct: 0, firstTry: 0, accuracyPct: 0, byActivity: [] };
    var by = {};
    var rows = list.map(function (it, i) {
      it = it && typeof it === 'object' ? it : {};
      var activity = text(it.activity);
      var practice = !!it.practice || activity === 'letter_tracing';
      var a = by['a:' + activity];
      if (!a) { a = by['a:' + activity] = { activity: activity, items: 0, correct: 0, firstTry: 0 }; summary.byActivity.push(a); }
      if (!practice) {
        summary.itemsGiven++; a.items++;
        if (Number(it.attempts) > 0) summary.attempted++;
        if (it.correct) { summary.correct++; a.correct++; }
        if (it.firstTry) { summary.firstTry++; a.firstTry++; }
      }
      var supports = it.supports && typeof it.supports === 'object' ? Object.keys(it.supports).map(function (k) { return k + ':' + text(it.supports[k]); }).join(';') : '';
      return ['alloflow-packet-result/1', session, text(packet.id), text(packet.version), text(packet.form), text(packet.mode), learner,
        text(r.startedLocal), text(r.finishedLocal), seconds, Number(it.n) || i + 1, text(it.itemId), activity, text(titles[activity]),
        practice ? 0 : 1, text(it.word), text(it.target), (Array.isArray(it.responses) ? it.responses : []).map(text).join(' | '),
        it.correct ? 1 : 0, it.firstTry ? 1 : 0, Number(it.attempts) || 0, Math.max(0, Math.round(Number(it.ms) || 0)), supports, text(it.flag)]
        .concat(probe ? [count(it.digitsCorrect), count(it.digitsPossible)] : []);
    });
    summary.accuracyPct = summary.itemsGiven ? Math.round(summary.correct / summary.itemsGiven * 100) : 0;
    var line = function (cells) { return cells.map(cell).join(','); };
    var lines = rows.map(line);
    var notName = /[^a-z0-9]+/gi;
    try { notName = new RegExp('[^\\p{L}\\p{M}\\p{N}]+', 'gu'); } catch (_) {}
    var safe = function (v) { return text(v).replace(notName, '-').replace(/^-+|-+$/g, '').slice(0, 40); };
    // The file name carries the FINISH date, on the learner's clock.
    var day = /^\d{4}-\d{2}-\d{2}/.exec(text(r.finishedLocal) || text(r.startedLocal));
    return {
      header: header, rows: rows, lines: lines, summary: summary,
      stem: [safe(r.lessonTitle) || 'packet', safe(learner) || 'results'].concat(day ? [day[0]] : []).join('__'),
      basis: [text(packet.id), text(packet.version), text(packet.form), session].join('|') + '\n' + lines.join('\n'),
      text: function (integrity) {
        var g = integrity || {};
        var tail = [['#summary', session, 'items_given=' + summary.itemsGiven, 'attempted=' + summary.attempted, 'correct=' + summary.correct,
          'first_try=' + summary.firstTry, 'accuracy_pct=' + summary.accuracyPct],
        ['#integrity', text(g.method), text(g.value), 'detects accidental edits, not deliberate ones']];
        // A check: the try number, and a "#score" row between the other two.
        var sc = probe && r.score && typeof r.score === 'object' ? r.score : null;
        var kv = function (k, v) { return k + '=' + (v == null ? '' : v === true ? 1 : v === false ? 0 : text(v)); };
        if (probe) tail[0].push(kv('attempt', sc && sc.attempt != null ? sc.attempt : 1));
        if (sc) tail.splice(1, 0, ['#score', session, kv('measure', sc.measure), kv('score', sc.score), kv('score_unit', sc.scoreUnit), kv('digits_correct', sc.digitsCorrect),
          kv('digits_possible', sc.digitsPossible), kv('items_correct', sc.itemsCorrect), kv('items_attempted', sc.itemsAttempted), kv('time_limit_s', sc.timeLimitS),
          kv('elapsed_s', sc.elapsedS), kv('hidden_s', sc.hiddenS), kv('completion', sc.completion), kv('prorated', !!sc.prorated), kv('scoring_version', sc.scoringVersion),
          kv('form_version', sc.formVersion), kv('attempt', sc.attempt), kv('flags', Array.isArray(sc.flags) ? sc.flags.map(text).join(';') : '')]);
        return String.fromCharCode(0xFEFF) + [header].concat(rows, tail).map(line).join('\r\n') + '\r\n';
      },
      tsv: function () {
        return [header].concat(rows).map(function (cells) {
          return cells.map(function (v) {
            var t = (v == null ? '' : String(v)).replace(/[\t\r\n]+/g, ' ');
            return typeof v === 'string' && /^[=+\-@]/.test(t) ? "'" + t : t;
          }).join('\t');
        }).join('\n');
      },
    };
  }

  // Class Mailbox send: embedded ONLY in a file that has a mailbox. The pack
  // capability (id + k) and chunked `putsubmission` protocol a hosted homework
  // link uses. Plain-text POST, so there is no preflight.
  function takeHomeMailbox(win, target) {
    if (!target || !target.url || !win.fetch) return null;
    var post = function (payload) {
      return win.fetch(target.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), redirect: 'follow' })
        .then(function (r) { return r.json(); })
        .then(function (data) { if (!data || data.ok !== true) throw new Error((data && data.e) || 'not ok'); return data; });
    };
    return function (sid, payload) {
      var parts = [];
      for (var at = 0; at < payload.length; at += 60000) parts.push(payload.slice(at, at + 60000));
      return parts.reduce(function (chain, data, i) {
        return chain.then(function () { return post({ a: 'putsubmission', id: target.packId, k: target.secret, sid: sid, part: i + 1, of: parts.length, data: data }); });
      }, Promise.resolve(null));
    };
  }

  // ---------------------------------------------------------------------------
  // Adapter: Find Sounds (isolation)
  // ---------------------------------------------------------------------------
  var isolation = {
    id: 'isolation',
    title: 'Find Sounds',
    labels: {
      isolation_question: 'What is the {position} sound in the word?',
      isolation_correct: 'Yes! That is the {position} sound.',
      isolation_missed: 'The {position} sound is {sound}. Listen.',
      isolation_missed_no_letters: 'Here is the {position} sound. Listen.',
    },
    prepare: function (w, env) {
      var board = w.activityItems && w.activityItems.isolation;
      if (!board) return { missing: ['board'] };
      var target = env.label(board.correctSound);
      var labels = env.uniqueLabels(board.options);
      var position = Number.isInteger(board.position) && board.position >= 0 ? board.position : 0;
      if (!target || labels.length < 2 || labels.indexOf(target) < 0) return { missing: ['board'] };
      var missing = [];
      var wordAudio = env.wordClip(env.word);
      if (!wordAudio) missing.push('word');
      var prompt = env.bankClip('isolation', ORDINAL_KEYS[position]) ||
        env.packClip('what is the ' + ORDINAL_KEYS[position] + ' sound?') ||
        env.packClip('what is the ' + (DEFAULT_LABELS.ordinals[position] || '') + ' sound in ' + env.word + '?');
      if (!prompt) missing.push('question');
      var choices = labels.map(function (label) {
        var clip = env.phonemeClip(label);
        if (!clip) missing.push('/' + label + '/');
        return { label: label, audio: clip };
      });
      if (missing.length) return { missing: missing };
      var answer = choices.filter(function (c) { return c.label === target; })[0];
      return { item: { position: position, target: target, wordAudio: wordAudio, promptAudio: prompt, choices: choices,
        introAudio: [prompt, wordAudio], answerAudio: [wordAudio, answer.audio] } };
    },
    render: function (item, ctx) {
      var position = ctx.ordinal(item.position);
      var cards = [];
      var list = ctx.el('ul', { class: 'choices' });
      item.choices.forEach(function (choice, i) {
        var n = i + 1;
        var shown = ctx.showLetters ? '/' + choice.label + '/' : ctx.fmt(ctx.L.sound_n, { n: n });
        var listen = ctx.el('button', { type: 'button', 'aria-label': ctx.fmt(ctx.L.listen_sound, { n: n }),
          on: { click: function () { ctx.support('soundListens'); ctx.play(choice.audio); } } }, ['\u25B6 ', ctx.fmt(ctx.L.sound_n, { n: n })]);
        var choose = ctx.el('button', { type: 'button', class: 'primary',
          'aria-label': ctx.showLetters ? ctx.fmt(ctx.L.choose_label, { sound: shown }) : ctx.fmt(ctx.L.choose_sound, { n: n }),
          on: { click: function () {
            if (ctx.isDone() || choose.getAttribute('aria-disabled') === 'true') return;
            var outcome = ctx.answer(choice.label, ctx.matches(choice.label, item.target), {
              correctText: ctx.fmt(ctx.L.isolation_correct, { position: position }),
              missedText: ctx.showLetters ? ctx.fmt(ctx.L.isolation_missed, { position: position, sound: '/' + item.target + '/' })
                : ctx.fmt(ctx.L.isolation_missed_no_letters, { position: position }),
            });
            if (outcome !== 'correct') { box.classList.add('tried'); choose.setAttribute('aria-disabled', 'true'); }
          } } }, [ctx.showLetters ? ctx.el('span', { class: 'letters', text: shown }) : ctx.fmt(ctx.L.choose_sound, { n: n })]);
        var box = ctx.el('li', { class: 'choice' }, [listen, choose]);
        cards.push({ box: box, choose: choose, label: choice.label });
        list.appendChild(box);
      });
      ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.fmt(ctx.L.isolation_question, { position: position }) }));
      ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
        ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: ctx.L.hear_question }),
        ctx.el('button', { type: 'button', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: ctx.L.hear_word }),
      ]));
      ctx.root.appendChild(list);
      return {
        // Called once the item is over (right, or missed twice): lock it and
        // show which choice was right.
        reveal: function () {
          cards.forEach(function (c) { c.choose.setAttribute('aria-disabled', 'true'); if (c.label === item.target) c.box.classList.add('right'); });
        },
      };
    },
  };

  var ADAPTERS = { isolation: isolation };
  // BEGIN GENERATED ADAPTERS (dev-tools/build_word_sounds_take_home.cjs)
  ADAPTERS["blending"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Blend Sounds (blending).
    // App: board from compileActivityItems (word_sounds_setup_source.jsx:4628,4801)
    // { options: [word + up to 5 distractors], answer: word }; played by
    // playBlending + the instruction sequence (word_sounds_module.js:9767,16790);
    // graded at word_sounds_module.js:19516-19523 (option.toLowerCase() ===
    // word.toLowerCase(), then checkAnswer("correct"|"incorrect","correct"),
    // default budget 2 tries, word_sounds_module.js:17130).
    module.exports = {
      id: 'blending',
      title: 'Blend Sounds',
      labels: {
        blending_prompt: 'Blend these sounds together!',
        blending_question: 'Which word did you hear?',
        blending_hear_sounds: 'Hear the sounds',
        blending_play_all: 'Play all the words',
        blending_option_n: 'Option {n}',
        blending_listen: 'Listen',
        blending_listen_option: 'Listen to option {n}',
        blending_listen_word: 'Listen to {word}',
        blending_choose_option: 'Choose option {n}',
        blending_choose_word: 'Choose {word}',
        blending_correct: 'Yes! You blended the sounds.',
        blending_missed: 'The word was {word}. Listen.',
        blending_missed_no_letters: 'Here is the word. Listen.',
        blending_answer_mark: '(the answer)',
      },
      prepare: function (w, env) {
        var board = w && w.activityItems && w.activityItems.blending;
        if (!board) return { missing: ['board'] };
        var word = String(env.word);
        var target = word.trim().toLowerCase();
        // Same usable-board test as preparedBlendingOptionsFor
        // (word_sounds_module.js:12352-12358).
        var options = Array.isArray(board.options) ? board.options.filter(function (o) { return typeof o === 'string' && o.trim(); }) : [];
        if (options.length < 2 || !options.some(function (o) { return o.trim().toLowerCase() === target; })) return { missing: ['board'] };
        // playBlending speaks every phoneme; a one-sound "blend" is not a blend
        // (the printable presentation also requires 2+, word_sounds_module.js:6277).
        var phonemes = Array.isArray(w.phonemes) ? w.phonemes : [];
        var labels = phonemes.map(function (p) { return env.label(p); });
        if (labels.length < 2 || labels.some(function (l) { return !l; })) return { missing: ['board'] };
        var missing = [];
        var sounds = labels.map(function (label) {
          var clip = env.phonemeClip(label);
          if (!clip) missing.push('/' + label + '/');
          return clip;
        });
        // Instruction: the bank clip the app plays first (INST_KEY_MAP blending ->
        // inst_blending), else the prompt text it would speak.
        var instruction = env.bankClip('instructions', 'inst_blending') || env.packClip('Blend these sounds together!');
        // playBlending ends with which_word_did_you_hear, else this text.
        var question = env.bankClip('instructions', 'which_word_did_you_hear') || env.packClip('Which word did you hear?');
        if (!question) missing.push('question');
        var answerClip = null;
        var choices = options.map(function (text) {
          var clip = env.wordClip(text);
          var isTarget = text.trim().toLowerCase() === target;
          if (!clip && !missing.some(function (m) { return m === (isTarget ? 'word' : 'word:' + text.trim().toLowerCase()); })) {
            missing.push(isTarget ? 'word' : 'word:' + text.trim().toLowerCase());
          }
          if (isTarget) answerClip = clip;
          return { text: text, audio: clip };
        });
        if (missing.length) return { missing: missing };
        return { item: { target: word, instruction: instruction, question: question, sounds: sounds, choices: choices,
          answerAudio: [answerClip] } };
      },
      render: function (item, ctx) {
        var win = ctx.root.ownerDocument.defaultView;
        var cards = [];
        var token = 0;
        var mark = function (index) {
          cards.forEach(function (c, i) { c.box.style.outline = i === index ? '4px solid var(--accent)' : ''; c.box.style.outlineOffset = i === index ? '2px' : ''; });
        };
        // Play a sequence with the app's pauses; any tap, answer or new screen
        // ends it (a stopped clip never resolves, and the token moves on).
        var run = function (steps) {
          var mine = ++token;
          var i = 0;
          var step = function () {
            if (mine !== token || !ctx.root.isConnected) return;
            if (i >= steps.length) { mark(-1); return; }
            var s = steps[i++];
            mark(s.hi == null ? -1 : s.hi);
            ctx.play(s.id).then(function () {
              if (mine === token) win.setTimeout(step, s.gap || 0);
            });
          };
          step();
        };
        var halt = function () { token++; mark(-1); };
        var soundSteps = function () {
          return item.sounds.map(function (id) { return { id: id, gap: 500 }; }).concat([{ id: item.question, gap: 100 }]);
        };
        var optionSteps = function (gap) {
          return item.choices.map(function (c, i) { return { id: c.audio, gap: gap, hi: i }; });
        };
        var list = ctx.el('ul', { class: 'choices' });
        item.choices.forEach(function (choice, i) {
          var n = i + 1;
          var shownWord = choice.text;
          var listen = ctx.el('button', { type: 'button',
            'aria-label': ctx.showLetters ? ctx.fmt(ctx.L.blending_listen_word, { word: shownWord }) : ctx.fmt(ctx.L.blending_listen_option, { n: n }),
            on: { click: function () { halt(); ctx.support('optionListens'); ctx.play(choice.audio); } } }, ['▶ ', ctx.L.blending_listen]);
          var choose = ctx.el('button', { type: 'button', class: 'primary',
            'aria-label': ctx.showLetters ? ctx.fmt(ctx.L.blending_choose_word, { word: shownWord }) : ctx.fmt(ctx.L.blending_choose_option, { n: n }),
            on: { click: function () {
              if (ctx.isDone() || choose.getAttribute('aria-disabled') === 'true') return;
              halt();
              // word_sounds_module.js:19517-19519: case-insensitive, exact otherwise.
              var right = String(choice.text).toLowerCase() === String(item.target).toLowerCase();
              var outcome = ctx.answer(choice.text, right, {
                correctText: ctx.L.blending_correct,
                missedText: ctx.showLetters ? ctx.fmt(ctx.L.blending_missed, { word: item.target }) : ctx.L.blending_missed_no_letters,
              });
              if (outcome !== 'correct') { box.classList.add('tried'); choose.setAttribute('aria-disabled', 'true'); }
            } } }, [ctx.showLetters ? ctx.el('span', { class: 'letters', text: shownWord }) : ctx.fmt(ctx.L.blending_option_n, { n: n })]);
          var box = ctx.el('li', { class: 'choice' }, [choose, listen]);
          cards.push({ box: box, choose: choose, right: String(choice.text).toLowerCase() === String(item.target).toLowerCase() });
          list.appendChild(box);
        });
        ctx.root.appendChild(ctx.el('p', { text: ctx.L.blending_prompt }));
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.blending_question }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('soundReplays'); run(soundSteps()); } }, text: ctx.L.blending_hear_sounds }),
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('optionReplays'); run(optionSteps(600)); } }, text: ctx.L.blending_play_all }),
        ]));
        ctx.root.appendChild(list);
        // Opening sequence (word_sounds_module.js:16790-16845): instruction, each
        // sound, "Which word did you hear?", then every choice in turn.
        if (!ctx.isDone()) {
          run([{ id: item.instruction, gap: 200 }].concat(soundSteps(), optionSteps(200)));
        }
        return {
          reveal: function () {
            halt();
            cards.forEach(function (c) {
              c.choose.setAttribute('aria-disabled', 'true');
              if (c.right && !c.box.classList.contains('right')) {
                c.box.classList.add('right');
                c.choose.setAttribute('aria-label', c.choose.getAttribute('aria-label') + ' ' + ctx.L.blending_answer_mark);
              }
            });
          },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["counting"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Sound Counting (counting).
    // App source of truth (word_sounds_module.js):
    //   board view  case "counting" (~20594): count = phonemeCount || phonemes.length,
    //               expectedCount = count >= 11 ? "11+" : count; buttons 1..10 and "11+";
    //               a tap grades at once: checkAnswer(num, expectedCount).
    //   grading     checkAnswer (~17060): WS_CORE.soundAnswerMatches on the lowercased,
    //               trimmed strings; for numbers that is plain string equality.
    //               Default retry budget: 2 presentations (1 retry).
    //   audio       runInstructionSequence (~16446, ~16996): inst_counting bank clip,
    //               then the word.
    module.exports = {
      id: 'counting',
      title: 'Sound Counting',
      labels: {
        counting_question: 'How many sounds do you hear in the word?',
        counting_sounds_one: '1 sound',
        counting_sounds_n: '{n} sounds',
        counting_sounds_more: '11 or more sounds',
        counting_correct: 'Yes! The word has {count}.',
        counting_missed: 'The word has {count}. Listen to it again.',
      },
      prepare: function (w, env) {
        var phonemes = Array.isArray(w.phonemes) ? w.phonemes : [];
        // Same expression the app grades against (case "counting").
        var count = Number(w.phonemeCount || phonemes.length || 0);
        if (!Number.isInteger(count) || count < 1) return { missing: ['board'] };
        var target = count >= 11 ? '11+' : String(count);
        var missing = [];
        var wordAudio = env.wordClip(env.word);
        if (!wordAudio) missing.push('word');
        var prompt = env.bankClip('instructions', 'inst_counting');
        if (!prompt) missing.push('question');
        if (missing.length) return { missing: missing };
        return { item: { target: target, wordAudio: wordAudio, promptAudio: prompt,
          introAudio: [prompt, wordAudio], answerAudio: [wordAudio] } };
      },
      render: function (item, ctx) {
        var values = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11+'];
        var countText = function (v) {
          return v === '11+' ? ctx.L.counting_sounds_more : v === '1' ? ctx.L.counting_sounds_one : ctx.fmt(ctx.L.counting_sounds_n, { n: v });
        };
        var cards = [];
        var list = ctx.el('ul', { class: 'counting-numbers', style: 'display:flex;flex-wrap:wrap;gap:10px;list-style:none;padding:0;margin:16px 0' });
        values.forEach(function (v) {
          var button = ctx.el('button', { type: 'button', class: 'primary', 'aria-label': countText(v),
            style: 'min-width:64px;min-height:64px;font-size:1.4rem;font-weight:700',
            on: { click: function () {
              if (ctx.isDone() || button.getAttribute('aria-disabled') === 'true') return;
              var outcome = ctx.answer(v, v === item.target, {
                correctText: ctx.fmt(ctx.L.counting_correct, { count: countText(item.target) }),
                missedText: ctx.fmt(ctx.L.counting_missed, { count: countText(item.target) }),
              });
              if (outcome !== 'correct') { box.classList.add('tried'); button.setAttribute('aria-disabled', 'true'); }
            } } }, [v]);
          var box = ctx.el('li', { class: 'choice solo', style: 'padding:6px' }, [button]);
          cards.push({ box: box, button: button, value: v });
          list.appendChild(box);
        });
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.counting_question }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: ctx.L.hear_question }),
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: ctx.L.hear_word }),
        ]));
        ctx.root.appendChild(list);
        return {
          reveal: function () {
            cards.forEach(function (c) { c.button.setAttribute('aria-disabled', 'true'); if (c.value === item.target) c.box.classList.add('right'); });
          },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["decoding"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Read & Match (decoding).
    // App: board { choices: [word + 3 others] } (word_sounds_setup_source.jsx:4717,4816);
    // pictures from the pack's shared image manifest (_decodingAssets/_aacAssets on
    // the first row, row images win: word_sounds_module.js:8139-8152, setup
    // 5231-5254,5552); the grid shows only when EVERY choice has its picture
    // (word_sounds_module.js:20798-20805). The printed word is never spoken
    // (17169-17171). Graded at word_sounds_module.js:20808 ->
    // checkAnswer(choice, word): lower-cased, trimmed comparison
    // (17099-17113), 2 tries.

    // Pictures this export has seen so far, by the app's precedence. prepare()
    // receives one row; the manifest rides on the first row, which comes first.
    var lib = { key: null, manifest: {}, rows: {} };
    function remember(w, env) {
      if (lib.key !== env.packClip) lib = { key: env.packClip, manifest: {}, rows: {} };
      [w && w._decodingAssets, w && w._aacAssets].forEach(function (bucket) {
        if (bucket && typeof bucket === 'object' && !Array.isArray(bucket)) Object.keys(bucket).forEach(function (k) { lib.manifest[k] = bucket[k]; });
      });
      var key = String((w && (w.targetWord || w.word || w.term)) || '').trim().toLowerCase();
      if (key && w && typeof w.image === 'string' && w.image.indexOf('ref::') !== 0) lib.rows[key] = w.image;
    }
    function pictureFor(text, env) {
      var raw = typeof env.packImage === 'function' ? env.packImage(text) : null;
      if (!raw) { var lc = String(text || '').toLowerCase(); raw = lib.rows[lc] || lib.manifest[lc] || null; }
      if (typeof raw !== 'string' || !raw) return null;
      if (/^https?:/i.test(raw)) return null; // cannot travel inside an offline file
      return env.image(/^data:/i.test(raw) ? raw : 'data:image/png;base64,' + raw);
    }

    module.exports = {
      id: 'decoding',
      title: 'Read & Match',
      labels: {
        decoding_prompt: 'Read the word, then tap its picture!',
        decoding_hear_instructions: 'Hear the instructions',
        decoding_picture_of: 'Picture of {word}',
        decoding_correct: 'Yes! You read the word.',
        decoding_missed: 'This picture goes with {word}.',
        decoding_answer_mark: '(the answer)',
      },
      prepare: function (w, env) {
        remember(w, env);
        var board = w && w.activityItems && w.activityItems.decoding;
        var word = String(env.word);
        var target = word.toLowerCase();
        var choices = board && Array.isArray(board.choices) ? board.choices.filter(function (c) { return typeof c === 'string' && c; }) : [];
        // word_sounds_module.js:13043-13048.
        if (choices.length < 2 || !choices.some(function (c) { return c.toLowerCase() === target; })) return { missing: ['board'] };
        var missing = [];
        var pics = choices.map(function (c) {
          var id = pictureFor(c, env);
          if (!id) missing.push('picture:' + c.toLowerCase());
          return id;
        });
        if (missing.length) return { missing: missing };
        // The app speaks only its prompt text; setup does not prepare a clip for
        // it, so a pack that has one is a bonus, not a requirement.
        var prompt = env.packClip('Read the word, then tap its picture!');
        return { item: { target: word, printed: word, prompt: prompt,
          choices: choices.map(function (c, i) { return { text: c, image: pics[i] }; }),
          introAudio: prompt ? [prompt] : [], answerAudio: [] } };
      },
      render: function (item, ctx) {
        var cards = [];
        var norm = function (s) { return String(s == null ? '' : s).toLowerCase().trim(); };
        var list = ctx.el('ul', { class: 'choices' });
        item.choices.forEach(function (choice) {
          var right = norm(choice.text) === norm(item.target);
          var src = ctx.image(choice.image);
          var name = ctx.fmt(ctx.L.decoding_picture_of, { word: choice.text });
          var pick = ctx.el('button', { type: 'button', 'aria-label': name, style: 'width:100%;display:flex;justify-content:center;background:#fff',
            on: { click: function () {
              if (ctx.isDone() || pick.getAttribute('aria-disabled') === 'true') return;
              var outcome = ctx.answer(choice.text, right, {
                correctText: ctx.L.decoding_correct,
                missedText: ctx.fmt(ctx.L.decoding_missed, { word: item.printed }),
              });
              if (outcome !== 'correct') { box.classList.add('tried'); pick.setAttribute('aria-disabled', 'true'); }
            } } }, [ctx.el('img', { class: 'picture', src: src || '', alt: '' })]);
          var box = ctx.el('li', { class: 'choice' }, [pick]);
          cards.push({ box: box, pick: pick, right: right });
          list.appendChild(box);
        });
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.decoding_prompt }));
        // The printed word, as the app shows it (CSS capitalize).
        ctx.root.appendChild(ctx.el('p', { class: 'letters', lang: 'en', style: 'font-size:3rem;text-transform:capitalize;margin:8px 0', text: item.printed }));
        if (item.prompt) {
          ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
            ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.prompt); } }, text: ctx.L.decoding_hear_instructions }),
          ]));
        }
        ctx.root.appendChild(list);
        return {
          reveal: function () {
            cards.forEach(function (c) {
              c.pick.setAttribute('aria-disabled', 'true');
              if (c.right && !c.box.classList.contains('right')) {
                c.box.classList.add('right');
                c.pick.setAttribute('aria-label', c.pick.getAttribute('aria-label') + ' ' + ctx.L.decoding_answer_mark);
              }
            });
          },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["letter_tracing"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Letter Trace (letter_tracing).
    // App source of truth (word_sounds_module.js):
    //   board       activityItems.letter_tracing = { letter: word[0] } (setup), and the
    //               player traces the word's first letter; a board copied from another
    //               word is never used (the letter must be the word's first letter).
    //   grading     none: letter_tracing is in WS_NON_GRADED_ACTIVITIES, so the file
    //               records it as practice ("traced" or "skipped"), never right or wrong.
    //   access      pointer events cover mouse, touch and pen; "Skip (not traced)" is the
    //               path for a student who cannot trace (2026-11-07 parity audit).
    module.exports = {
      id: 'letter_tracing',
      title: 'Letter Trace',
      labels: {
        letter_tracing_question: 'Trace the letter {letter} with your finger, a pen or the mouse.',
        letter_tracing_canvas: 'Tracing area for the letter {letter}',
        letter_tracing_done: 'I traced it',
        letter_tracing_clear: 'Start again',
        letter_tracing_skip: 'Skip (not traced)',
        letter_tracing_more: 'Keep going. Trace over more of the letter.',
        letter_tracing_stay: 'Stay on the letter. Press Start again and trace inside its shape.',
        letter_tracing_traced: 'Nice tracing!',
        letter_tracing_skipped: 'Skipped. That is fine.',
      },
      prepare: function (w, env) {
        var word = String((w && (w.targetWord || w.word || w.term)) || '').trim();
        var first = Array.from(word)[0] || '';
        var board = w && w.activityItems && w.activityItems.letter_tracing;
        var letter = String((board && board.letter) || first).trim();
        if (!letter || !first || Array.from(letter).length !== 1 || letter.toLowerCase() !== first.toLowerCase()) return { missing: ['board'] };
        // Tracing is visual: the spoken instruction and the word are helpful, not required.
        var wordAudio = env.wordClip(word);
        var prompt = env.bankClip('instructions', 'inst_letter_tracing');
        var intro = [];
        if (prompt) intro.push(prompt);
        if (wordAudio) intro.push(wordAudio);
        return { item: { target: letter.toLowerCase(), letter: letter, wordAudio: wordAudio, promptAudio: prompt,
          introAudio: intro, answerAudio: wordAudio ? [wordAudio] : [] } };
      },
      render: function (item, ctx) {
        var L = ctx.L;
        var doc = ctx.root.ownerDocument;
        var size = 280;
        var wrap = ctx.el('div', { style: 'position:relative;width:' + size + 'px;height:' + size + 'px;max-width:100%;margin:12px auto;border:2px dashed var(--muted);border-radius:16px;touch-action:none' });
        var guide = doc.createElement('canvas');
        var pen = doc.createElement('canvas');
        [guide, pen].forEach(function (c) {
          c.width = size; c.height = size;
          c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;touch-action:none';
          wrap.appendChild(c);
        });
        pen.setAttribute('role', 'img');
        pen.setAttribute('aria-label', ctx.fmt(L.letter_tracing_canvas, { letter: item.letter }));
        var font = 'bold ' + Math.round(size * 0.78) + 'px system-ui, sans-serif';
        var paint = function (g, color) {
          g.clearRect(0, 0, size, size);
          g.fillStyle = color; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(item.letter, size / 2, size * 0.54);
        };
        var gg = guide.getContext ? guide.getContext('2d') : null;
        var pg = pen.getContext ? pen.getContext('2d') : null;
        if (gg) paint(gg, 'rgba(100,116,139,0.35)');
        var drawing = false, last = null;
        var at = function (e) {
          var r = pen.getBoundingClientRect();
          return { x: (e.clientX - r.left) * size / (r.width || size), y: (e.clientY - r.top) * size / (r.height || size) };
        };
        var line = function (a, b) {
          if (!pg) return;
          pg.strokeStyle = '#1d4ed8'; pg.lineWidth = size * 0.08; pg.lineCap = 'round'; pg.lineJoin = 'round';
          pg.beginPath(); pg.moveTo(a.x, a.y); pg.lineTo(b.x, b.y); pg.stroke();
        };
        pen.addEventListener('pointerdown', function (e) {
          if (ctx.isDone()) return;
          drawing = true; last = at(e); line(last, last);
          try { pen.setPointerCapture(e.pointerId); } catch (_) {}
          e.preventDefault();
        });
        pen.addEventListener('pointermove', function (e) {
          if (!drawing) return;
          var p = at(e); line(last, p); last = p; e.preventDefault();
        });
        var stop = function () { drawing = false; last = null; };
        pen.addEventListener('pointerup', stop);
        pen.addEventListener('pointercancel', stop);
        // How much of the letter the strokes cover, and how much ink lands well away from it
        // (scribbling over the whole box is not tracing). Every 4th pixel is enough.
        var measure = function () {
          if (!gg || !pg) return { cover: 1, stray: 0 };
          var mask = doc.createElement('canvas'); mask.width = size; mask.height = size;
          var mg = mask.getContext('2d'); paint(mg, '#000');
          var halo = doc.createElement('canvas'); halo.width = size; halo.height = size;
          var hg = halo.getContext('2d'); paint(hg, '#000');
          hg.lineWidth = size * 0.14; hg.lineJoin = 'round'; hg.strokeStyle = '#000'; hg.strokeText(item.letter, size / 2, size * 0.54);
          var m = mg.getImageData(0, 0, size, size).data, hd = hg.getImageData(0, 0, size, size).data, p = pg.getImageData(0, 0, size, size).data;
          var inside = 0, covered = 0, ink = 0, away = 0;
          for (var i = 3; i < m.length; i += 16) {
            if (m[i] > 128) { inside++; if (p[i] > 0) covered++; }
            if (p[i] > 0) { ink++; if (hd[i] <= 128) away++; }
          }
          return { cover: inside ? covered / inside : 0, stray: ink ? away / ink : 0 };
        };
        var note = ctx.el('p', { class: 'letters', 'aria-live': 'polite' });
        var hear = ctx.el('button', { type: 'button', class: 'primary', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio || item.promptAudio); } }, text: ctx.L.hear_word });
        var done = ctx.el('button', { type: 'button', class: 'primary', on: { click: function () {
          if (ctx.isDone()) return;
          var m = measure();
          if (m.stray > 0.5) { note.textContent = L.letter_tracing_stay; return; }
          if (m.cover < 0.45) { note.textContent = L.letter_tracing_more; return; }
          note.textContent = '';
          ctx.practice('traced', L.letter_tracing_traced);
        } }, text: L.letter_tracing_done });
        var clear = ctx.el('button', { type: 'button', on: { click: function () { if (ctx.isDone()) return; if (pg) pg.clearRect(0, 0, size, size); note.textContent = ''; } }, text: L.letter_tracing_clear });
        var skip = ctx.el('button', { type: 'button', on: { click: function () { if (ctx.isDone()) return; ctx.practice('skipped', L.letter_tracing_skipped); } }, text: L.letter_tracing_skip });
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.fmt(L.letter_tracing_question, { letter: item.letter }) }));
        if (item.wordAudio || item.promptAudio) ctx.root.appendChild(ctx.el('div', { class: 'row' }, [hear]));
        ctx.root.appendChild(wrap);
        ctx.root.appendChild(note);
        ctx.root.appendChild(ctx.el('div', { class: 'row', style: 'margin-top:12px' }, [done, clear, skip]));
        return {
          reveal: function () { [done, clear, skip].forEach(function (b) { b.setAttribute('aria-disabled', 'true'); }); },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["manipulation"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Sound Swap (manipulation).
    // Only a checked task plays: WS_CORE.resolveManipulationTask + manipulationReady
    // (word_sounds_core.js:1145-1160; the player skips any other word,
    // word_sounds_module.js:7401, 8713-8723, 3346). Choices are the task's answer
    // and its curated distractors (word_sounds_module.js:8717-8718; the setup board
    // holds the same set, word_sounds_setup_source.jsx:4643). The instruction is
    // spoken in parts, /x/ tokens from the phoneme bank
    // (speakInstructionWithPhonemes, word_sounds_module.js:9748-9765; setup packs
    // the text parts, word_sounds_setup_source.jsx:5384-5389,5413). Graded at
    // word_sounds_module.js:20150-20155: choice.toLowerCase() ===
    // task.answer.toLowerCase(), then checkAnswer("correct"|"incorrect","correct"),
    // 2 tries.
    module.exports = {
      id: 'manipulation',
      title: 'Sound Swap',
      labels: {
        manipulation_prompt: 'Swap the sound to make a new word!',
        manipulation_type_deletion: 'Phoneme Deletion',
        manipulation_type_substitution: 'Phoneme Substitution',
        manipulation_hear_instruction: 'Hear the instruction',
        manipulation_option_n: 'Option {n}',
        manipulation_listen: 'Listen',
        manipulation_listen_option: 'Listen to option {n}',
        manipulation_listen_word: 'Listen to {word}',
        manipulation_choose_option: 'Choose option {n}',
        manipulation_choose_word: 'Choose {word}',
        manipulation_correct: 'Yes! That is the new word.',
        manipulation_missed: 'The new word is {word}. Listen.',
        manipulation_missed_no_letters: 'Here is the new word. Listen.',
        manipulation_answer_mark: '(the answer)',
      },
      prepare: function (w, env) {
        var core = env.core;
        var board = w && w.activityItems && w.activityItems.manipulation;
        var supplied = (w && w.manipulationTask) || (board && board.task) || null;
        var task = core.resolveManipulationTask(env.word, supplied, 'en');
        if (!env.isEnglish || !core.manipulationReady(task) || !task.answer) return { missing: ['sound_swap_not_checked'] };
        var answer = String(task.answer);
        var live = [answer].concat(task.distractors || []).filter(function (v, i, all) { return v && all.indexOf(v) === i; });
        // Keep the prepared board's order when it is the same set (the player
        // reshuffles at run time; a file needs one fixed order).
        var boardOptions = board && Array.isArray(board.options) ? board.options : [];
        var sameSet = boardOptions.length === live.length && live.every(function (v) { return boardOptions.indexOf(v) >= 0; });
        var options = sameSet ? boardOptions.slice() : live;
        if (!sameSet) {
          var seed = 0;
          for (var s = 0; s < answer.length; s++) seed = (seed * 31 + answer.charCodeAt(s)) >>> 0;
          for (var i = options.length - 1; i > 0; i--) { seed = (seed * 1103515245 + 12345) >>> 0; var j = seed % (i + 1); var t = options[i]; options[i] = options[j]; options[j] = t; }
        }
        var missing = [];
        var wordAudio = env.wordClip(env.word);
        if (!wordAudio) missing.push('word');
        var parts = String(task.instruction || '').split(/(\/[^\s/]{1,4}\/)/g)
          .map(function (p) { return p.trim(); })
          .filter(function (p) { return p && /[a-z0-9]/i.test(p); });
        var instruction = parts.map(function (part) {
          if (/^\/[^/]+\/$/.test(part)) {
            var label = env.label(part.slice(1, -1));
            var sound = label ? env.phonemeClip(label) : null;
            if (!sound) missing.push('/' + (label || part.slice(1, -1)) + '/');
            return sound;
          }
          var clip = env.packClip(part);
          if (!clip && missing.indexOf('question') < 0) missing.push('question');
          return clip;
        });
        if (!instruction.length) missing.push('question');
        var answerAudio = null;
        var choices = options.map(function (text) {
          var clip = env.wordClip(text);
          if (!clip) missing.push('word:' + String(text).trim().toLowerCase());
          if (String(text).toLowerCase() === answer.toLowerCase()) answerAudio = clip;
          return { text: String(text), audio: clip };
        });
        if (missing.length) return { missing: missing };
        return { item: { target: answer, type: task.type === 'deletion' ? 'deletion' : 'substitution', instructionText: String(task.instruction),
          instruction: instruction, wordAudio: wordAudio, choices: choices, answerAudio: [answerAudio] } };
      },
      render: function (item, ctx) {
        var win = ctx.root.ownerDocument.defaultView;
        var cards = [];
        var token = 0;
        var mark = function (index) {
          cards.forEach(function (c, i) { c.box.style.outline = i === index ? '4px solid var(--accent)' : ''; c.box.style.outlineOffset = i === index ? '2px' : ''; });
        };
        var run = function (steps) {
          var mine = ++token;
          var i = 0;
          var step = function () {
            if (mine !== token || !ctx.root.isConnected) return;
            if (i >= steps.length) { mark(-1); return; }
            var s = steps[i++];
            mark(s.hi == null ? -1 : s.hi);
            ctx.play(s.id).then(function () { if (mine === token) win.setTimeout(step, s.gap || 0); });
          };
          step();
        };
        var halt = function () { token++; mark(-1); };
        // 120 ms between instruction parts (word_sounds_module.js:9762).
        var instructionSteps = function (lastGap) {
          return item.instruction.map(function (id, i) { return { id: id, gap: i === item.instruction.length - 1 ? lastGap : 120 }; });
        };
        var list = ctx.el('ul', { class: 'choices' });
        item.choices.forEach(function (choice, i) {
          var n = i + 1;
          var right = choice.text.toLowerCase() === String(item.target).toLowerCase();
          var listen = ctx.el('button', { type: 'button',
            'aria-label': ctx.showLetters ? ctx.fmt(ctx.L.manipulation_listen_word, { word: choice.text }) : ctx.fmt(ctx.L.manipulation_listen_option, { n: n }),
            on: { click: function () { halt(); ctx.support('optionListens'); ctx.play(choice.audio); } } }, ['▶ ', ctx.L.manipulation_listen]);
          var choose = ctx.el('button', { type: 'button', class: 'primary',
            'aria-label': ctx.showLetters ? ctx.fmt(ctx.L.manipulation_choose_word, { word: choice.text }) : ctx.fmt(ctx.L.manipulation_choose_option, { n: n }),
            on: { click: function () {
              if (ctx.isDone() || choose.getAttribute('aria-disabled') === 'true') return;
              halt();
              var outcome = ctx.answer(choice.text, right, {
                correctText: ctx.L.manipulation_correct,
                missedText: ctx.showLetters ? ctx.fmt(ctx.L.manipulation_missed, { word: item.target }) : ctx.L.manipulation_missed_no_letters,
              });
              if (outcome !== 'correct') { box.classList.add('tried'); choose.setAttribute('aria-disabled', 'true'); }
            } } }, [ctx.showLetters ? ctx.el('span', { class: 'letters', text: choice.text }) : ctx.fmt(ctx.L.manipulation_option_n, { n: n })]);
          var box = ctx.el('li', { class: 'choice' }, [choose, listen]);
          cards.push({ box: box, choose: choose, right: right });
          list.appendChild(box);
        });
        ctx.root.appendChild(ctx.el('p', { text: ctx.L.manipulation_prompt }));
        // The app prints the task card (type + instruction) for every learner.
        ctx.root.appendChild(ctx.el('p', { class: 'muted', text: item.type === 'deletion' ? ctx.L.manipulation_type_deletion : ctx.L.manipulation_type_substitution }));
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: item.instructionText }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); run(instructionSteps(0)); } }, text: ctx.L.manipulation_hear_instruction }),
          ctx.el('button', { type: 'button', on: { click: function () { halt(); ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: ctx.L.hear_word }),
        ]));
        ctx.root.appendChild(list);
        // Opening sequence (word_sounds_module.js:16890-16937): the instruction,
        // 400 ms, then every choice in turn with 350 ms between.
        if (!ctx.isDone()) {
          run(instructionSteps(400).concat(item.choices.map(function (c, i) { return { id: c.audio, gap: 350, hi: i }; })));
        }
        return {
          reveal: function () {
            halt();
            cards.forEach(function (c) {
              c.choose.setAttribute('aria-disabled', 'true');
              if (c.right && !c.box.classList.contains('right')) {
                c.box.classList.add('right');
                c.choose.setAttribute('aria-label', c.choose.getAttribute('aria-label') + ' ' + ctx.L.manipulation_answer_mark);
              }
            });
          },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["mapping"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Sound Mapping (mapping).
    // App source of truth:
    //   board   compileActivityItems (word_sounds_setup_source.jsx:4678-4683, 4807-4809):
    //           { graphemes: one spelling per sound, joined = the word, chipOrder: shuffled
    //           [{ id, text }], chipSpans?: boxes each chip covers } or { supported: false,
    //           contentStatus: 'teacher_review_required' }.
    //   data    soundMappingBoard (word_sounds_module.js): no board when
    //           unsupported/review-required; else the first of board.graphemes,
    //           item.graphemes, phoneme .grapheme fields, the word's letters whose join
    //           is the word and that fit the sounds: one box per sound, a chip covering
    //           chipSpans[i] boxes (2 for qu, x, the u of cute, le; no chipSpans = 1 each).
    //   view    SoundMappingView (word_sounds_module.js:5030-5170): the word stays printed
    //           (SMART_TEXT_VISIBILITY mapping 'alwaysOn', :7563), one slot per spelling,
    //           a chip tray, tapping a chip fills the first empty slot and plays it,
    //           tapping a filled slot empties it, "Listen to Word".
    //   grading :5062-5066: as soon as the LAST slot fills, every slot's text must equal
    //           graphemes[i] (plain string compare); onCheckAnswer -> checkAnswer(ans,
    //           "correct") (:19681). Default budget 2 tries (:17130); a first miss stays
    //           on the board, editable.
    //   audio   instruction clip "mapping" (INST_KEY_MAP :16458); the word on request.
    module.exports = {
      id: 'mapping',
      title: 'Sound Mapping',
      labels: {
        mapping_question: 'Put the spellings in order to build the word.',
        mapping_how: 'Tap a spelling to pick it up, then tap a slot to put it there. Tap a filled slot to take it out.',
        mapping_word: 'The word: {word}',
        mapping_tray: 'Spellings to place',
        mapping_slots: 'Spelling slots',
        mapping_slot_empty: 'Slot {n}, empty',
        mapping_slot_filled: 'Slot {n}: {spelling}',
        mapping_pick: 'Pick up {spelling}',
        mapping_listen: 'Listen to the sound of {spelling}',
        mapping_picked: '{spelling} picked up. Now choose a slot.',
        mapping_dropped: '{spelling} put back.',
        mapping_placed: '{spelling} is in slot {n}.',
        mapping_removed: '{spelling} taken out of slot {n}.',
        mapping_cleared: 'All the slots are empty again.',
        mapping_clear: 'Empty the slots',
        mapping_auto: 'Your answer is checked when every slot is full.',
        mapping_retry: 'Not quite. Take out a spelling and move it, then try once more.',
        mapping_correct: 'Yes! You spelled every sound.',
        mapping_missed: 'This is how the sounds are spelled: {spellings}. Listen.',
        mapping_two_sounds: '{spelling} spells two sounds.',
        mapping_listen_two: 'Listen to the two sounds of {spelling}',
        mapping_slot_filled_two: 'Slots {n} and {m}: {spelling}, two sounds',
        mapping_needs_two: '{spelling} spells two sounds. Choose a slot with another slot after it.',
      },
      prepare: function (w, env) {
        var board = w && w.activityItems && w.activityItems.mapping;
        if (!board) return { missing: ['board'] };
        if (board.supported === false || board.unavailable || /review_required|needs_review/.test(board.contentStatus || '')) return { missing: ['board'] };
        var phonemes = Array.isArray(w.phonemes) ? w.phonemes : [];
        var spelling = String(env.word || '').trim().normalize('NFC').toLowerCase();
        // WS_CORE.mappingChipSpans: one box per sound; chip i covers spans[i] boxes.
        var fit = function (values, spans) {
          if (spans == null) return values.length === phonemes.length ? values.map(function () { return 1; }) : null;
          if (!Array.isArray(spans) || spans.length !== values.length || !spans.every(function (k) { return k === 1 || k === 2; })) return null;
          return spans.reduce(function (sum, k) { return sum + k; }, 0) === phonemes.length ? spans.slice() : null;
        };
        var found = [[board.graphemes, board.chipSpans], [w.graphemes, w.chipSpans], [phonemes.map(function (p) { return p && typeof p === 'object' ? p.grapheme : ''; }), null], [spelling.split(''), null]]
          .map(function (pair) {
            var values = pair[0];
            return [values, Array.isArray(values) && values.length > 0 && phonemes.length > 0 &&
              values.every(function (v) { return typeof v === 'string' && v.trim(); }) &&
              values.join('').trim().normalize('NFC').toLowerCase() === spelling ? fit(values, pair[1]) : null];
          })
          .filter(function (pair) { return pair[1]; })[0];
        if (!found) return { missing: ['board'] };
        var graphemes = found[0].map(String), spans = found[1];
        var starts = [];
        spans.reduce(function (at, k) { starts.push(at); return at + k; }, 0);
        // Tray order: the prepared chipOrder when it is a true shuffle of these
        // spellings. (The view reshuffles randomly; a file needs a fixed order.)
        var order = Array.isArray(board.chipOrder) && board.chipOrder.length === graphemes.length &&
          board.chipOrder.every(function (c) { return c && Number.isInteger(c.id) && graphemes[c.id] === String(c.text); }) &&
          board.chipOrder.map(function (c) { return c.id; }).filter(function (id, i, all) { return all.indexOf(id) === i; }).length === graphemes.length
          ? board.chipOrder.map(function (c) { return c.id; }) : graphemes.map(function (_, i) { return i; }).reverse();
        var inOrder = order.every(function (id, i) { return graphemes[id] === graphemes[i]; });
        if (inOrder && graphemes.length > 1) { var t = order[0]; order[0] = order[1]; order[1] = t; }
        var missing = [];
        var wordAudio = env.wordClip(env.word);
        if (!wordAudio) missing.push('word');
        var prompt = env.bankClip('instructions', 'mapping');
        if (!prompt) missing.push('question');
        // Each chip plays its sound: the word's own sound at that position. A
        // spanning chip plays its two sounds in order (no clip for the pair).
        var clips = graphemes.map(function (g, i) {
          if (spans[i] > 1) {
            return phonemes.slice(starts[i], starts[i] + spans[i]).map(function (p) {
              var part = env.label(p), partClip = part && env.phonemeClip(part);
              if (!partClip) missing.push('/' + (part || g) + '/');
              return partClip;
            });
          }
          var label = env.label(phonemes[starts[i]]);
          var clip = (label && env.phonemeClip(label)) || env.phonemeClip(g);
          if (!clip) missing.push('/' + (label || g) + '/');
          return clip;
        });
        if (missing.length) return { missing: missing };
        var spanning = spans.some(function (k) { return k > 1; });
        var result = {
          target: graphemes.join(' '), graphemes: graphemes,
          chips: order.map(function (id) { return spans[id] > 1 ? { text: graphemes[id], audio: clips[id][0], audios: clips[id], span: spans[id] } : { text: graphemes[id], audio: clips[id] }; }),
          wordAudio: wordAudio, promptAudio: prompt,
          introAudio: [prompt], answerAudio: [wordAudio],
        };
        if (spanning) result.spans = spans;
        return { item: result };
      },
      render: function (item, ctx) {
        var L = ctx.L;
        // One slot per sound. A spanning chip (item.spans[i] = 2: qu, x, the u of
        // cute, le) covers two slots side by side. No spans = one slot per chip.
        var spanOf = function (ci) { return item.chips[ci].span || 1; };
        var n = (item.spans || item.graphemes.map(function () { return 1; })).reduce(function (sum, k) { return sum + k; }, 0);
        var slots = [];
        for (var s = 0; s < n; s++) slots.push(null);
        var picked = null;
        var locked = function () { return ctx.isDone(); };
        var text = function (ci) { return item.chips[ci].text; };
        var covered = function (si) { return si > 0 && slots[si] != null && slots[si - 1] === slots[si]; };
        var hear = function (ci) { var chip = item.chips[ci]; if (chip.audios) ctx.playAll(chip.audios); else ctx.play(chip.audio); };
        var takeOut = function (ci) { for (var i = 0; i < n; i++) if (slots[i] === ci) slots[i] = null; };

        var tray = ctx.el('ul', { class: 'row', 'aria-label': L.mapping_tray, style: 'list-style:none;padding:0;margin:16px 0;gap:12px' });
        var chipEls = item.chips.map(function (chip, ci) {
          var two = spanOf(ci) > 1;
          var pick = ctx.el('button', { type: 'button', class: 'primary', 'aria-pressed': 'false',
            'aria-label': ctx.fmt(L.mapping_pick, { spelling: chip.text }) + (two ? '. ' + ctx.fmt(L.mapping_two_sounds, { spelling: chip.text }) : ''),
            'data-span': two ? String(spanOf(ci)) : null,
            style: (two ? 'min-width:154px;' : 'min-width:72px;') + 'min-height:56px;font-size:1.5rem;font-weight:700',
            on: { click: function () { onChip(ci); } } }, [chip.text]);
          var listen = ctx.el('button', { type: 'button', 'aria-label': ctx.fmt(two ? L.mapping_listen_two : L.mapping_listen, { spelling: chip.text }),
            on: { click: function () { ctx.support('soundListens'); hear(ci); } } }, ['▶']);
          var li = ctx.el('li', { class: 'row', style: 'gap:6px;border:2px solid var(--line);border-radius:14px;padding:6px' }, [pick, listen]);
          tray.appendChild(li);
          return { li: li, pick: pick };
        });
        var slotList = ctx.el('ol', { class: 'slots', 'aria-label': L.mapping_slots });
        var slotEls = slots.map(function (_, si) {
          var btn = ctx.el('button', { type: 'button', class: 'slot', style: 'min-width:80px;min-height:80px;font-size:1.5rem;font-weight:700',
            on: { click: function () { onSlot(si); } } });
          var li = ctx.el('li', {}, [btn]);
          slotList.appendChild(li);
          return { btn: btn, li: li };
        });
        var clearBtn = ctx.el('button', { type: 'button', on: { click: function () {
          if (locked()) return;
          picked = null;
          for (var i = 0; i < n; i++) slots[i] = null;
          draw(); ctx.announce(L.mapping_cleared);
        } }, text: L.mapping_clear });

        var draw = function () {
          chipEls.forEach(function (c, ci) {
            c.li.hidden = slots.indexOf(ci) >= 0;
            c.pick.setAttribute('aria-pressed', picked === ci ? 'true' : 'false');
            if (locked()) c.pick.setAttribute('aria-disabled', 'true');
          });
          slotEls.forEach(function (el, si) {
            var btn = el.btn, ci = slots[si];
            // The second slot under a spanning chip is drawn by the chip's first slot.
            el.li.hidden = covered(si);
            var two = ci != null && spanOf(ci) > 1;
            btn.textContent = ci == null ? String(si + 1) : text(ci);
            btn.style.minWidth = two ? '170px' : '80px';
            if (two) btn.setAttribute('data-span', String(spanOf(ci))); else btn.removeAttribute('data-span');
            btn.style.borderStyle = ci == null ? 'dashed' : 'solid';
            btn.style.borderColor = ci == null ? 'var(--muted)' : 'var(--accent)';
            btn.setAttribute('aria-label', ci == null ? ctx.fmt(L.mapping_slot_empty, { n: si + 1 })
              : two ? ctx.fmt(L.mapping_slot_filled_two, { n: si + 1, m: si + spanOf(ci), spelling: text(ci) })
              : ctx.fmt(L.mapping_slot_filled, { n: si + 1, spelling: text(ci) }));
            if (locked()) btn.setAttribute('aria-disabled', 'true');
          });
          if (locked()) clearBtn.setAttribute('aria-disabled', 'true');
        };
        var onChip = function (ci) {
          if (locked() || slots.indexOf(ci) >= 0) return;
          if (picked === ci) { picked = null; draw(); ctx.announce(ctx.fmt(L.mapping_dropped, { spelling: text(ci) })); return; }
          picked = ci;
          draw();
          hear(ci);
          ctx.announce(ctx.fmt(L.mapping_picked, { spelling: text(ci) }));
          var empty = slots.indexOf(null);
          slotEls[empty >= 0 ? empty : 0].btn.focus();
        };
        var onSlot = function (si) {
          if (locked()) return;
          if (picked == null) {
            var out = slots[si];
            if (out == null) { ctx.announce(L.mapping_how); return; }
            var first = slots.indexOf(out);
            takeOut(out);
            draw();
            ctx.announce(ctx.fmt(L.mapping_removed, { spelling: text(out), n: first + 1 }));
            return;
          }
          var ci = picked, span = spanOf(ci);
          // A spanning chip cannot start in the last slot.
          if (si + span > n) { ctx.announce(ctx.fmt(L.mapping_needs_two, { spelling: text(ci) })); return; }
          picked = null;
          for (var k = 0; k < span; k++) if (slots[si + k] != null) takeOut(slots[si + k]); // chips already there go back to the tray
          for (var j = 0; j < span; j++) slots[si + j] = ci;
          draw();
          if (slots.indexOf(null) >= 0) {
            hear(ci);
            ctx.announce(ctx.fmt(L.mapping_placed, { spelling: text(ci), n: si + 1 }));
            for (var c = 0; c < chipEls.length; c++) if (slots.indexOf(c) < 0) { chipEls[c].pick.focus(); break; }
            return;
          }
          // The last slot filled: grade the chips in slot order.
          var order = slots.filter(function (c2, i) { return !covered(i); });
          var right = order.length === item.graphemes.length && order.every(function (c2, i) {
            return String(text(c2)) === String(item.graphemes[i]) && spanOf(c2) === ((item.spans && item.spans[i]) || 1);
          });
          ctx.answer(order.map(text).join(' '), right, {
            correctText: L.mapping_correct,
            retryText: L.mapping_retry,
            missedText: ctx.fmt(L.mapping_missed, { spellings: item.graphemes.join(' ') }),
          });
          // A first miss stays on the board to be fixed.
        };

        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: L.mapping_question }));
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.fmt(L.mapping_word, { word: item.word }) }));
        ctx.root.appendChild(ctx.el('p', { class: 'muted', text: L.mapping_how + ' ' + L.mapping_auto }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: L.hear_question }),
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: L.hear_word }),
        ]));
        ctx.root.appendChild(slotList);
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [clearBtn]));
        ctx.root.appendChild(tray);
        draw();
        return {
          reveal: function (correct) {
            picked = null;
            if (!correct) {
              var used = [];
              for (var i = 0; i < n; i++) slots[i] = null;
              for (var g = 0, box = 0; g < item.graphemes.length; g++) {
                var want = (item.spans && item.spans[g]) || 1, hit = -1;
                for (var ci = 0; ci < item.chips.length && hit < 0; ci++) if (used.indexOf(ci) < 0 && item.chips[ci].text === item.graphemes[g] && spanOf(ci) === want) hit = ci;
                used.push(hit);
                for (var k = 0; k < want; k++) slots[box + k] = hit < 0 ? null : hit;
                box += want;
              }
            }
            draw();
            slotEls.forEach(function (el) { el.btn.style.borderColor = 'var(--ok)'; el.btn.style.background = 'var(--ok-bg)'; });
          },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["missing_letter"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Missing Letter (missing_letter).
    // App source of truth (word_sounds_module.js):
    //   board       preparedMissingLetter (~8221): the pack board is used only as a
    //               whole and only when hiddenIndex is inside the displayed word, the
    //               word holds correctLetter there, and the choices offer it exactly
    //               once (all lowercased). Otherwise the app derives its own board;
    //               this export requires the prepared board instead (see report).
    //   view        case "missing_letter" (~20028): the word's letters (uppercase),
    //               the hidden one shown as "?" or the chosen letter; letter buttons
    //               only SELECT; "Check Answer" submits; "Show word" reveals the word.
    //   grading     submitConstructionAnswer (~18887): trimmed, lowercased equality
    //               with correctLetter; the same unchanged answer is not resubmitted.
    //               checkAnswer default budget: 2 presentations (1 retry).
    //   audio       inst_missing_letter bank clip (INST_KEY_MAP ~16446); "Hear the word".
    module.exports = {
      id: 'missing_letter',
      title: 'Missing Letter',
      labels: {
        missing_letter_question: 'Fill in the missing letter.',
        missing_letter_word_sr: 'The word: {letters}.',
        missing_letter_blank: 'missing letter',
        missing_letter_choices: 'Letters to choose from',
        missing_letter_choose: 'Letter {letter}',
        missing_letter_check: 'Check answer',
        missing_letter_pick_first: 'Choose a letter first.',
        missing_letter_show_word: 'Show word',
        missing_letter_hide_word: 'Hide word',
        missing_letter_word_is: 'The word is {word}.',
        missing_letter_correct: 'Yes! The missing letter is {letter}.',
        missing_letter_missed: 'The missing letter is {letter}. Listen to the word.',
      },
      prepare: function (w, env) {
        var board = w.activityItems && w.activityItems.missing_letter;
        var word = String(env.word || '').toLowerCase();
        if (!board) return { missing: ['board'] };
        // Same usability rule as the app's preparedMissingLetter.
        var letter = String(board.correctLetter == null ? '' : board.correctLetter).toLowerCase();
        var choices = Array.isArray(board.options) ? board.options.map(function (o) { return typeof o === 'string' ? o.toLowerCase() : ''; }) : [];
        var usable = Number.isInteger(board.hiddenIndex) && board.hiddenIndex >= 0 && board.hiddenIndex < word.length &&
          !!letter && word[board.hiddenIndex] === letter && choices.length >= 2 && choices.every(Boolean) &&
          choices.filter(function (c, i) { return choices.indexOf(c) === i; }).length === choices.length && choices.indexOf(letter) >= 0;
        if (!usable) return { missing: ['board'] };
        var missing = [];
        var wordAudio = env.wordClip(env.word);
        if (!wordAudio) missing.push('word');
        var prompt = env.bankClip('instructions', 'inst_missing_letter');
        if (!prompt) missing.push('question');
        if (missing.length) return { missing: missing };
        var letters = word.split('');
        letters[board.hiddenIndex] = '';
        return { item: { letters: letters, hiddenIndex: board.hiddenIndex, options: choices, target: letter,
          wordAudio: wordAudio, promptAudio: prompt, introAudio: [prompt, wordAudio], answerAudio: [wordAudio] } };
      },
      render: function (item, ctx) {
        var selected = '';
        var shownOnce = false;
        var wordText = item.letters.map(function (l, i) { return i === item.hiddenIndex ? item.target : l; }).join('');
        var slots = item.letters.map(function (l, i) {
          return ctx.el('li', { class: 'slot', style: i === item.hiddenIndex ? 'border-style:dashed;border-color:var(--accent)' : 'border-style:solid' },
            [i === item.hiddenIndex ? '?' : l.toUpperCase()]);
        });
        var srWord = ctx.el('p', { class: 'sr' });
        var updateWord = function (letter) {
          slots[item.hiddenIndex].textContent = letter ? letter.toUpperCase() : '?';
          srWord.textContent = ctx.fmt(ctx.L.missing_letter_word_sr, { letters: item.letters.map(function (l, i) {
            return i === item.hiddenIndex ? (letter ? letter.toUpperCase() : ctx.L.missing_letter_blank) : l.toUpperCase();
          }).join(', ') });
        };
        var shownWord = ctx.el('p', { class: 'letters', hidden: true, text: ctx.fmt(ctx.L.missing_letter_word_is, { word: wordText }) });
        var showButton = ctx.el('button', { type: 'button', 'aria-pressed': 'false', on: { click: function () {
          if (ctx.isDone()) return;
          var on = shownWord.hidden;
          shownWord.hidden = !on;
          showButton.setAttribute('aria-pressed', on ? 'true' : 'false');
          showButton.textContent = on ? ctx.L.missing_letter_hide_word : ctx.L.missing_letter_show_word;
          // The app records this support once per item.
          if (on && !shownOnce) { shownOnce = true; ctx.support('wordShown'); }
        } }, text: ctx.L.missing_letter_show_word });
        var cards = [];
        var check = ctx.el('button', { type: 'button', class: 'primary', 'aria-disabled': 'true', on: { click: function () {
          if (ctx.isDone() || check.getAttribute('aria-disabled') === 'true') { if (!ctx.isDone() && !selected) ctx.announce(ctx.L.missing_letter_pick_first); return; }
          var answer = selected;
          var outcome = ctx.answer(answer, answer.trim().toLowerCase() === item.target, {
            correctText: ctx.fmt(ctx.L.missing_letter_correct, { letter: item.target.toUpperCase() }),
            missedText: ctx.fmt(ctx.L.missing_letter_missed, { letter: item.target.toUpperCase() }),
          });
          // A retry starts from an empty slot; choosing again counts as a new answer,
          // as an edit does in the app.
          if (outcome === 'retry') select('');
        } }, text: ctx.L.missing_letter_check });
        var select = function (letter) {
          selected = letter;
          cards.forEach(function (c) { c.button.setAttribute('aria-pressed', c.letter === letter ? 'true' : 'false'); });
          check.setAttribute('aria-disabled', letter ? 'false' : 'true');
          updateWord(letter);
        };
        var list = ctx.el('ul', { class: 'row', 'aria-label': ctx.L.missing_letter_choices, style: 'list-style:none;padding:0;margin:16px 0' });
        item.options.forEach(function (letter) {
          var button = ctx.el('button', { type: 'button', 'aria-pressed': 'false', 'aria-label': ctx.fmt(ctx.L.missing_letter_choose, { letter: letter.toUpperCase() }),
            style: 'min-width:64px;min-height:64px;font-size:1.4rem;font-weight:700',
            on: { click: function () { if (!ctx.isDone()) select(letter); } } }, [letter.toUpperCase()]);
          var box = ctx.el('li', { class: 'choice solo', style: 'padding:6px' }, [button]);
          cards.push({ box: box, button: button, letter: letter });
          list.appendChild(box);
        });
        updateWord('');
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.missing_letter_question }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: ctx.L.hear_question }),
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: ctx.L.hear_word }),
          showButton,
        ]));
        ctx.root.appendChild(shownWord);
        ctx.root.appendChild(ctx.el('ul', { class: 'slots', 'aria-hidden': 'true' }, slots));
        ctx.root.appendChild(srWord);
        ctx.root.appendChild(list);
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [check]));
        return {
          reveal: function () {
            cards.forEach(function (c) { c.button.setAttribute('aria-disabled', 'true'); if (c.letter === item.target) c.box.classList.add('right'); });
            check.setAttribute('aria-disabled', 'true');
            showButton.setAttribute('aria-disabled', 'true');
            updateWord(item.target);
            shownWord.hidden = false;
          },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["orthography"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Sight & Spell (orthography).
    // App source of truth (word_sounds_module.js):
    //   view        case "orthography" (~19589) renders OrthographyView (~4758): the
    //               learner HEARS the word and SPELLS it in a text box (typing, or
    //               dragging a-z letter tiles; tapping a tile only speaks its name).
    //               The prepared misspelling board (activityItems.orthography.options)
    //               is passed as data.options but the view never shows it.
    //   grading     OrthographyView.handleSubmit: trimmed, lowercased spelling; the same
    //               unchanged answer is not resubmitted; then checkAnswer(ans, word)
    //               (~17060, soundAnswerMatches on lowercased strings = equality for
    //               whole words). Default budget: 2 presentations (1 retry).
    //   audio       inst_spelling_bee bank clip ("listen to the word and spell it") and the word.
    module.exports = {
      id: 'orthography',
      title: 'Sight & Spell',
      labels: {
        orthography_question: 'Listen to the word, then spell it.',
        orthography_input: 'Spell the word',
        orthography_tiles: 'Letters',
        orthography_add: 'Add {letter}',
        orthography_backspace: 'Remove last letter',
        orthography_clear: 'Clear',
        orthography_check: 'Check spelling',
        orthography_empty: 'Type or tap letters to spell the word first.',
        orthography_same: 'Change your spelling, then check it again.',
        orthography_correct: 'Yes! That is how to spell {word}.',
        orthography_missed: 'This is how to spell it: {word}. Listen.',
        orthography_answer: 'The word is spelled: {word}',
      },
      prepare: function (w, env) {
        var word = String(env.word || '').trim();
        if (!word) return { missing: ['word'] };
        var missing = [];
        var wordAudio = env.wordClip(word);
        if (!wordAudio) missing.push('word');
        var prompt = env.bankClip('instructions', 'inst_spelling_bee');
        if (!prompt) missing.push('question');
        if (missing.length) return { missing: missing };
        // The app's tile bank is a-z. A letter of this word outside a-z is added so
        // a learner who can only tap can still spell it (the app relies on typing).
        // A word with no a-z letter at all (another script) would get a tile bank of
        // only its own letters, which spells it out; report it instead.
        if (!/[a-z]/.test(word.toLowerCase())) return { missing: ['letters outside a-z'] };
        var extra = [];
        word.toLowerCase().split('').forEach(function (ch) {
          if (!/[a-z]/.test(ch) && extra.indexOf(ch) < 0 && ch.trim()) extra.push(ch);
        });
        return { item: { target: word.toLowerCase(), extraTiles: extra, wordAudio: wordAudio, promptAudio: prompt,
          introAudio: [prompt, wordAudio], answerAudio: [wordAudio] } };
      },
      render: function (item, ctx) {
        var lastSubmitted = null;
        var inputId = 'ortho-' + String(item.id || 'x').replace(/[^a-z0-9-]/gi, '');
        var input = ctx.el('input', { id: inputId, type: 'text', autocomplete: 'off', autocorrect: 'off', autocapitalize: 'none', spellcheck: 'false',
          maxlength: '40', style: 'font-size:1.6rem;font-weight:700;letter-spacing:.1em;text-transform:lowercase;text-align:center', on: {
            input: function () { lastSubmitted = null; },
            keydown: function (e) {
              if (e.key !== 'Enter' || e.repeat || e.isComposing || e.keyCode === 229) return;
              e.preventDefault();
              submit();
            },
          } });
        var edit = function (value) {
          if (ctx.isDone()) return;
          input.value = value;
          lastSubmitted = null;
        };
        var submit = function () {
          if (ctx.isDone()) return;
          var answer = String(input.value || '').trim().toLowerCase();
          if (!answer) { ctx.announce(ctx.L.orthography_empty); return; }
          // OrthographyView ignores a resubmit of the same unchanged spelling.
          if (answer === lastSubmitted) { ctx.announce(ctx.L.orthography_same); return; }
          lastSubmitted = answer;
          ctx.answer(answer, answer === item.target, {
            correctText: ctx.fmt(ctx.L.orthography_correct, { word: item.target }),
            missedText: ctx.fmt(ctx.L.orthography_missed, { word: item.target }),
          });
          // On a retry the spelling stays in the box to be fixed, as in the app.
        };
        var letters = 'abcdefghijklmnopqrstuvwxyz'.split('').concat(item.extraTiles || []);
        var tiles = letters.map(function (letter) {
          return ctx.el('button', { type: 'button', 'aria-label': ctx.fmt(ctx.L.orthography_add, { letter: letter }),
            style: 'min-width:52px;font-size:1.3rem;font-weight:700;padding:6px 10px',
            on: { click: function () { edit(String(input.value || '') + letter); } } }, [letter]);
        });
        var back = ctx.el('button', { type: 'button', on: { click: function () { edit(String(input.value || '').slice(0, -1)); } }, text: ctx.L.orthography_backspace });
        var clear = ctx.el('button', { type: 'button', on: { click: function () { edit(''); } }, text: ctx.L.orthography_clear });
        var check = ctx.el('button', { type: 'button', class: 'primary', on: { click: submit }, text: ctx.L.orthography_check });
        var answerLine = ctx.el('p', { class: 'letters', hidden: true, text: ctx.fmt(ctx.L.orthography_answer, { word: item.target }) });
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.orthography_question }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: ctx.L.hear_question }),
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: ctx.L.hear_word }),
        ]));
        ctx.root.appendChild(ctx.el('label', { for: inputId, text: ctx.L.orthography_input }));
        ctx.root.appendChild(input);
        ctx.root.appendChild(ctx.el('div', { class: 'row', role: 'group', 'aria-label': ctx.L.orthography_tiles, style: 'margin:16px 0;gap:8px' }, tiles));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [back, clear, check]));
        ctx.root.appendChild(answerLine);
        return {
          reveal: function () {
            input.setAttribute('readonly', '');
            input.setAttribute('aria-readonly', 'true');
            tiles.concat([back, clear, check]).forEach(function (b) { b.setAttribute('aria-disabled', 'true'); });
            answerLine.hidden = false;
          },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["read_passage"] = (function () {
    var module = { exports: {} };
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
              ctx.el('span', { 'aria-hidden': 'true', text: '\u00a0' }), ctx.el('span', { class: 'sr', text: ctx.L.read_passage_blank })]);
            blanks.push({ node: blank, answer: line.answer });
            node = ctx.el('p', { style: 'margin:6px 0;padding:2px 6px;border-radius:8px;white-space:pre-wrap' }, [line.before, blank, line.after]);
          }
          lineNodes.push(node);
          storyBox.appendChild(node);
        });
        var after = ctx.el('div', { class: 'row' });
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.read_passage_prompt }));
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
    return module.exports;
  })();
  ADAPTERS["read_sentence"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Finish the Sentence (read_sentence).
    // App: board { sentence, before, after, options: [word + 3] } built from a
    // gated sentence (word_sounds_setup_source.jsx:4725-4741,4817); the player
    // takes it when the sentence is set and options (>= 2) hold the word
    // (word_sounds_module.js:13083-13118). The blank is located in the authored
    // sentence with WS_CORE.preparedSentenceParts, as the app's printable copy
    // does (wsPresentSentenceParts, word_sounds_module.js:6205-6226,6367-6389).
    // A picture of the word anchors meaning; without one the app prints the word
    // ("Your word:") and the item becomes print matching (20838-20882). Graded at
    // word_sounds_module.js:20848-20855 -> checkAnswer(choice, word): lower-cased,
    // trimmed comparison (17099-17113), 2 tries. Instruction and read-back clips
    // are packed by setup (5414-5422), read-back after a right answer (17301-17337).

    var lib = { key: null, manifest: {}, rows: {} };
    function remember(w, env) {
      if (lib.key !== env.packClip) lib = { key: env.packClip, manifest: {}, rows: {} };
      [w && w._decodingAssets, w && w._aacAssets].forEach(function (bucket) {
        if (bucket && typeof bucket === 'object' && !Array.isArray(bucket)) Object.keys(bucket).forEach(function (k) { lib.manifest[k] = bucket[k]; });
      });
      var key = String((w && (w.targetWord || w.word || w.term)) || '').trim().toLowerCase();
      if (key && w && typeof w.image === 'string' && w.image.indexOf('ref::') !== 0) lib.rows[key] = w.image;
    }
    function pictureFor(text, env) {
      var raw = typeof env.packImage === 'function' ? env.packImage(text) : null;
      if (!raw) { var lc = String(text || '').toLowerCase(); raw = lib.rows[lc] || lib.manifest[lc] || null; }
      if (typeof raw !== 'string' || !raw) return null;
      if (/^https?:/i.test(raw)) return null;
      return env.image(/^data:/i.test(raw) ? raw : 'data:image/png;base64,' + raw);
    }
    // wsPresentSentenceParts (word_sounds_module.js:6205-6226).
    function sentenceParts(core, sentence, board, word) {
      if (board.before != null || board.after != null) {
        var part = core.preparedSentenceParts(sentence, board.before, word, board.after);
        if (part || board.before !== '' || board.after !== '') return part;
      }
      var literal = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var segments = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
        ? new Intl.Segmenter(undefined, { granularity: 'word' }).segment(sentence) : null;
      var result = null;
      var re = new RegExp(literal, 'giu');
      var match;
      while ((match = re.exec(sentence))) {
        var start = match.index, end = start + match[0].length;
        var before = sentence.slice(0, start), after = sentence.slice(end);
        if (segments) {
          var last = segments.containing(end - 1);
          if (segments.containing(start).index !== start || last.index + last.segment.length !== end) continue;
        } else if (/[\p{L}\p{M}\p{N}_'’]$/u.test(before) || /^[\p{L}\p{M}\p{N}_'’]/u.test(after)) continue;
        if (result) return null;
        result = core.preparedSentenceParts(sentence, before, word, after);
      }
      return result;
    }

    module.exports = {
      id: 'read_sentence',
      title: 'Finish the Sentence',
      labels: {
        read_sentence_prompt: 'Read the sentence. Which word finishes it?',
        read_sentence_picture_practice: 'Use the picture to choose a word.',
        read_sentence_matching_practice: 'Match your word to a choice.',
        read_sentence_word_hint: 'Your word:',
        read_sentence_picture_clue: 'Picture clue: {word}',
        read_sentence_blank: 'blank',
        read_sentence_hear_instructions: 'Hear the instructions',
        read_sentence_hear_sentence: 'Hear the sentence',
        read_sentence_choose: 'Choose {word}',
        read_sentence_correct: 'Yes! That word finishes the sentence.',
        read_sentence_missed: 'The word {word} finishes the sentence.',
        read_sentence_answer_mark: '(the answer)',
      },
      prepare: function (w, env) {
        remember(w, env);
        var core = env.core;
        var board = w && w.activityItems && w.activityItems.read_sentence;
        var word = String(env.word);
        var text = board && board.sentence;
        var raw = board && Array.isArray(board.options) ? board.options.map(function (v) { return String(v == null ? '' : v).trim(); }).filter(Boolean) : [];
        if (typeof text !== 'string' || !text.trim() || raw.length < 2) return { missing: ['board'] };
        // One choice per spelling (word_sounds_module.js:6378-6385).
        var distinct = {}, options = [];
        raw.forEach(function (o) { var k = core.packAudioKey(o.normalize('NFC')); if (!distinct[k]) { distinct[k] = o; options.push(o); } });
        var correct = distinct[core.packAudioKey(word.normalize('NFC'))];
        if (options.length < 2 || !correct) return { missing: ['board'] };
        var parts = sentenceParts(core, text, board, word);
        if (!parts) return { missing: ['board'] };
        var prompt = env.packClip('Read the sentence. Which word finishes it?');
        if (!prompt) return { missing: ['question'] };
        var picture = pictureFor(word, env);
        return { item: { target: word, before: parts.before, after: parts.after, answer: parts.answer, options: options,
          picture: picture, prompt: prompt, sentenceAudio: env.packClip(text), introAudio: [prompt], answerAudio: [] } };
      },
      render: function (item, ctx) {
        var norm = function (s) { return String(s == null ? '' : s).toLowerCase().trim(); };
        var picture = ctx.image(item.picture);
        var blank = ctx.el('span', { style: 'display:inline-block;min-width:4.5em;border-bottom:3px dashed var(--muted);text-align:center' }, [
          ctx.el('span', { 'aria-hidden': 'true', text: '\u00a0' }), ctx.el('span', { class: 'sr', text: ctx.L.read_sentence_blank })]);
        var after = ctx.el('div', { class: 'row' });
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.read_sentence_prompt }));
        ctx.root.appendChild(ctx.el('p', { class: 'muted', text: picture ? ctx.L.read_sentence_picture_practice : ctx.L.read_sentence_matching_practice }));
        if (picture) ctx.root.appendChild(ctx.el('img', { class: 'picture', src: picture, alt: ctx.fmt(ctx.L.read_sentence_picture_clue, { word: item.target }) }));
        else ctx.root.appendChild(ctx.el('p', {}, [ctx.L.read_sentence_word_hint + ' ', ctx.el('span', { class: 'letters', lang: 'en', text: item.target.toLowerCase() })]));
        ctx.root.appendChild(ctx.el('p', { class: 'letters', lang: 'en', style: 'font-size:1.8rem;white-space:pre-wrap' }, [item.before, blank, item.after]));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.prompt); } }, text: ctx.L.read_sentence_hear_instructions }),
        ]));
        var cards = [];
        var list = ctx.el('ul', { class: 'choices' });
        item.options.forEach(function (option) {
          var right = norm(option) === norm(item.target);
          var choose = ctx.el('button', { type: 'button', class: 'primary', 'aria-label': ctx.fmt(ctx.L.read_sentence_choose, { word: option }),
            on: { click: function () {
              if (ctx.isDone() || choose.getAttribute('aria-disabled') === 'true') return;
              var outcome = ctx.answer(option, right, { correctText: ctx.L.read_sentence_correct, missedText: ctx.fmt(ctx.L.read_sentence_missed, { word: item.target }) });
              if (outcome !== 'correct') { box.classList.add('tried'); choose.setAttribute('aria-disabled', 'true'); }
            } } }, [ctx.el('span', { class: 'letters', lang: 'en', style: 'text-transform:lowercase', text: option })]);
          var box = ctx.el('li', { class: 'choice' }, [choose]);
          cards.push({ box: box, choose: choose, right: right });
          list.appendChild(box);
        });
        ctx.root.appendChild(list);
        ctx.root.appendChild(after);
        return {
          reveal: function () {
            // The blank fills with the word as written in the sentence.
            blank.textContent = item.answer;
            blank.style.borderBottomStyle = 'solid';
            blank.style.color = 'var(--ok)';
            cards.forEach(function (c) {
              c.choose.setAttribute('aria-disabled', 'true');
              if (c.right && !c.box.classList.contains('right')) {
                c.box.classList.add('right');
                c.choose.setAttribute('aria-label', c.choose.getAttribute('aria-label') + ' ' + ctx.L.read_sentence_answer_mark);
              }
            });
            if (item.sentenceAudio && !after.childNodes.length) {
              after.appendChild(ctx.el('button', { type: 'button', on: { click: function () { ctx.support('sentenceReadBacks'); ctx.play(item.sentenceAudio); } }, text: ctx.L.read_sentence_hear_sentence }));
            }
          },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["rhyming"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Rhyme Time (rhyming).
    // App: board from WS_CORE.buildSessionRhymeBoard (word_sounds_setup_source.jsx:4629,4802);
    // the player re-checks a prepared board through the same builder and plays it
    // only when the pair is supported (word_sounds_module.js:15177-15198); opening
    // sequence inst_rhyming -> word -> each choice (word_sounds_module.js:16736-16754,
    // 16855-16888); graded at word_sounds_module.js:20348-20380: the designated
    // rhymeWord, or any other choice whose spelling rime (>= 2 letters) matches the
    // target's, then checkAnswer("correct"|"incorrect","correct"), 2 tries.

    // Words this export has shown prepare() so far (the app's pool is the whole
    // pack; prepare only sees one word, so later words cannot be consulted).
    var seen = { key: null, words: [] };

    module.exports = {
      id: 'rhyming',
      title: 'Rhyme Time',
      labels: {
        rhyming_prompt: 'Which word rhymes with this one?',
        rhyming_prompt_word: 'Which word rhymes with {word}?',
        rhyming_option_n: 'Option {n}',
        rhyming_listen: 'Listen',
        rhyming_listen_option: 'Listen to option {n}',
        rhyming_listen_word: 'Listen to {word}',
        rhyming_choose_option: 'Choose option {n}',
        rhyming_choose_word: 'Choose {word}',
        rhyming_correct: 'Yes! Those words rhyme.',
        rhyming_missed: '{answer} rhymes with {word}. Listen.',
        rhyming_missed_no_letters: 'Here is the word that rhymes. Listen.',
        rhyming_answer_mark: '(the answer)',
      },
      prepare: function (w, env) {
        if (seen.key !== env.packClip) seen = { key: env.packClip, words: [] };
        seen.words.push(w);
        var core = env.core;
        var board = w && w.activityItems && w.activityItems.rhyming;
        if (!board || !Array.isArray(board.options) || board.options.length < 2 || !board.answer || board.options.indexOf(board.answer) < 0) return { missing: ['board'] };
        var word = String(env.word);
        var checked = core.buildRhymeBoard({ word: word, prepared: board, phonemes: w.phonemes,
          pool: seen.words.concat(core.knownWords || []), isEnglish: env.isEnglish });
        if (!checked || checked.supported === false || !Array.isArray(checked.options) || checked.options.length < 2) return { missing: ['rhyme_review_required'] };
        var tw = word.toLowerCase();
        // The grader reads wordSoundsPhonemes.rhymeWord; setup keeps it equal to
        // the board answer. A pack without it falls back to the board answer.
        var rw = String(w.rhymeWord || checked.answer || '').toLowerCase();
        var rimeOf = function (s) {
          var vowels = 'aeiou';
          var start = s.length;
          for (var i = s.length - 1; i >= 0; i--) {
            if (vowels.indexOf(s[i]) >= 0) { start = i; while (i > 0 && vowels.indexOf(s[i - 1]) >= 0) i--; start = i; break; }
          }
          return s.slice(start);
        };
        var isRhyme = function (opt) {
          var a = String(opt || '').toLowerCase().trim();
          return !!((rw && a === rw) || (a && tw && a !== tw && rimeOf(a).length >= 2 && rimeOf(a) === rimeOf(tw)));
        };
        var missing = [];
        var wordAudio = env.wordClip(word);
        if (!wordAudio) missing.push('word');
        var prompt = env.bankClip('instructions', 'inst_rhyming') || env.packClip('Which word rhymes with');
        if (!prompt) missing.push('question');
        var answerAudio = null;
        var choices = checked.options.map(function (text) {
          text = String(text);
          var clip = env.wordClip(text);
          if (!clip) missing.push('word:' + text.trim().toLowerCase());
          var designated = text.toLowerCase().trim() === rw;
          if (designated) answerAudio = clip;
          return { text: text, audio: clip, ok: isRhyme(text), answer: designated };
        });
        if (!choices.some(function (c) { return c.answer; })) return { missing: ['board'] };
        if (missing.length) return { missing: missing };
        return { item: { target: rw, promptAudio: prompt, wordAudio: wordAudio, choices: choices, answerAudio: [wordAudio, answerAudio] } };
      },
      render: function (item, ctx) {
        var win = ctx.root.ownerDocument.defaultView;
        var cards = [];
        var token = 0;
        var mark = function (index) {
          cards.forEach(function (c, i) { c.box.style.outline = i === index ? '4px solid var(--accent)' : ''; c.box.style.outlineOffset = i === index ? '2px' : ''; });
        };
        var run = function (steps) {
          var mine = ++token;
          var i = 0;
          var step = function () {
            if (mine !== token || !ctx.root.isConnected) return;
            if (i >= steps.length) { mark(-1); return; }
            var s = steps[i++];
            mark(s.hi == null ? -1 : s.hi);
            ctx.play(s.id).then(function () { if (mine === token) win.setTimeout(step, s.gap || 0); });
          };
          step();
        };
        var halt = function () { token++; mark(-1); };
        var answerText = '';
        var list = ctx.el('ul', { class: 'choices' });
        item.choices.forEach(function (choice, i) {
          var n = i + 1;
          if (choice.answer) answerText = choice.text;
          var listen = ctx.el('button', { type: 'button',
            'aria-label': ctx.showLetters ? ctx.fmt(ctx.L.rhyming_listen_word, { word: choice.text }) : ctx.fmt(ctx.L.rhyming_listen_option, { n: n }),
            on: { click: function () { halt(); ctx.support('optionListens'); ctx.play(choice.audio); } } }, ['▶ ', ctx.L.rhyming_listen]);
          var choose = ctx.el('button', { type: 'button', class: 'primary',
            'aria-label': ctx.showLetters ? ctx.fmt(ctx.L.rhyming_choose_word, { word: choice.text }) : ctx.fmt(ctx.L.rhyming_choose_option, { n: n }),
            on: { click: function () {
              if (ctx.isDone() || choose.getAttribute('aria-disabled') === 'true') return;
              halt();
              var outcome = ctx.answer(choice.text, !!choice.ok, {
                correctText: ctx.L.rhyming_correct,
                missedText: ctx.showLetters ? ctx.fmt(ctx.L.rhyming_missed, { answer: answerText, word: item.word }) : ctx.L.rhyming_missed_no_letters,
              });
              if (outcome !== 'correct') { box.classList.add('tried'); choose.setAttribute('aria-disabled', 'true'); }
            } } }, [ctx.showLetters ? ctx.el('span', { class: 'letters', text: choice.text }) : ctx.fmt(ctx.L.rhyming_option_n, { n: n })]);
          var box = ctx.el('li', { class: 'choice' }, [choose, listen]);
          cards.push({ box: box, choose: choose, answer: choice.answer });
          list.appendChild(box);
        });
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.showLetters ? ctx.fmt(ctx.L.rhyming_prompt_word, { word: item.word }) : ctx.L.rhyming_prompt }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); run([{ id: item.promptAudio, gap: 200 }, { id: item.wordAudio }]); } }, text: ctx.L.hear_question }),
          ctx.el('button', { type: 'button', on: { click: function () { halt(); ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: ctx.L.hear_word }),
        ]));
        ctx.root.appendChild(list);
        if (!ctx.isDone()) {
          run([{ id: item.promptAudio, gap: 200 }, { id: item.wordAudio, gap: 200 }].concat(item.choices.map(function (c, i) { return { id: c.audio, gap: 350, hi: i }; })));
        }
        return {
          reveal: function () {
            halt();
            cards.forEach(function (c) {
              c.choose.setAttribute('aria-disabled', 'true');
              if (c.answer && !c.box.classList.contains('right')) {
                c.box.classList.add('right');
                c.choose.setAttribute('aria-label', c.choose.getAttribute('aria-label') + ' ' + ctx.L.rhyming_answer_mark);
              }
            });
          },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["segmentation"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Break it Down (segmentation, Elkonin boxes).
    // App source of truth:
    //   board   compileActivityItems (word_sounds_setup_source.jsx:4603-4610, 4800):
    //           { chips: [{ id, phoneme, type, isDistractor }] (the word's sounds plus
    //           up to 5 distractor sounds, shuffled), slotCount: phonemeCount || phonemes.length }.
    //   view    word_sounds_module.js:19138-19364 ("segmentation"): one box per sound
    //           (boxes = phonemeCount || phonemes.length, :15077-15109), the chip tray,
    //           tap-to-pick + tap-to-place (:18269-18302), "Test Sequence" (:18795),
    //           Check enabled only when every box is filled.
    //   grading word_sounds_module.js:19311-19356: per box, a LOCAL normalizePhoneme
    //           (lowercase/trim + a small vowel/alias map) of the box chip must equal the
    //           same normalisation of the expected phoneme at that index; then
    //           checkAnswer("wrong","right") or ("correct","correct"). Default budget 2
    //           tries (:17130). A miss keeps the boxes and marks the wrong ones (:19349).
    //   audio   inst_segmentation then the word (INST_KEY_MAP :16453, :16847-16854);
    //           each chip plays its sound when picked or placed (:18239, :18294).
    module.exports = {
      id: 'segmentation',
      title: 'Break it Down',
      labels: {
        segmentation_question: 'Break the word into its sounds. Put each sound in a box, in order.',
        segmentation_how: 'Tap a sound to pick it up, then tap a box to put it there. Tap a filled box to take its sound out.',
        segmentation_tray: 'Sounds to place',
        segmentation_boxes: 'Sound boxes',
        segmentation_box_empty: 'Box {n}, empty',
        segmentation_box_filled: 'Box {n}: {sound}',
        segmentation_box_check: 'Box {n}: {sound}, check this one',
        segmentation_pick: 'Pick up {sound}',
        segmentation_picked: '{sound} picked up. Now choose a box.',
        segmentation_dropped: '{sound} put back.',
        segmentation_placed: '{sound} is in box {n}.',
        segmentation_removed: '{sound} taken out of box {n}.',
        segmentation_cleared: 'All the boxes are empty again.',
        segmentation_clear: 'Empty the boxes',
        segmentation_play_boxes: 'Play my sounds',
        segmentation_check: 'Check',
        segmentation_fill_first: 'Put a sound in every box first.',
        segmentation_retry: 'Not quite. Fix the boxes marked to check, then try once more.',
        segmentation_correct: 'Yes! You found every sound.',
        segmentation_missed: 'The sounds are {sounds}. Listen.',
        segmentation_missed_no_letters: 'Here are the sounds, in order. Listen.',
      },
      prepare: function (w, env) {
        var board = w && w.activityItems && w.activityItems.segmentation;
        if (!board || !Array.isArray(board.chips)) return { missing: ['board'] };
        var phonemes = Array.isArray(w.phonemes) ? w.phonemes : [];
        var sounds = phonemes.map(function (p) { return env.label(p); });
        // The app's boxes come from phonemeCount || phonemes.length; its Check does
        // nothing when that differs from the expected phonemes (:19314).
        var boxes = Number(w.phonemeCount) || sounds.length;
        if (!sounds.length || sounds.some(function (s) { return !s; }) || boxes !== sounds.length) return { missing: ['board'] };
        var chips = board.chips.map(function (c) { return env.label(c && c.phoneme); });
        if (chips.length < sounds.length || chips.some(function (c) { return !c; })) return { missing: ['board'] };
        // Same local equivalence the grader uses: every expected sound needs its own chip.
        var MAP = { 'ā': 'ay', 'ē': 'ee', 'ī': 'ie', 'ō': 'oa', 'ū': 'oo', 'ă': 'a', 'ĕ': 'e', 'ĭ': 'i', 'ŏ': 'o', 'ŭ': 'u', oi: 'oy', aw: 'au', ew: 'oo', oe: 'oa' };
        var norm = function (p) { var l = String(p || '').toLowerCase().trim(); return Object.prototype.hasOwnProperty.call(MAP, l) ? MAP[l] : l; };
        var free = chips.map(norm);
        for (var i = 0; i < sounds.length; i++) {
          var at = free.indexOf(norm(sounds[i]));
          if (at < 0) return { missing: ['board'] };
          free[at] = null;
        }
        var missing = [];
        var wordAudio = env.wordClip(env.word);
        if (!wordAudio) missing.push('word');
        var prompt = env.bankClip('instructions', 'inst_segmentation');
        if (!prompt) missing.push('question');
        var clipOf = {};
        chips.concat(sounds).forEach(function (label) {
          if (Object.prototype.hasOwnProperty.call(clipOf, label)) return;
          clipOf[label] = env.phonemeClip(label);
          if (!clipOf[label]) missing.push('/' + label + '/');
        });
        if (missing.length) return { missing: missing };
        return { item: {
          target: sounds.join(' '), sounds: sounds,
          chips: chips.map(function (label) { return { label: label, audio: clipOf[label] }; }),
          wordAudio: wordAudio, promptAudio: prompt,
          introAudio: [prompt, wordAudio],
          answerAudio: [wordAudio].concat(sounds.map(function (s) { return clipOf[s]; })),
        } };
      },
      render: function (item, ctx) {
        var win = ctx.root.ownerDocument.defaultView;
        var L = ctx.L;
        // word_sounds_module.js:19317-19336, copied exactly.
        var MAP = { 'ā': 'ay', 'ē': 'ee', 'ī': 'ie', 'ō': 'oa', 'ū': 'oo', 'ă': 'a', 'ĕ': 'e', 'ĭ': 'i', 'ŏ': 'o', 'ŭ': 'u', oi: 'oy', aw: 'au', ew: 'oo', oe: 'oa' };
        var norm = function (p) { var l = String(p || '').toLowerCase().trim(); return Object.prototype.hasOwnProperty.call(MAP, l) ? MAP[l] : l; };
        var n = item.sounds.length;
        var boxes = [];
        for (var b = 0; b < n; b++) boxes.push(null);
        var picked = null;
        var errors = [];
        var token = 0;
        var name = function (ci) { return ctx.showLetters ? '/' + item.chips[ci].label + '/' : ctx.fmt(L.sound_n, { n: ci + 1 }); };
        var locked = function () { return ctx.isDone(); };
        var halt = function () { token++; };

        var tray = ctx.el('ul', { class: 'row', 'aria-label': L.segmentation_tray, style: 'list-style:none;padding:0;margin:16px 0;gap:12px' });
        var chipEls = item.chips.map(function (chip, ci) {
          var pick = ctx.el('button', { type: 'button', class: 'primary', 'aria-pressed': 'false',
            'aria-label': ctx.fmt(L.segmentation_pick, { sound: name(ci) }),
            style: 'min-width:72px;min-height:56px;font-size:1.3rem;font-weight:700',
            on: { click: function () { onChip(ci); } } }, [name(ci)]);
          var listen = ctx.el('button', { type: 'button', 'aria-label': ctx.fmt(L.listen_sound, { n: ci + 1 }) + (ctx.showLetters ? ' ' + name(ci) : ''),
            on: { click: function () { halt(); ctx.support('soundListens'); ctx.play(chip.audio); } } }, ['▶']);
          var li = ctx.el('li', { class: 'row', style: 'gap:6px;border:2px solid var(--line);border-radius:14px;padding:6px' }, [pick, listen]);
          tray.appendChild(li);
          return { li: li, pick: pick };
        });
        var boxList = ctx.el('ol', { class: 'slots', 'aria-label': L.segmentation_boxes });
        var boxEls = boxes.map(function (_, bi) {
          var btn = ctx.el('button', { type: 'button', class: 'slot', style: 'min-width:80px;min-height:80px;border-style:dashed;font-size:1.3rem;font-weight:700',
            on: { click: function () { onBox(bi); } } });
          boxList.appendChild(ctx.el('li', {}, [btn]));
          return btn;
        });
        var checkBtn = ctx.el('button', { type: 'button', class: 'primary', on: { click: function () { onCheck(); } }, text: L.segmentation_check });
        var clearBtn = ctx.el('button', { type: 'button', on: { click: function () {
          if (locked()) return;
          halt(); picked = null; errors = [];
          for (var i = 0; i < n; i++) boxes[i] = null;
          draw(); ctx.announce(L.segmentation_cleared);
        } }, text: L.segmentation_clear });
        // "Test Sequence" (:18795-18815): each box's sound, 500 ms apart; 600 ms for an empty box.
        var playBoxes = ctx.el('button', { type: 'button', on: { click: function () {
          ctx.support('sequenceReplays');
          var mine = ++token, i = 0;
          var step = function () {
            if (mine !== token || !ctx.root.isConnected || i >= n) return;
            var ci = boxes[i++];
            if (ci == null) { win.setTimeout(step, 600); return; }
            ctx.play(item.chips[ci].audio).then(function () { if (mine === token) win.setTimeout(step, 500); });
          };
          step();
        } }, text: L.segmentation_play_boxes });

        var draw = function () {
          var full = boxes.every(function (x) { return x != null; });
          chipEls.forEach(function (c, ci) {
            c.li.hidden = boxes.indexOf(ci) >= 0;
            c.pick.setAttribute('aria-pressed', picked === ci ? 'true' : 'false');
            if (locked()) c.pick.setAttribute('aria-disabled', 'true');
          });
          boxEls.forEach(function (btn, bi) {
            var ci = boxes[bi];
            btn.textContent = ci == null ? String(bi + 1) : name(ci);
            btn.style.borderStyle = ci == null ? 'dashed' : 'solid';
            var bad = errors.indexOf(bi) >= 0 && ci != null;
            btn.style.borderColor = bad ? 'var(--warn)' : ci == null ? 'var(--muted)' : 'var(--accent)';
            btn.style.background = bad ? 'var(--warn-bg)' : '';
            btn.setAttribute('aria-label', ci == null ? ctx.fmt(L.segmentation_box_empty, { n: bi + 1 })
              : ctx.fmt(bad ? L.segmentation_box_check : L.segmentation_box_filled, { n: bi + 1, sound: name(ci) }));
            if (locked()) btn.setAttribute('aria-disabled', 'true');
          });
          checkBtn.setAttribute('aria-disabled', locked() || !full ? 'true' : 'false');
          if (locked()) clearBtn.setAttribute('aria-disabled', 'true');
        };
        var nextFocus = function () {
          if (boxes.indexOf(null) < 0) return checkBtn;
          for (var ci = 0; ci < chipEls.length; ci++) if (boxes.indexOf(ci) < 0) return chipEls[ci].pick;
          return checkBtn;
        };
        var onChip = function (ci) {
          if (locked() || boxes.indexOf(ci) >= 0) return;
          halt();
          if (picked === ci) { picked = null; draw(); ctx.announce(ctx.fmt(L.segmentation_dropped, { sound: name(ci) })); return; }
          picked = ci;
          draw();
          ctx.play(item.chips[ci].audio);
          ctx.announce(ctx.fmt(L.segmentation_picked, { sound: name(ci) }));
          // Keyboard path: go straight to the first empty box.
          var empty = boxes.indexOf(null);
          boxEls[empty >= 0 ? empty : 0].focus();
        };
        var onBox = function (bi) {
          if (locked()) return;
          halt();
          errors = [];
          if (picked == null) {
            var out = boxes[bi];
            if (out == null) { ctx.announce(L.segmentation_how); return; }
            boxes[bi] = null;
            draw();
            ctx.announce(ctx.fmt(L.segmentation_removed, { sound: name(out), n: bi + 1 }));
            return;
          }
          var ci = picked;
          picked = null;
          boxes[bi] = ci; // a chip already there goes back to the tray
          draw();
          ctx.play(item.chips[ci].audio);
          ctx.announce(ctx.fmt(L.segmentation_placed, { sound: name(ci), n: bi + 1 }));
          nextFocus().focus();
        };
        var onCheck = function () {
          if (locked()) return;
          if (boxes.some(function (x) { return x == null; })) { ctx.announce(L.segmentation_fill_first); return; }
          halt();
          var bad = [];
          boxes.forEach(function (ci, i) { if (norm(item.chips[ci].label) !== norm(item.sounds[i])) bad.push(i); });
          var response = boxes.map(function (ci) { return item.chips[ci].label; }).join(' ');
          var outcome = ctx.answer(response, bad.length === 0, {
            correctText: L.segmentation_correct,
            retryText: L.segmentation_retry,
            missedText: ctx.showLetters ? ctx.fmt(L.segmentation_missed, { sounds: item.sounds.map(function (s) { return '/' + s + '/'; }).join(' ') })
              : L.segmentation_missed_no_letters,
          });
          // A first miss keeps the boxes and marks the wrong ones (:19348-19350).
          if (outcome === 'retry') { errors = bad; draw(); }
        };

        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: L.segmentation_question }));
        ctx.root.appendChild(ctx.el('p', { class: 'muted', text: L.segmentation_how }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { halt(); ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: L.hear_question }),
          ctx.el('button', { type: 'button', on: { click: function () { halt(); ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: L.hear_word }),
        ]));
        ctx.root.appendChild(boxList);
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [playBoxes, clearBtn]));
        ctx.root.appendChild(tray);
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [checkBtn]));
        draw();
        return {
          reveal: function (correct) {
            halt();
            picked = null; errors = [];
            if (!correct) {
              // Show the right sounds in the boxes, using the tray's own chips.
              var used = [];
              for (var i = 0; i < n; i++) {
                var hit = -1;
                for (var ci = 0; ci < item.chips.length && hit < 0; ci++) {
                  if (used.indexOf(ci) < 0 && norm(item.chips[ci].label) === norm(item.sounds[i])) hit = ci;
                }
                used.push(hit);
                boxes[i] = hit;
              }
            }
            draw();
            boxEls.forEach(function (btn) { btn.style.borderColor = 'var(--ok)'; btn.style.background = 'var(--ok-bg)'; });
          },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["sentence_match"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Picture the Sentence (sentence_match).
    // App: board { sentence, sequence: [word], extras: [up to 2 pack words not in
    // the sentence] } (word_sounds_setup_source.jsx:4770-4796,4819); the player
    // takes a prepared board when the sentence is set, sequence >= 1 and
    // sequence + extras >= 2 (word_sounds_module.js:13189-13213), shuffles the
    // tiles once, and shows the tray only when EVERY tile has its picture
    // (21037-21045). Tapping a tile fills the next empty slot, tapping a filled
    // slot empties it (21062-21076); a full tray is graded slot by slot against
    // the sequence, then checkAnswer("correct"|"incorrect","correct"), 2 tries
    // (21046-21061). The instruction is word_sounds.sentence_match_prompt, packed
    // by setup (setup 5437-5443); after a right answer the app reads the sentence
    // back (word_sounds_module.js:17301-17337).

    // Pictures this export has seen so far, by the app's precedence
    // (word_sounds_module.js:8139-8152). prepare() receives one row; the shared
    // manifest rides on the first row, which comes first.
    var lib = { key: null, manifest: {}, rows: {} };
    function remember(w, env) {
      if (lib.key !== env.packClip) lib = { key: env.packClip, manifest: {}, rows: {} };
      [w && w._decodingAssets, w && w._aacAssets].forEach(function (bucket) {
        if (bucket && typeof bucket === 'object' && !Array.isArray(bucket)) Object.keys(bucket).forEach(function (k) { lib.manifest[k] = bucket[k]; });
      });
      var key = String((w && (w.targetWord || w.word || w.term)) || '').trim().toLowerCase();
      if (key && w && typeof w.image === 'string' && w.image.indexOf('ref::') !== 0) lib.rows[key] = w.image;
    }
    function pictureFor(text, env) {
      var raw = typeof env.packImage === 'function' ? env.packImage(text) : null;
      if (!raw) { var lc = String(text || '').toLowerCase(); raw = lib.rows[lc] || lib.manifest[lc] || null; }
      if (typeof raw !== 'string' || !raw) return null;
      if (/^https?:/i.test(raw)) return null;
      return env.image(/^data:/i.test(raw) ? raw : 'data:image/png;base64,' + raw);
    }

    module.exports = {
      id: 'sentence_match',
      title: 'Picture the Sentence',
      labels: {
        sentence_match_prompt: 'Read the sentence. Match the pictures to it.',
        sentence_match_order_hint: 'Place the pictures in the order they appear',
        sentence_match_slot_empty: 'Slot {n}, empty',
        sentence_match_slot_filled: 'Slot {n}: {word}. Tap to take it out.',
        sentence_match_picture_of: 'Picture of {word}',
        sentence_match_hear_instructions: 'Hear the instructions',
        sentence_match_hear_sentence: 'Hear the sentence',
        sentence_match_correct: 'Yes! The pictures match the sentence.',
        sentence_match_missed: 'Here are the pictures that match the sentence.',
      },
      prepare: function (w, env) {
        remember(w, env);
        var board = w && w.activityItems && w.activityItems.sentence_match;
        var lower = function (v) { return String(v || '').toLowerCase(); };
        if (!board || typeof board.sentence !== 'string' || !board.sentence.trim() || !Array.isArray(board.sequence) || board.sequence.length < 1) return { missing: ['board'] };
        var sequence = board.sequence.map(lower);
        var extras = (Array.isArray(board.extras) ? board.extras : []).map(lower);
        var tiles = sequence.concat(extras);
        if (tiles.length < 2 || tiles.some(function (t) { return !t; })) return { missing: ['board'] };
        // One fixed tray order per item (the app shuffles once per board).
        var seed = 0;
        var key = String(env.word) + '|' + board.sentence;
        for (var s = 0; s < key.length; s++) seed = (seed * 31 + key.charCodeAt(s)) >>> 0;
        for (var i = tiles.length - 1; i > 0; i--) { seed = (seed * 1103515245 + 12345) >>> 0; var j = seed % (i + 1); var t = tiles[i]; tiles[i] = tiles[j]; tiles[j] = t; }
        var missing = [];
        var pics = tiles.map(function (t) {
          var id = pictureFor(t, env);
          if (!id) missing.push('picture:' + t);
          return id;
        });
        var prompt = env.packClip('Read the sentence. Match the pictures to it.');
        if (!prompt) missing.push('question');
        if (missing.length) return { missing: missing };
        return { item: { target: sequence.join(' '), sentence: board.sentence, sequence: sequence, prompt: prompt,
          sentenceAudio: env.packClip(board.sentence),
          tiles: tiles.map(function (t, k) { return { text: t, image: pics[k] }; }),
          introAudio: [prompt], answerAudio: [] } };
      },
      render: function (item, ctx) {
        var slots = item.sequence.map(function () { return null; });
        var imageOf = {};
        item.tiles.forEach(function (t) { imageOf[t.text] = ctx.image(t.image); });
        var tileCards = [];
        var slotButtons = [];
        var tray = ctx.el('ul', { class: 'choices' });
        var slotRow = ctx.el('ul', { class: 'slots' });
        var after = ctx.el('div', { class: 'row' });
        var drawSlots = function (right) {
          slotButtons.forEach(function (b, i) {
            var word = slots[i];
            b.textContent = '';
            b.appendChild(ctx.el('span', { 'aria-hidden': 'true', style: 'font-size:1rem;margin-inline-end:6px', text: String(i + 1) }));
            b.appendChild(word ? ctx.el('img', { src: imageOf[word] || '', alt: '', style: 'width:72px;height:72px' }) : ctx.el('span', { 'aria-hidden': 'true', text: '?' }));
            b.setAttribute('aria-label', word ? ctx.fmt(ctx.L.sentence_match_slot_filled, { n: i + 1, word: word }) : ctx.fmt(ctx.L.sentence_match_slot_empty, { n: i + 1 }));
            if (!word || ctx.isDone()) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
            b.style.borderColor = right ? 'var(--ok)' : '';
            b.style.background = right ? 'var(--ok-bg)' : '';
          });
          tileCards.forEach(function (c) {
            var used = slots.indexOf(c.text) >= 0;
            if (used || c.tried || ctx.isDone()) c.pick.setAttribute('aria-disabled', 'true'); else c.pick.removeAttribute('aria-disabled');
            c.pick.style.opacity = used && !right ? '0.3' : '';
          });
        };
        var grade = function () {
          if (slots.some(function (s) { return !s; })) return;
          var ok = slots.every(function (w, i) { return w === item.sequence[i]; });
          var response = slots.join(' ');
          var outcome = ctx.answer(response, ok, { correctText: ctx.L.sentence_match_correct, missedText: ctx.L.sentence_match_missed });
          if (outcome === 'retry') {
            // One-picture boards: that picture is out. The app clears the tray
            // for the retry (word_sounds_module.js:21053-21060).
            if (item.sequence.length === 1) tileCards.forEach(function (c) { if (c.text === slots[0]) { c.tried = true; c.box.classList.add('tried'); } });
            slots = item.sequence.map(function () { return null; });
            drawSlots(false);
          }
        };
        item.tiles.forEach(function (tile) {
          var pick = ctx.el('button', { type: 'button', 'aria-label': ctx.fmt(ctx.L.sentence_match_picture_of, { word: tile.text }),
            style: 'width:100%;display:flex;justify-content:center;background:#fff',
            on: { click: function () {
              if (ctx.isDone() || pick.getAttribute('aria-disabled') === 'true' || slots.indexOf(tile.text) >= 0) return;
              var at = slots.indexOf(null);
              if (at < 0) return;
              slots[at] = tile.text;
              drawSlots(false);
              grade();
            } } }, [ctx.el('img', { class: 'picture', src: imageOf[tile.text] || '', alt: '' })]);
          var box = ctx.el('li', { class: 'choice' }, [pick]);
          tileCards.push({ text: tile.text, pick: pick, box: box, tried: false });
          tray.appendChild(box);
        });
        item.sequence.forEach(function (_, i) {
          var b = ctx.el('button', { type: 'button', class: 'slot', style: 'border-style:dashed;min-width:96px;min-height:96px',
            on: { click: function () {
              if (ctx.isDone() || !slots[i]) return;
              slots[i] = null;
              drawSlots(false);
            } } });
          slotButtons.push(b);
          slotRow.appendChild(ctx.el('li', {}, [b]));
        });
        drawSlots(false);
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.sentence_match_prompt }));
        ctx.root.appendChild(ctx.el('p', { class: 'letters', lang: 'en', style: 'font-size:1.8rem', text: item.sentence }));
        if (item.sequence.length > 1) ctx.root.appendChild(ctx.el('p', { class: 'muted', text: ctx.L.sentence_match_order_hint }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.prompt); } }, text: ctx.L.sentence_match_hear_instructions }),
        ]));
        ctx.root.appendChild(slotRow);
        ctx.root.appendChild(tray);
        ctx.root.appendChild(after);
        return {
          reveal: function () {
            slots = item.sequence.slice();
            drawSlots(true);
            tileCards.forEach(function (c) { if (item.sequence.indexOf(c.text) >= 0) c.box.classList.add('right'); });
            // The app's payoff: hear the finished sentence read back.
            if (item.sentenceAudio && !after.childNodes.length) {
              after.appendChild(ctx.el('button', { type: 'button', on: { click: function () { ctx.support('sentenceReadBacks'); ctx.play(item.sentenceAudio); } }, text: ctx.L.sentence_match_hear_sentence }));
            }
          },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["sound_sort"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Sound Sort (sound_sort).
    // App: board built at setup by WS_CORE.buildSoundSort over the whole pack +
    // WS_CORE.knownWords (word_sounds_setup_source.jsx:4699-4703, kept only for
    // English packs). The player re-checks it with WS_CORE.validSoundBoard and
    // rebuilds it from soundSortMatches when it fails (computeSoundSortItem,
    // word_sounds_module.js:7175-7186); no board = learner skip (7393-7404).
    // Opening sequence: sound_match_start|end (or "Find words that start|end with
    // the sound") -> the target sound -> "as in" -> the word (16648-16705), then
    // every chip in order once the instruction is done (WordFamiliesView,
    // 10176-10240). Grading (WordFamiliesView.handleWordClick, 10247-10277): a
    // member tap marks it found, all members found = correct; a distractor tap is
    // a wrong attempt; find-all budget maxAttempts = max(2, distractors + 1)
    // (20494-20504, checkAnswer 17126-17134).

    // Words this export has shown prepare() so far (the app's pool is the whole
    // pack; prepare sees one word at a time).
    var seen = { key: null, words: [] };

    module.exports = {
      id: 'sound_sort',
      title: 'Sound Sort',
      labels: {
        sound_sort_heading_first: 'Starts with {sound}',
        sound_sort_heading_last: 'Ends with {sound}',
        sound_sort_heading_first_hidden: 'Starts with the sound you hear',
        sound_sort_heading_last_hidden: 'Ends with the sound you hear',
        sound_sort_instruction: 'Tap each word to hear it. Find the ones that match!',
        sound_sort_instruction_letters: 'Find all words that match: {family}',
        sound_sort_found: '{found} of {total} found',
        sound_sort_listen: 'Listen',
        sound_sort_listen_option: 'Listen to option {n}',
        sound_sort_listen_word: 'Listen to {word}',
        sound_sort_choose_option: 'Choose option {n}',
        sound_sort_choose_word: 'Choose {word}',
        sound_sort_option_n: 'Option {n}',
        sound_sort_hear_all: 'Hear all words',
        sound_sort_found_mark: '(found)',
        sound_sort_answer_mark: '(matches)',
        sound_sort_match: 'Yes, that one matches! {found} of {total} found.',
        sound_sort_match_word: 'Yes, {word} matches! {found} of {total} found.',
        sound_sort_no_match: 'That word does not match the sound. Keep looking!',
        sound_sort_no_match_word: '{word} does not match the sound. Keep looking!',
        sound_sort_correct: 'All matched! You found every word.',
        sound_sort_missed: 'The words that match are: {words}. Listen.',
        sound_sort_missed_no_letters: 'Here are the words that match. Listen.',
      },
      prepare: function (w, env) {
        if (seen.key !== env.packClip) seen = { key: env.packClip, words: [] };
        seen.words.push(w);
        // Setup builds Sound Sort only for English packs (setup_source.jsx:4700).
        if (!env.isEnglish) return { missing: ['english_only'] };
        var core = env.core;
        var word = String(env.word).trim().toLowerCase();
        var fullPack = Array.isArray(env.packWords) ? env.packWords : null;
        var pool = (fullPack || seen.words).concat(core.knownWords || []);
        var prepared = w.activityItems && w.activityItems.sound_sort;
        if (!prepared && !fullPack) return { missing: ['board'] };
        var board = null;
        if (core.validSoundBoard(prepared, word, pool)) board = prepared;
        else if (fullPack) {
          // The app's rebuild (computeSoundSortItem): only with the whole pack,
          // or the board could differ from the one the app shows.
          var ai = w.soundSortMatches || null;
          var seed = word.split('').reduce(function (n, c) { return n + c.charCodeAt(0); }, 0);
          board = core.buildSoundSort({ word: word, phonemes: w.phonemes, pool: pool,
            mode: (ai && ai.position) || (seed % 2 === 0 ? 'first' : 'last'),
            matches: (ai && ai.words) || [], distractors: (ai && ai.distractors) || [],
            targetSound: ai && ai.phoneme, teacherEdited: !!(ai && ai.teacherEdited) });
        } else if (prepared && core.validSoundBoard(Object.assign({}, prepared, { teacherEdited: true }), word, pool)) {
          // Pack words later in the list are not visible yet. Accept the setup
          // board when its shape is valid and nothing we CAN check contradicts it
          // (a word not yet seen and not in the edge dictionary is unknown here,
          // and setup only places words whose edge sound it knew).
          var data = {};
          seen.words.forEach(function (p) { var k = String((p && (p.word || p.targetWord || p.term)) || '').trim().toLowerCase(); if (k) data[k] = p; });
          var key = core.soundKey(prepared.targetChar);
          var soundOf = function (x) { return core.edgeSound(x, prepared.mode, (data[x] || {}).phonemes); };
          var own = soundOf(word);
          var agrees = function (x, yes) { var s = soundOf(x); if (s == null) return !data[x]; return (core.soundKey(s) === key) === yes; };
          if (prepared.teacherEdited || (own != null && core.soundKey(own) === key &&
              prepared.options.every(function (x) { return agrees(String(x).trim().toLowerCase(), true); }) &&
              prepared.distractors.every(function (x) { return agrees(String(x).trim().toLowerCase(), false); }))) board = prepared;
        }
        if (!board) return { missing: ['sound_review_required'] };
        var mode = board.mode === 'last' ? 'last' : 'first';
        var sound = env.label(board.targetChar);
        if (!sound) return { missing: ['board'] };
        var missing = [];
        var wordAudio = env.wordClip(env.word);
        if (!wordAudio) missing.push('word');
        var prompt = env.bankClip('instructions', mode === 'first' ? 'sound_match_start' : 'sound_match_end') ||
          env.packClip(mode === 'first' ? 'Find words that start with the sound' : 'Find words that end with the sound');
        if (!prompt) missing.push('question');
        var soundAudio = env.phonemeClip(sound);
        if (!soundAudio) missing.push('/' + sound + '/');
        var asIn = env.bankClip('instructions', 'as_in') || env.packClip('as in');
        if (!asIn) missing.push('as in');
        var chips = [];
        var add = function (text, member) {
          text = String(text == null ? '' : text);
          if (!text.trim() || chips.some(function (c) { return c.text === text; })) return;
          var clip = env.wordClip(text);
          if (!clip) missing.push('word:' + text.trim().toLowerCase());
          chips.push({ text: text, audio: clip, member: member });
        };
        (board.options || []).forEach(function (t) { add(t, true); });
        (board.distractors || []).forEach(function (t) { add(t, false); });
        if (!chips.some(function (c) { return c.member; })) return { missing: ['board'] };
        if (missing.length) return { missing: missing };
        // The app shuffles the chips on every mount; the file keeps one fixed,
        // word-seeded order so a resumed item looks the same.
        var s = 0;
        for (var i = 0; i < word.length; i++) s = (Math.imul(s, 31) + word.charCodeAt(i)) >>> 0;
        for (var j = chips.length - 1; j > 0; j--) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; var k = s % (j + 1); var tmp = chips[j]; chips[j] = chips[k]; chips[k] = tmp; }
        var members = chips.filter(function (c) { return c.member; });
        return { item: {
          mode: mode, sound: sound, chips: chips, wordAudio: wordAudio,
          instruction: [prompt, soundAudio, asIn, wordAudio],
          maxAttempts: Math.max(2, (board.distractors || []).length + 1),
          target: members.map(function (c) { return c.text; }).join(', '),
          answerAudio: members.map(function (c) { return c.audio; }),
        } };
      },
      // Shared find-all board (identical in word_families.js). The label prefix
      // comes from the item id the shell assigns ("<activity>-<n>").
      render: function (item, ctx) {
        var P = String(item.id || '').replace(/-\d+$/, '') + '_';
        var T = function (key, params) { return ctx.fmt(ctx.L[P + key] || '', params); };
        var win = ctx.root.ownerDocument.defaultView;
        var cards = [];
        var found = [];
        var total = item.chips.filter(function (c) { return c.member; }).length;
        var token = 0;
        var mark = function (index) {
          cards.forEach(function (c, i) { c.box.style.outline = i === index ? '4px solid var(--accent)' : ''; c.box.style.outlineOffset = i === index ? '2px' : ''; });
        };
        var run = function (steps) {
          var mine = ++token;
          var i = 0;
          var step = function () {
            if (mine !== token || !ctx.root.isConnected) return;
            if (i >= steps.length) { mark(-1); return; }
            var s = steps[i++];
            mark(s.hi == null ? -1 : s.hi);
            ctx.play(s.id).then(function () { if (mine === token) win.setTimeout(step, s.gap || 0); });
          };
          step();
        };
        var halt = function () { token++; mark(-1); };
        var heading = item.mode === 'rime'
          ? (ctx.showLetters ? T('heading_rime', { rime: '-' + item.rime }) : T('heading_rime_hidden'))
          : (ctx.showLetters ? T('heading_' + item.mode, { sound: '/' + item.sound + '/' }) : T('heading_' + item.mode + '_hidden'));
        var counter = ctx.el('p', { class: 'muted', text: T('found', { found: 0, total: total }) });
        var memberText = item.chips.filter(function (c) { return c.member; }).map(function (c) { return c.text; }).join(', ');
        var list = ctx.el('ul', { class: 'choices' });
        item.chips.forEach(function (chip, i) {
          var n = i + 1;
          var card = { chip: chip, found: false };
          var listen = ctx.el('button', { type: 'button',
            'aria-label': ctx.showLetters ? T('listen_word', { word: chip.text }) : T('listen_option', { n: n }),
            on: { click: function () { halt(); ctx.support('optionListens'); ctx.play(chip.audio); } } }, ['▶ ', T('listen')]);
          var choose = ctx.el('button', { type: 'button', class: 'primary',
            'aria-label': ctx.showLetters ? T('choose_word', { word: chip.text }) : T('choose_option', { n: n }),
            on: { click: function () {
              if (ctx.isDone() || card.found) return;
              halt();
              if (chip.member) {
                card.found = true;
                found.push(chip.text);
                box.classList.add('right');
                choose.setAttribute('aria-disabled', 'true');
                choose.setAttribute('aria-label', choose.getAttribute('aria-label') + ' ' + T('found_mark'));
                counter.textContent = T('found', { found: found.length, total: total });
                if (found.length >= total) {
                  ctx.answer(found.join(', '), true, { correctText: T('correct') });
                } else {
                  ctx.play(chip.audio);
                  ctx.announce(ctx.showLetters ? T('match_word', { word: chip.text, found: found.length, total: total }) : T('match', { found: found.length, total: total }));
                }
                return;
              }
              // A wrong tap costs one attempt; the chip stays on the board, as in
              // the app (tapping it again costs another).
              box.classList.add('tried');
              ctx.answer(chip.text, false, {
                retryText: ctx.showLetters ? T('no_match_word', { word: chip.text }) : T('no_match'),
                missedText: ctx.showLetters ? T('missed', { words: memberText }) : T('missed_no_letters'),
              });
            } } }, [ctx.showLetters ? ctx.el('span', { class: 'letters', text: chip.text }) : T('option_n', { n: n })]);
          var box = ctx.el('li', { class: 'choice' }, [choose, listen]);
          card.box = box; card.choose = choose;
          cards.push(card);
          list.appendChild(box);
        });
        var chipSteps = function (onlyLeft) {
          return item.chips.map(function (c, i) { return { id: c.audio, gap: 350, hi: i, skip: onlyLeft && cards[i].found }; })
            .filter(function (s) { return !s.skip; });
        };
        var instructionSteps = function () { return item.instruction.map(function (id) { return { id: id, gap: 200 }; }); };
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: heading }));
        ctx.root.appendChild(ctx.el('p', { text: ctx.showLetters ? T('instruction_letters', { family: heading }) : T('instruction') }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); run(instructionSteps()); } }, text: ctx.L.hear_question }),
          ctx.el('button', { type: 'button', on: { click: function () { if (ctx.isDone()) return; ctx.support('allWordListens'); run(chipSteps(true)); } }, text: T('hear_all') }),
        ]));
        ctx.root.appendChild(counter);
        ctx.root.appendChild(list);
        if (!ctx.isDone()) run(instructionSteps().concat(chipSteps(false)));
        return {
          reveal: function () {
            halt();
            cards.forEach(function (c) {
              c.choose.setAttribute('aria-disabled', 'true');
              if (c.chip.member && !c.found && !c.box.classList.contains('right')) {
                c.box.classList.add('right');
                c.choose.setAttribute('aria-label', c.choose.getAttribute('aria-label') + ' ' + T('answer_mark'));
              }
            });
          },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["spelling_bee"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Spelling Bee (spelling_bee).
    // App source of truth:
    //   board   compileActivityItems (word_sounds_setup_source.jsx:4810): { answer: word }.
    //   view    case "spelling_bee" (word_sounds_module.js:19690-19873): "Hear the word",
    //           "Slow" (playbackRate 0.5, playSpellingWord :18817), one box per letter
    //           showing what was typed, a text box (maxLength = word length), Check
    //           Spelling, "First letter hint" and "Show Vowels" / "Show More" hints that
    //           edit the answer and are recorded as supports (recordSpellingSupport
    //           :18870). The word is never printed (SMART_TEXT_VISIBILITY 'hidden', :7567).
    //           After a try, each box is marked right/wrong and "{count}/{total} letters
    //           correct" shows (:19691-19704, :19788-19794).
    //   grading submitConstructionAnswer (:18887-18902): trimmed, lowercased typed
    //           spelling === trimmed, lowercased word; the same unchanged spelling is not
    //           graded twice; checkAnswer("correct"|"incorrect","correct"). Default budget
    //           2 tries (:17130). A first miss keeps the spelling to fix.
    //   audio   inst_spelling_bee then the word (INST_KEY_MAP :16448, :16989-16995).
    module.exports = {
      id: 'spelling_bee',
      title: 'Spelling Bee',
      labels: {
        spelling_bee_question: 'Listen to the word, then type it.',
        spelling_bee_input: 'Type the word',
        spelling_bee_slow: 'Hear it slowly',
        spelling_bee_check: 'Check Spelling',
        spelling_bee_first_letter: 'First letter hint',
        spelling_bee_hint_vowels: 'Show Vowels',
        spelling_bee_hint_more: 'Show More',
        spelling_bee_letters_correct: '{count}/{total} letters correct',
        spelling_bee_empty: 'Type the word first.',
        spelling_bee_same: 'Change your spelling, then check it again.',
        spelling_bee_hint_used: 'Hint used. Your spelling is now {answer}.',
        spelling_bee_correct: 'Yes! That is how to spell {word}.',
        spelling_bee_missed: 'This is how to spell it: {word}. Listen.',
        spelling_bee_answer: 'The word is spelled: {word}',
        spelling_bee_letter_keys: 'Letter keys',
        spelling_bee_delete: 'Delete the last letter',
      },
      prepare: function (w, env) {
        var word = String(env.word || '').trim();
        if (!word) return { missing: ['word'] };
        var missing = [];
        var wordAudio = env.wordClip(word);
        if (!wordAudio) missing.push('word');
        var prompt = env.bankClip('instructions', 'inst_spelling_bee');
        if (!prompt) missing.push('question');
        if (missing.length) return { missing: missing };
        return { item: { target: word.toLowerCase(), wordAudio: wordAudio, promptAudio: prompt,
          introAudio: [prompt, wordAudio], answerAudio: [wordAudio] } };
      },
      render: function (item, ctx) {
        var L = ctx.L;
        var win = ctx.root.ownerDocument.defaultView;
        var word = String(item.target);
        var lastSubmitted = null;
        var inputId = 'bee-' + String(item.id || 'x').replace(/[^a-z0-9-]/gi, '');
        var input = ctx.el('input', { id: inputId, type: 'text', autocomplete: 'off', autocorrect: 'off', autocapitalize: 'none', spellcheck: 'false',
          inputmode: 'text', maxlength: String(word.length || 20),
          style: 'font-size:1.6rem;font-weight:700;letter-spacing:.1em;text-align:center', on: {
            input: function () { lastSubmitted = null; draw(); },
            keydown: function (e) {
              if (e.key !== 'Enter' || e.repeat || e.isComposing || e.keyCode === 229) return;
              e.preventDefault();
              submit();
            },
          } });
        var value = function () { return String(input.value || ''); };
        // One box per letter (aria-hidden: the count line below carries the result).
        var boxes = word.split('').map(function () {
          return ctx.el('span', { class: 'slot', style: 'min-width:48px;min-height:56px;text-transform:uppercase' });
        });
        var boxRow = ctx.el('div', { class: 'slots', 'aria-hidden': 'true' }, boxes);
        var countLine = ctx.el('p', { hidden: true });
        var draw = function () {
          var typed = value();
          var shown = ctx.attempts() > 0;
          var right = 0;
          boxes.forEach(function (box, i) {
            var ch = typed[i] || '';
            var ok = shown && ch && ch.toLowerCase() === word[i];
            if (ok) right++;
            box.textContent = ch ? ch.toUpperCase() : '_';
            box.style.borderStyle = ch ? 'solid' : 'dashed';
            box.style.borderColor = shown && ch ? (ok ? 'var(--ok)' : 'var(--warn)') : 'var(--muted)';
            box.style.background = shown && ch ? (ok ? 'var(--ok-bg)' : 'var(--warn-bg)') : '';
          });
          countLine.hidden = !(shown && typed);
          countLine.textContent = ctx.fmt(L.spelling_bee_letters_correct, { count: right, total: word.length });
          moreBtn.textContent = typed.indexOf('_') >= 0 ? L.spelling_bee_hint_more : L.spelling_bee_hint_vowels;
        };
        var edit = function (next, clue) {
          if (ctx.isDone()) return;
          if (!next || next === value()) return;
          ctx.support(clue);
          input.value = next;
          lastSubmitted = null;
          draw();
          ctx.announce(ctx.fmt(L.spelling_bee_hint_used, { answer: next.toUpperCase().split('').join(' ') }));
        };
        var submit = function () {
          if (ctx.isDone()) return;
          var answer = value().trim().toLowerCase();
          if (!answer) { ctx.announce(L.spelling_bee_empty); return; }
          if (answer === lastSubmitted) { ctx.announce(L.spelling_bee_same); return; }
          lastSubmitted = answer;
          ctx.answer(answer, answer === word.trim().toLowerCase(), {
            correctText: ctx.fmt(L.spelling_bee_correct, { word: word }),
            missedText: ctx.fmt(L.spelling_bee_missed, { word: word }),
          });
          // A first miss keeps the spelling; the boxes now mark each letter.
          draw();
        };
        // "Slow" plays the same recording at half speed, as playSpellingWord(0.5) does.
        var playSlow = function () { ctx.play(item.wordAudio, 0.5); };
        var firstBtn = ctx.el('button', { type: 'button', on: { click: function () {
          edit((word[0] || '') + value().slice(1), 'spelling_first_letter');
        } }, text: L.spelling_bee_first_letter });
        // "Show Vowels", then "Show More" one letter at a time (:19846-19863).
        var moreBtn = ctx.el('button', { type: 'button', on: { click: function () {
          var current = value().toLowerCase();
          var letters = word.split('');
          var isVowel = function (ch) { return 'aeiou'.indexOf(ch.toLowerCase()) >= 0; };
          var vowelsShown = letters.every(function (ch, i) { return !isVowel(ch) || current[i] === ch.toLowerCase(); });
          var filled = letters.map(function (ch, i) { return isVowel(ch) || current[i] === ch.toLowerCase() ? ch : '_'; });
          if (vowelsShown) { var nextBlank = filled.indexOf('_'); if (nextBlank >= 0) filled[nextBlank] = letters[nextBlank]; }
          edit(filled.join(''), vowelsShown ? 'spelling_more_letters' : 'spelling_vowels');
        } }, text: L.spelling_bee_hint_vowels });
        var checkBtn = ctx.el('button', { type: 'button', class: 'primary', on: { click: submit }, text: L.spelling_bee_check });
        var answerLine = ctx.el('p', { class: 'letters', hidden: true, text: ctx.fmt(L.spelling_bee_answer, { word: word }) });
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: L.spelling_bee_question }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: L.hear_question }),
          ctx.el('button', { type: 'button', class: 'primary', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: L.hear_word }),
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('slowReplays'); playSlow(); } }, text: L.spelling_bee_slow }),
        ]));
        ctx.root.appendChild(boxRow);
        ctx.root.appendChild(countLine);
        ctx.root.appendChild(ctx.el('label', { for: inputId, text: L.spelling_bee_input }));
        ctx.root.appendChild(input);
        // On-screen letters for students without a keyboard (2026-11-07 parity audit). Typing still works.
        var letterKeys = 'abcdefghijklmnopqrstuvwxyz'.split('').map(function (ch) {
          return ctx.el('button', { type: 'button', style: 'min-width:44px;min-height:44px;font-weight:700', on: { click: function () {
            if (ctx.isDone() || value().length >= (word.length || 20)) return;
            input.value = value() + ch; lastSubmitted = null; draw();
          } } }, [ch]);
        });
        var deleteKey = ctx.el('button', { type: 'button', 'aria-label': L.spelling_bee_delete, style: 'min-width:44px;min-height:44px', on: { click: function () {
          if (ctx.isDone() || !value()) return;
          input.value = value().slice(0, -1); lastSubmitted = null; draw();
        } } }, ['⌫']);
        ctx.root.appendChild(ctx.el('div', { class: 'row', role: 'group', 'aria-label': L.spelling_bee_letter_keys, style: 'flex-wrap:wrap;gap:4px;margin-top:8px' }, letterKeys.concat([deleteKey])));
        ctx.root.appendChild(ctx.el('div', { class: 'row', style: 'margin-top:12px' }, [checkBtn, firstBtn, moreBtn]));
        ctx.root.appendChild(answerLine);
        draw();
        return {
          reveal: function () {
            input.setAttribute('readonly', '');
            input.setAttribute('aria-readonly', 'true');
            [checkBtn, firstBtn, moreBtn, deleteKey].concat(letterKeys).forEach(function (b) { b.setAttribute('aria-disabled', 'true'); });
            answerLine.hidden = false;
          },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["syllable_blending"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Syllable Blending (syllable_blending).
    // App: setup stores { ...WS_CORE.resolveSyllableTask(...), options, answer }
    // (word_sounds_setup_source.jsx:4645-4677, 4804). The player re-resolves the
    // task (generateSyllableData, word_sounds_module.js:8602-8621) and plays it
    // only when WS_CORE.syllableReady: a curated compound (version 1, units keyed
    // by their text, spoken from prepared clips) or a teacher-recorded,
    // teacher-reviewed task (each unit's own recording). Choices: the board's own
    // options when WS_CORE.validSyllableBoard holds and they pass
    // buildSyllableOptions' authored check (3522-3536).
    // Opening: inst_syllable_blending (or "Listen to the syllables and blend them
    // together"), then each syllable unit with 350 ms between them
    // (runSyllableSequence 4475-4493, playSyllables 9689-9715, 16939-16940).
    // Choices stay disabled until a full syllable run has finished and while
    // audio plays (SyllableBlendingView canAnswer / isAudioBusy, 4494-4534,
    // 20194-20195). Graded at 20197-20209: the chosen option equals the word
    // (trimmed, lower case) -> checkAnswer("correct"|"incorrect", "correct"),
    // default 2 attempts.

    module.exports = {
      id: 'syllable_blending',
      title: 'Syllable Blending',
      labels: {
        syllable_blending_prompt: 'Listen to the syllables and blend them together',
        syllable_blending_play: 'Play the syllables',
        syllable_blending_listen_first: 'Listen to all the syllables first, then choose.',
        syllable_blending_option_n: 'Option {n}',
        syllable_blending_listen: 'Listen',
        syllable_blending_listen_option: 'Listen to option {n}',
        syllable_blending_listen_word: 'Listen to {word}',
        syllable_blending_choose_option: 'Choose option {n}',
        syllable_blending_choose_word: 'Choose {word}',
        syllable_blending_try_again: 'Not quite. Play the syllables again and try once more.',
        syllable_blending_correct: 'Yes! The syllables make {word}.',
        syllable_blending_correct_no_letters: 'Yes! That is the word the syllables make.',
        syllable_blending_missed: 'The syllables make {word}. Listen.',
        syllable_blending_missed_no_letters: 'Here is the word the syllables make. Listen.',
        syllable_blending_answer_mark: '(the answer)',
      },
      prepare: function (w, env) {
        var core = env.core;
        var board = w && w.activityItems && w.activityItems.syllable_blending;
        if (!board) return { missing: ['board'] };
        var word = String(env.word).trim().toLowerCase();
        var language = env.language || (env.isEnglish ? 'en' : null);
        if (!language) return { missing: ['syllable_language_unknown'] };
        var task = core.resolveSyllableTask(word, board, language);
        if (!task || !task.supported || !core.syllableReady(task)) return { missing: ['syllable_audio_required'] };
        // Only the board's own choices: the app's fallback draws random words.
        var authored = core.validSyllableBoard(board) && core.packAudioKey(board.targetWord) === core.packAudioKey(word) && Array.isArray(board.options)
          ? board.options.map(function (v) { return typeof v === 'string' ? v.trim().toLowerCase() : ''; }) : [];
        var unique = authored.filter(function (v, i) { return authored.indexOf(v) === i; });
        if (authored.length < 2 || authored.length > 6 || authored.indexOf(word) < 0 || !authored.every(Boolean) || unique.length !== authored.length) return { missing: ['board'] };
        var missing = [];
        var prompt = env.bankClip('instructions', 'inst_syllable_blending') || env.packClip('Listen to the syllables and blend them together');
        if (!prompt) missing.push('question');
        var units = task.audioUnits.map(function (unit, i) {
          var clip = null;
          if (task.contentStatus === 'teacher_recorded') {
            // A reviewed teacher recording travels inside the board; embedding it
            // needs a loader helper that takes a data: URI (not available yet).
            var uri = core.syllableAssetSource(unit.asset);
            clip = uri && typeof env.recordingClip === 'function' ? env.recordingClip(uri) : null;
            if (!clip) missing.push(uri ? 'syllable_recordings_not_exportable' : 'syllable:' + (i + 1));
          } else {
            clip = env.wordClip(unit.audio || unit.key || unit.text);
            if (!clip) missing.push('syllable:' + unit.text);
          }
          return clip;
        });
        var answerAudio = null;
        var choices = authored.map(function (text) {
          var clip = env.wordClip(text);
          if (!clip) missing.push('word:' + text);
          if (text === word) answerAudio = clip;
          return { text: text, audio: clip };
        });
        if (missing.length) return { missing: missing.filter(function (m, i) { return missing.indexOf(m) === i; }) };
        return { item: { target: word, syllables: task.syllables.slice(), units: units, promptAudio: prompt, choices: choices,
          answerAudio: units.concat([answerAudio]) } };
      },
      render: function (item, ctx) {
        var win = ctx.root.ownerDocument.defaultView;
        var token = 0;
        var delivered = false;
        var busy = false;
        var cards = [];
        var parts = [];
        var answerText = item.target;
        var note = ctx.el('p', { class: 'muted', text: ctx.L.syllable_blending_listen_first });
        var setState = function () {
          cards.forEach(function (c) {
            var lockChoose = ctx.isDone() || c.tried || !delivered || busy;
            if (lockChoose) c.choose.setAttribute('aria-disabled', 'true'); else c.choose.removeAttribute('aria-disabled');
            if (busy) c.listen.setAttribute('aria-disabled', 'true'); else c.listen.removeAttribute('aria-disabled');
          });
          note.hidden = delivered || ctx.isDone();
        };
        var highlight = function (index) {
          parts.forEach(function (p, i) { p.style.background = i === index ? 'var(--accent)' : ''; p.style.color = i === index ? 'var(--accent-ink)' : ''; });
        };
        var halt = function () { token++; busy = false; highlight(-1); setState(); };
        // The syllable run the answer waits for: every unit must play through.
        var runSyllables = function (withPrompt) {
          var mine = ++token;
          delivered = false; busy = true; setState();
          var steps = (withPrompt ? [{ id: item.promptAudio, gap: 200, hi: -1 }] : [])
            .concat(item.units.map(function (id, i) { return { id: id, gap: i < item.units.length - 1 ? 350 : 0, hi: i }; }));
          var i = 0;
          var step = function () {
            if (mine !== token || !ctx.root.isConnected) return;
            if (i >= steps.length) { busy = false; delivered = true; highlight(-1); setState(); return; }
            var s = steps[i++];
            highlight(s.hi);
            ctx.play(s.id).then(function (ok) {
              if (mine !== token) return;
              if (!ok) { busy = false; highlight(-1); setState(); return; }
              win.setTimeout(step, s.gap || 0);
            });
          };
          step();
        };
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.syllable_blending_prompt }));
        var row = ctx.el('div', { class: 'row', 'aria-hidden': 'true' });
        item.syllables.forEach(function (syllable) {
          var p = ctx.el('span', { class: 'slot', text: ctx.showLetters ? syllable : '●' });
          parts.push(p);
          row.appendChild(p);
        });
        ctx.root.appendChild(row);
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', class: 'primary', on: { click: function () { if (ctx.isDone()) return; ctx.support('syllableReplays'); runSyllables(false); } }, text: '▶ ' + ctx.L.syllable_blending_play }),
          ctx.el('button', { type: 'button', on: { click: function () { if (ctx.isDone()) return; ctx.support('questionReplays'); runSyllables(true); } }, text: ctx.L.hear_question }),
        ]));
        ctx.root.appendChild(note);
        var list = ctx.el('ul', { class: 'choices' });
        item.choices.forEach(function (choice, i) {
          var n = i + 1;
          var card = { tried: false, answer: choice.text === item.target };
          var listen = ctx.el('button', { type: 'button',
            'aria-label': ctx.showLetters ? ctx.fmt(ctx.L.syllable_blending_listen_word, { word: choice.text }) : ctx.fmt(ctx.L.syllable_blending_listen_option, { n: n }),
            on: { click: function () { if (busy) return; ctx.support('optionListens'); ctx.play(choice.audio); } } }, ['▶ ', ctx.L.syllable_blending_listen]);
          var choose = ctx.el('button', { type: 'button', class: 'primary',
            'aria-label': ctx.showLetters ? ctx.fmt(ctx.L.syllable_blending_choose_word, { word: choice.text }) : ctx.fmt(ctx.L.syllable_blending_choose_option, { n: n }),
            on: { click: function () {
              if (ctx.isDone() || choose.getAttribute('aria-disabled') === 'true') return;
              var right = String(choice.text || '').trim().toLowerCase() === String(item.target || '').trim().toLowerCase();
              var outcome = ctx.answer(choice.text, right, {
                correctText: ctx.showLetters ? ctx.fmt(ctx.L.syllable_blending_correct, { word: answerText }) : ctx.L.syllable_blending_correct_no_letters,
                retryText: ctx.L.syllable_blending_try_again,
                missedText: ctx.showLetters ? ctx.fmt(ctx.L.syllable_blending_missed, { word: answerText }) : ctx.L.syllable_blending_missed_no_letters,
              });
              if (outcome !== 'correct') { card.tried = true; box.classList.add('tried'); setState(); }
            } } }, [ctx.showLetters ? ctx.el('span', { class: 'letters', text: choice.text }) : ctx.fmt(ctx.L.syllable_blending_option_n, { n: n })]);
          var box = ctx.el('li', { class: 'choice' }, [choose, listen]);
          card.box = box; card.choose = choose; card.listen = listen;
          cards.push(card);
          list.appendChild(box);
        });
        ctx.root.appendChild(list);
        setState();
        if (!ctx.isDone()) runSyllables(true);
        return {
          reveal: function () {
            halt();
            cards.forEach(function (c) {
              c.choose.setAttribute('aria-disabled', 'true');
              if (c.answer && !c.box.classList.contains('right')) {
                c.box.classList.add('right');
                c.choose.setAttribute('aria-label', c.choose.getAttribute('aria-label') + ' ' + ctx.L.syllable_blending_answer_mark);
              }
            });
          },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["syllable_counting"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Syllable Claps (syllable_counting).
    // App source of truth (word_sounds_module.js):
    //   readiness   syllableCountReady (~4560): supported === true, integer count > 0,
    //               same target word. The count comes from WS_CORE.resolveSyllableCount
    //               with the board, the recorded syllable task and the AUDIO CONTEXT of
    //               the clip that will be played (syllableCountAudioFor ~4537): a
    //               teacher-reviewed count is bound to that exact clip.
    //               A teacher-SPOKEN count (reviewed with no clip) needs a teacher to
    //               say the word, so it cannot go home.
    //   view        SyllableCountingView (~4569) and case "syllable_counting" (~20228):
    //               tap once per syllable, Undo, Reset, Submit. Submit works only after
    //               the whole recorded word has played in this attempt and no audio is
    //               playing (syllableCountDeliveryReady ~4563, receipt ~9076).
    //   grading     onCheckAnswer: taps === count -> checkAnswer("correct"/"incorrect",
    //               "correct"); each submission resets taps and requires a fresh
    //               hearing (resetSyllableCountDelivery(false) ~17092). Budget: 2.
    //   audio       inst_syllable_counting bank clip, else the pack clip of
    //               "How many syllables do you hear? Clap for each one"; then the word.
    module.exports = {
      id: 'syllable_counting',
      title: 'Syllable Claps',
      labels: {
        syllable_counting_question: 'How many syllables do you hear? Clap for each one.',
        syllable_counting_tap: 'Tap to count syllables',
        syllable_counting_undo: 'Undo last tap',
        syllable_counting_reset: 'Reset',
        syllable_counting_submit: 'Submit',
        syllable_counting_taps_one: 'You tapped {count} time.',
        syllable_counting_taps_other: 'You tapped {count} times.',
        syllable_counting_wait_word: 'Hear the whole word before submitting.',
        syllable_counting_wait_audio: 'Wait for the word to finish before submitting.',
        syllable_counting_ready: 'Ready to submit.',
        syllable_counting_tap_each: 'Tap once for each syllable you hear.',
        syllable_counting_correct: 'Yes! {word} has {count}.',
        syllable_counting_missed: '{word} has {count}. Listen again.',
        syllable_counting_answer: '{word} has {count}.',
        syllable_counting_count_one: '1 syllable',
        syllable_counting_count_other: '{n} syllables',
      },
      prepare: function (w, env) {
        var core = env.core;
        var boards = w.activityItems || {};
        var board = boards.syllable_counting;
        if (!board) return { missing: ['board'] };
        var recordedTask = boards.syllable_blending || null;
        var language = (board.reviewedEvidence && board.reviewedEvidence.language) || board.language || (env.isEnglish ? 'en' : '');
        if (!language) return { missing: ['board language'] };
        var key = core.packAudioKey(env.word);
        // syllableCountAudioFor: the pack's saved clip for this word decides the
        // audio context a reviewed count is checked against.
        var asset = core.packAudioAssets([w])[key];
        var savedSource = typeof asset === 'string' ? asset : asset && asset.mime && asset.base64 ? 'data:' + asset.mime + ';base64,' + asset.base64 : null;
        var spoken = core.createSyllableCountAudioContext({ language: language });
        if (!savedSource && core.isTeacherSpokenSyllableCount(env.word, { language: language, prepared: board, recordedTask: recordedTask, audioContext: spoken })) {
          return { missing: ['teacher says this word aloud'] };
        }
        var approval = board.reviewedEvidence || board;
        var audioContext;
        if (savedSource) {
          var selected = core.selectSyllableCountAudio({ word: env.word, language: language, savedAsset: asset, bankAsset: null,
            prepared: board, recordedTask: recordedTask, allowSavedProfileMismatch: true });
          if (!selected.asset) return { missing: ['word'] };
          audioContext = core.createSyllableCountAudioContext({ asset: selected.asset, language: language });
        } else if (approval && approval.source === 'teacher_review') {
          // A reviewed count is bound to a specific clip; without the pack's clip
          // the export cannot show the word bank clip is the one that was reviewed.
          return { missing: ['reviewed word recording'] };
        }
        var resolved = core.resolveSyllableCount(env.word, { language: language, prepared: board, recordedTask: recordedTask,
          audioContext: audioContext, syllables: w.syllables });
        var sameWord = String(resolved.targetWord || '').normalize('NFC').trim().toLowerCase() === String(env.word).normalize('NFC').trim().toLowerCase();
        if (!(resolved.supported === true && Number.isInteger(resolved.count) && resolved.count > 0 && sameWord)) {
          return { missing: ['syllable count needs review' + (resolved.reason ? ' (' + resolved.reason + ')' : '')] };
        }
        if (resolved.source === 'teacher_review' && resolved.audioContext && !resolved.audioContext.fingerprint) {
          return { missing: ['teacher says this word aloud'] };
        }
        var missing = [];
        var wordAudio = savedSource ? env.packClip(env.word) : env.wordClip(env.word);
        if (!wordAudio) missing.push('word');
        var prompt = env.bankClip('instructions', 'inst_syllable_counting') || env.packClip('How many syllables do you hear? Clap for each one');
        if (!prompt) missing.push('question');
        if (missing.length) return { missing: missing };
        // introAudio stays empty: render plays the question and word itself, so it
        // can tell when the whole word has been heard (the app's delivery receipt).
        return { item: { count: resolved.count, target: String(resolved.count), wordAudio: wordAudio, promptAudio: prompt,
          introAudio: [], answerAudio: [wordAudio] } };
      },
      render: function (item, ctx) {
        var taps = 0;
        var attempt = 0;
        var delivered = false;
        var busy = false;
        var token = 0;
        var countText = function (n) { return n === 1 ? ctx.L.syllable_counting_count_one : ctx.fmt(ctx.L.syllable_counting_count_other, { n: n }); };
        var shown = ctx.el('p', { 'aria-hidden': 'true', style: 'font-size:3rem;font-weight:800;margin:8px 0;text-align:center', text: '0' });
        var status = ctx.el('p', { class: 'muted', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
        var canSubmit = function () { return !ctx.isDone() && taps > 0 && delivered && !busy; };
        var update = function () {
          shown.textContent = String(taps);
          var text = ctx.fmt(taps === 1 ? ctx.L.syllable_counting_taps_one : ctx.L.syllable_counting_taps_other, { count: taps }) + ' ' +
            (busy ? ctx.L.syllable_counting_wait_audio : !delivered ? ctx.L.syllable_counting_wait_word
              : taps > 0 ? ctx.L.syllable_counting_ready : ctx.L.syllable_counting_tap_each);
          if (!ctx.isDone()) status.textContent = text;
          submit.setAttribute('aria-disabled', canSubmit() ? 'false' : 'true');
          undo.setAttribute('aria-disabled', ctx.isDone() || taps === 0 ? 'true' : 'false');
        };
        // Plays a sequence; the word counts as heard only when ITS clip ends in this
        // attempt. A clip cut off by another one never settles, so it never counts.
        var hear = function (ids, wordLast) {
          var mine = ++token;
          var myAttempt = attempt;
          busy = true;
          if (wordLast) delivered = false;
          update();
          return ctx.playAll(ids).then(function (ok) {
            if (mine !== token) return;
            busy = false;
            if (wordLast && ok && myAttempt === attempt) delivered = true;
            update();
          });
        };
        var tap = ctx.el('button', { type: 'button', class: 'primary', 'aria-label': ctx.L.syllable_counting_tap, style: 'min-width:128px;min-height:128px;border-radius:64px;font-size:1.2rem',
          on: { click: function () { if (ctx.isDone()) return; taps++; update(); } } },
          [ctx.el('span', { 'aria-hidden': 'true', style: 'display:block;font-size:2.4rem', text: '👏' }), ctx.L.syllable_counting_tap]);
        var undo = ctx.el('button', { type: 'button', on: { click: function () {
          if (ctx.isDone() || taps === 0) return; taps--; update();
        } }, text: ctx.L.syllable_counting_undo });
        var reset = ctx.el('button', { type: 'button', on: { click: function () { if (ctx.isDone()) return; taps = 0; update(); } }, text: ctx.L.syllable_counting_reset });
        var submit = ctx.el('button', { type: 'button', class: 'primary', on: { click: function () {
          if (!canSubmit()) { if (!ctx.isDone()) ctx.announce(status.textContent); return; }
          var answer = taps;
          var outcome = ctx.answer(String(answer), answer === item.count, {
            correctText: ctx.fmt(ctx.L.syllable_counting_correct, { word: item.word, count: countText(item.count) }),
            missedText: ctx.fmt(ctx.L.syllable_counting_missed, { word: item.word, count: countText(item.count) }),
          });
          // Every submission starts a new attempt: taps reset and the word must be
          // heard again before the next submission.
          attempt++;
          taps = 0;
          delivered = false;
          if (outcome === 'retry') update();
        } }, text: ctx.L.syllable_counting_submit });
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.syllable_counting_question }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); hear([item.promptAudio], false); } }, text: ctx.L.hear_question }),
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('wordReplays'); hear([item.wordAudio], true); } }, text: ctx.L.hear_word }),
        ]));
        ctx.root.appendChild(shown);
        ctx.root.appendChild(ctx.el('div', { class: 'row', style: 'justify-content:center' }, [tap]));
        ctx.root.appendChild(ctx.el('div', { class: 'row', style: 'justify-content:center;margin-top:12px' }, [undo, reset]));
        ctx.root.appendChild(status);
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [submit]));
        update();
        if (!ctx.isDone()) hear([item.promptAudio, item.wordAudio], true);
        return {
          reveal: function () {
            token++;
            busy = false;
            [tap, undo, reset, submit].forEach(function (b) { b.setAttribute('aria-disabled', 'true'); });
            shown.textContent = String(item.count);
            status.textContent = ctx.fmt(ctx.L.syllable_counting_answer, { word: item.word, count: countText(item.count) });
          },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["word_families"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Word Families (word_families).
    // App: board built at setup (word_sounds_setup_source.jsx:4704-4716) and
    // kept only when WS_CORE.validWordFamilyBoard accepts it. The player resolves
    // the family with resolveWordFamilyRime (word_sounds_module.js:7192-7279): a
    // teacher edit (rimeFamilyMembers.teacherEdited) wins unless the prepared
    // board already equals it; otherwise a valid prepared board; otherwise a
    // runtime family from the module's RIME_FAMILIES table, which is not in
    // WS_CORE and so cannot be rebuilt here (reported as 'board').
    // buildWordFamilyBoard (7294-7356) uses prepared lists verbatim, teacher lists
    // sliced to 8, and drops a board with an issue (no member / a word on both
    // sides), which learners skip (7360-7392).
    // Opening: prepared -> "Find all words in the <rime> family" (WS_CORE.
    // wordFamilyInstruction); otherwise inst_word_families then the rime
    // (16706-16735); then every chip once the instruction is done
    // (WordFamiliesView 10176-10240). Grading as Sound Sort
    // (WordFamiliesView.handleWordClick 10247-10277): all members found = correct
    // (checkAnswer(word, word)); a distractor tap is a wrong attempt; budget
    // maxAttempts = max(2, distractors + 1) (20740-20752, 17126-17134).

    module.exports = {
      id: 'word_families',
      title: 'Word Families',
      labels: {
        word_families_heading_rime: '{rime} family',
        word_families_heading_rime_hidden: 'Sound Family',
        word_families_instruction: 'Tap each word to hear it. Find the ones that match!',
        word_families_instruction_letters: 'Find all words that match: {family}',
        word_families_found: '{found} of {total} found',
        word_families_listen: 'Listen',
        word_families_listen_option: 'Listen to option {n}',
        word_families_listen_word: 'Listen to {word}',
        word_families_choose_option: 'Choose option {n}',
        word_families_choose_word: 'Choose {word}',
        word_families_option_n: 'Option {n}',
        word_families_hear_all: 'Hear all words',
        word_families_found_mark: '(found)',
        word_families_answer_mark: '(in the family)',
        word_families_match: 'Yes, that one is in the family! {found} of {total} found.',
        word_families_match_word: 'Yes, {word} is in the family! {found} of {total} found.',
        word_families_no_match: 'That word is not in the family. Keep looking!',
        word_families_no_match_word: '{word} is not in the family. Keep looking!',
        word_families_correct: 'All matched! You found the whole family.',
        word_families_missed: 'The family words are: {words}. Listen.',
        word_families_missed_no_letters: 'Here are the family words. Listen.',
      },
      prepare: function (w, env) {
        // Word Families is English-only in the app (word_sounds_module.js:10928).
        if (!env.isEnglish) return { missing: ['english_only'] };
        var core = env.core;
        var word = String(env.word).toLowerCase();
        var board = w.activityItems && w.activityItems.word_families;
        var prepared = core.validWordFamilyBoard(board, word) ? board : null;
        var spec = w.rimeFamilyMembers;
        var rime = null, members = [], distractors = [], isPrepared = false;
        var usePrepared = function () { rime = prepared.rime; members = prepared.options.slice(); distractors = prepared.distractors.slice(); isPrepared = true; };
        if (spec && spec.teacherEdited && spec.rime) {
          var editedRime = String(spec.rime).toLowerCase().trim().replace(/^-/, '');
          var editedWords = function (values) {
            var out = [];
            (Array.isArray(values) ? values : []).filter(function (v) { return typeof v === 'string'; })
              .map(function (v) { return v.toLowerCase().trim(); })
              .filter(function (v) { return v && v !== word; }).slice(0, 8)
              .forEach(function (v) { if (out.indexOf(v) < 0) out.push(v); });
            return out;
          };
          if (prepared && prepared.rime === editedRime &&
              JSON.stringify(prepared.options) === JSON.stringify(editedWords(spec.words)) &&
              JSON.stringify(prepared.distractors) === JSON.stringify(editedWords(spec.distractors))) usePrepared();
          else {
            rime = editedRime;
            members = (spec.words || []).filter(function (v) { return v != null && String(v).toLowerCase() !== word; }).slice(0, 8);
            distractors = (spec.distractors || []).filter(function (v) { return v != null; }).slice(0, 8);
          }
        } else if (prepared) usePrepared();
        if (!rime) return { missing: ['board'] };
        // wordFamilyBoardIssue (word_sounds_module.js:7283-7290).
        var clean = function (values) { return values.map(function (v) { return String(v == null ? '' : v).toLowerCase().trim(); }).filter(Boolean); };
        var yes = clean(members), no = clean(distractors);
        if (!yes.length || yes.some(function (v) { return no.indexOf(v) >= 0; }) || no.indexOf(word.trim()) >= 0) return { missing: ['family_review_required'] };
        var missing = [];
        var wordAudio = env.wordClip(env.word);
        if (!wordAudio) missing.push('word');
        var instruction = null;
        var sentence = isPrepared ? env.packClip(core.wordFamilyInstruction(rime)) : null;
        if (sentence) instruction = [sentence];
        else {
          // Prepared boards speak the sentence; without its recording, the
          // recorded framing + the rime says the same thing (the app's
          // non-prepared path).
          var inst = env.bankClip('instructions', 'inst_word_families');
          var rimeAudio = env.wordClip(rime);
          if (inst && rimeAudio) instruction = [inst, rimeAudio];
        }
        if (!instruction) missing.push('question');
        var chips = [];
        var add = function (text, member) {
          text = String(text == null ? '' : text);
          if (!text.trim() || chips.some(function (c) { return c.text === text; })) return;
          var clip = env.wordClip(text);
          if (!clip) missing.push('word:' + text.trim().toLowerCase());
          chips.push({ text: text, audio: clip, member: member });
        };
        members.forEach(function (t) { add(t, true); });
        distractors.forEach(function (t) { add(t, false); });
        if (missing.length) return { missing: missing };
        // The app shuffles the chips on every mount; the file keeps one fixed,
        // word-seeded order so a resumed item looks the same.
        var s = 0;
        for (var i = 0; i < word.length; i++) s = (Math.imul(s, 31) + word.charCodeAt(i)) >>> 0;
        for (var j = chips.length - 1; j > 0; j--) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; var k = s % (j + 1); var tmp = chips[j]; chips[j] = chips[k]; chips[k] = tmp; }
        var inFamily = chips.filter(function (c) { return c.member; });
        return { item: {
          mode: 'rime', rime: rime, chips: chips, wordAudio: wordAudio, instruction: instruction,
          maxAttempts: Math.max(2, distractors.length + 1),
          target: inFamily.map(function (c) { return c.text; }).join(', '),
          answerAudio: inFamily.map(function (c) { return c.audio; }),
        } };
      },
      // Shared find-all board (identical in sound_sort.js). The label prefix
      // comes from the item id the shell assigns ("<activity>-<n>").
      render: function (item, ctx) {
        var P = String(item.id || '').replace(/-\d+$/, '') + '_';
        var T = function (key, params) { return ctx.fmt(ctx.L[P + key] || '', params); };
        var win = ctx.root.ownerDocument.defaultView;
        var cards = [];
        var found = [];
        var total = item.chips.filter(function (c) { return c.member; }).length;
        var token = 0;
        var mark = function (index) {
          cards.forEach(function (c, i) { c.box.style.outline = i === index ? '4px solid var(--accent)' : ''; c.box.style.outlineOffset = i === index ? '2px' : ''; });
        };
        var run = function (steps) {
          var mine = ++token;
          var i = 0;
          var step = function () {
            if (mine !== token || !ctx.root.isConnected) return;
            if (i >= steps.length) { mark(-1); return; }
            var s = steps[i++];
            mark(s.hi == null ? -1 : s.hi);
            ctx.play(s.id).then(function () { if (mine === token) win.setTimeout(step, s.gap || 0); });
          };
          step();
        };
        var halt = function () { token++; mark(-1); };
        var heading = item.mode === 'rime'
          ? (ctx.showLetters ? T('heading_rime', { rime: '-' + item.rime }) : T('heading_rime_hidden'))
          : (ctx.showLetters ? T('heading_' + item.mode, { sound: '/' + item.sound + '/' }) : T('heading_' + item.mode + '_hidden'));
        var counter = ctx.el('p', { class: 'muted', text: T('found', { found: 0, total: total }) });
        var memberText = item.chips.filter(function (c) { return c.member; }).map(function (c) { return c.text; }).join(', ');
        var list = ctx.el('ul', { class: 'choices' });
        item.chips.forEach(function (chip, i) {
          var n = i + 1;
          var card = { chip: chip, found: false };
          var listen = ctx.el('button', { type: 'button',
            'aria-label': ctx.showLetters ? T('listen_word', { word: chip.text }) : T('listen_option', { n: n }),
            on: { click: function () { halt(); ctx.support('optionListens'); ctx.play(chip.audio); } } }, ['▶ ', T('listen')]);
          var choose = ctx.el('button', { type: 'button', class: 'primary',
            'aria-label': ctx.showLetters ? T('choose_word', { word: chip.text }) : T('choose_option', { n: n }),
            on: { click: function () {
              if (ctx.isDone() || card.found) return;
              halt();
              if (chip.member) {
                card.found = true;
                found.push(chip.text);
                box.classList.add('right');
                choose.setAttribute('aria-disabled', 'true');
                choose.setAttribute('aria-label', choose.getAttribute('aria-label') + ' ' + T('found_mark'));
                counter.textContent = T('found', { found: found.length, total: total });
                if (found.length >= total) {
                  ctx.answer(found.join(', '), true, { correctText: T('correct') });
                } else {
                  ctx.play(chip.audio);
                  ctx.announce(ctx.showLetters ? T('match_word', { word: chip.text, found: found.length, total: total }) : T('match', { found: found.length, total: total }));
                }
                return;
              }
              // A wrong tap costs one attempt; the chip stays on the board, as in
              // the app (tapping it again costs another).
              box.classList.add('tried');
              ctx.answer(chip.text, false, {
                retryText: ctx.showLetters ? T('no_match_word', { word: chip.text }) : T('no_match'),
                missedText: ctx.showLetters ? T('missed', { words: memberText }) : T('missed_no_letters'),
              });
            } } }, [ctx.showLetters ? ctx.el('span', { class: 'letters', text: chip.text }) : T('option_n', { n: n })]);
          var box = ctx.el('li', { class: 'choice' }, [choose, listen]);
          card.box = box; card.choose = choose;
          cards.push(card);
          list.appendChild(box);
        });
        var chipSteps = function (onlyLeft) {
          return item.chips.map(function (c, i) { return { id: c.audio, gap: 350, hi: i, skip: onlyLeft && cards[i].found }; })
            .filter(function (s) { return !s.skip; });
        };
        var instructionSteps = function () { return item.instruction.map(function (id) { return { id: id, gap: 200 }; }); };
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: heading }));
        ctx.root.appendChild(ctx.el('p', { text: ctx.showLetters ? T('instruction_letters', { family: heading }) : T('instruction') }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); run(instructionSteps()); } }, text: ctx.L.hear_question }),
          ctx.el('button', { type: 'button', on: { click: function () { if (ctx.isDone()) return; ctx.support('allWordListens'); run(chipSteps(true)); } }, text: T('hear_all') }),
        ]));
        ctx.root.appendChild(counter);
        ctx.root.appendChild(list);
        if (!ctx.isDone()) run(instructionSteps().concat(chipSteps(false)));
        return {
          reveal: function () {
            halt();
            cards.forEach(function (c) {
              c.choose.setAttribute('aria-disabled', 'true');
              if (c.chip.member && !c.found && !c.box.classList.contains('right')) {
                c.box.classList.add('right');
                c.choose.setAttribute('aria-label', c.choose.getAttribute('aria-label') + ' ' + T('answer_mark'));
              }
            });
          },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["word_scramble"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Word Scramble (word_scramble).
    // App source of truth:
    //   board   compileActivityItems (word_sounds_setup_source.jsx:4684-4689, 4811):
    //           { letters: the word's letters in a seeded shuffle that never equals the
    //           word, answer: word }. Without a board the view scrambles the word with
    //           the same seeded loop (scrambleWord, word_sounds_module.js:18916-18934).
    //   view    case "word_scramble" (word_sounds_module.js:19874-20027): letter tiles
    //           (tap adds the letter to the answer, a used tile is disabled), one answer
    //           box per letter, Clear, Check (enabled once the answer is not empty),
    //           "Play word", and a "Show word" support (:18774-18789; the word is
    //           otherwise hidden until answered, SMART_TEXT_VISIBILITY :7568).
    //   grading submitConstructionAnswer (:18887-18902): trimmed, lowercased answer
    //           === trimmed, lowercased word; the same unchanged answer is not graded
    //           twice; checkAnswer("correct"|"incorrect","correct"). Default budget 2
    //           tries (:17130). A first miss clears the answer and frees every tile
    //           (checkScramble :19875-19880).
    //   audio   inst_word_scramble (INST_KEY_MAP :16449); the word only on request.
    module.exports = {
      id: 'word_scramble',
      title: 'Word Scramble',
      labels: {
        word_scramble_question: 'Unscramble the letters to make the word.',
        word_scramble_how: 'Tap a letter to pick it up, then tap a box to put it there. Tap a filled box to take the letter out.',
        word_scramble_tray: 'Letters',
        word_scramble_boxes: 'Answer boxes',
        word_scramble_box_empty: 'Box {n}, empty',
        word_scramble_box_filled: 'Box {n}: {letter}',
        word_scramble_pick: 'Pick up {letter}',
        word_scramble_picked: '{letter} picked up. Now choose a box.',
        word_scramble_dropped: '{letter} put back.',
        word_scramble_placed: '{letter} is in box {n}.',
        word_scramble_removed: '{letter} taken out of box {n}.',
        word_scramble_cleared: 'All the boxes are empty again.',
        word_scramble_clear: 'Clear',
        word_scramble_check: 'Check',
        word_scramble_show_word: 'Show word',
        word_scramble_word: 'The word: {word}',
        word_scramble_empty: 'Put some letters in the boxes first.',
        word_scramble_same: 'Change your answer, then check it again.',
        word_scramble_retry: 'Not quite. The letters are back. Listen and try once more.',
        word_scramble_correct: 'Yes! The word is {word}.',
        word_scramble_missed: 'The word is {word}. Listen.',
      },
      prepare: function (w, env) {
        var word = String(env.word || '').trim().toLowerCase();
        if (!word) return { missing: ['word'] };
        var board = w && w.activityItems && w.activityItems.word_scramble;
        var letters = board && Array.isArray(board.letters) ? board.letters.map(function (l) { return String(l).toLowerCase(); }) : null;
        // The board must be exactly this word's letters (one tile per letter).
        if (letters && letters.slice().sort().join('\u0000') !== word.split('').sort().join('\u0000')) return { missing: ['board'] };
        if (!letters) {
          // scrambleWord (word_sounds_module.js:18916-18928), copied exactly.
          letters = word.split('');
          if (word.length > 2) {
            var seed = word.split('').reduce(function (a, c) { return a + c.charCodeAt(0); }, 0);
            for (var i = letters.length - 1; i > 0; i--) { var j = (seed + i) % (i + 1); var t = letters[i]; letters[i] = letters[j]; letters[j] = t; }
            if (letters.join('') === word) { var t2 = letters[0]; letters[0] = letters[1]; letters[1] = t2; }
          }
        }
        var missing = [];
        var wordAudio = env.wordClip(env.word);
        if (!wordAudio) missing.push('word');
        var prompt = env.bankClip('instructions', 'inst_word_scramble');
        if (!prompt) missing.push('question');
        if (missing.length) return { missing: missing };
        return { item: { target: word, letters: letters, wordAudio: wordAudio, promptAudio: prompt,
          introAudio: [prompt], answerAudio: [wordAudio] } };
      },
      render: function (item, ctx) {
        var L = ctx.L;
        var n = item.target.length;
        var boxes = [];
        for (var s = 0; s < n; s++) boxes.push(null);
        var picked = null;
        var lastSubmitted = null;
        var locked = function () { return ctx.isDone(); };
        var up = function (ti) { return String(item.letters[ti]).toUpperCase(); };
        var answerText = function () { return boxes.filter(function (x) { return x != null; }).map(function (ti) { return item.letters[ti]; }).join(''); };

        var tray = ctx.el('ul', { class: 'row', 'aria-label': L.word_scramble_tray, style: 'list-style:none;padding:0;margin:16px 0;gap:10px' });
        var tiles = item.letters.map(function (letter, ti) {
          var btn = ctx.el('button', { type: 'button', class: 'primary', 'aria-pressed': 'false', 'aria-label': ctx.fmt(L.word_scramble_pick, { letter: up(ti) }),
            style: 'min-width:56px;min-height:56px;font-size:1.5rem;font-weight:700',
            on: { click: function () { onTile(ti); } } }, [up(ti)]);
          var li = ctx.el('li', {}, [btn]);
          tray.appendChild(li);
          return { li: li, btn: btn };
        });
        var boxList = ctx.el('ol', { class: 'slots', 'aria-label': L.word_scramble_boxes });
        var boxEls = boxes.map(function (_, bi) {
          var btn = ctx.el('button', { type: 'button', class: 'slot', style: 'min-width:60px;min-height:64px;font-size:1.5rem;font-weight:700',
            on: { click: function () { onBox(bi); } } });
          boxList.appendChild(ctx.el('li', {}, [btn]));
          return btn;
        });
        var wordLine = ctx.el('p', { class: 'letters', hidden: true, text: ctx.fmt(L.word_scramble_word, { word: item.target }) });
        var showWord = ctx.el('button', { type: 'button', 'aria-pressed': 'false', on: { click: function () {
          if (locked()) return;
          var on = wordLine.hidden;
          if (on) ctx.support('wordShown');
          wordLine.hidden = !on;
          showWord.setAttribute('aria-pressed', on ? 'true' : 'false');
        } }, text: L.word_scramble_show_word });
        var clearAll = function () { picked = null; for (var i = 0; i < n; i++) boxes[i] = null; };
        var clearBtn = ctx.el('button', { type: 'button', on: { click: function () {
          if (locked()) return;
          clearAll(); lastSubmitted = null; draw(); ctx.announce(L.word_scramble_cleared);
        } }, text: L.word_scramble_clear });
        var checkBtn = ctx.el('button', { type: 'button', class: 'primary', on: { click: function () { onCheck(); } }, text: L.word_scramble_check });

        var draw = function () {
          tiles.forEach(function (t, ti) {
            t.li.hidden = boxes.indexOf(ti) >= 0;
            t.btn.setAttribute('aria-pressed', picked === ti ? 'true' : 'false');
            if (locked()) t.btn.setAttribute('aria-disabled', 'true');
          });
          boxEls.forEach(function (btn, bi) {
            var ti = boxes[bi];
            btn.textContent = ti == null ? '' : up(ti);
            btn.style.borderStyle = ti == null ? 'dashed' : 'solid';
            btn.style.borderColor = ti == null ? 'var(--muted)' : 'var(--accent)';
            btn.setAttribute('aria-label', ti == null ? ctx.fmt(L.word_scramble_box_empty, { n: bi + 1 }) : ctx.fmt(L.word_scramble_box_filled, { n: bi + 1, letter: up(ti) }));
            if (locked()) btn.setAttribute('aria-disabled', 'true');
          });
          checkBtn.setAttribute('aria-disabled', locked() || !answerText() ? 'true' : 'false');
          if (locked()) { clearBtn.setAttribute('aria-disabled', 'true'); showWord.setAttribute('aria-disabled', 'true'); }
        };
        var onTile = function (ti) {
          if (locked() || boxes.indexOf(ti) >= 0) return;
          if (picked === ti) { picked = null; draw(); ctx.announce(ctx.fmt(L.word_scramble_dropped, { letter: up(ti) })); return; }
          picked = ti;
          draw();
          ctx.announce(ctx.fmt(L.word_scramble_picked, { letter: up(ti) }));
          var empty = boxes.indexOf(null);
          boxEls[empty >= 0 ? empty : 0].focus();
        };
        var onBox = function (bi) {
          if (locked()) return;
          if (picked == null) {
            var out = boxes[bi];
            if (out == null) { ctx.announce(L.word_scramble_how); return; }
            boxes[bi] = null; lastSubmitted = null;
            draw();
            ctx.announce(ctx.fmt(L.word_scramble_removed, { letter: up(out), n: bi + 1 }));
            return;
          }
          var ti = picked;
          picked = null;
          boxes[bi] = ti; lastSubmitted = null;
          draw();
          ctx.announce(ctx.fmt(L.word_scramble_placed, { letter: up(ti), n: bi + 1 }));
          if (boxes.indexOf(null) < 0) { checkBtn.focus(); return; }
          for (var k = 0; k < tiles.length; k++) if (boxes.indexOf(k) < 0) { tiles[k].btn.focus(); return; }
        };
        var onCheck = function () {
          if (locked()) return;
          var answer = answerText().trim().toLowerCase();
          if (!answer) { ctx.announce(L.word_scramble_empty); return; }
          if (answer === lastSubmitted) { ctx.announce(L.word_scramble_same); return; }
          lastSubmitted = answer;
          var outcome = ctx.answer(answer, answer === String(item.target).trim().toLowerCase(), {
            correctText: ctx.fmt(L.word_scramble_correct, { word: item.target }),
            retryText: L.word_scramble_retry,
            missedText: ctx.fmt(L.word_scramble_missed, { word: item.target }),
          });
          // A first miss clears the answer and frees every tile (checkScramble).
          if (outcome === 'retry') { clearAll(); draw(); if (tiles[0]) tiles[0].btn.focus(); }
        };

        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: L.word_scramble_question }));
        ctx.root.appendChild(ctx.el('p', { class: 'muted', text: L.word_scramble_how }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: L.hear_question }),
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: L.hear_word }),
          showWord,
        ]));
        ctx.root.appendChild(wordLine);
        ctx.root.appendChild(tray);
        ctx.root.appendChild(boxList);
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [clearBtn, checkBtn]));
        draw();
        return {
          reveal: function (correct) {
            picked = null;
            if (!correct) {
              var used = [];
              for (var i = 0; i < n; i++) {
                var hit = -1;
                for (var ti = 0; ti < item.letters.length && hit < 0; ti++) if (used.indexOf(ti) < 0 && item.letters[ti] === item.target[i]) hit = ti;
                used.push(hit);
                boxes[i] = hit < 0 ? null : hit;
              }
            }
            wordLine.hidden = false;
            draw();
            boxEls.forEach(function (btn) { btn.style.borderColor = 'var(--ok)'; btn.style.background = 'var(--ok-bg)'; });
          },
        };
      },
    };
    return module.exports;
  })();
  // END GENERATED ADAPTERS

  // Check activities (word_sounds_take_home/check_adapters/*.js). They are not
  // Word Sounds activities, so they stay out of ADAPTERS and activities(): the
  // app's take-home dialog never lists them. Beside prepare and render, each
  // has score(item, answer, response) -> { correct, digitsCorrect,
  // digitsPossible }, copied into a check file with toString() like render.
  var CHECK_ADAPTERS = {};
  // BEGIN GENERATED CHECK ADAPTERS (dev-tools/build_word_sounds_take_home.cjs)
  CHECK_ADAPTERS["math_computation"] = (function () {
    var module = { exports: {} };
    // Check adapter: math computation ("7 + 8 =", type the answer).
    // App source of truth (math_fluency_module.js):
    //   countCorrectDigits (~1110): CBM digits correct, each correct digit in its
    //   place value; an answer with the opposite sign earns no digit.
    //   submitAnswer (~1952): a typed whole number, or Skip; a fixed form gives no
    //   feedback; correct = the number typed === problem.answer.
    //   finishProbe (~1505): digits correct per minute over the time used (see
    //   checkScore in the loader for the rate; this file scores one item).
    //   Forms: MATH_PROBE_BANKS in psychometric_math_probes.json, 120 seconds.
    // Also plays a teacher's own problems: { a, b, op } or { display, answer }.
    module.exports = {
      id: 'math_computation',
      title: 'Math Fluency',
      labels: {
        math_computation_directions: 'Type the answer to each one.',
        math_computation_label: '{problem}. Type the answer.',
      },
      // p: { a, b, op } with op add, sub, mul or div (the answer is worked out
      // here; a given answer that disagrees is refused), or { display, answer }.
      // A division must be exact unless p.allowRemainder is true; then the answer
      // is the whole-number part.
      prepare: function (p) {
        p = p || {};
        var whole = function (v) { return v != null && v !== '' && Number.isSafeInteger(Number(v)) && Math.abs(Number(v)) <= 99999999; };
        if (p.a == null && p.b == null && p.display != null) {
          var display = String(p.display).replace(/\s+/g, ' ').trim();
          if (!display || display.length > 40) return { missing: ['a problem of 1 to 40 characters'] };
          if (!whole(p.answer)) return { missing: ['a whole-number answer'] };
          return { item: { word: display, display: display, answer: String(Number(p.answer)) } };
        }
        if (!whole(p.a) || !whole(p.b)) return { missing: ['two whole numbers'] };
        var a = Number(p.a), b = Number(p.b);
        var symbol = p.op === 'add' ? '+' : p.op === 'sub' ? String.fromCharCode(0x2212) : p.op === 'mul' ? String.fromCharCode(0xD7) : p.op === 'div' ? String.fromCharCode(0xF7) : '';
        if (!symbol) return { missing: ['an operation: add, sub, mul or div'] };
        if (p.op === 'div' && b === 0) return { missing: ['a divisor that is not 0'] };
        if (p.op === 'div' && a % b !== 0 && p.allowRemainder !== true) return { missing: ['a division with no remainder'] };
        var answer = p.op === 'add' ? a + b : p.op === 'sub' ? a - b : p.op === 'mul' ? a * b : Math.trunc(a / b);
        if (!whole(answer)) return { missing: ['an answer of 8 digits or fewer'] };
        if (p.answer != null && Number(p.answer) !== answer) return { missing: ['an answer that matches the problem'] };
        return { item: { word: a + ' ' + symbol + ' ' + b, a: a, b: b, symbol: symbol, answer: String(answer) } };
      },
      render: function (item, ctx) {
        var problem = item.display || (item.a + ' ' + item.symbol + ' ' + item.b);
        var pad = ctx.keypad({ label: ctx.fmt(ctx.L.math_computation_label, { problem: problem }), onNext: function (value) { ctx.answer(value); } });
        ctx.root.appendChild(ctx.el('p', { class: 'prompt', 'aria-hidden': 'true', text: item.display ? problem : problem + ' =' }));
        ctx.root.appendChild(pad.node);
        pad.focus();
        return {
          // Practice items only: lock the keys.
          reveal: function () { pad.lock(); },
        };
      },
      score: function (item, answer, response) {
        // BEGIN COPY of countCorrectDigits (math_fluency_module.js). Keep the body
        // the same, line for line: tests/packet_check_mode.test.js compares the two.
        function countCorrectDigits(expected, actual) {
          if (!Number.isFinite(Number(expected)) || !Number.isFinite(Number(actual))) return 0;
          if (Number(expected) * Number(actual) < 0) return 0;
          var expectedDigits = String(Math.abs(Math.trunc(Number(expected))));
          var actualDigits = String(Math.abs(Math.trunc(Number(actual))));
          var len = Math.max(expectedDigits.length, actualDigits.length);
          expectedDigits = expectedDigits.padStart(len, ' ');
          actualDigits = actualDigits.padStart(len, ' ');
          var correct = 0;
          for (var i = 0; i < len; i++) {
            if (expectedDigits[i] !== ' ' && expectedDigits[i] === actualDigits[i]) correct++;
          }
          return correct;
        }
        // END COPY
        var typed = String(response == null ? '' : response);
        var valid = /^-?[0-9]+$/.test(typed) && Number.isSafeInteger(Number(typed));
        var expected = Number(answer);
        return { correct: valid && Number(typed) === expected, digitsCorrect: valid ? countCorrectDigits(expected, Number(typed)) : 0,
          digitsPossible: Math.max(1, String(Math.abs(expected)).length) };
      },
    };
    return module.exports;
  })();
  CHECK_ADAPTERS["missing_number"] = (function () {
    var module = { exports: {} };
    // Check adapter: Missing Number (an equation with one blank; type the number).
    // App source of truth (student_analytics_module.js, the Assessment Center):
    //   the Missing Number runner (~9646-9800): the form's display string, e.g.
    //   "__ + 8 = 14", with the typed answer shown in the blank; correct =
    //   parseInt(typed) === problem.answer; one try, no feedback; a Skip button;
    //   120 seconds; the result is the count of correct answers.
    //   Forms: MISSING_NUMBER_PROBES in psychometric_math_probes.json. They are
    //   missing-addend equations; the title is the app's own name for the measure.
    module.exports = {
      id: 'missing_number',
      title: 'Missing Number',
      labels: {
        missing_number_directions: 'Type the missing number.',
        missing_number_question: 'What number is missing?',
        missing_number_blank: 'blank',
        missing_number_label: '{problem}. Type the missing number.',
      },
      // p: { display: "__ + 8 = 14", answer: 6 } as in the form bank.
      prepare: function (p) {
        p = p || {};
        var display = String(p.display == null ? '' : p.display).replace(/\s+/g, ' ').trim();
        if (!display || display.length > 40 || (display.match(/_{2,}/g) || []).length !== 1) return { missing: ['a problem with one blank written as __'] };
        if (p.answer == null || p.answer === '' || !Number.isSafeInteger(Number(p.answer)) || Math.abs(Number(p.answer)) > 99999999) return { missing: ['a whole-number answer'] };
        return { item: { word: display, display: display, answer: String(Number(p.answer)) } };
      },
      render: function (item, ctx) {
        // The blank shows what is being typed.
        var blank = ctx.el('span', { class: 'blank', text: '?' });
        var pieces = String(item.display).split(/(_{2,})/).filter(function (part) { return part !== ''; }).map(function (part) { return /^_{2,}$/.test(part) ? blank : part; });
        var pad = ctx.keypad({
          label: ctx.fmt(ctx.L.missing_number_label, { problem: String(item.display).replace(/_{2,}/, ctx.L.missing_number_blank) }),
          onChange: function (value) { blank.textContent = value || '?'; },
          onNext: function (value) { ctx.answer(value); },
        });
        ctx.root.appendChild(ctx.el('p', { class: 'letters', style: 'text-align:center', text: ctx.L.missing_number_question }));
        ctx.root.appendChild(ctx.el('p', { class: 'prompt', 'aria-hidden': 'true' }, pieces));
        ctx.root.appendChild(pad.node);
        pad.focus();
        return {
          // Practice items only: lock the keys and show the number in the blank.
          reveal: function (answer) { pad.lock(); if (answer != null) blank.textContent = String(answer); },
        };
      },
      score: function (item, answer, response) {
        var typed = String(response == null ? '' : response);
        return { correct: /^-?[0-9]+$/.test(typed) && Number(typed) === Number(answer), digitsCorrect: null, digitsPossible: null };
      },
    };
    return module.exports;
  })();
  CHECK_ADAPTERS["quantity_discrimination"] = (function () {
    var module = { exports: {} };
    // Check adapter: Quantity Discrimination (two numbers; tap the bigger one).
    // App source of truth (student_analytics_module.js, the Assessment Center):
    //   the QD runner (~9918-10046): "Which number is bigger?", two buttons,
    //   correct = the chosen number === problem.answer, one try, no feedback;
    //   60 seconds; the result is the count of correct answers.
    //   Forms: QUANTITY_DISCRIMINATION_PROBES in psychometric_math_probes.json.
    // The title is the app's own name for the measure.
    // A check adapter has three halves: prepare (when the file is built), and
    // render and score (copied into the file with toString, so they may use only
    // their arguments). The answer never reaches render in a scored item.
    module.exports = {
      id: 'quantity_discrimination',
      title: 'Quantity Discrimination',
      labels: {
        quantity_discrimination_directions: 'Tap the bigger number.',
        quantity_discrimination_question: 'Which number is bigger?',
        quantity_discrimination_practice_wrong: 'Not quite. The bigger number is {answer}.',
      },
      // p: { left, right } as in the form bank. The answer is worked out here; a
      // form whose own answer disagrees is refused.
      prepare: function (p) {
        p = p || {};
        var whole = function (v) { return v != null && v !== '' && Number.isSafeInteger(Number(v)) && Math.abs(Number(v)) <= 99999999; };
        if (!whole(p.left) || !whole(p.right)) return { missing: ['two whole numbers'] };
        var left = Number(p.left), right = Number(p.right);
        if (left === right) return { missing: ['two different numbers'] };
        var bigger = Math.max(left, right);
        if (p.answer != null && Number(p.answer) !== bigger) return { missing: ['an answer that is the bigger number'] };
        return { item: { word: left + ' or ' + right, left: left, right: right, answer: String(bigger) } };
      },
      render: function (item, ctx) {
        var buttons = [];
        var make = function (value) {
          var b = ctx.el('button', { type: 'button', 'data-choice': String(value), on: { click: function () { ctx.answer(String(value)); } }, text: String(value) });
          buttons.push(b);
          return ctx.el('li', {}, [b]);
        };
        ctx.root.appendChild(ctx.el('p', { class: 'letters', style: 'text-align:center', text: ctx.L.quantity_discrimination_question }));
        ctx.root.appendChild(ctx.el('ul', { class: 'pair' }, [make(item.left), make(item.right)]));
        // Keys 1 and 2 pick the first and the second number.
        ctx.keys(function (key) {
          if (key !== '1' && key !== '2') return false;
          ctx.answer(String(key === '1' ? item.left : item.right));
          return true;
        });
        return {
          // Practice items only: lock the two buttons and mark the bigger number.
          reveal: function (answer) {
            buttons.forEach(function (b) {
              b.setAttribute('aria-disabled', 'true');
              if (answer != null && b.getAttribute('data-choice') === String(answer)) b.classList.add('right');
            });
          },
        };
      },
      score: function (item, answer, response) {
        var chosen = String(response == null ? '' : response);
        return { correct: chosen !== '' && chosen === String(answer), digitsCorrect: null, digitsPossible: null };
      },
    };
    return module.exports;
  })();
  // END GENERATED CHECK ADAPTERS

  // ---------------------------------------------------------------------------
  // Building the lesson (runs in the app)
  // ---------------------------------------------------------------------------
  function bankUri(bank, key) {
    try { var value = bank && bank[key]; return typeof value === 'string' && /^data:audio\//i.test(value) ? value : null; } catch (_) { return null; }
  }
  function imageUri(value) {
    if (typeof value !== 'string') return null;
    return /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,[a-z0-9+/=\s]+$/i.test(value) && value.length < 1500000 ? value : null;
  }

  // Build the learner lesson from a prepared pack by ALLOWLIST: each adapter
  // copies only the fields and clips its activity plays. Nothing else in the
  // pack (other answers, review data, provenance, learner data) can reach the
  // file, because nothing else is copied.
  function lessonFromPack(words, options) {
    var opts = options || {};
    var core = opts.core;
    if (!core || typeof core.soundAnswerMatches !== 'function') throw new Error('lessonFromPack needs WS_CORE');
    var adapters = Object.assign({}, ADAPTERS, opts.adapters || {});
    var activities = (Array.isArray(opts.activities) && opts.activities.length ? opts.activities : ['isolation'])
      .filter(function (id, i, all) { return adapters[id] && all.indexOf(id) === i; });
    var banks = opts.banks || {};
    var isEnglish = opts.isEnglish !== false;
    var audio = {}, byUri = {}, images = {}, byImage = {};
    var addAudio = function (uri) {
      if (!uri) return null;
      if (byUri[uri]) return byUri[uri];
      var id = 'a' + Object.keys(audio).length;
      audio[id] = uri; byUri[uri] = id;
      return id;
    };
    var addImage = function (uri) {
      var safe = imageUri(uri);
      if (!safe) return null;
      if (byImage[safe]) return byImage[safe];
      var id = 'm' + Object.keys(images).length;
      images[id] = safe; byImage[safe] = id;
      return id;
    };
    var assets = core.packAudioAssets(words);
    // Pictures by word, pack-wide, with the player's precedence: a row's own
    // image wins over the shared _decodingAssets/_aacAssets manifest.
    var pictures = {};
    (Array.isArray(words) ? words : []).forEach(function (w) {
      [w && w._decodingAssets, w && w._aacAssets].forEach(function (bucket) {
        if (bucket && typeof bucket === 'object' && !Array.isArray(bucket)) Object.keys(bucket).forEach(function (k) { if (typeof bucket[k] === 'string') pictures[k.trim().toLowerCase()] = bucket[k]; });
      });
    });
    (Array.isArray(words) ? words : []).forEach(function (w) {
      var key = str(w && (w.targetWord || w.word || w.term)).trim().toLowerCase();
      if (key && w && typeof w.image === 'string' && w.image && w.image.indexOf('ref::') !== 0) pictures[key] = w.image;
    });
    var packUri = function (text) {
      var asset = assets[core.packAudioKey(text)];
      if (!asset) return null;
      if (typeof asset === 'string') return /^data:audio\/[a-z0-9.+-]+(;[^,]*)?,/i.test(asset) ? asset : null;
      if (!core.portablePackAsset(asset)) return null;
      return 'data:' + asset.mime.trim().toLowerCase() + ';base64,' + asset.base64.replace(/\s+/g, '');
    };
    var env = {
      core: core,
      isEnglish: isEnglish,
      ordinalKeys: ORDINAL_KEYS,
      label: function (value) { return core.phonemeLabel(value, isEnglish); },
      uniqueLabels: function (values) {
        var out = [];
        (Array.isArray(values) ? values : []).forEach(function (v) { var l = core.phonemeLabel(v, isEnglish); if (l && out.indexOf(l) < 0) out.push(l); });
        return out;
      },
      // A prepared recording from the pack, keyed by its text (a word, a
      // prompt, a sentence). The whole pack's recordings are searched, so
      // answer choices that are other lesson words resolve too.
      packClip: function (text) { return addAudio(packUri(text)); },
      wordClip: function (text) { return addAudio(packUri(text) || bankUri(banks.words, core.packAudioKey(text))); },
      bankClip: function (category, key) { return addAudio(bankUri(banks[category], key)); },
      phonemeClip: function (label) {
        var candidates = core.phonemeBankCandidates(label);
        for (var i = 0; i < candidates.length; i++) { var uri = bankUri(banks.phonemes, candidates[i]); if (uri) return addAudio(uri); }
        return null;
      },
      image: addImage,
      // The raw picture for a word (data: URI or base64), or null. Pass it
      // through image() to embed it; an http(s) URL cannot travel offline.
      packImage: function (text) { var v = pictures[str(text).trim().toLowerCase()]; return typeof v === 'string' && v ? v : null; },
      // The whole pack, read-only, for boards the app validates against every
      // lesson word (Sound Sort, Rhyme Time). Copy nothing from it you do not play.
      packWords: Array.isArray(words) ? words.slice() : [],
      language: str(opts.language || 'en'),
      // A prepared recording that lives inside a board (a teacher's syllable
      // recordings), given as a data: URI. Embedded only if it is audio.
      recordingClip: function (dataUri) {
        var v = typeof dataUri === 'string' ? dataUri : '';
        return /^data:audio\/[a-z0-9.+-]+(;[^,]*)?,/i.test(v) && v.length < 1400000 ? addAudio(v) : null;
      },
    };
    var blocks = [];
    var exceptions = [];
    activities.forEach(function (id) {
      var adapter = adapters[id];
      var items = [];
      var seen = {};
      (Array.isArray(words) ? words : []).forEach(function (w) {
        if (!w || items.length >= MAX_ITEMS) return;
        var word = str(w.targetWord || w.word || w.term).trim();
        var key = core.packAudioKey(word);
        if (!word || seen[key]) return;
        seen[key] = true;
        var made;
        try { made = adapter.prepare(w, Object.assign({ word: word }, env)); } catch (_) { made = { missing: ['board'] }; }
        if (!made || !made.item) { exceptions.push({ activity: id, word: word, missing: (made && made.missing) || ['board'] }); return; }
        items.push(Object.assign({ id: id + '-' + items.length, word: word }, made.item));
      });
      if (items.length) blocks.push({ activity: id, items: items });
    });
    var feedback = { correct: [], retry: null };
    FEEDBACK_CORRECT.forEach(function (k) { var c = env.bankClip('instructions', k); if (c) feedback.correct.push(c); });
    feedback.retry = env.bankClip('instructions', FEEDBACK_RETRY);
    // Keep only the clips and pictures a shipped item or the feedback uses:
    // a word that was left out may already have looked some up.
    var used = {};
    var walk = function (value) {
      if (typeof value === 'string') { if (audio[value] || images[value]) used[value] = true; return; }
      if (value && typeof value === 'object') Object.keys(value).forEach(function (k) { walk(value[k]); });
    };
    walk(blocks); walk(feedback);
    Object.keys(audio).forEach(function (id) { if (!used[id]) delete audio[id]; });
    Object.keys(images).forEach(function (id) { if (!used[id]) delete images[id]; });
    var title = str(opts.title).trim().slice(0, 120) || DEFAULT_LABELS.title;
    var content = { title: title, showLetters: !!opts.showLetters, blocks: blocks };
    var lesson = {
      schema: LESSON_SCHEMA,
      player: PLAYER,
      lessonId: str(opts.lessonId) || randomId(),
      revision: 'r' + hashText(JSON.stringify(content) + Object.keys(audio).map(function (k) { return audio[k].length; }).join(',')),
      createdAt: new Date().toISOString(),
      language: 'en',
      title: title,
      showLetters: !!opts.showLetters,
      activityTitles: blocks.reduce(function (acc, b) { acc[b.activity] = adapters[b.activity].title; return acc; }, {}),
      blocks: blocks,
      feedback: feedback,
      audio: audio,
      images: images,
      // Only a Google Apps Script web app can be a send target: that is all
      // the file's network policy allows, and all a Class Mailbox ever is.
      submit: opts.submit && /^https:\/\/script\.google\.com\/(?:a\/macros\/[A-Za-z0-9.-]+\/|macros\/)s\/[A-Za-z0-9_-]+\/exec$/.test(str(opts.submit.url)) && /^PK-[0-9a-f-]{36}$/i.test(str(opts.submit.packId))
        ? { url: str(opts.submit.url), packId: str(opts.submit.packId), secret: str(opts.submit.secret).slice(0, 64), expiresAt: str(opts.submit.expiresAt).slice(0, 40) } : null,
    };
    var ready = blocks.reduce(function (n, b) { return n + b.items.length; }, 0);
    var perActivity = activities.map(function (id) {
      var block = blocks.filter(function (b) { return b.activity === id; })[0];
      return { activity: id, title: adapters[id].title, ready: block ? block.items.length : 0, exceptions: exceptions.filter(function (e) { return e.activity === id; }) };
    });
    return { lesson: lesson, exceptions: exceptions, ready: ready, total: ready + exceptions.length, perActivity: perActivity };
  }

  // JSON inside a <script> block: no "</script>", no line separators.
  function safeJson(value) {
    return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  }
  function escapeHtml(value) {
    return str(value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  var CSS = [
    ':root{--bg:#f6f7fb;--card:#fff;--ink:#1d2433;--muted:#4a5468;--accent:#3d3aa8;--accent-ink:#fff;--ok:#1d6b3a;--ok-bg:#e3f4e9;--warn:#8a4b00;--warn-bg:#fff1dc;--line:#c9cede;--focus:#b54700}',
    '@media (prefers-color-scheme:dark){:root{--bg:#141824;--card:#1f2535;--ink:#eef1f8;--muted:#b7bfd2;--accent:#a9a7ff;--accent-ink:#141824;--ok:#8fe0ab;--ok-bg:#163423;--warn:#ffc77a;--warn-bg:#3a2a12;--line:#3a4258;--focus:#ffb070}}',
    '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:18px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}',
    'main{max-width:760px;margin:0 auto;padding:24px 16px 48px}h1{font-size:1.6rem;margin:0 0 12px}h2{font-size:1.3rem;margin:0 0 12px}',
    '.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px;margin:16px 0}',
    'button{font:inherit;min-height:48px;min-width:48px;padding:10px 18px;border-radius:12px;border:2px solid var(--accent);background:var(--card);color:var(--ink);cursor:pointer}',
    'button.primary{background:var(--accent);color:var(--accent-ink)}button:disabled,button[aria-disabled=true]{opacity:.55;cursor:not-allowed}',
    'button[aria-pressed=true]{outline:3px solid var(--accent);outline-offset:2px}',
    ':focus-visible{outline:3px solid var(--focus);outline-offset:3px}h2[tabindex="-1"]:focus{outline:none}',
    '.row{display:flex;flex-wrap:wrap;gap:12px;align-items:center}.choices{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;list-style:none;padding:0;margin:16px 0}',
    '.choice{border:2px solid var(--line);border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:8px}.choice.tried{border-style:dashed}.choice.right{border-color:var(--ok);background:var(--ok-bg)}.choice.solo{border-color:transparent}.choice.solo.tried{border-color:var(--line)}.choice.solo.right{border-color:var(--ok)}',
    '.slots{display:flex;flex-wrap:wrap;gap:10px;list-style:none;padding:0;margin:16px 0}.slot{min-width:64px;min-height:64px;border:2px dashed var(--line);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:700}',
    '.picture{max-width:160px;max-height:160px;border-radius:12px}',
    '.letters{font-size:1.5rem;font-weight:700}.status{min-height:1.5em;margin:12px 0;padding:8px 12px;border-radius:10px}.status.ok{background:var(--ok-bg);color:var(--ok)}.status.warn{background:var(--warn-bg);color:var(--warn)}',
    'label{display:block;margin:12px 0 4px;font-weight:600}input{font:inherit;width:100%;max-width:360px;min-height:48px;padding:8px 12px;border-radius:10px;border:2px solid var(--line);background:var(--card);color:var(--ink)}',
    '.about ul{margin:0;padding-inline-start:20px}.about li{margin:8px 0;overflow-wrap:anywhere}',
    '.muted{color:var(--muted)}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
    '@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}',
  ].join('\n');

  // ---------------------------------------------------------------------------
  // The player shell (runs INSIDE the downloaded file). Self-contained: it
  // uses only its parameters. `matches` is WS_CORE.soundAnswerMatches and
  // `renders` maps activity id -> adapter.render, all embedded verbatim.
  // ---------------------------------------------------------------------------
  // `kit` = { csv: packetCsv, hash: hashText, mailbox: takeHomeMailbox | null }.
  function takeHomeShell(doc, win, lesson, L, matches, renders, kit) {
    var storageKey = 'alloflow-take-home:' + lesson.lessonId + ':' + lesson.revision;
    var manifest = {};
    try { manifest = JSON.parse(doc.getElementById('packet-manifest').textContent) || {}; } catch (_) {}
    var sendNow = kit.mailbox ? kit.mailbox(win, lesson.submit) : null;
    var main = doc.getElementById('app');
    var live = doc.getElementById('live');
    var storeOk = true;
    var state = null;
    var audioEl = null;
    var screenId = 0;
    var namePrompted = false;
    var items = [];
    lesson.blocks.forEach(function (block) { block.items.forEach(function (item, i) { items.push({ activity: block.activity, item: item, n: i + 1, total: block.items.length }); }); });
    var fmt = function (template, params) {
      return String(template || '').replace(/\{(\w+)\}/g, function (m, k) { return params && params[k] != null ? params[k] : m; });
    };
    var announce = function (text) { live.textContent = ''; win.setTimeout(function () { live.textContent = text; }, 30); };
    var el = function (tag, attrs, children) {
      var node = doc.createElement(tag);
      Object.keys(attrs || {}).forEach(function (k) {
        if (k === 'text') node.textContent = attrs[k];
        else if (k === 'on') Object.keys(attrs.on).forEach(function (ev) { node.addEventListener(ev, attrs.on[ev]); });
        else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
      });
      (children || []).forEach(function (c) { if (c) node.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
      return node;
    };
    var fresh = function () {
      return { name: '', index: 0, startedAt: null, finishedAt: null, savedFile: null, sent: null,
        items: items.map(function (e) { return { itemId: e.item.id, activity: e.activity, responses: [], attempts: 0, firstTry: false, correct: false, done: false, supports: {} }; }) };
    };
    var save = function () {
      try { win.localStorage.setItem(storageKey, JSON.stringify(state)); storeOk = true; } catch (_) { storeOk = false; }
    };
    var load = function () {
      try {
        var raw = win.localStorage.getItem(storageKey);
        var parsed = raw && JSON.parse(raw);
        if (parsed && Array.isArray(parsed.items) && parsed.items.length === items.length) return parsed;
      } catch (_) { storeOk = false; }
      return null;
    };
    var uuid = function () {
      try { if (win.crypto && win.crypto.randomUUID) return win.crypto.randomUUID(); } catch (_) {}
      var h = '0123456789abcdef', s = '', bytes = null;
      try { bytes = win.crypto.getRandomValues(new win.Uint8Array(36)); } catch (_) {}
      for (var i = 0; i < 36; i++) s += (i === 8 || i === 13 || i === 18 || i === 23) ? '-' : h[(bytes ? bytes[i] : Math.floor(Math.random() * 256)) & 15];
      return s;
    };
    // Local wall clock with its UTC offset, e.g. 2026-11-12T09:14:05-05:00.
    var localIso = function (d) {
      var p = function (n) { return (n < 10 ? '0' : '') + n; };
      var off = -d.getTimezoneOffset(), abs = Math.abs(off);
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
        + (off < 0 ? '-' : '+') + p(Math.floor(abs / 60)) + ':' + p(abs % 60);
    };
    // Time on one item: from its being shown to its being done, not counting
    // time the tab was hidden. Kept in memory, so a reload starts the count again.
    var now = function () { try { return win.performance.now(); } catch (_) { return Date.now(); } };
    var clock = null;
    var clockLap = function () {
      if (!clock || clock.from == null) return;
      var t = now();
      clock.ms += Math.max(0, t - clock.from); clock.from = t;
      clock.rec.ms = Math.round(clock.ms);
    };
    var clockStart = function (rec) { clock = { rec: rec, ms: 0, from: doc.hidden ? null : now() }; };
    var clockStop = function () { clockLap(); clock = null; };
    doc.addEventListener('visibilitychange', function () {
      if (!clock) return;
      if (doc.hidden) { clockLap(); clock.from = null; } else if (clock.from == null) clock.from = now();
    });
    // ONE audio element for every clip: iPad/iPhone Safari lets an element play
    // without a tap only after a tap has played it once, so a new element per
    // clip could stay silent after the first clip of a sequence. A clip cut off
    // by another (playToken moved on) never settles.
    var playToken = 0;
    var stop = function () { playToken++; if (audioEl) { try { audioEl.pause(); } catch (_) {} } };
    // rate: optional playback speed (e.g. 0.5 for "Hear it slowly").
    var play = function (id, rate) {
      stop();
      var src = id && lesson.audio[id];
      if (!src) return Promise.resolve(false);
      var mine = playToken;
      if (!audioEl) { try { audioEl = new win.Audio(); } catch (_) { return Promise.resolve(false); } }
      var a = audioEl;
      return new Promise(function (resolve) {
        var settle = function (ok) { if (mine !== playToken) return; a.onended = a.onerror = null; resolve(ok); };
        a.onended = function () { settle(true); };
        a.onerror = function () { settle(false); };
        var speed = rate > 0 ? rate : 1;
        var p;
        try {
          a.src = src;
          try { a.defaultPlaybackRate = speed; a.playbackRate = speed; } catch (_) {}
          p = a.play();
        } catch (_) { settle(false); return; }
        if (p && p.catch) p.catch(function () { settle(false); });
      }).then(function (ok) {
        if (!ok && mine === playToken) announce(L.audio_missing);
        return ok;
      });
    };
    // A sequence belongs to the screen that started it: moving on cancels it.
    // Its first clip starts at once, inside the tap that asked for it (Safari).
    var playAll = function (ids) {
      var mine = screenId;
      var step = function (id) { return mine === screenId && id ? play(id) : false; };
      var list = ids || [];
      if (!list.length) return Promise.resolve(true);
      return list.slice(1).reduce(function (chain, id) {
        return chain.then(function () { return step(id); });
      }, Promise.resolve(step(list[0])));
    };
    var keyItem = null;
    // Keyboard on an item screen: 1-9 picks that answer choice (the answer
    // button of the nth li.choice the adapter drew), R plays the question again.
    // Never while typing in a field, and never with Ctrl/Alt/Cmd.
    doc.addEventListener('keydown', function (e) {
      if (!keyItem || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      var t = e.target, tag = t && t.tagName ? String(t.tagName).toUpperCase() : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      var key = String(e.key || ''), code = String(e.code || '');
      var digit = /^[1-9]$/.test(key) ? key : (/^(?:Digit|Numpad)([1-9])$/.exec(code) || [])[1];
      if (digit) {
        var box = keyItem.area.querySelectorAll('li.choice')[Number(digit) - 1];
        var button = box && (box.querySelector('button.primary') || box.querySelector('button'));
        if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
        e.preventDefault();
        button.click();
      } else if (key === 'r' || key === 'R' || (code === 'KeyR' && !/^[a-z]$/i.test(key))) {
        var it = keyItem.item;
        var ids = it.introAudio && it.introAudio.length ? it.introAudio : [it.promptAudio || it.prompt];
        if (!ids.filter(Boolean).length) return;
        e.preventDefault();
        keyItem.replay();
        playAll(ids);
      }
    });
    var screen = function (heading, nodes, hideHeading) {
      screenId++;
      stop();
      clockStop();
      keyItem = null;
      main.textContent = '';
      // hideHeading: the page title already shows it; screen readers still hear it.
      var h = el('h2', hideHeading ? { tabindex: '-1', class: 'sr', text: heading } : { tabindex: '-1', text: heading });
      main.appendChild(h);
      nodes.forEach(function (n) { if (n) main.appendChild(n); });
      h.focus();
    };
    var statusLine = function (text, tone) { return el('p', { class: 'status' + (tone ? ' ' + tone : ''), role: 'status', text: text }); };
    var activityTitle = function (id) { return L[id + '_title'] || (lesson.activityTitles && lesson.activityTitles[id]) || id; };
    // "About this file": the manifest block, in plain words.
    var about = function () {
      var m = manifest, saves = m.saves || [], net = m.network && m.network.sendsTo;
      var texts = [
        L.about_what,
        fmt(L.about_engine, { engine: m.engine || '' }),
        fmt(L.about_stores, { key: (m.stores && m.stores[0] && m.stores[0].key) || storageKey }),
        fmt(L.about_saves, { csv: (saves[0] && saves[0].file) || '.csv', json: (saves[1] && saves[1].file) || '.json' }),
        net ? fmt(L.about_mailbox, { host: net }) : L.about_no_network,
        L.about_never,
        L.about_check,
        fmt(L.about_rules, { csp: m.csp || '' }),
        fmt(L.about_licence, { licence: m.licence || '' }),
        m.attributions && m.attributions.length ? fmt(L.about_credits, { list: m.attributions.join('; ') }) : '',
      ];
      if (check) texts = check.about(texts);
      var panel = el('div', { class: 'card about', id: 'about-panel', hidden: true, 'data-about': '' }, [
        el('ul', {}, texts.filter(Boolean).map(function (t) { return el('li', { text: t }); })),
      ]);
      var button = el('button', { type: 'button', 'data-about-open': '', 'aria-expanded': 'false', 'aria-controls': 'about-panel', on: { click: function () {
        panel.hidden = !panel.hidden;
        button.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
      } }, text: L.about_button });
      return { button: button, panel: panel };
    };

    var renderStart = function () {
      var prior = load();
      if (check && check.resume(prior)) return;
      // A teacher can hand out the file with the label filled in: file.html#learner=BlueHeron7
      var given = '';
      try { var hashed = /(?:^#|&)learner=([^&]*)/.exec(String(win.location.hash || '')); if (hashed) given = decodeURIComponent(hashed[1]).trim().slice(0, 60); } catch (_) {}
      var nameInput = el('input', { id: 'learner-name', type: 'text', autocomplete: 'off', maxlength: '60' });
      var resumable = prior && prior.index > 0 && !prior.finishedAt;
      // No name: ask once (per opening of the file), gently; a name stays optional.
      var promptKeep = false;
      var promptText = el('p', { id: 'name-prompt-text', tabindex: '-1', style: 'margin:0 0 8px', text: L.name_prompt });
      var namePrompt = el('div', { class: 'status warn', role: 'group', 'aria-labelledby': 'name-prompt-text', hidden: true, 'data-name-prompt': '' }, [
        promptText,
        el('div', { class: 'row' }, [
          el('button', { type: 'button', 'data-name-prompt-add': '', on: { click: function () { namePrompt.hidden = true; nameInput.focus(); } }, text: L.name_prompt_add }),
          el('button', { type: 'button', 'data-name-prompt-skip': '', on: { click: function () { begin(promptKeep); } }, text: L.name_prompt_skip }),
        ]),
      ]);
      var begin = function (keep) {
        var typed = String(nameInput.value || (keep && prior ? prior.name : '') || '').trim();
        if (!typed && !namePrompted) {
          namePrompted = true; promptKeep = keep;
          namePrompt.hidden = false; promptText.focus();
          return;
        }
        state = keep && prior ? prior : fresh();
        state.name = typed.slice(0, 60);
        if (!state.startedAt) { var began = new Date(); state.startedAt = began.toISOString(); state.startedLocal = localIso(began); }
        if (!state.sessionId) state.sessionId = uuid();
        save();
        if (check) check.begin(prior); else renderItem();
      };
      var buttons = [el('button', { class: 'primary', type: 'button', on: { click: function () { begin(false); } }, text: resumable ? L.start_over : L.start })];
      if (resumable) buttons.unshift(el('button', { class: 'primary', type: 'button', on: { click: function () { begin(true); } }, text: L.continue }));
      if (given) nameInput.value = given;
      else if (prior && prior.name) nameInput.value = prior.name;
      var info = about();
      buttons.push(info.button);
      screen(lesson.title, [
        el('div', { class: 'card' }, [
          el('p', { text: L.intro }),
          el('label', { for: 'learner-name', text: L.learner_label }), nameInput, namePrompt,
          el('div', { class: 'row', style: 'margin-top:16px' }, buttons),
        ]),
      ], true);
      main.appendChild(info.panel);
    };

    var renderItem = function () {
      if (state.index >= items.length) { renderFinish(); return; }
      var entry = items[state.index];
      var item = entry.item;
      var rec = state.items[state.index];
      var render = renders[entry.activity];
      var feedback = statusLine('', '');
      var area = el('div', {});
      var handle = null;
      var nextButton = el('button', { class: 'primary', type: 'button', hidden: true, on: { click: function () { state.index++; save(); renderItem(); } },
        text: state.index === items.length - 1 ? L.finish : L.next });
      var finishPractice = function () {
        clockStop();
        rec.done = true; rec.correct = false; rec.firstTry = false;
        save();
        if (handle && typeof handle.reveal === 'function') { try { handle.reveal(null); } catch (_) {} }
        nextButton.hidden = false;
        nextButton.focus();
      };
      var finishItem = function (correct) {
        clockStop();
        rec.done = true; rec.correct = correct; rec.firstTry = correct && rec.attempts === 1;
        save();
        if (handle && typeof handle.reveal === 'function') { try { handle.reveal(correct); } catch (_) {} }
        nextButton.hidden = false;
        nextButton.focus();
      };
      var ctx = {
        root: area, el: el, fmt: fmt, L: L, item: item, matches: matches, showLetters: !!lesson.showLetters,
        play: play, playAll: playAll, stop: stop, announce: announce,
        image: function (id) { return (id && lesson.images && lesson.images[id]) || null; },
        ordinal: function (p) { return (L.ordinals && L.ordinals[p]) || String(p + 1); },
        support: function (name) { rec.supports[name] = (rec.supports[name] || 0) + 1; save(); },
        isDone: function () { return rec.done; },
        attempts: function () { return rec.attempts; },
        // Practice that is never scored (Letter Trace): 'traced' or 'skipped'.
        practice: function (status, text) {
          if (rec.done) return;
          rec.attempts++;
          rec.responses.push(status === 'skipped' ? 'skipped' : 'traced');
          rec.practice = status === 'skipped' ? 'skipped' : 'traced';
          feedback.className = 'status ok'; feedback.textContent = text || '';
          finishPractice();
        },
        // Grade one response. Returns 'correct', 'retry' (try again) or 'missed'
        // (attempts used up). The shell handles feedback, sounds and Next.
        answer: function (response, isCorrect, options) {
          if (rec.done) return rec.correct ? 'correct' : 'missed';
          var o = options || {};
          var max = Number(item.maxAttempts) > 0 ? Number(item.maxAttempts) : 2;
          rec.attempts++;
          rec.responses.push(typeof response === 'string' ? response.slice(0, 80) : JSON.stringify(response).slice(0, 200));
          if (isCorrect) {
            feedback.className = 'status ok'; feedback.textContent = o.correctText || L.correct;
            var praise = lesson.feedback.correct;
            finishItem(true);
            play(praise.length ? praise[state.index % praise.length] : null);
            return 'correct';
          }
          if (rec.attempts < max) {
            feedback.className = 'status warn'; feedback.textContent = o.retryText || L.try_again;
            save();
            play(lesson.feedback.retry);
            return 'retry';
          }
          feedback.className = 'status warn'; feedback.textContent = o.missedText || L.missed;
          finishItem(false);
          playAll(item.answerAudio || []);
          return 'missed';
        },
      };
      screen(fmt(L.item_of, { activity: activityTitle(entry.activity), n: entry.n, total: entry.total }), [
        el('div', { class: 'card' }, [area, feedback, nextButton]),
      ]);
      keyItem = { area: area, item: item, replay: function () { ctx.support('questionReplays'); } };
      try { handle = render(item, ctx) || null; } catch (err) { area.appendChild(statusLine(L.audio_missing, 'warn')); }
      // Reopened on an answered item: show its outcome, do not ask again.
      if (rec.done) { if (rec.practice) finishPractice(); else finishItem(rec.correct); }
      else {
        // Shown before in an earlier opening of the file: the time counts from now.
        if (rec.shown) rec.flag = 'resumed';
        rec.shown = true; rec.ms = 0;
        clockStart(rec);
        save();
        playAll(item.introAudio || []);
      }
    };

    // The integrity value detects accidental edits, not deliberate ones: FNV-1a
    // at once, replaced by SHA-256 when the browser has made it (renderFinish).
    var sealed = null;
    var resultFile = function () {
      var out = {
        kind: 'alloflow-take-home-result', schemaVersion: 3, player: lesson.player, sessionId: state.sessionId || '',
        packet: { id: lesson.lessonId, version: lesson.revision, engine: 'alloflow-packet/1', form: '', mode: 'practice' },
        lessonId: lesson.lessonId, revision: lesson.revision, lessonTitle: lesson.title, activityTitles: lesson.activityTitles || {},
        learner: state.name, learnerName: state.name, startedAt: state.startedAt, finishedAt: state.finishedAt,
        startedLocal: state.startedLocal || (state.startedAt ? localIso(new Date(state.startedAt)) : ''),
        finishedLocal: state.finishedLocal || (state.finishedAt ? localIso(new Date(state.finishedAt)) : ''),
        durationMs: Math.max(0, Date.parse(state.finishedAt) - Date.parse(state.startedAt)) || 0, timesAreFromTheLearnerDevice: true,
        items: items.map(function (e, i) {
          var r = state.items[i];
          return { n: i + 1, itemId: e.item.id, activity: e.activity, word: e.item.word, target: e.item.target != null ? e.item.target : null,
            responses: r.responses.slice(), attempts: r.attempts, firstTry: r.firstTry, correct: r.correct, done: r.done, ms: r.ms || 0,
            supports: r.supports, practice: r.practice || null, flag: r.flag || '' };
        }),
      };
      if (check) check.result(out);
      var table = kit.csv(out);
      out.summary = out.summary || summarize();
      Object.keys(table.summary).forEach(function (k) { out.summary[k] = table.summary[k]; });
      if (!sealed || sealed.basis !== table.basis) sealed = { basis: table.basis, method: 'fnv1a', value: kit.hash(table.basis) };
      out.integrity = { method: sealed.method, value: sealed.value, note: 'detects accidental edits, not deliberate ones' };
      return out;
    };
    var seal = function () {
      resultFile();
      var mine = sealed;
      try {
        win.crypto.subtle.digest('SHA-256', new win.TextEncoder().encode(mine.basis)).then(function (buffer) {
          var bytes = new win.Uint8Array(buffer), hex = '';
          for (var i = 0; i < bytes.length; i++) hex += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
          mine.method = 'sha256'; mine.value = hex;
        }, function () {});
      } catch (_) {}
    };
    var summarize = function () {
      var s = { items: 0, done: 0, firstTry: 0, afterRetry: 0, missed: 0, practised: 0 };
      state.items.forEach(function (r, i) {
        // Practice items (Letter Trace) are counted apart and never scored.
        if (r.practice || (items[i] && items[i].activity === 'letter_tracing')) { if (r.done) s.practised++; return; }
        s.items++;
        if (!r.done) return; s.done++; if (r.firstTry) s.firstTry++; else if (r.correct) s.afterRetry++; else s.missed++;
      });
      return s;
    };
    // The submission id is kept per attempt, so a retry is recognised by the
    // mailbox instead of filed twice.
    var send = function () {
      if (!state.sendSid) { state.sendSid = 'SUB-' + uuid(); save(); }
      return sendNow(state.sendSid, JSON.stringify({ kind: 'alloflow-take-home-submission', schemaVersion: 1, studentName: String(state.name || 'Student').slice(0, 80),
        submissionDate: state.finishedAt, takeHomeResult: resultFile() }));
    };
    var renderFinish = function () {
      if (!state.finishedAt) { var ended = new Date(); state.finishedAt = ended.toISOString(); state.finishedLocal = localIso(ended); save(); }
      seal();
      var s = summarize();
      var fileStatus = statusLine(state.sent ? fmt(L.sent, { receipt: state.sent }) : state.savedFile ? fmt(L.saved_file, { file: state.savedFile }) : (storeOk ? L.saved_device : L.saved_device_off),
        state.sent || state.savedFile ? 'ok' : (storeOk ? '' : 'warn'));
      // Older iPad Safari (before iOS 13) cannot download: show the results as
      // text to copy instead of a button that does nothing.
      var copyBox = el('div', { hidden: true, 'data-results-text': '' });
      var showText = function (label, value) {
        var text = el('textarea', { id: 'results-text', readonly: true, rows: '8', style: 'width:100%;font:inherit;font-size:.8rem;border-radius:10px', on: { focus: function () { try { text.select(); } catch (_) {} } } });
        text.value = value;
        copyBox.textContent = '';
        copyBox.appendChild(el('label', { for: 'results-text', text: label }));
        copyBox.appendChild(text);
        copyBox.hidden = false;
        text.focus();
      };
      var saveAs = function (name, body, type) {
        var a = el('a', { download: name });
        if (!('download' in a) || !win.Blob || !win.URL || !win.URL.createObjectURL) { showText(L.copy_results, body.charCodeAt(0) === 0xFEFF ? body.slice(1) : body); return; }
        var url = win.URL.createObjectURL(new win.Blob([body], { type: type }));
        a.setAttribute('href', url);
        doc.body.appendChild(a); a.click(); a.remove();
        win.setTimeout(function () { win.URL.revokeObjectURL(url); }, 60000);
        state.savedFile = name; save();
        if (!state.sent) { fileStatus.className = 'status ok'; fileStatus.textContent = fmt(L.saved_file, { file: name }); announce(fileStatus.textContent); }
      };
      // Both files are named <lesson>__<learner or results>__<finish date>.
      var saveButton = el('button', { class: state.sent ? '' : 'primary', type: 'button', 'data-save-json': '', on: { click: function () {
        var file = resultFile();
        saveAs(kit.csv(file).stem + '.json', JSON.stringify(file, null, 2), 'application/json');
      } }, text: L.save });
      var csvButton = el('button', { type: 'button', 'data-save-csv': '', on: { click: function () {
        var file = resultFile(), table = kit.csv(file);
        saveAs(table.stem + '.csv', table.text(file.integrity), 'text/csv;charset=utf-8');
      } }, text: L.save_csv });
      // For devices where a download goes nowhere: the same table, to paste.
      var copyButton = el('button', { type: 'button', 'data-copy-tsv': '', on: { click: function () {
        var tsv = kit.csv(resultFile()).tsv();
        var manual = function () { showText(L.copy_manual, tsv); };
        try {
          win.navigator.clipboard.writeText(tsv).then(function () {
            fileStatus.className = 'status ok'; fileStatus.textContent = L.copied; announce(L.copied);
          }, manual);
        } catch (_) { manual(); }
      } }, text: L.copy_tsv });
      var info = about();
      var sendButton = null;
      // The mailbox refuses sends after the teacher's closing date, so the
      // button goes away then instead of failing.
      var closesAt = lesson.submit ? Date.parse(lesson.submit.expiresAt || '') : NaN;
      var sendClosed = !state.sent && isFinite(closesAt) && closesAt <= Date.now();
      var closedDate = '';
      if (sendClosed) {
        try { closedDate = new Date(closesAt).toLocaleDateString(lesson.language || undefined); }
        catch (_) { closedDate = new Date(closesAt).toISOString().slice(0, 10); }
      }
      var closedNote = sendClosed ? fmt(L.send_closed, { date: closedDate }) : '';
      if (sendNow && !sendClosed) {
        sendButton = el('button', { class: 'primary', type: 'button', on: { click: function () {
          if (sendButton.getAttribute('aria-disabled') === 'true') return;
          sendButton.setAttribute('aria-disabled', 'true');
          fileStatus.className = 'status'; fileStatus.textContent = L.sending; announce(L.sending);
          send().then(function (data) {
            state.sent = String((data && data.filename) || 'ok').slice(0, 120); save();
            fileStatus.className = 'status ok'; fileStatus.textContent = fmt(L.sent, { receipt: state.sent }); announce(fileStatus.textContent);
          }, function () {
            sendButton.removeAttribute('aria-disabled');
            fileStatus.className = 'status warn'; fileStatus.textContent = L.send_failed; announce(L.send_failed);
          });
        } }, text: L.send });
        if (state.sent) sendButton.setAttribute('aria-disabled', 'true');
      }
      var startOver = function () {
        try { win.localStorage.removeItem(storageKey); } catch (_) {}
        state = null; renderStart();
      };
      // Practice again throws this attempt away: ask first unless it was sent
      // or saved as a file. An in-page panel (window.confirm is unreliable in
      // iPad Safari and in file previews).
      var confirmText = el('p', { id: 'practice-again-text', tabindex: '-1', style: 'margin:0 0 8px', text: L.practice_again_confirm });
      var keepButton = el('button', { type: 'button', class: 'primary', 'data-practice-keep': '', on: { click: function () { confirmBox.hidden = true; againButton.focus(); } }, text: L.keep_results });
      var confirmBox = el('div', { class: 'status warn', role: 'group', 'aria-labelledby': 'practice-again-text', hidden: true, 'data-practice-confirm': '',
        on: { keydown: function (e) { if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); keepButton.click(); } } } }, [
        confirmText,
        el('div', { class: 'row' }, [keepButton, el('button', { type: 'button', 'data-practice-start-over': '', on: { click: startOver }, text: L.start_over })]),
      ]);
      var againButton = el('button', { type: 'button', 'data-practice-again': '', on: { click: function () {
        if (state.sent || state.savedFile) { startOver(); return; }
        confirmBox.hidden = false; confirmText.focus();
      } }, text: L.practice_again });
      if (check) { check.finish({ send: sendButton, save: saveButton, csv: csvButton, copy: copyButton, about: info, status: fileStatus, copyBox: copyBox, note: closedNote || (sendButton ? L.send_note : L.not_sent) }); return; }
      screen(L.done_title, [
        el('div', { class: 'card' }, [
          el('p', { class: 'letters', text: fmt(L.done_summary, { first: s.firstTry, total: s.items }) }),
          s.afterRetry ? el('p', { text: fmt(L.done_retry, { retry: s.afterRetry }) }) : null,
          el('div', { class: 'row' }, [sendButton, saveButton, csvButton, copyButton, againButton, info.button]),
          confirmBox,
          fileStatus,
          copyBox,
          el('p', { class: 'muted', text: closedNote || (sendButton ? L.send_note : L.not_sent) }),
        ]),
        info.panel,
      ]);
    };
    // A check (lesson.mode 'probe') brings its own flow in kit.check; a practice file has none.
    var check = kit.check ? kit.check({ doc: doc, win: win, lesson: lesson, L: L, kit: kit, items: items, renders: renders, matches: matches, el: el, fmt: fmt, announce: announce,
      screen: screen, statusLine: statusLine, fresh: fresh, save: save, now: now, clockStart: clockStart, clockStop: clockStop, play: play, playAll: playAll, stop: stop,
      state: function (next) { if (next !== undefined) state = next; return state; }, results: function () { return resultFile(); },
      renderStart: function () { renderStart(); }, renderFinish: function () { renderFinish(); } }) : null;
    renderStart();
    return { results: function () { return state && resultFile(); } };
  }

  // ---------------------------------------------------------------------------
  // Check mode (lesson.mode 'probe'; the visible word is "check"). The four
  // functions below travel ONLY in a check file; a practice file has none of them.
  // ---------------------------------------------------------------------------
  var CHECK_ROUNDS = 20000;
  var CHECK_CSS = [
    '.timer{display:flex;align-items:center;gap:12px;margin:0 0 12px;color:var(--muted);font-variant-numeric:tabular-nums}',
    '.timebar{flex:1;height:10px;border-radius:6px;background:var(--line);overflow:hidden}.timebar span{display:block;height:100%;background:var(--accent)}',
    '.prompt{font-size:2.6rem;font-weight:700;text-align:center;margin:8px 0 16px;overflow-wrap:anywhere}.blank{display:inline-block;min-width:1.6em;border-bottom:4px solid var(--accent);color:var(--accent)}',
    '.answer{display:block;margin:0 auto;text-align:center;font-size:2rem;font-weight:700;max-width:220px}',
    '.pad{display:grid;grid-template-columns:repeat(3,minmax(64px,96px));gap:10px;justify-content:center;margin:16px auto 0}.pad button{min-height:56px;font-size:1.5rem;font-weight:700;padding:6px}.pad .wide{grid-column:1/-1}',
    '.pair{display:flex;gap:24px;justify-content:center;flex-wrap:wrap;list-style:none;padding:0;margin:16px 0}.pair button{min-width:132px;min-height:132px;font-size:3rem;font-weight:700;border-width:4px}.pair button.right{border-color:var(--ok);background:var(--ok-bg)}',
    '.scroll{overflow-x:auto}.review{width:100%;border-collapse:collapse;font-size:.95rem}.review th,.review td{border:1px solid var(--line);padding:6px 8px;text-align:start}.review td:nth-child(2),.review td:nth-child(5){white-space:nowrap}',
  ].join('\n');

  // Scrambled answers and the teacher-code lock. Used here to seal a check and
  // embedded in the file (toString) to read it back, so the two cannot differ.
  // It uses only its argument: the synchronous SHA-256 above. Neither is secret
  // writing: the file scores itself offline, so everything needed to
  // unscramble an answer travels inside the file.
  function checkCodec(sha) {
    var bytesOf = function (text) {
      var t = unescape(encodeURIComponent(String(text))), out = [];
      for (var i = 0; i < t.length; i++) out.push(t.charCodeAt(i));
      return out;
    };
    var textOf = function (bytes) {
      var s = '';
      for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
      try { return decodeURIComponent(escape(s)); } catch (_) { return s; }
    };
    // Keystream for one item: SHA-256(salt + itemId). A longer answer goes on
    // with SHA-256(salt + itemId + '|' + n), n = 1, 2, ...
    var stream = function (salt, id, length) {
      var out = [];
      for (var n = 0; out.length < length; n++) {
        var hex = sha(String(salt) + String(id) + (n ? '|' + n : '')).hex;
        for (var i = 0; i < 64 && out.length < length; i += 2) out.push(parseInt(hex.substr(i, 2), 16));
      }
      return out;
    };
    return {
      // Answer text -> base64 of (its UTF-8 bytes, zero-padded to a multiple of
      // 12 so the length does not show the number of digits) XOR keystream.
      scramble: function (text, salt, id) {
        var bytes = bytesOf(text);
        do { bytes.push(0); } while (bytes.length % 12 !== 0);
        var key = stream(salt, id, bytes.length), s = '';
        for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i] ^ key[i]);
        return btoa(s);
      },
      unscramble: function (data, salt, id) {
        var s = '';
        try { s = atob(String(data)); } catch (_) { return ''; }
        var key = stream(salt, id, s.length), bytes = [];
        for (var i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i) ^ key[i]);
        while (bytes.length && bytes[bytes.length - 1] === 0) bytes.pop();
        return textOf(bytes);
      },
      // The teacher code is kept only as this: SHA-256(salt + '|' + code), hashed
      // again with the salt until `rounds` hashes have been made.
      lockHash: function (code, salt, rounds) {
        var h = sha(String(salt) + '|' + String(code)).hex;
        for (var i = 1; i < rounds; i++) h = sha(h + String(salt)).hex;
        return h;
      },
      // Looks at every character, wherever the first difference is.
      same: function (a, b) {
        a = String(a); b = String(b);
        var diff = a.length ^ b.length;
        for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i % (b.length || 1));
        return diff === 0;
      },
    };
  }

  // The score of one finished check. Pure; embedded in the file (toString).
  // rows: one per item, { practice, attempted, correct, digitsCorrect,
  // digitsPossible }. timing: { elapsedMs, hiddenMs, completion, attempt, flags }.
  // Attempted = answered or skipped. A rate (digits_correct_per_minute) follows
  // math_fluency_module.js, scoring version 3: digits correct over the minutes
  // used, the time capped at the limit; every item done before the limit =
  // prorated over the time used; done in under 20 s, no time limit, or ended
  // early = no score. A check ended early has no score in any unit.
  function checkScore(meta, rows, timing) {
    var m = meta || {}, t = timing || {};
    var unit = String(m.scoreUnit || 'items_correct');
    var limit = Number(m.timeLimitS) > 0 ? Number(m.timeLimitS) : null;
    var itemsCorrect = 0, itemsAttempted = 0, digitsCorrect = 0, digitsPossible = 0, hasDigits = false;
    (Array.isArray(rows) ? rows : []).forEach(function (r) {
      if (!r || r.practice || !r.attempted) return;
      itemsAttempted++;
      if (r.correct) itemsCorrect++;
      if (r.digitsPossible != null) { hasDigits = true; digitsCorrect += Number(r.digitsCorrect) || 0; digitsPossible += Number(r.digitsPossible) || 0; }
    });
    var completion = t.completion === 'time' || t.completion === 'ended_early' ? t.completion : 'complete';
    var raw = Math.max(0, Number(t.elapsedMs) || 0) / 1000;
    var elapsed = limit === null ? raw : completion === 'time' ? limit : Math.min(limit, raw);
    var early = limit !== null && completion === 'complete' && elapsed < limit;
    var score = null, prorated = false, why = '';
    if (completion === 'ended_early') why = 'ended_early';
    else if (unit === 'digits_correct_per_minute') {
      if (limit === null) why = 'untimed';
      else if (early && elapsed < 20) why = 'too_fast';
      else { score = Math.round(digitsCorrect / Math.max(1 / 60, elapsed / 60)); prorated = early; }
    } else score = itemsCorrect;
    var tenth = function (ms) { return Math.round(Math.max(0, Number(ms) || 0) / 100) / 10; };
    return { measure: String(m.measure || ''), score: score, scoreUnit: unit, digitsCorrect: hasDigits ? digitsCorrect : null, digitsPossible: hasDigits ? digitsPossible : null,
      itemsCorrect: itemsCorrect, itemsAttempted: itemsAttempted, timeLimitS: limit, elapsedS: tenth(elapsed * 1000), hiddenS: tenth(t.hiddenMs), completion: completion,
      prorated: prorated, noScoreReason: why, scoringVersion: Number(m.scoringVersion) || 1, formVersion: m.formVersion == null ? '' : m.formVersion,
      attempt: Math.max(1, Math.floor(Number(t.attempt)) || 1), flags: (Array.isArray(t.flags) ? t.flags : []).map(String) };
  }

  // Seal a check for the file: every item goes through its adapter's prepare
  // (an allowlist, as for a practice lesson), each answer is replaced by its
  // scrambled form and the teacher code by its salted hash. Nothing here comes
  // from the clock: the same lesson and code make the same bytes.
  function sealCheck(lesson, adapters, teacherCode) {
    var copy = JSON.parse(JSON.stringify(lesson));
    var codec = checkCodec(sha256);
    var seen = {};
    var minus = false;
    copy.blocks.forEach(function (block) {
      var adapter = adapters[block.activity];
      if (!adapter || typeof adapter.prepare !== 'function') throw new Error('Unknown check activity: ' + str(block.activity));
      block.items = (Array.isArray(block.items) ? block.items : []).map(function (raw, i) {
        var made = null;
        try { made = adapter.prepare(raw || {}, {}); } catch (_) {}
        if (!made || !made.item || str(made.item.answer) === '') throw new Error('Check item ' + (i + 1) + ' cannot be used' + (made && made.missing ? ': ' + made.missing.join(', ') : ''));
        var item = Object.assign({ id: str(raw && raw.id) || block.activity + '-' + i }, made.item);
        if (raw && raw.practice) item.practice = true;
        if (seen['i:' + item.id]) throw new Error('Two check items share the id ' + item.id);
        seen['i:' + item.id] = true;
        if (/^-/.test(str(item.answer))) minus = true;
        return item;
      });
    });
    var meta = copy.check = Object.assign({}, copy.check && typeof copy.check === 'object' ? copy.check : {});
    var content = JSON.stringify([copy.lessonId, copy.revision, copy.title, copy.form || '', copy.timeLimitS || null, copy.blocks]);
    var lockSalt = sha256('alloflow-check-lock|' + content).hex.slice(0, 32);
    var code = str(teacherCode).trim();
    if (code && (code.length < 4 || code.length > 64)) throw new Error('The teacher code needs 4 to 64 characters');
    meta.lock = code ? { salt: lockSalt, rounds: CHECK_ROUNDS, hash: codec.lockHash(code, lockSalt, CHECK_ROUNDS) } : null;
    // The file salt comes from the lesson and the code's hash, never from the clock.
    meta.salt = sha256('alloflow-check-salt|' + content + '|' + (meta.lock ? meta.lock.hash : '')).hex.slice(0, 32);
    meta.minus = minus;
    copy.blocks.forEach(function (block) {
      block.items.forEach(function (item) { item.key = codec.scramble(str(item.answer), meta.salt, item.id); delete item.answer; });
    });
    return copy;
  }

  // The check flow (runs INSIDE the file, in place of the practice flow). Only
  // its argument is in scope: `api` is what takeHomeShell hands over, and
  // api.kit carries sha (SHA-256), codec (checkCodec), score (checkScore) and
  // scorers (activity id -> adapter.score).
  function takeHomeCheck(api) {
    var doc = api.doc, win = api.win, lesson = api.lesson, L = api.L, kit = api.kit, items = api.items, el = api.el, fmt = api.fmt;
    var meta = lesson.check || {};
    var limitMs = Number(lesson.timeLimitS) > 0 ? Math.round(Number(lesson.timeLimitS) * 1000) : 0;
    var scoredTotal = items.filter(function (e) { return !e.item.practice; }).length;
    var practiceTotal = items.length - scoredTotal;
    var S = function () { return api.state(); };
    var C = function () {
      var s = S();
      if (!s.check || typeof s.check !== 'object') s.check = { phase: '', hiddenMs: 0, flags: {} };
      if (!s.check.flags || typeof s.check.flags !== 'object') s.check.flags = {};
      return s.check;
    };
    // The first screen of a check says what a check is; its button leads on to
    // the practice items or to "Get ready", where Start begins the clock.
    L.intro = L.check_about; L.start = L.check_go_on;

    // The clock. The deadline is a wall-clock time (Date.now) kept in the saved
    // state, so a reload finds the time that is truly left. While the page
    // stays loaded, time is also measured with performance.now and the LARGER
    // of the two is used: setting the device clock back gives no time back, and
    // a device that slept still loses the time it slept. A wall clock that falls
    // more than 2 s behind is recorded as "clock_changed". (Running ahead is not:
    // a phone that suspends the page stops performance.now, not the wall clock.)
    var wallNow = function () { try { return win.Date.now(); } catch (_) { return Date.now(); } };
    var anchor = { wall: wallNow(), perf: api.now() };
    var jumped = false;
    var nowMs = function () {
      var w = wallNow() - anchor.wall, p = api.now() - anchor.perf;
      if (p - w > 2000) jumped = true;
      return anchor.wall + Math.max(w, p);
    };
    var clockText = function (ms) {
      var s = Math.max(0, Math.ceil(ms / 1000));
      return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
    };
    var timeWords = function (seconds) {
      var n = Math.round(seconds);
      if (n % 60 === 0) return n === 60 ? L.check_one_minute : fmt(L.check_minutes, { n: n / 60 });
      return fmt(L.check_seconds, { n: n });
    };
    var answerOf = function (item) { return kit.codec.unscramble(item.key, meta.salt, item.id); };
    var markOf = function (entry, answer, response) {
      var scorer = kit.scorers && kit.scorers[entry.activity];
      var mark = null;
      try { mark = scorer ? scorer(entry.item, answer, response) : null; } catch (_) {}
      return mark || { correct: String(response) === String(answer), digitsCorrect: null, digitsPossible: null };
    };

    var current = null;   // the item on screen: { rec, at, keys, pad }
    var ticker = null, timerText = null, timerBar = null, shownSecond = -1, warned = false, lastSave = 0;
    var calm = false, touch = false;
    try { calm = win.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}
    try { touch = win.matchMedia('(hover: none) and (pointer: coarse)').matches; } catch (_) {}
    // The countdown is plain text and a bar that shortens once a second: no
    // colour change, no flashing. With reduced motion there is no bar and the
    // text changes every 5 seconds. Screen readers hear the time only at the
    // start, at 10 seconds left and at the end (the text is not a live region).
    var paint = function (left) {
      var s = Math.max(0, Math.ceil(left / 1000));
      var shown = calm ? Math.ceil(s / 5) * 5 : s;
      if (shown === shownSecond) return;
      shownSecond = shown;
      if (timerText) timerText.textContent = fmt(L.check_time_left, { time: clockText(shown * 1000) });
      if (timerBar) timerBar.style.width = Math.max(0, Math.min(100, shown * 100000 / limitMs)) + '%';
    };
    var tick = function () {
      var s = S(), c = s && s.check;
      if (!c || c.phase !== 'run') return;
      var t = nowMs();
      if (c.deadline) {
        var left = c.deadline - t;
        if (left <= 0) { timeUp(); return; }
        paint(left);
        if (left <= 10000 && !warned) { warned = true; api.announce(L.check_time_10); }
      }
      if (t - lastSave >= 2000) { lastSave = t; c.seen = t; if (jumped) c.flags.clock_changed = 1; api.save(); }
    };
    var startTicker = function () { if (!ticker) ticker = win.setInterval(tick, 250); };

    // Time with the page hidden does not stop the clock; it is added up, and
    // more than 3 s of it flags the session "left_the_page". Closing the page
    // and coming back counts the same way.
    var noteHidden = function () {
      var s = S(), c = s && s.check;
      if (!c || c.phase !== 'run') return;
      c.seen = nowMs();
      if (!c.hiddenFrom) c.hiddenFrom = c.seen;
      api.save();
    };
    var noteShown = function () {
      var s = S(), c = s && s.check;
      if (!c || c.phase !== 'run' || !c.hiddenFrom) return;
      c.hiddenMs = (Number(c.hiddenMs) || 0) + Math.max(0, nowMs() - c.hiddenFrom);
      c.hiddenFrom = null;
      if (c.hiddenMs > 3000) c.flags.left_the_page = 1;
      api.save();
    };
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) noteHidden(); else { noteShown(); tick(); } });
    win.addEventListener('pagehide', noteHidden);

    // Hardware keys on an item: the number pad, or the keys an activity asked for.
    doc.addEventListener('keydown', function (e) {
      var cur = current;
      if (!cur || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      var t = e.target, tag = t && t.tagName ? String(t.tagName).toUpperCase() : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      var key = String(e.key || '');
      if (cur.pad) {
        var k = /^[0-9]$/.test(key) ? key : key === 'Backspace' ? 'back' : key === '-' || key === String.fromCharCode(0x2212) ? 'minus' : key === 'Enter' && tag !== 'BUTTON' ? 'next' : '';
        if (k) { e.preventDefault(); cur.pad.press(k); }
      } else if (cur.keys && cur.keys(key) === true) e.preventDefault();
    });

    // ctx.keypad: digits, delete, minus only when the check has a negative
    // answer, and Next. The answer box takes a hardware keyboard too; on a
    // touch screen it has inputmode="none" so the system keyboard stays away.
    var keypad = function (options) {
      var o = options || {};
      var minus = o.minus != null ? !!o.minus : !!meta.minus;
      var locked = false;
      // Digits and one leading minus sign, 8 digits at most.
      var clean = function (raw) {
        var t = String(raw == null ? '' : raw);
        var negative = minus && (t.replace(/^\s+/, '').charAt(0) === '-' || t.replace(/^\s+/, '').charCodeAt(0) === 0x2212);
        return (negative ? '-' : '') + t.replace(/[^0-9]/g, '').slice(0, 8);
      };
      var input = el('input', { type: 'text', class: 'answer', inputmode: touch ? 'none' : 'numeric', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
        'aria-label': o.label || L.check_pad_label, 'data-pad-input': '' });
      var next = el('button', { type: 'button', class: 'primary wide', 'data-key': 'next', 'aria-disabled': 'true', on: { click: function () { press('next'); } }, text: L.check_pad_next });
      var set = function (value) {
        var v = clean(value);
        if (input.value !== v) input.value = v;
        next.setAttribute('aria-disabled', /[0-9]/.test(v) ? 'false' : 'true');
        if (typeof o.onChange === 'function') o.onChange(v);
      };
      var press = function (key) {
        if (locked) return;
        var v = input.value;
        if (key === 'back') set(v.slice(0, -1));
        else if (key === 'minus') { if (minus) set(v.charAt(0) === '-' ? v.slice(1) : '-' + v); }
        else if (key === 'next') { if (/[0-9]/.test(v) && typeof o.onNext === 'function') o.onNext(v); }
        else if (/^[0-9]$/.test(key)) set(v + key);
      };
      var button = function (label, key, name) {
        return el('button', { type: 'button', 'data-key': key, 'aria-label': name || false, on: { click: function () { press(key); } } }, [label]);
      };
      var grid = el('div', { class: 'pad', role: 'group', 'aria-label': L.check_pad_keys }, ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(function (d) { return button(d, d); }).concat([
        minus ? button(String.fromCharCode(0x2212), 'minus', L.check_pad_minus) : el('span', {}),
        button('0', '0'),
        button(String.fromCharCode(0x2190), 'back', L.check_pad_delete),
        next,
      ]));
      input.addEventListener('input', function () { set(input.value); });
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); press('next'); } });
      var pad = { node: el('div', {}, [input, grid]), input: input, press: press,
        value: function () { return input.value; },
        focus: function () { try { input.focus(); } catch (_) {} },
        lock: function () { locked = true; input.setAttribute('readonly', ''); next.setAttribute('aria-disabled', 'true'); } };
      if (current) current.pad = pad;
      return pad;
    };
    var ctxFor = function (entry, rec, area, practice, answer) {
      return { root: area, el: el, fmt: fmt, L: L, item: entry.item, matches: api.matches, showLetters: !!lesson.showLetters, check: true, practice: practice,
        announce: api.announce, play: api.play, playAll: api.playAll, stop: api.stop,
        image: function (id) { return (id && lesson.images && lesson.images[id]) || null; },
        support: function (name) { rec.supports[name] = (rec.supports[name] || 0) + 1; api.save(); },
        isDone: function () { return rec.done; },
        attempts: function () { return rec.attempts; },
        keys: function (handler) { if (current) current.keys = handler; },
        keypad: keypad,
        answer: answer };
    };
    var show = function (entry, rec, ctx) {
      var handle = null;
      try { handle = api.renders[entry.activity](entry.item, ctx) || null; } catch (_) {}
      // Seen in an earlier opening of the file: the time on it counts from now.
      if (rec.shown) rec.flag = 'resumed';
      rec.shown = true; rec.ms = 0;
      api.clockStart(rec);
      api.save();
      return handle;
    };

    // Practice items come first. They give feedback and are never scored.
    var practiceItem = function () {
      var s = S();
      var entry = items[s.index], rec = s.items[s.index];
      var n = items.slice(0, s.index).filter(function (e) { return e.item.practice; }).length + 1;
      var area = el('div', {}), feedback = api.statusLine('', ''), handle = null;
      var next = el('button', { class: 'primary', type: 'button', hidden: true, 'data-practice-next': '', on: { click: function () { s.index++; api.save(); route(); } }, text: L.next });
      var answer = function (response) {
        var cur = current;
        if (!cur || rec.done) return 'ignored';
        if (api.now() - cur.at < 250) return 'ignored';
        var right = answerOf(entry.item);
        var mark = markOf(entry, right, response);
        rec.attempts = 1; rec.done = true; rec.practice = 'practice';
        rec.responses = [String(response == null ? '' : response).slice(0, 80)];
        api.clockStop();
        current = null;
        api.save();
        feedback.className = 'status ' + (mark.correct ? 'ok' : 'warn');
        feedback.textContent = mark.correct ? L.check_practice_right : fmt(L[entry.activity + '_practice_wrong'] || L.check_practice_wrong, { answer: right });
        if (handle && typeof handle.reveal === 'function') { try { handle.reveal(right); } catch (_) {} }
        next.hidden = false;
        next.focus();
        return mark.correct ? 'correct' : 'missed';
      };
      api.screen(fmt(L.check_practice_title, { n: n, total: practiceTotal }), [
        el('div', { class: 'card' }, [el('p', { class: 'muted', text: L.check_practice_note }), area, feedback, next]),
      ]);
      current = { rec: rec, at: api.now(), keys: null, pad: null };
      handle = show(entry, rec, ctxFor(entry, rec, area, true, answer));
    };
    var readyScreen = function () {
      var first = items.filter(function (e) { return !e.item.practice; })[0];
      var how = first ? L[first.activity + '_directions'] : '';
      api.screen(L.check_ready_title, [
        el('div', { class: 'card' }, [
          how ? el('p', { class: 'letters', text: how }) : null,
          el('p', { text: limitMs ? fmt(L.check_ready_timed, { time: timeWords(limitMs / 1000) }) : L.check_ready_untimed }),
          el('p', { text: L.check_ready_one_try }),
          el('div', { class: 'row' }, [el('button', { class: 'primary', type: 'button', 'data-check-begin': '', on: { click: startRun }, text: L.check_begin })]),
        ]),
      ]);
    };
    var route = function () {
      var s = S(), c = C();
      if (c.phase === 'done') { api.renderFinish(); return; }
      if (c.phase === 'run') { runItem(); return; }
      while (s.index < items.length && items[s.index].item.practice && s.items[s.index].done) s.index++;
      c.phase = s.index < items.length && items[s.index].item.practice ? 'practice' : 'ready';
      api.save();
      if (c.phase === 'practice') practiceItem(); else readyScreen();
    };

    // Start: the clock begins here and nowhere else.
    var startRun = function () {
      var s = S(), c = C();
      if (c.phase === 'run' || c.phase === 'done') return;
      var t = nowMs();
      c.phase = 'run'; c.t0 = t; c.deadline = limitMs ? t + limitMs : null; c.seen = t; c.hiddenMs = 0; c.hiddenFrom = null;
      // Tries are counted for each learner label on this device. The label is
      // kept as a hash, so no earlier name stays behind after Start over.
      var who = 't' + kit.hash(String(s.name || '').replace(/^\s+|\s+$/g, '').toLowerCase());
      s.tries = s.tries && typeof s.tries === 'object' ? s.tries : {};
      c.attempt = (Number(s.tries[who]) || 0) + 1;
      s.tries[who] = c.attempt;
      api.save();
      startTicker();
      runItem();
      if (limitMs) api.announce(fmt(L.check_time_start, { time: timeWords(limitMs / 1000) }));
    };
    // One try, no feedback, straight on to the next item, no way back.
    var record = function (response, skipped) {
      var s = S(), c = C(), cur = current;
      if (!cur || cur.rec.done || c.phase !== 'run') return 'ignored';
      if (c.deadline && nowMs() >= c.deadline) { timeUp(); return 'time_up'; }
      // A tap within a quarter second of a new item is the tail of a double tap, not an answer.
      if (api.now() - cur.at < 250) return 'ignored';
      cur.rec.attempts = 1; cur.rec.done = true;
      if (skipped) cur.rec.flag = 'skipped'; else cur.rec.responses = [String(response == null ? '' : response).slice(0, 80)];
      api.clockStop();
      current = null;
      s.index++;
      c.seen = nowMs();
      api.save();
      runItem();
      return 'recorded';
    };
    var runItem = function () {
      var s = S(), c = C();
      while (s.index < items.length && (s.items[s.index].done || items[s.index].item.practice)) s.index++;
      if (c.deadline && nowMs() >= c.deadline) { timeUp(); return; }
      if (s.index >= items.length) { finishRun('complete'); return; }
      var entry = items[s.index], rec = s.items[s.index];
      var n = items.slice(0, s.index).filter(function (e) { return !e.item.practice; }).length + 1;
      var area = el('div', {});
      var timer = null;
      timerText = timerBar = null;
      if (c.deadline) {
        timerText = el('span', { role: 'timer', 'data-time-left': '' });
        timerBar = calm ? null : el('span', {});
        timer = el('div', { class: 'timer' }, [timerText, timerBar ? el('div', { class: 'timebar', 'aria-hidden': 'true' }, [timerBar]) : null]);
        shownSecond = -1;
        paint(c.deadline - nowMs());
      }
      var skip = meta.allowSkip ? el('div', { class: 'row', style: 'margin-top:16px;justify-content:center' }, [
        el('button', { type: 'button', 'data-skip': '', on: { click: function () { record(null, true); } }, text: L.check_skip })]) : null;
      var stopText = el('p', { id: 'check-stop-text', tabindex: '-1', style: 'margin:0 0 8px', text: L.check_stop_confirm });
      var stopButton = el('button', { type: 'button', 'data-stop': '', on: { click: function () { stopBox.hidden = false; stopText.focus(); } }, text: L.check_stop });
      var stopBox = el('div', { class: 'status warn', role: 'group', 'aria-labelledby': 'check-stop-text', hidden: true, 'data-stop-confirm': '' }, [
        stopText,
        el('div', { class: 'row' }, [
          el('button', { type: 'button', class: 'primary', 'data-stop-no': '', on: { click: function () { stopBox.hidden = true; stopButton.focus(); } }, text: L.check_stop_no }),
          el('button', { type: 'button', 'data-stop-yes': '', on: { click: function () { finishRun('ended_early'); } }, text: L.check_stop_yes }),
        ]),
      ]);
      api.screen(fmt(L.check_item_of, { n: n, total: scoredTotal }), [timer, el('div', { class: 'card' }, [area, skip]), el('div', { class: 'row' }, [stopButton]), stopBox]);
      current = { rec: rec, at: api.now(), keys: null, pad: null };
      show(entry, rec, ctxFor(entry, rec, area, false, function (response) { return record(response, false); }));
    };
    // At the deadline the item on screen ends unanswered.
    var timeUp = function () {
      var s = S(), c = C();
      if (c.phase !== 'run') return;
      var rec = s.items[s.index];
      if (rec && !rec.done) rec.flag = 'time_up';
      finishRun('time');
    };
    var finishRun = function (completion) {
      var c = C();
      if (c.phase !== 'run') return;
      var t = nowMs();
      var end = completion === 'time' && c.deadline ? c.deadline : t;
      if (c.hiddenFrom) { c.hiddenMs = (Number(c.hiddenMs) || 0) + Math.max(0, Math.min(t, end) - c.hiddenFrom); c.hiddenFrom = null; }
      if (c.hiddenMs > 3000) c.flags.left_the_page = 1;
      if (jumped) c.flags.clock_changed = 1;
      c.phase = 'done'; c.completion = completion; c.end = end; c.seen = t;
      if (ticker) { win.clearInterval(ticker); ticker = null; }
      current = null; timerText = timerBar = null;
      api.clockStop();
      api.save();
      api.renderFinish();
      if (completion === 'time') api.announce(L.check_time_up);
    };

    return {
      // "About this file", for a check.
      about: function (texts) {
        var out = texts.slice();
        out[0] = L.check_about_what;
        out.splice(1, 0, L.check_about, limitMs ? L.check_about_clock : '', L.check_about_scrambled, meta.lock ? L.check_about_code : '');
        out.splice(7, 0, L.check_about_tries);
        return out;
      },
      // Opening the file again. A finished check shows its finish screen: it
      // cannot be run again under the same session id. A running check goes
      // straight back to its items with the time that is truly left.
      resume: function (prior) {
        var c = prior && prior.check;
        if (!c || typeof c !== 'object' || (c.phase !== 'run' && c.phase !== 'done')) return false;
        api.state(prior);
        c = C();
        if (c.phase === 'done') { api.renderFinish(); return true; }
        var real = wallNow();
        if (c.seen && real < c.seen - 2000) c.flags.clock_changed = 1;
        // Never earlier than the last moment this check was seen running.
        anchor = { wall: Math.max(real, Number(c.seen) || 0), perf: api.now() };
        var t = nowMs();
        c.hiddenMs = (Number(c.hiddenMs) || 0) + Math.max(0, Math.min(t, c.deadline || t) - (c.hiddenFrom || c.seen || t));
        c.hiddenFrom = null;
        if (c.hiddenMs > 3000) c.flags.left_the_page = 1;
        c.flags.reloaded = 1;
        c.seen = t;
        api.save();
        startTicker();
        runItem();
        return true;
      },
      // After the first screen (the learner label).
      begin: function (prior) {
        var s = S();
        if (prior && prior !== s && prior.tries && !s.tries) s.tries = prior.tries;
        route();
      },
      // Called for every results file: scoring happens here, in memory. Right
      // and wrong are never written to the saved state.
      result: function (out) {
        var s = S(), c = C();
        out.packet.form = String(lesson.form || ''); out.packet.mode = 'probe';
        var rows = [], practised = 0;
        out.items.forEach(function (it, i) {
          var entry = items[i], rec = s.items[i];
          var practice = !!entry.item.practice;
          var right = answerOf(entry.item);
          var skipped = rec.flag === 'skipped';
          var attempted = !!rec.done && rec.attempts > 0;
          var mark = attempted ? markOf(entry, right, skipped ? '' : rec.responses[0]) : null;
          var digits = attempted && !practice && mark.digitsPossible != null;
          it.word = entry.item.word; it.target = right;
          it.practice = practice ? 'practice' : null;
          it.correct = !!(mark && mark.correct && !skipped); it.firstTry = it.correct;
          it.digitsCorrect = digits ? (skipped ? 0 : Number(mark.digitsCorrect) || 0) : null;
          it.digitsPossible = digits ? Number(mark.digitsPossible) || 0 : null;
          if (practice && attempted) practised++;
          rows.push({ practice: practice, attempted: attempted, correct: it.correct, digitsCorrect: it.digitsCorrect, digitsPossible: it.digitsPossible });
        });
        out.score = kit.score({ measure: meta.measure, scoreUnit: meta.scoreUnit, timeLimitS: lesson.timeLimitS, scoringVersion: meta.scoringVersion, formVersion: meta.formVersion }, rows,
          { elapsedMs: c.t0 ? (c.end || nowMs()) - c.t0 : 0, hiddenMs: c.hiddenMs, completion: c.completion, attempt: c.attempt, flags: Object.keys(c.flags).sort() });
        // The fields older readers use.
        out.summary = { items: scoredTotal, done: out.score.itemsAttempted, firstTry: out.score.itemsCorrect, afterRetry: 0, missed: out.score.itemsAttempted - out.score.itemsCorrect, practised: practised };
      },
      // The finish screen: thanks, how many and how long. No right or wrong and
      // no score for the learner; those are behind "For the teacher".
      finish: function (p) {
        var s = S(), c = C();
        var file = api.results(), sc = file.score;
        var answered = file.items.filter(function (it) { return !it.practice && it.attempts > 0 && it.flag !== 'skipped'; }).length;
        var lock = meta.lock && meta.lock.hash ? meta.lock : null;
        var review = function () {
          var f = api.results(), r = f.score;
          var cell = function (v) { return el('td', { text: v == null ? '' : String(v) }); };
          var lines = [
            r.score != null ? fmt(L.check_review_score, { score: r.score, unit: L['check_unit_' + r.scoreUnit] || r.scoreUnit })
              : fmt(L.check_review_no_score, { reason: L['check_reason_' + r.noScoreReason] || r.noScoreReason }),
            fmt(L.check_review_items, { correct: r.itemsCorrect, attempted: r.itemsAttempted, given: scoredTotal }),
            r.digitsPossible != null ? fmt(L.check_review_digits, { correct: r.digitsCorrect, possible: r.digitsPossible }) : '',
            fmt(L.check_review_time, { elapsed: r.elapsedS, limit: r.timeLimitS ? fmt(L.check_review_limit, { seconds: r.timeLimitS }) : L.check_review_no_limit }),
            fmt(L.check_review_hidden, { hidden: r.hiddenS }),
            r.prorated ? L.check_review_prorated : '',
            fmt(L.check_review_attempt, { n: r.attempt }),
            r.flags.length ? fmt(L.check_review_flags, { flags: r.flags.map(function (name) { return L['check_flag_' + name] || name; }).join('; ') }) : '',
            L.check_review_note,
          ];
          var body = f.items.map(function (it) {
            var result = it.practice ? L.check_r_practice : it.flag === 'skipped' ? L.check_r_skipped : it.flag === 'time_up' ? L.check_r_time_up
              : !it.attempts ? L.check_r_not_reached : it.correct ? L.check_r_right : L.check_r_wrong;
            return el('tr', {}, [cell(it.n), cell(it.word), cell((it.responses || []).join(' | ')), cell(result), cell(it.target), cell(Math.round((Number(it.ms) || 0) / 100) / 10)]);
          });
          api.screen(L.check_review_title, [
            el('div', { class: 'card', 'data-review': '' }, [
              el('ul', {}, lines.filter(Boolean).map(function (text) { return el('li', { text: text }); })),
              el('div', { class: 'scroll' }, [el('table', { class: 'review' }, [
                el('thead', {}, [el('tr', {}, [L.check_col_n, L.check_col_prompt, L.check_col_response, L.check_col_result, L.check_col_expected, L.check_col_time]
                  .map(function (text) { return el('th', { scope: 'col', text: text }); }))]),
                el('tbody', {}, body),
              ])]),
              el('div', { class: 'row', style: 'margin-top:16px' }, [el('button', { class: 'primary', type: 'button', 'data-review-close': '', on: { click: function () { api.renderFinish(); } }, text: L.check_review_close })]),
            ]),
          ]);
        };
        // With a teacher code the review screen asks for it. Five wrong codes,
        // then a 30 s wait (kept in the saved state, so a reload does not clear it).
        var teacher;
        if (!lock) teacher = [el('button', { type: 'button', 'data-teacher-open': '', on: { click: review }, text: L.check_teacher_open })];
        else {
          var busy = false;
          var message = api.statusLine('', '');
          var code = el('input', { id: 'teacher-code', type: 'password', autocomplete: 'off', maxlength: '64' });
          var tryCode = function () {
            var k = c.lock && typeof c.lock === 'object' ? c.lock : (c.lock = { fails: 0, until: 0 });
            var t = nowMs();
            if (k.until > t) { message.className = 'status warn'; message.textContent = fmt(L.check_teacher_wait, { seconds: Math.ceil((k.until - t) / 1000) }); return; }
            var typed = String(code.value || '').replace(/^\s+|\s+$/g, '');
            if (!typed || busy) return;
            busy = true;
            message.className = 'status'; message.textContent = L.check_teacher_checking;
            win.setTimeout(function () {
              busy = false;
              if (kit.codec.same(kit.codec.lockHash(typed, lock.salt, lock.rounds), lock.hash)) { k.fails = 0; k.until = 0; api.save(); review(); return; }
              k.fails = (Number(k.fails) || 0) + 1;
              message.className = 'status warn';
              if (k.fails >= 5) { k.fails = 0; k.until = nowMs() + 30000; message.textContent = fmt(L.check_teacher_wait, { seconds: 30 }); }
              else message.textContent = fmt(L.check_teacher_wrong, { left: 5 - k.fails });
              code.value = '';
              api.save();
            }, 30);
          };
          code.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); tryCode(); } });
          teacher = [el('h3', { style: 'margin:0 0 8px;font-size:1.1rem', text: L.check_teacher_title }), el('label', { for: 'teacher-code', text: L.check_teacher_code }),
            el('div', { class: 'row' }, [code, el('button', { type: 'button', 'data-teacher-show': '', on: { click: tryCode }, text: L.check_teacher_show })]), message];
        }
        // Start over asks first. The new run gets a new session id and the next try number.
        var againText = el('p', { id: 'check-again-text', tabindex: '-1', style: 'margin:0 0 8px', text: L.check_again_confirm });
        var again = el('button', { type: 'button', 'data-check-again': '', on: { click: function () { againBox.hidden = false; againText.focus(); } }, text: L.check_again });
        var againBox = el('div', { class: 'status warn', role: 'group', 'aria-labelledby': 'check-again-text', hidden: true, 'data-check-again-confirm': '' }, [
          againText,
          el('div', { class: 'row' }, [
            el('button', { type: 'button', class: 'primary', 'data-check-again-no': '', on: { click: function () { againBox.hidden = true; again.focus(); } }, text: L.check_again_no }),
            el('button', { type: 'button', 'data-check-again-yes': '', on: { click: function () {
              var next = api.fresh();
              next.name = s.name; next.tries = s.tries;
              api.state(next); api.save(); api.renderStart();
            } }, text: L.check_again_yes }),
          ]),
        ]);
        api.screen(L.check_done_title, [
          el('div', { class: 'card' }, [
            c.completion === 'time' ? el('p', { text: L.check_time_up }) : null,
            el('p', { class: 'letters', text: fmt(L.check_done_count, { done: answered, total: scoredTotal }) }),
            el('p', { text: fmt(L.check_done_time, { time: clockText(sc.elapsedS * 1000) }) }),
            el('p', { text: L.check_about }),
            el('div', { class: 'row' }, [p.send, p.save, p.csv, p.copy, again, p.about.button]),
            againBox, p.status, p.copyBox,
            el('p', { class: 'muted', text: p.note }),
          ]),
          el('div', { class: 'card', 'data-teacher': '' }, teacher),
          p.about.panel,
        ]);
      },
    };
  }

  function buildHtml(lesson, options) {
    var opts = options || {};
    var core = opts.core;
    if (!lesson || lesson.schema !== LESSON_SCHEMA || !lesson.blocks || !lesson.blocks.length) throw new Error('No ready items to export');
    // A check (mode 'probe') is sealed here, whoever built the lesson: its
    // answers are scrambled and opts.teacherCode becomes a salted hash.
    var probe = lesson.mode === 'probe';
    var adapters = Object.assign({}, ADAPTERS, CHECK_ADAPTERS, opts.adapters || {});
    var used = lesson.blocks.map(function (b) { return b.activity; }).filter(function (id, i, all) { return all.indexOf(id) === i; });
    // Only a file with a Word Sounds activity grades by sound.
    var hasCore = !!core && typeof core.soundAnswerMatches === 'function';
    if (!hasCore && !(probe && used.every(function (id) { return !!CHECK_ADAPTERS[id] && !(opts.adapters && opts.adapters[id]); }))) throw new Error('buildHtml needs WS_CORE');
    if (probe) lesson = sealCheck(lesson, adapters, opts.teacherCode);
    var labels = Object.assign({}, DEFAULT_LABELS, probe ? CHECK_LABELS : {});
    used.forEach(function (id) { Object.assign(labels, adapters[id].labels || {}); labels[id + '_title'] = labels[id + '_title'] || adapters[id].title; });
    Object.assign(labels, opts.labels || {});
    var renders = '{' + used.map(function (id) { return JSON.stringify(id) + ':' + adapters[id].render.toString(); }).join(',\n') + '}';
    // A check carries its own flow, the SHA-256 that reads its answers and the
    // scoring of its activities. TextEncoder is stood in for where a browser
    // has none, so the answers can always be read.
    var checkParts = !probe ? '' : 'kit.sha=(function(){var SHA_K=' + JSON.stringify(SHA_K)
      + ';\nvar TextEncoder=window.TextEncoder||function(){this.encode=function(t){t=unescape(encodeURIComponent(t));var b=new Uint8Array(t.length);for(var i=0;i<t.length;i++)b[i]=t.charCodeAt(i);return b;};};\nreturn '
      + sha256.toString() + ';})();\nkit.codec=(' + checkCodec.toString() + ')(kit.sha);\nkit.score=' + checkScore.toString()
      + ';\nkit.scorers={' + used.map(function (id) { return JSON.stringify(id) + ':' + (typeof adapters[id].score === 'function' ? adapters[id].score.toString() : 'null'); }).join(',\n')
      + '};\nkit.check=' + takeHomeCheck.toString() + ';\n';
    var mailbox = lesson.submit && /^https:\/\/script\.google\.com\//.test(lesson.submit.url);
    var connect = mailbox ? 'https://script.google.com https://script.googleusercontent.com' : "'none'";
    // The mailbox code travels only in a file that has a mailbox. Line ends are
    // made \n because the browser reads them so, and the script is allowed by
    // its exact hash.
    var script = ('\n(function(){"use strict";\nvar lesson=' + safeJson(lesson) + ';\nvar labels=' + safeJson(labels) + ';\nvar matches=' + (hasCore ? core.soundAnswerMatches.toString() : 'null')
      + ';\nvar renders=' + renders + ';\nvar kit={csv:' + packetCsv.toString() + ',\nhash:' + hashText.toString() + ',\nmailbox:' + (mailbox ? takeHomeMailbox.toString() : 'null')
      + '};\n' + checkParts + '(' + takeHomeShell.toString() + ')(document,window,lesson,labels,matches,renders,kit);\n})();\n').replace(/\r\n?/g, '\n');
    var digest = sha256(script);
    var csp = "default-src 'none'; script-src " + (digest ? "'sha256-" + digest.base64 + "'" : "'unsafe-inline'") + "; style-src 'unsafe-inline'; media-src data: blob:; img-src data:"
      + "; form-action 'none'; base-uri 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; manifest-src 'none'; connect-src " + connect;
    // What a reviewer (or a parent, behind "About this file") can check.
    var stem = packetCsv({ lessonTitle: lesson.title, learner: 'LEARNER' }).stem + '__DATE';
    var manifest = {
      kind: 'alloflow-packet-manifest', engine: PACKET_ENGINE, player: PLAYER, title: lesson.title,
      packet: { id: lesson.lessonId, version: lesson.revision, form: probe ? str(lesson.form) : '', mode: probe ? 'probe' : 'practice' },
      what: probe ? 'A check in one file: one try for each item, and no right or wrong shown to the learner. It runs in a browser with no internet connection.'
        : 'A practice activity in one file. It runs in a browser with no internet connection.',
      stores: [{ where: 'localStorage', key: 'alloflow-take-home:' + lesson.lessonId + ':' + lesson.revision,
        holds: probe ? 'the learner label, the place reached, the answers given, the time on each item, the time limit clock and a count of tries (by a hash of the learner label)'
          : 'the learner label, the place reached, the answers and the time on each item',
        until: probe ? 'the browser storage is cleared; Start over keeps only the learner label and the count of tries' : 'Start over or Practice again' }],
      saves: [{ file: stem + '.csv', format: 'alloflow-packet-result/1' }, { file: stem + '.json', format: RESULT_KIND + ' schemaVersion ' + RESULT_SCHEMA }],
      network: mailbox ? { sendsTo: 'script.google.com', what: 'the results, to the class mailbox of the teacher', when: 'only when the learner presses Send' } : 'none',
      never: (mailbox ? [] : ['internet connection']).concat(['microphone', 'camera', 'cookies', 'AI']),
      integrity: 'Each saved file carries a check value (SHA-256, or FNV-1a where the browser cannot make SHA-256). It detects accidental edits, not deliberate ones.',
      csp: csp, scriptSha256: digest ? digest.hex : '', licence: 'AGPL-3.0', attributions: Array.isArray(opts.attributions) ? opts.attributions.map(str) : [],
    };
    if (probe) {
      var all = lesson.blocks.reduce(function (list, b) { return list.concat(b.items); }, []);
      manifest.check = { measure: str(lesson.check.measure), scoreUnit: str(lesson.check.scoreUnit), scoringVersion: lesson.check.scoringVersion || 1, formVersion: lesson.check.formVersion == null ? '' : lesson.check.formVersion,
        timeLimitS: Number(lesson.timeLimitS) > 0 ? Number(lesson.timeLimitS) : null, items: all.filter(function (it) { return !it.practice; }).length, practiceItems: all.filter(function (it) { return it.practice; }).length,
        clock: Number(lesson.timeLimitS) > 0 ? 'the clock of the device; it does not pause when the page is hidden' : 'no time limit',
        answers: 'scrambled (XOR with a SHA-256 keystream); this stops casual looking, not a determined person',
        teacherCode: lesson.check.lock ? 'set; kept only as a salted SHA-256 hash (' + lesson.check.lock.rounds + ' rounds); it locks the review screen and is not encryption' : 'none' };
      labels.no_script = labels.check_no_script || labels.no_script;
    }
    // dir comes from the app (labels.dir) so Arabic, Farsi, Urdu, Hebrew... files read right to left.
    var dir = labels.dir === 'rtl' || labels.dir === 'ltr' ? ' dir="' + labels.dir + '"' : '';
    return '<!doctype html><html lang="' + escapeHtml(labels.lang || 'en') + '"' + dir + '><head><meta charset="utf-8">'
      + '<meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<meta http-equiv="Content-Security-Policy" content="' + csp + '">'
      + '<meta name="generator" content="' + PLAYER + '">'
      + '<title>' + escapeHtml(lesson.title) + '</title><style>' + CSS + (probe ? '\n' + CHECK_CSS : '') + '</style></head>'
      // #app holds a plain note for previews that do not run the file (Drive, Classroom, iPad Files);
      // the player replaces it as soon as it starts.
      + '<body><main><h1>' + escapeHtml(lesson.title) + '</h1><div id="app"><p data-no-script>' + escapeHtml(labels.no_script) + '</p></div><p id="live" class="sr" aria-live="polite"></p></main>'
      + '<script type="application/json" id="packet-manifest">' + safeJson(manifest) + '</script>'
      + '<script>' + script + '</script></body></html>';
  }

  // Teacher side: read returned result files (v1 Find Sounds files too).
  // Anything that is not exactly a result file is rejected with a reason.
  function parseResult(text) {
    var data;
    try { data = typeof text === 'string' ? JSON.parse(text) : text; } catch (_) { return { ok: false, error: 'not_json' }; }
    if (data && data.kind === 'alloflow-take-home-submission' && data.takeHomeResult) data = data.takeHomeResult;
    if (!data || data.kind !== RESULT_KIND) return { ok: false, error: 'not_a_result' };
    if (data.schemaVersion !== 1 && data.schemaVersion !== 2 && data.schemaVersion !== RESULT_SCHEMA) return { ok: false, error: 'unsupported_version' };
    if (!Array.isArray(data.items) || !data.lessonId) return { ok: false, error: 'incomplete' };
    // 'changed': the rows no longer match the value saved with them. It is
    // shown, never a reason to refuse the file (and it cannot catch a
    // deliberate edit). 'absent': an older file, or a value this browser cannot check.
    var integrity = 'absent';
    var saved = data.integrity && typeof data.integrity === 'object' ? data.integrity : null;
    if (saved && saved.value) {
      try {
        var basis = packetCsv(data).basis;
        var digest = saved.method === 'sha256' ? sha256(basis) : null;
        var value = saved.method === 'sha256' ? (digest && digest.hex) : saved.method === 'fnv1a' ? hashText(basis) : null;
        if (value !== null) integrity = value && value === str(saved.value) ? 'ok' : 'changed';
      } catch (_) { integrity = 'changed'; }
    }
    // A check (packet.mode "probe"): its items also carry digits, and the file a score block.
    var probe = !!data.packet && typeof data.packet === 'object' && data.packet.mode === 'probe';
    var whole = function (v) { return v == null || v === '' || !Number.isFinite(Number(v)) ? null : Math.max(0, Math.min(1000000, Math.round(Number(v)))); };
    var items = data.items.slice(0, 200).map(function (it) {
      return { ms: Math.max(0, Math.min(86400000, Math.round(Number(it && it.ms) || 0))), flag: str(it && it.flag).slice(0, 40), activity: str((it && it.activity) || (data.schemaVersion === 1 ? 'isolation' : '')).slice(0, 40), word: str(it && it.word).slice(0, 60),
        target: str(it && it.target).slice(0, 40), attempts: Math.max(0, Math.min(9, Number(it && it.attempts) || 0)),
        firstTry: !!(it && it.firstTry), correct: !!(it && it.correct), done: !!(it && it.done),
        practice: it && (it.practice === 'traced' || it.practice === 'skipped' || it.practice === 'practice') ? it.practice : null,
        responses: Array.isArray(it && it.responses) ? it.responses.slice(0, 6).map(function (r) { return str(r).slice(0, 80); }) : [],
        // Supports used (replays, hints): counts only, a bounded set of names.
        supports: (function (s) {
          var out = {};
          if (s && typeof s === 'object' && !Array.isArray(s)) Object.keys(s).slice(0, 12).forEach(function (k) {
            var n = Number(s[k]);
            if (/^[A-Za-z_]{1,40}$/.test(k) && Number.isFinite(n) && n > 0) out[k] = Math.min(999, Math.floor(n));
          });
          return out;
        })(it && it.supports) };
    });
    var summary = { items: 0, done: 0, firstTry: 0, afterRetry: 0, missed: 0, practised: 0 };
    var byActivity = {};
    items.forEach(function (r) {
      var a = byActivity[r.activity] || (byActivity[r.activity] = { items: 0, done: 0, firstTry: 0, afterRetry: 0, missed: 0, practised: 0 });
      // Practice (Letter Trace) is reported, never scored.
      if (r.practice || r.activity === 'letter_tracing') { if (r.done) { summary.practised++; a.practised++; } return; }
      summary.items++;
      a.items++;
      if (!r.done) return;
      summary.done++; a.done++;
      if (r.firstTry) { summary.firstTry++; a.firstTry++; } else if (r.correct) { summary.afterRetry++; a.afterRetry++; } else { summary.missed++; a.missed++; }
    });
    var titles = {};
    Object.keys(byActivity).forEach(function (id) {
      var given = data.activityTitles && typeof data.activityTitles === 'object' ? data.activityTitles[id] : null;
      titles[id] = str(given || (ADAPTERS[id] && ADAPTERS[id].title) || (id === 'isolation' ? 'Find Sounds' : id)).slice(0, 60);
    });
    var result = { activityTitles: titles, lessonId: str(data.lessonId).slice(0, 120), revision: str(data.revision).slice(0, 40), lessonTitle: str(data.lessonTitle).slice(0, 120),
      learnerName: str(data.learnerName || data.learner).slice(0, 60), finishedAt: str(data.finishedAt).slice(0, 40), items: items, summary: summary, byActivity: byActivity,
      integrity: integrity, sessionId: str(data.sessionId).slice(0, 80), startedLocal: str(data.startedLocal).slice(0, 40), finishedLocal: str(data.finishedLocal).slice(0, 40),
      durationMs: Math.max(0, Math.round(Number(data.durationMs) || 0)) };
    if (probe) {
      items.forEach(function (r, i) { var it = data.items[i] || {}; r.digitsCorrect = whole(it.digitsCorrect); r.digitsPossible = whole(it.digitsPossible); });
      var sc = data.score && typeof data.score === 'object' ? data.score : {};
      var num = function (v) { return v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v); };
      result.mode = 'probe';
      result.form = str(data.packet.form).slice(0, 40);
      // The score as the file states it. It is not covered by the integrity
      // value; the items are, and the counts can be made again from them.
      result.score = { measure: str(sc.measure).slice(0, 40), score: num(sc.score), scoreUnit: str(sc.scoreUnit).slice(0, 40), digitsCorrect: whole(sc.digitsCorrect), digitsPossible: whole(sc.digitsPossible),
        itemsCorrect: whole(sc.itemsCorrect) || 0, itemsAttempted: whole(sc.itemsAttempted) || 0, timeLimitS: num(sc.timeLimitS), elapsedS: num(sc.elapsedS) || 0, hiddenS: num(sc.hiddenS) || 0,
        completion: sc.completion === 'time' || sc.completion === 'ended_early' || sc.completion === 'complete' ? sc.completion : '', prorated: sc.prorated === true,
        noScoreReason: str(sc.noScoreReason).slice(0, 40), scoringVersion: whole(sc.scoringVersion),
        formVersion: typeof sc.formVersion === 'number' && Number.isFinite(sc.formVersion) ? sc.formVersion : str(sc.formVersion).slice(0, 20), attempt: whole(sc.attempt) || 1,
        flags: (Array.isArray(sc.flags) ? sc.flags : []).slice(0, 8).map(function (f) { return str(f).slice(0, 40); }) };
    }
    return { ok: true, integrity: integrity, result: result };
  }

  // Every recorded sound in the shipped file as WAV. The sound bank and most
  // browser recordings are WebM/Opus, which iPad and older Safari may not
  // play; 16-bit mono WAV plays in every browser. 22,050 Hz keeps the high
  // frequencies that tell /s/, /f/ and /th/ apart. Runs in the teacher's
  // browser before buildHtml; a clip it cannot decode is kept as it was.
  var PORTABLE_AUDIO = /^data:audio\/(?:wav|x-wav|wave|mpeg|mp3)[;,]/i;
  var PORTABLE_RATE = 22050;
  function dataUriBytes(uri) {
    var comma = uri.indexOf(',');
    var meta = uri.slice(0, comma), body = uri.slice(comma + 1);
    if (/;base64$/i.test(meta)) {
      var bin = atob(body), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }
    return new TextEncoder().encode(decodeURIComponent(body));
  }
  function wavDataUri(samples, rate) {
    var bytes = new Uint8Array(44 + samples.length * 2), view = new DataView(bytes.buffer);
    var tag = function (at, text) { for (var i = 0; i < text.length; i++) view.setUint8(at + i, text.charCodeAt(i)); };
    tag(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); tag(8, 'WAVE'); tag(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    tag(36, 'data'); view.setUint32(40, samples.length * 2, true);
    for (var s = 0; s < samples.length; s++) {
      var v = Math.max(-1, Math.min(1, samples[s]));
      view.setInt16(44 + s * 2, v < 0 ? v * 32768 : v * 32767, true);
    }
    var out = '';
    for (var c = 0; c < bytes.length; c += 0x8000) out += String.fromCharCode.apply(null, bytes.subarray(c, c + 0x8000));
    return 'data:audio/wav;base64,' + btoa(out);
  }
  function portableAudio(lesson, options) {
    var opts = options || {};
    var g = typeof window !== 'undefined' ? window : root;
    var Ctx = opts.AudioContext || g.AudioContext || g.webkitAudioContext;
    var Offline = opts.OfflineAudioContext || g.OfflineAudioContext || g.webkitOfflineAudioContext;
    var report = { converted: 0, kept: 0, failed: [] };
    var ids = Object.keys((lesson && lesson.audio) || {});
    var todo = ids.filter(function (id) { return !PORTABLE_AUDIO.test(lesson.audio[id]); });
    report.kept = ids.length - todo.length;
    if (!todo.length) return Promise.resolve(report);
    if (!Ctx || !Offline) { report.failed = todo.slice(); return Promise.resolve(report); }
    var ctx;
    try { ctx = new Ctx(); } catch (_) { report.failed = todo.slice(); return Promise.resolve(report); }
    var done = 0;
    var decode = function (bytes) {
      return new Promise(function (resolve, reject) {
        var p = ctx.decodeAudioData(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), resolve, reject);
        if (p && p.then) p.then(resolve, reject);
      });
    };
    var convert = function (id) {
      return decode(dataUriBytes(lesson.audio[id])).then(function (buffer) {
        if (!buffer || !(buffer.duration > 0) || buffer.duration > 60) throw new Error('bad clip');
        var length = Math.max(1, Math.ceil(buffer.duration * PORTABLE_RATE));
        var offline = new Offline(1, length, PORTABLE_RATE);
        var source = offline.createBufferSource();
        source.buffer = buffer; source.connect(offline.destination); source.start(0);
        return new Promise(function (resolve, reject) {
          var p = offline.startRendering();
          if (p && p.then) p.then(resolve, reject);
          else offline.oncomplete = function (e) { resolve(e.renderedBuffer); };
        });
      }).then(function (rendered) {
        lesson.audio[id] = wavDataUri(rendered.getChannelData(0), PORTABLE_RATE);
        report.converted++;
      }, function () { report.failed.push(id); }).then(function () {
        done++;
        if (typeof opts.onProgress === 'function') { try { opts.onProgress(done, todo.length); } catch (_) {} }
      });
    };
    return todo.reduce(function (chain, id) { return chain.then(function () { return convert(id); }); }, Promise.resolve())
      .then(function () { try { if (ctx.close) ctx.close(); } catch (_) {} return report; });
  }

  // Which activities this build can export, with their names (for the dialog).
  function activities(extra) {
    var all = Object.assign({}, ADAPTERS, extra || {});
    return Object.keys(all).map(function (id) { return { id: id, title: all[id].title }; });
  }

  root.AlloWordSoundsTakeHome = {
    LESSON_SCHEMA: LESSON_SCHEMA, RESULT_KIND: RESULT_KIND, PLAYER: PLAYER, ORDINAL_KEYS: ORDINAL_KEYS, DEFAULT_LABELS: DEFAULT_LABELS,
    ADAPTERS: ADAPTERS, activities: activities,
    lessonFromPack: lessonFromPack, buildHtml: buildHtml, parseResult: parseResult, portableAudio: portableAudio,
    PACKET_ENGINE: PACKET_ENGINE, resultsCsv: packetCsv, sha256: sha256,
    // Check mode (lesson.mode 'probe'): see takeHomeCheck.
    CHECK_ADAPTERS: CHECK_ADAPTERS, CHECK_LABELS: CHECK_LABELS, CHECK_ROUNDS: CHECK_ROUNDS, checkCodec: checkCodec, checkScore: checkScore, _check: takeHomeCheck,
    // v1 name kept for callers built against the first release.
    buildFindSoundsHtml: buildHtml,
    _shell: takeHomeShell,
  };
})(typeof window !== 'undefined' ? window : globalThis);
