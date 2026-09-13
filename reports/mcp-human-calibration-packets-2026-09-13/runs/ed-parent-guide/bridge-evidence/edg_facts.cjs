// Print measured facts about every pending HTML-audit prompt in a saved poll state.
// Usage: node edg_facts.cjs <state.json> [--body]
const fs = require('node:fs'), path = require('node:path');
const state = JSON.parse(fs.readFileSync(path.join(__dirname, process.argv[2]), 'utf8'));
const showBody = process.argv.includes('--body');
const count = (re, s) => (s.match(re) || []).length;
for (const q of state.structuredContent.pendingRequests || []) {
  const m = /HTML section (\d+) of (\d+)|HTML section (\d)\/(\d)/.exec(q.prompt);
  if (!m) { console.log('=== ' + q.requestId.slice(-4) + ' ' + q.kind + ' chars=' + q.promptTotalChars + ' (not an HTML audit): ' + q.prompt.slice(0, 160).replace(/\s+/g, ' ')); continue; }
  const start = q.prompt.indexOf('"""') + 3, end = q.prompt.lastIndexOf('"""');
  const html = q.prompt.slice(start, end);
  const facts = {
    section: (m[1] || m[3]) + '/' + (m[2] || m[4]), chars: html.length,
    lang: (/<html[^>]*\slang="([^"]*)"/.exec(html) || [])[1] || null,
    title: (/<title>([^<]*)<\/title>/.exec(html) || [])[1] || null,
    h1: count(/<h1[\s>]/g, html), h2: count(/<h2[\s>]/g, html), h3: count(/<h3[\s>]/g, html),
    header: count(/<header[\s>]/g, html), main: count(/<main[\s>]/g, html), nav: count(/<nav[\s>]/g, html), footer: count(/<footer[\s>]/g, html),
    banner: count(/data-allo-banner/g, html), skipLink: /href="#main-content"/.test(html),
    imgs: (html.match(/<img[^>]*>/g) || []).map((t) => ({ alt: ((/alt="([^"]*)"/.exec(t) || [])[1] || '').length })),
    tables: count(/<table[\s>]/g, html), ul: count(/<ul[\s>]/g, html), ol: count(/<ol[\s>]/g, html), sup: count(/<sup[\s>]/g, html),
    links: (html.match(/<a [^>]*>[\s\S]*?<\/a>/g) || []).map((t) => t.replace(/<[^>]+>/g, '').trim().slice(0, 60)),
    colors: [...new Set((html.match(/#[0-9a-fA-F]{6}\b/g) || []))].slice(0, 20),
  };
  console.log('=== ' + q.requestId.slice(-4) + ' ' + JSON.stringify(facts, null, 1).replace(/\n\s*/g, ' '));
  const h1s = html.match(/<h1[^>]*>[\s\S]*?<\/h1>/g) || []; console.log('  h1 texts:', h1s.map((t) => t.replace(/<[^>]+>/g, '').trim().slice(0, 100)));
  const heads = html.match(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/g) || []; console.log('  headings:', heads.map((t) => t.slice(1, 3) + ':' + t.replace(/<[^>]+>/g, '').trim().slice(0, 50)));
  if (showBody) { const b = html.indexOf('<body'); console.log(html.slice(b, b + 6000)); }
}
