// A sample for "Check a file" (packets-verify.html): a real practice file, held here as text.
// Made on 2026-11-11 by word_sounds_packet_builder.js, buildPacket({ words: ['cat', 'sun', 'map'], activities: ['isolation'], title: 'Sample practice file', seed: 7 }),
// with word_sounds_take_home_loader.js as it was that day. Each recording is replaced by four samples of near silence, to keep this file small.
// The page reads this text the way it reads a file you choose. Nothing on the page ever runs it.
(function (root) {
  var samples = root.AlloPacketSamples = root.AlloPacketSamples || {};
  samples.practice = { name: "sample-practice-file.html", text: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-BgP0uZqPLAuDb5iCVnaaIX2cYbss5uePAApe03udumo='; style-src 'unsafe-inline'; media-src data: blob:; img-src data:; form-action 'none'; base-uri 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; manifest-src 'none'; connect-src 'none'"><meta name="generator" content="alloflow-word-sounds-take-home/2"><title>Sample practice file</title><style>:root{--bg:#f6f7fb;--card:#fff;--ink:#1d2433;--muted:#4a5468;--accent:#3d3aa8;--accent-ink:#fff;--ok:#1d6b3a;--ok-bg:#e3f4e9;--warn:#8a4b00;--warn-bg:#fff1dc;--line:#c9cede;--focus:#b54700}
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
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}</style></head><body><main><h1>Sample practice file</h1><div id="app"><p data-no-script>If the practice does not start, download this file and open it in Chrome, Edge or Safari.</p></div><p id="live" class="sr" aria-live="polite"></p></main><script type="application/json" id="packet-manifest">{"kind":"alloflow-packet-manifest","engine":"alloflow-packet/1","player":"alloflow-word-sounds-take-home/2","title":"Sample practice file","packet":{"id":"pb-80a62ab6","version":"rf85f1a37","form":"","mode":"practice"},"what":"A practice activity in one file. It runs in a browser with no internet connection.","stores":[{"where":"localStorage","key":"alloflow-take-home:pb-80a62ab6:rf85f1a37","holds":"the learner label, the place reached, the answers and the time on each item","until":"Start over or Practice again"}],"saves":[{"file":"Sample-practice-file__LEARNER__DATE.csv","format":"alloflow-packet-result/1"},{"file":"Sample-practice-file__LEARNER__DATE.json","format":"alloflow-take-home-result schemaVersion 3"}],"network":"none","never":["internet connection","microphone","camera","cookies","AI"],"integrity":"Each saved file carries a check value (SHA-256, or FNV-1a where the browser cannot make SHA-256). It detects accidental edits, not deliberate ones.","csp":"default-src 'none'; script-src 'sha256-BgP0uZqPLAuDb5iCVnaaIX2cYbss5uePAApe03udumo='; style-src 'unsafe-inline'; media-src data: blob:; img-src data:; form-action 'none'; base-uri 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; manifest-src 'none'; connect-src 'none'","scriptSha256":"0603f4b99a8f2c0b836f988256769a217d9c61bb2ce6e78f000a5ed37b9dba6a","licence":"AGPL-3.0","attributions":["Word sounds: Carnegie Mellon Pronouncing Dictionary (CMUdict), Copyright (C) 1993-2015 Carnegie Mellon University, converted to sound labels by AlloFlow","Machine-made recordings: Google Gemini text-to-speech, made ahead of time"],"notices":[{"id":"cmudict","name":"Carnegie Mellon Pronouncing Dictionary","text":"Copyright (C) 1993-2015 Carnegie Mellon University. All rights reserved.\\n\\nRedistribution and use in source and binary forms, with or without\\nmodification, are permitted provided that the following conditions\\nare met:\\n\\n1. Redistributions of source code must retain the above copyright\\n   notice, this list of conditions and the following disclaimer.\\n   The contents of this file are deemed to be source code.\\n\\n2. Redistributions in binary form must reproduce the above copyright\\n   notice, this list of conditions and the following disclaimer in\\n   the documentation and/or other materials provided with the\\n   distribution.\\n\\nThis work was supported in part by funding from the Defense Advanced\\nResearch Projects Agency, the Office of Naval Research and the National\\nScience Foundation of the United States of America, and by member\\ncompanies of the Carnegie Mellon Sphinx Speech Consortium. We acknowledge\\nthe contributions of many volunteers to the expansion and improvement of\\nthis dictionary.\\n\\nTHIS SOFTWARE IS PROVIDED BY CARNEGIE MELLON UNIVERSITY \`\`AS IS'' AND\\nANY EXPRESSED OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,\\nTHE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR\\nPURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL CARNEGIE MELLON UNIVERSITY\\nNOR ITS EMPLOYEES BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,\\nSPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT\\nLIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,\\nDATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY\\nTHEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\\n(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\\nOF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE."}],"builder":{"name":"alloflow-packet-builder/0.1.0","seed":7,"ai":"none","words":3,"items":3}}</script><script>
(function(){"use strict";
var lesson={"schema":"alloflow-take-home-lesson/v2","player":"alloflow-word-sounds-take-home/2","lessonId":"pb-80a62ab6","revision":"rf85f1a37","createdAt":"","language":"en","title":"Sample practice file","showLetters":false,"activityTitles":{"isolation":"Find Sounds"},"blocks":[{"activity":"isolation","items":[{"id":"isolation-0","word":"cat","position":0,"target":"k","wordAudio":"a0","promptAudio":"a1","choices":[{"label":"f","audio":"a2"},{"label":"a","audio":"a3"},{"label":"k","audio":"a4"},{"label":"b","audio":"a5"},{"label":"d","audio":"a6"},{"label":"t","audio":"a7"}],"introAudio":["a1","a0"],"answerAudio":["a0","a4"]},{"id":"isolation-1","word":"sun","position":0,"target":"s","wordAudio":"a8","promptAudio":"a1","choices":[{"label":"n","audio":"a9"},{"label":"d","audio":"a6"},{"label":"s","audio":"a10"},{"label":"u","audio":"a11"},{"label":"b","audio":"a5"},{"label":"f","audio":"a2"}],"introAudio":["a1","a8"],"answerAudio":["a8","a10"]},{"id":"isolation-2","word":"map","position":0,"target":"m","wordAudio":"a12","promptAudio":"a1","choices":[{"label":"p","audio":"a13"},{"label":"a","audio":"a3"},{"label":"m","audio":"a14"},{"label":"f","audio":"a2"},{"label":"b","audio":"a5"},{"label":"d","audio":"a6"}],"introAudio":["a1","a12"],"answerAudio":["a12","a14"]}]}],"feedback":{"correct":["a15","a16","a17"],"retry":"a18"},"audio":{"a0":"data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQgAAAADAP3/AQD+/w==","a1":"data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQgAAAAEAAMA/v8EAA==","a2":"data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQgAAAD9/wEABAAAAA==","a3":"data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQgAAAACAAEA//8BAA==","a4":"data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQgAAAAEAAAAAAABAA==","a5":"data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQgAAAABAP3/AgAAAA==","a6":"data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQgAAAADAAMA//8AAA==","a7":"data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQgAAAADAP7/AAACAA==","a8":"data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQgAAAABAAMABAACAA==","a9":"data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQgAAAD9/wIAAAABAA==","a10":"data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQgAAAAEAAEA/f8CAA==","a11":"data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQgAAAD+////AgACAA==","a12":"data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQgAAAABAAMA/v8AAA==","a13":"data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQgAAAD//wMA/v8CAA==","a14":"data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQgAAAD+//7//f8BAA==","a15":"data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQgAAAD//wEA/f/+/w==","a16":"data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQgAAAABAP7//v/+/w==","a17":"data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQgAAAD+//7/BAADAA==","a18":"data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQgAAAACAAMABAD9/w=="},"images":{},"submit":null};
var labels={"lang":"en","title":"Word Sounds practice","intro":"Listen carefully and answer each question. You can hear everything again as many times as you like.","learner_label":"Your code name or first name","start":"Start","continue":"Continue where I left off","start_over":"Start over","item_of":"{activity}: {n} of {total}","hear_word":"Hear the word","hear_question":"Hear the question","listen_sound":"Listen to sound {n}","choose_sound":"Choose sound {n}","choose_label":"Choose {sound}","sound_n":"Sound {n}","correct":"Yes! That is right.","try_again":"Not quite. Listen again and try once more.","missed":"Here is the answer. Listen.","next":"Next","finish":"See my results","done_title":"You finished!","done_summary":"Right on the first try: {first} of {total}.","done_retry":"Right after trying again: {retry}.","save":"Save my work as a file","send":"Send my work to my teacher","sending":"Sending...","sent":"Sent. Your teacher's mailbox received it ({receipt}).","send_failed":"It did not send. Save your work as a file instead, and give the file to your teacher.","saved_device":"Your work is kept on this device until you start over.","saved_device_off":"This browser cannot keep your work. Save it as a file before you close this page.","saved_file":"Saved as {file}. Give this file to your teacher.","not_sent":"Saving does not send anything. Your teacher gets your work when you give them the file.","send_note":"Sending goes only to your teacher's school mailbox.","send_closed":"Sending closed on {date}. Save your work as a file and give it to your teacher.","practice_again":"Practice again","practice_again_confirm":"Your results have not been sent or saved as a file yet. If you start over, they will be lost.","keep_results":"Keep my results","name_prompt":"Add your name so your teacher knows these are yours.","name_prompt_add":"Add my name","name_prompt_skip":"Continue without a name","copy_results":"This browser cannot save files. Copy all of this text and send it to your teacher.","save_csv":"Save results as a spreadsheet file (CSV)","copy_tsv":"Copy for a spreadsheet","copied":"Copied. Now paste it into a spreadsheet.","copy_manual":"Copy all of this text and paste it into a spreadsheet.","about_button":"About this file","about_what":"This is a practice activity in one file. It works with no internet.","about_engine":"File type: {engine}.","about_stores":"It keeps your place and your answers on this device only, under the name {key}. Start over removes them.","about_saves":"When you finish, it can save two files: {csv} opens in a spreadsheet, and {json} is for your teacher to open in AlloFlow.","about_no_network":"It never connects to the internet.","about_mailbox":"It connects to the internet for one thing only: when you press Send, your results go to your teacher's class mailbox at {host}. Nothing is sent before that.","about_never":"It never uses the microphone or the camera. It has no cookies and runs no AI.","about_check":"Each saved file has a check value. It shows when a file was changed by accident. It cannot stop someone who changes a file on purpose.","about_rules":"The safety rules this file gives the browser: {csp}","about_licence":"License: {licence}. Anyone may read, share and change the code.","about_credits":"Made with: {list}","no_script":"If the practice does not start, download this file and open it in Chrome, Edge or Safari.","audio_missing":"This sound could not play.","ordinals":["first","second","third","fourth","fifth","sixth","seventh","eighth","ninth","tenth","eleventh","twelfth"],"isolation_question":"What is the {position} sound in the word?","isolation_correct":"Yes! That is the {position} sound.","isolation_missed":"The {position} sound is {sound}. Listen.","isolation_missed_no_letters":"Here is the {position} sound. Listen.","isolation_title":"Find Sounds"};
var matches=function soundAnswerMatches(answer, expected) {
    var EQUIV = { oy: 'oi', au: 'aw', ew: 'oo', oe: 'oa', ai: 'ay', ea: 'ee', ir: 'er', ur: 'er', igh: 'ie', ou: 'ow', ck: 'k', ph: 'f', wr: 'r', kn: 'n' };
    var a = String(answer == null ? '' : answer).toLowerCase().trim();
    var e = String(expected == null ? '' : expected).toLowerCase().trim();
    if (!e) return false;
    return a === e || (EQUIV[a] || a) === (EQUIV[e] || e);
  };
var renders={"isolation":function (item, ctx) {
      var position = ctx.ordinal(item.position);
      var cards = [];
      var list = ctx.el('ul', { class: 'choices' });
      item.choices.forEach(function (choice, i) {
        var n = i + 1;
        var shown = ctx.showLetters ? '/' + choice.label + '/' : ctx.fmt(ctx.L.sound_n, { n: n });
        var listen = ctx.el('button', { type: 'button', 'aria-label': ctx.fmt(ctx.L.listen_sound, { n: n }),
          on: { click: function () { ctx.support('soundListens'); ctx.play(choice.audio); } } }, ['\\u25B6 ', ctx.fmt(ctx.L.sound_n, { n: n })]);
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
