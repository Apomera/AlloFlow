const fs=require('node:fs'),path=require('node:path'),p=path.join(__dirname,'VISUAL-POLISH.md');let s=fs.readFileSync(p,'utf8');
const main=JSON.parse(fs.readFileSync(path.join(__dirname,'showcase-results.json'),'utf8'));
const large=JSON.parse(fs.readFileSync(path.join(__dirname,'showcase-large-results.json'),'utf8'));
if(!main.passed||!large.passed)throw Error('Showcase verification not complete');
if(!s.includes('150-block pavilion'))s=s.replace('Evidence:', 'Showcase browser checks passed for a **150-block pavilion** on desktop and phone, including rotation, keyboard controls, PNG export, walking-mode stability, and camera/build/history restoration. A separate **129-block row** stayed within the camera and ahead of fog on a phone; closing restored the original viewing range.\n\nEvidence:');
s=s.replace('[Showcase interaction checks](showcase-results.json),','[Showcase interaction checks](showcase-results.json), [large-build checks](showcase-large-results.json),');
const fd=fs.openSync(p,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);console.log('Final visual evidence recorded.');
