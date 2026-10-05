/* State reference records are independent of the fictional Maine worksheet. */
(function(root) {
  'use strict';
  const STATES = Object.freeze(['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','District of Columbia','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming']);
  const FORMAT = 'alloflow-sld-state-references', VERSION = 1;
  const STORAGE_KEY = 'alloflow-maine-sld-state-references-v1';
  const LIMITS = Object.freeze({ sourcesPerState:4, sourcesTotal:12, content:600000, totalContent:1200000, excerpt:50000, notes:10000, json:4000000 });
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
    return {id,title:'',url:'',fileName:'',effectiveDate:'',checkedDate:'',pageSection:'',excerpt:'',transferNotes:'',content:'',importMethod:'manual',fileFormat:'',extractionMethod:'',documentPartCount:0,fileSize:0,fileContentHash:'',fileLastModified:0,reviewed:false,reviewedAt:''};
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
    return s;
  }
  function emptyWorkspace(){return {format:FORMAT,version:VERSION,activeState:'Maine',byState:{}};}
  function normalizeWorkspace(input) {
    if(!isObject(input)||input.format!==FORMAT||input.version!==VERSION||!isObject(input.byState))throw new Error('Use a version 1 State references JSON file downloaded from this workspace.');
    const output=emptyWorkspace();output.activeState=stateName(input.activeState);
    let count=0,characters=0;const ids=new Set();
    for(const state of Object.keys(input.byState)){
      stateName(state);const record=input.byState[state];
      if(!isObject(record)||!Array.isArray(record.sources)||record.sources.length>LIMITS.sourcesPerState)throw new Error('Keep at most four references for each state.');
      const sources=record.sources.map(normalizeSource);
      for(const s of sources){if(ids.has(s.id))throw new Error('A source identifier is repeated in the reference file.');ids.add(s.id);count++;characters+=s.content.length;}
      output.byState[state]={sources};
    }
    if(count>LIMITS.sourcesTotal)throw new Error('Keep at most twelve references across this workspace. Download a backup before removing older references.');
    if(characters>LIMITS.totalContent)throw new Error('The combined document text exceeds the workspace limit. Download a backup and keep selected excerpts instead.');
    if(JSON.stringify(output,null,2).length>LIMITS.json)throw new Error('The complete reference backup exceeds the workspace size limit. Keep selected excerpts instead of full document text.');
    return output;
  }
  function getSources(workspace,state){return workspace.byState[state] ? workspace.byState[state].sources : [];}
  function selectState(workspace,state){return {...workspace,activeState:stateName(state)};}
  function editSource(source,patch) {
    const edited={...source,...patch};
    const changed=['title','url','fileName','effectiveDate','checkedDate','pageSection','excerpt','content','transferNotes'].some(key=>Object.prototype.hasOwnProperty.call(patch,key)&&patch[key]!==source[key]);
    if(changed){edited.reviewed=false;edited.reviewedAt='';}
    else if(Object.prototype.hasOwnProperty.call(patch,'reviewed'))edited.reviewedAt=patch.reviewed===true?today():'';
    return edited;
  }
  function upsertSource(workspace,state,source) {
    stateName(state);const normalized=normalizeSource(source),current=getSources(workspace,state),exists=current.some(s=>s.id===source.id);
    return normalizeWorkspace({...workspace,byState:{...workspace.byState,[state]:{sources:exists?current.map(s=>s.id===source.id?normalized:s):current.concat(normalized)}}});
  }
  function removeSource(workspace,state,id){stateName(state);return normalizeWorkspace({...workspace,byState:{...workspace.byState,[state]:{sources:getSources(workspace,state).filter(s=>s.id!==id)}}});}
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
  const api={STATES,FORMAT,VERSION,STORAGE_KEY,LIMITS,today,safeUrl,emptySource,normalizeSource,emptyWorkspace,normalizeWorkspace,getSources,selectState,editSource,upsertSource,removeSource,serializeWorkspace,parseWorkspace,searchQuery,externalSearchUrl,normalizeSearchResults,fromDocument,fromSearchResult};
  root.AlloSldStateReferenceCore=Object.freeze(api);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
