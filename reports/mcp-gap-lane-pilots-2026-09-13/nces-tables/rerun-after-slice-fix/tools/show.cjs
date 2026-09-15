// node show.cjs <result.json> [--full] [--tail N]  — summarize a remediation_agent_* result
const fs = require('node:fs');
const [file, ...flags] = process.argv.slice(2);
const full = flags.includes('--full');
const tailN = Number((flags.find(f => f.startsWith('--tail=')) || '--tail=8').slice(7));
const r = JSON.parse(fs.readFileSync(file, 'utf8'));
const sc = r.structuredContent || {};
console.log('status=' + sc.status + ' calls=' + sc.modelCallsSoFar + ' pending=' + sc.pendingCount + ' isError=' + r.isError + (r.error ? ' error=' + JSON.stringify(r.error).slice(0, 300) : ''));
if (Array.isArray(sc.log)) for (const line of sc.log.slice(-tailN)) console.log('  | ' + String(line).slice(0, 220));
if (sc.result) console.log('RESULT KEYS: ' + Object.keys(sc.result).join(','));
if (sc.summary) console.log('SUMMARY: ' + JSON.stringify(sc.summary).slice(0, 1500));
for (const p of (sc.pendingRequests || [])) {
  console.log('\n=== ' + p.requestId + ' kind=' + p.kind + ' images=' + (p.imageCount || 0) + ' promptChars=' + p.promptTotalChars + ' offset=' + p.promptOffset + ' next=' + p.promptNextOffset);
  const text = p.prompt || '';
  const at = text.indexOf('TRUSTED TASK');
  const body = at >= 0 ? text.slice(at) : text;
  console.log(full ? body : (body.length > 3500 ? body.slice(0, 3500) + '\n…[' + (body.length - 3500) + ' more chars; use --full]' : body));
}
if (r.images && r.images.length) console.log('\nimages: ' + r.images.map(i => i.file.replace(/^.*[\\/]/, '') + '(' + i.meta?.alloflowRequestId?.slice(-2) + '#' + i.meta?.alloflowImageIndex + ')').join(' '));
if (r.isError && r.content) console.log('CONTENT: ' + r.content.map(c => c.text).join('\n').slice(0, 1500));
