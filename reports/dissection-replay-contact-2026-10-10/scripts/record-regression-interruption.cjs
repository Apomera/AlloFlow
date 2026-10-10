const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-replay-contact-2026-10-10'),status=JSON.parse(fs.readFileSync(path.join(report,'live-status.json'),'utf8'));
assert(Array.isArray(status.processes)&&status.processes.length===0);
const run=JSON.parse(fs.readFileSync(path.join(report,'regression-1/run.json'),'utf8'));assert.equal(run.exitCode,undefined);
const hash=value=>crypto.createHash('sha256').update(value).digest('hex'),current={};for(const[file,expected]of Object.entries(run.startHashes)){current[file]=hash(fs.readFileSync(path.join(repo,file)));assert.equal(current[file],expected);}
fs.writeFileSync(path.join(report,'regression-1/interruption.json'),JSON.stringify({at:new Date().toISOString(),reason:'Terminal session reset; no completion receipt or results. Two logged cases pass but run is excluded from completion evidence.',processCheck:status,currentHashes:current,inputHashesUnchanged:true},null,2)+'\n');console.log('Interrupted run documented; source and protected fixture unchanged.');
