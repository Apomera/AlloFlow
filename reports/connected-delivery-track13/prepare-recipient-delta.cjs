// Produces a guarded integration artifact; never writes the shared host.
const fs=require('node:fs'),path=require('node:path'),{createTwoFilesPatch}=require('diff');
const root=path.resolve(__dirname,'../..');
const before=fs.readFileSync(path.join(root,'AlloFlowANTI.txt'),'utf8').replace(/\r\n/g,'\n');let after=before;
function replace(from,to,count=1){if(after.split(from).length!==count+1)throw Error('Changed host anchor: '+from.slice(0,80));after=after.split(from).join(to);}
replace('function MailboxImageDeliveryMonitor(props) {',[
 'function ReceivedReadingDeliveryStatus(props) {',
 '  const View = _alloSharedActivityModule()?.ReceivedReadingDelivery;',
 '  return View ? <View {...props} /> : null;',
 '}',
 'function MailboxImageDeliveryMonitor(props) {'
].join('\n'));
replace('  const [isStudentLinkMode, setIsStudentLinkMode] = useState(false);',[
 '  const [isStudentLinkMode, setIsStudentLinkMode] = useState(false);',
 '  // Evidence is restricted to received bundles, never broader device History.',
 '  const [receivedDeliveryResources, setReceivedDeliveryResources] = useState([]);',
 '  useEffect(() => { setReceivedDeliveryResources([]); }, [activeSessionAppId, activeSessionCode]);'
].join('\n'));
for(const [indent,name,count]of [['                              ','hydrated',1],['                              ','merged',1],['                  ','restoredResources',1],['              ','rawResources',2]]){
 const line=indent+'setHistory('+name+');';replace(line,line+'\n'+indent+'setReceivedDeliveryResources('+name+');',count);
}
replace("      if (v.kind === 'res-remove' && Array.isArray(v.ids)) {", "      if (v.kind === 'res-remove' && Array.isArray(v.ids)) {\n          setReceivedDeliveryResources(prev => prev.filter(item => !v.ids.includes(item.id)));");
replace('              if (mbChunkStoreRef.current !== store) return;\n              setHistory(prev => {', '              if (mbChunkStoreRef.current !== store) return;\n              setReceivedDeliveryResources(prev => [...prev.filter(item => item.id !== resource.id), resource]);\n              setHistory(prev => {');
replace('      <MailboxImageDeliveryMonitor\n',[
 '      <ReceivedReadingDeliveryStatus',
 '          enabled={!isTeacherMode && (!!activeSessionCode || !!mbStudent || isStudentLinkMode)}',
 '          resources={receivedDeliveryResources}',
 '          currentResourceId={generatedContent?.id}',
 '          t={t}',
 '      />',
 '      <MailboxImageDeliveryMonitor',
 '          revisionReceipts={true}',
 ''
].join('\n'));
replace('retryMailboxImagesForStudent, mailboxImageVersion: Number(mbConfig?.v || 0),','retryMailboxImagesForStudent, getPreparedMailboxResource: item => mbPreparedImagesRef.current.get(item)?.resource || null, mailboxImageVersion: Number(mbConfig?.v || 0),');
fs.writeFileSync(path.join(__dirname,'recipient-integration.patch'),createTwoFilesPatch('AlloFlowANTI.txt','AlloFlowANTI.txt',before,after,'','',{context:4}));
console.log('Prepared recipient-integration.patch; shared host unchanged.');
