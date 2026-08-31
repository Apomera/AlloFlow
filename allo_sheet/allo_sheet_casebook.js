(function (root, factory) {
  'use strict';

  var api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root) {
    root.AlloSheetCasebook = api;
    root.AlloModules = root.AlloModules || {};
    root.AlloModules.AlloSheetCasebook = api;
  }
})(
  typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this),
  function () {
    'use strict';

    var KIND = 'alloflow.allosheet.casebook.v1';
    var VERSION = 1;
    var TABLE_IDS = Object.freeze({
      definition: 'casebook_definition',
      cases: 'casebook_cases',
      parameters: 'casebook_parameters',
      observations: 'casebook_observations'
    });
    var LIMITS = Object.freeze({
      maxCases: 200,
      maxParameters: 12,
      maxTitleChars: 120,
      maxCaseLabelChars: 40,
      maxCaseNameChars: 100,
      maxDescriptionChars: 500,
      maxParameterLabelChars: 80,
      maxUnitChars: 24,
      maxPromptChars: 180,
      maxNarrativeChars: 1200,
      maxInterpretationChars: 1200,
      maxAliases: 8
    });
    var PARAMETER_TYPES = Object.freeze(['number', 'text', 'category', 'boolean']);
    var PRIVACY_MODES = Object.freeze(['general', 'learner-support']);
    var BLOCKED_KEYS = Object.freeze(['__proto__', 'constructor', 'prototype']);
    var CONTROL_TEXT = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
    var NUMBER_TEXT = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
    var PARAMETER_RESERVED_KEYS = Object.freeze([
      'observation_id', 'case_id', 'observed_at', 'qualitative_note',
      'interpretation', 'capture_source'
    ]);

    var RAW_TEMPLATES = Object.freeze({
      aquarium: Object.freeze({
        title: 'Aquarium observation study',
        caseLabel: 'Tank',
        description: 'Track water conditions and observable specimen behavior over time.',
        privacyMode: 'general',
        cases: ['Tank 1', 'Tank 2'],
        parameters: [
          { key: 'p_temperature', label: 'Temperature', type: 'number', unit: '°F', minimum: 74, maximum: 82, prompt: 'Record the water temperature.', aliases: ['temperature', 'temp', 'degrees'] },
          { key: 'p_ph', label: 'pH', type: 'number', unit: '', minimum: 6.5, maximum: 8.5, prompt: 'Record the measured pH.', aliases: ['ph'] },
          { key: 'p_ammonia', label: 'Ammonia', type: 'number', unit: 'ppm', minimum: 0, maximum: 0.25, prompt: 'Record the ammonia reading.', aliases: ['ammonia'] },
          { key: 'p_nitrate', label: 'Nitrate', type: 'number', unit: 'ppm', minimum: 0, maximum: 40, prompt: 'Record the nitrate reading.', aliases: ['nitrate', 'nitrates'] },
          { key: 'p_activity', label: 'Activity', type: 'category', unit: '', minimum: null, maximum: null, prompt: 'Describe observable activity without assigning a cause.', aliases: ['activity', 'active', 'behavior'] }
        ]
      }),
      specimens: Object.freeze({
        title: 'Specimen observation study',
        caseLabel: 'Specimen',
        description: 'Collect repeatable measurements, observations, and interpretations across specimens.',
        privacyMode: 'general',
        cases: ['Specimen 1', 'Specimen 2'],
        parameters: [
          { key: 'p_length', label: 'Length', type: 'number', unit: 'cm', minimum: null, maximum: null, prompt: 'Measure length using the same method each time.', aliases: ['length', 'long'] },
          { key: 'p_mass', label: 'Mass', type: 'number', unit: 'g', minimum: null, maximum: null, prompt: 'Record measured mass.', aliases: ['mass', 'weight'] },
          { key: 'p_condition', label: 'Condition', type: 'category', unit: '', minimum: null, maximum: null, prompt: 'Describe visible condition using observable terms.', aliases: ['condition', 'appearance'] }
        ]
      }),
      learner_support: Object.freeze({
        title: 'Learner support observations',
        caseLabel: 'Learner',
        description: 'Keep time-stamped evidence about access, participation, supports, and learner goals.',
        privacyMode: 'learner-support',
        cases: ['Learner A', 'Learner B'],
        parameters: [
          { key: 'p_engagement', label: 'Engagement', type: 'category', unit: '', minimum: null, maximum: null, prompt: 'Describe observable engagement in context.', aliases: ['engagement', 'participation'] },
          { key: 'p_access', label: 'Access need', type: 'text', unit: '', minimum: null, maximum: null, prompt: 'Record the access barrier or need that was observed.', aliases: ['access', 'barrier', 'need'] },
          { key: 'p_support', label: 'Support used', type: 'text', unit: '', minimum: null, maximum: null, prompt: 'Record the support that was actually provided.', aliases: ['support', 'strategy', 'accommodation'] },
          { key: 'p_independence', label: 'Independence', type: 'category', unit: '', minimum: null, maximum: null, prompt: 'Describe the level of support used without ranking the learner.', aliases: ['independence', 'independent'] },
          { key: 'p_goal_evidence', label: 'Goal evidence', type: 'text', unit: '', minimum: null, maximum: null, prompt: 'Record concrete evidence connected to a learner-owned goal.', aliases: ['goal', 'evidence'] }
        ]
      })
    });

    function fail(message) {
      var error = new Error(message);
      error.code = 'allosheet-casebook-invalid';
      throw error;
    }

    function hasOwn(object, key) {
      return Object.prototype.hasOwnProperty.call(object, key);
    }

    function safeString(value, label, maximum, options) {
      options = options || {};
      var text = String(value == null ? '' : value);
      if (options.trim !== false) text = text.trim();
      if (options.required && !text) fail(label + ' is required.');
      if (text.length > maximum) fail(label + ' exceeds ' + maximum + ' characters.');
      if (CONTROL_TEXT.test(text)) fail(label + ' contains unsupported control text.');
      if (options.singleLine && /[\r\n]/.test(text)) fail(label + ' must be a single line.');
      return text;
    }

    function isPlainObject(value) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
      var prototype = Object.getPrototypeOf(value);
      return prototype === Object.prototype || prototype === null;
    }

    function strictNumber(value, label, allowBlank) {
      if (value === null || value === undefined || String(value).trim() === '') {
        if (allowBlank) return null;
        fail(label + ' must be a number.');
      }
      if (typeof value === 'number') {
        if (Number.isFinite(value)) return value;
        fail(label + ' must be a finite number.');
      }
      var text = String(value).trim();
      if (!NUMBER_TEXT.test(text)) fail(label + ' must be a number.');
      var result = Number(text);
      if (!Number.isFinite(result)) fail(label + ' must be a finite number.');
      return result;
    }

    function slug(value) {
      var text = String(value || '');
      try { text = text.normalize('NFKD'); } catch (_) {}
      return text.toLowerCase()
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 52);
    }

    function uniqueKey(label, requested, seen, index) {
      var raw = String(requested || '').trim().toLowerCase();
      var base = /^p_[a-z0-9][a-z0-9_]{0,59}$/.test(raw) ? raw : 'p_' + (slug(label) || ('parameter_' + (index + 1)));
      if (BLOCKED_KEYS.indexOf(base) >= 0 || PARAMETER_RESERVED_KEYS.indexOf(base) >= 0) {
        base = 'p_parameter_' + (index + 1);
      }
      var key = base;
      var suffix = 2;
      while (seen[key]) {
        key = base.slice(0, 58) + '_' + suffix;
        suffix += 1;
      }
      seen[key] = true;
      return key;
    }

    function normalizeAliases(input, label) {
      var aliases = Array.isArray(input) ? input : String(input || '').split('|');
      var seen = Object.create(null);
      var result = [];
      [label].concat(aliases).forEach(function (alias) {
        var clean = safeString(alias, 'Parameter alias', LIMITS.maxParameterLabelChars, { singleLine: true });
        if (!clean) return;
        var identity = clean.toLowerCase();
        if (seen[identity]) return;
        seen[identity] = true;
        result.push(clean);
      });
      return result.slice(0, LIMITS.maxAliases);
    }

    function normalizeParameter(input, index, seenKeys, seenLabels) {
      if (!isPlainObject(input)) fail('Parameter ' + (index + 1) + ' is invalid.');
      var label = safeString(input.label, 'Parameter ' + (index + 1) + ' name', LIMITS.maxParameterLabelChars, {
        required: true,
        singleLine: true
      });
      var labelIdentity = label.toLowerCase();
      if (seenLabels[labelIdentity]) fail('Parameter names must be unique.');
      seenLabels[labelIdentity] = true;
      var type = String(input.type || 'text').toLowerCase();
      if (PARAMETER_TYPES.indexOf(type) < 0) fail(label + ' uses an unsupported parameter type.');
      var unit = safeString(input.unit, label + ' unit', LIMITS.maxUnitChars, { singleLine: true });
      var minimum = type === 'number' ? strictNumber(input.minimum, label + ' expected minimum', true) : null;
      var maximum = type === 'number' ? strictNumber(input.maximum, label + ' expected maximum', true) : null;
      if (minimum !== null && maximum !== null && minimum > maximum) {
        fail(label + ' expected minimum must not be greater than its maximum.');
      }
      return {
        key: uniqueKey(label, input.key, seenKeys, index),
        label: label,
        type: type,
        unit: unit,
        minimum: minimum,
        maximum: maximum,
        prompt: safeString(input.prompt, label + ' prompt', LIMITS.maxPromptChars),
        aliases: normalizeAliases(input.aliases, label)
      };
    }

    function normalizeCases(input) {
      var values = Array.isArray(input) ? input : String(input || '').replace(/\r\n?/g, '\n').split('\n');
      var seen = Object.create(null);
      var result = [];
      values.forEach(function (value) {
        var name = safeString(value, 'Case name', LIMITS.maxCaseNameChars, { singleLine: true });
        if (!name) return;
        var identity = name.toLowerCase();
        if (seen[identity]) fail('Case names must be unique.');
        seen[identity] = true;
        result.push(name);
      });
      if (!result.length) fail('Add at least one case.');
      if (result.length > LIMITS.maxCases) fail('A casebook may contain at most ' + LIMITS.maxCases + ' cases.');
      return result;
    }

    function normalizeDefinition(input) {
      if (!isPlainObject(input)) fail('The casebook definition is invalid.');
      var privacyMode = String(input.privacyMode || 'general');
      if (PRIVACY_MODES.indexOf(privacyMode) < 0) privacyMode = 'general';
      if (!Array.isArray(input.parameters) || !input.parameters.length) fail('Add at least one parameter.');
      if (input.parameters.length > LIMITS.maxParameters) {
        fail('A casebook may contain at most ' + LIMITS.maxParameters + ' parameters.');
      }
      var seenKeys = Object.create(null);
      var seenLabels = Object.create(null);
      return {
        kind: KIND,
        version: VERSION,
        title: safeString(input.title, 'Casebook title', LIMITS.maxTitleChars, { required: true, singleLine: true }),
        caseLabel: safeString(input.caseLabel, 'Case label', LIMITS.maxCaseLabelChars, { required: true, singleLine: true }),
        description: safeString(input.description, 'Casebook description', LIMITS.maxDescriptionChars),
        privacyMode: privacyMode,
        cases: normalizeCases(input.cases),
        parameters: input.parameters.map(function (parameter, index) {
          return normalizeParameter(parameter, index, seenKeys, seenLabels);
        })
      };
    }

    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    function getTemplate(id) {
      if (!hasOwn(RAW_TEMPLATES, id)) fail('Choose a supported casebook starter.');
      return clone(RAW_TEMPLATES[id]);
    }

    function detail(key, label, type) {
      return { key: key, label: label, type: type || 'text' };
    }

    function observationParameterLabel(parameter, index) {
      var display = parameter.label + (parameter.unit ? ' (' + parameter.unit + ')' : '');
      display = display.replace(/[\/\\]+/g, ' per ').replace(/\s+/g, ' ').trim();
      return 'Measure ' + (index + 1) + ': ' + display;
    }

    function makeFields(details, values) {
      var fields = Object.create(null);
      details.forEach(function (column) {
        fields[column.label] = hasOwn(values, column.key) ? values[column.key] : '';
      });
      return fields;
    }

    function makeTable(id, title, details, rows) {
      return {
        id: id,
        title: title,
        columns: details.map(function (column) { return column.label; }),
        columnDetails: details,
        records: rows,
        fileName: slug(title) + '.csv',
        savePoint: null,
        dirty: true,
        sourceModified: true,
        sourceRowCount: rows.length,
        truncated: false
      };
    }

    function buildTables(input, createdAt) {
      var definition = normalizeDefinition(input);
      var timestamp = String(createdAt || new Date().toISOString());
      if (!Number.isFinite(Date.parse(timestamp))) fail('The casebook creation time is invalid.');
      timestamp = new Date(timestamp).toISOString();
      var definitionDetails = [
        detail('schema_kind', 'Schema kind'),
        detail('schema_version', 'Schema version', 'number'),
        detail('title', 'Casebook title'),
        detail('case_label', 'Case label'),
        detail('description', 'Description'),
        detail('privacy_mode', 'Privacy mode', 'category'),
        detail('created_at', 'Created at', 'datetime')
      ];
      var caseDetails = [
        detail('case_id', 'Case ID'),
        detail('case_name', definition.caseLabel + ' name'),
        detail('status', 'Status', 'category'),
        detail('context', 'Context')
      ];
      var parameterDetails = [
        detail('parameter_key', 'Parameter key'),
        detail('label', 'Parameter name'),
        detail('type', 'Value type', 'category'),
        detail('unit', 'Unit'),
        detail('expected_minimum', 'Expected minimum', 'number'),
        detail('expected_maximum', 'Expected maximum', 'number'),
        detail('prompt', 'Observation prompt'),
        detail('aliases', 'Recognition aliases')
      ];
      var observationDetails = [
        detail('observation_id', 'Observation ID'),
        detail('case_id', 'Case ID'),
        detail('observed_at', 'Observed at', 'datetime')
      ].concat(definition.parameters.map(function (parameter, index) {
        return detail(
          parameter.key,
          observationParameterLabel(parameter, index),
          parameter.type === 'category' ? 'category' : parameter.type
        );
      })).concat([
        detail('qualitative_note', 'Qualitative note'),
        detail('interpretation', 'Human interpretation'),
        detail('capture_source', 'Capture source', 'category')
      ]);

      return [
        makeTable(TABLE_IDS.definition, 'Casebook definition', definitionDetails, [{
          id: 'definition',
          fields: makeFields(definitionDetails, {
            schema_kind: KIND,
            schema_version: VERSION,
            title: definition.title,
            case_label: definition.caseLabel,
            description: definition.description,
            privacy_mode: definition.privacyMode,
            created_at: timestamp
          })
        }]),
        makeTable(TABLE_IDS.cases, definition.caseLabel + ' cases', caseDetails, definition.cases.map(function (name, index) {
          return {
            id: 'C' + String(index + 1).padStart(3, '0'),
            fields: makeFields(caseDetails, {
              case_id: 'C' + String(index + 1).padStart(3, '0'),
              case_name: name,
              status: 'Active',
              context: ''
            })
          };
        })),
        makeTable(TABLE_IDS.parameters, 'Observation parameters', parameterDetails, definition.parameters.map(function (parameter) {
          return {
            id: parameter.key,
            fields: makeFields(parameterDetails, {
              parameter_key: parameter.key,
              label: parameter.label,
              type: parameter.type,
              unit: parameter.unit,
              expected_minimum: parameter.minimum,
              expected_maximum: parameter.maximum,
              prompt: parameter.prompt,
              aliases: parameter.aliases.join('|')
            })
          };
        })),
        makeTable(TABLE_IDS.observations, 'Observations', observationDetails, [])
      ];
    }

    function tableColumnMap(table) {
      var result = Object.create(null);
      (table && table.columnDetails || []).forEach(function (column) {
        result[String(column.key)] = String(column.label);
      });
      return result;
    }

    function requiredTable(tables, id) {
      return (tables || []).find(function (table) { return table && table.id === id; }) || null;
    }

    function fieldByKey(table, record, key) {
      var label = tableColumnMap(table)[key];
      return label && record && record.fields ? record.fields[label] : undefined;
    }

    function requireKeys(table, keys) {
      var map = tableColumnMap(table);
      return keys.every(function (key) { return !!map[key]; });
    }

    function inspectTables(tables) {
      try {
        var definitionTable = requiredTable(tables, TABLE_IDS.definition);
        var casesTable = requiredTable(tables, TABLE_IDS.cases);
        var parametersTable = requiredTable(tables, TABLE_IDS.parameters);
        var observationsTable = requiredTable(tables, TABLE_IDS.observations);
        if (!definitionTable || !casesTable || !parametersTable || !observationsTable) return null;
        if (!requireKeys(definitionTable, ['schema_kind', 'schema_version', 'title', 'case_label', 'description', 'privacy_mode'])) return null;
        if (!requireKeys(casesTable, ['case_id', 'case_name', 'status', 'context'])) return null;
        if (!requireKeys(parametersTable, ['parameter_key', 'label', 'type', 'unit', 'expected_minimum', 'expected_maximum', 'prompt', 'aliases'])) return null;
        if (!requireKeys(observationsTable, ['observation_id', 'case_id', 'observed_at', 'qualitative_note', 'interpretation', 'capture_source'])) return null;
        var definitionRecord = definitionTable.records && definitionTable.records[0];
        if (!definitionRecord || fieldByKey(definitionTable, definitionRecord, 'schema_kind') !== KIND) return null;
        if (Number(fieldByKey(definitionTable, definitionRecord, 'schema_version')) !== VERSION) return null;
        var caseItems = (casesTable.records || []).map(function (record) {
          return {
            id: safeString(fieldByKey(casesTable, record, 'case_id'), 'Case ID', 120, { required: true, singleLine: true }),
            name: safeString(fieldByKey(casesTable, record, 'case_name'), 'Case name', LIMITS.maxCaseNameChars, { required: true, singleLine: true }),
            status: safeString(fieldByKey(casesTable, record, 'status'), 'Case status', 80, { singleLine: true }),
            context: safeString(fieldByKey(casesTable, record, 'context'), 'Case context', LIMITS.maxNarrativeChars)
          };
        });
        var parameterInputs = (parametersTable.records || []).map(function (record) {
          return {
            key: fieldByKey(parametersTable, record, 'parameter_key'),
            label: fieldByKey(parametersTable, record, 'label'),
            type: fieldByKey(parametersTable, record, 'type'),
            unit: fieldByKey(parametersTable, record, 'unit'),
            minimum: fieldByKey(parametersTable, record, 'expected_minimum'),
            maximum: fieldByKey(parametersTable, record, 'expected_maximum'),
            prompt: fieldByKey(parametersTable, record, 'prompt'),
            aliases: String(fieldByKey(parametersTable, record, 'aliases') || '').split('|')
          };
        });
        var normalized = normalizeDefinition({
          title: fieldByKey(definitionTable, definitionRecord, 'title'),
          caseLabel: fieldByKey(definitionTable, definitionRecord, 'case_label'),
          description: fieldByKey(definitionTable, definitionRecord, 'description'),
          privacyMode: fieldByKey(definitionTable, definitionRecord, 'privacy_mode'),
          cases: caseItems.map(function (item) { return item.name; }),
          parameters: parameterInputs
        });
        var knownCases = Object.create(null);
        caseItems.forEach(function (item) { knownCases[item.id] = true; });
        var observationMap = tableColumnMap(observationsTable);
        if (!normalized.parameters.every(function (parameter) { return !!observationMap[parameter.key]; })) return null;
        var observations = (observationsTable.records || []).map(function (record) {
          var caseId = String(fieldByKey(observationsTable, record, 'case_id') || '');
          var values = Object.create(null);
          normalized.parameters.forEach(function (parameter) {
            values[parameter.key] = coerceValue(
              parameter,
              fieldByKey(observationsTable, record, parameter.key)
            );
          });
          return {
            id: String(fieldByKey(observationsTable, record, 'observation_id') || record.id || ''),
            caseId: caseId,
            orphaned: !knownCases[caseId],
            observedAt: String(fieldByKey(observationsTable, record, 'observed_at') || ''),
            values: values,
            note: String(fieldByKey(observationsTable, record, 'qualitative_note') || ''),
            interpretation: String(fieldByKey(observationsTable, record, 'interpretation') || ''),
            source: String(fieldByKey(observationsTable, record, 'capture_source') || '')
          };
        });
        return {
          definition: normalized,
          cases: caseItems,
          parameters: normalized.parameters,
          observations: observations,
          tables: {
            definition: definitionTable,
            cases: casesTable,
            parameters: parametersTable,
            observations: observationsTable
          }
        };
      } catch (_) {
        return null;
      }
    }

    function escapeRegExp(value) {
      return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function exactPhraseRanges(narrative, phrase) {
      var ranges = [];
      var pattern = new RegExp(
        '(^|[^\\p{L}\\p{N}_])(' + escapeRegExp(phrase) + ')(?=$|[^\\p{L}\\p{N}_])',
        'giu'
      );
      var match;
      while ((match = pattern.exec(narrative)) !== null) {
        var start = match.index + match[1].length;
        ranges.push({ start: start, end: start + match[2].length });
        if (pattern.lastIndex === match.index) pattern.lastIndex += 1;
      }
      return ranges;
    }

    function findCaseMentions(value, cases) {
      if (typeof value !== 'string') fail('Observation narrative is invalid.');
      var narrative = safeString(value, 'Observation narrative', LIMITS.maxNarrativeChars, {
        required: true,
        trim: true
      });
      if (!Array.isArray(cases)) fail('Case list is unavailable.');
      if (cases.length > LIMITS.maxCases) fail('Case list exceeds ' + LIMITS.maxCases + ' cases.');

      var entries = cases.map(function (caseItem, index) {
        if (!isPlainObject(caseItem)) fail('Case ' + (index + 1) + ' is invalid.');
        return {
          caseItem: caseItem,
          index: index,
          id: safeString(caseItem.id, 'Case ID', 120, { required: true, singleLine: true }),
          name: safeString(caseItem.name, 'Case name', LIMITS.maxCaseNameChars, {
            required: true,
            singleLine: true
          })
        };
      });
      var candidates = [];
      entries.forEach(function (entry) {
        var seenPhrases = Object.create(null);
        [
          { phrase: entry.name, kind: 'name' },
          { phrase: entry.id, kind: 'id' }
        ].forEach(function (candidate) {
          var phrase = candidate.phrase;
          if (candidate.kind === 'name' && Array.from(phrase.trim()).length < 2) return;
          var identity = phrase.toLowerCase();
          if (seenPhrases[identity]) return;
          seenPhrases[identity] = true;
          candidates.push({ entry: entry, phrase: phrase });
        });
      });
      candidates.sort(function (a, b) {
        return b.phrase.length - a.phrase.length || a.entry.index - b.entry.index;
      });

      var claimedRanges = [];
      var matchedEntries = [];
      candidates.forEach(function (candidate) {
        exactPhraseRanges(narrative, candidate.phrase).forEach(function (range) {
          var overlaps = claimedRanges.some(function (claimed) {
            return range.start < claimed.end && claimed.start < range.end;
          });
          if (overlaps) return;
          claimedRanges.push(range);
          if (!matchedEntries.some(function (entry) { return entry.caseItem === candidate.entry.caseItem; })) {
            matchedEntries.push(candidate.entry);
          }
        });
      });
      return matchedEntries.sort(function (a, b) {
        return b.name.length - a.name.length || a.index - b.index;
      }).map(function (entry) { return entry.caseItem; });
    }

    function findParameterPhrase(narrative, parameter) {
      var aliases = parameter.aliases.slice().sort(function (a, b) { return b.length - a.length; });
      var alternation = aliases.map(escapeRegExp).join('|');
      if (!alternation) return null;
      if (parameter.type === 'number') {
        var numberPattern = new RegExp('(?:^|\\b)(?:' + alternation + ')\\s*(?:(?:is|was|at)\\s*)?(?:=|:)?\\s*([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[+-]?\\d+)?)', 'i');
        var numberMatch = numberPattern.exec(narrative);
        if (numberMatch) return { value: Number(numberMatch[1]), text: numberMatch[0].trim() };
        if (/^°[FC]$/i.test(parameter.unit)) {
          var degreePattern = /(?:^|\b)(?:at\s+)?([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*(?:°\s*[fc]|degrees?(?:\s+(?:fahrenheit|celsius))?)/i;
          var degreeMatch = degreePattern.exec(narrative);
          if (degreeMatch) return { value: Number(degreeMatch[1]), text: degreeMatch[0].trim() };
        }
        return null;
      }
      if (parameter.type === 'boolean') {
        var booleanPattern = new RegExp('(?:^|\\b)(?:' + alternation + ')\\s*(?:(?:is|was)\\s*)?(?:=|:)?\\s*(yes|no|true|false|present|absent)', 'i');
        var booleanMatch = booleanPattern.exec(narrative);
        if (!booleanMatch) return null;
        return {
          value: /^(?:yes|true|present)$/i.test(booleanMatch[1]),
          text: booleanMatch[0].trim()
        };
      }
      var textPattern = new RegExp('(?:^|\\b)(?:' + alternation + ')\\s*(?:(?:is|was)\\s*)?(?:=|:)\\s*([^,;.]+)', 'i');
      var textMatch = textPattern.exec(narrative);
      if (!textMatch) return null;
      return { value: textMatch[1].trim(), text: textMatch[0].trim() };
    }

    function rangeWarning(parameter, value) {
      if (parameter.type !== 'number' || typeof value !== 'number') return '';
      if (parameter.minimum !== null && value < parameter.minimum) {
        return parameter.label + ' is below the expected context entered for this casebook. Verify the reading before interpreting it.';
      }
      if (parameter.maximum !== null && value > parameter.maximum) {
        return parameter.label + ' is above the expected context entered for this casebook. Verify the reading before interpreting it.';
      }
      return '';
    }

    function parseNarrative(value, parameters, options) {
      options = options || {};
      var narrative = safeString(value, 'Observation narrative', LIMITS.maxNarrativeChars, { required: true, trim: true });
      var normalizedParameters;
      if (Array.isArray(parameters) && parameters.every(function (parameter) {
        return parameter && parameter.key && parameter.label && parameter.type;
      })) {
        normalizedParameters = parameters;
      } else {
        fail('Observation parameters are unavailable.');
      }
      var values = Object.create(null);
      var matched = [];
      var missing = [];
      var warnings = [];
      normalizedParameters.forEach(function (parameter) {
        var result = findParameterPhrase(narrative, parameter);
        if (!result || result.value === '' || result.value === null || Number.isNaN(result.value)) {
          values[parameter.key] = null;
          missing.push(parameter.key);
          return;
        }
        values[parameter.key] = result.value;
        matched.push({ key: parameter.key, text: result.text });
        var warning = rangeWarning(parameter, result.value);
        if (warning) warnings.push(warning);
      });
      if (!matched.length) {
        warnings.push('No parameter values were recognized automatically. The full narrative is preserved; complete any structured fields during review.');
      }
      return {
        values: values,
        note: narrative,
        interpretation: '',
        source: options.source === 'voice' ? 'voice transcript' : options.source === 'mixed' ? 'typed + voice transcript' : 'typed',
        matched: matched,
        missing: missing,
        warnings: warnings
      };
    }

    function coerceValue(parameter, value) {
      if (value === null || value === undefined || String(value).trim() === '') return null;
      if (parameter.type === 'number') return strictNumber(value, parameter.label, false);
      if (parameter.type === 'boolean') {
        if (typeof value === 'boolean') return value;
        if (/^(?:yes|true|present|1)$/i.test(String(value).trim())) return true;
        if (/^(?:no|false|absent|0)$/i.test(String(value).trim())) return false;
        fail(parameter.label + ' must be yes or no.');
      }
      return safeString(value, parameter.label, LIMITS.maxNarrativeChars, { trim: true });
    }

    function nextId(records, prefix) {
      var maximum = 0;
      (records || []).forEach(function (record) {
        var match = new RegExp('^' + escapeRegExp(prefix) + '(\\d+)$', 'i').exec(String(record && record.id || ''));
        if (match) maximum = Math.max(maximum, Number(match[1]) || 0);
      });
      return prefix + String(maximum + 1).padStart(3, '0');
    }

    function createObservation(book, input) {
      if (!book || !book.definition || !book.tables || !book.tables.observations) fail('Open a valid casebook first.');
      if (!isPlainObject(input)) fail('The observation draft is invalid.');
      var caseId = safeString(input.caseId, 'Case', 120, { required: true, singleLine: true });
      if (!book.cases.some(function (item) { return item.id === caseId; })) fail('Choose a valid case.');
      var timestamp = String(input.observedAt || '');
      if (!Number.isFinite(Date.parse(timestamp))) fail('Choose a valid observation date and time.');
      timestamp = new Date(timestamp).toISOString();
      var values = Object.create(null);
      book.parameters.forEach(function (parameter) {
        values[parameter.key] = coerceValue(parameter, input.values && input.values[parameter.key]);
      });
      var note = safeString(input.note, 'Qualitative note', LIMITS.maxNarrativeChars, { trim: true });
      var interpretation = safeString(input.interpretation, 'Human interpretation', LIMITS.maxInterpretationChars, { trim: true });
      if (!note && !interpretation && !book.parameters.some(function (parameter) { return values[parameter.key] !== null; })) {
        fail('Record at least one parameter, note, or interpretation.');
      }
      var source = safeString(input.source || 'typed', 'Capture source', 40, { required: true, singleLine: true });
      if (['typed', 'voice transcript', 'typed + voice transcript'].indexOf(source) < 0) source = 'typed';
      var table = book.tables.observations;
      var map = tableColumnMap(table);
      var observationId = nextId(table.records, 'O');
      var keyed = {
        observation_id: observationId,
        case_id: caseId,
        observed_at: timestamp,
        qualitative_note: note,
        interpretation: interpretation,
        capture_source: source
      };
      book.parameters.forEach(function (parameter) { keyed[parameter.key] = values[parameter.key]; });
      var fields = Object.create(null);
      Object.keys(map).forEach(function (key) {
        fields[map[key]] = hasOwn(keyed, key) ? keyed[key] : null;
      });
      return { id: observationId, fields: fields };
    }

    function createCase(book, name) {
      if (!book || !book.tables || !book.tables.cases) fail('Open a valid casebook first.');
      if (book.cases.length >= LIMITS.maxCases) fail('This casebook already contains ' + LIMITS.maxCases + ' cases.');
      var cleanName = safeString(name, 'Case name', LIMITS.maxCaseNameChars, { required: true, singleLine: true });
      if (book.cases.some(function (item) { return item.name.toLowerCase() === cleanName.toLowerCase(); })) {
        fail('Case names must be unique.');
      }
      var table = book.tables.cases;
      var map = tableColumnMap(table);
      var id = nextId(table.records, 'C');
      var keyed = { case_id: id, case_name: cleanName, status: 'Active', context: '' };
      var fields = Object.create(null);
      Object.keys(map).forEach(function (key) { fields[map[key]] = hasOwn(keyed, key) ? keyed[key] : ''; });
      return { id: id, fields: fields };
    }

    function createCaseContextUpdate(book, caseId, context) {
      if (!book || !book.definition || !book.tables || !book.tables.cases || !Array.isArray(book.cases)) {
        fail('Open a valid casebook first.');
      }
      var cleanCaseId = safeString(caseId, 'Case', 120, { required: true, singleLine: true });
      if (!book.cases.some(function (item) { return item.id === cleanCaseId; })) fail('Choose a valid case.');
      var cleanContext = safeString(context, 'Case context', LIMITS.maxNarrativeChars, { trim: true });
      var table = book.tables.cases;
      var contextLabel = tableColumnMap(table).context;
      if (!contextLabel) fail('The case context column is unavailable.');
      var record = (table.records || []).find(function (item) {
        return fieldByKey(table, item, 'case_id') === cleanCaseId;
      });
      if (!record || !isPlainObject(record.fields)) fail('The case record is unavailable.');
      var fields = Object.create(null);
      Object.keys(record.fields).forEach(function (label) { fields[label] = record.fields[label]; });
      fields[contextLabel] = cleanContext;
      return { id: record.id, fields: fields };
    }

    function valueMissing(value) {
      return value === null || value === undefined || String(value).trim() === '';
    }

    function valueText(parameter, value) {
      if (valueMissing(value)) return 'Not recorded';
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      return String(value) + (parameter && parameter.unit ? ' ' + parameter.unit : '');
    }

    function caseTimeline(book, caseId) {
      if (!book || !Array.isArray(book.observations)) return [];
      return book.observations.filter(function (observation) {
        return observation.caseId === caseId;
      }).slice().sort(function (a, b) {
        var aTime = Date.parse(a.observedAt);
        var bTime = Date.parse(b.observedAt);
        if (!Number.isFinite(aTime)) aTime = 0;
        if (!Number.isFinite(bTime)) bTime = 0;
        return bTime - aTime || String(b.id).localeCompare(String(a.id));
      });
    }

    function comparisonStatus(parameter, value) {
      if (valueMissing(value)) return 'Not recorded';
      if (parameter.type !== 'number' || typeof value !== 'number') return 'Recorded';
      if (parameter.minimum !== null && value < parameter.minimum) return 'Below expected context';
      if (parameter.maximum !== null && value > parameter.maximum) return 'Above expected context';
      if (parameter.minimum !== null || parameter.maximum !== null) return 'Within expected context';
      return 'Recorded';
    }

    function buildComparison(book, parameterKey) {
      var parameter = book && book.parameters && book.parameters.find(function (item) { return item.key === parameterKey; });
      if (!parameter) fail('Choose a valid comparison parameter.');
      return {
        parameter: parameter,
        rows: book.cases.map(function (caseItem) {
          var latest = caseTimeline(book, caseItem.id).find(function (observation) {
            return !valueMissing(observation.values[parameter.key]);
          }) || null;
          var value = latest ? latest.values[parameter.key] : null;
          return {
            caseId: caseItem.id,
            caseName: caseItem.name,
            observedAt: latest ? latest.observedAt : '',
            value: value,
            displayValue: valueText(parameter, value),
            status: comparisonStatus(parameter, value)
          };
        })
      };
    }

    function requireBookCaseParameter(book, caseId, parameterKey) {
      if (!book || !book.definition || !Array.isArray(book.cases)
        || !Array.isArray(book.parameters) || !Array.isArray(book.observations)) {
        fail('Open a valid casebook first.');
      }
      var cleanCaseId = safeString(caseId, 'Case', 120, { required: true, singleLine: true });
      var cleanParameterKey = safeString(parameterKey, 'Parameter', 120, { required: true, singleLine: true });
      var caseItem = book.cases.find(function (item) {
        return item && item.id === cleanCaseId;
      });
      if (!caseItem) fail('Choose a valid case.');
      var parameter = book.parameters.find(function (item) {
        return item && item.key === cleanParameterKey;
      });
      if (!parameter) fail('Choose a valid parameter.');
      return { caseItem: caseItem, parameter: parameter };
    }

    function publicParameter(parameter) {
      return {
        key: parameter.key,
        label: parameter.label,
        type: parameter.type,
        unit: parameter.unit,
        minimum: parameter.minimum,
        maximum: parameter.maximum
      };
    }

    function buildParameterHistory(book, caseId, parameterKey) {
      var selected = requireBookCaseParameter(book, caseId, parameterKey);
      var parameter = selected.parameter;
      var observations = book.observations.filter(function (observation) {
        return observation && observation.caseId === selected.caseItem.id;
      });
      var missingValueCount = 0;
      var undatedValueCount = 0;
      var points = [];

      observations.forEach(function (observation, index) {
        var values = observation && isPlainObject(observation.values) ? observation.values : Object.create(null);
        var value = values[parameter.key];
        if (valueMissing(value)) {
          missingValueCount += 1;
          return;
        }
        var timestamp = Date.parse(observation.observedAt);
        if (!Number.isFinite(timestamp)) {
          undatedValueCount += 1;
          return;
        }
        points.push({
          observationId: String(observation.id == null ? '' : observation.id),
          observedAt: String(observation.observedAt),
          value: value,
          displayValue: valueText(parameter, value),
          _timestamp: timestamp,
          _index: index
        });
      });

      points.sort(function (a, b) {
        return a._timestamp - b._timestamp
          || a.observationId.localeCompare(b.observationId)
          || a._index - b._index;
      });
      points = points.map(function (point) {
        return {
          observationId: point.observationId,
          observedAt: point.observedAt,
          value: point.value,
          displayValue: point.displayValue
        };
      });

      var firstPoint = points[0] || null;
      var latestPoint = points.length ? points[points.length - 1] : null;
      var firstToLatest = { kind: 'none', difference: null };
      if (points.length === 1) {
        firstToLatest.kind = 'single';
      } else if (points.length > 1) {
        var firstValue = firstPoint.value;
        var latestValue = latestPoint.value;
        if (typeof firstValue === 'number' && Number.isFinite(firstValue)
          && typeof latestValue === 'number' && Number.isFinite(latestValue)) {
          firstToLatest.difference = latestValue - firstValue;
          firstToLatest.kind = firstToLatest.difference === 0
            ? 'same'
            : firstToLatest.difference > 0 ? 'higher' : 'lower';
        } else {
          firstToLatest.kind = String(firstValue) === String(latestValue) ? 'same' : 'changed';
        }
      }

      var numericValues = points.map(function (point) { return point.value; }).filter(function (value) {
        return typeof value === 'number' && Number.isFinite(value);
      });
      var numericRange = numericValues.length ? {
        min: Math.min.apply(Math, numericValues),
        max: Math.max.apply(Math, numericValues)
      } : null;

      return {
        case: { id: selected.caseItem.id, name: selected.caseItem.name },
        parameter: publicParameter(parameter),
        totalObservationCount: observations.length,
        missingValueCount: missingValueCount,
        undatedValueCount: undatedValueCount,
        points: points,
        firstPoint: firstPoint,
        latestPoint: latestPoint,
        firstToLatest: firstToLatest,
        numericRange: numericRange
      };
    }

    function buildAgentReflectionRequest(book, caseId, goal) {
      if (!book || !book.definition || !Array.isArray(book.cases) || !Array.isArray(book.observations)) {
        fail('Open a valid casebook first.');
      }
      var cleanCaseId = safeString(caseId, 'Case', 120, { required: true, singleLine: true });
      if (!book.cases.some(function (item) { return item && item.id === cleanCaseId; })) {
        fail('Choose a valid case.');
      }
      if (goal !== 'brainstorm' && goal !== 'feedback') {
        fail('Choose a valid agent reflection goal.');
      }
      var timeline = caseTimeline(book, cleanCaseId);
      if (!timeline.length) fail('Record an observation before preparing an agent reflection.');

      var recordLimit = goal === 'brainstorm' ? 3 : 1;
      var recordIds = timeline.slice(0, recordLimit).map(function (observation) {
        return String(observation.id == null ? '' : observation.id);
      });
      var task = goal === 'brainstorm'
        ? 'Brainstorm 3–5 low-risk, observable next observations or questions. For each, state what it could check and one limitation.'
        : 'Give neutral feedback on specificity, observability, repeatability, missing context, and evidence versus interpretation. Phrase suggestions for future observations only.';
      var rules = [
        'Review only the selected observation rows.',
        task,
        'Treat parameter values and the Qualitative note as recorded evidence. Treat Human interpretation as a hypothesis, not fact.',
        'Identify support, gaps, and limitations. Do not infer causes or hidden traits.',
        'Return explanation only with an empty changes array. Do not rewrite cells.'
      ];
      if (book.definition.privacyMode === 'learner-support') {
        rules.push('Preserve individual agency. Do not infer diagnosis, disability, placement, grade, ability, motivation, risk, or ranking.');
      }
      var instruction = rules.join(' ');
      if (instruction.length > 800) fail('The agent reflection instruction exceeds 800 characters.');
      return { goal: goal, recordIds: recordIds, instruction: instruction };
    }

    function buildReflections(book, caseId) {
      var timeline = caseTimeline(book, caseId);
      if (!timeline.length) {
        return ['What will make the first observation specific, observable, and repeatable?'];
      }
      var latest = timeline[0];
      var previous = timeline[1] || null;
      var prompts = [];
      book.parameters.forEach(function (parameter) {
        var latestValue = latest.values[parameter.key];
        if (valueMissing(latestValue)) {
          if (prompts.length < 5) prompts.push('What would help capture ' + parameter.label + ' during the next observation?');
          return;
        }
        var range = rangeWarning(parameter, latestValue);
        if (range && prompts.length < 5) {
          prompts.push('Could the ' + parameter.label + ' reading be repeated or checked with a second source before drawing a conclusion?');
        }
        if (!previous || valueMissing(previous.values[parameter.key]) || prompts.length >= 5) return;
        var previousValue = previous.values[parameter.key];
        if (parameter.type === 'number' && typeof latestValue === 'number' && typeof previousValue === 'number' && latestValue !== previousValue) {
          prompts.push(parameter.label + ' changed from ' + valueText(parameter, previousValue) + ' to ' + valueText(parameter, latestValue) + '. What conditions or measurement differences should be checked?');
        } else if (String(latestValue) !== String(previousValue)) {
          prompts.push(parameter.label + ' was recorded differently than last time. What observable evidence might explain the difference?');
        }
      });
      if (latest.note && prompts.length < 6) {
        prompts.push('Which detail in the qualitative note could be checked again at the next observation?');
      }
      if (!previous && prompts.length < 6) {
        prompts.push('What should stay consistent next time so the two observations are comparable?');
      }
      if (!prompts.length) prompts.push('What changed, what stayed stable, and what evidence would be useful next?');
      return prompts.slice(0, 6);
    }

    return Object.freeze({
      kind: KIND,
      version: VERSION,
      tableIds: TABLE_IDS,
      limits: LIMITS,
      parameterTypes: PARAMETER_TYPES,
      privacyModes: PRIVACY_MODES,
      templateIds: Object.freeze(Object.keys(RAW_TEMPLATES)),
      getTemplate: getTemplate,
      normalizeDefinition: normalizeDefinition,
      buildTables: buildTables,
      inspectTables: inspectTables,
      findCaseMentions: findCaseMentions,
      parseNarrative: parseNarrative,
      createObservation: createObservation,
      createCase: createCase,
      createCaseContextUpdate: createCaseContextUpdate,
      caseTimeline: caseTimeline,
      buildComparison: buildComparison,
      buildParameterHistory: buildParameterHistory,
      buildAgentReflectionRequest: buildAgentReflectionRequest,
      buildReflections: buildReflections,
      fieldByKey: fieldByKey,
      tableColumnMap: tableColumnMap,
      valueText: valueText
    });
  }
);
