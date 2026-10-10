const fs = require('node:fs');
const path = require('node:path');
const run = process.argv[2];
const captures = path.join('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-technique-roadmap-2026-10-06', run, 'captures');
const names = fs.readdirSync(captures).filter(name => name.endsWith('-axe.json')).sort();
const unique = new Map();
const reports = names.map(name => {
  const axe = JSON.parse(fs.readFileSync(path.join(captures, name), 'utf8'));
  for (const rule of axe.incomplete) for (const node of rule.nodes) {
    const checks = node.any.concat(node.all, node.none).map(check => ({ id: check.id, data: check.data, message: check.message }));
    const key = JSON.stringify({ id: rule.id, target: node.target, html: node.html, checks });
    if (!unique.has(key)) unique.set(key, { rule: rule.id, target: node.target, html: node.html, checks, reports: [] });
    unique.get(key).reports.push(name);
  }
  const headings = axe.passes.filter(rule => rule.id === 'heading-order').flatMap(rule => rule.nodes.map(node => ({ target: node.target, html: node.html, messages: node.any.concat(node.all, node.none).map(check => check.message) })));
  return { file: name, violations: axe.violations.map(rule => ({ id: rule.id, targets: rule.nodes.map(node => node.target) })), incompleteRules: axe.incomplete.map(rule => rule.id), headingOrder: headings };
});
console.log(JSON.stringify({ run, reportCount: reports.length, expectedReportCount: 17, uniqueIncompleteNodes: [...unique.values()], reports }, null, 2));
