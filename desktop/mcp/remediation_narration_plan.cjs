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
  // An OCR transcript is markdown: table cell pipes and divider rows are layout, not printed text, and
  // never reach the HTML (284 of 292 "missing" tokens on the 1954 scan, 2026-10-20). Born-digital text is untouched.
  if(/ocr|tesseract/i.test(String(method||'')))sourceText=String(sourceText||'').replace(/^[ \t]*\|?[ \t]*:?-{3,}:?(?:[ \t]*\|[ \t]*:?-{3,}:?)*[ \t]*\|?[ \t]*$/gm,' ').replace(/\|/g,' ');
  // The OCR prompt also asks for "[Image: description]" and "[text](url)": neither is printed text
  // (2026-10-25: 31 of 31 "missing" tokens were an image description). Mirrors _alloStripOcrMarkup.
  if(/ocr|tesseract|vision/i.test(String(method||'')))sourceText=String(sourceText||'')
    .replace(/\[Image:[^\]\n]*\]/gi, ' ')
    .replace(/\[([^\]\n]*)\]\((?:[^()\s]|\([^()\s]*\))*\)/g, '$1');
  // An extraction can hand each page over as ONE line (USCIS civics, 2026-10-26: a 45-word footnote and
  // "-1- www.uscis.gov" on 11 pages, ~400 "missing" words), which the line rule below never sees. Words
  // that 3+ pages (and 60% of them) end or start with, a page number aside, are one passage: keep one
  // copy. Runs before the word mending below, which would change the text it searches for.
  if(Array.isArray(pages)&&pages.length>1){
    sourceText=String(sourceText||'').normalize('NFKC');
    // A dash glued to a page number is its own word: "Page 2\u2014Dear Colleague" (OSEP letter, 2026-10-26).
    const unglue=t=>{let m=/^(\d{1,4})([\u2013\u2014-])(\p{L}.*)$/u.exec(t);if(m)return [m[1],m[2],m[3]];m=/^(.*\p{L})([\u2013\u2014])(\d{1,4})$/u.exec(t);return m?[m[1],m[2],m[3]]:[t];};
    const pw=pages.map(p=>String(p&&p.text||'').normalize('NFKC').split(/\s+/).filter(Boolean).flatMap(unglue));
    const pageNo=t=>/^[-\u2013\u2014(]?\d{1,4}[-\u2013\u2014)]?$/.test(t);
    const isDash=t=>/^[-\u2013\u2014]$/.test(t||'');
    const minPages=Math.max(3,Math.ceil(pw.length*0.6));
    for(const fromEnd of [true,false]){
      let active=pw.map((_,i)=>i).filter(i=>pw[i].length);
      const seq=[];
      for(let k=0;k<80&&active.length>=minPages;k++){
        const at=i=>{const w=pw[i],j=fromEnd?w.length-1-k:k;return j>=0&&j<w.length?w[j]:null;};
        const toks=active.map(at);
        // A page number changes page to page; the same number on every page ("65") is text.
        if(toks.every(t=>t!==null&&pageNo(t))&&toks.some(t=>t!==toks[0])){seq.push(null);continue;}
        const freq=new Map();
        for(const t of toks)if(t!==null)freq.set(t.toLowerCase(),(freq.get(t.toLowerCase())||0)+1);
        let best=null,bn=0;
        for(const [t,n] of freq)if(n>bn){best=t;bn=n;}
        if(bn<minPages)break;
        active=active.filter(i=>{const t=at(i);return t!==null&&t.toLowerCase()===best;});
        seq.push(best);
      }
      while(seq.length&&seq[seq.length-1]===null)seq.pop();
      if(seq.filter(Boolean).length<2)continue;
      const ordered=fromEnd?seq.slice().reverse():seq;
      // A page number matches only a number shape, so it can never swallow a word; a lone dash may touch its neighbours.
      const re=new RegExp(ordered.map((t,i)=>(i?(isDash(t)||isDash(ordered[i-1])?'\\s*':'\\s+'):'')+(t===null?'([-\\u2013\\u2014(]?\\d{1,4}[-\\u2013\\u2014)]?)':t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))).join(''),'giu');
      // Twice on one page ("Vote: Yea- Nay-" under every agenda item) is content, as in the line rule.
      if(pages.some(p=>(String(p&&p.text||'').normalize('NFKC').match(re)||[]).length>1))continue;
      // A short header/footer with a page number ("Page 2 — Dear Colleague") is furniture: every copy goes,
      // since a remediated document rightly drops it. Longer repeated text keeps one copy, without its page number.
      // Furniture must SAY page: a repeated "Section 1 Report" keeps its copy.
      const furniture=ordered.length<=6&&ordered.includes(null)&&ordered.includes('page');
      let first=!furniture;
      // The kept copy, as printed, minus its page number(s) (the captured groups, left to right).
      const holes=ordered.filter(t=>t===null).length;
      sourceText=sourceText.replace(re,(m,...g)=>{if(!first)return ' ';first=false;let at=0,kept='';for(const n of g.slice(0,holes)){const k=m.indexOf(n,at);if(k<0)continue;kept+=m.slice(at,k);at=k+n.length;}return (kept+m.slice(at)).replace(/\s+/g,' ').trim();});
    }
  }
  // A running header or footer printed on every page is one passage, written once in reading order
  // (2026-10-25: a 58-word footer on both pages of a 2-page activity held the PDF at recall 0.81).
  // Later printed copies of a 4+ word line found on two or more pages are dropped; a line repeated
  // within one page still counts every time.
  // A PDF text layer can split a ligature glyph into its own run ("sta ff", "o ff ice": 2026-10-25
  // newsletter, the "missing" tokens). Rejoin a split only when the joined word is in the output, so a
  // real "ff"/"fi" token is never merged away.
  {
    const wordsOf=s=>s.normalize('NFKC').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    // Inline tags do not split a word for the token count ("40<sup>th</sup>" reads "40th"), so the output's
    // words include that reading too (OSEP letter, 2026-10-26).
    const outWords=new Set(wordsOf(String(outputHtml||'').replace(/<[^>]*>/g,' ')).concat(wordsOf(String(outputHtml||'').replace(/<\/?(?:sup|sub|span|em|strong|b|i|u|small|mark|abbr)\b[^>]*>/gi,'').replace(/<[^>]*>/g,' '))));
    // NFKC first: the text layer often carries the ligature glyph itself ("sta ﬀ"), which only becomes
    // "ff" after normalization (newsletter run 3 still showed every split as missing).
    sourceText=String(sourceText||'').normalize('NFKC').replace(/(\p{L}+)[ \t]+(ffi|ffl|ff|fi|fl)(?:[ \t]+(\p{L}+))?/gu,(m,a,lig,b)=>{
      if(b&&outWords.has((a+lig+b).toLowerCase()))return a+lig+b;
      if(outWords.has((a+lig).toLowerCase()))return a+lig+(b?' '+b:'');
      return m;
    });
    // A justified layout splits words at line ends ("plan- ning", "De- partment"); the newline is
    // often already a space by here (2026-10-25 notifications: 101 of 103 "missing" tokens). Rejoin
    // only when the joined word is in the output, so a real hyphenated pair is never merged away.
    // A hyphen at a LINE end: join only when the joined word is in the output; otherwise keep two words.
    // The tokenizer's own unconditional join glued "Nay-" onto the next line's "Motion" and turned
    // "long-term" into "longterm" (agenda + FDA runs, 2026-10-25).
    sourceText=sourceText.replace(/(\p{L}+)-[ \t]*\r?\n[ \t]*(\p{L}+)/gu,(m,a,b)=>outWords.has((a+b).toLowerCase())?a+b:a+'- '+b);
    sourceText=sourceText.replace(/(\p{L}+)-\s+(\p{Ll}+)/gu,(m,a,b)=>outWords.has((a+b).toLowerCase())?a+b:m);
    // Old typesetting stores small caps as a separate first letter ("G ROSS I NCOME", "C OLUMNS"), a
    // word may be hyphenated with no space left ("corpora-tions"), and a text layer can carry a capital
    // I for a lower-case l ("normaI"): each is mended only when the mended word is in the output, so a
    // real "A GOOD" or "long-term" stays as it is (1913 Form 1040 run, 2026-10-26).
    sourceText=sourceText.replace(/\b(\p{Lu}) (\p{Lu}{2,})\b/gu,(m,a,b)=>outWords.has((a+b).toLowerCase())?a+b:m);
    // The same split in lower case ("j ust": civics footnote, 2026-10-26), unless the letter is a word in the output.
    sourceText=sourceText.replace(/\b(\p{Ll}) (\p{Ll}{2,})\b/gu,(m,a,b)=>outWords.has(a+b)&&!outWords.has(a)?a+b:m);
    sourceText=sourceText.replace(/(\p{L}+)-(\p{Ll}+)/gu,(m,a,b)=>outWords.has((a+b).toLowerCase())&&!(outWords.has(a.toLowerCase())&&outWords.has(b.toLowerCase()))?a+b:m);
    sourceText=sourceText.replace(/\b(\p{Ll}+)I(\p{Ll}*)\b/gu,(m,a,b)=>outWords.has((a+'l'+b).toLowerCase())&&!outWords.has(m.toLowerCase())?a+'l'+b:m);
    // A superscript ordinal arrives as its own run ("8 th", "10 th"; 14 of 16 "missing" tokens on a
    // syllabus): rejoin it when the output has the joined form.
    sourceText=sourceText.replace(/(\d+)\s+(st|nd|rd|th)\b/giu,(m,a,b)=>outWords.has((a+b).toLowerCase())?a+b:m);
    // A raised suffix can be read a few words EARLY ("as th part of the 40 Anniversary": OSEP letter,
    // 2026-10-26): within six words before its number, joined only when the output has "40th".
    // An opening bracket may lead the number: "nd Introduction to Human Factors Engineering (2 Edition)" (SIE 515 syllabus).
    sourceText=sourceText.replace(/(^|\s)(st|nd|rd|th)((?:\s+[^\s\d]+){1,6}?)\s+(\(?)(\d+)(?=[\s)]|$)/giu,(m,s,suf,mid,br,num)=>outWords.has((num+suf).toLowerCase())?s+mid.trim()+' '+br+num+suf:m);
    // A long web address wrapped across a line ("...disputereso" / "lutionqafinalmemo"): rejoin two pieces
    // only when the output has the joined word and neither piece is a word there (OSEP letter, 2026-10-26).
    // Lookahead: the second piece is not consumed, so it can still pair with what follows.
    sourceText=sourceText.replace(/(?<![\p{L}\p{N}])([\p{L}\p{N}]{3,})\s+(?=([\p{L}\p{N}]{2,})(?![\p{L}\p{N}]))/gu,(m,a,b)=>{const j=(a+b).toLowerCase();return outWords.has(j)&&!outWords.has(a.toLowerCase())&&!outWords.has(b.toLowerCase())?a:m;});
  }
  // A page's own number printed at its top or bottom ("1", "Page 2", "2 of 3") is page furniture, not
  // content: drop one copy per page when it sits in that page's first or last two lines.
  if(Array.isArray(pages)&&pages.length){
    const drop=[];
    pages.forEach((page,i)=>{
      const num=Number(page&&page.pageNum)||i+1;
      const lines=String(page&&page.text||'').split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
      const edge=lines.slice(0,2).concat(lines.slice(-2));
      const hit=edge.find(l=>new RegExp('^(?:page\\s*)?'+num+'(?:\\s*(?:of|/)\\s*\\d{1,4})?$','i').test(l));
      if(hit)drop.push(hit);
    });
    if(drop.length){
      const src=String(sourceText||'').split(/\r?\n/);
      for(const d of drop){const k=src.findIndex(l=>l.trim()===d);if(k>=0)src.splice(k,1);}
      sourceText=src.join('\n');
    }
  }
  if(Array.isArray(pages)&&pages.length>1){
    const lineKey=line=>String(line||'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
    const onPages=new Map();
    // A running line appears ONCE per page, in its first 8 or last 4 lines. "Vote: Yea- Nay-" under every
    // agenda item is on every page too, but several times and mid-page: content, not furniture.
    const repeatsOnAPage=new Set();
    for(const page of pages){
      const lines=String(page&&page.text||'').split(/\r?\n/).map(lineKey).filter(Boolean),counts=new Map();
      for(const k of lines)counts.set(k,(counts.get(k)||0)+1);
      const edge=new Set(lines.slice(0,8).concat(lines.slice(-4)));
      for(const [k,c] of counts){if(c>1)repeatsOnAPage.add(k);else if(edge.has(k))onPages.set(k,(onPages.get(k)||0)+1);}
    }
    // Running = on 3+ pages with 2+ words (short footers like "October 2023", repeated table headers
    // and print-title rows), or on 2 pages with 4+ words. Mirrors _alloDropRunningLines in the pipeline.
    const running=key=>{if(repeatsOnAPage.has(key))return false;const n=onPages.get(key)||0,w=key.split(' ').length;return (n>=3&&w>=2)||(n>=2&&w>=4);};
    const seen=new Set();
    sourceText=String(sourceText||'').split(/\r?\n/).filter(line=>{const key=lineKey(line);if(!running(key))return true;if(seen.has(key))return false;seen.add(key);return true;}).join('\n');
  }
  const words=new Intl.Segmenter(undefined,{granularity:'word'});
  // A combining mark never starts a word: some PDF text layers store an Arabic tanween as its own
  // glyph after a space ("مذهلا ً"), which must still match the word it belongs to (2026-10-19).
  // One apostrophe: a modifier-letter or curly apostrophe in the text layer ("donʼt") must match the
  // output's straight or curly one (2026-10-25 newsletter). Built from code points on purpose.
  const apostrophes=new RegExp('['+String.fromCharCode(0x2BC,0x2018,0x2019,0x60,0xB4)+']','g');
  const tokens=text=>{const normalized=String(text||'').normalize('NFKC').replace(apostrophes,"'").replace(/(\p{L})-\s*\n\s*(?=\p{L})/gu,'$1').replace(/(\p{L}\p{M}*)\s+(?=\p{M})/gu,'$1').toLowerCase(),out=[];for(const part of words.segment(normalized)){if(part.isWordLike){const word=/\p{N}/u.test(part.segment)?part.segment.replace(/^_+|_+$/g,''):part.segment.replace(/[^\p{L}\p{M}]/gu,'');if(word)out.push(word);}else{out.push(...(part.segment.match(/[\p{S}%/]/gu)||[]));if(/[-–—]/u.test(part.segment)&&/\p{N}/u.test(normalized.slice(Math.max(0,part.index-1),part.index+part.segment.length+1)))out.push('-');}}return out;};
  const doc=new DOMParser().parseFromString(outputHtml||'','text/html');
  // Synthetic labels may match only positively identified source list markers,
  // never ordinary numeric prose. Keep these credits outside the text token pool.
  const sourceMarkerCredits=new Set(),originalItems=new Map(),blockedLists=new Set();
  for(const ol of doc.querySelectorAll('ol'))originalItems.set(ol,[...ol.children].filter(node=>node.tagName==='LI'));
  const styles=[...doc.querySelectorAll('style')].map(node=>node.textContent||'');
  let customListNumbering=!!doc.querySelector('link[rel~="stylesheet"]')||styles.some(css=>/\b(?:list-style(?:-type|-image)?|counter-reset|counter-set|counter-increment)\s*:|::?marker\b|@import\b/i.test(css));
  // Resolve ordinary selectors only. Conditional or unparseable numbering stays
  // conservative; no stylesheet, script, or rendering context is loaded here.
  for(const css of styles)for(const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
    const declarations=[...rule[2].matchAll(/(?:^|;)\s*(display|visibility)\s*:\s*([^;]+)/gi)].map(match=>({property:match[1].toLowerCase(),value:match[2].replace(/!important/gi,'').trim().toLowerCase()}));
    const suppressesItem=declarations.some(value=>value.property==='display'&&value.value!=='list-item');
    const hidesSubtree=declarations.some(value=>value.property==='display'&&value.value==='none'||value.property==='visibility'&&['hidden','collapse'].includes(value.value));
    if(!suppressesItem&&!hidesSubtree)continue;
    try{for(const node of doc.querySelectorAll(rule[1].trim())){
      if(node.tagName==='LI'&&node.parentElement.tagName==='OL')blockedLists.add(node.parentElement);
      if(hidesSubtree){if(node.tagName==='OL')blockedLists.add(node);for(const ol of node.querySelectorAll('ol'))blockedLists.add(ol);}
    }}catch(_){customListNumbering=true;}
  }
  doc.querySelectorAll('script,style,button,input,select,textarea,template,[hidden],annotation,annotation-xml,[data-allo-latex-src]').forEach(node=>node.remove());
  // A figure's visible description is aria-hidden only because the image's alt already reads it to screen
  // readers; it is printed text, so it counts (RSU 57 budget: 38 chart axis labels "missing"). Other hidden text does not.
  doc.querySelectorAll('[aria-hidden="true"]').forEach(node=>{if(!node.closest('figcaption'))node.remove();});
  doc.querySelectorAll('[style]').forEach(node=>{if(node.style.display==='none'||node.style.visibility==='hidden')node.remove();});
  doc.querySelectorAll('img').forEach(node=>node.replaceWith(doc.createTextNode(' '+(node.getAttribute('alt')||'')+' ')));
  // A printed bullet glyph ("▪", "●") is the marker the output's own <li> draws (civics: ~300 "missing"
  // ▪ symbols). Credit at most one per list item, and only a glyph standing alone as a word. Before the
  // numbered-marker credits below, which record token positions (agenda: crediting after shifted them).
  // A Wingdings bullet reaches the text layer as a plain letter ("u" = arrow on PowerPoint slides; RSU 57
  // budget: 45 "missing" u's): credited the same way, only for a letter that is never a word in the output.
  {let li=doc.querySelectorAll('li').length;if(li){const outLow=' '+String(doc.body.textContent||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ')+' ';const wing=['u','l','n','q','v','Ø','ü','§'].filter(c=>outLow.indexOf(' '+c.toLowerCase()+' ')===-1).join('');const cls='\\u2022\\u2023\\u2043\\u2219\\u25A0\\u25A1\\u25AA\\u25AB\\u25CB\\u25CF\\u25E6\\uF0A7\\uF0B7'+wing;sourceText=String(sourceText||'').replace(new RegExp('(^|\\s)['+cls+'](?=\\s|$)','g'),(m,s)=>li-->0?s+' ':m);}}
  if(!customListNumbering){
    const normalize=text=>String(text||'').normalize('NFKC').replace(/(\p{L})-\s*\n\s*(?=\p{L})/gu,'$1').toLowerCase().replace(/\s+/g,' ').trim();
    const sourceNormalized=normalize(sourceText),candidates=[];
    let previousOffset=0,tokenOffset=0;
    for(const match of sourceNormalized.matchAll(/(\()?(-?\d+)[.)]\s+/g)){ // "1. ", "1) " and the parenthesized "(1) " of UDHR-style clauses
      if(match.index&& !/\s/.test(sourceNormalized[match.index-1]))continue;
      tokenOffset+=tokens(sourceNormalized.slice(previousOffset,match.index)).length;previousOffset=match.index;
      candidates.push({label:match[2],at:tokenOffset,count:tokens(match[2]).length,bodyAt:match.index+match[0].length,used:false});
    }
    const validInteger=value=>/^[+-]?\d+$/.test(String(value).trim())&&Number(value)>=-2147483648&&Number(value)<=2147483647;
    const decimalStyles=node=>{
      for(let current=node;current;current=current.parentElement){
        const css=current.getAttribute('style')||'',type=current.style.listStyleType;
        if(['hidden','collapse'].includes(current.style.visibility))return false;
        if(type&&type!=='decimal')return false;
        if(/\b(?:counter-reset|counter-set|counter-increment|list-style-image)\s*:/i.test(css))return false;
        const shorthand=css.match(/(?:^|;)\s*list-style\s*:\s*([^;]+)/i);
        if(shorthand&&shorthand[1].replace(/!important/gi,'').trim().split(/\s+/).some(value=>!['decimal','inside','outside'].includes(value.toLowerCase())))return false;
      }
      return !node.style.display||node.style.display==='list-item';
    };
    for(const ol of doc.querySelectorAll('ol')){
      if(blockedLists.has(ol)||(ol.hasAttribute('type')&&ol.getAttribute('type')!=='1'))continue;
      const items=[...ol.children].filter(node=>node.tagName==='LI');
      // Excluded direct items can change reversed/default/value-based counters.
      if(items.length!==(originalItems.get(ol)||[]).length)continue;
      if(ol.hasAttribute('start')&&!validInteger(ol.getAttribute('start')))continue;
      if(items.some(node=>node.hasAttribute('value')&&!validInteger(node.getAttribute('value'))))continue;
      const step=ol.hasAttribute('reversed')?-1:1;
      let ordinal=ol.hasAttribute('start')?ol.start:step<0?items.length:1;
      for(const item of items){
        if(item.hasAttribute('value'))ordinal=item.value;
        const literal=new RegExp('^\\s*\\(?'+ordinal+'[.)]\\s+').test(item.textContent||'');
        if((!item.hasAttribute('type')||item.getAttribute('type')==='1')&&decimalStyles(item)&&!literal){
          // Anchor to this item's actual prose before its first nested list. This
          // also identifies flattened PDF markers without guessing from digits alone.
          let ownText='',child;const walker=doc.createTreeWalker(item,5);while((child=walker.nextNode())){if(child.nodeType===1&&(child.tagName==='OL'||child.tagName==='UL'))break;if(child.nodeType===3)ownText+=child.textContent||'';}
          ownText=normalize(ownText);
          const candidate=ownText&&candidates.find(value=>!value.used&&value.label===String(ordinal)&&sourceNormalized.slice(value.bodyAt).startsWith(ownText)&&(!sourceNormalized[value.bodyAt+ownText.length]||/\s/.test(sourceNormalized[value.bodyAt+ownText.length])));
          if(candidate){candidate.used=true;for(let offset=0;offset<candidate.count;offset++)sourceMarkerCredits.add(candidate.at+offset);}
        }
        ordinal=Math.min(2147483647,Math.max(-2147483648,ordinal+step));
      }
    }
  }
  doc.querySelectorAll('ol,ul').forEach(node=>node.insertBefore(doc.createTextNode(' '),node.firstChild));
  doc.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,td,th,caption,figcaption,div,section,br').forEach(node=>node.appendChild(doc.createTextNode(' ')));
  const source=tokens(sourceText),output=tokens(doc.body.textContent),available=new Map();for(const token of output)available.set(token,(available.get(token)||0)+1);
  let missingTokens=0,missingPassageCount=0;const missingPassages=[];let sourceUnit=0;
  // The unmatched words themselves, so a person can search for them: token offsets meant nothing to a
  // teacher (SIE 515 syllabus: 4 "missing" tokens, all a raised "2nd"/"3rd", 2026-10-26). Up to 25 distinct.
  const missingWordCounts=new Map();
  // Bounded chunks give callers source locations even when extraction flattened paragraphs.
  for(let at=0;at<source.length;at+=40){sourceUnit++;let missing=0;for(let offset=0;offset<Math.min(40,source.length-at);offset++){if(sourceMarkerCredits.has(at+offset))continue;const token=source[at+offset],count=available.get(token)||0;if(count)available.set(token,count-1);else{missing++;if(missingWordCounts.size<25||missingWordCounts.has(token))missingWordCounts.set(token,(missingWordCounts.get(token)||0)+1);}}
    missingTokens+=missing;if(missing)missingPassageCount++;if(missing&&missingPassages.length<50)missingPassages.push({sourceUnit,startToken:at,expectedTokens:Math.min(40,source.length-at),missingTokens:missing});
  }
  const pageList=Array.isArray(pages)?pages:null;
  const pageIds=items=>Array.isArray(items)?items.slice(0,100).map(item=>typeof item==='number'?item:item?.pageNum??item?.page??null).filter(value=>Number.isSafeInteger(value)&&value>0):[];
  const extraction={method:method||'unknown',pagesExamined:pageList?pageList.length:null,emptyPageCandidates:pageList?pageList.filter(page=>!String(page?.text||'').trim()).length:null,pageErrorCount:Array.isArray(pageErrors)?pageErrors.length:null,lowConfidencePageCount:Array.isArray(lowConfidencePages)?lowConfidencePages.length:null,errorPages:pageIds(pageErrors),lowConfidencePages:pageIds(lowConfidencePages)};
  const reviewRequired=!source.length||missingTokens>0||(extraction.pageErrorCount||0)>0||(extraction.lowConfidencePageCount||0)>0;
  return {status:!source.length?'unavailable':reviewRequired?'review_required':'matched',reviewRequired,method:'normalized-token-occurrence-check',sourceTokens:source.length,outputTokens:output.length+sourceMarkerCredits.size,matchedTokens:source.length-missingTokens,missingTokens,tokenRecall:source.length?Math.round((source.length-missingTokens)/source.length*10000)/10000:null,missingPassages,missingPassagesTruncated:Math.max(0,missingPassageCount-50),missingWords:[...missingWordCounts].map(([word,count])=>({word,count})),extraction,scope:{pageRange:pageRange||null,wholeDocument:!pageRange},note:'Compares extracted source token occurrences with HTML. Missing tokens can reflect omissions or rewording and require review. A match does not establish reading order, semantic fidelity, correct OCR or visual coverage. Empty page candidates may be intentionally blank.'};
}
module.exports={assessSourceCoverage,LABELS,normalizeLanguage,voiceCatalog,selectVoice,planDocument,routePlan,kokoroVoiceIds};
