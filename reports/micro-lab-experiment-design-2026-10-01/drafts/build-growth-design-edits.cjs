const fs = require('fs');
const path = require('path');
const root = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
let source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_microbiology.js'), 'utf8');
const eol = source.includes('\r\n') ? '\r\n' : '\n';
const edits = [];
function edit(before, after) {
  const old = before.replace(/\r?\n/g, eol), replacement = after.replace(/\r?\n/g, eol);
  if (source.split(old).length !== 2) throw new Error('Expected one match: ' + old.slice(0, 100));
  edits.push({ old, new: replacement });
  source = source.replace(old, replacement);
}

edit('    function compare(controlValues, trialValues) {', `    function designPreview(controlValues, trialValues) {
      var control = controlValues && typeof controlValues === 'object' && !Array.isArray(controlValues) ? normalizeConditions(controlValues) : null;
      var trial = normalizeConditions(trialValues);
      var changed = control ? conditionKeys.filter(function(key) { return control[key] !== trial[key]; }) : [];
      var held = control ? conditionKeys.filter(function(key) { return control[key] === trial[key]; }) : [];
      return Object.freeze({ control: control, trial: trial, changed: Object.freeze(changed), held: Object.freeze(held),
        design: !control ? 'unavailable' : changed.length === 0 ? 'none' : changed.length === 1 ? 'single' : 'confounded' });
    }
    function prepareSingleVariable(controlValues, trialValues, key) {
      if (conditionKeys.indexOf(key) < 0) return null;
      var preview = designPreview(controlValues, trialValues);
      if (!preview.control) return null;
      var prepared = Object.assign({}, preview.control);
      prepared[key] = preview.trial[key];
      return normalizeConditions(prepared);
    }
    function compare(controlValues, trialValues) {`);
edit('      saveSweep: saveSweep, restoreSweep: restoreSweep,', '      saveSweep: saveSweep, restoreSweep: restoreSweep, designPreview: designPreview, prepareSingleVariable: prepareSingleVariable,');
edit('  function MicroGrowthSweepHistory(props) {', `  function MicroGrowthDesignPreview(props) {
    var React = props.React, h = React.createElement, gt = props.translate, labels = props.labels;
    var preview = MicroGrowth.designPreview(props.control, props.conditions);
    var choiceState = React.useState(''), choice = choiceState[0], setChoice = choiceState[1];
    var selected = preview.changed.indexOf(choice) >= 0 ? choice : preview.changed[0] || '';
    var descriptorKey = JSON.stringify([preview.control, preview.trial]);
    function valueText(key, value) {
      return key === 'profile' ? MicroGrowth.profiles[value].label : value + (key === 'tempC' ? ' °C' : key === 'oxygen' ? '/100' : '');
    }
    function prepare(event) {
      var conditions = MicroGrowth.prepareSingleVariable(preview.control, preview.trial, selected);
      if (preview.design !== 'confounded' || !conditions) return;
      var owner = event.currentTarget.closest('[data-micro-growth]');
      var anchor = owner && owner.querySelector('#gl-design-preview');
      var expected = JSON.stringify([preview.control, conditions]);
      props.prepare(conditions);
      __alloMicroGrowthQueueFocus(owner, anchor, '#gl-design-heading', function(workspace, section) {
        return section.getAttribute('data-design-key') === expected;
      });
    }
    var summary = preview.design === 'unavailable' ? gt('design_need_control', 'Save a control to compare your proposed settings.') :
      preview.design === 'none' ? gt('design_none', 'No differences from the saved control.') :
      (preview.design === 'single' ? gt('design_one', 'One difference') : gt('design_many', 'Multiple differences')) + ': ' + preview.changed.map(function(key) { return labels[key]; }).join(', ') + '.';
    var guidance = preview.design === 'unavailable' ? gt('design_start', 'Use your starting settings as the control, then prepare the conditions you want to investigate.') :
      preview.design === 'none' ? gt('design_same_guidance', 'You can run an unchanged setup to compare it with the control, or change one setting.') :
      preview.design === 'confounded' ? gt('design_many_guidance', 'Several settings differ, so this comparison cannot isolate the effect of one setting. You can still run it, or prepare a comparison with one difference.') :
      preview.changed[0] === 'profile' ? gt('design_profile_guidance', 'The organism profile differs while temperature, pH, and oxygen availability are held constant. This compares profiles in the same modeled environment.') :
      gt('design_one_guidance', 'Only one setting differs. This helps you examine that setting within this model; it does not establish a cause in a real culture.');
    return h('section', { id: 'gl-design-preview', className: 'micro-growth-control', 'aria-labelledby': 'gl-design-heading', 'data-growth-design': preview.design, 'data-design-key': descriptorKey },
      h('h5', { id: 'gl-design-heading', tabIndex: -1, style: { fontSize: 15, margin: '0 0 8px' } }, gt('design_title', 'Compare the planned settings')),
      h('p', { id: 'gl-design-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': true }, summary),
      h('p', { id: 'gl-design-guidance', className: 'micro-growth-muted' }, guidance),
      h('div', { className: 'micro-growth-table-wrap', tabIndex: 0, role: 'region', 'aria-label': gt('design_scroll', 'Planned settings table, scroll horizontally if needed') },
        h('table', { id: 'gl-design-table' },
          h('caption', null, gt('design_table', 'Saved control and proposed trial settings')),
          h('thead', null, h('tr', null,
            h('th', { scope: 'col' }, gt('design_setting', 'Setting')),
            h('th', { scope: 'col' }, gt('design_control', 'Saved control')),
            h('th', { scope: 'col' }, gt('design_trial', 'Proposed trial')),
            h('th', { scope: 'col' }, gt('design_difference', 'Difference')))),
          h('tbody', null, ['profile', 'tempC', 'pH', 'oxygen'].map(function(key) {
            var changed = preview.changed.indexOf(key) >= 0;
            return h('tr', { key: key, 'data-design-setting': key },
              h('th', { scope: 'row' }, labels[key]),
              h('td', null, preview.control ? valueText(key, preview.control[key]) : gt('design_unsaved', 'Not saved')),
              h('td', null, valueText(key, preview.trial[key])),
              h('td', null, !preview.control ? gt('design_unavailable', 'Unavailable') : changed ? gt('design_changed', 'Changed') : gt('design_held', 'Held constant')));
          })))),
      preview.design === 'confounded' ? h('div', null,
        h('label', { htmlFor: 'gl-design-variable' }, gt('design_keep', 'Difference to keep')),
        h('select', { id: 'gl-design-variable', value: selected, 'aria-describedby': 'gl-design-prepare-note', onChange: function(event) { setChoice(event.target.value); } },
          preview.changed.map(function(key) { return h('option', { key: key, value: key }, labels[key]); })),
        h('p', { id: 'gl-design-prepare-note', className: 'micro-growth-muted' }, gt('design_prepare_note', 'Keep the chosen proposed setting and restore every other setting from your saved control. Your prediction, notes, and saved evidence stay as they are.')),
        h('button', { type: 'button', id: 'gl-design-prepare', 'aria-describedby': 'gl-design-prepare-note', onClick: prepare }, gt('design_prepare', 'Keep only this difference'))
      ) : null,
      h('p', { className: 'micro-growth-muted' }, gt('design_preview_note', 'This preview checks settings only. Choose your prediction before running to explore the modeled response.'))
    );
  }

  function MicroGrowthSweepHistory(props) {`);
edit("              h('p', { className: 'micro-growth-muted' }, gt('fixed', 'Both cultures start at 5 population units, with a capacity of 100. Duration and maximum modeled growth rate are held constant.'))", "              h(MicroGrowthDesignPreview, { React: React, control: book.control, conditions: conditions, labels: labels, translate: gt, prepare: setConditions }),\n              h('p', { className: 'micro-growth-muted' }, gt('fixed', 'Both cultures start at 5 population units, with a capacity of 100. Duration and maximum modeled growth rate are held constant.'))");

const directory = path.join(root, 'reports/micro-lab-experiment-design-2026-10-01/drafts');
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(directory, 'growth-design-edits.json'), JSON.stringify(edits, null, 2) + '\n');
fs.writeFileSync(path.join(directory, 'growth-design.preview.js'), source);
console.log(JSON.stringify({ edits: edits.length }));
