const fs = require('fs');
const file = 'tests/geometry_world_reduced_motion.test.js';
const raw = fs.readFileSync(file, 'utf8');
let text = raw.replace(/\r\n/g, '\n');
function replace(before, after) {
  if (text.split(before).length !== 2) throw Error('Expected exact reduced-motion test anchor: ' + before.slice(0, 90));
  text = text.replace(before, after);
}
replace("const npcSource=slice('// Animate NPCs —','// ── NPC proximity chime');", "const npcSource=slice('// Animate NPCs —','// ── NPC proximity chime');\n// Execute the actual production guide helpers used by this animation slice.\nconst guideSource=slice('  function geometryGuideState(', '  // ── Non-visual wayfinding ──');");
replace('const fixtures=[];', `const fixtures=[];
function canvas(width,height){
  const context={measureText:text=>({width:String(text).length*15})};
  ['clearRect','beginPath','roundRect','rect','fill','stroke','save','restore','translate','arc','moveTo','lineTo','closePath','bezierCurveTo','fillText'].forEach(name=>{context[name]=()=>{};});
  return{width,height,getContext:()=>context};
}`);
replace('  const sprite=()=>new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,opacity:0}));', '  const sprite=(width,height)=>new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas(width,height)),transparent:true,opacity:0}));');
replace('data:{position:[2,0,3],question:{},dialogue:', "data:{name:'Motion Guide',position:[2,0,3],question:{},dialogue:");
replace('label:sprite(),prompt:sprite(),qMark:sprite(),_speechBubble:sprite(),', 'label:sprite(640,160),prompt:sprite(320,96),qMark:sprite(128,128),_speechBubble:sprite(512,128),');
replace('_answeredRef:[false],camera:new THREE.PerspectiveCamera(),', '_answeredRef:[false],renderer:{domElement:{closest:()=>null}},camera:new THREE.PerspectiveCamera(),');
replace("'dt','THREE','Math',npcSource);", "'dt','THREE','Math',guideSource+'\\n'+npcSource);");
replace('update(e,{THREE},[],()=>.2,.016,THREE,math);', 'update(e,{THREE,matchMedia:()=>({matches:false})},[],()=>.2,.016,THREE,math);');
replace('head:n.head.position.toArray(),bodyRotation:', 'head:n.head.position.toArray(),label:n.label.position.toArray(),bodyRotation:');
replace('for(const r of [o.geometry,o.material])', 'for(const r of [o.geometry,o.material&&o.material.map,o.material])');
replace('expect(f.npc.qMark.visible).toBe(true);', 'expect(f.npc.qMark.visible).toBe(true);expect(f.npc.label.position.y).toBe(2.45);expect(f.npc.qMark.position.y).toBe(3.05);expect(f.npc.prompt.position.y).toBe(3.05);expect(f.npc._speechBubble.position.y).toBe(3.6);');
replace('expect(f.npc._speechBubble.material.opacity).toBe(.7);expect(f.npc.prompt.material.opacity).toBe(0);', 'expect(f.npc._speechBubble.material.opacity).toBe(.95);expect(f.npc.prompt.material.opacity).toBe(0);const medium=snapshot(f.npc);f.frame(5);expect(snapshot(f.npc)).toEqual(medium);');
if (raw.includes('\r\n')) text = text.replace(/\n/g, '\r\n');
const fd = fs.openSync(file, 'r+');
try { fs.writeSync(fd, text); fs.ftruncateSync(fd, Buffer.byteLength(text)); } finally { fs.closeSync(fd); }
console.log('Updated only ' + file);
