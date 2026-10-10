const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated', THREE = {};
new Function('exports', 'module', fs.readFileSync(repo + '/vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
const source = fs.readFileSync(path.join(__dirname, 'candidate.js'), 'utf8');
function builder(code) {
  let build;
  vm.runInNewContext(code, { window: { StemLab: { isRegistered: () => false, registerTool() {}, makeBayViewer(config) {
    build = config.buildScene; return { attach() {}, sync() {}, reset() {}, nudge() {}, zoom() {}, status: () => 'failed' };
  } } } });
  return build;
}
const foldCall = 'sculptWristFold(patientWrist,.15,1)';
if (source.split(foldCall).length !== 2) throw new Error('Patient fold anchor changed.');
const builds = [builder(source), builder(source.replace(foldCall, 'void 0'))];
const rows = [];
// Measure each actual pose against a control with only patient relief removed.
// The final Vitest fixture independently enforces the same strict bound.
for (const age of ['adult', 'child', 'infant']) for (let phase = 0; phase <= 8; phase++) {
  const scenes = builds.map(build => {
    const scene = new THREE.Scene();
    build(THREE, { scene, phase, dark: true, contrast: false, wantShadow: false,
      trim: color => new THREE.MeshPhongMaterial({ color }), sceneProps: { age, tab: phase ? 'recovery' : 'depth' } });
    return scene;
  });
  for (const side of ['left', 'right']) {
    const arrays = scenes.map(scene => scene.getObjectByName('fr-patient-' + side + '-wrist').geometry.attributes.position);
    let minimum = Infinity, maximum = 0, inward = 0, underside = 0, retainedAxes = true, retainedUnderside = true;
    for (let i = 0; i < arrays[0].count; i++) {
      const [folded, unfolded] = arrays.map(a => new THREE.Vector3().fromBufferAttribute(a, i));
      retainedAxes &&= folded.x === unfolded.x && folded.z === unfolded.z;
      if (unfolded.y <= 0) { underside++; retainedUnderside &&= folded.y === unfolded.y; }
      else { const inset = 1 - folded.y / unfolded.y; minimum = Math.min(minimum, inset); maximum = Math.max(maximum, inset); if (inset > .0001) inward++; }
    }
    rows.push({ age, phase, side, minimum, maximum, inward, underside, retainedAxes, retainedUnderside });
    if (minimum < -1e-6 || maximum >= .15 || inward <= 10 || underside <= 10 || !retainedAxes || !retainedUnderside) throw new Error('Patient fold control regression: ' + JSON.stringify(rows.at(-1)));
  }
  scenes.forEach(scene => { const gs = new Set(), ms = new Set(); scene.traverse(o => { if (o.geometry) gs.add(o.geometry); if (o.material) ms.add(o.material); }); gs.forEach(g => g.dispose()); ms.forEach(m => m.dispose()); });
}
fs.writeFileSync(path.join(__dirname, 'patient-fold-metrics.json'), JSON.stringify(rows, null, 2));
console.log(JSON.stringify({ configurations: rows.length, minimumInset: Math.min(...rows.map(r => r.minimum)), maximumInset: Math.max(...rows.map(r => r.maximum)), minimumShapedVertices: Math.min(...rows.map(r => r.inward)), allAxesRetained: rows.every(r => r.retainedAxes && r.retainedUnderside) }));
