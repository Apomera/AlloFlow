const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { chromium } = require('playwright');
const esbuild = require('esbuild');
const initial = process.argv.includes('--initial');
const prefix = initial ? 'initial-' : '';
const harnessPath = path.resolve('tests/e2e/helpers/stem_gl_harness.ts');
const bundled = esbuild.buildSync({ entryPoints: [harnessPath], bundle: true, platform: 'node', format: 'cjs', write: false }).outputFiles[0].text;
const harnessModule = new Module(harnessPath, module);
harnessModule.filename = harnessPath;
harnessModule.paths = Module._nodeModulePaths(path.dirname(harnessPath));
harnessModule._compile(bundled, harnessPath);
const { GlHarness } = harnessModule.exports;
const toolFile = initial ? 'reports/cephalopod-hunter-enhancement/pass-twelve/baseline.generated.cjs' : 'stem_lab/stem_tool_cephalopodlab.js';
const fixturePath = path.join(__dirname, 'plant-detail-fixture.json');
const previous = initial ? null : JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const harness = new GlHarness({ toolFile, toolId: 'cephalopodLab', width: 1060, height: 1000, layout: 'document' });
const instrumentation = `
;(function(){
  THREE.Clock.prototype.getDelta=function(){return 0;};
  window.__plantConstructed={grass:[],kelp:[]};
  var nativeAdd=THREE.Object3D.prototype.add;
  THREE.Object3D.prototype.add=function(){
    if(this.isScene)for(var i=0;i<arguments.length;i++){
      var object=arguments[i];
      if(object&&object.isMesh&&object.userData.substrate==='grass'){
        var kind=object.isInstancedMesh&&object.count===7?'grass':object.userData.substrateRadius===1.4?'kelp':null;
        if(kind)window.__plantConstructed[kind].push(object.position.toArray());
      }
    }
    return nativeAdd.apply(this,arguments);
  };
  var Native=THREE.WebGLRenderer;
  THREE.WebGLRenderer=new Proxy(Native,{construct:function(target,args,newTarget){
    var renderer=Reflect.construct(target,args,newTarget),nativeRender=renderer.render;
    renderer.render=function(scene,camera){
      if(scene&&scene.isScene){
        window.__plantRendered={renderer:renderer,scene:scene,camera:camera};
        var pose=window.__plantCamera;
        if(pose){camera.fov=pose.fov;camera.position.fromArray(pose.position);camera.lookAt(new THREE.Vector3().fromArray(pose.target));camera.updateProjectionMatrix();camera.updateMatrixWorld(true);}
      }
      return nativeRender.apply(this,arguments);
    };return renderer;
  }});
})();`;

(async () => {
  let browser, page;
  const errors = [], captures = [];
  try {
    await harness.start();
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
    page.setDefaultTimeout(90000);
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.route('**/vendor/three-r128/three.min.js', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()) + instrumentation, contentType: 'text/javascript' });
    });
    await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'commonOcto', huntMode: 'observe', huntSeed: 2741, huntQuality: 'balanced', _threeLoaded: true } });
    await page.waitForFunction(() => !!window.__plantRendered);
    for (const kind of ['grass', 'kelp']) {
      const saved = previous?.captures.find(c => c.kind === kind);
      const details = await page.evaluate(({ kind, saved }) => {
        const T = window.THREE, { scene, camera } = window.__plantRendered;
        scene.updateMatrixWorld(true);
        const plants = scene.children.filter(o => o.isMesh && o.userData.substrate === 'grass' && (kind === 'grass' ? o.isInstancedMesh && o.count === 7 : !o.isInstancedMesh && o.userData.substrateRadius === 1.4));
        const player = scene.getObjectByName('cl-player');
        let index = saved?.index;
        if (index == null) index = plants.map((mesh, index) => ({ index, d: Math.hypot(mesh.position.x - player.position.x, mesh.position.z - player.position.z) })).sort((a, b) => a.d - b.d)[0].index;
        const mesh = plants[index];
        if (!mesh) throw Error('Missing selected ' + kind);
        if (saved && (Math.abs(mesh.position.x - saved.origin[0]) > 1e-6 || Math.abs(mesh.position.z - saved.origin[2]) > 1e-6)) throw Error('Plant world identity/layout changed: ' + JSON.stringify({kind,index,expected:saved.origin,actual:mesh.position.toArray(),constructed:window.__plantConstructed[kind][index],player:player.position.toArray(),plantCount:plants.length,layout:plants.map(p=>p.position.toArray()),constructedLayout:window.__plantConstructed[kind]}));
        const box = new T.Box3(), point = new T.Vector3(), instance = new T.Matrix4(), matrix = new T.Matrix4(), attr = mesh.geometry.attributes.position;
        for (let n = 0; n < (mesh.isInstancedMesh ? mesh.count : 1); n++) {
          if (mesh.isInstancedMesh) { mesh.getMatrixAt(n, instance); matrix.multiplyMatrices(mesh.matrixWorld, instance); } else matrix.copy(mesh.matrixWorld);
          for (let vertex = 0; vertex < attr.count; vertex++) box.expandByPoint(point.fromBufferAttribute(attr, vertex).applyMatrix4(matrix));
        }
        const center = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3());
        let pose = saved?.pose;
        if (!pose) {
          const fov = 42, distance = Math.max(kind === 'grass' ? 2.3 : 6, size.y / (2 * Math.tan(fov * Math.PI / 360)) * 1.5);
          // A slight oblique angle shows the folded section; elevation includes its seabed attachment.
          const direction = new T.Vector3(0.32, 0.18, 1).normalize().applyAxisAngle(new T.Vector3(0, 1, 0), mesh.rotation.y);
          pose = { fov, target: center.toArray(), position: center.clone().addScaledVector(direction, distance).toArray() };
        }
        window.__plantCamera = pose;
        return { kind, index, origin: mesh.position.toArray(), constructed: window.__plantConstructed[kind][index], rotation: mesh.rotation.toArray(), bounds: { min: box.min.toArray(), max: box.max.toArray() }, pose, vertices: attr.count, instances: mesh.count || 1, material: { type: mesh.material.type, opacity: mesh.material.opacity, depthWrite: mesh.material.depthWrite, side: mesh.material.side } };
      }, { kind, saved });
      await page.waitForTimeout(400);
      const file = prefix + kind + '-detail.png';
      await page.locator('canvas[role=application]').screenshot({ path: path.join(__dirname, file) });
      captures.push({ ...details, file });
    }
    const result = { toolFile, errors, captures, fixture: 'Diagnostic camera-only closeups of the actual seeded commonOcto field-study scene. Simulation delta is zero from construction. Before mode serves the saved pre-plant source; after mode serves canonical and reuses the same plant indices, XZ identity and exact camera poses. No mesh, geometry, material, light, player or visibility changes. These are detail fixtures, not ordinary player-camera screenshots.' };
    if (initial && !errors.length) fs.writeFileSync(fixturePath, JSON.stringify({ captures: captures.map(({ kind, index, origin, pose }) => ({ kind, index, origin, pose })) }, null, 2) + '\n');
    fs.writeFileSync(path.join(__dirname, prefix + 'plant-detail-results.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
    if (errors.length) process.exitCode = 1;
  } catch (error) {
    fs.writeFileSync(path.join(__dirname, prefix + 'plant-detail-failure.json'), JSON.stringify({ toolFile, error: String(error), errors, captures }, null, 2) + '\n');
    throw error;
  } finally {
    if (page) await harness.destroy(page).catch(() => {});
    if (browser) await browser.close();
    await harness.stop();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
