#!/usr/bin/env node
/**
 * One-time/reproducible source pass for the Educator Evaluation UI.
 *
 * The evaluation panel is intentionally also usable without the AlloFlow
 * shell, so every call keeps an English fallback. This pass only touches
 * user-facing JSX text, watched attributes/props, and notification arguments
 * in the UI portion of the source. Framework tables, scoring logic, sample
 * evidence, identifiers, and packet/export formats remain untouched.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_PATH = path.join(ROOT, 'educator_evaluation_source.jsx');
const PAYLOAD_PATH = path.join(__dirname, 'educator_evaluation_localization_payload.cjs');
const UI_START_LINE = 1835;
const UI_ATTRS = new Set(['title', 'aria-label', 'aria-description', 'aria-roledescription',
  'aria-placeholder', 'aria-valuetext', 'placeholder', 'alt', 'label', 'summary', 'download']);
const UI_PROPS = new Set(['label', 'title', 'sub', 'subtitle', 'subhead', 'heading', 'desc',
  'description', 'text', 'message', 'msg', 'tooltip', 'hint', 'placeholder', 'caption', 'name',
  'cta', 'buttonText', 'body', 'note', 'tip', 'empty', 'emptyText', 'error', 'errorText',
  'confirm', 'prompt', 'question', 'answer', 'explanation', 'feedback', 'instruction',
  'instructions', 'ariaLabel', 'aria-label', 'legend', 'blurb', 'headline', 'detail', 'details',
  'summary', 'sourceLine', 'subLabel', 'helpText', 'shortLabel', 'longLabel', 'placeholderText']);
const UI_CALLS = new Set(['addToast', 'toast', 'alert', 'confirm', 'announce', 'announceToSR',
  'setError', 'setSpotlightMessage', 'setStatusMessage', 'speak', 'notify']);
const PRESERVE = new Set([
  'PDE Educator Effectiveness', 'Act 13 Toolkit', 'Maine DOE Educator Effectiveness',
  'PEPG Rule Ch. 180', 'Pennsylvania Act 13', 'Portland PEPG', 'Maine PEPG',
]);

function looksLikeProse(value) {
  const text = String(value).trim();
  if (text.length < 3 || text.length > 400 || !/[A-Za-z]{2}/.test(text)) return false;
  if (/^https?:|^\/|^data:|^blob:|^#|^\.|^@/.test(text)) return false;
  if (/^[a-z0-9]+([._-][a-z0-9]+)+$/i.test(text)) return false;
  if (/^[a-z][a-zA-Z0-9]*$/.test(text) && !/ /.test(text)) return false;
  if (/^[A-Z][A-Z0-9_]+$/.test(text)) return false;
  const words = text.split(/\s+/);
  const hyphenish = words.filter((word) => /[a-z]-[a-z0-9[]/.test(word) || /^(hover|focus|group|sm|md|lg|xl|dark|motion):/.test(word)).length;
  if (words.length > 1 && hyphenish >= Math.max(2, words.length / 2)) return false;
  if (/^[0-9\s.,:;%+\-*/()]+$/.test(text)) return false;
  if (/^[a-z]+\([^)]*\)$/i.test(text)) return false;
  return !PRESERVE.has(text);
}

function htmlDecode(value) {
  return String(value).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, '\u00a0');
}

function hash(value) {
  let h = 2166136261;
  for (const ch of String(value)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

function keyFor(value, seen) {
  const english = String(value).replace(/\s+/g, ' ').trim();
  const stem = english.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '').slice(0, 58) || 'copy';
  const key = `educator_evaluation.${stem}_${hash(english)}`;
  if (!seen.has(key)) seen.set(key, english);
  return key;
}

function lineOf(source, offset) { return source.slice(0, offset).split('\n').length; }
function rawString(node, source) { return source.slice(node.start, node.end); }
function propName(node) {
  if (!node) return '';
  if (node.name && ['Identifier', 'JSXIdentifier'].includes(node.name.type)) return node.name.name;
  if (node.name && node.name.type === 'StringLiteral') return node.name.value;
  if (node.key && node.key.type === 'Identifier') return node.key.name;
  if (node.key && node.key.type === 'StringLiteral') return node.key.value;
  return '';
}
function isUiCall(node) {
  if (!node || node.type !== 'CallExpression') return false;
  const callee = node.callee;
  return callee && callee.type === 'Identifier' && UI_CALLS.has(callee.name);
}
function isInsideVisiblePosition(path) {
  let current = path;
  while (current && current.parentPath) {
    const parent = current.parentPath;
    const node = parent.node;
    if (node.type === 'CallExpression' && node.callee && node.callee.type === 'Identifier' && node.callee.name === 't') return false;
    if (node.type === 'JSXAttribute') return UI_ATTRS.has(propName(node));
    if (node.type === 'ObjectProperty' || node.type === 'ObjectMethod') return UI_PROPS.has(propName(node));
    if (isUiCall(node)) return node.arguments[0] === current.node || current.findParent((p) => p.node === node);
    if (node.type === 'JSXExpressionContainer' && parent.parentPath && parent.parentPath.node.type === 'JSXElement') return true;
    if (node.type === 'VariableDeclarator' || node.type === 'FunctionDeclaration' || node.type === 'Program') return false;
    current = parent;
  }
  return false;
}
function isVisibleLiteral(path) {
  const parent = path.parentPath && path.parentPath.node;
  if (!parent) return false;
  if (path.findParent((p) => p.node && p.node.type === 'CallExpression' && p.node.callee && p.node.callee.type === 'Identifier' && p.node.callee.name === 't')) return false;
  if (parent.type === 'JSXAttribute') return UI_ATTRS.has(propName(parent));
  if (parent.type === 'ObjectProperty' || parent.type === 'ObjectMethod') return UI_PROPS.has(propName(parent));
  if (parent.type === 'CallExpression' && isUiCall(parent)) return parent.arguments[0] === path.node;
  if (parent.type === 'ConditionalExpression') return parent.consequent === path.node || parent.alternate === path.node;
  if (parent.type === 'BinaryExpression' && parent.operator === '+') return true;
  if (parent.type === 'LogicalExpression' && ['||', '??', '&&'].includes(parent.operator)) return true;
  if (parent.type === 'TemplateLiteral') return true;
  return isInsideVisiblePosition(path);
}

const source = fs.readFileSync(SOURCE_PATH, 'utf8');
const ast = parser.parse(source, {
  sourceType: 'unambiguous', allowReturnOutsideFunction: true, errorRecovery: true,
  plugins: ['jsx', 'optionalChaining', 'nullishCoalescingOperator', 'classProperties', 'objectRestSpread'],
});
const entries = new Map();
const replacements = [];
const seenRanges = new Set();
// Preserve keys already emitted by an earlier pass. The source pass is safe to
// rerun (for example after OneDrive retries a generated-file write), and the
// payload must remain cumulative rather than shrinking to only new wrappers.
traverse(ast, {
  CallExpression(path) {
    const node = path.node;
    if (!node.callee || node.callee.type !== 'Identifier' || node.callee.name !== 't') return;
    const key = node.arguments[0];
    const fallback = node.arguments[1];
    if (key && key.type === 'StringLiteral' && fallback && fallback.type === 'StringLiteral') entries.set(key.value, fallback.value);
  },
});
function addReplacement(start, end, english, replacement) {
  const range = `${start}:${end}`;
  if (seenRanges.has(range)) return;
  seenRanges.add(range);
  replacements.push({ start, end, replacement });
  keyFor(english, entries);
}
function translated(raw, english) {
  const key = keyFor(english, entries);
  return `t(${JSON.stringify(key)}, ${raw})`;
}

traverse(ast, {
  JSXText(path) {
    if (lineOf(source, path.node.start) < UI_START_LINE) return;
    const raw = source.slice(path.node.start, path.node.end);
    const trimmed = raw.trim();
    if (!looksLikeProse(htmlDecode(trimmed))) return;
    const leading = raw.slice(0, raw.indexOf(trimmed));
    const trailing = raw.slice(raw.indexOf(trimmed) + trimmed.length);
    const english = htmlDecode(trimmed);
    addReplacement(path.node.start, path.node.end, english,
      `${leading}{${translated(JSON.stringify(english), english)}}${trailing}`);
  },
  StringLiteral(path) {
    if (lineOf(source, path.node.start) < UI_START_LINE || !isVisibleLiteral(path)) return;
    const english = path.node.value;
    if (!looksLikeProse(english)) return;
    // JSX text is handled as a JSXText node, so this covers attributes,
    // watched object properties, call arguments, and deep expression branches.
    const raw = rawString(path.node, source);
    const value = translated(raw, english);
    addReplacement(path.node.start, path.node.end, english,
      path.parentPath && path.parentPath.node.type === 'JSXAttribute' ? `{${value}}` : value);
  },
});

// Apply right-to-left so Babel offsets stay valid and JSX text replacements do
// not get nested inside an attribute/object literal replacement.
replacements.sort((a, b) => b.start - a.start);
let updated = source;
for (const item of replacements) updated = updated.slice(0, item.start) + item.replacement + updated.slice(item.end);
const stagedSource = path.join(require('node:os').tmpdir(), `alloflow-educator-evaluation-source-${process.pid}.jsx`);
fs.writeFileSync(stagedSource, updated, 'utf8');
try { fs.renameSync(stagedSource, SOURCE_PATH); }
catch (_) { fs.copyFileSync(stagedSource, SOURCE_PATH); try { fs.unlinkSync(stagedSource); } catch (_) {} }

const payload = [...entries.entries()].sort(([a], [b]) => a.localeCompare(b));
const payloadText = `/** Generated from educator_evaluation_source.jsx. Apply these keys to the shared UI manifest. */\n'use strict';\nmodule.exports = ${JSON.stringify(payload.map(([key, english]) => ({ key, english })), null, 2)};\n`;
const stagedPayload = path.join(require('node:os').tmpdir(), `alloflow-educator-evaluation-payload-${process.pid}.cjs`);
fs.writeFileSync(stagedPayload, payloadText, 'utf8');
try { fs.renameSync(stagedPayload, PAYLOAD_PATH); }
catch (_) { fs.copyFileSync(stagedPayload, PAYLOAD_PATH); try { fs.unlinkSync(stagedPayload); } catch (_) {} }
console.log(`Wrapped ${replacements.length} Educator Evaluation strings and emitted ${payload.length} keys.`);
