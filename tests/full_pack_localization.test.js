import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = file => readFileSync(resolve(process.cwd(), file), 'utf8');
const catalogs = [
  'ui_strings.js',
  'lang/spanish_latin_america.js',
  'lang/spanish_castilian.js',
  'lang/french.js',
  'lang/french_canadian.js',
];

const fullPackKeys = [
  'action_plan', 'action_generate_original', 'panel_plan', 'panel_progress',
  'settings_changed', 'capacity_preview', 'provider', 'estimate_observed',
  'hide_completed', 'show_completed', 'open_error_log', 'copy_diagnostics', 'download_report',
  'status_retrying', 'warning_local_serial', 'warning_large_pack', 'warning_image_quota',
];

describe('Full Pack and Blueprint localization coverage', () => {
  it.each(catalogs)('%s includes every new Full Pack review/resilience key', file => {
    const source = read(file);
    for (const key of fullPackKeys) expect(source).toContain(`"${key}":`);
    expect(source).toContain('"download_diagnostics":');
    expect(source).toContain('"failure_log_help":');
    expect(source).toContain('"error_log_loading":');
    expect(source).toContain('"saved_run_warning":');
  });

  it('routes the production review panel through translation keys', () => {
    const source = read('AlloFlowANTI.txt');
    for (const key of [
      'fullpack.action_plan', 'fullpack.panel_plan', 'fullpack.settings_changed',
      'fullpack.capacity_preview', 'fullpack.provider', 'fullpack.hide_completed',
      'fullpack.open_error_log', 'fullpack.copy_diagnostics', 'fullpack.download_report', 'fullpack.status_retrying',
    ]) expect(source).toContain(`t('${key}')`);
  });

  it('routes Blueprint warning and download controls through translation keys', () => {
    const source = read('persona_ui_source.jsx');
    expect(source).toContain("t('blueprint.download_diagnostics')");
    expect(source).toContain("t('blueprint.copy_diagnostics')");
    expect(source).toContain("t('blueprint.failure_log_help')");
    expect(source).toContain("t('blueprint.open_error_log')");
    expect(source).toContain("t('blueprint.saved_run_warning')");
  });
  it('keeps Full Pack failure summaries visible on narrow panels and links to the error log', () => {
    const source = read('AlloFlowANTI.txt');
    expect(source).toContain('data-testid="full-pack-failure-reason"');
    expect(source).toContain('className="mt-0.5 break-words text-[10px] leading-snug text-rose-700"');
    expect(source).toContain('data-testid="full-pack-open-error-log"');
    expect(source).toContain('onClick={handleOpenGenerationErrorLog}');
  });

});
