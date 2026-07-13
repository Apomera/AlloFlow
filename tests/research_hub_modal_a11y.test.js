import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('research_hub_source.jsx', 'utf8');

describe('Research Hub modal accessibility', () => {
  it('places named and described modal semantics on the panel', () => {
    expect(source).toContain('role="presentation"\n        data-help-key="research_hub"');
    expect(source).toContain('ref={dialogRef}\n          tabIndex={-1}\n          role="dialog"');
    expect(source).toContain('aria-labelledby="research-hub-dialog-title"');
    expect(source).toContain('aria-describedby="research-hub-dialog-description"');
  });

  it('flushes the latest journal and reports truthful save status', () => {
    expect(source).toContain('data-research-save-status="true"');
    expect(source).toContain('Saving latest changes...');
    expect(source).toContain("var _saveStatus = useState('saved')");
    expect(source).toContain('saveJournal(journal);');
    expect(source).toContain("window.addEventListener('pagehide', flushLatestJournal)");
    expect(source).toContain("window.addEventListener('beforeunload', flushLatestJournal)");
    expect(source).toContain('flushLatestJournal();');
    expect(source).not.toContain('saveScheduledRef');
  });

  it('does not disappear on accidental backdrop clicks during file or resource work', () => {
    expect(source).toContain('data-backdrop-dismiss-disabled="true"');
    expect(source).toContain('data-research-exit-hint="true"');
    expect(source).toContain('Your Research Hub stayed open.');
    expect(source).toContain('downloads, resource packs, and saved files');
    expect(source).toContain('if (e.target === e.currentTarget) setShowExitHint(true)');
    expect(source).not.toContain("e.target === e.currentTarget && typeof onClose === 'function'");
    expect(source).toContain('Use Close or press Escape');
  });

  it('focuses Close, contains Tab, dismisses with Escape, and returns focus', () => {
    expect(source).toContain('(closeButtonRef.current || getFocusable()[0] || dialog).focus()');
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).toContain('previousFocus.isConnected');
    expect(source).toContain('ref={closeButtonRef}');
  });

  it('announces lane and educator-view changes', () => {
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(source).toContain("activeLane ? activeLane.label");
  });

  it('renders the inquiry command center and guided lane cards', () => {
    expect(source).toContain('data-research-command="true"');
    expect(source).toContain('aria-label="Inquiry progress"');
    expect(source).toContain('Inquiry command center');
    expect(source).toContain('researchNextMove');
    expect(source).toContain('data-research-lane={L.id}');
    expect(source).toContain('Best for explaining phenomena');
    expect(source).toContain('Best for solving constrained problems');
    expect(source).toContain('Best for interpreting people and systems');
  });

  it('supports student-authored question framing with live non-AI signals', () => {
    expect(source).toContain('data-research-question-coach="true"');
    expect(source).toContain('aria-label="Inquiry question starters"');
    expect(source).toContain('What patterns do you notice in ');
    expect(source).toContain('Whose perspectives are missing from ');
    expect(source).toContain('Open to investigation');
    expect(source).toContain('Focused enough to explore');
    expect(source).toContain('Ready to investigate');
    expect(source).toContain('researchQuestionReady');
  });

  it('offers a transparent non-AI question-to-lane match', () => {
    expect(source).toContain('data-research-lane-match="true"');
    expect(source).toContain('Possible lens match - based only on words in your question');
    expect(source).toContain('This is not a verdict.');
    expect(source).toContain('Try this lens');
    expect(source).toContain('No single lens dominates.');
    expect(source).toContain('researchLaneMatch');
    expect(source).toContain('Lens match');
  });

  it('connects the inquiry question to its visible help', () => {
    expect(source).toContain('id="research-hub-question-help"');
    expect(source).toContain('aria-describedby="research-hub-question-help"');
  });

  it('makes cross-lane journal continuity visible in a Research Backpack', () => {
    expect(source).toContain('data-research-backpack="true"');
    expect(source).toContain('Research Backpack');
    expect(source).toContain('Saved on this device');
    expect(source).toContain('Journal continuity');
    expect(source).toContain('Everything here travels with you when you switch research lanes.');
    expect(source).toContain('models, concepts, framings');
    expect(source).toContain('documented loop-backs');
  });

  it('uses a safe-default alert dialog for destructive inquiry reset', () => {
    expect(source).not.toContain('window.confirm');
    expect(source).toContain('role="alertdialog"');
    expect(source).toContain('aria-labelledby="research-hub-reset-title"');
    expect(source).toContain('aria-describedby="research-hub-reset-description"');
    expect(source).toContain('data-safe-default="true"');
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
  });

  it('restores focus after reset cancellation or completion', () => {
    expect(source).toContain('requestClearJournal');
    expect(source).toContain('trigger.isConnected');
    expect(source).toContain('closeButtonRef.current.focus()');
    expect(source).toContain("minHeight: '44px'");
  });

  it('synchronizes the deployable module', () => {
    expect(fs.readFileSync('prismflow-deploy/public/research_hub_module.js', 'utf8')).toBe(fs.readFileSync('research_hub_module.js', 'utf8'));
  });
});
