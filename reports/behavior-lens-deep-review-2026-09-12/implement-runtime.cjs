const fs=require('node:fs');
const p='behavior_lens_workspace_module.js';
let s=fs.readFileSync(p,'utf8');
function change(a,b){if(!s.includes(a))throw new Error('Missing anchor: '+a.slice(0,90));s=s.replace(a,b);}
change("            version: WORKSPACE_VERSION,",`            version: WORKSPACE_VERSION,
            isPracticeMode: source.isPracticeMode === true,
            practiceScenarioName: boundedText(source.practiceScenarioName, 240),
            practiceReturnStudent: boundedText(source.practiceReturnStudent, 240),`);
for(const [field,limit] of [['sessionNotes',500],['teamNotes',500],['sessionHistory',1000]])change(`source.${field}.slice(0, ${limit})`,`source.${field}.slice()`);
change("        var numeric = Number(value);\n        return Number.isFinite(numeric) && numeric >= -840", "        if (value == null || value === '' || typeof value === 'boolean') return null;\n        var numeric = Number(value);\n        return Number.isFinite(numeric) && numeric >= -840");
for(const field of ['abcEntries','observationSessions'])change(`(Array.isArray(values) ? values : []).slice(0, WORKSPACE_ARRAY_LIMITS.${field}).forEach`, '(Array.isArray(values) ? values : []).forEach');
change('    function summarizeExposure(observationSessions, options) {',`    function matchesObservationScope(item, options) {
        if (!item) return false;
        if (Object.prototype.hasOwnProperty.call(options, 'phase')) {
            var expected = boundedText(options.phase, 120) || 'Unassigned';
            if ((boundedText(item.phase, 120) || 'Unassigned') !== expected) return false;
        }
        if (options.behaviorId && item.behaviorId && item.behaviorId !== options.behaviorId) {
            var counters = item.data && item.data.counters;
            var matchingCounter = Array.isArray(counters) && counters.some(function (counter) {
                return counter.behaviorId === options.behaviorId || resolveCanonicalBehavior({ behavior: counter.label }, options.targetBehaviors).id === options.behaviorId;
            });
            if (!matchingCounter) return false;
        }
        return true;
    }

    function summarizeExposure(observationSessions, options) {`);
change("            if (options.phase && session && session.phase !== options.phase) return;\n            if (options.behaviorId && session && session.behaviorId && session.behaviorId !== options.behaviorId) return;", "            if (!matchesObservationScope(session, options)) return;");
change("            if (options.phase && entry && entry.phase !== options.phase) return false;\n            if (options.behaviorId && entry && entry.behaviorId !== options.behaviorId) return false;", "            if (!matchesObservationScope(entry, options)) return false;\n            if (options.behaviorId && entry && entry.behaviorId !== options.behaviorId) return false;");
const phaseStart=s.indexOf('    function summarizePhases('),phaseEnd=s.indexOf('    function inspectAbcData(',phaseStart);
s=s.slice(0,phaseStart)+`    function summarizePhases(entries, observationSessions, options) {
        options = options || {};
        var phases = Object.create(null);
        (Array.isArray(entries) ? entries : []).forEach(function (entry) {
            if (!matchesObservationScope(entry, options)) return;
            var phase = boundedText(entry && entry.phase, 120) || 'Unassigned';
            if (!phases[phase]) phases[phase] = [];
            phases[phase].push(entry);
        });
        (Array.isArray(observationSessions) ? observationSessions : []).forEach(function (session) {
            if (!matchesObservationScope(session, options)) return;
            var phase = boundedText(session && session.phase, 120) || 'Unassigned';
            if (!phases[phase]) phases[phase] = [];
        });
        return Object.keys(phases).map(function (phase) {
            var rate = calculateIncidentRate(phases[phase], observationSessions, Object.assign({}, options, { phase: phase }));
            return { phase: phase, count: phases[phase].length, intensity: summarizeIntensity(phases[phase]), rate: rate };
        }).sort(function (left, right) { return right.count - left.count; });
    }

`+s.slice(phaseEnd);
change("incompleteAbcCount: Math.max(issueCounts['missing-antecedent'] || 0, issueCounts['missing-behavior'] || 0, issueCounts['missing-consequence'] || 0)", "incompleteAbcCount: normalized.items.filter(function (entry) { return !entry.antecedent || !entry.behavior || !entry.consequence; }).length");
change('    function dataFingerprint(entries) {','    function dataFingerprint(entries, targetBehaviors) {');
change("return [entry && entry.id, entry && (entry.occurredAt || entry.timestamp), entry && entry.antecedentId, entry && entry.behaviorId, entry && entry.consequenceId, entry && normalizeIntensity(entry.intensity), entry && entry.phase];", "return [entry && entry.id, entry && (entry.occurredAt || entry.timestamp), entry && entry.antecedentId, entry && entry.behaviorId, entry && entry.consequenceId, entry && normalizeIntensity(entry.intensity), entry && entry.phase, entry && entry.antecedent, entry && entry.behavior, entry && entry.consequence, entry && entry.setting, entry && entry.notes, entry && entry.duration, entry && entry.timezoneOffset, entry && entry.localDate, entry && entry.observationSessionId];");
change("return 'bl-data-' + stableHash(relevant);", "return 'bl-data-' + stableHash([relevant, normalizeTargetBehaviors(targetBehaviors || [], []).sort(function (left, right) { return left.id.localeCompare(right.id); })]);");
change('function createAnalysisProvenance(entries, sample, now) {','function createAnalysisProvenance(entries, sample, now, targetBehaviors) {');
change('sourceFingerprint: dataFingerprint(values),','sourceFingerprint: dataFingerprint(values, targetBehaviors),');
change('function isAnalysisStale(analysis, entries) {','function isAnalysisStale(analysis, entries, targetBehaviors) {');
change('analysis.provenance.sourceFingerprint !== dataFingerprint(entries)', 'analysis.provenance.sourceFingerprint !== dataFingerprint(entries, targetBehaviors)');
change("            } else if (data[field].length > WORKSPACE_ARRAY_LIMITS[field]) {\n                errors.push(field + ' exceeds the limit of ' + WORKSPACE_ARRAY_LIMITS[field] + ' items.');", "            } else if (data[field].length > WORKSPACE_ARRAY_LIMITS[field]) {\n                if (['abcEntries', 'observationSessions', 'sessionHistory', 'sessionNotes', 'teamNotes'].includes(field)) {\n                    warnings.push(field + ' contains ' + data[field].length + ' records. All records will be retained; export regular backups for this large workspace.');\n                } else errors.push(field + ' exceeds the limit of ' + WORKSPACE_ARRAY_LIMITS[field] + ' items.');");
change('    function validateWorkspaceImport(data, options) {',`    // Parse complete records before splitting rows so quoted notes round-trip.
    function parseCsvRows(text) {
        text = String(text || '').replace(/^\\uFEFF/, '');
        var rows = [], row = [], field = '', quoted = false, closed = false;
        for (var index = 0; index < text.length; index += 1) {
            var char = text[index];
            if (quoted) {
                if (char === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
                else if (char === '"') { quoted = false; closed = true; }
                else field += char;
            } else if (char === ',' || char === '\\n' || char === '\\r') {
                row.push(field); field = ''; closed = false;
                if (char !== ',') {
                    if (char === '\\r' && text[index + 1] === '\\n') index += 1;
                    if (row.some(function (value) { return value.trim() !== ''; })) rows.push(row);
                    row = [];
                }
            } else if (char === '"') {
                if (field.trim() || closed) throw new Error('Unexpected quote in CSV field.');
                field = ''; quoted = true;
            } else {
                if (closed && char.trim()) throw new Error('Unexpected text after a quoted CSV field.');
                if (!closed) field += char;
            }
        }
        if (quoted) throw new Error('A quoted CSV field is not closed.');
        row.push(field);
        if (row.some(function (value) { return value.trim() !== ''; })) rows.push(row);
        return rows;
    }

    function validateWorkspaceImport(data, options) {`);
change('        validateWorkspaceImport: validateWorkspaceImport,','        parseCsvRows: parseCsvRows,\n        validateWorkspaceImport: validateWorkspaceImport,');
fs.writeFileSync(p,s);
console.log('Updated workspace integrity and analytics helpers');
