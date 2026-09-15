// node dump_prompts.cjs <poll.json> [--head N] [--all]
// Saves every pending prompt to prompt-<idsuffix>.txt and prints an overview; prints the first
// prompt's instruction head (up to the fragment marker) and tail, or every prompt with --all.
const fs = require('node:fs'), path = require('node:path');
const here = __dirname;
const args = process.argv.slice(2);
const pollFile = args[0];
const headN = args.includes('--head') ? Number(args[args.indexOf('--head') + 1]) : 4200;
const all = args.includes('--all');
const r = JSON.parse(fs.readFileSync(path.join(here, pollFile), 'utf8')).structuredContent || {};
console.log('status', r.status, 'calls', r.modelCallsSoFar, 'pending', r.pendingCount);
const pending = r.pendingRequests || [];
for (const p of pending) {
  const t = p.prompt || '';
  const suffix = p.requestId.slice(p.requestId.lastIndexOf('-') + 1);
  fs.writeFileSync(path.join(here, 'prompt-' + suffix + '.txt'), t);
  const fm = t.search(/UNTRUSTED HTML (FRAGMENT )?DATA/);
  console.log('==', suffix, 'kind', p.kind, 'chars', p.promptTotalChars, 'next', p.promptNextOffset, 'fragmentMarkerAt', fm);
}
const show = all ? pending : pending.slice(0, 1);
for (const p of show) {
  const t = p.prompt || '';
  const fm = t.search(/UNTRUSTED HTML (FRAGMENT )?DATA/);
  console.log('----- PROMPT ' + p.requestId.slice(-3) + ' HEAD -----');
  console.log(t.slice(0, fm > 0 ? Math.min(fm + 300, headN) : headN));
  console.log('----- TAIL -----');
  console.log(t.slice(-500));
}
