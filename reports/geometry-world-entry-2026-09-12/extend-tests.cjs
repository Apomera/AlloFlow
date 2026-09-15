const fs=require('node:fs');
const file='tests/geometry_world_home_chooser.test.js';
let source=fs.readFileSync(file,'utf8');
source=source.replace("it('does not interrupt a pending Print Lab return or build handoff'", "it('bypasses Home only for an explicit return, not a saved Print Lab backup'");
source=source.replace("expect(m2.bucket().showGeometryHome).not.toBe(true);", "expect(m2.bucket().showGeometryHome).toBe(true);");
const more=`
  it('does not open Home after a pending return has been consumed', () => {
    window.__alloGeometryWorldPendingBuild = {projectId:'returning'};
    const m=mountTool(cfg,{worldActive:true,_introShownOnce:true});
    delete window.__alloGeometryWorldPendingBuild;
    m.set({worldActive:true,showGeometryHome:false});
    m.rerender();
    expect(m.bucket().showGeometryHome).toBe(false);
    m.unmount();
  });

  it('resets a persisted subpage and stale modal flags on a new visit', () => {
    const m=mountTool(cfg,{worldActive:true,showGeometryHome:true,geometryHomePage:'create',showGameSettings:true,showLessonIntro:true,creatorMode:true});
    expect(m.bucket().geometryHomePage).toBe('start');
    expect(m.bucket().showGameSettings).toBe(false);
    expect(m.bucket().showLessonIntro).toBe(false);
    expect(m.bucket().creatorMode).toBe(false);
    expect(m.container.querySelectorAll('.gwe-home-card')).toHaveLength(4);
    m.unmount();
  });

  it('upgrades a fallback intro when the enhancement becomes available', () => {
    const pure=window.StemLab.geometryWorldBuilderPure;
    let m;
    try {
      delete window.StemLab.geometryWorldBuilderPure;
      m=mountTool(cfg,{});
      expect(m.bucket().showLessonIntro).toBe(true);
      window.StemLab.geometryWorldBuilderPure=pure;
      m.rerender();
      expect(m.bucket().showGeometryHome).toBe(true);
      expect(m.bucket().showLessonIntro).toBe(false);
    } finally {window.StemLab.geometryWorldBuilderPure=pure;if(m)m.unmount();}
  });

  it('falls back to the main menu for an unknown saved page', () => {
    const m=mountTool(cfg,{worldActive:true});
    m.set({geometryHomePage:'obsolete-page'});
    expect(m.container.querySelectorAll('.gwe-home-card')).toHaveLength(4);
    expect(m.container.querySelector('nav[aria-label="Geometry World modes"]')).toBeTruthy();
    m.unmount();
  });

  it('returns keyboard focus to the mode used to enter a subpage', () => {
    const m=mountTool(cfg,{worldActive:true});
    React.act(()=>m.container.querySelector('[data-path="build"]').click());
    expect(m.bucket().geometryHomePage).toBe('build');
    React.act(()=>m.container.querySelector('.gwe-home-back').click());
    expect(document.activeElement).toBe(m.container.querySelector('[data-path="build"]'));
    m.unmount();
  });

  it('keeps Garden out of the lesson selector even when it was saved as the chosen lesson', () => {
    const m=mountTool(cfg,{worldActive:true,geometryHomeLesson:'geometryGarden'});
    React.act(()=>m.container.querySelector('[data-path="learn"]').click());
    const select=m.container.querySelector('#gwe-home-lesson');
    expect(select.value).not.toBe('geometryGarden');
    expect(select.value).not.toBe('');
    expect(m.container.querySelector('.gwe-home-preview h2').textContent).toBe(select.selectedOptions[0].textContent);
    m.unmount();
  });
`;
const index=source.lastIndexOf('});');
source=source.slice(0,index)+more+source.slice(index);
const fd=fs.openSync(file,'r+');try{const bytes=Buffer.from(source);fs.writeSync(fd,bytes);fs.ftruncateSync(fd,bytes.length);}finally{fs.closeSync(fd);}
// Reuse the established native-browser checks in a new evidence directory.
fs.copyFileSync('reports/geometry-world-home-2026-09-10/verify-home.cjs','reports/geometry-world-entry-2026-09-12/verify-home.cjs');
console.log('Extended lifecycle/navigation coverage and copied the browser harness.');
