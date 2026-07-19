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
    expect(viewSource).toContain("_retryPersonaChoices('single')");
    expect(viewSource).toContain('personaState.panelSuggestionsError');
    expect(viewSource).toContain("_retryPersonaChoices('panel')");
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
    expect(viewSource).toContain('onClick={_savePersonaTranscript}');
    expect(viewSource).toContain("event.target.closest('[data-persona-definition-dialog], [data-persona-reflection-dialog], [data-persona-summary-dialog]')");
    expect(viewSource).toContain("if (e.key === 'Escape')");
    expect(viewSource).toContain('personaState.personaSummaryError && !personaSummary');
    expect(viewSource).toContain("t('persona.summary.refresh_failed')");
  });

  it('lets nested dialogs consume Escape without closing the parent interview', () => {
    const outerHandlerStart = viewSource.indexOf('var handleDialogKeyDown = function (event)');
    const outerHandlerEnd = viewSource.indexOf("dialog.addEventListener('keydown', handleDialogKeyDown)", outerHandlerStart);
    const outerHandler = viewSource.slice(outerHandlerStart, outerHandlerEnd);
    expect(outerHandler).toContain("event.target.closest('[data-persona-definition-dialog], [data-persona-reflection-dialog], [data-persona-summary-dialog]')");
    expect(outerHandler.indexOf('return;')).toBeLessThan(outerHandler.indexOf('personaCloseHandlerRef.current()'));
    const summaryScope = outerHandler.indexOf("dialog.querySelector('[data-persona-summary-dialog]')");
    const reflectionScope = outerHandler.indexOf("dialog.querySelector('[data-persona-reflection-dialog]')");
    const definitionScope = outerHandler.indexOf("dialog.querySelector('[data-persona-definition-dialog]')");
    expect(summaryScope).toBeGreaterThanOrEqual(0);
    expect(reflectionScope).toBeGreaterThan(summaryScope);
    expect(definitionScope).toBeGreaterThan(reflectionScope);

    const reflectionStart = viewSource.indexOf('{isPersonaReflectionOpen && (');
    const summaryStart = viewSource.indexOf('{isPersonaSummaryOpen && (');
    const reflectionDialog = viewSource.slice(reflectionStart, summaryStart);
    const summaryDialog = viewSource.slice(summaryStart);
    expect(reflectionDialog).toContain("if (e.key === 'Escape' && !reflectionBusy)");
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
    expect(strings.persona.verified_sources).toBe('Sources and search context');
    expect(strings.persona.grading_unavailable).toBeTruthy();
    expect(strings.persona.reflection_character_count).toContain('{limit}');
    expect(strings.persona.summary.no_usable_content).toBeTruthy();
  });

  it('normalizes untrusted resume snapshots against canonical Persona metadata', () => {
    expect(viewSource).toContain('var _normalizePersonaResumeSnapshot = function (snapshot)');
    expect(viewSource).toContain("var authoritativeCandidates = generatedContent && Array.isArray(generatedContent.data) ? generatedContent.data : []");
    expect(viewSource).toContain('if (!authoritativeCharacter) return null;');
    expect(viewSource).toContain('role: _boundedSnapshotText(authoritativeCharacter.role, 160)');
    expect(viewSource).toContain('guardrails: _boundedSnapshotText(authoritativeCharacter.guardrails, 4000)');
    expect(viewSource).toContain("guardrailsSource: authoritativeCharacter.guardrailsSource === 'teacher' ? 'teacher' : 'system'");
    expect(viewSource).not.toContain("guardrailsSource: character.guardrailsSource === 'teacher'");
    expect(viewSource).toContain(".slice(-80).reduce(function (list, message)");
    expect(viewSource).toContain('_boundedSnapshotText(message.text, 12000)');
    expect(viewSource).toContain('_boundedSnapshotNumber(rawState.topicSparkCount, 0, 2, 0)');
    expect(viewSource).toContain("snap.appId !== (appId || null)");
    expect(viewSource).toContain("if (!['single', 'panel'].includes(rawState.mode)) return null;");
    expect(viewSource).toContain("avatarUrl: mode === 'single' && selectedCharacter ? selectedCharacter.avatarUrl : null");
  });

  it('prevents stale scope reads and retention-off timers from restoring snapshots', () => {
    expect(viewSource).toContain('var cancelled = false;');
    expect(viewSource).toContain('if (cancelled || _dsCheckedKeyRef.current !== requestedKey) return;');
    expect(viewSource).toContain('return function () { cancelled = true; };');
    expect(viewSource).toContain('_personaSnapshotEnabledRef.current');
    expect(viewSource).toContain('_personaSnapshotLoadingRef.current');
    expect(viewSource).toContain('_personaSnapshotKeyRef.current !== scheduledSnapshotKey');
    expect(viewSource).toContain('[_personaSnapshotKey, _personaSnapshotEnabled, _personaRetentionDays, personaState.isLoading, _dsChatLen');
    expect(viewSource).toContain('_dsTopicSparkCount, _dsSuggestionFingerprint');
    expect(viewSource).toContain("while (chatHistory.length && chatHistory[chatHistory.length - 1].role === 'user') chatHistory.pop();");
    expect(viewSource).toContain('if (!_personaSnapshotEnabled || personaState.isLoading || _dsChatLen < 2 || personaResumeOffer)');
    const resumeStart = viewSource.indexOf('var _handleResumeSnapshot = function ()');
    const resumeEnd = viewSource.indexOf('var _handleDiscardSnapshot', resumeStart);
    const resumeHandler = viewSource.slice(resumeStart, resumeEnd);
    expect(resumeHandler).toContain('stopPlayback()');
    expect(resumeHandler).toContain('setPersonaAutoRead(false)');
    expect(resumeHandler).toContain('isGeneratingSuggestions: false');
    expect(resumeHandler).toContain('isGeneratingPanelSuggestions: false');
    expect(resumeHandler).toContain('isGeneratingTopicSpark: false');
    expect(resumeHandler).toContain('isGeneratingSummary: false');
    expect(resumeHandler).toContain('personaSummary: null');
    expect(resumeHandler).toContain('personaSummaryError: null');
  });

  it('waits for a completed turn before summary, transcript, or reflection actions', () => {
    expect(viewSource).toContain('summaryLastModelIndex > summaryLastUserIndex');
    expect(viewSource).toContain('var canGeneratePersonaSummary = !personaState.isLoading');
    expect(viewSource).toContain('disabled={personaState.chatHistory.length === 0 || personaState.isLoading || transcriptSavePending}');
    expect(viewSource).toContain('disabled={!panelConcludeReady || personaState.isLoading || isGeneratingReflectionPrompt}');
    expect(viewSource).toContain('disabled={!singleConcludeReady || personaState.isLoading || isGeneratingReflectionPrompt}');
    expect(viewSource).toContain("t('persona.finish_current_turn')");
  });

  it('guards rapid panel, summary, and reflection actions before rerender', () => {
    expect(viewSource).toContain('panelChoicePendingRef.current');
    expect(viewSource).toContain('summaryRequestPendingRef.current');
    expect(viewSource).toContain('reflectionSubmitPendingRef.current');
    expect(viewSource).toContain('onClick={_submitPersonaReflection}');
    expect(viewSource).toContain("disabled={!personaReflectionText.trim() || reflectionBusy || isGeneratingReflectionPrompt}");
    expect(viewSource).toContain("t('persona.reflection_character_count', { count: personaReflectionText.length, limit: 4000 })");
    expect(viewSource).toContain('reflectionOpenPendingRef.current');
    expect(viewSource).toContain('var _openPersonaReflection = function ()');
  });

  it('does not submit free responses while an IME composition is being confirmed', () => {
    const imeGuard = "e.key === 'Enter' && !e.isComposing && !(e.nativeEvent && e.nativeEvent.isComposing) && e.keyCode !== 229";
    expect(viewSource.split(imeGuard).length - 1).toBe(2);
  });

  it('bounds generated summary and feedback rendering while preserving an old summary during refresh', () => {
    expect(viewSource).toContain('var _boundedDisplayText = function (value, limit)');
    expect(viewSource).toContain('personaSummary.keyInsights.slice(0, 20)');
    expect(viewSource).toContain('var hasRenderableSummaryContent = Boolean(');
    expect(viewSource).toContain('summaryBusy && !personaSummary');
    expect(viewSource).toContain("t('persona.summary.no_usable_content')");
    expect(viewSource).toContain('summaryGeneratedAtLabel');
    expect(viewSource).toContain('reflectionFeedbackText.replace(/&/g');
  });

  it('keeps narrow layouts usable and panel choices readable', () => {
    expect(viewSource).toContain('h-[calc(100dvh-0.5rem)]');
    expect(viewSource).toContain('min-w-0 md:min-w-[320px]');
    expect(viewSource).toContain('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3');
    expect(viewSource).toContain('max-h-[40vh] md:max-h-none');
    expect(viewSource).toContain('max-h-[calc(100dvh-1rem)]');
    expect(personaUiSource).toContain('aria-valuenow={safeScore}');
    expect(personaUiSource).toContain("t('persona.xp_progress', { name: characterName, xp })");
  });

  it('guards every rapid secondary action before React rerenders', () => {
    expect(viewSource).toContain('transcriptSavePendingRef.current');
    expect(viewSource).toContain('transcriptSaveResetTimerRef.current');
    expect(viewSource.split('onClick={_savePersonaTranscript}').length - 1).toBe(3);
    expect(viewSource).toContain('topicSparkPendingRef.current');
    expect(viewSource.split('onClick={_requestPersonaTopicSpark}').length - 1).toBe(4);
    expect(viewSource).toContain('suggestionsRetryPendingRef.current');
    expect(viewSource.split("_retryPersonaChoices('panel')").length - 1).toBe(2);
    expect(viewSource.split("_retryPersonaChoices('single')").length - 1).toBe(2);
    expect(viewSource).toContain('resumeActionPendingRef.current');
  });

  it('clears retention-off snapshots and persists same-length state changes', () => {
    expect(viewSource).toContain('var _clearPersonaSnapshot = function (keyOverride)');
    expect(viewSource).toContain("ds.remove('persona_sessions', snapshotKeyToClear)");
    expect(viewSource).toContain('_personaRetentionDays === 0 && _personaSnapshotResourceId && _personaSnapshotStudentId');
    expect(viewSource).toContain('var _dsPersistenceFingerprint');
    expect(viewSource).toContain('_dsSuggestionFingerprint, _dsPersistenceFingerprint');
    expect(viewSource).toContain('matchingCharacters.length === 1 ? matchingCharacters[0] : null');
  });

  it('bounds long-session rendering without truncating live state', () => {
    expect(viewSource).toContain('personaChatHistory.length - 160');
    expect(viewSource).toContain('personaDisplayHistory = personaChatHistory.slice(personaDisplayStartIndex)');
    expect(viewSource.split("t('persona.older_messages_hidden'").length - 1).toBe(2);
    expect(strings.persona.older_messages_hidden).toContain('{count}');
  });

  it('makes Blueprint text entry bounded, IME-safe, and form-safe', () => {
    expect(personaUiSource).toContain('e.target.value.slice(0, 1200)');
    expect(personaUiSource).toContain('maxLength={1200}');
    expect(personaUiSource.split('maxLength={200}').length - 1).toBe(2);
    expect(personaUiSource.split("e.key === 'Enter' && !e.isComposing").length - 1).toBe(2);
    const buttons = personaUiSource.match(/<button\b[\s\S]*?>/g) || [];
    for (const button of buttons) expect(button).toContain('type="button"');
  });
});
