import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const source = readFileSync('immersive_geometry/immersive_geometry.html', 'utf8');
const mainScript = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)[1];
const STORAGE_KEY = 'alloflow_stretch_lab_v1';
const markup = source.replace(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/g, '').replace(/<style>[\s\S]*?<\/style>/g, '');

// Run the actual DOM handlers and component math. Only the WebGL scene and timers
// are substituted, so mode changes, save/restore, and snapping execute normally.
function boot({ saved, query = '' } = {}) {
  const dom = new JSDOM(markup, { url: 'https://example.test/immersive_geometry/immersive_geometry.html' + query });
  const document = dom.window.document;
  const callbacks = {}, definitions = {}, errors = [];
  dom.window.addEventListener('error', (event) => { errors.push(event.error); event.preventDefault(); });
  const storage = new Map(saved ? [[STORAGE_KEY, JSON.stringify(saved)]] : []);
  const localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
  const noop = () => {};
  const fakeWindow = {
    location: dom.window.location, history: { replaceState: noop },
    addEventListener: (name, callback) => { (callbacks[name] ||= []).push(callback); },
    setTimeout: () => 1, clearTimeout: noop, setInterval: () => 1, clearInterval: noop,
    confirm: () => true,
  };
  const object3D = () => ({ scale: { set: noop, setScalar: noop }, position: { set: noop }, rotation: { set: noop } });
  const evaluator = new Function('window', 'document', 'AFRAME', 'localStorage', 'setTimeout', 'clearTimeout', 'requestAnimationFrame', mainScript + '\nreturn { saved: SAVED_STATE };');
  const loaded = evaluator(fakeWindow, document, { registerComponent: (name, definition) => { definitions[name] = definition; } }, localStorage, () => 1, noop, () => 1);
  const figure = document.getElementById('figure');
  figure.object3D = object3D();
  document.getElementById('labelWrap').object3D = object3D();
  document.getElementById('rig').object3D = object3D();
  figure.emit = (name, detail) => figure.dispatchEvent(new dom.window.CustomEvent(name, { detail }));
  const targetGhost = document.createElement('a-entity'), targetLabel = document.createElement('a-entity');
  targetGhost.object3D = object3D(); targetLabel.object3D = object3D();
  const component = Object.assign({}, definitions['stretch-lab'], {
    d: 0, L: 1.6, W: 1.1, H: 1.1, axis: 0,
    ...(loaded.saved ? { d: loaded.saved.d, L: loaded.saved.L, W: loaded.saved.W, H: loaded.saved.H, axis: loaded.saved.axis } : {}),
    el: figure, history: [], future: [], targetGhost, targetLabel,
    dot: document.createElement('a-entity'), box: document.createElement('a-entity'), edgeFrame: document.createElement('a-entity'),
    clearComparison: noop, updateProjection: noop, updateSections: noop,
  });
  figure.components = { 'stretch-lab': component };
  callbacks.load[0]();
  component.emitState();
  const click = (id) => document.getElementById(id).click();
  const change = (id, value) => {
    const element = document.getElementById(id);
    if (typeof value === 'boolean') element.checked = value; else element.value = value;
    element.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  };
  return { dom, document, component, errors, click, change, saved: () => JSON.parse(storage.get(STORAGE_KEY)), close: () => dom.window.close() };
}

describe('Immersive geometry workspace modes', () => {
  it('keeps geometry and undo history intact while changing mode, and saves the choice immediately', () => {
    const lab = boot();
    try {
      lab.component.d = 2; lab.component.L = 2.45; lab.component.W = 1.7; lab.component.axis = 1;
      lab.component.history.push({ d: 1, L: 2.45, W: 1.1, H: 1.1, axis: 0 });
      lab.component.emitState();
      const before = lab.component.capture(), history = lab.component.history.slice();
      lab.click('uiModeLesson');
      expect(lab.saved().workspaceMode).toBe('lesson');
      expect(lab.document.getElementById('lessonWorkspace').hidden).toBe(false);
      expect(lab.component.activeMission).toBeTruthy();
      lab.click('uiModeFree');
      expect(lab.saved().workspaceMode).toBe('free');
      expect(lab.document.getElementById('lessonWorkspace').hidden).toBe(true);
      expect(lab.component.activeMission).toBeNull();
      expect(lab.component.targetGhost.getAttribute('visible')).toBe('false');
      expect(lab.component.capture()).toEqual(before);
      expect(lab.component.history).toEqual(history);
      expect(lab.errors).toEqual([]);
    } finally { lab.close(); }
  });

  it('snaps to lesson targets only while the lesson sequence is active', () => {
    const lab = boot();
    try {
      lab.component.d = 1; lab.component.L = 2; lab.component.emitState();
      lab.click('uiGrow');
      expect(lab.component.L).toBe(2.25);
      lab.component.endNudge(false);
      lab.component.L = 2; lab.component.emitState();
      lab.click('uiModeLesson'); lab.click('uiGrow');
      expect(lab.component.L).toBe(2.1);
      expect(lab.document.getElementById('axisTargetOut').hidden).toBe(false);
      lab.component.endNudge(false);
      lab.click('uiModeFree');
      expect(lab.document.getElementById('axisTargetOut').hidden).toBe(true);
      expect(lab.saved().completedMask & 1).toBe(1);
      expect(lab.errors).toEqual([]);
    } finally { lab.close(); }
  });

  it('shows one destination at a time and restores scene preferences on reload', () => {
    const lab = boot();
    let saved;
    try {
      lab.click('uiPanelSettings');
      expect(lab.document.getElementById('workspaceSettings').hidden).toBe(false);
      expect(lab.document.getElementById('workspaceBuild').hidden).toBe(true);
      expect(lab.document.getElementById('workspaceHelp').hidden).toBe(true);
      lab.change('uiBackdrop', 'ocean'); lab.change('uiGroundGrid', false); lab.change('uiMeasureCard', false);
      saved = lab.saved();
      expect(saved).toMatchObject({ backdrop: 'ocean', showGroundGrid: false, showMeasureCard: false });
      lab.click('uiPanelHelp');
      expect(lab.document.getElementById('workspaceHelp').hidden).toBe(false);
      expect(lab.document.getElementById('workspaceSettings').hidden).toBe(true);
      expect(lab.errors).toEqual([]);
    } finally { lab.close(); }
    const resumed = boot({ saved });
    try {
      expect(resumed.document.getElementById('uiBackdrop').value).toBe('ocean');
      expect(resumed.document.getElementById('grid').getAttribute('visible')).toBe('false');
      expect(resumed.document.getElementById('labelWrap').getAttribute('visible')).toBe('false');
      expect(resumed.document.getElementById('uiModeFree').getAttribute('aria-pressed')).toBe('true');
      expect(resumed.errors).toEqual([]);
    } finally { resumed.close(); }
  });

  it('starts free build with a calm scene while preserving saved and explicit presentation choices', () => {
    const free = boot();
    try {
      expect(free.saved()).toMatchObject({ workspaceMode: 'free', focusMode: 'explore', showMeasureCard: false });
      expect(free.document.getElementById('labelWrap').getAttribute('visible')).toBe('false');
      expect(free.errors).toEqual([]);
    } finally { free.close(); }
    const saved = boot({ saved: { v: 1, d: 2, L: 2, W: 1, H: 1, axis: 0, workspaceMode: 'free', focusMode: 'compare', showMeasureCard: true } });
    try {
      expect(saved.saved()).toMatchObject({ focusMode: 'compare', showMeasureCard: true });
      expect(saved.document.getElementById('labelWrap').getAttribute('visible')).toBe('true');
      expect(saved.errors).toEqual([]);
    } finally { saved.close(); }
    const shared = boot({ query: '?d=2&L=2&W=1&H=1&axis=0&workspace=free&focus=explain&card=1' });
    try {
      expect(shared.saved()).toMatchObject({ focusMode: 'explain', showMeasureCard: true });
      expect(shared.errors).toEqual([]);
    } finally { shared.close(); }
  });

  it('honors a workspace-only launch without replacing saved geometry', () => {
    const saved = { v: 1, d: 3, L: 3.2, W: 2.1, H: 1.8, axis: 2, workspaceMode: 'lesson', completedMask: 3 };
    const lab = boot({ saved, query: '?workspace=free' });
    try {
      expect(lab.component.capture()).toEqual({ d: 3, L: 3.2, W: 2.1, H: 1.8, axis: 2 });
      expect(lab.saved()).toMatchObject({ workspaceMode: 'free', completedMask: 3 });
      expect(lab.component.activeMission).toBeNull();
      expect(lab.errors).toEqual([]);
    } finally { lab.close(); }
  });

  it('preserves older guided sessions and accepts workspace preferences from a shared scene', () => {
    const oldSession = boot({ saved: { v: 1, d: 2, L: 2.4, W: 1.2, H: 1, axis: 1, completedMask: 3 } });
    try {
      expect(oldSession.saved().workspaceMode).toBe('lesson');
      expect(oldSession.saved().completedMask).toBe(3);
      expect(oldSession.errors).toEqual([]);
    } finally { oldSession.close(); }
    const shared = boot({ query: '?d=3&L=2.5&W=1.5&H=1.25&axis=2&workspace=free&backdrop=slate&grid=0&card=0' });
    try {
      expect(shared.component.capture()).toEqual({ d: 3, L: 2.5, W: 1.5, H: 1.25, axis: 2 });
      expect(shared.saved()).toMatchObject({ workspaceMode: 'free', backdrop: 'slate', showGroundGrid: false, showMeasureCard: false });
      expect(shared.component.activeMission).toBeNull();
      expect(shared.errors).toEqual([]);
    } finally { shared.close(); }
  });
});

describe('Immersive geometry building and presentation customization', () => {
  it('loads starter shapes as one undoable change while retaining lesson mode and progress', () => {
    const lab = boot({ saved: { v: 1, d: 1, L: 2.45, W: 1.1, H: 1.1, axis: 0, workspaceMode: 'lesson', completedMask: 3 } });
    try {
      const before = lab.component.capture();
      lab.click('uiStarterBox');
      expect(lab.component.capture()).toEqual({ d: 3, L: 3, W: 1.5, H: 1.25, axis: 2 });
      expect(lab.component.history).toEqual([before]);
      expect(lab.saved()).toMatchObject({ workspaceMode: 'lesson', completedMask: 3 });
      lab.click('uiStarterBox');
      expect(lab.component.history).toHaveLength(1);
      lab.click('uiUndo');
      expect(lab.component.capture()).toEqual(before);
      lab.click('uiRedo');
      expect(lab.component.capture()).toMatchObject({ d: 3, L: 3, W: 1.5, H: 1.25 });
      expect(lab.component.loadStarter('__proto__')).toBe(false);
      expect(lab.errors).toEqual([]);
    } finally { lab.close(); }
  });

  it('groups exact numeric edits into one undo transaction and exposes only available axes', () => {
    const lab = boot();
    try {
      lab.click('uiStarterSquare');
      expect(lab.document.getElementById('uiPickAxis0').disabled).toBe(false);
      expect(lab.document.getElementById('uiPickAxis2').disabled).toBe(true);
      expect(lab.document.getElementById('uiExactH').disabled).toBe(true);
      const field = lab.document.getElementById('uiExactL');
      lab.document.getElementById('exactDimensions').open = true;
      field.focus();
      for (const value of ['3', '3.5']) { field.value = value; field.dispatchEvent(new lab.dom.window.Event('input', { bubbles: true })); }
      field.blur();
      expect(lab.component.L).toBe(3.5);
      expect(lab.component.W).toBe(2);
      expect(lab.component.history).toHaveLength(2);
      lab.click('uiUndo');
      expect(lab.component.L).toBe(2);
      lab.click('uiRedo');
      expect(lab.component.L).toBe(3.5);
      lab.click('uiPickAxis1');
      expect(lab.component.axis).toBe(1);
      expect(lab.document.getElementById('uiPickAxis1').getAttribute('aria-pressed')).toBe('true');
      expect(lab.errors).toEqual([]);
    } finally { lab.close(); }
  });

  it('uses the selected resize step and preserves target snapping in lessons', () => {
    const lab = boot();
    try {
      lab.click('uiStarterLine');
      lab.change('uiResizeStep', '0.05');
      lab.click('uiGrow'); lab.component.endNudge(false);
      expect(lab.component.L).toBeCloseTo(2.05, 8);
      expect(lab.saved().resizeStep).toBe(0.05);
      lab.change('uiResizeStep', '0.5');
      lab.click('uiModeLesson');
      lab.click('uiGrow'); lab.component.endNudge(false);
      expect(lab.component.L).toBe(2.1);
      expect(lab.errors).toEqual([]);
    } finally { lab.close(); }
  });

  it('persists surface, color, edges, lighting, and view without changing geometry or undo history', () => {
    const lab = boot();
    let saved;
    try {
      lab.click('uiStarterCube');
      const before = lab.component.capture(), history = lab.component.history.slice();
      lab.change('uiShapeTint', 'rose'); lab.change('uiSurfaceStyle', 'glass'); lab.change('uiLighting', 'soft'); lab.change('uiShapeEdges', false);
      lab.document.querySelector('[data-view-angle="side"]').click();
      expect(lab.component.box.getAttribute('material')).toContain('color: #fb7185');
      expect(lab.component.box.getAttribute('material')).toContain('opacity: 0.32');
      expect(lab.component.box.getAttribute('material')).toContain('depthWrite: false');
      expect(lab.component.edgeFrame.getAttribute('visible')).toBe('false');
      expect(lab.component.capture()).toEqual(before);
      expect(lab.component.history).toEqual(history);
      saved = lab.saved();
      expect(saved).toMatchObject({ shapeTint: 'rose', surfaceStyle: 'glass', lighting: 'soft', showShapeEdges: false, viewAngle: 'side' });
      expect(lab.errors).toEqual([]);
    } finally { lab.close(); }
    const resumed = boot({ saved });
    try {
      expect(resumed.document.getElementById('uiShapeTint').value).toBe('rose');
      expect(resumed.document.getElementById('uiSurfaceStyle').value).toBe('glass');
      expect(resumed.document.getElementById('uiLighting').value).toBe('soft');
      expect(resumed.document.querySelector('[data-view-angle="side"]').getAttribute('aria-pressed')).toBe('true');
      expect(resumed.component.box.getAttribute('material')).toContain('color: #fb7185');
      expect(resumed.errors).toEqual([]);
    } finally { resumed.close(); }
  });

  it('shares custom presentation and resets only display choices', () => {
    const lab = boot({ query: '?d=3&L=2&W=1.5&H=1.25&axis=2&workspace=free&backdrop=paper&tint=mint&surface=wire&edges=0&light=bright&angle=front&step=0.1' });
    try {
      const before = lab.component.capture();
      expect(lab.saved()).toMatchObject({ shapeTint: 'mint', surfaceStyle: 'wire', showShapeEdges: false, lighting: 'bright', viewAngle: 'front', resizeStep: 0.1, backdrop: 'paper' });
      expect(lab.component.box.getAttribute('material')).toContain('wireframe: true');
      lab.click('uiLessonLink');
      const link = new URL(lab.document.getElementById('uiLessonUrl').value);
      expect(link.searchParams.get('tint')).toBe('mint');
      expect(link.searchParams.get('surface')).toBe('wire');
      expect(link.searchParams.get('step')).toBe('0.1');
      lab.click('uiSceneExplain');
      expect(lab.saved()).toMatchObject({ focusMode: 'explain', showMeasureCard: true, showGroundGrid: true });
      lab.click('uiResetPresentation');
      expect(lab.saved()).toMatchObject({ backdrop: 'midnight', shapeTint: 'dimension', surfaceStyle: 'solid', showShapeEdges: true, viewAngle: 'corner', resizeStep: 0.25, focusMode: 'explore', showMeasureCard: false });
      expect(lab.component.capture()).toEqual(before);
      expect(lab.component.history).toEqual([]);
      expect(lab.errors).toEqual([]);
    } finally { lab.close(); }
  });

  it('moves among practice targets without replacing the current construction', () => {
    const lab = boot();
    try {
      lab.click('uiStarterSquare'); lab.click('uiModeLesson');
      const before = lab.component.capture(), history = lab.component.history.slice();
      lab.change('uiMissionSelect', '2');
      expect(lab.saved().missionIndex).toBe(2);
      expect(lab.document.getElementById('missionGoal').textContent).toContain('2.1 × 1.6 × 1.35');
      lab.click('uiMissionNext');
      expect(lab.saved().missionIndex).toBe(3);
      expect(lab.document.getElementById('uiMissionNext').disabled).toBe(true);
      lab.click('uiMissionPrev');
      expect(lab.saved().missionIndex).toBe(2);
      expect(lab.component.capture()).toEqual(before);
      expect(lab.component.history).toEqual(history);
      expect(lab.errors).toEqual([]);
    } finally { lab.close(); }
  });
});

describe('Immersive navigation and custom materials', () => {
  it('opens each settings destination and puts keyboard focus on its summary', () => {
    const lab = boot();
    try {
      lab.click('uiPanelSettings');
      for (const button of lab.document.querySelectorAll('[data-setting-target]')) {
        const section = lab.document.getElementById(button.dataset.settingTarget);
        section.open = false; button.click();
        expect(section.open).toBe(true);
        expect(lab.document.activeElement).toBe(section.querySelector('summary'));
      }
      expect(lab.document.getElementById('sceneToolbar').closest('#hud')).toBeNull();
      expect(lab.document.querySelectorAll('[data-view-angle]')).toHaveLength(3);
      expect(lab.errors).toEqual([]);
    } finally { lab.close(); }
  });

  it('applies a custom glass material, preserves geometry/history, and restores it from storage', () => {
    const lab = boot(); let saved;
    try {
      lab.click('uiStarterCube');
      const before = lab.component.capture(), history = lab.component.history.slice();
      lab.change('uiShapeTint', 'custom'); lab.change('uiSurfaceStyle', 'glass');
      for (const [id,value] of [['uiCustomColor','#368cba'],['uiGlassOpacity','58']]) {
        const field = lab.document.getElementById(id); field.value = value;
        field.dispatchEvent(new lab.dom.window.Event('input', {bubbles:true}));
      }
      expect(lab.component.box.getAttribute('material')).toContain('color: #368cba');
      expect(lab.component.box.getAttribute('material')).toContain('opacity: 0.58');
      expect(lab.document.getElementById('customColorRow').hidden).toBe(false);
      expect(lab.document.getElementById('glassOpacityValue').textContent).toBe('58%');
      expect(lab.component.capture()).toEqual(before); expect(lab.component.history).toEqual(history);
      saved = lab.saved();
      expect(saved).toMatchObject({customColor:'#368cba',glassOpacity:.58});
      lab.change('uiSurfaceStyle','solid');
      expect(lab.document.getElementById('glassOpacityRow').hidden).toBe(true);
      expect(lab.component.box.getAttribute('material')).toContain('opacity: 1');
      expect(lab.errors).toEqual([]);
    } finally { lab.close(); }
    const resumed=boot({saved});
    try {
      expect(resumed.document.getElementById('uiCustomColor').value).toBe('#368cba');
      expect(resumed.document.getElementById('uiGlassOpacity').value).toBe('58');
      expect(resumed.component.box.getAttribute('material')).toContain('opacity: 0.58');
      expect(resumed.errors).toEqual([]);
    } finally { resumed.close(); }
  });

  it('shares custom materials and display reset restores their defaults without changing dimensions', () => {
    const lab=boot({query:'?d=3&L=2&W=1.5&H=1&axis=2&workspace=free&tint=custom&color=%23368cba&surface=glass&opacity=0.58'});
    try {
      const before=lab.component.capture();
      lab.click('uiLessonLink');
      const link=new URL(lab.document.getElementById('uiLessonUrl').value);
      expect(link.searchParams.get('color')).toBe('#368cba'); expect(link.searchParams.get('opacity')).toBe('0.58');
      lab.click('uiResetPresentation');
      expect(lab.saved()).toMatchObject({shapeTint:'dimension',customColor:'#a78bfa',glassOpacity:.32});
      expect(lab.component.capture()).toEqual(before); expect(lab.component.history).toEqual([]);
      expect(lab.errors).toEqual([]);
    } finally { lab.close(); }
  });

  it('normalizes malformed custom settings from old storage and launch links', () => {
    for (const [color,opacity,expected] of [['invalid','nope',.32],['#abc',99,.9],['red',-2,.1]]) {
      const lab=boot({query:'?d=3&L=2&W=1&H=1&tint=custom&color='+encodeURIComponent(color)+'&surface=glass&opacity='+opacity});
      try {
        expect(lab.saved()).toMatchObject({customColor:'#a78bfa',glassOpacity:expected});
        expect(lab.errors).toEqual([]);
      } finally { lab.close(); }
    }
  });

  it('switches workspace and scene focus through the headset panel without changing geometry', () => {
    const lab=boot({query:'?d=3&L=2&W=1.5&H=1&axis=2&workspace=free'});
    try {
      const before=lab.component.capture();
      const scene=lab.document.querySelector('a-scene');
      scene.dispatchEvent(new lab.dom.window.Event('enter-vr'));
      expect(lab.document.getElementById('sceneToolbar').hidden).toBe(true);
      for(const id of ['vrWorkspace','vrFocus','vrCenter'])expect(lab.document.getElementById(id).getAttribute('tabindex')).toBe('0');
      lab.click('vrWorkspace'); expect(lab.saved().workspaceMode).toBe('lesson');
      expect(lab.document.getElementById('vrWorkspaceText').getAttribute('value')).toBe('Lessons');
      lab.click('vrFocus'); expect(lab.saved().focusMode).toBe('explain');
      lab.click('vrFocus'); expect(lab.saved().focusMode).toBe('compare');
      lab.click('vrWorkspace'); expect(lab.saved().workspaceMode).toBe('free');
      expect(lab.component.capture()).toEqual(before);expect(lab.component.history).toEqual([]);
      scene.dispatchEvent(new lab.dom.window.Event('exit-vr'));
      expect(lab.document.getElementById('sceneToolbar').hidden).toBe(false);
      for(const id of ['vrWorkspace','vrFocus','vrCenter'])expect(lab.document.getElementById(id).getAttribute('tabindex')).toBe('-1');
      expect(lab.errors).toEqual([]);
    } finally { lab.close(); }
  });
});

describe('Immersive headset comfort preferences', () => {
  it('applies presets and custom placement without changing geometry or undo history', () => {
    const lab=boot();
    try {
      lab.click('uiStarterCube'); const before=lab.component.capture(),history=lab.component.history.slice();
      lab.click('uiComfortSeated');
      expect(lab.saved()).toMatchObject({panelDistance:1.35,panelSize:.72,panelHeight:-.15});
      expect(lab.document.getElementById('uiComfortSeated').getAttribute('aria-pressed')).toBe('true');
      expect(lab.document.getElementById('vrComfortText').getAttribute('value')).toBe('Seated');
      lab.change('uiPanelHeight','-0.55');
      expect(lab.saved().panelHeight).toBe(-.55);
      expect(lab.document.getElementById('vrComfortText').getAttribute('value')).toBe('Custom');
      expect([...lab.document.querySelectorAll('[data-comfort]')].every(e=>e.getAttribute('aria-pressed')==='false')).toBe(true);
      expect(lab.component.capture()).toEqual(before);expect(lab.component.history).toEqual(history);expect(lab.errors).toEqual([]);
    }finally{lab.close();}
  });
  it('restores and shares comfort preferences and resets them with display settings',()=>{
    const lab=boot({query:'?d=3&L=2&W=1&H=1&workspace=free&paneldistance=2.25&panelsize=1.08&panelheight=-0.55'});
    let saved;
    try{
      saved=lab.saved();expect(saved).toMatchObject({panelDistance:2.25,panelSize:1.08,panelHeight:-.55});
      lab.click('uiLessonLink');const link=new URL(lab.document.getElementById('uiLessonUrl').value);
      expect(link.searchParams.get('paneldistance')).toBe('2.25');expect(link.searchParams.get('panelsize')).toBe('1.08');expect(link.searchParams.get('panelheight')).toBe('-0.55');
      const before=lab.component.capture();lab.click('uiResetPresentation');
      expect(lab.saved()).toMatchObject({panelDistance:1.75,panelSize:.88,panelHeight:-.3});expect(lab.component.capture()).toEqual(before);expect(lab.errors).toEqual([]);
    }finally{lab.close();}
    const restored=boot({saved});try{expect(restored.document.getElementById('uiPanelHeight').value).toBe('-0.55');expect(restored.document.getElementById('uiPanelDistance').value).toBe('2.25');expect(restored.errors).toEqual([]);}finally{restored.close();}
  });
  it('cycles comfort presets from the headset panel and uses safe defaults for malformed links',()=>{
    const lab=boot({query:'?d=3&L=2&W=1&H=1&workspace=free&paneldistance=99&panelsize=nope&panelheight=8'});
    try{
      expect(lab.saved()).toMatchObject({panelDistance:1.75,panelSize:.88,panelHeight:-.3});
      const before=lab.component.capture();
      for(const label of ['Seated','Spacious','Standing']){lab.click('vrComfort');expect(lab.document.getElementById('vrComfortText').getAttribute('value')).toBe(label);}
      expect(lab.component.capture()).toEqual(before);expect(lab.component.history).toEqual([]);expect(lab.errors).toEqual([]);
    }finally{lab.close();}
  });
});

describe('Immersive deliberate exact edits and quick control navigation',()=>{
  it('keeps typing as a draft, cancels with Escape, and commits once with Enter',()=>{
    const lab=boot();try{
      lab.click('uiStarterCube');lab.document.getElementById('exactDimensions').open=true;
      const field=lab.document.getElementById('uiExactL');field.focus();const before=lab.component.capture(),history=lab.component.history.slice();
      field.value='2.75';field.dispatchEvent(new lab.dom.window.Event('input',{bubbles:true}));
      expect(lab.component.capture()).toEqual(before);expect(lab.component.history).toEqual(history);
      field.dispatchEvent(new lab.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
      expect(lab.component.capture()).toEqual(before);expect(lab.component.history).toEqual(history);
      field.focus();field.value='2.75';field.dispatchEvent(new lab.dom.window.Event('input',{bubbles:true}));
      field.dispatchEvent(new lab.dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
      expect(lab.component.L).toBe(2.75);expect(lab.component.history).toHaveLength(history.length+1);
      lab.click('uiUndo');expect(lab.component.capture()).toEqual(before);lab.click('uiRedo');expect(lab.component.L).toBe(2.75);
      expect(lab.errors).toEqual([]);
    }finally{lab.close();}
  });
  it('rejects invalid edits and does not round untouched exact fields',()=>{
    const lab=boot();try{
      lab.click('uiStarterCube');lab.component.L=2.345;lab.component.emitState();lab.document.getElementById('exactDimensions').open=true;
      const field=lab.document.getElementById('uiExactL');field.focus();field.blur();expect(lab.component.L).toBe(2.345);
      field.focus();const history=lab.component.history.slice();field.value='9';field.dispatchEvent(new lab.dom.window.Event('input',{bubbles:true}));field.dispatchEvent(new lab.dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
      expect(lab.document.activeElement).toBe(field);expect(field.getAttribute('aria-invalid')).toBe('true');expect(lab.component.L).toBe(2.345);
      field.blur();expect(field.getAttribute('aria-invalid')).toBeNull();expect(lab.component.L).toBe(2.345);expect(lab.component.history).toEqual(history);expect(lab.errors).toEqual([]);
    }finally{lab.close();}
  });
  it('keeps Build and Settings resize-step controls synchronized without creating geometry history',()=>{
    const lab=boot();try{
      expect(lab.document.getElementById('uiBuildStep').disabled).toBe(true);lab.click('uiStarterLine');const history=lab.component.history.slice();
      lab.change('uiBuildStep','0.05');expect(lab.document.getElementById('uiResizeStep').value).toBe('0.05');expect(lab.saved().resizeStep).toBe(.05);expect(lab.component.history).toEqual(history);
      lab.click('uiGrow');lab.component.endNudge(false);expect(lab.component.L).toBeCloseTo(2.05);
      lab.change('uiResizeStep','0.5');expect(lab.document.getElementById('uiBuildStep').value).toBe('0.5');expect(lab.errors).toEqual([]);
    }finally{lab.close();}
  });
  it('filters navigation destinations, opens the selected section, and restores focus on cancel',()=>{
    const lab=boot();try{
      const dialog=lab.document.getElementById('quickFindDialog');dialog.showModal=function(){this.open=true;};dialog.close=function(){this.open=false;};
      lab.click('uiStarterCube');const before=lab.component.capture(),history=lab.component.history.slice();
      const trigger=lab.document.getElementById('uiQuickFind');trigger.focus();trigger.click();expect(dialog.open).toBe(true);
      const input=lab.document.getElementById('uiFindInput');input.value='glass';input.dispatchEvent(new lab.dom.window.Event('input',{bubbles:true}));
      expect(lab.document.getElementById('quickFindResults').children).toHaveLength(1);
      input.dispatchEvent(new lab.dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));expect(dialog.open).toBe(false);expect(lab.document.getElementById('workspaceSettings').hidden).toBe(false);expect(lab.document.getElementById('appearanceSettings').open).toBe(true);
      trigger.focus();trigger.click();input.value='no matching destination';input.dispatchEvent(new lab.dom.window.Event('input',{bubbles:true}));expect(lab.document.getElementById('quickFindEmpty').hidden).toBe(false);
      dialog.dispatchEvent(new lab.dom.window.Event('cancel',{cancelable:true}));expect(dialog.open).toBe(false);expect(lab.document.activeElement).toBe(trigger);
      expect(lab.component.capture()).toEqual(before);expect(lab.component.history).toEqual(history);expect(lab.errors).toEqual([]);
    }finally{lab.close();}
  });
});
