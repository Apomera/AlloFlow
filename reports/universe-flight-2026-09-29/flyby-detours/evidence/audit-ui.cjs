'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',rel='stem_lab/stem_tool_universe.js',hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const before=fs.readFileSync(path.join(__dirname,'baseline-ui.js'),'utf8'),after=fs.readFileSync(path.join(repo,rel),'utf8'),edits=JSON.parse(fs.readFileSync(path.join(__dirname,'ui-patch.json'),'utf8'));
let replay=before;for(const e of edits){assert.equal(replay.split(e.before).length,2);replay=replay.replace(e.before,e.after);}assert.equal(replay,after);
let inverse=after;for(const e of [...edits].reverse()){assert.equal(inverse.split(e.after).length,2);inverse=inverse.replace(e.after,e.before);}assert.equal(inverse,before);
assert.equal(after,fs.readFileSync(path.join(repo,'desktop/web-app/public',rel),'utf8'));new vm.Script(after,{filename:rel});
const result={beforeSha256:hash(before),afterSha256:hash(after),forwardExact:true,inverseExact:true,mirrorExact:true,syntaxValid:true,edits:edits.length};fs.writeFileSync(path.join(__dirname,'ui-audit.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
