const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const root = path.resolve(__dirname, '../../..');
const label = process.argv[2] || 'baseline';
const requireClean = process.argv[3] === 'clean';
if (!/^[a-z0-9][a-z0-9-]*$/i.test(label)) throw new Error('Invalid report label');
const outputPath = path.join(__dirname, `inventory-${label}.json`);
if (fs.existsSync(outputPath)) throw new Error('Refusing to overwrite an existing inventory');
const allowed = new Set([
  'window','document','navigator','console','location','localStorage','sessionStorage',
  'setTimeout','clearTimeout','setInterval','clearInterval','requestAnimationFrame','cancelAnimationFrame',
  'fetch','URL','URLSearchParams','Blob','File','FileReader','FormData','TextEncoder','TextDecoder',
  'AbortController','DOMParser','XMLSerializer','Audio','Image','SpeechSynthesisUtterance',
  'HTMLCanvasElement','HTMLElement','HTMLInputElement','Node','Element','Event','CustomEvent',
  'MutationObserver','ResizeObserver','performance','crypto','indexedDB','atob','btoa',
  'Object','Array','String','Number','Boolean','Date','Math','JSON','RegExp','Error','TypeError','RangeError','Function',
  'Map','Set','WeakMap','WeakSet','Promise','Symbol','Uint8Array','ArrayBuffer','DataView',
  'Float32Array','Float64Array','Int32Array','Infinity','NaN','undefined','parseInt','parseFloat','isNaN','isFinite',
  'encodeURIComponent','decodeURIComponent','encodeURI','decodeURI','structuredClone','globalThis',
  'React'
]);
function handlerName(p) {
  const ancestor = p.findParent(p => p.isVariableDeclarator() && p.get('init').isFunction());
  return ancestor && ancestor.node.id.type === 'Identifier' ? ancestor.node.id.name : null;
}
function hasSafeGuard(node, name) {
  if (!node) return false;
  if (node.type === 'LogicalExpression' && node.operator === '&&') return hasSafeGuard(node.left,name) || hasSafeGuard(node.right,name);
  if (node.type !== 'BinaryExpression' || node.left.type !== 'UnaryExpression' || node.left.operator !== 'typeof' || node.left.argument.type !== 'Identifier' || node.left.argument.name !== name || node.right.type !== 'StringLiteral') return false;
  return (node.operator === '!==' && node.right.value === 'undefined') || (node.operator === '===' && node.right.value === 'object');
}
function rangeContains(node, needle) { return !!node && node.start <= needle.start && node.end >= needle.end; }
function isSafeCompatibilityReference(p, name) {
  if (p.parent.type === 'UnaryExpression' && p.parent.operator === 'typeof') return true;
  return !!p.findParent(ancestor => {
    if (ancestor.isLogicalExpression({operator:'&&'}) && rangeContains(ancestor.node.right,p.node)) return hasSafeGuard(ancestor.node.left,name);
    if (ancestor.isIfStatement() && rangeContains(ancestor.node.consequent,p.node)) return hasSafeGuard(ancestor.node.test,name);
    return false;
  });
}
function inspect(file) {
const bytes = fs.readFileSync(path.join(root,file));
const source = bytes.toString();
const ast = parser.parse(source, {sourceType:'script', plugins:['jsx']});
const free = new Map();
const reads = new Set();
traverse(ast, {
  ReferencedIdentifier(p) {
    const name = p.node.name;
    if (p.scope.hasBinding(name, true)) return;
    if (!free.has(name)) free.set(name, []);
    free.get(name).push({line:p.node.loc.start.line, column:p.node.loc.start.column+1, handler:handlerName(p), context:source.slice(p.node.start-50,p.node.end+80),safeCompatibilityGuard:isSafeCompatibilityReference(p,name)});
  },
  MemberExpression(p) {
    if (p.node.object.type === 'Identifier' && p.node.object.name === '__d' && !p.node.computed && p.node.property.type === 'Identifier') reads.add(p.node.property.name);
  }
});
const compatibility = file.endsWith('_module.js') ? ['module','Buffer'].map(name => ({name,refs:free.get(name)||[]})).filter(item=>item.refs.length) : [];
for (const item of compatibility) if (!item.refs.every(ref=>ref.safeCompatibilityGuard)) throw new Error(`Unguarded compatibility global: ${item.name}`);
const isAllowed = name => allowed.has(name) || compatibility.some(item=>item.name===name);
const result = {
  file,
  sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  methodology: 'Babel ReferencedIdentifier with lexical scope.hasBinding(name,true); normal browser/ECMAScript globals classified separately; guarded generated Node compatibility branches validated from ancestor AST conditions; no regex reference detection.',
  depReadCount: reads.size,
  nonGlobal: [...free].filter(([name])=>!isAllowed(name)).map(([name,refs])=>({name,refs})),
  globals: [...free].filter(([name])=>allowed.has(name)).map(([name,refs])=>({name,count:refs.length})),
  guardedCompatibility: compatibility.map(item=>({...item,reason:'Every free use is typeof itself or reached only through an ancestor typeof guard, verified from the Babel AST.'}))
};
if (!bytes.equals(fs.readFileSync(path.join(root,file)))) throw new Error(`Input changed during inventory: ${file}`);
return result;
}
const result = {
  label,
  methodology:'Babel scope audit of both full source and generated runtime, no regex identifier detection. ECMAScript constructors/built-ins and DOM/browser globals are explicitly allowed. Generated WordSoundsReadiness module/Buffer compatibility references are checked against ancestor typeof guards in the Babel AST.',
  inputs:[inspect('host_handlers_source.jsx'),inspect('host_handlers_module.js')]
};
for (const item of result.inputs) {
  const currentHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root,item.file))).digest('hex');
  if (currentHash !== item.sha256) throw new Error(`Input changed during inventory: ${item.file}`);
}
result.clean = result.inputs.every(item=>item.nonGlobal.length===0);
fs.writeFileSync(outputPath,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({label,outputPath,clean:result.clean,inputs:result.inputs.map(({file,sha256,depReadCount,nonGlobal,guardedCompatibility})=>({file,sha256,depReadCount,nonGlobal,guardedCompatibility}))},null,2));
if (requireClean && !result.clean) process.exitCode = 1;
