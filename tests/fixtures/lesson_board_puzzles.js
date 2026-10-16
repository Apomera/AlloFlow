import { createRequire } from 'node:module';
const {makeBoard,source}=createRequire(import.meta.url)('../../dev-tools/fixtures/lesson_board.cjs');
export {source};
export function puzzleBoard(){
  const board=makeBoard();
  const {options,answer,...allocate}=board.locations[0];
  const {controls,...repair}=board.locations[1];
  board.locations[0]={...allocate,kind:'allocate',instruction:'Build a fictional counter model for three processes from the water-cycle lesson. Distribute all six model tokens using the rules.',needs:['Evaporation counter','Condensation counter','Collection counter'],budget:6,constraints:['Give the collection counter one token.','Give evaporation one more token than condensation.'],allocation:[3,2,1],explanation:'This fictional model uses one collection token. The five remaining tokens split into three for evaporation and two for condensation. These counts are game rules, not scientific quantities.'};
  board.locations[1]={...repair,kind:'repair',instruction:'Inspect these water-cycle statements. Mark each statement to keep or repair using the lesson evidence.',items:['Heating water produces vapor.','Cooling vapor produces liquid droplets.','Precipitation keeps water above the ground.'],repairs:[0,0,1],corrections:['','','Precipitation returns water to the ground.'],explanation:'Heating causes evaporation and cooling causes condensation. The precipitation statement must be repaired because precipitation returns water to the ground.'};
  return board;
}
export const getPuzzle=kind=>puzzleBoard().locations.find(node=>node.kind===kind);
