import {derive,MAX_TURNS} from './lesson_board_engine.js';
// Compare engine-derived prefixes so only real successful moves shape the world.
export function worldProgress(board,run){
 const impact={},milestones=[];let before=derive(board,{turn:-1,steps:{}});
 for(let turn=0;turn<=Math.min(run.turn,MAX_TURNS-1);turn++){
  const after=derive(board,{...run,turn}),newLocations=after.visited.filter(id=>!before.visited.includes(id));
  for(const id of newLocations){const location=board.locations.find(node=>node.id===id);milestones.push({kind:'location',id,turn:turn+1,conceptId:location.conceptId});for(const projectId of before.built){const project=board.projects.find(item=>item.id===projectId);if(project.effect.kind==='yield'&&impact[projectId])impact[projectId].earned++;}}
  for(const id of after.built.filter(id=>!before.built.includes(id))){impact[id]={turn:turn+1,earned:0};milestones.push({kind:'project',id,turn:turn+1});}before=after;
 }
 return {progress:before,impact,milestones,stage:before.complete?'complete':before.built.length?'building':before.visited.length?'discovering':'ready'};
}
