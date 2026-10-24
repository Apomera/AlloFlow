import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'acorn';

/**
 * Every templated string must have its placeholders filled.
 *
 * The i18n passes replaced glued concatenation ('Score: ' + n) with templates
 * ('Score: {n}' plus .replace). That is the right shape for translation, but it
 * introduces a failure mode nothing else catches: if the {token} in the text and
 * the .replace() that fills it ever disagree — a rename, a copied line, a key
 * reused with different wording — the user simply sees a literal "{n}" on
 * screen. Nothing throws, no test fails, and it only shows in the one state
 * that renders that string. Several of these live on canvas, where no DOM sweep
 * can reach them at all.
 *
 * These shapes are legitimate and must NOT be reported:
 *   - a chain of several .replace() calls whose arguments contain ')';
 *   - a conditional template assigned to a variable and filled later;
 *   - a template assigned to a variable and filled later:
 *       tachUnit = __alloT(..., '{n} RPM');  ... tachUnit.replace('{n}', v)
 * An earlier version of this check reported 54 findings, all false, by trying
 * to match the .replace chain with a regex anchored to the __alloT call.
 */
const SRC = 'stem_lab/stem_tool_flightsim.js';

const findUnfilled = (src) => {
  const tree = parse(src, { ecmaVersion: 'latest' }), parents = new Map(), scopes = new Map(), nodes = [];
  const pending = [[tree, null, tree]];
  while (pending.length) {
    let [node, parent, scope] = pending.pop();
    if (!node || typeof node.type !== 'string') continue;
    if (/^(Function|ArrowFunction)/.test(node.type)) scope = node;
    parents.set(node, parent); scopes.set(node, scope); nodes.push(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(child => pending.push([child, node, scope]));
      else if (value && typeof value === 'object') pending.push([value, node, scope]);
    }
  }
  const replacementChain = start => {
    const tokens = new Set();
    let node = start;
    for (;;) {
      const parent = parents.get(node), call = parents.get(parent);
      if (parent?.type === 'ConditionalExpression' && (parent.consequent === node || parent.alternate === node)) { node = parent; continue; }
      if (parent?.type !== 'MemberExpression' || parent.object !== node || parent.property.name !== 'replace' || call?.type !== 'CallExpression' || call.callee !== parent) break;
      const token = call.arguments[0]?.value;
      if (typeof token === 'string') tokens.add(token);
      node = call;
    }
    return { node, tokens };
  };
  const deferred = new Map();
  for (const node of nodes.filter(node => node.type === 'Identifier')) {
    const { tokens } = replacementChain(node);
    if (!tokens.size) continue;
    const scope = scopes.get(node);
    if (!deferred.has(scope)) deferred.set(scope, new Map());
    const identifiers = deferred.get(scope);
    if (!identifiers.has(node.name)) identifiers.set(node.name, new Set());
    tokens.forEach(token => identifiers.get(node.name).add(token));
  }
  const unfilled = [];
  let checked = 0;
  for (const call of nodes.filter(node => node.type === 'CallExpression' && node.callee.name === '__alloT')) {
    const key = call.arguments[0]?.value, text = call.arguments[1]?.value;
    if (typeof key !== 'string' || !key.startsWith('stem.flightsim.') || typeof text !== 'string') continue;
    const tokens = [...new Set(text.match(/\{[A-Za-z0-9_]+\}/g) || [])];
    if (!tokens.length) continue;
    checked++;
    const filled = replacementChain(call), parent = parents.get(filled.node);
    const assigned = parent?.type === 'VariableDeclarator' && parent.init === filled.node ? parent.id
      : parent?.type === 'AssignmentExpression' && parent.right === filled.node ? parent.left : null;
    const later = assigned?.type === 'Identifier' ? deferred.get(scopes.get(call))?.get(assigned.name) : null;
    for (const token of tokens) if (!filled.tokens.has(token) && !later?.has(token)) unfilled.push(`${key.slice('stem.flightsim.'.length)}  ${token}`);
  }
  return { checked, unfilled: Array.from(new Set(unfilled)) };
};

describe('flightsim template placeholders', () => {
  const src = readFileSync(SRC, 'utf8');

  it('checks a meaningful number of templates (the scan must not go blind)', () => {
    const { checked } = findUnfilled(src);
    expect(checked, 'the template scan matched almost nothing — check the pattern')
      .toBeGreaterThan(50);
  });

  it('fills every placeholder it declares', () => {
    const { unfilled } = findUnfilled(src);
    expect(unfilled, 'these render a literal {token} to the user').toEqual([]);
  });

  it('recognizes a conditional template assignment and catches a missing fill', () => {
    const conditional = "var message = rotor ? __alloT('stem.flightsim.radio_rotor_start', '{field} training radio') : __alloT('stem.flightsim.radio_taxi', '{field} training radio'); message.replace('{field}', field);";
    expect(findUnfilled(conditional).unfilled).toEqual([]);
    expect(findUnfilled(conditional.replace("message.replace('{field}', field)", 'message')).unfilled)
      .toContain('radio_rotor_start  {field}');
  });

  it('would catch a removed .replace (the check can fail)', () => {
    // Calibration in the test itself: plant the defect in a STRING COPY, never
    // on disk. A gate that cannot fail is worse than no gate.
    const planted = src.replace(".replace('{grade}', ls.grade)", '');
    expect(planted, 'the calibration anchor is gone — update it').not.toBe(src);
    const { unfilled } = findUnfilled(planted);
    expect(unfilled.some((u) => u.includes('{grade}')),
      'the scan did not react to a planted unfilled placeholder').toBe(true);
  });

  it('follows chained fills through callback semicolons and catches a missing second fill', () => {
    const text = "__alloT('stem.flightsim.progress', '{done} of {total}').replace('{done}', rows.filter(function(row) { return row.done; }).length).replace('{total}', rows.length);";
    expect(findUnfilled(text).unfilled).toEqual([]);
    expect(findUnfilled(text.replace(".replace('{total}', rows.length)", '')).unfilled).toEqual(['progress  {total}']);
  });

  it('does not accept a fill belonging to a different function', () => {
    const text = "function first() { var value = __alloT('stem.flightsim.progress', '{total}'); return value; } function second() { return value.replace('{total}', 2); }";
    expect(findUnfilled(text).unfilled).toEqual(['progress  {total}']);
  });
});
