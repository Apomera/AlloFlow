const fs=require('fs'),path=require('path'),repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const source=fs.readFileSync(path.join(repo,'stem_lab/stem_tool_dissection.js'),'utf8'),lines=source.split(/\r?\n/);
console.log(fs.readFileSync(path.join(repo,'AGENT_HANDOFF.md'),'utf8').split(/\r?\n/).slice(0,45).join('\n'));
for(const name of['var nextActionModel','function performPrimaryNextAction','var workflowSteps','stageHandoffUsesTool']){const i=lines.findIndex(x=>x.includes(name));console.log('\n'+name+' at '+(i+1)+'\n'+lines.slice(Math.max(0,i-7),i+100).map((x,j)=>(Math.max(0,i-7)+j+1)+': '+x).join('\n'));}
