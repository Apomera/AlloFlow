const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const child = require('node:child_process');
const root = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const before = fs.readFileSync(path.join(__dirname,'renderer-before.js'),'utf8');
const after = fs.readFileSync(path.join(__dirname,'renderer-after.js'),'utf8');
const forward = JSON.parse(fs.readFileSync(path.join(__dirname,'renderer-patch.json'),'utf8'));
const inverse = JSON.parse(fs.readFileSync(path.join(__dirname,'renderer-inverse.json'),'utf8'));
function apply(source, edits) {
  for (const {before,after} of edits) {
    const at = source.indexOf(before);
    if (at < 0 || source.indexOf(before,at+1)>=0) throw new Error('Patch anchor is not unique');
    source = source.slice(0,at)+after+source.slice(at+before.length);
  }
  return source;
}
const canonical = fs.readFileSync(path.join(root,forward.source),'utf8');
const mirror = fs.readFileSync(path.join(root,forward.mirror),'utf8');
new vm.Script(after,{filename:'universe_flight_scene.js'});
const report = {
  beforeSha256:hash(before),afterSha256:hash(after),sourceMatchesCandidate:canonical===after,mirrorMatchesCandidate:mirror===after,
  forwardExact:apply(before,forward.edits)===after,inverseExact:apply(after,inverse.edits)===before,
  routeGeometryMathShadersUnchanged:before.slice(0,before.indexOf('  function create(canvas, options) {'))===after.slice(0,after.indexOf('  function create(canvas, options) {')),
  syntaxValid:true,editCount:forward.edits.length
};
if (report.beforeSha256!==forward.beforeSha256 || report.afterSha256!==forward.afterSha256 || Object.values(report).includes(false)) throw new Error(JSON.stringify(report));
const diff=child.spawnSync('git',['diff','--no-index','--no-ext-diff','--unified=3',path.join(__dirname,'renderer-before.js'),path.join(__dirname,'renderer-after.js')],{encoding:'utf8',windowsHide:true});
if(diff.status!==1)throw new Error('Diff failed: '+diff.stderr);
fs.writeFileSync(path.join(__dirname,'renderer.patch'),diff.stdout);
fs.writeFileSync(path.join(__dirname,'renderer-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
