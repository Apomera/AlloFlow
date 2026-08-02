(function (root, factory) {
  'use strict';

  var api = factory();
  if (root) root.AlloSheetAnalysis = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var MAX_VISUAL_GROUPS = 50;
  var NUMERIC_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
  var IDENTIFIER_PATTERN = /(?:^|[\s_-])(?:id|uid|code|zip|postal|phone)(?:$|[\s_-])/i;
  var ALLOWED_TYPES = {
    text: true,
    number: true,
    boolean: true,
    date: true,
    datetime: true,
    duration: true,
    category: true
  };
  var CALCULATIONS = {
    count: true,
    average: true,
    sum: true,
    min: true,
    max: true
  };
  var FILTER_OPERATORS = {
    contains: true,
    equals: true,
    'not-equals': true,
    'is-blank': true,
    'not-blank': true,
    gte: true,
    lte: true
  };

  function fail(message) {
    var error = new Error(message);
    error.code = 'allosheet-analysis-invalid';
    throw error;
  }

  function isBlank(value) {
    return value === null || value === undefined || String(value).trim() === '';
  }

  function strictNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string') return null;
    var trimmed = value.trim();
    if (!trimmed || !NUMERIC_PATTERN.test(trimmed)) return null;
    var parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function validIsoDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var parts = value.split('-').map(Number);
    var date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    return date.getUTCFullYear() === parts[0]
      && date.getUTCMonth() === parts[1] - 1
      && date.getUTCDate() === parts[2];
  }

  function validIsoDateTime(value) {
    return typeof value === 'string'
      && /^\d{4}-\d{2}-\d{2}T/.test(value)
      && validIsoDate(value.slice(0, 10))
      && Number.isFinite(Date.parse(value));
  }

  function normalizedDeclaredTypes(columns, declaredDetails) {
    var result = Object.create(null);
    var allowedColumns = Object.create(null);
    (columns || []).forEach(function (column) { allowedColumns[String(column)] = true; });
    (declaredDetails || []).forEach(function (detail) {
      if (!detail || typeof detail !== 'object') return;
      var label = String(detail.label == null ? detail.key : detail.label);
      var type = String(detail.type || 'text').toLowerCase();
      if (allowedColumns[label] && ALLOWED_TYPES[type]) result[label] = type;
    });
    return result;
  }

  function inferColumnTypes(records, columns, declaredDetails) {
    var declared = normalizedDeclaredTypes(columns, declaredDetails);
    var result = Object.create(null);
    (columns || []).forEach(function (column) {
      var name = String(column);
      if (declared[name]) {
        result[name] = declared[name];
        return;
      }
      var values = (records || []).map(function (record) {
        return record && record.fields ? record.fields[name] : '';
      }).filter(function (value) { return !isBlank(value); });
      if (!values.length) {
        result[name] = 'text';
      } else if (values.every(function (value) { return typeof value === 'boolean'; })) {
        result[name] = 'boolean';
      } else if (!IDENTIFIER_PATTERN.test(name) && values.every(function (value) {
        return strictNumber(value) !== null;
      })) {
        result[name] = 'number';
      } else if (values.every(function (value) { return validIsoDate(String(value)); })) {
        result[name] = 'date';
      } else if (values.every(function (value) { return validIsoDateTime(String(value)); })) {
        result[name] = 'datetime';
      } else {
        result[name] = 'text';
      }
    });
    return result;
  }

  function normalizeSpec(spec, columns, columnTypes) {
    spec = spec || {};
    var allowed = Object.create(null);
    (columns || []).forEach(function (column) { allowed[String(column)] = true; });
    var filterColumn = String(spec.filterColumn || '');
    var groupColumn = String(spec.groupColumn || '');
    var measureColumn = String(spec.measureColumn || '__count__');
    var calculation = String(spec.calculation || 'count');
    var filterOperator = String(spec.filterOperator || 'contains');
    var representation = String(spec.representation || 'bar');
    if (filterColumn && !allowed[filterColumn]) fail('Choose a valid filter column.');
    if (!groupColumn || !allowed[groupColumn]) fail('Choose a column to group by.');
    if (!FILTER_OPERATORS[filterOperator]) fail('Choose a supported filter condition.');
    if (!CALCULATIONS[calculation]) fail('Choose a supported calculation.');
    if (calculation === 'count') measureColumn = '__count__';
    if (measureColumn !== '__count__') {
      if (!allowed[measureColumn]) fail('Choose a valid measure column.');
      if (columnTypes[measureColumn] !== 'number' && columnTypes[measureColumn] !== 'duration') {
        fail('The selected measure must contain numeric values.');
      }
    }
    if (calculation !== 'count' && measureColumn === '__count__') {
      fail('Choose a numeric measure for this calculation.');
    }
    if (representation !== 'bar' && representation !== 'trend') representation = 'bar';
    if (
      representation === 'trend'
      && columnTypes[groupColumn] !== 'date'
      && columnTypes[groupColumn] !== 'datetime'
    ) {
      fail('A trend requires an ISO date or date-time group column.');
    }
    return {
      filterColumn: filterColumn,
      filterOperator: filterOperator,
      filterValue: String(spec.filterValue == null ? '' : spec.filterValue),
      groupColumn: groupColumn,
      measureColumn: measureColumn,
      calculation: calculation,
      representation: representation
    };
  }

  function compareText(left, right) {
    return String(left == null ? '' : left).trim().toLocaleLowerCase()
      === String(right == null ? '' : right).trim().toLocaleLowerCase();
  }

  function filterRecords(records, spec, columnTypes) {
    if (!spec.filterColumn) return (records || []).slice();
    var target = spec.filterValue.trim();
    var numericTarget = null;
    if (spec.filterOperator === 'gte' || spec.filterOperator === 'lte') {
      numericTarget = strictNumber(target);
      if (numericTarget === null) fail('Enter a valid number for the numeric filter.');
      if (
        columnTypes[spec.filterColumn] !== 'number'
        && columnTypes[spec.filterColumn] !== 'duration'
      ) {
        fail('Greater-than and less-than filters require a numeric column.');
      }
    } else if (
      spec.filterOperator !== 'is-blank'
      && spec.filterOperator !== 'not-blank'
      && !target
    ) {
      fail('Enter a filter value or choose a blank-value condition.');
    }
    return (records || []).filter(function (record) {
      var value = record && record.fields ? record.fields[spec.filterColumn] : '';
      if (spec.filterOperator === 'is-blank') return isBlank(value);
      if (spec.filterOperator === 'not-blank') return !isBlank(value);
      if (spec.filterOperator === 'equals') return compareText(value, target);
      if (spec.filterOperator === 'not-equals') return !compareText(value, target);
      if (spec.filterOperator === 'gte') {
        var gteValue = strictNumber(value);
        return gteValue !== null && gteValue >= numericTarget;
      }
      if (spec.filterOperator === 'lte') {
        var lteValue = strictNumber(value);
        return lteValue !== null && lteValue <= numericTarget;
      }
      return String(value == null ? '' : value).toLocaleLowerCase()
        .indexOf(target.toLocaleLowerCase()) !== -1;
    });
  }

  function groupDescriptor(value, type) {
    if (isBlank(value)) {
      return {
        key: 'blank:',
        label: 'Missing/blank',
        trendEligible: false,
        blank: true
      };
    }
    var raw = String(value).trim();
    if (type === 'date') {
      if (validIsoDate(raw)) {
        return { key: 'dated:' + raw, label: raw, trendEligible: true, blank: false };
      }
      return {
        key: 'invalid-date:' + raw,
        label: raw + ' (invalid date)',
        trendEligible: false,
        blank: false
      };
    }
    if (type === 'datetime') {
      if (validIsoDateTime(raw)) {
        var day = raw.slice(0, 10);
        return { key: 'dated:' + day, label: day, trendEligible: true, blank: false };
      }
      return {
        key: 'invalid-datetime:' + raw,
        label: raw + ' (invalid date-time)',
        trendEligible: false,
        blank: false
      };
    }
    return {
      key: 'value:' + raw,
      label: raw === 'Missing/blank' ? 'Missing/blank (literal value)' : raw,
      trendEligible: false,
      blank: false
    };
  }

  function metricFor(group, calculation) {
    if (calculation === 'count') return { metric: group.rowCount, overflow: false };
    if (!group.numericValues.length) return { metric: null, overflow: false };
    var result;
    if (calculation === 'sum') {
      result = group.numericValues.reduce(function (sum, value) { return sum + value; }, 0);
    } else if (calculation === 'min') {
      result = Math.min.apply(Math, group.numericValues);
    } else if (calculation === 'max') {
      result = Math.max.apply(Math, group.numericValues);
    } else {
      var divisor = group.numericValues.length;
      result = group.numericValues.reduce(function (average, value) {
        return average + value / divisor;
      }, 0);
    }
    return Number.isFinite(result)
      ? { metric: result, overflow: false }
      : { metric: null, overflow: true };
  }

  function aggregateGroups(records, spec, columnTypes) {
    var grouped = Object.create(null);
    var groupKeys = [];
    var includedMeasureCount = 0;
    var excludedMeasureCount = 0;
    (records || []).forEach(function (record) {
      var fields = record && record.fields ? record.fields : {};
      var descriptor = groupDescriptor(
        fields[spec.groupColumn],
        columnTypes[spec.groupColumn]
      );
      if (!grouped[descriptor.key]) {
        grouped[descriptor.key] = {
          label: descriptor.label,
          blank: descriptor.blank,
          trendEligible: descriptor.trendEligible,
          rowCount: 0,
          numericValues: []
        };
        groupKeys.push(descriptor.key);
      }
      var group = grouped[descriptor.key];
      group.rowCount += 1;
      if (spec.measureColumn !== '__count__') {
        var numeric = strictNumber(fields[spec.measureColumn]);
        if (numeric === null) excludedMeasureCount += 1;
        else {
          group.numericValues.push(numeric);
          includedMeasureCount += 1;
        }
      }
    });
    var trend = spec.representation === 'trend';
    groupKeys.sort(function (leftKey, rightKey) {
      var left = grouped[leftKey];
      var right = grouped[rightKey];
      if (trend && left.trendEligible !== right.trendEligible) {
        return left.trendEligible ? -1 : 1;
      }
      if (left.blank !== right.blank) return left.blank ? 1 : -1;
      if (trend && left.trendEligible && right.trendEligible) {
        return left.label.localeCompare(right.label);
      }
      return left.label.localeCompare(right.label, undefined, {
        numeric: true,
        sensitivity: 'base'
      });
    });
    var overflowGroupCount = 0;
    var trendGroups = [];
    var groups = groupKeys.map(function (groupKey) {
      var group = grouped[groupKey];
      var metric = metricFor(group, spec.calculation);
      if (metric.overflow) overflowGroupCount += 1;
      var result = {
        label: group.label,
        rowCount: group.rowCount,
        numericCount: group.numericValues.length,
        metric: metric.metric
      };
      if (group.trendEligible) trendGroups.push(result);
      return result;
    });
    return {
      groups: groups,
      trendGroups: trendGroups,
      includedMeasureCount: includedMeasureCount,
      excludedMeasureCount: excludedMeasureCount,
      overflowGroupCount: overflowGroupCount
    };
  }

  function calculationLabel(spec) {
    if (spec.calculation === 'count') return 'Row count';
    var label = spec.calculation.charAt(0).toUpperCase() + spec.calculation.slice(1);
    return label + ' of ' + spec.measureColumn;
  }

  function buildNarrative(model) {
    var text = 'Analyzed ' + model.filteredRowCount + ' of ' + model.sourceRowCount
      + ' loaded rows across ' + model.groups.length + ' group'
      + (model.groups.length === 1 ? '' : 's') + '.';
    if (model.spec.calculation !== 'count') {
      text += ' ' + model.includedMeasureCount + ' numeric value'
        + (model.includedMeasureCount === 1 ? '' : 's') + ' contributed to '
        + calculationLabel(model.spec).toLocaleLowerCase() + '.';
      if (model.excludedMeasureCount) {
        text += ' ' + model.excludedMeasureCount + ' blank or non-numeric value'
          + (model.excludedMeasureCount === 1 ? ' was' : 's were') + ' excluded, not treated as zero.';
      }
    }
    if (model.overflowGroupCount) {
      text += ' ' + model.overflowGroupCount + ' group result'
        + (model.overflowGroupCount === 1 ? ' is' : 's are')
        + ' unavailable because the arithmetic exceeded the finite numeric range.';
    }
    if (model.spec.representation === 'trend' && model.omittedTrendGroupCount) {
      text += ' ' + model.omittedTrendGroupCount + ' missing or invalid date group'
        + (model.omittedTrendGroupCount === 1 ? ' remains' : 's remain')
        + ' in the result table and '
        + (model.omittedTrendGroupCount === 1 ? 'is' : 'are')
        + ' not eligible for the trend line.';
    }
    if (!model.visualAllowed) {
      text += ' The complete result remains in the table, but the visual is omitted because there are more than '
        + MAX_VISUAL_GROUPS + ' groups.';
    } else if (model.spec.representation === 'trend') {
      var available = model.trendGroups.filter(function (group) { return group.metric !== null; });
      if (available.length > 1) {
        var first = available[0];
        var last = available[available.length - 1];
        text += ' The last dated group (' + last.label + ') is '
          + (last.metric > first.metric ? 'higher than' : last.metric < first.metric ? 'lower than' : 'equal to')
          + ' the first dated group (' + first.label + ').';
      }
      text += ' This descriptive trend does not establish cause.';
    }
    return text;
  }

  function trendPositionFractions(groups) {
    var timestamps = (groups || []).map(function (group) {
      return Date.parse(String(group && group.label || '') + 'T00:00:00.000Z');
    });
    if (!timestamps.length) return [];
    if (timestamps.some(function (timestamp) { return !Number.isFinite(timestamp); })) {
      fail('Trend positions require valid ISO date groups.');
    }
    var minimum = Math.min.apply(Math, timestamps);
    var maximum = Math.max.apply(Math, timestamps);
    if (minimum === maximum) {
      return timestamps.map(function () { return 0.5; });
    }
    return timestamps.map(function (timestamp) {
      return (timestamp - minimum) / (maximum - minimum);
    });
  }

  function buildAnalysis(records, columns, declaredDetails, inputSpec) {
    var copiedRecords = (records || []).slice();
    var copiedColumns = (columns || []).map(String);
    var columnTypes = inferColumnTypes(copiedRecords, copiedColumns, declaredDetails);
    var spec = normalizeSpec(inputSpec, copiedColumns, columnTypes);
    var filtered = filterRecords(copiedRecords, spec, columnTypes);
    var aggregate = aggregateGroups(filtered, spec, columnTypes);
    var model = {
      spec: spec,
      columnTypes: columnTypes,
      sourceRowCount: copiedRecords.length,
      filteredRowCount: filtered.length,
      groups: aggregate.groups,
      trendGroups: aggregate.trendGroups,
      includedMeasureCount: aggregate.includedMeasureCount,
      excludedMeasureCount: aggregate.excludedMeasureCount,
      overflowGroupCount: aggregate.overflowGroupCount,
      omittedTrendGroupCount: spec.representation === 'trend'
        ? aggregate.groups.length - aggregate.trendGroups.length
        : 0,
      visualAllowed: aggregate.groups.length <= MAX_VISUAL_GROUPS,
      metricLabel: calculationLabel(spec)
    };
    model.narrative = buildNarrative(model);
    return model;
  }

  function profileRange(values, type) {
    if (!values.length) return null;
    if (type === 'number' || type === 'duration') {
      var numericValues = values.map(strictNumber).filter(function (value) { return value !== null; });
      if (!numericValues.length) return null;
      return { minimum: Math.min.apply(Math, numericValues), maximum: Math.max.apply(Math, numericValues), validCount: numericValues.length };
    }
    if (type === 'date') {
      var dates = values.map(function (value) { return String(value).trim(); }).filter(validIsoDate);
      if (!dates.length) return null;
      dates.sort();
      return { minimum: dates[0], maximum: dates[dates.length - 1], validCount: dates.length };
    }
    if (type === 'datetime') {
      var dateTimes = values.map(function (value) { return String(value).trim(); }).filter(validIsoDateTime);
      if (!dateTimes.length) return null;
      dateTimes.sort();
      return { minimum: dateTimes[0], maximum: dateTimes[dateTimes.length - 1], validCount: dateTimes.length };
    }
    return null;
  }

  function buildColumnProfile(records, columns, declaredDetails) {
    var copiedRecords = (records || []).slice();
    var copiedColumns = (columns || []).map(String);
    var columnTypes = inferColumnTypes(copiedRecords, copiedColumns, declaredDetails);
    var profiles = copiedColumns.map(function (column) {
      var values = copiedRecords.map(function (record) { return record && record.fields ? record.fields[column] : ''; });
      var nonBlankValues = values.filter(function (value) { return !isBlank(value); });
      var distinct = Object.create(null);
      nonBlankValues.forEach(function (value) { distinct[typeof value + ':' + String(value).trim()] = true; });
      return {
        column: column,
        type: columnTypes[column],
        identifierLike: IDENTIFIER_PATTERN.test(column),
        filledCount: nonBlankValues.length,
        blankCount: values.length - nonBlankValues.length,
        distinctCount: Object.keys(distinct).length,
        range: profileRange(nonBlankValues, columnTypes[column])
      };
    });
    var profile = { sourceRowCount: copiedRecords.length, columns: profiles, columnTypes: columnTypes };
    profile.narrative = 'Profiled ' + profiles.length + ' column' + (profiles.length === 1 ? '' : 's') + ' across ' + copiedRecords.length + ' loaded row' + (copiedRecords.length === 1 ? '' : 's') + '. Values stay in this window; the profile contains structure and counts only.';
    return profile;
  }
  return Object.freeze({
    MAX_VISUAL_GROUPS: MAX_VISUAL_GROUPS,
    isBlank: isBlank,
    strictNumber: strictNumber,
    inferColumnTypes: inferColumnTypes,
    normalizeSpec: normalizeSpec,
    filterRecords: filterRecords,
    aggregateGroups: aggregateGroups,
    trendPositionFractions: trendPositionFractions,
    buildAnalysis: buildAnalysis,
    buildColumnProfile: buildColumnProfile
  });
});
