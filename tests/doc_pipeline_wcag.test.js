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
