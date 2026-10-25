import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { parse } from 'acorn';

const SOURCE_PATH = 'stem_lab/stem_tool_watercycle.js';
const MIRROR_PATH = 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js';
// Freeze reference re-baselined 2026-10-16 to the accepted runtime (sha 9498b155, incl. the dark-chip contrast fix and air-band direction words): later
// published passes (585a61ba2, 79e3e5eae) changed preserved declarations on purpose. The original
// pass baseline remains at reports/watercycle-cloud-evidence/baseline-runtime.js.
const BASELINE_PATH = 'tests/fixtures/regression/watercycle-freeze-reference/accepted-runtime.js';
const BASELINE_SHA = '9498b1556f44b12bcb562e7507beccfcfc211fdcf721c4615892ad3c197de84d';
const PRESERVED = [
  'WC_CLOUD_GUIDE', 'WC_CLOUD_COMPARISONS', 'wcCloudGuideDrawing',
  'WC_PRECIP_DEFAULTS', 'WC_PRECIP_PRESETS', 'normalizeWcPrecipConfig',
  'wcPrecipTemperatureAt', 'buildWcPrecipThermalStructure', 'computeWcPrecipitationModel',
  'wcPrecipPhaseAtTransitions', 'wcPrecipPhaseFromModel', 'wcPrecipPhaseAt',
  'WC_PRECIP_EXPERIMENT_INPUTS', 'wcPrecipSetupSnapshot', 'wcPrecipExperimentValue', 'wcPrecipExperiment',
  'setIQ', 'setPrecipControl', 'setPrecipViewMode', 'setPrecipCameraFocus',
  'applyPrecipPreset', 'resetPrecipLab', 'logPrecipObservation', 'openPrecipitationIn3d',
  'precipCanvasRef', 'precip3dRef', 'canvasRef', 'journey3dRef',
  'iqStored', 'iq', 'precipModel', 'precipConfig',
  'WATER_CYCLE_PRESETS', 'WCProcessCompare', 'WCJourneyChapters', 'WCCheckInvestigation',
  'wcQuizBank', 'wcQuizQuestion', 'checkWaterCycleChallenges',
];
const sha = value => createHash('sha256').update(value).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value));
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
function walkNodes(tree, visit) {
  const pending = [tree];
  while (pending.length) {
    const node = pending.pop();
    if (!node || typeof node !== 'object') continue;
    visit(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) pending.push(...value);
      else if (value && typeof value === 'object') pending.push(value);
    }
  }
}
// Reviewed visual exception: retain every byte of the canvas outside this
// decorative block, and permit only local calculations and canvas paint calls.
function reviewedPoreDecoration(block) {
  const tree = parse(block, { ecmaVersion: 'latest' });
  const locals = new Set();
  walkNodes(tree, node => {
    if (node.type === 'VariableDeclarator') {
      if (node.id.type !== 'Identifier') throw new Error('Pore decoration has a nonlocal binding');
      locals.add(node.id.name);
    }
  });
  const reads = new Set(['ctx', 'cW', 'cH', 'soilTop2d', 'waterTable2d', 'isDark', 'dpr', 'Math']);
  const paints = new Set(['beginPath', 'arc', 'fill', 'save', 'clip', 'fillRect', 'restore']);
  function visit(node, parent, key) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Identifier') {
      const property = parent && parent.type === 'MemberExpression' && key === 'property' && !parent.computed;
      if (!property && !locals.has(node.name) && !reads.has(node.name)) throw new Error('Pore decoration reads non-drawing state: ' + node.name);
    }
    if (['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression', 'NewExpression', 'AwaitExpression', 'YieldExpression', 'ReturnStatement', 'ThrowStatement', 'WithStatement', 'ImportExpression', 'ThisExpression', 'Super'].includes(node.type) || node.type === 'UnaryExpression' && node.operator === 'delete') throw new Error('Pore decoration contains a non-paint operation');
    if (node.type === 'MemberExpression' && node.object.type === 'Identifier' && ['ctx', 'Math'].includes(node.object.name)) {
      if (node.computed || !(node.object.name === 'ctx' ? paints.has(node.property.name) || node.property.name === 'fillStyle' : node.property.name === 'PI')) throw new Error('Pore decoration accesses a non-paint resource');
    }
    if (node.type === 'CallExpression') {
      const call = node.callee;
      if (call.type !== 'MemberExpression' || call.computed || call.object.type !== 'Identifier' ||
          !(call.object.name === 'ctx' && paints.has(call.property.name))) throw new Error('Pore decoration calls a non-paint operation');
    }
    if (node.type === 'AssignmentExpression' || node.type === 'UpdateExpression') {
      const target = node.left || node.argument;
      const local = target.type === 'Identifier' && locals.has(target.name);
      const paint = target.type === 'MemberExpression' && !target.computed && target.object.type === 'Identifier' &&
        target.object.name === 'ctx' && ['fillStyle'].includes(target.property.name);
      if (!local && !paint) throw new Error('Pore decoration writes non-drawing state');
    }
    for (const [childKey, value] of Object.entries(node)) {
      if (Array.isArray(value)) value.forEach(child => visit(child, node, childKey));
      else if (value && typeof value === 'object') visit(value, node, childKey);
    }
  }
  visit(tree, null, '');
}
function normalizeReviewedCanvas(value) {
  const current = '// Groundwater pore illustration: begin.';
  const legacy = '// Pore spaces.';
  const finish = '// Groundwater pore illustration: end.';
  const parent = '// Parent material:';
  const marker = value.includes(current) ? current : legacy;
  const start = value.indexOf(marker), end = value.indexOf(parent, start);
  if (start < 0 || end <= start || value.indexOf(marker, start + marker.length) !== -1 || value.indexOf(parent, end + parent.length) !== -1) throw new Error('Missing or duplicate reviewed pore boundary');
  if (marker === current) {
    const close = value.indexOf(finish, start);
    if (close <= start || close > end || value.indexOf(finish, close + finish.length) !== -1 || value.slice(close + finish.length, end).trim()) throw new Error('Pore decoration boundary includes other canvas code');
  }
  reviewedPoreDecoration(value.slice(start, end));
  return value.slice(0, start) + '// Reviewed groundwater pore decoration.\n                ' + value.slice(end);
}
function normalizeReviewedCheckPores(value) {
  if (sha(value) === '01c29df93cf3cbccb62e6f3190d079d2fb8b6ecd0697c3b9f84a98360f166fb5') return 'Reviewed groundwater Check adapter';
  const body = parse(value, { ecmaVersion: 'latest' }).body;
  const fn = body[0], statement = fn && fn.body && fn.body.body[0];
  const call = statement && statement.argument;
  if (body.length !== 1 || fn.type !== 'FunctionDeclaration' || fn.id.name !== 'renderWcCheckPores' || fn.params.length || fn.async || fn.generator ||
      fn.body.body.length !== 1 || statement.type !== 'ReturnStatement' || !call || call.type !== 'CallExpression' ||
      call.callee.type !== 'Identifier' || call.callee.name !== 'renderWcGroundwaterLens' || call.arguments.length !== 1 ||
      call.arguments[0].type !== 'Literal' || call.arguments[0].value !== 'check') throw new Error('Check pores must be only the reviewed unscored adapter');
  return 'Reviewed groundwater Check adapter';
}
function productionNodes(text) {
  const normalized = text.replace(/\r\n/g, '\n');
  const result = {};
  walkNodes(parse(normalized, { ecmaVersion: 'latest' }), node => {
    const name = ['FunctionDeclaration', 'VariableDeclarator'].includes(node.type) && node.id && node.id.name;
    if (!PRESERVED.includes(name)) return;
    if (result[name]) throw new Error('Non-unique production anchor: ' + name);
    const value = normalized.slice(node.start, node.end);
      result[name] = name === 'canvasRef' ? normalizeReviewedCanvas(value) : name === 'renderWcCheckPores' ? normalizeReviewedCheckPores(value) : value;
  });
  return result;
}
function scoredNodes(text) {
  const normalized = text.replace(/\r\n/g, '\n');
  const result = {};
  walkNodes(parse(normalized, { ecmaVersion: 'latest' }), node => {
    if (!['FunctionExpression', 'ArrowFunctionExpression'].includes(node.type) || node.body.type !== 'BlockStatement') return;
    const localNames = node.body.body.filter(statement => statement.type === 'VariableDeclaration').flatMap(statement => statement.declarations.map(declaration => declaration.id.name));
    let kind;
    if (localNames.includes('newStreak') && localNames.includes('nextQuizCorrectCount')) kind = 'quiz';
    else if (localNames.includes('nextMythsDone')) kind = 'myth';
    else return;
    if (result[kind]) throw new Error('Non-unique scored callback: ' + kind);
    result[kind] = node.body.body.filter(statement => {
      const value = normalized.slice(statement.start, statement.end);
      return /\b(newStreak|newAttempts|nextQuizCorrectCount|nextMythsDone|nextState)\b/.test(value) ||
        statement.type === 'IfStatement' && /awardStemXP/.test(value) ||
        statement.type === 'ExpressionStatement' && statement.expression.type === 'CallExpression' && statement.expression.callee.name === 'updMulti';
    }).map(statement => normalized.slice(statement.start, statement.end)).join('\n');
  });
  return result;
}
function fullDerivations(text) {
  const normalized = text.replace(/\r\n/g, '\n');
  const ranges = [
    ['comparison', 'var wcScenarioBaseline = d.wcScenarioBaseline || null;', 'var wcRouteBaselineActive'],
    ['signal', 'var wcCausalStageIds = [];', 'var wcDataTrailStatus'],
  ];
  return Object.fromEntries(ranges.map(([name, startMarker, endMarker]) => {
    const start = normalized.indexOf(startMarker), end = normalized.indexOf(endMarker, start);
    if (start < 0 || end <= start) throw new Error('Missing derivation range: ' + name);
    return [name, normalized.slice(start, end)];
  }));
}
export const waterCycleCloudEvidenceVerification = {
  baselinePath: BASELINE_PATH, baselineSha: BASELINE_SHA, preservedNames: PRESERVED,
  productionNodes, scoredNodes, fullDerivations,
};

const sources = [SOURCE_PATH, MIRROR_PATH].map(path => ({ path, bytes: readFileSync(path), text: readFileSync(path, 'utf8') }));
const baselineBytes = readFileSync(BASELINE_PATH);
const loadedTestBytes = readFileSync('tests/watercycle_cloud_evidence.test.js');
afterAll(() => {
  if (process.env.WATER_CYCLE_CLOUD_EVIDENCE_LOADED_REPORT) {
    writeFileSync(process.env.WATER_CYCLE_CLOUD_EVIDENCE_LOADED_REPORT, JSON.stringify({
      loadedRuntimes: sources.map(source => ({ path: source.path, sha256: sha(source.text) })),
      loadedTest: { path: 'tests/watercycle_cloud_evidence.test.js', sha256: sha(loadedTestBytes) },
    }, null, 2) + '\n');
  }
});
function loadHelper(source) {
  const initializers = {};
  walkNodes(parse(source.text, { ecmaVersion: 'latest' }), node => {
    if (node.type !== 'VariableDeclarator' || !node.id || !['WC_CLOUD_COMPARISONS', 'WCCloudEvidence'].includes(node.id.name)) return;
    if (initializers[node.id.name]) throw new Error('Duplicate helper initializer');
    initializers[node.id.name] = source.text.slice(node.init.start, node.init.end);
  });
  if (Object.keys(initializers).length !== 2) throw new Error('Missing actual cloud evidence helper in ' + source.path);
  return { path: source.path, ...runInNewContext(
    'var WC_CLOUD_COMPARISONS = ' + initializers.WC_CLOUD_COMPARISONS + ';\n' +
    'var WCCloudEvidence = ' + initializers.WCCloudEvidence + ';\n' +
    '({ bank: WC_CLOUD_COMPARISONS, helper: WCCloudEvidence });',
    {}, { filename: source.path + ':cloud-evidence', timeout: 1000 }
  ) };
}
const shipped = sources.map(loadHelper);
function each(callback) { shipped.forEach(({ path, bank, helper }) => callback(helper, bank, path)); }
const IDS = ['towers', 'low-layers', 'rain-layers', 'high-ice', 'cloudlets'];

describe('Water Cycle cloud evidence: canonical comparison identity', () => {
  it('loads the actual helper and five production pairs from both shipped files', () => {
    each((helper, bank) => {
      expect(Object.keys(helper).sort()).toEqual(['key', 'normalize', 'note', 'write']);
      expect(plain(bank).map(pair => pair.id)).toEqual(IDS);
      const keys = bank.map(pair => helper.key(pair));
      expect(keys.every(key => typeof key === 'string' && key.length > 0)).toBe(true);
      expect(new Set(keys).size).toBe(5);
    });
  });
  it.each(IDS)('retains %s identity across fresh saved copies', id => {
    each((helper, bank) => {
      const pair = bank.find(item => item.id === id);
      expect(helper.key(freeze(plain(pair)))).toBe(helper.key(pair));
      const labelOnly = { ...plain(pair), label: 'A display label', hint: 'A display hint', reason: 'A display explanation' };
      expect(helper.key(labelOnly)).toBe(helper.key(pair));
    });
  });
  it.each(['id', 'clouds', 'question', 'answer'])('rejects a saved pair whose %s no longer matches its canonical identity', field => {
    each((helper, bank) => {
      for (const pair of bank) {
        const changed = plain(pair);
        changed[field] = field === 'clouds' ? [...changed.clouds].reverse() : changed[field] + ' changed';
        expect(helper.key(changed)).toBe('');
        expect(plain(helper.note({}, changed))).toEqual({ observation: '', uncertainty: '' });
      }
    });
  });
  it('rejects absent, unknown, and malformed pair identities', () => {
    each((helper, bank) => {
      const pair = plain(bank[0]);
      const malformed = [undefined, null, true, 7, pair.id, [], {}, { ...pair, id: 'unknown' },
        { ...pair, clouds: null }, { ...pair, clouds: [pair.clouds[0]] }, { ...pair, clouds: pair.clouds.join(',') },
        { ...pair, question: null }, { ...pair, answer: undefined }];
      for (const value of malformed) expect(helper.key(value)).toBe('');
    });
  });
  it('safely rejects cyclic, BigInt, and nonstring cloud array members', () => {
    each((helper, bank) => {
      const pair = plain(bank[0]);
      const cyclic = [pair.clouds[0]]; cyclic.push(cyclic);
      const sparse = new Array(2); sparse[0] = pair.clouds[0];
      for (const clouds of [cyclic, [pair.clouds[0], 1n], [pair.clouds[0], {}],
        [pair.clouds[0], null], [pair.clouds[0], undefined], [...pair.clouds, 'extra'], sparse, new Array(2)]) {
        let result;
        expect(() => { result = helper.key({ ...pair, clouds }); }).not.toThrow();
        expect(result).toBe('');
      }
    });
  });
});

describe('Water Cycle cloud evidence: recoverable learner writing', () => {
  it('normalizes malformed note bags to an empty object', () => {
    each(helper => {
      for (const value of [undefined, null, true, 4, 'notes', [], ['note'], { unknown: { observation: 'Ignore this.' } }]) {
        expect(plain(helper.normalize(value))).toEqual({});
      }
    });
  });
  it('keeps only canonical keys and known string fields', () => {
    each((helper, bank) => {
      const first = helper.key(bank[0]), second = helper.key(bank[1]);
      const input = freeze({ [first]: { observation: 'Trace the anvil.', uncertainty: 2, ignored: 'extra' },
        [second]: { uncertainty: 'Check another sky photograph.', observation: null },
        unknown: { observation: 'Ignore.' } });
      expect(plain(helper.normalize(input))).toEqual({ [first]: { observation: 'Trace the anvil.', uncertainty: '' },
        [second]: { observation: '', uncertainty: 'Check another sky photograph.' } });
    });
  });
  it('omits malformed and empty entries without inventing learner notes', () => {
    each((helper, bank) => {
      for (const value of [null, true, 3, 'text', [], {}, { observation: '', uncertainty: '' },
        { observation: false, uncertainty: {} }, { ignored: 'text' }]) {
        expect(plain(helper.normalize({ [helper.key(bank[0])]: value }))).toEqual({});
      }
    });
  });
  it('ignores inherited pair entries and inherited note fields', () => {
    each((helper, bank) => {
      const key = helper.key(bank[0]);
      const inheritedPair = Object.create({ [key]: { observation: 'Inherited pair', uncertainty: '' } });
      expect(plain(helper.normalize(inheritedPair))).toEqual({});
      const inheritedFields = Object.create({ observation: 'Inherited observation', uncertainty: 'Inherited uncertainty' });
      expect(plain(helper.normalize({ [key]: inheritedFields }))).toEqual({});
      const partlyOwn = Object.assign(Object.create({ observation: 'Inherited observation' }), { uncertainty: 'Own uncertainty' });
      expect(plain(helper.normalize({ [key]: partlyOwn }))).toEqual({ [key]: { observation: '', uncertainty: 'Own uncertainty' } });
    });
  });
  it('clips saved strings to the independent observation and uncertainty limits', () => {
    each((helper, bank) => {
      const key = helper.key(bank[0]);
      const result = helper.normalize({ [key]: { observation: 'a'.repeat(900), uncertainty: 'b'.repeat(700) } });
      expect(result[key].observation).toBe('a'.repeat(800));
      expect(result[key].uncertainty).toBe('b'.repeat(600));
    });
  });
  it('preserves multiline writing and returns independent copies', () => {
    each((helper, bank) => {
      const key = helper.key(bank[0]);
      const input = freeze({ [key]: { observation: 'Rounded base\nSpreading top', uncertainty: 'A photograph may show more detail.' } });
      const normalized = helper.normalize(input);
      expect(plain(normalized)).toEqual(input);
      expect(normalized).not.toBe(input);
      expect(normalized[key]).not.toBe(input[key]);
      normalized[key].observation = 'Changed output only';
      expect(input[key].observation).toBe('Rounded base\nSpreading top');
    });
  });
  it('returns fresh blank field values when a known pair has no saved note', () => {
    each((helper, bank) => {
      const first = helper.note({}, bank[0]), second = helper.note({}, bank[0]);
      expect(plain(first)).toEqual({ observation: '', uncertainty: '' });
      expect(first).not.toBe(second);
      first.observation = 'Changed one return value';
      expect(second.observation).toBe('');
    });
  });
  it('returns a fresh selected note without exposing the saved object', () => {
    each((helper, bank) => {
      const key = helper.key(bank[0]);
      const input = freeze({ [key]: { observation: 'Evidence', uncertainty: 'Question' } });
      const result = helper.note(input, bank[0]);
      expect(plain(result)).toEqual(input[key]);
      expect(result).not.toBe(input[key]);
      result.uncertainty = 'Changed return value';
      expect(input[key].uncertainty).toBe('Question');
    });
  });
  it.each(IDS)('round-trips independent writing for %s while keeping the other comparisons', id => {
    each((helper, bank) => {
      let input = {};
      for (const pair of bank) {
        input = helper.write(input, pair, 'observation', 'Observed ' + pair.id);
        input = helper.write(input, pair, 'uncertainty', 'Ask about ' + pair.id);
      }
      freeze(input);
      const selected = bank.find(pair => pair.id === id);
      const changed = helper.write(input, selected, 'observation', 'Revised ' + id);
      expect(plain(helper.note(changed, selected))).toEqual({ observation: 'Revised ' + id, uncertainty: 'Ask about ' + id });
      for (const pair of bank.filter(pair => pair.id !== id)) {
        expect(plain(helper.note(changed, pair))).toEqual({ observation: 'Observed ' + pair.id, uncertainty: 'Ask about ' + pair.id });
      }
      expect(helper.note(input, selected).observation).toBe('Observed ' + id);
      expect(changed).not.toBe(input);
    });
  });
  it('ignores unknown fields and nonstring writes without altering valid saved notes', () => {
    each((helper, bank) => {
      const key = helper.key(bank[0]), input = freeze({ [key]: { observation: 'Keep evidence.', uncertainty: 'Keep question.' } });
      for (const text of [undefined, null, true, 3, {}, [], new String('wrapped')]) {
        expect(plain(helper.write(input, bank[0], 'observation', text))).toEqual(input);
      }
      for (const field of [undefined, null, '', 'answer', 'score', '__proto__']) {
        expect(plain(helper.write(input, bank[0], field, 'Ignore this.'))).toEqual(input);
      }
    });
  });
  it('does not attach writing to unknown or changed comparison content', () => {
    each((helper, bank) => {
      const key = helper.key(bank[0]), input = freeze({ [key]: { observation: 'Keep evidence.', uncertainty: '' } });
      const changed = { ...plain(bank[0]), question: bank[0].question + ' different' };
      for (const pair of [null, {}, { ...plain(bank[0]), id: 'unknown' }, changed]) {
        expect(plain(helper.write(input, pair, 'observation', 'Wrong identity.'))).toEqual(input);
      }
    });
  });
  it('clears one field while retaining the other field and another pair', () => {
    each((helper, bank) => {
      const first = helper.key(bank[0]), second = helper.key(bank[1]);
      const input = freeze({ [first]: { observation: 'Evidence', uncertainty: 'Question' },
        [second]: { observation: 'Other pair', uncertainty: '' } });
      const result = helper.write(input, bank[0], 'observation', '');
      expect(plain(result)).toEqual({ [first]: { observation: '', uncertainty: 'Question' },
        [second]: { observation: 'Other pair', uncertainty: '' } });
      expect(input[first].observation).toBe('Evidence');
    });
  });
  it('removes the selected entry only when both note fields are empty', () => {
    each((helper, bank) => {
      const first = helper.key(bank[0]), second = helper.key(bank[1]);
      const input = freeze({ [first]: { observation: '', uncertainty: 'Question' },
        [second]: { observation: 'Other pair', uncertainty: '' } });
      expect(plain(helper.write(input, bank[0], 'uncertainty', ''))).toEqual({ [second]: { observation: 'Other pair', uncertainty: '' } });
      expect(Object.hasOwn(input, first)).toBe(true);
    });
  });
  it('clips writes and normalizes unrelated malformed entries in a pure copy', () => {
    each((helper, bank) => {
      const first = helper.key(bank[0]), second = helper.key(bank[1]);
      const input = freeze({ [second]: { observation: 'Keep other pair', uncertainty: '' }, unknown: { observation: 'Ignore' } });
      let result = helper.write(input, bank[0], 'observation', 'a'.repeat(801));
      result = helper.write(result, bank[0], 'uncertainty', 'b'.repeat(601));
      expect(plain(result)).toEqual({ [first]: { observation: 'a'.repeat(800), uncertainty: 'b'.repeat(600) },
        [second]: { observation: 'Keep other pair', uncertainty: '' } });
      expect(Object.hasOwn(input, 'unknown')).toBe(true);
    });
  });
});

describe('Water Cycle cloud evidence: original science, engines, and scoring', () => {
  it('pins the frozen baseline and identical shipped runtime bytes', () => {
    expect(sha(baselineBytes)).toBe(BASELINE_SHA);
    expect(sha(sources[0].bytes)).toBe(sha(sources[1].bytes));
  });
  it('preserves both cloud banks, precipitation calculations and controls, engine refs, and cross-mode helpers', () => {
    const baseline = productionNodes(baselineBytes.toString('utf8'));
    expect(Object.keys(baseline).sort()).toEqual([...PRESERVED].sort());
    for (const source of sources) expect(productionNodes(source.text), source.path).toEqual(baseline);
  });
  it('preserves the actual first-answer quiz and myth scoring statements', () => {
    const baseline = scoredNodes(baselineBytes.toString('utf8'));
    expect(Object.keys(baseline).sort()).toEqual(['myth', 'quiz']);
    expect(Object.values(baseline).every(value => value.includes('updMulti') && value.includes('awardStemXP'))).toBe(true);
    for (const source of sources) expect(scoredNodes(source.text), source.path).toEqual(baseline);
  });
  it('preserves the complete comparison and signal derivation ranges', () => {
    const baseline = fullDerivations(baselineBytes.toString('utf8'));
    expect(Object.keys(baseline).sort()).toEqual(['comparison', 'signal']);
    for (const source of sources) expect(fullDerivations(source.text), source.path).toEqual(baseline);
  });
});
