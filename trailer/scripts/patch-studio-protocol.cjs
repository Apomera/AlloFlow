'use strict';
// Remotion 4.0.538 bundles Zod 4.5.4 in both entry points. npm overrides cannot
// replace that copy. Backport Zod 4.6.7's sizeCaps/capSize array guard until an
// upstream Remotion release removes it. Refuse unknown bundles before writing.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const hashes = {
  'dist/index.cjs': '44c52d2ba33a4d83f11d0b440c6e912c21f78c91c0be480bfa0819e6e8a78a84',
  'dist/esm/index.mjs': '4bf9f9e0f26a20ec9b2dd78fa44ef3c888351681dd99ce7e1b40f881125c5f99'
};
// Adapted from Zod 4.6.7 core/util.js and core/schemas.js; see ZOD-LICENSE.txt.
const guard = `
// AlloFlow: backport Zod's leading collection-size guard (GHSA-mrhx-c7xc-m3w5).
function alloflowCapArray(inst) {
  const sizeCaps = (checks) => {
    const caps = [];
    for (const ch of checks ?? []) {
      const d = ch._zod.def;
      if (!/_(length|size)$|_equals$/.test(d.check)) break;
      const max = d.maximum ?? d.length ?? d.size;
      if (max >= 0) caps.push([max, ch]);
    }
    return caps;
  };
  const caps = sizeCaps(inst._zod.def.checks);
  if (!caps.length) return;
  const cap = Math.min(...caps.map((c) => c[0]));
  const parse = inst._zod.parse;
  inst._zod.parse = (payload, ctx) => {
    const n = Array.isArray(payload.value) ? payload.value.length : -1;
    if (n > cap && !ctx?.skipChecks && ctx?.direction !== 'backward') {
      for (const [max, ch] of sizeCaps(inst._zod.def.checks)) {
        if (n > max && ch._zod.def.when(payload)) {
          const start = payload.issues.length;
          ch._zod.check(payload);
          payload.issues[start].continue = false;
          attachSchema(payload.issues, start, inst);
          return payload;
        }
      }
    }
    return parse(payload, ctx);
  };
}
`;
const start = '\nvar $ZodArray =';
const end = '    return payload;\n  };\n});\nfunction handlePropertyResult';
const patchedEnd = '    return payload;\n  };\n  alloflowCapArray(inst);\n});\nfunction handlePropertyResult';

function patchSource(source, file) {
  const original = source.replace(guard + start, start).replace(patchedEnd, end);
  if (!hashes[file] || createHash('sha256').update(original).digest('hex') !== hashes[file]) {
    throw new Error('Unrecognized Remotion Studio protocol bundle: ' + file + '. Review the upstream update before changing the security backport.');
  }
  return original.replace(start, guard + start).replace(end, patchedEnd);
}

function prepare(trailerRoot = path.resolve(__dirname, '..')) {
  const directory = path.join(trailerRoot, 'node_modules/@remotion/studio-protocol');
  const pkg = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
  if (pkg.version !== '4.0.538') throw new Error('Review the Studio protocol security backport for Remotion ' + pkg.version);
  // Validate both entry points first, so an unexpected update causes no writes.
  const changes = Object.keys(hashes).map(file => {
    const target = path.join(directory, file);
    const source = fs.readFileSync(target, 'utf8');
    return { target, source, patched: patchSource(source, file) };
  });
  let written = 0;
  for (const change of changes) {
    if (change.source === change.patched) continue;
    fs.writeFileSync(change.target, change.patched);
    written++;
  }
  return written;
}
module.exports = { patchSource, prepare };
if (require.main === module) console.log('Studio protocol security backport: ' + prepare() + ' entry points updated.');
