import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { parse } from '@babel/parser';
const source = fs.readFileSync(process.env.ALLO_ANTI_CANDIDATE || 'AlloFlowANTI.txt', 'utf8');
const tree = parse(source, { sourceType: 'unambiguous', plugins: ['jsx'] }), branches = {};
function visit(node, ancestors = []) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'JSXElement' && ['TeacherDashboard', 'LearnerProgressView'].includes(node.openingElement.name.name)) {
    const name = node.openingElement.name.name;
    if (branches[name]) throw Error('Duplicate dashboard mount: ' + name);
    const gate = [...ancestors].reverse().find(parent => parent.type === 'JSXExpressionContainer' && parent.expression.type === 'LogicalExpression');
    if (!gate) throw Error('Missing role gate for ' + name);
    branches[name] = { node, gate: source.slice(gate.expression.left.start, gate.expression.left.end), ancestors };
  }
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'start', 'end', 'extra', 'comments', 'tokens'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(child => visit(child, [...ancestors, node]));
    else if (value && typeof value === 'object') visit(value, [...ancestors, node]);
  }
}
visit(tree);
describe('progress workspace placement', () => {
  it('every role combination reaches exactly its intended dashboard', () => {
    for (const teacher of [false, true]) for (const independent of [false, true]) for (const parent of [false, true]) {
      const evaluate = branch => new Function('activeView', 'isTeacherMode', 'isIndependentMode', 'isParentMode', 'return !!(' + branch.gate + ')');
      const t = evaluate(branches.TeacherDashboard), l = evaluate(branches.LearnerProgressView);
      expect(t('dashboard', teacher, independent, parent)).toBe(teacher && !independent && !parent);
      expect(l('dashboard', teacher, independent, parent)).toBe(!teacher || independent || parent);
      expect(Number(t('dashboard', teacher, independent, parent)) + Number(l('dashboard', teacher, independent, parent))).toBe(1);
      expect(t('input', teacher, independent, parent) || l('input', teacher, independent, parent)).toBe(false);
    }
  });
  it('places learner progress inside the main landmark', () => {
    const main = branches.LearnerProgressView.ancestors.find(node => node.type === 'JSXElement' && node.openingElement.name.name === 'main');
    expect(main, 'progress should occupy main, without an empty workspace ahead of it').toBeDefined();
    expect(main.openingElement.attributes.find(attr => attr.name?.name === 'id')?.value?.value).toBe('main-content');
  });
});
