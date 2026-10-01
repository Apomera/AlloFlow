from pathlib import Path
import difflib
import re
import json

root = Path(__file__).resolve().parents[2]
folder = Path(__file__).resolve().parent
before = (root / 'stem_lab/stem_tool_anatomy.js').read_text(encoding='utf-8')
after = before

def replace(old, new):
    global after
    if after.count(old) != 1:
        raise RuntimeError(f'Expected one match, found {after.count(old)}: {old[:100]}')
    after = after.replace(old, new, 1)

helper = (folder / 'homeostasis-state.js').read_text(encoding='utf-8')
replace('        function renderFeedbackExperiment() {', helper + '        function renderFeedbackExperiment() {')
replace("          var saved = d._feedbackExperiment && typeof d._feedbackExperiment === 'object' && !Array.isArray(d._feedbackExperiment) ? d._feedbackExperiment : {};", '          var saved = feedbackSnapshot;')
replace("          function change(patch) { upd('_feedbackExperiment', Object.assign({ direction: direction, prediction: prediction, revealed: revealed, explanation: typeof saved.explanation === 'string' ? saved.explanation.slice(0,2000) : '' }, patch)); }\n", '')
replace("'data-anatomy-feedback-experiment': 'true'", "'data-anatomy-feedback-experiment': 'true', 'data-anatomy-feedback-direction':direction, 'data-anatomy-feedback-token':saved.token||''")
replace("h('h5', { id: 'anatomy-feedback-title' }", "h('h5', { id: 'anatomy-feedback-title', tabIndex:-1 }")
replace("change({ direction: event.target.value === 'cool' ? 'cool' : 'warm', prediction: '', revealed: false, explanation: '' });", "updateFeedbackExperiment('direction',event.target.value);")
replace("h('fieldset', null, h('legend', null, t('stem.anatomy.feedback_prediction'", "h('fieldset', {tabIndex:-1,'data-anatomy-feedback-prediction':true}, h('legend', null, t('stem.anatomy.feedback_prediction'")
replace("change({ prediction: option.id, revealed: false });", "updateFeedbackExperiment('prediction',option.id);")
replace("onClick: function() { if (!prediction) return; change({ revealed: !revealed }); }", "onClick: function() { updateFeedbackExperiment('run'); }")
replace("'data-anatomy-feedback-results': direction", "'data-anatomy-feedback-results': direction, tabIndex:-1")
replace("change({ explanation: event.target.value.slice(0,2000) });", "updateFeedbackExperiment('explanation',event.target.value);")

start = after.index("              })() : activeTab === 'homeoHunt' ? (function() {")
end_marker = '          // ── Sourced fact prompts ──'
end = after.index(end_marker,start)
tail = after[start:end]
closing = '            ),\n'
if not tail.endswith(closing):
    raise RuntimeError('Unexpected Homeostasis panel closing')
after = after[:start] + (folder / 'homeostasis-panel.js').read_text(encoding='utf-8') + closing + after[end:]

patch = ''.join(difflib.unified_diff(before.splitlines(keepends=True),after.splitlines(keepends=True),fromfile='a/stem_lab/stem_tool_anatomy.js',tofile='b/stem_lab/stem_tool_anatomy.js'))
(folder / 'homeostasis-continuity.patch').write_text(patch,encoding='utf-8',newline='\n')
strings = dict(re.findall(r"t\('stem\.anatomy\.(homeo_flow_[a-z0-9_]+)','([^']*)'\)",helper + (folder / 'homeostasis-panel.js').read_text(encoding='utf-8')))
(folder / 'homeostasis-strings.json').write_text(json.dumps(strings,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(f'Wrote {len(patch.splitlines())} patch lines and {len(strings)} new English strings')
