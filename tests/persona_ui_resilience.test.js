import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');
const viewSource = read('view_persona_chat_source.jsx');
const personaUiSource = read('persona_ui_source.jsx');
const personaCoreSource = read('personas_source.jsx');
const strings = JSON.parse(read('ui_strings.js'));

describe('Persona interview UI resilience', () => {
  it('offers recovery for empty and partial single and panel response choices', () => {
    expect(viewSource).toContain('personaState.suggestionsError');
    expect(viewSource).toContain('generatePersonaFollowUps(personaState.chatHistory, personaState.selectedCharacter, 6)');
    expect(viewSource).toContain('personaState.panelSuggestionsError');
    expect(viewSource).toContain('generatePanelFollowUps(personaState.chatHistory, personaState.selectedCharacters?.[0], personaState.selectedCharacters?.[1])');
    expect(viewSource).toContain("t('persona.retry_choices')");
    expect(viewSource).not.toContain("setPersonaState(function (prev) { return { ...prev, panelSuggestions: [] }; })");
    expect(viewSource).toContain('setPanelChoicePending(true)');
  });

  it('keeps panel choices visible until core accepts a valid, non-duplicate turn', () => {
    const uiHandlerStart = viewSource.indexOf('var _handlePanelChoice = function (option)');
    const uiHandlerEnd = viewSource.indexOf('var _openPersonaSummary = function', uiHandlerStart);
    const uiHandler = viewSource.slice(uiHandlerStart, uiHandlerEnd);
    expect(uiHandlerStart).toBeGreaterThanOrEqual(0);
    expect(uiHandler).toContain('setPanelChoicePending(true)');
    expect(uiHandler).toContain('handlePanelChatSubmit(option.text, true)');
    expect(uiHandler).not.toContain('setPersonaState');
    expect(uiHandler).not.toContain('panelSuggestions: []');

    const coreHandlerStart = personaCoreSource.indexOf('const handlePanelChatSubmit = async');
    const coreHandlerEnd = personaCoreSource.indexOf('// ─── handlePersonaChatSubmit', coreHandlerStart);
    const coreHandler = personaCoreSource.slice(coreHandlerStart, coreHandlerEnd);
    const choiceGuard = coreHandler.indexOf("if (!isPersonaFreeResponse && (!fromSuggestion || !allowedPanelChoices.includes(userText.trim())))");
    const busyGuard = coreHandler.indexOf('if (personaState.isLoading || activeTurnRequest) return;');
    const requestClaim = coreHandler.indexOf('activeTurnRequest = turnRequest;');
    const atomicClear = coreHandler.indexOf('panelSuggestions: []');
    expect(coreHandlerStart).toBeGreaterThanOrEqual(0);
    expect(choiceGuard).toBeGreaterThanOrEqual(0);
    expect(busyGuard).toBeGreaterThan(choiceGuard);
    expect(requestClaim).toBeGreaterThan(busyGuard);
    expect(atomicClear).toBeGreaterThan(requestClaim);
  });

  it('renders expandable mobile panelist progress and guarded portrait recovery', () => {
    expect(viewSource).toContain('<details key={char?.name || cIdx}');
    expect(viewSource).toContain("t('persona.xp_progress'");
    expect(viewSource).toContain("t('persona.objectives_label')");
    expect(viewSource).toContain('disabled={Boolean(char?.isUpdating)}');
    expect(personaUiSource).toContain('disabled={Boolean(character.isUpdating)}');
    expect(personaUiSource).toContain('z-30 pointer-events-auto');
  });

  it('normalizes resume retention and discloses the 80-message limit', () => {
    expect(viewSource).toContain("String(_storedPersonaRetentionRaw).trim() === ''");
    expect(viewSource).toContain('[0, 7, 14, 30].includes(_storedPersonaRetention)');
    expect(viewSource).toContain("t('persona.resume_recent_limit', { count: 80 })");
  });

  it('provides an accessible structured summary dialog and retry path', () => {
    expect(viewSource).toContain('data-persona-summary-dialog');
    expect(viewSource).toContain('handleGeneratePersonaSummary');
    expect(viewSource).toContain('personaState.personaSummaryError');
    expect(viewSource).toContain("t('persona.summary.verification_note')");
    expect(viewSource).toContain('onClick={handleSavePersonaChat}');
    expect(viewSource).toContain("event.target.closest('[data-persona-reflection-dialog], [data-persona-summary-dialog]')");
    expect(viewSource).toContain("if (e.key === 'Escape')");
    expect(viewSource).toContain('personaState.personaSummaryError && !personaSummary');
    expect(viewSource).toContain("t('persona.summary.refresh_failed')");
  });

  it('lets nested dialogs consume Escape without closing the parent interview', () => {
    const outerHandlerStart = viewSource.indexOf('var handleDialogKeyDown = function (event)');
    const outerHandlerEnd = viewSource.indexOf("dialog.addEventListener('keydown', handleDialogKeyDown)", outerHandlerStart);
    const outerHandler = viewSource.slice(outerHandlerStart, outerHandlerEnd);
    expect(outerHandler).toContain("event.target.closest('[data-persona-reflection-dialog], [data-persona-summary-dialog]')");
    expect(outerHandler.indexOf('return;')).toBeLessThan(outerHandler.indexOf('personaCloseHandlerRef.current()'));
    expect(outerHandler).toContain("dialog.querySelector('[data-persona-reflection-dialog], [data-persona-summary-dialog]') || dialog");

    const reflectionStart = viewSource.indexOf('{isPersonaReflectionOpen && (');
    const summaryStart = viewSource.indexOf('{isPersonaSummaryOpen && (');
    const reflectionDialog = viewSource.slice(reflectionStart, summaryStart);
    const summaryDialog = viewSource.slice(summaryStart);
    expect(reflectionDialog).toContain("if (e.key === 'Escape' && !isGradingReflection)");
    expect(reflectionDialog).toContain('e.stopPropagation()');
    expect(reflectionDialog).toContain('handleSetIsPersonaReflectionOpenToFalse()');
    expect(summaryDialog).toContain("if (e.key === 'Escape')");
    expect(summaryDialog).toContain('e.stopPropagation()');
    expect(summaryDialog).toContain('setIsPersonaSummaryOpen(false)');
  });

  it('moves focus into the summary and restores its invoking control on close', () => {
    expect(viewSource).toContain('var personaSummaryDialogRef = React.useRef(null)');
    expect(viewSource).toContain('var personaSummaryReturnFocusRef = React.useRef(null)');
    expect(viewSource).toContain('ref={personaSummaryDialogRef}');
    const effectStart = viewSource.indexOf('if (!isPersonaSummaryOpen) return undefined;');
    const effectEnd = viewSource.indexOf('}, [isPersonaSummaryOpen]);', effectStart);
    const focusEffect = viewSource.slice(effectStart, effectEnd);
    expect(effectStart).toBeGreaterThanOrEqual(0);
    expect(focusEffect).toContain('personaSummaryReturnFocusRef.current = document.activeElement');
    expect(focusEffect).toContain("dialog.querySelector('[data-persona-summary-initial-focus]')");
    expect(focusEffect).toContain('window.clearTimeout(focusTimer)');
    expect(focusEffect).toContain('previous.isConnected');
    expect(focusEffect).toContain('previous.focus()');
  });

  it('distinguishes locked and unlocked incomplete objectives on mobile', () => {
    expect(viewSource).toContain('const isLocked = rapport < Number(quest.difficulty || 0)');
    expect(viewSource).toContain('!quest.isCompleted && isLocked');
  });

  it('has localized recovery, accessibility, summary, and editor strings', () => {
    expect(strings.persona.common_ground).toBe('Common Ground Found!');
    expect(strings.persona.choices_generation_failed).toBeTruthy();
    expect(strings.persona.resume_recent_limit).toContain('{count}');
    expect(strings.persona.summary.verification_note).toBeTruthy();
    expect(strings.persona.verified_sources).toBeTruthy();
    expect(strings.persona.grading_unavailable).toBeTruthy();
  });
});
