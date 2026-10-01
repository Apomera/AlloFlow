from pathlib import Path
import difflib
import json
import re

root = Path(__file__).resolve().parents[2]
folder = Path(__file__).resolve().parent
before = (root / 'stem_lab/stem_tool_anatomy.js').read_text(encoding='utf-8')
after = before

def replace(old, new):
    global after
    if after.count(old) != 1:
        raise RuntimeError(f'Expected one match, found {after.count(old)}: {old[:100]}')
    after = after.replace(old,new,1)

replace('        function sameSpotterContext(state) {', (folder / 'spotter-navigation-helpers.js').read_text(encoding='utf-8') + '        function sameSpotterContext(state) {')
replace('          var expected=spotterQuestionKey(d),accepted=false;\n          setLabToolData(function(previous){\n            var current=previous.anatomy||{};', '          var expected=spotterQuestionKey(d),accepted=false,nextQuestionKey=null;\n          setLabToolData(function(previous){\n            var current=previous.anatomy||{};')
replace('            accepted=true;return Object.assign({},previous,{anatomy:Object.assign({},current,patch)});\n          });\n          setTimeout(function(){if(!accepted)return;if(typeof announceToSR', '            nextQuestionKey=spotterQuestionKey(Object.assign({},current,patch));\n            accepted=true;return Object.assign({},previous,{anatomy:Object.assign({},current,patch)});\n          });\n          setTimeout(function(){if(!accepted)return;if(typeof announceToSR')
replace("var panel=document.querySelector('[data-anatomy-spotter-panel]');if(panel)panel.focus();", "focusSpotterStage('question',nextQuestionKey,spotterContextKey(d),'');")
replace("            checkAnatomyChallenges();\n          },0);\n        }\n        function setSpotterTiming", "            checkAnatomyChallenges();\n            focusSpotterStage('feedback',expected,spotterContextKey(d),opt.id);\n          },0);\n        }\n        function setSpotterTiming")
replace('            var expected=spotterQuestionKey(d),ended=false;', '            var expected=spotterQuestionKey(d),ended=false,endQuestionKey=null;')
replace("ended=true;return Object.assign({},previous,{anatomy:Object.assign({},current,{_spotterActive:false,_spotterTarget:null,_spotterFeedback:null,_spotterOpts: [], _spotterStartTime: 0, _spotterElapsed: 0,_spotterRoundTimed:false})});", "var next=Object.assign({},current,{_spotterActive:false,_spotterTarget:null,_spotterFeedback:null,_spotterOpts: [], _spotterStartTime: 0, _spotterElapsed: 0,_spotterRoundTimed:false});endQuestionKey=spotterQuestionKey(next);ended=true;return Object.assign({},previous,{anatomy:next});")
replace("setTimeout(function(){if(!ended)return;var start=document.querySelector('[data-anatomy-spotter-start]');if(start)start.focus();},0);", "setTimeout(function(){if(ended)focusSpotterStage('start',endQuestionKey,spotterContextKey(d),'');},0);")

replace("              h('div', { className: 'anatomy-canvas-frame', 'data-anatomy-canvas-frame': 'true'", "              activeTab === 'spotter' && spotterActive && spotterRoundReady && h('button',{type:'button',className:'anatomy-route-return anatomy-spotter-return','data-anatomy-spotter-return':true,onClick:focusCurrentSpotter},spotterFeedback !== null ? t('stem.anatomy.spotter_flow_return_feedback','Return to feedback') : t('stem.anatomy.spotter_flow_return_question','Return to question')),\n              h('div', { className: 'anatomy-canvas-frame', 'data-anatomy-canvas-frame': 'true'")
replace("!bodyView3d && h('canvas', { role: 'img', tabIndex: 0, 'aria-label': canvasLabel,", "!bodyView3d && h('canvas', { role: 'img', tabIndex: 0, 'aria-label': spotterActive && spotterFeedback === null && activeTab === 'spotter' ? t('stem.anatomy.spotter_flow_diagram_label','Spotter diagram. Identify the structure at the crosshair. Use the diagram controls to inspect it, then return to the question to answer.') : canvasLabel,")

replace("'data-anatomy-spotter-panel': 'true', tabIndex: -1,", "'data-anatomy-spotter-panel': 'true', 'data-anatomy-spotter-question':spotterQuestionKey(d), 'data-anatomy-spotter-context':spotterContextKey(d), 'data-anatomy-spotter-answer':spotterFeedback || '', 'data-anatomy-spotter-active':spotterActive ? 'true' : 'false', tabIndex: -1,")
replace("h('h4', { className: 'font-bold text-amber-800 text-sm' }, t('stem.anatomy.anatomy_spotter_test'", "h('h4', { id:'anatomy-spotter-title', tabIndex:-1, className: 'font-bold text-amber-800 text-sm' }, t('stem.anatomy.anatomy_spotter_test'")
replace("h('p', { className: 'text-sm font-bold text-cyan-900 mb-1' }, t('stem.anatomy.what_structure_is_marked_on_the_figure'", "h('h5', { id:'anatomy-spotter-question-title', tabIndex:-1, className: 'text-sm font-bold text-cyan-900 mb-1' }, t('stem.anatomy.what_structure_is_marked_on_the_figure'")
replace("                    h('div', { className: 'grid grid-cols-2 gap-2' },\n                      (spotterRoundReady ? spotterOptions : []).map", "                    spotterRoundReady && h('div',{className:'anatomy-spotter-navigation','data-anatomy-spotter-navigation':true},\n                      h('button',{type:'button','data-anatomy-spotter-diagram':true,onClick:showSpotterDiagram},t('stem.anatomy.spotter_flow_diagram','Show diagram')),\n                      h('p',null,t('stem.anatomy.spotter_flow_navigation_help','Move between the crosshair and this question. Your current attempt stays the same.'))),\n                    spotterRoundReady && spotterFeedback === null && h('p',{id:'anatomy-spotter-answer-help'},t('stem.anatomy.spotter_flow_question_help','Choose one answer, or use keys 1–4 while the question is focused.')),\n                    h('div', { className: 'grid grid-cols-2 gap-2', role:'group', 'aria-labelledby':'anatomy-spotter-question-title', 'aria-describedby':spotterRoundReady && spotterFeedback === null ? 'anatomy-spotter-answer-help' : undefined, 'data-anatomy-spotter-choices':true },\n                      (spotterRoundReady ? spotterOptions : []).map")
replace("key: opt.id, 'data-anatomy-spotter-option':opt.id,", "key: opt.id, 'data-anatomy-spotter-option':opt.id, 'aria-pressed':wasChosen, 'data-anatomy-spotter-answer-state':showResult ? isCorrect ? 'correct' : wasChosen ? 'chosen' : 'neutral' : 'neutral',")
replace("                          h('span', null, opt.name)\n", "                          h('span', null, opt.name),\n                          wasChosen && h('span',{className:'anatomy-spotter-answer-label'},t('stem.anatomy.spotter_flow_your_answer','Your answer')),\n                          showResult && isCorrect && h('span',{className:'anatomy-spotter-answer-label'},t('stem.anatomy.spotter_flow_correct_answer','Correct answer'))\n")
replace("return h('div', { className: 'space-y-2', 'data-anatomy-spotter-feedback':true },", "return h('div', { className: 'space-y-2', 'data-anatomy-spotter-feedback':true, tabIndex:-1, role:'group', 'aria-labelledby':'anatomy-spotter-feedback-title' },")
replace("h('p', { className: 'font-bold ' + (isRight ? 'text-green-800' : 'text-red-800') },", "h('h5', { id:'anatomy-spotter-feedback-title', className: 'font-bold ' + (isRight ? 'text-green-800' : 'text-red-800') },")
replace("h('button', { 'aria-label': t('stem.anatomy.next_structure', 'Next Structure'),", "h('button', { type:'button', 'data-anatomy-spotter-next':true, 'aria-label': t('stem.anatomy.next_structure', 'Next Structure'),")

patch = ''.join(difflib.unified_diff(before.splitlines(keepends=True),after.splitlines(keepends=True),fromfile='a/stem_lab/stem_tool_anatomy.js',tofile='b/stem_lab/stem_tool_anatomy.js'))
(folder / 'spotter-navigation.patch').write_text(patch,encoding='utf-8',newline='\n')
strings = dict(re.findall(r"t\('stem\.anatomy\.(spotter_flow_[a-z0-9_]+)','([^']*)'\)",after))
(folder / 'spotter-navigation-strings.json').write_text(json.dumps(strings,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(f'Wrote {len(patch.splitlines())} patch lines and {len(strings)} English strings')
