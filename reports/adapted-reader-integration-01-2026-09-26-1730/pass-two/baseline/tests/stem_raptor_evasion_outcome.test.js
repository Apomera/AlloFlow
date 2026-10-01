
import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
const source=fs.readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8').replace(/\r\n/g,'\n');
const start=source.indexOf('        function evaluateMission() {');
const end=source.indexOf('\n        }\n',start)+10;
if(start<0||end<10)throw Error('Mission evaluator not found');
const evaluate=new Function('input',
  'const mission={id:"avoidPredator",timeLimit:240,successText:"Survived"}; const {missionElapsed,missionCatches,hunterDistance}=input; let missionOutcome="active",result=null; function finishMission(success,message){missionOutcome=success?"success":"failed";result={success,message};} '+source.slice(start,end)+'; evaluateMission(); return result;');
describe('Evasion requires both survival time and catches',()=>{
  it.each([
    [0,2,100,null],
    [239.999,2,31,null],
    [240,2,30,true],
    [240,3,100,true],
    [240,1,100,false],
    [20,2,29.99,false],
    [240,2,29.99,false],
  ])('at %s seconds with %s catches and %s m separation', (missionElapsed,missionCatches,hunterDistance,expected)=>{
    const result=evaluate({missionElapsed,missionCatches,hunterDistance});
    if(expected===null)expect(result).toBeNull();else expect(result?.success).toBe(expected);
  });
});
