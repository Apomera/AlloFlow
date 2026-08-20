#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LANG_DIR = path.join(ROOT, 'lang');

function findDuplicateKeys(text, file) {
  let index = 0;
  let line = 1;
  const duplicates = [];

  const fail = (message) => {
    throw new Error(`${file}:${line}: ${message}`);
  };
  const skipWhitespace = () => {
    while (index < text.length && /\s/.test(text[index])) {
      if (text[index] === '\n') line += 1;
      index += 1;
    }
  };
  const parseString = () => {
    const start = index;
    const startLine = line;
    index += 1;
    while (index < text.length) {
      if (text[index] === '\n') line += 1;
      if (text[index] === '\\') {
        index += 2;
        continue;
      }
      if (text[index] === '"') {
        index += 1;
        return { value: JSON.parse(text.slice(start, index)), line: startLine };
      }
      index += 1;
    }
    fail('unterminated string');
  };
  const parsePrimitive = () => {
    const start = index;
    while (index < text.length && !/[\s,}\]]/.test(text[index])) index += 1;
    JSON.parse(text.slice(start, index));
  };
  const parseValue = (pathParts) => {
    skipWhitespace();
    if (text[index] === '{') return parseObject(pathParts);
    if (text[index] === '[') return parseArray(pathParts);
    if (text[index] === '"') return void parseString();
    return parsePrimitive();
  };
  const parseObject = (pathParts) => {
    index += 1;
    skipWhitespace();
    const keys = new Map();
    if (text[index] === '}') {
      index += 1;
      return;
    }
    while (index < text.length) {
      if (text[index] !== '"') fail('expected object key');
      const key = parseString();
      if (keys.has(key.value)) {
        duplicates.push({
          path: [...pathParts, key.value].join('.'),
          firstLine: keys.get(key.value),
          duplicateLine: key.line,
        });
      } else {
        keys.set(key.value, key.line);
      }
      skipWhitespace();
      if (text[index] !== ':') fail('expected colon');
      index += 1;
      parseValue([...pathParts, key.value]);
      skipWhitespace();
      if (text[index] === '}') {
        index += 1;
        return;
      }
      if (text[index] !== ',') fail('expected comma');
      index += 1;
      skipWhitespace();
    }
    fail('unterminated object');
  };
  const parseArray = (pathParts) => {
    index += 1;
    skipWhitespace();
    let item = 0;
    if (text[index] === ']') {
      index += 1;
      return;
    }
    while (index < text.length) {
      parseValue([...pathParts, String(item)]);
      item += 1;
      skipWhitespace();
      if (text[index] === ']') {
        index += 1;
        return;
      }
      if (text[index] !== ',') fail('expected comma');
      index += 1;
      skipWhitespace();
    }
    fail('unterminated array');
  };

  parseValue([]);
  skipWhitespace();
  if (index !== text.length) fail('unexpected trailing content');
  return duplicates;
}

const files = fs.readdirSync(LANG_DIR).filter((name) => name.endsWith('.js')).sort();
let count = 0;
for (const name of files) {
  const file = path.join(LANG_DIR, name);
  const duplicates = findDuplicateKeys(fs.readFileSync(file, 'utf8'), name);
  for (const item of duplicates) {
    count += 1;
    console.error(`${name}:${item.duplicateLine}: duplicate ${item.path} (first at line ${item.firstLine})`);
  }
}

if (count) {
  console.error(`✗ check_lang_duplicate_keys: ${count} duplicate key(s) across ${files.length} pack(s).`);
  process.exitCode = 1;
} else {
  console.log(`✓ check_lang_duplicate_keys: ${files.length} lang pack(s) have no duplicate object keys.`);
}
