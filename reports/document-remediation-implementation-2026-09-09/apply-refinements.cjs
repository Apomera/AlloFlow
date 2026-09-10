const fs = require('node:fs');
const file = 'doc_pipeline_source.jsx';
let src = fs.readFileSync(file, 'utf8');
function change(old, next) { if (!src.includes(old)) throw Error('Missing anchor: ' + old.slice(0,100)); src = src.replace(old, next); }
change("    const sizeFloor = (opts && opts.sizeFloor) || 0.95;", "    const strictContent = !!(opts && opts.strictContent);\n    let readingInput = original, readingOutput = fixed;\n    const sizeFloor = (opts && opts.sizeFloor) || 0.95;");
change('    if (sizeRatio > sizeCeiling) {', String.raw`    // Accessibility metadata has its own bounded budget: useful alt text can
    // double a tiny document without adding source prose. Only quoted attributes
    // on actual tags qualify; oversized metadata still meets the normal ceiling.
    const withoutMetadata = markup => String(markup).replace(/<[a-z][\w:-]*\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi, tag =>
      tag.replace(/\s(?:alt|aria-label|aria-labelledby|aria-describedby|scope|lang)\s*=\s*(?:"[^"]{0,2048}"|'[^']{0,2048}')/gi, ''));
    const baseSize = withoutMetadata(original).length, newSize = withoutMetadata(fixed).length;
    const metadataGrowth = (fixed.length - newSize) - (original.length - baseSize);
    const metadataGrowthAllowed = metadataGrowth > 0 && metadataGrowth <= 65536
      && newSize <= Math.max(1, baseSize) * sizeCeiling;
    if (sizeRatio > sizeCeiling && !metadataGrowthAllowed) {`);
change('    // Reading-order WARN (H-4, audit 2026-06-23)', String.raw`    if (strictContent && fixed !== original) {
      // Source-preserving fixes have a stronger contract than intentional source
      // recovery/rewriting. Retargeting supplied missing passages stays opt-out.
      if (typeof DOMParser === 'undefined') return { accepted: false, reason: 'source-contract-uncheckable' };
      try {
        const parse = markup => {
          const fragment = /<(?:tr|td|th)\b/i.test(markup) && !/<table\b/i.test(markup);
          return new DOMParser().parseFromString(fragment ? '<table><tbody>' + markup + '</tbody></table>' : markup, 'text/html');
        };
        const before = parse(original), after = parse(fixed);
        const norm = s => String(s || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
        const tableGrid = doc => Array.from(doc.querySelectorAll('table')).map(table =>
          Array.from(table.querySelectorAll('tr')).filter(row => row.closest('table') === table).map(row =>
            Array.from(row.children).filter(cell => /^(TD|TH)$/.test(cell.tagName)).map(cell =>
              [norm(cell.textContent), cell.rowSpan, cell.colSpan])));
        const sourceTables = tableGrid(before);
        if (sourceTables.length && JSON.stringify(sourceTables) !== JSON.stringify(tableGrid(after))) {
          return { accepted: false, reason: 'table-content-changed' };
        }
        const destination = anchor => {
          const href = String(anchor.getAttribute('href') || '').trim();
          try { return /^https?:/i.test(href) ? new URL(href).href : href; } catch (_) { return href; }
        };
        const sourceLinks = Array.from(before.querySelectorAll('a[href]'));
        const sourceDestinations = new Set(sourceLinks.map(destination));
        // New local skip controls may be added, but every original anchor must
        // still have its destination. Changing an external link cannot erase it.
        for (const anchor of Array.from(after.querySelectorAll('a[href]'))) {
          const href = destination(anchor);
          if (!sourceDestinations.has(href) && /^#[^#]+$/.test(href)
              && /(?:^|\s)(?:skip-link|sr-only)(?:\s|$)/.test(anchor.className || '')
              && after.getElementById(href.slice(1))) anchor.remove();
        }
        const outputLinks = Array.from(after.querySelectorAll('a[href]'));
        if (JSON.stringify(sourceLinks.map(destination)) !== JSON.stringify(outputLinks.map(destination))) {
          return { accepted: false, reason: 'link-destination-changed' };
        }
        // Existing captions are source content. New captions can describe the
        // asset without their numbers being mistaken for invented source prose.
        for (const selector of ['figure', 'table']) {
          const a = Array.from(before.querySelectorAll(selector)), b = Array.from(after.querySelectorAll(selector));
          const caption = el => el && Array.from(el.children).find(n => /^(FIGCAPTION|CAPTION)$/.test(n.tagName));
          for (let i = 0; i < a.length; i++) {
            const ac = caption(a[i]), bc = caption(b[i]);
            if (ac && (!bc || norm(ac.textContent) !== norm(bc.textContent))) {
              return { accepted: false, reason: selector === 'figure' ? 'image-association-changed' : 'table-content-changed' };
            }
          }
        }
        for (const doc of [before, after]) {
          doc.querySelectorAll('script,style,noscript,template,figcaption,caption').forEach(el => el.remove());
          // Textual list markers are structural; single digits in prose are not.
          doc.querySelectorAll('li').forEach(li => {
            if (li.firstChild && li.firstChild.nodeType === 3) li.firstChild.nodeValue = li.firstChild.nodeValue.replace(/^\s*\d+[.)]\s+/, '');
          });
        }
        const numbers = doc => (String(doc.body.textContent || '').match(/[+\-−]?\s*\d+(?:[.,]\d+)*(?:\s*(?:%|°\s*[CF]))?/g) || []).map(value => {
          const compact = value.replace(/\s+/g, '').replace(/−/g, '-');
          return compact.replace(/^[+\-]?\d+(?:[.,]\d+)*/, token => {
            const clean = /^[-+]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(token) ? token.replace(/,/g, '') : token;
            return Number.isFinite(Number(clean)) ? (clean[0] === '+' ? '+' : '') + String(Number(clean)) : clean;
          });
        });
        if (JSON.stringify(numbers(before)) !== JSON.stringify(numbers(after))) {
          return { accepted: false, reason: 'source-value-changed' };
        }
        // Anchor labels can become descriptive without authorizing href changes.
        sourceLinks.forEach((anchor, index) => { anchor.textContent = ' alloflowlink' + index + ' '; });
        outputLinks.forEach((anchor, index) => { anchor.textContent = ' alloflowlink' + index + ' '; });
        const imageContext = doc => {
          const media = Array.from(doc.querySelectorAll('img,image,source'));
          media.forEach((el, index) => el.replaceWith(doc.createTextNode(' ALLOFLOWFIGURE' + index + ' ')));
          const text = norm(doc.body.textContent);
          return media.map((_, index) => {
            const marker = 'ALLOFLOWFIGURE' + index, at = text.indexOf(marker);
            return [text.slice(0, at).split(/\s+/).filter(Boolean).slice(-12).join(' '),
              text.slice(at + marker.length).split(/\s+/).filter(Boolean).slice(0, 12).join(' ')];
          });
        };
        if (JSON.stringify(imageContext(before)) !== JSON.stringify(imageContext(after))) {
          return { accepted: false, reason: 'image-association-changed' };
        }
        readingInput = before.body.innerHTML;
        readingOutput = after.body.innerHTML;
      } catch (_) { return { accepted: false, reason: 'source-contract-uncheckable' }; }
    }
    // Reading-order WARN (H-4, audit 2026-06-23)`);
change('try { var _ro = checkReadingOrderPreserved(original, fixed);', 'try { var _ro = checkReadingOrderPreserved(readingInput, readingOutput);');
change('    // Content-fabrication (hallucination) signal — WARN-ONLY, faithful path only.', "    if (strictContent && _roWarn) return { accepted: false, reason: 'source-reading-order-changed' };\n    // Content-fabrication (hallucination) signal — WARN-ONLY, faithful path only.");
change('        const _fab = detectFabrication(fixed, original, opts);', "        const _fab = detectFabrication(readingOutput, readingInput, opts);\n        if (strictContent && _fab && _fab.suspected) return { accepted: false, reason: 'source-content-added' };");
change("acceptFixedHtmlDetailed(candidate, input, { fragment, mode: 'faithful' })", "acceptFixedHtmlDetailed(candidate, input, { fragment, mode: 'faithful', strictContent: true })");
fs.writeFileSync(file, src);
const reasons = {
 'table-content-changed': 'Table values, cells, or spans changed; the original table was retained.',
 'source-value-changed': 'A source number, sign, or unit changed or was added; the original content was retained.',
 'link-destination-changed': 'A link destination or link order changed; the original links were retained.',
 'image-association-changed': 'An image moved relative to its source content or caption; the original placement was retained.',
 'source-reading-order-changed': 'Source wording or reading order changed; the original content was retained.',
 'source-content-added': 'The suggestion added unsupported source content; the original was retained.',
 'source-contract-uncheckable': 'Source preservation could not be checked; the original content was retained.'
};
let review = fs.readFileSync('remediation_review_helpers.js','utf8');
review = review.replace("    'content-not-preserved':", Object.entries(reasons).map(([key, value]) => '    ' + JSON.stringify(key) + ': ' + JSON.stringify(value) + ',').join('\n') + "\n    'content-not-preserved':");
fs.writeFileSync('remediation_review_helpers.js', review);
let verification = fs.readFileSync('desktop/mcp/remediation_verification.cjs','utf8');
verification = verification.replace("'invalid-json-wrapper', 'content-not-preserved']", "'invalid-json-wrapper', " + Object.keys(reasons).map(x => JSON.stringify(x)).join(', ') + ", 'content-not-preserved']");
fs.writeFileSync('desktop/mcp/remediation_verification.cjs', verification);
console.log('Applied source-preservation contract and canonical rejection reasons.');
