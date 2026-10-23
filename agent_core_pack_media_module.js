/* Pure native AlloPack media checks. No file access, fetch, model call, or DOM.
 * PNG: https://www.w3.org/TR/png-3/
 * WebP: https://developers.google.com/speed/webp/docs/riff_container
 * These are bounded container/header checks, not a full raster decoder or
 * a claim that the artwork/description has been visually reviewed.
 */
(function () {
  'use strict';
  var LIMITS = Object.freeze({ maxImageBytes: 1000000, maxTotalBytes: 1500000,
    maxDimension: 4096, maxPixels: 16777216, maxPlacements: 256, maxDepth: 16 });
  var IMAGE_FIELDS = Object.freeze({
    glossary: Object.freeze({ image: 'image', alt: 'imageAlt', hash: 'imageAltHash', source: 'imageAltSource', decorative: 'imageDecorative' }),
    sort: Object.freeze({ image: 'image', alt: 'imageAlt', hash: 'imageAltHash', source: 'imageAltSource', decorative: 'imageDecorative' }),
    panel: Object.freeze({ image: 'imageUrl', alt: 'alt', hash: 'altHash', source: 'altSource', decorative: 'decorative' }),
    timeline: Object.freeze({ image: 'image', alt: 'alt', hash: 'altHash', source: 'altSource', decorative: 'decorative' }),
    anchor: Object.freeze({ image: 'iconUrl', alt: 'iconAlt', hash: 'iconAltHash', source: 'iconAltSource', decorative: 'iconDecorative' }),
    single: Object.freeze({ image: 'imageUrl', alt: 'altText', hash: 'altHash', source: 'altSource', decorative: 'decorative' })
  });
  function object(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function issue(code, path, message) { return { code: code, path: path, message: message }; }
  // Options may tighten a budget, never increase the published safety caps.
  function limits(options) {
    var out = {};
    Object.keys(LIMITS).forEach(function (key) {
      var n = options && options[key];
      out[key] = Number.isInteger(n) && n > 0 ? Math.min(n, LIMITS[key]) : LIMITS[key];
    });
    return out;
  }
  // Intentionally identical to AltText.hashImage: a stale-description marker,
  // not a cryptographic content digest or a security/authenticity guarantee.
  function hashImage(value) {
    // This API accepts image strings only. Do not invoke user-controlled
    // toString/valueOf methods while reporting a malformed native image field.
    var s = typeof value === 'string' ? value.slice(0, 50000000) : '';
    if (!s) return '';
    var h = 2166136261;
    function mix(c) { h ^= c; h = Math.imul(h, 16777619) >>> 0; }
    String(s.length).split('').forEach(function (c) { mix(c.charCodeAt(0)); });
    for (var i = 0, step = Math.max(1, Math.floor(s.length / 4096)); i < s.length; i += step) mix(s.charCodeAt(i));
    return 'img-' + s.length.toString(36) + '-' + h.toString(16).padStart(8, '0');
  }
  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  function decode64(raw, maxBytes) {
    // Reject huge inputs before copying/allocating. A small whitespace allowance
    // accepts line-wrapped base64 without providing an unbounded padding channel.
    if (raw.length > Math.ceil(maxBytes / 3) * 4 + 4096) throw ['image-too-large', 'Encoded image exceeds the byte budget.'];
    var s = raw.replace(/[\t\r\n ]/g, '');
    if (!s || s.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(s)) throw ['invalid-image-base64', 'Use complete, padded raster base64.'];
    var padding = s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0;
    var count = s.length / 4 * 3 - padding;
    if (count > maxBytes) throw ['image-too-large', 'Decoded image exceeds the byte budget.'];
    if ((padding === 2 && (B64.indexOf(s[s.length - 3]) & 15)) || (padding === 1 && (B64.indexOf(s[s.length - 2]) & 3))) {
      throw ['invalid-image-base64', 'Base64 padding bits must be zero.'];
    }
    var bytes = new Uint8Array(count), p = 0;
    for (var i = 0; i < s.length; i += 4) {
      var n = B64.indexOf(s[i]) * 262144 + B64.indexOf(s[i + 1]) * 4096
        + Math.max(0, B64.indexOf(s[i + 2])) * 64 + Math.max(0, B64.indexOf(s[i + 3]));
      if (p < count) bytes[p++] = (n >>> 16) & 255;
      if (p < count) bytes[p++] = (n >>> 8) & 255;
      if (p < count) bytes[p++] = n & 255;
    }
    return bytes;
  }
  function be16(b, i) { return b[i] * 256 + b[i + 1]; }
  function be32(b, i) { return b[i] * 16777216 + b[i + 1] * 65536 + b[i + 2] * 256 + b[i + 3]; }
  function le24(b, i) { return b[i] + b[i + 1] * 256 + b[i + 2] * 65536; }
  function le32(b, i) { return le24(b, i) + b[i + 3] * 16777216; }
  function ascii(b, i, n) { var s = ''; for (var j = 0; j < n; j++) s += String.fromCharCode(b[i + j]); return s; }
  function invalid(message) { throw ['invalid-raster-image', message]; }
  var CRC_TABLE = null;
  function crc32(b, start, end) {
    if (!CRC_TABLE) {
      CRC_TABLE = new Uint32Array(256);
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
        CRC_TABLE[n] = c >>> 0;
      }
    }
    var crc = 0xffffffff;
    for (var i = start; i < end; i++) crc = CRC_TABLE[(crc ^ b[i]) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  function png(b) {
    var signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (b.length < 45 || signature.some(function (v, i) { return b[i] !== v; })) invalid('PNG signature is missing.');
    var p = 8, width = 0, height = 0, dataBytes = 0, ended = false, palette = false, color = -1, seenData = false, dataEnded = false;
    while (p < b.length) {
      if (p + 12 > b.length) invalid('PNG chunk is truncated.');
      var size = be32(b, p), type = ascii(b, p + 4, 4), start = p + 8, end = start + size;
      if (end + 4 > b.length || !/^[A-Za-z]{4}$/.test(type) || (b[p + 6] & 32)) invalid('PNG chunk length or type is invalid.');
      if (crc32(b, p + 4, end) !== be32(b, end)) invalid('PNG chunk checksum does not match.');
      if (p === 8 && type !== 'IHDR') invalid('PNG must start with IHDR.');
      if (type === 'IHDR') {
        if (p !== 8 || size !== 13) invalid('PNG IHDR must occur once and have 13 bytes.');
        width = be32(b, start); height = be32(b, start + 4); color = b[start + 9];
        var depths = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
        if (!depths[color] || depths[color].indexOf(b[start + 8]) === -1 || b[start + 10] !== 0 || b[start + 11] !== 0 || b[start + 12] > 1) invalid('PNG IHDR encoding is invalid.');
      } else if (type === 'PLTE') {
        if (palette || seenData || !size || size > 768 || size % 3) invalid('PNG palette is invalid.');
        palette = true;
      } else if (type === 'IDAT') {
        if (dataEnded || (color === 3 && !palette)) invalid('PNG image data order is invalid.');
        seenData = true; dataBytes += size;
      } else if (type === 'IEND') {
        if (size || !dataBytes || end + 4 !== b.length) invalid('PNG must end after image data with one empty IEND.');
        ended = true;
      } else if (type === 'acTL' || type === 'fcTL' || type === 'fdAT') {
        throw ['animated-image-unsupported', 'Use a still PNG, JPEG, or WebP for this illustrated profile.'];
      } else if (!(b[p + 4] & 32)) invalid('PNG contains an unsupported critical chunk.');
      if (seenData && type !== 'IDAT') dataEnded = true;
      p = end + 4;
    }
    if (!ended) invalid('PNG is missing its end chunk.');
    return { width: width, height: height, animated: false };
  }
  function jpeg(b) {
    if (b.length < 12 || b[0] !== 255 || b[1] !== 216) invalid('JPEG signature is missing.');
    var p = 2, width = 0, height = 0, scan = false, entropy = false, ended = false;
    while (p < b.length) {
      if (scan) {
        if (b[p] !== 255) { entropy = true; p++; continue; }
        var after = p + 1;
        while (after < b.length && b[after] === 255) after++;
        if (after >= b.length) invalid('JPEG scan is truncated.');
        if (b[after] === 0) { entropy = true; p = after + 1; continue; }
        if (b[after] >= 208 && b[after] <= 215) { p = after + 1; continue; }
        scan = false;
      }
      if (b[p++] !== 255) invalid('JPEG marker is missing.');
      while (p < b.length && b[p] === 255) p++;
      var marker = b[p++];
      if (marker === 217) { if (p !== b.length || !width || !entropy) invalid('JPEG end marker or scan is invalid.'); ended = true; break; }
      if (marker === 216 || marker === 0 || marker === undefined || (marker >= 208 && marker <= 215)) invalid('JPEG marker order is invalid.');
      if (marker === 1) continue;
      if (p + 2 > b.length) invalid('JPEG segment is truncated.');
      var size = be16(b, p), end = p + size;
      if (size < 2 || end > b.length) invalid('JPEG segment length is invalid.');
      var isFrame = marker >= 192 && marker <= 207 && [196, 200, 204].indexOf(marker) === -1;
      if (isFrame) {
        if ([192, 193, 194].indexOf(marker) === -1) invalid('Use baseline or progressive JPEG.');
        if (width || size < 11 || b[p + 2] !== 8 || ![1, 3, 4].includes(b[p + 7]) || size !== 8 + 3 * b[p + 7]) invalid('JPEG frame header is invalid.');
        height = be16(b, p + 3); width = be16(b, p + 5);
      }
      if (marker === 218) {
        if (!width || size < 8 || !b[p + 2] || size !== 6 + 2 * b[p + 2]) invalid('JPEG scan header is invalid.');
        scan = true;
      }
      p = end;
    }
    if (!ended) invalid('JPEG is missing its complete scan and end marker.');
    return { width: width, height: height, animated: false };
  }
  function webp(b) {
    if (b.length < 26 || ascii(b, 0, 4) !== 'RIFF' || ascii(b, 8, 4) !== 'WEBP' || le32(b, 4) + 8 !== b.length) invalid('WebP RIFF signature or length is invalid.');
    var p = 12, width = 0, height = 0, canvasWidth = 0, canvasHeight = 0, frames = 0;
    while (p < b.length) {
      if (p + 8 > b.length) invalid('WebP chunk is truncated.');
      var type = ascii(b, p, 4), size = le32(b, p + 4), start = p + 8, end = start + size, next = end + (size & 1);
      if (next > b.length || (size % 2 && b[end] !== 0)) invalid('WebP chunk length or padding is invalid.');
      if (p === 12 && ['VP8X', 'VP8 ', 'VP8L'].indexOf(type) === -1) invalid('WebP must start with an image or extended header.');
      if (type === 'VP8X') {
        if (p !== 12 || size !== 10 || (b[start] & 193) || b[start + 1] || b[start + 2] || b[start + 3]) invalid('WebP extended header is invalid.');
        if (b[start] & 2) throw ['animated-image-unsupported', 'Use a still PNG, JPEG, or WebP for this illustrated profile.'];
        canvasWidth = le24(b, start + 4) + 1; canvasHeight = le24(b, start + 7) + 1;
      } else if (type === 'ANIM' || type === 'ANMF') throw ['animated-image-unsupported', 'Use a still PNG, JPEG, or WebP for this illustrated profile.'];
      else if (type === 'VP8 ') {
        if (++frames > 1 || size < 11 || (b[start] & 1) || b[start + 3] !== 157 || b[start + 4] !== 1 || b[start + 5] !== 42) invalid('WebP VP8 key-frame header is invalid.');
        width = (b[start + 6] + b[start + 7] * 256) & 16383;
        height = (b[start + 8] + b[start + 9] * 256) & 16383;
      } else if (type === 'VP8L') {
        if (++frames > 1 || size < 6 || b[start] !== 47 || (b[start + 4] >>> 5)) invalid('WebP lossless header is invalid.');
        var bits = le32(b, start + 1);
        width = (bits & 16383) + 1; height = ((bits >>> 14) & 16383) + 1;
      }
      p = next;
    }
    if (frames !== 1 || (canvasWidth && (width !== canvasWidth || height !== canvasHeight))) invalid('WebP image and canvas dimensions must agree.');
    return { width: width, height: height, animated: false };
  }
  function inspectDataImage(value, options) {
    var errors = [], result = { ok: false, errors: errors, mimeType: null, decodedBytes: 0, width: 0, height: 0, animated: false };
    var cap = limits(options);
    try {
      if (typeof value !== 'string') throw ['invalid-image-value', 'Image must be an embedded raster data URL.'];
      var comma = value.indexOf(','), header = comma < 0 ? '' : value.slice(0, comma);
      if (!/^data:image\/(png|jpeg|webp);base64$/i.test(header)) throw ['unsupported-image-source', 'Use an embedded PNG, JPEG, or WebP data URL; remote, SVG, and other sources are unsupported.'];
      result.mimeType = header.slice(5, -7).toLowerCase();
      var b = decode64(value.slice(comma + 1), cap.maxImageBytes);
      result.decodedBytes = b.length;
      var dims = result.mimeType === 'image/png' ? png(b) : result.mimeType === 'image/jpeg' ? jpeg(b) : webp(b);
      result.width = dims.width; result.height = dims.height;
      if (!dims.width || !dims.height || dims.width > cap.maxDimension || dims.height > cap.maxDimension || dims.width * dims.height > cap.maxPixels) throw ['image-dimensions-exceeded', 'Image dimensions or pixel count exceed the supported bounds.'];
      result.ok = true;
    } catch (e) {
      errors.push(issue(Array.isArray(e) ? e[0] : 'invalid-raster-image', '', Array.isArray(e) ? e[1] : 'Raster image could not be inspected.'));
    }
    return result;
  }
  function getImageSlots(pack) {
    var slots = [];
    function add(owner, kind, index, resource, resourceIndex, path) {
      var fields = IMAGE_FIELDS[kind];
      if (!object(owner) || owner[fields.image] === undefined || owner[fields.image] === null || owner[fields.image] === '') return;
      slots.push({ kind: kind, index: index, resourceIndex: resourceIndex, resourceId: resource.id, path: path + '.' + fields.image, owner: owner, fields: fields });
    }
    (pack && Array.isArray(pack.history) ? pack.history : []).forEach(function (resource, ri) {
      if (!object(resource)) return;
      var data = resource.data, base = 'pack.history[' + ri + '].data';
      if (resource.type === 'glossary' && Array.isArray(data)) data.forEach(function (row, i) { add(row, 'glossary', i, resource, ri, base + '[' + i + ']'); });
      if (resource.type === 'anchor-chart' && object(data) && Array.isArray(data.sections)) data.sections.forEach(function (row, i) { add(row, 'anchor', i, resource, ri, base + '.sections[' + i + ']'); });
      if (resource.type === 'concept-sort' && object(data) && Array.isArray(data.items)) data.items.forEach(function (row, i) { add(row, 'sort', i, resource, ri, base + '.items[' + i + ']'); });
      if (resource.type === 'timeline' && object(data) && Array.isArray(data.items)) data.items.forEach(function (row, i) { add(row, 'timeline', i, resource, ri, base + '.items[' + i + ']'); });
      if (resource.type === 'image' && object(data)) {
        add(data, 'single', 0, resource, ri, base);
        if (object(data.originalImage)) add(data.originalImage, 'single', 0, resource, ri, base + '.originalImage');
        if (object(data.visualPlan) && Array.isArray(data.visualPlan.panels)) data.visualPlan.panels.forEach(function (row, i) {
          add(row, 'panel', i, resource, ri, base + '.visualPlan.panels[' + i + ']');
          if (object(row) && object(row.originalImage)) add(row.originalImage, 'panel', i, resource, ri, base + '.visualPlan.panels[' + i + '].originalImage');
        });
      }
    });
    return slots;
  }
  function validatePackMedia(pack, options) {
    var errors = [], warnings = [], cap = limits(options), slots = getImageSlots(pack), paths = new Set(), cache = new Map();
    var stats = { placements: slots.length, uniqueImages: 0, decodedBytes: 0, encodedChars: 0, pixels: 0 };
    if (!object(pack) || !Array.isArray(pack.history)) errors.push(issue('invalid-media-pack', 'pack', 'Use a pack with a history array.'));
    if (slots.length > cap.maxPlacements) errors.push(issue('too-many-image-placements', 'pack.history', 'Pack exceeds the image-placement budget.'));
    slots.slice(0, cap.maxPlacements).forEach(function (slot) {
      paths.add(slot.path);
      var owner = slot.owner, f = slot.fields, value = owner[f.image], report = cache.get(value);
      if (!report) { report = inspectDataImage(value, cap); cache.set(value, report); }
      report.errors.forEach(function (e) { errors.push(issue(e.code, slot.path, e.message)); });
      if (report.ok) { stats.decodedBytes += report.decodedBytes; stats.encodedChars += value.length; stats.pixels += report.width * report.height; }
      var base = slot.path.slice(0, -f.image.length), decorative = owner[f.decorative] === true;
      if (owner[f.decorative] !== undefined && typeof owner[f.decorative] !== 'boolean') errors.push(issue('invalid-image-decorative', base + f.decorative, 'Decorative must be an explicit boolean.'));
      var alt = owner[f.alt], hash = owner[f.hash], source = owner[f.source];
      if (!decorative && (typeof alt !== 'string' || !alt.trim() || alt.trim().length > 250)) errors.push(issue('invalid-image-alt', base + f.alt, 'An informative image needs an actual-image description of 1–250 characters.'));
      if (decorative && typeof alt === 'string' && alt.trim()) warnings.push(issue('decorative-image-alt-unused', base + f.alt, 'The image is decorative; its description is not announced.'));
      var requiresHash = !decorative && ['glossary', 'sort', 'panel', 'timeline'].indexOf(slot.kind) !== -1;
      if ((requiresHash || (hash !== undefined && hash !== '')) && (typeof value !== 'string' || typeof hash !== 'string' || hash !== hashImage(value))) errors.push(issue('stale-image-alt', base + f.hash, 'Description hash must match the current image data URL.'));
      if (source !== undefined && ['vision', 'author', 'planning'].indexOf(source) === -1) errors.push(issue('invalid-image-alt-source', base + f.source, 'Alt source must be vision, author, or planning.'));
      if (!decorative && (!source || source === 'planning')) warnings.push(issue('image-description-review-required', base + f.source, 'Review this description against the actual image before distribution.'));
    });
    stats.uniqueImages = cache.size;
    if (stats.decodedBytes > cap.maxTotalBytes) errors.push(issue('pack-media-too-large', 'pack.history', 'Combined decoded image placements exceed the pack media budget.'));
    var visited = new Set();
    function scan(value, path, depth) {
      if (typeof value === 'string') {
        if (/data:image\//i.test(value) && !paths.has(path)) errors.push(issue('unsupported-image-placement', path, 'Embed raster images only in supported native image fields.'));
        return;
      }
      if (!value || typeof value !== 'object') return;
      if (depth > cap.maxDepth) { errors.push(issue('media-payload-too-deep', path, 'Media payload nesting exceeds the supported limit.')); return; }
      if (visited.has(value)) { errors.push(issue('cyclic-media-payload', path, 'Pack must be acyclic JSON data.')); return; }
      visited.add(value);
      Object.keys(value).forEach(function (key) {
        var next = Array.isArray(value) ? path + '[' + key + ']' : path + '.' + key;
        if (!paths.has(next) && ['image', 'imageUrl', 'iconUrl'].indexOf(key) !== -1 && typeof value[key] === 'string' && value[key] && !/data:image\//i.test(value[key])) {
          errors.push(issue('unsupported-image-source', next, 'Native images must use bounded embedded raster data; remote references are not fetched.'));
        }
        scan(value[key], next, depth + 1);
      });
      visited.delete(value);
    }
    scan(pack, 'pack', 0);
    if (slots.length) warnings.push(issue('image-visual-review-required', 'pack.history', 'Container and accessibility metadata checks do not decode every pixel or verify the illustration; inspect the rendered images and descriptions.'));
    return { ok: errors.length === 0, errors: errors, warnings: warnings, stats: stats };
  }
  var api = { LIMITS: LIMITS, IMAGE_FIELDS: IMAGE_FIELDS, hashImage: hashImage,
    inspectDataImage: inspectDataImage, getImageSlots: getImageSlots, validatePackMedia: validatePackMedia };
  if (typeof window !== 'undefined') { window.AlloModules = window.AlloModules || {}; window.AlloModules.AgentCorePackMedia = api; }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
