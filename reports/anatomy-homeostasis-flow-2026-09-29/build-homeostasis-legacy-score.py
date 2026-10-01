from pathlib import Path
import difflib

root=Path(__file__).resolve().parents[2]
folder=Path(__file__).resolve().parent
before=(root/'stem_lab/stem_tool_anatomy.js').read_text(encoding='utf-8')
old="            }else if(action==='restart'){if(!homeostasisChecksVisible(current))return previous;next.recap={};next.recapToken=token;next.recapContext=HOMEOSTASIS_RECAP_CONTEXT;next.recapFocusId=null;}"
new=next(line for line in (folder/'homeostasis-state.js').read_text(encoding='utf-8').splitlines() if "}else if(action==='restart')" in line)
if before.count(old)!=1:
    raise RuntimeError('Expected one current restart handler')
after=before.replace(old,new,1)
patch=''.join(difflib.unified_diff(before.splitlines(keepends=True),after.splitlines(keepends=True),fromfile='a/stem_lab/stem_tool_anatomy.js',tofile='b/stem_lab/stem_tool_anatomy.js'))
(folder/'homeostasis-legacy-score.patch').write_text(patch,encoding='utf-8',newline='\n')
original=(folder/'homeostasis-continuity.patch').read_text(encoding='utf-8')
if original.count('+'+old)!=1:
    raise RuntimeError('Expected one original restart addition')
(folder/'homeostasis-continuity.patch').write_text(original.replace('+'+old,'+'+new,1),encoding='utf-8',newline='\n')
print('Wrote legacy-score follow-up and refreshed original patch')
