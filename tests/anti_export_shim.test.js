// Lane B: the host shim for handleExportGlossaryFile in AlloFlowANTI.txt, run
// from the sliced shim, and the prop handed to GlossaryView.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { sliceBetween } from './helpers/anchored_slice.js';

const DIR = process.env.LANE_DIR || '.';
const ANTI = process.env.LANE_ANTI || DIR + '/AlloFlowANTI.txt';
const anti = readFileSync(ANTI, 'utf8');

afterEach(() => { delete window.AlloModules.createExport; vi.restoreAllMocks(); });

function loadShim(api) {
  window.AlloModules = window.AlloModules || {};
  if (api) window.AlloModules.createExport = () => api;
  const shim = sliceBetween(anti, 'let _exportLiveRef = { current: {} };', "if (typeof window !== 'undefined') window._upgradeExport = _upgradeExport;", { label: 'export shim' });
  return new Function('warnLog', 'debugLog', 'escapeXml', 'generateUUID', shim + '\nreturn { upgrade: _upgradeExport, current: () => handleExportGlossaryFile };')(() => {}, () => {}, String, () => 'id');
}

describe('export shim', () => {
  it('starts with a harmless fallback and takes the module handler on upgrade', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const handler = vi.fn(() => true);
    const shim = loadShim({ handleExportFlashcards: () => {}, handleExportGlossaryFile: handler });
    expect(shim.current()('csv'), 'the fallback does nothing and says so').toBe(false);
    shim.upgrade();
    expect(shim.current()).toBe(handler);
  });
  it('an older export module without the handler leaves the fallback in place', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const shim = loadShim({ handleExportFlashcards: () => {} });
    shim.upgrade();
    expect(typeof shim.current()).toBe('function');
    expect(shim.current()('csv')).toBe(false);
  });
  it('GlossaryView receives handleExportGlossaryFile', () => {
    const props = sliceBetween(anti, 'React.createElement(window.AlloModules.GlossaryView, {', '})}', { label: 'GlossaryView props' });
    expect(/(^|[\s,{])handleExportGlossaryFile,/m.test(props)).toBe(true);
  });
});
