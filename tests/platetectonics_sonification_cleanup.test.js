import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const source = fs.readFileSync(process.env.PT_SONIFY_SOURCE || 'stem_lab/stem_tool_platetectonics.js', 'utf8');
const start = source.indexOf('          function stopSonify() {');
const end = source.indexOf('          React.useEffect(function() {', start);
if (start < 0 || end < 0) throw new Error('The actual sonification cleanup function was not found');
const makeStop = new Function('sonifyIntervalRef', 'sonifyOscRef', 'sonifyGainRef', 'announceToSR', '__alloT', 'clearInterval', source.slice(start, end) + '\nreturn stopSonify;');

function setup(active = false) {
  const osc = { stop: vi.fn(), disconnect: vi.fn() }, gain = { disconnect: vi.fn() };
  const intervalRef = { current: active ? 71 : null }, oscRef = { current: active ? osc : null }, gainRef = { current: active ? gain : null };
  const announce = vi.fn(), clear = vi.fn();
  return { stop: makeStop(intervalRef, oscRef, gainRef, announce, (_, fallback) => fallback, clear), intervalRef, oscRef, gainRef, osc, gain, announce, clear };
}

describe('Sonification cleanup stays quiet when inactive', () => {
  it('keeps initial mount, StrictMode rehearsal, and repeated inactive cleanup silent', () => {
    const sweep = setup(); sweep.stop(); sweep.stop(); sweep.stop();
    expect(sweep.announce).not.toHaveBeenCalled(); expect(sweep.clear).not.toHaveBeenCalled();
    expect(sweep.osc.stop).not.toHaveBeenCalled(); expect(sweep.gain.disconnect).not.toHaveBeenCalled();
  });
  it('stops a real sweep and announces its end exactly once', () => {
    const sweep = setup(true); sweep.stop(); sweep.stop();
    expect(sweep.clear).toHaveBeenCalledExactlyOnceWith(71);
    expect(sweep.osc.stop).toHaveBeenCalledTimes(1); expect(sweep.osc.disconnect).toHaveBeenCalledTimes(1); expect(sweep.gain.disconnect).toHaveBeenCalledTimes(1);
    expect(sweep.intervalRef.current).toBeNull(); expect(sweep.oscRef.current).toBeNull(); expect(sweep.gainRef.current).toBeNull();
    expect(sweep.announce).toHaveBeenCalledExactlyOnceWith('Sonification sweep stopped.');
  });
  it('cleans remaining active resources even when the oscillator already failed', () => {
    const sweep = setup(true); sweep.oscRef.current = null; sweep.stop(); sweep.stop();
    expect(sweep.clear).toHaveBeenCalledTimes(1); expect(sweep.gain.disconnect).toHaveBeenCalledTimes(1); expect(sweep.announce).toHaveBeenCalledTimes(1);
  });
});
