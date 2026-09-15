// Anchored slicing for source-pin tests.
//
// This repo has ~1,200 test files that pin behaviour by slicing a region out
// of a big source file and asserting on it:
//
//     const branch = source.slice(source.indexOf(START), source.indexOf(END));
//     expect(branch).toContain('onClose={handleCloseDashboard}');
//
// That shape FAILS OPEN. `indexOf` returns -1 for an anchor that no longer
// exists, and `slice` reads a negative bound as an offset from the END of the
// string — so a stale START silently begins the slice one character from the
// end (empty region, assertions fail for a misleading reason) and a stale END
// silently extends the slice to the whole file (the region now contains
// everything, so `toContain` passes for free).
//
// The second case is the dangerous one: the test keeps passing while pinning
// nothing. tests/dashboard_close_routing.test.js did exactly this — another
// session widened a branch condition from `!isTeacherMode` to
// `(!isTeacherMode || isIndependentMode)`, the END anchor stopped matching,
// and the "teacher branch" slice quietly became the entire 44k-line file. Its
// assertion passed against some other component's close handler for weeks.
// Only the sibling assertion, which happened to fail closed, ever complained.
//
// `sliceBetween` makes both cases fail LOUDLY, naming the anchor that moved:
//
//     const branch = sliceBetween(source, START, END, { label: 'teacher branch' });
//
// Use `indexOfOrThrow` when you need the position itself rather than a region.
//
// These throw plain Errors rather than taking expect() as a dependency, so
// they work anywhere (vitest, a dev-tools script, a node one-liner). A throw
// inside a test body fails that test with the message, which is what we want.

const MAX_ECHO = 120;

function show(anchor) {
  const text = String(anchor);
  const flat = text.replace(/\n/g, '\\n').replace(/\t/g, '\\t');
  return flat.length > MAX_ECHO ? `${flat.slice(0, MAX_ECHO)}…` : flat;
}

function describeTarget(options) {
  const file = options && options.file;
  const label = options && options.label;
  if (file && label) return ` (${label}, from ${file})`;
  if (file) return ` (from ${file})`;
  if (label) return ` (${label})`;
  return '';
}

// Nearly-right anchors are the common failure: a renamed prop, a changed
// operator, an added qualifier. Point at the closest surviving line so the
// fix is obvious from the message alone.
function nearestHint(source, anchor) {
  const needle = String(anchor).trim();
  if (needle.length < 8) return '';
  const head = needle.slice(0, Math.max(8, Math.floor(needle.length * 0.6)));
  let at = source.indexOf(head);
  if (at === -1) {
    const words = needle.split(/\s+/).filter((w) => w.length > 3);
    for (const w of words.slice(0, 3)) {
      at = source.indexOf(w);
      if (at !== -1) break;
    }
  }
  if (at === -1) return '';
  const lineStart = source.lastIndexOf('\n', at) + 1;
  let lineEnd = source.indexOf('\n', at);
  if (lineEnd === -1) lineEnd = source.length;
  const line = source.slice(lineStart, lineEnd).trim();
  const lineNo = source.slice(0, lineStart).split('\n').length;
  return line ? `\n  Closest surviving text is line ${lineNo}: ${show(line)}` : '';
}

/**
 * indexOf that throws instead of returning -1.
 * @param {string} source     text to search
 * @param {string} anchor     literal to find
 * @param {object} [options]  { from, file, label }
 * @returns {number} index of the anchor
 */
export function indexOfOrThrow(source, anchor, options = {}) {
  if (typeof source !== 'string') throw new TypeError('indexOfOrThrow: source must be a string');
  if (typeof anchor !== 'string' || anchor === '') throw new TypeError('indexOfOrThrow: anchor must be a non-empty string');
  const from = Number.isInteger(options.from) ? options.from : 0;
  const at = source.indexOf(anchor, from);
  if (at === -1) {
    throw new Error(
      `Anchor not found${describeTarget(options)}: ${show(anchor)}` +
      `\n  The code this test pins has moved or been renamed. Update the anchor to match the source; do NOT delete the assertion.` +
      nearestHint(source, anchor)
    );
  }
  return at;
}

/**
 * Slice the region between two anchors, failing loudly if either is missing
 * or out of order. Never returns a silently-wrong region.
 *
 * @param {string} source        text to slice
 * @param {string} startAnchor   literal marking the start (included)
 * @param {string|null} endAnchor literal marking the end (excluded); null = to end of source
 * @param {object} [options]     { file, label, includeEnd, occurrence }
 * @returns {string} the region
 */
export function sliceBetween(source, startAnchor, endAnchor, options = {}) {
  const occurrence = Number.isInteger(options.occurrence) && options.occurrence > 0 ? options.occurrence : 1;
  let start = -1;
  let cursor = 0;
  for (let n = 0; n < occurrence; n += 1) {
    start = source.indexOf(startAnchor, cursor);
    if (start === -1) {
      if (n === 0) indexOfOrThrow(source, startAnchor, options); // throws with the good message
      throw new Error(
        `Start anchor${describeTarget(options)} occurs only ${n} time(s), but occurrence ${occurrence} was requested: ${show(startAnchor)}`
      );
    }
    cursor = start + startAnchor.length;
  }

  if (endAnchor === null || endAnchor === undefined) return source.slice(start);

  // Search for the end AFTER the start, so an end anchor that also appears
  // earlier in the file cannot produce a backwards (empty) region.
  const end = source.indexOf(endAnchor, start + startAnchor.length);
  if (end === -1) {
    const existsEarlier = source.lastIndexOf(endAnchor, start) !== -1;
    throw new Error(
      `End anchor not found after the start anchor${describeTarget(options)}: ${show(endAnchor)}` +
      (existsEarlier
        ? `\n  It DOES appear before the start anchor — the two anchors are in the wrong order, or the region moved.`
        : `\n  Without this bound the slice would run to the end of the file and the region would contain everything, so any toContain() would pass for free.`) +
      nearestHint(source, endAnchor)
    );
  }
  return source.slice(start, options.includeEnd ? end + endAnchor.length : end);
}

/**
 * Assert an anchor appears exactly `count` times (default 1). A duplicated
 * anchor means a slice picked an arbitrary one of them; a vanished anchor
 * means the pin is dead.
 */
export function expectAnchorCount(source, anchor, count = 1, options = {}) {
  const found = source.split(anchor).length - 1;
  if (found !== count) {
    throw new Error(
      `Anchor${describeTarget(options)} appears ${found} time(s), expected ${count}: ${show(anchor)}` +
      (found === 0 ? nearestHint(source, anchor) : '\n  A duplicated anchor makes any slice on it ambiguous.')
    );
  }
  return found;
}
