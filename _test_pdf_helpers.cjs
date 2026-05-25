// _test_pdf_helpers.cjs — Test suite for pure helpers in the PDF remediation pipeline.
//
// IMPORTANT: These helpers are COPIED from doc_pipeline_source.jsx because they
// live inside the createDocPipeline factory closure and aren't exported. Each
// function in the "Subjects under test" section below is a verbatim copy from
// the source — keep them in sync until we do the extraction refactor.
//
// Source line numbers (as of writing) for the originals:
//   _stage4_maskStrings              ~line 2774
//   _stage4_parseBTSegments          ~line 2810
//   _stage4_rewriteStream            ~line 2836
//   _stage4_matchSegmentsToItems     ~line 2875
//   _stage4_inferRole                ~line 2897
//   _stage6b_normalizeArtifactText   ~line 2962
//   _stage6b_detectArtifactHashes    ~line 2965
//   buildHtmlFromStructTree          ~line 2670
//
// Run: node --test _test_pdf_helpers.cjs
// Run a single suite: node --test --test-name-pattern="maskStrings" _test_pdf_helpers.cjs

const { test, describe } = require('node:test');
const assert = require('node:assert');

// ═══════════════════════════════════════════════════════════════════════════
// Subjects under test (verbatim copies from doc_pipeline_source.jsx)
// ═══════════════════════════════════════════════════════════════════════════

const _stage4_maskStrings = (s) => {
  let out = ''; let i = 0; const N = s.length;
  while (i < N) {
    const c = s[i];
    if (c === '%') {
      let j = i;
      while (j < N && s[j] !== '\n' && s[j] !== '\r') j++;
      out += ' '.repeat(j - i); i = j; continue;
    }
    if (c === '(') {
      let depth = 1, j = i + 1;
      while (j < N && depth > 0) {
        if (s[j] === '\\') { j += 2; continue; }
        if (s[j] === '(') depth++;
        else if (s[j] === ')') depth--;
        j++;
      }
      out += ' '.repeat(j - i); i = j; continue;
    }
    if (c === '<' && s[i+1] === '<') { out += '<<'; i += 2; continue; }
    if (c === '<') {
      let j = i + 1;
      while (j < N && s[j] !== '>') j++;
      if (j < N) j++;
      out += ' '.repeat(j - i); i = j; continue;
    }
    if (c === '>' && s[i+1] === '>') { out += '>>'; i += 2; continue; }
    out += c; i++;
  }
  return out;
};

const _stage4_parseBTSegments = (streamBytes) => {
  let s = '';
  for (let i = 0; i < streamBytes.length; i++) s += String.fromCharCode(streamBytes[i]);
  const masked = _stage4_maskStrings(s);
  const segments = [];
  const re = /\bBT\b([\s\S]*?)\bET\b/g;
  let m;
  while ((m = re.exec(masked)) !== null) {
    const btStart = m.index;
    const etEnd = m.index + m[0].length;
    const inside = m[1];
    let x = 0, y = 0;
    const tmMatch = /([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+Tm\b/.exec(inside);
    if (tmMatch) { x = parseFloat(tmMatch[5]); y = parseFloat(tmMatch[6]); }
    else {
      const tdMatch = /([-\d.eE+]+)\s+([-\d.eE+]+)\s+T[dD]\b/.exec(inside);
      if (tdMatch) { x = parseFloat(tdMatch[1]); y = parseFloat(tdMatch[2]); }
    }
    segments.push({ btStart, etEnd, x, y });
  }
  return segments;
};

const _stage4_rewriteStream = (streamBytes, segments, wraps) => {
  if (segments.length === 0) return streamBytes;
  const enc = new TextEncoder();
  const out = Array.from(streamBytes);
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    const w = wraps[i] || { bdc: '/P <</MCID ' + i + '>> BDC\n', emc: '\nEMC\n' };
    const emcBytes = enc.encode(w.emc);
    const bdcBytes = enc.encode(w.bdc);
    out.splice(seg.etEnd, 0, ...emcBytes);
    out.splice(seg.btStart, 0, ...bdcBytes);
  }
  return new Uint8Array(out);
};

const _stage4_matchSegmentsToItems = (segments, items) => {
  const matched = new Array(segments.length);
  if (segments.length === items.length && items.length > 0) {
    for (let i = 0; i < segments.length; i++) matched[i] = items[i];
    return matched;
  }
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    let best = null, bestDist = Infinity;
    for (const it of items) {
      const dx = it.x - seg.x, dy = it.y - seg.y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; best = it; }
    }
    matched[i] = best || { str: '', fontScale: 12, fontName: '' };
  }
  return matched;
};

const _stage4_inferRole = (item, fontScaleMedian, outlineItems) => {
  const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const itemText = norm(item && item.str);
  if (itemText.length >= 4 && Array.isArray(outlineItems)) {
    for (const oi of outlineItems) {
      const ot = norm(oi && oi.text);
      if (ot.length < 4) continue;
      if (ot.startsWith(itemText) || itemText.startsWith(ot) || ot.includes(itemText) || itemText.includes(ot)) {
        return oi.role;
      }
    }
  }
  if (fontScaleMedian > 0 && item && item.fontScale > 0) {
    const ratio = item.fontScale / fontScaleMedian;
    if (ratio >= 1.6) return 'H1';
    if (ratio >= 1.3) return 'H2';
    if (ratio >= 1.1) return 'H3';
    if (ratio <= 0.85) return 'Caption';
  }
  return 'P';
};

const _stage6b_normalizeArtifactText = (s) => {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
};

const _stage6b_detectArtifactHashes = (pagesItems, opts) => {
  opts = opts || {};
  const threshold = opts.threshold != null ? opts.threshold : 0.95;
  const minPages = opts.minPages != null ? opts.minPages : 5;
  if (!Array.isArray(pagesItems) || pagesItems.length < minPages) return new Set();
  const perPageHits = new Map();
  for (const items of pagesItems) {
    if (!Array.isArray(items)) continue;
    const seenThisPage = new Set();
    for (const it of items) {
      const norm = _stage6b_normalizeArtifactText(it && it.str);
      if (!norm || norm.length < 2) continue;
      if (seenThisPage.has(norm)) continue;
      seenThisPage.add(norm);
      perPageHits.set(norm, (perPageHits.get(norm) || 0) + 1);
    }
  }
  const requiredHits = Math.ceil(pagesItems.length * threshold);
  const artifacts = new Set();
  for (const [text, count] of perPageHits.entries()) {
    if (count >= requiredHits) artifacts.add(text);
  }
  return artifacts;
};

const buildHtmlFromStructTree = (structTree, fullText) => {
  const _esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const _paras = (s) => {
    return String(s || '').split(/\n\n+/).map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean).map(p => '<p>' + _esc(p) + '</p>').join('\n');
  };
  const _flatFallback = () => _paras(fullText);

  if (!structTree || !structTree.hasTags || !Array.isArray(structTree.headings)) return _flatFallback();
  const headings = structTree.headings.filter(h => h && h.text && typeof h.level === 'number');
  if (headings.length === 0) return _flatFallback();
  if (!fullText) {
    return headings.map(h => `<h${Math.min(Math.max(h.level, 1), 6)}>${_esc(h.text)}</h${Math.min(Math.max(h.level, 1), 6)}>`).join('\n');
  }

  const _norm = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const fullNorm = _norm(fullText);

  let html = '';
  let cursor = 0;
  let cursorNorm = 0;
  let matchedAny = false;

  for (const h of headings) {
    const headingText = h.text;
    const headingNorm = _norm(headingText);
    if (!headingNorm) continue;
    const idxNorm = fullNorm.indexOf(headingNorm, cursorNorm);
    if (idxNorm === -1) {
      html += `<h${Math.min(Math.max(h.level, 1), 6)}>${_esc(headingText)}</h${Math.min(Math.max(h.level, 1), 6)}>\n`;
      continue;
    }
    matchedAny = true;
    const target = idxNorm - cursorNorm;
    let origIdx = cursor;
    let skipped = 0;
    while (origIdx < fullText.length && skipped < target) {
      const ch = fullText[origIdx];
      if (!/\s/.test(ch) || (skipped > 0 && fullText[origIdx - 1] && !/\s/.test(fullText[origIdx - 1]))) {
        skipped++;
      }
      origIdx++;
    }
    const beforeChunk = fullText.slice(cursor, origIdx).trim();
    if (beforeChunk) html += _paras(beforeChunk) + '\n';
    html += `<h${Math.min(Math.max(h.level, 1), 6)}>${_esc(headingText)}</h${Math.min(Math.max(h.level, 1), 6)}>\n`;
    cursor = origIdx + headingText.length;
    cursorNorm = idxNorm + headingNorm.length;
  }

  const tail = fullText.slice(cursor).trim();
  if (tail) html += _paras(tail);

  return matchedAny ? html : _flatFallback();
};

// Document Builder Tier 1.1 — CSS sanitizer
// Source: doc_pipeline_source.jsx ~line 2660
const sanitizeCustomExportCSS = (rawCss) => {
  if (!rawCss || typeof rawCss !== 'string') return '';
  let out = String(rawCss);
  if (/@import\s+[^;]+;?/i.test(out)) { out = out.replace(/@import\s+[^;]+;?/gi, '/* @import stripped — external loads blocked for XSS safety */'); }
  if (/expression\s*\(/i.test(out)) { out = out.replace(/expression\s*\([^)]*\)/gi, '/* expression() stripped */'); }
  if (/url\s*\(\s*['"]?\s*(?:javascript|vbscript|data\s*:\s*text\/html)/i.test(out)) {
    out = out.replace(/url\s*\(\s*['"]?\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^'")]*['"]?\s*\)/gi, 'url("about:blank")');
  }
  if (/(^|[\s;{])behavior\s*:/i.test(out)) { out = out.replace(/(^|[\s;{])behavior\s*:[^;}]+;?/gi, '$1/* behavior stripped */'); }
  if (/-moz-binding\s*:/i.test(out)) { out = out.replace(/-moz-binding\s*:[^;}]+;?/gi, '/* -moz-binding stripped */'); }
  if (/(?<![a-z])javascript\s*:/i.test(out)) {
    out = out.replace(/(?<![a-z])javascript\s*:/gi, 'noop:');
  }
  return out;
};

// Document Builder Tier 2 — CSS contrast validator + auto-fixer
// Source: doc_pipeline_source.jsx ~line 2660 area (validateAndFixCssContrast)
const validateAndFixCssContrast = (cssText, options) => {
  options = options || {};
  const targetRatio = options.targetRatio || 4.5;
  const defaultAmbient = options.ambientBg || [255, 255, 255];
  if (!cssText || typeof cssText !== 'string') return { css: cssText || '', fixes: [], fixCount: 0 };
  const _hexToRgb = (hex) => {
    const h = String(hex || '').replace('#', '').trim();
    if (h.length === 3) return [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16)];
    if (h.length === 6) return [parseInt(h.substr(0,2),16), parseInt(h.substr(2,2),16), parseInt(h.substr(4,2),16)];
    return null;
  };
  const _rgbToHex = (r, g, b) => '#' + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
  const _luminance = (r, g, b) => {
    const [rs, gs, bs] = [r/255, g/255, b/255].map(c => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4));
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  const _contrastRatio = (rgb1, rgb2) => {
    const l1 = _luminance.apply(null, rgb1), l2 = _luminance.apply(null, rgb2);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const _named = {
    black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff',
    yellow: '#ffff00', cyan: '#00ffff', magenta: '#ff00ff', gray: '#808080', grey: '#808080',
    silver: '#c0c0c0', maroon: '#800000', olive: '#808000', purple: '#800080', teal: '#008080',
    navy: '#000080', orange: '#ffa500', pink: '#ffc0cb', gold: '#ffd700', lightgray: '#d3d3d3',
    lightgrey: '#d3d3d3', darkgray: '#a9a9a9', darkgrey: '#a9a9a9',
  };
  const _parseColor = (str) => {
    if (!str) return null;
    const s = String(str).trim().toLowerCase();
    if (s.startsWith('#')) return _hexToRgb(s);
    const rgbM = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgbM) return [parseInt(rgbM[1]), parseInt(rgbM[2]), parseInt(rgbM[3])];
    if (_named[s]) return _hexToRgb(_named[s]);
    return null;
  };
  const _fixToPass = (fgRgb, bgRgb, target) => {
    let [r, g, b] = fgRgb;
    const bgLum = _luminance(bgRgb[0], bgRgb[1], bgRgb[2]);
    const isDarkBg = bgLum < 0.18;
    for (let i = 0; i < 30; i++) {
      if (_contrastRatio([r, g, b], bgRgb) >= target) break;
      if (isDarkBg) {
        r = Math.min(255, Math.round(r + (255 - r) * 0.15));
        g = Math.min(255, Math.round(g + (255 - g) * 0.15));
        b = Math.min(255, Math.round(b + (255 - b) * 0.15));
      } else {
        r = Math.max(0, Math.round(r * 0.82));
        g = Math.max(0, Math.round(g * 0.82));
        b = Math.max(0, Math.round(b * 0.82));
      }
    }
    return [r, g, b];
  };
  const rules = [];
  let i = 0;
  const N = cssText.length;
  while (i < N) {
    while (i < N && /\s/.test(cssText[i])) i++;
    if (i >= N) break;
    if (cssText[i] === '@') {
      let j = i + 1;
      while (j < N && cssText[j] !== '{' && cssText[j] !== ';') j++;
      if (j >= N) break;
      if (cssText[j] === ';') { i = j + 1; continue; }
      let depth = 1;
      let k = j + 1;
      const innerStart = k;
      while (k < N && depth > 0) {
        if (cssText[k] === '{') depth++;
        else if (cssText[k] === '}') depth--;
        k++;
      }
      const innerCss = cssText.slice(innerStart, k - 1);
      let innerI = 0;
      while (innerI < innerCss.length) {
        while (innerI < innerCss.length && /\s/.test(innerCss[innerI])) innerI++;
        if (innerI >= innerCss.length) break;
        if (innerCss[innerI] === '@') { innerI++; continue; }
        const selStart = innerI;
        while (innerI < innerCss.length && innerCss[innerI] !== '{') innerI++;
        if (innerI >= innerCss.length) break;
        const selEnd = innerI;
        innerI++;
        const declStart = innerI;
        let d = 1;
        while (innerI < innerCss.length && d > 0) {
          if (innerCss[innerI] === '{') d++;
          else if (innerCss[innerI] === '}') d--;
          innerI++;
        }
        const declEnd = innerI - 1;
        rules.push({
          selectorStart: innerStart + selStart,
          selectorEnd: innerStart + selEnd,
          declStart: innerStart + declStart,
          declEnd: innerStart + declEnd,
        });
      }
      i = k;
      continue;
    }
    const selStart = i;
    while (i < N && cssText[i] !== '{' && cssText[i] !== '}') i++;
    if (i >= N) break;
    if (cssText[i] === '}') { i++; continue; }
    const selEnd = i;
    i++;
    const declStart = i;
    let depth = 1;
    while (i < N && depth > 0) {
      if (cssText[i] === '{') depth++;
      else if (cssText[i] === '}') depth--;
      i++;
    }
    const declEnd = i - 1;
    rules.push({ selectorStart: selStart, selectorEnd: selEnd, declStart, declEnd });
  }
  let ambientBg = defaultAmbient;
  for (const r of rules) {
    const sel = cssText.slice(r.selectorStart, r.selectorEnd).trim().toLowerCase();
    if (sel === 'body' || sel === 'html' || sel === 'html, body' || sel === 'body, html') {
      const decls = cssText.slice(r.declStart, r.declEnd);
      const bgM = /\bbackground(?:-color)?\s*:\s*([^;]+)/i.exec(decls);
      if (bgM) {
        const firstToken = bgM[1].trim().split(/\s+/)[0];
        const parsed = _parseColor(firstToken);
        if (parsed) { ambientBg = parsed; break; }
      }
    }
  }
  const fixes = [];
  let out = cssText;
  for (let r = rules.length - 1; r >= 0; r--) {
    const rule = rules[r];
    const selector = out.slice(rule.selectorStart, rule.selectorEnd).trim();
    const decls = out.slice(rule.declStart, rule.declEnd);
    const colorM = /(^|;)\s*color\s*:\s*([^;]+);?/i.exec(decls);
    if (!colorM) continue;
    const fgStr = colorM[2].trim();
    const fgRgb = _parseColor(fgStr);
    if (!fgRgb) continue;
    let bgRgb = ambientBg;
    const bgM = /(^|;)\s*background(?:-color)?\s*:\s*([^;]+);?/i.exec(decls);
    if (bgM) {
      const firstToken = bgM[2].trim().split(/\s+/)[0];
      const parsed = _parseColor(firstToken);
      if (parsed) bgRgb = parsed;
    }
    const ratio = _contrastRatio(fgRgb, bgRgb);
    if (ratio >= targetRatio) continue;
    const fixedRgb = _fixToPass(fgRgb, bgRgb, targetRatio);
    const fixedHex = _rgbToHex(fixedRgb[0], fixedRgb[1], fixedRgb[2]);
    if (fixedHex.toLowerCase() === fgStr.toLowerCase()) continue;
    fixes.push({
      selector: selector.slice(0, 60),
      prop: 'color',
      before: fgStr,
      after: fixedHex,
      ratio: Math.round(ratio * 10) / 10,
    });
    const before = out.slice(0, rule.declStart);
    const after = out.slice(rule.declEnd);
    const newDecls = decls.replace(colorM[0], colorM[0].replace(fgStr, fixedHex));
    out = before + newDecls + after;
  }
  return { css: out, fixes: fixes.reverse(), fixCount: fixes.length };
};

// Document Builder Tier 1.3 — preset migration
// Source: AlloFlowANTI.txt ~line 9991, _migrateExportPreset and the useState
// initializer. Test version takes the DEFAULT_EXPORT_CONFIG as a parameter
// rather than reading from closure.
const DEFAULT_EXPORT_CONFIG_FIXTURE = {
  includeAnalysis: false,
  includeLessonPlan: true,
  includeQuiz: true,
  glossaryDisplayMode: 'table',
  faqAccordion: true,
  fontSize: 16,
  // newly-added-in-v2 fields to simulate the migration story
  brandNewToggle: 'default-value',
};
const _EXPORT_PRESET_SCHEMA_VERSION_FIXTURE = 2;
const _migrateExportPreset = (preset, defaults) => {
  if (!preset || typeof preset !== 'object') return null;
  const cfg = preset.config && typeof preset.config === 'object' ? preset.config : {};
  return {
    name: preset.name || 'Untitled',
    emoji: preset.emoji || '💾',
    config: { ...defaults, ...cfg },
    theme: preset.theme || 'professional',
    format: preset.format || 'print',
    _schemaVersion: _EXPORT_PRESET_SCHEMA_VERSION_FIXTURE,
  };
};

// Extracted from runPdfAccessibilityAudit triangulated-result construction.
// In source: lambda inside the audit factory (~line 3673), uses outer
// issueFrequency map. Test version takes frequency as a parameter.
const _attachAgreement = (issues, issueFrequency) => (issues || []).map(issue => {
  const k = (issue.issue || '').toLowerCase().substring(0, 40);
  return { ...issue, auditorAgreement: issueFrequency[k] || 1 };
});

// Extracted from fixAndVerifyPdf issue-resolution diff (~line ~10268).
// In source: inline block computing _resolved/_persisted/_introduced.
// Test version takes the two flat issue arrays as parameters.
const _computeIssueResolution = (preFlat, postFlat) => {
  const _keyOf = (s) => (s || '').toLowerCase().substring(0, 40);
  const _postKeys = new Set((postFlat || []).map(i => _keyOf(i.issue)).filter(Boolean));
  const _preKeys = new Set((preFlat || []).map(i => _keyOf(i.issue)).filter(Boolean));
  const resolved = (preFlat || []).filter(i => { const k = _keyOf(i.issue); return k && !_postKeys.has(k); });
  const persisted = (preFlat || []).filter(i => { const k = _keyOf(i.issue); return k && _postKeys.has(k); });
  const introduced = (postFlat || []).filter(i => { const k = _keyOf(i.issue); return k && !_preKeys.has(k); });
  return { resolved, persisted, introduced };
};

// ═══════════════════════════════════════════════════════════════════════════
// Helpers for tests
// ═══════════════════════════════════════════════════════════════════════════

const bytes = (str) => new Uint8Array([...str].map(c => c.charCodeAt(0)));
const decode = (uint8) => Array.from(uint8).map(b => String.fromCharCode(b)).join('');

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('_stage4_maskStrings', () => {
  test('preserves length byte-for-byte', () => {
    const input = 'BT (hello) Tj ET';
    const masked = _stage4_maskStrings(input);
    assert.strictEqual(masked.length, input.length, 'length must be preserved for offset stability');
  });

  test('masks literal (...) strings with spaces', () => {
    const masked = _stage4_maskStrings('(secret)');
    assert.strictEqual(masked, '        ');
  });

  test('preserves dict brackets << and >>', () => {
    const masked = _stage4_maskStrings('<< /Type /Page >>');
    assert.strictEqual(masked, '<< /Type /Page >>');
  });

  test('masks hex <...> strings (single angle brackets)', () => {
    const masked = _stage4_maskStrings('<DEADBEEF>');
    assert.strictEqual(masked, '          ');
  });

  test('masks % comments to end of line', () => {
    const masked = _stage4_maskStrings('BT % this is a comment\nET');
    assert.ok(masked.startsWith('BT '));
    assert.ok(masked.endsWith('\nET'));
    assert.ok(!masked.includes('comment'));
  });

  test('handles escaped parens inside literal strings', () => {
    const input = '(say \\(hi\\) friend) Tj';
    const masked = _stage4_maskStrings(input);
    assert.strictEqual(masked.length, input.length);
    assert.ok(masked.endsWith('Tj'));
    assert.ok(!masked.includes('hi'));
  });

  test('handles nested parens (PDF supports them)', () => {
    const input = '(outer (inner) text) Tj';
    const masked = _stage4_maskStrings(input);
    assert.strictEqual(masked.length, input.length);
    assert.ok(masked.endsWith('Tj'));
  });

  test('BT inside a string is masked so parser does not false-match', () => {
    const input = '(this BT is text) Tj';
    const masked = _stage4_maskStrings(input);
    assert.ok(!masked.includes('BT'));
  });

  test('empty input returns empty string', () => {
    assert.strictEqual(_stage4_maskStrings(''), '');
  });
});

describe('_stage4_parseBTSegments', () => {
  test('finds a single BT...ET span', () => {
    const segments = _stage4_parseBTSegments(bytes('BT /F1 12 Tf (hi) Tj ET'));
    assert.strictEqual(segments.length, 1);
    assert.strictEqual(segments[0].btStart, 0);
  });

  test('finds multiple BT...ET spans', () => {
    const segments = _stage4_parseBTSegments(bytes('BT (a) Tj ET BT (b) Tj ET'));
    assert.strictEqual(segments.length, 2);
  });

  test('extracts Tm coordinates (5th and 6th args)', () => {
    const segments = _stage4_parseBTSegments(bytes('BT 1 0 0 1 72 100 Tm (hi) Tj ET'));
    assert.strictEqual(segments.length, 1);
    assert.strictEqual(segments[0].x, 72);
    assert.strictEqual(segments[0].y, 100);
  });

  test('extracts Td coordinates when no Tm', () => {
    const segments = _stage4_parseBTSegments(bytes('BT 50 75 Td (hi) Tj ET'));
    assert.strictEqual(segments.length, 1);
    assert.strictEqual(segments[0].x, 50);
    assert.strictEqual(segments[0].y, 75);
  });

  test('extracts TD (capital D) coordinates', () => {
    const segments = _stage4_parseBTSegments(bytes('BT 30 40 TD (hi) Tj ET'));
    assert.strictEqual(segments.length, 1);
    assert.strictEqual(segments[0].x, 30);
    assert.strictEqual(segments[0].y, 40);
  });

  test('Tm takes precedence over Td when both present', () => {
    const segments = _stage4_parseBTSegments(bytes('BT 50 75 Td 1 0 0 1 72 100 Tm (hi) Tj ET'));
    assert.strictEqual(segments[0].x, 72);
    assert.strictEqual(segments[0].y, 100);
  });

  test('handles negative + decimal coordinates', () => {
    const segments = _stage4_parseBTSegments(bytes('BT -12.5 200.75 Td (hi) Tj ET'));
    assert.strictEqual(segments[0].x, -12.5);
    assert.strictEqual(segments[0].y, 200.75);
  });

  test('ignores BT inside literal strings', () => {
    const segments = _stage4_parseBTSegments(bytes('(BT fake) Tj BT (real) Tj ET'));
    assert.strictEqual(segments.length, 1);
  });

  test('empty stream returns empty array', () => {
    assert.deepStrictEqual(_stage4_parseBTSegments(bytes('')), []);
  });

  test('stream without BT/ET returns empty array', () => {
    assert.deepStrictEqual(_stage4_parseBTSegments(bytes('/F1 12 Tf')), []);
  });

  test('segments include byte offsets (btStart, etEnd)', () => {
    const segments = _stage4_parseBTSegments(bytes('XXX BT (hi) Tj ET YYY'));
    assert.strictEqual(segments[0].btStart, 4);
    assert.strictEqual(segments[0].etEnd, 17); // "BT (hi) Tj ET" is 13 chars
  });
});

describe('_stage4_rewriteStream', () => {
  test('empty segments returns input unchanged', () => {
    const input = bytes('hello');
    const result = _stage4_rewriteStream(input, [], []);
    assert.strictEqual(decode(result), 'hello');
  });

  test('wraps single segment with BDC + EMC', () => {
    const input = bytes('BT (hi) Tj ET');
    const segments = [{ btStart: 0, etEnd: 13 }];
    const wraps = [{ bdc: '/P <</MCID 0>> BDC\n', emc: '\nEMC\n' }];
    const result = decode(_stage4_rewriteStream(input, segments, wraps));
    assert.ok(result.startsWith('/P <</MCID 0>> BDC\n'));
    assert.ok(result.endsWith('\nEMC\n'));
    assert.ok(result.includes('BT (hi) Tj ET'));
  });

  test('handles multiple segments — offsets preserved via reverse iteration', () => {
    const input = bytes('BT (a) Tj ET BT (b) Tj ET');
    const segments = [
      { btStart: 0, etEnd: 12 },
      { btStart: 13, etEnd: 25 },
    ];
    const wraps = [
      { bdc: '/H1 <</MCID 0>> BDC\n', emc: '\nEMC\n' },
      { bdc: '/P <</MCID 1>> BDC\n', emc: '\nEMC\n' },
    ];
    const result = decode(_stage4_rewriteStream(input, segments, wraps));
    assert.ok(result.includes('/H1 <</MCID 0>> BDC'), 'first wrap with H1');
    assert.ok(result.includes('/P <</MCID 1>> BDC'), 'second wrap with P');
    assert.ok(result.indexOf('/H1') < result.indexOf('/P'), 'order preserved');
  });

  test('uses default wrap when wraps[i] is missing', () => {
    const input = bytes('BT (hi) Tj ET');
    const segments = [{ btStart: 0, etEnd: 13 }];
    const result = decode(_stage4_rewriteStream(input, segments, []));
    assert.ok(result.includes('/P <</MCID 0>> BDC'), 'default wrap is /P');
  });

  test('returns Uint8Array', () => {
    const result = _stage4_rewriteStream(bytes('BT ET'), [{ btStart: 0, etEnd: 5 }], [{ bdc: 'X', emc: 'Y' }]);
    assert.ok(result instanceof Uint8Array);
  });
});

describe('_stage4_matchSegmentsToItems', () => {
  test('equal counts → index-order pairing', () => {
    const segs = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
    const items = [{ str: 'first' }, { str: 'second' }];
    const matched = _stage4_matchSegmentsToItems(segs, items);
    assert.strictEqual(matched[0].str, 'first');
    assert.strictEqual(matched[1].str, 'second');
  });

  test('unequal counts → nearest-neighbor fallback', () => {
    const segs = [{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 50, y: 50 }];
    const items = [{ x: 0, y: 0, str: 'A' }, { x: 100, y: 100, str: 'B' }];
    const matched = _stage4_matchSegmentsToItems(segs, items);
    assert.strictEqual(matched[0].str, 'A');
    assert.strictEqual(matched[1].str, 'B');
    // Third segment at (50,50) is equidistant — picks the first checked (A is at (0,0), dist=5000)
    assert.ok(['A', 'B'].includes(matched[2].str));
  });

  test('empty items returns default for each segment', () => {
    const matched = _stage4_matchSegmentsToItems([{ x: 0, y: 0 }], []);
    assert.strictEqual(matched.length, 1);
    assert.strictEqual(matched[0].str, '');
    assert.strictEqual(matched[0].fontScale, 12);
  });

  test('empty segments returns empty array', () => {
    assert.deepStrictEqual(_stage4_matchSegmentsToItems([], [{ x: 0, y: 0, str: 'X' }]), []);
  });

  test('nearest-neighbor picks closest by Euclidean distance', () => {
    const segs = [{ x: 100, y: 100 }];
    const items = [{ x: 0, y: 0, str: 'far' }, { x: 95, y: 95, str: 'near' }, { x: 200, y: 200, str: 'farther' }];
    const matched = _stage4_matchSegmentsToItems(segs, items);
    assert.strictEqual(matched[0].str, 'near');
  });
});

describe('_stage4_inferRole', () => {
  const outlineH1 = [{ role: 'H1', text: 'Introduction to Chemistry' }];

  test('matches outline → returns outline role', () => {
    const item = { str: 'Introduction to Chemistry', fontScale: 14 };
    assert.strictEqual(_stage4_inferRole(item, 12, outlineH1), 'H1');
  });

  test('outline match wins over font-scale heuristic', () => {
    // Item's font scale would put it at P (1.0× median), but outline matches H1
    const item = { str: 'Introduction to Chemistry', fontScale: 12 };
    assert.strictEqual(_stage4_inferRole(item, 12, outlineH1), 'H1');
  });

  test('font-scale ratio ≥1.6 → H1', () => {
    const item = { str: 'xx', fontScale: 20 };
    assert.strictEqual(_stage4_inferRole(item, 12, null), 'H1');
  });

  test('font-scale ratio ≥1.3 → H2', () => {
    const item = { str: 'xx', fontScale: 16 };
    assert.strictEqual(_stage4_inferRole(item, 12, null), 'H2');
  });

  test('font-scale ratio ≥1.1 → H3', () => {
    const item = { str: 'xx', fontScale: 14 };
    assert.strictEqual(_stage4_inferRole(item, 12, null), 'H3');
  });

  test('font-scale ratio ≤0.85 → Caption', () => {
    const item = { str: 'xx', fontScale: 9 };
    assert.strictEqual(_stage4_inferRole(item, 12, null), 'Caption');
  });

  test('default ratio (~1.0) → P', () => {
    const item = { str: 'xx', fontScale: 12 };
    assert.strictEqual(_stage4_inferRole(item, 12, null), 'P');
  });

  test('item text under 4 chars skips outline match (avoids false positives)', () => {
    const item = { str: 'ab', fontScale: 12 };
    assert.strictEqual(_stage4_inferRole(item, 12, outlineH1), 'P');
  });

  test('outline entry text under 4 chars is skipped', () => {
    const item = { str: 'long text here', fontScale: 12 };
    const outline = [{ role: 'H1', text: 'lo' }, { role: 'H2', text: 'long text here' }];
    assert.strictEqual(_stage4_inferRole(item, 12, outline), 'H2');
  });

  test('null/missing item returns P', () => {
    assert.strictEqual(_stage4_inferRole(null, 12, null), 'P');
    assert.strictEqual(_stage4_inferRole(undefined, 12, null), 'P');
  });

  test('case-insensitive outline matching', () => {
    const item = { str: 'INTRODUCTION TO CHEMISTRY', fontScale: 12 };
    assert.strictEqual(_stage4_inferRole(item, 12, outlineH1), 'H1');
  });
});

describe('_stage6b_normalizeArtifactText', () => {
  test('lowercases input', () => {
    assert.strictEqual(_stage6b_normalizeArtifactText('Hello World'), 'hello world');
  });

  test('collapses multiple whitespace runs', () => {
    assert.strictEqual(_stage6b_normalizeArtifactText('a   b\t\tc\n\nd'), 'a b c d');
  });

  test('trims leading/trailing whitespace', () => {
    assert.strictEqual(_stage6b_normalizeArtifactText('   hello   '), 'hello');
  });

  test('empty/null/undefined returns empty string', () => {
    assert.strictEqual(_stage6b_normalizeArtifactText(''), '');
    assert.strictEqual(_stage6b_normalizeArtifactText(null), '');
    assert.strictEqual(_stage6b_normalizeArtifactText(undefined), '');
  });
});

describe('_stage6b_detectArtifactHashes', () => {
  test('text appearing on ≥95% of pages is detected', () => {
    const pages = Array.from({ length: 10 }, () => [{ str: 'Page Header' }, { str: 'unique content' }]);
    const artifacts = _stage6b_detectArtifactHashes(pages);
    assert.ok(artifacts.has('page header'));
  });

  test('text appearing on <95% of pages not detected (default threshold)', () => {
    const pages = [
      [{ str: 'Maybe Header' }, { str: 'a' }],
      [{ str: 'Maybe Header' }, { str: 'b' }],
      [{ str: 'No Header' }, { str: 'c' }],
      [{ str: 'No Header' }, { str: 'd' }],
      [{ str: 'No Header' }, { str: 'e' }],
    ];
    const artifacts = _stage6b_detectArtifactHashes(pages);
    assert.ok(!artifacts.has('maybe header'));
  });

  test('returns empty set when fewer than minPages', () => {
    const pages = Array.from({ length: 3 }, () => [{ str: 'header' }]);
    const artifacts = _stage6b_detectArtifactHashes(pages);
    assert.strictEqual(artifacts.size, 0);
  });

  test('minPages override works', () => {
    const pages = Array.from({ length: 3 }, () => [{ str: 'header' }]);
    const artifacts = _stage6b_detectArtifactHashes(pages, { minPages: 2 });
    assert.ok(artifacts.has('header'));
  });

  test('threshold override works', () => {
    const pages = [
      [{ str: 'half' }], [{ str: 'half' }], [{ str: 'half' }],
      [{ str: 'other' }], [{ str: 'other' }], [{ str: 'other' }],
    ];
    const artifactsStrict = _stage6b_detectArtifactHashes(pages);
    assert.strictEqual(artifactsStrict.size, 0); // 50% < 95% default
    const artifactsLenient = _stage6b_detectArtifactHashes(pages, { threshold: 0.5 });
    assert.ok(artifactsLenient.has('half'));
    assert.ok(artifactsLenient.has('other'));
  });

  test('duplicate within same page counts as one hit (de-dupe per page)', () => {
    const pages = [
      [{ str: 'twice' }, { str: 'twice' }, { str: 'other' }],
      [{ str: 'once' }],
      [{ str: 'once' }],
      [{ str: 'once' }],
      [{ str: 'once' }],
    ];
    // 'twice' appears 2× on page 0 but only counts as 1 page-hit → 1/5 = 20%
    // 'once' appears on 4/5 pages → 80% — still below 95% default
    const artifacts = _stage6b_detectArtifactHashes(pages);
    assert.strictEqual(artifacts.size, 0);
    // With threshold 0.75: 'once' (80%) qualifies, 'twice' (20%) doesn't
    const artifactsLoose = _stage6b_detectArtifactHashes(pages, { threshold: 0.75 });
    assert.ok(artifactsLoose.has('once'));
    assert.ok(!artifactsLoose.has('twice'));
  });

  test('skips very short text (length < 2)', () => {
    const pages = Array.from({ length: 5 }, () => [{ str: 'x' }, { str: 'longer text' }]);
    const artifacts = _stage6b_detectArtifactHashes(pages);
    assert.ok(!artifacts.has('x'));
    assert.ok(artifacts.has('longer text'));
  });
});

describe('buildHtmlFromStructTree', () => {
  test('null structTree falls back to flat paragraphs', () => {
    const html = buildHtmlFromStructTree(null, 'first paragraph.\n\nsecond paragraph.');
    assert.strictEqual(html, '<p>first paragraph.</p>\n<p>second paragraph.</p>');
  });

  test('hasTags=false falls back to flat paragraphs', () => {
    const html = buildHtmlFromStructTree({ hasTags: false, headings: [] }, 'text');
    assert.strictEqual(html, '<p>text</p>');
  });

  test('empty headings array falls back', () => {
    const html = buildHtmlFromStructTree({ hasTags: true, headings: [] }, 'text');
    assert.strictEqual(html, '<p>text</p>');
  });

  test('no heading text matches → falls back to flat paragraphs', () => {
    const html = buildHtmlFromStructTree(
      { hasTags: true, headings: [{ level: 1, text: 'Nonexistent Heading' }] },
      'completely different body text'
    );
    // Source emits the standalone heading first, then NO _flatFallback because matchedAny is false
    // Actually re-read: matchedAny stays false, so the final return is _flatFallback().
    assert.strictEqual(html, '<p>completely different body text</p>');
  });

  test('heading matches → spliced at correct location', () => {
    const structTree = { hasTags: true, headings: [{ level: 1, text: 'Introduction' }] };
    const html = buildHtmlFromStructTree(structTree, 'Some preface. Introduction follows here.');
    assert.ok(html.includes('<h1>Introduction</h1>'), 'h1 emitted');
    // Some preface comes before heading
    assert.ok(html.indexOf('Some preface') < html.indexOf('<h1>'), 'preface before heading');
  });

  test('multiple headings spliced in order', () => {
    const structTree = {
      hasTags: true,
      headings: [
        { level: 1, text: 'Chapter One' },
        { level: 2, text: 'Section A' },
      ],
    };
    const html = buildHtmlFromStructTree(structTree, 'preamble Chapter One body Section A more body');
    assert.ok(html.indexOf('<h1>Chapter One</h1>') < html.indexOf('<h2>Section A</h2>'));
  });

  test('heading level clamped to 1-6', () => {
    const structTree = { hasTags: true, headings: [{ level: 99, text: 'Too Deep' }] };
    const html = buildHtmlFromStructTree(structTree, 'Too Deep');
    assert.ok(html.includes('<h6>'));
    assert.ok(!html.includes('<h99>'));
  });

  test('heading level clamped to ≥1', () => {
    const structTree = { hasTags: true, headings: [{ level: 0, text: 'Zero' }] };
    const html = buildHtmlFromStructTree(structTree, 'Zero');
    assert.ok(html.includes('<h1>'));
  });

  test('escapes HTML special characters in heading text', () => {
    const structTree = { hasTags: true, headings: [{ level: 1, text: 'A & B <script>' }] };
    const html = buildHtmlFromStructTree(structTree, 'A & B <script>');
    assert.ok(html.includes('&amp;'));
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(!html.includes('<script>'));
  });

  test('escapes HTML in body paragraphs too', () => {
    const html = buildHtmlFromStructTree(null, '<bad>tag</bad>');
    assert.ok(html.includes('&lt;bad&gt;'));
    assert.ok(!html.includes('<bad>'));
  });

  test('no fullText → emits headings standalone', () => {
    const structTree = { hasTags: true, headings: [{ level: 2, text: 'Solo' }] };
    const html = buildHtmlFromStructTree(structTree, '');
    assert.strictEqual(html, '<h2>Solo</h2>');
  });

  test('case-insensitive heading match', () => {
    const structTree = { hasTags: true, headings: [{ level: 1, text: 'Methods' }] };
    const html = buildHtmlFromStructTree(structTree, 'prose METHODS body');
    assert.ok(html.includes('<h1>Methods</h1>'), 'heading found despite case difference');
  });

  test('headings with no text are skipped', () => {
    const structTree = { hasTags: true, headings: [{ level: 1, text: '' }, { level: 1, text: 'Real' }] };
    const html = buildHtmlFromStructTree(structTree, 'Real heading');
    assert.ok(html.includes('<h1>Real</h1>'));
  });
});

describe('_attachAgreement', () => {
  test('attaches auditorAgreement from frequency map', () => {
    const issues = [{ issue: 'Missing alt text' }];
    const freq = { 'missing alt text': 3 };
    const result = _attachAgreement(issues, freq);
    assert.strictEqual(result[0].auditorAgreement, 3);
  });

  test('defaults to 1 when not in frequency map', () => {
    const issues = [{ issue: 'New unique issue' }];
    const result = _attachAgreement(issues, {});
    assert.strictEqual(result[0].auditorAgreement, 1);
  });

  test('preserves other issue fields', () => {
    const issues = [{ issue: 'X', wcag: '1.1.1', count: 5 }];
    const result = _attachAgreement(issues, { x: 2 });
    assert.strictEqual(result[0].wcag, '1.1.1');
    assert.strictEqual(result[0].count, 5);
  });

  test('empty issues returns empty array', () => {
    assert.deepStrictEqual(_attachAgreement([], { anything: 5 }), []);
  });

  test('null/undefined issues returns empty array', () => {
    assert.deepStrictEqual(_attachAgreement(null, {}), []);
    assert.deepStrictEqual(_attachAgreement(undefined, {}), []);
  });

  test('key derivation truncates to first 40 lowercase chars', () => {
    const longIssue = 'A'.repeat(50) + ' extra suffix';
    const issues = [{ issue: longIssue }];
    const truncKey = 'a'.repeat(40);
    const freq = { [truncKey]: 7 };
    const result = _attachAgreement(issues, freq);
    assert.strictEqual(result[0].auditorAgreement, 7);
  });
});

describe('_computeIssueResolution', () => {
  test('issues present in pre but not post are resolved', () => {
    const pre = [{ issue: 'Missing alt' }];
    const post = [];
    const { resolved, persisted, introduced } = _computeIssueResolution(pre, post);
    assert.strictEqual(resolved.length, 1);
    assert.strictEqual(persisted.length, 0);
    assert.strictEqual(introduced.length, 0);
  });

  test('issues in both pre and post are persisted', () => {
    const pre = [{ issue: 'Missing alt' }];
    const post = [{ issue: 'Missing alt' }];
    const { resolved, persisted, introduced } = _computeIssueResolution(pre, post);
    assert.strictEqual(resolved.length, 0);
    assert.strictEqual(persisted.length, 1);
    assert.strictEqual(introduced.length, 0);
  });

  test('issues only in post are newly introduced', () => {
    const pre = [];
    const post = [{ issue: 'New issue' }];
    const { resolved, persisted, introduced } = _computeIssueResolution(pre, post);
    assert.strictEqual(resolved.length, 0);
    assert.strictEqual(persisted.length, 0);
    assert.strictEqual(introduced.length, 1);
  });

  test('mixed scenario classifies each issue correctly', () => {
    const pre = [{ issue: 'Old A' }, { issue: 'Old B' }, { issue: 'Persists C' }];
    const post = [{ issue: 'Persists C' }, { issue: 'New D' }];
    const { resolved, persisted, introduced } = _computeIssueResolution(pre, post);
    assert.deepStrictEqual(resolved.map(i => i.issue).sort(), ['Old A', 'Old B']);
    assert.strictEqual(persisted[0].issue, 'Persists C');
    assert.strictEqual(introduced[0].issue, 'New D');
  });

  test('case-insensitive matching (same issue typed in different case is persisted)', () => {
    const pre = [{ issue: 'Missing Alt Text' }];
    const post = [{ issue: 'missing alt text' }];
    const { resolved, persisted } = _computeIssueResolution(pre, post);
    assert.strictEqual(persisted.length, 1);
    assert.strictEqual(resolved.length, 0);
  });

  test('empty inputs handled gracefully', () => {
    const { resolved, persisted, introduced } = _computeIssueResolution([], []);
    assert.strictEqual(resolved.length, 0);
    assert.strictEqual(persisted.length, 0);
    assert.strictEqual(introduced.length, 0);
  });

  test('null inputs handled gracefully', () => {
    const { resolved, persisted, introduced } = _computeIssueResolution(null, null);
    assert.strictEqual(resolved.length, 0);
    assert.strictEqual(persisted.length, 0);
    assert.strictEqual(introduced.length, 0);
  });

  test('issues with empty string keys are filtered out', () => {
    const pre = [{ issue: '' }, { issue: 'Valid' }];
    const post = [];
    const { resolved } = _computeIssueResolution(pre, post);
    assert.strictEqual(resolved.length, 1);
    assert.strictEqual(resolved[0].issue, 'Valid');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Integration-ish: parse → match → infer-role → rewrite pipeline smoke test
// ═══════════════════════════════════════════════════════════════════════════

describe('sanitizeCustomExportCSS (Document Builder Tier 1.1)', () => {
  test('empty/null/non-string input returns empty', () => {
    assert.strictEqual(sanitizeCustomExportCSS(''), '');
    assert.strictEqual(sanitizeCustomExportCSS(null), '');
    assert.strictEqual(sanitizeCustomExportCSS(undefined), '');
    assert.strictEqual(sanitizeCustomExportCSS(123), '');
  });

  test('passes safe CSS through unchanged', () => {
    const safe = 'body { color: #333; font-family: Inter; }\nh1 { font-size: 2rem; }';
    assert.strictEqual(sanitizeCustomExportCSS(safe), safe);
  });

  test('strips @import directives', () => {
    const dangerous = '@import url("https://evil.example/track.css");\nbody { color: red; }';
    const cleaned = sanitizeCustomExportCSS(dangerous);
    assert.ok(!cleaned.includes('@import url'));
    assert.ok(cleaned.includes('/* @import stripped'));
    assert.ok(cleaned.includes('body { color: red; }'), 'safe rule preserved');
  });

  test('strips expression() payload (legacy IE)', () => {
    const dangerous = 'body { width: expression(alert(1)); color: black; }';
    const cleaned = sanitizeCustomExportCSS(dangerous);
    // The dangerous payload alert(1) must be gone. The safety comment
    // /* expression() stripped */ legitimately mentions the keyword.
    assert.ok(!cleaned.includes('alert(1)'), 'inner payload removed');
    assert.ok(cleaned.includes('/* expression() stripped */'), 'safety comment present');
    assert.ok(cleaned.includes('color: black'), 'unrelated rules preserved');
  });

  test('neutralizes javascript: in url()', () => {
    const dangerous = 'body { background: url("javascript:alert(1)"); }';
    const cleaned = sanitizeCustomExportCSS(dangerous);
    assert.ok(!cleaned.includes('javascript:alert'));
    assert.ok(cleaned.includes('url("about:blank")'));
  });

  test('neutralizes vbscript: in url()', () => {
    const dangerous = 'body { cursor: url(vbscript:msgbox(1)); }';
    const cleaned = sanitizeCustomExportCSS(dangerous);
    assert.ok(!cleaned.includes('vbscript:'));
  });

  test('neutralizes data:text/html in url()', () => {
    const dangerous = 'body { background: url("data:text/html,<script>alert(1)</script>"); }';
    const cleaned = sanitizeCustomExportCSS(dangerous);
    assert.ok(!cleaned.includes('data:text/html'));
    assert.ok(cleaned.includes('url("about:blank")'));
  });

  test('preserves safe data: URLs (e.g., images)', () => {
    const safe = 'body { background: url("data:image/png;base64,iVBORw0KGgo="); }';
    const cleaned = sanitizeCustomExportCSS(safe);
    assert.ok(cleaned.includes('data:image/png'));
  });

  test('strips behavior: property (IE htc binding)', () => {
    const dangerous = '.target { behavior: url(xss.htc); color: black; }';
    const cleaned = sanitizeCustomExportCSS(dangerous);
    assert.ok(!cleaned.includes('behavior: url'));
  });

  test('strips -moz-binding (legacy Firefox XBL)', () => {
    const dangerous = '.target { -moz-binding: url("xss.xml#exploit"); }';
    const cleaned = sanitizeCustomExportCSS(dangerous);
    assert.ok(!cleaned.includes('-moz-binding:'));
  });

  test('neutralizes bare javascript: prefix anywhere', () => {
    const dangerous = '.x { content: "javascript:bad"; }';
    const cleaned = sanitizeCustomExportCSS(dangerous);
    assert.ok(!cleaned.includes('javascript:'));
  });

  test('case-insensitive: blocks @IMPORT and EXPRESSION()', () => {
    const dangerous = '@IMPORT url("evil.css");\n.x { width: EXPRESSION(alert(1)); }';
    const cleaned = sanitizeCustomExportCSS(dangerous);
    assert.ok(!cleaned.includes('@IMPORT'));
    assert.ok(!cleaned.includes('EXPRESSION('));
  });

  test('does not strip word fragments that contain "behavior"', () => {
    // The leading-anchor (^|[\s;{]) prevents stripping legitimate uses like
    // a class name `.misbehavior` (the word `behavior` inside an identifier).
    const safe = '.misbehavior-warning { color: red; }';
    const cleaned = sanitizeCustomExportCSS(safe);
    assert.ok(cleaned.includes('.misbehavior-warning'));
  });
});

describe('_migrateExportPreset (Document Builder Tier 1.3)', () => {
  test('returns null for invalid input', () => {
    assert.strictEqual(_migrateExportPreset(null, DEFAULT_EXPORT_CONFIG_FIXTURE), null);
    assert.strictEqual(_migrateExportPreset(undefined, DEFAULT_EXPORT_CONFIG_FIXTURE), null);
    assert.strictEqual(_migrateExportPreset('not an object', DEFAULT_EXPORT_CONFIG_FIXTURE), null);
  });

  test('stamps current schema version on migrated preset', () => {
    const oldPreset = { name: 'Old', config: { includeQuiz: false } };
    const migrated = _migrateExportPreset(oldPreset, DEFAULT_EXPORT_CONFIG_FIXTURE);
    assert.strictEqual(migrated._schemaVersion, _EXPORT_PRESET_SCHEMA_VERSION_FIXTURE);
  });

  test('preserves user-set values from old preset', () => {
    const oldPreset = { name: 'My Custom', config: { includeQuiz: false, includeLessonPlan: false } };
    const migrated = _migrateExportPreset(oldPreset, DEFAULT_EXPORT_CONFIG_FIXTURE);
    assert.strictEqual(migrated.config.includeQuiz, false);
    assert.strictEqual(migrated.config.includeLessonPlan, false);
  });

  test('fills in missing fields with defaults', () => {
    const oldPreset = { name: 'Pre-v2', config: { includeQuiz: false } };
    const migrated = _migrateExportPreset(oldPreset, DEFAULT_EXPORT_CONFIG_FIXTURE);
    assert.strictEqual(migrated.config.brandNewToggle, 'default-value');
    assert.strictEqual(migrated.config.glossaryDisplayMode, 'table');
    assert.strictEqual(migrated.config.faqAccordion, true);
  });

  test('idempotent: re-migrating a current preset produces the same result', () => {
    const preset = { name: 'Current', emoji: '⭐', config: { includeQuiz: true }, theme: 'professional', format: 'print', _schemaVersion: 2 };
    const m1 = _migrateExportPreset(preset, DEFAULT_EXPORT_CONFIG_FIXTURE);
    const m2 = _migrateExportPreset(m1, DEFAULT_EXPORT_CONFIG_FIXTURE);
    assert.deepStrictEqual(m1, m2);
  });

  test('tolerates missing config (uses defaults wholesale)', () => {
    const preset = { name: 'No Config' };
    const migrated = _migrateExportPreset(preset, DEFAULT_EXPORT_CONFIG_FIXTURE);
    assert.deepStrictEqual(migrated.config, DEFAULT_EXPORT_CONFIG_FIXTURE);
  });

  test('tolerates malformed config (uses defaults wholesale)', () => {
    const preset = { name: 'Bad Config', config: 'this is a string not an object' };
    const migrated = _migrateExportPreset(preset, DEFAULT_EXPORT_CONFIG_FIXTURE);
    assert.deepStrictEqual(migrated.config, DEFAULT_EXPORT_CONFIG_FIXTURE);
  });

  test('defaults theme and format when missing', () => {
    const preset = { name: 'Old' };
    const migrated = _migrateExportPreset(preset, DEFAULT_EXPORT_CONFIG_FIXTURE);
    assert.strictEqual(migrated.theme, 'professional');
    assert.strictEqual(migrated.format, 'print');
  });

  test('preserves theme + format when set', () => {
    const preset = { name: 'Custom', theme: 'highContrast', format: 'worksheet' };
    const migrated = _migrateExportPreset(preset, DEFAULT_EXPORT_CONFIG_FIXTURE);
    assert.strictEqual(migrated.theme, 'highContrast');
    assert.strictEqual(migrated.format, 'worksheet');
  });

  test('user-set fields win over defaults when both present', () => {
    const preset = { name: 'Override', config: { fontSize: 24, includeQuiz: false } };
    const migrated = _migrateExportPreset(preset, DEFAULT_EXPORT_CONFIG_FIXTURE);
    assert.strictEqual(migrated.config.fontSize, 24);
    assert.strictEqual(migrated.config.includeQuiz, false);
    // Untouched defaults still present
    assert.strictEqual(migrated.config.brandNewToggle, 'default-value');
  });
});

describe('validateAndFixCssContrast (Document Builder Tier 2)', () => {
  test('empty/null/non-string input returns safe output', () => {
    assert.deepStrictEqual(validateAndFixCssContrast(''), { css: '', fixes: [], fixCount: 0 });
    assert.deepStrictEqual(validateAndFixCssContrast(null), { css: '', fixes: [], fixCount: 0 });
    assert.deepStrictEqual(validateAndFixCssContrast(undefined), { css: '', fixes: [], fixCount: 0 });
  });

  test('safe palette (black on white) passes through unchanged', () => {
    const css = 'body { color: #000000; background: #ffffff; }';
    const result = validateAndFixCssContrast(css);
    assert.strictEqual(result.fixCount, 0);
    assert.strictEqual(result.css, css);
  });

  test('low-contrast color+background pair is auto-fixed', () => {
    // Light gray text on white background — contrast ~3.0:1, below 4.5:1
    const css = '.note { color: #aaaaaa; background: #ffffff; }';
    const result = validateAndFixCssContrast(css);
    assert.strictEqual(result.fixCount, 1);
    assert.strictEqual(result.fixes[0].prop, 'color');
    assert.ok(result.fixes[0].before === '#aaaaaa');
    assert.ok(result.fixes[0].after !== '#aaaaaa', 'color was changed');
    assert.ok(result.fixes[0].ratio < 4.5, 'pre-fix ratio recorded');
  });

  test('dark text on dark background auto-fixed by LIGHTENING the foreground', () => {
    const css = '.x { color: #333333; background: #222222; }';
    const result = validateAndFixCssContrast(css);
    assert.strictEqual(result.fixCount, 1);
    // After fix, the foreground should be lighter than #333 (closer to white)
    const newColor = result.fixes[0].after;
    assert.ok(parseInt(newColor.slice(1, 3), 16) > 0x33, 'red channel lightened');
  });

  test('color without background defaults to white ambient', () => {
    const css = '.x { color: #aaaaaa; }';
    const result = validateAndFixCssContrast(css);
    // #aaa on white fails 4.5:1, gets fixed
    assert.strictEqual(result.fixCount, 1);
  });

  test('body background changes the ambient for other rules', () => {
    // .x with white text would normally be unfixable (white on white-ambient)
    // but with body bg = dark navy, white text passes 4.5:1
    const css = 'body { background: #0f172a; } .x { color: #ffffff; }';
    const result = validateAndFixCssContrast(css);
    assert.strictEqual(result.fixCount, 0, 'white on dark navy passes — no fix needed');
  });

  test('multiple failing rules each get their own fix entry', () => {
    const css = `
      .a { color: #cccccc; background: #ffffff; }
      .b { color: #dddddd; background: #ffffff; }
    `;
    const result = validateAndFixCssContrast(css);
    assert.strictEqual(result.fixCount, 2);
    assert.ok(result.fixes.some(f => f.selector.includes('.a')));
    assert.ok(result.fixes.some(f => f.selector.includes('.b')));
  });

  test('@media wrappers do not break parsing', () => {
    const css = '@media (max-width: 600px) { .x { color: #cccccc; background: #ffffff; } } .y { color: #000; background: #fff; }';
    const result = validateAndFixCssContrast(css);
    // The .x rule inside @media should still be detected and fixed
    assert.ok(result.fixCount >= 1);
    assert.ok(result.fixes.some(f => f.selector.includes('.x')));
  });

  test('rgb() format parsed and fixed correctly', () => {
    const css = '.x { color: rgb(200, 200, 200); background: #ffffff; }';
    const result = validateAndFixCssContrast(css);
    assert.strictEqual(result.fixCount, 1);
    assert.strictEqual(result.fixes[0].before, 'rgb(200, 200, 200)');
  });

  test('named colors work (gray on white)', () => {
    const css = '.x { color: gray; background: white; }';
    const result = validateAndFixCssContrast(css);
    // gray on white = 3.95:1, below 4.5:1 — should fix
    assert.strictEqual(result.fixCount, 1);
  });

  test('preserves the rest of the CSS structurally (no rule corruption)', () => {
    const css = '.before { font-size: 14px; } .target { color: #aaa; background: #fff; } .after { padding: 10px; }';
    const result = validateAndFixCssContrast(css);
    assert.ok(result.css.includes('.before { font-size: 14px; }'));
    assert.ok(result.css.includes('.after { padding: 10px; }'));
  });

  test('unparseable color values are skipped (not crashed on)', () => {
    const css = '.x { color: linear-gradient(red, blue); background: #ffffff; }';
    const result = validateAndFixCssContrast(css);
    // Unparseable color → no fix attempted, no crash
    assert.strictEqual(result.fixCount, 0);
  });

  test('rule with no color declaration is skipped', () => {
    const css = '.x { background: #aaaaaa; padding: 10px; }';
    const result = validateAndFixCssContrast(css);
    assert.strictEqual(result.fixCount, 0);
  });

  test('custom target ratio (e.g., AAA 7:1) works', () => {
    // Dark gray on white passes AA (4.5:1, ratio ~12.6) — wait that already passes AAA too.
    // Use a medium gray that passes AA but fails AAA.
    const css = '.x { color: #767676; background: #ffffff; }'; // ratio ~4.54:1, passes AA, fails AAA (7:1)
    const aa = validateAndFixCssContrast(css, { targetRatio: 4.5 });
    assert.strictEqual(aa.fixCount, 0, 'passes AA');
    const aaa = validateAndFixCssContrast(css, { targetRatio: 7 });
    assert.strictEqual(aaa.fixCount, 1, 'fails AAA, fixed');
  });

  test('idempotent: re-validating fixed CSS produces no further fixes', () => {
    const css = '.x { color: #aaaaaa; background: #ffffff; }';
    const r1 = validateAndFixCssContrast(css);
    assert.strictEqual(r1.fixCount, 1);
    const r2 = validateAndFixCssContrast(r1.css);
    assert.strictEqual(r2.fixCount, 0, 'fixed CSS now passes — no more fixes needed');
  });

  test('fix record includes pre-fix ratio for telemetry', () => {
    const css = '.x { color: #aaaaaa; background: #ffffff; }';
    const result = validateAndFixCssContrast(css);
    assert.ok(typeof result.fixes[0].ratio === 'number');
    assert.ok(result.fixes[0].ratio < 4.5);
    assert.ok(result.fixes[0].ratio > 0);
  });

  test('selector text in fix record truncated to 60 chars', () => {
    const longSel = '.a-very-long-selector-that-keeps-going-and-going-and-going-past-sixty-chars';
    const css = `${longSel} { color: #aaa; background: #fff; }`;
    const result = validateAndFixCssContrast(css);
    assert.ok(result.fixes[0].selector.length <= 60);
  });
});

describe('integration: full stage 4 wrap pipeline on a synthetic content stream', () => {
  test('round trip — parse, match, infer, rewrite produces valid MCID wrapping', () => {
    // Build a fake content stream with two text objects
    const stream = bytes('BT 1 0 0 1 50 700 Tm (Chapter 1) Tj ET BT 1 0 0 1 50 600 Tm (Body text here.) Tj ET');
    const segments = _stage4_parseBTSegments(stream);
    assert.strictEqual(segments.length, 2);

    // Simulate pdf.js items at the same coords
    const items = [
      { str: 'Chapter 1', x: 50, y: 700, fontScale: 24 },
      { str: 'Body text here.', x: 50, y: 600, fontScale: 12 },
    ];
    const matched = _stage4_matchSegmentsToItems(segments, items);
    assert.strictEqual(matched[0].str, 'Chapter 1');

    // Infer roles
    const outline = [{ role: 'H1', text: 'Chapter 1' }];
    const roles = matched.map(it => _stage4_inferRole(it, 12, outline));
    assert.strictEqual(roles[0], 'H1');
    assert.strictEqual(roles[1], 'P');

    // Build wraps with proper MCIDs
    const wraps = roles.map((role, i) => ({
      bdc: '/' + role + ' <</MCID ' + i + '>> BDC\n',
      emc: '\nEMC\n',
    }));

    const rewritten = decode(_stage4_rewriteStream(stream, segments, wraps));
    assert.ok(rewritten.includes('/H1 <</MCID 0>> BDC'));
    assert.ok(rewritten.includes('/P <</MCID 1>> BDC'));
    assert.ok(rewritten.includes('(Chapter 1)'));
    assert.ok(rewritten.includes('(Body text here.)'));
    assert.ok(rewritten.indexOf('/H1') < rewritten.indexOf('/P'), 'wrap order preserved');
  });
});
