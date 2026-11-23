// Zero-network authenticated encryption + QR encoder for AlloFlow Packets (AFPK1 / AFQR1).
// One plain script for browser pages (window.AlloPacketQrCrypto) and Node (module.exports).
// No imports, no network, no cookies, no storage, no external libraries.
//
// Primitives (all IETF RFC standards, pure JS so they work identically on file://, sandboxed frames, and HTTPS):
//   - X25519 Diffie-Hellman key agreement (RFC 7748)
//   - HKDF-SHA-256 key derivation (RFC 5869) with transcript binding (ephemeralPub || teacherPub || nonce)
//   - ChaCha20-Poly1305 AEAD (RFC 8439) with AAD ("AFQR1|" + teacherKeyFingerprint)
//   - RFC 4648 Base32 payload ("AFQR1:<A-Z2-7>") for ISO 18004 QR Alphanumeric Mode (not a URL)
//   - Pure-JS ISO 18004 QR matrix & 1-bit PNG renderer (Versions 1-30, EC level L, zero innerHTML, zero URLs)
(function (root) {
  'use strict';

  // Self-contained student-side runtime (encryption + ISO 18004 QR SVG only; no decryption).
  // Serialized via Function.prototype.toString() ONLY into packets that opt into a teacher QR public key.
  function buildStudentQrRuntime(host) {
    var PK_PREFIX = 'AFPK1.';
    var QR_PREFIX = 'AFQR1:';
    var HKDF_INFO = 'alloflow-packet-qr-v1';
    var MAX_QR_PLAINTEXT = 1050;

    function utf8Encode(str) {
      var s = String(str == null ? '' : str);
      if (typeof TextEncoder === 'function') return new TextEncoder().encode(s);
      var out = [];
      for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i);
        if (c < 0x80) out.push(c);
        else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
        else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
          var c2 = s.charCodeAt(++i);
          var cp = 0x10000 + (((c & 0x3ff) << 10) | (c2 & 0x3ff));
          out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
        } else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      }
      return new Uint8Array(out);
    }
    function concatBytes(list) {
      var total = 0, i;
      for (i = 0; i < list.length; i++) total += list[i].length;
      var out = new Uint8Array(total), pos = 0;
      for (i = 0; i < list.length; i++) { out.set(list[i], pos); pos += list[i].length; }
      return out;
    }
    function randomBytes(n) {
      var buf = new Uint8Array(n);
      var c = (host && host.crypto) || (typeof crypto !== 'undefined' ? crypto : null);
      if (!c || typeof c.getRandomValues !== 'function') throw new Error('Secure random generator is unavailable in this browser.');
      c.getRandomValues(buf);
      return buf;
    }
    function toHex(bytes) {
      var out = '';
      for (var i = 0; i < bytes.length; i++) out += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
      return out;
    }

    var B64U = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    function toBase64Url(bytes) {
      var out = '', i = 0, n = bytes.length;
      for (; i + 2 < n; i += 3) {
        var v = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
        out += B64U[(v >> 18) & 63] + B64U[(v >> 12) & 63] + B64U[(v >> 6) & 63] + B64U[v & 63];
      }
      if (i < n) {
        var v1 = bytes[i] << 16;
        if (i + 1 < n) v1 |= bytes[i + 1] << 8;
        out += B64U[(v1 >> 18) & 63] + B64U[(v1 >> 12) & 63] + (i + 1 < n ? B64U[(v1 >> 6) & 63] : '');
      }
      return out;
    }
    function fromBase64Url(str) {
      var clean = String(str || '').replace(/\s+/g, '');
      if (!clean || clean.length % 4 === 1 || /[^A-Za-z0-9_-]/.test(clean)) return null;
      var out = new Uint8Array(Math.floor(clean.length * 3 / 4));
      var bits = 0, held = 0, pos = 0;
      for (var i = 0; i < clean.length; i++) {
        var idx = B64U.indexOf(clean.charAt(i));
        if (idx < 0) return null;
        held = (held << 6) | idx;
        bits += 6;
        if (bits >= 8) { bits -= 8; out[pos++] = (held >> bits) & 255; }
      }
      return out;
    }
    var B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    function toBase32(bytes) {
      var out = '', bits = 0, held = 0;
      for (var i = 0; i < bytes.length; i++) {
        held = (held << 8) | bytes[i];
        bits += 8;
        while (bits >= 5) { bits -= 5; out += B32[(held >> bits) & 31]; }
      }
      if (bits > 0) out += B32[(held << (5 - bits)) & 31];
      return out;
    }

    var SHA_K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];
    function sha256(bytes) {
      var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
      var w = new Int32Array(64), n = bytes.length, i;
      var block = function (view, at) {
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
      };
      var whole = n - (n % 64), at;
      var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      for (at = 0; at < whole; at += 64) block(view, at);
      var rest = n - whole;
      var tail = new Uint8Array(rest + 9 > 64 ? 128 : 64);
      tail.set(bytes.subarray(whole));
      tail[rest] = 0x80;
      var tv = new DataView(tail.buffer);
      tv.setUint32(tail.length - 8, Math.floor(n / 536870912), false);
      tv.setUint32(tail.length - 4, (n << 3) >>> 0, false);
      for (at = 0; at < tail.length; at += 64) block(tv, at);
      var out = new Uint8Array(32), ov = new DataView(out.buffer);
      for (i = 0; i < 8; i++) ov.setInt32(i * 4, H[i], false);
      return out;
    }
    function hmacSha256(key, msg) {
      var k = key.length > 64 ? sha256(key) : key;
      var ipad = new Uint8Array(64), opad = new Uint8Array(64);
      for (var i = 0; i < 64; i++) { var kb = i < k.length ? k[i] : 0; ipad[i] = kb ^ 0x36; opad[i] = kb ^ 0x5c; }
      return sha256(concatBytes([opad, sha256(concatBytes([ipad, msg]))]));
    }
    function hkdfSha256(ikm, salt, info, len) {
      var s = salt && salt.length ? salt : new Uint8Array(32);
      var prk = hmacSha256(s, ikm);
      var n = Math.ceil(len / 32), out = new Uint8Array(len), prev = new Uint8Array(0), pos = 0;
      for (var ctr = 1; ctr <= n; ctr++) {
        prev = hmacSha256(prk, concatBytes([prev, info, new Uint8Array([ctr])]));
        var take = Math.min(32, len - pos);
        out.set(prev.subarray(0, take), pos);
        pos += take;
      }
      return out;
    }

    var P25519 = (BigInt(1) << BigInt(255)) - BigInt(19);
    var A24 = BigInt(121665);
    var MASK255 = (BigInt(1) << BigInt(255)) - BigInt(1);
    var X25519_BASE = (function () { var b = new Uint8Array(32); b[0] = 9; return b; })();

    function modP(a) { var r = a % P25519; return r < BigInt(0) ? r + P25519 : r; }
    function modPowP(base, exp) {
      var res = BigInt(1), b = modP(base), e = exp;
      while (e > BigInt(0)) {
        if (e & BigInt(1)) res = (res * b) % P25519;
        b = (b * b) % P25519;
        e >>= BigInt(1);
      }
      return res;
    }
    function decodeLE(bytes) {
      var out = BigInt(0);
      for (var i = bytes.length - 1; i >= 0; i--) out = (out << BigInt(8)) | BigInt(bytes[i]);
      return out;
    }
    function encodeLE32(v) {
      var out = new Uint8Array(32), x = modP(v);
      for (var i = 0; i < 32; i++) { out[i] = Number(x & BigInt(255)); x >>= BigInt(8); }
      return out;
    }
    function x25519(scalarBytes, uBytes) {
      if (!scalarBytes || scalarBytes.length !== 32 || !uBytes || uBytes.length !== 32) throw new Error('X25519 requires 32-byte inputs.');
      var kArr = new Uint8Array(scalarBytes);
      kArr[0] &= 248; kArr[31] &= 127; kArr[31] |= 64;
      var k = decodeLE(kArr);
      var u = decodeLE(uBytes) & MASK255;
      var x1 = u, x2 = BigInt(1), z2 = BigInt(0), x3 = u, z3 = BigInt(1), swap = BigInt(0);
      for (var t = 254; t >= 0; t--) {
        var kt = (k >> BigInt(t)) & BigInt(1);
        swap ^= kt;
        if (swap) { var tx = x2; x2 = x3; x3 = tx; var tz = z2; z2 = z3; z3 = tz; }
        swap = kt;
        var A = modP(x2 + z2), AA = modP(A * A), B = modP(x2 - z2), BB = modP(B * B), E = modP(AA - BB);
        var C = modP(x3 + z3), D = modP(x3 - z3), DA = modP(D * A), CB = modP(C * B);
        x3 = modP((DA + CB) * (DA + CB));
        z3 = modP(x1 * modP((DA - CB) * (DA - CB)));
        x2 = modP(AA * BB);
        z2 = modP(E * modP(AA + modP(A24 * E)));
      }
      if (swap) { var fx = x2; x2 = x3; x3 = fx; var fz = z2; z2 = z3; z3 = fz; }
      return encodeLE32(modP(x2 * modPowP(z2, P25519 - BigInt(2))));
    }
    function x25519Public(secretBytes) { return x25519(secretBytes, X25519_BASE); }
    function isAllZero(bytes) { var acc = 0; for (var i = 0; i < bytes.length; i++) acc |= bytes[i]; return acc === 0; }

    function rotl32(v, n) { return ((v << n) | (v >>> (32 - n))) >>> 0; }
    function u32le(b, i) { return (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0; }
    function chacha20Block(key32, counter, nonce12) {
      var s = new Uint32Array(16);
      s[0] = 0x61707865; s[1] = 0x3320646e; s[2] = 0x79622d32; s[3] = 0x6b206574;
      for (var i = 0; i < 8; i++) s[4 + i] = u32le(key32, i * 4);
      s[12] = counter >>> 0;
      s[13] = u32le(nonce12, 0); s[14] = u32le(nonce12, 4); s[15] = u32le(nonce12, 8);
      var w = new Uint32Array(s);
      var qr = function (a, b, c, d) {
        w[a] = (w[a] + w[b]) >>> 0; w[d] = rotl32(w[d] ^ w[a], 16);
        w[c] = (w[c] + w[d]) >>> 0; w[b] = rotl32(w[b] ^ w[c], 12);
        w[a] = (w[a] + w[b]) >>> 0; w[d] = rotl32(w[d] ^ w[a], 8);
        w[c] = (w[c] + w[d]) >>> 0; w[b] = rotl32(w[b] ^ w[c], 7);
      };
      for (var r = 0; r < 10; r++) {
        qr(0, 4, 8, 12); qr(1, 5, 9, 13); qr(2, 6, 10, 14); qr(3, 7, 11, 15);
        qr(0, 5, 10, 15); qr(1, 6, 11, 12); qr(2, 7, 8, 13); qr(3, 4, 9, 14);
      }
      var out = new Uint8Array(64);
      for (var j = 0; j < 16; j++) {
        var v = (w[j] + s[j]) >>> 0;
        out[j * 4] = v & 255; out[j * 4 + 1] = (v >>> 8) & 255; out[j * 4 + 2] = (v >>> 16) & 255; out[j * 4 + 3] = (v >>> 24) & 255;
      }
      return out;
    }
    function chacha20Xor(key32, counter, nonce12, data) {
      var out = new Uint8Array(data.length), ctr = counter >>> 0;
      for (var pos = 0; pos < data.length; pos += 64, ctr = (ctr + 1) >>> 0) {
        var ks = chacha20Block(key32, ctr, nonce12);
        var end = Math.min(64, data.length - pos);
        for (var i = 0; i < end; i++) out[pos + i] = data[pos + i] ^ ks[i];
      }
      return out;
    }
    var P1305 = (BigInt(1) << BigInt(130)) - BigInt(5);
    var R_CLAMP = BigInt('0x0ffffffc0ffffffc0ffffffc0fffffff');
    function poly1305(otk32, msg) {
      var r = decodeLE(otk32.subarray(0, 16)) & R_CLAMP;
      var s = decodeLE(otk32.subarray(16, 32));
      var acc = BigInt(0);
      for (var pos = 0; pos < msg.length; pos += 16) {
        var end = Math.min(pos + 16, msg.length), len = end - pos;
        var chunk = decodeLE(msg.subarray(pos, end)) | (BigInt(1) << BigInt(len * 8));
        acc = ((acc + chunk) * r) % P1305;
      }
      acc += s;
      var tag = new Uint8Array(16);
      for (var i = 0; i < 16; i++) { tag[i] = Number(acc & BigInt(255)); acc >>= BigInt(8); }
      return tag;
    }
    function poly1305MacData(aad, ct) {
      var padA = (16 - (aad.length % 16)) % 16, padC = (16 - (ct.length % 16)) % 16;
      var lens = new Uint8Array(16), dv = new DataView(lens.buffer);
      dv.setUint32(0, aad.length >>> 0, true); dv.setUint32(4, Math.floor(aad.length / 4294967296), true);
      dv.setUint32(8, ct.length >>> 0, true); dv.setUint32(12, Math.floor(ct.length / 4294967296), true);
      return concatBytes([aad, new Uint8Array(padA), ct, new Uint8Array(padC), lens]);
    }
    function aeadSeal(key32, nonce12, plaintext, aad) {
      var otk = chacha20Block(key32, 0, nonce12).subarray(0, 32);
      var ct = chacha20Xor(key32, 1, nonce12, plaintext);
      var tag = poly1305(otk, poly1305MacData(aad || new Uint8Array(0), ct));
      return concatBytes([ct, tag]);
    }

    function fingerprintOf(pubBytes) {
      return toHex(sha256(concatBytes([utf8Encode('AFPK1|'), pubBytes]))).slice(0, 8);
    }
    function parsePublicKey(raw) {
      var clean = String(raw || '').trim();
      if (clean.indexOf(PK_PREFIX) !== 0) return null;
      var bytes = fromBase64Url(clean.slice(PK_PREFIX.length));
      if (!bytes || bytes.length !== 32 || isAllZero(bytes)) return null;
      return { publicKey: PK_PREFIX + toBase64Url(bytes), bytes: bytes, fingerprint: fingerprintOf(bytes) };
    }

    function compactItem(it, full) {
      var row = [
        Number(it.n) || 0,
        String(it.activity || '').slice(0, 30),
        String(it.word || '').slice(0, 48),
        it.target != null ? String(it.target).slice(0, 32) : '',
        Array.isArray(it.responses) ? it.responses.slice(0, 4).map(function (r) { return String(r || '').slice(0, 40); }) : [],
        Number(it.attempts) || 0,
        it.firstTry ? 1 : 0,
        it.correct ? 1 : 0,
        full ? Math.max(0, Math.round(Number(it.ms) || 0)) : 0,
        String(it.flag || '').slice(0, 24),
        it.digitsCorrect != null ? Number(it.digitsCorrect) : null,
        it.digitsPossible != null ? Number(it.digitsPossible) : null,
        it.practice || null,
      ];
      while (row.length > 8 && (row[row.length - 1] == null || row[row.length - 1] === '' || row[row.length - 1] === 0)) row.pop();
      return row;
    }
    function compactResult(file) {
      var f = file || {};
      var pkt = (f.packet && typeof f.packet === 'object') ? f.packet : {};
      var mode = (pkt.mode === 'check' || pkt.mode === 'probe') ? 'check' : 'practice';
      var sum = f.summary || {};
      var items = Array.isArray(f.items) ? f.items : [];
      var actTitles = f.activityTitles && typeof f.activityTitles === 'object' ? f.activityTitles : {};
      var base = {
        v: 1,
        sid: String(f.sessionId || '').slice(0, 48),
        pid: String(pkt.id || f.lessonId || '').slice(0, 64),
        rev: String(pkt.version || f.revision || '').slice(0, 24),
        t: String(f.lessonTitle || '').slice(0, 80),
        m: mode,
        f: String(pkt.form || '').slice(0, 16),
        l: String(f.learner || f.learnerName || '').slice(0, 40),
        s: String(f.startedLocal || f.startedAt || '').slice(0, 32),
        e: String(f.finishedLocal || f.finishedAt || '').slice(0, 32),
        a: Math.max(0, Math.round((Number(f.activeMs != null ? f.activeMs : f.durationMs) || 0) / 1000)),
        sum: [Number(sum.items) || 0, Number(sum.done) || 0, Number(sum.firstTry) || 0, Number(sum.afterRetry) || 0, Number(sum.missed) || 0, Number(sum.practised) || 0],
        at: actTitles,
      };
      if (mode === 'check' && f.score && typeof f.score === 'object') {
        var sc = f.score;
        base.sc = {
          m: sc.measure || '', s: sc.score != null ? sc.score : null, u: sc.scoreUnit || '',
          dc: sc.digitsCorrect != null ? sc.digitsCorrect : null, dp: sc.digitsPossible != null ? sc.digitsPossible : null,
          ic: Number(sc.itemsCorrect) || 0, ia: Number(sc.itemsAttempted) || 0,
          tl: sc.timeLimitS != null ? sc.timeLimitS : null, el: Number(sc.elapsedS) || 0,
          hd: Number(sc.hiddenS) || 0, ps: Number(sc.pausedS) || 0, pn: Number(sc.pauses) || 0,
          dh: Number(sc.directionsHeard) || 0, cm: sc.completion || '', pr: sc.prorated ? 1 : 0,
          nr: sc.noScoreReason || '', sv: sc.scoringVersion || null, fv: sc.formVersion || null,
          at: Number(sc.attempt) || 1, fl: Array.isArray(sc.flags) ? sc.flags.slice(0, 8) : [],
          tl2: Array.isArray(sc.tools) ? sc.tools.slice(0, 8) : [],
          un: sc.untimed ? 1 : 0, ut: sc.usualTimeLimitS != null ? sc.usualTimeLimitS : null,
        };
      }
      var sup = {};
      items.forEach(function (it) {
        var sp = it && it.supports;
        if (!sp || typeof sp !== 'object') return;
        Object.keys(sp).forEach(function (k) { var n = Number(sp[k]) || 0; if (n > 0) sup[k] = (sup[k] || 0) + n; });
      });
      if (Object.keys(sup).length) base.sup = sup;

      base.it = items.map(function (it) { return compactItem(it, true); });
      if (utf8Encode(JSON.stringify(base)).length <= MAX_QR_PLAINTEXT) return { payload: base, truncated: false };
      base.it = items.map(function (it) { return compactItem(it, false); });
      if (utf8Encode(JSON.stringify(base)).length <= MAX_QR_PLAINTEXT) return { payload: base, truncated: false };
      base.tr = 1;
      var focus = items.filter(function (it) { return !it.practice && it.done && (!it.correct || !it.firstTry || it.flag === 'skipped'); });
      base.it = focus.map(function (it) { return compactItem(it, false); });
      while (base.it.length > 0 && utf8Encode(JSON.stringify(base)).length > MAX_QR_PLAINTEXT) base.it.pop();
      return { payload: base, truncated: true };
    }

    function sealResult(resultFile, publicKeyStr, opts) {
      var pk = parsePublicKey(publicKeyStr);
      if (!pk) throw new Error('Invalid teacher QR public key (expected AFPK1....).');
      var packed = compactResult(resultFile);
      var pt = utf8Encode(JSON.stringify(packed.payload));
      var ephSk = (opts && opts.ephemeralSecret) ? new Uint8Array(opts.ephemeralSecret) : randomBytes(32);
      ephSk[0] &= 248; ephSk[31] &= 127; ephSk[31] |= 64;
      var ephPk = x25519Public(ephSk);
      var shared = x25519(ephSk, pk.bytes);
      if (isAllZero(shared)) throw new Error('Key agreement rejected low-order public key.');
      var nonce = (opts && opts.nonce) ? new Uint8Array(opts.nonce) : randomBytes(12);
      var salt = concatBytes([ephPk, pk.bytes, nonce]);
      var aeadKey = hkdfSha256(shared, salt, utf8Encode(HKDF_INFO), 32);
      var aad = utf8Encode('AFQR1|' + pk.fingerprint);
      var ctTag = aeadSeal(aeadKey, nonce, pt, aad);
      var fpBytes = new Uint8Array(4);
      for (var i = 0; i < 4; i++) fpBytes[i] = parseInt(pk.fingerprint.slice(i * 2, i * 2 + 2), 16);
      var wire = concatBytes([new Uint8Array([1]), fpBytes, ephPk, nonce, ctTag]);
      return { code: QR_PREFIX + toBase32(wire), fingerprint: pk.fingerprint, bytes: wire.length, truncated: packed.truncated };
    }

    var ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
    var QR_EC_L = [
      null,
      [7, 1, 19, 0, 0], [10, 1, 34, 0, 0], [15, 1, 55, 0, 0], [20, 1, 80, 0, 0], [26, 1, 108, 0, 0],
      [18, 2, 68, 0, 0], [20, 2, 78, 0, 0], [24, 2, 97, 0, 0], [30, 2, 116, 0, 0], [18, 2, 68, 2, 69],
      [20, 4, 81, 0, 0], [24, 2, 92, 2, 93], [26, 4, 107, 0, 0], [30, 3, 115, 1, 116], [22, 5, 87, 1, 88],
      [24, 5, 98, 1, 99], [28, 1, 107, 5, 108], [30, 5, 120, 1, 121], [28, 3, 113, 4, 114], [28, 3, 107, 5, 108],
      [28, 4, 116, 4, 117], [28, 2, 111, 7, 112], [30, 4, 121, 5, 122], [30, 6, 117, 4, 118], [26, 8, 106, 4, 107],
      [28, 10, 114, 2, 115], [30, 8, 122, 4, 123], [30, 3, 117, 10, 118], [30, 7, 116, 7, 117], [30, 5, 115, 10, 116],
    ];
    var QR_ALIGN = [
      null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
      [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62],
      [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90],
      [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118],
      [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130],
    ];
    var GF_EXP = new Uint8Array(512), GF_LOG = new Uint8Array(256);
    (function () {
      var x = 1;
      for (var i = 0; i < 255; i++) { GF_EXP[i] = x; GF_LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
      for (var j = 255; j < 512; j++) GF_EXP[j] = GF_EXP[j - 255];
    })();
    function gfMul(a, b) { return a && b ? GF_EXP[GF_LOG[a] + GF_LOG[b]] : 0; }
    function rsEncode(data, ecLen) {
      var poly = new Uint8Array(ecLen + 1); poly[0] = 1;
      for (var i = 0; i < ecLen; i++) {
        var rootVal = GF_EXP[i];
        for (var j = i + 1; j > 0; j--) poly[j] = poly[j] ^ gfMul(poly[j - 1], rootVal);
      }
      var rem = new Uint8Array(ecLen);
      for (var d = 0; d < data.length; d++) {
        var factor = data[d] ^ rem[0];
        for (var k = 0; k < ecLen - 1; k++) rem[k] = rem[k + 1] ^ gfMul(poly[k + 1], factor);
        rem[ecLen - 1] = gfMul(poly[ecLen], factor);
      }
      return rem;
    }
    function bchFormat(mask) {
      var data = (1 << 3) | mask, rem = data;
      for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >> 9) * 0x537);
      return ((data << 10) | rem) ^ 0x5412;
    }
    function bchVersion(ver) {
      var rem = ver;
      for (var i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >> 11) * 0x1f25);
      return (ver << 12) | rem;
    }
    function qrMatrix(text) {
      var s = String(text || '');
      var isAlnum = true;
      for (var i = 0; i < s.length; i++) if (ALNUM.indexOf(s.charAt(i)) < 0) { isAlnum = false; break; }
      var rawBytes = isAlnum ? null : utf8Encode(s);
      var ver = 0, dataCap = 0;
      for (var v = 1; v <= 30; v++) {
        var info = QR_EC_L[v];
        var capBytes = info[1] * info[2] + info[3] * info[4];
        var ccBits = isAlnum ? (v < 10 ? 9 : v < 27 ? 11 : 13) : (v < 10 ? 8 : 16);
        var payloadBits = isAlnum ? (Math.floor(s.length / 2) * 11 + (s.length % 2) * 6) : (rawBytes.length * 8);
        if (4 + ccBits + payloadBits <= capBytes * 8) { ver = v; dataCap = capBytes; break; }
      }
      if (!ver) throw new Error('Payload too large for QR version 1-30.');
      var bits = [];
      var pushBits = function (val, len) { for (var b = len - 1; b >= 0; b--) bits.push((val >>> b) & 1); };
      if (isAlnum) {
        pushBits(2, 4);
        pushBits(s.length, ver < 10 ? 9 : ver < 27 ? 11 : 13);
        for (var ai = 0; ai + 1 < s.length; ai += 2) pushBits(ALNUM.indexOf(s.charAt(ai)) * 45 + ALNUM.indexOf(s.charAt(ai + 1)), 11);
        if (s.length % 2) pushBits(ALNUM.indexOf(s.charAt(s.length - 1)), 6);
      } else {
        pushBits(4, 4);
        pushBits(rawBytes.length, ver < 10 ? 8 : 16);
        for (var bi = 0; bi < rawBytes.length; bi++) pushBits(rawBytes[bi], 8);
      }
      var capBits = dataCap * 8;
      pushBits(0, Math.min(4, capBits - bits.length));
      while (bits.length % 8) bits.push(0);
      var pad = [0xec, 0x11], pi = 0;
      while (bits.length < capBits) { pushBits(pad[pi & 1], 8); pi++; }
      var dataCw = new Uint8Array(dataCap);
      for (var ci = 0; ci < dataCap; ci++) {
        var byte = 0;
        for (var bit = 0; bit < 8; bit++) byte = (byte << 1) | bits[ci * 8 + bit];
        dataCw[ci] = byte;
      }
      var ecInfo = QR_EC_L[ver], ecLen = ecInfo[0], blocks = [], ecs = [], off = 0;
      for (var g = 0; g < 2; g++) {
        var bCnt = g === 0 ? ecInfo[1] : ecInfo[3], bLen = g === 0 ? ecInfo[2] : ecInfo[4];
        for (var b = 0; b < bCnt; b++) {
          var blk = dataCw.subarray(off, off + bLen); off += bLen;
          blocks.push(blk); ecs.push(rsEncode(blk, ecLen));
        }
      }
      var interleaved = [], maxBlk = Math.max(ecInfo[2], ecInfo[4]);
      for (var r = 0; r < maxBlk; r++) for (var b2 = 0; b2 < blocks.length; b2++) if (r < blocks[b2].length) interleaved.push(blocks[b2][r]);
      for (var e = 0; e < ecLen; e++) for (var b3 = 0; b3 < ecs.length; b3++) interleaved.push(ecs[b3][e]);

      var size = ver * 4 + 17;
      var func = new Uint8Array(size * size), base = new Uint8Array(size * size);
      var setFn = function (x, y, dark) { if (x >= 0 && y >= 0 && x < size && y < size) { func[y * size + x] = 1; base[y * size + x] = dark ? 1 : 0; } };
      var finder = function (cx, cy) {
        for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
          var d = Math.max(Math.abs(dx), Math.abs(dy));
          setFn(cx + dx, cy + dy, d !== 2 && d !== 4);
        }
      };
      finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
      var aligns = QR_ALIGN[ver];
      for (var ay = 0; ay < aligns.length; ay++) for (var ax = 0; ax < aligns.length; ax++) {
        if ((ax === 0 && ay === 0) || (ax === 0 && ay === aligns.length - 1) || (ax === aligns.length - 1 && ay === 0)) continue;
        for (var dy2 = -2; dy2 <= 2; dy2++) for (var dx2 = -2; dx2 <= 2; dx2++) setFn(aligns[ax] + dx2, aligns[ay] + dy2, Math.max(Math.abs(dx2), Math.abs(dy2)) !== 1);
      }
      for (var ti = 8; ti < size - 8; ti++) { setFn(ti, 6, (ti & 1) === 0); setFn(6, ti, (ti & 1) === 0); }
      for (var fi = 0; fi <= 8; fi++) { if (fi !== 6) { setFn(8, fi, false); setFn(fi, 8, false); } }
      for (var fi2 = 0; fi2 < 8; fi2++) { setFn(size - 1 - fi2, 8, false); setFn(8, size - 1 - fi2, false); }
      setFn(8, size - 8, true);
      if (ver >= 7) {
        var vBits = bchVersion(ver);
        for (var vi = 0; vi < 18; vi++) {
          var darkV = !!((vBits >>> vi) & 1), a2 = size - 11 + (vi % 3), b4 = Math.floor(vi / 3);
          setFn(a2, b4, darkV); setFn(b4, a2, darkV);
        }
      }
      var bitIdx = 0, totalBits = interleaved.length * 8;
      for (var right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (var vert = 0; vert < size; vert++) {
          var y = (((right + 1) & 2) === 0) ? (size - 1 - vert) : vert;
          for (var j2 = 0; j2 < 2; j2++) {
            var x = right - j2;
            if (!func[y * size + x] && bitIdx < totalBits) {
              base[y * size + x] = (interleaved[bitIdx >> 3] >>> (7 - (bitIdx & 7))) & 1;
              bitIdx++;
            }
          }
        }
      }
      var bestMask = 0, bestPen = 1e9, bestMod = null;
      for (var m = 0; m < 8; m++) {
        var mod = new Uint8Array(base);
        for (var my = 0; my < size; my++) for (var mx = 0; mx < size; mx++) {
          if (func[my * size + mx]) continue;
          var inv = m === 0 ? ((mx + my) % 2 === 0) : m === 1 ? (my % 2 === 0) : m === 2 ? (mx % 3 === 0) : m === 3 ? ((mx + my) % 3 === 0)
            : m === 4 ? ((Math.floor(my / 2) + Math.floor(mx / 3)) % 2 === 0) : m === 5 ? (((mx * my) % 2) + ((mx * my) % 3) === 0)
            : m === 6 ? ((((mx * my) % 2) + ((mx * my) % 3)) % 2 === 0) : ((((mx + my) % 2) + ((mx * my) % 3)) % 2 === 0);
          if (inv) mod[my * size + mx] ^= 1;
        }
        var fBits = bchFormat(m);
        for (var k2 = 0; k2 < 6; k2++) mod[k2 * size + 8] = (fBits >>> k2) & 1;
        mod[7 * size + 8] = (fBits >>> 6) & 1; mod[8 * size + 8] = (fBits >>> 7) & 1; mod[8 * size + 7] = (fBits >>> 8) & 1;
        for (var k3 = 9; k3 < 15; k3++) mod[8 * size + (14 - k3)] = (fBits >>> k3) & 1;
        for (var k4 = 0; k4 < 8; k4++) mod[8 * size + (size - 1 - k4)] = (fBits >>> k4) & 1;
        for (var k5 = 8; k5 < 15; k5++) mod[(size - 15 + k5) * size + 8] = (fBits >>> k5) & 1;

        var pen = 0, darkCnt = 0;
        for (var py = 0; py < size; py++) {
          var rRun = 1, cRun = 1;
          for (var px = 0; px < size; px++) {
            var vRow = mod[py * size + px]; if (vRow) darkCnt++;
            if (px > 0) { if (vRow === mod[py * size + px - 1]) { rRun++; if (rRun === 5) pen += 3; else if (rRun > 5) pen++; } else rRun = 1; }
            if (py > 0) { if (mod[px * size + py] === mod[px * size + py - 1]) { cRun++; if (cRun === 5) pen += 3; else if (cRun > 5) pen++; } else cRun = 1; }
            if (px > 0 && py > 0 && vRow === mod[py * size + px - 1] && vRow === mod[(py - 1) * size + px] && vRow === mod[(py - 1) * size + px - 1]) pen += 3;
          }
        }
        var ratio = Math.abs(Math.round(darkCnt * 100 / (size * size)) - 50);
        pen += Math.floor(ratio / 5) * 10;
        if (pen < bestPen) { bestPen = pen; bestMask = m; bestMod = mod; }
      }
      return { version: ver, size: size, mask: bestMask, modules: bestMod };
    }

    var B64S = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    function toBase64(bytes) {
      var out = '', i = 0, n = bytes.length;
      for (; i + 2 < n; i += 3) {
        var v = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
        out += B64S[(v >> 18) & 63] + B64S[(v >> 12) & 63] + B64S[(v >> 6) & 63] + B64S[v & 63];
      }
      if (i < n) {
        var v1 = bytes[i] << 16;
        if (i + 1 < n) v1 |= bytes[i + 1] << 8;
        out += B64S[(v1 >> 18) & 63] + B64S[(v1 >> 12) & 63] + (i + 1 < n ? B64S[(v1 >> 6) & 63] : '=') + '=';
      }
      return out;
    }
    function crc32(bytes) {
      var c = 0xffffffff;
      for (var i = 0; i < bytes.length; i++) {
        c ^= bytes[i];
        for (var b = 0; b < 8; b++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
      }
      return (c ^ 0xffffffff) >>> 0;
    }
    function pngChunk(type, data) {
      var len = data.length, out = new Uint8Array(12 + len), dv = new DataView(out.buffer);
      dv.setUint32(0, len, false);
      for (var i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
      out.set(data, 8);
      dv.setUint32(8 + len, crc32(out.subarray(4, 8 + len)), false);
      return out;
    }
    function qrPngDataUrl(text, scale) {
      var qr = qrMatrix(text), qz = 4, total = qr.size + qz * 2;
      var s = scale || (total <= 85 ? 4 : 3);
      var px = total * s, rowBytes = Math.ceil(px / 8), stride = 1 + rowBytes;
      var raw = new Uint8Array(px * stride);
      for (var my = 0; my < total; my++) {
        var qy = my - qz, row = new Uint8Array(rowBytes);
        row.fill(255);
        if (qy >= 0 && qy < qr.size) {
          for (var mx = 0; mx < qr.size; mx++) {
            if (!qr.modules[qy * qr.size + mx]) continue;
            var x0 = (mx + qz) * s;
            for (var dx = 0; dx < s; dx++) {
              var x = x0 + dx;
              row[x >> 3] &= ~(128 >> (x & 7));
            }
          }
        }
        var extra = px & 7;
        if (extra) row[rowBytes - 1] &= (0xff << (8 - extra)) & 0xff;
        for (var dy = 0; dy < s; dy++) {
          var off = (my * s + dy) * stride;
          raw[off] = 0;
          raw.set(row, off + 1);
        }
      }
      var s1 = 1, s2 = 0;
      for (var a = 0; a < raw.length; a++) { s1 = (s1 + raw[a]) % 65521; s2 = (s2 + s1) % 65521; }
      var blocks = [new Uint8Array([0x78, 0x01])];
      for (var pos = 0; pos < raw.length; pos += 65535) {
        var end = Math.min(pos + 65535, raw.length), blen = end - pos, nlen = (~blen) & 0xffff;
        blocks.push(new Uint8Array([end >= raw.length ? 1 : 0, blen & 255, blen >> 8, nlen & 255, nlen >> 8]));
        blocks.push(raw.subarray(pos, end));
      }
      var adler = new Uint8Array(4);
      new DataView(adler.buffer).setUint32(0, ((s2 << 16) | s1) >>> 0, false);
      blocks.push(adler);
      var ihdr = new Uint8Array(13), iv = new DataView(ihdr.buffer);
      iv.setUint32(0, px, false); iv.setUint32(4, px, false); ihdr[8] = 1; ihdr[9] = 0;
      var png = concatBytes([
        new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
        pngChunk('IHDR', ihdr),
        pngChunk('IDAT', concatBytes(blocks)),
        pngChunk('IEND', new Uint8Array(0)),
      ]);
      return { url: 'data:image/png;base64,' + toBase64(png), width: px, height: px, version: qr.version, size: qr.size, bytes: png };
    }
    function qrImgEl(doc, text, ariaLabel, scale) {
      var p = qrPngDataUrl(text, scale);
      var img = doc.createElement('img');
      img.className = 'qr-img';
      img.src = p.url;
      img.width = p.width;
      img.height = p.height;
      img.alt = ariaLabel || 'Sealed result QR code';
      img.setAttribute('data-qr-version', String(p.version));
      return img;
    }

    return {
      PK_PREFIX: PK_PREFIX, QR_PREFIX: QR_PREFIX, HKDF_INFO: HKDF_INFO, MAX_QR_PLAINTEXT: MAX_QR_PLAINTEXT,
      utf8Encode: utf8Encode, concatBytes: concatBytes, randomBytes: randomBytes, toHex: toHex,
      toBase64Url: toBase64Url, fromBase64Url: fromBase64Url, toBase32: toBase32,
      sha256: sha256, hmacSha256: hmacSha256, hkdfSha256: hkdfSha256,
      x25519: x25519, x25519Public: x25519Public, isAllZero: isAllZero,
      chacha20Block: chacha20Block, chacha20Xor: chacha20Xor, poly1305: poly1305, poly1305MacData: poly1305MacData, aeadSeal: aeadSeal,
      fingerprintOf: fingerprintOf, parsePublicKey: parsePublicKey, compactResult: compactResult,
      sealResult: sealResult, qrMatrix: qrMatrix, qrPngDataUrl: qrPngDataUrl, qrImgEl: qrImgEl,
    };
  }

  // Teacher-side decryption, keypair generation, Base32 decoding, and result expansion.
  var st = buildStudentQrRuntime(root);
  var SK_PREFIX = 'AFSK1.';
  var B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  function utf8Decode(bytes) {
    if (typeof TextDecoder === 'function') return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    var out = '', i = 0;
    while (i < bytes.length) {
      var b0 = bytes[i++];
      if (b0 < 0x80) out += String.fromCharCode(b0);
      else if ((b0 & 0xe0) === 0xc0) out += String.fromCharCode(((b0 & 31) << 6) | (bytes[i++] & 63));
      else if ((b0 & 0xf0) === 0xe0) out += String.fromCharCode(((b0 & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63));
      else {
        var cp = (((b0 & 7) << 18) | ((bytes[i++] & 63) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63)) - 0x10000;
        out += String.fromCharCode(0xd800 | (cp >> 10), 0xdc00 | (cp & 0x3ff));
      }
    }
    return out;
  }
  function fromBase32(str) {
    var clean = String(str || '').toUpperCase().replace(/[\s=-]+/g, '');
    if (!clean || /[^A-Z2-7]/.test(clean)) return null;
    var rem = clean.length % 8;
    if (rem === 1 || rem === 3 || rem === 6) return null;
    var out = new Uint8Array(Math.floor(clean.length * 5 / 8));
    var bits = 0, held = 0, pos = 0;
    for (var i = 0; i < clean.length; i++) {
      var idx = B32.indexOf(clean.charAt(i));
      if (idx < 0) return null;
      held = (held << 5) | idx;
      bits += 5;
      if (bits >= 8) { bits -= 8; out[pos++] = (held >> bits) & 255; }
    }
    if (bits > 0 && (held & ((1 << bits) - 1)) !== 0) return null;
    return out;
  }
  function aeadUnseal(key32, nonce12, sealed, aad) {
    if (!sealed || sealed.length < 16) return null;
    var ct = sealed.subarray(0, sealed.length - 16), tag = sealed.subarray(sealed.length - 16);
    var otk = st.chacha20Block(key32, 0, nonce12).subarray(0, 32);
    var want = st.poly1305(otk, st.poly1305MacData(aad || new Uint8Array(0), ct));
    var diff = 0;
    for (var i = 0; i < 16; i++) diff |= tag[i] ^ want[i];
    if (diff !== 0) return null;
    return st.chacha20Xor(key32, 1, nonce12, ct);
  }
  function parseSecretKey(raw) {
    var text = raw;
    if (raw && typeof raw === 'object' && typeof raw.secretKey === 'string') text = raw.secretKey;
    var clean = String(text || '').trim();
    if (clean.indexOf(SK_PREFIX) !== 0) return null;
    var bytes = st.fromBase64Url(clean.slice(SK_PREFIX.length));
    if (!bytes || bytes.length !== 32 || st.isAllZero(bytes)) return null;
    var pub = st.x25519Public(bytes);
    return { secretKey: SK_PREFIX + st.toBase64Url(bytes), bytes: bytes, publicBytes: pub, publicKey: st.PK_PREFIX + st.toBase64Url(pub), fingerprint: st.fingerprintOf(pub) };
  }
  function generateKeyPair(label) {
    var sk = st.randomBytes(32);
    sk[0] &= 248; sk[31] &= 127; sk[31] |= 64;
    var pk = st.x25519Public(sk);
    return {
      kind: 'alloflow-packet-qr-key',
      version: 1,
      label: String(label || '').trim().slice(0, 80),
      createdAt: new Date().toISOString(),
      fingerprint: st.fingerprintOf(pk),
      publicKey: st.PK_PREFIX + st.toBase64Url(pk),
      secretKey: SK_PREFIX + st.toBase64Url(sk),
    };
  }
  function expandResult(p) {
    if (!p || typeof p !== 'object' || p.v !== 1) return null;
    var mode = p.m === 'check' ? 'check' : 'practice';
    var sum = Array.isArray(p.sum) ? p.sum : [0, 0, 0, 0, 0, 0];
    var rawItems = Array.isArray(p.it) ? p.it : [];
    var items = rawItems.map(function (row, idx) {
      var r = Array.isArray(row) ? row : [];
      var item = {
        n: Number(r[0]) || (idx + 1),
        itemId: String(r[1] || 'item') + '-' + idx,
        activity: String(r[1] || ''),
        word: String(r[2] || ''),
        target: r[3] != null && r[3] !== '' ? String(r[3]) : null,
        responses: Array.isArray(r[4]) ? r[4].map(String) : [],
        attempts: Number(r[5]) || 0,
        firstTry: !!r[6],
        correct: !!r[7],
        done: true,
        ms: Number(r[8]) || 0,
        supports: {},
        practice: r[12] || null,
        flag: String(r[9] || ''),
      };
      if (r[10] != null) item.digitsCorrect = Number(r[10]);
      if (r[11] != null) item.digitsPossible = Number(r[11]);
      return item;
    });
    if (p.tr && sum[2] > 0) {
      var firstPresent = items.filter(function (it) { return !it.practice && it.firstTry; }).length;
      var padCount = Math.max(0, Number(sum[2]) - firstPresent);
      var actId = (items[0] && items[0].activity) || (p.at && Object.keys(p.at)[0]) || (mode === 'check' ? 'math_computation' : 'practice');
      for (var k = 0; k < padCount; k++) {
        items.push({ n: items.length + 1, itemId: 'qr-ok-' + k, activity: actId, word: '(right on first try)', target: null, responses: [], attempts: 1, firstTry: true, correct: true, done: true, ms: 0, supports: {}, practice: null, flag: '' });
      }
    }
    if (p.sup && typeof p.sup === 'object' && items.length) items[0].supports = Object.assign({}, p.sup);
    var activeMs = Math.max(0, Number(p.a) || 0) * 1000;
    var out = {
      kind: 'alloflow-take-home-result',
      schemaVersion: 3,
      player: 'alloflow-word-sounds-take-home/2',
      sessionId: String(p.sid || ''),
      packet: { id: String(p.pid || ''), version: String(p.rev || ''), engine: 'alloflow-packet/1', form: String(p.f || ''), mode: mode },
      lessonId: String(p.pid || ''),
      revision: String(p.rev || ''),
      lessonTitle: String(p.t || ''),
      activityTitles: (p.at && typeof p.at === 'object') ? p.at : {},
      learner: String(p.l || ''),
      learnerName: String(p.l || ''),
      startedAt: String(p.s || ''),
      finishedAt: String(p.e || ''),
      startedLocal: String(p.s || ''),
      finishedLocal: String(p.e || ''),
      durationMs: activeMs,
      activeMs: activeMs,
      timesAreFromTheLearnerDevice: true,
      items: items,
      summary: { items: Number(sum[0]) || 0, done: Number(sum[1]) || 0, firstTry: Number(sum[2]) || 0, afterRetry: Number(sum[3]) || 0, missed: Number(sum[4]) || 0, practised: Number(sum[5]) || 0 },
      qrTruncated: !!p.tr,
      qrSupports: (p.sup && typeof p.sup === 'object') ? p.sup : {},
    };
    if (mode === 'check' && p.sc && typeof p.sc === 'object') {
      var sc = p.sc;
      out.score = {
        measure: sc.m || '', score: sc.s != null ? sc.s : null, scoreUnit: sc.u || '',
        digitsCorrect: sc.dc != null ? sc.dc : null, digitsPossible: sc.dp != null ? sc.dp : null,
        itemsCorrect: Number(sc.ic) || 0, itemsAttempted: Number(sc.ia) || 0,
        timeLimitS: sc.tl != null ? sc.tl : null, elapsedS: Number(sc.el) || 0,
        hiddenS: Number(sc.hd) || 0, pausedS: Number(sc.ps) || 0, pauses: Number(sc.pn) || 0,
        directionsHeard: Number(sc.dh) || 0, completion: sc.cm || '', prorated: !!sc.pr,
        noScoreReason: sc.nr || '', scoringVersion: sc.sv || 3, formVersion: sc.fv || 2,
        attempt: Number(sc.at) || 1, flags: Array.isArray(sc.fl) ? sc.fl : [], tools: Array.isArray(sc.tl2) ? sc.tl2 : [],
      };
      if (sc.un) { out.score.untimed = true; out.score.usualTimeLimitS = sc.ut != null ? sc.ut : null; }
    }
    return out;
  }
  function unsealResult(qrCodeStr, secretKeyStr) {
    var sk = parseSecretKey(secretKeyStr);
    if (!sk) return { ok: false, reason: 'invalid_key' };
    var clean = String(qrCodeStr || '').trim().toUpperCase().replace(/\s+/g, '');
    if (clean.indexOf(st.QR_PREFIX) !== 0) return { ok: false, reason: 'format' };
    var body = clean.slice(st.QR_PREFIX.length);
    var wire = fromBase32(body);
    if (!wire) return { ok: false, reason: /^[A-Z2-7]{108,}$/.test(body.replace(/[=-]+/g, '')) ? 'tampered' : 'format' };
    if (wire.length < 1 + 4 + 32 + 12 + 16 + 2) return { ok: false, reason: 'format' };
    if (wire[0] !== 1) return { ok: false, reason: 'version' };
    var targetFp = st.toHex(wire.subarray(1, 5));
    if (targetFp !== sk.fingerprint) return { ok: false, reason: 'wrong_key', expectedFingerprint: targetFp };
    var ephPk = wire.subarray(5, 37);
    var nonce = wire.subarray(37, 49);
    var ctTag = wire.subarray(49);
    if (st.isAllZero(ephPk)) return { ok: false, reason: 'tampered' };
    var shared = st.x25519(sk.bytes, ephPk);
    if (st.isAllZero(shared)) return { ok: false, reason: 'tampered' };
    var salt = st.concatBytes([ephPk, sk.publicBytes, nonce]);
    var aeadKey = st.hkdfSha256(shared, salt, st.utf8Encode(st.HKDF_INFO), 32);
    var aad = st.utf8Encode('AFQR1|' + sk.fingerprint);
    var pt = aeadUnseal(aeadKey, nonce, ctTag, aad);
    if (!pt) return { ok: false, reason: 'tampered' };
    var parsed;
    try {
      parsed = JSON.parse(utf8Decode(pt), function (k, v) { return k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v; });
    } catch (_) { return { ok: false, reason: 'tampered' }; }
    var result = expandResult(parsed);
    if (!result) return { ok: false, reason: 'format' };
    return { ok: true, result: result, compact: parsed, fingerprint: sk.fingerprint, truncated: !!parsed.tr };
  }
  function studentEmbedSource() {
    return '(' + buildStudentQrRuntime.toString().replace(/^[ \t]*\/\/[^\n]*\n/gm, '').replace(/\n +/g, '\n') + ')(window)';
  }

  var api = {
    PK_PREFIX: st.PK_PREFIX,
    SK_PREFIX: SK_PREFIX,
    QR_PREFIX: st.QR_PREFIX,
    MAX_QR_PLAINTEXT: st.MAX_QR_PLAINTEXT,
    sha256: st.sha256,
    hmacSha256: st.hmacSha256,
    hkdfSha256: st.hkdfSha256,
    x25519: st.x25519,
    x25519Public: st.x25519Public,
    aeadSeal: st.aeadSeal,
    aeadUnseal: aeadUnseal,
    toBase32: st.toBase32,
    fromBase32: fromBase32,
    toBase64Url: st.toBase64Url,
    fromBase64Url: st.fromBase64Url,
    generateKeyPair: generateKeyPair,
    parsePublicKey: st.parsePublicKey,
    parseSecretKey: parseSecretKey,
    compactResult: st.compactResult,
    expandResult: expandResult,
    sealResult: st.sealResult,
    unsealResult: unsealResult,
    qrMatrix: st.qrMatrix,
    qrPngDataUrl: st.qrPngDataUrl,
    qrImgEl: st.qrImgEl,
    studentEmbedSource: studentEmbedSource,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AlloPacketQrCrypto = api;
})(typeof window !== 'undefined' ? window : globalThis);
