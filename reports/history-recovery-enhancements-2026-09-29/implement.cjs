const fs=require('fs'),path=require('path'),assert=require('assert');const out='reports/history-recovery-enhancements-2026-09-29';
function replace(s,a,b){assert.equal(s.split(a).length,2,'Missing or ambiguous target: '+a.slice(0,80));return s.replace(a,b);}
const files=new Map(),inputs=new Map();function read(p){const value=fs.readFileSync(p,'utf8');inputs.set(p,value);return value;}
let host=read('AlloFlowANTI.txt');assert(read('desktop/web-app/src/AlloFlowANTI.txt')===host&&read('desktop/web-app/src/App.jsx')===host,'Host mirrors differ');
const addition=`  const historyOpenRequestRef = useRef(0);
  const historyOpenContextRef = useRef(null);
  const [pendingHistoryResource, setPendingHistoryResource] = useState(null);
  const historyOpenContext = [inputText, history, generatedContent, activeView, activeSidebarTab, workspacePane, isTeacherMode, isParentMode, isIndependentMode, activeSessionCode, activeSessionAppId];
  if (!historyOpenContextRef.current || !historyOpenContextRef.current.values.every((value, index) => value === historyOpenContext[index])) {
      historyOpenContextRef.current = { values: historyOpenContext };
  }
  historyOpenContextRef.current.restore = handleRestoreView;
  historyOpenContextRef.current.failedLabel = () => {
      const value = t('history.open_failed');
      return typeof value === 'string' && value.trim() && value !== 'history.open_failed' ? value : 'Could not open this saved resource. Check the connection and try again.';
  };
  useEffect(() => () => { ++historyOpenRequestRef.current; historyOpenContextRef.current = null; }, []);
  const handleOpenHistoryResource = async (item, options = {}) => {
      const context = historyOpenContextRef.current;
      if (!context) return false;
      const request = ++historyOpenRequestRef.current;
      if (options?.preservePendingAssignment !== true) pendingQrAssignmentOpenGenerationRef.current += 1;
      setPendingHistoryResource(item);
      try {
          await _alloAwaitModules([['MiscHandlersModule', 'MiscHandlers']], 'saved resource');
          if (request !== historyOpenRequestRef.current || context !== historyOpenContextRef.current) return false;
          return context.restore(item, options);
      } catch (error) {
          warnLog('Saved resource could not open:', error);
          if (!String(error?.message || '').startsWith('Could not finish loading ')) addToast(context.failedLabel(), 'error');
          return false;
      } finally {
          if (request === historyOpenRequestRef.current) setPendingHistoryResource(null);
      }
  };
`;
host=replace(host,'  // END LEARNING_WEB_RESOURCE_OPEN_BRIDGE\n','  // END LEARNING_WEB_RESOURCE_OPEN_BRIDGE\n'+addition);
const line=host.split('\n').find(l=>l.includes('<HistoryPanel activeSidebarTab='));assert(line);const newLine=replace(line,'handleRestoreView={handleRestoreView}','handleRestoreView={handleOpenHistoryResource} pendingHistoryResource={pendingHistoryResource}');host=replace(host,line,newLine);
for(const p of ['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx'])files.set(p,host);
let view=read('view_history_panel_source.jsx');view=replace(view,'    editingId, generatedContent, getDefaultTitle, getFilteredHistory, getIconForType,','    editingId, generatedContent, getDefaultTitle, getFilteredHistory, getIconForType,\n    pendingHistoryResource = null,');view=replace(view,"                        const openLabel = t('common.open') || 'Open';","                        const isOpening = item === pendingHistoryResource;\n                        const openLabel = t('common.open') || 'Open';");view=replace(view,'                                                if (isCurrent) return;','                                                if (isCurrent || isOpening) return;');view=replace(view,"                                            aria-current={isCurrent ? 'page' : undefined}","                                            aria-current={isCurrent ? 'page' : undefined}\n                                            aria-busy={isOpening || undefined}");view=replace(view,'                                                <div data-history-resource-title className="text-sm font-bold leading-snug"',`                                                {isOpening && <span role="status" className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700"><RefreshCw size={12} className="animate-spin" aria-hidden="true" />{t('common.loading')}</span>}
                                                <div data-history-resource-title className="text-sm font-bold leading-snug"`);files.set('view_history_panel_source.jsx',view);
let misc=read('misc_handlers_source.jsx');const guard=`    const rejectIncompleteResource = () => {
        const key = 'history.resource_incomplete';
        const value = typeof t === 'function' ? t(key) : null;
        if (typeof addToast === 'function') addToast(typeof value === 'string' && value.trim() && value !== key ? value : 'This saved resource is incomplete and could not be opened. Your current work is still available.', 'error');
        return false;
    };
    let restoredTranscript = '';
    let restoredTranscriptTitle = 'Video transcript';
    try {
        if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.type !== 'string' || !item.type.trim()) return rejectIncompleteResource();
        if (item.type === 'readingBook' && (typeof item.data?.slug !== 'string' || !item.data.slug.trim())) return rejectIncompleteResource();
        if (item.type === 'readingSet' && (!Array.isArray(item.data?.books) || !item.data.books.length)) return rejectIncompleteResource();
        if (item.type === 'manipulative-resource' && (typeof item.toolId !== 'string' || !item.toolId.trim())) return rejectIncompleteResource();
        if (item.type === 'video-transcript') {
            restoredTranscript = ([item.text, item.content, item.data?.transcript].find(value => typeof value === 'string' && value.trim()) || '').trim();
            if (!restoredTranscript) return rejectIncompleteResource();
            restoredTranscriptTitle = ([item.data?.title, item.title].find(value => typeof value === 'string' && value.trim()) || 'Video transcript').trim();
        }
    } catch (_) { return rejectIncompleteResource(); }
`;
misc=replace(misc,'    // True route prewarm: request the presentation module before the state',guard+'    // True route prewarm: request the presentation module before the state');misc=replace(misc,"        const transcript = String(item.text || item.content || item.data?.transcript || '').trim();\n        if (transcript) setInputText(transcript);\n        setSourceTopic(String(item.data?.title || item.title || 'Video transcript').replace(/\\s+transcript$/i, '').slice(0, 120));", "        setInputText(restoredTranscript);\n        setSourceTopic(restoredTranscriptTitle.replace(/\\s+transcript$/i, '').slice(0, 120));");files.set('misc_handlers_source.jsx',misc);
const parser=require('@babel/parser');const labels={
 en:{resource_incomplete:'This saved resource is incomplete and could not be opened. Your current work is still available.',open_failed:'Could not open this saved resource. Check the connection and try again.'},
 fr:{resource_incomplete:'Cette ressource enregistrée est incomplète et n’a pas pu être ouverte. Votre travail actuel reste disponible.',open_failed:'Impossible d’ouvrir cette ressource enregistrée. Vérifiez la connexion et réessayez.'},
 es:{resource_incomplete:'Este recurso guardado está incompleto y no se pudo abrir. Tu trabajo actual sigue disponible.',open_failed:'No se pudo abrir este recurso guardado. Revisa la conexión e inténtalo de nuevo.'},
 ar:{resource_incomplete:'هذا المورد المحفوظ غير مكتمل وتعذّر فتحه. لا يزال عملك الحالي متاحًا.',open_failed:'تعذّر فتح هذا المورد المحفوظ. تحقّق من الاتصال وحاول مرة أخرى.'}
};
for(const [p,lang] of [['ui_strings.js','en'],['desktop/web-app/public/ui_strings.js','en'],...['french','spanish_latin_america','arabic'].flatMap((lang,i)=>[['lang/'+lang+'.js',['fr','es','ar'][i]],['desktop/web-app/public/lang/'+lang+'.js',['fr','es','ar'][i]]])]){const s=read(p),json=JSON.parse(s),ast=parser.parseExpression(s),property=ast.properties.find(p=>p.key.value==='history');assert(property?.value.type==='ObjectExpression','Missing history bank: '+p);for(const key of Object.keys(labels[lang]))assert(!(key in json.history),'Label already exists: '+p+' '+key);const index=property.value.start+1;const text='\n'+Object.entries(labels[lang]).map(([key,value])=>'    '+JSON.stringify(key)+': '+JSON.stringify(value)).join(',\n')+(property.value.properties.length?',':'')+'\n';const result=s.slice(0,index)+text+s.slice(index);JSON.parse(result);files.set(p,result);}
for(const [p] of files)assert.equal(fs.readFileSync(p,'utf8'),inputs.get(p),'Changed while composing edits: '+p);
const before=JSON.parse(fs.readFileSync(out+'/before.json','utf8')),refresh=[];
if(!fs.existsSync(out+'/before-initial.json'))fs.copyFileSync(out+'/before.json',out+'/before-initial.json');
for(const [p] of files){const entry=before.files.find(f=>f.path===p),previous=fs.readFileSync(entry.saved,'utf8'),current=inputs.get(p);if(previous!==current){const archived=path.join(out,'intervening',p);fs.mkdirSync(path.dirname(archived),{recursive:true});if(!fs.existsSync(archived))fs.writeFileSync(archived,previous);fs.writeFileSync(entry.saved,current);entry.sha256=require('crypto').createHash('sha256').update(current).digest('hex');refresh.push(p);}}
fs.writeFileSync(out+'/before.json',JSON.stringify(before,null,2));fs.writeFileSync(out+'/intervening-changes.json',JSON.stringify({at:new Date().toISOString(),paths:refresh},null,2));
for(const [p,s] of files)fs.writeFileSync(p,s);
fs.writeFileSync(out+'/localized-labels.json',JSON.stringify(labels,null,2));console.log('Updated history loading, resource validation and 4 language banks with targeted edits.');
