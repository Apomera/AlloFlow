#!/usr/bin/env node
/**
 * Reverse-compile a deployed AlloFlow view module back to JSX source.
 *
 * Walks the AST and converts `React.createElement(tag, props, ...children)`
 * calls into JSX equivalents. Designed for the output of babel's
 * @babel/plugin-transform-react-jsx — handles string/component tags,
 * React.Fragment, dashed attribute names, spread attrs, and nested children.
 *
 * Usage: node reverse_compile.cjs <input.js> <output.jsx>
 */
const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;
const t = require('@babel/types');

function isReactFragment(arg) {
  return t.isMemberExpression(arg, { computed: false })
    && t.isIdentifier(arg.object, { name: 'React' })
    && t.isIdentifier(arg.property, { name: 'Fragment' });
}

function buildJSXName(arg) {
  if (t.isStringLiteral(arg)) return t.jsxIdentifier(arg.value);
  if (t.isIdentifier(arg)) return t.jsxIdentifier(arg.name);
  if (t.isMemberExpression(arg, { computed: false })) {
    return t.jsxMemberExpression(buildJSXName(arg.object), t.jsxIdentifier(arg.property.name));
  }
  return null;
}

function cloneJSXName(name) {
  if (t.isJSXIdentifier(name)) return t.jsxIdentifier(name.name);
  if (t.isJSXMemberExpression(name)) {
    return t.jsxMemberExpression(cloneJSXName(name.object), t.jsxIdentifier(name.property.name));
  }
  return name;
}

function propsToAttributes(propsArg) {
  if (!propsArg || t.isNullLiteral(propsArg)) return [];
  if (t.isIdentifier(propsArg, { name: 'undefined' })) return [];

  if (!t.isObjectExpression(propsArg)) {
    return [t.jsxSpreadAttribute(propsArg)];
  }

  const attrs = [];
  for (const prop of propsArg.properties) {
    if (t.isSpreadElement(prop)) {
      attrs.push(t.jsxSpreadAttribute(prop.argument));
      continue;
    }
    if (!t.isObjectProperty(prop) || prop.computed) {
      attrs.push(t.jsxSpreadAttribute(t.objectExpression([prop])));
      continue;
    }
    let keyName;
    if (t.isIdentifier(prop.key)) keyName = prop.key.name;
    else if (t.isStringLiteral(prop.key)) keyName = prop.key.value;
    else { attrs.push(t.jsxSpreadAttribute(t.objectExpression([prop]))); continue; }

    let value;
    if (t.isStringLiteral(prop.value) && !/[{}]/.test(prop.value.value)) {
      value = t.stringLiteral(prop.value.value);
    } else {
      value = t.jsxExpressionContainer(prop.value);
    }
    attrs.push(t.jsxAttribute(t.jsxIdentifier(keyName), value));
  }
  return attrs;
}

function childToJSX(child) {
  if (t.isJSXElement(child) || t.isJSXFragment(child)) return child;
  if (t.isStringLiteral(child)) return t.jsxText(child.value);
  return t.jsxExpressionContainer(child);
}

function convertCreateElement(callNode) {
  const args = callNode.arguments;
  if (args.length === 0) return null;
  const tagArg = args[0];
  const propsArg = args.length > 1 ? args[1] : t.nullLiteral();
  const childArgs = args.slice(2);

  if (isReactFragment(tagArg)) {
    const children = childArgs.map(childToJSX);
    return t.jsxFragment(t.jsxOpeningFragment(), t.jsxClosingFragment(), children);
  }

  const name = buildJSXName(tagArg);
  if (!name) return null;

  const attributes = propsToAttributes(propsArg);
  const children = childArgs.map(childToJSX);
  const selfClosing = children.length === 0;

  return t.jsxElement(
    t.jsxOpeningElement(name, attributes, selfClosing),
    selfClosing ? null : t.jsxClosingElement(cloneJSXName(name)),
    children,
    selfClosing
  );
}

const input = process.argv[2];
const output = process.argv[3];
const code = fs.readFileSync(input, 'utf-8');

const ast = parser.parse(code, {
  sourceType: 'script',
  plugins: ['jsx'],
  allowReturnOutsideFunction: true,
});

// Strip Babel's /*#__PURE__*/ pragmas globally — they get re-added on
// recompile. As JSX siblings/leading comments they would render as invalid
// inline text or fail to parse.
traverse(ast, {
  enter(path) {
    const filter = arr => arr ? arr.filter(c => !/^#__PURE__$/.test(c.value.trim())) : arr;
    if (path.node.leadingComments) path.node.leadingComments = filter(path.node.leadingComments);
    if (path.node.trailingComments) path.node.trailingComments = filter(path.node.trailingComments);
    if (path.node.innerComments) path.node.innerComments = filter(path.node.innerComments);
  }
});

let conversions = 0;
let failures = 0;
traverse(ast, {
  CallExpression: {
    exit(path) {
      const callee = path.node.callee;
      if (!t.isMemberExpression(callee, { computed: false })) return;
      if (!t.isIdentifier(callee.object, { name: 'React' })) return;
      if (!t.isIdentifier(callee.property, { name: 'createElement' })) return;

      try {
        const converted = convertCreateElement(path.node);
        if (converted) {
          path.replaceWith(converted);
          conversions++;
        } else {
          failures++;
        }
      } catch (e) {
        failures++;
        console.error(`Conversion error at ${path.node.loc?.start.line}: ${e.message}`);
      }
    }
  }
});

const out = generator(ast, { jsescOption: { minimal: true }, retainLines: false }).code;
fs.writeFileSync(output, out, 'utf-8');
console.log(`Converted ${conversions} createElement calls (${failures} failures); wrote ${output}`);
