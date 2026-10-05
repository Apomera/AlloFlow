const fs = require('node:fs');
const vm = require('node:vm');
const edits = [];
function edit(old, next) { if (typeof old !== 'string' || typeof next !== 'string') throw Error('Edit strings required.'); edits.push({ old, new: next }); }
edit("    var measurementDraft = measurement.draft || { value: '', unit: 'um', context: measurementContext };", `    var measurementDraft = measurement.draft || { value: '', unit: 'um', context: measurementContext };
    var rawMeasurementBook = d.microscopeMeasurements;
    var rawMeasurement = rawMeasurementBook && typeof rawMeasurementBook === 'object' && !Array.isArray(rawMeasurementBook) ? rawMeasurementBook[organism] : null;
    var rawMeasurementDraft = rawMeasurement && typeof rawMeasurement === 'object' && !Array.isArray(rawMeasurement) && rawMeasurement.draft && typeof rawMeasurement.draft === 'object' && !Array.isArray(rawMeasurement.draft) ? rawMeasurement.draft : null;
    var workingConversion = MicroMeasurements.convertEstimate(rawMeasurementDraft && measurement.draft && typeof rawMeasurementDraft.value === 'string' ? rawMeasurementDraft.value : measurementDraft.value,
      rawMeasurementDraft && measurement.draft && typeof rawMeasurementDraft.value === 'string' ? rawMeasurementDraft.unit : measurementDraft.unit);
    var canConvertWorking = !!(rawMeasurementDraft && measurement.draft && typeof rawMeasurementDraft.value === 'string' && rawMeasurementDraft.value === measurementDraft.value && workingConversion.canConvert && typeof props.convertEstimate === 'function');`);
edit('    function checkMeasurement() {', `    function convertWorkingEstimate() {
      if (!canConvertWorking) return;
      cancelPreviousViewFocus();
      props.convertEstimate({ id: organism, draft: rawMeasurementDraft, value: rawMeasurementDraft.value, unit: rawMeasurementDraft.unit, context: rawMeasurementDraft.context, calibration: Object.assign({}, rawMeasurementDraft.context),
        view: { scopeOrganism: d.scopeOrganism, selectedScope: d.selectedScope, magnification: d.magnification, microscopeZoom: d.microscopeZoom } });
    }
    function checkMeasurement() {`);
edit("'aria-describedby': measurementId + '-feature ' + measurementId + '-readiness ' + measurementId + '-validation', 'aria-invalid':", "'aria-describedby': measurementId + '-feature ' + measurementId + '-readiness ' + measurementId + '-validation micro-measure-conversion-preview', 'aria-invalid':");
edit("hh('select', { 'aria-label': __alloMBT('stem.microbiology.measure_units', 'Estimate units'), value: measurementDraft.unit, onChange:", "hh('select', { 'aria-label': __alloMBT('stem.microbiology.measure_units', 'Estimate units'), 'aria-describedby': 'micro-measure-unit-choice-help micro-measure-conversion-preview', value: measurementDraft.unit, onChange:");
edit("        hh('p', { id: measurementId + '-validation', role: 'status', 'aria-live': 'polite',", `        hh('div', { id: 'micro-measure-conversion', style: { marginTop: 10, minWidth: 0, overflowWrap: 'anywhere', fontSize: 12, lineHeight: 1.7 } },
          hh('p', { id: 'micro-measure-unit-choice-help', style: { margin: '0 0 7px' } }, __alloMBT('stem.microbiology.measure_unit_choice_help', 'Choosing a unit keeps your entered number. Use Convert working estimate to express the same size in the other unit.')),
          hh('p', { id: 'micro-measure-conversion-preview', role: 'status', 'aria-live': 'polite', 'aria-atomic': true, style: { margin: '0 0 7px' } },
            workingConversion.estimateUm !== null && workingConversion.targetValue !== null
              ? __alloMBT('stem.microbiology.measure_conversion_preview', 'Equivalent size: {value} {unit} = {target} {targetUnit}. This conversion is unscored.')
                .replace('{value}', String(workingConversion.value)).replace('{unit}', workingConversion.unit === 'nm' ? 'nm' : 'µm')
                .replace('{target}', workingConversion.targetValue).replace('{targetUnit}', workingConversion.targetUnit === 'nm' ? 'nm' : 'µm')
              : __alloMBT('stem.microbiology.measure_conversion_invalid', 'Enter a valid working estimate to see its equivalent in the other unit.')),
          workingConversion.status === 'out-of-range' ? hh('p', { id: 'micro-measure-conversion-limits', style: { margin: '0 0 7px', color: microInk('#fbbf24') } },
            __alloMBT('stem.microbiology.measure_conversion_limits', 'This estimate cannot be converted within the entry limits. Keep the current unit or revise your estimate.')) : null,
          hh('button', { id: 'micro-measure-convert', type: 'button', disabled: !canConvertWorking, onClick: convertWorkingEstimate,
            'aria-describedby': 'micro-measure-conversion-preview micro-measure-conversion-scope' + (workingConversion.status === 'out-of-range' ? ' micro-measure-conversion-limits' : ''),
            style: Object.assign({}, buttonStyle, { minHeight: 44, maxWidth: '100%', whiteSpace: 'normal', overflowWrap: 'anywhere', opacity: canConvertWorking ? 1 : 0.6 }) },
            measurementDraft.unit === 'nm' ? __alloMBT('stem.microbiology.measure_conversion_to_um', 'Convert working estimate to micrometers') : __alloMBT('stem.microbiology.measure_conversion_to_nm', 'Convert working estimate to nanometers')),
          hh('p', { id: 'micro-measure-conversion-scope', style: { margin: '7px 0 0' } }, __alloMBT('stem.microbiology.measure_conversion_scope', 'Conversion keeps this estimate’s viewing context and checked results. Use Check and save estimate when you are ready to check it.'))),
        hh('p', { id: measurementId + '-validation', role: 'status', 'aria-live': 'polite',`);
edit('      // Annotation edits use the latest raw notebook and never persist its display projection.', `      function convertWorkingMeasurement(request) {
        if (!request || !request.draft || !request.view || !request.calibration || !Object.prototype.hasOwnProperty.call(MicroMeasurements.sizes, request.id)) return;
        __alloMBUpdateVersion++;
        setLabToolData(function(previous) {
          var current = previous && previous.microbiology;
          if (!current || current.tab !== 'microscope') return previous;
          var view = Object.assign({}, DEFAULT_MICROBIOLOGY_STATE, current);
          var active = Object.prototype.hasOwnProperty.call(MicroMeasurements.sizes, view.scopeOrganism) ? view.scopeOrganism : 'ecoli';
          if (active !== request.id || ['scopeOrganism', 'selectedScope', 'magnification', 'microscopeZoom'].some(function(key) { return view[key] !== request.view[key]; })) return previous;
          var book = current.microscopeMeasurements;
          if (!book || typeof book !== 'object' || Array.isArray(book)) return previous;
          var entry = book[request.id], draft = entry && entry.draft;
          if (!entry || typeof entry !== 'object' || Array.isArray(entry) || draft !== request.draft ||
              draft.value !== request.value || draft.unit !== request.unit || draft.context !== request.context ||
              ['version', 'specimen', 'method', 'mag', 'zoom', 'fieldUm', 'scaleUm', 'referenceUm'].some(function(key) { return draft.context[key] !== request.calibration[key]; })) return previous;
          var normalized = MicroMeasurements.normalize(book)[request.id];
          if (!normalized || !normalized.draft) return previous;
          var conversion = MicroMeasurements.convertEstimate(draft.value, draft.unit);
          if (!conversion.canConvert) return previous;
          var nextBook = Object.assign({}, book);
          nextBook[request.id] = Object.assign({}, entry, { draft: Object.assign({}, draft, { value: conversion.targetValue, unit: conversion.targetUnit }) });
          return Object.assign({}, previous, { microbiology: Object.assign({}, current, { microscopeMeasurements: nextBook }) });
        });
      }

      // Annotation edits use the latest raw notebook and never persist its display projection.`);
edit('h(VirtualMicroscope, { awardXP: awardXP, d: d, upd: upd, isDark: microbiologyDark })', 'h(VirtualMicroscope, { awardXP: awardXP, d: d, upd: upd, isDark: microbiologyDark, convertEstimate: convertWorkingMeasurement })');
let source = fs.readFileSync('stem_lab/stem_tool_microbiology.js', 'utf8');
for (const { old, new: next } of edits) {
  if (source.split(old).length !== 2) throw Error('Expected one source match: ' + old.slice(0, 90));
  source = source.replace(old, next);
}
new vm.Script(source);
fs.writeFileSync('reports/micro-lab-measurement-conversion-2026-10-01/drafts/conversion-ui-edits.json', JSON.stringify(edits, null, 2) + '\n');
console.log('Prepared ' + edits.length + ' unique UI edits.');
