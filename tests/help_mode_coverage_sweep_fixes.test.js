// Help Mode gaps found by a browser sweep of every sidebar tool panel, the header and the Educator tools hub
// (2026-11-17): controls whose nearest help key described a whole panel, or that had none. Each now has its own
// key, and every key has text. Built keys (DBQ modes) are checked here because the help audit reads literals only.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const help = vm.runInNewContext('(' + readFileSync('help_strings.js', 'utf8') + ')');
const has = (key) => typeof help[key] === 'string' && help[key].trim().length > 15;
const sidebar = readFileSync('view_sidebar_panels_source.jsx', 'utf8');
const hub = readFileSync('view_educator_hub_modal_source.jsx', 'utf8');
const header = readFileSync('view_header_source.jsx', 'utf8');
const anti = readFileSync('AlloFlowANTI.txt', 'utf8');

describe('controls the sweep found without their own help', () => {
  it('DBQ modes: one key per mode, each with text', () => {
    expect(sidebar).toContain("data-help-key={'dbq_mode_' + mode}");
    const modes = [...sidebar.matchAll(/\['(standard|perspectives|search|links|custom)', t\('dbq\.mode_/g)].map((m) => m[1]);
    expect(new Set(modes)).toEqual(new Set(['standard', 'perspectives', 'search', 'links', 'custom']));
    for (const m of modes) expect(has('dbq_mode_' + m), m).toBe(true);
  });
  it('quiz, Text Adaptation, header, hub and InfoTooltip keys are wired and have text', () => {
    const wired = [
      [sidebar, ['quiz_duration_preset', 'quiz_reset_mix', 'quiz_reflection_count', 'quiz_scoring_section', 'quiz_presets_section', 'simplified_read_original', 'simplified_create_companion', 'simplified_reading_options_about']],
      [hub, ['educator_hub_search', 'educator_hub_search_clear', 'educator_hub_favorites_only', 'educator_hub_manage_favorites', 'educator_hub_manage_favorites_list', 'educator_hub_role', 'educator_hub_recommended', 'educator_hub_quick_access', 'educator_hub_favorite', 'educator_hub_section_toggle', 'educator_hub_throughline_card']],
      [header, ['header_settings_toggle']],
      [anti, ['info_tooltip']],
    ];
    for (const [src, keys] of wired) for (const k of keys) {
      expect(src, k).toContain('data-help-key="' + k + '"');
      expect(has(k), k).toBe(true);
    }
  });
  it('every favorite star and section toggle in the hub carries its key', () => {
    expect((hub.match(/data-hub-favorite="true"(?! data-help-key="educator_hub_favorite")/g) || [])).toEqual([]);
    expect((hub.match(/data-hub-section-toggle="(?![^"]*" )/g) || []).length).toBe(0);
    expect((hub.match(/data-help-key="educator_hub_section_toggle" data-hub-section-toggle="/g) || []).length).toBeGreaterThan(1);
  });
  it('the closing reflection help says it is unscored', () => {
    expect(help.quiz_reflection_count).toContain('never affect the score');
  });
});
