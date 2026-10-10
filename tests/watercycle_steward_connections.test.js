import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createContext, Script } from 'node:vm';
import { parse } from 'acorn';

const PATHS = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
const TEST_PATH = 'tests/watercycle_steward_connections.test.js';
const NAMES = ['MAINE_WATERSHED_COMPONENTS', '_wcById', 'STEWARD_FEEDBACK_RULES', 'WCStewardConnections'];
const IDS = ['headwaterStreams', 'riverMainstem', 'floodplainWetlands', 'forestBuffer', 'agriculturalWatershed', 'suburbanEdges'];
const RULE_IDS = ['bufferFeedsHeadwaters', 'beaverHelpsFloodplain', 'agCleansUp', 'runRestoration'];
const sha = value => createHash('sha256').update(value).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value));
const loadedAt = new Date().toISOString();
const loadedTest = readFileSync(TEST_PATH);
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(item => walk(item, visit));
    else if (value && typeof value === 'object') walk(value, visit);
  }
}
const sources = PATHS.map(path => {
  const bytes = readFileSync(path), text = bytes.toString('utf8'), initializers = {};
  let exported = false;
  walk(parse(text, { ecmaVersion: 'latest' }), node => {
    if (node.type === 'VariableDeclarator' && NAMES.includes(node.id?.name)) {
      if (initializers[node.id.name]) throw new Error('Duplicate actual model initializer: ' + node.id.name);
      initializers[node.id.name] = text.slice(node.init.start, node.init.end);
    }
    if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' &&
      node.left.object.name === 'window' && node.left.property.name === 'WaterCycleStewardConnections' &&
      node.right.name === 'WCStewardConnections') exported = true;
  });
  if (Object.keys(initializers).length !== NAMES.length) throw new Error('Missing actual model initializer in ' + path);
  const moduleSource = NAMES.map(name => 'var ' + name + ' = ' + initializers[name] + ';').join('\n') +
    '\n({ helper: WCStewardConnections, rules: STEWARD_FEEDBACK_RULES, definitions: MAINE_WATERSHED_COMPONENTS });';
  const context = createContext({ window: { StemLab: { findById: (list, id) => list.find(item => item?.id === id) || null } } });
  const script = new Script(moduleSource, { filename: path + ':steward-connections' });
  return { path, bytes, text, exported, context, script };
});
afterAll(() => {
  if (process.env.WATER_CYCLE_STEWARD_CONNECTIONS_LOADED_REPORT) writeFileSync(process.env.WATER_CYCLE_STEWARD_CONNECTIONS_LOADED_REPORT, JSON.stringify({
    loadedAt, completedAt: new Date().toISOString(),
    loadedRuntimes: sources.map(source => ({ path: source.path, sha256: sha(source.bytes), bytes: source.bytes.length })),
    loadedTest: { path: TEST_PATH, sha256: sha(loadedTest), bytes: loadedTest.length },
  }, null, 2) + '\n');
});
function each(callback) {
  sources.forEach(source => {
    // Fresh variable initializers isolate each test; the compiled script and VM context are reused.
    const runtime = source.script.runInContext(source.context, { timeout: 30000 });
    callback(runtime, source);
  });
}
function campaign(definitions) {
  return definitions.map(item => ({ id: item.id, ...plain(item.defaultState) }));
}
function component(list, id) { return list.find(item => item.id === id); }
function row(helper, list, id, preview) { return helper.describe(list, preview).find(item => item.id === id); }
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

describe('Water Cycle Steward connected effects: actual yearly model', () => {
  it('loads the helper, canonical six components, and existing rules from both shipped files', () => {
    expect(sha(sources[0].bytes)).toBe(sha(sources[1].bytes));
    each(({ helper, rules, definitions }, source) => {
      expect(source.exported).toBe(true);
      expect(Object.keys(helper)).toEqual(['describe']);
      expect(Array.from(definitions, item => item.id)).toEqual(IDS);
      expect(Array.from(rules, item => item.id)).toEqual(RULE_IDS);
      const rows = helper.describe(campaign(definitions));
      expect(Array.from(rows, item => item.id)).toEqual(RULE_IDS);
      expect(rows.every(item => typeof item.title === 'string' && item.title.length > 0)).toBe(true);
      expect(rows.every(item => item.previewStatus === null)).toBe(true);
    });
  });

  it.each([
    ['bufferFeedsHeadwaters', 'forestBuffer', 'quality', 70],
    ['beaverHelpsFloodplain', 'floodplainWetlands', 'quality', 60],
    ['agCleansUp', 'agriculturalWatershed', 'quality', 60],
  ])('%s requires a score strictly above its actual threshold', (id, target, field, threshold) => {
    each(({ helper, rules, definitions }) => {
      const list = campaign(definitions), actual = rules.find(rule => rule.id === id);
      for (const [value, expected] of [[0, 'unmet'], [threshold, 'unmet'], [threshold + 0.001, 'met'], [100, 'met']]) {
        component(list, target)[field] = value;
        const result = row(helper, list, id);
        expect(result.status).toBe(expected);
        expect(result.status === 'met').toBe(actual.when(list));
        expect(plain(result.conditions)).toEqual([{ componentId: target, field, threshold, value,
          met: expected === 'met', previewValue: null, previewMet: null }]);
      }
    });
  });

  it('requires both river connectivity and forest quality above 60 for fish restoration', () => {
    each(({ helper, rules, definitions }) => {
      const list = campaign(definitions), actual = rules.find(rule => rule.id === 'runRestoration');
      for (const [connectivity, quality, status] of [[60, 60, 'unmet'], [60.001, 60, 'unmet'], [60, 60.001, 'unmet'], [60.001, 60.001, 'met']]) {
        component(list, 'riverMainstem').connectivity = connectivity;
        component(list, 'forestBuffer').quality = quality;
        const result = row(helper, list, 'runRestoration');
        expect(result.status).toBe(status);
        expect(result.status === 'met').toBe(actual.when(list));
        expect(Array.from(result.conditions, condition => condition.value)).toEqual([connectivity, quality]);
        expect(Array.from(result.conditions, condition => condition.met)).toEqual([connectivity > 60, quality > 60]);
      }
    });
  });

  it('obtains status by calling each existing predicate and never calls apply', () => {
    each(({ helper, rules, definitions }) => {
      const list = campaign(definitions), preview = plain(list), calls = [];
      rules.forEach(rule => {
        const original = rule.when;
        rule.when = input => { calls.push({ id: rule.id, input }); return original(input); };
        rule.apply = () => { throw new Error('Inspecting must not apply yearly effects'); };
      });
      helper.describe(list, preview);
      expect(calls).toHaveLength(8);
      for (const id of RULE_IDS) expect(calls.filter(call => call.id === id).map(call => call.input)).toEqual([list, preview]);
    });
  });

  it('matches all actual predicates across combinations of valid scores', () => {
    each(({ helper, rules, definitions }) => {
      const list = campaign(definitions);
      for (const value of [0, 60, 60.001, 70, 70.001, 100]) {
        for (const connectivity of [0, 60, 60.001, 100]) {
          list.forEach(item => { item.quality = value; item.connectivity = connectivity; });
          helper.describe(list).forEach(result => {
            expect(result.status).toBe(rules.find(rule => rule.id === result.id).when(list) ? 'met' : 'unmet');
          });
        }
      }
    });
  });

  it('describes the real effect fields, targets and nominal increments', () => {
    each(({ helper, rules, definitions }) => {
      const list = campaign(definitions);
      list.forEach(item => { item.quality = 80; item.connectivity = 80; item.support = 50; });
      const rows = helper.describe(list);
      expect(plain(rows).map(item => item.effects)).toEqual([
        [{ targetId: 'headwaterStreams', field: 'quality', delta: 4 }],
        [{ targetId: 'riverMainstem', field: 'quality', delta: 3 }, { targetId: 'riverMainstem', field: 'connectivity', delta: 2 }],
        [{ targetId: 'riverMainstem', field: 'quality', delta: 4 }],
        IDS.map(targetId => ({ targetId, field: 'support', delta: 2 })),
      ]);
      rows.forEach(result => {
        const changed = plain(list);
        rules.find(rule => rule.id === result.id).apply(changed);
        result.effects.forEach(effect => expect(component(changed, effect.targetId)[effect.field] - component(list, effect.targetId)[effect.field]).toBe(effect.delta));
        expect(Array.from(result.targetIds)).toEqual([...new Set(result.effects.map(effect => effect.targetId))]);
        expect(Array.from(result.sourceIds)).toEqual([...new Set(result.conditions.map(condition => condition.componentId))]);
      });
    });
  });

  it('does not mutate frozen campaign scores, budgets, receipts or feedback rules', () => {
    each(({ helper, rules, definitions }) => {
      const state = freeze({ components: campaign(definitions), hoursLeft: 18, yearActions: [], year: 1 });
      const preview = freeze(plain(state.components)), before = JSON.stringify(state), ruleFunctions = rules.map(rule => [rule.when, rule.apply]);
      freeze(rules);
      helper.describe(state.components, preview);
      helper.describe(state.components);
      expect(JSON.stringify(state)).toBe(before);
      expect(rules.map(rule => [rule.when, rule.apply])).toEqual(ruleFunctions);
      expect(state.hoursLeft).toBe(18); expect(state.yearActions).toEqual([]);
    });
  });

  it('returns independent descriptors so edits to a result cannot change later inspection', () => {
    each(({ helper, definitions }) => {
      const list = campaign(definitions), initial = plain(helper.describe(list)), altered = helper.describe(list);
      altered[0].sourceIds.push('forged'); altered[0].conditions[0].threshold = -1;
      altered[0].effects[0].delta = 900; altered[3].targetIds.length = 0;
      expect(plain(helper.describe(list))).toEqual(initial);
    });
  });
});

describe('Water Cycle Steward connected effects: honest missing evidence and previews', () => {
  it.each([['missing', undefined], ['null', null], ['NaN', NaN], ['positive infinity', Infinity],
    ['negative infinity', -Infinity], ['below scale', -1], ['above scale', 101], ['numeric string', '71'],
    ['boolean', true], ['object', {}], ['array', []]])('does not coerce an invalid source score: %s', (_label, value) => {
    each(({ helper, definitions }) => {
      const list = campaign(definitions);
      component(list, 'forestBuffer').quality = value;
      const result = row(helper, list, 'bufferFeedsHeadwaters');
      expect(result.status).toBe('unknown'); expect(result.conditions[0].value).toBeNull(); expect(result.conditions[0].met).toBeNull();
    });
  });

  it('marks missing, duplicate and malformed required source components unknown', () => {
    each(({ helper, definitions }) => {
      for (const mode of ['missing', 'duplicate', 'array', 'inherited-id', 'inherited-score']) {
        const list = campaign(definitions), source = component(list, 'forestBuffer');
        if (mode === 'missing') list.splice(list.indexOf(source), 1);
        if (mode === 'duplicate') list.push({ ...source });
        if (mode === 'array') list[list.indexOf(source)] = Object.assign([], source);
        if (mode === 'inherited-id') list[list.indexOf(source)] = Object.assign(Object.create({ id: source.id }), { quality: 90 });
        if (mode === 'inherited-score') list[list.indexOf(source)] = Object.assign(Object.create({ quality: 90 }), { id: source.id });
        const result = row(helper, list, 'bufferFeedsHeadwaters');
        expect(result.status, mode).toBe('unknown'); expect(result.conditions[0].value, mode).toBeNull();
      }
    });
  });

  it('does not invent a benefit when an affected target is missing, duplicated or malformed', () => {
    each(({ helper, definitions }) => {
      for (const mode of ['missing', 'duplicate', 'invalid']) {
        const list = campaign(definitions), target = component(list, 'headwaterStreams');
        component(list, 'forestBuffer').quality = 90;
        if (mode === 'missing') list.splice(list.indexOf(target), 1);
        if (mode === 'duplicate') list.push({ ...target });
        if (mode === 'invalid') target.quality = '50';
        const result = row(helper, list, 'bufferFeedsHeadwaters');
        expect(result.conditions[0].met).toBe(true);
        expect(result.status, mode).toBe('unknown');
      }
    });
  });

  it('requires unambiguous support evidence for every actual restoration target', () => {
    each(({ helper, definitions }) => {
      const list = campaign(definitions);
      component(list, 'riverMainstem').connectivity = 90; component(list, 'forestBuffer').quality = 90;
      IDS.forEach(id => {
        const broken = plain(list); component(broken, id).support = null;
        expect(row(helper, broken, 'runRestoration').status, id).toBe('unknown');
      });
    });
  });

  it('rejects an inherited-ID entry before it can shadow the canonical component in a real predicate', () => {
    each(({ helper, rules, definitions }) => {
      const list = campaign(definitions);
      component(list, 'forestBuffer').quality = 58;
      list.unshift(Object.create({ id: 'forestBuffer', quality: 80 }));
      // The legacy predicate would select the inherited entry first.
      expect(rules.find(rule => rule.id === 'bufferFeedsHeadwaters').when(list)).toBe(true);
      const result = row(helper, list, 'bufferFeedsHeadwaters');
      expect(result.conditions[0]).toMatchObject({ value: 58, met: false });
      expect(result.status).toBe('unknown');
      expect(helper.describe(list).every(item => item.status === 'unknown')).toBe(true);
    });
  });

  it('does not pass a stray accessor ID to any legacy rule predicate', () => {
    each(({ helper, rules, definitions }) => {
      const list = campaign(definitions), stray = {};
      Object.defineProperty(stray, 'id', { get() { throw new Error('Do not execute saved ID accessors'); } });
      list.unshift(stray);
      rules.forEach(rule => { rule.when = () => { throw new Error('Unsafe raw list must not reach a predicate'); }; });
      const result = helper.describe(list);
      expect(result.every(item => item.status === 'unknown')).toBe(true);
      expect(result.every(item => item.conditions.every(condition => condition.value !== null))).toBe(true);
    });
  });

  it('does not execute accessor fields while inspecting saved scores', () => {
    each(({ helper, definitions }) => {
      const list = campaign(definitions);
      Object.defineProperty(component(list, 'forestBuffer'), 'quality', { get() { throw new Error('Do not execute saved accessors'); } });
      expect(row(helper, list, 'bufferFeedsHeadwaters').status).toBe('unknown');
    });
  });

  it('returns all four unknown descriptors for absent or non-array components', () => {
    each(({ helper }) => {
      for (const list of [undefined, null, {}, 'components', []]) {
        const rows = helper.describe(list);
        expect(Array.from(rows, item => item.id)).toEqual(RULE_IDS);
        expect(rows.every(item => item.status === 'unknown')).toBe(true);
        expect(rows.every(item => item.conditions.every(condition => condition.value === null && condition.met === null))).toBe(true);
      }
    });
  });

  it('keeps current and preview predicates and score readings independent', () => {
    each(({ helper, definitions }) => {
      const list = campaign(definitions), preview = plain(list);
      component(list, 'forestBuffer').quality = 70; component(preview, 'forestBuffer').quality = 71;
      const result = row(helper, list, 'bufferFeedsHeadwaters', preview);
      expect(result.status).toBe('unmet'); expect(result.previewStatus).toBe('met');
      expect(result.conditions[0]).toMatchObject({ value: 70, met: false, previewValue: 71, previewMet: true });
      expect(row(helper, preview, 'bufferFeedsHeadwaters', list)).toMatchObject({ status: 'met', previewStatus: 'unmet' });
      component(list, 'forestBuffer').quality = null;
      expect(row(helper, list, 'bufferFeedsHeadwaters', preview)).toMatchObject({ status: 'unknown', previewStatus: 'met' });
      component(list, 'forestBuffer').quality = 71; component(preview, 'forestBuffer').quality = null;
      expect(row(helper, list, 'bufferFeedsHeadwaters', preview)).toMatchObject({ status: 'met', previewStatus: 'unknown' });
    });
  });

  it('accepts reordered matching campaign components but rejects mismatched preview IDs', () => {
    each(({ helper, definitions }) => {
      const list = campaign(definitions), preview = plain(list).reverse();
      expect(helper.describe(list, preview).every(item => item.previewStatus === item.status)).toBe(true);
      for (const invalid of [[], {}, 'preview', preview.slice(1), preview.concat([plain(preview[0])]),
        preview.map((item, index) => index === 0 ? { ...item, id: 'invented' } : item)]) {
        const rows = helper.describe(list, invalid);
        expect(rows.every(item => item.previewStatus === 'unknown')).toBe(true);
        expect(rows.every(item => item.conditions.every(condition => condition.previewValue === null && condition.previewMet === null))).toBe(true);
        expect(Array.from(rows, item => item.status)).toEqual(Array.from(helper.describe(list), item => item.status));
      }
    });
  });

  it('treats omitted or null preview as no inspected action', () => {
    each(({ helper, definitions }) => {
      const list = campaign(definitions);
      for (const preview of [undefined, null]) {
        expect(helper.describe(list, preview).every(item => item.previewStatus === null)).toBe(true);
      }
    });
  });
});
