import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_typingpractice.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_typingpractice.js'), 'utf8');
const host = fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab_module.js'), 'utf8');

describe('Typing Practice locale speech and profile controls', () => {
  it('forwards the active passage language for both preview and word-by-word speech', () => {
    expect(source).toContain('ctx.callTTS(targetStr, null, 1.0, { force: true, language: activeTargetLanguage })');
    expect(source).toContain('ctx.callTTS(result.lastCompletedWord, null, 1.1, { force: false, language: activeTargetLanguage })');
    expect(source).toContain('activeTargetLanguage, typed');
    expect(host).toContain('return callTTS(text, voice, speed, opts).then(function(url)');
  });

  it('keeps the keyboard layout setting available without the visual keyboard', () => {
    expect(source).not.toContain("(acc.largeKeys || acc.showKeyboard) ? h('div', { style: { padding: '12px 0'");
    expect(source).toContain('This setting stays available even when the visual keyboard is hidden.');
  });

  it('keeps profile buttons operable and exposes their selected state', () => {
    expect(source).toContain("id: 'tp-keyboard-layout-label'");
    expect(source).toContain("'aria-labelledby': 'tp-keyboard-layout-label'");
    expect(source).toContain("'aria-pressed': active ? 'true' : 'false'");
    expect(source).toContain("upd('keyboardLayout', opt.id)");
    expect(source).toContain('renderOnScreenKeyboard(nextKeyMeta, palette, state.accommodations.focusKeyboard, state.keyboardLayout)');
    expect(source).toContain('renderErrorHeatmap(agg, maxErr, palette, state.keyboardLayout)');
  });

  it('round-trips the selected keyboard layout in portable profiles', () => {
    expect(source).toContain("keyboardLayout: state.keyboardLayout || 'qwerty-us'");
    expect(source).toContain('if (parsed.keyboardLayout !== undefined)');
    expect(source).toContain("Object.prototype.hasOwnProperty.call(KEYBOARD_LAYOUTS, parsed.keyboardLayout)");
    expect(source).toContain("throw new Error('Unknown keyboard layout.')");
    expect(source).toContain('updates.keyboardLayout = parsed.keyboardLayout');
    expect(source).toContain('audio theme, and keyboard layout will be replaced');
  });

  it('guards full-backup restore against unknown keyboard layouts', () => {
    expect(source).toContain("parsed.state.keyboardLayout !== undefined");
    expect(source).toContain("Backup uses an unknown keyboard layout.");
    expect(source).toContain("var restorePreview =");
    expect(source).toContain("Keyboard layout: ' + layoutLabel");
  });

  it('gives battle pressure gauges an explicit spoken value', () => {
    expect(source).toContain("'aria-valuetext': s.length + ' of ' + BATTLE_STACK_LIMIT + ' rows in stack'");
  });

  it('announces countdown and pause status changes to assistive technology', () => {
    expect(source).toContain("'aria-live': 'polite',\n              'aria-atomic': 'true',\n              style: {");
    expect(source).toContain("id: 'tp-drill-paused-status',\n                role: 'note',\n                'aria-live': 'polite',\n                'aria-atomic': 'true'");
  });

  it('keeps the authoritative source and desktop mirror byte-aligned', () => {
    expect(mirror).toBe(source);
  });
});
