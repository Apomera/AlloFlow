// A .zip file of several files, made in this browser tab (packets-make.html, "Make one for each student").
// One plain script for a browser page (window.AlloPacketZip) and for node (module.exports). No imports, no network.
// STORE only (no compression), as the .allopack writer of video_studio_module.js (vsBuildZip), with the same CRC-32
// (IEEE, reflected) and fixed 1980-01-01 times, so the same files always give the same .zip. Names are UTF-8
// (general purpose bit 11), so a code name in another alphabet keeps its letters.
//
//   var zip = AlloPacketZip.create();
//   zip.add('Practice__BlueHeron7.html', bytes);     // bytes: a Uint8Array (or a string, written as UTF-8)
//   var parts = zip.finish();                        // an array of Uint8Array: new Blob(parts, { type: 'application/zip' })
//   zip.bytes                                        // the size of the .zip so far
// Limits: at most 65,535 files and 4 GB in all (no ZIP64). add() throws past them.
(function (root) {
  'use strict';

  var TABLE = (function () {
    var t = [];
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    var b = toBytes(bytes);
    var c = -1;
    for (var i = 0; i < b.length; i++) c = (c >>> 8) ^ TABLE[(c ^ b[i]) & 0xFF];
    return (c ^ -1) >>> 0;
  }
  function utf8(text) {
    var str = String(text);
    if (typeof TextEncoder === 'function') return new TextEncoder().encode(str);
    var safe = '';
    for (var si = 0; si < str.length; si++) {
      var code = str.charCodeAt(si);
      if (code >= 0xD800 && code <= 0xDBFF) {
        var next = si + 1 < str.length ? str.charCodeAt(si + 1) : 0;
        if (next >= 0xDC00 && next <= 0xDFFF) { safe += str.charAt(si) + str.charAt(si + 1); si++; }
        else safe += '\uFFFD';
      } else if (code >= 0xDC00 && code <= 0xDFFF) {
        safe += '\uFFFD';
      } else {
        safe += str.charAt(si);
      }
    }
    var plain = unescape(encodeURIComponent(safe)), out = new Uint8Array(plain.length);
    for (var i = 0; i < plain.length; i++) out[i] = plain.charCodeAt(i);
    return out;
  }
  var u16 = function (v) { return [v & 255, (v >>> 8) & 255]; };
  var u32 = function (v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; };
  var UTF8_NAMES = 0x0800, DOS_DATE = 0x21; // 1980-01-01, 00:00

  var WIN_RESERVED = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
  function toBytes(data) {
    if (data instanceof Uint8Array) return data;
    if (typeof ArrayBuffer === 'function' && ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    if (typeof ArrayBuffer === 'function' && data instanceof ArrayBuffer) return new Uint8Array(data);
    if (Array.isArray(data)) return new Uint8Array(data);
    return new Uint8Array(0);
  }

  function uniqueName(raw, seen) {
    var clean = String(raw || 'file').replace(/[\x00-\x1f\x7f]/g, '').replace(/[\\]/g, '/').replace(/^\/+/, '');
    var parts = clean.split('/').map(function (seg) {
      var s = seg.replace(/[:*?"<>|]/g, '-').trim().replace(/[. ]+$/, '');
      if (!s || s === '.' || s === '..') return '';
      var dot = s.indexOf('.');
      var head = dot >= 0 ? s.slice(0, dot) : s;
      if (WIN_RESERVED.test(head)) s = '_' + s;
      return s;
    }).filter(Boolean);
    var basePath = parts.join('/') || 'file';
    var key = basePath.toLowerCase();
    if (!seen[key]) return { name: basePath, key: key };
    var slash = basePath.lastIndexOf('/');
    var dir = slash >= 0 ? basePath.slice(0, slash + 1) : '';
    var file = slash >= 0 ? basePath.slice(slash + 1) : basePath;
    var dot = file.lastIndexOf('.');
    var stem = dot > 0 ? file.slice(0, dot) : file;
    var ext = dot > 0 ? file.slice(dot) : '';
    var n = 2;
    while (seen[(dir + stem + '-' + n + ext).toLowerCase()]) n++;
    var next = dir + stem + '-' + n + ext;
    return { name: next, key: next.toLowerCase() };
  }

  function create() {
    var parts = [], central = [], offset = 0, centralBytes = 0, done = false, seen = Object.create(null);
    var zip = {
      bytes: 0,
      count: 0,
      add: function (name, data) {
        if (done) throw new Error('The zip file is already finished.');
        var cand = uniqueName(name || ('file' + central.length), seen);
        var nameBytes = utf8(cand.name);
        if (nameBytes.length > 0xFFFF) throw new Error('File name is too long for a zip file.');
        var body = typeof data === 'string' ? utf8(data) : toBytes(data);
        var nextOffset = offset + 30 + nameBytes.length + body.length;
        var nextCentral = centralBytes + 46 + nameBytes.length;
        if (central.length >= 65535 || nextOffset > 0xFFFFFFFF || nextCentral > 0xFFFFFFFF || nextOffset + nextCentral + 22 > 0xFFFFFFFF) throw new Error('Too many files for one zip file.');
        seen[cand.key] = true;
        var crc = crc32(body);
        var head = new Uint8Array([].concat(u32(0x04034b50), u16(20), u16(UTF8_NAMES), u16(0), u16(0), u16(DOS_DATE), u32(crc), u32(body.length), u32(body.length), u16(nameBytes.length), u16(0)));
        parts.push(head, nameBytes, body);
        central.push({ name: nameBytes, crc: crc, size: body.length, offset: offset });
        offset = nextOffset;
        centralBytes = nextCentral;
        zip.bytes = offset;
        zip.count = central.length;
        return crc;
      },
      finish: function () {
        if (done) return parts;
        done = true;
        var start = offset, length = 0;
        central.forEach(function (e) {
          var row = new Uint8Array([].concat(u32(0x02014b50), u16(20), u16(20), u16(UTF8_NAMES), u16(0), u16(0), u16(DOS_DATE), u32(e.crc), u32(e.size), u32(e.size), u16(e.name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(e.offset)));
          parts.push(row, e.name);
          length += row.length + e.name.length;
        });
        parts.push(new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(central.length), u16(central.length), u32(length), u32(start), u16(0))));
        zip.bytes = start + length + 22;
        return parts;
      },
    };
    return zip;
  }

  // The files back out of a .zip this writer made (store only), for tests and checks: [{ name, bytes, crcOk }].
  function readZip(bytes) {
    var b = toBytes(bytes);
    if (b.length < 22) return [];
    var r16 = function (p) { return b[p] | (b[p + 1] << 8); };
    var r32 = function (p) { return (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16) | (b[p + 3] << 24)) >>> 0; };
    var end = -1;
    var minEocd = Math.max(0, b.length - 65557);
    for (var p = b.length - 22; p >= minEocd; p--) if (r32(p) === 0x06054b50 && p + 22 + r16(p + 20) === b.length) { end = p; break; }
    if (end < 0) return [];
    if (r16(end + 4) !== 0 || r16(end + 6) !== 0) return [];
    var n = r16(end + 10), cdSize = r32(end + 12), cdStart = r32(end + 16), at = cdStart, out = [];
    if (r16(end + 8) !== n || cdStart > end || cdStart + cdSize > end) return [];
    var totalBytes = 0, maxTotalBytes = b.length * 2;
    var td = typeof TextDecoder === 'function' ? new TextDecoder('utf-8') : null;
    var decode = td ? function (x) { return td.decode(x); } : function (x) {
      var s = '';
      for (var ci = 0; ci < x.length; ci++) s += String.fromCharCode(x[ci]);
      try { return decodeURIComponent(escape(s)); } catch (_) { return s; }
    };
    var isSafeEntryName = function (name) {
      if (!name || /[\x00-\x1f\x7f\\:]/.test(name) || name.charAt(0) === '/' || name.charAt(name.length - 1) === '/') return false;
      var parts = name.split('/');
      for (var k = 0; k < parts.length; k++) if (!parts[k] || parts[k] === '.' || parts[k] === '..') return false;
      return true;
    };
    for (var i = 0; i < n; i++) {
      if (at + 46 > cdStart + cdSize || r32(at) !== 0x02014b50) break;
      var method = r16(at + 10);
      if (method !== 0) break;
      var size = r32(at + 20), uncompSize = r32(at + 24), nameLength = r16(at + 28), extra = r16(at + 30), note = r16(at + 32), local = r32(at + 42), crc = r32(at + 16);
      if (uncompSize !== size) break;
      var nextAt = at + 46 + nameLength + extra + note;
      if (nextAt > cdStart + cdSize || local + 30 > cdStart || r32(local) !== 0x04034b50) break;
      if (r16(local + 8) !== 0) break;
      var localFlags = r16(local + 6);
      if ((localFlags & 0x0008) === 0 && (r32(local + 18) !== size || r32(local + 22) !== size)) break;
      var name = decode(b.subarray(at + 46, at + 46 + nameLength));
      var from = local + 30 + r16(local + 26) + r16(local + 28);
      if (from > cdStart || from + size > cdStart || totalBytes + size > maxTotalBytes) break;
      totalBytes += size;
      var data = b.subarray(from, from + size);
      if (isSafeEntryName(name)) out.push({ name: name, bytes: data, crcOk: crc32(data) === crc });
      at = nextAt;
    }
    return out;
  }

  var api = { create: create, crc32: crc32, readZip: readZip };
  if (root && (typeof root === 'object' || typeof root === 'function')) root.AlloPacketZip = api;
  if (typeof module === 'object' && module && module.exports) module.exports = api;
})((typeof window === 'object' && window !== null) ? window
  : ((typeof globalThis === 'object' && globalThis !== null) ? globalThis
    : ((typeof self === 'object' && self !== null) ? self : null)));
