import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const sandbox = { module: { exports: {} } };
vm.runInNewContext(readFileSync('stem_lab/kitchen_studio/kitchen_studio_engine.js', 'utf8'), sandbox);
const K = sandbox.module.exports;
const play = (id, actions, mode = 'demonstrate') => actions.reduce((s, a) => K.act(s, a), K.start(id, mode));
const paths = {
  prep: ['wash', 'board', 'prepare'],
  knife: ['secure', 'claw', 'dice'],
  heat: ['dry', 'spread', 'medium', 'advance', 'advance', 'advance', 'plate'],
  probe: ['thick', 'cook', 'cook', 'cook', 'read', 'serve'],
  measure: ['add150', 'add150', 'add150', 'check'],
  chill: ['shallow', 'label', 'chill']
};
describe('Kitchen Studio action evidence', () => {
  for (const [id, actions] of Object.entries(paths)) {
    it(`${id}: completes and requires reasoning before submission`, () => {
      const s = play(id, actions);
      expect(s.done).toBe(true);
      expect(K.submit(s).submitted).toBe(false);
      const final = K.submit({ ...s, answer: K.mission(id).correct });
      expect(final.submitted).toBe(true);
      expect(K.evidence(final).status).toBe('Completed independently');
      expect(K.act(final, actions[0])).toBe(final);
      expect(K.submit(final)).toBe(final);
    });
  }
  it('keeps coached practice separate from independent demonstration', () => {
    const s = play('prep', paths.prep, 'practice');
    expect(K.evidence(K.submit({ ...s, answer: 1 })).status).toBe('Practice completed with coaching');
  });
  it('bounds attempts without deleting the action evidence', () => {
    let s = K.start('measure');
    for (let i = 0; i < 501; i++) s = K.act(s, 'add50');
    expect(s.log).toHaveLength(500);
    expect(s.values.ml).toBe(1000);
  });
  it('never mutates the previous state or evidence', () => {
    const before = K.start('prep');
    const after = K.act(before, 'wash');
    expect(before.values).toEqual({}); expect(before.log).toHaveLength(0);
    expect(after.values.washed).toBe(true);
    const next = K.act(after, 'rinse');
    expect(after.log[0].values.washed).toBe(true);
    expect(next.values.washed).toBe(false);
  });
  it('rejects cross-contaminated preparation and unsafe knife setup', () => {
    expect(play('prep', ['wash', 'reuse', 'prepare']).done).toBe(false);
    expect(play('prep', ['rinse', 'board', 'prepare']).done).toBe(false);
    expect(play('knife', ['dice']).done).toBe(false);
    expect(play('knife', ['secure', 'flat', 'dice']).done).toBe(false);
  });
  it('models wet/crowded pans and irreversible burning', () => {
    expect(play('heat', ['medium', 'advance', 'advance', 'advance', 'plate']).done).toBe(false);
    expect(play('heat', ['dry', 'crowd', 'medium', 'advance', 'advance', 'advance']).values.brown).toBeUndefined();
    const burned = play('heat', ['dry', 'spread', 'high', 'advance', 'advance', 'advance', 'plate']);
    expect(burned.values.brown).toBe(6); expect(burned.done).toBe(false);
    expect(K.act(burned, 'medium').values.brown).toBe(6);
  });
  it('blocks early service, surface-only readings and stale readings', () => {
    for (const steps of [ ['serve'], ['thick', 'read', 'serve'], ['surface', 'read', 'serve'], ['thick', 'cook', 'cook', 'read', 'serve'], ['thick', 'read', 'cook', 'cook', 'cook', 'serve'] ]) expect(play('probe', steps).done).toBe(false);
    expect(play('probe', paths.probe).values.reading).toBe(165);
  });
  it('allows measurement correction without erasing the earlier error', () => {
    const s = play('measure', ['add150', 'check', 'add150', 'add150', 'check']);
    expect(s.done).toBe(true); expect(K.evidence(s).corrections).toBe(1);
    expect(play('measure', ['remove50']).values.ml).toBe(0);
  });
  it('does not allow refrigeration to undo excessive time on the counter', () => {
    const s = play('chill', ['wait', 'shallow', 'label', 'chill', 'discard']);
    expect(s.done).toBe(false); expect(s.values.discarded).toBe(true);
    expect(s.values.chilled).not.toBe(true);
  });
  it('does not turn hints or corrected actions into independent completion', () => {
    const s = play('prep', ['prepare', ...paths.prep]);
    expect(K.evidence(K.submit({ ...s, answer: 1 })).status).toBe('Completed with support');
    expect(K.evidence(K.submit({ ...play('prep', paths.prep), hints: 1, answer: 1 })).status).toBe('Completed with support');
    expect(K.evidence(K.submit({ ...play('prep', paths.prep), answer: 0 })).status).toBe('Revisit reasoning');
  });
  it('cannot submit an empty, invalid, or incomplete response', () => {
    for (const answer of [null, -1, 3, '1', NaN]) expect(K.submit({ ...play('prep', paths.prep), answer }).submitted).toBe(false);
    expect(K.submit({ ...K.start('prep'), answer: 1 }).submitted).toBe(false);
    const s = K.start('prep'); expect(K.act(s, 'injected')).toBe(s);
  });
  it('mirrors every deployable studio asset and registers the companion folder', () => {
    for (const name of ['index.html', 'kitchen_studio.css', 'kitchen_studio.js', 'kitchen_studio_engine.js', 'kitchen_studio_service.js']) expect(readFileSync('desktop/web-app/public/stem_lab/kitchen_studio/' + name, 'utf8')).toBe(readFileSync('stem_lab/kitchen_studio/' + name, 'utf8'));
    const build = readFileSync('build.js', 'utf8'); expect(build).toContain("'stem_lab/kitchen_studio'"); expect(build).toContain("'vendor/three-r128'");
  });
});

describe('Existing Kitchen Lab poultry safety regression', () => {
  // Load the real recipes through a test-only export at their registration seam.
  const source = readFileSync('stem_lab/stem_tool_kitchenlab.js', 'utf8');
  const local = { window: { StemLab: { isRegistered: () => false, registerTool: () => {} } }, document: { getElementById: () => true }, console };
  vm.runInNewContext(source.replace("window.StemLab.registerTool('kitchenLab', {", "window.recipeTest = RECIPES; window.StemLab.registerTool('kitchenLab', {"), local);
  const recipes = Object.values(local.window.recipeTest).filter(r => r.id === 'roastChicken' || r.steps.some(s => s.target?.foodInternalF?.min === 165));
  it('finds both poultry recipes and requires 165°F for automatic completion', () => {
    expect(recipes).toHaveLength(2);
    recipes.forEach(r => expect(r.steps.find(s => s.completeWhen === 'internalTempReached').target.foodInternalF.min).toBe(165));
  });
  for (const temp of [150, 155, 158, 160, 164, 164.9]) {
    it(`rejects ${temp}°F in both poultry judges`, () => {
      recipes.forEach(r => { const j = r.judge({ foodInternalF: temp, maxPanTempF: 425, activeTimeSec: 4500, heatRemovedAt: 1 }); expect(j.score).toBeLessThan(50); expect(j.grade).toBe('F'); expect(j.notes.some(n => n.neg && n.label.includes('FOOD SAFETY'))).toBe(true); });
    });
  }
  it('accepts the measured 165°F boundary', () => {
    recipes.forEach(r => { const j = r.judge({ foodInternalF: 165, maxPanTempF: 425, activeTimeSec: 4500, heatRemovedAt: 1 }); expect(j.notes.some(n => n.neg && n.label.includes('FOOD SAFETY'))).toBe(false); });
  });
});
