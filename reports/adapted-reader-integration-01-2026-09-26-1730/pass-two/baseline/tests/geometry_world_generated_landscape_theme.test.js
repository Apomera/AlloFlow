import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
function slice(from,to){const start=source.indexOf(from),end=source.indexOf(to,start+from.length);if(start<0||end<0)throw Error('Missing production source boundary '+from);return source.slice(start,end);}
const api=new Function(slice('  // ── Rich lesson generation helpers','  // ── End rich lesson generation helpers')
  +slice('  var AI_WORLD_PROMPT_BASE =','  // Module scope, not inside the builder view')
  +slice('  var AI_FOLLOWUP_PROMPT =','  // ══════════════════════════════════════════════════════')
  +'\nreturn { geometryLessonDepth, geometryGenerationBrief, geometryGeneratedLessonIssues, runGeometryLessonGeneration, worldPrompt:AI_WORLD_PROMPT_BASE };')();
function fixture(){
  const plan={title:'Two workshops',activities:[]};
  const lesson={title:plan.title,description:'Build equal-volume designs.',spawnPoint:[-3,3,-3],objectives:['Build one prism','Revise a second prism'],ground:{xMin:-20,xMax:20,zMin:-20,zMax:20,y:0,type:'grass'},structures:[],npcs:[{name:'Guide',position:[-1,1,-1],dialogue:'Welcome',question:null}],activities:[]};
  for(let i=0;i<2;i++){
    const id='workshop-'+i,activity={id,title:'Workshop '+i,challenge:'Build another twelve-cube prism',hint:'Count cubes in each layer',successCriteria:'Compare both volumes',reflection:'Explain the arrangement',estimatedMinutes:6};
    plan.activities.push(activity);lesson.activities.push({...activity,npcName:id,position:[i*6,3,3],structureIds:[id]});
    lesson.structures.push({id,type:'fill',x1:i*6,x2:i*6+2,y1:1,y2:2,z1:7,z2:8,block:'brick'});
    lesson.npcs.push({name:id,position:[i*6,1,4],dialogue:'Build a different arrangement of twelve cubes.',question:{text:'How many cubes?',choices:['12','6','10'],correct:0}});
  }
  return {plan,lesson};
}

describe('Generated lesson scenery selection',()=>{
  it('advertises only supported scenery and an explicit meadow default in the existing prompts',()=>{
    const prompt=api.geometryGenerationBrief({topic:'Volume',grade:'4'},api.geometryLessonDepth(1));
    expect(prompt).toContain('use meadow by default');
    expect(prompt).toContain('choose coastal only when');
    expect(prompt).toContain('Only meadow and coastal are supported');
    expect(api.worldPrompt).toContain('"landscapeTheme":"meadow"');
  });
  it('accepts absent legacy metadata and supported themes, preserving coastal and defaulting new lessons without extra calls',async()=>{
    for(const theme of [undefined,'meadow','coastal']){
      const {plan,lesson}=fixture();if(theme!==undefined)lesson.landscapeTheme=theme;
      expect(api.geometryGeneratedLessonIssues(lesson,api.geometryLessonDepth(1),plan)).toEqual([]);
      let index=0;const callGemini=vi.fn(async()=>JSON.stringify(index++===0?plan:lesson));
      const generated=await api.runGeometryLessonGeneration({depth:1,topic:'A coastal harbor' ,grade:'4',callGemini});
      expect(generated.landscapeTheme).toBe(theme===undefined?'meadow':theme);
      expect(callGemini).toHaveBeenCalledTimes(2);
      expect(generated.activities).toHaveLength(2);
    }
  });
  it('rejects unknown or malformed theme values without silently changing them',()=>{
    for(const theme of ['desert','Coastal',null,4,{}]){
      const {plan,lesson}=fixture();lesson.landscapeTheme=theme;
      expect(api.geometryGeneratedLessonIssues(lesson,api.geometryLessonDepth(1),plan).join(' ')).toContain('landscapeTheme must be meadow or coastal');
      expect(lesson.landscapeTheme).toBe(theme);
    }
  });
});
