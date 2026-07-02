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

  var VS_HELPERS = { vsFormatTimestamp: vsFormatTimestamp, vsBuildVtt: vsBuildVtt, vsParseVtt: vsParseVtt, vsComputeSegments: vsComputeSegments, vsPatchWebmDuration: vsPatchWebmDuration, vsMakePackReference: vsMakePackReference, vsCrc32: vsCrc32, vsBuildZip: vsBuildZip, vsReadZip: vsReadZip, vsZoomState: vsZoomState, vsGainAt: vsGainAt, vsDetectFillerSpans: vsDetectFillerSpans, vsSanitizeAiSuggestions: vsSanitizeAiSuggestions, vsComputePeaks: vsComputePeaks, vsSanitizeNarrationCues: vsSanitizeNarrationCues, vsPcmToWav: vsPcmToWav };
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
        } else if (ev.data.type === 'allostudio-closed') {
          setStudioState('closed');
        } else if (ev.data.type === 'allostudio-video' && ev.data.payload && ev.data.payload.blob instanceof Blob) {
          var p = ev.data.payload;
          var vid = {
            id: 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            blob: p.blob,
            url: URL.createObjectURL(p.blob),
            vtt: (typeof p.vtt === 'string' && p.vtt) ? p.vtt : null,
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
        hasCaptions: !!v.vtt, thumb: v.thumb, createdAt: v.createdAt
      });
      var text = JSON.stringify(ref, null, 2);
      var done = function () { addToast(T('video_studio.ref_copied', 'Pack reference copied — paste it wherever the resource lives. The video bytes stay in the downloaded file.'), 'success'); };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, done); }
        else { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); done(); }
      } catch (_) { done(); }
    }, []);

    // One-file share: .allopack = STORE-zip of meta.json + video + captions.
    // Reopens in the Studio (drag-drop) with captions intact; pack JSON still
    // only ever carries the metadata reference, never these bytes.
    var downloadBundle = useCallback(function (v) {
      var base = (v.title || 'teacher_video').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'teacher_video';
      v.blob.arrayBuffer().then(function (buf) {
        var ref = vsMakePackReference({
          title: v.title, duration: v.duration, size: v.size, sha256: v.sha256,
          fileName: base + extFor(v.blob.type), hasCaptions: !!v.vtt, thumb: v.thumb, createdAt: v.createdAt
        });
        var entries = [
          { name: 'meta.json', data: new TextEncoder().encode(JSON.stringify(ref, null, 2)) },
          { name: base + extFor(v.blob.type), data: new Uint8Array(buf) }
        ];
        if (v.vtt) entries.push({ name: base + '.vtt', data: new TextEncoder().encode(v.vtt) });
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
                      fmtDur(v.duration) + ' · ' + fmtBytes(v.size) + (v.vtt ? ' · ' + T('video_studio.has_captions', 'captions included') : '')),
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
