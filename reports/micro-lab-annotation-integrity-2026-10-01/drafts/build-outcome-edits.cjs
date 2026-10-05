const fs = require('node:fs');
const source = fs.readFileSync('stem_lab/stem_tool_microbiology.js', 'utf8');
const lines = source.split('\n');
function one(fragment) {
  const matches = lines.filter(line => line.includes(fragment));
  if (matches.length !== 1) throw new Error('Expected one outcome anchor: ' + fragment);
  return matches[0];
}
const review = one('var predictionReview = finished && history.length > 1 && prediction ?');
const missing = one("day > 0 && !prediction ? hh('p'");
const summary = one("predictionReview ? predictionReview.observedLabel : 'was not classified'");
const edits = [
  { old: review, new: "    var observedTrend = finished && history.length > 1 ? classifyResistanceTrend(initialPct, pctRes) : null;\n    var observedShareChange = pctRes === null ? null : pctRes - initialPct;\n" + review },
  { old: missing, new: "      day > 0 && !prediction ? hh('p', { role: 'status', style: { fontSize: 14, color: microInk('#fde68a') } }, finished ? __alloMBT('stem.microbiology.resistance_restored_completed_without_prediction', 'No prediction was saved for this restored run. Its observed outcome is shown without a prediction comparison.') : __alloMBT('stem.microbiology.resistance_restored_without_prediction', 'No prediction was saved for this restored run. You can continue observing its evidence.')) : null," },
  { old: summary, new: [
    "        hh('div', { id: 'micro-resistance-outcome-summary', role: 'status', 'aria-live': 'polite', 'aria-atomic': true, style: { marginBottom: 8, paddingBottom: 7, borderBottom: '1px solid rgba(167,243,208,0.25)' } },",
    "          hh('strong', { style: { color: predictionReview && predictionReview.correct ? '#86efac' : '#fde68a' } }, predictionReview ? (predictionReview.correct ? 'Prediction matched. ' : 'Prediction review. ') : __alloMBT('stem.microbiology.resistance_observation_summary', 'Observation summary. ')),",
    "          pctRes === null ? __alloMBT('stem.microbiology.resistance_observed_extinction', 'The population died out. There is no surviving population from which to calculate a resistant share.')",
    "            : observedTrend === 'similar' ? __alloMBT('stem.microbiology.resistance_observed_similar', 'The resistant share stayed about the same (a {points}-point change; changes within 5 points count as similar).').replace('{points}', String(Math.abs(observedShareChange)))",
    "            : observedTrend === 'increase' ? __alloMBT('stem.microbiology.resistance_observed_increase', 'The resistant share increased by {points} percentage points.').replace('{points}', String(Math.abs(observedShareChange)))",
    "            : __alloMBT('stem.microbiology.resistance_observed_decrease', 'The resistant share decreased by {points} percentage points.').replace('{points}', String(Math.abs(observedShareChange)))),"
  ].join('\n') }
];
fs.writeFileSync('reports/micro-lab-annotation-integrity-2026-10-01/drafts/resistance-outcome-edits.json', JSON.stringify(edits, null, 2) + '\n');
console.log('Prepared three unique Resistance outcome edits.');
