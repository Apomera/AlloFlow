
import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
const source=fs.readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8').replace(/\r\n/g,'\n');
const start=source.indexOf('        function evaluateMission() {');
const end=source.indexOf('\n        }\n',start)+10;
if(start<0||end<10)throw Error('Mission evaluator not found');

const evaluate=new Function('input',
  'const mission={id:"crossDesert",timeLimit:360,successText:"Crossing completed"}; const {missionElapsed,missionCatches,raptor}=input; const missionGroundContact=!!input.missionGroundContact; let missionOutcome="active",result=null; function finishMission(success,message){missionOutcome=success?"success":"failed";result={success,message};} '+source.slice(start,end)+'; evaluateMission(); return result;');
describe('Desert crossing requires uninterrupted flight, energy and a refuel catch',()=>{
  it.each([
    [20,1,50,false,false,false,null],
    [359.999,1,50,false,false,false,null],
    [360,1,0.01,false,false,false,'success'],
    [360,0,50,false,false,false,'refuel'],
    [360,1,0,false,false,false,'energy'],
    [20,1,0,false,false,false,'energy'],
    [20,1,-10,false,false,false,'energy'],
    [20,1,50,true,false,false,'ground'],
    [360,1,50,true,false,false,'ground'],
    [20,1,50,false,true,false,'ground'],
    [20,1,50,false,false,true,'ground'],
  ])('at %s seconds, %s catches, %s energy, landed=%s crashed=%s earlierContact=%s', (missionElapsed,missionCatches,calories,landed,crashed,missionGroundContact,expected)=>{
    const result=evaluate({missionElapsed,missionCatches,raptor:{calories,landed,crashed},missionGroundContact});
    if(expected===null){expect(result).toBeNull();return;}
    if(expected==='success'){expect(result).toEqual({success:true,message:'Crossing completed'});return;}
    expect(result?.success).toBe(false);expect(result.message).not.toBe('Crossing completed');expect(result.message).toMatch(expected==='energy'?/energy/i:expected==='ground'?/land|ground/i:/refuel/i);
  });
});
