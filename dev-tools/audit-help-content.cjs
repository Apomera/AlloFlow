#!/usr/bin/env node
// Audit canonical root help references. Generated mirrors are deliberately excluded.
// Usage: node dev-tools/audit-help-content.cjs [--json report.json] [--check]
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const parser = require('@babel/parser');
function auditHelpContent(root = path.resolve(__dirname, '..')) {
  const raw = fs.readFileSync(path.join(root, 'help_strings.js'), 'utf8');
  const catalog = vm.runInNewContext('(' + raw + ')', {}, { timeout: 1000 });
  const fields = parser.parseExpression(raw).properties.map(p => p.key.name || p.key.value);
  const duplicates = [...new Set(fields.filter((key, i) => fields.indexOf(key) !== i))].sort();
  const overrides = JSON.parse(fs.readFileSync(path.join(root, 'ui_strings.js'), 'utf8')).help_mode || {};
  const names = fs.readdirSync(root);
  const files = names.filter(file => file === 'AlloFlowANTI.txt' || file.endsWith('_source.jsx') || (file.endsWith('_module.js') && !names.includes(file.replace(/_module\.js$/, '_source.jsx'))));
  const references = new Map(), dynamic = [];
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    const patterns = [ /\bdata-help-key\s*=\s*(?:"([\w-]+)"|'([\w-]+)'|\{\s*(?:"([\w-]+)"|'([\w-]+)')\s*\})/g, /["']data-help-key["']\s*:\s*["']([\w-]+)["'](?!\s*\+)/g ];
    for (const pattern of patterns) for (const match of source.matchAll(pattern)) {
      const key = match.slice(1).find(Boolean);
      if (!references.has(key)) references.set(key, new Set());
      references.get(key).add(file);
    }
    for (const match of source.matchAll(/\bdata-help-key\s*=\s*\{([^}\n]+)\}/g)) {
      if (!/^\s*['"][\w-]+['"]\s*$/.test(match[1])) dynamic.push({ file, expression: match[1].trim().slice(0, 180) });
    }
  }
  const hasText = value => typeof value === 'string' && value.trim().length > 0;
  const missing = [...references].filter(([key]) => !hasText(catalog[key]) && !hasText(overrides[key])).map(([key, files]) => ({ key, files: [...files].sort() })).sort((a,b) => a.key.localeCompare(b.key));
  return { scope: 'Root canonical host, JSX sources, and standalone modules without corresponding JSX source. Literal references only; dynamic expressions and local/tour fallbacks need review. Presence checks do not establish accuracy.', files: files.length, defined: Object.keys(catalog).length, referenced: references.size, duplicates, invalidDefinitions: Object.keys(catalog).filter(key => !hasText(catalog[key])), missing, dynamic };
}
module.exports = { auditHelpContent };
if (require.main === module) {
  const report = auditHelpContent();
  const args = process.argv.slice(2), jsonAt = args.indexOf('--json');
  if (jsonAt >= 0) { if (!args[jsonAt + 1]) throw new Error('--json needs a path'); fs.writeFileSync(path.resolve(args[jsonAt + 1]), JSON.stringify(report, null, 2)); }
  console.log(JSON.stringify({ files: report.files, defined: report.defined, referenced: report.referenced, duplicateKeys: report.duplicates.length, invalidDefinitions: report.invalidDefinitions.length, missingDefinitions: report.missing.length, dynamicExpressions: report.dynamic.length }, null, 2));
  if (args.includes('--check') && (report.duplicates.length || report.invalidDefinitions.length || report.missing.length)) process.exitCode = 1;
}
