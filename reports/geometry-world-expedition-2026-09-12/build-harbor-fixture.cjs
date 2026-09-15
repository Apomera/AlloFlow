// Original AlloFlow lesson; no reference-world assets or dialogue are copied.
// Run to regenerate the reviewable JSON fixture and deterministic layout evidence.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const structures = [];
function fill(id, block, x1, y1, z1, x2, y2, z2) {
  const s = { id, type: 'fill', x1, y1, z1, x2, y2, z2, block };
  if (y1 === 0 && y2 === 0) s.measurementLayer = 'ground';
  structures.push(s);
}
function q(text, correct, wrong1, wrong2, followUp) {
  const result = { text, choices: [correct, wrong1, wrong2], correct: 0 };
  if (followUp) result.followUp = followUp;
  return result;
}

// A two-block-wide, level promenade joins all three districts in a loop.
fill('promenade-south', 'stone', -19, 0, 11, 19, 0, 12);
fill('promenade-west', 'stone', -19, 0, -12, -18, 0, 10);
fill('promenade-north', 'stone', -17, 0, -12, 19, 0, -11);
fill('promenade-east', 'stone', 18, 0, -10, 19, 0, 10);
fill('quay-practice-floor', 'sand', -24, 0, 13, -19, 0, 18);
fill('garden-work-floor', 'sand', -6, 0, -9, 5, 0, -4);
fill('reservoir-interior-floor', 'diamond', 8, 0, -7, 11, 0, -5);
fill('makers-work-floor', 'sand', 3, 0, 14, 8, 0, 19);
fill('quay-link', 'wood', -22, 0, 11, -20, 0, 12);
fill('reservoir-link', 'stone', 13, 0, -1, 17, 0, 0);

// Mathematically meaningful solids stand apart from scenery and one another.
fill('cargo-six-cubes', 'diamond', -15, 1, 14, -13, 1, 15);
fill('garden-a-6-by-4', 'gold', -15, 1, -9, -10, 1, -6);
fill('garden-b-8-by-3', 'diamond', -15, 1, 2, -8, 1, 4);
// Open-front reservoir: interior x=8..11, z=-7..-5, y=1..2.
fill('reservoir-back-wall', 'stone', 7, 1, -8, 12, 2, -8);
fill('reservoir-left-wall', 'stone', 7, 1, -7, 7, 2, -5);
fill('reservoir-right-wall', 'stone', 12, 1, -7, 12, 2, -5);
fill('reservoir-blue-6-by-2-by-2', 'diamond', 7, 1, 3, 12, 2, 4);
fill('reservoir-gold-4-by-3-by-2', 'gold', 10, 1, 7, 13, 2, 9);

// Waterfront rhythm: short bollards and low benches preserve broad sightlines.
[-23, -17, -11, -5, 1, 13, 19, 25].forEach(x => fill('quay-bollard-' + x, 'wood', x, 1, 20, x, 1, 20));
fill('quay-bench', 'wood', -10, 1, 17, -7, 1, 17);
fill('garden-bench', 'wood', -23, 1, 1, -21, 1, 1);
fill('reservoir-bench', 'wood', 22, 1, 7, 24, 1, 7);

// Trellis at the garden edge, with a high lintel and a completely open passage.
fill('garden-trellis-west', 'wood', -24, 1, -8, -24, 3, -8);
fill('garden-trellis-east', 'wood', -21, 1, -8, -21, 3, -8);
fill('garden-trellis-lintel', 'wood', -24, 4, -8, -21, 4, -8);
fill('garden-trellis-cap', 'grass', -24, 5, -8, -21, 5, -8);

// A hollow lighthouse is a recognizable skyline anchor, not a measured target.
fill('lighthouse-west', 'brick', 22, 1, -17, 22, 5, -15);
fill('lighthouse-east', 'brick', 24, 1, -17, 24, 5, -15);
fill('lighthouse-back', 'brick', 23, 1, -17, 23, 5, -17);
fill('lighthouse-front', 'brick', 23, 1, -15, 23, 5, -15);
fill('lighthouse-window-west', 'glass', 22, 6, -17, 22, 6, -15);
fill('lighthouse-window-east', 'glass', 24, 6, -17, 24, 6, -15);
fill('lighthouse-window-back', 'glass', 23, 6, -17, 23, 6, -17);
fill('lighthouse-window-front', 'glass', 23, 6, -15, 23, 6, -15);
fill('lighthouse-roof', 'wood', 22, 7, -17, 24, 7, -15);
fill('lighthouse-light', 'torch', 23, 8, -16, 23, 8, -16);

// Open makers' shelter frames the final build pad without covering it.
fill('makers-post-west', 'wood', 12, 1, 18, 12, 3, 18);
fill('makers-post-east', 'wood', 17, 1, 18, 17, 3, 18);
fill('makers-roof', 'brick', 12, 4, 17, 17, 4, 19);
fill('makers-display-plinth', 'stone', 14, 1, 19, 15, 1, 19);

// Small, original trees and raised planted borders soften the outer edges.
for (const [i, x, z] of [[1, -24, -17], [2, -8, -17], [3, 7, -17], [4, 24, 0]]) {
  fill('tree-' + i + '-trunk', 'wood', x, 1, z, x, 2, z);
  fill('tree-' + i + '-crown', 'grass', x - 1, 3, z - 1, x + 1, 3, z + 1);
  fill('tree-' + i + '-top', 'grass', x, 4, z, x, 4, z);
}
fill('garden-border-base', 'brick', -24, 1, -4, -22, 1, -2);
fill('garden-border-green', 'grass', -24, 2, -4, -22, 2, -2);

const npcs = [
  {
    position: [-24, 1, 11], name: 'Harbor Welcome', color: 0x0f766e,
    dialogue: 'Welcome to Geometry Harbor. Our waterfront needs useful designs that make careful use of space and materials. Follow the level stone promenade: the quay is here, the gardens are beside the trellis, and the reservoirs are below the lighthouse. The six activity cards can guide you to each stop. Explore at your own pace. Questions check your reasoning; review your own builds using the activity checklist. Use Q to change shape, R to rotate, and Escape to free the cursor. Keep unit cubes selected for the counting challenges.', question: null
  },
  {
    position: [-17, 1, 13], name: '1. Sora - Arrival Quay', color: 0x0f766e,
    dialogue: 'Start with the cyan cargo sample beside the quay: it is three cubes long, two wide, and one layer tall. Look down at the sand practice pad beside the arrival path. Use Place or B to build your own six-cube copy, then measure it with M. Remove only your own cubes and reshape them into a row of six. What changed, and what stayed the same? The sample is protected so everyone can compare their work.',
    question: q('How many unit cubes are in one 3 by 2 layer?', '6 cubes', '5 cubes', '9 cubes', [
      q('The cargo sample has one layer. What is its volume?', '6 cubic units', '6 square units', '3 cubic units'),
      q('You rearrange six cubes into a 6 by 1 by 1 row. What stays the same?', 'The volume is still 6 cubic units', 'The length is still 3 units', 'The volume becomes 8 cubic units')
    ])
  },
  {
    position: [-16, 1, -9], name: '2. Ada - Garden Area', color: 0xd97706,
    dialogue: 'Follow the promenade toward the trellis to reach our garden district. The gold garden model has six tiles along its long edge and four along its short edge. Each tile covers one square unit. Count the rows, predict the area, then check the dimensions with Measure. We need growing space for twenty-four plants, one plant per tile. Remember: the model is one cube thick, but its planting surface is an area.',
    question: q('A garden has 4 rows with 6 planting tiles in each row. What is its area?', '24 square units', '10 square units', '24 cubic units', [
      q('At one plant per tile, how many plants fit in the gold garden?', '24 plants', '20 plants', '48 plants'),
      q('Why do we use square units for the planting surface?', 'We are counting a two-dimensional covering', 'Every shape must use cubic units', 'The number of rows is the perimeter')
    ])
  },
  {
    position: [-7, 1, 3], name: '3. Rowan - Garden Design', color: 0x0891b2,
    dialogue: 'The cyan garden model is eight tiles long and three wide. Compare its area and outside boundary with the gold six-by-four model. In the large sand work area beyond the gardens, build a one-layer rectangle using twenty-four unit cubes. Try six by four, then revise it to twelve by two. Count each outside edge once. Explain which shape needs less fencing. The work pad is twelve by six, so both designs fit.',
    question: q('What is the area of the cyan 8 by 3 garden?', '24 square units, the same as the gold garden', '22 square units', '11 square units', [
      q('What is the perimeter of the cyan 8 by 3 garden?', '22 units: 8 + 3 + 8 + 3', '24 units: 8 times 3', '11 units: 8 + 3'),
      q('The gold 6 by 4 garden has perimeter 20. Which model needs less fencing?', 'The gold garden, by 2 units', 'The cyan garden, by 2 units', 'Both need the same fencing'),
      q('Your 12 by 2 revision still has area 24. What is its perimeter?', '28 units', '24 units', '14 units')
    ])
  },
  {
    position: [14, 1, 0], name: '4. Nia - Reservoir Works', color: 0x2563eb,
    dialogue: 'The open-front reservoir below the lighthouse has a cyan floor inside three stone walls. Its usable space is four cubes across, three from front to back, and two layers high. Count only the inside space, not the stone walls. Enter through the open front. Fill the inside with your own unit cubes one layer at a time, then measure your fill. Predict the second layer before you place it. You can remove your fill and try a different arrangement later.',
    question: q('How many cubes cover one 4 by 3 interior layer?', '12 cubes', '7 cubes', '24 cubes', [
      q('There is room for 2 layers of 12 cubes. What is the reservoir capacity?', '24 cubic units', '14 cubic units', '12 square units'),
      q('One layer is already filled. How many more cubes complete the second layer?', '12 more cubes', '24 more cubes', '2 more cubes')
    ])
  },
  {
    position: [16, 1, 6], name: '5. Ivo - Equal Capacity', color: 0x7c3aed,
    dialogue: 'Beside the reservoir are two solid capacity models. The cyan one is six long, two wide, and two high. The gold one is four long, three wide, and two high. Measure them separately. Both fit twenty-four cubes, but their footprints differ. Compare their base areas and heights, then explain how a shorter length can be balanced by a wider base. These are capacity models; their outside surfaces are not the water capacity.',
    question: q('What is the volume of the cyan 6 by 2 by 2 model?', '24 cubic units', '12 cubic units', '10 cubic units', [
      q('What is the volume of the gold 4 by 3 by 2 model?', '24 cubic units', '9 cubic units', '12 cubic units'),
      q('How can both models have equal volume?', 'Each has a base area of 12 and 2 layers', 'They have the same length and width', 'The taller-looking color holds more cubes')
    ])
  },
  {
    position: [10, 1, 15], name: '6. Mira - Makers Pavilion', color: 0xbe185d,
    dialogue: 'Return along the promenade to the open shelter and the sand makers pad. Design a twenty-four-cube model for a waterfront learning room. Choose dimensions that fit the six-by-six pad. Measure, explain your length-times-width-times-height calculation, then revise one dimension while keeping the same volume. A three-by-four-by-two room and a two-by-three-by-four room are possible. Review your evidence in the activity card. Keep or select only your own model when preparing a Showcase or Print Lab project; the harbor is our reference world.',
    question: q('A learning room model is 3 by 4 by 2. How many unit cubes does it use?', '24 cubes', '12 cubes', '9 cubes', [
      q('Which revised room uses the same number of cubes and fits the 6 by 6 pad?', '2 by 3 by 4', '2 by 3 by 3', '3 by 3 by 3'),
      q('Which evidence best explains that your design has the required volume?', 'Measured dimensions and a matching 24-cube count', 'Only its color and a nice name', 'Only the length of one edge')
    ])
  }
];

const activities = [
  { id: 'quay-practice', title: 'Arrival quay: build and revise', npcName: npcs[1].name, position: [-20, 2.2, 14],
    challenge: 'On the sand practice pad, build a 3 by 2 by 1 cargo model from six unit cubes. Measure it, then reshape your cubes into a 6 by 1 by 1 row.',
    hint: 'Aim down at a nearby floor tile. Use Place or B. Q cycles shapes; select the unit cube for this task. Use M to measure your own connected build.',
    successCriteria: ['My first model contains exactly six unit cubes.', 'My revised model still contains six cubes.', 'I can name a dimension that changed and explain why the volume stayed the same.'],
    reflection: 'What changed when you rearranged the cargo, and what evidence shows that its volume did not change?' },
  { id: 'garden-area', title: 'Market gardens: measure growing space', npcName: npcs[2].name, position: [-17, 2.2, -7],
    challenge: 'Study the gold 6 by 4 garden model. Count rows, calculate the planting area, and explain how many plants fit at one plant per tile.',
    hint: 'Count six tiles in one row and four rows. The planting surface is measured in square units even though we use blocks to model it.',
    successCriteria: ['I identified the 6-unit and 4-unit edges.', 'I calculated 24 square units.', 'I explained why one plant per tile gives 24 plants.'],
    reflection: 'How do rows help you find the area without counting every tile individually?' },
  { id: 'garden-perimeter', title: 'Market gardens: redesign the boundary', npcName: npcs[3].name, position: [-6, 2.2, 3],
    challenge: 'Compare the gold 6 by 4 garden with the cyan 8 by 3 garden. On the 12 by 6 sand work pad, build 24 cubes in one layer, then revise to a 12 by 2 rectangle.',
    hint: 'Area counts covered squares; perimeter counts outside unit edges. Walk around the boundary and include both pairs of opposite sides.',
    successCriteria: ['I found area 24 for both reference gardens.', 'I compared perimeters 20 and 22.', 'My 12 by 2 revision has area 24 and perimeter 28.', 'I explained which arrangement needs less fencing.'],
    reflection: 'Why can equal planting areas need different amounts of fencing?' },
  { id: 'reservoir-fill', title: 'Reservoir works: predict and fill', npcName: npcs[4].name, position: [15, 2.2, -2],
    challenge: 'Fill only the reservoir interior: x = 8 to 11, z = -7 to -5, and two layers above the cyan floor. Predict, fill one layer, then complete the second.',
    hint: 'The interior is 4 by 3 by 2. Enter through the open front. Count your fill separately from the three protected stone walls.',
    successCriteria: ['I predicted 12 cubes for one layer.', 'I placed two complete layers with no cubes outside the interior.', 'I checked that my fill contains 24 unit cubes.'],
    reflection: 'How did knowing the first layer help you predict the full capacity?' },
  { id: 'reservoir-compare', title: 'Reservoir works: compare capacities', npcName: npcs[5].name, position: [16, 2.2, 4],
    challenge: 'Measure the cyan 6 by 2 by 2 model and the gold 4 by 3 by 2 model separately. Explain their equal capacity using base area and layers.',
    hint: 'The two models are separated by open space, so Measure should identify each one independently. Both bases contain 12 squares.',
    successCriteria: ['I measured both models as 24 cubic units.', 'I found base area 12 and height 2 for each.', 'I explained how different dimensions can give equal volume.'],
    reflection: 'What changed between the two footprints, and how did that affect their capacity?' },
  { id: 'makers-project', title: 'Makers pavilion: design and explain', npcName: npcs[6].name, position: [9, 2.2, 14],
    challenge: 'On the 6 by 6 sand makers pad, design a connected room model using exactly 24 unit cubes. Measure it, revise its dimensions, and explain both versions.',
    hint: 'Try 3 by 4 by 2, then 2 by 3 by 4. Use only your own model when preparing a Showcase or Print Lab project. The activity checklist is a self-review, not an automatic build grade.',
    successCriteria: ['My model is connected and fits on the pad.', 'It contains exactly 24 unit cubes.', 'My revised design keeps volume 24.', 'I recorded dimensions and an explanation before preparing a shareable model.'],
    reflection: 'Which room would you choose for the harbor community, and what dimensions and measurements support your choice?' }
];

const lesson = {
  title: 'Geometry Harbor - An Area and Volume Expedition',
  description: 'Help a waterfront community design gardens, reservoirs, and a learning room. A level promenade connects three districts, six guided activities, and open build spaces. Plan about 45 minutes, or pause after any district. Explore, predict, build, measure, explain, and revise. Activity checklists support self-review; NPC questions check mathematical reasoning.',
  depth: 'expedition', estimatedMinutes: 45,
  spawnPoint: [-22, 2.2, 17],
  objectives: activities.map(a => a.title),
  ground: { xMin: -27, xMax: 27, zMin: -21, zMax: 21, y: 0, type: 'grass' },
  structures, npcs, activities
};

// Model actual first-fill-wins semantics, excluding flat ground overlays from
// the interactive geometry budget (the accompanying engine change batches them).
const blocks = new Map();
const floor = new Map();
const counts = {};
for (const s of structures) {
  const layer = s.y1 === 0 && s.y2 === 0 ? floor : blocks;
  let added = 0;
  for (let x = s.x1; x <= s.x2; x++) for (let y = s.y1; y <= s.y2; y++) for (let z = s.z1; z <= s.z2; z++) {
    assert(x >= -27 && x <= 27 && z >= -21 && z <= 21, s.id + ' escapes ground');
    const key = [x,y,z].join(',');
    if (!layer.has(key)) { layer.set(key, { x,y,z,id:s.id,block:s.block }); added++; }
  }
  counts[s.id] = added;
}
assert(blocks.size <= 900, 'Leave at least 600 interactive blocks for student work');
function componentAt(seed) {
  const todo = [seed], seen = new Set(), members = [];
  while (todo.length) {
    const p = todo.pop(), key = p.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    if (!blocks.has(key)) continue;
    members.push(p);
    for (const d of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]) todo.push(p.map((v,i) => v+d[i]));
  }
  return members;
}
const teachingTargets = [
  {id:'cargo-six-cubes',seed:[-15,1,14],dimensions:[3,1,2],volume:6},
  {id:'garden-a-6-by-4',seed:[-15,1,-9],dimensions:[6,1,4],volume:24,area:24,perimeter:20},
  {id:'garden-b-8-by-3',seed:[-15,1,2],dimensions:[8,1,3],volume:24,area:24,perimeter:22},
  {id:'reservoir-blue-6-by-2-by-2',seed:[7,1,3],dimensions:[6,2,2],volume:24,baseArea:12},
  {id:'reservoir-gold-4-by-3-by-2',seed:[10,1,7],dimensions:[4,2,3],volume:24,baseArea:12}
];
for (const t of teachingTargets) {
  const cells = componentAt(t.seed);
  assert.equal(cells.length, t.volume, t.id + ' must measure as an isolated target');
  const dimensions = [0,1,2].map(i => Math.max(...cells.map(p=>p[i]))-Math.min(...cells.map(p=>p[i]))+1);
  assert.deepEqual(dimensions,t.dimensions,t.id + ' inclusive-coordinate dimensions');
  if(t.area) assert.equal(dimensions[0]*dimensions[2],t.area);
  if(t.perimeter) assert.equal(2*(dimensions[0]+dimensions[2]),t.perimeter);
}
let reservoirInterior = 0;
for(let x=8;x<=11;x++) for(let y=1;y<=2;y++) for(let z=-7;z<=-5;z++) {
  assert(!blocks.has([x,y,z].join(',')), 'reservoir interior starts empty');
  reservoirInterior++;
}
assert.equal(reservoirInterior,24);
for(let x=8;x<=11;x++) for(let y=1;y<=2;y++) assert(!blocks.has([x,y,-4].join(',')), 'reservoir front remains open');
// A person can walk from spawn to each activity without jumping or flying.
const walkable = (x,z) => x>=-27&&x<=27&&z>=-21&&z<=21&&!blocks.has([x,1,z].join(','))&&!blocks.has([x,2,z].join(','));
const reached = new Set(), queue = [[-22,17]];
for(let i=0;i<queue.length;i++) {
  const [x,z]=queue[i],key=x+','+z;
  if(reached.has(key)||!walkable(x,z))continue;
  reached.add(key);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])queue.push([x+dx,z+dz]);
}
for(const a of activities) assert(reached.has(a.position[0]+','+a.position[2]), a.id+' has a reachable camera arrival');
for(const n of npcs) assert(reached.has(n.position[0]+','+n.position[2]),n.name+' stands in clear reachable ground');
assert.equal(npcs.filter(n=>n.question).length,activities.length,'Objectives and question NPCs align');
const questionSteps = npcs.reduce((n,p)=>n+(p.question?1+(p.question.followUp||[]).length:0),0);
assert.equal(questionSteps,19);
const report = { groundCells:55*43, flatFloorOverlayCells:floor.size, interactiveSceneryAndTeachingBlocks:blocks.size,
  minimumStudentCapacity:1500-blocks.size, structureCount:structures.length, questionNpcCount:6, questionSteps,
  teachingTargets, reservoir:{interior:{x:[8,11],y:[1,2],z:[-7,-5]},dimensions:[4,2,3],capacity:24,frontOpen:true},
  buildPads:{quay:{x:[-24,-19],z:[13,18]},gardens:{x:[-6,5],z:[-9,-4]},makers:{x:[3,8],z:[14,19]}},
  checks:{teachingComponentsIsolated:true,allStationsWalkable:true,allNpcsWalkable:true,objectiveNpcAlignment:true,interiorEmpty:true},
  countsByStructure:counts };
if(require.main===module) {
  fs.writeFileSync(path.join(__dirname,'geometry-harbor.json'),JSON.stringify(lesson,null,2)+'\n');
  fs.writeFileSync(path.join(__dirname,'harbor-layout-evidence.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({interactiveBlocks:blocks.size,floorOverlayCells:floor.size,questionSteps,structures:structures.length,checks:report.checks}));
}
module.exports = { lesson, report };
