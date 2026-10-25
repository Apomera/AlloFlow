'use strict';

// Recognize an explicit theme on the portal's root, including local aliases.
// Unknown syntax, mutation, spreading props or an unthemed branch stays flagged.
function themedPortalCalls(src) {
  const safe = [];
  try {
    const ast = require('@babel/parser').parse(src, { sourceType: 'unambiguous', plugins: ['jsx'] });
    const traverse = require('@babel/traverse').default;
    const member = (node, object, property) => node && node.type === 'MemberExpression' && !node.computed && node.object.name === object && node.property.name === property;
    function initial(path, seen) {
      if (!path.isIdentifier()) return path;
      const binding = path.scope.getBinding(path.node.name);
      if (!binding || !binding.constant || !binding.path.isVariableDeclarator() || seen.has(binding)) return null;
      seen.add(binding);
      return initial(binding.path.get('init'), seen);
    }
    function themeClass(path) {
      path = initial(path, new Set());
      if (!path || !path.node) return false;
      const node = path.node;
      const dynamic = value => value && (value.type === 'Identifier' || value.type === 'LogicalExpression' || value.type === 'ConditionalExpression' || value.type === 'MemberExpression');
      if (node.type === 'BinaryExpression' && node.operator === '+') {
        return node.left.type === 'StringLiteral' && /(?:^|\s)theme-$/.test(node.left.value) && dynamic(node.right);
      }
      return node.type === 'TemplateLiteral' && node.expressions.some((value, index) =>
        /(?:^|\s)theme-$/.test(node.quasis[index].value.cooked || '') && dynamic(value) &&
        /^(?:\s|$)/.test(node.quasis[index + 1].value.cooked || ''));
    }
    function themedRoot(path, seen = new Set()) {
      if (!path || !path.node) return false;
      if (path.isIdentifier()) {
        const binding = path.scope.getBinding(path.node.name);
        if (!binding || !binding.path.isVariableDeclarator() || seen.has(binding)) return false;
        const next = new Set(seen).add(binding);
        const values = [];
        const init = binding.path.get('init');
        if (init.node) values.push(init);
        for (const write of binding.constantViolations) {
          if (!write.isAssignmentExpression({ operator: '=' }) || !write.get('left').isIdentifier({ name: path.node.name })) return false;
          values.push(write.get('right'));
        }
        return values.length > 0 && values.every(value => themedRoot(value, next));
      }
      if (path.isConditionalExpression()) return themedRoot(path.get('consequent'), seen) && themedRoot(path.get('alternate'), seen);
      if (path.isJSXElement()) {
        const opening = path.get('openingElement');
        if (!opening.get('name').isJSXIdentifier() || !/^[a-z]/.test(opening.node.name.name)) return false;
        const attrs = opening.get('attributes');
        if (attrs.some(attr => attr.isJSXSpreadAttribute())) return false;
        const classes = attrs.filter(attr => attr.node.name?.name === 'className');
        return classes.length === 1 && classes[0].get('value').isJSXExpressionContainer() && themeClass(classes[0].get('value.expression'));
      }
      if (!path.isCallExpression()) return false;
      const callee = initial(path.get('callee'), new Set());
      if (!callee || !member(callee.node, 'React', 'createElement')) return false;
      const args = path.get('arguments');
      if (!args[0]?.isStringLiteral() || !args[1]?.isObjectExpression()) return false;
      const props = args[1].get('properties');
      if (props.some(prop => !prop.isObjectProperty() || prop.node.computed)) return false;
      const classes = props.filter(prop => (prop.node.key.name || prop.node.key.value) === 'className');
      return classes.length === 1 && themeClass(classes[0].get('value'));
    }
    traverse(ast, { CallExpression(path) {
      const callee = path.node.callee;
      if (!(callee.type === 'Identifier' && callee.name === 'createPortal') &&
          !(callee.type === 'MemberExpression' && !callee.computed && callee.property.name === 'createPortal')) return;
      const target = path.node.arguments[1];
      if ((member(target, 'document', 'body') || member(target, 'document', 'documentElement')) && themedRoot(path.get('arguments.0'))) {
        safe.push([path.node.start, path.node.end]);
      }
    } });
  } catch (_) { /* A parse failure must never exempt a portal. */ }
  return safe;
}

module.exports = { themedPortalCalls };
