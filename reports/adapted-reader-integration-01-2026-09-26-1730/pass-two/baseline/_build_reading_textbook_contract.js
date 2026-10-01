#!/usr/bin/env node
'use strict';

const fs = require('fs');
const file = 'tests/reading_library.test.js';
let source = fs.readFileSync(file, 'utf8');
const before = "'gutenberg', 'openstax', 'bloom'].includes(sourceId)";
const after = "'gutenberg', 'openstax', 'ck12', 'bloom'].includes(sourceId)";
if (source.includes(after)) {
  console.log(file + ' already recognizes CK-12');
} else {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error('Expected one source allowlist anchor, found ' + count);
  source = source.replace(before, after);
  fs.writeFileSync(file, source);
  console.log(file + ' updated');
}
