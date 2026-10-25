/* Pure native AlloPack media checks. No file access, fetch, model call, or DOM.
 * PNG: https://www.w3.org/TR/png-3/
 * WebP: https://developers.google.com/speed/webp/docs/riff_container
 * These are bounded container/header checks, not a full raster decoder or
 * a claim that the artwork/description has been visually reviewed.
 */
(function () {
  'use strict';
  var MAX_DIAGNOSTICS = 100;
  var LIMITS = Object.freeze({ maxImageBytes: 1000000, maxTotalBytes: 1500000,
    maxDimension: 4096, maxPixels: 16777216, maxTotalPixels: 33554432, maxPlacements: 256, maxDepth: 16,
    maxAnimationFrames: 60, maxTotalAnimationFrames: 120, maxAnnotations: 256, maxDrawingPoints: 4096 });
  var IMAGE_FIELDS = Object.freeze({
    glossary: Object.freeze({ image: 'image', alt: 'imageAlt', hash: 'imageAltHash', source: 'imageAltSource', decorative: 'imageDecorative' }),
    sort: Object.freeze({ image: 'image', alt: 'imageAlt', hash: 'imageAltHash', source: 'imageAltSource', decorative: 'imageDecorative' }),
    panel: Object.freeze({ image: 'imageUrl', alt: 'alt', hash: 'altHash', source: 'altSource', decorative: 'decorative' }),
    timeline: Object.freeze({ image: 'image', alt: 'alt', hash: 'altHash', source: 'altSource', decorative: 'decorative' }),
    anchor: Object.freeze({ image: 'iconUrl', alt: 'iconAlt', hash: 'iconAltHash', source: 'iconAltSource', decorative: 'iconDecorative' }),
    single: Object.freeze({ image: 'imageUrl', alt: 'altText', hash: 'altHash', source: 'altSource', decorative: 'decorative' }),
    memory: Object.freeze({ image: 'visualImage', alt: 'visualAlt', source: 'visualAltSource' }),
    challenge: Object.freeze({ image: 'image', alt: 'alt' })
  });
  function object(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function issue(code, path, message) { return { code: code, path: path.slice(0, 600), message: message.slice(0, 2000) }; }
  function appendIssue(items, entry) {
    if (items.length < MAX_DIAGNOSTICS - 1) items.push(entry);
    else if (items.length === MAX_DIAGNOSTICS - 1) items.push(issue('diagnostics-truncated', entry.path, 'The diagnostic limit was reached. Correct the reported issues and validate again; additional issues may remain.'));
  }
  function eachValidation(values, errors, visit) {
    for (var i = 0; i < values.length && errors.length < MAX_DIAGNOSTICS; i++) visit(values[i], i);
  }
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
  function canvasPixels(width, height, cap) {
    // Check division before multiplication so untrusted dimensions cannot
    // overflow integer precision. Options can only lower the published caps.
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1
      || width > cap.maxDimension || height > cap.maxDimension || width > Math.floor(cap.maxPixels / height)) {
      throw ['image-dimensions-exceeded', 'Image dimensions or pixel count exceed the supported bounds.'];
    }
    return width * height;
  }
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
    var errors = [], result = { ok: false, errors: errors, mimeType: null, decodedBytes: 0, width: 0, height: 0, pixels: 0, animated: false };
    var cap = limits(options);
    try {
      if (typeof value !== 'string') throw ['invalid-image-value', 'Image must be an embedded raster data URL.'];
      var comma = value.indexOf(','), header = comma < 0 ? '' : value.slice(0, comma);
      var native = options && options.profile === 'native';
      if (!(native ? /^data:image\/(png|jpeg|webp|gif);base64$/i : /^data:image\/(png|jpeg|webp);base64$/i).test(header)) throw ['unsupported-image-source', native ? 'Use embedded PNG, JPEG, WebP, or native GIF data; remote, SVG, and other sources are unsupported.' : 'Use an embedded PNG, JPEG, or WebP data URL; remote, SVG, and other sources are unsupported.'];
      result.mimeType = header.slice(5, -7).toLowerCase();
      var b = decode64(value.slice(comma + 1), cap.maxImageBytes);
      result.decodedBytes = b.length;
      var dims = result.mimeType === 'image/png' ? png(b) : result.mimeType === 'image/jpeg' ? jpeg(b) : result.mimeType === 'image/gif' ? gif(b, cap) : webp(b);
      result.width = dims.width; result.height = dims.height;
      result.animated = dims.animated === true;
      if (dims.frames !== undefined) result.frames = dims.frames;
      var area = canvasPixels(dims.width, dims.height, cap), frameCount = dims.frames || 1;
      if (!Number.isSafeInteger(frameCount) || frameCount < 1 || frameCount > Math.floor(cap.maxPixels / area)) throw ['animation-budget-exceeded', 'Combined animation canvas pixels exceed the media budget.'];
      // GIF subframes can be tiny while the decoder still composites full
      // canvases. Charge the full canvas for every encoded frame.
      result.pixels = area * frameCount;
      result.ok = true;
    } catch (e) {
      errors.push(issue(Array.isArray(e) ? e[0] : 'invalid-raster-image', '', Array.isArray(e) ? e[1] : 'Raster image could not be inspected.'));
    }
    return result;
  }
  // A bounded GIF block/container inspection for the native panel player. Like
  // the other inspectors, this is not a raster decoder or visual review.
  function gif(b, cap) {
    if (b.length < 14 || !['GIF87a', 'GIF89a'].includes(ascii(b, 0, 6))) invalid('GIF header is missing.');
    var width = b[6] + 256 * b[7], height = b[8] + 256 * b[9], packed = b[10];
    var area = canvasPixels(width, height, cap);
    var p = 13 + ((packed & 128) ? 3 * Math.pow(2, (packed & 7) + 1) : 0), frames = 0, ended = false;
    function subblocks() {
      var bytes = 0;
      while (p < b.length) {
        var length = b[p++];
        if (!length) return bytes;
        if (p + length > b.length) invalid('GIF data block is truncated.');
        bytes += length; p += length;
      }
      invalid('GIF data is missing its terminator.');
    }
    if (p > b.length) invalid('GIF palette is truncated.');
    while (p < b.length) {
      var tag = b[p++];
      if (tag === 59) { ended = true; if (p !== b.length) invalid('GIF has trailing data.'); break; }
      if (tag === 33) {
        var extension = b[p++];
        if (extension === 249) {
          if (p + 6 > b.length || b[p] !== 4 || b[p + 5] !== 0 || (b[p + 1] & 224)) invalid('GIF graphic control block is invalid.');
          p += 6;
        } else if (extension === 255 || extension === 254) {
          if (extension === 255 && b[p] !== 11) invalid('GIF application header is invalid.');
          subblocks();
        } else invalid('GIF contains an unsupported extension.');
      } else if (tag === 44) {
        if (p + 9 > b.length) invalid('GIF frame descriptor is truncated.');
        var x = b[p] + 256 * b[p + 1], y = b[p + 2] + 256 * b[p + 3];
        var w = b[p + 4] + 256 * b[p + 5], h = b[p + 6] + 256 * b[p + 7], flags = b[p + 8];
        if (!w || !h || x + w > width || y + h > height || (flags & 24)) invalid('GIF frame dimensions are invalid.');
        p += 9 + ((flags & 128) ? 3 * Math.pow(2, (flags & 7) + 1) : 0);
        if (p >= b.length || b[p] < 2 || b[p] > 8) invalid('GIF image code size is invalid.');
        p++;
        if (!subblocks()) invalid('GIF frame data is empty.');
        frames++;
        if (frames > cap.maxAnimationFrames || frames > Math.floor(cap.maxPixels / area)) throw ['animation-budget-exceeded', 'GIF frame count or combined frame pixels exceed the media budget.'];
      } else invalid('GIF block type is invalid.');
    }
    if (!ended || !frames) invalid('GIF needs complete image data and a trailer.');
    return { width: width, height: height, animated: frames > 1, frames: frames };
  }
  function getImageSlots(pack, options, stopAfter) {
    var slots = [];
    function eachSlot(values, visit) {
      for (var i = 0; i < values.length && (stopAfter === undefined || slots.length < stopAfter); i++) visit(values[i], i);
    }
    var native = options && options.profile === 'native';
    function add(owner, kind, index, resource, resourceIndex, path, extra) {
      var fields = extra && extra.fields || IMAGE_FIELDS[kind];
      if (stopAfter !== undefined && slots.length >= stopAfter) return;
      if (!object(owner) || owner[fields.image] === undefined || owner[fields.image] === null || owner[fields.image] === '') return;
      slots.push(Object.assign({ kind: kind, index: index, resourceIndex: resourceIndex, resourceId: resource.id, path: path + '.' + fields.image, owner: owner, fields: fields }, extra));
    }
    eachSlot((pack && Array.isArray(pack.history) ? pack.history : []), function (resource, ri) {
      if (!object(resource)) return;
      var data = resource.data, base = 'pack.history[' + ri + '].data';
      if (resource.type === 'glossary' && Array.isArray(data)) eachSlot(data, function (row, i) { add(row, 'glossary', i, resource, ri, base + '[' + i + ']'); });
      if (resource.type === 'anchor-chart' && object(data) && Array.isArray(data.sections)) eachSlot(data.sections, function (row, i) { add(row, 'anchor', i, resource, ri, base + '.sections[' + i + ']'); });
      if (resource.type === 'concept-sort' && object(data) && Array.isArray(data.items)) eachSlot(data.items, function (row, i) { add(row, 'sort', i, resource, ri, base + '.items[' + i + ']'); });
      if (resource.type === 'timeline' && object(data) && Array.isArray(data.items)) eachSlot(data.items, function (row, i) { add(row, 'timeline', i, resource, ri, base + '.items[' + i + ']'); });
      if (resource.type === 'image' && object(data)) {
        add(data, 'single', 0, resource, ri, base);
        if (object(data.originalImage)) add(data.originalImage, 'single', 0, resource, ri, base + '.originalImage');
        if (object(data.visualPlan) && Array.isArray(data.visualPlan.panels)) eachSlot(data.visualPlan.panels, function (row, i) {
          var panelPath = base + '.visualPlan.panels[' + i + ']';
          var override = native && object(data.annotations) && object(data.annotations.imageOverrides) && data.annotations.imageOverrides[i];
          var frames = native && object(row) && Array.isArray(row.frames) ? row.frames : [];
          var described = override || (frames.length > 1 ? frames[0] : row && row.imageUrl);
          add(row, 'panel', i, resource, ri, panelPath, native ? { describedImage: described, skipDescription: !!override } : undefined);
          if (object(row) && object(row.originalImage)) add(row.originalImage, 'panel', i, resource, ri, base + '.visualPlan.panels[' + i + '].originalImage');
          if (native) {
            eachSlot(frames, function (frame, fi) {
              add({ imageUrl: frame }, 'frame', fi, resource, ri, panelPath, { fields: IMAGE_FIELDS.panel, path: panelPath + '.frames[' + fi + ']', panelIndex: i, skipDescription: true, stillOnly: true });
            });
            if (override) add(Object.assign({}, row, { imageUrl: override }), 'override', i, resource, ri, base, { fields: IMAGE_FIELDS.panel, path: base + '.annotations.imageOverrides.' + i, descriptionPath: panelPath + '.', stillOnly: true });
          }
        });
      }
      if (native) {
        if (resource.type === 'memory-aid' && object(data) && Array.isArray(data.cards)) eachSlot(data.cards, function (row, i) {
          add(row, 'memory', i, resource, ri, base + '.cards[' + i + ']', { altLimit: 800 });
          if (object(row) && row.imageUrl) add(row, 'memory', i, resource, ri, base + '.cards[' + i + ']', { fields: Object.assign({}, IMAGE_FIELDS.memory, { image: 'imageUrl' }), altLimit: 800 });
        });
        if (resource.type === 'applied-challenge' && object(data) && object(data.visual)) add(data.visual, 'challenge', 0, resource, ri, base + '.visual', { altLimit: 1200 });
        // These renderers use the adjacent name/title as their accessible text,
        // rather than the image-view alt metadata contract.
        function named(owner, key, label, kind, index, path, decorative) {
          if (!object(owner) || !owner[key]) return;
          var synthetic = { imageUrl: owner[key], altText: label || '', decorative: decorative === true };
          add(synthetic, kind, index, resource, ri, path, { fields: IMAGE_FIELDS.single, path: path + '.' + key, rendererDescription: true });
        }
        if (resource.type === 'persona' && Array.isArray(data)) eachSlot(data, function (row, i) { named(row, 'avatarUrl', row && row.name, 'persona', i, base + '[' + i + ']'); });
        if (resource.type === 'brainstorm' && Array.isArray(data)) eachSlot(data, function (row, i) { named(row, 'coverImage', row && row.title, 'cover', i, base + '[' + i + ']'); });
        if (resource.type === 'outline' && object(data) && data.structureType === 'Frayer Model') named(data, 'frayerExampleImage', 'Visual representation of the vocabulary term', 'frayer', 0, base);
        if (resource.type === 'adventure' && object(data)) {
          function adventure(state, path) {
            if (!object(state)) return;
            ['sceneImage', 'sceneImagePreview'].forEach(function (key) { named(state, key, '', 'scene', 0, path, true); });
            if (Array.isArray(state.history)) eachSlot(state.history, function (row, i) { named(row, 'image', '', 'scene', i, path + '.history[' + i + ']', true); });
            if (Array.isArray(state.inventory)) eachSlot(state.inventory, function (row, i) { named(row, 'image', row && row.name, 'inventory', i, path + '.inventory[' + i + ']'); });
            if (Array.isArray(state.characters)) eachSlot(state.characters, function (row, i) { named(row, 'portrait', row && row.name, 'portrait', i, path + '.characters[' + i + ']'); });
          }
          adventure(data, base); adventure(data.snapshot, base + '.snapshot');
        }
      }
    });
    return slots;
  }
  function validateNativeImageState(pack, options) {
    var errors = [], cap = limits(options);
    function fail(code, path, message) { appendIssue(errors, issue(code, path, message)); }
    function finite(n, low, high) { return typeof n === 'number' && Number.isFinite(n) && n >= low && n <= high; }
    function point(v) { return object(v) && finite(v.x, 0, 100) && finite(v.y, 0, 100); }
    function percent(v) { return typeof v === 'string' && /^(?:\d+(?:\.\d+)?|\.\d+)%$/.test(v) && finite(parseFloat(v), 0, 100); }
    function keys(v, allowed, at) {
      eachValidation(Object.keys(v), errors, function (key) { if (allowed.indexOf(key) === -1) fail('unsupported-image-state', at + '.' + key, 'This field is not part of the native image annotation contract.'); });
    }
    eachValidation((pack && Array.isArray(pack.history) ? pack.history : []), errors, function (resource, ri) {
      if (!object(resource) || !object(resource.data)) return;
      var data = resource.data, at = 'pack.history[' + ri + '].data';
      if (resource.type === 'applied-challenge' && object(data.visual) && data.visual.reviewed !== undefined && typeof data.visual.reviewed !== 'boolean') fail('invalid-visual-review', at + '.visual.reviewed', 'The native illustration review flag must be boolean.');
      if (resource.type === 'memory-aid' && Array.isArray(data.cards)) eachValidation(data.cards, errors, function (card, ci) {
        if (!object(card)) return;
        var cardPath = at + '.cards[' + ci + ']';
        if (card.visualNeedsReview !== undefined && typeof card.visualNeedsReview !== 'boolean') fail('invalid-visual-review', cardPath + '.visualNeedsReview', 'The visual review flag must be boolean.');
        if (card.visualReview !== undefined) {
          var review = card.visualReview;
          if (!object(review) || ['unreviewed', 'approved', 'needs-revision'].indexOf(review.status) === -1) fail('invalid-visual-review', cardPath + '.visualReview', 'Use a native visual review with an unreviewed, approved, or needs-revision status.');
          else {
            if (review.note !== undefined && (typeof review.note !== 'string' || review.note.length > 1000)) fail('invalid-visual-review', cardPath + '.visualReview.note', 'Visual review notes are text up to 1000 characters.');
            if (review.reviewedAt !== undefined && (typeof review.reviewedAt !== 'string' || review.reviewedAt.length > 60)) fail('invalid-visual-review', cardPath + '.visualReview.reviewedAt', 'The review timestamp is a string up to 60 characters.');
          }
        }
      });
      if (resource.type !== 'image') return;
      var panels = object(data.visualPlan) && Array.isArray(data.visualPlan.panels) ? data.visualPlan.panels : [];
      eachValidation(panels, errors, function (panel, pi) {
        if (!object(panel)) return;
        var path = at + '.visualPlan.panels[' + pi + ']';
        if (panel.frames !== undefined && !Array.isArray(panel.frames)) fail('invalid-animation-frames', path + '.frames', 'Native frames must be an array of embedded still-image strings.');
        var frames = Array.isArray(panel.frames) ? panel.frames : [];
        eachValidation(frames, errors, function (frame, fi) { if (typeof frame !== 'string' || !frame.trim()) fail('invalid-animation-frame', path + '.frames[' + fi + ']', 'Every native animation frame must be a nonempty embedded still-image string.'); });
        if (frames.length > cap.maxAnimationFrames) fail('animation-budget-exceeded', path + '.frames', 'Animation exceeds the frame-count budget.');
        if (frames.length || panel.type === 'process_animation') {
          if (frames.length < 2) fail('invalid-animation-frames', path + '.frames', 'Provide at least two frames so native pause, reduced-motion, and frame stepping can work.');
          if (typeof panel.imageUrl !== 'string' || !/^data:image\/gif;base64,/i.test(panel.imageUrl)) fail('missing-animation-playback', path + '.imageUrl', 'Native animation playback needs an encoded GIF plus its individual still frames.');
          if (typeof panel.motionPrompt !== 'string' || !panel.motionPrompt.trim() || panel.motionPrompt.length > 2000) fail('invalid-motion-description', path + '.motionPrompt', 'Describe the motion in 1–2000 characters.');
          if (!Array.isArray(panel.motionSteps) || panel.motionSteps.length !== frames.length - 1 || panel.motionSteps.some(function (step) { return typeof step !== 'string' || !step.trim() || step.length > 2000; })) fail('invalid-motion-steps', path + '.motionSteps', 'Describe each change after the first frame; provide one nonempty step per remaining frame.');
          if (panel.fps !== undefined && !finite(panel.fps, 2, 24)) fail('invalid-animation-fps', path + '.fps', 'Native playback speed must be between 2 and 24 frames per second.');
          ['frameWidth', 'frameHeight'].forEach(function (key) { if (panel[key] !== undefined && (!Number.isInteger(panel[key]) || !finite(panel[key], 1, cap.maxDimension))) fail('invalid-animation-dimensions', path + '.' + key, 'Frame dimensions must be positive integers within the raster dimension budget.'); });
        }
      });
      if (data.annotations === undefined) return;
      var a = data.annotations, path = at + '.annotations';
      if (!object(a)) { fail('invalid-image-annotations', path, 'Native image annotations must be an object.'); return; }
      keys(a, ['userLabels', 'drawings', 'captionOverrides', 'imageOverrides', 'aiLabelPositions', 'aiLabelAnchors', 'panelOrder', 'challengeActive', 'challengeType'], path);
      if (a.challengeActive !== undefined && typeof a.challengeActive !== 'boolean') fail('invalid-image-challenge', path + '.challengeActive', 'challengeActive must be boolean.');
      if (a.challengeType !== undefined && ['scratch', 'fill-blank'].indexOf(a.challengeType) === -1) fail('invalid-image-challenge', path + '.challengeType', 'Use scratch or fill-blank.');
      if (a.panelOrder !== undefined && a.panelOrder !== null && (!Array.isArray(a.panelOrder) || a.panelOrder.length !== panels.length || new Set(a.panelOrder).size !== panels.length || a.panelOrder.some(function (i) { return !Number.isInteger(i) || i < 0 || i >= panels.length; }))) fail('invalid-panel-order', path + '.panelOrder', 'Panel order must contain each native panel index exactly once.');
      var count = 0, points = 0;
      ['userLabels', 'drawings', 'captionOverrides', 'imageOverrides', 'aiLabelPositions', 'aiLabelAnchors'].forEach(function (field) {
        if (a[field] === undefined) return;
        var map = a[field], fieldPath = path + '.' + field;
        if (!object(map)) { fail('invalid-image-annotation-map', fieldPath, 'Use a native annotation map object.'); return; }
        eachValidation(Object.keys(map), errors, function (key) {
          var labelMap = field === 'aiLabelPositions' || field === 'aiLabelAnchors';
          var match = labelMap ? /^(0|[1-9]\d*)-(0|[1-9]\d*)$/.exec(key) : /^(0|[1-9]\d*)$/.exec(key);
          var pi = match && Number(match[1]), value = map[key], itemPath = fieldPath + '.' + key;
          if (!match || !panels[pi] || (labelMap && (!Array.isArray(panels[pi].labels) || !panels[pi].labels[Number(match[2])]))) { fail('unknown-image-annotation-target', itemPath, 'Annotation keys must identify existing panels or labels.'); return; }
          count++;
          if (field === 'imageOverrides') {
            if (typeof value !== 'string') fail('invalid-image-value', itemPath, 'An image override must be an embedded image string.');
          } else if (field === 'captionOverrides') {
            if (typeof value !== 'string' || value.length > 10000) fail('invalid-caption-override', itemPath, 'A caption override must be text of at most 10000 characters.');
          } else if (field === 'aiLabelPositions') {
            if (!object(value) || !percent(value.left) || !percent(value.top)) fail('invalid-label-position', itemPath, 'Native label positions must use left/top percentages from 0% to 100%.');
          } else if (field === 'aiLabelAnchors') {
            if (!point(value)) fail('invalid-label-anchor', itemPath, 'Anchor x/y must be finite percentages from 0 to 100.');
          } else if (field === 'userLabels') {
            if (!Array.isArray(value)) { fail('invalid-user-labels', itemPath, 'User labels must be an array.'); return; }
            var ids = new Set();
            eachValidation(value, errors, function (label, li) {
              count++;
              var labelPath = itemPath + '[' + li + ']';
              if (!object(label) || !point(label) || typeof label.text !== 'string' || label.text.length > 2000 || !['string', 'number'].includes(typeof label.id) || !String(label.id) || ids.has(String(label.id))) { fail('invalid-user-label', labelPath, 'Each label needs a unique id, text, and finite x/y percentages.'); return; }
              ids.add(String(label.id));
              if ((label.anchorX !== undefined || label.anchorY !== undefined) && (!finite(label.anchorX, 0, 100) || !finite(label.anchorY, 0, 100))) fail('invalid-label-anchor', labelPath, 'Both label anchor coordinates must be finite percentages from 0 to 100.');
            });
          } else if (field === 'drawings') {
            if (!Array.isArray(value)) { fail('invalid-image-drawings', itemPath, 'Drawings must be an array.'); return; }
            eachValidation(value, errors, function (drawing, di) {
              count++;
              var drawingPath = itemPath + '[' + di + ']';
              if (!object(drawing) || ['freehand', 'highlight', 'arrow', 'circle'].indexOf(drawing.type) === -1 || typeof drawing.color !== 'string' || !/^(?:#[0-9a-f]{3,8}|[a-z]{1,30}|(?:rgb|rgba|hsl|hsla)\([\d.,%\s]+\))$/i.test(drawing.color)) { fail('invalid-image-drawing', drawingPath, 'Use a native drawing type and a plain CSS color.'); return; }
              if (drawing.type === 'freehand' || drawing.type === 'highlight') {
                if (!Array.isArray(drawing.points) || !drawing.points.length || drawing.points.some(function (p) { return !point(p); })) fail('invalid-drawing-points', drawingPath + '.points', 'Drawing points must contain finite x/y percentages.');
                if (Array.isArray(drawing.points)) points += drawing.points.length;
              } else if (!point(drawing.start) || !point(drawing.end)) fail('invalid-drawing-points', drawingPath, 'Shape start/end must contain finite x/y percentages.');
            });
          }
        });
      });
      if (count > cap.maxAnnotations || points > cap.maxDrawingPoints) fail('image-annotation-budget-exceeded', path, 'Saved annotations exceed the count or drawing-point budget.');
    });
    return { ok: errors.length === 0, errors: errors };
  }
  function validatePackMedia(pack, options) {
    var errors = [], warnings = [], cap = limits(options), slots = getImageSlots(pack, options, cap.maxPlacements + 1), paths = new Set(), cache = new Map();
    var native = options && options.profile === 'native';
    var stats = { placements: slots.length, uniqueImages: 0, decodedBytes: 0, encodedChars: 0, pixels: 0, animationFrames: 0 };
    if (!object(pack) || !Array.isArray(pack.history)) appendIssue(errors, issue('invalid-media-pack', 'pack', 'Use a pack with a history array.'));
    if (slots.length > cap.maxPlacements) {
      appendIssue(errors, issue('too-many-image-placements', 'pack.history', 'Pack exceeds the image-placement budget. Remaining images were not inspected.'));
      stats.complete = false;
      return { ok: false, errors: errors, warnings: warnings, stats: stats };
    }
    if (native) errors = errors.concat(validateNativeImageState(pack, cap).errors);
    eachValidation(slots.slice(0, cap.maxPlacements), errors, function (slot) {
      paths.add(slot.path);
      var owner = slot.owner, f = slot.fields, value = owner[f.image], report = cache.get(value);
      if (!report) { report = inspectDataImage(value, Object.assign({}, cap, { profile: native ? 'native' : 'illustrated' })); cache.set(value, report); }
      report.errors.forEach(function (e) { appendIssue(errors, issue(e.code, slot.path, e.message)); });
      if (report.ok) {
        stats.decodedBytes += report.decodedBytes; stats.encodedChars += value.length;
        // Count placements even when their identical bytes were inspected from
        // cache. Playback GIFs and preserved still frames are separate retained
        // representations; neither caller metadata nor deduplication gives them
        // free budget. Valid reports are <= maxPixels and only maxPlacements
        // reports are accumulated, keeping the sum exactly representable.
        stats.pixels += report.pixels;
        stats.animationFrames += slot.kind === 'frame' ? 1 : report.animated ? report.frames : 0;
      }
      if (slot.stillOnly && report.animated) appendIssue(errors, issue('animated-frame-unsupported', slot.path, 'An animation frame or saved replacement must be a still raster.'));
      if (report.animated && (slot.kind !== 'panel' || !Array.isArray(owner.frames) || owner.frames.length < 2)) appendIssue(errors, issue('animation-controls-required', slot.path, 'Animated GIFs belong in native visual panels with their individual frames for pause and reduced-motion controls.'));
      if (slot.kind === 'panel' && report.frames && Array.isArray(owner.frames) && owner.frames.length) {
        if (report.frames !== owner.frames.length) appendIssue(errors, issue('animation-frame-count-mismatch', slot.path, 'The encoded GIF and preserved animation frames must have the same frame count.'));
        if ((owner.frameWidth !== undefined && owner.frameWidth !== report.width) || (owner.frameHeight !== undefined && owner.frameHeight !== report.height)) appendIssue(errors, issue('animation-canvas-mismatch', slot.path, 'Saved animation canvas dimensions must match the encoded GIF.'));
      }
      if (slot.skipDescription) return;
      var base = slot.descriptionPath || slot.path.slice(0, -f.image.length), decorative = owner[f.decorative] === true;
      if (owner[f.decorative] !== undefined && typeof owner[f.decorative] !== 'boolean') appendIssue(errors, issue('invalid-image-decorative', base + f.decorative, 'Decorative must be an explicit boolean.'));
      var alt = owner[f.alt], hash = owner[f.hash], source = owner[f.source];
      var altLimit = slot.altLimit || 250;
      if (!decorative && (typeof alt !== 'string' || !alt.trim() || alt.trim().length > altLimit)) appendIssue(errors, issue('invalid-image-alt', base + f.alt, 'An informative image needs an actual-image description of 1–' + altLimit + ' characters.'));
      if (decorative && typeof alt === 'string' && alt.trim()) appendIssue(warnings, issue('decorative-image-alt-unused', base + f.alt, 'The image is decorative; its description is not announced.'));
      var requiresHash = !decorative && ['glossary', 'sort', 'panel', 'timeline', 'override'].indexOf(slot.kind) !== -1;
      var describedImage = slot.describedImage === undefined ? value : slot.describedImage;
      if ((requiresHash || (hash !== undefined && hash !== '')) && (typeof describedImage !== 'string' || typeof hash !== 'string' || hash !== hashImage(describedImage))) appendIssue(errors, issue('stale-image-alt', base + f.hash, 'Description hash must match the image described by the native renderer.'));
      if (source !== undefined && ['vision', 'author', 'planning'].indexOf(source) === -1) appendIssue(errors, issue('invalid-image-alt-source', base + f.source, 'Alt source must be vision, author, or planning.'));
      if (!decorative && (!source || source === 'planning')) appendIssue(warnings, issue('image-description-review-required', base + (f.source || f.alt), 'Review this description against the actual image before distribution.'));
      if (slot.kind === 'challenge' && owner.reviewed !== true) appendIssue(warnings, issue('native-visual-review-pending', slot.path, 'The native challenge keeps this image out of the learner view until its illustration and description are reviewed.'));
      if (slot.kind === 'memory' && (owner.visualNeedsReview === true || !object(owner.visualReview) || owner.visualReview.status !== 'approved')) appendIssue(warnings, issue('native-visual-review-pending', slot.path, 'The memory cue retains its native visual review state; inspect it before using it for learner practice.'));
      if (slot.rendererDescription) appendIssue(warnings, issue('native-derived-image-description', slot.path, 'This native renderer uses its adjacent name/title or decorative treatment; review the rendered artwork and surrounding text.'));
    });
    stats.uniqueImages = cache.size;
    if (stats.decodedBytes > cap.maxTotalBytes) appendIssue(errors, issue('pack-media-too-large', 'pack.history', 'Combined decoded image placements exceed the pack media budget.'));
    if (stats.pixels > cap.maxTotalPixels) appendIssue(errors, issue('pack-media-pixels-exceeded', 'pack.history', 'Combined image placements and animation canvas frames exceed the pack pixel budget.'));
    if (stats.animationFrames > cap.maxTotalAnimationFrames) appendIssue(errors, issue('pack-animation-budget-exceeded', 'pack.history', 'Combined encoded animation frames and preserved still frames exceed the pack animation budget.'));
    var visited = new Set();
    function scan(value, path, depth) {
      if (errors.length >= MAX_DIAGNOSTICS) return;
      if (typeof value === 'string') {
        if (/data:image\//i.test(value) && !paths.has(path)) appendIssue(errors, issue('unsupported-image-placement', path, 'Embed raster images only in supported native image fields.'));
        return;
      }
      if (!value || typeof value !== 'object') return;
      if (depth > cap.maxDepth) { appendIssue(errors, issue('media-payload-too-deep', path, 'Media payload nesting exceeds the supported limit.')); return; }
      if (visited.has(value)) { appendIssue(errors, issue('cyclic-media-payload', path, 'Pack must be acyclic JSON data.')); return; }
      visited.add(value);
      eachValidation(Object.keys(value), errors, function (key) {
        var next = Array.isArray(value) ? path + '[' + key + ']' : path + '.' + key;
        var imageKeys = native ? ['image', 'imageUrl', 'iconUrl', 'avatarUrl', 'coverImage', 'portrait', 'sceneImage', 'sceneImagePreview', 'visualImage', 'frayerExampleImage'] : ['image', 'imageUrl', 'iconUrl'];
        if (!paths.has(next) && imageKeys.indexOf(key) !== -1 && typeof value[key] === 'string' && value[key] && !/data:image\//i.test(value[key])) {
          appendIssue(errors, issue('unsupported-image-source', next, 'Native images must use bounded embedded raster data; remote references are not fetched.'));
        }
        scan(value[key], next, depth + 1);
      });
      visited.delete(value);
    }
    scan(pack, 'pack', 0);
    stats.complete = errors.length === 0;
    if (slots.length) appendIssue(warnings, issue('image-visual-review-required', 'pack.history', 'Container and accessibility metadata checks do not decode every pixel or verify the illustration; inspect the rendered images and descriptions.'));
    return { ok: errors.length === 0, errors: errors, warnings: warnings, stats: stats };
  }
  var api = { LIMITS: LIMITS, IMAGE_FIELDS: IMAGE_FIELDS, hashImage: hashImage,
    inspectDataImage: inspectDataImage, getImageSlots: getImageSlots, validateNativeImageState: validateNativeImageState, validatePackMedia: validatePackMedia };
  if (typeof window !== 'undefined') { window.AlloModules = window.AlloModules || {}; window.AlloModules.AgentCorePackMedia = api; }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
