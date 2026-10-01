const fs = require('node:fs');
const parser = require('@babel/parser');
const source = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const tree = parser.parse(source, {sourceType: 'module', plugins: ['jsx']});
const matches = [];
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'JSXOpeningElement' && node.name?.name === 'WordSoundsGenerator') {
    matches.push({line: node.loc.start.line, attributes: node.attributes.filter(attr => ['onClose', 'onMinimize', 'onExpand'].includes(attr.name?.name)).map(attr => ({name: attr.name.name, line: attr.loc.start.line, code: source.slice(attr.start, attr.end)}))});
  }
  for (const [key, value] of Object.entries(node)) if (!['loc', 'start', 'end', 'extra'].includes(key)) {
    if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === 'object') walk(value);
  }
}
walk(tree);
fs.writeFileSync(__dirname + '/word-sounds-content-nav-readonly.json', JSON.stringify(matches, null, 2));
console.log(JSON.stringify(matches));
