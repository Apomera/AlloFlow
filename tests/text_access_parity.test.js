// Lane N2 (2026-09-28, Katie Novak follow-up). Every planner path must apply
// the same text-access rule: when a standard requires grade-level text, the
// DEFAULT is no adapted companion (source 'standard'); an educator's
// include/omit is kept; a default the workflow or a standard made earlier is
// derived again. InstructionalContext (browser, Full Pack) is the reference.
// This file fails if the headless mirror in agent_core_contracts_module.js
// (Blueprint drafts, the MCP agent) or any module-missing fallback disagrees.
//
// ALLO_N2_<PATH> env vars (path with non-alphanumerics as _) point a file at a
// scratch copy for mutation runs, e.g. ALLO_N2_AGENT_CORE_CONTRACTS_MODULE_JS.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const pick = (rel) => process.env['ALLO_N2_' + rel.replace(/[^A-Za-z0-9]/g, '_').toUpperCase()] || resolve(root, rel);
const read = (rel) => readFileSync(pick(rel), 'utf8');

// Load a dual-export module without touching the shared jsdom window.
const loadExports = (rel) => {
  const module = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', 'window', read(rel))(module, module.exports, undefined);
  return module.exports;
};
const IC = loadExports('instructional_context_module.js');
const Contracts = loadExports('agent_core_contracts_module.js');

// Pull one top-level `const NAME = (...) => {` ... `};` helper out of a file.
const extract = (text, name, file) => {
  const start = text.indexOf('const ' + name + ' = (');
  if (start < 0) throw new Error(name + ' not found in ' + file);
  const end = text.indexOf('\n};', start);
  if (end < 0) throw new Error(name + ' has no end in ' + file);
  return text.slice(start, end + 3);
};
// Pull one `  function NAME(` ... `  }` helper out of a 2-space-indented IIFE module.
const extractEs5Function = (text, name, file) => {
  const start = text.indexOf('  function ' + name + '(');
  if (start < 0) throw new Error(name + ' not found in ' + file);
  const end = text.indexOf('\n  }\n', start);
  if (end < 0) throw new Error(name + ' has no end in ' + file);
  return text.slice(start, end + 4);
};
const FALLBACKS = [
  ['generation_helpers', '_fullPackTextAccessFallback'],
  ['phase_o_misc_handlers', '_blueprintTextAccessFallback'],
  ['generate_dispatcher', '_dispatcherTextAccessFallback'],
  ['udl_chat', '_udlChatTextAccessFallback'],
];
const loadFallback = (file, name) => {
  const code = extract(read(file), name, file);
  // eslint-disable-next-line no-new-func
  return new Function(code + '\nreturn ' + name + ';')();
};

const RL10 = { standards: [{ code: 'CCSS.ELA-LITERACY.RL.9-10.10', label: 'Read and comprehend literature' }] };
const RI52 = { standards: [{ code: 'CCSS.ELA-LITERACY.RI.5.2', text: 'Determine two or more main ideas of a text.' }] };
const WORDING = {
  promptText: 'Read and comprehend grade-level complex texts independently and proficiently.',
  standards: [{ code: 'STATE-READ-7', text: 'Read closely.' }],
};
const PRESERVE_SOURCED = {
  standards: [{ code: 'NGSS 5-ESS2-1', label: 'Earth systems interact' }],
  instructionalConstraints: { textAccessExpectation: 'preserve-primary', basis: 'District text access policy', sourced: true },
};
const PRESERVE_UNSOURCED = {
  standards: [{ code: 'NGSS 5-ESS2-1', label: 'Earth systems interact' }],
  instructionalConstraints: { textAccessExpectation: 'preserve-primary' },
};
const ENTRY_CONSTRAINT = {
  standards: [{ code: 'LOCAL-1', label: 'Local', instructionalConstraints: { textAccessExpectation: 'preserve-primary', sourceUrl: 'https://example.org/policy' } }],
};
const PROHIBIT_SOURCED = {
  standards: [{ code: 'SECURE-STIMULUS-1', label: 'Secure stimulus' }],
  instructionalConstraints: { textAccessExpectation: 'adaptation-prohibited', basis: 'Official secure-assessment rule', sourced: true },
};
const PROHIBIT_UNSOURCED = {
  standards: [{ code: 'SECURE-STIMULUS-1', label: 'Secure stimulus' }],
  instructionalConstraints: { textAccessExpectation: 'adaptation-prohibited' },
};
const PERMITTED = {
  standards: [{ code: 'CCSS.ELA-LITERACY.RL.9-10.10', label: 'Read literature' }],
  instructionalConstraints: { textAccessExpectation: 'supplemental-adaptation-permitted', basis: 'District guidance' },
};

// [name, raw context, standardsContext, standardsInput]
const CASES = [
  ['no standard', null, null, ''],
  ['RL.9-10.10 code', null, RL10, ''],
  ['RL.3.10 in standards input only', null, null, 'CCSS.ELA-LITERACY.RL.3.10'],
  ['RST.6-8.10 in input', {}, null, 'RST.6-8.10 Read science texts'],
  ['RH.11-12.10 in input', {}, null, 'RH.11-12.10'],
  ['grade-level complex text wording', null, WORDING, ''],
  ['text complexity band wording in input', null, null, 'Read at the high end of the text complexity band'],
  ['RI.5.2 (no grade-level text requirement)', null, RI52, ''],
  ['sourced preserve-primary', null, PRESERVE_SOURCED, ''],
  ['unsourced preserve-primary', null, PRESERVE_UNSOURCED, ''],
  ['entry-level sourced preserve-primary', null, ENTRY_CONSTRAINT, ''],
  ['sourced prohibition', null, PROHIBIT_SOURCED, ''],
  ['unsourced prohibition', null, PROHIBIT_UNSOURCED, ''],
  ['permitted adaptation under RL.10', null, PERMITTED, ''],
  ['educator include under RL.10', { adaptedTextPolicy: 'include', adaptedTextPolicySource: 'educator' }, RL10, ''],
  ['educator omit, no standard', { adaptedTextPolicy: 'omit', adaptedTextPolicySource: 'educator' }, null, ''],
  ['educator omit under RL.10', { adaptedTextPolicy: 'omit', adaptedTextPolicySource: 'educator' }, RL10, ''],
  ['include with no source under RL.10', { adaptedTextPolicy: 'include' }, RL10, ''],
  ['stale workflow include under RL.10', { adaptedTextPolicy: 'include', adaptedTextPolicySource: 'workflow-default' }, RL10, ''],
  ['stale standard omit after the standard changed', { adaptedTextPolicy: 'omit', adaptedTextPolicySource: 'standard' }, RI52, ''],
  ['standard omit still under RL.10', { adaptedTextPolicy: 'omit', adaptedTextPolicySource: 'standard' }, RL10, ''],
  ['educator prohibited without a source', { adaptedTextPolicy: 'prohibited' }, null, ''],
  ['educator include under a sourced prohibition', { adaptedTextPolicy: 'include', adaptedTextPolicySource: 'educator' }, PROHIBIT_SOURCED, ''],
  ['explicit required access, no standard', { primaryTextAccess: 'required' }, null, ''],
  ['explicit available access under RL.10', { primaryTextAccess: 'available' }, RL10, ''],
  ['unknown policy value', { adaptedTextPolicy: 'sometimes' }, RL10, ''],
  ['whitespace in the standard wording', null, null, 'Read grade-level\n  complex text'],
];
const FIELDS = ['primaryTextAccess', 'adaptedTextPolicy', 'adaptedTextPolicySource', 'textAccessReason',
  'standardRequiresPrimary', 'sourcedAdaptationProhibition'];
const view = (plan) => Object.fromEntries(FIELDS.map((key) => [key, plan[key]]));
const reference = (raw, standardsContext, standardsInput) =>
  view(IC.deriveTextAccessPlan(raw || {}, { standardsContext, standardsInput }));

describe('text-access rule parity (Full Pack, Blueprint, MCP agent, fallbacks)', () => {
  it('pins the rule itself on the reference, so parity cannot pass by both being wrong', () => {
    expect(reference(null, RL10, '')).toMatchObject({
      primaryTextAccess: 'required', adaptedTextPolicy: 'omit', adaptedTextPolicySource: 'standard',
    });
    expect(reference({ adaptedTextPolicy: 'include', adaptedTextPolicySource: 'educator' }, RL10, ''))
      .toMatchObject({ primaryTextAccess: 'required', adaptedTextPolicy: 'include', adaptedTextPolicySource: 'educator' });
    expect(reference(null, RI52, '')).toMatchObject({
      primaryTextAccess: 'available', adaptedTextPolicy: 'include', adaptedTextPolicySource: 'workflow-default',
    });
    expect(reference(null, PROHIBIT_SOURCED, '')).toMatchObject({ adaptedTextPolicy: 'prohibited' });
  });

  it('agent_core_contracts deriveTextAccessPlan agrees with InstructionalContext on every case', () => {
    const disagreements = [];
    for (const [name, raw, standardsContext, standardsInput] of CASES) {
      const expected = reference(raw, standardsContext, standardsInput);
      const actual = view(Contracts.deriveTextAccessPlan(raw || {}, { standardsContext, standardsInput }));
      if (JSON.stringify(actual) !== JSON.stringify(expected)) disagreements.push({ name, expected, actual });
    }
    expect(disagreements).toEqual([]);
  });

  it('agent_core_contracts normalizeInstructionalContext agrees on the text-access fields', () => {
    const disagreements = [];
    for (const [name, raw, standardsContext, standardsInput] of CASES) {
      const pickFields = (context) => ({
        primaryTextAccess: context.primaryTextAccess,
        adaptedTextPolicy: context.adaptedTextPolicy,
        adaptedTextPolicySource: context.adaptedTextPolicySource,
        textAccessReason: context.textAccessReason,
      });
      const expected = pickFields(IC.normalizeInstructionalContext(Object.assign({}, raw || {}, { standardsContext }), { standardsInput }));
      const actual = pickFields(Contracts.normalizeInstructionalContext(Object.assign({}, raw || {}, { standardsContext }), { standardsInput }));
      if (JSON.stringify(actual) !== JSON.stringify(expected)) disagreements.push({ name, expected, actual });
    }
    expect(disagreements).toEqual([]);
  });

  it.each(FALLBACKS)('the module-missing fallback in %s agrees with InstructionalContext (source and built module)', (base, name) => {
    const copies = [base + '_source.jsx', base + '_module.js', 'desktop/web-app/public/' + base + '_module.js'];
    const texts = copies.map((file) => extract(read(file), name, file));
    // The shipped module and its mirror carry exactly the source's helper.
    expect(texts[1]).toBe(texts[0]);
    expect(texts[2]).toBe(texts[0]);
    const fallback = loadFallback(copies[1], name);
    const disagreements = [];
    for (const [caseName, raw, standardsContext, standardsInput] of CASES) {
      const expected = reference(raw, standardsContext, standardsInput);
      const actual = view(fallback(raw, standardsContext, standardsInput));
      if (JSON.stringify(actual) !== JSON.stringify(expected)) disagreements.push({ caseName, expected, actual });
    }
    expect(disagreements).toEqual([]);
  });

  // Round 2: the headless resource pack (MCP agent) has its own ES5 fallback for
  // when instructional_context_module.js cannot be loaded or required.
  it('the resource-pack fallback agrees with InstructionalContext, and its mirror is identical', () => {
    const copies = ['agent_core_resource_pack_module.js', 'desktop/web-app/public/agent_core_resource_pack_module.js'];
    const texts = copies.map((file) => read(file));
    expect(texts[1]).toBe(texts[0]);
    const code = extractEs5Function(texts[0], 'resourcePackTextAccessFallback', copies[0]);
    // eslint-disable-next-line no-new-func
    const fallback = new Function('isObject', code + '\nreturn resourcePackTextAccessFallback;')(
      (value) => !!value && typeof value === 'object' && !Array.isArray(value));
    const disagreements = [];
    for (const [caseName, raw, standardsContext, standardsInput] of CASES) {
      const expected = reference(raw, standardsContext, standardsInput);
      const actual = view(fallback(raw, standardsContext, standardsInput));
      if (JSON.stringify(actual) !== JSON.stringify(expected)) disagreements.push({ caseName, expected, actual });
    }
    expect(disagreements).toEqual([]);
    expect(texts[0]).toContain('var access = resourcePackTextAccessFallback(source, standardsContext, request && request.standards);');
  });

  it('a headless resource pack plans the same companion with or without InstructionalContext', () => {
    const src = read('agent_core_resource_pack_module.js');
    const load = (withContextModule) => {
      const module = { exports: {} };
      const requireStub = (name) => {
        if (withContextModule && name === './instructional_context_module.js') return IC;
        throw new Error('module not available: ' + name);
      };
      // eslint-disable-next-line no-new-func
      new Function('module', 'exports', 'window', 'require', src)(module, module.exports, undefined, requireStub);
      return module.exports;
    };
    const offline = load(false);
    const online = load(true);
    const request = (standards, standardsContext, instructionalContext) => Object.assign({
      requestId: 'parity-pack', title: 'Parity pack', sourceTopic: 'Macbeth 1.1',
      sourceText: 'When shall we three meet again, in thunder, lightning, or in rain?', gradeLevel: '10th Grade', language: 'English',
      learningGoal: 'Read the scene closely.', resourcePlan: [{ type: 'glossary', directive: '' }, { type: 'simplified', directive: '' }],
      privacy: { confirmNoStudentPii: true, confirmSourcePermission: true },
      providerPolicy: { provider: 'stub', allowMeteredUsage: false },
    }, standards ? { standards } : {}, standardsContext ? { standardsContext } : {}, instructionalContext ? { instructionalContext } : {});

    const omitted = offline.validateRequest(request('CCSS.ELA-LITERACY.RL.9-10.10'));
    expect(omitted.ok).toBe(true);
    expect(omitted.value.resourcePlan.map((row) => row.type)).toEqual(['glossary']);
    expect(omitted.value.instructionalContext).toMatchObject({
      primaryTextAccess: 'required', adaptedTextPolicy: 'omit', adaptedTextPolicySource: 'standard',
    });
    const included = offline.validateRequest(request('CCSS.ELA-LITERACY.RL.9-10.10', null, { adaptedTextPolicy: 'include', adaptedTextPolicySource: 'educator' }));
    expect(included.value.resourcePlan.map((row) => row.type)).toEqual(['glossary', 'simplified']);
    const plain = offline.validateRequest(request('CCSS.ELA-LITERACY.RI.5.2'));
    expect(plain.value.resourcePlan.map((row) => row.type)).toEqual(['glossary', 'simplified']);

    const fields = (report) => ({
      ok: report.ok,
      plan: report.ok ? report.value.resourcePlan.map((row) => row.type) : null,
      access: report.ok ? {
        primaryTextAccess: report.value.instructionalContext.primaryTextAccess,
        adaptedTextPolicy: report.value.instructionalContext.adaptedTextPolicy,
        adaptedTextPolicySource: report.value.instructionalContext.adaptedTextPolicySource,
        textAccessReason: report.value.instructionalContext.textAccessReason,
      } : report.errors.map((item) => item.code),
    });
    const disagreements = [];
    for (const [caseName, raw, standardsContext, standardsInput] of CASES) {
      const req = request(standardsInput || '', standardsContext, raw);
      const expected = fields(online.validateRequest(req));
      const actual = fields(offline.validateRequest(req));
      if (JSON.stringify(actual) !== JSON.stringify(expected)) disagreements.push({ caseName, expected, actual });
    }
    expect(disagreements).toEqual([]);
  });

  it('the Blueprint service mirror is identical', () => {
    expect(read('desktop/web-app/public/agent_core_blueprint_service_module.js'))
      .toBe(read('agent_core_blueprint_service_module.js'));
  });

  it('every fallback call site uses its helper, and no hard-coded include default is left', () => {
    const helpers = read('generation_helpers_source.jsx');
    expect(helpers).toContain("const textAccess = _fullPackTextAccessFallback(source, standardsContext, options.standardsInput || '');");
    const blueprint = read('phase_o_misc_handlers_source.jsx');
    expect(blueprint).toContain('const textAccess = _blueprintTextAccessFallback(rawContext, standardsContext,');
    const dispatcher = read('generate_dispatcher_source.jsx');
    expect(dispatcher).toContain(': _dispatcherFallbackInstructionalContext(configOverride.instructionalContext, {');
    const chat = read('udl_chat_source.jsx');
    expect(chat).toContain(': _udlChatFallbackInstructionalContext(overrides.instructionalContext, {');
    for (const [file, text] of [['generate_dispatcher', dispatcher], ['udl_chat', chat], ['phase_o', blueprint], ['generation_helpers', helpers]]) {
      expect(/adaptedTextPolicy: 'include',\s*adaptedTextPolicySource: 'workflow-default'/.test(text), file).toBe(false);
    }
  });

  it('the dispatcher and chat fallbacks keep the caller context but derive text access again', () => {
    const build = (file, helper, wrapper) => {
      const text = read(file);
      // eslint-disable-next-line no-new-func
      return new Function(extract(text, helper, file) + '\n' + extract(text, wrapper, file) + '\nreturn ' + wrapper + ';')();
    };
    for (const [file, helper, wrapper] of [
      ['generate_dispatcher_module.js', '_dispatcherTextAccessFallback', '_dispatcherFallbackInstructionalContext'],
      ['udl_chat_module.js', '_udlChatTextAccessFallback', '_udlChatFallbackInstructionalContext'],
    ]) {
      const fallbackContext = build(file, helper, wrapper);
      const defaults = { schemaVersion: 1, instructionalGrade: '10th Grade', primaryTextPolicy: 'preserve-primary', standardsContext: RL10, standardsFingerprint: '' };
      expect(fallbackContext(undefined, defaults, '')).toMatchObject({
        schemaVersion: 1, instructionalGrade: '10th Grade', standardsContext: RL10,
        primaryTextAccess: 'required', adaptedTextPolicy: 'omit', adaptedTextPolicySource: 'standard',
      });
      const stale = fallbackContext({ adaptedTextPolicy: 'include', adaptedTextPolicySource: 'workflow-default', standardsFingerprint: 'fp-1' }, defaults, '');
      expect(stale).toMatchObject({ adaptedTextPolicy: 'omit', adaptedTextPolicySource: 'standard', standardsFingerprint: 'fp-1' });
      expect(fallbackContext({ adaptedTextPolicy: 'include', adaptedTextPolicySource: 'educator' }, defaults, ''))
        .toMatchObject({ adaptedTextPolicy: 'include', adaptedTextPolicySource: 'educator', primaryTextAccess: 'required' });
      expect(fallbackContext(null, Object.assign({}, defaults, { standardsContext: null }), ''))
        .toMatchObject({ adaptedTextPolicy: 'include', adaptedTextPolicySource: 'workflow-default', primaryTextAccess: 'available' });
    }
  });
});
