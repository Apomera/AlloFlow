'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm');
const here=__dirname,root=path.resolve(here,'../..'),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const manifest=JSON.parse(fs.readFileSync(path.join(here,'manifest.json')));
Object.entries(manifest.files).forEach(([file,expected])=>assert.equal(hash(fs.readFileSync(path.join(here,file))),expected,file));
let source=fs.readFileSync(path.join(root,'stem_lab/stem_tool_watercycle.js'),'utf8');
assert.equal(hash(source),manifest.sourceSha256);assert.equal(hash(fs.readFileSync(path.join(root,'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'))),manifest.sourceSha256);new vm.Script(source);
for(const name of ['refine-status-changes.json','changes.json']){const record=JSON.parse(fs.readFileSync(path.join(here,name)));assert.equal(hash(source),record.after);for(const change of record.changes.slice().reverse()){assert.equal(source.slice(change.offset,change.offset+change.after.length),change.after);source=source.slice(0,change.offset)+change.before+source.slice(change.offset+change.after.length);}assert.equal(hash(source),record.before);}
const qa=JSON.parse(fs.readFileSync(path.join(here,'browser-results.json'))),visual=JSON.parse(fs.readFileSync(path.join(here,'visual-results.json')));assert(qa.passed&&visual.passed&&visual.paused3dInitialization);assert.equal(hash(fs.readFileSync(path.join(here,'qa.cjs'))),qa.harnessSha256);console.log('PASS: source, mirror, evidence hashes and reversible deltas; '+qa.checkCount+' browser checks, '+visual.captures.length+' captures');
