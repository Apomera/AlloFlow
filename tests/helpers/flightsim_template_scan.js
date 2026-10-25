import { parse } from 'acorn';

// Follow the value produced by a translated template through replacement
// chains, conditional expressions, and later uses of its lexical binding.
// Parsing keeps punctuation inside strings, comments, and callbacks intact.
export function findUnfilled(src) {
  const tree = parse(src, { ecmaVersion: 'latest', sourceType: 'script' });
  const parents = new WeakMap(), scopes = new WeakMap(), nodes = [];
  const programScope = { parent: null, function: true, bindings: new Map() };
  const bind = (pattern, scope) => {
    if (!pattern) return;
    if (pattern.type === 'Identifier') {
      if (!scope.bindings.has(pattern.name)) scope.bindings.set(pattern.name, {});
    } else if (pattern.type === 'RestElement') bind(pattern.argument, scope);
    else if (pattern.type === 'AssignmentPattern') bind(pattern.left, scope);
    else if (pattern.type === 'ArrayPattern') pattern.elements.forEach(item => bind(item, scope));
    else if (pattern.type === 'ObjectPattern') pattern.properties.forEach(item => bind(item.type === 'RestElement' ? item.argument : item.value, scope));
  };
  const functionScope = scope => {
    while (!scope.function) scope = scope.parent;
    return scope;
  };
  const visit = (node, parent, incoming) => {
    let scope = incoming;
    if (/^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(node.type)) {
      if (node.type === 'FunctionDeclaration') bind(node.id, incoming);
      scope = { parent: incoming, function: true, bindings: new Map() };
      bind(node.id, scope);
      node.params.forEach(param => bind(param, scope));
    } else if (node.type === 'BlockStatement' || node.type === 'CatchClause') {
      scope = { parent: incoming, function: false, bindings: new Map() };
      if (node.type === 'CatchClause') bind(node.param, scope);
    }
    if (node.type === 'VariableDeclaration') node.declarations.forEach(item => bind(item.id, node.kind === 'var' ? functionScope(scope) : scope));
    if (node.type === 'ClassDeclaration') bind(node.id, scope);
    parents.set(node, parent); scopes.set(node, scope); nodes.push(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(item => { if (item && typeof item.type === 'string') visit(item, node, scope); });
      else if (value && typeof value.type === 'string') visit(value, node, scope);
    }
  };
  visit(tree, null, programScope);
  const binding = identifier => {
    for (let scope = scopes.get(identifier); scope; scope = scope.parent) {
      if (scope.bindings.has(identifier.name)) return scope.bindings.get(identifier.name);
    }
    return null;
  };
  const references = new Map();
  nodes.filter(node => node.type === 'Identifier').forEach(node => {
    const owner = binding(node);
    if (owner) { if (!references.has(owner)) references.set(owner, []); references.get(owner).push(node); }
  });
  const literal = node => node && node.type === 'Literal' ? node.value : undefined;
  const context = origin => {
    const fills = new Set();
    let value = origin;
    for (let parent = parents.get(value); parent; parent = parents.get(value)) {
      if (parent.type === 'MemberExpression' && parent.object === value) {
        const call = parents.get(parent);
        if (call?.type !== 'CallExpression' || call.callee !== parent) break;
        const method = parent.computed ? literal(parent.property) : parent.property.name;
        if ((method === 'replace' || method === 'replaceAll') && typeof literal(call.arguments[0]) === 'string') fills.add(literal(call.arguments[0]));
        value = call;
      } else if (parent.type === 'ConditionalExpression' && (parent.consequent === value || parent.alternate === value)
          || parent.type === 'LogicalExpression' || parent.type === 'BinaryExpression' && parent.operator === '+') {
        value = parent;
      } else if (parent.type === 'SequenceExpression' && parent.expressions.at(-1) === value) {
        value = parent;
      } else if (parent.type === 'VariableDeclarator' && parent.init === value && parent.id.type === 'Identifier') {
        return { fills, owner: binding(parent.id) };
      } else if (parent.type === 'AssignmentExpression' && parent.operator === '=' && parent.right === value && parent.left.type === 'Identifier') {
        return { fills, owner: binding(parent.left) };
      } else break;
    }
    return { fills, owner: null };
  };
  const filledLater = (owner, token, origin, seen = new Set()) => {
    if (!owner || seen.has(owner)) return false;
    seen.add(owner);
    return (references.get(owner) || []).some(reference => {
      if (reference.start <= origin.start) return false;
      const result = context(reference);
      return result.fills.has(token) || filledLater(result.owner, token, origin, seen);
    });
  };
  let checked = 0;
  const unfilled = new Set();
  for (const node of nodes) {
    if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier' || node.callee.name !== '__alloT') continue;
    const key = literal(node.arguments[0]), fallback = literal(node.arguments[1]);
    if (typeof key !== 'string' || !/^stem\.flightsim\.[A-Za-z0-9_]+$/.test(key) || typeof fallback !== 'string') continue;
    const tokens = new Set(fallback.match(/\{[A-Za-z0-9_]+\}/g) || []);
    if (!tokens.size) continue;
    checked++;
    const result = context(node);
    for (const token of tokens) if (!result.fills.has(token) && !filledLater(result.owner, token, node)) unfilled.add(key.slice('stem.flightsim.'.length) + '  ' + token);
  }
  return { checked, unfilled: [...unfilled] };
}
