// Adventure settings help (2026-11-17). The rebuilt settings panel had no help keys, so Help Mode showed only
// generic text there. Its helpers now build keys from the setting names; the help audit cannot read built keys,
// so this checks that every setting the panel draws has help text, and that no stale text was re-used.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync('view_adventure_settings_source.jsx', 'utf8');
const help = vm.runInNewContext('(' + readFileSync('help_strings.js', 'utf8') + ')');
const calls = (name) => [...src.matchAll(new RegExp('\\b' + name + "\\('([\\w-]+)'", 'g'))].map((m) => m[1]);

describe('Adventure settings: every control has its own help', () => {
  it('the helpers attach a key built from the setting name', () => {
    expect(src).toContain("data-help-key={'adventure_setting_' + field}");
    expect(src).toContain("data-help-key={'adventure_setting_' + key.replace(/-/g, '_')}");
    expect(src).toContain("data-help-key={'adventure_permission_' + key}");
  });
  it('each toggle, select and permission drawn has help text', () => {
    const keys = [
      ...calls('toggle').map((f) => 'adventure_setting_' + f),
      ...calls('field').map((k) => 'adventure_setting_' + k.replace(/-/g, '_')),
      ...calls('permissionToggle').map((k) => 'adventure_permission_' + k),
      ...[...src.matchAll(/data-help-key="(adventure_[\w]+)"/g)].map((m) => m[1]),
    ];
    expect(keys.length).toBeGreaterThan(25);
    for (const key of keys) expect(typeof help[key] === 'string' && help[key].trim().length > 20, key).toBe(true);
  });
  it('energy and rewards help matches the levels the panel offers', () => {
    expect(src).toContain("['Story', label('adventure.diff_story_option', 'Story')], ['Normal'");
    expect(help.adventure_setting_difficulty).toMatch(/Story: half the energy loss and 1\.5x XP\. Normal: standard\. Hard: 1\.5x energy loss and 0\.75x XP\. Hardcore: 2\.5x energy loss and 0\.5x XP/);
    expect(help.adventure_setting_difficulty).not.toMatch(/Challenging/);
  });
});
