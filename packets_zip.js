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
    var c = -1;
    for (var i = 0; i < bytes.length; i++) c = (c >>> 8) ^ TABLE[(c ^ bytes[i]) & 0xFF];
    return (c ^ -1) >>> 0;
  }
  function utf8(text) {
    if (typeof TextEncoder === 'function') return new TextEncoder().encode(String(text));
    var plain = unescape(encodeURIComponent(String(text))), out = new Uint8Array(plain.length);
    for (var i = 0; i < plain.length; i++) out[i] = plain.charCodeAt(i);
    return out;
  }
  var u16 = function (v) { return [v & 255, (v >>> 8) & 255]; };
  var u32 = function (v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; };
  var UTF8_NAMES = 0x0800, DOS_DATE = 0x21; // 1980-01-01, 00:00

  function create() {
    var parts = [], central = [], offset = 0, done = false;
    var zip = {
      bytes: 0,
      count: 0,
      add: function (name, data) {
        if (done) throw new Error('The zip file is already finished.');
        var nameBytes = utf8(String(name || ('file' + central.length)).replace(/[\\]/g, '/').replace(/^\/+/, ''));
        var body = typeof data === 'string' ? utf8(data) : data instanceof Uint8Array ? data : new Uint8Array(data || 0);
        if (central.length >= 65535 || offset + 30 + nameBytes.length + body.length > 0xFFFFFFFF) throw new Error('Too many files for one zip file.');
        var crc = crc32(body);
        var head = new Uint8Array([].concat(u32(0x04034b50), u16(20), u16(UTF8_NAMES), u16(0), u16(0), u16(DOS_DATE), u32(crc), u32(body.length), u32(body.length), u16(nameBytes.length), u16(0)));
        parts.push(head, nameBytes, body);
        central.push({ name: nameBytes, crc: crc, size: body.length, offset: offset });
        offset += head.length + nameBytes.length + body.length;
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
    var b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    var r16 = function (p) { return b[p] | (b[p + 1] << 8); };
    var r32 = function (p) { return (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16) | (b[p + 3] << 24)) >>> 0; };
    var end = -1;
    for (var p = b.length - 22; p >= 0; p--) if (r32(p) === 0x06054b50) { end = p; break; }
    if (end < 0) return [];
    var n = r16(end + 10), at = r32(end + 16), out = [];
    var decode = typeof TextDecoder === 'function' ? function (x) { return new TextDecoder('utf-8').decode(x); } : function (x) { return String.fromCharCode.apply(null, x); };
    for (var i = 0; i < n; i++) {
      if (r32(at) !== 0x02014b50) break;
      var size = r32(at + 20), nameLength = r16(at + 28), extra = r16(at + 30), note = r16(at + 32), local = r32(at + 42), crc = r32(at + 16);
      var name = decode(b.subarray(at + 46, at + 46 + nameLength));
      var from = local + 30 + r16(local + 26) + r16(local + 28);
      var data = b.subarray(from, from + size);
      out.push({ name: name, bytes: data, crcOk: crc32(data) === crc });
      at += 46 + nameLength + extra + note;
    }
    return out;
  }

  var api = { create: create, crc32: crc32, readZip: readZip };
  root.AlloPacketZip = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
