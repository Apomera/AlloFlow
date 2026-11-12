// The checks behind "Look inside a file" (packets-verify.html).
// One plain script for a browser page (window.AlloPacketVerify) and for node (module.exports). No imports.
// It never touches a page: it is given the bytes or the text of one file and gives back a plain report object.
//
// A file is treated as TEXT only. Nothing in it is run, and nothing in it is turned into page elements:
// the file is walked with a small hand-written reader and with regular expressions.
//
// The report says what the file DECLARES (its policy line, its manifest block) and what its code CONTAINS
// (a scan with line numbers). It cannot prove that code is free of mistakes, and a scan cannot follow code
// that hides what it does. Matching hashes show that a file agrees with itself, not who made it.
(function (root) {
  'use strict';

  var MAX_BYTES = 60 * 1024 * 1024;
  var MAX_TAGS = 4000;        // a packet has about twenty tags
  var MAX_LISTED = 40;        // places listed for one kind of finding; every place is counted
  var MAX_KEPT = 2000;        // places kept for one rule of the scan; the rest are only counted
  var MANIFEST_ID = 'packet-manifest';
  var MANIFEST_KIND = 'alloflow-packet-manifest';
  var MAILBOX_HOST = 'script.google.com';
  var MAILBOX_SOURCES = ['https://script.google.com', 'https://script.googleusercontent.com'];
  var EXPECTED = 'expected in this kind of file', UNEXPECTED = 'not expected', LOOK = 'needs a person to look';
  var AGREE = 'agree', DIFFERS = 'differs', CANNOT = 'cannot tell';
  var LIMITS = "This page reads the file's text in your browser. It does not run the file and does not upload it. It reports what the file declares and what its code contains. "
    + 'It cannot prove that software is free of mistakes; the file is one readable script, and your IT staff can read it.';
  var HASH_LIMIT = 'Matching hashes show that the file agrees with itself. They do not show who made it: a person who changes a file on purpose can change its hashes too.';
  var HEADLINE = {
    closed: 'This file declares that it cannot connect to the internet, and nothing in its code says otherwise.',
    mailbox: function (host) { return 'This file can send results to one place: ' + host + '. Nothing else in its code connects anywhere.'; },
    look: function (n) { return 'This file needs a person to look: ' + (n === 1 ? '1 thing was' : n + ' things were') + ' not expected.'; },
  };

  // ---------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------
  var has = function (object, key) { return Object.prototype.hasOwnProperty.call(object, key); };
  var isObject = function (value) { return !!value && typeof value === 'object' && !Array.isArray(value); };
  // Anything from a file that is shown is first made a short plain string.
  function show(value, max) {
    var text = typeof value === 'string' ? value : typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';
    var limit = max || 300;
    return text.length > limit ? text.slice(0, limit) + '...' : text;
  }
  function sizeText(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (Math.round(bytes / 1024 / 1024 * 10) / 10) + ' MB';
  }
  function count(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  function oneLineEnd(text) { return text.replace(/\r\n?/g, '\n'); }
  function listText(items) { return items.length < 2 ? items.join('') : items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1]; }

  // ---------------------------------------------------------------------------
  // Bytes, text and SHA-256
  // ---------------------------------------------------------------------------
  var Encoder = root.TextEncoder || (typeof TextEncoder !== 'undefined' ? TextEncoder : null);
  var Decoder = root.TextDecoder || (typeof TextDecoder !== 'undefined' ? TextDecoder : null);
  function bytesOf(text) { return new Encoder().encode(text); }
  function textOf(bytes) { return new Decoder('utf-8').decode(bytes); }

  var SHA_K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  // SHA-256 of bytes (a Uint8Array), worked out here so that the page needs nothing from anywhere else.
  // The bytes are read in place, 64 at a time: a large file is not copied.
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
    var tailView = new DataView(tail.buffer);
    tailView.setUint32(tail.length - 8, Math.floor(n / 536870912), false);
    tailView.setUint32(tail.length - 4, (n << 3) >>> 0, false);
    for (at = 0; at < tail.length; at += 64) block(tailView, at);
    var out = new Uint8Array(32), outView = new DataView(out.buffer);
    for (i = 0; i < 8; i++) outView.setInt32(i * 4, H[i], false);
    var hex = '', base64 = '';
    for (i = 0; i < 32; i++) hex += (out[i] < 16 ? '0' : '') + out[i].toString(16);
    for (i = 0; i < 30; i += 3) base64 += B64[out[i] >> 2] + B64[((out[i] & 3) << 4) | (out[i + 1] >> 4)] + B64[((out[i + 1] & 15) << 2) | (out[i + 2] >> 6)] + B64[out[i + 2] & 63];
    base64 += B64[out[30] >> 2] + B64[((out[30] & 3) << 4) | (out[31] >> 4)] + B64[(out[31] & 15) << 2] + '=';
    return { hex: hex, base64: base64 };
  }
  function sha256OfText(text) { return sha256(bytesOf(text)); }
  // The hash a policy carries is written in base64. Its hex form, or '' when it is not base64.
  function hexOfBase64(text) {
    var clean = String(text).replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
    if (!clean || /[^A-Za-z0-9+\/]/.test(clean) || clean.length % 4 === 1) return '';
    var hex = '', bits = 0, held = 0;
    for (var i = 0; i < clean.length; i++) {
      held = (held << 6) | B64.indexOf(clean.charAt(i));
      bits += 6;
      if (bits >= 8) { bits -= 8; var byte = (held >> bits) & 255; hex += (byte < 16 ? '0' : '') + byte.toString(16); }
    }
    return hex;
  }

  // ---------------------------------------------------------------------------
  // Reading the markup as text
  // ---------------------------------------------------------------------------
  // Elements whose inside is plain text to a browser, up to their own closing tag.
  var RAW_TEXT = { script: 1, style: 1, title: 1, textarea: 1, xmp: 1, iframe: 1, noembed: 1, noframes: 1, noscript: 1 };
  function isSpace(code) { return code === 32 || code === 9 || code === 10 || code === 12 || code === 13; }
  function isLetter(code) { return (code >= 65 && code <= 90) || (code >= 97 && code <= 122); }

  // One tag, read the way a browser reads it: a name, then attributes whose values may be quoted.
  function readTag(text, lt, nameAt, closing) {
    var n = text.length, i = nameAt, code;
    while (i < n && !isSpace(code = text.charCodeAt(i)) && code !== 47 && code !== 62) i++;
    var tag = { name: text.slice(nameAt, i).toLowerCase(), closing: closing, at: lt, end: n, attrs: Object.create(null), whole: false, textFrom: -1, textTo: -1 };
    for (;;) {
      while (i < n && (isSpace(code = text.charCodeAt(i)) || code === 47)) i++;
      if (i >= n) return tag;
      if (code === 62) { tag.end = i + 1; tag.whole = true; return tag; }
      var from = i;
      i++;
      while (i < n && !isSpace(code = text.charCodeAt(i)) && code !== 47 && code !== 62 && code !== 61) i++;
      var key = text.slice(from, i).toLowerCase(), value = '';
      while (i < n && isSpace(text.charCodeAt(i))) i++;
      if (text.charCodeAt(i) === 61) {
        i++;
        while (i < n && isSpace(text.charCodeAt(i))) i++;
        code = text.charCodeAt(i);
        if (code === 34 || code === 39) {
          var quote = text.indexOf(text.charAt(i), i + 1);
          if (quote < 0) return tag;
          value = text.slice(i + 1, quote);
          i = quote + 1;
        } else if (code !== 62) {
          from = i;
          while (i < n && !isSpace(code = text.charCodeAt(i)) && code !== 62) i++;
          value = text.slice(from, i);
        }
      }
      // A browser keeps the first of two attributes with one name.
      if (!(key in tag.attrs)) tag.attrs[key] = value;
    }
  }
  // Every tag of the file, in order. The inside of a script, a style block and a title is kept as text.
  function readMarkup(text) {
    var tags = [], odd = [], n = text.length, i = 0;
    while (i < n) {
      var lt = text.indexOf('<', i);
      if (lt < 0) break;
      var code = text.charCodeAt(lt + 1);
      if (text.substr(lt, 4) === '<!--') {
        var end;
        if (text.charAt(lt + 4) === '>') end = lt + 5;
        else if (text.substr(lt + 4, 2) === '->') end = lt + 6;
        else {
          var plain = text.indexOf('-->', lt + 4), bang = text.indexOf('--!>', lt + 4);
          end = plain < 0 && bang < 0 ? n : bang < 0 || (plain >= 0 && plain < bang) ? plain + 3 : bang + 4;
          if (plain < 0 && bang < 0) odd.push({ what: 'a comment that never ends', at: lt });
        }
        i = end;
        continue;
      }
      if (code === 33 || code === 63) { var gt = text.indexOf('>', lt + 2); i = gt < 0 ? n : gt + 1; continue; }
      var closing = code === 47;
      var nameAt = lt + (closing ? 2 : 1);
      if (!isLetter(text.charCodeAt(nameAt))) {
        if (closing) { var close = text.indexOf('>', nameAt); i = close < 0 ? n : close + 1; } else i = lt + 1;
        continue;
      }
      var tag = readTag(text, lt, nameAt, closing);
      if (!tag.whole) { odd.push({ what: 'a tag that never ends', at: lt }); break; }
      tags.push(tag);
      if (tags.length >= MAX_TAGS) { odd.push({ what: 'more than ' + MAX_TAGS + ' tags', at: lt }); break; }
      i = tag.end;
      if (closing) continue;
      if (tag.name === 'plaintext') { odd.push({ what: 'a plaintext tag, which turns the rest of the file into text', at: lt }); break; }
      if (has(RAW_TEXT, tag.name)) {
        var ender = new RegExp('</' + tag.name + '(?=[\\t\\n\\f\\r />])', 'gi');
        ender.lastIndex = i;
        var found = ender.exec(text);
        tag.textFrom = i;
        tag.textTo = found ? found.index : n;
        if (!found) { odd.push({ what: 'a ' + tag.name + ' block that never ends', at: lt }); break; }
        i = found.index;
      }
    }
    return { tags: tags, odd: odd };
  }

  // The first character before `upTo` that is not in a tag, a comment or a title, and is not white space. -1 when there is none.
  // Such a character ends the head of a page: what follows it, a policy line too, belongs to the body.
  function strayText(text, tags, upTo) {
    var from = 0;
    for (var i = 0; i <= tags.length; i++) {
      var tag = i < tags.length ? tags[i] : null;
      var to = tag && tag.at < upTo ? tag.at : upTo;
      var gap = text.slice(from, to).replace(/<!--[\s\S]*?(?:--!?>|$)|<[!?][^>]*>/g, function (skipped) { return skipped.replace(/[^\n]/g, ' '); });
      var found = gap.search(/[^\t\n\f\r ]/);
      if (found >= 0) return from + found;
      if (!tag || tag.at >= upTo) return -1;
      from = tag.textTo >= 0 && tag.name === 'title' ? tag.textTo : tag.end;
    }
    return -1;
  }

  // ---------------------------------------------------------------------------
  // The policy line
  // ---------------------------------------------------------------------------
  function readPolicy(text) {
    var list = [], map = Object.create(null), twice = [];
    String(text).split(';').forEach(function (part) {
      var words = part.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '').split(/[\t\n\f\r ]+/);
      if (!words[0]) return;
      var name = words[0].toLowerCase();
      // A browser uses the first of two lines with one name and ignores the rest.
      if (name in map) { twice.push(name); return; }
      map[name] = words.slice(1);
      list.push({ name: name, sources: words.slice(1) });
    });
    return { list: list, map: map, twice: twice };
  }
  // The line a browser uses for one kind of loading: its own, or the next one it falls back to.
  function lineFor(policy, names) {
    for (var i = 0; i < names.length; i++) {
      if (names[i] in policy.map) return { name: names[i], sources: policy.map[names[i]], text: (names[i] + ' ' + policy.map[names[i]].join(' ')).replace(/\s+$/, '') };
    }
    return null;
  }
  // What a list of sources lets in: nothing, only what the file itself holds, or other places.
  function reach(sources) {
    var out = { outside: [], inline: false, hashes: [], builds: false };
    sources.forEach(function (raw) {
      var source = raw.toLowerCase();
      if (source === "'none'") return;
      if (/^'sha(?:256|384|512)-[A-Za-z0-9+\/_-]+={0,2}'$/.test(raw)) { out.hashes.push(raw.slice(1, -1)); return; }
      if (source === "'unsafe-inline'") { out.inline = true; return; }
      if (source === "'unsafe-eval'" || source === "'wasm-unsafe-eval'") { out.builds = true; return; }
      if (source === "'unsafe-hashes'" || source === "'report-sample'") return;
      // What the file holds (data:) or makes while it runs (blob:).
      if (source === 'data:' || source === 'blob:') return;
      out.outside.push(show(raw, 120));
    });
    return out;
  }
  var LOADS = [
    { id: 'scripts', names: ['script-src-elem', 'script-src', 'default-src'], what: 'scripts' },
    { id: 'styles', names: ['style-src-elem', 'style-src', 'default-src'], what: 'style sheets' },
    { id: 'pictures', names: ['img-src', 'default-src'], what: 'pictures', inside: 'pictures stored inside the file' },
    { id: 'sounds', names: ['media-src', 'default-src'], what: 'sound or video', inside: 'sounds stored inside the file' },
    { id: 'fonts', names: ['font-src', 'default-src'], what: 'fonts' },
    { id: 'frames', names: ['frame-src', 'child-src', 'default-src'], what: 'other pages (frames)' },
    { id: 'plugins', names: ['object-src', 'default-src'], what: 'plug-ins' },
    { id: 'workers', names: ['worker-src', 'child-src', 'script-src', 'default-src'], what: 'background scripts' },
  ];
  // Plain statements worked out from the policy. `policy` is null when the file has no policy line.
  function policyFacts(policy) {
    var facts = [];
    var fact = function (id, question, answer, basis, open, more) {
      var row = { id: id, question: question, answer: answer, basis: basis || '', open: !!open };
      Object.keys(more || {}).forEach(function (key) { row[key] = more[key]; });
      facts.push(row);
      return row;
    };
    var connect = policy ? lineFor(policy, ['connect-src', 'default-src']) : null;
    var connectReach = connect ? reach(connect.sources) : null;
    var question = 'Can the file connect to anything?';
    if (!policy) fact('connect', question, 'Yes. The file has no policy line, so nothing stops its code from connecting to any address.', '', true, { hosts: ['any address'] });
    else if (!connect) fact('connect', question, 'Yes. The policy does not limit connections.', '', true, { hosts: ['any address'] });
    else if (!connectReach.outside.length) {
      fact('connect', question, connect.name === 'connect-src' ? 'No. The policy refuses every connection.' : 'No. The policy refuses everything it does not name, and it names no place to connect to.', connect.text, false, { hosts: [] });
    } else fact('connect', question, 'Only to: ' + connectReach.outside.join(', ') + '.', connect.text, true, { hosts: connectReach.outside });

    LOADS.forEach(function (load) {
      var q = 'Can it load ' + load.what + ' from somewhere else?';
      var line = policy ? lineFor(policy, load.names) : null;
      if (!policy) { fact(load.id, q, 'Yes. The file has no policy line.', '', true, { from: ['any address'] }); return; }
      if (!line) { fact(load.id, q, 'Yes. The policy does not limit this.', '', true, { from: ['any address'] }); return; }
      var r = reach(line.sources);
      if (r.outside.length) { fact(load.id, q, 'Yes: from ' + r.outside.join(', ') + '.', line.text, true, { from: r.outside }); return; }
      if (load.id === 'scripts') {
        if (r.hashes.length) fact(load.id, q, 'No. Only a script inside the file can run, and only while it matches the hash in the policy.', line.text, false, { from: [] });
        else if (r.inline) fact(load.id, q, 'No. But any script written inside the file can run: the policy does not pin the script by a hash.', line.text, false, { from: [] });
        else fact(load.id, q, 'No. The policy lets no script run.', line.text, false, { from: [] });
        return;
      }
      var some = line.sources.some(function (source) { return source.toLowerCase() !== "'none'"; });
      fact(load.id, q, some ? 'No. Only ' + (load.inside || 'what is inside the file') + '.' : 'No.', line.text, false, { from: [] });
    });

    var scripts = policy ? lineFor(policy, ['script-src-elem', 'script-src', 'default-src']) : null;
    var scriptReach = scripts ? reach(scripts.sources) : { outside: [], inline: false, hashes: [], builds: false };
    var pinned = !!scripts && scriptReach.hashes.length === 1 && !scriptReach.outside.length;
    fact('pinned', 'Is its script pinned by a hash?', pinned ? 'Yes. The browser runs the script only while it matches ' + scriptReach.hashes[0] + '.'
      : scriptReach.hashes.length > 1 ? 'The policy lists ' + scriptReach.hashes.length + ' hashes. A packet has one script and one hash.'
        : 'No. The policy carries no hash for the script.', scripts ? scripts.text : '', !pinned, { hashes: scriptReach.hashes, builds: scriptReach.builds });

    [['forms', 'form-action', 'Can it send a form to another address?', 'forms'], ['base', 'base-uri', 'Can it change where its own addresses point (a base address)?', 'base changes']].forEach(function (row) {
      var line = policy ? lineFor(policy, [row[1]]) : null;
      if (!line) { fact(row[0], row[2], 'The policy does not block ' + row[3] + '.', '', true); return; }
      var r = reach(line.sources);
      if (r.outside.length) fact(row[0], row[2], 'Yes: ' + r.outside.join(', ') + '.', line.text, true);
      else fact(row[0], row[2], 'No. The policy blocks ' + row[3] + '.', line.text, false);
    });
    return facts;
  }

  // ---------------------------------------------------------------------------
  // The scan: constructs looked for in the whole text of the file
  // ---------------------------------------------------------------------------
  // why: one plain sentence. Each kind is "not expected" unless decide() says otherwise.
  var RULES = [
    { id: 'address', name: 'A web address', re: /\b(?:https?|wss?|ftp):\/\/[^\s"'`<>\\)\]},;]*/gi },
    { id: 'address', name: 'A web address', re: /(^|[^:\w\/.\\*])(\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?![a-z0-9-])[^\s"'`<>\\)\]},;]*)/gi, group: 2 },
    { id: 'fetch', name: 'fetch(', re: /\bfetch\s*\(/g },
    { id: 'xhr', name: 'XMLHttpRequest', re: /\bXMLHttpRequest\b/g, why: 'A way to send or fetch data over the network. Packet code never uses it.' },
    { id: 'websocket', name: 'WebSocket', re: /\bWebSocket\b/g, why: 'A way to keep a connection open to another computer. Packet code never uses it.' },
    { id: 'eventsource', name: 'EventSource', re: /\bEventSource\b/g, why: 'A way to keep a connection open to another computer. Packet code never uses it.' },
    { id: 'beacon', name: 'sendBeacon', re: /\bsendBeacon\b/g, why: 'A way to send data over the network. Packet code never uses it.' },
    { id: 'peer', name: 'RTCPeerConnection or WebTransport', re: /\bRTCPeerConnection\b|\bWebTransport\b/g, why: 'A way to connect to another computer. Packet code never uses it.' },
    { id: 'eval', name: 'eval(', re: /\beval\s*\(/g, why: 'Runs text as code, so the code that runs is not the code that can be read. Packet code never uses it.' },
    { id: 'new-function', name: 'new Function', re: /\bnew\s+Function\b/g, why: 'Builds code from text, so the code that runs is not the code that can be read. Packet code never uses it.' },
    { id: 'import', name: 'import(', re: /\bimport\s*\(/g, why: 'Loads more code from another file. A packet has one script and loads no other.' },
    { id: 'import-scripts', name: 'importScripts or a worker', re: /\bimportScripts\b|\bnew\s+(?:Shared)?Worker\b/g, why: 'Loads or starts more code. A packet has one script and loads no other.' },
    { id: 'location', name: 'A change of address (location)', re: /\blocation\s*(?:\.\s*\w+\s*)?=(?!=)|\blocation\s*\.\s*(?:assign|replace)\s*\(/g,
      why: 'Sends the page to another address, and could carry data in that address. A policy cannot stop this, so a packet holds no such code.' },
    { id: 'open', name: 'open(', re: /\bopen\s*\(/g, why: 'Can open another address in a new window or tab. A policy cannot stop this, so a packet holds no such call.' },
    { id: 'form', name: '<form', re: /<form\b/gi, why: 'A form can send what is typed to another address. A packet has no form.' },
    { id: 'iframe', name: '<iframe', re: /<i?frame\b/gi, why: 'Shows another page inside this one. A packet has none.' },
    { id: 'object', name: '<object', re: /<object\b/gi, why: 'Loads a plug-in or another file. A packet has none.' },
    { id: 'embed', name: '<embed', re: /<embed\b/gi, why: 'Loads a plug-in or another file. A packet has none.' },
    { id: 'link', name: '<link', re: /<link\b/gi, why: 'Loads a style sheet or another file. A packet keeps its styles inside itself.' },
    { id: 'base', name: '<base', re: /<base\b/gi, why: 'Changes where the addresses in the file point. A packet has none.' },
    { id: 'refresh', name: 'meta refresh', re: /http-equiv\s*=\s*["']?\s*refresh/gi, why: 'Sends the page to another address after a wait. A packet has none.' },
    { id: 'external', name: 'src or href that points to another address', re: /\b(?:src|href|action|formaction|srcset|poster|ping|data)\s*=\s*["']?\s*(?:[a-z][a-z0-9+.-]*:)?\/\/[^\s"'<>]*/gi,
      why: 'Loads from, or points to, another address. Everything a packet uses is inside the file.' },
    { id: 'script-address', name: 'javascript: address', re: /\bjavascript\s*:/gi, why: 'Code written as an address. A packet has none.' },
    { id: 'data-page', name: 'A page or a script held as a data: address', re: /\bdata:(?:text\/html|text\/javascript|application\/(?:x-)?javascript|application\/ecmascript)/gi,
      why: 'Markup or code held as an address. A packet holds only sounds and pictures this way.', cls: LOOK },
    { id: 'cookie', name: 'document.cookie', re: /\.\s*cookie\b/g, why: 'Reads or sets cookies. A packet uses none.' },
    { id: 'microphone', name: 'getUserMedia, SpeechRecognition or MediaRecorder', re: /\bgetUserMedia\b|\bSpeechRecognition\b|\bMediaRecorder\b/g, why: 'Asks for the microphone or the camera, or records. A packet never does.' },
    { id: 'speech', name: 'speechSynthesis', re: /\bspeechSynthesis\b/g, why: 'Uses the speech engine of the device. A packet plays only the recordings stored inside it.' },
    { id: 'service-worker', name: 'serviceWorker', re: /\bserviceWorker\b/g, why: 'Installs code that stays in the browser for a site. A packet has none.' },
    { id: 'other-storage', name: 'sessionStorage, indexedDB or caches', re: /\bsessionStorage\b|\bindexedDB\b|\bcaches\s*\./g, why: 'Another place to keep data in the browser. A packet keeps one item, in localStorage.' },
    { id: 'markup-from-text', name: 'innerHTML, document.write or srcdoc', re: /\binnerHTML\b|\bouterHTML\b|\binsertAdjacentHTML\b|\bdocument\s*\.\s*write(?:ln)?\b|\bsrcdoc\b/g,
      why: 'Builds page markup from text. Packet code builds every element one at a time and never does this.', cls: LOOK },
    { id: 'local-storage', name: 'localStorage', re: /\blocalStorage\b/g },
    { id: 'file-save', name: 'A file made on the device (Blob)', re: /\bcreateObjectURL\b|\bnew\s+(?:\w+\s*\.\s*)?Blob\b/g, cls: EXPECTED,
      why: 'Makes the results file on the device when the student presses a save button. It needs no connection.' },
    { id: 'clipboard', name: 'clipboard', re: /\bclipboard\b/g },
  ];
  // An address that names another place: a scheme or none, then two slashes and a host. The scan lists these (rule "external").
  var ELSEWHERE = /^\s*(?:[a-z][a-z0-9+.-]*:)?\/\/\S/i;
  function excerptAt(text, at, length) {
    var from = Math.max(0, at - 40), to = Math.min(text.length, at + Math.min(length, 120) + 40);
    var out = text.slice(from, to).replace(/[A-Za-z0-9+\/=]{48,}/g, function (run) { return run.slice(0, 12) + '...'; }).replace(/[\s\u0000-\u001f]+/g, ' ');
    return (from > 0 ? '...' : '') + out + (to < text.length ? '...' : '');
  }
  function hostOf(address) {
    var m = /^(?:[a-z][a-z0-9+.-]*:)?\/\/([^\/?#\s]*)/i.exec(address);
    if (!m) return '';
    return m[1].replace(/^[^@]*@/, '').replace(/:\d*$/, '').toLowerCase();
  }
  // Every place a rule matches. about = what is known of the file (see verifyPacket); it may be {}.
  function scanSource(text, about) {
    var a = about || {};
    var where = typeof a.where === 'function' ? a.where : function () { return 'the code'; };
    var found = [], seen = Object.create(null), fetches = 0, more = 0;
    var outside = [];
    RULES.forEach(function (rule) {
      rule.re.lastIndex = 0;
      var m, kept = 0;
      while ((m = rule.re.exec(text))) {
        var matched = rule.group ? m[rule.group] : m[0];
        var at = rule.group ? m.index + m[0].length - matched.length : m.index;
        if (!matched.length) { rule.re.lastIndex = m.index + 1; continue; }
        var key = rule.id + ':' + at;
        if (seen[key]) continue;
        // A file with thousands of one construct is counted to the end, but only the first are kept.
        if (++kept > MAX_KEPT) { more++; continue; }
        seen[key] = true;
        found.push({ id: rule.id, name: rule.name, at: at, length: matched.length, text: matched, cls: rule.cls || UNEXPECTED, why: rule.why || '', rule: rule });
        if (rule.id === 'external') outside.push([at, at + matched.length]);
      }
      rule.re.lastIndex = 0;
    });
    // An address inside a src= or href= is one finding, not two.
    found = found.filter(function (f) { return f.id !== 'address' || !outside.some(function (span) { return f.at >= span[0] && f.at < span[1]; }); });
    found.sort(function (x, y) { return x.at - y.at; });
    var listed = Object.create(null);
    found.forEach(function (f) {
      var place = where(f.at);
      f.where = place;
      if (f.id === 'address') {
        var host = hostOf(f.text);
        f.host = host;
        var mailboxHost = MAILBOX_SOURCES.some(function (source) { return hostOf(source) === host; });
        if (a.mailbox && mailboxHost && /^https:/i.test(f.text)) {
          f.cls = EXPECTED;
          f.why = place === 'the policy line' ? 'The policy names it as a place the class mailbox may connect to.'
            : place === 'the manifest block' ? 'The file\'s own description repeats its policy, which names the class mailbox.'
              : place === 'the data block' ? 'The class mailbox this file declares: results go to this address when the student presses Send.'
                : 'One of the two addresses a class mailbox uses.';
        } else if (host === 'www.w3.org') {
          f.cls = LOOK;
          f.why = 'This looks like the name of a file format, which is never fetched. Packet code does not normally hold one.';
        } else {
          f.why = 'A packet holds no web address' + (a.mailbox ? ' other than its class mailbox' : '') + '. It is in ' + place + '. '
            + (a.closed ? 'The policy stops code from connecting to it, but a link or a change of address could still open it.' : 'The policy does not refuse every connection, so a person should see what this address is for.');
        }
      } else if (f.id === 'fetch') {
        fetches++;
        if (a.mailbox && fetches === 1 && place === 'the code') { f.cls = EXPECTED; f.why = 'The class mailbox send. A file with a class mailbox has exactly one such call.'; }
        else if (a.mailbox) f.why = 'A file with a class mailbox has one call that sends. This is another.';
        else if (a.older && a.closed) {
          f.cls = LOOK;
          f.why = 'Older practice files carry the class mailbox code even when no mailbox is set. This file\'s policy refuses every connection, so the call cannot send anything. A file made again with the current maker does not carry this code.';
        } else f.why = 'This call sends or fetches data over the network. A file with no class mailbox has none.' + (a.closed ? ' The policy would refuse it.' : '');
      } else if (f.id === 'local-storage') {
        var call = /^localStorage\s*\.\s*\w+\s*\(\s*([^,)]*)/.exec(text.substr(f.at, 200));
        if (place === 'the manifest block') { f.cls = EXPECTED; f.why = 'The file\'s own description names where it keeps the student\'s place.'; }
        else if (place !== 'the code') { f.cls = LOOK; f.why = 'The word is in ' + place + ', not in the code.'; }
        else if (call && call[1].replace(/\s+/g, '') !== 'storageKey') { f.cls = LOOK; f.why = 'Uses the browser\'s storage under a name other than the one name a packet uses.'; }
        else { f.cls = EXPECTED; f.why = 'Keeps the student\'s place on this device, under the one name the file uses.'; }
      } else if (f.id === 'clipboard') {
        if (/^clipboard\s*\.\s*writeText\b/.test(text.substr(f.at, 40))) { f.cls = EXPECTED; f.why = 'Puts the results on the clipboard when the student presses the copy button. It needs no connection.'; }
        else { f.cls = LOOK; f.why = 'Uses the clipboard in a way other than writing the results to it.'; }
      } else if (f.id === 'eval' || f.id === 'new-function') {
        if (a.pinned && !a.builds) f.why += ' The policy would refuse it.';
      }
      listed[f.id] = (listed[f.id] || 0) + 1;
      f.listed = listed[f.id] <= MAX_LISTED;
      // Inside the data block only the match itself is shown: what sits beside it may be the key of a class mailbox.
      f.excerpt = !f.listed ? '' : place === 'the data block' ? show(f.text, 160) : excerptAt(text, f.at, f.length);
      delete f.rule;
      delete f.text;
      delete f.length;
    });
    found.more = more;
    return found;
  }
  // Line and character of each finding, in one pass over the text.
  function placeAll(text, findings) {
    var sorted = findings.filter(function (f) { return f.at >= 0; }).sort(function (x, y) { return x.at - y.at; });
    var line = 1, lineStart = 0, next = text.indexOf('\n');
    sorted.forEach(function (f) {
      while (next >= 0 && next < f.at) { line++; lineStart = next + 1; next = text.indexOf('\n', lineStart); }
      f.line = line;
      f.col = f.at - lineStart + 1;
    });
    findings.forEach(function (f) { if (f.at < 0) { f.line = 0; f.col = 0; } });
  }

  // ---------------------------------------------------------------------------
  // Files that are not read, and files that are not packets
  // ---------------------------------------------------------------------------
  function blank(bytes) {
    return { ok: false, refused: '', kind: 'not_packet', result: 'not_packet', headline: '', kindLine: '', why: '', bytes: bytes, sizeText: sizeText(bytes),
      fingerprint: { sha256: '', of: '' }, identity: null, manifest: { found: false, readable: false, error: '' }, policy: { found: false, count: 0, text: '', directives: [], facts: [] },
      script: { count: 0, sha256: '', base64: '', inPolicy: '', inManifest: '', verdict: CANNOT, note: '', codeSha256: '', lineEnds: 'LF' },
      data: null, mailbox: { declared: false, host: '', address: '' }, check: null, claims: [], findings: [],
      counts: { sounds: 0, pictures: 0, bytes: bytes, expected: 0, notExpected: 0, look: 0, places: 0 },
      plain: { about: [], reach: [], keeps: [], saves: [], look: [] }, look: [], lookMore: '', limits: LIMITS, hashLimit: HASH_LIMIT };
  }
  var REFUSALS = {
    too_big: function (bytes) { return 'This file is ' + sizeText(bytes) + '. A file larger than 60 MB is not read. A practice file is usually a few megabytes.'; },
    empty: function () { return 'This file is empty.'; },
    unreadable: function () { return 'The browser could not read this file.'; },
    no_decoder: function () { return 'This browser cannot turn the file into text, so the file was not read.'; },
  };
  function refusal(why, bytes) {
    var report = blank(Number(bytes) || 0);
    report.refused = has(REFUSALS, why) ? why : 'unreadable';
    report.result = 'refused';
    report.why = REFUSALS[report.refused](report.bytes);
    return report;
  }

  // ---------------------------------------------------------------------------
  // verifyPacket
  // ---------------------------------------------------------------------------
  // input: the text of a file (a string), or its bytes (a Uint8Array or an ArrayBuffer).
  // Given bytes, the file fingerprint is the SHA-256 of the file exactly as it is on disk.
  function verifyPacket(input) {
    if (!Encoder || !Decoder) return refusal('no_decoder', 0);
    var bytes, text;
    if (typeof input === 'string') {
      if (input.length > MAX_BYTES) return refusal('too_big', input.length);
      bytes = bytesOf(input);
      text = input;
    } else if (input && typeof input.byteLength === 'number') {
      if (input.byteLength > MAX_BYTES) return refusal('too_big', input.byteLength);
      bytes = input.buffer ? new Uint8Array(input.buffer, input.byteOffset || 0, input.byteLength) : new Uint8Array(input);
      text = null;
    } else return refusal('unreadable', 0);
    if (bytes.length > MAX_BYTES) return refusal('too_big', bytes.length);
    if (!bytes.length) return refusal('empty', 0);

    var report = blank(bytes.length);
    report.ok = true;
    report.fingerprint = { sha256: sha256(bytes).hex, of: typeof input === 'string' ? 'the text of the file' : 'the file as it is on disk' };
    var notPacket = function (why) { report.why = why; return report; };
    if ((bytes[0] === 0xFF && bytes[1] === 0xFE) || (bytes[0] === 0xFE && bytes[1] === 0xFF)) return notPacket('This is not an AlloFlow packet: the file is not UTF-8 text.');
    if (text === null) text = textOf(bytes);
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

    // What kind of file is it?
    var head = text.slice(0, 4000);
    if (/^\s*[{[]/.test(head) && text.indexOf('alloflow-take-home-result') >= 0) return notPacket('This looks like a results file, not a packet. The page named Add up results reads results files.');
    if (head.indexOf('alloflow-packet-result/1') >= 0 && head.indexOf('<') < 0) return notPacket('This looks like a results file, not a packet. The page named Add up results reads results files.');
    if (text.indexOf('<') < 0) return notPacket('This is not an AlloFlow packet: it is not a web page file.');
    var markup = readMarkup(text);
    var starts = markup.tags.filter(function (tag) { return !tag.closing; });
    var named = function (name) { return starts.filter(function (tag) { return tag.name === name; }); };
    var attr = function (tag, name) { return name in tag.attrs ? String(tag.attrs[name]) : ''; };
    var word = function (tag, name) { return attr(tag, name).replace(/^\s+|\s+$/g, '').toLowerCase(); };
    // A browser reads http-equiv as it is written, ignoring only the case of its letters: with a space before it, it is not a policy line.
    var equivOf = function (tag) { return attr(tag, 'http-equiv').toLowerCase(); };
    var metas = named('meta'), scripts = named('script');
    var policyTags = metas.filter(function (tag) { return equivOf(tag) === 'content-security-policy'; });
    var generator = metas.filter(function (tag) { return word(tag, 'name') === 'generator'; }).map(function (tag) { return attr(tag, 'content'); })[0] || '';
    var manifestTags = scripts.filter(function (tag) { return attr(tag, 'id') === MANIFEST_ID; });
    var JS_TYPE = /^(?:|module|(?:text|application)\/(?:x-)?(?:javascript|ecmascript)|text\/(?:jscript|livescript|javascript1\.[0-5]))$/;
    var runs = function (tag) { return JS_TYPE.test(word(tag, 'type')); };
    var inline = scripts.filter(function (tag) { return runs(tag) && !('src' in tag.attrs); });
    var scriptText = inline.length ? text.slice(inline[0].textFrom, inline[0].textTo) : '';

    var manifest = null;
    if (manifestTags.length) {
      report.manifest.found = true;
      try { manifest = JSON.parse(text.slice(manifestTags[0].textFrom, manifestTags[0].textTo)); } catch (error) { report.manifest.error = 'The manifest block is not readable JSON.'; }
      if (manifest !== null && !isObject(manifest)) { manifest = null; report.manifest.error = 'The manifest block does not hold a list of named facts.'; }
      if (manifest && manifest.kind !== MANIFEST_KIND) return notPacket('This is not an AlloFlow packet: it has a block named ' + MANIFEST_ID + ', but the block does not say it is a packet.');
      report.manifest.readable = !!manifest;
    }
    var older = !manifestTags.length && /^alloflow-[a-z-]+\/\d/.test(generator) && inline.length > 0 && scriptText.slice(0, 600).indexOf('alloflow-take-home-lesson/') >= 0;
    if (!manifestTags.length && !older) {
      return notPacket('This is not an AlloFlow packet: it has no manifest block (the part of a packet that says what the file is), and it is not an older AlloFlow practice file.');
    }
    report.kind = older ? 'older' : 'packet';
    var m = manifest || {};
    var findings = [];
    var add = function (id, name, cls, why, at, length) {
      findings.push({ id: id, name: name, cls: cls, why: why, at: at == null ? -1 : at, where: 'the file', excerpt: at == null || at < 0 ? '' : excerptAt(text, at, length || 0) });
    };

    // --- The policy line ---
    var policyTag = policyTags[0] || null;
    var policyText = policyTag ? attr(policyTag, 'content') : '';
    var policy = policyTag ? readPolicy(policyText) : null;
    var facts = policyFacts(policy);
    var factOf = function (id) { return facts.filter(function (row) { return row.id === id; })[0]; };
    report.policy = { found: !!policyTag, count: policyTags.length, text: show(policyText, 4000), directives: policy ? policy.list.map(function (row) { return { name: show(row.name, 60), sources: row.sources.map(function (s) { return show(s, 120); }) }; }) : [], facts: facts };
    var connect = factOf('connect'), pinFact = factOf('pinned');
    var closed = !connect.open;
    var policyMailbox = connect.open && connect.hosts.length > 0 && connect.hosts.indexOf(MAILBOX_SOURCES[0]) >= 0 && connect.hosts.every(function (host) { return MAILBOX_SOURCES.indexOf(host) >= 0; });
    var pinned = !pinFact.open;
    if (!policyTag) add('no-policy', 'No policy line', UNEXPECTED, 'The file has no Content-Security-Policy line, so nothing limits what its code can reach.');
    else {
      if (policyTags.length > 1) add('policy-twice', 'More than one policy line', LOOK, 'The file has ' + policyTags.length + ' policy lines. A packet has one. This report reads the first.', policyTags[1].at, policyTags[1].end - policyTags[1].at);
      if (/[^\x20-\x7E]|&/.test(policyText)) add('policy-code', 'An unusual character in the policy line', LOOK, 'The policy line holds a character that a browser may read differently from this page: the character &, or one outside the plain letters, digits and signs. A packet\'s policy has none.', policyTag.at, policyTag.end - policyTag.at);
      var before = starts.slice(0, starts.indexOf(policyTag)).filter(function (tag) { return ['html', 'head', 'meta', 'title'].indexOf(tag.name) < 0; });
      var headEnded = markup.tags.slice(0, markup.tags.indexOf(policyTag)).some(function (tag) { return tag.closing && tag.name === 'head'; });
      var stray = strayText(text, markup.tags, policyTag.at);
      if (stray >= 0 && !before.length && !headEnded) add('policy-late', 'The policy line comes late', UNEXPECTED, 'There is text before the policy line that is not inside a tag. A browser then takes the policy line to be part of the page body, where a policy is ignored.', stray, 12);
      if (before.length || headEnded) add('policy-late', 'The policy line comes late', UNEXPECTED, 'The policy line comes after ' + (before.length ? '<' + show(before[0].name, 30) + '>' : 'the end of the head') + '. A browser applies a policy only to what follows it, and only from the head of the file.', policyTag.at, policyTag.end - policyTag.at);
      if (policy.twice.length) add('policy-repeat', 'A line named twice in the policy', LOOK, 'The policy names ' + show(policy.twice[0], 40) + ' twice. A browser uses the first and ignores the rest.', policyTag.at, policyTag.end - policyTag.at);
      if (connect.open && !policyMailbox) add('policy-connect', 'The policy allows connections', UNEXPECTED, 'The policy lets the file connect to: ' + connect.hosts.join(', ') + '. A packet\'s policy refuses every connection, or names only a class mailbox.', policyTag.at, policyTag.end - policyTag.at);
      LOADS.forEach(function (load) {
        var row = factOf(load.id);
        if (row.open) add('policy-load', 'The policy allows ' + load.what + ' from elsewhere', UNEXPECTED, 'The policy lets the file load ' + load.what + ' from: ' + row.from.join(', ') + '. Everything a packet uses is inside the file.', policyTag.at, policyTag.end - policyTag.at);
      });
      if (pinFact.builds) add('policy-builds', 'The policy lets code be built from text', UNEXPECTED, 'The policy allows eval and new Function (\'unsafe-eval\'). A packet\'s policy does not.', policyTag.at, policyTag.end - policyTag.at);
      if (pinFact.hashes.length > 1) add('policy-hashes', 'More than one script hash', LOOK, 'The policy lists ' + pinFact.hashes.length + ' script hashes. A packet has one script and one hash.', policyTag.at, policyTag.end - policyTag.at);
      if (!older) {
        if (!pinned && pinFact.hashes.length < 2) add('policy-unpinned', 'The script is not pinned', UNEXPECTED, 'The policy carries no hash for the script, so any script written into the file can run.', policyTag.at, policyTag.end - policyTag.at);
        if (factOf('forms').open) add('policy-forms', 'The policy does not block forms', UNEXPECTED, 'A packet\'s policy blocks forms (form-action \'none\'). This one does not.', policyTag.at, policyTag.end - policyTag.at);
        if (factOf('base').open) add('policy-base', 'The policy does not block base changes', UNEXPECTED, 'A packet\'s policy blocks a base address (base-uri \'none\'). This one does not.', policyTag.at, policyTag.end - policyTag.at);
      }
    }

    // --- The markup around the script ---
    var charset = metas.filter(function (tag) { return 'charset' in tag.attrs; })[0];
    if (!charset || word(charset, 'charset') !== 'utf-8') add('charset', 'The file does not say it is UTF-8', LOOK, 'A packet says it is written in UTF-8, and this page reads it that way. This file ' + (charset ? 'names another character set' : 'does not say') + ', so a browser may read it differently.', charset ? charset.at : -1, charset ? charset.end - charset.at : 0);
    if (text.indexOf(String.fromCharCode(0xFFFD)) >= 0 || text.indexOf(String.fromCharCode(0)) >= 0) add('not-text', 'Bytes that are not text', LOOK, 'Some bytes in the file are not UTF-8 text, so this page may not read the file exactly as a browser would.');
    markup.odd.forEach(function (odd) { add('markup-odd', 'Markup this page cannot follow', LOOK, 'The file holds ' + odd.what + '. The rest of the file was read as text only.', odd.at, 20); });
    metas.forEach(function (tag) {
      var equiv = equivOf(tag);
      if (equiv && equiv !== 'content-security-policy' && equiv !== 'refresh') add('meta-other', 'An instruction to the browser (meta http-equiv)', LOOK, 'The file gives the browser the instruction "' + show(equiv, 40) + '". A packet gives only its policy.', tag.at, tag.end - tag.at);
    });
    var USUAL = { html: 1, head: 1, meta: 1, title: 1, style: 1, body: 1, main: 1, h1: 1, div: 1, p: 1, script: 1 };
    var BY_RULE = { form: 1, iframe: 1, frame: 1, object: 1, embed: 1, link: 1, base: 1 };
    var POINTS = ['src', 'href', 'action', 'formaction', 'srcdoc', 'srcset', 'poster', 'ping', 'data', 'background', 'manifest', 'xlink:href'];
    var strange = 0, handlers = 0, pointers = 0;
    starts.forEach(function (tag) {
      if (!has(USUAL, tag.name) && !has(BY_RULE, tag.name)) {
        strange++;
        if (strange <= MAX_LISTED) add('markup-element', 'An element a packet does not have', UNEXPECTED, 'The page markup holds <' + show(tag.name, 30) + '>. Outside its script, a packet has only a title, its styles and one short note.', tag.at, tag.end - tag.at);
      }
      Object.keys(tag.attrs).forEach(function (key) {
        if (/^on/.test(key)) {
          handlers++;
          if (handlers <= MAX_LISTED) add('markup-handler', 'Code in an attribute', UNEXPECTED, 'An element carries code in the attribute ' + show(key, 30) + '. A packet keeps all of its code in its one script.', tag.at, tag.end - tag.at);
        } else if (POINTS.indexOf(key) >= 0 && !ELSEWHERE.test(tag.attrs[key]) && !(tag.name === 'script' && key === 'src')) {
          pointers++;
          if (pointers <= MAX_LISTED) add('markup-points', 'An element that points to another file', LOOK, 'An element has the attribute ' + key + ', which points to another file or address. Everything a packet uses is inside the file.', tag.at, tag.end - tag.at);
        }
      });
    });

    // --- The script and its three hashes ---
    var outsideScripts = scripts.filter(function (tag) { return runs(tag) && 'src' in tag.attrs; });
    var dataBlocks = scripts.filter(function (tag) { return !runs(tag) && manifestTags.indexOf(tag) !== 0; });
    var written = (text.match(/<script\b/gi) || []).length;
    report.script.count = inline.length;
    outsideScripts.forEach(function (tag) {
      if (!ELSEWHERE.test(attr(tag, 'src'))) add('script-file', 'A script loaded from another file', UNEXPECTED, 'A script is loaded from ' + show(attr(tag, 'src'), 80) + '. A packet\'s one script is written inside the file.', tag.at, tag.end - tag.at);
    });
    if (!inline.length) add('script-none', 'No script', UNEXPECTED, 'The file has no script of its own to run. A packet has exactly one.');
    if (inline.length > 1) add('script-many', 'More than one script', UNEXPECTED, 'The file has ' + inline.length + ' scripts that can run. A packet has exactly one.', inline[1].at, inline[1].end - inline[1].at);
    dataBlocks.forEach(function (tag) { add('script-data', 'A second data block', LOOK, 'The file has a data block besides its manifest. A packet has none.', tag.at, tag.end - tag.at); });
    if (written !== scripts.length) add('script-written', 'The text <script where no script block is', LOOK, 'The text <script appears ' + count(written, 'time') + ', but the file has ' + count(scripts.length, 'script block') + '. The text is inside a comment, a string or the script itself.');
    if (scriptText.indexOf('<!--') >= 0) add('script-comment', 'A comment mark inside the script', LOOK, 'The script holds <!--, which can change where a browser thinks the script ends.', inline[0].textFrom + scriptText.indexOf('<!--'), 4);
    if (manifestTags.length && word(manifestTags[0], 'type') !== 'application/json') add('manifest-type', 'The manifest block can run as code', UNEXPECTED, 'The manifest block is not labeled as data (application/json), so a browser would try to run it.', manifestTags[0].at, manifestTags[0].end - manifestTags[0].at);
    if (manifestTags.length && !manifest) add('manifest-unreadable', 'The manifest block cannot be read', UNEXPECTED, report.manifest.error + ' So the file does not say what it stores, saves or connects to.', manifestTags[0].at, manifestTags[0].end - manifestTags[0].at);

    // The loader hashes the script with every line end made \n, because that is how a browser reads it.
    var normal = oneLineEnd(scriptText);
    var mine = inline.length ? sha256OfText(normal) : { hex: '', base64: '' };
    var inPolicy = pinFact.hashes.length === 1 && /^sha256-/.test(pinFact.hashes[0]) ? hexOfBase64(pinFact.hashes[0].slice(7)) : '';
    var inManifest = typeof m.scriptSha256 === 'string' ? m.scriptSha256.toLowerCase() : '';
    report.script.sha256 = mine.hex;
    report.script.base64 = mine.base64;
    report.script.inPolicy = inPolicy;
    report.script.inManifest = show(inManifest, 80);
    report.script.lineEnds = /\r/.test(scriptText) ? 'CRLF or CR (read as LF, as a browser does)' : 'LF';
    var hashAt = inline.length ? inline[0].at : -1;
    if (!inline.length) { report.script.verdict = CANNOT; report.script.note = 'There is no script to hash.'; }
    else if (older) {
      report.script.verdict = CANNOT;
      report.script.note = inPolicy ? (inPolicy === mine.hex ? 'The script matches the hash in the policy. An older file has no manifest to compare with.' : 'The script does not match the hash in the policy.')
        : 'An older file: its policy and its manifest carry no hash to compare with.';
      if (inPolicy && inPolicy !== mine.hex) { report.script.verdict = DIFFERS; add('hash', 'The script does not match its hash', UNEXPECTED, 'The script is not the one the policy names. A browser will refuse to run it.', hashAt, 8); }
    } else if (inPolicy && inManifest && inPolicy === mine.hex && inManifest === mine.hex) {
      report.script.verdict = AGREE;
      report.script.note = 'The script, the hash in the policy and the hash in the manifest are the same.';
    } else if (!inPolicy && !inManifest) {
      report.script.verdict = CANNOT;
      report.script.note = 'Neither the policy nor the manifest carries a hash to compare with.';
    } else {
      report.script.verdict = DIFFERS;
      var policyOff = !inPolicy || inPolicy !== mine.hex, manifestOff = !inManifest || inManifest !== mine.hex;
      report.script.note = !inPolicy ? 'The policy carries no hash for the script. ' + (manifestOff ? 'The script does not match the hash in the manifest.' : 'The script matches the hash in the manifest.')
        : policyOff && manifestOff ? 'The script matches neither the hash in the policy nor the hash in the manifest.'
          : policyOff ? 'The script matches the hash in the manifest, but not the one in the policy.' : 'The script matches the hash in the policy, but the manifest names another.';
      add('hash', 'The script does not match its hash', UNEXPECTED, report.script.note + (policyOff && inPolicy ? ' The script was changed after the file was made, or the file was not saved whole. A browser will refuse to run it.' : ''), hashAt, 8);
    }

    // --- The data block: the lesson, held as JSON at the top of the script ---
    var lesson = null, dataFrom = -1, dataTo = -1;
    var opened = /^\s*\(function\s*\(\)\s*\{\s*"use strict";\s*var lesson=/.exec(scriptText);
    if (opened) {
      var endOfData = /;(?:\r\n|\r|\n)var labels=/g;
      endOfData.lastIndex = opened[0].length;
      var closedAt = endOfData.exec(scriptText);
      if (closedAt) {
        try { lesson = JSON.parse(scriptText.slice(opened[0].length, closedAt.index)); } catch (error) { lesson = null; }
        if (!isObject(lesson)) lesson = null;
        if (lesson) { dataFrom = inline[0].textFrom + opened[0].length; dataTo = inline[0].textFrom + closedAt.index; }
      }
    }
    if (inline.length && !lesson) add('data-block', 'The data block is not where a packet keeps it', LOOK, 'A packet\'s script starts with its words, sounds and settings as one block of data. This page could not find that block, so some checks could not be made.', hashAt, 8);
    var L = lesson || {};
    var submit = isObject(L.submit) ? L.submit : null;
    var address = submit && typeof submit.url === 'string' ? submit.url : '';
    var dataMailbox = /^https:\/\/script\.google\.com\//.test(address);
    var items = [];
    (Array.isArray(L.blocks) ? L.blocks : []).forEach(function (block) { if (isObject(block) && Array.isArray(block.items)) block.items.forEach(function (item) { if (isObject(item)) items.push(item); }); });
    var lessonCheck = isObject(L.check) ? L.check : null;
    report.data = !lesson ? null : {
      id: show(L.lessonId, 120), version: show(L.revision, 120), title: show(L.title, 200), mode: L.mode === 'probe' ? 'check' : 'practice', form: show(L.form, 60),
      storageName: 'alloflow-take-home:' + show(L.lessonId, 120) + ':' + show(L.revision, 120), items: items.length,
      mailboxAddress: show(address, 300), teacherCode: !!(lessonCheck && isObject(lessonCheck.lock)),
      scrambled: L.mode === 'probe' ? items.length > 0 && items.every(function (item) { return typeof item.key === 'string' && !('answer' in item); }) : null,
      timeLimitS: Number(L.timeLimitS) > 0 ? Number(L.timeLimitS) : null,
    };
    if (lesson && inline.length) report.script.codeSha256 = sha256OfText(oneLineEnd(text.slice(inline[0].textFrom, dataFrom)) + oneLineEnd(text.slice(dataTo, inline[0].textTo))).hex;
    var mailbox = policyMailbox && dataMailbox;
    report.mailbox = { declared: policyMailbox, host: policyMailbox ? MAILBOX_HOST : '', address: dataMailbox ? show(address, 300) : '' };
    if (policyMailbox && !dataMailbox) add('mailbox-data', 'A mailbox in the policy, none in the data', LOOK, 'The policy lets the file connect to ' + MAILBOX_HOST + ', but the file\'s data holds no class mailbox address there.', policyTag.at, policyTag.end - policyTag.at);
    if (!policyMailbox && address) add('mailbox-policy', 'A mailbox in the data, none in the policy', LOOK, 'The file\'s data holds an address to send results to, but the policy does not name a class mailbox.', dataFrom, 12);

    // --- The scan ---
    var spans = [];
    if (policyTag) spans.push([policyTag.at, policyTag.end, 'the policy line']);
    if (manifestTags.length) spans.push([manifestTags[0].textFrom, manifestTags[0].textTo, 'the manifest block']);
    if (lesson) spans.push([dataFrom, dataTo, 'the data block']);
    inline.forEach(function (tag) { spans.push([tag.textFrom, tag.textTo, 'the code']); });
    named('style').forEach(function (tag) { spans.push([tag.textFrom, tag.textTo, 'the styles']); });
    var where = function (at) {
      for (var i = 0; i < spans.length; i++) if (at >= spans[i][0] && at < spans[i][1]) return spans[i][2];
      return 'the page markup';
    };
    var scanned = scanSource(text, { where: where, mailbox: mailbox, closed: closed, older: older, pinned: pinned, builds: pinFact.builds });
    var inCode = function (id) { return scanned.filter(function (f) { return f.id === id && f.where === 'the code'; }); };
    var any = function (ids) { return scanned.some(function (f) { return ids.indexOf(f.id) >= 0; }); };

    // --- What the file says, beside what its code shows ---
    var claims = [];
    // flag: how a difference is classed; false when the difference already has a finding of its own.
    var claim = function (id, label, says, shows, verdict, flag) {
      claims.push({ id: id, label: label, says: says, shows: shows, verdict: verdict });
      if (verdict === DIFFERS && flag !== false) add('claim-' + id, 'The file says one thing and shows another: ' + label, flag || UNEXPECTED, 'The file says: ' + says + ' ' + shows, manifestTags.length ? manifestTags[0].at : -1, manifestTags.length ? manifestTags[0].end - manifestTags[0].at : 0);
    };
    var keyStated = /\bvar\s+storageKey\s*=\s*'alloflow-take-home:'\s*\+\s*lesson\.lessonId\s*\+\s*':'\s*\+\s*lesson\.revision\s*;/.test(scriptText) && (scriptText.match(/\bstorageKey\s*=(?!=)/g) || []).length === 1;
    var storageCalls = inCode('local-storage');
    var storageClean = storageCalls.length > 0 && storageCalls.every(function (f) { return f.cls === EXPECTED; }) && !any(['other-storage', 'cookie']);
    var storageFacts = { places: storageCalls.length, name: lesson && keyStated ? report.data.storageName : '', clean: storageClean, stated: keyStated };
    report.storage = storageFacts;
    var savesFile = any(['file-save']) && /\bdownload\b/.test(scriptText);
    if (manifest) {
      var packet = isObject(m.packet) ? m.packet : {};
      if (lesson) {
        var sameId = String(packet.id) === String(L.lessonId) && String(packet.version) === String(L.revision) && (packet.mode === 'probe') === (L.mode === 'probe');
        claim('identity', 'which packet it is', 'packet ' + show(packet.id, 80) + ', version ' + show(packet.version, 80) + ', ' + (packet.mode === 'probe' ? 'a check' : 'a practice file') + '.',
          sameId ? 'The data block carries the same id, version and kind.' : 'The data block carries ' + report.data.id + ', version ' + report.data.version + ', ' + (L.mode === 'probe' ? 'a check' : 'a practice file') + '.', sameId ? AGREE : DIFFERS, LOOK);
      }
      claim('policy', 'its policy', 'the manifest holds a copy of the policy.', m.csp === policyText ? 'The copy is the same as the policy line the browser reads.' : 'The copy differs from the policy line the browser reads.',
        typeof m.csp !== 'string' ? CANNOT : m.csp === policyText ? AGREE : DIFFERS);
      claim('script', 'its script', 'the script has the SHA-256 ' + (report.script.inManifest || '(none given)') + '.', report.script.note, report.script.verdict, false);

      var stores = Array.isArray(m.stores) ? m.stores.filter(isObject) : [];
      var store = stores[0] || {};
      var storeSays = stores.length ? 'it keeps ' + count(stores.length, 'item') + ' in ' + show(store.where, 40) + ', named ' + show(store.key, 200) + '.' : 'nothing about what it keeps.';
      if (!stores.length) claim('stores', 'what it keeps on the device', storeSays, storageCalls.length ? 'The code uses the browser\'s storage in ' + count(storageCalls.length, 'place') + '.' : 'The code does not use the browser\'s storage.', storageCalls.length ? DIFFERS : CANNOT, LOOK);
      else if (stores.length !== 1 || store.where !== 'localStorage') claim('stores', 'what it keeps on the device', storeSays, 'A packet keeps one item, in localStorage.', CANNOT);
      else if (!lesson || !keyStated) claim('stores', 'what it keeps on the device', storeSays, 'This page could not find where the code sets the name it stores under.', CANNOT);
      else if (!storageClean) claim('stores', 'what it keeps on the device', storeSays, 'The code also uses storage in another way (see the scan).', DIFFERS);
      else if (store.key !== report.data.storageName) claim('stores', 'what it keeps on the device', storeSays, 'The code stores under the name ' + report.data.storageName + '.', DIFFERS);
      else claim('stores', 'what it keeps on the device', storeSays, 'The code uses the browser\'s storage in ' + count(storageCalls.length, 'place') + ', each under that one name. The scan found no cookies and no other storage.', AGREE);

      var saves = Array.isArray(m.saves) ? m.saves.filter(isObject) : [];
      var savesSays = saves.length ? 'it can save ' + count(saves.length, 'file') + ': ' + saves.map(function (row) { return show(row.file, 120) + ' (' + show(row.format, 80) + ')'; }).join(' and ') + '.' : 'nothing about what it saves.';
      var formats = scriptText.indexOf('alloflow-packet-result/1') >= 0 && scriptText.indexOf('alloflow-take-home-result') >= 0;
      claim('saves', 'what it saves', savesSays, savesFile && formats ? 'The code makes files on the device with the browser\'s own save, which needs no connection, and it names both file formats.'
        : savesFile ? 'The code makes files on the device. This page could not match the file formats.' : 'This page found no code that makes a file.', saves.length && savesFile && formats ? AGREE : CANNOT);

      var net = m.network;
      var netHost = isObject(net) ? show(net.sendsTo, 120) : '';
      var netSays = net === 'none' ? 'it connects to nothing.' : netHost ? 'it sends to ' + netHost + ': ' + (show(net.what, 120) || 'results') + ', ' + (show(net.when, 120) || 'at a time it does not state') + '.' : 'nothing clear about connections.';
      if (net === 'none') {
        claim('network', 'what it connects to', netSays, closed ? (any(['fetch', 'xhr', 'websocket', 'eventsource', 'beacon', 'peer']) ? 'The policy refuses every connection, but the code holds a call that tries to make one (see the scan).' : 'The policy refuses every connection, and the scan found no call that makes one.')
          : 'The policy lets the file connect to: ' + connect.hosts.join(', ') + '.', closed && !any(['fetch', 'xhr', 'websocket', 'eventsource', 'beacon', 'peer']) ? AGREE : DIFFERS);
      } else if (netHost) {
        claim('network', 'what it connects to', netSays, mailbox && netHost === MAILBOX_HOST ? 'The policy allows only ' + MAILBOX_SOURCES.join(' and ') + ', and the data block holds a class mailbox address there.'
          : closed ? 'The policy refuses every connection, so the file cannot send.' : 'The policy and the data block do not match what the file says.', mailbox && netHost === MAILBOX_HOST ? AGREE : DIFFERS, closed ? LOOK : UNEXPECTED);
        claim('network-when', 'when it sends', (show(isObject(net) ? net.when : '', 120) || 'no time stated') + '.', 'A scan cannot tell when code runs. The network tab of the browser can: see the guide for school IT.', CANNOT);
      } else claim('network', 'what it connects to', netSays, closed ? 'The policy refuses every connection.' : 'The policy lets the file connect to: ' + connect.hosts.join(', ') + '.', CANNOT);

      (Array.isArray(m.never) ? m.never : []).slice(0, 12).forEach(function (thing) {
        var name = show(thing, 60), says = 'it never uses: ' + name + '.';
        if (thing === 'internet connection') claim('never-internet', 'never: ' + name, says, closed ? 'The policy refuses every connection.' : 'The policy lets the file connect to: ' + connect.hosts.join(', ') + '.', closed ? AGREE : DIFFERS);
        else if (thing === 'microphone' || thing === 'camera') claim('never-' + thing, 'never: ' + name, says, any(['microphone']) ? 'The code holds a call that asks for the microphone or the camera (see the scan).' : 'The scan found no call that asks for the microphone or the camera.', any(['microphone']) ? DIFFERS : AGREE);
        else if (thing === 'cookies') claim('never-cookies', 'never: ' + name, says, any(['cookie']) ? 'The code reads or sets cookies (see the scan).' : 'The scan found no cookie code.', any(['cookie']) ? DIFFERS : AGREE);
        else if (thing === 'AI') {
          var loads = any(['eval', 'new-function', 'import', 'import-scripts', 'speech']);
          claim('never-ai', 'never: ' + name, says, closed && !loads ? 'The file cannot connect to any service, and the scan found no speech engine and no way to load other code. A scan cannot show more than that.'
            : 'A scan cannot show this for a file that can connect to another computer or load other code.', closed && !loads ? AGREE : CANNOT);
        } else claim('never-other', 'never: ' + name, says, 'This page has no check for this.', CANNOT);
      });
      if (m.licence != null || m.license != null) claim('license', 'its license', show(m.licence != null ? m.licence : m.license, 80) + '.', 'A license is a statement about rights. Code cannot show it.', CANNOT);
      var credits = Array.isArray(m.attributions) ? m.attributions.map(function (line) { return show(line, 300); }).filter(Boolean).slice(0, 20) : [];
      claim('credits', 'its credits', credits.length ? credits.join('; ') : 'no credits listed.', 'Credits are statements. Code cannot show them.', CANNOT);
      if (isObject(m.check)) {
        var codeSays = show(m.check.teacherCode, 200), set = /^set\b/.test(codeSays);
        if (lesson) {
          claim('teacher-code', 'a teacher code', codeSays ? codeSays + '.' : 'nothing about a teacher code.', report.data.teacherCode ? 'The data block holds a lock for the teacher\'s screen (a salted hash, not the code itself).' : 'The data block holds no lock.',
            !codeSays ? CANNOT : set === report.data.teacherCode ? AGREE : DIFFERS, LOOK);
          claim('answers', 'its answers', (show(m.check.answers, 200) || 'nothing about its answers') + '.', report.data.scrambled ? 'No item in the data block carries a readable answer: each carries a scrambled key.' : 'An item in the data block carries a readable answer.',
            !/^scrambled\b/.test(show(m.check.answers, 200)) ? CANNOT : report.data.scrambled ? AGREE : DIFFERS, LOOK);
        }
      }
    }
    report.claims = claims;

    // --- Counts, and the findings in order ---
    // Each sound and each picture is held once, as a data: address with something in it.
    report.counts.sounds = (text.match(/\bdata:audio\/[a-z0-9.+-]+;base64,[A-Za-z0-9+\/]/gi) || []).length;
    report.counts.pictures = (text.match(/\bdata:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+\/]/gi) || []).length;
    var all = findings.map(function (f) { f.listed = true; return f; }).concat(scanned);
    placeAll(text, all);
    var rank = function (f) { return f.cls === UNEXPECTED ? 0 : f.cls === LOOK ? 1 : 2; };
    all.sort(function (x, y) { return rank(x) - rank(y) || x.line - y.line || x.col - y.col; });
    // Every place is counted. The report lists the first of each kind.
    report.findings = all.filter(function (f) { return f.listed; }).map(function (f) { return { id: f.id, name: f.name, cls: f.cls, why: f.why, where: f.where, line: f.line, col: f.col, excerpt: f.excerpt }; });
    report.counts.places = all.length + scanned.more;
    report.counts.expected = all.filter(function (f) { return f.cls === EXPECTED; }).length;
    report.counts.notExpected = all.filter(function (f) { return f.cls === UNEXPECTED; }).length + scanned.more;
    report.counts.look = all.filter(function (f) { return f.cls === LOOK; }).length;
    report.counts.listed = report.findings.length;
    var n = report.counts.notExpected + report.counts.look;

    // --- What the file is, in its own words ---
    var check = isObject(m.check) ? m.check : null;
    var builder = isObject(m.builder) ? m.builder : null;
    var declaredMode = isObject(m.packet) ? m.packet.mode : (lesson ? L.mode : '');
    report.identity = {
      engine: show(m.engine, 80), player: show(m.player || generator, 80), title: show(m.title != null ? m.title : L.title, 200),
      packetId: show(isObject(m.packet) ? m.packet.id : L.lessonId, 120), packetVersion: show(isObject(m.packet) ? m.packet.version : L.revision, 120),
      form: show(isObject(m.packet) ? m.packet.form : L.form, 60), mode: declaredMode === 'probe' ? 'check' : 'practice', what: show(m.what, 400),
      license: show(m.licence != null ? m.licence : m.license, 80),
      builder: builder ? { name: show(builder.name, 80), seed: show(builder.seed, 40), ai: show(builder.ai, 40), words: show(builder.words, 12), items: show(builder.items, 12) } : null,
    };
    report.check = check ? { measure: show(check.measure, 80), timeLimitS: Number(check.timeLimitS) > 0 ? Number(check.timeLimitS) : null, items: show(check.items, 12), practiceItems: show(check.practiceItems, 12),
      answers: show(check.answers, 200), teacherCode: show(check.teacherCode, 200), clock: show(check.clock, 200) } : null;
    var id = report.identity, isCheck = id.mode === 'check';
    report.kindLine = older ? 'This looks like an older AlloFlow practice file: fewer checks apply.'
      : 'This file declares itself an AlloFlow ' + (isCheck ? 'check' : 'practice file') + (id.engine ? ' (file type ' + id.engine + ')' : '') + '.';

    // --- The result ---
    report.result = n > 0 ? 'look' : mailbox ? 'mailbox' : 'closed';
    report.headline = n > 0 ? HEADLINE.look(n) : mailbox ? HEADLINE.mailbox(MAILBOX_HOST) : HEADLINE.closed;

    // --- The same facts as plain sentences, for a reader who is not a technician ---
    var plain = report.plain;
    var verdictOf = function (name) { var row = claims.filter(function (c) { return c.id === name; })[0]; return row ? row.verdict : ''; };
    plain.about.push(report.kindLine);
    if (older) plain.about.push('It has no manifest block, so it does not say what it stores, what it saves or what it connects to. Its policy and its code were still read.');
    if (id.title) plain.about.push('Title: ' + id.title + '.');
    if (id.what) plain.about.push('It says: ' + id.what);
    if (id.packetId) plain.about.push('Packet ' + id.packetId + ', version ' + id.packetVersion + (id.form ? ', form ' + id.form : '') + '.');
    if (id.builder) plain.about.push('Made by ' + id.builder.name + (id.builder.ai === 'none' ? ', which says it runs without AI' : '') + ' (' + count(Number(id.builder.words) || 0, 'word') + ', ' + count(Number(id.builder.items) || 0, 'item') + ').');
    if (report.check) {
      var c = report.check;
      plain.about.push('It says it holds ' + count(Number(c.items) || 0, 'item') + (Number(c.practiceItems) ? ' and ' + count(Number(c.practiceItems), 'practice item') : '') + (c.timeLimitS ? ', with a time limit of ' + count(c.timeLimitS, 'second') : ', with no time limit') + '.');
      if (c.answers) plain.about.push('Its answers: ' + c.answers + '.' + (verdictOf('answers') === AGREE ? ' The data block agrees.' : ''));
      if (c.teacherCode) plain.about.push('A teacher code: ' + c.teacherCode + '.' + (verdictOf('teacher-code') === AGREE ? ' The data block agrees.' : ''));
    }
    if (id.license) plain.about.push('License: ' + id.license + '.');
    var creditRow = claims.filter(function (row) { return row.id === 'credits'; })[0];
    if (creditRow && creditRow.says !== 'no credits listed.') plain.about.push('Credits: ' + creditRow.says);
    plain.about.push('Inside the file: ' + count(report.counts.sounds, 'recorded sound') + ' and ' + count(report.counts.pictures, 'picture') + '. Size: ' + report.sizeText + '.');

    if (!policyTag) plain.reach.push('It has no policy line, so nothing stops its code from connecting to any address.');
    else if (closed) plain.reach.push('It cannot connect to anything. Its policy line tells the browser to refuse every connection, and the browser enforces it.');
    else if (mailbox) {
      plain.reach.push('It can connect to one place: ' + MAILBOX_HOST + ', where a class mailbox (a Google Apps Script web app) receives results.');
      plain.reach.push('The address in the file is ' + report.mailbox.address + '. Many web apps share ' + MAILBOX_HOST + ', so the teacher who made the file is the one who can confirm that this address is their class mailbox.');
    } else plain.reach.push('Its policy lets it connect to: ' + connect.hosts.join(', ') + '.');
    var openLoads = LOADS.filter(function (load) { return factOf(load.id).open; });
    if (policyTag && !openLoads.length) plain.reach.push('It cannot load scripts, pictures, sounds, fonts or other pages from anywhere else. What it uses is inside the file.');
    openLoads.forEach(function (load) { if (policyTag) plain.reach.push('Its policy lets it load ' + load.what + ' from: ' + factOf(load.id).from.join(', ') + '.'); });
    if (report.script.verdict === AGREE) plain.reach.push('Its one script is pinned by a hash: the browser runs it only while it matches. This file\'s script matches the hash in its policy and the hash in its manifest.');
    else if (report.script.verdict === DIFFERS) plain.reach.push(report.script.note + ' The file was changed after it was made, or it was not saved whole.');
    else if (older && !pinned) plain.reach.push('Its script is not pinned by a hash. Older files were made this way.');
    else plain.reach.push(report.script.note);
    if (policyTag) {
      var formsOpen = factOf('forms').open, baseOpen = factOf('base').open;
      plain.reach.push(!formsOpen && !baseOpen ? 'Its policy blocks forms and base addresses.' : 'Its policy does not block ' + listText([formsOpen ? 'forms' : '', baseOpen ? 'base addresses' : ''].filter(Boolean)) + '.' + (any(['form', 'base']) ? '' : ' The scan found none in the file.'));
    }
    var leaving = scanned.filter(function (f) { return ['location', 'open', 'form', 'refresh', 'external', 'script-address'].indexOf(f.id) >= 0 || (f.id === 'address' && f.cls !== EXPECTED); }).length;
    plain.reach.push('A policy cannot stop a page from opening another address. ' + (leaving ? 'The scan found ' + count(leaving, 'place') + ' that could do that: see the things a person should look at.'
      : 'The scan found no code that does that: no change of address, no open(, no form and no web address' + (mailbox ? ' other than the class mailbox' : '') + '.'));

    var storeRow = claims.filter(function (row) { return row.id === 'stores'; })[0];
    if (storeRow) {
      var held = manifest && Array.isArray(m.stores) && isObject(m.stores[0]) ? m.stores[0] : {};
      plain.keeps.push('It says ' + storeRow.says);
      if (held.holds) plain.keeps.push('It says the item holds: ' + show(held.holds, 300) + '.');
      if (held.until) plain.keeps.push('It says the item stays until: ' + show(held.until, 300) + '.');
      plain.keeps.push((storeRow.verdict === AGREE ? 'The code agrees. ' : storeRow.verdict === DIFFERS ? 'The code differs. ' : 'This page cannot tell whether the code agrees. ') + storeRow.shows);
    } else {
      plain.keeps.push(storageCalls.length ? 'Its code uses the browser\'s storage (localStorage) in ' + count(storageCalls.length, 'place') + (storageFacts.name ? ', under the name ' + storageFacts.name : '') + '.' : 'The scan found no use of the browser\'s storage.');
      plain.keeps.push(any(['other-storage', 'cookie']) ? 'The scan also found cookies or another kind of storage.' : 'The scan found no cookies and no other storage.');
    }
    plain.keeps.push('A scan cannot see what a saved item holds. The guide for school IT shows where to look at it in the browser, and how to clear it.');

    var savesRow = claims.filter(function (row) { return row.id === 'saves'; })[0];
    if (savesRow) {
      plain.saves.push('It says ' + savesRow.says);
      plain.saves.push((savesRow.verdict === AGREE ? 'The code agrees. ' : 'This page cannot tell whether the code agrees. ') + savesRow.shows);
    } else plain.saves.push(savesFile ? 'Its code makes files on the device with the browser\'s own save, which needs no connection.' : 'This page found no code that makes a file.');
    if (scanned.some(function (f) { return f.id === 'clipboard' && f.cls === EXPECTED; })) plain.saves.push('It can also put the results on the clipboard when the student presses the copy button.');
    if (mailbox) plain.saves.push('It can also send the results to the class mailbox. ' + (isObject(m.network) && m.network.when ? 'It says this happens ' + show(m.network.when, 120) + '. ' : '') + 'A scan cannot tell when code runs. The network tab of the browser can.');
    else if (closed) plain.saves.push('It sends nothing. A results file leaves the device only when a person passes it on.');
    if (typeof m.integrity === 'string') plain.saves.push('It says: ' + show(m.integrity, 300));

    report.look = report.findings.filter(function (f) { return f.cls !== EXPECTED; }).slice(0, 30).map(function (f) { return { line: f.line, name: f.name, cls: f.cls, why: f.why }; });
    report.lookMore = n > report.look.length ? 'And ' + (n - report.look.length) + ' more.' : '';
    report.look.forEach(function (f) { plain.look.push((f.line ? 'Line ' + f.line + ': ' : '') + f.name + ' (' + f.cls + '). ' + f.why); });
    if (report.lookMore) plain.look.push(report.lookMore);
    return report;
  }

  // ---------------------------------------------------------------------------
  // The report as plain text, for "Copy this report"
  // ---------------------------------------------------------------------------
  // about = { product, file, when }: the name of the product, the name of the file and the time, as the page has them.
  function reportText(report, about) {
    var a = about || {}, lines = [];
    var put = function (line) { lines.push(line == null ? '' : String(line)); };
    var part = function (title, items) { put(''); put(title.toUpperCase()); items.forEach(function (item) { put('- ' + item); }); };
    put((a.product ? a.product + ': ' : '') + 'check of a file');
    if (a.file) put('File: ' + a.file);
    put('Size: ' + report.sizeText + ' (' + report.bytes + ' bytes)');
    if (a.when) put('Checked: ' + a.when);
    if (report.fingerprint.sha256) put('File fingerprint (SHA-256 of ' + report.fingerprint.of + '): ' + report.fingerprint.sha256);
    put('');
    if (!report.headline) { put('Result: ' + report.why); put(''); put(LIMITS); return lines.join('\n'); }
    put('Result: ' + report.headline);
    put(report.kindLine);
    part('What this file says about itself', report.plain.about);
    part('What its code can reach', report.plain.reach);
    part('What it keeps on the device', report.plain.keeps);
    part('What it saves', report.plain.saves);
    part('Things a person should look at', report.plain.look.length ? report.plain.look : ['Nothing was found that a person needs to look at.']);
    put('');
    put('FOR IT STAFF');
    put('Policy line: ' + (report.policy.found ? report.policy.text : '(none)'));
    report.policy.facts.forEach(function (row) { put('- ' + row.question + ' ' + row.answer + (row.basis ? ' [' + row.basis + ']' : '')); });
    put('Script SHA-256, worked out from the file: ' + (report.script.sha256 || '(no script)'));
    put('Script SHA-256 in the policy: ' + (report.script.inPolicy || '(none)'));
    put('Script SHA-256 in the manifest: ' + (report.script.inManifest || '(none)'));
    put('The three: ' + report.script.verdict + '. ' + report.script.note);
    if (report.script.codeSha256) put('Code without its data block, SHA-256: ' + report.script.codeSha256);
    put(HASH_LIMIT);
    if (report.mailbox.address) put('Class mailbox address in the file: ' + report.mailbox.address);
    put('');
    put('What the file says, beside what its code shows:');
    if (!report.claims.length) put('- The file has no manifest, so it says nothing to compare.');
    report.claims.forEach(function (row) { put('- ' + row.label + ': ' + row.verdict + '. The file says ' + row.says + ' ' + row.shows); });
    put('');
    put('Everything the scan found (' + count(report.counts.places, 'place') + ': ' + report.counts.notExpected + ' not expected, ' + report.counts.look + ' for a person to look at, ' + report.counts.expected + ' expected):');
    report.findings.forEach(function (f) {
      put('- ' + (f.line ? 'line ' + f.line + ', character ' + f.col + ': ' : '') + f.name + ' [' + f.cls + '] ' + f.why + (f.excerpt ? ' | ' + f.excerpt : ''));
    });
    var hidden = report.counts.places - report.findings.length;
    if (hidden > 0) put('- and ' + count(hidden, 'more place') + ' of kinds already listed.');
    put('');
    put(LIMITS);
    return lines.join('\n');
  }

  var api = { MAX_BYTES: MAX_BYTES, LIMITS: LIMITS, HASH_LIMIT: HASH_LIMIT, HEADLINE: HEADLINE, CLASSES: [EXPECTED, UNEXPECTED, LOOK], VERDICTS: [AGREE, DIFFERS, CANNOT],
    verifyPacket: verifyPacket, refusal: refusal, reportText: reportText, scanSource: scanSource, sha256: sha256, sizeText: sizeText };
  root.AlloPacketVerify = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
