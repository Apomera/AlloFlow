import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { CONFIGS, buildFirstWaveModule } = require('../_build_first_wave_view_modules.js');

const HOST = 'AlloFlowANTI.txt';
const CONTRACTS = [
  {
    key: 'LiveSessionDockView',
    component: 'LiveSessionDockView',
    source: 'view_live_session_dock_source.jsx',
    module: 'view_live_session_dock_module.js',
  },
  {
    key: 'FullPackRunView',
    component: 'FullPackRunView',
    source: 'view_full_pack_run_source.jsx',
    module: 'view_full_pack_run_module.js',
  },
  {
    key: 'ShareSessionSurfaces',
    component: 'HomeworkQrDialogView',
    source: 'view_share_session_surfaces_source.jsx',
    module: 'view_share_session_surfaces_module.js',
    exports: ['HomeworkQrDialogView', 'ClassMailboxSetupView'],
  },
  {
    key: 'VideoStudioHostBridgeView',
    component: 'VideoStudioHostBridgeView',
    source: 'video_studio_host_bridge_source.jsx',
    module: 'video_studio_host_bridge_module.js',
  },
];

describe('first-wave CDN extraction', () => {
  it('keeps cold UI and the mailbox installer out of the startup host', () => {
    const host = readFileSync(HOST, 'utf8');

    expect(host).toMatch(/const ALLO_MB_SCRIPT_FALLBACK_GZIP = '';/);
    expect(host).toContain('if (!ALLO_MB_SCRIPT_FALLBACK_GZIP) return \'\';');
    expect(host).toContain('window.__alloLazyMailboxScriptSource =');
    expect(host.match(/loadModule\('MailboxScriptSource'/g)).toHaveLength(1);
    expect(host).not.toMatch(/^\s+loadModule\('MailboxScriptSource'/m);

    for (const contract of CONTRACTS) {
      const version = createHash('sha256')
        .update(readFileSync(contract.module))
        .digest('hex')
        .slice(0, 8);
      expect(host).toContain(`<${contract.component}`);
      expect(host).toContain(`${contract.module}?v=${version}`);
      expect(readFileSync(contract.source, 'utf8')).toContain(`function ${contract.component}(props)`);
    }
    expect(readFileSync('view_share_session_surfaces_source.jsx', 'utf8'))
      .toContain('function ClassMailboxSetupView(props)');
  });

  it('rebuilds byte-identical CDN artifacts and mirrors them for desktop use', () => {
    for (const contract of CONTRACTS) {
      const source = readFileSync(contract.source, 'utf8');
      const expected = buildFirstWaveModule(contract.key, source);
      const rootArtifact = readFileSync(contract.module, 'utf8');
      const desktopArtifact = readFileSync(`desktop/web-app/public/${contract.module}`, 'utf8');

      expect(rootArtifact).toBe(expected);
      expect(desktopArtifact).toBe(expected);
      expect(CONFIGS[contract.key].source).toBe(contract.source);
    }
    const build = readFileSync('build.js', 'utf8');
    for (const contract of CONTRACTS) expect(build).toContain(`'${contract.module}',`);
  });

  it('registers each runtime export without executing a view', () => {
    for (const contract of CONTRACTS) {
      const window = { React: {} };
      vm.runInNewContext(readFileSync(contract.module, 'utf8'), { window, console });
      const exports = contract.exports || [contract.component];
      for (const exportName of exports) {
        expect(window.AlloModules[exportName]).toBeTypeOf('function');
      }
      expect(window.AlloModules[contract.key]).toBeTypeOf('function');
    }
  });
});
