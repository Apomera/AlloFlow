from pathlib import Path
import hashlib,json,re,subprocess
report=Path(__file__).resolve().parent;root=Path.cwd();work=(root/'stem_lab/stem_tool_moonmission.js').read_bytes();assert work==(root/'desktop/web-app/public/stem_lab/stem_tool_moonmission.js').read_bytes();baseline=(report/'baseline/moonmission-working.js').read_bytes();assert hashlib.sha256(baseline).hexdigest()=='31163a7c118d2f4c6df0c173c3e428ff4fad1b3f3a48582723b5057508b9b0f4'
patch=(root/'reports/moon-mission-enhancement-pass4-2026-09-28/baseline/preexisting-moonwalk.patch').read_text(encoding='utf8');section=patch.split('diff --git a/stem_lab/stem_tool_moonmission.js b/stem_lab/stem_tool_moonmission.js\n')[1].split('\ndiff --git ')[0];hunks=re.split(r'^@@.*@@.*\n',section,flags=re.M)[1:];assert len(hunks)==34
def reverse(data):
 text=data.decode('utf8').replace('\r\n','\n')
 for hunk in hunks:
  old='';new=''
  for line in hunk.splitlines(keepends=True):
   if line.startswith(' '):old+=line[1:];new+=line[1:]
   elif line.startswith('-'):old+=line[1:]
   elif line.startswith('+'):new+=line[1:]
  assert text.count(new)==1,(text.count(new),new[:100]);text=text.replace(new,old,1)
 return text.encode('utf8')
candidate=reverse(work);head=subprocess.check_output(['git','show','HEAD:stem_lab/stem_tool_moonmission.js']);assert reverse(baseline)==head;assert subprocess.check_output(['git','show','HEAD:desktop/web-app/public/stem_lab/stem_tool_moonmission.js'])==head
(report/'commit-source.tmp').write_bytes(candidate)
meta={'baselineWorkingSha256':hashlib.sha256(baseline).hexdigest(),'baselineCommittedSha256':hashlib.sha256(head).hexdigest(),'workingSha256':hashlib.sha256(work).hexdigest(),'candidateSha256':hashlib.sha256(candidate).hexdigest(),'excludedMoonwalkHunks':34};(report/'source-verification.json').write_text(json.dumps(meta,indent=2)+'\n',encoding='utf8');print(json.dumps(meta))
