'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.resolve(__dirname, '../../stem_lab/stem_tool_geometryworld.js'), 'utf8').replace(/\r\n/g, '\n');
function readPreset(id, next) {
  const start = source.indexOf('    ' + id + ': {');
  const end = source.indexOf('    ' + next + ': {', start);
  assert(start >= 0 && end > start, 'Missing preset ' + id);
  return new Function('return ({' + source.slice(start, end) + '}).' + id + ';')();
}
function floors(lesson) {
  lesson.structures.forEach(s => { if (s.y1 === lesson.ground.y && s.y2 === lesson.ground.y) s.measurementLayer = 'ground'; });
}
function write(name, value) { fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n'); }

const area = readPreset('areaSurface', 'buildChallenge');
floors(area);
area.description = 'Follow three model studies from one layer to full volume, compare the surface areas of equal-volume prisms, then build your own layered model.';
area.spawnPoint = [5, 2.6, -1];
area.estimatedMinutes = 30;
area.objectives = [
  'Connect the blue prism’s base area to its 72 cubic units',
  'Compare equal volumes built with different base areas and heights',
  'Explain all four layers of the striped 100-unit prism',
  'Compare the full surface areas of the two 72-unit prisms',
  'Build and explain a layered 24-unit model on the sand work pad'
];
area.structures.push(
  { type: 'fill', block: 'stone', x1: 8, x2: 14, y1: 0, y2: 0, z1: 7, z2: 8, measurementLayer: 'ground' },
  { type: 'fill', block: 'stone', x1: 8, x2: 9, y1: 0, y2: 0, z1: 8, z2: 18, measurementLayer: 'ground' },
  { type: 'fill', block: 'sand', x1: 10, x2: 17, y1: 0, y2: 0, z1: 11, z2: 18, measurementLayer: 'ground' }
);
area.npcs.find(n => n.name === 'Area Guide').dialogue = 'Start with one layer: its area counts square units. Stack identical layers to find volume in cubic units. The blue and gold models are teaching models; use the sand pad beyond the striped prism for your own build. The activity guide offers hints and a place to review your reasoning.';
const flat = area.npcs.find(n => n.name === 'Flat Prism Quiz');
flat.position = [8, 1, 4];
flat.dialogue = 'The blue prism beside me is 6 blocks long, 4 wide and 3 high. Its base has 24 square units. Predict the total, then use Measure on the model to compare your reasoning with its occupied volume.';
const tall = area.npcs.find(n => n.name === 'Tall Prism Quiz');
tall.position = [11, 1, 3];
tall.dialogue = 'This gold prism is 3 by 3 by 8. It holds the same 72 cubic units as the blue prism across the aisle. A smaller base needs more layers. Does equal volume also guarantee equal surface area? The activity guide includes a face-by-face comparison.';
const layers = area.npcs.find(n => n.name === 'Layer Counter');
layers.position = [7, 1, 12];
layers.dialogue = 'Each striped layer is 5 by 5 blocks. Two sand layers and two wood layers make four layers in all. Measure treats the touching colors as one model: 100 cubic units. The color breakdown is 50 sand and 50 wood; it does not mean there are only two layers.';
area.npcs.push({
  position: [18, 1, 13], name: 'Layer Design Coach', question: null,
  dialogue: 'Use this empty sand work pad for a 24-cubic-unit prism. One option is a 4 by 3 base with 2 layers. Try a second arrangement, such as 3 by 2 with 4 layers, leaving a gap between your models. Use full cubes and Measure to check each build. Review the evidence in your activity journal; this build is not automatically scored.'
});
area.activities = [
  {
    id: 'area-base-to-volume', title: 'One layer becomes a solid', npcName: 'Flat Prism Quiz', position: [9, 2.6, 5],
    challenge: 'Examine the blue prism. Predict how many cubes are in one layer and how many are in all three layers, then use Measure on the model to compare your prediction.',
    hint: 'The base is 6 by 4, so one layer covers 24 square units. There are 3 identical layers: 24 × 3. Measure selects the whole connected model, not just its top layer.',
    successCriteria: ['I distinguish a base area of 24 square units from a volume of 72 cubic units.', 'I can explain why multiplying by 3 counts every layer once.'],
    reflection: 'Why does area use square units while the complete model uses cubic units?'
  },
  {
    id: 'area-equal-volume', title: 'Same volume, different silhouette', npcName: 'Tall Prism Quiz', position: [10, 2.6, 4],
    challenge: 'Compare the tall gold prism with the lower blue prism across the aisle. Predict which contains more cubes, then measure each model and explain the result.',
    hint: 'Gold has 9 square units in each of 8 layers. Blue has 24 in each of 3 layers. Both products are 72 even though their heights and footprints differ.',
    successCriteria: ['I measured 72 cubic units in each model.', 'I can explain how a smaller base and a greater height can preserve volume.'],
    reflection: 'Which model would fit better on a narrow shelf, and what other dimension would you need to check?'
  },
  {
    id: 'area-striped-layers', title: 'Read the striped layers', npcName: 'Layer Counter', position: [9, 2.6, 13],
    challenge: 'Walk around the striped prism and count its four layers. Predict its occupied volume and how many cubes use each material before measuring.',
    hint: 'Each layer contains 5 × 5 = 25 cubes. Two sand layers contribute 50 cubes and two wood layers contribute another 50. Touching colors are measured together.',
    successCriteria: ['I explain 25 × 4 = 100 cubic units.', 'I distinguish four physical layers from two material types, with 50 cubes of each.'],
    reflection: 'If you added a fifth layer, what would change about the volume and the model’s height?'
  },
  {
    id: 'area-surface-comparison', title: 'Count every outside face', npcName: 'Tall Prism Quiz', position: [10, 2.6, 1],
    challenge: 'Compare the full exposed surface areas of the blue and gold prisms. Include all six sides, including the underside, as if each model were lifted off the ground. Measure each model to check your totals.',
    hint: 'A rectangular prism has three pairs of faces. Blue: 2 × (6×4 + 6×3 + 4×3) = 108 square units. Gold: 2 × (3×3 + 3×8 + 3×8) = 114. The separate ground is not part of either measured model.',
    successCriteria: ['I counted all six sides and found 108 square units for blue and 114 for gold.', 'I explain why two 72-unit volumes can need different amounts of covering material.'],
    reflection: 'Which model needs less wrapping, and how much less? Would the answer change if the underside did not need covering?'
  },
  {
    id: 'area-layer-design', title: 'Make your own layered prism', npcName: 'Layer Design Coach', position: [19, 2.6, 15],
    challenge: 'Build a 24-cubic-unit prism from full cubes on the empty sand pad. Explain its base area and number of layers. If you want another challenge, build a different 24-unit prism beside it with an empty gap.',
    hint: 'Try a 4 by 3 base and 2 layers: 12 × 2 = 24. A 3 by 2 base with 4 layers also works. Keep separate examples apart so Measure can select each connected build independently.',
    successCriteria: ['My own connected build measures 24 cubic units.', 'I recorded its base area, height and an explanation of why their product is 24.'],
    reflection: 'What did changing the base and height do to your model’s silhouette? Review your evidence here; this build is a self-review activity, not an automatically scored task.'
  }
];

const composite = readPreset('compositeVolume', 'fractionVolume');
floors(composite);
const stem = composite.structures.find(s => s.x1 === 5 && s.x2 === 6 && s.z1 === 4 && s.z2 === 8);
assert(stem && stem.y1 === 1 && stem.y2 === 3, 'Expected original 30-cell stem');
stem.y2 = 2;
stem.block = 'gold';
composite.spawnPoint = [10, 2.6, 10];
composite.estimatedMinutes = 30;
composite.description = 'Follow a two-color T, a stepped pyramid and an open U to compare decomposition with empty-space reasoning. Finish by building a connected 50-unit design.';
composite.objectives = [
  'Decompose the two-color T into 48 and 20 cubic units',
  'Explain the stepped pyramid as 36 + 16 + 4 cubic units',
  'Distinguish the U’s 64 occupied cubic units from its 144-unit bounding box',
  'Design and measure a connected composite shape with exactly 50 cubic units'
];
composite.npcs.find(n => n.name === 'Decomposer').dialogue = 'The T has two touching parts with no overlap: a blue top bar, 8 long by 2 deep by 3 high, and a gold stem, 2 wide by 5 long by 2 high. Their colors help you see the split. Measure includes both connected parts together, so add their volumes.';
const t = composite.npcs.find(n => n.name === 'T-Shape Quiz');
t.position = [3, 1, 6];
t.dialogue = 'The blue top bar contains 8 × 2 × 3 = 48 cubes. The shorter gold stem contains 2 × 5 × 2 = 20. They touch without overlapping, so the complete T contains 68 cubic units. Measure either color to check the entire connected model.';
t.question.followUp[0].text = 'The stem is 2 wide, 5 long and 2 high. What is 2 × 5 × 2?';
const pyramid = composite.npcs.find(n => n.name === 'Pyramid Guide');
pyramid.position = [20, 1, 4];
pyramid.dialogue = 'This stepped pyramid has three one-block-high layers. Each footprint shrinks as you move upward: 6 by 6, then 4 by 4, then 2 by 2. Add the actual layers rather than filling its empty bounding box.';
const u = composite.npcs.find(n => n.name === 'U-Shape Sage');
u.position = [4, 1, 11];
u.dialogue = 'This open U occupies 64 cubic units. Its 6 by 6 by 4 bounding box holds 144, but the 4 by 5 by 4 opening leaves 80 empty. You can also add two 24-unit side walls and the 16-unit back section between them. Count the two back corners only once.';
const design = composite.npcs.find(n => n.name === 'Design Challenge');
design.position = [25, 1, 15];
design.dialogue = 'Build a connected composite model with exactly 50 cubic units on the empty sand pad. Try a 5 by 3 base that is 2 layers high, then add a 5 by 2 section another 2 layers high on top: 30 + 20 = 50. Use Measure to check occupied volume. Review your own evidence in the activity guide; the build is not automatically scored.';
composite.activities = [
  {
    id: 'composite-two-color-t', title: 'Split the T without overlap', npcName: 'T-Shape Quiz', position: [3, 2.6, 9],
    challenge: 'Identify the two colored parts of the T and calculate each volume. Predict the combined total, then measure the connected model and compare its material counts.',
    hint: 'Blue: 8 × 2 × 3 = 48. Gold: 2 × 5 × 2 = 20. The shorter gold stem touches the bar without occupying any of its cells. Measure includes both colors in the same connected selection.',
    successCriteria: ['I found 48 blue cubes and 20 gold cubes, totaling 68 cubic units.', 'I can explain why adding these parts neither misses nor double-counts any cells.'],
    reflection: 'Why would the T’s enclosing rectangular box contain more space than its actual blocks?'
  },
  {
    id: 'composite-stepped-pyramid', title: 'Add shrinking layers', npcName: 'Pyramid Guide', position: [22, 2.6, 5],
    challenge: 'Study the pyramid from more than one side. Calculate the volume of each one-block-high layer, then use Measure to check your combined total.',
    hint: 'The three layers contain 6 × 6 = 36, 4 × 4 = 16 and 2 × 2 = 4 cubes. Their sum is 56; a full 6 by 6 by 3 bounding box would contain 108.',
    successCriteria: ['I can account for all 56 cubic units as 36 + 16 + 4.', 'I distinguish the occupied model from its larger 108-unit bounding box.'],
    reflection: 'If the next layer were one cube, what would the new volume be? Why would you add 1 instead of multiplying the old volume?'
  },
  {
    id: 'composite-open-u', title: 'Reason about the empty space', npcName: 'U-Shape Sage', position: [4, 2.6, 9],
    challenge: 'Look into the open wooden U. Predict its occupied volume using subtraction, then check with Measure and a second method that adds separate wall sections.',
    hint: 'Outer box: 6 × 6 × 4 = 144. Opening: 4 × 5 × 4 = 80. Occupied: 144 − 80 = 64. For addition, use two side walls of 24 plus only the 4 × 1 × 4 middle back section of 16; otherwise you count corners twice.',
    successCriteria: ['I explain why the U contains 64 cubic units while its bounding box contains 144.', 'My addition and subtraction methods both give 64 and count each occupied cube once.'],
    reflection: 'What error would occur if you added three full 6-by-1-by-4 walls without accounting for their shared corners?'
  },
  {
    id: 'composite-fifty-design', title: 'Design a 50-unit step', npcName: 'Design Challenge', position: [25, 2.6, 18],
    challenge: 'Build a connected composite shape from full cubes on the sand pad. Aim for exactly 50 cubic units, with at least two rectangular parts that create a step or recess. Measure your own build and record how you decomposed it.',
    hint: 'One solution: a 5-by-3 base, 2 blocks high, gives 30 cubes. On its back two rows, add a 5-by-2 section another 2 blocks high, adding 20. The parts meet but do not overlap. Keep your build inside the sand pad and separate from other examples.',
    successCriteria: ['My connected build has a step or recess and measures exactly 50 cubic units.', 'I recorded a decomposition whose non-overlapping parts add to 50.'],
    reflection: 'How many empty cubic units are inside your model’s bounding box? Use your measurements as evidence for this self-review; the build is not automatically scored.'
  }
];

write('area-surface-guided.json', area);
write('composite-volume-guided.json', composite);
console.log(JSON.stringify({areaActivities: area.activities.length, compositeActivities: composite.activities.length, productionEdited: false}));
