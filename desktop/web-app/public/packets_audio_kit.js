// Sound helpers shared by the Packets pages (2026-11-17): reading a WAV, writing a data: address, and making a WAV
// smaller as MP3 with the app's own encoder (lame.min.js, from this site), one channel. No AI, no network beyond this
// site's encoder file, which is asked for only when a page calls getMp3().
// Used by the Word Sounds maker (packets-make.js: a file's recordings as MP3, about 8 to 10 times smaller than WAV) and
// by packets_voice_engine.js (the two pages that use the computer voice).
(function (win) {
  'use strict';
  var _win = (win && (typeof win === 'object' || typeof win === 'function')) ? win : null;
  var MP3_ENCODER = 'lame.min.js';
  var MAX_WAV_ENCODE_BYTES = 24 * 1024 * 1024;
  var asked = null;

  function _safeNum(v) {
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && v.trim() !== '') return Number(v);
    return NaN;
  }

  function _asUint8(bytes) {
    if (!bytes) return null;
    if (bytes instanceof Uint8Array) return bytes;
    if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView && ArrayBuffer.isView(bytes)) {
      return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    }
    return null;
  }

  // A WAV's own facts: { format, channels, rate, byteRate, bits, at (where the sound starts), size (its bytes) }, or null.
  function wavInfo(bytes) {
    try {
      var u8 = _asUint8(bytes);
      if (!u8 || u8.byteLength < 12) return null;
      var view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), info = null;
      if (String.fromCharCode(u8[0], u8[1], u8[2], u8[3]) !== 'RIFF'
        || String.fromCharCode(u8[8], u8[9], u8[10], u8[11]) !== 'WAVE') return null;
      for (var at = 12; at + 8 <= u8.byteLength;) {
        var name = String.fromCharCode(u8[at], u8[at + 1], u8[at + 2], u8[at + 3]), size = view.getUint32(at + 4, true);
        if (name === 'fmt ') {
          if (size < 16 || at + 8 + size > u8.byteLength) return null;
          var fmt = { format: view.getUint16(at + 8, true), channels: view.getUint16(at + 10, true), rate: view.getUint32(at + 12, true), byteRate: view.getUint32(at + 16, true), bits: view.getUint16(at + 22, true) };
          if (!(fmt.channels > 0 && fmt.rate > 0 && fmt.byteRate > 0 && fmt.bits > 0)) return null;
          info = fmt;
        }
        if (name === 'data') { if (!info) return null; info.at = at + 8; info.size = Math.min(size, u8.byteLength - at - 8); return info; }
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
    var u8 = _asUint8(bytes);
    if (!u8) return null;
    var safeType = (typeof type === 'string' && /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(type.trim())) ? type.trim() : 'audio/wav';
    var btoaFn = (_win && typeof _win.btoa === 'function') ? _win.btoa : (typeof btoa === 'function' ? btoa : null);
    if (btoaFn) {
      var text = '';
      for (var i = 0; i < u8.length; i += 0x8000) text += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      return 'data:' + safeType + ';base64,' + btoaFn(text);
    }
    if (typeof Buffer === 'function') {
      return 'data:' + safeType + ';base64,' + Buffer.from(u8).toString('base64');
    }
    return null;
  }
  // A base64 data: address as bytes, or null.
  var MAX_DATA_URI_CHARS = 28 * 1024 * 1024;
  function fromDataUri(uri) {
    if (typeof uri !== 'string') return null;
    if (uri.length > MAX_DATA_URI_CHARS) return null;
    var m = /^data:[^,]*;base64,([A-Za-z0-9+/]*=*)$/i.exec(uri);
    if (!m) return null;
    try {
      var atobFn = (_win && typeof _win.atob === 'function') ? _win.atob : (typeof atob === 'function' ? atob : null);
      if (atobFn) {
        var text = atobFn(m[1]), out = new Uint8Array(text.length);
        for (var i = 0; i < text.length; i++) out[i] = text.charCodeAt(i);
        return out;
      }
      if (typeof Buffer === 'function') {
        return new Uint8Array(Buffer.from(m[1], 'base64'));
      }
      return null;
    } catch (_) { return null; }
  }

  // The app's MP3 encoder, from this site. Resolves true when it can be used. Asked for once.
  function getMp3() {
    if (!_win) return Promise.resolve(false);
    if (_win.lamejs && _win.lamejs.Mp3Encoder) return Promise.resolve(true);
    var doc = _win.document;
    if (!doc || typeof doc.createElement !== 'function') return Promise.resolve(false);
    if (asked) return asked;
    asked = new Promise(function (resolve) {
      var settled = false;
      var script = null;
      var timer = 0;
      var finish = function (ok) {
        if (settled) return;
        settled = true;
        if (timer && typeof _win.clearTimeout === 'function') _win.clearTimeout(timer);
        if (script) script.onload = script.onerror = null;
        if (!ok) {
          asked = null;
          try { if (script && script.parentNode) script.parentNode.removeChild(script); } catch (_) {}
        }
        resolve(ok);
      };
      try {
        script = doc.createElement('script');
        script.src = MP3_ENCODER;
        timer = typeof _win.setTimeout === 'function' ? _win.setTimeout(function () {
          finish(false);
        }, 15000) : 0;
        script.onload = function () { finish(!!(_win.lamejs && _win.lamejs.Mp3Encoder)); };
        script.onerror = function () { finish(false); };
        var host = doc.head || doc.documentElement;
        if (!host || typeof host.appendChild !== 'function') { finish(false); return; }
        host.appendChild(script);
      } catch (_) {
        finish(false);
      }
    });
    return asked;
  }
  // A WAV (one channel, 16-bit) as MP3 bytes, the app's recipe: one channel at the WAV's own rate. null when the encoder is
  // not here or the WAV is another kind, so the caller keeps the WAV.
  function wavToMp3(bytes, kbps) {
    var u8 = _asUint8(bytes);
    var info = wavInfo(u8);
    if (!_win || !_win.lamejs || !_win.lamejs.Mp3Encoder || !info || info.format !== 1 || info.channels !== 1 || info.bits !== 16 || info.size < 2 || info.size > MAX_WAV_ENCODE_BYTES || !(info.rate >= 8000 && info.rate <= 96000)) return null;
    var n = _safeNum(kbps);
    var rateKbps = isFinite(n) && n > 0 ? Math.max(8, Math.min(320, Math.round(n))) : 64;
    try {
      var samples = new Int16Array(u8.buffer.slice(u8.byteOffset + info.at, u8.byteOffset + info.at + info.size - (info.size % 2)));
      var encoder = new _win.lamejs.Mp3Encoder(1, info.rate, rateKbps), parts = [], total = 0, BLOCK = 1152;
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
    if (typeof uri !== 'string' || !/^data:audio\/(?:wav|x-wav|wave)(?:;[^,]*)?;base64,/i.test(uri)) return null;
    var bytes = fromDataUri(uri), mp3 = bytes ? wavToMp3(bytes, kbps) : null;
    return mp3 ? toDataUri(mp3, 'audio/mpeg') : null;
  }

  var api = Object.freeze({ wavInfo: wavInfo, wavMs: wavMs, toDataUri: toDataUri, fromDataUri: fromDataUri, getMp3: getMp3, wavToMp3: wavToMp3, wavUriToMp3Uri: wavUriToMp3Uri });
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (_win) {
    try { _win.AlloPacketAudioKit = api; } catch (_) {}
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : null)));
