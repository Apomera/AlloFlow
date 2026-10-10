const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const scratch = __dirname;
const run = process.argv[2];
if (!run || !/^roadmap-\d+$/.test(run)) throw new Error('Pass the completed roadmap run name.');
const captures = path.join(repo, 'reports/dissection-technique-roadmap-2026-10-06', run, 'captures');
const files = fs.readdirSync(captures).filter(name => name.endsWith('-axe.json')).sort();
if (files.length !== 17) throw new Error(`Expected 17 full-checkpoint reports, found ${files.length}.`);
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const reports = files.map(name => {
  const file = path.join(captures, name);
  const axe = JSON.parse(fs.readFileSync(file, 'utf8'));
  const nodes = rule => ({ id: rule.id, nodes: rule.nodes.map(node => ({ target: node.target, html: node.html, checks: node.any.concat(node.all, node.none).map(check => ({ id: check.id, data: check.data, message: check.message })) })) });
  return { file: name, sha256: digest(file), violations: axe.violations.map(nodes), incomplete: axe.incomplete.map(nodes), headingOrder: axe.passes.filter(rule => rule.id === 'heading-order').map(nodes) };
});
const metrics = fs.readdirSync(captures).filter(name => /^(phone|tablet|desktop|embedded-medium|embedded-large-contrast|forced-colors)-proof\.json$/.test(name)).sort().map(name => {
  const proof = JSON.parse(fs.readFileSync(path.join(captures, name), 'utf8'));
  return { file: name, collapsed: proof.collapsed, expanded: proof.expanded, checkpoint: proof.checkpoint, rows: proof.rows };
});
const pngNames = ['after-phone-collapsed-checkpoint.png', 'after-phone-expanded-checkpoint.png', 'after-embedded-large-contrast-collapsed-checkpoint.png', 'after-embedded-large-contrast-expanded-checkpoint.png', 'after-forced-colors-expanded-checkpoint.png'];
const screenshots = pngNames.map(name => {
  const file = path.join(captures, name); const bytes = fs.readFileSync(file);
  return { file, sha256: digest(file), width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
});
for (const name of ['before-phone-checkpoint.png', 'before-embedded-large-contrast-checkpoint.png']) {
  const file = path.join(repo, 'reports/dissection-technique-roadmap-2026-10-06/baseline-1/captures', name); const bytes = fs.readFileSync(file);
  screenshots.push({ file, sha256: digest(file), width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) });
}
const report = {
  status: 'Final artifact facts collected; visual and manual incomplete review must be recorded separately.',
  createdAt: new Date().toISOString(), run, captures, sourceMutations: 0, browserFixtureMutations: 0, testRuns: 0,
  liveSource: { file: path.join(repo, 'stem_lab/stem_tool_dissection.js'), sha256: digest(path.join(repo, 'stem_lab/stem_tool_dissection.js')) },
  liveBrowserFixture: { file: path.join(repo, 'tests/e2e/dissection-technique-roadmap.spec.ts'), sha256: digest(path.join(repo, 'tests/e2e/dissection-technique-roadmap.spec.ts')) },
  reportCount: reports.length, violationRuleCount: reports.reduce((sum, item) => sum + item.violations.length, 0),
  incompleteRules: [...new Set(reports.flatMap(item => item.incomplete.map(rule => rule.id)))], reports, metrics, screenshots,
};
const output = path.join(scratch, `final-${run}-artifact-facts.json`);
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output, sha256: digest(output), reportCount: report.reportCount, violationRuleCount: report.violationRuleCount, incompleteRules: report.incompleteRules, source: report.liveSource.sha256, browser: report.liveBrowserFixture.sha256 }));
