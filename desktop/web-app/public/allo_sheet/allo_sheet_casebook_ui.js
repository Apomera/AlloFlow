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

      function addCase() {
        var input = byId('casebookNewCaseName');
        clearError('casebookCaseError', ['casebookNewCaseName']);
        var book = currentBook();
        try {
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
        ['casebookCaseSelect', 'casebookNewCaseName', 'casebookAddCaseButton', 'casebookObservedAt', 'casebookNarrative']
          .forEach(function (id) {
            var control = byId(id);
            if (control) control.disabled = locked;
          });
        updateVoiceButton();
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
        var draftCase = book.cases.find(function (item) { return item.id === draft.caseId; });
        text(
          byId('casebookDraftCaseLabel'),
          book.definition.caseLabel + ': ' + (draftCase ? draftCase.name : 'Unavailable target')
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
        var warnings = byId('casebookDraftWarnings');
        clear(warnings);
        (draft.warnings || []).forEach(function (warning) { warnings.appendChild(make('li', warning, '')); });
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
        try {
          if (voiceBusy()) throw new Error('Finish dictation before creating a review draft.');
          if (!caseItem) throw new Error('Choose a valid case first.');
          if (!dateControl.value || !Number.isFinite(new Date(dateControl.value).getTime())) {
            throw new Error('Choose a valid observation date and time.');
          }
          var parsed = Model.parseNarrative(narrativeControl.value, book.parameters, { source: captureSource });
          draft = {
            caseId: caseItem.id,
            observedAt: new Date(dateControl.value).toISOString(),
            values: parsed.values,
            note: parsed.note,
            interpretation: parsed.interpretation,
            source: parsed.source,
            warnings: parsed.warnings
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
          var currentCase = selectedCase(book);
          var currentObservedAt = new Date(byId('casebookObservedAt').value).toISOString();
          if (!currentCase || currentCase.id !== draft.caseId || currentObservedAt !== draft.observedAt) {
            throw new Error('This draft no longer matches its reviewed case or observation time. Discard it and create a new review draft.');
          }
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
          text(byId('casebookCaptureStatus'), 'Reviewed entry recorded locally. Download the workspace when you are ready to keep it.');
          refresh();
          host.setView('casebook');
          byId('casebookNarrative').focus();
          announce('Reviewed observation recorded locally.');
        } catch (error) {
          setError('casebookDraftError', String(error && error.message || error));
        }
      }

      function renderTimeline(book) {
        var caseItem = selectedCase(book);
        var list = byId('casebookTimelineList');
        clear(list);
        if (!caseItem) {
          text(byId('casebookTimelineSummary'), 'Choose a case to review its observations.');
          byId('prepareCasebookAgentButton').disabled = true;
          return;
        }
        var timeline = Model.caseTimeline(book, caseItem.id);
        text(
          byId('casebookTimelineSummary'),
          timeline.length + ' recorded entr' + (timeline.length === 1 ? 'y' : 'ies') + ' for ' + caseItem.name + '.'
        );
        byId('prepareCasebookAgentButton').disabled = !timeline.length;
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
        var ids = Model.caseTimeline(book, caseItem.id).slice(0, 3).map(function (observation) { return observation.id; });
        if (!ids.length) return;
        abortVoice('view-hidden');
        host.prepareAgentRows(ids, [
          'Review only the selected observation rows.',
          'Separate recorded evidence from human interpretation.',
          'Describe possible patterns, important limitations, questions to investigate, and useful next observations.',
          'Do not infer a cause, diagnosis, disability, placement, grade, or hidden student trait.',
          'Do not propose cell changes.'
        ].join(' '));
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
        if (byId('casebookNarrative')) byId('casebookNarrative').value = '';
        if (byId('casebookNewCaseName')) byId('casebookNewCaseName').value = '';
        if (byId('casebookDraftReview')) byId('casebookDraftReview').hidden = true;
        if (byId('casebookObservedAt')) byId('casebookObservedAt').value = localDateTimeValue(new Date());
        clearError('casebookCaptureError', ['casebookNarrative', 'casebookObservedAt']);
        clearError('casebookDraftError');
        clearError('casebookCaseError', ['casebookNewCaseName']);
        text(byId('casebookCaptureStatus'), '');
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
        if (!byId('casebookObservedAt').value) byId('casebookObservedAt').value = localDateTimeValue(new Date());
        fillComparisonPicker(book);
        renderTimeline(book);
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
          activeCaseId = this.value;
          refresh();
          announce('Case changed. Timeline, reflections, and comparison updated.');
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
        });
        byId('casebookVoiceButton').addEventListener('click', toggleVoice);
        byId('saveCasebookObservationButton').addEventListener('click', saveObservation);
        byId('discardCasebookDraftButton').addEventListener('click', discardDraft);
        byId('prepareCasebookAgentButton').addEventListener('click', prepareAgentReflection);
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
        resetForWorkspace: resetForWorkspace
      });
    }

    return Object.freeze({ create: create });
  }
);
