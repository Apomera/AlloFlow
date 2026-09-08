const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sourcePath=path.join(process.cwd(),'stem_lab/stem_tool_geometryworld.js');
const mirrorPath=path.join(process.cwd(),'desktop/web-app/public/stem_lab/stem_tool_geometryworld.js');
const replacements=[
 ["var nearLow = geometryWorldSrgbColor(THREE, 0x5f7b51), nearHigh = geometryWorldSrgbColor(THREE, 0x6a8058);", "var nearLow = engine._horizon && engine._horizon.material && engine._horizon.material.color ? engine._horizon.material.color.clone() : geometryWorldSrgbColor(THREE, 0x496d46);\n            var nearHigh = geometryWorldSrgbColor(THREE, 0x6a8058);"],
 ["var tint = (far ? farLow : nearLow).clone().lerp(far ? farHigh : nearHigh, Math.min(1, y / (far ? 30 : 14)));", "var heightTint = far ? Math.min(1, y / 30) : smooth((y - 0.15) / 8);\n              var tint = (far ? farLow : nearLow).clone().lerp(far ? farHigh : nearHigh, heightTint);"],
 ["if (!far) tint.lerp(moss, smooth(noise(lx - 45, lz + 19) - 0.35) * 0.22);", "if (!far) tint.lerp(moss, smooth(noise(lx - 45, lz + 19) - 0.35) * 0.22 * heightTint);" ]
];
function transform(text) {
 const eol=text.includes('\r\n')?'\r\n':'\n';
 for(const [before,after] of replacements) {
  assert.equal(text.split(before).length-1,1,'expected exactly one terrain-color anchor');
  text=text.replace(before,after.replace(/\r?\n/g,eol));
 }
 return text;
}
function write(file,text) { const fd=fs.openSync(file,'r+');try {fs.writeFileSync(fd,text,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(text));}finally{fs.closeSync(fd);} }
const helperPath=path.join(__dirname,'artisan-landscape-helper.txt');
write(helperPath,transform(fs.readFileSync(helperPath,'utf8')));
// Keep the shared-source read adjacent to the targeted write.
const source=transform(fs.readFileSync(sourcePath,'utf8'));
write(sourcePath,source);write(mirrorPath,source);
assert.deepEqual(fs.readFileSync(sourcePath),fs.readFileSync(mirrorPath));
console.log('Foothill starts at exact horizon color; moss and crest tint fade in with height. Geometry and mesh count unchanged.');
