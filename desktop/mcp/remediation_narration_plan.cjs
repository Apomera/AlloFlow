'use strict';
const fs = require('fs');
const path = require('path');
// Localized structural announcements. Languages without localized label coverage
// remain available for natural narration; they are never spoken with English cues.
const LABELS = {
  en: null,
  es: {heading:'Encabezado de nivel {n}',list:'Lista de {n} elementos',numbered:'Lista numerada de {n} elementos',bullet:'Viñeta',item:'Elemento {n}',listEnd:'Fin de la lista',table:'Tabla',rows:'{n} filas',columns:'{n} columnas',row:'Fila {n}',tableEnd:'Fin de la tabla',image:'Imagen',disclosure:'Sección desplegable'},
  fr: {heading:'Titre de niveau {n}',list:'Liste de {n} éléments',numbered:'Liste numérotée de {n} éléments',bullet:'Puce',item:'Élément {n}',listEnd:'Fin de la liste',table:'Tableau',rows:'{n} lignes',columns:'{n} colonnes',row:'Ligne {n}',tableEnd:'Fin du tableau',image:'Image',disclosure:'Section dépliable'},
  de: {heading:'Überschrift der Ebene {n}',list:'Liste mit {n} Einträgen',numbered:'Nummerierte Liste mit {n} Einträgen',bullet:'Aufzählungspunkt',item:'Eintrag {n}',listEnd:'Ende der Liste',table:'Tabelle',rows:'{n} Zeilen',columns:'{n} Spalten',row:'Zeile {n}',tableEnd:'Ende der Tabelle',image:'Bild',disclosure:'Aufklappbarer Abschnitt'},
  pt: {heading:'Título de nível {n}',list:'Lista com {n} itens',numbered:'Lista numerada com {n} itens',bullet:'Marcador',item:'Item {n}',listEnd:'Fim da lista',table:'Tabela',rows:'{n} linhas',columns:'{n} colunas',row:'Linha {n}',tableEnd:'Fim da tabela',image:'Imagem',disclosure:'Seção expansível'},
  it: {heading:'Titolo di livello {n}',list:'Elenco di {n} elementi',numbered:'Elenco numerato di {n} elementi',bullet:'Punto elenco',item:'Elemento {n}',listEnd:'Fine elenco',table:'Tabella',rows:'{n} righe',columns:'{n} colonne',row:'Riga {n}',tableEnd:'Fine tabella',image:'Immagine',disclosure:'Sezione espandibile'},
};
const SINGULARS={
 es:{listOne:'Lista de un elemento',numberedOne:'Lista numerada de un elemento',rowsOne:'una fila',columnsOne:'una columna',playerAccessible:'Narración accesible',playerNatural:'Narración natural',complete:'documento completo'},
 fr:{listOne:'Liste avec un élément',numberedOne:'Liste numérotée avec un élément',rowsOne:'une ligne',columnsOne:'une colonne',playerAccessible:'Narration accessible',playerNatural:'Narration naturelle',complete:'document complet'},
 de:{listOne:'Liste mit einem Eintrag',numberedOne:'Nummerierte Liste mit einem Eintrag',rowsOne:'eine Zeile',columnsOne:'eine Spalte',playerAccessible:'Barrierefreie Sprachausgabe',playerNatural:'Natürliche Sprachausgabe',complete:'vollständiges Dokument'},
 pt:{listOne:'Lista com um item',numberedOne:'Lista numerada com um item',rowsOne:'uma linha',columnsOne:'uma coluna',playerAccessible:'Narração acessível',playerNatural:'Narração natural',complete:'documento completo'},
 it:{listOne:'Elenco di un elemento',numberedOne:'Elenco numerato di un elemento',rowsOne:'una riga',columnsOne:'una colonna',playerAccessible:'Narrazione accessibile',playerNatural:'Narrazione naturale',complete:'documento completo'},
};
for(const [language,values] of Object.entries(SINGULARS))Object.assign(LABELS[language],values);
function normalizeLanguage(value) {
  if (value === undefined || value === 'auto') return 'auto';
  if (typeof value !== 'string' || !value.trim() || value.length > 64) throw Error('Use a BCP-47 narration language such as es, fr-CA or en-US');
  try { return new Intl.Locale(value.replace(/_/g, '-')).toString(); }
  catch (_) { throw Error('Use a BCP-47 narration language such as es, fr-CA or en-US'); }
}
function voiceCatalog(assetsRoot) {
  const source = fs.readFileSync(path.join(assetsRoot, 'piper_tts_loader.js'), 'utf8');
  const map = source.match(/const PIPER_VOICE_MAP = \{([\s\S]*?)\n    \};/);
  if (!map) throw Error('Piper voice catalog is unavailable; reinstall the connector');
  const voices = Array.from(map[1].matchAll(/'([a-z]+)'\s*:\s*\{\s*name:\s*'([^']+)',\s*voiceId:\s*'([^']+)'/g), m => {
    const [locale, speaker, quality] = m[3].split('-');
    return { language:m[1], name:m[2], voiceId:m[3], provider:'piper',
      modes:Object.hasOwn(LABELS,m[1]) ? ['accessible','natural'] : ['natural'],
      modelCard:'https://huggingface.co/rhasspy/piper-voices/blob/main/'+m[1]+'/'+locale+'/'+speaker+'/'+quality+'/MODEL_CARD' };
  });
  if (!voices.length) throw Error('Piper voice catalog is empty');
  return voices;
}
function selectVoice({language,provider='auto',voice='auto',mode='accessible'}, catalog) {
  const lang=normalizeLanguage(language);if(lang==='auto')throw Error('A document language is required to choose a voice');
  const base=lang.split('-')[0];
  if(!['auto','kokoro','piper'].includes(provider))throw Error('narration_provider must be auto, kokoro or piper');
  if(!['accessible','natural'].includes(mode))throw Error('Choose accessible or natural narration');
  if(mode==='accessible'&&!Object.hasOwn(LABELS,base))throw Error('Accessible structural announcements are not localized for '+lang+'. Use natural narration or a supported accessible language: '+Object.keys(LABELS).join(', '));
  const engine=provider==='auto'?(base==='en'?'kokoro':'piper'):provider;
  if(engine==='kokoro') {
    if(base!=='en')throw Error('This Kokoro adapter supports English; use narration_provider: auto or piper for '+lang);
    return {provider:engine,language:lang,voice:voice==='auto'?'af_heart':voice};
  }
  const entry=catalog.find(v=>v.language===base);
  if(!entry)throw Error('No local Piper voice for '+lang+'. Call document_narration_voices for supported languages');
  if(voice!=='auto'&&voice!==entry.voiceId)throw Error('Piper voice must match '+lang+': '+entry.voiceId+' (or auto)');
  return {provider:engine,language:lang,voice:entry.voiceId,modelCard:entry.modelCard};
}
// Runs in Chromium. Keep dependencies explicit so tests can exercise the same planner.
function planDocument({html,mode,language='auto',labels={}}, helpers) {
  const A=helpers||window.AlloNarrationText||window.AlloModules.DocumentNarrationExports;
  const doc=new DOMParser().parseFromString(A.sanitize(html),'text/html');
  const requested=language!=='auto';const original=doc.documentElement.lang;
  const lang=requested?language:(original||'en');
  let canonical;try{canonical=new Intl.Locale(lang.replace(/_/g,'-')).toString();}catch(_){throw Error('Invalid document language; set narration_language explicitly');}
  const base=canonical.split('-')[0];
  for(const el of doc.querySelectorAll('[lang]')) {
    if(el===doc.documentElement||!el.lang)continue;
    let child;try{child=new Intl.Locale(el.lang.replace(/_/g,'-')).language;}catch(_){throw Error('Invalid inline document language: '+el.lang);}
    el.lang=new Intl.Locale(el.lang.replace(/_/g,'-')).toString();
  }
  doc.documentElement.lang=canonical;
  const warnings=original||requested?[]:['Document has no lang attribute; English was assumed. Set narration_language to override.'];
  const segments=[],used=new Set();let seq=0;
  const contentCoverage={status:'matched',method:'ordered-text-and-description-check',expectedUnits:0,matchedUnits:0,missingUnits:0,unresolvedVisuals:0,excluded:{},issues:[],issuesTruncated:0,note:'Checks eligible HTML text and authored descriptions against planned speech. It does not verify pronunciation, visual interpretation or source extraction.'};
  const normalize=text=>String(text||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}\p{S}]/gu,'');
  const issue=value=>{contentCoverage.status='blocked';if(contentCoverage.issues.length<50)contentCoverage.issues.push(value);else contentCoverage.issuesTruncated++;};
  const excluded=node=>{
    if(node.matches('script,style,template,annotation,annotation-xml,[data-allo-latex-src]'))return 'nonspoken_markup';
    if(node.matches('button,input,select,textarea,audio,video,.allo-img-controls,[data-alloflow-picker],[data-alloflow-nomsg],#allo-reader-bar,#allo-reader-ruler'))return 'interface_controls';
    if(node.matches('[hidden],[aria-hidden="true"]')||node.style?.display==='none'||node.style?.visibility==='hidden')return 'hidden_content';
    return null;
  };
  const inventory=(node,units,targetId)=>{
    if(node.nodeType===3){if(normalize(node.textContent))units.push({kind:'text',text:node.textContent});return;}
    if(node.nodeType!==1)return;
    const reason=excluded(node);if(reason){contentCoverage.excluded[reason]=(contentCoverage.excluded[reason]||0)+1;return;}
    const tag=node.tagName.toLowerCase();
    if(tag==='img'){
      const alt=(node.getAttribute('alt')||'').trim(),decorative=['presentation','none'].includes(node.getAttribute('role'))||node.hasAttribute('alt')&&!alt;
      if(decorative){contentCoverage.excluded.decorative_images=(contentCoverage.excluded.decorative_images||0)+1;return;}
      if(alt)units.push({kind:'image_description',text:alt});
      else if(!node.closest('figure')?.querySelector('figcaption')?.textContent.trim()){contentCoverage.unresolvedVisuals++;issue({code:'image_description_missing',targetId,kind:'image'});}
      return;
    }
    if(tag==='math'||tag==='svg'){
      const description=node.getAttribute('aria-label')||node.getAttribute('alttext')||(tag==='svg'?Array.from(node.querySelectorAll('title,desc')).map(el=>el.textContent.trim()).filter(Boolean).join('. '):'');
      if(description)units.push({kind:tag+'_description',text:description});
      else{contentCoverage.unresolvedVisuals++;issue({code:'spoken_description_required',targetId,kind:tag});}
      return;
    }
    Array.from(node.childNodes).forEach(child=>inventory(child,units,targetId));
  };
  // Repair duplicate IDs once, preserving the first anchor and ensuring every
  // spoken block has a distinct, stable EPUB target.
  for(const el of doc.querySelectorAll('[id]')) {if(used.has(el.id)||!el.id)el.removeAttribute('id');else used.add(el.id);}
  const visit=node=>{
    let el=node;
    if(node.nodeType===3){if(!node.textContent.trim())return;el=doc.createElement('p');node.replaceWith(el);el.textContent=node.textContent;}
    if(el.nodeType!==1)return;
    const reason=excluded(el);if(reason){contentCoverage.excluded[reason]=(contentCoverage.excluded[reason]||0)+1;return;}
    if(/^(MAIN|ARTICLE|SECTION|DIV|HEADER|FOOTER|ASIDE|NAV)$/.test(el.tagName)) {Array.from(el.childNodes).forEach(visit);return;}
    const blockLanguage=(el.closest('[lang]')?.lang||canonical);
    const blockBase=new Intl.Locale(blockLanguage).language;
    const options={languageRuns:true,language:blockLanguage,labelsByLanguage:labels};
    let runs=mode==='accessible'?A.accessibleText(el.outerHTML,labels[blockBase],options):A.naturalText(el.outerHTML,options);
    if(!runs.length&&mode==='accessible')runs=A.naturalText(el.outerHTML,options);
    if(!el.id){let id;do{id='narration-'+(++seq);}while(used.has(id));el.id=id;used.add(id);}
    const units=[];inventory(el,units,el.id);const spoken=normalize(runs.map(run=>run.text).join(' '));let cursor=0;
    for(let index=0;index<units.length;index++){
      const unit=units[index],text=normalize(unit.text);contentCoverage.expectedUnits++;const found=spoken.indexOf(text,cursor);
      if(found>=0){contentCoverage.matchedUnits++;cursor=found+text.length;}
      else{contentCoverage.missingUnits++;issue({code:'text_omission',targetId:el.id,unit:index+1,kind:unit.kind,characters:text.length});}
    }
    for(const run of runs){let text=run.text.trim();
      while(text){let end=text.length;if(end>600){end=text.lastIndexOf('. ',600);if(end<200)end=text.lastIndexOf(' ',600);if(end<1)end=600;else end++;}segments.push({id:el.id,segmentId:'segment-'+(segments.length+1),language:run.language,text:text.slice(0,end).trim()});text=text.slice(end).trim();}
    }
  };
  Array.from(doc.body.childNodes).forEach(visit);
  if(!segments.length&&contentCoverage.status!=='blocked')throw Error('No readable text to narrate');
  return {contentCoverage,segments,languages:[...new Set(segments.map(segment=>segment.language))],lang:canonical,warnings,title:doc.title||'Document',html:'<!doctype html>\n'+doc.documentElement.outerHTML,bodyHtml:Array.from(doc.body.childNodes).map(n=>new XMLSerializer().serializeToString(n)).join('')};
}
function routePlan(plan, options, catalog, kokoroVoices) {
  const routes=plan.segments.map(segment=>selectVoice({language:segment.language||plan.lang,mode:options.mode||'accessible',provider:options.provider||'auto',voice:options.voice||'auto'},catalog));
  for(const route of routes)if(route.provider==='kokoro'&&!kokoroVoices.includes(route.voice))throw Error('Unknown Kokoro voice: '+route.voice);
  const groups=new Map();routes.forEach((route,index)=>{const key=JSON.stringify(route);const item=groups.get(key)||{...route,sections:0,characters:0};item.sections++;item.characters+=plan.segments[index].text.length;groups.set(key,item);});
  const characters=plan.segments.reduce((sum,segment)=>sum+segment.text.length,0);
  return {routes,voices:[...groups.values()],characters,estimatedSpokenMinutes:{min:Math.max(0.1,Math.round(characters/1200*10)/10),max:Math.max(0.1,Math.round(characters/500*10)/10),basis:'Rough character-count estimate; language, pronunciation and pauses vary. This is audio duration, not processing time.'}};
}
function kokoroVoiceIds(assetsRoot) {
  const source=fs.readFileSync(path.join(assetsRoot,'kokoro_tts_loader.js'),'utf8');
  return [...source.matchAll(/\{ id: '([^']+)'[^\n]*lang: 'en'/g)].map(m=>m[1]);
}
// Runs in the existing remediation browser. This is a conservative lexical
// retention check, not a semantic equivalence or accessibility certificate.
function assessSourceCoverage({sourceText,outputHtml,pages,method,pageErrors,lowConfidencePages,pageRange}) {
  const words=new Intl.Segmenter(undefined,{granularity:'word'});
  const tokens=text=>{const normalized=String(text||'').normalize('NFKC').replace(/(\p{L})-\s*\n\s*(?=\p{L})/gu,'$1').toLowerCase(),out=[];for(const part of words.segment(normalized)){if(part.isWordLike){const word=/\p{N}/u.test(part.segment)?part.segment:part.segment.replace(/[^\p{L}\p{M}]/gu,'');if(word)out.push(word);}else{out.push(...(part.segment.match(/[\p{S}%/]/gu)||[]));if(/[-–—]/u.test(part.segment)&&/\p{N}/u.test(normalized.slice(Math.max(0,part.index-1),part.index+part.segment.length+1)))out.push('-');}}return out;};
  const doc=new DOMParser().parseFromString(outputHtml||'','text/html');
  doc.querySelectorAll('script,style,button,input,select,textarea,template,[hidden],[aria-hidden="true"],annotation,annotation-xml,[data-allo-latex-src]').forEach(node=>node.remove());
  doc.querySelectorAll('[style]').forEach(node=>{if(node.style.display==='none'||node.style.visibility==='hidden')node.remove();});
  doc.querySelectorAll('img').forEach(node=>node.replaceWith(doc.createTextNode(' '+(node.getAttribute('alt')||'')+' ')));
  doc.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,td,th,caption,figcaption,div,section,br').forEach(node=>node.appendChild(doc.createTextNode(' ')));
  const source=tokens(sourceText),output=tokens(doc.body.textContent),available=new Map();for(const token of output)available.set(token,(available.get(token)||0)+1);
  let missingTokens=0,missingPassageCount=0;const missingPassages=[];let sourceUnit=0;
  // Bounded chunks give callers source locations even when extraction flattened paragraphs.
  for(let at=0;at<source.length;at+=40){sourceUnit++;let missing=0;for(const token of source.slice(at,at+40)){const count=available.get(token)||0;if(count)available.set(token,count-1);else missing++;}
    missingTokens+=missing;if(missing)missingPassageCount++;if(missing&&missingPassages.length<50)missingPassages.push({sourceUnit,startToken:at,expectedTokens:Math.min(40,source.length-at),missingTokens:missing});
  }
  const pageList=Array.isArray(pages)?pages:null;
  const pageIds=items=>Array.isArray(items)?items.slice(0,100).map(item=>typeof item==='number'?item:item?.pageNum??item?.page??null).filter(value=>Number.isSafeInteger(value)&&value>0):[];
  const extraction={method:method||'unknown',pagesExamined:pageList?pageList.length:null,emptyPageCandidates:pageList?pageList.filter(page=>!String(page?.text||'').trim()).length:null,pageErrorCount:Array.isArray(pageErrors)?pageErrors.length:null,lowConfidencePageCount:Array.isArray(lowConfidencePages)?lowConfidencePages.length:null,errorPages:pageIds(pageErrors),lowConfidencePages:pageIds(lowConfidencePages)};
  const reviewRequired=!source.length||missingTokens>0||(extraction.pageErrorCount||0)>0||(extraction.lowConfidencePageCount||0)>0;
  return {status:!source.length?'unavailable':reviewRequired?'review_required':'matched',reviewRequired,method:'normalized-token-occurrence-check',sourceTokens:source.length,outputTokens:output.length,matchedTokens:source.length-missingTokens,missingTokens,tokenRecall:source.length?Math.round((source.length-missingTokens)/source.length*10000)/10000:null,missingPassages,missingPassagesTruncated:Math.max(0,missingPassageCount-50),extraction,scope:{pageRange:pageRange||null,wholeDocument:!pageRange},note:'Compares extracted source token occurrences with HTML. Missing tokens can reflect omissions or rewording and require review. A match does not establish reading order, semantic fidelity, correct OCR or visual coverage. Empty page candidates may be intentionally blank.'};
}
module.exports={assessSourceCoverage,LABELS,normalizeLanguage,voiceCatalog,selectVoice,planDocument,routePlan,kokoroVoiceIds};
