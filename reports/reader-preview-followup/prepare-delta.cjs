const fs=require('node:fs'),path=require('node:path');
function replaceOnce(source,from,to){const n=source.split(from).length-1;if(n!==1)throw Error('Missing or ambiguous anchor ('+n+'): '+from.slice(0,110));return source.replace(from,to);}
function patchReader(input){let s=input.replace(/\r\n/g,'\n');
 s=replaceOnce(s,'      studentPreviewCloseRef.current?.focus();\n      return function () {',`      studentPreviewCloseRef.current?.focus();
      // Let host engagement timers exclude this local preview without copying
      // lesson data or granting host callbacks to the preview reader.
      window.dispatchEvent(new CustomEvent('alloflow:reading-preview', { detail: { owner: previewInstanceId, active: true } }));
      return function () {
        window.dispatchEvent(new CustomEvent('alloflow:reading-preview', { detail: { owner: previewInstanceId, active: false } }));`);
 s=replaceOnce(s,'data-student-preview onKeyDown=',`data-student-preview data-help-ignore
        onClick={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}
        onPointerDown={event => event.stopPropagation()} onMouseMove={event => event.stopPropagation()}
        onWheel={event => event.stopPropagation()} onTouchStart={event => event.stopPropagation()} onTouchMove={event => event.stopPropagation()}
        onPaste={event => event.stopPropagation()} onKeyDown=`);
 return s;
}
function patchHost(input){let s=input.replace(/\r\n/g,'\n');
 s=replaceOnce(s,'    const onHelpKeyDown = (e) => {',`    const onHelpKeyDown = (e) => {
      // Capture listeners run before the preview's own keyboard boundary.
      if (e.target?.closest?.('[data-student-preview]')) return;`);
 s=replaceOnce(s,'  const lastInteractionTimeRef = useRef(Date.now());',`  const lastInteractionTimeRef = useRef(Date.now());
  const readingPreviewTimeRef = useRef({ owners: new Set(), startedAt: null, excludedMs: 0 });
  useEffect(() => {
    const onReadingPreview = event => {
      const detail = event.detail;
      if (!detail || typeof detail.owner !== 'string' || typeof detail.active !== 'boolean') return;
      const clock = readingPreviewTimeRef.current;
      if (detail.active) {
        if (!clock.owners.size) clock.startedAt = Date.now();
        clock.owners.add(detail.owner);
      } else if (clock.owners.delete(detail.owner) && !clock.owners.size) {
        clock.excludedMs += Math.max(0, Date.now() - clock.startedAt);
        clock.startedAt = null;
        // Resuming the host requires a host interaction before crediting work.
        lastInteractionTimeRef.current = 0;
      }
    };
    window.addEventListener('alloflow:reading-preview', onReadingPreview);
    return () => window.removeEventListener('alloflow:reading-preview', onReadingPreview);
  }, []);`);
 s=replaceOnce(s,'    const trackInteraction = () => { lastInteractionTimeRef.current = Date.now(); };',`    const trackInteraction = () => {
      if (document.querySelector('[data-student-preview]')) return;
      lastInteractionTimeRef.current = Date.now();
    };`);
 s=replaceOnce(s,"        if (typeof document !== 'undefined' && document.hidden) return false;", "        if (typeof document !== 'undefined' && (document.hidden || document.querySelector('[data-student-preview]'))) return false;");
 s=replaceOnce(s,'    focusStreakTimerRef.current = setInterval(() => {',`    focusStreakTimerRef.current = setInterval(() => {
      if (document.querySelector('[data-student-preview]')) return;`);
 s=replaceOnce(s,'    const handleVisibilityChange = () => {\n      const now = Date.now();',`    const handleVisibilityChange = () => {
      if (document.querySelector('[data-student-preview]')) return;
      const now = Date.now();
      const excludedMs = readingPreviewTimeRef.current.excludedMs;
      readingPreviewTimeRef.current.excludedMs = 0;`);
 s=replaceOnce(s,'focusedMs: prev.focusedMs + (now - prev.lastVisibleTime),', 'focusedMs: prev.focusedMs + Math.max(0, now - prev.lastVisibleTime - excludedMs),');
 s=replaceOnce(s,'          const awayMs = now - prev.lastVisibleTime;', '          const awayMs = Math.max(0, now - prev.lastVisibleTime - excludedMs);');
 return s;
}
module.exports={patchHost,patchReader};
if(require.main===module){
 const {createTwoFilesPatch}=require('diff'),babel=require('@babel/core');
 const dir=__dirname, beforeDir=path.join(dir,'integrated-snapshot');
 for(const [file,patch] of [['AlloFlowANTI.txt',patchHost],['view_simplified_source.jsx',patchReader]]){
   const before=fs.readFileSync(path.join(beforeDir,file),'utf8').replace(/\r\n/g,'\n'),after=patch(before);
   fs.writeFileSync(path.join(dir,file==='AlloFlowANTI.txt'?'host-integration.patch':'reader-followup.patch'),createTwoFilesPatch(file,file,before,after,'','',{context:4}));
   fs.writeFileSync(path.join(dir,file==='AlloFlowANTI.txt'?'host-candidate.txt':'reader-candidate.jsx'),after);
 }
 const source=['reader_place_store.js','reader_support_drafts.js'].map(n=>fs.readFileSync(path.join(beforeDir,n),'utf8')).concat(fs.readFileSync(path.join(dir,'reader-candidate.jsx'),'utf8')).join('\n');
 const result=babel.transformSync(source,{plugins:[['@babel/plugin-transform-react-jsx',{useBuiltIns:false}]],babelrc:false,configFile:false,parserOpts:{sourceType:'script',plugins:['jsx']}});
 fs.writeFileSync(path.join(dir,'integrated-reader-candidate.js'),`(function(){var React=window.React;var Fragment=React.Fragment;${result.code}\nwindow.AlloModules=window.AlloModules||{};window.AlloModules.SimplifiedView=SimplifiedView;})();`);
 console.log('Prepared host and reader follow-up patches and an isolated merged-reader candidate.');
}
