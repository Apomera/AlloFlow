// ANTI slimming pins (2026-07-20). The dedupe/extraction batch removed ~4,800
// lines of host code with zero behavior change — these pins keep a stale
// sweep or bad merge from quietly restoring the old inline forms (the exact
// failure mode that hit Lumen five times).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOSTS = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

// Family → expected minimum wrapper call sites using the shared builder.
const BUILDERS = {
  PhaseKHelpers: 10,
  PhaseNHelpers: 4,
  AdventureSessionHandlers: 3,
  TextUtilityHelpers: 4,
  PhaseOHandlers: 5,
  AdventureHandlers: 6,
  CmapHandlers: 5,
  GenerationHelpers: 3,
  ViewRenderers: 2,
  MiscHandlers: 2,
};

describe('deps-builder dedupe pins (all three hosts)', () => {
  for (const host of HOSTS) {
    it(host + ' keeps every family builder + its call sites', () => {
      const text = read(host);
      for (const [family, minCalls] of Object.entries(BUILDERS)) {
        const builder = '_allo' + family + 'Deps';
        // A deps builder may take parameters now: _alloMiscHandlersDeps accepts
        // documentIntakeEpoch so the upload handler can tell a superseded
        // document from the current one. The pin is that each family HAS a
        // single builder and that its call sites survived slimming, not that
        // every builder stays zero-arg — so match an optional parameter list,
        // and count calls by name rather than by the literal "()" spelling
        // (which silently stopped counting the epoch-passing call site).
        expect(text, family + ' builder declaration').toMatch(new RegExp('const ' + builder + ' = \\([A-Za-z0-9_, ]*\\) => \\(\\{'));
        const calls = text.split(builder + '(').length - 1;
        expect(calls, family + ' builder call sites').toBeGreaterThanOrEqual(minCalls);
      }
    });
  }

  it('hosts stay in sync: identical builder inventory everywhere', () => {
    const inventories = HOSTS.map((host) => {
      const text = read(host);
      return Object.keys(BUILDERS).map((family) => {
        const builder = '_allo' + family + 'Deps';
        return family + ':' + (text.split(builder + '(').length - 1); // by name, so a parameterised call still counts
      }).join('|');
    });
    expect(inventories[1]).toBe(inventories[0]);
    expect(inventories[2]).toBe(inventories[0]);
  });
});

describe('extraction pins', () => {
  it('extracted handlers stay extracted (wrapper form, no inline bodies)', () => {
    const anti = read('AlloFlowANTI.txt');
    // runAutoFixLoop → MiscHandlers
    expect(anti).toContain("if (_m && typeof _m.runAutoFixLoop === 'function') return _m.runAutoFixLoop(maxRounds, {");
    expect(anti).not.toContain('Re-entry guard (sweep 2026-06-11 [5])'); // body comment lives in the module now
    // AlloBot planning layer → UdlChat
    expect(anti).toContain("if (_m && typeof _m.planAndSendUdlMessage === 'function') return _m.planAndSendUdlMessage(manualText, {");
    // updateExportPreview → ExportPreviewHelpers
    expect(anti).toContain("if (_m && typeof _m.updateExportPreview === 'function') return _m.updateExportPreview({");
    // Student-pack serializer → LiveAac
    expect(anti).toContain('moduleApi.serializeResourceForStudentPack(item, { sanitizeHistoryForCloud, stripUndefined })');
    expect(anti).not.toContain('const safePortableTtsAssets = (value) => {');
  });

  it('the module sides actually define what the wrappers forward to', () => {
    expect(read('misc_handlers_source.jsx')).toContain('async function runAutoFixLoop(maxRounds, deps)');
    expect(read('udl_chat_source.jsx')).toContain('async function planAndSendUdlMessage(manualText, deps)');
    expect(read('view_export_preview_source.jsx')).toContain('function updateExportPreview(deps)');
    expect(read('live_aac_source.jsx')).toContain('const _alloSerializeResourceForStudentPack = (item, deps = {}) => {');
    // …and register them.
    expect(read('misc_handlers_source.jsx')).toMatch(/window\.AlloModules\.MiscHandlers = \{ runAutoFixLoop,/);
    expect(read('udl_chat_source.jsx')).toMatch(/window\.AlloModules\.UdlChat = \{\s*planAndSendUdlMessage,/);
    expect(read('live_aac_source.jsx')).toContain('serializeResourceForStudentPack: _alloSerializeResourceForStudentPack');
  });
});
