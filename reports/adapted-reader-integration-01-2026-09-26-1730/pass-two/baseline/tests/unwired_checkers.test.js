// Unwired repository checkers (2026-09-20).
//
// This repository has 203 checker scripts under dev-tools/. Only 59 are reachable from an
// npm script and 41 from a test; 115 are reachable from NEITHER, so they run only when
// someone remembers the exact command. That is how three defects reached the public site
// this week: a launcher announcing the wrong version, an orphaned landing page, and twelve
// stale tool counts. In every case a checker already existed and had simply never been run.
//
// The list below is the subset that is safe to run on every pass: measured at ten seconds
// or less, needing no browser, no network, no server and no arguments, and passing at the
// time it was added. Deliberately excluded, with reasons, so the next person does not have
// to re-derive them:
//   - browser-driven checks (54) need a running server; a red here would mean nothing
//   - network checks need a Cloudflare login or live CDN
//   - slow checks (check_dead_modules 67s, check_cdn_deployable 63s, check_tool_contract
//     102s and others) would dominate the suite; run them from the deploy checklist
//   - checkers that do not currently pass: verify_test_prep_assistant_review (a stale
//     audit hash on the test-prep banks) and several needing an argument
//
// The sync_* scripts REWRITE files when run bare. They are invoked with --check here so a
// test run can never mutate the tree; each exits non-zero when its output is stale.
import { describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

// 33 child processes over OneDrive-synced storage.
vi.setConfig({ testTimeout: 300000 });

// [script, ...args]
const CHECKERS = [
  ['audit_allopack_image_coverage.cjs'],
  ['audit_allopacks.cjs'],
  ['audit_command_coverage.cjs'],
  ['audit_eppp_option_feedback.cjs'],
  ['check_agent_core_mirrors.cjs'],
  ['check_ai_backend_image_routing.cjs'],
  ['check_conflict_replay_floor.cjs'],
  ['check_da_clinical_isolation.cjs'],
  ['check_forge_contract_sync.cjs'],
  ['check_gauntlet_stages.cjs'],
  ['check_lumen_sweep.cjs'],
  ['check_no_discrepancy_persistence.cjs'],
  ['check_roadready_cornering_grip.cjs'],
  ['check_roadready_hill_grade.cjs'],
  ['check_roadready_night_vision_model.cjs'],
  ['check_roadready_sourced_statistics.cjs'],
  ['check_roadready_vehicle_dynamics.cjs'],
  ['check_sd_turbo_math.cjs'],
  ['check_shadowed_idents.cjs'],
  ['check_staged_file_sizes.cjs'],
  ['check_stem_ratio_claims.cjs'],
  ['check_tailwind_contrast.cjs'],
  ['check_untranslated_english.cjs'],
  ['check_wrapper_contracts.cjs'],
  ['sync_alphafold_deployed_registry.cjs', '--check'],
  ['sync_eppp_runtime_bank.cjs', '--check'],
  ['sync_managed_ai_policy.cjs', '--check'],
  ['sync_normalized_authored_tiers.cjs', '--check'],
  ['sync_promo_release.cjs', '--check'],
  ['sync_public_search_policy.cjs', '--check'],
  ['sync_word_sounds_core.cjs', '--check'],
  ['verify_allopack_refinements_20260919.cjs'],
  ['verify_bias_clearance.cjs'],
];

describe('checkers that nothing else runs', () => {
  it.each(CHECKERS.map((c) => [c[0], c]))('%s passes', (_name, spec) => {
    const [script, ...args] = spec;
    const file = resolve(process.cwd(), 'dev-tools/' + script);
    let code = 0;
    let out = '';
    try {
      out = execFileSync(process.execPath, [file, ...args], { encoding: 'utf8', timeout: 120000 });
    } catch (error) {
      code = error.status === undefined ? 'timed out' : error.status;
      out = String(error.stdout || '') + String(error.stderr || '');
    }
    expect(code, 'node dev-tools/' + [script, ...args].join(' ') + ' ->\n' + out.slice(-1500)).toBe(0);
  });

  it('runs every sync_* checker in --check mode so a test pass cannot rewrite the tree', () => {
    const writers = CHECKERS.filter((c) => c[0].startsWith('sync_'));
    expect(writers.length).toBeGreaterThan(0);
    for (const spec of writers) {
      expect(spec, spec[0] + ' must be invoked with --check').toContain('--check');
    }
  });
});
