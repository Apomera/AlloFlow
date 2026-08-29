(function() {
'use strict';

if (typeof window === 'undefined') return;
window.AlloModules = window.AlloModules || {};
if (window.AlloModules.MathManipulativeGraderModule) return;

const OWN = Object.prototype.hasOwnProperty;
const MAX_COLLECTION_ITEMS = 256;
const MAX_TEXT_LENGTH = 500;
const MAX_FRACTION_DENOMINATOR = 20;
const MIN_CALCULUS_SUBDIVISIONS = 2;
const MAX_CALCULUS_SUBDIVISIONS = 50;
const hasOwn = (value, key) => value != null && OWN.call(value, key);
const isRecord = value => value != null && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const finiteInteger = value => finite(value) && Number.isInteger(value);
const nonNegativeInteger = value => finiteInteger(value) && value >= 0;
const positiveInteger = value => finiteInteger(value) && value > 0;
const nonEmptyString = value => typeof value === 'string' &&
  value.length <= MAX_TEXT_LENGTH && value.trim().length > 0;
const hasAny = (value, keys) => keys.some(key => hasOwn(value, key));
const optionalFinite = (value, key) => !hasOwn(value, key) || finite(value[key]);
const optionalNonNegativeInteger = (value, key) => !hasOwn(value, key) || nonNegativeInteger(value[key]);
const optionalString = (value, key) => !hasOwn(value, key) || nonEmptyString(value[key]);
const optionalBoolean = (value, key) => !hasOwn(value, key) || typeof value[key] === 'boolean';
const denseSnapshot = (value, maxItems = MAX_COLLECTION_ITEMS, allowEmpty = true) => {
  try {
    if (!Array.isArray(value)) return null;
    const length = value.length;
    if (!nonNegativeInteger(length) || length > maxItems || (!allowEmpty && length === 0)) return null;
    const snapshot = [];
    for (let index = 0; index < length; index += 1) {
      if (!hasOwn(value, index)) return null;
      snapshot.push(value[index]);
    }
    return snapshot;
  } catch (_) {
    return null;
  }
};
const denseEvery = (value, comparator, allowEmpty = true, maxItems = MAX_COLLECTION_ITEMS) => {
  const snapshot = denseSnapshot(value, maxItems, allowEmpty);
  if (!snapshot) return false;
  for (let index = 0; index < snapshot.length; index += 1) {
    if (!comparator(snapshot[index], index)) return false;
  }
  return true;
};
const denseCountIs = (value, comparator, expectedLength) => {
  const snapshot = denseSnapshot(value, expectedLength, expectedLength === 0);
  if (!snapshot || snapshot.length !== expectedLength) return false;
  for (let index = 0; index < snapshot.length; index += 1) {
    if (!comparator(snapshot[index], index)) return false;
  }
  return true;
};
const close = (actual, expected, tolerance) => finite(actual) && finite(expected) && Math.abs(actual - expected) <= tolerance;
const tight = (actual, expected, tolerance) => finite(actual) && finite(expected) && Math.abs(actual - expected) < tolerance;
const compact = value => typeof value === 'string' ? value.replace(/\s/g, '') : null;
const compactLower = value => {
  const normalized = compact(value);
  return normalized == null ? null : normalized.toLowerCase();
};
const sameOrdered = (actual, expected, comparator) => {
  const actualItems = denseSnapshot(actual);
  const expectedItems = denseSnapshot(expected);
  if (!actualItems || !expectedItems || actualItems.length !== expectedItems.length) return false;
  for (let index = 0; index < actualItems.length; index += 1) {
    if (!comparator(actualItems[index], expectedItems[index])) return false;
  }
  return true;
};
const sameUnorderedKeys = (actual, expected, toKey) => {
  const actualItems = denseSnapshot(actual);
  const expectedItems = denseSnapshot(expected);
  if (!actualItems || !expectedItems || actualItems.length !== expectedItems.length) return false;
  const actualKeys = [];
  const expectedKeys = [];
  for (let index = 0; index < actualItems.length; index += 1) {
    const actualKey = toKey(actualItems[index]);
    const expectedKey = toKey(expectedItems[index]);
    if (actualKey == null || expectedKey == null) return false;
    actualKeys.push(actualKey);
    expectedKeys.push(expectedKey);
  }
  actualKeys.sort();
  expectedKeys.sort();
  return actualKeys.every((key, index) => key === expectedKeys[index]);
};
const optionalExact = (actual, expected, key) => !hasOwn(expected, key) || actual[key] === expected[key];
const optionalClose = (actual, expected, key, tolerance) => !hasOwn(expected, key) || close(actual[key], expected[key], tolerance);
const optionalTight = (actual, expected, key, tolerance) => !hasOwn(expected, key) || tight(actual[key], expected[key], tolerance);

const pointKey = point => isRecord(point) && finite(point.x) && finite(point.y) ? `${point.x},${point.y}` : null;
const roundedPointKey = point => isRecord(point) && finite(point.x) && finite(point.y)
  ? `${Math.round(point.x)},${Math.round(point.y)}`
  : null;
const markerValue = marker => isRecord(marker) ? marker.value : marker;
const formulaDigits = Object.freeze({ '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' });
const normalizedFormula = value => {
  // Element symbols are case-sensitive: CO is carbon monoxide, while Co is
  // cobalt. Only discard harmless spacing and normalize display subscripts.
  const normalized = compact(value);
  return normalized == null ? null : normalized.replace(/[₀-₉]/g, digit => formulaDigits[digit]);
};
const preferredValue = (value, preferredKey, legacyKey) =>
  hasOwn(value, preferredKey) ? value[preferredKey] : value[legacyKey];

const componentMatches = (actual, expected) => {
  const expectedType = typeof expected === 'string' ? expected : isRecord(expected) ? expected.type : null;
  const actualType = typeof actual === 'string' ? actual : isRecord(actual) ? actual.type : null;
  if (!nonEmptyString(expectedType) || !nonEmptyString(actualType) || compactLower(actualType) !== compactLower(expectedType)) return false;
  if (!isRecord(expected)) return true;
  if (!isRecord(actual)) {
    return !['value', 'closed', 'ledColor', 'resistance', 'capacitance'].some(key => hasOwn(expected, key));
  }
  return ['value', 'closed', 'ledColor', 'resistance', 'capacitance'].every(key =>
    !hasOwn(expected, key) || actual[key] === expected[key]
  );
};
const validTargetComponent = component => {
  if (typeof component === 'string') return nonEmptyString(component);
  if (!isRecord(component) || !nonEmptyString(component.type)) return false;
  return ['value', 'resistance', 'capacitance'].every(key => optionalFinite(component, key)) &&
    optionalBoolean(component, 'closed') && optionalString(component, 'ledColor');
};
const validActualComponent = component => typeof component === 'string'
  ? nonEmptyString(component)
  : isRecord(component) && nonEmptyString(component.type);
const MAX_CIRCUIT_COMPONENTS = 128;
const sameUnorderedComponents = (actual, expected) => {
  const actualItems = denseSnapshot(actual, MAX_CIRCUIT_COMPONENTS);
  const expectedItems = denseSnapshot(expected, MAX_CIRCUIT_COMPONENTS);
  if (!actualItems || !expectedItems || actualItems.length !== expectedItems.length) return false;
  for (let index = 0; index < actualItems.length; index += 1) {
    if (!validActualComponent(actualItems[index]) || !validTargetComponent(expectedItems[index])) return false;
  }
  const actualMatches = [];
  for (let index = 0; index < actualItems.length; index += 1) actualMatches.push(-1);
  const assignMatch = (expectedIndex, visited) => {
    for (let actualIndex = 0; actualIndex < actualItems.length; actualIndex += 1) {
      if (visited[actualIndex] || !componentMatches(actualItems[actualIndex], expectedItems[expectedIndex])) continue;
      visited[actualIndex] = true;
      if (actualMatches[actualIndex] === -1 || assignMatch(actualMatches[actualIndex], visited)) {
        actualMatches[actualIndex] = expectedIndex;
        return true;
      }
    }
    return false;
  };
  for (let expectedIndex = 0; expectedIndex < expectedItems.length; expectedIndex += 1) {
    const visited = [];
    for (let actualIndex = 0; actualIndex < actualItems.length; actualIndex += 1) visited.push(false);
    if (!assignMatch(expectedIndex, visited)) return false;
  }
  return true;
};

const graders = {
  coordinate(actual, target) {
    return Array.isArray(actual) && isRecord(target) && Array.isArray(target.points) &&
      sameUnorderedKeys(actual, target.points, pointKey);
  },
  base10(actual, target) {
    if (!isRecord(actual) || !isRecord(target)) return false;
    return finite(actual.hundreds) && finite(actual.tens) && finite(actual.ones) &&
      actual.hundreds === (target.hundreds ?? 0) &&
      actual.tens === (target.tens ?? 0) &&
      actual.ones === (target.ones ?? 0);
  },
  numberline(actual, target) {
    if (!Array.isArray(actual) || !isRecord(target) || !Array.isArray(target.markers)) return false;
    const actualMarkers = denseSnapshot(actual);
    const expectedMarkers = denseSnapshot(target.markers);
    if (!actualMarkers || !expectedMarkers || actualMarkers.length !== expectedMarkers.length) return false;
    const actualValues = [];
    const expectedValues = [];
    for (let index = 0; index < actualMarkers.length; index += 1) {
      const actualValue = markerValue(actualMarkers[index]);
      const expectedValue = markerValue(expectedMarkers[index]);
      if (!finite(actualValue) || !finite(expectedValue)) return false;
      actualValues.push(actualValue);
      expectedValues.push(expectedValue);
    }
    actualValues.sort((a, b) => a - b);
    expectedValues.sort((a, b) => a - b);
    return sameOrdered(actualValues, expectedValues, (value, expected) => tight(value, expected, 0.01));
  },
  fractions(actual, target) {
    return isRecord(actual) && isRecord(target) && finite(actual.numerator) && finite(actual.denominator) &&
      actual.numerator === (target.numerator ?? 0) && actual.denominator === (target.denominator ?? 1);
  },
  volume(actual, target) {
    const dims = isRecord(target) && isRecord(target.dims) ? target.dims : {};
    return isRecord(actual) && isRecord(target) && finite(actual.l) && finite(actual.w) && finite(actual.h) &&
      actual.l === (dims.l ?? 1) && actual.w === (dims.w ?? 1) && actual.h === (dims.h ?? 1);
  },
  protractor(actual, target) {
    return isRecord(target) && close(actual, target.angle ?? 0, 2);
  },
  funcGrapher(actual, target) {
    if (!isRecord(actual) || !isRecord(target)) return false;
    return compactLower(actual.type) === compactLower(target.type ?? 'quadratic') &&
      tight(actual.a, target.a ?? 0, 0.1) && tight(actual.b, target.b ?? 0, 0.1) && tight(actual.c, target.c ?? 0, 0.1);
  },
  physics(actual, target) {
    if (!isRecord(actual) || !isRecord(target)) return false;
    return close(actual.angle, target.angle ?? 45, 2) && close(actual.velocity, target.velocity ?? 20, 1) &&
      optionalClose(actual, target, 'gravity', 0.01);
  },
  chemBalance(actual, target) {
    if (!isRecord(actual) || !isRecord(target)) return false;
    return sameOrdered(actual.coefficients, target.coefficients, (value, expected) => finite(value) && finite(expected) && value === expected);
  },
  punnett(actual, target) {
    if (!isRecord(actual) || !isRecord(target) || !Array.isArray(target.parent1) || !Array.isArray(target.parent2)) return false;
    return sameUnorderedKeys(actual.parent1, target.parent1, value => typeof value === 'string' ? value : null) &&
      sameUnorderedKeys(actual.parent2, target.parent2, value => typeof value === 'string' ? value : null);
  },
  circuit(actual, target) {
    if (!isRecord(actual) || !isRecord(target) || !close(actual.voltage ?? 9, target.voltage ?? 9, 0.5)) return false;
    if (hasOwn(target, 'mode') && (actual.mode ?? 'series') !== target.mode) return false;
    if (hasOwn(target, 'components') && !sameUnorderedComponents(actual.components ?? [], target.components)) return false;
    return true;
  },
  dataPlot(actual, target) {
    return isRecord(actual) && isRecord(target) && Array.isArray(target.points) &&
      sameUnorderedKeys(actual.points, target.points, roundedPointKey);
  },
  inequality(actual, target) {
    if (!isRecord(actual) || !isRecord(target)) return false;
    const actualExpr = compact(actual.expr);
    const expectedExpr = compact(target.expr ?? '');
    return actualExpr != null && actualExpr === expectedExpr;
  },
  molecule(actual, target) {
    if (!isRecord(actual) || !isRecord(target)) return false;
    const actualFormula = normalizedFormula(actual.formula);
    const expectedFormula = normalizedFormula(target.formula ?? '');
    return actualFormula != null && actualFormula === expectedFormula;
  },
  calculus(actual, target) {
    if (!isRecord(actual) || !isRecord(target)) return false;
    if (actual.mode !== (target.mode ?? 'riemann') ||
        !tight(actual.xMin, target.xMin ?? 0, 0.1) ||
        !tight(actual.xMax, target.xMax ?? 4, 0.1) ||
        actual.n !== (target.n ?? 8)) return false;
    return optionalTight(actual, target, 'a', 0.1) &&
      optionalTight(actual, target, 'b', 0.1) &&
      optionalTight(actual, target, 'c', 0.1) &&
      optionalExact(actual, target, 'showDerivative');
  },
  wave(actual, target) {
    if (!isRecord(actual) || !isRecord(target)) return false;
    return tight(actual.amplitude, target.amplitude ?? 1, 0.1) &&
      tight(actual.frequency, target.frequency ?? 1, 0.1) &&
      optionalTight(actual, target, 'wavelength', 0.1) &&
      optionalTight(actual, target, 'phase', 0.1) &&
      (!hasOwn(target, 'wave2') || preferredValue(actual, 'showSecond', 'wave2') === target.wave2) &&
      (!hasOwn(target, 'amp2') || tight(preferredValue(actual, 'amplitude2', 'amp2'), target.amp2, 0.1)) &&
      (!hasOwn(target, 'freq2') || tight(preferredValue(actual, 'frequency2', 'freq2'), target.freq2, 0.1));
  },
  cell(actual, target) {
    if (!isRecord(actual) || !isRecord(target) || !hasOwn(target, 'selectedOrganelle')) return false;
    const actualSelection = preferredValue(actual, 'interiorSel', 'selectedOrganelle');
    const actualType = preferredValue(actual, 'interiorCellType', 'type');
    return actualSelection === target.selectedOrganelle &&
      (!hasOwn(target, 'type') || actualType === target.type);
  }
};

const validators = {
  coordinate: {
    target: target => isRecord(target) && denseEvery(target.points, point => pointKey(point) != null, false),
    actual: actual => denseEvery(actual, point => pointKey(point) != null)
  },
  base10: {
    target: target => isRecord(target) && hasAny(target, ['hundreds', 'tens', 'ones']) &&
      ['hundreds', 'tens', 'ones'].every(key => optionalNonNegativeInteger(target, key)),
    actual: actual => isRecord(actual) && ['hundreds', 'tens', 'ones'].every(key => nonNegativeInteger(actual[key]))
  },
  numberline: {
    target: target => isRecord(target) && denseEvery(target.markers, marker => finite(markerValue(marker)), false),
    actual: actual => denseEvery(actual, marker => finite(markerValue(marker)))
  },
  fractions: {
    target: target => isRecord(target) && hasOwn(target, 'denominator') &&
      (!hasOwn(target, 'numerator') || nonNegativeInteger(target.numerator)) &&
      positiveInteger(target.denominator) &&
      target.denominator >= 2 && target.denominator <= MAX_FRACTION_DENOMINATOR &&
      (!hasOwn(target, 'numerator') || target.numerator <= target.denominator),
    actual: actual => isRecord(actual) && nonNegativeInteger(actual.numerator) &&
      positiveInteger(actual.denominator) && actual.denominator >= 2 &&
      actual.denominator <= MAX_FRACTION_DENOMINATOR &&
      actual.numerator <= actual.denominator
  },
  volume: {
    target: target => isRecord(target) && isRecord(target.dims) && hasAny(target.dims, ['l', 'w', 'h']) &&
      ['l', 'w', 'h'].every(key => optionalFinite(target.dims, key)),
    actual: actual => isRecord(actual) && ['l', 'w', 'h'].every(key => finite(actual[key]))
  },
  protractor: {
    target: target => isRecord(target) && hasOwn(target, 'angle') && finite(target.angle),
    actual: actual => finite(actual)
  },
  funcGrapher: {
    target: target => isRecord(target) && hasAny(target, ['type', 'a', 'b', 'c']) &&
      optionalString(target, 'type') && ['a', 'b', 'c'].every(key => optionalFinite(target, key)) && optionalString(target, 'eq'),
    actual: actual => isRecord(actual) && nonEmptyString(actual.type) && ['a', 'b', 'c'].every(key => finite(actual[key]))
  },
  physics: {
    target: target => isRecord(target) && hasAny(target, ['angle', 'velocity', 'gravity']) &&
      ['angle', 'velocity', 'gravity'].every(key => optionalFinite(target, key)),
    actual: (actual, target) => isRecord(actual) && finite(actual.angle) && finite(actual.velocity) &&
      (!hasOwn(target, 'gravity') || finite(actual.gravity))
  },
  chemBalance: {
    target: target => isRecord(target) && denseEvery(target.coefficients, positiveInteger, false) && optionalString(target, 'equation'),
    actual: actual => isRecord(actual) && denseEvery(actual.coefficients, positiveInteger, false)
  },
  punnett: {
    target: target => isRecord(target) && denseCountIs(target.parent1, nonEmptyString, 2) &&
      denseCountIs(target.parent2, nonEmptyString, 2),
    actual: actual => isRecord(actual) && denseCountIs(actual.parent1, nonEmptyString, 2) &&
      denseCountIs(actual.parent2, nonEmptyString, 2)
  },
  circuit: {
    target: target => isRecord(target) && hasAny(target, ['voltage', 'mode', 'components']) &&
      optionalFinite(target, 'voltage') && optionalString(target, 'mode') &&
      (!hasOwn(target, 'components') || denseEvery(target.components, validTargetComponent, true, MAX_CIRCUIT_COMPONENTS)),
    actual: (actual, target) => isRecord(actual) && finite(hasOwn(actual, 'voltage') ? actual.voltage : 9) &&
      (!hasOwn(target, 'mode') || nonEmptyString(hasOwn(actual, 'mode') ? actual.mode : 'series')) &&
      (!hasOwn(target, 'components') || denseEvery(hasOwn(actual, 'components') ? actual.components : [], validActualComponent, true, MAX_CIRCUIT_COMPONENTS))
  },
  dataPlot: {
    target: target => isRecord(target) && denseEvery(target.points, point => roundedPointKey(point) != null, false),
    actual: actual => isRecord(actual) && denseEvery(actual.points, point => roundedPointKey(point) != null)
  },
  inequality: {
    target: target => isRecord(target) && hasOwn(target, 'expr') && nonEmptyString(target.expr) && optionalString(target, 'variable'),
    actual: actual => isRecord(actual) && nonEmptyString(actual.expr)
  },
  molecule: {
    target: target => isRecord(target) && hasOwn(target, 'formula') && nonEmptyString(target.formula),
    actual: actual => isRecord(actual) && nonEmptyString(actual.formula)
  },
  calculus: {
    target: target => isRecord(target) && hasAny(target, ['mode', 'xMin', 'xMax', 'n', 'a', 'b', 'c', 'showDerivative']) &&
      optionalString(target, 'mode') && ['xMin', 'xMax', 'a', 'b', 'c'].every(key => optionalFinite(target, key)) &&
      (!hasOwn(target, 'n') || (finiteInteger(target.n) && target.n >= MIN_CALCULUS_SUBDIVISIONS &&
        target.n <= MAX_CALCULUS_SUBDIVISIONS && ((target.mode ?? 'riemann') !== 'simpson' || target.n % 2 === 0))) &&
      optionalString(target, 'func') && optionalBoolean(target, 'showDerivative'),
    actual: (actual, target) => isRecord(actual) && nonEmptyString(actual.mode) && finite(actual.xMin) && finite(actual.xMax) &&
      finiteInteger(actual.n) && actual.n >= MIN_CALCULUS_SUBDIVISIONS && actual.n <= MAX_CALCULUS_SUBDIVISIONS &&
      (actual.mode !== 'simpson' || actual.n % 2 === 0) && ['a', 'b', 'c'].every(key => !hasOwn(target, key) || finite(actual[key])) &&
      (!hasOwn(target, 'showDerivative') || typeof actual.showDerivative === 'boolean')
  },
  wave: {
    target: target => isRecord(target) && hasAny(target, ['amplitude', 'frequency', 'wavelength', 'phase', 'wave2', 'amp2', 'freq2']) &&
      ['amplitude', 'frequency', 'wavelength', 'phase', 'amp2', 'freq2'].every(key => optionalFinite(target, key)) && optionalBoolean(target, 'wave2'),
    actual: (actual, target) => isRecord(actual) && finite(actual.amplitude) && finite(actual.frequency) &&
      (!hasOwn(target, 'wavelength') || finite(actual.wavelength)) && (!hasOwn(target, 'phase') || finite(actual.phase)) &&
      (!hasOwn(target, 'wave2') || typeof preferredValue(actual, 'showSecond', 'wave2') === 'boolean') &&
      (!hasOwn(target, 'amp2') || finite(preferredValue(actual, 'amplitude2', 'amp2'))) &&
      (!hasOwn(target, 'freq2') || finite(preferredValue(actual, 'frequency2', 'freq2')))
  },
  cell: {
    target: target => isRecord(target) && hasOwn(target, 'selectedOrganelle') && nonEmptyString(target.selectedOrganelle) && optionalString(target, 'type'),
    actual: (actual, target) => isRecord(actual) && nonEmptyString(preferredValue(actual, 'interiorSel', 'selectedOrganelle')) &&
      (!hasOwn(target, 'type') || nonEmptyString(preferredValue(actual, 'interiorCellType', 'type')))
  }
};

const evaluateManipulativeResponse = (tool, actual, target) => {
  const grader = typeof tool === 'string' && hasOwn(graders, tool) ? graders[tool] : null;
  if (!grader) return { correct: false, supported: false, reason: 'unsupported-tool', tool: tool ?? null };
  try {
    const validator = validators[tool];
    if (!validator.target(target)) return { correct: false, supported: true, reason: 'invalid-target', tool };
    if (!validator.actual(actual, target)) return { correct: false, supported: true, reason: 'invalid-actual', tool };
    const correct = grader(actual, target) === true;
    return { correct, supported: true, reason: correct ? 'match' : 'mismatch', tool };
  } catch (_) {
    return { correct: false, supported: true, reason: 'invalid-state', tool };
  }
};

const gradeManipulativeResponse = (tool, actual, target) => evaluateManipulativeResponse(tool, actual, target).correct;

const mathViewStateKeys = Object.freeze({
  coordinate: 'gridPoints',
  base10: 'base10Value',
  numberline: 'numberLineMarkers',
  fractions: 'fractionPieces',
  volume: 'cubeDims',
  protractor: 'angleValue'
});

const evaluateMathViewManipulativeResponse = (response, state) => {
  let tool = null;
  try {
    tool = isRecord(response) ? response.tool : null;
    const snapshot = isRecord(state) ? state : {};
    const directKey = typeof tool === 'string' && hasOwn(mathViewStateKeys, tool) ? mathViewStateKeys[tool] : null;
    const labToolData = isRecord(snapshot.labToolData) ? snapshot.labToolData : null;
    let actual;
    if (directKey) actual = hasOwn(snapshot, directKey) ? snapshot[directKey] : undefined;
    else if (tool === 'circuit' && labToolData && hasOwn(labToolData, '_circuit')) actual = labToolData._circuit;
    else actual = labToolData && hasOwn(labToolData, tool) ? labToolData[tool] : undefined;
    return evaluateManipulativeResponse(tool, actual, isRecord(response) ? response.state : null);
  } catch (_) {
    const supported = typeof tool === 'string' && hasOwn(graders, tool);
    return { correct: false, supported, reason: 'invalid-state', tool };
  }
};

const gradeMathViewManipulativeResponse = (response, state) =>
  evaluateMathViewManipulativeResponse(response, state).correct;

window.AlloModules.MathManipulativeGrader = {
  evaluateManipulativeResponse,
  gradeManipulativeResponse,
  evaluateMathViewManipulativeResponse,
  gradeMathViewManipulativeResponse,
  supportedTools: Object.freeze(Object.keys(graders)),
  limits: Object.freeze({
    maxCollectionItems: MAX_COLLECTION_ITEMS,
    maxTextLength: MAX_TEXT_LENGTH,
    maxFractionDenominator: MAX_FRACTION_DENOMINATOR
  })
};
window.AlloModules.MathManipulativeGraderModule = true;
})();
