'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const target=path.resolve(__dirname,'../../tests/geometry_world_ground_batching.test.js');let source=fs.readFileSync(target,'utf8');
const old='expect(engine.getGroundBlockCount()).toBe(1767);';assert(source.includes(old));
source=source.replace(old,'expect(engine.getGroundBlockCount()).toBe((garden.ground.xMax - garden.ground.xMin + 1) * (garden.ground.zMax - garden.ground.zMin + 1));');
const fd=fs.openSync(target,'r+');fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));fs.closeSync(fd);
