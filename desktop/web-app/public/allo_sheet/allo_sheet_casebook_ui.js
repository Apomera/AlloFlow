(function (root, factory) {
  'use strict';

  var api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root) {
    root.AlloSheetCasebookUI = api;
    root.AlloModules = root.AlloModules || {};
    root.AlloModules.AlloSheetCasebookUI = api;
  }
})(
  typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this),
  function () {
    'use strict';

    function create(host) {
      if (!host || !host.model) throw new Error('AlloSheet casebook UI requires the casebook model.');
      var Model = host.model;
      var builderParameters = [];
      var activeCaseId = '';
      var draft = null;
      var captureSource = 'typed';
      var recognition = null;
      var voiceStatus = { state: 'idle', engine: '', engineLabel: '', privacy: '', message: '', reason: '' };
      var boundTables = null;
      var contextDirty = false;

      function byId(id) { return document.getElementById(id); }
      function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }
      function text(node, value) {
        if (node) node.textContent = String(value == null ? '' : value);
      }
      function make(tag, value, className) {
        var node = document.createElement(tag);
        if (value !== undefined && value !== null) node.textContent = String(value);
        if (className) node.className = className;
        return node;
      }
      function announce(message) {
        if (typeof host.announce === 'function') host.announce(message);
      }
      function setError(id, message, control) {
        var error = byId(id);
        if (!error) return;
        text(error, message);
        error.hidden = false;
        if (control) control.setAttribute('aria-invalid', 'true');
        if (typeof error.focus === 'function' && error.hasAttribute('tabindex')) error.focus();
        announce(message);
      }
      function clearError(id, controls) {
        var error = byId(id);
        if (error) {
          error.hidden = true;
          text(error, '');
        }
        (controls || []).forEach(function (controlId) {
          var control = byId(controlId);
          if (control) control.removeAttribute('aria-invalid');
        });
      }
      function safeDateLabel(value) {
        var date = new Date(value);
        if (!Number.isFinite(date.getTime())) return 'Date unavailable';
        try {
          return new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short'
          }).format(date);
        } catch (_) {
          return date.toLocaleString();
        }
      }
      function localDateTimeValue(value) {
        var date = value instanceof Date ? value : new Date(value || Date.now());
        if (!Number.isFinite(date.getTime())) date = new Date();
        var adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return adjusted.toISOString().slice(0, 16);
      }
      function currentBook() {
        return Model.inspectTables(typeof host.getTables === 'function' ? host.getTables() : []);
      }
      function selectedCase(book) {
        var id = String(byId('casebookCaseSelect') && byId('casebookCaseSelect').value || activeCaseId || '');
        return book && book.cases.find(function (item) { return item.id === id; }) || null;
      }
      function setSelectedTemplate(id) {
        document.querySelectorAll('.casebook-template-button').forEach(function (button) {
          button.setAttribute('aria-pressed', button.dataset.casebookTemplate === id ? 'true' : 'false');
        });
      }

      function parameterMeta(parameter) {
        var parts = [parameter.type === 'boolean' ? 'yes / no' : parameter.type];
        if (parameter.unit) parts.push(parameter.unit);
        if (parameter.type === 'number' && (parameter.minimum !== null && parameter.minimum !== '' || parameter.maximum !== null && parameter.maximum !== '')) {
          parts.push('expected ' + (parameter.minimum === null || parameter.minimum === '' ? 'any' : parameter.minimum)
            + ' to ' + (parameter.maximum === null || parameter.maximum === '' ? 'any' : parameter.maximum));
        }
        if (parameter.prompt) parts.push(parameter.prompt);
        return parts.join(' · ');
      }

      function renderBuilderParameters() {
        var list = byId('casebookParameterList');
        if (!list) return;
        clear(list);
        if (!builderParameters.length) {
          var empty = make('li', 'No parameters yet. Add one below or choose a starter above.', 'casebook-parameter-item');
          list.appendChild(empty);
          return;
        }
        builderParameters.forEach(function (parameter, index) {
          var item = make('li', null, 'casebook-parameter-item');
          var header = make('div', null, 'casebook-parameter-item-header');
          header.appendChild(make('strong', parameter.label, ''));
          var remove = make('button', 'Remove', 'quiet-button');
          remove.type = 'button';
          remove.dataset.parameterIndex = String(index);
          remove.setAttribute('aria-label', 'Remove ' + parameter.label + ' parameter');
          remove.addEventListener('click', function () {
            builderParameters.splice(Number(remove.dataset.parameterIndex), 1);
            setSelectedTemplate('');
            renderBuilderParameters();
            announce(parameter.label + ' removed from the casebook draft.');
          });
          header.appendChild(remove);
          item.appendChild(header);
          item.appendChild(make('p', parameterMeta(parameter), 'casebook-parameter-meta'));
          list.appendChild(item);
        });
      }

      function syncParameterType() {
        var numeric = byId('casebookParameterType').value === 'number';
        ['casebookParameterMinimum', 'casebookParameterMaximum'].forEach(function (id) {
          var control = byId(id);
          control.disabled = !numeric;
          if (!numeric) control.value = '';
        });
      }

      function clearParameterComposer() {
        byId('casebookParameterLabel').value = '';
        byId('casebookParameterType').value = 'number';
        byId('casebookParameterUnit').value = '';
        byId('casebookParameterMinimum').value = '';
        byId('casebookParameterMaximum').value = '';
        byId('casebookParameterPrompt').value = '';
        syncParameterType();
      }

      function normalizeBuilder(parameters) {
        return Model.normalizeDefinition({
          title: byId('casebookTitleInput').value || 'Casebook',
          caseLabel: byId('casebookCaseLabelInput').value || 'Case',
          description: byId('casebookDescriptionInput').value || '',
          privacyMode: byId('casebookPrivacyModeInput').value || 'general',
          cases: ['Example case'],
          parameters: parameters
        }).parameters;
      }

      function addParameter() {
        clearError('casebookSetupError', [
          'casebookParameterLabel', 'casebookParameterMinimum', 'casebookParameterMaximum'
        ]);
        var labelControl = byId('casebookParameterLabel');
        try {
          var next = builderParameters.concat([{
            label: labelControl.value,
            type: byId('casebookParameterType').value,
            unit: byId('casebookParameterUnit').value,
            minimum: byId('casebookParameterMinimum').value,
            maximum: byId('casebookParameterMaximum').value,
            prompt: byId('casebookParameterPrompt').value,
            aliases: [labelControl.value]
          }]);
          builderParameters = normalizeBuilder(next);
          setSelectedTemplate('');
          renderBuilderParameters();
          clearParameterComposer();
          labelControl.focus();
          announce('Parameter added. The casebook draft now has ' + builderParameters.length + ' parameters.');
        } catch (error) {
          setError('casebookSetupError', String(error && error.message || error), labelControl);
        }
      }

      function applyTemplate(id) {
        clearError('casebookSetupError');
        try {
          var template = Model.getTemplate(id);
          byId('casebookTitleInput').value = template.title;
          byId('casebookCaseLabelInput').value = template.caseLabel;
          byId('casebookDescriptionInput').value = template.description;
          byId('casebookCasesInput').value = template.cases.join('\n');
          byId('casebookPrivacyModeInput').value = template.privacyMode;
          builderParameters = Model.normalizeDefinition(template).parameters;
          setSelectedTemplate(id);
          renderBuilderParameters();
          text(
            byId('casebookPrivacyHint'),
            template.privacyMode === 'learner-support'
              ? 'Use coded identifiers when possible, record observable evidence, and store downloaded files only in an approved secure location.'
              : 'This starter is general observation data. You decide whether any case names or notes are sensitive.'
          );
          byId('casebookTitleInput').focus();
          byId('casebookTitleInput').select();
          announce(template.title + ' starter loaded. Review every case and parameter before creating it.');
        } catch (error) {
          setError('casebookSetupError', String(error && error.message || error));
        }
      }

      function resetBuilder() {
        byId('casebookTitleInput').value = 'My observation casebook';
        byId('casebookCaseLabelInput').value = 'Case';
        byId('casebookDescriptionInput').value = '';
        byId('casebookCasesInput').value = 'Case 1\nCase 2';
        byId('casebookPrivacyModeInput').value = 'general';
        builderParameters = [];
        setSelectedTemplate('');
        clearParameterComposer();
        renderBuilderParameters();
        clearError('casebookSetupError');
        text(byId('casebookPrivacyHint'), 'Learner-support mode adds reminders to use coded identifiers, observable evidence, and approved storage.');
      }

      function createCasebook(event) {
        if (event) event.preventDefault();
        clearError('casebookSetupError', [
          'casebookTitleInput', 'casebookCaseLabelInput', 'casebookCasesInput'
        ]);
        try {
          var definition = Model.normalizeDefinition({
            title: byId('casebookTitleInput').value,
            caseLabel: byId('casebookCaseLabelInput').value,
            description: byId('casebookDescriptionInput').value,
            privacyMode: byId('casebookPrivacyModeInput').value,
            cases: byId('casebookCasesInput').value,
            parameters: builderParameters
          });
          if (typeof host.confirmReplacement === 'function' && !host.confirmReplacement()) return;
          var tables = Model.buildTables(definition, new Date().toISOString());
          draft = null;
          captureSource = 'typed';
          activeCaseId = tables[1].records[0].id;
          host.installCasebook(tables, definition);
          refresh();
          host.setView('casebook');
          byId('casebookNarrative').focus();
          announce(definition.title + ' created locally with ' + definition.cases.length + ' cases and ' + definition.parameters.length + ' parameters.');
        } catch (error) {
          setError('casebookSetupError', String(error && error.message || error));
        }
      }

      function fillCaseSelect(book) {
        var select = byId('casebookCaseSelect');
        var preferred = activeCaseId || select.value;
        clear(select);
        book.cases.forEach(function (caseItem) {
          var option = document.createElement('option');
          option.value = caseItem.id;
          option.textContent = caseItem.name + ' (' + caseItem.id + ')';
          select.appendChild(option);
        });
        if (book.cases.some(function (item) { return item.id === preferred; })) select.value = preferred;
        activeCaseId = select.value;
      }

      function updateCaseContextActions(book) {
        var caseItem = selectedCase(book);
        var locked = Boolean(draft);
        var input = byId('casebookCaseContext');
        if (input) input.disabled = locked || !caseItem;
        byId('saveCasebookCaseContextButton').disabled = locked || !caseItem || !contextDirty;
        byId('resetCasebookCaseContextButton').disabled = locked || !caseItem || !contextDirty;
      }

      function renderCaseContext(book, force) {
        var input = byId('casebookCaseContext');
        var caseItem = selectedCase(book);
        if (!caseItem) {
          input.value = '';
          input.dataset.caseId = '';
          contextDirty = false;
          text(byId('casebookCaseContextStatus'), '');
          updateCaseContextActions(book);
          return;
        }
        text(
          byId('casebookCaseContextLabel'),
          book.definition.caseLabel + ' description / stable context (optional)'
        );
        text(
          byId('casebookCaseContextHint'),
          book.definition.privacyMode === 'learner-support'
            ? 'Keep this minimal and approved, prefer coded identifiers, and use it only for stable access or learning context. It is not included in agent reflection unless you explicitly select the Cases table.'
            : 'Use this for stable setup or background. Changing it does not rewrite earlier observations, and it is not included in agent reflection unless you explicitly select the Cases table.'
        );
        if (force || input.dataset.caseId !== caseItem.id || !contextDirty) {
          input.value = caseItem.context || '';
          input.dataset.caseId = caseItem.id;
          contextDirty = false;
          clearError('casebookCaseContextError', ['casebookCaseContext']);
          text(byId('casebookCaseContextStatus'), '');
        }
        updateCaseContextActions(book);
      }

      function blockUnsavedCaseContext(message) {
        if (!contextDirty) return false;
        setError(
          'casebookCaseContextError',
          message || 'Save or undo the current case-context edits before switching cases or creating an observation.',
          byId('casebookCaseContext')
        );
        return true;
      }

      function hasPendingEdits() {
        return contextDirty;
      }

      function focusPendingEdits(message) {
        if (!contextDirty) return false;
        if (typeof host.setView === 'function') host.setView('casebook');
        blockUnsavedCaseContext(message);
        return true;
      }

      function saveCaseContext(event) {
        if (event) event.preventDefault();
        var book = currentBook();
        var caseItem = selectedCase(book);
        clearError('casebookCaseContextError', ['casebookCaseContext']);
        try {
          if (!caseItem) throw new Error('Choose a valid case first.');
          if (draft) throw new Error('Finish or discard the review draft before changing case context.');
          var record = Model.createCaseContextUpdate(book, caseItem.id, byId('casebookCaseContext').value);
          host.replaceRecord(Model.tableIds.cases, record, 'case-context');
          contextDirty = false;
          text(
            byId('casebookCaseContextStatus'),
            'Case context saved locally. Earlier observation rows were not changed.'
          );
          updateCaseContextActions(currentBook());
          announce('Case context saved locally. Earlier observations were not changed.');
        } catch (error) {
          setError(
            'casebookCaseContextError',
            String(error && error.message || error),
            byId('casebookCaseContext')
          );
        }
      }

      function resetCaseContext() {
        var book = currentBook();
        var caseItem = selectedCase(book);
        if (!caseItem || draft) return;
        contextDirty = false;
        renderCaseContext(book, true);
        text(byId('casebookCaseContextStatus'), 'Unsaved context edits were undone.');
        byId('casebookCaseContext').focus();
        announce('Unsaved case-context edits were undone.');
      }

      function addCase() {
        var input = byId('casebookNewCaseName');
        clearError('casebookCaseError', ['casebookNewCaseName']);
        var book = currentBook();
        try {
          if (blockUnsavedCaseContext()) return;
          var record = Model.createCase(book, input.value);
          activeCaseId = record.id;
          host.appendRecord(Model.tableIds.cases, record, 'case');
          input.value = '';
          refresh();
          byId('casebookNarrative').focus();
          announce('Case added. It is now selected for observation.');
        } catch (error) {
          setError('casebookCaseError', String(error && error.message || error), input);
        }
      }

      function voiceBusy() {
        return voiceStatus.state === 'starting' || voiceStatus.state === 'listening' || voiceStatus.state === 'transcribing';
      }

      function updateDraftLock() {
        var locked = Boolean(draft);
        ['casebookCaseSelect', 'casebookNewCaseName', 'casebookAddCaseButton', 'casebookObservedAt', 'casebookNarrative', 'casebookCaseContext']
          .forEach(function (id) {
            var control = byId(id);
            if (control) control.disabled = locked;
          });
        updateCaseContextActions(currentBook());
        updateVoiceButton();
        updateRepeatButton(currentBook());
      }

      function draftReviewWarnings(book) {
        var warnings = draft && Array.isArray(draft.warnings) ? draft.warnings.slice() : [];
        if (!draft || !book) return warnings;
        var targetCase = book.cases.find(function (item) { return item.id === draft.caseId; });
        var initialCase = book.cases.find(function (item) { return item.id === draft.initialCaseId; });
        var mentionedCases = (draft.mentionedCaseIds || []).map(function (caseId) {
          return book.cases.find(function (item) { return item.id === caseId; });
        }).filter(Boolean);
        if (mentionedCases.length === 1 && targetCase) {
          var mentionedCase = mentionedCases[0];
          if (targetCase.id === mentionedCase.id && initialCase && initialCase.id !== targetCase.id) {
            warnings.unshift(
              'The narrative names ' + targetCase.name + ', while ' + initialCase.name
                + ' was selected. The draft target was changed to ' + targetCase.name + '; confirm it before recording.'
            );
          } else if (targetCase.id !== mentionedCase.id) {
            warnings.unshift(
              'The narrative names ' + mentionedCase.name + ', while ' + targetCase.name
                + ' is now the draft target. Confirm the target before recording.'
            );
          }
        } else if (mentionedCases.length > 1) {
          warnings.unshift(
            'The narrative names multiple cases (' + mentionedCases.map(function (item) { return item.name; }).join(', ')
              + '). One entry records one case; choose the correct target before recording.'
          );
        }
        return warnings;
      }

      function renderDraftWarnings(book) {
        var warnings = byId('casebookDraftWarnings');
        clear(warnings);
        draftReviewWarnings(book).forEach(function (warning) {
          warnings.appendChild(make('li', warning, ''));
        });
      }

      function renderDraft(book) {
        var panel = byId('casebookDraftReview');
        var container = byId('casebookDraftFields');
        clear(container);
        if (!draft) {
          panel.hidden = true;
          updateDraftLock();
          return;
        }
        text(byId('casebookDraftCaseLabel'), book.definition.caseLabel + ' target');
        var targetSelect = byId('casebookDraftCaseSelect');
        clear(targetSelect);
        book.cases.forEach(function (caseItem) {
          var option = document.createElement('option');
          option.value = caseItem.id;
          option.textContent = caseItem.name + ' (' + caseItem.id + ')';
          targetSelect.appendChild(option);
        });
        targetSelect.value = draft.caseId;
        var draftCase = book.cases.find(function (item) { return item.id === targetSelect.value; });
        text(
          byId('casebookDraftCaseContext'),
          draftCase && draftCase.context
            ? 'Current stable context: ' + draftCase.context
            : 'No stable context is saved for this case.'
        );
        var draftTime = byId('casebookDraftObservedAt');
        draftTime.dateTime = draft.observedAt;
        text(draftTime, safeDateLabel(draft.observedAt));
        book.parameters.forEach(function (parameter) {
          var wrapper = make('div', null, 'casebook-draft-field');
          var label = document.createElement('label');
          label.textContent = parameter.label + (parameter.unit ? ' (' + parameter.unit + ')' : '');
          var control;
          var current = draft.values[parameter.key];
          if (parameter.type === 'boolean') {
            control = document.createElement('select');
            [
              ['', 'Not recorded'],
              ['true', 'Yes'],
              ['false', 'No']
            ].forEach(function (item) {
              var option = document.createElement('option');
              option.value = item[0];
              option.textContent = item[1];
              control.appendChild(option);
            });
            control.value = current === true ? 'true' : current === false ? 'false' : '';
          } else {
            control = document.createElement('input');
            control.type = parameter.type === 'number' ? 'number' : 'text';
            if (parameter.type === 'number') {
              control.step = 'any';
              control.inputMode = 'decimal';
            }
            control.maxLength = parameter.type === 'number' ? 100 : Model.limits.maxNarrativeChars;
            control.value = current === null || current === undefined ? '' : String(current);
          }
          control.dataset.casebookParameterKey = parameter.key;
          control.dataset.casebookParameterType = parameter.type;
          control.setAttribute('aria-describedby', 'casebookDraftError');
          label.appendChild(control);
          wrapper.appendChild(label);
          var details = [];
          if (parameter.prompt) details.push(parameter.prompt);
          if (parameter.type === 'number' && (parameter.minimum !== null || parameter.maximum !== null)) {
            details.push('Expected context: ' + (parameter.minimum === null ? 'any' : parameter.minimum)
              + ' to ' + (parameter.maximum === null ? 'any' : parameter.maximum));
          }
          if (details.length) wrapper.appendChild(make('p', details.join(' '), 'field-hint'));
          container.appendChild(wrapper);
        });
        byId('casebookDraftNote').value = draft.note || '';
        byId('casebookDraftInterpretation').value = draft.interpretation || '';
        renderDraftWarnings(book);
        clearError('casebookDraftError');
        panel.hidden = false;
        updateDraftLock();
        byId('casebookDraftTitle').focus();
      }

      function draftObservation(event) {
        if (event) event.preventDefault();
        clearError('casebookCaptureError', ['casebookObservedAt', 'casebookNarrative']);
        var book = currentBook();
        var caseItem = selectedCase(book);
        var dateControl = byId('casebookObservedAt');
        var narrativeControl = byId('casebookNarrative');
        if (blockUnsavedCaseContext()) return;
        try {
          if (voiceBusy()) throw new Error('Finish dictation before creating a review draft.');
          if (!caseItem) throw new Error('Choose a valid case first.');
          if (!dateControl.value || !Number.isFinite(new Date(dateControl.value).getTime())) {
            throw new Error('Choose a valid observation date and time.');
          }
          var parsed = Model.parseNarrative(narrativeControl.value, book.parameters, { source: captureSource });
          var mentionedCases = Model.findCaseMentions(narrativeControl.value, book.cases);
          var targetCase = caseItem;
          if (mentionedCases.length === 1 && mentionedCases[0].id !== caseItem.id) {
            targetCase = mentionedCases[0];
          }
          draft = {
            caseId: targetCase.id,
            initialCaseId: caseItem.id,
            mentionedCaseIds: mentionedCases.map(function (item) { return item.id; }),
            observedAt: new Date(dateControl.value).toISOString(),
            values: parsed.values,
            note: parsed.note,
            interpretation: parsed.interpretation,
            source: parsed.source,
            warnings: (parsed.warnings || []).slice()
          };
          renderDraft(book);
          text(
            byId('casebookCaptureStatus'),
            parsed.matched.length + ' of ' + book.parameters.length + ' parameter values recognized. Review before recording.'
          );
          announce('Observation draft created. Nothing has been recorded yet.');
        } catch (error) {
          var message = String(error && error.message || error);
          setError('casebookCaptureError', message, !dateControl.value ? dateControl : narrativeControl);
        }
      }

      function discardDraft() {
        draft = null;
        byId('casebookDraftReview').hidden = true;
        clearError('casebookDraftError');
        updateDraftLock();
        byId('casebookNarrative').focus();
        announce('Observation draft discarded. No entry was recorded.');
      }

      function saveObservation() {
        var book = currentBook();
        if (!book || !draft) return;
        clearError('casebookDraftError');
        try {
          var reviewedCaseId = String(byId('casebookDraftCaseSelect').value || '');
          var reviewedCase = book.cases.find(function (item) { return item.id === reviewedCaseId; });
          var currentObservedAt = new Date(byId('casebookObservedAt').value).toISOString();
          if (!reviewedCase || currentObservedAt !== draft.observedAt) {
            throw new Error('This draft no longer matches its reviewed target or observation time. Discard it and create a new review draft.');
          }
          draft.caseId = reviewedCase.id;
          var values = Object.create(null);
          document.querySelectorAll('[data-casebook-parameter-key]').forEach(function (control) {
            var value = control.value;
            if (control.dataset.casebookParameterType === 'boolean') {
              value = value === 'true' ? true : value === 'false' ? false : null;
            }
            values[control.dataset.casebookParameterKey] = value;
          });
          var record = Model.createObservation(book, {
            caseId: draft.caseId,
            observedAt: draft.observedAt,
            values: values,
            note: byId('casebookDraftNote').value,
            interpretation: byId('casebookDraftInterpretation').value,
            source: draft.source
          });
          activeCaseId = draft.caseId;
          host.appendRecord(Model.tableIds.observations, record, 'observation');
          draft = null;
          captureSource = 'typed';
          byId('casebookNarrative').value = '';
          byId('casebookDraftReview').hidden = true;
          byId('casebookObservedAt').value = localDateTimeValue(new Date());
          updateDraftLock();
          text(
            byId('casebookCaptureStatus'),
            'Reviewed entry recorded locally for ' + reviewedCase.name
              + '. The same case remains selected and is ready for another observation; no prior values were copied.'
          );
          refresh();
          host.setView('casebook');
          byId('casebookNarrative').focus();
          announce('Reviewed observation recorded locally.');
        } catch (error) {
          setError('casebookDraftError', String(error && error.message || error));
        }
      }

      function updateRepeatButton(book) {
        var button = byId('casebookStartAnotherButton');
        if (!button) return;
        var caseItem = selectedCase(book);
        var hasPrevious = Boolean(caseItem && Model.caseTimeline(book, caseItem.id).length);
        var hasUnreviewedText = Boolean(byId('casebookNarrative') && byId('casebookNarrative').value.trim());
        button.disabled = !hasPrevious || Boolean(draft) || voiceBusy() || hasUnreviewedText || contextDirty;
        button.title = hasUnreviewedText
          ? 'Review or clear the current observation text first.'
          : contextDirty
            ? 'Save or undo the case-context edits first.'
            : '';
      }

      function renderLatestObservation(book) {
        var caseItem = selectedCase(book);
        if (!caseItem) {
          text(byId('casebookLatestObservationSummary'), 'Choose a case before logging an observation.');
          updateRepeatButton(book);
          return;
        }
        var latest = Model.caseTimeline(book, caseItem.id)[0] || null;
        text(
          byId('casebookLatestObservationSummary'),
          latest
            ? 'Latest recorded entry for ' + caseItem.name + ': ' + safeDateLabel(latest.observedAt)
              + '. Prior values and notes are never copied into a new entry.'
            : 'No prior observation is recorded for ' + caseItem.name + '.'
        );
        updateRepeatButton(book);
      }

      function startAnotherObservation() {
        var book = currentBook();
        var caseItem = selectedCase(book);
        if (!caseItem || draft || voiceBusy() || blockUnsavedCaseContext()) return;
        if (!Model.caseTimeline(book, caseItem.id).length) return;
        var narrative = byId('casebookNarrative');
        if (narrative.value.trim()) {
          setError(
            'casebookCaptureError',
            'Review or clear the current observation text before starting another entry.',
            narrative
          );
          return;
        }
        byId('casebookObservedAt').value = localDateTimeValue(new Date());
        captureSource = 'typed';
        clearError('casebookCaptureError', ['casebookObservedAt', 'casebookNarrative']);
        text(
          byId('casebookCaptureStatus'),
          'Ready for another observation for ' + caseItem.name + '. No prior values, notes, or interpretation were copied.'
        );
        updateRepeatButton(book);
        narrative.focus();
        announce('Ready for another observation. No prior values or notes were copied.');
      }

      function renderAgentGoalHint(book) {
        var goalControl = byId('casebookAgentGoal');
        var button = byId('prepareCasebookAgentButton');
        var hint = byId('casebookAgentGoalHint');
        var caseItem = selectedCase(book);
        var timeline = caseItem ? Model.caseTimeline(book, caseItem.id) : [];
        var available = Boolean(caseItem && timeline.length);
        var goal = goalControl && goalControl.value === 'feedback' ? 'feedback' : 'brainstorm';
        var learnerGuardrail = book && book.definition.privacyMode === 'learner-support'
          ? ' The request also prohibits diagnosis, ranking, grading, placement, disability, or hidden-trait inferences.'
          : '';

        if (goalControl) goalControl.disabled = !available;
        if (button) button.disabled = !available;
        if (!caseItem) {
          text(hint, 'Choose a case with a recorded observation before preparing agent help. You will always review the selected rows, give consent, and approve the request before anything is sent.');
          return;
        }
        if (!timeline.length) {
          text(hint, 'Record and review an observation for ' + caseItem.name + ' before preparing agent help. You will always review the selected rows, give consent, and approve the request before anything is sent.' + learnerGuardrail);
          return;
        }
        text(
          hint,
          (goal === 'feedback'
            ? 'Feedback prepares only the latest recorded row for ' + caseItem.name + '.'
            : 'Brainstorming prepares ' + Math.min(3, timeline.length) + ' recent recorded row'
              + (Math.min(3, timeline.length) === 1 ? '' : 's') + ' for ' + caseItem.name + '.')
            + ' You will always review the selected rows, give consent, and approve the request before anything is sent.'
            + learnerGuardrail
        );
      }

      function renderTimeline(book) {
        var caseItem = selectedCase(book);
        var list = byId('casebookTimelineList');
        clear(list);
        if (!caseItem) {
          text(byId('casebookTimelineSummary'), 'Choose a case to review its observations.');
          renderAgentGoalHint(book);
          return;
        }
        var timeline = Model.caseTimeline(book, caseItem.id);
        text(
          byId('casebookTimelineSummary'),
          timeline.length + ' recorded entr' + (timeline.length === 1 ? 'y' : 'ies') + ' for ' + caseItem.name + '.'
        );
        renderAgentGoalHint(book);
        if (!timeline.length) {
          list.appendChild(make('li', 'No observations yet. The first reviewed entry will appear here.', 'casebook-timeline-item'));
        }
        timeline.forEach(function (observation) {
          var item = make('li', null, 'casebook-timeline-item');
          var time = document.createElement('time');
          time.dateTime = observation.observedAt;
          time.textContent = safeDateLabel(observation.observedAt);
          item.appendChild(time);
          item.appendChild(make('span', ' · ' + (observation.source || 'source not recorded'), 'casebook-timeline-source'));
          var values = make('ul', null, 'casebook-timeline-values');
          book.parameters.forEach(function (parameter) {
            var value = observation.values[parameter.key];
            if (value === null || value === undefined || String(value).trim() === '') return;
            values.appendChild(make('li', parameter.label + ': ' + Model.valueText(parameter, value), 'casebook-value-chip'));
          });
          if (values.children.length) item.appendChild(values);
          if (observation.note) {
            var evidence = make('p', null, 'casebook-evidence');
            evidence.appendChild(make('strong', 'Recorded evidence: ', ''));
            evidence.appendChild(document.createTextNode(observation.note));
            item.appendChild(evidence);
          }
          if (observation.interpretation) {
            var interpretation = make('p', null, 'casebook-interpretation');
            interpretation.appendChild(make('strong', 'Human interpretation: ', ''));
            interpretation.appendChild(document.createTextNode(observation.interpretation));
            item.appendChild(interpretation);
          }
          list.appendChild(item);
        });
      }

      function fillHistoryPicker(book) {
        var select = byId('casebookHistoryParameter');
        var previous = select.value;
        clear(select);
        book.parameters.forEach(function (parameter) {
          var option = document.createElement('option');
          option.value = parameter.key;
          option.textContent = parameter.label + (parameter.unit ? ' (' + parameter.unit + ')' : '');
          select.appendChild(option);
        });
        if (book.parameters.some(function (parameter) { return parameter.key === previous; })) {
          select.value = previous;
        }
      }

      function historyOmissionText(history) {
        var missing = Number(history.missingValueCount) || 0;
        var undated = Number(history.undatedValueCount) || 0;
        return 'Blank or missing values omitted: ' + missing + '. Undated values omitted: ' + undated + '.';
      }

      function historySummary(history) {
        var label = history.parameter.label;
        var caseName = history.case.name;
        var first = history.firstPoint;
        var latest = history.latestPoint;
        var kind = history.firstToLatest.kind;
        var summary = '';
        if (kind === 'none') {
          summary = 'No dated ' + label + ' values are recorded for ' + caseName + '.';
        } else if (kind === 'single') {
          summary = 'One dated ' + label + ' value is recorded for ' + caseName + ': ' + first.displayValue + '.';
        } else if (kind === 'same') {
          summary = 'For ' + caseName + ', the first and latest recorded ' + label + ' values are the same: ' + latest.displayValue + '.';
        } else if (kind === 'higher') {
          summary = 'For ' + caseName + ', the latest recorded ' + label + ' value is higher than the first: ' + latest.displayValue + ' compared with ' + first.displayValue + '.';
        } else if (kind === 'lower') {
          summary = 'For ' + caseName + ', the latest recorded ' + label + ' value is lower than the first: ' + latest.displayValue + ' compared with ' + first.displayValue + '.';
        } else {
          summary = 'For ' + caseName + ', the first and latest recorded ' + label + ' values changed: ' + first.displayValue + ' and ' + latest.displayValue + '.';
        }
        return summary + ' ' + historyOmissionText(history);
      }

      function appendSvgElement(svg, tag, attributes, value) {
        var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.keys(attributes || {}).forEach(function (name) {
          node.setAttribute(name, String(attributes[name]));
        });
        if (value !== undefined && value !== null) node.textContent = String(value);
        svg.appendChild(node);
        return node;
      }

      function renderNumericHistoryVisual(history) {
        var visual = byId('casebookHistoryVisual');
        var svg = byId('casebookHistorySvg');
        clear(svg);
        visual.hidden = true;
        if (history.parameter.type !== 'number' || history.points.length < 2 || history.points.length > 50 || !history.numericRange) return;

        var values = history.points.map(function (point) { return Number(point.value); });
        var times = history.points.map(function (point) { return new Date(point.observedAt).getTime(); });
        if (values.some(function (value) { return !Number.isFinite(value); }) || times.some(function (value) { return !Number.isFinite(value); })) return;

        var width = 800;
        var height = 180;
        var left = 50;
        var right = 18;
        var top = 18;
        var bottom = 22;
        var plotWidth = width - left - right;
        var plotHeight = height - top - bottom;
        var firstTime = Math.min.apply(null, times);
        var latestTime = Math.max.apply(null, times);
        var sameTime = firstTime === latestTime;
        var minimum = Number(history.numericRange.min);
        var maximum = Number(history.numericRange.max);
        var sameValue = minimum === maximum;
        var coordinates = history.points.map(function (point, index) {
          var xRatio = sameTime ? index / (history.points.length - 1) : (times[index] - firstTime) / (latestTime - firstTime);
          var yRatio = sameValue ? 0.5 : (maximum - values[index]) / (maximum - minimum);
          return {
            x: left + xRatio * plotWidth,
            y: top + yRatio * plotHeight
          };
        });

        [top, top + plotHeight, sameValue ? top + plotHeight / 2 : null].forEach(function (y) {
          if (y === null) return;
          appendSvgElement(svg, 'line', {
            x1: left,
            y1: y,
            x2: width - right,
            y2: y,
            'class': 'casebook-history-grid-line'
          });
        });
        appendSvgElement(svg, 'text', {
          x: 4,
          y: top + 5,
          'class': 'casebook-history-axis-label'
        }, Model.valueText(history.parameter, maximum));
        appendSvgElement(svg, 'text', {
          x: 4,
          y: top + plotHeight,
          'class': 'casebook-history-axis-label'
        }, Model.valueText(history.parameter, minimum));
        appendSvgElement(svg, 'polyline', {
          points: coordinates.map(function (point) { return point.x.toFixed(2) + ',' + point.y.toFixed(2); }).join(' '),
          'class': 'casebook-history-line'
        });
        coordinates.forEach(function (point) {
          appendSvgElement(svg, 'circle', {
            cx: point.x.toFixed(2),
            cy: point.y.toFixed(2),
            r: 4,
            'class': 'casebook-history-point'
          });
        });
        text(byId('casebookHistoryScaleFirst'), 'First · ' + safeDateLabel(history.firstPoint.observedAt));
        text(byId('casebookHistoryScaleLatest'), 'Latest · ' + safeDateLabel(history.latestPoint.observedAt));
        visual.hidden = false;
      }

      function renderParameterHistory(book) {
        var body = byId('casebookHistoryBody');
        var visual = byId('casebookHistoryVisual');
        var svg = byId('casebookHistorySvg');
        clear(body);
        clear(svg);
        visual.hidden = true;
        var caseItem = selectedCase(book);
        var parameterKey = byId('casebookHistoryParameter').value;
        var parameter = book.parameters.find(function (item) { return item.key === parameterKey; });
        text(
          byId('casebookHistoryBoundary'),
          book.definition.privacyMode === 'learner-support'
            ? 'Lines connect recorded numeric points only; gaps are not estimated. Values do not diagnose, rank, or establish progress.'
            : 'Lines connect recorded numeric points only; gaps are not estimated. This view does not establish a cause or explain a change.'
        );
        if (!caseItem || !parameter) {
          text(byId('casebookHistorySummary'), 'Choose a case and parameter to review recorded history.');
          text(byId('casebookHistoryCaption'), 'Choose a case and parameter to review recorded history.');
          return;
        }
        try {
          var history = Model.buildParameterHistory(book, caseItem.id, parameter.key);
          var summary = historySummary(history);
          if (history.parameter.type === 'number' && history.points.length > 50) {
            summary += ' The exact table shows every dated value; the visual is limited to 50 points.';
          }
          text(byId('casebookHistorySummary'), summary);
          text(
            byId('casebookHistoryCaption'),
            parameter.label + ' for ' + caseItem.name + ', oldest recorded value first. '
              + history.points.length + ' dated value' + (history.points.length === 1 ? '' : 's') + ' shown.'
          );
          history.points.forEach(function (point) {
            var row = document.createElement('tr');
            var observed = document.createElement('th');
            var time = document.createElement('time');
            observed.scope = 'row';
            time.dateTime = point.observedAt;
            time.textContent = safeDateLabel(point.observedAt);
            observed.appendChild(time);
            row.appendChild(observed);
            row.appendChild(make('td', point.displayValue, ''));
            body.appendChild(row);
          });
          if (!history.points.length) {
            var emptyRow = document.createElement('tr');
            var emptyCell = make('td', 'No dated recorded values are available for this parameter.', '');
            emptyCell.colSpan = 2;
            emptyRow.appendChild(emptyCell);
            body.appendChild(emptyRow);
          }
          renderNumericHistoryVisual(history);
        } catch (error) {
          text(byId('casebookHistorySummary'), String(error && error.message || error));
          text(byId('casebookHistoryCaption'), 'Parameter history is unavailable.');
        }
      }

      function renderReflections(book) {
        var caseItem = selectedCase(book);
        var list = byId('casebookReflectionList');
        clear(list);
        var prompts = caseItem ? Model.buildReflections(book, caseItem.id) : ['Choose a case to generate local reflection prompts.'];
        prompts.forEach(function (prompt) { list.appendChild(make('li', prompt, '')); });
      }

      function fillComparisonPicker(book) {
        var select = byId('casebookCompareParameter');
        var previous = select.value;
        clear(select);
        book.parameters.forEach(function (parameter) {
          var option = document.createElement('option');
          option.value = parameter.key;
          option.textContent = parameter.label + (parameter.unit ? ' (' + parameter.unit + ')' : '');
          select.appendChild(option);
        });
        if (book.parameters.some(function (parameter) { return parameter.key === previous; })) select.value = previous;
      }

      function renderComparison(book) {
        var body = byId('casebookComparisonBody');
        clear(body);
        var parameterKey = byId('casebookCompareParameter').value;
        if (!parameterKey) {
          text(byId('casebookComparisonCaption'), 'No parameter is available for comparison.');
          return;
        }
        try {
          var comparison = Model.buildComparison(book, parameterKey);
          text(byId('casebookComparisonCaption'), 'Latest recorded ' + comparison.parameter.label + ' value for each case.');
          comparison.rows.forEach(function (row) {
            var tr = document.createElement('tr');
            var caseCell = make('th', row.caseName, '');
            caseCell.scope = 'row';
            tr.appendChild(caseCell);
            tr.appendChild(make('td', row.displayValue, ''));
            tr.appendChild(make('td', row.observedAt ? safeDateLabel(row.observedAt) : 'No dated observation', ''));
            var statusClass = row.status === 'Within expected context' ? 'casebook-context-good'
              : /^(?:Above|Below)/.test(row.status) ? 'casebook-context-check' : '';
            tr.appendChild(make('td', row.status, statusClass));
            body.appendChild(tr);
          });
        } catch (error) {
          text(byId('casebookComparisonCaption'), String(error && error.message || error));
        }
      }

      function prepareAgentReflection() {
        var book = currentBook();
        var caseItem = selectedCase(book);
        if (!caseItem) return;
        var goal = byId('casebookAgentGoal').value;
        var request = Model.buildAgentReflectionRequest(book, caseItem.id, goal);
        if (!request.recordIds.length) return;
        abortVoice('view-hidden');
        host.prepareAgentRows(request.recordIds, request.instruction);
      }

      function appendTranscript(finalText, interimText) {
        if (finalText) {
          var narrative = byId('casebookNarrative');
          var priorSource = captureSource;
          var priorText = narrative.value.trim();
          var next = [priorText, finalText].filter(Boolean).join(priorText ? ' ' : '');
          var clipped = next.length > Model.limits.maxNarrativeChars;
          narrative.value = next.slice(0, Model.limits.maxNarrativeChars);
          captureSource = priorSource === 'mixed' || (priorSource === 'typed' && Boolean(priorText)) ? 'mixed' : 'voice';
          narrative.dispatchEvent(new Event('input', { bubbles: true }));
          if (clipped) {
            text(byId('casebookCaptureStatus'), 'The observation reached its text limit. Dictation was stopped; review the captured text.');
            stopVoice();
            return;
          }
        }
        text(
          byId('casebookCaptureStatus'),
          interimText ? 'Listening: ' + interimText : finalText ? 'Transcript added. Review or continue dictating.' : 'Listening for an observation.'
        );
      }

      function voiceApi() {
        return window.AlloFlowVoice && typeof window.AlloFlowVoice.createDictationController === 'function'
          ? window.AlloFlowVoice
          : null;
      }

      function voiceAvailability() {
        var voice = voiceApi();
        if (!voice) return { available: false, reason: 'The shared voice service is unavailable.' };
        var preference = {};
        var capabilities = {};
        var bridge = typeof window.callGeminiAudio === 'function' ? window.callGeminiAudio : null;
        try { preference = voice.loadPreference() || {}; } catch (_) {}
        try { capabilities = voice.getCapabilities() || {}; } catch (_) {}
        if (preference.engine === 'off') {
          return { available: false, reason: 'Voice input is turned off in AlloFlow settings.' };
        }
        if (typeof voice.resolveHandsFreeEngine === 'function') {
          try {
            var resolved = voice.resolveHandsFreeEngine({ callGeminiAudio: bridge });
            if (!resolved || !resolved.supported) {
              return { available: false, reason: resolved && resolved.reason || 'No supported speech engine is available.' };
            }
            capabilities = resolved.capabilities || capabilities;
            var engine = resolved.resolved === 'desktop-whisper' ? 'webspeech' : resolved.resolved;
            if ((engine === 'whisper' || engine === 'gemini') && !capabilities.mediaRecorder) {
              return { available: false, reason: 'Audio recording is unavailable in this browser.' };
            }
            return {
              available: true,
              voice: voice,
              engine: engine,
              tier: resolved.tier,
              language: resolved.lang || preference.lang || document.documentElement.lang || navigator.language || 'en-US',
              callGeminiAudio: bridge
            };
          } catch (_) {}
        }
        if (typeof voice.isDictationSupported === 'function' && !voice.isDictationSupported()) {
          return { available: false, reason: 'No supported browser or local speech engine is available.' };
        }
        if (typeof voice.isDictationSupported !== 'function' && !capabilities.webSpeech && !capabilities.mediaRecorder) {
          return { available: false, reason: 'No supported browser or local speech engine is available.' };
        }
        return {
          available: true,
          voice: voice,
          engine: undefined,
          tier: preference.whisperTier,
          language: preference.lang || document.documentElement.lang || navigator.language || 'en-US',
          callGeminiAudio: bridge
        };
      }

      function updateVoiceButton() {
        var button = byId('casebookVoiceButton');
        if (!button) return;
        var availability = voiceAvailability();
        var listening = voiceStatus.state === 'starting' || voiceStatus.state === 'listening';
        var transcribing = voiceStatus.state === 'transcribing';
        button.disabled = Boolean(draft) || transcribing || (!listening && !availability.available);
        button.setAttribute('aria-pressed', listening ? 'true' : 'false');
        if (transcribing) button.setAttribute('aria-busy', 'true');
        else button.removeAttribute('aria-busy');
        if (voiceStatus.engine) button.dataset.dictationEngine = voiceStatus.engine;
        else delete button.dataset.dictationEngine;
        text(button, listening ? 'Stop dictation' : transcribing ? 'Transcribing…' : availability.available ? 'Dictate observation' : 'Dictation unavailable');
        var draftButton = byId('casebookDraftButton');
        if (draftButton) draftButton.disabled = Boolean(draft) || listening || transcribing;
        if (!availability.available && !listening && !transcribing) {
          text(byId('casebookVoiceDisclosure'), availability.reason + ' Type the observation instead. No audio is recorded by AlloSheet.');
        }
      }

      function applyVoiceStatus(status) {
        var next = status || {};
        voiceStatus = {
          state: next.state || 'idle',
          engine: next.engine || '',
          engineLabel: next.engineLabel || '',
          privacy: next.privacy || '',
          message: next.message || '',
          reason: next.reason || ''
        };
        updateVoiceButton();
        updateRepeatButton(currentBook());
        if (voiceStatus.message) text(byId('casebookCaptureStatus'), voiceStatus.message);
        if (voiceStatus.privacy) {
          text(byId('casebookVoiceDisclosure'), voiceStatus.privacy + ' Dictation never saves automatically; no raw audio is stored by AlloSheet.');
        }
        if (voiceStatus.state === 'error') {
          setError('casebookCaptureError', voiceStatus.message || 'Dictation stopped. Type the observation or try again.');
        } else if (voiceStatus.state === 'starting' || voiceStatus.state === 'listening' || voiceStatus.state === 'transcribing') {
          clearError('casebookCaptureError', ['casebookNarrative']);
        }
      }

      function stopVoice() {
        if (recognition && (voiceStatus.state === 'starting' || voiceStatus.state === 'listening')) {
          try { recognition.stop(); } catch (_) {}
        }
      }

      function abortVoice(reason) {
        var controller = recognition;
        recognition = null;
        if (controller && typeof controller.abort === 'function') {
          try { controller.abort(reason || 'cancelled'); } catch (_) {}
        }
        applyVoiceStatus({ state: 'idle', reason: reason || 'cancelled' });
      }

      function toggleVoice() {
        if (voiceStatus.state === 'starting' || voiceStatus.state === 'listening') {
          stopVoice();
          return;
        }
        if (voiceStatus.state === 'transcribing' || draft) return;
        var availability = voiceAvailability();
        if (!availability.available) {
          updateVoiceButton();
          return;
        }
        clearError('casebookCaptureError', ['casebookNarrative']);
        try {
          recognition = availability.voice.createDictationController({
            owner: 'allosheet-observation',
            label: 'AlloSheet observation dictation',
            engine: availability.engine,
            tier: availability.tier,
            lang: availability.language,
            continuous: true,
            interimResults: false,
            restartOnEnd: false,
            maxDurationMs: 120000,
            callGeminiAudio: availability.callGeminiAudio,
            onTranscript: function (transcript, isFinal, metadata) {
              if (!isFinal || !String(transcript || '').trim()) return;
              appendTranscript(String(transcript).trim(), '');
              if (metadata && metadata.privacy) text(byId('casebookVoiceDisclosure'), metadata.privacy + ' No raw audio is saved by AlloSheet.');
            },
            onStateChange: function (status) {
              applyVoiceStatus(status);
            },
            onError: function (error) {
              if (voiceStatus.state !== 'error') {
                applyVoiceStatus({ state: 'error', message: String(error && error.message || 'Dictation stopped. Type the observation or try again.') });
              }
              announce('Dictation stopped. No entry was recorded.');
            },
            onEnd: function () {
              recognition = null;
              if (voiceStatus.state !== 'idle') applyVoiceStatus({ state: 'idle' });
            }
          });
          if (!recognition || recognition.supported === false) {
            recognition = null;
            applyVoiceStatus({ state: 'error', message: 'Dictation could not start. Type the observation instead.' });
            return;
          }
          if (recognition.start() === false && voiceStatus.state !== 'error') {
            recognition = null;
            applyVoiceStatus({ state: 'error', message: 'Dictation could not start. Type the observation instead.' });
            return;
          }
          announce('Dictation started. Nothing will be saved automatically.');
        } catch (error) {
          recognition = null;
          applyVoiceStatus({ state: 'error', message: 'Dictation could not start. Type the observation instead.' });
        }
      }

      function resetForWorkspace() {
        abortVoice('workspace-replaced');
        draft = null;
        activeCaseId = '';
        captureSource = 'typed';
        contextDirty = false;
        if (byId('casebookNarrative')) byId('casebookNarrative').value = '';
        if (byId('casebookNewCaseName')) byId('casebookNewCaseName').value = '';
        if (byId('casebookCaseContext')) {
          byId('casebookCaseContext').value = '';
          byId('casebookCaseContext').dataset.caseId = '';
        }
        if (byId('casebookDraftReview')) byId('casebookDraftReview').hidden = true;
        if (byId('casebookObservedAt')) byId('casebookObservedAt').value = localDateTimeValue(new Date());
        clearError('casebookCaptureError', ['casebookNarrative', 'casebookObservedAt']);
        clearError('casebookDraftError');
        clearError('casebookCaseError', ['casebookNewCaseName']);
        clearError('casebookCaseContextError', ['casebookCaseContext']);
        text(byId('casebookCaptureStatus'), '');
        text(byId('casebookCaseContextStatus'), '');
        updateDraftLock();
      }

      function refresh() {
        var tables = host.getTables();
        if (tables !== boundTables) {
          if (boundTables !== null) resetForWorkspace();
          boundTables = tables;
        }
        var book = currentBook();
        var setup = byId('casebookSetup');
        var workspace = byId('casebookWorkspace');
        if (!book) {
          if (draft) {
            draft = null;
            byId('casebookDraftReview').hidden = true;
            updateDraftLock();
          }
          setup.hidden = false;
          workspace.hidden = true;
          byId('casebookModeBadge').className = 'badge neutral';
          text(byId('casebookModeBadge'), 'Builder');
          return false;
        }
        setup.hidden = true;
        workspace.hidden = false;
        byId('casebookModeBadge').className = 'badge good';
        text(byId('casebookModeBadge'), 'Casebook ready');
        text(byId('casebookWorkspaceTitle'), book.definition.title);
        text(byId('casebookWorkspaceDescription'), book.definition.description || 'A configurable observation workspace.');
        text(
          byId('casebookWorkspaceSummary'),
          book.cases.length + ' case' + (book.cases.length === 1 ? '' : 's') + ' · '
            + book.parameters.length + ' parameter' + (book.parameters.length === 1 ? '' : 's') + ' · '
            + book.observations.length + ' observation' + (book.observations.length === 1 ? '' : 's')
        );
        text(
          byId('casebookRecordNotice'),
          book.definition.privacyMode === 'learner-support'
            ? 'Sensitive learner-support record: use coded identifiers when possible, distinguish observation from interpretation, and store downloaded workspace files only in an approved secure location.'
            : 'Observation boundary: expected ranges are author-provided context. Local prompts and comparisons never establish cause.'
        );
        fillCaseSelect(book);
        renderCaseContext(book, false);
        if (!byId('casebookObservedAt').value) byId('casebookObservedAt').value = localDateTimeValue(new Date());
        renderLatestObservation(book);
        fillHistoryPicker(book);
        fillComparisonPicker(book);
        renderTimeline(book);
        renderParameterHistory(book);
        renderReflections(book);
        renderComparison(book);
        if (draft) renderDraft(book);
        updateVoiceButton();
        return true;
      }

      function openBuilder() {
        host.setView('casebook');
        var book = currentBook();
        if (book) {
          refresh();
          byId('casebookNarrative').focus();
        } else {
          byId('casebookTitleInput').focus();
          byId('casebookTitleInput').select();
        }
      }

      function bind() {
        document.querySelectorAll('.casebook-template-button').forEach(function (button) {
          button.addEventListener('click', function () { applyTemplate(button.dataset.casebookTemplate); });
        });
        byId('casebookParameterType').addEventListener('change', syncParameterType);
        byId('addCasebookParameterButton').addEventListener('click', addParameter);
        byId('casebookSetupForm').addEventListener('submit', createCasebook);
        byId('resetCasebookBuilderButton').addEventListener('click', function () {
          resetBuilder();
          byId('casebookTitleInput').focus();
          announce('Casebook builder reset.');
        });
        byId('casebookPrivacyModeInput').addEventListener('change', function () {
          text(
            byId('casebookPrivacyHint'),
            this.value === 'learner-support'
              ? 'Use coded identifiers when possible, record observable evidence, and store downloaded files only in an approved secure location.'
              : 'You decide whether any case names or notes are sensitive.'
          );
        });
        byId('casebookCaseSelect').addEventListener('change', function () {
          if (contextDirty) {
            this.value = activeCaseId;
            blockUnsavedCaseContext();
            return;
          }
          activeCaseId = this.value;
          refresh();
          announce('Case changed. Timeline, reflections, and comparison updated.');
        });
        byId('casebookCaseContextForm').addEventListener('submit', saveCaseContext);
        byId('resetCasebookCaseContextButton').addEventListener('click', resetCaseContext);
        byId('casebookCaseContext').addEventListener('input', function () {
          var book = currentBook();
          var caseItem = selectedCase(book);
          contextDirty = Boolean(caseItem) && this.value !== String(caseItem.context || '');
          clearError('casebookCaseContextError', ['casebookCaseContext']);
          text(
            byId('casebookCaseContextStatus'),
            contextDirty ? 'Context edits are not saved yet.' : ''
          );
          updateCaseContextActions(book);
          updateRepeatButton(book);
        });
        byId('casebookAddCaseButton').addEventListener('click', addCase);
        byId('casebookNewCaseName').addEventListener('keydown', function (event) {
          if (event.key === 'Enter') {
            event.preventDefault();
            addCase();
          }
        });
        byId('casebookCaptureForm').addEventListener('submit', draftObservation);
        byId('casebookNarrative').addEventListener('input', function (event) {
          if (event.isTrusted && !this.value.trim()) captureSource = 'typed';
          else if (event.isTrusted && captureSource === 'voice') captureSource = 'mixed';
          clearError('casebookCaptureError', ['casebookNarrative']);
          updateRepeatButton(currentBook());
        });
        byId('casebookVoiceButton').addEventListener('click', toggleVoice);
        byId('casebookStartAnotherButton').addEventListener('click', startAnotherObservation);
        byId('saveCasebookObservationButton').addEventListener('click', saveObservation);
        byId('discardCasebookDraftButton').addEventListener('click', discardDraft);
        byId('casebookDraftCaseSelect').addEventListener('change', function () {
          if (!draft) return;
          var book = currentBook();
          var selectedCaseId = this.value;
          var caseItem = book && book.cases.find(function (item) { return item.id === selectedCaseId; });
          if (!caseItem) return;
          draft.caseId = caseItem.id;
          text(
            byId('casebookDraftCaseContext'),
            caseItem.context
              ? 'Current stable context: ' + caseItem.context
              : 'No stable context is saved for this case.'
          );
          renderDraftWarnings(book);
          clearError('casebookDraftError');
          announce(
            'Draft target changed to ' + caseItem.name + '. '
              + (caseItem.context ? 'Current stable context is available for review.' : 'No stable context is saved.')
          );
        });
        byId('prepareCasebookAgentButton').addEventListener('click', prepareAgentReflection);
        byId('casebookAgentGoal').addEventListener('change', function () {
          var book = currentBook();
          if (book) renderAgentGoalHint(book);
        });
        byId('casebookHistoryParameter').addEventListener('change', function () {
          var book = currentBook();
          if (book) renderParameterHistory(book);
        });
        byId('casebookCompareParameter').addEventListener('change', function () {
          var book = currentBook();
          if (book) renderComparison(book);
        });
        ['editorTab', 'tableTab', 'auditTab', 'analysisTab'].forEach(function (id) {
          var tab = byId(id);
          if (tab) tab.addEventListener('click', function () { abortVoice('view-hidden'); });
        });
        window.addEventListener('pagehide', function () { abortVoice('pagehide'); });
        document.addEventListener('visibilitychange', function () {
          if (document.hidden) abortVoice('document-hidden');
        });
        window.addEventListener('alloflow:voice-engine-changed', function () {
          abortVoice('engine-changed');
          updateVoiceButton();
        });
      }

      function initialize() {
        resetBuilder();
        byId('casebookObservedAt').value = localDateTimeValue(new Date());
        updateVoiceButton();
        refresh();
      }

      return Object.freeze({
        bind: bind,
        initialize: initialize,
        refresh: refresh,
        openBuilder: openBuilder,
        stopVoice: stopVoice,
        abortVoice: abortVoice,
        resetForWorkspace: resetForWorkspace,
        hasPendingEdits: hasPendingEdits,
        focusPendingEdits: focusPendingEdits
      });
    }

    return Object.freeze({ create: create });
  }
);
