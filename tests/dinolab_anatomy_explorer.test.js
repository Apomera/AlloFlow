// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// DINOLAB_TEST_SOURCE supports reviewable drafts without changing production.
// After integration this file can run unchanged in the repository's tests/.
const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const ReactDOMServer = require(resolve('desktop/web-app/node_modules/react-dom/server'));
const THREE = require(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINOLAB_TEST_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8').replace(/\r\n/g, '\n');
if (!source.includes('DINO_ANATOMY_EXPLORER_V2') || !source.includes('DINO_DETAILED_LANDMARKS_V2')) throw Error('Anatomy explorer and landmark draft required');
const marker = "window.StemLab.registerTool('dinoLab'";
const registration = {};
window.StemLab = { ensureThree: () => new Promise(() => {}), registerTool(id, config) { registration.id = id; registration.config = config; } };
new Function(source.replace(marker,
  'globalThis.__anatomyExplorerContract = { DINOS, DINO_ANATOMY_SOURCES, DINO_ANATOMY_GUIDES, dinoBodyPartDefinitions, dinoDetailedBodyPartDefinitions, dinoAnatomyQuizDeck, skeletalAnatomyProfileFor, reconstructionHypothesesFor, resetFieldStationForTest: function () { DinoFieldStation3DStable = null; } }; ' + marker))();
const art = globalThis.__anatomyExplorerContract;
delete globalThis.__anatomyExplorerContract;
function block(start, end) {
  const begin = source.indexOf(start), finish = source.indexOf(end, begin);
  if (begin < 0 || finish <= begin) throw Error('Test capture anchor missing: ' + start);
  return source.slice(begin, finish);
}
function definitions(id, mode = 'evidence') {
  const dn = art.DINOS.find(item => item.id === id), profile = art.skeletalAnatomyProfileFor(dn);
  return art.dinoDetailedBodyPartDefinitions(dn, profile.weightBearingForelimbs, art.reconstructionHypothesesFor(dn, profile, mode).active);
}
function render(id = 'archaeopteryx', selected = '', layers = {}, mode = 'evidence') {
  // The production component identity stays stable across renders. Reset only
  // the read-only evaluation's cache so each SSR scenario receives its own hooks.
  art.resetFieldStationForTest();
  const renderReact = Object.assign({}, React, {
    useState(initial) {
      if (initial && typeof initial === 'object' && initial.speciesId === id && Object.keys(initial).length === 2 && initial.id === '') {
        return React.useState({ speciesId: id, id: selected });
      }
      return React.useState(initial);
    }
  });
  const data = Object.assign({ tab: 'field3d', selected: id, field3dSelected: id, field3dLabelMode: 'anatomy',
    field3dShowSkeleton: true, field3dShowBody: true, field3dShowHuman: false, field3dShowEvidence: false,
    field3dReconstructionMode: mode, field3dAutoRotate: false }, layers);
  const html = ReactDOMServer.renderToStaticMarkup(registration.config.render({ React: renderReact, toolData: { dinoLab: data }, update() {}, updateMulti() {}, announceToSR() {} }));
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('Dino Lab anatomy explorer contract', () => {
  it('provides complete, uniquely identified descriptions with valid references for every catalog reconstruction', () => {
    let largest = 0, inspected = 0;
    const problems = [];
    for (const dn of art.DINOS) {
      const profile = art.skeletalAnatomyProfileFor(dn);
      for (const mode of ['evidence', 'conservative', 'classic', 'avian']) {
        const hypothesis = art.reconstructionHypothesesFor(dn, profile, mode).active;
        const parts = art.dinoDetailedBodyPartDefinitions(dn, profile.weightBearingForelimbs, hypothesis);
        if (new Set(parts.map(part => part.id)).size !== parts.length) problems.push(dn.id + ':' + mode + ': duplicate identifiers');
        if (parts.length < 10) problems.push(dn.id + ':' + mode + ': fewer than ten base parts');
        largest = Math.max(largest, parts.length);
        for (const part of parts) {
          inspected++;
          for (const key of ['id', 'label', 'purpose', 'look', 'detail', 'characteristics', 'evidence', 'section', 'source']) {
            if (typeof part[key] !== 'string' || !part[key].trim()) problems.push(dn.id + ':' + mode + ':' + part.id + ': missing ' + key);
          }
          if (!['head', 'body', 'tail', 'full'].includes(part.region)) problems.push(dn.id + ':' + part.id + ': invalid region');
          if (!['both', 'skeleton', 'surface'].includes(part.layer)) problems.push(dn.id + ':' + part.id + ': invalid layer');
          const reference = art.DINO_ANATOMY_SOURCES[part.source];
          if (!reference || !reference.title || !/^https:\/\//.test(reference.url)) problems.push(dn.id + ':' + part.id + ': missing/invalid source');
        }
      }
    }
    expect(problems).toEqual([]); expect(inspected).toBeGreaterThan(30000);
    expect(largest).toBeGreaterThan(30);
  });

  it('uses native buttons for every applicable model label and directory entry with valid controlled regions', () => {
    const doc = render(), parts = definitions('archaeopteryx');
    expect(doc.querySelectorAll('[data-dino-part-label]')).toHaveLength(parts.length);
    expect(doc.querySelectorAll('[data-dino-part-choice]')).toHaveLength(parts.length);
    const overlay = doc.querySelector('.dinolab-body-label-overlay');
    expect(overlay.getAttribute('role')).toBe('group');
    expect(overlay.getAttribute('aria-label')).toBe('Model body-part labels');
    expect(overlay.hasAttribute('aria-hidden')).toBe(false);
    for (const node of doc.querySelectorAll('[data-dino-part-label], [data-dino-part-choice]')) {
      expect(node.tagName).toBe('BUTTON'); expect(node.getAttribute('type')).toBe('button');
      expect(node.getAttribute('aria-label').length).toBeGreaterThan(5);
      expect(node.getAttribute('aria-pressed')).toBe('false');
      expect(doc.querySelectorAll('#' + node.getAttribute('aria-controls'))).toHaveLength(1);
      expect(parseInt(node.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
    }
    expect(doc.querySelectorAll('#dinolab-anatomy-browser')).toHaveLength(1);
  });

  it('gives the selected guide one focusable, accessible ID and exposes all four description fields', () => {
    const doc = render('archaeopteryx', 'wing'), guide = doc.getElementById('dinolab-selected-part-guide');
    expect(guide).not.toBeNull(); expect(doc.querySelectorAll('#dinolab-selected-part-guide')).toHaveLength(1);
    expect(guide.tagName).toBe('SECTION'); expect(guide.getAttribute('role')).toBe('region');
    expect(guide.getAttribute('aria-label')).toContain('anatomy description'); expect(guide.getAttribute('tabindex')).toBe('-1');
    expect(Array.from(guide.querySelectorAll('dt')).map(node => node.textContent)).toEqual(['What it does', 'Characteristics', 'Look for', 'Fossils and inference']);
    expect(guide.querySelectorAll('dd')).toHaveLength(4);
    expect(doc.querySelector('[data-dino-part-label="wing"]').getAttribute('aria-pressed')).toBe('true');
    expect(doc.querySelector('[data-dino-part-choice="wing"]').getAttribute('aria-pressed')).toBe('true');
    const link = guide.querySelector('a');
    expect(link.getAttribute('target')).toBe('_blank'); expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.getAttribute('aria-label')).toContain('opens in a new tab');
  });

  it('explains the selected part\'s hidden layer and omits the hint when that layer is visible', () => {
    expect(render('archaeopteryx', 'skull', { field3dShowSkeleton: false }).querySelector('.dinolab-part-layer-help').textContent).toContain('fossil layer');
    expect(render('archaeopteryx', 'wing', { field3dShowBody: false }).querySelector('.dinolab-part-layer-help').textContent).toContain('life surface');
    expect(render('archaeopteryx', 'wing').querySelector('.dinolab-part-layer-help')).toBeNull();
  });

  it('identifies internal tissues as inferred proxies and offers an opacity reveal when the life surface hides them', () => {
    const parts = definitions('archaeopteryx');
    for (const id of ['lungs', 'airsacs', 'muscles']) {
      const part = parts.find(item => item.id === id);
      expect(part, id).toBeDefined();
      expect(part.inferredProxy, id).toBe(true);
      expect(part.requiresTranslucentBody, id).toBe(true);
      const opaqueGuide = render('archaeopteryx', id, { field3dBodyOpacity: 100 }).getElementById('dinolab-selected-part-guide');
      expect(opaqueGuide.querySelector('.dinolab-part-layer-help').textContent).toContain('inferred tissue shapes');
      expect(Array.from(opaqueGuide.querySelectorAll('button')).some(node => node.textContent === 'Reveal inferred tissues')).toBe(true);
      const revealedGuide = render('archaeopteryx', id, { field3dBodyOpacity: 45 }).getElementById('dinolab-selected-part-guide');
      expect(revealedGuide.querySelector('.dinolab-part-layer-help')).toBeNull();
      expect(Array.from(revealedGuide.querySelectorAll('button')).some(node => node.textContent === 'Reveal inferred tissues')).toBe(false);
    }
  });

  it('resets stale feature selection and framing when the active covering removes that feature', () => {
    expect(definitions('archaeopteryx').some(part => part.id === 'wing')).toBe(true);
    const parts = definitions('archaeopteryx', 'classic'); expect(parts.some(part => part.id === 'wing')).toBe(false);
    const effectSource = block('        selectedBodyPartRef.current = selectedBodyPart ? selectedBodyPart.id', '        var quizState');
    const selection = vi.fn(), preset = vi.fn(), study = vi.fn(), camera = vi.fn();
    const refs = { selected: { current: 'wing' }, yaw: { current: { study: 'body' } }, camera: { current: camera } };
    const run = new Function('React', 'selectedBodyPart', 'selectedBodyPartId', 'selectedBodyPartRef', 'props', 'setBodyPartSelection', 'setCameraPreset', 'yawRef', 'setStudyView', 'cameraControlRef', effectSource);
    run({ useEffect(effect) { effect(); } }, undefined, 'wing', refs.selected, { species: { id: 'archaeopteryx' }, reconstructionMode: 'classic' }, selection, preset, refs.yaw, study, refs.camera);
    expect(refs.selected.current).toBe(''); expect(selection).toHaveBeenCalledWith({ speciesId: 'archaeopteryx', id: '' });
    expect(preset).toHaveBeenCalledWith(null); expect(refs.yaw.current.study).toBe('full');
    expect(study).toHaveBeenCalledWith({ speciesId: 'archaeopteryx', region: 'full' });
    expect(camera.mock.calls[0].at(-1)).toBe('full');
    const doc = render('archaeopteryx', 'wing', {}, 'classic');
    expect(doc.querySelector('#dinolab-selected-part-guide')).toBeNull();
    expect(doc.querySelectorAll('[data-dino-part-choice][aria-pressed="true"]')).toHaveLength(0);
  });

  it('selects a part, focuses its guide on request, and safely clears the selection', () => {
    const selectionSource = block('        function selectBodyPart(id, focusGuide) {', '        function applyStudyView(');
    const selection = vi.fn(), preset = vi.fn(), study = vi.fn(), camera = vi.fn(), interaction = vi.fn();
    const controls = { open: false }, closest = vi.fn(() => controls);
    const focus = vi.fn(() => expect(controls.open).toBe(true)), scroll = vi.fn(), selectedRef = { current: '' }, yaw = { current: { study: 'full' } };
    // A new selection must discard the frame saved for a different landmark.
    const inspectionFrame = { current: { part: 'head', study: 'head' } };
    const endTrace = vi.fn();
    const make = new Function('bodyPartDefinitions', 'selectedBodyPartRef', 'setBodyPartSelection', 'props', 'notifyOrientationInteraction', 'setCameraPreset', 'yawRef', 'setStudyView', 'cameraControlRef', 'anatomyGuideRef', 'window', 'partInspectionFrameRef', 'endSupportingRelation', selectionSource + '\nreturn selectBodyPart;');
    const choose = make(definitions('archaeopteryx'), selectedRef, selection, { species: { id: 'archaeopteryx' } }, interaction, preset, yaw, study, { current: camera }, { current: { closest, focus, scrollIntoView: scroll } }, { requestAnimationFrame(callback) { callback(); } }, inspectionFrame, endTrace);
    choose('wing', true); expect(selectedRef.current).toBe('wing'); expect(interaction).toHaveBeenCalledOnce();
    expect(inspectionFrame.current).toBeNull();
    expect(endTrace).toHaveBeenCalledWith(false);
    expect(closest).toHaveBeenCalledWith('details.dinolab-3d-controls-disclosure'); expect(controls.open).toBe(true);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true }); expect(scroll).toHaveBeenCalledWith({ block: 'nearest' });
    expect(camera.mock.calls[0].at(-1)).toBe('body');
    inspectionFrame.current = { part: 'wing', study: 'body' };
    choose('', false); expect(selectedRef.current).toBe(''); expect(camera.mock.calls.at(-1).at(-1)).toBe('full');
    expect(inspectionFrame.current).toBeNull();
    expect(yaw.current.study).toBe('full'); expect(preset.mock.calls.at(-1)).toEqual([null]);
  });

  it('retains the original ten-part quiz pool and five-clue decks despite the expanded explorer', () => {
    expect(Object.keys(art.DINO_ANATOMY_GUIDES)).toHaveLength(10);
    for (const quadruped of [false, true]) {
      const old = art.dinoBodyPartDefinitions(quadruped), ids = new Set(old.map(part => part.id));
      expect(old).toHaveLength(10);
      for (const seed of [1, 17, 912]) {
        const deck = art.dinoAnatomyQuizDeck(quadruped, seed); expect(deck).toHaveLength(5);
        for (const question of deck) {
          expect(ids.has(question.partId)).toBe(true); expect(question.choices.every(id => ids.has(id))).toBe(true);
        }
      }
    }
  });
});

// 79e3e5eae appended surface-normal blends (neck, limbs, tail) and beak closure after the
// landmarks; they shade geometry and add no landmarks, so the landmark slice stops before them.
const landmarkSource = block('            // DINO_DETAILED_LANDMARKS_V2', '            // Soften only the rear cranial join');
const anchorSource = block('            function addBodyPartAnchor(', '            function addTextLabel(');
// Capture generic landmark bounds through their public metadata materialization.
// Subsequent species-specific focus caches have separate native geometry tests.
const boundsStart = source.indexOf('            var bodyPartStudyBounds = {};');
const boundsMetadata = source.indexOf('            model.userData.anatomyPartBounds = {};', boundsStart);
const boundsEnd = source.indexOf('            });', boundsMetadata);
if (boundsStart < 0 || boundsMetadata <= boundsStart || boundsEnd <= boundsMetadata) throw Error('Generic landmark bounds capture missing');
const boundsSource = source.slice(boundsStart, boundsEnd + '            });'.length);
const sceneNames = ['THREE','model','bodyPartDefinitions','bodyPartAnchors','bodyShell','headShell','lowerJawShell','idleMotion','head','hip','tail','shoulder','bodyCenter','surfaceSnout','surfaceHeadDepth','surfaceHeadHeight','surfaceHeadLength','surfaceBodyHeight','surfaceBodyDepth','eyeCenterX','ht','len','bodyDepth','bodyHeight'];
const buildLandmarks = new Function(...sceneNames, 'function vec(x,y,z){return new THREE.Vector3(x,y,z);}\n' + anchorSource + landmarkSource + '\nreturn anatomyMeshParts;');
const buildBounds = new Function('THREE','model','bodyPartDefinitions','bodyPartAnchors','anatomyMeshParts','studyBounds','ht','len','dn','dromaeosaurHeadFocus','sauropodHeadFocus',boundsSource + '\nreturn bodyPartStudyBounds;');
function sceneFixture() {
  const model = new THREE.Group(); model.position.set(.4,.2,-.3); model.rotation.y=.31;
  function mesh(name, position, feature) {
    const part = new THREE.Mesh(new THREE.BoxGeometry(.3,.24,.12)); part.name=name; part.position.copy(position);
    if(feature) part.userData.dinoFeature=feature; model.add(part); return part;
  }
  const head=new THREE.Vector3(-1,1,0), hip=new THREE.Vector3(.5,.7,0), tail=new THREE.Vector3(1.8,.55,0), shoulder=new THREE.Vector3(-.4,.8,0), bodyCenter=new THREE.Vector3(0,.75,0);
  const bodyShell=mesh('torso',bodyCenter),headShell=mesh('head',head),lowerJawShell=mesh('jaw',head.clone().add(new THREE.Vector3(0,-.1,0)));
  const neck=mesh('neck',head.clone().lerp(shoulder,.5)), tailMesh=mesh('tail',hip.clone().lerp(tail,.5)), limb=mesh('arm',shoulder.clone().add(new THREE.Vector3(0,-.2,.2)));
  limb.userData.dinoPartIds=['forelimb','elbow','wrist'];
  for(let i=0;i<120;i++) { const vane=mesh('vane-'+i,new THREE.Vector3(.1+i*.007,.7,i%2?.25:-.25),'feather'); vane.userData.featherTract='forewing'; }
  const parts=definitions('archaeopteryx'), anchors=[];
  model.updateMatrixWorld(true);
  const attachAnchor = new Function('THREE','model','bodyPartAnchors',anchorSource+'\nreturn addBodyPartAnchor;')(THREE,model,anchors);
  for(const part of art.dinoBodyPartDefinitions(false)) attachAnchor(part.id,part.id==='head'?head:part.id==='tail'?tail:bodyCenter,part.id==='head'?headShell:bodyShell);
  attachAnchor('elbow',limb.position.clone(),limb); attachAnchor('wrist',limb.position.clone().add(new THREE.Vector3(-.1,-.12,0)),limb);
  const values=[THREE,model,parts,anchors,bodyShell,headShell,lowerJawShell,{neck,tail:tailMesh},head,hip,tail,shoulder,bodyCenter,head.clone().add(new THREE.Vector3(-.3,0,0)),.12,.18,.3,.24,.2,-1.06,1,3,.2,.24];
  const meshParts=buildLandmarks(...values);
  model.updateMatrixWorld(true);
  const full=new THREE.Box3().setFromObject(model), seed=new THREE.Box3(new THREE.Vector3(-.4,.4,-.3),new THREE.Vector3(.6,1,.3));
  const study={full,head:seed.clone(),body:seed.clone(),tail:seed.clone()};
  const bounds=buildBounds(THREE,model,parts,anchors,meshParts,study,1,3,art.DINOS.find(dn=>dn.id==='archaeopteryx'),null,null);
  return {model,parts,anchors,meshParts,bounds,headShell,limb};
}

describe('Dino Lab anatomy landmark contract', () => {
  it('provides metadata and finite study bounds for every applicable part, including full-region covering', () => {
    const scene=sceneFixture();
    expect(scene.model.userData.anatomyParts.map(part=>part.id)).toEqual(scene.parts.map(part=>part.id));
    for(const part of scene.model.userData.anatomyParts) {
      expect(part.anchorCount,part.id).toBeGreaterThan(0); expect(part.meshCount).toBeGreaterThanOrEqual(0);
      const bounds=scene.model.userData.anatomyPartBounds[part.id]; expect(bounds,part.id).toBeDefined();
      expect([...bounds.min,...bounds.max].every(Number.isFinite),part.id).toBe(true);
      bounds.min.forEach((minimum,axis)=>expect(bounds.max[axis]).toBeGreaterThan(minimum));
    }
    expect(scene.model.userData.anatomyPartBounds.feathers).toBeDefined();
  });

  it('bounds dense feather tracts with all visible geometry but limits representative landmarks per side', () => {
    const scene=sceneFixture(), anchors=scene.anchors.filter(anchor=>anchor.userData.dinoBodyPart==='feathers');
    expect(anchors.length).toBeLessThanOrEqual(3); expect(anchors.length).toBeGreaterThan(0);
    expect(scene.meshParts.wing).toHaveLength(120);
    for(const mesh of scene.meshParts.wing) {
      expect(new Set(mesh.userData.dinoPartIds).size).toBe(mesh.userData.dinoPartIds.length);
      const box=mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
      expect(scene.bounds.wing.containsBox(box)).toBe(true);
    }
  });

  it('keeps cranial and aliased forearm landmarks attached to their moving owner meshes', () => {
    const scene=sceneFixture(), eye=scene.anchors.find(anchor=>anchor.userData.dinoBodyPart==='eyes'), arm=scene.anchors.find(anchor=>anchor.userData.dinoBodyPart==='forearm');
    expect(eye.parent).toBe(scene.headShell); expect(arm.parent).toBe(scene.limb);
    const eyeLocal=eye.position.clone(), armLocal=arm.position.clone();
    scene.headShell.rotation.y=.4; scene.limb.rotation.z=.2; scene.model.updateMatrixWorld(true);
    expect(eye.getWorldPosition(new THREE.Vector3()).distanceTo(scene.headShell.localToWorld(eyeLocal))).toBeLessThan(1e-10);
    expect(arm.getWorldPosition(new THREE.Vector3()).distanceTo(scene.limb.localToWorld(armLocal))).toBeLessThan(1e-10);
  });
});
