// WCAG 2.5.7 / 3.1 follow-up (2026-10-25): instructions that only mentioned dragging moved to NEW
// keys that also name the click/tap path, and the English-only prompts added with the tap paths
// (Play Lab, Ecosystem, visual panel labels), the Single-key shortcuts setting, the Hyperjet sprint
// timer and the geometry prover's point controls are on keys. Old keys were not reworded (that would
// strand every translated pack). This pins: registration with the call-site English, real
// translations in every language pack (not English filler), placeholders kept, call sites switched.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sliceBetween } from './helpers/anchored_slice.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(path.join(ROOT, f), 'utf8');

const KEYS = {
  'settings.text.single_key_shortcuts': 'Single-key shortcuts',
  'settings.text.single_key_shortcuts_sub': 'Press ? to turn Help Mode on or off. Turn this off if you use speech input or often press keys by accident. The Help Mode button in the toolbar still works.',
  'concept_map.overlay.venn_instructions_tap': 'Drag items to the correct circle section, or click or tap an item and then its section.',
  'concept_map.overlay.node_selected_tap': 'Node selected. Click or tap another node to connect them, or this node again to cancel.',
  'concept_map.overlay.venn_token_selected_tap': 'Item selected. Click or tap a circle section to place it, or this item again to cancel.',
  'simplified.cloze_instructions_tap': 'Drag words into the blanks, or click or tap a word and then a blank. You can also type them.',
  'word_sounds.chip_drag_or_tap': 'Drag to a box, or click or tap to hear it and pick it up, then click or tap a box.',
  'stem.playlab.sr_placed_player': 'Placed {player}. Position saved.',
  'stem.playlab.sr_player_put_down': '{player} put down.',
  'stem.playlab.sr_picked_up_player': 'Picked up {player}. Tap the field where {player} should line up.',
  'stem.playlab.picked_up_chip': 'Picked up {player}: tap the field to place',
  'stem.playlab.canvas_move_hint': 'Click and drag a player to reposition them, or tap a player and then tap the field.',
  'stem.playlab.canvas_picked_up': 'Picked up: {player}.',
  'stem.ecosystem.kb_picked_up_tap': 'Picked up. Click or tap where it should go.',
  'stem.ecosystem.instr_move_tap': 'Move: Click and drag an entity to reposition it, or click or tap it, then click or tap where it should go.',
  'visuals.label_place_prompt': 'Click the picture where the label should go. Press Escape to cancel.',
  'visuals.label_placed': 'Label placed.',
  'visuals.label_anchor_placed': 'Leader-line anchor placed.',
  'visuals.label_move_aria': 'Move label {text}: select it, then click the picture where it should go',
  'visuals.label_move_title': 'Move: click here, then click the picture',
  'visuals.label_place_target_aria': 'Place label {text} in diagram panel {n}. Keyboard activation places it in the center; pointer activation uses the selected location.',
  'visuals.label_anchor_target_aria': 'Place the leader-line anchor of label {text} in diagram panel {n}. Keyboard activation places it in the center; pointer activation uses the selected location.',
  'visuals.label_place_sr': 'Place label',
  'visuals.label_placement_group': 'Label placement',
  'visuals.label_target_label': 'Label',
  'visuals.label_target_anchor': 'Leader-line anchor',
  'stem.flightsim.sprint_timer_label': 'Timer',
  'stem.flightsim.sprint_timer_on': 'On',
  'stem.flightsim.sprint_timer_relaxed': 'Relaxed (3×)',
  'stem.flightsim.sprint_timer_off': 'Off',
  'stem.flightsim.sprint_no_time_limit': 'No time limit',
  'stem.flightsim.sprint_untimed_hint': 'No time limit: the jet waits near each stop until you answer. You can answer while paused.',
  'stem.flightsim.sprint_timed_pause_hint': 'The route moves while you answer. Pause any time to read; you can answer while paused.',
  'stem.geo.prover_group_move': 'Move a point',
  'stem.geo.prover_select_prev': 'Previous point',
  'stem.geo.prover_select_next': 'Next point',
  'stem.geo.prover_selected_point': 'Selected: {label}',
  'stem.geo.prover_nudge_left': 'Move {label} left',
  'stem.geo.prover_nudge_up': 'Move {label} up',
  'stem.geo.prover_nudge_down': 'Move {label} down',
  'stem.geo.prover_nudge_right': 'Move {label} right',
};
// True cognates: the normal word in that language is spelled like the English.
const COGNATES = new Set([
  'chin_falam:visuals.label_target_label', 'chin_hakha:visuals.label_target_label', 'dutch:visuals.label_target_label',
  'indonesian:visuals.label_target_label', 'tagalog:visuals.label_target_label', 'italian:stem.flightsim.sprint_timer_label',
]);
const dig = (o, k) => k.split('.').reduce((n, p) => (n && typeof n === 'object' ? n[p] : undefined), o);
const placeholders = (s) => (String(s).match(/\{[a-z]+\}/g) || []).sort().join(',');

describe('new tap-aware and prompt keys are registered', () => {
  for (const rel of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'].filter((p) => existsSync(path.join(ROOT, p)))) {
    it(`${rel} holds every key with the call-site English`, () => {
      const ui = JSON.parse(read(rel));
      const wrong = Object.entries(KEYS).filter(([k, en]) => dig(ui, k) !== en).map(([k]) => k);
      expect(wrong).toEqual([]);
    });
  }
});

describe('every language pack translates the new keys', () => {
  const slugs = readdirSync(path.join(ROOT, 'lang')).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3));
  it('finds the language packs (the scan must not go blind)', () => {
    expect(slugs.length).toBeGreaterThanOrEqual(60);
  });
  it('has a non-English value with the same placeholders for every key in every pack', () => {
    const problems = [];
    for (const slug of slugs) {
      const pack = JSON.parse(read('lang/' + slug + '.js'));
      for (const [k, en] of Object.entries(KEYS)) {
        const v = dig(pack, k);
        if (typeof v !== 'string' || !v.trim()) { problems.push(`${slug} ${k}: missing`); continue; }
        if (v === en && !COGNATES.has(slug + ':' + k)) problems.push(`${slug} ${k}: English filler`);
        if (placeholders(v) !== placeholders(en)) problems.push(`${slug} ${k}: placeholders ${placeholders(v)}`);
        if (k === 'stem.playlab.sr_picked_up_player' && (v.match(/\{player\}/g) || []).length !== 2) problems.push(`${slug} ${k}: needs both {player}`);
        if (k.endsWith('single_key_shortcuts_sub') && !v.includes('?')) problems.push(`${slug} ${k}: lost the ? key`);
      }
    }
    expect(problems, problems.slice(0, 20).join('\n')).toEqual([]);
  }, 180000);
});

describe('call sites use the new keys', () => {
  it('Venn overlay, cloze hint and Word Sounds chip name the tap path', () => {
    const vr = read('view_renderers_source.jsx');
    expect(vr).toContain("? t('concept_map.overlay.venn_instructions_tap')");
    expect(vr).not.toContain("t('concept_map.overlay.venn_instructions')");
    expect(read('view_renderers_module.js')).toContain('t("concept_map.overlay.venn_instructions_tap")');
    const cloze = read('view_cloze_interaction_panel_source.jsx');
    expect(cloze).toContain("t('simplified.cloze_instructions_tap')");
    expect(cloze).not.toContain("t('simplified.cloze_instructions')");
    expect(read('view_cloze_interaction_panel_module.js')).toContain('t("simplified.cloze_instructions_tap")');
    const ws = read('word_sounds_module.js');
    expect(ws).toContain('ts("word_sounds.chip_drag_or_tap") || "' + KEYS['word_sounds.chip_drag_or_tap'] + '"');
    expect(ws).not.toContain('word_sounds.chip_drag_or_listen');
  });

  it('the node-select toast explains the next tap instead of "Drag to move"', () => {
    for (const f of ['host_handlers_source.jsx', 'host_handlers_module.js']) {
      const body = sliceBetween(read(f), 'const handleNodeClick', 'selection_cancelled', { file: f });
      expect(body, f).toContain('concept_map.overlay.venn_token_selected_tap');
      expect(body, f).toContain('concept_map.overlay.node_selected_tap');
      expect(body, f).not.toContain('standard_instructions');
    }
  });

  it('Play Lab, Ecosystem and visual panel prompts have no English-only literals left', () => {
    const pl = read('stem_lab/stem_tool_playlab.js');
    expect(pl).not.toMatch(/'Picked up ' \+|'Placed ' \+|\+ ' put down\.'|' Picked up: ' \+/);
    expect(pl).not.toContain("'. Click and drag a player to reposition them, or tap");
    const eco = read('stem_lab/stem_tool_ecosystem.js');
    expect(eco).not.toContain("announceToSR('Picked up. Click or tap where it should go.')");
    expect(eco).not.toContain("' (or click it, then click where it should go)'");
    const vp = read('visual_panel_source.jsx');
    expect(vp).not.toContain('Move label ${text}');
    expect(vp).not.toContain('title="Move: click here, then click the picture"');
    expect(vp).not.toContain('aria-label="Label placement"');
    expect(vp).not.toContain("'Leader line anchor' : 'Label') + ' placed.'");
  });

  it('every STEM call site passes the registered English as its fallback', () => {
    const sources = {
      playlab: read('stem_lab/stem_tool_playlab.js'),
      ecosystem: read('stem_lab/stem_tool_ecosystem.js'),
      flightsim: read('stem_lab/stem_tool_flightsim.js'),
      geo: read('stem_lab/stem_tool_geo.js'),
    };
    const misses = [];
    for (const [k, en] of Object.entries(KEYS)) {
      const m = k.match(/^stem\.([a-z]+)\./);
      if (!m) continue;
      const src = sources[m[1]];
      const lit = `'${k}', '${en.replace(/'/g, "\\'")}'`;
      if (!src.includes(lit) && !src.includes(lit.replace(', ', ','))) misses.push(k);
    }
    expect(misses).toEqual([]);
  });

  it('visual panel labels resolve through placeT with the registered English', () => {
    const vp = read('visual_panel_source.jsx');
    const misses = Object.entries(KEYS).filter(([k]) => k.startsWith('visuals.label_'))
      .filter(([k, en]) => !vp.includes(`placeT('${k}', '${en}'`)).map(([k]) => k);
    expect(misses).toEqual([]);
  });
});
