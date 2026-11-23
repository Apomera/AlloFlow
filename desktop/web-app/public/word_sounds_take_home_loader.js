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
// A lesson with mode 'probe' (an internal name; its results say mode "check")
// is a CHECK (one try, no feedback, an honest clock, a teacher's screen): see takeHomeCheck. Its answers are scrambled, which
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
  // Where a phone or tablet runs a saved file: shown with the note for previews that do not run it, in a file in
  // English (another language: labels.open_here, '' for none).
  var OPEN_HERE = 'Phone or tablet? Open this file at {address}';
  // The Open page of the site this file is made on (a Packets page served over http or https), else the usual one.
  function openAddress() {
    try {
      var at = typeof location !== 'undefined' ? location : null;
      // Not a test or local address (.test is reserved for testing; localhost and 127.0.0.1 are this computer).
      var local = /(?:^|\.)(?:test|localhost)$|^127\.|^\[?::1\]?$/.test(String(at && at.hostname || ''));
      if (at && !local && /^https?:$/.test(at.protocol) && /\/packets[\w.-]*\.html$/.test(at.pathname)) return at.host + at.pathname.replace(/[^/]*$/, '') + 'packets-open.html';
    } catch (_) {}
    return 'apomera.github.io/AlloFlow/packets-open.html';
  }


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
    continue_whose: 'Answers so far by: {name}.',
    start_over: 'Start over',
    start_over_confirm: 'Starting over erases the answers so far.',
    keep_going: 'Keep my answers',
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
    done_activity: '{first} of {total}',
    done_retry: 'Right after trying again: {retry}.',
    done_last_step: 'Last step: save your work for your teacher.',
    // 2026-11-17: the end screen of a practice file, for a young student: one big button with a picture, and the words
    // for adults in a fold. A check keeps its own end screen and the save_csv words.
    save_work: 'Save my work',
    saving_work: 'Your browser is saving {file}. Give that file to your teacher. If nothing appears, press Save my work again, or ask a grown-up.',
    grown_ups: 'For grown-ups',
    grown_ups_file: 'Save my work makes a spreadsheet file (CSV). Give that file to the teacher.',
    // 2026-11-22: Show my teacher — deskside conferencing summary on a practice file's end screen.
    confer_open: 'Show my teacher',
    confer_focus: 'To go over together',
    confer_all_first: 'All questions were right on the first try.',
    confer_missed: 'Missed',
    confer_retry: 'Right on retry',
    confer_answered: 'answered {got}',
    confer_expected: 'expected {want}',
    confer_supports: 'Supports used: {list}.',
    confer_supports_none: 'Supports used: none.',
    confer_time: 'Active time: {time}.',
    confer_note: 'Shown on this device only. Nothing is sent anywhere.',
    // 2026-11-13: practice that is not scored (Letter Trace), counted on the end screen.
    done_practice: 'Practice, not scored: {done} of {total} done.',
    // 2026-11-17: the missed questions, once more at the end (lesson.repeatMissed).
    again_of: 'Once more: {n} of {total}',
    done_again: 'Went over once more: {n}.',
    // 2026-11-13: a sound whose label is not its letters, as shown with letters on (ctx.sound); others print /a/.
    sound_name_oo_short: 'short oo (book)',
    sound_name_dh: 'th (this)',
    sound_name_zh: 'zh (vision)',
    sound_name_schwa: 'uh (schwa)',
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
    about_never: 'It never uses the microphone or the camera. It has no cookies and runs no AI.',
    about_check: 'Each saved file has a check value. It shows when a file was changed by accident. It cannot stop someone who changes a file on purpose.',
    about_rules: 'The safety rules this file gives the browser: {csp}',
    about_licence: 'License: {licence}. Anyone may read, share and change the code. The license: {licenceUrl}. The code: {source}.',
    about_credits: 'Made with: {list}',
    // Shown only when the file is opened somewhere that does not run it (a Drive or Files preview).
    no_script: 'If the practice does not start, download this file and open it in Chrome, Edge or Safari.',
    audio_missing: 'This sound could not play.',
    about_records: 'The results record your name or code name, each answer, the number of tries, the time on each item, how often each help was used (the reading tools too), the start and finish times with this device\'s time zone, and a random session number.',
    more_saves: 'Other ways to save',
    // Reading tools (every file): they change how the page looks, never the task.
    tools_button: 'Reading tools',
    tools_size: 'Text size',
    tools_normal: 'Normal',
    tools_size_1: 'Larger',
    tools_size_2: 'Largest',
    tools_size_3: 'Extra large',
    tools_colors: 'Colors',
    tools_colors_0: 'Usual',
    tools_colors_1: 'High contrast',
    tools_colors_2: 'Soft',
    tools_colors_3: 'Dark',
    tools_colors_4: 'Ocean',
    tools_colors_5: 'Sunny',
    tools_colors_6: 'Forest',
    tools_colors_7: 'Rose',
    tools_spacing: 'Spacing',
    tools_spacing_1: 'Wider',
    tools_spacing_2: 'Extra wide',
    tools_font: 'Letters',
    tools_font_1: 'Lexend',
    tools_font_2: 'Atkinson',
    tools_font_3: 'Book',
    tools_font_4: 'Rounded',
    tools_font_5: 'Mono',
    tools_font_6: 'OpenDyslexic',
    tools_focus: 'Reading focus',
    tools_focus_1: '1 line',
    tools_focus_2: '3 lines',
    tools_focus_3: 'Ruler',
    tools_focus_hint: 'Tap a line, or use the up and down arrow keys on the text.',
    tools_lens: 'Magnifier',
    tools_lens_hint: 'Move it with the mouse, or drag the round handle. With the keyboard, go to the handle and use the arrow keys. Esc closes it.',
    tools_lens_move: 'Move the magnifier',
    tools_off: 'Off',
    tools_on: 'On',
    tools_reset: 'Reset',
    tools_close: 'Close',
    progress_all: 'Question {n} of {total} in all',
    tools_choices: 'Read the choices when a question opens',
    tools_choices_hint: 'Each answer choice is played or read aloud in turn. Press Stop, or choose an answer, to stop it.',
    tools_directions: 'Spoken directions',
    tools_directions_0: 'Every question',
    tools_directions_1: 'First question only',
    tools_directions_hint: 'Says what to do on the first question of each activity, then goes straight to each word or sound. Hear the question still plays everything.',
    tools_sounds: 'Space between sounds',
    tools_sounds_0: 'Some',
    tools_sounds_1: 'More',
    tools_sounds_2: 'Less',
    tools_sounds_hint: 'The pause between the sounds of a word when it is sounded out. More helps hear each sound; less helps put them together.',
    tools_speed: 'Voice speed',
    tools_speed_0: 'Normal',
    tools_speed_1: 'Slower',
    tools_speed_2: 'Very slow',
    tools_speed_3: 'Faster',
    tools_speed_4: 'Fastest',
    tools_speed_hint: 'Changes how fast recorded words and read-aloud play.',
    tools_bold: 'Bold start',
    tools_bold_hint: 'Bolds the start of each word to help your eyes follow the text.',
    tools_motion: 'Motion',
    tools_motion_1: 'Less',
    tools_motion_hint: 'Turns off animations and movement on screen.',
    tools_no_voice: 'This device has no built-in reading voice.',
    // "Hear all" (hearAllIn): plays or reads each answer choice in turn.
    hear_all: 'Hear all',
    hear_all_name: 'Hear all the choices, one at a time',
    hear_all_stop: 'Stop',
    hear_all_now: 'Choice {n} of {total}',
    // 2026-11-13 (engine fixes): another copy of the file open on this device; a save the browser does not confirm
    // (a download); a sound that did not play, said on screen too (audio_missing is the screen-reader line).
    two_tabs: 'This file is already open in another tab or window. Use that one, or close it and press Continue here.',
    continue_here: 'Continue here',
    saving_file: 'Your browser is saving {file}. If nothing appears, press Save again or use Other ways to save.',
    sound_failed: 'That sound did not play. Try again, or ask your teacher.',
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
    check_ready_adult: 'For a young student: a grown-up reads this page aloud before the student presses Begin.',
    // 2026-11-17: a check that carries a recording of these lines (lesson.directions) has a button that plays them.
    check_ready_hear: 'Hear the directions',
    check_ready_adult_hear: 'For a young student: press Hear the directions, or a grown-up reads this page aloud, before the student presses Start.',
    check_review_heard: 'Times Hear the directions was pressed: {n}.',
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
    // 2026-11-13: shown in a timed check while "Stop?" is on screen: the clock is paused, the question hidden.
    check_paused: 'The clock is stopped while you decide.',
    check_done_title: 'You finished. Thank you.',
    check_done_count: 'You answered {done}.',
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
    check_review_focus: 'To go over together ({n}):',
    check_review_focus_none: 'To go over together: none missed on the attempted items.',
    check_review_score: 'Score: {score} {unit}.',
    check_review_no_score: 'No score: {reason}.',
    check_reason_ended_early: 'the check was stopped before the end',
    check_reason_too_fast: 'every item was finished in under 20 seconds, which is too fast to prorate to a full minute',
    check_reason_untimed: 'a rate needs a time limit',
    check_review_untimed: 'Untimed (an accommodation): no clock. The usual time limit is {seconds} s. Do not compare this score with timed scores.',
    check_unit_items_correct: 'items correct',
    check_unit_digits_correct_per_minute: 'digits correct per minute',
    check_review_items: 'Items correct: {correct} of {attempted} attempted ({given} given).',
    check_review_digits: 'Digits correct: {correct} of {possible} possible on the items attempted.',
    check_review_time: 'Time used: {elapsed} s. Time limit: {limit}.',
    check_review_limit: '{seconds} s',
    check_review_no_limit: 'none',
    check_review_hidden: 'Time with the page hidden or closed: {hidden} s.',
    check_review_prorated: 'All items were finished before the time limit, so the rate is prorated over the time used.',
    check_review_attempt: 'Attempt {n} for this name or code name on this device.',
    check_review_flags: 'Flags: {flags}.',
    check_flag_left_the_page: 'left the page for more than 3 seconds',
    check_flag_clock_changed: 'the device clock was set back',
    check_flag_reloaded: 'the page was reloaded',
    // 2026-11-13 (engine fixes): the check open in two tabs while it ran; the time ran out while the page was hidden or
    // closed (no score then); the browser could not keep the count of tries.
    check_flag_two_tabs: 'the check was open in two tabs or windows while it ran',
    check_flag_time_up_away: 'the time ran out while the page was hidden or closed',
    check_reason_time_up_away: 'the time ran out while the page was hidden or closed, so the student did not have the whole time',
    check_flag_attempt_unknown: 'this browser could not keep the count of tries, so the attempt number may be wrong',
    check_flag_paused: 'the check was paused; the problem on screen at each pause was set aside and not counted',
    check_review_paused: 'Time paused: {paused} s, {times}. The problem on screen at each pause was set aside and not counted.',
    check_review_paused_once: '1 pause',
    check_review_paused_many: '{n} pauses',
    check_r_paused: 'set aside (paused)',
    check_r_time_up_typed: 'time ran out (had typed {typed}, not counted)',
    check_review_note: 'All times come from the clock of the device the student used.',
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
    check_about_records: 'A check also records the seconds away from the page, the try number, and whether the page was left for more than 3 seconds, reloaded, or the device clock was set back.',
    check_review_tools: 'Reading tools used: {tools}.',
    // The teacher's screen of a check made without a teacher code: the score only, never the answers.
    check_review_no_code: 'To see each answer, make the check with a teacher code, or open the saved results file.',
  };

  // Sealed QR result labels (travel ONLY in a file made or sealed with a teacher QR public key).
  var QR_LABELS = {
    qr_show: 'Show sealed QR for teacher',
    qr_hide: 'Hide sealed QR',
    qr_title: 'Sealed QR for teacher',
    qr_note: 'Encrypted on this device for teacher key {fp}. Only the matching teacher key on this site can read it. Nothing is sent over the internet.',
    qr_alt: 'Sealed result QR code for teacher key {fp}',
    qr_copy: 'Copy sealed code',
    qr_copied: 'Sealed code copied.',
    qr_copy_manual: 'Copy this sealed code into Collect by sealed QR:',
    qr_trimmed: 'Long packet: all missed and retried items plus full totals are included; some first-try items were condensed to fit in one QR.',
    qr_error: 'Could not make the sealed QR in this browser. Save the CSV file instead.',
    qr_about: 'Sealed QR results: enabled for teacher key {fp} (X25519 + HKDF-SHA-256 + ChaCha20-Poly1305). The code is encrypted on this device and cannot be read without the teacher\'s private key. Nothing is sent over the internet.',
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
    // A check (packet.mode "check"; files saved before 2026-11-12 say "probe") has two more cells in every item row, after
    // "flag": digits_correct and digits_possible, each a whole number or empty
    // (item.digitsCorrect / item.digitsPossible; empty when null or absent).
    // The integrity value covers the item rows as written, so in a check it
    // covers these two cells too. The "#score" row is, like "#summary", not covered.
    var probe = text(packet.mode) === 'check' || text(packet.mode) === 'probe';
    var count = function (v) { return v == null || v === '' || !isFinite(Number(v)) ? '' : Math.max(0, Math.round(Number(v))); };
    if (probe) header.push('digits_correct', 'digits_possible');
    var titles = r.activityTitles && typeof r.activityTitles === 'object' ? r.activityTitles : {};
    var learner = text(r.learner != null ? r.learner : r.learnerName);
    var session = text(r.sessionId);
    var seconds = Math.round((Number(r.durationMs) || 0) / 1000);
    var list = Array.isArray(r.items) ? r.items : [];
    var summary = { itemsGiven: 0, attempted: 0, correct: 0, firstTry: 0, accuracyPct: 0, byActivity: [] };
    var by = {};
    // 2026-11-17: the recall times of the facts that were right at the first try from memory (item.recallMs).
    var recall = [];
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
        if (it.firstTry && it.recallMs != null && isFinite(Number(it.recallMs)) && Number(it.recallMs) >= 0) recall.push(Math.round(Number(it.recallMs)));
      }
      var supports = it.supports && typeof it.supports === 'object' ? Object.keys(it.supports).map(function (k) { return k + ':' + text(it.supports[k]); }).join(';') : '';
      return ['alloflow-packet-result/1', session, text(packet.id), text(packet.version), text(packet.form), text(packet.mode), learner,
        text(r.startedLocal), text(r.finishedLocal), seconds, Number(it.n) || i + 1, text(it.itemId), activity, text(titles[activity]),
        practice ? 0 : 1, text(it.word), text(it.target), (Array.isArray(it.responses) ? it.responses : []).map(text).join(' | '),
        it.correct ? 1 : 0, it.firstTry ? 1 : 0, Number(it.attempts) || 0, Math.max(0, Math.round(Number(it.ms) || 0)), supports, text(it.flag)]
        .concat(probe ? [count(it.digitsCorrect), count(it.digitsPossible)] : []);
    });
    // Empty when nothing is scored (a read-along, Letter Trace alone): 0 would read as a result.
    summary.accuracyPct = summary.itemsGiven ? Math.round(summary.correct / summary.itemsGiven * 100) : '';
    summary.accuracyOfAttemptedPct = summary.attempted ? Math.round(summary.correct / summary.attempted * 100) : '';
    if (recall.length) {
      recall.sort(function (x, y) { return x - y; });
      var mid = recall.length >> 1;
      summary.recallItems = recall.length;
      summary.recallMedianMs = Math.round(recall.length % 2 ? recall[mid] : (recall[mid - 1] + recall[mid]) / 2);
    }
    var line = function (cells) { return cells.map(cell).join(','); };
    var lines = rows.map(line);
    var notName = /[^a-z0-9]+/gi;
    try { notName = new RegExp('[^\\p{L}\\p{M}\\p{N}]+', 'gu'); } catch (_) {}
    // The title may take 60 characters (40 until 2026-11-16: the automatic titles end in the version letter, and
    // versions A, B and C of one file saved their results under the same name).
    var safe = function (v, max) { return text(v).replace(notName, '-').replace(/^-+|-+$/g, '').slice(0, max || 40).replace(/-+$/, ''); };
    // The file name carries the FINISH date, on the learner's clock.
    var day = /^\d{4}-\d{2}-\d{2}/.exec(text(r.finishedLocal) || text(r.startedLocal));
    return {
      header: header, rows: rows, lines: lines, summary: summary,
      stem: [safe(r.lessonTitle, 60) || 'packet', safe(learner) || 'results'].concat(day ? [day[0]] : []).join('__'),
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
        // The title the learner saw. That row is outside the integrity value.
        var title = text(r.lessonTitle).replace(/\s+/g, ' ').trim().slice(0, 120);
        if (title) tail[0].push('title=' + title);
        // Then the time on the items, s (activeMs; files saved from 2026-11-13). duration_s spans days when a file is resumed.
        if (r.activeMs != null && r.activeMs !== '' && isFinite(Number(r.activeMs))) tail[0].push('active_s=' + Math.max(0, Math.round(Number(r.activeMs) / 1000)));
        // 2026-11-17: right / attempted (accuracy_pct stays right / items given).
        tail[0].push('accuracy_of_attempted_pct=' + summary.accuracyOfAttemptedPct);
        // 2026-11-17: two more cells, only when the file timed a recall (cover, copy, compare; rehearsal): how many facts
        // were right at the first try from memory, and their typical (median) time from covered to answered, ms.
        if (summary.recallItems) tail[0].push('recall_items=' + summary.recallItems, 'recall_median_ms=' + summary.recallMedianMs);
        if (sc) tail.splice(1, 0, ['#score', session, kv('measure', sc.measure), kv('score', sc.score), kv('score_unit', sc.scoreUnit), kv('digits_correct', sc.digitsCorrect),
          kv('digits_possible', sc.digitsPossible), kv('items_correct', sc.itemsCorrect), kv('items_attempted', sc.itemsAttempted), kv('time_limit_s', sc.timeLimitS),
          kv('elapsed_s', sc.elapsedS), kv('hidden_s', sc.hiddenS), kv('completion', sc.completion), kv('prorated', !!sc.prorated), kv('scoring_version', sc.scoringVersion),
          kv('form_version', sc.formVersion), kv('attempt', sc.attempt), kv('flags', Array.isArray(sc.flags) ? sc.flags.map(text).join(';') : ''),
          // The reading tools on during a scored item.
          kv('tools_used', Array.isArray(sc.tools) ? sc.tools.map(text).join(';') : '')]
          // Untimed (an accommodation): two more cells, only then.
          .concat(sc.untimed ? [kv('timing', 'untimed'), kv('usual_time_limit_s', sc.usualTimeLimitS)] : [])
          // Paused: two more cells, only then.
          .concat(sc.pauses ? [kv('paused_s', sc.pausedS), kv('pauses', sc.pauses)] : [])
          // Hear the directions was pressed: one more cell, only then.
          .concat(sc.directionsHeard ? [kv('directions_heard', sc.directionsHeard)] : []));
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
      var ctrl = typeof win.AbortController === 'function' ? new win.AbortController() : null;
      var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 20000) : null;
      var clear = function () { if (timer !== null) { clearTimeout(timer); timer = null; } };
      var init = { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), redirect: 'follow' };
      if (ctrl) init.signal = ctrl.signal;
      return win.fetch(target.url, init)
        .then(function (r) { if (r && r.ok === false) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (data) { clear(); if (!data || data.ok !== true) throw new Error((data && data.e) || 'not ok'); return data; }, function (err) { clear(); throw err; });
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
  // 2026-11-13 parity: the app's sound cards play and select on a tap, then Check (94704af0e4); here each sound
  // has Listen, then Choose (the order every Listen + Choose pair now has). Below Hard the app shows 3 (Easy) or 4
  // (Medium) sounds and asks the first sound (Easy) or the first or last (Medium) (choiceLimit, trimChoices,
  // isolationPositions); a packet made with Choices Easy or Medium has its board made that way by the builder.
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
      var soundCount = Number(w.phonemeCount) || (Array.isArray(w.phonemes) ? w.phonemes.length : 0) || Number(board.soundCount) || 0;
      var namedKey = position > 0 && soundCount > 1 && position === soundCount - 1 ? 'last'
        : position === 1 && soundCount === 3 ? 'middle' : '';
      var prompt = namedKey
        ? (env.bankClip('isolation', namedKey) ||
          env.packClip('what is the ' + namedKey + ' sound?') ||
          env.packClip('what is the ' + namedKey + ' sound in ' + env.word + '?'))
        : null;
      var positionName = prompt ? namedKey : '';
      if (!prompt) {
        prompt = env.bankClip('isolation', ORDINAL_KEYS[position]) ||
          env.packClip('what is the ' + ORDINAL_KEYS[position] + ' sound?') ||
          env.packClip('what is the ' + (DEFAULT_LABELS.ordinals[position] || '') + ' sound in ' + env.word + '?');
      }
      if (!prompt) missing.push('question');
      var choices = labels.map(function (label) {
        var clip = env.phonemeClip(label);
        if (!clip) missing.push('/' + label + '/');
        return { label: label, audio: clip };
      });
      if (missing.length) return { missing: missing };
      var answer = choices.filter(function (c) { return c.label === target; })[0];
      var out = { position: position, target: target, wordAudio: wordAudio, promptAudio: prompt, choices: choices,
        introAudio: [prompt, wordAudio], answerAudio: [wordAudio, answer.audio] };
      if (positionName) out.positionName = positionName;
      return { item: out };
    },
    render: function (item, ctx) {
      var position = item.positionName === 'last' || item.positionName === 'middle'
        ? (ctx.L['isolation_pos_' + item.positionName] || item.positionName)
        : ctx.ordinal(item.position);
      var cards = [];
      var list = ctx.el('ul', { class: 'choices' });
      // A friendly name for a sound like oo_short (ctx.sound); /a/ for the rest.
      var said = function (label) { return typeof ctx.sound === 'function' ? ctx.sound(label) : '/' + label + '/'; };
      item.choices.forEach(function (choice, i) {
        var n = i + 1;
        var shown = ctx.showLetters ? said(choice.label) : ctx.fmt(ctx.L.sound_n, { n: n });
        var listen = ctx.el('button', { type: 'button', 'aria-label': ctx.fmt(ctx.L.listen_sound, { n: n }),
          on: { click: function () { ctx.support('soundListens'); ctx.play(choice.audio); } } }, ['\u25B6 ', ctx.fmt(ctx.L.sound_n, { n: n })]);
        var choose = ctx.el('button', { type: 'button', class: 'primary',
          'aria-label': ctx.showLetters ? ctx.fmt(ctx.L.choose_label, { sound: shown }) : ctx.fmt(ctx.L.choose_sound, { n: n }),
          on: { click: function () {
            if (ctx.isDone() || choose.getAttribute('aria-disabled') === 'true') return;
            var outcome = ctx.answer(choice.label, ctx.matches(choice.label, item.target), {
              correctText: ctx.fmt(ctx.L.isolation_correct, { position: position }),
              missedText: ctx.showLetters ? ctx.fmt(ctx.L.isolation_missed, { position: position, sound: said(item.target) })
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
      // Hear all (ctx.hearAll): each sound in turn, marked with its number.
      var hear = typeof ctx.hearAll === 'function' ? ctx.hearAll({ list: function () { return cards.map(function (c, i) { return { box: c.box, say: function () { return ctx.play(item.choices[i].audio); } }; }); } }) : null;
      if (hear) ctx.root.appendChild(hear.node);
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
    // 2026-11-13 parity: the app's sound-only choices are now cards (a tap plays and selects, a
    // large Check submits, a missed card is crossed out: 94704af0e4). The file keeps two buttons
    // per choice, Listen first, then Choose, in every activity, as Find Sounds always had them
    // (hear, then choose).
    // Fewer choices: the app trims this board below Hard (WS_CORE.choiceLimit + trimChoices:
    // Easy 3, Medium 4). A packet does the same when made with Choices Easy or Medium
    // (word_sounds_packet_builder.js, choiceLevels); a board as built (All) is shown whole.
    module.exports = {
      id: 'blending',
      title: 'Blend Sounds',
      labels: {
        blending_prompt: 'Blend these sounds together!',
        blending_question: 'Which word did you hear?',
        blending_hear_sounds: 'Hear the sounds',
        blending_play_all: 'Hear all',
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
        var doc = ctx.root.ownerDocument;
        var win = doc.defaultView;
        var cards = [];
        var token = 0;
        var timer = null;
        var watchingStop = false;
        var clearTimer = function () {
          if (timer != null) { try { win.clearTimeout(timer); } catch (_) {} timer = null; }
        };
        var mark = function (index) {
          cards.forEach(function (c, i) { c.box.style.outline = i === index ? '4px solid var(--accent)' : ''; c.box.style.outlineOffset = i === index ? '2px' : ''; });
        };
        var onDocStop = function (e) {
          if (!ctx.root.isConnected || (e && e.target && e.target.closest && e.target.closest('[data-player-stop-audio]'))) halt();
        };
        var onDocKey = function (e) {
          var k = String((e && e.key) || '');
          if (!ctx.root.isConnected || k === 'Escape' || k === 'Esc') halt();
        };
        var watchStop = function (on) {
          if (!doc || !doc.addEventListener || watchingStop === on) return;
          watchingStop = on;
          if (on) { doc.addEventListener('click', onDocStop, true); doc.addEventListener('keydown', onDocKey, true); }
          else { doc.removeEventListener('click', onDocStop, true); doc.removeEventListener('keydown', onDocKey, true); }
        };
        var halt = function () { token++; clearTimer(); watchStop(false); mark(-1); };
        // Play a sequence with the app's pauses; any tap, answer or new screen
        // ends it (a stopped clip never resolves, and the token moves on).
        var run = function (steps) {
          clearTimer();
          var mine = ++token;
          var i = 0;
          watchStop(true);
          var step = function () {
            timer = null;
            if (mine !== token) return;
            if (!ctx.root.isConnected) { watchStop(false); mark(-1); return; }
            if (i >= steps.length) { watchStop(false); mark(-1); return; }
            var s = steps[i++];
            mark(s.hi == null ? -1 : s.hi);
            ctx.play(s.id).then(function (ok) {
              if (mine !== token) return;
              if (ok === false) { watchStop(false); mark(-1); return; }
              timer = win.setTimeout(step, s.gap || 0);
            });
          };
          step();
        };
        var soundSteps = function () {
          var gap = ctx.soundGap ? ctx.soundGap() : 500;
          return item.sounds.map(function (id) { return { id: id, gap: gap }; }).concat([{ id: item.question, gap: 100 }]);
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
            } } }, [ctx.showLetters ? ctx.el('span', { class: 'letters', lang: 'en', text: shownWord }) : ctx.fmt(ctx.L.blending_option_n, { n: n })]);
          var box = ctx.el('li', { class: 'choice' }, [listen, choose]);
          cards.push({ box: box, choose: choose, right: String(choice.text).toLowerCase() === String(item.target).toLowerCase() });
          list.appendChild(box);
        });
        ctx.root.appendChild(ctx.el('p', { text: ctx.L.blending_prompt }));
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.blending_question }));
        // Play all the words: the player's Hear all (ctx.hearAll), each choice marked with its number.
        var hear = typeof ctx.hearAll === 'function' ? ctx.hearAll({ label: ctx.L.blending_play_all, support: 'optionReplays', before: halt, auto: false,
          list: function () { return cards.map(function (c, i) { return { box: c.box, say: function () { return ctx.play(item.choices[i].audio); } }; }); } }) : null;
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('soundReplays'); run(soundSteps()); } }, text: ctx.L.blending_hear_sounds }),
          hear ? hear.button : ctx.el('button', { type: 'button', on: { click: function () { ctx.support('optionReplays'); run(optionSteps(600)); } }, text: ctx.L.blending_play_all }),
          ctx.el('button', { type: 'button', 'data-stop-audio': '', on: { click: function () { halt(); if (typeof ctx.stop === 'function') ctx.stop(); } }, text: ctx.L.stop_audio || 'Stop audio' }),
          hear ? hear.note : null,
        ]));
        ctx.root.appendChild(list);
        if (typeof ctx.keys === 'function') {
          ctx.keys(function (key) {
            var k = String(key == null ? '' : key);
            if (k === 'Escape' || k === 'Esc') {
              var active = watchingStop || timer != null;
              halt();
              if (typeof ctx.stop === 'function') ctx.stop();
              return active;
            }
            return false;
          });
        }
        // Opening sequence (word_sounds_module.js:16790-16845): instruction, each
        // sound, "Which word did you hear?", then every choice in turn.
        if (!ctx.isDone()) {
          run((ctx.skipDirections || !item.instruction ? [] : [{ id: item.instruction, gap: 200 }]).concat(soundSteps(), optionSteps(200)));
        }
        return {
          stop: halt,
          // The R key: the sounds and the question again.
          replay: function () { run(soundSteps()); },
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
    //   difficulty  the app shows fewer numbers below Hard (WS_CORE.countingChoices: Easy
    //               the count with two either side, Medium 1-8). A packet made with Easy or
    //               Medium carries those numbers in board.options; key n presses the button
    //               n (data-key). A board without them shows 1-10 and 11+, as before.
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
        counting_answer_mark: '(the answer)',
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
        var item = { target: target, wordAudio: wordAudio, promptAudio: prompt,
          introAudio: [prompt, wordAudio], answerAudio: [wordAudio] };
        // Fewer numbers (countingChoices), when the board has them and the answer is among them.
        var board = w.activityItems && w.activityItems.counting;
        var full = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11+'];
        var shown = board && Array.isArray(board.options) ? board.options.map(function (v) { return String(v); }) : null;
        if (shown && shown.length >= 2 && shown.length < full.length && shown.indexOf(target) >= 0 &&
          shown.every(function (v, i) { return full.indexOf(v) >= 0 && shown.indexOf(v) === i; })) item.values = shown;
        return { item: item };
      },
      render: function (item, ctx) {
        var values = item.values && item.values.length ? item.values : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11+'];
        var countText = function (v) {
          return v === '11+' ? ctx.L.counting_sounds_more : v === '1' ? ctx.L.counting_sounds_one : ctx.fmt(ctx.L.counting_sounds_n, { n: v });
        };
        var cards = [];
        var list = ctx.el('ul', { class: 'counting-numbers', style: 'display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0;margin:16px 0' });
        values.forEach(function (v) {
          var button = ctx.el('button', { type: 'button', class: 'primary', 'aria-label': v === '11+' ? '11+ — ' + ctx.L.counting_sounds_more : countText(v),
            style: 'min-width:56px;min-height:56px;padding:8px 10px;font-size:1.4rem;font-weight:700',
            on: { click: function () {
              if (ctx.isDone() || button.getAttribute('aria-disabled') === 'true') return;
              var outcome = ctx.answer(v, v === item.target, {
                correctText: ctx.fmt(ctx.L.counting_correct, { count: countText(item.target) }),
                missedText: ctx.fmt(ctx.L.counting_missed, { count: countText(item.target) }),
              });
              if (outcome !== 'correct') { box.classList.add('tried'); button.setAttribute('aria-disabled', 'true'); }
            } } }, [v]);
          // data-key: the number key that presses it (the same as its label, also when fewer numbers are shown).
          var box = ctx.el('li', { class: 'choice solo', style: 'padding:4px', 'data-key': /^[1-9]$/.test(v) ? v : false }, [button]);
          cards.push({ box: box, button: button, value: v });
          list.appendChild(box);
        });
        if (typeof ctx.keys === 'function') {
          ctx.keys(function (key) {
            if (ctx.isDone()) return false;
            var k = String(key == null ? '' : key);
            var targetVal = k === '0' ? '10' : (k === '+' || k === '=') ? '11+' : '';
            if (!targetVal) return false;
            var hit = cards.filter(function (c) { return c.value === targetVal; })[0];
            if (!hit || hit.button.disabled || hit.button.getAttribute('aria-disabled') === 'true') return false;
            hit.button.click();
            return true;
          });
        }
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.counting_question }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: ctx.L.hear_question }),
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: ctx.L.hear_word }),
          ctx.el('button', { type: 'button', 'data-stop-audio': '', on: { click: function () { if (typeof ctx.stop === 'function') ctx.stop(); } }, text: ctx.L.stop_audio || 'Stop audio' }),
        ]));
        ctx.root.appendChild(list);
        return {
          reveal: function () {
            cards.forEach(function (c) {
              c.button.setAttribute('aria-disabled', 'true');
              if (c.value === item.target && !c.box.classList.contains('right')) {
                c.box.classList.add('right');
                c.button.setAttribute('aria-label', c.button.getAttribute('aria-label') + ' ' + (ctx.L.counting_answer_mark || '(the answer)'));
              }
            });
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
    // 2026-11-13: each picture shows the number of its key, 1-9 (the player's keys
    // choose the nth picture): file has / app lacks.

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
        // 2026-11-13 (answer audit): two words can share one picture (ask and asked, carry and carrying). A wrong choice
        // that shows the answer's picture, or one already shown, is left off: two of the same picture cannot be told apart.
        var answerPic = pics[choices.map(function (c) { return c.toLowerCase(); }).indexOf(target)];
        var shown = [], kept = [];
        choices.forEach(function (c, i) {
          if (c.toLowerCase() !== target && (pics[i] === answerPic || shown.indexOf(pics[i]) >= 0)) return;
          shown.push(pics[i]); kept.push({ text: c, image: pics[i] });
        });
        if (kept.length < 2) return { missing: ['the pictures to choose from are one picture'] };
        // The app speaks only its prompt text; setup does not prepare a clip for
        // it, so a pack that has one is a bonus, not a requirement.
        var prompt = env.packClip('Read the word, then tap its picture!');
        return { item: { target: word, printed: word, prompt: prompt,
          choices: kept,
          introAudio: prompt ? [prompt] : [], answerAudio: [] } };
      },
      render: function (item, ctx) {
        var cards = [];
        var norm = function (s) { return String(s == null ? '' : s).toLowerCase().trim(); };
        var list = ctx.el('ul', { class: 'choices' });
        item.choices.forEach(function (choice, i) {
          var right = norm(choice.text) === norm(item.target);
          var src = ctx.image(choice.image);
          var name = ctx.fmt(ctx.L.decoding_picture_of, { word: choice.text });
          // The picture's number, the key 1-9 that chooses it (2026-11-13).
          var number = i < 9 ? ctx.el('span', { 'aria-hidden': 'true', 'data-key-number': '', style: 'position:absolute;top:6px;inset-inline-start:6px;min-width:28px;height:28px;line-height:26px;border-radius:14px;border:1px solid var(--accent-ink);background:var(--accent);color:var(--accent-ink);font-weight:700;font-size:1rem;text-align:center', text: String(i + 1) }) : null;
          var pick = ctx.el('button', { type: 'button', 'aria-label': name, style: 'position:relative;width:100%;display:flex;justify-content:center;background:#fff',
            on: { click: function () {
              if (ctx.isDone() || pick.getAttribute('aria-disabled') === 'true') return;
              var outcome = ctx.answer(choice.text, right, {
                correctText: ctx.L.decoding_correct,
                missedText: ctx.fmt(ctx.L.decoding_missed, { word: item.printed }),
              });
              if (outcome !== 'correct') { box.classList.add('tried'); pick.setAttribute('aria-disabled', 'true'); }
            } } }, [number, ctx.el('img', { class: 'picture', src: src || '', alt: '', style: 'max-width:min(100%,160px);height:auto;object-fit:contain' })]);
          var box = ctx.el('li', { class: 'choice' }, [pick]);
          cards.push({ box: box, pick: pick, right: right });
          list.appendChild(box);
        });
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.decoding_prompt }));
        // The printed word, as the app shows it (CSS capitalize).
        ctx.root.appendChild(ctx.el('p', { class: 'letters', lang: 'en', dir: 'ltr', style: 'font-size:clamp(2rem,9vw,3rem);text-transform:capitalize;margin:8px 0;overflow-wrap:anywhere', text: item.printed }));
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
    //   cases       the app traces the CAPITAL first, then the lowercase as a "Bonus!" part
    //               (tracingPhase "upper" -> "lower", "Skip lowercase", fb_great_job +
    //               now_try_lowercase between them). The file does the same; board.cases
    //               ('both' default, 'capital', 'lowercase') is the maker's choice.
    //   shapes      the app draws the glyph in "Comic Sans MS"/"Chalkboard SE" with a green
    //               start dot. A device may have neither, so the file draws school letter
    //               shapes from STROKES below (single-story a and g), with writing lines, a
    //               green numbered start dot and an arrow for each stroke. A letter with no
    //               strokes (not a-z) falls back to the font glyph.
    //   checking    the app checks the letter region by region (an 8 x 8 grid), not just the
    //               total ink; the file checks a 7 x 7 grid and ink far from the letter.
    //               The app also weighs the start point (start 15%: within 35 px of the
    //               green dot) and tips "Start at the green dot!". The file gives the same
    //               tip, softly (2026-11-13): when the first stroke (longer than 24 px, as the
    //               app counts strokes) starts more than 35 px from dot 1, it says "Start at
    //               the green dot 1." and never fails the trace for it.
    //   audio       trace_letter, the letter's name (letter_x), "for", the word, as the app's
    //               opening; else inst_letter_tracing and the word. The bank names a-z only
    //               (letter_a..letter_z): for any other first letter there is no "Hear the
    //               letter" button at all (checked 2026-11-13).
    //   grading     none: letter_tracing is in WS_NON_GRADED_ACTIVITIES, so the file
    //               records it as practice ("traced" or "skipped"), never right or wrong.
    //   access      pointer events cover mouse, touch and pen; "Skip (not traced)" is the
    //               path for a student who cannot trace (2026-11-07 parity audit).

    // School letter shapes (ball and stick). Units: top line y=0, middle line y=50, base
    // line y=100, descenders to 145. Strokes are split by "|", in the order they are
    // written. M x y / L x y: a line; E cx cy rx ry a0 a1: part of an ellipse from angle a0
    // to a1 in degrees (0 = right, 90 = down; a1 < a0 goes counterclockwise); D x y: a dot.
    // Only the strokes of the letters an item traces travel in the file.
    var STROKES = {
      a: 'E 22 75 22 25 -30 -390|M 44 50 L 44 100',
      b: 'M 0 0 L 0 100|E 22 75 22 25 180 540',
      c: 'E 22 75 22 25 -40 -320',
      d: 'E 22 75 22 25 -30 -390|M 44 0 L 44 100',
      e: 'M 2 75 L 44 75 E 22 75 22 25 0 -320',
      f: 'E 34 14 13 14 -20 -180 L 21 100|M 6 50 L 40 50',
      g: 'E 22 75 22 25 -30 -390|M 44 50 L 44 125 E 24 125 20 20 0 150',
      h: 'M 0 0 L 0 100|M 0 72 E 22 72 22 22 180 360 L 44 100',
      i: 'M 0 50 L 0 100|D 0 28',
      j: 'M 24 50 L 24 125 E 6 125 18 18 0 160|D 24 28',
      k: 'M 0 0 L 0 100|M 38 50 L 2 78 L 40 100',
      l: 'M 0 0 L 0 100',
      m: 'M 0 50 L 0 100|M 0 70 E 15 70 15 20 180 360 L 30 100|M 30 70 E 45 70 15 20 180 360 L 60 100',
      n: 'M 0 50 L 0 100|M 0 72 E 21 72 21 22 180 360 L 42 100',
      o: 'E 23 75 23 25 -70 -430',
      p: 'M 0 50 L 0 145|E 22 75 22 25 180 540',
      q: 'E 22 75 22 25 -30 -390|M 44 50 L 44 145',
      r: 'M 0 50 L 0 100|M 0 74 E 20 74 20 22 180 310',
      s: 'E 22 62.5 20 12.5 -20 -270 E 22 87.5 20 12.5 -90 160',
      t: 'M 16 14 L 16 100|M 0 50 L 34 50',
      u: 'M 0 50 L 0 78 E 21 78 21 22 180 0 L 42 50|M 42 50 L 42 100',
      v: 'M 0 50 L 22 100 L 44 50',
      w: 'M 0 50 L 15 100 L 30 50 L 45 100 L 60 50',
      x: 'M 0 50 L 42 100|M 42 50 L 0 100',
      y: 'M 0 50 L 22 100|M 44 50 L 8 145',
      z: 'M 0 50 L 42 50 L 0 100 L 42 100',
      A: 'M 30 0 L 0 100|M 30 0 L 60 100|M 11 64 L 49 64',
      B: 'M 0 0 L 0 100|M 0 0 L 24 0 E 24 24 22 24 -90 90 L 0 48|M 0 48 L 28 48 E 28 74 24 26 -90 90 L 0 100',
      C: 'E 45 50 45 50 -40 -320',
      D: 'M 0 0 L 0 100|M 0 0 L 16 0 E 16 50 40 50 -90 90 L 0 100',
      E: 'M 0 0 L 0 100|M 0 0 L 44 0|M 0 50 L 36 50|M 0 100 L 44 100',
      F: 'M 0 0 L 0 100|M 0 0 L 44 0|M 0 50 L 36 50',
      G: 'E 45 50 45 50 -40 -360 L 58 50',
      H: 'M 0 0 L 0 100|M 50 0 L 50 100|M 0 50 L 50 50',
      I: 'M 20 0 L 20 100|M 0 0 L 40 0|M 0 100 L 40 100',
      J: 'M 40 0 L 40 74 E 20 74 20 26 0 165',
      K: 'M 0 0 L 0 100|M 46 0 L 2 52 L 48 100',
      L: 'M 0 0 L 0 100 L 42 100',
      M: 'M 0 0 L 0 100|M 0 0 L 32 64 L 64 0 L 64 100',
      N: 'M 0 0 L 0 100|M 0 0 L 52 100 L 52 0',
      O: 'E 45 50 45 50 -90 -450',
      P: 'M 0 0 L 0 100|M 0 0 L 24 0 E 24 26 24 26 -90 90 L 0 52',
      Q: 'E 45 50 45 50 -90 -450|M 58 72 L 92 104',
      R: 'M 0 0 L 0 100|M 0 0 L 24 0 E 24 26 24 26 -90 90 L 0 52|M 24 52 L 50 100',
      S: 'E 42 25 38 25 -20 -270 E 42 75 38 25 -90 160',
      T: 'M 26 0 L 26 100|M 0 0 L 52 0',
      U: 'M 0 0 L 0 66 E 25 66 25 34 180 0 L 50 0',
      V: 'M 0 0 L 26 100 L 52 0',
      W: 'M 0 0 L 18 100 L 36 0 L 54 100 L 72 0',
      X: 'M 0 0 L 52 100|M 52 0 L 0 100',
      Y: 'M 0 0 L 26 50|M 52 0 L 26 50 L 26 100',
      Z: 'M 0 0 L 52 0 L 0 100 L 52 100',
    };

    module.exports = {
      id: 'letter_tracing',
      title: 'Letter Trace',
      STROKES: STROKES,
      labels: {
        letter_tracing_question: 'Trace the letter {letter} with your finger, a pen or the mouse.',
        letter_tracing_canvas: 'Tracing area for the letter {letter}',
        letter_tracing_done: 'I traced it',
        letter_tracing_undo: 'Undo stroke',
        letter_tracing_clear: 'Start again',
        letter_tracing_skip: 'Skip (not traced)',
        letter_tracing_more: 'Keep going. Trace over more of the letter.',
        letter_tracing_stay: 'Stay on the letter. Press Start again and trace inside its shape.',
        letter_tracing_traced: 'Nice tracing!',
        letter_tracing_skipped: 'Skipped. That is fine.',
        // 2026-11-13: capital and lowercase, as the app traces them.
        letter_tracing_capital: 'Trace the capital letter {letter}.',
        letter_tracing_lowercase: 'Trace the lowercase letter {letter}.',
        letter_tracing_tools: 'Use your finger, a pen or the mouse.',
        letter_tracing_part: 'Part {n} of {total}',
        letter_tracing_how_one: 'Start at the green dot 1. Follow the arrow.',
        letter_tracing_how_more: 'Start at the green dot 1. Follow the arrow. Then do 2, and the next numbers in order.',
        letter_tracing_canvas_capital: 'Tracing area for the capital letter {letter}',
        letter_tracing_canvas_lowercase: 'Tracing area for the lowercase letter {letter}',
        letter_tracing_hear_letter: 'Hear the letter',
        letter_tracing_now_lowercase: 'Nice tracing! Now trace the lowercase letter {letter}.',
        letter_tracing_skip_lowercase: 'Skip the lowercase letter',
        // The app prints "for cat" beside the letter.
        letter_tracing_word: 'The word: {word}',
        // 2026-11-13: a tip, never a fail: the first stroke started far from the start dot.
        letter_tracing_start_one: 'Start at the green dot 1.',
        letter_tracing_start_more: 'Start at the green dot 1.',
      },
      prepare: function (w, env) {
        var word = String((w && (w.targetWord || w.word || w.term)) || '').trim();
        var first = Array.from(word)[0] || '';
        var board = w && w.activityItems && w.activityItems.letter_tracing;
        var letter = String((board && board.letter) || first).trim();
        if (!letter || !first || Array.from(letter).length !== 1 || letter.toLowerCase() !== first.toLowerCase()) return { missing: ['board'] };
        var cases = board && (board.cases === 'capital' || board.cases === 'lowercase') ? board.cases : 'both';
        var up = letter.toUpperCase(), low = letter.toLowerCase();
        // A letter with no capital (or one that is two letters as a capital, like ß) is traced as it is.
        var cased = up !== low && Array.from(up).length === 1 && Array.from(low).length === 1;
        var part = function (text, kind) { return { letter: text, kind: kind, strokes: Object.prototype.hasOwnProperty.call(STROKES, text) ? STROKES[text] : null }; };
        var parts = !cased ? [part(letter, '')] : cases === 'capital' ? [part(up, 'capital')] : cases === 'lowercase' ? [part(low, 'lowercase')] : [part(up, 'capital'), part(low, 'lowercase')];
        // Tracing is visual: the spoken instruction and the word are helpful, not required.
        var wordAudio = env.wordClip(word);
        var named = /^[a-z]$/.test(low) ? env.bankClip('instructions', 'letter_' + low) : null;
        var traceIt = env.bankClip('instructions', 'trace_letter');
        var prompt = env.bankClip('instructions', 'inst_letter_tracing');
        var intro = [];
        if (traceIt && named) {
          // The app's opening: "Trace the letter", its name, "for", the word.
          intro.push(traceIt, named);
          var forClip = env.bankClip('instructions', 'for');
          if (forClip && wordAudio) intro.push(forClip);
        } else if (prompt) intro.push(prompt);
        if (wordAudio) intro.push(wordAudio);
        var item = { target: low, letter: letter, parts: parts, wordAudio: wordAudio, promptAudio: (traceIt && named) ? traceIt : prompt,
          introAudio: intro, answerAudio: wordAudio ? [wordAudio] : [] };
        if (named) item.letterAudio = named;
        if (parts.length > 1) { var next = env.bankClip('instructions', 'now_try_lowercase'); if (next) item.lowerAudio = next; }
        return { item: item };
      },
      render: function (item, ctx) {
        var L = ctx.L;
        var doc = ctx.root.ownerDocument;
        var win = doc.defaultView || {};
        var size = 280;
        var k = Math.min(2, Math.max(1, Math.round(Number(win.devicePixelRatio) || 1)));
        var px = size * k;
        var parts = item.parts && item.parts.length ? item.parts : [{ letter: item.letter, kind: '', strokes: null }];
        var at = 0;
        var pen = 22; // the width of the student's line and of the guide
        // A square that shrinks on a narrow phone (padding-top keeps it square without aspect-ratio).
        var wrap = ctx.el('div', { 'data-trace-box': '', style: 'position:relative;width:var(--trace-sz,' + size + 'px);max-width:100%;margin:6px auto;border:2px dashed var(--muted);border-radius:16px;background:var(--card);overflow:hidden;touch-action:none' });
        wrap.appendChild(ctx.el('div', { 'aria-hidden': 'true', style: 'padding-top:100%' }));
        var guide = doc.createElement('canvas');
        var ink = doc.createElement('canvas');
        [guide, ink].forEach(function (c) {
          c.width = px; c.height = px;
          c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;touch-action:none';
          wrap.appendChild(c);
        });
        guide.setAttribute('aria-hidden', 'true');
        ink.setAttribute('role', 'img');
        ink.setAttribute('data-trace-pen', '');
        var gg = guide.getContext ? guide.getContext('2d') : null;
        var pg = ink.getContext ? ink.getContext('2d') : null;
        // Each stroke as points in canvas units (CSS px), placed in the box.
        var shape = null;
        var parse = function (spec) {
          return String(spec).split('|').map(function (s) {
            var t = s.trim().split(/\s+/), pts = [], dot = false, i = 0;
            while (i < t.length) {
              var c = t[i++];
              if (c === 'M' || c === 'L' || c === 'D') { pts.push([Number(t[i]), Number(t[i + 1])]); dot = c === 'D'; i += 2; }
              else if (c === 'E') {
                var cx = Number(t[i]), cy = Number(t[i + 1]), rx = Number(t[i + 2]), ry = Number(t[i + 3]), a0 = Number(t[i + 4]), a1 = Number(t[i + 5]);
                i += 6;
                var n = Math.max(8, Math.ceil(Math.abs(a1 - a0) / 6));
                for (var j = 0; j <= n; j++) { var a = (a0 + (a1 - a0) * j / n) * Math.PI / 180; pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
              } else break;
            }
            return { pts: pts, dot: dot };
          }).filter(function (s) { return s.pts.length; });
        };
        var layout = function (part) {
          if (!part.strokes) return null;
          var strokes = parse(part.strokes);
          var xs = [], ys = [];
          strokes.forEach(function (s) { s.pts.forEach(function (p) { xs.push(p[0]); ys.push(p[1]); }); });
          var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
          // The part of the writing lines the letter uses (a short letter needs no room above the middle line, a letter
          // with no tail none below the base line), as large as the box allows, at most 2.4 px a unit.
          var top = Math.min(Math.min.apply(null, ys), 30) - 12, bottom = Math.max(Math.max.apply(null, ys), 100) + 12;
          var s = Math.min(2.4, (size - 28) / (bottom - top), (size - 40) / Math.max(1, maxX - minX));
          var ox = (size - (maxX - minX) * s) / 2 - minX * s, oy = (size - (bottom - top) * s) / 2 - top * s;
          var put = function (p) { return [ox + p[0] * s, oy + p[1] * s]; };
          return { y: function (v) { return oy + v * s; }, strokes: strokes.map(function (st) { return { dot: st.dot, pts: st.pts.map(put) }; }) };
        };
        var font = 'bold ' + Math.round(size * 0.7) + 'px "Comic Sans MS", "Chalkboard SE", "Andika", system-ui, sans-serif';
        // Draws the letter: as strokes (school shapes), or as the font glyph for a letter with no strokes.
        var paint = function (g, color, width) {
          g.setTransform(k, 0, 0, k, 0, 0);
          g.clearRect(0, 0, size, size);
          g.fillStyle = color; g.strokeStyle = color; g.lineCap = 'round'; g.lineJoin = 'round';
          if (!shape) {
            g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillText(parts[at].letter, size / 2, size * 0.54);
            if (width) { g.lineWidth = width; g.strokeText(parts[at].letter, size / 2, size * 0.54); }
            return;
          }
          g.lineWidth = width || pen;
          shape.strokes.forEach(function (st) {
            if (st.dot) { g.beginPath(); g.arc(st.pts[0][0], st.pts[0][1], (width || pen) / 2, 0, Math.PI * 2); g.fill(); return; }
            g.beginPath(); g.moveTo(st.pts[0][0], st.pts[0][1]);
            st.pts.slice(1).forEach(function (p) { g.lineTo(p[0], p[1]); });
            g.stroke();
          });
        };
        // Where a stroke is d px along its path, and which way it goes there.
        var along = function (pts, d) {
          var left = d;
          for (var i = 1; i < pts.length; i++) {
            var dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], len = Math.sqrt(dx * dx + dy * dy);
            if (!len) continue;
            if (left <= len || i === pts.length - 1) { var f = Math.min(1, left / len); return { x: pts[i - 1][0] + dx * f, y: pts[i - 1][1] + dy * f, ux: dx / len, uy: dy / len }; }
            left -= len;
          }
          return null;
        };
        // Live theme colors from Reading tools CSS variables (so Dark, Soft, High Contrast, Ocean, Sunny, Forest all stay crisp).
        var palette = function () {
          var cs = win.getComputedStyle ? win.getComputedStyle(doc.documentElement) : null;
          var cv = function (name, fallback) { var v = cs ? String(cs.getPropertyValue(name) || '').trim() : ''; return v || fallback; };
          var hc = doc.documentElement && doc.documentElement.getAttribute('data-lt-colors') === '1';
          return {
            hc: hc,
            card: cv('--card', '#ffffff'),
            ink: cv('--ink', '#1d2433'),
            muted: cv('--muted', '#4a5468'),
            line: cv('--line', '#94a3b8'),
            accent: cv('--accent', '#3d3aa8'),
            ok: cv('--ok', '#1d6b3a'),
          };
        };
        var drawGuide = function () {
          if (!gg) return;
          var pal = palette();
          gg.save();
          gg.globalAlpha = pal.hc ? 0.42 : 0.24;
          paint(gg, pal.muted, 0);
          gg.restore();
          if (!shape) return;
          // Writing lines behind the letter: top, a dashed middle, the base line.
          gg.globalCompositeOperation = 'destination-over';
          [[0, pal.hc ? 0.55 : 0.7, []], [50, pal.hc ? 0.55 : 0.7, [8, 7]], [100, pal.hc ? 0.9 : 0.85, []]].forEach(function (row) {
            gg.save();
            gg.globalAlpha = row[1];
            gg.beginPath(); gg.setLineDash(row[2]); gg.lineWidth = 2; gg.strokeStyle = row[0] === 100 ? pal.muted : (pal.hc ? pal.muted : pal.line);
            gg.moveTo(8, shape.y(row[0])); gg.lineTo(size - 8, shape.y(row[0])); gg.stroke();
            gg.restore();
          });
          gg.globalCompositeOperation = 'source-over';
          gg.setLineDash([]);
          // A thin dashed line down the middle of each stroke, then a numbered start dot and an arrow.
          gg.save();
          gg.globalAlpha = pal.hc ? 0.9 : 0.85;
          gg.lineWidth = 2; gg.strokeStyle = pal.muted; gg.setLineDash([5, 6]);
          shape.strokes.forEach(function (st) {
            if (st.dot) return;
            gg.beginPath(); gg.moveTo(st.pts[0][0], st.pts[0][1]);
            st.pts.slice(1).forEach(function (p) { gg.lineTo(p[0], p[1]); });
            gg.stroke();
          });
          gg.restore();
          gg.setLineDash([]);
          // 2026-11-13: no dot, number or arrow covers another. Dot 1 is at its real start. Each later stroke takes the
          // cheapest place for its dot (its real start; a little way along the stroke; beside or behind the start, with
          // a short line to it) that is 36 px from every earlier dot and 24 px from every earlier arrow, inside the box,
          // and leaves room for its own arrow (24 px from other dots, 22 from its own, 21 from every arrow), best nearer its own dot
          // than any other. Dots are drawn last, dot 1 on top. Guides only: the tracing check does not use them.
          var R = 12, dots = [], arrows = [], all = [];
          shape.strokes.forEach(function (st) { all = all.concat(st.pts); });
          var mid = [all.reduce(function (n, q) { return n + q[0]; }, 0) / all.length, all.reduce(function (n, q) { return n + q[1]; }, 0) / all.length];
          var lenOf = function (pts) { var t = 0; for (var i = 1; i < pts.length; i++) t += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return t; };
          var gap = function (q, list) { return list.reduce(function (n, m) { return Math.min(n, Math.hypot(m[0] - q[0], m[1] - q[1])); }, Infinity); };
          var inside = function (q) { return q[0] >= R + 2 && q[0] <= size - R - 2 && q[1] >= R + 2 && q[1] <= size - R - 2; };
          var spots = function () { return dots.map(function (m) { return m.p; }); };
          var arrowAt = function (st, len, p, from, lead) {
            var others = spots(), heads = arrows.map(function (a) { return [a.x, a.y]; });
            for (var c = lead ? 4 : from + 22; c <= len - 4; c += 2) {
              var a = along(st.pts, c);
              if (!a) break;
              var q = [a.x, a.y];
              if (gap(q, others) < 24 || gap(q, [p]) < 22 || gap(q, heads) < 21) continue;
              var mine = Math.min(Math.hypot(q[0] - p[0], q[1] - p[1]), lead ? Math.hypot(q[0] - lead[0], q[1] - lead[1]) : Infinity);
              return { a: a, extra: c - (lead ? 4 : from + 22), near: mine <= gap(q, others) };
            }
            return null;
          };
          shape.strokes.forEach(function (st, n) {
            var start = st.pts[0], d = st.dot ? null : along(st.pts, 1), len = st.dot ? 0 : lenOf(st.pts), best = null;
            var pick = function (p, cost, from, lead) {
              if (n && (!inside(p) || gap(p, spots()) < 36 || gap(p, arrows.map(function (a) { return [a.x, a.y]; })) < 24)) return;
              var arrow = st.dot ? { a: null, extra: 0, near: true } : arrowAt(st, len, p, from, lead);
              if (!arrow) return;
              var score = cost + arrow.extra * 0.5 + (arrow.near ? 0 : 50);
              if (!best || score < best.score) best = { p: p, lead: lead, a: arrow.a, score: score };
            };
            pick(start, 0, 0, null);
            if (n) {
              if (d) for (var r = 24; r <= Math.min(72, len - 30); r += 4) { var o = along(st.pts, r); pick([o.x, o.y], r, r, null); }
              // Beside the start (away from the middle of the letter costs less), or behind it.
              var away = function (u) { return Math.hypot(start[0] + u[0] * 30 - mid[0], start[1] + u[1] * 30 - mid[1]); };
              var dirs = d ? [[-d.uy, d.ux], [d.uy, -d.ux]].sort(function (u, v) { return away(v) - away(u); }).map(function (u, i) { return [u, i ? 16 : 10]; }).concat([[[-d.ux, -d.uy], 12]])
                : [[[0, -1], 10], [[1, 0], 12], [[-1, 0], 12], [[0, 1], 16]];
              dirs.forEach(function (u) { for (var r2 = 26; r2 <= 64; r2 += 4) pick([start[0] + u[0][0] * r2, start[1] + u[0][1] * r2], r2 + u[1], 0, start); });
            }
            // Nowhere fits (not seen in a-z, A-Z): the real start and an arrow 34 px along, as before.
            if (!best) best = { p: start, lead: null, a: st.dot ? null : along(st.pts, 34) };
            dots.push(best);
            if (best.a) arrows.push(best.a);
          });
          // Short lines from moved dots to their real starts, then the arrows, then the dots.
          dots.forEach(function (m) {
            if (!m.lead) return;
            gg.beginPath(); gg.lineWidth = 2; gg.strokeStyle = pal.ok; gg.moveTo(m.lead[0], m.lead[1]); gg.lineTo(m.p[0], m.p[1]); gg.stroke();
            gg.beginPath(); gg.arc(m.lead[0], m.lead[1], 4, 0, Math.PI * 2); gg.fillStyle = pal.ok; gg.fill();
          });
          arrows.forEach(function (a) {
            gg.beginPath(); gg.fillStyle = pal.ok;
            gg.moveTo(a.x + a.ux * 10, a.y + a.uy * 10);
            gg.lineTo(a.x - a.ux * 6 - a.uy * 8, a.y - a.uy * 6 + a.ux * 8);
            gg.lineTo(a.x - a.ux * 6 + a.uy * 8, a.y - a.uy * 6 - a.ux * 8);
            gg.closePath(); gg.fill();
          });
          // The dots, last first, so dot 1 is on top. Always number dot 1 so start cues never rely on color alone (WCAG 1.4.1).
          for (var n = dots.length - 1; n >= 0; n--) {
            var p = dots[n].p;
            gg.beginPath(); gg.arc(p[0], p[1], R, 0, Math.PI * 2); gg.fillStyle = pal.ok; gg.fill();
            gg.lineWidth = 2; gg.strokeStyle = pal.card; gg.stroke();
            gg.fillStyle = pal.card; gg.font = 'bold 14px system-ui, sans-serif'; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.fillText(String(n + 1), p[0], p[1] + 1);
          }
        };
        var retintInk = function () {
          if (!pg) return;
          var pal = palette();
          pg.save();
          pg.setTransform(k, 0, 0, k, 0, 0);
          pg.globalCompositeOperation = 'source-in';
          pg.fillStyle = pal.accent;
          pg.fillRect(0, 0, size, size);
          pg.restore();
        };
        var drawing = false, activeId = null, last = null;
        var strokes = [], curStroke = null, undo = null;
        // The first stroke of a part (after Start again too): where it began and how long it is, for the start tip.
        var first = null, firstDone = false;
        var spot = function (e) {
          var r = ink.getBoundingClientRect();
          return { x: (e.clientX - r.left) * size / (r.width || size), y: (e.clientY - r.top) * size / (r.height || size) };
        };
        var line = function (a, b) {
          if (!pg) return;
          pg.setTransform(k, 0, 0, k, 0, 0);
          pg.strokeStyle = palette().accent; pg.lineWidth = pen; pg.lineCap = 'round'; pg.lineJoin = 'round';
          pg.beginPath(); pg.moveTo(a.x, a.y); pg.lineTo(b.x, b.y); pg.stroke();
        };
        var redrawInk = function () {
          if (!pg) return;
          pg.setTransform(1, 0, 0, 1, 0, 0);
          pg.clearRect(0, 0, px, px);
          strokes.forEach(function (pts) {
            if (!pts || !pts.length) return;
            line(pts[0], pts[0]);
            for (var i = 1; i < pts.length; i++) line(pts[i - 1], pts[i]);
          });
        };
        var updateUndo = function () {
          if (!undo) return;
          var has = strokes.length > 0 && !ctx.isDone();
          undo.hidden = strokes.length === 0;
          undo.disabled = !has;
          undo.setAttribute('aria-disabled', has ? 'false' : 'true');
        };
        var wipe = function () { first = null; firstDone = false; drawing = false; activeId = null; last = null; strokes = []; curStroke = null; if (pg) { pg.setTransform(1, 0, 0, 1, 0, 0); pg.clearRect(0, 0, px, px); } updateUndo(); };
        ink.addEventListener('pointerdown', function (e) {
          // Ignore secondary touches (palm rest / second finger on iPad) and non-left mouse buttons.
          if (ctx.isDone() || drawing || e.isPrimary === false || (e.pointerType === 'mouse' && e.button !== 0)) return;
          drawing = true; activeId = e.pointerId != null ? e.pointerId : null; last = spot(e);
          curStroke = [last]; strokes.push(curStroke);
          line(last, last);
          updateUndo();
          if (!firstDone) first = { x: last.x, y: last.y, len: 0 };
          try { ink.setPointerCapture(e.pointerId); } catch (_) {}
          e.preventDefault();
        });
        ink.addEventListener('pointermove', function (e) {
          if (!drawing || (activeId != null && e.pointerId !== activeId)) return;
          var p = spot(e);
          if (curStroke) curStroke.push(p);
          if (first && !firstDone) first.len += Math.sqrt((p.x - last.x) * (p.x - last.x) + (p.y - last.y) * (p.y - last.y));
          line(last, p); last = p; e.preventDefault();
        });
        // A stroke longer than 24 px is the first stroke (a tap is not); far from dot 1 (35 px, as the app), a tip.
        var startTip = function () {
          if (firstDone || !first || first.len <= 24) return;
          firstDone = true;
          var dot = shape && shape.strokes[0] && shape.strokes[0].pts[0];
          if (!dot || Math.sqrt((first.x - dot[0]) * (first.x - dot[0]) + (first.y - dot[1]) * (first.y - dot[1])) <= 35) return;
          note.textContent = shape.strokes.length > 1 ? (L.letter_tracing_start_more || '') : (L.letter_tracing_start_one || '');
        };
        var stop = function (e) {
          if (!drawing || (e && activeId != null && e.pointerId !== activeId)) return;
          startTip(); drawing = false; activeId = null; last = null; curStroke = null; updateUndo();
        };
        ink.addEventListener('pointerup', stop);
        ink.addEventListener('pointercancel', stop);
        // Redraw guide and re-tint existing ink whenever Reading tools theme or OS color scheme changes.
        var themeObs = null, schemeMq = null;
        var onTheme = function () {
          if (!ctx.root.isConnected) {
            if (themeObs) { try { themeObs.disconnect(); } catch (_) {} themeObs = null; }
            if (schemeMq && schemeMq.removeEventListener) { try { schemeMq.removeEventListener('change', onTheme); } catch (_) {} schemeMq = null; }
            return;
          }
          drawGuide();
          retintInk();
        };
        if (win.MutationObserver && doc.documentElement) {
          themeObs = new win.MutationObserver(onTheme);
          themeObs.observe(doc.documentElement, { attributes: true, attributeFilter: ['data-lt-colors'] });
        }
        try {
          schemeMq = win.matchMedia && win.matchMedia('(prefers-color-scheme: dark)');
          if (schemeMq && schemeMq.addEventListener) schemeMq.addEventListener('change', onTheme);
        } catch (_) {}
        // Region by region, as the app checks it: the share of the letter's 7 x 7 grid cells
        // the strokes cover, and how much ink lands well away from the letter (scribbling over
        // the whole box is not tracing). Every other pixel is enough.
        var measure = function () {
          if (!gg || !pg) return { done: 1, stray: 0 };
          var mask = doc.createElement('canvas'); mask.width = px; mask.height = px;
          var mg = mask.getContext('2d'); paint(mg, '#000', shape ? pen * 1.25 : 0);
          var halo = doc.createElement('canvas'); halo.width = px; halo.height = px;
          var hg = halo.getContext('2d'); paint(hg, '#000', shape ? pen * 2.6 : size * 0.14);
          var m = mg.getImageData(0, 0, px, px).data, h = hg.getImageData(0, 0, px, px).data, p = pg.getImageData(0, 0, px, px).data;
          var G = 7, cell = px / G, want = [], got = [], all = 0, away = 0;
          for (var y = 0; y < px; y += 2 * k) {
            for (var x = 0; x < px; x += 2 * k) {
              var i = (y * px + x) * 4 + 3, c = Math.floor(y / cell) * G + Math.floor(x / cell), on = p[i] > 0;
              if (m[i] > 128) { want[c] = (want[c] || 0) + 1; if (on) got[c] = (got[c] || 0) + 1; }
              if (on) { all++; if (h[i] <= 128) away++; }
            }
          }
          var cells = 0, covered = 0;
          for (var c2 = 0; c2 < G * G; c2++) if ((want[c2] || 0) >= 6) { cells++; if ((got[c2] || 0) / want[c2] >= 0.35) covered++; }
          return { done: cells ? covered / cells : 0, stray: all ? away / all : 0 };
        };
        var question = ctx.el('p', { class: 'letters', 'data-trace-question': '', style: 'margin:0 0 2px' });
        var tools = ctx.el('p', { class: 'muted', style: 'margin:0;font-size:0.875rem', text: L.letter_tracing_tools || '' });
        var stepLine = ctx.el('p', { class: 'muted', 'data-trace-part': '', style: 'margin:0;font-size:0.9rem' });
        var how = ctx.el('p', { class: 'muted', 'data-trace-how': '', style: 'margin:4px 0 0;font-size:0.9rem' });
        var note = ctx.el('p', { class: 'letters', 'aria-live': 'polite', style: 'margin:4px 0 0;min-height:1.2em' });
        var skipLower = ctx.el('button', { type: 'button', 'data-trace-skip-lowercase': '', hidden: true, on: { click: function () {
          if (ctx.isDone()) return;
          ctx.support('lowercaseSkipped');
          ctx.practice('traced', L.letter_tracing_traced);
        } }, text: L.letter_tracing_skip_lowercase });
        var showPart = function () {
          var part = parts[at];
          shape = layout(part);
          var named = { letter: part.letter };
          question.textContent = part.kind === 'capital' ? ctx.fmt(L.letter_tracing_capital, named)
            : part.kind === 'lowercase' ? ctx.fmt(L.letter_tracing_lowercase, named) : ctx.fmt(L.letter_tracing_question, named);
          tools.hidden = !part.kind;
          ink.setAttribute('aria-label', ctx.fmt(part.kind === 'capital' ? L.letter_tracing_canvas_capital : part.kind === 'lowercase' ? L.letter_tracing_canvas_lowercase : L.letter_tracing_canvas, named));
          stepLine.textContent = parts.length > 1 ? ctx.fmt(L.letter_tracing_part, { n: at + 1, total: parts.length }) : '';
          stepLine.hidden = parts.length < 2;
          how.textContent = !shape ? '' : shape.strokes.length > 1 ? L.letter_tracing_how_more : L.letter_tracing_how_one;
          how.hidden = !shape;
          skipLower.hidden = !(at > 0 && part.kind === 'lowercase');
          // 2026-11-18: on the lowercase part only its own skip shows: "Skip (not traced)" there marked the capital, traced
          // already, as not traced (the app hides it too).
          if (skip) skip.hidden = !skipLower.hidden;
          drawGuide();
          wipe();
        };
        var buttons = [];
        if (item.letterAudio) buttons.push(ctx.el('button', { type: 'button', on: { click: function () { ctx.support('letterReplays'); ctx.play(item.letterAudio); } }, text: L.letter_tracing_hear_letter }));
        if (item.wordAudio || item.promptAudio) buttons.push(ctx.el('button', { type: 'button', class: 'primary', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio || item.promptAudio); } }, text: L.hear_word }));
        var done = ctx.el('button', { type: 'button', class: 'primary', 'data-trace-done': '', on: { click: function () {
          if (ctx.isDone()) return;
          var m = measure();
          if (m.stray > 0.5) { note.textContent = L.letter_tracing_stay; return; }
          if (m.done < 0.6) { note.textContent = L.letter_tracing_more; return; }
          if (at < parts.length - 1) {
            at++;
            showPart();
            note.textContent = ctx.fmt(L.letter_tracing_now_lowercase, { letter: parts[at].letter });
            if (item.lowerAudio) ctx.play(item.lowerAudio);
            return;
          }
          note.textContent = '';
          ctx.practice('traced', L.letter_tracing_traced);
        } }, text: L.letter_tracing_done });
        undo = ctx.el('button', { type: 'button', 'data-trace-undo': '', hidden: true, disabled: true, 'aria-disabled': 'true', on: { click: function () {
          if (ctx.isDone() || !strokes.length) return;
          strokes.pop();
          if (!strokes.length) { first = null; firstDone = false; note.textContent = ''; }
          redrawInk();
          updateUndo();
        } }, text: L.letter_tracing_undo || 'Undo stroke' });
        var clear = ctx.el('button', { type: 'button', on: { click: function () { if (ctx.isDone()) return; wipe(); note.textContent = ''; } }, text: L.letter_tracing_clear });
        var skip = ctx.el('button', { type: 'button', on: { click: function () { if (ctx.isDone()) return; ctx.practice('skipped', L.letter_tracing_skipped); } }, text: L.letter_tracing_skip });
        ctx.root.appendChild(question);
        var metaKids = [];
        if (item.word) metaKids.push(ctx.el('p', { class: 'letters', 'data-trace-word': '', style: 'font-size:1.1rem;margin:0' }, String(L.letter_tracing_word || '{word}').split('{word}').reduce(function (out, bit, i) { if (i) out.push(ctx.el('span', { lang: 'en', dir: 'ltr', text: item.word })); if (bit) out.push(bit); return out; }, [])));
        metaKids.push(stepLine);
        ctx.root.appendChild(ctx.el('div', { style: 'display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:2px 10px;margin:0 0 2px' }, metaKids));
        ctx.root.appendChild(tools);
        if (buttons.length) ctx.root.appendChild(ctx.el('div', { class: 'row', style: 'margin-top:4px;gap:6px' }, buttons));
        ctx.root.appendChild(how);
        ctx.root.appendChild(wrap);
        ctx.root.appendChild(note);
        ctx.root.appendChild(ctx.el('div', { class: 'row', style: 'margin-top:6px;gap:8px' }, [done, undo, clear, skipLower, skip]));
        showPart();
        return {
          reveal: function () { [done, undo, clear, skipLower, skip].forEach(function (b) { b.setAttribute('aria-disabled', 'true'); }); if (undo) undo.disabled = true; },
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
    // 2026-11-13 parity: the app's sound-only choices are now cards (a tap plays and selects, a
    // large Check submits, a missed card is crossed out: 94704af0e4). The file keeps two buttons
    // per choice, Listen first, then Choose, in every activity, as Find Sounds always had them
    // (hear, then choose).
    // The task type is said plainly: "Take away a sound" / "Change a sound" (the app's card says
    // Phoneme Deletion / Phoneme Substitution).
    module.exports = {
      id: 'manipulation',
      title: 'Sound Swap',
      labels: {
        manipulation_prompt: 'Swap the sound to make a new word!',
        // 2026-11-13: plain words for the student (the app's task card says Phoneme Deletion / Substitution).
        manipulation_type_deletion: 'Take away a sound',
        manipulation_type_substitution: 'Change a sound',
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
        var doc = ctx.root.ownerDocument;
        var win = doc.defaultView;
        var cards = [];
        var token = 0;
        var timer = null;
        var watchingStop = false;
        var clearTimer = function () {
          if (timer != null) { try { win.clearTimeout(timer); } catch (_) {} timer = null; }
        };
        var mark = function (index) {
          cards.forEach(function (c, i) { c.box.style.outline = i === index ? '4px solid var(--accent)' : ''; c.box.style.outlineOffset = i === index ? '2px' : ''; });
        };
        var onDocStop = function (e) {
          if (!ctx.root.isConnected || (e && e.target && e.target.closest && e.target.closest('[data-player-stop-audio]'))) halt();
        };
        var onDocKey = function (e) {
          var k = String((e && e.key) || '');
          if (!ctx.root.isConnected || k === 'Escape' || k === 'Esc') halt();
        };
        var watchStop = function (on) {
          if (!doc || !doc.addEventListener || watchingStop === on) return;
          watchingStop = on;
          if (on) { doc.addEventListener('click', onDocStop, true); doc.addEventListener('keydown', onDocKey, true); }
          else { doc.removeEventListener('click', onDocStop, true); doc.removeEventListener('keydown', onDocKey, true); }
        };
        var halt = function () { token++; clearTimer(); watchStop(false); mark(-1); };
        var run = function (steps) {
          clearTimer();
          var mine = ++token;
          var i = 0;
          watchStop(true);
          var step = function () {
            timer = null;
            if (mine !== token) return;
            if (!ctx.root.isConnected) { watchStop(false); mark(-1); return; }
            if (i >= steps.length) { watchStop(false); mark(-1); return; }
            var s = steps[i++];
            mark(s.hi == null ? -1 : s.hi);
            ctx.play(s.id).then(function (ok) {
              if (mine !== token) return;
              if (ok === false) { watchStop(false); mark(-1); return; }
              timer = win.setTimeout(step, s.gap || 0);
            });
          };
          step();
        };
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
            } } }, [ctx.showLetters ? ctx.el('span', { class: 'letters', lang: 'en', text: choice.text }) : ctx.fmt(ctx.L.manipulation_option_n, { n: n })]);
          var box = ctx.el('li', { class: 'choice' }, [listen, choose]);
          cards.push({ box: box, choose: choose, right: right });
          list.appendChild(box);
        });
        ctx.root.appendChild(ctx.el('p', { text: ctx.L.manipulation_prompt }));
        // The app prints the task card (type + instruction) for every learner.
        ctx.root.appendChild(ctx.el('p', { class: 'muted', text: item.type === 'deletion' ? ctx.L.manipulation_type_deletion : ctx.L.manipulation_type_substitution }));
        ctx.root.appendChild(ctx.el('p', { class: 'letters', lang: 'en', text: item.instructionText }));
        // Hear all (the player's ctx.hearAll): each choice in turn, marked with its number. The opening already plays them.
        var hear = typeof ctx.hearAll === 'function' ? ctx.hearAll({ before: halt, auto: false,
          list: function () { return cards.map(function (c, i) { return { box: c.box, say: function () { return ctx.play(item.choices[i].audio); } }; }); } }) : null;
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); run(instructionSteps(0)); } }, text: ctx.L.manipulation_hear_instruction }),
          ctx.el('button', { type: 'button', on: { click: function () { halt(); ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: ctx.L.hear_word }),
          hear ? hear.button : null,
          hear ? hear.note : null,
        ]));
        ctx.root.appendChild(list);
        if (typeof ctx.keys === 'function') {
          ctx.keys(function (key) {
            var k = String(key == null ? '' : key);
            if (k === 'Escape' || k === 'Esc') {
              var active = watchingStop || timer != null;
              halt();
              if (typeof ctx.stop === 'function') ctx.stop();
              return active;
            }
            return false;
          });
        }
        // Opening sequence (word_sounds_module.js:16890-16937): the instruction,
        // 400 ms, then every choice in turn with 350 ms between.
        if (!ctx.isDone()) {
          run(instructionSteps(400).concat(item.choices.map(function (c, i) { return { id: c.audio, gap: 350, hi: i }; })));
        }
        return {
          stop: halt,
          // The R key: the instruction again.
          replay: function () { run(instructionSteps(0)); },
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
    // 2026-11-13: each tray chip has Listen first, then the spelling to pick up (as every Listen +
    // Choose pair now).
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
        mapping_says: '{spelling} says /{sound}/ here.',
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
        // 2026-11-18: a spelling that says a surprising sound in this word (the s of dogs says /z/) carries
        // that sound, so the board can explain it the first time the child plays the chip. Only these
        // well-known patterns; vowels and ordinary spellings get no note.
        var SAYS = { s: ['z', 'sh', 'zh'], se: ['z'], c: ['s'], ce: ['s'], ci: ['sh'], ti: ['sh'], g: ['j'], ge: ['j'], ch: ['k', 'sh'], x: ['gz'], ed: ['t', 'd'] };
        var says = graphemes.map(function (g, i) {
          var sound = phonemes.slice(starts[i], starts[i] + spans[i]).map(function (p) { return env.label(p) || ''; }).join('');
          var want = SAYS[String(g).toLowerCase()];
          return want && want.indexOf(sound) >= 0 ? sound : '';
        });
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
          chips: order.map(function (id) { var chip = spans[id] > 1 ? { text: graphemes[id], audio: clips[id][0], audios: clips[id], span: spans[id] } : { text: graphemes[id], audio: clips[id] }; if (says[id]) chip.says = says[id]; return chip; }),
          wordAudio: wordAudio, promptAudio: prompt,
          introAudio: [prompt], answerAudio: [wordAudio],
        };
        if (spanning) result.spans = spans;
        return { item: result };
      },
      render: function (item, ctx) {
        var doc = ctx.root.ownerDocument;
        var L = ctx.L;
        // One slot per sound. A spanning chip (item.spans[i] = 2: qu, x, the u of
        // cute, le) covers two slots side by side. No spans = one slot per chip.
        var spanOf = function (ci) { return item.chips[ci].span || 1; };
        var expSpans = item.spans || item.graphemes.map(function () { return 1; });
        var expStarts = [];
        var n = expSpans.reduce(function (sum, k) { expStarts.push(sum); return sum + k; }, 0);
        var slots = [];
        for (var s = 0; s < n; s++) slots.push(null);
        var picked = null;
        var errors = [];
        var locked = function () { return ctx.isDone(); };
        var text = function (ci) { return item.chips[ci].text; };
        var covered = function (si) { return si > 0 && slots[si] != null && slots[si - 1] === slots[si]; };
        // The surprising-sound notes ("s says /z/ here.") appear the first time a chip is played and stay for this word.
        // Never in a check (ctx.check): there the note would give away what the check measures. In practice a
        // note shown while the child works counts as help (support 'spellingNotes'); the ones shown with the answer do not.
        var notesEl = ctx.el('div', { 'data-mapping-notes': '', 'aria-live': 'polite' }), noted = [];
        var note = function (ci, help) {
          var chip = item.chips[ci];
          if (ctx.check || !chip || !chip.says || noted.indexOf(ci) >= 0) return;
          noted.push(ci);
          notesEl.appendChild(ctx.el('p', { class: 'letters', 'data-mapping-says': chip.text, text: ctx.fmt(L.mapping_says, { spelling: chip.text, sound: chip.says }) }));
          if (help) ctx.support('spellingNotes');
        };
        var hear = function (ci) { var chip = item.chips[ci]; if (chip.audios) ctx.playAll(chip.audios); else ctx.play(chip.audio); note(ci, true); };
        var takeOut = function (ci) { for (var i = 0; i < n; i++) if (slots[i] === ci) slots[i] = null; };

        var drag = null, dragEndedAt = 0;
        var dragged = function () { return Date.now() - dragEndedAt < 400; };
        var dragStart = function (e, ci, from, si) {
          if (locked() || e.isPrimary === false || (e.pointerType === 'mouse' && e.button !== 0)) return;
          drag = { ci: ci, from: from, si: si, x: e.clientX, y: e.clientY, src: e.currentTarget, ghost: null };
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
          e.currentTarget.addEventListener('pointermove', dragMove);
          e.currentTarget.addEventListener('pointerup', dragEnd);
          e.currentTarget.addEventListener('pointercancel', dragEnd);
        };
        var dragMove = function (e) {
          if (!drag) return;
          var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
          if (!drag.ghost) {
            if (dx * dx + dy * dy < 100) return;
            var g = drag.src.cloneNode(true);
            ['data-map-tile', 'data-map-slot', 'aria-label', 'aria-pressed'].forEach(function (a) { g.removeAttribute(a); });
            g.setAttribute('aria-hidden', 'true');
            var r = drag.src.getBoundingClientRect();
            g.style.cssText += ';position:fixed;margin:0;z-index:60;pointer-events:none;opacity:.92;width:' + r.width + 'px;height:' + r.height + 'px';
            doc.body.appendChild(g);
            drag.ghost = g;
            drag.w = r.width; drag.h = r.height;
            if (drag.from === 'tray') { picked = drag.ci; draw(); }
          }
          drag.ghost.style.left = (e.clientX - drag.w / 2) + 'px';
          drag.ghost.style.top = (e.clientY - drag.h / 2) + 'px';
          e.preventDefault();
        };
        var dragEnd = function (e) {
          var d = drag;
          drag = null;
          if (!d) return;
          d.src.removeEventListener('pointermove', dragMove);
          d.src.removeEventListener('pointerup', dragEnd);
          d.src.removeEventListener('pointercancel', dragEnd);
          if (!d.ghost) return;
          if (d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost);
          dragEndedAt = Date.now();
          var at = e.type === 'pointercancel' ? null : (typeof doc.elementFromPoint === 'function' ? doc.elementFromPoint(e.clientX, e.clientY) : null);
          var slotNode = at && at.closest ? at.closest('[data-map-slot]') : null;
          var trayNode = at && at.closest ? at.closest('[data-map-tray]') : null;
          if (slotNode && ctx.root.contains(slotNode)) {
            var to = Number(slotNode.getAttribute('data-map-slot'));
            if (d.from === 'tray') {
              placeChip(d.ci, to, null);
            } else if (to !== d.si) {
              var span = spanOf(d.ci);
              if (to + span > n) { ctx.announce(ctx.fmt(L.mapping_needs_two, { spelling: text(d.ci) })); return; }
              var swapSingle = span === 1 && slots[to] != null && spanOf(slots[to]) === 1 ? slots[to] : null;
              takeOut(d.ci);
              if (swapSingle != null) {
                slots[to] = d.ci;
                slots[d.si] = swapSingle;
              } else {
                for (var k = 0; k < span; k++) if (slots[to + k] != null) takeOut(slots[to + k]);
                for (var j = 0; j < span; j++) slots[to + j] = d.ci;
              }
              picked = null; errors = [];
              draw();
              afterPlace(d.ci, to, null);
            }
          } else if (trayNode && d.from === 'slot') {
            var first = slots.indexOf(d.ci);
            takeOut(d.ci);
            errors = [];
            draw();
            ctx.announce(ctx.fmt(L.mapping_removed, { spelling: text(d.ci), n: first + 1 }));
          } else if (d.from === 'tray') {
            picked = null; draw();
          }
        };

        var chipSlot = function (ci) { return ci % 6; };
        var chipBg = function (ci) { return 'var(--c' + chipSlot(ci) + 'b,var(--soft))'; };
        var chipBd = function (ci) { return 'var(--c' + chipSlot(ci) + ',var(--accent))'; };
        var tray = ctx.el('ul', { class: 'row', 'data-map-tray': '', 'aria-label': L.mapping_tray, style: 'list-style:none;padding:0;margin:16px 0;gap:12px' });
        var chipEls = item.chips.map(function (chip, ci) {
          var two = spanOf(ci) > 1;
          var pick = ctx.el('button', { type: 'button', class: 'primary', 'aria-pressed': 'false', 'data-map-tile': String(ci), 'data-map-c': String(chipSlot(ci)),
            'aria-label': ctx.fmt(L.mapping_pick, { spelling: chip.text }) + (two ? '. ' + ctx.fmt(L.mapping_two_sounds, { spelling: chip.text }) : ''),
            'data-span': two ? String(spanOf(ci)) : null,
            style: (two ? 'min-width:var(--map-span,154px);' : 'min-width:var(--map-sz,72px);') + 'min-height:var(--map-h,56px);font-size:1.5rem;font-weight:700;touch-action:none;color:var(--ink);background:' + chipBg(ci) + ';border:3px solid ' + chipBd(ci) + ';box-shadow:0 3px 0 ' + chipBd(ci),
            on: { click: function (e) { if (dragged()) return; onChip(ci, e); }, pointerdown: function (e) { dragStart(e, ci, 'tray', -1); } } }, [chip.text]);
          var li = ctx.el('li', { class: 'row', style: 'gap:6px' }, [pick]);
          tray.appendChild(li);
          return { li: li, pick: pick };
        });
        var slotList = ctx.el('ol', { class: 'slots', dir: 'ltr', 'aria-label': L.mapping_slots });
        var slotEls = slots.map(function (_, si) {
          var btn = ctx.el('button', { type: 'button', class: 'slot', 'data-map-slot': String(si), style: 'min-width:var(--map-box,80px);min-height:var(--map-box,80px);border-width:3px;font-size:1.5rem;font-weight:700',
            on: { click: function (e) { if (dragged()) return; onSlot(si, e); }, pointerdown: function (e) { if (slots[si] != null) dragStart(e, slots[si], 'slot', si); } } });
          var li = ctx.el('li', {}, [btn]);
          slotList.appendChild(li);
          return { btn: btn, li: li };
        });
        var clearBtn = ctx.el('button', { type: 'button', on: { click: function () {
          if (locked()) return;
          picked = null; errors = [];
          for (var i = 0; i < n; i++) slots[i] = null;
          draw(); ctx.announce(L.mapping_cleared);
          if (chipEls[0] && chipEls[0].pick) { try { chipEls[0].pick.focus(); } catch (_) {} }
        } }, text: L.mapping_clear });

        var draw = function () {
          var holding = picked != null && !locked();
          chipEls.forEach(function (c, ci) {
            c.li.hidden = slots.indexOf(ci) >= 0;
            var on = picked === ci;
            var bg = chipBg(ci), bd = chipBd(ci);
            c.pick.setAttribute('aria-pressed', on ? 'true' : 'false');
            c.pick.style.background = on ? bd : bg;
            c.pick.style.color = on ? 'var(--accent-ink)' : 'var(--ink)';
            c.pick.style.borderColor = bd;
            c.pick.style.boxShadow = on ? '0 0 0 3px var(--card), 0 0 0 7px ' + bd : '0 3px 0 ' + bd;
            if (locked()) c.pick.setAttribute('aria-disabled', 'true');
          });
          slotEls.forEach(function (el, si) {
            var btn = el.btn, ci = slots[si];
            // The second slot under a spanning chip is drawn by the chip's first slot.
            el.li.hidden = covered(si);
            var two = ci != null && spanOf(ci) > 1;
            var bad = errors.indexOf(si) >= 0 && ci != null;
            btn.textContent = '';
            if (ci == null) {
              btn.style.position = '';
              btn.textContent = String(si + 1);
            } else if (two) {
              btn.style.position = 'relative';
              btn.appendChild(ctx.el('span', { text: text(ci) }));
              btn.appendChild(ctx.el('span', {
                'aria-hidden': 'true',
                'data-span-dots': '',
                style: 'position:absolute;inset-inline:0;bottom:4px;display:flex;justify-content:space-around;font-size:0.7rem;line-height:1;opacity:0.75;pointer-events:none',
              }, [ctx.el('span', { text: '●' }), ctx.el('span', { text: '●' })]));
            } else {
              btn.style.position = '';
              btn.textContent = text(ci);
            }
            btn.style.minWidth = two ? 'var(--map-span-box,170px)' : 'var(--map-box,80px)';
            if (two) btn.setAttribute('data-span', String(spanOf(ci))); else btn.removeAttribute('data-span');
            if (ci != null && !bad) btn.setAttribute('data-map-c', String(chipSlot(ci))); else btn.removeAttribute('data-map-c');
            if (bad) btn.setAttribute('data-mapping-error', 'true'); else btn.removeAttribute('data-mapping-error');
            btn.style.borderStyle = ci == null ? 'dashed' : 'solid';
            btn.style.borderColor = bad ? 'var(--warn)' : ci == null ? (holding ? 'var(--accent)' : 'var(--muted)') : chipBd(ci);
            btn.style.background = bad ? 'var(--warn-bg)' : ci == null ? (holding ? 'var(--soft)' : '') : chipBg(ci);
            btn.style.color = bad ? 'var(--warn)' : ci == null ? '' : 'var(--ink)';
            btn.style.boxShadow = ci == null && holding ? '0 0 0 3px var(--accent)' : '';
            btn.style.touchAction = ci == null ? 'manipulation' : 'none';
            var baseLabel = ci == null ? ctx.fmt(L.mapping_slot_empty, { n: si + 1 })
              : two ? ctx.fmt(L.mapping_slot_filled_two, { n: si + 1, m: si + spanOf(ci), spelling: text(ci) })
              : ctx.fmt(L.mapping_slot_filled, { n: si + 1, spelling: text(ci) });
            btn.setAttribute('aria-label', bad ? baseLabel + ', check this one' : baseLabel);
            if (locked()) btn.setAttribute('aria-disabled', 'true');
          });
          if (locked()) clearBtn.setAttribute('aria-disabled', 'true');
        };
        var byKey = function (e) { return !e || e.detail === 0; };
        var onChip = function (ci, e) {
          if (locked() || slots.indexOf(ci) >= 0) return;
          if (picked === ci) { picked = null; draw(); ctx.announce(ctx.fmt(L.mapping_dropped, { spelling: text(ci) })); return; }
          picked = ci;
          draw();
          ctx.support('soundListens');
          hear(ci);
          ctx.announce(ctx.fmt(L.mapping_picked, { spelling: text(ci) }));
          var empty = slots.indexOf(null);
          if (byKey(e)) slotEls[empty >= 0 ? empty : 0].btn.focus();
        };
        var afterPlace = function (ci, si, e) {
          if (slots.indexOf(null) >= 0) {
            hear(ci);
            ctx.announce(ctx.fmt(L.mapping_placed, { spelling: text(ci), n: si + 1 }));
            if (e && byKey(e)) { for (var c = 0; c < chipEls.length; c++) if (slots.indexOf(c) < 0) { chipEls[c].pick.focus(); break; } }
            return;
          }
          // The last slot filled: grade the chips in slot order.
          var order = [], bad = [];
          for (var i = 0; i < n; i++) {
            if (covered(i)) continue;
            var c2 = slots[i];
            order.push(c2);
            var expIdx = expStarts.indexOf(i);
            var okSlot = expIdx >= 0 && String(text(c2)) === String(item.graphemes[expIdx]) && spanOf(c2) === expSpans[expIdx];
            if (!okSlot) bad.push(i);
          }
          var right = order.length === item.graphemes.length && bad.length === 0;
          var outcome = ctx.answer(order.map(text).join(' '), right, {
            correctText: L.mapping_correct,
            retryText: L.mapping_retry,
            missedText: ctx.fmt(L.mapping_missed, { spellings: item.graphemes.join(' ') }),
          });
          // A first miss stays on the board and marks wrong slots to check.
          if (outcome === 'retry') { errors = bad; draw(); }
        };
        var placeChip = function (ci, si, e) {
          var span = spanOf(ci);
          // A spanning chip cannot start in the last slot.
          if (si + span > n) { picked = null; draw(); ctx.announce(ctx.fmt(L.mapping_needs_two, { spelling: text(ci) })); return; }
          picked = null; errors = [];
          for (var k = 0; k < span; k++) if (slots[si + k] != null) takeOut(slots[si + k]); // chips already there go back to the tray
          for (var j = 0; j < span; j++) slots[si + j] = ci;
          draw();
          afterPlace(ci, si, e);
        };
        var onSlot = function (si, e) {
          if (locked()) return;
          if (picked == null) {
            var out = slots[si];
            if (out == null) { ctx.announce(L.mapping_how); return; }
            var first = slots.indexOf(out);
            takeOut(out);
            errors = [];
            draw();
            ctx.announce(ctx.fmt(L.mapping_removed, { spelling: text(out), n: first + 1 }));
            return;
          }
          if (si + spanOf(picked) > n) { ctx.announce(ctx.fmt(L.mapping_needs_two, { spelling: text(picked) })); return; }
          placeChip(picked, si, e);
        };

        if (typeof ctx.keys === 'function') {
          ctx.keys(function (key) {
            if (locked()) return false;
            var k = String(key == null ? '' : key);
            if (k === 'Escape' || k === 'Esc') {
              if (picked == null) return false;
              var drop = picked;
              picked = null;
              draw();
              ctx.announce(ctx.fmt(L.mapping_dropped, { spelling: text(drop) }));
              if (chipEls[drop] && chipEls[drop].pick) { try { chipEls[drop].pick.focus(); } catch (_) {} }
              return true;
            }
            if (k === 'Backspace') {
              for (var si = n - 1; si >= 0; si--) {
                if (slots[si] != null) {
                  var out = slots[si];
                  var first = slots.indexOf(out);
                  takeOut(out);
                  picked = null; errors = [];
                  draw();
                  ctx.announce(ctx.fmt(L.mapping_removed, { spelling: text(out), n: first + 1 }));
                  return true;
                }
              }
              return false;
            }
            if (k === 'Enter') {
              var ae = doc && doc.activeElement;
              var onBtn = !!(ae && String(ae.tagName || '').toUpperCase() === 'BUTTON' && !ae.closest('[hidden]') && !ae.disabled && ae.getAttribute('aria-disabled') !== 'true');
              if (onBtn || picked == null) return false;
              var sp = spanOf(picked);
              for (var ei = 0; ei <= n - sp; ei++) {
                var fits = true;
                for (var kk = 0; kk < sp; kk++) if (slots[ei + kk] != null) { fits = false; break; }
                if (fits) { placeChip(picked, ei, { detail: 1 }); return true; }
              }
              if (sp > 1) { ctx.announce(ctx.fmt(L.mapping_needs_two, { spelling: text(picked) })); return true; }
              return false;
            }
            if (/^[1-9]$/.test(k)) {
              var idx = Number(k) - 1;
              if (picked != null) {
                if (idx < n && !covered(idx)) {
                  if (idx + spanOf(picked) > n) { ctx.announce(ctx.fmt(L.mapping_needs_two, { spelling: text(picked) })); return true; }
                  placeChip(picked, idx, { detail: 1 });
                  return true;
                }
                return false;
              }
              if (idx < chipEls.length && slots.indexOf(idx) < 0) {
                onChip(idx, { detail: 1 });
                return true;
              }
            }
            return false;
          });
        }

        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: L.mapping_question }));
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.fmt(L.mapping_word, { word: item.word }) }));
        ctx.root.appendChild(ctx.el('p', { class: 'muted', text: L.mapping_how + ' ' + L.mapping_auto }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: L.hear_question }),
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: L.hear_word }),
        ]));
        ctx.root.appendChild(slotList);
        ctx.root.appendChild(notesEl);
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [clearBtn]));
        // Hear all (the player's ctx.hearAll): each spelling still in the tray, in turn, marked with its number.
        var hearing = typeof ctx.hearAll === 'function' ? ctx.hearAll({ ready: function () { return !locked(); },
          list: function () { return chipEls.map(function (c, ci) { return c.li.hidden ? null : { box: c.li, n: ci + 1, total: chipEls.length, say: function () { var chip = item.chips[ci]; return chip.audios ? ctx.playAll(chip.audios) : ctx.play(chip.audio); } }; }); } }) : null;
        if (hearing) ctx.root.appendChild(hearing.node);
        ctx.root.appendChild(tray);
        draw();
        return {
          reveal: function (correct) {
            picked = null; errors = [];
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
            // The answer shown: every surprising spelling of the word is explained too.
            item.chips.forEach(function (chip, ci) { note(ci, false); });
            slotEls.forEach(function (el) { el.btn.removeAttribute('data-map-c'); el.btn.style.borderColor = 'var(--ok)'; el.btn.style.background = 'var(--ok-bg)'; el.btn.style.color = ''; });
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
    //               An apostrophe, hyphen or space is shown plainly, not in a box
    //               (wsSpellFixedChar, b38ca18141), and is never the hidden one.
    //   grading     submitConstructionAnswer (~18887): trimmed, lowercased equality
    //               with correctLetter; the same unchanged answer is not resubmitted.
    //               checkAnswer default budget: 2 presentations (1 retry).
    //   audio       inst_missing_letter bank clip (INST_KEY_MAP ~16446); "Hear the word".
    // 2026-11-13 (owner): the letters, the choices and the sentence that names the
    // word are in the case the word is written (lowercase for a normal word, a name's
    // capital kept); the app shows capitals. Fixed characters as in the app.
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
        missing_letter_answer_mark: '(the answer)',
      },
      prepare: function (w, env) {
        var board = w.activityItems && w.activityItems.missing_letter;
        var written = String(env.word || '');
        var word = written.toLowerCase();
        if (!board) return { missing: ['board'] };
        // Same usability rule as the app's preparedMissingLetter.
        var letter = String(board.correctLetter == null ? '' : board.correctLetter).toLowerCase();
        var choices = Array.isArray(board.options) ? board.options.map(function (o) { return typeof o === 'string' ? o.toLowerCase() : ''; }) : [];
        // 2026-11-18: the hidden one is a letter (a letter has a capital), never the ' of "I'm" or the - of "t-shirt":
        // the only non-letter among the choices would be the answer.
        var usable = Number.isInteger(board.hiddenIndex) && board.hiddenIndex >= 0 && board.hiddenIndex < word.length &&
          !!letter && word[board.hiddenIndex] === letter && letter.toLowerCase() !== letter.toUpperCase() && choices.length >= 2 && choices.every(Boolean) &&
          choices.filter(function (c, i) { return choices.indexOf(c) === i; }).length === choices.length && choices.indexOf(letter) >= 0;
        if (!usable) return { missing: ['board'] };
        var missing = [];
        var wordAudio = env.wordClip(env.word);
        if (!wordAudio) missing.push('word');
        var prompt = env.bankClip('instructions', 'inst_missing_letter');
        if (!prompt) missing.push('question');
        if (missing.length) return { missing: missing };
        // The letters as the word is written (lowercase if lower-casing changed its length).
        var shown = written.length === word.length ? written : word;
        var letters = shown.split('');
        letters[board.hiddenIndex] = '';
        var item = { letters: letters, hiddenIndex: board.hiddenIndex, options: choices, target: letter,
          wordAudio: wordAudio, promptAudio: prompt, introAudio: [prompt, wordAudio], answerAudio: [wordAudio] };
        // The hidden letter is a capital (a name): the choices are shown as capitals too.
        if (shown[board.hiddenIndex] !== letter && shown[board.hiddenIndex] === letter.toUpperCase()) item.capital = true;
        return { item: item };
      },
      render: function (item, ctx) {
        var selected = '';
        var shownOnce = false;
        // An apostrophe, hyphen or space is part of the word, shown as it is, not a letter box.
        var fixed = function (ch) { try { return !new RegExp('[\\p{L}\\p{M}\\p{N}_]', 'u').test(String(ch || '')); } catch (_) { return /^['’\- ]$/.test(String(ch || '')); } };
        var cased = function (letter) { return item.capital ? String(letter).toUpperCase() : String(letter); };
        var wordText = item.letters.map(function (l, i) { return i === item.hiddenIndex ? cased(item.target) : l; }).join('');
        var slots = item.letters.map(function (l, i) {
          if (i !== item.hiddenIndex && fixed(l)) return ctx.el('li', { 'data-fixed': '', style: 'display:flex;align-items:center;font-size:1.4rem;font-weight:700' }, [l === ' ' ? ' ' : l]);
          return ctx.el('li', { class: 'slot', style: (i === item.hiddenIndex ? 'border-style:dashed;border-color:var(--accent);' : 'border-style:solid;') + 'min-width:clamp(36px,11vw,56px);min-height:clamp(44px,12vw,60px)' },
            [i === item.hiddenIndex ? '?' : l]);
        });
        var srWord = ctx.el('p', { class: 'sr' });
        var updateWord = function (letter) {
          slots[item.hiddenIndex].textContent = letter ? cased(letter) : '?';
          srWord.textContent = ctx.fmt(ctx.L.missing_letter_word_sr, { letters: item.letters.map(function (l, i) {
            return i === item.hiddenIndex ? (letter ? cased(letter) : ctx.L.missing_letter_blank) : l;
          }).filter(function (l) { return String(l).trim(); }).join(', ') });
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
        var doc = ctx.root.ownerDocument;
        var cards = [];
        var check = ctx.el('button', { type: 'button', class: 'primary', 'aria-disabled': 'true', on: { click: function () {
          if (ctx.isDone() || check.getAttribute('aria-disabled') === 'true') { if (!ctx.isDone() && !selected) ctx.announce(ctx.L.missing_letter_pick_first); return; }
          var answer = selected;
          var outcome = ctx.answer(answer, answer.trim().toLowerCase() === item.target, {
            correctText: ctx.fmt(ctx.L.missing_letter_correct, { letter: cased(item.target) }),
            missedText: ctx.fmt(ctx.L.missing_letter_missed, { letter: cased(item.target) }),
          });
          // A retry marks the wrong letter as tried (matching all other choice adapters) and clears the slot.
          if (outcome === 'retry') {
            var missed = answer.trim().toLowerCase();
            cards.forEach(function (c) {
              if (c.letter === missed) {
                c.tried = true;
                c.box.classList.add('tried');
                c.button.setAttribute('aria-disabled', 'true');
              }
            });
            var wasOnCheck = !!(doc && doc.activeElement === check);
            select('');
            if (wasOnCheck && !ctx.noFocus) {
              var nextChoice = cards.filter(function (c) { return !c.tried; })[0];
              if (nextChoice && nextChoice.button && typeof nextChoice.button.focus === 'function') {
                try { nextChoice.button.focus(); } catch (_) {}
              }
            }
          }
        } }, text: ctx.L.missing_letter_check });
        var select = function (letter) {
          if (letter && cards.some(function (c) { return c.letter === letter && c.tried; })) return;
          selected = letter;
          cards.forEach(function (c) { c.button.setAttribute('aria-pressed', c.letter === letter ? 'true' : 'false'); });
          check.setAttribute('aria-disabled', letter ? 'false' : 'true');
          updateWord(letter);
        };
        var list = ctx.el('ul', { class: 'row', 'aria-label': ctx.L.missing_letter_choices, style: 'list-style:none;padding:0;margin:16px 0' });
        item.options.forEach(function (letter) {
          var card = { box: null, button: null, letter: letter, tried: false };
          var button = ctx.el('button', { type: 'button', 'aria-pressed': 'false', 'aria-label': ctx.fmt(ctx.L.missing_letter_choose, { letter: cased(letter) }),
            style: 'min-width:64px;min-height:64px;font-size:1.4rem;font-weight:700',
            on: { click: function () { if (!ctx.isDone() && !card.tried && button.getAttribute('aria-disabled') !== 'true') select(letter); } } }, [cased(letter)]);
          var box = ctx.el('li', { class: 'choice solo', style: 'padding:6px' }, [button]);
          card.box = box; card.button = button;
          cards.push(card);
          list.appendChild(box);
        });
        if (typeof ctx.keys === 'function') {
          ctx.keys(function (key) {
            if (ctx.isDone()) return false;
            var k = String(key == null ? '' : key);
            if (k === 'Backspace' || k === 'Escape' || k === 'Esc') {
              if (!selected) return false;
              select('');
              return true;
            }
            if (k === 'Enter') {
              var ae = doc && doc.activeElement;
              var onSelectedChoice = cards.some(function (c) { return c.button === ae && c.letter === selected; });
              var onOtherBtn = !!(ae && String(ae.tagName || '').toUpperCase() === 'BUTTON' && ae !== check && !onSelectedChoice && !ae.closest('[hidden]') && !ae.disabled && ae.getAttribute('aria-disabled') !== 'true');
              if (onOtherBtn || !selected) return false;
              check.click();
              return true;
            }
            if (k.length === 1) {
              var lc = k.toLowerCase();
              var hit = cards.filter(function (c) { return c.letter === lc; })[0];
              if (hit) {
                if (!hit.tried) select(hit.letter);
                return true;
              }
            }
            return false;
          });
        }
        updateWord('');
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.missing_letter_question }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: ctx.L.hear_question }),
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: ctx.L.hear_word }),
          showButton,
        ]));
        ctx.root.appendChild(shownWord);
        // dir: the word's letters run left to right in a right-to-left page too.
        ctx.root.appendChild(ctx.el('ul', { class: 'slots', 'aria-hidden': 'true', dir: 'ltr' }, slots));
        ctx.root.appendChild(srWord);
        ctx.root.appendChild(list);
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [check]));
        return {
          reveal: function () {
            cards.forEach(function (c) {
              c.button.setAttribute('aria-disabled', 'true');
              if (c.letter === item.target && !c.box.classList.contains('right')) {
                c.box.classList.add('right');
                c.button.setAttribute('aria-label', c.button.getAttribute('aria-label') + ' ' + (ctx.L.missing_letter_answer_mark || '(the answer)'));
              }
            });
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
    // 2026-11-13 parity: as the app (b38ca18141), the tiles are letters only and the letters
    // decide: an apostrophe, hyphen or space need not be typed.
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
        orthography_slow: 'Hear it slowly',
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
        // An apostrophe, hyphen or space is not a tile: the letters decide (wsSpellFixedChar / wsSpellSame, b38ca18141).
        var letterRe = null;
        try { letterRe = new RegExp('[\\p{L}\\p{M}\\p{N}]', 'u'); } catch (_) {}
        var target = word.toLowerCase();
        var extra = [];
        target.split('').forEach(function (ch) {
          if (!/[a-z]/.test(ch) && extra.indexOf(ch) < 0 && ch.trim() && (letterRe ? letterRe.test(ch) : !/^['’\-.]$/.test(ch))) extra.push(ch);
        });
        var item = { target: target, extraTiles: extra, wordAudio: wordAudio, promptAudio: prompt,
          introAudio: [prompt, wordAudio], answerAudio: [wordAudio] };
        // A word written with a capital (a name): keep how it is written, matching spelling_bee.js.
        if (word !== target && word.length === target.length) item.shown = word;
        var board = (w && w.activityItems && w.activityItems.orthography) || {};
        var rawBank = Array.isArray(board.letterBank) ? board.letterBank : (Array.isArray(w && w.letterBank) ? w.letterBank : null);
        if (rawBank && rawBank.length) {
          var bank = [];
          rawBank.forEach(function (ch) {
            var c = String(ch == null ? '' : ch).trim().toLowerCase();
            if (c && c.length === 1 && bank.indexOf(c) < 0) bank.push(c);
          });
          target.split('').forEach(function (ch) {
            var isLtr = letterRe ? letterRe.test(ch) : !/^['’\- .]$/.test(ch);
            if (isLtr && ch.trim() && bank.indexOf(ch) < 0) bank.push(ch);
          });
          if (bank.length) item.letterBank = bank;
        }
        if (board.lengthHint || (w && w.lengthHint)) item.lengthHint = true;
        return { item: item };
      },
      render: function (item, ctx) {
        var target = String(item.target || '');
        var written = item.shown && String(item.shown).length === target.length ? String(item.shown) : target;
        var letterRe = null;
        try { letterRe = new RegExp('[\\p{L}\\p{M}\\p{N}_]', 'u'); } catch (_) {}
        var fixed = function (ch) { ch = String(ch || ''); return letterRe ? !letterRe.test(ch) : /^['’\- .]$/.test(ch); };
        var own = function (text) { return String(text || '').split('').filter(function (ch) { return !fixed(ch); }).join(''); };
        var hintLen = typeof item.lengthHint === 'number' && item.lengthHint > 0
          ? Math.floor(item.lengthHint)
          : item.lengthHint ? (own(target).length || target.length) : 0;
        var placeholder = hintLen ? Array(hintLen + 1).join('_ ').trim() : false;
        var lastSubmitted = null;
        var inputId = 'ortho-' + String(item.id || 'x').replace(/[^a-z0-9-]/gi, '');
        var input = ctx.el('input', { id: inputId, type: 'text', dir: 'ltr', autocomplete: 'off', autocorrect: 'off', autocapitalize: 'none', spellcheck: 'false',
          inputmode: /[^a-z]/.test(own(target)) ? 'text' : 'none', placeholder: placeholder,
          maxlength: '40', style: 'font-size:1.6rem;font-weight:700;letter-spacing:.1em;text-transform:lowercase;text-align:center', on: {
            input: function () { lastSubmitted = null; syncCheck(); },
            keydown: function (e) {
              if (e.key !== 'Enter' || e.repeat || e.isComposing || e.keyCode === 229) return;
              e.preventDefault();
              submit();
            },
          } });
        var syncCheck = function () {
          if (check) check.setAttribute('aria-disabled', ctx.isDone() || !String(input.value || '').trim() ? 'true' : 'false');
        };
        var edit = function (value) {
          if (ctx.isDone()) return;
          input.value = value;
          lastSubmitted = null;
          syncCheck();
        };
        var submit = function () {
          if (ctx.isDone()) return;
          var answer = String(input.value || '').trim().toLowerCase();
          if (!answer) { ctx.announce(ctx.L.orthography_empty); return; }
          // OrthographyView ignores a resubmit of the same unchanged spelling.
          if (answer === lastSubmitted) { ctx.announce(ctx.L.orthography_same); return; }
          lastSubmitted = answer;
          // wsSpellSame: the letters decide, so "dont" spells "don't" and "icecream" spells "ice-cream".
          var letters = function (text) { var re = null; try { re = new RegExp('[^\\p{L}\\p{M}\\p{N}]', 'gu'); } catch (_) {} return String(text || '').replace(re || /['’\- .]/g, ''); };
          ctx.answer(answer, letters(target) ? letters(answer) === letters(target) : answer === target, {
            correctText: ctx.fmt(ctx.L.orthography_correct, { word: written }),
            missedText: ctx.fmt(ctx.L.orthography_missed, { word: written }),
          });
          // On a retry the spelling stays in the box to be fixed, as in the app.
        };
        var letters = Array.isArray(item.letterBank) && item.letterBank.length
          ? item.letterBank.slice()
          : 'abcdefghijklmnopqrstuvwxyz'.split('').concat(item.extraTiles || []);
        var tiles = letters.map(function (letter) {
          return ctx.el('button', { type: 'button', 'aria-label': ctx.fmt(ctx.L.orthography_add, { letter: letter }),
            style: 'min-width:44px;min-height:44px;font-size:1.15rem;font-weight:700;padding:4px 8px',
            on: { click: function () { edit(String(input.value || '') + letter); } } }, [letter]);
        });
        var back = ctx.el('button', { type: 'button', 'aria-label': ctx.L.orthography_backspace, style: 'min-width:44px;min-height:44px', on: { click: function () { edit(String(input.value || '').slice(0, -1)); } } }, ['⌫']);
        var clear = ctx.el('button', { type: 'button', style: 'min-height:44px', on: { click: function () { edit(''); } }, text: ctx.L.orthography_clear });
        var check = ctx.el('button', { type: 'button', class: 'primary', 'aria-disabled': 'true', on: { click: submit }, text: ctx.L.orthography_check });
        var answerLine = ctx.el('p', { class: 'letters', hidden: true, text: ctx.fmt(ctx.L.orthography_answer, { word: written }) });
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.orthography_question }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: ctx.L.hear_question }),
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: ctx.L.hear_word }),
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('slowReplays'); ctx.play(item.wordAudio, 0.5); } }, text: ctx.L.orthography_slow || 'Hear it slowly' }),
        ]));
        ctx.root.appendChild(ctx.el('label', { for: inputId, text: ctx.L.orthography_input }));
        ctx.root.appendChild(input);
        ctx.root.appendChild(ctx.el('div', { class: 'row', role: 'group', 'aria-label': ctx.L.orthography_tiles, style: 'flex-wrap:wrap;margin:8px 0;gap:4px' }, tiles));
        ctx.root.appendChild(ctx.el('div', { class: 'row', style: 'margin-top:8px;gap:6px' }, [back, clear, check]));
        ctx.root.appendChild(answerLine);
        syncCheck();
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
    // 2026-11-13 parity: the file does that too, by itself once the praise clip is over
    // (payoff; the Hear the story button stays). Choices print as written, so a name
    // keeps its capital (the app lower-cases its chips: file has / app lacks).

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
        // One choice for each key, the same key render() grades with (2026-11-13, answer audit): "ice  cream" beside
        // "ice cream" showed two choices that look the same, one of them graded wrong. The word's own spelling is kept.
        var keyOf = function (s) { var t = String(s == null ? '' : s); try { t = t.normalize('NFC'); } catch (_) {} return t.toLowerCase().trim().replace(/\s+/g, ' '); };
        var at = {};
        raw.forEach(function (o) {
          var k = keyOf(o);
          if (!seen[k]) { seen[k] = true; at[k] = options.length; options.push(o); }
          else if (o === word.trim() && k === keyOf(word)) options[at[k]] = o;
        });
        if (!seen[keyOf(word)] || options.length < 2) return { missing: ['board'] };
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
        // The key prepare() uses (2026-11-13): spaces or an accent written two ways are one choice.
        var norm = function (s) { var t = String(s == null ? '' : s); try { t = t.normalize('NFC'); } catch (_) {} return t.toLowerCase().trim().replace(/\s+/g, ' '); };
        var doc = ctx.root.ownerDocument;
        var picture = ctx.image(item.picture);
        var blanks = [];
        var lineNodes = [];
        var run = 0;
        var watchingStop = false;
        var mark = function (index) {
          lineNodes.forEach(function (n, i) {
            var on = i === index;
            n.style.background = on ? 'var(--ok-bg)' : '';
            if (on) n.setAttribute('aria-current', 'true'); else n.removeAttribute('aria-current');
          });
        };
        var onDocStop = function (e) {
          if (!ctx.root.isConnected || (e && e.target && e.target.closest && e.target.closest('[data-player-stop-audio]'))) halt();
        };
        var onDocKey = function (e) {
          var k = String((e && e.key) || '');
          if (!ctx.root.isConnected || k === 'Escape' || k === 'Esc') halt();
        };
        var watchStop = function (on) {
          if (!doc || !doc.addEventListener || watchingStop === on) return;
          watchingStop = on;
          if (on) { doc.addEventListener('click', onDocStop, true); doc.addEventListener('keydown', onDocKey, true); }
          else { doc.removeEventListener('click', onDocStop, true); doc.removeEventListener('keydown', onDocKey, true); }
        };
        var halt = function () { run++; watchStop(false); mark(-1); };
        // data-read: running text, where the shell's reading focus can go.
        var storyBox = ctx.el('div', { role: 'group', 'aria-label': ctx.L.read_passage_story, class: 'letters', lang: 'en', dir: 'ltr', 'data-read': '',
          style: 'font-size:clamp(1.2rem,4.5vw,1.6rem);border:1px solid var(--line);border-radius:14px;padding:12px clamp(12px,3.5vw,16px);margin:12px 0;overflow-wrap:anywhere' });
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
        else ctx.root.appendChild(ctx.el('p', {}, [ctx.L.read_passage_word_hint + ' ', ctx.el('span', { class: 'letters', lang: 'en', text: item.target })]));
        ctx.root.appendChild(storyBox);
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { halt(); ctx.support('questionReplays'); ctx.play(item.prompt); } }, text: ctx.L.read_passage_hear_instructions }),
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
            } } }, [ctx.el('span', { class: 'letters', lang: 'en', text: option })]);
          var box = ctx.el('li', { class: 'choice' }, [choose]);
          cards.push({ box: box, choose: choose, right: right });
          list.appendChild(box);
        });
        ctx.root.appendChild(list);
        ctx.root.appendChild(after);
        // Follow-along read-back: each line is highlighted while its clip plays.
        // A newer run, Escape/stop, or leaving the screen ends the old one.
        // auto: the read-back after a right answer (not a help the student asked for).
        var readBack = function (auto) {
          var mine = ++run;
          if (auto !== true) ctx.support('storyReadBacks');
          if (!item.readBackByLine) { watchStop(false); mark(-1); ctx.play(item.readBack[0]); return; }
          watchStop(true);
          var step = function (i) {
            if (mine !== run) return;
            if (!ctx.root.isConnected || i >= item.readBack.length) { watchStop(false); mark(-1); return; }
            mark(i);
            ctx.play(item.readBack[i]).then(function (ok) {
              if (mine !== run) return;
              if (ok === false) { watchStop(false); mark(-1); return; }
              step(i + 1);
            });
          };
          step(0);
        };
        if (typeof ctx.keys === 'function') {
          ctx.keys(function (key) {
            var k = String(key == null ? '' : key);
            if (k === 'Escape' || k === 'Esc') {
              var active = watchingStop;
              halt();
              if (typeof ctx.stop === 'function') ctx.stop();
              return active;
            }
            return false;
          });
        }
        return {
          stop: halt,
          // The R key: clear any read-back line highlight and replay the instructions.
          replay: function () {
            halt();
            if (!item.prompt) return false;
            ctx.play(item.prompt);
          },
          // After a right answer, once the praise is over, the story is read back line by line (the app's payoff).
          payoff: function () { if (item.readBack && item.readBack.length) readBack(true); },
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
              after.appendChild(ctx.el('button', { type: 'button', on: { click: function () { readBack(false); } }, text: ctx.L.read_passage_hear_story }));
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
    // 2026-11-13 parity: as in the app, a right answer is followed by the sentence read
    // back by itself (payoff, after the praise clip; the button stays). Choices print as
    // written, so a name keeps its capital; the app lower-cases its chips (word-bank
    // convention, word_sounds_module.js ~24217): file has / app lacks.

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
        // One choice for each recording key. For the answer's key the word's own spelling is kept (2026-11-13, answer audit):
        // the first spelling was kept before, so a distractor written "ice  cream" stood for the answer and no choice was right.
        var answerKey = core.packAudioKey(word.normalize('NFC'));
        raw.forEach(function (o) {
          var k = core.packAudioKey(o.normalize('NFC'));
          if (!distinct[k]) { distinct[k] = o; options.push(o); }
          else if (k === answerKey && o === word.trim() && distinct[k] !== o) { options[options.indexOf(distinct[k])] = o; distinct[k] = o; }
        });
        var correct = distinct[answerKey];
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
        // The key prepare() uses (2026-11-13): spaces or an accent written two ways are one choice.
        var norm = function (s) { var t = String(s == null ? '' : s); try { t = t.normalize('NFC'); } catch (_) {} return t.toLowerCase().trim().replace(/\s+/g, ' '); };
        var picture = ctx.image(item.picture);
        var blank = ctx.el('span', { style: 'display:inline-block;min-width:4.5em;border-bottom:3px dashed var(--muted);text-align:center' }, [
          ctx.el('span', { 'aria-hidden': 'true', text: '\u00a0' }), ctx.el('span', { class: 'sr', text: ctx.L.read_sentence_blank })]);
        var after = ctx.el('div', { class: 'row' });
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.read_sentence_prompt }));
        ctx.root.appendChild(ctx.el('p', { class: 'muted', text: picture ? ctx.L.read_sentence_picture_practice : ctx.L.read_sentence_matching_practice }));
        if (picture) ctx.root.appendChild(ctx.el('img', { class: 'picture', src: picture, alt: ctx.fmt(ctx.L.read_sentence_picture_clue, { word: item.target }) }));
        else ctx.root.appendChild(ctx.el('p', {}, [ctx.L.read_sentence_word_hint + ' ', ctx.el('span', { class: 'letters', lang: 'en', text: item.target })]));
        // data-read: running text, where the shell's reading focus can go.
        // dir: an English sentence keeps its full stop on the right in a right-to-left page.
        ctx.root.appendChild(ctx.el('p', { class: 'letters', lang: 'en', dir: 'ltr', style: 'font-size:clamp(1.25rem,5vw,1.8rem);white-space:pre-wrap;overflow-wrap:anywhere', 'data-read': '' }, [item.before, blank, item.after]));
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
            } } }, [ctx.el('span', { class: 'letters', lang: 'en', text: option })]);
          var box = ctx.el('li', { class: 'choice' }, [choose]);
          cards.push({ box: box, choose: choose, right: right });
          list.appendChild(box);
        });
        ctx.root.appendChild(list);
        ctx.root.appendChild(after);
        return {
          // After a right answer, once the praise is over, the sentence is read back by itself (the app's payoff). The
          // button below stays to hear it again.
          payoff: function () { if (item.sentenceAudio) ctx.play(item.sentenceAudio); },
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
    // 2026-11-13 parity: the app's sound-only choices are now cards (a tap plays and selects, a
    // large Check submits, a missed card is crossed out: 94704af0e4). The file keeps two buttons
    // per choice, Listen first, then Choose, in every activity, as Find Sounds always had them
    // (hear, then choose).
    // Fewer choices: the app trims this board below Hard (WS_CORE.choiceLimit + trimChoices:
    // Easy 3, Medium 4). A packet does the same when made with Choices Easy or Medium
    // (word_sounds_packet_builder.js, choiceLevels); a board as built (All) is shown whole.

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
        var doc = ctx.root.ownerDocument;
        var win = doc.defaultView;
        var cards = [];
        var token = 0;
        var timer = null;
        var watchingStop = false;
        var clearTimer = function () {
          if (timer != null) { try { win.clearTimeout(timer); } catch (_) {} timer = null; }
        };
        var mark = function (index) {
          cards.forEach(function (c, i) { c.box.style.outline = i === index ? '4px solid var(--accent)' : ''; c.box.style.outlineOffset = i === index ? '2px' : ''; });
        };
        var onDocStop = function (e) {
          if (!ctx.root.isConnected || (e && e.target && e.target.closest && e.target.closest('[data-player-stop-audio]'))) halt();
        };
        var onDocKey = function (e) {
          var k = String((e && e.key) || '');
          if (!ctx.root.isConnected || k === 'Escape' || k === 'Esc') halt();
        };
        var watchStop = function (on) {
          if (!doc || !doc.addEventListener || watchingStop === on) return;
          watchingStop = on;
          if (on) { doc.addEventListener('click', onDocStop, true); doc.addEventListener('keydown', onDocKey, true); }
          else { doc.removeEventListener('click', onDocStop, true); doc.removeEventListener('keydown', onDocKey, true); }
        };
        var halt = function () { token++; clearTimer(); watchStop(false); mark(-1); };
        var run = function (steps) {
          clearTimer();
          var mine = ++token;
          var i = 0;
          watchStop(true);
          var step = function () {
            timer = null;
            if (mine !== token) return;
            if (!ctx.root.isConnected) { watchStop(false); mark(-1); return; }
            if (i >= steps.length) { watchStop(false); mark(-1); return; }
            var s = steps[i++];
            mark(s.hi == null ? -1 : s.hi);
            ctx.play(s.id).then(function (ok) {
              if (mine !== token) return;
              if (ok === false) { watchStop(false); mark(-1); return; }
              timer = win.setTimeout(step, s.gap || 0);
            });
          };
          step();
        };
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
            } } }, [ctx.showLetters ? ctx.el('span', { class: 'letters', lang: 'en', text: choice.text }) : ctx.fmt(ctx.L.rhyming_option_n, { n: n })]);
          var box = ctx.el('li', { class: 'choice' }, [listen, choose]);
          cards.push({ box: box, choose: choose, answer: choice.answer });
          list.appendChild(box);
        });
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.showLetters ? ctx.fmt(ctx.L.rhyming_prompt_word, { word: item.word }) : ctx.L.rhyming_prompt }));
        // Hear all (the player's ctx.hearAll): each choice in turn, marked with its number. The opening already plays them.
        var hear = typeof ctx.hearAll === 'function' ? ctx.hearAll({ before: halt, auto: false,
          list: function () { return cards.map(function (c, i) { return { box: c.box, say: function () { return ctx.play(item.choices[i].audio); } }; }); } }) : null;
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); run([{ id: item.promptAudio, gap: 200 }, { id: item.wordAudio }]); } }, text: ctx.L.hear_question }),
          ctx.el('button', { type: 'button', on: { click: function () { halt(); ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: ctx.L.hear_word }),
          hear ? hear.button : null,
          hear ? hear.note : null,
        ]));
        ctx.root.appendChild(list);
        if (typeof ctx.keys === 'function') {
          ctx.keys(function (key) {
            var k = String(key == null ? '' : key);
            if (k === 'Escape' || k === 'Esc') {
              var active = watchingStop || timer != null;
              halt();
              if (typeof ctx.stop === 'function') ctx.stop();
              return active;
            }
            return false;
          });
        }
        if (!ctx.isDone()) {
          run((ctx.skipDirections ? [] : [{ id: item.promptAudio, gap: 200 }]).concat([{ id: item.wordAudio, gap: 200 }], item.choices.map(function (c, i) { return { id: c.audio, gap: 350, hi: i }; })));
        }
        return {
          stop: halt,
          // The R key: the question and the word again.
          replay: function () { run([{ id: item.promptAudio, gap: 200 }, { id: item.wordAudio }]); },
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
    // 2026-11-13 (answer audit): ir and ur are the sound of er (the dictionary spells it three ways: murder is m ur d er),
    // so the two chips of one sound go in either box; before, only one order was right.
    // 2026-11-13: each tray chip had Listen first, then the sound to pick up (as every Listen +
    // Choose pair). 2026-11-18: no Listen here any more (see render): picking a tile up plays it
    // and commits nothing, as in the app. With letters on, a sound whose label is not letters
    // shows a name (ctx.sound: oo_short -> "short oo (book)"), else /a/.
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
        var MAP = { 'ā': 'ay', 'ē': 'ee', 'ī': 'ie', 'ō': 'oa', 'ū': 'oo', 'ă': 'a', 'ĕ': 'e', 'ĭ': 'i', 'ŏ': 'o', 'ŭ': 'u', oi: 'oy', aw: 'au', ew: 'oo', oe: 'oa', ir: 'er', ur: 'er' };
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
      // 2026-11-18 (owner: a first-time player got stuck here): the app's look, with Packets' words. Each sound is a round
      // colored tile (its letters, or a speaker), side by side, so the tiles and the boxes fit one phone screen; a filled
      // box takes its tile's color; an empty box shows where a sound goes. Tap a tile to hear it and hold it (it lifts and
      // the empty boxes light up), then tap a box, or drag the tile there with a mouse, a finger or a pen. A box's sound
      // can be dragged to another box or back to the tiles. What each move did is shown under the boxes as well as said.
      // A tile has no Listen button of its own: picking it up plays it and changes nothing until it is put in a box.
      render: function (item, ctx) {
        var doc = ctx.root.ownerDocument, win = doc.defaultView;
        var L = ctx.L;
        // word_sounds_module.js:19317-19336, copied exactly.
        var MAP = { 'ā': 'ay', 'ē': 'ee', 'ī': 'ie', 'ō': 'oa', 'ū': 'oo', 'ă': 'a', 'ĕ': 'e', 'ĭ': 'i', 'ŏ': 'o', 'ŭ': 'u', oi: 'oy', aw: 'au', ew: 'oo', oe: 'oa', ir: 'er', ur: 'er' };
        var norm = function (p) { var l = String(p || '').toLowerCase().trim(); return Object.prototype.hasOwnProperty.call(MAP, l) ? MAP[l] : l; };
        var n = item.sounds.length;
        var boxes = [];
        for (var b = 0; b < n; b++) boxes.push(null);
        var picked = null;
        var errors = [];
        var token = 0;
        // With letters on, a sound like oo_short shows its friendly name (ctx.sound).
        var said = function (label) { return typeof ctx.sound === 'function' ? ctx.sound(label) : '/' + label + '/'; };
        var name = function (ci) { return ctx.showLetters ? said(item.chips[ci].label) : ctx.fmt(L.sound_n, { n: ci + 1 }); };
        var locked = function () { return ctx.isDone(); };
        var halt = function () { token++; };

        // Theme-harmonized multicolored chips: 6 distinct per-theme color slots (--c0..--c5, --c0b..--c5b)
        // that automatically adapt to every Reading Tools theme (Usual, High Contrast, Soft, Dark, Ocean, Sunny,
        // Forest, Rose) and forced-colors, with zero hardcoded hex/rgb values in this adapter.
        var still = !!(win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches);
        var chipSlot = function (ci) { return ci % 6; };
        var chipBg = function (ci) { return 'var(--c' + chipSlot(ci) + 'b,var(--soft))'; };
        var chipBd = function (ci) { return 'var(--c' + chipSlot(ci) + ',var(--accent))'; };
        // A "goes here" arrow (a character), and a speaker drawn with borders in the tile's own ink, so it is as dark as the
        // letters (an emoji speaker is pale grey on most devices). No drawing element: a file carries none.
        var icon = function (kind) {
          if (kind === 'drop') return ctx.el('span', { 'aria-hidden': 'true', 'data-seg-icon': 'drop', text: '↓', style: 'display:block;line-height:1;pointer-events:none;font-size:1.7rem;font-weight:800' });
          var part = function (css) { return ctx.el('span', { style: 'position:absolute;display:block;box-sizing:border-box;' + css }); };
          var arc = 'border:2.5px solid;border-color:transparent currentColor transparent transparent;border-radius:50%;';
          return ctx.el('span', { 'aria-hidden': 'true', 'data-seg-icon': 'sound', style: 'position:relative;display:block;width:28px;height:24px;pointer-events:none' }, [
            part('left:2px;top:8px;width:7px;height:8px;background:currentColor;border-radius:1px'),
            part('left:5px;top:3px;width:0;height:0;border-style:solid;border-width:9px 9px 9px 0;border-color:transparent currentColor transparent transparent'),
            part(arc + 'left:10px;top:7px;width:10px;height:10px'),
            part(arc + 'left:9px;top:3px;width:18px;height:18px'),
          ]);
        };
        // What a tile, or a box holding it, shows: its letters, or a speaker.
        var face = function (node, ci) {
          node.textContent = '';
          if (ctx.showLetters) node.appendChild(doc.createTextNode(name(ci))); else node.appendChild(icon('sound'));
        };
        var tileStyle = function (ci) {
          return (ctx.showLetters ? 'min-width:var(--seg-sz,64px);height:calc(var(--seg-sz,64px) - 6px);padding:0 16px;border-radius:999px;' : 'width:var(--seg-sz,64px);height:var(--seg-sz,64px);padding:0;border-radius:50%;')
            + 'display:flex;align-items:center;justify-content:center;font-size:1.25rem;font-weight:800;color:var(--ink);touch-action:none;'
            + 'background:' + chipBg(ci) + ';border:3px solid ' + chipBd(ci) + ';box-shadow:0 3px 0 ' + chipBd(ci)
            + (still ? '' : ';transition:transform .12s ease,box-shadow .12s ease');
        };
        // The line under the boxes: what the last move did (also said through ctx.announce).
        var say = ctx.el('p', { class: 'muted', 'data-seg-say': '', style: 'min-height:1.5em;margin:4px 0 0;text-align:center;font-weight:600' });
        var tell = function (text) { say.textContent = text; ctx.announce(text); };
        // A click the keyboard made (detail 0) moves the focus on, as before; a tap leaves it, so the page does not jump.
        var byKey = function (e) { return !e || e.detail === 0; };
        var tray = ctx.el('ul', { class: 'row', 'data-seg-tray': '', 'aria-label': L.segmentation_tray, style: 'list-style:none;padding:6px 0;margin:8px 0;gap:12px;justify-content:center' });
        var chipEls = item.chips.map(function (chip, ci) {
          var pick = ctx.el('button', { type: 'button', class: 'primary', 'aria-pressed': 'false', 'data-seg-tile': String(ci), 'data-seg-c': String(chipSlot(ci)),
            'aria-label': ctx.fmt(L.segmentation_pick, { sound: name(ci) }), style: tileStyle(ci),
            on: { click: function (e) { if (dragged()) return; onChip(ci, e); }, pointerdown: function (e) { dragStart(e, ci, 'tray', -1); } } });
          face(pick, ci);
          var li = ctx.el('li', {}, [pick]);
          tray.appendChild(li);
          return { li: li, pick: pick };
        });
        var boxList = ctx.el('ol', { class: 'slots', dir: 'ltr', 'aria-label': L.segmentation_boxes, style: 'justify-content:center;margin:12px 0 0' });
        var boxEls = boxes.map(function (_, bi) {
          var btn = ctx.el('button', { type: 'button', class: 'slot', 'data-seg-box': String(bi), style: 'min-width:var(--seg-box,76px);min-height:var(--seg-box,76px);border-width:3px;border-radius:16px;font-size:1.25rem;font-weight:800',
            on: { click: function (e) { if (dragged()) return; onBox(bi, e); }, pointerdown: function (e) { if (boxes[bi] != null) dragStart(e, boxes[bi], 'box', bi); } } });
          boxList.appendChild(ctx.el('li', {}, [btn]));
          return btn;
        });
        // Dragging, with a mouse, a finger or a pen: a short move is still a tap.
        var drag = null, dragEndedAt = 0;
        var dragged = function () { return Date.now() - dragEndedAt < 400; };
        var dragStart = function (e, ci, from, bi) {
          if (locked() || e.isPrimary === false || (e.pointerType === 'mouse' && e.button !== 0)) return;
          drag = { ci: ci, from: from, bi: bi, x: e.clientX, y: e.clientY, src: e.currentTarget, ghost: null };
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
          e.currentTarget.addEventListener('pointermove', dragMove);
          e.currentTarget.addEventListener('pointerup', dragEnd);
          e.currentTarget.addEventListener('pointercancel', dragEnd);
        };
        var dragMove = function (e) {
          if (!drag) return;
          var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
          if (!drag.ghost) {
            if (dx * dx + dy * dy < 100) return;
            halt();
            var g = drag.src.cloneNode(true);
            ['data-seg-tile', 'data-seg-box', 'aria-label', 'aria-pressed'].forEach(function (a) { g.removeAttribute(a); });
            g.setAttribute('aria-hidden', 'true');
            var r = drag.src.getBoundingClientRect();
            g.style.cssText += ';position:fixed;margin:0;z-index:60;pointer-events:none;opacity:.92;width:' + r.width + 'px;height:' + r.height + 'px';
            doc.body.appendChild(g);
            drag.ghost = g;
            drag.w = r.width; drag.h = r.height;
            if (drag.from === 'tray') { picked = drag.ci; draw(); }
          }
          drag.ghost.style.left = (e.clientX - drag.w / 2) + 'px';
          drag.ghost.style.top = (e.clientY - drag.h / 2) + 'px';
          e.preventDefault();
        };
        var dragEnd = function (e) {
          var d = drag;
          drag = null;
          if (!d) return;
          d.src.removeEventListener('pointermove', dragMove);
          d.src.removeEventListener('pointerup', dragEnd);
          d.src.removeEventListener('pointercancel', dragEnd);
          if (!d.ghost) return; // a tap: its click does the rest
          if (d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost);
          dragEndedAt = Date.now();
          var at = e.type === 'pointercancel' ? null : doc.elementFromPoint(e.clientX, e.clientY);
          var box = at && at.closest ? at.closest('[data-seg-box]') : null;
          var back = at && at.closest ? at.closest('[data-seg-tray]') : null;
          if (box && ctx.root.contains(box)) {
            var to = Number(box.getAttribute('data-seg-box'));
            if (d.from === 'tray') placeAt(d.ci, to);
            else if (to !== d.bi) { var other = boxes[to]; boxes[to] = d.ci; boxes[d.bi] = other; errors = []; draw(); ctx.play(item.chips[d.ci].audio); tell(ctx.fmt(L.segmentation_placed, { sound: name(d.ci), n: to + 1 })); }
          } else if (back && d.from === 'box') {
            boxes[d.bi] = null; errors = []; draw(); tell(ctx.fmt(L.segmentation_removed, { sound: name(d.ci), n: d.bi + 1 }));
          } else if (d.from === 'tray') { picked = null; draw(); }
        };
        var checkBtn = ctx.el('button', { type: 'button', class: 'primary', on: { click: function () { onCheck(); } }, text: L.segmentation_check });
        var clearBtn = ctx.el('button', { type: 'button', on: { click: function () {
          if (locked()) return;
          halt(); picked = null; errors = [];
          for (var i = 0; i < n; i++) boxes[i] = null;
          draw(); tell(L.segmentation_cleared);
          if (chipEls[0] && chipEls[0].pick) { try { chipEls[0].pick.focus(); } catch (_) {} }
        } }, text: L.segmentation_clear });
        // "Test Sequence" (:18795-18815): each box's sound spaced by ctx.soundGap() (500/800/250 ms); +100 ms for an empty box.
        var playBoxes = ctx.el('button', { type: 'button', on: { click: function () {
          ctx.support('sequenceReplays');
          var mine = ++token, i = 0;
          var step = function () {
            if (mine !== token || !ctx.root.isConnected || i >= n) return;
            var gap = typeof ctx.soundGap === 'function' ? ctx.soundGap() : 500;
            var ci = boxes[i++];
            if (ci == null) { win.setTimeout(step, gap + 100); return; }
            ctx.play(item.chips[ci].audio).then(function () { if (mine === token) win.setTimeout(step, gap); });
          };
          step();
        } }, text: L.segmentation_play_boxes });

        var draw = function () {
          var full = boxes.every(function (x) { return x != null; });
          var holding = picked != null && !locked();
          chipEls.forEach(function (c, ci) {
            c.li.hidden = boxes.indexOf(ci) >= 0;
            var on = picked === ci;
            var bg = chipBg(ci), bd = chipBd(ci);
            c.pick.setAttribute('aria-pressed', on ? 'true' : 'false');
            // Held: it lifts and flips to its own chip accent color with theme accent-ink and a ring.
            c.pick.style.background = on ? bd : bg;
            c.pick.style.color = on ? 'var(--accent-ink)' : 'var(--ink)';
            c.pick.style.borderColor = bd;
            c.pick.style.transform = on ? 'translateY(-6px) scale(1.08)' : '';
            c.pick.style.boxShadow = on ? '0 0 0 3px var(--card), 0 0 0 7px ' + bd : '0 3px 0 ' + bd;
            if (locked()) c.pick.setAttribute('aria-disabled', 'true');
          });
          boxEls.forEach(function (btn, bi) {
            var ci = boxes[bi];
            var bad = errors.indexOf(bi) >= 0 && ci != null;
            if (ci == null) { btn.textContent = ''; btn.appendChild(icon('drop')); } else face(btn, ci);
            if (ci != null && !bad) btn.setAttribute('data-seg-c', String(chipSlot(ci)));
            else btn.removeAttribute('data-seg-c');
            btn.style.borderStyle = ci == null ? 'dashed' : 'solid';
            btn.style.borderColor = bad ? 'var(--warn)' : ci == null ? (holding ? 'var(--accent)' : 'var(--muted)') : chipBd(ci);
            btn.style.background = bad ? 'var(--warn-bg)' : ci == null ? (holding ? 'var(--soft)' : '') : chipBg(ci);
            btn.style.color = bad ? 'var(--warn)' : ci == null ? (holding ? 'var(--accent)' : 'var(--muted)') : 'var(--ink)';
            // While a tile is held, the empty boxes light up: that is where it can go.
            btn.style.boxShadow = holding && ci == null ? '0 0 0 3px var(--accent)' : '';
            btn.style.touchAction = ci == null ? 'manipulation' : 'none';
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
        // A tray tile into box bi (a sound already there goes back to the tiles).
        var placeAt = function (ci, bi) {
          picked = null; errors = [];
          boxes[bi] = ci;
          draw();
          ctx.play(item.chips[ci].audio);
          tell(ctx.fmt(L.segmentation_placed, { sound: name(ci), n: bi + 1 }));
        };
        var onChip = function (ci, e) {
          if (locked() || boxes.indexOf(ci) >= 0) return;
          halt();
          if (picked === ci) { picked = null; draw(); tell(ctx.fmt(L.segmentation_dropped, { sound: name(ci) })); return; }
          picked = ci;
          draw();
          ctx.play(item.chips[ci].audio);
          tell(ctx.fmt(L.segmentation_picked, { sound: name(ci) }));
          // Keyboard path: go straight to the first empty box.
          var empty = boxes.indexOf(null);
          if (byKey(e)) boxEls[empty >= 0 ? empty : 0].focus();
        };
        var onBox = function (bi, e) {
          if (locked()) return;
          halt();
          errors = [];
          if (picked == null) {
            var out = boxes[bi];
            if (out == null) { tell(L.segmentation_how); return; }
            boxes[bi] = null;
            draw();
            tell(ctx.fmt(L.segmentation_removed, { sound: name(out), n: bi + 1 }));
            return;
          }
          placeAt(picked, bi);
          if (byKey(e)) nextFocus().focus();
        };
        var onCheck = function () {
          if (locked()) return;
          if (boxes.some(function (x) { return x == null; })) { tell(L.segmentation_fill_first); return; }
          say.textContent = '';
          halt();
          var bad = [];
          boxes.forEach(function (ci, i) { if (norm(item.chips[ci].label) !== norm(item.sounds[i])) bad.push(i); });
          var response = boxes.map(function (ci) { return item.chips[ci].label; }).join(' ');
          var outcome = ctx.answer(response, bad.length === 0, {
            correctText: L.segmentation_correct,
            retryText: L.segmentation_retry,
            missedText: ctx.showLetters ? ctx.fmt(L.segmentation_missed, { sounds: item.sounds.map(said).join(' ') })
              : L.segmentation_missed_no_letters,
          });
          // A first miss keeps the boxes and marks the wrong ones (:19348-19350).
          if (outcome === 'retry') { errors = bad; draw(); }
        };

        if (typeof ctx.keys === 'function') {
          ctx.keys(function (key) {
            if (locked()) return false;
            var k = String(key == null ? '' : key);
            if (k === 'Escape' || k === 'Esc') {
              if (picked == null) return false;
              var drop = picked;
              picked = null;
              draw();
              tell(ctx.fmt(L.segmentation_dropped, { sound: name(drop) }));
              if (chipEls[drop] && chipEls[drop].pick) { try { chipEls[drop].pick.focus(); } catch (_) {} }
              return true;
            }
            if (k === 'Backspace') {
              for (var bi = n - 1; bi >= 0; bi--) {
                if (boxes[bi] != null) {
                  var out = boxes[bi];
                  halt(); boxes[bi] = null; picked = null; errors = [];
                  draw();
                  tell(ctx.fmt(L.segmentation_removed, { sound: name(out), n: bi + 1 }));
                  return true;
                }
              }
              return false;
            }
            if (k === 'Enter') {
              var ae = doc && doc.activeElement;
              var onBtn = !!(ae && String(ae.tagName || '').toUpperCase() === 'BUTTON' && ae !== checkBtn && !ae.closest('[hidden]') && !ae.disabled && ae.getAttribute('aria-disabled') !== 'true');
              if (onBtn || boxes.some(function (x) { return x == null; })) return false;
              onCheck();
              return true;
            }
            if (/^[1-9]$/.test(k)) {
              var idx = Number(k) - 1;
              if (picked != null) {
                if (idx < n) { placeAt(picked, idx); return true; }
                return false;
              }
              if (idx < chipEls.length && boxes.indexOf(idx) < 0) {
                onChip(idx, { detail: 1 });
                return true;
              }
            }
            return false;
          });
        }

        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: L.segmentation_question }));
        ctx.root.appendChild(ctx.el('p', { class: 'muted', text: L.segmentation_how }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { halt(); ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: L.hear_question }),
          ctx.el('button', { type: 'button', on: { click: function () { halt(); ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: L.hear_word }),
        ]));
        // Top to bottom: the boxes, what the last move did, the tiles, then Check with the two box buttons, so the boxes,
        // the tiles and Check are close together (on a phone, on one screen).
        ctx.root.appendChild(boxList);
        ctx.root.appendChild(say);
        // Hear all (the player's ctx.hearAll): each sound still in the tray, in turn, marked with its number.
        var hear = typeof ctx.hearAll === 'function' ? ctx.hearAll({ before: halt, ready: function () { return !locked(); },
          list: function () { return chipEls.map(function (c, ci) { return c.li.hidden ? null : { box: c.li, n: ci + 1, total: chipEls.length, say: function () { return ctx.play(item.chips[ci].audio); } }; }); } }) : null;
        ctx.root.appendChild(tray);
        if (hear) ctx.root.appendChild(hear.node);
        ctx.root.appendChild(ctx.el('div', { class: 'row', style: 'justify-content:center' }, [checkBtn, playBoxes, clearBtn]));
        draw();
        return {
          reveal: function (correct) {
            halt();
            picked = null; errors = [];
            say.textContent = '';
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
            boxEls.forEach(function (btn) {
              btn.removeAttribute('data-seg-c');
              btn.style.borderColor = 'var(--ok)';
              btn.style.background = 'var(--ok-bg)';
              btn.style.color = 'var(--ok)';
              btn.style.boxShadow = '';
            });
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
    // 2026-11-13 parity: the file reads it back by itself too (payoff, after the praise
    // clip; the button stays). A sentence that names a picture twice takes either tile of
    // that word in either slot (before, the second tile was refused and the item could not
    // be finished). The pictures carry their key numbers 1-9 (file has / app lacks).

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
        sentence_match_order_hint: 'Place the pictures in the order they appear.',
        sentence_match_slot_empty: 'Slot {n}, empty',
        sentence_match_slot_filled: 'Slot {n}: {word}. Tap to take it out.',
        sentence_match_picture_of: 'Picture of {word}',
        sentence_match_hear_instructions: 'Hear the instructions',
        sentence_match_hear_sentence: 'Hear the sentence',
        sentence_match_correct: 'Yes! The pictures match the sentence.',
        sentence_match_missed: 'Here are the pictures that match the sentence.',
        sentence_match_placed: '{word} is in slot {n}.',
        sentence_match_removed: '{word} taken out of slot {n}.',
        sentence_match_cleared: 'All the slots are empty again.',
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
        var win = ctx.root.ownerDocument.defaultView;
        // A slot holds a tile's place in the tray (not its word): a sentence that names a picture twice can be
        // finished with either tile of that word (2026-11-13).
        var slots = item.sequence.map(function () { return null; });
        var retryMarks = null;
        var retryTimer = null;
        var imageOf = {};
        item.tiles.forEach(function (t) { imageOf[t.text] = ctx.image(t.image); });
        var tileCards = [];
        var slotButtons = [];
        var tray = ctx.el('ul', { class: 'choices' });
        var slotRow = ctx.el('ul', { class: 'slots', dir: 'ltr' });
        var after = ctx.el('div', { class: 'row' });
        var wordIn = function (i) { return slots[i] == null ? null : item.tiles[slots[i]].text; };
        var stopRetryHold = function (clearSlots) {
          if (retryTimer != null) { try { win.clearTimeout(retryTimer); } catch (_) {} retryTimer = null; }
          if (!retryMarks) return;
          retryMarks = null;
          if (clearSlots) slots = item.sequence.map(function () { return null; });
        };
        var drawSlots = function (right) {
          slotButtons.forEach(function (b, i) {
            var word = wordIn(i);
            var mark = retryMarks ? retryMarks[i] : '';
            b.textContent = '';
            b.appendChild(ctx.el('span', { 'aria-hidden': 'true', style: 'font-size:1rem;margin-inline-end:6px', text: String(i + 1) }));
            b.appendChild(word ? ctx.el('img', { src: imageOf[word] || '', alt: '', style: 'width:clamp(48px,14vw,72px);height:clamp(48px,14vw,72px);object-fit:contain;background:#fff;border-radius:8px;padding:4px' }) : ctx.el('span', { 'aria-hidden': 'true', text: '?' }));
            b.setAttribute('aria-label', word ? ctx.fmt(ctx.L.sentence_match_slot_filled, { n: i + 1, word: word }) : ctx.fmt(ctx.L.sentence_match_slot_empty, { n: i + 1 }));
            if (!word || ctx.isDone()) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
            if (mark) b.setAttribute('data-retry-mark', mark); else b.removeAttribute('data-retry-mark');
            b.style.borderColor = right || mark === 'ok' ? 'var(--ok)' : mark === 'warn' ? 'var(--warn)' : '';
            b.style.background = right || mark === 'ok' ? 'var(--ok-bg)' : mark === 'warn' ? 'var(--warn-bg)' : '';
          });
          tileCards.forEach(function (c, ti) {
            // While retryMarks is showing, non-tried tiles stay enabled so a learner can tap right away to start retrying.
            var used = retryMarks ? false : slots.indexOf(ti) >= 0;
            if (used || c.tried || ctx.isDone()) c.pick.setAttribute('aria-disabled', 'true'); else c.pick.removeAttribute('aria-disabled');
            c.pick.style.opacity = used && !right ? '0.3' : '';
          });
        };
        var grade = function () {
          if (slots.some(function (s) { return s == null; })) return;
          var ok = slots.every(function (ti, i) { return item.tiles[ti].text === item.sequence[i]; });
          var response = slots.map(function (ti) { return item.tiles[ti].text; }).join(' ');
          var outcome = ctx.answer(response, ok, { correctText: ctx.L.sentence_match_correct, missedText: ctx.L.sentence_match_missed });
          if (outcome === 'retry') {
            // One-picture boards: that picture is out. Show per-slot right/wrong feedback briefly (or until the next tap) before clearing.
            if (item.sequence.length === 1) { var out = tileCards[slots[0]]; out.tried = true; out.box.classList.add('tried'); }
            retryMarks = slots.map(function (ti, i) { return ti != null && item.tiles[ti].text === item.sequence[i] ? 'ok' : 'warn'; });
            drawSlots(false);
            if (win && typeof win.setTimeout === 'function') {
              retryTimer = win.setTimeout(function () {
                retryTimer = null;
                if (!retryMarks || !ctx.root.isConnected || ctx.isDone()) return;
                retryMarks = null;
                slots = item.sequence.map(function () { return null; });
                drawSlots(false);
              }, 1250);
            }
          }
        };
        var say = function (text) { if (typeof ctx.announce === 'function') ctx.announce(text); };
        item.tiles.forEach(function (tile, ti) {
          // The picture's number, the key 1-9 that chooses it.
          var number = ti < 9 ? ctx.el('span', { 'aria-hidden': 'true', 'data-key-number': '', style: 'position:absolute;top:6px;inset-inline-start:6px;min-width:28px;height:28px;line-height:26px;border-radius:14px;border:1px solid var(--accent-ink);background:var(--accent);color:var(--accent-ink);font-weight:700;font-size:1rem;text-align:center', text: String(ti + 1) }) : null;
          var pick = ctx.el('button', { type: 'button', 'aria-label': ctx.fmt(ctx.L.sentence_match_picture_of, { word: tile.text }),
            style: 'position:relative;width:100%;display:flex;justify-content:center;background:#fff',
            on: { click: function () {
              if (ctx.isDone() || pick.getAttribute('aria-disabled') === 'true') return;
              if (retryMarks) stopRetryHold(true);
              if (slots.indexOf(ti) >= 0) return;
              var at = slots.indexOf(null);
              if (at < 0) return;
              slots[at] = ti;
              drawSlots(false);
              if (slots.indexOf(null) >= 0) {
                say(ctx.fmt(ctx.L.sentence_match_placed || '{word} is in slot {n}.', { word: tile.text, n: at + 1 }));
              } else {
                grade();
              }
            } } }, [number, ctx.el('img', { class: 'picture', src: imageOf[tile.text] || '', alt: '', style: 'max-width:min(100%,160px);height:auto;object-fit:contain' })]);
          var box = ctx.el('li', { class: 'choice' }, [pick]);
          tileCards.push({ text: tile.text, pick: pick, box: box, tried: false });
          tray.appendChild(box);
        });
        item.sequence.forEach(function (_, i) {
          var b = ctx.el('button', { type: 'button', class: 'slot', style: 'border-style:dashed;min-width:clamp(70px,21vw,96px);min-height:clamp(70px,21vw,96px);padding:6px',
            on: { click: function () {
              if (ctx.isDone()) return;
              if (retryMarks) {
                stopRetryHold(true);
                drawSlots(false);
                say(ctx.L.sentence_match_cleared || 'All the slots are empty again.');
                return;
              }
              if (slots[i] == null) return;
              var removed = wordIn(i);
              slots[i] = null;
              drawSlots(false);
              say(ctx.fmt(ctx.L.sentence_match_removed || '{word} taken out of slot {n}.', { word: removed, n: i + 1 }));
            } } });
          slotButtons.push(b);
          slotRow.appendChild(ctx.el('li', {}, [b]));
        });
        if (typeof ctx.keys === 'function') {
          ctx.keys(function (key) {
            if (ctx.isDone()) return false;
            var k = String(key == null ? '' : key);
            if (k === 'Backspace') {
              if (retryMarks) {
                stopRetryHold(true);
                drawSlots(false);
                say(ctx.L.sentence_match_cleared || 'All the slots are empty again.');
                return true;
              }
              for (var bi = slots.length - 1; bi >= 0; bi--) {
                if (slots[bi] != null) {
                  var out = wordIn(bi);
                  slots[bi] = null;
                  drawSlots(false);
                  say(ctx.fmt(ctx.L.sentence_match_removed || '{word} taken out of slot {n}.', { word: out, n: bi + 1 }));
                  return true;
                }
              }
              return false;
            }
            if (k === 'Escape' || k === 'Esc') {
              if (retryMarks || slots.some(function (s) { return s != null; })) {
                stopRetryHold(true);
                slots = item.sequence.map(function () { return null; });
                drawSlots(false);
                say(ctx.L.sentence_match_cleared || 'All the slots are empty again.');
                return true;
              }
              return false;
            }
            return false;
          });
        }
        drawSlots(false);
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.sentence_match_prompt }));
        // data-read: running text, where the shell's reading focus can go.
        ctx.root.appendChild(ctx.el('p', { class: 'letters', lang: 'en', dir: 'ltr', style: 'font-size:clamp(1.25rem,5vw,1.8rem);overflow-wrap:anywhere', 'data-read': '', text: item.sentence }));
        if (item.sequence.length > 1) ctx.root.appendChild(ctx.el('p', { class: 'muted', text: ctx.L.sentence_match_order_hint }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.prompt); } }, text: ctx.L.sentence_match_hear_instructions }),
        ]));
        ctx.root.appendChild(slotRow);
        ctx.root.appendChild(tray);
        ctx.root.appendChild(after);
        return {
          stop: function () { stopRetryHold(false); },
          // After a right answer, once the praise is over, the sentence is read back by itself (the app's payoff).
          payoff: function () { if (item.sentenceAudio) ctx.play(item.sentenceAudio); },
          reveal: function () {
            stopRetryHold(false);
            // Each slot shows a tile of its word (the first one not used yet).
            var used = [];
            slots = item.sequence.map(function (word) {
              for (var k = 0; k < item.tiles.length; k++) if (item.tiles[k].text === word && used.indexOf(k) < 0) { used.push(k); return k; }
              return null;
            });
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
    // 2026-11-13 parity: the app's sound-only choices are now cards (a tap plays and selects, a
    // large Check submits, a missed card is crossed out: 94704af0e4). The file keeps two buttons
    // per choice, Listen first, then Choose, in every activity, as Find Sounds always had them
    // (hear, then choose).
    // The app does not trim a find-all board; neither does a packet.

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
        // 2026-11-13: without letters the choices say "Option 1": a tap on one chooses it, so "tap to hear" was wrong.
        sound_sort_instruction_listen: 'Press Listen to hear each word. Then choose every one that matches.',
        sound_sort_instruction_letters: 'Find all words that match: {family}',
        sound_sort_found: '{found} of {total} found',
        sound_sort_listen: 'Listen',
        sound_sort_listen_option: 'Listen to option {n}',
        sound_sort_listen_word: 'Listen to {word}',
        sound_sort_choose_option: 'Choose option {n}',
        sound_sort_choose_word: 'Choose {word}',
        sound_sort_option_n: 'Option {n}',
        sound_sort_hear_all: 'Hear all',
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
        var P = String(item.id || '').replace(/-\d+(?:-again)?$/, '') + '_';
        var T = function (key, params) { return ctx.fmt(ctx.L[P + key] || '', params); };
        var doc = ctx.root.ownerDocument;
        var win = doc.defaultView;
        var cards = [];
        var found = [];
        var total = item.chips.filter(function (c) { return c.member; }).length;
        var token = 0;
        var timer = null;
        var watchingStop = false;
        var clearTimer = function () {
          if (timer != null) { try { win.clearTimeout(timer); } catch (_) {} timer = null; }
        };
        var mark = function (index) {
          cards.forEach(function (c, i) { c.box.style.outline = i === index ? '4px solid var(--accent)' : ''; c.box.style.outlineOffset = i === index ? '2px' : ''; });
        };
        var onDocStop = function (e) {
          if (!ctx.root.isConnected || (e && e.target && e.target.closest && e.target.closest('[data-player-stop-audio]'))) halt();
        };
        var onDocKey = function (e) {
          var k = String((e && e.key) || '');
          if (!ctx.root.isConnected || k === 'Escape' || k === 'Esc') halt();
        };
        var watchStop = function (on) {
          if (!doc || !doc.addEventListener || watchingStop === on) return;
          watchingStop = on;
          if (on) { doc.addEventListener('click', onDocStop, true); doc.addEventListener('keydown', onDocKey, true); }
          else { doc.removeEventListener('click', onDocStop, true); doc.removeEventListener('keydown', onDocKey, true); }
        };
        var halt = function () { token++; clearTimer(); watchStop(false); mark(-1); };
        var run = function (steps) {
          clearTimer();
          var mine = ++token;
          var i = 0;
          watchStop(true);
          var step = function () {
            timer = null;
            if (mine !== token) return;
            if (!ctx.root.isConnected) { watchStop(false); mark(-1); return; }
            if (i >= steps.length) { watchStop(false); mark(-1); return; }
            var s = steps[i++];
            mark(s.hi == null ? -1 : s.hi);
            ctx.play(s.id).then(function (ok) {
              if (mine !== token) return;
              if (ok === false) { watchStop(false); mark(-1); return; }
              timer = win.setTimeout(step, s.gap || 0);
            });
          };
          step();
        };
        var heading = item.mode === 'rime'
          ? (ctx.showLetters ? T('heading_rime', { rime: '-' + item.rime }) : T('heading_rime_hidden'))
          : (ctx.showLetters ? T('heading_' + item.mode, { sound: typeof ctx.sound === 'function' ? ctx.sound(item.sound) : '/' + item.sound + '/' }) : T('heading_' + item.mode + '_hidden'));
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
              if (ctx.isDone() || card.found || card.tried) return;
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
              // A wrong tap costs one attempt. The chip stays on the board but cannot
              // be chosen again (the app counts a second tap of it as another miss).
              card.tried = true;
              box.classList.add('tried');
              choose.setAttribute('aria-disabled', 'true');
              ctx.answer(chip.text, false, {
                retryText: ctx.showLetters ? T('no_match_word', { word: chip.text }) : T('no_match'),
                missedText: ctx.showLetters ? T('missed', { words: memberText }) : T('missed_no_letters'),
              });
            } } }, [ctx.showLetters ? ctx.el('span', { class: 'letters', lang: 'en', text: chip.text }) : T('option_n', { n: n })]);
          var box = ctx.el('li', { class: 'choice' }, [listen, choose]);
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
        ctx.root.appendChild(ctx.el('p', { text: ctx.showLetters ? T('instruction_letters', { family: heading }) : (T('instruction_listen') || T('instruction')) }));
        // Hear all words: the player's Hear all (ctx.hearAll), the words not found yet, each marked with its number.
        var hear = typeof ctx.hearAll === 'function' ? ctx.hearAll({ label: T('hear_all'), support: 'allWordListens', before: halt, auto: false,
          ready: function () { return !ctx.isDone(); },
          list: function () { return cards.map(function (c, i) { return c.found ? null : { box: c.box, n: i + 1, total: cards.length, say: function () { return ctx.play(c.chip.audio); } }; }); } }) : null;
        var hearBtn = hear ? hear.button : ctx.el('button', { type: 'button', on: { click: function () { if (ctx.isDone()) return; ctx.support('allWordListens'); run(chipSteps(true)); } }, text: T('hear_all') });
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); run(instructionSteps()); } }, text: ctx.L.hear_question }),
          hearBtn,
          hear ? hear.note : null,
        ]));
        ctx.root.appendChild(counter);
        ctx.root.appendChild(list);
        if (typeof ctx.keys === 'function') {
          ctx.keys(function (key) {
            var k = String(key == null ? '' : key);
            if (k === 'Escape' || k === 'Esc') {
              var active = watchingStop || timer != null;
              halt();
              if (typeof ctx.stop === 'function') ctx.stop();
              return active;
            }
            return false;
          });
        }
        if (!ctx.isDone()) run(instructionSteps().concat(chipSteps(false)));
        return {
          stop: halt,
          // The R key: the instruction again.
          replay: function () { run(instructionSteps()); },
          reveal: function () {
            halt();
            hearBtn.setAttribute('aria-disabled', 'true');
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
    //           An apostrophe, hyphen or space is a fixed slot, filled in for the child,
    //           with no box (wsSpellFixedChar / wsSpellAlign, b38ca18141).
    //   grading submitConstructionAnswer (:18887-18902): trimmed, lowercased typed
    //           spelling === trimmed, lowercased word (on its letters only when the word
    //           has a fixed slot: wsSpellSame); the same unchanged spelling is not
    //           graded twice; checkAnswer("correct"|"incorrect","correct"). Default budget
    //           2 tries (:17130). A first miss keeps the spelling to fix.
    //   audio   inst_spelling_bee then the word (INST_KEY_MAP :16448, :16989-16995).
    // 2026-11-13 (owner): the boxes show the letters as typed and the keys are lowercase;
    // the answer line names the word as it is written. The app shows the boxes in capitals.
    module.exports = {
      id: 'spelling_bee',
      title: 'Spelling Bee',
      labels: {
        spelling_bee_question: 'Listen to the word, then type it.',
        spelling_bee_input: 'Type the word',
        spelling_bee_slow: 'Hear it slowly',
        spelling_bee_check: 'Check spelling',
        spelling_bee_first_letter: 'First letter hint',
        spelling_bee_hint_vowels: 'Show vowels',
        spelling_bee_hint_more: 'Show more',
        spelling_bee_letters_correct: '{count}/{total} letters correct',
        spelling_bee_empty: 'Type the word first.',
        spelling_bee_same: 'Change your spelling, then check it again.',
        spelling_bee_hint_used: 'Hint used. Your spelling is now {answer}.',
        spelling_bee_correct: 'Yes! That is how to spell {word}.',
        spelling_bee_missed: 'This is how to spell it: {word}. Listen.',
        spelling_bee_answer: 'The word is spelled: {word}',
        spelling_bee_letter_keys: 'Letter keys',
        spelling_bee_delete: 'Delete the last letter',
        spelling_bee_clear: 'Clear',
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
        var letterRe = null;
        try { letterRe = new RegExp('[\\p{L}\\p{M}\\p{N}]', 'u'); } catch (_) {}
        var target = word.toLowerCase();
        var extra = [];
        target.split('').forEach(function (ch) {
          if (!/[a-z]/.test(ch) && extra.indexOf(ch) < 0 && ch.trim() && (letterRe ? letterRe.test(ch) : !/^['’\-.]$/.test(ch))) extra.push(ch);
        });
        var item = { target: target, wordAudio: wordAudio, promptAudio: prompt,
          introAudio: [prompt, wordAudio], answerAudio: [wordAudio] };
        if (extra.length) item.extraTiles = extra;
        // A word written with a capital (a name): how it is written, for the answer line and the hints.
        if (word !== item.target && word.length === item.target.length) item.shown = word;
        return { item: item };
      },
      render: function (item, ctx) {
        var L = ctx.L;
        var word = String(item.target);
        var written = item.shown && String(item.shown).length === word.length ? String(item.shown) : word;
        // wsSpellFixedChar: not a letter, mark or digit (an apostrophe, hyphen or space).
        var letterRe = null;
        try { letterRe = new RegExp('[\\p{L}\\p{M}\\p{N}_]', 'u'); } catch (_) {}
        var fixed = function (ch) { ch = String(ch || ''); return letterRe ? !letterRe.test(ch) : /^['’\- .]$/.test(ch); };
        var hasFixed = word.split('').some(fixed);
        var own = function (text) { return String(text || '').split('').filter(function (ch) { return !fixed(ch); }).join(''); };
        var total = own(word).length || word.length;
        // wsSpellAlign: typed letters go into the word's letter slots, and a fixed slot is filled as soon as the letters
        // before it are in ("don" -> "don'"). "_" is a hint's place for a letter not typed yet.
        var align = function (typed) {
          var letters = own(typed).split(''), out = '', used = 0;
          for (var i = 0; i < written.length; i++) {
            var ch = written[i];
            if (fixed(ch)) { if (used < letters.length || used > 0) out += ch; else break; }
            else if (used < letters.length) out += letters[used++];
            else break;
          }
          return out;
        };
        var lastSubmitted = null;
        var before = '';
        var inputId = 'bee-' + String(item.id || 'x').replace(/[^a-z0-9-]/gi, '');
        var input = ctx.el('input', { id: inputId, type: 'text', autocomplete: 'off', autocorrect: 'off', autocapitalize: 'none', spellcheck: 'false',
          inputmode: /[^a-z]/.test(own(word)) ? 'text' : 'none', dir: 'ltr', maxlength: String(word.length || 20),
          style: 'font-size:1.6rem;font-weight:700;letter-spacing:.1em;text-align:center', on: {
            input: function () {
              if (hasFixed) {
                var raw = value(), letters = own(raw);
                // Backspace over a fixed slot takes the letter before it too, or the slot would come back at once.
                if (raw.length < before.length && letters === own(before)) letters = letters.slice(0, -1);
                input.value = align(letters);
              }
              before = value(); lastSubmitted = null; draw();
            },
            keydown: function (e) {
              if (e.key !== 'Enter' || e.repeat || e.isComposing || e.keyCode === 229) return;
              e.preventDefault();
              submit();
            },
          } });
        var value = function () { return String(input.value || ''); };
        var set = function (next) { input.value = next; before = next; lastSubmitted = null; draw(); };
        // One box per letter (aria-hidden: the count line below carries the result); a fixed slot is shown as it is.
        var boxes = written.split('').map(function (ch) {
          return fixed(ch) ? ctx.el('span', { 'data-fixed': '', style: 'display:flex;align-items:center;font-size:1.4rem;font-weight:700' }, [ch === ' ' ? ' ' : ch])
            : ctx.el('span', { class: 'slot', style: 'min-width:48px;min-height:56px' });
        });
        var boxRow = ctx.el('div', { class: 'slots', 'aria-hidden': 'true', dir: 'ltr' }, boxes);
        var countLine = ctx.el('p', { hidden: true });
        var draw = function () {
          var typed = value();
          var shown = ctx.attempts() > 0;
          var right = 0;
          boxes.forEach(function (box, i) {
            if (fixed(word[i])) return;
            var ch = typed[i] || '';
            var ok = shown && ch && ch.toLowerCase() === word[i];
            if (ok) right++;
            box.textContent = ch || '_';
            box.style.borderStyle = ch ? 'solid' : 'dashed';
            box.style.borderColor = shown && ch ? (ok ? 'var(--ok)' : 'var(--warn)') : 'var(--muted)';
            box.style.background = shown && ch ? (ok ? 'var(--ok-bg)' : 'var(--warn-bg)') : '';
          });
          countLine.hidden = !(shown && typed);
          countLine.textContent = ctx.fmt(L.spelling_bee_letters_correct, { count: right, total: total });
          moreBtn.textContent = typed.indexOf('_') >= 0 ? L.spelling_bee_hint_more : L.spelling_bee_hint_vowels;
        };
        var edit = function (next, clue) {
          if (ctx.isDone()) return;
          if (!next || next === value()) return;
          ctx.support(clue);
          set(next);
          ctx.announce(ctx.fmt(L.spelling_bee_hint_used, { answer: next.split('').join(' ') }));
        };
        var submit = function () {
          if (ctx.isDone()) return;
          var answer = value().trim().toLowerCase();
          if (!answer || (hasFixed && !own(answer))) { ctx.announce(L.spelling_bee_empty); return; }
          if (answer === lastSubmitted) { ctx.announce(L.spelling_bee_same); return; }
          lastSubmitted = answer;
          // wsSpellSame: a word with a fixed slot is judged on its letters.
          ctx.answer(answer, hasFixed ? own(answer) === own(word) : answer === word.trim().toLowerCase(), {
            correctText: ctx.fmt(L.spelling_bee_correct, { word: written }),
            missedText: ctx.fmt(L.spelling_bee_missed, { word: written }),
          });
          // A first miss keeps the spelling; the boxes now mark each letter.
          draw();
        };
        // "Slow" plays the same recording at half speed, as playSpellingWord(0.5) does.
        var playSlow = function () { ctx.play(item.wordAudio, 0.5); };
        var firstBtn = ctx.el('button', { type: 'button', on: { click: function () {
          // The first LETTER, after any fixed slot in front of it.
          var at = 0;
          while (at < written.length - 1 && fixed(written[at])) at++;
          var next = hasFixed ? align(written.slice(0, at + 1) + value().slice(at + 1)) : (written[0] || '') + value().slice(1);
          // 2026-11-18: as Show More, it never writes the last letter ("I", "a": the first letter is the whole word).
          if (String(next).toLowerCase() === written.toLowerCase()) return;
          edit(next, 'spelling_first_letter');
        } }, text: L.spelling_bee_first_letter });
        // "Show Vowels", then "Show More" one letter at a time (:19846-19863).
        var moreBtn = ctx.el('button', { type: 'button', on: { click: function () {
          var current = value().toLowerCase();
          var letters = written.split('');
          var isVowel = function (ch) { return 'aeiou'.indexOf(ch.toLowerCase()) >= 0; };
          var vowelsShown = letters.every(function (ch, i) { return !isVowel(ch) || current[i] === ch.toLowerCase(); });
          var filled = letters.map(function (ch, i) { return fixed(ch) || isVowel(ch) || current[i] === ch.toLowerCase() ? ch : '_'; });
          var blanks = function () { return filled.filter(function (ch) { return ch === '_'; }).length; };
          // A hint never fills in the last letter: the student always writes at least one letter of the word.
          if (vowelsShown) { var nextBlank = filled.indexOf('_'); if (nextBlank >= 0 && blanks() > 1) filled[nextBlank] = letters[nextBlank]; }
          else if (!blanks()) { for (var k = letters.length - 1; k >= 0; k--) { if (!fixed(letters[k]) && isVowel(letters[k]) && current[k] !== letters[k].toLowerCase()) { filled[k] = '_'; break; } } }
          edit(filled.join(''), vowelsShown ? 'spelling_more_letters' : 'spelling_vowels');
        } }, text: L.spelling_bee_hint_vowels });
        var checkBtn = ctx.el('button', { type: 'button', class: 'primary', on: { click: submit }, text: L.spelling_bee_check });
        var answerLine = ctx.el('p', { class: 'letters', hidden: true, text: ctx.fmt(L.spelling_bee_answer, { word: written }) });
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
        var keyChars = 'abcdefghijklmnopqrstuvwxyz'.split('');
        (Array.isArray(item.extraTiles) ? item.extraTiles : []).forEach(function (ch) {
          var c = String(ch == null ? '' : ch);
          if (c && keyChars.indexOf(c) < 0) keyChars.push(c);
        });
        var letterKeys = keyChars.map(function (ch) {
          return ctx.el('button', { type: 'button', style: 'min-width:44px;min-height:44px;font-weight:700', on: { click: function () {
            if (ctx.isDone() || own(value()).length >= total) return;
            set(hasFixed ? align(value() + ch) : value() + ch);
          } } }, [ch]);
        });
        var deleteKey = ctx.el('button', { type: 'button', 'aria-label': L.spelling_bee_delete, style: 'min-width:44px;min-height:44px', on: { click: function () {
          if (ctx.isDone() || !value()) return;
          set(hasFixed ? align(own(value()).slice(0, -1)) : value().slice(0, -1));
        } } }, ['⌫']);
        var clearKey = ctx.el('button', { type: 'button', style: 'min-height:44px;padding:0 12px', on: { click: function () {
          if (ctx.isDone() || !value()) return;
          set('');
        } } }, [L.spelling_bee_clear || 'Clear']);
        ctx.root.appendChild(ctx.el('div', { class: 'row', role: 'group', 'aria-label': L.spelling_bee_letter_keys, style: 'flex-wrap:wrap;gap:4px;margin-top:8px' }, letterKeys.concat([deleteKey, clearKey])));
        ctx.root.appendChild(ctx.el('div', { class: 'row', style: 'margin-top:12px' }, [checkBtn, firstBtn, moreBtn]));
        ctx.root.appendChild(answerLine);
        draw();
        return {
          reveal: function () {
            input.setAttribute('readonly', '');
            input.setAttribute('aria-readonly', 'true');
            [checkBtn, firstBtn, moreBtn, deleteKey, clearKey].concat(letterKeys).forEach(function (b) { b.setAttribute('aria-disabled', 'true'); });
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
    // 2026-11-13 parity: the app's sound-only choices are now cards (a tap plays and selects, a
    // large Check submits, a missed card is crossed out: 94704af0e4). The file keeps two buttons
    // per choice, Listen first, then Choose, in every activity, as Find Sounds always had them
    // (hear, then choose).

    module.exports = {
      id: 'syllable_blending',
      title: 'Syllable Blending',
      labels: {
        syllable_blending_prompt: 'Listen to the syllables and blend them together.',
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
        var doc = ctx.root.ownerDocument;
        var win = doc.defaultView;
        var token = 0;
        var timer = null;
        var cancelPending = null;
        var delivered = false;
        var busy = false;
        var watchingStop = false;
        var hear = null;
        var playBtn = null;
        var questionBtn = null;
        var cards = [];
        var parts = [];
        var answerText = item.target;
        var note = ctx.el('p', { class: 'muted', text: ctx.L.syllable_blending_listen_first });
        var clearTimer = function () {
          if (timer != null) { try { win.clearTimeout(timer); } catch (_) {} timer = null; }
        };
        var setState = function () {
          var done = ctx.isDone();
          cards.forEach(function (c) {
            var lockChoose = done || c.tried || !delivered || busy;
            if (lockChoose) c.choose.setAttribute('aria-disabled', 'true'); else c.choose.removeAttribute('aria-disabled');
            if (busy) c.listen.setAttribute('aria-disabled', 'true'); else c.listen.removeAttribute('aria-disabled');
          });
          if (hear) { if (busy || done) hear.button.setAttribute('aria-disabled', 'true'); else hear.button.removeAttribute('aria-disabled'); }
          if (playBtn) { if (done) playBtn.setAttribute('aria-disabled', 'true'); else playBtn.removeAttribute('aria-disabled'); }
          if (questionBtn) { if (done) questionBtn.setAttribute('aria-disabled', 'true'); else questionBtn.removeAttribute('aria-disabled'); }
          note.hidden = delivered || done;
        };
        var highlight = function (index) {
          parts.forEach(function (p, i) { p.style.background = i === index ? 'var(--accent)' : ''; p.style.color = i === index ? 'var(--accent-ink)' : ''; });
        };
        var onDocStop = function (e) {
          if (!ctx.root.isConnected || (e && e.target && e.target.closest && e.target.closest('[data-player-stop-audio]'))) halt();
        };
        var onDocKey = function (e) {
          var k = String((e && e.key) || '');
          if (!ctx.root.isConnected || k === 'Escape' || k === 'Esc') halt();
        };
        var watchStop = function (on) {
          if (!doc || !doc.addEventListener || watchingStop === on) return;
          watchingStop = on;
          if (on) { doc.addEventListener('click', onDocStop, true); doc.addEventListener('keydown', onDocKey, true); }
          else { doc.removeEventListener('click', onDocStop, true); doc.removeEventListener('keydown', onDocKey, true); }
        };
        var halt = function () {
          token++;
          clearTimer();
          watchStop(false);
          var pending = cancelPending;
          cancelPending = null;
          busy = false;
          highlight(-1);
          setState();
          if (pending) pending(false);
        };
        // The syllable run the answer waits for: every unit must play through.
        var runSyllables = function (withPrompt) {
          clearTimer();
          var prev = cancelPending;
          cancelPending = null;
          if (prev) prev(false);
          var mine = ++token;
          busy = true;
          watchStop(true);
          setState();
          var gap = typeof ctx.soundGap === 'function' ? ctx.soundGap() : 350;
          var steps = (withPrompt ? [{ id: item.promptAudio, gap: 200, hi: -1 }] : [])
            .concat(item.units.map(function (id, i) { return { id: id, gap: i < item.units.length - 1 ? gap : 0, hi: i }; }));
          var i = 0;
          return new Promise(function (resolve) {
            var settled = false;
            var done = function (ok) {
              if (settled) return;
              settled = true;
              if (cancelPending === done) cancelPending = null;
              resolve(ok);
            };
            cancelPending = done;
            var finish = function (ok) {
              clearTimer();
              watchStop(false);
              busy = false;
              if (ok) delivered = true;
              highlight(-1);
              setState();
              done(ok);
            };
            var step = function () {
              timer = null;
              if (mine !== token) { done(false); return; }
              if (!ctx.root.isConnected) { finish(false); return; }
              if (i >= steps.length) { finish(true); return; }
              var s = steps[i++];
              highlight(s.hi);
              ctx.play(s.id).then(function (ok) {
                if (mine !== token) { done(false); return; }
                if (!ok) { finish(false); return; }
                timer = win.setTimeout(step, s.gap || 0);
              });
            };
            step();
          });
        };
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.syllable_blending_prompt }));
        var row = ctx.el('div', { class: 'row', 'aria-hidden': 'true', dir: 'ltr' });
        item.syllables.forEach(function (syllable) {
          var p = ctx.el('span', { class: 'slot', style: 'padding:0 12px', text: ctx.showLetters ? syllable : '●' });
          parts.push(p);
          row.appendChild(p);
        });
        ctx.root.appendChild(row);
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
            } } }, [ctx.showLetters ? ctx.el('span', { class: 'letters', lang: 'en', text: choice.text }) : ctx.fmt(ctx.L.syllable_blending_option_n, { n: n })]);
          var box = ctx.el('li', { class: 'choice' }, [listen, choose]);
          card.box = box; card.choose = choose; card.listen = listen;
          cards.push(card);
          list.appendChild(box);
        });
        // Hear all (the player's ctx.hearAll): each choice in turn, marked with its number, once the syllables are not playing.
        hear = typeof ctx.hearAll === 'function' ? ctx.hearAll({ before: halt, ready: function () { return !busy && !ctx.isDone(); },
          list: function () { return cards.map(function (c, i) { return { box: c.box, say: function () { return ctx.play(item.choices[i].audio); } }; }); } }) : null;
        playBtn = ctx.el('button', { type: 'button', class: 'primary', on: { click: function () { if (ctx.isDone()) return; ctx.support('syllableReplays'); runSyllables(false); } }, text: '▶ ' + ctx.L.syllable_blending_play });
        questionBtn = ctx.el('button', { type: 'button', on: { click: function () { if (ctx.isDone()) return; ctx.support('questionReplays'); runSyllables(true); } }, text: ctx.L.hear_question });
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          playBtn,
          questionBtn,
          hear ? hear.button : null,
          hear ? hear.note : null,
        ]));
        ctx.root.appendChild(note);
        ctx.root.appendChild(list);
        if (typeof ctx.keys === 'function') {
          ctx.keys(function (key) {
            var k = String(key == null ? '' : key);
            if (k === 'Escape' || k === 'Esc') {
              var active = busy || timer != null || watchingStop;
              halt();
              if (typeof ctx.stop === 'function') ctx.stop();
              return active;
            }
            return false;
          });
        }
        setState();
        var opening = !ctx.isDone() ? runSyllables(!ctx.skipDirections) : null;
        return {
          opening: opening,
          stop: halt,
          // The R key: the question and the syllables again (the choices wait for them, as on the button).
          replay: function () { if (!ctx.isDone()) runSyllables(true); },
          reveal: function () {
            halt();
            playBtn.setAttribute('aria-disabled', 'true');
            questionBtn.setAttribute('aria-disabled', 'true');
            if (hear) hear.button.setAttribute('aria-disabled', 'true');
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
    // 2026-11-13: the button says Check, as in every other activity (the app says Submit).
    module.exports = {
      id: 'syllable_counting',
      title: 'Syllable Claps',
      labels: {
        syllable_counting_question: 'How many syllables do you hear? Clap for each one.',
        syllable_counting_tap: 'Tap to count syllables',
        syllable_counting_undo: 'Undo last tap',
        syllable_counting_reset: 'Reset',
        syllable_counting_submit: 'Check',
        syllable_counting_taps_one: 'You tapped {count} time.',
        syllable_counting_taps_other: 'You tapped {count} times.',
        syllable_counting_wait_word: 'Hear the whole word before checking.',
        syllable_counting_wait_audio: 'Wait for the word to finish before checking.',
        syllable_counting_ready: 'Ready to check.',
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
        var doc = ctx.root.ownerDocument;
        var tap = ctx.el('button', { type: 'button', class: 'primary', 'aria-label': ctx.L.syllable_counting_tap, style: 'min-width:128px;min-height:128px;border-radius:64px;font-size:1.2rem',
          on: { click: function () { if (ctx.isDone()) return; taps++; update(); } } },
          [ctx.el('span', { 'aria-hidden': 'true', style: 'display:block;font-size:2.4rem', text: '👏' }), ctx.L.syllable_counting_tap]);
        var undo = ctx.el('button', { type: 'button', on: { click: function () {
          if (ctx.isDone() || taps === 0) return;
          taps--; update();
          if (taps === 0) { try { tap.focus(); } catch (_) {} }
        } }, text: ctx.L.syllable_counting_undo });
        var reset = ctx.el('button', { type: 'button', on: { click: function () {
          if (ctx.isDone()) return;
          taps = 0; update();
          try { tap.focus(); } catch (_) {}
        } }, text: ctx.L.syllable_counting_reset });
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
          if (outcome === 'retry') { update(); try { tap.focus(); } catch (_) {} }
        } }, text: ctx.L.syllable_counting_submit });
        if (typeof ctx.keys === 'function') {
          ctx.keys(function (key) {
            if (ctx.isDone()) return false;
            var k = String(key == null ? '' : key);
            if (k === ' ' || k === 'Spacebar') {
              var ae = doc && doc.activeElement;
              var onOtherBtn = !!(ae && String(ae.tagName || '').toUpperCase() === 'BUTTON' && ae !== tap && !ae.closest('[hidden]') && !ae.disabled && ae.getAttribute('aria-disabled') !== 'true');
              if (onOtherBtn) return false;
              tap.click();
              return true;
            }
            if (k === 'Backspace') {
              if (taps === 0) return false;
              undo.click();
              return true;
            }
            if (k === 'Enter') {
              var ae2 = doc && doc.activeElement;
              var onBtn = !!(ae2 && String(ae2.tagName || '').toUpperCase() === 'BUTTON' && ae2 !== submit && !ae2.closest('[hidden]') && !ae2.disabled && ae2.getAttribute('aria-disabled') !== 'true');
              if (onBtn || !canSubmit()) return false;
              submit.click();
              return true;
            }
            return false;
          });
        }
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
        if (!ctx.isDone()) hear(ctx.skipDirections ? [item.wordAudio] : [item.promptAudio, item.wordAudio], true);
        return {
          replay: function () { if (!ctx.isDone()) hear([item.promptAudio, item.wordAudio], true); },
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
    // 2026-11-13 parity: the app's sound-only choices are now cards (a tap plays and selects, a
    // large Check submits, a missed card is crossed out: 94704af0e4). The file keeps two buttons
    // per choice, Listen first, then Choose, in every activity, as Find Sounds always had them
    // (hear, then choose).
    // The app does not trim a find-all board; neither does a packet.

    module.exports = {
      id: 'word_families',
      title: 'Word Families',
      labels: {
        word_families_heading_rime: '{rime} family',
        word_families_heading_rime_hidden: 'Sound Family',
        word_families_instruction: 'Tap each word to hear it. Find the ones that match!',
        // 2026-11-13: without letters the choices say "Option 1": a tap on one chooses it, so "tap to hear" was wrong.
        word_families_instruction_listen: 'Press Listen to hear each word. Then choose every one that is in the family.',
        word_families_instruction_letters: 'Find all words that match: {family}',
        word_families_found: '{found} of {total} found',
        word_families_listen: 'Listen',
        word_families_listen_option: 'Listen to option {n}',
        word_families_listen_word: 'Listen to {word}',
        word_families_choose_option: 'Choose option {n}',
        word_families_choose_word: 'Choose {word}',
        word_families_option_n: 'Option {n}',
        word_families_hear_all: 'Hear all',
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
        var P = String(item.id || '').replace(/-\d+(?:-again)?$/, '') + '_';
        var T = function (key, params) { return ctx.fmt(ctx.L[P + key] || '', params); };
        var doc = ctx.root.ownerDocument;
        var win = doc.defaultView;
        var cards = [];
        var found = [];
        var total = item.chips.filter(function (c) { return c.member; }).length;
        var token = 0;
        var timer = null;
        var watchingStop = false;
        var clearTimer = function () {
          if (timer != null) { try { win.clearTimeout(timer); } catch (_) {} timer = null; }
        };
        var mark = function (index) {
          cards.forEach(function (c, i) { c.box.style.outline = i === index ? '4px solid var(--accent)' : ''; c.box.style.outlineOffset = i === index ? '2px' : ''; });
        };
        var onDocStop = function (e) {
          if (!ctx.root.isConnected || (e && e.target && e.target.closest && e.target.closest('[data-player-stop-audio]'))) halt();
        };
        var onDocKey = function (e) {
          var k = String((e && e.key) || '');
          if (!ctx.root.isConnected || k === 'Escape' || k === 'Esc') halt();
        };
        var watchStop = function (on) {
          if (!doc || !doc.addEventListener || watchingStop === on) return;
          watchingStop = on;
          if (on) { doc.addEventListener('click', onDocStop, true); doc.addEventListener('keydown', onDocKey, true); }
          else { doc.removeEventListener('click', onDocStop, true); doc.removeEventListener('keydown', onDocKey, true); }
        };
        var halt = function () { token++; clearTimer(); watchStop(false); mark(-1); };
        var run = function (steps) {
          clearTimer();
          var mine = ++token;
          var i = 0;
          watchStop(true);
          var step = function () {
            timer = null;
            if (mine !== token) return;
            if (!ctx.root.isConnected) { watchStop(false); mark(-1); return; }
            if (i >= steps.length) { watchStop(false); mark(-1); return; }
            var s = steps[i++];
            mark(s.hi == null ? -1 : s.hi);
            ctx.play(s.id).then(function (ok) {
              if (mine !== token) return;
              if (ok === false) { watchStop(false); mark(-1); return; }
              timer = win.setTimeout(step, s.gap || 0);
            });
          };
          step();
        };
        var heading = item.mode === 'rime'
          ? (ctx.showLetters ? T('heading_rime', { rime: '-' + item.rime }) : T('heading_rime_hidden'))
          : (ctx.showLetters ? T('heading_' + item.mode, { sound: typeof ctx.sound === 'function' ? ctx.sound(item.sound) : '/' + item.sound + '/' }) : T('heading_' + item.mode + '_hidden'));
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
              if (ctx.isDone() || card.found || card.tried) return;
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
              // A wrong tap costs one attempt. The chip stays on the board but cannot
              // be chosen again (the app counts a second tap of it as another miss).
              card.tried = true;
              box.classList.add('tried');
              choose.setAttribute('aria-disabled', 'true');
              ctx.answer(chip.text, false, {
                retryText: ctx.showLetters ? T('no_match_word', { word: chip.text }) : T('no_match'),
                missedText: ctx.showLetters ? T('missed', { words: memberText }) : T('missed_no_letters'),
              });
            } } }, [ctx.showLetters ? ctx.el('span', { class: 'letters', lang: 'en', text: chip.text }) : T('option_n', { n: n })]);
          var box = ctx.el('li', { class: 'choice' }, [listen, choose]);
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
        ctx.root.appendChild(ctx.el('p', { text: ctx.showLetters ? T('instruction_letters', { family: heading }) : (T('instruction_listen') || T('instruction')) }));
        // Hear all words: the player's Hear all (ctx.hearAll), the words not found yet, each marked with its number.
        var hear = typeof ctx.hearAll === 'function' ? ctx.hearAll({ label: T('hear_all'), support: 'allWordListens', before: halt, auto: false,
          ready: function () { return !ctx.isDone(); },
          list: function () { return cards.map(function (c, i) { return c.found ? null : { box: c.box, n: i + 1, total: cards.length, say: function () { return ctx.play(c.chip.audio); } }; }); } }) : null;
        var hearBtn = hear ? hear.button : ctx.el('button', { type: 'button', on: { click: function () { if (ctx.isDone()) return; ctx.support('allWordListens'); run(chipSteps(true)); } }, text: T('hear_all') });
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); run(instructionSteps()); } }, text: ctx.L.hear_question }),
          hearBtn,
          hear ? hear.note : null,
        ]));
        ctx.root.appendChild(counter);
        ctx.root.appendChild(list);
        if (typeof ctx.keys === 'function') {
          ctx.keys(function (key) {
            var k = String(key == null ? '' : key);
            if (k === 'Escape' || k === 'Esc') {
              var active = watchingStop || timer != null;
              halt();
              if (typeof ctx.stop === 'function') ctx.stop();
              return active;
            }
            return false;
          });
        }
        if (!ctx.isDone()) run(instructionSteps().concat(chipSteps(false)));
        return {
          stop: halt,
          // The R key: the instruction again.
          replay: function () { run(instructionSteps()); },
          reveal: function () {
            halt();
            hearBtn.setAttribute('aria-disabled', 'true');
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
    //           An apostrophe, hyphen or space is a fixed slot in the answer row, not a
    //           tile (wsSpellFixedChar, b38ca18141).
    //   grading submitConstructionAnswer (:18887-18902): trimmed, lowercased answer
    //           === trimmed, lowercased word (on its letters: wsSpellSame); the same
    //           unchanged answer is not graded twice; checkAnswer("correct"|"incorrect",
    //           "correct"). Default budget 2 tries (:17130). A first miss clears the
    //           answer and frees every tile (checkScramble :19875-19880).
    //   audio   inst_word_scramble (INST_KEY_MAP :16449); the word only on request.
    // 2026-11-13 (owner): tiles and boxes show the letters in the case the word is written
    // (lowercase for a normal word, a name's capital kept); the app shows capitals.
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
        var written = String(env.word || '').trim();
        var word = written.toLowerCase();
        if (!word) return { missing: ['word'] };
        // wsSpellFixedChar: an apostrophe, hyphen or space is never a tile.
        var letterRe = null;
        try { letterRe = new RegExp('[\\p{L}\\p{M}\\p{N}_]', 'u'); } catch (_) {}
        var isLetter = function (ch) { return letterRe ? letterRe.test(ch) : !/^['’\- .]$/.test(ch); };
        var board = w && w.activityItems && w.activityItems.word_scramble;
        var letters = board && Array.isArray(board.letters) ? board.letters.map(function (l) { return String(l).toLowerCase(); }).filter(isLetter) : null;
        // The board must be exactly this word's letters (one tile per letter).
        if (letters && letters.slice().sort().join('\u0000') !== word.split('').filter(isLetter).sort().join('\u0000')) return { missing: ['board'] };
        if (!letters) {
          // scrambleWord (word_sounds_module.js:18916-18928), copied exactly, then the tiles only.
          letters = word.split('');
          if (word.length > 2) {
            var seed = word.split('').reduce(function (a, c) { return a + c.charCodeAt(0); }, 0);
            for (var i = letters.length - 1; i > 0; i--) { var j = (seed + i) % (i + 1); var t = letters[i]; letters[i] = letters[j]; letters[j] = t; }
            if (letters.join('') === word) { var t2 = letters[0]; letters[0] = letters[1]; letters[1] = t2; }
          }
          letters = letters.filter(isLetter);
        }
        // 2026-11-18: the tiles never start as the word, also once its ' and - are out ("I'll": i l l) or when the two
        // swapped tiles are the same letter ("eek"): the first tile changes place with the first tile that differs.
        var tilesOf = word.split('').filter(isLetter).join('');
        if (letters.length > 1 && letters.join('') === tilesOf) {
          for (var d = 1; d < letters.length; d++) { if (letters[d] !== letters[0]) { var t3 = letters[0]; letters[0] = letters[d]; letters[d] = t3; break; } }
        }
        var missing = [];
        var wordAudio = env.wordClip(env.word);
        if (!wordAudio) missing.push('word');
        var prompt = env.bankClip('instructions', 'inst_word_scramble');
        if (!prompt) missing.push('question');
        if (missing.length) return { missing: missing };
        var item = { target: word, letters: letters, wordAudio: wordAudio, promptAudio: prompt,
          introAudio: [prompt], answerAudio: [wordAudio] };
        // A word written with a capital (a name): how it is written.
        if (written !== word && written.length === word.length) item.shown = written;
        return { item: item };
      },
      render: function (item, ctx) {
        var doc = ctx.root.ownerDocument;
        var L = ctx.L;
        var target = String(item.target);
        var written = item.shown && String(item.shown).length === target.length ? String(item.shown) : target;
        var letterRe = null;
        try { letterRe = new RegExp('[\\p{L}\\p{M}\\p{N}_]', 'u'); } catch (_) {}
        var fixed = function (ch) { ch = String(ch || ''); return letterRe ? !letterRe.test(ch) : /^['’\- .]$/.test(ch); };
        // The places of the word's letters (a fixed slot has no box).
        var places = [];
        for (var p = 0; p < target.length; p++) if (!fixed(target[p])) places.push(p);
        var n = places.length;
        var boxes = [];
        for (var s = 0; s < n; s++) boxes.push(null);
        // Each tile as it is written in the word: the s of "Sam" shows S.
        var takenAt = [];
        var shownOf = item.letters.map(function (letter) {
          for (var k = 0; k < places.length; k++) {
            var at = places[k];
            if (takenAt.indexOf(at) < 0 && target[at] === letter) { takenAt.push(at); return written[at]; }
          }
          return String(letter);
        });
        var picked = null;
        var lastSubmitted = null;
        var locked = function () { return ctx.isDone(); };
        var up = function (ti) { return shownOf[ti]; };
        var answerText = function () { return boxes.filter(function (x) { return x != null; }).map(function (ti) { return item.letters[ti]; }).join(''); };
        // The whole word as placed, fixed slots in, once every box is full (the response); else the letters placed.
        var placedWord = function () {
          if (boxes.some(function (x) { return x == null; })) return answerText();
          var k = 0;
          return target.split('').map(function (ch) { return fixed(ch) ? ch : item.letters[boxes[k++]]; }).join('');
        };
        var own = function (text) { return String(text || '').split('').filter(function (ch) { return !fixed(ch); }).join(''); };

        var drag = null, dragEndedAt = 0;
        var dragged = function () { return Date.now() - dragEndedAt < 400; };
        var dragStart = function (e, ti, from, bi) {
          if (locked() || e.isPrimary === false || (e.pointerType === 'mouse' && e.button !== 0)) return;
          drag = { ti: ti, from: from, bi: bi, x: e.clientX, y: e.clientY, src: e.currentTarget, ghost: null };
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
          e.currentTarget.addEventListener('pointermove', dragMove);
          e.currentTarget.addEventListener('pointerup', dragEnd);
          e.currentTarget.addEventListener('pointercancel', dragEnd);
        };
        var dragMove = function (e) {
          if (!drag) return;
          var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
          if (!drag.ghost) {
            if (dx * dx + dy * dy < 100) return;
            var g = drag.src.cloneNode(true);
            ['data-ws-tile', 'data-ws-box', 'aria-label', 'aria-pressed'].forEach(function (a) { g.removeAttribute(a); });
            g.setAttribute('aria-hidden', 'true');
            var r = drag.src.getBoundingClientRect();
            g.style.cssText += ';position:fixed;margin:0;z-index:60;pointer-events:none;opacity:.92;width:' + r.width + 'px;height:' + r.height + 'px';
            doc.body.appendChild(g);
            drag.ghost = g;
            drag.w = r.width; drag.h = r.height;
            if (drag.from === 'tray') { picked = drag.ti; draw(); }
          }
          drag.ghost.style.left = (e.clientX - drag.w / 2) + 'px';
          drag.ghost.style.top = (e.clientY - drag.h / 2) + 'px';
          e.preventDefault();
        };
        var dragEnd = function (e) {
          var d = drag;
          drag = null;
          if (!d) return;
          d.src.removeEventListener('pointermove', dragMove);
          d.src.removeEventListener('pointerup', dragEnd);
          d.src.removeEventListener('pointercancel', dragEnd);
          if (!d.ghost) return;
          if (d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost);
          dragEndedAt = Date.now();
          var at = e.type === 'pointercancel' ? null : (typeof doc.elementFromPoint === 'function' ? doc.elementFromPoint(e.clientX, e.clientY) : null);
          var boxNode = at && at.closest ? at.closest('[data-ws-box]') : null;
          var trayNode = at && at.closest ? at.closest('[data-ws-tray]') : null;
          if (boxNode && ctx.root.contains(boxNode)) {
            var to = Number(boxNode.getAttribute('data-ws-box'));
            if (d.from === 'tray') {
              picked = null; boxes[to] = d.ti; lastSubmitted = null;
              draw();
              ctx.announce(ctx.fmt(L.word_scramble_placed, { letter: up(d.ti), n: to + 1 }));
            } else if (to !== d.bi) {
              var other = boxes[to];
              boxes[to] = d.ti; boxes[d.bi] = other; picked = null; lastSubmitted = null;
              draw();
              ctx.announce(ctx.fmt(L.word_scramble_placed, { letter: up(d.ti), n: to + 1 }));
            }
          } else if (trayNode && d.from === 'box') {
            boxes[d.bi] = null; lastSubmitted = null;
            draw();
            ctx.announce(ctx.fmt(L.word_scramble_removed, { letter: up(d.ti), n: d.bi + 1 }));
          } else if (d.from === 'tray') {
            picked = null; draw();
          }
        };

        var tray = ctx.el('ul', { class: 'row', 'data-ws-tray': '', 'aria-label': L.word_scramble_tray, style: 'list-style:none;padding:0;margin:16px 0;gap:10px' });
        var tiles = item.letters.map(function (letter, ti) {
          var btn = ctx.el('button', { type: 'button', class: 'primary', 'aria-pressed': 'false', 'data-ws-tile': String(ti), 'aria-label': ctx.fmt(L.word_scramble_pick, { letter: up(ti) }),
            style: 'min-width:var(--ws-tile,56px);min-height:var(--ws-tile,56px);font-size:1.5rem;font-weight:700;touch-action:none',
            on: { click: function (e) { if (dragged()) return; onTile(ti, e); }, pointerdown: function (e) { dragStart(e, ti, 'tray', -1); } } }, [up(ti)]);
          var li = ctx.el('li', {}, [btn]);
          tray.appendChild(li);
          return { li: li, btn: btn };
        });
        var boxList = ctx.el('ol', { class: 'slots', dir: 'ltr', 'aria-label': L.word_scramble_boxes });
        var boxEls = [];
        target.split('').forEach(function (ch, i) {
          if (fixed(ch)) { boxList.appendChild(ctx.el('li', { 'aria-hidden': 'true', 'data-fixed': '', style: 'display:flex;align-items:center;font-size:1.5rem;font-weight:700' }, [written[i] === ' ' ? ' ' : written[i]])); return; }
          var bi = boxEls.length;
          var btn = ctx.el('button', { type: 'button', class: 'slot', 'data-ws-box': String(bi), style: 'min-width:var(--ws-box-w,60px);min-height:var(--ws-box-h,64px);font-size:1.5rem;font-weight:700',
            on: { click: function (e) { if (dragged()) return; onBox(bi, e); }, pointerdown: function (e) { if (boxes[bi] != null) dragStart(e, boxes[bi], 'box', bi); } } });
          boxList.appendChild(ctx.el('li', {}, [btn]));
          boxEls.push(btn);
        });
        var wordLine = ctx.el('p', { class: 'letters', hidden: true, text: ctx.fmt(L.word_scramble_word, { word: written }) });
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
          if (tiles[0] && tiles[0].btn) { try { tiles[0].btn.focus(); } catch (_) {} }
        } }, text: L.word_scramble_clear });
        var checkBtn = ctx.el('button', { type: 'button', class: 'primary', on: { click: function () { onCheck(); } }, text: L.word_scramble_check });

        var draw = function () {
          var holding = picked != null && !locked();
          tiles.forEach(function (t, ti) {
            t.li.hidden = boxes.indexOf(ti) >= 0;
            t.btn.setAttribute('aria-pressed', picked === ti ? 'true' : 'false');
            if (locked()) t.btn.setAttribute('aria-disabled', 'true');
          });
          boxEls.forEach(function (btn, bi) {
            var ti = boxes[bi];
            btn.textContent = ti == null ? '' : up(ti);
            btn.style.borderStyle = ti == null ? 'dashed' : 'solid';
            btn.style.borderColor = ti == null ? (holding ? 'var(--accent)' : 'var(--muted)') : 'var(--accent)';
            btn.style.background = ti == null && holding ? 'var(--soft)' : '';
            btn.style.boxShadow = ti == null && holding ? '0 0 0 3px var(--accent)' : '';
            btn.style.touchAction = ti == null ? 'manipulation' : 'none';
            btn.setAttribute('aria-label', ti == null ? ctx.fmt(L.word_scramble_box_empty, { n: bi + 1 }) : ctx.fmt(L.word_scramble_box_filled, { n: bi + 1, letter: up(ti) }));
            if (locked()) btn.setAttribute('aria-disabled', 'true');
          });
          checkBtn.setAttribute('aria-disabled', locked() || !answerText() ? 'true' : 'false');
          if (locked()) { clearBtn.setAttribute('aria-disabled', 'true'); showWord.setAttribute('aria-disabled', 'true'); }
        };
        var byKey = function (e) { return !e || e.detail === 0; };
        var onTile = function (ti, e) {
          if (locked() || boxes.indexOf(ti) >= 0) return;
          if (picked === ti) { picked = null; draw(); ctx.announce(ctx.fmt(L.word_scramble_dropped, { letter: up(ti) })); return; }
          picked = ti;
          draw();
          ctx.announce(ctx.fmt(L.word_scramble_picked, { letter: up(ti) }));
          var empty = boxes.indexOf(null);
          if (byKey(e)) boxEls[empty >= 0 ? empty : 0].focus();
        };
        var onBox = function (bi, e) {
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
          if (!byKey(e)) return;
          if (boxes.indexOf(null) < 0) { checkBtn.focus(); return; }
          for (var k = 0; k < tiles.length; k++) if (boxes.indexOf(k) < 0) { tiles[k].btn.focus(); return; }
        };
        var onCheck = function () {
          if (locked()) return;
          var answer = answerText().trim().toLowerCase();
          if (!answer) { ctx.announce(L.word_scramble_empty); return; }
          if (answer === lastSubmitted) { ctx.announce(L.word_scramble_same); return; }
          lastSubmitted = answer;
          // wsSpellSame: judged on the letters; "don't" is right with its apostrophe given.
          var outcome = ctx.answer(placedWord(), answer === own(target).trim().toLowerCase(), {
            correctText: ctx.fmt(L.word_scramble_correct, { word: written }),
            retryText: L.word_scramble_retry,
            missedText: ctx.fmt(L.word_scramble_missed, { word: written }),
          });
          // A first miss clears the answer and frees every tile (checkScramble).
          if (outcome === 'retry') { clearAll(); draw(); if (tiles[0]) tiles[0].btn.focus(); }
        };

        if (typeof ctx.keys === 'function') {
          ctx.keys(function (key) {
            if (locked()) return false;
            var k = String(key == null ? '' : key);
            if (k === 'Escape' || k === 'Esc') {
              if (picked == null) return false;
              var drop = picked;
              picked = null;
              draw();
              ctx.announce(ctx.fmt(L.word_scramble_dropped, { letter: up(drop) }));
              if (tiles[drop] && tiles[drop].btn) { try { tiles[drop].btn.focus(); } catch (_) {} }
              return true;
            }
            if (k === 'Backspace') {
              for (var bi = n - 1; bi >= 0; bi--) {
                if (boxes[bi] != null) {
                  var out = boxes[bi];
                  boxes[bi] = null; picked = null; lastSubmitted = null;
                  draw();
                  ctx.announce(ctx.fmt(L.word_scramble_removed, { letter: up(out), n: bi + 1 }));
                  return true;
                }
              }
              return false;
            }
            if (k === 'Enter') {
              var ae = doc && doc.activeElement;
              var onBtn = !!(ae && String(ae.tagName || '').toUpperCase() === 'BUTTON' && ae !== checkBtn && !ae.closest('[hidden]') && !ae.disabled && ae.getAttribute('aria-disabled') !== 'true');
              if (onBtn) return false;
              if (!answerText()) return false;
              onCheck();
              return true;
            }
            if (k.length === 1 && !fixed(k)) {
              var lc = k.toLowerCase();
              var emptyAt = boxes.indexOf(null);
              if (emptyAt < 0) return false;
              for (var ti = 0; ti < item.letters.length; ti++) {
                if (item.letters[ti] === lc && boxes.indexOf(ti) < 0) {
                  picked = null; boxes[emptyAt] = ti; lastSubmitted = null;
                  draw();
                  ctx.announce(ctx.fmt(L.word_scramble_placed, { letter: up(ti), n: emptyAt + 1 }));
                  return true;
                }
              }
            }
            return false;
          });
        }

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
                for (var ti = 0; ti < item.letters.length && hit < 0; ti++) if (used.indexOf(ti) < 0 && item.letters[ti] === target[places[i]]) hit = ti;
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
  CHECK_ADAPTERS["math_ccc"] = (function () {
    var module = { exports: {} };
    // Practice adapter: math facts by cover, copy, compare (math_ccc). A PRACTICE activity with
    // feedback and more than one try, not a check. It sits with the check adapters because those are
    // the ones the app's Word Sounds take-home dialog never lists; buildHtml runs it as practice
    // (lesson.mode is not 'probe'). Made by packet_math_practice_builder.js.
    // One card: the learner looks at the fact and its answer (7 × 8 = 56) and presses Cover it; the
    // answer is covered and typed from memory on the number pad; then it is uncovered and compared.
    // A wrong answer shows the fact again and is typed while looking, then it is covered and asked once
    // more from memory. Each answer from memory is one try (item.maxAttempts = 3); a right one ends the
    // card, so "first try" is right from memory at the first go. Each time the answer is typed while
    // looking counts as the support "copied".
    // render() is the same code as math_rehearsal.js render() apart from the label prefix
    // (tests/packets_math_practice.test.js compares them). The fact is written by math_computation.js
    // prepare(), so a fact reads the same here and in a check.
    module.exports = {
      id: 'math_ccc',
      title: 'Cover, copy, compare',
      labels: {
        math_ccc_intro: 'Look at each math fact and its answer. Cover it, type the answer from memory, then see if it matches.',
        math_ccc_look: 'Look at the fact and its answer. Say it to yourself.',
        math_ccc_cover: 'Cover it',
        math_ccc_type: 'Type the answer from memory.',
        math_ccc_label: '{fact}. Type the answer.',
        math_ccc_done: 'Done',
        math_ccc_keys: 'Number keys',
        math_ccc_delete: 'Delete',
        math_ccc_correct: 'Yes! {fact} = {answer}.',
        math_ccc_retry: 'Not quite. You typed {typed}. Look: {fact} = {answer}. Type it while you look.',
        math_ccc_copy: 'Type it while you look.',
        math_ccc_copy_label: '{fact} = {answer}. Type {answer}.',
        math_ccc_copy_wrong: 'Type {answer}, the number you see.',
        math_ccc_again: 'Now it is covered. Type it from memory.',
        math_ccc_missed: 'Here is the answer: {fact} = {answer}.',
      },
      // p: a fact as math_computation.js prepare() writes it ({ word: '7 × 8', answer: '56' }). Every
      // card of this activity starts with the fact and its answer shown.
      prepare: function (p) {
        p = p || {};
        var fact = String(p.word == null ? '' : p.word).replace(/\s+/g, ' ').trim();
        if (!fact || fact.length > 40 || fact.indexOf('=') >= 0) return { missing: ['a fact of 1 to 40 characters, with no = sign'] };
        if (p.answer == null || p.answer === '' || typeof p.answer === 'boolean' || !Number.isSafeInteger(Number(p.answer)) || Number(p.answer) < 0 || Number(p.answer) > 99999999) {
          return { missing: ['a whole-number answer of 0 or more'] };
        }
        var answer = String(Number(p.answer));
        return { item: { word: fact, answer: answer, target: answer, study: true, maxAttempts: 3 } };
      },
      render: function (item, ctx) {
        var L = ctx.L;
        var fact = String(item.word);
        var answer = String(item.answer);
        var tag = String(item.id || 'fact').replace(/[^a-z0-9-]/gi, '');
        // look: the fact and its answer. type: covered, typed from memory. copy: after a miss, the
        // answer shows and is typed while looking. done: the card is over.
        var phase = item.study ? 'look' : 'type';
        var copyMisses = 0;
        var outcome = false;
        var slot = ctx.el('span', { 'data-slot': '', style: 'display:inline-block;min-width:2.2em;padding:0 .25em;border:3px solid var(--line);border-radius:12px;text-align:center' });
        var prompt = ctx.el('p', { id: tag + '-fact', 'data-fact': '', style: 'font-size:2.2rem;font-size:clamp(1.8rem,9vw,2.6rem);font-weight:700;text-align:center;margin:8px 0 12px;font-variant-numeric:tabular-nums' }, [fact + ' = ', slot]);
        var say = ctx.el('p', { id: tag + '-say', 'data-say': '', style: 'text-align:center;font-weight:600;margin:0 0 8px' });
        var coverButton = ctx.el('button', { type: 'button', class: 'primary', 'data-cover': '', 'aria-describedby': tag + '-fact ' + tag + '-say', on: { click: function () {
          if (phase !== 'look' || ctx.isDone()) return;
          phase = 'type';
          // The recall is timed from here to the first answer from memory.
          if (ctx.lap) ctx.lap('recall', true);
          set('');
          draw();
          focusPad();
        } } }, [L.math_ccc_cover]);
        var pad = ctx.keypad({
          minus: false, inline: true, padAttr: true,
          keysLabel: L.math_ccc_keys, deleteLabel: L.math_ccc_delete, nextLabel: L.math_ccc_done,
          canPress: function () { return phase === 'type' || phase === 'copy'; },
          onChange: function (v) { if (phase === 'type') slot.textContent = v || '?'; },
          onNext: function () { submit(); },
        });
        var input = pad.input;
        var set = pad.set;
        var focusPad = pad.focus;
        var draw = function () {
          var shown = phase !== 'type';
          slot.textContent = shown ? answer : (input.value || '?');
          slot.style.borderStyle = shown ? 'solid' : 'dashed';
          slot.style.borderColor = phase === 'look' ? 'var(--accent)' : phase === 'copy' ? 'var(--warn)' : phase === 'done' ? (outcome ? 'var(--ok)' : 'var(--warn)') : 'var(--muted)';
          slot.style.background = phase === 'type' ? 'var(--soft)' : phase === 'copy' ? 'var(--warn-bg)' : phase === 'done' ? (outcome ? 'var(--ok-bg)' : 'var(--warn-bg)') : '';
          // Keep the visible problem readable to screen readers in every phase (only hidden when not rendered).
          prompt.removeAttribute('aria-hidden');
          coverButton.hidden = phase !== 'look';
          pad.node.hidden = phase === 'look' || phase === 'done';
          say.textContent = phase === 'look' ? L.math_ccc_look : phase === 'copy' ? L.math_ccc_copy
            : phase === 'type' ? (ctx.attempts() > 0 ? L.math_ccc_again : L.math_ccc_type) : '';
          input.setAttribute('aria-label', phase === 'copy' ? ctx.fmt(L.math_ccc_copy_label, { fact: fact, answer: answer }) : ctx.fmt(L.math_ccc_label, { fact: fact }));
        };
        var submit = function () {
          if (ctx.isDone()) return;
          var v = String(input.value || '');
          if (!/^[0-9]+$/.test(v)) return;
          if (phase === 'copy') {
            var copied = Number(v) === Number(answer);
            if (copied) ctx.support('copied');
            // Typed while looking: then covered and asked from memory. Three wrong copies go on to that too.
            if (copied || ++copyMisses >= 3) {
              phase = 'type';
              set('');
              draw();
              // The answer is covered again: the feedback line that showed it is cleared too.
              if (typeof ctx.feedback === 'function') ctx.feedback('');
              focusPad();
              ctx.announce(L.math_ccc_again);
            } else {
              set('');
              say.textContent = ctx.fmt(L.math_ccc_copy_wrong, { answer: answer });
              ctx.announce(say.textContent);
            }
            return;
          }
          if (phase !== 'type') return;
          if (ctx.lap && ctx.attempts() === 0) ctx.lap('recall');
          var right = Number(v) === Number(answer);
          var result = ctx.answer(v, right, {
            correctText: ctx.fmt(L.math_ccc_correct, { fact: fact, answer: answer }),
            retryText: ctx.fmt(L.math_ccc_retry, { typed: v, fact: fact, answer: answer }),
            missedText: ctx.fmt(L.math_ccc_missed, { fact: fact, answer: answer }),
          });
          if (result === 'retry') {
            phase = 'copy';
            copyMisses = 0;
            set('');
            draw();
            focusPad();
          }
        };
        set('');
        draw();
        ctx.root.appendChild(prompt);
        ctx.root.appendChild(say);
        ctx.root.appendChild(ctx.el('div', { class: 'row', style: 'justify-content:center' }, [coverButton]));
        ctx.root.appendChild(pad.node);
        // A card that starts covered (a known fact) is timed from being shown.
        if (phase === 'look') { if (!ctx.noFocus) { try { coverButton.focus(); } catch (_) {} } } else { if (ctx.lap && !ctx.isDone()) ctx.lap('recall', true); if (!ctx.noFocus) focusPad(); }
        return {
          // The card is over (right, or every try used, or reopened when done): the answer shows, uncovered.
          reveal: function (correct) {
            phase = 'done';
            outcome = correct === true;
            pad.lock();
            draw();
          },
        };
      },
      // The same rule as render(): the whole number typed is the answer. Only a check would call it.
      score: function (item, answer, response) {
        var typed = String(response == null ? '' : response);
        return { correct: /^[0-9]+$/.test(typed) && Number(typed) === Number(answer), digitsCorrect: null, digitsPossible: null };
      },
    };
    return module.exports;
  })();
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
        math_computation_remainder: 'Leave out the remainder.',
      },
      // p: { a, b, op } with op add, sub, mul or div (the answer is worked out
      // here; a given answer that disagrees is refused), or { display, answer }.
      // A division must be exact unless p.allowRemainder is true; then the answer
      // is the whole-number part, and the student is told to leave out the
      // remainder (item.remainder, on every division of such a check).
      // 2026-11-13: item.shown, when it differs from the plain text, is what the
      // screen shows: a teacher's own problem with the signs of the others (the
      // minus sign, times, divide), and a number of 10000 or more grouped in
      // threes with a narrow no-break space, the same in every language and on the
      // paper copy (packets-check.js). Worked out here, so the file carries no code
      // for it; the screen reader label has the number without the spaces. The
      // problem stays on one line (a long one gets a smaller size).
      prepare: function (p) {
        p = p || {};
        var whole = function (v) { return v != null && v !== '' && Number.isSafeInteger(Number(v)) && Math.abs(Number(v)) <= 99999999; };
        var grouped = function (t) { return t.replace(/\d{5,}/g, function (n) { return n.replace(/\B(?=(\d{3})+(?!\d))/g, String.fromCharCode(0x202F)); }); };
        if (p.a == null && p.b == null && p.display != null) {
          var display = String(p.display).replace(/\s+/g, ' ').trim();
          if (!display || display.length > 40) return { missing: ['a problem of 1 to 40 characters'] };
          if (!whole(p.answer)) return { missing: ['a whole-number answer'] };
          var own = { word: display, display: display, answer: String(Number(p.answer)) };
          var signs = display.replace(/(^|[\s(])[-\u2013\u2014](?=\s|\d|\()/g, '$1\u2212')
            .replace(/([\d)])\s*[-\u2013\u2014]\s*(?=[\d(])/g, '$1 \u2212 ')
            .replace(/([\d)])\s*[xX*\u00B7\u22C5]\s*(?=[\d(])/g, '$1 \u00D7 ')
            .replace(/([\d)])\s*\/\s*(?=[\d(])/g, '$1 \u00F7 ');
          // said: the label's text (the signs, the plain numbers).
          if (signs !== display) own.said = signs;
          if (grouped(signs) !== display) own.shown = grouped(signs);
          return { item: own };
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
        var item = { word: a + ' ' + symbol + ' ' + b, a: a, b: b, symbol: symbol, answer: String(answer) };
        if (grouped(item.word) !== item.word) item.shown = grouped(item.word) + ' =';
        if (p.op === 'div' && p.allowRemainder === true) item.remainder = true;
        return { item: item };
      },
      render: function (item, ctx) {
        var problem = item.display || item.a + ' ' + item.symbol + ' ' + item.b, shown = item.shown || (item.display ? problem : problem + ' ='), n = shown.length;
        var spoken = String(item.said || problem).split(String.fromCharCode(0x2212)).join('minus ')
          .split(String.fromCharCode(0xD7)).join('times').split(String.fromCharCode(0xF7)).join('divided by').replace(/\s+/g, ' ').trim();
        var note = item.remainder ? ' ' + ctx.L.math_computation_remainder : '';
        var pad = ctx.keypad({ label: ctx.fmt(ctx.L.math_computation_label, { problem: spoken }) + note, onNext: function (value) { ctx.answer(value); } });
        ctx.root.appendChild(ctx.el('p', { class: 'prompt', 'aria-hidden': 'true', style: 'white-space:nowrap;font-size:min(2.6rem,' + (137 / n | 0) + 'vw,' + (1130 / n | 0) + 'px)', text: shown }));
        if (note) ctx.root.appendChild(ctx.el('p', { class: 'muted', style: 'text-align:center', text: note }));
        ctx.root.appendChild(pad.node);
        if (!ctx.noFocus) pad.focus();
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
  CHECK_ADAPTERS["math_rehearsal"] = (function () {
    var module = { exports: {} };
    // Practice adapter: math facts by rehearsal with known facts (math_rehearsal), modelled on
    // incremental rehearsal. A PRACTICE activity with feedback and more than one try, not a check. It
    // sits with the check adapters because those are the ones the app's Word Sounds take-home dialog
    // never lists; buildHtml runs it as practice (lesson.mode is not 'probe').
    // The plan of cards (a few new facts folded in among facts the learner knows) is made by
    // packet_math_practice_builder.js (planMathPractice); this file draws one card. A card of a new
    // fact that is shown for the first time starts with the fact and its answer (study); every other
    // card asks at once. A wrong answer is shown with its answer and typed while looking, then covered
    // and asked again from memory on the same card. Each answer from memory is one try
    // (item.maxAttempts = 3), and each time the answer is typed while looking counts as the support
    // "copied".
    // render() is the same code as math_ccc.js render() apart from the label prefix
    // (tests/packets_math_practice.test.js compares them).
    module.exports = {
      id: 'math_rehearsal',
      title: 'Fact rehearsal',
      labels: {
        math_rehearsal_intro: 'Type the answer to each math fact. Most are facts you know. When a new fact comes, look at it first.',
        math_rehearsal_look: 'A new fact. Look at it and its answer. Say it to yourself.',
        math_rehearsal_cover: 'Cover it',
        math_rehearsal_type: 'Type the answer.',
        math_rehearsal_label: '{fact}. Type the answer.',
        math_rehearsal_done: 'Done',
        math_rehearsal_keys: 'Number keys',
        math_rehearsal_delete: 'Delete',
        math_rehearsal_correct: 'Yes! {fact} = {answer}.',
        math_rehearsal_retry: 'Not quite. You typed {typed}. Look: {fact} = {answer}. Type it while you look.',
        math_rehearsal_copy: 'Type it while you look.',
        math_rehearsal_copy_label: '{fact} = {answer}. Type {answer}.',
        math_rehearsal_copy_wrong: 'Type {answer}, the number you see.',
        math_rehearsal_again: 'Now it is covered. Type it from memory.',
        math_rehearsal_missed: 'Here is the answer: {fact} = {answer}.',
      },
      // p: a fact as math_computation.js prepare() writes it ({ word: '7 × 8', answer: '56' }), with
      // role 'new' or 'known' and study: true on the first card of a new fact.
      prepare: function (p) {
        p = p || {};
        var fact = String(p.word == null ? '' : p.word).replace(/\s+/g, ' ').trim();
        if (!fact || fact.length > 40 || fact.indexOf('=') >= 0) return { missing: ['a fact of 1 to 40 characters, with no = sign'] };
        if (p.answer == null || p.answer === '' || typeof p.answer === 'boolean' || !Number.isSafeInteger(Number(p.answer)) || Number(p.answer) < 0 || Number(p.answer) > 99999999) {
          return { missing: ['a whole-number answer of 0 or more'] };
        }
        if (p.role !== 'new' && p.role !== 'known') return { missing: ['a role: new or known'] };
        if (p.study === true && p.role !== 'new') return { missing: ['a known fact that is asked, not shown first'] };
        var answer = String(Number(p.answer));
        return { item: { word: fact, answer: answer, target: answer, role: p.role, study: p.study === true, maxAttempts: 3 } };
      },
      render: function (item, ctx) {
        var L = ctx.L;
        var fact = String(item.word);
        var answer = String(item.answer);
        var tag = String(item.id || 'fact').replace(/[^a-z0-9-]/gi, '');
        // look: the fact and its answer. type: covered, typed from memory. copy: after a miss, the
        // answer shows and is typed while looking. done: the card is over.
        var phase = item.study ? 'look' : 'type';
        var copyMisses = 0;
        var outcome = false;
        var slot = ctx.el('span', { 'data-slot': '', style: 'display:inline-block;min-width:2.2em;padding:0 .25em;border:3px solid var(--line);border-radius:12px;text-align:center' });
        var prompt = ctx.el('p', { id: tag + '-fact', 'data-fact': '', style: 'font-size:2.2rem;font-size:clamp(1.8rem,9vw,2.6rem);font-weight:700;text-align:center;margin:8px 0 12px;font-variant-numeric:tabular-nums' }, [fact + ' = ', slot]);
        var say = ctx.el('p', { id: tag + '-say', 'data-say': '', style: 'text-align:center;font-weight:600;margin:0 0 8px' });
        var coverButton = ctx.el('button', { type: 'button', class: 'primary', 'data-cover': '', 'aria-describedby': tag + '-fact ' + tag + '-say', on: { click: function () {
          if (phase !== 'look' || ctx.isDone()) return;
          phase = 'type';
          // The recall is timed from here to the first answer from memory.
          if (ctx.lap) ctx.lap('recall', true);
          set('');
          draw();
          focusPad();
        } } }, [L.math_rehearsal_cover]);
        var pad = ctx.keypad({
          minus: false, inline: true, padAttr: true,
          keysLabel: L.math_rehearsal_keys, deleteLabel: L.math_rehearsal_delete, nextLabel: L.math_rehearsal_done,
          canPress: function () { return phase === 'type' || phase === 'copy'; },
          onChange: function (v) { if (phase === 'type') slot.textContent = v || '?'; },
          onNext: function () { submit(); },
        });
        var input = pad.input;
        var set = pad.set;
        var focusPad = pad.focus;
        var draw = function () {
          var shown = phase !== 'type';
          slot.textContent = shown ? answer : (input.value || '?');
          slot.style.borderStyle = shown ? 'solid' : 'dashed';
          slot.style.borderColor = phase === 'look' ? 'var(--accent)' : phase === 'copy' ? 'var(--warn)' : phase === 'done' ? (outcome ? 'var(--ok)' : 'var(--warn)') : 'var(--muted)';
          slot.style.background = phase === 'type' ? 'var(--soft)' : phase === 'copy' ? 'var(--warn-bg)' : phase === 'done' ? (outcome ? 'var(--ok-bg)' : 'var(--warn-bg)') : '';
          // Keep the visible problem readable to screen readers in every phase (only hidden when not rendered).
          prompt.removeAttribute('aria-hidden');
          coverButton.hidden = phase !== 'look';
          pad.node.hidden = phase === 'look' || phase === 'done';
          say.textContent = phase === 'look' ? L.math_rehearsal_look : phase === 'copy' ? L.math_rehearsal_copy
            : phase === 'type' ? (ctx.attempts() > 0 ? L.math_rehearsal_again : L.math_rehearsal_type) : '';
          input.setAttribute('aria-label', phase === 'copy' ? ctx.fmt(L.math_rehearsal_copy_label, { fact: fact, answer: answer }) : ctx.fmt(L.math_rehearsal_label, { fact: fact }));
        };
        var submit = function () {
          if (ctx.isDone()) return;
          var v = String(input.value || '');
          if (!/^[0-9]+$/.test(v)) return;
          if (phase === 'copy') {
            var copied = Number(v) === Number(answer);
            if (copied) ctx.support('copied');
            // Typed while looking: then covered and asked from memory. Three wrong copies go on to that too.
            if (copied || ++copyMisses >= 3) {
              phase = 'type';
              set('');
              draw();
              // The answer is covered again: the feedback line that showed it is cleared too.
              if (typeof ctx.feedback === 'function') ctx.feedback('');
              focusPad();
              ctx.announce(L.math_rehearsal_again);
            } else {
              set('');
              say.textContent = ctx.fmt(L.math_rehearsal_copy_wrong, { answer: answer });
              ctx.announce(say.textContent);
            }
            return;
          }
          if (phase !== 'type') return;
          if (ctx.lap && ctx.attempts() === 0) ctx.lap('recall');
          var right = Number(v) === Number(answer);
          var result = ctx.answer(v, right, {
            correctText: ctx.fmt(L.math_rehearsal_correct, { fact: fact, answer: answer }),
            retryText: ctx.fmt(L.math_rehearsal_retry, { typed: v, fact: fact, answer: answer }),
            missedText: ctx.fmt(L.math_rehearsal_missed, { fact: fact, answer: answer }),
          });
          if (result === 'retry') {
            phase = 'copy';
            copyMisses = 0;
            set('');
            draw();
            focusPad();
          }
        };
        set('');
        draw();
        ctx.root.appendChild(prompt);
        ctx.root.appendChild(say);
        ctx.root.appendChild(ctx.el('div', { class: 'row', style: 'justify-content:center' }, [coverButton]));
        ctx.root.appendChild(pad.node);
        // A card that starts covered (a known fact) is timed from being shown.
        if (phase === 'look') { if (!ctx.noFocus) { try { coverButton.focus(); } catch (_) {} } } else { if (ctx.lap && !ctx.isDone()) ctx.lap('recall', true); if (!ctx.noFocus) focusPad(); }
        return {
          // The card is over (right, or every try used, or reopened when done): the answer shows, uncovered.
          reveal: function (correct) {
            phase = 'done';
            outcome = correct === true;
            pad.lock();
            draw();
          },
        };
      },
      // The same rule as render(): the whole number typed is the answer. Only a check would call it.
      score: function (item, answer, response) {
        var typed = String(response == null ? '' : response);
        return { correct: /^[0-9]+$/.test(typed) && Number(typed) === Number(answer), digitsCorrect: null, digitsPossible: null };
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
        missing_number_minus: 'minus',
        missing_number_times: 'times',
        missing_number_divided: 'divided by',
      },
      // p: { display: "__ + 8 = 14", answer: 6 } as in the form bank.
      // 2026-11-13: item.shown, when it differs from the form's text, is what the
      // screen shows: the signs as Math Fluency shows them (the minus sign, times,
      // divide, never a hyphen or an x), and a number of 10000 or more grouped in
      // threes with a narrow no-break space (as math_computation.js and the paper
      // copy). A screen reader hears the signs as words (the labels minus, times,
      // divided). The problem stays on one line (a long one gets a smaller size).
      prepare: function (p) {
        p = p || {};
        var display = String(p.display == null ? '' : p.display).replace(/\s+/g, ' ').trim();
        if (!display || display.length > 40 || (display.match(/_{2,}/g) || []).length !== 1) return { missing: ['a problem with one blank written as __'] };
        if (p.answer == null || p.answer === '' || !Number.isSafeInteger(Number(p.answer)) || Math.abs(Number(p.answer)) > 99999999) return { missing: ['a whole-number answer'] };
        var item = { word: display, display: display, answer: String(Number(p.answer)) };
        var shown = display.replace(/(^|\s)-(?=\s|\d)/g, function (all, lead) { return lead + String.fromCharCode(0x2212); })
          .replace(/([\d_]) [xX*] (?=[\d_])/g, function (all, lead) { return lead + ' ' + String.fromCharCode(0xD7) + ' '; }).replace(/([\d_]) \/ (?=[\d_])/g, function (all, lead) { return lead + ' ' + String.fromCharCode(0xF7) + ' '; })
          .replace(/\d{5,}/g, function (n) { return n.replace(/\B(?=(\d{3})+(?!\d))/g, String.fromCharCode(0x202F)); });
        if (shown !== display) item.shown = shown;
        return { item: item };
      },
      render: function (item, ctx) {
        var L = ctx.L, shown = item.shown || item.display, n = shown.length + 2;
        var said = shown.split(String.fromCharCode(0x202F)).join('').replace(/_{2,}/, L.missing_number_blank).split(String.fromCharCode(0x2212)).join(L.missing_number_minus + ' ')
          .split(String.fromCharCode(0xD7)).join(L.missing_number_times).split(String.fromCharCode(0xF7)).join(L.missing_number_divided).replace(/\s+/g, ' ');
        // The blank shows what is being typed.
        var blank = ctx.el('span', { class: 'blank', text: '?' });
        var pieces = shown.split(/(_{2,})/).filter(function (part) { return part !== ''; }).map(function (part) { return /^_{2,}$/.test(part) ? blank : part; });
        var pad = ctx.keypad({
          label: ctx.fmt(L.missing_number_label, { problem: said }),
          onChange: function (value) { blank.textContent = value || '?'; },
          onNext: function (value) { ctx.answer(value); },
        });
        ctx.root.appendChild(ctx.el('p', { class: 'letters', style: 'text-align:center', text: L.missing_number_question }));
        ctx.root.appendChild(ctx.el('p', { class: 'prompt', 'aria-hidden': 'true', style: 'white-space:nowrap;font-size:min(2.6rem,' + (137 / n | 0) + 'vw,' + (1130 / n | 0) + 'px)' }, pieces));
        ctx.root.appendChild(pad.node);
        if (!ctx.noFocus) pad.focus();
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
        var whole = function (v) { return (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) && Number.isSafeInteger(Number(v)) && Math.abs(Number(v)) <= 99999999; };
        if (!whole(p.left) || !whole(p.right)) return { missing: ['two whole numbers'] };
        var left = Number(p.left), right = Number(p.right);
        if (left === right) return { missing: ['two different numbers'] };
        var bigger = Math.max(left, right);
        if (p.answer != null && (!whole(p.answer) || Number(p.answer) !== bigger)) return { missing: ['an answer that is the bigger number'] };
        return { item: { word: left + ' or ' + right, left: left, right: right, answer: String(bigger) } };
      },
      render: function (item, ctx) {
        var buttons = [];
        var qId = 'qd-q-' + String(item && item.id || '0').replace(/[^A-Za-z0-9_-]/g, '');
        var make = function (value) {
          var b = ctx.el('button', { type: 'button', 'data-choice': String(value), on: { click: function () { if (ctx.isDone() || b.getAttribute('aria-disabled') === 'true') return; ctx.answer(String(value)); } }, text: String(value) });
          buttons.push(b);
          return ctx.el('li', {}, [b]);
        };
        ctx.root.appendChild(ctx.el('p', { id: qId, class: 'letters', style: 'text-align:center', text: ctx.L.quantity_discrimination_question }));
        ctx.root.appendChild(ctx.el('ul', { class: 'pair', 'aria-labelledby': qId }, [make(item.left), make(item.right)]));
        // Keys 1 and 2 pick the first and the second number; Left/Right arrows move focus without submitting.
        ctx.keys(function (key) {
          if (ctx.isDone()) return false;
          if (key === 'ArrowLeft') { if (buttons[0]) buttons[0].focus(); return true; }
          if (key === 'ArrowRight') { if (buttons[1]) buttons[1].focus(); return true; }
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
  CHECK_ADAPTERS["read_along"] = (function () {
    var module = { exports: {} };
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
    return module.exports;
  })();
  CHECK_ADAPTERS["symbol_runner"] = (function () {
    var module = { exports: {} };
    // Practice and check adapter: Rapid symbol, letter, digit, and subitizing trainer (symbol_runner).
    // Supports Direct response mode and Aim and lock-on challenge mode (hover or ArrowLeft/ArrowRight
    // onto the target lane before responding), plus incremental rehearsal study cards and cue pictures.
    module.exports = {
      id: 'symbol_runner',
      title: 'Symbol runner',
      labels: {
        symbol_runner_intro: 'Read or name each symbol shown on the lane. Aim first if lock-on mode is active.',
        symbol_runner_study: 'A new symbol to learn. Look closely at it, then choose Cover it.',
        symbol_runner_cover: 'Cover it',
        symbol_runner_direct: 'Choose the matching key or type the answer.',
        symbol_runner_lockon_wait: 'Lock onto lane {n} by tapping, hovering over it, or using Left and Right arrows.',
        symbol_runner_lockon_ready: 'Target locked on. Now choose or type the answer.',
        symbol_runner_lane_group: 'Three-lane target track',
        symbol_runner_lane: 'Lane {n}',
        symbol_runner_target_lane: 'Target in lane {n}: {word}',
        symbol_runner_hear: 'Hear symbol',
        symbol_runner_picture_alt: 'Picture cue for {word}',
        symbol_runner_input_label: 'Type your answer',
        symbol_runner_keys: 'Response choices',
        symbol_runner_done: 'Check',
        symbol_runner_correct: 'Yes. {word} matches {answer}.',
        symbol_runner_retry: 'Not quite. Look at {word} and try {answer} once more.',
        symbol_runner_missed: 'Here is the answer for {word}: {answer}.',
      },
      prepare: function (p) {
        p = p || {};
        var word = String(p.word == null ? '' : p.word).replace(/\s+/g, ' ').trim();
        if (!word || word.length > 24) return { missing: ['a symbol prompt of 1 to 24 characters'] };
        var answer = String(p.answer == null ? '' : p.answer).replace(/\s+/g, ' ').trim().toLowerCase();
        if (!answer || answer.length > 24) return { missing: ['an answer of 1 to 24 characters'] };
        var role = p.role === 'new' || p.role === 'known' ? p.role : '';
        var study = p.study === true && role !== 'known';
        var laneNum = Number(p.lane);
        var lane = laneNum === 0 || laneNum === 1 || laneNum === 2 ? laneNum : 1;
        var control = p.control === 'lockon' ? 'lockon' : 'direct';
        var dotsNum = Number(p.dots);
        var dots = Number.isInteger(dotsNum) && dotsNum >= 1 && dotsNum <= 9 ? dotsNum : 0;
        var rawChoices = Array.isArray(p.choices) ? p.choices : [answer];
        var choices = [];
        var seen = {};
        for (var i = 0; i < rawChoices.length && choices.length < 6; i++) {
          var c = String(rawChoices[i] == null ? '' : rawChoices[i]).replace(/\s+/g, ' ').trim();
          var k = c.toLowerCase();
          if (!c || c.length > 24 || seen[k]) continue;
          seen[k] = true;
          choices.push(c);
        }
        if (!seen[answer]) {
          if (choices.length >= 6) choices.pop();
          choices.push(answer);
        }
        var image = typeof p.image === 'string' && /^[a-z0-9_-]{1,40}$/i.test(p.image) ? p.image : '';
        var audio = typeof p.audio === 'string' && /^[a-z0-9_-]{1,40}$/i.test(p.audio) ? p.audio : '';
        var mode = typeof p.mode === 'string' ? p.mode.replace(/[^a-z0-9_-]/gi, '').slice(0, 24) : '';
        var maxAttempts = Number(p.maxAttempts);
        if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5) maxAttempts = 3;
        var prompt = typeof p.prompt === 'string' ? p.prompt.replace(/\s+/g, ' ').trim().slice(0, 80) : '';
        var flankerCenter = Number.isInteger(Number(p.flankerCenter)) && Number(p.flankerCenter) >= 0 && Number(p.flankerCenter) < word.length ? Number(p.flankerCenter) : -1;
        var stroopInk = typeof p.stroopInk === 'string' && /^#[0-9a-f]{6}$/i.test(p.stroopInk.trim()) ? p.stroopInk.trim() : '';
        var allowedShapes = { '●': 1, '▲': 1, '■': 1, '★': 1 };
        var stroopShape = typeof p.stroopShape === 'string' && allowedShapes[p.stroopShape.trim()] ? p.stroopShape.trim() : '';
        var sizePair = null;
        if (p.sizePair && typeof p.sizePair === 'object') {
          var spL = String(p.sizePair.left == null ? '' : p.sizePair.left).replace(/\s+/g, ' ').trim().slice(0, 8);
          var spR = String(p.sizePair.right == null ? '' : p.sizePair.right).replace(/\s+/g, ' ').trim().slice(0, 8);
          if (spL && spR) {
            var ls = Math.max(0.5, Math.min(2.0, Number(p.sizePair.leftScale) || 1));
            var rs = Math.max(0.5, Math.min(2.0, Number(p.sizePair.rightScale) || 1));
            sizePair = { left: spL, right: spR, leftScale: ls, rightScale: rs, pick: p.sizePair.pick === 'size' ? 'size' : 'value' };
          }
        }
        var congruent = typeof p.congruent === 'boolean' ? p.congruent : null;
        return {
          item: {
            word: word,
            answer: answer,
            target: answer,
            role: role,
            study: study,
            lane: lane,
            control: control,
            dots: dots,
            choices: choices,
            image: image,
            audio: audio,
            mode: mode,
            maxAttempts: maxAttempts,
            prompt: prompt,
            flankerCenter: flankerCenter,
            stroopInk: stroopInk,
            stroopShape: stroopShape,
            sizePair: sizePair,
            congruent: congruent,
          },
        };
      },
      render: function (item, ctx) {
        var L = ctx.L;
        var phase = item.study ? 'study' : 'play';
        var isLockOn = item.control === 'lockon';
        var aimLane = isLockOn ? (item.lane === 1 ? 0 : 1) : item.lane;
        var lockedOn = !isLockOn;
        var tried = {};
        var outcome = null;

        var imgSrc = item.image ? ctx.image(item.image) : null;
        var hasSafeImg = typeof imgSrc === 'string' && /^data:image\//i.test(imgSrc);

        var say = ctx.el('p', {
          'data-sr-say': '',
          style: 'text-align:center;font-weight:700;margin:0 0 10px',
        });

        var coverButton = ctx.el('button', {
          type: 'button',
          class: 'primary',
          'data-sr-cover': '',
          style: 'display:block;margin:8px auto',
          on: {
            click: function () {
              if (phase !== 'study' || ctx.isDone()) return;
              phase = 'play';
              redraw();
              try {
                if (isLockOn && laneButtons[aimLane]) { laneButtons[aimLane].focus(); }
                else {
                  var nextFocus = ctx.root.querySelector('[data-lane]:not([disabled]), [data-sr-choice]:not([disabled]), input:not([disabled]):not([hidden]), button:not([disabled]):not([hidden])');
                  if (nextFocus && typeof nextFocus.focus === 'function') nextFocus.focus();
                }
              } catch (_) {}
            },
          },
        }, [L.symbol_runner_cover]);

        var hearButton = item.audio
          ? ctx.el('button', {
            type: 'button',
            'data-sr-hear': '',
            style: 'display:inline-flex;align-items:center;gap:6px;margin:0 auto 10px',
            on: {
              click: function () {
                if (typeof ctx.play === 'function') ctx.play(item.audio);
                ctx.support('audio');
              },
            },
          }, [L.symbol_runner_hear])
          : null;

        function buildDotGrid(count) {
          var wrap = ctx.el('span', {
            'data-sr-dots': String(count),
            'aria-hidden': 'true',
            style: 'display:inline-grid;grid-template-columns:repeat(3,14px);gap:6px;padding:6px;vertical-align:middle',
          });
          var layouts = {
            1: [4],
            2: [0, 8],
            3: [0, 4, 8],
            4: [0, 2, 6, 8],
            5: [0, 2, 4, 6, 8],
            6: [0, 2, 3, 5, 6, 8],
            7: [0, 2, 3, 4, 5, 6, 8],
            8: [0, 1, 2, 3, 5, 6, 7, 8],
            9: [0, 1, 2, 3, 4, 5, 6, 7, 8],
          };
          var active = layouts[count] || layouts[1];
          for (var d = 0; d < 9; d++) {
            var on = active.indexOf(d) >= 0;
            wrap.appendChild(ctx.el('span', {
              style: 'width:12px;height:12px;border-radius:50%;display:block;' + (on ? 'background:currentColor;' : 'opacity:0;'),
            }));
          }
          return wrap;
        }

        var laneTrack = ctx.el('div', {
          'data-sr-lanes': '',
          'data-control': item.control,
          'data-locked': String(!lockedOn),
          role: 'group',
          'aria-label': L.symbol_runner_lane_group,
          style: 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;max-width:var(--sr-lane,460px);width:100%;box-sizing:border-box;margin:0 auto 14px;padding:8px;border-radius:16px;background:var(--soft);border:2px solid var(--muted)',
        });

        var laneButtons = [];
        function lockToLane(idx) {
          if (phase !== 'play' || ctx.isDone()) return;
          aimLane = idx;
          if (isLockOn && idx === item.lane && !lockedOn) {
            lockedOn = true;
            ctx.support('lockon');
            ctx.announce(L.symbol_runner_lockon_ready);
          }
          redraw();
        }

        for (var i = 0; i < 3; i++) {
          (function (laneIndex) {
            var isTarget = laneIndex === item.lane;
            var children = [];
            children.push(ctx.el('span', {
              style: 'font-size:0.75rem;font-weight:700;opacity:0.8',
              text: ctx.fmt(L.symbol_runner_lane, { n: laneIndex + 1 }),
            }));
            if (isTarget) {
              if (item.dots > 0 && item.mode === 'quantity_stroop') {
                var qWrap = ctx.el('div', {
                  style: 'position:relative;display:inline-flex;align-items:center;justify-content:center;padding:4px',
                });
                qWrap.appendChild(ctx.el('span', {
                  'aria-hidden': 'true',
                  style: 'position:absolute;font-size:2.6rem;font-weight:900;opacity:0.42;color:var(--warn);pointer-events:none',
                  text: item.word,
                }));
                qWrap.appendChild(buildDotGrid(item.dots));
                children.push(qWrap);
              } else if (item.dots > 0) {
                children.push(buildDotGrid(item.dots));
              } else if (item.sizePair) {
                children.push(ctx.el('div', {
                  'data-sr-symbol': item.word,
                  style: 'display:flex;align-items:baseline;justify-content:center;gap:clamp(4px,2vw,12px);line-height:1.1;margin:4px 0',
                }, [
                  ctx.el('span', { style: 'font-weight:900;font-size:clamp(' + (1.0 * item.sizePair.leftScale).toFixed(2) + 'rem,' + (4.2 * item.sizePair.leftScale).toFixed(2) + 'vw,' + (1.45 * item.sizePair.leftScale).toFixed(2) + 'rem)', text: item.sizePair.left }),
                  ctx.el('span', { 'aria-hidden': 'true', style: 'opacity:0.4;font-size:clamp(0.8rem,2.5vw,1rem)', text: '|' }),
                  ctx.el('span', { style: 'font-weight:900;font-size:clamp(' + (1.0 * item.sizePair.rightScale).toFixed(2) + 'rem,' + (4.2 * item.sizePair.rightScale).toFixed(2) + 'vw,' + (1.45 * item.sizePair.rightScale).toFixed(2) + 'rem)', text: item.sizePair.right }),
                ]));
              } else if (item.stroopInk) {
                var badgeChildren = [];
                if (item.stroopShape) {
                  badgeChildren.push(ctx.el('span', { 'aria-hidden': 'true', style: 'margin-inline-end:6px', text: item.stroopShape }));
                }
                badgeChildren.push(ctx.el('span', { text: item.word }));
                children.push(ctx.el('span', {
                  'data-sr-symbol': item.word,
                  // A fixed white card in every theme (and with forced colors), so the ink is seen as it was made.
                  style: 'display:inline-block;max-width:100%;font-size:clamp(1.05rem,4.8vw,1.7rem);font-weight:900;line-height:1.1;margin:4px 0;padding:6px clamp(6px,2.5vw,14px);border-radius:10px;border:2px solid #6b7280;background:#ffffff;forced-color-adjust:none;color:' + item.stroopInk,
                }, badgeChildren));
              } else if (item.flankerCenter >= 0) {
                var chars = item.word.split('');
                var fNodes = chars.map(function (ch, idx) {
                  return idx === item.flankerCenter
                    ? ctx.el('span', { style: 'text-decoration:underline;font-weight:900;padding:0 2px', text: ch })
                    : ctx.el('span', { text: ch });
                });
                children.push(ctx.el('span', {
                  'data-sr-symbol': item.word,
                  style: 'font-size:clamp(1.05rem,5vw,1.8rem);font-weight:800;line-height:1.1;margin:4px 0;letter-spacing:clamp(0.02em,0.8vw,0.08em)',
                }, fNodes));
              } else {
                children.push(ctx.el('span', {
                  'data-sr-symbol': item.word,
                  style: 'font-size:clamp(1.25rem,6.5vw,2.4rem);font-weight:900;line-height:1.1;margin:4px 0;max-width:100%;overflow-wrap:anywhere',
                  text: item.word,
                }));
              }
              if (hasSafeImg) {
                children.push(ctx.el('img', {
                  src: imgSrc,
                  alt: ctx.fmt(L.symbol_runner_picture_alt, { word: item.word }),
                  style: 'width:52px;height:52px;object-fit:contain;margin-top:4px;border-radius:8px;background:#fff;padding:2px',
                }));
              }
            } else {
              children.push(ctx.el('span', { 'aria-hidden': 'true', style: 'font-size:1.5rem;opacity:0.3', text: '·' }));
            }
            var lb = ctx.el('button', {
              type: 'button',
              'data-lane': String(laneIndex),
              'data-sr-target': isTarget ? 'true' : 'false',
              // 2026-11-18: on dot, ink and size cards the card's word is the answer ("5 dots") or the distractor (the
              // digit, the color word): their lanes are named by number only.
              'aria-label': isTarget && !(item.dots > 0 || item.stroopInk || item.sizePair)
                ? ctx.fmt(L.symbol_runner_target_lane, { n: laneIndex + 1, word: item.word })
                : ctx.fmt(L.symbol_runner_lane, { n: laneIndex + 1 }),
              style: 'display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:112px;min-width:0;width:100%;box-sizing:border-box;padding:8px 4px;border-radius:12px;border:3px solid var(--muted);background:var(--bg)',
              on: {
                mouseenter: function () { if (isTarget) lockToLane(laneIndex); else { aimLane = laneIndex; redraw(); } },
                pointerenter: function () { if (isTarget) lockToLane(laneIndex); },
                click: function () { lockToLane(laneIndex); },
                keydown: function (e) {
                  if (e.key === 'ArrowLeft') { e.preventDefault(); var p1 = Math.max(0, aimLane - 1); aimLane = p1; if (laneButtons[p1]) laneButtons[p1].focus(); lockToLane(p1); }
                  else if (e.key === 'ArrowRight') { e.preventDefault(); var p2 = Math.min(2, aimLane + 1); aimLane = p2; if (laneButtons[p2]) laneButtons[p2].focus(); lockToLane(p2); }
                  else if ((e.key === 'Enter' || e.key === ' ') && isTarget) { e.preventDefault(); lockToLane(laneIndex); }
                },
              },
            }, children);
            laneButtons.push(lb);
            laneTrack.appendChild(lb);
          })(i);
        }

        var numericChoices = item.choices.length > 0 && item.choices.every(function (c) { return /^[0-9]+$/.test(String(c).trim()); });
        var textInput = ctx.el('input', {
          type: 'text',
          autocomplete: 'off',
          autocapitalize: 'off',
          spellcheck: 'false',
          'data-sr-input': '',
          'aria-label': L.symbol_runner_input_label,
          style: 'max-width:160px;text-align:center;font-size:1.3rem;font-weight:700',
        });
        if (numericChoices) textInput.setAttribute('inputmode', 'numeric');

        var submitBtn = ctx.el('button', {
          type: 'button',
          class: 'primary',
          'data-sr-submit': '',
          on: {
            click: function () {
              submitAnswer(textInput.value);
            },
          },
        }, [L.symbol_runner_done]);

        textInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && !e.repeat && !e.isComposing && e.keyCode !== 229) {
            e.preventDefault();
            submitAnswer(textInput.value);
          }
        });
        // Practice mode: auto-submit an exact typed match when no longer choice shares it as a prefix.
        textInput.addEventListener('input', function () {
          if (ctx.check || phase !== 'play' || !lockedOn || ctx.isDone() || sealedPick) return;
          var raw = String(textInput.value || '').replace(/\s+/g, ' ').trim().toLowerCase();
          if (!raw || raw !== item.answer) return;
          var longer = item.choices.some(function (c) {
            var cl = String(c == null ? '' : c).trim().toLowerCase();
            return cl.length > raw.length && cl.indexOf(raw) === 0;
          });
          if (!longer) submitAnswer(raw);
        });

        var typedRow = ctx.el('div', {
          class: 'row',
          style: 'justify-content:center;gap:8px;margin-bottom:12px',
        }, [textInput, submitBtn]);

        var choiceGroup = ctx.el('div', {
          role: 'group',
          'aria-label': L.symbol_runner_keys,
          style: 'display:flex;flex-wrap:wrap;justify-content:center;gap:10px;max-width:var(--sr-keys,440px);margin:0 auto',
        });

        var shapeMap = { red: '●', blue: '▲', green: '■', gold: '★' };
        var choiceButtons = item.choices.map(function (c, cIdx) {
          var shapeCue = item.stroopInk ? (shapeMap[String(c).toLowerCase()] || '') : '';
          var labelChildren = [];
          if (ctx.check && !numericChoices) {
            labelChildren.push(ctx.el('span', { 'aria-hidden': 'true', style: 'font-size:0.85rem;opacity:0.75;margin-inline-end:6px', text: String(cIdx + 1) }));
          }
          labelChildren.push(ctx.el('span', { text: shapeCue ? (shapeCue + ' ' + c) : c }));
          var cb = ctx.el('button', {
            type: 'button',
            'data-sr-choice': c,
            style: 'min-width:64px;min-height:52px;font-size:1.35rem;font-weight:800;padding:8px 16px;border-radius:12px',
            on: {
              click: function () {
                submitAnswer(c);
              },
            },
          }, labelChildren);
          choiceGroup.appendChild(cb);
          return { val: c, node: cb };
        });

        var padWrap = ctx.el('div', { 'data-sr-pad': '' }, [typedRow, choiceGroup]);
        var sealedPick = false;
        var revealAnswer = null;

        function submitAnswer(raw) {
          if (phase !== 'play' || !lockedOn || ctx.isDone() || sealedPick) return;
          var clean = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim().toLowerCase();
          if (!clean) return;
          if (ctx.check) {
            var said = ctx.answer(clean);
            if (said !== 'ignored' && said !== 'time_up') {
              sealedPick = true;
              redraw();
            }
            return;
          }
          var right = clean === item.answer;
          var res = ctx.answer(clean, right, {
            correctText: ctx.fmt(L.symbol_runner_correct, { word: item.word, answer: item.answer }),
            retryText: ctx.fmt(L.symbol_runner_retry, { word: item.word, answer: item.answer }),
            missedText: ctx.fmt(L.symbol_runner_missed, { word: item.word, answer: item.answer }),
          });
          if (res === 'retry') {
            tried[clean] = true;
            textInput.value = '';
            redraw();
            if (!ctx.check && item.audio && !item.stroopInk && typeof ctx.play === 'function') {
              ctx.play(item.audio);
            }
          }
        }

        function redraw() {
          laneTrack.setAttribute('data-locked', String(!lockedOn));
          for (var j = 0; j < laneButtons.length; j++) {
            var btn = laneButtons[j];
            var isTarget = j === item.lane;
            var isAimed = j === aimLane;
            btn.style.borderColor = phase === 'done' && isTarget
              ? (outcome ? 'var(--ok)' : 'var(--warn)')
              : isTarget && lockedOn
                ? 'var(--accent)'
                : isAimed
                  ? 'var(--warn)'
                  : 'var(--muted)';
            // A color item's lanes are not tinted: a green lane behind a color task is itself a color.
            btn.style.background = isTarget && lockedOn && !item.stroopInk ? 'var(--ok-bg)' : isAimed && !item.stroopInk ? 'var(--warn-bg)' : 'var(--bg)';
            btn.style.transform = isAimed ? 'scale(1.03)' : 'scale(1)';
          }

          if (phase === 'study') {
            say.textContent = L.symbol_runner_study;
            coverButton.hidden = false;
            padWrap.hidden = true;
          } else if (phase === 'play') {
            coverButton.hidden = true;
            padWrap.hidden = false;
            say.textContent = lockedOn
              ? (item.prompt || L.symbol_runner_direct)
              : ctx.fmt(L.symbol_runner_lockon_wait, { n: item.lane + 1 });
          } else {
            coverButton.hidden = true;
            padWrap.hidden = false;
            say.textContent = '';
          }

          var inputsBlocked = phase !== 'play' || !lockedOn || ctx.isDone() || sealedPick;
          textInput.disabled = inputsBlocked;
          submitBtn.disabled = inputsBlocked;
          submitBtn.setAttribute('aria-disabled', inputsBlocked ? 'true' : 'false');
          choiceButtons.forEach(function (entry) {
            var usedUp = !!tried[entry.val.toLowerCase()];
            var off = inputsBlocked || usedUp;
            entry.node.disabled = off;
            entry.node.setAttribute('aria-disabled', off ? 'true' : 'false');
            if (phase === 'done' && entry.val.toLowerCase() === (revealAnswer || item.answer)) {
              entry.node.style.borderColor = 'var(--ok)';
              entry.node.style.background = 'var(--ok-bg)';
            }
          });
        }

        if (typeof ctx.keys === 'function') {
          ctx.keys(function (key) {
            var k = String(key == null ? '' : key);
            if (isLockOn && phase === 'play' && !ctx.isDone() && !sealedPick && (k === 'ArrowLeft' || k === 'ArrowRight')) {
              var nextLane = k === 'ArrowLeft' ? Math.max(0, aimLane - 1) : Math.min(2, aimLane + 1);
              aimLane = nextLane;
              if (laneButtons[nextLane]) { try { laneButtons[nextLane].focus(); } catch (_) {} }
              lockToLane(nextLane);
              return true;
            }
            if (phase !== 'play' || !lockedOn || ctx.isDone() || sealedPick) return false;
            var lc = k.toLowerCase();
            if (numericChoices) {
              if (!/^[0-9]$/.test(k)) return false;
              var matched = item.choices.filter(function (c) { return String(c).trim() === k; })[0];
              var longerNum = item.choices.some(function (c) { var s = String(c).trim(); return s.length > 1 && s.indexOf(k) === 0; });
              if (!matched || longerNum) return false;
              if (!tried[matched.toLowerCase()]) submitAnswer(matched);
              return true;
            }
            if (item.stroopInk && k.length === 1) {
              var wantColor = { r: 'red', b: 'blue', g: 'green', y: 'gold' }[lc] || '';
              if (wantColor) {
                var colorHit = item.choices.filter(function (c) {
                  var cl = String(c).trim().toLowerCase();
                  return cl === wantColor || (lc === 'y' && cl === 'yellow');
                })[0];
                if (colorHit && !tried[colorHit.toLowerCase()]) { submitAnswer(colorHit); return true; }
              }
            }
            if (/^[1-9]$/.test(k)) {
              var n = Number(k);
              if (n >= 1 && n <= item.choices.length) {
                var pickChoice = item.choices[n - 1];
                if (!tried[pickChoice.toLowerCase()]) submitAnswer(pickChoice);
                return true;
              }
              return false;
            }
            if (k.length === 1 && /^[a-z0-9]$/i.test(k)) {
              var exact = item.choices.filter(function (c) { return String(c).trim().toLowerCase() === lc; })[0];
              var longerChoice = item.choices.some(function (c) { var cl = String(c).trim().toLowerCase(); return cl.length > 1 && cl.indexOf(lc) === 0; });
              if (exact && !longerChoice) {
                if (!tried[exact.toLowerCase()]) submitAnswer(exact);
                return true;
              }
            }
            return false;
          });
        }

        ctx.root.appendChild(say);
        if (hearButton) ctx.root.appendChild(ctx.el('div', { class: 'row', style: 'justify-content:center' }, [hearButton]));
        ctx.root.appendChild(laneTrack);
        ctx.root.appendChild(coverButton);
        ctx.root.appendChild(padWrap);
        redraw();
        if (!ctx.noFocus && isLockOn && phase === 'play' && !ctx.isDone() && laneButtons[aimLane]) {
          try { laneButtons[aimLane].focus(); } catch (_) {}
        }

        return {
          replay: item.audio ? function () { if (typeof ctx.play === 'function') ctx.play(item.audio); } : null,
          reveal: function (correct) {
            phase = 'done';
            if (typeof correct === 'string') {
              revealAnswer = String(correct).replace(/\s+/g, ' ').trim().toLowerCase();
              outcome = true;
            } else {
              outcome = correct === true;
            }
            redraw();
          },
        };
      },
      score: function (item, answer, response) {
        var a = String(answer == null ? '' : answer).replace(/\s+/g, ' ').trim().toLowerCase();
        var r = String(response == null ? '' : response).replace(/\s+/g, ' ').trim().toLowerCase();
        return { correct: r !== '' && r === a, digitsCorrect: null, digitsPossible: null };
      },
    };
    return module.exports;
  })();
  CHECK_ADAPTERS["vocab_blank"] = (function () {
    var module = { exports: {} };
    // Practice and check adapter: Fill the blank (vocab_blank). A sentence with ___ is shown; the choices are words.
    // It is vocab_meaning.js apart from its id, its title and its words: see the notes there.
    module.exports = {
      id: 'vocab_blank',
      title: 'Fill the blank',
      labels: {
        vocab_blank_intro: 'Read each sentence. Choose the word that fits.',
        vocab_blank_directions: 'Read the sentence. Choose the word that fits in the blank.',
        vocab_blank_question: 'Which word fits in the blank?',
        vocab_blank_read: 'Read aloud',
        // 2026-11-13: the name begins with the button's visible words, Hear it (WCAG 2.5.3 Label in Name).
        vocab_blank_read_choice: 'Hear it: choice {n}',
        vocab_blank_hear: 'Hear it',
        vocab_blank_correct: 'Yes. That word fits.',
        vocab_blank_retry: 'Not quite. Try once more.',
        vocab_blank_missed: 'Here is the right answer.',
        vocab_blank_practice_wrong: 'Not quite. Here is the right answer.',
        vocab_blank_blank: 'blank',
      },
      // p: { word, ask, choices: [text, ...], answer: the right text, read: true | false, lang,
      //   askAudio: the clip id of the word asked (optional), choiceAudio: [clip id or null, ...] (optional) }
      // A clip id names a recording in lesson.audio: a word's own recorded voice, played in place of the device voice.
      prepare: function (p) {
        p = p || {};
        var line = function (v, max) { return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : ''; };
        var clip = function (v) { return typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : ''; };
        var word = line(p.word, 300), ask = line(p.ask, 300);
        if (!word || !ask) return { missing: ['word'] };
        if (!Array.isArray(p.choices) || p.choices.length < 2 || p.choices.length > 6) return { missing: ['choices'] };
        var texts = p.choices.map(function (c) { return line(c, 300); });
        var keys = texts.map(function (t) { return t.slice(0, 80); });
        if (texts.some(function (t) { return !t; }) || keys.some(function (k, i) { return keys.indexOf(k) !== i; })) return { missing: ['different choices'] };
        var answer = line(p.answer, 300).slice(0, 80);
        if (!answer || keys.indexOf(answer) < 0) return { missing: ['an answer that is one of the choices'] };
        var lang = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/.test(String(p.lang || '')) ? String(p.lang) : 'en';
        var heard = Array.isArray(p.choiceAudio) ? p.choiceAudio : [];
        var item = { word: word, ask: ask, choices: texts.map(function (t, i) { var c = { text: t }; if (clip(heard[i])) c.audio = clip(heard[i]); return c; }), answer: answer, read: p.read === true, lang: lang };
        if (clip(p.askAudio)) item.askAudio = clip(p.askAudio);
        return { item: item };
      },
      render: function (item, ctx) {
        return ctx.vocabChoice(item, 'vocab_blank_');
      },
      score: function (item, answer, response) {
        var chosen = String(response == null ? '' : response);
        return { correct: chosen !== '' && chosen === String(answer).slice(0, 80), digitsCorrect: null, digitsPossible: null };
      },
    };
    return module.exports;
  })();
  CHECK_ADAPTERS["vocab_meaning"] = (function () {
    var module = { exports: {} };
    // Practice and check adapter: Word to meaning (vocab_meaning). Vocabulary multiple choice, made by
    // packet_vocab_builder.js from the teacher's checked list (packets-vocab.html). Its two siblings,
    // vocab_word.js (Meaning to word) and vocab_blank.js (Fill the blank), are the same code apart from
    // the prefix of their labels and their words (tests/packet_vocab_adapter.test.js compares them).
    // Item: { word, ask (the text shown: the word, a meaning, or a sentence with ___), choices: [{ text }]
    // in the order shown, answer (the first 80 characters of the right choice), read, lang }; a word with its own
    // recorded voice also has a clip id (askAudio, or audio on its choice), played in place of the device voice.
    // A response is the first 80 characters of the chosen text, because the player keeps 80 of a response.
    // Read aloud uses the device's own speech voice, and only a voice the device says runs on the device
    // (localService), so nothing is sent; with no such voice, or no speech engine, the buttons are not shown.
    // prepare runs when the file is built; render and score are copied into the file with toString and use
    // only their arguments (the speech engine is reached through ctx.root).
    // 2026-11-13: a blank (___) in the question or a choice is shown as a line, and a screen reader hears the
    // word "blank" instead (marked in render; as Word Sounds does, a visually hidden .sr span).
    module.exports = {
      id: 'vocab_meaning',
      title: 'Word to meaning',
      labels: {
        vocab_meaning_intro: 'Read each word. Choose what it means.',
        vocab_meaning_directions: 'Read the word. Choose what it means.',
        vocab_meaning_question: 'What does this word mean?',
        vocab_meaning_read: 'Read aloud',
        // 2026-11-13: the name begins with the button's visible words, Hear it (WCAG 2.5.3 Label in Name).
        vocab_meaning_read_choice: 'Hear it: choice {n}',
        vocab_meaning_hear: 'Hear it',
        vocab_meaning_correct: 'Yes. That is what it means.',
        vocab_meaning_retry: 'Not quite. Try once more.',
        vocab_meaning_missed: 'Here is the right answer.',
        vocab_meaning_practice_wrong: 'Not quite. Here is the right answer.',
        vocab_meaning_blank: 'blank',
      },
      // p: { word, ask, choices: [text, ...], answer: the right text, read: true | false, lang,
      //   askAudio: the clip id of the word asked (optional), choiceAudio: [clip id or null, ...] (optional) }
      // A clip id names a recording in lesson.audio: a word's own recorded voice, played in place of the device voice.
      prepare: function (p) {
        p = p || {};
        var line = function (v, max) { return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : ''; };
        var clip = function (v) { return typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : ''; };
        var word = line(p.word, 300), ask = line(p.ask, 300);
        if (!word || !ask) return { missing: ['word'] };
        if (!Array.isArray(p.choices) || p.choices.length < 2 || p.choices.length > 6) return { missing: ['choices'] };
        var texts = p.choices.map(function (c) { return line(c, 300); });
        var keys = texts.map(function (t) { return t.slice(0, 80); });
        if (texts.some(function (t) { return !t; }) || keys.some(function (k, i) { return keys.indexOf(k) !== i; })) return { missing: ['different choices'] };
        var answer = line(p.answer, 300).slice(0, 80);
        if (!answer || keys.indexOf(answer) < 0) return { missing: ['an answer that is one of the choices'] };
        var lang = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/.test(String(p.lang || '')) ? String(p.lang) : 'en';
        var heard = Array.isArray(p.choiceAudio) ? p.choiceAudio : [];
        var item = { word: word, ask: ask, choices: texts.map(function (t, i) { var c = { text: t }; if (clip(heard[i])) c.audio = clip(heard[i]); return c; }), answer: answer, read: p.read === true, lang: lang };
        if (clip(p.askAudio)) item.askAudio = clip(p.askAudio);
        return { item: item };
      },
      render: function (item, ctx) {
        return ctx.vocabChoice(item, 'vocab_meaning_');
      },
      score: function (item, answer, response) {
        var chosen = String(response == null ? '' : response);
        return { correct: chosen !== '' && chosen === String(answer).slice(0, 80), digitsCorrect: null, digitsPossible: null };
      },
    };
    return module.exports;
  })();
  CHECK_ADAPTERS["vocab_picture"] = (function () {
    var module = { exports: {} };
    // Practice and check adapter: Word to picture (vocab_picture). "Which picture shows this word?": the word is
    // shown, the choices are 4 pictures. Made by packet_vocab_builder.js for list words that have a picture in the
    // Word Sounds picture set (word_sounds_symbols_en.js; each set is credited in the file by the builder). Its
    // sibling vocab_picture_word.js (Picture to word: one picture, the choices are words) is the same code apart from
    // the prefix of its labels and its words (tests/packets_vocab_pictures.test.js compares them).
    // Item: { word, ask, image (the picture asked about, Picture to word only), choices: [{ text, image (Word to
    // picture), audio (a word's own recorded voice, optional) }] in the order shown, answer (the first 80 characters of
    // the right choice's word), read, lang, askAudio (optional) }. The pictures are lesson.images ids; a picture
    // choice is named "Picture 1" until the question is over, so a screen reader does not give the answer away.
    // Read aloud and Hear all work as in vocab_meaning.js: a recorded clip where the word has one, else only a voice
    // that runs on the device. prepare runs when the file is built; render and score are copied into the file.
    module.exports = {
      id: 'vocab_picture',
      title: 'Word to picture',
      labels: {
        vocab_picture_intro: 'Read each word. Choose the picture that shows it.',
        vocab_picture_directions: 'Read the word. Choose the picture that shows it.',
        vocab_picture_question: 'Which picture shows this word?',
        vocab_picture_read: 'Read aloud',
        // 2026-11-13: the name begins with the button's visible words, Hear it (WCAG 2.5.3 Label in Name).
        vocab_picture_read_choice: 'Hear it: choice {n}',
        vocab_picture_hear: 'Hear it',
        vocab_picture_picture: 'Picture {n}',
        vocab_picture_picture_of: 'Picture {n}: {word}',
        vocab_picture_correct: 'Yes. That picture shows it.',
        vocab_picture_retry: 'Not quite. Try once more.',
        vocab_picture_missed: 'Here is the right answer.',
        vocab_picture_practice_wrong: 'Not quite. Here is the right answer.',
      },
      // p: { word, ask, image (Picture to word), choices: [{ text, image, audio }], answer, read, lang, askAudio }
      prepare: function (p) {
        p = p || {};
        var line = function (v, max) { return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : ''; };
        var id = function (v) { return typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : ''; };
        var word = line(p.word, 300), ask = line(p.ask, 300);
        if (!word || !ask) return { missing: ['word'] };
        if (!Array.isArray(p.choices) || p.choices.length < 2 || p.choices.length > 6) return { missing: ['choices'] };
        var given = p.choices.map(function (c) { return c && typeof c === 'object' ? c : { text: c }; });
        var texts = given.map(function (c) { return line(c.text, 60); });
        var keys = texts.map(function (t) { return t.slice(0, 80).toLowerCase(); });
        if (texts.some(function (t) { return !t; }) || keys.some(function (k, i) { return keys.indexOf(k) !== i; })) return { missing: ['different choices'] };
        var image = id(p.image);
        // Each choice is a picture (Word to picture), or the question is (Picture to word): never both, never neither.
        var pictures = given.map(function (c) { return id(c.image); });
        var pictured = pictures.every(Boolean);
        if (pictured === !!image || (!pictured && pictures.some(Boolean))) return { missing: ['pictures'] };
        if (pictured && pictures.some(function (x, i) { return pictures.indexOf(x) !== i; })) return { missing: ['different pictures'] };
        var answer = line(p.answer, 60).slice(0, 80);
        if (!answer || texts.map(function (t) { return t.slice(0, 80); }).indexOf(answer) < 0) return { missing: ['an answer that is one of the choices'] };
        var lang = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/.test(String(p.lang || '')) ? String(p.lang) : 'en';
        var item = { word: word, ask: ask, choices: given.map(function (c, i) {
          var out = { text: texts[i] };
          if (pictured) out.image = pictures[i];
          if (id(c.audio)) out.audio = id(c.audio);
          return out;
        }), answer: answer, read: p.read === true, lang: lang };
        if (image) item.image = image;
        if (id(p.askAudio)) item.askAudio = id(p.askAudio);
        return { item: item };
      },
      render: function (item, ctx) {
        return ctx.vocabChoice(item, 'vocab_picture_', true);
      },
      score: function (item, answer, response) {
        var chosen = String(response == null ? '' : response);
        return { correct: chosen !== '' && chosen === String(answer).slice(0, 80), digitsCorrect: null, digitsPossible: null };
      },
    };
    return module.exports;
  })();
  CHECK_ADAPTERS["vocab_picture_word"] = (function () {
    var module = { exports: {} };
    // Practice and check adapter: Picture to word (vocab_picture_word). "Which word goes with this picture?": one
    // picture is shown, the choices are words. It is vocab_picture.js apart from its id, its title and its words: see
    // the notes there.
    module.exports = {
      id: 'vocab_picture_word',
      title: 'Picture to word',
      labels: {
        vocab_picture_word_intro: 'Look at each picture. Choose the word that goes with it.',
        vocab_picture_word_directions: 'Look at the picture. Choose the word that goes with it.',
        vocab_picture_word_question: 'Which word goes with this picture?',
        vocab_picture_word_read: 'Read aloud',
        // 2026-11-13: the name begins with the button's visible words, Hear it (WCAG 2.5.3 Label in Name).
        vocab_picture_word_read_choice: 'Hear it: choice {n}',
        vocab_picture_word_hear: 'Hear it',
        vocab_picture_word_picture: 'Picture {n}',
        vocab_picture_word_picture_of: 'Picture {n}: {word}',
        vocab_picture_word_correct: 'Yes. That is the word.',
        vocab_picture_word_retry: 'Not quite. Try once more.',
        vocab_picture_word_missed: 'Here is the right answer.',
        vocab_picture_word_practice_wrong: 'Not quite. Here is the right answer.',
      },
      // p: { word, ask, image (Picture to word), choices: [{ text, image, audio }], answer, read, lang, askAudio }
      prepare: function (p) {
        p = p || {};
        var line = function (v, max) { return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : ''; };
        var id = function (v) { return typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : ''; };
        var word = line(p.word, 300), ask = line(p.ask, 300);
        if (!word || !ask) return { missing: ['word'] };
        if (!Array.isArray(p.choices) || p.choices.length < 2 || p.choices.length > 6) return { missing: ['choices'] };
        var given = p.choices.map(function (c) { return c && typeof c === 'object' ? c : { text: c }; });
        var texts = given.map(function (c) { return line(c.text, 60); });
        var keys = texts.map(function (t) { return t.slice(0, 80).toLowerCase(); });
        if (texts.some(function (t) { return !t; }) || keys.some(function (k, i) { return keys.indexOf(k) !== i; })) return { missing: ['different choices'] };
        var image = id(p.image);
        // Each choice is a picture (Word to picture), or the question is (Picture to word): never both, never neither.
        var pictures = given.map(function (c) { return id(c.image); });
        var pictured = pictures.every(Boolean);
        if (pictured === !!image || (!pictured && pictures.some(Boolean))) return { missing: ['pictures'] };
        if (pictured && pictures.some(function (x, i) { return pictures.indexOf(x) !== i; })) return { missing: ['different pictures'] };
        var answer = line(p.answer, 60).slice(0, 80);
        if (!answer || texts.map(function (t) { return t.slice(0, 80); }).indexOf(answer) < 0) return { missing: ['an answer that is one of the choices'] };
        var lang = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/.test(String(p.lang || '')) ? String(p.lang) : 'en';
        var item = { word: word, ask: ask, choices: given.map(function (c, i) {
          var out = { text: texts[i] };
          if (pictured) out.image = pictures[i];
          if (id(c.audio)) out.audio = id(c.audio);
          return out;
        }), answer: answer, read: p.read === true, lang: lang };
        if (image) item.image = image;
        if (id(p.askAudio)) item.askAudio = id(p.askAudio);
        return { item: item };
      },
      render: function (item, ctx) {
        return ctx.vocabChoice(item, 'vocab_picture_word_', true);
      },
      score: function (item, answer, response) {
        var chosen = String(response == null ? '' : response);
        return { correct: chosen !== '' && chosen === String(answer).slice(0, 80), digitsCorrect: null, digitsPossible: null };
      },
    };
    return module.exports;
  })();
  CHECK_ADAPTERS["vocab_word"] = (function () {
    var module = { exports: {} };
    // Practice and check adapter: Meaning to word (vocab_word). The meaning is shown; the choices are words.
    // It is vocab_meaning.js apart from its id, its title and its words: see the notes there.
    module.exports = {
      id: 'vocab_word',
      title: 'Meaning to word',
      labels: {
        vocab_word_intro: 'Read each meaning. Choose the word.',
        vocab_word_directions: 'Read the meaning. Choose the word.',
        vocab_word_question: 'Which word has this meaning?',
        vocab_word_read: 'Read aloud',
        // 2026-11-13: the name begins with the button's visible words, Hear it (WCAG 2.5.3 Label in Name).
        vocab_word_read_choice: 'Hear it: choice {n}',
        vocab_word_hear: 'Hear it',
        vocab_word_correct: 'Yes. That is the word.',
        vocab_word_retry: 'Not quite. Try once more.',
        vocab_word_missed: 'Here is the right answer.',
        vocab_word_practice_wrong: 'Not quite. Here is the right answer.',
        vocab_word_blank: 'blank',
      },
      // p: { word, ask, choices: [text, ...], answer: the right text, read: true | false, lang,
      //   askAudio: the clip id of the word asked (optional), choiceAudio: [clip id or null, ...] (optional) }
      // A clip id names a recording in lesson.audio: a word's own recorded voice, played in place of the device voice.
      prepare: function (p) {
        p = p || {};
        var line = function (v, max) { return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : ''; };
        var clip = function (v) { return typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : ''; };
        var word = line(p.word, 300), ask = line(p.ask, 300);
        if (!word || !ask) return { missing: ['word'] };
        if (!Array.isArray(p.choices) || p.choices.length < 2 || p.choices.length > 6) return { missing: ['choices'] };
        var texts = p.choices.map(function (c) { return line(c, 300); });
        var keys = texts.map(function (t) { return t.slice(0, 80); });
        if (texts.some(function (t) { return !t; }) || keys.some(function (k, i) { return keys.indexOf(k) !== i; })) return { missing: ['different choices'] };
        var answer = line(p.answer, 300).slice(0, 80);
        if (!answer || keys.indexOf(answer) < 0) return { missing: ['an answer that is one of the choices'] };
        var lang = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/.test(String(p.lang || '')) ? String(p.lang) : 'en';
        var heard = Array.isArray(p.choiceAudio) ? p.choiceAudio : [];
        var item = { word: word, ask: ask, choices: texts.map(function (t, i) { var c = { text: t }; if (clip(heard[i])) c.audio = clip(heard[i]); return c; }), answer: answer, read: p.read === true, lang: lang };
        if (clip(p.askAudio)) item.askAudio = clip(p.askAudio);
        return { item: item };
      },
      render: function (item, ctx) {
        return ctx.vocabChoice(item, 'vocab_word_');
      },
      score: function (item, answer, response) {
        var chosen = String(response == null ? '' : response);
        return { correct: chosen !== '' && chosen === String(answer).slice(0, 80), digitsCorrect: null, digitsPossible: null };
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
    if (!/^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,[a-z0-9+/=\s]+$/i.test(value) || value.length >= 1500000) return null;
    if (/^data:image\/svg\+xml;base64,/i.test(value)) {
      try {
        var decoded = atob(value.slice(value.indexOf(',') + 1).replace(/\s+/g, ''));
        if (/<script\b|javascript:|vbscript:|<foreignobject\b|\bon[a-z]+\s*=|xlink:href\s*=\s*["']\s*(?:javascript:|data:text\/html)/i.test(decoded)) return null;
      } catch (_) { return null; }
    }
    return value;
  }

  // When a word's own picture shows, activity by activity. This is the app's
  // player, as a learner meets it (word_sounds_module.js: SMART_IMAGE_VISIBILITY
  // and its "progressive" default, drawn by renderPrompt(), revealed in
  // checkAnswer; tests/word_sounds_packet_pictures.test.js reads that code and
  // fails when this table and the app part ways):
  //   'prompt'  with the question                                  (app: alwaysOn)
  //   'retry'   after the first wrong try, or when the item is done (app: progressive)
  //   'after'   only when the item is done                          (app: afterCompletion)
  //   no entry  never. The app draws no prompt picture there (Sound Sort,
  //             Syllable Blending), or the pictures ARE the activity and its
  //             adapter places them (Read & Match, Finish the Sentence, Read
  //             the Story, Picture the Sentence).
  // Find Sounds is 'prompt': the app's answer screen puts the picture on its
  // "hear the word" button from the start. The word there is the question, never the answer.
  var PICTURE_RULE = {
    isolation: 'prompt', segmentation: 'prompt', rhyming: 'prompt', letter_tracing: 'prompt', mapping: 'prompt',
    word_families: 'retry', manipulation: 'retry', syllable_counting: 'retry',
    counting: 'after', blending: 'after', orthography: 'after', spelling_bee: 'after', word_scramble: 'after', missing_letter: 'after',
  };
  // Words for the picture. They travel only in a file that has word pictures.
  // Translated through word_sounds.take_home_player_<key> in the app.
  var PICTURE_LABELS = {
    picture_clue: 'Picture clue',
    picture_of: 'Picture of {word}',
  };

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
      .filter(function (id, i, all) { return typeof id === 'string' && id !== '__proto__' && id !== 'constructor' && id !== 'prototype' && Object.prototype.hasOwnProperty.call(adapters, id) && adapters[id] && all.indexOf(id) === i; });
    var banks = opts.banks || {};
    var isEnglish = opts.isEnglish !== false;
    var audio = {}, byUri = Object.create(null), images = {}, byImage = Object.create(null);
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
    var pictures = Object.create(null);
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
        // 2026-11-13 (answer audit): the sound label y is the consonant of yes (the dictionary writes the vowel of happy
        // as ee). The bank's table maps the SPELLING y to ee, so /y/ played the ee clip: yes, cute and use sounded
        // /ee/, and /y/ beside /ee/ in Find Sounds were one sound. The bank's own y clip comes first for it.
        var candidates = (isEnglish && String(label) === 'y' ? ['y'] : []).concat(core.phonemeBankCandidates(label));
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
    var pictured = {};
    activities.forEach(function (id) {
      var adapter = adapters[id];
      var items = [];
      var seen = Object.create(null);
      (Array.isArray(words) ? words : []).forEach(function (w) {
        if (!w || items.length >= MAX_ITEMS) return;
        var word = str(w.targetWord || w.word || w.term).trim();
        var key = core.packAudioKey(word);
        if (!word || seen[key]) return;
        seen[key] = true;
        var made;
        try { made = adapter.prepare(w, Object.assign({ word: word }, env)); } catch (_) { made = { missing: ['board'] }; }
        if (!made || !made.item) { exceptions.push({ activity: id, word: word, missing: (made && made.missing) || ['board'] }); return; }
        var item = Object.assign({ id: id + '-' + items.length, word: word }, made.item);
        // The word's own picture, where the app shows one (PICTURE_RULE). A
        // row with no picture adds nothing, so its file is as it was.
        if (PICTURE_RULE[id]) {
          var raw = env.packImage(word);
          var picture = raw && !/^https?:/i.test(raw) ? addImage(/^data:/i.test(raw) ? raw : 'data:image/png;base64,' + raw) : null;
          if (picture) { item.wordPicture = picture; pictured[id] = PICTURE_RULE[id]; }
        }
        items.push(item);
      });
      if (items.length) blocks.push({ activity: id, items: items });
    });
    var feedback = { correct: [], retry: null };
    FEEDBACK_CORRECT.forEach(function (k) { var c = env.bankClip('instructions', k); if (c) feedback.correct.push(c); });
    feedback.retry = env.bankClip('instructions', FEEDBACK_RETRY);
    // Keep only the clips and pictures a shipped item or the feedback uses:
    // a word that was left out may already have looked some up.
    var used = Object.create(null);
    var walk = function (value) {
      if (typeof value === 'string') { if (Object.prototype.hasOwnProperty.call(audio, value) || Object.prototype.hasOwnProperty.call(images, value)) used[value] = true; return; }
      if (value && typeof value === 'object') Object.keys(value).forEach(function (k) { walk(value[k]); });
    };
    walk(blocks); walk(feedback);
    Object.keys(audio).forEach(function (id) { if (!used[id]) delete audio[id]; });
    Object.keys(images).forEach(function (id) { if (!used[id]) delete images[id]; });
    var title = str(opts.title).trim().slice(0, 120) || DEFAULT_LABELS.title;
    var content = { title: title, showLetters: !!opts.showLetters, blocks: blocks };
    if (opts.instructionsOnce === true) content.instructionsOnce = true;
    var sequence = null;
    if (opts.order === 'mixed' && blocks.length >= 2) {
      // Deterministic weighted interleave matching word_sounds_packet_builder.js mixedOrder:
      // spreads activities, prevents 3-in-a-row while other activities remain, and preserves per-activity word order.
      var usual = [];
      blocks.forEach(function (b) { b.items.forEach(function (it) { usual.push(String(it.id)); }); });
      var seedBase = opts.orderSeed != null ? String(opts.orderSeed) : (str(opts.lessonId) || title || 'mixed') + '|' + usual.join(',');
      var buildMixed = function (seedText) {
        var a = parseInt(hashText(seedText + '|question-order'), 16) >>> 0;
        var nextRand = function () {
          a = (a + 0x6D2B79F5) >>> 0;
          var t = a;
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        var left = blocks.map(function (b) { return b.items.map(function (it) { return String(it.id); }); });
        var total = left.reduce(function (n, l) { return n + l.length; }, 0);
        var out = [], last = -1, run = 0;
        while (out.length < total) {
          var open = [];
          left.forEach(function (l, i) { if (l.length && !(i === last && run >= 2)) open.push(i); });
          if (!open.length) open = [last];
          var weight = open.reduce(function (n, i) { return n + left[i].length; }, 0);
          var draw = nextRand() * weight, chosen = open[open.length - 1];
          for (var k = 0; k < open.length; k++) { draw -= left[open[k]].length; if (draw < 0) { chosen = open[k]; break; } }
          out.push(left[chosen].shift());
          run = chosen === last ? run + 1 : 1;
          last = chosen;
        }
        return out;
      };
      var mixed = buildMixed(seedBase);
      for (var retry = 1; mixed.join(',') === usual.join(',') && retry <= 8; retry++) {
        mixed = buildMixed(seedBase + '#' + retry);
      }
      if (mixed.join(',') === usual.join(',')) {
        var queues = blocks.map(function (b) { return b.items.map(function (it) { return String(it.id); }); });
        mixed = [];
        while (queues.some(function (q) { return q.length > 0; })) {
          for (var offset = 0; offset < queues.length; offset++) {
            var q = queues[(1 + offset) % queues.length];
            if (q.length) mixed.push(q.shift());
          }
        }
      }
      if (mixed.join(',') !== usual.join(',')) sequence = mixed;
    }
    if (sequence) content.sequence = sequence;
    if (opts.repeatMissed === true) content.repeatMissed = true;
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
    if (opts.instructionsOnce === true) lesson.instructionsOnce = true;
    if (sequence) lesson.sequence = sequence;
    if (opts.repeatMissed === true) lesson.repeatMissed = true;
    // Only a lesson with word pictures says when they show.
    if (Object.keys(pictured).length) lesson.pictures = { rule: pictured };
    var ready = blocks.reduce(function (n, b) { return n + b.items.length; }, 0);
    var perActivity = activities.map(function (id) {
      var block = blocks.filter(function (b) { return b.activity === id; })[0];
      return { activity: id, title: adapters[id].title, ready: block ? block.items.length : 0, exceptions: exceptions.filter(function (e) { return e.activity === id; }) };
    });
    return { lesson: lesson, exceptions: exceptions, ready: ready, total: ready + exceptions.length, perActivity: perActivity };
  }

  // JSON inside a <script> block: no "</script>", no line separators.
  function safeJson(value) {
    var seen = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
    var raw = JSON.stringify(value, function (k, v) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') return undefined;
      if (seen && v && typeof v === 'object') {
        if (seen.has(v)) return undefined;
        seen.add(v);
      }
      return v;
    });
    return String(raw || 'null').replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  }
  function escapeHtml(value) {
    return str(value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  // BEGIN GENERATED FONTS (dev-tools/build_take_home_fonts.cjs)
  // The reading fonts of Reading tools > Letters, inside every file (data/vendor/fonts/source.json).
  var FONT_CSS = "@font-face{font-family:\"Lexend\";font-style:normal;font-weight:400;font-display:swap;src:url(data:font/woff2;base64,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) format(\"woff2\")}\n@font-face{font-family:\"Atkinson Hyperlegible\";font-style:normal;font-weight:400;font-display:swap;src:url(data:font/woff2;base64,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) format(\"woff2\")}";
  var FONT_CREDIT = "Fonts: Lexend (2019 The Lexend Project Authors) and Atkinson Hyperlegible (2020 Braille Institute of America, Inc.), SIL Open Font License 1.1.";
  // END GENERATED FONTS
  var CSS = [
    // 2026-11-12 look pass: --soft tints the helper buttons; every theme below sets it too.
    ':root{--bg:#f1f4fc;--card:#fff;--ink:#1d2433;--muted:#4a5468;--accent:#3d3aa8;--accent-ink:#fff;--ok:#1d6b3a;--ok-bg:#e3f4e9;--warn:#8a4b00;--warn-bg:#fff1dc;--line:#c9cede;--focus:#b54700;--soft:#eeeefb;--hover:#00000012;--c0:#3d3aa8;--c1:#0e6b6b;--c2:#9a2b67;--c3:#945200;--c4:#216b3b;--c5:#1d56a8;--c0b:#ebecff;--c1b:#dff5f3;--c2b:#fce8f2;--c3b:#fff1db;--c4b:#e3f5e9;--c5b:#e4effd}',
    '@media (prefers-color-scheme:dark){:root{--bg:#141824;--card:#1f2535;--ink:#eef1f8;--muted:#b7bfd2;--accent:#a9a7ff;--accent-ink:#141824;--ok:#8fe0ab;--ok-bg:#163423;--warn:#ffc77a;--warn-bg:#3a2a12;--line:#3a4258;--focus:#ffb070;--soft:#283048;--hover:#ffffff1c;--c0:#a9a7ff;--c1:#64d8cb;--c2:#f497c8;--c3:#f7c46c;--c4:#80de9d;--c5:#82c0ff;--c0b:#27284a;--c1b:#183539;--c2b:#3c2235;--c3b:#3b2d18;--c4b:#1a3626;--c5b:#1b2f49}}',
    '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:18px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}',
    'main{max-width:760px;margin:0 auto;padding:24px 16px 48px}h1{font-size:1.6rem;margin:0 0 12px;line-height:1.25}h2{font-size:1.35rem;margin:0 0 12px;line-height:1.3}',
    'h1::before{content:"";display:inline-block;width:.5em;height:.5em;margin-inline-end:.5em;border-radius:.12em;background:var(--accent);transform:rotate(45deg)}',
    '.card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:20px;padding:clamp(16px,4vw,24px);margin:16px 0;box-shadow:0 6px 20px #1d243314}.card>:first-child,.card>div:first-child>:first-child{margin-top:0}',
    'button{font:inherit;min-height:48px;min-width:48px;padding:10px 18px;border-radius:14px;border:2px solid var(--accent);background:var(--soft);color:var(--ink);cursor:pointer;touch-action:manipulation}',
    'button.primary{background:var(--accent);color:var(--accent-ink);font-weight:700;box-shadow:inset 0 -3px 0 #0000002e}button:disabled,button[aria-disabled=true]{opacity:.55;cursor:not-allowed}.choice.right button{opacity:1}',
    '@media (hover:hover){button:not(:disabled):not([aria-disabled=true]):hover{background-image:linear-gradient(var(--hover),var(--hover))}}',
    'button[aria-pressed=true]{outline:3px solid var(--accent);outline-offset:2px}button[aria-pressed=true]:focus-visible{outline-color:var(--focus);outline-offset:4px}',
    ':focus-visible{outline:3px solid var(--focus);outline-offset:3px}h2[tabindex="-1"]:focus{outline:none}',
    '.row{display:flex;flex-wrap:wrap;gap:12px;align-items:center}.choices{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;list-style:none;padding:0;margin:16px 0}',
    '.choice{position:relative;background:var(--card);border:2px solid var(--line);border-radius:16px;padding:10px;display:flex;flex-direction:column;gap:8px;box-shadow:0 3px 0 var(--line)}.choice.tried{border-style:dashed;box-shadow:none}.choice.right{border-color:var(--ok);background:var(--ok-bg);box-shadow:0 3px 0 var(--ok)}.choice.solo{border-color:transparent}.choice.solo.tried{border-color:var(--line)}.choice.solo.right{border-color:var(--ok)}.choice.solo:not(.right){box-shadow:none}',
    '.slots{display:flex;flex-wrap:wrap;gap:10px;list-style:none;padding:0;margin:16px 0}.slot{min-width:64px;min-height:64px;border:2px dashed var(--line);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:700}',
    '.picture{max-width:160px;max-height:160px;border-radius:12px;background:#fff;padding:4px}',
    '.letters{font-size:1.5rem;font-weight:700;line-height:1.3}.status{min-height:1.5em;margin:12px 0;padding:10px 14px;border-radius:12px}.status.ok{background:var(--ok-bg);color:var(--ok)}.status.warn{background:var(--warn-bg);color:var(--warn)}',
    // Right and wrong say it in words and with a mark, not by color alone: a tick on the right choice, a badge on the feedback line.
    '.choice.right::after,[data-feedback]:not(:empty)::before{flex:none;width:32px;height:32px;border-radius:50%;color:var(--card);font-weight:700;line-height:32px;text-align:center}',
    '.choice.right::after{content:"\\2713";content:"\\2713"/"";position:absolute;top:-12px;inset-inline-end:-10px;background:var(--ok)}',
    // The tick pops in once (0.25 s), only when the device has not asked for reduced motion; nothing else moves.
    '@media (prefers-reduced-motion:no-preference){.choice.right::after{animation:lt-pop .25s ease-out}}@keyframes lt-pop{from{transform:scale(.3);opacity:0}to{transform:none;opacity:1}}',
    '[data-feedback]{display:flex;gap:12px;align-items:center;font-weight:600}[data-feedback]:empty{min-height:0;margin:0;padding:0}[data-feedback].ok:not(:empty)::before{content:"\\2713";content:"\\2713"/"";background:var(--ok)}',
    '[data-feedback].warn:not(:empty)::before{content:"\\21bb";content:"\\21bb"/"";background:var(--warn)}[data-feedback][data-missed]:not(:empty)::before{content:"i";content:"i"/""}',
    '.progress{height:10px;border-radius:5px;background:var(--line);overflow:hidden;margin:6px 0 0}.progress span{display:block;height:100%;background:var(--accent)}',
    // The end screen: a star for finishing (whatever the score), and each activity's own result when there are several.
    '.hero{text-align:center}.done-star{position:relative;display:block;width:84px;height:84px;margin:0 auto 8px;border-radius:50%;background:var(--soft)}',
    '.done-star::before,.done-star::after{content:"";position:absolute;inset:11px;background:var(--ink);clip-path:polygon(50% 2%,62% 36%,98% 37%,69% 59%,80% 95%,50% 74%,20% 95%,31% 59%,2% 37%,38% 36%)}.done-star::after{inset:15px;background:#f6b400}',
    '.tally{list-style:none;padding:0;margin:16px 0;display:grid;gap:8px}.tally li{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 12px;padding:10px 14px;border-radius:12px;background:var(--soft)}',
    '.big-row{justify-content:center;margin:16px 0}button.big{min-height:64px;padding:14px 28px;font-size:1.25rem;border-radius:16px}',
    '.save-icon{display:inline-block;position:relative;width:1em;height:1em;margin-inline-end:.5em;vertical-align:-.12em;border-bottom:.16em solid currentColor;box-sizing:border-box}',
    '.save-icon::before{content:"";position:absolute;left:50%;top:0;height:.5em;margin-left:-.08em;border-left:.16em solid currentColor}',
    '.save-icon::after{content:"";position:absolute;left:50%;top:.14em;width:.44em;height:.44em;margin-left:-.22em;border-right:.16em solid currentColor;border-bottom:.16em solid currentColor;transform:rotate(45deg);box-sizing:border-box}',
    '.grown-ups{margin-top:16px;border-top:1px solid var(--line);padding-top:4px}.grown-ups summary{cursor:pointer;padding:10px 0;color:var(--muted);font-weight:600}',
    '.confer{margin-top:16px;border-top:1px solid var(--line);padding-top:4px}.confer summary{cursor:pointer;padding:10px 0;color:var(--ink);font-weight:700}',
    '.confer-meta{margin:6px 0 10px;font-weight:600}.confer-list{list-style:none;padding:0;margin:8px 0 12px;display:grid;gap:8px}',
    '.confer-list li{padding:10px 12px;border-radius:10px;background:var(--soft);border-inline-start:4px solid var(--warn);overflow-wrap:anywhere}',
    '.confer-list li[data-confer-item="retry"]{border-inline-start-color:var(--accent)}',
    '.confer-tag{display:inline-block;padding:2px 8px;margin-inline-end:8px;border-radius:999px;font-size:.82rem;font-weight:700;border:1px solid currentColor}',
    '.confer-box{margin:12px 0;padding:10px 14px;border-radius:12px;background:var(--soft);border-inline-start:4px solid var(--warn);overflow-wrap:anywhere}.confer-box p{margin:4px 0}',
    '@media (forced-colors:active){.confer-list li,.confer-box{border:1px solid CanvasText;border-inline-start:4px solid CanvasText}}',
    'label{display:block;margin:12px 0 4px;font-weight:600}input{font:inherit;width:100%;max-width:360px;min-height:48px;padding:8px 12px;border-radius:10px;border:2px solid var(--line);background:var(--card);color:var(--ink)}',
    '.about ul{margin:0;padding-inline-start:20px}.about li{margin:8px 0;overflow-wrap:anywhere}',
    '.muted{color:var(--muted)}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
    '@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}',
    '[data-lt-motion="1"] *{transition:none!important;animation:none!important}',
    // "hidden" wins over every display rule (a placed tile is an li.row: .row{display:flex} kept it on screen).
    '[hidden]{display:none!important}summary{cursor:pointer;min-height:48px;padding:12px 0;font-weight:600}',
    // Hear all: the choice being heard is outlined and shows its number. No movement, so nothing to turn off for reduced motion.
    '[data-hearing]{position:relative;outline:4px solid var(--accent);outline-offset:2px}[data-hearing]::before{content:attr(data-hearing);position:absolute;top:-14px;inset-inline-start:-10px;min-width:30px;height:30px;padding:0 6px;border-radius:15px;background:var(--accent);color:var(--accent-ink);font-weight:700;line-height:30px;text-align:center}',
    '@media (forced-colors:active){[data-hearing]{outline-color:Highlight}[data-hearing]::before{forced-color-adjust:none;background:Highlight;color:HighlightText}}.hear-now{min-height:1.5em;margin:0}[data-tool-group=choices] .lt-l,[data-tool-group=colors] .lt-l,[data-tool-group=directions] .lt-l{flex-basis:100%}[data-hear-row]{margin:12px 0}',
    // Phones: a choice's two buttons side by side (half the scrolling), and the next-step button across the card.
    '@media (max-width:480px){.choice:not([style]){flex-direction:row;align-items:stretch}.choice:not([style])>button{flex:1 1 0;min-width:0}[data-next],[data-practice-next]{width:100%}}',
    // Phones, 2026-11-16 (measured at 390 and 360 px wide: the card started 290 px down, and 2 to 6 of Blend Sounds' six
    // choices and a check's Next key were off the screen). While a screen shows its own heading ([data-step], set by
    // screen()), the file's title is one small line and the Reading tools button sits beside the heading. Four or
    // more sound choices go two across, Listen above the choice. Lists that set their own columns are left alone.
    '@media (max-width:480px){main{padding-top:12px}[data-step] h1{font-size:1rem;margin:0 0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}[data-step] #app>h2:first-child{display:flex;align-items:center;min-height:48px;margin:0 0 8px;padding-inline-end:64px}}',
    '@media (max-width:480px){[data-step] .lt-bar{margin:-56px 0 8px}[data-step] .lt-bar{flex-wrap:wrap}}',
    '@media (max-width:480px){[data-step] [data-player-stop-audio]{flex-basis:100%}}',
    '@media (max-width:480px){.choices:not([style]):has(>.choice:nth-child(4)){grid-template-columns:1fr 1fr;gap:10px}.choices:not([style]):has(>.choice:nth-child(4))>.choice:not([style]){flex-direction:column;padding:8px}.choices:not([style]):has(>.choice:nth-child(4))>.choice>button{flex:none;padding-inline:8px;overflow-wrap:anywhere}}',
    '@media (min-width:960px){:root{--seg-sz:78px;--seg-box:94px;--map-sz:86px;--map-h:66px;--map-box:94px;--map-span:184px;--map-span-box:196px;--ws-tile:70px;--ws-box-w:76px;--ws-box-h:78px;--trace-sz:360px;--sr-lane:680px;--sr-keys:640px}main{max-width:min(1080px,90vw);padding:32px 28px 56px}.card{padding:clamp(24px,3vw,36px) clamp(24px,3.5vw,42px)}.choices{grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}.slots{gap:16px}.row{gap:14px}.picture{max-width:220px;max-height:220px}[data-seg-tray]{gap:18px!important;margin:18px 0!important}[data-read-along-text]{max-width:46rem;margin-inline:auto}}',
    // Reading tools (takeHomeTools): attributes on <html> set the size, the colors (the variables above) and the spacing.
    '[data-lt-size="1"]{font-size:125%}[data-lt-size="2"]{font-size:150%}[data-lt-size] body{font-size:1.125rem}[data-lt-size="3"]{font-size:175%}[data-lt-size] button,[data-lt-size] .letters{overflow-wrap:anywhere}',
    '[data-lt-colors="1"]{--bg:#000;--card:#000;--ink:#fff;--muted:#fff;--accent:#ffeb3b;--accent-ink:#000;--ok:#7dff8f;--ok-bg:#000;--warn:#ffeb3b;--warn-bg:#000;--line:#fff;--focus:#00e5ff;--soft:#000;--hover:#ffffff28;--c0:#ffeb3b;--c1:#00e5ff;--c2:#7dff8f;--c3:#ff8ef0;--c4:#ffb74d;--c5:#9ec5ff;--c0b:#000;--c1b:#000;--c2b:#000;--c3b:#000;--c4b:#000;--c5b:#000}[data-lt-colors="1"] .card,[data-lt-colors="1"] .status{border:3px solid}[data-lt-colors="1"] .progress{background:var(--soft);border:1px solid var(--line)}',
    '[data-lt-colors="2"]{--bg:#f4ead2;--card:#fdf6e3;--ink:#2a2216;--muted:#4d4230;--accent:#4b3f99;--accent-ink:#fff;--ok:#1f5e33;--ok-bg:#e4efd5;--warn:#7a4100;--warn-bg:#f8e2c0;--line:#bfae86;--focus:#a33f00;--soft:#f6ebcf;--hover:#00000012;--c0:#4b3f99;--c1:#1e665c;--c2:#963c2c;--c3:#855200;--c4:#35632a;--c5:#2c5887;--c0b:#ece6f5;--c1b:#e3f0ea;--c2b:#f7e4dc;--c3b:#f7ebd0;--c4b:#e7f0de;--c5b:#e4ecf2}',
    // 2026-11-12: themes a student may choose (Dark whatever the device says, Ocean, Sunny, Forest); each passes AA in every state (tests/packets_learner_tools.test.js).
    '[data-lt-colors="3"]{--bg:#141824;--card:#1f2535;--ink:#eef1f8;--muted:#b7bfd2;--accent:#a9a7ff;--accent-ink:#141824;--ok:#8fe0ab;--ok-bg:#163423;--warn:#ffc77a;--warn-bg:#3a2a12;--line:#3a4258;--focus:#ffb070;--soft:#283048;--hover:#ffffff1c;--c0:#a9a7ff;--c1:#64d8cb;--c2:#f497c8;--c3:#f7c46c;--c4:#80de9d;--c5:#82c0ff;--c0b:#27284a;--c1b:#183539;--c2b:#3c2235;--c3b:#3b2d18;--c4b:#1a3626;--c5b:#1b2f49;color-scheme:dark}',
    '[data-lt-colors="4"]{--bg:#e3f1f8;--card:#fff;--ink:#0e2a3b;--muted:#3a5464;--accent:#0b5c86;--accent-ink:#fff;--ok:#17663a;--ok-bg:#e1f3e8;--warn:#8a4500;--warn-bg:#fff0da;--line:#a6c7d8;--focus:#b54700;--soft:#e2f1f9;--hover:#00000012;--c0:#0b5c86;--c1:#0c6b66;--c2:#9c3b4c;--c3:#1f6a46;--c4:#48459e;--c5:#8c5200;--c0b:#dff0fa;--c1b:#dcf4f2;--c2b:#fbe7ea;--c3b:#e0f3ea;--c4b:#eaeafd;--c5b:#fdf0dc}',
    '[data-lt-colors="5"]{--bg:#fff3d1;--card:#fffdf7;--ink:#2b2112;--muted:#594827;--accent:#a63f00;--accent-ink:#fff;--ok:#1b6636;--ok-bg:#e2f3e5;--warn:#8a3a00;--warn-bg:#ffe8c2;--line:#dcc386;--focus:#1f4fc4;--soft:#fff0c4;--hover:#00000012;--c0:#a63f00;--c1:#2e6828;--c2:#1e589c;--c3:#7a307a;--c4:#8a5300;--c5:#0f6868;--c0b:#ffe9d6;--c1b:#e7f4e2;--c2b:#e4effc;--c3b:#f6e6f6;--c4b:#fff1cf;--c5b:#dff3f2}',
    '[data-lt-colors="6"]{--bg:#e7f2e4;--card:#fbfef9;--ink:#17291b;--muted:#3e5342;--accent:#1f5f55;--accent-ink:#fff;--ok:#1b6331;--ok-bg:#dcf0dc;--warn:#844300;--warn-bg:#fdefd6;--line:#a9c7a6;--focus:#b54700;--soft:#e3f0e2;--hover:#00000012;--c0:#1f5f55;--c1:#2a682c;--c2:#8a4b14;--c3:#8c2f5d;--c4:#1e578c;--c5:#534399;--c0b:#dff2ee;--c1b:#e3f4e3;--c2b:#f9ece0;--c3b:#f9e7f0;--c4b:#e3effa;--c5b:#ece9fa}',
    '[data-lt-colors="7"]{--bg:#fceef3;--card:#fffafb;--ink:#4a0d26;--muted:#6e1c3e;--accent:#9c144c;--accent-ink:#fff;--ok:#1b6331;--ok-bg:#e1f3e5;--warn:#844300;--warn-bg:#fdefd6;--line:#c98aa3;--focus:#1f4fc4;--soft:#f7dce6;--hover:#00000012;--c0:#9c144c;--c1:#6b2b8a;--c2:#1d6648;--c3:#27519c;--c4:#8f4b00;--c5:#11666b;--c0b:#fce2ec;--c1b:#f2e6fa;--c2b:#e1f4ec;--c3b:#e5eefc;--c4b:#fcf0de;--c5b:#dff3f5}',
    // Each color choice shows its color.
    '[data-tool^=colors-]::before{content:"";display:inline-block;width:.8em;height:.8em;margin-inline-end:.4em;border-radius:50%;border:1px solid var(--ink);vertical-align:-.1em;background:linear-gradient(90deg,#fff 50%,#3d3aa8 50%)}[data-tool=colors-1]::before{background:linear-gradient(90deg,#000 50%,#ffeb3b 50%)}',
    '[data-tool=colors-2]::before{background:#e8d6a8}[data-tool=colors-3]::before{background:#1f2535}[data-tool=colors-4]::before{background:#0b5c86}[data-tool=colors-5]::before{background:#f6b400}[data-tool=colors-6]::before{background:#1f5f55}[data-tool=colors-7]::before{background:#9c144c}',
    '[data-lt-spacing] main *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}[data-lt-spacing] main p{margin-bottom:2em!important}',
    '[data-lt-spacing="2"] main *{line-height:2.05!important;letter-spacing:.18em!important;word-spacing:.26em!important}[data-lt-spacing="2"] [data-read],[data-lt-spacing="2"] [data-read-along-text]{max-width:54ch!important;margin-inline:auto}',
    // Letters: the device's own fonts. Buttons and fields take the page's font (font:inherit).
    '[data-lt-font="1"] body,[data-tool=font-1]{font-family:Lexend,system-ui,sans-serif}[data-lt-font="2"] body,[data-tool=font-2]{font-family:"Atkinson Hyperlegible",system-ui,sans-serif}',
    '[data-lt-font="3"] body,[data-tool=font-3]{font-family:Georgia,"Times New Roman",Times,serif}[data-lt-font="4"] body,[data-tool=font-4]{font-family:"Comic Sans MS","Comic Sans","Chalkboard SE","Comic Neue","Comic Relief",system-ui,sans-serif}',
    '[data-lt-font="5"] body,[data-tool=font-5]{font-family:ui-monospace,"SF Mono",Consolas,monospace}[data-lt-font="6"] body,[data-tool=font-6]{font-family:"OpenDyslexic","OpenDyslexic3","Atkinson Hyperlegible",system-ui,sans-serif}',
    '.lt-top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0 0 8px}.lt-bar{display:flex;justify-content:flex-end;align-items:center;gap:8px;margin:0 0 8px}.lt-panel{clear:both;display:flex;flex-direction:column}.lt-panel:not(.lt-m) [data-tool-group=lens]{display:none}.lt-more{margin:8px 0;border-top:1px solid var(--line);order:1}.lt-panel [data-tool-group=lens]{order:2}.lt-panel>.row:last-child{order:3}.lt-h,.lt-l{font-weight:700;margin:0;min-width:7em}@media (max-width:480px){.lt-g .lt-l{flex-basis:100%}}',
    '.lt-g{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}.lt-g p{flex-basis:100%;margin:0}.lt-panel [aria-pressed=true]{background:var(--accent);color:var(--accent-ink)}',
    '.lt-read{position:relative}.lt-shade,.lt-line{position:absolute;left:0;right:0;pointer-events:none}.lt-shade{top:0;bottom:0}.lt-line{outline:3px solid var(--accent);border-radius:6px}',
    '.lt-ruler{position:fixed;left:0;right:0;height:2.4em;pointer-events:none;z-index:40;transform:translateY(-50%);background:rgba(254,240,138,.36);border-top:2px solid rgba(202,138,4,.75);border-bottom:2px solid rgba(202,138,4,.75)}.lt-ruler[data-ruler-size=tall]{height:4.4em}.lt-ruler[data-ruler-tint=sky]{background:rgba(125,211,252,.32);border-color:rgba(2,132,199,.75)}.lt-ruler[data-ruler-tint=rose]{background:rgba(253,164,175,.32);border-color:rgba(225,29,72,.7)}.lt-ruler[data-ruler-tint=mint]{background:rgba(134,239,172,.32);border-color:rgba(22,163,74,.7)}.lt-ruler[data-ruler-tint=line]{height:0!important;background:none;border-top:0;border-bottom:3px solid var(--accent)}.lt-ruler-sub{display:flex;flex-wrap:wrap;align-items:center;gap:6px;flex-basis:100%;margin-top:4px}.lt-ruler-sub button{min-height:34px;padding:4px 9px;font-size:.86rem}',
    '.lt-lens{position:fixed;z-index:1;width:180px;height:180px;border:3px solid;border-radius:50%;overflow:hidden;pointer-events:none;background:var(--bg);box-shadow:0 4px 16px #0006}.lt-lens>main{position:absolute;left:0;top:0;margin:0;max-width:none;transform-origin:0 0}',
    '.lt-grip{position:fixed;z-index:2;padding:0;border-radius:50%;background:var(--accent);color:var(--accent-ink);pointer-events:none}.lt-grip[data-touch]{pointer-events:auto;touch-action:none}',
    '.ra-bionic{font-weight:800}',
    '.lt-custom-colors{display:flex;flex-wrap:wrap;align-items:center;gap:10px;flex-basis:100%;margin-top:4px}.lt-custom-colors label{display:inline-flex;align-items:center;gap:6px;margin:0;font-size:.92rem}.lt-custom-colors input[type=color]{width:38px;min-height:38px;padding:2px;border-radius:8px;cursor:pointer}.lt-custom-size{display:flex;flex-wrap:wrap;align-items:center;gap:8px;flex-basis:100%;margin-top:4px;font-size:.92rem}.lt-custom-size input[type=range]{width:140px;min-height:36px;padding:0;border:0}',
    '@media (forced-colors:active){[data-tool-group=colors]{display:none!important}.lt-line,.lt-panel [aria-pressed=true]{outline:3px solid Highlight}.ra-word-active,.choice.right::after,.progress span{forced-color-adjust:none;background:Highlight;color:HighlightText}[data-feedback]:not(:empty)::before,.done-star::after{forced-color-adjust:none;background:Highlight;color:HighlightText}}@media print{.lt-bar,.lt-panel,.lt-lens,.lt-ruler,.ra-mic-bar,.ra-resume-bar,.ra-def-box{display:none!important}}',
    // 2026-11-13/19: printed with backgrounds off (including Dark / High Contrast), force dark ink on white paper.
    '@media print{:root,[data-lt-colors]{--bg:#fff;--card:#fff;--ink:#000;--muted:#333;--line:#999;--soft:#f5f5f5;--ok:#000;--ok-bg:#fff;--warn:#000;--warn-bg:#fff;color-scheme:light}button.primary{color:inherit;box-shadow:none}}',
  ].join('\n');

  var RA_POS_CSS = [
    ':root{--pos-n:#6d28d9;--pos-v:#0f766e;--pos-j:#1d4ed8;--pos-a:#b45309;--pos-p:#7c3aed;--pos-r:#0e7490;--pos-c:#be185d}',
    '[data-lt-colors="1"],[data-lt-colors="3"]{--pos-n:#e9d5ff;--pos-v:#99f6e4;--pos-j:#bfdbfe;--pos-a:#fde68a;--pos-p:#ddd6fe;--pos-r:#a5f3fc;--pos-c:#fbcfe8}',
    '[data-pos-scheme=fitzgerald]{--pos-n:#c2410c;--pos-v:#15803d;--pos-j:#1d4ed8;--pos-a:#78350f;--pos-p:#a16207;--pos-r:#be185d;--pos-c:#0f766e}',
    '[data-lt-colors="1"] [data-pos-scheme=fitzgerald],[data-lt-colors="3"] [data-pos-scheme=fitzgerald]{--pos-n:#fdba74;--pos-v:#86efac;--pos-j:#93c5fd;--pos-a:#d6b48c;--pos-p:#fde047;--pos-r:#f9a8d4;--pos-c:#5eead4}',
    '[data-pos-scheme=montessori]{--pos-n:#1f2937;--pos-v:#b91c1c;--pos-j:#1e3a8a;--pos-a:#c2410c;--pos-p:#6d28d9;--pos-r:#15803d;--pos-c:#be185d}',
    '[data-lt-colors="1"] [data-pos-scheme=montessori],[data-lt-colors="3"] [data-pos-scheme=montessori]{--pos-n:#e5e7eb;--pos-v:#fca5a5;--pos-j:#93c5fd;--pos-a:#fdba74;--pos-p:#d8b4fe;--pos-r:#86efac;--pos-c:#f9a8d4}',
    '[data-pos-scheme=okabe]{--pos-n:#0072b2;--pos-v:#d55e00;--pos-j:#009e73;--pos-a:#cc79a7;--pos-p:#b45309;--pos-r:#0369a1;--pos-c:#581c87}',
    '[data-lt-colors="1"] [data-pos-scheme=okabe],[data-lt-colors="3"] [data-pos-scheme=okabe]{--pos-n:#56b4e9;--pos-v:#f0e442;--pos-j:#66e0b8;--pos-a:#f4b6d8;--pos-p:#fdb863;--pos-r:#93c5fd;--pos-c:#d8b4fe}',
    '[data-pos-scheme=mono]{--pos-n:currentColor;--pos-v:currentColor;--pos-j:currentColor;--pos-a:currentColor;--pos-p:currentColor;--pos-r:currentColor;--pos-c:currentColor}',
    '.ra-pos-legend{display:flex;flex-wrap:wrap;gap:10px 8px;align-items:center;margin:6px 0 10px;font-size:.95rem}.ra-pos{border-radius:3px;padding:0 1px}.ra-pos-pill{min-height:36px;padding:4px 10px;font-size:.9rem;background:var(--card);border:1px solid var(--line)}.ra-pos-pill[data-pos-filter][aria-pressed=false]{opacity:.45;text-decoration:line-through}.ra-pos-pill[data-pos-labels][aria-pressed=false]{opacity:.85}.ra-pos-sel{min-height:34px;font:inherit;font-size:.86rem;padding:3px 7px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--ink)}',
    '.ra-pos-n{color:var(--pos-n);border-bottom:2px solid var(--pos-n)}.ra-pos-v{color:var(--pos-v);border-bottom:3px double var(--pos-v)}.ra-pos-j{color:var(--pos-j);border-bottom:2px dashed var(--pos-j)}.ra-pos-a{color:var(--pos-a);border-bottom:2px dotted var(--pos-a)}.ra-pos-p{color:var(--pos-p);border-bottom:2px solid var(--pos-p)}.ra-pos-r{color:var(--pos-r);border-bottom:2px dashed var(--pos-r)}.ra-pos-c{color:var(--pos-c);border-bottom:2px dotted var(--pos-c)}',
    '[data-pos-style=pill] .ra-pos{border-bottom:0;border-radius:6px;padding:1px 5px;background:color-mix(in srgb,currentColor 14%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,currentColor 40%,transparent)}',
    '[data-pos-tags="1"] [data-pos-tag],[data-pos-style=tags] [data-pos-tag],[data-pos-scheme=mono] [data-pos-tag]{white-space:nowrap}[data-pos-tags="1"] [data-pos-tag]::after,[data-pos-style=tags] [data-pos-tag]::after,[data-pos-scheme=mono] [data-pos-tag]::after{content:"\\00a0" attr(data-pos-tag);font-size:.56em;font-weight:700;vertical-align:super;opacity:.88}',
  ].join('\n');

  var RA_CHECKS_CSS = '.ra-checks{margin:14px 0;padding:14px 16px;border:1px solid var(--line);border-radius:14px;background:var(--soft)}.ra-checks h3{margin:0 0 10px;font-size:1.08rem}.ra-chk-q{margin:10px 0;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--card)}.ra-chk-p{margin:0 0 8px;font-weight:700}.ra-chk-opts{display:flex;flex-wrap:wrap;gap:8px}.ra-chk-opts button{min-height:40px;padding:6px 12px;border-radius:10px;background:var(--bg);text-align:start}.ra-chk-opts button[aria-pressed=true]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}.ra-chk-fb{margin:8px 0 0;font-weight:700;font-size:.94rem}.ra-chk-fb[data-ok="1"]{color:var(--ok)}.ra-chk-fb[data-ok="0"]{color:var(--warn)}.ra-chk-open{width:100%;min-height:76px;font:inherit;padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink);resize:vertical}';

  var RA_CSS = [
    '.ra-word-active{background:var(--accent);color:var(--accent-ink);border-radius:4px;padding:0 2px}.ra-resume-bar{margin:8px 0 12px;padding:12px 14px;border:1px solid var(--accent);border-radius:12px;background:var(--soft)}',
    '.ra-def-word{text-decoration:underline dotted var(--accent);text-underline-offset:.2em;cursor:help}.ra-def-box{margin:10px 0 12px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--soft)}.ra-def-card{margin:0 0 10px}.ra-def-layout{display:flex;align-items:flex-start;gap:12px}.ra-def-img{width:76px;height:76px;object-fit:contain;border-radius:10px;background:#fff;border:1px solid var(--line);padding:4px;flex-shrink:0}.ra-def-body{min-width:0;flex:1}.ra-def-head{margin:0;font-weight:700}.ra-def-picks{display:flex;flex-wrap:wrap;gap:6px}.ra-def-pick{min-height:36px;padding:4px 10px;font-size:.9rem}.ra-def-pick[aria-pressed=true]{background:var(--accent);color:var(--accent-ink)}',
    '.ra-overlay{position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;gap:12px;padding:16px;background:var(--bg);color:var(--ink);overflow:auto}.ra-ov-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.ra-ov-controls{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.ra-ov-range{display:inline-flex;align-items:center;gap:6px;margin:0;font-weight:600}.ra-ov-range input[type=range]{width:110px;min-height:36px;padding:0;border:0}.ra-ov-range select{min-height:40px;font:inherit;padding:4px 8px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--ink)}',
    '.ra-rsvp-stage{flex:1;min-height:180px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:clamp(2rem,6vw,3.5rem);font-weight:600;border:1px solid var(--line);border-radius:16px;padding:24px;background:var(--card);position:relative}.ra-rsvp-orp{color:var(--warn);font-weight:900;text-decoration:underline}.ra-rsvp-countdown{font-size:clamp(4rem,14vw,7rem);font-weight:900;color:var(--accent)}.ra-rsvp-swatches{display:inline-flex;align-items:center;gap:7px;margin-inline-start:4px}.ra-rsvp-swatch{width:28px;min-width:28px;height:28px;min-height:28px;padding:0;border-radius:50%;border:2px solid transparent}.ra-rsvp-swatch[aria-pressed=true]{border-color:var(--ink);transform:scale(1.12)}',
    '.ra-crawl-view{flex:1;min-height:220px;overflow:hidden;position:relative;border-radius:14px;padding:24px;perspective:360px;cursor:pointer}.ra-crawl-text{max-width:34rem;margin:0 auto;font-size:clamp(1.35rem,3vw,2rem);line-height:1.8;font-weight:700;transform-origin:50% 100%}.ra-crawl-view:not(.is-flat) .ra-crawl-text{position:absolute;left:0;right:0;top:100%;padding:0 16px;transform:rotateX(18deg)}.ra-crawl-view.is-flat{overflow:auto;perspective:none}.ra-crawl-page-sep{margin:1.2em 0 .6em;font-size:.7em;letter-spacing:.08em;text-transform:uppercase;opacity:.75;border-top:1px solid currentColor;padding-top:.5em}.ra-crawl-h{margin:.9em 0 .35em;line-height:1.3}.ra-crawl-h1{font-size:1.3em}.ra-crawl-h2{font-size:1.15em}.ra-crawl-end{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:rgba(0,0,0,.72);text-align:center;padding:20px}.ra-crawl-end h3{margin:0;font-size:clamp(1.8rem,4vw,2.6rem);letter-spacing:.14em}',
    '.ra-page-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 6px}.ra-page-jump{min-height:36px;max-width:220px;font:inherit;font-size:.9rem;padding:4px 8px;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--ink)}.ra-bookmark-btn{min-height:36px;padding:4px 10px;font-size:.88rem;border-radius:999px;border:1px solid var(--line);background:var(--card)}.ra-bookmark-btn[aria-pressed=true]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}.ra-jump-note{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:8px 0;padding:8px 12px;border:1px solid var(--accent);border-radius:10px;background:var(--soft);font-size:.92rem}.ra-jump-note button{min-height:36px;padding:4px 10px;font-size:.88rem}',
    '.ra-mic-mode{min-height:40px;font:inherit;font-size:.92rem;padding:6px 10px;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--ink)}.ra-ov-scope{min-height:36px;font:inherit;font-size:.9rem;padding:4px 8px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--ink)}.ra-ov-progress{margin:0}.ra-print-all{display:none}',
    '.ra-dock.is-sticky{position:sticky;top:0;z-index:5;background:var(--bg);padding:6px 0;border-bottom:1px solid var(--line);margin-bottom:6px}.ra-bar-main{display:flex;flex-wrap:wrap;align-items:center;gap:10px 8px;margin:6px 0}.ra-tools-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px 8px;margin:6px 0 10px;padding:10px;border:1px solid var(--line);border-radius:12px;background:var(--soft)}.ra-extra-tools{display:flex;flex-wrap:wrap;align-items:center;gap:10px 8px;flex-basis:100%;padding-top:8px;border-top:1px dashed var(--line)}.ra-tools-bar button{min-height:38px;padding:6px 11px;font-size:.92rem;border-radius:999px;background:var(--card)}.ra-tools-bar button[aria-pressed=true]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}',
    '.ra-tap-bar{display:inline-flex;flex-wrap:wrap;align-items:center;gap:4px;padding:3px 6px;border:1px solid var(--line);border-radius:999px;background:var(--card)}.ra-tap-bar>span{font-size:.82rem;font-weight:700;color:var(--muted);padding:0 4px}.ra-tap-bar button{min-height:34px;padding:4px 10px;font-size:.86rem;border-radius:999px}',
    '.ra-progress{height:5px;border-radius:999px;background:var(--soft);overflow:hidden;margin:4px 0 8px}.ra-progress-fill{display:block;height:100%;background:var(--accent)}',
    '.ra-sounds-card{margin:10px 0 12px;padding:12px 14px;border:1px solid var(--accent);border-radius:12px;background:var(--soft)}.ra-syl-tiles{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.ra-syl-tile{display:inline-block;padding:6px 12px;border-radius:10px;background:var(--card);border:2px solid var(--accent);font-weight:800;font-size:1.25rem}',
    '.ra-keys-hint{margin:8px 0;font-size:.88rem;color:var(--muted)}.ra-keys-hint summary{cursor:pointer;font-weight:600}.ra-keys-hint p{margin:6px 0 0}',
    '[data-read-along-text] button[data-read-along-line]:hover{background:var(--hover)}[data-chunk-mood="popin"] [data-read-along-line]:not([hidden]){font-weight:700;letter-spacing:.01em}[data-chunk-mood="pulse"] [data-read-along-line]:not([hidden]){box-shadow:0 0 0 3px var(--ok-bg),0 0 0 5px var(--accent);border-radius:10px}',
    '.ra-mic-bar{margin:12px 0;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--soft)}.ra-mic-bar .row{margin:0 0 6px}.ra-mic-note{margin:4px 0 0;font-size:.92rem}',
    '@media print{[data-has-print-all] [data-read-along-text],[data-has-print-all] [data-read-along-dock],[data-has-print-all] [data-read-along-tools-bar],[data-has-print-all] [data-read-along-page-bar],[data-has-print-all] [data-read-along-chunk-nav],[data-has-print-all] [data-read-along-keys-hint],[data-has-print-all] [data-read-along-overlay-jump]{display:none!important}[data-has-print-all] .ra-print-all{display:block!important}.ra-print-page{margin:0 0 18px}.ra-print-page-label{font-size:.85rem;font-weight:700;margin:0 0 6px;color:#333}.ra-print-h{font-weight:800;margin:10px 0 4px}.ra-print-p{margin:0 0 10px;line-height:1.7}}',
  ].join('\n');

  // ---------------------------------------------------------------------------
  // Reading tools, in every file (practice, check, math facts): text size,
  // colors, spacing, a reading focus over running text ([data-read]) and a
  // magnifier. They change how the page looks, never the task, so no teacher
  // setting turns them off. While an item is shown (item(rec)) each tool that is
  // on counts once in rec.supports. o = { doc, win, L, el, page (<main>), app
  // (#app), prefs, store(), save() }. Embedded with toString: it uses only o.
  // ---------------------------------------------------------------------------
  function takeHomeTools(o) {
    var doc = o.doc, win = o.win, L = o.L, el = o.el, page = o.page, html = doc.documentElement;
    var NAMES = { size: ['', 'textLarger', 'textLargest', 'textExtraLarge'], colors: ['', 'contrastHigh', 'contrastSoft', 'colorsDark', 'colorsOcean', 'colorsSunny', 'colorsForest', 'colorsRose'], spacing: ['', 'spacingWide', 'spacingExtraWide'], font: ['', 'lettersLexend', 'lettersAtkinson', 'lettersBook', 'lettersRounded', 'lettersMono', 'lettersOpenDyslexic'], focus: ['', 'readingFocus', 'readingFocus', 'readingRuler'], lens: ['', 'magnifier'], choices: ['', 'readChoices'], directions: ['', ''], speed: ['', '', '', '', ''], sounds: ['', 'soundsMore', 'soundsLess'], bold: ['', 'boldStart'], motion: ['', ''] };
    var EXTRA = ['syllables', 'pos', 'posLabels', 'define', 'bold', 'chunk', 'noAuto', 'posHideN', 'posHideV', 'posHideJ', 'posHideA', 'posHideP', 'posHideR', 'posHideC'];
    var RULER_TINTS = ['yellow', 'sky', 'rose', 'mint', 'line'];
    var KEYS = Object.keys(NAMES), p = {}, ep = {}, customBg = '', customInk = '', customSize = 0, rulerTint = 'yellow', rulerSize = 'slim', rulerY = 200, groups = {}, rec = null, text = null, at = 0, painted = '', read = null, noVoiceNote = null, bionicBusy = false;
    var HEX = /^#[0-9a-f]{6}$/i;
    var hexLum = function (h) { return (0.299 * parseInt(h.slice(1, 3), 16) + 0.587 * parseInt(h.slice(3, 5), 16) + 0.114 * parseInt(h.slice(5, 7), 16)) / 255; };
    var mixHex = function (h, to, t) {
      var out = '#';
      for (var i = 1; i < 7; i += 2) {
        var a = parseInt(h.slice(i, i + 2), 16), b = parseInt(to.slice(i, i + 2), 16), v = Math.round(a + (b - a) * t);
        out += (v < 16 ? '0' : '') + v.toString(16);
      }
      return out;
    };
    var def = function (k) { return k === 'directions' && o.directionsOnce ? 1 : 0; };
    var clean = function (raw) {
      KEYS.forEach(function (k) {
        var v = raw && (typeof raw[k] === 'number' || (typeof raw[k] === 'string' && /^\d+$/.test(raw[k]))) ? Math.floor(Number(raw[k])) : -1;
        p[k] = v >= 0 && v < NAMES[k].length ? v : def(k);
      });
      if (raw && raw.speed == null && (raw.slower === 1 || raw.slower === '1')) p.speed = 1;
      EXTRA.forEach(function (k) {
        var v = raw && (raw[k] === 1 || raw[k] === '1') ? 1 : 0;
        ep[k] = v;
      });
      customBg = raw && typeof raw.customBg === 'string' && HEX.test(raw.customBg) ? raw.customBg : '';
      customInk = raw && typeof raw.customInk === 'string' && HEX.test(raw.customInk) ? raw.customInk : '';
      var cs = raw && Number(raw.customSize);
      customSize = cs >= 14 && cs <= 40 ? Math.round(cs) : 0;
      rulerTint = raw && RULER_TINTS.indexOf(raw.rulerTint) >= 0 ? raw.rulerTint : 'yellow';
      rulerSize = raw && raw.rulerSize === 'tall' ? 'tall' : 'slim';
    };
    var bgPicker = null, inkPicker = null, sizeSlider = null, sizeOut = null;
    var mountPickers = function () {
      if (bgPicker) return;
      sizeOut = el('span', { class: 'muted', text: (customSize || 16) + 'px' });
      sizeSlider = el('input', { type: 'range', min: '14', max: '40', step: '1', value: String(customSize || 16), 'aria-label': 'Exact text size', 'data-tool-custom-size': '', on: { input: function () { customSize = Number(sizeSlider.value) || 16; apply(); o.store(); } } });
      bgPicker = el('input', { type: 'color', value: customBg || '#fdfbf7', 'aria-label': 'Custom background color', 'data-tool-custom-bg': '', on: { input: function () { customBg = bgPicker.value; apply(); o.store(); } } });
      inkPicker = el('input', { type: 'color', value: customInk || '#1e293b', 'aria-label': 'Custom text color', 'data-tool-custom-ink': '', on: { input: function () { customInk = inkPicker.value; apply(); o.store(); } } });
      var ref = groups.sounds && groups.sounds.box;
      more.insertBefore(el('label', { class: 'lt-custom-size' }, ['Exact size ', sizeSlider, sizeOut]), ref);
      more.insertBefore(el('div', { class: 'lt-custom-colors' }, [el('label', {}, ['Background ', bgPicker]), el('label', {}, ['Text ', inkPicker])]), ref);
    };
    var showPanel = function (on) { if (on) mountPickers(); panel.hidden = !on; aa.setAttribute('aria-expanded', String(on)); };
    var back = function () { showPanel(false); aa.focus(); };
    var group = function (k, title, names, hint) {
      var g = groups[k] = { buttons: names.map(function (name, v) { return el('button', { type: 'button', 'data-tool': k + '-' + v, on: { click: function () { set(k, v); } }, text: name }); }) };
      return (g.box = el('div', { class: 'lt-g', role: 'group', 'aria-labelledby': 'lt-' + k, 'data-tool-group': k },
        [el('span', { id: 'lt-' + k, class: 'lt-l', text: title })].concat(g.buttons, [hint && el('p', { id: 'lt-' + k + '-hint', class: 'muted', text: hint })])));
    };
    var aa = el('button', { type: 'button', class: 'lt-aa', title: L.tools_button, 'aria-expanded': 'false', 'aria-controls': 'lt-panel', 'data-tools-open': '',
      on: { click: function () { showPanel(panel.hidden); } } }, ['Aa', el('span', { class: 'sr', text: ' ' + L.tools_button })]);
    var more = el('details', { class: 'lt-more', on: { toggle: function () { panel.classList.toggle('lt-m', more.open); } } }, [
      el('summary', { text: L.tools_more || 'More reading tools' }),
      group('sounds', L.tools_sounds, [L.tools_sounds_0, L.tools_sounds_1, L.tools_sounds_2], L.tools_sounds_hint),
      group('bold', L.tools_bold || 'Bold start', [L.tools_off, L.tools_on], L.tools_bold_hint),
      group('motion', L.tools_motion || 'Motion', [L.tools_colors_0 || 'Usual', L.tools_motion_1 || 'Less'], L.tools_motion_hint),
    ]);
    var panel = el('section', { id: 'lt-panel', class: 'card lt-panel', 'aria-labelledby': 'lt-title', hidden: true, 'data-tools': '',
      on: { keydown: function (e) { if (/^Esc/.test(e.key)) { e.preventDefault(); back(); } } } }, [
      el('div', { class: 'lt-top' }, [el('p', { id: 'lt-title', class: 'lt-h', text: L.tools_button }),
        el('button', { type: 'button', 'data-tools-close-top': '', on: { click: back }, text: L.tools_close })]),
      group('size', L.tools_size, [L.tools_normal, L.tools_size_1, L.tools_size_2, L.tools_size_3 || 'Extra large']),
      group('colors', L.tools_colors, [L.tools_colors_0, L.tools_colors_1, L.tools_colors_2, L.tools_colors_3, L.tools_colors_4, L.tools_colors_5, L.tools_colors_6, L.tools_colors_7 || 'Rose']),
      group('spacing', L.tools_spacing, [L.tools_normal, L.tools_spacing_1, L.tools_spacing_2 || 'Extra wide']),
      group('font', L.tools_font, [L.tools_colors_0, L.tools_font_1, L.tools_font_2, L.tools_font_3, L.tools_font_4, L.tools_font_5 || 'Mono', L.tools_font_6 || 'OpenDyslexic']),
      group('focus', L.tools_focus, [L.tools_off, L.tools_focus_1 || L.tools_on, L.tools_focus_2 || '3 lines', L.tools_focus_3 || 'Ruler'], L.tools_focus_hint),
      group('lens', L.tools_lens, [L.tools_off, L.tools_on], L.tools_lens_hint),
      group('choices', L.tools_choices, [L.tools_off, L.tools_on], L.tools_choices_hint),
      group('directions', L.tools_directions, [L.tools_directions_0, L.tools_directions_1], L.tools_directions_hint),
      group('speed', L.tools_speed, [L.tools_speed_0, L.tools_speed_1, L.tools_speed_2 || 'Very slow', L.tools_speed_3 || 'Faster', L.tools_speed_4 || 'Fastest'], L.tools_speed_hint),
      more,
      (noVoiceNote = el('p', { class: 'muted', hidden: true, 'data-tools-no-voice': '', text: L.tools_no_voice })),
      el('div', { class: 'row' }, [
        el('button', { type: 'button', 'data-tools-reset': '', on: { click: function () { clean(); apply(); o.store(); } }, text: L.tools_reset })]),
    ]);
    var rulerTintBtns = RULER_TINTS.map(function (t) {
      var lbl = { yellow: 'Yellow', sky: 'Sky', rose: 'Rose', mint: 'Mint', line: 'Line' }[t];
      return el('button', { type: 'button', 'data-ruler-tint-opt': t, 'aria-pressed': String(t === rulerTint), on: { click: function () { rulerTint = t; apply(); o.store(); } }, text: lbl });
    });
    var rulerSizeBtns = ['slim', 'tall'].map(function (sz) {
      return el('button', { type: 'button', 'data-ruler-size-opt': sz, 'aria-pressed': String(sz === rulerSize), on: { click: function () { rulerSize = sz; apply(); o.store(); } }, text: sz === 'tall' ? 'Tall' : 'Slim' });
    });
    var rulerSub = el('div', { class: 'lt-ruler-sub', 'data-ruler-controls': '', hidden: true }, rulerTintBtns.concat(rulerSizeBtns));
    groups.focus.box.appendChild(rulerSub);
    var ruler = el('div', { class: 'lt-ruler', 'data-reading-ruler': '', 'aria-hidden': 'true', hidden: true });
    var moveRuler = function (y) {
      if (p.focus !== 3) return;
      var H = win.innerHeight || 600;
      rulerY = Math.max(8, Math.min(H - 8, Math.round(y)));
      ruler.style.top = rulerY + 'px';
    };
    var grip = el('button', { type: 'button', class: 'lt-grip', hidden: true, 'aria-label': L.tools_lens_move, 'aria-describedby': 'lt-lens-hint', 'data-lens-grip': '' },
      [el('span', { 'aria-hidden': 'true', text: String.fromCharCode(0x2725) })]);
    var lens = el('div', { class: 'lt-lens', 'aria-hidden': 'true', hidden: true, 'data-lens': '' });
    page.insertBefore(panel, page.firstChild);
    var bar = el('div', { class: 'lt-bar' }, [aa, grip]);
    page.insertBefore(bar, panel);
    doc.body.appendChild(lens);
    doc.body.appendChild(ruler);
    var P = null, touch = false, copy = null, queued = false, drag = null;
    var place = function () {
      queued = false;
      if (!p.lens) return;
      P = P || { x: win.innerWidth / 2, y: win.innerHeight / 2 };
      if (!copy) {
        copy = page.cloneNode(true);
        copy.setAttribute('inert', '');
        var all = copy.querySelectorAll('*'), from = page.querySelectorAll('canvas'), to = copy.querySelectorAll('canvas'), i;
        for (i = 0; i < all.length; i++) {
          all[i].removeAttribute('id'); all[i].removeAttribute('name');
          if (/^(BUTTON|INPUT|SUMMARY)$/.test(all[i].tagName) || all[i].hasAttribute('tabindex')) all[i].setAttribute('tabindex', '-1');
        }
        for (i = 0; i < to.length; i++) { try { to[i].getContext('2d').drawImage(from[i], 0, 0); } catch (_) {} }
        var cg = copy.querySelector('.lt-grip'); if (cg) cg.remove();
        lens.textContent = '';
        lens.appendChild(copy);
      }
      var box = page.getBoundingClientRect(), W = win.innerWidth || 0, H = win.innerHeight || 0;
      var cl = function (v, hi) { return hi > 0 ? Math.max(0, Math.min(hi, v)) : v; };
      var lx = cl(P.x - 90, W - 180), ly = cl(P.y - (touch ? 120 : 0) - 90, H - 180);
      lens.style.left = lx + 'px'; lens.style.top = ly + 'px';
      copy.style.width = box.width + 'px';
      copy.style.transform = 'translate(' + (87 - 2 * (P.x - box.left)) + 'px,' + (87 - 2 * (P.y - box.top)) + 'px) scale(2)';
      grip.style.left = cl(P.x + (touch ? -24 : 40), W - 48) + 'px'; grip.style.top = cl(touch ? P.y + 14 : ly + 130, H - 48) + 'px';
      if (touch) grip.setAttribute('data-touch', ''); else grip.removeAttribute('data-touch');
    };
    var queue = function () {
      if (queued || !p.lens) return;
      queued = true;
      if (win.requestAnimationFrame) win.requestAnimationFrame(place); else win.setTimeout(place, 16);
    };
    // Reading focus: one line in a band, the rest dimmed.
    var shade = el('div', { class: 'lt-shade', 'aria-hidden': 'true' }), line = el('div', { class: 'lt-line', 'aria-hidden': 'true' });
    var lines = function () {
      var out = [], base = text.getBoundingClientRect(), range = doc.createRange(), walk = doc.createTreeWalker(text, 4), n, r, i, j, hit;
      while ((n = walk.nextNode())) {
        if (!/\S/.test(n.nodeValue) || n.parentNode.closest('.sr')) continue;
        range.selectNodeContents(n);
        for (r = range.getClientRects ? range.getClientRects() : [], i = 0; i < r.length; i++) {
          var t = r[i].top - base.top, b = r[i].bottom - base.top;
          for (hit = null, j = 0; j < out.length; j++) if (t < out[j].b - 4 && b > out[j].t + 4) hit = out[j];
          if (hit) { hit.t = Math.min(hit.t, t); hit.b = Math.max(hit.b, b); } else if (b - t >= 4) out.push({ t: t, b: b });
        }
      }
      return out.sort(function (x, y) { return x.t - y.t; });
    };
    var paint = function () {
      var dark = customBg ? hexLum(customBg) < 0.45 : (p.colors === 1 || p.colors === 3);
      if (!customBg && !dark && !p.colors) { try { dark = !!(win.matchMedia && win.matchMedia('(prefers-color-scheme:dark)').matches); } catch (_) {} }
      var all = lines(), l = all[at = Math.max(0, Math.min(all.length - 1, at))], dim = dark ? 'rgba(0,0,0,.72)' : 'rgba(0,0,0,.45)';
      line.hidden = !l;
      if (!l) { shade.style.background = 'none'; return; }
      var span = p.focus === 2 ? 1 : 0;
      var lTop = all[Math.max(0, at - span)], lBot = all[Math.min(all.length - 1, at + span)];
      var pad = Math.round((parseFloat(win.getComputedStyle(text).fontSize) || 16) / 5), t = Math.max(0, Math.round(lTop.t) - pad), b = Math.round(lBot.b) + pad;
      shade.style.background = 'linear-gradient(' + dim + ' ' + t + 'px,transparent ' + t + 'px,transparent ' + b + 'px,' + dim + ' ' + b + 'px)';
      line.style.top = t + 'px'; line.style.height = b - t + 'px';
      // The lens copy follows the band.
      if (painted !== t + ',' + b) { painted = t + ',' + b; copy = null; queue(); }
    };
    var nearest = function (y) {
      var top = text.getBoundingClientRect().top, gap = Infinity;
      lines().forEach(function (l, i) { var d = Math.abs(top + (l.t + l.b) / 2 - y); if (d < gap) { gap = d; at = i; } });
      paint();
    };
    var scan = function () {
      var found = o.app.querySelector('[data-read]'), host = shade.parentNode, on;
      if (found !== text) { text = found; at = 0; }
      if (groups.focus.box.hidden !== !text) groups.focus.box.hidden = !text;
      on = !!text && (p.focus === 1 || p.focus === 2);
      if (host && (!on || host !== text)) {
        host.classList.remove('lt-read'); host.removeChild(shade); host.removeChild(line);
        if (host.hasAttribute('data-lt-tab')) { host.removeAttribute('tabindex'); host.removeAttribute('data-lt-tab'); }
      }
      if (on && shade.parentNode !== text) {
        text.classList.add('lt-read'); text.appendChild(shade); text.appendChild(line);
        if (!text.hasAttribute('tabindex')) { text.setAttribute('tabindex', '0'); text.setAttribute('data-lt-tab', ''); }
      }
      // The band follows the part being read aloud (a read-along's sentence). The student can still move it.
      var now = on ? text.querySelector('[aria-current=true]') : null, box = now !== read && now && now.getClientRects ? now.getClientRects()[0] : null;
      read = now;
      if (box) nearest(box.top + box.height / 2); else if (on) paint();
    };
    var SKIP_BIONIC = 'script,style,textarea,input,select,option,code,pre,svg,math,.sr,.lt-shade,.lt-line,.ra-bionic,[data-lt-bionic],[data-read-along-text],[aria-hidden=true],[data-seg-tile],[data-seg-box],[data-map-tile],[data-map-slot],[data-ws-tile],[data-ws-box],[data-key],[data-sr-symbol]';
    var clearBold = function () {
      var list = o.app.querySelectorAll('[data-lt-bionic]');
      if (!list.length) return;
      bionicBusy = true;
      try {
        for (var i = 0; i < list.length; i++) {
          var node = list[i], par = node.parentNode;
          if (!par) continue;
          par.replaceChild(doc.createTextNode(node.textContent || ''), node);
          try { par.normalize(); } catch (_) {}
        }
      } finally { bionicBusy = false; }
    };
    var paintBold = function () {
      if (!p.bold) { clearBold(); return; }
      bionicBusy = true;
      try {
        var walk = doc.createTreeWalker(o.app, 4), hits = [], n;
        while ((n = walk.nextNode())) {
          var par = n.parentNode;
          if (!par || !n.nodeValue || !/[A-Za-z\u00C0-\u024F]{2,}/.test(n.nodeValue)) continue;
          if (par.closest && (par.closest(SKIP_BIONIC) || par.closest('button'))) continue;
          hits.push(n);
        }
        hits.forEach(function (tn) {
          var par = tn.parentNode;
          if (!par) return;
          var raw = tn.nodeValue, wrap = el('span', { 'data-lt-bionic': '1' });
          var re = /[A-Za-z\u00C0-\u024F]+/g, m, last = 0;
          while ((m = re.exec(raw))) {
            if (m.index > last) wrap.appendChild(doc.createTextNode(raw.slice(last, m.index)));
            var w = m[0];
            if (w.length < 2) { wrap.appendChild(doc.createTextNode(w)); }
            else {
              var cut = Math.max(1, Math.ceil(w.length * 0.4));
              wrap.appendChild(el('strong', { class: 'ra-bionic', text: w.slice(0, cut) }));
              if (cut < w.length) wrap.appendChild(doc.createTextNode(w.slice(cut)));
            }
            last = m.index + w.length;
          }
          if (last < raw.length) wrap.appendChild(doc.createTextNode(raw.slice(last)));
          par.replaceChild(wrap, tn);
        });
      } finally { bionicBusy = false; }
    };
    var mark = function () {
      if (!rec) return;
      var s = rec.supports = rec.supports && typeof rec.supports === 'object' ? rec.supports : {}, changed = false, forced = false;
      try { forced = win.matchMedia('(forced-colors: active)').matches; } catch (_) {}
      [NAMES.size[p.size], forced ? '' : NAMES.colors[p.colors], NAMES.spacing[p.spacing], NAMES.font[p.font], text ? NAMES.focus[p.focus] : '', NAMES.lens[p.lens], o.choices ? NAMES.choices[p.choices] : '', o.sounds ? NAMES.sounds[p.sounds] : '', NAMES.bold[p.bold]].forEach(function (n) {
        if (n && !s[n]) { s[n] = 1; changed = true; }
      });
      if (changed) o.save();
    };
    var apply = function () {
      ['size', 'colors', 'spacing', 'font', 'bold', 'motion'].forEach(function (k) { if (p[k]) html.setAttribute('data-lt-' + k, p[k]); else html.removeAttribute('data-lt-' + k); });
      ep.bold = p.bold ? 1 : 0;
      if (customSize) html.style.fontSize = customSize + 'px';
      else html.style.removeProperty('font-size');
      if (sizeSlider) sizeSlider.value = String(customSize || [16, 20, 24, 28][p.size] || 16);
      if (sizeOut) sizeOut.textContent = (customSize || [16, 20, 24, 28][p.size] || 16) + 'px';
      if (customBg) {
        var dk = hexLum(customBg) < 0.45;
        html.style.setProperty('--bg', customBg);
        html.style.setProperty('--card', mixHex(customBg, '#ffffff', dk ? 0.06 : 0.35));
        html.style.setProperty('--soft', mixHex(customBg, dk ? '#ffffff' : '#000000', dk ? 0.14 : 0.07));
        html.style.setProperty('--line', mixHex(customBg, dk ? '#ffffff' : '#000000', dk ? 0.3 : 0.22));
        html.style.setProperty('--muted', customInk ? mixHex(customInk, customBg, 0.25) : (dk ? '#cbd5e1' : '#4a5468'));
        html.style.setProperty('--ink', customInk || (dk ? '#f1f5f9' : '#1d2433'));
        html.style.setProperty('color-scheme', dk ? 'dark' : 'light');
      } else {
        ['--bg', '--card', '--soft', '--line', '--muted', 'color-scheme'].forEach(function (v) { html.style.removeProperty(v); });
        if (customInk) html.style.setProperty('--ink', customInk);
        else html.style.removeProperty('--ink');
      }
      if (bgPicker) bgPicker.value = customBg || '#fdfbf7';
      if (inkPicker) inkPicker.value = customInk || '#1e293b';
      KEYS.forEach(function (k) { groups[k].buttons.forEach(function (b, v) { b.setAttribute('aria-pressed', String(v === p[k])); }); });
      var isRuler = p.focus === 3;
      rulerSub.hidden = !isRuler;
      ruler.hidden = !isRuler;
      ruler.setAttribute('data-ruler-tint', rulerTint);
      ruler.setAttribute('data-ruler-size', rulerSize);
      if (isRuler) moveRuler(rulerY);
      rulerTintBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-ruler-tint-opt') === rulerTint)); });
      rulerSizeBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-ruler-size-opt') === rulerSize)); });
      grip.hidden = lens.hidden = !p.lens;
      copy = drag = null;
      if (!p.lens) lens.textContent = '';
      if (typeof o.onSpeed === 'function') o.onSpeed(o.speed ? ([1, 0.8, 0.6, 1.25, 1.5][p.speed] || 1) : 1);
      paintBold();
      scan(); queue(); mark();
    };
    var set = function (k, v) {
      if (k === 'colors') { customBg = ''; customInk = ''; }
      if (k === 'size') customSize = 0;
      p[k] = v; apply(); o.store();
    };
    if (win.MutationObserver) new win.MutationObserver(function (list) {
      if (bionicBusy) return;
      if (!list.some(function (m) { return m.target !== shade && m.target !== line && m.target !== grip; })) return;
      if (p.bold) paintBold();
      scan(); copy = null; queue();
    }).observe(page, { childList: true, subtree: true, attributes: true, characterData: true });
    doc.addEventListener('input', function () { copy = null; queue(); }, true);
    var follow = function (e) { if ((p.focus === 1 || p.focus === 2) && text && text.contains(e.target)) nearest(e.clientY); };
    doc.addEventListener('pointermove', function (e) {
      if (p.focus === 3 && typeof e.clientY === 'number') moveRuler(e.clientY);
      if (drag && e.pointerId === drag.id) { P = { x: e.clientX + drag.x, y: e.clientY + drag.y }; queue(); }
      else if (e.pointerType === 'mouse') { touch = false; P = { x: e.clientX, y: e.clientY }; queue(); follow(e); }
    }, true);
    doc.addEventListener('touchmove', function (e) {
      if (p.focus === 3 && e.touches && e.touches[0]) moveRuler(e.touches[0].clientY);
    }, { passive: true, capture: true });
    doc.addEventListener('pointerdown', function (e) {
      if (p.focus === 3 && typeof e.clientY === 'number' && !panel.contains(e.target)) moveRuler(e.clientY);
      if (grip.contains(e.target)) return;
      if (e.pointerType !== 'mouse') { touch = true; P = { x: e.clientX, y: e.clientY }; queue(); }
      follow(e);
    }, true);
    grip.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      drag = { id: e.pointerId, x: P.x - e.clientX, y: P.y - e.clientY };
      try { grip.setPointerCapture(e.pointerId); } catch (_) {}
    });
    ['pointerup', 'pointercancel'].forEach(function (name) { grip.addEventListener(name, function () { drag = null; }); });
    grip.addEventListener('focus', function () { touch = false; queue(); });
    var STEP = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    doc.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing || e.keyCode === 229) return;
      var d = Object.prototype.hasOwnProperty.call(STEP, e.key) ? STEP[e.key] : null, n = e.shiftKey ? 60 : 20;
      if (d && e.target === grip && P) {
        touch = false;
        P = { x: Math.max(0, Math.min(win.innerWidth, P.x + d[0] * n)), y: Math.max(0, Math.min(win.innerHeight, P.y + d[1] * n)) };
        queue();
      } else if (d && !d[0] && p.focus === 3 && !(e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) { moveRuler(rulerY + d[1] * n); }
      else if (d && !d[0] && (p.focus === 1 || p.focus === 2) && text && e.target === text) { at += d[1]; paint(); }
      else if (/^Esc/.test(String(e.key || '')) && p.lens) { set('lens', 0); if (e.target === grip) aa.focus(); }
      else return;
      e.preventDefault();
    });
    win.addEventListener('scroll', queue, true);
    win.addEventListener('resize', function () { copy = null; queue(); if (p.focus && text) paint(); });
    groups.choices.box.hidden = !o.choices;
    groups.directions.box.hidden = !o.directions;
    groups.speed.box.hidden = !o.speed;
    groups.sounds.box.hidden = !o.sounds;
    clean(o.prefs);
    // Letters use the device's own fonts (a file loads nothing). Rounded and OpenDyslexic are offered only where the device has such
    // a font: a wide word is measured with and without it.
    var rounded = false, dyslexic = false;
    try {
      var probe = el('span', { style: 'position:absolute;visibility:hidden;white-space:nowrap;font-size:72px', text: 'mmmmmmmmmmlli' });
      doc.body.appendChild(probe);
      probe.style.fontFamily = 'monospace';
      var plain = probe.offsetWidth;
      probe.style.fontFamily = '"Comic Sans MS","Comic Sans","Chalkboard SE","Comic Neue","Comic Relief",monospace';
      rounded = probe.offsetWidth !== plain;
      probe.style.fontFamily = '"OpenDyslexic","OpenDyslexic3",monospace';
      dyslexic = probe.offsetWidth !== plain;
      doc.body.removeChild(probe);
    } catch (_) {}
    groups.font.buttons[4].hidden = !rounded;
    if (!rounded && p.font === 4) p.font = 0;
    if (groups.font.buttons[6]) groups.font.buttons[6].hidden = !dyslexic;
    if (!dyslexic && p.font === 6) p.font = 0;
    apply();
    return {
      item: function (r) { rec = r && !r.done ? r : null; if (p.bold) paintBold(); scan(); mark(); },
      dock: function (h) { h.parentNode.insertBefore(bar, h.nextSibling); h.parentNode.insertBefore(panel, bar.nextSibling); },
      autoRead: function () { return !!o.choices && p.choices === 1; },
      directionsOnce: function () { return !!o.directions && p.directions === 1; },
      slow: function () { return !!o.speed && p.speed === 1; },
      speedRate: function () { return o.speed ? ([1, 0.8, 0.6, 1.25, 1.5][p.speed] || 1) : 1; },
      reducedMotion: function () { return p.motion === 1; },
      noVoice: function (on) { if (noVoiceNote) noVoiceNote.hidden = !on; },
      soundGap: function () { return o.sounds ? [500, 800, 250][p.sounds] || 500 : 500; },
      getExtra: function (k) { return k === 'bold' ? (p.bold ? 1 : 0) : (EXTRA.indexOf(k) >= 0 ? (ep[k] || 0) : null); },
      setExtra: function (k, v) { if (k === 'bold') { set('bold', v ? 1 : 0); return; } if (EXTRA.indexOf(k) < 0) return; ep[k] = v ? 1 : 0; o.store(); },
      prefs: function () {
        var out = null;
        KEYS.forEach(function (k) { if (p[k] !== def(k)) (out = out || {})[k] = p[k]; });
        EXTRA.forEach(function (k) { if (k !== 'bold' && ep[k]) (out = out || {})[k] = ep[k]; });
        if (customBg) (out = out || {}).customBg = customBg;
        if (customInk) (out = out || {}).customInk = customInk;
        if (customSize) (out = out || {}).customSize = customSize;
        if (rulerTint !== 'yellow') (out = out || {}).rulerTint = rulerTint;
        if (rulerSize !== 'slim') (out = out || {}).rulerSize = rulerSize;
        return out;
      },
    };
  }

  // Optional local-only device voice (embedded ONLY when teacher opts into deviceVoice on a read-along file).
  // Strictly uses voices with localService === true so text is never sent to a cloud speech engine.
  function takeHomeDeviceVoice(win, lang, getRate) {
    var syn = win && win.speechSynthesis;
    var want = String(lang || 'en').toLowerCase().split('-')[0];
    var speakGen = 0, fbTimer = 0;
    var clearFb = function () { if (fbTimer && win && win.clearTimeout) { win.clearTimeout(fbTimer); fbTimer = 0; } };
    var pick = function () {
      if (!syn || typeof syn.getVoices !== 'function') return null;
      var list = [];
      try { list = syn.getVoices() || []; } catch (_) { list = []; }
      var local = list.filter(function (v) { return v && v.localService === true; });
      if (!local.length) return null;
      return local.filter(function (v) { return String(v.lang || '').toLowerCase().indexOf(want) === 0; })[0] || local[0];
    };
    var stop = function () { speakGen++; clearFb(); try { if (syn && typeof syn.cancel === 'function') syn.cancel(); } catch (_) {} };
    return {
      available: function () { return !!pick(); },
      stop: stop,
      speak: function (text, onEnd, onWord) {
        var v = pick();
        if (!v || !win.SpeechSynthesisUtterance || !text) { if (onEnd) onEnd(false); return false; }
        stop();
        var mine = ++speakGen;
        var str = String(text);
        var rate = typeof getRate === 'function' ? (getRate() || 1) : 1;
        var u = new win.SpeechSynthesisUtterance(str);
        u.voice = v;
        u.lang = v.lang || lang || 'en';
        u.rate = rate;
        var done = false, gotBoundary = false;
        var fin = function (ok) { if (done) return; done = true; clearFb(); if (mine === speakGen && onEnd) onEnd(ok); };
        if (typeof onWord === 'function') {
          var words = [], m, re = /[A-Za-z\u00C0-\u024F\u00b7]+(?:['\u2019][A-Za-z\u00C0-\u024F\u00b7]+)*/g;
          while ((m = re.exec(str))) words.push({ s: m.index, l: m[0].length });
          if (!words.length) {
            var re2 = /\S+/g;
            while ((m = re2.exec(str))) words.push({ s: m.index, l: m[0].length });
          }
          if (words.length) {
            u.onboundary = function (ev) {
              if (done || mine !== speakGen) return;
              if (ev && ev.name && ev.name !== 'word') return;
              var ci = ev && typeof ev.charIndex === 'number' ? ev.charIndex : -1;
              if (ci < 0) return;
              gotBoundary = true;
              clearFb();
              var wi = 0;
              for (var k = 0; k < words.length; k++) {
                if (words[k].s <= ci) wi = k; else break;
              }
              try { onWord(wi); } catch (_) {}
            };
            var stepFb = function (idx) {
              if (done || mine !== speakGen || gotBoundary || idx >= words.length) return;
              try { onWord(idx); } catch (_) {}
              if (idx + 1 < words.length && win && win.setTimeout) {
                var ms = Math.max(160, Math.round((Math.max(2, words[idx].l) * 58) / Math.max(0.5, rate)));
                fbTimer = win.setTimeout(function () { fbTimer = 0; stepFb(idx + 1); }, ms);
              }
            };
            try { onWord(0); } catch (_) {}
            if (words.length > 1 && win && win.setTimeout) {
              var firstMs = Math.max(220, Math.round((Math.max(2, words[0].l) * 58) / Math.max(0.5, rate)));
              fbTimer = win.setTimeout(function () { fbTimer = 0; stepFb(1); }, firstMs);
            }
          }
        }
        u.onend = function () { fin(true); };
        u.onerror = function () { fin(false); };
        try { syn.speak(u); return true; } catch (_) { fin(false); return false; }
      },
    };
  }

  // Optional local-only student voice practice (embedded ONLY when teacher opts in on a read-along practice file).
  // Click-gated, in-memory blob URLs per sentence/page in RAM sessionCache only, never stored in localStorage, never saved to results, never transmitted.
  function takeHomeStudentMic(doc, win, el, L, opts) {
    var o = opts || {};
    var curIdx = 0, curTotal = 1;
    var pageNum = Math.max(1, Math.floor(Number(o.page) || 1));
    var totalPages = Math.max(1, Math.floor(Number(o.pages) || 1));
    var itemKey = String(o.itemId || ('page-' + pageNum));
    var cache = (o.cache && typeof o.cache === 'object') ? o.cache : null;
    var clips = cache ? (cache.micClips || (cache.micClips = Object.create(null))) : Object.create(null);
    var takeMode = (cache && cache.micMode === 'page') ? 'page' : 'sentence';
    var keyFor = function (mode, idx) { return itemKey + ':' + (mode === 'page' ? 'page' : idx); };
    var modeSel = el('select', { class: 'ra-mic-mode', 'aria-label': L.read_along_rec_scope || 'Recording length', 'data-student-rec-mode': '', hidden: true }, [
      el('option', { value: 'sentence', text: L.read_along_rec_sent || 'This sentence' }),
      el('option', { value: 'page', text: L.read_along_rec_page || 'Whole page' }),
    ]);
    modeSel.value = takeMode;
    var recBtn = el('button', { type: 'button', 'data-student-rec': '', text: L.read_along_rec || 'Record my voice' });
    var playBtn = el('button', { type: 'button', 'data-student-rec-play': '', hidden: true, text: L.read_along_rec_play || 'Play my voice' });
    var saveBtn = el('button', { type: 'button', 'data-student-rec-save': '', hidden: true, text: L.read_along_rec_save || 'Save my recording' });
    var clearBtn = el('button', { type: 'button', 'data-student-rec-clear': '', hidden: true, text: L.read_along_rec_clear || 'Clear' });
    var status = el('p', { class: 'muted ra-mic-note', 'aria-live': 'polite', 'data-student-rec-status': '', text: L.read_along_rec_note || 'Stays on this device only. Nothing is saved or sent.' });
    var wrap = el('div', { class: 'ra-mic-bar', 'data-student-mic': '' }, [
      el('div', { class: 'row' }, [recBtn, modeSel, playBtn, saveBtn, clearBtn]),
      status,
    ]);
    var stream = null, recorder = null, chunks = [], player = null, recording = false, playing = false, timer = 0, alive = true, recTargetKey = '', recTargetMode = 'sentence', recTargetIdx = 0;
    var say = function (tpl, fallback, n) { return String(tpl || fallback).replace(/\{n\}/g, String(n)); };
    var warnRecording = function () {
      status.textContent = L.read_along_rec_busy || 'Stop recording before switching sentences or pages.';
    };
    var syncButtons = function () {
      modeSel.hidden = !(curTotal > 1);
      if (curTotal <= 1 && takeMode === 'page') { takeMode = 'sentence'; modeSel.value = 'sentence'; }
      var clip = clips[keyFor(takeMode, curIdx)] || null;
      playBtn.hidden = !clip;
      saveBtn.hidden = !clip;
      clearBtn.hidden = !clip;
      if (!recording) {
        status.textContent = clip
          ? (takeMode === 'page'
            ? (L.read_along_rec_ready_page || 'Your recording for this page is ready to play back.')
            : say(L.read_along_rec_ready, 'Your recording for sentence {n} is ready to play back.', curIdx + 1))
          : (L.read_along_rec_note || 'Stays on this device only. Nothing is saved or sent.');
      }
    };
    var stopTracks = function () {
      if (timer) { win.clearTimeout(timer); timer = 0; }
      if (stream) { try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (_) {} stream = null; }
    };
    var stopPlay = function () {
      playing = false;
      if (player) { try { player.pause(); player.currentTime = 0; } catch (_) {} player = null; }
      playBtn.textContent = L.read_along_rec_play || 'Play my voice';
    };
    var clearKey = function (key) {
      var existing = clips[key];
      if (existing && existing.url) { try { win.URL.revokeObjectURL(existing.url); } catch (_) {} }
      delete clips[key];
    };
    var clearAll = function () {
      stopPlay();
      Object.keys(clips).forEach(clearKey);
      syncButtons();
    };
    var halt = function () {
      stopPlay();
      if (recorder && recorder.state !== 'inactive') { try { recorder.stop(); } catch (_) {} }
      recording = false;
      modeSel.disabled = false;
      stopTracks();
      recBtn.textContent = L.read_along_rec || 'Record my voice';
    };
    var onLeave = function () {
      alive = false;
      halt();
      if (!cache) clearAll();
    };
    win.addEventListener('pagehide', onLeave);
    win.addEventListener('beforeunload', onLeave);
    if (cache && !cache._micUnloadBound) {
      cache._micUnloadBound = true;
      var revokeCache = function () {
        var map = cache.micClips;
        if (!map) return;
        Object.keys(map).forEach(function (k) {
          if (map[k] && map[k].url) { try { win.URL.revokeObjectURL(map[k].url); } catch (_) {} }
          delete map[k];
        });
      };
      win.addEventListener('pagehide', revokeCache);
      win.addEventListener('beforeunload', revokeCache);
    }
    var unmount = function () {
      alive = false;
      try { win.removeEventListener('pagehide', onLeave); } catch (_) {}
      try { win.removeEventListener('beforeunload', onLeave); } catch (_) {}
      halt();
    };
    modeSel.addEventListener('change', function () {
      if (recording) { modeSel.value = takeMode; warnRecording(); return; }
      stopPlay();
      takeMode = modeSel.value === 'page' ? 'page' : 'sentence';
      if (cache) cache.micMode = takeMode;
      syncButtons();
    });
    recBtn.addEventListener('click', function () {
      if (recording) {
        if (recorder && recorder.state !== 'inactive') { try { recorder.stop(); } catch (_) {} }
        return;
      }
      if (typeof o.onRecordStart === 'function') { try { o.onRecordStart(); } catch (_) {} }
      stopPlay();
      if (typeof o.getSentence === 'function') {
        var info = o.getSentence() || {};
        if (typeof info.index === 'number') curIdx = info.index;
        if (typeof info.total === 'number' && info.total > 0) curTotal = info.total;
      }
      recTargetMode = curTotal > 1 ? takeMode : 'sentence';
      recTargetIdx = curIdx;
      recTargetKey = keyFor(recTargetMode, recTargetIdx);
      var media = win.navigator && win.navigator.mediaDevices;
      if (!media || typeof media.getUserMedia !== 'function' || typeof win.MediaRecorder !== 'function') {
        status.textContent = L.read_along_rec_unsupported || 'This browser cannot record from a microphone here.';
        return;
      }
      recBtn.disabled = true;
      modeSel.disabled = true;
      var asked;
      try { asked = media.getUserMedia({ audio: true }); } catch (err) { asked = Promise.reject(err); }
      Promise.resolve(asked).then(function (s) {
        recBtn.disabled = false;
        if (!alive) { modeSel.disabled = false; try { s.getTracks().forEach(function (t) { t.stop(); }); } catch (_) {} return; }
        stream = s;
        chunks = [];
        try { recorder = new win.MediaRecorder(s); } catch (_) {
          modeSel.disabled = false;
          stopTracks();
          status.textContent = L.read_along_rec_unsupported || 'This browser cannot record from a microphone here.';
          return;
        }
        var failRec = function () {
          recording = false;
          modeSel.disabled = false;
          stopTracks();
          recBtn.textContent = L.read_along_rec || 'Record my voice';
          if (alive) status.textContent = L.read_along_rec_unsupported || 'This browser cannot record from a microphone here.';
        };
        recorder.ondataavailable = function (ev) { if (ev && ev.data && ev.data.size) chunks.push(ev.data); };
        recorder.onerror = failRec;
        recorder.onstop = function () {
          recording = false;
          modeSel.disabled = false;
          stopTracks();
          recBtn.textContent = L.read_along_rec || 'Record my voice';
          if (!alive) return;
          if (!chunks.length) {
            status.textContent = L.read_along_rec_empty || 'Nothing was heard. Try again.';
            return;
          }
          var mime = (chunks[0] && chunks[0].type) || recorder.mimeType || 'audio/webm';
          var blob = new win.Blob(chunks, { type: mime });
          clearKey(recTargetKey);
          clips[recTargetKey] = { url: win.URL.createObjectURL(blob), mime: mime };
          syncButtons();
        };
        recording = true;
        recBtn.textContent = L.read_along_rec_stop || 'Stop recording';
        status.textContent = recTargetMode === 'page'
          ? (L.read_along_rec_recording_page || 'Recording whole page...')
          : say(L.read_along_rec_recording, 'Recording sentence {n}...', recTargetIdx + 1);
        try { recorder.start(); } catch (_) { failRec(); return; }
        timer = win.setTimeout(function () { if (recorder && recorder.state !== 'inactive') { try { recorder.stop(); } catch (_) {} } }, recTargetMode === 'page' ? 180000 : 60000);
      }, function () {
        recBtn.disabled = false;
        modeSel.disabled = false;
        stopTracks();
        status.textContent = L.read_along_rec_denied || 'Microphone permission was refused.';
      });
    });
    playBtn.addEventListener('click', function () {
      if (recording) { warnRecording(); return; }
      if (playing) { stopPlay(); return; }
      var clip = clips[keyFor(takeMode, curIdx)];
      if (!clip || !clip.url) return;
      stopPlay();
      try {
        player = new win.Audio(clip.url);
        playing = true;
        playBtn.textContent = L.read_along_stop || 'Stop';
        player.onended = stopPlay;
        player.onerror = stopPlay;
        var p = player.play();
        if (p && typeof p.catch === 'function') p.catch(stopPlay);
      } catch (_) { stopPlay(); }
    });
    saveBtn.addEventListener('click', function () {
      var clip = clips[keyFor(takeMode, curIdx)];
      if (!clip || !clip.url) return;
      var ext = /mp4|m4a/i.test(clip.mime) ? 'm4a' : /ogg/i.test(clip.mime) ? 'ogg' : /wav/i.test(clip.mime) ? 'wav' : 'webm';
      var pagePrefix = totalPages > 1 ? ('page-' + pageNum + '-') : '';
      var suffix = takeMode === 'page' ? 'whole-page' : ('sentence-' + (curIdx + 1));
      var a = el('a', { href: clip.url, download: 'my-reading-' + pagePrefix + suffix + '.' + ext });
      a.hidden = true;
      doc.body.appendChild(a);
      a.click();
      doc.body.removeChild(a);
    });
    clearBtn.addEventListener('click', function () {
      if (recording) { warnRecording(); return; }
      stopPlay();
      clearKey(keyFor(takeMode, curIdx));
      syncButtons();
    });
    var setSentence = function (index, total) {
      var nextIdx = Math.max(0, Math.floor(Number(index) || 0));
      if (typeof total === 'number' && total > 0) curTotal = total;
      if (nextIdx !== curIdx) {
        stopPlay();
        curIdx = nextIdx;
      }
      syncButtons();
    };
    return { el: wrap, halt: halt, unmount: unmount, setSentence: setSentence, isRecording: function () { return !!recording; }, warnRecording: warnRecording };
  }

  // ---------------------------------------------------------------------------
  // The player shell (runs INSIDE the downloaded file). Self-contained: it
  // uses only its parameters. `matches` is WS_CORE.soundAnswerMatches and
  // `renders` maps activity id -> adapter.render, all embedded verbatim.
  // ---------------------------------------------------------------------------
  // `kit` = { csv: packetCsv, hash: hashText, mailbox: takeHomeMailbox | null }.
  // 2026-11-13 (kept out of the function, so out of every file): ctx.sound(label) is a sound as shown with letters on
  // (L.sound_name_<label>, else /label/); choices with data-key (Sound Counting with fewer numbers) answer to the key
  // of their number; a render's payoff() runs after a right answer once the praise clip has ended, only after a press
  // and on the same screen (the read-back of read_sentence, read_passage, sentence_match); clockHold(on) holds the
  // item's time for a check's "Stop?".
  // 2026-11-13 (robustness pass): one document key listener stops Hear all (hearStops, emptied by screen()); one for
  // each Hear all button kept every past screen in memory (Chromium, a 481-item file: 28,271 DOM nodes at the end,
  // pictures included, against about 250). A screen while the storage refuses says so (data-store-off). Results carry
  // activeMs (the items' ms added up) and the CSV "#summary" an active_s= cell after title= (its last cell before).
  // The bridge (linked) posts to win.parent with targetOrigin '*', on purpose: it reaches only the one page that frames
  // the file (a nested frame cannot be the target), and that page chose the frame's sandbox and holds the file's bytes,
  // so it could read the answers anyway (frame it with allow-same-origin, or change the file). A fixed list of origins
  // would protect nothing and would stop the bridge on a school's own copy of packets-open.html and on test servers.
  // 2026-11-13 (engine fixes, C:/tmp/packets_build_1111/engine2/): TWO TABS of one file (the same storage key, code name
  // included). Only that one storage item and its 'storage' events: no BroadcastChannel, no second key and no second
  // postMessage, so "Check a file" (packets_verify_core.js) still finds one name in storage and one message, the bridge's.
  // Each copy has an id and a claim number (tab.n, one more than the stored one) and stamps the place it writes (state.tab).
  // A copy that opens on a kept place asks (state.ping = its id) and holds its own writes for 400 ms or until the first
  // press; an open copy answers by writing the place again without the question. An answer, or any write by another copy
  // before this one has written, makes it wait: the two_tabs screen, no writes, no sound, no clock; Continue here writes a
  // newer claim at once and reads the place (the others wait). Before every write a copy reads the stored stamp: a newer
  // claim makes it wait (a phone that froze a tab and thawed it). A check taken over while it ran records the flag
  // two_tabs. Nothing is shared where the storage refuses (the open page's frame). A SAVE says "Your browser is saving" (saving_file): a download
  // cannot be seen to finish. A SOUND that does not play is said on the item too (sound_failed), and a clip with no
  // progress for 5 s settles, so Hear all and an opening never stay stuck. screen() clears #live.
  function takeHomeShell(doc, win, lesson, L, matches, renders, kit) {
    var safeParse = function (raw) {
      return JSON.parse(raw, function (k, v) { return k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v; });
    };
    var storageKey = 'alloflow-take-home:' + lesson.lessonId + ':' + lesson.revision;
    var manifest = {};
    try { manifest = safeParse(doc.getElementById('packet-manifest').textContent) || {}; } catch (_) {}
    // A teacher can hand out the file with the label filled in: file.html#learner=BlueHeron7, or made for one student
    // (the code name in the manifest; the link's wins). Each code name keeps its own progress on a shared device.
    var givenName = '';
    try { var hashed = /(?:^#|&)learner=([^&]*)/.exec(String(win.location.hash || '')); if (hashed) givenName = decodeURIComponent(hashed[1]).trim().slice(0, 60); } catch (_) {}
    if (!givenName && typeof manifest.learner === 'string') givenName = manifest.learner.trim().slice(0, 60);
    if (givenName) storageKey += ':' + encodeURIComponent(givenName.toLowerCase());
    var sendNow = kit.mailbox ? kit.mailbox(win, lesson.submit) : null;
    var main = doc.getElementById('app');
    var live = doc.getElementById('live');
    var storeOk = true;
    var state = null;
    var audioEl = null;
    var screenId = 0;
    var namePrompted = false;
    var sessionCache = Object.create(null);
    var pendingNav = null;
    var items = [];
    lesson.blocks.forEach(function (block) { block.items.forEach(function (item, i) { items.push({ activity: block.activity, item: item, n: i + 1, total: block.items.length }); }); });
    // 2026-11-18: the file's own order (lesson.sequence), when it names each question once; "2 of 5" stays per activity.
    var ownOrder = false;
    if (Array.isArray(lesson.sequence) && lesson.mode !== 'probe' && lesson.sequence.length === items.length) {
      var byId = Object.create(null), place = Object.create(null);
      items.forEach(function (e) { byId[e.item.id] = e; });
      var ordered = lesson.sequence.map(function (id) { var e = byId[id]; delete byId[id]; return e; });
      if (ordered.every(Boolean)) {
        ownOrder = true;
        items = ordered.map(function (e) { place[e.activity] = (place[e.activity] || 0) + 1; return { activity: e.activity, item: e.item, n: place[e.activity], total: e.total }; });
      }
    }
    // The missed questions once more (lesson.repeatMissed, practice files only): appended after the others, by their places.
    var baseCount = items.length, repeatMissed = lesson.repeatMissed === true && lesson.mode !== 'probe';
    var addAgain = function (list) {
      if (items.length !== baseCount) return;
      list.forEach(function (at, k) { var e = items[at]; items.push({ activity: e.activity, item: Object.assign({}, e.item, { id: String(e.item.id) + '-again' }), n: k + 1, total: list.length, again: true }); });
    };
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
      if (typeof baseCount === 'number' && items.length > baseCount) items.length = baseCount;
      return { name: '', index: 0, startedAt: null, finishedAt: null, savedFile: null, sent: null,
        items: items.map(function (e) { return { itemId: e.item.id, activity: e.activity, responses: [], attempts: 0, firstTry: false, correct: false, done: false, supports: {} }; }) };
    };
    // Opened on the Packets site's "Open a practice file" page, the file runs in a sandboxed frame with no storage of its
    // own. That page puts what it keeps for this file in #packet-store-snapshot, keeps each change it is sent and saves
    // the results files. Used only when the storage refuses, in a frame, with that block there.
    var link;
    var linked = function () {
      if (link !== undefined) return link;
      link = null;
      try { var snap = win.parent !== win && safeParse(doc.getElementById('packet-store-snapshot').textContent); if (snap && snap.kind === 'alloflow-packet-store' && snap.items && typeof snap.items === 'object') link = { items: snap.items, nav: typeof snap.nav === 'string' && snap.nav.length >= 16 ? snap.nav : '', tell: function (message) { win.parent.postMessage(message, '*'); } }; } catch (_) {}
      return link; };
    // The one place the file keeps (every read and write of it is here).
    var writePlace = function (text) { if (text != null) win.localStorage.setItem(storageKey, text); else win.localStorage.removeItem(storageKey); };
    var readPlace = function () { return win.localStorage.getItem(storageKey); };
    // Two tabs of this file: this copy's id and claim (n), whether it holds the file (owner) and has written since it opened.
    var tab = { id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36), n: 1, owner: true, wrote: false, opening: false, held: null, took: false };
    var holderOf = function (raw) { var m = typeof raw === 'string' && /"tab":\{"id":"([0-9a-z]{1,40})","n":(\d{1,12})\}/.exec(raw); return m ? { id: m[1], n: Number(m[2]) } : null; };
    var pingOf = function (raw) { var m = typeof raw === 'string' && /"ping":"([0-9a-z]{1,40})"/.exec(raw); return m ? m[1] : ''; };
    var newer = function (h) { return !!h && h.id !== tab.id && h.n >= tab.n; };
    // The one storage item (put(null) removes it). It also keeps the reading tools: state.tools, or alone before Start.
    var put = function (value) {
      // A copy that waits writes nothing; one that is opening holds its own writes a moment (another copy may answer).
      if (!tab.owner) return;
      if (tab.opening) { tab.held = { value: value }; return; }
      try {
        if (newer(holderOf(readPlace()))) { waitHere(); return; }
        if (value && Array.isArray(value.items)) { delete value.ping; value.tab = { id: tab.id, n: tab.n }; }
        writePlace(value ? JSON.stringify(value) : null);
        storeOk = true; tab.wrote = true;
      } catch (_) { storeOk = false; }
      if (!storeOk && linked()) { storeOk = true; link.items[storageKey] = value ? JSON.stringify(value) : null; link.tell({ kind: 'alloflow-packet-store', key: storageKey, value: link.items[storageKey] }); }
    };
    var save = function () {
      var kept = tools && state ? tools.prefs() : null;
      if (kept) state.tools = kept; else if (state) delete state.tools;
      put(state);
    };
    var stored = function () {
      try {
        var raw; try { raw = readPlace(); } catch (error) { if (!linked()) { storeOk = false; return null; } raw = typeof link.items[storageKey] === 'string' ? link.items[storageKey] : null; }
        var parsed = raw && safeParse(raw);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
      } catch (_) {}
      // Damaged JSON is not a refusal: the next save writes over it.
      return null;
    };
    var load = function () {
      var parsed = stored();
      if (parsed && repeatMissed && Array.isArray(parsed.again) && parsed.again.every(function (n) { return n === Math.floor(n) && n >= 0 && n < baseCount; })
        && Array.isArray(parsed.items) && parsed.items.length === baseCount + parsed.again.length) addAgain(parsed.again);
      return parsed && Array.isArray(parsed.items) && parsed.items.length === items.length ? parsed : null;
    };
    var storePrefs = function () {
      if (state) { save(); return; }
      var held = stored() || {}, kept = tools.prefs();
      if (kept) held.tools = kept; else delete held.tools;
      put(Object.keys(held).length ? held : null);
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
    // The item on the clock is the one the reading tools count for.
    var clockStart = function (rec) { clock = { rec: rec, ms: 0, from: doc.hidden ? null : now() }; if (tools) tools.item(rec); };
    var clockStop = function () { clockLap(); clock = null; if (tools) tools.item(null); };
    var clockHold = function (on) { if (clock) { clockLap(); clock.held = on; clock.from = on || doc.hidden ? null : now(); } };
    doc.addEventListener('visibilitychange', function () {
      if (!clock) return;
      if (doc.hidden) { clockLap(); clock.from = null; } else if (clock.from == null && !clock.held) clock.from = now();
    });
    // ONE audio element for every clip: iPad/iPhone Safari lets an element play
    // without a tap only after a tap has played it once, so a new element per
    // clip could stay silent after the first clip of a sequence. A clip cut off
    // by another (playToken moved on) never settles.
    var playToken = 0;
    var playing = false;
    var stopBtn = null;
    var setPlaying = function (on) {
      playing = !!on;
      if (stopBtn) {
        if (!playing && doc.activeElement === stopBtn) {
          var backTo = doc.querySelector('[data-tools-open]') || main.querySelector('h2');
          if (backTo && typeof backTo.focus === 'function') backTo.focus();
        }
        stopBtn.hidden = !playing;
      }
    };
    var stop = function () { playToken++; setPlaying(false); if (audioEl) { try { audioEl.pause(); } catch (_) {} } };
    // A sound that did not play: said on the item too, until a sound plays on this screen.
    var soundNote = null;
    var soundFailed = function (bad) {
      if (!bad) { if (soundNote && soundNote.parentNode) soundNote.parentNode.removeChild(soundNote); soundNote = null; return; }
      announce(L.audio_missing);
      // Counted on the item on screen, so the teacher can tell an answer given without hearing the sound.
      var heard = state && Array.isArray(state.items) ? state.items[state.index] : null;
      if (heard && !heard.done) { heard.supports = heard.supports && typeof heard.supports === 'object' ? heard.supports : {}; heard.supports.soundFailed = (Number(heard.supports.soundFailed) || 0) + 1; save(); }
      if (soundNote && main.contains(soundNote)) return;
      soundNote = el('p', { class: 'status warn', 'data-sound-failed': '', text: L.sound_failed });
      var card = main.querySelector('.card'), line = card && card.querySelector('[data-feedback]');
      if (line) line.parentNode.insertBefore(soundNote, line); else (card || main).appendChild(soundNote);
    };
    // rate: optional playback speed (e.g. 0.5 for "Hear it slowly"). onProgress(cur, dur): optional word-sweep hook. startAt: optional resume offset in seconds.
    var play = function (id, rate, onProgress, startAt) {
      stop();
      var src = id && lesson.audio[id];
      if (!src || !tab.owner) return Promise.resolve(false);
      var mine = playToken;
      if (!audioEl) { try { audioEl = new win.Audio(); } catch (_) { return Promise.resolve(false); } }
      var a = audioEl;
      return new Promise(function (resolve) {
        // A clip that neither ends nor fails (a stalled player) counts as not played after 5 s with no progress.
        var dog = null, tick = null;
        var report = function () {
          if (mine !== playToken || typeof onProgress !== 'function') return;
          var dur = Number(a.duration), cur = Number(a.currentTime);
          if (dur > 0 && cur >= 0) { try { onProgress(cur, dur); } catch (_) {} }
        };
        var watch = function () { win.clearTimeout(dog); dog = win.setTimeout(function () { settle(false); }, 5000); report(); };
        var settle = function (ok) { win.clearTimeout(dog); if (tick) { win.clearInterval(tick); tick = null; } if (mine !== playToken) return; setPlaying(false); a.onended = a.onerror = a.ontimeupdate = a.onloadedmetadata = null; resolve(ok); };
        a.onended = function () { settle(true); };
        a.onerror = function () { settle(false); };
        a.ontimeupdate = watch;
        var speed = rate > 0 ? rate : (tools && tools.speedRate ? tools.speedRate() : (tools && tools.slow && tools.slow() ? 0.8 : 1));
        var seekSec = Number(startAt) > 0 ? Number(startAt) : 0;
        var p;
        try {
          a.src = src;
          if (seekSec > 0) {
            var applySeek = function () {
              if (mine !== playToken) return;
              try {
                var dur = Number(a.duration);
                a.currentTime = (dur > 0 && seekSec < dur - 0.1) ? seekSec : seekSec;
              } catch (_) {}
            };
            a.onloadedmetadata = applySeek;
            applySeek();
          }
          try {
            if ('preservesPitch' in a) a.preservesPitch = true;
            else if ('mozPreservesPitch' in a) a.mozPreservesPitch = true;
            else if ('webkitPreservesPitch' in a) a.webkitPreservesPitch = true;
          } catch (_) {}
          try { a.defaultPlaybackRate = speed; a.playbackRate = speed; } catch (_) {}
          p = a.play();
          setPlaying(true);
          if (typeof onProgress === 'function' && typeof win.setInterval === 'function') tick = win.setInterval(report, 60);
        } catch (_) { settle(false); return; }
        watch();
        if (p && p.catch) p.catch(function () { settle(false); });
      }).then(function (ok) {
        if (mine === playToken) soundFailed(!ok);
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
    // Hear all (ctx.hearAll): one button that plays or reads each answer choice in turn. The choice being heard is
    // outlined with its number, and the line beside the button says it (politely, to screen readers). Pressing the
    // button again stops it, and so does any other button of the item, the keys 1-9, R and Esc, or a new screen. It
    // starts by itself only with the reading tool "Read the choices" on, and only after the student has pressed
    // something in this file: iPad and iPhone play sound only after a press. spec = { list: [{ box, say }] or a
    // function giving it (say() starts one choice and returns a Promise for its end), label, name, support, before,
    // stop (ends what say started), ready (false: not now), auto (false: the opening already reads the choices) }.
    // The keys 1-9, R and Esc stop the Hear all buttons of the screen on view (hearStops).
    var pressed = false, hearNow = null, hearStops = [];
    // A press also ends the moment an opening copy holds its writes (settle).
    ['pointerdown', 'keydown', 'click'].forEach(function (name) { doc.addEventListener(name, function () { pressed = true; settle(); }, true); });
    doc.addEventListener('keydown', function (e) {
      if (e.isComposing || e.keyCode === 229 || e.ctrlKey || e.metaKey || e.altKey) return;
      var k = String(e.key || '');
      var tgt = e.target, tg = tgt && tgt.tagName ? String(tgt.tagName).toUpperCase() : '';
      var inField = tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT' || !!(tgt && tgt.isContentEditable);
      if (!inField && /^([1-9rR]|Esc|Escape)$/.test(k)) hearStops.slice().forEach(function (halt) { halt(); });
      if (/^(Esc|Escape)$/.test(k) && playing) { stop(); announce(L.audio_stopped || 'Audio stopped'); }
    }, true);
    var hearAllIn = function (area, support) {
      return function (spec) {
        var s = spec || {}, run = 0, on = false, owner = screenId;
        var label = s.label || L.hear_all;
        var icon = el('span', { 'aria-hidden': 'true' }), words = el('span', {});
        var button = el('button', { type: 'button', 'data-hear-all': '', on: { click: function () { if (on) halt(); else start(true); } } }, [icon, words]);
        // The button says what a press does now: Hear all, or Stop.
        var paint = function () {
          icon.textContent = String.fromCharCode(on ? 0x25A0 : 0x25B6) + ' ';
          words.textContent = on ? L.hear_all_stop : label;
          if (!on && (s.name || !s.label)) button.setAttribute('aria-label', s.name || L.hear_all_name); else button.removeAttribute('aria-label');
        };
        var note = el('p', { class: 'hear-now muted', 'aria-live': 'polite', 'data-hear-now': '' });
        var clear = function () { var all = area.querySelectorAll('[data-hearing]'); for (var i = 0; i < all.length; i++) all[i].removeAttribute('data-hearing'); };
        var halt = function () {
          if (!on) return;
          on = false; run++;
          clear(); note.textContent = '';
          paint();
          try { if (s.stop) s.stop(); } catch (_) {}
          stop();
        };
        var start = function (asked) {
          if (on || owner !== screenId || !area.isConnected) return;
          if (typeof s.ready === 'function' && !s.ready()) return;
          var list = (typeof s.list === 'function' ? s.list() : s.list || []).filter(function (x) { return x && x.box && typeof x.say === 'function'; });
          if (!list.length) return;
          try { if (s.before) s.before(); } catch (_) {}
          stop();
          on = true;
          var mine = ++run, i = 0;
          if (asked && support) support(s.support || 'allChoiceListens');
          paint();
          var next = function () {
            if (mine !== run) return;
            if (owner !== screenId || !area.isConnected) { on = false; return; }
            clear();
            if (i >= list.length) { halt(); return; }
            var entry = list[i++], n = entry.n || i;
            entry.box.setAttribute('data-hearing', String(n));
            note.textContent = fmt(L.hear_all_now, { n: n, total: entry.total || list.length });
            var said, gone = false, cap = null;
            var go = function () { if (gone) return; gone = true; win.clearTimeout(cap); if (mine === run) win.setTimeout(next, 450); };
            try { said = entry.say(); } catch (_) { said = null; }
            // A choice that fails, or never says it is over, does not leave the button on Stop.
            cap = win.setTimeout(go, 20000);
            Promise.resolve(said).then(go, go);
          };
          // The first choice starts inside the press that asked for it (Safari).
          next();
        };
        area.addEventListener('click', function (e) { var b = e.target && e.target.closest ? e.target.closest('button') : null; if (on && b && b !== button) halt(); }, true);
        hearStops.push(function () { if (on) halt(); });
        paint();
        var made = { button: button, note: note, node: el('div', { class: 'row', 'data-hear-row': '' }, [button, note]), start: start, halt: halt, auto: s.auto !== false };
        hearNow = made;
        return made;
      };
    };
    // After an item opens: with "Read the choices" on, its Hear all starts once the opening clips are over.
    var autoHear = function (opening) {
      var h = hearNow;
      if (!h || !h.auto || !pressed || !tools || !tools.autoRead()) return;
      if (!opening) { h.start(false); return; }
      opening.then(function (ok) { if (ok !== false && hearNow === h) h.start(false); });
    };
    var keyItem = null;
    // Keyboard on an item screen: 1-9 picks that answer choice (the answer
    // button of the nth li.choice the adapter drew), R plays the question again.
    // Never while typing in a field, and never with Ctrl/Alt/Cmd.
    doc.addEventListener('keydown', function (e) {
      if (!keyItem || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.isComposing || e.keyCode === 229) return;
      var t = e.target, tag = t && t.tagName ? String(t.tagName).toUpperCase() : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      var key = String(e.key || ''), code = String(e.code || '');
      if (key === 'r' || key === 'R' || (code === 'KeyR' && !/^[a-z]$/i.test(key))) {
        if (keyItem.keys && keyItem.keys(key) === true) { e.preventDefault(); return; }
        var it = keyItem.item;
        // An activity that plays its own opening (Blend Sounds, Rhyme Time, Symbol Runner...) gives replay() to play it again.
        var own = keyItem.handle && typeof keyItem.handle.replay === 'function' ? keyItem.handle.replay : null;
        var rawIds = it.introAudio && it.introAudio.length ? it.introAudio : [it.promptAudio || it.prompt];
        var ids = rawIds.filter(function (id) { return !!(id && lesson.audio && lesson.audio[id]); });
        if (!own && !ids.length) return;
        if (own) { if (own() === false) return; e.preventDefault(); keyItem.replay(); }
        else { e.preventDefault(); keyItem.replay(); playAll(ids); }
        return;
      }
      if (e.isTrusted && keyItem.shownAt && Date.now() - keyItem.shownAt < 250) return;
      if (keyItem.pad) {
        var pk = /^[0-9]$/.test(key) ? key : key === 'Backspace' ? 'back' : key === '-' || key === String.fromCharCode(0x2212) ? 'minus' : key === 'Enter' && tag !== 'BUTTON' ? 'next' : '';
        if (pk) { e.preventDefault(); keyItem.pad.press(pk); return; }
      }
      if (keyItem.keys && keyItem.keys(key) === true) { e.preventDefault(); return; }
      var digit = /^[1-9]$/.test(key) ? key : (/^(?:Digit|Numpad)([1-9])$/.exec(code) || [])[1];
      if (digit) {
        var a = keyItem.area, box = a.querySelector('li.choice[data-key]') ? a.querySelector('li.choice[data-key="' + digit + '"]') : a.querySelectorAll('li.choice')[Number(digit) - 1];
        var button = box && (box.querySelector('button.primary') || box.querySelector('button'));
        if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
        e.preventDefault();
        button.click();
      }
    });
    var activeHandle = null;
    var silentFocus = false;
    var screen = function (heading, nodes, hideHeading) {
      screenId++;
      hearStops.slice().forEach(function (halt) { try { halt(); } catch (_) {} });
      if (activeHandle && typeof activeHandle.stop === 'function') { try { activeHandle.stop(); } catch (_) {} }
      activeHandle = null;
      stop();
      clockStop();
      keyItem = null;
      hearNow = null; hearStops = [];
      if (tools && tools.noVoice) tools.noVoice(false);
      // The screen-reader line keeps nothing of the screen before (an announcement still to come is kept).
      live.textContent = ''; soundNote = null;
      main.textContent = '';
      // hideHeading: the page title already shows it; screen readers still hear it.
      var h = el('h2', hideHeading ? { tabindex: '-1', class: 'sr', text: heading } : { tabindex: '-1', text: heading });
      // For the phone layout (CSS [data-step]): this screen shows its own heading, so the file's title can be small.
      try { if (hideHeading) doc.body.removeAttribute('data-step'); else doc.body.setAttribute('data-step', ''); } catch (_) {}
      main.appendChild(h);
      if (tools && tools.dock) tools.dock(h);
      nodes.forEach(function (n) { if (n) main.appendChild(n); });
      // Storage refused or full: said on every screen until the finish screen, which says it itself.
      if (!storeOk && !(state && state.finishedAt)) { var off = statusLine(L.saved_device_off, 'warn'); off.setAttribute('data-store-off', ''); main.appendChild(off); }
      if (!silentFocus) h.focus();
    };
    var statusLine = function (text, tone) { return el('p', { class: 'status' + (tone ? ' ' + tone : ''), role: 'status', text: text }); };
    // Two tabs (see the note above takeHomeShell): the screen of a copy that waits, Continue here, and the storage events.
    var waitHere = function () {
      tab.opening = false; tab.held = null;
      if (!tab.owner) return;
      tab.owner = false;
      screen(lesson.title, [el('div', { class: 'card', 'data-two-tabs': '' }, [
        el('p', { class: 'status warn', text: L.two_tabs }),
        el('div', { class: 'row' }, [el('button', { class: 'primary', type: 'button', 'data-continue-here': '', on: { click: function () { takeOver(); } }, text: L.continue_here })]),
      ])], true);
      announce(L.two_tabs);
    };
    // Continue here: a newer claim, written at once (so the other copies wait), then the place as the others left it.
    var takeOver = function () {
      if (tab.owner) return;
      var raw = null, o = null;
      try { raw = readPlace(); o = raw && safeParse(raw); } catch (_) {}
      tab.n = Math.max(tab.n, (holderOf(raw) || {}).n || 0) + 1;
      tab.owner = true; tab.took = true;
      if (o && Array.isArray(o.items)) { delete o.ping; put(o); }
      state = null; renderStart(); tab.took = false;
    };
    // Still this copy's to write? (A newer claim by another copy, seen in the storage, makes it wait.)
    var owned = function () {
      if (!tab.owner) return false;
      if (tab.opening) return true;
      try { if (newer(holderOf(readPlace()))) { waitHere(); return false; } } catch (_) {}
      return true;
    };
    var unping = function () {
      try { var raw = readPlace(), o = pingOf(raw) === tab.id && safeParse(raw); if (o) { delete o.ping; writePlace(JSON.stringify(o)); } } catch (_) {}
    };
    var settle = function () {
      if (!tab.opening) return;
      tab.opening = false;
      var held = tab.held; tab.held = null;
      if (held && tab.owner) put(held.value); else if (tab.owner) unping();
    };
    var openTabs = function () {
      var raw, o = null;
      // No storage (or the open page's frame, which keeps nothing of its own): nothing is shared, nothing to ask.
      try { raw = readPlace(); } catch (_) { return; }
      tab.n = ((holderOf(raw) || {}).n || 0) + 1;
      win.addEventListener('storage', function (e) {
        if (e.key !== storageKey || e.newValue == null) return;
        var ping = pingOf(e.newValue);
        // A copy opening asks: an open copy answers by writing the place again, without the question.
        if (ping && ping !== tab.id) {
          if (!tab.owner || tab.opening) return;
          if (state && tab.wrote) save();
          else { try { var q = safeParse(e.newValue); delete q.ping; writePlace(JSON.stringify(q)); } catch (_) {} }
          return;
        }
        // Another copy wrote: this one waits if it has not written since it opened, or the other's claim is newer.
        if (tab.owner && !ping && (tab.opening || !tab.wrote || newer(holderOf(e.newValue)))) waitHere();
      });
      try { o = raw && safeParse(raw); } catch (_) {}
      if (!o || typeof o !== 'object' || !Array.isArray(o.items)) return;
      // A place is kept: ask whether another copy has the file open, and hold this copy's writes for the answer.
      o.ping = tab.id;
      try { writePlace(JSON.stringify(o)); } catch (_) { return; }
      tab.opening = true;
      win.setTimeout(settle, 400);
    };
    var activityTitle = function (id) { return L[id + '_title'] || (lesson.activityTitles && lesson.activityTitles[id]) || id; };
    // "About this file": the manifest block, in plain words.
    var about = function () {
      var m = manifest, saves = m.saves || [], net = m.network && m.network.sendsTo;
      var texts = [
        L.about_what,
        fmt(L.about_engine, { engine: m.engine || '' }),
        fmt(L.about_stores, { key: storageKey }),
        fmt(L.about_saves, { csv: (saves[0] && saves[0].file) || '.csv', json: (saves[1] && saves[1].file) || '.json' }),
        L.about_records,
        net ? fmt(L.about_mailbox, { host: net }) : L.about_no_network,
        L.about_never,
        L.about_check,
        fmt(L.about_rules, { csp: m.csp || '' }),
        fmt(L.about_licence, { licence: m.licence || '', licenceUrl: m.licenceUrl || 'gnu.org/licenses/agpl-3.0.html', source: m.source || 'github.com/Apomera/AlloFlow' }),
        m.attributions && m.attributions.length ? fmt(L.about_credits, { list: m.attributions.join('; ') }) : '',
        typeof m.fonts === 'string' ? m.fonts : '',
      ];
      if (check) texts = check.about(texts);
      if (lesson.qr && L.qr_about) texts.push(fmt(L.qr_about, { fp: lesson.qr.fp || '' }));
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
      savingFile = '';
      var prior = load();
      if (check && check.resume(prior)) return;
      var given = givenName;
      var buttons = [];
      var nameInput = el('input', { id: 'learner-name', type: 'text', autocomplete: 'off', maxlength: '60', on: { keydown: function (e) { if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229 && !e.ctrlKey && !e.metaKey && !e.altKey && buttons[0]) { e.preventDefault(); buttons[0].click(); } } } });
      var hasPlace = !!(prior && Array.isArray(prior.items) && prior.items[prior.index || 0] && Number(prior.items[prior.index || 0].place) > 0);
      var resumable = prior && (prior.index > 0 || hasPlace) && !prior.finishedAt;
      // A finished run is still here: it can be seen (and saved) again. Unsaved results are never erased without asking.
      var finished = !!(prior && prior.finishedAt && Array.isArray(prior.items) && prior.items.length);
      var unsaved = finished ? !(prior.sent || prior.savedFile) : resumable;
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
        // The place as it is stored now: another copy of the file may have moved it on since this screen was drawn.
        var latest = load();
        if (latest) prior = latest;
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
      // Start over asks first when it would erase answers that were not saved: an in-page panel, as on the finish screen.
      var overText = el('p', { id: 'start-over-text', tabindex: '-1', style: 'margin:0 0 8px', text: finished ? L.practice_again_confirm : L.start_over_confirm });
      var overKeep = el('button', { type: 'button', class: 'primary', 'data-start-over-keep': '', on: { click: function () { overBox.hidden = true; (buttons[0] || nameInput).focus(); } }, text: finished ? L.keep_results : L.keep_going });
      var overBox = el('div', { class: 'status warn', role: 'group', 'aria-labelledby': 'start-over-text', hidden: true, 'data-start-over-confirm': '',
        on: { keydown: function (e) { if ((e.key === 'Escape' || e.key === 'Esc') && !e.isComposing && e.keyCode !== 229 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); overKeep.click(); } } } }, [
        overText, el('div', { class: 'row' }, [overKeep, el('button', { type: 'button', 'data-start-over-yes': '', on: { click: function () { begin(false); } }, text: L.start_over })])]);
      if (finished) buttons.push(el('button', { class: 'primary', type: 'button', 'data-see-results': '', on: { click: function () { state = load() || prior; renderFinish(); } }, text: L.finish }));
      else if (resumable) buttons.push(el('button', { class: 'primary', type: 'button', 'data-continue': '', on: { click: function () { begin(true); } }, text: L.continue }));
      buttons.push(finished || resumable
        ? el('button', { type: 'button', 'data-start-over': '', on: { click: function () { if (!unsaved) { begin(false); return; } overBox.hidden = false; overText.focus(); } }, text: L.start_over })
        : el('button', { class: 'primary', type: 'button', on: { click: function () { begin(false); } }, text: L.start }));
      // The name a teacher gave (a #learner= link, or the file made for one student) fills the field. The last name used on
      // this device does not: on a shared device it belongs to another child. Continue keeps it for the answers it continues.
      if (given) nameInput.value = given;
      var info = about();
      buttons.push(info.button);
      screen(lesson.title, [
        el('div', { class: 'card' }, [
          el('p', { text: L.intro }),
          // Whose answers Continue goes on with (the name field is left for the student now at the device).
          resumable ? el('p', { class: 'muted', 'data-continue-note': '' }, [
            prior.name ? el('span', { 'data-continue-name': '', text: fmt(L.continue_whose, { name: prior.name }) }) : null,
            prior.name && items.length ? ' ' : null,
            items.length ? el('span', { 'data-continue-progress': '', text: '(' + (items.every(function (e) { return e.activity === 'read_along'; }) ? 'Page ' : 'Question ') + Math.min((prior.index || 0) + 1, items.length) + ' of ' + items.length + ')' }) : null,
          ]) : null,
          el('label', { for: 'learner-name', text: L.learner_label }), nameInput, namePrompt,
          el('div', { class: 'row', style: 'margin-top:16px' }, buttons), overBox,
        ]),
      ], true);
      main.appendChild(info.panel);
    };

    var renderItem = function () {
      // At the end of the first time through: the questions missed on the first try, once more, as practice.
      if (state.index >= items.length && repeatMissed && !state.again) {
        var missed = [];
        for (var m = 0; m < baseCount; m++) { var r0 = state.items[m]; if (r0 && r0.done && !r0.practice && !r0.firstTry && items[m].activity !== 'letter_tracing' && items[m].activity !== 'read_along') missed.push(m); }
        state.again = missed;
        if (missed.length) {
          addAgain(missed);
          missed.forEach(function (at) { state.items.push({ itemId: String(items[at].item.id) + '-again', activity: items[at].activity, responses: [], attempts: 0, firstTry: false, correct: false, done: false, supports: {}, practice: 'practice' }); });
        }
        save();
      }
      if (state.index >= items.length) { renderFinish(); return; }
      var entry = items[state.index];
      var prevEntry = state.index > 0 ? items[state.index - 1] : null;
      // In the file's own order, the directions again when the activity changes.
      var skipDirections = entry.n > 1 && (!ownOrder || (!!prevEntry && prevEntry.activity === entry.activity)) && !!(tools && tools.directionsOnce && tools.directionsOnce());
      var item = entry.item;
      var rec = state.items[state.index];
      var render = renders[entry.activity];
      var feedback = statusLine('', '');
      feedback.setAttribute('data-feedback', '');
      var area = el('div', {});
      // A real tap within a quarter second of a new question is the tail of a double tap on the last screen, not an answer.
      var shownAt = Date.now();
      area.addEventListener('click', function (e) { if (e.isTrusted && Date.now() - shownAt < 250 && e.target && e.target.closest && e.target.closest('button')) { e.stopPropagation(); e.preventDefault(); } }, true);
      var handle = null;
      var lapFrom = Object.create(null);
      var nextButton = el('button', { class: 'primary', type: 'button', hidden: true, 'data-next': '', on: { click: function () { state.index++; save(); renderItem(); } },
        text: state.index === items.length - 1 ? L.finish : L.next });
      var finishPractice = function () {
        clockStop();
        rec.done = true; rec.correct = false; rec.firstTry = false;
        save();
        if (handle && typeof handle.reveal === 'function') { try { handle.reveal(null); } catch (_) {} }
        nextButton.hidden = false;
        if (!silentFocus) nextButton.focus();
      };
      var finishItem = function (correct) {
        clockStop();
        rec.done = true; rec.correct = correct; rec.firstTry = correct && rec.attempts === 1;
        save();
        if (handle && typeof handle.reveal === 'function') { try { handle.reveal(correct); } catch (_) {} }
        nextButton.hidden = false;
        if (!silentFocus) nextButton.focus();
      };
      var navOpts = pendingNav;
      pendingNav = null;
      var raEntries = entry.activity === 'read_along' ? items.filter(function (e) { return e.activity === 'read_along'; }) : null;
      var gotoPage = function (idx, opts) {
        var n = Math.floor(Number(idx));
        if (!isFinite(n) || n < 0) return;
        var targetIndex = raEntries ? (raEntries[n] ? items.indexOf(raEntries[n]) : -1) : n;
        if (targetIndex < 0 || targetIndex >= items.length) return;
        clockStop();
        pendingNav = (opts && typeof opts === 'object') ? opts : null;
        state.index = targetIndex;
        save();
        renderItem();
      };
      var ctx = {
        root: area, el: el, fmt: fmt, L: L, item: item, matches: matches, showLetters: !!lesson.showLetters, skipDirections: skipDirections, noFocus: silentFocus,
        sessionCache: sessionCache, nav: navOpts, goto: gotoPage,
        pages: raEntries ? raEntries.map(function (e) { return e.item; }) : undefined,
        soundGap: function () { return tools && tools.soundGap ? tools.soundGap() : 500; },
        slow: function () { return !!(tools && tools.slow && tools.slow()); },
        speedRate: function () { return tools && tools.speedRate ? tools.speedRate() : 1; },
        noVoice: function (on) { if (tools && tools.noVoice) tools.noVoice(on); },
        toolPref: function (k, v) { if (!tools) return null; if (arguments.length > 1) { if (tools.setExtra) tools.setExtra(k, v); return v ? 1 : 0; } return tools.getExtra ? tools.getExtra(k) : null; },
        place: function (v) { if (arguments.length > 0) { var n = Math.max(0, Math.floor(Number(v) || 0)); if (n > 0) rec.place = n; else delete rec.place; save(); return n; } return Math.max(0, Math.floor(Number(rec.place) || 0)); },
        bookmark: function (v) {
          if (arguments.length > 0) {
            if (v == null) delete state.bookmark;
            else state.bookmark = { page: Math.max(0, Math.floor(Number(v.page) || 0)), line: Math.max(0, Math.floor(Number(v.line) || 0)) };
            save();
            return state.bookmark || null;
          }
          return state.bookmark && typeof state.bookmark === 'object' ? state.bookmark : null;
        },
        studentMic: kit.studentMic ? function (opts) { return kit.studentMic(doc, win, el, L, Object.assign({ cache: sessionCache }, opts || {})); } : null,
        deviceVoice: kit.deviceVoice ? function (lang) { return kit.deviceVoice(win, lang, function () { return tools && tools.speedRate ? tools.speedRate() : 1; }); } : null,
        keys: function (handler) { if (keyItem) keyItem.keys = handler; },
        keypad: kit.keypad ? function (options) { var pad = kit.keypad(el, win, L, options); if (keyItem) keyItem.pad = pad; return pad; } : null,
        vocabChoice: kit.vocabChoice ? function (it, P, pic) { return kit.vocabChoice(it, ctx, P, pic); } : null,
        goPrev: state.index > 0 ? function () { clockStop(); state.index--; save(); renderItem(); } : null,
        goNext: function () { clockStop(); state.index++; save(); renderItem(); },
        play: play, playAll: playAll, stop: stop, announce: announce,
        audioTime: function () { return audioEl && Number(audioEl.currentTime) > 0 ? Number(audioEl.currentTime) : 0; },
        hearAll: hearAllIn(area, function (name) { ctx.support(name); }),
        image: function (id) { return (id && lesson.images && lesson.images[id]) || null; },
        ordinal: function (p) { return (L.ordinals && L.ordinals[p]) || String(p + 1); },
        sound: function (label) { return L['sound_name_' + label] || '/' + label + '/'; },
        support: function (name) { rec.supports[name] = (rec.supports[name] || 0) + 1; save(); },
        // 2026-11-17: a named stretch of this item's own clock (time on another tab left out), kept on the item as
        // laps[name], ms. lap(name, true) starts it and lap(name) ends it. The clock starts at 0 just after render, so a
        // stretch begun in render begins at 0. A reload in between loses the start, and then nothing is kept.
        lap: function (name, start) {
          var mine = !!clock && clock.rec === rec;
          if (mine) clockLap();
          var t = mine ? clock.ms : 0;
          if (start) { lapFrom[name] = t; return; }
          if (!mine || lapFrom[name] == null) return;
          (rec.laps || (rec.laps = {}))[name] = Math.round(Math.max(0, t - lapFrom[name]));
          delete lapFrom[name];
          save();
        },
        isDone: function () { return rec.done; },
        attempts: function () { return rec.attempts; },
        // Practice that is never scored: 'traced' or 'skipped' (Letter Trace), 'read' (a page of a read-along).
        practice: function (status, text, options) {
          if (rec.done) return;
          var kind = status === 'skipped' ? 'skipped' : status === 'read' ? 'read' : 'traced';
          rec.attempts++;
          rec.responses.push(kind);
          rec.practice = kind;
          if (options && options.quiet) {
            clockLap();
            rec.done = true; rec.correct = false; rec.firstTry = false;
            save();
            return;
          }
          if (options && options.advance) {
            clockStop();
            rec.done = true; rec.correct = false; rec.firstTry = false;
            state.index++;
            save();
            renderItem();
            if (text) announce(text);
            return;
          }
          feedback.className = 'status ok'; feedback.textContent = text || '';
          finishPractice();
        },
        // Grade one response. Returns 'correct', 'retry' (try again) or 'missed'
        // (attempts used up). The shell handles feedback, sounds and Next.
        // An activity may clear (or replace) the feedback line, for example when a shown answer is covered again.
        feedback: function (text) { if (rec.done) return; feedback.className = 'status'; feedback.removeAttribute('data-missed'); feedback.textContent = text ? String(text) : ''; },
        answer: function (response, isCorrect, options) {
          if (rec.done) return rec.correct ? 'correct' : 'missed';
          var o = options || {};
          var max = Number(item.maxAttempts) > 0 ? Number(item.maxAttempts) : 2;
          // Two choices and no set number of tries: one try, since a second try could not miss.
          var offered = Array.isArray(item.choices) ? item.choices.length : Array.isArray(item.options) ? item.options.length : 0;
          if (!(Number(item.maxAttempts) > 0) && offered === 2) max = 1;
          rec.attempts++;
          rec.responses.push(typeof response === 'string' ? response.slice(0, 80) : JSON.stringify(response).slice(0, 200));
          if (isCorrect) {
            feedback.className = 'status ok'; feedback.textContent = o.correctText || L.correct;
            var praise = lesson.feedback.correct;
            finishItem(true);
            var cheered = play(praise.length ? praise[state.index % praise.length] : null), mine = screenId;
            // payoff(): the read-back, after the praise.
            if (handle && handle.payoff && pressed) cheered.then(function () { if (mine === screenId) handle.payoff(); });
            return 'correct';
          }
          if (rec.attempts < max) {
            feedback.className = 'status warn'; feedback.textContent = o.retryText || L.try_again;
            // On a phone the line can be below the choices, out of sight: bring it just into view (no animation).
            try { if (typeof feedback.scrollIntoView === 'function') feedback.scrollIntoView({ block: 'nearest' }); } catch (_) {}
            save();
            play(lesson.feedback.retry);
            return 'retry';
          }
          feedback.className = 'status warn'; feedback.textContent = o.missedText || L.missed; feedback.setAttribute('data-missed', '');
          finishItem(false);
          playAll(item.answerAudio || []);
          return 'missed';
        },
      };
      // Where the student is in the whole file, when it has more than one activity.
      screen(entry.again ? fmt(L.again_of, { n: entry.n, total: entry.total }) : fmt(L.item_of, { activity: activityTitle(entry.activity), n: entry.n, total: entry.total }), [
        entry.total < items.length ? el('p', { class: ownOrder ? '' : 'muted', 'data-progress': '', style: ownOrder ? 'margin:0;font-weight:700' : 'margin:0',
          text: ownOrder ? 'Question ' + (state.index + 1) + ' of ' + items.length + ' (' + activityTitle(entry.activity) + ')' : fmt(L.progress_all, { n: state.index + 1, total: items.length }) }) : null,
        el('div', { class: 'progress', 'aria-hidden': 'true' }, [el('span', { style: 'width:' + Math.round(100 * (state.index + 1) / items.length) + '%' })]),
        el('div', { class: 'card' }, [area, feedback, nextButton]),
      ]);
      keyItem = { area: area, item: item, shownAt: shownAt, replay: function () { ctx.support('questionReplays'); } };
      try { handle = render(item, ctx) || null; } catch (err) { area.appendChild(statusLine(L.audio_missing, 'warn')); }
      activeHandle = handle;
      keyItem.handle = handle;
      // Reopened on an answered item: show its outcome, do not ask again (except revisit-enabled pages like Read Along).
      if (rec.done) { if (!(handle && handle.allowRevisit)) { if (rec.practice) finishPractice(); else finishItem(rec.correct); } }
      else {
        // Shown before in an earlier opening of the file: the time counts from now.
        if (rec.shown) rec.flag = 'resumed';
        rec.shown = true; rec.ms = 0;
        clockStart(rec);
        save();
        var openingAudio = item.introAudio || [];
        if (skipDirections && openingAudio.length) {
          if (entry.activity === 'isolation') {
            var posKey = function (it) { return it && (it.positionName || it.position); };
            openingAudio = prevEntry && prevEntry.activity === 'isolation' && prevEntry.item && posKey(prevEntry.item) === posKey(item)
              ? (item.wordAudio ? [item.wordAudio] : []) : openingAudio;
          } else if (entry.activity === 'letter_tracing') {
            openingAudio = item.promptAudio && openingAudio[0] === item.promptAudio ? openingAudio.slice(1) : openingAudio;
          } else if (/^(counting|missing_letter|orthography|segmentation|spelling_bee)$/.test(entry.activity)) {
            openingAudio = item.wordAudio ? [item.wordAudio] : [];
          } else if (/^(mapping|word_scramble|decoding|read_sentence|read_passage|sentence_match)$/.test(entry.activity)) {
            openingAudio = [];
          }
        }
        autoHear(openingAudio.length ? playAll(openingAudio) : (handle && handle.opening ? handle.opening : null));
      }
    };

    // The integrity value detects accidental edits, not deliberate ones: FNV-1a
    // at once, replaced by SHA-256 when the browser has made it (renderFinish).
    var sealed = null, savingFile = '';
    var resultFile = function () {
      var out = {
        kind: 'alloflow-take-home-result', schemaVersion: 3, player: lesson.player, sessionId: state.sessionId || '',
        packet: { id: lesson.lessonId, version: lesson.revision, engine: 'alloflow-packet/1', form: '', mode: 'practice' },
        lessonId: lesson.lessonId, revision: lesson.revision, lessonTitle: lesson.title, activityTitles: lesson.activityTitles || {},
        learner: state.name, learnerName: state.name, startedAt: state.startedAt, finishedAt: state.finishedAt,
        startedLocal: state.startedLocal || (state.startedAt ? localIso(new Date(state.startedAt)) : ''),
        finishedLocal: state.finishedLocal || (state.finishedAt ? localIso(new Date(state.finishedAt)) : ''),
        durationMs: Math.max(0, Date.parse(state.finishedAt) - Date.parse(state.startedAt)) || 0, timesAreFromTheLearnerDevice: true,
        // Time on the items (their ms, hidden time left out); durationMs spans days when a file is resumed.
        activeMs: state.items.reduce(function (n, r) { return n + Math.max(0, Math.round(Number(r.ms) || 0)); }, 0),
        items: items.map(function (e, i) {
          var r = state.items[i];
          return { n: i + 1, itemId: e.item.id, activity: e.activity, word: e.item.word, target: e.item.target != null ? e.item.target : null,
            responses: r.responses.slice(), attempts: r.attempts, firstTry: r.firstTry, correct: r.correct, done: r.done, ms: r.ms || 0,
            supports: r.supports, practice: r.practice || null, flag: r.flag || '', typed: r.typed || undefined,
            // 2026-11-17: from Cover it (or from the card being shown) to the first answer from memory, ms.
            recallMs: r.laps && r.laps.recall != null ? r.laps.recall : undefined };
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
      // A download cannot be seen to finish: after Save the line says the browser is saving (this opening only).
      // A practice file says it in a young student's words; a check keeps its own.
      var savingText = check ? L.saving_file : L.saving_work;
      var fileStatus = statusLine(state.sent ? fmt(L.sent, { receipt: state.sent }) : savingFile ? fmt(savingText, { file: savingFile }) : (storeOk ? L.saved_device : L.saved_device_off),
        state.sent ? 'ok' : (storeOk || savingFile ? '' : 'warn'));
      var hideLast = function () { var ls = main.querySelector('[data-last-step]'); if (ls) ls.hidden = true; };
      var saying = function (name) { savingFile = name; hideLast(); if (!state.sent) { fileStatus.className = 'status'; fileStatus.textContent = fmt(savingText, { file: name }); announce(fileStatus.textContent); } };
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
        // On the "Open a practice file" page, that page saves the file (see linked); the rest is as below.
        if (link) { link.tell({ kind: 'alloflow-packet-save', name: name, type: type, text: body }); state.savedFile = name; save(); saying(name); return; }
        var a = el('a', { download: name });
        if (!('download' in a) || !win.Blob || !win.URL || !win.URL.createObjectURL) { showText(L.copy_results, body.charCodeAt(0) === 0xFEFF ? body.slice(1) : body); return; }
        var url = win.URL.createObjectURL(new win.Blob([body], { type: type }));
        try {
          a.setAttribute('href', url);
          doc.body.appendChild(a);
          a.click();
        } finally {
          try { if (a.parentNode) a.parentNode.removeChild(a); } catch (_) {}
          win.setTimeout(function () { try { win.URL.revokeObjectURL(url); } catch (_) {} }, 60000);
        }
        state.savedFile = name; save();
        saying(name);
      };
      // Both files are named <lesson>__<learner or results>__<finish date>. The spreadsheet file is the
      // main one (the one every page tells learners and teachers to use); the JSON and the copy are
      // under "Other ways to save".
      var saveButton = el('button', { type: 'button', 'data-save-json': '', on: { click: function () {
        var file = resultFile();
        saveAs(kit.csv(file).stem + '.json', JSON.stringify(file, null, 2), 'application/json');
      } }, text: L.save });
      // In a practice file this is the one big button, "Save my work", with a picture of saving.
      var csvButton = el('button', { class: [state.sent ? '' : 'primary', check ? '' : 'big'].filter(Boolean).join(' ') || false, type: 'button', 'data-save-csv': '', on: { click: function () {
        var file = resultFile(), table = kit.csv(file);
        saveAs(table.stem + '.csv', table.text(file.integrity), 'text/csv;charset=utf-8');
      } } }, check ? [L.save_csv] : [el('span', { class: 'save-icon', 'aria-hidden': 'true' }), L.save_work]);
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
      var more = el('details', { class: 'more-saves', 'data-more-saves': '' }, [el('summary', { text: L.more_saves }), el('div', { class: 'row' }, [saveButton, copyButton])]);
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
        sendButton = el('button', { class: check ? 'primary' : 'primary big', type: 'button', on: { click: function () {
          if (sendButton.getAttribute('aria-disabled') === 'true') return;
          sendButton.setAttribute('aria-disabled', 'true');
          fileStatus.className = 'status'; fileStatus.textContent = L.sending; announce(L.sending);
          send().then(function (data) {
            state.sent = String((data && data.filename) || 'ok').slice(0, 120); save(); hideLast();
            fileStatus.className = 'status ok'; fileStatus.textContent = fmt(L.sent, { receipt: state.sent }); announce(fileStatus.textContent);
          }, function () {
            sendButton.removeAttribute('aria-disabled');
            fileStatus.className = 'status warn'; fileStatus.textContent = L.send_failed; announce(L.send_failed);
          });
        } }, text: L.send });
        if (state.sent) sendButton.setAttribute('aria-disabled', 'true');
      }
      var startOver = function () {
        put(null);
        state = null;
        if (tools) storePrefs();
        renderStart();
      };
      // Practice again throws this attempt away: ask first unless it was sent
      // or saved as a file. An in-page panel (window.confirm is unreliable in
      // iPad Safari and in file previews).
      var confirmText = el('p', { id: 'practice-again-text', tabindex: '-1', style: 'margin:0 0 8px', text: L.practice_again_confirm });
      var keepButton = el('button', { type: 'button', class: 'primary', 'data-practice-keep': '', on: { click: function () { confirmBox.hidden = true; againButton.focus(); } }, text: L.keep_results });
      var confirmBox = el('div', { class: 'status warn', role: 'group', 'aria-labelledby': 'practice-again-text', hidden: true, 'data-practice-confirm': '',
        on: { keydown: function (e) { if ((e.key === 'Escape' || e.key === 'Esc') && !e.isComposing && e.keyCode !== 229 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); keepButton.click(); } } } }, [
        confirmText,
        el('div', { class: 'row' }, [keepButton, el('button', { type: 'button', 'data-practice-start-over': '', on: { click: startOver }, text: L.start_over })]),
      ]);
      var againButton = el('button', { type: 'button', 'data-practice-again': '', on: { click: function () {
        if (state.sent || state.savedFile) { startOver(); return; }
        confirmBox.hidden = false; confirmText.focus();
      } }, text: L.practice_again });
      var qrBox = kit.qr && kit.qrLib && lesson.qr && lesson.qr.k ? kit.qr({ doc: doc, win: win, el: el, fmt: fmt, L: L, qr: lesson.qr, lib: kit.qrLib, getResult: resultFile, announce: announce, showText: showText }) : null;
      if (check) { check.finish({ send: sendButton, save: saveButton, csv: csvButton, copy: copyButton, more: more, about: info, status: fileStatus, copyBox: copyBox, qr: qrBox, note: closedNote || (sendButton ? L.send_note : L.not_sent) }); return; }
      // A star for finishing (drawn by the style rules), and each activity's own result when the file has several.
      // In the file's own order, by id.
      var recOf = Object.create(null);
      if (ownOrder) state.items.forEach(function (r) { if (r) recOf[r.itemId] = r; });
      var at = 0, tally = lesson.blocks.map(function (b) {
        var t = 0, f = 0, pt = 0, pd = 0;
        b.items.forEach(function (it) { var r = ownOrder ? recOf[it.id] : state.items[at++]; if (r && (r.practice || b.activity === 'letter_tracing')) { pt++; if (r.done) pd++; } else if (r) { t++; if (r.firstTry) f++; } });
        // Practice (Letter Trace) has its own row: how many were done, never a score.
        return t ? el('li', {}, [el('b', { text: activityTitle(b.activity) }), el('span', { text: fmt(L.done_activity || '{first} of {total}', { first: f, total: t }) })])
          : pt ? el('li', {}, [el('b', { text: activityTitle(b.activity) }), el('span', { text: fmt(L.done_practice, { done: pd, total: pt }) })]) : null;
      }).filter(Boolean);
      var practiceTotal = state.items.filter(function (r, i) { return !(items[i] && items[i].again) && (r.practice || (items[i] && items[i].activity === 'letter_tracing')); }).length;
      var againDone = state.items.filter(function (r, i) { return items[i] && items[i].again && r.done; }).length;
      // 2026-11-22: Show my teacher — concise 3-second deskside conferencing summary inside a collapsed fold.
      var conferCard = (function () {
        var file = resultFile(), secs = Math.max(0, Math.round((Number(file.activeMs) || 0) / 1000));
        var timeTxt = secs < 60 ? secs + ' s' : Math.floor(secs / 60) + ' min' + (secs % 60 ? ' ' + (secs % 60) + ' s' : '');
        var meta = [];
        if (file.learner) meta.push(file.learner);
        meta.push(fmt(L.confer_time, { time: timeTxt }));
        meta.push(s.items || !practiceTotal ? fmt(L.done_summary, { first: s.firstTry, total: s.items }) : fmt(L.done_practice, { done: s.practised, total: practiceTotal }));
        var multiAct = lesson.blocks.length > 1, missedRows = [], retryRows = [];
        file.items.forEach(function (it, i) {
          if ((items[i] && items[i].again) || !it.done || it.practice || it.activity === 'letter_tracing') return;
          if (!it.correct) missedRows.push({ kind: 'missed', it: it });
          else if (!it.firstTry) retryRows.push({ kind: 'retry', it: it });
        });
        var focusRows = missedRows.concat(retryRows).map(function (row) {
          var it = row.it, got = (it.responses || []).filter(Boolean).join(', '), parts = [];
          if (got) parts.push(fmt(L.confer_answered, { got: got }));
          if (it.target != null && String(it.target) !== '' && (row.kind === 'missed' || String(it.target) !== got)) parts.push(fmt(L.confer_expected, { want: String(it.target) }));
          var title = (multiAct ? activityTitle(it.activity) + ': ' : '') + (it.word || ('#' + it.n));
          return el('li', { 'data-confer-item': row.kind }, [
            el('span', { class: 'confer-tag', text: row.kind === 'missed' ? L.confer_missed : L.confer_retry }),
            el('b', { text: title }),
            parts.length ? el('span', { text: ' — ' + parts.join(' · ') }) : null,
          ]);
        });
        var supList = [], supSeen = Object.create(null), addSup = function (label) { if (label && !supSeen[label]) { supSeen[label] = 1; supList.push(label); } };
        var prefs = tools && tools.prefs ? tools.prefs() : null;
        if (prefs) {
          var tMap = { size: L.tools_size, colors: L.tools_colors, spacing: L.tools_spacing, font: L.tools_font, focus: L.tools_focus, lens: L.tools_lens, choices: L.tools_choices, speed: L.tools_speed, sounds: L.tools_sounds, bold: L.tools_bold };
          Object.keys(prefs).forEach(function (k) { if (tMap[k]) addSup(tMap[k]); });
        }
        var counts = Object.create(null), skipTool = /^(?:text(?:Larg|Extra)|contrast|colors|spacing(?:Wide|ExtraWide)$|letters|reading(?:Focus|Ruler)$|magnifier$|readChoices$|sounds(?:More|Less)$|boldStart$)/;
        file.items.forEach(function (it) {
          var sp = it.supports || {};
          Object.keys(sp).forEach(function (k) {
            var n = Number(sp[k]) || 0;
            if (!(n > 0) || skipTool.test(k)) return;
            var label = /^(wordReplays|questionReplays|replays)$/.test(k) ? 'Replayed audio' : k === 'hearAll' ? (L.hear_all || 'Hear all') : k === 'copied' ? 'Copied fact' : k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
            counts[label] = (counts[label] || 0) + n;
          });
        });
        Object.keys(counts).forEach(function (k) { addSup(k + ' (' + counts[k] + ')'); });
        return el('details', { class: 'more-saves confer', 'data-teacher-confer': '' }, [
          el('summary', { text: L.confer_open }),
          el('p', { class: 'confer-meta', 'data-confer-head': '', text: meta.join(' · ') }),
          s.items ? (focusRows.length ? el('div', { 'data-confer-focus': '' }, [
            el('p', { style: 'margin:8px 0 4px;font-weight:700', text: L.confer_focus + ' (' + focusRows.length + ')' }),
            el('ul', { class: 'confer-list' }, focusRows),
          ]) : el('p', { 'data-confer-focus': '', text: L.confer_all_first })) : null,
          el('p', { class: 'muted', 'data-confer-supports': '', text: supList.length ? fmt(L.confer_supports, { list: supList.join(', ') }) : L.confer_supports_none }),
          qrBox,
          el('p', { class: 'muted', style: 'margin:6px 0 0', text: L.confer_note }),
        ]);
      })();
      screen(L.done_title, [
        el('div', { class: 'card' }, [
          el('div', { class: 'hero' }, [el('span', { class: 'done-star', 'aria-hidden': 'true' }),
            // A file of practice only (Letter Trace) says how much was done, not "0 of 0".
            el('p', { class: 'letters', text: s.items || !practiceTotal ? fmt(L.done_summary, { first: s.firstTry, total: s.items }) : fmt(L.done_practice, { done: s.practised, total: practiceTotal }) }),
            s.afterRetry ? el('p', { text: fmt(L.done_retry, { retry: s.afterRetry }) }) : null,
            againDone ? el('p', { 'data-done-again': '', text: fmt(L.done_again, { n: againDone }) }) : null]),
          tally.length > 1 ? el('ul', { class: 'tally' }, tally) : null,
          // Until it is saved or sent: the one thing left to do, in plain words.
          !(state.sent || state.savedFile) ? el('p', { class: 'letters', 'data-last-step': '', text: L.done_last_step }) : null,
          el('div', { class: 'row big-row' }, [sendButton, csvButton]),
          fileStatus,
          // A closing date that has passed is said outside the fold: it changes what the student does.
          closedNote ? el('p', { class: 'muted', text: closedNote }) : null,
          el('div', { class: 'row', style: 'justify-content:center' }, [againButton]),
          confirmBox,
          copyBox,
          conferCard,
          // For the adult beside the student: what the file is, the other ways to save, and About this file.
          el('details', { class: 'more-saves grown-ups', 'data-more-saves': '', 'data-grown-ups': '' }, [
            el('summary', { text: L.grown_ups }),
            L.grown_ups_file ? el('p', { text: L.grown_ups_file }) : null,
            el('p', { class: 'muted', text: sendButton ? L.send_note : L.not_sent }),
            el('div', { class: 'row' }, [saveButton, copyButton, info.button]),
          ]),
        ]),
        info.panel,
      ]);
    };
    // The reading tools, before the check's flow: their keys come first.
    var savedTools = (stored() || {}).tools;
    var tools = kit.tools ? kit.tools({ doc: doc, win: win, L: L, el: el, page: doc.querySelector('main') || main.parentNode, app: main,
      prefs: savedTools !== undefined ? savedTools : (lesson.defaultTools && typeof lesson.defaultTools === 'object' ? lesson.defaultTools : undefined), store: function () { storePrefs(); }, save: function () { save(); },
      // Read the choices: in a file whose choices are read by the device voice, or whose opening does not play its sound choices.
      choices: lesson.blocks.some(function (b) { return /^(isolation|segmentation|mapping|syllable_blending)$/.test(b.activity) || b.items.some(function (it) { return it.read === true; }); }),
      directions: lesson.mode !== 'probe' && lesson.blocks.some(function (b) { return !/^(math_|vocab_|read_along$|symbol_runner$|manipulation$|sound_sort$|word_families$)/.test(b.activity); }),
      directionsOnce: !!lesson.instructionsOnce,
      speed: Object.keys(lesson.audio || {}).length > 0 || lesson.deviceVoice === true || lesson.blocks.some(function (b) { return b.items.some(function (it) { return it.read === true; }); }),
      onSpeed: function (rate) { if (audioEl && !audioEl.paused) { try { audioEl.defaultPlaybackRate = rate; audioEl.playbackRate = rate; } catch (_) {} } },
      sounds: lesson.mode !== 'probe' && lesson.blocks.some(function (b) { return /^(blending|syllable_blending|segmentation)$/.test(b.activity); }) }) : null;
    stopBtn = el('button', { type: 'button', hidden: true, 'data-player-stop-audio': '', on: { click: function () {
      var backTo = doc.querySelector('[data-tools-open]') || main.querySelector('h2');
      hearStops.slice().forEach(function (halt) { halt(); });
      stop();
      if (backTo && typeof backTo.focus === 'function') backTo.focus();
      announce(L.audio_stopped || 'Audio stopped');
    } } }, [el('span', { 'aria-hidden': 'true', text: String.fromCharCode(0x25A0) + ' ' }), L.stop_audio || 'Stop audio']);
    var toolBar = doc.querySelector('.lt-bar');
    if (toolBar) toolBar.appendChild(stopBtn);
    // A check (lesson.mode 'probe') brings its own flow in kit.check; a practice file has none.
    var ensureNavState = function () {
      if (state) return false;
      var prior = load(), resumed = !!(prior && prior.startedAt && !prior.finishedAt);
      state = resumed ? prior : fresh();
      if (!state.name && givenName) state.name = givenName.slice(0, 60);
      if (!state.startedAt) { var d = new Date(); state.startedAt = d.toISOString(); state.startedLocal = localIso(d); }
      if (!state.sessionId) state.sessionId = uuid();
      return !resumed;
    };
    var check = kit.check ? kit.check({ doc: doc, win: win, lesson: lesson, L: L, kit: kit, items: items, renders: renders, matches: matches, el: el, fmt: fmt, announce: announce,
      screen: screen, statusLine: statusLine, fresh: fresh, save: save, now: now, clockStart: clockStart, clockStop: clockStop, clockHold: clockHold, play: play, playAll: playAll, stop: stop,
      hearAllIn: hearAllIn, autoHear: autoHear, givenName: function () { return givenName; },
      handle: function (h) { activeHandle = h || null; }, noFocus: function () { return silentFocus; }, ensureNavState: ensureNavState,
      slow: function () { return !!(tools && tools.slow && tools.slow()); },
      speedRate: function () { return tools && tools.speedRate ? tools.speedRate() : 1; },
      toolPref: function (k, v) { if (!tools) return null; if (arguments.length > 1) { if (tools.setExtra) tools.setExtra(k, v); return v ? 1 : 0; } return tools.getExtra ? tools.getExtra(k) : null; },
      noVoice: function (on) { if (tools && tools.noVoice) tools.noVoice(on); },
      // Two tabs: held() is false in a copy that waits (or should); took() while Continue here reads the place.
      held: owned, took: function () { return tab.took; }, stored: function () { return storeOk; },
      state: function (next) { if (next !== undefined) state = next; return state; }, results: function () { return resultFile(); },
      renderStart: function () { renderStart(); }, renderFinish: function () { renderFinish(); } }) : null;
    var previewNav = function (action, target) {
      if (!items.length || !tab.owner) return;
      silentFocus = true;
      try {
        if (check && check.nav) { check.nav(action, target); return; }
        var go = function (i) { state.finishedAt = null; state.finishedLocal = ''; state.index = i; save(); renderItem(); };
        if (action === 'prev') {
          if (!state) { var p = load(); if (!p || !p.startedAt || p.finishedAt || !(p.index > 0)) return; state = p; }
          if (state.finishedAt) { go(items.length - 1); return; }
          if (state.index > 0) go(state.index - 1);
        } else if (action === 'next') {
          if (ensureNavState()) { go(0); return; }
          if (state.finishedAt) return;
          if (state.index + 1 >= items.length) { state.index = items.length; renderFinish(); } else go(state.index + 1);
        } else if (action === 'goto') {
          ensureNavState();
          if (target === 'end' || Number(target) >= items.length) { state.index = items.length; renderFinish(); return; }
          var idx = Math.floor(Number(target));
          if (isFinite(idx)) go(Math.max(0, Math.min(idx, items.length - 1)));
        }
      } finally { silentFocus = false; }
    };
    openTabs();
    renderStart();
    var navGate = false;
    try { readPlace(); } catch (_) { navGate = true; }
    var navToken = navGate && linked() && link.nav ? link.nav : '';
    if (navToken) win.addEventListener('message', function (e) {
      var d = e && e.data;
      if (e.source === win.parent && d && d.kind === 'alloflow-packet-nav' && d.token === navToken) previewNav(d.action, d.index);
    });
    return { results: function () { return state && resultFile(); } };
  }

  // ---------------------------------------------------------------------------
  // Word pictures. This function travels ONLY in a practice file whose lesson
  // has word pictures (lesson.pictures); every other file is as it was. It
  // wraps each activity's render, so the rule lives in one place: the picture
  // goes above the activity and shows when PICTURE_RULE says. Until the item
  // is done its alt text is empty and a neutral label stands in ("Picture
  // clue"), so a screen reader never names the word early; then it is named.
  // Self-contained: it uses only its parameters.
  // ---------------------------------------------------------------------------
  function takeHomePictures(renders, rule, L) {
    var out = {};
    Object.keys(renders).forEach(function (id) {
      var base = renders[id];
      var when = rule && rule[id];
      if (when !== 'prompt' && when !== 'retry' && when !== 'after') { out[id] = base; return; }
      out[id] = function (item, ctx) {
        var src = ctx.image(item.wordPicture);
        if (!src) return base(item, ctx);
        // White behind the drawing: symbols are drawn for a white page, also in dark mode.
        var img = ctx.el('img', { class: 'picture', src: src, alt: '', style: 'width:160px;height:160px;object-fit:contain;background:#fff;padding:6px' });
        var label = ctx.el('span', { class: 'sr', text: L.picture_clue });
        // No "display" on the box: it would undo "hidden".
        var box = ctx.el('div', { 'data-word-picture': when, style: 'margin:0 0 12px;text-align:center', hidden: when !== 'prompt' }, [img, label]);
        ctx.root.appendChild(box);
        var mine = {};
        Object.keys(ctx).forEach(function (k) { mine[k] = ctx[k]; });
        // 'retry': the picture is the help after a first wrong try.
        mine.answer = function (response, isCorrect, options) {
          var outcome = ctx.answer(response, isCorrect, options);
          if (when === 'retry' && outcome === 'retry') box.hidden = false;
          return outcome;
        };
        var handle = base(item, mine) || null;
        return Object.assign({}, handle, {
          // The item is over (right, missed, practised, or reopened when done):
          // the picture shows and may now be named.
          reveal: function (correct) {
            box.hidden = false;
            img.setAttribute('alt', ctx.fmt(L.picture_of, { word: item.word }));
            if (label.parentNode) label.parentNode.removeChild(label);
            if (handle && typeof handle.reveal === 'function') handle.reveal(correct);
          },
        });
      };
    });
    return out;
  }
  // A lesson without its word pictures (a check never shows one). Pictures an
  // activity places itself stay. The lesson passed in is not changed.
  function withoutWordPictures(lesson) {
    var blocks = lesson.blocks.map(function (b) {
      return Object.assign({}, b, { items: (b.items || []).map(function (it) {
        if (!it || it.wordPicture == null) return it;
        var copy = Object.assign({}, it);
        delete copy.wordPicture;
        return copy;
      }) });
    });
    var images = {}, all = lesson.images || {};
    var walk = function (value) {
      if (typeof value === 'string') { if (all[value]) images[value] = all[value]; return; }
      if (value && typeof value === 'object') Object.keys(value).forEach(function (k) { walk(value[k]); });
    };
    walk(blocks);
    var out = Object.assign({}, lesson, { blocks: blocks, images: images });
    delete out.pictures;
    return out;
  }
  function hasWordPictures(lesson) {
    return (lesson.blocks || []).some(function (b) { return (b.items || []).some(function (it) { return !!it && it.wordPicture != null; }); });
  }

  // ---------------------------------------------------------------------------
  // Check mode (lesson.mode 'probe'; the visible word is "check"). The four
  // functions below travel ONLY in a check file; a practice file has none of them.
  // ---------------------------------------------------------------------------
  var CHECK_ROUNDS = 20000;
  var CHECK_CSS = [
    '.timer{display:flex;align-items:center;gap:12px;margin:0 0 12px;color:var(--muted);font-variant-numeric:tabular-nums}',
    '.timebar{flex:1;height:10px;border-radius:6px;background:var(--line);overflow:hidden}.timebar span{display:block;height:100%;background:var(--accent)}[data-lt-colors="1"] .timebar{background:var(--soft);border:1px solid var(--line)}',
    // 2026-11-13: under forced colors (Windows contrast themes) the bar kept no color at all; it is drawn as the progress bar is.
    '@media (forced-colors:active){.timebar{border:1px solid CanvasText}.timebar span{forced-color-adjust:none;background:Highlight}}',
    '.prompt{font-size:2.6rem;font-weight:700;text-align:center;margin:8px 0 16px;overflow-wrap:anywhere}.blank{display:inline-block;min-width:1.6em;border-bottom:4px solid var(--accent);color:var(--accent)}',
    '.answer{display:block;margin:0 auto;text-align:center;font-size:2rem;font-weight:700;max-width:220px}',
    '.pad{display:grid;grid-template-columns:repeat(3,minmax(64px,96px));gap:10px;justify-content:center;margin:16px auto 0}.pad button{min-height:56px;font-size:1.5rem;font-weight:700;padding:6px}.pad .wide{grid-column:1/-1}',
    // A short phone screen (2026-11-16, measured at 360 x 640: the Next key of a Missing Number check was 48 px below the
    // screen): the keys are 48 px tall, still a full touch target, and the spaces are a little smaller.
    '@media (max-width:480px) and (max-height:700px){.prompt{font-size:2.2rem;margin:4px 0 10px}.answer{font-size:1.6rem;padding:4px 12px}.pad{gap:8px;margin-top:10px}.pad button{min-height:48px}.timer{margin-bottom:8px}[data-step] .card{margin-top:8px}}',
    '.pair{display:flex;gap:24px;justify-content:center;flex-wrap:wrap;list-style:none;padding:0;margin:16px 0}.pair button{min-width:132px;min-height:132px;font-size:3rem;font-weight:700;border-width:4px}.pair button.right{border-color:var(--ok);background:var(--ok-bg);opacity:1;position:relative}.pair button.right::after{content:"\\2713";position:absolute;top:6px;inset-inline-end:8px;font-size:1.1rem;color:var(--ok)}@media (forced-colors:active){.pair button.right{outline:4px solid Highlight}.pair button.right::after{forced-color-adjust:none;background:Highlight;color:HighlightText;padding:1px 5px}}@media (max-width:480px){.pair{gap:14px}.pair button{min-width:min(132px,42vw);font-size:clamp(2rem,10vw,3rem)}}',
    '.scroll{overflow-x:auto}.review{width:100%;border-collapse:collapse;font-size:.95rem}.review th,.review td{border:1px solid var(--line);padding:6px 8px;text-align:start}.review td:nth-child(2),.review td:nth-child(5){white-space:nowrap}',
  ].join('\n');

  // Sealed QR styles and UI: travel ONLY in a file made or sealed with a teacher QR public key.
  var QR_CSS = [
    '.qr-wrap{margin-top:12px;padding-top:12px;border-top:1px solid var(--line)}',
    '.qr-panel{margin-top:10px;padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--soft);text-align:center}',
    '.qr-frame{display:inline-block;padding:8px;background:#ffffff;border:1px solid #d5dbe3;border-radius:10px;forced-color-adjust:none}',
    '.qr-img{display:block;width:min(280px,100%);height:auto;image-rendering:pixelated;image-rendering:crisp-edges;forced-color-adjust:none}',
    '.qr-fp{margin:8px 0 4px;font-size:.9rem;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--ink)}',
    '.qr-code{margin:8px 0;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--card);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.8rem;word-break:break-all;text-align:start;max-height:78px;overflow:auto;user-select:all}',
    '@media (forced-colors:active){.qr-frame{background:#ffffff;border:2px solid CanvasText;forced-color-adjust:none}.qr-img{forced-color-adjust:none}}',
    '@media print{.qr-frame,.qr-img{-webkit-print-color-adjust:exact;print-color-adjust:exact}}',
  ].join('\n');

  function takeHomeQr(opts) {
    var doc = opts.doc, win = opts.win, el = opts.el, fmt = opts.fmt, L = opts.L, qr = opts.qr, lib = opts.lib;
    var shown = false, currentCode = '';
    var frame = el('div', { class: 'qr-frame', 'data-qr-frame': '' });
    var fpLine = el('p', { class: 'qr-fp', 'data-qr-fp': '', text: 'Key ID: ' + (qr.fp || '') });
    var noteLine = el('p', { class: 'muted', 'data-qr-note': '', text: fmt(L.qr_note, { fp: qr.fp || '' }) });
    var trimLine = el('p', { class: 'muted', 'data-qr-trimmed': '', hidden: true, text: L.qr_trimmed });
    var codeBox = el('pre', { class: 'qr-code', 'data-qr-code': '', tabindex: '0', 'aria-label': L.qr_title });
    var status = el('p', { class: 'status', 'data-qr-status': '', role: 'status', 'aria-live': 'polite', hidden: true });
    var clearFrame = function () {
      while (frame.firstChild) frame.removeChild(frame.firstChild);
      codeBox.textContent = '';
      currentCode = '';
    };
    var setVisible = function (next) {
      shown = !!next;
      toggleBtn.setAttribute('aria-expanded', shown ? 'true' : 'false');
      toggleBtn.textContent = shown ? L.qr_hide : L.qr_show;
      panel.hidden = !shown;
      status.hidden = true;
      status.textContent = '';
      if (!shown) { clearFrame(); return; }
      try {
        var sealed = lib.sealResult(opts.getResult(), qr.k);
        currentCode = sealed.code;
        while (frame.firstChild) frame.removeChild(frame.firstChild);
        frame.appendChild(lib.qrImgEl(doc, sealed.code, fmt(L.qr_alt, { fp: sealed.fingerprint })));
        fpLine.textContent = 'Key ID: ' + sealed.fingerprint;
        noteLine.textContent = fmt(L.qr_note, { fp: sealed.fingerprint });
        trimLine.hidden = !sealed.truncated;
        codeBox.textContent = sealed.code;
        opts.announce(fmt(L.qr_alt, { fp: sealed.fingerprint }));
      } catch (_) {
        clearFrame();
        status.hidden = false;
        status.className = 'status warn';
        status.textContent = L.qr_error;
        opts.announce(L.qr_error);
      }
    };
    var toggleBtn = el('button', { type: 'button', 'data-qr-toggle': '', 'aria-expanded': 'false', on: { click: function () { setVisible(!shown); } }, text: L.qr_show });
    var copyBtn = el('button', { type: 'button', 'data-qr-copy': '', on: { click: function () {
      if (!currentCode) return;
      var manual = function () { opts.showText(L.qr_copy_manual, currentCode); };
      try {
        win.navigator.clipboard.writeText(currentCode).then(function () {
          status.hidden = false;
          status.className = 'status ok';
          status.textContent = L.qr_copied;
          opts.announce(L.qr_copied);
        }, manual);
      } catch (_) { manual(); }
    } }, text: L.qr_copy });
    var hideBtn = el('button', { type: 'button', 'data-qr-hide': '', on: { click: function () { setVisible(false); toggleBtn.focus(); } }, text: L.qr_hide });
    var panel = el('div', { class: 'qr-panel', 'data-qr-panel': '', hidden: true, on: { keydown: function (e) {
      if ((e.key === 'Escape' || e.key === 'Esc') && !e.isComposing && e.keyCode !== 229 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setVisible(false);
        toggleBtn.focus();
      }
    } } }, [
      frame, fpLine, noteLine, trimLine, codeBox,
      el('div', { class: 'row', style: 'justify-content:center' }, [copyBtn, hideBtn]),
      status,
    ]);
    return el('div', { class: 'qr-wrap', 'data-qr-wrap': '' }, [toggleBtn, panel]);
  }

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
    // 2026-11-13: the time ran out while the page was hidden or closed (flag time_up_away): no score in any unit, and
    // completion "time_up_away", which readers made before it read as no score.
    var away = completion === 'time' && Array.isArray(t.flags) && t.flags.indexOf('time_up_away') >= 0;
    var raw = Math.max(0, Number(t.elapsedMs) || 0) / 1000;
    var elapsed = limit === null ? raw : completion === 'time' ? limit : Math.min(limit, raw);
    var early = limit !== null && completion === 'complete' && elapsed < limit;
    var score = null, prorated = false, why = '';
    if (completion === 'ended_early') why = 'ended_early';
    else if (away) why = 'time_up_away';
    else if (unit === 'digits_correct_per_minute') {
      if (limit === null) why = 'untimed';
      else if (early && elapsed < 20) why = 'too_fast';
      else { score = Math.round(digitsCorrect / Math.max(1 / 60, elapsed / 60)); prorated = early; }
    } else score = itemsCorrect;
    var tenth = function (ms) { return Math.round(Math.max(0, Number(ms) || 0) / 100) / 10; };
    var out = { measure: String(m.measure || ''), score: score, scoreUnit: unit, digitsCorrect: hasDigits ? digitsCorrect : null, digitsPossible: hasDigits ? digitsPossible : null,
      itemsCorrect: itemsCorrect, itemsAttempted: itemsAttempted, timeLimitS: limit, elapsedS: tenth(elapsed * 1000), hiddenS: tenth(t.hiddenMs), completion: away ? 'time_up_away' : completion,
      prorated: prorated, noScoreReason: why, scoringVersion: Number(m.scoringVersion) || 1, formVersion: m.formVersion == null ? '' : m.formVersion,
      attempt: Math.max(1, Math.floor(Number(t.attempt)) || 1), flags: (Array.isArray(t.flags) ? t.flags : []).map(String) };
    // Paused (Stop the check, then Keep going): the time and the count, only when it happened.
    if (Number(t.pauses) > 0) { out.pausedS = tenth(t.pausedMs); out.pauses = Math.floor(Number(t.pauses)); }
    // 2026-11-17: how often Hear the directions was pressed on the Get ready screen, only when it was.
    if (Number(t.heard) > 0) out.directionsHeard = Math.min(999, Math.floor(Number(t.heard)));
    // Untimed (an accommodation): said in the score, with the form's usual limit, so no reader takes it for a timed result.
    if (m.untimed === true && limit === null) { out.untimed = true; out.usualTimeLimitS = Number(m.usualTimeLimitS) > 0 ? Number(m.usualTimeLimitS) : null; }
    return out;
  }

  // Seal a check for the file: every item goes through its adapter's prepare
  // (an allowlist, as for a practice lesson), each answer is replaced by its
  // scrambled form and the teacher code by its salted hash. Nothing here comes
  // from the clock: the same lesson and code make the same bytes.
  function sealCheck(lesson, adapters, teacherCode) {
    var copy = JSON.parse(JSON.stringify(lesson), function (k, v) { return k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v; });
    var codec = checkCodec(sha256);
    var seen = Object.create(null);
    var minus = false;
    copy.blocks.forEach(function (block) {
      var adapter = Object.prototype.hasOwnProperty.call(adapters, block.activity) ? adapters[block.activity] : null;
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
    var lockHashObj = sha256('alloflow-check-lock|' + content);
    if (!lockHashObj || !lockHashObj.hex) throw new Error('Unable to compute SHA-256 for check sealing');
    var lockSalt = lockHashObj.hex.slice(0, 32);
    var code = str(teacherCode).trim();
    if (code && (code.length < 4 || code.length > 64)) throw new Error('The teacher code needs 4 to 64 characters');
    meta.lock = code ? { salt: lockSalt, rounds: CHECK_ROUNDS, hash: codec.lockHash(code, lockSalt, CHECK_ROUNDS) } : null;
    // The file salt comes from the lesson and the code's hash, never from the clock.
    var saltHashObj = sha256('alloflow-check-salt|' + content + '|' + (meta.lock ? meta.lock.hash : ''));
    if (!saltHashObj || !saltHashObj.hex) throw new Error('Unable to compute SHA-256 for check salt');
    meta.salt = saltHashObj.hex.slice(0, 32);
    meta.minus = minus;
    copy.blocks.forEach(function (block) {
      block.items.forEach(function (item) { item.key = codec.scramble(str(item.answer), meta.salt, item.id); delete item.answer; delete item.target; });
    });
    return copy;
  }

  // 2026-11-13 (L5): "Stop?" pauses a check (the app's "End this session?", math_fluency_module.js, 232a83d3b3):
  // pause(true) sets check.pausedFrom, holds the item's time (api.clockHold) and hides the question; tick() then
  // neither counts down nor ends the time, and keys and answers are ignored. Keep going (or Esc) calls unpause:
  // the deadline moves on by the pause and check.pausedMs adds it up, and the score's elapsed time leaves it out
  // ("Yes, stop" ends it first). A page closed during it ends the pause at the last moment the page was seen.
  // The check flow (runs INSIDE the file, in place of the practice flow). Only
  // its argument is in scope: `api` is what takeHomeShell hands over, and
  // api.kit carries sha (SHA-256), codec (checkCodec), score (checkScore) and
  // scorers (activity id -> adapter.score).
  // Shared render helper for all five vocabulary adapters (vocab_meaning, vocab_word, vocab_blank, vocab_picture,
  // vocab_picture_word). Embedded ONLY in files that use a vocab_* adapter, so speechSynthesis never enters non-vocab
  // files. Self-contained: uses only its parameters (reaches the speech engine through ctx.root.ownerDocument).
  function takeHomeVocab(item, ctx, P, isPicture) {
    var L = ctx.L;
    var doc = ctx.root.ownerDocument;
    var view = doc && doc.defaultView;
    var synth = item.read && view && view.speechSynthesis && typeof view.SpeechSynthesisUtterance === 'function' ? view.speechSynthesis : null;
    var lang = String(item.lang || 'en').toLowerCase();
    var pictured = !!isPicture && !item.image;
    var voice = function () {
      var all = [];
      try { all = synth.getVoices() || []; } catch (_) { all = []; }
      var local = all.filter(function (v) { return v && v.localService === true; });
      var match = function (v) { return String(v.lang || '').toLowerCase().replace('_', '-'); };
      return local.filter(function (v) { return match(v) === lang || match(v).indexOf(lang + '-') === 0; })[0] || null;
    };
    if (synth) { try { synth.cancel(); synth.getVoices(); } catch (_) {} }
    var readers = [], sayToken = 0, sayTimer = 0, sayEnd = null;
    var clearSay = function () { if (sayTimer && view) { view.clearTimeout(sayTimer); sayTimer = 0; } var d = sayEnd; sayEnd = null; if (d) d(false); };
    var say = function (text) {
      return new Promise(function (resolve) {
        clearSay();
        var v = synth ? voice() : null;
        if (!v) { resolve(false); return; }
        var tok = ++sayToken, over = false, end = function (ok) { if (over) return; over = true; if (sayTimer && view) { view.clearTimeout(sayTimer); sayTimer = 0; } if (sayEnd === end) sayEnd = null; resolve(ok !== false); };
        sayEnd = end;
        try {
          synth.cancel();
          var u = new view.SpeechSynthesisUtterance(text);
          u.voice = v; u.lang = v.lang; u.rate = ctx.speedRate ? (ctx.speedRate() === 1 ? 0.9 : Math.max(0.5, Math.min(1.5, Math.round(ctx.speedRate() * 0.975 * 100) / 100))) : (ctx.slow && ctx.slow() ? 0.78 : 0.9);
          u.onend = function () { end(tok === sayToken); }; u.onerror = function () { end(false); };
          synth.speak(u);
        } catch (_) { end(false); return; }
        if (!over && view) sayTimer = view.setTimeout(function () { end(false); }, 2000 + String(text).length * 130);
      });
    };
    var wake = function () { if (!synth || !voice()) return; try { var u = new view.SpeechSynthesisUtterance(''); u.volume = 0; synth.speak(u); } catch (_) {} };
    var hush = function (fromShell) { sayToken++; clearSay(); if (synth) try { synth.cancel(); } catch (_) {} if (!fromShell && ctx.stop) ctx.stop(); };
    var cleanSay = function (text) { return isPicture ? text : text.replace(/_{2,}/g, ', blank, '); };
    var sayChoice = function (c) { return c.audio ? ctx.play(c.audio) : say(cleanSay(c.text)); };
    var sayAsk = function () {
      var q = L[P + 'question'];
      if (isPicture && !pictured) return say(q);
      if (item.askAudio) { var tok = ++sayToken; wake(); return Promise.resolve(ctx.play(item.askAudio)).then(function (ok) { return ok !== false && tok === sayToken && ctx.root.isConnected ? say(q) : false; }); }
      return say(cleanSay(item.ask) + '. ' + q);
    };
    var reader = function (run, attrs, label, clipped) {
      var b = ctx.el('button', Object.assign({ type: 'button', hidden: true, on: { click: function () { ctx.support('readAloud'); hush(); run(); } } }, attrs), [label]);
      readers.push({ b: b, clipped: !!clipped });
      return b;
    };
    var hear = null;
    var showReaders = function () {
      var on = !!(synth && voice());
      readers.forEach(function (r) { r.b.hidden = !item.read || !(on || r.clipped); });
      if (hear) hear.button.hidden = hear.note.hidden = !item.read || !(on || item.choices.every(function (c) { return !!c.audio; }));
      if (typeof ctx.noVoice === 'function') ctx.noVoice(!!item.read && !on);
    };
    var blanks = [];
    var marked = function (text, track) {
      return String(text).split(/(_{2,})/).filter(Boolean).map(function (part) {
        if (!/^_{2,}$/.test(part)) return part;
        var span = ctx.el('span', {}, [ctx.el('span', { 'aria-hidden': 'true', text: part }), ctx.el('span', { class: 'sr', text: L[P + 'blank'] })]);
        if (track) blanks.push(span);
        return span;
      });
    };
    var picture = function (src, size) {
      return ctx.el('img', { src: src || '', alt: '', style: 'display:block;margin:0 auto;width:min(100%,' + size + 'px);aspect-ratio:1/1;height:auto;object-fit:contain;background:#fff;border-radius:10px;padding:6px' });
    };
    ctx.root.appendChild(ctx.el('p', { class: 'muted', style: 'margin:0', text: L[P + 'question'] }));
    var shown = null;
    if (isPicture) {
      if (pictured) ctx.root.appendChild(ctx.el('p', { class: 'letters', lang: item.lang || 'en', 'data-read': '', style: 'font-size:2rem;margin:8px 0', text: item.ask }));
      shown = pictured ? null : picture(ctx.image(item.image), 180);
      if (shown) ctx.root.appendChild(ctx.el('div', { style: 'margin:8px 0' }, [shown]));
    } else {
      ctx.root.appendChild(ctx.el('p', { class: 'letters', lang: item.lang || 'en', 'data-read': '', style: item.ask.length <= 30 ? 'font-size:2rem;margin:8px 0' : 'font-size:1.35rem;line-height:1.5;margin:8px 0' }, marked(item.ask, P === 'vocab_blank_')));
    }
    var readQBtn = reader(sayAsk, { 'data-read-aloud': 'question' }, L[P + 'read'], (!isPicture || pictured) && !!item.askAudio);
    var readRow = ctx.el('div', { class: 'row' }, [readQBtn]);
    var replayAsk = function () {
      if (!item.read || readQBtn.hidden) return false;
      ctx.support('readAloud');
      hush();
      sayAsk();
      return true;
    };
    ctx.root.appendChild(readRow);
    var list = ctx.el('ul', { class: 'choices', style: pictured ? 'grid-template-columns:repeat(2,minmax(0,1fr))' : 'grid-template-columns:1fr' });
    var boxes = [], picks = [], tried = [];
    var lock = function () { picks.forEach(function (b) { b.setAttribute('aria-disabled', 'true'); }); };
    var pick = function (i) {
      if (ctx.isDone() || tried[i]) return;
      hush();
      var response = item.choices[i].text.slice(0, 80);
      if (ctx.check) {
        var said = ctx.answer(response);
        if (said !== 'ignored' && said !== 'time_up') { boxes[i].classList.add('picked'); lock(); }
        return;
      }
      var out = ctx.answer(response, response === item.answer, { correctText: L[P + 'correct'], retryText: L[P + 'retry'], missedText: L[P + 'missed'] });
      if (out === 'retry') { tried[i] = true; boxes[i].classList.add('tried'); picks[i].setAttribute('aria-disabled', 'true'); }
    };
    item.choices.forEach(function (c, i) {
      var number = ctx.el('span', { 'aria-hidden': 'true', style: 'font-weight:700;margin-inline-end:10px', text: String(i + 1) });
      var b = pictured
        ? ctx.el('button', { type: 'button', 'data-choice': String(i + 1), 'aria-label': ctx.fmt(L[P + 'picture'], { n: i + 1 }), style: 'flex:1 1 auto;width:100%;min-height:140px;padding:8px',
          on: { click: function () { pick(i); } } }, [number, picture(ctx.image(c.image), 120)])
        : ctx.el('button', { type: 'button', lang: item.lang || 'en', 'data-choice': String(i + 1), style: 'flex:1 1 200px;min-width:0;overflow-wrap:anywhere;text-align:start;font-size:1.2rem;line-height:1.4;min-height:56px',
          on: { click: function () { pick(i); } } }, isPicture ? [number, c.text] : [number].concat(marked(c.text)));
      var box = ctx.el('li', { class: 'choice', style: pictured ? '' : 'flex-direction:row;align-items:center;flex-wrap:wrap' }, [b,
        pictured ? null : reader(function () { sayChoice(c); }, { 'data-read-aloud': 'choice-' + (i + 1), 'aria-label': ctx.fmt(L[P + 'read_choice'], { n: i + 1 }), style: 'min-height:48px;padding:6px 12px' }, L[P + 'hear'], !!c.audio)]);
      boxes.push(box); picks.push(b); tried.push(false);
      list.appendChild(box);
    });
    hear = !pictured && typeof ctx.hearAll === 'function' ? ctx.hearAll({ stop: function () { hush(true); }, before: wake, ready: function () { return !hear.button.hidden && !ctx.isDone(); },
      list: function () { return item.choices.map(function (c, i) { return { box: boxes[i], say: function () { return sayChoice(c); } }; }); } }) : null;
    if (hear) { readRow.appendChild(hear.button); readRow.appendChild(hear.note); }
    var sylMap = (item && item.syllables) || (ctx && ctx.syllables) || (typeof lesson !== 'undefined' && lesson && lesson.syllables) || null;
    var hasSyl = !!(sylMap && typeof sylMap === 'object' && Object.keys(sylMap).length);
    if (hasSyl) {
      var sylOn = typeof ctx.toolPref === 'function' && ctx.toolPref('syllables') != null
        ? !!ctx.toolPref('syllables')
        : !!(doc && doc.documentElement && doc.documentElement.getAttribute('data-vocab-syl') === '1');
      var applySyl = function (on) {
        var old = ctx.root.querySelectorAll('[data-v-syl]');
        for (var oi = 0; oi < old.length; oi++) {
          var sp = old[oi], par = sp.parentNode;
          if (par) { par.replaceChild(doc.createTextNode(sp.getAttribute('data-v-raw') || sp.textContent || ''), sp); try { par.normalize(); } catch (_) {} }
        }
        if (!on) return;
        var targets = ctx.root.querySelectorAll('[data-read], [data-choice]');
        for (var ti = 0; ti < targets.length; ti++) {
          var walk = doc.createTreeWalker(targets[ti], 4), hits = [], nd;
          while ((nd = walk.nextNode())) {
            if (!nd.parentNode || !nd.nodeValue || !/[A-Za-z]{4,}/.test(nd.nodeValue)) continue;
            if (nd.parentNode.closest && nd.parentNode.closest('.sr,[aria-hidden=true],[data-v-syl]')) continue;
            hits.push(nd);
          }
          hits.forEach(function (tn) {
            var p = tn.parentNode;
            if (!p) return;
            var raw = tn.nodeValue, re = /[A-Za-z]{4,}/g, m, last = 0, matched = false;
            var wrap = doc.createElement('span');
            wrap.setAttribute('data-v-syl', '1');
            wrap.setAttribute('data-v-raw', raw);
            while ((m = re.exec(raw))) {
              if (m.index > last) wrap.appendChild(doc.createTextNode(raw.slice(last, m.index)));
              var w = m[0], low = w.toLowerCase();
              var sylStr = Object.prototype.hasOwnProperty.call(sylMap, low) ? sylMap[low] : '';
              var parts = sylStr ? String(sylStr).split('\u00b7') : null;
              if (parts && parts.length > 1 && parts.join('').length === w.length) {
                matched = true;
                var pos = 0;
                for (var pi = 0; pi < parts.length; pi++) {
                  if (pi > 0) wrap.appendChild(ctx.el('span', { 'aria-hidden': 'true', style: 'opacity:.6;user-select:none', text: '\u00b7' }));
                  wrap.appendChild(doc.createTextNode(w.slice(pos, pos + parts[pi].length)));
                  pos += parts[pi].length;
                }
              } else {
                wrap.appendChild(doc.createTextNode(w));
              }
              last = m.index + w.length;
            }
            if (!matched) return;
            if (last < raw.length) wrap.appendChild(doc.createTextNode(raw.slice(last)));
            p.replaceChild(wrap, tn);
          });
        }
      };
      var sylBtn = ctx.el('button', {
        type: 'button',
        'data-vocab-syllables': '1',
        'aria-pressed': sylOn ? 'true' : 'false',
        on: {
          click: function () {
            sylOn = !sylOn;
            sylBtn.setAttribute('aria-pressed', sylOn ? 'true' : 'false');
            if (typeof ctx.toolPref === 'function') ctx.toolPref('syllables', sylOn);
            try { if (doc && doc.documentElement) doc.documentElement.setAttribute('data-vocab-syl', sylOn ? '1' : '0'); } catch (_) {}
            ctx.support('syllables');
            applySyl(sylOn);
          }
        }
      }, [L.vocab_syllables || 'Syllables (a\u00b7b\u00b7c)']);
      readRow.appendChild(sylBtn);
    }
    ctx.root.appendChild(list);
    if (hasSyl && sylOn) applySyl(true);
    showReaders();
    var stopEl = doc && doc.querySelector('[data-player-stop-audio]'), onStop = function () { hush(true); }, onVoices = null, unRetry = null;
    if (stopEl) stopEl.addEventListener('click', onStop);
    if (synth) {
      onVoices = function () { if (ctx.root.isConnected) showReaders(); else if (synth.onvoiceschanged === onVoices) try { synth.onvoiceschanged = null; } catch (_) {} };
      try { synth.onvoiceschanged = onVoices; } catch (_) {}
      if (!voice() && doc) {
        var retried = false, evs = ['pointerdown', 'keydown', 'click'];
        unRetry = function () { evs.forEach(function (ev) { try { doc.removeEventListener(ev, retryVoices, true); } catch (_) {} }); };
        var retryVoices = function () { if (retried) return; retried = true; unRetry(); if (!ctx.root.isConnected) return; try { synth.getVoices(); } catch (_) {} showReaders(); };
        evs.forEach(function (ev) { try { doc.addEventListener(ev, retryVoices, true); } catch (_) {} });
      }
    }
    if (typeof ctx.keys === 'function') ctx.keys(function (key) {
      if (key === 'Escape' || key === 'Esc') { var b = !!(sayEnd || (synth && synth.speaking)); hush(); return b; }
      if (key === 'r' || key === 'R') return replayAsk();
      var n = Number(key);
      if (!(n >= 1 && n <= item.choices.length)) return false;
      pick(n - 1); return true;
    });
    return {
      replay: item.read ? replayAsk : null,
      stop: function () {
        hush();
        if (stopEl) try { stopEl.removeEventListener('click', onStop); } catch (_) {}
        if (synth && onVoices && synth.onvoiceschanged === onVoices) try { synth.onvoiceschanged = null; } catch (_) {}
        if (unRetry) unRetry();
      },
      reveal: function (answer) {
        var key = typeof answer === 'string' ? answer : item.answer;
        var filled = '';
        lock();
        item.choices.forEach(function (c, i) {
          if (pictured) picks[i].setAttribute('aria-label', ctx.fmt(L[P + 'picture_of'], { n: i + 1, word: c.text }));
          if (key != null && c.text.slice(0, 80) === key) { boxes[i].classList.add('right'); picks[i].style.opacity = '1'; filled = c.text; }
        });
        if (P === 'vocab_blank_' && blanks.length && (filled || key)) {
          var word = filled || key;
          blanks.forEach(function (b) {
            b.textContent = word;
            b.setAttribute('data-blank-filled', '');
            b.style.color = 'var(--ok)';
            b.style.fontWeight = '800';
            b.style.textDecoration = 'underline';
            b.style.textUnderlineOffset = '4px';
          });
        }
        if (shown) shown.setAttribute('alt', key || item.word);
      },
    };
  }

  // Shared numeric keypad for math_computation, missing_number, math_ccc and math_rehearsal.
  // Embedded ONLY in files that use one of those activities. Self-contained: uses only its parameters.
  function takeHomeKeypad(el, win, L, options) {
    var o = options || {};
    var minus = !!o.minus;
    var inline = !!o.inline;
    var locked = false;
    var touch = false;
    try { touch = !!win.matchMedia('(hover: none) and (pointer: coarse)').matches; } catch (_) {}
    var clean = function (raw) {
      var t = String(raw == null ? '' : raw);
      var negative = minus && (t.replace(/^\s+/, '').charAt(0) === '-' || t.replace(/^\s+/, '').charCodeAt(0) === 0x2212);
      return (negative ? '-' : '') + t.replace(/[^0-9]/g, '').slice(0, 8);
    };
    var input = el('input', { type: 'text', class: inline ? false : 'answer', inputmode: touch ? 'none' : 'numeric', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
      'aria-label': o.label || L.check_pad_label || '', 'data-pad-input': '',
      style: inline ? 'display:block;margin:0 auto;max-width:200px;text-align:center;font-size:1.8rem;font-weight:700' : false });
    var next = el('button', { type: 'button', class: inline ? 'primary' : 'primary wide', 'data-key': 'next', 'aria-disabled': 'true',
      style: inline ? 'grid-column:1/-1;min-height:56px;font-size:1.3rem;font-weight:700' : false,
      on: { click: function () { press('next'); } }, text: o.nextLabel || L.check_pad_next || 'Next' });
    var focus = function () { try { input.focus(); } catch (_) {} };
    var set = function (value) {
      var v = clean(value);
      if (input.value !== v) input.value = v;
      next.setAttribute('aria-disabled', /[0-9]/.test(v) ? 'false' : 'true');
      if (typeof o.onChange === 'function') o.onChange(v);
    };
    var press = function (key) {
      if (locked || (typeof o.canPress === 'function' && !o.canPress())) return;
      var v = input.value;
      if (key === 'back') set(v.slice(0, -1));
      else if (key === 'minus') { if (minus) set(v.charAt(0) === '-' ? v.slice(1) : '-' + v); }
      else if (key === 'next') { if (/[0-9]/.test(v) && typeof o.onNext === 'function') o.onNext(v); }
      else if (/^[0-9]$/.test(key)) set(v + key);
    };
    var button = function (label, key, name) {
      return el('button', { type: 'button', 'data-key': key, 'aria-label': name || false,
        style: inline ? 'min-height:56px;font-size:1.5rem;font-weight:700;padding:6px' : false,
        on: { mousedown: function (e) { e.preventDefault(); focus(); }, click: function () { press(key); } } }, [label]);
    };
    var grid = el('div', { class: inline ? false : 'pad', role: 'group', 'aria-label': o.keysLabel || L.check_pad_keys || 'Number keys',
      style: inline ? 'display:grid;grid-template-columns:repeat(3,minmax(64px,96px));gap:10px;justify-content:center;margin:16px auto 0' : false },
      ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(function (d) { return button(d, d); }).concat([
        minus ? button(String.fromCharCode(0x2212), 'minus', o.minusLabel || L.check_pad_minus) : el('span', {}),
        button('0', '0'),
        button(String.fromCharCode(0x2190), 'back', o.deleteLabel || L.check_pad_delete),
        next,
      ]));
    input.addEventListener('input', function () { set(input.value); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.repeat && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); press('next'); } });
    grid.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.isComposing || e.keyCode === 229) return;
      var k = String(e.key || '');
      if (/^[0-9]$/.test(k)) { e.preventDefault(); press(k); }
      else if (k === 'Backspace') { e.preventDefault(); press('back'); }
      else if (minus && (k === '-' || k === String.fromCharCode(0x2212))) { e.preventDefault(); press('minus'); }
    });
    return { node: el('div', o.padAttr ? { 'data-pad': '' } : {}, [input, grid]), input: input, next: next, set: set, press: press,
      value: function () { return input.value; }, focus: focus,
      lock: function () { locked = true; input.setAttribute('readonly', ''); next.setAttribute('aria-disabled', 'true'); } };
  }

  // The clock (kept out of the function, so out of every file): deadline is wall-clock (Date.now) in saved state;
  // while loaded, max(wall, performance.now) prevents clock-rollback and catches sleep. Wall lag > 2 s sets clock_changed.
  // The countdown is plain text and a bar (no colour change or flashing; reduced motion updates every 5 s with no bar).
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
    L.intro = L.check_about; L.start = L.check_go_on;

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
    var TOOLS = { textLarger: ['tools_size', 'tools_size_1'], textLargest: ['tools_size', 'tools_size_2'], textExtraLarge: ['tools_size', 'tools_size_3'], contrastHigh: ['tools_colors', 'tools_colors_1'],
      contrastSoft: ['tools_colors', 'tools_colors_2'], colorsDark: ['tools_colors', 'tools_colors_3'], colorsOcean: ['tools_colors', 'tools_colors_4'], colorsSunny: ['tools_colors', 'tools_colors_5'],
      colorsForest: ['tools_colors', 'tools_colors_6'], colorsRose: ['tools_colors', 'tools_colors_7'], spacingWide: ['tools_spacing', 'tools_spacing_1'], spacingExtraWide: ['tools_spacing', 'tools_spacing_2'], lettersLexend: ['tools_font', 'tools_font_1'], lettersAtkinson: ['tools_font', 'tools_font_2'], lettersBook: ['tools_font', 'tools_font_3'], lettersRounded: ['tools_font', 'tools_font_4'], lettersMono: ['tools_font', 'tools_font_5'], lettersOpenDyslexic: ['tools_font', 'tools_font_6'], readingFocus: ['tools_focus'], readingRuler: ['tools_focus', 'tools_focus_3'], readChoices: ['tools_choices'], magnifier: ['tools_lens'], boldStart: ['tools_bold'] };
    var answerOf = function (item) { return kit.codec.unscramble(item.key, meta.salt, item.id); };
    var markOf = function (entry, answer, response) {
      var scorer = kit.scorers && kit.scorers[entry.activity];
      var mark = null;
      try { mark = scorer ? scorer(entry.item, answer, response) : null; } catch (_) {}
      return mark || { correct: String(response) === String(answer), digitsCorrect: null, digitsPossible: null };
    };

    var current = null;
    var ticker = null, timerText = null, timerBar = null, shownSecond = -1, warned = false, lastSave = 0;
    var calm = false, touch = false;
    try { calm = win.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}
    try { touch = win.matchMedia('(hover: none) and (pointer: coarse)').matches; } catch (_) {}
    var paint = function (left) {
      if (doc && doc.hidden) return;
      var s = Math.max(0, Math.ceil(left / 1000));
      var shown = calm ? Math.ceil(s / 5) * 5 : s;
      if (shown === shownSecond) return;
      shownSecond = shown;
      if (timerText) timerText.textContent = fmt(L.check_time_left, { time: clockText(shown * 1000) });
      if (timerBar) timerBar.style.width = Math.max(0, Math.min(100, shown * 100000 / limitMs)) + '%';
    };
    // The time ran out while the page was away: hidden (hiddenFrom) or not running at all (a tick gap: asleep, frozen),
    // for more than 3 s of the time.
    var lastRun = 0;
    var awayAtEnd = function (c, from) { return !!from && !!c.deadline && c.deadline - from > 3000; };
    var tick = function () {
      var s = S(), c = s && s.check;
      if (!c || c.phase !== 'run') return;
      // A copy of the file that waits (another tab holds it) runs no clock.
      if (api.held && !api.held()) return;
      var t = nowMs(), gap = lastRun && t - lastRun > 3000 ? lastRun : 0;
      lastRun = t;
      if (c.pausedFrom) { if (t - lastSave >= 2000) { lastSave = t; c.seen = t; api.save(); } return; }
      if (c.deadline) {
        var left = c.deadline - t;
        if (left <= 0) { timeUp(awayAtEnd(c, c.hiddenFrom || gap)); return; }
        paint(left);
        if (left <= 10000 && !warned) { warned = true; api.announce(L.check_time_10); }
      }
      if (t - lastSave >= 2000) { lastSave = t; c.seen = t; if (jumped) c.flags.clock_changed = 1; api.save(); }
    };
    var startTicker = function () { if (!ticker) ticker = win.setInterval(tick, 250); };
    var unpause = function (c, at) { var held = Math.max(0, at - c.pausedFrom); if (c.deadline) c.deadline += held; c.pausedMs = (c.pausedMs || 0) + held; c.pausedFrom = null; };

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
      // Time away in the pause ("Stop?") is not counted: the clock was stopped. Nor is time after the deadline.
      var t = nowMs();
      if (!c.pausedFrom && c.deadline && t >= c.deadline && awayAtEnd(c, c.hiddenFrom)) c.flags.time_up_away = 1;
      c.hiddenMs = (Number(c.hiddenMs) || 0) + Math.max(0, Math.min(t, c.pausedFrom || t, c.deadline || t) - c.hiddenFrom);
      c.hiddenFrom = null;
      if (c.hiddenMs > 3000) c.flags.left_the_page = 1;
      api.save();
    };
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) noteHidden(); else { noteShown(); tick(); } });
    win.addEventListener('pagehide', noteHidden);

    // Hardware keys on an item: the number pad, or the keys an activity asked for.
    doc.addEventListener('keydown', function (e) {
      var cur = current, sc = S() && S().check;
      if (!cur || (sc && sc.pausedFrom) || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.isComposing || e.keyCode === 229) return;
      var t = e.target, tag = t && t.tagName ? String(t.tagName).toUpperCase() : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      var key = String(e.key || '');
      if (cur.pad) {
        var k = /^[0-9]$/.test(key) ? key : key === 'Backspace' ? 'back' : key === '-' || key === String.fromCharCode(0x2212) ? 'minus' : key === 'Enter' && tag !== 'BUTTON' ? 'next' : '';
        if (k) { e.preventDefault(); cur.pad.press(k); }
      } else if (cur.keys && cur.keys(key) === true) e.preventDefault();
    });

    // ctx.keypad: delegates to shared kit.keypad, defaulting minus to meta.minus.
    var keypad = kit.keypad ? function (options) {
      var o = Object.assign({ minus: !!meta.minus }, options || {});
      var pad = kit.keypad(el, win, L, o);
      if (current) current.pad = pad;
      return pad;
    } : null;
    var tP = Object.create(null), speedOf = function () {
      if (api.speedRate) return api.speedRate();
      var b = doc && doc.querySelector('[data-tool^="speed-"][aria-pressed="true"]'), m = b && /(\d)$/.exec(b.getAttribute('data-tool') || '');
      return m ? ([1, 0.8, 0.6, 1.25, 1.5][+m[1]] || 1) : (api.slow && api.slow() ? 0.8 : 1);
    }, prefOf = function (k, v) {
      if (api.toolPref) return arguments.length > 1 ? api.toolPref(k, v) : api.toolPref(k);
      if (arguments.length > 1) return (tP[k] = v ? 1 : 0);
      var s = S(); return k in tP ? tP[k] : (s && s.tools && s.tools[k] != null ? +!!s.tools[k] : null);
    };
    var ctxFor = function (entry, rec, area, practice, answer) {
      var mh = api.hearAllIn(area, function (name) { rec.supports[name] = (rec.supports[name] || 0) + 1; api.save(); });
      var ctx = { root: area, el: el, fmt: fmt, L: L, item: entry.item, matches: api.matches, showLetters: !!lesson.showLetters, check: true, practice: practice, noFocus: !!(api.noFocus && api.noFocus()),
        announce: api.announce, play: api.play, playAll: api.playAll, stop: api.stop, slow: api.slow, speedRate: speedOf, toolPref: prefOf, noVoice: api.noVoice,
        hearAll: function (sp) { var h = mh(sp); if (current && h && h.halt) current.halts.push(h.halt); return h; },
        image: function (id) { return (id && lesson.images && lesson.images[id]) || null; },
        support: function (name) { rec.supports[name] = (rec.supports[name] || 0) + 1; api.save(); },
        isDone: function () { return rec.done; },
        attempts: function () { return rec.attempts; },
        keys: function (handler) { if (current) current.keys = handler; },
        keypad: keypad,
        answer: answer };
      if (kit.vocabChoice) ctx.vocabChoice = function (it, P, pic) { return kit.vocabChoice(it, ctx, P, pic); };
      return ctx;
    };
    var show = function (entry, rec, ctx) {
      var handle = null;
      try { handle = api.renders[entry.activity](entry.item, ctx) || null; } catch (_) {}
      if (current) current.handle = handle;
      if (api.handle) api.handle(handle);
      // Seen in an earlier opening of the file: the time on it counts from now.
      if (rec.shown) rec.flag = 'resumed';
      rec.shown = true; rec.ms = 0;
      api.clockStart(rec);
      api.save();
      api.autoHear(null);
      return handle;
    };

    // Practice items come first. They give feedback and are never scored.
    var practiceItem = function () {
      var s = S();
      var entry = items[s.index], rec = s.items[s.index];
      var n = items.slice(0, s.index).filter(function (e) { return e.item.practice; }).length + 1;
      var area = el('div', {}), feedback = api.statusLine('', ''), handle = null;
      feedback.setAttribute('data-feedback', '');
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
        if (!mark.correct) feedback.setAttribute('data-missed', '');
        feedback.textContent = mark.correct ? L.check_practice_right : fmt(L[entry.activity + '_practice_wrong'] || L.check_practice_wrong, { answer: right });
        if (handle && typeof handle.reveal === 'function') { try { handle.reveal(right); } catch (_) {} }
        next.hidden = false;
        next.focus();
        return mark.correct ? 'correct' : 'missed';
      };
      api.screen(fmt(L.check_practice_title, { n: n, total: practiceTotal }), [
        el('div', { class: 'card' }, [el('p', { class: 'muted', text: L.check_practice_note }), area, feedback, next]),
      ]);
      current = { rec: rec, at: api.now(), keys: null, pad: null, halts: [], handle: null };
      handle = show(entry, rec, ctxFor(entry, rec, area, true, answer));
    };
    var readyScreen = function () {
      var first = items.filter(function (e) { return !e.item.practice; })[0];
      var how = first ? L[first.activity + '_directions'] : '';
      // 2026-11-17: the recordings of this screen's own lines, when the file carries them all (lesson.directions,
      // put in by the check maker). Played only when the button is pressed; the clock still starts at Start.
      var said = Array.isArray(lesson.directions) ? lesson.directions.filter(function (id) { return typeof id === 'string' && !!(lesson.audio && lesson.audio[id]); }) : [];
      var playingDir = false;
      var dirRun = 0;
      var hear = said.length && said.length === lesson.directions.length ? el('button', { type: 'button', 'data-check-hear': '', 'aria-pressed': 'false', on: { click: function () {
        if (playingDir) {
          dirRun++;
          playingDir = false;
          api.stop();
          hear.textContent = L.check_ready_hear;
          hear.setAttribute('aria-pressed', 'false');
          return;
        }
        var c = C();
        c.heard = (Number(c.heard) || 0) + 1;
        api.save();
        var mine = ++dirRun;
        playingDir = true;
        hear.textContent = L.check_ready_stop || L.stop_audio || 'Stop audio';
        hear.setAttribute('aria-pressed', 'true');
        Promise.resolve(api.playAll(said)).then(function () {
          if (mine !== dirRun) return;
          playingDir = false;
          hear.textContent = L.check_ready_hear;
          hear.setAttribute('aria-pressed', 'false');
        });
      } }, text: L.check_ready_hear }) : null;
      api.screen(L.check_ready_title, [
        el('div', { class: 'card' }, [
          how ? el('p', { class: 'letters', text: how }) : null,
          el('p', { text: limitMs ? fmt(L.check_ready_timed, { time: timeWords(limitMs / 1000) }) : L.check_ready_untimed }),
          el('p', { text: L.check_ready_one_try }),
          first && /^(quantity_discrimination|missing_number)$/.test(first.activity) ? el('p', { class: 'muted', 'data-check-adult': '', text: hear ? L.check_ready_adult_hear : L.check_ready_adult }) : null,
          el('div', { class: 'row' }, [hear, el('button', { class: 'primary', type: 'button', 'data-check-begin': '', on: { click: startRun }, text: L.check_begin })]),
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
      // The directions stop when the check starts.
      api.stop();
      var t = nowMs();
      c.phase = 'run'; c.t0 = t; c.deadline = limitMs ? t + limitMs : null; c.seen = t; c.hiddenMs = 0; c.hiddenFrom = null; c.pausedMs = 0; c.pausedFrom = null; c.pauses = 0;
      // Tries are counted for each learner label on this device. The label is
      // kept as a hash, so no earlier name stays behind after Start over.
      var who = 't' + kit.hash(String(s.name || '').replace(/^\s+|\s+$/g, '').toLowerCase());
      s.tries = s.tries && typeof s.tries === 'object' ? s.tries : {};
      c.attempt = (Number(s.tries[who]) || 0) + 1;
      s.tries[who] = c.attempt;
      api.save();
      // Storage refused or full: the count of tries is not kept, so this try number may be wrong.
      if (api.stored && !api.stored()) { c.flags.attempt_unknown = 1; api.save(); }
      startTicker();
      runItem();
      if (limitMs) api.announce(fmt(L.check_time_start, { time: timeWords(limitMs / 1000) }));
    };
    // One try, no feedback, straight on to the next item, no way back.
    var record = function (response, skipped) {
      var s = S(), c = C(), cur = current;
      if (!cur || cur.rec.done || c.phase !== 'run' || c.pausedFrom || (api.held && !api.held())) return 'ignored';
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
      var card = el('div', { class: 'card' }, [area, skip]);
      var pause = function (on) {
        var c2 = C();
        if (c2.phase !== 'run' || !c2.pausedFrom === !on) return;
        if (on) { c2.pausedFrom = c2.seen = nowMs(); if (current) { current.halts.forEach(function (f) { try { f(); } catch (_) {} }); if (current.handle && current.handle.stop) try { current.handle.stop(); } catch (_) {} } api.stop(); } else unpause(c2, nowMs());
        api.clockHold(on); card.hidden = on; api.save();
        if (!on) tick();
      };
      // Keep going: the problem that was on screen during the pause is set aside (not counted) and the next one comes.
      var keep = function () {
        stopBox.hidden = true; pause(false);
        var s2 = S(), cur = current, c3 = C();
        // Counted as a pause only now, when the student goes on.
        if (c3.phase === 'run') { c3.pauses = (Number(c3.pauses) || 0) + 1; c3.flags.paused = 1; }
        if (cur && !cur.rec.done && C().phase === 'run') {
          // Not done and no answer: every reader then counts it as not attempted.
          cur.rec.attempts = 0; cur.rec.flag = 'paused';
          api.clockStop(); current = null; s2.index++; api.save(); runItem(); return;
        }
        stopButton.focus();
      };
      var stopButton = el('button', { type: 'button', 'data-stop': '', on: { click: function () { pause(true); stopBox.hidden = false; stopText.focus(); } }, text: L.check_stop });
      var stopBox = el('div', { class: 'status warn', role: 'group', 'aria-labelledby': 'check-stop-text', hidden: true, 'data-stop-confirm': '',
        on: { keydown: function (e) { if (/^Esc/.test(String(e.key || '')) && !e.isComposing && e.keyCode !== 229 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); keep(); } } } }, [
        stopText,
        limitMs ? el('p', { style: 'margin:0 0 8px', 'data-stop-paused': '', text: L.check_paused }) : null,
        el('div', { class: 'row' }, [
          el('button', { type: 'button', class: 'primary', 'data-stop-no': '', on: { click: keep }, text: L.check_stop_no }),
          el('button', { type: 'button', 'data-stop-yes': '', on: { click: function () { finishRun('ended_early'); } }, text: L.check_stop_yes }),
        ]),
      ]);
      api.screen(fmt(L.check_item_of, { n: n, total: scoredTotal }), [timer, card, el('div', { class: 'row' }, [stopButton]), stopBox]);
      current = { rec: rec, at: api.now(), keys: null, pad: null, halts: [], handle: null };
      show(entry, rec, ctxFor(entry, rec, area, false, function (response) { return record(response, false); }));
    };
    // At the deadline the item on screen ends unanswered.
    var timeUp = function (away) {
      var s = S(), c = C();
      if (c.phase !== 'run') return;
      if (away) c.flags.time_up_away = 1;
      var rec = s.items[s.index];
      if (rec && !rec.done) {
        rec.flag = 'time_up';
        // What was on the number pad is kept in its own field, not counted (no answer, not done).
        var typed = current && current.rec === rec && current.pad ? String(current.pad.value() || '') : '';
        if (/[0-9]/.test(typed)) rec.typed = typed.slice(0, 20);
      }
      finishRun('time');
    };
    var finishRun = function (completion) {
      var c = C();
      if (c.phase !== 'run') return;
      var t = nowMs();
      if (c.pausedFrom) unpause(c, t);
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
        out.splice(out.indexOf(L.about_records) + 1, 0, L.check_about_records);
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
        var paused = !!c.pausedFrom;
        if (c.pausedFrom) unpause(c, Number(c.seen) || c.pausedFrom);
        var t = nowMs();
        // Away from when the page was hidden or last seen running; a pause ended then, and time in it is not counted.
        var from = c.hiddenFrom || c.seen || t;
        if (paused) from = Math.max(from, Number(c.seen) || from);
        if (c.deadline && t >= c.deadline && awayAtEnd(c, from)) c.flags.time_up_away = 1;
        c.hiddenMs = (Number(c.hiddenMs) || 0) + Math.max(0, Math.min(t, c.deadline || t) - from);
        c.hiddenFrom = null;
        if (c.hiddenMs > 3000) c.flags.left_the_page = 1;
        // Continue here in another tab is not a reload: the check was open in two tabs while it ran.
        if (api.took && api.took()) c.flags.two_tabs = 1; else c.flags.reloaded = 1;
        c.seen = t; lastRun = 0;
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
        out.packet.form = String(lesson.form || ''); out.packet.mode = 'check';
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
        out.score = kit.score({ measure: meta.measure, scoreUnit: meta.scoreUnit, timeLimitS: lesson.timeLimitS, scoringVersion: meta.scoringVersion, formVersion: meta.formVersion,
          untimed: meta.untimed === true, usualTimeLimitS: meta.usualTimeLimitS }, rows,
          { elapsedMs: c.t0 ? (c.end || nowMs()) - c.t0 - (c.pausedMs || 0) : 0, hiddenMs: c.hiddenMs, pausedMs: c.pausedMs, pauses: c.pauses, completion: c.completion, attempt: c.attempt, flags: Object.keys(c.flags).sort(), heard: c.heard });
        // The reading tools that were on during a scored item, in the panel's order.
        out.score.tools = Object.keys(TOOLS).filter(function (name) {
          return out.items.some(function (it, i) { return !items[i].item.practice && it.supports && it.supports[name]; });
        });
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
        // Without a teacher code anyone can open this screen, so it shows the score only: no answers
        // and no right or wrong per item. The saved results file still has them, for the teacher.
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
            r.pauses ? fmt(L.check_review_paused, { paused: r.pausedS, times: r.pauses === 1 ? L.check_review_paused_once : fmt(L.check_review_paused_many, { n: r.pauses }) }) : '',
            r.directionsHeard ? fmt(L.check_review_heard, { n: r.directionsHeard }) : '',
            r.prorated ? L.check_review_prorated : '',
            r.untimed ? fmt(L.check_review_untimed, { seconds: r.usualTimeLimitS || '' }) : '',
            fmt(L.check_review_attempt, { n: r.attempt }),
            r.flags.length ? fmt(L.check_review_flags, { flags: r.flags.map(function (name) { return L['check_flag_' + name] || name; }).join('; ') }) : '',
            r.tools && r.tools.length ? fmt(L.check_review_tools, { tools: r.tools.map(function (name) { return TOOLS[name].map(function (k) { return L[k]; }).join(': '); }).join('; ') }) : '',
            L.check_review_note,
            lock ? '' : L.check_review_no_code,
          ];
          var body = !lock ? [] : f.items.map(function (it) {
            var result = it.practice ? L.check_r_practice : it.flag === 'skipped' ? L.check_r_skipped : it.flag === 'paused' ? L.check_r_paused
              : it.flag === 'time_up' ? (it.typed ? fmt(L.check_r_time_up_typed, { typed: it.typed }) : L.check_r_time_up)
              : !it.attempts ? L.check_r_not_reached : it.correct ? L.check_r_right : L.check_r_wrong;
            return el('tr', {}, [cell(it.n), cell(it.word), cell((it.responses || []).join(' | ')), cell(result), cell(it.target), cell(Math.round((Number(it.ms) || 0) / 100) / 10)]);
          });
          // 2026-11-22: glanceable coaching summary above the table on code-unlocked teacher review (uses <p>, not <li>).
          var focusBox = !lock ? null : (function () {
            var miss = f.items.filter(function (it) { return !it.practice && it.attempts > 0 && (!it.correct || it.flag === 'skipped'); });
            if (!miss.length) return el('div', { class: 'confer-box', 'data-confer-focus': '' }, [el('p', { text: L.check_review_focus_none })]);
            var shown = miss.slice(0, 12).map(function (it) {
              var got = it.flag === 'skipped' ? L.check_r_skipped : (it.responses || []).join(' | ');
              return '#' + it.n + ' ' + it.word + ' (' + (got ? fmt(L.confer_answered, { got: got }) + ', ' : '') + fmt(L.confer_expected, { want: it.target }) + ')';
            });
            if (miss.length > 12) shown.push('+' + (miss.length - 12) + ' more in table below');
            return el('div', { class: 'confer-box', 'data-confer-focus': '' }, [
              el('p', {}, [el('b', { text: fmt(L.check_review_focus, { n: miss.length }) })]),
              el('p', { text: shown.join(' · ') }),
            ]);
          })();
          api.screen(L.check_review_title, [
            el('div', { class: 'card', 'data-review': lock ? '' : 'score-only' }, [
              el('ul', {}, lines.filter(Boolean).map(function (text) { return el('li', { text: text }); })),
              focusBox,
              // A table wider than a phone scrolls sideways: the box takes the focus so the arrow keys can scroll it.
              !lock ? null : el('div', { class: 'scroll', tabindex: '0', role: 'region', 'aria-label': L.check_review_title }, [el('table', { class: 'review' }, [
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
          code.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); tryCode(); } });
          teacher = [el('h3', { style: 'margin:0 0 8px;font-size:1.1rem', text: L.check_teacher_title }), el('label', { for: 'teacher-code', text: L.check_teacher_code }),
            el('div', { class: 'row' }, [code, el('button', { type: 'button', 'data-teacher-show': '', on: { click: tryCode }, text: L.check_teacher_show })]), message];
        }
        if (p.qr) teacher.push(p.qr);
        // Start over asks first when results have not been saved yet. Preserves baked-in givenName on personalized files; clears typed names on shared devices.
        var doAgain = function () {
          var next = api.fresh();
          next.name = api.givenName ? api.givenName() : '';
          next.tries = s.tries;
          api.state(next); api.save(); api.renderStart();
        };
        var againText = el('p', { id: 'check-again-text', tabindex: '-1', style: 'margin:0 0 8px', text: L.check_again_confirm });
        var again = el('button', { type: 'button', 'data-check-again': '', on: { click: function () { if (s.sent || s.savedFile) { doAgain(); return; } againBox.hidden = false; againText.focus(); } }, text: L.check_again });
        var againNo = el('button', { type: 'button', class: 'primary', 'data-check-again-no': '', on: { click: function () { againBox.hidden = true; again.focus(); } }, text: L.check_again_no });
        var againBox = el('div', { class: 'status warn', role: 'group', 'aria-labelledby': 'check-again-text', hidden: true, 'data-check-again-confirm': '',
          on: { keydown: function (e) { if ((e.key === 'Escape' || e.key === 'Esc') && !e.isComposing && e.keyCode !== 229 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); againNo.click(); } } } }, [
          againText,
          el('div', { class: 'row' }, [
            againNo,
            el('button', { type: 'button', 'data-check-again-yes': '', on: { click: doAgain }, text: L.check_again_yes }),
          ]),
        ]);
        api.screen(L.check_done_title, [
          el('div', { class: 'card' }, [
            c.completion === 'time' ? el('p', { text: L.check_time_up }) : null,
            el('p', { class: 'letters', text: fmt(L.check_done_count, { done: answered, total: scoredTotal }) }),
            el('p', { text: fmt(L.check_done_time, { time: clockText(sc.elapsedS * 1000) }) }),
            el('p', { text: L.check_about }),
            el('div', { class: 'row' }, [p.send, p.csv, again, p.about.button]),
            p.more, againBox, p.status, p.copyBox,
            el('p', { class: 'muted', text: p.note }),
          ]),
          el('div', { class: 'card', 'data-teacher': '' }, teacher),
          p.about.panel,
        ]);
      },
      nav: function (action, target) {
        if (!items.length) return;
        var firstScored = items.length, lastScored = -1;
        for (var i = 0; i < items.length; i++) if (!items[i].item.practice) { if (firstScored === items.length) firstScored = i; lastScored = i; }
        var reset = function (idx) { var r = S() && S().items[idx]; if (r) { r.done = false; r.attempts = 0; r.responses = []; delete r.flag; } };
        var enter = function (phase, idx) {
          api.ensureNavState();
          var s2 = S(), c2 = C(), t = nowMs();
          if (ticker) { win.clearInterval(ticker); ticker = null; }
          api.stop(); api.clockStop(); current = null;
          if (phase === 'run') {
            if (c2.phase !== 'run') {
              c2.phase = 'run';
              if (!c2.t0) c2.t0 = t;
              if (limitMs && (!c2.deadline || c2.deadline <= t + 5000)) c2.deadline = t + limitMs;
              c2.seen = t; c2.hiddenFrom = c2.pausedFrom = c2.completion = c2.end = null;
              if (!c2.attempt) { var who = 't' + kit.hash(String(s2.name || '').trim().toLowerCase()); s2.tries = s2.tries || {}; c2.attempt = (Number(s2.tries[who]) || 0) + 1; s2.tries[who] = c2.attempt; }
            } else if (c2.pausedFrom) { unpause(c2, t); api.clockHold(false); }
          } else {
            c2.phase = phase; c2.pausedFrom = c2.hiddenFrom = c2.completion = c2.end = null;
          }
          s2.finishedAt = null; s2.finishedLocal = ''; s2.index = idx;
          if (idx < items.length && phase !== 'ready') reset(idx);
          api.save();
          if (phase === 'run') { startTicker(); if (idx < items.length) runItem(); }
          else if (phase === 'practice') practiceItem();
          else readyScreen();
        };
        var s = S(), c = s && s.check;
        if (action === 'next') {
          if (!s || !c || !c.phase) { enter(practiceTotal > 0 ? 'practice' : 'run', practiceTotal > 0 ? 0 : firstScored); return; }
          if (c.phase === 'done') return;
          if (c.phase === 'practice') { var np = s.index + 1; enter(np < items.length && items[np].item.practice ? 'practice' : 'ready', np < items.length && items[np].item.practice ? np : firstScored); return; }
          if (c.phase === 'ready') { enter('run', firstScored); return; }
          var nr = s.index + 1;
          while (nr < items.length && items[nr].item.practice) nr++;
          if (nr >= items.length) finishRun('complete'); else enter('run', nr);
        } else if (action === 'prev') {
          if (!s || !c || !c.phase) return;
          if (c.phase === 'done') { if (lastScored >= 0) enter('run', lastScored); else enter('practice', items.length - 1); }
          else if (c.phase === 'ready') { if (practiceTotal > 0) enter('practice', practiceTotal - 1); }
          else if (s.index > 0) enter(items[s.index - 1].item.practice ? 'practice' : 'run', s.index - 1);
        } else if (action === 'goto') {
          if (target === 'end' || Number(target) >= items.length) { enter('run', items.length); finishRun('complete'); return; }
          var gi = Math.floor(Number(target));
          if (!isFinite(gi)) return;
          gi = Math.max(0, Math.min(gi, items.length - 1));
          enter(items[gi].item.practice ? 'practice' : 'run', gi);
        }
      },
    };
  }

  function resolveQrCrypto(opts) {
    if (opts && opts.qrCrypto && typeof opts.qrCrypto.parsePublicKey === 'function') return opts.qrCrypto;
    if (root && root.AlloPacketQrCrypto && typeof root.AlloPacketQrCrypto.parsePublicKey === 'function') return root.AlloPacketQrCrypto;
    if (typeof require === 'function') {
      try { return require('./packets_qr_crypto.js'); } catch (_) {}
    }
    return null;
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
    // A check never shows a word's picture, so it carries none.
    if (probe && (lesson.pictures || hasWordPictures(lesson))) lesson = withoutWordPictures(lesson);
    if (probe) lesson = sealCheck(lesson, adapters, opts.teacherCode);
    // Optional zero-network sealed QR results (opt-in via opts.qrPublicKey: AFPK1....).
    var qrCrypto = null, qrSpec = null;
    if (opts.qrPublicKey) {
      qrCrypto = resolveQrCrypto(opts);
      if (!qrCrypto || typeof qrCrypto.studentEmbedSource !== 'function') throw new Error('buildHtml with qrPublicKey needs AlloPacketQrCrypto');
      qrSpec = qrCrypto.parsePublicKey(opts.qrPublicKey);
      if (!qrSpec) throw new Error('Invalid teacher QR public key (expected AFPK1....)');
      lesson = Object.assign({}, lesson, { qr: { k: qrSpec.publicKey, fp: qrSpec.fingerprint } });
    }
    // Word pictures: their words and their code travel only in a practice file that has some.
    var pictured = !probe && !!lesson.pictures && !!lesson.pictures.rule && hasWordPictures(lesson);
    var labels = Object.assign({}, DEFAULT_LABELS, probe ? CHECK_LABELS : {}, pictured ? PICTURE_LABELS : {});
    used.forEach(function (id) { Object.assign(labels, adapters[id].labels || {}); labels[id + '_title'] = labels[id + '_title'] || adapters[id].title; });
    if (qrSpec) Object.assign(labels, QR_LABELS);
    Object.assign(labels, opts.labels || {});
    // 2026-11-17: the practice end screen got words of its own that day (save_work, saving_work, grown_ups,
    // grown_ups_file). A translation made before them has none: its file keeps the words it does have for the same
    // button, line and fold, rather than showing English among them.
    var given = opts.labels || {};
    if (given.save_csv && !given.save_work) labels.save_work = given.save_csv;
    if (given.saving_file && !given.saving_work) labels.saving_work = given.saving_file;
    if (given.more_saves && !given.grown_ups) { labels.grown_ups = given.more_saves; if (!given.grown_ups_file) labels.grown_ups_file = ''; }
    // A sound's name (ctx.sound) shows only with letters on: other files do not carry the words.
    if (!lesson.showLetters) Object.keys(labels).forEach(function (k) { if (/^sound_name_/.test(k)) delete labels[k]; });
    var stripSrc = function (fn) { return fn.toString().replace(/^[ \t]*\/\/[^\n]*\n/gm, '').replace(/\n[ \t]+/g, '\n').replace(/\n{2,}/g, '\n'); };
    var renders = '{' + used.map(function (id) { return JSON.stringify(id) + ':' + stripSrc(adapters[id].render); }).join(',\n') + '}';
    var pictureParts = pictured ? 'renders=(' + takeHomePictures.toString() + ')(renders,lesson.pictures.rule,labels);\n' : '';
    var qrParts = !qrSpec ? '' : '/*afqr-start*/kit.qrLib=' + qrCrypto.studentEmbedSource() + ';\nkit.qr=' + stripSrc(takeHomeQr) + ';\n/*afqr-end*/\n';
    // A check carries its own flow, the SHA-256 that reads its answers and the
    // scoring of its activities. TextEncoder is stood in for where a browser
    // has none, so the answers can always be read.
    var checkParts = !probe ? '' : 'kit.sha=(function(){var SHA_K=' + JSON.stringify(SHA_K)
      + ';\nvar TextEncoder=window.TextEncoder||function(){this.encode=function(t){t=unescape(encodeURIComponent(t));var b=new Uint8Array(t.length);for(var i=0;i<t.length;i++)b[i]=t.charCodeAt(i);return b;};};\nreturn '
      + sha256.toString() + ';})();\nkit.codec=(' + checkCodec.toString() + ')(kit.sha);\nkit.score=' + checkScore.toString()
      + ';\nkit.scorers={' + used.map(function (id) { return JSON.stringify(id) + ':' + (typeof adapters[id].score === 'function' ? adapters[id].score.toString() : 'null'); }).join(',\n')
      + '};\nkit.check=' + takeHomeCheck.toString() + ';\n';
    var hasReadAlong = used.indexOf('read_along') >= 0;
    var hasRaPos = hasReadAlong && lesson.blocks.some(function (b) { return b.activity === 'read_along' && b.items.some(function (it) { return Array.isArray(it.lines) && it.lines.some(function (l) { return !!l.pos; }); }); });
    var hasRaChecks = hasReadAlong && lesson.blocks.some(function (b) { return b.activity === 'read_along' && b.items.some(function (it) { return Array.isArray(it.questions) && it.questions.length; }); });
    var hasVocab = used.some(function (id) { return /^vocab_/.test(id); });
    var hasKeypad = used.some(function (id) { return /^(math_|missing_number$)/.test(id); });
    var hasStudentMic = !probe && lesson.studentMic === true && hasReadAlong;
    var hasDeviceVoice = !probe && lesson.deviceVoice === true && hasReadAlong;
    var sharedParts = (hasVocab ? 'kit.vocabChoice=' + stripSrc(takeHomeVocab) + ';\n' : '')
      + (hasKeypad ? 'kit.keypad=' + stripSrc(takeHomeKeypad) + ';\n' : '')
      + (hasStudentMic ? 'kit.studentMic=' + stripSrc(takeHomeStudentMic) + ';\n' : '')
      + (hasDeviceVoice ? 'kit.deviceVoice=' + stripSrc(takeHomeDeviceVoice) + ';\n' : '');
    var mailbox = lesson.submit && /^https:\/\/script\.google\.com\/(?:a\/macros\/[A-Za-z0-9.-]+\/|macros\/)s\/[A-Za-z0-9_-]+\/exec$/.test(str(lesson.submit.url));
    var connect = mailbox ? 'https://script.google.com https://script.googleusercontent.com' : "'none'";
    // The mailbox code travels only in a file that has a mailbox. Line ends are
    // made \n because the browser reads them so, and the script is allowed by
    // its exact hash. The reading tools go in every file, without their indentation (1 KB less).
    var script = ('\n(function(){"use strict";\nvar lesson=' + safeJson(lesson) + ';\nvar labels=' + safeJson(labels) + ';\nvar matches=' + (hasCore ? core.soundAnswerMatches.toString() : 'null')
      + ';\nvar renders=' + renders + ';\nvar kit={csv:' + stripSrc(packetCsv) + ',\nhash:' + stripSrc(hashText) + ',\ntools:' + stripSrc(takeHomeTools) + ',\nmailbox:' + (mailbox ? stripSrc(takeHomeMailbox) : 'null')
      + '};\n' + sharedParts + checkParts + pictureParts + qrParts + '(' + stripSrc(takeHomeShell) + ')(document,window,lesson,labels,matches,renders,kit);\n})();\n').replace(/\r\n?/g, '\n');
    var digest = sha256(script);
    var csp = "default-src 'none'; script-src " + (digest ? "'sha256-" + digest.base64 + "'" : "'unsafe-inline'") + "; style-src 'unsafe-inline'; media-src data: blob:; img-src data:" + (FONT_CSS ? '; font-src data:' : '')
      + "; form-action 'none'; base-uri 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; manifest-src 'none'; connect-src " + connect;
    // What a reviewer (or a parent, behind "About this file") can check.
    var stem = packetCsv({ lessonTitle: lesson.title, learner: 'LEARNER' }).stem + '__DATE';
    var manifest = {
      kind: 'alloflow-packet-manifest', engine: PACKET_ENGINE, player: PLAYER, title: lesson.title,
      packet: { id: lesson.lessonId, version: lesson.revision, form: probe ? str(lesson.form) : '', mode: probe ? 'check' : 'practice' },
      what: probe ? 'A check in one file: one try for each item, and no right or wrong shown to the learner. It runs in a browser with no internet connection.'
        : 'A practice activity in one file. It runs in a browser with no internet connection.',
      stores: [{ where: 'localStorage', key: 'alloflow-take-home:' + lesson.lessonId + ':' + lesson.revision,
        holds: probe ? 'the learner label, the place reached, each answer, the time on each item, how often each help and reading tool was used, the start time with its UTC offset, a session number, the reading tool settings, the clock, the seconds away, the flags and a count of tries (by a hash of the learner label)'
          : 'the learner label, the place reached, each answer, the tries, the time on each item, how often each help and reading tool was used, the start and finish times with the UTC offset of the device, a random session number and the reading tool settings',
        until: probe ? 'the browser storage is cleared; Start over keeps only the learner label and the count of tries' : 'Start over or Practice again' }],
      saves: [{ file: stem + '.csv', format: 'alloflow-packet-result/1' }, { file: stem + '.json', format: RESULT_KIND + ' schemaVersion ' + RESULT_SCHEMA }],
      network: mailbox ? { sendsTo: 'script.google.com', what: 'the results, to the class mailbox of the teacher', when: 'only when the learner presses Send' } : 'none',
      never: (mailbox ? [] : ['internet connection']).concat(hasStudentMic ? ['camera', 'cookies', 'AI'] : ['microphone', 'camera', 'cookies', 'AI']),
      integrity: 'Each saved file carries a check value (SHA-256, or FNV-1a where the browser cannot make SHA-256). It detects accidental edits, not deliberate ones.',
      csp: csp, scriptSha256: digest ? digest.hex : '', licence: 'AGPL-3.0', licenceUrl: 'gnu.org/licenses/agpl-3.0.html', source: 'github.com/Apomera/AlloFlow', attributions: Array.isArray(opts.attributions) ? opts.attributions.map(str) : [], fonts: FONT_CREDIT || undefined,
    };
    if (qrSpec) {
      manifest.qr = { keyFingerprint: qrSpec.fingerprint, algorithm: 'X25519+HKDF-SHA256+ChaCha20-Poly1305', network: 'none' };
    }
    if (hasStudentMic) {
      manifest.microphone = 'Optional student voice practice: asks for the microphone only when the student presses Record my voice, keeps the recording in tab memory only until cleared or closed, and never saves or sends it.';
    }
    if (probe) {
      var all = lesson.blocks.reduce(function (list, b) { return list.concat(b.items); }, []);
      manifest.check = { measure: str(lesson.check.measure), scoreUnit: str(lesson.check.scoreUnit), scoringVersion: lesson.check.scoringVersion || 1, formVersion: lesson.check.formVersion == null ? '' : lesson.check.formVersion,
        timeLimitS: Number(lesson.timeLimitS) > 0 ? Number(lesson.timeLimitS) : null, items: all.filter(function (it) { return !it.practice; }).length, practiceItems: all.filter(function (it) { return it.practice; }).length,
        clock: Number(lesson.timeLimitS) > 0 ? 'the clock of the device; it does not pause when the page is hidden'
          : lesson.check.untimed === true ? 'no time limit: untimed (an accommodation); the usual time limit is ' + (Number(lesson.check.usualTimeLimitS) || '?') + ' seconds' : 'no time limit',
        answers: 'scrambled (XOR with a SHA-256 keystream); this stops casual looking, not a determined person',
        teacherCode: lesson.check.lock ? 'set; kept only as a salted SHA-256 hash (' + lesson.check.lock.rounds + ' rounds); it locks the review screen and is not encryption' : 'none' };
      labels.no_script = labels.check_no_script || labels.no_script;
    }
    // dir comes from the app (labels.dir) so Arabic, Farsi, Urdu, Hebrew... files read right to left.
    var dir = labels.dir === 'rtl' || labels.dir === 'ltr' ? ' dir="' + labels.dir + '"' : '';
    var openHere = typeof labels.open_here === 'string' ? labels.open_here : /^en(?:-|$)/i.test(String(labels.lang || 'en')) ? OPEN_HERE.replace('{address}', openAddress()) : '';
    return '<!doctype html><html lang="' + escapeHtml(labels.lang || 'en') + '"' + dir + '><head><meta charset="utf-8">'
      + '<meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<meta http-equiv="Content-Security-Policy" content="' + csp + '">'
      + '<meta name="generator" content="' + PLAYER + '">'
      + '<title>' + escapeHtml(lesson.title) + '</title><style>' + (FONT_CSS ? FONT_CSS + '\n' : '') + CSS + (hasReadAlong ? '\n' + RA_CSS : '') + (hasRaPos ? '\n' + RA_POS_CSS : '') + (hasRaChecks ? '\n' + RA_CHECKS_CSS : '') + (probe ? '\n' + CHECK_CSS : '') + (qrSpec ? '\n/*afqr-css*/\n' + QR_CSS + '\n/*end-afqr-css*/' : '') + '</style></head>'
      // #app holds a plain note for previews that do not run the file (Drive, Classroom, iPad Files);
      // the player replaces it as soon as it starts.
      + '<body><main><h1>' + escapeHtml(lesson.title) + '</h1><div id="app"><p data-no-script>' + escapeHtml(labels.no_script) + '</p>' + (openHere ? '<p data-no-script data-open-here>' + escapeHtml(openHere) + '</p>' : '') + '</div><p id="live" class="sr" aria-live="polite"></p></main>'
      + '<script type="application/json" id="packet-manifest">' + safeJson(manifest) + '</script>'
      + '<script>' + script + '</script></body></html>';
  }

  // Attach (or replace) a teacher's sealed QR public key (AFPK1....) on any existing AlloFlow packet HTML offline.
  // Keeps connect-src unchanged (none on standard packets), updates CSP script-src sha256 and #packet-manifest.
  function attachQrKey(packetHtml, qrPublicKey, options) {
    var opts = options || {};
    var qrCrypto = resolveQrCrypto(opts);
    if (!qrCrypto || typeof qrCrypto.studentEmbedSource !== 'function') return { ok: false, error: 'no_crypto', message: 'Sealed QR crypto helper is unavailable.' };
    var qrSpec = qrCrypto.parsePublicKey(qrPublicKey);
    if (!qrSpec) return { ok: false, error: 'invalid_key', message: 'Enter a valid teacher public key starting with AFPK1.' };
    var html = String(packetHtml || '');
    var manifestOpen = '<script type="application/json" id="packet-manifest">';
    var mStart = html.indexOf(manifestOpen);
    if (mStart < 0) return { ok: false, error: 'not_packet', message: 'This file does not look like an AlloFlow packet (missing packet-manifest).' };
    var mBodyStart = mStart + manifestOpen.length;
    var mEnd = html.indexOf('</script>', mBodyStart);
    if (mEnd < 0) return { ok: false, error: 'not_packet', message: 'Could not read the packet manifest.' };
    var scriptTag = '<script>';
    var sStart = html.indexOf(scriptTag, mEnd + 9);
    var sEnd = sStart >= 0 ? html.lastIndexOf('</script>') : -1;
    if (sStart < 0 || sEnd <= sStart) return { ok: false, error: 'not_packet', message: 'Could not locate the packet script.' };
    var styleStart = html.indexOf('<style>');
    var styleEnd = styleStart >= 0 ? html.indexOf('</style>', styleStart) : -1;
    if (styleStart < 0 || styleEnd <= styleStart) return { ok: false, error: 'not_packet', message: 'Could not locate packet styles.' };
    var cspRe = /(<meta\s+http-equiv="Content-Security-Policy"\s+content=")([^"]+)(")/i;
    var cspMatch = cspRe.exec(html);
    if (!cspMatch) return { ok: false, error: 'not_packet', message: 'Could not locate the packet security policy.' };

    var manifestObj;
    try { manifestObj = JSON.parse(html.slice(mBodyStart, mEnd)); }
    catch (_) { return { ok: false, error: 'not_packet', message: 'Could not parse the packet manifest JSON.' }; }
    if (!manifestObj || manifestObj.kind !== 'alloflow-packet-manifest') {
      return { ok: false, error: 'not_packet', message: 'This file is not an AlloFlow packet.' };
    }

    var rawScript = html.slice(sStart + scriptTag.length, sEnd).replace(/\r\n?/g, '\n');
    var shellIdx = rawScript.lastIndexOf('(function takeHomeShell(');
    if (shellIdx < 0) return { ok: false, error: 'not_packet', message: 'Could not find the packet player script.' };
    if (rawScript.slice(shellIdx).indexOf('kit.qr') < 0) {
      return { ok: false, error: 'older_packet', message: 'This packet was made with an older version of AlloFlow. Remake it to enable sealed QR results.' };
    }
    var lessonMark = 'var lesson=', labelsMark = ';\nvar labels=', matchesMark = ';\nvar matches=';
    var l0 = rawScript.indexOf(lessonMark);
    var l1 = l0 >= 0 ? rawScript.indexOf(labelsMark, l0 + lessonMark.length) : -1;
    var l2 = l1 >= 0 ? rawScript.indexOf(matchesMark, l1 + labelsMark.length) : -1;
    if (l0 < 0 || l1 < 0 || l2 < 0) return { ok: false, error: 'not_packet', message: 'Could not read the lesson data inside this packet.' };

    var lessonObj, labelsObj;
    try {
      lessonObj = JSON.parse(rawScript.slice(l0 + lessonMark.length, l1));
      labelsObj = JSON.parse(rawScript.slice(l1 + labelsMark.length, l2));
    } catch (_) {
      return { ok: false, error: 'not_packet', message: 'Could not parse the lesson or labels inside this packet.' };
    }
    lessonObj.qr = { k: qrSpec.publicKey, fp: qrSpec.fingerprint };
    Object.keys(QR_LABELS).forEach(function (k) { if (labelsObj[k] == null) labelsObj[k] = QR_LABELS[k]; });
    var stripSrc = function (fn) { return fn.toString().replace(/^[ \t]*\/\/[^\n]*\n/gm, '').replace(/\n[ \t]+/g, '\n').replace(/\n{2,}/g, '\n'); };
    var qrParts = '/*afqr-start*/kit.qrLib=' + qrCrypto.studentEmbedSource() + ';\nkit.qr=' + stripSrc(takeHomeQr) + ';\n/*afqr-end*/\n';

    var updatedScript = rawScript.slice(0, l0 + lessonMark.length)
      + safeJson(lessonObj)
      + labelsMark + safeJson(labelsObj)
      + rawScript.slice(l2);
    updatedScript = updatedScript.replace(/\/\*afqr-start\*\/[\s\S]*?\/\*afqr-end\*\/\n?/g, '');
    var newShellIdx = updatedScript.lastIndexOf('(function takeHomeShell(');
    updatedScript = updatedScript.slice(0, newShellIdx) + qrParts + updatedScript.slice(newShellIdx);
    updatedScript = updatedScript.replace(/\r\n?/g, '\n');

    var digest = sha256(updatedScript);
    if (!digest) return { ok: false, error: 'no_sha', message: 'Could not compute the packet script hash in this browser.' };

    var oldCsp = cspMatch[2];
    var newCsp = /'sha256-[A-Za-z0-9+/=]+'/.test(oldCsp)
      ? oldCsp.replace(/'sha256-[A-Za-z0-9+/=]+'/, function () { return "'sha256-" + digest.base64 + "'"; })
      : oldCsp.replace(/script-src\s+[^;]+/, function () { return "script-src 'sha256-" + digest.base64 + "'"; });

    manifestObj.csp = newCsp;
    manifestObj.scriptSha256 = digest.hex;
    manifestObj.qr = { keyFingerprint: qrSpec.fingerprint, algorithm: 'X25519+HKDF-SHA256+ChaCha20-Poly1305', network: 'none' };

    var oldStyle = html.slice(styleStart + 7, styleEnd).replace(/\n?\/\*afqr-css\*\/[\s\S]*?\/\*end-afqr-css\*\//g, '');
    var newStyle = oldStyle + '\n/*afqr-css*/\n' + QR_CSS + '\n/*end-afqr-css*/';

    // Splice regions from back to front so offsets never shift.
    var out = html.slice(0, sStart + scriptTag.length) + updatedScript + html.slice(sEnd);
    out = out.slice(0, mBodyStart) + safeJson(manifestObj) + out.slice(mEnd);
    out = out.slice(0, styleStart + 7) + newStyle + out.slice(styleEnd);
    var c2 = cspRe.exec(out);
    out = out.slice(0, c2.index) + c2[1] + newCsp + c2[3] + out.slice(c2.index + c2[0].length);
    return { ok: true, html: out, fingerprint: qrSpec.fingerprint, scriptSha256: digest.hex, title: str(lessonObj.title || manifestObj.title || '') };
  }

  // Teacher side: read returned result files (v1 Find Sounds files too).
  // Anything that is not exactly a result file is rejected with a reason.
  function parseResult(text) {
    var blockedKey = function (k) { return k === '__proto__' || k === 'constructor' || k === 'prototype'; };
    var data;
    try { data = typeof text === 'string' ? JSON.parse(text, function (k, v) { return blockedKey(k) ? undefined : v; }) : text; } catch (_) { return { ok: false, error: 'not_json' }; }
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
    // A check (packet.mode "check", or "probe" in a file saved before 2026-11-12): its items also carry digits, and the file a score block.
    var probe = !!data.packet && typeof data.packet === 'object' && (data.packet.mode === 'check' || data.packet.mode === 'probe');
    var whole = function (v) { return v == null || v === '' || !Number.isFinite(Number(v)) ? null : Math.max(0, Math.min(1000000, Math.round(Number(v)))); };
    // Up to 600 items, as the Packets results page and Class Analytics read (a Word Sounds file can have 13 x 40).
    var cut = data.items.length > 600;
    var items = data.items.slice(0, 600).map(function (it) {
      return { ms: Math.max(0, Math.min(86400000, Math.round(Number(it && it.ms) || 0))), flag: str(it && it.flag).slice(0, 40), activity: str((it && it.activity) || (data.schemaVersion === 1 ? 'isolation' : '')).slice(0, 40), word: str(it && it.word).slice(0, 60),
        target: str(it && it.target).slice(0, 40), attempts: Math.max(0, Math.min(9, Number(it && it.attempts) || 0)),
        firstTry: !!(it && it.firstTry), correct: !!(it && it.correct), done: !!(it && it.done),
        practice: it && (it.practice === 'traced' || it.practice === 'skipped' || it.practice === 'practice' || it.practice === 'read') ? it.practice : null,
        typed: it && /^-?[0-9]{1,20}$/.test(String(it.typed || '')) ? String(it.typed) : undefined,
        responses: Array.isArray(it && it.responses) ? it.responses.slice(0, 6).map(function (r) { return str(r).slice(0, 80); }) : [],
        // Supports used (replays, hints): counts only, a bounded set of names.
        supports: (function (s) {
          var out = {};
          if (s && typeof s === 'object' && !Array.isArray(s)) Object.keys(s).slice(0, 12).forEach(function (k) {
            var n = Number(s[k]);
            if (!blockedKey(k) && /^[A-Za-z_]{1,40}$/.test(k) && Number.isFinite(n) && n > 0) out[k] = Math.min(999, Math.floor(n));
          });
          return out;
        })(it && it.supports) };
    });
    var summary = { items: 0, done: 0, firstTry: 0, afterRetry: 0, missed: 0, practised: 0 };
    var byActivityMap = Object.create(null);
    items.forEach(function (r) {
      var actKey = blockedKey(r.activity) ? 'invalid' : r.activity;
      if (actKey !== r.activity) r.activity = actKey;
      var a = byActivityMap[actKey] || (byActivityMap[actKey] = { items: 0, done: 0, firstTry: 0, afterRetry: 0, missed: 0, practised: 0 });
      // Practice (Letter Trace) is reported, never scored.
      if (r.practice || r.activity === 'letter_tracing') { if (r.done) { summary.practised++; a.practised++; } return; }
      summary.items++;
      a.items++;
      if (!r.done) return;
      summary.done++; a.done++;
      if (r.firstTry) { summary.firstTry++; a.firstTry++; } else if (r.correct) { summary.afterRetry++; a.afterRetry++; } else { summary.missed++; a.missed++; }
    });
    var byActivity = Object.assign({}, byActivityMap);
    var titles = {};
    Object.keys(byActivity).forEach(function (id) {
      if (blockedKey(id)) return;
      var given = data.activityTitles && typeof data.activityTitles === 'object' && Object.prototype.hasOwnProperty.call(data.activityTitles, id) ? data.activityTitles[id] : null;
      var adapterTitle = Object.prototype.hasOwnProperty.call(ADAPTERS, id) && ADAPTERS[id] ? ADAPTERS[id].title : null;
      titles[id] = str(given || adapterTitle || (id === 'isolation' ? 'Find Sounds' : id)).slice(0, 60);
    });
    var result = { activityTitles: titles, lessonId: str(data.lessonId).slice(0, 120), revision: str(data.revision).slice(0, 40), lessonTitle: str(data.lessonTitle).slice(0, 120),
      learnerName: str(data.learnerName || data.learner).slice(0, 60), finishedAt: str(data.finishedAt).slice(0, 40), items: items, itemsCut: cut, summary: summary, byActivity: byActivity,
      integrity: integrity, sessionId: str(data.sessionId).slice(0, 80), startedLocal: str(data.startedLocal).slice(0, 40), finishedLocal: str(data.finishedLocal).slice(0, 40),
      durationMs: Math.max(0, Math.round(Number(data.durationMs) || 0)) };
    // Time on the items (files saved from 2026-11-13).
    if (data.activeMs != null && data.activeMs !== '' && Number.isFinite(Number(data.activeMs))) result.activeMs = Math.max(0, Math.round(Number(data.activeMs)));
    if (probe) {
      items.forEach(function (r, i) { var it = data.items[i] || {}; r.digitsCorrect = whole(it.digitsCorrect); r.digitsPossible = whole(it.digitsPossible); });
      var sc = data.score && typeof data.score === 'object' ? data.score : {};
      var num = function (v) { return v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v); };
      result.mode = 'probe'; // the reader's name for a check (both file values read as one)
      result.form = str(data.packet.form).slice(0, 40);
      // The score as the file states it. It is not covered by the integrity
      // value; the items are, and the counts can be made again from them.
      result.score = { measure: str(sc.measure).slice(0, 40), score: num(sc.score), scoreUnit: str(sc.scoreUnit).slice(0, 40), digitsCorrect: whole(sc.digitsCorrect), digitsPossible: whole(sc.digitsPossible),
        itemsCorrect: whole(sc.itemsCorrect) || 0, itemsAttempted: whole(sc.itemsAttempted) || 0, timeLimitS: num(sc.timeLimitS), elapsedS: num(sc.elapsedS) || 0, hiddenS: num(sc.hiddenS) || 0,
        pausedS: num(sc.pausedS) || 0, pauses: whole(sc.pauses) || 0, directionsHeard: whole(sc.directionsHeard) || 0,
        // time_up_away (2026-11-13): the time ran out while the page was hidden or closed; no score.
        completion: /^(time|ended_early|complete|time_up_away)$/.test(str(sc.completion)) ? sc.completion : '', prorated: sc.prorated === true,
        noScoreReason: str(sc.noScoreReason).slice(0, 40), scoringVersion: whole(sc.scoringVersion),
        formVersion: typeof sc.formVersion === 'number' && Number.isFinite(sc.formVersion) ? sc.formVersion : str(sc.formVersion).slice(0, 20), attempt: whole(sc.attempt) || 1,
        flags: (Array.isArray(sc.flags) ? sc.flags : []).slice(0, 8).map(function (f) { return str(f).slice(0, 40); }),
        // The reading tools on during a scored item (takeHomeTools).
        tools: (Array.isArray(sc.tools) ? sc.tools : []).slice(0, 8).map(function (f) { return str(f).slice(0, 40); }) };
      if (sc.untimed === true) { result.score.untimed = true; result.score.usualTimeLimitS = num(sc.usualTimeLimitS); }
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
      return Promise.resolve().then(function () { return decode(dataUriBytes(lesson.audio[id])); }).then(function (buffer) {
        if (!buffer || !(buffer.duration > 0) || buffer.duration > 60) throw new Error('bad clip');
        var length = Math.max(1, Math.ceil(buffer.duration * PORTABLE_RATE));
        var offline = new Offline(1, length, PORTABLE_RATE);
        var source = offline.createBufferSource();
        source.buffer = buffer; source.connect(offline.destination); source.start(0);
        return new Promise(function (resolve, reject) {
          var settled = false;
          var ok = function (b) { if (!settled) { settled = true; resolve(b); } };
          offline.oncomplete = function (e) { ok(e.renderedBuffer); };
          var p = offline.startRendering();
          if (p && p.then) p.then(ok, function (e) { if (!settled) { settled = true; reject(e); } });
        });
      }).then(function (rendered) {
        lesson.audio[id] = wavDataUri(rendered.getChannelData(0), PORTABLE_RATE);
        report.converted++;
      }, function () { report.failed.push(id); }).then(function () {
        done++;
        if (typeof opts.onProgress === 'function') { try { opts.onProgress(done, todo.length); } catch (_) {} }
      });
    };
    var closeCtx = function () { try { if (ctx && typeof ctx.close === 'function') { var p = ctx.close(); if (p && typeof p.catch === 'function') p.catch(function () {}); } } catch (_) {} };
    return todo.reduce(function (chain, id) { return chain.then(function () { return convert(id); }); }, Promise.resolve())
      .then(function () { closeCtx(); return report; }, function (err) { closeCtx(); throw err; });
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
    // Word pictures: when each activity shows one (see PICTURE_RULE), and the words for it.
    PICTURE_RULE: PICTURE_RULE, PICTURE_LABELS: PICTURE_LABELS, _pictures: takeHomePictures,
    // Sealed QR results (opt-in via opts.qrPublicKey or attachQrKey).
    QR_LABELS: QR_LABELS, attachQrKey: attachQrKey, _qr: takeHomeQr,
    // Reading tools, in every file: see takeHomeTools.
    _tools: takeHomeTools,
    _vocabChoice: takeHomeVocab,
    _keypad: takeHomeKeypad,
    // v1 name kept for callers built against the first release.
    buildFindSoundsHtml: buildHtml,
    _shell: takeHomeShell,
  };
})(typeof window !== 'undefined' ? window : globalThis);
