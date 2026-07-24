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
    // Optional teacher-hosted location for the bytes (YouTube/Drive/LMS link
    // pasted by the teacher — never auto-uploaded). https-only, no spaces.
    var hostedUrl = (function () {
      var u = String(m.hostedUrl || '').trim();
      if (u.length > 500 || !/^https:\/\/\S+$/i.test(u)) return null;
      return u;
    })();
    return {
      type: 'videoRef',
      version: 1,
      title: String(m.title || 'Teacher video').slice(0, 200),
      durationSec: Math.max(0, Math.round(Number(m.duration) || 0)),
      sizeBytes: Math.max(0, Math.round(Number(m.size) || 0)),
      sha256: (typeof m.sha256 === 'string' && /^[0-9a-f]{64}$/i.test(m.sha256)) ? m.sha256.toLowerCase() : null,
      fileName: String(m.fileName || '').slice(0, 200) || null,
      hasCaptions: !!m.hasCaptions,
      hasTranscriptEdits: !!m.hasTranscriptEdits,
      transcriptEditCount: Math.max(0, Math.min(999, Math.round(Number(m.transcriptEditCount) || 0))),
      hasTranscriptWords: !!m.hasTranscriptWords,
      transcriptWordCount: Math.max(0, Math.min(10000, Math.round(Number(m.transcriptWordCount) || 0))),
      hasVisualDescriptions: !!m.hasVisualDescriptions,
      hasChapters: !!m.hasChapters,
      hasTeachingInserts: !!m.hasTeachingInserts,
      hasVisualPrompts: !!m.hasVisualPrompts,
      hasLocalizations: !!m.hasLocalizations,
      localizationCount: Math.max(0, Math.min(99, Math.round(Number(m.localizationCount) || 0))),
      hasVisualOverlays: !!m.hasVisualOverlays,
      hasAudioEdits: !!m.hasAudioEdits,
      audioEditsApplyToSource: m.audioEditsApplyToSource === true,
      muteSpanCount: Math.max(0, Math.min(999, Math.round(Number(m.muteSpanCount) || 0))),
      hasMusicBed: !!m.hasMusicBed,
      hasMediaCredits: !!m.hasMediaCredits,
      mediaCreditCount: Math.max(0, Math.min(999, Math.round(Number(m.mediaCreditCount) || 0))),
      mediaCreditWarningCount: Math.max(0, Math.min(999, Math.round(Number(m.mediaCreditWarningCount) || 0))),
      resourceCueCount: Math.max(0, Math.min(999, Math.round(Number(m.resourceCueCount) || 0))),
      hostedUrl: hostedUrl,
      thumb: thumb,
      createdAt: m.createdAt || null
    };
  }

  function vsMediaLicenseProfile(license) {
    var raw = String(license || '').trim();
    var key = raw.toLowerCase().replace(/creative commons/g, 'cc').replace(/[^a-z0-9]+/g, ' ').trim();
    var profile = {
      key: key || 'unknown',
      label: raw || 'Unknown license',
      attributionRequired: true,
      commercialAllowed: false,
      openContent: false,
      agplFriendly: false,
      review: true,
      status: 'warn',
      warning: 'License needs review before public sharing or bundling.'
    };
    var set = function (next) { Object.keys(next).forEach(function (k) { profile[k] = next[k]; }); return profile; };
    if (!key) return profile;
    if (/^(cc0( 1 0)?|public domain|pd|us government public domain)$/.test(key)) {
      return set({ label: /cc0/.test(key) ? 'CC0 1.0' : 'Public domain', attributionRequired: false, commercialAllowed: true, openContent: true, agplFriendly: true, review: false, status: 'ok', warning: '' });
    }
    if (/^cc by( 4 0| 3 0|)$/.test(key) || /^attribution( 4 0|)$/.test(key)) {
      return set({ label: /3 0/.test(key) ? 'CC BY 3.0' : 'CC BY 4.0', attributionRequired: true, commercialAllowed: true, openContent: true, agplFriendly: true, review: false, status: 'ok', warning: 'Attribution required.' });
    }
    if (/^cc by sa( 4 0|)$/.test(key)) {
      return set({ label: 'CC BY-SA 4.0', attributionRequired: true, commercialAllowed: true, openContent: true, agplFriendly: false, review: true, status: 'warn', warning: 'Share-alike license: keep attribution and review reuse terms for adaptations.' });
    }
    if (/^cc by nc/.test(key) || /noncommercial/.test(key)) {
      return set({ label: raw || 'CC BY-NC', attributionRequired: true, commercialAllowed: false, openContent: false, agplFriendly: false, review: true, status: 'warn', warning: 'Noncommercial media is not safe for general AGPL project redistribution or public/commercial sharing.' });
    }
    if (/pixabay/.test(key)) {
      return set({ label: 'Pixabay Content License', attributionRequired: false, commercialAllowed: true, openContent: false, agplFriendly: false, review: true, status: 'warn', warning: 'Free stock license, not open-source/open-content. Do not bundle as a reusable stock library; keep the source URL.' });
    }
    return profile;
  }

  function vsNormalizeMediaCredit(raw) {
    var r = raw || {};
    var clean = function (v, limit) { return String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit || 160); };
    var safeUrl = function (v) {
      var s = clean(v, 600);
      return /^https?:\/\//i.test(s) ? s : '';
    };
    var profile = vsMediaLicenseProfile(r.license || r.licenseName);
    var source = clean(r.source || r.provider || 'Manual credit', 80);
    var title = clean(r.title || r.name || 'Untitled media', 180) || 'Untitled media';
    var creator = clean(r.creator || r.author || r.owner || 'Unknown creator', 180) || 'Unknown creator';
    var url = safeUrl(r.url || r.sourceUrl || r.href);
    var role = clean(r.role || r.kind || 'media asset', 80) || 'media asset';
    var modified = !!r.modified;
    var attribution = clean(r.attribution, 500);
    var seed = (title + '-' + creator + '-' + url + '-' + profile.label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'manual';
    if (!attribution) {
      attribution = '"' + title + '" by ' + creator + (url ? ' (' + url + ')' : '') + ' - ' + profile.label;
      if (modified) attribution += '; modified';
      if (source) attribution += '; via ' + source;
    }
    return {
      id: clean(r.id || ('credit-' + seed), 60),
      title: title,
      creator: creator,
      source: source,
      url: url,
      license: profile.label,
      role: role,
      modified: modified,
      attribution: attribution,
      status: profile.status,
      warning: profile.warning,
      openContent: !!profile.openContent,
      agplFriendly: !!profile.agplFriendly,
      addedAt: clean(r.addedAt || new Date().toISOString(), 40)
    };
  }

  function vsSanitizeMediaCredits(list) {
    return (Array.isArray(list) ? list : []).filter(function (raw) {
      return raw && (raw.title || raw.name || raw.creator || raw.author || raw.url || raw.sourceUrl || raw.href || raw.attribution);
    }).map(vsNormalizeMediaCredit).filter(function (item) {
      return item && (item.title || item.creator || item.url || item.attribution);
    }).slice(0, 80);
  }

  function vsBuildMediaCredits(entries, title) {
    var list = vsSanitizeMediaCredits(entries);
    var lines = [
      String(title || 'Video project') + ' media credits',
      'Generated by AlloFlow Video Studio',
      ''
    ];
    if (!list.length) {
      lines.push('No third-party stock/open media credits were recorded.');
      return lines.join('\n') + '\n';
    }
    list.forEach(function (item, idx) {
      lines.push((idx + 1) + '. ' + item.attribution);
      lines.push('   Role: ' + item.role);
      if (item.warning) lines.push('   Review: ' + item.warning);
      lines.push('');
    });
    return lines.join('\n').replace(/\n+$/, '\n');
  }

  function vsBuildMediaCreditsCard(entries, duration) {
    var list = vsSanitizeMediaCredits(entries);
    if (!list.length) return null;
    var dur = Math.max(0.1, Number(duration) || 0.1);
    var shown = list.slice(0, 4).map(function (item, idx) {
      return (idx + 1) + '. ' + item.title + ' - ' + item.creator + ' (' + item.license + ')';
    }).join('  ');
    if (list.length > 4) shown += '  +' + (list.length - 4) + ' more in credits file.';
    return {
      id: 'media-credits-card',
      type: 'title_card',
      start: Math.max(0, dur - 6),
      end: dur,
      text: 'Media credits',
      note: shown.slice(0, 240),
      theme: 'slate',
      layout: 'center-card',
      source: 'media_credits'
    };
  }

  function vsMediaSearchTargets(query, preferredSource) {
    var q = String(query || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
    var enc = encodeURIComponent(q || 'classroom lesson media');
    var source = String(preferredSource || '').toLowerCase();
    var targets = [
      { id: 'openverse', name: 'Openverse', source: 'Openverse', licenseHint: 'Openly licensed search index; verify each asset page.', defaultLicense: 'CC BY 4.0', url: 'https://openverse.org/search/?q=' + enc, status: 'preferred' },
      { id: 'commons', name: 'Wikimedia Commons', source: 'Wikimedia Commons', licenseHint: 'Prefer public domain, CC0, or CC BY files; follow the file page.', defaultLicense: 'Public domain', url: 'https://commons.wikimedia.org/w/index.php?search=' + enc + '&title=Special:MediaSearch&type=image', status: 'preferred' },
      { id: 'freesound', name: 'Freesound', source: 'Freesound', licenseHint: 'Prefer CC0 or CC BY sounds; avoid noncommercial for broad sharing.', defaultLicense: 'CC BY 4.0', url: 'https://freesound.org/search/?q=' + enc, status: 'filter' },
      { id: 'pixabay', name: 'Pixabay', source: 'Pixabay', licenseHint: 'Free stock license, not open-source/open-content; do not bundle as reusable stock.', defaultLicense: 'Pixabay Content License', url: 'https://pixabay.com/images/search/?q=' + enc, status: 'review' }
    ];
    if (source) {
      var filtered = targets.filter(function (t) { return t.id === source || t.source.toLowerCase() === source || t.name.toLowerCase() === source; });
      if (filtered.length) return filtered;
    }
    return targets;
  }

  function vsBuildPermissionAudit(state) {
    var s = state || {};
    var items = [];
    var add = function (id, label, status, detail, targetId) {
      items.push({ id: id, label: label, status: status || 'info', detail: String(detail || '').slice(0, 220), targetTab: targetId ? 'tabEdit' : null, targetId: targetId || null, action: targetId ? 'Review' : null });
    };
    var capCount = Math.max(0, Number(s.captionCount) || 0);
    var capWarn = Math.max(0, Number(s.captionWarningCount) || 0);
    var flags = Math.max(0, Number(s.privacyFlagCount) || 0);
    var mediaCount = Math.max(0, Number(s.mediaCreditCount) || 0);
    var mediaWarn = Math.max(0, Number(s.mediaCreditWarningCount) || 0);
    var locWarn = Math.max(0, Number(s.localizationWarningCount) || 0);
    add('privacy', 'Privacy', flags ? 'warn' : 'complete', flags ? (flags + ' possible private detail(s) need review before sharing.') : 'No obvious private details flagged.', flags ? 'transcriptSearch' : null);
    add('captions', 'Captions', capCount ? (capWarn ? 'warn' : 'complete') : 'warn', capCount ? (capWarn ? (capWarn + ' caption issue(s) need review.') : capCount + ' caption line(s) available.') : 'No captions are attached yet.', capCount && capWarn ? 'cueTableBody' : (!capCount ? 'autoCapBtn' : null));
    add('media', 'Media rights', mediaWarn ? 'warn' : (mediaCount ? 'complete' : 'info'), mediaWarn ? (mediaWarn + ' media credit(s) need license review.') : (mediaCount ? mediaCount + ' media credit(s) recorded for attribution.' : 'No third-party stock/open media credits recorded.'), mediaWarn || !mediaCount ? 'mediaCreditTitle' : null);
    add('localization', 'Localization permissions', locWarn ? 'warn' : 'info', locWarn ? (locWarn + ' localization review item(s) remain.') : 'Localized drafts are optional; review school privacy rules before sharing translated versions.', locWarn ? 'localizeBtn' : null);
    return items;
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
  function vsNormalizeMuteSpans(muteSpans, duration, gap) {
    var dur = Number(duration);
    var hasDur = isFinite(dur) && dur > 0;
    var mergeGap = Number(gap);
    if (!isFinite(mergeGap)) mergeGap = 0.05;
    mergeGap = Math.max(0, Math.min(1, mergeGap));
    var cleanText = function (v, max) {
      return String(v || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
    };
    var rounded = function (v) { return Math.round(v * 1000) / 1000; };
    var spans = [];
    (Array.isArray(muteSpans) ? muteSpans : []).forEach(function (raw) {
      if (!raw) return;
      var a = Number(raw.start), b = Number(raw.end);
      if (!isFinite(a) || !isFinite(b)) return;
      var start = Math.min(a, b), end = Math.max(a, b);
      if (hasDur) {
        start = Math.max(0, Math.min(dur, start));
        end = Math.max(0, Math.min(dur, end));
      } else {
        start = Math.max(0, start);
        end = Math.max(0, end);
      }
      if (end - start < 0.02) return;
      var span = { start: rounded(start), end: rounded(end) };
      var source = cleanText(raw.source, 40);
      var note = cleanText(raw.note, 180);
      if (source) span.source = source;
      if (note) span.note = note;
      spans.push(span);
    });
    spans.sort(function (a, b) { return a.start - b.start || a.end - b.end; });
    var merged = [];
    var appendNote = function (base, note) {
      if (!note) return base || '';
      if (!base) return note;
      if (base === note || base.indexOf(note) !== -1) return base;
      return (base + '; ' + note).slice(0, 180);
    };
    spans.forEach(function (span) {
      var last = merged[merged.length - 1];
      if (!last || span.start > last.end + mergeGap) {
        merged.push(Object.assign({}, span));
        return;
      }
      last.end = rounded(Math.max(last.end, span.end));
      if (span.source) last.source = last.source && last.source !== span.source ? 'mixed' : span.source;
      last.note = appendNote(last.note || '', span.note || '');
      if (!last.note) delete last.note;
    });
    return merged.slice(0, 600);
  }

  function vsGainAt(muteSpans, volume, tSec) {
    var vol = Number(volume);
    if (!isFinite(vol)) vol = 1;
    vol = Math.max(0, Math.min(2, vol));
    var t = Number(tSec) || 0;
    var spans = vsNormalizeMuteSpans(muteSpans, 0, 0);
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

  function vsAudioPolishPreset(key) {
    var k = String(key || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'voice_balanced';
    var map = {
      voice_balanced: { key: 'voice_balanced', label: 'Voice balanced', description: 'Slight voice lift with cautious volume; good default for teacher recordings.', audio: { volume: 1.08, removeAll: false }, music: { volume: 0.24, fadeIn: 1.2, fadeOut: 2.2, duck: true } },
      quiet_voice: { key: 'quiet_voice', label: 'Quiet voice lift', description: 'Raises a quiet recording without pushing past the distortion warning zone.', audio: { volume: 1.25, removeAll: false }, music: { volume: 0.18, fadeIn: 1.5, fadeOut: 2.5, duck: true } },
      music_under: { key: 'music_under', label: 'Music under speech', description: 'Keeps background music low, faded, and ducked under speech.', audio: { volume: 1, removeAll: false }, music: { volume: 0.16, fadeIn: 2, fadeOut: 3, duck: true } },
      voiceover_replace: { key: 'voiceover_replace', label: 'Voiceover replaces original', description: 'Mutes the source audio so narration or interpreter clips can carry the lesson.', audio: { volume: 1, removeAll: true }, music: { volume: 0.18, fadeIn: 1.5, fadeOut: 2.5, duck: true } }
    };
    return map[k] || map.voice_balanced;
  }

  function vsApplyAudioPolishPreset(state, key) {
    var s = state || {};
    var preset = vsAudioPolishPreset(key);
    var audio = Object.assign({ volume: 1, removeAll: false, muteSpans: [] }, s.audio || {});
    var existingVol = Number(audio.volume);
    audio.volume = isFinite(existingVol) ? Math.max(0, Math.min(2, existingVol)) : 1;
    audio.removeAll = !!audio.removeAll;
    audio.muteSpans = vsNormalizeMuteSpans(audio.muteSpans, s.duration || 0);
    if (preset.audio) {
      if (preset.audio.volume != null) audio.volume = Math.max(0, Math.min(2, Number(preset.audio.volume) || 1));
      if (preset.audio.removeAll != null) audio.removeAll = !!preset.audio.removeAll;
    }
    var musicBed = s.musicBed ? Object.assign({}, s.musicBed) : null;
    if (musicBed && preset.music) {
      Object.keys(preset.music).forEach(function (field) { musicBed[field] = preset.music[field]; });
      musicBed = vsSanitizeMusicBed(musicBed, s.duration || musicBed.end || 0);
    }
    return { preset: preset, audio: audio, musicBed: musicBed };
  }

  function vsBuildAudioEditManifest(state) {
    var s = state || {};
    var dur = Math.max(0, Number(s.duration) || 0);
    var clean = function (v, limit) {
      return String(v || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit || 120);
    };
    var rawAudio = s.audio || s.sourceAudio || {};
    var volume = Number(rawAudio.volume);
    var sourceAudio = {
      volume: isFinite(volume) ? Math.max(0, Math.min(2, volume)) : 1,
      removeAll: !!rawAudio.removeAll,
      muteSpans: vsNormalizeMuteSpans(rawAudio.muteSpans || [], dur)
    };
    var hasSourceAudioChanges = !!(sourceAudio.removeAll || Math.abs(sourceAudio.volume - 1) > 0.001 || sourceAudio.muteSpans.length);
    var musicBed = s.musicBed ? vsSanitizeMusicBed(s.musicBed, dur || s.musicBed.end || 0) : null;
    if (musicBed) { musicBed = Object.assign({}, musicBed); delete musicBed.blob; }
    var mediaEmbedded = s.mediaEmbedded === true;
    var preserveEmbedded = s.mediaEmbedded !== false;
    var narration = s.narration ? {
      present: true,
      volume: Math.max(0, Math.min(2, Number(s.narration.volume) || 1)),
      fileName: clean(s.narration.fileName || s.narration.name || 'narration', 120),
      mimeType: clean(s.narration.mimeType || s.narration.type || (s.narration.blob && s.narration.blob.type) || 'audio/webm', 80),
      embedded: !!((mediaEmbedded && s.narration.blob) || (preserveEmbedded && s.narration.embedded))
    } : null;
    var clips = (Array.isArray(s.audioClips) ? s.audioClips : []).filter(function (c) {
      return c && (c.blob || c.fileName || c.name || isFinite(Number(c.t != null ? c.t : c.start)));
    }).slice(0, 120).map(function (c, idx) {
      var at = Number(c.t != null ? c.t : c.start);
      if (!isFinite(at)) at = 0;
      var clipDur = Number(c.dur != null ? c.dur : c.duration);
      return {
        id: clean(c.id || ('clip-' + idx), 60),
        name: clean(c.name || c.fileName || ('Audio clip ' + (idx + 1)), 120),
        start: Math.max(0, Math.min(dur || Math.max(0, at), at)),
        duration: isFinite(clipDur) ? Math.max(0, Math.min(7200, clipDur)) : null,
        volume: Math.max(0, Math.min(2, Number(c.volume) || 1)),
        fileName: clean(c.fileName || c.name || '', 120),
        mimeType: clean(c.mimeType || c.type || (c.blob && c.blob.type) || 'audio/webm', 80),
        embedded: !!((mediaEmbedded && c.blob) || (preserveEmbedded && c.embedded))
      };
    });
    return {
      type: 'alloflow_audio_edits',
      version: 1,
      duration: dur,
      applyToSource: s.applyToSource === true,
      bakedIntoVideo: s.bakedIntoVideo === true || s.rendered === true,
      hasAudioEdits: !!(hasSourceAudioChanges || musicBed || narration || clips.length),
      hasSourceAudioChanges: hasSourceAudioChanges,
      sourceAudio: sourceAudio,
      muteSpanCount: sourceAudio.muteSpans.length,
      hasMusicBed: !!musicBed,
      musicBed: musicBed,
      narration: narration,
      audioClipCount: clips.length,
      audioClips: clips
    };
  }

  function vsBuildProjectBundleReadme(state) {
    var s = state || {};
    var clean = function (v, limit) {
      return String(v || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit || 160);
    };
    var title = clean(s.title || 'Teacher video', 160) || 'Teacher video';
    var audio = s.audioManifest ? vsBuildAudioEditManifest(s.audioManifest) : vsBuildAudioEditManifest({
      duration: s.duration || 0,
      audio: s.audio || null,
      musicBed: s.musicBed || null,
      narration: s.narration || null,
      audioClips: s.audioClips || [],
      applyToSource: s.editableSource === true,
      bakedIntoVideo: s.editableSource !== true
    });
    var names = (Array.isArray(s.entries) ? s.entries : []).map(function (entry) {
      return clean(typeof entry === 'string' ? entry : (entry && entry.name), 200);
    }).filter(Boolean).slice(0, 200);
    var hasFile = function (pattern) { return names.some(function (name) { return pattern.test(name); }); };
    var embeddedClipCount = audio.audioClips.filter(function (clip) { return clip && clip.embedded; }).length;
    var lines = [
      'AlloFlow Video Studio project bundle',
      '',
      'Title: ' + title,
      'Generated locally: ' + clean(s.generatedAt || new Date().toISOString(), 80),
      'Bundle role: ' + (audio.applyToSource ? 'Editable source project. Drop this .allopack into Video Studio to continue editing.' : 'Rendered export bundle. Video/audio edits are already baked into the video; metadata is included for review.'),
      '',
      'Restores on reopen:'
    ];
    lines.push('- Video file');
    if (hasFile(/\.vtt$/i) || s.hasCaptions) lines.push('- Captions');
    if (hasFile(/transcript_edits\.json$/i)) lines.push('- Transcript edit decisions');
    if (hasFile(/transcript_words\.json$/i)) lines.push('- Word-level transcript timings');
    if (hasFile(/scene_plan\.json$/i)) lines.push('- Scene plan');
    if (hasFile(/music_bed\.(json|mp3|wav|ogg|m4a|webm)$/i)) lines.push('- Music bed metadata' + (hasFile(/music_bed\.(mp3|wav|ogg|m4a|webm)$/i) ? ' and audio' : ''));
    if (audio.applyToSource && audio.hasSourceAudioChanges) lines.push('- Source audio volume/mute edits');
    if (audio.applyToSource && audio.narration && audio.narration.embedded) lines.push('- Narration audio');
    if (audio.applyToSource && embeddedClipCount) lines.push('- Added audio clips (' + embeddedClipCount + ')');
    lines.push('');
    lines.push('Stored for review:');
    if (audio.hasAudioEdits) lines.push('- audio_edits.json (' + (audio.applyToSource ? 'restorable source edits' : 'audit only for rendered audio') + ')');
    if (hasFile(/media_credits\.json$/i)) lines.push('- media_credits.json / media_credits.txt');
    if (hasFile(/visual_descriptions\.json$/i)) lines.push('- Visual descriptions');
    if (hasFile(/teaching_inserts\.json$/i)) lines.push('- Teaching inserts and overlays');
    if (hasFile(/visual_prompts\.json$/i)) lines.push('- Visual prompts');
    if (hasFile(/localizations\.json$/i)) lines.push('- Localization drafts');
    if (!audio.hasAudioEdits && !hasFile(/media_credits\.json$/i) && !hasFile(/visual_descriptions\.json$/i) && !hasFile(/teaching_inserts\.json$/i) && !hasFile(/localizations\.json$/i)) lines.push('- Basic video metadata in meta.json');
    lines.push('');
    lines.push('Licensing and attribution:');
    lines.push('- AlloFlow app code is AGPL-3.0. Media inside this bundle keeps its own license and attribution requirements.');
    lines.push('- Review media_credits.json or media_credits.txt before sharing or reusing stock/open media.');
    lines.push('- Free stock media is not automatically open source; keep source URLs and license notes with the project.');
    if (names.length) {
      lines.push('');
      lines.push('Files in this bundle:');
      names.forEach(function (name) { lines.push('- ' + name); });
    }
    return lines.join('\n').replace(/\n+$/, '\n') + '\n';
  }

  function vsBuildProjectImportSummary(state) {
    var s = state || {};
    var clean = function (v, limit) {
      return String(v || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit || 120);
    };
    var count = function (v) { return Math.max(0, Math.min(9999, Math.round(Number(v) || 0))); };
    var plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); };
    var restored = [];
    var review = [];
    var warnings = [];
    var audio = s.audioManifest ? vsBuildAudioEditManifest(s.audioManifest) : null;
    var captionCount = count(s.captionCount);
    var transcriptEditCount = count(s.transcriptEditCount);
    var transcriptWordCount = count(s.transcriptWordCount);
    var visualDescriptionCount = count(s.visualDescriptionCount);
    var chapterCount = count(s.chapterCount);
    var insertCount = count(s.insertCount);
    var promptCount = count(s.visualPromptCount);
    var localizationCount = count(s.localizationCount);
    var mediaCreditCount = count(s.mediaCreditCount);
    var clipCount = count(s.audioClipCount);
    if (captionCount) restored.push(plural(captionCount, 'caption'));
    if (transcriptEditCount) restored.push('transcript edit decisions');
    if (transcriptWordCount) restored.push('word timings');
    if (visualDescriptionCount) restored.push('visual descriptions');
    if (chapterCount) restored.push(plural(chapterCount, 'chapter'));
    if (insertCount) restored.push(plural(insertCount, 'teaching insert'));
    if (promptCount) restored.push('visual prompts');
    if (localizationCount) restored.push(plural(localizationCount, 'localization draft'));
    if (mediaCreditCount) restored.push(plural(mediaCreditCount, 'media credit'));
    if (s.hasMusicBed) restored.push('music bed');
    if (audio && audio.applyToSource) {
      if (audio.hasSourceAudioChanges) restored.push('source audio edits');
      if (s.narrationRestored || (audio.narration && audio.narration.embedded)) restored.push('narration audio');
      if (clipCount) restored.push(plural(clipCount, 'audio clip'));
    } else if (audio && audio.hasAudioEdits) {
      review.push('audio edit manifest is audit-only');
    }
    (Array.isArray(s.missingAudioFiles) ? s.missingAudioFiles : []).slice(0, 6).forEach(function (name) {
      var n = clean(name, 120);
      if (n) warnings.push(n);
    });
    var text = restored.length ? ('Restored ' + restored.join(', ') + '.') : 'No extra project metadata was restored.';
    if (review.length) text += ' Review: ' + review.join(', ') + '.';
    if (warnings.length) text += ' Missing bundled audio: ' + warnings.join(', ') + (warnings.length < (s.missingAudioFiles || []).length ? ', ...' : '') + '.';
    return {
      restored: restored,
      review: review,
      warnings: warnings,
      status: warnings.length ? 'warn' : 'ok',
      text: text
    };
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

  function vsTranscriptWordAutoSelect(words, mode) {
    var list = Array.isArray(words) ? words : [];
    var key = String(mode || 'fillers_and_repeats').toLowerCase();
    var includeFillers = key !== 'repeats';
    var includeRepeats = key !== 'fillers';
    var FILLER = /^(u+m+|u+h+|e+r+m*|h+m+m*|m+h?m+|a+h+e?m*)$/;
    var norm = function (w) { return String(w || '').toLowerCase().replace(/[^a-z']/g, ''); };
    var seen = {};
    var out = [];
    var prev = null;
    list.forEach(function (raw, fallbackIndex) {
      var w = raw || {};
      var text = String(w.word != null ? w.word : w.text || '').trim();
      var word = norm(text);
      var start = Number(w.start), end = Number(w.end);
      var index = Math.round(Number(w.index));
      if (!isFinite(index) || index < 0) index = fallbackIndex;
      if (!word || !isFinite(start) || !isFinite(end) || end <= start) { prev = null; return; }
      if (includeFillers && FILLER.test(word)) {
        if (!seen[index]) { seen[index] = true; out.push(index); }
      } else if (includeRepeats && prev && word === prev.word && word.length >= 2 && !FILLER.test(prev.word) && (start - prev.end) < 0.4) {
        if (!seen[prev.index]) { seen[prev.index] = true; out.push(prev.index); }
      }
      prev = { word: word, start: start, end: end, index: index };
    });
    return out.sort(function (a, b) { return a - b; });
  }

  function vsBuildTranscriptCleanupQueue(words, mode) {
    var list = Array.isArray(words) ? words : [];
    var fillSet = {}, repeatSet = {}, byIndex = {};
    vsTranscriptWordAutoSelect(list, 'fillers').forEach(function (idx) { fillSet[idx] = true; });
    vsTranscriptWordAutoSelect(list, 'repeats').forEach(function (idx) { repeatSet[idx] = true; });
    list.forEach(function (raw, fallbackIndex) {
      var w = raw || {};
      var idx = Math.round(Number(w.index));
      if (!isFinite(idx) || idx < 0) idx = fallbackIndex;
      byIndex[idx] = w;
    });
    var key = String(mode || 'fillers_and_repeats').toLowerCase();
    var indices = Object.keys(byIndex).map(function (k) { return Number(k); }).filter(function (idx) {
      if (!isFinite(idx) || idx < 0) return false;
      if (key === 'fillers') return !!fillSet[idx];
      if (key === 'repeats') return !!repeatSet[idx];
      return !!(fillSet[idx] || repeatSet[idx]);
    }).sort(function (a, b) { return a - b; });
    var out = [];
    indices.forEach(function (idx) {
      if (out.length >= 240) return;
      var w = byIndex[idx] || {};
      var start = Number(w.start), end = Number(w.end);
      if (!isFinite(start) || !isFinite(end) || end <= start) return;
      var text = String(w.text != null ? w.text : w.word || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
      if (!text) return;
      var reason = fillSet[idx] && repeatSet[idx] ? 'filler/repeat' : (fillSet[idx] ? 'filler' : 'repeat');
      out.push({
        id: 'cleanup-' + idx + '-' + Math.round(start * 1000),
        wordIndex: idx,
        start: start,
        end: end,
        text: text,
        reason: reason,
        checked: true,
        source: 'transcript_cleanup'
      });
    });
    return out;
  }

  // Transcript-line selection -> one safe time range. This powers text-based
  // editing without pretending we can ripple-cut arbitrary middle ranges.
  function vsTranscriptSelectionRange(cues, indices, duration, padding) {
    var list = Array.isArray(cues) ? cues : [];
    var dur = Math.max(0, Number(duration) || 0);
    var pad = Math.max(0, Math.min(1, Number(padding) || 0));
    var seen = {};
    var picked = [];
    (Array.isArray(indices) ? indices : []).forEach(function (idx) {
      idx = Math.round(Number(idx));
      if (!isFinite(idx) || idx < 0 || idx >= list.length || seen[idx]) return;
      var c = list[idx] || {};
      var a = Number(c.start), b = Number(c.end);
      if (!isFinite(a) || !isFinite(b) || b <= a) return;
      seen[idx] = true;
      picked.push({ index: idx, start: a, end: b, text: String(c.text || '').replace(/[\r\n]+/g, ' ').trim() });
    });
    picked.sort(function (a, b) { return a.start - b.start; });
    if (!picked.length) return null;
    var start = Math.min.apply(null, picked.map(function (c) { return c.start; }));
    var end = Math.max.apply(null, picked.map(function (c) { return c.end; }));
    start = Math.max(0, start - pad);
    end = dur ? Math.min(dur, end + pad) : end + pad;
    if (end <= start) end = start + 0.1;
    return {
      start: start,
      end: end,
      duration: Math.max(0.1, end - start),
      indices: picked.map(function (c) { return c.index; }),
      lineCount: picked.length,
      text: picked.map(function (c) { return c.text; }).filter(Boolean).join(' ')
    };
  }

  function vsNormalizeTranscriptEditAction(action) {
    var key = String(action || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    var aliases = {
      mute: 'silence',
      mute_span: 'silence',
      silence_audio: 'silence',
      silence_selected_audio: 'silence',
      before: 'trim_before',
      trim_start: 'trim_before',
      trim_beginning: 'trim_before',
      start: 'trim_before',
      after: 'trim_after',
      trim_end: 'trim_after',
      trim_finish: 'trim_after',
      end: 'trim_after',
      scene_clip: 'clip',
      add_clip: 'clip',
      clip_from_selection: 'clip',
      add_chapter: 'chapter',
      chapter_marker: 'chapter',
      ripple: 'ripple_cut',
      word_ripple: 'ripple_cut',
      ripple_delete: 'ripple_cut',
      delete_words: 'ripple_cut'
    };
    key = aliases[key] || key;
    return (/^(silence|trim_before|trim_after|clip|chapter|ripple_cut)$/).test(key) ? key : '';
  }

  function vsBuildTranscriptEditDecision(action, range, context) {
    var act = vsNormalizeTranscriptEditAction(action);
    var r = range || {};
    var ctx = context || {};
    if (!act) return null;
    var dur = Math.max(0, Number(ctx.duration) || Number(r.takeDuration) || 0);
    var start = Number(r.start);
    var end = Number(r.end);
    if (!isFinite(start) || !isFinite(end) || end <= start) return null;
    start = Math.max(0, dur ? Math.min(dur, start) : start);
    end = dur ? Math.min(dur, end) : end;
    if (end <= start) return null;
    var clean = function (v, limit) { return String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit || 160); };
    var shortTs = function (sec) { return vsFormatTimestamp(sec).replace(/^00:/, '').replace(/\.\d+$/, ''); };
    var meta = {
      silence: { label: 'Silence selected audio', targetLayer: 'Silences', exportImpact: 'Mutes this transcript range while keeping the video length.' },
      trim_before: { label: 'Trim before selection', targetLayer: 'Trim', exportImpact: 'Moves the export start to the first selected transcript line.' },
      trim_after: { label: 'Trim after selection', targetLayer: 'Trim', exportImpact: 'Moves the export end to the last selected transcript line.' },
      clip: { label: 'Clip from selection', targetLayer: 'Scene builder', exportImpact: 'Adds this transcript range as a reusable scene clip.' },
      chapter: { label: 'Chapter from selection', targetLayer: 'Chapters', exportImpact: 'Adds a chapter marker at the selected transcript line.' },
      ripple_cut: { label: 'Ripple delete words', targetLayer: 'Scene builder', exportImpact: 'Builds a scene that skips selected transcript words and closes the gap.' }
    }[act];
    var detail = shortTs(start) + ' - ' + shortTs(end) + ', ' + Math.round((end - start) * 10) / 10 + 's.';
    if (act === 'trim_before') detail = 'New export starts at ' + shortTs(start) + (dur ? '; about ' + Math.round(start * 10) / 10 + 's before it is excluded.' : '.');
    else if (act === 'trim_after') detail = 'New export ends at ' + shortTs(end) + (dur ? '; about ' + Math.max(0, Math.round((dur - end) * 10) / 10) + 's after it is excluded.' : '.');
    else if (act === 'chapter') detail = 'Chapter marker starts at ' + shortTs(start) + '.';
    return {
      id: 'txedit-' + act + '-' + Math.round(start * 1000) + '-' + Math.round(end * 1000),
      action: act,
      label: meta.label,
      targetLayer: meta.targetLayer,
      start: start,
      end: end,
      duration: Math.max(0.03, end - start),
      lineCount: Math.max(1, Math.min(999, Math.round(Number(r.lineCount) || (Array.isArray(r.indices) ? r.indices.length : 1)))),
      indices: (Array.isArray(r.indices) ? r.indices : []).map(function (idx) { return Math.round(Number(idx)); }).filter(function (idx) { return isFinite(idx) && idx >= 0; }).slice(0, 200),
      text: clean(r.text, 240),
      detail: detail,
      exportImpact: meta.exportImpact,
      source: 'transcript',
      status: clean(ctx.status || 'planned', 24) || 'planned'
    };
  }

  function vsSanitizeTranscriptEdits(list, duration) {
    var dur = Math.max(0, Number(duration) || 0);
    var clean = function (v, limit) { return String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit || 160); };
    var out = [];
    (Array.isArray(list) ? list : []).forEach(function (raw) {
      if (!raw || out.length >= 120) return;
      var decision = vsBuildTranscriptEditDecision(raw.action || raw.type || raw.kind, raw, { duration: dur, status: raw.status || 'applied' });
      if (!decision) return;
      var rawId = clean(raw.id, 80).replace(/[^a-zA-Z0-9_.:-]+/g, '-').replace(/^-+|-+$/g, '');
      if (rawId) decision.id = rawId;
      decision.createdAt = clean(raw.createdAt || raw.appliedAt, 40);
      decision.status = (/^(planned|applied|archived)$/).test(clean(raw.status || 'applied', 24)) ? clean(raw.status || 'applied', 24) : 'applied';
      out.push(decision);
    });
    return out;
  }

  function vsBuildTranscriptEditText(edits, title) {
    var list = vsSanitizeTranscriptEdits(edits, 0);
    var shortTs = function (sec) { return vsFormatTimestamp(sec).replace(/^00:/, '').replace(/\.\d+$/, ''); };
    var lines = [
      String(title || 'Video project') + ' transcript edit decisions',
      'Generated by AlloFlow Video Studio',
      ''
    ];
    if (!list.length) {
      lines.push('No transcript-based edit decisions were recorded.');
      return lines.join('\n') + '\n';
    }
    list.forEach(function (item, idx) {
      lines.push((idx + 1) + '. ' + item.label);
      lines.push('   Time: ' + shortTs(item.start) + ' - ' + shortTs(item.end) + ' (' + Math.round(item.duration * 10) / 10 + 's)');
      lines.push('   Impact: ' + item.exportImpact);
      if (item.text) lines.push('   Transcript: ' + item.text);
    });
    return lines.join('\n').replace(/\n+$/, '\n');
  }

  function vsTranscriptWordsFromCues(cues, duration) {
    var dur = Math.max(0, Number(duration) || 0);
    var out = [];
    (Array.isArray(cues) ? cues : []).forEach(function (cue, cueIndex) {
      if (!cue || out.length >= 10000) return;
      var text = String(cue.text || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
      var parts = text ? text.split(/\s+/).filter(Boolean) : [];
      if (!parts.length) return;
      var start = Math.max(0, Number(cue.start) || 0);
      var end = Math.max(start + 0.03, Number(cue.end) || start + Math.max(0.3, parts.length * 0.22));
      if (dur) end = Math.min(dur, end);
      var span = Math.max(0.03, end - start);
      parts.forEach(function (word, wordIndex) {
        if (out.length >= 10000) return;
        var a = start + span * (wordIndex / parts.length);
        var b = start + span * ((wordIndex + 1) / parts.length);
        out.push({
          index: out.length,
          cueIndex: cueIndex,
          wordIndex: wordIndex,
          start: a,
          end: Math.max(a + 0.03, b),
          source: 'estimated',
          word: String(word).slice(0, 80),
          text: String(word).slice(0, 80),
          normalized: String(word).toLowerCase().replace(/[^a-z0-9']+/g, '').slice(0, 80)
        });
      });
    });
    return out;
  }

  function vsSanitizeTranscriptWords(raw, duration) {
    var dur = Math.max(0, Number(duration) || 0);
    var list = [];
    var pushItems = function (items, cueIndex) {
      (Array.isArray(items) ? items : []).forEach(function (item) {
        if (!item) return;
        if (cueIndex != null && item.cueIndex == null && item.cue_index == null) list.push(Object.assign({}, item, { cueIndex: cueIndex }));
        else list.push(item);
      });
    };
    if (Array.isArray(raw)) pushItems(raw, null);
    else if (raw) {
      if (Array.isArray(raw.words)) pushItems(raw.words, null);
      else if (Array.isArray(raw.chunks)) pushItems(raw.chunks, null);
      else if (Array.isArray(raw.segments)) {
        raw.segments.forEach(function (seg, idx) {
          if (seg && Array.isArray(seg.words)) pushItems(seg.words, idx);
          else pushItems([seg], idx);
        });
      } else if (Array.isArray(raw.results)) {
        raw.results.forEach(function (res, idx) {
          if (res && Array.isArray(res.words)) pushItems(res.words, idx);
          else if (res && Array.isArray(res.chunks)) pushItems(res.chunks, idx);
          else pushItems([res], idx);
        });
      }
    }
    var out = [];
    var clean = function (v) { return String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim(); };
    var firstNumber = function () {
      for (var i = 0; i < arguments.length; i++) {
        var n = Number(arguments[i]);
        if (isFinite(n)) return n;
      }
      return NaN;
    };
    var numericIndex = function (v, fallback) {
      var n = Math.round(Number(v));
      return isFinite(n) && n >= 0 ? n : fallback;
    };
    list.forEach(function (item, itemIndex) {
      if (!item || out.length >= 10000) return;
      var ts = Array.isArray(item.timestamp) ? item.timestamp : (Array.isArray(item.timestamps) ? item.timestamps : (Array.isArray(item.time) ? item.time : null));
      var text = clean(item.word != null ? item.word : (item.text != null ? item.text : item.token));
      if (!text) return;
      var start = ts ? firstNumber(ts[0]) : firstNumber(item.start, item.start_time, item.from, item.t);
      var end = ts ? firstNumber(ts[1]) : firstNumber(item.end, item.end_time, item.to);
      if (!isFinite(start)) return;
      if (!isFinite(end)) end = start + Math.max(0.12, Math.min(0.6, Number(item.duration) || 0.28));
      start = Math.max(0, start);
      end = Math.max(start + 0.03, end);
      if (dur) {
        if (start > dur + 0.5) return;
        start = Math.min(dur, start);
        end = Math.min(dur, Math.max(start + 0.03, end));
      }
      var parts = text.split(/\s+/).filter(Boolean);
      if (!parts.length) return;
      var span = Math.max(0.03, end - start);
      var cueIndex = numericIndex(item.cueIndex != null ? item.cueIndex : item.cue_index, null);
      var baseWordIndex = numericIndex(item.wordIndex != null ? item.wordIndex : (item.word_index != null ? item.word_index : itemIndex), itemIndex);
      parts.forEach(function (part, partIndex) {
        if (out.length >= 10000) return;
        var a = parts.length === 1 ? start : start + span * (partIndex / parts.length);
        var b = parts.length === 1 ? end : start + span * ((partIndex + 1) / parts.length);
        var wordText = String(part).slice(0, 80);
        out.push({
          index: out.length,
          cueIndex: cueIndex,
          wordIndex: baseWordIndex + partIndex,
          start: a,
          end: Math.max(a + 0.03, b),
          source: 'true',
          word: wordText,
          text: wordText,
          normalized: wordText.toLowerCase().replace(/[^a-z0-9']+/g, '').slice(0, 80)
        });
      });
    });
    out.sort(function (a, b) { return a.start - b.start || a.end - b.end || a.index - b.index; });
    out.forEach(function (w, idx) { w.index = idx; });
    return out;
  }

  function vsTranscriptWordsForTake(cues, transcriptWords, duration) {
    var timed = vsSanitizeTranscriptWords(transcriptWords, duration);
    return timed.length ? timed : vsTranscriptWordsFromCues(cues, duration);
  }

  function vsCaptionCuesFromTranscriptWords(transcriptWords, duration) {
    var words = vsSanitizeTranscriptWords(transcriptWords, duration);
    var cues = [];
    var cur = null;
    var joinWords = function (parts) { return parts.join(' ').replace(/\s+([,.;:!?])/g, '$1').trim(); };
    var flush = function () {
      if (!cur || !cur.parts.length) return;
      cues.push({ start: cur.start, end: Math.max(cur.start + 0.2, cur.end), text: joinWords(cur.parts).slice(0, 240) });
      cur = null;
    };
    words.forEach(function (w) {
      var text = String(w.text || w.word || '').trim();
      if (!text) return;
      var start = Number(w.start), end = Number(w.end);
      if (!isFinite(start) || !isFinite(end) || end <= start) return;
      var needsNew = !cur || (start - cur.end > 0.75) || (end - cur.start > 5.5) || (joinWords(cur.parts).length + text.length > 82) || /[.!?]$/.test(joinWords(cur.parts));
      if (needsNew) flush();
      if (!cur) cur = { start: start, end: end, parts: [] };
      cur.parts.push(text);
      cur.end = Math.max(cur.end, end);
    });
    flush();
    return cues;
  }

  function vsTranscriptWordSelectionRanges(words, indices, duration, padding) {
    var list = Array.isArray(words) ? words : [];
    var dur = Math.max(0, Number(duration) || 0);
    var pad = Math.max(0, Math.min(0.5, Number(padding) || 0));
    var seen = {};
    var picked = [];
    (Array.isArray(indices) ? indices : []).forEach(function (idx) {
      idx = Math.round(Number(idx));
      if (!isFinite(idx) || idx < 0 || idx >= list.length || seen[idx]) return;
      var w = list[idx] || {};
      var a = Number(w.start), b = Number(w.end);
      if (!isFinite(a) || !isFinite(b) || b <= a) return;
      seen[idx] = true;
      picked.push({ index: idx, start: a, end: b, text: String(w.text || '').trim(), cueIndex: Math.round(Number(w.cueIndex) || 0), wordIndex: Math.round(Number(w.wordIndex) || 0) });
    });
    picked.sort(function (a, b) { return a.start - b.start || a.index - b.index; });
    if (!picked.length) return null;
    var ranges = [];
    picked.forEach(function (w) {
      var start = Math.max(0, w.start - pad);
      var end = dur ? Math.min(dur, w.end + pad) : w.end + pad;
      var last = ranges[ranges.length - 1];
      if (last && start <= last.end + 0.04) {
        last.end = Math.max(last.end, end);
        last.indices.push(w.index);
        last.text = (last.text + ' ' + w.text).trim();
      } else {
        ranges.push({ start: start, end: Math.max(start + 0.03, end), indices: [w.index], text: w.text });
      }
    });
    var startAll = ranges[0].start;
    var endAll = ranges[ranges.length - 1].end;
    return {
      start: startAll,
      end: endAll,
      duration: Math.max(0.03, endAll - startAll),
      ranges: ranges,
      indices: picked.map(function (w) { return w.index; }),
      wordCount: picked.length,
      lineCount: picked.length,
      text: picked.map(function (w) { return w.text; }).filter(Boolean).join(' ')
    };
  }

  function vsBuildRippleKeepSegments(duration, removals, minSegment) {
    var dur = Math.max(0, Number(duration) || 0);
    var min = Math.max(0.03, Number(minSegment) || 0.12);
    if (!dur) return [];
    var clean = [];
    (Array.isArray(removals) ? removals : []).forEach(function (r) {
      if (!r) return;
      var a = Math.max(0, Math.min(dur, Number(r.start) || 0));
      var b = Math.max(a, Math.min(dur, Number(r.end) || 0));
      if (b - a >= 0.03) clean.push({ start: a, end: b });
    });
    clean.sort(function (a, b) { return a.start - b.start || a.end - b.end; });
    var merged = [];
    clean.forEach(function (r) {
      var last = merged[merged.length - 1];
      if (last && r.start <= last.end + 0.04) last.end = Math.max(last.end, r.end);
      else merged.push({ start: r.start, end: r.end });
    });
    var out = [];
    var cursor = 0;
    var output = 0;
    merged.forEach(function (r) {
      if (r.start - cursor >= min) {
        out.push({ start: cursor, end: r.start, duration: r.start - cursor, outputStart: output, outputEnd: output + (r.start - cursor) });
        output += r.start - cursor;
      }
      cursor = Math.max(cursor, r.end);
    });
    if (dur - cursor >= min) out.push({ start: cursor, end: dur, duration: dur - cursor, outputStart: output, outputEnd: output + (dur - cursor) });
    return out;
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

  function vsParsePronunciationGlossary(raw) {
    var entries = [];
    String(raw || '').slice(0, 4000).split(/\r?\n/).forEach(function (line) {
      if (entries.length >= 40) return;
      var clean = String(line || '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim();
      if (!clean) return;
      var match = /^(.{1,60}?)\s*(?:=|->|→|\t)\s*(.{1,100})$/.exec(clean);
      if (!match) return;
      var term = match[1].trim(), spoken = match[2].trim();
      if (!term || !spoken || term.toLowerCase() === spoken.toLowerCase()) return;
      if (entries.some(function (item) { return item.term.toLowerCase() === term.toLowerCase(); })) return;
      entries.push({ term: term, spoken: spoken });
    });
    return entries.sort(function (a, b) { return b.term.length - a.term.length; });
  }

  function vsApplyPronunciationGlossary(text, rawGlossary) {
    var source = String(text || '').slice(0, 12000);
    var entries = Array.isArray(rawGlossary) ? rawGlossary : vsParsePronunciationGlossary(rawGlossary);
    if (!source || !entries.length) return source;
    var map = {};
    entries.forEach(function (entry) { map[String(entry.term).toLowerCase()] = String(entry.spoken); });
    var pattern = entries.map(function (entry) { return String(entry.term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|');
    if (!pattern) return source;
    return source.replace(new RegExp(pattern, 'gi'), function (match, offset, whole) {
      var before = offset > 0 ? whole.charAt(offset - 1) : '';
      var after = whole.charAt(offset + match.length);
      if (/[A-Za-z0-9]/.test(before) || /[A-Za-z0-9]/.test(after)) return match;
      return map[match.toLowerCase()] || match;
    });
  }
  // Turn a freeform script into editable timed narration cues. Paragraphs and
  // sentences remain natural units; long passages are word-chunked, then each
  // cue receives timeline space proportional to its estimated speaking time.
  function vsScriptTextToNarrationCues(rawText, duration, options) {
    var text = String(rawText || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ').trim().slice(0, 12000);
    var dur = Math.max(0.1, Number(duration) || 0.1);
    var opts = options && typeof options === 'object' ? options : {};
    var targetWords = Math.max(6, Math.min(36, Math.round(Number(opts.targetWords) || 22)));
    if (!text) return [];
    var units = [];
    text.split(/\n+/).forEach(function (paragraph) {
      var clean = paragraph.replace(/\s+/g, ' ').trim();
      if (!clean) return;
      var sentences = clean.match(/[^.!?]+[.!?]+(?:["']+)?|[^.!?]+$/g) || [clean];
      sentences.forEach(function (sentence) {
        var words = String(sentence || '').trim().split(/\s+/).filter(Boolean);
        while (words.length) {
          var take = words.splice(0, Math.min(targetWords, words.length));
          var line = take.join(' ').trim().slice(0, 220);
          if (line) units.push(line);
        }
      });
    });
    if (units.length > 20) {
      var head = units.slice(0, 19);
      head.push(units.slice(19).join(' ').slice(0, 220));
      units = head;
    }
    var weights = units.map(function (line) { return Math.max(1, line.split(/\s+/).filter(Boolean).length / 2.5 + 0.35); });
    var totalWeight = weights.reduce(function (sum, value) { return sum + value; }, 0) || 1;
    var cursor = Math.min(0.3, dur * 0.02);
    var usable = Math.max(0.1, dur - cursor);
    var cues = units.map(function (line, index) {
      var slot = usable * weights[index] / totalWeight;
      var start = cursor;
      cursor += slot;
      return { start: Math.round(start * 100) / 100, end: Math.round(Math.min(dur, Math.max(start + 0.8, cursor - 0.12)) * 100) / 100, text: line };
    });
    return vsSanitizeNarrationCues(cues, dur);
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

  function vsCaptionStylePreset(key) {
    var id = String(key || 'clean-card').toLowerCase().replace(/[\s_]+/g, '-');
    var presets = {
      'clean-card': {
        key: 'clean-card',
        label: 'Clean card',
        className: 'caption-style-clean-card',
        box: true,
        position: 'bottom',
        align: 'center',
        textColor: '#ffffff',
        background: 'rgba(15,23,42,0.78)',
        border: 'rgba(255,255,255,0.24)',
        shadow: 'rgba(0,0,0,0.42)',
        stroke: 'rgba(0,0,0,0.45)',
        scale: 1,
        maxLines: 3
      },
      'open-subtitle': {
        key: 'open-subtitle',
        label: 'Open subtitle',
        className: 'caption-style-open-subtitle',
        box: false,
        position: 'bottom',
        align: 'center',
        textColor: '#ffffff',
        background: 'transparent',
        border: 'transparent',
        shadow: 'rgba(0,0,0,0.82)',
        stroke: 'rgba(0,0,0,0.92)',
        scale: 1.04,
        maxLines: 3
      },
      'high-contrast': {
        key: 'high-contrast',
        label: 'High contrast',
        className: 'caption-style-high-contrast',
        box: true,
        position: 'bottom',
        align: 'center',
        textColor: '#ffff00',
        background: '#000000',
        border: '#ffffff',
        shadow: 'rgba(0,0,0,0.72)',
        stroke: '#000000',
        scale: 1.02,
        maxLines: 3
      },
      'lower-third': {
        key: 'lower-third',
        label: 'Lower third',
        className: 'caption-style-lower-third',
        box: true,
        position: 'lower-left',
        align: 'left',
        textColor: '#ffffff',
        background: 'rgba(30,64,175,0.84)',
        border: 'rgba(191,219,254,0.65)',
        shadow: 'rgba(0,0,0,0.38)',
        stroke: 'rgba(0,0,0,0.42)',
        scale: 0.94,
        maxLines: 3
      }
    };
    return Object.assign({}, presets[id] || presets['clean-card']);
  }

  function vsCaptionDisplayOptions(raw, presetKey) {
    var src = raw && typeof raw === 'object' ? raw : {};
    var pick = function (value, allowed, fallback) {
      var id = String(value == null || value === '' ? fallback : value).toLowerCase().replace(/[\s_]+/g, '-');
      return Object.prototype.hasOwnProperty.call(allowed, id) ? id : fallback;
    };
    return {
      styleKey: vsCaptionStylePreset(presetKey || src.styleKey || src.style).key,
      size: pick(src.size || src.captionSize, { small: 1, medium: 1, large: 1 }, 'medium'),
      font: pick(src.font || src.captionFont, { system: 1, rounded: 1, legible: 1, mono: 1 }, 'system'),
      position: pick(src.position || src.captionPosition, { preset: 1, bottom: 1, top: 1, 'lower-third': 1 }, 'preset'),
      background: pick(src.background || src.captionBackground, { preset: 1, soft: 1, solid: 1, none: 1 }, 'preset'),
      opacity: pick(src.opacity || src.captionOpacity, { preset: 1, subtle: 1, medium: 1, strong: 1 }, 'preset')
    };
  }

  function vsResolveCaptionStyle(key, custom) {
    var preset = vsCaptionStylePreset(key);
    var opt = vsCaptionDisplayOptions(custom, preset.key);
    var out = Object.assign({}, preset);
    var sizeScale = { small: 0.86, medium: 1, large: 1.16 };
    var fonts = {
      system: { family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', weight: 800 },
      rounded: { family: '"Trebuchet MS", "Segoe UI Rounded", system-ui, sans-serif', weight: 800 },
      legible: { family: '"Atkinson Hyperlegible", Verdana, Arial, sans-serif', weight: 800 },
      mono: { family: '"Cascadia Mono", Consolas, "Courier New", monospace', weight: 750 }
    };
    var alpha = { subtle: 0.62, medium: 0.78, strong: 0.92 };
    out.custom = opt;
    out.scale = (Number(out.scale) || 1) * sizeScale[opt.size];
    out.fontFamily = fonts[opt.font].family;
    out.fontWeight = fonts[opt.font].weight;
    out.previewFontSize = Math.max(15, Math.min(30, Math.round(20 * out.scale)));
    if (opt.position === 'top') {
      out.position = 'top';
      out.align = 'center';
      out.positionClass = 'caption-position-top';
    } else if (opt.position === 'bottom') {
      out.position = 'bottom';
      out.align = 'center';
      out.positionClass = 'caption-position-bottom';
    } else if (opt.position === 'lower-third') {
      out.position = 'lower-left';
      out.align = 'left';
      out.positionClass = 'caption-position-lower-third';
    } else {
      out.positionClass = out.position === 'top' ? 'caption-position-top' : (out.position === 'lower-left' ? 'caption-position-lower-third' : 'caption-position-bottom');
    }
    if (opt.background === 'none') {
      out.box = false;
      out.background = 'transparent';
      out.border = 'transparent';
      out.shadow = 'rgba(0,0,0,0.86)';
      out.stroke = 'rgba(0,0,0,0.96)';
      out.contrastNote = 'Outline added for readability.';
    } else if (opt.background === 'solid') {
      out.box = true;
      out.background = '#000000';
      out.border = '#ffffff';
      out.shadow = 'rgba(0,0,0,0.78)';
      out.stroke = '#000000';
      out.contrastNote = out.textColor === '#ffff00' ? 'High-contrast caption style.' : '';
    } else if (opt.background === 'soft') {
      var a = alpha[opt.opacity === 'preset' ? 'medium' : opt.opacity];
      out.box = true;
      out.background = out.position === 'lower-left' ? ('rgba(30,64,175,' + a + ')') : ('rgba(15,23,42,' + a + ')');
      out.border = 'rgba(255,255,255,' + Math.min(0.62, Math.max(0.22, a - 0.34)).toFixed(2) + ')';
      out.shadow = 'rgba(0,0,0,' + Math.min(0.78, Math.max(0.36, a - 0.18)).toFixed(2) + ')';
    } else if (opt.opacity !== 'preset' && /^rgba\(/.test(String(out.background || ''))) {
      out.background = String(out.background).replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, function (_, r, g, b) {
        return 'rgba(' + r.trim() + ',' + g.trim() + ',' + b.trim() + ',' + alpha[opt.opacity] + ')';
      });
      out.shadow = 'rgba(0,0,0,' + Math.min(0.78, Math.max(0.36, alpha[opt.opacity] - 0.18)).toFixed(2) + ')';
    }
    return out;
  }

  function vsTitleCardPreset(key) {
    var id = String(key || 'clean-classroom').toLowerCase().replace(/[\s_]+/g, '-');
    var presets = {
      'clean-classroom': {
        key: 'clean-classroom',
        label: 'Clean classroom',
        background: '#101827',
        panel: '#172033',
        text: '#f8fafc',
        muted: '#c7d2fe',
        accent: '#f59e0b',
        accent2: '#38bdf8',
        footer: 'Made with AlloFlow Video Studio',
        align: 'center'
      },
      'bold-contrast': {
        key: 'bold-contrast',
        label: 'Bold contrast',
        background: '#000000',
        panel: '#111827',
        text: '#ffffff',
        muted: '#fde047',
        accent: '#fde047',
        accent2: '#ffffff',
        footer: 'AlloFlow Video Studio',
        align: 'center'
      },
      'calm-family': {
        key: 'calm-family',
        label: 'Calm family',
        background: '#0f2f2b',
        panel: '#164e45',
        text: '#f8fafc',
        muted: '#ccfbf1',
        accent: '#fcd34d',
        accent2: '#99f6e4',
        footer: 'Student and family explainer',
        align: 'left'
      },
      'tutorial-step': {
        key: 'tutorial-step',
        label: 'Tutorial step',
        background: '#eef2ff',
        panel: '#ffffff',
        text: '#0f172a',
        muted: '#334155',
        accent: '#2563eb',
        accent2: '#14b8a6',
        footer: 'Step-by-step walkthrough',
        align: 'left'
      }
    };
    return Object.assign({}, presets[id] || presets['clean-classroom']);
  }

  function vsPipFramePreset(key) {
    var id = String(key || 'clean-circle').toLowerCase().replace(/[\s_]+/g, '-');
    var presets = {
      'clean-circle': {
        key: 'clean-circle',
        label: 'Clean circle',
        shape: 'circle',
        widthScale: 0.28,
        border: '#ffffff',
        shadow: 'rgba(0,0,0,0.42)',
        labelText: ''
      },
      'rounded-card': {
        key: 'rounded-card',
        label: 'Rounded card',
        shape: 'rounded',
        widthScale: 0.34,
        border: '#c7d2fe',
        shadow: 'rgba(0,0,0,0.46)',
        labelText: ''
      },
      'teacher-label': {
        key: 'teacher-label',
        label: 'Teacher label',
        shape: 'rounded',
        widthScale: 0.34,
        border: '#38bdf8',
        shadow: 'rgba(0,0,0,0.50)',
        labelText: 'Teacher'
      },
      'minimal': {
        key: 'minimal',
        label: 'Minimal',
        shape: 'rounded',
        widthScale: 0.30,
        border: 'rgba(255,255,255,0.62)',
        shadow: 'rgba(0,0,0,0.28)',
        labelText: ''
      }
    };
    return Object.assign({}, presets[id] || presets['clean-circle']);
  }

  function vsInsertCardLayout(key) {
    var id = String(key || 'center-card').toLowerCase().replace(/[\s_]+/g, '-');
    var layouts = {
      'center-card': { key: 'center-card', label: 'Center card', placement: 'center', align: 'center' },
      'lower-banner': { key: 'lower-banner', label: 'Lower banner', placement: 'bottom', align: 'left' },
      'split-panel': { key: 'split-panel', label: 'Split panel', placement: 'left', align: 'left' }
    };
    return Object.assign({}, layouts[id] || layouts['center-card']);
  }

  function vsCaptionPreviewLines(text, maxChars, maxLines) {
    var words = String(text || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    var limit = Math.max(18, Math.min(72, Math.round(Number(maxChars) || 42)));
    var lines = [];
    var line = '';
    for (var i = 0; i < words.length; i++) {
      var probe = line ? line + ' ' + words[i] : words[i];
      if (probe.length > limit && line) { lines.push(line); line = words[i]; }
      else line = probe;
    }
    if (line) lines.push(line);
    var max = Math.max(1, Math.min(4, Math.round(Number(maxLines) || 3)));
    if (lines.length > max) {
      var kept = lines.slice(0, max);
      var rest = lines.slice(max).join(' ');
      kept[max - 1] = (kept[max - 1] + ' ' + rest).trim();
      while (kept[max - 1].length > limit && kept[max - 1].length > 1) kept[max - 1] = kept[max - 1].slice(0, -1).trim();
      kept[max - 1] = kept[max - 1].replace(/[.,;:!?-]*$/, '') + '...';
      return kept;
    }
    return lines;
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
    var styles = { label: 1, box: 1, spotlight: 1, arrow: 1 };
    var layouts = { 'center-card': 1, 'lower-banner': 1, 'split-panel': 1 };
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
      var style = String(s.style || s.calloutStyle || '').toLowerCase().replace(/[\s-]+/g, '_');
      var layout = String(s.layout || s.cardLayout || '').toLowerCase().replace(/[\s_]+/g, '-');
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
        style: styles[style] ? style : (type === 'callout' ? 'arrow' : 'label'),
        layout: layouts[layout] ? layout : 'center-card',
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
  function vsSanitizeLocalizedDraft(raw, duration) {
    var dur = Math.max(0.1, Number(duration) || 0.1);
    var src = raw && (raw.localization || raw.localized || raw.draft || raw.result) ? (raw.localization || raw.localized || raw.draft || raw.result) : (raw || {});
    var clean = function (v, max) { return String(v || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); };
    var time = function (v, fallback) {
      v = Number(v);
      return isFinite(v) ? Math.max(0, Math.min(dur, v)) : fallback;
    };
    var styleKey = String(src.style || src.mode || 'natural').toLowerCase().replace(/[\s-]+/g, '_');
    var styleMap = { literal: 'literal', natural: 'natural', classroom: 'natural', interpreter: 'interpreter', interpretation: 'interpreter', family: 'family', simplified: 'family', bilingual: 'bilingual' };
    var draft = {
      id: clean(src.id, 40) || ('loc' + Math.random().toString(36).slice(2, 8)),
      targetLanguage: clean(src.targetLanguage || src.language || src.locale, 80) || 'Target language',
      style: styleMap[styleKey] || 'natural',
      title: clean(src.title || src.localizedTitle || src.videoTitle, 160),
      captions: [],
      chapters: [],
      inserts: [],
      visualDescriptions: [],
      narration: [],
      speakerMap: [],
      reviewNotes: [],
      reviewed: !!src.reviewed,
      createdAt: clean(src.createdAt, 40)
    };
    var capList = Array.isArray(src.captions) ? src.captions : (Array.isArray(src.cues) ? src.cues : (Array.isArray(src.subtitles) ? src.subtitles : []));
    for (var i = 0; i < capList.length && draft.captions.length < 300; i++) {
      var c = capList[i] || {};
      var text = clean(c.text || c.translation || c.localizedText || c.caption, 500);
      var start = time(c.start != null ? c.start : c.t, NaN);
      if (!text || !isFinite(start)) continue;
      var end = time(c.end, NaN);
      if (!isFinite(end)) end = Math.min(dur, start + Math.max(1, Math.min(6, Number(c.duration || c.dur) || 2)));
      end = Math.max(start + 0.25, Math.min(dur, end));
      draft.captions.push({ start: start, end: end, text: text, speaker: clean(c.speaker || c.role || c.label, 50), originalText: clean(c.originalText || c.sourceText || c.original, 500) });
    }
    draft.captions.sort(function (a, b) { return a.start - b.start || a.end - b.end; });
    var chList = Array.isArray(src.chapters) ? src.chapters : [];
    for (var ch = 0; ch < chList.length && draft.chapters.length < 32; ch++) {
      var cc = chList[ch] || {};
      var ct = clean(cc.title || cc.text || cc.label, 100);
      var cs = time(cc.start != null ? cc.start : cc.t, NaN);
      if (ct && isFinite(cs)) draft.chapters.push({ start: cs, title: ct });
    }
    draft.chapters.sort(function (a, b) { return a.start - b.start; });
    draft.inserts = vsSanitizeTeachingInserts(src.inserts || src.teachingInserts || src.overlays || [], dur).map(function (ins) {
      if (!ins.source) ins.source = 'localization';
      return ins;
    });
    var rawVisual = src.visualDescriptions || src.descriptions || src.visualDescription || [];
    var srcVisualList = Array.isArray(rawVisual) ? rawVisual : (rawVisual && Array.isArray(rawVisual.descriptions) ? rawVisual.descriptions : []);
    draft.visualDescriptions = vsSanitizeVisualDescriptions(rawVisual, dur).map(function (s, idx) {
      s.checked = !!(srcVisualList[idx] && srcVisualList[idx].checked);
      return s;
    });
    var nList = Array.isArray(src.narration) ? src.narration : (Array.isArray(src.interpreterScript) ? src.interpreterScript : (Array.isArray(src.dubbing) ? src.dubbing : (Array.isArray(src.segments) ? src.segments : [])));
    for (var n = 0; n < nList.length && draft.narration.length < 40; n++) {
      var seg = nList[n] || {};
      var nt = clean(seg.text || seg.line || seg.translation || seg.script, 360);
      var ns = time(seg.start != null ? seg.start : seg.t, NaN);
      if (!nt || !isFinite(ns)) continue;
      var ne = time(seg.end, NaN);
      if (!isFinite(ne)) ne = Math.min(dur, ns + Math.max(1, Math.min(10, Number(seg.duration || seg.dur) || Math.max(2, nt.length / 18))));
      ne = Math.max(ns + 0.4, Math.min(dur, ne));
      draft.narration.push({ start: ns, end: ne, text: nt, speaker: clean(seg.speaker || seg.role || 'Interpreter', 50) || 'Interpreter', originalText: clean(seg.originalText || seg.sourceText || seg.original, 500) });
    }
    draft.narration.sort(function (a, b) { return a.start - b.start || a.end - b.end; });
    for (var ni = 1; ni < draft.narration.length; ni++) {
      if (draft.narration[ni].start < draft.narration[ni - 1].start + 0.45) {
        draft.narration[ni].start = Math.min(dur, draft.narration[ni - 1].start + 0.45);
        draft.narration[ni].end = Math.max(draft.narration[ni].start + 0.4, draft.narration[ni].end);
      }
    }
    var speakers = Array.isArray(src.speakerMap) ? src.speakerMap : (Array.isArray(src.speakers) ? src.speakers : []);
    if (!speakers.length && src.speakerMap && typeof src.speakerMap === 'object') {
      Object.keys(src.speakerMap).forEach(function (k) { speakers.push({ speaker: k, translatedLabel: src.speakerMap[k] }); });
    }
    speakers.slice(0, 12).forEach(function (s) {
      var label = clean(s && (s.speaker || s.label || s.id), 50);
      var translated = clean(s && (s.translatedLabel || s.translation || s.localized || s.role), 80);
      if (label || translated) draft.speakerMap.push({ speaker: label || translated, translatedLabel: translated || label, voice: clean(s && s.voice, 40) });
    });
    var notes = Array.isArray(src.reviewNotes) ? src.reviewNotes : (Array.isArray(src.notes) ? src.notes : (Array.isArray(src.warnings) ? src.warnings : (src.reviewNotes || src.notes ? [src.reviewNotes || src.notes] : [])));
    notes.slice(0, 12).forEach(function (note) {
      note = clean(note && (note.text || note.note || note.message) || note, 220);
      if (note) draft.reviewNotes.push(note);
    });
    return draft;
  }

  function vsAnalyzeLocalizationDraft(draftRaw, sourceCues, options) {
    var opts = options || {};
    var duration = Math.max(0.1, Number(opts.duration) || 0.1);
    var draft = vsSanitizeLocalizedDraft(draftRaw || {}, duration);
    var source = (Array.isArray(sourceCues) ? sourceCues : []).filter(function (c) { return c && String(c.text || '').trim(); });
    var warnings = [];
    var add = function (severity, label, detail) {
      warnings.push({ severity: severity || 'warn', label: String(label || 'Review'), detail: String(detail || '').slice(0, 220) });
    };
    if (!draft.captions.length && source.length) add('warn', 'Missing translated captions', 'The draft has source captions but no translated caption lines.');
    if (source.length && draft.captions.length) {
      var delta = Math.abs(source.length - draft.captions.length);
      if (delta > Math.max(2, Math.ceil(source.length * 0.25))) add('warn', 'Caption count changed', 'Source has ' + source.length + ' caption lines; localized draft has ' + draft.captions.length + '.');
      var pairs = Math.min(source.length, draft.captions.length, 60);
      var drift = 0;
      for (var i = 0; i < pairs; i++) {
        if (Math.abs((Number(source[i].start) || 0) - (Number(draft.captions[i].start) || 0)) > 1.5) drift++;
      }
      if (drift > Math.max(2, Math.ceil(pairs * 0.2))) add('warn', 'Caption timing drift', drift + ' translated caption line(s) are more than 1.5 seconds from the source timing.');
    }
    var longCaps = draft.captions.filter(function (c) { return String(c.text || '').length > 220; }).length;
    if (longCaps) add('review', 'Long subtitle lines', longCaps + ' translated caption line(s) may be too long to read comfortably.');
    var speakerCaps = draft.captions.filter(function (c) { return String(c.speaker || '').trim(); });
    if (speakerCaps.length && !draft.speakerMap.length) add('review', 'Speaker labels need review', 'Translated captions include speaker labels but no speaker map.');
    var glossary = String(opts.glossary || '').split(/[\n,;]/).map(function (s) {
      return String(s || '').split('=')[0].trim();
    }).filter(function (s) { return s.length >= 3; }).slice(0, 30);
    if (glossary.length) {
      var locText = JSON.stringify({ captions: draft.captions, chapters: draft.chapters, inserts: draft.inserts, visualDescriptions: draft.visualDescriptions, narration: draft.narration }).toLowerCase();
      var missing = glossary.filter(function (term) { return locText.indexOf(term.toLowerCase()) === -1; }).slice(0, 6);
      if (missing.length) add('review', 'Glossary locks', 'Check locked term(s): ' + missing.join(', ') + '.');
    }
    var fastNarr = draft.narration.filter(function (n) {
      var secs = Math.max(0.4, (Number(n.end) || 0) - (Number(n.start) || 0));
      var words = String(n.text || '').split(/\s+/).filter(Boolean).length;
      return words / secs > 3.2;
    }).length;
    if (fastNarr) add('review', 'Interpreter pacing', fastNarr + ' interpreter line(s) may be too fast for the available time.');
    if (!draft.reviewed) add('review', 'Teacher review', 'Mark this localized draft reviewed before sharing it with students or families.');
    return {
      ok: warnings.length === 0,
      reviewed: !!draft.reviewed,
      warnings: warnings,
      captionCount: draft.captions.length,
      sourceCaptionCount: source.length,
      narrationCount: draft.narration.length,
      supportCount: draft.inserts.length + draft.chapters.length + draft.visualDescriptions.length
    };
  }

  function vsAnalyzeCaptionQuality(cues, duration) {
    var dur = Math.max(0, Number(duration) || 0);
    var list = (Array.isArray(cues) ? cues : []).filter(function (c) { return c && String(c.text || '').trim(); }).map(function (c, idx) {
      return {
        sourceIndex: idx,
        start: Math.max(0, Number(c.start) || 0),
        end: Math.max(0, Number(c.end) || 0),
        text: String(c.text || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
      };
    }).sort(function (a, b) { return a.start - b.start || a.end - b.end; });
    var warnings = [];
    var issues = [];
    var add = function (label, detail) {
      warnings.push({ label: String(label || 'Review'), detail: String(detail || '').slice(0, 220) });
    };
    var addIssue = function (kind, label, detail, c) {
      issues.push({
        kind: String(kind || 'review').slice(0, 40),
        label: String(label || 'Review').slice(0, 80),
        detail: String(detail || '').slice(0, 220),
        index: c && isFinite(Number(c.sourceIndex)) ? Math.max(0, Math.round(Number(c.sourceIndex))) : -1,
        start: c ? Math.max(0, Number(c.start) || 0) : 0,
        end: c ? Math.max(0, Number(c.end) || 0) : 0,
        text: c ? String(c.text || '').slice(0, 220) : ''
      });
    };
    if (!list.length) {
      add('Missing captions', 'Add or import captions before sharing.');
      addIssue('missing', 'Missing captions', 'Add or import captions before sharing.', null);
      return { ok: false, score: 0, warnings: warnings, issues: issues, captionCount: 0, longLineCount: 0, fastLineCount: 0, gapCount: 0, overlapCount: 0 };
    }
    var longLineCount = 0, fastLineCount = 0, gapCount = 0, overlapCount = 0;
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      var span = Math.max(0.25, c.end - c.start);
      if (c.text.length > 120) {
        longLineCount++;
        addIssue('long_line', 'Long caption lines', 'Caption ' + (c.sourceIndex + 1) + ' is ' + c.text.length + ' characters.', c);
      }
      if ((c.text.length / span) > 32) {
        fastLineCount++;
        addIssue('fast_line', 'Fast captions', 'Caption ' + (c.sourceIndex + 1) + ' may disappear too quickly.', c);
      }
      if (i > 0) {
        var gap = c.start - list[i - 1].end;
        if (gap > 12 && (!dur || c.start < dur - 2)) {
          gapCount++;
          addIssue('gap', 'Caption gaps', 'Long gap before caption ' + (c.sourceIndex + 1) + '.', c);
        }
        if (gap < -0.1) {
          overlapCount++;
          addIssue('overlap', 'Overlapping captions', 'Caption ' + (c.sourceIndex + 1) + ' overlaps the previous caption.', c);
        }
      }
    }
    if (longLineCount) add('Long caption lines', longLineCount + ' caption line(s) may be too long to read comfortably.');
    if (fastLineCount) add('Fast captions', fastLineCount + ' caption line(s) may disappear too quickly.');
    if (gapCount) add('Caption gaps', gapCount + ' long gap(s) may need captions or intentional silence review.');
    if (overlapCount) add('Overlapping captions', overlapCount + ' caption overlap(s) need timing cleanup.');
    var penalty = longLineCount + fastLineCount + gapCount + overlapCount;
    var score = Math.max(0, Math.min(100, Math.round(100 - (penalty / Math.max(1, list.length)) * 100)));
    issues.sort(function (a, b) { return a.start - b.start || a.index - b.index; });
    return { ok: warnings.length === 0, score: score, warnings: warnings, issues: issues, captionCount: list.length, longLineCount: longLineCount, fastLineCount: fastLineCount, gapCount: gapCount, overlapCount: overlapCount };
  }

  function vsBuildFinishChecklist(state) {
    var s = state || {};
    var review = s.review || {};
    var items = [];
    var targets = {
      video: { tab: 'tabRecord', focus: 'flowRecord', action: 'Start' },
      captions: { tab: 'tabEdit', focus: 'autoCapBtn', action: 'Review' },
      privacy: { tab: 'tabEdit', focus: 'transcriptSearch', action: 'Review' },
      audio: { tab: 'tabEdit', focus: 'editVideo', action: 'Preview' },
      localization: { tab: 'tabEdit', focus: 'localizeBtn', action: 'Review' },
      media: { tab: 'tabEdit', focus: 'mediaCreditTitle', action: 'Review' },
      export: { tab: 'tabExport', focus: 'exportBtn', action: 'Prepare' }
    };
    var add = function (id, label, status, detail) {
      var item = { id: id, label: label, status: status, detail: String(detail || '').slice(0, 220) };
      if (targets[id]) {
        item.targetTab = targets[id].tab;
        item.targetId = targets[id].focus;
        item.action = targets[id].action;
      }
    items.push(item);
  };
  add('video', 'Video selected', s.hasVideo ? 'complete' : 'pending', s.hasVideo ? 'A video take is selected.' : 'Record or import a video first.');
    var capWarn = Math.max(0, Number(s.captionWarningCount) || 0);
    add('captions', 'Captions reviewed', s.captionCount > 0 ? (capWarn ? 'warn' : (review.captions ? 'complete' : 'review')) : 'warn', s.captionCount > 0 ? (capWarn ? (capWarn + ' caption review item(s) need attention.') : (s.captionCount + ' caption line(s).')) : 'Add or import captions for accessibility.');
    var flagCount = Math.max(0, Number(s.privacyFlagCount) || 0);
    add('privacy', 'Privacy scan reviewed', flagCount ? 'warn' : (review.privacy ? 'complete' : 'review'), flagCount ? (flagCount + ' possible private detail(s) need review.') : 'No obvious private details flagged.');
    add('audio', 'Audio preview checked', review.audio ? 'complete' : 'review', s.hasAudioChanges ? 'Audio edits or added clips are present.' : 'Preview the final sound before sharing.');
    if (Number(s.localizationCount) > 0) {
      var locWarn = Math.max(0, Number(s.localizationWarningCount) || 0);
      add('localization', 'Localization reviewed', locWarn ? 'warn' : (review.localization ? 'complete' : 'review'), locWarn ? (locWarn + ' localization review item(s) need attention.') : (review.localization ? 'Teacher review is marked complete.' : 'Compare the localized lines, then mark teacher review complete.'));
    } else {
      add('localization', 'Localization', 'info', 'No localized draft attached.');
    }
    var mediaCount = Math.max(0, Number(s.mediaCreditCount) || 0);
    var mediaWarn = Math.max(0, Number(s.mediaCreditWarningCount) || 0);
    add('media', 'Media credits', mediaWarn ? 'warn' : (mediaCount ? 'complete' : 'info'), mediaWarn ? (mediaWarn + ' media credit(s) need license review.') : (mediaCount ? (mediaCount + ' stock/open media credit(s) recorded.') : 'No third-party stock/open media credits recorded.'));
    add('export', 'Export ready', s.exported ? 'complete' : 'pending', s.exported ? 'A finished video export is ready.' : 'Prepare export after the checks above.');
    return items;
  }

  function vsBuildExportReadinessSummary(state) {
    var s = state || {};
    var items = [];
    var add = function (id, label, status, detail) {
      items.push({ id: id, label: String(label || ''), status: status || 'info', detail: String(detail || '').slice(0, 220) });
    };
    add('video', 'Video export', s.hasExport ? 'complete' : 'pending', s.hasExport ? ('Ready at ' + vsFormatTimestamp(s.duration || 0) + '.') : 'Prepare an export before sharing.');
    var capCount = Math.max(0, Number(s.captionCount) || 0);
    var capWarn = Math.max(0, Number(s.captionWarningCount) || 0);
    if (capCount && s.capMode === 'none') add('captions', 'Captions', 'warn', capCount + ' caption line(s) exist, but captions are not attached to this export.');
    else if (capCount) add('captions', 'Captions', capWarn ? 'warn' : 'complete', (s.capMode === 'burn' ? 'Burned into the video' : 'Separate caption file') + ' with ' + capCount + ' line(s)' + (capWarn ? '; review timing/readability.' : '.'));
    else add('captions', 'Captions', 'warn', 'No captions are attached to this export.');
    var flags = Math.max(0, Number(s.privacyFlagCount) || 0);
    add('privacy', 'Privacy review', flags ? 'warn' : 'complete', flags ? (flags + ' possible private detail(s) were flagged.') : 'No obvious private details flagged.');
    var supports = Math.max(0, Number(s.visualDescriptionCount) || 0) + Math.max(0, Number(s.chapterCount) || 0) + Math.max(0, Number(s.teachingInsertCount) || 0) + Math.max(0, Number(s.visualOverlayCount) || 0);
    add('supports', 'Learning supports', supports ? 'complete' : 'info', supports ? (supports + ' support item(s): descriptions, chapters, inserts, or overlays.') : 'No extra learning supports attached.');
    var loc = Math.max(0, Number(s.localizationCount) || 0);
    add('localization', 'Localization', loc ? 'complete' : 'info', loc ? (loc + ' localized draft(s) included in the project/accessibility packet.') : 'No localized version attached.');
    var mediaCount = Math.max(0, Number(s.mediaCreditCount) || 0);
    var mediaWarn = Math.max(0, Number(s.mediaCreditWarningCount) || 0);
    add('media', 'Media credits', mediaWarn ? 'warn' : (mediaCount ? 'complete' : 'info'), mediaWarn ? (mediaWarn + ' media credit(s) should be reviewed before sharing.') : (mediaCount ? (mediaCount + ' media credit(s) included in the packets and project bundle.') : 'No third-party stock/open media credits recorded.'));
    if (s.preset === 'student_family') add('audience', 'Audience preset', 'complete', 'Student/family version: burned captions and title card are intended for simple playback.');
    return items;
  }

  function vsPickNextFinishItem(items) {
    var list = Array.isArray(items) ? items : [];
    var rank = { warn: 1, review: 2, pending: 3 };
    var order = { video: 1, captions: 2, privacy: 3, audio: 4, localization: 5, media: 6, export: 7 };
    var itemRank = function (item) {
      if (item && item.id === 'video' && item.status === 'pending') return 0;
      return rank[item && item.status] || 99;
    };
    var best = null;
    for (var i = 0; i < list.length; i++) {
      var item = list[i] || {};
      if (!rank[item.status]) continue;
      if (!best) { best = item; continue; }
      var br = itemRank(best), ir = itemRank(item);
      var bo = order[best.id] || 99, io = order[item.id] || 99;
      if (ir < br || (ir === br && io < bo)) best = item;
    }
    return best;
  }

  function vsBuildTranscriptResource(payload) {
    var p = payload || {};
    var clean = function (v, limit) {
      return String(v || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit || 120);
    };
    var title = clean(p.title || p.sourceTitle || 'Video transcript', 120) || 'Video transcript';
    var cues = Array.isArray(p.cues) ? p.cues : (typeof p.vtt === 'string' ? vsParseVtt(p.vtt) : []);
    cues = cues.filter(function (c) { return c && String(c.text || '').trim(); }).map(function (c) {
      return {
        start: Math.max(0, Number(c.start) || 0),
        end: Math.max(0, Number(c.end) || 0),
        text: String(c.text || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600)
      };
    }).slice(0, 1000);
    var transcript = String(p.transcript || '').replace(/\r/g, '').trim();
    if (!transcript && cues.length) {
      var lines = [title, 'Transcript generated locally by AlloFlow Video Studio.', ''];
      cues.forEach(function (c) {
        lines.push(vsFormatTimestamp(c.start || 0) + ' - ' + vsFormatTimestamp(c.end || 0) + '  ' + String(c.text || '').trim());
      });
      transcript = lines.join('\n').trim();
    }
    transcript = transcript.slice(0, 60000);
    var chapters = (Array.isArray(p.chapters) ? p.chapters : []).filter(function (c) {
      return c && isFinite(Number(c.start)) && String(c.title || '').trim();
    }).map(function (c) {
      return { start: Math.max(0, Number(c.start) || 0), title: clean(c.title, 90) };
    }).slice(0, 80);
    var slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'video';
    return {
      id: clean(p.id || ('video-transcript-' + slug), 90),
      type: 'video-transcript',
      kind: 'transcript',
      title: title.replace(/\s+transcript$/i, '') + ' transcript',
      text: transcript,
      content: transcript,
      meta: cues.length ? (cues.length + ' caption line' + (cues.length === 1 ? '' : 's') + ' from Video Studio') : 'Video Studio transcript',
      data: {
        title: title,
        transcript: transcript,
        cues: cues,
        chapters: chapters,
        duration: Math.max(0, Number(p.duration) || 0),
        source: 'video_studio'
      },
      source: 'video_studio',
      tags: ['video', 'transcript']
    };
  }

  function vsBuildStudentFamilyShareNote(state) {
    var s = state || {};
    var title = String(s.title || 'Teacher video').replace(/[\r\n]+/g, ' ').trim() || 'Teacher video';
    var capCount = Math.max(0, Number(s.captionCount) || 0);
    var chapterCount = Math.max(0, Number(s.chapterCount) || 0);
    var locCount = Math.max(0, Number(s.localizationCount) || 0);
    var flags = Math.max(0, Number(s.privacyFlagCount) || 0);
    var includes = ['the transcript'];
    if (capCount) includes.push('captions');
    if (chapterCount) includes.push('chapter markers');
    if (locCount) includes.push('localized draft files');
    return [
      'Student/family video packet',
      '',
      'Title: ' + title,
      'What is included: ' + includes.join(', ') + '.',
      '',
      'Suggested use:',
      '1. Watch the video first.',
      '2. Use the transcript or captions to review important words and steps.',
      chapterCount ? '3. Use the chapter markers to jump back to a section.' : '3. Rewatch any part that felt fast or unclear.',
      '',
      flags ? ('Teacher review note: ' + flags + ' possible private detail(s) were flagged. Review before sharing.') : 'Teacher review note: no obvious private details were flagged. Please still review before sharing.',
      locCount ? 'Localization note: translated materials are drafts and should be checked before sharing.' : ''
    ].filter(Boolean).join('\n');
  }

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

  // Demo Autopilot may drive the app only when the selected capture is clearly
  // the AlloFlow browser tab. General-purpose recording can still use any
  // surface; this stricter validator is intentionally limited to automation.
  // Gemini Canvas/Chromium sometimes redacts the captured tab title as an
  // internal web-contents-media-stream URL, so accept that label only when the
  // popup still has a live AlloFlow bridge.
  function vsValidateDemoCapture(displaySurface, trackLabel, options) {
    var surface = String(displaySurface || '').trim().toLowerCase();
    var label = String(trackLabel || '').trim().slice(0, 160);
    var opts = options || {};
    var hasAlloBridge = !!opts.openerConnected;
    var canvasStreamLabel = /^web-contents-media-stream:\/\//i.test(label);
    if (surface !== 'browser') return { ok: false, reason: 'Demo Autopilot requires a browser tab, not a window or entire screen.' };
    if (label && /alloflow/i.test(label)) return { ok: true, label: label };
    if (canvasStreamLabel && hasAlloBridge) return { ok: true, label: 'AlloFlow tab through Gemini Canvas', inferred: true };
    return { ok: false, reason: 'The selected tab was not identified as AlloFlow' + (label ? ' (selected: “' + label + '”)' : '') + '. Stop and choose the AlloFlow tab.' };
  }

  // Pre-capture checks are pure so the popup, tests, and future desktop shell
  // can present the same answer without requesting capture permission first.
  function vsBuildDemoPreflight(state) {
    var s = state || {};
    var items = [];
    var add = function (id, label, status, detail) {
      items.push({ id: id, label: label, status: status, detail: String(detail || '').slice(0, 220) });
    };
    add('plan', 'Approved steps', Number(s.planCount) > 0 ? 'ready' : 'block', Number(s.planCount) > 0 ? Number(s.planCount) + ' step(s) are ready.' : 'Draft or load a tutorial plan first.');
    if (Number(s.planCount) > 0) {
      if (s.officialPlan) add('commands', 'Command readiness', 'ready', 'This release-matched tutorial uses validated fixture steps.');
      else if (!s.commandReadinessKnown) add('commands', 'Command readiness', 'block', s.commandReadinessDetail || 'AlloFlow could not verify these commands.');
      else add('commands', 'Command readiness', s.commandReady ? 'ready' : 'block', s.commandReadinessDetail || (s.commandReady ? 'Every approved command and prerequisite is ready.' : 'One or more commands cannot run safely from the current app state.'));
    }
    add('connection', 'AlloFlow connection', s.openerConnected ? 'ready' : 'block', s.openerConnected ? 'Video Studio is connected to AlloFlow.' : 'Reopen Video Studio from AlloFlow.');
    add('capture', 'Tab capture support', s.captureSupported ? 'ready' : 'block', s.captureSupported ? 'This browser can request tab capture.' : 'Screen capture is unavailable in this browser.');
    var mode = String(s.audioMode || 'captions');
    if (mode === 'mic') add('audio', 'Microphone', s.micSupported ? 'ready' : 'block', s.micSupported ? 'Microphone capture is available.' : 'Microphone capture is unavailable; choose captions or an automatic voice.');
    else if (mode.indexOf('auto-') === 0) add('audio', 'Automatic narration', s.openerConnected ? 'ready' : 'block', s.openerConnected ? 'Narration will be generated after recording; the microphone stays off.' : 'Automatic narration needs the AlloFlow connection.');
    else add('audio', 'Captions only', 'ready', 'No microphone or generated speech will be recorded.');
    if (Number(s.planCount) > 0) {
      var pacingWarnings = Math.max(0, Math.round(Number(s.scriptWarningCount) || 0));
      var pacingTooLong = Math.max(0, Math.round(Number(s.scriptTooLongCount) || 0));
      if (pacingWarnings) add('pacing', 'Narration timing', 'warn', pacingTooLong ? pacingWarnings + ' step(s) need pacing changes; ' + pacingTooLong + ' are too long for the maximum result hold. Shorten those lines before recording.' : pacingWarnings + ' step(s) may finish before their narration. Use Fit pacing to narration.');
      else add('pacing', 'Narration timing', 'ready', 'Every approved script line fits its estimated visual time.');
    }
    var available = Number(s.availableBytes);
    if (s.storageKnown && isFinite(available) && available < 50 * 1024 * 1024) add('storage', 'Local storage', 'block', 'Less than 50 MB appears available for the recording.');
    else if (s.storageKnown && isFinite(available) && available < 250 * 1024 * 1024) add('storage', 'Local storage', 'warn', 'Storage is limited; keep this demo short and export promptly.');
    else add('storage', 'Local storage', s.storageKnown ? 'ready' : 'info', s.storageKnown ? 'Enough local storage appears available.' : 'Storage estimate is unavailable; short recordings are recommended.');
    if (s.recordingBusy) add('recorder', 'Recorder', 'block', 'Another recording is already active.');
    add('privacy', 'Privacy', 'info', 'The share dialog must identify the AlloFlow browser tab before automatic actions can run.');
    var blockingCount = items.filter(function (item) { return item.status === 'block'; }).length;
    var warningCount = items.filter(function (item) { return item.status === 'warn'; }).length;
    return { ok: blockingCount === 0, blockingCount: blockingCount, warningCount: warningCount, items: items };
  }

  // Build an exact continuation after a confirmed partial run. A timed-out
  // step is excluded because it is still running in AlloFlow's background;
  // ordinary failures/stops keep the first unfinished step for a safe retry.
  function vsDemoContinuationPlan(steps, response) {
    var list = (Array.isArray(steps) ? steps : []).slice(0, 8);
    var r = response || {};
    var rawCompleted = Number(r.completed);
    var completed = isFinite(rawCompleted) ? Math.floor(rawCompleted) : 0;
    completed = Math.max(0, Math.min(list.length, completed));
    if (r.ok) completed = list.length;
    var nextIndex = completed;
    if (r.timedOut && nextIndex < list.length) nextIndex += 1;
    return {
      completed: completed,
      nextIndex: nextIndex,
      total: list.length,
      timedOut: !!r.timedOut,
      remainingSteps: list.slice(nextIndex)
    };
  }
  function vsAnalyzeDemoTakeQuality(take) {
    var t = take || {};
    var captions = Array.isArray(t.captions) ? t.captions : [];
    var duration = Math.max(0, Number(t.duration) || 0);
    var captionQuality = vsAnalyzeCaptionQuality(captions, duration);
    var clips = (Array.isArray(t.audioClips) ? t.audioClips : []).filter(function (clip) { return !!(clip && clip.demoNarrationCue); });
    var expected = Math.max(0, Math.round(Number(t.demoExpectedNarrationCount) || 0));
    var failed = Array.isArray(t.demoNarrationFailed) ? t.demoNarrationFailed.length : 0;
    var checks = [];
    var add = function (id, label, status, detail) { checks.push({ id: id, label: label, status: status, detail: String(detail || '').slice(0, 220) }); };
    add('duration', 'Recording length', duration >= 2 ? 'pass' : 'warn', duration >= 2 ? 'The take is ' + Math.round(duration) + ' seconds long.' : 'The take is very short; confirm the whole workflow was captured.');
    add('captions', 'Instructional captions', captionQuality.ok ? 'pass' : (captions.length ? 'warn' : 'fail'), captions.length ? captions.length + ' caption(s); quality score ' + captionQuality.score + '/100.' : 'No instructional captions were captured.');
    if (expected > 0) add('narration', 'Automatic narration', clips.length >= expected && !failed ? 'pass' : (clips.length ? 'warn' : 'fail'), clips.length + ' of ' + expected + ' expected narration line(s) are ready' + (failed ? '; ' + failed + ' need retry.' : '.'));
    else add('narration', 'Narration mode', 'info', 'This demo did not require automatic narration.');
    var sorted = captions.slice().sort(function (a, b) { return (Number(a.start) || 0) - (Number(b.start) || 0); });
    var firstStart = sorted.length ? Math.max(0, Number(sorted[0].start) || 0) : 0;
    var lastEnd = sorted.length ? Math.max(0, Number(sorted[sorted.length - 1].end) || 0) : 0;
    add('opening', 'Opening pacing', firstStart <= 3 ? 'pass' : 'warn', firstStart <= 3 ? 'The first instruction appears promptly.' : 'The first instruction begins after ' + Math.round(firstStart) + ' seconds.');
    add('ending', 'Ending margin', !duration || !lastEnd || duration - lastEnd >= 0.5 ? 'pass' : 'warn', !duration || !lastEnd || duration - lastEnd >= 0.5 ? 'The ending has reviewable breathing room.' : 'The final caption ends very close to the recording cutoff.');
    add('pending', 'Background processing', t.demoNarrationPending ? 'warn' : 'pass', t.demoNarrationPending ? 'Automatic narration is still being generated.' : 'No demo processing is pending.');
    var failCount = checks.filter(function (check) { return check.status === 'fail'; }).length;
    var warnCount = checks.filter(function (check) { return check.status === 'warn'; }).length;
    var score = Math.max(0, 100 - failCount * 30 - warnCount * 10);
    return { ok: failCount === 0 && warnCount === 0, score: score, failCount: failCount, warningCount: warnCount, checks: checks, captionQuality: captionQuality, narrationClipCount: clips.length, expectedNarrationCount: expected };
  }
  // Place generated PCM narration without stacking clips on top of each other.
  // PCM is mono 16-bit, so byte length gives an exact duration before WAV wrap.
  function vsScheduleDemoNarrationClip(cue, pcmByteLength, sampleRate, previousEnd, takeDuration, gap) {
    var bytes = Math.max(0, Math.floor(Number(pcmByteLength) || 0));
    var rate = Math.max(8000, Math.min(96000, Math.floor(Number(sampleRate) || 24000)));
    if (!bytes) return null;
    var duration = bytes / (rate * 2);
    if (!isFinite(duration) || duration <= 0) return null;
    var cueStart = Math.max(0, Number(cue && cue.start) || 0);
    var prior = Math.max(0, Number(previousEnd) || 0);
    var spacing = Math.max(0, Math.min(1, Number(gap) || 0.12));
    var start = Math.max(cueStart, prior > 0 ? prior + spacing : cueStart);
    var limit = Math.max(0, Number(takeDuration) || 0);
    if (limit > 0 && start >= limit - 0.05) return null;
    var end = start + duration;
    return {
      start: Math.round(start * 1000) / 1000,
      duration: Math.round(duration * 1000) / 1000,
      end: Math.round(end * 1000) / 1000,
      shifted: start > cueStart + 0.01,
      clipped: limit > 0 && end > limit
    };
  }

  // Demo Autopilot captions: one cue per executed plan step, timed by the
  // recording clock at the moment the step ran. A 'start' event opens the
  // cue, the matching 'done' extends it to the completion moment; cues never
  // overlap (each closes when the next opens) and idle tails cap at 8s.
  function vsBuildDemoCaptionCues(events, totalDur) {
    var evs = (Array.isArray(events) ? events : []).filter(function (e) {
      return e && isFinite(Number(e.t)) && Number(e.t) >= 0 && String(e.label || '').trim();
    }).map(function (e) {
      return {
        t: Number(e.t),
        phase: e.phase === 'done' ? 'done' : 'start',
        index: Math.max(0, Math.round(Number(e.index) || 0)),
        label: String(e.label).trim().replace(/[\r\n]+/g, ' ').slice(0, 140),
        narration: String(e.narration || '').trim().replace(/[\r\n]+/g, ' ').slice(0, 240),
        script: String(e.script || '').trim().replace(/[\r\n]+/g, ' ').slice(0, 400)
      };
    }).sort(function (a, b) { return a.t - b.t; });
    var cues = [];
    evs.forEach(function (e) {
      var baseText = 'Step ' + (e.index + 1) + ': ' + e.label;
      if (e.phase === 'start') {
        cues.push({ start: e.t, end: e.t + 8, text: e.script || baseText, _i: e.index, _label: e.label, _script: e.script });
      } else {
        for (var i = cues.length - 1; i >= 0; i--) {
          if (cues[i]._i === e.index) {
            cues[i].end = Math.max(cues[i].start + 0.8, e.t);
            if (e.script) cues[i].text = e.script;
            else if (e.narration && e.narration.toLowerCase() !== cues[i]._label.toLowerCase()) cues[i].text = baseText + '. ' + e.narration;
            break;
          }
        }
      }
    });
    for (var k = 0; k < cues.length - 1; k++) cues[k].end = Math.min(cues[k].end, Math.max(cues[k].start + 0.4, cues[k + 1].start));
    var dur = Number(totalDur);
    if (isFinite(dur) && dur > 0) cues.forEach(function (c) { c.end = Math.min(c.end, dur); });
    return cues.filter(function (c) { return c.end > c.start; }).map(function (c) {
      return { start: Math.round(c.start * 100) / 100, end: Math.round(c.end * 100) / 100, text: c.text };
    });
  }

  // Minimal WebM (Matroska subset) muxer for the WebCodecs fast-export path:
  // VP8/VP9 video + optional Opus audio, per-chunk millisecond timestamps,
  // known-size elements throughout (so vsPatchWebmDuration deliberately
  // leaves these files alone — Duration is written up front). Clusters break
  // on video keyframes (>1s apart) or every 30s so SimpleBlock int16
  // relative timestamps can never overflow.
  function vsMuxWebm(opts) {
    var o = opts || {};
    var vid = o.video || {};
    var aud = o.audio || null;
    var vChunks = Array.isArray(vid.chunks) ? vid.chunks : [];
    if (!vChunks.length) return new Uint8Array(0);
    function be(n, len) {
      var a = new Uint8Array(len);
      var v = Math.max(0, Math.floor(Number(n) || 0));
      for (var i = len - 1; i >= 0; i--) { a[i] = v & 0xff; v = Math.floor(v / 256); }
      return a;
    }
    function esize(n) {
      var len = 1;
      while (len < 8 && n >= Math.pow(2, 7 * len) - 1) len++;
      var a = be(n, len);
      a[0] |= (0x80 >> (len - 1));
      return a;
    }
    function cat(list) {
      var total = 0;
      list.forEach(function (c) { total += c.length; });
      var out = new Uint8Array(total), p = 0;
      list.forEach(function (c) { out.set(c, p); p += c.length; });
      return out;
    }
    function el(idBytes, payload) {
      return cat([new Uint8Array(idBytes), esize(payload.length), payload]);
    }
    function uintPayload(n) {
      var v = Math.max(0, Math.floor(Number(n) || 0));
      var len = 1;
      while (len < 8 && v >= Math.pow(2, 8 * len)) len++;
      return be(v, len);
    }
    function strPayload(s) {
      var str = String(s || ''), a = new Uint8Array(str.length);
      for (var i = 0; i < str.length; i++) a[i] = str.charCodeAt(i) & 0xff;
      return a;
    }
    function f64Payload(x) {
      var b = new Uint8Array(8);
      new DataView(b.buffer).setFloat64(0, Number(x) || 0);
      return b;
    }
    function opusHead(channels, sampleRate) {
      var b = new Uint8Array(19);
      b.set(strPayload('OpusHead'), 0);
      b[8] = 1; b[9] = channels;
      b[10] = 0x38; b[11] = 0x01; // pre-skip 312 samples, little-endian
      new DataView(b.buffer).setUint32(12, sampleRate, true);
      return b;
    }
    var ebmlHeader = el([0x1a, 0x45, 0xdf, 0xa3], cat([
      el([0x42, 0x86], uintPayload(1)),          // EBMLVersion
      el([0x42, 0xf7], uintPayload(1)),          // EBMLReadVersion
      el([0x42, 0xf2], uintPayload(4)),          // EBMLMaxIDLength
      el([0x42, 0xf3], uintPayload(8)),          // EBMLMaxSizeLength
      el([0x42, 0x82], strPayload('webm')),      // DocType
      el([0x42, 0x87], uintPayload(2)),          // DocTypeVersion
      el([0x42, 0x85], uintPayload(2))           // DocTypeReadVersion
    ]));
    var durationMs = Math.max(0, Number(o.durationMs) || 0);
    var info = el([0x15, 0x49, 0xa9, 0x66], cat([
      el([0x2a, 0xd7, 0xb1], uintPayload(1000000)),   // TimestampScale: 1ms
      el([0x44, 0x89], f64Payload(durationMs)),
      el([0x4d, 0x80], strPayload('AlloFlowVideoStudio')),
      el([0x57, 0x41], strPayload('AlloFlowVideoStudio'))
    ]));
    var videoEntry = el([0xae], cat([
      el([0xd7], uintPayload(1)),                     // TrackNumber
      el([0x73, 0xc5], uintPayload(1)),               // TrackUID
      el([0x83], uintPayload(1)),                     // TrackType: video
      el([0x9c], uintPayload(0)),                     // FlagLacing off
      el([0x86], strPayload(vid.codec === 'vp9' ? 'V_VP9' : 'V_VP8')),
      el([0xe0], cat([
        el([0xb0], uintPayload(vid.width || 0)),
        el([0xba], uintPayload(vid.height || 0))
      ]))
    ]));
    var trackList = [videoEntry];
    if (aud && Array.isArray(aud.chunks) && aud.chunks.length) {
      trackList.push(el([0xae], cat([
        el([0xd7], uintPayload(2)),
        el([0x73, 0xc5], uintPayload(2)),
        el([0x83], uintPayload(2)),                   // TrackType: audio
        el([0x9c], uintPayload(0)),
        el([0x86], strPayload('A_OPUS')),
        el([0x63, 0xa2], opusHead(aud.channels || 2, aud.sampleRate || 48000)),
        el([0x56, 0xaa], uintPayload(6500000)),       // CodecDelay ns (312/48k)
        el([0x56, 0xbb], uintPayload(80000000)),      // SeekPreRoll ns
        el([0xe1], cat([
          el([0xb5], f64Payload(aud.sampleRate || 48000)),
          el([0x9f], uintPayload(aud.channels || 2))
        ]))
      ])));
    }
    var tracks = el([0x16, 0x54, 0xae, 0x6b], cat(trackList));
    var events = [];
    vChunks.forEach(function (c) {
      if (c && c.data && c.data.length) events.push({ t: Math.max(0, Math.round(Number(c.timestampMs) || 0)), track: 1, key: !!c.keyframe, data: c.data });
    });
    if (aud && Array.isArray(aud.chunks)) {
      aud.chunks.forEach(function (c) {
        if (c && c.data && c.data.length) events.push({ t: Math.max(0, Math.round(Number(c.timestampMs) || 0)), track: 2, key: true, data: c.data });
      });
    }
    events.sort(function (a, b) { return a.t - b.t || a.track - b.track; });
    var clusters = [];
    var base = -1, blocks = null;
    function flushCluster() {
      if (blocks && blocks.length) {
        clusters.push(el([0x1f, 0x43, 0xb6, 0x75], cat([el([0xe7], uintPayload(base))].concat(blocks))));
      }
      blocks = null;
    }
    events.forEach(function (ev) {
      var needNew = base < 0 || (ev.t - base) > 30000 || (ev.track === 1 && ev.key && (ev.t - base) > 1000);
      if (needNew) { flushCluster(); base = ev.t; blocks = []; }
      var rel = ev.t - base;
      var head = new Uint8Array(3);
      head[0] = (rel >> 8) & 0xff; head[1] = rel & 0xff;
      head[2] = (ev.track === 1 && ev.key) || ev.track === 2 ? 0x80 : 0x00;
      blocks.push(el([0xa3], cat([esize(ev.track), head, ev.data])));
    });
    flushCluster();
    var segment = el([0x18, 0x53, 0x80, 0x67], cat([info, tracks].concat(clusters)));
    return cat([ebmlHeader, segment]);
  }
  // [VS_SHARED_END]

  // Module-only (NOT part of the shared block): normalize an allostudio-video
  // payload into a storable take record. Every field is sanitized/clamped the
  // same way the gallery always did; the object URL is deliberately NOT here —
  // whoever renders the record creates (and revokes) its own URL, so records
  // can live in IndexedDB across panel closes and app reloads.
  function vsBuildStudioTakeRecord(p) {
    if (!p || typeof Blob === 'undefined' || !(p.blob instanceof Blob)) return null;
    var dur = Number(p.duration) || 0;
    var rawVisualDescriptions = Array.isArray(p.visualDescriptions) ? p.visualDescriptions : [];
    var visualDescriptions = vsSanitizeVisualDescriptions({ descriptions: rawVisualDescriptions }, dur).map(function (s, idx) {
      s.checked = !!(rawVisualDescriptions[idx] && rawVisualDescriptions[idx].checked);
      return s;
    });
    var rawChapters = Array.isArray(p.chapters) ? p.chapters : [];
    var chapters = rawChapters.filter(function (c) { return c && isFinite(Number(c.start)) && String(c.title || '').trim(); }).map(function (c) {
      return { start: Math.max(0, Number(c.start) || 0), title: String(c.title || '').slice(0, 80) };
    });
    var inserts = vsSanitizeTeachingInserts(Array.isArray(p.inserts) ? p.inserts : [], dur);
    var visualPrompts = (Array.isArray(p.visualPrompts) ? p.visualPrompts : []).filter(function (vp) { return vp && String(vp.prompt || '').trim(); }).map(function (vp) {
      return { id: String(vp.id || '').slice(0, 40), start: Math.max(0, Number(vp.start) || 0), type: String(vp.type || 'image_prompt').slice(0, 40), label: String(vp.label || 'Visual support').slice(0, 90), prompt: String(vp.prompt || '').slice(0, 600), source: String(vp.source || '').slice(0, 40) };
    });
    var localizations = (Array.isArray(p.localizations) ? p.localizations : []).map(function (loc) {
      return vsSanitizeLocalizedDraft(loc, dur);
    }).filter(function (loc) {
      return loc && (loc.captions.length || loc.narration.length || loc.inserts.length || loc.chapters.length || loc.visualDescriptions.length);
    });
    var musicBed = p.musicBed ? vsSanitizeMusicBed(p.musicBed, dur) : null;
    if (musicBed) musicBed.blob = null;
    var mediaCredits = vsSanitizeMediaCredits(Array.isArray(p.mediaCredits) ? p.mediaCredits : []);
    var transcriptEdits = vsSanitizeTranscriptEdits(Array.isArray(p.transcriptEdits) ? p.transcriptEdits : [], dur);
    var transcriptWords = vsSanitizeTranscriptWords(Array.isArray(p.transcriptWords) ? p.transcriptWords : [], dur);
    var audioEdits = p.audioEdits ? vsBuildAudioEditManifest(Object.assign({}, p.audioEdits, { duration: dur })) : null;
    if (audioEdits && !audioEdits.hasAudioEdits) audioEdits = null;
    return {
      id: 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      blob: p.blob,
      vtt: (typeof p.vtt === 'string' && p.vtt) ? p.vtt : null,
      visualDescriptions: visualDescriptions,
      chapters: chapters,
      transcriptEdits: transcriptEdits,
      transcriptWords: transcriptWords,
      inserts: inserts,
      visualPrompts: visualPrompts,
      localizations: localizations,
      mediaCredits: mediaCredits,
      musicBed: musicBed,
      audioEdits: audioEdits,
      title: String(p.title || 'Teacher video'),
      duration: dur,
      size: p.blob.size,
      thumb: (typeof p.thumb === 'string') ? p.thumb : null,
      sha256: null,
      createdAt: new Date().toISOString()
    };
  }

  var VS_HELPERS = { vsBuildStudioTakeRecord: vsBuildStudioTakeRecord, vsFormatTimestamp: vsFormatTimestamp, vsBuildVtt: vsBuildVtt, vsParseVtt: vsParseVtt, vsComputeSegments: vsComputeSegments, vsPatchWebmDuration: vsPatchWebmDuration, vsMakePackReference: vsMakePackReference, vsMediaLicenseProfile: vsMediaLicenseProfile, vsNormalizeMediaCredit: vsNormalizeMediaCredit, vsSanitizeMediaCredits: vsSanitizeMediaCredits, vsBuildMediaCredits: vsBuildMediaCredits, vsBuildMediaCreditsCard: vsBuildMediaCreditsCard, vsMediaSearchTargets: vsMediaSearchTargets, vsBuildPermissionAudit: vsBuildPermissionAudit, vsCrc32: vsCrc32, vsBuildZip: vsBuildZip, vsReadZip: vsReadZip, vsZoomState: vsZoomState, vsNormalizeMuteSpans: vsNormalizeMuteSpans, vsGainAt: vsGainAt, vsSanitizeMusicBed: vsSanitizeMusicBed, vsMusicGainAt: vsMusicGainAt, vsAudioPolishPreset: vsAudioPolishPreset, vsApplyAudioPolishPreset: vsApplyAudioPolishPreset, vsBuildAudioEditManifest: vsBuildAudioEditManifest, vsBuildProjectBundleReadme: vsBuildProjectBundleReadme, vsBuildProjectImportSummary: vsBuildProjectImportSummary, vsOverlayFrameState: vsOverlayFrameState, vsBuildResourceCues: vsBuildResourceCues, vsDetectFillerSpans: vsDetectFillerSpans, vsTranscriptWordAutoSelect: vsTranscriptWordAutoSelect, vsBuildTranscriptCleanupQueue: vsBuildTranscriptCleanupQueue, vsTranscriptSelectionRange: vsTranscriptSelectionRange, vsBuildTranscriptEditDecision: vsBuildTranscriptEditDecision, vsSanitizeTranscriptEdits: vsSanitizeTranscriptEdits, vsBuildTranscriptEditText: vsBuildTranscriptEditText, vsTranscriptWordsFromCues: vsTranscriptWordsFromCues, vsSanitizeTranscriptWords: vsSanitizeTranscriptWords, vsTranscriptWordsForTake: vsTranscriptWordsForTake, vsCaptionCuesFromTranscriptWords: vsCaptionCuesFromTranscriptWords, vsTranscriptWordSelectionRanges: vsTranscriptWordSelectionRanges, vsBuildRippleKeepSegments: vsBuildRippleKeepSegments, vsSanitizeAiSuggestions: vsSanitizeAiSuggestions, vsComputePeaks: vsComputePeaks, vsSanitizeNarrationCues: vsSanitizeNarrationCues, vsParsePronunciationGlossary: vsParsePronunciationGlossary, vsApplyPronunciationGlossary: vsApplyPronunciationGlossary, vsScriptTextToNarrationCues: vsScriptTextToNarrationCues, vsSanitizeVisualDescriptions: vsSanitizeVisualDescriptions, vsSanitizeLessonPlan: vsSanitizeLessonPlan, vsSanitizeLocalizedDraft: vsSanitizeLocalizedDraft, vsAnalyzeLocalizationDraft: vsAnalyzeLocalizationDraft, vsAnalyzeCaptionQuality: vsAnalyzeCaptionQuality, vsBuildFinishChecklist: vsBuildFinishChecklist, vsBuildExportReadinessSummary: vsBuildExportReadinessSummary, vsPickNextFinishItem: vsPickNextFinishItem, vsBuildTranscriptResource: vsBuildTranscriptResource, vsBuildStudentFamilyShareNote: vsBuildStudentFamilyShareNote, vsCleanCaptionText: vsCleanCaptionText, vsPolishCaptions: vsPolishCaptions, vsCaptionStylePreset: vsCaptionStylePreset, vsCaptionDisplayOptions: vsCaptionDisplayOptions, vsResolveCaptionStyle: vsResolveCaptionStyle, vsTitleCardPreset: vsTitleCardPreset, vsPipFramePreset: vsPipFramePreset, vsInsertCardLayout: vsInsertCardLayout, vsCaptionPreviewLines: vsCaptionPreviewLines, vsBuildChapters: vsBuildChapters, vsSanitizeTeachingInserts: vsSanitizeTeachingInserts, vsPcmToWav: vsPcmToWav, vsMuxWebm: vsMuxWebm, vsValidateDemoCapture: vsValidateDemoCapture, vsBuildDemoPreflight: vsBuildDemoPreflight, vsDemoContinuationPlan: vsDemoContinuationPlan, vsAnalyzeDemoTakeQuality: vsAnalyzeDemoTakeQuality, vsScheduleDemoNarrationClip: vsScheduleDemoNarrationClip, vsBuildDemoCaptionCues: vsBuildDemoCaptionCues };
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

  var STUDIO_VERSION = (function () {
    try {
      var scriptSrc = document.currentScript && document.currentScript.src;
      return new URL(scriptSrc || '', window.location.href).searchParams.get('v') || 'dev';
    } catch (_) { return 'dev'; }
  })();
  var STUDIO_URL = 'https://alloflow-cdn.pages.dev/video_studio/video_studio.html?v=' + encodeURIComponent(STUDIO_VERSION);
  var STUDIO_ORIGIN = (function () {
    try { return new URL(STUDIO_URL, window.location.href).origin; } catch (_) { return 'https://alloflow-cdn.pages.dev'; }
  })();

  function randomBridgeToken() {
    try {
      var bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return Array.from(bytes).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    } catch (_) {
      return String(Date.now()) + '-' + Math.random().toString(36).slice(2);
    }
  }

  // ── Session take store + always-on bridge receiver ─────────────────────────
  // The gallery component unmounts whenever the panel closes (CDNModuleGate
  // renders null), which used to destroy every received take — and a video
  // sent while the panel was closed vanished without an ack. Takes now live
  // here at module scope for the whole session, mirrored best-effort into
  // IndexedDB so they survive an app reload; the bridge token is kept in
  // sessionStorage (per-tab) so a reload mid-recording can still accept and
  // ack the popup's send. Video bytes still never leave the device.
  var VS_TOKEN_KEY = 'allo_vs_bridge_token';
  var VS_TAKE_DB = 'alloflow_video_studio';
  var VS_TAKE_STORE_NAME = 'takes';
  var VS_MAX_STORED_TAKES = 12;

  function vsTakeDb(op, arg) {
    return new Promise(function (resolve) {
      var fallback = op === 'all' ? [] : null;
      try {
        if (!window.indexedDB) { resolve(fallback); return; }
        var req = indexedDB.open(VS_TAKE_DB, 1);
        req.onupgradeneeded = function () {
          try { req.result.createObjectStore(VS_TAKE_STORE_NAME, { keyPath: 'id' }); } catch (_) {}
        };
        req.onerror = function () { resolve(fallback); };
        req.onsuccess = function () {
          var db = req.result;
          try {
            var tx = db.transaction(VS_TAKE_STORE_NAME, op === 'all' ? 'readonly' : 'readwrite');
            var store = tx.objectStore(VS_TAKE_STORE_NAME);
            var r = op === 'all' ? store.getAll() : op === 'put' ? store.put(arg) : store.delete(arg);
            r.onsuccess = function () { resolve(op === 'all' ? (r.result || []) : true); try { db.close(); } catch (_) {} };
            r.onerror = function () { resolve(fallback); try { db.close(); } catch (_) {} };
          } catch (_) { resolve(fallback); try { db.close(); } catch (_2) {} }
        };
      } catch (_) { resolve(fallback); }
    });
  }

  var vsTakeStore = {
    takes: [],
    studioWin: null,
    token: (function () { try { return sessionStorage.getItem(VS_TOKEN_KEY) || null; } catch (_) { return null; } })(),
    listeners: [],
    subscribe: function (fn) {
      var self = this;
      self.listeners.push(fn);
      return function () { var i = self.listeners.indexOf(fn); if (i >= 0) self.listeners.splice(i, 1); };
    },
    notify: function (kind, extra) {
      this.listeners.slice().forEach(function (fn) { try { fn(kind, extra); } catch (_) {} });
    },
    setToken: function (token) {
      this.token = token || null;
      try { if (token) sessionStorage.setItem(VS_TOKEN_KEY, token); else sessionStorage.removeItem(VS_TOKEN_KEY); } catch (_) {}
    },
    addTake: function (rec) {
      if (!rec || !rec.id) return;
      var next = [rec].concat(this.takes);
      var dropped = next.slice(VS_MAX_STORED_TAKES);
      this.takes = next.slice(0, VS_MAX_STORED_TAKES);
      vsTakeDb('put', rec);
      dropped.forEach(function (d) { vsTakeDb('delete', d.id); });
      this.notify('takes', { added: rec.id });
    },
    patchTake: function (id, patch, extra) {
      var found = null;
      this.takes = this.takes.map(function (t) { if (t.id === id) { found = Object.assign({}, t, patch); return found; } return t; });
      if (found) { vsTakeDb('put', found); this.notify('takes', extra); }
    },
    removeTake: function (id) {
      var before = this.takes.length;
      this.takes = this.takes.filter(function (t) { return t.id !== id; });
      if (this.takes.length !== before) { vsTakeDb('delete', id); this.notify('takes'); }
    }
  };

  // Hydrate from IndexedDB (survives an app reload; Canvas may clear it
  // between sessions — that only costs reload-survival, not session-survival).
  vsTakeDb('all').then(function (rows) {
    var have = {};
    vsTakeStore.takes.forEach(function (t) { have[t.id] = true; });
    var restored = (rows || []).filter(function (r) { return r && r.id && !have[r.id] && typeof Blob !== 'undefined' && r.blob instanceof Blob; });
    if (!restored.length) return;
    restored.sort(function (a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); });
    vsTakeStore.takes = vsTakeStore.takes.concat(restored).slice(0, VS_MAX_STORED_TAKES);
    vsTakeStore.notify('takes');
  });

  // Sole ingester for allostudio-video: runs whether or not the panel is
  // mounted. After an app reload the studio window reference is gone, but the
  // sessionStorage bridge token (128-bit, per-tab) still proves the sender is
  // our popup — re-adopt it so the send is accepted and acked, not dropped.
  function vsBackgroundBridgeReceiver(ev) {
    try {
      if (!ev || !ev.data || typeof ev.data.type !== 'string') return;
      if (!vsTakeStore.token || ev.data.bridge !== vsTakeStore.token) return;
      if (ev.origin && ev.origin !== STUDIO_ORIGIN) return;
      if (vsTakeStore.studioWin && !vsTakeStore.studioWin.closed && ev.source !== vsTakeStore.studioWin) return;
      if ((!vsTakeStore.studioWin || vsTakeStore.studioWin.closed) && ev.source && typeof ev.source.postMessage === 'function') {
        vsTakeStore.studioWin = ev.source;
        vsTakeStore.notify('studio');
      }
      if (ev.data.type === 'allostudio-closed') {
        vsTakeStore.studioWin = null;
        vsTakeStore.setToken(null);
        vsTakeStore.notify('studio');
        return;
      }
      if (ev.data.type !== 'allostudio-video') return;
      var rec = vsBuildStudioTakeRecord(ev.data.payload);
      if (!rec) return;
      var replyTo = ev.source;
      // Ack receipt immediately (hashing a large blob takes a moment), then
      // dedupe by content hash: a resend after an ack timeout must UPDATE the
      // existing take (keeping its id and any saved hosted link), not add a
      // persistent twin to the gallery.
      try { replyTo.postMessage({ bridge: vsTakeStore.token, type: 'allostudio-video-ack' }, STUDIO_ORIGIN); } catch (_) {}
      sha256Hex(rec.blob).then(function (hex) {
        rec.sha256 = hex || null;
        var dupe = hex ? vsTakeStore.takes.filter(function (t) { return t.sha256 === hex; })[0] : null;
        if (dupe) {
          vsTakeStore.patchTake(dupe.id, Object.assign({}, rec, { id: dupe.id, createdAt: dupe.createdAt, hostedUrl: dupe.hostedUrl || null }), { added: dupe.id });
        } else {
          vsTakeStore.addTake(rec);
        }
      });
    } catch (_) {}
  }
  window.addEventListener('message', vsBackgroundBridgeReceiver);

  function studioUrlWithBridge(token) {
    try {
      var u = new URL(STUDIO_URL, window.location.href);
      if (window.location && window.location.origin && window.location.origin !== 'null') {
        u.searchParams.set('allo_origin', window.location.origin);
      }
      if (token) u.searchParams.set('allo_bridge', token);
      return u.href;
    } catch (_) {
      return STUDIO_URL;
    }
  }

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

  // Build the pack-safe reference for a gallery take (metadata + thumbnail +
  // optional teacher-pasted hostedUrl — never bytes). Shared by "Copy pack
  // reference", "Save to Resource History", and the .allopack bundle.
  function vsPackReferenceForTake(v) {
    var audioManifest = v.audioEdits ? vsBuildAudioEditManifest(Object.assign({}, v.audioEdits, { duration: v.duration || 0 })) : vsBuildAudioEditManifest({ duration: v.duration || 0, audio: v.audio || null, musicBed: v.musicBed || null, applyToSource: false, bakedIntoVideo: true });
    return vsMakePackReference({
      title: v.title, duration: v.duration, size: v.size, sha256: v.sha256,
      fileName: (v.title || 'teacher_video').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') + extFor(v.blob && v.blob.type),
      hostedUrl: v.hostedUrl || null,
      hasCaptions: !!v.vtt, hasTranscriptEdits: !!(v.transcriptEdits && v.transcriptEdits.length), transcriptEditCount: (v.transcriptEdits || []).length, hasTranscriptWords: !!(v.transcriptWords && v.transcriptWords.length), transcriptWordCount: (v.transcriptWords || []).length, hasAudioEdits: !!audioManifest.hasAudioEdits, audioEditsApplyToSource: audioManifest.applyToSource, muteSpanCount: audioManifest.muteSpanCount, hasVisualDescriptions: !!(v.visualDescriptions && v.visualDescriptions.length), hasChapters: !!(v.chapters && v.chapters.length), hasTeachingInserts: !!(v.inserts && v.inserts.length), hasVisualPrompts: !!(v.visualPrompts && v.visualPrompts.length), hasLocalizations: !!(v.localizations && v.localizations.length), localizationCount: (v.localizations || []).length, hasVisualOverlays: !!((v.inserts || []).filter(function (ins) { return ins && ins.type === 'image_overlay'; }).length), hasMusicBed: !!v.musicBed, hasMediaCredits: !!(v.mediaCredits && v.mediaCredits.length), mediaCreditCount: (v.mediaCredits || []).length, mediaCreditWarningCount: vsSanitizeMediaCredits(v.mediaCredits || []).filter(function (item) { return item.status !== 'ok'; }).length, resourceCueCount: (v.inserts || []).filter(function (ins) { return ins && ins.source === 'resource'; }).length, thumb: v.thumb, createdAt: v.createdAt
    });
  }

  // ─── Component ─────────────────────────────────────────────────────────────
  function VideoStudio(props) {
    // Live props: the message receiver and action callbacks mount with []
    // deps, so reading `props` directly inside them freezes first-render
    // values (stale history for resource cues, stale AI fns, stale language
    // for toasts). Everything inside those closures must go through propsRef.
    var propsRef = useRef(props);
    propsRef.current = props;
    var onClose = props.onClose || function () {};
    var addToast = function (msg, kind) {
      var f = propsRef.current.addToast;
      if (typeof f === 'function') { try { f(msg, kind); } catch (_) {} }
    };
    var T = function (key, fallback) { return makeT(propsRef.current.t)(key, fallback); };

    var _st = useState('closed'); var studioState = _st[0], setStudioState = _st[1]; // closed | opening | open | blocked
    var _vd = useState([]); var videos = _vd[0], setVideos = _vd[1];
    var studioWinRef = useRef(null);
    var bridgeTokenRef = useRef(null);
    var rootRef = useRef(null);
    var demoRunRef = useRef({ running: false, stop: false, kind: null, cleanupAfterStop: false });
    var demoPlanRef = useRef({ id: null, controller: null, cancelled: false });

    function postToStudio(win, msg) {
      try {
        if (!win || win.closed) return false;
        var token = bridgeTokenRef.current;
        var payload = token ? Object.assign({ bridge: token }, msg || {}) : (msg || {});
        win.postMessage(payload, STUDIO_ORIGIN);
        return true;
      } catch (_) {}
      return false;
    }

    // postMessage receiver — accepts messages ONLY from the window we opened.
    useEffect(function () {
      function onMsg(ev) {
        if (!ev || !ev.data || typeof ev.data.type !== 'string') return;
        if (!studioWinRef.current || ev.source !== studioWinRef.current) return;
        if (ev.origin && ev.origin !== STUDIO_ORIGIN) return;
        if (bridgeTokenRef.current && ev.data.bridge !== bridgeTokenRef.current) return;
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
            postToStudio(replyTo, Object.assign({ type: 'allostudio-ai-response', id: req.id }, payload));
          };
          if (typeof propsRef.current.callGemini !== 'function') { respond({ error: 'ai-unavailable' }); return; }
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
          Promise.resolve().then(function () { return propsRef.current.callGemini(prompt, false, true); }).then(function (res) {
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
        } else if (ev.data.type === 'allostudio-script-line-request') {
          // Targeted narration rewriting is text-only and returns one inert line.
          var slReq = ev.data;
          var slReplyTo = studioWinRef.current;
          var slRespond = function (payload) {
            postToStudio(slReplyTo, Object.assign({ type: 'allostudio-script-line-response', id: slReq.id }, payload));
          };
          if (typeof propsRef.current.callGemini !== 'function') { slRespond({ error: 'ai-unavailable' }); return; }
          var slToneMap = { teacher: 'clear teacher walkthrough', concise: 'concise and direct', warm: 'warm encouraging coach', documentary: 'calm educational documentary', accessible: 'accessibility-first plain language with explicit orientation' };
          var slAudienceMap = { general: 'general learners', elementary: 'elementary learners', secondary: 'secondary learners', adult: 'adult or professional learners', family: 'students and families together' };
          var slTone = Object.prototype.hasOwnProperty.call(slToneMap, slReq.tone) ? slReq.tone : 'teacher';
          var slAudience = Object.prototype.hasOwnProperty.call(slAudienceMap, slReq.audience) ? slReq.audience : 'general';
          var slTarget = Math.max(3, Math.min(50, Math.round(Number(slReq.targetWords) || 14)));
          var slGlossary = (Array.isArray(slReq.glossary) ? slReq.glossary : []).slice(0, 40).map(function (entry) {
            return { term: String((entry && entry.term) || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 60), spoken: String((entry && entry.spoken) || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 100) };
          }).filter(function (entry) { return entry.term && entry.spoken; });
          var slPrompt = 'Rewrite one spoken narration line for an educational video.\n' +
            'Return ONLY JSON: {"text":"one rewritten line"}. No markdown.\n' +
            'Tone: ' + slToneMap[slTone] + '. Audience: ' + slAudienceMap[slAudience] + '. Stay near ' + slTarget + ' words and never exceed 220 characters.\n' +
            'Improve clarity, flow, and speakability while preserving meaning and factual limits. Do not add facts, names, screen details, capabilities, stage directions, quotation marks, or a greeting. Avoid repeating the neighboring lines. Keep glossary terms in their original written spelling; pronunciation is applied later during speech synthesis.\n' +
            'Previous line: ' + String(slReq.previous || '').replace(/[\r\n]+/g, ' ').slice(0, 220) + '\n' +
            'Line to rewrite: ' + String(slReq.text || '').replace(/[\r\n]+/g, ' ').slice(0, 220) + '\n' +
            'Next line: ' + String(slReq.next || '').replace(/[\r\n]+/g, ' ').slice(0, 220) + '\n' +
            'Pronunciation glossary JSON: ' + JSON.stringify(slGlossary).slice(0, 5000);
          Promise.resolve().then(function () { return propsRef.current.callGemini(slPrompt, false, true); }).then(function (res) {
            var slText = (typeof res === 'string') ? res : ((res && (res.text || res.output)) || JSON.stringify(res));
            var slParsed = null;
            try { slParsed = JSON.parse(slText); } catch (_) {
              var slMatch = /\{[\s\S]*\}/.exec(String(slText || ''));
              if (slMatch) { try { slParsed = JSON.parse(slMatch[0]); } catch (_2) {} }
            }
            var line = String((slParsed && slParsed.text) || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 220);
            if (!line) { slRespond({ error: 'The provider did not return a usable line.' }); return; }
            slRespond({ text: line });
          }).catch(function (e) {
            slRespond({ error: String((e && e.message) || e).slice(0, 200) });
          });        } else if (ev.data.type === 'allostudio-script-generate-request') {
          // Freeform script generation is text-only. A reviewed brief, title, and
          // optional current captions are sent; captured pixels and audio stay local.
          var sgReq = ev.data;
          var sgReplyTo = studioWinRef.current;
          var sgRespond = function (payload) {
            postToStudio(sgReplyTo, Object.assign({ type: 'allostudio-script-generate-response', id: sgReq.id }, payload));
          };
          if (typeof propsRef.current.callGemini !== 'function') { sgRespond({ error: 'ai-unavailable' }); return; }
          var sgToneMap = { teacher: 'clear teacher walkthrough', concise: 'concise and direct', warm: 'warm encouraging coach', documentary: 'calm educational documentary', accessible: 'accessibility-first plain language with explicit orientation' };
          var sgAudienceMap = { general: 'general learners', elementary: 'elementary learners', secondary: 'secondary learners', adult: 'adult or professional learners', family: 'students and families together' };
          var sgTone = Object.prototype.hasOwnProperty.call(sgToneMap, sgReq.tone) ? sgReq.tone : 'teacher';
          var sgAudience = Object.prototype.hasOwnProperty.call(sgAudienceMap, sgReq.audience) ? sgReq.audience : 'general';
          var sgDuration = Math.max(5, Math.min(7200, Math.round(Number(sgReq.duration) || 60)));
          var sgMaxWords = Math.max(40, Math.min(3000, Math.round(sgDuration * 2.15)));
          var sgBrief = String(sgReq.brief || '').replace(/[\u0000-\u001F\u007F]+/g, ' ').trim().slice(0, 8000);
          var sgContext = String(sgReq.context || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ').trim().slice(0, 12000);
          if (!sgBrief && !sgContext) { sgRespond({ error: 'Add a brief or captions before generating a script.' }); return; }
          var sgPrompt = 'Write a complete spoken narration script for an educational video.\n' +
            'Return ONLY JSON: {"title":"short optional title","script":"complete narration"}. No markdown fences.\n' +
            'Tone: ' + sgToneMap[sgTone] + '. Audience: ' + sgAudienceMap[sgAudience] + '. Approximate video duration: ' + sgDuration + ' seconds. Hard maximum: ' + sgMaxWords + ' words.\n' +
            'Create a coherent opening, development, useful transitions, and concise close. Make it natural to speak aloud. Use only facts and product behavior supported by the teacher brief or source captions. Do not invent quotations, people, student data, research claims, visual details, or capabilities. Do not include timestamps, speaker labels, production directions, citations, or music cues. Prefer short paragraphs and sentences that can become editable timed lines.\n' +
            'Current video title: ' + String(sgReq.title || '').replace(/[\r\n]+/g, ' ').slice(0, 160) + '\n' +
            'Teacher brief:\n' + sgBrief + '\n' +
            (sgContext ? ('Current captions/source text for grounding:\n' + sgContext) : 'No source captions were supplied; stay strictly within the brief.');
          Promise.resolve().then(function () { return propsRef.current.callGemini(sgPrompt, false, true); }).then(function (res) {
            var sgText = (typeof res === 'string') ? res : ((res && (res.text || res.output)) || JSON.stringify(res));
            var sgParsed = null;
            try { sgParsed = JSON.parse(sgText); } catch (_) {
              var sgMatch = /\{[\s\S]*\}/.exec(String(sgText || ''));
              if (sgMatch) { try { sgParsed = JSON.parse(sgMatch[0]); } catch (_2) {} }
            }
            var script = String((sgParsed && sgParsed.script) || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ').trim().slice(0, 12000);
            var title = String((sgParsed && sgParsed.title) || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 120);
            if (!script) { sgRespond({ error: 'The provider did not return a usable script.' }); return; }
            sgRespond({ script: script, title: title });
          }).catch(function (e) {
            sgRespond({ error: String((e && e.message) || e).slice(0, 200) });
          });
        } else if (ev.data.type === 'allostudio-narrate-request') {
          // AI narration: the popup sends ONE contact-sheet JPEG (sampled
          // frames with burned-in timestamps) — never the raw video — and we
          // relay it through the app's vision call. The popup sanitizes the
          // returned script (vsSanitizeNarrationCues) before showing it.
          var nreq = ev.data;
          var nReplyTo = studioWinRef.current;
          var nRespond = function (payload) {
            postToStudio(nReplyTo, Object.assign({ type: 'allostudio-narrate-response', id: nreq.id }, payload));
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
            postToStudio(dReplyTo, Object.assign({ type: 'allostudio-describe-response', id: dreq.id }, payload));
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
            postToStudio(lReplyTo, Object.assign({ type: 'allostudio-lesson-response', id: lreq.id }, payload));
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
          } else if (typeof propsRef.current.callGemini === 'function') {
            Promise.resolve().then(function () { return propsRef.current.callGemini(lPrompt, false, true); }).then(parseLesson).catch(function (e) {
              lRespond({ error: String((e && e.message) || e).slice(0, 200) });
            });
          } else {
            lRespond({ error: 'ai-unavailable' });
          }
        } else if (ev.data.type === 'allostudio-localize-request') {
          // Localization is text/metadata-only and teacher-triggered: captions,
          // approved support text, speaker hints, and glossary locks go through
          // the app AI connection after the popup shows a privacy/DPA notice.
          var locReq = ev.data;
          var locReplyTo = studioWinRef.current;
          var locRespond = function (payload) {
            postToStudio(locReplyTo, Object.assign({ type: 'allostudio-localize-response', id: locReq.id }, payload));
          };
          if (typeof propsRef.current.callGemini !== 'function') { locRespond({ error: 'ai-unavailable' }); return; }
          var locDur = Math.max(1, Math.round(Number(locReq.duration) || 0));
          var locTarget = String(locReq.targetLanguage || 'target language').slice(0, 80);
          var locStyle = String(locReq.style || 'natural').slice(0, 60);
          var locPayload = {
            title: String(locReq.title || '').slice(0, 160),
            targetLanguage: locTarget,
            style: locStyle,
            glossary: String(locReq.glossary || '').slice(0, 5000),
            speakers: Array.isArray(locReq.speakers) ? locReq.speakers.slice(0, 40) : [],
            captions: Array.isArray(locReq.captions) ? locReq.captions.slice(0, 300) : [],
            chapters: Array.isArray(locReq.chapters) ? locReq.chapters.slice(0, 40) : [],
            inserts: Array.isArray(locReq.inserts) ? locReq.inserts.slice(0, 40) : [],
            visualDescriptions: Array.isArray(locReq.visualDescriptions) ? locReq.visualDescriptions.slice(0, 40) : []
          };
          var locPrompt = 'You are localizing an educational teacher video for multilingual learners and families.\n' +
            'Target language: ' + locTarget + '. Style: ' + locStyle + '. Video duration: 0-' + locDur + ' seconds.\n' +
            'Return ONLY one JSON object, no prose and no markdown fences. The object must have:\n' +
            '{"targetLanguage":"...","style":"literal|natural|interpreter|family|bilingual","title":"translated title","speakerMap":[{"speaker":"Teacher","translatedLabel":"..."}],"captions":[{"start":S,"end":E,"speaker":"...","originalText":"...","text":"translated subtitle"}],"chapters":[{"start":S,"title":"translated chapter"}],"inserts":[{"type":"title_card|pause_prompt|callout|sticker|visual_card","start":S,"duration":D,"text":"translated overlay","note":"optional translated support","theme":"blue|green|amber|pink|slate"}],"visualDescriptions":[{"start":S,"end":E,"description":"translated visual description","basis":"observed|inferred|source-supported|needs-review","confidence":"high|medium|low","checked":true}],"narration":[{"start":S,"end":E,"speaker":"Interpreter","originalText":"...","text":"spoken interpreted line"}],"reviewNotes":["short teacher checks"]}\n' +
            'Interpret speaker intent naturally for the target language. Preserve meaning, examples, quantities, math/science terms, names, and safety/privacy boundaries. Do not invent new facts, identities, visuals, or curriculum claims. If speaker identity is unclear, use "Speaker". If bilingual style is requested, include concise original + translated subtitle text in each caption. Keep narration short enough to speak in its timestamp window. Translate all provided chapters, overlays, visual descriptions, and captions. Respect glossary locks exactly.\n' +
            'Source payload JSON:\n' + JSON.stringify(locPayload).slice(0, 28000);
          Promise.resolve().then(function () { return propsRef.current.callGemini(locPrompt, false, true); }).then(function (res) {
            var text = (typeof res === 'string') ? res : ((res && (res.text || res.output)) || JSON.stringify(res));
            var parsed = null;
            try { parsed = JSON.parse(text); } catch (_) {
              var obj = /\{[\s\S]*\}/.exec(String(text || ''));
              if (obj) { try { parsed = JSON.parse(obj[0]); } catch (_2) {} }
            }
            locRespond({ draft: parsed || {} });
          }).catch(function (e) {
            locRespond({ error: String((e && e.message) || e).slice(0, 200) });
          });
        } else if (ev.data.type === 'allostudio-teaching-inserts-request') {
          // Teaching inserts are transcript-only suggestions: title cards,
          // pause prompts, callouts, and lightweight animated stickers. The
          // popup sanitizes and stores them as editable overlays.
          var ireq = ev.data;
          var iReplyTo = studioWinRef.current;
          var iRespond = function (payload) {
            postToStudio(iReplyTo, Object.assign({ type: 'allostudio-teaching-inserts-response', id: ireq.id }, payload));
          };
          if (typeof propsRef.current.callGemini !== 'function') { iRespond({ error: 'ai-unavailable' }); return; }
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
          Promise.resolve().then(function () { return propsRef.current.callGemini(iPrompt, false, true); }).then(function (res) {
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
            postToStudio(gReplyTo, Object.assign({ type: 'allostudio-imagen-response', id: greq.id }, payload));
          };
          var imagenFn = propsRef.current.callImagen || (typeof window !== 'undefined' ? window.callImagen : null);
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
            postToStudio(fReplyTo, Object.assign({ type: 'allostudio-frame-image-response', id: freq.id }, payload));
          };
          var editFn = propsRef.current.callGeminiImageEdit || (typeof window !== 'undefined' ? window.callGeminiImageEdit : null);
          var frameImagenFn = propsRef.current.callImagen || (typeof window !== 'undefined' ? window.callImagen : null);
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
        } else if (ev.data.type === 'allostudio-official-tutorial-request') {
          var otReq = ev.data;
          var otReplyTo = studioWinRef.current;
          var otRespond = function (payload) {
            postToStudio(otReplyTo, Object.assign({ type: 'allostudio-official-tutorial-response', id: otReq.id }, payload));
          };
          var tutorialFn = propsRef.current.onGetOfficialTutorial;
          if (typeof tutorialFn !== 'function') { otRespond({ error: 'official-tutorial-unavailable' }); return; }
          Promise.resolve().then(function () { return tutorialFn(String(otReq.tutorialId || '').slice(0, 60)); }).then(function (out) {
            var steps = (out && Array.isArray(out.steps) ? out.steps : []).slice(0, 8).map(function (s) {
              var beats = Array.isArray(s && s.beats) ? s.beats.slice(0, 4).map(function (beat) {
                return { kind: beat && beat.kind === 'success' ? 'success' : 'action', text: String((beat && beat.text) || '').slice(0, 220) };
              }).filter(function (beat) { return beat.text; }) : [];
              var stepId = String((s && (s.id || s.commandId)) || '').slice(0, 60);
              return { id: stepId, commandId: stepId, anchorId: String((s && s.anchorId) || '').slice(0, 90), label: String((s && s.label) || stepId).slice(0, 90), why: 'Release-matched official tutorial', beats: beats };
            }).filter(function (s) { return s.id && s.beats.length; });
            otRespond({ steps: steps, generatedFrom: (out && out.generatedFrom) || 'GUIDED_STEPS' });
          }).catch(function (e) {
            otRespond({ error: String((e && e.message) || e).slice(0, 200) });
          });
        } else if (ev.data.type === 'allostudio-demoplan-request') {
          // Demo Autopilot: goal TEXT only goes to the app's planner (which
          // reuses AlloBot's planUtterance over the command registry).
          var dpReq = ev.data;
          var dpReplyTo = studioWinRef.current;
          var dpRespond = function (payload) {
            postToStudio(dpReplyTo, Object.assign({ type: 'allostudio-demoplan-response', id: dpReq.id }, payload));
          };
          var planFn = propsRef.current.onPlanDemo;
          if (typeof planFn !== 'function') { dpRespond({ error: 'demo-planner-unavailable' }); return; }
          var previousPlan = demoPlanRef.current;
          if (previousPlan && previousPlan.controller) { previousPlan.cancelled = true; try { previousPlan.controller.abort(); } catch (_) {} }
          var planController = typeof AbortController === 'function' ? new AbortController() : null;
          var planState = { id: String(dpReq.id || '').slice(0, 100), controller: planController, cancelled: false };
          demoPlanRef.current = planState;
          var releasePlan = function () {
            if (demoPlanRef.current === planState) demoPlanRef.current = { id: null, controller: null, cancelled: false };
          };
          Promise.resolve().then(function () { return planFn(String(dpReq.goal || '').slice(0, 300), { signal: planController ? planController.signal : null, requestId: planState.id }); }).then(function (out) {
            if (planState.cancelled || demoPlanRef.current !== planState) { releasePlan(); return; }
            var steps = (out && Array.isArray(out.steps)) ? out.steps.slice(0, 8).map(function (s) {
              return { commandId: String((s && s.commandId) || '').slice(0, 60), params: (s && s.params && typeof s.params === 'object') ? s.params : {}, paramNames: Array.isArray(s && s.paramNames) ? s.paramNames.slice(0, 8).map(function (p) { return String(p).slice(0, 40); }) : [], why: String((s && s.why) || '').slice(0, 120), label: String((s && s.label) || (s && s.commandId) || '').slice(0, 90) };
            }).filter(function (s) { return s.commandId; }) : [];
            dpRespond({ steps: steps });
            releasePlan();
          }).catch(function (e) {
            if (planState.cancelled || (e && e.name === 'AbortError')) { releasePlan(); return; }
            dpRespond({ error: String((e && e.message) || e).slice(0, 200) });
            releasePlan();
          });
        } else if (ev.data.type === 'allostudio-demoscript-request') {
          // Script assistance is text-only and teacher-triggered. The popup sends
          // the reviewed goal and step metadata, never captured video or audio.
          var dsReq = ev.data;
          var dsReplyTo = studioWinRef.current;
          var dsRespond = function (payload) {
            postToStudio(dsReplyTo, Object.assign({ type: 'allostudio-demoscript-response', id: dsReq.id }, payload));
          };
          if (typeof propsRef.current.callGemini !== 'function') { dsRespond({ error: 'ai-unavailable' }); return; }
          var dsStyleMap = { teacher: 'clear teacher walkthrough', concise: 'direct and concise', coach: 'warm and encouraging coach', accessible: 'accessibility-first with explicit orientation and plain language' };
          var dsDetailMap = { short: '6-12 words', standard: '10-18 words', detailed: '16-26 words' };
          var dsStyle = Object.prototype.hasOwnProperty.call(dsStyleMap, dsReq.style) ? dsReq.style : 'teacher';
          var dsDetail = Object.prototype.hasOwnProperty.call(dsDetailMap, dsReq.detail) ? dsReq.detail : 'standard';
          var dsSteps = (Array.isArray(dsReq.steps) ? dsReq.steps : []).slice(0, 8).map(function (s, index) {
            var params = {};
            if (s && s.params && typeof s.params === 'object' && !Array.isArray(s.params)) {
              Object.keys(s.params).slice(0, 8).forEach(function (key) {
                var value = s.params[key];
                if (typeof value === 'string') params[String(key).slice(0, 40)] = value.slice(0, 160);
                else if ((typeof value === 'number' && isFinite(value)) || typeof value === 'boolean') params[String(key).slice(0, 40)] = value;
              });
            }
            return { index: index, commandId: String((s && s.commandId) || '').slice(0, 60), label: String((s && s.label) || '').slice(0, 90), why: String((s && s.why) || '').slice(0, 160), currentScript: String((s && s.script) || '').replace(/[\r\n]+/g, ' ').slice(0, 400), params: params };
          }).filter(function (s) { return s.commandId; });
          if (!dsSteps.length) { dsRespond({ error: 'no-script-steps' }); return; }
          var dsFocus = Math.round(Number(dsReq.focusIndex));
          if (!isFinite(dsFocus) || dsFocus < 0 || dsFocus >= dsSteps.length) dsFocus = -1;
          var dsReturnRule = dsFocus >= 0
            ? 'Return exactly one item for index ' + dsFocus + '; use every supplied step only as narrative context.'
            : 'Return exactly one item for every supplied step, in order.';
          var dsPrompt = 'Write polished spoken narration for an AlloFlow product demo.\n' +
            'Return ONLY JSON in this shape: {"scripts":[{"index":0,"text":"..."}]}. ' + dsReturnRule + '\n' +
            'Tone: ' + dsStyleMap[dsStyle] + '. Target length per line: ' + dsDetailMap[dsDetail] + '.\n' +
            'Describe the visible action or result accurately. Build a natural progression across lines, vary openings, preserve product and subject terms, and use plain language. Do not invent features, outcomes, people, student data, or screen details. Do not add greetings, a closing, stage directions, quotation marks, or claims not supported by the step metadata. Improve the current script rather than merely paraphrasing labels. Each text must be one line and at most 400 characters.\n' +
            'Demo goal: ' + String(dsReq.goal || '').replace(/[\r\n]+/g, ' ').slice(0, 300) + '\n' +
            'Reviewed steps JSON:\n' + JSON.stringify(dsSteps).slice(0, 12000);
          Promise.resolve().then(function () { return propsRef.current.callGemini(dsPrompt, false, true); }).then(function (res) {
            var rawText = (typeof res === 'string') ? res : ((res && (res.text || res.output)) || JSON.stringify(res));
            var parsed = null;
            try { parsed = JSON.parse(rawText); } catch (_) {
              var match = /\{[\s\S]*\}/.exec(String(rawText || ''));
              if (match) { try { parsed = JSON.parse(match[0]); } catch (_2) {} }
            }
            var scripts = (parsed && Array.isArray(parsed.scripts) ? parsed.scripts : []).slice(0, dsSteps.length).map(function (item) {
              var index = Math.round(Number(item && item.index));
              var line = String((item && item.text) || '').trim().replace(/[\r\n]+/g, ' ').slice(0, 400);
              return { index: index, text: line };
            }).filter(function (item) { return item.index >= 0 && item.index < dsSteps.length && item.text && (dsFocus < 0 || item.index === dsFocus); });
            dsRespond({ scripts: scripts });
          }).catch(function (e) {
            dsRespond({ error: String((e && e.message) || e).slice(0, 200) });
          });
        } else if (ev.data.type === 'allostudio-demoplan-cancel') {
          var cancelPlanId = String(ev.data.requestId || '').slice(0, 100);
          var activePlan = demoPlanRef.current;
          if (activePlan && activePlan.id === cancelPlanId) {
            activePlan.cancelled = true;
            if (activePlan.controller) { try { activePlan.controller.abort(); } catch (_) {} }
          }
        } else if (ev.data.type === 'allostudio-demovalidate-request') {
          // Non-mutating readiness check shared with AlloBot. The app validates
          // command safety, live guards, declared prerequisites, and parameters.
          var dvReq = ev.data;
          var dvReplyTo = studioWinRef.current;
          var dvRespond = function (payload) {
            postToStudio(dvReplyTo, Object.assign({ type: 'allostudio-demovalidate-response', id: dvReq.id }, payload));
          };
          var validateFn = propsRef.current.onValidateDemoPlan;
          if (typeof validateFn !== 'function') { dvRespond({ error: 'demo-validator-unavailable' }); return; }
          var dvSteps = (Array.isArray(dvReq.steps) ? dvReq.steps : []).slice(0, 8).map(function (s) {
            var params = {};
            if (s && s.params && typeof s.params === 'object') {
              Object.keys(s.params).slice(0, 8).forEach(function (k) {
                var pv = s.params[k];
                if (typeof pv === 'string') params[String(k).slice(0, 40)] = pv.slice(0, 200);
                else if ((typeof pv === 'number' && isFinite(pv)) || typeof pv === 'boolean') params[String(k).slice(0, 40)] = pv;
              });
            }
            return { commandId: String((s && s.commandId) || '').slice(0, 60), params: params, why: String((s && s.why) || '').slice(0, 120) };
          }).filter(function (s) { return s.commandId; });
          Promise.resolve().then(function () { return validateFn(dvSteps); }).then(function (report) {
            var items = (report && Array.isArray(report.items) ? report.items : []).slice(0, 8).map(function (item) {
              var contract = item && item.contract && typeof item.contract === 'object' ? item.contract : {};
              return {
                commandId: String((item && item.commandId) || '').slice(0, 60),
                label: String((item && item.label) || (item && item.commandId) || '').slice(0, 90),
                status: item && item.status === 'block' ? 'block' : (item && item.status === 'warn' ? 'warn' : 'ready'),
                detail: String((item && item.detail) || '').slice(0, 200),
                params: (item && item.params && typeof item.params === 'object') ? item.params : {},
                contract: { params: Array.isArray(contract.params) ? contract.params.slice(0, 8).map(function (p) { return String(p).slice(0, 40); }) : [] }
              };
            });
            dvRespond({ report: { ok: !!(report && report.ok), blockingCount: Math.max(0, Number(report && report.blockingCount) || 0), warningCount: Math.max(0, Number(report && report.warningCount) || 0), items: items } });
          }).catch(function (e) {
            dvRespond({ error: String((e && e.message) || e).slice(0, 200) });
          });
        } else if (ev.data.type === 'allostudio-official-tutorial-run-request') {
          var otrReq = ev.data;
          var otrReplyTo = studioWinRef.current;
          var otrRespond = function (payload) {
            postToStudio(otrReplyTo, Object.assign({ type: 'allostudio-official-tutorial-run-response', id: otrReq.id }, payload));
          };
          var officialRunFn = propsRef.current.onRunOfficialTutorial;
          if (typeof officialRunFn !== 'function') { otrRespond({ error: 'official-tutorial-runner-unavailable' }); return; }
          if (demoRunRef.current.running) { otrRespond({ error: 'a demo is already running' }); return; }
          var officialSteps = (Array.isArray(otrReq.steps) ? otrReq.steps : []).slice(0, 8).map(function (s) {
            var beats = Array.isArray(s && s.beats) ? s.beats.slice(0, 4).map(function (beat) {
              return { kind: beat && beat.kind === 'success' ? 'success' : 'action', text: String((beat && beat.text) || '').slice(0, 220) };
            }).filter(function (beat) { return beat.text; }) : [];
            return { id: String((s && (s.id || s.commandId)) || '').slice(0, 60), anchorId: String((s && s.anchorId) || '').slice(0, 90), label: String((s && s.label) || '').slice(0, 90), beats: beats, script: String((s && s.script) || '').slice(0, 400), pauseAfter: Math.round(Math.max(0.5, Math.min(8, Number(s && s.pauseAfter) || 2.2)) * 10) / 10 };
          }).filter(function (s) { return s.id && s.beats.length; });
          if (!officialSteps.length) { otrRespond({ error: 'no tutorial steps' }); return; }
          demoRunRef.current = { running: true, stop: false, kind: 'official', cleanupAfterStop: false };
          Promise.resolve().then(function () {
            return officialRunFn(String(otrReq.tutorialId || '').slice(0, 60), officialSteps, {
              shouldStop: function () { return demoRunRef.current.stop; },
              cursorEmphasis: !(otrReq.polish && otrReq.polish.cursorEmphasis === false),
              onStep: function (i, phase, label, narration) {
                postToStudio(otrReplyTo, { type: 'allostudio-demostep', id: otrReq.id, index: i, phase: phase, label: String(label || '').slice(0, 120), narration: String(narration || '').slice(0, 220) });
              }
            });
          }).then(function (result) {
            var cleanupAfterStop = !!demoRunRef.current.cleanupAfterStop;
            demoRunRef.current = { running: false, stop: false, kind: null, cleanupAfterStop: false };
            if (cleanupAfterStop) { var delayedCleanup = propsRef.current.onCleanupOfficialTutorial; if (typeof delayedCleanup === 'function') { try { delayedCleanup(); } catch (_) {} } }
            otrRespond({ ok: !!(result && result.ok), stopped: !!(result && result.stopped), completed: (result && result.completed != null) ? result.completed : null, reason: (result && result.reason) ? String(result.reason).slice(0, 200) : null });
          }).catch(function (e) {
            var cleanupAfterError = !!demoRunRef.current.cleanupAfterStop;
            demoRunRef.current = { running: false, stop: false, kind: null, cleanupAfterStop: false };
            if (cleanupAfterError) { var delayedErrorCleanup = propsRef.current.onCleanupOfficialTutorial; if (typeof delayedErrorCleanup === 'function') { try { delayedErrorCleanup(); } catch (_) {} } }
            otrRespond({ error: String((e && e.message) || e).slice(0, 200) });
          });
        } else if (ev.data.type === 'allostudio-demorun-request') {
          var drReq = ev.data;
          var drReplyTo = studioWinRef.current;
          var drRespond = function (payload) {
            postToStudio(drReplyTo, Object.assign({ type: 'allostudio-demorun-response', id: drReq.id }, payload));
          };
          var runFn = propsRef.current.onRunDemoPlan;
          if (typeof runFn !== 'function') { drRespond({ error: 'demo-runner-unavailable' }); return; }
          if (demoRunRef.current.running) { drRespond({ error: 'a demo is already running' }); return; }
          // Steps are re-clamped here and re-validated against the live
          // registry inside runPlan (unknown ids fail the step) — the popup
          // can only ever pick from what the registry offers.
          var drSteps = (Array.isArray(drReq.steps) ? drReq.steps : []).slice(0, 8).map(function (s) {
            var params = {};
            if (s && s.params && typeof s.params === 'object') {
              Object.keys(s.params).slice(0, 8).forEach(function (k) {
                var pv = s.params[k];
                if (typeof pv === 'string') params[String(k).slice(0, 40)] = pv.slice(0, 200);
                else if ((typeof pv === 'number' && isFinite(pv)) || typeof pv === 'boolean') params[String(k).slice(0, 40)] = pv;
              });
            }
            return { commandId: String((s && s.commandId) || '').slice(0, 60), params: params, script: String((s && s.script) || '').slice(0, 400), pauseAfter: Math.round(Math.max(0.5, Math.min(8, Number(s && s.pauseAfter) || 2.2)) * 10) / 10 };
          }).filter(function (s) { return s.commandId; });
          if (!drSteps.length) { drRespond({ error: 'no runnable steps' }); return; }
          demoRunRef.current = { running: true, stop: false, kind: 'generic', cleanupAfterStop: false };
          Promise.resolve().then(function () {
            return runFn(drSteps, {
              shouldStop: function () { return demoRunRef.current.stop; },
              cursorEmphasis: !(drReq.polish && drReq.polish.cursorEmphasis === false),
              onStep: function (i, phase, label, narration) {
                postToStudio(drReplyTo, { type: 'allostudio-demostep', id: drReq.id, index: i, phase: phase, label: String(label || '').slice(0, 120), narration: String(narration || '').slice(0, 160) });
              }
            }, { rehearsal: !!drReq.rehearsal, cursorEmphasis: !(drReq.polish && drReq.polish.cursorEmphasis === false) });
          }).then(function (result) {
            demoRunRef.current = { running: false, stop: false, kind: null, cleanupAfterStop: false };
            drRespond({ ok: !!(result && result.ok), stopped: !!(result && result.stopped), timedOut: !!(result && result.timedOut), completed: (result && result.completed != null) ? result.completed : null, reason: (result && result.reason) ? String(result.reason).slice(0, 200) : null });
          }).catch(function (e) {
            demoRunRef.current = { running: false, stop: false, kind: null, cleanupAfterStop: false };
            drRespond({ error: String((e && e.message) || e).slice(0, 200) });
          });
        } else if (ev.data.type === 'allostudio-demostop') {
          demoRunRef.current.stop = true;
        } else if (ev.data.type === 'allostudio-official-tutorial-cleanup') {
          var cleanupFn = propsRef.current.onCleanupOfficialTutorial;
          if (typeof cleanupFn === 'function') { try { cleanupFn(String(ev.data.tutorialId || '').slice(0, 60)); } catch (_) {} }
        } else if (ev.data.type === 'allostudio-resource-cues-request') {
          var creq = ev.data;
          var cReplyTo = studioWinRef.current;
          var cRespond = function (payload) {
            postToStudio(cReplyTo, Object.assign({ type: 'allostudio-resource-cues-response', id: creq.id }, payload));
          };
          // propsRef keeps this LIVE: resources added after the panel opened
          // still reach the popup's cue browser. (A global-variable fallback
          // used to sit here — nothing in the app ever assigned it.)
          var hist = Array.isArray(propsRef.current.history) ? propsRef.current.history : (Array.isArray(propsRef.current.resourceHistory) ? propsRef.current.resourceHistory : []);
          var cues = vsBuildResourceCues(hist, { limit: 140 });
          cRespond({ cues: cues, count: cues.length });
        } else if (ev.data.type === 'allostudio-transcript') {
          var txReq = ev.data;
          var txReplyTo = studioWinRef.current;
          var txRespond = function (payload) {
            postToStudio(txReplyTo, Object.assign({ type: 'allostudio-transcript-ack', id: txReq.id }, payload));
          };
          var txResource = vsBuildTranscriptResource(txReq.payload || {});
          var txFn = propsRef.current.onSendTranscriptToFlow || propsRef.current.onAddTranscriptResource || propsRef.current.onAddResource || propsRef.current.addResource || (typeof window !== 'undefined' ? window.__alloflowAddResource : null);
          if (typeof txFn === 'function') {
            Promise.resolve().then(function () { return txFn(txResource); }).then(function (res) {
              addToast(T('video_studio.transcript_sent', 'Transcript sent to AlloFlow Source and saved in history.'), 'success');
              txRespond({ ok: true, id: (res && res.id) || txResource.id, message: 'Transcript sent to AlloFlow Source and saved in history.' });
            }).catch(function (e) {
              addToast(T('video_studio.transcript_send_failed', 'Transcript could not be added automatically.'), 'error');
              txRespond({ ok: false, message: String((e && e.message) || e || 'Transcript could not be added automatically.').slice(0, 200) });
            });
          } else {
            var txText = txResource.text || txResource.content || '';
            var txDone = function (copied) {
              txRespond({ ok: false, copied: !!copied, message: copied ? 'Transcript copied. Paste it into AlloFlow Source to generate supports.' : 'Transcript ready, but AlloFlow has no transcript receiver in this view.' });
            };
            try {
              if (navigator.clipboard && navigator.clipboard.writeText && txText) navigator.clipboard.writeText(txText).then(function () { txDone(true); }, function () { txDone(false); });
              else txDone(false);
            } catch (_) { txDone(false); }
          }
        } else if (ev.data.type === 'allostudio-tts-request') {
          // Text → spoken audio through the app's existing Gemini TTS path.
          // Returns raw 24kHz PCM bytes; the popup wraps them into WAV clips.
          var treq = ev.data;
          var tReplyTo = studioWinRef.current;
          var tRespond = function (payload) {
            postToStudio(tReplyTo, Object.assign({ type: 'allostudio-tts-response', id: treq.id }, payload));
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
          if (propsRef.current.onOpenCinematicStudio) {
            try { propsRef.current.onOpenCinematicStudio(); } catch (_) {}
            addToast(T('video_studio.cinematic_opened', 'Cinematic Studio opened from Video Studio.'), 'success');
          } else {
            addToast(T('video_studio.cinematic_unavailable', 'Cinematic Studio is not available from this view.'), 'error');
          }
        } else if (ev.data.type === 'allostudio-closed') {
          var closingPlan = demoPlanRef.current;
          if (closingPlan && closingPlan.controller) { closingPlan.cancelled = true; try { closingPlan.controller.abort(); } catch (_) {} }
          demoPlanRef.current = { id: null, controller: null, cancelled: false };
          var closeCleanupFn = propsRef.current.onCleanupOfficialTutorial;
          if (demoRunRef.current.running) {
            demoRunRef.current.stop = true;
            if (demoRunRef.current.kind === 'official') demoRunRef.current.cleanupAfterStop = true;
          } else if (typeof closeCleanupFn === 'function') {
            try { closeCleanupFn(); } catch (_) {}
          }
          studioWinRef.current = null;
          bridgeTokenRef.current = null;
          setStudioState('closed');
        }
        // NOTE: 'allostudio-video' is deliberately NOT handled here. The
        // module-scope vsBackgroundBridgeReceiver is the sole ingester (it
        // stores + acks even when this panel is closed or the app reloaded);
        // this component just mirrors vsTakeStore via the subscription below.
      }
      window.addEventListener('message', onMsg);
      return function () { window.removeEventListener('message', onMsg); };
    }, []);

    // Mirror the module-scope take store. Records live at module scope (and
    // best-effort in IndexedDB); object URLs are per-mount — created here on
    // demand, revoked for vanished takes on every sync and all on unmount.
    var urlMapRef = useRef({});
    var syncVideosFromStore = useCallback(function () {
      var map = urlMapRef.current;
      var live = {};
      vsTakeStore.takes.forEach(function (r) { live[r.id] = true; });
      Object.keys(map).forEach(function (k) {
        if (!live[k]) { try { if (map[k]) URL.revokeObjectURL(map[k]); } catch (_) {} delete map[k]; }
      });
      setVideos(vsTakeStore.takes.map(function (rec) {
        if (!map[rec.id]) { try { map[rec.id] = URL.createObjectURL(rec.blob); } catch (_) { map[rec.id] = ''; } }
        return Object.assign({}, rec, { url: map[rec.id] });
      }));
    }, []);
    useEffect(function () {
      var unsub = vsTakeStore.subscribe(function (kind, extra) {
        if (kind === 'takes') {
          syncVideosFromStore();
          if (extra && extra.added) {
            addToast(T('video_studio.received', 'Video received from the Studio — it stays on this device until you download it.'), 'success');
            announce(T('video_studio.received_sr', 'Video received from the Studio.'));
          }
        } else if (kind === 'studio') {
          studioWinRef.current = vsTakeStore.studioWin;
          bridgeTokenRef.current = vsTakeStore.token;
          setStudioState(vsTakeStore.studioWin ? 'open' : 'closed');
        }
      });
      // Initial sync: re-adopt a studio window/token that outlived a previous
      // mount (panel closed and reopened, or the app reloaded mid-recording).
      if (!bridgeTokenRef.current && vsTakeStore.token) bridgeTokenRef.current = vsTakeStore.token;
      if (!studioWinRef.current && vsTakeStore.studioWin && !vsTakeStore.studioWin.closed) {
        studioWinRef.current = vsTakeStore.studioWin;
        setStudioState('open');
      }
      syncVideosFromStore();
      return unsub;
    }, []);
    useEffect(function () {
      return function () {
        var map = urlMapRef.current;
        urlMapRef.current = {};
        Object.keys(map).forEach(function (k) { try { if (map[k]) URL.revokeObjectURL(map[k]); } catch (_) {} });
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
      var bridgeToken = randomBridgeToken();
      bridgeTokenRef.current = bridgeToken;
      vsTakeStore.setToken(bridgeToken);
      try { w = window.open(studioUrlWithBridge(bridgeToken), 'alloflow-video-studio', 'width=1320,height=860'); } catch (_) { w = null; }
      if (!w) {
        bridgeTokenRef.current = null;
        vsTakeStore.setToken(null);
        setStudioState('blocked');
        addToast(T('video_studio.popup_blocked', 'The Studio window was blocked. Allow pop-ups for this page, then try again.'), 'error');
        return;
      }
      studioWinRef.current = w;
      vsTakeStore.studioWin = w;
      // Watchdog: an honest verdict, not a hopeful one. It used to flip
      // 'opening' straight to 'open' even when the ready handshake never
      // arrived, so a popup that failed to load read as healthy.
      setTimeout(function () {
        setStudioState(function (cur) {
          if (cur !== 'opening') return cur;
          var w2 = studioWinRef.current;
          if (!w2 || w2.closed) return 'closed';
          return 'stalled';
        });
      }, 15000);
    }, []);

    var removeTake = useCallback(function (v) {
      var ok = true;
      try { ok = window.confirm(T('video_studio.remove_confirm', 'Remove this video from the gallery and this device? If you have not downloaded or bundled it, this copy is gone.')); } catch (_) {}
      if (!ok) return;
      vsTakeStore.removeTake(v.id);
      addToast(T('video_studio.removed', 'Video removed.'), 'success');
      announce(T('video_studio.removed_sr', 'Video removed from the gallery.'));
    }, []);

    var copyPackRef = useCallback(function (v) {
      var ref = vsPackReferenceForTake(v);
      var text = JSON.stringify(ref, null, 2);
      var done = function () { addToast(T('video_studio.ref_copied', 'Pack reference copied — paste it wherever the resource lives. The video bytes stay in the downloaded file.'), 'success'); };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, done); }
        else { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); done(); }
      } catch (_) { done(); }
    }, []);

    var downloadAccessPacket = useCallback(function (v, options) {
      var opts = options || {};
      var base = (v.title || 'teacher_video').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'teacher_video';
      var cues = v.vtt ? vsParseVtt(v.vtt) : [];
      var descriptions = (v.visualDescriptions || []).filter(function (s) { return s && s.checked && String(s.description || '').trim(); });
      var chapters = (v.chapters || []).filter(function (c) { return c && isFinite(Number(c.start)) && String(c.title || '').trim(); });
      var inserts = vsSanitizeTeachingInserts(v.inserts || [], v.duration || 0);
      var visualPrompts = (v.visualPrompts || []).filter(function (p) { return p && String(p.prompt || '').trim(); });
      var localizations = (v.localizations || []).map(function (loc) { return vsSanitizeLocalizedDraft(loc, v.duration || 0); }).filter(function (loc) { return loc && (loc.captions.length || loc.narration.length || loc.inserts.length || loc.chapters.length || loc.visualDescriptions.length); });
      var overlayCount = inserts.filter(function (ins) { return ins && ins.type === 'image_overlay'; }).length;
      var resourceCueCount = inserts.filter(function (ins) { return ins && ins.source === 'resource'; }).length;
      var musicBed = v.musicBed ? vsSanitizeMusicBed(v.musicBed, v.duration || 0) : null;
      var mediaCredits = vsSanitizeMediaCredits(v.mediaCredits || []);
      var transcriptEdits = vsSanitizeTranscriptEdits(v.transcriptEdits || [], v.duration || 0);
      var transcriptWords = vsSanitizeTranscriptWords(v.transcriptWords || [], v.duration || 0);
      var audioManifest = v.audioEdits ? vsBuildAudioEditManifest(Object.assign({}, v.audioEdits, { duration: v.duration || 0 })) : vsBuildAudioEditManifest({ duration: v.duration || 0, audio: v.audio || null, musicBed: musicBed, applyToSource: false, bakedIntoVideo: true });
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
      var meta = {
        title: v.title || 'Teacher video',
        duration: v.duration || 0,
        size: v.size || 0,
        sha256: v.sha256 || null,
        hasCaptions: !!v.vtt,
        captionCount: cues.length,
        hasTranscriptEdits: !!transcriptEdits.length,
        transcriptEditCount: transcriptEdits.length,
        hasTranscriptWords: !!transcriptWords.length,
        transcriptWordCount: transcriptWords.length,
        hasAudioEdits: !!audioManifest.hasAudioEdits,
        audioEditsApplyToSource: audioManifest.applyToSource,
        muteSpanCount: audioManifest.muteSpanCount,
        hasVisualDescriptions: !!descriptions.length,
        visualDescriptionCount: descriptions.length,
        chapterCount: chapters.length,
        teachingInsertCount: inserts.length,
        visualOverlayCount: overlayCount,
        hasMusicBed: !!musicBed,
        hasMediaCredits: !!mediaCredits.length,
        mediaCreditCount: mediaCredits.length,
        mediaCreditWarningCount: mediaCredits.filter(function (item) { return item.status !== 'ok'; }).length,
        resourceCueCount: resourceCueCount,
        visualPromptCount: visualPrompts.length,
        localizationCount: localizations.length,
        generatedAt: new Date().toISOString()
      };
      var note = opts.audience === 'student_family' ? vsBuildStudentFamilyShareNote({
        title: v.title || 'Teacher video',
        captionCount: cues.length,
        chapterCount: chapters.length,
        localizationCount: localizations.length,
        privacyFlagCount: 0
      }) : [
        'AlloFlow Video Studio accessibility packet',
        '',
        'Video title: ' + (v.title || 'Teacher video'),
        'Generated locally: ' + meta.generatedAt,
        'Includes transcript' + (v.vtt ? ', WebVTT captions' : '') + (transcriptEdits.length ? ', transcript edit decisions' : '') + (transcriptWords.length ? ', word-level transcript timestamps' : '') + (audioManifest.hasAudioEdits ? ', audio edit manifest' : '') + (descriptions.length ? ', visual descriptions' : '') + (chapters.length ? ', chapters' : '') + (inserts.length ? ', teaching inserts' : '') + (overlayCount ? ', visual overlays' : '') + (musicBed ? ', music bed metadata' : '') + (mediaCredits.length ? ', media credits' : '') + (visualPrompts.length ? ', visual prompts' : '') + (localizations.length ? ', localization drafts' : '') + ', and metadata.',
        'Video bytes are not included in this packet. Download the video file or .allopack bundle separately.',
        '',
        'Teacher review: please check the transcript and captions for student names or private details before sharing.'
      ].join('\n');
      var noteName = opts.audience === 'student_family' ? 'student-family-note.txt' : 'accessibility-note.txt';
      var entries = [
        { name: noteName, data: new TextEncoder().encode(note + '\n') },
        { name: 'transcript.txt', data: new TextEncoder().encode(transcript.join('\n').trim() + '\n') },
        { name: 'metadata.json', data: new TextEncoder().encode(JSON.stringify(meta, null, 2)) }
      ];
      if (v.vtt) entries.push({ name: 'captions.vtt', data: new TextEncoder().encode(v.vtt) });
      if (transcriptEdits.length) {
        entries.push({ name: 'transcript_edits.txt', data: new TextEncoder().encode(vsBuildTranscriptEditText(transcriptEdits, v.title || 'Teacher video')) });
        entries.push({ name: 'transcript_edits.json', data: new TextEncoder().encode(JSON.stringify(transcriptEdits, null, 2)) });
      }
      if (transcriptWords.length) entries.push({ name: 'transcript_words.json', data: new TextEncoder().encode(JSON.stringify(transcriptWords, null, 2)) });
      if (audioManifest.hasAudioEdits) entries.push({ name: 'audio_edits.json', data: new TextEncoder().encode(JSON.stringify(audioManifest, null, 2)) });
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
      if (mediaCredits.length) {
        entries.push({ name: 'media_credits.txt', data: new TextEncoder().encode(vsBuildMediaCredits(mediaCredits, v.title || 'Teacher video')) });
        entries.push({ name: 'media_credits.json', data: new TextEncoder().encode(JSON.stringify(mediaCredits, null, 2)) });
      }
      if (visualPrompts.length) {
        entries.push({ name: 'visual_prompts.json', data: new TextEncoder().encode(JSON.stringify(visualPrompts, null, 2)) });
        entries.push({ name: 'visual_prompts.txt', data: new TextEncoder().encode(visualPrompts.map(function (p) { return vsFormatTimestamp(p.start || 0) + '  ' + (p.label || 'Visual support') + '\n' + p.prompt; }).join('\n\n') + '\n') });
      }
      if (localizations.length) entries.push({ name: 'localizations.json', data: new TextEncoder().encode(JSON.stringify(localizations, null, 2)) });
      downloadBlob(new Blob([vsBuildZip(entries)], { type: 'application/zip' }), base + (opts.audience === 'student_family' ? '_student_family_packet.zip' : '_accessibility_packet.zip'));
      addToast(opts.audience === 'student_family' ? T('video_studio.student_packet_done', 'Student/family packet saved with transcript, captions, and sharing notes.') : T('video_studio.access_packet_done', 'Accessibility packet saved with transcript, captions, and metadata.'), 'success');
    }, []);

    var sendTranscriptResource = useCallback(function (v) {
      var cues = v && v.vtt ? vsParseVtt(v.vtt) : [];
      if (!v || !cues.length) {
        addToast(T('video_studio.transcript_missing', 'Add captions before sending a transcript to AlloFlow Source.'), 'error');
        return;
      }
      var resource = vsBuildTranscriptResource({ title: v.title || 'Teacher video', cues: cues, chapters: v.chapters || [], duration: v.duration || 0 });
      var fn = propsRef.current.onSendTranscriptToFlow || propsRef.current.onAddTranscriptResource || propsRef.current.onAddResource || propsRef.current.addResource || (typeof window !== 'undefined' ? window.__alloflowAddResource : null);
      if (typeof fn === 'function') {
        Promise.resolve().then(function () { return fn(resource); }).then(function () {
          addToast(T('video_studio.transcript_sent', 'Transcript sent to AlloFlow Source and saved in history.'), 'success');
        }).catch(function () {
          addToast(T('video_studio.transcript_send_failed', 'Transcript could not be added automatically.'), 'error');
        });
        return;
      }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(resource.text || '').then(function () {
            addToast(T('video_studio.transcript_copied', 'Transcript copied. Paste it into AlloFlow Source to generate supports.'), 'success');
          }, function () {
            addToast(T('video_studio.transcript_send_failed', 'Transcript could not be added automatically.'), 'error');
          });
          return;
        }
      } catch (_) {}
      addToast(T('video_studio.transcript_send_failed', 'Transcript could not be added automatically.'), 'error');
    }, []);

    // Teacher-pasted hosted link (YouTube/Drive/LMS). https-only; stored on
    // the take (persists with it) and rides along in every pack reference.
    var setHostedUrl = useCallback(function (v, raw) {
      var u = String(raw || '').trim();
      if (u && (u.length > 500 || !/^https:\/\/\S+$/i.test(u))) {
        addToast(T('video_studio.hosted_link_invalid', 'Hosted link must be a single https:// address (YouTube, Drive, or your LMS).'), 'error');
        return;
      }
      if ((v.hostedUrl || '') === u) return;
      vsTakeStore.patchTake(v.id, { hostedUrl: u || null });
      addToast(u ? T('video_studio.hosted_link_saved', 'Hosted link saved — pack references and bundles now point viewers to it.') : T('video_studio.hosted_link_cleared', 'Hosted link cleared.'), 'success');
    }, []);

    // Save the reference into Resource History so it travels with packs and
    // renders as a video card. Falls back to the clipboard copy when the app
    // didn't pass a receiver (older ANTI builds).
    var sendRefToHistory = useCallback(function (v) {
      var ref = vsPackReferenceForTake(v);
      var fn = propsRef.current.onSendVideoRefToFlow;
      if (typeof fn !== 'function') { copyPackRef(v); return; }
      Promise.resolve().then(function () { return fn(ref); }).then(function () {
        addToast(T('video_studio.ref_saved', 'Video reference saved to Resource History — it travels with packs; the video bytes stay in your downloaded file.'), 'success');
        announce(T('video_studio.ref_saved_sr', 'Video reference saved to Resource History.'));
      }).catch(function () {
        addToast(T('video_studio.ref_save_failed', 'Could not save to Resource History — the reference was copied to the clipboard instead.'), 'error');
        copyPackRef(v);
      });
    }, []);

    // One-file share: .allopack = STORE-zip of meta.json + video + captions.
    // Reopens in the Studio (drag-drop) with captions intact; pack JSON still
    // only ever carries the metadata reference, never these bytes.
    var downloadBundle = useCallback(function (v) {
      var base = (v.title || 'teacher_video').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'teacher_video';
      v.blob.arrayBuffer().then(function (buf) {
        var inserts = vsSanitizeTeachingInserts(v.inserts || [], v.duration || 0);
        var musicBed = v.musicBed ? vsSanitizeMusicBed(v.musicBed, v.duration || 0) : null;
        var mediaCredits = vsSanitizeMediaCredits(v.mediaCredits || []);
        var transcriptEdits = vsSanitizeTranscriptEdits(v.transcriptEdits || [], v.duration || 0);
        var transcriptWords = vsSanitizeTranscriptWords(v.transcriptWords || [], v.duration || 0);
        var audioManifest = v.audioEdits ? vsBuildAudioEditManifest(Object.assign({}, v.audioEdits, { duration: v.duration || 0 })) : vsBuildAudioEditManifest({ duration: v.duration || 0, audio: v.audio || null, musicBed: musicBed, applyToSource: false, bakedIntoVideo: true });
        var localizations = (v.localizations || []).map(function (loc) { return vsSanitizeLocalizedDraft(loc, v.duration || 0); }).filter(function (loc) { return loc && (loc.captions.length || loc.narration.length || loc.inserts.length || loc.chapters.length || loc.visualDescriptions.length); });
        var ref = vsMakePackReference({
          title: v.title, duration: v.duration, size: v.size, sha256: v.sha256,
          hostedUrl: v.hostedUrl || null,
          fileName: base + extFor(v.blob.type), hasCaptions: !!v.vtt, hasTranscriptEdits: !!transcriptEdits.length, transcriptEditCount: transcriptEdits.length, hasTranscriptWords: !!transcriptWords.length, transcriptWordCount: transcriptWords.length, hasAudioEdits: !!audioManifest.hasAudioEdits, audioEditsApplyToSource: audioManifest.applyToSource, muteSpanCount: audioManifest.muteSpanCount, hasVisualDescriptions: !!(v.visualDescriptions && v.visualDescriptions.length), hasChapters: !!(v.chapters && v.chapters.length), hasTeachingInserts: !!inserts.length, hasVisualPrompts: !!(v.visualPrompts && v.visualPrompts.length), hasLocalizations: !!localizations.length, localizationCount: localizations.length, hasVisualOverlays: !!inserts.filter(function (ins) { return ins && ins.type === 'image_overlay'; }).length, hasMusicBed: !!musicBed, hasMediaCredits: !!mediaCredits.length, mediaCreditCount: mediaCredits.length, mediaCreditWarningCount: mediaCredits.filter(function (item) { return item.status !== 'ok'; }).length, resourceCueCount: inserts.filter(function (ins) { return ins && ins.source === 'resource'; }).length, thumb: v.thumb, createdAt: v.createdAt
        });
        var entries = [
          { name: 'meta.json', data: new TextEncoder().encode(JSON.stringify(ref, null, 2)) },
          { name: base + extFor(v.blob.type), data: new Uint8Array(buf) }
        ];
        if (v.vtt) entries.push({ name: base + '.vtt', data: new TextEncoder().encode(v.vtt) });
        if (transcriptEdits.length) {
          entries.push({ name: 'transcript_edits.txt', data: new TextEncoder().encode(vsBuildTranscriptEditText(transcriptEdits, v.title || 'Teacher video')) });
          entries.push({ name: 'transcript_edits.json', data: new TextEncoder().encode(JSON.stringify(transcriptEdits, null, 2)) });
        }
        if (transcriptWords.length) entries.push({ name: 'transcript_words.json', data: new TextEncoder().encode(JSON.stringify(transcriptWords, null, 2)) });
        if (audioManifest.hasAudioEdits) entries.push({ name: 'audio_edits.json', data: new TextEncoder().encode(JSON.stringify(audioManifest, null, 2)) });
        if (v.visualDescriptions && v.visualDescriptions.length) entries.push({ name: 'visual_descriptions.json', data: new TextEncoder().encode(JSON.stringify(v.visualDescriptions, null, 2)) });
        if (v.chapters && v.chapters.length) entries.push({ name: 'chapters.json', data: new TextEncoder().encode(JSON.stringify(v.chapters, null, 2)) });
        if (inserts.length) entries.push({ name: 'teaching_inserts.json', data: new TextEncoder().encode(JSON.stringify(inserts, null, 2)) });
        if (musicBed) entries.push({ name: 'music_bed.json', data: new TextEncoder().encode(JSON.stringify(Object.assign({}, musicBed, { blob: undefined }), null, 2)) });
        if (mediaCredits.length) {
          entries.push({ name: 'media_credits.txt', data: new TextEncoder().encode(vsBuildMediaCredits(mediaCredits, v.title || 'Teacher video')) });
          entries.push({ name: 'media_credits.json', data: new TextEncoder().encode(JSON.stringify(mediaCredits, null, 2)) });
        }
        if (v.visualPrompts && v.visualPrompts.length) entries.push({ name: 'visual_prompts.json', data: new TextEncoder().encode(JSON.stringify(v.visualPrompts, null, 2)) });
        if (localizations.length) entries.push({ name: 'localizations.json', data: new TextEncoder().encode(JSON.stringify(localizations, null, 2)) });
        entries.splice(1, 0, { name: 'project_readme.txt', data: new TextEncoder().encode(vsBuildProjectBundleReadme({ title: v.title || 'Teacher video', duration: v.duration || 0, entries: entries.map(function (entry) { return entry.name; }), audioManifest: audioManifest, editableSource: false, hasCaptions: !!v.vtt, generatedAt: ref.createdAt })) });
        downloadBlob(new Blob([vsBuildZip(entries)], { type: 'application/zip' }), base + '.allopack');
        addToast(T('video_studio.bundle_done', 'Bundle saved — one file with the video, captions, and metadata. Drop it back into the Studio any time to re-edit.'), 'success');
      });
    }, []);

    var statusLine = studioState === 'open' ? T('video_studio.status_open', 'Studio window is open — record there, then press “Send to AlloFlow”.')
      : studioState === 'opening' ? T('video_studio.status_opening', 'Opening the Studio window…')
      : studioState === 'blocked' ? T('video_studio.status_blocked', 'Pop-up blocked. Allow pop-ups for this site and press the button again.')
      : studioState === 'stalled' ? T('video_studio.status_stalled', 'The Studio window opened but has not reported in yet. Check that it finished loading (it connects on its own once it does), or close it and open it again.')
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
            h('p', { className: 'text-xs text-slate-500 mt-3' }, T('video_studio.privacy_note', 'Local by default: recording, editing, and captioning run in your browser. Optional AI tools may send reviewed text, prompts, or sampled frame sheets through AlloFlow; before recording, close anything with student data and prefer sharing one tab.'))
          ),
          // Cinematic Studio lives HERE now (its hub card was removed 2026-07-02):
          // it is the prompt-craft companion for NotebookLM and other AI video
          // GENERATORS, while this panel records/edits real footage.
          propsRef.current.onOpenCinematicStudio && h('div', { className: 'rounded-xl border border-rose-200 bg-rose-50/60 p-3 mb-4 flex items-center justify-between gap-3 flex-wrap' },
            h('p', { className: 'text-xs text-slate-600 flex-1', style: { minWidth: '200px' } },
              T('video_studio.cinematic_hint', 'Generating a video with AI instead of recording one? Cinematic Studio helps you craft and debug prompts for NotebookLM Video Overviews and other AI video generators — and caption their output.')),
            h('button', {
              onClick: function () { try { propsRef.current.onOpenCinematicStudio(); } catch (_) {} },
              className: 'px-3 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 shrink-0',
              'data-help-key': 'video_studio_cinematic_entry'
            }, T('video_studio.cinematic_open', '🎬 Cinematic Studio'))
          ),
          // Gallery
          h('h3', { className: 'font-semibold text-slate-700 text-sm mb-2' }, T('video_studio.gallery', 'Videos from this session')),
          videos.length > 0 && h('p', { className: 'text-xs text-slate-500 mb-2' },
            T('video_studio.gallery_note', 'Kept on this device — they stay here (even if you close this panel) until you remove them.') +
            ' ' + videos.length + ' · ' + fmtBytes(videos.reduce(function (s, v) { return s + (Number(v.size) || 0); }, 0))),
          videos.length === 0
            ? h('p', { className: 'text-sm text-slate-400 italic' }, T('video_studio.gallery_empty', 'No videos yet. Record one in the Studio window and press “Send to AlloFlow”.'))
            : h('ul', { className: 'space-y-3', role: 'list' }, videos.map(function (v) {
                return h('li', { key: v.id, className: 'border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row gap-3' },
                  h('video', { src: v.url, controls: true, preload: 'metadata', className: 'w-full sm:w-64 rounded-lg bg-black', 'aria-label': v.title }),
                  h('div', { className: 'flex-1 min-w-0' },
                    h('p', { className: 'font-semibold text-slate-800 text-sm truncate' }, v.title),
                    h('p', { className: 'text-xs text-slate-500 mb-2' },
                      fmtDur(v.duration) + ' · ' + fmtBytes(v.size) + (v.vtt ? ' · ' + T('video_studio.has_captions', 'captions included') : '') + (v.chapters && v.chapters.length ? ' · chapters' : '') + (v.inserts && v.inserts.length ? ' · inserts' : '') + ((v.inserts || []).filter(function (ins) { return ins && ins.type === 'image_overlay'; }).length ? ' · overlays' : '') + (v.musicBed ? ' · music' : '') + (v.visualPrompts && v.visualPrompts.length ? ' · visual prompts' : '') + (v.localizations && v.localizations.length ? ' · localizations' : '')),
                    h('div', { className: 'flex items-center gap-2 mb-2' },
                      h('input', {
                        type: 'url',
                        defaultValue: v.hostedUrl || '',
                        placeholder: T('video_studio.hosted_link_ph', 'Optional hosted link — upload the downloaded file yourself (YouTube/Drive/LMS), then paste the https:// link'),
                        'aria-label': T('video_studio.hosted_link_label', 'Hosted video link (optional)'),
                        className: 'flex-1 min-w-0 text-xs border border-slate-300 rounded-lg px-2 py-1.5 text-slate-700',
                        onKeyDown: function (e) { if (e.key === 'Enter') setHostedUrl(v, e.target.value); },
                        onBlur: function (e) { setHostedUrl(v, e.target.value); }
                      }),
                      v.hostedUrl && h('a', {
                        href: v.hostedUrl, target: '_blank', rel: 'noopener noreferrer',
                        className: 'text-xs font-semibold text-indigo-700 hover:underline shrink-0'
                      }, T('video_studio.hosted_link_test', 'Test link ↗'))
                    ),
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
                        onClick: function () { downloadAccessPacket(v, { audience: 'student_family' }); },
                        className: 'px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-600',
                        title: T('video_studio.student_packet_title', 'Downloads a student/family-friendly packet with transcript, captions, chapters, and a plain sharing note.')
                      }, T('video_studio.student_packet', 'Student/family packet')),
                      v.vtt && h('button', {
                        onClick: function () { sendTranscriptResource(v); },
                        className: 'px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 text-xs font-semibold hover:bg-emerald-50',
                        title: T('video_studio.transcript_to_source_title', 'Loads the video transcript into AlloFlow Source so existing quiz and support tools can use it.')
                      }, T('video_studio.transcript_to_source', 'Send transcript to Source')),
                      h('button', {
                        onClick: function () { downloadBundle(v); },
                        className: 'px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700',
                        title: T('video_studio.bundle_title', 'One shareable file (.allopack zip) holding the video, its captions, and the metadata reference. Drop it into the Studio to re-edit.')
                      }, T('video_studio.download_bundle', '📦 Bundle (.allopack)')),
                      h('button', {
                        onClick: function () { sendRefToHistory(v); },
                        className: 'px-3 py-1.5 rounded-lg bg-violet-700 text-white text-xs font-semibold hover:bg-violet-600',
                        title: T('video_studio.ref_history_title', 'Saves a small video card (title, duration, thumbnail, checksum, hosted link if set — never the video bytes) into Resource History so it travels with packs.')
                      }, T('video_studio.ref_history', '🎞 Save to Resource History')),
                      h('button', {
                        onClick: function () { copyPackRef(v); },
                        className: 'px-3 py-1.5 rounded-lg border border-indigo-300 text-indigo-700 text-xs font-semibold hover:bg-indigo-50',
                        title: T('video_studio.ref_title', 'Copies a small JSON reference (title, duration, checksum, thumbnail) — never the video bytes — for embedding in a resource pack.')
                      }, T('video_studio.copy_ref', '📎 Copy pack reference')),
                      h('button', {
                        onClick: function () { removeTake(v); },
                        className: 'px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 text-xs font-semibold hover:bg-rose-50',
                        title: T('video_studio.remove_title', 'Removes this video from the gallery and this device. Files you already downloaded or bundled are not affected.')
                      }, T('video_studio.remove', '🗑 Remove'))
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
