'use strict';
// Remove preparation-only adapters: final tests must exercise actual production.
const fs=require('node:fs'),path=require('node:path');
function rewrite(name,from,to){const target=path.resolve(__dirname,'../../tests/'+name),input=fs.readFileSync(target,'utf8'),newline=input.includes('\r\n')?'\r\n':'\n';let source=input.replace(/\r\n/g,'\n');if(!source.includes(from))throw Error('Missing test preparation anchor in '+name);const next=source.replace(from,to).replace(/\n/g,newline),fd=fs.openSync(target,'r+');try{fs.writeFileSync(fd,next,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(next));}finally{fs.closeSync(fd);}}
rewrite('geometry_world_generation_depth.test.js',String.raw`import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { patchGeometryGeneration } = require('../reports/geometry-world-expedition-2026-09-12/patch-generation.cjs');
const baseline = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8');
// The prepared patch can be verified before the parent integrates shared sources.
const source = (baseline.includes('// ── Rich lesson generation helpers') ? baseline : patchGeometryGeneration(baseline)).replace(/\r\n/g, '\n');`,String.raw`const source = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8').replace(/\r\n/g, '\n');`);
rewrite('geometry_world_generation_collisions.test.js',String.raw`import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { patchGenerationCollisions } = require('../reports/geometry-world-expedition-2026-09-12/patch-generation-collisions.cjs');
const input = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8');
const source = input.includes('each authored voxel can belong to only one fill') ? input : patchGenerationCollisions(input);`,String.raw`const source = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8');`);
console.log('Generation tests now read final production source only; scope suite was already production-only.');
