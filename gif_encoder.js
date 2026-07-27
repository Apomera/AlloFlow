/*!
 * AlloFlow GIF encoder — GIF89a + LZW, 256-entry global colour table.
 *
 * Canonical home for an encoder that was written twice: once in
 * stem_lab/stem_tool_artstudio.js (stereogram exporter) and once inside
 * AlloFlowANTI.txt as `encodeFramesToGif` for Visual Supports process
 * animations — the second copy made deliberately so visual_panel would not
 * depend on the stem-lab module loading. A third consumer (the Whiteboard
 * "Record drawing" popup, which is a separate top-level window and cannot reach
 * either) forced the question, so the code lives here now.
 *
 * Standalone on purpose: no imports, no build step, no framework. Load it with a
 * plain <script src> from any surface — popup, CDN module, or the host app — and
 * it registers window.AlloGif. Encoding is pure computation over canvas pixels;
 * nothing leaves the device.
 *
 * Output matches the two existing implementations for every frame rate they
 * actually use, so it is a drop-in for both. ONE deliberate difference: the
 * per-frame delay has a 2-centisecond floor. The originals write
 * round(100/fps) unclamped, and a delay of 0-1cs tells browsers "as fast as
 * possible" — a seizure risk as much as a rendering one. At the rates in use
 * (visual_panel defaults to 3fps, the whiteboard recorder to 8) the floor never
 * engages and the bytes are identical.
 *
 * Behaviour notes worth knowing before you rely on it:
 *
 *  - The palette is a fixed 6x6x6 RGB cube (216 colours) plus 40 greys, and
 *    nearestColor only ever indexes into the CUBE — the greys are written to the
 *    table but never selected. Flat, saturated artwork (diagrams, vector-ish
 *    drawings) survives this well. Photographs and screen recordings of text
 *    will band, because grey ramps quantise to the cube's 6-level diagonal.
 *  - There is no dithering.
 *  - Every frame is a full frame (no inter-frame diffing), so file size scales
 *    linearly with frame count. Keep clips short.
 *
 * MIT-compatible with AlloFlow (AGPL-3.0). See THIRD_PARTY_LICENSES.md.
 */
(function (global) {
  'use strict';

  var MIN_CODE_SIZE = 8;

  function buildGlobalColorTable() {
    // 6x6x6 RGB cube (216) + 40 greys.
    var gct = new Uint8Array(768);
    for (var ci = 0; ci < 256; ci++) {
      if (ci < 216) {
        gct[ci * 3] = Math.floor(ci / 36) * 51;
        gct[ci * 3 + 1] = (Math.floor(ci / 6) % 6) * 51;
        gct[ci * 3 + 2] = (ci % 6) * 51;
      } else {
        var gv = Math.round((ci - 216) / 39 * 255);
        gct[ci * 3] = gv; gct[ci * 3 + 1] = gv; gct[ci * 3 + 2] = gv;
      }
    }
    return gct;
  }

  function nearestColor(r, g, b) {
    var ri = Math.round(r / 255 * 5), gi = Math.round(g / 255 * 5), bi = Math.round(b / 255 * 5);
    return ri * 36 + gi * 6 + bi;
  }

  function lzwEncode(indexStream) {
    var clearCode = 1 << MIN_CODE_SIZE;
    var eoiCode = clearCode + 1;
    var codeSize = MIN_CODE_SIZE + 1;
    var nextCode = eoiCode + 1;
    var dict = {};
    for (var di = 0; di < clearCode; di++) dict[String(di)] = di;
    var out = [];
    var bitBuf = 0, bitCount = 0;
    var writeBits = function (code, size) {
      bitBuf |= (code << bitCount);
      bitCount += size;
      while (bitCount >= 8) { out.push(bitBuf & 0xFF); bitBuf >>= 8; bitCount -= 8; }
    };
    writeBits(clearCode, codeSize);
    var cur = String(indexStream[0]);
    for (var si = 1; si < indexStream.length; si++) {
      var next = String(indexStream[si]);
      var combined = cur + ',' + next;
      if (dict[combined] !== undefined) {
        cur = combined;
      } else {
        writeBits(dict[cur], codeSize);
        if (nextCode < 4096) {
          dict[combined] = nextCode++;
          if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
        } else {
          // Dictionary full — emit clear, reset.
          writeBits(clearCode, codeSize);
          dict = {};
          for (var dj = 0; dj < clearCode; dj++) dict[String(dj)] = dj;
          nextCode = eoiCode + 1;
          codeSize = MIN_CODE_SIZE + 1;
        }
        cur = next;
      }
    }
    writeBits(dict[cur], codeSize);
    writeBits(eoiCode, codeSize);
    if (bitCount > 0) out.push(bitBuf & 0xFF);
    return new Uint8Array(out);
  }

  // Core: canvases (or anything with a 2d context) -> GIF bytes.
  function encodeCanvasesToBytes(canvases, width, height, fps) {
    if (!canvases || !canvases.length) throw new Error('AlloGif: need at least one frame');
    var W = Math.max(1, Math.round(width)), H = Math.max(1, Math.round(height));
    var delay = Math.max(2, Math.round(100 / (Number(fps) || 3))); // centiseconds
    var parts = [];

    parts.push(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])); // "GIF89a"
    var lsd = new Uint8Array(7);
    lsd[0] = W & 0xFF; lsd[1] = (W >> 8) & 0xFF;
    lsd[2] = H & 0xFF; lsd[3] = (H >> 8) & 0xFF;
    lsd[4] = 0xF7; // 256-entry global colour table
    parts.push(lsd);
    parts.push(buildGlobalColorTable());
    // Netscape looping extension (infinite loop)
    parts.push(new Uint8Array([0x21, 0xFF, 0x0B, 0x4E, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2E, 0x30, 0x03, 0x01, 0x00, 0x00, 0x00]));

    for (var fi = 0; fi < canvases.length; fi++) {
      // Graphic control extension (per-frame delay, no transparency)
      parts.push(new Uint8Array([0x21, 0xF9, 0x04, 0x00, delay & 0xFF, (delay >> 8) & 0xFF, 0x00, 0x00]));
      var imgDesc = new Uint8Array(10);
      imgDesc[0] = 0x2C;
      imgDesc[5] = W & 0xFF; imgDesc[6] = (W >> 8) & 0xFF;
      imgDesc[7] = H & 0xFF; imgDesc[8] = (H >> 8) & 0xFF;
      parts.push(imgDesc);

      var fData = canvases[fi].getContext('2d').getImageData(0, 0, W, H).data;
      var indices = new Uint8Array(W * H);
      for (var pi = 0; pi < W * H; pi++) {
        indices[pi] = nearestColor(fData[pi * 4], fData[pi * 4 + 1], fData[pi * 4 + 2]);
      }
      parts.push(new Uint8Array([MIN_CODE_SIZE]));
      var lzwData = lzwEncode(indices);
      var pos = 0;
      while (pos < lzwData.length) {
        var chunkLen = Math.min(255, lzwData.length - pos);
        parts.push(new Uint8Array([chunkLen]));
        parts.push(lzwData.slice(pos, pos + chunkLen));
        pos += chunkLen;
      }
      parts.push(new Uint8Array([0x00])); // block terminator
    }
    parts.push(new Uint8Array([0x3B])); // trailer

    var totalLen = parts.reduce(function (s, p) { return s + p.length; }, 0);
    var result = new Uint8Array(totalLen);
    var offset = 0;
    parts.forEach(function (p) { result.set(p, offset); offset += p.length; });
    return result;
  }

  function bytesToDataUrl(bytes) {
    // 32KB chunks: one String.fromCharCode over a big array stack-overflows.
    var binary = '';
    var CHUNK = 0x8000;
    for (var i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
    }
    return 'data:image/gif;base64,' + btoa(binary);
  }

  function loadImageToCanvas(src, width, height) {
    return new Promise(function (resolve, reject) {
      var url = String(src || '');
      if (url.indexOf('data:') !== 0) url = 'data:image/png;base64,' + url;
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas');
        c.width = width; c.height = height;
        c.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(c);
      };
      img.onerror = function () { reject(new Error('Frame load failed')); };
      img.src = url;
    });
  }

  var AlloGif = {
    /** Frames already on canvases -> Blob. No base64 round-trip. */
    encodeCanvasesToBlob: function (canvases, width, height, fps) {
      return new Blob([encodeCanvasesToBytes(canvases, width, height, fps)], { type: 'image/gif' });
    },
    /** Frames already on canvases -> raw bytes. */
    encodeCanvasesToBytes: encodeCanvasesToBytes,
    /**
     * Drop-in for the existing `encodeFramesToGif(framesBase64, w, h, fps)`:
     * base64 (or data:) frames in, data:image/gif URL out.
     */
    encodeFramesToGif: function (framesBase64, width, height, fps) {
      if (!framesBase64 || !framesBase64.length) {
        return Promise.reject(new Error('encodeFramesToGif: need at least one frame'));
      }
      return Promise.all(framesBase64.map(function (b64) { return loadImageToCanvas(b64, width, height); }))
        .then(function (canvases) { return bytesToDataUrl(encodeCanvasesToBytes(canvases, width, height, fps || 3)); });
    },
    bytesToDataUrl: bytesToDataUrl
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = AlloGif;
  if (global) global.AlloGif = AlloGif;
})(typeof window !== 'undefined' ? window : this);
