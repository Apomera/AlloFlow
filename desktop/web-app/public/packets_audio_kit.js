// Sound helpers shared by the Packets pages (2026-11-17): reading a WAV, writing a data: address, and making a WAV
// smaller as MP3 with the app's own encoder (lame.min.js, from this site), one channel. No AI, no network beyond this
// site's encoder file, which is asked for only when a page calls getMp3().
// Used by the Word Sounds maker (packets-make.js: a file's recordings as MP3, about 8 to 10 times smaller than WAV) and
// by packets_voice_engine.js (the two pages that use the computer voice).
(function (win) {
  'use strict';
  var doc = win.document;
  var MP3_ENCODER = 'lame.min.js';
  var asked = null;

  // A WAV's own facts: { format, channels, rate, byteRate, bits, at (where the sound starts), size (its bytes) }, or null.
  function wavInfo(bytes) {
    try {
      if (!bytes || bytes.byteLength < 12) return null;
      var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), info = null;
      if (String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== 'RIFF'
        || String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) !== 'WAVE') return null;
      for (var at = 12; at + 8 <= bytes.byteLength;) {
        var name = String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]), size = view.getUint32(at + 4, true);
        if (name === 'fmt ') {
          if (size < 16 || at + 8 + size > bytes.byteLength) return null;
          var fmt = { format: view.getUint16(at + 8, true), channels: view.getUint16(at + 10, true), rate: view.getUint32(at + 12, true), byteRate: view.getUint32(at + 16, true), bits: view.getUint16(at + 22, true) };
          if (!(fmt.channels > 0 && fmt.rate > 0 && fmt.byteRate > 0 && fmt.bits > 0)) return null;
          info = fmt;
        }
        if (name === 'data') { if (!info) return null; info.at = at + 8; info.size = Math.min(size, bytes.byteLength - at - 8); return info; }
        at += 8 + size + (size % 2);
      }
    } catch (_) {}
    return null;
  }
  // How long a WAV is, in milliseconds (0 when it cannot be read).
  function wavMs(bytes) {
    var info = wavInfo(bytes);
    return info && info.byteRate ? Math.round(info.size / info.byteRate * 1000) : 0;
  }
  function toDataUri(bytes, type) {
    var text = '';
    for (var i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return 'data:' + (type || 'audio/wav') + ';base64,' + win.btoa(text);
  }
  // A base64 data: address as bytes, or null.
  var MAX_DATA_URI_CHARS = 28 * 1024 * 1024;
  function fromDataUri(uri) {
    var raw = String(uri || '');
    if (raw.length > MAX_DATA_URI_CHARS) return null;
    var m = /^data:[^,]*;base64,([A-Za-z0-9+/]*=*)$/i.exec(raw);
    if (!m) return null;
    try {
      var text = win.atob(m[1]), out = new Uint8Array(text.length);
      for (var i = 0; i < text.length; i++) out[i] = text.charCodeAt(i);
      return out;
    } catch (_) { return null; }
  }

  // The app's MP3 encoder, from this site. Resolves true when it can be used. Asked for once.
  function getMp3() {
    if (win.lamejs && win.lamejs.Mp3Encoder) return Promise.resolve(true);
    if (asked) return asked;
    asked = new Promise(function (resolve) {
      var settled = false;
      var script = doc.createElement('script');
      script.src = MP3_ENCODER;
      var timer = typeof win.setTimeout === 'function' ? win.setTimeout(function () {
        if (settled) return;
        settled = true;
        asked = null;
        script.onload = script.onerror = null;
        try { if (script.parentNode) script.parentNode.removeChild(script); } catch (_) {}
        resolve(false);
      }, 15000) : 0;
      var finish = function (ok) {
        if (settled) return;
        settled = true;
        if (timer && typeof win.clearTimeout === 'function') win.clearTimeout(timer);
        script.onload = script.onerror = null;
        if (!ok) {
          asked = null;
          try { if (script.parentNode) script.parentNode.removeChild(script); } catch (_) {}
        }
        resolve(ok);
      };
      script.onload = function () { finish(!!(win.lamejs && win.lamejs.Mp3Encoder)); };
      script.onerror = function () { finish(false); };
      var host = doc && (doc.head || doc.documentElement);
      if (!host) { finish(false); return; }
      host.appendChild(script);
    });
    return asked;
  }
  // A WAV (one channel, 16-bit) as MP3 bytes, the app's recipe: one channel at the WAV's own rate. null when the encoder is
  // not here or the WAV is another kind, so the caller keeps the WAV.
  function wavToMp3(bytes, kbps) {
    var info = wavInfo(bytes);
    if (!win.lamejs || !win.lamejs.Mp3Encoder || !info || info.format !== 1 || info.channels !== 1 || info.bits !== 16 || info.size < 2 || !(info.rate >= 8000 && info.rate <= 96000)) return null;
    var n = Number(kbps);
    var rateKbps = isFinite(n) && n > 0 ? Math.max(8, Math.min(320, Math.round(n))) : 64;
    try {
      var samples = new Int16Array(bytes.buffer.slice(bytes.byteOffset + info.at, bytes.byteOffset + info.at + info.size - (info.size % 2)));
      var encoder = new win.lamejs.Mp3Encoder(1, info.rate, rateKbps), parts = [], total = 0, BLOCK = 1152;
      var keep = function (part) { if (part && part.length) { parts.push(part); total += part.length; } };
      for (var i = 0; i < samples.length; i += BLOCK) keep(encoder.encodeBuffer(samples.subarray(i, i + BLOCK)));
      keep(encoder.flush());
      if (!total) return null;
      var out = new Uint8Array(total), at = 0;
      parts.forEach(function (part) { out.set(part, at); at += part.length; });
      return out;
    } catch (_) { return null; }
  }
  // A WAV data: address as an MP3 data: address, or null (then the caller keeps the WAV).
  function wavUriToMp3Uri(uri, kbps) {
    if (!/^data:audio\/(?:wav|x-wav|wave);base64,/i.test(String(uri || ''))) return null;
    var bytes = fromDataUri(uri), mp3 = bytes ? wavToMp3(bytes, kbps) : null;
    return mp3 ? toDataUri(mp3, 'audio/mpeg') : null;
  }

  win.AlloPacketAudioKit = { wavInfo: wavInfo, wavMs: wavMs, toDataUri: toDataUri, fromDataUri: fromDataUri, getMp3: getMp3, wavToMp3: wavToMp3, wavUriToMp3Uri: wavUriToMp3Uri };
})(window);
