'use strict';
// Prepare original lesson corrections as JSON. Production changes require the
// separate --apply invocation of apply-preset-corrections.cjs by the parent.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),source=fs.readFileSync(path.join(root,'stem_lab/stem_tool_geometryworld.js'),'utf8').replace(/\r\n/g,'\n');
function preset(id,next){const a=source.indexOf('    '+id+': {'),b=source.indexOf('    '+next+': {',a);assert(a>=0&&b>a);return new Function('return ({'+source.slice(a,b)+'}).'+id+';')();}
const garden=preset('geometryGarden','compositeVolume'),shipping=preset('realWorld','geometryGarden');
const fill=(id,block,x1,y1,z1,x2,y2,z2)=>({id,type:'fill',x1,y1,z1,x2,y2,z2,block,...(y1===0&&y2===0?{measurementLayer:'ground'}:{})});

shipping.spawnPoint=[5,2.6,10];
shipping.structures.forEach((s,i)=>{s.id='shipping-structure-'+(i+1);if(s.y1===0&&s.y2===0)s.measurementLayer='ground';});
const packing=shipping.npcs.find(n=>n.name==='Packing Expert');packing.position=[5,1,7];
packing.dialogue='Look through the open front of the shipping container. Its usable interior is 6 units long, 2 high, and 3 deep. Each small cube-shaped box is 2 by 2 by 2. Keep the boxes aligned with the container edges. Three fit along the length, one fits in the height, and one fits in the depth: 3 times 1 times 1 gives three boxes. The narrow space at the front remains empty. Volume alone cannot tell us whether a whole box fits.';
packing.question={text:'What is the container interior volume? (6 by 2 by 3)',choices:['36 cubic units','24 cubic units','48 cubic units'],correct:0,followUp:[
  {text:'With 2 by 2 by 2 boxes aligned to the container edges, how many fit?',choices:['3 boxes: 3 along the length, 1 high, 1 deep','4 boxes because 36 divided by 8 is more than 4','6 boxes because the length is 6'],correct:0},
  {text:'Three boxes occupy 3 times 8 = 24 cubic units. How much interior space remains?',choices:['12 cubic units','4 cubic units','No empty space'],correct:0},
  {text:'Why can a fourth whole box not fit into the remaining front strip?',choices:['The strip is only 1 unit deep, but a box needs 2','The fourth box would have no volume','A container can never hold more than three boxes'],correct:0}
]};
const design=shipping.npcs.find(n=>n.name==='Design Challenge');design.position=[1,1,16];
design.dialogue='Use the glass platform to build a solid package model with exactly 36 unit cubes. Try 6 by 3 by 2, then a different arrangement such as 4 by 3 by 3. Measure your own blocks and explain how the dimensions multiply to 36. The protected platform is a work surface, not part of your package.';

garden.ground.xMax=54;
garden.spawnPoint=[0,2.6,0];
garden.depth='discovery';garden.estimatedMinutes=35;
garden.description='An ungraded garden of eight discoveries: follow a level path from one unit cube to layers, equal volumes, composite shapes, nested cubes, and a hidden stepped monument. Use Activities for optional hints, travel, and a reflection journal. No quiz answers or scores are required. Explore at your own pace.';
garden.objectives=['Follow eight optional discoveries at your own pace','Measure real blocks and distinguish length, area, and volume','Compare shapes, layers, and materials using evidence','Walk around the screen wall to find the hidden stepped monument'];
garden.structures.forEach((s,i)=>{s.id='garden-structure-'+(i+1);if(s.y1===0&&s.y2===0)s.measurementLayer='ground';});
garden.structures[0].x2=45;garden.structures[0].id='garden-main-path';
// Keep measured targets face-disconnected from neighbours and decorative beds.
for(const s of garden.structures){
  if(s.x1===32 && ((s.x2===36 && s.z1===-6)||(s.x2===34 && s.z1===-3))){s.z1--;s.z2--;}
  if(s.block==='sand'&&s.x1===30&&s.z1===7){s.x1=28;s.x2=29;s.z1=10;s.z2=11;}
}
const shellIndex=garden.structures.findIndex(s=>s.block==='glass'&&s.x1===42&&s.y1===1&&s.z1===-8&&s.x2===46&&s.y2===5);
assert(shellIndex>=0,'Expected existing nested-cube outer fill');
garden.structures.splice(shellIndex,1,
  fill('nested-shell-bottom','glass',42,1,-8,46,1,-4),
  fill('nested-shell-top','glass',42,5,-8,46,5,-4),
  fill('nested-shell-left','glass',42,2,-8,42,4,-4),
  fill('nested-shell-right','glass',46,2,-8,46,4,-4),
  fill('nested-shell-back','glass',43,2,-8,45,4,-8),
  fill('nested-shell-front','glass',43,2,-4,45,4,-4));
const inner=garden.structures.find(s=>s.block==='gold'&&s.x1===43&&s.y1===2&&s.z1===-7);assert(inner);inner.id='nested-gold-cube';
garden.structures.push(
  fill('hidden-garden-turn','stone',43,0,7,45,0,12),
  fill('hidden-garden-approach','stone',46,0,10,54,0,12));
const npc=name=>{const n=garden.npcs.find(n=>n.name===name);assert(n,name);return n;};
npc('Garden Keeper').dialogue='Welcome to the Geometry Garden. No quizzes or scores are required. Follow the stone path, measure what interests you, and use Activities for eight optional discovery stops. Your journal is for observations and self-review. Near the far screen wall, the path turns around its end into the hidden garden. Take your time.';
npc('Station 1 Guide').position=[4,1,0];
npc('Station 2 Guide').position=[10,1,0];
npc('Station 2 Guide').dialogue='This row highlights length: five unit cubes sit side by side. It is still a three-dimensional block model, with length 5, width 1, and height 1. Measure it to find volume 5 cubic units. What would happen if you added another row?';
npc('Station 3 Guide').position=[18,1,0];
npc('Station 3 Guide').dialogue='The top surface of this model is a 5 by 3 rectangle, with area 15 square units. The model is also one cube thick, so its volume is 15 cubic units. The numbers match here, but square units describe a surface and cubic units describe the solid. Compare both ideas as you measure.';
npc('Station 4 Guide').position=[26,1,0];
npc('Station 4 Guide').dialogue='This prism stacks three layers of 15 cubes. Its dimensions are 5 by 3 by 3, and its volume is 45 cubic units. Compare it with the one-layer gold model. What changes when you add layers while keeping the same base?';
npc('Convergence Guide').position=[36,1,4];
npc('Convergence Guide').dialogue='Three gold shapes have volume 24: a 12 by 1 by 2 long slab, a 4 by 3 by 2 compact block, and a 2 by 2 by 6 tower. Measure each separately. Different dimensions can produce the same amount of occupied space. Which would you choose for a narrow site, and why?';
npc('Hidden Garden Sage').position=[53,1,10];
npc('Hidden Garden Sage').dialogue='You followed the path around the wall and found the stepped monument. Its five layers contain 45, 21, 15, 3, and 1 cubes, for a total of 85 cubic units. This stepped solid is an approximation, not an exact pyramid. Measure its occupied volume, then compare it with the larger bounding box. Why does the bounding box include so much empty space?';
garden.npcs.splice(garden.npcs.length-1,0,
  {position:[37,1,-5],name:'Composition Guide',color:0x2563eb,dialogue:'The cyan part of this L-shaped model is 5 by 3 by 3: 45 cubic units. The gold part is 3 by 3 by 3: 27 cubic units. They touch without overlapping, so the whole has volume 72. Measure the connected structure and use the material breakdown to compare the two parts.',question:null},
  {position:[47,1,-6],name:'Nested Cube Guide',color:0xf59e0b,dialogue:'A 5 by 5 by 5 glass shell surrounds a gold 3 by 3 by 3 cube. The outside bounding cube contains 125 unit positions. Its inner cube uses 27, leaving 98 glass cubes in the shell. The gold now fills the cavity. Measure the touching glass-and-gold model as one structure: 125 total, with 98 glass and 27 gold in the material breakdown.',question:null});

function activity(id,title,npcName,position,challenge,hint,successCriteria,reflection){return{id,title,npcName,position,challenge,hint,successCriteria,reflection};}
garden.activities=[
  activity('garden-unit','One cube, one unit','Station 1 Guide',[5,2.6,4],'Find the single cyan cube. Predict its dimensions, then measure it. Explain what one cubic unit means.','The separate wooden sign is scenery. Aim at the cyan cube itself. One unit of length runs along each of its three edges.',['I found length, width, and height of 1.','I connected one cube with one cubic unit.'],'What makes this cube a useful unit for comparing all the larger models?'),
  activity('garden-row','A row highlights length','Station 2 Guide',[10,2.6,4],'Measure the five-cube cyan row. Compare it with the single cube, then imagine a second identical row beside it.','The row has dimensions 5 by 1 by 1. It models length clearly, but still has width, height, and volume.',['I found volume 5 cubic units.','I predicted 10 cubes in two adjacent rows.'],'Which dimensions would change when you added a second row, and which would stay the same?'),
  activity('garden-area','A surface and a solid','Station 3 Guide',[18,2.6,5],'Study the top of the gold 5 by 3 model. Compare its 15-square-unit top surface with the volume of the one-layer solid.','Area counts covering squares. Volume counts unit cubes. This model is one cube thick, so its area and volume have the same numerical value but different units.',['I identified area 15 square units.','I identified volume 15 cubic units.','I explained the different units.'],'When do the same numbers describe different measurements?'),
  activity('garden-layers','Layers make volume','Station 4 Guide',[26,2.6,5],'Compare the three-layer cyan prism with the one-layer gold rectangle. Predict, then measure, how the volume changes.','Each layer contains 5 times 3 = 15 cubes. Stack three equal layers to make 45.',['I compared one layer with three layers.','I found volume 45 cubic units.'],'How can you calculate the volume without counting all 45 cubes individually?'),
  activity('garden-equal','Three shapes, equal volume','Convergence Guide',[37,2.6,5],'Find all three gold models near the crossing. Measure each separately and record a different set of dimensions for each.','The models are 12 by 1 by 2, 4 by 3 by 2, and 2 by 2 by 6. Each product is 24.',['I measured three different shapes with volume 24.','I compared the footprints and heights.'],'Which model suits a narrow space, and which suits a height limit? Explain your choice.'),
  activity('garden-composite','Add the parts of an L','Composition Guide',[38,2.6,-3],'Predict the volume of the cyan-and-gold L-shaped solid. Calculate each colored part, add them, then measure the whole.','The cyan part contains 45 cubes and the gold part contains 27. Touching parts with no overlap add to 72; the enclosing box includes empty space.',['I calculated 45 + 27 = 72.','I matched the material counts to the colored parts.'],'Why would multiplying only the whole bounding dimensions overcount this L-shaped solid?'),
  activity('garden-nested','Look inside nested cubes','Nested Cube Guide',[48,2.6,-5],'Look through the glass shell at the gold cube. Calculate the outer cube, inner cube, and glass-only shell; then compare with Measure.','The outer 5-cube side gives 125 positions. The inner 3-cube side gives 27. Subtract to find 98 glass cubes. Since the gold touches the glass, Measure counts them together and lists both materials.',['I found 125 outer positions, 27 gold cubes, and 98 glass cubes.','I distinguished the shell from the filled model.'],'What would the occupied volume become if the inner gold cube were removed? Explain without changing the protected model.'),
  activity('garden-hidden','Discover the stepped monument','Hidden Garden Sage',[53,2.6,12],'Follow the stone turn around the screen wall. Count the five layer areas of the hidden stepped monument and compare their sum with Measure.','From bottom to top, the layers are 5 by 9, 3 by 7, 3 by 5, 1 by 3, and 1 by 1. Add 45 + 21 + 15 + 3 + 1.',['I found five layers and total occupied volume 85.','I explained why the 5 by 9 by 5 bounding box is larger than the solid.'],'What did this final discovery show you about measuring a shape with empty corners?')
];
assert(garden.npcs.every(n=>n.question===null));
for(const [name,lesson] of [['geometry-garden-corrected.json',garden],['real-world-corrected.json',shipping]])fs.writeFileSync(path.join(__dirname,name),JSON.stringify(lesson,null,2)+'\n');
console.log(JSON.stringify({gardenActivities:garden.activities.length,gardenNpcs:garden.npcs.length,gardenGround:garden.ground,packingAnswer:packing.question.followUp[0].choices[0]}));
