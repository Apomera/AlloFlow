import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('research_hub_source.jsx', 'utf8');
const educatorSource = fs.readFileSync('research_hub_educator_source.jsx', 'utf8');
const alphaFoldSource = fs.readFileSync('alphafold_explorer/alphafold_explorer.html', 'utf8');

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

  it('renders the inquiry command center and rigor-labeled method packs', () => {
    expect(source).toContain('data-research-command="true"');
    expect(source).toContain('aria-label="Inquiry progress"');
    expect(source).toContain('Inquiry command center');
    expect(source).toContain('researchNextMove');
    expect(source).toContain('data-research-method-pack={pack.id}');
    expect(source).toContain('data-research-lane={pack.laneId}');
    expect(source).toContain('What rigor looks like');
    expect(source).toContain('Scientific Investigation');
    expect(source).toContain('Community & Qualitative Inquiry');
    expect(source).toContain('Creative & Cultural Inquiry');
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

  it('offers a transparent non-AI question-to-specific-method match', () => {
    expect(source).toContain('data-research-lane-match="true"');
    expect(source).toContain('Possible approach match - based only on words in your question');
    expect(source).toContain('This is not a verdict.');
    expect(source).toContain('Try this approach');
    expect(source).toContain('No single lens dominates.');
    expect(source).toContain('researchMethodMatch');
    expect(source).toContain('researchMethodMatch.packId === pack.id');
    expect(source).toContain('Approach match');
  });

  it('requires learner review before a tool artifact becomes evidence', () => {
    expect(source).toContain('data-research-capture-review="true"');
    expect(source).toContain('data-capture-consent="true"');
    expect(source).toContain('What do you notice or infer?');
    expect(source).toContain('What remains uncertain or needs another source?');
    expect(source).toContain('captureNote.trim().length < 12');
    expect(source).toContain('Also create an evidence card linked to this tool artifact.');
  });

  it('provides recovery-safe and provenance-rich portfolio export', () => {
    expect(source).toContain('data-research-recovery-warning="true"');
    expect(source).toContain('Download untouched recovery copy');
    expect(source).toContain('Download portfolio + provenance');
    expect(source).toContain('inquiryEpisodes: journal.inquiryEpisodes || []');
    expect(source).toContain('integrationHealth: summarizeIntegrationHealth');
    expect(source).toContain('inquiryAudit: buildInquiryAudit(journal)');
    expect(source).toContain('data-inquiry-evidence-audit="true"');
    expect(source).toContain('This is a reasoning check, not an automatic grade.');
    expect(source).toContain('data-capture-integration-contract="true"');
    expect(source).toContain('data-capture-unregistered-warning="true"');
    expect(source).toContain('Declared limitations:');
    expect(source).toContain('TOOL_INTEGRATION_CONTRACT_VERSION = 1');
  });

  it('shows method and tool provenance in educator view', () => {
    expect(educatorSource).toContain('Approach: <strong>{methodPackLabel(j.activeMethodPack)}</strong>');
    expect(educatorSource).toContain('Method, episodes, and tool provenance');
    expect(educatorSource).toContain('Learner interpretation:');
    expect(educatorSource).toContain('Qualitative plan:');
    expect(educatorSource).toContain('Open-source integration health');
    expect(educatorSource).toContain('data-educator-integration-health="true"');
    expect(educatorSource).toContain('does not independently certify');
    expect(educatorSource).toContain('data-humanities-source-context-health="true"');
  });

  it('connects AlphaFold through a sequence-free learner-approved capture', () => {
    expect(alphaFoldSource).toContain('id="sendResearchHubBtn"');
    expect(alphaFoldSource).toContain('ResearchHub.captureArtifact');
    expect(alphaFoldSource).toContain("sourceToolId: 'alphafold_explorer'");
    expect(alphaFoldSource).toContain('function redactSequenceLikeText');
    expect(alphaFoldSource).toContain('[protein sequence omitted]');
    expect(alphaFoldSource).toContain('Sequence-like strings of 40 or more characters are redacted');
    expect(alphaFoldSource).toContain('ALPHAFOLD_RESEARCH_CONTRACT');
    expect(alphaFoldSource).toContain("spdx: 'AGPL-3.0-only'");
    expect(alphaFoldSource).toContain('integrationContract: ALPHAFOLD_RESEARCH_CONTRACT');
    expect(alphaFoldSource).toContain('reproducibility: {');
    expect(alphaFoldSource).toContain("randomSeed: 'not applicable'");
    expect(alphaFoldSource).toContain('Predicted structure confidence is not experimental validation.');
    expect(alphaFoldSource).not.toContain('data: { sequence:');
  });

  it('redacts sequence-like notebook text behaviorally before capture or storage', () => {
    const functionSource = alphaFoldSource.match(/function redactSequenceLikeText\(value\) \{[\s\S]*?\r?\n  \}/)?.[0];
    expect(functionSource).toBeTruthy();
    const redact = new Function(functionSource + '; return redactSequenceLikeText;')();
    expect(redact('ACGT'.repeat(12))).toBe('[nucleic-acid sequence omitted]');
    expect(redact('MKWVTFISLLFLFSSAYSRGVFRRDTHKSEIAHRFKDLGE')).toBe('[protein sequence omitted]');
    expect(redact('short ACGT note')).toBe('short ACGT note');
    expect(alphaFoldSource).toContain('entries: notebookEntryState.slice(0, 100).map');
    expect(alphaFoldSource).toContain('name: redactSequenceLikeText');
  });
  it('connects the inquiry question to its visible help', () => {
    expect(source).toContain('id="research-hub-question-help"');
    expect(source).toContain('aria-describedby="research-hub-question-help"');
  });

  it('makes cross-approach continuity visible in an Inquiry Portfolio', () => {
    expect(source).toContain('data-research-backpack="true"');
    expect(source).toContain('data-inquiry-portfolio="true"');
    expect(source).toContain('Inquiry Portfolio');
    expect(source).toContain('Saved on this device');
    expect(source).toContain('Portfolio continuity');
    expect(source).toContain('Everything here travels with you when you switch inquiry approaches or workspaces.');
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
