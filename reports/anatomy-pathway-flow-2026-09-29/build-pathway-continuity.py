from pathlib import Path
import difflib

root = Path(__file__).resolve().parents[2]
folder = Path(__file__).resolve().parent
target = root / 'stem_lab/stem_tool_anatomy.js'
before = target.read_text(encoding='utf-8')
after = before

def replace(old, new):
    global after
    if after.count(old) != 1:
        raise RuntimeError(f'Expected one match, found {after.count(old)}: {old[:100]}')
    after = after.replace(old, new, 1)

state_start = after.index('        // ── Pathway state ──')
state_end = after.index('        // ── Mnemonics viewed state ──', state_start)
after = after[:state_start] + (folder / 'pathway-state.js').read_text(encoding='utf-8') + after[state_end:]
panel_start = after.index("              ) : activeTab === 'pathways' ? (")
panel_end = after.index("              ) : activeTab === 'connections' ? (", panel_start)
after = after[:panel_start] + (folder / 'pathway-panel.js').read_text(encoding='utf-8') + after[panel_end:]

replace("""            announceStructure(tabPathwayStep.structure);
            return;
          }
          if (tab === 'flashcards')""", """            announceStructure(tabPathwayStep.structure);
            if (pathwayRecapActive) { var tabPathwayQuestion = focusedPathwayQuestion(currentPathwayRecap,activePathway); focusPathwayCheck(activePathway,tabPathwayQuestion && tabPathwayQuestion.id,true,currentPathwayRecap.token); }
            else focusPathwayStep(activePathway,pathwayStepIdx);
            return;
          }
          if (tab === 'pathways') { changeTab({ _activeTab: tab, quizMode: false }); focusPathwayMenu(); return; }
          if (tab === 'flashcards')""")
replace("""onClick:function(){var panel=document.querySelector('[data-anatomy-pathway-step]') || document.querySelector('#anatomy-pathway-jump');if(panel){panel.focus({preventScroll:true});panel.scrollIntoView({block:'start',behavior:'auto'});}}""", "onClick:focusCurrentPathway")

patch = ''.join(difflib.unified_diff(before.splitlines(keepends=True), after.splitlines(keepends=True), fromfile='a/stem_lab/stem_tool_anatomy.js', tofile='b/stem_lab/stem_tool_anatomy.js'))
(folder / 'pathway-continuity.patch').write_text(patch,encoding='utf-8',newline='\n')
# An inspectable proposed source is convenient for syntax review; canonical and mirror stay untouched.
(folder / 'pathway-proposed.js').write_text(after,encoding='utf-8',newline='\n')
print(f'Wrote {len(patch.splitlines())} patch lines in {folder / "pathway-continuity.patch"}')
