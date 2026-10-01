import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const modules = ['desktop/web-app/node_modules', 'node_modules'].map(p => resolve(p)).find(p => existsSync(resolve(p, 'react')));
const React = require(resolve(modules, 'react'));
const { createRoot } = require(resolve(modules, 'react-dom/client'));
const { act } = require(resolve(modules, 'react-dom/test-utils'));
const source = readFileSync('stem_lab/stem_tool_firstresponse.js', 'utf8');
const THREE = {};
new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
let host, root, state, patch, build, lastSync;
const scenes = [];
function mount(seed = {}) {
  function Harness() {
    const [data, setData] = React.useState({ consentAccepted: true, view: 'body3d', b3dTab: 'depth', ...seed });
    state = data; patch = value => setData(prev => ({ ...prev, ...value }));
    return window.StemLab._registry.firstResponse.render({ React, toolData: { firstResponse: data },
      update: (_, key, value) => patch({ [key]: value }), updateMulti: (_, value) => patch(value),
      t: (_, fallback) => fallback, addToast: () => {}, gradeBand: 'g68' });
  }
  act(() => root.render(React.createElement(Harness)));
}
function click(text) {
  const b = [...host.querySelectorAll('button')].find(el => el.textContent === text);
  expect(b, text).toBeTruthy(); act(() => b.click());
}
function predict(kind, value) {
  const radio = host.querySelector('input[name="fr-depth-predict-' + kind + '"][value="' + value + '"]');
  expect(radio).toBeTruthy(); act(() => radio.click());
}
function model(age = 'adult', tab = 'depth', phase = 0) {
  const scene = new THREE.Scene(); scenes.push(scene);
  const content = build(THREE, { scene, phase, dark: true, contrast: false, wantShadow: false,
    trim: color => new THREE.MeshPhongMaterial({ color }), sceneProps: { tab, age } });
  return (settings, tick = 0, reduced = false, saved = null, sceneValues = {}) => {
    content.frame(tick, { depthLab: { age, ...settings }, depthReference: saved, ...sceneValues }, reduced);
    const chest = scene.getObjectByName('fr-depth-chest');
    const hands = scene.getObjectByName('fr-depth-hands');
    const marker = scene.getObjectByName('fr-depth-marker');
    const reference = scene.getObjectByName('fr-depth-reference');
    const savedMarker = scene.getObjectByName('fr-depth-saved');
    scene.updateMatrixWorld(true);
    return { scene, chest, hands, marker, reference, savedMarker, savedY: savedMarker.position.y, arrow: scene.getObjectByName('fr-depth-direction'), anatomy: scene.getObjectByName('fr-depth-anatomy'),
      measure: scene.getObjectByName('fr-depth-measure'), travel: scene.getObjectByName('fr-depth-travel'),
      releaseCap: scene.getObjectByName('fr-depth-travel-release'), peakCap: scene.getObjectByName('fr-depth-travel-peak'),
      top: chest.position.y + 0.25 * chest.scale.y,
      bottom: chest.position.y - 0.25 * chest.scale.y,
      handY: hands.position.y, markerY: marker.position.y };
  };
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear(); delete window.__alloflowFirstResponse; lastSync = null;
  window.StemLab = { _registry: {}, isRegistered: () => false,
    makeBayViewer(config) { build = config.buildScene; return { attach() {}, sync(props) { lastSync = props; }, nudge() {}, zoom() {}, reset() {}, status: () => 'failed' }; },
    registerTool(id, config) { this._registry[id] = config; } };
  new Function(source)();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount()); host.remove(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  for (const scene of scenes.splice(0)) scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
});

describe('recovery pose review', () => {
  const completed = ['check','arm','hand','knee','roll','airway','stable','watch'];
  function selectPose(value) {
    const select = host.querySelector('#fr-recovery-pose');
    act(() => { select.value = String(value); select.dispatchEvent(new Event('change', { bubbles: true })); });
  }
  it('revisits poses while retaining completion and restores the final-position message', () => {
    mount({ b3dTab:'recovery', b3dRec:completed });
    expect(host.querySelectorAll('.fr-body3d-content ol button')).toHaveLength(8);
    expect(host.querySelectorAll('#fr-recovery-pose option')).toHaveLength(9);
    expect(lastSync.phase).toBe(8);
    expect(host.textContent).toContain('Positioned — now keep watching');
    selectPose(4);
    expect(lastSync.phase).toBe(4); expect(state.b3dRec).toEqual(completed);
    expect(host.textContent).not.toContain('Positioned — now keep watching');
    expect(host.querySelector('.fr-recovery-review [role="status"]').textContent).toContain('step 4');
    click('Previous pose'); expect(lastSync.phase).toBe(3);
    click('Next pose'); expect(lastSync.phase).toBe(4);
    click('Latest completed pose'); expect(lastSync.phase).toBe(8);
    expect(state.b3dRecView).toBeNull();
    expect(host.textContent).toContain('Positioned — now keep watching');
  });
  it('limits review to completed poses, resumes at the next step and clears review on reset', () => {
    mount({ b3dTab:'recovery', b3dRec:completed.slice(0,4), b3dRecView:2 });
    expect(host.querySelectorAll('#fr-recovery-pose option')).toHaveLength(5);
    selectPose(0); expect(lastSync.phase).toBe(0);
    expect([...host.querySelectorAll('button')].find(b=>b.textContent==='Previous pose').disabled).toBe(true);
    selectPose(4);
    expect([...host.querySelectorAll('button')].find(b=>b.textContent==='Next pose').disabled).toBe(true);
    selectPose(2);
    act(()=>host.querySelectorAll('.fr-body3d-content ol button')[4].click());
    expect(state.b3dRec).toEqual(completed.slice(0,5)); expect(state.b3dRecView).toBeNull(); expect(lastSync.phase).toBe(5);
    click('↺ Start again'); expect(state.b3dRec).toEqual([]); expect(state.b3dRecView).toBeNull();
    expect(lastSync.phase).toBe(0); expect(host.querySelector('.fr-recovery-review')).toBeNull();
  });
  it.each([[NaN,4],[Infinity,4],[-3,0],[99,4],[2.9,2],[null,4]])('bounds a stored pose %s to %s', (saved,expected) => {
    mount({ b3dTab:'recovery', b3dRec:completed.slice(0,4), b3dRecView:saved });
    expect(lastSync.phase).toBe(expected); expect(host.querySelector('#fr-recovery-pose').value).toBe(String(expected));
    expect(state.b3dRec).toEqual(completed.slice(0,4));
  });
});

describe('contoured hips and smooth limb shading', () => {
  it.each(['adult','child','infant'])('uses a closed, outward-facing fitted pelvis for %s', age => {
    const {scene}=model(age,'recovery',4)({});
    const mesh=scene.getObjectByName('fr-manikin-pelvis');
    const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,index=mesh.geometry.index.array,edges=new Map();
    expect(mesh.parent.name).toBe('fr-training-manikin');
    for(let i=0;i<index.length;i+=3)for(const [a,b] of [[index[i],index[i+1]],[index[i+1],index[i+2]],[index[i+2],index[i]]]) {
      const key=[Math.min(a,b),Math.max(a,b)].join(':');edges.set(key,(edges.get(key)||0)+1);
    }
    expect([...edges.values()].every(count=>count===2)).toBe(true);
    let maxWidth=0;
    for(let i=0;i<p.count;i++) {
      maxWidth=Math.max(maxWidth,Math.abs(p.getX(i)));
      expect(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))).toBeCloseTo(1,5);
      if(Math.abs(p.getX(i))>.3)expect(p.getX(i)*n.getX(i)).toBeGreaterThan(0);
    }
    expect(maxWidth).toBeGreaterThan(.35); expect(maxWidth).toBeLessThan(.45);
  });
  it.each(['adult','child','infant'])('keeps limb side normals radial at joints and continuous at the seam for %s', age => {
    const {scene}=model(age,'recovery',4)({});
    for(const name of ['fr-patient-right-thigh','fr-patient-right-shin','fr-rescuer-lower-forearm']) {
      const mesh=scene.getObjectByName(name),p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
      for(let row=0;row<17;row++) {
        const a=row*25,b=a+24;
        for(const axis of ['X','Y','Z'])expect(n['get'+axis](a)).toBeCloseTo(n['get'+axis](b),6);
        if(row===0||row===16)expect(Math.abs(n.getY(a))).toBeLessThan(.00001);
        for(let j=0;j<25;j++) {
          const i=a+j;expect(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))).toBeCloseTo(1,5);
          expect(p.getX(i)*n.getX(i)+p.getZ(i)*n.getZ(i)).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('recovery leg inspection — actual Three.js geometry', () => {
  it.each(['adult','child','infant'])('settles the resting and support feet near the mat for %s', age => {
    const rest = model(age,'recovery',0)({});
    for (const phase of [0,4,5,7,8]) {
      const { scene } = model(age,'recovery',phase)({});
      for (const side of ['left','right']) {
        // The far foot lifts with the lever leg before the final support step.
        if (side === 'right' && phase === 5) continue;
        const prefix = 'fr-patient-'+side;
        for (const segment of ['thigh','shin']) {
          expect(scene.getObjectByName(prefix+'-'+segment).geometry.parameters.height)
            .toBeCloseTo(rest.scene.getObjectByName(prefix+'-'+segment).geometry.parameters.height,10);
        }
        let lowest = Infinity;
        const vertex = new THREE.Vector3();
        for (const name of ['shoe','sole']) {
          const mesh = scene.getObjectByName(prefix+'-'+name), positions = mesh.geometry.attributes.position;
          for (let i=0;i<positions.count;i++) lowest=Math.min(lowest,vertex.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld).y);
        }
        expect(lowest,age+' '+side+' foot at phase '+phase).toBeGreaterThanOrEqual(.027);
        expect(lowest,age+' '+side+' foot at phase '+phase).toBeLessThan(.06);
      }
    }
  });

  it.each(['adult','child','infant'])('keeps both leg segments at their resting lengths through every knee pose for %s', age => {
    const rest = model(age,'recovery',0)({});
    const thighLength = rest.scene.getObjectByName('fr-patient-right-thigh').geometry.parameters.height;
    const shinLength = rest.scene.getObjectByName('fr-patient-right-shin').geometry.parameters.height;
    const restingKnee = rest.scene.getObjectByName('fr-patient-right-knee').position.clone();
    for (let phase = 4; phase <= 8; phase++) {
      const { scene } = model(age,'recovery',phase)({});
      expect(scene.getObjectByName('fr-patient-right-thigh').geometry.parameters.height).toBeCloseTo(thighLength,10);
      expect(scene.getObjectByName('fr-patient-right-shin').geometry.parameters.height).toBeCloseTo(shinLength,10);
      if (phase === 4) {
        const knee = scene.getObjectByName('fr-patient-right-knee').position;
        expect(knee.y-restingKnee.y).toBeGreaterThan(thighLength*.6);
        const foot = scene.getObjectByName('fr-patient-right-foot');
        expect(foot.position.z).toBeLessThan(rest.scene.getObjectByName('fr-patient-right-foot').position.z);
        const restingAnkleY = rest.scene.getObjectByName('fr-patient-right-foot').position.y;
        expect(foot.position.y).toBeGreaterThanOrEqual(restingAnkleY);
        expect(foot.position.y).toBeLessThan(restingAnkleY+.03);
      }
    }
  });

  it.each(['adult','child','infant'])('keeps the feet perpendicular to the shins and the closed shoe surfaces visible for %s', age => {
    for (const phase of [0,4,5,7,8]) {
      const { scene } = model(age,'recovery',phase)({});
      const legs = scene.getObjectByName('fr-patient-legs');
      expect(legs.parent.name).toBe('fr-training-manikin');
      for (const side of ['left','right']) {
        const prefix = 'fr-patient-'+side, foot = scene.getObjectByName(prefix+'-foot');
        expect(foot.parent).toBe(legs);
        const knee = scene.getObjectByName(prefix+'-knee').getWorldPosition(new THREE.Vector3());
        const ankle = foot.getWorldPosition(new THREE.Vector3());
        const shin = ankle.clone().sub(knee).normalize();
        const toe = new THREE.Vector3(0,0,1).transformDirection(foot.matrixWorld);
        const dorsal = new THREE.Vector3(0,1,0).transformDirection(foot.matrixWorld);
        expect(Math.abs(toe.dot(shin))).toBeLessThan(1e-10);
        expect(dorsal.dot(shin)).toBeCloseTo(-1,10);
        expect(scene.getObjectByName(prefix+'-cuff')).toBeTruthy();
        const shoe = scene.getObjectByName(prefix+'-shoe').geometry;
        const positions = shoe.attributes.position, normals = shoe.attributes.normal;
        expect(normals.array.every(Number.isFinite)).toBe(true);
        let widest = 0;
        for (let i=0;i<positions.count;i++) {
          if (positions.getX(i)>positions.getX(widest)) widest=i;
        }
        expect(normals.getX(widest)).toBeGreaterThan(.9);
        const sole = scene.getObjectByName(prefix+'-sole').geometry;
        sole.computeBoundingBox();
        expect(sole.boundingBox.min.y).toBeCloseTo(-.076,6);
        expect(sole.boundingBox.max.y).toBeCloseTo(-.058,6);
      }
    }
  });
});

describe('3D compression explorer — actual Three.js geometry', () => {
  it.each(['adult','child','infant'])('places the far hand back on the posed cheek without stretching the arm for %s', age => {
    const rest = model(age,'recovery',0)({},0,true);
    const upperLength = rest.scene.getObjectByName('fr-patient-right-upper-arm').geometry.parameters.height;
    const foreLength = rest.scene.getObjectByName('fr-patient-right-forearm').geometry.parameters.height;
    for(const phase of [3,5,6,8]) {
      const pose = model(age,'recovery',phase)({},0,true);
      const hand = pose.scene.getObjectByName('fr-patient-right-hand');
      const palm = pose.scene.getObjectByName('fr-patient-right-palm');
      const normal = new THREE.Vector3(0,1,0).transformDirection(hand.matrixWorld);
      const back = palm.getWorldPosition(new THREE.Vector3()).addScaledVector(normal,-palm.getWorldScale(new THREE.Vector3()).y);
      const hits = new THREE.Raycaster(back,normal.clone().negate()).intersectObject(pose.scene.getObjectByName('fr-manikin-head'),false);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0].distance).toBeLessThan(.02);
      expect(pose.scene.getObjectByName('fr-patient-right-upper-arm').geometry.parameters.height).toBeCloseTo(upperLength,8);
      expect(pose.scene.getObjectByName('fr-patient-right-forearm').geometry.parameters.height).toBeCloseTo(foreLength,8);
    }
  });
  it.each(['adult', 'child', 'infant'])('keeps the extended near palm up and the far hand back against the cheek for %s', age => {
    function normal(snapshot,name) {
      return new THREE.Vector3(0,1,0).transformDirection(snapshot.scene.getObjectByName(name).matrixWorld);
    }
    const rest = model(age,'recovery',0)({},0,true);
    expect(normal(rest,'fr-patient-left-hand').y).toBeLessThan(-.9);
    expect(normal(rest,'fr-patient-right-hand').y).toBeLessThan(-.9);
    for(const phase of [2,5,8]) {
      const pose = model(age,'recovery',phase)({},0,true);
      expect(normal(pose,'fr-patient-left-hand').y).toBeGreaterThan(.9);
      if (phase >= 3) {
        const palm = pose.scene.getObjectByName('fr-patient-right-palm').getWorldPosition(new THREE.Vector3());
        const head = pose.scene.getObjectByName('fr-manikin-head-pivot').getWorldPosition(new THREE.Vector3());
        expect(normal(pose,'fr-patient-right-hand').dot(palm.sub(head).normalize())).toBeGreaterThan(.5);
      }
    }
  });
  it.each(['adult','child','infant'])('connects the shaped wrist without lowering it through the chest contact plane for %s', age => {
    const sample = model(age), rest = sample({motion:'release'},0,true);
    const bridge = rest.scene.getObjectByName('fr-rescuer-lower-wrist-bridge');
    expect(bridge.parent.name).toBe('fr-rescuer-lower');
    const centre = bridge.getWorldPosition(new THREE.Vector3());
    expect(centre.y-bridge.scale.y).toBeGreaterThan(rest.markerY);
    const wrist = rest.scene.getObjectByName('fr-rescuer-lower-forearm');
    const wristEnd = new THREE.Vector3(0,-wrist.geometry.parameters.height/2,0).applyMatrix4(wrist.matrixWorld);
    const ellipsoidDistance = wristEnd.clone().sub(centre);
    // Transform into the hand frame before checking overlap with its wrist pad.
    ellipsoidDistance.applyQuaternion(bridge.getWorldQuaternion(new THREE.Quaternion()).invert());
    expect(Math.pow(ellipsoidDistance.x/bridge.scale.x,2)+Math.pow(ellipsoidDistance.y/bridge.scale.y,2)+Math.pow(ellipsoidDistance.z/bridge.scale.z,2)).toBeLessThan(1);
    const press = sample({motion:'press'},0,true);
    expect(press.scene.getObjectByName('fr-rescuer-lower-wrist-bridge')).toBe(bridge);
    expect(bridge.getWorldPosition(new THREE.Vector3()).y-bridge.scale.y).toBeGreaterThan(press.markerY);
  });
  it.each(['adult', 'child', 'infant'])('keeps the coach heel on the actual chest surface through compression and release for %s', age => {
    const sample = model(age, 'coach');
    function clearance(snapshot) {
      const torso = snapshot.scene.getObjectByName('fr-manikin-torso');
      const vertices = torso.geometry.attributes.position;
      let surface = -Infinity;
      for (let i=0;i<vertices.count;i++) {
        surface = Math.max(surface,new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(torso.matrixWorld).y);
      }
      const heel = snapshot.scene.getObjectByName('fr-rescuer-lower-heel');
      return { gap:heel.getWorldPosition(new THREE.Vector3()).y-heel.scale.y-surface, surface };
    }
    const rest = clearance(sample({},0,true));
    expect(rest.gap).toBeCloseTo(0,7);
    const press = clearance(sample({},0,false,null,{coach:{mode:'scenario',activeCompressionAt:1,phase:'compressions'}}));
    expect(press.surface).toBeLessThan(rest.surface);
    expect(press.gap).toBeCloseTo(0,7);
    expect(clearance(sample({},0,false)).gap).toBeCloseTo(0,7);
    expect(clearance(sample({},0,false,null,{coach:{phase:'breaths'}})).gap).toBeCloseTo(.18,7);
    expect(clearance(sample({},0,true,null,{coach:{phase:'breaths'}})).gap).toBeCloseTo(0,7);
  });
  it.each(['adult', 'child', 'infant'])('keeps the tapered forearms separate and the elbows level for %s', age => {
    const sample = model(age);
    const shown = sample({ motion: 'release' }, 0, true, null, { childHands: 'two' });
    const lower = shown.scene.getObjectByName('fr-rescuer-lower-forearm');
    lower.geometry.computeBoundingBox();
    const vertices = lower.geometry.attributes.position;
    let wristRadius = 0, middleRadius = 0;
    const length = lower.geometry.parameters.height;
    for (let i=0;i<vertices.count;i++) {
      const t = vertices.getY(i)/length+.5, radius = Math.hypot(vertices.getX(i),vertices.getZ(i));
      if (t < .01) wristRadius = Math.max(wristRadius,radius);
      if (t > .25 && t < .5) middleRadius = Math.max(middleRadius,radius);
    }
    expect(middleRadius).toBeGreaterThan(wristRadius*1.25);
    const upper = shown.scene.getObjectByName('fr-rescuer-upper-forearm');
    if (upper) {
      upper.geometry.computeBoundingBox();
      const lowTop = new THREE.Vector3(0,length/2,0).applyMatrix4(lower.matrixWorld);
      const upTop = new THREE.Vector3(0,upper.geometry.parameters.height/2,0).applyMatrix4(upper.matrixWorld);
      expect(upTop.y).toBeCloseTo(lowTop.y,8);
      const lowCentre = lower.getWorldPosition(new THREE.Vector3()), upCentre = upper.getWorldPosition(new THREE.Vector3());
      const separation = Math.hypot(lowCentre.x-upCentre.x,lowCentre.z-upCentre.z);
      const radii = (lower.geometry.boundingBox.max.x-lower.geometry.boundingBox.min.x+upper.geometry.boundingBox.max.x-upper.geometry.boundingBox.min.x)/2;
      expect(separation).toBeGreaterThan(radii);
    }
    const compressed = sample({ motion: 'press' }, 0, true, null, { childHands: 'two' });
    expect(compressed.scene.getObjectByName('fr-rescuer-lower-forearm')).toBe(lower);
    expect(lower.geometry.parameters.height).toBe(length);
  });
  it.each(['adult', 'child', 'infant'])('moves the continuous chest surface while keeping its back fixed for %s', age => {
    const sample = model(age);
    function contact(snapshot) {
      const torso = snapshot.scene.getObjectByName('fr-manikin-torso'), vertices = torso.geometry.attributes.position;
      let high=-Infinity, low=Infinity;
      for(let i=0;i<vertices.count;i++) {
        const vertex = new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(torso.matrixWorld);
        high=Math.max(high,vertex.y); low=Math.min(low,vertex.y);
      }
      return { high, low };
    }
    const release = sample({ motion: 'release', lean: 0 }), before = contact(release);
    expect(before.high).toBeCloseTo(release.markerY,7);
    const pressed = sample({ motion: 'press' }), after = contact(pressed);
    expect(after.high).toBeCloseTo(pressed.markerY,7);
    expect(after.low).toBeCloseTo(before.low,7);
    const head = pressed.scene.getObjectByName('fr-manikin-head-pivot');
    for(const name of ['fr-manikin-eye-left','fr-manikin-eye-right','fr-manikin-mouth']) {
      expect(pressed.scene.getObjectByName(name).parent).toBe(head);
    }
  });
  it('switches child hand arrangements while preserving chest motion, contact, and scene identity', () => {
    const sample = model('child');
    const settings = { depth: 5, lean: 1, motion: 'inspect', phase: 50, measure: true };
    const one = sample(settings, 0, true, null, { childHands: 'one' });
    const markerY = one.markerY, handY = one.handY, travel = one.travel.scale.y;
    const lower = one.scene.getObjectByName('fr-rescuer-lower');
    const upper = one.scene.getObjectByName('fr-rescuer-upper');
    expect(upper.visible).toBe(false);
    const upperLength = upper.getObjectByName('fr-rescuer-upper-forearm').geometry.parameters.height;
    const two = sample(settings, 15000, true, null, { childHands: 'two' });
    expect(upper.visible).toBe(true);
    expect(two.chest).toBe(one.chest); expect(two.hands).toBe(one.hands);
    expect(two.markerY).toBe(markerY); expect(two.handY).toBe(handY); expect(two.travel.scale.y).toBe(travel);
    expect(upper.position.y - lower.position.y).toBeCloseTo(0.071, 8);
    const lowerHeel = lower.getObjectByName('fr-rescuer-lower-heel').getWorldPosition(new THREE.Vector3());
    const upperHeel = upper.getObjectByName('fr-rescuer-upper-heel').getWorldPosition(new THREE.Vector3());
    expect(upperHeel.x).toBeCloseTo(lowerHeel.x, 8);
    expect(upperHeel.z).toBeCloseTo(lowerHeel.z, 8);
    const release = sample({ ...settings, phase: 100 }, 0, true, null, { childHands: 'two' });
    const heel = lower.getObjectByName('fr-rescuer-lower-heel');
    expect(heel.getWorldPosition(new THREE.Vector3()).y - heel.scale.y).toBeCloseTo(release.markerY, 8);
    expect(upper.getObjectByName('fr-rescuer-upper-forearm').geometry.parameters.height).toBe(upperLength);
    expect(sample(settings, 0, true, null, { childHands: 'one' }).hands.children.filter(o => o.visible)).toHaveLength(1);
  });
  it.each([['adult', 2], ['child', 1], ['infant', 1]])('ignores invalid child choices and keeps age-appropriate hands for %s', (age, expected) => {
    const sample = model(age);
    for (const childHands of [undefined, null, 'invalid', {}, 2]) {
      expect(sample({}, 0, true, null, { childHands }).hands.children.filter(o => o.visible)).toHaveLength(expected);
    }
    const selected = sample({}, 0, true, null, { childHands: 'two' });
    expect(selected.hands.children.filter(o => o.visible)).toHaveLength(age === 'infant' ? 1 : 2);
  });
  it.each(['adult', 'child', 'infant'])('reveals hands only at the supported placement region for %s', age => {
    const sample = model(age, 'place');
    const hidden = sample({}, 0, true);
    expect(hidden.hands.visible).toBe(false);
    for (const placed of ['high', 'low', 'belly', 'sideL', 'sideR', 'unknown', { id: 'correct' }]) {
      expect(sample({}, 0, true, null, { placed }).hands.visible).toBe(false);
    }
    const shown = sample({}, 0, true, null, { placed: 'correct', childHands: 'two' });
    expect(shown.hands.visible).toBe(true); expect(shown.hands).toBe(hidden.hands);
    expect(shown.scene.getObjectByName('fr-schematic-lungs').visible).toBe(false);
    expect(shown.scene.getObjectByName('fr-schematic-heart').visible).toBe(false);
    const heel = shown.scene.getObjectByName('fr-rescuer-lower-heel');
    const contactY = heel.getWorldPosition(new THREE.Vector3()).y - heel.scale.y;
    const sternumWorldY = shown.anatomy.parent.position.y + 0.25 * shown.anatomy.parent.scale.y;
    expect(contactY).toBeCloseTo(sternumWorldY, 8);
    expect(sample({}, 0, true, null, { placed: 'belly' }).hands.visible).toBe(false);
  });
  it.each([['adult', 2], ['child', 1], ['infant', 1]])('keeps connected hands and fixed arm lengths on the moving chest for %s', (age, handCount) => {
    const sample = model(age);
    const release = sample({ motion: 'release' });
    expect(release.hands.children.filter(o => o.visible)).toHaveLength(handCount);
    const hand = release.scene.getObjectByName('fr-rescuer-lower');
    const heel = release.scene.getObjectByName('fr-rescuer-lower-heel');
    const forearm = release.scene.getObjectByName('fr-rescuer-lower-forearm');
    const heelRestY = heel.getWorldPosition(new THREE.Vector3()).y - heel.scale.y;
    expect(heel.getWorldPosition(new THREE.Vector3()).x).toBeCloseTo(release.hands.position.x, 8);
    expect(heel.getWorldPosition(new THREE.Vector3()).z).toBeCloseTo(release.hands.position.z, 8);
    expect(heelRestY).toBeCloseTo(release.markerY, 8);
    const length = forearm.geometry.parameters.height;
    for (let i = 0; i < 4; i++) {
      const finger = hand.getObjectByName('fr-rescuer-lower-finger-' + i);
      expect(finger.children).toHaveLength(4);
      const tip = finger.children[3];
      expect(tip.getWorldPosition(new THREE.Vector3()).y - tip.scale.y).toBeGreaterThan(heelRestY);
    }
    const press = sample({ motion: 'press' });
    expect(heel.getWorldPosition(new THREE.Vector3()).y - heel.scale.y).toBeCloseTo(press.markerY, 8);
    expect(forearm.geometry.parameters.height).toBe(length);
    expect(press.hands).toBe(release.hands);
    expect(hand).toBe(press.scene.getObjectByName('fr-rescuer-lower'));
    expect(new THREE.Vector3(0, 1, 0).applyQuaternion(forearm.getWorldQuaternion(new THREE.Quaternion())).y).toBeCloseTo(1, 8);
    const hidden = sample({ motion: 'press', hands: false });
    expect(hidden.hands.visible).toBe(false);
    expect(hidden.markerY).toBeCloseTo(press.markerY, 8);
    expect(sample({ motion: 'press', hands: true }).hands.visible).toBe(true);
  });
  it.each([['adult', 5.5], ['child', 5], ['infant', 4]])('calibrates the ruler and movement bracket independently of cycle position for %s', (age, depth) => {
    const sample = model(age);
    const initial = sample({ measure: true, depth, lean: 1, motion: 'release' });
    const rest = sample({ depth, lean: 0, motion: 'release', measure: true }).markerY;
    const released = sample({ measure: true, depth, lean: 1, motion: 'release' });
    const oneCm = rest - released.markerY;
    expect(released.measure.visible).toBe(true);
    expect(released.releaseCap.position.y).toBeCloseTo(released.markerY, 8);
    const ticks = released.measure.children.filter(o => Number.isFinite(o.userData.centimetres));
    for (const tick of ticks) expect(rest - tick.position.y).toBeCloseTo(tick.userData.centimetres * oneCm, 8);
    for (const phase of [0, 25, 50, 75, 100]) {
      const current = sample({ measure: true, depth, lean: 1, motion: 'inspect', phase }, 12000, true);
      expect(current.releaseCap.position.y).toBeCloseTo(rest - oneCm, 8);
      expect(current.peakCap.position.y).toBeCloseTo(rest - depth * oneCm, 8);
      expect(current.travel.scale.y).toBeCloseTo((depth - 1) * oneCm, 8);
      expect(current.travel.position.y).toBeCloseTo((current.releaseCap.position.y + current.peakCap.position.y) / 2, 8);
      expect(current.measure).toBe(initial.measure);
    }
    expect(sample({ measure: false }).measure.visible).toBe(false);
  });
  it('renders a zero movement span without invalid dimensions', () => {
    const sample = model();
    for (const phase of [0, 25, 50, 75, 100]) {
      const current = sample({ depth: 1, lean: 2, measure: true, motion: 'inspect', phase });
      expect(current.travel.visible).toBe(false);
      expect(current.travel.scale.y).toBe(0);
      expect(current.releaseCap.position.y).toBe(current.peakCap.position.y);
      expect(current.markerY).toBeCloseTo(current.peakCap.position.y, 8);
    }
  });
  it.each([['adult', 5.5], ['child', 5], ['infant', 4]])('compares saved and current heights at the same cycle phase for %s', (age, depth) => {
    const sample = model(age);
    const saved = { age, depth, lean: 0, rate: 80, phase: 25, motion: 'press' };
    const settings = { depth, lean: 1, motion: 'inspect', phase: 100 };
    const released = sample(settings, 0, true, saved);
    expect(released.savedMarker.visible).toBe(true);
    expect(released.savedMarker.position.x).toBe(released.marker.position.x);
    expect(released.savedMarker.position.z).toBe(released.marker.position.z);
    expect(released.savedMarker.children[0].material.wireframe).toBe(true);
    const gap = released.savedY - released.markerY;
    expect(gap).toBeGreaterThan(0);
    const peak = sample({ ...settings, phase: 50 }, 0, true, saved);
    expect(peak.savedY).toBeCloseTo(peak.markerY, 8);
    const half = sample({ ...settings, phase: 25 }, 0, true, saved);
    expect(half.savedY - half.markerY).toBeCloseTo(gap / 2, 8);
    expect(half.savedMarker).toBe(released.savedMarker);
    expect(half.chest).toBe(released.chest);
    const animated = sample({ ...settings, motion: 'cycle', rate: 120 }, 250, false, saved);
    expect(animated.savedY).toBeCloseTo(animated.markerY, 8);
    expect(sample(settings, 0, true).savedMarker.visible).toBe(false);
  });
  it('ignores invalid and other-age saved references and keeps the current chest unchanged', () => {
    const sample = model();
    const settings = { motion: 'inspect', phase: 75, lean: 0.5 };
    const height = sample(settings).markerY;
    for (const saved of [{}, { age: 'child', depth: 5, lean: 0 }, { age: 'adult', depth: NaN, lean: 0 }, { age: 'adult', depth: 5.5, lean: Infinity }]) {
      const current = sample(settings, 0, true, saved);
      expect(current.savedMarker.visible).toBe(false);
      expect(current.markerY).toBeCloseTo(height, 8);
    }
    const clamped = sample(settings, 0, true, { age: 'adult', depth: 200, lean: -50 });
    expect(clamped.savedMarker.visible).toBe(true);
    expect(Number.isFinite(clamped.savedY)).toBe(true);
    expect(clamped.markerY).toBeCloseTo(height, 8);
  });
  it.each([['adult', 5.5], ['child', 5], ['infant', 4]])('keeps the back fixed and the hand on the chest for %s', (age, depth) => {
    const sample = model(age);
    const release = sample({ depth, lean: 0, motion: 'release' });
    const restTop = release.top, restHand = release.handY, marker = release.markerY;
    const press = sample({ depth, lean: 0, motion: 'press' });
    expect(press.top).toBeLessThan(restTop);
    expect(press.bottom).toBeCloseTo(-0.25, 9);
    expect(press.handY).toBeLessThan(restHand);
    expect(press.handY - press.markerY).toBeCloseTo(0.036, 9);
    expect(press.markerY).toBeCloseTo(press.reference.position.y, 9);
    expect(sample({ depth, lean: 0, motion: 'release' }).markerY).toBeCloseTo(marker, 9);
  });
  it('distinguishes the same peak depth with full versus incomplete recoil', () => {
    const sample = model();
    const full = sample({ depth: 5.5, lean: 0, motion: 'release' }).markerY;
    const lean = sample({ depth: 5.5, lean: 1, motion: 'release' }).markerY;
    expect(lean).toBeLessThan(full);
    const peakA = sample({ depth: 5.5, lean: 0, motion: 'press' }).markerY;
    const peakB = sample({ depth: 5.5, lean: 1, motion: 'press' }).markerY;
    expect(peakA).toBeCloseTo(peakB, 9);
  });
  it('uses the selected cycle rate and holds release in reduced motion', () => {
    const sample = model();
    const settings = { depth: 5.5, lean: 0.5, motion: 'cycle', rate: 120 };
    const start = sample(settings, 0).markerY;
    const peak = sample(settings, 250).markerY;
    expect(peak).toBeLessThan(start);
    expect(sample(settings, 500).markerY).toBeCloseTo(start, 9);
    expect(sample(settings, 250, true).markerY).toBeCloseTo(start, 9);
    expect(sample({ ...settings, motion: 'press' }, 250, true).markerY).toBeCloseTo(peak, 9);
  });
  it('clamps malformed settings and changes the anatomy layer without rebuilding', () => {
    const sample = model();
    const a = sample({ depth: Infinity, lean: -5, rate: NaN, motion: 'unknown', anatomy: false });
    expect(Number.isFinite(a.top)).toBe(true); expect(a.bottom).toBeCloseTo(-0.25); expect(a.anatomy.visible).toBe(false);
    const chest = a.chest;
    const b = sample({ depth: 200, lean: 200, motion: 'press', anatomy: true });
    expect(b.chest).toBe(chest); expect(b.top).toBeGreaterThan(0); expect(b.anatomy.visible).toBe(true);
    expect(b.bottom).toBeCloseTo(-0.25);
  });
  it.each(['adult', 'child', 'infant'])('holds any inspected phase and distinguishes motion direction for %s', age => {
    const sample = model(age);
    const settings = { motion: 'inspect', phase: 25, lean: 1 };
    const down = sample(settings, 0, true);
    const downHeight = down.markerY;
    expect(new THREE.Vector3(0, 1, 0).applyQuaternion(down.arrow.quaternion).y).toBeCloseTo(-1, 8);
    expect(down.arrow.visible).toBe(true);
    expect(sample(settings, 7000).markerY).toBeCloseTo(downHeight, 8);
    expect(sample({ ...settings, rate: 80 }, 13000).markerY).toBeCloseTo(downHeight, 8);
    const up = sample({ ...settings, phase: 75 }, 15000, true);
    expect(up.markerY).toBeCloseTo(downHeight, 8);
    expect(up.bottom).toBeCloseTo(-0.25, 8);
    expect(up.handY - up.markerY).toBeCloseTo(0.036, 8);
    expect(new THREE.Vector3(0, 1, 0).applyQuaternion(up.arrow.quaternion).y).toBeCloseTo(1, 8);
    expect(up.chest).toBe(down.chest);
    for (const phase of [0, 50, 100]) expect(sample({ ...settings, phase }).arrow.visible).toBe(false);
  });
  it('clamps saved phase values and preserves reduced-motion behavior', () => {
    const sample = model();
    const released = sample({ motion: 'release' }).markerY;
    for (const phase of [NaN, Infinity, -20, 120]) {
      expect(sample({ motion: 'inspect', phase }, 9000).markerY).toBeCloseTo(released, 8);
    }
    const peak = sample({ motion: 'inspect', phase: 50 }).markerY;
    expect(peak).toBeLessThan(released);
    expect(sample({ motion: 'cycle' }, 150, true).arrow.visible).toBe(false);
    expect(sample({ motion: 'cycle' }, 150, true).markerY).toBeCloseTo(released, 8);
  });
});

describe('3D compression explorer — controls and fallback', () => {
  it('offers child choices across placement and depth, preserving the learner comparison', () => {
    mount({ b3dAge: 'child' }); click('Try full recoil vs leaning');
    predict('peak', 'same'); predict('release', 'b'); click('Check predictions');
    const inquiry = state.b3dDepthInquiry, lab = state.b3dDepthLab, reference = state.b3dDepthReference;
    const choose = value => act(() => host.querySelector('input[name="fr-child-hands"][value="' + value + '"]').click());
    choose('two');
    expect(state.b3dChildHands).toBe('two');
    expect(host.querySelector('.fr-child-hand-reading').textContent).toContain('Two stacked hands');
    expect(state.b3dDepthLab).toBe(lab); expect(state.b3dDepthReference).toBe(reference); expect(state.b3dDepthInquiry).toBe(inquiry);
    act(() => patch({ b3dTab: 'place' }));
    expect(host.querySelector('input[value="two"]').checked).toBe(true);
    expect(host.querySelector('.fr-child-hand-reading').textContent).toContain('Locate the centre');
    click('Centre of the chest');
    expect(host.querySelector('.fr-child-hand-reading').textContent).toContain('Two stacked hands');
    expect(host.querySelector('.fr-placement-demo-note').textContent).toContain('hand arrangement');
    choose('one'); act(() => patch({ b3dTab: 'depth' }));
    expect(host.querySelector('input[name="fr-child-hands"][value="one"]').checked).toBe(true);
    expect(state.b3dDepthInquiry).toBe(inquiry);
  });
  it('limits the selector to children and disables it while rescuer hands are hidden', () => {
    mount({ b3dAge: 'child', b3dChildHands: 'invalid' });
    expect(host.querySelector('input[name="fr-child-hands"][value="one"]').checked).toBe(true);
    const showHands = [...host.querySelectorAll('.fr-depth-switch')].find(el => el.textContent === 'Show rescuer hands and arms').querySelector('input');
    act(() => showHands.click()); expect(host.querySelector('.fr-child-hands').disabled).toBe(true);
    expect(host.querySelector('.fr-child-hand-reading').textContent).toContain('Turn on rescuer hands');
    for (const b3dAge of ['adult', 'infant']) {
      act(() => patch({ b3dAge, b3dChildHands: 'two' }));
      expect(host.querySelector('.fr-child-hands')).toBeNull();
    }
    act(() => patch({ b3dAge: 'child' }));
    expect(host.querySelector('input[name="fr-child-hands"][value="two"]').checked).toBe(true);
  });
  it('explains peak depth versus movement and compares A/B travel without WebGL', () => {
    mount({ b3dDepthLab: { age: 'adult', depth: 5.5, lean: 1, measure: true },
      b3dDepthReference: { age: 'adult', depth: 5.5, lean: 0 } });
    expect(host.querySelector('.fr-depth-measure-equation').textContent).toBe('5.5 cm − 1.0 cm = 4.5 cm of movement.');
    expect(host.querySelector('.fr-depth-measure-comparison').textContent).toContain('saved A 5.5 cm; current B 4.5 cm');
    expect(host.querySelector('.fr-depth-measurement').textContent).toContain('next push starts below rest');
    expect(host.querySelector('.fr-depth-measurement').textContent).toContain('do not measure force');
    click('Reset model settings');
    expect(host.querySelector('.fr-depth-measure-equation').textContent).toBe('5.5 cm − 0.0 cm = 5.5 cm of movement.');
    expect(host.querySelector('.fr-depth-measurement').textContent).toContain('movement and peak depth match');
  });
  it('preserves inspection preferences and predictions while toggling visual aids', () => {
    mount(); click('Try full recoil vs leaning');
    predict('peak', 'same'); predict('release', 'b'); click('Check predictions');
    const inquiry = state.b3dDepthInquiry;
    const checkbox = text => [...host.querySelectorAll('.fr-depth-switch')].find(el => el.textContent === text).querySelector('input');
    act(() => checkbox('Show rescuer hands and arms').click());
    act(() => checkbox('Measure movement between release and peak').click());
    expect(state.b3dDepthLab).toMatchObject({ hands: false, measure: true });
    expect(state.b3dDepthInquiry).toBe(inquiry);
    act(() => checkbox('Measure movement between release and peak').click());
    expect(host.querySelector('.fr-depth-measurement')).toBeNull();
    act(() => checkbox('Measure movement between release and peak').click());
    click('Try a shallow example');
    expect(state.b3dDepthLab).toMatchObject({ hands: false, measure: true });
    act(() => patch({ b3dTab: 'place' })); act(() => patch({ b3dTab: 'depth' }));
    expect(checkbox('Show rescuer hands and arms').checked).toBe(false);
    expect(checkbox('Measure movement between release and peak').checked).toBe(true);
  });
  it('checks predictions against both positions, supports revision, and inspects the graph evidence', () => {
    mount(); expect(host.querySelector('.fr-depth-inquiry')).toBeNull();
    click('Try full recoil vs leaning');
    const check = () => [...host.querySelectorAll('button')].find(el => el.textContent === 'Check predictions');
    expect(check().disabled).toBe(true);
    predict('peak', 'same'); expect(check().disabled).toBe(true);
    predict('release', 'b'); expect(check().disabled).toBe(false);
    click('Check predictions');
    expect(host.querySelector('.fr-depth-prediction-result').textContent).toContain('2 of 2');
    expect(host.querySelector('.fr-depth-takeaway').textContent).toContain('peak alone');
    click('View peak evidence');
    expect(state.b3dDepthLab).toMatchObject({ motion: 'inspect', phase: 50 });
    expect(Number(host.querySelector('.fr-depth-saved-cursor').getAttribute('y')) + 5)
      .toBeCloseTo(Number(host.querySelector('.fr-depth-cursor circle').getAttribute('cy')), 8);
    click('View release evidence');
    expect(state.b3dDepthLab.phase).toBe(100);
    expect(host.querySelector('.fr-depth-evidence-progress').textContent).toContain('Both positions inspected');
    predict('release', 'same');
    expect(host.querySelector('.fr-depth-prediction-result').textContent).toBe('');
    expect(host.querySelector('.fr-depth-evidence')).toBeNull();
    click('Check predictions');
    expect(host.querySelector('.fr-depth-prediction-result').textContent).toContain('1 of 2');
  });
  it.each([
    [6, 1, 5, 0, 'a', 'a'],
    [4, 0, 5, 1, 'b', 'b'],
    [5, 0.5, 5, 0.5, 'same', 'same'],
    [4, 1, 6, 0, 'b', 'a'],
  ])('evaluates arbitrary model settings: A %s/%s, B %s/%s', (aDepth, aLean, bDepth, bLean, peak, release) => {
    mount({ b3dDepthReference: { age: 'adult', depth: aDepth, lean: aLean },
      b3dDepthLab: { age: 'adult', depth: bDepth, lean: bLean } });
    predict('peak', peak); predict('release', release); click('Check predictions');
    expect(host.querySelector('.fr-depth-prediction-result').textContent).toContain('2 of 2');
  });
  it('preserves reflection during inspection and clears it when comparison conditions change', () => {
    mount(); click('Try full recoil vs leaning');
    predict('peak', 'same'); predict('release', 'b'); click('Check predictions');
    act(() => patch({ b3dDepthInquiry: { ...state.b3dDepthInquiry, explanation: 'Equal peak, different release.' } }));
    const original = state.b3dDepthInquiry;
    act(() => patch({ b3dDepthLab: { ...state.b3dDepthLab, rate: 120, anatomy: true } }));
    click('25%Pressing down');
    expect(state.b3dDepthInquiry).toBe(original);
    expect(host.querySelector('#fr-depth-explanation').value).toBe('Equal peak, different release.');
    act(() => patch({ b3dTab: 'place' })); act(() => patch({ b3dTab: 'depth' }));
    expect(host.querySelector('#fr-depth-explanation').value).toBe('Equal peak, different release.');
    click('Replace A with current settings'); expect(state.b3dDepthInquiry).toBeNull();
    expect(host.querySelectorAll('.fr-depth-inquiry input:checked')).toHaveLength(0);
    predict('peak', 'same'); predict('release', 'same'); click('Check predictions');
    click('Try a shallow example'); expect(state.b3dDepthInquiry).toBeNull();
    predict('peak', 'a'); predict('release', 'a'); click('Check predictions');
    const infant = [...host.querySelectorAll('button')].find(el => /^Infant —/.test(el.getAttribute('aria-label')));
    expect(infant).toBeTruthy();
    act(() => infant.click()); expect(state.b3dDepthInquiry).toBeNull();
    expect(host.querySelector('.fr-depth-inquiry')).toBeNull();
  });
  it('rejects stale or malformed prediction records and bounds saved reflection text', () => {
    const base = { b3dDepthReference: { age: 'adult', depth: 5.5, lean: 0 } };
    mount({ ...base, b3dDepthInquiry: { signature: 'stale', peak: 'same', release: 'same', reviewed: true } });
    expect(host.querySelectorAll('.fr-depth-inquiry input:checked')).toHaveLength(0);
    expect(host.querySelector('.fr-depth-prediction-result').textContent).toBe('');
    const signature = JSON.stringify(['adult', 5.5, 0, 5.5, 0]);
    act(() => patch({ b3dDepthInquiry: { signature, peak: 'invalid', release: 'same', reviewed: true } }));
    expect(host.querySelector('.fr-depth-prediction-result').textContent).toBe('');
    act(() => patch({ b3dDepthInquiry: { signature, peak: 'same', release: 'same', reviewed: true, explanation: 'x'.repeat(500) } }));
    expect(host.querySelector('#fr-depth-explanation').value).toHaveLength(400);
  });
  it('saves an independent A, compares peak and release, and clears A without resetting B', () => {
    mount(); click('Save current settings as A');
    expect(state.b3dDepthReference).toEqual({ age: 'adult', depth: 5.5, lean: 0 });
    click('Try a leaning example'); click('Inspect release');
    expect(state.b3dDepthReference.lean).toBe(0);
    expect(host.querySelector('.fr-depth-comparison-reading').textContent).toContain('A is 0.0 cm depressed; B is 1.0 cm');
    expect(host.querySelector('.fr-depth-key').textContent).toContain('Saved A');
    click('Inspect peak');
    const square = host.querySelector('.fr-depth-saved-cursor');
    const circle = host.querySelector('.fr-depth-cursor circle');
    expect(Number(square.getAttribute('y')) + 5).toBeCloseTo(Number(circle.getAttribute('cy')), 8);
    expect(host.querySelector('.fr-depth-comparison-reading').textContent).toContain('A is 5.5 cm depressed; B is 5.5 cm');
    const before = { ...state.b3dDepthLab };
    click('Clear saved A');
    expect(state.b3dDepthReference).toBeNull(); expect(state.b3dDepthLab).toEqual(before);
    expect(host.querySelector('.fr-depth-saved-cursor')).toBeNull();
    expect(host.querySelector('.fr-depth-key').textContent).toContain('Reference with full recoil');
  });
  it('keeps the 3D marker key aligned with measurement and saved comparison controls', () => {
    mount();
    const key = () => host.querySelector('.fr-model-key');
    expect(key().textContent).toContain('Resting height');
    expect(key().textContent).toContain('Reference depth');
    expect(key().textContent).toContain('Current chest height');
    expect(key().querySelector('[data-marker="saved"]')).toBeNull();
    expect(key().querySelector('[data-marker="travel"]')).toBeNull();
    const ruler = [...host.querySelectorAll('.fr-depth-switch')].find(el => el.textContent.includes('Measure movement'));
    expect(ruler).toBeTruthy(); act(() => ruler.querySelector('input').click());
    expect(key().querySelector('[data-marker="travel"]').textContent).toBe('Movement per push');
    click('Save current settings as A');
    expect(key().querySelector('[data-marker="saved"]').textContent).toBe('Saved A height');
    expect(key().querySelector('[data-marker="current"]').textContent).toBe('Current B height');
    const before = { ...state.b3dDepthLab };
    click('Clear saved A');
    expect(key().querySelector('[data-marker="saved"]')).toBeNull();
    expect(state.b3dDepthLab).toEqual(before);
    act(() => ruler.querySelector('input').click());
    expect(key().querySelector('[data-marker="travel"]')).toBeNull();
  });
  it('uses distinct marker shapes and age-scoped saved labels without adding interactive controls', () => {
    mount({ b3dDepthReference: { age: 'adult', depth: 5.5, lean: 0 } });
    const key = () => host.querySelector('.fr-model-key');
    expect(key().querySelector('[data-marker="current"] circle')).toBeTruthy();
    expect(key().querySelector('[data-marker="saved"] rect')).toBeTruthy();
    expect(key().querySelectorAll('svg[aria-hidden="true"][focusable="false"]')).toHaveLength(5);
    expect(key().querySelectorAll('button,input,[tabindex]')).toHaveLength(0);
    act(() => patch({ b3dAge: 'infant' }));
    expect(key().querySelector('[data-marker="saved"]')).toBeNull();
    expect(key().textContent).toContain('Current chest height');
    act(() => patch({ b3dAge: 'adult' }));
    expect(key().textContent).toContain('Saved A height');
    act(() => patch({ b3dTab: 'place' }));
    expect(key()).toBeNull();
  });
  it('starts a controlled recoil comparison, replaces A explicitly, and scopes it to age', () => {
    mount({ b3dDepthLab: { age: 'adult', depth: 6, lean: 0.5, rate: 120, anatomy: true } });
    click('Try full recoil vs leaning');
    expect(state.b3dDepthReference).toEqual({ age: 'adult', depth: 6, lean: 0 });
    expect(state.b3dDepthLab).toMatchObject({ depth: 6, lean: 1, rate: 120, anatomy: true, motion: 'inspect', phase: 100 });
    click('Replace A with current settings');
    expect(state.b3dDepthReference).toEqual({ age: 'adult', depth: 6, lean: 1 });
    act(() => patch({ b3dAge: 'infant' }));
    expect(host.querySelector('.fr-depth-compare').textContent).toContain('No A is saved for this age');
    expect(host.querySelector('.fr-depth-saved-cursor')).toBeNull();
    act(() => patch({ b3dAge: 'adult' }));
    expect(host.querySelector('.fr-depth-compare').textContent).toContain('A saved');
  });
  it('links the five inspection stages, graph marker, and explanations without WebGL', () => {
    mount();
    click('25%Pressing down');
    expect(state.b3dDepthLab).toMatchObject({ motion: 'inspect', phase: 25 });
    expect(host.querySelector('#fr-depth-phase').value).toBe('25');
    expect(host.querySelector('.fr-depth-inspection-note').textContent).toContain('2.8 cm');
    expect(Number(host.querySelector('.fr-depth-cursor circle').getAttribute('cx'))).toBeCloseTo(120);
    click('75%Releasing');
    expect(host.querySelector('.fr-depth-inspection-note').textContent).toContain('2.8 cm');
    expect(host.querySelector('.fr-depth-inspection-note').textContent).toContain('same height');
    expect(Number(host.querySelector('.fr-depth-cursor circle').getAttribute('cx'))).toBeCloseTo(310);
    click('Animate cycle');
    expect(host.querySelector('.fr-depth-cursor')).toBeNull();
    expect(host.querySelector('.fr-depth-inspection-note').textContent).toContain('Animation selected');
    click('50%Deepest point');
    expect(host.querySelector('.fr-depth-inspection-note').textContent).toContain('5.5 cm');
    expect(host.querySelector('#fr-depth-phase').value).toBe('50');
  });
  it('carries inspection into settings changes and navigation, while age changes reset it', () => {
    mount(); click('75%Releasing');
    act(() => patch({ b3dTab: 'place' }));
    act(() => patch({ b3dTab: 'depth' }));
    expect(host.querySelector('#fr-depth-phase').value).toBe('75');
    click('Try a leaning example'); click('100%Between pushes');
    expect(host.querySelector('.fr-depth-inspection-note').textContent).toContain('1.0 cm');
    expect(host.querySelector('.fr-depth-inspection-note').textContent).toContain('did not guarantee full recoil');
    act(() => patch({ b3dAge: 'infant' }));
    expect(host.querySelector('#fr-depth-phase').value).toBe('100');
    expect(host.querySelector('.fr-depth-inspection-note').textContent).toContain('0.0 cm');
    click('50%Deepest point');
    expect(host.querySelector('.fr-depth-inspection-note').textContent).toContain('4.0 cm');
  });
  it('keeps a useful complete explorer when WebGL is unavailable', () => {
    mount();
    expect(host.textContent).toContain('3D view unavailable');
    expect(host.querySelectorAll('.fr-depth-controls input[type="range"]')).toHaveLength(3);
    expect(host.querySelector('.fr-depth-profile').textContent).toContain('0.0 cm');
    click('Show compression'); expect(state.b3dDepthLab.motion).toBe('press');
    click('Animate cycle'); expect(state.b3dDepthLab.motion).toBe('cycle');
    click('Show release'); expect(state.b3dDepthLab.motion).toBe('release');
  });
  it('switches examples, retains peak depth for leaning, and resets settings', () => {
    mount(); click('Try a leaning example');
    expect(state.b3dDepthLab).toMatchObject({ depth: 5.5, lean: 1, motion: 'release' });
    expect(host.querySelector('.fr-depth-readout').textContent).toContain('leaning keeps the chest');
    click('Try a shallow example'); expect(state.b3dDepthLab.depth).toBe(2.5);
    expect(host.querySelector('.fr-depth-readout').textContent).toContain('below the adult');
    click('Reset model settings'); expect(state.b3dDepthLab).toMatchObject({ depth: 5.5, lean: 0, rate: 110 });
  });
  it('adapts the reference to age without carrying adult centimetres into the infant', () => {
    mount(); click('Try a leaning example');
    act(() => patch({ b3dAge: 'infant' }));
    expect(host.querySelector('#fr-depth-depth').value).toBe('4');
    expect(host.querySelector('#fr-depth-depth').max).toBe('5.5');
    click('Reset model settings'); expect(state.b3dDepthLab).toMatchObject({ age: 'infant', reference: 4, depth: 4, lean: 0 });
    expect(host.querySelector('.fr-depth-readout').textContent).toContain('one-third');
    expect(host.querySelector('.fr-depth-readout').textContent).not.toContain('adult 5');
  });
  it('preserves settings across tab navigation and keeps other activities available', () => {
    mount(); click('Try a leaning example');
    act(() => patch({ b3dTab: 'place' })); expect(host.querySelector('.fr-depth-lab')).toBeNull();
    act(() => patch({ b3dTab: 'depth' })); expect(host.querySelector('#fr-depth-lean').value).toBe('1');
    act(() => patch({ view: 'firstAction' })); expect(host.textContent).toContain('Find the clue.');
  });
  it('keeps both copies and the new English strings aligned', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_firstresponse.js', 'utf8')).toBe(source);
    const delta = { ...JSON.parse(readFileSync('reports/firstresponse-3d-explorer/ui-strings.delta.json', 'utf8')),
      ...JSON.parse(readFileSync('reports/firstresponse-cycle-inspector/ui-strings.delta.json', 'utf8')),
      ...JSON.parse(readFileSync('reports/firstresponse-depth-comparison/ui-strings.delta.json', 'utf8')),
      ...JSON.parse(readFileSync('reports/firstresponse-prediction-activity/ui-strings.delta.json', 'utf8')),
      ...JSON.parse(readFileSync('reports/firstresponse-chest-inspection/ui-strings.delta.json', 'utf8')),
      ...JSON.parse(readFileSync('reports/firstresponse-child-hands/ui-strings.delta.json', 'utf8')),
      ...JSON.parse(readFileSync('reports/firstresponse-visual-markers/ui-strings.delta.json', 'utf8')),
      ...JSON.parse(readFileSync('reports/firstresponse-manikin-realism/ui-strings.delta.json', 'utf8')),
      ...JSON.parse(readFileSync('reports/firstresponse-recovery-review/ui-strings.delta.json', 'utf8')) };
    for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
      const catalog = JSON.parse(readFileSync(file, 'utf8')).stem.firstresponse;
      for (const [key, value] of Object.entries(delta)) expect(catalog[key], key).toBe(value);
    }
    expect(source).not.toContain('depthT(');
  });
});
