import { parse } from 'acorn';

// Compare complete named declarations without freezing unrelated features in
// the same large tool. Missing or duplicate anchors fail instead of matching "".
export function exactDeclarations(source, names) {
  const text = source.replace(/\r\n/g, '\n');
  const wanted = new Set(names), result = {};
  const pending = [parse(text, { ecmaVersion: 'latest' })];
  while (pending.length) {
    const node = pending.pop();
    if (!node || typeof node !== 'object') continue;
    const name = ['FunctionDeclaration', 'VariableDeclarator'].includes(node.type) && node.id?.name;
    if (wanted.has(name)) {
      if (Object.hasOwn(result, name)) throw new Error('Duplicate preservation anchor: ' + name);
      result[name] = text.slice(node.start, node.end);
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) pending.push(...value);
      else if (value && typeof value === 'object') pending.push(value);
    }
  }
  for (const name of wanted) if (!Object.hasOwn(result, name)) throw new Error('Missing preservation anchor: ' + name);
  return result;
}
