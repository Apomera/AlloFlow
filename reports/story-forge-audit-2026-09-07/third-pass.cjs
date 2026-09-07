const fs=require('fs');const p='story_forge_source.jsx';let s=fs.readFileSync(p,'utf8');
function replace(a,b){if(!s.includes(a))throw new Error('Missing: '+a.slice(0,80));s=s.replace(a,b);}
replace("else if (showRestorePrompt) dismissRestorePrompt();\n        else safeClose();", "else if (showRestorePrompt) dismissRestorePrompt();\n        else if (modalRootRef.current?.querySelector('[data-sf-project-menu][open]')) {\n          const menu = modalRootRef.current.querySelector('[data-sf-project-menu][open]');\n          menu.open = false;\n          menu.querySelector('summary')?.focus();\n        } else safeClose();");
replace("const FOCUSABLE = 'a[href],area[href],button", "const FOCUSABLE = 'summary,a[href],area[href],button");
replace('  // ── Focus management: move focus into the dialog on open, trap Tab inside it, and', `  // Dismiss the project disclosure when moving to another task in the workspace.
  useEffect(() => {
    if (!isOpen) return undefined;
    const dismiss = (event) => {
      const menu = modalRootRef.current?.querySelector('[data-sf-project-menu][open]');
      if (menu && !menu.contains(event.target)) menu.open = false;
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('focusin', dismiss);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('focusin', dismiss);
    };
  }, [isOpen]);

  // ── Focus management: move focus into the dialog on open, trap Tab inside it, and`);
for(const [name,loading] of [['checkSenses','sensesLoading'],['findMentorStory','mentorLoading'],['analyzeShowTell','showTellLoading'],['analyzeCharacterArcs','arcLoading'],['analyzeDialogue','dialogueLoading'],['synthesizeRevisionPlan','revisionPlanLoading']])replace(`onClick={${name}} disabled={${loading} || isProcessing}`,`onClick={${name}} disabled={!onCallGemini || ${loading} || isProcessing}`);
const start=s.indexOf('                    {getRubricCriteria().map((c) => (');const end=s.indexOf('\n                  </div>',start);
if(start<0||end<0)throw Error('self assessment block missing');
s=s.slice(0,start)+`                    {getRubricCriteria().map((c, index) => (
                      <div key={c} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white border border-violet-100 rounded-xl px-3 py-2">
                        <label htmlFor={\`sf-self-\${index}\`} className="text-xs font-bold text-violet-800 flex-1 min-w-0 break-words">{c}</label>
                        <select
                          id={\`sf-self-\${index}\`}
                          data-sf-self-rating
                          value={selfAssessment[c] || 3}
                          onChange={(e) => setSelfAssessment(prev => ({ ...prev, [c]: parseInt(e.target.value, 10) }))}
                          className="min-h-11 w-full sm:w-52 rounded-lg border border-violet-300 bg-white px-2 text-sm text-violet-900"
                        >
                          <option value="1">{ux('rating_1', '1 — I need help getting started')}</option>
                          <option value="2">{ux('rating_2', '2 — I am beginning')}</option>
                          <option value="3">{ux('rating_3', '3 — I am developing this')}</option>
                          <option value="4">{ux('rating_4', '4 — I can do this well')}</option>
                          <option value="5">{ux('rating_5', '5 — I can explain my choices')}</option>
                        </select>
                      </div>
                    ))}`+s.slice(end);
replace("// Fill any unset criteria with 3 (the slider's visual default) so comparison works.","// Keep the displayed starting rating for unchanged criteria so comparison works.");
replace("{ta('a11y.storyforge_ui_rate_your_own_draft_on_each')}","{ux('rating_instructions', 'Reread your draft and choose how you feel about each criterion. Ratings start at 3; adjust them to match your work.')}");
replace('text-[11px] text-violet-500 hover:text-violet-700 font-bold underline shrink-0','text-xs text-violet-700 hover:text-violet-800 font-bold underline shrink-0 min-h-11');
fs.writeFileSync(p,s);
const labels={rating_1:'1 — I need help getting started',rating_2:'2 — I am beginning',rating_3:'3 — I am developing this',rating_4:'4 — I can do this well',rating_5:'5 — I can explain my choices',rating_instructions:'Reread your draft and choose how you feel about each criterion. Ratings start at 3; adjust them to match your work.'};
for(const file of ['ui_strings.js','desktop/web-app/public/ui_strings.js']){const data=JSON.parse(fs.readFileSync(file,'utf8'));Object.assign(data.storyforge_updates,labels);fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');}
