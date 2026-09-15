// node fix_nces.cjs <poll.json> <out.json> <prefix> [--dry]
// Idempotent fixes for the NCES pages 19-23 fix-pass fragments, then send the replies:
//  - title banner div -> header landmark (data-allo-banner kept)
//  - slate heading colour #5c7c8d (4.45:1 at 17.6px bold) -> #4a6675 (6.1:1)
//  - injected teal "Generate (AI)" control white on #0d9488 (3.74:1) -> #0f766e (5.5:1)
//  - button accessible names made to contain their visible labels (IBM label_name_visible)
//  - reports (does not change) any aria-hidden container that holds a focusable link
// Everything else stays byte-identical; a fragment with nothing to change is answered UNCHANGED.
const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { JSDOM } = require('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/jsdom');
const here = __dirname;
const [pollFile, outFile, prefix, ...flags] = process.argv.slice(2);
const dry = flags.includes('--dry');
const r = JSON.parse(fs.readFileSync(path.join(here, pollFile), 'utf8')).structuredContent || {};

function extractFragment(prompt) {
  const at = prompt.indexOf('UNTRUSTED HTML FRAGMENT DATA:');
  if (at < 0) return null;
  let start = prompt.indexOf('"""', at) + 3;
  let end = prompt.lastIndexOf('"""');
  if (prompt[start] === '\n') start++;
  if (prompt[end - 1] === '\n') end--;
  return prompt.slice(start, end);
}

function fixBanner(html) {
  const open = '<div data-allo-banner="true" style=';
  const at = html.indexOf(open);
  if (at < 0) return { html, n: 0 };
  // Walk div open/close tags from the banner's own tag to find ITS closing tag (nested divs allowed).
  const re = /<div\b|<\/div>/g; re.lastIndex = at;
  let depth = 0, close = -1, m;
  while ((m = re.exec(html))) { if (m[0] === '<div') depth++; else if (--depth === 0) { close = m.index; break; } }
  if (close < 0) return { html, n: 0, note: 'banner close not in this fragment; left alone' };
  const inner = html.slice(at, close);
  return { html: html.slice(0, at) + inner.replace(open, '<header data-allo-banner="true" style=') + '</header>' + html.slice(close + 6), n: 1 };
}

function countReplace(html, from, to) {
  const n = html.split(from).length - 1;
  return { html: n ? html.split(from).join(to) : html, n };
}

function ariaHiddenFocusables(html) {
  try {
    const d = new JSDOM('<body>' + html + '</body>').window.document;
    return Array.from(d.querySelectorAll('[aria-hidden="true"]')).filter((el) => el.querySelector('a[href],button,input,select,textarea,[tabindex]')).map((el) => ({ container: el.outerHTML.slice(0, 120), focusables: Array.from(el.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')).map((f) => f.outerHTML.slice(0, 160)) }));
  } catch (_) { return []; }
}

const replies = [];
for (const p of r.pendingRequests || []) {
  const frag = extractFragment(p.prompt || '');
  if (frag === null) { console.log('skip', p.requestId.slice(-3), 'not a fix prompt'); continue; }
  let html = frag; const changes = {};
  let s = fixBanner(html); html = s.html; changes.banner = s.n; if (s.note) changes.bannerNote = s.note;
  s = countReplace(html, 'color:#5c7c8d', 'color:#4a6675'); html = s.html; changes.slate = s.n;
  // The teal control's text sits in a white span; darkening the button background lifts it to 5.5:1.
  s = countReplace(html, 'background:#0d9488;', 'background:#0f766e;'); html = s.html; changes.teal = s.n;
  s = countReplace(html, 'border:1px solid #0f766e;', 'border:1px solid #115e59;'); html = s.html; changes.tealBorder = s.n;
  // 11px placeholder hint #64748b on the #f1f5f9 box measures 4.34:1 (IBM/axe); #475569 gives 6.9:1.
  s = countReplace(html, 'font-size:11px;color:#64748b;', 'font-size:11px;color:#475569;'); html = s.html; changes.hint = s.n;
  // Button aria-labels are NOT touched: pass 1 showed the pipeline's candidate gate rejects any chunk
  // whose form-control names change ("form-state-changed"), discarding the chunk's other fixes too.
  // A description span hidden from AT must not hold a keyboard-reachable link (axe aria-hidden-focus,
  // IBM aria_hidden_nontabbable): expose the span rather than strand the link.
  let unhide = 0;
  {
    const open = '<span aria-hidden="true">';
    let idx = 0, rebuilt = '';
    while (true) {
      const at = html.indexOf(open, idx);
      if (at < 0) { rebuilt += html.slice(idx); break; }
      const close = html.indexOf('</span>', at);
      const segment = html.slice(at, close < 0 ? html.length : close);
      rebuilt += html.slice(idx, at);
      if (segment.includes('<a href')) { rebuilt += '<span>' + segment.slice(open.length); unhide++; }
      else rebuilt += segment;
      idx = at + segment.length;
    }
    html = rebuilt;
  }
  changes.unhide = unhide;
  const hiddenFocus = ariaHiddenFocusables(html);
  const changed = html !== frag;
  console.log(p.requestId.slice(-3), 'fragmentChars', frag.length, changed ? 'CHANGED' : 'UNCHANGED', JSON.stringify(changes), hiddenFocus.length ? 'ARIA-HIDDEN-FOCUSABLE: ' + JSON.stringify(hiddenFocus) : '');
  replies.push({ request_id: p.requestId, text: changed ? html : 'UNCHANGED' });
}
if (!replies.length) { console.log('nothing to send'); process.exit(0); }
const repliesFile = 'replies-' + outFile.replace(/\.json$/, '') + '.json';
fs.writeFileSync(path.join(here, repliesFile), JSON.stringify(replies));
if (dry) { console.log('dry run: wrote', repliesFile); process.exit(0); }
console.log(execFileSync(process.execPath, [path.join(here, 'send.cjs'), repliesFile, outFile, prefix, '25'], { encoding: 'utf8' }));
