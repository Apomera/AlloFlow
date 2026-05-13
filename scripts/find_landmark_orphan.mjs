#!/usr/bin/env node
// Probe the live AlloFlow DOM to find content inside #root that isn't
// contained by a landmark — drives the axe-core `region` rule violation.
import { chromium } from 'playwright';

const URL = process.argv[2] || 'https://prismflow-911fe.web.app';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
console.log('[probe] loading:', URL);
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000); // let React render

const orphans = await page.evaluate(() => {
  // Anything that "is a landmark" — semantic tag OR landmark role.
  const LANDMARK_TAGS = new Set(['MAIN', 'NAV', 'HEADER', 'FOOTER', 'ASIDE', 'SECTION']);
  // Note: <section> only counts if it has an accessible name (aria-label or aria-labelledby).
  const LANDMARK_ROLES = new Set(['main', 'navigation', 'banner', 'contentinfo', 'complementary', 'region', 'search', 'form']);

  function isLandmark(el) {
    if (!el || el.nodeType !== 1) return false;
    if (LANDMARK_TAGS.has(el.tagName)) {
      // <section> requires accessible name
      if (el.tagName === 'SECTION') {
        return !!(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'));
      }
      return true;
    }
    const role = (el.getAttribute('role') || '').toLowerCase();
    return LANDMARK_ROLES.has(role);
  }

  function hasLandmarkAncestor(el) {
    let p = el.parentElement;
    while (p && p.id !== 'root') {
      if (isLandmark(p)) return true;
      p = p.parentElement;
    }
    return false;
  }

  // Walk depth-first under #root. Find any "leaf with text content" or any
  // visible block-level element that is NOT inside a landmark.
  const root = document.getElementById('root');
  if (!root) return ['#root not found'];

  const orphanElements = [];
  const seen = new Set();
  function walk(el) {
    if (!el || el.nodeType !== 1) return;
    if (isLandmark(el)) return; // descending into a landmark — skip
    // If el has any text content directly OR is a leaf block element, consider it a candidate.
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE') return;
    // Skip elements with no descendants and no text content (purely structural empty wrappers)
    if (!el.firstChild) return;
    // If this element has DIRECT text content (not just whitespace), it's an orphan candidate
    let hasOwnText = false;
    for (const c of el.childNodes) {
      if (c.nodeType === 3 && c.textContent.trim().length > 0) { hasOwnText = true; break; }
    }
    if (hasOwnText && !hasLandmarkAncestor(el)) {
      // Build a CSS-ish selector for this element
      const id = el.id ? '#' + el.id : '';
      const cls = el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
      const sel = el.tagName.toLowerCase() + id + cls;
      const sample = (el.textContent || '').trim().slice(0, 80);
      const outerSlice = el.outerHTML.slice(0, 220);
      const key = sel + '|' + sample;
      if (!seen.has(key)) {
        seen.add(key);
        orphanElements.push({ selector: sel, sample, outer: outerSlice });
      }
    }
    for (const c of el.children) walk(c);
  }
  walk(root);
  return orphanElements;
});

console.log('[probe] found', orphans.length, 'orphan elements with direct text outside any landmark:');
orphans.slice(0, 30).forEach((o, i) => {
  console.log('---');
  console.log('  #' + (i + 1), o.selector);
  console.log('  text:', JSON.stringify(o.sample));
  console.log('  html:', o.outer);
});

await browser.close();
