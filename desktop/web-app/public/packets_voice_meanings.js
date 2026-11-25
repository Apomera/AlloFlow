// Meanings from the vocabulary maker, on the computer-voice page (packets-voice.html), 2026-11-23.
// The vocabulary maker links here with the meanings of a file that have no recording (a teacher's own or changed
// meaning, a wrong answer the teacher wrote, or any meaning when this site has no meaning recordings), after the #
// (#meanings=<a JSON list>), which browsers do not send to any server. Each is said by the voice of the meaning
// recordings made ahead of time (Kokoro, Heart, whatever voice is chosen above), trimmed and set to their loudness
// (so no answer of a question stands out), made MP3 and kept in My words under the meaning's key
// (AlloPacketMyWords.putMeaningClip). The maker picks them up by itself when they are kept. Nothing is sent.
(function (win) {
  'use strict';
  var doc = win.document;
  var $ = function (id) { return doc.getElementById(id); };
  var engine = win.AlloPacketVoiceEngine || null, myWords = win.AlloPacketMyWords || null;
  var MAX = 120, VOICE = 'af_heart', KBPS = 32, CLIP_LIMIT = 409600;
  // Loudness of the meaning recordings made ahead of time (-20 LUFS; dev-tools/build_packets_meaning_audio.cjs), as
  // gatedRms below measures them: the median of the 198 pilot recordings, 2026-11-23 (0.0984, -20.1 dB; 10 to 90 percent
  // within 1.1 dB).
  var TARGET_RMS = 0.098;
  var state = { list: [], clips: Object.create(null), keys: Object.create(null), making: false, stop: null, ready: false };

  // The text the voice is given: as spokenText in dev-tools/build_packets_meaning_audio.cjs (a test compares them).
  function spokenText(def) {
    var t = String(def == null ? '' : def).replace(/\s+/g, ' ').trim().replace(/\s*_{2,}\s*,?\s*/g, '... blank... ').replace(/\s+/g, ' ').trim();
    t = t.replace(/^\.\.\.\s*/, '').replace(/\.\.\.\s*([.!?])$/, '$1').replace(/\.\.\.$/, '.');
    if (!/[.!?]$/.test(t)) t += '.';
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  // The loudness of speech in 16-bit samples: the power of the 20 ms frames louder than -50 dB, as a level 0 to 1.
  function gatedRms(samples, rate) {
    var size = Math.max(1, Math.round(rate * 0.02)), sum = 0, frames = 0;
    for (var at = 0; at + size <= samples.length; at += size) {
      var p = 0;
      for (var i = at; i < at + size; i++) { var v = samples[i] / 32768; p += v * v; }
      p /= size;
      if (p > 1e-5) { sum += p; frames++; }
    }
    return frames ? Math.sqrt(sum / frames) : 0;
  }
  // A WAV of the voice -> a WAV trimmed to the speech (60 ms before, 120 ms after, short fades) at TARGET_RMS, its peak
  // under -1.5 dB. 16-bit mono only; anything else comes back as it was.
  function levelWav(bytes) {
    var kit = win.AlloPacketAudioKit, info = kit && typeof kit.wavInfo === 'function' ? kit.wavInfo(bytes) : null;
    if (!info || info.channels !== 1 || info.bits !== 16 || info.format !== 1) return bytes;
    var view = new DataView(bytes.buffer, bytes.byteOffset + info.at, info.size), n = info.size >> 1, s = new Int16Array(n), peak = 0, i;
    for (i = 0; i < n; i++) { s[i] = view.getInt16(i * 2, true); if (Math.abs(s[i]) > peak) peak = Math.abs(s[i]); }
    if (!peak) return bytes;
    var floor = peak * 0.003, first = 0, last = n - 1;
    while (first < n && Math.abs(s[first]) < floor) first++;
    while (last > first && Math.abs(s[last]) < floor) last--;
    var start = Math.max(0, first - Math.round(info.rate * 0.06)), end = Math.min(n, last + 1 + Math.round(info.rate * 0.12)), count = end - start;
    var part = s.subarray(start, end), rms = gatedRms(part, info.rate);
    var gain = rms ? TARGET_RMS / rms : 1;
    if (peak * gain > 32768 * 0.84) gain = 32768 * 0.84 / peak;
    var fadeIn = Math.min(Math.round(info.rate * 0.005), first - start), fadeOut = Math.min(Math.round(info.rate * 0.03), end - 1 - last);
    var out = new Uint8Array(44 + count * 2), w = new DataView(out.buffer);
    var tag = function (at, text) { for (var k = 0; k < text.length; k++) out[at + k] = text.charCodeAt(k); };
    tag(0, 'RIFF'); w.setUint32(4, 36 + count * 2, true); tag(8, 'WAVE'); tag(12, 'fmt '); w.setUint32(16, 16, true); w.setUint16(20, 1, true); w.setUint16(22, 1, true);
    w.setUint32(24, info.rate, true); w.setUint32(28, info.rate * 2, true); w.setUint16(32, 2, true); w.setUint16(34, 16, true); tag(36, 'data'); w.setUint32(40, count * 2, true);
    for (i = 0; i < count; i++) {
      var g = gain;
      if (fadeIn > 0 && i < fadeIn) g *= 0.5 - 0.5 * Math.cos(Math.PI * i / fadeIn);
      if (fadeOut > 0 && i >= count - fadeOut) g *= 0.5 - 0.5 * Math.cos(Math.PI * (count - 1 - i) / fadeOut);
      w.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, Math.round(part[i] * g))), true);
    }
    return out;
  }
  // The meanings handed over: #meanings=<encoded JSON list of texts>. Each once, at most MAX, at most 300 characters.
  function handed(hash) {
    var m = /[#&]meanings=([^&]*)/.exec(hash || '');
    if (!m) return [];
    var list = [];
    try { list = JSON.parse(decodeURIComponent(m[1])); } catch (_) { return []; }
    var out = [];
    (Array.isArray(list) ? list : []).forEach(function (t) {
      var k = typeof t === 'string' ? t.replace(/\s+/g, ' ').trim() : '';
      if (k && k.length <= 300 && !/[\x00-\x1f]/.test(k) && out.indexOf(k) < 0 && out.length < MAX) out.push(k);
    });
    return out;
  }
  function count(n, one) { return n + ' ' + one + (n === 1 ? '' : 's'); }
  function setText(id, text) { var node = $(id); if (node && node.textContent !== text) node.textContent = text; }
  function el(tag, cls, text) { var node = doc.createElement(tag); if (cls) node.className = cls; if (text != null) node.textContent = text; return node; }
  function needing() { return state.list.filter(function (t) { return !state.clips[t]; }); }
  function refresh() {
    if (!myWords || typeof myWords.getMeaningClips !== 'function') return Promise.resolve();
    return myWords.getMeaningClips(state.list).then(function (found) {
      state.clips = Object.assign(Object.create(null), found || {});
    }, function () {});
  }
  function play(text) {
    var clip = state.clips[text];
    if (!clip || !/^data:audio\//i.test(clip.dataUri || '')) return;
    try { if (state.playing) state.playing.pause(); } catch (_) {}
    state.playing = new win.Audio(clip.dataUri);
    state.playing.play().catch(function () { setText('meanings-said', 'This browser could not play that recording.'); });
  }
  function draw() {
    var list = $('meaning-rows');
    list.textContent = '';
    state.list.forEach(function (text, i) {
      var clip = state.clips[text], row = el('li', 'voice-row voice-row-meaning' + (clip ? ' is-made' : ''));
      row.appendChild(el('span', 'voice-meaning', text));
      row.appendChild(el('span', 'voice-state', clip ? 'Has a computer-voice recording' + (clip.ms ? ', ' + (clip.ms / 1000).toFixed(1) + ' seconds.' : '.') : 'No recording yet.'));
      var add = function (label, name, fn) {
        var b = el('button', 'btn btn-small', label);
        b.type = 'button'; b.setAttribute('aria-label', name + ' ' + (i + 1)); b.disabled = state.making;
        b.addEventListener('click', fn); row.appendChild(b);
      };
      if (clip) add('Play', 'Play the recording of meaning', function () { play(text); });
      if (clip && state.ready) add('Make again', 'Make the recording again of meaning', function () { make([text]); });
      if (clip) add('Remove', 'Remove the recording of meaning', function () {
        myWords.putMeaningClip(text, null).then(refresh).then(draw).then(function () { setText('meanings-said', 'The recording of meaning ' + (i + 1) + ' is removed.'); });
      });
      list.appendChild(row);
    });
    var need = needing().length, btn = $('make-meanings');
    btn.disabled = !state.ready || state.making || !need;
    btn.textContent = need ? 'Make recordings for the ' + count(need, 'meaning') + ' that ' + (need === 1 ? 'has' : 'have') + ' none' : 'Make recordings for the meanings that have none';
    $('stop-meanings').hidden = !state.making;
    if (!state.making && !state.ready) setText('meanings-said', 'Get the voice first.');
  }
  function makeOne(text, signal) {
    return engine.speak(spokenText(text), VOICE, { signal: signal }).then(function (bytes) {
      return (typeof engine.getMp3 === 'function' ? engine.getMp3().catch(function () { return false; }) : Promise.resolve(false)).then(function (ok) {
        var mp3 = ok ? engine.wavToMp3(levelWav(bytes), KBPS) : null;
        if (!mp3) throw new Error('This browser could not make the smaller kind of recording, so it was not kept.');
        if (mp3.length > CLIP_LIMIT) throw new Error('The recording is too long to keep.');
        return myWords.putMeaningClip(text, { dataUri: engine.toDataUri(mp3, 'audio/mpeg'), source: 'computer-voice', made: new Date().toISOString(), ms: engine.wavMs(bytes) });
      });
    });
  }
  function make(texts) {
    if (state.making || !state.ready || !texts.length) return;
    var words = $('stop');
    if (words && !words.hidden) { setText('meanings-problem', 'Wait for the word recordings to finish first.'); return; }
    var stop = typeof win.AbortController === 'function' ? new win.AbortController() : { signal: { aborted: false }, abort: function () { this.signal.aborted = true; } };
    state.making = true; state.stop = stop;
    doc.body.setAttribute('data-making-meanings', '1');
    setText('meanings-problem', '');
    draw();
    var done = 0, failed = 0, problem = '';
    var step = function (i) {
      if (i >= texts.length || stop.signal.aborted) return Promise.resolve();
      setText('meanings-said', 'Making ' + (i + 1) + ' of ' + texts.length + '.');
      return makeOne(texts[i], stop.signal).then(function () { done++; }, function (e) { if (!stop.signal.aborted) { failed++; problem = (e && e.message) || ''; } })
        .then(refresh).then(draw).then(function () { return step(i + 1); });
    };
    step(0).then(function () {
      state.making = false; state.stop = null;
      doc.body.removeAttribute('data-making-meanings');
      draw();
      setText('meanings-said', (stop.signal.aborted ? 'Stopped. ' : '') + count(done, 'recording') + ' made and kept in My words on this device.' + (done ? ' The vocabulary maker uses them the next time it makes the file, by itself.' : ''));
      if (failed) setText('meanings-problem', count(failed, 'meaning') + ' could not be made. ' + problem);
    });
  }
  function start() {
    state.list = handed(win.location.hash);
    if (!state.list.length || !$('meanings')) return;
    $('meanings').hidden = false;
    // Only meanings were handed over: the word steps are not needed, and the voice is step 1.
    if (!/[#&]words=/.test(win.location.hash || '')) {
      ['words-step', 'make-step'].forEach(function (id) { var s = $(id); if (s) s.hidden = true; });
      var voiceKicker = $('voice-title') && $('voice-title').previousElementSibling;
      if (voiceKicker && /kicker/.test(voiceKicker.className)) voiceKicker.textContent = 'Step 1';
      setText('meanings-kicker', 'Step 2');
      if ($('f-voice')) $('f-voice').value = VOICE;
    }
    setText('meanings-count', count(state.list.length, 'meaning') + ' from the vocabulary maker.');
    state.ready = !!(engine && typeof engine.isReady === 'function' && engine.isReady());
    doc.addEventListener('packets-voice-ready', function () { state.ready = true; setText('meanings-said', ''); draw(); });
    $('make-meanings').addEventListener('click', function () { make(needing()); });
    $('stop-meanings').addEventListener('click', function () { if (state.stop) state.stop.abort(); });
    refresh().then(draw);
  }

  win.AlloPacketVoiceMeanings = { spokenText: spokenText, gatedRms: gatedRms, levelWav: levelWav, handed: handed, TARGET_RMS: TARGET_RMS };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})(window);
