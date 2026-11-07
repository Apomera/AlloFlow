// Screen readers heard only "M", "S", a play symbol, or a bare tool id on these controls, and "New" was hard-coded English.

import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const music = fs.readFileSync('stem_lab/stem_tool_music.js', 'utf8');
const game = fs.readFileSync('stem_lab/stem_tool_gamestudio.js', 'utf8');

describe('Music controls name what they act on', () => {
  it('mute and solo name the channel', () => {
    expect(music).toContain("'aria-label': __alloFmt('stem.music.aria_mute_channel', 'Mute {name}', { name: sound.label })");
    expect(music).toContain("'aria-label': __alloFmt('stem.music.aria_solo_channel', 'Solo {name}', { name: sound.label })");
  });
  it('the saved-beat play button says it loads that beat', () => {
    expect(music).toContain("__alloFmt('stem.music.aria_load_saved_beat', 'Load saved beat: {name}', { name: comp.name })");
  });
});

describe('Game Studio controls', () => {
  it('map tools have real names, not a code id', () => {
    for (const k of ['brush', 'fill', 'eraser', 'eyedropper']) expect(game).toContain(`stem.gamestudio.map_tool_${k}`);
    expect(game).not.toContain('title: bt.id');
    expect(game).toContain("'aria-label': bt.label");
  });
  it('the new-sprite button goes through translation', () => {
    expect(game).not.toContain("'aria-label': 'New',");
    expect(game).toContain("stem.gamestudio.aria_new_sprite");
  });
});
