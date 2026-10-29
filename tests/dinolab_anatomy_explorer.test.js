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
function render(id = 'archaeopteryx', selected = '', layers = {}, mode = 'evidence', quiz = null) {
  // The production component identity stays stable across renders. Reset only
  // the read-only evaluation's cache so each SSR scenario receives its own hooks.
  art.resetFieldStationForTest();
  const renderReact = Object.assign({}, React, {
    useState(initial) {
      if (initial && typeof initial === 'object' && initial.speciesId === id && Object.keys(initial).length === 2 && initial.id === '') {
        return React.useState({ speciesId: id, id: selected });
      }
      if (quiz && initial && initial.speciesId === id && Array.isArray(initial.deck) && Array.isArray(initial.answers)) {
        return React.useState(Object.assign({}, initial, quiz));
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
    const svg = overlay.querySelector('svg');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
    for (const attribute of ['data-dino-part-leader', 'data-dino-part-leader-outline', 'data-dino-part-ring', 'data-dino-part-ring-outline', 'data-dino-part-dot']) {
      expect(Array.from(svg.querySelectorAll('[' + attribute + ']')).map(node => node.getAttribute(attribute))).toEqual(parts.map(part => part.id));
    }
    for (const part of parts) {
      const group = svg.querySelector('[data-dino-part-line="' + part.id + '"]');
      const leader = group.querySelector('[data-dino-part-leader]'), leaderOutline = group.querySelector('[data-dino-part-leader-outline]');
      const ring = group.querySelector('[data-dino-part-ring]'), ringOutline = group.querySelector('[data-dino-part-ring-outline]');
      const dot = group.querySelector('[data-dino-part-dot]');
      expect([leader.tagName, leaderOutline.tagName, ring.tagName, ringOutline.tagName, dot.tagName]).toEqual(['line', 'line', 'circle', 'circle', 'circle']);
      expect(Number(leaderOutline.getAttribute('stroke-width'))).toBeGreaterThanOrEqual(Number(leader.getAttribute('stroke-width')) + 2);
      expect(Number(ringOutline.getAttribute('stroke-width'))).toBeGreaterThanOrEqual(Number(ring.getAttribute('stroke-width')) + 2);
      expect(leaderOutline.getAttribute('stroke')).not.toBe(leader.getAttribute('stroke'));
      expect(ringOutline.getAttribute('stroke')).not.toBe(ring.getAttribute('stroke'));
      expect(Number(ringOutline.getAttribute('r'))).toBe(9); expect(ringOutline.getAttribute('r')).toBe(ring.getAttribute('r'));
      expect(leaderOutline.compareDocumentPosition(leader) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(ringOutline.compareDocumentPosition(ring) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(group.querySelectorAll('[tabindex], button, a, [role]')).toHaveLength(0);
    }
  });

  it('gives the selected guide one focusable, accessible ID and exposes its anatomical term with all four description fields', () => {
    const doc = render('archaeopteryx', 'wing'), guide = doc.getElementById('dinolab-selected-part-guide');
    expect(guide).not.toBeNull(); expect(doc.querySelectorAll('#dinolab-selected-part-guide')).toHaveLength(1);
    expect(guide.tagName).toBe('SECTION'); expect(guide.getAttribute('role')).toBe('region');
    expect(guide.getAttribute('aria-label')).toContain('anatomy description'); expect(guide.getAttribute('tabindex')).toBe('-1');
    expect(Array.from(guide.querySelectorAll('dt')).map(node => node.textContent)).toEqual(['Anatomical term', 'What it does', 'Characteristics', 'Look for', 'Fossils and inference']);
    expect(guide.querySelectorAll('dd')).toHaveLength(5);
    expect(guide.querySelector('dt').nextElementSibling.textContent).toBe('Forelimb plumage');
    const facts = guide.querySelector('.dinolab-part-facts'), part = definitions('archaeopteryx').find(item => item.id === 'wing');
    expect(facts.tagName).toBe('DL'); expect(facts.children).toHaveLength(4);
    expect(Array.from(facts.querySelectorAll('dd')).map(node => node.textContent)).toEqual([part.purpose, part.characteristics, part.look, part.evidence]);
    for (const row of facts.children) {
      expect(Array.from(row.children).map(node => node.tagName)).toEqual(['DT', 'DD']);
    }
    const inspection = guide.querySelector('.dinolab-part-inspection');
    expect(inspection).not.toBeNull();
    expect(facts.compareDocumentPosition(inspection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const navigation = guide.querySelector('.dinolab-part-guide-navigation');
    expect(navigation.getAttribute('role')).toBe('group');
    expect(navigation.getAttribute('aria-label')).toBe('Navigate from this body part');
    expect(Array.from(navigation.querySelectorAll('button')).map(node => [node.textContent, node.getAttribute('aria-controls')])).toEqual([
      ['View on model', 'dinolab-3d-canvas-archaeopteryx'], ['Back to body-part key', 'dinolab-body-part-key']
    ]);
    for (const button of navigation.querySelectorAll('button')) {
      expect(button.getAttribute('type')).toBe('button');
      expect(parseInt(button.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
      expect(doc.querySelectorAll('#' + button.getAttribute('aria-controls'))).toHaveLength(1);
    }
    expect(doc.getElementById('dinolab-body-part-key').tagName).toBe('DETAILS');
    expect(doc.querySelector('[data-dino-part-label="wing"]').getAttribute('aria-pressed')).toBe('true');
    expect(doc.querySelector('[data-dino-part-choice="wing"]').getAttribute('aria-pressed')).toBe('true');
    const link = guide.querySelector('a');
    expect(link.getAttribute('target')).toBe('_blank'); expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.getAttribute('aria-label')).toContain('opens in a new tab');
  });

  it('places a selected-part summary after the viewer only for a valid anatomy selection, with usable guide and key targets', () => {
    const doc = render('archaeopteryx', 'wing', { field3dScientificNames: false });
    const summary = doc.querySelector('.dinolab-selected-part-summary');
    expect(summary).not.toBeNull();
    expect(doc.querySelectorAll('.dinolab-selected-part-summary')).toHaveLength(1);
    expect(doc.querySelector('.dinolab-3d-viewer').nextElementSibling).toBe(summary);
    expect(summary.textContent).toContain(definitions('archaeopteryx').find(part => part.id === 'wing').label);
    expect(summary.textContent).toContain('Forelimb plumage');
    expect(Array.from(summary.querySelectorAll('button')).map(node => [node.textContent, node.getAttribute('aria-controls')])).toEqual([
      ['See whole animal', 'dinolab-3d-canvas-archaeopteryx'], ['Read part guide', 'dinolab-selected-part-guide'], ['Browse body parts', 'dinolab-body-part-key']
    ]);
    for (const button of summary.querySelectorAll('button')) {
      expect(button.getAttribute('type')).toBe('button');
      expect(parseInt(button.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
      expect(doc.querySelectorAll('#' + button.getAttribute('aria-controls'))).toHaveLength(1);
    }
    const contextToggle = summary.querySelector('[data-dino-part-context-toggle]');
    expect(contextToggle.getAttribute('aria-pressed')).toBe('false');
    expect(contextToggle.disabled).toBe(true); // SSR starts at the whole-animal study.
    for (const [selection, layers, mode] of [
      ['', {}, 'evidence'], ['unknown-part', {}, 'evidence'], ['wing', {}, 'classic'],
      ['wing', { field3dLabelMode: 'evidence' }, 'evidence'], ['wing', { field3dLabelMode: 'none' }, 'evidence']
    ]) expect(render('archaeopteryx', selection, layers, mode).querySelector('.dinolab-selected-part-summary')).toBeNull();
  });

  it('keeps facts in quiz feedback and review guides without adding selected-guide navigation or duplicate targets', () => {
    const deck = art.dinoAnatomyQuizDeck(false, 17), target = deck[0].partId;
    const answers = [{ partId: target, choice: target, correct: true, hintUsed: false }];
    for (const finished of [false, true]) {
      const doc = render('archaeopteryx', 'wing', { field3dShowBody: false, field3dShowSkeleton: false }, 'evidence', { open: true, deck, index: 0, answers, finished, review: finished ? target : '' });
      const guide = doc.querySelector((finished ? '.dinolab-quiz-review-guide' : '.dinolab-quiz-feedback') + ' .dinolab-part-guide');
      expect(guide).not.toBeNull();
      expect(guide.hasAttribute('id')).toBe(false);
      expect(guide.hasAttribute('tabindex')).toBe(false);
      expect(guide.querySelector('.dinolab-part-guide-navigation')).toBeNull();
      expect(guide.querySelector('.dinolab-part-inspection')).toBeNull();
      expect(guide.querySelector('.dinolab-part-layer-help')).not.toBeNull();
      expect(guide.querySelector('[data-dino-part-reveal]')).toBeNull();
      expect(doc.querySelectorAll('[data-dino-part-reveal]')).toHaveLength(1);
      expect(Array.from(guide.querySelectorAll('.dinolab-part-facts dt')).map(node => node.textContent)).toEqual(['What it does', 'Characteristics', 'Look for', 'Fossils and inference']);
      expect(guide.querySelector('.dinolab-part-facts').textContent).toContain(definitions('archaeopteryx').find(part => part.id === target).evidence);
      expect(doc.querySelectorAll('#dinolab-selected-part-guide')).toHaveLength(1);
      expect(doc.querySelectorAll('#dinolab-body-part-key')).toHaveLength(1);
      expect(doc.querySelectorAll('.dinolab-part-guide-navigation')).toHaveLength(1);
    }
  });

  it('offers an accessible opt-in focus checkbox, restores its saved state and retains every model label name', () => {
    const plain = render('archaeopteryx', 'wing');
    const focused = render('archaeopteryx', 'wing', { field3dFocusSelectedLabel: true });
    const labelNames = doc => Array.from(doc.querySelectorAll('[data-dino-part-label]')).map(node => [node.getAttribute('data-dino-part-label'), node.getAttribute('aria-label'), node.getAttribute('aria-pressed')]);
    expect(labelNames(focused)).toEqual(labelNames(plain));
    for (const [doc, checked] of [[plain, false], [focused, true]]) {
      const checkbox = doc.getElementById('dinolab-focus-selected-label');
      expect(checkbox).not.toBeNull(); expect(doc.querySelectorAll('#dinolab-focus-selected-label')).toHaveLength(1);
      expect(checkbox.closest('.dinolab-selected-part-summary')).not.toBeNull();
      expect(checkbox.tagName).toBe('INPUT'); expect(checkbox.type).toBe('checkbox');
      expect(checkbox.checked).toBe(checked); expect(checkbox.disabled).toBe(false);
      expect(doc.querySelector('label[for="dinolab-focus-selected-label"]').textContent.trim()).toBe('Focus selected label');
      const helpId = checkbox.getAttribute('aria-describedby');
      expect(helpId).toBeTruthy(); expect(doc.querySelectorAll('#' + helpId)).toHaveLength(1);
      expect(doc.getElementById(helpId).textContent).toMatch(/supporting traces/i);
      expect(doc.getElementById(helpId).textContent).toMatch(/keep their comparison landmarks/i);
      expect(doc.querySelector('[data-dino-part-label="wing"]').getAttribute('aria-pressed')).toBe('true');
      expect(doc.querySelectorAll('[data-dino-part-label]')).toHaveLength(definitions('archaeopteryx').length);
    }
    expect(render('archaeopteryx', '', { field3dFocusSelectedLabel: true }).querySelector('#dinolab-focus-selected-label')).toBeNull();
    expect(render('archaeopteryx', 'wing', { field3dFocusSelectedLabel: true, field3dLabelMode: 'none' }).querySelector('#dinolab-focus-selected-label')).toBeNull();
  });

  it('explains the selected part\'s hidden layer and omits the hint when that layer is visible', () => {
    for (const [part, layers, kind, text] of [
      ['skull', { field3dShowSkeleton: false }, 'bone', 'fossil layer'],
      ['skull', { field3dShowSkeleton: true, field3dBodyOpacity: 100 }, 'bone', 'opaque life surface'],
      ['wing', { field3dShowBody: false }, 'life', 'life surface'],
      ['hand', { field3dShowSkeleton: false, field3dShowBody: false }, 'model', 'Both model layers']
    ]) {
      const doc = render('archaeopteryx', part, layers), notice = doc.querySelector('.dinolab-part-visibility-notice');
      expect(notice.closest('.dinolab-selected-part-summary')).not.toBeNull();
      expect(notice.getAttribute('role')).toBe('note'); expect(notice.textContent).toContain(text);
      const button = notice.querySelector('[data-dino-part-reveal]');
      expect(doc.querySelectorAll('[data-dino-part-reveal]')).toHaveLength(1);
      expect(button.getAttribute('data-dino-part-reveal')).toBe(kind); expect(button.type).toBe('button');
      expect(doc.getElementById(button.getAttribute('aria-controls')).tagName).toBe('CANVAS');
      expect(doc.getElementById(button.getAttribute('aria-describedby')).textContent).toBe(doc.querySelector('.dinolab-part-layer-help').textContent);
      expect(doc.getElementById('dinolab-selected-part-guide').querySelector('[data-dino-part-reveal]')).toBeNull();
    }
    const visible = render('archaeopteryx', 'wing');
    expect(visible.querySelector('.dinolab-part-layer-help')).toBeNull(); expect(visible.querySelector('.dinolab-part-visibility-notice')).toBeNull();
    const proxy = render('dimetrodon', 'head', { field3dShowSkeleton: false, field3dShowBody: false });
    expect(proxy.querySelector('.dinolab-part-layer-help')).toBeNull(); expect(proxy.querySelector('[data-dino-part-reveal]')).toBeNull();
  });

  it('identifies internal tissues as inferred proxies and offers an opacity reveal when the life surface hides them', () => {
    const parts = definitions('archaeopteryx');
    for (const id of ['lungs', 'airsacs', 'muscles']) {
      const part = parts.find(item => item.id === id);
      expect(part, id).toBeDefined();
      expect(part.inferredProxy, id).toBe(true);
      expect(part.requiresTranslucentBody, id).toBe(true);
      const opaqueDoc = render('archaeopteryx', id, { field3dBodyOpacity: 100 }), opaqueGuide = opaqueDoc.getElementById('dinolab-selected-part-guide');
      expect(opaqueGuide.querySelector('.dinolab-part-layer-help').textContent).toContain('inferred tissue shapes');
      expect(Array.from(opaqueGuide.querySelectorAll('button')).some(node => node.textContent === 'Reveal inferred tissues')).toBe(false);
      const reveal = opaqueDoc.querySelector('.dinolab-selected-part-summary [data-dino-part-reveal="tissue"]');
      expect(reveal.textContent).toBe('Reveal inferred tissues'); expect(opaqueDoc.querySelectorAll('[data-dino-part-reveal]')).toHaveLength(1);
      const revealedDoc = render('archaeopteryx', id, { field3dBodyOpacity: 45 }), revealedGuide = revealedDoc.getElementById('dinolab-selected-part-guide');
      expect(revealedGuide.querySelector('.dinolab-part-layer-help')).toBeNull();
      expect(revealedDoc.querySelector('[data-dino-part-reveal]')).toBeNull();
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
    const guideFocusSource = block('        function focusBodyPartGuide() {', '        function focusBodyPartModel() {');
    const selection = vi.fn(), preset = vi.fn(), study = vi.fn(), camera = vi.fn(), interaction = vi.fn();
    const controls = { open: false }, closest = vi.fn(() => controls);
    const focus = vi.fn(() => expect(controls.open).toBe(true)), scroll = vi.fn(), selectedRef = { current: '' }, yaw = { current: { study: 'full' } };
    // A new selection must discard the frame saved for a different landmark.
    const inspectionFrame = { current: { part: 'head', study: 'head' } };
    const endTrace = vi.fn();
    const make = new Function('bodyPartDefinitions', 'selectedBodyPartRef', 'setBodyPartSelection', 'props', 'notifyOrientationInteraction', 'setCameraPreset', 'yawRef', 'setStudyView', 'cameraControlRef', 'anatomyGuideRef', 'window', 'partInspectionFrameRef', 'endSupportingRelation', guideFocusSource + selectionSource + '\nreturn selectBodyPart;');
    const choose = make(definitions('archaeopteryx'), selectedRef, selection, { species: { id: 'archaeopteryx' } }, interaction, preset, yaw, study, { current: camera }, { current: { closest, focus, scrollIntoView: scroll } }, { requestAnimationFrame(callback) { callback(); } }, inspectionFrame, endTrace);
    choose('wing', true); expect(selectedRef.current).toBe('wing'); expect(interaction).toHaveBeenCalledOnce();
    expect(inspectionFrame.current).toBeNull();
    expect(endTrace).toHaveBeenCalledWith(false);
    expect(closest).toHaveBeenCalledWith('details.dinolab-3d-controls-disclosure'); expect(controls.open).toBe(true);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true }); expect(scroll).toHaveBeenCalledWith({ block: 'start' });
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
