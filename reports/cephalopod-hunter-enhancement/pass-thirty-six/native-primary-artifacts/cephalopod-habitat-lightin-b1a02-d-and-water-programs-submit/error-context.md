# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cephalopod-habitat-lighting.spec.ts >> low natural habitat clusters keep open routes and grounded roots while actual plant, sand and water programs submit
- Location: tests\e2e\cephalopod-habitat-lighting.spec.ts:310:57

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: page.evaluate: Test timeout of 180000ms exceeded.
```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test';
  2   | import { execFileSync } from 'node:child_process';
  3   | import { resolve } from 'node:path';
  4   | import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
  5   | import { clickCephalopodControl } from './helpers/cephalopod_controls';
  6   | 
  7   | const model = (process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js').replace(/\\/g, '/');
  8   | const diagnosticOverride = process.env.CEPHALOPOD_LIGHTING_DIAGNOSTIC_SOURCE;
  9   | const diagnosticModel = (diagnosticOverride || `reports/cephalopod-hunter-enhancement/pass-twenty-four/native-lighting-${process.pid}-${Date.now()}/lighting-diagnostic.generated.cjs`).replace(/\\/g, '/');
  10  | const harness = new GlHarness({ toolFile: model, toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document' });
  11  | const diagnosticHarness = new GlHarness({ toolFile: diagnosticModel || model, toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document' });
  12  | const canvas = 'canvas[role=application]', errors = new WeakMap<Page, string[]>();
  13  | 
  14  | async function step(page: Page, frames: number, codes: string[] = []) {
> 15  |   await page.evaluate(async ({ frames, codes }) => {
      |              ^ Error: page.evaluate: Test timeout of 180000ms exceeded.
  16  |     const w = window as any, target = document.querySelector('canvas[role=application]')!;
  17  |     const key = (type: string, code: string) => target.dispatchEvent(new KeyboardEvent(type, { code, key: code.slice(3).toLowerCase(), bubbles: true, cancelable: true }));
  18  |     codes.forEach(code => key('keydown', code));
  19  |     try {
  20  |       for (let frame = 0; frame < frames; frame++) {
  21  |         w.__hlStep = .05;
  22  |         do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); } while (w.__hlStep !== 0);
  23  |       }
  24  |     } finally { codes.forEach(code => key('keyup', code)); }
  25  |   }, { frames, codes });
  26  | }
  27  | 
  28  | async function mount(page: Page, quality: 'low' | 'balanced', diagnostic = false, forceFX = false) {
  29  |   if (diagnostic && !diagnosticModel) throw new Error('Set CEPHALOPOD_LIGHTING_DIAGNOSTIC_SOURCE to the exact-reverse-proof fixture from prepare-lighting-diagnostic.cjs');
  30  |   await (diagnostic ? diagnosticHarness : harness).mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'commonOcto', huntMode: 'observe', huntSeed: 2741, huntQuality: quality, _threeLoaded: true } });
  31  |   await page.evaluate(({ diagnostic, forceFX }) => {
  32  |     const w = window as any, T = w.THREE;
  33  |     if (!!w.__alloForceFX !== forceFX) throw new Error('Natural native coverage must retain the existing shaft skip; forceFX is an explicitly requested diagnostic only');
  34  |     w.__hlForcedFX = forceFX;
  35  |     w.__hlScene = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1).scene;
  36  |     w.__hlPlayer = w.__hlScene.getObjectByName('cl-player');
  37  |     w.__hlPlants = w.__hlScene.children.filter((m: any) => ['cl-seagrass', 'cl-kelp'].includes(m.name));
  38  |     w.__hlSand = w.__hlScene.getObjectByName('cl-seafloor'); w.__hlCaustics = w.__hlScene.getObjectByName('cl-caustics');
  39  |     w.__hlRocks=w.__hlScene.children.filter((mesh:any)=>mesh.isMesh&&mesh.userData.substrate==='rock'&&mesh.geometry?.type==='SphereGeometry');
  40  |     if(!w.__hlRocks.length)throw new Error('Expected actual solid reef rock casters');
  41  |     w.__hlRockOwned=w.__hlRocks.map((mesh:any)=>({mesh,geometry:mesh.geometry,material:mesh.material,attributes:Object.entries(mesh.geometry.attributes).map(([name,attribute]:[string,any])=>({name,attribute,array:attribute.array,version:attribute.version})),index:mesh.geometry.index,indexArray:mesh.geometry.index?.array}));
  42  |     w.__hlRockDepthDraws=new Map();w.__hlRockShadowWrapped=false;
  43  |     w.__hlBackdrop = w.__hlScene.children.find((m: any) => m.isMesh && m.material.uniforms?.topColor && m.material.uniforms?.bottomColor);
  44  |     w.__hlSurface = w.__hlScene.children.find((m: any) => m.isMesh && m.geometry.type === 'PlaneGeometry' && m.geometry.parameters.width === 400);
  45  |     w.__hlShafts = []; w.__hlRays = [];
  46  |     w.__hlScene.traverse((m: any) => {
  47  |       if (!m.isMesh || m.geometry.type !== 'PlaneGeometry') return;
  48  |       if (m.geometry.parameters.height === 46) w.__hlShafts.push(m);
  49  |       if (m.geometry.parameters.height === 16 && m.material.blending === T.AdditiveBlending) w.__hlRays.push(m);
  50  |     });
  51  |     if (w.__hlPlants.length !== 105 || !w.__hlSand || !w.__hlCaustics || !w.__hlBackdrop || !w.__hlSurface) throw new Error('Expected the real original plant and water-column resource slots');
  52  |     if (diagnostic && !w.__clLightingFixtureState) throw new Error('Diagnostic source must expose only the existing initialized gameState');
  53  |     w.__hlStep = 0; T.Clock.prototype.getDelta = function () { const dt = w.__hlStep; w.__hlStep = 0; return dt; };
  54  |     w.__hlScene.children.forEach((o: any) => { if ('cooldownUntil' in o.userData) o.userData.cooldownUntil = 1e9; });
  55  |     const unique = new Set<any>(); w.__hlResources = [];
  56  |     w.__hlOwned = [...w.__hlPlants, w.__hlSand, w.__hlCaustics, w.__hlBackdrop, w.__hlSurface, ...w.__hlShafts, ...w.__hlRays].map((mesh: any) => {
  57  |       for (const resource of [mesh.geometry, mesh.material, mesh.material.map].filter(Boolean)) {
  58  |         if (unique.has(resource)) continue;
  59  |         unique.add(resource); const row = { uuid: resource.uuid, disposed: 0 };
  60  |         resource.addEventListener('dispose', () => row.disposed++); w.__hlResources.push(row);
  61  |       }
  62  |       let motion: any = null;
  63  |       if (w.__hlPlants.includes(mesh)) {
  64  |         // Inspect the existing uniform reference; this detached template never
  65  |         // substitutes for the native program checks below.
  66  |         const shader = { uniforms: {}, vertexShader: T.ShaderLib.standard.vertexShader, fragmentShader: T.ShaderLib.standard.fragmentShader };
  67  |         mesh.material.onBeforeCompile(shader); motion = (shader.uniforms as any).clPlantMotion.value;
  68  |       }
  69  |       return { mesh, geometry: mesh.geometry, material: mesh.material, map: mesh.material.map, key: mesh.material.customProgramCacheKey(), motion,
  70  |         attrs: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name, a]: [string, any]) => [name, { attr: a, array: a.array, values: Array.from(a.array), version: a.version }])),
  71  |         index: mesh.geometry.index, indexArray: mesh.geometry.index?.array, instances: mesh.instanceMatrix, instanceArray: mesh.instanceMatrix?.array,
  72  |         instanceValues: mesh.instanceMatrix ? Array.from(mesh.instanceMatrix.array) : null };
  73  |     });
  74  |     w.__hlEpoch = 0; w.__hlPending = []; w.__hlSamples = {}; w.__hlSelected = {}; w.__hlNativeBuffers = new Map(); w.__hlNativeStable = true; w.__hlNativeIssues = [];
  75  |     const afterScene = w.__hlScene.onAfterRender;
  76  |     w.__hlScene.onAfterRender = function (renderer: any, scene: any, camera: any) {
  77  |       afterScene.call(this, renderer, scene, camera);w.__hlRenderer=renderer;w.__hlCamera=camera;
  78  |       if(w.__hlRockShadowWrapped)return;w.__hlRockShadowWrapped=true;
  79  |       const direct=renderer.renderBufferDirect,sun=scene.children.find((light:any)=>light.isDirectionalLight);
  80  |       renderer.renderBufferDirect=function(shadowCamera:any,renderScene:any,geometry:any,material:any,object:any,group:any){
  81  |         const result=direct.apply(this,arguments);
  82  |         if(shadowCamera===sun.shadow.camera&&w.__hlRocks.includes(object)){const gl=renderer.getContext(),program=gl.getParameter(gl.CURRENT_PROGRAM);w.__hlRockDepthDraws.set(object.uuid,{uuid:object.uuid,sourceMaterialUUID:object.material.uuid,sourceShadowSide:object.material.shadowSide,submittedDepthSide:material.side,cullEnabled:gl.isEnabled(gl.CULL_FACE),linked:!!program&&gl.getProgramParameter(program,gl.LINK_STATUS),castShadow:object.castShadow,epoch:w.__hlEpoch});}
  83  |         return result;
  84  |       };
  85  |     };
  86  |     function watch(mesh: any, kind: string) {
  87  |       const before = mesh.onBeforeRender, after = mesh.onAfterRender;
  88  |       mesh.onBeforeRender = function (renderer: any, scene: any, camera: any, geometry: any, material: any, group: any) {
  89  |         before.call(this, renderer, scene, camera, geometry, material, group);
  90  |         const requested = w.__hlPending.includes(kind) && w.__hlSamples[kind]?.epoch !== w.__hlEpoch && (!w.__hlSelected[kind] || w.__hlSelected[kind] === this.uuid);
  91  |         w.__hlDrawing = requested ? { uuid: this.uuid, kind } : null; w.__hlLastDraw = null;
  92  |         if (!requested || w.__hlWrappedGL) return;
  93  |         const gl = renderer.getContext(); w.__hlWrappedGL = gl;
  94  |         for (const name of ['drawElements', 'drawElementsInstanced', 'drawArrays', 'drawArraysInstanced']) {
  95  |           const original = gl[name]?.bind(gl); if (!original) continue;
  96  |           gl[name] = function (...args: any[]) {
  97  |             if (w.__hlDrawing) w.__hlLastDraw = { ...w.__hlDrawing, program: gl.getParameter(gl.CURRENT_PROGRAM), buffer: gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING),
  98  |               indexed: name.startsWith('drawElements'), instanced: name.endsWith('Instanced'), mode: args[0], count: name.startsWith('drawElements') ? args[1] : args[2],
  99  |               offset: name.startsWith('drawElements') ? args[3] : args[1], instances: name.endsWith('Instanced') ? args[4] ?? args[3] : 1 };
  100 |             return original(...args);
  101 |           };
  102 |         }
  103 |       };
  104 |       mesh.onAfterRender = function (renderer: any, scene: any, camera: any, geometry: any, material: any, group: any) {
  105 |         after.call(this, renderer, scene, camera, geometry, material, group);
  106 |         const draw = w.__hlLastDraw, active = w.__hlDrawing; w.__hlDrawing = null;
  107 |         if (!active || active.uuid !== this.uuid) return;
  108 |         const gl = renderer.getContext(), program = gl.getParameter(gl.CURRENT_PROGRAM);
  109 |         const names = kind === 'grass' || kind === 'kelp' ? ['position', 'normal', 'color'] : kind === 'sand' ? ['position', 'normal', 'uv'] : kind === 'caustics' || /^(shaft|ray)-/.test(kind) ? ['position', 'uv'] : ['position'];
  110 |         if (kind === 'grass') names.push('instanceMatrix');
  111 |         const bindings = names.map(name => {
  112 |           const at = gl.getAttribLocation(program, name), buffer = at < 0 ? null : gl.getVertexAttrib(at, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING), key = this.uuid + '/' + name;
  113 |           if (w.__hlNativeBuffers.has(key)) {
  114 |             const same = w.__hlNativeBuffers.get(key) === buffer; w.__hlNativeStable &&= same;
  115 |             if (!same && !w.__hlNativeIssues.includes(kind + '/' + name)) w.__hlNativeIssues.push(kind + '/' + name);
```