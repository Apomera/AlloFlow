/*
 * AlloFlow Walkthrough Copilot - standalone four-stage surface.
 *
 * Deliberately dependency-free and build-free. It loads the same core module
 * the tests exercise, so nothing here re-implements a rule: the interface asks
 * the core whether something may happen and renders the answer.
 *
 * Nothing is persisted. There is no storage, no network call, and no provider.
 * Suggestions come from the practice scenarios, which ship their own, so this
 * page runs anywhere with no district approval and no AI configured.
 *
 * All model and user text reaches the DOM through textContent. No innerHTML is
 * used with content this file did not author.
 */
(function () {
  'use strict';

  var core = window.AlloModules && window.AlloModules.WalkthroughCopilot;
  var fixtures = window.AlloModules && window.AlloModules.WalkthroughCopilotFixtures;
  var scenarios = window.AlloModules && window.AlloModules.WalkthroughCopilotScenarios;

  var app = document.getElementById('app');
  var live = document.getElementById('live');
  var foot = document.getElementById('foot');

  var STAGES = [
    { id: 'capture', n: 'Stage 1', label: 'Capture notes' },
    { id: 'analyze', n: 'Stage 2', label: 'Review suggestions' },
    { id: 'feedback', n: 'Stage 3', label: 'Read the feedback' },
    { id: 'copy', n: 'Stage 4', label: 'Copy to your form' }
  ];

  var state = {
    stage: 'capture',
    scenario: null,
    notes: '',
    draft: null,
    disclosure: null,
    lastComparison: null,
    introOpen: true
  };

  // A generic "check with your district" line gets skimmed and ignored. This
  // names the three questions someone actually has to get answered, so the
  // advisory is usable rather than decorative.
  var ADVISORY_QUESTIONS = [
    'Which AI provider may process observation notes, and under what data agreement.',
    'Whether a walkthrough counts as one of the evidence collections in your evaluation system. If it does, this is not formative-only, whatever it is called.',
    'How long anything typed here is retained, where, and who can see it.'
  ];

  /* ---------------------------------------------------------------- *
   * Small DOM helpers. el() never accepts markup.
   * ---------------------------------------------------------------- */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === 'string' && text !== '') node.textContent = text;
    return node;
  }
  function add(parent) {
    for (var i = 1; i < arguments.length; i += 1) {
      if (arguments[i]) parent.appendChild(arguments[i]);
    }
    return parent;
  }
  function button(label, className, onClick, options) {
    var node = el('button', 'act' + (className ? ' ' + className : ''), label);
    node.type = 'button';
    if (options && options.pressed !== undefined) node.setAttribute('aria-pressed', String(options.pressed));
    if (options && options.disabled) node.disabled = true;
    if (options && options.describedBy) node.setAttribute('aria-describedby', options.describedBy);
    node.addEventListener('click', onClick);
    return node;
  }
  function say(message) {
    // Announce through the shared live region. A control that changes state
    // silently is invisible to a screen-reader user.
    live.textContent = '';
    window.setTimeout(function () { live.textContent = message; }, 30);
  }

  /* ---------------------------------------------------------------- *
   * Stage navigation
   * ---------------------------------------------------------------- */

  function stageReachable(id) {
    if (id === 'capture') return true;
    if (!state.draft) return false;
    if (id === 'analyze') return true;
    var decided = state.draft.suggestions.every(function (s) { return s.decision !== 'pending'; });
    if (id === 'feedback') return decided;
    if (id === 'copy') return core.exportReadiness(state.draft).ok;
    return false;
  }

  function goto(stage) {
    state.stage = stage;
    render();
    var heading = app.querySelector('h2');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus();
    }
  }

  function renderStages() {
    var list = el('ul', 'stages');
    STAGES.forEach(function (stage) {
      var item = el('li');
      var reachable = stageReachable(stage.id);
      var node = button('', null, function () { goto(stage.id); }, { disabled: !reachable && stage.id !== state.stage });
      node.setAttribute('data-stage', stage.id);
      add(node, el('span', 'n', stage.n), el('span', null, stage.label));
      if (state.stage === stage.id) node.setAttribute('aria-current', 'step');
      add(item, node);
      add(list, item);
    });
    return list;
  }

  function renderBanner() {
    var mode = state.draft ? state.draft.mode : 'demo';
    var banner = el('div', 'banner');
    banner.setAttribute('role', 'note');
    add(banner, el('span', null, mode === 'demo' ? 'Demo mode' : 'Approved mode'));
    add(banner, el('span', 'sep', '|'));
    add(banner, el('span', null, mode === 'demo'
      ? 'Synthetic practice only. Nothing here is a record of a real observation.'
      : 'Real notes permitted under the recorded approval.'));
    add(banner, el('span', 'sep', '|'));
    add(banner, el('span', null, 'Nothing is saved. Closing this page discards everything.'));
    return banner;
  }

  /* ---------------------------------------------------------------- *
   * Stage 1: capture
   * ---------------------------------------------------------------- */

  function renderIntro() {
    var card = el('div', 'card intro');
    var head = el('div', 'head');
    add(head, el('h2', null, 'What this does'));
    add(head, button('Hide this', null, function () {
      state.introOpen = false;
      render();
      say('Introduction hidden. Reopen it with the What is this button.');
    }));
    add(card, head);

    add(card, el('p', null,
      'You type the shorthand you already write during a walkthrough. This organizes it into '
      + 'evidence-based feedback under your framework, shows you the exact line of your notes '
      + 'behind every claim, and lets you accept, reword, or throw out each one. You write and '
      + 'approve the feedback. It never rates anyone.'));

    add(card, el('p', 'lab', 'Four steps'));
    var steps = el('ol', 'steps');
    [
      ['Capture', 'Read the notes, then lock them so nothing can quietly rewrite them.'],
      ['Review', 'Work through each suggestion. Nothing moves forward until you decide on it.'],
      ['Read', 'See the feedback the way the teacher will read it.'],
      ['Copy', 'Paste it into the form your school already uses. Nothing is sent or saved.']
    ].forEach(function (step) {
      var item = el('li');
      add(item, el('strong', null, step[0] + '. '), el('span', null, step[1]));
      add(steps, item);
    });
    add(card, steps);

    add(card, el('p', 'lab', 'Before using this with a real staff member'));
    add(card, el('p', null,
      'Everything built in here is invented practice material, so you can explore it freely. '
      + 'Using it on a real observation is a district decision, not a settings change. Get answers to:'));
    var questions = el('ul');
    ADVISORY_QUESTIONS.forEach(function (question) { add(questions, el('li', null, question)); });
    add(card, questions);
    add(card, el('p', 'note',
      'This build has no AI connected and cannot analyze notes you write yourself. '
      + 'It works through the practice scenarios below.'));
    return card;
  }

  function renderCapture() {
    var wrap = el('div');

    if (state.introOpen) {
      add(wrap, renderIntro());
    } else {
      var reopen = el('div', 'row');
      reopen.style.margin = '0 0 1rem';
      add(reopen, button('What is this?', null, function () {
        state.introOpen = true;
        render();
      }));
      add(wrap, reopen);
    }

    var card = el('div', 'card');
    add(card, el('h2', null, 'Choose a practice scenario'));
    add(card, el('p', 'note',
      'Each scenario is a synthetic observation that teaches one habit of evidence-based feedback. '
      + 'They carry their own suggestions, so nothing here calls an AI service.'));

    scenarios.listScenarios().forEach(function (meta) {
      var node = button('', 'scenario', function () { pickScenario(meta.id); });
      add(node,
        el('span', 't', meta.title),
        el('span', 's', meta.setting + ' | about ' + meta.minutes + ' minutes | teaches: ' + meta.teaches));
      if (state.scenario && state.scenario.id === meta.id) node.setAttribute('aria-pressed', 'true');
      add(card, node);
    });
    add(wrap, card);

    var notesCard = el('div', 'card');
    add(notesCard, el('h2', null, 'The observer notes'));
    add(notesCard, el('p', 'note',
      'This is the shorthand someone typed during the visit. Locking it means your original wording '
      + 'is kept exactly as written for the rest of the session, so nothing can quietly tidy it up, '
      + 'summarize it, or put words in your mouth. Every claim later has to point back to a line in here.'));

    var area = el('textarea');
    area.id = 'notes-input';
    area.value = state.notes;
    area.setAttribute('aria-label', 'Observation notes');
    area.addEventListener('input', function () {
      state.notes = area.value;
      // Update in place. A full re-render would steal focus mid-sentence.
      updateNotesGuard();
    });
    add(notesCard, area);

    // The prepared suggestions cite exact offsets into the scenario's own
    // wording. Editing the notes is allowed, but it invalidates those
    // citations and the core will refuse them. This guard says so plainly
    // rather than letting a cryptic refusal appear mid-demonstration.
    var guard = el('div');
    guard.id = 'notes-guard';
    add(notesCard, guard);

    var row = el('div', 'row');
    row.style.marginTop = '.7rem';
    var freeze = button('Lock these notes and see suggestions', 'primary', freezeAndAnalyze, {
      disabled: !state.scenario
    });
    freeze.id = 'freeze-btn';
    add(row, freeze);

    var restore = button('Restore scenario notes', null, function () {
      state.notes = state.scenario.notes;
      var field = document.getElementById('notes-input');
      if (field) field.value = state.notes;
      updateNotesGuard();
      say('Scenario notes restored.');
    });
    restore.id = 'restore-btn';
    restore.hidden = true;
    add(row, restore);

    if (!state.scenario) add(row, el('span', 'note', 'Pick a scenario first.'));
    add(notesCard, row);
    window.setTimeout(updateNotesGuard, 0);
    add(wrap, notesCard);
    return wrap;
  }

  // Partial update for the capture stage. Like updateReadiness, every control
  // whose availability depends on the edited state is refreshed here, because
  // typing does not trigger a render.
  function updateNotesGuard() {
    var guard = document.getElementById('notes-guard');
    var freeze = document.getElementById('freeze-btn');
    var restore = document.getElementById('restore-btn');
    if (!guard || !freeze || !restore) return;

    var edited = !!state.scenario && state.notes !== state.scenario.notes;
    guard.textContent = '';
    if (edited) {
      add(guard, el('span', 'flag',
        'You have changed the scenario notes. The prepared suggestions quote the original wording, '
        + 'so they no longer match and cannot be used. Restore the notes to continue. Analyzing '
        + 'notes you write yourself needs the AI provider, which is not connected in this build.'));
    }
    freeze.disabled = !state.scenario || edited;
    restore.hidden = !edited;
  }

  function pickScenario(id) {
    var scenario = scenarios.getScenario(id);
    state.scenario = scenario;
    state.notes = scenario.notes;
    state.draft = null;
    state.lastComparison = null;
    render();
    say('Scenario selected: ' + scenario.title + '. Notes loaded.');
  }

  function freezeAndAnalyze() {
    var created = core.createDraft({
      framework: fixtures.PORTLAND_FRAMEWORK,
      sourceNotes: state.notes,
      disclosure: state.disclosure || undefined,
      collectionType: 'practice'
    });
    if (!created.ok) {
      say('Could not start: ' + created.errors[0].message);
      return;
    }
    var analyzed = core.validateSuggestions(created.value, state.scenario.candidates);
    if (!analyzed.ok) {
      say('Suggestions were refused: ' + analyzed.errors[0].message);
      return;
    }
    state.draft = analyzed.value;
    goto('analyze');
    say('Notes frozen. ' + state.draft.suggestions.length + ' suggestions to review.');
  }

  /* ---------------------------------------------------------------- *
   * Stage 2: analyze
   * ---------------------------------------------------------------- */

  function componentLabel(componentId) {
    var found = componentId;
    state.draft.framework.components.forEach(function (component) {
      if (component.id === componentId) found = component.id + ' ' + component.label;
    });
    return found;
  }

  function frozenPanel() {
    var card = el('div', 'card frozen');
    add(card, el('p', 'lock', 'Source notes, frozen'));
    var pre = el('pre');
    pre.textContent = state.draft.sourceNotesOriginal;
    add(card, pre);
    add(card, el('p', 'note', 'These are never edited by this tool.'));
    return card;
  }

  function renderSuggestion(suggestion, index) {
    var card = el('div', 'sugg');
    card.setAttribute('data-decision', suggestion.decision);
    var titleId = 'sugg-' + index + '-title';

    if (suggestion.result === 'insufficient_evidence') {
      var head = el('p', 'comp', 'Not established by these notes');
      head.id = titleId;
      add(card, head);
      add(card, el('p', null, suggestion.note));
    } else {
      var comp = el('p', 'comp', componentLabel(suggestion.componentId));
      comp.id = titleId;
      add(card, comp);

      add(card, el('p', 'lab', 'What was observed'));
      add(card, el('p', null, suggestion.objectiveEvidence));

      if (suggestion.interpretation) {
        add(card, el('p', 'lab', 'What it might mean'));
        add(card, el('p', null, suggestion.interpretation));
      }

      add(card, el('p', 'lab', 'Cited from the notes'));
      suggestion.sourceSpans.forEach(function (span) {
        add(card, el('blockquote', null, span.text));
      });
    }

    suggestion.warnings.forEach(function (flag) {
      add(card, el('span', 'flag', flag.message));
    });

    if (suggestion.decision === 'edited' && suggestion.approvedText) {
      add(card, el('p', 'lab', 'Your wording'));
      add(card, el('p', null, suggestion.approvedText));
    }

    var row = el('div', 'row');
    row.style.marginTop = '.7rem';
    add(row,
      button('Accept', 'go', function () { decide(suggestion.id, 'accepted'); },
        { pressed: suggestion.decision === 'accepted', describedBy: titleId }),
      button('Edit wording', 'warnish', function () { startEdit(suggestion, card, titleId); },
        { pressed: suggestion.decision === 'edited', describedBy: titleId }),
      button('Reject', 'stop', function () { decide(suggestion.id, 'rejected'); },
        { pressed: suggestion.decision === 'rejected', describedBy: titleId })
    );
    add(card, row);
    return card;
  }

  function startEdit(suggestion, card, titleId) {
    var existing = card.querySelector('textarea');
    if (existing) { existing.focus(); return; }
    var box = el('div', 'field');
    box.style.marginTop = '.6rem';
    var label = el('label', null, 'Your wording for this feedback');
    var id = 'edit-' + suggestion.id;
    label.setAttribute('for', id);
    var area = el('textarea');
    area.id = id;
    area.style.minHeight = '6rem';
    area.value = suggestion.approvedText
      || (suggestion.result === 'insufficient_evidence' ? suggestion.note : suggestion.objectiveEvidence);
    add(box, label, area);
    var row = el('div', 'row');
    row.style.marginTop = '.5rem';
    add(row, button('Save and approve this wording', 'primary', function () {
      decide(suggestion.id, 'edited', area.value);
    }, { describedBy: titleId }));
    add(box, row);
    add(card, box);
    area.focus();
    say('Editing. The cited excerpt does not change when you reword the feedback.');
  }

  function decide(id, decision, text) {
    var report = core.decideSuggestion(state.draft, id, decision, text);
    if (!report.ok) {
      say('Could not record that: ' + report.errors[0].message);
      return;
    }
    state.draft = report.value;
    render();
    var remaining = state.draft.suggestions.filter(function (s) { return s.decision === 'pending'; }).length;
    say('Marked ' + decision + '. ' + (remaining === 0
      ? 'All suggestions decided.'
      : remaining + ' still to decide.'));
  }

  function renderAnalyze() {
    var cols = el('div', 'cols');
    add(cols, frozenPanel());

    var right = el('div');
    var total = state.draft.suggestions.length;
    var settled = state.draft.suggestions.filter(function (s) { return s.decision !== 'pending'; }).length;

    add(right, el('h2', null, 'Your call on each suggestion'));

    var progress = el('p', 'progress');
    progress.setAttribute('role', 'status');
    progress.textContent = settled === total
      ? 'All ' + total + ' decided. You can move on.'
      : settled + ' of ' + total + ' decided.';
    add(right, progress);

    add(right, el('p', 'note',
      'Nothing reaches your form until you decide on it. Keep what the notes genuinely support, '
      + 'reword anything you would put differently, and throw out the rest. Rejecting a lot is a '
      + 'normal outcome, not a sign something went wrong.'));

    state.draft.suggestions.forEach(function (suggestion, index) {
      add(right, renderSuggestion(suggestion, index));
    });

    state.draft.globalWarnings.forEach(function (flag) {
      add(right, el('span', 'flag', flag.message));
    });

    var pending = state.draft.suggestions.filter(function (s) { return s.decision === 'pending'; }).length;
    var row = el('div', 'row');
    row.style.marginTop = '.8rem';
    add(row, button('Continue to the feedback', 'primary', function () { goto('feedback'); },
      { disabled: pending > 0 }));
    if (pending > 0) add(row, el('span', 'note', pending + ' suggestion(s) still need a decision.'));
    add(right, row);

    add(cols, right);
    return cols;
  }

  /* ---------------------------------------------------------------- *
   * Stage 3: feedback
   * ---------------------------------------------------------------- */

  function renderFeedback() {
    var wrap = el('div');
    add(wrap, el('h2', null, 'The feedback as the teacher will read it'));

    var disclosureCard = el('div', 'card');
    add(disclosureCard, el('h3', null, 'Disclosure'));
    add(disclosureCard, el('p', 'note',
      'This travels with every field you copy. You can reword it, but it cannot be empty, '
      + 'and the last sentence is a claim only your school can make truthfully.'));

    var field = el('div', 'field');
    var label = el('label', null, 'Disclosure wording');
    label.setAttribute('for', 'disclosure-text');
    var input = el('textarea');
    input.id = 'disclosure-text';
    input.style.minHeight = '4.5rem';
    input.value = state.draft.disclosure.text;
    input.addEventListener('input', function () {
      state.draft.disclosure.text = input.value;
      updateReadiness();
    });
    add(field, label, input);
    add(disclosureCard, field);

    var toggleRow = el('div', 'row');
    var toggle = button(
      state.draft.disclosure.includeFormativeSentence
        ? 'Formative sentence included'
        : 'Formative sentence removed',
      null,
      function () {
        state.draft.disclosure.includeFormativeSentence = !state.draft.disclosure.includeFormativeSentence;
        render();
        say(state.draft.disclosure.includeFormativeSentence
          ? 'Formative sentence included.'
          : 'Formative sentence removed.');
      },
      { pressed: state.draft.disclosure.includeFormativeSentence }
    );
    add(toggleRow, toggle);
    add(toggleRow, el('span', 'note', state.draft.disclosure.formativeSentence));
    add(disclosureCard, toggleRow);
    add(wrap, disclosureCard);

    var readiness = core.exportReadiness(state.draft);
    var readyBox = el('div', 'card');
    readyBox.id = 'readiness';
    add(readyBox, renderReadiness(readiness));
    add(wrap, readyBox);

    if (readiness.ok) {
      var output = core.buildFormOutput(state.draft, fixtures.SAMPLE_FIELD_MAP);
      if (output.ok) {
        output.value.fields.forEach(function (fieldOut) {
          var box = el('div', 'out' + (fieldOut.empty ? ' empty' : ''));
          add(box, el('h3', null, fieldOut.key + (fieldOut.empty ? '' : '')));
          if (fieldOut.empty) add(box, el('span', 'flag', 'No evidence was recorded for this domain.'));
          var pre = el('pre');
          pre.textContent = fieldOut.text;
          add(box, pre);
          add(wrap, box);
        });
      }
    }

    var row = el('div', 'row');
    row.style.marginTop = '.8rem';
    var continueButton = button('Continue to copy', 'primary', function () { goto('copy'); }, { disabled: !readiness.ok });
    continueButton.id = 'continue-copy';
    add(row, continueButton);
    add(row, button('Compare with the reference reading', null, compare, { disabled: !state.scenario }));
    add(wrap, row);

    if (state.lastComparison) add(wrap, renderComparison(state.lastComparison));
    return wrap;
  }

  function renderReadiness(readiness) {
    var box = el('div');
    if (readiness.ok) {
      add(box, el('span', 'flag go', 'Ready to copy. ' + readiness.value.approvedCount + ' approved item(s).'));
    } else {
      readiness.errors.forEach(function (issue) {
        add(box, el('span', 'flag stop', issue.message));
      });
    }
    return box;
  }

  // Called on every keystroke in the disclosure, so it updates in place rather
  // than re-rendering, which would steal focus from the field being typed in.
  // Every control whose availability depends on readiness must be updated here:
  // a button left enabled while the core would refuse is a button that lies.
  function updateReadiness() {
    var box = document.getElementById('readiness');
    if (!box) return;
    var readiness = core.exportReadiness(state.draft);
    box.textContent = '';
    add(box, renderReadiness(readiness));

    var continueButton = document.getElementById('continue-copy');
    if (continueButton) continueButton.disabled = !readiness.ok;

    var copyStage = document.querySelector('button[data-stage="copy"]');
    if (copyStage) copyStage.disabled = !readiness.ok;
  }

  /* ---------------------------------------------------------------- *
   * Practice comparison
   * ---------------------------------------------------------------- */

  function compare() {
    var report = core.compareToReference(state.scenario, state.draft);
    if (!report.ok) {
      say(report.errors[0].message);
      return;
    }
    state.lastComparison = report.value;
    render();
    say('Comparison ready. ' + report.value.agreements.length + ' agreements, '
      + report.value.divergences.length + ' differences to talk about.');
  }

  function renderComparison(comparison) {
    var card = el('div', 'card');
    add(card, el('h3', null, 'Your reading and the reference reading'));
    add(card, el('p', 'note', comparison.disclaimer));

    comparison.agreements.forEach(function (entry) {
      add(card, el('span', 'flag go',
        (entry.componentId ? entry.componentId + ': ' : '') + entry.note));
    });
    comparison.divergences.forEach(function (entry) {
      add(card, el('span', 'flag',
        (entry.componentId ? entry.componentId + ': ' : '') + entry.note));
    });

    if (comparison.referenceNote) {
      add(card, el('p', 'lab', 'Why'));
      add(card, el('p', null, comparison.referenceNote));
    }
    if (comparison.discussion.length) {
      add(card, el('p', 'lab', 'Worth discussing'));
      var list = el('ul');
      comparison.discussion.forEach(function (prompt) { add(list, el('li', null, prompt)); });
      add(card, list);
    }
    return card;
  }

  /* ---------------------------------------------------------------- *
   * Stage 4: copy
   * ---------------------------------------------------------------- */

  function copyText(text, what) {
    function fallback() {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', 'readonly');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try { document.execCommand('copy'); } catch (err) { /* reported below */ }
      document.body.removeChild(area);
      say(what + ' copied.');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        say(what + ' copied.');
      }, fallback);
    } else {
      fallback();
    }
  }

  function renderCopy() {
    var wrap = el('div');
    add(wrap, el('h2', null, 'Copy into your walkthrough form'));
    add(wrap, el('p', 'note',
      'This tool does not submit anything, send anything, or store anything. '
      + 'You paste these into the form your school already uses.'));

    var output = core.buildFormOutput(state.draft, fixtures.SAMPLE_FIELD_MAP);
    if (!output.ok) {
      add(wrap, el('span', 'flag stop', output.errors[0].message));
      return wrap;
    }

    var all = el('div', 'row');
    add(all, button('Copy everything', 'primary', function () {
      copyText(output.value.copyAll, 'All fields');
    }));
    add(wrap, all);

    output.value.contextFields.forEach(function (fieldOut) {
      var box = el('div', 'out');
      var head = el('div', 'head');
      add(head, el('h3', null, fieldOut.key));
      add(head, button('Copy', null, function () { copyText(fieldOut.text, fieldOut.key); }));
      add(box, head);
      var pre = el('pre');
      pre.textContent = fieldOut.text;
      add(box, pre);
      add(wrap, box);
    });

    output.value.fields.forEach(function (fieldOut) {
      var box = el('div', 'out' + (fieldOut.empty ? ' empty' : ''));
      var head = el('div', 'head');
      var title = el('h3', null, fieldOut.key);
      if (fieldOut.empty) add(title, el('span', 'pill', 'no evidence'));
      add(head, title);
      add(head, button('Copy', null, function () { copyText(fieldOut.text, fieldOut.key); }));
      add(box, head);
      var pre = el('pre');
      pre.textContent = fieldOut.text;
      add(box, pre);
      add(wrap, box);
    });

    var end = el('div', 'row');
    end.style.marginTop = '1rem';
    add(end, button('Clear and start over', null, clearAll));
    add(end, el('span', 'note', 'Clearing discards the notes, the suggestions, and everything you rejected.'));
    add(wrap, end);
    return wrap;
  }

  function clearAll() {
    core.clearDraft(state.draft);
    state.draft = null;
    state.scenario = null;
    state.notes = '';
    state.lastComparison = null;
    goto('capture');
    say('Cleared. Nothing was kept.');
  }

  /* ---------------------------------------------------------------- *
   * Render
   * ---------------------------------------------------------------- */

  function render() {
    app.textContent = '';
    add(app, renderBanner(), renderStages());
    if (state.stage === 'capture') add(app, renderCapture());
    else if (state.stage === 'analyze') add(app, renderAnalyze());
    else if (state.stage === 'feedback') add(app, renderFeedback());
    else add(app, renderCopy());

    foot.textContent = '';
    add(foot, el('p', null,
      'Formative walkthrough and coaching support. This tool never assigns a rating, calculates a '
      + 'summative score, or makes an employment recommendation.'));
    add(foot, el('p', null,
      'Practice material here is invented. Before using this with a real staff member, confirm with '
      + 'your district which AI provider may process observation notes, whether a walkthrough counts '
      + 'as evidence in your evaluation system, and how long anything typed here is retained.'));
    add(foot, el('p', null, scenarios.DISCLAIMER));
  }

  function boot() {
    if (!core || !fixtures || !scenarios) {
      app.textContent = 'The copilot modules did not load. Open this page from the repository folder so the scripts resolve.';
      return;
    }
    state.disclosure = core.normalizeDisclosure({});
    render();
  }

  boot();
})();
