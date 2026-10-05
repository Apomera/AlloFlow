import { test, expect, Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { clickCephalopodControl } from './helpers/cephalopod_controls';

const model = (process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js').replace(/\\/g, '/');
const diagnosticOverride = process.env.CEPHALOPOD_LIGHTING_DIAGNOSTIC_SOURCE;
const diagnosticModel = (diagnosticOverride || `reports/cephalopod-hunter-enhancement/pass-twenty-four/native-lighting-${process.pid}-${Date.now()}/lighting-diagnostic.generated.cjs`).replace(/\\/g, '/');
const harness = new GlHarness({ toolFile: model, toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document' });
const diagnosticHarness = new GlHarness({ toolFile: diagnosticModel || model, toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document' });
const canvas = 'canvas[role=application]', errors = new WeakMap<Page, string[]>();

async function step(page: Page, frames: number, codes: string[] = []) {
  await page.evaluate(async ({ frames, codes }) => {
    const w = window as any, target = document.querySelector('canvas[role=application]')!;
    const key = (type: string, code: string) => target.dispatchEvent(new KeyboardEvent(type, { code, key: code.slice(3).toLowerCase(), bubbles: true, cancelable: true }));
    codes.forEach(code => key('keydown', code));
    try {
      for (let frame = 0; frame < frames; frame++) {
        w.__hlStep = .05;
        do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); } while (w.__hlStep !== 0);
      }
    } finally { codes.forEach(code => key('keyup', code)); }
  }, { frames, codes });
}

async function mount(page: Page, quality: 'low' | 'balanced', diagnostic = false, forceFX = false) {
  if (diagnostic && !diagnosticModel) throw new Error('Set CEPHALOPOD_LIGHTING_DIAGNOSTIC_SOURCE to the exact-reverse-proof fixture from prepare-lighting-diagnostic.cjs');
  await (diagnostic ? diagnosticHarness : harness).mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'commonOcto', huntMode: 'observe', huntSeed: 2741, huntQuality: quality, _threeLoaded: true } });
  await page.evaluate(({ diagnostic, forceFX }) => {
    const w = window as any, T = w.THREE;
    if (!!w.__alloForceFX !== forceFX) throw new Error('Natural native coverage must retain the existing shaft skip; forceFX is an explicitly requested diagnostic only');
    w.__hlForcedFX = forceFX;
    w.__hlScene = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1).scene;
    w.__hlPlayer = w.__hlScene.getObjectByName('cl-player');
    w.__hlPlants = w.__hlScene.children.filter((m: any) => ['cl-seagrass', 'cl-kelp'].includes(m.name));
    w.__hlSand = w.__hlScene.getObjectByName('cl-seafloor'); w.__hlCaustics = w.__hlScene.getObjectByName('cl-caustics');
    w.__hlRocks=w.__hlScene.children.filter((mesh:any)=>mesh.isMesh&&mesh.userData.substrate==='rock'&&mesh.geometry?.type==='SphereGeometry');
    if(!w.__hlRocks.length)throw new Error('Expected actual solid reef rock casters');
    w.__hlRockOwned=w.__hlRocks.map((mesh:any)=>({mesh,geometry:mesh.geometry,material:mesh.material,attributes:Object.entries(mesh.geometry.attributes).map(([name,attribute]:[string,any])=>({name,attribute,array:attribute.array,version:attribute.version})),index:mesh.geometry.index,indexArray:mesh.geometry.index?.array}));
    w.__hlRockDepthDraws=new Map();w.__hlRockShadowWrapped=false;
    w.__hlBackdrop = w.__hlScene.children.find((m: any) => m.isMesh && m.material.uniforms?.topColor && m.material.uniforms?.bottomColor);
    w.__hlSurface = w.__hlScene.children.find((m: any) => m.isMesh && m.geometry.type === 'PlaneGeometry' && m.geometry.parameters.width === 400);
    w.__hlShafts = []; w.__hlRays = [];
    w.__hlScene.traverse((m: any) => {
      if (!m.isMesh || m.geometry.type !== 'PlaneGeometry') return;
      if (m.geometry.parameters.height === 46) w.__hlShafts.push(m);
      if (m.geometry.parameters.height === 16 && m.material.blending === T.AdditiveBlending) w.__hlRays.push(m);
    });
    if (w.__hlPlants.length !== 105 || !w.__hlSand || !w.__hlCaustics || !w.__hlBackdrop || !w.__hlSurface) throw new Error('Expected the real original plant and water-column resource slots');
    if (diagnostic && !w.__clLightingFixtureState) throw new Error('Diagnostic source must expose only the existing initialized gameState');
    w.__hlStep = 0; T.Clock.prototype.getDelta = function () { const dt = w.__hlStep; w.__hlStep = 0; return dt; };
    w.__hlScene.children.forEach((o: any) => { if ('cooldownUntil' in o.userData) o.userData.cooldownUntil = 1e9; });
    const unique = new Set<any>(); w.__hlResources = [];
    w.__hlOwned = [...w.__hlPlants, w.__hlSand, w.__hlCaustics, w.__hlBackdrop, w.__hlSurface, ...w.__hlShafts, ...w.__hlRays].map((mesh: any) => {
      for (const resource of [mesh.geometry, mesh.material, mesh.material.map].filter(Boolean)) {
        if (unique.has(resource)) continue;
        unique.add(resource); const row = { uuid: resource.uuid, disposed: 0 };
        resource.addEventListener('dispose', () => row.disposed++); w.__hlResources.push(row);
      }
      let motion: any = null;
      if (w.__hlPlants.includes(mesh)) {
        // Inspect the existing uniform reference; this detached template never
        // substitutes for the native program checks below.
        const shader = { uniforms: {}, vertexShader: T.ShaderLib.standard.vertexShader, fragmentShader: T.ShaderLib.standard.fragmentShader };
        mesh.material.onBeforeCompile(shader); motion = (shader.uniforms as any).clPlantMotion.value;
      }
      return { mesh, geometry: mesh.geometry, material: mesh.material, map: mesh.material.map, key: mesh.material.customProgramCacheKey(), motion,
        attrs: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name, a]: [string, any]) => [name, { attr: a, array: a.array, values: Array.from(a.array), version: a.version }])),
        index: mesh.geometry.index, indexArray: mesh.geometry.index?.array, instances: mesh.instanceMatrix, instanceArray: mesh.instanceMatrix?.array,
        instanceValues: mesh.instanceMatrix ? Array.from(mesh.instanceMatrix.array) : null };
    });
    w.__hlEpoch = 0; w.__hlPending = []; w.__hlSamples = {}; w.__hlSelected = {}; w.__hlNativeBuffers = new Map(); w.__hlNativeStable = true; w.__hlNativeIssues = [];
    const afterScene = w.__hlScene.onAfterRender;
    w.__hlScene.onAfterRender = function (renderer: any, scene: any, camera: any) {
      afterScene.call(this, renderer, scene, camera);w.__hlRenderer=renderer;w.__hlCamera=camera;
      if(w.__hlRockShadowWrapped)return;w.__hlRockShadowWrapped=true;
      const direct=renderer.renderBufferDirect,sun=scene.children.find((light:any)=>light.isDirectionalLight);
      renderer.renderBufferDirect=function(shadowCamera:any,renderScene:any,geometry:any,material:any,object:any,group:any){
        const result=direct.apply(this,arguments);
        if(shadowCamera===sun.shadow.camera&&w.__hlRocks.includes(object)){const gl=renderer.getContext(),program=gl.getParameter(gl.CURRENT_PROGRAM);w.__hlRockDepthDraws.set(object.uuid,{uuid:object.uuid,sourceMaterialUUID:object.material.uuid,sourceShadowSide:object.material.shadowSide,submittedDepthSide:material.side,cullEnabled:gl.isEnabled(gl.CULL_FACE),linked:!!program&&gl.getProgramParameter(program,gl.LINK_STATUS),castShadow:object.castShadow,epoch:w.__hlEpoch});}
        return result;
      };
    };
    function watch(mesh: any, kind: string) {
      const before = mesh.onBeforeRender, after = mesh.onAfterRender;
      mesh.onBeforeRender = function (renderer: any, scene: any, camera: any, geometry: any, material: any, group: any) {
        before.call(this, renderer, scene, camera, geometry, material, group);
        const requested = w.__hlPending.includes(kind) && w.__hlSamples[kind]?.epoch !== w.__hlEpoch && (!w.__hlSelected[kind] || w.__hlSelected[kind] === this.uuid);
        w.__hlDrawing = requested ? { uuid: this.uuid, kind } : null; w.__hlLastDraw = null;
        if (!requested || w.__hlWrappedGL) return;
        const gl = renderer.getContext(); w.__hlWrappedGL = gl;
        for (const name of ['drawElements', 'drawElementsInstanced', 'drawArrays', 'drawArraysInstanced']) {
          const original = gl[name]?.bind(gl); if (!original) continue;
          gl[name] = function (...args: any[]) {
            if (w.__hlDrawing) w.__hlLastDraw = { ...w.__hlDrawing, program: gl.getParameter(gl.CURRENT_PROGRAM), buffer: gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING),
              indexed: name.startsWith('drawElements'), instanced: name.endsWith('Instanced'), mode: args[0], count: name.startsWith('drawElements') ? args[1] : args[2],
              offset: name.startsWith('drawElements') ? args[3] : args[1], instances: name.endsWith('Instanced') ? args[4] ?? args[3] : 1 };
            return original(...args);
          };
        }
      };
      mesh.onAfterRender = function (renderer: any, scene: any, camera: any, geometry: any, material: any, group: any) {
        after.call(this, renderer, scene, camera, geometry, material, group);
        const draw = w.__hlLastDraw, active = w.__hlDrawing; w.__hlDrawing = null;
        if (!active || active.uuid !== this.uuid) return;
        const gl = renderer.getContext(), program = gl.getParameter(gl.CURRENT_PROGRAM);
        const names = kind === 'grass' || kind === 'kelp' ? ['position', 'normal', 'color'] : kind === 'sand' ? ['position', 'normal', 'uv'] : kind === 'caustics' || /^(shaft|ray)-/.test(kind) ? ['position', 'uv'] : ['position'];
        if (kind === 'grass') names.push('instanceMatrix');
        const bindings = names.map(name => {
          const at = gl.getAttribLocation(program, name), buffer = at < 0 ? null : gl.getVertexAttrib(at, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING), key = this.uuid + '/' + name;
          if (w.__hlNativeBuffers.has(key)) {
            const same = w.__hlNativeBuffers.get(key) === buffer; w.__hlNativeStable &&= same;
            if (!same && !w.__hlNativeIssues.includes(kind + '/' + name)) w.__hlNativeIssues.push(kind + '/' + name);
          } else w.__hlNativeBuffers.set(key, buffer);
          return { name, size: at < 0 ? 0 : gl.getVertexAttrib(at, gl.VERTEX_ATTRIB_ARRAY_SIZE), enabled: at >= 0 && gl.getVertexAttrib(at, gl.VERTEX_ATTRIB_ARRAY_ENABLED), bound: !!buffer,
            divisor: at < 0 ? null : gl.getVertexAttrib(at, gl.VERTEX_ATTRIB_ARRAY_DIVISOR),
            columns: name === 'instanceMatrix' && at >= 0 ? Array.from({ length: 4 }, (_, column) => ({ enabled: gl.getVertexAttrib(at + column, gl.VERTEX_ATTRIB_ARRAY_ENABLED), size: gl.getVertexAttrib(at + column, gl.VERTEX_ATTRIB_ARRAY_SIZE), sameBuffer: gl.getVertexAttrib(at + column, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING) === buffer, divisor: gl.getVertexAttrib(at + column, gl.VERTEX_ATTRIB_ARRAY_DIVISOR) })) : null };
        });
        const indexKey = this.uuid + '/index';
        if (w.__hlNativeBuffers.has(indexKey)) {
          const same = w.__hlNativeBuffers.get(indexKey) === draw?.buffer; w.__hlNativeStable &&= same;
          if (!same && !w.__hlNativeIssues.includes(kind + '/index')) w.__hlNativeIssues.push(kind + '/index');
        } else w.__hlNativeBuffers.set(indexKey, draw?.buffer);
        const uniform = (name: string) => { const at = gl.getUniformLocation(program, name); if (at === null) return null; const value = gl.getUniform(program, at); return typeof value === 'number' ? value : Array.from(value); };
        w.__hlSelected[kind] = this.uuid;
        w.__hlSamples[kind] = { kind, uuid: this.uuid, epoch: w.__hlEpoch, expectedCount: geometry.index.count, expectedInstances: this.isInstancedMesh ? this.count : 1,
          draw: draw && { own: draw.uuid === this.uuid && draw.program === program, indexed: draw.indexed, instanced: draw.instanced, triangles: draw.mode === gl.TRIANGLES, count: draw.count, offset: draw.offset, instances: draw.instances, bound: !!draw.buffer },
          bindings, type: material.type, key: material.customProgramCacheKey(), opacity: material.opacity, blended: gl.isEnabled(gl.BLEND), depthWrite: gl.getParameter(gl.DEPTH_WRITEMASK),
          motion: uniform('clPlantMotion'), downwelling: uniform('clSandDownwelling'), top: uniform('topColor'), bottom: uniform('bottomColor'), submittedOpacity: uniform('opacity'),
          ambient: uniform('ambientLightColor'), keyLight: uniform('directionalLights[0].color'), skyFill: uniform('hemisphereLights[0].skyColor'), groundFill: uniform('hemisphereLights[0].groundColor'),
          shadowBias: uniform('directionalLightShadows[0].shadowBias'), shadowNormalBias: uniform('directionalLightShadows[0].shadowNormalBias'),
          linked: gl.getProgramParameter(program, gl.LINK_STATUS), shaders: gl.getAttachedShaders(program).map((shader: any) => ({ compiled: gl.getShaderParameter(shader, gl.COMPILE_STATUS), source: gl.getShaderSource(shader) })) };
      };
    }
    w.__hlPlants.forEach((m: any) => watch(m, m.name === 'cl-seagrass' ? 'grass' : 'kelp'));
    watch(w.__hlSand, 'sand'); watch(w.__hlCaustics, 'caustics'); watch(w.__hlBackdrop, 'backdrop');
    w.__hlShafts.forEach((m: any, i: number) => watch(m, 'shaft-' + i)); w.__hlRays.forEach((m: any, i: number) => watch(m, 'ray-' + i));
  }, { diagnostic, forceFX });
  await page.locator(canvas).focus(); await step(page, 3);
}

async function native(page: Page, kinds = ['grass', 'kelp', 'sand', 'caustics', 'backdrop']) {
  return page.evaluate(async kinds => {
    const w = window as any, epoch = ++w.__hlEpoch; w.__hlPending = kinds;
    for (let frame = 0; frame < 60 && kinds.some(kind => w.__hlSamples[kind]?.epoch !== epoch); frame++) await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    w.__hlPending = [];
    return kinds.map(kind => ({ ...w.__hlSamples[kind], kind, fresh: w.__hlSamples[kind]?.epoch === epoch }));
  }, kinds);
}

function rendered(rows: Awaited<ReturnType<typeof native>>, quality: 'low' | 'balanced', motionEnabled = 1) {
  for (const row of rows) {
    expect(row.fresh, row.kind).toBe(true); expect(row.linked, row.kind).toBe(true);
    expect(row.shaders, row.kind).toHaveLength(2); expect(row.shaders.every((s: any) => s.compiled), row.kind).toBe(true);
    expect(row.draw, row.kind).toMatchObject({ own: true, indexed: true, triangles: true, offset: 0, bound: true, count: row.expectedCount, instances: row.expectedInstances });
    for (const binding of row.bindings) {
      expect(binding.enabled && binding.bound, row.kind + '/' + binding.name).toBe(true);
      expect(binding.size).toBe(binding.name === 'instanceMatrix' ? 4 : binding.name === 'uv' ? 2 : 3);
      expect(binding.divisor).toBe(binding.name === 'instanceMatrix' ? 1 : 0);
      if (binding.columns) expect(binding.columns).toEqual(Array(4).fill({ enabled: true, size: 4, sameBuffer: true, divisor: 1 }));
    }
    const source = row.shaders.map((s: any) => s.source).join('\n');
    if (row.kind === 'grass' || row.kind === 'kelp') {
      expect(row.type).toBe('MeshStandardMaterial'); expect(row.key).toBe('cl-plant-flex-v28-water-pulse');
      expect(source).toContain('clPlantOffset'); expect(source).toContain('clPlantSlope'); expect(source).toContain('#define USE_COLOR');
      for (const marker of [
        'float ripple=phase*2.0+0.8-(travel+4.0)*t;',
        'float s=0.84*sin(angle)+0.16*sin(ripple);',
        'float c=0.84*travel*cos(angle)+0.16*(travel+4.0)*cos(ripple);',
        'float clPlantPulse(float phase,float sitePhase)',
        'clPlantPulseWeight=clPlantPulse(clPlantMotion.x,clPlantSitePhase);',
        'clPlantSitePhase=dot(clPlantSite.xz,vec2(0.075,0.055));',
      ]) expect(source, row.kind + ' native water flow').toContain(marker);
      expect(row.motion).toHaveLength(4); expect(row.motion.every(Number.isFinite)).toBe(true); expect(row.motion[3]).toBe(motionEnabled);
      expect(source.includes('#define USE_SHADOWMAP')).toBe(quality === 'balanced');
      if (row.kind === 'grass') { expect(row.draw.instanced).toBe(true); expect(row.draw.count).toBe(120); expect(row.draw.instances).toBe(7); }
      else { expect(row.draw.instanced).toBe(false); expect(row.draw.count).toBe(1272); }
    } else if (row.kind === 'sand') {
      expect(row.type).toBe('MeshStandardMaterial'); expect(source).toContain('clSandDownwelling');
      expect(row.key).toBe('cl-sand-relief-v36');
      for (const marker of ['#define CL_SAND_DERIVATIVES 1', 'clRippleHarmonicAA', 'clRipplePhaseGradient', 'clSandGradient', 'roughnessFactor=clamp(roughnessFactor+']) expect(source, 'native sand relief').toContain(marker);
      if(quality==='balanced'){expect(row.shadowBias).toBeCloseTo(-0.0007,8);expect(row.shadowNormalBias).toBeCloseTo(0.03,7);}else{expect(row.shadowBias).toBeNull();expect(row.shadowNormalBias).toBeNull();}
      expect(row.downwelling).toBeGreaterThanOrEqual(0); expect(row.downwelling).toBeLessThanOrEqual(1);
      for (const color of [row.ambient, row.keyLight, row.skyFill, row.groundFill]) { expect(color).toHaveLength(3); expect(color.every(Number.isFinite)).toBe(true); }
      expect(row.blended).toBe(false); expect(row.depthWrite).toBe(true);
    } else if (row.kind === 'caustics') { expect(row.blended).toBe(true); expect(row.depthWrite).toBe(false); }
    else if (/^(shaft|ray)-/.test(row.kind)) {
      expect(row.type).toBe('MeshBasicMaterial'); expect(row.draw.instanced).toBe(false); expect(row.draw.count).toBe(6); expect(row.blended).toBe(true); expect(row.depthWrite).toBe(false);
      for (const marker of ['clShaftAcross', 'clShaftFeather', 'clShaftFalloff']) expect(source).toContain(marker);
      const ceiling = row.kind.startsWith('shaft-') ? .085 : .04;
      expect(row.submittedOpacity).toBeGreaterThanOrEqual(0); expect(row.submittedOpacity).toBeLessThanOrEqual(ceiling + 1e-6); expect(row.submittedOpacity).toBeCloseTo(row.opacity, 5);
    }
    else {
      expect(row.type).toBe('ShaderMaterial'); expect(source).toContain('topColor'); expect(source).toContain('bottomColor');
      expect(row.top).toHaveLength(3); expect(row.bottom).toHaveLength(3); expect([...row.top, ...row.bottom].every(Number.isFinite)).toBe(true); expect(row.depthWrite).toBe(false);
    }
  }
}

async function state(page: Page) {
  return page.evaluate(() => {
    const w = window as any, gl = w.__hlRenderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererName = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    const lights: any[] = []; w.__hlScene.traverse((m: any) => { if (m.isLight) lights.push({ type: m.type, intensity: m.intensity, color: m.color.toArray(), ground: m.groundColor?.toArray() }); });
    return { plants: w.__hlPlants.map((m: any) => ({ name: m.name, position: m.position.toArray(), yaw: m.rotation.y, habitat: m.userData.clHabitat, groundOffset: m.userData.groundOffset })),
      motion: w.__hlOwned.filter((r: any) => r.motion).map((r: any) => r.motion.toArray()), player: w.__hlPlayer.position.toArray(), camera: w.__hlCamera.position.toArray(),
      lights, background: w.__hlScene.background.toArray(), top: w.__hlBackdrop.material.uniforms.topColor.value.toArray(), bottom: w.__hlBackdrop.material.uniforms.bottomColor.value.toArray(),
      causticOffset: w.__hlCaustics.material.map.offset.toArray(), causticOpacity: w.__hlCaustics.material.opacity, causticVisible: w.__hlCaustics.visible,
      rays: [...w.__hlRays, ...w.__hlShafts].map((m: any) => ({ opacity: m.material.opacity, rotation: m.rotation.toArray() })), shafts: w.__hlShafts.length, legacyRays: w.__hlRays.length, forcedFX: w.__hlForcedFX,
      shaftSkip: !!navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4 || matchMedia('(prefers-reduced-motion: reduce)').matches || /SwiftShader|llvmpipe|Software/i.test(rendererName), rendererName,
      shadows: w.__hlRenderer.shadowMap.enabled, exposure: w.__hlRenderer.toneMappingExposure, composer: !!w.__hlRenderer._alloComposer,
      rockCasters:w.__hlRocks.map((mesh:any)=>({uuid:mesh.uuid,materialUUID:mesh.material.uuid,shadowSide:mesh.material.shadowSide,surfaceSide:mesh.material.side,castShadow:mesh.castShadow,receiveShadow:mesh.receiveShadow})),
      rockDepthDraws:[...w.__hlRockDepthDraws.values()],rockResourcesStable:w.__hlRockOwned.every((row:any)=>row.mesh.geometry===row.geometry&&row.mesh.material===row.material&&row.mesh.geometry.index===row.index&&row.mesh.geometry.index?.array===row.indexArray&&row.attributes.every((entry:any)=>row.geometry.attributes[entry.name]===entry.attribute&&entry.attribute.array===entry.array&&entry.attribute.version===entry.version)),
      stable: w.__hlOwned.every((r: any) => r.mesh.geometry === r.geometry && r.mesh.material === r.material && r.material.map === r.map && r.material.customProgramCacheKey() === r.key && r.geometry.index === r.index && r.index.array === r.indexArray && r.mesh.instanceMatrix === r.instances && r.instances?.array === r.instanceArray && Object.entries(r.attrs).every(([name, old]: [string, any]) => r.geometry.attributes[name] === old.attr && old.attr.array === old.array)),
      plantBuffers: w.__hlOwned.filter((r: any) => r.motion).every((r: any) => Object.values(r.attrs).every((old: any) => old.attr.version === old.version && old.values.every((v: number, i: number) => v === old.array[i])) && (!r.instanceValues || r.instanceValues.every((v: number, i: number) => v === r.instanceArray[i]))),
      finite: w.__hlOwned.every((r: any) => r.mesh.matrixWorld.elements.every(Number.isFinite) && Object.values(r.geometry.attributes).every((a: any) => Array.from(a.array).every(Number.isFinite))),
      nativeStable: w.__hlNativeStable, nativeIssues: w.__hlNativeIssues,
      referenceIssues: w.__hlOwned.filter((r: any) => r.mesh.geometry !== r.geometry || r.mesh.material !== r.material || r.material.map !== r.map || r.material.customProgramCacheKey() !== r.key || r.geometry.index !== r.index || r.index.array !== r.indexArray || r.mesh.instanceMatrix !== r.instances || r.instances?.array !== r.instanceArray || Object.entries(r.attrs).some(([name, old]: [string, any]) => r.geometry.attributes[name] !== old.attr || old.attr.array !== old.array)).map((r: any) => ({ name: r.mesh.name, geometry: r.mesh.geometry === r.geometry, material: r.mesh.material === r.material, key: r.material.customProgramCacheKey() === r.key, attrs: Object.entries(r.attrs).filter(([name, old]: [string, any]) => r.geometry.attributes[name] !== old.attr || old.attr.array !== old.array).map(([name]) => name) })),
      resources: w.__hlResources.length, disposed: w.__hlResources.map((r: any) => r.disposed), textures: w.__hlRenderer.info.memory.textures,
      staticWorld: w.__hlScene.children.filter((m: any) => ['rock', 'coral'].includes(m.userData.substrate) || m.userData.shelterType || /^cl-(home|den)/.test(m.name)).map((m: any) => [m.uuid, m.name, m.position.toArray(), m.rotation.toArray(), m.scale.toArray()]),
      time: document.querySelector('[data-hud=time]')?.textContent,
      renders: w.__glRecorder.records.filter((r: any) => r.scene === w.__hlScene).at(-1).renders };
  });
}

function stable(value: Awaited<ReturnType<typeof state>>, quality: 'low' | 'balanced') {
  expect(value.stable, 'Owned mesh, material, texture and attribute references: ' + JSON.stringify(value.referenceIssues)).toBe(true);
  expect(value.plantBuffers, 'Immutable plant attribute and instance bytes/versions').toBe(true);
  expect(value.finite, 'Finite owned geometry and world transforms').toBe(true);
  expect(value.nativeStable, 'Actual native vertex/index buffer identities: ' + JSON.stringify(value.nativeIssues)).toBe(true);
  expect(value.resources).toBe(220 + 2 * value.shafts + 2 * value.legacyRays);
  expect(value.disposed).toEqual(Array(value.resources).fill(0));
  expect(value.lights.map((l: any) => l.type).sort()).toEqual(['AmbientLight', 'DirectionalLight', 'HemisphereLight']);
  expect(value.shadows).toBe(quality === 'balanced'); expect(value.exposure).toBe(1.18); expect(value.composer).toBe(false);
  expect(value.rockResourcesStable,'Rock surface and shadow caster resource identities').toBe(true);expect(value.rockCasters.length).toBeGreaterThan(0);
  expect(value.rockCasters.every((rock:any)=>rock.shadowSide===2&&rock.surfaceSide===0&&rock.castShadow&&rock.receiveShadow),'Solid reef rocks must cast both faces while surface receivers stay FrontSide').toBe(true);
  if(quality==='balanced'){expect(value.rockDepthDraws.length,'Actual solid reef-rock shadow depth draws').toBeGreaterThan(0);for(const draw of value.rockDepthDraws){expect(draw).toMatchObject({sourceShadowSide:2,submittedDepthSide:2,cullEnabled:false,linked:true,castShadow:true});expect(value.rockCasters.some((rock:any)=>rock.uuid===draw.uuid&&rock.materialUUID===draw.sourceMaterialUUID),'Depth draw uses an actual original rock material').toBe(true);}}else expect(value.rockDepthDraws).toEqual([]);
  expect(value.shafts).toBe(value.forcedFX ? 7 : value.shaftSkip ? 0 : 7); expect(value.legacyRays).toBe(quality === 'low' ? 0 : 4);
}

async function naturalComposition(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, ray = new T.Raycaster(), point = new T.Vector3(), matrix = new T.Matrix4(); w.__hlScene.updateMatrixWorld(true);
    const dens = w.__hlScene.children.filter((m: any) => m.name === 'cl-den' || m.name === 'cl-home');
    const shelters = w.__hlScene.children.filter((m: any) => m.userData.shelterType && m.userData.state !== 'carried');
    const obstacles = w.__hlScene.children.filter((m: any) => ['rock', 'coral'].includes(m.userData.substrate) && m.userData.reefPlacementValid !== false && m.userData.reefFootprint).map((mesh: any, index: number) => {
      // r128 setFromObject transforms local bounding-box corners, which can
      // overestimate rotated irregular reef meshes. Independently transform
      // every actual position vertex for the conservative world AABB instead.
      const bounds = new T.Box3(), vertex = new T.Vector3();
      mesh.traverse((part: any) => {
        const positions = part.geometry?.attributes.position; if (!positions) return;
        for (let i = 0; i < positions.count; i++) bounds.expandByPoint(vertex.fromBufferAttribute(positions, i).applyMatrix4(part.matrixWorld));
      });
      const coarse = new T.Box3().setFromObject(mesh), footprint = mesh.userData.reefFootprint;
      return { index, name: mesh.name, uuid: mesh.uuid, substrate: mesh.userData.substrate, position: mesh.position.toArray(), bounds,
        coarse, cached: [mesh.position.x + footprint.minX, mesh.position.x + footprint.maxX, mesh.position.z + footprint.minZ, mesh.position.z + footprint.maxZ] };
    });
    const rectangleDistance = (x: number, z: number, rect: number[]) => Math.hypot(Math.max(rect[0] - x, 0, x - rect[1]), Math.max(rect[2] - z, 0, z - rect[3]));
    return w.__hlPlants.map((mesh: any) => {
      const h = mesh.userData.clHabitat, roots: number[][] = []; const positions = mesh.geometry.attributes.position, base = new T.Vector3();
      for (let i = 0; i < 3; i++) base.add(point.fromBufferAttribute(positions, i)); base.multiplyScalar(1 / 3);
      for (let i = 0; i < (mesh.isInstancedMesh ? mesh.count : 1); i++) { point.copy(base); if (mesh.isInstancedMesh) { mesh.getMatrixAt(i, matrix); point.applyMatrix4(matrix); } roots.push(point.applyMatrix4(mesh.matrixWorld).toArray()); }
      let floorError: number | null = null;
      if (Math.abs(mesh.position.x) < 18 && Math.abs(mesh.position.z) < 75) {
        ray.set(new T.Vector3(mesh.position.x, 50, mesh.position.z), new T.Vector3(0, -1, 0)); ray.far = 150;
        const hit = ray.intersectObject(w.__hlSand, false)[0]; if (hit) floorError = Math.max(...roots.map(root => Math.abs(root[1] - hit.point.y - mesh.userData.groundOffset)));
      }
      const radius = h?.radius || 0, x = mesh.position.x, z = mesh.position.z;
      const denViolations = dens.map((den: any) => {
        const dx = x - den.position.x, dz = z - den.position.z, yaw = den.rotation.y, forward = dx * Math.sin(yaw) + dz * Math.cos(yaw), side = dx * Math.cos(yaw) - dz * Math.sin(yaw), distance = Math.hypot(dx, dz);
        return { name: den.name, position: den.position.toArray(), yaw, forward, side, distance, circleViolation: distance < 3 + radius - 1e-6,
          approachViolation: Math.abs(side) < 1.85 + radius && forward > -1.1 - radius && forward < 7 + radius };
      }).filter((d: any) => d.circleViolation || d.approachViolation);
      const shelterViolations = shelters.map((s: any) => ({ name: s.name, uuid: s.uuid, type: s.userData.shelterType, state: s.userData.state, position: s.position.toArray(), distance: Math.hypot(x - s.position.x, z - s.position.z) })).filter((s: any) => s.distance < 1.5 + radius - 1e-6);
      const overlaps = (b: any) => x + radius + .12 > b.min.x + 1e-5 && x - radius - .12 < b.max.x - 1e-5 && z + radius + .12 > b.min.z + 1e-5 && z - radius - .12 < b.max.z - 1e-5;
      const obstacleDiagnostic = (o: any) => ({ index: o.index, name: o.name, uuid: o.uuid, substrate: o.substrate, position: o.position,
        vertexBounds: [o.bounds.min.x, o.bounds.max.x, o.bounds.min.z, o.bounds.max.z], cachedBounds: o.cached, coarseBoxBounds: [o.coarse.min.x, o.coarse.max.x, o.coarse.min.z, o.coarse.max.z] });
      const reefViolations = obstacles.filter((o: any) => overlaps(o.bounds)).map(obstacleDiagnostic), coarseBoxOverlaps = obstacles.filter((o: any) => overlaps(o.coarse)).map(obstacleDiagnostic);
      return { name: mesh.name, habitat: h, visible: mesh.visible, roots, floorError, denClear: denViolations.length === 0, shelterClear: shelterViolations.length === 0, reefClear: reefViolations.length === 0,
        denViolations, shelterViolations, reefViolations, coarseBoxOverlaps, denCount: dens.length, groups: mesh.geometry.groups.length, children: mesh.children.length,
        spawnClearance: rectangleDistance(mesh.position.x, mesh.position.z, [-4.5, 4.5, -5, 4.5]), routeClearance: rectangleDistance(mesh.position.x, mesh.position.z, [0, 7, -5, 10]),
        height: mesh.geometry.userData.clPlantHeight, vertices: positions.count, triangles: mesh.geometry.index.count / 3, x: mesh.position.x, z: mesh.position.z, rootY: mesh.position.y };
    });
  });
}

async function release(page: Page, activeHarness = harness) {
  const count = await page.evaluate(() => (window as any).__hlResources.length);
  await activeHarness.unmount(page); expect(await activeHarness.leakedAfterUnmount(page)).toEqual([]);
  expect(await page.evaluate(() => (window as any).__hlResources.map((r: any) => r.disposed))).toEqual(Array(count).fill(1));
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.use({ video: 'off', trace: 'off' });
test.beforeAll(async () => {
  // A fresh checkout prepares its own uniquely scoped scratch source. The
  // guarded generator adds only a reference to initialized gameState and proves
  // exact byte restoration; natural cases still load the original model.
  // Root's explicit fixture override retains its separately saved proof.
  if (!diagnosticOverride) execFileSync(process.execPath, [resolve('reports/cephalopod-hunter-enhancement/pass-twenty-four/prepare-lighting-diagnostic.cjs'), resolve(model), resolve(diagnosticModel)], { cwd: process.cwd(), stdio: 'pipe' });
  await harness.start(); await diagnosticHarness.start();
});
test.afterAll(async () => { await diagnosticHarness.stop(); await harness.stop(); });
test.beforeEach(({ page }) => { const found: string[] = []; errors.set(page, found); page.on('pageerror', e => found.push(e.message)); page.on('console', m => { if (m.type() === 'error') found.push(m.text()); }); });
test.afterEach(async ({ page }) => { await harness.destroy(page); expect(errors.get(page)).toEqual([]); });

for (const quality of ['low', 'balanced'] as const) test(`${quality} natural habitat clusters keep open routes and grounded roots while actual plant, sand and water programs submit`, async ({ page }, testInfo) => {
  await mount(page, quality); const composition = await naturalComposition(page), initial = await state(page); stable(initial, quality);
  await testInfo.attach('natural-habitat-independent-clearance', { body: JSON.stringify({ quality, scope: 'Independent world-vertex reef bounds; rotated local-box bounds are diagnostic only. Original den and shelter clearance thresholds retained.', composition }, null, 2), contentType: 'application/json' });
  expect(composition.filter((r: any) => r.name === 'cl-seagrass')).toHaveLength(80); expect(composition.filter((r: any) => r.name === 'cl-kelp')).toHaveLength(25);
  for (const kind of ['grass', 'kelp']) {
    const rows = composition.filter((r: any) => r.habitat?.kind === kind); expect(rows).toHaveLength(kind === 'grass' ? 80 : 25);
    expect(new Set(rows.map((r: any) => r.habitat.grove)).size).toBe(5);
    for (let grove = 0; grove < 5; grove++) expect(rows.filter((r: any) => r.habitat.grove === grove)).toHaveLength(kind === 'grass' ? 16 : 5);
    expect(rows.some((r: any) => r.floorError !== null)).toBe(true);
    for (const row of rows) {
      expect(row.habitat.valid && row.visible, row.name + '/' + row.habitat.index).toBe(true); expect(row.habitat.radius).toBeGreaterThan(0); expect(Number.isFinite(row.habitat.seedX) && Number.isFinite(row.habitat.seedZ)).toBe(true);
      expect(row.denCount).toBe(4);
      const plant = row.name + '/' + row.habitat.index + ' at ' + JSON.stringify([row.x, row.z]) + ' radius ' + row.habitat.radius;
      expect(row.denClear, plant + ' den clearance: ' + JSON.stringify(row.denViolations)).toBe(true);
      expect(row.shelterClear, plant + ' shelter clearance: ' + JSON.stringify(row.shelterViolations)).toBe(true);
      expect(row.reefClear, plant + ' actual reef vertex clearance: ' + JSON.stringify(row.reefViolations)).toBe(true);
      expect(row.groups).toBe(0); expect(row.children).toBe(0); expect(row.vertices).toBe(kind === 'grass' ? 33 : 277); expect(row.triangles).toBe(kind === 'grass' ? 40 : 424);
      expect(row.spawnClearance).toBeGreaterThanOrEqual(row.habitat.radius - 1e-6); expect(row.routeClearance).toBeGreaterThanOrEqual(row.habitat.radius - 1e-6);
      expect(row.x + row.habitat.radius).toBeLessThanOrEqual(24.000001); expect(Math.max(Math.abs(row.x), Math.abs(row.z))).toBeLessThanOrEqual(78.000001);
      expect(row.roots.every((r: number[]) => r.every(Number.isFinite))).toBe(true); if (row.floorError !== null) expect(row.floorError).toBeLessThan(.055);
    }
  }
  const submitted = await native(page); rendered(submitted, quality);
  await step(page, 6); expect((await state(page)).motion).not.toEqual(initial.motion);
  await page.locator(canvas).focus(); await page.keyboard.press('Escape'); await expect(page.locator('[data-hud=burn]')).toHaveText('Paused');
  const paused = await state(page); await step(page, 4); const held = await state(page);
  for (const key of ['plants', 'motion', 'lights', 'top', 'bottom', 'causticOffset', 'causticOpacity', 'rays', 'time'] as const) expect(held[key]).toEqual(paused[key]);
  await clickCephalopodControl(page, 'Inspect'); await step(page, 2); const inspected = await state(page);
  await page.getByRole('button', { name: 'Orbit right', exact: true }).click(); await step(page, 5); const orbited = await state(page);
  expect(orbited.camera).not.toEqual(inspected.camera); expect(orbited.renders).toBeGreaterThan(inspected.renders); expect(orbited.plants).toEqual(paused.plants); expect(orbited.motion).toEqual(paused.motion); stable(orbited, quality);
  expect(orbited.staticWorld).toEqual(initial.staticWorld); expect(orbited.textures).toBe(initial.textures);
  await testInfo.attach('natural-habitat-native-contracts', { body: JSON.stringify({ quality, composition, submitted, initial, paused, shaftScope: initial.shaftSkip ? 'Existing software/low-power/reduced-motion skip retained; no seven-shaft natural-render claim.' : 'Seven existing shaft resources present; plant/sand/backdrop submissions are audited here, shaft pixels are reviewed separately.' }, null, 2), contentType: 'application/json' });
  await release(page);
});

test('diagnostic day and depth changes drive existing lighting while pause and reduced motion retain live resources', async ({ page }, testInfo) => {
  await mount(page, 'balanced', true);
  await page.evaluate(() => { const s = (window as any).__clLightingFixtureState; s.dayPeriodMs = 1e12; s.dayTime = 0; }); await step(page, 35);
  const day = await state(page); stable(day, 'balanced'); const dayNative = await native(page, ['sand', 'caustics', 'backdrop']); rendered(dayNative, 'balanced');
  const dayPixels = await diagnosticHarness.glPixels(page); expect(dayPixels).not.toBeNull(); expect(looksBlank(dayPixels!)).toBe(false);
  await testInfo.attach('diagnostic-shallow-day-gl-pixels', { body: dayPixels!.png, contentType: 'image/png' });
  await page.evaluate(() => { (window as any).__clLightingFixtureState.dayTime = .5; }); await step(page, 35);
  const night = await state(page), nightNative = await native(page, ['sand', 'caustics', 'backdrop']); rendered(nightNative, 'balanced');
  const nightPixels = await diagnosticHarness.glPixels(page); expect(nightPixels).not.toBeNull(); expect(looksBlank(nightPixels!)).toBe(false);
  await testInfo.attach('diagnostic-shallow-night-gl-pixels', { body: nightPixels!.png, contentType: 'image/png' });
  const key = (s: any) => s.lights.find((l: any) => l.type === 'DirectionalLight');
  expect(key(night).intensity).toBeLessThan(key(day).intensity * .35); expect(night.causticOpacity).toBeLessThan(day.causticOpacity * .01);
  expect(nightNative.find((r: any) => r.kind === 'sand').downwelling).toBeLessThan(.00001);
  const nativeKey = (rows: any[]) => rows.find((r: any) => r.kind === 'sand').keyLight.reduce((a: number, b: number) => a + b, 0);
  expect(nativeKey(nightNative)).toBeLessThan(nativeKey(dayNative) * .35);
  expect(night.top.reduce((a: number, b: number) => a + b, 0)).toBeLessThan(day.top.reduce((a: number, b: number) => a + b, 0));
  await page.evaluate(() => { const w = window as any; w.__clLightingFixtureState.dayTime = 0; w.__hlPlayer.position.x = 40; });
  await step(page, 110, ['KeyZ']); await step(page, 25); const deep = await state(page); stable(deep, 'balanced');
  expect(deep.player[1]).toBeLessThan(-10); expect(deep.causticVisible).toBe(false); expect(key(deep).intensity).toBeLessThan(key(day).intensity * .75);
  const deepNative = await native(page, ['sand', 'backdrop']); rendered(deepNative, 'balanced');
  const deepPixels = await diagnosticHarness.glPixels(page); expect(deepPixels).not.toBeNull(); expect(looksBlank(deepPixels!)).toBe(false);
  await testInfo.attach('diagnostic-deep-day-gl-pixels', { body: deepPixels!.png, contentType: 'image/png' });
  expect(deepNative.find((r: any) => r.kind === 'sand').downwelling).toBeLessThan(dayNative.find((r: any) => r.kind === 'sand').downwelling * .75);
  expect(nativeKey(deepNative)).toBeLessThan(nativeKey(dayNative) * .75);
  await clickCephalopodControl(page, 'Help / settings'); await page.getByLabel('Reduced motion', { exact: true }).check(); await page.getByRole('button', { name: 'Resume dive', exact: true }).click(); await step(page, 2);
  const reduced = await state(page); await step(page, 7); const still = await state(page);
  expect(still.motion).toEqual(reduced.motion); expect(still.motion.every((m: number[]) => m[3] === 0)).toBe(true); expect(still.causticOffset).toEqual(reduced.causticOffset); expect(still.rays).toEqual(reduced.rays); stable(still, 'balanced');
  await step(page, 8, ['KeyQ']); const risen = await state(page); expect(risen.player[1]).toBeGreaterThan(still.player[1]); expect(risen.motion).toEqual(still.motion);
  await page.locator(canvas).focus(); await page.keyboard.press('Escape'); const paused = await state(page); await step(page, 6); const held = await state(page);
  expect(held.lights).toEqual(paused.lights); expect(held.top).toEqual(paused.top); expect(held.bottom).toEqual(paused.bottom); expect(held.causticOffset).toEqual(paused.causticOffset); expect(held.rays).toEqual(paused.rays);
  expect(held.staticWorld).toEqual(day.staticWorld); expect(held.textures).toBe(day.textures);
  await testInfo.attach('explicit-day-depth-diagnostic', { body: JSON.stringify({ scope: 'Only this case uses a separate exact-reverse-proof state-reference exposure. DayTime is set, existing Dive/Ascend input changes authoritative depth, and the unmodified production frame updates existing resources. No natural-placement or forced-shaft visual claim.', day, night, deep, dayNative, nightNative, deepNative }, null, 2), contentType: 'application/json' });
  await release(page, diagnosticHarness);
});

test('phone natural habitat draws visible GL pixels and releases every owned plant and lighting resource exactly once', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 }); await mount(page, 'balanced');
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; window.dispatchEvent(new Event('resize')); }); await step(page, 4);
  const submitted = await native(page); rendered(submitted, 'balanced'); const current = await state(page); stable(current, 'balanced');
  const pixels = await harness.glPixels(page); expect(pixels).not.toBeNull(); expect(looksBlank(pixels!)).toBe(false);
  expect(pixels!.width).toBeGreaterThan(250); expect(pixels!.height).toBeGreaterThan(100); expect(pixels!.significantColors).toBeGreaterThan(3);
  await testInfo.attach('phone-natural-gl-pixels', { body: pixels!.png, contentType: 'image/png' });
  await testInfo.attach('phone-native-submissions', { body: JSON.stringify({ submitted, rendererName: current.rendererName, shafts: current.shafts, shaftSkip: current.shaftSkip, pixelStats: { ...pixels, png: undefined } }, null, 2), contentType: 'application/json' });
  await release(page);
});

test('explicit forced-effects diagnostic submits all seven softened shafts and four existing rays without claiming natural coverage', async ({ page }, testInfo) => {
  await page.addInitScript(() => { (window as any).__alloForceFX = true; });
  await mount(page, 'balanced', true, true);
  await page.evaluate(() => { const s = (window as any).__clLightingFixtureState; s.dayPeriodMs = 1e12; s.dayTime = 0; }); await step(page, 25);
  const initial = await state(page); stable(initial, 'balanced'); expect(initial.shafts).toBe(7); expect(initial.legacyRays).toBe(4);
  await page.locator(canvas).focus(); await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const w = window as any, T = w.THREE, camera = w.__hlCamera;
    const forward = camera.getWorldDirection(new T.Vector3()), right = new T.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    w.__hlForcedFixture = { scope: 'ForceFX bypasses the existing software skip. All eleven existing planes are placed on the current optical ray only for shader submission diagnostics; these positions are excluded from natural scene images.',
      original: [...w.__hlShafts, ...w.__hlRays].map((m: any) => ({ uuid: m.uuid, position: m.position.toArray(), quaternion: m.quaternion.toArray() })) };
    [...w.__hlShafts, ...w.__hlRays].forEach((mesh: any, index: number) => {
      const location = camera.position.clone().addScaledVector(forward, 12 + index * .2).addScaledVector(right, (index - 5) * .26);
      mesh.position.copy(mesh.parent.worldToLocal(location)); mesh.quaternion.copy(camera.quaternion); mesh.updateMatrixWorld(true);
    });
  });
  const kinds = [...Array.from({ length: 7 }, (_, i) => 'shaft-' + i), ...Array.from({ length: 4 }, (_, i) => 'ray-' + i)];
  const submitted = await native(page, kinds); rendered(submitted, 'balanced'); expect(submitted).toHaveLength(11);
  expect(submitted.every((r: any) => r.submittedOpacity > 0)).toBe(true);
  await page.keyboard.press('Escape');
  await clickCephalopodControl(page, 'Help / settings'); await page.getByLabel('Reduced motion', { exact: true }).check(); await page.getByRole('button', { name: 'Resume dive', exact: true }).click(); await step(page, 3);
  const reduced = await state(page); await step(page, 6); const held = await state(page);
  expect(held.rays).toEqual(reduced.rays); expect(held.causticOffset).toEqual(reduced.causticOffset); expect(held.motion).toEqual(reduced.motion); stable(held, 'balanced');
  await page.evaluate(() => { (window as any).__clLightingFixtureState.dayTime = .5; }); await step(page, 25); const night = await state(page);
  expect(night.rays.every((r: any) => r.opacity < .000001)).toBe(true); expect(night.rays.map((r: any) => r.rotation)).toEqual(reduced.rays.map((r: any) => r.rotation));
  expect(night.causticOffset).toEqual(reduced.causticOffset); expect(night.motion).toEqual(reduced.motion);
  expect(night.lights.find((l: any) => l.type === 'DirectionalLight').intensity).toBeLessThan(reduced.lights.find((l: any) => l.type === 'DirectionalLight').intensity * .35); stable(night, 'balanced');
  await testInfo.attach('forced-effects-native-diagnostic', { body: JSON.stringify({ fixture: await page.evaluate(() => (window as any).__hlForcedFixture), submitted, reduced, night }, null, 2), contentType: 'application/json' });
  await release(page, diagnosticHarness);
});
