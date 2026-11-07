
import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
const source=fs.readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8').replace(/\r\n/g,'\n');
const start=source.indexOf('        function evaluateMission() {');
const end=source.indexOf('\n        }\n',start)+10;
if(start<0||end<10)throw Error('Mission evaluator not found');

const evaluate=new Function('input',
  'const mission={id:"crossDesert",timeLimit:240,successText:"Crossing completed"}; const {missionElapsed,desertReached,raptor}=input; const missionGroundContact=!!input.missionGroundContact; let missionOutcome="active",result=null; function finishMission(success,message){missionOutcome=success?"success":"failed";result={success,message};} '+source.slice(start,end)+'; evaluateMission(); return result;');
describe('Desert crossing requires uninterrupted flight, energy and reaching the oasis',()=>{
  it.each([
    [20,false,50,false,false,false,null],
    [239.999,false,50,false,false,false,null],
    [100,true,0.01,false,false,false,'success'],
    [240,false,50,false,false,false,'time'],
    [100,true,0,false,false,false,'energy'],
    [20,false,0,false,false,false,'energy'],
    [20,false,-10,false,false,false,'energy'],
    [20,false,50,true,false,false,'ground'],
    [100,true,50,true,false,false,'ground'],
    [20,false,50,false,true,false,'ground'],
    [20,false,50,false,false,true,'ground'],
  ])('at %s seconds, reached=%s, %s energy, landed=%s crashed=%s earlierContact=%s', (missionElapsed,desertReached,calories,landed,crashed,missionGroundContact,expected)=>{
    const result=evaluate({missionElapsed,desertReached,raptor:{calories,landed,crashed},missionGroundContact});
    if(expected===null){expect(result).toBeNull();return;}
    if(expected==='success'){expect(result).toEqual({success:true,message:'Crossing completed'});return;}
    expect(result?.success).toBe(false);expect(result.message).not.toBe('Crossing completed');expect(result.message).toMatch(expected==='energy'?/energy/i:expected==='ground'?/land|ground/i:/time/i);
  });
});
