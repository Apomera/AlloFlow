const fs=require('fs'),path=require('path'),crypto=require('crypto');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-tools-cohesion-2026-10-05');
const file=path.join(repo,'tests/dissection_lab_improvements.test.js'),before=fs.readFileSync(file,'utf8'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
if(sha(before)!=='015d2af425fa478f403131cb61ce85d38e8b4951c23675d8f5e812567dbd3047')throw Error('Unit guard');
let next=before;const edits=[];
for(const text of ['Stale canvas bitmap must not be downloaded','Stale bitmap must not be downloaded']){
  const old="const staleImageSpy = vi.spyOn(sourceCanvas, 'toDataURL').mockImplementation(() => { throw new Error('"+text+"'); });";
  const replacement="const staleImageSpy = vi.fn(() => { throw new Error('"+text+"'); });\r\n    Object.defineProperty(sourceCanvas, 'toDataURL', { configurable: true, value: staleImageSpy });";
  if(next.split(old).length!==2)throw Error('Spy uniqueness');next=next.replace(old,replacement);edits.push({name:'Separate source bitmap guard from inherited prototype spy',before:old,after:replacement});
}
const old='createSpy.mockRestore(); staleImageSpy.mockRestore(); imageSpy.mockRestore(); downloadSpy.mockRestore();';
const replacement='createSpy.mockRestore(); delete sourceCanvas.toDataURL; imageSpy.mockRestore(); downloadSpy.mockRestore();';
if(next.split(old).length!==3)throw Error('Cleanup count');next=next.split(old).join(replacement);edits.push({name:'Restore source inheritance after each fixture',before:old,after:replacement,occurrences:2});
require(path.join(repo,'node_modules/@babel/parser')).parse(next,{sourceType:'module'});
if(fs.readFileSync(file,'utf8')!==before)throw Error('Concurrent unit edit');fs.writeFileSync(file,next);
const receipt=JSON.parse(fs.readFileSync(path.join(report,'edits/unit-edits.json')));receipt.afterSha256=sha(next);receipt.edits.push(...edits);receipt.fixtureCorrection='Vitest reused an inherited prototype spy when spying on the source instance. Give the source its own guard so destination encoding and source bitmap access are observed independently.';
fs.writeFileSync(path.join(report,'edits/unit-edits.json'),JSON.stringify(receipt,null,2));
fs.writeFileSync(path.join(report,'edits/unit-spy-correction.json'),JSON.stringify({beforeSha256:sha(before),afterSha256:sha(next),edits},null,2));
console.log(JSON.stringify({afterSha256:sha(next),syntax:'passed'}));
