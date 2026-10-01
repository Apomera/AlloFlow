const fs = require('fs');
const path = require('path');
const root = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const sourcePath = path.join(root, 'stem_lab/stem_tool_microbiology.js');
let source = fs.readFileSync(sourcePath, 'utf8');
const eol = source.includes('\r\n') ? '\r\n' : '\n';
const edits = [];
function exact(text) { return text.replace(/\r?\n/g, eol); }
function edit(oldText, newText) {
  const old = exact(oldText), replacement = exact(newText);
  if (source.split(old).length !== 2) throw new Error('Expected one match: ' + old.slice(0, 100));
  edits.push({ old, new: replacement });
  source = source.replace(old, replacement);
}
function between(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error('Missing range ' + start);
  return source.slice(from, to);
}

edit('    function validId(value) { return typeof value === \'number\' && Number.isInteger(value) && value > 0 && value <= MAX_ID; }\n    function validTrial(value)', `    function sameSweep(a, b) {
      return !!a && !!b && a.variable === b.variable && conditionKeys.every(function(key) { return a.conditions[key] === b.conditions[key]; });
    }
    function validId(value) { return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= MAX_ID; }
    function validTrial(value)`);
edit('      if (removedId !== null) notebook.removed = Object.freeze({ trial: normalizeTrial(removed.trial, removedId), index: removed.index });\n      return Object.freeze(notebook);', `      if (removedId !== null) notebook.removed = Object.freeze({ trial: normalizeTrial(removed.trial, removedId), index: removed.index });
      var previousSweep = normalizeSweep(raw.previousSweep);
      if (notebook.sweep && previousSweep && !sameSweep(notebook.sweep, previousSweep)) notebook.previousSweep = previousSweep;
      return Object.freeze(notebook);`);
edit('    function saveTrial(value, conditions) {\n      var notebook = normalizeNotebook(value);', `    function saveSweep(value, specification) {
      var notebook = normalizeNotebook(value), next = normalizeSweep(specification);
      if (!next) return { notebook: notebook, status: 'invalid' };
      if (sameSweep(notebook.sweep, next)) return { notebook: notebook, status: 'unchanged' };
      return { notebook: normalizeNotebook(Object.assign({}, notebook, { sweep: next, previousSweep: notebook.sweep })), status: 'saved' };
    }
    function restoreSweep(value) {
      var notebook = normalizeNotebook(value);
      if (!notebook.previousSweep) return { notebook: notebook, status: 'missing' };
      return { notebook: normalizeNotebook(Object.assign({}, notebook, { sweep: notebook.previousSweep, previousSweep: notebook.sweep })), status: 'restored' };
    }
    function saveTrial(value, conditions) {
      var notebook = normalizeNotebook(value);`);
edit('      reviewNotebook: reviewNotebook, reviewCSV: reviewCSV, csv: csv, similarThreshold: SIMILAR_THRESHOLD, maxRecords: MAX_RECORDS', '      saveSweep: saveSweep, restoreSweep: restoreSweep,\n      reviewNotebook: reviewNotebook, reviewCSV: reviewCSV, csv: csv, similarThreshold: SIMILAR_THRESHOLD, maxRecords: MAX_RECORDS');

edit('  // Keep transient announcements and action focus outside the persisted notebook.\n  function MicroGrowthRecovery(props) {', `  function __alloMicroGrowthQueueFocus(owner, anchor, selector, matches) {
    if (!owner || !anchor) return;
    var request = {}, updateVersion = __alloMBUpdateVersion;
    var originalTab = document.getElementById('micro-tab-growthLab');
    owner.__microGrowthFocusRequest = request;
    setTimeout(function() {
      var tab = document.getElementById('micro-tab-growthLab');
      if (updateVersion !== __alloMBUpdateVersion || !owner.isConnected || owner.__microGrowthFocusRequest !== request ||
        !anchor.isConnected || !owner.contains(anchor) || tab !== originalTab || !tab || tab.getAttribute('aria-selected') !== 'true' ||
        (matches && !matches(owner, anchor))) return;
      owner.__microGrowthFocusRequest = null;
      var target = owner.querySelector(selector);
      if (target) { target.focus(); if (target.scrollIntoView) target.scrollIntoView({ block: 'nearest', behavior: 'auto' }); }
    }, 0);
  }

  function MicroGrowthSweepHistory(props) {
    var React = props.React, h = React.createElement, book = props.book, gt = props.translate;
    var descriptorKey = JSON.stringify([book.sweep, book.previousSweep || null]);
    var noticeState = React.useState(null), notice = noticeState[0], setNotice = noticeState[1];
    React.useEffect(function() {
      setNotice(function(current) { return current && current.key !== descriptorKey ? null : current; });
    }, [descriptorKey]);
    function restore(event) {
      var result = MicroGrowth.restoreSweep(book);
      if (result.status !== 'restored') return;
      var owner = event.currentTarget.closest('[data-micro-growth]');
      var anchor = owner && owner.querySelector('#gl-current-sweep-evidence');
      var currentDescriptor = JSON.stringify(result.notebook.sweep);
      var nextKey = JSON.stringify([result.notebook.sweep, result.notebook.previousSweep || null]);
      setNotice(function(current) { return { key: nextKey, revision: current ? current.revision + 1 : 1,
        text: gt('sweep_restored', 'Previous sweep restored as current. The other sweep remains available below. Your trial settings, saved trials, and draft responses are unchanged.') }; });
      props.save(result.notebook);
      __alloMicroGrowthQueueFocus(owner, anchor, '#gl-current-sweep-heading', function(workspace, current) {
        return current.getAttribute('data-sweep-descriptor') === currentDescriptor;
      });
    }
    return h('div', null,
      h('p', { id: 'gl-sweep-history-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': true, className: 'micro-growth-muted' },
        notice && notice.key === descriptorKey ? h('span', { key: notice.revision }, notice.text) : null),
      book.previousSweep ? h('details', { id: 'gl-previous-sweep' },
        h('summary', null, gt('sweep_previous_review', 'Review previous sweep')),
        h('p', { id: 'gl-sweep-restore-note', className: 'micro-growth-muted' }, gt('sweep_restore_note', 'Restoring swaps the current and previous saved sweeps. It keeps your next trial settings, control, predictions, and saved trials.')),
        props.renderEvidence(MicroGrowth.sweep(book.previousSweep.conditions, book.previousSweep.variable), true),
        h('button', { type: 'button', id: 'gl-restore-previous-sweep', 'aria-describedby': 'gl-sweep-restore-note', onClick: restore }, gt('sweep_restore_previous', 'Restore previous sweep'))
      ) : null
    );
  }

  // Keep transient announcements and action focus outside the persisted notebook.
  function MicroGrowthRecovery(props) {`);

edit("        function gt(key, fallback) { return __alloT('stem.microbiology.investigation_' + key, fallback); }\n        function saveBook(patch)", "        function gt(key, fallback) { return __alloT('stem.microbiology.investigation_' + key, fallback); }\n        function cancelDeferredGrowthFocus(event) { event.currentTarget.__microGrowthFocusRequest = null; }\n        function saveBook(patch)");

const exportOld = between('          if (savedSweep) {\n'.replace(/\n/g, eol), '          var link, url;');
edit(exportOld, `          [{ label: gt('sweep_current', 'Current sweep'), result: savedSweep },
            { label: gt('sweep_previous', 'Previous sweep'), result: book.previousSweep ? G.sweep(book.previousSweep.conditions, book.previousSweep.variable) : null }].forEach(function(entry) {
            var result = entry.result;
            if (!result) return;
            text.push(entry.label, gt('sweep_title', 'Explore one variable across a range'),
              gt('sweep_variable', 'Variable to sweep') + ': ' + labels[result.variable],
              gt('sweep_held', 'Held constant') + ': ' + sweepFixed(result),
              gt('sweep_constants', 'Every sample starts at 5 population units, runs for 24 model hours, and shares capacity 100 and maximum modeled rate 0.4 per hour.'),
              gt('sweep_sample_note', 'These are sampled model responses, not measurements. Connecting lines guide the eye; unsampled settings may differ.'),
              labels[result.variable] + '\\t' + gt('sweep_final', 'Population at hour 24') + '\\t' + gt('sweep_lag', 'Modeled lag (hours)'));
            result.points.forEach(function(point) { text.push(settingText(result.variable, point.value) + '\\t' + num(point.finalPopulation) + '\\t' + num(point.lagHours)); });
            text.push('');
          });
`);

const focusOld = between('              setTimeout(function() {\n                var activeTab = document.getElementById(\'micro-tab-growthLab\');'.replace(/\n/g, eol), "            } }, gt('next_unexplained'");
edit(focusOld, `              __alloMicroGrowthQueueFocus(owner, priorResult, '#gl-explanation', function(workspace, result) {
                return (result.getAttribute('data-micro-growth-result') || result.getAttribute('data-micro-growth-recovered')) === String(targetId);
              });
`);

edit("        return h('div', { className: 'micro-growth-workspace', 'data-micro-growth': 'true' },", `        return h('div', { className: 'micro-growth-workspace', 'data-micro-growth': 'true',
          onClickCapture: cancelDeferredGrowthFocus, onPointerDownCapture: cancelDeferredGrowthFocus, onKeyDownCapture: cancelDeferredGrowthFocus,
          onFocusCapture: cancelDeferredGrowthFocus, onInputCapture: cancelDeferredGrowthFocus, onChangeCapture: cancelDeferredGrowthFocus },`);

const evidenceOld = between("            savedSweep ? h('div', { 'data-micro-growth-sweep': savedSweep.variable },", "            ) : h('p', { className: 'micro-growth-muted' }, gt('sweep_empty'");
let evidenceBody = evidenceOld.slice(evidenceOld.indexOf(eol) + eol.length);
evidenceBody = evidenceBody.replace(/savedSweep/g, 'result');
evidenceBody = evidenceBody.replace("h('p', { role: 'status', 'aria-live': 'polite' }, gt('sweep_saved'", "h('p', { role: previous ? undefined : 'status', 'aria-live': previous ? undefined : 'polite' }, gt('sweep_saved'");
evidenceBody = evidenceBody.replace("h('th', { scope: 'col' }, gt('sweep_prepare', 'Prepare next trial'))", "!previous ? h('th', { scope: 'col' }, gt('sweep_prepare', 'Prepare next trial')) : null");
evidenceBody = evidenceBody.replace("h('td', null, h('button', { type: 'button', 'aria-pressed': prepared, 'aria-label': gt('sweep_use_setting'", "!previous ? h('td', null, h('button', { type: 'button', 'aria-pressed': prepared, 'aria-label': gt('sweep_use_setting'");
evidenceBody = evidenceBody.replace("gt('sweep_use', 'Use as next trial'))));", "gt('sweep_use', 'Use as next trial'))) : null);");
evidenceBody = evidenceBody.replace("h('p', { className: 'micro-growth-muted' }, gt('sweep_trial_note',", "!previous ? h('p', { className: 'micro-growth-muted' }, gt('sweep_trial_note',");
evidenceBody = evidenceBody.replace("Review your prediction before running a comparison.'))", "Review your prediction before running a comparison.')) : null");
const evidenceFunction = `        function sweepEvidence(result, previous) {
          return h('div', { id: previous ? 'gl-previous-sweep-evidence' : 'gl-current-sweep-evidence',
            'data-micro-growth-sweep': previous ? undefined : result.variable,
            'data-micro-growth-previous-sweep': previous ? result.variable : undefined,
            'data-sweep-descriptor': JSON.stringify({ variable: result.variable, conditions: result.conditions }) },
            h('h4', { id: previous ? 'gl-previous-sweep-heading' : 'gl-current-sweep-heading', tabIndex: -1 }, previous ? gt('sweep_previous', 'Previous sweep') : gt('sweep_current', 'Current sweep')),
${evidenceBody}          );
        }
`;
edit('        function explanationEditor() {', evidenceFunction + '        function explanationEditor() {');
edit(evidenceOld, '            savedSweep ? sweepEvidence(savedSweep, false)\n');
edit("            ) : h('p', { className: 'micro-growth-muted' }, gt('sweep_empty', 'Run a sweep to save its response curve and table. Changing the trial controls afterward will not rewrite that evidence.'))", `            : h('p', { className: 'micro-growth-muted' }, gt('sweep_empty', 'Run a sweep to save its response curve and table. Changing the trial controls afterward will not rewrite that evidence.')),
            h(MicroGrowthSweepHistory, { React: React, book: book, translate: gt, renderEvidence: sweepEvidence,
              save: function(notebook) { upd({ growthInvestigation: notebook }); } })`);
edit("            h('button', { type: 'button', className: 'micro-growth-primary', onClick: function() { saveBook({ sweep: { variable: book.sweepVariable, conditions: conditions } }); } }, gt('sweep_run', 'Run variable sweep')),", `            h('button', { type: 'button', className: 'micro-growth-primary', onClick: function() {
              var result = G.saveSweep(book, { variable: book.sweepVariable, conditions: conditions });
              if (result.status === 'saved') upd({ growthInvestigation: result.notebook });
            } }, gt('sweep_run', 'Run variable sweep')),`);
edit("            h('p', { className: 'micro-growth-muted' }, gt('sweep_saved_note', 'The latest sweep is saved separately from your trial notebook. Download the notebook before running another sweep if you want to keep both.')),", "            h('p', { className: 'micro-growth-muted' }, gt('sweep_history_note', 'The current sweep and one distinct previous sweep are saved separately from your trials. Another distinct sweep replaces the older history; download the notebook to keep more.')),");

const directory = path.join(root, 'reports/micro-lab-evidence-review-2026-09-30/drafts');
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(directory, 'growth-source-edits.json'), JSON.stringify(edits, null, 2) + '\n');
fs.writeFileSync(path.join(directory, 'growth-source.preview.js'), source);
console.log(JSON.stringify({ edits: edits.length, preview: 'growth-source.preview.js' }));
