// Build fixed HTML fragments for the fix-pass requests: header landmark for the banner and
// row headers (<th scope="row">) for tables whose first column labels the row. Everything else
// stays byte-identical, as the prompt demands.
const fs = require('node:fs');
const here = __dirname;
const [runFile, outFile, ...ids] = process.argv.slice(2);
const run = fs.readFileSync(runFile, 'utf8').trim();
const TD = '<td style="border:1px solid #111111;padding:8px 12px">';
const TH = '<th scope="row" style="border:1px solid #111111;padding:8px 12px;font-weight:bold;text-align:left">';
const ALL_ROWS = [/^Item 1, lines A and B/, /^Medical and dental expense computation/, /^Schedule J:/, /^Schedule K:/];
const ONLY_ROWS = { 'Item 2: wages': ['Enter totals here'], 'Schedule F:': ['1. Totals'] };

function fixTables(html) {
  let converted = 0;
  html = html.replace(/<table[\s\S]*?<\/table>/g, (table) => {
    const cap = /<caption[^>]*>([\s\S]*?)<\/caption>/.exec(table);
    const caption = cap ? cap[1] : '';
    const all = ALL_ROWS.some((re) => re.test(caption));
    const only = Object.entries(ONLY_ROWS).find(([k]) => caption.startsWith(k));
    if (!all && !only) return table;
    return table.replace(/<tbody>([\s\S]*?)<\/tbody>/, (m, body) => '<tbody>' + body.replace(/<tr>([\s\S]*?)<\/tr>/g, (row, cells) => {
      if (!cells.startsWith(TD)) return row;
      const end = cells.indexOf('</td>');
      const text = cells.slice(TD.length, end);
      if (only && !only[1].includes(text)) return row;
      converted++;
      return '<tr>' + TH + text + '</th>' + cells.slice(end + 5) + '</tr>';
    }) + '</tbody>');
  });
  return { html, converted };
}

function fixBanner(html) {
  const open = '<div data-allo-banner="true" style=';
  const at = html.indexOf(open);
  if (at < 0) return { html, banner: false };
  const close = html.indexOf('</div>', at);
  const inner = html.slice(at, close);
  const fixed = inner.replace(open, '<header data-allo-banner="true" role="banner" style=') + '</header>';
  return { html: html.slice(0, at) + fixed + html.slice(close + 6), banner: true };
}

const responses = [];
for (const id of ids) {
  const prompt = fs.readFileSync(`${here}/prompt-${id}.txt`, 'utf8');
  const a = prompt.indexOf('UNTRUSTED HTML FRAGMENT DATA:');
  const start = prompt.indexOf('"""', a) + 3, end = prompt.lastIndexOf('"""');
  const fragment = prompt.slice(start, end);
  const b = fixBanner(fragment.replace(' role="banner"', ''));
  const t = fixTables(b.html);
  const rid = `mreq-b63b8450-cfe7-41b9-95fb-bb47f85b86c2-${id}`;
  console.log(`fragment ${id}: banner=${b.banner} rowHeaders=${t.converted} chars ${fragment.length} -> ${t.html.length} sameBoundaries=${t.html.slice(0, 30) === fragment.slice(0, 30) && t.html.slice(-30) === fragment.slice(-30)}`);
  responses.push({ request_id: rid, text: t.html });
}
fs.writeFileSync(outFile, JSON.stringify({ run_id: run, wait_seconds: 28, responses }));
console.log('wrote', outFile, 'responses', responses.length, responses.map(r => r.request_id.slice(-3)).join(','));
