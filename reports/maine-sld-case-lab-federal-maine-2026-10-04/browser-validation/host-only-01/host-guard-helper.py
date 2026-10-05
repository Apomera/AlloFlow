from pathlib import Path
import hashlib,json
from urllib.request import urlopen
from datetime import datetime,timezone

ROOT=Path('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated')
REPORT=ROOT/'reports/maine-sld-case-lab-federal-maine-2026-10-04'
LOCAL=Path(__file__).with_name('jurisdiction-validation')/'host-only-01'
ARCHIVE=REPORT/'browser-validation/host-only-01'
PREVIEW=REPORT/'integration/source-preview'
sha=lambda b:hashlib.sha256(b).hexdigest()
preview=json.loads((PREVIEW/'preview.json').read_text())
runtime=json.loads((PREVIEW/'runtime.json').read_text())
frozen=json.loads((REPORT/'frozen-activity.json').read_text())
proof=json.loads((REPORT/'browser-validation/append-proof.json').read_text())
assert not (LOCAL/'result.json').exists(),'Host browser already launched'
assert preview['sourceSha256']=='5cff82b2e09ad70500299f6b43266d9cb86e2184c1b3d61b23fe781b42976ac8'
assert preview['bundleSha256']=='69c86008789f489da23eb74cf3206e1101e48dfd86ef849c43632d466a86024f'
assert runtime['immutablePrimaryAssetsPreloadedBeforeListen'] and runtime['pureHttpServe']
tested=(PREVIEW/'tested-host.jsx').read_bytes()
assert sha(tested)==preview['sourceSha256']
assert sha((PREVIEW/'host.bundle.js').read_bytes())==preview['bundleSha256']
assert sha((PREVIEW/'maine_sld_practice_module.js').read_bytes())==frozen['moduleSha256']
for file,expected in frozen['sourceHashes'].items(): assert sha((ROOT/file).read_bytes())==expected,file
for file,expected in frozen['fourCopyHashes'].items():assert sha((ROOT/file).read_bytes())==expected,file
assert sha((ROOT/'tests/e2e/maine-sld-practice.spec.ts').read_bytes())==proof['browserTestSha256']
def route_reader(text):
    start=text.index('// __ALLO_STEM_DEEP_LINKS_BEGIN__')
    fn=text.index('const _alloReadShellDeepLinkTool =',start)
    end=text.index('\n};',fn)+3
    return text[start:end]
tested_route=route_reader(tested.decode('utf-8'))
observed=[]
for file in ('AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx'):
    current=(ROOT/file).read_bytes();region=route_reader(current.decode('utf-8'))
    assert region==tested_route,file+' route reader drifted'
    observed.append({'file':file,'sha256':sha(current),'matchesTestedWholeHost':sha(current)==preview['sourceSha256'],'borrowedRouteReaderMatchesTestedSnapshot':True,'borrowedRouteReaderSha256':sha(region.encode('utf-8'))})
http=[]
for path,file,expected in [('/__sld_preview/host.bundle.js','host.bundle.js',preview['bundleSha256']),('/app/maine_sld_practice_module.js?v=fec6407e','maine_sld_practice_module.js',frozen['moduleSha256'])]:
    with urlopen('http://127.0.0.1:65063'+path,timeout=15) as response:
        data=response.read();status=response.status
    assert status==200 and sha(data)==expected,path
    (LOCAL/('preflight-http-'+file)).write_bytes(data)
    http.append({'path':path,'status':status,'bytes':len(data),'sha256':sha(data),'matchesImmutableSnapshot':True})
history={'status':'STOPPED_BEFORE_BROWSER_LAUNCH','exitCode':1,'cause':'Overbroad current whole-host exact-hash guard found unrelated shared-host drift before Playwright launch.','browserAttemptLaunched':False,'expectedHostSha256':preview['sourceSha256'],'observedWholeHostSha256':'90a8fd750273edad17a570146cc8a7793b5cc4ea8af21a1209a254ef41c605ba','preservedProductFiles':True,'resolution':'Validate immutable served host snapshot and exact borrowed route-reader region; retain current whole-host hashes separately; no rebuild.'}
guard={'verifiedAt':datetime.now(timezone.utc).isoformat(),'status':'READY','testedHostSourceSha256':preview['sourceSha256'],'testedHostBundleSha256':preview['bundleSha256'],'moduleSha256':frozen['moduleSha256'],'sourceSha256':frozen['sourceHashes']['maine_sld_practice_source.jsx'],'browserTestSha256':proof['browserTestSha256'],'observedCurrentHosts':observed,'currentHostThreeCopyParity':len(set(x['sha256'] for x in observed))==1,'borrowedRouteReaderBytePreserved':True,'borrowedRouteReaderSha256':sha(tested_route.encode('utf-8')),'immutableSnapshotRetained':True,'rebuildPerformed':False,'httpChecks':http}
for parent in (LOCAL,ARCHIVE):
    for name,obj in [('prelaunch-stopped-guard.json',history),('prelaunch-guard.json',guard)]:
        target=parent/name;assert not target.exists();target.write_text(json.dumps(obj,indent=2))
    (parent/'host-guard-helper.py').write_bytes(Path(__file__).read_bytes())
print(json.dumps(guard,indent=2))
