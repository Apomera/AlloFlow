const HOOK = '        var diagnoseSectionState = useState(null);\n        useEffect(function () { diagnoseSectionState[1](null); }, [ddIdx2]);\n';
const CALL = '            ddAns2 && renderDiagnoseSection(),\n';

// Remove only the later, additive section-plane exploration before historical
// source comparisons. The original vignette pictures and every handler remain.
export function stripDiagnoseSection(source) {
  let result = source.replace(/\r\n/g, '\n');
  if (!result.includes(HOOK)) return result;
  const start = result.indexOf('        function renderDiagnoseSection() {');
  const end = result.indexOf('        function causeRadio(c, sel, onPick, compact, disabledOpt) {', start);
  if (start < 0 || end < start) throw new Error('Diagnose section preservation boundaries changed');
  result = result.slice(0, start) + result.slice(end);
  for (const addition of [HOOK, CALL]) {
    if (result.split(addition).length !== 2) throw new Error('Diagnose section preservation addition count changed');
    result = result.replace(addition, '');
  }
  return result;
}
