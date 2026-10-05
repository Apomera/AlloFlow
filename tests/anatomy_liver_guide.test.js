// Liver guide: readable scale figures, preserved authored geometry, and guarded study continuity.
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const paths = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const steps = [
  [
    "portal_entry",
    "1. Portal triad entry",
    "Branches of the hepatic portal vein bring nutrient-rich blood from digestive organs, while hepatic artery branches supply oxygen-rich blood. Both enter at portal triads around the lobule edge.",
    "dual-blood-supply"
  ],
  [
    "sinusoidal_exchange",
    "2. Sinusoidal exchange",
    "The two blood supplies mix in fenestrated sinusoids. Hepatocytes take up nutrients, store glycogen, synthesize plasma proteins, modify drugs and toxins, and release products back toward the blood.",
    "sinusoidal-hepatocyte-exchange"
  ],
  [
    "central_return",
    "3. Central venous return",
    "Sinusoidal blood moves inward to the central vein, then through hepatic veins into the inferior vena cava and back toward the heart.",
    "central-venous-drainage"
  ],
  [
    "bile_flow",
    "4. Bile flows outward",
    "Hepatocytes secrete bile into tiny canaliculi. Bile travels outward, opposite the blood-flow direction, toward bile duct branches in portal triads and then toward the gallbladder or small intestine.",
    "bile-counterflow"
  ]
];
const originalRoutes = [
  "M389 154 C420 155 449 170 469 183 M430 99 C447 124 467 155 480 174",
  "M407 213 C433 212 458 202 472 195 M559 112 C548 145 526 174 511 184 M556 286 C540 250 519 217 509 203",
  "M493 190 C493 149 493 100 493 57",
  "M482 213 C463 231 443 250 418 268 M511 213 C532 232 552 250 570 267"
];
const originalPaths = [
  "M 0 0 L 10 5 L 0 10 z",
  "M55 58 C35 76 33 116 39 153 L49 292 L106 292 L116 153 C122 116 119 76 99 58 C87 48 67 48 55 58 Z",
  "M51 119 C67 105 98 106 109 124 C105 145 86 156 61 149 C48 145 44 132 51 119 Z",
  "M122 138 C148 138 160 132 176 117",
  "M178 106 C205 66 280 66 317 98 C332 111 330 142 308 156 C287 170 258 167 238 180 C213 196 176 180 169 151 C165 134 168 119 178 106 Z",
  "M239 90 C239 111 241 138 244 166",
  "M207 173 C207 201 192 223 176 240",
  "M227 175 C227 208 218 229 207 248",
  "M287 164 C287 202 299 222 315 238",
  "M327 137 C347 137 357 128 371 116",
  "M430 79 L552 92 L609 180 L558 294 L426 303 L371 210 Z",
  "M445 178 L459 167 M526 177 L541 164 M462 222 L476 211 M516 226 L529 214",
  "M493 166 L493 95",
  "M493 208 L462 235 L430 264 M493 208 L526 236 L558 267",
  "M483 201 L453 187 M503 201 L533 187"
];
const bodyPaths = [
  "M55 58 C35 76 33 116 39 153 L49 292 L106 292 L116 153 C122 116 119 76 99 58 C87 48 67 48 55 58 Z",
  "M51 119 C67 105 98 106 109 124 C105 145 86 156 61 149 C48 145 44 132 51 119 Z"
];
const organPaths = [
  "M178 106 C205 66 280 66 317 98 C332 111 330 142 308 156 C287 170 258 167 238 180 C213 196 176 180 169 151 C165 134 168 119 178 106 Z",
  "M239 90 C239 111 241 138 244 166",
  "M207 173 C207 201 192 223 176 240",
  "M227 175 C227 208 218 229 207 248",
  "M287 164 C287 202 299 222 315 238"
];
const lobulePaths = [
  "M430 79 L552 92 L609 180 L558 294 L426 303 L371 210 Z",
  "M445 178 L459 167 M526 177 L541 164 M462 222 L476 211 M516 226 L529 214",
  "M493 166 L493 95",
  "M493 208 L462 235 L430 264 M493 208 L526 236 L558 267",
  "M483 201 L453 187 M503 201 L533 187"
];
const zoomPaths = [
  "M122 138 C148 138 160 132 176 117",
  "M327 137 C347 137 357 128 371 116"
];
const clinicalPaths = [
  "M402 126 C450 158 521 163 576 139",
  "M391 204 C447 182 518 205 590 238",
  "M431 285 C458 240 531 226 561 279"
];
const triads = [
  {
    "x": 430,
    "y": 98
  },
  {
    "x": 552,
    "y": 112
  },
  {
    "x": 585,
    "y": 218
  },
  {
    "x": 523,
    "y": 292
  },
  {
    "x": 409,
    "y": 266
  },
  {
    "x": 388,
    "y": 157
  }
];
const hepatocytes = [
  {
    "x": 448,
    "y": 139
  },
  {
    "x": 477,
    "y": 126
  },
  {
    "x": 514,
    "y": 133
  },
  {
    "x": 548,
    "y": 155
  },
  {
    "x": 454,
    "y": 184
  },
  {
    "x": 535,
    "y": 192
  },
  {
    "x": 452,
    "y": 232
  },
  {
    "x": 489,
    "y": 250
  },
  {
    "x": 532,
    "y": 235
  }
];
const mechanismCaptions = [
  "portal blood + arterial blood mix",
  "nutrients · proteins · detox products exchange",
  "processed blood drains to hepatic veins",
  "bile moves outward · opposite blood flow"
];
const originalSubtitle = "Connect the liver's body location to lobule microanatomy, portal blood processing, venous return, and bile flow.";
const clinicalNarrative = {
  "change": "Collagen bands distort lobule architecture and narrow sinusoidal pathways.",
  "effect": "Resistance to portal blood flow rises while hepatocyte exchange becomes less efficient.",
  "note": "Educational comparison only — not a diagnostic view."
};
const clone = value => JSON.parse(JSON.stringify(value));
const savedWork = {
  _structureNotes: { liver: 'My liver flow explanation.', sm_intestine: 'My absorption explanation.' },
  _structureConfidence: { liver: 'learning' }, _retrievalEvidence: { liver: { attempts: 3, correct: 2 } },
  quizScore: 3, quizIdx: 2, _quizAttempts: 4, quizFeedback: { chosen: 'liver', correct: false },
  _quizQuestion: { token: 'saved-question', index: 2 }, _quizActivityReturn: { token: 'saved-question', index: 2, score: 3 },
  _flashcardDeck: ['liver', 'sm_intestine', 'heart'], _flashcardIdx: 1, _flashcardFlipped: true,
  _spotterActive: true, _spotterTarget: 'liver', _spotterFeedback: 'sm_intestine', _spotterScore: 2, _spotterTotal: 3,
  _clinicalStudy: { version: 1, cases: { case_1: { draft: 'My reasoning.' } } },
  _aiInput: 'How does bile leave the lobule?', _aiDraftContext: {version:1,systemId:'organs',structureId:'liver',band:'g35'},
  _aiMessages: [{role:'user',text:'Explain counterflow.',systemId:'organs',structureId:'liver',band:'g35'}], _aiConversationBand:'g35',
  _clinicalAtlasPackId: 'hra-kidney-female-left-v1.3', _clinicalAtlasConceptId: 'UBERON:0001225',
  _clinicalFtuCellId: 'CL:0000653', _clinicalFtuAtlasId: 'hra-kidney-renal-corpuscle-v1.3',
};
const work = state => clone(Object.fromEntries(Object.keys(savedWork).map(key => [key, state[key]])));
const contextChanges = [
  [
    "closed atlas",
    {
      "_regionalAtlasOpen": null
    }
  ],
  [
    "different open atlas",
    {
      "_regionalAtlasOpen": "sm_intestine"
    }
  ],
  [
    "selected structure",
    {
      "selectedStructure": "sm_intestine"
    }
  ],
  [
    "system",
    {
      "system": "skeletal"
    }
  ],
  [
    "view",
    {
      "view": "posterior"
    }
  ],
  [
    "level",
    {
      "complexity": 2
    }
  ],
  [
    "activity",
    {
      "_activeTab": "flashcards"
    }
  ],
  [
    "Quiz mode",
    {
      "quizMode": true
    }
  ],
  [
    "step",
    {
      "_regionalAtlasStep": 0
    }
  ],
  [
    "flow choice",
    {
      "_regionalAtlasPlaying": true
    }
  ],
  [
    "clinical choice",
    {
      "_regionalAtlasClinical": true
    }
  ],
  [
    "3D choice",
    {
      "_bodyView3d": true
    }
  ],
  [
    "model focus",
    {
      "_anatomyModelFocus": true
    }
  ],
  [
    "study sheet",
    {
      "_showStudySheet": true
    }
  ],
  [
    "gallery",
    {
      "_showAnatomyLens": true
    }
  ]
];
const actions = [
  ['step', { _regionalAtlasStep: 3, _regionalAtlasPlaying: false, _regionalAtlasClinical: false }],
  ['previous', { _regionalAtlasStep: 0, _regionalAtlasPlaying: false, _regionalAtlasClinical: false }],
  ['next', { _regionalAtlasStep: 2, _regionalAtlasPlaying: false, _regionalAtlasClinical: false }],
  ['flow', { _regionalAtlasStep: 1, _regionalAtlasPlaying: true, _regionalAtlasClinical: false }],
  ['clinical', { _regionalAtlasStep: 1, _regionalAtlasPlaying: false, _regionalAtlasClinical: true }],
  ['handoff', { system: 'organs', view: 'anterior', complexity: 2, selectedStructure: 'sm_intestine', _regionalAtlasOpen: 'sm_intestine', _regionalAtlasStep: 1, _regionalAtlasPlaying: false, _regionalAtlasClinical: false }],
];
const guide = (root, id = 'liver') => root.querySelector('[data-anatomy-atlas="' + id + '"]');
const figure = (atlas, scale) => atlas.querySelector('figure[data-anatomy-liver-scale="' + scale + '"]');

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const result = find(child, predicate); if (result) return result; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function session(file, extra = {}) {
  resetStemLab(); document.body.innerHTML = ''; const tool = loadTool(file, 'anatomy');
  let data = { otherTool: { savedSetting: 'keep' }, anatomy: {
    system: 'organs', view: 'anterior', complexity: 1, selectedStructure: 'liver', _activeTab: 'explore',
    quizMode: false, _bodyView3d: false, _regionalAtlasOpen: 'liver', _regionalAtlasStep: 1,
    _regionalAtlasPlaying: false, _regionalAtlasClinical: false, _startHereDismissed: true,
    _badges: { firstStructure: true, viewToggler: true, spotterPro: true, speedDemon: true },
    completedChallenges: ['spotter_3', 'cases_solved'], ...clone(savedWork), ...extra,
  } };
  let host, deferred = false, pending = [];
  const apply = update => { data = typeof update === 'function' ? update(data) : update; };
  const setToolData = update => deferred ? pending.push(update) : apply(update);
  const announceToSR = vi.fn();
  const ctx = () => ({ toolData: data, setToolData, announceToSR, gradeLevel: '9' });
  const atlas = () => { const result = find(tool.render(makeCtx(ctx())), node => node.props?.['data-anatomy-atlas'] === 'liver'); expect(result).not.toBeNull(); return result; };
  const control = name => { const result = find(atlas(), node => name === 'step'
    ? node.props?.['data-anatomy-liver-step'] === steps[3][0]
    : name === 'clinical' ? node.props?.['data-anatomy-clinical-toggle'] === 'liver' : node.props?.['data-anatomy-liver-' + name] === true); expect(result).not.toBeNull(); return result; };
  const step = index => { const result = find(atlas(), node => node.props?.['data-anatomy-liver-step'] === steps[index][0]); expect(result).not.toBeNull(); return result.props.onClick; };
  const mount = () => { if (!host?.isConnected) { host = document.createElement('div'); document.body.appendChild(host); } host.innerHTML = renderTool('anatomy', data, ctx()); return host; };
  mount(); vi.runAllTimers(); announceToSR.mockClear();
  return { state: () => data.anatomy, data: () => data, atlas, control, step, mount, announceToSR, action: name => control(name).props.onClick,
    patch: patch => { data = { ...data, anatomy: { ...data.anatomy, ...patch } }; }, defer: () => { deferred = true; },
    flush: () => { deferred = false; const updates = pending; pending = []; updates.forEach(apply); },
  };
}
beforeEach(() => { resetStemLab(); vi.useFakeTimers(); document.body.innerHTML = ''; });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = ''; });

for (const file of paths) describe('Liver lobule guide: ' + file, () => {
  it.each(steps.map((step, index) => [...step, index]))('selects %s with its authored narrative and one mechanism while preserving paused work', (id, label, narrative, mechanism, index) => {
    const s = session(file), before = work(s.state()); s.step(index)(); const atlas = guide(s.mount()); vi.runAllTimers();
    expect(s.state()).toMatchObject({ _regionalAtlasStep: index, _regionalAtlasPlaying: false, system: 'organs', view: 'anterior', selectedStructure: 'liver', _regionalAtlasOpen: 'liver' });
    expect(atlas.getAttribute('data-anatomy-atlas-step')).toBe(id); const detail = atlas.querySelector('#anatomy-liver-step-detail'); expect(detail.textContent).toContain(label); expect(detail.textContent).toContain(narrative);
    const lobule = figure(atlas, 'lobule'); expect(atlas.querySelectorAll('figure[data-anatomy-liver-scale]')).toHaveLength(3);
    expect(atlas.querySelectorAll('.anatomy-mechanism-layer')).toHaveLength(4); expect(atlas.querySelectorAll('.anatomy-atlas-route')).toHaveLength(4);
    const active = lobule.querySelectorAll('.anatomy-mechanism-layer.is-active'); expect(active).toHaveLength(1); expect(active[0].getAttribute('data-anatomy-mechanism')).toBe(mechanism);
    expect(atlas.querySelectorAll('.anatomy-atlas-route.is-active')).toHaveLength(1); expect(lobule.querySelector('.anatomy-atlas-route.is-active').getAttribute('d')).toBe(originalRoutes[index]);
    expect([...lobule.querySelectorAll('.anatomy-atlas-route')].map(route => route.getAttribute('d'))).toEqual(originalRoutes);
    ['body', 'organ'].forEach(scale => { expect(figure(atlas, scale).querySelectorAll('.anatomy-atlas-route,.anatomy-mechanism-layer')).toHaveLength(0); });
    expect(work(s.state())).toEqual(before); expect(s.data().otherTool).toEqual({ savedSetting: 'keep' }); expect(s.announceToSR).not.toHaveBeenCalled();
  });

  it.each([false, true])('uses three named scale figures with numbered markers and readable keys (clinical=%s)', clinical => {
    const s = session(file, { _regionalAtlasClinical: clinical }), atlas = guide(s.mount());
    const figures = [...atlas.querySelectorAll('figure[data-anatomy-liver-scale]')]; expect(figures.map(node => node.getAttribute('data-anatomy-liver-scale'))).toEqual(['body', 'organ', 'lobule']);
    figures.forEach((node, index) => {
      const svg = node.querySelector('svg[role="img"]'), names = (svg.getAttribute('aria-labelledby') || '').trim().split(/\s+/); expect(names).toHaveLength(2);
      names.forEach(id => expect(node.querySelector('[id="' + id + '"]')?.textContent.trim()).toBeTruthy());
      expect(node.querySelector('[id="' + node.getAttribute('aria-labelledby') + '"]')?.textContent.trim()).toBeTruthy(); expect(node.querySelector('h6').textContent.trim()).toBeTruthy();
      const markers = [...svg.querySelectorAll('text')], keys = [...node.querySelectorAll('figcaption ol li')]; expect(markers).toHaveLength([1, 3, 6][index]); expect(keys).toHaveLength(markers.length);
      markers.forEach((marker, i) => { expect(marker.textContent.trim()).toBe(String(i + 1)); expect(keys[i].textContent.trim()).toMatch(/\D/); }); expect(node.querySelector('figcaption').closest('svg')).toBeNull();
    });
    expect(figure(atlas, 'body').querySelector('figcaption').textContent.toLowerCase()).toContain('right upper abdomen');
    ['portal vein','hepatic artery','hepatic vein'].forEach(value => expect(figure(atlas, 'organ').querySelector('figcaption').textContent.toLowerCase()).toContain(value));
    ['portal triad','hepatocyte','central vein','sinusoid','bile canaliculi','bile duct'].forEach(value => expect(figure(atlas, 'lobule').querySelector('figcaption').textContent.toLowerCase()).toContain(value));
    const triadKey=atlas.querySelector('[data-anatomy-liver-triad-key]'); expect(triadKey.getAttribute('role')).toBe('list'); expect(triadKey.querySelectorAll('[role="listitem"]')).toHaveLength(3); expect([...triadKey.children].map(child=>child.getAttribute('role'))).toEqual(['listitem','listitem','listitem']); expect(triadKey.querySelector('h6')).toBeNull(); expect(triadKey.parentElement.querySelector('h6').textContent).toBe('Portal triad key'); ['portal vein','artery','bile duct'].forEach(value=>expect(triadKey.textContent).toContain(value));
    expect(atlas.textContent).toContain(originalSubtitle);
    const svgWords = [...atlas.querySelectorAll('svg text')].map(node => node.textContent.trim()); svgWords.forEach(text => expect(text).toMatch(/^\d+$/)); expect(svgWords).toHaveLength(10);
    if (clinical) { const overlays = [...atlas.querySelectorAll('[data-anatomy-clinical-overlay="hepatic_fibrosis"]')]; expect(overlays).toHaveLength(1); expect(overlays[0].closest('figure')).toBe(figures[2]); expect(overlays[0].querySelectorAll('text')).toHaveLength(0); const panel = atlas.querySelector('[data-anatomy-clinical-panel="hepatic_fibrosis"]'); Object.values(clinicalNarrative).forEach(value => expect(panel.textContent).toContain(value)); }
    else expect(atlas.querySelector('[data-anatomy-clinical-overlay]')).toBeNull();
  });

  it('uses native buttons and one polite live detail panel while retaining step focus', () => {
    const s = session(file), atlas = guide(s.mount()), buttons = [...atlas.querySelectorAll('.anatomy-atlas-steps button')]; expect(buttons).toHaveLength(4);
    const detail = atlas.querySelector('#anatomy-liver-step-detail'); expect(atlas.querySelectorAll('[aria-live]')).toHaveLength(1); expect(detail.getAttribute('role')).toBe('status'); expect(detail.getAttribute('aria-live')).toBe('polite'); expect(detail.getAttribute('aria-atomic')).toBe('true');
    buttons.forEach((button, i) => { expect(button.type).toBe('button'); expect(button.getAttribute('data-anatomy-liver-step')).toBe(steps[i][0]); expect(button.getAttribute('aria-controls')).toBe(detail.id); expect(button.getAttribute('aria-pressed')).toBe(String(i === 1)); expect(button.textContent).toContain(steps[i][1]); });
    for (const selector of ['[data-anatomy-liver-flow]','[data-anatomy-liver-previous]','[data-anatomy-liver-next]','[data-anatomy-clinical-toggle="liver"]']) { const button = atlas.querySelector(selector); expect(button?.tagName).toBe('BUTTON'); expect(button.type).toBe('button'); expect(button.textContent.trim()).toBeTruthy(); }
    expect(atlas.querySelector('[data-anatomy-liver-flow]').textContent).toBe('Play flow'); expect(atlas.querySelector('[data-anatomy-clinical-toggle]').getAttribute('aria-pressed')).toBe('false'); expect(atlas.textContent).toContain('Flow paused');
    buttons[2].focus(); s.step(2)(); vi.runAllTimers(); expect(document.activeElement).toBe(buttons[2]);
  });
  it('bounds previous and next steps while preserving an explicit pause', () => {
    const s = session(file), before = work(s.state()); s.action('previous')(); expect(s.state()._regionalAtlasStep).toBe(0); let atlas = guide(s.mount()); expect(atlas.querySelector('[data-anatomy-liver-previous]').disabled).toBe(true); expect(atlas.querySelector('[data-anatomy-liver-next]').disabled).toBe(false);
    for (let i = 1; i < steps.length; i++) { s.action('next')(); expect(s.state()._regionalAtlasStep).toBe(i); } atlas = guide(s.mount()); expect(atlas.querySelector('[data-anatomy-liver-next]').disabled).toBe(true); expect(atlas.querySelector('[data-anatomy-liver-previous]').disabled).toBe(false);
    s.action('next')(); expect(s.state()._regionalAtlasStep).toBe(3); s.step(0)(); s.action('previous')(); expect(s.state()._regionalAtlasStep).toBe(0); expect(s.state()._regionalAtlasPlaying).toBe(false); expect(work(s.state())).toEqual(before);
  });
  it('keeps explicit Play and Pause independent of step selection and the clinical lens', () => {
    const s = session(file), before = work(s.state()); s.action('flow')(); expect(s.state()._regionalAtlasPlaying).toBe(true); s.step(2)(); expect(s.state()._regionalAtlasPlaying).toBe(true); s.action('flow')(); expect(s.state()._regionalAtlasPlaying).toBe(false); s.step(3)(); expect(s.state()._regionalAtlasPlaying).toBe(false); s.action('clinical')(); expect(s.state()._regionalAtlasClinical).toBe(true); s.action('previous')(); expect(s.state()._regionalAtlasPlaying).toBe(false); s.action('clinical')(); expect(s.state()._regionalAtlasClinical).toBe(false); expect(s.state()._regionalAtlasStep).toBe(2); expect(work(s.state())).toEqual(before); expect(guide(s.mount()).textContent).toContain('Flow paused');
  });

  for (const delivery of ['immediate','deferred']) it.each(actions)('merges newer study work when a ' + delivery + ' %s action is accepted', (name, expected) => {
    const s = session(file), action = s.action(name); if (delivery === 'deferred') { s.defer(); action(); expect(s.announceToSR).not.toHaveBeenCalled(); }
    const newer = { ...clone(savedWork), _structureNotes: { liver: 'A newer flow explanation.', sm_intestine: 'New absorption explanation.' }, quizScore: 5, quizFeedback: { chosen: 'sm_intestine', correct: true }, _flashcardIdx: 0, _spotterScore: 7, _clinicalStudy: { version: 1, cases: { case_1: { draft: 'New clinical reasoning.' } } } }; s.patch(newer); if (delivery === 'deferred') s.flush(); else action(); vi.runAllTimers(); expect(s.state()).toMatchObject(expected); expect(work(s.state())).toEqual(newer); expect(s.data().otherTool).toEqual({ savedSetting: 'keep' });
  });
  it.each(contextChanges)('rejects captured controls after the %s changes', (_label, patch) => {
    const s = session(file), captured = actions.map(([name]) => s.action(name)); s.patch(patch); const before = clone(s.data()); captured.forEach(action => action()); vi.runAllTimers(); expect(s.data()).toEqual(before); expect(s.announceToSR).not.toHaveBeenCalled();
  });
  it.each(contextChanges)('rejects deferred controls when the %s changes before acceptance', (_label, patch) => {
    const s = session(file), captured = actions.map(([name]) => s.action(name)); s.defer(); captured.forEach(action => action()); expect(s.announceToSR).not.toHaveBeenCalled(); s.patch(patch); const before = clone(s.data()); s.flush(); vi.runAllTimers(); expect(s.data()).toEqual(before); expect(s.announceToSR).not.toHaveBeenCalled();
  });

  it('resolves blood and bile arrows locally and zoom arrows across decorative scale connectors', () => {
    const s = session(file), atlas = guide(s.mount()), lobule = figure(atlas, 'lobule'), ids = [...atlas.querySelectorAll('[id]')].map(node => node.id); expect(new Set(ids).size).toBe(ids.length);
    const markers = [...atlas.querySelectorAll('marker')]; expect(markers).toHaveLength(5); expect(markers.map(node => node.id).sort()).toEqual(['anatomy-arrow-portal','anatomy-arrow-sinusoid','anatomy-arrow-central','anatomy-arrow-bile','anatomy-arrow-zoom'].sort());
    markers.forEach(node => { expect(node.getAttribute('markerUnits')).toBe('userSpaceOnUse'); expect(node.getAttribute('orient')).toBe('auto-start-reverse'); expect(node.querySelector('path').getAttribute('d')).toBe(originalPaths[0]); });
    [...lobule.querySelectorAll('.anatomy-atlas-route')].forEach((route, i) => { expect(route.getAttribute('data-anatomy-liver-route')).toBe(String(i)); expect(route.getAttribute('d')).toBe(originalRoutes[i]); expect(route.getAttribute('stroke')).toBe(['#7c3aed','#dc2626','#2563eb','#059669'][i]); const id = /^url\(#([^()]+)\)$/.exec(route.getAttribute('marker-end'))?.[1]; expect(lobule.querySelectorAll('marker[id="' + id + '"]')).toHaveLength(1); });
    zoomPaths.forEach(d => { const nodes = [...atlas.querySelectorAll('path')].filter(node => node.getAttribute('d') === d); expect(nodes).toHaveLength(1); const connector = nodes[0].closest('svg'); expect(connector.closest('figure')).toBeNull(); expect(connector.getAttribute('aria-hidden')).toBe('true'); expect(nodes[0].getAttribute('marker-end')).toBe('url(#anatomy-arrow-zoom)'); });
    const key = atlas.querySelector('[data-anatomy-visual-key="liver"]'); expect(key.getAttribute('role')).toBe('list'); expect(key.querySelectorAll('[role="listitem"]')).toHaveLength(4); ['portal blood','sinusoidal exchange','venous return','bile'].forEach(value => expect(key.textContent).toContain(value));
  });

  it.each(steps.map((step, i) => [step[0], i]))('preserves all authored paths, triads and hepatocytes in %s', (_id, index) => {
    const s = session(file, { _regionalAtlasStep: index }), atlas = guide(s.mount()), lobule = figure(atlas, 'lobule'), rendered = [...atlas.querySelectorAll('path')]; expect(rendered).toHaveLength(23);
    originalPaths.forEach((d, i) => expect(rendered.filter(node => node.getAttribute('d') === d)).toHaveLength(i === 0 ? 5 : 1)); originalRoutes.forEach(d => expect(rendered.filter(node => node.getAttribute('d') === d)).toHaveLength(1));
    [['body',bodyPaths],['organ',organPaths],['lobule',lobulePaths]].forEach(([scale, expected]) => expected.forEach(d => expect([...figure(atlas, scale).querySelectorAll('path')].filter(node => node.getAttribute('d') === d)).toHaveLength(1)));
    const layers = [...lobule.querySelectorAll('.anatomy-mechanism-layer')]; expect(layers.map(node => node.getAttribute('data-anatomy-mechanism'))).toEqual(steps.map(step => step[3])); layers.forEach((node, i) => { expect(node.classList.contains('is-active')).toBe(i === index); expect(node.classList.contains('is-muted')).toBe(i !== index); expect(node.getAttribute('aria-hidden')).toBe('true'); });
    const findAt = (type, props) => [...lobule.querySelectorAll(type)].filter(node => Object.entries(props).every(([key,value]) => node.getAttribute(key) === String(value)));
    triads.forEach(({x,y}) => { const portal = findAt('circle',{cx:x-7,cy:y,r:7,stroke:'#7c3aed'}), artery = findAt('circle',{cx:x+8,cy:y-2,r:5,stroke:'#dc2626'}), bile = findAt('rect',{x:x+2,y:y+7,width:11,height:8,rx:3,stroke:'#059669'}); expect(portal).toHaveLength(1); expect(artery).toHaveLength(1); expect(bile).toHaveLength(1); expect(portal[0].parentElement).toBe(artery[0].parentElement); expect(portal[0].parentElement).toBe(bile[0].parentElement); expect(portal[0].parentElement.classList.contains('is-active')).toBe(index===0||index===3); });
    hepatocytes.forEach(({x,y}) => { const cells = findAt('circle',{cx:x,cy:y,r:11,stroke:'#d97706'}); expect(cells).toHaveLength(1); expect(cells[0].classList.contains('is-active')).toBe(index===1||index===3); }); expect(findAt('circle',{r:11,stroke:'#d97706'})).toHaveLength(9); const center = findAt('circle',{cx:493,cy:191,r:24,stroke:'#2563eb'}); expect(center).toHaveLength(1); expect(center[0].classList.contains('is-active')).toBe(index===2);
    const caption = atlas.querySelector('[data-anatomy-liver-mechanism-caption]'); expect(caption.closest('svg')).toBeNull(); expect(caption.textContent).toContain(mechanismCaptions[index]);
    const source = fs.readFileSync(file,'utf8'); steps.forEach(([,label,detail]) => { expect(source).toContain(label); expect(source).toContain(detail); }); Object.values(clinicalNarrative).forEach(value => expect(source).toContain(value));
  });
  it.each(steps.map((step, i) => [step[0], i]))('keeps all three fibrosis bands visible above flow routes in %s', (_id, index) => {
    const s = session(file, { _regionalAtlasStep:index, _regionalAtlasClinical:true }), atlas = guide(s.mount()), lobule = figure(atlas,'lobule'), overlay = lobule.querySelector('[data-anatomy-clinical-overlay="hepatic_fibrosis"]'), bands = [...overlay.querySelectorAll('path')]; expect(atlas.querySelectorAll('path')).toHaveLength(26); expect(bands.map(node=>node.getAttribute('d'))).toEqual(clinicalPaths); bands.forEach(node=>{ expect(node.getAttribute('stroke')).toBe('#7c3aed'); expect(node.getAttribute('stroke-width')).toBe('8'); expect(node.getAttribute('opacity')).toBe('0.62'); });
    [...lobule.querySelectorAll('.anatomy-atlas-route')].forEach(route => expect(route.compareDocumentPosition(overlay) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()); expect(overlay.querySelectorAll('text')).toHaveLength(0); expect(overlay.closest('svg')).toBe(lobule.querySelector('svg')); expect(s.state()._regionalAtlasPlaying).toBe(false);
  });

  it('keeps the connected intestinal absorption route visible', () => {
    const s=session(file), atlas=guide(s.mount()), handoff=atlas.querySelector('[data-anatomy-pathway-from="liver"][data-scale-continuation="sm_intestine"]'); expect(handoff).not.toBeNull(); expect(handoff.textContent).toContain('review how nutrients entered portal blood before reaching the liver.'); expect(handoff.querySelector('button').textContent).toBe('Trace nutrient absorption');
  });
  it.each([false,true].flatMap(playing=>[1,3].map(level=>[playing,level])))('opens the visible villus absorption step with playback=%s and level=%s', (playing,level) => {
    const viewed={liver:true,kidneys:true,epidermis:true}, s=session(file,{complexity:level,_regionalAtlasPlaying:playing,_regionalAtlasClinical:true,_anatomyLensViewed:viewed,search:'liver',_studyFilter:'bookmarked'}), before=work(s.state()); const control=guide(s.mount()).querySelector('[data-anatomy-liver-handoff]'); expect(control?.tagName).toBe('BUTTON'); expect(control.type).toBe('button'); s.action('handoff')(); vi.runAllTimers();
    expect(s.state()).toMatchObject({system:'organs',view:'anterior',complexity:Math.max(level,2),selectedStructure:'sm_intestine',_regionalAtlasOpen:'sm_intestine',_regionalAtlasStep:1,_regionalAtlasClinical:false,_regionalAtlasPlaying:playing,_activeTab:'explore',quizMode:false,_bodyView3d:false,_anatomyModelFocus:false,_showStudySheet:false,_showAnatomyLens:false,_anatomyLensEntry:null,search:'',_studyFilter:'all'}); expect(s.state()._anatomyLensViewed).toEqual({...viewed,sm_intestine:true}); expect(work(s.state())).toEqual(before); expect(s.data().otherTool).toEqual({savedSetting:'keep'}); expect(s.announceToSR).toHaveBeenCalledTimes(1); expect(s.announceToSR).toHaveBeenCalledWith('Opening intestinal villus absorption, step 2 of 4.'); const target=guide(s.mount(),'sm_intestine'); expect(target).not.toBeNull(); expect(target.getAttribute('data-anatomy-atlas-step')).toBe('blood_absorption'); expect(target.classList.contains('is-paused')).toBe(!playing); expect(target.classList.contains('is-clinical')).toBe(false);
  });
  it('merges newest deferred notes and viewed records before opening the villus', () => {
    const s=session(file,{_regionalAtlasClinical:true,_anatomyLensViewed:{kidneys:true}}), captured=s.action('handoff'); const newerWork={...clone(savedWork),_structureNotes:{liver:'Newest liver explanation.',sm_intestine:'Newest absorption explanation.'},_clinicalStudy:{version:1,cases:{case_1:{draft:'Newest clinical reasoning.'}}},quizScore:8,_spotterTotal:9}, newerViewed={kidneys:true,liver:true,heart:true}; s.defer(); captured(); expect(s.announceToSR).not.toHaveBeenCalled(); s.patch({...newerWork,_anatomyLensViewed:newerViewed}); s.flush(); vi.runAllTimers(); expect(s.state()).toMatchObject({complexity:2,selectedStructure:'sm_intestine',_regionalAtlasOpen:'sm_intestine',_regionalAtlasStep:1,_regionalAtlasPlaying:false,_regionalAtlasClinical:false}); expect(work(s.state())).toEqual(newerWork); expect(s.state()._anatomyLensViewed).toEqual({...newerViewed,sm_intestine:true}); expect(s.announceToSR).toHaveBeenCalledTimes(1);
  });
  it('focuses the accepted visible villus destination after its origin is replaced', () => {
    const s=session(file), origin=guide(s.mount()).querySelector('[data-anatomy-liver-handoff]'); origin.focus(); s.action('handoff')(); const target=guide(s.mount(),'sm_intestine'); expect(target).not.toBeNull(); Object.defineProperty(target,'getClientRects',{configurable:true,value:()=>[{width:300,height:200}]}); const focus=vi.spyOn(target,'focus'); vi.runAllTimers(); expect(focus).toHaveBeenCalledWith({preventScroll:true}); expect(document.activeElement).toBe(target);
  });
  it('respects newer input focus while accepted handoff focus is pending', () => {
    const s=session(file), origin=guide(s.mount()).querySelector('[data-anatomy-liver-handoff]'); origin.focus(); s.action('handoff')(); const target=guide(s.mount(),'sm_intestine'); Object.defineProperty(target,'getClientRects',{configurable:true,value:()=>[{width:300,height:200}]}); const focus=vi.spyOn(target,'focus'), input=document.createElement('input'); document.body.appendChild(input); input.focus(); vi.runAllTimers(); expect(focus).not.toHaveBeenCalled(); expect(document.activeElement).toBe(input); expect(s.state().selectedStructure).toBe('sm_intestine');
  });
  it.each([[-9,steps[0][0]],[50,steps[3][0]],['invalid',steps[0][0]]])('safely displays restored step %s', (value,expected) => { const s=session(file,{_regionalAtlasStep:value}); expect(guide(s.mount()).getAttribute('data-anatomy-atlas-step')).toBe(expected); });
});
