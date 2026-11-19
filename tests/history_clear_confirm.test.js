// Clear History (2026-11-18): the History panel's "Clear History" emptied the whole workspace at once, with no
// confirmation and no undo, while its help promised a confirmation. The panel now asks first. AlloBot's
// clearWorkspace command keeps the bare handler, because its command registry confirms destructive actions itself.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const ANTI = readFileSync('AlloFlowANTI.txt', 'utf8');
const ui = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const line = ANTI.split('\n').find((l) => l.includes('const handleClearHistoryWithConfirm = '));

describe('Clear History asks before emptying the workspace', () => {
  it('the panel gets the confirming handler; AlloBot keeps the bare one', () => {
    expect(line).toBeTruthy();
    expect(ANTI).toContain('handleClearHistory={handleClearHistoryWithConfirm}');
    expect(ANTI).not.toContain('handleClearHistory={handleClearHistory}');
    expect(readFileSync('allo_command_context_source.js', 'utf8')).toContain('clearWorkspace: handleClearHistory,');
  });
  it('nothing is cleared until the teacher confirms', () => {
    let dialog = null, cleared = 0;
    const fn = new Function('setConfirmDialog', 't', 'handleClearHistory', line.trim() + '\nreturn handleClearHistoryWithConfirm;')(
      (d) => { dialog = d; }, (k) => (k === 'history.clear_confirm' ? ui.history.clear_confirm : ui.history.clear), () => { cleared++; });
    fn();
    expect(cleared).toBe(0);
    expect(dialog.tone).toBe('danger');
    expect(dialog.message).toBe(ui.history.clear_confirm);
    expect(dialog.message).toContain('cannot be undone');
    dialog.onConfirm();
    expect(cleared).toBe(1);
  });
  it('the help says it asks first', () => {
    const help = readFileSync('help_strings.js', 'utf8');
    expect(help).toContain('AlloFlow asks you to confirm first; after that there is no undo.');
  });
});
