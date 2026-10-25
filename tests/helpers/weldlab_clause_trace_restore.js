const HOOK = `        var clauseLookupState = useState({ task: null, num: null });
        useEffect(function () {
          clauseLookupState[1]({ task: null, num: null });
        }, [clauseIdx, clauseAnswered]);
`;

// Remove only this additive post-answer exploration before older source hashes.
// No authored question, option, explanation, score or answer handler is replaced.
export function stripClauseTrace(source) {
  let result = source.replace(/\r\n/g, '\n');
  if (!result.includes(HOOK)) return result;
  const start = result.indexOf('        function renderClauseLookup(q, pick) {');
  const end = result.indexOf('        function renderClause() {', start);
  if (start < 0 || end < start) throw new Error('Clause trace preservation boundaries changed');
  result = result.slice(0, start) + result.slice(end);
  for (const addition of [HOOK, '              renderClauseLookup(q, pick),\n']) {
    if (result.split(addition).length !== 2) throw new Error('Clause trace preservation addition count changed');
    result = result.replace(addition, '');
  }
  return result;
}
