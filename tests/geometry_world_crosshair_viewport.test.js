import {afterEach,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {React,ReactDOMClient,makeCtx,resetStemLab,loadTool} from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const fixtureSource=readFileSync('tests/geometry_world_discoverability.test.js','utf8');
const start=fixtureSource.indexOf('function makeThreeStub()'),end=fixtureSource.indexOf("describe('mounted affordances'",start);
if(start<0||end<start)throw Error('Mounted Geometry World fixture not found');
const helpers=new Function('React','ReactDOMClient','makeCtx',fixtureSource.slice(start,end)+';return {makeThreeStub,fakeEngine,mountTool};')(React,ReactDOMClient,makeCtx);
let cfg,mount;
beforeAll(()=>{resetStemLab();window.THREE=helpers.makeThreeStub();cfg=loadTool('stem_lab/stem_tool_geometryworld.js','geometryWorld');});
beforeEach(()=>{window.THREE=helpers.makeThreeStub();window.__geoWorldEngine=helpers.fakeEngine();});
afterEach(()=>{mount?.unmount();mount=null;delete window.__geoWorldEngine;document.body.innerHTML='';});

describe('crosshair shares the rendered camera viewport',()=>{
  it('keeps the actual aim node inside the positioned viewport when the toolbar changes',()=>{
    mount=helpers.mountTool(cfg,{worldActive:true,activeLesson:'builderSandbox',_introShownOnce:true,tutorialDismissed:true,showLessonIntro:false});
    mount.rerender();
    const viewport=mount.container.querySelector('#geoworld-fs-wrap');
    const crosshair=mount.container.querySelector('.gw-crosshair');
    expect(viewport).toBeTruthy();expect(viewport.style.position).toBe('relative');
    expect(crosshair.parentElement).toBe(viewport);
    expect(crosshair.style.top).toBe('50%');expect(crosshair.style.left).toBe('50%');expect(crosshair.style.transform).toBe('translate(-50%,-50%)');
    expect(crosshair.style.pointerEvents).toBe('none');expect(crosshair.getAttribute('aria-hidden')).toBe('true');
    mount.bucket().toolbarCollapsed=true;mount.rerender();
    expect(mount.container.querySelectorAll('.gw-crosshair')).toHaveLength(1);
    expect(mount.container.querySelector('.gw-crosshair')).toBe(crosshair);expect(crosshair.parentElement).toBe(viewport);
  });
});
