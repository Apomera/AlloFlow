// Generic fixer for fix-pass fragments (v3): detects the table cell style used by the document
// (border colour varies per run), converts first-column row labels to <th scope="row"> for
// tables whose caption is in the row-label set, wraps the banner in <header>, demotes a second
// h1, and marks English UI strings in a non-English document. Idempotent; everything else stays
// byte-identical.
//   node fix_fragments3.cjs <run-file> <prompt-prefix> <request-id-prefix> <out-batch> [--rtl] ids...
const fs = require('node:fs');
const here = __dirname;
const args = process.argv.slice(2);
const [runFile, promptPrefix, ridPrefix, outFile] = args;
const rtl = args.includes('--rtl');
const ids = args.slice(4).filter((a) => !a.startsWith('--'));
const run = fs.readFileSync(runFile, 'utf8').trim();
const ROW_LABEL_CAPTIONS = [/^Item 1, lines A and B/, /^Medical and dental expense computation/, /^Schedule J:/, /^Schedule K:/, /^Dependents:/, /^Income lines/, /^Tax and credits lines/, /^Payments and refundable credits lines/, /^Refund lines/, /^Amount you owe lines/];
const ONLY_ROWS = { 'Item 2: wages': ['Enter totals here'], 'Schedule F:': ['1. Totals'] };

function fixTables(html) {
  let n = 0;
  html = html.replace(/<table[\s\S]*?<\/table>/g, (table) => {
    const cap = /<caption[^>]*>([\s\S]*?)<\/caption>/.exec(table); const caption = cap ? cap[1] : '';
    const all = ROW_LABEL_CAPTIONS.some((re) => re.test(caption)); const only = Object.entries(ONLY_ROWS).find(([k]) => caption.startsWith(k));
    if (!all && !only) return table;
    const tdMatch = /<td style="(border:1px solid #[0-9a-fA-F]{6};padding:8px 12px)">/.exec(table);
    if (!tdMatch) return table;
    const TD = '<td style="' + tdMatch[1] + '">';
    const TH = '<th scope="row" style="' + tdMatch[1] + ';font-weight:bold;text-align:left">';
    return table.replace(/<tbody>([\s\S]*?)<\/tbody>/, (m, body) => '<tbody>' + body.replace(/<tr>([\s\S]*?)<\/tr>/g, (row, cells) => {
      if (!cells.startsWith(TD)) return row; const end = cells.indexOf('</td>'); const text = cells.slice(TD.length, end);
      if (only && !only[1].includes(text)) return row; if (!text.trim()) return row; n++; return '<tr>' + TH + text + '</th>' + cells.slice(end + 5) + '</tr>';
    }) + '</tbody>');
  });
  return { html, n };
}
function fixBanner(html) {
  const open = '<div data-allo-banner="true" style='; const at = html.indexOf(open); if (at < 0) return { html, n: 0 };
  const close = html.indexOf('</div>', at);
  return { html: html.slice(0, at) + html.slice(at, close).replace(open, '<header data-allo-banner="true" style=') + '</header>' + html.slice(close + 6), n: 1 };
}
function demoteSecondH1(html) {
  const first = html.indexOf('<h1'); if (first < 0) return { html, n: 0 };
  const second = html.indexOf('<h1', first + 3); if (second < 0) return { html, n: 0 };
  const close = html.indexOf('</h1>', second);
  return { html: html.slice(0, second) + '<h2' + html.slice(second + 3, close) + '</h2>' + html.slice(close + 5), n: 1 };
}
const count = (re, s) => (s.match(re) || []).length;

const responses = [];
for (const id of ids) {
  const prompt = fs.readFileSync(`${here}/${promptPrefix}${id}.txt`, 'utf8');
  const a = prompt.indexOf('UNTRUSTED HTML FRAGMENT DATA:');
  const start = prompt.indexOf('"""', a) + 3, end = prompt.lastIndexOf('"""');
  const fragment = prompt.slice(start, end);
  let html = fragment.replace(' role="banner"', '');
  const edits = {};
  if (rtl && /<html lang="[a-z-]+">/.test(html)) { html = html.replace(/<html lang="([a-z-]+)">/, '<html lang="$1" dir="rtl">'); edits.dir = 1; }
  if (rtl && html.includes('<a href="#main-content" class="sr-only">Skip to main content</a>')) { html = html.replace('<a href="#main-content" class="sr-only">Skip to main content</a>', '<a href="#main-content" class="sr-only" lang="en">Skip to main content</a>'); edits.skipLang = 1; }
  if (rtl && /<footer role="contentinfo"[^>]*>\n<p>This document was automatically/.test(html)) { html = html.replace(/(<footer role="contentinfo"[^>]*>\n)<p>This document was automatically/, '$1<p lang="en">This document was automatically'); edits.footerLang = 1; }
  const b = fixBanner(html); html = b.html; edits.banner = b.n;
  const d = demoteSecondH1(html); html = d.html; edits.demotedH1 = d.n;
  const t = fixTables(html); html = t.html; edits.rowHeaders = t.n;
  const same = html.slice(0, 20) === fragment.slice(0, 20) && html.slice(-40) === fragment.slice(-40);
  console.log(`fragment ${id}: ${JSON.stringify(edits)} chars ${fragment.length} -> ${html.length} boundaries=${same} h1=${count(/<h1[\s>]/g, html)}`);
  responses.push({ request_id: ridPrefix + id, text: html });
}
fs.writeFileSync(outFile, JSON.stringify({ run_id: run, wait_seconds: 28, responses }));
console.log('wrote', outFile, responses.map((r) => r.request_id.slice(-3)).join(','));
