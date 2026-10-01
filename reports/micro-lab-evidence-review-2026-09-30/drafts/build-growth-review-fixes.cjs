const fs = require('fs');
const path = require('path');
const root = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
let source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_microbiology.js'), 'utf8');
const eol = source.includes('\r\n') ? '\r\n' : '\n';
const edits = [];
function edit(before, after) {
  const old = before.replace(/\r?\n/g, eol), replacement = after.replace(/\r?\n/g, eol);
  if (source.split(old).length !== 2) throw new Error('Expected one match: ' + old.slice(0, 100));
  edits.push({ old, new: replacement });
  source = source.replace(old, replacement);
}

edit(`    function normalizeSweep(value) {
      var raw = record(value);
      if (typeof raw.variable !== 'string' || !Object.prototype.hasOwnProperty.call(sweepSteps, raw.variable) ||
        !raw.conditions || typeof raw.conditions !== 'object' || Array.isArray(raw.conditions)) return null;
      return Object.freeze({ variable: raw.variable, conditions: normalizeConditions(raw.conditions) });
    }`, `    function normalizeSweep(value, strict) {
      var raw = record(value);
      if (typeof raw.variable !== 'string' || !Object.prototype.hasOwnProperty.call(sweepSteps, raw.variable) ||
        !raw.conditions || typeof raw.conditions !== 'object' || Array.isArray(raw.conditions)) return null;
      var conditions = raw.conditions;
      if (strict && (!Object.prototype.hasOwnProperty.call(conditions, 'profile') || typeof conditions.profile !== 'string' ||
        !Object.prototype.hasOwnProperty.call(profiles, conditions.profile) || !['tempC', 'pH', 'oxygen'].every(function(key) {
          return Object.prototype.hasOwnProperty.call(conditions, key) && typeof conditions[key] === 'number' && Number.isFinite(conditions[key]);
        }))) return null;
      return Object.freeze({ variable: raw.variable, conditions: normalizeConditions(conditions) });
    }`);
edit("      return !!a && !!b && a.variable === b.variable && conditionKeys.every(function(key) { return a.conditions[key] === b.conditions[key]; });", "      return !!a && !!b && a.variable === b.variable && conditionKeys.every(function(key) { return key === a.variable || a.conditions[key] === b.conditions[key]; });");
edit('      var previousSweep = normalizeSweep(raw.previousSweep);', '      var previousSweep = normalizeSweep(raw.previousSweep, true);');
edit('      var notebook = normalizeNotebook(value), next = normalizeSweep(specification);', '      var notebook = normalizeNotebook(value), next = normalizeSweep(specification, true);');
edit('        function sweepChart(result) {', '        function sweepChart(result, label) {');
edit("            h('figcaption', null, gt('sweep_response', 'Response to') + ' ' + labels[result.variable] + ' · ' + gt('sweep_final_units', 'Population at hour 24, arbitrary units')),", "            h('figcaption', null, label + ': ' + gt('sweep_response', 'Response to') + ' ' + labels[result.variable] + ' · ' + gt('sweep_final_units', 'Population at hour 24, arbitrary units')),");
edit("            h('svg', { viewBox: '0 0 660 285', role: 'img', 'aria-label': gt('sweep_chart_alt', 'Sampled growth response across one environmental variable. The table below provides every setting and result.') },", "            h('svg', { viewBox: '0 0 660 285', role: 'img', 'aria-label': label + '. ' + gt('sweep_chart_alt', 'Sampled growth response across one environmental variable. The table below provides every setting and result.') },");
edit("        function sweepEvidence(result, previous) {\n          return h('div',", "        function sweepEvidence(result, previous) {\n          var label = previous ? gt('sweep_previous', 'Previous sweep') : gt('sweep_current', 'Current sweep');\n          return h('div',");
edit("            h('h4', { id: previous ? 'gl-previous-sweep-heading' : 'gl-current-sweep-heading', tabIndex: -1 }, previous ? gt('sweep_previous', 'Previous sweep') : gt('sweep_current', 'Current sweep')),", "            h('h4', { id: previous ? 'gl-previous-sweep-heading' : 'gl-current-sweep-heading', tabIndex: -1 }, label),");
edit('              sweepChart(result),', '              sweepChart(result, label),');
edit("                h('caption', null, gt('sweep_table', 'Saved sweep settings and model responses')),", "                h('caption', null, label + ': ' + gt('sweep_table', 'Saved sweep settings and model responses')),");

const directory = path.join(root, 'reports/micro-lab-evidence-review-2026-09-30/drafts');
fs.writeFileSync(path.join(directory, 'growth-review-fixes.json'), JSON.stringify(edits, null, 2) + '\n');
fs.writeFileSync(path.join(directory, 'growth-review-fixes.preview.js'), source);
console.log(JSON.stringify({ edits: edits.length }));
