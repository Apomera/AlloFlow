import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let host, root, cfg, latest;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  cfg = loadTool(process.env.NUCLEAR_STUDIO_CANDIDATE || 'stem_lab/stem_tool_nuclearlab.js', 'nuclearLab');
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  host = document.createElement('div');
  document.body.appendChild(host);
});
afterEach(() => {
  if (root) React.act(() => root.unmount());
  root = null;
  host.remove();
  vi.restoreAllMocks();
});
function mount(state = {}, overrides = {}) {
  function Panel() {
    const [toolData, setToolData] = React.useState({ _nuclearLab: state, otherTool: { kept: true } });
    latest = toolData;
    return cfg.render(makeCtx({ toolData, setToolData, ...overrides }));
  }
  React.act(() => { root = ReactDOMClient.createRoot(host); root.render(React.createElement(Panel)); });
}
function named(name, within = host) {
  const button = [...within.querySelectorAll('button')].find(node => node.textContent.trim() === name);
  expect(button, 'Missing button: ' + name).toBeTruthy();
  return button;
}
function click(name, within) {
  const button = named(name, within);
  expect(button.disabled, name + ' unexpectedly disabled').toBe(false);
  React.act(() => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}
function mission(id) {
  const button = host.querySelector('[data-ns-mission="' + id + '"]');
  host.querySelector('.ns-chooser').open = true;
  React.act(() => button.click());
}
function predictShield(id) { click(id, host.querySelector('[aria-label="Predict a shielding material"]')); }
function setMaterial(id) { click(id, host.querySelector('[aria-label="Material to test"]')); }

describe('Nuclear Lab experiment studio', () => {
  it('opens a compact experiment instead of mounting all 22 topic panels', () => {
    host.innerHTML = renderTool('nuclearLab', {});
    expect(host.querySelector('[data-nk-studio]')).toBeTruthy();
    expect(host.querySelectorAll('[data-nk-sec]')).toHaveLength(0);
    expect(host.querySelectorAll('.ns-atom')).toHaveLength(64);
    expect(host.querySelectorAll('.ns-atom[data-decayed="true"]')).toHaveLength(0);
    expect(host.querySelector('.ns-chooser').open).toBe(false);
    expect(host.querySelectorAll('[data-ns-mission]')).toHaveLength(6);
    expect(host.querySelector('.ns-progress').textContent).toContain('0 / 6');
    expect(named('Advance one half-life →').disabled).toBe(true);
  });
  it('requires a prediction, records each interval, and supports revising an explanation', () => {
    mount();
    click('32');
    click('Advance one half-life →');
    expect(host.querySelectorAll('.ns-atom[data-decayed="true"]')).toHaveLength(32);
    expect(named('16').disabled).toBe(true);
    expect(host.querySelector('[data-ns-explain]')).toBeNull();
    click('Advance one half-life →');
    expect(host.querySelectorAll('.ns-atom[data-decayed="true"]')).toHaveLength(48);
    expect(host.querySelector('.ns-result').textContent).toContain('you predicted 32');
    expect([...host.querySelectorAll('[data-ns-notebook] tbody td')].map(node => node.textContent)).toEqual(['64', '32', '16']);
    expect(latest._nuclearLab.nkStudio.completed).toBeUndefined();
    click('Each interval removes 32 atoms, every time.');
    expect(latest._nuclearLab.nkStudio.completed).toBeUndefined();
    click('Each interval halves the atoms still remaining.');
    expect(latest._nuclearLab.nkStudio.completed).toEqual(['decay']);
    click('Each interval halves the atoms still remaining.');
    expect(latest._nuclearLab.nkStudio.completed).toEqual(['decay']);
  });
  it('caps the stepping model and resets the sample without erasing a recorded discovery', () => {
    mount({ nkStudio: { completed: ['decay'], decay: { prediction: 16, step: 3 } } });
    click('Advance one half-life →');
    expect(named('Four half-lives observed').disabled).toBe(true);
    expect(host.querySelectorAll('.ns-atom[data-decayed="false"]')).toHaveLength(4);
    click('Reset sample');
    expect(latest._nuclearLab.nkStudio.decay).toMatchObject({ prediction: null, step: 0 });
    expect(latest._nuclearLab.nkStudio.completed).toEqual(['decay']);
  });
  it('runs real attenuation calculations and keeps the last reading distinct from draft settings', () => {
    mount(); mission('shield');
    expect(named('Test this shield →').disabled).toBe(true);
    predictShield('Lead');
    click('Test this shield →');
    expect(host.querySelector('[data-ns-reading]').textContent).toBe('86.8%');
    setMaterial('Lead');
    expect(host.querySelector('[data-ns-reading]').textContent).toBe('86.8%');
    expect(host.textContent).toContain('Settings changed. Test again');
    click('Test this shield →');
    expect(host.querySelector('[data-ns-reading]').textContent).toBe('21.4%');
    expect(host.querySelector('[data-ns-explain="shield"]')).toBeTruthy();
    click('At the same thickness, different materials transmit different amounts.');
    expect(latest._nuclearLab.nkStudio.completed).toEqual(['shield']);
    click('Continue: One count, or a pattern? →');
    expect(latest._nuclearLab.nkStudio.mission).toBe('counting');
  });
  it('does not count repeated identical runs or unequal thicknesses as a fair comparison', () => {
    mount({ nkStudio: { mission: 'shield', shield: { prediction: 'lead', material: 'water', thickness: 2, trials: [{ material: 'water', thickness: 2 }, { material: 'lead', thickness: 1 }] } } });
    expect(host.querySelector('[data-ns-explain]')).toBeNull();
    click('Test this shield →');
    expect(latest._nuclearLab.nkStudio.shield.trials).toHaveLength(2);
    expect(host.querySelector('[data-ns-explain]')).toBeNull();
    setMaterial('Lead'); click('Test this shield →');
    expect(host.querySelector('[data-ns-explain]')).toBeTruthy();
  });
  it('treats zero thickness as an unshielded beam, not a material comparison', () => {
    mount({ nkStudio: { mission: 'shield', shield: { prediction: 'lead', thickness: 0 } } });
    click('Test this shield →'); setMaterial('Lead'); click('Test this shield →');
    expect(host.querySelector('[data-ns-reading]').textContent).toBe('100.0%');
    expect(host.querySelector('[data-ns-explain]')).toBeNull();
  });
  it('retains both experiments and other saved lab work when changing views', () => {
    mount({ evidenceMastered: ['short-count'], nkReflections: { know: { idea: 'Saved idea' } } });
    click('16'); click('Advance one half-life →'); mission('shield');
    expect(document.activeElement).toBe(host.querySelector('.ns-heading h4'));
    predictShield('Concrete'); click('Test this shield →');
    click('All topics & routes');
    expect(host.querySelectorAll('[data-nk-sec]').length).toBeGreaterThan(20);
    expect(document.activeElement.getAttribute('aria-label')).toBe('All topics & routes');
    click('Experiment studio'); mission('decay');
    expect(host.querySelectorAll('.ns-atom[data-decayed="true"]')).toHaveLength(32);
    expect(latest.otherTool).toEqual({ kept: true });
    expect(latest._nuclearLab.evidenceMastered).toEqual(['short-count']);
    expect(latest._nuclearLab.nkReflections.know.idea).toBe('Saved idea');
    expect(latest._nuclearLab.nkStudio.shield.trials).toHaveLength(1);
  });
  it('opens only the reactor topic from the control-room shortcut', () => {
    mount(); click('Reactor control room');
    expect([...host.querySelectorAll('[data-nk-sec]')].map(node => node.dataset.nkSec)).toEqual(['operate']);
    expect(host.querySelector('.nk-topic-nav')).toBeNull();
    expect(host.querySelector('#rx-rods')).toBeTruthy();
    click('Experiment studio');
    expect(host.querySelector('#rx-rods')).toBeNull();
  });
  it('resumes a saved question route in the reference view', () => {
    host.innerHTML = renderTool('nuclearLab', { _nuclearLab: { nkPath: 'know' } });
    expect(host.querySelector('[data-nk-studio]')).toBeNull();
    expect([...host.querySelectorAll('[data-nk-sec]')].map(node => node.dataset.nkSec)).toEqual(['detect', 'dating', 'chain', 'evidence']);
  });
  it('continues from a discovery to the next introduction with focus on its question', () => {
    mount({ nkStudio: { decay: { prediction: 16, step: 2 } } });
    click('Each interval halves the atoms still remaining.');
    click('Continue: Give it some space →');
    expect(latest._nuclearLab.nkStudio.mission).toBe('distance');
    expect(document.activeElement).toBe(host.querySelector('.ns-heading h4'));
    expect(latest._nuclearLab.nkStudio.completed).toEqual(['decay']);
  });
  it('closes the chooser and keeps focus when the current experiment is selected again', () => {
    mount(); mission('decay');
    expect(host.querySelector('.ns-chooser').open).toBe(false);
    expect(document.activeElement).toBe(host.querySelector('.ns-heading h4'));
  });
  it('calculates inverse-square readings and keeps draft distance separate from measured distance', () => {
    mount(); mission('distance');
    expect(named('Take a reading →').disabled).toBe(true);
    click('Half as much');
    click('Take a reading →');
    expect(host.querySelector('[data-ns-reading]').textContent).toBe('100%');
    click('2 m');
    expect(host.querySelector('[data-ns-reading]').textContent).toBe('100%');
    expect(host.textContent).toContain('Distance changed.');
    click('Take a reading →');
    expect(host.querySelector('[data-ns-reading]').textContent).toBe('25%');
    expect(host.querySelector('[data-ns-explain="distance"]')).toBeTruthy();
    click('4 m'); click('Take a reading →');
    expect(host.querySelector('[data-ns-reading]').textContent).toBe('6.25%');
    expect([...host.querySelectorAll('[data-ns-notebook] tbody td')].map(node => node.textContent)).toEqual(['100%', '25%', '6.25%']);
    click('Moving the detector makes the source emit less.');
    expect(latest._nuclearLab.nkStudio.completed).toBeUndefined();
    click('The same output spreads over a larger area.');
    expect(latest._nuclearLab.nkStudio.completed).toEqual(['distance']);
    click('Continue: What can paper stop? →');
    expect(latest._nuclearLab.nkStudio.mission).toBe('rays');
  });
  it('requires the 1 m and 2 m comparison rather than repeated readings at one distance', () => {
    mount({ nkStudio: { mission: 'distance' } });
    click('One quarter'); click('Take a reading →'); click('Take a reading →');
    expect(latest._nuclearLab.nkStudio.distance.runs).toEqual([1]);
    expect(host.querySelector('[data-ns-explain]')).toBeNull();
    click('4 m'); click('Take a reading →');
    expect(host.querySelector('[data-ns-explain]')).toBeNull();
  });
  it('steps a steady and a shrinking chain, requiring two complete runs before explaining', () => {
    mount(); mission('chain');
    expect(named('Advance one generation →').disabled).toBe(true);
    click('It stays steady');
    for (let i = 0; i < 4; i++) click('Advance one generation →');
    expect(host.querySelector('[data-ns-reading]').textContent).toBe('20.0');
    expect(named('Four generations observed').disabled).toBe(true);
    expect(host.querySelector('[data-ns-explain]')).toBeNull();
    click('0.8 · Fewer');
    for (let i = 0; i < 3; i++) click('Advance one generation →');
    expect(host.querySelector('[data-ns-explain]')).toBeNull();
    click('Advance one generation →');
    expect(host.querySelector('[data-ns-reading]').textContent).toBe('8.2');
    expect([...host.querySelectorAll('[data-ns-notebook] tbody td')].map(node => node.textContent)).toEqual(['20.0', '8.2']);
    click('A steady chain has stopped reacting.');
    expect(latest._nuclearLab.nkStudio.completed).toBeUndefined();
    click('A steady chain keeps producing new reactions.');
    expect(latest._nuclearLab.nkStudio.completed).toEqual(['chain']);
    click('Continue to the reactor →');
    expect(latest._nuclearLab.nkView).toBe('reactor');
    expect(host.querySelector('#rx-rods')).toBeTruthy();
  });
  it('computes a growing chain without allowing duplicate runs to unlock the explanation', () => {
    mount({ nkStudio: { mission: 'chain', chain: { prediction: 'steady', setting: 1.2, step: 3, runs: [1.2, 1.2] } } });
    click('Advance one generation →');
    expect(host.querySelector('[data-ns-reading]').textContent).toBe('41.5');
    expect(latest._nuclearLab.nkStudio.chain.runs).toEqual([1.2]);
    expect(host.querySelector('[data-ns-explain]')).toBeNull();
  });
  it('resumes the previous four discoveries and retains observations across view changes', () => {
    mount({ nkStudio: { mission: 'distance', completed: ['decay', 'distance', 'shield', 'chain'], distance: { prediction: 'quarter', setting: 2, runs: [1, 2], explanation: 'correct' } } });
    expect(host.querySelector('.ns-progress').textContent).toContain('4 / 6');
    click('All topics & routes'); click('Experiment studio');
    expect(host.querySelector('[data-ns-reading]').textContent).toBe('25%');
    click('Start again');
    expect(latest._nuclearLab.nkStudio.distance.runs).toEqual([]);
    expect(latest._nuclearLab.nkStudio.completed).toHaveLength(4);
  });
  it.each(['distance', 'chain'])('sanitizes damaged %s settings and observations', kind => {
    mount({ nkStudio: { mission: kind, [kind]: { setting: Infinity, step: NaN, prediction: {}, runs: [null, -2, Infinity, {}, '1'] } } });
    expect(host.querySelector('[data-ns-explain]')).toBeNull();
    expect(host.textContent).not.toMatch(/NaN|Infinity/);
    expect(host.querySelector('.ns-controls .ns-primary').disabled).toBe(true);
  });
  it('samples fresh counts and requires three readings before an explanation', () => {
    mount({ nkStudio: { mission: 'counting' } });
    expect(named('Take a 10-second count →').disabled).toBe(true);
    click('Exactly the same');
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    click('Take a 10-second count →');
    expect(host.querySelector('[data-ns-reading]').textContent).toBe('0');
    expect(host.querySelector('[data-ns-explain]')).toBeNull();
    random.mockReturnValue(.5);
    click('Take a 10-second count →');
    // Poisson lambda = .42 * 10. Seven .5 draws cross exp(-4.2), giving 6 events.
    expect(host.querySelector('[data-ns-reading]').textContent).toBe('6');
    expect(host.querySelector('[data-ns-explain]')).toBeNull();
    random.mockReturnValue(.25);
    click('Take a 10-second count →');
    expect(latest._nuclearLab.nkStudio.counting.runs).toEqual([0, 6, 3]);
    expect(host.querySelector('[data-ns-explain="counting"]')).toBeTruthy();
    expect(host.textContent).toContain('These readings: 9 counts in 30 seconds.');
    expect(host.textContent).toContain('Your readings range from 0 to 6.');
    click('Every higher count means the radiation level went up.');
    expect(latest._nuclearLab.nkStudio.completed).toBeUndefined();
    click('Random variation can change counts even with the same setup.');
    click('Random variation can change counts even with the same setup.');
    expect(latest._nuclearLab.nkStudio.completed).toEqual(['counting']);
    click('Continue: Keep the chain going →');
    expect(latest._nuclearLab.nkStudio.mission).toBe('chain');
  });
  it('accepts separate matching zero readings and resets without erasing the discovery', () => {
    mount({ nkStudio: { mission: 'counting', counting: { prediction: 'vary', runs: [0, 0] } } });
    vi.spyOn(Math, 'random').mockReturnValue(0);
    click('Take a 10-second count →');
    expect(latest._nuclearLab.nkStudio.counting.runs).toEqual([0, 0, 0]);
    expect(host.textContent).toContain('These readings match.');
    expect(host.querySelector('[data-ns-explain]')).toBeTruthy();
    expect(host.innerHTML).not.toMatch(/NaN|Infinity/);
    click('Random variation can change counts even with the same setup.');
    click('Start again');
    expect(latest._nuclearLab.nkStudio.counting.runs).toEqual([]);
    expect(latest._nuclearLab.nkStudio.completed).toEqual(['counting']);
    expect(host.querySelector('[data-ns-reading]').textContent).toBe('—');
  });
  it('retains only the latest six counts and totals the displayed measurements', () => {
    mount({ nkStudio: { mission: 'counting', counting: { prediction: 'vary', runs: [9, 1, 2, 3, 4, 5] } } });
    vi.spyOn(Math, 'random').mockReturnValue(0);
    click('Take a 10-second count →');
    expect(latest._nuclearLab.nkStudio.counting.runs).toEqual([1, 2, 3, 4, 5, 0]);
    expect(host.querySelectorAll('[data-ns-notebook] tbody tr')).toHaveLength(6);
    expect(host.textContent).toContain('These readings: 15 counts in 60 seconds.');
  });
  it('rejects invalid saved counts without granting an explanation', () => {
    mount({ nkStudio: { mission: 'counting', counting: { prediction: {}, runs: [0, null, '4', -1, .5, NaN, Infinity, 1001, {}], explanation: 'correct' } } });
    expect(host.querySelectorAll('[data-ns-notebook] tbody tr')).toHaveLength(1);
    expect(host.querySelector('[data-ns-explain]')).toBeNull();
    expect(named('Take a 10-second count →').disabled).toBe(true);
    click('Start again');
    expect(named('They can differ').disabled).toBe(false);
  });
  it('offers optional hints that follow the current step without changing progress', () => {
    mount();
    const hint = host.querySelector('.ns-hint');
    expect(hint.open).toBe(false);
    React.act(() => hint.querySelector('summary').click());
    expect(hint.open).toBe(true);
    expect(hint.textContent).toContain('Choose the prediction');
    expect(latest._nuclearLab.nkStudio).toBeUndefined();
    click('16');
    expect(hint.textContent).toContain('Advance until');
    click('Advance one half-life →'); click('Advance one half-life →');
    expect(hint.textContent).toContain('Compare 64, 32, and 16.');
    mission('shield');
    expect(host.querySelector('.ns-hint').open).toBe(false);
    expect(latest._nuclearLab.nkStudio.completed).toBeUndefined();
  });
  it('recaps only earned discoveries and revisits observations with question focus', () => {
    mount({ nkStudio: { mission: 'counting', completed: ['decay', 'decay', 'unknown'], decay: { prediction: 16, step: 2 }, counting: { prediction: 'vary', runs: [1, 4] } } });
    expect(host.querySelector('.ns-recap').open).toBe(false);
    expect(host.querySelectorAll('[data-ns-discovery]')).toHaveLength(1);
    expect(host.querySelector('.ns-progress').textContent).toContain('1 / 6');
    React.act(() => host.querySelector('.ns-recap > summary').click());
    click('Revisit: The disappearing sample');
    expect(document.activeElement).toBe(host.querySelector('.ns-heading h4'));
    expect(host.querySelectorAll('.ns-atom[data-decayed="true"]')).toHaveLength(48);
    expect(latest._nuclearLab.nkStudio.counting.runs).toEqual([1, 4]);
  });
  it.each([null, 'broken', [], { decay: { step: Infinity, prediction: {} }, shield: { thickness: NaN, trials: [null, { material: 'unknown' }] }, completed: ['unknown', 'decay', 'decay'] }])('handles damaged studio data safely: %j', state => {
    expect(() => renderTool('nuclearLab', { _nuclearLab: { nkStudio: state } })).not.toThrow();
  });
  it('compares three radiation paths before recording the source-versus-signal discovery', () => {
    mount({ nkStudio: { mission: 'rays' } });
    function testPath(id) {
      const button = host.querySelector('[data-ns-setup="' + id + '"]');
      expect(button.disabled).toBe(false);
      React.act(() => button.click());
    }
    expect([...host.querySelectorAll('[data-ns-setup]')].every(button => button.disabled)).toBe(true);
    click('Both types');
    testPath('alpha-open');
    expect(host.querySelector('[data-ns-reading]').textContent).toBe('Reaches the detector');
    expect(host.querySelector('.ns-prediction').open).toBe(false);
    expect(host.querySelector('.ns-prediction > summary').textContent).toBe('Your prediction: Both types');
    testPath('alpha-paper');
    expect(host.querySelector('[data-ns-reading]').textContent).toBe('Stopped by paper');
    expect(host.querySelector('[data-ns-scene]').textContent).toContain('Source: still emitting.');
    expect(host.querySelector('[data-ns-explain]')).toBeNull();
    testPath('alpha-paper');
    expect(latest._nuclearLab.nkStudio.rays.runs).toHaveLength(2);
    expect(host.querySelector('[data-ns-explain]')).toBeNull();
    testPath('gamma-paper');
    expect(host.querySelector('[data-ns-reading]').textContent).toBe('Reaches the detector');
    expect(host.querySelector('.ns-ray-identity').textContent).toContain('A photon:');
    expect([...host.querySelectorAll('[data-ns-notebook] tbody td')].map(node => node.textContent)).toEqual(['Reaches the detector', 'Stopped by paper', 'Reaches the detector']);
    click('Paper switches off the radioactive source.');
    expect(latest._nuclearLab.nkStudio.completed).toBeUndefined();
    click('Paper blocks the alpha path while the source keeps emitting.');
    click('Paper blocks the alpha path while the source keeps emitting.');
    expect(latest._nuclearLab.nkStudio.completed).toEqual(['rays']);
    click('Continue: The shielding challenge →');
    expect(latest._nuclearLab.nkStudio.mission).toBe('shield');
  });
  it('does not accept corrupt or duplicate radiation paths as three observations', () => {
    mount({ nkStudio: { mission: 'rays', rays: { prediction: {}, runs: ['alpha-paper', 'alpha-paper', 'gamma-paper', 'not-a-path', {}, null], explanation: 'correct' } } });
    expect(host.querySelector('[data-ns-explain]')).toBeNull();
    expect(host.querySelectorAll('[data-ns-notebook] tbody tr')).toHaveLength(2);
    expect(host.querySelector('.ns-prediction > summary').textContent).toContain('Not recorded');
    click('Start again');
    expect(host.querySelectorAll('[data-ns-notebook] tbody tr')).toHaveLength(0);
    expect(host.querySelector('.ns-prediction').open).toBe(true);
    expect(named('Alpha only').disabled).toBe(false);
  });
  it.each([
    ['decay', { prediction: 32, step: 1 }, '32', 'Reset sample'],
    ['distance', { prediction: 'half', runs: [1] }, 'Half as much', 'Start again'],
    ['shield', { prediction: 'lead', trials: [{ material: 'water', thickness: 2 }] }, 'Lead', 'Start a new comparison'],
    ['counting', { prediction: 'vary', runs: [4] }, 'They can differ', 'Start again'],
    ['chain', { prediction: 'steady', step: 1 }, 'It stays steady', 'Start again'],
    ['rays', { prediction: 'alpha', runs: ['alpha-open'] }, 'Alpha only', 'Start again']
  ])('folds a saved %s prediction and reopens it after reset', (kind, data, label, resetLabel) => {
    mount({ nkStudio: { mission: kind, completed: [kind], [kind]: data } });
    expect(host.querySelector('.ns-prediction').open).toBe(false);
    expect(host.querySelector('.ns-prediction > summary').textContent).toBe('Your prediction: ' + label);
    React.act(() => host.querySelector('.ns-prediction > summary').click());
    expect(host.querySelector('.ns-prediction').open).toBe(true);
    click(resetLabel);
    expect(host.querySelector('.ns-prediction').open).toBe(true);
    expect(latest._nuclearLab.nkStudio.completed).toEqual([kind]);
  });
  it('folds the first completed prediction and respects reopening during later tests', () => {
    mount(); click('32');
    expect(host.querySelector('.ns-prediction').open).toBe(true);
    click('Advance one half-life →');
    expect(host.querySelector('.ns-prediction').open).toBe(false);
    React.act(() => host.querySelector('.ns-prediction > summary').click());
    click('Advance one half-life →');
    expect(host.querySelector('.ns-prediction').open).toBe(true);
    expect(latest._nuclearLab.nkStudio.decay.prediction).toBe(32);
  });
  it('guides missing distance comparisons without recording a result from a setup shortcut', () => {
    mount({ nkStudio: { mission: 'distance', distance: { prediction: 'quarter', setting: 4, runs: [4, 4, null] } } });
    expect(host.querySelector('[data-ns-guide]').textContent).toContain('0 of 2 comparison readings');
    click('Set distance to 1 m');
    expect(document.activeElement).toBe(named('Take a reading →'));
    expect(host.querySelector('[data-ns-reading]').textContent).toBe('6.25%');
    expect(host.querySelectorAll('[data-ns-notebook] tbody tr')).toHaveLength(1);
    expect(latest._nuclearLab.nkStudio.completed).toBeUndefined();
    click('Take a reading →');
    expect(host.querySelector('[data-ns-guide]').textContent).toContain('1 of 2 comparison readings');
    click('Set distance to 2 m');
    expect(host.querySelector('[data-ns-reading]').textContent).toBe('100%');
    expect(host.querySelector('[data-ns-explain]')).toBeNull();
    click('Take a reading →');
    expect(host.querySelector('[data-ns-reading]').textContent).toBe('25%');
    expect(host.querySelector('[data-ns-guide]')).toBeNull();
    expect(host.querySelector('[data-ns-explain]')).toBeTruthy();
  });
  it('prepares a shield matching a real earlier trial while preserving the last measurement', () => {
    mount({ nkStudio: { mission: 'shield', shield: { prediction: 'lead', material: 'lead', thickness: 4, trials: [{ material: 'water', thickness: 2 }] } } });
    expect(host.querySelector('[data-ns-guide]').textContent).toContain('your Water result at 2 cm');
    click('Prepare Lead at 2 cm');
    expect(document.activeElement).toBe(named('Test this shield →'));
    expect(host.querySelector('#ns-thickness').value).toBe('2');
    expect(host.querySelector('[data-ns-reading]').textContent).toBe('86.8%');
    expect(latest._nuclearLab.nkStudio.shield.trials).toHaveLength(1);
    expect(host.querySelector('[data-ns-explain]')).toBeNull();
    click('Test this shield →');
    expect(host.querySelector('[data-ns-guide]')).toBeNull();
    expect(host.querySelector('[data-ns-explain]')).toBeTruthy();
    expect(host.querySelector('[data-ns-reading]').textContent).toBe('21.4%');
  });
  it('guides zero-thickness shielding back to a measurable comparison', () => {
    mount({ nkStudio: { mission: 'shield', shield: { prediction: 'lead', thickness: 0, trials: [{ material: 'water', thickness: 0 }, { material: 'lead', thickness: 0 }] } } });
    click('Prepare Water at 2 cm');
    expect(host.querySelector('[data-ns-reading]').textContent).toBe('100.0%');
    expect(host.querySelector('[data-ns-explain]')).toBeNull();
    click('Test this shield →');
    click('Prepare Lead at 2 cm');
    expect(host.querySelector('[data-ns-explain]')).toBeNull();
    click('Test this shield →');
    expect(host.querySelector('[data-ns-explain]')).toBeTruthy();
  });
  it('lets an unfinished chain run finish before preparing the missing steady comparison', () => {
    mount({ nkStudio: { mission: 'chain', chain: { prediction: 'steady', setting: .8, step: 2, runs: [] } } });
    expect(host.querySelector('[data-ns-guide]').textContent).toContain('2 of 4 generations observed');
    expect(host.querySelector('[data-ns-prepare]')).toBeNull();
    click('Advance one generation →'); click('Advance one generation →');
    expect(host.querySelector('[data-ns-guide]').textContent).toContain('1 of 2 comparison runs');
    click('Prepare factor 1');
    expect(document.activeElement).toBe(named('Advance one generation →'));
    expect(latest._nuclearLab.nkStudio.chain).toMatchObject({ step: 0, setting: 1, runs: [.8] });
    expect(host.querySelector('[data-ns-explain]')).toBeNull();
    for (let i = 0; i < 4; i++) click('Advance one generation →');
    expect(host.querySelector('[data-ns-guide]')).toBeNull();
    expect(host.querySelector('[data-ns-explain]')).toBeTruthy();
  });
  it('guides a steady chain to a contrasting run without replaying recorded evidence', () => {
    mount({ nkStudio: { mission: 'chain', chain: { prediction: 'steady', setting: 1, step: 4, runs: [1] } } });
    click('Prepare factor 0.8');
    expect(latest._nuclearLab.nkStudio.chain).toMatchObject({ step: 0, setting: .8, runs: [1] });
    expect(host.querySelector('[data-ns-explain]')).toBeNull();
    expect(host.querySelector('[data-ns-guide]').textContent).toContain('0 of 4 generations');
  });
  it('counts matching detector readings in guidance and removes the prompt after three', () => {
    mount({ nkStudio: { mission: 'counting' } });
    vi.spyOn(Math, 'random').mockReturnValue(0);
    click('They can differ');
    expect(host.querySelector('[data-ns-guide]').textContent).toContain('0 of 3 readings');
    click('Take a 10-second count →'); click('Take a 10-second count →');
    expect(host.querySelector('[data-ns-guide]').textContent).toContain('2 of 3 readings');
    click('Take a 10-second count →');
    expect(host.querySelector('[data-ns-guide]')).toBeNull();
    expect(latest._nuclearLab.nkStudio.completed).toBeUndefined();
  });
  it('suggests an untested radiation setup after observations made out of order', () => {
    mount({ nkStudio: { mission: 'rays', rays: { prediction: 'alpha', runs: ['gamma-paper', 'gamma-paper'] } } });
    expect(host.querySelector('[data-ns-guide]').textContent).toContain('1 of 3 setups tested. Try Alpha · paper out next.');
    React.act(() => host.querySelector('[data-ns-setup="alpha-paper"]').click());
    expect(host.querySelector('[data-ns-guide]').textContent).toContain('2 of 3 setups tested. Try Alpha · paper out next.');
  });
  it('resumes the most recently worked unfinished experiment without replacing its observations', () => {
    mount({ nkStudio: { mission: 'decay', lastWorked: 'counting', completed: ['decay'], distance: { prediction: 'quarter', runs: [1] }, counting: { prediction: 'vary', runs: [1, 4] } } });
    expect(host.querySelector('[data-ns-mission="decay"] .ns-mission-state').textContent).toBe('Discovery recorded');
    expect(host.querySelector('[data-ns-mission="counting"] .ns-mission-state').textContent).toBe('In progress');
    expect(host.querySelector('[data-ns-mission="rays"] .ns-mission-state').textContent).toBe('Not started');
    host.querySelector('.ns-chooser').open = true;
    click('Resume: One count, or a pattern?');
    expect(host.querySelector('.ns-chooser').open).toBe(false);
    expect(document.activeElement).toBe(host.querySelector('.ns-heading h4'));
    expect(latest._nuclearLab.nkStudio.counting.runs).toEqual([1, 4]);
    mission('distance');
    expect(latest._nuclearLab.nkStudio.lastWorked).toBe('counting');
    click('Take a reading →');
    expect(latest._nuclearLab.nkStudio.lastWorked).toBe('distance');
    expect(host.querySelector('[data-ns-resume]').dataset.nsResume).toBe('distance');
    click('Start again');
    expect(host.querySelector('[data-ns-resume]').dataset.nsResume).toBe('counting');
  });
  it('does not suggest recorded discoveries or malformed data as unfinished work', () => {
    mount({ nkStudio: { lastWorked: 'distance', completed: ['distance'], distance: { prediction: 'quarter', runs: [1] }, decay: { step: Infinity }, chain: { prediction: {}, step: -1, runs: ['1'] }, shield: { trials: [{ material: 'unknown', thickness: 2 }] }, counting: { runs: [-1, null, Infinity, '4'] }, rays: { runs: ['unknown'] } } });
    expect(host.querySelector('[data-ns-resume]')).toBeNull();
    expect(host.querySelector('[data-ns-mission="chain"] .ns-mission-state').textContent).toBe('Not started');
  });
  it('keeps an optional takeaway with a discovery across resets and view changes', () => {
    mount({ nkStudio: { completed: ['decay'], decay: { prediction: 16, step: 2 } } });
    const field = host.querySelector('[data-ns-reflection="decay"] textarea');
    expect(field).toBeTruthy();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    React.act(() => {
      setter.call(field, 'Each interval halves what is still there.');
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(latest._nuclearLab.nkStudio.decay.reflection).toBe('Each interval halves what is still there.');
    expect(latest._nuclearLab.nkStudio.decay.step).toBe(2);
    expect(latest._nuclearLab.nkStudio.completed).toEqual(['decay']);
    click('Reset sample');
    click('All topics & routes'); click('Experiment studio');
    expect(host.querySelector('[data-ns-reflection="decay"] textarea').value).toBe('Each interval halves what is still there.');
    click('Clear this note');
    expect(latest._nuclearLab.nkStudio.decay.reflection).toBe('');
    expect(latest._nuclearLab.nkStudio.completed).toEqual(['decay']);
  });
  it('offers takeaway notes only for earned discoveries and handles damaged saved notes', () => {
    mount({ nkStudio: { completed: ['distance', 'counting'], distance: { reflection: { broken: true } }, counting: { reflection: 'x'.repeat(400) }, decay: { reflection: 'Unfinished' } } });
    expect(host.querySelectorAll('[data-ns-reflection]')).toHaveLength(2);
    expect(host.querySelector('[data-ns-reflection="distance"] textarea').value).toBe('');
    expect(host.querySelector('[data-ns-reflection="counting"] textarea').value).toHaveLength(300);
    expect(host.querySelector('[data-ns-reflection="counting"] textarea').maxLength).toBe(300);
    expect(host.querySelector('[data-ns-reflection="decay"]')).toBeNull();
  });
  it('uses translated prompts and keeps every new English key synchronized', () => {
    host.innerHTML = renderTool('nuclearLab', {}, { t: (key, fallback) => key === 'stem.nuclearlab.studio_title' ? 'Experimentos pequeños' : fallback });
    expect(host.querySelector('h3').textContent).toBe('Experimentos pequeños');
    const source = readFileSync('stem_lab/stem_tool_nuclearlab.js', 'utf8');
    const keys = [...new Set([...source.matchAll(/\bnt\('([^']+)'/g)].map(match => 'studio_' + match[1]))];
    expect(keys.length).toBeGreaterThan(80);
    const english = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.nuclearlab;
    for (const prefix of ['', 'desktop/web-app/public/', 'desktop/app-build/', 'desktop/web-app/build/']) {
      const values = JSON.parse(readFileSync(prefix + 'ui_strings.js', 'utf8')).stem.nuclearlab;
      for (const key of keys) {
        expect(typeof english[key], key).toBe('string');
        expect(values[key], prefix + key).toBe(english[key]);
      }
    }
  });
});
