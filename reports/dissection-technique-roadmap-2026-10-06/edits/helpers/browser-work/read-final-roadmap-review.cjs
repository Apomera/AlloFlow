const fs = require('node:fs');
const path = require('node:path');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const run = process.argv[2] || 'roadmap-4';
const captures = path.join(repo, 'reports/dissection-technique-roadmap-2026-10-06', run, 'captures');
if (!fs.existsSync(captures)) { console.log(JSON.stringify({ status: 'captures not ready', captures })); process.exit(2); }
const names = fs.readdirSync(captures).filter(name => name.endsWith('-axe.json')).sort();
const reports = names.map(name => {
  const axe = JSON.parse(fs.readFileSync(path.join(captures, name), 'utf8'));
  return {
    file: name,
    violations: axe.violations.map(rule => ({ id: rule.id, nodes: rule.nodes.map(node => ({ target: node.target, html: node.html, summary: node.failureSummary })) })),
    incomplete: axe.incomplete.map(rule => ({ id: rule.id, nodes: rule.nodes.map(node => ({ target: node.target, html: node.html, checks: node.any.concat(node.all, node.none).map(check => ({ data: check.data, message: check.message })) })) })),
    headingOrder: axe.passes.filter(rule => rule.id === 'heading-order').map(rule => rule.nodes.map(node => ({ target: node.target, html: node.html, checks: node.any.concat(node.all, node.none).map(check => check.message) }))),
  };
});
const wanted = ['after-phone-collapsed-checkpoint.png', 'after-phone-expanded-checkpoint.png', 'after-embedded-large-contrast-collapsed-checkpoint.png', 'after-embedded-large-contrast-expanded-checkpoint.png', 'after-forced-colors-expanded-checkpoint.png'];
const dimensions = wanted.map(name => { const file = path.join(captures, name); if (!fs.existsSync(file)) return { name, missing: true }; const png = fs.readFileSync(file); return { name, width: png.readUInt32BE(16), height: png.readUInt32BE(20) }; });
for (const name of ['before-phone-checkpoint.png', 'before-embedded-large-contrast-checkpoint.png']) {
  const png = fs.readFileSync(path.join(repo, 'reports/dissection-technique-roadmap-2026-10-06/baseline-1/captures', name)); dimensions.push({ name, width: png.readUInt32BE(16), height: png.readUInt32BE(20) });
}
console.log(JSON.stringify({ run, captures, reportCount: reports.length, expectedReports: 17, violationRules: reports.reduce((total, report) => total + report.violations.length, 0), incompleteRules: [...new Set(reports.flatMap(report => report.incomplete.map(rule => rule.id)))], dimensions, reports }, null, 2));
