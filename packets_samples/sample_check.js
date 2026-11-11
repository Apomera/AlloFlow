// A sample for "Check a file" (packets-verify.html): a real check, held here as text.
// Made on 2026-11-11 by packet_check_builder.js, buildCheckPacket({ lesson: lessonFromMathProblems({ title: 'Sample check', problems: parseProblems('7+8,12-5,6x4,20/4,9+6,15-7'), timeLimitS: 120 }) }),
// with word_sounds_take_home_loader.js as it was that day. It has no teacher code.
// The page reads this text the way it reads a file you choose. Nothing on the page ever runs it.
(function (root) {
  var samples = root.AlloPacketSamples = root.AlloPacketSamples || {};
  samples.check = { name: "sample-check-file.html", text: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-cM+8giv3exxC7WNYduXtd8swJHZo3RLOoieTHQxwLvo='; style-src 'unsafe-inline'; media-src data: blob:; img-src data:; form-action 'none'; base-uri 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; manifest-src 'none'; connect-src 'none'"><meta name="generator" content="alloflow-word-sounds-take-home/2"><title>Sample check</title><style>:root{--bg:#f6f7fb;--card:#fff;--ink:#1d2433;--muted:#4a5468;--accent:#3d3aa8;--accent-ink:#fff;--ok:#1d6b3a;--ok-bg:#e3f4e9;--warn:#8a4b00;--warn-bg:#fff1dc;--line:#c9cede;--focus:#b54700}
@media (prefers-color-scheme:dark){:root{--bg:#141824;--card:#1f2535;--ink:#eef1f8;--muted:#b7bfd2;--accent:#a9a7ff;--accent-ink:#141824;--ok:#8fe0ab;--ok-bg:#163423;--warn:#ffc77a;--warn-bg:#3a2a12;--line:#3a4258;--focus:#ffb070}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:18px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
main{max-width:760px;margin:0 auto;padding:24px 16px 48px}h1{font-size:1.6rem;margin:0 0 12px}h2{font-size:1.3rem;margin:0 0 12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px;margin:16px 0}
button{font:inherit;min-height:48px;min-width:48px;padding:10px 18px;border-radius:12px;border:2px solid var(--accent);background:var(--card);color:var(--ink);cursor:pointer}
button.primary{background:var(--accent);color:var(--accent-ink)}button:disabled,button[aria-disabled=true]{opacity:.55;cursor:not-allowed}
button[aria-pressed=true]{outline:3px solid var(--accent);outline-offset:2px}
:focus-visible{outline:3px solid var(--focus);outline-offset:3px}h2[tabindex="-1"]:focus{outline:none}
.row{display:flex;flex-wrap:wrap;gap:12px;align-items:center}.choices{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;list-style:none;padding:0;margin:16px 0}
.choice{border:2px solid var(--line);border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:8px}.choice.tried{border-style:dashed}.choice.right{border-color:var(--ok);background:var(--ok-bg)}.choice.solo{border-color:transparent}.choice.solo.tried{border-color:var(--line)}.choice.solo.right{border-color:var(--ok)}
.slots{display:flex;flex-wrap:wrap;gap:10px;list-style:none;padding:0;margin:16px 0}.slot{min-width:64px;min-height:64px;border:2px dashed var(--line);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:700}
.picture{max-width:160px;max-height:160px;border-radius:12px}
.letters{font-size:1.5rem;font-weight:700}.status{min-height:1.5em;margin:12px 0;padding:8px 12px;border-radius:10px}.status.ok{background:var(--ok-bg);color:var(--ok)}.status.warn{background:var(--warn-bg);color:var(--warn)}
label{display:block;margin:12px 0 4px;font-weight:600}input{font:inherit;width:100%;max-width:360px;min-height:48px;padding:8px 12px;border-radius:10px;border:2px solid var(--line);background:var(--card);color:var(--ink)}
.about ul{margin:0;padding-inline-start:20px}.about li{margin:8px 0;overflow-wrap:anywhere}
.muted{color:var(--muted)}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
.timer{display:flex;align-items:center;gap:12px;margin:0 0 12px;color:var(--muted);font-variant-numeric:tabular-nums}
.timebar{flex:1;height:10px;border-radius:6px;background:var(--line);overflow:hidden}.timebar span{display:block;height:100%;background:var(--accent)}
.prompt{font-size:2.6rem;font-weight:700;text-align:center;margin:8px 0 16px;overflow-wrap:anywhere}.blank{display:inline-block;min-width:1.6em;border-bottom:4px solid var(--accent);color:var(--accent)}
.answer{display:block;margin:0 auto;text-align:center;font-size:2rem;font-weight:700;max-width:220px}
.pad{display:grid;grid-template-columns:repeat(3,minmax(64px,96px));gap:10px;justify-content:center;margin:16px auto 0}.pad button{min-height:56px;font-size:1.5rem;font-weight:700;padding:6px}.pad .wide{grid-column:1/-1}
.pair{display:flex;gap:24px;justify-content:center;flex-wrap:wrap;list-style:none;padding:0;margin:16px 0}.pair button{min-width:132px;min-height:132px;font-size:3rem;font-weight:700;border-width:4px}.pair button.right{border-color:var(--ok);background:var(--ok-bg)}
.scroll{overflow-x:auto}.review{width:100%;border-collapse:collapse;font-size:.95rem}.review th,.review td{border:1px solid var(--line);padding:6px 8px;text-align:start}.review td:nth-child(2),.review td:nth-child(5){white-space:nowrap}</style></head><body><main><h1>Sample check</h1><div id="app"><p data-no-script>If the check does not start, download this file and open it in Chrome, Edge or Safari.</p></div><p id="live" class="sr" aria-live="polite"></p></main><script type="application/json" id="packet-manifest">{"kind":"alloflow-packet-manifest","engine":"alloflow-packet/1","player":"alloflow-word-sounds-take-home/2","title":"Sample check","packet":{"id":"math-custom-2db98b95","version":"ree018e37","form":"custom","mode":"probe"},"what":"A check in one file: one try for each item, and no right or wrong shown to the learner. It runs in a browser with no internet connection.","stores":[{"where":"localStorage","key":"alloflow-take-home:math-custom-2db98b95:ree018e37","holds":"the learner label, the place reached, the answers given, the time on each item, the time limit clock and a count of tries (by a hash of the learner label)","until":"the browser storage is cleared; Start over keeps only the learner label and the count of tries"}],"saves":[{"file":"Sample-check__LEARNER__DATE.csv","format":"alloflow-packet-result/1"},{"file":"Sample-check__LEARNER__DATE.json","format":"alloflow-take-home-result schemaVersion 3"}],"network":"none","never":["internet connection","microphone","camera","cookies","AI"],"integrity":"Each saved file carries a check value (SHA-256, or FNV-1a where the browser cannot make SHA-256). It detects accidental edits, not deliberate ones.","csp":"default-src 'none'; script-src 'sha256-cM+8giv3exxC7WNYduXtd8swJHZo3RLOoieTHQxwLvo='; style-src 'unsafe-inline'; media-src data: blob:; img-src data:; form-action 'none'; base-uri 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; manifest-src 'none'; connect-src 'none'","scriptSha256":"70cfbc822bf77b1c42ed635876e5ed77cb30247668dd12cea227931d0c702efa","licence":"AGPL-3.0","attributions":[],"check":{"measure":"math_dcpm","scoreUnit":"digits_correct_per_minute","scoringVersion":3,"formVersion":1,"timeLimitS":120,"items":6,"practiceItems":0,"clock":"the clock of the device; it does not pause when the page is hidden","answers":"scrambled (XOR with a SHA-256 keystream); this stops casual looking, not a determined person","teacherCode":"none"}}</script><script>
(function(){"use strict";
var lesson={"schema":"alloflow-take-home-lesson/v2","player":"alloflow-word-sounds-take-home/2","lessonId":"math-custom-2db98b95","revision":"ree018e37","language":"en","title":"Sample check","showLetters":false,"mode":"probe","form":"custom","timeLimitS":120,"check":{"measure":"math_dcpm","scoreUnit":"digits_correct_per_minute","scoringVersion":3,"formVersion":1,"allowSkip":true,"lock":null,"salt":"0afb585c055a239ec8bacad449ec084a","minus":false},"activityTitles":{"math_computation":"Math Fluency"},"blocks":[{"activity":"math_computation","items":[{"id":"math_computation-0","word":"7 + 8","a":7,"b":8,"symbol":"+","key":"Js98KLeTAu5X8/TD"},{"id":"math_computation-1","word":"12 − 5","a":12,"b":5,"symbol":"−","key":"LdvexNJruFcPvoyT"},{"id":"math_computation-2","word":"6 × 4","a":6,"b":4,"symbol":"×","key":"X3mRD/exsHkgr48V"},{"id":"math_computation-3","word":"20 ÷ 4","a":20,"b":4,"symbol":"÷","key":"OvIhbGaHaDvlLZRE"},{"id":"math_computation-4","word":"9 + 6","a":9,"b":6,"symbol":"+","key":"IRUb8haheGchqToX"},{"id":"math_computation-5","word":"15 − 7","a":15,"b":7,"symbol":"−","key":"P4fFOdwrFzMWZZ17"}]}],"feedback":{"correct":[],"retry":null},"audio":{},"images":{},"submit":null};
var labels={"lang":"en","title":"Word Sounds practice","intro":"Listen carefully and answer each question. You can hear everything again as many times as you like.","learner_label":"Your code name or first name","start":"Start","continue":"Continue where I left off","start_over":"Start over","item_of":"{activity}: {n} of {total}","hear_word":"Hear the word","hear_question":"Hear the question","listen_sound":"Listen to sound {n}","choose_sound":"Choose sound {n}","choose_label":"Choose {sound}","sound_n":"Sound {n}","correct":"Yes! That is right.","try_again":"Not quite. Listen again and try once more.","missed":"Here is the answer. Listen.","next":"Next","finish":"See my results","done_title":"You finished!","done_summary":"Right on the first try: {first} of {total}.","done_retry":"Right after trying again: {retry}.","save":"Save my work as a file","send":"Send my work to my teacher","sending":"Sending...","sent":"Sent. Your teacher's mailbox received it ({receipt}).","send_failed":"It did not send. Save your work as a file instead, and give the file to your teacher.","saved_device":"Your work is kept on this device until you start over.","saved_device_off":"This browser cannot keep your work. Save it as a file before you close this page.","saved_file":"Saved as {file}. Give this file to your teacher.","not_sent":"Saving does not send anything. Your teacher gets your work when you give them the file.","send_note":"Sending goes only to your teacher's school mailbox.","send_closed":"Sending closed on {date}. Save your work as a file and give it to your teacher.","practice_again":"Practice again","practice_again_confirm":"Your results have not been sent or saved as a file yet. If you start over, they will be lost.","keep_results":"Keep my results","name_prompt":"Add your name so your teacher knows these are yours.","name_prompt_add":"Add my name","name_prompt_skip":"Continue without a name","copy_results":"This browser cannot save files. Copy all of this text and send it to your teacher.","save_csv":"Save results as a spreadsheet file (CSV)","copy_tsv":"Copy for a spreadsheet","copied":"Copied. Now paste it into a spreadsheet.","copy_manual":"Copy all of this text and paste it into a spreadsheet.","about_button":"About this file","about_what":"This is a practice activity in one file. It works with no internet.","about_engine":"File type: {engine}.","about_stores":"It keeps your place and your answers on this device only, under the name {key}. Start over removes them.","about_saves":"When you finish, it can save two files: {csv} opens in a spreadsheet, and {json} is for your teacher to open in AlloFlow.","about_no_network":"It never connects to the internet.","about_mailbox":"It connects to the internet for one thing only: when you press Send, your results go to your teacher's class mailbox at {host}. Nothing is sent before that.","about_never":"It never uses the microphone or the camera. It has no cookies and runs no AI.","about_check":"Each saved file has a check value. It shows when a file was changed by accident. It cannot stop someone who changes a file on purpose.","about_rules":"The safety rules this file gives the browser: {csp}","about_licence":"License: {licence}. Anyone may read, share and change the code.","about_credits":"Made with: {list}","no_script":"If the practice does not start, download this file and open it in Chrome, Edge or Safari.","audio_missing":"This sound could not play.","ordinals":["first","second","third","fourth","fifth","sixth","seventh","eighth","ninth","tenth","eleventh","twelfth"],"check_about":"This is a check to see how you are doing. It is not for a grade.","check_go_on":"Next","check_practice_title":"Practice {n} of {total}","check_practice_note":"This one is for practice. It does not count.","check_practice_right":"Yes! That is right.","check_practice_wrong":"Not quite. The answer is {answer}.","check_ready_title":"Get ready","check_ready_timed":"You have {time}. Do as many as you can.","check_ready_untimed":"There is no clock. Take your time.","check_ready_one_try":"You get one try for each one. You cannot go back.","check_begin":"Start","check_item_of":"Question {n} of {total}","check_time_left":"Time left: {time}","check_time_start":"The clock has started. You have {time}.","check_time_10":"10 seconds left.","check_time_up":"Time is up.","check_one_minute":"1 minute","check_minutes":"{n} minutes","check_seconds":"{n} seconds","check_skip":"Skip","check_stop":"Stop the check","check_stop_confirm":"Do you want to stop now? You cannot come back to this check.","check_stop_yes":"Yes, stop","check_stop_no":"Keep going","check_done_title":"You finished. Thank you.","check_done_count":"You answered {done} of {total}.","check_done_time":"Time: {time}.","check_again":"Start over","check_again_confirm":"Do you want to start this check again? It will be saved as a new try. Save your work first.","check_again_yes":"Yes, start over","check_again_no":"Keep my work","check_pad_label":"Your answer","check_pad_keys":"Number keys","check_pad_delete":"Delete","check_pad_minus":"Minus","check_pad_next":"Next","check_teacher_title":"For the teacher","check_teacher_open":"For the teacher: show results","check_teacher_code":"Teacher code","check_teacher_show":"Show results","check_teacher_checking":"Checking the code...","check_teacher_wrong":"That code is not correct. Tries left before a 30-second wait: {left}.","check_teacher_wait":"Too many incorrect codes. Wait {seconds} seconds, then try again.","check_review_title":"Results for the teacher","check_review_close":"Close the results","check_review_score":"Score: {score} {unit}.","check_review_no_score":"No score: {reason}.","check_reason_ended_early":"the check was stopped before the end","check_reason_too_fast":"every item was finished in under 20 seconds, which is too fast to prorate to a full minute","check_reason_untimed":"a rate needs a time limit","check_unit_items_correct":"items correct","check_unit_digits_correct_per_minute":"digits correct per minute","check_review_items":"Items correct: {correct} of {attempted} attempted ({given} given).","check_review_digits":"Digits correct: {correct} of {possible} possible on the items attempted.","check_review_time":"Time used: {elapsed} s. Time limit: {limit}.","check_review_limit":"{seconds} s","check_review_no_limit":"none","check_review_hidden":"Time with the page hidden or closed: {hidden} s.","check_review_prorated":"All items were finished before the time limit, so the rate is prorated over the time used.","check_review_attempt":"Attempt {n} for this learner label on this device.","check_review_flags":"Flags: {flags}.","check_flag_left_the_page":"left the page for more than 3 seconds","check_flag_clock_changed":"the device clock was set back","check_flag_reloaded":"the page was reloaded","check_review_note":"All times come from the clock of the learner device.","check_col_n":"No.","check_col_prompt":"Item","check_col_response":"Response","check_col_result":"Result","check_col_expected":"Expected","check_col_time":"Time (s)","check_r_right":"right","check_r_wrong":"wrong","check_r_skipped":"skipped","check_r_time_up":"time ran out","check_r_not_reached":"not reached","check_r_practice":"practice (not scored)","check_no_script":"If the check does not start, download this file and open it in Chrome, Edge or Safari.","check_about_what":"This is a check in one file. It works with no internet.","check_about_clock":"The clock uses the time on this device. It keeps going when you leave the page.","check_about_tries":"It also keeps a count of how many times this check was started on this device.","check_about_scrambled":"The answers are scrambled so they cannot be read by opening the file. This stops casual looking, not a determined person.","check_about_code":"The teacher code keeps the answers screen closed. It is a lock on the screen, not secret writing: someone who knows how to read the file's code could still work the answers out.","math_computation_directions":"Type the answer to each one.","math_computation_label":"{problem}. Type the answer.","math_computation_title":"Math Fluency"};
var matches=null;
var renders={"math_computation":function (item, ctx) {
        var problem = item.display || (item.a + ' ' + item.symbol + ' ' + item.b);
        var pad = ctx.keypad({ label: ctx.fmt(ctx.L.math_computation_label, { problem: problem }), onNext: function (value) { ctx.answer(value); } });
        ctx.root.appendChild(ctx.el('p', { class: 'prompt', 'aria-hidden': 'true', text: item.display ? problem : problem + ' =' }));
        ctx.root.appendChild(pad.node);
        pad.focus();
        return {
          // Practice items only: lock the keys.
          reveal: function () { pad.lock(); },
        };
      }};
var kit={csv:function packetCsv(result) {
    var r = result || {};
    var packet = r.packet && typeof r.packet === 'object' ? r.packet : {};
    var text = function (v) { return v == null ? '' : typeof v === 'string' ? v : typeof v === 'object' ? JSON.stringify(v) : String(v); };
    // Same rules as _acCsvCell (student_analytics_module.js).
    var cell = function (v) {
      var t = v == null ? '' : String(v);
      if (typeof v === 'string' && /^[=+\\-@\\t\\r]/.test(t)) t = "'" + t;
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
    try { notName = new RegExp('[^\\\\p{L}\\\\p{M}\\\\p{N}]+', 'gu'); } catch (_) {}
    var safe = function (v) { return text(v).replace(notName, '-').replace(/^-+|-+$/g, '').slice(0, 40); };
    // The file name carries the FINISH date, on the learner's clock.
    var day = /^\\d{4}-\\d{2}-\\d{2}/.exec(text(r.finishedLocal) || text(r.startedLocal));
    return {
      header: header, rows: rows, lines: lines, summary: summary,
      stem: [safe(r.lessonTitle) || 'packet', safe(learner) || 'results'].concat(day ? [day[0]] : []).join('__'),
      basis: [text(packet.id), text(packet.version), text(packet.form), session].join('|') + '\\n' + lines.join('\\n'),
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
        return String.fromCharCode(0xFEFF) + [header].concat(rows, tail).map(line).join('\\r\\n') + '\\r\\n';
      },
      tsv: function () {
        return [header].concat(rows).map(function (cells) {
          return cells.map(function (v) {
            var t = (v == null ? '' : String(v)).replace(/[\\t\\r\\n]+/g, ' ');
            return typeof v === 'string' && /^[=+\\-@]/.test(t) ? "'" + t : t;
          }).join('\\t');
        }).join('\\n');
      },
    };
  },
hash:function hashText(text) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  },
mailbox:null};
kit.sha=(function(){var SHA_K=[1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298];
var TextEncoder=window.TextEncoder||function(){this.encode=function(t){t=unescape(encodeURIComponent(t));var b=new Uint8Array(t.length);for(var i=0;i<t.length;i++)b[i]=t.charCodeAt(i);return b;};};
return function sha256(text) {
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
  };})();
kit.codec=(function checkCodec(sha) {
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
      // again with the salt until \`rounds\` hashes have been made.
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
  })(kit.sha);
kit.score=function checkScore(meta, rows, timing) {
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
  };
kit.scorers={"math_computation":function (item, answer, response) {
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
      }};
kit.check=function takeHomeCheck(api) {
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
        var negative = minus && (t.replace(/^\\s+/, '').charAt(0) === '-' || t.replace(/^\\s+/, '').charCodeAt(0) === 0x2212);
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
      var who = 't' + kit.hash(String(s.name || '').replace(/^\\s+|\\s+$/g, '').toLowerCase());
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
            var typed = String(code.value || '').replace(/^\\s+|\\s+$/g, '');
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
  };
(function takeHomeShell(doc, win, lesson, L, matches, renders, kit) {
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
      return String(template || '').replace(/\\{(\\w+)\\}/g, function (m, k) { return params && params[k] != null ? params[k] : m; });
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
  })(document,window,lesson,labels,matches,renders,kit);
})();
</script></body></html>` };
})(typeof window !== 'undefined' ? window : globalThis);
