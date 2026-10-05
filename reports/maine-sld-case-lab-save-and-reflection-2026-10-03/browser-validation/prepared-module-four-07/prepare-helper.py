from pathlib import Path
import copy
import difflib
import hashlib
import json
import sys

ROOT=Path('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated')
LOCAL=Path(__file__).with_name('save-and-reflection-validation')
REPORT=ROOT/'reports/maine-sld-case-lab-save-and-reflection-2026-10-03/browser-validation'
NODE='C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
MODULE='8771e0b351b088fe301060ffb8ce6be5ad6bb2df8504c8b5dc1ef2cf5927ca3a'
SPEC='32341725cd74244a0f50c9fb149b500bea68fcc179f5de41ba4d862e499014b8'
CSS='b104c6faca4db538b15c97b19fb5176ffa02308a82f3a3c5e3df8d0c3537b163'
HTML='078937f26696db4b8fa0648f503db50f64a93d400418021b95f9c731c2d17b24'
INPUT_TEXT='@tailwind base;\n@tailwind components;\n@tailwind utilities;\n'
name=sys.argv[1]
assert name in ('prepared-module-four-06','prepared-module-four-07','prepared-host-only-02')
host_url=sys.argv[2] if len(sys.argv)>2 else 'http://127.0.0.1:65063/app'
run=LOCAL/name
assert not run.exists(),str(run)
sha=lambda body:hashlib.sha256(body).hexdigest()
producer=json.loads((LOCAL/'preparation-readiness-02/preparation-readiness.json').read_text(encoding='utf-8'))
frozen=json.loads((REPORT.parent/'frozen-activity.json').read_text(encoding='utf-8'))
assert frozen['moduleSha256']==MODULE
for rel,expected in {**frozen['sourceHashes'],**frozen['fourCopyHashes']}.items():assert sha((ROOT/rel).read_bytes())==expected,rel
original=(ROOT/'tests/e2e/maine-sld-practice.spec.ts').read_bytes()
assert sha(original)==SPEC
baseline=(REPORT/'baseline-31-spec.ts').read_bytes()
assert original.startswith(baseline) and sha(baseline)=='1444827ef5f968cdcae9de2fd31171e33f671dd6eaa304fb9e718df5e1f4d3ec'
producer_input=Path(producer['command'][producer['command'].index('-i')+1])
producer_html=Path(producer['command'][-1].split(',')[-1])
prepared_css=LOCAL/'preparation-readiness-02/preparation-readiness.css'
assert producer['inputHashes']['module']==MODULE
assert producer['inputHashes']['html']==HTML
assert producer['outputSha256']==CSS==producer['priorOutputSha256']
assert producer_input.read_text(encoding='utf-8')==INPUT_TEXT
assert sha(producer_input.read_bytes())==producer['inputHashes']['input']
assert sha(producer_html.read_bytes())==HTML
assert sha(prepared_css.read_bytes())==CSS

files={
 'module':ROOT/'maine_sld_practice_module.js',
 'adminHub':ROOT/'admin_hub_module.js',
 'appStyles':ROOT/'app_styles_module.js',
 'sourceHost':ROOT/'AlloFlowANTI.txt',
 'caseData':ROOT/'maine_sld_case_data.json',
 'browserSpec':ROOT/'tests/e2e/maine-sld-practice.spec.ts',
 'originalPlaywrightConfig':ROOT/'playwright.config.ts',
 'tailwindCli':ROOT/'desktop/web-app/node_modules/tailwindcss/lib/cli.js',
 'tailwindPackage':ROOT/'desktop/web-app/node_modules/tailwindcss/package.json',
 'playwrightPackage':ROOT/'node_modules/@playwright/test/package.json',
 'reactRuntime':ROOT/'desktop/web-app/node_modules/react/umd/react.production.min.js',
 'reactDomRuntime':ROOT/'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js',
 'nodeRuntime':Path(NODE),
 'preparedCss':prepared_css,
 'producerInput':producer_input,
 'producerHtml':producer_html,
}
optional={}
for base in (ROOT,ROOT/'desktop/web-app'):
 for filename in ('package.json','package-lock.json','npm-shrinkwrap.json','yarn.lock','pnpm-lock.yaml','tailwind.config.js','tailwind.config.cjs','tailwind.config.mjs','tailwind.config.ts','postcss.config.js','postcss.config.cjs','postcss.config.mjs'):
  file=base/filename
  optional[str(file)]=file.exists()
  if file.exists():files[str(file.relative_to(ROOT))]=file
identities={key:{'path':file.as_posix(),'sha256':sha(file.read_bytes())} for key,file in files.items()}
assert identities['module']['sha256']==MODULE
assert identities['adminHub']['sha256']==producer['inputHashes']['adminHub']
assert identities['appStyles']['sha256']==next(item['sha256'] for item in producer['httpChecks'] if item['path']=='/app_styles_module.js')
assert identities['preparedCss']['sha256']==CSS
trusted={'module':MODULE,'browserSpec':SPEC,'preparedCss':CSS,'producerHtml':HTML,'producerInput':producer['inputHashes']['input'],'adminHub':producer['inputHashes']['adminHub']}
manifest={'validationMethod':'unchanged test bodies with hash-verified prebuilt stylesheet setup','preparedAssetValidation':True,'files':identities,'trustedProducerHashes':trusted,'inputCssText':INPUT_TEXT,'generatedHarnessHtmlSha256':HTML,'producerReadinessFile':'preparation-readiness-02/preparation-readiness.json','producerReady':False,'optionalConfigurationAndLockPresence':optional,'knownLimits':['Stylesheet compilation was not rerun inside this supplemental browser invocation.','Original 02, 04 and 05 invocations failed in beforeAll before activity bodies.','Prepared stylesheet was compiled successfully by readiness02, whose readiness timing flag remained false.']}

def gate(candidate):
 assert candidate['inputCssText']==INPUT_TEXT,'input CSS text'
 assert candidate['generatedHarnessHtmlSha256']==HTML,'generated harness hash'
 for key,expected in trusted.items():assert candidate['files'][key]['sha256']==expected,key+' producer binding'
 for key,value in candidate['files'].items():assert value==identities[key],key+' exact file binding'
 return True

needle=b" execFileSync(process.execPath,[join(WEB,'node_modules','tailwindcss','lib','cli.js'),'-i',input,'-o',output,'--content',[join(ROOT,'admin_hub_module.js'),join(ROOT,'maine_sld_practice_module.js'),html].join(',')],{cwd:WEB,stdio:'pipe'});"
assert original.count(needle)==1
manifest_bytes=json.dumps(manifest,indent=2).encode()
replacement=(''' const preparedBody=await readFile(process.env.SLD_PREPARED_MANIFEST!);
 if(createHash('sha256').update(preparedBody).digest('hex')!=='''+json.dumps(sha(manifest_bytes))+''')throw new Error('Prepared manifest changed');
 const prepared=JSON.parse(preparedBody.toString('utf8'));
 const preparedSha=(body:Buffer|string)=>createHash('sha256').update(body).digest('hex');
 await Promise.all((Object.entries(prepared.files) as [string,{path:string,sha256:string}][]).map(async([key,value])=>{if(preparedSha(await readFile(value.path))!==value.sha256)throw new Error('Prepared asset changed: '+key);}));
 for(const [key,expected] of Object.entries(prepared.trustedProducerHashes)){if(prepared.files[key].sha256!==expected)throw new Error('Prepared producer binding changed: '+key);}
 if(await readFile(input,'utf8')!==prepared.inputCssText)throw new Error('Prepared input CSS differs');
 if(preparedSha(await readFile(html))!==prepared.generatedHarnessHtmlSha256)throw new Error('Generated harness differs from CSS producer');
 await writeFile(output,await readFile(prepared.files.preparedCss.path));''').encode()
supplemental=original.replace(needle,replacement)
assert supplemental.replace(replacement,needle)==original
offset=original.index(needle)
comparison={'canonicalBrowserTestSha256':SPEC,'supplementalSpecSha256':sha(supplemental),'originalBodiesBytePreserved':True,'originalDefinitionsHelpersAssertionsBytePreserved':True,'original31PrefixBytePreservedInCanonicalSpec':True,'onlyChangedSetupNeedle':needle.decode(),'originalNeedleSha256':sha(needle),'replacementSha256':sha(replacement),'unchangedPrefixBytes':offset,'unchangedPrefixSha256':sha(original[:offset]),'unchangedSuffixBytes':len(original)-offset-len(needle),'unchangedSuffixSha256':sha(original[offset+len(needle):]),'roundTripToOriginalSha256':sha(supplemental.replace(replacement,needle)),'originalConfigSha256':identities['originalPlaywrightConfig']['sha256'],'supplementalConfigOnlyChanges':['testDir','testMatch'],'noLibraryMonkeypatch':True,'workers':1,'automaticRetries':0,'timeoutMs':120000}
run.mkdir(parents=True)
temp=run/'temporary';temp.mkdir()
(temp/'prepared.spec.ts').write_bytes(supplemental)
(run/'canonical-original-spec.ts').write_bytes(original)
(run/'prepared-asset-manifest.json').write_bytes(manifest_bytes)
assert sha((run/'prepared-asset-manifest.json').read_bytes())==sha(manifest_bytes)
on_disk_manifest=json.loads((run/'prepared-asset-manifest.json').read_bytes())
assert on_disk_manifest==manifest and gate(on_disk_manifest)
on_disk_cache_checks=[]
for key in ('preparedCss','producerInput','producerHtml'):
 value=on_disk_manifest['files'][key]
 actual=sha(Path(value['path']).read_bytes())
 assert actual==value['sha256']
 on_disk_cache_checks.append({'key':key,'actualOnDiskSha256':actual,'matchedManifest':True})
proof=[{'case':'exact on-disk serialized manifest and cache assets','accepted':True,'manifestOnDiskSha256':sha((run/'prepared-asset-manifest.json').read_bytes()),'matchesEmbeddedManifestSha256':True,'onDiskCacheChecks':on_disk_cache_checks}]
for title,mutate in (
 ('wrong module',lambda m:m['files']['module'].__setitem__('sha256','0'*64)),
 ('wrong CSS',lambda m:m['files']['preparedCss'].__setitem__('sha256','0'*64)),
 ('wrong generated harness',lambda m:m.__setitem__('generatedHarnessHtmlSha256','0'*64)),
):
 altered=copy.deepcopy(on_disk_manifest);mutate(altered)
 try:gate(altered)
 except AssertionError as error:proof.append({'case':title,'accepted':False,'rejection':str(error),'mutationBasedOnActualSerializedManifest':True})
 else:raise AssertionError(title+' incorrectly accepted')
(run/'prepare-helper.py').write_bytes(Path(__file__).read_bytes())
(run/'prepared-gate-mutation-proof.json').write_text(json.dumps(proof,indent=2),encoding='utf-8')
(run/'setup-byte-preservation.json').write_text(json.dumps(comparison,indent=2),encoding='utf-8')
(run/'supplemental-spec.diff').write_text(''.join(difflib.unified_diff(original.decode().splitlines(True),supplemental.decode().splitlines(True),fromfile='canonical-original-spec.ts',tofile='temporary/prepared.spec.ts')),encoding='utf-8')
config="import original from "+json.dumps((ROOT/'playwright.config.ts').as_posix())+";\nexport default {...original,testDir:"+json.dumps(temp.as_posix())+",testMatch:'prepared.spec.ts'};\n"
(temp/'playwright.config.ts').write_bytes(config.encode())
grep='|'.join(['participant planning review keeps all five case reflections','planning reflection edits return by keyboard','session save warning preserves open work and focus','expired tab work can be recovered while optional guide reflection']) if 'module-four' in name else 'public deep link opens the case directly'
command=f'''$ErrorActionPreference = 'Stop'
$env:SLD_PREPARED_MANIFEST = '{(run/'prepared-asset-manifest.json').as_posix()}'
$env:NODE_PATH = '{(ROOT/'node_modules').as_posix()}'
$env:SLD_HOST_BASE_URL = '{host_url}'
$env:SLD_REPORT_DIR = '{(run/'browser').as_posix()}'
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = '{(run/'result.json').as_posix()}'
& '{NODE}' node_modules/@playwright/test/cli.js test --config='{(temp/'playwright.config.ts').as_posix()}' --project=chromium --workers=1 --retries=0 --grep='{grep}' --reporter=list,json --output='{(run/'artifacts').as_posix()}' 2>&1 | Tee-Object -FilePath '{(run/'run.log').as_posix()}'
exit $LASTEXITCODE
'''
(run/'run-command.ps1').write_text(command,encoding='utf-8')
identity={'phase':'prepared-module-four' if 'module-four' in name else 'prepared-host-only','expectedModuleSha256':MODULE,'browserTestSha256':SPEC,'supplementalSpecSha256':sha(supplemental),'originalBodiesBytePreserved':True,'preparedAssetValidation':True,'validationMethod':manifest['validationMethod'],'selectedScenarios':4 if 'module-four' in name else 1,'workers':1,'automaticRetries':0,'testTimeoutMs':120000,'normalTracePolicy':'retain-on-failure','sourceHashes':frozen['sourceHashes'],'fourCopyHashes':frozen['fourCopyHashes'],'hostUrl':host_url,'configSha256':identities['originalPlaywrightConfig']['sha256'],'supplementalConfigSha256':sha(config.encode()),'manifestSha256':sha((run/'prepared-asset-manifest.json').read_bytes()),'gateMutationProofSha256':sha((run/'prepared-gate-mutation-proof.json').read_bytes()),'setupBytePreservationSha256':sha((run/'setup-byte-preservation.json').read_bytes())}
identity['helperSourceSha256']=sha((run/'prepare-helper.py').read_bytes())
(run/'run-identity.json').write_text(json.dumps(identity,indent=2),encoding='utf-8')
print(json.dumps({'runCommand':str(run/'run-command.ps1'),'manifest':str(run/'prepared-asset-manifest.json'),'comparison':comparison,'gateMutationProof':proof},indent=2))
