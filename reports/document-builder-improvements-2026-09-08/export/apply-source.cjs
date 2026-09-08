'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),parser=require('@babel/parser');
function edit(file, transform){const before=fs.readFileSync(file,'utf8'),after=transform(before);if(before===after)throw Error('No changes: '+file);if(fs.readFileSync(file,'utf8')!==before)throw Error('Concurrent change; retry: '+file);const temporary=file+'.export-fidelity-'+crypto.randomUUID();fs.writeFileSync(temporary,after);if(fs.readFileSync(file,'utf8')!==before){fs.unlinkSync(temporary);throw Error('Concurrent change before publish: '+file);}fs.renameSync(temporary,file);}
function once(text,old,next){if(text.split(old).length!==2)throw Error('Expected one source anchor: '+old.slice(0,80));return text.replace(old,()=>next);}
edit('export_handlers_module.js',s=>once(s,'const slideExported = await handleExportSlides();','const slideExported = await handleExportSlides({ liveHtml: htmlContent, liveTitle: iframeDoc?.title || sourceTopic });'));
edit('export_source.jsx',s=>once(s,"        if (!window.PptxGenJS) {",`        if (Object.prototype.hasOwnProperty.call(options, 'liveHtml')) {
            try {
                if (typeof options.liveHtml !== 'string' || !options.liveHtml.trim()) throw new Error('The editable preview is not ready.');
                let api = window.AlloModules?.AccessibleOfficeExport;
                if (!api?.build && typeof window.__alloEnsurePdfAuditView === 'function') {
                    await window.__alloEnsurePdfAuditView();
                    api = window.AlloModules?.AccessibleOfficeExport;
                }
                if (!api?.build) throw new Error('The document slide exporter is still loading. Please try again.');
                const result = await api.build({ html: options.liveHtml, title: options.liveTitle || sourceTopic, format: 'pptx' });
                if (!result?.blob) throw new Error('The slide export did not produce a file.');
                const url = URL.createObjectURL(result.blob), anchor = document.createElement('a');
                try { anchor.href = url; anchor.download = result.fileName; document.body.appendChild(anchor); anchor.click(); }
                finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); }
                addToast(result.message, 'success');
                return true;
            } catch (error) {
                addToast('Slides export failed: ' + (error?.message || 'unknown error') + '. Your document remains open.', 'error');
                return false;
            }
        }
        if (!window.PptxGenJS) {`));
edit('view_pdf_audit_source.jsx',s=>once(s,"  if (format === 'docx') {",`  if (format === 'pptx') {
    const P = await _ensurePptxLib();
    if (!P) throw new Error('The PowerPoint library could not load. Check the connection and try again.');
    const spec = _htmlToDocxSpec(html);
    if (title) spec.title = String(title);
    const deck = _docxSpecToSlides(spec);
    if (!deck.slides.length) throw new Error('The document has no content that can be exported to slides.');
    const blob = await _buildPptxBlobFromSlides(deck, P);
    return { blob, fileName: safeTitle + '.pptx', counts: deck.counts,
      message: 'PowerPoint prepared from the current document. Review slide layout and image descriptions before sharing.' };
  }
  if (format === 'docx') {`));
edit('view_export_preview_source.jsx',source=>{
 const ast=parser.parse(source,{sourceType:'script',plugins:['jsx']}),buttons=[];
 const visit=node=>{if(!node||typeof node!=='object')return;if(node.type==='JSXElement'&&node.openingElement.name.name==='button'){const attr=node.openingElement.attributes.find(x=>x.name?.name==='onClick');if(attr?.value?.expression)buttons.push({node,callback:attr.value.expression,text:source.slice(node.start,node.end)});}for(const [key,value]of Object.entries(node)){if(['loc','start','end'].includes(key))continue;if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);}};visit(ast);
 const replacements=[];
 function callback(marker,update){const found=buttons.filter(x=>x.text.includes(marker));if(found.length!==1)throw Error('Callback anchor: '+marker);const {callback}=found[0],before=source.slice(callback.start,callback.end);replacements.push({start:callback.start,end:callback.end,text:update(before)});}
 callback('📝 Markdown (.md)',()=>`async () => {
                          const doc = exportPreviewRef.current?.contentDocument;
                          if (!doc) return;
                          const preflight = runBuilderPreflight('markdown', false);
                          if (preflight.errors) { addToast('Markdown export stopped: fix the blocking preflight issues first.', 'error'); return; }
                          if (!beginAlternativeExport('markdown')) return;
                          try {
                            const root = _builderCleanMarkdownRoot(doc);
                            const math = Array.from(root.querySelectorAll('math'));
                            let spokenByBlock = null;
                            if (math.length) {
                              try {
                                if (!window.AlloMathSpeech && window.__alloLoadPlugin) await window.__alloLoadPlugin('sre_loader.js');
                                if (window.AlloMathSpeech?.toSpeech) spokenByBlock = await Promise.all(math.map(node => window.AlloMathSpeech.toSpeech(node.outerHTML, { timeoutMs: 8000 })));
                              } catch (_) {}
                            }
                            const result = _builderMarkdownFromRoot(root, { baseURI: doc.baseURI, spokenByBlock });
                            downloadBuilderBlob(new Blob([result.markdown], { type: 'text/markdown;charset=utf-8' }), { extension: 'md' });
                            addToast(result.warnings.length ? result.warnings.join(' ') : 'Markdown prepared from the current document.', result.warnings.length ? 'warning' : 'success');
                          } catch (error) { addToast('Markdown export failed: ' + (error?.message || 'unknown error'), 'error'); }
                          finally { finishAlternativeExport(); }
                        }`);
 callback('Building NotebookLM source',text=>{
   const anchor=text.indexOf('let _mdClone =');if(anchor<0)throw Error('NotebookLM clone missing');
   const start=text.lastIndexOf('// #14:',anchor),end=text.indexOf('out.push(body);',anchor)+'out.push(body);'.length;
   if(start<0||end<start)throw Error('NotebookLM conversion bounds');
   return text.slice(0,start)+`const root = _builderCleanMarkdownRoot(doc);
                              const converted = _builderMarkdownFromRoot(root, { baseURI: doc.baseURI });
                              out.push(converted.markdown);
                              converted.warnings.forEach(message => addToast(message, 'warning'));`+text.slice(end);
 });
 callback('const _imageManifest',text=>{
   const start=text.indexOf("const controller = typeof AbortController"),endAnchor="if (bytes.byteLength > 8 * 1024 * 1024) throw new Error('Remote image exceeds 8 MB');",end=text.indexOf(endAnchor,start)+endAnchor.length;
   if(start<0||end<start)throw Error('ePub transfer bounds');
   return text.slice(0,start)+"const { bytes, mediaType, extension: ext } = await _builderFetchExportImage(absolute);"+text.slice(end);
 });
 callback('const _toBRF',text=>{
   text=once(text,'const _bClone = doc.body.cloneNode(true);','const _bClone = _builderFinalizeDocumentForExport(doc.body.cloneNode(true));');
   text=once(text,"} catch (_) { text = doc.body.innerText || doc.body.textContent || ''; }","} catch (_) { throw new Error('Could not prepare the accepted revision view for Braille.'); }");
   return once(text,String.raw`norm.replace(/\n?/g, '\n')`,String.raw`norm.replace(/\r\n?/g, '\n')`);
 });
 for(const replacement of replacements.sort((a,b)=>b.start-a.start))source=source.slice(0,replacement.start)+replacement.text+source.slice(replacement.end);
 const helpers=fs.readFileSync('reports/document-builder-improvements-2026-09-08/export/helpers.txt','utf8').replace(/^\uFEFF/,'');
 source=once(source,'function ExportPreviewView',helpers+'function ExportPreviewView');
 return source;
});
console.log('Export fidelity source changes applied without building generated modules');
