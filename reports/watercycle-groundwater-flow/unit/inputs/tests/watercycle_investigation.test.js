import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { parse } from 'acorn';
const files = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
function kernel(file) {
  const source = readFileSync(file, 'utf8');
  const names = ['wcLandResponse', 'wcInvestigationInputs', 'wcInvestigationSnapshot', 'wcInvestigationChanged', 'wcInvestigationFair'];
  const declarations = new Map();
  let exported = null;
  const pending = [parse(source, { ecmaVersion: 'latest' })];
  while (pending.length) {
    const node = pending.pop();
    if (!node || typeof node !== 'object') continue;
    const declaration = node.type === 'FunctionDeclaration' && names.includes(node.id?.name)
      || node.type === 'VariableDeclarator' && node.id?.name === 'WC_INVESTIGATION_INPUTS';
    if (declaration) {
      if (declarations.has(node.id.name)) throw Error('Duplicate investigation dependency: ' + node.id.name);
      declarations.set(node.id.name, (node.type === 'VariableDeclarator' ? 'var ' : '') + source.slice(node.start, node.end) + ';');
    }
    if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' && !node.left.computed &&
        node.left.object.type === 'Identifier' && node.left.object.name === 'window' && node.left.property.name === 'WaterCycleInvestigationKernel') {
      if (exported) throw Error('Duplicate investigation kernel export');
      exported = source.slice(node.start, node.end) + ';';
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) pending.push(...value);
      else if (value && typeof value === 'object') pending.push(value);
    }
  }
  const required = ['WC_INVESTIGATION_INPUTS', ...names];
  if (!exported || declarations.size !== required.length || required.some(name => !declarations.has(name))) throw Error('Missing actual investigation kernel dependencies');
  const host = {};
  runInNewContext(required.map(name => declarations.get(name)).join('\n') + '\n' + exported, { window: host }, { filename: file + ':investigation-kernel', timeout: 30000 });
  return host.WaterCycleInvestigationKernel;
}
describe.each(files)('Storm-to-stream evidence (%s)', file => {
  const k = kernel(file);
  it('compares cover while holding all other inputs constant', () => {
    const a = k.snapshot(k.inputs({ landCover: 'urban' }));
    const b = k.snapshot({ ...a.inputs, landCover: 'forest' });
    expect(k.fair(a.inputs, b.inputs)).toBe(true);
    expect(b.result.runoff).toBeLessThan(a.result.runoff);
    expect(b.result.infiltration).toBeGreaterThan(a.result.infiltration);
    for (const key of Object.keys(a.inputs).filter(x => x !== 'landCover')) {
      expect(k.fair(a.inputs, { ...b.inputs, [key]: typeof b.inputs[key] === 'number' ? b.inputs[key] + 1 : 'different' })).toBe(false);
    }
    expect(k.fair(a.inputs, a.inputs)).toBe(false);
  });
  it('keeps saved evidence independent of later control changes', () => {
    const input = k.inputs({ landCover: 'urban', landRainIntensity: 22 });
    const sample = k.snapshot(input);
    const recorded = JSON.stringify(sample);
    input.landRainIntensity = 100;
    input.landCover = 'forest';
    expect(JSON.stringify(sample)).toBe(recorded);
    expect(sample.result).toEqual(k.land(sample.inputs));
  });
  it('bounds independent indices and handles invalid numerical input', () => {
    for (const rain of [-10, 0, 55, 100, 200, NaN, Infinity]) {
      const result = k.land({ landRainIntensity: rain });
      for (const n of Object.values(result)) {
        expect(Number.isFinite(n)).toBe(true);
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(100);
      }
    }
  });
});
