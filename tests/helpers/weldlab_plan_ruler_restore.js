export function stripPlanRuler(source) {
  let result = source.replace(/\r\n/g, '\n');
  const hook = '        var planRulerState = useState(false);\n';
  if (!result.includes(hook)) return result;
  const start = result.indexOf('        function renderPlanRuler(p, overlay) {');
  const end = result.indexOf('        function renderFloorTab() {', start);
  if (start < 0 || end < start) throw new Error('Missing floor ruler helper');
  result = result.slice(0, start) + result.slice(end);
  for (const [from, to] of [
    [hook, ''],
    ["'data-plan-ruler-workspace': '', ", ''],
    ['                  marks,\n                  renderPlanRuler(p, true)\n', '                  marks\n'],
    ['            renderPlanRuler(p, false),\n', ''],
  ]) {
    if (result.split(from).length !== 2) throw new Error('Unexpected plan ruler preservation count');
    result = result.replace(from, () => to);
  }
  return result;
}
