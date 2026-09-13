import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { CONFIGS, buildFirstWaveModule } = require('../_build_first_wave_view_modules.js');

// Second cold-path wave (2026-09-13): the Canvas workspace-recovery dialog, the
// Canvas AI settings modal, the LMS accessibility-queue banner and the Read This
// Page panel left the startup host for two CDN modules. Same contract as the
// first wave: the host keeps a `_alloCreateFirstWaveCdnView` shim per component,
// pins each module by content hash, and the committed artifacts must be exactly
// what the builder emits from the committed source.
const HOST = 'AlloFlowANTI.txt';
const CONTRACTS = [
  {
    key: 'CanvasRecoveryDialogView',
    source: 'view_canvas_recovery_dialog_source.jsx',
    module: 'view_canvas_recovery_dialog_module.js',
    loader: '__alloLazyCanvasRecoveryDialogView',
    exports: ['CanvasRecoveryDialogView'],
  },
  {
    key: 'ColdPathSurfaces',
    source: 'view_cold_path_surfaces_source.jsx',
    module: 'view_cold_path_surfaces_module.js',
    loader: '__alloLazyColdPathSurfaces',
    exports: ['AiBackendSettingsView', 'LmsAuditBannerView', 'ReadThisPagePanelView'],
  },
];

describe('second-wave CDN extraction', () => {
  it('renders every extracted surface through a host shim pinned to the module content hash', () => {
    const host = readFileSync(HOST, 'utf8');
    for (const contract of CONTRACTS) {
      const version = createHash('sha256').update(readFileSync(contract.module)).digest('hex').slice(0, 8);
      expect(host).toContain(`${contract.module}?v=${version}`);
      expect(host).toContain(`window.${contract.loader} = `);
      expect(host.match(new RegExp(`loadModule\\('${contract.key}'`, 'g'))).toHaveLength(1);
      const source = readFileSync(contract.source, 'utf8');
      for (const component of contract.exports) {
        expect(host).toContain(`<${component}`);
        expect(host).toContain(`const ${component} = _alloCreateFirstWaveCdnView('${component}', '${contract.loader}',`);
        expect(source).toContain(`function ${component}(props)`);
      }
    }
    // The inline copies are gone: each surface's distinctive marker now lives only in its source.
    for (const marker of ['id="canvas-recovery-title"', 'id="ai-backend-canvas-title"', 'id="rtp-read-all-btn"', "'lms.queued_one'"]) {
      expect(host).not.toContain(marker);
    }
  });

  it('rebuilds byte-identical CDN artifacts and mirrors them for desktop use', () => {
    const build = readFileSync('build.js', 'utf8');
    for (const contract of CONTRACTS) {
      const expected = buildFirstWaveModule(contract.key, readFileSync(contract.source, 'utf8'));
      expect(readFileSync(contract.module, 'utf8')).toBe(expected);
      expect(readFileSync(`desktop/web-app/public/${contract.module}`, 'utf8')).toBe(expected);
      expect(CONFIGS[contract.key].source).toBe(contract.source);
      expect(CONFIGS[contract.key].exports).toEqual(contract.exports);
      expect(build).toContain(`'${contract.module}',`);
      expect(build).toContain(`filename: '${contract.module}'`);
      expect(build).toContain(`buildFirstWaveModule('${contract.key}', src)`);
    }
  });
});
