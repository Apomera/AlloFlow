/**
 * AlloFlow Brand Profile Module
 *
 * Persistent brand identity (school colors, fonts, logo, header/footer) that
 * BOTH the Document Builder and the PDF Remediation pipeline can read from.
 * Today those two features have their own ephemeral notions of "brand" that
 * don't talk to each other or survive a reload. This module is the
 * source-of-truth they should both call into.
 *
 * Storage: a single localStorage key, schema-versioned for safe migration.
 *
 * Public API (window.AlloModules.BrandProfile):
 *   getActiveBrandProfile()             → profile | null
 *   setActiveBrandProfile(profileId)    → boolean   (also dispatches event)
 *   listBrandProfiles()                 → profile[] (sorted by modified desc)
 *   getBrandProfile(profileId)          → profile | null
 *   saveBrandProfile(profile)           → { ok, id, errors, warnings }
 *   deleteBrandProfile(profileId)       → boolean
 *   exportBrandProfile(profileId)       → string  (JSON, for sharing)
 *   importBrandProfile(jsonString)      → { ok, id, errors }
 *   validateBrandProfile(profile)       → { ok, errors, warnings }
 *   brandProfileToCssVars(profile)      → cssVars shape matching STYLE_SEEDS
 *   brandProfileToCSS(profile)          → CSS string ready for the export pipeline
 *   brandProfileToHeaderHTML(profile)   → HTML <header> band (with optional logo)
 *   brandProfileToFooterHTML(profile, pageNumber)  → HTML <footer> band
 *
 * Events dispatched on window:
 *   alloflow:brand-profile-changed     { detail: { profileId, profile } }
 *
 * Source-of-truth design choices:
 *   - localStorage only (no backend). Per-browser, per-device. Export/import
 *     covers multi-device use until/unless a backend exists.
 *   - Schema-versioned. v1 is initial; future versions migrate on read.
 *   - Validation is strict on save, lenient on read (a slightly-failing
 *     stored profile still loads; it just shows warnings).
 *   - Defense-in-depth on injection: colors are hex-enforced and fonts are
 *     charset-allowlisted on BOTH save (validateBrandProfile) and every read
 *     (_normalize), because brand colors/fonts are interpolated raw into export
 *     <style> blocks downstream. HTML bands emit escaped attributes / textContent.
 *     The export pipeline still sanitizes customExportCSS as a second layer.
 */
(function () {
  'use strict';

  if (window.AlloModules && window.AlloModules.BrandProfile) {
    console.log('[CDN] BrandProfile already loaded, skipping');
    return;
  }

  var warnLog = function () {
    console.warn.apply(console, ['[BrandProfile]'].concat(Array.prototype.slice.call(arguments)));
  };

  // ── Storage constants ────────────────────────────────────────────────────
  var STORAGE_KEY = 'alloBrandProfiles_v1';
  var CURRENT_SCHEMA_VERSION = 1;

  // ── Defaults ─────────────────────────────────────────────────────────────
  var DEFAULT_COLORS = {
    heading: '#1e3a5f',
    accent: '#2563eb',
    body: '#1f2937',
    bg: '#ffffff',
    cardBg: '#f8fafc',
    cardBorder: '#e2e8f0'
  };

  var DEFAULT_FONTS = {
    body: "'Inter', system-ui, sans-serif",
    heading: null  // null = use body font
  };

  // ── Pure color helpers (WCAG 2.1 luminance + contrast ratio) ─────────────
  // Duplicated from doc_pipeline_module's validateAndFixCssContrast so this
  // module has no load-order dependency. The math is identical.
  function _hexToRgb(hex) {
    var h = String(hex || '').replace('#', '').trim();
    if (h.length === 3) {
      return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
    }
    if (h.length === 6) {
      return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
    }
    return null;
  }
  function _luminance(r, g, b) {
    var rs = r / 255, gs = g / 255, bs = b / 255;
    function lin(c) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
    return 0.2126 * lin(rs) + 0.7152 * lin(gs) + 0.0722 * lin(bs);
  }
  function contrastRatio(hexFg, hexBg) {
    var fg = _hexToRgb(hexFg), bg = _hexToRgb(hexBg);
    if (!fg || !bg) return 0;
    var L1 = _luminance(fg[0], fg[1], fg[2]);
    var L2 = _luminance(bg[0], bg[1], bg[2]);
    var hi = Math.max(L1, L2), lo = Math.min(L1, L2);
    return (hi + 0.05) / (lo + 0.05);
  }
  function isValidHex(value) {
    if (typeof value !== 'string') return false;
    var h = value.replace('#', '').trim();
    return /^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(h);
  }
  // Font-family values are interpolated RAW into export <style> blocks downstream
  // (the export pipeline sanitizes customExportCSS but not brand-derived fonts), so a
  // crafted font like "x;}</style><script>…" would break out of the style element =
  // same-origin XSS in the preview AND the distributed .html. Allow only the characters
  // a real font stack uses (names, generics, quotes, commas, hyphens, accented Latin);
  // reject anything that can carry CSS or markup. Returns a safe value or null.
  function _safeFontStack(value) {
    if (typeof value !== 'string') return null;
    var v = value.trim();
    if (!v || v.length > 200) return null;
    return /^[a-zA-Z0-9 ,.'"À-ɏ-]+$/.test(v) ? v : null;
  }

  // ── Escape helpers for HTML emission ─────────────────────────────────────
  // We render the optional header/footer bands as HTML. Anything user-supplied
  // (school name, footer credit, alt text) gets escaped before injection.
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function escapeAttr(s) { return escapeHtml(s); }

  // ── ID generation ────────────────────────────────────────────────────────
  // Slugify the profile name. Falls back to a short random tail if collision.
  function slugify(name) {
    var base = String(name || '')
      .toLowerCase()
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    return base || 'brand';
  }
  function uniqueId(name, existingIds) {
    var slug = slugify(name);
    if (!existingIds[slug]) return slug;
    var n = 2;
    while (existingIds[slug + '-' + n]) n++;
    return slug + '-' + n;
  }

  // ── Storage layer ────────────────────────────────────────────────────────
  // Single read/write surface so all schema migration runs in one place.
  function _readStore() {
    var raw;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { warnLog('localStorage read failed', e); return _emptyStore(); }
    if (!raw) return _emptyStore();
    var parsed;
    try { parsed = JSON.parse(raw); } catch (e) {
      warnLog('Stored brand profiles corrupted — starting fresh. Raw:', raw && raw.slice(0, 200));
      return _emptyStore();
    }
    return _migrate(parsed);
  }
  function _writeStore(store) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); return true; }
    catch (e) { warnLog('localStorage write failed (quota?)', e); return false; }
  }
  function _emptyStore() {
    return { schemaVersion: CURRENT_SCHEMA_VERSION, activeProfileId: null, profiles: {} };
  }
  function _migrate(store) {
    if (!store || typeof store !== 'object') return _emptyStore();
    var v = store.schemaVersion || 0;
    // No migrations yet — v1 is initial. Add `if (v < 2) { ... }` blocks here.
    if (v > CURRENT_SCHEMA_VERSION) {
      warnLog('Stored schema version (' + v + ') is newer than this build supports ('
        + CURRENT_SCHEMA_VERSION + '). Falling back to read-only mode.');
    }
    if (!store.profiles || typeof store.profiles !== 'object') store.profiles = {};
    if (!Object.prototype.hasOwnProperty.call(store, 'activeProfileId')) store.activeProfileId = null;
    store.schemaVersion = CURRENT_SCHEMA_VERSION;
    return store;
  }

  // ── Normalization ────────────────────────────────────────────────────────
  // Take a partial / user-supplied profile and fill in defaults so downstream
  // consumers can rely on the shape. This is the OUTPUT shape; validate first.
  function _normalize(input) {
    var src = input || {};
    // Re-enforce hex on EVERY read (not just at save): a profile can reach here via
    // importBrandProfile or a hand-edited localStorage that never passed validation, and
    // the colors are interpolated raw into export CSS. Any non-hex falls back to default.
    var _mergedColors = Object.assign({}, DEFAULT_COLORS, src.colors || {});
    var colors = {};
    Object.keys(DEFAULT_COLORS).forEach(function (ck) {
      colors[ck] = isValidHex(_mergedColors[ck]) ? _mergedColors[ck] : DEFAULT_COLORS[ck];
    });
    // Likewise sanitize the font stacks (see _safeFontStack) so a stored/imported brand
    // can never inject markup through font-family. Unsafe → default (body) / null (heading).
    var _mergedFonts = Object.assign({}, DEFAULT_FONTS, src.fonts || {});
    var fonts = {
      body: _safeFontStack(_mergedFonts.body) || DEFAULT_FONTS.body,
      heading: (_mergedFonts.heading == null) ? null : (_safeFontStack(_mergedFonts.heading) || null)
    };
    var header = src.header && typeof src.header === 'object'
      ? { text: String(src.header.text || ''), showLogo: !!src.header.showLogo }
      : { text: '', showLogo: false };
    var footer = src.footer && typeof src.footer === 'object'
      ? { text: String(src.footer.text || ''), showPageNumber: !!src.footer.showPageNumber }
      : { text: '', showPageNumber: false };
    var logo = null;
    if (src.logo && typeof src.logo === 'object' && src.logo.src) {
      logo = {
        src: String(src.logo.src),
        alt: String(src.logo.alt || ''),
        width: Number(src.logo.width) || null,
        height: Number(src.logo.height) || null
      };
    }
    return {
      id: src.id || null,  // assigned by saveBrandProfile if missing
      name: String(src.name || '').slice(0, 80),
      logo: logo,
      colors: colors,
      fonts: fonts,
      header: header,
      footer: footer,
      createdFrom: src.createdFrom || 'manual',
      created: src.created || null,  // assigned by saveBrandProfile if missing
      modified: src.modified || null
    };
  }

  // ── Validation ───────────────────────────────────────────────────────────
  // Returns { ok, errors, warnings }. Errors block save; warnings don't.
  function validateBrandProfile(profile) {
    var errors = [], warnings = [];
    if (!profile || typeof profile !== 'object') {
      return { ok: false, errors: ['Profile is missing or not an object'], warnings: [] };
    }
    var n = _normalize(profile);
    if (!n.name || n.name.trim().length === 0) errors.push('Profile name is required');
    if (n.name && n.name.length > 80) errors.push('Profile name must be 80 characters or fewer');

    // Color validity
    var colorKeys = Object.keys(DEFAULT_COLORS);
    for (var i = 0; i < colorKeys.length; i++) {
      var k = colorKeys[i];
      if (!isValidHex(n.colors[k])) errors.push('Color "' + k + '" must be a valid hex (#rrggbb or #rgb)');
    }
    // Font validity — fonts are interpolated into export CSS, so reject CSS/markup-bearing
    // values rather than silently swapping them (the user should know their input was rejected).
    var rawFonts = (profile.fonts && typeof profile.fonts === 'object') ? profile.fonts : {};
    if (rawFonts.body && _safeFontStack(rawFonts.body) === null) errors.push('Body font contains characters that are not allowed in a font name (use letters, digits, spaces, commas, periods, hyphens and quotes only)');
    if (rawFonts.heading && _safeFontStack(rawFonts.heading) === null) errors.push('Heading font contains characters that are not allowed in a font name');
    if (errors.length === 0) {
      // Contrast checks (only if all colors parsed)
      var c = n.colors;
      var headingVsBg = contrastRatio(c.heading, c.bg);
      var bodyVsBg    = contrastRatio(c.body, c.bg);
      var accentVsBg  = contrastRatio(c.accent, c.bg);
      var bodyVsCard  = contrastRatio(c.body, c.cardBg);
      if (headingVsBg < 3.0) errors.push('Heading vs background contrast is ' + headingVsBg.toFixed(2) + ':1 — minimum 3.0 for large text');
      else if (headingVsBg < 4.5) warnings.push('Heading vs background contrast is ' + headingVsBg.toFixed(2) + ':1 — below 4.5 (AA body text). OK only if all headings remain large (≥24px or ≥18px bold).');
      if (bodyVsBg < 4.5)    errors.push('Body text vs background contrast is ' + bodyVsBg.toFixed(2) + ':1 — minimum 4.5 (WCAG AA)');
      if (bodyVsCard < 4.5)  warnings.push('Body vs card background contrast is ' + bodyVsCard.toFixed(2) + ':1 — text inside cards may be hard to read');
      if (accentVsBg < 3.0)  warnings.push('Accent vs background contrast is ' + accentVsBg.toFixed(2) + ':1 — fine for decorative use, fails 4.5:1 if used for link text');
    }

    // Logo / alt text
    if (n.logo) {
      if (!n.logo.src) errors.push('Logo source is missing');
      if (!n.logo.alt || n.logo.alt.trim().length === 0) {
        errors.push('Logo alt text is required (WCAG 1.1.1). Describe the logo in 5–15 words. Use empty alt only for purely decorative logos.');
      } else if (n.logo.alt.length > 250) {
        warnings.push('Logo alt text is unusually long (' + n.logo.alt.length + ' chars). Aim for 5–15 words; use the figcaption or surrounding text for more.');
      }
    }

    // Header / footer text
    if (n.header.text && n.header.text.length > 200) warnings.push('Header text is over 200 characters — will likely wrap on print pages');
    if (n.footer.text && n.footer.text.length > 200) warnings.push('Footer text is over 200 characters — will likely wrap on print pages');
    if (n.header.showLogo && !n.logo) warnings.push('Header is set to show the logo, but no logo is uploaded');

    return { ok: errors.length === 0, errors: errors, warnings: warnings };
  }

  // ── Read API ─────────────────────────────────────────────────────────────
  function getActiveBrandProfile() {
    var store = _readStore();
    if (!store.activeProfileId) return null;
    var p = store.profiles[store.activeProfileId];
    return p ? _normalize(p) : null;
  }
  function getBrandProfile(profileId) {
    if (!profileId) return null;
    var store = _readStore();
    var p = store.profiles[profileId];
    return p ? _normalize(p) : null;
  }
  function listBrandProfiles() {
    var store = _readStore();
    var arr = Object.keys(store.profiles).map(function (id) { return _normalize(store.profiles[id]); });
    arr.sort(function (a, b) {
      var am = a.modified || a.created || '';
      var bm = b.modified || b.created || '';
      return bm.localeCompare(am);  // newest first
    });
    return arr;
  }

  // ── Write API ────────────────────────────────────────────────────────────
  function saveBrandProfile(profile) {
    var v = validateBrandProfile(profile);
    if (!v.ok) return { ok: false, id: null, errors: v.errors, warnings: v.warnings };

    var n = _normalize(profile);
    var store = _readStore();
    // Build a same-shape ID lookup (slug → already-taken) once.
    var taken = {};
    Object.keys(store.profiles).forEach(function (id) { taken[id] = true; });
    // If updating an existing profile by id, allow overwrite. If new, mint a unique id.
    if (!n.id || !store.profiles[n.id]) {
      delete taken[n.id || ''];  // not actually taken if it doesn't exist
      n.id = uniqueId(n.name, taken);
    }
    // Stamps. Caller passes them or we accept a stable placeholder — Date.now is
    // available in browser context (this is module runtime, not workflow-script).
    var nowIso;
    try { nowIso = new Date().toISOString(); } catch (e) { nowIso = ''; }
    if (!n.created) n.created = nowIso;
    n.modified = nowIso;

    store.profiles[n.id] = n;
    // If no profile is active yet, make this one active.
    if (!store.activeProfileId) store.activeProfileId = n.id;
    var ok = _writeStore(store);
    if (ok && store.activeProfileId === n.id) _dispatchChange(n.id, n);
    return { ok: ok, id: n.id, errors: [], warnings: v.warnings };
  }
  function deleteBrandProfile(profileId) {
    if (!profileId) return false;
    var store = _readStore();
    if (!store.profiles[profileId]) return false;
    delete store.profiles[profileId];
    if (store.activeProfileId === profileId) {
      // Pick the next-most-recent as the new active, or null.
      var remaining = Object.keys(store.profiles);
      store.activeProfileId = remaining.length > 0 ? remaining[0] : null;
    }
    var ok = _writeStore(store);
    if (ok) _dispatchChange(store.activeProfileId, store.activeProfileId ? _normalize(store.profiles[store.activeProfileId]) : null);
    return ok;
  }
  function setActiveBrandProfile(profileId) {
    var store = _readStore();
    if (profileId !== null && !store.profiles[profileId]) {
      warnLog('Cannot set active brand to unknown profileId:', profileId);
      return false;
    }
    store.activeProfileId = profileId;
    var ok = _writeStore(store);
    if (ok) {
      var p = profileId ? _normalize(store.profiles[profileId]) : null;
      _dispatchChange(profileId, p);
    }
    return ok;
  }
  function _dispatchChange(profileId, profile) {
    try {
      window.dispatchEvent(new CustomEvent('alloflow:brand-profile-changed', {
        detail: { profileId: profileId, profile: profile }
      }));
    } catch (e) { /* IE legacy — skip */ }
  }

  // ── Export / Import (for cross-device sharing) ───────────────────────────
  // We export a SINGLE profile (not the whole store) so users share one brand
  // at a time, by intent. Imports require an explicit save step.
  function exportBrandProfile(profileId) {
    var p = getBrandProfile(profileId);
    if (!p) return null;
    var safe = _normalize(p);
    safe._alloFormat = 'alloflow.brand-profile';
    safe._formatVersion = CURRENT_SCHEMA_VERSION;
    return JSON.stringify(safe, null, 2);
  }
  function importBrandProfile(jsonString) {
    var parsed;
    try { parsed = JSON.parse(jsonString); }
    catch (e) { return { ok: false, id: null, errors: ['Not valid JSON: ' + e.message] }; }
    if (!parsed || parsed._alloFormat !== 'alloflow.brand-profile') {
      return { ok: false, id: null, errors: ['Not an AlloFlow brand profile export (missing _alloFormat tag)'] };
    }
    if (parsed._formatVersion && parsed._formatVersion > CURRENT_SCHEMA_VERSION) {
      return { ok: false, id: null, errors: ['Brand profile was exported from a newer AlloFlow (format v' + parsed._formatVersion + '; this build supports v' + CURRENT_SCHEMA_VERSION + ')'] };
    }
    // Drop the format tags; the rest is a normal profile. Force a re-mint of the id
    // so an import never overwrites an existing local profile by collision.
    delete parsed._alloFormat;
    delete parsed._formatVersion;
    parsed.id = null;
    parsed.createdFrom = 'imported';
    return saveBrandProfile(parsed);
  }

  // ── Adapters into the existing styling pipeline ──────────────────────────
  // STYLE_SEEDS.cssVars shape (subset): { bodyFont, headingColor, accentColor,
  // bgColor, cardBg, cardBorder, headerBg, headerText, extraCSS }.
  // Mapping a BrandProfile onto that shape lets the Document Builder + PDF
  // remediation pipeline use a brand wherever they currently consume a seed.
  function brandProfileToCssVars(profile) {
    if (!profile) return null;
    var n = _normalize(profile);
    return {
      bodyFont: n.fonts.body,
      headingColor: n.colors.heading,
      accentColor: n.colors.accent,
      bgColor: n.colors.bg,
      cardBg: n.colors.cardBg,
      cardBorder: n.colors.cardBorder,
      headerBg: n.colors.heading,
      headerText: n.colors.bg,
      extraCSS: ''
    };
  }
  function brandProfileToCSS(profile) {
    if (!profile) return '';
    var n = _normalize(profile);
    var c = n.colors;
    var headingFont = n.fonts.heading || n.fonts.body;
    return [
      'body { font-family: ' + n.fonts.body + '; background: ' + c.bg + '; color: ' + c.body + '; }',
      'h1, h2, h3, h4, h5, h6 { font-family: ' + headingFont + '; color: ' + c.heading + '; }',
      '.section, .card, .quiz-box { background: ' + c.cardBg + '; border: 1px solid ' + c.cardBorder + '; }',
      '.resource-header { background: ' + c.heading + '; color: ' + c.bg + '; }',
      'a { color: ' + c.accent + '; }',
      '.tag, .a11y-badge { background: ' + c.accent + '; color: ' + c.bg + '; }',
      '.brand-header { background: ' + c.heading + '; color: ' + c.bg + '; padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.75rem; }',
      '.brand-header img { max-height: 48px; width: auto; }',
      '.brand-footer { border-top: 1px solid ' + c.cardBorder + '; color: ' + c.body + '; padding: 0.5rem 1rem; font-size: 0.875rem; display: flex; justify-content: space-between; }',
      '@media print { body { background: #ffffff !important; } .section { page-break-inside: avoid; } .brand-header, .brand-footer { background: ' + c.heading + ' !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }'
    ].join('\n');
  }

  // Optional header/footer band HTML. Returns '' if the brand has nothing to show.
  // Escapes all user input. Logo is included only if uploaded AND header.showLogo.
  function brandProfileToHeaderHTML(profile) {
    if (!profile) return '';
    var n = _normalize(profile);
    var hasText = n.header.text && n.header.text.length > 0;
    var hasLogo = n.header.showLogo && n.logo && n.logo.src;
    if (!hasText && !hasLogo) return '';
    var pieces = ['<header class="brand-header" role="banner">'];
    if (hasLogo) {
      var w = n.logo.width ? ' width="' + escapeAttr(String(n.logo.width)) + '"' : '';
      var h = n.logo.height ? ' height="' + escapeAttr(String(n.logo.height)) + '"' : '';
      pieces.push('<img src="' + escapeAttr(n.logo.src) + '" alt="' + escapeAttr(n.logo.alt) + '"' + w + h + '>');
    }
    if (hasText) {
      pieces.push('<span class="brand-header-text">' + escapeHtml(n.header.text) + '</span>');
    }
    pieces.push('</header>');
    return pieces.join('');
  }
  function brandProfileToFooterHTML(profile, pageNumber) {
    if (!profile) return '';
    var n = _normalize(profile);
    var hasText = n.footer.text && n.footer.text.length > 0;
    var showPage = n.footer.showPageNumber && pageNumber != null;
    if (!hasText && !showPage) return '';
    var pieces = ['<footer class="brand-footer" role="contentinfo">'];
    if (hasText) pieces.push('<span class="brand-footer-text">' + escapeHtml(n.footer.text) + '</span>');
    else        pieces.push('<span></span>');  // flex spacer so page # right-aligns
    if (showPage) pieces.push('<span class="brand-footer-page">Page ' + escapeHtml(String(pageNumber)) + '</span>');
    pieces.push('</footer>');
    return pieces.join('');
  }

  // ── Auto-fix: nudge any failing color toward black/white until it passes ─
  // Useful when a Brand Profile is created from PDF color extraction (Vision
  // can return colors that just barely fail). Called automatically by callers
  // that opt in; not invoked by saveBrandProfile (validation is preferred over
  // silent mutation on user input).
  function autoFixBrandColors(profile, targetRatio) {
    var target = targetRatio || 4.5;
    var n = _normalize(profile);
    var fixes = [];
    function nudge(fgKey, bgKey, minRatio) {
      var fg = n.colors[fgKey], bg = n.colors[bgKey];
      if (!isValidHex(fg) || !isValidHex(bg)) return;
      if (contrastRatio(fg, bg) >= minRatio) return;
      var towardBlack = _luminance.apply(null, _hexToRgb(bg)) > 0.5;
      var rgb = _hexToRgb(fg).slice();
      for (var step = 0; step < 32; step++) {
        for (var i = 0; i < 3; i++) {
          rgb[i] = towardBlack ? Math.max(0, rgb[i] - 8) : Math.min(255, rgb[i] + 8);
        }
        var candidate = '#' + rgb.map(function (c) {
          var s = c.toString(16); return s.length < 2 ? '0' + s : s;
        }).join('');
        if (contrastRatio(candidate, bg) >= minRatio) {
          fixes.push({ key: fgKey, from: fg, to: candidate, ratio: contrastRatio(candidate, bg) });
          n.colors[fgKey] = candidate;
          return;
        }
      }
      var fallback = towardBlack ? '#000000' : '#ffffff';
      fixes.push({ key: fgKey, from: fg, to: fallback, ratio: contrastRatio(fallback, bg) });
      n.colors[fgKey] = fallback;
    }
    nudge('heading', 'bg', target);
    nudge('body', 'bg', target);
    nudge('body', 'cardBg', target);
    return { profile: n, fixes: fixes };
  }

  // ── Expose to AlloFlow shell ─────────────────────────────────────────────
  var BrandProfile = {
    // Read
    getActiveBrandProfile: getActiveBrandProfile,
    setActiveBrandProfile: setActiveBrandProfile,
    listBrandProfiles: listBrandProfiles,
    getBrandProfile: getBrandProfile,
    // Write
    saveBrandProfile: saveBrandProfile,
    deleteBrandProfile: deleteBrandProfile,
    // Share
    exportBrandProfile: exportBrandProfile,
    importBrandProfile: importBrandProfile,
    // Validate
    validateBrandProfile: validateBrandProfile,
    autoFixBrandColors: autoFixBrandColors,
    contrastRatio: contrastRatio,
    isValidHex: isValidHex,
    // Adapters into existing pipelines
    brandProfileToCssVars: brandProfileToCssVars,
    brandProfileToCSS: brandProfileToCSS,
    brandProfileToHeaderHTML: brandProfileToHeaderHTML,
    brandProfileToFooterHTML: brandProfileToFooterHTML,
    // Introspection
    SCHEMA_VERSION: CURRENT_SCHEMA_VERSION,
    DEFAULT_COLORS: DEFAULT_COLORS,
    DEFAULT_FONTS: DEFAULT_FONTS,
    STORAGE_KEY: STORAGE_KEY
  };

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.BrandProfile = BrandProfile;

  console.log('[CDN] BrandProfile loaded (schema v' + CURRENT_SCHEMA_VERSION + ')');
})();
