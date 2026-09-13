// Reconstruct each agent-bridge run's timeline from the [DocPipe] "+NNN.Ns" stamps in the verbose server logs.
const fs = require('fs');
const SP = process.argv[2];
const logs = fs.readdirSync(SP).filter(f => /^server-8766.*\.log$/.test(f));
const runs = {};
for (const f of logs) {
  for (const line of fs.readFileSync(SP + '/' + f, 'utf8').split('\n')) {
    const m = /\[(arun-[0-9a-f]+)\]/.exec(line); if (!m) continue;
    const r = runs[m[1]] || (runs[m[1]] = { file: f, lines: [], calls: {} , started: null });
    r.lines.push(line);
  }
}
for (const [id, r] of Object.entries(runs)) {
  const ev = [];
  for (const line of r.lines) {
    const t = /\+(\d+(?:\.\d+)?)s\s+[—-]\s+(.*)$/.exec(line);
    const startedM = /agent-bridge run started: (\S+)/.exec(line);
    if (startedM) r.started = startedM[1];
    if (t) ev.push({ t: parseFloat(t[1]), msg: t[2].replace(/\s+/g, ' ').slice(0, 150) });
    const s = /callGemini #(\d+) transport start/.exec(line); const d = /callGemini #(\d+) done \((\d+)ms/.exec(line);
    if (t && s) r.calls[s[1]] = Object.assign(r.calls[s[1]] || {}, { start: parseFloat(t[1]) });
    if (t && d) r.calls[d[1]] = Object.assign(r.calls[d[1]] || {}, { end: parseFloat(t[1]), ms: Number(d[2]) });
  }
  if (!ev.length) { console.log('== ' + id + ' (' + r.file + ') ' + (r.started || '') + ': no stamped lines (' + r.lines.length + ' lines)'); continue; }
  ev.sort((a, b) => a.t - b.t);
  const last = ev[ev.length - 1].t;
  let clientWait = 0, n = 0; for (const c of Object.values(r.calls)) if (c.start != null && c.end != null) { clientWait += (c.end - c.start); n++; }
  console.log('\n== ' + id + ' (' + r.file + ') ' + (r.started || '') + ': last stamp +' + last + 's, ' + n + ' timed model calls, client-side wait ' + Math.round(clientWait) + 's (' + Math.round(100 * clientWait / last) + '%)');
  let prev = 0;
  for (const e of ev) {
    const gap = e.t - prev;
    if (gap >= 8 || /Step \d|Complete|Done|Tesseract|OCR|render|Vision|slice|Auto-fix|Payload|calm|wait/i.test(e.msg)) console.log('  +' + e.t.toFixed(1).padStart(7) + 's  (' + (gap >= 8 ? '+' + gap.toFixed(0) + 's gap' : '').padEnd(10) + ') ' + e.msg);
    prev = e.t;
  }
}
