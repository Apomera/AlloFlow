// video_studio_module.js
// Video Studio for AlloFlow — teacher screen/webcam recording with trim editing,
// live captions (Web Speech), WebVTT export, and pack-safe metadata references.
//
// Architecture (2026-07-02, Aaron-requested): the actual recorder/editor runs in
// video_studio/video_studio.html, a COMPANION WINDOW opened with window.open —
// the same escape-hatch pattern as the veraPDF validator and PDF Compare — because
// Gemini Canvas's sandboxed iframe may deny the `display-capture` Permissions-Policy,
// while a popup is a real top-level browsing context where getDisplayMedia works
// and storage persists. Finished videos come back over postMessage (Blob structured
// clone); nothing ever touches a server.
//
// PACK RULE (hard constraint from Aaron): video BYTES never enter Resource-History
// pack JSON — packs carry only a compact metadata reference (title, duration, size,
// SHA-256, tiny thumbnail). The .webm itself is downloaded as a sidecar file.
//
// Public API: window.AlloModules.VideoStudio  (React component for CDNModuleGate)
//   Pure helpers attached for tests: vsFormatTimestamp, vsBuildVtt, vsParseVtt,
//   vsComputeSegments, vsPatchWebmDuration, vsMakePackReference.
// Version: 1.0.0 (Jul 2026)
(function () {
  if (typeof document !== 'undefined') {
    // WCAG 4.1.3: status live region for dynamic announcements
    if (!document.getElementById('allo-live-video-studio')) {
      var vsLive = document.createElement('div');
      vsLive.id = 'allo-live-video-studio';
      vsLive.setAttribute('aria-live', 'polite');
      vsLive.setAttribute('aria-atomic', 'true');
      vsLive.setAttribute('role', 'status');
      vsLive.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
      document.body.appendChild(vsLive);
    }
    // WCAG 2.1 AA: reduced motion + visible focus
    if (!document.getElementById('vs-a11y-css')) {
      var vsA11y = document.createElement('style');
      vsA11y.id = 'vs-a11y-css';
      vsA11y.textContent = [
        '@media (prefers-reduced-motion: reduce) { .vs-root *, .vs-root *::before, .vs-root *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }',
        '.vs-root button:focus-visible, .vs-root input:focus-visible, .vs-root [tabindex]:focus-visible { outline: 2px solid #6366f1 !important; outline-offset: 2px !important; border-radius: 6px; }',
        '.vs-root :focus:not(:focus-visible) { outline: none !important; }'
      ].join('\n');
      document.head.appendChild(vsA11y);
    }
  }

  if (typeof window !== 'undefined' && window.AlloModules && window.AlloModules.VideoStudio) {
    console.log('[CDN] VideoStudio already loaded, skipping duplicate');
    return;
  }

  // ─── Shared pure logic ─────────────────────────────────────────────────────
  // [VS_SHARED_BEGIN] This block is duplicated verbatim inside
  // video_studio/video_studio.html (the popup cannot import this module).
  // tests/video_studio.test.js pins the two copies byte-identical — if you edit
  // here, paste the same block there.

  // Seconds → 'HH:MM:SS.mmm' (WebVTT timestamp).
  function vsFormatTimestamp(seconds) {
    var s = Math.max(0, Number(seconds) || 0);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = Math.floor(s % 60);
    var ms = Math.round((s - Math.floor(s)) * 1000);
    if (ms === 1000) { ms = 0; sec += 1; if (sec === 60) { sec = 0; m += 1; if (m === 60) { m = 0; h += 1; } } }
    var pad = function (n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; };
    return pad(h, 2) + ':' + pad(m, 2) + ':' + pad(sec, 2) + '.' + pad(ms, 3);
  }

  // Cues [{start,end,text}] (seconds) → WebVTT file text. Drops empty/invalid
  // cues, clamps end>start, strips newlines inside a cue (one line per cue).
  function vsBuildVtt(cues) {
    var out = ['WEBVTT', ''];
    var list = Array.isArray(cues) ? cues : [];
    var n = 0;
    for (var i = 0; i < list.length; i++) {
      var c = list[i] || {};
      var text = String(c.text || '').replace(/[\r\n]+/g, ' ').trim();
      var start = Number(c.start), end = Number(c.end);
      if (!text || !isFinite(start) || !isFinite(end)) continue;
      if (end <= start) end = start + 0.5;
      n += 1;
      out.push(String(n));
      out.push(vsFormatTimestamp(start) + ' --> ' + vsFormatTimestamp(end));
      out.push(text);
      out.push('');
    }
    return out.join('\n');
  }

  // WebVTT text → cues [{start,end,text}]. Tolerant: ignores NOTE/STYLE blocks,
  // numeric cue identifiers, and cue settings after the end timestamp.
  function vsParseVtt(text) {
    var cues = [];
    if (typeof text !== 'string') return cues;
    var toSec = function (ts) {
      var m = /^(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{3})$/.exec(ts.trim());
      if (!m) return null;
      return (Number(m[1] || 0) * 3600) + (Number(m[2]) * 60) + Number(m[3]) + (Number(m[4]) / 1000);
    };
    var blocks = text.replace(/\r/g, '').split(/\n\n+/);
    for (var i = 0; i < blocks.length; i++) {
      var lines = blocks[i].split('\n').filter(function (l) { return l.trim() !== ''; });
      for (var j = 0; j < lines.length; j++) {
        var tm = /^(\S+)\s+-->\s+(\S+)/.exec(lines[j]);
        if (!tm) continue;
        var start = toSec(tm[1]), end = toSec(tm[2]);
        var body = lines.slice(j + 1).join(' ').trim();
        if (start != null && end != null && body) cues.push({ start: start, end: end, text: body });
        break;
      }
    }
    return cues;
  }

  // Trim math: full duration + trimStart/trimEnd (seconds cut off each end) →
  // { segments: [{start,end}], duration } describing what is KEPT. Guards
  // against inverted/overlong trims (returns at least a 0.1s segment).
  function vsComputeSegments(fullDuration, trimStart, trimEnd) {
    var dur = Math.max(0, Number(fullDuration) || 0);
    var ts = Math.max(0, Math.min(Number(trimStart) || 0, dur));
    var te = Math.max(0, Math.min(Number(trimEnd) || 0, dur));
    var start = ts, end = dur - te;
    if (end - start < 0.1) {
      if (start >= dur) { start = Math.max(0, dur - 0.1); }
      end = Math.min(dur, start + 0.1);
    }
    return { segments: [{ start: start, end: end }], duration: Math.max(0, end - start) };
  }

  // Chromium's MediaRecorder writes WebM with NO Duration in Segment>Info, so
  // the seekbar is broken until fully buffered. This patches the header the
  // fix-webm-duration way: locate Segment>Info, and if Duration (0x4489) is
  // absent, splice in a float64 Duration element. Returns a NEW Uint8Array, or
  // the ORIGINAL buffer when Duration already exists, parsing fails, or the
  // Segment has a known size (MediaRecorder always streams unknown-size; a
  // known size would need resizing too — bail honestly rather than corrupt).
  function vsPatchWebmDuration(bytes, durationMs) {
    try {
      var u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      var durMs = Number(durationMs);
      if (!(durMs > 0) || u8.length < 8) return u8;
      var pos = 0;
      var readVintLen = function (b) { for (var i = 0; i < 8; i++) { if (b & (0x80 >> i)) return i + 1; } return -1; };
      var readId = function () {
        var len = readVintLen(u8[pos]); if (len < 1 || pos + len > u8.length) return null;
        var v = 0; for (var i = 0; i < len; i++) v = v * 256 + u8[pos + i];
        pos += len; return v;
      };
      var readSize = function () {
        var len = readVintLen(u8[pos]); if (len < 1 || pos + len > u8.length) return null;
        var first = u8[pos] & (0xFF >> len);
        var v = first, allOnes = first === (0xFF >> len);
        for (var i = 1; i < len; i++) { v = v * 256 + u8[pos + i]; if (u8[pos + i] !== 0xFF) allOnes = false; }
        pos += len;
        return { value: v, unknown: allOnes, length: len };
      };
      // EBML header
      var id = readId(); if (id !== 0x1A45DFA3) return u8;
      var sz = readSize(); if (!sz || sz.unknown) return u8;
      pos += sz.value;
      // Segment
      id = readId(); if (id !== 0x18538067) return u8;
      sz = readSize(); if (!sz) return u8;
      if (!sz.unknown) return u8; // known-size Segment: patching would desync it
      // Walk Segment children for Info (0x1549A966)
      var limit = u8.length;
      while (pos < limit) {
        var childStart = pos;
        var cid = readId(); if (cid == null) return u8;
        var csz = readSize(); if (!csz || csz.unknown) return u8;
        var bodyStart = pos;
        if (cid === 0x1549A966) {
          // Scan Info children for Duration (0x4489) + TimestampScale (0x2AD7B1)
          var scale = 1000000;
          var scanEnd = bodyStart + csz.value;
          while (pos < scanEnd) {
            var iid = readId(); if (iid == null) return u8;
            var isz = readSize(); if (!isz || isz.unknown) return u8;
            if (iid === 0x4489) return u8; // Duration already present
            if (iid === 0x2AD7B1) {
              var sv = 0; for (var k = 0; k < isz.value; k++) sv = sv * 256 + u8[pos + k];
              if (sv > 0) scale = sv;
            }
            pos += isz.value;
          }
          // Build Duration element: ID 0x44 0x89, size 0x88 (8), float64 BE value
          var durValue = durMs * 1000000 / scale; // Matroska Duration is in TimestampScale units
          var durEl = new Uint8Array(11);
          durEl[0] = 0x44; durEl[1] = 0x89; durEl[2] = 0x88;
          var dv = new DataView(durEl.buffer);
          dv.setFloat64(3, durValue, false);
          // New Info size (old + 11); re-encode with minimal vint length. Because
          // the Segment size is unknown, byte-count changes downstream are safe.
          var newBody = csz.value + 11;
          var vintLen = 1; while (vintLen <= 8 && newBody >= Math.pow(2, 7 * vintLen) - 1) vintLen++;
          if (vintLen > 8) return u8;
          var sizeBytes = new Uint8Array(vintLen);
          var rem = newBody;
          for (var b = vintLen - 1; b >= 0; b--) { sizeBytes[b] = rem & 0xFF; rem = Math.floor(rem / 256); }
          sizeBytes[0] |= (0x80 >> (vintLen - 1));
          var idLen = 4; // 0x1549A966 is a 4-byte ID
          var out = new Uint8Array(u8.length - csz.length + vintLen + 11);
          var o = 0;
          out.set(u8.subarray(0, childStart + idLen), o); o += childStart + idLen;
          out.set(sizeBytes, o); o += vintLen;
          out.set(u8.subarray(bodyStart, bodyStart + csz.value), o); o += csz.value;
          out.set(durEl, o); o += 11;
          out.set(u8.subarray(bodyStart + csz.value), o);
          return out;
        }
        pos = bodyStart + csz.value;
        if (pos <= childStart) return u8; // no forward progress — malformed
      }
      return u8;
    } catch (_) {
      return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    }
  }

  // Compact, pack-safe reference for Resource-History embedding. NEVER includes
  // video bytes — only metadata + an optional small thumbnail data-URI. The
  // guard drops oversized thumbnails so a pack entry stays in the tens of KB.
  function vsMakePackReference(meta) {
    var m = meta || {};
    var thumb = (typeof m.thumb === 'string' && m.thumb.indexOf('data:image/') === 0 && m.thumb.length <= 40000) ? m.thumb : null;
    return {
      type: 'videoRef',
      version: 1,
      title: String(m.title || 'Teacher video').slice(0, 200),
      durationSec: Math.max(0, Math.round(Number(m.duration) || 0)),
      sizeBytes: Math.max(0, Math.round(Number(m.size) || 0)),
      sha256: (typeof m.sha256 === 'string' && /^[0-9a-f]{64}$/i.test(m.sha256)) ? m.sha256.toLowerCase() : null,
      fileName: String(m.fileName || '').slice(0, 200) || null,
      hasCaptions: !!m.hasCaptions,
      hasVisualDescriptions: !!m.hasVisualDescriptions,
      hasChapters: !!m.hasChapters,
      hasTeachingInserts: !!m.hasTeachingInserts,
      hasVisualPrompts: !!m.hasVisualPrompts,
      hasVisualOverlays: !!m.hasVisualOverlays,
      hasMusicBed: !!m.hasMusicBed,
      resourceCueCount: Math.max(0, Math.min(999, Math.round(Number(m.resourceCueCount) || 0))),
      thumb: thumb,
      createdAt: m.createdAt || null
    };
  }

  // CRC-32 (IEEE, reflected) — backs the .allopack ZIP writer/reader below.
  var VS_CRC_TABLE = (function () {
    var t = [];
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c;
    }
    return t;
  })();
  function vsCrc32(bytes) {
    var c = -1;
    for (var i = 0; i < bytes.length; i++) c = (c >>> 8) ^ VS_CRC_TABLE[(c ^ bytes[i]) & 0xFF];
    return (c ^ -1) >>> 0;
  }

  // Minimal ZIP writer for .allopack bundles. STORE only (method 0 — video is
  // already compressed; zipping it again wastes time for ~0 gain) and fixed
  // 1980-01-01 timestamps, so identical inputs produce byte-identical bundles.
  // entries: [{name, data: Uint8Array}] — non-ASCII filename chars become '_'.
  function vsBuildZip(entries) {
    var list = Array.isArray(entries) ? entries : [];
    var enc = function (s) { var b = []; s = String(s); for (var i = 0; i < s.length; i++) { var code = s.charCodeAt(i); b.push(code >= 32 && code < 127 ? code : 95); } return new Uint8Array(b); };
    var u16 = function (v) { return [v & 255, (v >>> 8) & 255]; };
    var u32 = function (v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; };
    var chunks = [], central = [], offset = 0;
    for (var i = 0; i < list.length; i++) {
      var name = enc(list[i].name || ('file' + i));
      var data = list[i].data instanceof Uint8Array ? list[i].data : new Uint8Array(list[i].data || 0);
      var crc = vsCrc32(data);
      var head = new Uint8Array([].concat(u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0)));
      chunks.push(head, name, data);
      central.push({ name: name, crc: crc, size: data.length, offset: offset });
      offset += head.length + name.length + data.length;
    }
    var cdStart = offset, cdChunks = [], cdLen = 0;
    for (var j = 0; j < central.length; j++) {
      var e = central[j];
      var ch = new Uint8Array([].concat(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0x21), u32(e.crc), u32(e.size), u32(e.size), u16(e.name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(e.offset)));
      cdChunks.push(ch, e.name);
      cdLen += ch.length + e.name.length;
    }
    var eocd = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(central.length), u16(central.length), u32(cdLen), u32(cdStart), u16(0)));
    var out = new Uint8Array(offset + cdLen + eocd.length), o = 0;
    chunks.concat(cdChunks, [eocd]).forEach(function (c) { out.set(c, o); o += c.length; });
    return out;
  }

  // Inverse of vsBuildZip. Reads any STORE-method zip; entries with other
  // compression methods or failed CRC checks are skipped (never half-read).
  function vsReadZip(bytes) {
    var u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    var rd16 = function (p) { return u8[p] | (u8[p + 1] << 8); };
    var rd32 = function (p) { return (u8[p] | (u8[p + 1] << 8) | (u8[p + 2] << 16)) + (u8[p + 3] * 16777216); };
    var eocd = -1;
    for (var i = u8.length - 22; i >= 0 && i >= u8.length - 22 - 65557; i--) {
      if (rd32(i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) return [];
    var count = rd16(eocd + 10);
    var out = [], p = rd32(eocd + 16);
    for (var n = 0; n < count; n++) {
      if (p + 46 > u8.length || rd32(p) !== 0x02014b50) break;
      var method = rd16(p + 10), size = rd32(p + 24), nameLen = rd16(p + 28), extraLen = rd16(p + 30), commentLen = rd16(p + 32), lho = rd32(p + 42);
      var name = '';
      for (var c2 = 0; c2 < nameLen; c2++) name += String.fromCharCode(u8[p + 46 + c2]);
      if (method === 0 && lho + 30 <= u8.length && rd32(lho) === 0x04034b50) {
        var dataStart = lho + 30 + rd16(lho + 26) + rd16(lho + 28);
        var data = u8.slice(dataStart, dataStart + size);
        if (data.length === size && vsCrc32(data) === rd32(p + 16)) out.push({ name: name, data: data });
      }
      p += 46 + nameLen + extraLen + commentLen;
    }
    return out;
  }

  // Zoom/spotlight keyframes → camera state at a moment. Each keyframe is
  // {t, x, y, scale, dur}: at time t the camera eases (0.6s smoothstep ramp)
  // into `scale`× centered on (x, y) (both 0..1 of the frame), holds `dur`
  // seconds (default 3), then eases back out. Between keyframes the camera is
  // identity {scale:1, x:0.5, y:0.5}. Manual placement by design: browsers
  // cannot observe clicks in OTHER tabs/apps during screen capture, so a
  // Screen-Studio-style automatic zoom is not implementable in-browser —
  // pretending otherwise would just be a keyframe the teacher didn't place.
  function vsZoomState(keyframes, tSec) {
    var kfs = (Array.isArray(keyframes) ? keyframes : []).filter(function (k) { return k && isFinite(k.t) && Number(k.scale) > 1; }).sort(function (a, b) { return a.t - b.t; });
    var t = Number(tSec) || 0;
    var RAMP = 0.6;
    var best = null;
    for (var i = 0; i < kfs.length; i++) {
      var k = kfs[i];
      var dur = (k.dur != null && isFinite(k.dur)) ? Math.max(0.2, Number(k.dur)) : 3;
      if (t >= k.t - RAMP && t <= k.t + dur + RAMP) best = { k: k, dur: dur };
    }
    if (!best) return { scale: 1, x: 0.5, y: 0.5 };
    var smooth = function (u) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
    var fIn = smooth((t - (best.k.t - RAMP)) / RAMP);
    var fOut = smooth(((best.k.t + best.dur + RAMP) - t) / RAMP);
    var f = Math.min(fIn, fOut);
    var cl = function (v, d) { v = Number(v); return isFinite(v) ? Math.max(0, Math.min(1, v)) : d; };
    return {
      scale: 1 + (Math.min(4, Number(best.k.scale)) - 1) * f,
      x: 0.5 + (cl(best.k.x, 0.5) - 0.5) * f,
      y: 0.5 + (cl(best.k.y, 0.5) - 0.5) * f
    };
  }

  // Audio-edit state → gain at time t (take-absolute seconds). muteSpans
  // [{start,end}] are silenced ranges (order-tolerant, end-exclusive); volume
  // is a 0..2 master gain (200% can distort — the UI says so). "Remove audio
  // entirely" is the caller's job: it omits the audio track, not a gain of 0.
  function vsGainAt(muteSpans, volume, tSec) {
    var vol = Number(volume);
    if (!isFinite(vol)) vol = 1;
    vol = Math.max(0, Math.min(2, vol));
    var t = Number(tSec) || 0;
    var spans = Array.isArray(muteSpans) ? muteSpans : [];
    for (var i = 0; i < spans.length; i++) {
      var s = spans[i];
      if (!s) continue;
      var a = Number(s.start), b = Number(s.end);
      if (isFinite(a) && isFinite(b) && t >= Math.min(a, b) && t < Math.max(a, b)) return 0;
    }
    return vol;
  }

  function vsSanitizeMusicBed(raw, duration) {
    if (!raw) return null;
    var dur = Math.max(0.1, Number(duration) || 0.1);
    var start = Number(raw.start);
    if (!isFinite(start)) start = 0;
    start = Math.max(0, Math.min(dur, start));
    var end = Number(raw.end);
    if (!isFinite(end) || end <= start) end = dur;
    end = Math.max(start + 0.2, Math.min(dur, end));
    var clean = function (v, max) { return String(v || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); };
    var volume = Number(raw.volume);
    if (!isFinite(volume)) volume = 0.28;
    var fadeIn = Number(raw.fadeIn), fadeOut = Number(raw.fadeOut);
    return {
      id: clean(raw.id || 'music', 40) || 'music',
      name: clean(raw.name || raw.fileName || 'Background music', 90),
      start: start,
      end: end,
      volume: Math.max(0, Math.min(1.5, volume)),
      loop: raw.loop !== false,
      fadeIn: Math.max(0, Math.min(20, isFinite(fadeIn) ? fadeIn : 1.5)),
      fadeOut: Math.max(0, Math.min(20, isFinite(fadeOut) ? fadeOut : 2)),
      duck: raw.duck !== false,
      fileName: clean(raw.fileName || raw.name || 'music', 120),
      mimeType: clean(raw.mimeType || raw.type || 'audio/webm', 80),
      blob: raw.blob || null
    };
  }

  function vsMusicGainAt(music, tSec, speechActive) {
    var m = vsSanitizeMusicBed(music, Math.max(Number(music && music.end) || 0, Number(tSec) || 0, 0.1));
    if (!m) return 0;
    var t = Number(tSec) || 0;
    if (t < m.start || t > m.end) return 0;
    var g = m.volume;
    if (m.fadeIn > 0) g *= Math.min(1, Math.max(0, (t - m.start) / m.fadeIn));
    if (m.fadeOut > 0) g *= Math.min(1, Math.max(0, (m.end - t) / m.fadeOut));
    if (m.duck && speechActive) g *= 0.38;
    return Math.max(0, Math.min(1.5, g));
  }

  function vsOverlayFrameState(overlay, tSec) {
    var o = overlay || {};
    var start = Number(o.start) || 0;
    var end = Number(o.end);
    if (!isFinite(end) || end <= start) end = start + 4;
    var span = Math.max(0.1, end - start);
    var p = Math.max(0, Math.min(1, ((Number(tSec) || 0) - start) / span));
    var fade = Math.min(1, p / 0.16, (1 - p) / 0.16);
    var x = Number(o.x), y = Number(o.y), width = Number(o.width), scale = Number(o.scale);
    x = isFinite(x) ? Math.max(0, Math.min(1, x)) : 0.72;
    y = isFinite(y) ? Math.max(0, Math.min(1, y)) : 0.42;
    width = isFinite(width) ? Math.max(0.08, Math.min(0.9, width)) : 0.28;
    scale = isFinite(scale) ? Math.max(0.25, Math.min(3, scale)) : 1;
    var motion = String(o.motion || 'fade').toLowerCase().replace(/[\s-]+/g, '_');
    if (motion === 'slide_left') x += (1 - p) * 0.18;
    else if (motion === 'slide_right') x -= (1 - p) * 0.18;
    else if (motion === 'slide_up') y += (1 - p) * 0.18;
    else if (motion === 'slide_down') y -= (1 - p) * 0.18;
    else if (motion === 'drift_right') x += (p - 0.5) * 0.20;
    else if (motion === 'drift_left') x -= (p - 0.5) * 0.20;
    else if (motion === 'zoom_in') scale *= 0.86 + p * 0.22;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)), width: width, scale: scale, alpha: Math.max(0, fade), progress: p };
  }

  // Filler-word scan → proposed mute spans. words: [{word, start, end}] from a
  // word-level transcript. Detects pure verbal fillers (um/uh/erm/hmm variants)
  // and immediate stutter repeats ("the the"). Deliberately NOT "like"/"so"/
  // "well" — those are real words most of the time, and a false silence is
  // worse than a kept filler. Spans get 50ms padding and overlaps merge.
  function vsDetectFillerSpans(words) {
    var list = Array.isArray(words) ? words : [];
    var FILLER = /^(u+m+|u+h+|e+r+m*|h+m+m*|m+h?m+|a+h+e?m*)$/;
    var norm = function (w) { return String(w || '').toLowerCase().replace(/[^a-z']/g, ''); };
    var out = [];
    var prev = null;
    for (var i = 0; i < list.length; i++) {
      var w = list[i] || {};
      var s = Number(w.start), e = Number(w.end);
      var word = norm(w.word);
      if (!word || !isFinite(s) || !isFinite(e) || e <= s) { prev = null; continue; }
      if (FILLER.test(word)) {
        out.push({ start: Math.max(0, s - 0.05), end: e + 0.05, text: String(w.word || '').trim() });
      } else if (prev && word === prev.word && word.length >= 2 && !FILLER.test(prev.word) && (s - prev.end) < 0.4) {
        // Silence the FIRST of the pair so the sentence keeps its real word.
        out.push({ start: Math.max(0, prev.start - 0.05), end: prev.end + 0.05, text: 'repeated "' + String(w.word || '').trim() + '"' });
      }
      prev = { word: word, start: s, end: e };
    }
    out.sort(function (a, b) { return a.start - b.start; });
    var merged = [];
    for (var j = 0; j < out.length; j++) {
      var cur = out[j];
      var last = merged[merged.length - 1];
      if (last && cur.start <= last.end + 0.05) { last.end = Math.max(last.end, cur.end); last.text += ', ' + cur.text; }
      else merged.push({ start: cur.start, end: cur.end, text: cur.text });
    }
    return merged;
  }

  // AI edit suggestions arrive as UNTRUSTED JSON (model output). This is the
  // only door they come through: unknown types are dropped, every number is
  // clamped into the take's duration, strings are length-capped, and at most
  // 20 survive — so a hallucinated or hostile response can only ever propose
  // valid, human-reviewable edits, never execute anything.
  function vsSanitizeAiSuggestions(raw, duration) {
    var dur = Math.max(0.1, Number(duration) || 0.1);
    var list = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.suggestions) ? raw.suggestions : []);
    var clampT = function (v) { v = Number(v); return isFinite(v) ? Math.max(0, Math.min(dur, v)) : null; };
    var out = [];
    for (var i = 0; i < list.length && out.length < 20; i++) {
      var s = list[i] || {};
      var type = String(s.type || '');
      var why = String(s.reason || s.why || '').replace(/[\r\n]+/g, ' ').slice(0, 300);
      if (type === 'trim_start' || type === 'trim_end') {
        var secs = clampT(s.seconds);
        if (secs == null || secs <= 0 || secs >= dur) continue;
        out.push({ type: type, seconds: secs, reason: why });
      } else if (type === 'mute_span') {
        var a = clampT(s.start), b = clampT(s.end);
        if (a == null || b == null || b <= a) continue;
        out.push({ type: 'mute_span', start: a, end: b, reason: why });
      } else if (type === 'zoom') {
        var t = clampT(s.t != null ? s.t : s.start);
        if (t == null) continue;
        var x = Number(s.x), y = Number(s.y), sc = Number(s.scale), d = Number(s.dur);
        out.push({
          type: 'zoom', t: t,
          x: isFinite(x) ? Math.max(0, Math.min(1, x)) : 0.5,
          y: isFinite(y) ? Math.max(0, Math.min(1, y)) : 0.5,
          scale: isFinite(sc) ? Math.max(1.2, Math.min(4, sc)) : 2,
          dur: isFinite(d) ? Math.max(0.5, Math.min(30, d)) : 3,
          reason: why
        });
      } else if (type === 'title') {
        var txt = String(s.text || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 120);
        if (!txt) continue;
        out.push({ type: 'title', text: txt, reason: why });
      }
    }
    return out;
  }

  // AI narration scripts are untrusted model output. Clamp times into the
  // take, require text, cap 20 segments, sort, and push overlapping starts
  // apart so generated TTS clips never pile onto the same moment.
  function vsSanitizeNarrationCues(raw, duration) {
    var dur = Math.max(0.1, Number(duration) || 0.1);
    var list = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.segments) ? raw.segments : (raw && Array.isArray(raw.narration) ? raw.narration : []));
    var out = [];
    for (var i = 0; i < list.length && out.length < 20; i++) {
      var s = list[i] || {};
      var text = String(s.text || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 220);
      var a = Number(s.start), b = Number(s.end);
      if (!text || !isFinite(a)) continue;
      a = Math.max(0, Math.min(dur, a));
      b = isFinite(b) ? b : a + 4;
      b = Math.min(dur, Math.max(a + 0.8, b));
      if (b <= a) continue;
      out.push({ start: a, end: b, text: text });
    }
    out.sort(function (x, y) { return x.start - y.start; });
    for (var j = 1; j < out.length; j++) {
      if (out[j].start < out[j - 1].start + 0.5) out[j].start = out[j - 1].start + 0.5;
    }
    return out;
  }

  // AI visual descriptions are separate from spoken captions: they describe what
  // is visible on screen, with labels that make observation vs inference explicit.
  function vsSanitizeVisualDescriptions(raw, duration) {
    var dur = Math.max(0.1, Number(duration) || 0.1);
    var list = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.descriptions) ? raw.descriptions : (raw && Array.isArray(raw.segments) ? raw.segments : []));
    var out = [];
    var basisMap = {
      observed: 'observed',
      inference: 'inferred',
      inferred: 'inferred',
      source: 'source-supported',
      supported: 'source-supported',
      'source-supported': 'source-supported',
      'needs-review': 'needs-review',
      review: 'needs-review',
      uncertain: 'needs-review'
    };
    function confidence(v) {
      var n = Number(v);
      if (isFinite(n)) return n >= 0.75 ? 'high' : (n >= 0.45 ? 'medium' : 'low');
      v = String(v || 'medium').toLowerCase();
      return /high|medium|low/.test(v) ? v.match(/high|medium|low/)[0] : 'medium';
    }
    for (var i = 0; i < list.length && out.length < 24; i++) {
      var s = list[i] || {};
      var text = String(s.description || s.text || s.visual || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 280);
      var a = Number(s.start != null ? s.start : s.t), b = Number(s.end);
      if (!text || !isFinite(a)) continue;
      a = Math.max(0, Math.min(dur, a));
      b = isFinite(b) ? b : a + 4;
      b = Math.min(dur, Math.max(a + 0.8, b));
      if (b <= a) continue;
      var basis = String(s.basis || s.source || 'needs-review').toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
      out.push({ start: a, end: b, description: text, basis: basisMap[basis] || 'needs-review', confidence: confidence(s.confidence) });
    }
    out.sort(function (x, y) { return x.start - y.start; });
    return out;
  }

  function vsCleanCaptionText(text) {
    var s = String(text || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!s) return '';
    s = s.replace(/\bi\b/g, 'I').replace(/\bi'm\b/gi, "I'm").replace(/\bi'll\b/gi, "I'll");
    s = s.charAt(0).toUpperCase() + s.slice(1);
    if (!/[.!?]$/.test(s)) s += '.';
    return s.slice(0, 300);
  }

  function vsPolishCaptions(cues, duration) {
    var dur = Math.max(0.1, Number(duration) || 0.1);
    var list = (Array.isArray(cues) ? cues : []).slice().sort(function (a, b) { return Number(a && a.start) - Number(b && b.start); });
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var c = list[i] || {};
      var text = vsCleanCaptionText(c.text);
      var a = Number(c.start), b = Number(c.end);
      if (!text || !isFinite(a)) continue;
      a = Math.max(0, Math.min(dur, a));
      b = isFinite(b) ? Math.max(a + 0.4, b) : a + 2;
      b = Math.max(a + 0.4, Math.min(dur, b));
      var last = out[out.length - 1];
      var tail = text.replace(/[.!?]$/, '');
      if (tail && /^[A-Z][a-z]/.test(tail) && !/^(I|I'm|I'll)\b/.test(tail)) tail = tail.charAt(0).toLowerCase() + tail.slice(1);
      var combined = last ? vsCleanCaptionText(String(last.text || '').replace(/[.!?]$/, '') + ' ' + tail) : '';
      if (last && a - last.end <= 0.25 && combined.length <= 150) {
        last.end = Math.max(last.end, b);
        last.text = combined;
      } else {
        out.push({ start: a, end: b, text: text });
      }
    }
    return out;
  }

  function vsChapterTitleFromText(text) {
    var words = String(text || '').replace(/[\r\n]+/g, ' ').replace(/[^A-Za-z0-9' -]+/g, '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return 'New section';
    var kept = words.slice(0, 7).join(' ');
    kept = kept.charAt(0).toUpperCase() + kept.slice(1);
    return kept.length > 64 ? kept.slice(0, 61) + '...' : kept;
  }

  function vsBuildChapters(cues, duration) {
    var dur = Math.max(0, Number(duration) || 0);
    var caps = vsPolishCaptions(cues, Math.max(dur, 0.1));
    if (!caps.length) return dur ? [{ start: 0, title: 'Start' }] : [];
    var chapters = [];
    var lastStart = -999;
    var cueSignalsSection = function (txt) {
      return /^(now|next|first|second|third|finally|last|let'?s|we are going to|we're going to|try this|your turn)\b/i.test(String(txt || '').trim());
    };
    for (var i = 0; i < caps.length; i++) {
      var c = caps[i];
      var gap = i ? (c.start - caps[i - 1].end) : 999;
      var shouldStart = i === 0 || (c.start - lastStart >= 45 && (gap >= 6 || cueSignalsSection(c.text))) || (c.start - lastStart >= 90);
      if (shouldStart && chapters.length < 16) {
        chapters.push({ start: Math.max(0, c.start), title: vsChapterTitleFromText(c.text) });
        lastStart = c.start;
      }
    }
    if (chapters.length && chapters[0].start > 1) chapters.unshift({ start: 0, title: 'Opening' });
    return chapters;
  }

  function vsSanitizeTeachingInserts(raw, duration) {
    var dur = Math.max(0.1, Number(duration) || 0.1);
    var list = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.inserts) ? raw.inserts : (raw && Array.isArray(raw.cards) ? raw.cards : (raw && Array.isArray(raw.suggestions) ? raw.suggestions : [])));
    var out = [];
    var typeMap = {
      title: 'title_card',
      section: 'title_card',
      title_card: 'title_card',
      card: 'title_card',
      pause: 'pause_prompt',
      question: 'pause_prompt',
      pause_prompt: 'pause_prompt',
      callout: 'callout',
      label: 'callout',
      arrow: 'callout',
      sticker: 'sticker',
      gif: 'sticker',
      animated_sticker: 'sticker',
      image: 'visual_card',
      generated_image: 'visual_card',
      visual_card: 'visual_card',
      image_overlay: 'image_overlay',
      overlay: 'image_overlay',
      uploaded_image: 'image_overlay',
      resource_image: 'image_overlay'
    };
    var themes = { blue: 1, green: 1, amber: 1, pink: 1, slate: 1 };
    var anims = { none: 1, pulse: 1, bounce: 1, sparkle: 1 };
    var motions = { none: 1, fade: 1, slide_left: 1, slide_right: 1, slide_up: 1, slide_down: 1, drift_right: 1, drift_left: 1, zoom_in: 1 };
    var clamp01 = function (v, d) { v = Number(v); return isFinite(v) ? Math.max(0, Math.min(1, v)) : d; };
    for (var i = 0; i < list.length && out.length < 32; i++) {
      var s = list[i] || {};
      var typeKey = String(s.type || s.kind || '').toLowerCase().replace(/[\s-]+/g, '_');
      var type = typeMap[typeKey];
      if (!type) continue;
      var start = Number(s.start != null ? s.start : s.t);
      if (!isFinite(start)) continue;
      start = Math.max(0, Math.min(dur, start));
      var end = Number(s.end);
      var dflt = type === 'title_card' || type === 'pause_prompt' || type === 'visual_card' ? 4 : (type === 'image_overlay' ? 5 : 3);
      var span = isFinite(end) ? (end - start) : Number(s.duration != null ? s.duration : s.dur);
      if (!isFinite(span) || span <= 0) span = dflt;
      span = Math.max(0.6, Math.min(type === 'callout' || type === 'sticker' || type === 'image_overlay' ? 20 : 15, span));
      var text = String(s.text || s.title || s.label || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 180);
      if (!text && type !== 'sticker' && type !== 'visual_card' && type !== 'image_overlay') continue;
      var note = String(s.note || s.subtext || s.prompt || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 240);
      var imageSrc = String(s.imageSrc || s.image || s.src || '').trim();
      if (imageSrc && imageSrc.indexOf('data:image/') !== 0) imageSrc = '';
      if (type === 'image_overlay' && !imageSrc) continue;
      var motion = String(s.motion || '').toLowerCase().replace(/[\s-]+/g, '_');
      var width = Number(s.width != null ? s.width : s.w);
      var scale = Number(s.scale);
      out.push({
        id: String(s.id || ('ins' + (i + 1))).slice(0, 40),
        type: type,
        start: start,
        end: Math.min(dur, start + span),
        text: text || (type === 'sticker' ? 'Key idea' : ''),
        note: note,
        x: clamp01(s.x, type === 'callout' || type === 'sticker' ? 0.68 : (type === 'image_overlay' ? 0.72 : 0.5)),
        y: clamp01(s.y, type === 'callout' || type === 'sticker' ? 0.34 : (type === 'image_overlay' ? 0.42 : 0.5)),
        width: isFinite(width) ? Math.max(0.08, Math.min(0.9, width)) : (type === 'image_overlay' ? 0.28 : 0.46),
        scale: isFinite(scale) ? Math.max(0.25, Math.min(3, scale)) : 1,
        motion: motions[motion] ? motion : (type === 'image_overlay' ? 'fade' : 'none'),
        theme: themes[String(s.theme || '').toLowerCase()] ? String(s.theme).toLowerCase() : 'blue',
        animation: anims[String(s.animation || '').toLowerCase()] ? String(s.animation).toLowerCase() : (type === 'sticker' ? 'pulse' : 'none'),
        imageSrc: imageSrc,
        source: String(s.source || '').slice(0, 40),
        resourceId: String(s.resourceId || '').slice(0, 80),
        resourceTitle: String(s.resourceTitle || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 120)
      });
    }
    out.sort(function (a, b) { return a.start - b.start || a.end - b.end; });
    return out;
  }

  function vsBuildResourceCues(history, options) {
    var list = Array.isArray(history) ? history : [];
    var opts = options || {};
    var out = [];
    var max = Math.max(1, Math.min(200, Number(opts.limit) || 120));
    var clean = function (v, n) { return String(v || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n); };
    var safeImg = function (v) {
      v = String(v || '').trim();
      return (v.indexOf('data:image/') === 0 && v.length <= 1200000) ? v : '';
    };
    var push = function (cue) {
      if (!cue || out.length >= max) return;
      var label = clean(cue.label || cue.title || cue.term || cue.question || cue.text, 140);
      var text = clean(cue.text || cue.definition || cue.question || cue.prompt || label, 520);
      if (!label && !text && !cue.imageSrc) return;
      out.push({
        id: clean(cue.id || ('cue' + (out.length + 1)), 90),
        kind: clean(cue.kind || 'resource', 40),
        label: label || 'Resource cue',
        text: text,
        imageSrc: safeImg(cue.imageSrc),
        prompt: clean(cue.prompt || text || label, 600),
        sourceType: clean(cue.sourceType || cue.type || 'resource', 50),
        sourceTitle: clean(cue.sourceTitle || '', 140),
        sourceIndex: Math.max(0, Math.round(Number(cue.sourceIndex) || 0))
      });
    };
    list.forEach(function (item, idx) {
      if (!item) return;
      var type = clean(item.type || item.kind || '', 50).toLowerCase();
      var title = clean(item.title || item.name || item.label || type || 'Resource', 140);
      var data = item.data != null ? item.data : item.content;
      var baseId = clean(item.id || item.resourceId || ('history-' + idx), 60);
      if (type === 'glossary' && Array.isArray(data)) {
        data.slice(0, 80).forEach(function (g, gi) {
          var term = clean(g && (g.term || g.word || g.label), 120);
          var def = clean(g && (g.definition || g.def || g.description || g.meaning), 520);
          push({
            id: baseId + '-term-' + gi,
            kind: 'glossary',
            label: term || ('Term ' + (gi + 1)),
            text: def,
            imageSrc: g && (g.image || g.imageUrl || g.imageSrc),
            prompt: term ? ('Create a clear visual support for the glossary term "' + term + '". Definition: ' + def) : def,
            sourceType: type,
            sourceTitle: title,
            sourceIndex: idx
          });
        });
      } else if (type === 'image' || type === 'visual' || type === 'visuals') {
        var img = data && (data.imageUrl || data.image || data.src || data.dataUrl);
        push({
          id: baseId + '-image',
          kind: 'image',
          label: title,
          text: clean((data && (data.alt || data.altText || data.caption || data.prompt)) || item.prompt || title, 520),
          imageSrc: img,
          prompt: clean((data && data.prompt) || item.prompt || title, 600),
          sourceType: type,
          sourceTitle: title,
          sourceIndex: idx
        });
      } else if (type === 'quiz' || type === 'assessment') {
        var qs = Array.isArray(data) ? data : (data && (data.questions || data.items));
        (Array.isArray(qs) ? qs : []).slice(0, 24).forEach(function (q, qi) {
          push({
            id: baseId + '-q-' + qi,
            kind: 'question',
            label: clean(q && (q.question || q.prompt || q.text), 120) || ('Question ' + (qi + 1)),
            text: clean(q && (q.question || q.prompt || q.text), 520),
            prompt: clean(q && (q.question || q.prompt || q.text), 600),
            sourceType: type,
            sourceTitle: title,
            sourceIndex: idx
          });
        });
      } else if (type === 'outline' || type === 'lesson-plan' || type === 'lesson_plan') {
        var rawSections = Array.isArray(data) ? data : (data && (data.sections || data.items || data.outline));
        (Array.isArray(rawSections) ? rawSections : []).slice(0, 24).forEach(function (s, si) {
          push({
            id: baseId + '-section-' + si,
            kind: 'section',
            label: clean(s && (s.title || s.heading || s.topic || s.text), 120) || ('Section ' + (si + 1)),
            text: clean(s && (s.summary || s.text || s.description || s.details), 520),
            sourceType: type,
            sourceTitle: title,
            sourceIndex: idx
          });
        });
      } else {
        var txt = clean(typeof data === 'string' ? data : (data && (data.text || data.summary || data.markdown || data.html)) || item.text || item.summary, 520);
        if (txt || title) {
          push({
            id: baseId + '-resource',
            kind: type || 'resource',
            label: title,
            text: txt,
            sourceType: type || 'resource',
            sourceTitle: title,
            sourceIndex: idx
          });
        }
      }
    });
    return out;
  }

  // Lesson structure proposals are untrusted model output. They become editable,
  // unchecked finishing ideas: title cards, chapters, questions, callouts, zooms,
  // still-image prompts, and short motion-sticker/GIF prompts.
  function vsSanitizeLessonPlan(raw, duration) {
  var dur = Math.max(0.1, Number(duration) || 0.1);
  var list = Array.isArray(raw) ? raw : (raw && (Array.isArray(raw.suggestions) ? raw.suggestions : (Array.isArray(raw.items) ? raw.items : (Array.isArray(raw.plan) ? raw.plan : (Array.isArray(raw.lessonPlan) ? raw.lessonPlan : [])))));
  var out = [];
  var typeMap = {
  title: 'title_card',
  title_card: 'title_card',
  chapter: 'chapter',
  pause: 'pause_question',
  pause_question: 'pause_question',
  question: 'pause_question',
  recap: 'recap',
  vocabulary: 'vocab',
  vocab: 'vocab',
  callout: 'callout',
  label: 'callout',
  zoom: 'zoom',
  image: 'image_prompt',
  image_prompt: 'image_prompt',
  still_prompt: 'image_prompt',
  visual_insert: 'image_prompt',
  motion: 'motion_sticker',
  motion_sticker: 'motion_sticker',
  gif: 'motion_sticker',
  gif_prompt: 'motion_sticker'
  };
  var styleMap = { label: 'label', box: 'box', spotlight: 'spotlight', arrow: 'arrow' };
  function clean(v, max) { return String(v || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); }
  function clamp01(v, fallback) {
  v = Number(v);
  return isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
  }
  function time(v, fallback) {
  v = Number(v);
  return isFinite(v) ? Math.max(0, Math.min(dur, v)) : fallback;
  }
  for (var i = 0; i < list.length && out.length < 16; i++) {
  var s = list[i] || {};
  var rawType = String(s.type || s.kind || '').toLowerCase().replace(/[\s-]+/g, '_');
  var type = typeMap[rawType];
  if (!type) continue;
  var start = time(s.start != null ? s.start : (s.t != null ? s.t : s.time), type === 'title_card' ? 0 : NaN);
  if (!isFinite(start)) continue;
  var end = time(s.end, NaN);
  var span = Math.max(0.8, Math.min(30, Number(s.dur != null ? s.dur : s.duration) || 4));
  if (!isFinite(end)) end = Math.min(dur, start + span);
  end = Math.min(dur, Math.max(start + 0.8, end));
  var text = clean(s.text || s.question || s.description || s.title || '', 280);
  var label = clean(s.label || s.heading || s.title || text, 90);
  var prompt = clean(s.prompt || s.visualPrompt || s.instruction || text, 600);
  var item = {
  type: type,
  start: start,
  end: end,
  text: text,
  label: label,
  reason: clean(s.reason || s.why || '', 240)
  };
  if (type === 'image_prompt' || type === 'motion_sticker') {
  if (!prompt) continue;
  item.prompt = prompt;
  } else if (type !== 'zoom' && !text && !label) {
  continue;
  }
  if (type === 'callout' || type === 'chapter' || type === 'pause_question' || type === 'recap' || type === 'vocab') {
  item.x = clamp01(s.x, 0.5);
  item.y = clamp01(s.y, 0.5);
  var st = String(s.style || s.calloutType || '').toLowerCase().replace(/[\s-]+/g, '_');
  item.style = styleMap[st] || (type === 'pause_question' ? 'box' : 'label');
  }
  if (type === 'zoom') {
  item.x = clamp01(s.x, 0.5);
  item.y = clamp01(s.y, 0.5);
  item.scale = Math.max(1.5, Math.min(4, Number(s.scale) || 2));
  item.dur = Math.max(0.5, Math.min(30, Number(s.dur != null ? s.dur : s.duration) || 3));
  }
  out.push(item);
  }
  out.sort(function (a, b) { return a.start - b.start; });
  return out;
  }

  // 16-bit mono PCM bytes → WAV container (24kHz default — Gemini TTS output).
  // Mirrors the app's tts_module pcmToWav; pure byte assembly.
function vsPcmToWav(pcmBytes, sampleRate) {
    var pcm = pcmBytes instanceof Uint8Array ? pcmBytes : new Uint8Array(pcmBytes || 0);
    var sr = Number(sampleRate) > 0 ? Math.round(Number(sampleRate)) : 24000;
    var out = new Uint8Array(44 + pcm.length);
    var dv = new DataView(out.buffer);
    var wstr = function (off, s) { for (var i = 0; i < s.length; i++) out[off + i] = s.charCodeAt(i); };
    wstr(0, 'RIFF'); dv.setUint32(4, 36 + pcm.length, true); wstr(8, 'WAVE');
    wstr(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
    wstr(36, 'data'); dv.setUint32(40, pcm.length, true);
    out.set(pcm, 44);
    return out;
  }

  // PCM samples → N peak buckets (0..1) for waveform drawing. Peak (not RMS)
  // per bucket so brief loud moments — the ones worth finding — stay visible.
  function vsComputePeaks(samples, buckets) {
    var n = samples ? samples.length : 0;
    var B = Math.max(10, Math.min(4000, Math.round(Number(buckets) || 0) || 600));
    var out = [];
    if (!n) { for (var z = 0; z < B; z++) out.push(0); return out; }
    var per = n / B;
    for (var b = 0; b < B; b++) {
      var s = Math.floor(b * per);
      var e = Math.min(n, Math.max(s + 1, Math.floor((b + 1) * per)));
      var m = 0;
      for (var i = s; i < e; i++) { var v = Math.abs(Number(samples[i]) || 0); if (v > m) m = v; }
      out.push(Math.min(1, m));
    }
    return out;
  }
  // [VS_SHARED_END]

  var VS_HELPERS = { vsFormatTimestamp: vsFormatTimestamp, vsBuildVtt: vsBuildVtt, vsParseVtt: vsParseVtt, vsComputeSegments: vsComputeSegments, vsPatchWebmDuration: vsPatchWebmDuration, vsMakePackReference: vsMakePackReference, vsCrc32: vsCrc32, vsBuildZip: vsBuildZip, vsReadZip: vsReadZip, vsZoomState: vsZoomState, vsGainAt: vsGainAt, vsSanitizeMusicBed: vsSanitizeMusicBed, vsMusicGainAt: vsMusicGainAt, vsOverlayFrameState: vsOverlayFrameState, vsBuildResourceCues: vsBuildResourceCues, vsDetectFillerSpans: vsDetectFillerSpans, vsSanitizeAiSuggestions: vsSanitizeAiSuggestions, vsComputePeaks: vsComputePeaks, vsSanitizeNarrationCues: vsSanitizeNarrationCues, vsSanitizeVisualDescriptions: vsSanitizeVisualDescriptions, vsSanitizeLessonPlan: vsSanitizeLessonPlan, vsCleanCaptionText: vsCleanCaptionText, vsPolishCaptions: vsPolishCaptions, vsBuildChapters: vsBuildChapters, vsSanitizeTeachingInserts: vsSanitizeTeachingInserts, vsPcmToWav: vsPcmToWav };
  if (typeof module !== 'undefined' && module.exports) module.exports = VS_HELPERS;
  if (typeof window === 'undefined') return;
  if (typeof React === 'undefined' || !React.createElement) {
    // Test/SSR surface without React: expose the pure helpers on a stub so
    // window.AlloModules.VideoStudio.* is still reachable (tests pin these).
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.VideoStudio = Object.assign(function VideoStudioUnavailable() { return null; }, VS_HELPERS);
    return;
  }

  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useCallback = React.useCallback;

  var STUDIO_URL = 'https://alloflow-cdn.pages.dev/video_studio/video_studio.html?v=1';

  function makeT(t) {
    return function (key, fallback) {
      if (typeof t === 'function') {
        try { var v = t(key); if (v && v !== key) return v; } catch (_) {}
      }
      return fallback;
    };
  }

  function announce(msg) {
    var el = document.getElementById('allo-live-video-studio');
    if (el) el.textContent = msg;
  }

  function extFor(type) {
    if (/mp4|m4v/i.test(type || '')) return '.mp4';
    if (/quicktime/i.test(type || '')) return '.mov';
    if (/matroska/i.test(type || '')) return '.mkv';
    return '.webm';
  }
  function fmtBytes(n) {
    n = Number(n) || 0;
    if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB';
    if (n >= 1024) return (n / 1024).toFixed(0) + ' KB';
    return n + ' B';
  }
  function fmtDur(s) {
    s = Math.max(0, Math.round(Number(s) || 0));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  function downloadBlob(blob, name) {
    try {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a); a.click();
      setTimeout(function () { try { URL.revokeObjectURL(a.href); a.remove(); } catch (_) {} }, 4000);
      return true;
    } catch (_) { return false; }
  }
  async function sha256Hex(blob) {
    try {
      var buf = await blob.arrayBuffer();
      var digest = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(digest)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    } catch (_) { return null; }
  }

  // ─── Component ─────────────────────────────────────────────────────────────
  function VideoStudio(props) {
    var onClose = props.onClose || function () {};
    var addToast = props.addToast || function () {};
    var T = makeT(props.t);

    var _st = useState('closed'); var studioState = _st[0], setStudioState = _st[1]; // closed | opening | open | blocked
    var _vd = useState([]); var videos = _vd[0], setVideos = _vd[1];
    var studioWinRef = useRef(null);
    var rootRef = useRef(null);

    // postMessage receiver — accepts messages ONLY from the window we opened.
    useEffect(function () {
      function onMsg(ev) {
        if (!ev || !ev.data || typeof ev.data.type !== 'string') return;
        if (!studioWinRef.current || ev.source !== studioWinRef.current) return;
        if (ev.data.type === 'allostudio-ready') {
          setStudioState('open');
          announce(T('video_studio.ready', 'Video Studio window is ready.'));
        } else if (ev.data.type === 'allostudio-ai-request') {
          // The Studio popup has no Gemini access of its own — it sends the
          // TRANSCRIPT TEXT here (never video/audio bytes) and this relays it
          // through the app's normal callGemini. The popup hard-sanitizes the
          // response (vsSanitizeAiSuggestions) before showing anything.
          var req = ev.data;
          var replyTo = studioWinRef.current;
          var respond = function (payload) {
            try { if (replyTo && !replyTo.closed) replyTo.postMessage(Object.assign({ type: 'allostudio-ai-response', id: req.id }, payload), '*'); } catch (_) {}
          };
          if (typeof props.callGemini !== 'function') { respond({ error: 'ai-unavailable' }); return; }
          var durSec = Math.max(1, Math.round(Number(req.duration) || 0));
          var prompt = 'You are reviewing the transcript of a teacher\'s instructional video to suggest a FEW high-value edits.\n' +
            'Respond with ONLY a JSON array (no prose, no markdown fences). Each item has "type", "reason" (short, plain), and type-specific fields:\n' +
            '- {"type":"trim_start","seconds":N} or {"type":"trim_end","seconds":N} — cut dead air or false starts at the edges\n' +
            '- {"type":"mute_span","start":S,"end":S} — silence ONLY off-topic asides or spoken personal names (audio is muted, video keeps playing)\n' +
            '- {"type":"zoom","t":S,"x":0..1,"y":0..1,"scale":1.5-3,"dur":S} — only when the speaker clearly directs attention ("look here", "this graph")\n' +
            '- {"type":"title","text":"..."} — a clearer video title\n' +
            'Rules: at most 8 suggestions; only clearly beneficial ones; an empty array [] is a good answer for a clean video; never invent timestamps outside 0-' + durSec + 's.\n' +
            'Video duration: ' + durSec + ' seconds. Current title: ' + String(req.title || '(none)').slice(0, 120) + '\n' +
            'Transcript with [start-end] second markers:\n' + String(req.transcript || '').slice(0, 24000);
          Promise.resolve().then(function () { return props.callGemini(prompt, false, true); }).then(function (res) {
            var text = (typeof res === 'string') ? res : ((res && (res.text || res.output)) || JSON.stringify(res));
            var parsed = null;
            try { parsed = JSON.parse(text); } catch (_) {
              var m = /\[[\s\S]*\]/.exec(String(text || ''));
              if (m) { try { parsed = JSON.parse(m[0]); } catch (_2) {} }
            }
            respond({ suggestions: parsed || [] });
          }).catch(function (e) {
            respond({ error: String((e && e.message) || e).slice(0, 200) });
          });
        } else if (ev.data.type === 'allostudio-narrate-request') {
          // AI narration: the popup sends ONE contact-sheet JPEG (sampled
          // frames with burned-in timestamps) — never the raw video — and we
          // relay it through the app's vision call. The popup sanitizes the
          // returned script (vsSanitizeNarrationCues) before showing it.
          var nreq = ev.data;
          var nReplyTo = studioWinRef.current;
          var nRespond = function (payload) {
            try { if (nReplyTo && !nReplyTo.closed) nReplyTo.postMessage(Object.assign({ type: 'allostudio-narrate-response', id: nreq.id }, payload), '*'); } catch (_) {}
          };
          var visionFn = (typeof window !== 'undefined') ? window.callGeminiVision : null;
          if (typeof visionFn !== 'function') { nRespond({ error: 'vision-unavailable' }); return; }
          var nDur = Math.max(1, Math.round(Number(nreq.duration) || 0));
          var stamps = Array.isArray(nreq.timestamps) ? nreq.timestamps.map(function (x) { return Math.round(Number(x) || 0); }).join('s, ') + 's' : '';
          var nPrompt = 'You are writing a short TEACHER NARRATION script for an instructional video.\n' +
            'The image is a contact sheet of frames from the video, in reading order; each cell has its timestamp (in seconds) burned into its corner. Frame timestamps: ' + stamps + '. Total video length: ' + nDur + ' seconds.\n' +
            (nreq.context ? ('Existing transcript/captions for context:\n' + String(nreq.context).slice(0, 6000) + '\n') : '') +
            'Write 5-12 narration segments that a teacher could speak over this video: plain, warm, grade-appropriate language; describe what is happening on screen and why it matters; never invent details you cannot see.\n' +
            'Respond with ONLY a JSON array (no prose, no fences): [{"start": seconds, "end": seconds, "text": "one or two spoken sentences"}]. Segments must be in order, within 0-' + nDur + 's, and short enough to speak in their time window.';
          Promise.resolve().then(function () { return visionFn(nPrompt, nreq.imageBase64, nreq.mimeType || 'image/jpeg'); }).then(function (res) {
            var text = (typeof res === 'string') ? res : ((res && (res.text || res.output)) || JSON.stringify(res));
            var parsed = null;
            try { parsed = JSON.parse(text); } catch (_) {
              var mm = /\[[\s\S]*\]/.exec(String(text || ''));
              if (mm) { try { parsed = JSON.parse(mm[0]); } catch (_2) {} }
            }
            nRespond({ segments: parsed || [] });
          }).catch(function (e) {
            nRespond({ error: String((e && e.message) || e).slice(0, 200) });
          });
        } else if (ev.data.type === 'allostudio-describe-request') {
          // Visual description: popup sends one timestamped contact sheet plus
          // optional teacher notes. This is separate from spoken captions.
          var dreq = ev.data;
          var dReplyTo = studioWinRef.current;
          var dRespond = function (payload) {
            try { if (dReplyTo && !dReplyTo.closed) dReplyTo.postMessage(Object.assign({ type: 'allostudio-describe-response', id: dreq.id }, payload), '*'); } catch (_) {}
          };
          var describeVisionFn = (typeof window !== 'undefined') ? window.callGeminiVision : null;
          if (typeof describeVisionFn !== 'function') { dRespond({ error: 'vision-unavailable' }); return; }
          var dDur = Math.max(1, Math.round(Number(dreq.duration) || 0));
          var dStamps = Array.isArray(dreq.timestamps) ? dreq.timestamps.map(function (x) { return Math.round(Number(x) || 0); }).join('s, ') + 's' : '';
          var dPrompt = 'You are helping a teacher create VISUAL DESCRIPTION segments for an instructional video.\n' +
            'The image is a contact sheet of sampled frames from the video, in reading order; each cell has its timestamp burned in. Frame timestamps: ' + dStamps + '. Total video length: ' + dDur + ' seconds.\n' +
            'This is NOT spoken captioning. Describe important visible action, objects, changes, gestures, demonstrations, text on screen, or scene transitions that a learner may need if they cannot see the video well.\n' +
            (dreq.notes ? ('Teacher gist/source notes/accuracy anchors:\n' + String(dreq.notes).slice(0, 5000) + '\n') : '') +
            (dreq.captions ? ('Existing spoken captions/transcript for context only:\n' + String(dreq.captions).slice(0, 6000) + '\n') : '') +
            'Rules: do not identify exact species, people, tools, places, or scientific facts unless they are plainly visible text or supported by teacher notes. Mark each segment basis as "observed", "inferred", "source-supported", or "needs-review". Use "needs-review" for uncertain details. Keep descriptions concise and useful for narration or accessibility.\n' +
            'Respond with ONLY a JSON array (no prose, no markdown): [{"start": seconds, "end": seconds, "description": "one concise visual description", "basis": "observed|inferred|source-supported|needs-review", "confidence": "high|medium|low"}]. Return 4-12 segments in time order within 0-' + dDur + 's.';
          Promise.resolve().then(function () { return describeVisionFn(dPrompt, dreq.imageBase64, dreq.mimeType || 'image/jpeg'); }).then(function (res) {
            var dText = (typeof res === 'string') ? res : ((res && (res.text || res.output)) || JSON.stringify(res));
            var dParsed = null;
            try { dParsed = JSON.parse(dText); } catch (_) {
              var dm = /\[[\s\S]*\]/.exec(String(dText || ''));
              if (dm) { try { dParsed = JSON.parse(dm[0]); } catch (_2) {} }
            }
            dRespond({ descriptions: dParsed || [] });
          }).catch(function (e) {
            dRespond({ error: String((e && e.message) || e).slice(0, 200) });
          });
        } else if (ev.data.type === 'allostudio-lesson-request') {
          // Lesson assistant: sampled frames + captions become editable
          // finishing suggestions, never automatic edits.
          var lreq = ev.data;
          var lReplyTo = studioWinRef.current;
          var lRespond = function (payload) {
            try { if (lReplyTo && !lReplyTo.closed) lReplyTo.postMessage(Object.assign({ type: 'allostudio-lesson-response', id: lreq.id }, payload), '*'); } catch (_) {}
          };
          var lessonVisionFn = (typeof window !== 'undefined') ? window.callGeminiVision : null;
          var lDur = Math.max(1, Math.round(Number(lreq.duration) || 0));
          var lStamps = Array.isArray(lreq.timestamps) ? lreq.timestamps.map(function (x) { return Math.round(Number(x) || 0); }).join('s, ') + 's' : '';
          var lPrompt = 'You are helping a teacher finish an educational video for students.\n' +
            'The image is a contact sheet of sampled frames in reading order with timestamps burned in. Frame timestamps: ' + lStamps + '. Total video length: ' + lDur + ' seconds.\n' +
            (lreq.transcript ? ('Transcript/captions with timestamps:\n' + String(lreq.transcript).slice(0, 12000) + '\n') : '') +
            (lreq.notes ? ('Teacher notes/source anchors:\n' + String(lreq.notes).slice(0, 4000) + '\n') : '') +
            'Suggest only high-value finishing touches for learning and accessibility. Allowed JSON items:\n' +
            '{"type":"title_card","start":S,"duration":D,"text":"...","reason":"..."}\n' +
            '{"type":"chapter","start":S,"label":"short chapter title","reason":"..."}\n' +
            '{"type":"pause_question","start":S,"duration":D,"text":"Pause and think...","reason":"..."}\n' +
            '{"type":"recap","start":S,"duration":D,"text":"...","reason":"..."}\n' +
            '{"type":"vocab","start":S,"duration":D,"text":"term or definition","x":0..1,"y":0..1}\n' +
            '{"type":"callout","start":S,"duration":D,"text":"Look at...","x":0..1,"y":0..1,"style":"label|box|spotlight|arrow"}\n' +
            '{"type":"zoom","start":S,"duration":D,"x":0..1,"y":0..1,"scale":1.5-3}\n' +
            '{"type":"image_prompt","start":S,"label":"...","prompt":"clean still visual or diagram prompt"}\n' +
            '{"type":"motion_sticker","start":S,"duration":D,"label":"...","prompt":"short GIF-style support idea"}\n' +
            'Rules: respond ONLY with a JSON array, 6-12 items max, timestamps within 0-' + lDur + 's, no invented facts or identities, mark uncertain visual ideas as prompts rather than facts.';
          var parseLesson = function (res) {
            var text = (typeof res === 'string') ? res : ((res && (res.text || res.output)) || JSON.stringify(res));
            var parsed = null;
            try { parsed = JSON.parse(text); } catch (_) {
              var lm = /\[[\s\S]*\]/.exec(String(text || ''));
              if (lm) { try { parsed = JSON.parse(lm[0]); } catch (_2) {} }
            }
            lRespond({ plan: parsed || [] });
          };
          if (typeof lessonVisionFn === 'function' && lreq.imageBase64) {
            Promise.resolve().then(function () { return lessonVisionFn(lPrompt, lreq.imageBase64, lreq.mimeType || 'image/jpeg'); }).then(parseLesson).catch(function (e) {
              lRespond({ error: String((e && e.message) || e).slice(0, 200) });
            });
          } else if (typeof props.callGemini === 'function') {
            Promise.resolve().then(function () { return props.callGemini(lPrompt, false, true); }).then(parseLesson).catch(function (e) {
              lRespond({ error: String((e && e.message) || e).slice(0, 200) });
            });
          } else {
            lRespond({ error: 'ai-unavailable' });
          }
        } else if (ev.data.type === 'allostudio-teaching-inserts-request') {
          // Teaching inserts are transcript-only suggestions: title cards,
          // pause prompts, callouts, and lightweight animated stickers. The
          // popup sanitizes and stores them as editable overlays.
          var ireq = ev.data;
          var iReplyTo = studioWinRef.current;
          var iRespond = function (payload) {
            try { if (iReplyTo && !iReplyTo.closed) iReplyTo.postMessage(Object.assign({ type: 'allostudio-teaching-inserts-response', id: ireq.id }, payload), '*'); } catch (_) {}
          };
          if (typeof props.callGemini !== 'function') { iRespond({ error: 'ai-unavailable' }); return; }
          var iDur = Math.max(1, Math.round(Number(ireq.duration) || 0));
          var iPrompt = 'You are helping a teacher add simple educational finishing touches to an instructional video.\n' +
            'Use ONLY the transcript text and timestamps below. Do not invent visual facts. Suggest a small set of editable overlays that improve learning: section title cards, pause-and-think prompts, callout labels, or tiny animated stickers.\n' +
            'Respond with ONLY a JSON array. Allowed shapes:\n' +
            '- {"type":"title_card","start":S,"duration":D,"text":"Part 1: ...","note":"optional short subtitle","theme":"blue|green|amber|pink|slate"}\n' +
            '- {"type":"pause_prompt","start":S,"duration":D,"text":"Pause and try...","note":"optional hint","theme":"blue|green|amber|pink|slate"}\n' +
            '- {"type":"callout","start":S,"duration":D,"text":"Look at the denominator","x":0..1,"y":0..1,"theme":"blue|green|amber|pink|slate"}\n' +
            '- {"type":"sticker","start":S,"duration":D,"text":"Key idea","x":0..1,"y":0..1,"animation":"pulse|bounce|sparkle"}\n' +
            'Rules: at most 10 inserts; keep text classroom-friendly; timestamps must be within 0-' + iDur + 's; prefer fewer, useful inserts over decoration.\n' +
            'Current title: ' + String(ireq.title || '(none)').slice(0, 120) + '\n' +
            'Transcript with [start-end] second markers:\n' + String(ireq.transcript || '').slice(0, 24000);
          Promise.resolve().then(function () { return props.callGemini(iPrompt, false, true); }).then(function (res) {
            var text = (typeof res === 'string') ? res : ((res && (res.text || res.output)) || JSON.stringify(res));
            var parsed = null;
            try { parsed = JSON.parse(text); } catch (_) {
              var im = /\[[\s\S]*\]/.exec(String(text || ''));
              if (im) { try { parsed = JSON.parse(im[0]); } catch (_2) {} }
            }
            iRespond({ inserts: parsed || [] });
          }).catch(function (e) {
            iRespond({ error: String((e && e.message) || e).slice(0, 200) });
          });
        } else if (ev.data.type === 'allostudio-imagen-request') {
          // Imagen is optional: when available, it creates a still visual card
          // that the popup overlays at a timestamp. No video bytes are sent.
          var greq = ev.data;
          var gReplyTo = studioWinRef.current;
          var gRespond = function (payload) {
            try { if (gReplyTo && !gReplyTo.closed) gReplyTo.postMessage(Object.assign({ type: 'allostudio-imagen-response', id: greq.id }, payload), '*'); } catch (_) {}
          };
          var imagenFn = props.callImagen || (typeof window !== 'undefined' ? window.callImagen : null);
          if (typeof imagenFn !== 'function') { gRespond({ error: 'imagen-unavailable' }); return; }
          var gPrompt = 'Create a clean classroom-friendly still illustration or diagram card for an educational video. No text unless explicitly requested. Prompt: ' + String(greq.prompt || '').slice(0, 900);
          Promise.resolve().then(function () { return imagenFn(gPrompt); }).then(function (res) {
            var dataUrl = null;
            if (typeof res === 'string') dataUrl = res;
            else if (res) dataUrl = res.dataUrl || res.imageDataUrl || res.url || res.imageUrl || null;
            if (!dataUrl && res && res.imageBase64) dataUrl = 'data:' + (res.mimeType || 'image/png') + ';base64,' + res.imageBase64;
            if (!/^data:image\//.test(String(dataUrl || ''))) { gRespond({ error: 'no image returned' }); return; }
            gRespond({ imageSrc: dataUrl, prompt: String(greq.prompt || '').slice(0, 240) });
          }).catch(function (e) {
            gRespond({ error: String((e && e.message) || e).slice(0, 200) });
          });
        } else if (ev.data.type === 'allostudio-frame-image-request') {
          // Frame-to-card: image-edit preserves the source frame's idea. When
          // edit is unavailable, vision drafts an Imagen prompt from the frame.
          var freq = ev.data;
          var fReplyTo = studioWinRef.current;
          var fRespond = function (payload) {
            try { if (fReplyTo && !fReplyTo.closed) fReplyTo.postMessage(Object.assign({ type: 'allostudio-frame-image-response', id: freq.id }, payload), '*'); } catch (_) {}
          };
          var editFn = props.callGeminiImageEdit || (typeof window !== 'undefined' ? window.callGeminiImageEdit : null);
          var frameImagenFn = props.callImagen || (typeof window !== 'undefined' ? window.callImagen : null);
          var frameVisionFn = (typeof window !== 'undefined') ? window.callGeminiVision : null;
          var fPrompt = 'Create a clean classroom-friendly still visual card from this video frame. Preserve the instructional idea, simplify clutter, remove private information and accidental names, and avoid decorative text unless explicitly requested. Teacher request: ' + String(freq.prompt || '').slice(0, 800);
          var normalizeFrameImage = function (res) {
            var dataUrl = null;
            if (typeof res === 'string') dataUrl = res;
            else if (res) dataUrl = res.dataUrl || res.imageDataUrl || res.url || res.imageUrl || null;
            if (!dataUrl && res && res.imageBase64) dataUrl = 'data:' + (res.mimeType || 'image/png') + ';base64,' + res.imageBase64;
            if (!/^data:image\//.test(String(dataUrl || ''))) { fRespond({ error: 'no image returned' }); return; }
            fRespond({ imageSrc: dataUrl });
          };
          if (typeof editFn === 'function' && freq.imageBase64) {
            Promise.resolve().then(function () { return editFn(fPrompt, freq.imageBase64, 800, 0.9); }).then(normalizeFrameImage).catch(function (e) {
              fRespond({ error: String((e && e.message) || e).slice(0, 200) });
            });
          } else if (typeof frameVisionFn === 'function' && typeof frameImagenFn === 'function' && freq.imageBase64) {
            var promptPrompt = 'Look at this video frame and write one concise Imagen prompt for a clean educational still card. Do not include private names or unnecessary text. Teacher request: ' + String(freq.prompt || '').slice(0, 800);
            Promise.resolve().then(function () { return frameVisionFn(promptPrompt, freq.imageBase64, freq.mimeType || 'image/jpeg'); }).then(function (desc) {
              var imgPrompt = 'Clean classroom-friendly still visual card, no private information, no watermark. ' + String((desc && (desc.text || desc.output)) || desc || freq.prompt || '').slice(0, 900);
              return frameImagenFn(imgPrompt);
            }).then(normalizeFrameImage).catch(function (e) {
              fRespond({ error: String((e && e.message) || e).slice(0, 200) });
            });
          } else {
            fRespond({ error: 'image-edit-unavailable' });
          }
        } else if (ev.data.type === 'allostudio-resource-cues-request') {
          var creq = ev.data;
          var cReplyTo = studioWinRef.current;
          var cRespond = function (payload) {
            try { if (cReplyTo && !cReplyTo.closed) cReplyTo.postMessage(Object.assign({ type: 'allostudio-resource-cues-response', id: creq.id }, payload), '*'); } catch (_) {}
          };
          var hist = Array.isArray(props.history) ? props.history : (Array.isArray(props.resourceHistory) ? props.resourceHistory : []);
          if (!hist.length && typeof window !== 'undefined' && Array.isArray(window.__alloflowHistory)) hist = window.__alloflowHistory;
          var cues = vsBuildResourceCues(hist, { limit: 140 });
          cRespond({ cues: cues, count: cues.length });
        } else if (ev.data.type === 'allostudio-tts-request') {
          // Text → spoken audio through the app's existing Gemini TTS path.
          // Returns raw 24kHz PCM bytes; the popup wraps them into WAV clips.
          var treq = ev.data;
          var tReplyTo = studioWinRef.current;
          var tRespond = function (payload) {
            try { if (tReplyTo && !tReplyTo.closed) tReplyTo.postMessage(Object.assign({ type: 'allostudio-tts-response', id: treq.id }, payload), '*'); } catch (_) {}
          };
          var ttsFn = (typeof window !== 'undefined') ? window.fetchTTSBytes : null;
          if (typeof ttsFn !== 'function') { tRespond({ error: 'tts-unavailable' }); return; }
          Promise.resolve().then(function () { return ttsFn(String(treq.text || '').slice(0, 600), treq.voice || 'Puck', 1, treq.language || 'English'); }).then(function (r) {
            if (r && r.bytes && r.bytes.length) tRespond({ pcm: r.bytes, sampleRate: 24000 });
            else tRespond({ error: 'no audio returned' });
          }).catch(function (e) {
            tRespond({ error: String((e && e.message) || e).slice(0, 200) });
          });
        } else if (ev.data.type === 'allostudio-open-cinematic') {
          if (props.onOpenCinematicStudio) {
            try { props.onOpenCinematicStudio(); } catch (_) {}
            addToast(T('video_studio.cinematic_opened', 'Cinematic Studio opened from Video Studio.'), 'success');
          } else {
            addToast(T('video_studio.cinematic_unavailable', 'Cinematic Studio is not available from this view.'), 'error');
          }
        } else if (ev.data.type === 'allostudio-closed') {
          setStudioState('closed');
        } else if (ev.data.type === 'allostudio-video' && ev.data.payload && ev.data.payload.blob instanceof Blob) {
          var p = ev.data.payload;
          var rawVisualDescriptions = Array.isArray(p.visualDescriptions) ? p.visualDescriptions : [];
          var visualDescriptions = vsSanitizeVisualDescriptions({ descriptions: rawVisualDescriptions }, Number(p.duration) || 0).map(function (s, idx) {
            s.checked = !!(rawVisualDescriptions[idx] && rawVisualDescriptions[idx].checked);
            return s;
          });
          var rawChapters = Array.isArray(p.chapters) ? p.chapters : [];
          var chapters = rawChapters.filter(function (c) { return c && isFinite(Number(c.start)) && String(c.title || '').trim(); }).map(function (c) {
            return { start: Math.max(0, Number(c.start) || 0), title: String(c.title || '').slice(0, 80) };
          });
          var inserts = vsSanitizeTeachingInserts(Array.isArray(p.inserts) ? p.inserts : [], Number(p.duration) || 0);
          var visualPrompts = (Array.isArray(p.visualPrompts) ? p.visualPrompts : []).filter(function (vp) { return vp && String(vp.prompt || '').trim(); }).map(function (vp) {
            return { id: String(vp.id || '').slice(0, 40), start: Math.max(0, Number(vp.start) || 0), type: String(vp.type || 'image_prompt').slice(0, 40), label: String(vp.label || 'Visual support').slice(0, 90), prompt: String(vp.prompt || '').slice(0, 600), source: String(vp.source || '').slice(0, 40) };
          });
          var musicBed = p.musicBed ? vsSanitizeMusicBed(p.musicBed, Number(p.duration) || 0) : null;
          if (musicBed) musicBed.blob = null;
          var vid = {
            id: 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            blob: p.blob,
            url: URL.createObjectURL(p.blob),
            vtt: (typeof p.vtt === 'string' && p.vtt) ? p.vtt : null,
            visualDescriptions: visualDescriptions,
            chapters: chapters,
            inserts: inserts,
            visualPrompts: visualPrompts,
            musicBed: musicBed,
            title: String(p.title || 'Teacher video'),
            duration: Number(p.duration) || 0,
            size: p.blob.size,
            thumb: (typeof p.thumb === 'string') ? p.thumb : null,
            sha256: null,
            createdAt: new Date().toISOString()
          };
          sha256Hex(p.blob).then(function (hex) {
            if (hex) setVideos(function (cur) { return cur.map(function (v) { return v.id === vid.id ? Object.assign({}, v, { sha256: hex }) : v; }); });
          });
          setVideos(function (cur) { return [vid].concat(cur); });
          // Ack so the Studio can honestly say "sent" — without this, a send
          // while the panel is closed silently vanishes.
          try { if (studioWinRef.current && !studioWinRef.current.closed) studioWinRef.current.postMessage({ type: 'allostudio-video-ack' }, '*'); } catch (_) {}
          addToast(T('video_studio.received', 'Video received from the Studio — it stays on this device until you download it.'), 'success');
          announce(T('video_studio.received_sr', 'Video received from the Studio.'));
        }
      }
      window.addEventListener('message', onMsg);
      return function () { window.removeEventListener('message', onMsg); };
    }, []);

    // Revoke object URLs on unmount only (videos live for the session).
    useEffect(function () {
      return function () {
        setVideos(function (cur) { cur.forEach(function (v) { try { URL.revokeObjectURL(v.url); } catch (_) {} }); return cur; });
      };
    }, []);

    // Escape closes (studio window itself stays open — teacher may still be editing).
    useEffect(function () {
      function onKey(e) { if (e.key === 'Escape') onClose(); }
      window.addEventListener('keydown', onKey);
      return function () { window.removeEventListener('keydown', onKey); };
    }, [onClose]);

    useEffect(function () { try { if (rootRef.current) rootRef.current.focus(); } catch (_) {} }, []);

    var openStudio = useCallback(function () {
      var existing = studioWinRef.current;
      if (existing && !existing.closed) {
        try { existing.focus(); } catch (_) {}
        return;
      }
      setStudioState('opening');
      var w = null;
      try { w = window.open(STUDIO_URL, 'alloflow-video-studio', 'width=1320,height=860'); } catch (_) { w = null; }
      if (!w) {
        setStudioState('blocked');
        addToast(T('video_studio.popup_blocked', 'The Studio window was blocked. Allow pop-ups for this page, then try again.'), 'error');
        return;
      }
      studioWinRef.current = w;
      // Watchdog: if no ready handshake, surface guidance instead of hanging.
      setTimeout(function () {
        setStudioState(function (cur) { return cur === 'opening' ? 'open' : cur; });
      }, 15000);
    }, []);

    var copyPackRef = useCallback(function (v) {
      var ref = vsMakePackReference({
        title: v.title, duration: v.duration, size: v.size, sha256: v.sha256,
        fileName: (v.title || 'teacher_video').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') + extFor(v.blob && v.blob.type),
        hasCaptions: !!v.vtt, hasVisualDescriptions: !!(v.visualDescriptions && v.visualDescriptions.length), hasChapters: !!(v.chapters && v.chapters.length), hasTeachingInserts: !!(v.inserts && v.inserts.length), hasVisualPrompts: !!(v.visualPrompts && v.visualPrompts.length), hasVisualOverlays: !!((v.inserts || []).filter(function (ins) { return ins && ins.type === 'image_overlay'; }).length), hasMusicBed: !!v.musicBed, resourceCueCount: (v.inserts || []).filter(function (ins) { return ins && ins.source === 'resource'; }).length, thumb: v.thumb, createdAt: v.createdAt
      });
      var text = JSON.stringify(ref, null, 2);
      var done = function () { addToast(T('video_studio.ref_copied', 'Pack reference copied — paste it wherever the resource lives. The video bytes stay in the downloaded file.'), 'success'); };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, done); }
        else { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); done(); }
      } catch (_) { done(); }
    }, []);

    var downloadAccessPacket = useCallback(function (v) {
      var base = (v.title || 'teacher_video').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'teacher_video';
      var cues = v.vtt ? vsParseVtt(v.vtt) : [];
      var descriptions = (v.visualDescriptions || []).filter(function (s) { return s && s.checked && String(s.description || '').trim(); });
      var chapters = (v.chapters || []).filter(function (c) { return c && isFinite(Number(c.start)) && String(c.title || '').trim(); });
      var inserts = vsSanitizeTeachingInserts(v.inserts || [], v.duration || 0);
      var visualPrompts = (v.visualPrompts || []).filter(function (p) { return p && String(p.prompt || '').trim(); });
      var overlayCount = inserts.filter(function (ins) { return ins && ins.type === 'image_overlay'; }).length;
      var resourceCueCount = inserts.filter(function (ins) { return ins && ins.source === 'resource'; }).length;
      var musicBed = v.musicBed ? vsSanitizeMusicBed(v.musicBed, v.duration || 0) : null;
      var transcript = [
        v.title || 'Teacher video',
        'Transcript generated locally by AlloFlow Video Studio.',
        ''
      ];
      cues.forEach(function (c) {
        transcript.push(vsFormatTimestamp(c.start || 0) + ' - ' + vsFormatTimestamp(c.end || 0) + '  ' + String(c.text || '').trim());
      });
      if (!cues.length) transcript.push('No captions or transcript were included with this video.');
      var visualTranscript = [
        v.title || 'Teacher video',
        'Visual description transcript generated locally by AlloFlow Video Studio.',
        ''
      ];
      descriptions.forEach(function (s) {
        visualTranscript.push(vsFormatTimestamp(s.start || 0) + ' - ' + vsFormatTimestamp(s.end || 0) + '  [' + (s.basis || 'needs-review') + ', ' + (s.confidence || 'medium') + '] ' + String(s.description || '').trim());
      });
      var chapterText = [v.title || 'Teacher video', 'Lesson chapters generated by AlloFlow Video Studio.', ''];
      chapters.forEach(function (c) { chapterText.push(vsFormatTimestamp(c.start || 0) + '  ' + String(c.title || '').trim()); });
      var note = [
        'AlloFlow Video Studio accessibility packet',
        '',
        'Video title: ' + (v.title || 'Teacher video'),
        'Generated locally: ' + new Date().toISOString(),
        'Includes transcript' + (v.vtt ? ', WebVTT captions' : '') + (descriptions.length ? ', visual descriptions' : '') + (chapters.length ? ', chapters' : '') + (inserts.length ? ', teaching inserts' : '') + (overlayCount ? ', visual overlays' : '') + (musicBed ? ', music bed metadata' : '') + (visualPrompts.length ? ', visual prompts' : '') + ', and metadata.',
        'Video bytes are not included in this packet. Download the video file or .allopack bundle separately.',
        '',
        'Teacher review: please check the transcript and captions for student names or private details before sharing.'
      ].join('\n');
      var meta = {
        title: v.title || 'Teacher video',
        duration: v.duration || 0,
        size: v.size || 0,
        sha256: v.sha256 || null,
        hasCaptions: !!v.vtt,
        captionCount: cues.length,
        hasVisualDescriptions: !!descriptions.length,
        visualDescriptionCount: descriptions.length,
        chapterCount: chapters.length,
        teachingInsertCount: inserts.length,
        visualOverlayCount: overlayCount,
        hasMusicBed: !!musicBed,
        resourceCueCount: resourceCueCount,
        visualPromptCount: visualPrompts.length,
        generatedAt: new Date().toISOString()
      };
      var entries = [
        { name: 'accessibility-note.txt', data: new TextEncoder().encode(note + '\n') },
        { name: 'transcript.txt', data: new TextEncoder().encode(transcript.join('\n').trim() + '\n') },
        { name: 'metadata.json', data: new TextEncoder().encode(JSON.stringify(meta, null, 2)) }
      ];
      if (v.vtt) entries.push({ name: 'captions.vtt', data: new TextEncoder().encode(v.vtt) });
      if (descriptions.length) {
        entries.push({ name: 'visual_descriptions.txt', data: new TextEncoder().encode(visualTranscript.join('\n').trim() + '\n') });
        entries.push({ name: 'visual_descriptions.json', data: new TextEncoder().encode(JSON.stringify(descriptions, null, 2)) });
      }
      if (chapters.length) {
        entries.push({ name: 'chapters.txt', data: new TextEncoder().encode(chapterText.join('\n').trim() + '\n') });
        entries.push({ name: 'chapters.json', data: new TextEncoder().encode(JSON.stringify(chapters, null, 2)) });
      }
      if (inserts.length) entries.push({ name: 'teaching_inserts.json', data: new TextEncoder().encode(JSON.stringify(inserts, null, 2)) });
      if (musicBed) entries.push({ name: 'music_bed.json', data: new TextEncoder().encode(JSON.stringify(Object.assign({}, musicBed, { blob: undefined }), null, 2)) });
      if (visualPrompts.length) {
        entries.push({ name: 'visual_prompts.json', data: new TextEncoder().encode(JSON.stringify(visualPrompts, null, 2)) });
        entries.push({ name: 'visual_prompts.txt', data: new TextEncoder().encode(visualPrompts.map(function (p) { return vsFormatTimestamp(p.start || 0) + '  ' + (p.label || 'Visual support') + '\n' + p.prompt; }).join('\n\n') + '\n') });
      }
      downloadBlob(new Blob([vsBuildZip(entries)], { type: 'application/zip' }), base + '_accessibility_packet.zip');
      addToast(T('video_studio.access_packet_done', 'Accessibility packet saved with transcript, captions, and metadata.'), 'success');
    }, []);

    // One-file share: .allopack = STORE-zip of meta.json + video + captions.
    // Reopens in the Studio (drag-drop) with captions intact; pack JSON still
    // only ever carries the metadata reference, never these bytes.
    var downloadBundle = useCallback(function (v) {
      var base = (v.title || 'teacher_video').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'teacher_video';
      v.blob.arrayBuffer().then(function (buf) {
        var inserts = vsSanitizeTeachingInserts(v.inserts || [], v.duration || 0);
        var musicBed = v.musicBed ? vsSanitizeMusicBed(v.musicBed, v.duration || 0) : null;
        var ref = vsMakePackReference({
          title: v.title, duration: v.duration, size: v.size, sha256: v.sha256,
          fileName: base + extFor(v.blob.type), hasCaptions: !!v.vtt, hasVisualDescriptions: !!(v.visualDescriptions && v.visualDescriptions.length), hasChapters: !!(v.chapters && v.chapters.length), hasTeachingInserts: !!inserts.length, hasVisualPrompts: !!(v.visualPrompts && v.visualPrompts.length), hasVisualOverlays: !!inserts.filter(function (ins) { return ins && ins.type === 'image_overlay'; }).length, hasMusicBed: !!musicBed, resourceCueCount: inserts.filter(function (ins) { return ins && ins.source === 'resource'; }).length, thumb: v.thumb, createdAt: v.createdAt
        });
        var entries = [
          { name: 'meta.json', data: new TextEncoder().encode(JSON.stringify(ref, null, 2)) },
          { name: base + extFor(v.blob.type), data: new Uint8Array(buf) }
        ];
        if (v.vtt) entries.push({ name: base + '.vtt', data: new TextEncoder().encode(v.vtt) });
        if (v.visualDescriptions && v.visualDescriptions.length) entries.push({ name: 'visual_descriptions.json', data: new TextEncoder().encode(JSON.stringify(v.visualDescriptions, null, 2)) });
        if (v.chapters && v.chapters.length) entries.push({ name: 'chapters.json', data: new TextEncoder().encode(JSON.stringify(v.chapters, null, 2)) });
        if (inserts.length) entries.push({ name: 'teaching_inserts.json', data: new TextEncoder().encode(JSON.stringify(inserts, null, 2)) });
        if (musicBed) entries.push({ name: 'music_bed.json', data: new TextEncoder().encode(JSON.stringify(Object.assign({}, musicBed, { blob: undefined }), null, 2)) });
        if (v.visualPrompts && v.visualPrompts.length) entries.push({ name: 'visual_prompts.json', data: new TextEncoder().encode(JSON.stringify(v.visualPrompts, null, 2)) });
        downloadBlob(new Blob([vsBuildZip(entries)], { type: 'application/zip' }), base + '.allopack');
        addToast(T('video_studio.bundle_done', 'Bundle saved — one file with the video, captions, and metadata. Drop it back into the Studio any time to re-edit.'), 'success');
      });
    }, []);

    var statusLine = studioState === 'open' ? T('video_studio.status_open', 'Studio window is open — record there, then press “Send to AlloFlow”.')
      : studioState === 'opening' ? T('video_studio.status_opening', 'Opening the Studio window…')
      : studioState === 'blocked' ? T('video_studio.status_blocked', 'Pop-up blocked. Allow pop-ups for this site and press the button again.')
      : T('video_studio.status_closed', 'The Studio opens in its own window so screen recording works even inside Gemini Canvas.');

    return h('div', {
      className: 'vs-root fixed inset-0 z-[200] flex items-center justify-center p-4',
      style: { background: 'rgba(15,23,42,0.72)' },
      role: 'dialog', 'aria-modal': 'true', 'aria-label': T('video_studio.title', 'Video Studio')
    },
      h('div', { className: 'bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden', ref: rootRef, tabIndex: -1 },
        // Header
        h('div', { className: 'flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-rose-50' },
          h('div', { className: 'flex items-center gap-3' },
            h('span', { className: 'text-3xl', 'aria-hidden': 'true' }, '🎥'),
            h('div', null,
              h('h2', { className: 'font-bold text-slate-800 text-lg' }, T('video_studio.title', 'Video Studio')),
              h('p', { className: 'text-xs text-slate-500' }, T('video_studio.subtitle', 'Record your screen, trim, caption — everything stays on your device.'))
            )
          ),
          h('button', {
            onClick: onClose, className: 'text-slate-400 hover:text-slate-700 text-2xl leading-none px-2 py-1',
            'aria-label': T('video_studio.close', 'Close Video Studio panel')
          }, '×')
        ),
        // Body
        h('div', { className: 'p-5 overflow-y-auto flex-1' },
          h('div', { className: 'rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 mb-4' },
            h('p', { className: 'text-sm text-slate-700 mb-3' }, statusLine),
            h('div', { className: 'flex flex-wrap items-center gap-2' },
              h('button', {
                onClick: openStudio,
                className: 'px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 text-sm',
                'data-help-key': 'video_studio_open_button'
              }, studioState === 'open' ? T('video_studio.focus_btn', 'Focus the Studio window') : T('video_studio.open_btn', '🎬 Open the Studio window')),
              studioState === 'blocked' && h('span', { className: 'text-xs text-rose-600 font-semibold' }, T('video_studio.blocked_hint', 'Look for the blocked-pop-up icon in the address bar.'))
            ),
            h('p', { className: 'text-xs text-slate-500 mt-3' }, T('video_studio.privacy_note', 'Nothing uploads anywhere: recording, editing, and captioning all run in your browser. Finished videos appear below and can be saved as .webm files. Before recording, close anything with student data — prefer sharing a single tab.'))
          ),
          // Cinematic Studio lives HERE now (its hub card was removed 2026-07-02):
          // it is the prompt-craft companion for NotebookLM and other AI video
          // GENERATORS, while this panel records/edits real footage.
          props.onOpenCinematicStudio && h('div', { className: 'rounded-xl border border-rose-200 bg-rose-50/60 p-3 mb-4 flex items-center justify-between gap-3 flex-wrap' },
            h('p', { className: 'text-xs text-slate-600 flex-1', style: { minWidth: '200px' } },
              T('video_studio.cinematic_hint', 'Generating a video with AI instead of recording one? Cinematic Studio helps you craft and debug prompts for NotebookLM Video Overviews and other AI video generators — and caption their output.')),
            h('button', {
              onClick: function () { try { props.onOpenCinematicStudio(); } catch (_) {} },
              className: 'px-3 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 shrink-0',
              'data-help-key': 'video_studio_cinematic_entry'
            }, T('video_studio.cinematic_open', '🎬 Cinematic Studio'))
          ),
          // Gallery
          h('h3', { className: 'font-semibold text-slate-700 text-sm mb-2' }, T('video_studio.gallery', 'Videos from this session')),
          videos.length === 0
            ? h('p', { className: 'text-sm text-slate-400 italic' }, T('video_studio.gallery_empty', 'No videos yet. Record one in the Studio window and press “Send to AlloFlow”.'))
            : h('ul', { className: 'space-y-3', role: 'list' }, videos.map(function (v) {
                return h('li', { key: v.id, className: 'border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row gap-3' },
                  h('video', { src: v.url, controls: true, preload: 'metadata', className: 'w-full sm:w-64 rounded-lg bg-black', 'aria-label': v.title }),
                  h('div', { className: 'flex-1 min-w-0' },
                    h('p', { className: 'font-semibold text-slate-800 text-sm truncate' }, v.title),
                    h('p', { className: 'text-xs text-slate-500 mb-2' },
                      fmtDur(v.duration) + ' · ' + fmtBytes(v.size) + (v.vtt ? ' · ' + T('video_studio.has_captions', 'captions included') : '') + (v.chapters && v.chapters.length ? ' · chapters' : '') + (v.inserts && v.inserts.length ? ' · inserts' : '') + ((v.inserts || []).filter(function (ins) { return ins && ins.type === 'image_overlay'; }).length ? ' · overlays' : '') + (v.musicBed ? ' · music' : '') + (v.visualPrompts && v.visualPrompts.length ? ' · visual prompts' : '')),
                    h('div', { className: 'flex flex-wrap gap-2' },
                      h('button', {
                        onClick: function () { downloadBlob(v.blob, (v.title || 'teacher_video').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') + extFor(v.blob && v.blob.type)); },
                        className: 'px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700'
                      }, T('video_studio.download_video', '⬇ Video file')),
                      v.vtt && h('button', {
                        onClick: function () { downloadBlob(new Blob([v.vtt], { type: 'text/vtt' }), (v.title || 'teacher_video').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') + '.vtt'); },
                        className: 'px-3 py-1.5 rounded-lg bg-slate-600 text-white text-xs font-semibold hover:bg-slate-500'
                      }, T('video_studio.download_vtt', '⬇ Captions (.vtt)')),
                      h('button', {
                        onClick: function () { downloadAccessPacket(v); },
                        className: 'px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-600',
                        title: T('video_studio.access_packet_title', 'Downloads transcript, captions when available, and metadata for accessibility review.')
                      }, T('video_studio.access_packet', 'Accessibility packet')),
                      h('button', {
                        onClick: function () { downloadBundle(v); },
                        className: 'px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700',
                        title: T('video_studio.bundle_title', 'One shareable file (.allopack zip) holding the video, its captions, and the metadata reference. Drop it into the Studio to re-edit.')
                      }, T('video_studio.download_bundle', '📦 Bundle (.allopack)')),
                      h('button', {
                        onClick: function () { copyPackRef(v); },
                        className: 'px-3 py-1.5 rounded-lg border border-indigo-300 text-indigo-700 text-xs font-semibold hover:bg-indigo-50',
                        title: T('video_studio.ref_title', 'Copies a small JSON reference (title, duration, checksum, thumbnail) — never the video bytes — for embedding in a resource pack.')
                      }, T('video_studio.copy_ref', '📎 Copy pack reference'))
                    )
                  )
                );
              }))
        )
      )
    );
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.VideoStudio = Object.assign(VideoStudio, VS_HELPERS);
  console.log('[CDN] VideoStudio module loaded (v1.0.0)');
})();
