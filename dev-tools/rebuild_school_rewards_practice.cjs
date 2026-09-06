// rebuild_school_rewards_practice.cjs
// Rebuilds both practice pages through Node file handles. Use this instead of
// running the Python builder directly: on OneDrive the builder intermittently
// fails at output.truncate() after writing, leaving a stale trailing suffix.
// Written in the 2026-09-04 handoff session; relocated from scratch/ on 2026-09-05.
// Run from the repository root: node dev-tools/rebuild_school_rewards_practice.cjs
const fs=require('fs');function write(file,s){if(fs.existsSync(file)){const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s))}finally{fs.closeSync(fd)}}else fs.writeFileSync(file,s)}function edit(file,a,b){const s=fs.readFileSync(file,'utf8');if(!s.includes(a))throw Error('Missing '+a);write(file,s.replace(a,b))}
const b64=require('child_process').execFileSync('python',['-c',"import pathlib,base64\n__file__=str(pathlib.Path('dev-tools/build_school_rewards_practice.py').resolve())\nsrc=pathlib.Path(__file__).read_text(encoding='utf-8')\nexec(src[:src.index(\"\\nfor p in ['school-rewards-practice.html'\")])\nprint(base64.b64encode(page.encode('utf-8')).decode('ascii'))"],{encoding:'utf8',maxBuffer:4000000}).trim();const page=Buffer.from(b64,'base64');for(const file of ['school-rewards-practice.html','desktop/web-app/public/school-rewards-practice.html'])write(file,page);
console.log('Rebuilt both practice pages');
