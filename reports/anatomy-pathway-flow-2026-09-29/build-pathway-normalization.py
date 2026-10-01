from pathlib import Path
import difflib

root = Path(__file__).resolve().parents[2]
folder = Path(__file__).resolve().parent
before = (root / 'stem_lab/stem_tool_anatomy.js').read_text(encoding='utf-8')
after = before

def replace(old, new):
    global after
    if after.count(old) != 1:
        raise RuntimeError(f'Expected one match, found {after.count(old)}: {old[:100]}')
    after = after.replace(old, new, 1)

replace("        function pathwayById(id) { return PATHWAYS.find(function(pathway) { return pathway.id === id; }) || null; }", """        function pathwayById(id) { return PATHWAYS.find(function(pathway) { return pathway.id === id; }) || null; }
        function normalizedPathwayStep(state, pw) {
          var position = Number(state._pathwayStep);
          return pw && Number.isFinite(position) ? Math.max(0,Math.min(Math.floor(position),pw.steps.length-1)) : 0;
        }""")
replace("          var position = Number(state._pathwayStep), step = Number.isFinite(position) ? Math.max(0,Math.min(Math.floor(position),pw.steps.length-1)) : 0;", "          var step = normalizedPathwayStep(state,pw);")
replace("""        var rawPathwayStepIdx = Number(d._pathwayStep);
        var pathwayStepIdx = activePathway && Number.isFinite(rawPathwayStepIdx) ? Math.max(0,Math.min(Math.floor(rawPathwayStepIdx),activePathway.steps.length-1)) : 0;""", "        var pathwayStepIdx = normalizedPathwayStep(d,activePathway);")
needle = 'Number(state._pathwayStep || 0) !== pathwayStepIdx'
if after.count(needle) != 3:
    raise RuntimeError(f'Expected three fresh step guards, found {after.count(needle)}')
after = after.replace(needle, 'normalizedPathwayStep(state,pw) !== pathwayStepIdx')
replace("{_pathwayRecap:{active:true,version:2,pathwayId:pw.id,context:pathwayCheckContext(pw),token:token,answers:{}},_pathwayRecapReturn:null}", "{_pathwayStep:normalizedPathwayStep(state,pw),_pathwayRecap:{active:true,version:2,pathwayId:pw.id,context:pathwayCheckContext(pw),token:token,answers:{}},_pathwayRecapReturn:null}")
patch = ''.join(difflib.unified_diff(before.splitlines(keepends=True),after.splitlines(keepends=True),fromfile='a/stem_lab/stem_tool_anatomy.js',tofile='b/stem_lab/stem_tool_anatomy.js'))
(folder / 'pathway-normalization.patch').write_text(patch,encoding='utf-8',newline='\n')
print(f'Wrote {len(patch.splitlines())} normalization patch lines')
