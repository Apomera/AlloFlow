/* State reference records are independent of the fictional Maine worksheet. */
(function(root) {
  'use strict';
  const STATES = Object.freeze(['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','District of Columbia','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming']);
  const FORMAT = 'alloflow-sld-state-references', VERSION = 2;
  const STORAGE_KEY = 'alloflow-maine-sld-state-references-v1';
  const LIMITS = Object.freeze({ sourcesPerState:4, sourcesTotal:12, content:600000, totalContent:1200000, excerpt:50000, notes:10000, comparisonNote:2000, followUp:1000, json:4000000 });
  const COMPARISON_TOPICS = Object.freeze([
    {id:'criteria',label:'Criteria and process',prompt:'What criteria and process does this state require?'},
    {id:'language',label:'Language and assessment validity',prompt:'How does the source address language, assessment validity and multilingual learners?'},
    {id:'intervention',label:'Intervention and observation',prompt:'What intervention-response and classroom-observation evidence is needed?'},
    {id:'exclusions',label:'Exclusionary considerations',prompt:'What exclusionary considerations must the team document?'},
    {id:'special-education',label:'Need for special education',prompt:'How is the need for special education considered separately?'},
    {id:'documentation',label:'Forms, documentation and timelines',prompt:'What local forms, documentation and timelines need verification?'}
  ].map(Object.freeze));
  const isObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const today = () => { const d=new Date(); return String(d.getFullYear()).padStart(4,'0')+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
  function field(value,max,label) {
    if (value == null) return '';
    if (typeof value !== 'string') throw new Error(label + ' must be text.');
    if (value.length > max) throw new Error(label + ' exceeds ' + max.toLocaleString('en-US') + ' characters. Keep a shorter source excerpt or save the complete document separately.');
    return value;
  }
  function date(value,label) {
    const result=field(value,10,label);
    if(result && (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(Date.parse(result+'T00:00:00Z')) || new Date(result+'T00:00:00Z').toISOString().slice(0,10)!==result)) throw new Error(label+' must be a valid date or blank.');
    return result;
  }
  function safeUrl(value) {
    if(typeof value!=='string' || value.length>2048 || /[\u0000-\u0020\u007f]/.test(value))return '';
    try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&u.hostname&&!u.username&&!u.password?u.href:'';}catch(_){return '';}
  }
  function stateName(value) { if(!STATES.includes(value))throw new Error('Choose a listed state or the District of Columbia.');return value; }
  function emptySource() {
    const id=root.crypto&&typeof root.crypto.randomUUID==='function'?root.crypto.randomUUID():'ref-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
    return {id,revision:1,title:'',url:'',fileName:'',effectiveDate:'',checkedDate:'',pageSection:'',excerpt:'',transferNotes:'',content:'',importMethod:'manual',fileFormat:'',extractionMethod:'',documentPartCount:0,fileSize:0,fileContentHash:'',fileLastModified:0,reviewed:false,reviewedAt:''};
  }
  function normalizeSource(input) {
    if(!isObject(input))throw new Error('Each reference must be a source record.');
    const s={};
    for(const [key,max] of Object.entries({id:100,title:500,url:2048,fileName:500,pageSection:1000,excerpt:LIMITS.excerpt,transferNotes:LIMITS.notes,content:LIMITS.content,fileFormat:50,extractionMethod:100,fileContentHash:200}))s[key]=field(input[key],max,key);
    if(!s.id || !/^[A-Za-z0-9_-]+$/.test(s.id))throw new Error('A reference has an invalid identifier.');
    if(s.url && !safeUrl(s.url))throw new Error('Source links must be complete HTTP or HTTPS URLs without credentials or spaces.');
    for(const key of ['effectiveDate','checkedDate','reviewedAt'])s[key]=date(input[key],key);
    s.importMethod=['manual','local-file','web-search'].includes(input.importMethod)?input.importMethod:'manual';
    for(const key of ['documentPartCount','fileSize','fileLastModified'])s[key]=Number.isSafeInteger(input[key])&&input[key]>=0?input[key]:0;
    s.reviewed=input.reviewed===true;
    if(s.reviewed && (!s.title.trim() || !s.excerpt.trim() || !s.checkedDate))throw new Error('Review requires a source title, an exact excerpt and a date checked.');
    if(!s.reviewed)s.reviewedAt='';
    s.revision=Number.isSafeInteger(input.revision)&&input.revision>=1?input.revision:1;
    return s;
  }
  function emptyWorkspace(){return {format:FORMAT,version:VERSION,activeState:'Maine',byState:{}};}
  function normalizeWorkspace(input) {
    if(!isObject(input)||input.format!==FORMAT||![1,VERSION].includes(input.version)||!isObject(input.byState))throw new Error('Use a supported State references JSON file downloaded from this workspace (version 1 or 2).');
    const output=emptyWorkspace();output.activeState=stateName(input.activeState);
    let count=0,characters=0;const ids=new Set();
    for(const state of Object.keys(input.byState)){
      stateName(state);const record=input.byState[state];
      if(!isObject(record)||!Array.isArray(record.sources)||record.sources.length>LIMITS.sourcesPerState)throw new Error('Keep at most four references for each state.');
      const sources=record.sources.map(source=>{
        if(input.version===VERSION && (!Number.isSafeInteger(source.revision)||source.revision<1))throw new Error('A version 2 source has an invalid revision. Your current workspace is unchanged.');
        const normalized=normalizeSource(source);if(input.version===1)normalized.revision=1;return normalized;
      });
      for(const s of sources){if(ids.has(s.id))throw new Error('A source identifier is repeated in the reference file.');ids.add(s.id);count++;characters+=s.content.length;}
      output.byState[state]={sources,comparison:normalizeComparison(input.version===1?null:record.comparison)};
    }
    if(count>LIMITS.sourcesTotal)throw new Error('Keep at most twelve references across this workspace. Download a backup before removing older references.');
    if(characters>LIMITS.totalContent)throw new Error('The combined document text exceeds the workspace limit. Download a backup and keep selected excerpts instead.');
    if(JSON.stringify(output,null,2).length>LIMITS.json)throw new Error('The complete reference backup exceeds the workspace size limit. Keep selected excerpts instead of full document text.');
    return output;
  }
  function topicName(value){if(!COMPARISON_TOPICS.some(topic=>topic.id===value))throw new Error('Choose one of the six comparison topics.');return value;}
  function emptyComparisonEntry(){return {sourceId:'',note:'',followUp:'',status:'draft',checkedRevision:0,checkedAt:''};}
  function normalizeComparisonEntry(input){
    if(!isObject(input))throw new Error('Each comparison topic must be a record.');
    const entry=emptyComparisonEntry();
    entry.sourceId=field(input.sourceId,100,'Primary reference identifier');
    if(entry.sourceId&&!/^[A-Za-z0-9_-]+$/.test(entry.sourceId))throw new Error('A comparison has an invalid primary reference identifier.');
    entry.note=field(input.note,LIMITS.comparisonNote,'Comparison note');
    entry.followUp=field(input.followUp,LIMITS.followUp,'Follow-up question');
    entry.status=['draft','follow-up','recorded'].includes(input.status)?input.status:'draft';
    if(entry.status==='recorded'){
      entry.checkedRevision=Number.isSafeInteger(input.checkedRevision)&&input.checkedRevision>0?input.checkedRevision:0;
      try{entry.checkedAt=date(input.checkedAt,'Source check date');}catch(_){entry.checkedAt='';}
    }
    return entry;
  }
  function normalizeComparison(input){
    if(input!=null&&!isObject(input))throw new Error('The comparison plan must be a record.');
    for(const key of Object.keys(input||{}))topicName(key);
    return Object.fromEntries(COMPARISON_TOPICS.map(topic=>[topic.id,input&&Object.prototype.hasOwnProperty.call(input,topic.id)?normalizeComparisonEntry(input[topic.id]):emptyComparisonEntry()]));
  }
  function getComparison(workspace,state){stateName(state);return normalizeComparison(workspace.byState[state]&&workspace.byState[state].comparison);}
  function updateComparison(workspace,state,topic,patch){
    stateName(state);topicName(topic);if(!isObject(patch))throw new Error('Use text fields to update a comparison topic.');
    for(const key of Object.keys(patch))if(!['sourceId','note','followUp'].includes(key))throw new Error('Only the primary reference, comparison note and follow-up question can be edited.');
    const comparison=getComparison(workspace,state),previous=comparison[topic],next=normalizeComparisonEntry({...previous,...patch});
    if(['sourceId','note','followUp'].some(key=>next[key]!==previous[key])){next.status='draft';next.checkedRevision=0;next.checkedAt='';}
    comparison[topic]=next;
    return normalizeWorkspace({...workspace,byState:{...workspace.byState,[state]:{sources:getSources(workspace,state),comparison}}});
  }
  function setComparisonCheck(workspace,state,topic,status){
    stateName(state);topicName(topic);const comparison=getComparison(workspace,state),entry={...comparison[topic],status,checkedRevision:0,checkedAt:''};
    if(status==='recorded'){
      const source=getSources(workspace,state).find(row=>row.id===entry.sourceId);
      if(!source||!source.reviewed||!entry.note.trim())throw new Error('Choose a reviewed primary reference and enter a comparison note before recording a source check.');
      entry.checkedRevision=source.revision;entry.checkedAt=today();
    }
    comparison[topic]=entry;
    return normalizeWorkspace({...workspace,byState:{...workspace.byState,[state]:{sources:getSources(workspace,state),comparison}}});
  }
  const flagComparison=(workspace,state,topic)=>setComparisonCheck(workspace,state,topic,'follow-up');
  const recordComparison=(workspace,state,topic)=>setComparisonCheck(workspace,state,topic,'recorded');
  function comparisonStatus(workspace,state,topic){
    topicName(topic);const entry=getComparison(workspace,state)[topic];
    if(entry.status==='recorded'){
      const source=getSources(workspace,state).find(row=>row.id===entry.sourceId);
      return source&&source.reviewed&&entry.note.trim()&&entry.checkedAt&&entry.checkedRevision===source.revision?'recorded':'recheck';
    }
    if(entry.status==='follow-up')return 'follow-up';
    return entry.sourceId||entry.note.trim()||entry.followUp.trim()?'draft':'unstarted';
  }
  function comparisonSummary(workspace,state){const counts={unstarted:0,draft:0,'follow-up':0,recorded:0,recheck:0};for(const topic of COMPARISON_TOPICS)counts[comparisonStatus(workspace,state,topic.id)]++;return counts;}
  function getSources(workspace,state){return workspace.byState[state] ? workspace.byState[state].sources : [];}
  function selectState(workspace,state){return {...workspace,activeState:stateName(state)};}
  function editSource(source,patch) {
    const edited={...source,...patch};
    const changed=['id','title','url','fileName','effectiveDate','checkedDate','pageSection','excerpt','content','transferNotes','importMethod','fileFormat','extractionMethod','documentPartCount','fileSize','fileContentHash','fileLastModified'].some(key=>Object.prototype.hasOwnProperty.call(patch,key)&&patch[key]!==source[key]);
    if(changed){edited.reviewed=false;edited.reviewedAt='';}
    else if(Object.prototype.hasOwnProperty.call(patch,'reviewed'))edited.reviewedAt=patch.reviewed===true?today():'';
    return edited;
  }
  function upsertSource(workspace,state,source) {
    stateName(state);const normalized=normalizeSource(source),current=getSources(workspace,state),previous=current.find(s=>s.id===normalized.id);
    if(previous){
      const a={...normalizeSource(previous)},b={...normalized};delete a.revision;delete b.revision;
      const changed=JSON.stringify(a)!==JSON.stringify(b);
      if(changed&&previous.revision===Number.MAX_SAFE_INTEGER)throw new Error('This source revision exceeds the workspace limit. Add it as a new reference.');
      normalized.revision=previous.revision+(changed?1:0);
    }else normalized.revision=1;
    return normalizeWorkspace({...workspace,byState:{...workspace.byState,[state]:{sources:previous?current.map(s=>s.id===normalized.id?normalized:s):current.concat(normalized),comparison:getComparison(workspace,state)}}});
  }
  function removeSource(workspace,state,id){
    stateName(state);const comparison=getComparison(workspace,state);
    for(const topic of COMPARISON_TOPICS){const entry=comparison[topic.id];if(entry.sourceId===id&&entry.status==='recorded')comparison[topic.id]={...entry,checkedRevision:0};}
    return normalizeWorkspace({...workspace,byState:{...workspace.byState,[state]:{sources:getSources(workspace,state).filter(s=>s.id!==id),comparison}}});
  }
  function serializeWorkspace(workspace){return JSON.stringify(normalizeWorkspace(workspace),null,2);}
  function parseWorkspace(text){if(typeof text!=='string'||text.length>LIMITS.json)throw new Error('Choose a State references JSON file smaller than 4 million characters.');try{return normalizeWorkspace(JSON.parse(text.replace(/^\uFEFF/,'')));}catch(error){if(error instanceof SyntaxError)throw new Error('The reference file is not valid JSON. Your current references are unchanged.');throw error;}}
  function searchQuery(state){return stateName(state)+' department of education specific learning disability eligibility requirements official state rule';}
  function externalSearchUrl(state){return 'https://www.google.com/search?q='+encodeURIComponent(searchQuery(state));}
  function normalizeSearchResults(response){
    const seen=new Set(),out=[];
    for(const row of response&&Array.isArray(response.results)?response.results:[]){
      if(!isObject(row))continue;const url=safeUrl(row.url);if(!url||seen.has(url))continue;seen.add(url);
      out.push({url,title:typeof row.title==='string'?row.title.slice(0,500):url,snippet:typeof row.snippet==='string'?row.snippet.slice(0,3000):'',source:typeof row.source==='string'?row.source.slice(0,100):''});if(out.length===8)break;
    }return out;
  }
  function fromDocument(input){
    if(!isObject(input)||typeof input.content!=='string'||!input.content.trim())throw new Error('The document has no usable extracted text.');
    return normalizeSource({...emptySource(),title:input.title||input.fileName||'Imported source',fileName:input.fileName||'',content:input.content,importMethod:'local-file',fileFormat:input.fileFormat||'',extractionMethod:input.extractionMethod||'',documentPartCount:input.documentPartCount||0,fileSize:input.fileSize||0,fileContentHash:input.fileContentHash||'',fileLastModified:input.fileLastModified||0});
  }
  function fromSearchResult(input){const url=safeUrl(input&&input.url);if(!url)throw new Error('This search result has no usable source link.');return normalizeSource({...emptySource(),title:input.title||url,url,importMethod:'web-search'});}
  const api={STATES,FORMAT,VERSION,STORAGE_KEY,LIMITS,COMPARISON_TOPICS,emptyComparisonEntry,getComparison,updateComparison,flagComparison,recordComparison,comparisonStatus,comparisonSummary,today,safeUrl,emptySource,normalizeSource,emptyWorkspace,normalizeWorkspace,getSources,selectState,editSource,upsertSource,removeSource,serializeWorkspace,parseWorkspace,searchQuery,externalSearchUrl,normalizeSearchResults,fromDocument,fromSearchResult};
  root.AlloSldStateReferenceCore=Object.freeze(api);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
