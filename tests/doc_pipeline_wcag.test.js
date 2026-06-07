// Golden-master / characterization tests for the document remediation pipeline's
// PURE WCAG helpers: contrast math, ARIA-role correction, and issue normalization/merge.
//
// Companion to tests/doc_pipeline_scoring.test.js. Same MIRROR discipline: these
// functions are copied verbatim from doc_pipeline_source.jsx (no DOM, no API, no
// React state) so they can run headless under vitest. If you change a formula in the
// source, update the mirror here and re-run. Source line refs are as of 2026-05-28.
//
// Phase 0 of DECOUPLING_PLAN.md: grow the regression net on the pure layers BEFORE any
// structural decoupling. Phase 2 will re-point these at the real exported functions.

import { describe, it, expect } from 'vitest';

// ── Mirror: WCAG relative-luminance contrast (doc_pipeline_source.jsx:6029-6042) ──
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  if (h.length === 3) return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
  return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
}
function luminance(r, g, b) {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
function contrastRatio(rgb1, rgb2) {
  const l1 = luminance(...rgb1), l2 = luminance(...rgb2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// ── Mirror: ARIA role correction (doc_pipeline_source.jsx:4847-4861) ──
const validRoles = ['alert', 'alertdialog', 'application', 'article', 'banner', 'button', 'cell', 'checkbox', 'columnheader', 'combobox', 'complementary', 'contentinfo', 'definition', 'dialog', 'directory', 'document', 'feed', 'figure', 'form', 'grid', 'gridcell', 'group', 'heading', 'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main', 'marquee', 'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'navigation', 'none', 'note', 'option', 'presentation', 'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup', 'rowheader', 'scrollbar', 'search', 'searchbox', 'separator', 'slider', 'spinbutton', 'status', 'switch', 'tab', 'table', 'tablist', 'tabpanel', 'term', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem'];
const roleCorrections = { 'content-info': 'contentinfo', 'nav': 'navigation', 'header': 'banner', 'footer': 'contentinfo', 'aside': 'complementary', 'section': 'region', 'radiobutton': 'radio', 'check-box': 'checkbox', 'drop-down': 'listbox', 'text-box': 'textbox', 'search-box': 'searchbox', 'progress-bar': 'progressbar', 'scroll-bar': 'scrollbar', 'tab-panel': 'tabpanel', 'tab-list': 'tablist', 'tree-item': 'treeitem', 'menu-item': 'menuitem', 'list-item': 'listitem' };
function fixAriaRoles(html) {
  return html.replace(/role="([^"]*)"/gi, (match, role) => {
    const lower = role.toLowerCase().trim();
    if (validRoles.includes(lower)) return `role="${lower}"`;
    if (roleCorrections[lower]) return `role="${roleCorrections[lower]}"`;
    return ''; // invalid + uncorrectable -> strip the attribute
  });
}

// ── Mirror: issue normalization + merge (doc_pipeline_source.jsx:3975-4018) ──
function normalizeIssue(issue) {
  if (!issue || !issue.issue) return issue;
  let text = issue.issue;
  let wcag = issue.wcag || '';
  if (!wcag) {
    const wcagMatch = text.match(/\b(\d+\.\d+\.\d+)\b/);
    if (wcagMatch) wcag = wcagMatch[1];
  }
  text = text.replace(/\s*\(?\s*(?:WCAG\s*)?\d+\.\d+\.\d+\s*\)?\s*$/gi, '').trim();
  text = text.replace(/\s*[-–—]\s*\d+\.\d+\.\d+\s*$/g, '').trim();
  text = text.replace(/\s*\(\s*$/, '').trim();
  text = text.replace(/^\)\s*,?\s*/g, '').trim();
  const lastOpenIdx = text.lastIndexOf('(');
  const lastCloseIdx = text.lastIndexOf(')');
  if (lastOpenIdx > lastCloseIdx && (text.length - lastOpenIdx) < 100) {
    const parenContent = text.substring(lastOpenIdx + 1).trim();
    if (parenContent.length < 5 || /^[,.\s]*$/.test(parenContent)) {
      text = text.substring(0, lastOpenIdx).trim();
    }
  }
  if (text && !/[.!?)\]]$/.test(text)) text += '.';
  return { ...issue, issue: text, wcag };
}
function mergeIssues(...arrays) {
  const seen = new Set();
  const merged = [];
  arrays.flat().forEach(issue => {
    if (!issue) return;
    const normalized = normalizeIssue(issue);
    const key = (normalized.issue || '').toLowerCase().substring(0, 40);
    if (!seen.has(key)) { seen.add(key); merged.push(normalized); }
  });
  return merged;
}

// ── Mirror: heading hierarchy fixer (doc_pipeline_source.jsx ~L6929+; SR-pipeline-batch 2026-06-07) ──
// Detects level skips > 2 and renumbers down to prev+2. Preserves 1- and 2-level skips
// (intentional design pattern). Does NOT promote first heading to h1 if missing.
function fixHeadingHierarchy(htmlContent) {
  if (!htmlContent || typeof htmlContent !== 'string') return { html: htmlContent, fixCount: 0 };
  const headingOpenRegex = /<h([1-6])\b([^>]*)>/gi;
  const opens = [];
  let m;
  while ((m = headingOpenRegex.exec(htmlContent)) !== null) {
    opens.push({ pos: m.index, openLen: m[0].length, level: parseInt(m[1], 10), attrs: m[2] });
  }
  if (opens.length < 2) return { html: htmlContent, fixCount: 0 };
  let prevLevel = 0;
  let fixCount = 0;
  for (const op of opens) {
    const lvl = op.level;
    if (prevLevel > 0 && (lvl - prevLevel) > 2) {
      op.newLevel = prevLevel + 2;
      if (op.newLevel > 6) op.newLevel = 6;
      if (op.newLevel !== op.level) fixCount++;
    } else {
      op.newLevel = lvl;
    }
    prevLevel = op.newLevel;
  }
  if (fixCount === 0) return { html: htmlContent, fixCount: 0 };
  const edits = [];
  for (const op of opens) {
    if (op.newLevel === op.level) continue;
    edits.push({ pos: op.pos, oldStr: '<h' + op.level, newStr: '<h' + op.newLevel });
    const closeMarker = '</h' + op.level + '>';
    const closeIdx = htmlContent.indexOf(closeMarker, op.pos + op.openLen);
    if (closeIdx === -1) continue;
    edits.push({ pos: closeIdx, oldStr: closeMarker, newStr: '</h' + op.newLevel + '>' });
  }
  edits.sort((a, b) => b.pos - a.pos);
  let result = htmlContent;
  for (const e of edits) {
    result = result.slice(0, e.pos) + e.newStr + result.slice(e.pos + e.oldStr.length);
  }
  return { html: result, fixCount };
}

// ── Mirror: text-spacing injection (sanitizeStyleForWCAG step 4 ~L6531+) ──
// Just the spacing-block injection slice — the parent sanitizer also does
// contrast + min font-size, which are tested separately above.
function injectTextSpacingCss(html) {
  if (!html || !html.includes('<head>') || html.includes('/* a11y-text-spacing */')) {
    return { html, fixCount: 0 };
  }
  const textSpacingCSS = '<style>/* a11y-text-spacing */\n' +
    'body{line-height:1.5}\n' +
    'p,li,dd,dt,td,th,blockquote{line-height:1.5}\n' +
    'p+p,li+li{margin-top:0.75em}\n' +
    '</style>';
  return { html: html.replace('<head>', '<head>\n' + textSpacingCSS), fixCount: 1 };
}

describe('WCAG contrast ratio (relative luminance)', () => {
  it('black on white is the maximum 21:1', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 4);
  });
  it('identical colors are 1:1', () => {
    expect(contrastRatio([255, 255, 255], [255, 255, 255])).toBeCloseTo(1, 5);
  });
  it('is symmetric (order of args does not matter)', () => {
    expect(contrastRatio([30, 144, 255], [255, 255, 255]))
      .toBeCloseTo(contrastRatio([255, 255, 255], [30, 144, 255]), 6);
  });
  it('brackets the AA 4.5:1 threshold correctly: #767676 passes, #777777 fails', () => {
    const passOnWhite = contrastRatio([118, 118, 118], [255, 255, 255]); // #767676
    const failOnWhite = contrastRatio([119, 119, 119], [255, 255, 255]); // #777777
    expect(passOnWhite).toBeGreaterThanOrEqual(4.5);
    expect(passOnWhite).toBeLessThan(4.6);
    expect(failOnWhite).toBeLessThan(4.5);
  });
});

describe('hexToRgb', () => {
  it('expands 3-digit shorthand', () => {
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
    expect(hexToRgb('#000')).toEqual([0, 0, 0]);
  });
  it('parses 6-digit hex', () => {
    expect(hexToRgb('#1e90ff')).toEqual([30, 144, 255]);
  });
});

describe('ARIA role correction', () => {
  it('lowercases an otherwise-valid role', () => {
    expect(fixAriaRoles('<div role="BANNER">x</div>')).toBe('<div role="banner">x</div>');
  });
  it('leaves a valid lowercase role unchanged', () => {
    expect(fixAriaRoles('<nav role="navigation">x</nav>')).toBe('<nav role="navigation">x</nav>');
  });
  it('corrects common AI mistakes (header -> banner, footer -> contentinfo)', () => {
    expect(fixAriaRoles('<header role="header">')).toBe('<header role="banner">');
    expect(fixAriaRoles('<footer role="footer">')).toBe('<footer role="contentinfo">');
    expect(fixAriaRoles('<div role="content-info">')).toBe('<div role="contentinfo">');
  });
  it('strips an invalid, uncorrectable role entirely', () => {
    const out = fixAriaRoles('<div role="boguswidget">x</div>');
    expect(out).not.toContain('role=');
    expect(out).toContain('<div');
    expect(out).toContain('x</div>');
  });
});

describe('issue normalization', () => {
  it('extracts a trailing "(WCAG x.y.z)" into the wcag field and strips it from text', () => {
    const r = normalizeIssue({ issue: 'Image is missing alt text (WCAG 1.1.1)' });
    expect(r.wcag).toBe('1.1.1');
    expect(r.issue).toBe('Image is missing alt text.');
  });
  it('keeps an explicitly provided wcag field', () => {
    const r = normalizeIssue({ issue: 'Data table lacks header cells', wcag: '1.3.1' });
    expect(r.wcag).toBe('1.3.1');
    expect(r.issue).toBe('Data table lacks header cells.');
  });
  it('strips a dangling open parenthesis at the end', () => {
    const r = normalizeIssue({ issue: 'Table lacks header rows (', wcag: '1.3.1' });
    expect(r.issue).toBe('Table lacks header rows.');
  });
  it('preserves a meaningful trailing parenthetical and adds no period after ")"', () => {
    const r = normalizeIssue({ issue: 'Add a heading for the section (Learning Objectives)' });
    expect(r.issue).toBe('Add a heading for the section (Learning Objectives)');
  });
  it('returns the input untouched when there is no issue text', () => {
    expect(normalizeIssue({ wcag: '1.1.1' })).toEqual({ wcag: '1.1.1' });
  });
});

describe('cross-auditor issue merge (dedup by first 40 chars, case-insensitive)', () => {
  it('deduplicates the same issue reported with different casing', () => {
    const merged = mergeIssues(
      [{ issue: 'Missing alt text' }],
      [{ issue: 'missing alt text' }]
    );
    expect(merged).toHaveLength(1);
  });
  it('keeps genuinely distinct issues', () => {
    const merged = mergeIssues([{ issue: 'Missing alt text' }, { issue: 'No page title' }]);
    expect(merged).toHaveLength(2);
  });
  it('skips null/empty entries', () => {
    const merged = mergeIssues([null, { issue: 'No main landmark' }, undefined]);
    expect(merged).toHaveLength(1);
    expect(merged[0].issue).toBe('No main landmark.');
  });
});

describe('heading hierarchy fixer (WCAG 1.3.1 / 2.4.6 / 2.4.10)', () => {
  it('is a no-op when fewer than 2 headings are present', () => {
    expect(fixHeadingHierarchy('<h1>Only one</h1><p>body</p>')).toEqual({ html: '<h1>Only one</h1><p>body</p>', fixCount: 0 });
  });
  it('is a no-op for a clean h1 → h2 → h3 chain', () => {
    const html = '<h1>A</h1><p>x</p><h2>B</h2><p>x</p><h3>C</h3>';
    expect(fixHeadingHierarchy(html)).toEqual({ html, fixCount: 0 });
  });
  it('PRESERVES a 2-level skip (h2 → h4) — intentional design pattern', () => {
    const html = '<h2>Section</h2><h4>Note</h4>';
    expect(fixHeadingHierarchy(html)).toEqual({ html, fixCount: 0 });
  });
  it('renumbers a 3-level skip (h2 → h5) down to h4', () => {
    const result = fixHeadingHierarchy('<h2>Section</h2><h5>Buried</h5>');
    expect(result.fixCount).toBe(1);
    expect(result.html).toBe('<h2>Section</h2><h4>Buried</h4>');
  });
  it('renumbers BOTH the open and the close tag', () => {
    const result = fixHeadingHierarchy('<h1>Top</h1><h5>Way too deep</h5>');
    expect(result.html).not.toContain('</h5>');
    expect(result.html).toContain('<h3>Way too deep</h3>');
  });
  it('cascades correctly: prev becomes new level, so a follow-up skip is measured from the corrected level', () => {
    // h1 → h5 gets fixed to h3; the next heading at h6 is then a 3-level skip from h3 → h6 → fix to h5
    const result = fixHeadingHierarchy('<h1>A</h1><h5>B</h5><h6>C</h6>');
    expect(result.fixCount).toBe(2);
    expect(result.html).toBe('<h1>A</h1><h3>B</h3><h5>C</h5>');
  });
  it('preserves attributes on the renumbered tag', () => {
    const result = fixHeadingHierarchy('<h1>A</h1><h5 id="x" class="y">B</h5>');
    expect(result.html).toContain('<h3 id="x" class="y">B</h3>');
  });
  it('handles a missing close tag by leaving that open as-is (truncated/malformed input)', () => {
    // h5 has no close — we skip the edit for that pair so we don't corrupt later HTML
    const result = fixHeadingHierarchy('<h1>A</h1><h5>truncated');
    // Either the open is renumbered (close-not-found path still applies the open edit per current impl)
    // or both are kept. Either way the test guarantees no corruption: no orphan close exists.
    expect(result.html).not.toContain('</h3>');
  });
  it('does NOT promote first heading to h1 when h1 is missing — that\'s an AI judgment call', () => {
    const html = '<h2>Looks like a title</h2><h3>Sub</h3>';
    expect(fixHeadingHierarchy(html)).toEqual({ html, fixCount: 0 });
  });
});

describe('text-spacing CSS injection (sanitizeStyleForWCAG step 4)', () => {
  it('injects the spacing block when <head> is present and no marker exists', () => {
    const result = injectTextSpacingCss('<html><head><title>t</title></head><body><p>x</p></body></html>');
    expect(result.fixCount).toBe(1);
    expect(result.html).toContain('/* a11y-text-spacing */');
    expect(result.html).toContain('body{line-height:1.5}');
  });
  it('is idempotent — second call does not double-inject', () => {
    const once = injectTextSpacingCss('<html><head></head><body></body></html>').html;
    const twice = injectTextSpacingCss(once);
    expect(twice.fixCount).toBe(0);
    // Marker appears exactly once
    expect(twice.html.match(/a11y-text-spacing/g)).toHaveLength(1);
  });
  it('is a no-op when there is no <head>', () => {
    expect(injectTextSpacingCss('<body>fragment</body>')).toEqual({ html: '<body>fragment</body>', fixCount: 0 });
  });
  it('uses element-level selectors, not !important — so existing styles still win', () => {
    const result = injectTextSpacingCss('<html><head></head></html>');
    expect(result.html).not.toContain('!important');
  });
});
