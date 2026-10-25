/** Remove only the local t8/5 sweep introduced by the model refresh. */
export function stripT85Sweep(source) {
  let out = source.replace(/\r\n/g, '\n');
  const start = out.indexOf('        // Local thickness reference: the existing t8/5 model, without saved-state writes.\n');
  const end = out.indexOf('        function renderT85(m) {\n', start);
  if (start < 0 || end < start) throw new Error('Missing t8/5 sweep helper bounds');
  out = out.slice(0, start) + out.slice(end);
  const hook = '        var t85ProbeState = useState(null);\n';
  const call = '            ),\n            renderT85ThicknessSweep()\n';
  if (!out.includes(hook) || !out.includes(call)) throw new Error('Missing t8/5 sweep hook or call');
  return out.replace(hook, '').replace(call, '            )\n');
}
