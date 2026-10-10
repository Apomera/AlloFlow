const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const parser = require(path.join(repo, 'node_modules/@babel/parser'));
const before = fs.readFileSync(path.join(__dirname, 'renderer-baseline.js'), 'utf8');
const after = fs.readFileSync(path.join(__dirname, 'renderer-next.js'), 'utf8');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
if (hash(after) !== '6b5c426f6e2f4d0545dfccce713b0a0457547b5384e33fb911e09a296f071354') throw Error('Candidate changed');
const printRule = '@media print { [data-dissection-root] #diss-view-tools.diss-view-controls { display: none !important; } }';
if (after.split(printRule).length !== 2) throw Error('Final print rule missing or duplicated');
function children(n) {
  return Object.entries(n).filter(([key]) => key !== 'loc').flatMap(([, value]) => Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : value && typeof value === 'object' ? [value] : []);
}
function key(p) { return p.key?.name || p.key?.value; }
function findPanel(source) {
  let panel;
  function walk(n) {
    if (n.type === 'CallExpression' && n.arguments?.[1]?.properties?.some(p => key(p) === 'id' && p.value?.value === 'diss-view-tools')) {
      if (panel) throw Error('Duplicate View panel');
      panel = n;
    }
    children(n).forEach(walk);
  }
  walk(parser.parse(source));
  if (!panel) throw Error('Missing panel');
  return panel;
}
function inspect(source) {
  const panel = findPanel(source), controls = [], ids = [], references = [];
  function walk(n, gates = []) {
    if (n.type === 'LogicalExpression' && n.operator === '&&') {
      walk(n.left, gates);
      walk(n.right, [...gates, source.slice(n.left.start, n.left.end).replace(/\s+/g, '')]);
      return;
    }
    if (n.type === 'CallExpression' && n.arguments?.[1]?.type === 'ObjectExpression') {
      const props = n.arguments[1].properties;
      const id = props.find(p => key(p) === 'id')?.value?.value;
      if (id) ids.push({ id, gates: [...new Set(gates)] });
      for (const p of props.filter(p => ['aria-describedby', 'aria-labelledby'].includes(key(p)))) {
        if (typeof p.value.value === 'string') references.push(...p.value.value.split(/\s+/).map(id => ({ id, gates: [...new Set(gates)] })));
      }
      if (['button', 'input'].includes(n.arguments[0]?.value)) controls.push({
        tag: n.arguments[0].value,
        gates: [...new Set(gates)].sort(),
        props: props.filter(p => key(p) !== 'aria-describedby').map(p => source.slice(p.start, p.end)),
        children: n.arguments.slice(2).map(a => source.slice(a.start, a.end)),
      });
    }
    children(n).forEach(child => walk(child, gates));
  }
  walk(panel);
  return { controls, ids, references };
}
const b = inspect(before), a = inspect(after);
if (JSON.stringify(b.controls) !== JSON.stringify(a.controls)) throw Error('Native control bytes, order, or condition gates differ');
for (const { id, gates } of a.references.filter(r => r.id.startsWith('diss-view-'))) {
  const targets = a.ids.filter(target => target.id === id);
  if (targets.length !== 1) throw Error('Missing or duplicate description/heading ' + id);
  for (const quizMode of [false, true]) {
    const enabled = conditions => conditions.every(condition => vm.runInNewContext(condition, { d: { quizMode } }));
    if (enabled(gates) && !enabled(targets[0].gates)) throw Error('Conditional reference missing ' + id);
  }
}
const renderedCounts = [false, true].map(quizMode => ({ quizMode, controls: a.controls.filter(c => c.gates.every(g => vm.runInNewContext(g, { d: { quizMode } }))).length }));
function linear(value) { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }
function luminance(hex) { const rgb = hex.slice(1).match(/../g).map(v => linear(parseInt(v, 16))); return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722; }
function contrast(fg, bg) { const l = [luminance(fg), luminance(bg)].sort((a, b) => b - a); return Number(((l[0] + .05) / (l[1] + .05)).toFixed(2)); }
const contrastChecks = [
  ['control text', '#174d86', '#ffffff', 4.5],
  ['selected control text', '#134e4a', '#e0f2ed', 4.5],
  ['help text', '#334155', '#f8fbfc', 4.5],
  ['subgroup heading', '#173f4c', '#f8fbfc', 4.5],
  ['selected border against selected fill', '#0f766e', '#e0f2ed', 3],
  ['focus outline against normal fill', '#1766d2', '#ffffff', 3],
  ['focus outline against selected fill', '#1766d2', '#e0f2ed', 3],
].map(([label, foreground, background, minimum]) => ({ label, foreground, background, minimum, ratio: contrast(foreground, background) }));
if (contrastChecks.some(check => check.ratio < check.minimum)) throw Error('Specified color contrast fails');
const review = {
  status: 'No blocking source finding',
  candidateSha256: hash(after), baselineSha256: hash(before),
  exercised: {
    nativeControlAstComparison: { controls: a.controls.length, originalPropsAndChildrenExact: true, exactOrder: true, logicalConditionSetsEqual: true, renderedCounts },
    descriptionAndHeadingReferences: { uniqueExistingTargets: true, quizConditionalAvailability: true },
    specifiedColorContrast: contrastChecks,
  },
  sourceReview: {
    assessment: 'Visuals remains available; other specimen controls and lighting controls retain quiz suppression. Existing labels-disabled and practical-disabled orientation/intensity props are byte-identical.',
    essentials: 'Derived Guided presentation, disabled effective lens/macro/depth features and default scene are unchanged. New copy accurately names the Advanced workspace requirement; original CSS visibility gates are preserved by the source edit scope.',
    reference: 'Help uses the existing valid-image filter, selected id resolver, last valid frame fallback, and existing evidenceFrameNumber/evidenceLayerLabel. It imposes no new layer or orientation prerequisite.',
    presentation: 'Accessible sets highContrast and slow animSpeed; changing presentation does not reverse those preferences. Larger hit targets are implemented in native click and hover radii.',
    quality: 'Native renderQuality controls minimum animation frame spacing with constrained-device and adaptive auto behavior, so the smoothness/device-load description matches its effect.',
    tissue: 'beforeTechniqueView selects a displayed procedure overlay; the original toggle updates only that field. It retains recorded procedure data.',
    comparisonRoute: 'Selected guidance checks the same dissectionComparisonGroup used by the native comparison panel. Missing-selection copy no longer guarantees mapping. Native route/action props remain unchanged.',
    structure: 'Four outer groups retained, four named inner groups introduced with h5 headings, no new tab stops. Container breakpoints and overflow-wrap support narrow layouts; browser measurement is still needed.',
    printAmendment: 'Final print-only rule uses the same View panel selector as the existing important display:grid declaration and appears later, so important display:none wins in print without changing screen styles. Native controls and their conditions are unchanged. Browser print assertion still awaits rerun.',
  },
  stagedFixtureReview: {
    meaningfulCoverage: ['Baseline/current action inventory and effective visibility across advanced, Essentials, quiz and practical states', 'Native presentation cycle and retained accessibility preferences', 'Missing/selected/fallback reference frames', 'Pin prerequisite and local magnification/depth cycles', 'Variation/tissue display changes with learner-record preservation', 'Native practical entry/teardown', 'Empty/mapped/unmapped native comparison focus routes', 'Six responsive layouts, forced colors, resizing, text spacing and print'],
    findings: [],
    note: 'Tests inspected but not executed by this reviewer. Browser proof separately pins learner records, evidence, camera and technique; display preferences are intentionally exercised. Axe currently asserts violations only; incomplete results should be inspected in the saved audit output.',
  },
  limitations: ['Static AST checks do not execute native handlers or measure final DOM geometry.', 'Specified-color contrast checks do not substitute for computed browser styles or system forced-color testing.', 'No screenshots or suite results were available during this source review.'],
  changesByReviewer: 'Only this scratch script and review JSON; no repo source/test edits or suites.',
  reviewHistory: [
    { candidateSha256: 'b73e96799bd9bcd2312f2c81805289ee984119eea8b122623cb072aadb396d95', status: 'Initial static review passed', nativeControls: 34, colorChecks: 7 },
    { candidateSha256: hash(after), status: 'Static review repeated after print-only amendment', nativeControls: 34, colorChecks: 7 },
  ],
};
fs.writeFileSync(path.join(__dirname, 'view-independent-review.json'), JSON.stringify(review, null, 2));
console.log(JSON.stringify({ status: review.status, nativeControls: a.controls.length, renderedCounts, contrastChecks: contrastChecks.length, report: 'view-independent-review.json' }));
