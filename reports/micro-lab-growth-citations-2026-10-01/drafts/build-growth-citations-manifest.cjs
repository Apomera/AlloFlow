const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const folder = path.join(process.cwd(), 'reports/micro-lab-growth-citations-2026-10-01/drafts');
const source = fs.readFileSync('stem_lab/stem_tool_microbiology.js', 'utf8');
const lf = source.replace(/\r\n/g, '\n');
const helpers = fs.readFileSync(path.join(folder, 'growth-citation-helpers.js'), 'utf8').replace(/\r\n/g, '\n').trimEnd();
const edits = [];
function add(old, replacement) { edits.push({ old, new: replacement }); }
const oldTrial = lf.slice(lf.indexOf('    function normalizeTrial(item, id) {'), lf.indexOf('    function normalizeNotebook(value) {', lf.indexOf('    function normalizeTrial(item, id) {'))).trimEnd();
add(oldTrial, `    function normalizeCitedHours(value) {
      var hours = [];
      if (Array.isArray(value)) value.forEach(function(hour) {
        if (hours.length < 3 && typeof hour === 'number' && Number.isInteger(hour) && hour >= 0 && hour <= 24 && hours.indexOf(hour) < 0) hours.push(hour);
      });
      return hours.sort(function(a, b) { return a - b; });
    }
    function normalizeTrial(item, id) {
      var trial = {
        id: id, control: item.control && typeof item.control === 'object' && !Array.isArray(item.control) ? normalizeConditions(item.control) : null,
        conditions: normalizeConditions(item.conditions), prediction: prediction(item.prediction),
        hypothesis: plainText(item.hypothesis, 600), explanation: plainText(item.explanation, 1200)
      };
      var citedHours = normalizeCitedHours(item.citedHours);
      if (citedHours.length) trial.citedHours = Object.freeze(citedHours);
      return Object.freeze(trial);
    }`);
add('    function reviewNotebook(value, inspectionHour) {', helpers + '\n    function reviewNotebook(value, inspectionHour) {');
add("'original_prediction', 'outcome_at_24h', 'hypothesis', 'explanation', 'population_units', 'model_note']];", "'original_prediction', 'outcome_at_24h', 'hypothesis', 'explanation', 'population_units', 'model_note', 'cited_model_hours', 'cited_evidence_json']];");
add("Prediction outcomes refer to hour 24; similar means a difference of at most 2 units.']);", "Prediction outcomes refer to hour 24; similar means a difference of at most 2 units.'].concat(citedCSVValues(saved)));");
add("'modeled_outcome', 'control_population_at_24h', 'trial_population_at_24h', 'difference', 'hypothesis', 'explanation', 'model_note'];", "'modeled_outcome', 'control_population_at_24h', 'trial_population_at_24h', 'difference', 'hypothesis', 'explanation', 'model_note', 'cited_model_hours', 'cited_evidence_json'];");
add("'Illustrative deterministic model; normalized population units; equal inoculum 5, capacity 100, maximum rate 0.4/hour; no death modeled.']);", "'Illustrative deterministic model; normalized population units; equal inoculum 5, capacity 100, maximum rate 0.4/hour; no death modeled.'].concat(citedCSVValues(trial)));");
add('      reviewNotebook: reviewNotebook, reviewCSV: reviewCSV, csv: csv, similarThreshold: SIMILAR_THRESHOLD, maxRecords: MAX_RECORDS', '      reviewNotebook: reviewNotebook, reviewCSV: reviewCSV, csv: csv, evidenceAt: evidenceAt, citedEvidence: citedEvidence, setCitedHour: setCitedHour, similarThreshold: SIMILAR_THRESHOLD, maxRecords: MAX_RECORDS');
add("        growthLines.push(ht('portfolio_hour_table', 'Model hour\\tOriginal control population\\tTrial population'));", `        var citations = MicroGrowth.citedEvidence(trial);
        if (citations.length) {
          growthLines.push(ht('portfolio_cited_evidence', 'Evidence selected for my explanation'),
            ht('portfolio_cited_note', 'Learner-selected model hours, using the original saved conditions. These citations do not change the original prediction or its hour-24 comparison.'),
            ht('portfolio_cited_table', 'Cited model hour\\tOriginal control population\\tTrial population\\tTrial minus control'));
          citations.forEach(function(point) { growthLines.push([point.hour, point.controlPopulation === null ? ht('portfolio_cited_unavailable', 'Unavailable') : Number(point.controlPopulation.toFixed(3)), Number(point.trialPopulation.toFixed(3)), point.difference === null ? ht('portfolio_cited_unavailable', 'Unavailable') : Number(point.difference.toFixed(3))].join('\\t')); });
        }
        growthLines.push(ht('portfolio_hour_table', 'Model hour\\tOriginal control population\\tTrial population'));`);
add("              gt('explanation', 'My evidence and explanation') + ': ' + r.explanation, '', gt('table_caption', 'Simulated population at each model hour'));\n            text.push(gt('hour', 'Model hour') + '\\t' + gt('control', 'Control') + '\\t' + gt('trial', 'Trial'));", `              gt('explanation', 'My evidence and explanation') + ': ' + r.explanation, '');
            var citations = G.citedEvidence(r);
            if (citations.length) {
              text.push(gt('cited_export_title', 'Evidence selected for my explanation'),
                gt('cited_export_note', 'Learner-selected model hours from the original saved conditions. Original predictions and outcome labels still refer to hour 24.'),
                gt('cited_export_table', 'Cited model hour\\tOriginal control population\\tTrial population\\tTrial minus control'));
              citations.forEach(function(point) { text.push([point.hour, point.controlPopulation === null ? gt('cited_unavailable', 'Unavailable') : Number(point.controlPopulation.toFixed(3)), Number(point.trialPopulation.toFixed(3)), point.difference === null ? gt('cited_unavailable', 'Unavailable') : Number(point.difference.toFixed(3))].join('\\t')); });
              text.push('');
            }
            text.push(gt('table_caption', 'Simulated population at each model hour'));
            text.push(gt('hour', 'Model hour') + '\\t' + gt('control', 'Control') + '\\t' + gt('trial', 'Trial'));`);
let preview = source;
for (const edit of edits) {
  if (source.includes('\r\n')) { edit.old = edit.old.replace(/\n/g, '\r\n'); edit.new = edit.new.replace(/\r?\n/g, '\r\n'); }
  if (preview.split(edit.old).length !== 2) throw new Error('Non-unique or missing source anchor: ' + edit.old.slice(0, 100));
  preview = preview.replace(edit.old, edit.new);
}
new vm.Script(preview, { filename: 'growth-citations-preview.js' });
fs.writeFileSync(path.join(folder, 'growth-citation-source-edits.json'), JSON.stringify(edits, null, 2) + '\n');
console.log(edits.length + ' exact source edits; integrated preview syntax valid.');
