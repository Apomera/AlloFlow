const fs = require('node:fs');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const file = repo + '/stem_lab/stem_tool_dissection.js';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const windows = [];
for (let i = 6000; i < Math.min(7400, lines.length); i++) {
  if (lines[i].includes('probedOrganId') || lines[i].includes("action === 'probe'")) {
    const from = Math.max(0, i - 6), to = Math.min(lines.length, i + 24);
    if (!windows.length || from > windows[windows.length - 1].to) windows.push({ from, to });
    else windows[windows.length - 1].to = Math.max(windows[windows.length - 1].to, to);
  }
}
for (const span of windows) console.log(lines.slice(span.from, span.to).map((line, i) => `${span.from + i + 1}: ${line}`).join('\n'));
for (const name of ['phone-collapsed', 'phone-expanded']) {
  const path = repo + '/reports/dissection-technique-roadmap-2026-10-06/roadmap-3/captures/' + name + '-axe.json';
  if (!fs.existsSync(path)) continue;
  const axe = JSON.parse(fs.readFileSync(path, 'utf8'));
  console.log(JSON.stringify({ name, violations: axe.violations.map(r => ({ id: r.id, nodes: r.nodes.map(n => n.target) })), incomplete: axe.incomplete.map(r => ({ id: r.id, nodes: r.nodes.map(n => ({ target: n.target, html: n.html, checks: n.any.concat(n.all, n.none).map(c => ({ id: c.id, data: c.data, message: c.message })) })) })), headingOrder: axe.passes.filter(r => r.id === 'heading-order').map(r => r.nodes.map(n => ({ target: n.target, html: n.html, checks: n.any.concat(n.all, n.none).map(c => c.message) }))) }, null, 2));
}
