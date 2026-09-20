const fs=require('fs'),path=require('path');
const target=path.join(__dirname,'implement-pass8.cjs');
let text=fs.readFileSync(target,'utf8');
text=text.split('\n').filter(line=>!line.startsWith('change("{data.supports.phasePrompts[phase.id]')).join('\n');
text=text.replace("builder=builder.replace(anchor,anchor+\",\\n  '    normalizeAppliedReasoningReferences, appliedReasoningSource, appliedReasoningReferenceState, appliedChallengeAttachNoteReference',\");", "builder=builder.replace(anchor + ',', anchor + \",\\n  '    normalizeAppliedReasoningReferences, appliedReasoningSource, appliedReasoningReferenceState, appliedChallengeAttachNoteReference,',\");");
fs.writeFileSync(target,text);
require(target);
