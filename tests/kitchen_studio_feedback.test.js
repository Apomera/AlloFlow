import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Feedback = require('../stem_lab/kitchen_studio/kitchen_studio_feedback.js');
const mounted = [];
const tick = async () => { await Promise.resolve(); await Promise.resolve(); };

function fixture({ audio = true, touch = true, state = 'running', deferred = false, checked = false } = {}) {
  document.body.innerHTML = `<canvas id="feedbackCanvas"></canvas><details id="studioFeedback"><summary>Tool feedback (optional)</summary>
    <label><input type="checkbox" id="studioToolSounds" ${checked ? 'checked' : ''}>Tool sounds</label>
    <label><input type="checkbox" id="studioTouchPulses" ${checked ? 'checked' : ''}>Touch pulses</label>
    <button type="button" id="studioFeedbackTry">Try feedback</button><p id="studioFeedbackStatus" role="status"></p></details>`;
  const contexts = [], oscillators = [], gains = [], pending = [];
  const param = () => ({ setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() });
  const Constructor = vi.fn(function () {
    const context = {
      state, currentTime: 12, destination: { type: 'output' },
      createOscillator: vi.fn(() => { const oscillator = { frequency: param(), type: '', connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null }; oscillators.push(oscillator); return oscillator; }),
      createGain: vi.fn(() => { const gain = { gain: param(), connect: vi.fn(), disconnect: vi.fn() }; gains.push(gain); return gain; }),
      resume: vi.fn(() => deferred ? new Promise((resolve, reject) => pending.push({ resolve: () => { context.state = 'running'; resolve(); }, reject })) : (context.state = 'running', Promise.resolve())),
      close: vi.fn(() => { context.state = 'closed'; return Promise.resolve(); })
    }; contexts.push(context); return context;
  });
  Object.defineProperty(window, 'AudioContext', { configurable: true, value: audio ? Constructor : undefined });
  Object.defineProperty(window, 'webkitAudioContext', { configurable: true, value: undefined });
  const vibrate = vi.fn(() => true);
  Object.defineProperty(navigator, 'vibrate', { configurable: true, value: touch ? vibrate : undefined });
  const view = Feedback.mount({ canvas: document.getElementById('feedbackCanvas') }); mounted.push(view);
  return { view, contexts, oscillators, gains, pending, Constructor, vibrate, sounds: document.getElementById('studioToolSounds'), pulses: document.getElementById('studioTouchPulses'), test: document.getElementById('studioFeedbackTry'), section: document.getElementById('studioFeedback'), status: document.getElementById('studioFeedbackStatus') };
}
function select(input, checked = true) { input.checked = checked; input.dispatchEvent(new Event('change')); }
function positive(f) { return f.vibrate.mock.calls.map(c => c[0]).filter(n => n > 0); }
function play(f, type = 'pickup', extra = {}) { return f.view.cue({ type, id: 'tool', ...extra }); }
function voiceSpec(f, index = f.oscillators.length - 1) {
  const oscillator = f.oscillators[index], gain = f.gains[index];
  return { frequency: oscillator.frequency.setValueAtTime.mock.calls[0][0], type: oscillator.type, duration: oscillator.stop.mock.calls[0][0] - oscillator.start.mock.calls[0][0], peak: gain.gain.linearRampToValueAtTime.mock.calls[0][0] };
}
afterEach(() => { mounted.splice(0).forEach(v => v.dispose()); vi.restoreAllMocks(); delete window.AudioContext; delete window.webkitAudioContext; delete navigator.vibrate; document.body.innerHTML = ''; });

describe('Optional kitchen tool feedback', () => {
  it('starts silent and allocates no output resources', () => {
    const f = fixture();
    expect(f.sounds.checked).toBe(false); expect(f.pulses.checked).toBe(false); expect(f.test.disabled).toBe(true); expect(f.section.open).toBe(false);
    for (const type of ['pickup', 'ready', 'release', 'cancel']) play(f, type);
    expect(f.Constructor).not.toHaveBeenCalled(); expect(f.vibrate).not.toHaveBeenCalled(); expect(f.status.textContent).toBe('Tool sounds off. Touch pulses off.');
  });
  it('overrides browser-restored checked controls with the off defaults', () => {
    const f = fixture({ checked: true }); expect(f.sounds.checked).toBe(false); expect(f.pulses.checked).toBe(false); expect(f.Constructor).not.toHaveBeenCalled();
  });
  it.each([{ audio: false, touch: true }, { audio: true, touch: false }, { audio: false, touch: false }])('exposes truthful independent support %j', options => {
    const f = fixture(options); expect(f.sounds.disabled).toBe(!options.audio); expect(f.pulses.disabled).toBe(!options.touch); expect(f.test.disabled).toBe(true);
    if (!options.audio) expect(f.status.textContent).toContain('Tool sounds unavailable');
    if (!options.touch) expect(f.status.textContent).toContain('Touch pulses unavailable');
    select(f.sounds); select(f.pulses); expect(f.sounds.checked).toBe(options.audio); expect(f.pulses.checked).toBe(options.touch);
  });
  it('prepares sound on explicit enable without playing a tone or pulse', () => {
    const f = fixture({ state: 'suspended' }); select(f.sounds);
    expect(f.Constructor).toHaveBeenCalledTimes(1); expect(f.contexts[0].resume).toHaveBeenCalledTimes(1); expect(f.oscillators).toHaveLength(0); expect(f.vibrate).not.toHaveBeenCalled(); expect(f.test.disabled).toBe(false);
  });
  it('enables touch without constructing an audio context or vibrating', () => {
    const f = fixture(); select(f.pulses); expect(f.Constructor).not.toHaveBeenCalled(); expect(f.vibrate).not.toHaveBeenCalled(); expect(f.status.textContent).toContain('where supported');
  });
  it('plays a test cue only after an explicit enabled test button click', () => {
    const f = fixture(); f.test.click(); expect(f.oscillators).toHaveLength(0); select(f.sounds); select(f.pulses); f.test.click();
    expect(f.oscillators).toHaveLength(1); expect(positive(f)).toEqual([10]); expect(voiceSpec(f)).toMatchObject({ frequency: 220, type: 'triangle', peak: .035 });
  });
  it.each([['pickup', 220, 'triangle', .055, 10], ['ready', 330, 'sine', .065, 14], ['release', 180, 'triangle', .050, 8]])('uses one short bounded %s cue', (type, frequency, waveform, duration, pulse) => {
    const f = fixture(); select(f.sounds); select(f.pulses); play(f, type);
    expect(f.oscillators).toHaveLength(1); const oscillator = f.oscillators[0], gain = f.gains[0];
    expect(oscillator.start).toHaveBeenCalledTimes(1); expect(oscillator.start).toHaveBeenCalledWith(12); expect(oscillator.stop).toHaveBeenCalledWith(12 + duration);
    expect(voiceSpec(f)).toMatchObject({ frequency, type: waveform, peak: .035 }); expect(voiceSpec(f).duration).toBeCloseTo(duration, 12);
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0, 12); expect(gain.gain.linearRampToValueAtTime.mock.calls).toEqual([[.035, 12.004], [0, 12 + duration]]);
    expect(oscillator.connect).toHaveBeenCalledWith(gain); expect(gain.connect).toHaveBeenCalledWith(f.contexts[0].destination); expect(positive(f)).toEqual([pulse]);
  });
  it('has identical release feedback regardless of engine outcome or input method', () => {
    const f = fixture(); select(f.sounds); select(f.pulses);
    play(f, 'release', { accepted: true, keyboard: false }); const accepted = voiceSpec(f);
    play(f, 'release', { accepted: false, keyboard: true }); expect(voiceSpec(f)).toEqual(accepted); expect(positive(f)).toEqual([8, 8]);
  });
  it('bounds output to one voice and stops/disconnects the previous voice', () => {
    const f = fixture(); select(f.sounds); play(f); const old = f.oscillators[0]; play(f, 'ready');
    expect(old.stop).toHaveBeenCalledTimes(2); expect(old.stop.mock.calls[1]).toEqual([]); expect(old.disconnect).toHaveBeenCalledTimes(1); expect(f.gains[0].disconnect).toHaveBeenCalledTimes(1); expect(old.onended).toBeNull(); expect(f.oscillators).toHaveLength(2);
  });
  it('disconnects finished nodes and does not stop them again on cancellation', () => {
    const f = fixture(); select(f.sounds); play(f); const ended = f.oscillators[0].onended; ended(); play(f, 'cancel');
    expect(f.oscillators[0].disconnect).toHaveBeenCalledTimes(1); expect(f.gains[0].disconnect).toHaveBeenCalledTimes(1); expect(f.oscillators[0].stop).toHaveBeenCalledTimes(1);
  });
  it('cancels quietly without creating another voice or positive pulse', () => {
    const f = fixture(); select(f.sounds); select(f.pulses); play(f); play(f, 'cancel');
    expect(f.oscillators).toHaveLength(1); expect(positive(f)).toEqual([10]); expect(f.vibrate).toHaveBeenLastCalledWith(0); expect(f.oscillators[0].disconnect).toHaveBeenCalledTimes(1);
  });
  it.each(['sounds', 'pulses'])('stops current outputs when %s is switched off but preserves the other preference', name => {
    const f = fixture(); select(f.sounds); select(f.pulses); play(f); select(f[name], false);
    expect(f.oscillators[0].disconnect).toHaveBeenCalledTimes(1); expect(f.vibrate).toHaveBeenLastCalledWith(0);
    expect(f[name].checked).toBe(false); const other = name === 'sounds' ? 'pulses' : 'sounds'; expect(f[other].checked).toBe(true); expect(f.test.disabled).toBe(false);
    play(f, 'ready'); expect(f.oscillators).toHaveLength(name === 'sounds' ? 1 : 2); expect(positive(f)).toEqual(name === 'pulses' ? [10] : [10, 14]);
  });
  it('ignores unknown signal types without changing live output', () => {
    const f = fixture(); select(f.sounds); play(f); const voice = f.oscillators[0];
    for (const signal of [null, {}, { type: 'hover' }, { type: 'accepted' }, { type: 'constructor' }]) expect(() => f.view.cue(signal)).not.toThrow();
    expect(f.oscillators).toHaveLength(1); expect(voice.disconnect).not.toHaveBeenCalled();
  });
  it('hides and silences feedback with 3D view and retains explicit choices on return', () => {
    const f = fixture(); select(f.sounds); select(f.pulses); play(f); f.view.update({ visible: false });
    expect(f.section.hidden).toBe(true); expect(f.sounds.disabled).toBe(true); expect(f.pulses.disabled).toBe(true); expect(f.test.disabled).toBe(true); expect(f.vibrate).toHaveBeenLastCalledWith(0);
    play(f); expect(f.oscillators).toHaveLength(1); f.view.update({ visible: true }); expect(f.section.hidden).toBe(false); expect(f.sounds.checked).toBe(true); expect(f.pulses.checked).toBe(true); expect(f.oscillators).toHaveLength(1);
  });
  it.each(['blur', 'pagehide'])('stops on %s and never auto-plays when the page returns', event => {
    const f = fixture(); select(f.sounds); select(f.pulses); play(f); window.dispatchEvent(new Event(event));
    expect(f.oscillators[0].disconnect).toHaveBeenCalledTimes(1); expect(f.vibrate).toHaveBeenLastCalledWith(0);
    window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('pageshow')); expect(f.oscillators).toHaveLength(1); expect(positive(f)).toEqual([10]);
  });
  it('silences document hiding and ignores cues while hidden', () => {
    const f = fixture(); select(f.sounds); select(f.pulses); play(f);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true); document.dispatchEvent(new Event('visibilitychange')); play(f, 'ready');
    expect(f.oscillators).toHaveLength(1); expect(f.vibrate).toHaveBeenLastCalledWith(0);
  });
  it.each(['cancel', 'off', 'hide', 'blur', 'dispose'])('does not replay a late audio resume after %s', async action => {
    const f = fixture({ state: 'suspended', deferred: true }); select(f.sounds); play(f);
    if (action === 'cancel') play(f, 'cancel'); if (action === 'off') select(f.sounds, false); if (action === 'hide') f.view.update({ visible: false }); if (action === 'blur') window.dispatchEvent(new Event('blur')); if (action === 'dispose') f.view.dispose();
    f.pending.forEach(p => p.resolve()); await tick(); expect(f.oscillators).toHaveLength(0);
  });
  it('drops an older pending pickup and plays only the newest ready cue', async () => {
    const f = fixture({ state: 'suspended', deferred: true }); select(f.sounds); play(f, 'pickup'); play(f, 'ready');
    f.pending.forEach(p => p.resolve()); await tick(); expect(f.oscillators).toHaveLength(1); expect(voiceSpec(f).frequency).toBe(330);
  });
  it('does not play when an enable-only resume resolves', async () => {
    const f = fixture({ state: 'suspended', deferred: true }); select(f.sounds); f.pending[0].resolve(); await tick(); expect(f.oscillators).toHaveLength(0);
  });
  it('swallows failed resume and allows a later explicit retry', async () => {
    const f = fixture({ state: 'suspended', deferred: true }); select(f.sounds); f.pending[0].reject(Error('blocked')); await tick(); expect(f.status.textContent).toContain('could not start');
    play(f); f.pending[1].resolve(); await tick(); expect(f.oscillators).toHaveLength(1); expect(f.status.textContent).toContain('Tool sounds on.');
  });
  it('ignores stale resume failures after output is disabled', async () => {
    const f = fixture({ state: 'suspended', deferred: true }); select(f.sounds); select(f.sounds, false); f.pending[0].reject(Error('late')); await tick(); expect(f.status.textContent).toContain('Tool sounds off.');
  });
  it('handles a throwing audio constructor without blocking independent pulses', () => {
    const f = fixture(); f.Constructor.mockImplementation(function () { throw Error('no device'); }); select(f.sounds); select(f.pulses); expect(() => play(f)).not.toThrow(); expect(f.status.textContent).toContain('could not start'); expect(positive(f)).toEqual([10]);
  });
  it('handles audio node creation failures and keeps touch available', () => {
    const f = fixture(); select(f.sounds); select(f.pulses); f.contexts[0].createGain.mockImplementation(() => { throw Error('no node'); }); expect(() => play(f)).not.toThrow(); expect(f.oscillators[0].disconnect).toHaveBeenCalledTimes(1); expect(f.status.textContent).toContain('could not start'); expect(positive(f)).toEqual([10]);
  });
  it('cleans partially started audio nodes on failure', () => {
    const f = fixture(); select(f.sounds); f.contexts[0].createOscillator.mockImplementationOnce(() => { const o = { frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(() => { throw Error('start'); }), stop: vi.fn() }; f.oscillators.push(o); return o; });
    expect(() => play(f)).not.toThrow(); expect(f.oscillators[0].disconnect).toHaveBeenCalledTimes(1); expect(f.gains[0].disconnect).toHaveBeenCalledTimes(1);
  });
  it.each(['false', 'throw'])('reports a %s vibration result without blocking audio', mode => {
    const f = fixture(); select(f.sounds); select(f.pulses); f.vibrate.mockImplementation(() => { if (mode === 'throw') throw Error('no motor'); return false; });
    expect(() => play(f)).not.toThrow(); expect(f.status.textContent).toContain('Touch pulses could not start'); expect(f.oscillators).toHaveLength(1);
  });
  it('restores the device-dependent touch status after a successful retry', () => {
    const f = fixture(); select(f.pulses); f.vibrate.mockReturnValueOnce(false); play(f); expect(f.status.textContent).toContain('could not start');
    play(f, 'ready'); expect(f.status.textContent).toContain('enabled where supported'); expect(f.status.textContent).not.toContain('could not start');
  });
  it('supports the prefixed audio context fallback', () => {
    const f = fixture({ audio: false }); f.view.dispose(); Object.defineProperty(window, 'webkitAudioContext', { configurable: true, value: f.Constructor });
    const view = Feedback.mount({ canvas: document.getElementById('feedbackCanvas') }); mounted.push(view); select(f.sounds); view.cue({ type: 'pickup' }); expect(f.oscillators).toHaveLength(1);
  });
  it('closes the audio context and removes listeners exactly once on disposal', () => {
    const f = fixture(); select(f.sounds); select(f.pulses); play(f); const context = f.contexts[0]; f.view.dispose(); f.view.dispose();
    expect(context.close).toHaveBeenCalledTimes(1); expect(f.section.hidden).toBe(true); expect(f.test.disabled).toBe(true); expect(f.sounds.checked).toBe(false); expect(f.pulses.checked).toBe(false);
    const count = f.vibrate.mock.calls.length; select(f.sounds); select(f.pulses); window.dispatchEvent(new Event('blur')); document.dispatchEvent(new Event('visibilitychange')); f.view.update({ visible: true }); play(f); expect(f.Constructor).toHaveBeenCalledTimes(1); expect(f.oscillators).toHaveLength(1); expect(f.vibrate.mock.calls).toHaveLength(count);
  });
  it('swallows a rejected close promise and later pending resume', async () => {
    const f = fixture({ state: 'suspended', deferred: true }); select(f.sounds); f.contexts[0].close.mockImplementation(() => Promise.reject(Error('closing'))); f.view.dispose(); f.pending[0].resolve(); await tick(); expect(f.oscillators).toHaveLength(0);
  });
});
