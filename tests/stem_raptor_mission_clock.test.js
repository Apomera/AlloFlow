import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
const source=fs.readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8').replace(/\r\n/g,'\n');
const start=source.indexOf('        function missionClockReading('),end=source.indexOf('\n        }\n',start)+10;
if(start<0||end<10)throw Error('Mission clock helper missing');
const reading=new Function(source.slice(start,end)+';return missionClockReading;')();
describe('Mission countdown boundaries',()=>{
  it.each([[0,'3:00','normal'],[149.99,'0:31','normal'],[150,'0:30','low'],[169.99,'0:11','low'],[170,'0:10','urgent'],[179.99,'0:01','urgent'],[180,'0:00','urgent'],[181,'0:00','urgent']])('at %s elapsed seconds', (elapsed,text,state)=>{expect(reading(180,elapsed,false,'active')).toMatchObject({text,state});});
  it('gives pause precedence over urgency without changing the remaining time',()=>{expect(reading(180,175,true,'active')).toMatchObject({text:'0:05',state:'paused',label:'Paused'});});
  it('keeps finished missions distinct from an ordinary pause',()=>{expect(reading(180,175,true,'success')).toMatchObject({text:'0:05',state:'ended',label:'Time at end'});expect(reading(180,181,true,'failed')).toMatchObject({text:'0:00',state:'ended',label:'Time expired'});});
});
