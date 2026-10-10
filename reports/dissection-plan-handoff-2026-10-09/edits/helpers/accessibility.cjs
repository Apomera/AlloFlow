const fs = require('fs'), path = require('path'), crypto = require('crypto');
const base = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-plan-handoff-2026-10-09';
const assert = (ok, message) => { if (!ok) throw Error(message); };
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function luminance(hex) {
  const values = hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
}
const contrast = (fg, bg) => (luminance(bg) + .05) / (luminance(fg) + .05);
const phases = {
  predict: { foreground: '#163a63', backgroundBound: '#ecf9f5', gradientStops: ['#f0f9ff', '#f8fbff', '#ecfdf5'] },
  reflect: { foreground: '#4c1d95', backgroundBound: '#f0f3fa', gradientStops: ['#f5f3ff', '#faf5ff', '#f0fdfa'] },
  perform: { foreground: '#115e59', backgroundBound: '#ecfdf5', gradientStops: ['#ecfdf5', '#f0fdfa'] }
};
const allowed = new Set(['.diss-learning-check__eyebrow', '#diss-learning-check-title', '#diss-learning-check-prompt', '.diss-learning-check__prompt', '#diss-learning-check-keyboard-help', '#diss-guided-observation-title', '#diss-guided-observation-keyboard-help', '.diss-learning-check__perform']);
const files = ['checkpoint-2', 'roadmap-3'].flatMap(run => fs.readdirSync(path.join(base, run, 'captures')).filter(name => /(?:^axe-.*|-axe)\.json$/.test(name)).map(name => run + '/captures/' + name));
assert(files.length === 15, 'Unexpected audit count');
const reports = [], nodes = [];
for (const file of files) {
  const bytes = fs.readFileSync(path.join(base, file)), audit = JSON.parse(bytes);
  assert(audit.violations.length === 0, file + ': violations');
  let count = 0;
  for (const rule of audit.incomplete) {
    assert(rule.id === 'color-contrast', file + ': unexpected incomplete rule');
    for (const node of rule.nodes) {
      count++;
      assert(node.target.length === 1 && allowed.has(node.target[0]), file + ': unknown target');
      const checks = [...node.any, ...node.all, ...node.none];
      assert(checks.length > 0 && checks.every(check => check.data?.messageKey === 'bgGradient'), file + ': unexpected incomplete reason');
      const related = checks.flatMap(check => check.relatedNodes || []).map(item => item.html).join('\n');
      const phase = related.match(/data-phase="([^"]+)"/)?.[1];
      assert(phases[phase], file + ': unknown phase');
      const target = node.target[0];
      const foreground = target.endsWith('keyboard-help') ? '#334155' : target === '.diss-learning-check__perform' ? '#065f46' : phases[phase].foreground;
      const background = phases[phase].backgroundBound;
      const ratio = contrast(foreground, background);
      assert(ratio >= 4.5, file + ': insufficient contrast');
      nodes.push({ file, target, phase, foreground, backgroundBound: background, ratio, minimumRequired: 4.5, result: 'resolved by conservative contrast calculation' });
    }
  }
  reports.push({ file, sha256: hash(bytes), violations: 0, incompleteNodes: count });
}
assert(nodes.length === 40, 'Unexpected incomplete-node count');
const review = {
  at: new Date().toISOString(), acceptedReports: reports.length, violations: 0, reviewedNodes: nodes.length, unresolvedNodes: 0,
  method: 'Read each raw incomplete check and its related section phase. For the native light gradients, use the minimum red, green and blue channel across all stops as a conservative luminance bound. White translucent backing only raises luminance for these dark foregrounds. Use WCAG sRGB relative luminance; require 4.5:1 for every node. Raw audits are not modified.',
  phases, minimumReviewedRatio: Math.min(...nodes.map(node => node.ratio)),
  confirmedPlan: { foreground: '#065f46', background: '#ffffff', ratio: contrast('#065f46', '#ffffff'), automaticIncompletes: 0 },
  independentReview: 'The handoff_accessibility agent independently read all 16 raw audits, including the excluded interrupted roadmap-2 audit: zero violations; 43 gradient-related incomplete nodes overall. Its accepted subset counts and contrast calculations agree with this review. Source review confirms high-contrast and forced-color rules override the new white backing; recap text inherits those colors.',
  exclusions: ['roadmap-2 is retained as interrupted evidence and excluded from accepted totals.'],
  reports, nodes,
  limits: 'Scoped Chromium/axe checks with source, visual and contrast review; no whole-application accessibility certification or assistive-technology user session.'
};
fs.writeFileSync(path.join(base, 'accessibility-review.json'), JSON.stringify(review, null, 2) + '\n');
console.log(JSON.stringify({ reports: reports.length, violations: 0, reviewedNodes: nodes.length, minimumContrast: review.minimumReviewedRatio, confirmedPlanContrast: review.confirmedPlan.ratio }));
