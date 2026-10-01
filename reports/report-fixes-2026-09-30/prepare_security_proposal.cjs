'use strict';
const fs = require('node:fs'), path = require('node:path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const { createTwoFilesPatch } = require('diff');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const target = path.join(root, 'AlloFlowANTI.txt');
const before = fs.readFileSync(target, 'utf8');
const replacements = {
  _alloRandomToken: `_alloRandomToken = (bytes = 16) => {
  if (!Number.isInteger(bytes) || bytes < 1 || bytes > 256) throw new Error('Invalid capability token size.');
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') throw new Error('Secure randomness is unavailable. Open the app in a supported secure browser before creating a share.');
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return Array.from(values, value => value.toString(16).padStart(2, '0')).join('');
}`,
  generateSessionCode: `generateSessionCode = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') throw new Error('Secure randomness is unavailable. Open the app in a supported secure browser before creating a session.');
  const limit = Math.floor(256 / chars.length) * chars.length;
  let result = '';
  while (result.length < 5) {
    const values = new Uint8Array(16);
    crypto.getRandomValues(values);
    for (const value of values) {
      if (value < limit) result += chars[value % chars.length];
      if (result.length === 5) break;
    }
  }
  return result;
}`,
};
const ast = parser.parse(before, { sourceType: 'unambiguous', plugins: ['jsx'] });
const edits = [];
traverse(ast, { VariableDeclarator(p) {
  const replacement = replacements[p.node.id.name];
  if (replacement) edits.push({ start: p.node.start, end: p.node.end, text: replacement, name: p.node.id.name });
}, FunctionDeclaration(p) {
  const name = p.node.id?.name;
  const replacement = replacements[name];
  if (replacement) edits.push({ start: p.node.start, end: p.node.end,
    text: replacement.replace(name + ' = ', 'function ' + name).replace(' => {', ' {'), name });
} });
assert.equal(edits.length, 2, 'Both unique host capability generators must exist');
assert.equal(new Set(edits.map(edit => edit.name)).size, 2);
let candidate = before;
for (const edit of edits.sort((a, b) => b.start - a.start)) candidate = candidate.slice(0, edit.start) + edit.text + candidate.slice(edit.end);
parser.parse(candidate, { sourceType: 'unambiguous', plugins: ['jsx'] });
const mockCrypto = { getRandomValues(values) { for (let i = 0; i < values.length; i++) values[i] = i; return values; } };
const make = crypto => new Function('crypto', 'const ' + replacements._alloRandomToken + '; const ' + replacements.generateSessionCode + '; return {_alloRandomToken,generateSessionCode};')(crypto);
const api = make(mockCrypto);
assert.equal(api._alloRandomToken().length, 32);
assert.equal(api.generateSessionCode().length, 5);
assert.match(api.generateSessionCode(), /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/);
assert.throws(() => make(undefined)._alloRandomToken(), /Secure randomness/);
assert.throws(() => make(undefined).generateSessionCode(), /Secure randomness/);
assert.throws(() => api._alloRandomToken(0), /Invalid capability/);
const rejectionCrypto = { getRandomValues(values) { values.fill(255); for (let i = 7; i < values.length; i++) values[i] = i - 7; return values; } };
assert.equal(make(rejectionCrypto).generateSessionCode(), 'ABCDE');
assert.equal(fs.readFileSync(target, 'utf8'), before, 'The shared host must remain unchanged');
const patch = createTwoFilesPatch('a/AlloFlowANTI.txt', 'b/AlloFlowANTI.txt', before, candidate, '', '', { context: 3 });
fs.writeFileSync(path.join(__dirname, 'security-host-proposal.patch'), patch);
fs.writeFileSync(path.join(__dirname, 'security-proposal-validation.json'), JSON.stringify({
  syntax: 'passed', inMemoryAssertions: 7, sharedHostUnchanged: true, applied: false,
  limitations: ['Five-character compatibility is retained; limited human-code entropy remains.', 'Longer join codes require UI/signalling/mailbox compatibility work; no external settings or deployment changed.'],
}, null, 2) + '\n');
console.log('Review-only capability RNG patch prepared: syntax and 7 in-memory assertions passed; shared host unchanged.');
