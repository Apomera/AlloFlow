const {makeRoom}=require('./connected_escape_room.cjs');
function reviewResponse(prompt) {
 const material=JSON.parse(prompt.split('PLAYER MATERIAL BEGIN\n')[1].split('\nPLAYER MATERIAL END')[0]);
 const node=makeRoom().nodes.find(n=>n.name===material.object.name);
 const answer=node.type==='configure'?node.controls.map(c=>c.correctIndex):node.type==='sequence'?node.order:node.toolId;
 return JSON.stringify({answer,confidence:'clear',reason:'The available clues support this solution.',suggestion:''});
}
module.exports={reviewResponse};
