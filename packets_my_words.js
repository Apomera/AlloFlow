// My words: what a teacher has added for a word, kept in this browser on this device.
// Runs without AI. No accounts. This file sends nothing and loads nothing: it only reads and writes
// the browser's own database (IndexedDB) for this site. It holds no web address.
//
// =====================================================================================================
// THE CONTRACT (a page that uses this file needs to read only this header)
// =====================================================================================================
// Load:   <script src="packets_my_words.js" defer></script>  ->  window.AlloPacketMyWords
//         require('./packets_my_words.js')                    ->  the same object (tests)
//         .create(env) makes a separate store on another window-like object (tests: a fake indexedDB).
//
// A WORD is stored lower-case, letters a to z only, 2 to 24 letters. normalizeWord('  Cat ') is 'cat';
// it is '' for anything else ("ice cream", "o'clock", "a", a 25-letter word). Every method takes a
// word in any case and normalizes it. A word can be a name: treat the words as the teacher's own.
//
// AN ENTRY (what get resolves to; null when the word has nothing):
//   { word: 'cat',
//     updated: '2026-11-11T18:00:00.000Z',
//     sounds:  { sounds: ['k', 'a', 't'], alternates: [], source: 'teacher',     // optional part
//                spelling: [{ text: 'c', start: 0, size: 1, at: 0 }, ...] },      // optional inside it
//     clip:    { dataUri: 'data:audio/wav;base64,...', source: 'teacher' | 'computer-voice',
//                made: '2026-11-11T18:00:00.000Z', ms: 640, bytes: 20524 },       // optional part
//     picture: { dataUri: 'data:image/png;base64,...', bytes: 14022, made: '...',
//                credit: { own: true }                                             // the teacher's own file
//                     or { title, author, license, licenseUrl, source, sourceUrl, resized } } }
//
//   sounds  is the object word_sounds_core.js dictionarySounds(word) returns, with source 'teacher':
//           `sounds` is the list of sound labels (the core's labels: k, a, sh, schwa, oo_short ...), one to
//           24 of them. `spelling`, when given, is what the core's alignGraphemes(word, sounds) returns
//           (text, start, size, at, silentE): the texts must spell the word and the sizes must add up to
//           the number of sounds. Hand entry.sounds.sounds to the builder where it takes dictionary sounds.
//           put also takes a plain list: put('cat', { sounds: ['k', 'a', 't'] }).
//   clip    a data: address of type audio/*, base64. The builder puts only wav and mpeg (mp3) into a
//           file as they are; record or convert to WAV before put if the clip must travel.
//   picture a data: address of type image/png, image/jpeg or image/svg+xml, base64. An SVG is kept only if
//           svgRefusal(text) is '' (the same test the packet builder runs). A credit that is not
//           { own: true } must state a license; a picture with no stated license is refused.
//           The two addresses in a credit must start with the https scheme, or they are dropped.
//
// LIMITS (LIMITS on the object; sizes are the bytes of the file inside the data: address):
//   a clip at most 400 KB (409,600 bytes); a picture at most 200 KB (204,800 bytes) and, when it comes
//   from resizeToDataUri, at most 256 pixels on its long side; at most 500 words; 2 to 24 letters.
//
// METHODS. All return promises and none throws. A refused call rejects with an Error that has
// .code (below) and a .message in plain words that can be shown to the teacher.
//   available()        true when this browser gave this site a database. False when storage is blocked
//                      (some private windows, blocked site data). True does not promise the browser keeps
//                      it forever: a private window forgets it when closed, and site data can be cleared.
//   get(word)          the entry, or null.
//   getMany(words)     { word: entry } for the words that have one. Bad words are skipped.
//   put(word, patch)   merges: patch may hold sounds, clip, picture. A part set to null is removed; a part
//                      left out is kept. Resolves to the entry as stored, or null when nothing is left
//                      (the word is then removed). Rejects for a bad word, a bad part or a part over size;
//                      nothing is written in that case.
//   remove(word)       true when the word was there.
//   list()             [{ word, updated, sounds, clip, picture (true/false), bytes, clipBytes,
//                      pictureBytes, own (the picture is the teacher's own file) }], by word. Reads small
//                      rows only, never the files, so it is cheap to call often.
//   clear()            removes every word; resolves to how many there were.
//   usage()            { count, bytes }.
//   When storage is blocked: available() is false; get is null, getMany {}, list [], usage
//   { count: 0, bytes: 0 }, remove false, clear 0; put rejects with code 'no_storage'. Show
//   "This browser is not keeping your words." (NOT_KEEPING on the object.)
//   Codes: bad_word, bad_part, bad_sounds, bad_clip, clip_too_big, bad_picture, picture_too_big,
//          too_many_words, no_storage, storage_full, not_a_picture, cannot_copy.
//
// OTHER TABS. After put, remove and clear every open page of this site is told:
//   var stop = AlloPacketMyWords.onChange(function (change) { ... });   stop() ends it.
//   change is { word: 'cat' or '', action: 'put' | 'remove' | 'clear' | '', here: true | false }.
//   here is true for a change made in this tab. Other tabs hear it over a BroadcastChannel; where the
//   browser has none, over a storage event, which carries no word (word '' and action '': read again).
//   The word is never written to local storage.
//
// TWO HELPERS the pages share:
//   resizeToDataUri(source, maxSide)   source is a File or Blob, or an image, canvas or bitmap that is
//       already loaded. Resolves to a data: address: PNG, or JPEG for a photo, at most maxSide pixels on
//       the long side (256 at most, and by default), never enlarged, at most 200 KB. An SVG stays an SVG
//       (as text, base64) only when svgRefusal says it has no script, no outside reference and no event
//       handler; any other SVG is drawn to a PNG, which cannot carry any of them. Rejects with
//       not_a_picture, picture_too_big or cannot_copy. The page needs img-src data: in its rule to show
//       the result; the helper itself loads a file through createImageBitmap, or through a data: address.
//   creditLine(credit)   one plain sentence for "About this file", '' when there is no credit:
//       "Cat" by Ada Poe, CC BY 4.0 (creativecommons.org/licenses/by/4.0/), from Wikimedia Commons
//       (commons.wikimedia.org/wiki/File:Cat.jpg), made smaller.      |   The teacher's own picture.
//       Addresses are written without their scheme, and a scheme anywhere in a title is cut out: a
//       practice file holds no web address. The result is text. Put it on a page as text, never as markup.
//   Also: normalizeWord(word), svgRefusal(svgText) ('' when the drawing may be kept), dataUriBytes(uri),
//   LIMITS, NOT_KEEPING, VERSION.
//
// WHERE IT IS KEPT: IndexedDB database 'alloflow-packets-my-words', version 1, with two object stores:
// 'words' (the entries) and 'rows' (one small row for each word, for list and usage).
// =====================================================================================================
(function (root) {
  'use strict';

  var VERSION = 1;
  var DB_NAME = 'alloflow-packets-my-words';
  var WORDS = 'words';
  var ROWS = 'rows';
  var CHANNEL = 'alloflow-packets-my-words';
  var PING_KEY = 'alloflow-packets-my-words/changed';
  var NOT_KEEPING = 'This browser is not keeping your words.';
  var LIMITS = { wordMin: 2, wordMax: 24, words: 500, sounds: 24, clipBytes: 409600, pictureBytes: 204800, pictureSide: 256, readBytes: 26214400 };
  var SCHEME = 'https:' + '/' + '/';
  var SVG_TYPE = 'image/svg+xml';

  function fail(code, message) { var error = new Error(message); error.code = code; return error; }
  function refuse(code, message) { return Promise.reject(fail(code, message)); }
  function own(object, key) { return Object.prototype.hasOwnProperty.call(object, key); }
  function isObject(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function kb(bytes) { return Math.round(bytes / 1024) + ' KB'; }

  function normalizeWord(word) {
    var text = typeof word === 'string' ? word.trim().toLowerCase() : '';
    return /^[a-z]+$/.test(text) && text.length >= LIMITS.wordMin && text.length <= LIMITS.wordMax ? text : '';
  }

  // One line of plain text: no control characters, single spaces, a length limit.
  function line(value, max) {
    return (typeof value === 'string' || typeof value === 'number' ? String(value) : '').replace(/[\x00-\x1f\x7f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  }
  function isoDate(value) {
    var when = typeof value === 'string' || typeof value === 'number' || value instanceof Date ? new Date(value) : null;
    return when && !isNaN(when.getTime()) ? when.toISOString() : new Date().toISOString();
  }

  // The bytes of the file inside a base64 data: address, or -1 when it is not one.
  function dataUriBytes(uri) {
    var text = typeof uri === 'string' ? uri : '';
    var at = text.indexOf(',');
    if (text.slice(0, 5) !== 'data:' || at < 0 || !/;base64$/i.test(text.slice(0, at))) return -1;
    var body = text.slice(at + 1);
    if (!body || body.length % 4 !== 0 || !/^[A-Za-z0-9+\/]*={0,2}$/.test(body)) return -1;
    return body.length / 4 * 3 - (body.slice(-2) === '==' ? 2 : body.slice(-1) === '=' ? 1 : 0);
  }
  function dataUriType(uri) {
    var found = /^data:([a-z0-9.+\/-]+)[;,]/i.exec(typeof uri === 'string' ? uri.slice(0, 80) : '');
    return found ? found[1].toLowerCase() : '';
  }
  function toBase64(text) {
    var bytes = unescape(encodeURIComponent(text));
    return typeof root.btoa === 'function' ? root.btoa(bytes) : Buffer.from(bytes, 'binary').toString('base64');
  }
  function fromBase64(body) {
    var bytes = typeof root.atob === 'function' ? root.atob(body) : Buffer.from(body, 'base64').toString('binary');
    try { return decodeURIComponent(escape(bytes)); } catch (_) { return bytes; }
  }

  // ---------------------------------------------------------------------------------------------------
  // Why an SVG may not be kept as a drawing, or '' when it may. The same test, rule for rule, as
  // svgRefusal in word_sounds_packet_builder.js, so a drawing kept here passes there.
  // ---------------------------------------------------------------------------------------------------
  var SVG_MAX = 300000;
  function svgRefusal(svg) {
    var text = typeof svg === 'string' ? svg : '';
    if (!/^\s*<svg[\s>]/.test(text) || !/<\/svg>\s*$/.test(text)) return 'not an SVG drawing';
    if (text.length > SVG_MAX) return 'the drawing is too large';
    if (text.indexOf('\\') >= 0) return 'an escape character';
    if (/<!(?:doctype|entity)/i.test(text)) return 'a document type or entity declaration';
    if (/<\?(?!xml\s)/i.test(text)) return 'a processing instruction';
    // Read character references the way a browser does, so a spelled-out "s" in "script" is seen.
    var plain = text.replace(/&#x([0-9a-f]+);?/gi, function (m, hex) { return String.fromCharCode(parseInt(hex, 16) & 0xFFFF); })
      .replace(/&#(\d+);?/g, function (m, dec) { return String.fromCharCode(Number(dec) & 0xFFFF); })
      .replace(/&(colon|newline|tab);/gi, function (m, name) { return name.toLowerCase() === 'colon' ? ':' : ''; });
    // A browser ignores spaces and control characters inside an address.
    var packed = plain.replace(/[\x00-\x20]+/g, '');
    var bare = function (value) { return String(value || '').replace(/[\x00-\x20]+/g, ''); };
    if (/<\s*(?:[\w-]+:)?script\b/i.test(plain)) return 'a script';
    if (/<\s*(?:[\w-]+:)?foreignObject\b/i.test(plain)) return 'a foreignObject';
    if (/<\s*(?:[\w-]+:)?(?:iframe|embed|object|audio|video|animate\w*|set|handler|listener)\b/i.test(plain)) return 'an element that is not a drawing';
    if (/[\s"'\/]on[a-z]+\s*=/i.test(plain)) return 'an event handler';
    if (/(?:java|vb|live)script:/i.test(packed)) return 'a script address';
    if (/xml:base\s*=/i.test(plain)) return 'a base address';
    // Every link must point inside the drawing itself ("#name"): no other file, no site, no data: address.
    var m, href = /(?:[\s"'\/])(?:[\w-]+:)?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/gi;
    while ((m = href.exec(plain))) {
      if (bare(m[1] != null ? m[1] : m[2] != null ? m[2] : m[3]).charAt(0) !== '#') return 'a link to something outside the drawing';
    }
    if (/[\s"'\/]src\s*=/i.test(plain)) return 'a link to something outside the drawing';
    // A style block may not load anything: no @import, no url(), no font.
    var style = /<\s*(?:[\w-]+:)?style\b[^>]*>/gi;
    while ((m = style.exec(plain))) {
      if (/\/\s*>$/.test(m[0])) continue;
      var end = plain.slice(style.lastIndex).search(/<\s*\/\s*(?:[\w-]+:)?style\s*>/i);
      var css = end < 0 ? plain.slice(style.lastIndex) : plain.slice(style.lastIndex, style.lastIndex + end);
      if (end < 0 || /@import|@font-face|@namespace|url\s*\(|expression\s*\(/i.test(css)) return 'a style block that loads something';
    }
    // Anywhere else, url(...) may only name something inside the drawing: fill="url(#a)".
    var url = /url\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))/gi;
    while ((m = url.exec(plain))) {
      if (bare(m[1] != null ? m[1] : m[2] != null ? m[2] : m[3]).charAt(0) !== '#') return 'a link to something outside the drawing';
    }
    return '';
  }
  // A file an SVG picture may start with before its <svg> tag: a byte order mark, an XML line, comments.
  function svgBody(text) {
    var body = String(text || '');
    if (body.charCodeAt(0) === 0xFEFF) body = body.slice(1);
    return body.replace(/^\s*<\?xml\s[^>]*\?>/i, '').replace(/^(?:\s*<!--[\s\S]*?-->)+/, '').trim();
  }

  // ---------------------------------------------------------------------------------------------------
  // The parts of an entry: each is checked and rebuilt, so only known fields of known types are stored
  // ---------------------------------------------------------------------------------------------------
  function cleanSounds(word, value) {
    var given = Array.isArray(value) ? { sounds: value } : value;
    if (!isObject(given) || !Array.isArray(given.sounds)) throw fail('bad_sounds', 'The sounds for this word could not be read.');
    var label = function (sound) { return typeof sound === 'string' && /^[a-z_]{1,10}$/.test(sound); };
    var sounds = given.sounds.slice();
    if (!sounds.length || sounds.length > LIMITS.sounds || !sounds.every(label)) throw fail('bad_sounds', 'A word has 1 to ' + LIMITS.sounds + ' sounds, each one a sound the word list knows.');
    var out = { sounds: sounds, alternates: [], source: 'teacher' };
    if (Array.isArray(given.alternates)) {
      out.alternates = given.alternates.filter(function (list) { return Array.isArray(list) && list.length && list.length <= LIMITS.sounds && list.every(label); }).slice(0, 8).map(function (list) { return list.slice(); });
    }
    if (given.spelling != null) {
      if (!Array.isArray(given.spelling) || !given.spelling.length) throw fail('bad_sounds', 'The letters for each sound could not be read.');
      var spelled = '', next = 0;
      var spelling = given.spelling.map(function (chunk) {
        if (!isObject(chunk) || typeof chunk.text !== 'string' || !/^[a-z]{1,6}$/.test(chunk.text)) throw fail('bad_sounds', 'The letters for each sound could not be read.');
        var size = chunk.size === 2 ? 2 : 1;
        var row = { text: chunk.text, start: next, size: size, at: spelled.length };
        if (chunk.silentE === true) row.silentE = true;
        spelled += chunk.text;
        next += size;
        return row;
      });
      if (spelled !== word || next !== sounds.length) throw fail('bad_sounds', 'The letters must spell the word, with one group of letters for each sound.');
      out.spelling = spelling;
    }
    return out;
  }

  function cleanClip(value) {
    if (!isObject(value) || typeof value.dataUri !== 'string') throw fail('bad_clip', 'The recording could not be read.');
    var bytes = dataUriBytes(value.dataUri);
    if (!/^audio\/[a-z0-9.+-]+$/.test(dataUriType(value.dataUri)) || bytes <= 0) throw fail('bad_clip', 'The recording could not be read.');
    if (bytes > LIMITS.clipBytes) throw fail('clip_too_big', 'The recording is too long to keep (' + kb(bytes) + '). The most is ' + kb(LIMITS.clipBytes) + ': record just the word.');
    var ms = Number(value.ms);
    return { dataUri: value.dataUri, source: value.source === 'computer-voice' ? 'computer-voice' : 'teacher', made: isoDate(value.made),
      ms: isFinite(ms) && ms > 0 ? Math.min(Math.round(ms), 600000) : 0, bytes: bytes };
  }

  function cleanAddress(value) {
    var text = line(value, 500);
    return text.slice(0, SCHEME.length).toLowerCase() === SCHEME && !/[\s"'<>`]/.test(text) ? text : '';
  }
  function cleanCredit(value) {
    if (isObject(value) && value.own === true) return { own: true };
    if (!isObject(value)) throw fail('bad_picture', 'A picture needs a credit: who made it and its license, or that it is your own.');
    var credit = { title: line(value.title, 200), author: line(value.author, 200), license: line(value.license, 60), licenseUrl: cleanAddress(value.licenseUrl),
      source: line(value.source, 80), sourceUrl: cleanAddress(value.sourceUrl) };
    if (!credit.license) throw fail('bad_picture', 'This picture has no stated license, so it is not kept.');
    if (value.resized === true) credit.resized = true;
    return credit;
  }
  function cleanPicture(value) {
    if (!isObject(value) || typeof value.dataUri !== 'string') throw fail('bad_picture', 'The picture could not be read.');
    var type = dataUriType(value.dataUri), bytes = dataUriBytes(value.dataUri);
    if ((type !== 'image/png' && type !== 'image/jpeg' && type !== SVG_TYPE) || bytes <= 0) throw fail('bad_picture', 'The picture could not be read. It must be a PNG, a JPEG or an SVG drawing.');
    if (bytes > LIMITS.pictureBytes) throw fail('picture_too_big', 'The picture is too large to keep (' + kb(bytes) + '). The most is ' + kb(LIMITS.pictureBytes) + '.');
    if (type === SVG_TYPE) {
      var why = svgRefusal(fromBase64(value.dataUri.slice(value.dataUri.indexOf(',') + 1)));
      if (why) throw fail('bad_picture', 'This drawing is not kept as it is, because it holds ' + why + '.');
    }
    return { dataUri: value.dataUri, credit: cleanCredit(value.credit), bytes: bytes, made: isoDate(value.made) };
  }

  var PARTS = { sounds: cleanSounds, clip: function (word, value) { return cleanClip(value); }, picture: function (word, value) { return cleanPicture(value); } };

  // The small row list() and usage() read.
  function rowOf(entry) {
    var clipBytes = entry.clip ? entry.clip.bytes : 0, pictureBytes = entry.picture ? entry.picture.bytes : 0;
    return { word: entry.word, updated: entry.updated, sounds: !!entry.sounds, clip: !!entry.clip, picture: !!entry.picture,
      own: !!(entry.picture && entry.picture.credit && entry.picture.credit.own === true),
      clipBytes: clipBytes, pictureBytes: pictureBytes, bytes: clipBytes + pictureBytes + (entry.sounds ? JSON.stringify(entry.sounds).length : 0) };
  }

  // ---------------------------------------------------------------------------------------------------
  // creditLine: one plain sentence
  // ---------------------------------------------------------------------------------------------------
  function creditLine(credit) {
    if (!isObject(credit)) return '';
    if (credit.own === true) return "The teacher's own picture.";
    var bare = function (address) { return line(address, 500).replace(/^[a-z][a-z0-9+.-]*:\/*/i, '').replace(/[\s"'<>`]/g, ''); };
    var title = line(credit.title, 200).replace(/"/g, "'"), author = line(credit.author, 200), license = line(credit.license, 60);
    var licenseAt = bare(credit.licenseUrl), source = line(credit.source, 80), sourceAt = bare(credit.sourceUrl);
    var parts = [];
    if (title) parts.push('"' + title + '"' + (author ? ' by ' + author : ''));
    else if (author) parts.push('Picture by ' + author);
    else parts.push('Picture');
    if (license) parts.push(license + (licenseAt ? ' (' + licenseAt + ')' : ''));
    if (source || sourceAt) parts.push('from ' + (source || sourceAt) + (source && sourceAt ? ' (' + sourceAt + ')' : ''));
    if (credit.resized === true) parts.push('made smaller');
    // No scheme anywhere, whatever a title or a name holds.
    return (parts.join(', ') + '.').replace(/\b[a-z][a-z0-9+.-]{1,12}:\/\/+/gi, '').replace(/\/{2,}/g, '/').replace(/\.\.$/, '.');
  }

  // ---------------------------------------------------------------------------------------------------
  // resizeToDataUri: a picture file, or a loaded image, as a small data: address
  // ---------------------------------------------------------------------------------------------------
  function isBlob(value) { return !!value && typeof value === 'object' && typeof value.size === 'number' && typeof value.slice === 'function' && typeof value.type === 'string'; }
  function readBlob(blob, how) {
    return new Promise(function (resolve, reject) {
      var no = function () { reject(fail('cannot_copy', 'The picture could not be read.')); };
      if (how === 'text' && typeof blob.text === 'function') { blob.text().then(resolve, no); return; }
      if (typeof root.FileReader !== 'function') { no(); return; }
      var reader = new root.FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = no;
      try { if (how === 'text') reader.readAsText(blob); else reader.readAsDataURL(blob); } catch (_) { no(); }
    });
  }
  function loadImage(address) {
    return new Promise(function (resolve, reject) {
      if (typeof root.Image !== 'function') { reject(fail('cannot_copy', 'This browser cannot read pictures here.')); return; }
      var image = new root.Image();
      image.onload = function () { resolve(image); };
      image.onerror = function () { reject(fail('not_a_picture', 'That file is not a picture this browser can read.')); };
      image.src = address;
    });
  }
  function sizeOf(image) {
    return { width: Number(image.naturalWidth || image.videoWidth || image.width) || 0, height: Number(image.naturalHeight || image.videoHeight || image.height) || 0 };
  }
  // Draws the picture at most `side` pixels on its long side and writes it out, smaller formats last.
  function draw(image, side, photo, drawing) {
    var doc = root.document;
    if (!doc || typeof doc.createElement !== 'function') throw fail('cannot_copy', 'This browser cannot resize pictures here.');
    var from = sizeOf(image);
    // A drawing with no size of its own is given a square.
    if (drawing && (!from.width || !from.height)) from = { width: side, height: side };
    if (!from.width || !from.height) throw fail('not_a_picture', 'That file is not a picture this browser can read.');
    var scale = Math.min(1, side / Math.max(from.width, from.height));
    if (drawing) scale = side / Math.max(from.width, from.height);
    var width = Math.max(1, Math.round(from.width * scale)), height = Math.max(1, Math.round(from.height * scale));
    var paint = function (source, sourceWidth, sourceHeight, w, h, white) {
      var canvas = doc.createElement('canvas');
      canvas.width = w; canvas.height = h;
      var context = canvas.getContext('2d');
      if (!context) throw fail('cannot_copy', 'This browser cannot resize pictures here.');
      if (white) { context.fillStyle = '#ffffff'; context.fillRect(0, 0, w, h); }
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(source, 0, 0, sourceWidth, sourceHeight, 0, 0, w, h);
      return canvas;
    };
    // A large photo is halved in steps: one big jump down leaves it jagged.
    var source = image, sw = from.width, sh = from.height;
    while (!drawing && sw / 2 >= width * 1.5 && sh / 2 >= height * 1.5) {
      var hw = Math.round(sw / 2), hh = Math.round(sh / 2);
      source = paint(source, sw, sh, hw, hh, false);
      sw = hw; sh = hh;
    }
    var write = function (type, quality) {
      var jpeg = type === 'image/jpeg';
      var canvas = paint(source, sw, sh, width, height, jpeg), uri;
      try { uri = jpeg ? canvas.toDataURL('image/jpeg', quality) : canvas.toDataURL('image/png'); }
      catch (_) { throw fail('cannot_copy', 'This picture cannot be copied: the site it comes from does not allow it.'); }
      var bytes = dataUriBytes(uri);
      return { uri: uri, bytes: bytes, canvas: canvas, fits: dataUriType(uri) === type && bytes > 0 && bytes <= LIMITS.pictureBytes };
    };
    // True only when every dot is known to be solid: then nothing is lost on a white ground.
    var solid = function (canvas) {
      try {
        var context = canvas.getContext('2d');
        if (!context || typeof context.getImageData !== 'function') return false;
        var dots = context.getImageData(0, 0, canvas.width, canvas.height).data;
        if (!dots || !dots.length) return false;
        for (var i = 3; i < dots.length; i += 4) if (dots[i] < 255) return false;
        return true;
      } catch (_) { return false; }
    };
    if (!photo) {
      var png = write('image/png');
      if (png.fits) {
        if (drawing || !solid(png.canvas)) return png.uri;
        // A photo that arrived in another format (WebP) is far smaller as a JPEG; a symbol is not, and stays a PNG.
        var other = write('image/jpeg', 0.85);
        return other.fits && other.bytes < png.bytes * 0.6 ? other.uri : png.uri;
      }
    }
    var qualities = [0.85, 0.7, 0.5];
    for (var q = 0; q < qualities.length; q++) {
      var made = write('image/jpeg', qualities[q]);
      if (made.fits) return made.uri;
    }
    throw fail('picture_too_big', 'The picture is too large to keep, even when made smaller.');
  }
  function resizeToDataUri(source, maxSide) {
    var side = Math.max(16, Math.min(LIMITS.pictureSide, Math.round(Number(maxSide)) || LIMITS.pictureSide));
    try {
      if (!source) return refuse('not_a_picture', 'There is no picture to read.');
      if (!isBlob(source)) return Promise.resolve(draw(source, side, false, false));
      var type = String(source.type || '').toLowerCase().split(';')[0].trim(), name = typeof source.name === 'string' ? source.name : '';
      if (!source.size) return refuse('not_a_picture', 'That file is empty.');
      if (source.size > LIMITS.readBytes) return refuse('picture_too_big', 'That file is too large to read here (' + Math.round(source.size / 1048576) + ' MB). Choose a smaller picture.');
      if (type && type.indexOf('image/') !== 0) return refuse('not_a_picture', 'That file is not a picture.');
      if (type === SVG_TYPE || (!type && /\.svg$/i.test(name))) {
        return readBlob(source, 'text').then(function (text) {
          var svg = svgBody(text);
          if (!/<svg[\s>]/i.test(svg.slice(0, 4000))) throw fail('not_a_picture', 'That file is not a picture this browser can read.');
          if (text.length > 4 * SVG_MAX) throw fail('picture_too_big', 'That drawing is too large to read here. Choose a smaller picture.');
          if (!svgRefusal(svg)) {
            var kept = 'data:' + SVG_TYPE + ';base64,' + toBase64(svg);
            if (dataUriBytes(kept) <= LIMITS.pictureBytes) return kept;
          }
          // Anything else is drawn as dots: a PNG cannot hold a script, a link or a handler.
          return loadImage('data:' + SVG_TYPE + ';base64,' + toBase64(text)).then(function (image) { return draw(image, side, false, true); });
        });
      }
      var photo = type === 'image/jpeg';
      var viaImage = function () { return readBlob(source, 'address').then(loadImage).then(function (image) { return draw(image, side, photo, false); }); };
      if (typeof root.createImageBitmap === 'function') {
        return root.createImageBitmap(source).then(function (bitmap) {
          try { return draw(bitmap, side, photo, false); } finally { if (typeof bitmap.close === 'function') bitmap.close(); }
        }, viaImage);
      }
      return viaImage();
    } catch (error) {
      return Promise.reject(error && error.code ? error : fail('cannot_copy', 'The picture could not be read.'));
    }
  }

  // ---------------------------------------------------------------------------------------------------
  // The store
  // ---------------------------------------------------------------------------------------------------
  function create(env) {
    var home = env || root;
    var opened = null;
    var listeners = [];
    var channel = null;
    var listening = false;

    function factory() { try { return home.indexedDB || null; } catch (_) { return null; } }
    function noStorage() { return fail('no_storage', NOT_KEEPING); }
    function storageError(error) {
      var name = error && error.name;
      if (error && error.code && typeof error.code === 'string') return error;
      if (name === 'QuotaExceededError') return fail('storage_full', 'This device has no room left for this site. Remove some words, or free some space.');
      return noStorage();
    }
    function open() {
      if (opened) return opened;
      var attempt = new Promise(function (resolve, reject) {
        var idb = factory(), request;
        if (!idb || typeof idb.open !== 'function') { reject(noStorage()); return; }
        try { request = idb.open(DB_NAME, VERSION); } catch (_) { reject(noStorage()); return; }
        request.onupgradeneeded = function () {
          var db = request.result;
          if (!db.objectStoreNames.contains(WORDS)) db.createObjectStore(WORDS, { keyPath: 'word' });
          if (!db.objectStoreNames.contains(ROWS)) db.createObjectStore(ROWS, { keyPath: 'word' });
        };
        request.onsuccess = function () {
          var db = request.result;
          var forget = function () { if (opened === attempt) opened = null; };
          db.onversionchange = function () { try { db.close(); } catch (_) {} forget(); };
          db.onclose = forget;
          resolve(db);
        };
        request.onerror = function (event) { if (event && typeof event.preventDefault === 'function') event.preventDefault(); reject(noStorage()); };
        request.onblocked = function () { reject(noStorage()); };
      });
      opened = attempt;
      // A failed try is not remembered: the next call tries again.
      attempt.then(null, function () { if (opened === attempt) opened = null; });
      return attempt;
    }
    // One transaction. work(stores, done) queues requests; the promise resolves with what done() was given.
    function run(names, mode, work) {
      return open().then(function (db) {
        return new Promise(function (resolve, reject) {
          var transaction, result, refused = null;
          try { transaction = db.transaction(names, mode); } catch (error) { opened = null; reject(storageError(error)); return; }
          transaction.oncomplete = function () { resolve(result); };
          transaction.onabort = transaction.onerror = function (event) {
            if (event && typeof event.preventDefault === 'function') event.preventDefault();
            reject(refused || storageError(transaction.error || (event && event.target && event.target.error)));
          };
          var stores = {};
          names.forEach(function (name) { stores[name] = transaction.objectStore(name); });
          try {
            work(stores, function (value) { result = value; }, function (error) { refused = error; try { transaction.abort(); } catch (_) {} });
          } catch (error) {
            refused = error && error.code ? error : storageError(error);
            try { transaction.abort(); } catch (_) { reject(refused); }
          }
        });
      });
    }
    function read(names, work, empty) { return run(names, 'readonly', work).then(null, function () { return empty; }); }

    // Telling the other tabs
    function tell(change) {
      listeners.slice().forEach(function (listener) { try { listener(change); } catch (_) {} });
    }
    function listen() {
      if (listening) return;
      listening = true;
      try {
        if (typeof home.BroadcastChannel === 'function') {
          channel = new home.BroadcastChannel(CHANNEL);
          if (typeof channel.unref === 'function') channel.unref();
          channel.onmessage = function (event) {
            var data = event && event.data;
            if (!isObject(data) || data.type !== 'my-words-changed') return;
            tell({ word: normalizeWord(data.word), action: /^(put|remove|clear)$/.test(data.action) ? data.action : '', here: false });
          };
          return;
        }
      } catch (_) { channel = null; }
      try {
        if (typeof home.addEventListener === 'function') home.addEventListener('storage', function (event) {
          if (event && event.key === PING_KEY && event.newValue) tell({ word: '', action: '', here: false });
        });
      } catch (_) {}
    }
    function announce(word, action) {
      listen();
      tell({ word: word, action: action, here: true });
      try {
        if (channel) { channel.postMessage({ type: 'my-words-changed', word: word, action: action }); return; }
      } catch (_) {}
      // No channel: a storage event wakes the other tabs. It holds a time and nothing else.
      try {
        var store = home.localStorage;
        if (store) { store.setItem(PING_KEY, String(Date.now()) + '.' + Math.floor(Math.random() * 1e6)); store.removeItem(PING_KEY); }
      } catch (_) {}
    }
    function onChange(listener) {
      if (typeof listener !== 'function') return function () {};
      listen();
      listeners.push(listener);
      return function () { listeners = listeners.filter(function (one) { return one !== listener; }); };
    }

    function available() {
      return run([ROWS], 'readonly', function (stores, done) { stores[ROWS].count().onsuccess = function () { done(true); }; })
        .then(function () { return true; }, function () { return false; });
    }
    function get(word) {
      var key = normalizeWord(word);
      if (!key) return Promise.resolve(null);
      return read([WORDS], function (stores, done) {
        done(null);
        stores[WORDS].get(key).onsuccess = function (event) { done(event.target.result || null); };
      }, null);
    }
    function getMany(words) {
      var keys = [];
      (Array.isArray(words) ? words : []).forEach(function (word) { var key = normalizeWord(word); if (key && keys.indexOf(key) < 0) keys.push(key); });
      if (!keys.length) return Promise.resolve({});
      return read([WORDS], function (stores, done) {
        var found = {};
        done(found);
        keys.forEach(function (key) { stores[WORDS].get(key).onsuccess = function (event) { if (event.target.result) found[key] = event.target.result; }; });
      }, {});
    }
    function put(word, patch) {
      var key = normalizeWord(word), cleaned = {}, names;
      try {
        if (!key) throw fail('bad_word', 'A word is ' + LIMITS.wordMin + ' to ' + LIMITS.wordMax + ' letters, with no spaces, numbers or marks.');
        if (!isObject(patch)) throw fail('bad_part', 'There is nothing to keep for this word.');
        names = Object.keys(PARTS).filter(function (name) { return own(patch, name) && patch[name] !== undefined; });
        if (!names.length) throw fail('bad_part', 'There is nothing to keep for this word.');
        names.forEach(function (name) { cleaned[name] = patch[name] === null ? null : PARTS[name](key, patch[name]); });
      } catch (error) {
        return Promise.reject(error && error.code ? error : fail('bad_part', 'This could not be kept.'));
      }
      return run([WORDS, ROWS], 'readwrite', function (stores, done, stop) {
        stores[WORDS].get(key).onsuccess = function (event) {
          var before = event.target.result || null;
          var entry = { word: key, updated: new Date().toISOString() };
          Object.keys(PARTS).forEach(function (name) {
            var part = own(cleaned, name) ? cleaned[name] : before && before[name];
            if (part) entry[name] = part;
          });
          if (!entry.sounds && !entry.clip && !entry.picture) {
            stores[WORDS].delete(key); stores[ROWS].delete(key); done(null);
            return;
          }
          var write = function () { stores[WORDS].put(entry); stores[ROWS].put(rowOf(entry)); done(entry); };
          if (before) { write(); return; }
          stores[ROWS].count().onsuccess = function (counted) {
            if (counted.target.result >= LIMITS.words) stop(fail('too_many_words', 'This browser keeps at most ' + LIMITS.words + ' words. Remove some to add more.'));
            else write();
          };
        };
      }).then(function (entry) { announce(key, entry ? 'put' : 'remove'); return entry; }, function (error) { throw storageError(error); });
    }
    function remove(word) {
      var key = normalizeWord(word);
      if (!key) return Promise.resolve(false);
      return run([WORDS, ROWS], 'readwrite', function (stores, done) {
        done(false);
        stores[ROWS].get(key).onsuccess = function (event) {
          done(!!event.target.result);
          stores[WORDS].delete(key); stores[ROWS].delete(key);
        };
      }).then(function (was) { if (was) announce(key, 'remove'); return was; }, function () { return false; });
    }
    function list() {
      return read([ROWS], function (stores, done) {
        done([]);
        stores[ROWS].getAll().onsuccess = function (event) {
          done((event.target.result || []).slice().sort(function (a, b) { return a.word < b.word ? -1 : a.word > b.word ? 1 : 0; }));
        };
      }, []);
    }
    function clear() {
      return run([WORDS, ROWS], 'readwrite', function (stores, done) {
        done(0);
        stores[ROWS].count().onsuccess = function (event) {
          done(event.target.result || 0);
          stores[WORDS].clear(); stores[ROWS].clear();
        };
      }).then(function (count) { if (count) announce('', 'clear'); return count; }, function () { return 0; });
    }
    function usage() {
      return list().then(function (rows) {
        return { count: rows.length, bytes: rows.reduce(function (sum, row) { return sum + (Number(row.bytes) || 0); }, 0) };
      });
    }

    return { available: available, get: get, getMany: getMany, put: put, remove: remove, list: list, clear: clear, usage: usage, onChange: onChange };
  }

  var api = create(root);
  api.VERSION = VERSION;
  api.LIMITS = LIMITS;
  api.NOT_KEEPING = NOT_KEEPING;
  api.create = create;
  api.normalizeWord = normalizeWord;
  api.svgRefusal = svgRefusal;
  api.dataUriBytes = dataUriBytes;
  api.resizeToDataUri = resizeToDataUri;
  api.creditLine = creditLine;

  if (root) root.AlloPacketMyWords = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
