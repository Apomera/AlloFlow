export function stripBidRateExplorer(source) {
  let result = source.replace(/\r\n/g, '\n');
  const hook = '        var bidRateState = useState(null);\n';
  if (!result.includes(hook)) return result;
  const start = result.indexOf('        function renderBidRateExplorer(prob) {');
  const end = result.indexOf('        function renderMathProblem(kind) {', start);
  if (start < 0 || end < start) throw new Error('Missing bid rate boundaries');
  result = result.slice(0, start) + result.slice(end);
  for (const addition of [hook, "              kind === 'bid' && w.showSol && renderBidRateExplorer(prob),\n"]) {
    if (result.split(addition).length !== 2) throw new Error('Unexpected bid explorer preservation count');
    result = result.replace(addition, '');
  }
  return result;
}
