// Reverse only the later, additive shared-age probe before historical digests.
export function stripStoryAgeProbe(region) {
  const start = region.indexOf('        function storyAgeStage(profile, age) {');
  if (start < 0) return region;
  const end = region.indexOf('        function renderCompare() {', start);
  if (end <= start) throw new Error('Missing shared-age helper boundary');
  region = region.slice(0, start) + region.slice(end);
  function remove(from, to = '') {
    if (region.split(from).length !== 2) throw new Error('Unexpected shared-age addition: ' + from);
    region = region.replace(from, () => to);
  }
  remove('        var storyAgeState = useState(18);\n');
  remove('          var ageCursor = compact ? storyProbeAge(a0, a1) : null;\n          var ageStage = compact ? storyAgeStage(prof, ageCursor) : null;\n');
  const marker = region.indexOf("            compact && h('g', { 'data-career-age-marker':");
  const tail = region.indexOf('          );\n        }\n        function segPayText', marker);
  if (marker < 0 || tail <= marker) throw new Error('Missing shared-age marker boundary');
  region = region.slice(0, marker) + region.slice(tail);
  remove('String(a));\n            }),\n          );', 'String(a));\n            })\n          );');
  remove('              renderCompareAgeReading(st, P[st.id], a0, a1),\n');
  remove('            renderCompareAgeControls(pa, pb, a0, a1),\n');
  remove("{ 'data-career-age-comparison': '', className: 'space-y-4' }", "{ className: 'space-y-4' }");
  return region;
}
