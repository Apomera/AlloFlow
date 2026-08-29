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

  var scriptSource = window.AlloModules && window.AlloModules.WalkthroughScriptSource;

  // Connection CONFIG only: the deployment URL and the device token. No
  // observation content is ever persisted here.
  var STORE_KEY = 'allo_wcop_delivery_v1';

  var state = {
    stage: 'capture',
    scenario: null,
    notes: '',
    draft: null,
    disclosure: null,
    lastComparison: null,
    introOpen: true,
    delivery: { execUrl: '', token: '', owner: '', selfTest: null, busy: false, message: '', tone: 'warn' },
    sendTo: '',
    sendResult: null,
    // Session-only. Deliberately never written to storage: a principal who
    // affirmed in September should be asked again in March.
    approval: null,
    context: {},
    manual: { componentId: '', quote: '', evidence: '', interpretation: '', message: '' }
  };

  function loadConnection() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (saved && typeof saved.execUrl === 'string') {
        state.delivery.execUrl = saved.execUrl;
        state.delivery.token = typeof saved.token === 'string' ? saved.token : '';
        state.delivery.owner = typeof saved.owner === 'string' ? saved.owner : '';
      }
    } catch (err) { /* a missing or unreadable store is simply "not connected" */ }
  }

  function saveConnection() {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({
        execUrl: state.delivery.execUrl,
        token: state.delivery.token,
        owner: state.delivery.owner
      }));
    } catch (err) { /* private browsing: the connection just will not persist */ }
  }

  function forgetConnection() {
    try { window.localStorage.removeItem(STORE_KEY); } catch (err) { /* nothing to clear */ }
    state.delivery = { execUrl: '', token: '', owner: '', selfTest: null, busy: false, message: '', tone: 'warn' };
  }

  // Apps Script answers exactly one request shape. A JSON content type would
  // trigger a CORS preflight it cannot respond to, so the body is sent as
  // text/plain and parsed as JSON on the other side.
  function postToScript(url, body) {
    return window.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    }).then(function (response) { return response.json(); });
  }

  function deliveryClient() {
    return core.createDelivery({
      execUrl: state.delivery.execUrl,
      token: state.delivery.token,
      post: postToScript
    });
  }

  var isConnected = function () {
    return !!state.delivery.execUrl && !!state.delivery.token;
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

  function activeMode() {
    if (state.draft) return state.draft.mode;
    return state.approval ? 'approved' : 'demo';
  }

  function renderBanner() {
    var mode = activeMode();
    var banner = el('div', 'banner' + (mode === 'approved' ? ' banner-live' : ''));
    banner.setAttribute('role', 'note');
    add(banner, el('span', null, mode === 'demo' ? 'Practice mode' : 'Real observation'));
    add(banner, el('span', 'sep', '|'));
    if (mode === 'demo') {
      add(banner, el('span', null, 'Synthetic practice only. Nothing here is a record of a real observation.'));
    } else {
      var by = (state.draft && state.draft.approval && state.draft.approval.affirmedBy)
        || (state.approval && state.approval.affirmedBy) || 'you';
      add(banner, el('span', null, 'Affirmed by ' + by + ' for this session only.'));
    }
    add(banner, el('span', 'sep', '|'));
    add(banner, el('span', null, 'Nothing is saved. Closing this page discards everything.'));
    return banner;
  }

  /* ---------------------------------------------------------------- *
   * Approval affirmation
   * ---------------------------------------------------------------- */

  function renderAffirm() {
    var described = core.describeApproval();
    var wrap = el('div');
    add(wrap, el('h2', null, 'Use this for a real observation'));
    add(wrap, el('p', 'note', described.note));

    var card = el('div', 'card');
    add(card, el('p', 'lab', 'Confirm each of these'));

    var checks = {};
    described.terms.forEach(function (term) {
      var row = el('label', 'check');
      var box = el('input');
      box.type = 'checkbox';
      box.id = 'affirm-' + term.key;
      checks[term.key] = box;
      add(row, box, el('span', null, term.text));
      add(card, row);
    });

    var field = el('div', 'field');
    field.style.marginTop = '.6rem';
    var label = el('label', null, 'Your name, recorded with the affirmation');
    label.setAttribute('for', 'affirm-name');
    var name = el('input');
    name.type = 'text';
    name.id = 'affirm-name';
    name.value = (state.approval && state.approval.affirmedBy) || '';
    add(field, label, name);
    add(card, field);

    var msg = el('div');
    msg.id = 'affirm-msg';
    add(card, msg);

    var row = el('div', 'row');
    var confirm = button('Affirm and continue', 'primary', function () {
      var affirmed = { affirmedBy: name.value.trim() };
      described.terms.forEach(function (term) { affirmed[term.key] = checks[term.key].checked; });

      var missing = described.terms.filter(function (term) { return !affirmed[term.key]; });
      if (missing.length || !affirmed.affirmedBy) {
        msg.textContent = '';
        add(msg, el('span', 'flag stop',
          !affirmed.affirmedBy && missing.length ? 'Confirm each statement and enter your name.'
            : missing.length ? 'Confirm each statement. These are claims about your district, not settings.'
              : 'Enter your name so the affirmation records who made it.'));
        return;
      }
      state.approval = affirmed;
      state.scenario = null;
      state.notes = '';
      state.draft = null;
      goto('capture');
      say('Real observation mode. Affirmed by ' + affirmed.affirmedBy + ' for this session.');
    });
    confirm.id = 'affirm-btn';
    add(row, confirm);
    add(row, button('Stay in practice mode', null, function () { goto('capture'); }));
    add(card, row);
    add(wrap, card);

    var why = el('div', 'card');
    add(why, el('h3', null, 'What this does and does not change'));
    add(why, el('p', 'note',
      'It removes the practice watermark and lets you work from your own notes. It changes nothing '
      + 'about how evidence is checked. It is not remembered after this session, and it is not a '
      + 'substitute for your district actually having approved anything.'));
    add(wrap, why);
    return wrap;
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

    add(card, el('p', 'lab', 'Three ways this gets used'));
    var tiers = el('div', 'tiers');
    [
      {
        name: 'Practice, on this device',
        cost: 'Nothing to set up',
        body: 'Invented scenarios, no AI contacted, nothing saved. This is what you are in now, and what to use for training or a staff meeting.',
        state: 'active'
      },
      {
        name: 'Deliver to your teachers',
        cost: 'You deploy a script, about three minutes',
        body: 'A small script in your own Google account saves each finished note to your Drive and shares it with one named teacher. Your district permits it rather than administering it.',
        state: isConnected() ? 'connected' : 'available'
      },
      {
        name: 'District system of record',
        cost: 'Your district deploys and runs it',
        body: 'Verified identity, evaluator assignments, teacher acknowledgment and a tamper-evident audit trail. A separate portal your district opens, not something this page can switch on.',
        state: 'district'
      }
    ].forEach(function (tier) {
      var box = el('div', 'tier tier-' + tier.state);
      add(box, el('h4', null, tier.name));
      add(box, el('p', 'tier-cost', tier.cost));
      add(box, el('p', 'note', tier.body));
      if (tier.state === 'connected') add(box, el('span', 'flag go', 'Connected to ' + (state.delivery.owner || 'your Google account') + '.'));
      if (tier.state === 'available') {
        add(box, button('Set up delivery', null, function () { goto('setup'); }));
      }
      add(tiers, box);
    });
    add(card, tiers);
    return card;
  }

  /* ---------------------------------------------------------------- *
   * Delivery setup
   * ---------------------------------------------------------------- */

  function renderSetup() {
    var wrap = el('div');
    add(wrap, el('h2', null, 'Set up delivery to your teachers'));
    add(wrap, el('p', 'note',
      'This runs in your own Google account. Finished notes are saved to your Drive and shared with '
      + 'one named teacher at a time. Nothing goes to an AlloFlow server, and there is no AlloFlow database.'));

    if (!scriptSource) {
      add(wrap, el('span', 'flag stop',
        'The script could not be loaded, so the copy button is unavailable. Open this page from the repository folder or reload.'));
      add(wrap, button('Back', null, function () { goto('capture'); }));
      return wrap;
    }

    var stepsCard = el('div', 'card');
    add(stepsCard, el('h3', null, 'Deploy the script'));
    var list = el('ol', 'steps');
    scriptSource.steps.forEach(function (step) {
      add(list, el('li', null, step.text));
    });
    add(stepsCard, list);

    var copyRow = el('div', 'row');
    add(copyRow, button('Copy script code', 'primary', function () {
      copyText(scriptSource.source, 'Script code');
    }));
    add(copyRow, el('span', 'note',
      scriptSource.source.length.toLocaleString() + ' characters. The script ships inside this page, so this works offline.'));
    add(stepsCard, copyRow);
    add(wrap, stepsCard);

    var connectCard = el('div', 'card');
    add(connectCard, el('h3', null, 'Connect it'));

    var field = el('div', 'field');
    var label = el('label', null, 'Web app URL (ends in /exec)');
    label.setAttribute('for', 'exec-url');
    var input = el('input');
    input.type = 'text';
    input.id = 'exec-url';
    input.value = state.delivery.execUrl;
    input.placeholder = 'https://script.google.com/macros/s/.../exec';
    input.addEventListener('input', function () { state.delivery.execUrl = input.value; });
    add(field, label, input);
    add(connectCard, field);

    var actions = el('div', 'row');
    var connect = button(isConnected() ? 'Reconnect' : 'Connect', 'primary', doConnect, { disabled: state.delivery.busy });
    connect.id = 'connect-btn';
    add(actions, connect);
    if (isConnected()) {
      add(actions, button('Run self-test', null, doSelfTest, { disabled: state.delivery.busy }));
      add(actions, button('Forget this connection', null, function () {
        forgetConnection();
        render();
        say('Connection forgotten on this device. The script and your Drive files are untouched.');
      }));
    }
    add(connectCard, actions);

    if (state.delivery.message) {
      add(connectCard, el('span', 'flag ' + (state.delivery.tone === 'go' ? 'go' : state.delivery.tone === 'stop' ? 'stop' : ''),
        state.delivery.message));
    }
    if (state.delivery.selfTest) {
      var t = state.delivery.selfTest;
      add(connectCard, el('p', 'note',
        'Owner: ' + (t.owner || 'unknown')
        + ' | folder: ' + (t.folderName || 'not created yet')
        + ' | email quota available: ' + (t.canSendMail ? 'yes' : 'no')));
    }
    add(wrap, connectCard);

    var noteCard = el('div', 'card');
    add(noteCard, el('h3', null, 'Before you use this on a real staff member'));
    add(noteCard, el('p', 'note',
      'This stores feedback you wrote and approved. It does not rate anyone and it is not an '
      + 'evaluation system of record. Using it on real staff is a district decision. Get answers to:'));
    var qs = el('ul');
    ADVISORY_QUESTIONS.forEach(function (q) { add(qs, el('li', null, q)); });
    add(noteCard, qs);
    add(wrap, noteCard);

    add(wrap, button('Back to the tool', null, function () { goto('capture'); }));
    return wrap;
  }

  function doConnect() {
    var check = core.validateExecUrl(state.delivery.execUrl);
    if (!check.ok) {
      state.delivery.message = check.errors[0].message;
      state.delivery.tone = 'stop';
      render();
      say(check.errors[0].message);
      return;
    }
    state.delivery.execUrl = check.value;
    state.delivery.token = '';
    state.delivery.busy = true;
    state.delivery.message = 'Connecting...';
    state.delivery.tone = 'warn';
    render();

    var built = deliveryClient();
    if (!built.ok) {
      state.delivery.busy = false;
      state.delivery.message = built.errors[0].message;
      state.delivery.tone = 'stop';
      render();
      return;
    }
    built.value.claim().then(function (result) {
      state.delivery.busy = false;
      if (!result.ok) {
        state.delivery.message = result.errors[0].message;
        state.delivery.tone = 'stop';
        render();
        say(result.errors[0].message);
        return;
      }
      state.delivery.token = result.value.token;
      state.delivery.owner = result.value.owner || '';
      saveConnection();
      state.delivery.message = 'Connected to ' + (state.delivery.owner || 'your Google account') + '.';
      state.delivery.tone = 'go';
      render();
      say('Connected.');
      doSelfTest();
    }, function (err) {
      state.delivery.busy = false;
      state.delivery.message = 'Could not reach the script. Check the URL, and that the deployment is set to "Anyone". (' + (err && err.message ? err.message : 'network error') + ')';
      state.delivery.tone = 'stop';
      render();
    });
  }

  function doSelfTest() {
    var built = deliveryClient();
    if (!built.ok) return;
    state.delivery.busy = true;
    render();
    built.value.selfTest().then(function (result) {
      state.delivery.busy = false;
      if (!result.ok) {
        state.delivery.message = result.errors[0].message;
        state.delivery.tone = 'stop';
      } else {
        state.delivery.selfTest = result.value;
        state.delivery.message = 'Self-test passed.';
        state.delivery.tone = 'go';
      }
      render();
    }, function () {
      state.delivery.busy = false;
      state.delivery.message = 'The self-test could not reach the script.';
      state.delivery.tone = 'stop';
      render();
    });
  }

  function renderCapture() {
    if (state.approval) return renderRealCapture();
    var wrap = el('div');

    var modeRow = el('div', 'row');
    modeRow.style.margin = '0 0 1rem';
    add(modeRow, button('Use this for a real observation', null, function () { goto('affirm'); }));
    add(modeRow, el('span', 'note', 'Requires confirming what your district has approved.'));
    add(wrap, modeRow);

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

  /* ---------------------------------------------------------------- *
   * Real observation capture
   * ---------------------------------------------------------------- */

  function renderRealCapture() {
    var wrap = el('div');

    var card = el('div', 'card');
    add(card, el('h2', null, 'Your observation notes'));
    add(card, el('p', 'note',
      'Type the shorthand you wrote during the visit. Locking it keeps your original wording exactly '
      + 'as written, and every claim you record afterwards has to quote a line from it.'));

    var area = el('textarea');
    area.id = 'notes-input';
    area.value = state.notes;
    area.setAttribute('aria-label', 'Observation notes');
    area.addEventListener('input', function () {
      state.notes = area.value;
      // Partial update: a full re-render would steal focus mid-sentence, and
      // leaving the button stale would make it lie about what it will do.
      var lockBtn = document.getElementById('freeze-btn');
      if (lockBtn) lockBtn.disabled = !state.notes.trim();
    });
    add(card, area);

    var ctx = el('div', 'row');
    ctx.style.marginTop = '.6rem';
    ['teacherDisplayName', 'date', 'period', 'subject'].forEach(function (key) {
      var field = el('div', 'field');
      field.style.flex = '1 1 9rem';
      field.style.margin = '0';
      var label = el('label', null, key === 'teacherDisplayName' ? 'Teacher' : key.charAt(0).toUpperCase() + key.slice(1));
      label.setAttribute('for', 'ctx-' + key);
      var input = el('input');
      input.type = 'text';
      input.id = 'ctx-' + key;
      input.value = state.context ? (state.context[key] || '') : '';
      input.addEventListener('input', function () {
        state.context = state.context || {};
        state.context[key] = input.value;
      });
      add(field, label, input);
      add(ctx, field);
    });
    add(card, ctx);

    var row = el('div', 'row');
    row.style.marginTop = '.7rem';
    var lock = button('Lock these notes', 'primary', function () {
      var created = core.createDraft({
        framework: fixtures.PORTLAND_FRAMEWORK,
        sourceNotes: state.notes,
        context: state.context || {},
        mode: 'approved',
        approval: state.approval,
        collectionType: 'walkthrough'
      });
      if (!created.ok) {
        say(created.errors[0].message);
        state.manual.message = created.errors[0].message;
        render();
        return;
      }
      state.draft = created.value;
      goto('analyze');
      say('Notes locked. Add the evidence you observed.');
    }, { disabled: !state.notes || !state.notes.trim() });
    lock.id = 'freeze-btn';
    add(row, lock);
    add(row, button('Back to practice', null, function () {
      state.approval = null;
      state.notes = '';
      state.draft = null;
      goto('capture');
      say('Back in practice mode.');
    }));
    add(card, row);
    if (state.manual.message) add(card, el('span', 'flag stop', state.manual.message));
    add(wrap, card);

    var noteCard = el('div', 'card');
    add(noteCard, el('p', 'note',
      'There is no AI connected in this build, so you will write each piece of evidence yourself in '
      + 'the next step. The tool still checks that every claim quotes your notes, keeps what you '
      + 'observed separate from what you concluded, and flags language that reaches past the evidence.'));
    add(wrap, noteCard);
    return wrap;
  }

  function renderManualEntry() {
    var card = el('div', 'card');
    add(card, el('h3', null, 'Add evidence'));
    add(card, el('p', 'note',
      'Pick the component, quote the line of your notes it rests on, then say what you observed. '
      + 'Keep any conclusion in the separate interpretation field.'));

    var compField = el('div', 'field');
    var compLabel = el('label', null, 'Component');
    compLabel.setAttribute('for', 'manual-component');
    var select = el('select');
    select.id = 'manual-component';
    var blank = el('option', null, 'Choose a component');
    blank.value = '';
    add(select, blank);
    state.draft.framework.components.forEach(function (component) {
      var option = el('option', null, component.id + ' ' + component.label);
      option.value = component.id;
      if (state.manual.componentId === component.id) option.selected = true;
      add(select, option);
    });
    select.addEventListener('change', function () { state.manual.componentId = select.value; });
    add(compField, compLabel, select);
    add(card, compField);

    [
      ['quote', 'Quote from your notes', 'Paste the exact line this rests on'],
      ['evidence', 'What you observed', 'Describe only what happened'],
      ['interpretation', 'What it might mean (optional)', 'Your reading of it, kept separate']
    ].forEach(function (spec) {
      var field = el('div', 'field');
      var label = el('label', null, spec[1]);
      label.setAttribute('for', 'manual-' + spec[0]);
      var input = el('textarea');
      input.id = 'manual-' + spec[0];
      input.style.minHeight = '3.4rem';
      input.placeholder = spec[2];
      input.value = state.manual[spec[0]];
      input.addEventListener('input', function () { state.manual[spec[0]] = input.value; });
      add(field, label, input);
      add(card, field);
    });

    var row = el('div', 'row');
    var addBtn = button('Add this evidence', 'primary', function () {
      var report = core.addManualSuggestion(state.draft, {
        componentId: state.manual.componentId,
        quote: state.manual.quote,
        objectiveEvidence: state.manual.evidence,
        interpretation: state.manual.interpretation
      });
      if (!report.ok) {
        state.manual.message = report.errors[0].message;
        render();
        say(report.errors[0].message);
        return;
      }
      state.draft = report.value;
      state.manual = { componentId: '', quote: '', evidence: '', interpretation: '', message: '' };
      render();
      say('Evidence added. ' + state.draft.suggestions.length + ' recorded so far.');
    });
    addBtn.id = 'manual-add';
    add(row, addBtn);
    add(card, row);
    if (state.manual.message) add(card, el('span', 'flag stop', state.manual.message));
    return card;
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

    if (state.draft.mode === 'approved') add(right, renderManualEntry());

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
      area.setAttribute('aria-label', 'Temporary field for copying walkthrough text');
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

    var deliverCard = el('div', 'card');
    add(deliverCard, el('h3', null, 'Send it to the teacher'));
    if (!isConnected()) {
      add(deliverCard, el('p', 'note',
        'You can paste the fields above into whatever form your school uses. If you would rather have '
        + 'this saved to your Drive and shared with the teacher directly, set that up once.'));
      add(deliverCard, button('Set up delivery', null, function () { goto('setup'); }));
    } else if (state.draft.mode === 'demo') {
      add(deliverCard, el('span', 'flag',
        'Delivery is connected, but this is a practice scenario. Sending is only available for a real '
        + 'observation, so nothing here can reach a colleague by accident.'));
    } else {
      var field = el('div', 'field');
      var label = el('label', null, 'Teacher school email');
      label.setAttribute('for', 'send-to');
      var input = el('input');
      input.type = 'text';
      input.id = 'send-to';
      input.value = state.sendTo;
      input.placeholder = 'teacher@yourschool.org';
      input.addEventListener('input', function () { state.sendTo = input.value; });
      add(field, label, input);
      add(deliverCard, field);
      add(deliverCard, el('p', 'note',
        'The note is saved to your Drive and shared with that one address. Google asks them to sign in '
        + 'to open it, so a forwarded link shows nothing. The notification email contains no feedback text.'));
      add(deliverCard, button('Save to my Drive and share', 'primary', doDeliver, { disabled: state.delivery.busy }));
    }
    if (state.sendResult) {
      add(deliverCard, el('span', 'flag ' + (state.sendResult.ok ? 'go' : 'stop'), state.sendResult.message));
    }
    add(wrap, deliverCard);

    var end = el('div', 'row');
    end.style.marginTop = '1rem';
    add(end, button('Clear and start over', null, clearAll));
    add(end, el('span', 'note', 'Clearing discards the notes, the suggestions, and everything you rejected.'));
    add(wrap, end);
    return wrap;
  }

  function doDeliver() {
    var built = deliveryClient();
    if (!built.ok) {
      state.sendResult = { ok: false, message: built.errors[0].message };
      render();
      return;
    }
    state.delivery.busy = true;
    render();
    built.value.deliver(state.draft, fixtures.SAMPLE_FIELD_MAP, {
      teacherEmail: state.sendTo,
      allowedDomain: state.delivery.selfTest && state.delivery.selfTest.allowedDomain
    }).then(function (result) {
      state.delivery.busy = false;
      state.sendResult = result.ok
        ? { ok: true, message: 'Saved and shared with ' + result.value.sharedWith
            + (result.value.notified ? '. A notification was sent.' : '. The notification could not be sent, so tell them directly.') }
        : { ok: false, message: result.errors[0].message };
      render();
      say(state.sendResult.message);
    }, function (err) {
      state.delivery.busy = false;
      state.sendResult = { ok: false, message: 'Could not reach the script. Nothing was saved. (' + (err && err.message ? err.message : 'network error') + ')' };
      render();
    });
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
    if (state.stage === 'setup') add(app, renderSetup());
    else if (state.stage === 'affirm') add(app, renderAffirm());
    else if (state.stage === 'capture') add(app, renderCapture());
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
    loadConnection();
    render();
  }

  boot();
})();
