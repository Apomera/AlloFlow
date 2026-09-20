'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),sha=value=>crypto.createHash('sha256').update(value).digest('hex');
function buildSeams(){
 const evidence=[];
 function region(file,start,end){const source=fs.readFileSync(path.join(root,file),'utf8'),from=source.indexOf(start),to=source.indexOf(end,from+start.length);if(from<0||to<0)throw new Error('Missing production boundary: '+file+' '+start);const value=source.slice(from,to);evidence.push({file,startLine:source.slice(0,from).split('\n').length,endLine:source.slice(0,to).split('\n').length-1,sha256:sha(value)});return value;}
 const shell='AlloFlowANTI.txt',eol=fs.readFileSync(path.join(root,shell),'utf8').includes('\r\n')?'\r\n':'\n';
 const reader=region(shell,'  const openReadingArtifact = ','  const getFilteredHistory =');
 const updater=region('host_handlers_source.jsx','const onUpdateResource = ','function resumeReadThisPage(');
 const resolver=region(shell,'  const resolveAssignmentResources = useCallback(','  // Shared packet builder');
 const serializer=region('live_aac_source.jsx','const _alloSerializeResourceForStudentPack =','const LiveAacBoardDialog =');
 const storage=region(shell,'        const serializeItems = ','        try {'+eol+'            const fullPayload');
 const codec=region(shell,'function _alloBase64UrlEncode(','function _alloReadAlloPackParam(');
 const restoreWrapper=region(shell,'  const pendingQrAssignmentOpenGenerationRef = useRef(0);','  // BEGIN LEARNING_WEB_RESOURCE_OPEN_BRIDGE');
 const restoreEffect=region(shell,'  useEffect(() => {'+eol+'      if (!pendingQrAssignmentResource || isTeacherMode) return;','  useEffect(() => {');
 const ensure=region(shell,'    var __alloLazyEnsurePromises =','    // Teaching-script research and editor load');
 const output=`// Generated from current production code. Do not edit.\n
export function createReaderHost(deps){const {history,inputText,sourceTopic,gradeLevel,leveledTextLanguage,activeUnitId,selectedReadingSourceId,stopPlayback,setSelectionMenu,setRevisionData,setPhonicsData,setIsEditingLeveledText,setIsFluencyMode,setIsCompareMode,setInteractionMode,setGeneratedContent,setActiveView,setHistory,addToast,handleGenerate,_resourceMutationStateRef,onUpdateResource,callGemini,cleanJson}=deps;
${reader}
return {openReadingArtifact,handleReadOriginal,handleCreateAdaptedCompanion,handleUpdateReadingSupports,handleGenerateReadingSupports};}
export function createUpdater(__d){${updater}\nreturn onUpdateResource;}
export function createResolver(history,generatedContent,_alloStudentSafeResources){const useCallback=fn=>fn;${resolver}\nreturn resolveAssignmentResources;}
export function serializeOffline(items){const warnLog=()=>{};${storage}\nreturn serializeItems(items,false);}
${serializer}
export const serializeStudent=_alloSerializeResourceForStudentPack;
${codec}
export const encodePack=_alloEncodeAlloPack,decodePack=_alloDecodeAlloPack;
export function installLazyEnsure(){${ensure}}
export function usePendingRestore(React,deps){const useEffect=React.useEffect,useRef=React.useRef;const {pendingQrAssignmentResource,isTeacherMode,setPendingQrAssignmentResource,addToast,warnLog,_alloMiscHandlersDeps}=deps;${restoreWrapper}\n${restoreEffect}}
`;
 fs.writeFileSync(path.join(__dirname,'production-seams.generated.js'),output);
 for(const file of ['instructional_context_module.js','firestore_sync_module.js','session_transport_module.js','shared_activity_module.js','generate_dispatcher_module.js','view_simplified_module.js','doc_pipeline_module.js','misc_handlers_module.js','dompurify/3.1.7/purify.min.js'])evidence.push({file,sha256:sha(fs.readFileSync(path.join(root,file)))});
 fs.writeFileSync(path.join(__dirname,'production-evidence.json'),JSON.stringify({generatedAt:new Date().toISOString(),evidence},null,2));return evidence;
}
module.exports={buildSeams};if(require.main===module)buildSeams();