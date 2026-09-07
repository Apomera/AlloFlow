const fs=require('fs');let s=fs.readFileSync('story_forge_source.jsx','utf8');
const rep=(a,b)=>{if(!s.includes(a))throw Error(a.slice(0,80));s=s.replace(a,b)};
rep('                </div>\n              </div>\n\n              {/* Word Frequency Analysis */}', '                </div>\n\n              {/* Word Frequency Analysis */}');
rep('              {!gradingResult && !isProcessing && (', '              </details>\n\n              {!gradingResult && !isProcessing && (');
rep('AI-powered Glow &amp; Grow feedback on your draft</p>\n                </details>', 'AI-powered Glow &amp; Grow feedback on your draft</p>\n                </div>');
rep('              {!gradingResult && !isProcessing && (', '              {!gradingResult && !isProcessing && onCallGemini && (');
rep("typeof dialogue[key] === 'string' ? dialogue[key] : ''", "typeof dialogue?.[key] === 'string' ? dialogue[key] : ''");
rep("const paragraphStats = useMemo(() => paragraphs.map(p => {\n    const words = p.text.trim().split(/\\s+/).filter(Boolean);\n    const sentences = p.text.split(/[.!?]+/).filter(s => s.trim().length > 0);\n    const pVocab = vocabTerms.filter(v => termUsed(p.text, v.term));", "const paragraphStats = useMemo(() => authoredSections.map(text => {\n    const words = text.trim().split(/\\s+/).filter(Boolean);\n    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);\n    const pVocab = vocabTerms.filter(v => termUsed(text, v.term));");
rep('}), [paragraphs, vocabTerms]);\n\n  // ── Word frequency', '}), [authoredSections, vocabTerms]);\n\n  // ── Word frequency');
// All unavailable AI operations provide an explanation, including secondary review tools.
rep('  // Localized DISPLAY name', `  const notifyAiUnavailable = () => {
    const message = ux('ai_unavailable', 'AI tools are unavailable. You can keep writing and use the self-check.');
    if (addToast) addToast(message, 'info');
    sfAnnounce(message);
  };
  // Localized DISPLAY name`);
s=s.replaceAll('if (!onCallGemini) return;', 'if (!onCallGemini) { notifyAiUnavailable(); return; }');
rep('              {/* ═══ Pre-grade Self-Assessment ═══ */}', `              {!onCallGemini && <p className="text-sm text-slate-600">{ux('ai_unavailable', 'AI tools are unavailable. You can keep writing and use the self-check.')}</p>}
              {/* ═══ Pre-grade Self-Assessment ═══ */}`);
rep("onClick={() => setSelfAssessmentSubmitted(false)}", "onClick={() => setSelfAssessmentSubmitted(false)}");
// Keep the existing step navigation accessible as the desktop equivalent of the mobile selector.
rep('.sf-mobile-workflow{display:none}', `.sf-mobile-workflow{display:none}
        .sf-modal-root.theme-dark .sf-mobile-workflow,.sf-modal-root.theme-dark .sf-mobile-workflow :is(select,button){background:#0f172a;color:#f1f5f9;border-color:#64748b}
        .sf-modal-root.theme-contrast .sf-mobile-workflow,.sf-modal-root.theme-contrast .sf-mobile-workflow :is(select,button){background:#000;color:#ff0;border-color:#ff0}`);
rep("'Comic panels need captions' : 'Draft is empty'", "'Start your first panel' : 'Start your first scene'");
rep("'Add a short narration caption to each planned panel.'", "'Add narration or dialogue to your planned panels.'");
rep(' have no narration caption.', ' have no narration or dialogue.');
rep('Add a caption or scaffold to every panel before export.', 'Add narration or dialogue to every panel before export.');
rep('{projectReadiness.summary}</div>\n            </div>', "{phase === 'configure' && !hasStoryCue ? ux('start_hint', 'Choose Story or Comic, then add a title or starting idea.') : projectReadiness.summary}</div>\n            </div>");
rep('{primaryReadinessIssue && (', "{primaryReadinessIssue && !(phase === 'configure' && !hasStoryCue) && (");
rep('Project files &amp; collaboration</span>', "{ux('project_files', 'Editable backups and collaboration')}</span>");
rep('              <p className="text-slate-500 text-xs text-center">', `              <p className="text-slate-600 text-sm text-center">{ux('output_help', 'Download a finished story to read or print. Use an editable backup below to continue working on another device.')}</p>
              <p className="text-slate-500 text-xs text-center">`);
fs.writeFileSync('story_forge_source.jsx',s);
let b=fs.readFileSync('_build_story_forge_module.js','utf8');b=b.replace('_meta = { computeReadingLevel:', '_meta = { normalizeStoryForgePlan, mergeStoryForgePlan, getStoryForgeSectionText, computeReadingLevel:');fs.writeFileSync('_build_story_forge_module.js',b);
const strings={};for(const m of s.matchAll(/ux\('([^']+)', '([^']+)'\)/g))strings[m[1]]=m[2];
for(const p of ['ui_strings.js','desktop/web-app/public/ui_strings.js']){
 let last;for(let i=0;i<15;i++)try{const data=JSON.parse(fs.readFileSync(p,'utf8'));data.storyforge_updates={...data.storyforge_updates,...strings};fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n');last=null;break;}catch(e){last=e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,250);}if(last)throw last;
}
