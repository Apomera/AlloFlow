from pathlib import Path
import subprocess,os,json,hashlib
root=Path.cwd();report=Path(__file__).resolve().parent
manifest=json.loads((report/'manifest.tmp.json').read_text(encoding='utf8'));assert len(manifest)==len(set(manifest));assert all((root/p).is_file() for p in manifest)
baseenv=dict(os.environ);baseenv.pop('GIT_INDEX_FILE',None)
def git(args,data=None,env=None):
 p=subprocess.run(['git',*args],input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env or baseenv);assert p.returncode==0,(args,p.returncode,p.stderr.decode('utf8',errors='replace'));return p.stdout
def indexmap():
 rows=git(['ls-files','--stage','-z']);return {row.split(b'\t',1)[1].decode('utf8'):row.split(b'\t',1)[0] for row in rows.split(b'\0') if row}
assert not git(['diff','--cached','--name-only','-z','--',*manifest]);original=indexmap();parent=git(['rev-parse','HEAD']).decode().strip();source=(report/'commit-source.tmp').read_bytes();meta=json.loads((report/'source-verification.json').read_text(encoding='utf8'));assert hashlib.sha256(source).hexdigest()==meta['candidateSha256']
runtimes=['stem_lab/stem_tool_moonmission.js','desktop/web-app/public/stem_lab/stem_tool_moonmission.js'];working={p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in runtimes};assert len(set(working.values()))==1 and next(iter(working.values()))==meta['workingSha256']
idx=report/'commit-index.tmp';assert not idx.exists();env=dict(baseenv,GIT_INDEX_FILE=str(idx));git(['read-tree',parent],env=env);git(['add','--',*manifest],env=env);blob=git(['hash-object','-w','--stdin'],source).decode().strip()
for p in runtimes:git(['update-index','--cacheinfo','100644,'+blob+','+p],env=env)
paths={p.decode('utf8') for p in git(['diff','--cached','--name-only','-z'],env=env).split(b'\0') if p};assert paths==set(manifest),(paths^set(manifest));git(['diff','--cached','--check'],env=env);assert git(['rev-parse','HEAD']).decode().strip()==parent
p=subprocess.run(['git','commit','-m','Simulate finite-thrust lunar departure in Moon Mission'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env);(report/'commit-console.tmp.txt').write_bytes(p.stdout+b'\n'+p.stderr);assert p.returncode==0,(p.returncode,p.stderr.decode('utf8',errors='replace'))
commit=git(['rev-parse','HEAD']).decode().strip();assert git(['rev-parse',commit+'^']).decode().strip()==parent;committed={p.decode('utf8') for p in git(['diff-tree','--no-commit-id','--name-only','-r','-z',commit]).split(b'\0') if p};assert committed==set(manifest)
for path in runtimes:
 assert git(['show',commit+':'+path])==source;assert hashlib.sha256((root/path).read_bytes()).hexdigest()==working[path]
before=indexmap();assert all(before.get(p)==original.get(p) for p in manifest),'Selected real index changed during commit'
git(['reset','-q',commit,'--',*manifest]);after=indexmap();assert {k:v for k,v in before.items() if k not in manifest}=={k:v for k,v in after.items() if k not in manifest};assert not git(['diff','--cached','--name-only','-z','--',*manifest])
result={'commit':commit,'parent':parent,'paths':sorted(committed),'fileCount':len(manifest),'workingSha256':meta['workingSha256'],'committedSha256':meta['candidateSha256'],'normalHooks':True,'unrelatedIndexPreserved':True,'excludedMoonwalkHunks':34};(report/'commit-result.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf8');print(json.dumps(result))
