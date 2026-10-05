import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

function propertyName(node) {
  if (!node) return undefined;
  return node.type === 'Identifier' ? node.name : node.value;
}

function isTrue(node) {
  return node?.type === 'BooleanLiteral' && node.value === true
    || node?.type === 'StringLiteral' && node.value === 'true';
}

function isCanvasRole(node) {
  if (node?.type === 'ConditionalExpression') {
    return isCanvasRole(node.consequent) && isCanvasRole(node.alternate);
  }
  return node?.type === 'StringLiteral' && ['img', 'application'].includes(node.value);
}

function hasLabel(node) {
  if (!node || node.type === 'NullLiteral' || node.type === 'BooleanLiteral') return false;
  if (node.type === 'StringLiteral') return !!node.value.trim();
  if (node.type === 'Identifier') return node.name !== 'undefined';
  if (node.type === 'ConditionalExpression') return hasLabel(node.consequent) && hasLabel(node.alternate);
  if (node.type === 'TemplateLiteral') return node.expressions.length > 0 || node.quasis.some(part => part.value.cooked.trim());
  // Dynamic labels (translations, selected-body descriptions, and fallbacks)
  // are checked for their rendered value by the companion DOM assertions.
  return ['CallExpression', 'MemberExpression', 'BinaryExpression', 'LogicalExpression'].includes(node.type);
}

function domAttributes(canvasPath) {
  const declaration = canvasPath.parentPath;
  if (!declaration.isVariableDeclarator() || declaration.node.id.type !== 'Identifier') return new Map();
  const binding = declaration.scope.getBinding(declaration.node.id.name);
  if (!binding) return new Map();

  // A later assignment/redeclaration starts a different lifetime, even when
  // var declarations in separate branches share the same function binding.
  const nextWrite = binding.constantViolations
    .map(path => path.node.start)
    .filter(start => start > canvasPath.node.end)
    .sort((a, b) => a - b)[0] ?? Infinity;
  const attributes = new Map();
  for (const reference of binding.referencePaths) {
    if (reference.node.start < canvasPath.node.end || reference.node.start >= nextWrite) continue;
    const member = reference.parentPath;
    if (!member.isMemberExpression() || member.node.object !== reference.node) continue;
    const name = propertyName(member.node.property);
    const call = member.parentPath;
    if (name === 'setAttribute' && call.isCallExpression() && call.node.callee === member.node) {
      const [attribute, value] = call.node.arguments;
      if (attribute?.type === 'StringLiteral') attributes.set(attribute.value, value);
    } else if (call.isAssignmentExpression() && call.node.left === member.node) {
      const attribute = { role: 'role', ariaLabel: 'aria-label', ariaHidden: 'aria-hidden' }[name];
      if (attribute) attributes.set(attribute, call.node.right);
    }
  }
  return attributes;
}

/** Classify each creation independently; never borrow a nearby canvas's name. */
export function canvasCreationFailures(source) {
  const ast = parse(source, { sourceType: 'unambiguous' });
  const failures = [];
  const lines = source.split(/\r?\n/);
  traverse(ast, {
    CallExpression(path) {
      const { callee, arguments: args } = path.node;
      if (args[0]?.type !== 'StringLiteral' || args[0].value !== 'canvas') return;
      const factory = callee.type === 'Identifier' ? callee.name
        : callee.type === 'MemberExpression' ? propertyName(callee.property) : undefined;
      if (!['h', 'createElement'].includes(factory)) return;

      const isDom = factory === 'createElement' && callee.type === 'MemberExpression'
        && callee.object.type === 'Identifier' && callee.object.name === 'document';
      const attributes = isDom ? domAttributes(path) : new Map(
        args[1]?.type === 'ObjectExpression'
          ? args[1].properties.filter(property => property.type === 'ObjectProperty')
            .map(property => [propertyName(property.key), property.value])
          : []
      );
      const hidden = isTrue(attributes.get('aria-hidden'));
      const named = isCanvasRole(attributes.get('role')) && hasLabel(attributes.get('aria-label'));
      if (!hidden && !named) {
        const line = path.node.loc.start.line;
        failures.push(`${line}: ${lines[line - 1].trim()}`);
      }
    }
  });
  return failures;
}
